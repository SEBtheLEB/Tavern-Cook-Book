import { extractGoogleDriveFileId, googleDriveThumbnailUrl } from "./imageFit";

export interface SpriteAnimationPreset {
  id: string;
  spriteSheetAssetId: string;
  presetName: string;
  animationName: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  startFrame: number;
  endFrame: number;
  fps: number;
  loop: boolean;
  pingPong: boolean;
  playOnce: boolean;
  scale: number;
  frameHoldCounts?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface SpriteSheetAsset {
  id: string;
  type: "spriteSheet";
  name: string;
  category: string;
  folderId: string;
  folderLink: string;
  folderName: string;
  driveFileId: string;
  driveUrl: string;
  thumbnailUrl: string;
  originalFileName: string;
  uploadedAt: string;
  updatedAt: string;
  animationPresets: SpriteAnimationPreset[];
}

export interface SpriteSheetNamingContext {
  category?: string;
  assetName?: string;
  animationName?: string;
}

export const SPRITE_SHEET_ASSETS_KEY = "tavernCookBookSpriteSheetAssets";

export const spriteSheetCategories = [
  "Character",
  "Bestiary",
  "Dialogue Art",
  "UI",
  "Worldbuilding",
  "Props",
  "Misc"
];

export const defaultSpritePresetSettings = {
  animationName: "Idle",
  columns: 4,
  rows: 4,
  frameWidth: 64,
  frameHeight: 64,
  totalFrames: 16,
  startFrame: 0,
  endFrame: 15,
  fps: 8,
  loop: true,
  pingPong: false,
  playOnce: false,
  scale: 2,
  frameHoldCounts: {} as Record<string, number>
};

export function loadSpriteSheetAssets(): SpriteSheetAsset[] {
  try {
    const raw = localStorage.getItem(SPRITE_SHEET_ASSETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSpriteSheetAsset).filter(Boolean) as SpriteSheetAsset[];
  } catch {
    return [];
  }
}

export function saveSpriteSheetAssets(assets: SpriteSheetAsset[]) {
  localStorage.setItem(SPRITE_SHEET_ASSETS_KEY, JSON.stringify(assets.map(normalizeSpriteSheetAsset)));
}

export function normalizeSpriteSheetAsset(value: unknown): SpriteSheetAsset {
  const source = value && typeof value === "object" ? value as Partial<SpriteSheetAsset> : {};
  const now = new Date().toISOString();
  const driveFileId = text(source.driveFileId);
  const id = text(source.id) || `sprite-sheet-${driveFileId || Date.now()}`;
  return {
    id,
    type: "spriteSheet",
    name: text(source.name) || text(source.originalFileName) || "Untitled Sprite Sheet",
    category: text(source.category) || "Misc",
    folderId: text(source.folderId),
    folderLink: text(source.folderLink),
    folderName: text(source.folderName),
    driveFileId,
    driveUrl: text(source.driveUrl),
    thumbnailUrl: normalizeDriveBackedThumbnail(text(source.thumbnailUrl), driveFileId),
    originalFileName: text(source.originalFileName),
    uploadedAt: text(source.uploadedAt) || now,
    updatedAt: text(source.updatedAt) || now,
    animationPresets: Array.isArray(source.animationPresets)
      ? source.animationPresets.map((preset) => normalizeSpriteAnimationPreset(preset, id))
      : []
  };
}

export function normalizeSpriteAnimationPreset(value: unknown, spriteSheetAssetId = ""): SpriteAnimationPreset {
  const source = value && typeof value === "object" ? value as Partial<SpriteAnimationPreset> : {};
  const now = new Date().toISOString();
  const columns = positiveInt(source.columns, defaultSpritePresetSettings.columns);
  const rows = positiveInt(source.rows, defaultSpritePresetSettings.rows);
  const maxFrames = columns * rows;
  const totalFrames = clampInt(source.totalFrames, 1, maxFrames, Math.min(defaultSpritePresetSettings.totalFrames, maxFrames));
  const startFrame = clampInt(source.startFrame, 0, Math.max(0, totalFrames - 1), 0);
  const endFrame = clampInt(source.endFrame, startFrame, Math.max(startFrame, totalFrames - 1), Math.max(startFrame, totalFrames - 1));
  const animationName = text(source.animationName) || text(source.presetName) || defaultSpritePresetSettings.animationName;
  return {
    id: text(source.id) || `sprite-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    spriteSheetAssetId: text(source.spriteSheetAssetId) || spriteSheetAssetId,
    presetName: text(source.presetName) || animationName,
    animationName,
    columns,
    rows,
    frameWidth: positiveInt(source.frameWidth, defaultSpritePresetSettings.frameWidth),
    frameHeight: positiveInt(source.frameHeight, defaultSpritePresetSettings.frameHeight),
    totalFrames,
    startFrame,
    endFrame,
    fps: clampInt(source.fps, 1, 60, defaultSpritePresetSettings.fps),
    loop: source.loop !== false,
    pingPong: source.pingPong === true,
    playOnce: source.playOnce === true,
    scale: clampNumber(source.scale, 0.25, 6, defaultSpritePresetSettings.scale),
    frameHoldCounts: normalizeFrameHoldCounts(source.frameHoldCounts, totalFrames),
    createdAt: text(source.createdAt) || now,
    updatedAt: text(source.updatedAt) || now
  };
}

export function createSpritePresetFromSettings(
  spriteSheetAssetId: string,
  settings: Omit<SpriteAnimationPreset, "id" | "spriteSheetAssetId" | "presetName" | "createdAt" | "updatedAt"> & { presetName?: string }
): SpriteAnimationPreset {
  const now = new Date().toISOString();
  return normalizeSpriteAnimationPreset({
    ...settings,
    id: `sprite-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    spriteSheetAssetId,
    presetName: settings.presetName || settings.animationName,
    createdAt: now,
    updatedAt: now
  }, spriteSheetAssetId);
}

