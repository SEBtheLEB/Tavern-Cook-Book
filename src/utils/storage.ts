import { createStarterDatabase } from "../data/starterData";
import type { BestiaryCategoryArtVault, BestiaryCreature, LoreBackup, LoreDatabase, LoreEntry, ThemeMode } from "../types";
import {
  normalizeBestiaryCategoryArtVault,
  normalizeBestiaryCreature,
  sanitizeBestiaryCategoryArtVaultForPersistence,
  sanitizeBestiaryCreatureForPersistence
} from "./bestiary";
import { cloneDatabase, normalizeEntry, nowIso } from "./entries";
import { normalizeImageFit } from "./imageFit";
import { createStarterWorldBuilding, normalizeWorldBuilding, sanitizeWorldBuildingForPersistence } from "./worldBuilding";

export const DATABASE_KEY = "tavern-cook-book:data";
export const THEME_KEY = "tavern-cook-book:theme";
const LEGACY_MODE_KEY = "tavern-cook-book:mode";

export const currentSchemaVersion = 1;

export const migrateDatabase = (value: unknown): LoreDatabase => {
  const starter = createStarterDatabase();
  if (!value || typeof value !== "object") {
    return starter;
  }

  const incoming = value as Partial<LoreDatabase>;
  const entries = Array.isArray(incoming.entries)
    ? repairScribeFoodEntries(incoming.entries.map((item) => normalizeEntry(item as Partial<LoreEntry>)))
    : starter.entries;
  const bestiary = Array.isArray(incoming.bestiary)
    ? incoming.bestiary.map((item) => normalizeBestiaryCreature(item as Partial<BestiaryCreature>))
    : starter.bestiary;
  const bestiaryCategoryVaults = Array.isArray(incoming.bestiaryCategoryVaults)
    ? incoming.bestiaryCategoryVaults.map((item) =>
        normalizeBestiaryCategoryArtVault(item as Partial<BestiaryCategoryArtVault>, (item as Partial<BestiaryCategoryArtVault>).categoryName, bestiary)
      )
    : starter.bestiaryCategoryVaults || [];
  const worldBuilding = incoming.worldBuilding
    ? normalizeWorldBuilding(incoming.worldBuilding)
    : createStarterWorldBuilding(entries, bestiary);

  return {
    schemaVersion: currentSchemaVersion,
    entries,
    bestiary,
    bestiaryCategoryVaults,
    worldBuilding,
    backups: Array.isArray(incoming.backups)
      ? incoming.backups
          .filter((backup) => backup && Array.isArray((backup as LoreBackup).entries))
          .map((backup) => ({
            id: String((backup as LoreBackup).id || `backup-${Date.now()}`),
            label: String((backup as LoreBackup).label || "Imported backup"),
            createdAt: String((backup as LoreBackup).createdAt || nowIso()),
            entries: (backup as LoreBackup).entries.map((item) => normalizeEntry(item)),
            bestiary: Array.isArray((backup as LoreBackup).bestiary)
              ? ((backup as LoreBackup).bestiary || []).map((item) => normalizeBestiaryCreature(item))
              : undefined,
            bestiaryCategoryVaults: Array.isArray((backup as LoreBackup).bestiaryCategoryVaults)
              ? ((backup as LoreBackup).bestiaryCategoryVaults || []).map((item) =>
                  normalizeBestiaryCategoryArtVault(item, item.categoryName, bestiary)
                )
              : undefined,
            worldBuilding: (backup as LoreBackup).worldBuilding
              ? normalizeWorldBuilding((backup as LoreBackup).worldBuilding)
              : undefined
          }))
          .slice(0, 12)
      : [],
    lastAiBackupId: typeof incoming.lastAiBackupId === "string" ? incoming.lastAiBackupId : undefined,
    branding: {
      studioName: incoming.branding?.studioName || "STL Productionz",
      logoImage: incoming.branding?.logoImage
    }
  };
};

