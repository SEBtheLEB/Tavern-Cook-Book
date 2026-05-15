import type {
  ArtVaultImageMetadata,
  ArtVaultSection,
  ArtVaultSlot,
  BestiaryCategoryArtVault,
  BestiaryCreature,
  BestiaryDropIcon,
  BestiaryCreatureDrops,
  BestiaryCreatureHabitatInfo,
  BestiaryCreatureLore,
  BestiaryCreatureStats,
  CharacterArtVault
} from "../types";
import {
  isDefaultArtVaultSectionId,
  isDefaultArtVaultSlotId,
  normalizeArtVault,
  normalizeArtVaultWithFallback,
  nowIso,
  slugify
} from "./entries";
import { extractGoogleDriveFileId, googleDriveThumbnailUrl, legacyCreatureFit, normalizeImageFit } from "./imageFit";
import { normalizeSpriteAnimationSlotReference } from "./spriteAnimationSlots";

const creatureArtVaultBlueprints = [
  {
    id: "creature-core-art",
    title: "Core Creature Art",
    description: "Primary reference art for the creature's silhouette, pose, and final look.",
    requirementType: "Creature Art",
    slots: ["Main Creature Portrait", "Hover / Alternate Pose", "Concept Art", "Turnaround"]
  },
  {
    id: "creature-animation-combat",
    title: "Animation & Combat",
    description: "Movement, attacks, defeat poses, and animation reference for gameplay.",
    requirementType: "Animation Reference",
    slots: [
      "Idle Animation",
      "Move / Crawl Cycle",
      "Attack 01",
      "Attack 02",
      "Hit Reaction",
      "Death / Defeat",
      "Special Ability / Behavior"
    ]
  },
  {
    id: "creature-gameplay-references",
    title: "Gameplay References",
    description: "Drops, habitat, UI, and gameplay-facing creature art.",
    requirementType: "Gameplay Reference",
    slots: ["Drops / Ingredients", "Habitat Reference", "UI Icon"]
  },
  {
    id: "creature-marketing-misc",
    title: "Marketing & Misc Art",
    description: "Promotional, mood, and extra artwork for the creature.",
    requirementType: "Creature Marketing Art",
    slots: ["Marketing Art", "Misc Art"]
  }
] as const;

const slimeCategoryArtVaultBlueprints = [
  {
    id: "slime-family-overview",
    title: "Slime Family Overview",
    description: "Shared visual rules for slime anatomy, flavor magic, and the overall slime family.",
    requirementType: "Slime Family Art",
    slots: [
      "Slime Family Key Art",
      "Slime Anatomy / Shape Language",
      "Flavor Element Chart",
      "Nutrient Pond Formation",
      "Healthy vs Corrupted Slime Comparison",
      "Slime Size Comparison"
    ]
  },
  {
    id: "slime-flavor-lineup",
    title: "Flavor Slime Lineup",
    description: "One shared lineup slot for each flavor slime type.",
    requirementType: "Flavor Slime Variant",
    slots: ["Bitter Slime", "Sweet Slime", "Savory Slime", "Sour Slime", "Salty Slime", "Spicy Slime"]
  },
  {
    id: "slime-gameplay-icons",
    title: "Gameplay & Drop Icons",
    description: "Shared UI, ingredient, drop, and recipe-facing art for slime systems.",
    requirementType: "Slime Gameplay Art",
    slots: [
      "Slime UI Icon",
      "Slime Gel Drop Icons",
      "Flavor Gel Ingredient Sheet",
      "Slime Ale / Tonic Icons",
      "Recipe Substitute Icons",
      "Status Effect Icons"
    ]
  },
  {
    id: "slime-habitats-effects",
    title: "Habitats & Effects",
    description: "Environment references, trails, splashes, reactions, and slime habitat art.",
    requirementType: "Slime Environment Art",
    slots: [
      "Slime Pond Reference",
      "Forest Nutrient Source",
      "Corruption Source",
      "Slime Trail / Splash Effects",
      "Flavor Reaction Effects",
      "Spawn Point Reference"
    ]
  },
  {
    id: "slime-marketing-reference",
    title: "Marketing & Reference",
    description: "Group art, promotional renders, and extra reference for the slime category.",
    requirementType: "Slime Marketing Art",
    slots: ["Slime Group Poster", "Social Media Slime Lineup", "Promotional Render", "Misc Slime Art"]
  }
] as const;

