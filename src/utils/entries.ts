import type {
  ArtVaultImageMetadata,
  ArtVaultSection,
  ArtVaultSlot,
  CharacterArtBoard,
  CharacterArtBoardCategory,
  CharacterArtGalleryItem,
  CharacterRelationship,
  CharacterArtVault,
  EntryConnections,
  EntryMedia,
  EntryNotes,
  LoreDatabase,
  LoreEntry
} from "../types";
import { extractGoogleDriveFileId, googleDriveThumbnailUrl, normalizeImageFit } from "./imageFit";
import { normalizeSpriteAnimationSlotReference } from "./spriteAnimationSlots";

export const emptyConnections = (): EntryConnections => ({
  characters: [],
  locations: [],
  recipes: [],
  quests: [],
  items: [],
  factions: [],
  secrets: [],
  gameplaySystems: [],
  enemies: [],
  timelineEvents: []
});

export const emptyNotes = (): EntryNotes => ({
  art: "",
  gameplay: "",
  production: "",
  marketing: "",
  unresolved: ""
});

export const emptyMedia = (): EntryMedia => ({
  imageFits: {},
  galleryImages: [],
  videoLinks: [],
  uploadedVideos: [],
  mediaNotes: ""
});

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

export const nowIso = () => new Date().toISOString();

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeArtGallery = (value: unknown): CharacterArtGalleryItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<CharacterArtGalleryItem> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `art-${Date.now()}-${index}`,
      title: typeof item.title === "string" ? item.title : "",
      category: typeof item.category === "string" ? item.category : "",
      driveFileId: typeof item.driveFileId === "string" ? item.driveFileId : "",
      thumbnailUrl: normalizeDriveBackedImageUrl(item.thumbnailUrl, item.driveFileId),
      webViewLink: typeof item.webViewLink === "string" ? item.webViewLink : "",
      dateAdded: typeof item.dateAdded === "string" && item.dateAdded ? item.dateAdded : nowIso(),
      isFeatured: Boolean(item.isFeatured),
      notes: typeof item.notes === "string" ? item.notes : "",
      uploadStatus: typeof item.uploadStatus === "string" ? item.uploadStatus : undefined,
      imageFit: normalizeImageFit(item.imageFit),
      driveFolderId: typeof item.driveFolderId === "string" ? item.driveFolderId : "",
      driveFolderLink: typeof item.driveFolderLink === "string" ? item.driveFolderLink : "",
      driveFolderName: typeof item.driveFolderName === "string" ? item.driveFolderName : ""
    }))
    .map((item, index, items) => ({
      ...item,
      isFeatured: item.isFeatured && items.findIndex((candidate) => candidate.isFeatured) === index
    }));
};

