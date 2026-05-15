import type { CharacterArtGalleryItem } from "../types";
import { getDriveSettings, isDriveConfigured, isUsableGoogleApiKey, showDriveSetupMessage } from "./driveSettings";

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_PICKER_SCRIPT_ID = "google-api-loader";
const GOOGLE_PICKER_SCRIPT_SRC = "https://apis.google.com/js/api.js";
const DRIVE_FULL_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_SCOPES = DRIVE_FULL_SCOPE;
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

export interface DriveFolderRenameResult {
  checkedCount: number;
  renamedCount: number;
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
  scope?: string;
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

type DriveBrowserMode = "image" | "folder";

interface DriveBrowserItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
}

interface DriveBrowserListResponse {
  files?: DriveBrowserItem[];
  nextPageToken?: string;
}

declare global {
  interface Window {
    google?: GoogleApi;
    gapi?: GoogleApiLoader;
  }
}

let accessToken = "";
let accessTokenExpiresAt = 0;
let accessTokenScopes = "";
let scriptLoadPromise: Promise<void> | null = null;
let pickerScriptLoadPromise: Promise<void> | null = null;
let pickerLoadPromise: Promise<void> | null = null;
const driveImageBlobUrlCache = new Map<string, string>();

export const GOOGLE_DRIVE_AUTH_EVENT = "tavern-google-drive-authenticated";

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

export async function authenticateGoogleDrive(options: { forceConsent?: boolean } = {}) {
  const settings = getDriveSettings();
  if (!isDriveConfigured(settings)) {
    throw new Error("Google Drive is not connected yet. Add your API Key and OAuth Client ID in Settings first.");
  }

  if (!options.forceConsent && accessToken && hasRequiredDriveScopes(accessTokenScopes) && Date.now() < accessTokenExpiresAt - 60_000) {
    return accessToken;
  }

  await loadGoogleApiScripts();
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) {
    throw new Error("Google Identity Services did not load. Check your internet connection and Google settings.");
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Google sign-in did not respond. If a Google approval popup opened, finish it and try again."));
    }, 60_000);
    const resolveToken = (token: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(token);
    };
    const rejectToken = (error: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(error);
    };
    const tokenClient = oauth.initTokenClient({
      client_id: settings.googleOAuthClientId.trim(),
      scope: DRIVE_SCOPES,
      hint: signedInGoogleEmail(),
      callback: (response) => {
        if (response.error) {
          rejectToken(new Error(response.error_description || response.error || "Google sign-in did not complete."));
          return;
        }
        if (!response.access_token) {
          rejectToken(new Error("Google did not return an access token."));
          return;
        }
        accessToken = response.access_token;
        accessTokenScopes = response.scope || DRIVE_SCOPES;
        accessTokenExpiresAt = Date.now() + (response.expires_in || 3600) * 1000;
        notifyGoogleDriveAuthenticated();
        resolveToken(accessToken);
      },
      error_callback: (error) => {
        rejectToken(new Error(error.message || error.type || "Google sign-in failed."));
      }
    });

    tokenClient.requestAccessToken({
      prompt: options.forceConsent || !accessToken || !hasRequiredDriveScopes(accessTokenScopes) ? "consent" : ""
    });
  });
}

export function getActiveDriveAccessToken() {
  return accessToken && hasRequiredDriveScopes(accessTokenScopes) && Date.now() < accessTokenExpiresAt - 60_000
    ? accessToken
    : "";
}