const genericCategoryArtVaultBlueprints = [
  {
    id: "category-overview-art",
    title: "Category Overview Art",
    description: "Shared key art, design rules, and visual identity for this Bestiary category.",
    requirementType: "Category Art",
    slots: ["Category Key Art", "Anatomy / Shape Language", "Color Palette", "Size / Scale Chart"]
  },
  {
    id: "category-lineup-variants",
    title: "Lineup & Variants",
    description: "Lineup slots for creatures inside this category.",
    requirementType: "Creature Lineup Art",
    slots: ["Category Lineup", "Variant Sheet", "Custom Variant"]
  },
  {
    id: "category-gameplay-ui",
    title: "Gameplay & UI",
    description: "Shared gameplay icons, drops, behavior references, and habitat art.",
    requirementType: "Gameplay Reference",
    slots: ["Category UI Icon", "Drop / Ingredient Icons", "Behavior Reference", "Spawn / Habitat Reference"]
  },
  {
    id: "category-marketing-misc",
    title: "Marketing & Misc Art",
    description: "Promotional, mood, and extra artwork for the category.",
    requirementType: "Category Marketing Art",
    slots: ["Promotional Art", "Reference Sheet", "Misc Art"]
  }
] as const;

export const bestiaryTypeOptions = [
  "All Types",
  "Beast",
  "Insect",
  "Undead",
  "Spirit",
  "Plant",
  "Aberration",
  "Boss",
  "Wildlife",
  "Magical Creature"
];

export const bestiaryThreatOptions = [
  "All Temperaments",
  "Passive",
  "Aggressive",
  "Aggro When Hit",
  "Runs Away When Hit",
  "Defensive",
  "Territorial",
  "Boss",
  "Unknown"
];

export const bestiaryHabitatOptions = [
  "All Habitats",
  "Whisker Woods",
  "Mushroom Grottos",
  "Faery Realm",
  "Tabby Island",
  "Caves",
  "Swamps",
  "Mountains",
  "Villages",
  "Unknown"
];

export const bestiarySortOptions = ["Name A-Z", "Temperament", "Recently Updated", "Habitat", "Type"];

export const bestiaryDetailTabs = ["Overview", "Stats", "Drops", "Habitat", "Lore", "Description"] as const;

export type BestiaryDetailTab = (typeof bestiaryDetailTabs)[number];

export const createDefaultCreatureArtVault = (): CharacterArtVault => ({
  sections: creatureArtVaultBlueprints.map((section, sectionIndex) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    order: sectionIndex,
    slots: section.slots.map((slot, slotIndex) =>
      createCreatureArtVaultSlot(section.id, slot, section.requirementType, slotIndex)
    )
  }))
});

export const bestiaryCategoryVaultId = (categoryName: string) =>
  `bestiary-category-${slugify(normalizeCategoryName(categoryName)) || "category"}`;

export const createDefaultBestiaryCategoryArtVault = (
  categoryName: string,
  creatures: Pick<BestiaryCreature, "name" | "category">[] = []
): CharacterArtVault => {
  const normalizedCategory = normalizeCategoryName(categoryName) || "Creature Category";
  const categoryCreatures = creatures.filter((creature) =>
    normalizeCategoryName(creature.category).toLowerCase() === normalizedCategory.toLowerCase()
  );
  const blueprints = /slimes?/i.test(normalizedCategory)
    ? slimeCategoryArtVaultBlueprints
    : genericCategoryArtVaultBlueprints;

  return {
    sections: blueprints.map((section, sectionIndex) => {
      const slots = section.id === "category-lineup-variants" && categoryCreatures.length
        ? [
            "Category Lineup",
            ...categoryCreatures.map((creature) => `${creature.name} Reference`),
            "Custom Variant"
          ]
        : [...section.slots];

      return {
        id: `${bestiaryCategoryVaultId(normalizedCategory)}-${section.id}`,
        title: section.title,
        description: section.description,
        order: sectionIndex,
        slots: slots.map((slot, slotIndex) =>
          createCreatureArtVaultSlot(`${bestiaryCategoryVaultId(normalizedCategory)}-${section.id}`, slot, section.requirementType, slotIndex)
        )
      };
    })
  };
};

