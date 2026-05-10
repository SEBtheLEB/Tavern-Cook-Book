import type { CharacterArtGalleryItem } from "../types";
import { getDriveSettings, isDriveConfigured, showDriveSetupMessage } from "./driveSettings";

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_PICKER_SCRIPT_ID = "google-api-loader";
const GOOGLE_PICKER_SCRIPT_SRC = "https://apis.google.com/js/api.js";
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const MULTIPART_UPLOAD_LIMIT = 5 * 1024 * 1024;
const MAX_BROWSER_UPLOAD_SIZE = 100 * 1024 * 1024;
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export interface GooglePickerFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  url: string;
  mimeType: string;
}

export interface UploadedDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

export interface MovedDriveFile extends UploadedDriveFile {
  parents?: string[];
  moved: boolean;
  alreadyInFolder: boolean;
}

export interface DriveUploadNameContext {
  subjectName?: string;
  categoryName?: string;
  slotName?: string;
  sourceType?: string;
  purpose?: string;
  state?: string;
}

export interface DriveUploadOptions {
  fileName?: string;
  naming?: DriveUploadNameContext;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GoogleApi {
  accounts?: {
    oauth2?: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        hint?: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }) => GoogleTokenClient;
    };
  };
  picker?: GooglePickerApi;
}

interface GooglePickerApi {
  PickerBuilder: new () => GooglePickerBuilder;
  DocsView?: new (viewId: string) => GoogleDocsView;
  ViewId: Record<string, string>;
  Response: Record<string, string>;
  Action: Record<string, string>;
  Document: Record<string, string>;
  Thumbnail?: Record<string, string>;
}

interface GooglePickerBuilder {
  addView: (viewOrViewId: unknown) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setMaxItems: (max: number) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setSelectableMimeTypes: (types: string) => GooglePickerBuilder;
  setTitle: (title: string) => GooglePickerBuilder;
  setAppId?: (appId: string) => GooglePickerBuilder;
  setOrigin?: (origin: string) => GooglePickerBuilder;
}

interface GoogleDocsView {
  setIncludeFolders?: (enabled: boolean) => GoogleDocsView;
  setMimeTypes?: (types: string) => GoogleDocsView;
  setSelectFolderEnabled?: (enabled: boolean) => GoogleDocsView;
}

interface GooglePickerResponse {
  [key: string]: unknown;
}

interface GoogleApiLoader {
  load: (
    apiName: string,
    options: {
      callback: () => void;
      onerror?: () => void;
      timeout?: number;
      ontimeout?: () => void;
    }
  ) => void;
}

declare global {
  interface Window {
    google?: GoogleApi;
    gapi?: GoogleApiLoader;
  }
}

let accessToken = "";
let accessTokenExpiresAt = 0;
let scriptLoadPromise: Promise<void> | null = null;
let pickerScriptLoadPromise: Promise<void> | null = null;
let pickerLoadPromise: Promise<void> | null = null;

export function loadGoogleApiScripts() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.remove();
    }

    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google scripts failed to load."));
    document.head.appendChild(script);
  });

  scriptLoadPromise = scriptLoadPromise.catch((error) => {
    scriptLoadPromise = null;
    throw error;
  });
  return scriptLoadPromise;
}

export async function authenticateGoogleDrive() {
  const settings = getDriveSettings();
  if (!isDriveConfigured(settings)) {
    throw new Error("Google Drive is not connected yet. Add your API Key and OAuth Client ID in Settings first.");
  }

  if (accessToken && Date.now() < accessTokenExpiresAt - 60_000) {
    return accessToken;
  }

  await loadGoogleApiScripts();
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) {
    throw new Error("Google Identity Services did not load. Check your internet connection and Google settings.");
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = oauth.initTokenClient({
      client_id: settings.googleOAuthClientId.trim(),
      scope: DRIVE_FILE_SCOPE,
      hint: signedInGoogleEmail(),
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error || "Google sign-in did not complete."));
          return;
        }
        if (!response.access_token) {
          reject(new Error("Google did not return an access token."));
          return;
        }
        accessToken = response.access_token;
        accessTokenExpiresAt = Date.now() + (response.expires_in || 3600) * 1000;
        resolve(accessToken);
      },
      error_callback: (error) => {
        reject(new Error(error.message || error.type || "Google sign-in failed."));
      }
    });

    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
}