const normalizeCharacterRelationships = (value: unknown): CharacterRelationship[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((item): item is Partial<CharacterRelationship> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      const characterId = typeof item.characterId === "string" ? item.characterId.trim() : "";
      const description = typeof item.description === "string" ? item.description.trim() : "";
      return {
        id: typeof item.id === "string" && item.id.trim() ? item.id : `relationship-${Date.now()}-${index}`,
        characterId,
        description,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined
      };
    })
    .filter((item) => {
      if (!item.characterId || !item.description) return false;
      const key = item.characterId.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const defaultCharacterArtBoardCategories = [
  "Main Portrait",
  "Hover Sprite",
  "Dialogue Neutral",
  "Dialogue Happy",
  "Dialogue Sad",
  "Dialogue Angry",
  "Combat Pose",
  "Sprite Sheet",
  "Concept Art",
  "Turnaround",
  "Reference Images",
  "Misc Art"
].map((label, order) => ({
  id: `art-board-${slugify(label)}`,
  label,
  order,
  isDefault: true
}));

const defaultCharacterArtBoardCategoryIds: Set<string> = new Set(
  defaultCharacterArtBoardCategories.map((category) => category.id)
);

export const isDefaultCharacterArtBoardCategoryId = (id: string) =>
  defaultCharacterArtBoardCategoryIds.has(id);

export const createDefaultCharacterArtBoard = (): CharacterArtBoard => ({
  categories: defaultCharacterArtBoardCategories.map((category) => ({ ...category }))
});

export const normalizeCharacterArtBoard = (value: unknown): CharacterArtBoard => {
  const defaults = createDefaultCharacterArtBoard();
  if (!value || typeof value !== "object" || !Array.isArray((value as { categories?: unknown }).categories)) {
    return defaults;
  }

  const incoming = ((value as { categories?: unknown }).categories || []) as unknown[];
  const categories = incoming
    .filter((category): category is Partial<CharacterArtBoardCategory> => Boolean(category) && typeof category === "object")
    .map((category, index) => normalizeCharacterArtBoardCategory(category, index));
  const categoryIds = new Set(categories.map((category) => category.id));
  defaults.categories.forEach((category) => {
    if (!categoryIds.has(category.id)) categories.push(category);
  });

  return {
    categories: sortByOrder(categories).map((category, index) => ({
      ...category,
      order: index
    }))
  };
};

function normalizeCharacterArtBoardCategory(
  category: Partial<CharacterArtBoardCategory>,
  index: number
): CharacterArtBoardCategory {
  const label = typeof category.label === "string" && category.label.trim()
    ? category.label.trim()
    : "Art Category";
  const id = typeof category.id === "string" && category.id.trim()
    ? category.id.trim()
    : `custom-art-board-${slugify(label) || Date.now()}-${index}`;

  return {
    id,
    label,
    image: unsafeBlobUrl(category.image) ? "" : typeof category.image === "string" ? category.image : "",
    order: typeof category.order === "number" ? category.order : index,
    isDefault: Boolean(category.isDefault) || isDefaultCharacterArtBoardCategoryId(id)
  };
}

const artVaultBlueprints = [
  {
    id: "dialogue-sprites",
    title: "Dialogue Sprites",
    description: "Required portrait/emotion art for dialogue UI.",
    requirementType: "Dialogue Sprite",
    slots: [
      "Neutral",
      "Happy",
      "Sad",
      "Angry",
      "Shocked",
      "Confused",
      "Thinking",
      "Embarrassed",
      "Determined",
      "Hurt",
      "Laughing",
      "Crying",
      "Suspicious",
      "Tired",
      "Special / Story Moment"
    ]
  },
  {
    id: "combat-gameplay-sprites",
    title: "Combat / Gameplay Sprites",
    description: "Required animation and interaction sprites for playable gameplay states.",
    requirementType: "Gameplay Sprite",
    slots: [
      "Idle",
      "Walk Cycle",
      "Run Cycle",
      "Dash",
      "Sword Attack 01",
      "Sword Attack 02",
      "Heavy Attack",
      "Bow Aim",
      "Bow Shoot",
      "Hit Reaction",
      "Knockback",
      "Death / Downed",
      "Victory",
      "Interact",
      "Pick Up Item",
      "Tree Chop",
      "Mining",
      "Digging",
      "Fishing",
      "Cooking",
      "Stir Cauldron",
      "Carry Object"
    ]
  },
  {
    id: "sprite-sheets",
    title: "Sprite Sheets",
    description: "Compiled sheets for animation, expression, combat, cooking, and turnaround work.",
    requirementType: "Sprite Sheet",
    slots: [
      "Full Idle Sprite Sheet",
      "Full Walk Sprite Sheet",
      "Full Run Sprite Sheet",
      "Full Combat Sprite Sheet",
      "Full Gathering Sprite Sheet",
      "Full Cooking Sprite Sheet",
      "Full Expression Sheet",
      "Full Turnaround Sheet"
    ]
  },
  {
    id: "character-design",
    title: "Character Design",
    description: "Design reference art for the character's final look, proportions, props, colors, and visual rules.",
    requirementType: "Design Reference",
    slots: [
      "Final Character Design",
      "Front View",
      "Side View",
      "Back View",
      "Color Palette",
      "Outfit Variants",
      "Prop / Weapon Sheet",
      "Height Comparison",
      "Material Notes",
      "Shape Language Notes"
    ]
  },
  {
    id: "marketing-key-art",
    title: "Marketing / Key Art",
    description: "Promotional images, website art, store art, trailer poses, and event artwork.",
    requirementType: "Marketing Art",
    slots: [
      "Character Poster",
      "Social Media Portrait",
      "Website Character Card",
      "Steam Capsule Pose",
      "Trailer Close-Up",
      "Promotional Render",
      "Holiday Art",
      "Alternate Costume Art"
    ]
  },
  {
    id: "in-game-references",
    title: "In-Game References",
    description: "Screenshots and small UI assets that show how the character appears in the actual game.",
    requirementType: "In-Game Reference",
    slots: [
      "In-Game Model Screenshot",
      "Dialogue UI Screenshot",
      "Combat Screenshot",
      "Exploration Screenshot",
      "Inventory Icon",
      "Quest Icon",
      "Skill Icon",
      "Mini Portrait",
      "World Interaction Screenshot"
    ]
  }
] as const;

const defaultArtVaultSectionIds: Set<string> = new Set(artVaultBlueprints.map((section) => section.id));
const defaultArtVaultSlotIds: Set<string> = new Set(
  artVaultBlueprints.flatMap((section) =>
    section.slots.map((slot, index) => defaultArtVaultSlotId(section.id, slot, index))
  )
);

export const isDefaultArtVaultSectionId = (id: string) => defaultArtVaultSectionIds.has(id);
export const isDefaultArtVaultSlotId = (id: string) => defaultArtVaultSlotIds.has(id);

function defaultArtVaultSlotId(sectionId: string, label: string, index: number) {
  return `${sectionId}-${slugify(label) || index}`;
}

function createArtVaultSlot(sectionId: string, label: string, requirementType: string, order: number): ArtVaultSlot {
  return {
    id: defaultArtVaultSlotId(sectionId, label, order),
    label,
    requirementType,
    status: "empty",
    image: null,
    notes: "",
    order
  };
}

export const createDefaultArtVault = (): CharacterArtVault => ({
  sections: artVaultBlueprints.map((section, sectionIndex) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    order: sectionIndex,
    slots: section.slots.map((slot, slotIndex) =>
      createArtVaultSlot(section.id, slot, section.requirementType, slotIndex)
    )
  }))
});