export const createBestiaryCategoryArtVaultRecord = (
  categoryName: string,
  creatures: Pick<BestiaryCreature, "name" | "category">[] = []
): BestiaryCategoryArtVault => {
  const normalizedCategory = normalizeCategoryName(categoryName) || "Creature Category";
  const stamp = nowIso();
  return {
    id: bestiaryCategoryVaultId(normalizedCategory),
    categoryName: normalizedCategory,
    title: `${singularCategoryLabel(normalizedCategory)} Art Vault`,
    description: `Shared production art board for ${normalizedCategory.toLowerCase()} creatures and category-wide references.`,
    artVault: createDefaultBestiaryCategoryArtVault(normalizedCategory, creatures),
    driveFolderId: "",
    driveFolderLink: "",
    createdAt: stamp,
    updatedAt: stamp
  };
};

export const normalizeBestiaryCategoryArtVault = (
  input: Partial<BestiaryCategoryArtVault>,
  categoryName = "",
  creatures: Pick<BestiaryCreature, "name" | "category">[] = []
): BestiaryCategoryArtVault => {
  const normalizedCategory = normalizeCategoryName(input.categoryName || categoryName) || "Creature Category";
  const fallback = createBestiaryCategoryArtVaultRecord(normalizedCategory, creatures);
  const hasSections = Boolean(input.artVault && Array.isArray(input.artVault.sections));
  return {
    id: text(input.id) || bestiaryCategoryVaultId(normalizedCategory),
    categoryName: normalizedCategory,
    title: text(input.title) || fallback.title,
    description: text(input.description) || fallback.description,
    artVault: hasSections ? normalizeArtVault(input.artVault) : fallback.artVault,
    driveFolderId: text(input.driveFolderId),
    driveFolderLink: safeImageUrl(input.driveFolderLink),
    createdAt: text(input.createdAt) || fallback.createdAt,
    updatedAt: text(input.updatedAt) || text(input.createdAt) || fallback.updatedAt
  };
};

export const sanitizeBestiaryCategoryArtVaultForPersistence = (
  vault: BestiaryCategoryArtVault
): BestiaryCategoryArtVault => ({
  ...normalizeBestiaryCategoryArtVault(vault, vault.categoryName),
  artVault: {
    sections: (vault.artVault?.sections || []).map((section) => ({
      ...section,
      driveFolderId: text(section.driveFolderId),
      driveFolderLink: safeImageUrl(section.driveFolderLink),
      driveFolderName: text(section.driveFolderName),
      slots: (section.slots || []).map((slot) => ({
        ...slot,
        image: slot.image ? sanitizeArtVaultImage(slot.image) : null
      }))
    }))
  }
});

export const normalizeCreatureArtVault = (value: unknown): CharacterArtVault => {
  if (value && typeof value === "object" && Array.isArray((value as CharacterArtVault).sections)) {
    const normalized = normalizeArtVaultWithFallback(value, createDefaultCreatureArtVault());
    const removedCharacterDefaults = normalized.sections.some(isBlankCharacterDefaultSection);
    const cleaned = removeBlankCharacterDefaultsFromCreatureVault(normalized);
    return removedCharacterDefaults ? ensureCreatureDefaultSections(cleaned) : cleaned;
  }
  return createDefaultCreatureArtVault();
};

function removeBlankCharacterDefaultsFromCreatureVault(vault: CharacterArtVault): CharacterArtVault {
  return {
    sections: vault.sections
      .filter((section) => !isBlankCharacterDefaultSection(section))
      .map((section, order) => ({ ...section, order }))
  };
}

function isBlankCharacterDefaultSection(section: ArtVaultSection) {
  if (!isDefaultArtVaultSectionId(section.id)) return false;
  return section.slots.every((slot) =>
    isDefaultArtVaultSlotId(slot.id) &&
    !slot.image &&
    !slot.notes.trim() &&
    (!slot.status || ["empty", "missing"].includes(String(slot.status).toLowerCase()))
  );
}