function signedInGoogleEmail() {
  try {
    const raw = localStorage.getItem("tavernCookbookGoogleAccount");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { email?: unknown };
    return typeof parsed.email === "string" ? parsed.email : "";
  } catch {
    return "";
  }
}

export async function uploadImageToDrive(file: File, folderId: string, options: DriveUploadOptions = {}): Promise<UploadedDriveFile> {
  validateDriveUpload(file, folderId);
  const token = await authenticateGoogleDrive();
  const driveFileName = cleanDriveFileName(options.fileName, file) || buildDriveUploadFileName(file, options.naming);
  const uploadedFile = file.size <= MULTIPART_UPLOAD_LIMIT
    ? await uploadImageWithMultipart(file, folderId, token, driveFileName)
    : await uploadImageWithResumableUpload(file, folderId, token, driveFileName);

  return getDriveFileMetadata(uploadedFile.id, token);
}

export function buildDriveUploadFileName(file: File, naming: DriveUploadNameContext = {}) {
  const extension = uploadExtension(file);
  const fallbackBase = stripFileExtension(file.name) || "UploadedImage";
  const subjectToken = uploadNameToken(naming.subjectName || naming.sourceType || fallbackBase);
  const stateToken = uploadStateToken(naming.state);
  const tokens = dedupeUploadTokens([
    subjectToken,
    uploadNameToken(naming.categoryName),
    uploadNameToken(naming.slotName),
    uploadNameToken(naming.purpose),
    stateToken
  ]);
  return `${tokens.join("_")}${extension}`;
}

export async function getDriveFileMetadata(fileId: string, token = accessToken): Promise<UploadedDriveFile> {
  if (!fileId.trim()) throw new Error("Missing uploaded Drive file ID.");
  if (!token) throw new Error("Not signed in to Google Drive.");

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,thumbnailLink,webViewLink${driveApiKeyParam()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  if (!response.ok) throw await driveError(response, "Could not read uploaded file metadata.");
  return response.json() as Promise<UploadedDriveFile>;
}

export async function moveDriveFileToFolder(fileId: string, targetFolderId: string): Promise<MovedDriveFile> {
  const trimmedFileId = fileId.trim();
  const trimmedFolderId = targetFolderId.trim();
  if (!trimmedFileId) throw new Error("Missing Drive file ID.");
  if (!trimmedFolderId) throw new Error("Choose a destination Drive folder first.");

  const token = await authenticateGoogleDrive();
  const metadataResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(trimmedFileId)}?fields=id,name,mimeType,thumbnailLink,webViewLink,parents&supportsAllDrives=true${driveApiKeyParam()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  if (!metadataResponse.ok) throw await driveError(metadataResponse, "Could not read Drive file location.");

  const metadata = await metadataResponse.json() as UploadedDriveFile & { parents?: string[] };
  const parents = Array.isArray(metadata.parents) ? metadata.parents.filter(Boolean) : [];
  if (parents.includes(trimmedFolderId)) {
    return { ...metadata, parents, moved: false, alreadyInFolder: true };
  }

  const params = new URLSearchParams({
    addParents: trimmedFolderId,
    fields: "id,name,mimeType,thumbnailLink,webViewLink,parents",
    supportsAllDrives: "true"
  });
  if (parents.length) params.set("removeParents", parents.join(","));

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(trimmedFileId)}?${params.toString()}${driveApiKeyParam()}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({})
    }
  );
  if (!response.ok) throw await driveError(response, "Could not move Drive file into the selected folder.");
  const moved = await response.json() as UploadedDriveFile & { parents?: string[] };
  return { ...moved, moved: true, alreadyInFolder: false };
}

