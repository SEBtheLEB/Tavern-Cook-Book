import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ImageFitSettings, SpriteAnimationSlotReference } from "../types";
import {
  defaultImageFit,
  extractGoogleDriveFileId,
  googleDriveThumbnailUrl,
  googleDriveWebViewLink,
  imageFitToStyle,
  normalizeImageFit,
  resolveImageSourceUrl
} from "../utils/imageFit";
import type { DriveUploadNameContext, GoogleDriveFolder } from "../utils/googlePicker";
import { CustomSelect } from "./CustomSelect";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { normalizeSpriteAnimationSlotReference, resolveSpriteAnimationSlot } from "../utils/spriteAnimationSlots";
import { SpriteAnimation } from "./SpriteAnimation";
import { SpriteCutterModal } from "./SpriteCutterModal";
import { Icon } from "./Icon";
import { DriveAwareImage } from "./DriveAwareImage";

export interface ImageManagerSlot {
  id: string;
  label: string;
  description?: string;
  imageUrl: string;
  imageFit?: ImageFitSettings;
  webViewLink?: string;
  frameWidth?: number;
  frameHeight?: number;
  aspectRatio?: string;
  defaultFolderId?: string;
  defaultFolderLink?: string;
  defaultFolderName?: string;
  uploadNameContext?: DriveUploadNameContext;
  resolveUploadFolder?: () => Promise<GoogleDriveFolder | null>;
  showAssetState?: boolean;
  assetState?: "wip" | "final";
  spriteAnimation?: SpriteAnimationSlotReference;
}

export interface ImageManagerSlotDraft extends ImageManagerSlot {
  imageFit: ImageFitSettings;
}

interface ImageManagerModalProps {
  title: string;
  subtitle?: string;
  slots: ImageManagerSlot[];
  onClose: () => void;
  onSave: (slots: ImageManagerSlotDraft[]) => void;
  onAutoSave?: (slots: ImageManagerSlotDraft[]) => void;
}

export function ImageManagerModal({ title, subtitle, slots, onClose, onSave, onAutoSave }: ImageManagerModalProps) {
  const portalTarget = document.querySelector(".app-shell") || document.body;
  const initialDraftSlots = useMemo(() => slots.map(normalizeSlot), [slots]);
  const draftSlotsRef = useRef<ImageManagerSlotDraft[]>(initialDraftSlots);
  const slotSignature = slots.map((slot) => slot.id).join("|");
  const [draftSlots, setDraftSlots] = useState<ImageManagerSlotDraft[]>(() => draftSlotsRef.current);
  const [bulkLink, setBulkLink] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [spriteSlotId, setSpriteSlotId] = useState("");

  useEffect(() => {
    const nextSlots = slots.map(normalizeSlot);
    draftSlotsRef.current = nextSlots;
    setDraftSlots(nextSlots);
  }, [slotSignature]);

  const updateSlot = (id: string, patch: Partial<ImageManagerSlotDraft>, options: { autoSave?: boolean } = {}) => {
    const nextSlots = draftSlotsRef.current.map((slot) => (slot.id === id ? normalizeSlot({ ...slot, ...patch }) : slot));
    draftSlotsRef.current = nextSlots;
    setDraftSlots(nextSlots);
    if (options.autoSave) onAutoSave?.(nextSlots);
  };

  const spriteSlot = draftSlots.find((slot) => slot.id === spriteSlotId) || null;

  const applyBulkLinkToAllSlots = () => {
    const resolved = resolveImageSourceUrl(bulkLink);
    if (!resolved) {
      setBulkMessage("Paste a Google Drive image link or image URL first.");
      return;
    }
    let appliedCount = 0;
    const webViewLink = driveViewLinkFromImage(resolved);
    setDraftSlots((current) => {
      appliedCount = current.length;
      const nextSlots = current.map((slot) =>
        normalizeSlot({
          ...slot,
          imageUrl: resolved,
          spriteAnimation: undefined,
          webViewLink
        })
      );
      draftSlotsRef.current = nextSlots;
      return nextSlots;
    });
    setBulkLink(resolved);
    setBulkMessage(`Applied this image to ${appliedCount} slot${appliedCount === 1 ? "" : "s"}. Click Save All Images to keep it.`);
  };

  return createPortal(
    <div className="image-manager-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="image-manager-modal">
        <header className="image-manager-header">
          <div>
            <p>Image assignment table</p>
            <h2 className="font-display">{title}</h2>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close image manager">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <section className="image-manager-bulk-link" aria-label="Apply one image link to all image slots">
          <div>
            <strong>Use one image for every slot</strong>
            <span>Paste a Google Drive image link or image URL, then apply it to all modules currently open here.</span>
          </div>
          <div className="image-manager-bulk-link-controls">
            <input
              value={bulkLink}
              placeholder="Paste image link for all slots..."
              onChange={(event) => setBulkLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyBulkLinkToAllSlots();
              }}
            />
            <button className="button-frame character-codex-action-button" onClick={applyBulkLinkToAllSlots}>
              Use Link
            </button>
          </div>
          {bulkMessage && <small>{bulkMessage}</small>}
        </section>

        <div className="image-manager-slot-list">
          {draftSlots.map((slot) => (
            <ManagedImageSlotCard key={slot.id} slot={slot} onChange={(patch) => updateSlot(slot.id, patch)} onOpenSpriteCutter={() => setSpriteSlotId(slot.id)} />
          ))}
        </div>

        {spriteSlot && (
          <SpriteCutterModal
            slot={spriteSlot}
            onClose={() => setSpriteSlotId("")}
            onAdd={(patch) => {
              updateSlot(spriteSlot.id, patch, { autoSave: true });
              setBulkMessage(`Sprite animation saved to ${spriteSlot.label}.`);
              setSpriteSlotId("");
            }}
          />
        )}

        <footer className="image-manager-footer">
          <button className="character-codex-action-button" onClick={onClose}>Cancel</button>
          <button className="button-frame character-codex-action-button" onClick={() => onSave(draftSlots)}>
            <Icon name="Save" className="h-4 w-4" />
            Save All Images
          </button>
        </footer>
      </section>
    </div>,
    portalTarget
  );
}