export const normalizeArtVault = (value: unknown): CharacterArtVault =>
  normalizeArtVaultWithFallback(value, createDefaultArtVault());

export const normalizeArtVaultWithFallback = (
  value: unknown,
  fallback: CharacterArtVault = createDefaultArtVault()
): CharacterArtVault => {
  if (!value || typeof value !== "object" || !Array.isArray((value as CharacterArtVault).sections)) {
    return cloneArtVault(fallback);
  }

  const rawSections = ((value as { sections?: unknown }).sections || []) as unknown[];
  const incomingSections = rawSections
    .filter((section): section is Partial<ArtVaultSection> => Boolean(section) && typeof section === "object")
    .map((section, index) => normalizeArtVaultSection(section, index));

  return {
    sections: sortByOrder(incomingSections).map((section, sectionIndex) => ({
      ...section,
      order: Number.isFinite(section.order) ? section.order : sectionIndex,
      slots: sortByOrder(section.slots).map((slot, slotIndex) => ({
        ...slot,
        order: Number.isFinite(slot.order) ? slot.order : slotIndex
      }))
    }))
  };
};

function cloneArtVault(vault: CharacterArtVault): CharacterArtVault {
  return {
    sections: vault.sections.map((section) => ({
      ...section,
      slots: section.slots.map((slot) => ({
        ...slot,
        image: slot.image ? { ...slot.image } : null
      }))
    }))
  };
}

function normalizeArtVaultSection(section: Partial<ArtVaultSection>, index: number): ArtVaultSection {
  const id = typeof section.id === "string" && section.id.trim()
    ? section.id.trim()
    : `art-vault-section-${Date.now()}-${index}`;
  const title = typeof section.title === "string" && section.title.trim() ? section.title.trim() : "Art Vault Section";
  const requirementType = title.replace(/s$/, "");
  const rawSlots = Array.isArray(section.slots) ? (section.slots as unknown[]) : [];
  const slots = rawSlots.length
    ? rawSlots
        .filter((slot): slot is Partial<ArtVaultSlot> => Boolean(slot) && typeof slot === "object")
        .map((slot, slotIndex) => normalizeArtVaultSlot(slot, id, requirementType, slotIndex))
    : [];

  return {
    id,
    title,
    description: typeof section.description === "string" ? section.description : "",
    slots,
    order: typeof section.order === "number" ? section.order : index,
    driveFolderId: typeof section.driveFolderId === "string" ? section.driveFolderId : "",
    driveFolderLink: typeof section.driveFolderLink === "string" ? section.driveFolderLink : "",
    driveFolderName: typeof section.driveFolderName === "string" ? section.driveFolderName : ""
  };
}