export const loadDatabase = (): LoreDatabase => {
  try {
    const raw = localStorage.getItem(DATABASE_KEY);
    if (!raw) {
      return createStarterDatabase();
    }
    return migrateDatabase(JSON.parse(raw));
  } catch {
    return createStarterDatabase();
  }
};

export const saveDatabase = (database: LoreDatabase) => {
  try {
    localStorage.setItem(DATABASE_KEY, JSON.stringify(sanitizeDatabaseForPersistence(database)));
    return { ok: true };
  } catch (error) {
    const isQuotaError =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return {
      ok: false,
      message: isQuotaError
        ? "Browser storage is full. The app stayed open, but this latest change may not survive a restart. Try smaller images or remove a few gallery images."
        : "The app could not save to browser storage. Export a backup before closing."
    };
  }
};

export const loadTheme = (): ThemeMode =>
  localStorage.getItem(THEME_KEY) === "dream" ? "dream" : "light";

export const saveTheme = (theme: ThemeMode) => {
  localStorage.setItem(THEME_KEY, theme);
};

export const resetStorage = () => {
  localStorage.removeItem(DATABASE_KEY);
};

export const clearAllAppStorage = () => {
  localStorage.removeItem(DATABASE_KEY);
  localStorage.removeItem(THEME_KEY);
  localStorage.removeItem(LEGACY_MODE_KEY);
};

export const createBackup = (database: LoreDatabase, label: string): LoreDatabase => {
  const next = cloneDatabase(database);
  const backup: LoreBackup = {
    id: `backup-${Date.now()}`,
    label,
    createdAt: nowIso(),
    entries: cloneDatabase(database).entries,
    bestiary: cloneDatabase(database).bestiary || [],
    bestiaryCategoryVaults: cloneDatabase(database).bestiaryCategoryVaults || [],
    worldBuilding: cloneDatabase(database).worldBuilding || createStarterWorldBuilding(database.entries, database.bestiary)
  };

  next.backups = [backup, ...(next.backups || [])].slice(0, 12);
  return next;
};

export const estimateStorageBytes = (database: LoreDatabase) =>
  new Blob([JSON.stringify(sanitizeDatabaseForPersistence(database))]).size;

export const sanitizeDatabaseForPersistence = (database: LoreDatabase): LoreDatabase => ({
  ...database,
  entries: (database.entries || []).map(sanitizeEntryForPersistence),
  bestiary: (database.bestiary || []).map((creature) =>
    sanitizeBestiaryCreatureForPersistence(normalizeBestiaryCreature(creature))
  ),
  bestiaryCategoryVaults: (database.bestiaryCategoryVaults || []).map((vault) =>
    sanitizeBestiaryCategoryArtVaultForPersistence(normalizeBestiaryCategoryArtVault(vault, vault.categoryName, database.bestiary || []))
  ),
  worldBuilding: sanitizeWorldBuildingForPersistence(database.worldBuilding),
  backups: (database.backups || []).map((backup) => {
    const sanitizedBackup: LoreBackup = {
      ...backup,
      entries: (backup.entries || []).map(sanitizeEntryForPersistence)
    };

    if (Array.isArray(backup.bestiary)) {
      sanitizedBackup.bestiary = backup.bestiary.map((creature) =>
        sanitizeBestiaryCreatureForPersistence(normalizeBestiaryCreature(creature))
      );
    }

    if (Array.isArray(backup.bestiaryCategoryVaults)) {
      sanitizedBackup.bestiaryCategoryVaults = backup.bestiaryCategoryVaults.map((vault) =>
        sanitizeBestiaryCategoryArtVaultForPersistence(
          normalizeBestiaryCategoryArtVault(vault, vault.categoryName, backup.bestiary || database.bestiary || [])
        )
      );
    }

    if (backup.worldBuilding) {
      sanitizedBackup.worldBuilding = sanitizeWorldBuildingForPersistence(backup.worldBuilding);
    }

    return sanitizedBackup;
  })
});