function ManagedImageSlotCard({
  slot,
  onChange,
  onOpenSpriteCutter
}: {
  slot: ImageManagerSlotDraft;
  onChange: (patch: Partial<ImageManagerSlotDraft>, options?: { autoSave?: boolean }) => void;
  onOpenSpriteCutter: () => void;
}) {
  const frameStyle = slot.frameWidth && slot.frameHeight
    ? {
        width: `${slot.frameWidth}px`,
        height: `${slot.frameHeight}px`,
        aspectRatio: `${slot.frameWidth} / ${slot.frameHeight}`
      }
    : { aspectRatio: slot.aspectRatio || "4 / 3" };
  const driveLink = slot.webViewLink || driveViewLinkFromImage(slot.imageUrl);

  return (
    <article className="image-manager-slot-card">
      <div className="image-manager-slot-preview-wrap">
        <div className="image-manager-slot-preview" style={frameStyle}>
          {slot.spriteAnimation ? (
            <ManagedSpriteAnimationPreview reference={slot.spriteAnimation} imageFit={slot.imageFit} />
          ) : slot.imageUrl ? (
            <DriveAwareImage src={slot.imageUrl} alt="" style={imageFitToStyle(slot.imageFit)} />
          ) : (
            <div className="image-manager-empty-preview">
              <Icon name="Image" className="h-8 w-8" />
              <span>No image assigned</span>
            </div>
          )}
        </div>
      </div>

      <div className="image-manager-slot-controls">
        <div className="image-manager-slot-title">
          <div>
            <h3>{slot.label}</h3>
            {slot.description && <p>{slot.description}</p>}
          </div>
          <div className="image-manager-slot-actions">
            <button
              className="character-codex-action-button"
              disabled={!driveLink}
              onClick={() => driveLink && window.open(driveLink, "_blank", "noopener,noreferrer")}
            >
              <Icon name="FolderOpen" className="h-4 w-4" />
              Drive
            </button>
            <a
              className={`character-codex-action-button ${slot.imageUrl ? "" : "disabled"}`}
              href={slot.imageUrl || undefined}
              download={`${slot.label || "image"}.png`}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!slot.imageUrl}
            >
              <Icon name="Download" className="h-4 w-4" />
              Download
            </a>
            <button className="character-codex-action-button" onClick={onOpenSpriteCutter}>
              <Icon name="Gamepad2" className="h-4 w-4" />
              Make Sprite Animation
            </button>
            <button className="character-codex-action-button character-codex-danger-button" disabled={!slot.imageUrl} onClick={() => onChange({ imageUrl: "", webViewLink: "", imageFit: defaultImageFit, spriteAnimation: undefined }, { autoSave: true })}>
              Remove
            </button>
          </div>
        </div>

        <DriveImageSourceControls
          compact
          value={slot.imageUrl}
          label={slot.label}
          title={`Choose ${slot.label}`}
          defaultFolderId={slot.defaultFolderId}
          defaultFolderLink={slot.defaultFolderLink}
          defaultFolderName={slot.defaultFolderName}
          uploadNameContext={{
            categoryName: slot.description,
            slotName: slot.label,
            state: slot.assetState,
            ...slot.uploadNameContext
          }}
          showUploadState={slot.showAssetState}
          uploadAssetState={slot.assetState || "wip"}
          resolveUploadFolder={slot.resolveUploadFolder}
          onFolderChange={(folder) => onChange({
            defaultFolderId: folder.id,
            defaultFolderLink: folder.url,
            defaultFolderName: folder.name
          })}
          onUploadAssetStateChange={(assetState) => onChange({ assetState })}
          onChange={(imageUrl) => {
            const resolved = resolveImageSourceUrl(imageUrl);
            onChange({
              imageUrl: resolved,
              webViewLink: driveViewLinkFromImage(resolved),
              spriteAnimation: undefined
            }, { autoSave: true });
          }}
          onPick={(imageUrl, file) => onChange({
            imageUrl,
            webViewLink: file.url || googleDriveWebViewLink(file.id),
            spriteAnimation: undefined
          }, { autoSave: true })}
          onUpload={(imageUrl, file, folder, assetState) => onChange({
            imageUrl,
            webViewLink: file.webViewLink || googleDriveWebViewLink(file.id),
            defaultFolderId: folder.id,
            defaultFolderLink: folder.url,
            defaultFolderName: folder.name,
            assetState,
            spriteAnimation: undefined
          }, { autoSave: true })}
        />

        <div className="image-manager-fit-grid">
          <ImageManagerRange label="Scale" min={0.25} max={3} step={0.05} value={slot.imageFit.scale} onChange={(scale) => onChange({ imageFit: normalizeImageFit({ ...slot.imageFit, scale }) })} />
          <ImageManagerRange label="X" min={-100} max={100} step={1} value={slot.imageFit.x} onChange={(x) => onChange({ imageFit: normalizeImageFit({ ...slot.imageFit, x }) })} />
          <ImageManagerRange label="Y" min={-100} max={100} step={1} value={slot.imageFit.y} onChange={(y) => onChange({ imageFit: normalizeImageFit({ ...slot.imageFit, y }) })} />
          <label className="image-manager-field">
            <span>Fit</span>
            <CustomSelect
              value={slot.imageFit.mode}
              onChange={(mode) => onChange({ imageFit: normalizeImageFit({ ...slot.imageFit, mode }) })}
              options={[
                { value: "contain", label: "Contain" },
                { value: "cover", label: "Cover" },
                { value: "fill", label: "Fill" },
                { value: "custom", label: "Custom" }
              ]}
            />
          </label>
          <button className="character-codex-action-button" onClick={() => onChange({ imageFit: defaultImageFit })}>
            Reset Fit
          </button>
        </div>
      </div>
    </article>
  );
}

