import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ImageFitSettings } from "../types";
import { defaultImageFit, imageFitToStyle, normalizeImageFit, resolveImageSourceUrl } from "../utils/imageFit";
import { isSupportedImage, readImageFileForStorage } from "../utils/media";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { Icon } from "./Icon";
import { InteractiveImageFitFrame } from "./InteractiveImageFitFrame";

interface ImageAdjustModalProps {
  title?: string;
  slotLabel: string;
  imageUrl: string;
  imageFit?: ImageFitSettings;
  aspectRatio?: string;
  previewFrame?: { width: number; height: number };
  onSave: (next: { imageUrl: string; imageFit: ImageFitSettings }) => void;
  onCancel: () => void;
  driveFolderId?: string;
  driveFolderLink?: string;
  driveFolderName?: string;
  showUploadState?: boolean;
  uploadAssetState?: "wip" | "final";
  onUploadToDrive?: (file: File, folderId?: string, slotLabel?: string, assetState?: "wip" | "final") => Promise<string>;
  onImportFromDrive?: () => Promise<string>;
}

export function ImageAdjustModal({
  title = "Adjust Image",
  slotLabel,
  imageUrl,
  imageFit,
  aspectRatio = "4 / 3",
  previewFrame,
  onSave,
  onCancel
}: ImageAdjustModalProps) {
  const portalTarget = document.querySelector(".app-shell") || document.body;
  const [draftUrl, setDraftUrl] = useState(imageUrl);
  const [imageLink, setImageLink] = useState("");
  const [draftFit, setDraftFit] = useState<ImageFitSettings>(() => normalizeImageFit(imageFit));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateFit = (patch: Partial<ImageFitSettings>) => {
    setDraftFit((current) => normalizeImageFit({ ...current, ...patch }));
  };

  const measuredFrame =
    previewFrame && previewFrame.width > 0 && previewFrame.height > 0
      ? previewFrame
      : null;
  const previewStyle = measuredFrame
    ? {
        width: `${Math.round(measuredFrame.width)}px`,
        height: `${Math.round(measuredFrame.height)}px`,
        minWidth: `${Math.round(measuredFrame.width)}px`,
        minHeight: `${Math.round(measuredFrame.height)}px`,
        maxWidth: "none",
        maxHeight: "none",
        flex: "0 0 auto",
        aspectRatio: `${measuredFrame.width} / ${measuredFrame.height}`
      }
    : { aspectRatio };

  const useImageLink = () => {
    const resolved = resolveImageSourceUrl(imageLink);
    if (!resolved) {
      setMessage("Paste an image URL first.");
      return;
    }
    setDraftUrl(resolved);
    setMessage("Preview updated. Click Save Image Fit to apply it.");
  };

  const useLocalFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setMessage("Choose a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    setBusy(true);
    try {
      const nextUrl = await readImageFileForStorage(file);
      setDraftUrl(nextUrl);
      setMessage(`Saved "${file.name}" in this browser. Click Save Image Fit to apply it.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare this image.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="image-adjust-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <section className="image-adjust-modal">
        <header>
          <div>
            <p>{slotLabel}</p>
            <h2 className="font-display">{title}</h2>
          </div>
          <button className="character-codex-icon-button" onClick={onCancel} title="Close">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="image-adjust-body">
          <div className="image-adjust-preview-panel">
            <span>Slot Preview</span>
            <InteractiveImageFitFrame
              className="image-adjust-preview-frame"
              style={previewStyle}
              imageFit={draftFit}
              disabled={!draftUrl}
              onChange={setDraftFit}
            >
              {draftUrl ? (
                <DriveAwareImage src={draftUrl} alt="" draggable={false} style={imageFitToStyle(draftFit)} />
              ) : (
                <div className="image-adjust-empty-preview">
                  <Icon name="Image" className="h-8 w-8" />
                  <small>No image selected</small>
                </div>
              )}
            </InteractiveImageFitFrame>
          </div>

          <div className="image-adjust-controls">
            <label className="image-adjust-field">
              <span>Fit Mode</span>
              <CustomSelect
                value={draftFit.mode}
                onChange={(value) => updateFit({ mode: value as ImageFitSettings["mode"] })}
                options={[
                  { value: "contain", label: "Contain" },
                  { value: "cover", label: "Cover" },
                  { value: "fill", label: "Fill" },
                  { value: "custom", label: "Custom" }
                ]}
              />
            </label>

            <div className="image-adjust-source-box">
              <strong>Replace Image</strong>
              <label className="image-adjust-field">
                <span>Image Link</span>
                <input value={imageLink} placeholder="Paste image URL..." onChange={(event) => setImageLink(event.target.value)} />
              </label>
              <div className="image-adjust-source-actions">
                <button className="character-codex-action-button" onClick={useImageLink}>Use Link</button>
                <button className="character-codex-action-button" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                  <Icon name="ImagePlus" className="h-4 w-4" />
                  Choose Local Image
                </button>
              </div>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => {
                  void useLocalFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </div>

            {message && <p className="image-adjust-message">{message}</p>}
          </div>
        </div>

        <footer>
          <button className="character-codex-action-button" onClick={() => setDraftFit(defaultImageFit)}>Reset Fit</button>
          <button className="character-codex-action-button character-codex-danger-button" onClick={() => { setDraftUrl(""); setDraftFit(defaultImageFit); setMessage("Image cleared. Click Save Image Fit to apply it."); }}>
            Clear Image
          </button>
          <button className="character-codex-action-button" onClick={onCancel}>Cancel</button>
          <button className="button-frame character-codex-action-button" onClick={() => onSave({ imageUrl: draftUrl, imageFit: normalizeImageFit(draftFit) })}>
            Save Image Fit
          </button>
        </footer>
      </section>
    </div>,
    portalTarget
  );
}
