import { fetchDriveImageBlobUrl } from "./googlePicker";
import { extractGoogleDriveFileId } from "./imageFit";

type SavePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
};

type SaveFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type SaveFilePicker = (options?: SavePickerOptions) => Promise<SaveFileHandle>;

interface SaveImageSourceOptions {
  url: string;
  fileName: string;
  driveFileId?: string;
  mimeType?: string;
}

export async function saveImageSourceAsFile({
  url,
  fileName,
  driveFileId,
  mimeType = "image/png"
}: SaveImageSourceOptions) {
  const sourceUrl = url.trim();
  if (!sourceUrl) throw new Error("No image has been assigned yet.");

  const resolvedDriveFileId = driveFileId?.trim() || extractGoogleDriveFileId(sourceUrl);
  const safeFileName = ensureDownloadExtension(sanitizeDownloadFileName(fileName || "image"), extensionForMime(mimeType) || "png");
  const picker = nativeSaveFilePicker();
  let fileHandle: SaveFileHandle | null = null;

  if (picker) {
    try {
      fileHandle = await picker(buildPickerOptions(safeFileName, mimeType));
    } catch (error) {
      if (isAbortError(error)) return { mode: "cancelled" as const };
      fileHandle = null;
    }
  }

  try {
    const blob = await fetchImageBlob(sourceUrl, resolvedDriveFileId);
    if (fileHandle) {
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { mode: "picker" as const };
    }
    triggerBrowserDownload(URL.createObjectURL(blob), safeFileName, true);
    return { mode: "download" as const };
  } catch (error) {
    triggerBrowserDownload(driveDownloadUrl(resolvedDriveFileId) || sourceUrl, safeFileName, false);
    return { mode: "download" as const };
  }
}

function nativeSaveFilePicker(): SaveFilePicker | null {
  const maybeWindow = window as Window & { showSaveFilePicker?: SaveFilePicker };
  return typeof maybeWindow.showSaveFilePicker === "function" ? maybeWindow.showSaveFilePicker.bind(window) : null;
}

function buildPickerOptions(fileName: string, mimeType: string): SavePickerOptions {
  const rawExtension = extensionFromFileName(fileName) || extensionForMime(mimeType) || "png";
  const extension = `.${rawExtension}`;
  const acceptMimeType = mimeForExtension(rawExtension) || mimeType || "image/png";
  return {
    suggestedName: fileName,
    types: [
      {
        description: "Image file",
        accept: {
          [acceptMimeType]: [extension]
        }
      }
    ]
  };
}

async function fetchImageBlob(url: string, driveFileId: string) {
  if (driveFileId) {
    try {
      const objectUrl = await fetchDriveImageBlobUrl(driveFileId);
      const blob = await fetchBlob(objectUrl);
      if (isUsableImageBlob(blob)) return blob;
    } catch {
      // Fall through to the visible URL. Public Drive thumbnails and non-Drive
      // image URLs can still be downloaded without an authenticated media fetch.
    }
  }

  const blob = await fetchBlob(url);
  if (!isUsableImageBlob(blob)) throw new Error("The selected file could not be downloaded as an image.");
  return blob;
}

async function fetchBlob(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not download the selected image.");
  return response.blob();
}

function isUsableImageBlob(blob: Blob) {
  const type = blob.type.toLowerCase();
  return !type || type.startsWith("image/") || type === "application/octet-stream";
}

function triggerBrowserDownload(url: string, fileName: string, revokeWhenDone: boolean) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (revokeWhenDone) {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

function sanitizeDownloadFileName(value: string) {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "image";
}

function ensureDownloadExtension(fileName: string, fallbackExtension: string) {
  return extensionFromFileName(fileName) ? fileName : `${fileName}.${fallbackExtension.replace(/^\./, "")}`;
}

function extensionFromFileName(fileName: string) {
  const match = fileName.match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() || "";
}

function extensionForMime(mimeType: string) {
  const type = mimeType.toLowerCase();
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("svg")) return "svg";
  return "png";
}

function mimeForExtension(extension: string) {
  const normalized = extension.replace(/^\./, "").toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "image/jpeg";
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  if (normalized === "gif") return "image/gif";
  if (normalized === "svg") return "image/svg+xml";
  return "";
}

function driveDownloadUrl(fileId: string) {
  return fileId ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}` : "";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
