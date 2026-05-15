import type {
  SpriteAnimationPresetSnapshot,
  SpriteAnimationSheetSnapshot,
  SpriteAnimationSlotReference
} from "../types";
import {
  loadSpriteSheetAssets,
  normalizeSpriteAnimationPreset,
  normalizeSpriteSheetAsset,
  type SpriteAnimationPreset,
  type SpriteSheetAsset
} from "./spriteSheets";

export function createSpriteAnimationSlotReference(
  asset: SpriteSheetAsset,
  preset: SpriteAnimationPreset,
  playback: SpriteAnimationSlotReference["playback"],
  loop = true
): SpriteAnimationSlotReference {
  return {
    mode: "spriteAnimation",
    spriteSheetAssetId: asset.id,
    animationPresetId: preset.id,
    playback,
    loop,
    spriteSheet: snapshotSpriteSheetAsset(asset),
    preset: snapshotSpriteAnimationPreset(preset, asset.id)
  };
}

export function normalizeSpriteAnimationSlotReference(value: unknown): SpriteAnimationSlotReference | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<SpriteAnimationSlotReference>;
  const spriteSheetAssetId = text(source.spriteSheetAssetId);
  const animationPresetId = text(source.animationPresetId);
  if (!spriteSheetAssetId || !animationPresetId) return undefined;

  return {
    mode: "spriteAnimation",
    spriteSheetAssetId,
    animationPresetId,
    playback: source.playback === "hover" ? "hover" : "autoplay",
    loop: source.loop !== false,
    spriteSheet: normalizeSpriteSheetSnapshot(source.spriteSheet, spriteSheetAssetId),
    preset: normalizeSpritePresetSnapshot(source.preset, spriteSheetAssetId, animationPresetId)
  };
}

export function resolveSpriteAnimationSlot(value: unknown): {
  asset: SpriteSheetAsset | null;
  preset: SpriteAnimationPreset | null;
  reference: SpriteAnimationSlotReference | undefined;
} {
  const reference = normalizeSpriteAnimationSlotReference(value);
  if (!reference) return { asset: null, preset: null, reference: undefined };

  const localAsset = loadSpriteSheetsSafely().find((asset) => asset.id === reference.spriteSheetAssetId) || null;
  const snapshotAsset = reference.spriteSheet
    ? normalizeSpriteSheetAsset({
        ...reference.spriteSheet,
        animationPresets: reference.preset ? [reference.preset] : []
      })
    : null;
  const asset = localAsset || snapshotAsset;
  const localPreset = localAsset?.animationPresets.find((preset) => preset.id === reference.animationPresetId) || null;
  const snapshotPreset = reference.preset
    ? normalizeSpriteAnimationPreset(reference.preset, reference.spriteSheetAssetId)
    : null;
  const preset = localPreset || snapshotPreset || asset?.animationPresets.find((item) => item.id === reference.animationPresetId) || null;

  return { asset, preset, reference };
}

function snapshotSpriteSheetAsset(asset: SpriteSheetAsset): SpriteAnimationSheetSnapshot {
  const normalized = normalizeSpriteSheetAsset(asset);
  return {
    id: normalized.id,
    type: "spriteSheet",
    name: normalized.name,
    category: normalized.category,
    folderId: normalized.folderId,
    folderLink: persistentUrl(normalized.folderLink),
    folderName: normalized.folderName,
    driveFileId: normalized.driveFileId,
    driveUrl: persistentUrl(normalized.driveUrl),
    thumbnailUrl: persistentUrl(normalized.thumbnailUrl),
    originalFileName: normalized.originalFileName,
    uploadedAt: normalized.uploadedAt,
    updatedAt: normalized.updatedAt
  };
}

function snapshotSpriteAnimationPreset(preset: SpriteAnimationPreset, spriteSheetAssetId: string): SpriteAnimationPresetSnapshot {
  const normalized = normalizeSpriteAnimationPreset(preset, spriteSheetAssetId);
  return {
    id: normalized.id,
    spriteSheetAssetId: normalized.spriteSheetAssetId || spriteSheetAssetId,
    presetName: normalized.presetName,
    animationName: normalized.animationName,
    columns: normalized.columns,
    rows: normalized.rows,
    frameWidth: normalized.frameWidth,
    frameHeight: normalized.frameHeight,
    totalFrames: normalized.totalFrames,
    startFrame: normalized.startFrame,
    endFrame: normalized.endFrame,
    fps: normalized.fps,
    loop: normalized.loop,
    pingPong: normalized.pingPong,
    playOnce: normalized.playOnce,
    scale: normalized.scale,
    frameHoldCounts: normalized.frameHoldCounts,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt
  };
}

function normalizeSpriteSheetSnapshot(value: unknown, fallbackId: string): SpriteAnimationSheetSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<SpriteAnimationSheetSnapshot>;
  const id = text(source.id) || fallbackId;
  const driveFileId = text(source.driveFileId);
  const driveUrl = persistentUrl(source.driveUrl);
  const thumbnailUrl = persistentUrl(source.thumbnailUrl);
  if (!id || (!driveFileId && !driveUrl && !thumbnailUrl)) return undefined;

  return snapshotSpriteSheetAsset(normalizeSpriteSheetAsset({
    id,
    type: "spriteSheet",
    name: source.name,
    category: source.category,
    folderId: source.folderId,
    folderLink: source.folderLink,
    folderName: source.folderName,
    driveFileId,
    driveUrl,
    thumbnailUrl,
    originalFileName: source.originalFileName,
    uploadedAt: source.uploadedAt,
    updatedAt: source.updatedAt,
    animationPresets: []
  }));
}

function normalizeSpritePresetSnapshot(
  value: unknown,
  spriteSheetAssetId: string,
  animationPresetId: string
): SpriteAnimationPresetSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;
  return snapshotSpriteAnimationPreset(normalizeSpriteAnimationPreset({
    ...(value as Partial<SpriteAnimationPresetSnapshot>),
    id: text((value as Partial<SpriteAnimationPresetSnapshot>).id) || animationPresetId,
    spriteSheetAssetId
  }, spriteSheetAssetId), spriteSheetAssetId);
}

function loadSpriteSheetsSafely() {
  try {
    return loadSpriteSheetAssets();
  } catch {
    return [];
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function persistentUrl(value: unknown) {
  const url = text(value);
  const lowered = url.toLowerCase();
  if (lowered.startsWith("blob:") || lowered.startsWith("data:")) return "";
  return url;
}