export function addUploadedDriveImageToCharacter(
  characterId: string,
  uploadedFile: UploadedDriveFile,
  category: string,
  notes: string,
  addToCharacterGallery?: (item: CharacterArtGalleryItem) => void,
  driveFolder?: { id?: string; link?: string; name?: string }
): CharacterArtGalleryItem {
  const item = {
    id: `drive-upload-${characterId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: uploadedFile.name,
    category: category || "Concept Art",
    driveFileId: uploadedFile.id,
    thumbnailUrl: stableDriveThumbnailUrl(uploadedFile.id),
    webViewLink: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
    dateAdded: new Date().toISOString(),
    isFeatured: false,
    notes,
    uploadStatus: "uploaded-to-drive",
    driveFolderId: driveFolder?.id || "",
    driveFolderLink: driveFolder?.link || "",
    driveFolderName: driveFolder?.name || ""
  };
  addToCharacterGallery?.(item);
  return item;
}

export async function loadGooglePickerScript() {
  if (window.google?.picker) return;

  if (!pickerScriptLoadPromise) {
    pickerScriptLoadPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(GOOGLE_PICKER_SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        if (window.gapi) {
          resolve();
          return;
        }
        existing.remove();
      }

      const script = document.createElement("script");
      script.id = GOOGLE_PICKER_SCRIPT_ID;
      script.src = GOOGLE_PICKER_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google Picker script failed to load."));
      document.head.appendChild(script);
    }).catch((error) => {
      pickerScriptLoadPromise = null;
      throw error;
    });
  }

  await pickerScriptLoadPromise;
  if (window.google?.picker) return;
  if (!window.gapi?.load) throw new Error("Google Picker loader is not available.");

  if (!pickerLoadPromise) {
    pickerLoadPromise = new Promise<void>((resolve, reject) => {
      window.gapi?.load("picker", {
        callback: () => resolve(),
        onerror: () => reject(new Error("Google Picker failed to load.")),
        timeout: 10000,
        ontimeout: () => reject(new Error("Google Picker took too long to load."))
      });
    }).catch((error) => {
      pickerLoadPromise = null;
      throw error;
    });
  }

  await pickerLoadPromise;
  if (!window.google?.picker) throw new Error("Google Picker failed to initialize.");
}

export async function openGooglePickerForCharacter(characterId: string): Promise<GooglePickerFile | null> {
  void characterId;
  return openGoogleDriveImagePicker("Select Character Art");
}

export async function openGoogleDriveImagePicker(title = "Select Image From Google Drive"): Promise<GooglePickerFile | null> {
  if (!isDriveConfigured()) {
    showDriveSetupMessage();
    return null;
  }

  const settings = getDriveSettings();
  const token = await authenticateGoogleDrive();
  await loadGooglePickerScript();
  const pickerApi = window.google?.picker;
  if (!pickerApi) throw new Error("Google Picker is not available.");

  return new Promise<GooglePickerFile | null>((resolve, reject) => {
    try {
      const actionKey = pickerApi.Response.ACTION || "action";
      const documentsKey = pickerApi.Response.DOCUMENTS || "docs";
      const pickedAction = pickerApi.Action.PICKED || "picked";
      const cancelAction = pickerApi.Action.CANCEL || "cancel";
      const imageMimeTypes = IMAGE_MIME_TYPES.join(",");
      const docsView = createImagePickerView(pickerApi, imageMimeTypes);
      let builder = new pickerApi.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(token)
        .setDeveloperKey(settings.googleApiKey.trim())
        .setSelectableMimeTypes(imageMimeTypes)
        .setMaxItems(1)
        .setTitle(title);

      const appId = googleAppIdFromOAuthClientId(settings.googleOAuthClientId);
      if (appId && builder.setAppId) builder = builder.setAppId(appId);
      if (builder.setOrigin) builder = builder.setOrigin(window.location.origin);

      const picker = builder
        .setCallback((data) => {
          const action = String(data[actionKey] || "");
          if (action === cancelAction) {
            resolve(null);
            return;
          }
          if (action !== pickedAction) return;

          const documents = data[documentsKey];
          if (!Array.isArray(documents) || !documents.length) {
            reject(new Error("No Drive image was selected."));
            return;
          }

          resolve(pickerDocumentToFile(documents[0], pickerApi));
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Google Picker could not be opened."));
    }
  });
}

export async function openGoogleDriveFolderPicker(title = "Select Upload Folder"): Promise<GoogleDriveFolder | null> {
  if (!isDriveConfigured()) {
    showDriveSetupMessage();
    return null;
  }

  const settings = getDriveSettings();
  const token = await authenticateGoogleDrive();
  await loadGooglePickerScript();
  const pickerApi = window.google?.picker;
  if (!pickerApi) throw new Error("Google Picker is not available.");

  return new Promise<GoogleDriveFolder | null>((resolve, reject) => {
    try {
      const actionKey = pickerApi.Response.ACTION || "action";
      const documentsKey = pickerApi.Response.DOCUMENTS || "docs";
      const pickedAction = pickerApi.Action.PICKED || "picked";
      const cancelAction = pickerApi.Action.CANCEL || "cancel";
      const folderView = createFolderPickerView(pickerApi);
      let builder = new pickerApi.PickerBuilder()
        .addView(folderView)
        .setOAuthToken(token)
        .setDeveloperKey(settings.googleApiKey.trim())
        .setSelectableMimeTypes(GOOGLE_DRIVE_FOLDER_MIME_TYPE)
        .setMaxItems(1)
        .setTitle(title);

      const appId = googleAppIdFromOAuthClientId(settings.googleOAuthClientId);
      if (appId && builder.setAppId) builder = builder.setAppId(appId);
      if (builder.setOrigin) builder = builder.setOrigin(window.location.origin);

      const picker = builder
        .setCallback((data) => {
          const action = String(data[actionKey] || "");
          if (action === cancelAction) {
            resolve(null);
            return;
          }
          if (action !== pickedAction) return;

          const documents = data[documentsKey];
          if (!Array.isArray(documents) || !documents.length) {
            reject(new Error("No Drive folder was selected."));
            return;
          }

          resolve(pickerDocumentToFolder(documents[0], pickerApi));
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Google Drive folder picker could not be opened."));
    }
  });
}

export function handlePickedDriveFile(
  file: GooglePickerFile,
  characterId: string,
  addToCharacterGallery?: (item: CharacterArtGalleryItem) => void
): CharacterArtGalleryItem {
  const item = {
    id: `drive-${characterId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: file.name || "Imported Drive Image",
    category: "Imported From Drive",
    driveFileId: file.id,
    thumbnailUrl: stableDriveThumbnailUrl(file.id),
    webViewLink: file.url || `https://drive.google.com/file/d/${file.id}/view`,
    dateAdded: new Date().toISOString(),
    isFeatured: false,
    notes: "",
    uploadStatus: "imported-from-drive"
  };
  addToCharacterGallery?.(item);
  return item;
}

function createImagePickerView(pickerApi: GooglePickerApi, imageMimeTypes: string) {
  const driveDocsViewId = pickerApi.ViewId.DOCS || "docs";
  if (!pickerApi.DocsView) return driveDocsViewId;

  const view = new pickerApi.DocsView(driveDocsViewId);
  view.setIncludeFolders?.(false);
  view.setSelectFolderEnabled?.(false);
  view.setMimeTypes?.(imageMimeTypes);
  return view;
}

function stableDriveThumbnailUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
}

