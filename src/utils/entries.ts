import type {
  CharacterArtGalleryItem,
  EntryConnections,
  EntryMedia,
  EntryNotes,
  LoreDatabase,
  LoreEntry
} from "../types";

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
      thumbnailUrl: typeof item.thumbnailUrl === "string" && !item.thumbnailUrl.trim().toLowerCase().startsWith("data:") ? item.thumbnailUrl : "",
      webViewLink: typeof item.webViewLink === "string" ? item.webViewLink : "",
      dateAdded: typeof item.dateAdded === "string" && item.dateAdded ? item.dateAdded : nowIso(),
      isFeatured: Boolean(item.isFeatured),
      notes: typeof item.notes === "string" ? item.notes : "",
      uploadStatus: typeof item.uploadStatus === "string" ? item.uploadStatus : undefined
    }))
    .map((item, index, items) => ({
      ...item,
      isFeatured: item.isFeatured && items.findIndex((candidate) => candidate.isFeatured) === index
    }));
};

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
