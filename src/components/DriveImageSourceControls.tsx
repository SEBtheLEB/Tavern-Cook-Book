import { useEffect, useRef, useState } from "react";
import { getDriveSettings } from "../utils/driveSettings";
import {
  googleDriveFolderLink,
  openGoogleDriveFolderPicker,
  openGoogleDriveImagePicker,
  uploadImageToDrive,
  type DriveUploadNameContext,
  type GoogleDriveFolder,
  type GooglePickerFile,
  type UploadedDriveFile
} from "../utils/googlePicker";
import { googleDriveThumbnailUrl, resolveImageSourceUrl } from "../utils/imageFit";
import { isSupportedImage } from "../utils/media";
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
  onChange: (imageUrl: string) => void;
  onPick?: (imageUrl: string, file: GooglePickerFile) => void;
  onUpload?: (imageUrl: string, file: UploadedDriveFile, folder: GoogleDriveFolder, assetState: "wip" | "final") => void;
  onFolderChange?: (folder: GoogleDriveFolder) => void;
  onUploadAssetStateChange?: (assetState: "wip" | "final") => void;
}

export function DriveImageSourceControls({
  value = "",
  label = "Image",
  title,
  className = "",
  compact = false,
  disabled = false,
  defaultFolderId,
  defaultFolderLink,
  defaultFolderName,
  uploadNameContext,
  uploadFileName,
  showUploadState = false,
  uploadAssetState = "wip",
  showManualFallback = true,
  onChange,
  onPick,
  onUpload,
  onFolderChange,
  onUploadAssetStateChange
}: DriveImageSourceControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [manualValue, setManualValue] = useState(value);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedUploadState, setSelectedUploadState] = useState<"wip" | "final">(uploadAssetState);
  const [folder, setFolder] = useState<GoogleDriveFolder>(() => defaultDriveFolder(defaultFolderId, defaultFolderLink, defaultFolderName));

  useEffect(() => {
    setManualValue(value);
  }, [value]);

  useEffect(() => {
    setFolder(defaultDriveFolder(defaultFolderId, defaultFolderLink, defaultFolderName));
  }, [defaultFolderId, defaultFolderLink, defaultFolderName]);

  useEffect(() => {
    setSelectedUploadState(uploadAssetState);
  }, [uploadAssetState]);

  const chooseUploadState = (assetState: "wip" | "final") => {
    setSelectedUploadState(assetState);
    onUploadAssetStateChange?.(assetState);
  };

  const chooseFolder = async () => {
    setBusy(true);
    setMessage("Opening Google Drive folder picker...");
    try {
      const pickedFolder = await openGoogleDriveFolderPicker(`Choose folder for ${label}`);
      if (!pickedFolder) {
        setMessage("");
        return null;
      }
      setFolder(pickedFolder);
      onFolderChange?.(pickedFolder);
      setMessage(`Upload folder set to "${pickedFolder.name}".`);
      return pickedFolder;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not choose a Google Drive folder.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const importFromDrive = async () => {
    setBusy(true);
    setMessage("Opening Google Drive image picker...");
    try {
      const file = await openGoogleDriveImagePicker(title || `Choose ${label}`);
      if (!file) {
        setMessage("");
        return;
      }
      const imageUrl = persistentDriveThumbnail(file.id);
      setManualValue(imageUrl);
      onChange(imageUrl);
      onPick?.(imageUrl, file);
      setMessage(`Imported "${file.name}" from Google Drive.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import from Google Drive.");
    } finally {
      setBusy(false);
    }
  };

  const beginUpload = async () => {
    const uploadFolder = folder.id ? folder : await chooseFolder();
    if (!uploadFolder?.id) return;
    fileInputRef.current?.click();
  };

  const uploadSelectedFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setMessage("Choose a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    const uploadFolder = folder.id ? folder : await chooseFolder();
    if (!uploadFolder?.id) return;

    setBusy(true);
    setMessage(`Uploading "${file.name}" to Google Drive...`);
    try {
      const uploaded = await uploadImageToDrive(file, uploadFolder.id, {
        fileName: typeof uploadFileName === "function" ? uploadFileName(file) : uploadFileName,
        naming: {
          sourceType: "Tavern Cookbook",
          categoryName: uploadTitleToCategory(title),
          slotName: label,
          ...uploadNameContext,
          state: selectedUploadState
        }
      });
      const imageUrl = persistentDriveThumbnail(uploaded.id);
      setManualValue(imageUrl);
      onChange(imageUrl);
      onUpload?.(imageUrl, uploaded, uploadFolder, selectedUploadState);
      setMessage(`Uploaded "${uploaded.name}" to Google Drive.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Drive upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const applyManualLink = () => {
    const imageUrl = resolveImageSourceUrl(manualValue);
    if (!imageUrl) {
      setMessage("Paste an image link first, or choose/import from Google Drive.");
      return;
    }
    setManualValue(imageUrl);
    onChange(imageUrl);
    setMessage("Image link applied.");
  };

  return (
    <div className={`drive-image-source-control ${compact ? "compact" : ""} ${className}`.trim()}>
      {showUploadState && (
        <div className="drive-image-source-state" aria-label="Upload state">
          <span>Upload State</span>
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
        <button type="button" onClick={importFromDrive} disabled={disabled || busy}>
          <Icon name="FolderOpen" className="h-4 w-4" />
          Import From Drive
        </button>
        <button type="button" onClick={beginUpload} disabled={disabled || busy}>
          <Icon name="Upload" className="h-4 w-4" />
          Upload to Drive
        </button>
        <button type="button" onClick={chooseFolder} disabled={disabled || busy}>
          <Icon name="Folder" className="h-4 w-4" />
          Folder
        </button>
      </div>

      <div className="drive-image-source-folder">
        <span>{folder.name || folder.id ? "Upload folder" : "No upload folder selected"}</span>
        {(folder.name || folder.id) && <strong>{folder.name || folder.id}</strong>}
      </div>

      {showManualFallback && (
        <details className="drive-image-manual-fallback">
          <summary>Manual link fallback</summary>
          <div>
            <input
              value={manualValue}
              placeholder="Paste Google Drive image link or image URL"
              onChange={(event) => setManualValue(event.target.value)}
              onBlur={applyManualLink}
            />
            <button type="button" onClick={applyManualLink}>Use Link</button>
          </div>
        </details>
      )}

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          uploadSelectedFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {message && <small className="drive-image-source-message">{message}</small>}
    </div>
  );
}

function defaultDriveFolder(defaultFolderId?: string, defaultFolderLink?: string, defaultFolderName?: string): GoogleDriveFolder {
  const settings = getDriveSettings();
  const folderId = defaultFolderId || settings.defaultTalesFolderId || settings.defaultWorldArtFolderId || settings.defaultCharactersFolderId;
  return {
    id: folderId || "",
    name: defaultFolderName || (folderId ? "Default Drive folder" : ""),
    url: defaultFolderLink || (folderId ? googleDriveFolderLink(folderId) : ""),
    mimeType: "application/vnd.google-apps.folder"
  };
}

function uploadTitleToCategory(title?: string) {
  return (title || "")
    .replace(/^choose\s+/i, "")
    .replace(/^select\s+/i, "")
    .replace(/\s+image$/i, "")
    .trim();
}

function persistentDriveThumbnail(fileId: string) {
  return googleDriveThumbnailUrl(fileId);
}