function createFolderPickerView(pickerApi: GooglePickerApi) {
  const folderViewId = pickerApi.ViewId.FOLDERS || pickerApi.ViewId.DOCS || "folders";
  if (!pickerApi.DocsView) return folderViewId;

  const view = new pickerApi.DocsView(folderViewId);
  view.setIncludeFolders?.(true);
  view.setSelectFolderEnabled?.(true);
  view.setMimeTypes?.(GOOGLE_DRIVE_FOLDER_MIME_TYPE);
  return view;
}

function pickerDocumentToFile(document: unknown, pickerApi: GooglePickerApi): GooglePickerFile {
  if (!document || typeof document !== "object") {
    throw new Error("Google Picker returned an unreadable file.");
  }

  const picked = document as Record<string, unknown>;
  const idKey = pickerApi.Document.ID || "id";
  const nameKey = pickerApi.Document.NAME || "name";
  const mimeTypeKey = pickerApi.Document.MIME_TYPE || "mimeType";
  const urlKey = pickerApi.Document.URL || "url";
  const thumbnailsKey = pickerApi.Document.THUMBNAILS || "thumbnails";
  const thumbnailUrlKey = pickerApi.Thumbnail?.URL || "url";
  const id = String(picked[idKey] || picked.id || "");
  if (!id) throw new Error("Google Picker did not return a Drive file ID.");

  const thumbnailUrl = Array.isArray(picked[thumbnailsKey])
    ? (picked[thumbnailsKey] as Array<Record<string, unknown>>)
        .map((thumbnail) => String(thumbnail[thumbnailUrlKey] || thumbnail.url || ""))
        .find(Boolean)
    : "";

  return {
    id,
    name: String(picked[nameKey] || picked.name || "Imported Drive Image"),
    mimeType: String(picked[mimeTypeKey] || picked.mimeType || ""),
    url: String(picked[urlKey] || picked.url || `https://drive.google.com/file/d/${id}/view`),
    thumbnailUrl
  };
}

