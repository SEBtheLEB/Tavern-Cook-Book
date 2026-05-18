import { getDriveSettings } from "./driveSettings";
import {
  getOrCreateGoogleDriveFolderPath,
  googleDriveFolderLink,
  moveGoogleDriveItemToFolder,
  renameGoogleDriveItem,
  type GoogleDriveFolder
} from "./googlePicker";

export interface ArtVaultDriveFolderContext {
  sourceType?: string;
  groupName?: string;
  subjectCategory?: string;
  subjectType?: string;
  subjectThreatLevel?: string;
  subjectHabitat?: string;
  subjectBehavior?: string;
  subjectStatus?: string;
  subjectName: string;
  categoryName: string;
  folderPath?: string[];
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

export async function repairArtVaultDriveFolderHierarchy(
  context: ArtVaultDriveFolderContext,
  existingFolderId: string
): Promise<ArtVaultDriveFolder> {
  const trimmedFolderId = existingFolderId.trim();
  if (!trimmedFolderId) return resolveArtVaultDriveFolder(context);

  const parentFolderId = artVaultParentFolderId();
  if (!parentFolderId) {
    throw new Error("Set the Default Art Vault Parent Folder ID in Settings > Google Drive Integration before repairing Art Vault folders.");
  }

  const path = artVaultDriveFolderPath(context);
  const folderName = path.at(-1);
  const parentPath = path.slice(0, -1);
  if (!folderName || !parentPath.length) return resolveArtVaultDriveFolder(context);

  const expectedParent = await getOrCreateGoogleDriveFolderPath(parentFolderId, parentPath);
  const moved = await moveGoogleDriveItemToFolder(trimmedFolderId, expectedParent.id);
  const renamed = moved.name === folderName ? moved : await renameGoogleDriveItem(trimmedFolderId, folderName);

  return {
    id: renamed.id,
    name: renamed.name || folderName,
    mimeType: renamed.mimeType || "application/vnd.google-apps.folder",
    url: renamed.webViewLink || googleDriveFolderLink(renamed.id)
  };
}

export function artVaultDriveFolderPath(context: ArtVaultDriveFolderContext) {
  if (context.folderPath?.length) {
    return [
      ART_VAULT_ROOT_FOLDER_NAME,
      ...context.folderPath
    ].map(cleanDrivePathSegment).filter(Boolean);
  }

  return [
    ART_VAULT_ROOT_FOLDER_NAME,
    ...artVaultShelfPath(context),
    context.subjectName,
    context.categoryName
  ].map(cleanDrivePathSegment).filter(Boolean);
}

export function artVaultDriveFolderPathLabel(context: ArtVaultDriveFolderContext) {
  return artVaultDriveFolderPath(context).join(" / ");
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

function artVaultShelfPath(context: ArtVaultDriveFolderContext) {
  const source = String(context.sourceType || "").toLowerCase();
  if (source.includes("character")) return ["Characters"];
  if (source.includes("pantry") || source.includes("food") || source.includes("inventory")) {
    return ["Pantry", context.groupName || context.subjectType || "Food & Inventory"];
  }
  if (source.includes("environment") || source.includes("world")) {
    return ["Environment", context.groupName || context.subjectType || "World"];
  }
  if (source.includes("category") || source.includes("creature") || source.includes("bestiary")) {
    return artVaultBestiaryShelfPath(context);
  }
  return [context.groupName || "General"];
}

function artVaultBestiaryShelfPath(context: ArtVaultDriveFolderContext) {
  const group = cleanDrivePathSegment(context.groupName || context.subjectCategory || context.subjectType || "Creatures");
  const haystack = [
    context.sourceType,
    context.groupName,
    context.subjectCategory,
    context.subjectType,
    context.subjectThreatLevel,
    context.subjectHabitat,
    context.subjectBehavior,
    context.subjectStatus,
    context.subjectName
  ].join(" ").toLowerCase();

  if (hasAny(haystack, ["crayhusk", "insect", "bug", "beetle", "scarab", "fly", "moth", "buttle"])) {
    return ["Enemies", "Insects"];
  }
  if (hasAny(haystack, ["boss", "elite", "queen", "lord", "prawnhusk"])) {
    return ["Enemies", "Bosses"];
  }
  if (hasAny(haystack, ["hostile", "aggressive", "danger", "corrupt", "dark", "enemy", "mas'eel", "maseel"])) {
    return ["Enemies", group];
  }
  if (hasAny(haystack, ["slime"])) {
    return ["Wildlife", "Slimes"];
  }
  if (hasAny(haystack, ["boar", "chicken", "fish", "frog", "bird", "rabbit", "deer", "critter", "wildlife", "beast"])) {
    return ["Wildlife", group];
  }
  if (hasAny(haystack, ["plant", "flora", "fungus", "mushroom"])) {
    return ["Wildlife", "Plants"];
  }
  if (hasAny(haystack, ["magical", "faery", "fairy", "elemental", "spirit"])) {
    return ["Magical Creatures", group];
  }
  return ["Bestiary", group];
}

function hasAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function cleanDrivePathSegment(value: unknown) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