function ImageManagerRange({
  label,
  min,
  max,
  step,
  value,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="image-manager-range">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function normalizeSlot(slot: ImageManagerSlot): ImageManagerSlotDraft {
  const imageUrl = resolveImageSourceUrl(slot.imageUrl || "");
  const driveFileId = extractGoogleDriveFileId(imageUrl || slot.webViewLink || "");
  return {
    ...slot,
    imageUrl: driveFileId ? googleDriveThumbnailUrl(driveFileId) : imageUrl,
    webViewLink: slot.webViewLink || (driveFileId ? googleDriveWebViewLink(driveFileId) : ""),
    imageFit: normalizeImageFit(slot.imageFit),
    assetState: slot.assetState === "final" ? "final" : "wip",
    spriteAnimation: normalizeSpriteAnimationSlotReference(slot.spriteAnimation)
  };
}

function ManagedSpriteAnimationPreview({ reference, imageFit }: { reference: SpriteAnimationSlotReference; imageFit?: ImageFitSettings }) {
  const resolved = resolveSpriteAnimationSlot(reference);
  if (!resolved.asset || !resolved.preset || !resolved.reference) {
    return (
      <div className="image-manager-empty-preview">
        <Icon name="Gamepad2" className="h-8 w-8" />
        <span>Sprite animation preset missing</span>
      </div>
    );
  }
  const fitStyle = imageFitToStyle(imageFit);
  return (
    <div className="image-manager-sprite-preview">
      <div
        className="image-manager-sprite-preview-inner"
        style={{ transform: fitStyle.transform, transformOrigin: fitStyle.transformOrigin }}
      >
        <SpriteAnimation
          spriteSheet={resolved.asset}
          preset={resolved.preset}
          autoplay={resolved.reference.playback === "autoplay"}
          playOnHover={resolved.reference.playback === "hover"}
          loopWhileHovering={resolved.reference.loop}
        />
      </div>
      <span>{resolved.reference.playback === "hover" ? "Plays on hover" : "Auto-looping"}</span>
    </div>
  );
}

function driveViewLinkFromImage(imageUrl: string) {
  const driveFileId = extractGoogleDriveFileId(imageUrl || "");
  return driveFileId ? googleDriveWebViewLink(driveFileId) : "";
}