export function buildSpriteSheetUploadFileName(context: SpriteSheetNamingContext, originalFileName: string) {
  const extension = fileExtension(originalFileName);
  const date = formatCompactDate(new Date());
  const category = nameToken(context.category);
  const asset = nameToken(context.assetName);
  const animation = nameToken(context.animationName);
  if (category && asset && animation) {
    return `${category}_${asset}_${animation}_SpriteSheet_${date}${extension}`;
  }
  const fallback = nameToken(stripFileExtension(originalFileName)) || "Image";
  return `SpriteSheet_${fallback}_${date}${extension}`;
}

export function frameBounds(frameIndex: number, columns: number, frameWidth: number, frameHeight: number) {
  const column = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);
  return {
    column,
    row,
    sourceX: column * frameWidth,
    sourceY: row * frameHeight
  };
}

export function buildFrameSequence(preset: Pick<SpriteAnimationPreset, "startFrame" | "endFrame" | "pingPong"> & { frameHoldCounts?: Record<string, number> }) {
  const expandFrame = (frame: number) => Array.from({ length: frameHoldCount(preset.frameHoldCounts, frame) }, () => frame);
  const base: number[] = [];
  for (let frame = preset.startFrame; frame <= preset.endFrame; frame += 1) base.push(...expandFrame(frame));
  if (!preset.pingPong || base.length < 3) return base;
  const reverseFrames: number[] = [];
  for (let frame = preset.endFrame - 1; frame > preset.startFrame; frame -= 1) reverseFrames.push(...expandFrame(frame));
  return [...base, ...reverseFrames];
}

export function formatCompactDate(date: Date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}


function normalizeFrameHoldCounts(value: unknown, totalFrames: number) {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const normalized: Record<string, number> = {};
  Object.entries(source).forEach(([key, raw]) => {
    const frame = Math.round(Number(key));
    const count = frameHoldCount(source, frame, raw);
    if (frame >= 0 && frame < totalFrames && count > 1) normalized[String(frame)] = count;
  });
  return normalized;
}

function frameHoldCount(source: Record<string, unknown> | undefined, frame: number, rawOverride?: unknown) {
  const raw = rawOverride ?? source?.[String(frame)];
  const parsed = Math.round(Number(raw));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(12, Math.max(1, parsed));
}
function fileExtension(fileName: string) {
  const match = fileName.match(/\.[a-z0-9]+$/i);
  return match?.[0]?.toLowerCase() || ".png";
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[a-z0-9]+$/i, "");
}

function nameToken(value?: string) {
  const words = text(value).match(/[a-z0-9]+/gi) || [];
  return words.map((word) => word.toUpperCase() === word && word.length <= 3 ? word : word.slice(0, 1).toUpperCase() + word.slice(1)).join("");
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDriveBackedThumbnail(value: string, driveFileId: string) {
  if (!driveFileId) return value;
  const storedFileId = extractGoogleDriveFileId(value);
  return storedFileId === driveFileId ? value : googleDriveThumbnailUrl(driveFileId);
}

function positiveInt(value: unknown, fallback: number) {
  return clampInt(value, 1, Number.MAX_SAFE_INTEGER, fallback);
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