function normalizeArtVaultSlot(
  slot: Partial<ArtVaultSlot>,
  sectionId: string,
  requirementType: string,
  index: number
): ArtVaultSlot {
  const label = typeof slot.label === "string" && slot.label.trim() ? slot.label.trim() : "Untitled Slot";
  const id = typeof slot.id === "string" && slot.id.trim()
    ? slot.id.trim()
    : `${sectionId}-${slugify(label) || index}`;
  const image = normalizeArtVaultImage(slot.image, id);

  return {
    id,
    label,
    requirementType: typeof slot.requirementType === "string" && slot.requirementType.trim()
      ? slot.requirementType.trim()
      : requirementType,
    status: normalizeArtVaultStatus(slot.status, image),
    image,
    notes: typeof slot.notes === "string" ? slot.notes : "",
    order: typeof slot.order === "number" ? slot.order : index
  };
}

function normalizeArtVaultImage(value: unknown, slotId: string): ArtVaultImageMetadata | null {
  if (!value || typeof value !== "object") return null;
  const image = value as Partial<ArtVaultImageMetadata>;
  return {
    id: typeof image.id === "string" && image.id.trim() ? image.id.trim() : `vault-image-${Date.now()}`,
    title: typeof image.title === "string" ? image.title : "",
    category: typeof image.category === "string" ? image.category : "",
    slotId: typeof image.slotId === "string" && image.slotId.trim() ? image.slotId.trim() : slotId,
    driveFileId: typeof image.driveFileId === "string" ? image.driveFileId : "",
    thumbnailUrl: normalizeDriveBackedImageUrl(image.thumbnailUrl, image.driveFileId),
    webViewLink: unsafeStoredMediaUrl(image.webViewLink) ? "" : String(image.webViewLink || ""),
    dateAdded: typeof image.dateAdded === "string" && image.dateAdded ? image.dateAdded : nowIso(),
    uploadStatus: typeof image.uploadStatus === "string" ? image.uploadStatus : "",
    assetState: image.assetState === "final" ? "final" : image.assetState === "wip" ? "wip" : undefined,
    notes: typeof image.notes === "string" ? image.notes : "",
    fileName: typeof image.fileName === "string" ? image.fileName : undefined,
    downloadUrl: unsafeStoredMediaUrl(image.downloadUrl) ? "" : String(image.downloadUrl || ""),
    uploadedByName: typeof image.uploadedByName === "string" ? image.uploadedByName : undefined,
    uploadedByEmail: typeof image.uploadedByEmail === "string" ? image.uploadedByEmail : undefined,
    uploadedAt: typeof image.uploadedAt === "string" ? image.uploadedAt : undefined,
    lastUpdatedByName: typeof image.lastUpdatedByName === "string" ? image.lastUpdatedByName : undefined,
    lastUpdatedByEmail: typeof image.lastUpdatedByEmail === "string" ? image.lastUpdatedByEmail : undefined,
    lastUpdatedAt: typeof image.lastUpdatedAt === "string" ? image.lastUpdatedAt : undefined,
    imageFit: normalizeImageFit(image.imageFit),
    driveFolderId: typeof image.driveFolderId === "string" ? image.driveFolderId : "",
    driveFolderLink: typeof image.driveFolderLink === "string" ? image.driveFolderLink : "",
    driveFolderName: typeof image.driveFolderName === "string" ? image.driveFolderName : "",
    spriteAnimation: normalizeSpriteAnimationSlotReference(image.spriteAnimation)
  };
}

function normalizeArtVaultStatus(status: unknown, image: ArtVaultImageMetadata | null) {
  const value = typeof status === "string" ? status.trim().toLowerCase() : "";
  if (value === "approved") return "approved";
  if (value === "needs revision" || value === "needs-revision") return "needs-revision";
  if (value === "uploaded" || value === "filled") return "uploaded";
  if (value === "missing" || value === "empty") return "empty";
  return image ? "uploaded" : "empty";
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order - right.order);
}