export async function fetchDriveImageBlobUrl(fileId: string, options: { signal?: AbortSignal } = {}) {
  const trimmedFileId = fileId.trim();
  if (!trimmedFileId) throw new Error("Missing Drive image file ID.");

  const cachedUrl = driveImageBlobUrlCache.get(trimmedFileId);
  if (cachedUrl) return cachedUrl;

  const token = getActiveDriveAccessToken();
  if (!token) throw new Error("Sign in to Google Drive before previewing private Drive images.");

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(trimmedFileId)}?alt=media${driveApiKeyParam()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: options.signal
    }
  );
  if (!response.ok) {
    driveImageBlobUrlCache.delete(trimmedFileId);
    throw await driveError(response, "Could not load the Google Drive image preview.");
  }

  const blob = await response.blob();
  if (blob.type && !blob.type.toLowerCase().startsWith("image/") && blob.type.toLowerCase() !== "application/octet-stream") {
    throw new Error("Google Drive returned a file that is not an image.");
  }

  const objectUrl = URL.createObjectURL(blob);
  driveImageBlobUrlCache.set(trimmedFileId, objectUrl);
  return objectUrl;
}

export function clearDriveImageBlobUrlCache(fileId?: string) {
  if (fileId?.trim()) {
    const key = fileId.trim();
    const cachedUrl = driveImageBlobUrlCache.get(key);
    if (cachedUrl) URL.revokeObjectURL(cachedUrl);
    driveImageBlobUrlCache.delete(key);
    return;
  }

  driveImageBlobUrlCache.forEach((cachedUrl) => URL.revokeObjectURL(cachedUrl));
  driveImageBlobUrlCache.clear();
}

function hasRequiredDriveScopes(scopes: string) {
  const granted = new Set(scopes.split(/\s+/).filter(Boolean));
  return granted.has(DRIVE_FULL_SCOPE);
}

function notifyGoogleDriveAuthenticated() {
  window.dispatchEvent(new CustomEvent(GOOGLE_DRIVE_AUTH_EVENT));
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

export async function renameGoogleDriveItem(itemId: string, name: string): Promise<UploadedDriveFile> {
  const trimmedItemId = itemId.trim();
  const nextName = cleanDriveItemName(name);
  if (!trimmedItemId) throw new Error("Missing Drive item ID.");
  if (!nextName) throw new Error("Missing Drive item name.");

  const token = await authenticateGoogleDrive();
  const response = await fetchDriveWithTimeout(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(trimmedItemId)}?fields=id,name,mimeType,thumbnailLink,webViewLink&supportsAllDrives=true${driveApiKeyParam()}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({ name: nextName })
    },
    "Google Drive took too long while renaming the item."
  );
  if (!response.ok) throw await driveError(response, "Could not rename the Google Drive item.");
  return response.json() as Promise<UploadedDriveFile>;
}

export async function renameGoogleDriveFilesInFolderBySegment(
  folderId: string,
  oldSegment: string,
  newSegment: string
): Promise<DriveFolderRenameResult> {
  const trimmedFolderId = folderId.trim();
  if (!trimmedFolderId) throw new Error("Missing Drive folder ID.");

  const replacements = driveFileNameReplacements(oldSegment, newSegment);
  if (!replacements.length) return { checkedCount: 0, renamedCount: 0 };

  const token = await authenticateGoogleDrive();
  const files = await listGoogleDriveFilesInFolder(trimmedFolderId, token);
  let renamedCount = 0;

  for (const file of files) {
    let nextName = file.name || "";
    for (const replacement of replacements) {
      nextName = replaceAllExact(nextName, replacement.from, replacement.to);
    }
    if (!nextName || nextName === file.name) continue;
    await renameGoogleDriveItem(file.id, nextName);
    renamedCount += 1;
  }

  return { checkedCount: files.length, renamedCount };
}

export async function getOrCreateGoogleDriveFolder(name: string, parentFolderId: string, token = ""): Promise<GoogleDriveFolder> {
  const trimmedName = cleanDriveFolderName(name);
  const trimmedParentId = parentFolderId.trim();
  if (!trimmedName) throw new Error("Missing Google Drive folder name.");
  if (!trimmedParentId) throw new Error("Choose a parent Google Drive folder first.");

  const activeToken = token || await authenticateGoogleDrive();
  const existing = await findGoogleDriveFolder(trimmedName, trimmedParentId, activeToken);
  return existing || createGoogleDriveFolder(trimmedName, trimmedParentId, activeToken);
}

