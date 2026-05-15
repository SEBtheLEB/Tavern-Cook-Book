import type {
  ArtVaultImageMetadata,
  ArtVaultSection,
  ArtVaultSlot,
  CharacterArtVault,
  LoreDatabase,
  SpriteAnimationFrameImage,
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

export interface SpriteAnimationSlotAssets {
  frameImages?: SpriteAnimationFrameImage[];
  frameFolderId?: string;
  frameFolderLink?: string;
  frameFolderName?: string;
}

export function createSpriteAnimationSlotReference(
  asset: SpriteSheetAsset,
  preset: SpriteAnimationPreset,
  playback: SpriteAnimationSlotReference["playback"],
  loop = true,
  assets: SpriteAnimationSlotAssets = {}
): SpriteAnimationSlotReference {
  return {
    mode: "spriteAnimation",
    spriteSheetAssetId: asset.id,
    animationPresetId: preset.id,
    playback,
    loop,
    spriteSheet: snapshotSpriteSheetAsset(asset),
    preset: snapshotSpriteAnimationPreset(preset, asset.id),
    frameImages: normalizeSpriteAnimationFrameImages(assets.frameImages),
    frameFolderId: text(assets.frameFolderId),
    frameFolderLink: persistentUrl(assets.frameFolderLink),
    frameFolderName: text(assets.frameFolderName)
  };
}

export function normalizeSpriteAnimationSlotReference(value: unknown): SpriteAnimationSlotReference | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<SpriteAnimationSlotReference>;
  const spriteSheetAssetId = text(source.spriteSheetAssetId);
  const animationPresetId = text(source.animationPresetId);
  if (!spriteSheetAssetId || !animationPresetId) return undefined;
  const spriteSheet = normalizeSpriteSheetSnapshot(source.spriteSheet, spriteSheetAssetId);
  const preset = normalizeSpritePresetSnapshot(source.preset, spriteSheetAssetId, animationPresetId);
  const localAsset = !spriteSheet || !preset
    ? findLocalSpriteSheetAsset(spriteSheetAssetId)
    : null;
  const localPreset = !preset
    ? findLocalSpriteAnimationPreset(localAsset, animationPresetId)
    : null;

  return {
    mode: "spriteAnimation",
    spriteSheetAssetId,
    animationPresetId,
    playback: source.playback === "hover" ? "hover" : "autoplay",
    loop: source.loop !== false,
    spriteSheet: spriteSheet || (localAsset ? snapshotSpriteSheetAsset(localAsset) : undefined),
    preset: preset || (localPreset ? snapshotSpriteAnimationPreset(localPreset, spriteSheetAssetId) : undefined),
    frameImages: normalizeSpriteAnimationFrameImages(source.frameImages),
    frameFolderId: text(source.frameFolderId),
    frameFolderLink: persistentUrl(source.frameFolderLink),
    frameFolderName: text(source.frameFolderName)
  };
}

export function normalizeSpriteAnimationFrameImages(value: unknown): SpriteAnimationFrameImage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const byFrame = new Map<number, SpriteAnimationFrameImage>();
  value.forEach((item) => {
    const normalized = normalizeSpriteAnimationFrameImage(item);
    if (normalized) byFrame.set(normalized.frameIndex, normalized);
  });
  const frames = Array.from(byFrame.values()).sort((left, right) => left.frameIndex - right.frameIndex);
  return frames.length ? frames : undefined;
}