function pickerDocumentToFolder(document: unknown, pickerApi: GooglePickerApi): GoogleDriveFolder {
  if (!document || typeof document !== "object") {
    throw new Error("Google Picker returned an unreadable folder.");
  }

  const picked = document as Record<string, unknown>;
  const idKey = pickerApi.Document.ID || "id";
  const nameKey = pickerApi.Document.NAME || "name";
  const mimeTypeKey = pickerApi.Document.MIME_TYPE || "mimeType";
  const urlKey = pickerApi.Document.URL || "url";
  const id = String(picked[idKey] || picked.id || "");
  if (!id) throw new Error("Google Picker did not return a Drive folder ID.");

  return {
    id,
    name: String(picked[nameKey] || picked.name || "Selected Drive Folder"),
    mimeType: String(picked[mimeTypeKey] || picked.mimeType || GOOGLE_DRIVE_FOLDER_MIME_TYPE),
    url: String(picked[urlKey] || picked.url || googleDriveFolderLink(id))
  };
}

export function googleDriveFolderLink(folderId: string) {
  return folderId.trim() ? `https://drive.google.com/drive/folders/${encodeURIComponent(folderId.trim())}` : "";
}

function googleAppIdFromOAuthClientId(clientId: string) {
  const projectNumber = clientId.trim().match(/^(\d+)-/)?.[1];
  return projectNumber || "";
}

function validateDriveUpload(file: File, folderId: string) {
  if (!folderId.trim()) throw new Error("Set a Drive folder for this character before uploading art.");
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
    throw new Error("Choose a JPG, JPEG, PNG, WEBP, or GIF image.");
  }
  if (file.size > MAX_BROWSER_UPLOAD_SIZE) {
    throw new Error("That image is too large for this browser upload. Try an image under 100 MB.");
  }
}

