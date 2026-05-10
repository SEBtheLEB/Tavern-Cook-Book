
import { useEffect, useMemo, useState } from "react";
import { extractGoogleDriveFileId, googleDriveThumbnailUrl, googleDriveWebViewLink, resolveImageSourceUrl } from "../utils/imageFit";
import type { GoogleDriveFolder, GooglePickerFile, UploadedDriveFile } from "../utils/googlePicker";
import {
  buildFrameSequence,
  buildSpriteSheetUploadFileName,
  createSpritePresetFromSettings,
  defaultSpritePresetSettings,
  frameBounds,
  loadSpriteSheetAssets,
  normalizeSpriteAnimationPreset,
  normalizeSpriteSheetAsset,
  saveSpriteSheetAssets,
  spriteSheetCategories,
  type SpriteAnimationPreset,
  type SpriteSheetAsset
} from "../utils/spriteSheets";
import { CustomSelect } from "./CustomSelect";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { Icon } from "./Icon";
import { SpriteAnimation } from "./SpriteAnimation";

interface SpriteSheetAnimatorPageProps {
  readOnly: boolean;
}

interface SpriteEditorSettings {
  animationName: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  startFrame: number;
  endFrame: number;
  fps: number;
  loop: boolean;
  pingPong: boolean;
  playOnce: boolean;
  scale: number;
}

interface SpriteDraft {
  assetName: string;
  category: string;
  animationName: string;
  folderId: string;
  folderLink: string;
  folderName: string;
  sourceUrl: string;
  uploadState: "wip" | "final";
}

const defaultDraft: SpriteDraft = {
  assetName: "",
  category: "Character",
  animationName: "Idle",
  folderId: "",
  folderLink: "",
  folderName: "",
  sourceUrl: "",
  uploadState: "wip"
};

const defaultSettings: SpriteEditorSettings = { ...defaultSpritePresetSettings };
const SPRITE_ANIMATOR_SEED_KEY = "tavernCookBookSpriteAnimatorSeed";

interface SpriteAnimatorSeed {
  imageUrl?: string;
  webViewLink?: string;
  label?: string;
  description?: string;
  defaultFolderId?: string;
  defaultFolderLink?: string;
  defaultFolderName?: string;
  uploadNameContext?: {
    subjectName?: string;
    categoryName?: string;
    slotName?: string;
    sourceType?: string;
  } | null;
}

