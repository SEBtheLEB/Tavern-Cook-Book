import { useEffect, useRef, useState } from "react";
import type {
  DriveUploadNameContext,
  GoogleDriveFolder,
  GooglePickerFile,
  UploadedDriveFile
} from "../utils/googlePicker";
import { resolveImageSourceUrl } from "../utils/imageFit";
import { isSupportedImage, readImageFileForStorage } from "../utils/media";
import { Icon } from "./Icon";

interface DriveImageSourceControlsProps {
  value?: string;
  label?: string;
  title?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  defaultFolderId?: string;
  defaultFolderLink?: string;
  defaultFolderName?: string;
  uploadNameContext?: DriveUploadNameContext;
  uploadFileName?: string | ((file: File) => string);
  showUploadState?: boolean;
  uploadAssetState?: "wip" | "final";
  showManualFallback?: boolean;
  resolveUploadFolder?: () => Promise<GoogleDriveFolder | null>;
  onChange: (imageUrl: string) => void;
  onPick?: (imageUrl: string, file: GooglePickerFile) => void;
  onUpload?: (imageUrl: string, file: UploadedDriveFile, folder: GoogleDriveFolder, assetState: "wip" | "final") => void;
  onFolderChange?: (folder: GoogleDriveFolder) => void;
  onUploadAssetStateChange?: (assetState: "wip" | "final") => void;
}

export function DriveImageSourceControls({
  value = "",
  label = "Image",
  className = "",
  compact = false,
  disabled = false,
  showUploadState = false,
  uploadAssetState = "wip",
  showManualFallback = true,
  onChange,
  onUploadAssetStateChange
}: DriveImageSourceControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [manualValue, setManualValue] = useState(value);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedUploadState, setSelectedUploadState] = useState<"wip" | "final">(uploadAssetState);

  useEffect(() => {
    setManualValue(value);
  }, [value]);

  useEffect(() => {
    setSelectedUploadState(uploadAssetState);
  }, [uploadAssetState]);

  const chooseUploadState = (assetState: "wip" | "final") => {
    setSelectedUploadState(assetState);
    onUploadAssetStateChange?.(assetState);
  };

  const applyImageUrl = (imageUrl: string, successMessage: string) => {
    const resolved = resolveImageSourceUrl(imageUrl);
    if (!resolved) {
      setMessage("Paste an image URL first.");
      return;
    }
    setManualValue(resolved);
    onChange(resolved);
    setMessage(successMessage);
  };

  const uploadSelectedFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setMessage("Choose a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    setBusy(true);
    try {
      const imageUrl = await readImageFileForStorage(file);
      setManualValue(imageUrl);
      onChange(imageUrl);
      setMessage(`Saved "${file.name}" in this browser.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare this image for local storage.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`drive-image-source-control ${compact ? "compact" : ""} ${className}`.trim()}>
      {showUploadState && (
        <div className="drive-image-source-state" aria-label="Image state">
          <span>State</span>
          <button
            type="button"
            className={selectedUploadState === "wip" ? "active" : ""}
            onClick={() => chooseUploadState("wip")}
            disabled={disabled || busy}
          >
            WIP
          </button>
          <button
            type="button"
            className={selectedUploadState === "final" ? "active final" : "final"}
            onClick={() => chooseUploadState("final")}
            disabled={disabled || busy}
          >
            FINAL
          </button>
        </div>
      )}

      <div className="drive-image-source-actions">
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled || busy}>
          <Icon name="Upload" className="h-4 w-4" />
          Choose Local Image
        </button>
      </div>

      {showManualFallback && (
        <details className="drive-image-manual-fallback" open={!compact}>
          <summary>Image link</summary>
          <div>
            <input
              value={manualValue}
              placeholder="Paste image URL"
              onChange={(event) => setManualValue(event.target.value)}
              onBlur={() => applyImageUrl(manualValue, "Image link applied.")}
            />
            <button type="button" onClick={() => applyImageUrl(manualValue, "Image link applied.")}>
              Use Link
            </button>
          </div>
        </details>
      )}

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          void uploadSelectedFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {message && <small className="drive-image-source-message">{message}</small>}
    </div>
  );
}