const sanitizeEntryForPersistence = (entry: LoreEntry): LoreEntry => ({
  ...entry,
  fields: sanitizeLooseFieldsForPersistence(entry.fields),
  media: {
    ...entry.media,
    iconImage: isUnsafePersistentUrl(entry.media.iconImage) ? "" : String(entry.media.iconImage || ""),
    mainImage: isUnsafePersistentUrl(entry.media.mainImage) ? "" : String(entry.media.mainImage || ""),
    characterPortrait: isUnsafePersistentUrl(entry.media.characterPortrait) ? "" : String(entry.media.characterPortrait || ""),
    characterHoverImage: isUnsafePersistentUrl(entry.media.characterHoverImage) ? "" : String(entry.media.characterHoverImage || ""),
    ingameSpriteImage: isUnsafePersistentUrl(entry.media.ingameSpriteImage) ? "" : String(entry.media.ingameSpriteImage || ""),
    dialogueSpriteImage: isUnsafePersistentUrl(entry.media.dialogueSpriteImage) ? "" : String(entry.media.dialogueSpriteImage || ""),
    imageFits: Object.fromEntries(
      Object.entries(entry.media.imageFits || {}).map(([key, value]) => [key, normalizeImageFit(value)])
    ),
    galleryImages: (entry.media.galleryImages || []).filter((url) => !isUnsafePersistentUrl(url))
  },
  artGallery: (entry.artGallery || []).map((item) => ({
    ...item,
    driveFileId: typeof item.driveFileId === "string" ? item.driveFileId : "",
    thumbnailUrl: isUnsafePersistentUrl(item.thumbnailUrl) ? "" : String(item.thumbnailUrl || ""),
    webViewLink: isUnsafePersistentUrl(item.webViewLink) ? "" : String(item.webViewLink || ""),
    notes: typeof item.notes === "string" ? item.notes : "",
    imageFit: normalizeImageFit(item.imageFit),
    driveFolderId: typeof item.driveFolderId === "string" ? item.driveFolderId : "",
    driveFolderLink: typeof item.driveFolderLink === "string" ? item.driveFolderLink : "",
    driveFolderName: typeof item.driveFolderName === "string" ? item.driveFolderName : ""
  })),
  artVault: {
    sections: (entry.artVault?.sections || []).map((section) => ({
      ...section,
      driveFolderId: typeof section.driveFolderId === "string" ? section.driveFolderId : "",
      driveFolderLink: typeof section.driveFolderLink === "string" ? section.driveFolderLink : "",
      driveFolderName: typeof section.driveFolderName === "string" ? section.driveFolderName : "",
      slots: (section.slots || []).map((slot) => ({
        ...slot,
        image: slot.image
          ? {
              ...slot.image,
              driveFileId: typeof slot.image.driveFileId === "string" ? slot.image.driveFileId : "",
              thumbnailUrl: isUnsafePersistentUrl(slot.image.thumbnailUrl) ? "" : String(slot.image.thumbnailUrl || ""),
              webViewLink: isUnsafePersistentUrl(slot.image.webViewLink) ? "" : String(slot.image.webViewLink || ""),
              notes: typeof slot.image.notes === "string" ? slot.image.notes : "",
              assetState: slot.image.assetState === "final" ? "final" : slot.image.assetState === "wip" ? "wip" : undefined,
              fileName: typeof slot.image.fileName === "string" ? slot.image.fileName : undefined,
              downloadUrl: isUnsafePersistentUrl(slot.image.downloadUrl) ? "" : String(slot.image.downloadUrl || ""),
              uploadedByName: typeof slot.image.uploadedByName === "string" ? slot.image.uploadedByName : undefined,
              uploadedByEmail: typeof slot.image.uploadedByEmail === "string" ? slot.image.uploadedByEmail : undefined,
              uploadedAt: typeof slot.image.uploadedAt === "string" ? slot.image.uploadedAt : undefined,
              lastUpdatedByName: typeof slot.image.lastUpdatedByName === "string" ? slot.image.lastUpdatedByName : undefined,
              lastUpdatedByEmail: typeof slot.image.lastUpdatedByEmail === "string" ? slot.image.lastUpdatedByEmail : undefined,
              lastUpdatedAt: typeof slot.image.lastUpdatedAt === "string" ? slot.image.lastUpdatedAt : undefined,
              imageFit: normalizeImageFit(slot.image.imageFit),
              driveFolderId: typeof slot.image.driveFolderId === "string" ? slot.image.driveFolderId : "",
              driveFolderLink: typeof slot.image.driveFolderLink === "string" ? slot.image.driveFolderLink : "",
              driveFolderName: typeof slot.image.driveFolderName === "string" ? slot.image.driveFolderName : "",
              spriteAnimation: sanitizeSpriteAnimationForPersistence(slot.image.spriteAnimation)
            }
          : null
      }))
    }))
  },
  characterArtBoard: {
    categories: (entry.characterArtBoard?.categories || []).map((category) => ({
      ...category,
      image: isTemporaryUrl(category.image) ? "" : String(category.image || "")
    }))
  },
  characterRelationships: (entry.characterRelationships || [])
    .filter((relationship) => relationship?.characterId && relationship?.description)
    .map((relationship) => ({
      ...relationship,
      id: String(relationship.id || `relationship-${Date.now()}`),
      characterId: String(relationship.characterId || ""),
      description: String(relationship.description || ""),
      createdAt: typeof relationship.createdAt === "string" ? relationship.createdAt : undefined,
      updatedAt: typeof relationship.updatedAt === "string" ? relationship.updatedAt : undefined
    }))
});