export function SpriteSheetAnimatorPage({ readOnly }: SpriteSheetAnimatorPageProps) {
  const [assets, setAssets] = useState<SpriteSheetAsset[]>(() => loadSpriteSheetAssets());
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [draft, setDraft] = useState<SpriteDraft>(defaultDraft);
  const [settings, setSettings] = useState<SpriteEditorSettings>(defaultSettings);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState("");
  const [slicedPreset, setSlicedPreset] = useState<SpriteAnimationPreset | null>(null);
  const [loadedPresetId, setLoadedPresetId] = useState("");
  const [sliceDirty, setSliceDirty] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [manualFrame, setManualFrame] = useState<number | null>(null);
  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || assets[0] || null,
    [assets, selectedAssetId]
  );

  useEffect(() => {
    if (!selectedAssetId && assets[0]) setSelectedAssetId(assets[0].id);
  }, [assets, selectedAssetId]);

  useEffect(() => {
    if (!selectedAsset) return;
    setDraft((current) => ({
      ...current,
      assetName: current.assetName || selectedAsset.name,
      category: selectedAsset.category || current.category,
      sourceUrl: selectedAsset.thumbnailUrl || selectedAsset.driveUrl,
      folderId: selectedAsset.folderId,
      folderLink: selectedAsset.folderLink,
      folderName: selectedAsset.folderName
    }));
    setImageSize({ width: 0, height: 0 });
    setSlicedPreset(null);
    setLoadedPresetId("");
    setSliceDirty(false);
    setPreviewPlaying(false);
    setManualFrame(null);
    setCurrentFrame(0);
  }, [selectedAsset?.id]);

  const persistAssets = (nextAssets: SpriteSheetAsset[]) => {
    const normalized = nextAssets.map(normalizeSpriteSheetAsset);
    setAssets(normalized);
    saveSpriteSheetAssets(normalized);
  };

  const createOrUpdateAsset = (details: {
    imageUrl: string;
    driveFileId: string;
    driveUrl: string;
    thumbnailUrl: string;
    originalFileName: string;
    folder?: GoogleDriveFolder;
  }) => {
    const now = new Date().toISOString();
    const existing = details.driveFileId ? assets.find((asset) => asset.driveFileId === details.driveFileId) : null;
    const asset = normalizeSpriteSheetAsset({
      ...(existing || {}),
      id: existing?.id || `sprite-sheet-${details.driveFileId || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: draft.assetName.trim() || stripFileExtension(details.originalFileName) || "Untitled Sprite Sheet",
      category: draft.category || "Misc",
      folderId: details.folder?.id || draft.folderId,
      folderLink: details.folder?.url || draft.folderLink,
      folderName: details.folder?.name || draft.folderName,
      driveFileId: details.driveFileId,
      driveUrl: details.driveUrl,
      thumbnailUrl: details.thumbnailUrl || details.imageUrl,
      originalFileName: details.originalFileName,
      uploadedAt: existing?.uploadedAt || now,
      updatedAt: now,
      animationPresets: existing?.animationPresets || []
    });

    const nextAssets = existing
      ? assets.map((item) => (item.id === existing.id ? asset : item))
      : [asset, ...assets];
    persistAssets(nextAssets);
    setSelectedAssetId(asset.id);
    setDraft((current) => ({
      ...current,
      assetName: asset.name,
      category: asset.category,
      sourceUrl: asset.thumbnailUrl,
      folderId: asset.folderId,
      folderLink: asset.folderLink,
      folderName: asset.folderName
    }));
    setMessage(existing ? `Updated existing sprite sheet asset "${asset.name}".` : `Saved "${asset.name}" as a sprite sheet asset.`);
  };

  useEffect(() => {
    let seed: SpriteAnimatorSeed | null = null;
    try {
      const raw = sessionStorage.getItem(SPRITE_ANIMATOR_SEED_KEY);
      if (raw) seed = JSON.parse(raw) as SpriteAnimatorSeed;
      sessionStorage.removeItem(SPRITE_ANIMATOR_SEED_KEY);
    } catch {
      seed = null;
    }
    if (!seed) return;

    const context = seed.uploadNameContext || {};
    const sourceUrl = resolveImageSourceUrl(seed.imageUrl || seed.webViewLink || "");
    const driveFileId = extractGoogleDriveFileId(seed.webViewLink || seed.imageUrl || sourceUrl);
    const assetName = context.subjectName || seed.label || "Sprite Sheet";
    const category = context.sourceType || context.categoryName || "Misc";
    const animationName = context.slotName || seed.label || "Animation";

    setDraft((current) => ({
      ...current,
      assetName,
      category,
      animationName,
      sourceUrl,
      folderId: seed.defaultFolderId || "",
      folderLink: seed.defaultFolderLink || "",
      folderName: seed.defaultFolderName || ""
    }));
    setSettings((current) => ({ ...current, animationName }));

    if (!sourceUrl) {
      setMessage("Sprite Animator opened. Upload or import a sprite sheet to begin slicing.");
      return;
    }

    const existing = driveFileId ? assets.find((asset) => asset.driveFileId === driveFileId) : null;
    const now = new Date().toISOString();
    const asset = normalizeSpriteSheetAsset({
      ...(existing || {}),
      id: existing?.id || `sprite-sheet-${driveFileId || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: assetName,
      category,
      folderId: seed.defaultFolderId || existing?.folderId || "",
      folderLink: seed.defaultFolderLink || existing?.folderLink || "",
      folderName: seed.defaultFolderName || existing?.folderName || "",
      driveFileId,
      driveUrl: seed.webViewLink || (driveFileId ? googleDriveWebViewLink(driveFileId) : sourceUrl),
      thumbnailUrl: driveFileId ? googleDriveThumbnailUrl(driveFileId) : sourceUrl,
      originalFileName: seed.label || assetName,
      uploadedAt: existing?.uploadedAt || now,
      updatedAt: now,
      animationPresets: existing?.animationPresets || []
    });
    persistAssets(existing ? assets.map((item) => (item.id === existing.id ? asset : item)) : [asset, ...assets]);
    setSelectedAssetId(asset.id);
    setMessage(`Opened "${asset.name}" in the sprite cutter.`);
  }, []);
  const handlePickedImage = (imageUrl: string, file: GooglePickerFile) => {
    createOrUpdateAsset({
      imageUrl,
      driveFileId: file.id,
      driveUrl: file.url || googleDriveWebViewLink(file.id),
      thumbnailUrl: file.thumbnailUrl || googleDriveThumbnailUrl(file.id),
      originalFileName: file.name
    });
  };

  const handleUploadedImage = (imageUrl: string, file: UploadedDriveFile, folder: GoogleDriveFolder) => {
    createOrUpdateAsset({
      imageUrl,
      driveFileId: file.id,
      driveUrl: file.webViewLink || googleDriveWebViewLink(file.id),
      thumbnailUrl: file.thumbnailLink || googleDriveThumbnailUrl(file.id),
      originalFileName: file.name,
      folder
    });
  };

  const saveManualSourceAsAsset = () => {
    if (readOnly) return;
    const resolvedUrl = resolveImageSourceUrl(draft.sourceUrl);
    if (!resolvedUrl) {
      setMessage("Choose, upload, import, or paste a sprite sheet image first.");
      return;
    }
    const driveFileId = extractGoogleDriveFileId(draft.sourceUrl);
    createOrUpdateAsset({
      imageUrl: resolvedUrl,
      driveFileId,
      driveUrl: driveFileId ? googleDriveWebViewLink(driveFileId) : draft.sourceUrl,
      thumbnailUrl: driveFileId ? googleDriveThumbnailUrl(driveFileId) : resolvedUrl,
      originalFileName: draft.assetName || "Sprite Sheet"
    });
  };

  const selectedImageUrl = selectedAsset?.thumbnailUrl || selectedAsset?.driveUrl || draft.sourceUrl;
  const activePreset = useMemo(() => {
    if (!slicedPreset) return null;
    return normalizeSpriteAnimationPreset({
      ...slicedPreset,
      animationName: settings.animationName,
      presetName: settings.animationName,
      fps: settings.fps,
      loop: settings.loop,
      pingPong: settings.pingPong,
      playOnce: settings.playOnce,
      scale: settings.scale
    }, selectedAsset?.id || "");
  }, [slicedPreset, settings.animationName, settings.fps, settings.loop, settings.pingPong, settings.playOnce, settings.scale, selectedAsset?.id]);

  const validationErrors = () => validateSpriteSettings(settings, imageSize, Boolean(selectedAsset && selectedImageUrl));

  const sliceSheet = () => {
    const errors = validationErrors();
    if (errors.length) {
      setMessage(errors[0]);
      return;
    }
    if (!selectedAsset) return;
    const preset = createSpritePresetFromSettings(selectedAsset.id, {
      animationName: settings.animationName || "Animation",
      columns: settings.columns,
      rows: settings.rows,
      frameWidth: settings.frameWidth,
      frameHeight: settings.frameHeight,
      totalFrames: settings.totalFrames,
      startFrame: settings.startFrame,
      endFrame: settings.endFrame,
      fps: settings.fps,
      loop: settings.loop,
      pingPong: settings.pingPong,
      playOnce: settings.playOnce,
      scale: settings.scale
    });
    setSlicedPreset(preset);
    setLoadedPresetId(loadedPresetId);
    setSliceDirty(false);
    setPreviewPlaying(false);
    setManualFrame(settings.startFrame);
    setCurrentFrame(settings.startFrame);
    setMessage("Sprite sheet sliced. Preview is ready.");
  };

  const savePreset = () => {
    if (readOnly) return;
    if (!selectedAsset) {
      setMessage("Save or select a sprite sheet asset first.");
      return;
    }
    if (!slicedPreset || sliceDirty) {
      setMessage("Click Slice first so the saved preset matches the current grid.");
      return;
    }
    const now = new Date().toISOString();
    const preset = normalizeSpriteAnimationPreset({
      ...slicedPreset,
      id: loadedPresetId || slicedPreset.id,
      spriteSheetAssetId: selectedAsset.id,
      presetName: settings.animationName || "Animation",
      animationName: settings.animationName || "Animation",
      fps: settings.fps,
      loop: settings.loop,
      pingPong: settings.pingPong,
      playOnce: settings.playOnce,
      scale: settings.scale,
      updatedAt: now
    }, selectedAsset.id);
    const nextAsset = normalizeSpriteSheetAsset({
      ...selectedAsset,
      updatedAt: now,
      animationPresets: selectedAsset.animationPresets.some((item) => item.id === preset.id)
        ? selectedAsset.animationPresets.map((item) => (item.id === preset.id ? preset : item))
        : [...selectedAsset.animationPresets, preset]
    });
    persistAssets(assets.map((asset) => (asset.id === selectedAsset.id ? nextAsset : asset)));
    setLoadedPresetId(preset.id);
    setSlicedPreset(preset);
    setMessage(`Saved preset "${preset.presetName}".`);
  };

  const loadPreset = (preset: SpriteAnimationPreset) => {
    setSettings(settingsFromPreset(preset));
    setSlicedPreset(preset);
    setLoadedPresetId(preset.id);
    setSliceDirty(false);
    setPreviewPlaying(false);
    setManualFrame(preset.startFrame);
    setCurrentFrame(preset.startFrame);
    setMessage(`Loaded preset "${preset.presetName}".`);
  };

  const duplicatePreset = (preset: SpriteAnimationPreset) => {
    if (readOnly || !selectedAsset) return;
    const now = new Date().toISOString();
    const duplicate = normalizeSpriteAnimationPreset({
      ...preset,
      id: `sprite-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      presetName: `${preset.presetName} Copy`,
      animationName: `${preset.animationName} Copy`,
      createdAt: now,
      updatedAt: now
    }, selectedAsset.id);
    persistAssets(assets.map((asset) => asset.id === selectedAsset.id
      ? normalizeSpriteSheetAsset({ ...asset, animationPresets: [...asset.animationPresets, duplicate], updatedAt: now })
      : asset
    ));
    setMessage(`Duplicated "${preset.presetName}".`);
  };

  const renamePreset = (preset: SpriteAnimationPreset) => {
    if (readOnly || !selectedAsset) return;
    const nextName = window.prompt("Rename animation preset", preset.presetName)?.trim();
    if (!nextName) return;
    const now = new Date().toISOString();
    persistAssets(assets.map((asset) => asset.id === selectedAsset.id
      ? normalizeSpriteSheetAsset({
          ...asset,
          updatedAt: now,
          animationPresets: asset.animationPresets.map((item) => item.id === preset.id
            ? { ...item, presetName: nextName, animationName: nextName, updatedAt: now }
            : item
          )
        })
      : asset
    ));
    if (loadedPresetId === preset.id) setSettings((current) => ({ ...current, animationName: nextName }));
    setMessage(`Renamed preset to "${nextName}".`);
  };

  const deletePreset = (presetId: string) => {
    if (readOnly || !selectedAsset) return;
    if (!window.confirm("Delete this sprite animation preset?")) return;
    persistAssets(assets.map((asset) => asset.id === selectedAsset.id
      ? normalizeSpriteSheetAsset({ ...asset, animationPresets: asset.animationPresets.filter((preset) => preset.id !== presetId), updatedAt: new Date().toISOString() })
      : asset
    ));
    if (loadedPresetId === presetId) {
      setLoadedPresetId("");
      setSlicedPreset(null);
    }
    setMessage("Preset deleted.");
  };

  const deleteAsset = (assetId: string) => {
    if (readOnly) return;
    if (!window.confirm("Remove this sprite sheet asset from the app? This does not delete the Drive file.")) return;
    const nextAssets = assets.filter((asset) => asset.id !== assetId);
    persistAssets(nextAssets);
    setSelectedAssetId(nextAssets[0]?.id || "");
    setMessage("Sprite sheet removed from the app. The Google Drive file was not deleted.");
  };

  const copyConfig = async (preset: SpriteAnimationPreset) => {
    const config = JSON.stringify(preset, null, 2);
    try {
      await navigator.clipboard.writeText(config);
      setMessage("Preset config copied.");
    } catch {
      setMessage(config);
    }
  };

  const updateSetting = (key: keyof SpriteEditorSettings, value: string | number | boolean, slicing = false) => {
    setSettings((current) => ({ ...current, [key]: value }));
    if (slicing && slicedPreset) setSliceDirty(true);
  };

  const frames = activePreset ? buildFrameSequence(activePreset) : [];

  return (
    <section className="sprite-animator-page page-shell">
      <header className="sprite-animator-hero panel-card">
        <div>
          <p className="section-kicker">Sprite Sheet Animation System</p>
          <h1 className="font-display">Sprite Sheet Animator</h1>
          <p>
            Upload or import a sheet through Google Drive, manually line up the frame grid, slice it, preview the animation, and save reusable presets.
          </p>
        </div>
        <div className="sprite-animator-hero-badges">
          <span>No Auto Detect</span>
          <span>Drive Metadata Only</span>
          <span>Reusable Presets</span>
        </div>
      </header>

      <section className="sprite-upload-panel panel-card">
        <div className="sprite-upload-fields">
          <label>
            Asset Name
            <input
              value={draft.assetName}
              onChange={(event) => setDraft((current) => ({ ...current, assetName: event.target.value }))}
              placeholder="Gwen, Salt Slime, Hover Button..."
              disabled={readOnly}
            />
          </label>
          <label>
            Category
            <CustomSelect
              value={draft.category}
              onChange={(value) => setDraft((current) => ({ ...current, category: value }))}
              options={spriteSheetCategories}
              disabled={readOnly}
            />
          </label>
          <label>
            Animation Name
            <input
              value={draft.animationName}
              onChange={(event) => {
                setDraft((current) => ({ ...current, animationName: event.target.value }));
                setSettings((current) => ({ ...current, animationName: event.target.value || current.animationName }));
              }}
              placeholder="Idle, Run, Attack, Hover Glow..."
              disabled={readOnly}
            />
          </label>
        </div>

        <DriveImageSourceControls
          value={draft.sourceUrl}
          label="Sprite Sheet"
          title="Choose Sprite Sheet"
          disabled={readOnly}
          defaultFolderId={draft.folderId}
          defaultFolderLink={draft.folderLink}
          defaultFolderName={draft.folderName}
          uploadAssetState={draft.uploadState}
          showUploadState
          uploadFileName={(file) => buildSpriteSheetUploadFileName({
            category: draft.category,
            assetName: draft.assetName,
            animationName: draft.animationName
          }, file.name)}
          uploadNameContext={{
            sourceType: draft.category,
            subjectName: draft.assetName,
            slotName: draft.animationName,
            purpose: "Sprite Sheet"
          }}
          onChange={(imageUrl) => setDraft((current) => ({ ...current, sourceUrl: imageUrl }))}
          onPick={handlePickedImage}
          onUpload={handleUploadedImage}
          onFolderChange={(folder) => setDraft((current) => ({
            ...current,
            folderId: folder.id,
            folderLink: folder.url,
            folderName: folder.name
          }))}
          onUploadAssetStateChange={(uploadState) => setDraft((current) => ({ ...current, uploadState }))}
        />

        <div className="sprite-upload-actions">
          <button type="button" className="button-frame" onClick={saveManualSourceAsAsset} disabled={readOnly}>
            <Icon name="Save" className="h-4 w-4" />
            Save as Sprite Sheet Asset
          </button>
          <span>{draft.folderName || draft.folderId ? `Target folder: ${draft.folderName || draft.folderId}` : "Choose a Drive folder before uploading if this sheet belongs in a specific category."}</span>
        </div>
      </section>

      <div className="sprite-animator-layout">
        <aside className="sprite-library panel-card">
          <div className="sprite-panel-heading">
            <div>
              <p className="section-kicker">Library</p>
              <h2 className="font-display">Sprite Sheets</h2>
            </div>
            <span>{assets.length} assets</span>
          </div>
          <div className="sprite-library-list entry-scroll">
            {assets.map((asset) => (
              <article key={asset.id} className={`sprite-library-card ${asset.id === selectedAsset?.id ? "selected" : ""}`}>
                <button type="button" onClick={() => setSelectedAssetId(asset.id)}>
                  <span className="sprite-library-thumb">
                    {asset.thumbnailUrl ? <img src={asset.thumbnailUrl} alt="" /> : <Icon name="Image" className="h-8 w-8" />}
                  </span>
                  <span>
                    <strong>{asset.name}</strong>
                    <small>{asset.category} / {asset.animationPresets.length} presets</small>
                    <em>{asset.folderName || asset.folderId || "No folder recorded"}</em>
                  </span>
                </button>
                <div>
                  <button type="button" onClick={() => setSelectedAssetId(asset.id)}>Edit / Slice</button>
                  {!readOnly && <button type="button" onClick={() => deleteAsset(asset.id)}>Remove</button>}
                </div>
              </article>
            ))}
            {!assets.length && (
              <div className="sprite-empty-state">
                <Icon name="Image" className="h-8 w-8" />
                <h3>No sprite sheets saved yet.</h3>
                <p>Upload or import a sheet above, then save it as a sprite sheet asset.</p>
              </div>
            )}
          </div>
        </aside>

        <main className="sprite-editor-panel panel-card">
          <div className="sprite-panel-heading">
            <div>
              <p className="section-kicker">Manual Slicing Editor</p>
              <h2 className="font-display">{selectedAsset?.name || "Choose a Sprite Sheet"}</h2>
              <p>Adjust columns, rows, and frame size until the grid matches your sheet. Then click Slice.</p>
            </div>
            <div className="sprite-zoom-controls">
              <button type="button" onClick={() => setZoom((value) => Math.max(0.25, value - 0.1))}>-</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.1))}>+</button>
            </div>
          </div>

          <div className="sprite-editor-grid">
            <section className="sprite-sheet-stage entry-scroll">
              {selectedImageUrl ? (
                <div
                  className="sprite-sheet-canvas"
                  style={{
                    width: imageSize.width ? imageSize.width * zoom : undefined,
                    height: imageSize.height ? imageSize.height * zoom : undefined
                  }}
                >
                  <img
                    src={selectedImageUrl}
                    alt={selectedAsset?.name || "Sprite sheet"}
                    draggable={false}
                    onLoad={(event) => setImageSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight
                    })}
                  />
                  {imageSize.width > 0 && <SpriteGridOverlay settings={settings} zoom={zoom} currentFrame={manualFrame ?? currentFrame} />}
                </div>
              ) : (
                <div className="sprite-empty-state large">
                  <Icon name="Upload" className="h-10 w-10" />
                  <h3>Upload or select a sprite sheet first.</h3>
                  <p>The editor waits for your manual slicing values. It will not auto-detect frames.</p>
                </div>
              )}
            </section>

            <aside className="sprite-settings-panel">
              <label>
                Animation Name
                <input value={settings.animationName} onChange={(event) => updateSetting("animationName", event.target.value)} />
              </label>
              <div className="sprite-number-grid">
                <NumberField label="Columns" value={settings.columns} min={1} onChange={(value) => updateSetting("columns", value, true)} />
                <NumberField label="Rows" value={settings.rows} min={1} onChange={(value) => updateSetting("rows", value, true)} />
                <NumberField label="Frame Width" value={settings.frameWidth} min={1} onChange={(value) => updateSetting("frameWidth", value, true)} />
                <NumberField label="Frame Height" value={settings.frameHeight} min={1} onChange={(value) => updateSetting("frameHeight", value, true)} />
                <NumberField label="Total Frames" value={settings.totalFrames} min={1} onChange={(value) => updateSetting("totalFrames", value, true)} />
                <NumberField label="Start Frame" value={settings.startFrame} min={0} onChange={(value) => updateSetting("startFrame", value, true)} />
                <NumberField label="End Frame" value={settings.endFrame} min={0} onChange={(value) => updateSetting("endFrame", value, true)} />
                <NumberField label="FPS" value={settings.fps} min={1} max={60} onChange={(value) => updateSetting("fps", value)} />
              </div>
              <label>
                Preview Scale
                <input
                  type="range"
                  min="0.25"
                  max="6"
                  step="0.25"
                  value={settings.scale}
                  onChange={(event) => updateSetting("scale", Number(event.target.value))}
                />
                <span>{settings.scale}x</span>
              </label>
              <div className="sprite-toggle-row">
                <ToggleButton label="Loop" active={settings.loop} onClick={() => updateSetting("loop", !settings.loop)} />
                <ToggleButton label="Ping-Pong" active={settings.pingPong} onClick={() => updateSetting("pingPong", !settings.pingPong)} />
                <ToggleButton label="Play Once" active={settings.playOnce} onClick={() => updateSetting("playOnce", !settings.playOnce)} />
              </div>
              <button type="button" className="button-frame sprite-slice-button" onClick={sliceSheet}>
                Slice
              </button>
              {sliceDirty && <p className="sprite-warning">Slicing settings changed. Click Slice again to rebuild the animation preview.</p>}
              {message && <p className="sprite-message">{message}</p>}
            </aside>
          </div>
        </main>
      </div>

      <section className="sprite-preview-panel panel-card">
        <div className="sprite-panel-heading">
          <div>
            <p className="section-kicker">Preview Animation</p>
            <h2 className="font-display">{activePreset ? activePreset.animationName : "Waiting for Slice"}</h2>
          </div>
          <div className="sprite-playback-actions">
            <button type="button" onClick={() => setPreviewPlaying(true)} disabled={!activePreset}>Play</button>
            <button type="button" onClick={() => setPreviewPlaying(false)} disabled={!activePreset}>Pause</button>
            <button type="button" onClick={() => {
              setPreviewPlaying(false);
              setManualFrame(activePreset?.startFrame ?? 0);
              setCurrentFrame(activePreset?.startFrame ?? 0);
            }} disabled={!activePreset}>Restart</button>
            <button type="button" className="button-frame" onClick={savePreset} disabled={readOnly || !activePreset || sliceDirty}>
              <Icon name="Save" className="h-4 w-4" />
              Save Preset
            </button>
          </div>
        </div>

        <div className="sprite-preview-grid">
          <div className="sprite-preview-stage">
            {selectedAsset && activePreset ? (
              <SpriteAnimation
                spriteSheet={selectedAsset}
                preset={activePreset}
                autoplay={previewPlaying}
                frameOverride={previewPlaying ? null : manualFrame}
                onFrameChange={setCurrentFrame}
              />
            ) : (
              <div className="sprite-preview-placeholder">
                Adjust the grid, then click Slice to generate an animation preview.
              </div>
            )}
            {activePreset && (
              <div className="sprite-preview-meta">
                <span>Frame {currentFrame}</span>
                <span>{activePreset.endFrame - activePreset.startFrame + 1} frames</span>
                <span>{durationLabel(activePreset)} duration</span>
              </div>
            )}
          </div>

          <div className="sprite-timeline-wrap">
            <div className="sprite-timeline">
              {activePreset ? Array.from({ length: activePreset.totalFrames }, (_, index) => {
                const disabled = index < activePreset.startFrame || index > activePreset.endFrame;
                return (
                  <button
                    type="button"
                    key={index}
                    className={`${index === currentFrame ? "active" : ""} ${disabled ? "disabled" : ""}`.trim()}
                    onClick={() => {
                      setPreviewPlaying(false);
                      setManualFrame(index);
                      setCurrentFrame(index);
                    }}
                    disabled={disabled}
                  >
                    {index}
                  </button>
                );
              }) : <span className="sprite-timeline-empty">Timeline appears after slicing.</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="sprite-presets-panel panel-card">
        <div className="sprite-panel-heading">
          <div>
            <p className="section-kicker">Saved Presets</p>
            <h2 className="font-display">Reusable Animations</h2>
          </div>
          <span>{selectedAsset?.animationPresets.length || 0} presets</span>
        </div>
        <div className="sprite-preset-grid">
          {selectedAsset?.animationPresets.map((preset) => (
            <article key={preset.id} className={`sprite-preset-card ${preset.id === loadedPresetId ? "selected" : ""}`}>
              <h3>{preset.presetName}</h3>
              <p>Frames {preset.startFrame}-{preset.endFrame} / {preset.fps} FPS</p>
              <span>{preset.loop ? "Loop" : "No loop"}{preset.pingPong ? " / Ping-pong" : ""}{preset.playOnce ? " / Play once" : ""}</span>
              <div>
                <button type="button" onClick={() => loadPreset(preset)}>Load</button>
                <button type="button" onClick={() => duplicatePreset(preset)} disabled={readOnly}>Duplicate</button>
                <button type="button" onClick={() => renamePreset(preset)} disabled={readOnly}>Rename</button>
                <button type="button" onClick={() => copyConfig(preset)}>Copy Config</button>
                <button type="button" onClick={() => deletePreset(preset.id)} disabled={readOnly}>Delete</button>
              </div>
            </article>
          ))}
          {!selectedAsset?.animationPresets.length && (
            <div className="sprite-empty-state">
              <h3>No presets saved yet.</h3>
              <p>Slice the sheet, preview the motion, then save an animation preset.</p>
            </div>
          )}
        </div>
      </section>

      <section className="sprite-demo-panel panel-card">
        <div>
          <p className="section-kicker">Use In App</p>
          <h2 className="font-display">Hover Button Demo</h2>
          <p>Saved sprite presets can be reused by image slots as a sprite animation mode. This demo plays the current preset on hover.</p>
        </div>
        <button type="button" className="sprite-hover-demo" disabled={!selectedAsset || !activePreset}>
          {selectedAsset && activePreset ? (
            <SpriteAnimation
              spriteSheet={selectedAsset}
              preset={{ ...activePreset, scale: Math.min(activePreset.scale, 1.5) }}
              playOnHover
              loopWhileHovering
            />
          ) : (
            <Icon name="Image" className="h-6 w-6" />
          )}
          <span>Animated Hover State</span>
        </button>
      </section>
    </section>
  );
}

function SpriteGridOverlay({ settings, zoom, currentFrame }: { settings: SpriteEditorSettings; zoom: number; currentFrame: number }) {
  const availableFrames = Math.max(0, settings.columns * settings.rows);
  return (
    <div className="sprite-grid-overlay" aria-hidden="true">
      {Array.from({ length: availableFrames }, (_, index) => {
        const { column, row } = frameBounds(index, settings.columns, settings.frameWidth, settings.frameHeight);
        return (
          <span
            key={index}
            className={`${index === currentFrame ? "current" : ""} ${index >= settings.totalFrames ? "disabled" : ""}`.trim()}
            style={{
              left: column * settings.frameWidth * zoom,
              top: row * settings.frameHeight * zoom,
              width: settings.frameWidth * zoom,
              height: settings.frameHeight * zoom
            }}
          >
            {index}
          </span>
        );
      })}
    </div>
  );
}

function NumberField({ label, value, min = 0, max, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ToggleButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`sprite-toggle ${active ? "active" : ""}`} onClick={onClick}>
      <span />
      {label}
    </button>
  );
}

function validateSpriteSettings(settings: SpriteEditorSettings, imageSize: { width: number; height: number }, hasImage: boolean) {
  const errors: string[] = [];
  if (!hasImage) errors.push("Upload or select a sprite sheet first.");
  if (!imageSize.width || !imageSize.height) errors.push("Wait for the sprite sheet image to finish loading.");
  if (settings.columns <= 0) errors.push("Columns must be greater than 0.");
  if (settings.rows <= 0) errors.push("Rows must be greater than 0.");
  if (settings.frameWidth <= 0) errors.push("Frame width must be greater than 0.");
  if (settings.frameHeight <= 0) errors.push("Frame height must be greater than 0.");
  const availableFrames = settings.columns * settings.rows;
  if (settings.totalFrames > availableFrames) errors.push("Total frames cannot be larger than columns x rows.");
  if (settings.startFrame < 0) errors.push("Start frame cannot be less than 0.");
  if (settings.endFrame > settings.totalFrames - 1) errors.push("End frame cannot be greater than total frames - 1.");
  if (settings.endFrame < settings.startFrame) errors.push("End frame cannot be before start frame.");
  if (settings.frameWidth * settings.columns > imageSize.width) errors.push("Your frame width and columns exceed the image width.");
  if (settings.frameHeight * settings.rows > imageSize.height) errors.push("Your frame height and rows exceed the image height.");
  if (settings.fps < 1 || settings.fps > 60) errors.push("FPS must be between 1 and 60.");
  return errors;
}

function settingsFromPreset(preset: SpriteAnimationPreset): SpriteEditorSettings {
  return {
    animationName: preset.animationName,
    columns: preset.columns,
    rows: preset.rows,
    frameWidth: preset.frameWidth,
    frameHeight: preset.frameHeight,
    totalFrames: preset.totalFrames,
    startFrame: preset.startFrame,
    endFrame: preset.endFrame,
    fps: preset.fps,
    loop: preset.loop,
    pingPong: preset.pingPong,
    playOnce: preset.playOnce,
    scale: preset.scale
  };
}

function durationLabel(preset: SpriteAnimationPreset) {
  const frames = buildFrameSequence(preset).length;
  return `${(frames / Math.max(1, preset.fps)).toFixed(2)}s`;
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[a-z0-9]+$/i, "");
}