export function resolveSpriteAnimationSlot(value: unknown): {
  asset: SpriteSheetAsset | null;
  preset: SpriteAnimationPreset | null;
  reference: SpriteAnimationSlotReference | undefined;
} {
  const reference = normalizeSpriteAnimationSlotReference(value);
  if (!reference) return { asset: null, preset: null, reference: undefined };

  const localAsset = findLocalSpriteSheetAsset(reference.spriteSheetAssetId);
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

export function hydrateDatabaseSpriteAnimationSnapshots(database: LoreDatabase): { database: LoreDatabase; changed: boolean } {
  let changed = false;
  const entries = (database.entries || []).map((entry) => {
    const hydratedVault = hydrateArtVault(entry.artVault);
    if (!hydratedVault.changed) return entry;
    changed = true;
    return { ...entry, artVault: hydratedVault.vault || entry.artVault };
  });
  const bestiary = (database.bestiary || []).map((creature) => {
    const hydratedVault = hydrateArtVault(creature.artVault);
    if (!hydratedVault.changed) return creature;
    changed = true;
    return { ...creature, artVault: hydratedVault.vault || creature.artVault };
  });
  const bestiaryCategoryVaults = (database.bestiaryCategoryVaults || []).map((vault) => {
    const hydratedVault = hydrateArtVault(vault.artVault);
    if (!hydratedVault.changed) return vault;
    changed = true;
    return { ...vault, artVault: hydratedVault.vault || vault.artVault };
  });

  return changed
    ? { database: { ...database, entries, bestiary, bestiaryCategoryVaults }, changed: true }
    : { database, changed: false };
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

function normalizeSpriteAnimationFrameImage(value: unknown): SpriteAnimationFrameImage | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<SpriteAnimationFrameImage>;
  const frameIndex = Math.round(Number(source.frameIndex));
  const driveFileId = text(source.driveFileId);
  const thumbnailUrl = persistentUrl(source.thumbnailUrl);
  const webViewLink = persistentUrl(source.webViewLink);
  const fileName = text(source.fileName);
  if (!Number.isFinite(frameIndex) || frameIndex < 0 || (!driveFileId && !thumbnailUrl && !webViewLink)) return null;
  return {
    frameIndex,
    driveFileId,
    thumbnailUrl,
    webViewLink,
    fileName
  };
}

function loadSpriteSheetsSafely() {
  try {
    return loadSpriteSheetAssets();
  } catch {
    return [];
  }
}

function findLocalSpriteSheetAsset(spriteSheetAssetId: string) {
  const assets = loadSpriteSheetsSafely();
  const embeddedDriveFileId = driveFileIdFromSpriteSheetAssetId(spriteSheetAssetId);
  return assets.find((asset) =>
    asset.id === spriteSheetAssetId ||
    (embeddedDriveFileId && asset.driveFileId === embeddedDriveFileId)
  ) || null;
}

function findLocalSpriteAnimationPreset(asset: SpriteSheetAsset | null, animationPresetId: string) {
  if (!asset) return null;
  return asset.animationPresets.find((preset) => preset.id === animationPresetId) ||
    (asset.animationPresets.length === 1 ? asset.animationPresets[0] : null);
}

function driveFileIdFromSpriteSheetAssetId(spriteSheetAssetId: string) {
  const match = spriteSheetAssetId.match(/^sprite-sheet-(.+)-\d+$/);
  return match?.[1] || "";
}

function hydrateArtVault(vault: CharacterArtVault | undefined): { vault: CharacterArtVault | undefined; changed: boolean } {
  if (!vault?.sections?.length) return { vault, changed: false };
  let changed = false;
  const sections = vault.sections.map((section) => {
    const hydrated = hydrateSection(section);
    if (hydrated.changed) changed = true;
    return hydrated.section;
  });
  return changed ? { vault: { ...vault, sections }, changed: true } : { vault, changed: false };
}

function hydrateSection(section: ArtVaultSection): { section: ArtVaultSection; changed: boolean } {
  let changed = false;
  const slots = (section.slots || []).map((slot) => {
    const hydrated = hydrateSlot(slot);
    if (hydrated.changed) changed = true;
    return hydrated.slot;
  });
  return changed ? { section: { ...section, slots }, changed: true } : { section, changed: false };
}

function hydrateSlot(slot: ArtVaultSlot): { slot: ArtVaultSlot; changed: boolean } {
  const hydrated = hydrateImage(slot.image);
  if (!hydrated.changed) return { slot, changed: false };
  return { slot: { ...slot, image: hydrated.image }, changed: true };
}

function hydrateImage(image: ArtVaultImageMetadata | null): { image: ArtVaultImageMetadata | null; changed: boolean } {
  if (!image?.spriteAnimation) return { image, changed: false };
  const normalized = normalizeSpriteAnimationSlotReference(image.spriteAnimation);
  if (!normalized) return { image, changed: false };
  if (sameValue(normalized, image.spriteAnimation)) return { image, changed: false };
  return { image: { ...image, spriteAnimation: normalized }, changed: true };
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
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