const isUnsafePersistentUrl = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.startsWith("blob:") || normalized.startsWith("data:");
};

const isTemporaryUrl = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.startsWith("blob:");
};

const sanitizeLooseFieldsForPersistence = (fields: LoreEntry["fields"]): LoreEntry["fields"] =>
  Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [
      key,
      typeof value === "string" && isUnsafePersistentUrl(value) ? "" : value
    ])
  );

const sanitizeSpriteAnimationForPersistence = (value: unknown) => {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const spriteSheetAssetId = typeof source.spriteSheetAssetId === "string" ? source.spriteSheetAssetId.trim() : "";
  const animationPresetId = typeof source.animationPresetId === "string" ? source.animationPresetId.trim() : "";
  if (!spriteSheetAssetId || !animationPresetId) return undefined;
  return {
    mode: "spriteAnimation" as const,
    spriteSheetAssetId,
    animationPresetId,
    playback: source.playback === "hover" ? "hover" as const : "autoplay" as const,
    loop: source.loop !== false
  };
};

const repairScribeFoodEntries = (entries: LoreEntry[]) => {
  const repaired = entries.map(repairMisroutedScribeFoodEntry);
  const merged: LoreEntry[] = [];

  repaired.forEach((entry) => {
    if (!isFoodRecipeEntry(entry)) {
      merged.push(entry);
      return;
    }

    const existingIndex = merged.findIndex((candidate) =>
      isFoodRecipeEntry(candidate) && normalizeEntryTitle(candidate.title) === normalizeEntryTitle(entry.title)
    );
    if (existingIndex < 0) {
      merged.push(entry);
      return;
    }

    merged[existingIndex] = mergeFoodDuplicate(merged[existingIndex], entry);
  });

  return merged;
};