function ensureCreatureDefaultSections(vault: CharacterArtVault): CharacterArtVault {
  const defaultSections = createDefaultCreatureArtVault().sections;
  const existingIds = new Set(vault.sections.map((section) => section.id.toLowerCase()));
  const existingTitles = new Set(vault.sections.map((section) => section.title.toLowerCase()));
  const missingDefaults = defaultSections
    .filter((section) => !existingIds.has(section.id.toLowerCase()) && !existingTitles.has(section.title.toLowerCase()))
    .map((section) => ({
      ...section,
      slots: section.slots.map((slot) => ({ ...slot, image: slot.image ? { ...slot.image } : null }))
    }));

  return {
    sections: [...missingDefaults, ...vault.sections].map((section, order) => ({ ...section, order }))
  };
}

export const createBlankBestiaryCreature = (): BestiaryCreature =>
  normalizeBestiaryCreature({
    id: `creature-${Date.now()}`,
    name: "New Creature",
    category: "Wildlife",
    type: "Beast",
    status: "WIP",
    threatLevel: "Unknown",
    rarity: "Unknown",
    habitat: "Unknown",
    description: ""
  });

export const normalizeBestiaryCreature = (input: Partial<BestiaryCreature>): BestiaryCreature => {
  const name = text(input.name) || "Untitled Creature";
  const createdAt = text(input.createdAt) || nowIso();
  const legacyFit = legacyCreatureFit(input.imagePositionX, input.imagePositionY, input.imageZoom);
  const imageFit = normalizeImageFit(input.imageFit, legacyFit);
  const hoverImageFit = normalizeImageFit(input.hoverImageFit, legacyFit);
  const image = safeImageUrl(input.image);
  const hoverImage = safeImageUrl(input.hoverImage);
  const slotImage = hasOwnValue(input, "slotImage") ? safeImageUrl(input.slotImage) : image || hoverImage;
  const expandedImage = hasOwnValue(input, "expandedImage") ? safeImageUrl(input.expandedImage) : image || slotImage || hoverImage;

  return {
    id: text(input.id) || `${slugify(name) || "creature"}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    category: text(input.category) || inferBestiaryCategory({ ...input, name }),
    type: text(input.type) || "Beast",
    slotImage,
    image,
    expandedImage,
    hoverImage,
    imagePositionX: numberInRange(input.imagePositionX, 0, 100, 50),
    imagePositionY: numberInRange(input.imagePositionY, 0, 100, 50),
    imageZoom: numberInRange(input.imageZoom, 1, 3, 1),
    slotImageFit: normalizeImageFit(input.slotImageFit, imageFit),
    imageFit,
    hoverImageFit,
    expandedImageFit: normalizeImageFit(input.expandedImageFit, imageFit),
    status: text(input.status) || "WIP",
    threatLevel: text(input.threatLevel) || "Unknown",
    rarity: text(input.rarity) || "Unknown",
    size: text(input.size) || "Unknown",
    diet: text(input.diet) || "Unknown",
    habitat: text(input.habitat) || "Unknown",
    behavior: text(input.behavior),
    description: text(input.description),
    overview: text(input.overview),
    fieldNotes: text(input.fieldNotes),
    stats: normalizeStats(input.stats),
    drops: normalizeDrops(input.drops),
    habitatInfo: normalizeHabitatInfo(input.habitatInfo),
    lore: normalizeLore(input.lore),
    visualDesignNotes: text(input.visualDesignNotes),
    animationNotes: text(input.animationNotes),
    soundNotes: text(input.soundNotes),
    gameplayPurpose: text(input.gameplayPurpose),
    productionNotes: text(input.productionNotes),
    artVault: normalizeCreatureArtVault(input.artVault),
    driveFolderId: text(input.driveFolderId),
    driveFolderLink: text(input.driveFolderLink),
    createdAt,
    updatedAt: text(input.updatedAt) || createdAt
  };
};

export const sanitizeBestiaryCreatureForPersistence = (creature: BestiaryCreature): BestiaryCreature => ({
  ...creature,
  category: text(creature.category) || inferBestiaryCategory(creature),
  slotImage: safeImageUrl(creature.slotImage),
  image: safeImageUrl(creature.image),
  expandedImage: safeImageUrl(creature.expandedImage),
  hoverImage: safeImageUrl(creature.hoverImage),
  imagePositionX: numberInRange(creature.imagePositionX, 0, 100, 50),
  imagePositionY: numberInRange(creature.imagePositionY, 0, 100, 50),
  imageZoom: numberInRange(creature.imageZoom, 1, 3, 1),
  slotImageFit: normalizeImageFit(creature.slotImageFit, creature.imageFit),
  imageFit: normalizeImageFit(creature.imageFit),
  hoverImageFit: normalizeImageFit(creature.hoverImageFit),
  expandedImageFit: normalizeImageFit(creature.expandedImageFit, creature.imageFit),
  drops: {
    ...creature.drops,
    icons: (creature.drops?.icons || []).map(sanitizeDropIcon)
  },
  artVault: {
    sections: (creature.artVault?.sections || []).map((section) => ({
      ...section,
      driveFolderId: text(section.driveFolderId),
      driveFolderLink: safeImageUrl(section.driveFolderLink),
      driveFolderName: text(section.driveFolderName),
      slots: (section.slots || []).map((slot) => ({
        ...slot,
        image: slot.image ? sanitizeArtVaultImage(slot.image) : null
      }))
    }))
  }
});

function inferBestiaryCategory(input: Partial<BestiaryCreature>) {
  const haystack = [
    input.name,
    input.type,
    input.status,
    input.threatLevel,
    input.habitat,
    input.behavior,
    input.description,
    input.overview
  ].join(" ").toLowerCase();

  if (/slime/.test(haystack)) return "Slimes";
  if (/boss|mini-boss|miniboss|queen/.test(haystack) || text(input.threatLevel) === "Boss") return "Bosses";
  if (/corrupt|dark|cursed|hollow|dusk/.test(haystack)) return "Corrupted";
  if (/friendly|ally|passive|neutral|merchant|runs away/.test(haystack)) return "Friendly";
  if (/insect|bug|beetle|moth|grub|husk|prawn|cray/.test(haystack)) return "Insects";
  if (/wildlife|beast|boar|tortoise|bird|fish|animal/.test(haystack)) return "Wildlife";
  return "Region-Based";
}

function normalizeCategoryName(value: string) {
  return text(value).replace(/\s+/g, " ").trim();
}

function singularCategoryLabel(categoryName: string) {
  if (/^slimes$/i.test(categoryName)) return "Slime";
  if (/^bosses$/i.test(categoryName)) return "Boss";
  if (/^insects$/i.test(categoryName)) return "Insect";
  return categoryName.replace(/s$/i, "");
}

function createCreatureArtVaultSlot(
  sectionId: string,
  label: string,
  requirementType: string,
  order: number
): ArtVaultSlot {
  return {
    id: `${sectionId}-${slugify(label) || order}`,
    label,
    requirementType,
    status: "empty",
    image: null,
    notes: "",
    order
  };
}

function normalizeStats(value: unknown): BestiaryCreatureStats {
  const stats = objectValue(value) as Partial<BestiaryCreatureStats>;
  return {
    health: text(stats.health),
    damage: text(stats.damage),
    speed: text(stats.speed),
    defense: text(stats.defense),
    aggression: text(stats.aggression),
    weakness: text(stats.weakness),
    resistances: text(stats.resistances),
    abilities: text(stats.abilities),
    attackPatterns: text(stats.attackPatterns),
    bossPhaseNotes: text(stats.bossPhaseNotes)
  };
}

function normalizeDrops(value: unknown): BestiaryCreatureDrops {
  const drops = objectValue(value) as Partial<BestiaryCreatureDrops>;
  return {
    droppedIngredients: text(drops.droppedIngredients),
    craftingMaterials: text(drops.craftingMaterials),
    rareDrops: text(drops.rareDrops),
    cookingUses: text(drops.cookingUses),
    sellValue: text(drops.sellValue),
    recipeConnections: text(drops.recipeConnections),
    icons: normalizeDropIcons((drops as Partial<BestiaryCreatureDrops>).icons)
  };
}

function normalizeDropIcons(value: unknown): BestiaryDropIcon[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const icon = objectValue(item) as Partial<BestiaryDropIcon>;
    return {
      id: text(icon.id) || `drop-icon-${Date.now()}-${index}`,
      label: text(icon.label) || "Unnamed Drop",
      category: text(icon.category) || "Dropped Ingredients",
      image: safePersistentDropIconImage(icon.image),
      notes: text(icon.notes)
    };
  });
}

function normalizeHabitatInfo(value: unknown): BestiaryCreatureHabitatInfo {
  const habitat = objectValue(value) as Partial<BestiaryCreatureHabitatInfo>;
  return {
    knownLocations: text(habitat.knownLocations),
    spawnConditions: text(habitat.spawnConditions),
    timeOfDay: text(habitat.timeOfDay),
    season: text(habitat.season),
    weatherConditions: text(habitat.weatherConditions),
    nearbyPointsOfInterest: text(habitat.nearbyPointsOfInterest),
    mapNotes: text(habitat.mapNotes)
  };
}

function normalizeLore(value: unknown): BestiaryCreatureLore {
  const lore = objectValue(value) as Partial<BestiaryCreatureLore>;
  return {
    origin: text(lore.origin),
    culturalMeaning: text(lore.culturalMeaning),
    rumors: text(lore.rumors),
    questConnections: text(lore.questConnections),
    relatedCreatures: text(lore.relatedCreatures),
    hiddenNotes: text(lore.hiddenNotes),
    fullStory: text(lore.fullStory)
  };
}

function objectValue(value: unknown) {
  return value && typeof value === "object" ? value : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function numberInRange(value: unknown, min: number, max: number, fallback: number) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : fallback;
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}

function sanitizeArtVaultImage(image: ArtVaultImageMetadata): ArtVaultImageMetadata {
  return {
    ...image,
    thumbnailUrl: normalizeDriveBackedImageUrl(image.thumbnailUrl, image.driveFileId),
    webViewLink: safeImageUrl(image.webViewLink),
    notes: text(image.notes),
    assetState: image.assetState === "final" ? "final" : image.assetState === "wip" ? "wip" : undefined,
    fileName: text(image.fileName),
    downloadUrl: safeImageUrl(image.downloadUrl),
    uploadedByName: text(image.uploadedByName),
    uploadedByEmail: text(image.uploadedByEmail),
    uploadedAt: text(image.uploadedAt),
    lastUpdatedByName: text(image.lastUpdatedByName),
    lastUpdatedByEmail: text(image.lastUpdatedByEmail),
    lastUpdatedAt: text(image.lastUpdatedAt),
    imageFit: normalizeImageFit(image.imageFit),
    driveFolderId: text(image.driveFolderId),
    driveFolderLink: text(image.driveFolderLink),
    driveFolderName: text(image.driveFolderName),
    spriteAnimation: normalizeSpriteAnimationSlotReference(image.spriteAnimation)
  };
}

function sanitizeDropIcon(icon: BestiaryDropIcon): BestiaryDropIcon {
  return {
    ...icon,
    id: text(icon.id),
    label: text(icon.label) || "Unnamed Drop",
    category: text(icon.category) || "Dropped Ingredients",
    image: safePersistentDropIconImage(icon.image),
    notes: text(icon.notes)
  };
}

function hasOwnValue(source: object, key: string) {
  return Object.prototype.hasOwnProperty.call(source, key);
}
function safePersistentDropIconImage(value: unknown) {
  const normalized = text(value).trim();
  const lower = normalized.toLowerCase();
  if (lower.startsWith("blob:")) return "";
  if (lower.startsWith("data:") && !lower.startsWith("data:image/")) return "";
  return normalized;
}

function safeImageUrl(value: unknown) {
  const normalized = text(value).trim();
  const lower = normalized.toLowerCase();
  return lower.startsWith("blob:") || lower.startsWith("data:") ? "" : normalized;
}

function normalizeDriveBackedImageUrl(value: unknown, driveFileId: unknown) {
  const imageUrl = safeImageUrl(value);
  const fileId = text(driveFileId).trim();
  if (!fileId) return imageUrl;
  const storedFileId = extractGoogleDriveFileId(imageUrl);
  return storedFileId === fileId ? imageUrl : googleDriveThumbnailUrl(fileId);
}

