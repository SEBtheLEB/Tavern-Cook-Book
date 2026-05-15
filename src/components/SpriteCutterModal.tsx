import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import type { ImageFitSettings, SpriteAnimationSlotReference } from "../types";
import { extractGoogleDriveFileId, googleDriveThumbnailUrl, googleDriveWebViewLink, resolveImageSourceUrl } from "../utils/imageFit";
import type { GoogleDriveFolder, GooglePickerFile, UploadedDriveFile, DriveUploadNameContext } from "../utils/googlePicker";
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
import { createSpriteAnimationSlotReference } from "../utils/spriteAnimationSlots";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { Icon } from "./Icon";
import { SpriteAnimation } from "./SpriteAnimation";

export interface SpriteCutterSlotContext {
  id: string;
  label: string;
  description?: string;
  imageUrl: string;
  imageFit?: ImageFitSettings;
  webViewLink?: string;
  defaultFolderId?: string;
  defaultFolderLink?: string;
  defaultFolderName?: string;
  uploadNameContext?: DriveUploadNameContext;
  resolveUploadFolder?: () => Promise<GoogleDriveFolder | null>;
  spriteAnimation?: SpriteAnimationSlotReference;
}

interface SpriteCutterModalProps {
  slot: SpriteCutterSlotContext;
  onClose: () => void;
  onAdd: (patch: {
    imageUrl: string;
    webViewLink: string;
    defaultFolderId?: string;
    defaultFolderLink?: string;
    defaultFolderName?: string;
    spriteAnimation: SpriteAnimationSlotReference;
  }) => void;
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
  frameHoldCounts: Record<string, number>;
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

const defaultSettings: SpriteEditorSettings = { ...defaultSpritePresetSettings, loop: true, playOnce: false };

export function SpriteCutterModal({ slot, onClose, onAdd }: SpriteCutterModalProps) {
  const [assets, setAssets] = useState<SpriteSheetAsset[]>(() => loadSpriteSheetAssets());
  const initial = useMemo(() => createInitialSpriteAsset(slot, loadSpriteSheetAssets()), [slot.id]);
  const [selectedAssetId, setSelectedAssetId] = useState(initial.asset?.id || "");
  const [draft, setDraft] = useState<SpriteDraft>({
    assetName: initial.asset?.name || slot.uploadNameContext?.subjectName || slot.label || "Sprite Sheet",
    category: initial.asset?.category || slot.uploadNameContext?.sourceType || slot.uploadNameContext?.categoryName || "Misc",
    animationName: slot.uploadNameContext?.slotName || slot.label || "Animation",
    folderId: slot.defaultFolderId || initial.asset?.folderId || "",
    folderLink: slot.defaultFolderLink || initial.asset?.folderLink || "",
    folderName: slot.defaultFolderName || initial.asset?.folderName || "",
    sourceUrl: initial.asset?.thumbnailUrl || resolveImageSourceUrl(slot.imageUrl || slot.webViewLink || ""),
    uploadState: "wip"
  });
  const initialPreset = useMemo(() => initial.asset?.animationPresets.find((preset) => preset.id === slot.spriteAnimation?.animationPresetId) || null, [initial.asset?.id, slot.spriteAnimation?.animationPresetId]);
  const [settings, setSettings] = useState<SpriteEditorSettings>(initialPreset ? settingsFromPreset(initialPreset) : { ...defaultSettings, animationName: slot.uploadNameContext?.slotName || slot.label || "Animation" });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [slicedPreset, setSlicedPreset] = useState<SpriteAnimationPreset | null>(initialPreset);
  const [sliceDirty, setSliceDirty] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(settings.startFrame);
  const [manualFrame, setManualFrame] = useState<number | null>(settings.startFrame);
  const [message, setMessage] = useState(initial.asset ? "Grid is ready. Adjust the slicing values, then click Slice." : "Choose or upload a sprite sheet first.");
  const [autoFitGrid, setAutoFitGrid] = useState(!initialPreset);
  const [playback, setPlayback] = useState<"autoplay" | "hover">(slot.spriteAnimation?.playback || "autoplay");

  useEffect(() => {
    if (!initial.asset) return;
    const exists = assets.some((asset) => asset.id === initial.asset?.id);
    if (!exists) persistAssets([initial.asset, ...assets]);
  }, []);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) || initial.asset || assets[0] || null;
  const selectedImageUrl = selectedAsset?.thumbnailUrl || selectedAsset?.driveUrl || draft.sourceUrl;
  const activePreset = slicedPreset
    ? normalizeSpriteAnimationPreset({
        ...slicedPreset,
        animationName: settings.animationName,
        presetName: settings.animationName,
        fps: settings.fps,
        loop: settings.loop,
        pingPong: settings.pingPong,
        playOnce: settings.playOnce,
        scale: settings.scale,
        frameHoldCounts: settings.frameHoldCounts
      }, selectedAsset?.id || "")
    : null;

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
      id: existing?.id || `sprite-sheet-${details.driveFileId || slot.id}-${Date.now()}`,
      name: draft.assetName.trim() || stripFileExtension(details.originalFileName) || slot.label || "Sprite Sheet",
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
    persistAssets(existing ? assets.map((item) => (item.id === existing.id ? asset : item)) : [asset, ...assets]);
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
    setImageSize({ width: 0, height: 0 });
    setSlicedPreset(null);
    setMessage(`Loaded "${asset.name}". Adjust the grid, then click Slice.`);
  };

  const handlePickedImage = (imageUrl: string, file: GooglePickerFile) => {
    createOrUpdateAsset({
      imageUrl,
      driveFileId: file.id,
      driveUrl: file.url || googleDriveWebViewLink(file.id),
      thumbnailUrl: googleDriveThumbnailUrl(file.id),
      originalFileName: file.name
    });
  };

  const handleUploadedImage = (imageUrl: string, file: UploadedDriveFile, folder: GoogleDriveFolder) => {
    createOrUpdateAsset({
      imageUrl,
      driveFileId: file.id,
      driveUrl: file.webViewLink || googleDriveWebViewLink(file.id),
      thumbnailUrl: googleDriveThumbnailUrl(file.id),
      originalFileName: file.name,
      folder
    });
  };

  const handleManualImageChange = (imageUrl: string) => {
    const resolved = resolveImageSourceUrl(imageUrl);
    setDraft((current) => ({ ...current, sourceUrl: resolved }));
    if (!resolved) return;
    const driveFileId = extractGoogleDriveFileId(imageUrl || resolved);
    createOrUpdateAsset({
      imageUrl: resolved,
      driveFileId,
      driveUrl: driveFileId ? googleDriveWebViewLink(driveFileId) : resolved,
      thumbnailUrl: driveFileId ? googleDriveThumbnailUrl(driveFileId) : resolved,
      originalFileName: draft.assetName || slot.label || "Sprite Sheet"
    });
  };

  const updateSetting = (key: keyof SpriteEditorSettings, value: string | number | boolean, slicing = false) => {
    if (key === "frameWidth" || key === "frameHeight") setAutoFitGrid(false);
    setSettings((current) => {
      const next = { ...current, [key]: value } as SpriteEditorSettings;
      if (key === "columns" || key === "rows") {
        return autoFitGrid && imageSize.width && imageSize.height
          ? fitSettingsToImage(next, imageSize, false)
          : normalizeEditorSettings(next);
      }
      return normalizeEditorSettings(next);
    });
    if (slicing && slicedPreset) setSliceDirty(true);
  };

  const fitGridToSheet = () => {
    if (!imageSize.width || !imageSize.height) {
      setMessage("Wait for the sprite sheet image to finish loading.");
      return;
    }
    setSettings((current) => fitSettingsToImage(current, imageSize, true));
    setAutoFitGrid(true);
    if (slicedPreset) setSliceDirty(true);
    setMessage(`Grid fitted to ${imageSize.width} x ${imageSize.height}. You can still change any value by hand.`);
  };

  const updateFrameHold = (frame: number, count: number) => {
    setSettings((current) => {
      const nextCounts = { ...current.frameHoldCounts };
      const safeCount = Math.min(12, Math.max(1, Math.round(Number(count) || 1)));
      if (safeCount <= 1) delete nextCounts[String(frame)];
      else nextCounts[String(frame)] = safeCount;
      return { ...current, frameHoldCounts: nextCounts };
    });
  };

  const handleSheetLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const nextSize = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight };
    setImageSize(nextSize);
    setZoom((current) => Math.min(current, previewZoomForSize(nextSize)));
    setSettings((current) => {
      const gridExceeds = current.frameWidth * current.columns > nextSize.width || current.frameHeight * current.rows > nextSize.height;
      if (initialPreset && !gridExceeds) return current;
      return fitSettingsToImage(current, nextSize, !initialPreset);
    });
    if (!initialPreset) setAutoFitGrid(true);
    setMessage(`Loaded sheet ${nextSize.width} x ${nextSize.height}. The starting grid has been fitted to the image.`);
  };

  const sliceSheet = () => {
    const errors = validateSpriteSettings(settings, imageSize, Boolean(selectedAsset && selectedImageUrl));
    if (errors.length) {
      setMessage(errors[0]);
      return;
    }
    if (!selectedAsset) return;
    const preset = createSpritePresetFromSettings(selectedAsset.id, {
      animationName: settings.animationName || slot.label || "Animation",
      columns: settings.columns,
      rows: settings.rows,
      frameWidth: settings.frameWidth,
      frameHeight: settings.frameHeight,
      totalFrames: settings.totalFrames,
      startFrame: settings.startFrame,
      endFrame: settings.endFrame,
      fps: settings.fps,
      loop: true,
      pingPong: settings.pingPong,
      playOnce: false,
      scale: settings.scale,
      frameHoldCounts: settings.frameHoldCounts
    });
    setSlicedPreset(preset);
    setSliceDirty(false);
    setPreviewPlaying(false);
    setManualFrame(settings.startFrame);
    setCurrentFrame(settings.startFrame);
    setMessage("Sliced. Click Play to test it, then Add Animation when you like it.");
  };

  const addAnimationToSlot = () => {
    if (!selectedAsset || !activePreset || sliceDirty) {
      setMessage("Click Slice first so the animation preset matches the visible grid.");
      return;
    }
    const now = new Date().toISOString();
    const savedPreset = normalizeSpriteAnimationPreset({
      ...activePreset,
      id: activePreset.id,
      spriteSheetAssetId: selectedAsset.id,
      presetName: activePreset.animationName,
      updatedAt: now
    }, selectedAsset.id);
    const updatedAsset = normalizeSpriteSheetAsset({
      ...selectedAsset,
      updatedAt: now,
      animationPresets: selectedAsset.animationPresets.some((preset) => preset.id === savedPreset.id)
        ? selectedAsset.animationPresets.map((preset) => (preset.id === savedPreset.id ? savedPreset : preset))
        : [...selectedAsset.animationPresets, savedPreset]
    });
    persistAssets(assets.some((asset) => asset.id === updatedAsset.id)
      ? assets.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset))
      : [updatedAsset, ...assets]
    );
    onAdd({
      imageUrl: updatedAsset.thumbnailUrl || updatedAsset.driveUrl,
      webViewLink: updatedAsset.driveUrl || googleDriveWebViewLink(updatedAsset.driveFileId),
      defaultFolderId: updatedAsset.folderId,
      defaultFolderLink: updatedAsset.folderLink,
      defaultFolderName: updatedAsset.folderName,
      spriteAnimation: createSpriteAnimationSlotReference(updatedAsset, savedPreset, playback, true)
    });
    onClose();
  };

  return (
    <div className="sprite-cutter-backdrop" role="dialog" aria-modal="true" aria-label="Sprite Sheet Cutter">
      <section className="sprite-cutter-modal">
        <header className="sprite-cutter-header">
          <div>
            <p>Sprite Sheet Cutter</p>
            <h2 className="font-display">{slot.label}</h2>
            <span>Set the grid by hand, slice it, preview the animation, then add it back to this image slot.</span>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close sprite cutter">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <section className="sprite-cutter-source-row">
          <div className="sprite-cutter-source-fields">
            <label>
              Asset Name
              <input value={draft.assetName} onChange={(event) => setDraft((current) => ({ ...current, assetName: event.target.value }))} />
            </label>
            <label>
              Category
              <CustomSelect value={draft.category} onChange={(category) => setDraft((current) => ({ ...current, category }))} options={spriteSheetCategories} />
            </label>
            <label>
              Animation Name
              <input value={settings.animationName} onChange={(event) => updateSetting("animationName", event.target.value)} />
            </label>
          </div>
          <DriveImageSourceControls
            compact
            value={draft.sourceUrl}
            label="Sprite Sheet"
            title={`Choose sprite sheet for ${slot.label}`}
            defaultFolderId={draft.folderId}
            defaultFolderLink={draft.folderLink}
            defaultFolderName={draft.folderName}
            resolveUploadFolder={slot.resolveUploadFolder}
            uploadAssetState={draft.uploadState}
            showUploadState
            uploadFileName={(file) => buildSpriteSheetUploadFileName({ category: draft.category, assetName: draft.assetName, animationName: settings.animationName }, file.name)}
            uploadNameContext={{ ...slot.uploadNameContext, subjectName: draft.assetName, categoryName: draft.category, slotName: settings.animationName, purpose: "Sprite Sheet" }}
            onChange={handleManualImageChange}
            onPick={handlePickedImage}
            onUpload={handleUploadedImage}
            onFolderChange={(folder) => setDraft((current) => ({ ...current, folderId: folder.id, folderLink: folder.url, folderName: folder.name }))}
            onUploadAssetStateChange={(uploadState) => setDraft((current) => ({ ...current, uploadState }))}
          />
        </section>

        <main className="sprite-cutter-body">
          <section className="sprite-cutter-sheet-panel">
            <div className="sprite-cutter-panel-heading">
              <div>
                <p>Sheet + Manual Grid</p>
                <h3 className="font-display">Visible Slice Grid</h3>
              </div>
              <div className="sprite-zoom-controls">
                <button type="button" onClick={() => setZoom((value) => Math.max(0.25, value - 0.1))}>-</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.1))}>+</button>
              </div>
              <button type="button" className={`sprite-fit-grid-button ${autoFitGrid ? "active" : ""}`} onClick={fitGridToSheet}>Fit Grid</button>
            </div>
            <div className="sprite-cutter-sheet-stage entry-scroll">
              {selectedImageUrl ? (
                <div
                  className="sprite-sheet-canvas"
                  style={{
                    width: imageSize.width ? imageSize.width * zoom : undefined,
                    height: imageSize.height ? imageSize.height * zoom : undefined
                  }}
                >
                  <DriveAwareImage
                    src={selectedImageUrl}
                    alt="Sprite sheet"
                    draggable={false}
                    onLoad={handleSheetLoad}
                  />
                  {imageSize.width > 0 && <SpriteCutterGrid settings={settings} zoom={zoom} currentFrame={manualFrame ?? currentFrame} />}
                </div>
              ) : (
                <div className="sprite-empty-state large">
                  <Icon name="Upload" className="h-10 w-10" />
                  <h3>Choose a sprite sheet first.</h3>
                  <p>No auto-detect. Enter the slicing values yourself, then click Slice.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="sprite-cutter-controls-panel">
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
            <FrameHoldControls settings={settings} onChange={updateFrameHold} />
            <label className="sprite-cutter-range-field">
              Preview Scale
              <input type="range" min="0.25" max="6" step="0.25" value={settings.scale} onChange={(event) => updateSetting("scale", Number(event.target.value))} />
              <span>{settings.scale}x</span>
            </label>
            <div className="sprite-toggle-row">
              <ToggleButton label="Ping-Pong" active={settings.pingPong} onClick={() => updateSetting("pingPong", !settings.pingPong)} />
              <ToggleButton label="Auto Loop" active={playback === "autoplay"} onClick={() => setPlayback("autoplay")} />
              <ToggleButton label="Only On Hover" active={playback === "hover"} onClick={() => setPlayback("hover")} />
            </div>
            <button type="button" className="button-frame sprite-slice-button" onClick={sliceSheet}>Slice</button>
            {sliceDirty && <p className="sprite-warning">Slicing settings changed. Click Slice again to rebuild the animation preview.</p>}
            {message && <p className="sprite-message">{message}</p>}
          </aside>

          <section className="sprite-cutter-preview-panel">
            <div className="sprite-cutter-panel-heading">
              <div>
                <p>Animation Viewer</p>
                <h3 className="font-display">{activePreset ? activePreset.animationName : "Slice to Preview"}</h3>
              </div>
              <div className="sprite-playback-actions">
                <button type="button" onClick={() => setPreviewPlaying(true)} disabled={!activePreset}>Play</button>
                <button type="button" onClick={() => {
                  setManualFrame(currentFrame);
                  setPreviewPlaying(false);
                }} disabled={!activePreset}>Pause</button>
                <button type="button" onClick={() => {
                  setPreviewPlaying(false);
                  setManualFrame(activePreset?.startFrame ?? 0);
                  setCurrentFrame(activePreset?.startFrame ?? 0);
                }} disabled={!activePreset}>Restart</button>
              </div>
            </div>
            <div className="sprite-cutter-preview-stage">
              {selectedAsset && activePreset ? (
                <SpriteAnimation
                  spriteSheet={selectedAsset}
                  preset={activePreset}
                  autoplay={previewPlaying}
                  frameOverride={previewPlaying ? null : manualFrame}
                  onFrameChange={setCurrentFrame}
                />
              ) : (
                <div className="sprite-preview-placeholder">Click Slice to build the animation viewer.</div>
              )}
              {activePreset && (
                <div className="sprite-preview-meta">
                  <span>Frame {currentFrame}</span>
                  <span>{activePreset.endFrame - activePreset.startFrame + 1} frames</span>
                  <span>{durationLabel(activePreset)}</span>
                </div>
              )}
            </div>
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
                    <span>{index}</span>
                    {frameHoldValue(activePreset.frameHoldCounts, index) > 1 && <small>x{frameHoldValue(activePreset.frameHoldCounts, index)}</small>}
                  </button>
                );
              }) : <span className="sprite-timeline-empty">Frames appear after slicing.</span>}
            </div>
          </section>
        </main>

        <footer className="sprite-cutter-footer">
          <span>{playback === "autoplay" ? "This slot will autoplay and loop by default." : "This slot will play only while hovered."}</span>
          <div>
            <button className="character-codex-action-button" onClick={onClose}>Cancel</button>
            <button className="button-frame character-codex-action-button" onClick={addAnimationToSlot} disabled={!activePreset || sliceDirty}>
              <Icon name="Plus" className="h-4 w-4" />
              Add Animation to Slot
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function SpriteCutterGrid({ settings, zoom, currentFrame }: { settings: SpriteEditorSettings; zoom: number; currentFrame: number }) {
  const availableFrames = Math.max(0, settings.columns * settings.rows);
  return (
    <div className="sprite-grid-overlay" aria-hidden="true">
      {Array.from({ length: availableFrames }, (_, index) => {
        const { column, row } = frameBounds(index, settings.columns, settings.frameWidth, settings.frameHeight);
        return (
          <span
            key={index}
            className={`${index === currentFrame ? "current" : ""} ${index >= settings.totalFrames ? "disabled" : ""}`.trim()}
            style={{ left: column * settings.frameWidth * zoom, top: row * settings.frameHeight * zoom, width: settings.frameWidth * zoom, height: settings.frameHeight * zoom }}
          >
            {index}
          </span>
        );
      })}
    </div>
  );
}


