import type { ArtDirectionBoard, ArtDirectionBoardItem, ArtDirectionImageMetadata } from "../types";
import { getDriveSettings } from "./driveSettings";
import { getOrCreateGoogleDriveFolderPath, googleDriveFolderLink, type GoogleDriveFolder } from "./googlePicker";

const ART_DIRECTION_FOLDER_NAME = "Art Direction";
const DEFAULT_BOARD_WIDTH = 5200;
const DEFAULT_BOARD_HEIGHT = 3400;
const defaultCreatedAt = "2026-05-27T00:00:00.000Z";

export function createStarterArtDirectionBoard(): ArtDirectionBoard {
  return {
    id: "art-direction-main-board",
    title: "Tales of the Tavern Art Direction",
    description: "A shared visual whiteboard for references, notes, paintovers, mood, shapes, UI, characters, food, places, and production direction.",
    width: DEFAULT_BOARD_WIDTH,
    height: DEFAULT_BOARD_HEIGHT,
    background: "grid",
    items: [],
    driveFolderId: "",
    driveFolderLink: "",
    driveFolderName: "",
    createdAt: defaultCreatedAt,
    updatedAt: defaultCreatedAt
  };
}

export function normalizeArtDirectionBoard(value: unknown): ArtDirectionBoard {
  const starter = createStarterArtDirectionBoard();
  const source = value && typeof value === "object" ? value as Partial<ArtDirectionBoard> : {};
  const createdAt = stringOr(source.createdAt, starter.createdAt);
  return {
    id: stringOr(source.id, starter.id),
    title: stringOr(source.title, starter.title),
    description: stringOr(source.description, starter.description),
    width: clampNumber(source.width, 2400, 12000, starter.width),
    height: clampNumber(source.height, 1600, 9000, starter.height),
    background: source.background === "plain" ? "plain" : "grid",
    items: Array.isArray(source.items)
      ? source.items.map(normalizeArtDirectionBoardItem).sort((a, b) => a.zIndex - b.zIndex)
      : [],
    driveFolderId: stringOr(source.driveFolderId, ""),
    driveFolderLink: stringOr(source.driveFolderLink, ""),
    driveFolderName: stringOr(source.driveFolderName, ""),
    createdAt,
    updatedAt: stringOr(source.updatedAt, createdAt)
  };
}

export function sanitizeArtDirectionBoardForPersistence(value: unknown): ArtDirectionBoard {
  const board = normalizeArtDirectionBoard(value);
  return {
    ...board,
    items: board.items.map((item) => ({
      ...item,
      image: item.image ? sanitizeArtDirectionImageMetadata(item.image) : undefined
    }))
  };
}

export async function resolveArtDirectionDriveFolder(): Promise<GoogleDriveFolder> {
  const settings = getDriveSettings();
  const parentFolderId = (
    settings.defaultArtVaultFolderId.trim() ||
    settings.defaultWorldArtFolderId.trim() ||
    settings.defaultTalesFolderId.trim()
  );
  if (!parentFolderId) {
    throw new Error("Set the Default Art Vault, World Art, or Tales Drive Folder ID in Settings before uploading Art Direction files.");
  }

  return getOrCreateGoogleDriveFolderPath(parentFolderId, [ART_DIRECTION_FOLDER_NAME]);
}

export function artDirectionDriveFolderPathLabel() {
  return ART_DIRECTION_FOLDER_NAME;
}

export function artDirectionFolderTarget(folder: GoogleDriveFolder) {
  return {
    id: folder.id,
    link: folder.url || googleDriveFolderLink(folder.id),
    name: folder.name || ART_DIRECTION_FOLDER_NAME
  };
}

function normalizeArtDirectionBoardItem(value: unknown): ArtDirectionBoardItem {
  const source = value && typeof value === "object" ? value as Partial<ArtDirectionBoardItem> : {};
  const createdAt = stringOr(source.createdAt, new Date().toISOString());
  const type = source.type === "text" ? "text" : "image";
  return {
    id: stringOr(source.id, `art-direction-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    type,
    title: stringOr(source.title, type === "text" ? "Direction Note" : "Reference Image"),
    x: clampNumber(source.x, 0, 12000, 240),
    y: clampNumber(source.y, 0, 9000, 220),
    width: clampNumber(source.width, 140, 1800, type === "text" ? 300 : 420),
    height: clampNumber(source.height, 120, 1400, type === "text" ? 220 : 300),
    zIndex: clampNumber(source.zIndex, 0, 100000, 1),
    text: type === "text" ? stringOr(source.text, "New note") : undefined,
    color: type === "text" ? stringOr(source.color, "#fff7d6") : undefined,
    image: type === "image" && source.image ? sanitizeArtDirectionImageMetadata(source.image) : undefined,
    notes: stringOr(source.notes, ""),
    createdAt,
    updatedAt: stringOr(source.updatedAt, createdAt)
  };
}

function sanitizeArtDirectionImageMetadata(value: unknown): ArtDirectionImageMetadata {
  const source = value && typeof value === "object" ? value as Partial<ArtDirectionImageMetadata> : {};
  return {
    driveFileId: stringOr(source.driveFileId, ""),
    thumbnailUrl: safePersistentUrl(source.thumbnailUrl),
    webViewLink: safePersistentUrl(source.webViewLink),
    fileName: stringOr(source.fileName, "ArtDirectionReference"),
    mimeType: stringOr(source.mimeType, ""),
    width: clampNumber(source.width, 0, 20000, 0),
    height: clampNumber(source.height, 0, 20000, 0),
    uploadedAt: stringOr(source.uploadedAt, ""),
    uploadedByName: stringOr(source.uploadedByName, ""),
    uploadedByEmail: stringOr(source.uploadedByEmail, ""),
    driveFolderId: stringOr(source.driveFolderId, ""),
    driveFolderLink: stringOr(source.driveFolderLink, ""),
    driveFolderName: stringOr(source.driveFolderName, "")
  };
}

function stringOr(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function safePersistentUrl(value: unknown) {
  const text = stringOr(value, "");
  const lower = text.toLowerCase();
  if (lower.startsWith("blob:") || lower.startsWith("data:")) return "";
  return text;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
}