async function uploadImageWithMultipart(file: File, folderId: string, token: string, driveFileName: string) {
  const boundary = `tavern_cookbook_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadata = {
    name: driveFileName,
    mimeType: file.type,
    parents: [folderId]
  };
  const body = new Blob([
    `--${boundary}\r\n`,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    JSON.stringify(metadata),
    "\r\n",
    `--${boundary}\r\n`,
    `Content-Type: ${file.type}\r\n\r\n`,
    file,
    "\r\n",
    `--${boundary}--`
  ], { type: `multipart/related; boundary=${boundary}` });

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webViewLink${driveApiKeyParam()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    }
  );
  if (!response.ok) throw await driveError(response, "Google Drive upload failed.");
  return response.json() as Promise<UploadedDriveFile>;
}

async function uploadImageWithResumableUpload(file: File, folderId: string, token: string, driveFileName: string) {
  const metadata = {
    name: driveFileName,
    mimeType: file.type,
    parents: [folderId]
  };

  const startResponse = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,thumbnailLink,webViewLink${driveApiKeyParam()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type,
        "X-Upload-Content-Length": String(file.size)
      },
      body: JSON.stringify(metadata)
    }
  );
  if (!startResponse.ok) throw await driveError(startResponse, "Could not start Google Drive upload.");

  const uploadUrl = startResponse.headers.get("Location");
  if (!uploadUrl) throw new Error("Google Drive did not return an upload URL.");

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });
  if (!uploadResponse.ok) throw await driveError(uploadResponse, "Google Drive upload failed.");
  return uploadResponse.json() as Promise<UploadedDriveFile>;
}

function driveApiKeyParam() {
  const key = getDriveSettings().googleApiKey.trim();
  return key ? `&key=${encodeURIComponent(key)}` : "";
}

function cleanDriveFileName(fileName: string | undefined, file: File) {
  if (!fileName?.trim()) return "";
  const withoutExtension = stripFileExtension(fileName);
  const token = uploadNameToken(withoutExtension);
  return token ? `${token}${uploadExtension(file)}` : "";
}

function uploadExtension(file: File) {
  const fromName = file.name.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  return "";
}

function stripFileExtension(name: string) {
  return String(name || "").replace(/\.[a-z0-9]+$/i, "").trim();
}

function uploadNameToken(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " And ");
  const parts = normalized.match(/[a-z0-9]+/gi) || [];
  return singularizeUploadNameParts(parts)
    .map((part) => {
      const upper = part.toUpperCase();
      if (upper.length <= 4 && part === upper) return upper;
      if (upper === "WIP" || upper === "UI" || upper === "NPC") return upper;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function singularizeUploadNameParts(parts: string[]) {
  if (!parts.length) return parts;
  const next = [...parts];
  const lastIndex = next.length - 1;
  next[lastIndex] = singularizeUploadNamePart(next[lastIndex]);
  return next;
}

function singularizeUploadNamePart(part: string) {
  const lower = part.toLowerCase();
  const irregular: Record<string, string> = {
    categories: "Category",
    entries: "Entry",
    faeries: "Faery",
    galleries: "Gallery",
    sprites: "Sprite"
  };
  if (irregular[lower]) return preserveUploadPartCase(part, irregular[lower]);
  if (lower.endsWith("ies") && part.length > 3) {
    return preserveUploadPartCase(part, `${part.slice(0, -3)}y`);
  }
  if (lower.endsWith("sses") || lower.endsWith("shes") || lower.endsWith("ches") || lower.endsWith("xes")) {
    return preserveUploadPartCase(part, part.slice(0, -2));
  }
  if (
    lower.endsWith("s") &&
    part.length > 3 &&
    !lower.endsWith("ss") &&
    !lower.endsWith("us") &&
    !lower.endsWith("is")
  ) {
    return preserveUploadPartCase(part, part.slice(0, -1));
  }
  return part;
}

function preserveUploadPartCase(original: string, singular: string) {
  return original === original.toUpperCase() ? singular.toUpperCase() : singular;
}

function uploadStateToken(state: unknown) {
  const raw = String(state || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "final" || raw === "approved") return "FINAL";
  if (raw === "wip" || raw === "draft" || raw === "sketch") return "WIP";
  if (raw === "needs-revision" || raw === "needs revision") return "NeedsRevision";
  return uploadNameToken(raw);
}

function dedupeUploadTokens(tokens: string[]) {
  const next: string[] = [];
  tokens.forEach((token) => {
    if (!token) return;
    if (next[next.length - 1]?.toLowerCase() === token.toLowerCase()) return;
    next.push(token);
  });
  return next.length ? next : ["UploadedImage"];
}

async function driveError(response: Response, fallback: string) {
  let message = fallback;
  try {
    const payload = await response.json();
    message = payload?.error?.message || message;
  } catch {
    message = response.statusText || message;
  }

  if (response.status === 401) return new Error(`Google sign-in expired or was rejected. ${message}`);
  if (response.status === 403) return new Error(`Google Drive permission denied. ${message}`);
  if (response.status === 400) return new Error(`Google Drive rejected the request. Check your API key, OAuth Client ID, and folder ID. ${message}`);
  if (response.status === 413) return new Error(`The selected file is too large. ${message}`);
  return new Error(message);
}