export async function getOrCreateGoogleDriveFolderPath(parentFolderId: string, folderNames: string[]): Promise<GoogleDriveFolder> {
  const cleanNames = folderNames.map(cleanDriveFolderName).filter(Boolean);
  if (!cleanNames.length) throw new Error("Missing Google Drive folder path.");

  const token = await authenticateGoogleDrive();
  let parentId = parentFolderId.trim();
  let currentFolder: GoogleDriveFolder | null = null;
  for (const folderName of cleanNames) {
    currentFolder = await getOrCreateGoogleDriveFolder(folderName, parentId, token);
    parentId = currentFolder.id;
  }

  if (!currentFolder) throw new Error("Could not prepare the Google Drive folder.");
  return currentFolder;
}

async function findGoogleDriveFolder(name: string, parentFolderId: string, token: string): Promise<GoogleDriveFolder | null> {
  const params = new URLSearchParams({
    corpora: "allDrives",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
    spaces: "drive",
    pageSize: "1",
    fields: "files(id,name,mimeType,webViewLink)"
  });
  params.set("q", [
    "trashed=false",
    `mimeType = '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`,
    `'${driveQueryValue(parentFolderId)}' in parents`,
    `name = '${driveQueryValue(name)}'`
  ].join(" and "));

  const response = await fetchDriveWithTimeout(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}${driveApiKeyParam()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    "Google Drive took too long while checking folders."
  );
  if (!response.ok) throw await driveError(response, "Could not check Google Drive folders.");
  const payload = await response.json() as { files?: DriveBrowserItem[] };
  const folder = Array.isArray(payload.files) ? payload.files.find((item) => item?.id) : null;
  return folder ? driveBrowserItemToSelection("folder", folder) as GoogleDriveFolder : null;
}