const repairMisroutedScribeFoodEntry = (entry: LoreEntry): LoreEntry => {
  if (entry.category === "Food & Inventory") return entry;
  if (!looksLikeMisroutedScribeRecipe(entry)) return entry;

  const fields = { ...entry.fields };
  const wiki = { ...(entry.wiki || {}) };
  const type = recipeTypePattern.test(entry.type) && !/system|wheel/i.test(entry.type)
    ? entry.type
    : inferFoodEntryType(entry);
  const ingredientsRequired = firstText(
    fields.ingredientsRequired,
    fields.Ingredients,
    fields.ingredients,
    wiki.ingredientsRequired
  );
  const gameplayEffect = firstText(
    fields.gameplayEffect,
    fields["Gameplay Effect"],
    fields.magicalEffect,
    fields.gameplayUse,
    wiki.gameplayUse
  );
  const pantryMealGroup = firstText(fields.pantryMealGroup) || inferFoodMealGroup(entry);

  return normalizeEntry({
    ...entry,
    category: "Food & Inventory",
    type,
    tags: uniqueStrings([...entry.tags, type, pantryMealGroupToTitle(pantryMealGroup), "recipe"]),
    summary: cleanScribeRoutingText(entry.summary),
    publicDescription: cleanScribeRoutingText(entry.publicDescription),
    internalLore: cleanScribeRoutingText(entry.internalLore),
    fields: {
      ...fields,
      pantryMealGroup,
      ...(ingredientsRequired ? { ingredientsRequired } : {}),
      ...(gameplayEffect ? { gameplayEffect } : {})
    },
    wiki: {
      ...wiki,
      itemType: wiki.itemType || type,
      ...(ingredientsRequired ? { ingredientsRequired } : {}),
      ...(gameplayEffect ? { gameplayUse: wiki.gameplayUse || gameplayEffect } : {})
    },
    connections: mergeConnections(entry.connections, {
      recipes: pantryMealGroup === "magical-meals" ? ["Magical Meals"] : [],
      gameplaySystems: pantryMealGroup === "magical-meals"
        ? ["Cooking System", "Combat System", "Meal Slot Wheel"]
        : ["Cooking System"]
    }),
    updatedAt: nowIso()
  });
};

const looksLikeMisroutedScribeRecipe = (entry: LoreEntry) => {
  const titleLooksRecipe = /\b(recipe|meal|broth|tonic|ale|consumable)\b/i.test(entry.title) && !/\b(system|wheel|slot)\b/i.test(entry.title);
  const hasRecipeFields = Boolean(
    entry.fields?.ingredientsRequired ||
    entry.fields?.Ingredients ||
    entry.fields?.cookingMethod ||
    entry.wiki?.ingredientsRequired
  );
  const hasRoutingText = /pantry.*meals?\s*\/\s*recipes?|meals?\s*\/\s*recipes? section|belongs under .*meals?/i.test(
    [
      entry.summary,
      entry.publicDescription,
      entry.internalLore,
      JSON.stringify(entry.fields || {}),
      JSON.stringify(entry.wiki || {})
    ].join(" ")
  );
  return hasRecipeFields || (titleLooksRecipe && hasRoutingText);
};

const mergeFoodDuplicate = (base: LoreEntry, duplicate: LoreEntry) =>
  normalizeEntry({
    ...base,
    type: recipeTypePattern.test(base.type) ? base.type : duplicate.type,
    status: base.status || duplicate.status,
    spoilerLevel: base.spoilerLevel || duplicate.spoilerLevel,
    tags: uniqueStrings([...base.tags, ...duplicate.tags]),
    summary: base.summary || duplicate.summary,
    publicDescription: base.publicDescription || duplicate.publicDescription,
    internalLore: base.internalLore || duplicate.internalLore,
    fields: mergeRecord(base.fields, duplicate.fields),
    wiki: mergeRecord(
      (base.wiki || {}) as unknown as Record<string, unknown>,
      (duplicate.wiki || {}) as unknown as Record<string, unknown>
    ) as unknown as LoreEntry["wiki"],
    connections: mergeConnections(base.connections, duplicate.connections),
    updatedAt: nowIso()
  });

const isFoodRecipeEntry = (entry: LoreEntry) =>
  entry.category === "Food & Inventory" && recipeTypePattern.test([
    entry.title,
    entry.type,
    entry.tags.join(" "),
    JSON.stringify(entry.fields || {}),
    JSON.stringify(entry.wiki || {})
  ].join(" "));

const recipeTypePattern = /recipe|meal|broth|tonic|ale|consumable|food magic/i;