function FrameHoldControls({ settings, onChange }: { settings: SpriteEditorSettings; onChange: (frame: number, count: number) => void }) {
  const frames = Array.from(
    { length: Math.max(0, settings.endFrame - settings.startFrame + 1) },
    (_, index) => settings.startFrame + index
  );
  return (
    <section className="sprite-frame-hold-panel">
      <div>
        <strong>Frame Holds</strong>
        <span>Set a frame to 2x or 3x if it should linger longer in the preview.</span>
      </div>
      <div className="sprite-frame-hold-grid">
        {frames.map((frame) => (
          <label key={frame} className={frameHoldValue(settings.frameHoldCounts, frame) > 1 ? "has-hold" : ""}>
            <span>F{frame}</span>
            <input
              type="number"
              min={1}
              max={12}
              value={frameHoldValue(settings.frameHoldCounts, frame)}
              onChange={(event) => onChange(frame, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function frameHoldValue(frameHoldCounts: Record<string, number> | undefined, frame: number) {
  const parsed = Math.round(Number(frameHoldCounts?.[String(frame)]));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(12, Math.max(1, parsed));
}

function normalizeEditorSettings(settings: SpriteEditorSettings): SpriteEditorSettings {
  const columns = Math.max(1, Math.round(Number(settings.columns) || 1));
  const rows = Math.max(1, Math.round(Number(settings.rows) || 1));
  const maxFrames = Math.max(1, columns * rows);
  const totalFrames = Math.min(maxFrames, Math.max(1, Math.round(Number(settings.totalFrames) || maxFrames)));
  const startFrame = Math.min(totalFrames - 1, Math.max(0, Math.round(Number(settings.startFrame) || 0)));
  const endFrame = Math.min(totalFrames - 1, Math.max(startFrame, Math.round(Number(settings.endFrame) || totalFrames - 1)));
  return {
    ...settings,
    columns,
    rows,
    frameWidth: Math.max(1, Math.round(Number(settings.frameWidth) || 1)),
    frameHeight: Math.max(1, Math.round(Number(settings.frameHeight) || 1)),
    totalFrames,
    startFrame,
    endFrame,
    fps: Math.min(60, Math.max(1, Math.round(Number(settings.fps) || 8))),
    scale: Math.min(6, Math.max(0.25, Number(settings.scale) || 1)),
    frameHoldCounts: normalizeHoldCountsForRange(settings.frameHoldCounts, totalFrames)
  };
}

function fitSettingsToImage(settings: SpriteEditorSettings, imageSize: { width: number; height: number }, deriveRows: boolean): SpriteEditorSettings {
  const width = Math.max(1, Math.round(imageSize.width));
  const height = Math.max(1, Math.round(imageSize.height));
  const columns = Math.max(1, Math.round(Number(settings.columns) || defaultSpritePresetSettings.columns));
  const estimatedFrameWidth = Math.max(1, Math.floor(width / columns));
  const rows = deriveRows
    ? Math.max(1, Math.min(48, Math.round(height / estimatedFrameWidth) || 1))
    : Math.max(1, Math.round(Number(settings.rows) || 1));
  const frameWidth = Math.max(1, Math.floor(width / columns));
  const frameHeight = Math.max(1, Math.floor(height / rows));
  const totalFrames = Math.max(1, columns * rows);
  return normalizeEditorSettings({
    ...settings,
    columns,
    rows,
    frameWidth,
    frameHeight,
    totalFrames,
    startFrame: 0,
    endFrame: totalFrames - 1,
    frameHoldCounts: normalizeHoldCountsForRange(settings.frameHoldCounts, totalFrames)
  });
}

function normalizeHoldCountsForRange(value: Record<string, number> | undefined, totalFrames: number) {
  const next: Record<string, number> = {};
  Object.entries(value || {}).forEach(([key]) => {
    const frame = Math.round(Number(key));
    const count = frameHoldValue(value, frame);
    if (frame >= 0 && frame < totalFrames && count > 1) next[String(frame)] = count;
  });
  return next;
}

function previewZoomForSize(size: { width: number; height: number }) {
  const maxWidth = 980;
  const maxHeight = 620;
  if (!size.width || !size.height) return 1;
  return Math.max(0.25, Math.min(1, maxWidth / size.width, maxHeight / size.height));
}
function NumberField({ label, value, min = 0, max, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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
    loop: true,
    pingPong: preset.pingPong,
    playOnce: false,
    scale: preset.scale,
    frameHoldCounts: { ...(preset.frameHoldCounts || {}) }
  };
}

function createInitialSpriteAsset(slot: SpriteCutterSlotContext, assets: SpriteSheetAsset[]) {
  const currentReference = slot.spriteAnimation;
  if (currentReference) {
    const asset = assets.find((candidate) => candidate.id === currentReference.spriteSheetAssetId);
    if (asset) return { asset };
  }

  const sourceUrl = resolveImageSourceUrl(slot.imageUrl || slot.webViewLink || "");
  const driveFileId = extractGoogleDriveFileId(slot.webViewLink || slot.imageUrl || sourceUrl);
  if (!sourceUrl) return { asset: null };
  const existing = driveFileId ? assets.find((asset) => asset.driveFileId === driveFileId) : null;
  if (existing) return { asset: existing };
  const now = new Date().toISOString();
  return {
    asset: normalizeSpriteSheetAsset({
      id: `sprite-sheet-${driveFileId || slot.id}-${Date.now()}`,
      name: slot.uploadNameContext?.subjectName || slot.label || "Sprite Sheet",
      category: slot.uploadNameContext?.sourceType || slot.uploadNameContext?.categoryName || "Misc",
      folderId: slot.defaultFolderId || "",
      folderLink: slot.defaultFolderLink || "",
      folderName: slot.defaultFolderName || "",
      driveFileId,
      driveUrl: slot.webViewLink || (driveFileId ? googleDriveWebViewLink(driveFileId) : sourceUrl),
      thumbnailUrl: driveFileId ? googleDriveThumbnailUrl(driveFileId) : sourceUrl,
      originalFileName: slot.label || "Sprite Sheet",
      uploadedAt: now,
      updatedAt: now,
      animationPresets: []
    })
  };
}

function durationLabel(preset: SpriteAnimationPreset) {
  const frames = buildFrameSequence(preset).length;
  return `${(frames / Math.max(1, preset.fps)).toFixed(2)}s`;
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[a-z0-9]+$/i, "");
}