async function createGoogleDriveFolder(name: string, parentFolderId: string, token: string): Promise<GoogleDriveFolder> {
  const response = await fetchDriveWithTimeout(
    `https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink&supportsAllDrives=true${driveApiKeyParam()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({
        name,
        mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
        parents: [parentFolderId]
      })
    },
    "Google Drive took too long while creating the folder."
  );
  if (!response.ok) throw await driveError(response, "Could not create the Google Drive folder.");
  const folder = await response.json() as DriveBrowserItem;
  return {
    id: folder.id,
    name: folder.name || name,
    mimeType: folder.mimeType || GOOGLE_DRIVE_FOLDER_MIME_TYPE,
    url: folder.webViewLink || googleDriveFolderLink(folder.id)
  };
}

async function listGoogleDriveFilesInFolder(folderId: string, token: string): Promise<DriveBrowserItem[]> {
  const files: DriveBrowserItem[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      corpora: "allDrives",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
      spaces: "drive",
      pageSize: "100",
      fields: "nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink)"
    });
    params.set("q", [
      "trashed=false",
      `mimeType != '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`,
      `'${driveQueryValue(folderId)}' in parents`
    ].join(" and "));
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetchDriveWithTimeout(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}${driveApiKeyParam()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      "Google Drive took too long while checking uploaded files."
    );
    if (!response.ok) throw await driveError(response, "Could not check files in the Google Drive folder.");
    const payload = await response.json() as DriveBrowserListResponse;
    files.push(...(Array.isArray(payload.files) ? payload.files.filter((item) => item?.id) : []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return files;
}

async function fetchDriveWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMessage: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal || controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Could not reach Google Drive from this browser. Check your internet connection, browser privacy/ad-block settings, and Settings > Google Drive Integration. If the API key field contains pasted text instead of a real key, clear it and save settings."
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function moveGoogleDriveItemToFolder(itemId: string, targetFolderId: string): Promise<MovedDriveFile> {
  const trimmedFileId = itemId.trim();
  const trimmedFolderId = targetFolderId.trim();
  if (!trimmedFileId) throw new Error("Missing Drive item ID.");
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
  if (!metadataResponse.ok) throw await driveError(metadataResponse, "Could not read Drive item location.");

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
  if (!response.ok) throw await driveError(response, "Could not move Drive item into the selected folder.");
  const moved = await response.json() as UploadedDriveFile & { parents?: string[] };
  return { ...moved, moved: true, alreadyInFolder: false };
}

export async function moveDriveFileToFolder(fileId: string, targetFolderId: string): Promise<MovedDriveFile> {
  return moveGoogleDriveItemToFolder(fileId, targetFolderId);
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

  const token = await authenticateGoogleDrive();
  return openGoogleDriveBrowser("image", title, token) as Promise<GooglePickerFile | null>;
}

export async function openGoogleDriveFolderPicker(title = "Select Upload Folder"): Promise<GoogleDriveFolder | null> {
  if (!isDriveConfigured()) {
    showDriveSetupMessage();
    return null;
  }

  const token = await authenticateGoogleDrive();
  return openGoogleDriveBrowser("folder", title, token) as Promise<GoogleDriveFolder | null>;
}

function openGoogleDriveBrowser(
  mode: DriveBrowserMode,
  title: string,
  token: string
): Promise<GooglePickerFile | GoogleDriveFolder | null> {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement("div");
    overlay.className = "drive-browser-overlay";
    overlay.setAttribute("role", "presentation");

    const modal = document.createElement("section");
    modal.className = "drive-browser-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", title);

    const header = document.createElement("header");
    header.className = "drive-browser-header";

    const headingWrap = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.textContent = mode === "folder" ? "Google Drive Folders" : "Google Drive Images";
    const heading = document.createElement("h2");
    heading.textContent = title;
    headingWrap.append(eyebrow, heading);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "drive-browser-close";
    closeButton.setAttribute("aria-label", "Close Drive browser");
    closeButton.textContent = "x";
    header.append(headingWrap, closeButton);

    const toolbar = document.createElement("form");
    toolbar.className = "drive-browser-toolbar";
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = mode === "folder" ? "Search folders..." : "Search images...";
    searchInput.autocomplete = "off";
    const searchButton = document.createElement("button");
    searchButton.type = "submit";
    searchButton.textContent = "Search";
    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.textContent = "Refresh";
    toolbar.append(searchInput, searchButton, refreshButton);

    const status = document.createElement("p");
    status.className = "drive-browser-status";
    status.textContent = "Loading Google Drive...";

    const grid = document.createElement("div");
    grid.className = "drive-browser-grid";

    const footer = document.createElement("footer");
    footer.className = "drive-browser-footer";
    const loadMoreButton = document.createElement("button");
    loadMoreButton.type = "button";
    loadMoreButton.textContent = "Load More";
    loadMoreButton.disabled = true;
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    footer.append(loadMoreButton, cancelButton);

    modal.append(header, toolbar, status, grid, footer);
    overlay.append(modal);
    document.body.appendChild(overlay);
    searchInput.focus();

    let activeToken = token;
    let items: DriveBrowserItem[] = [];
    let nextPageToken = "";
    let loading = false;
    let closed = false;
    let retriedConsent = false;

    const cleanup = () => {
      closed = true;
      document.removeEventListener("keydown", handleKeyDown);
      overlay.remove();
    };

    const close = (value: GooglePickerFile | GoogleDriveFolder | null) => {
      cleanup();
      resolve(value);
    };

    const render = () => {
      grid.replaceChildren();
      items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "drive-browser-item";

        const preview = document.createElement("span");
        preview.className = "drive-browser-preview";
        if (mode === "image") {
          const image = document.createElement("img");
          image.alt = "";
          image.loading = "lazy";
          image.src = item.thumbnailLink || stableDriveThumbnailUrl(item.id);
          preview.appendChild(image);
        } else {
          preview.classList.add("folder");
          preview.textContent = "Folder";
        }

        const name = document.createElement("strong");
        name.textContent = item.name || (mode === "folder" ? "Untitled Folder" : "Untitled Image");
        const meta = document.createElement("small");
        meta.textContent = item.modifiedTime ? `Updated ${new Date(item.modifiedTime).toLocaleDateString()}` : item.mimeType;
        button.append(preview, name, meta);
        button.addEventListener("click", () => close(driveBrowserItemToSelection(mode, item)));
        grid.appendChild(button);
      });

      if (!items.length && !loading) {
        const empty = document.createElement("div");
        empty.className = "drive-browser-empty";
        empty.textContent = mode === "folder"
          ? "No Drive folders found. Try a different search."
          : "No Drive images found. Try a different search.";
        grid.appendChild(empty);
      }

      loadMoreButton.disabled = loading || !nextPageToken;
    };

    const load = async (append = false) => {
      if (loading || closed) return;
      loading = true;
      status.classList.remove("error");
      status.textContent = append ? "Loading more from Google Drive..." : "Loading Google Drive...";
      loadMoreButton.disabled = true;
      try {
        const result = await fetchDriveBrowserItems(mode, activeToken, searchInput.value, append ? nextPageToken : "");
        items = append ? [...items, ...result.files] : result.files;
        nextPageToken = result.nextPageToken;
        status.textContent = items.length
          ? `${items.length} ${mode === "folder" ? "folder" : "image"}${items.length === 1 ? "" : "s"} ready.`
          : "No matching Drive items found.";
        loading = false;
        render();
      } catch (error) {
        if (!retriedConsent && shouldRetryDriveBrowserAuth(error)) {
          retriedConsent = true;
          try {
            status.textContent = "Google Drive needs one more approval to show your files...";
            activeToken = await authenticateGoogleDrive({ forceConsent: true });
            loading = false;
            void load(append);
            return;
          } catch (authError) {
            loading = false;
            status.classList.add("error");
            status.textContent = driveBrowserErrorMessage(authError);
            render();
            return;
          }
        }

        loading = false;
        status.classList.add("error");
        status.textContent = driveBrowserErrorMessage(error);
        render();
      }
    };

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(null);
    }

    closeButton.addEventListener("click", () => close(null));
    cancelButton.addEventListener("click", () => close(null));
    refreshButton.addEventListener("click", () => void load(false));
    loadMoreButton.addEventListener("click", () => void load(true));
    toolbar.addEventListener("submit", (event) => {
      event.preventDefault();
      void load(false);
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(null);
    });
    document.addEventListener("keydown", handleKeyDown);

    void load(false);
  });
}