const inferFoodEntryType = (entry: LoreEntry) => {
  const value = JSON.stringify({
    title: entry.title,
    type: entry.type,
    tags: entry.tags,
    summary: entry.summary,
    fields: entry.fields,
    wiki: entry.wiki
  }).toLowerCase();
  if (/magical ale|magic ale|buff ale|ability ale|tonic|elixir/.test(value)) return "Magical Ale";
  if (/\bale\b|drink|beverage|brew/.test(value)) return "Ale / Tonic";
  if (/broth|stock|base|component|sauce|prep|reduction/.test(value)) return "Recipe Component";
  if (/magic|magical|power|buff|ability|combat|spell|dark culinary|fire|ice|lightning|earth/.test(value)) return "Magical Meal";
  return "Meal / Recipe";
};

const inferFoodMealGroup = (entry: LoreEntry) => {
  const value = JSON.stringify({
    title: entry.title,
    type: entry.type,
    tags: entry.tags,
    summary: entry.summary,
    fields: entry.fields,
    wiki: entry.wiki
  }).toLowerCase();
  if (/broth|stock|base|component|sauce|prep|reduction/.test(value)) return "components";
  if (/magical ale|magic ale|buff ale|ability ale|tonic|elixir/.test(value)) return "magical-ales";
  if (/\bale\b|drink|beverage|brew/.test(value)) return "ales";
  if (/snack|quick bite|travel bite|stamina|small bite/.test(value)) return "snacks";
  if (/magic|magical|power|buff|ability|combat|spell|dark culinary|fire|ice|lightning|earth/.test(value)) return "magical-meals";
  return "tavern-meals";
};

const pantryMealGroupToTitle = (group: string) => {
  if (group === "magical-meals") return "Magical Meal";
  if (group === "magical-ales") return "Magical Ale";
  if (group === "ales") return "Ale";
  if (group === "snacks") return "Snack";
  if (group === "components") return "Recipe Component";
  return "Tavern Meal";
};

const cleanScribeRoutingText = (value: string) =>
  value
    .replace(/\s+in the pantry'?s?\s+Meals\s*\/\s*Recipes section/gi, "")
    .replace(/\s+in the Meals\s*\/\s*Recipes section/gi, "")
    .replace(/\bIt belongs under the [^.]+?\.\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const mergeRecord = <T extends Record<string, unknown>>(base: T, duplicate: Record<string, unknown> | undefined): T => ({
  ...base,
  ...Object.fromEntries(
    Object.entries(duplicate || {}).filter(([, value]) =>
      value != null && value !== "" && (!Array.isArray(value) || value.length > 0)
    )
  )
}) as T;

const mergeConnections = (
  base: Partial<LoreEntry["connections"]> | undefined,
  patch: Partial<LoreEntry["connections"]> | undefined
): LoreEntry["connections"] => ({
  characters: uniqueStrings([...(base?.characters || []), ...(patch?.characters || [])]),
  locations: uniqueStrings([...(base?.locations || []), ...(patch?.locations || [])]),
  recipes: uniqueStrings([...(base?.recipes || []), ...(patch?.recipes || [])]),
  quests: uniqueStrings([...(base?.quests || []), ...(patch?.quests || [])]),
  items: uniqueStrings([...(base?.items || []), ...(patch?.items || [])]),
  factions: uniqueStrings([...(base?.factions || []), ...(patch?.factions || [])]),
  secrets: uniqueStrings([...(base?.secrets || []), ...(patch?.secrets || [])]),
  gameplaySystems: uniqueStrings([...(base?.gameplaySystems || []), ...(patch?.gameplaySystems || [])]),
  enemies: uniqueStrings([...(base?.enemies || []), ...(patch?.enemies || [])]),
  timelineEvents: uniqueStrings([...(base?.timelineEvents || []), ...(patch?.timelineEvents || [])])
});

const firstText = (...values: unknown[]) =>
  values.map((value) => String(value || "").trim()).find(Boolean) || "";

const uniqueStrings = (values: string[]) =>
  values.map((value) => String(value || "").trim()).filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);

const normalizeEntryTitle = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

