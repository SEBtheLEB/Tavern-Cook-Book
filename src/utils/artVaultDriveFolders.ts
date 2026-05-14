import { getDriveSettings } from "./driveSettings";
import {
  getOrCreateGoogleDriveFolderPath,
  googleDriveFolderLink,
  type GoogleDriveFolder
} from "./googlePicker";

export interface ArtVaultDriveFolderContext {
  sourceType?: string;
  groupName?: string;
  subjectName: string;
  categoryName: string;
}

export type ArtVaultDriveFolder = GoogleDriveFolder;

const ART_VAULT_ROOT_FOLDER_NAME = "Art Vault";

export async function resolveArtVaultDriveFolder(context: ArtVaultDriveFolderContext): Promise<ArtVaultDriveFolder> {
  const parentFolderId = artVaultParentFolderId();
  if (!parentFolderId) {
    throw new Error("Set the Default Art Vault Parent Folder ID in Settings > Google Drive Integration before uploading Art Vault files.");
  }

  return getOrCreateGoogleDriveFolderPath(parentFolderId, artVaultDriveFolderPath(context));
}

export function artVaultDriveFolderPath(context: ArtVaultDriveFolderContext) {
  return [
    ART_VAULT_ROOT_FOLDER_NAME,
    artVaultShelfName(context),
    context.subjectName,
    context.categoryName
  ].map(cleanDrivePathSegment).filter(Boolean);
}

export function artVaultFolderTarget(folder: GoogleDriveFolder) {
  return {
    id: folder.id,
    link: folder.url || googleDriveFolderLink(folder.id),
    name: folder.name
  };
}

function artVaultParentFolderId() {
  const settings = getDriveSettings();
  return (
    settings.defaultArtVaultFolderId.trim() ||
    settings.defaultWorldArtFolderId.trim() ||
    settings.defaultTalesFolderId.trim()
  );
}

function artVaultShelfName(context: ArtVaultDriveFolderContext) {
  if (context.groupName?.trim()) return context.groupName;
  const source = String(context.sourceType || "").toLowerCase();
  if (source.includes("character")) return "Characters";
  if (source.includes("environment") || source.includes("world")) return "Environment";
  if (source.includes("category")) return "Bestiary Categories";
  if (source.includes("creature") || source.includes("bestiary")) return "Bestiary";
  return "General";
}

function cleanDrivePathSegment(value: unknown) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