async function fetchDriveBrowserItems(
  mode: DriveBrowserMode,
  token: string,
  search: string,
  pageToken: string
) {
  const proxied = await fetchDriveBrowserItemsFromApp(mode, token, search, pageToken);
  if (proxied) return proxied;

  const params = new URLSearchParams({
    corpora: "user",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
    spaces: "drive",
    pageSize: "60",
    fields: "nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,iconLink,modifiedTime)",
    orderBy: mode === "folder" ? "name_natural" : "modifiedTime desc,name_natural"
  });

  const query = buildDriveBrowserQuery(mode, search);
  params.set("q", query);
  if (pageToken) params.set("pageToken", pageToken);

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}${driveApiKeyParam()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) throw await driveError(response, "Could not load Google Drive items.");
  const payload = await response.json() as DriveBrowserListResponse;
  return {
    files: Array.isArray(payload.files) ? payload.files.filter((item) => item?.id) : [],
    nextPageToken: payload.nextPageToken || ""
  };
}

async function fetchDriveBrowserItemsFromApp(
  mode: DriveBrowserMode,
  token: string,
  search: string,
  pageToken: string
) {
  const params = new URLSearchParams({ mode });
  if (search.trim()) params.set("search", search.trim());
  if (pageToken) params.set("pageToken", pageToken);

  try {
    const response = await fetch(`/api/drive-list?${params.toString()}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 404) return null;
    if (!response.ok) throw await driveError(response, "Could not load Google Drive items.");
    const payload = await response.json() as DriveBrowserListResponse;
    return {
      files: Array.isArray(payload.files) ? payload.files.filter((item) => item?.id) : [],
      nextPageToken: payload.nextPageToken || ""
    };
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

function buildDriveBrowserQuery(mode: DriveBrowserMode, search: string) {
  const clauses = ["trashed=false"];
  if (mode === "folder") {
    clauses.push(`mimeType='${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`);
  } else {
    clauses.push(`(${IMAGE_MIME_TYPES.map((mimeType) => `mimeType='${mimeType}'`).join(" or ")})`);
  }

  const cleanSearch = driveQueryValue(search);
  if (cleanSearch) clauses.push(`name contains '${cleanSearch}'`);
  return clauses.join(" and ");
}

function driveQueryValue(value: string) {
  return value.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function cleanDriveFolderName(value: unknown) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function cleanDriveItemName(value: unknown) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function driveFileNameReplacements(oldSegment: string, newSegment: string) {
  const oldClean = cleanDriveItemName(oldSegment);
  const newClean = cleanDriveItemName(newSegment);
  const oldToken = uploadNameToken(oldSegment);
  const newToken = uploadNameToken(newSegment);
  const candidates = [
    { from: oldToken, to: newToken },
    { from: oldClean, to: newClean }
  ];
  const seen = new Set<string>();
  return candidates.filter((replacement) => {
    if (!replacement.from || !replacement.to || replacement.from === replacement.to) return false;
    const key = `${replacement.from}\u0000${replacement.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function replaceAllExact(value: string, from: string, to: string) {
  return value.split(from).join(to);
}

function driveBrowserItemToSelection(mode: DriveBrowserMode, item: DriveBrowserItem) {
  if (mode === "folder") {
    return {
      id: item.id,
      name: item.name || "Selected Drive Folder",
      mimeType: item.mimeType || GOOGLE_DRIVE_FOLDER_MIME_TYPE,
      url: item.webViewLink || googleDriveFolderLink(item.id)
    } satisfies GoogleDriveFolder;
  }

  return {
    id: item.id,
    name: item.name || "Imported Drive Image",
    mimeType: item.mimeType || "",
    url: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
    thumbnailUrl: item.thumbnailLink || stableDriveThumbnailUrl(item.id)
  } satisfies GooglePickerFile;
}

function shouldRetryDriveBrowserAuth(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  return message.includes("sign-in expired") ||
    message.includes("permission denied") ||
    message.includes("insufficient") ||
    message.includes("scope") ||
    message.includes("forbidden") ||
    message.includes("unauthorized");
}

function driveBrowserErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message.trim()) return "Google Drive could not load. Check Drive settings and try Refresh.";
  return `${message} You can keep this window open, approve Google if asked, then tap Refresh.`;
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

function googlePickerOrigin() {
  const ownOrigin = `${window.location.protocol}//${window.location.host}`;
  try {
    const topOrigin = window.top?.location?.origin;
    if (topOrigin && topOrigin !== "null") return topOrigin;
  } catch {
    const referrerOrigin = originFromReferrer(document.referrer);
    if (referrerOrigin) return referrerOrigin;
  }

  return originFromReferrer(document.referrer) || ownOrigin;
}

function originFromReferrer(referrer: string) {
  if (!referrer.trim()) return "";
  try {
    const url = new URL(referrer);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : "";
  } catch {
    return "";
  }
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
  return key && isUsableGoogleApiKey(key) ? `&key=${encodeURIComponent(key)}` : "";
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
    message = typeof payload?.error === "string"
      ? payload.error
      : payload?.error?.message || payload?.message || message;
  } catch {
    message = response.statusText || message;
  }

  if (response.status === 401) return new Error(`Google sign-in expired or was rejected. ${message}`);
  if (response.status === 403) return new Error(`Google Drive permission denied. ${message}`);
  if (response.status === 400) return new Error(`Google Drive rejected the request. Check your API key, OAuth Client ID, and folder ID. ${message}`);
  if (response.status === 413) return new Error(`The selected file is too large. ${message}`);
  return new Error(message);
}