function unsafeBlobUrl(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.startsWith("blob:");
}

function unsafeStoredMediaUrl(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.startsWith("blob:") || normalized.startsWith("data:");
}

function normalizeDriveBackedImageUrl(value: unknown, driveFileId: unknown) {
  if (unsafeStoredMediaUrl(value)) return "";
  const imageUrl = String(value || "");
  const fileId = typeof driveFileId === "string" ? driveFileId.trim() : "";
  if (!fileId) return imageUrl;
  const storedFileId = extractGoogleDriveFileId(imageUrl);
  return storedFileId === fileId ? imageUrl : googleDriveThumbnailUrl(fileId);
}

export const normalizeEntry = (
  input: Partial<LoreEntry> & { title?: string },
  fallbackCategory = "Story"
): LoreEntry => {
  const title = input.title?.trim() || "Untitled Entry";
  const createdAt = input.createdAt || nowIso();
  const rawConnections = { ...emptyConnections(), ...(input.connections || {}) };
  const connections: EntryConnections = {
    characters: normalizeStringArray(rawConnections.characters),
    locations: normalizeStringArray(rawConnections.locations),
    recipes: normalizeStringArray(rawConnections.recipes),
    quests: normalizeStringArray(rawConnections.quests),
    items: normalizeStringArray(rawConnections.items),
    factions: normalizeStringArray(rawConnections.factions),
    secrets: normalizeStringArray(rawConnections.secrets),
    gameplaySystems: normalizeStringArray(rawConnections.gameplaySystems),
    enemies: normalizeStringArray(rawConnections.enemies),
    timelineEvents: normalizeStringArray(rawConnections.timelineEvents)
  };
  const notes = { ...emptyNotes(), ...(input.notes || {}) };
  const rawMedia = { ...emptyMedia(), ...(input.media || {}) };
  const media = {
    ...rawMedia,
    characterPortrait: rawMedia.characterPortrait,
    characterHoverImage: rawMedia.characterHoverImage,
    ingameSpriteImage: rawMedia.ingameSpriteImage,
    dialogueSpriteImage: rawMedia.dialogueSpriteImage,
    imageFits: normalizeImageFitMap(rawMedia.imageFits),
    galleryImages: normalizeStringArray(rawMedia.galleryImages),
    videoLinks: normalizeStringArray(rawMedia.videoLinks),
    uploadedVideos: Array.isArray(rawMedia.uploadedVideos) ? rawMedia.uploadedVideos : []
  };
  return {
    id: input.id || `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    category: input.category || fallbackCategory,
    type: input.type || "Lore Entry",
    status: input.status || "Idea",
    spoilerLevel: input.spoilerLevel || "No Spoiler",
    tags: normalizeStringArray(input.tags),
    summary: input.summary || "",
    publicDescription: input.publicDescription || "",
    internalLore: input.internalLore || "",
    fields: input.fields || {},
    connections,
    notes,
    timeline: input.timeline,
    secret: input.secret,
    wiki: input.wiki,
    media,
    artGallery: normalizeArtGallery(input.artGallery),
    artVault: normalizeArtVault(input.artVault),
    characterArtBoard: normalizeCharacterArtBoard(input.characterArtBoard),
    characterRelationships: normalizeCharacterRelationships(input.characterRelationships),
    driveFolderId: typeof input.driveFolderId === "string" ? input.driveFolderId : "",
    driveFolderLink: typeof input.driveFolderLink === "string" ? input.driveFolderLink : "",
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
};

export const cloneDatabase = (database: LoreDatabase): LoreDatabase =>
  JSON.parse(JSON.stringify(database)) as LoreDatabase;

export const createBlankEntry = (category = "Story", type = "Lore Entry") =>
  normalizeEntry({
    id: `entry-${Date.now()}`,
    title: "New Lore Entry",
    category,
    type,
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: [],
    summary: "",
    publicDescription: "",
    internalLore: ""
  });

function normalizeImageFitMap(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, fit]) => [key, normalizeImageFit(fit)])
  );
}

