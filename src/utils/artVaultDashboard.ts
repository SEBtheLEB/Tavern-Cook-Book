import type { ArtVaultSlot, BestiaryCategoryArtVault, BestiaryCreature, CharacterArtVault, LoreDatabase, LoreEntry } from "../types";
import { normalizeBestiaryCategoryArtVault, normalizeCreatureArtVault } from "./bestiary";
import { normalizeArtVault } from "./entries";

export interface ArtVaultCompletion {
  total: number;
  filled: number;
  missing: number;
  approved: number;
  percent: number;
}

export interface ArtVaultDashboardItem extends ArtVaultCompletion {
  id: string;
  title: string;
  subtitle: string;
  kind: "character" | "bestiary" | "pantry" | "environment";
  sourceId: string;
}

export interface ArtVaultDashboardGroup extends ArtVaultCompletion {
  id: "characters" | "bestiary" | "pantry" | "environment";
  label: string;
  description: string;
  icon: string;
  items: ArtVaultDashboardItem[];
}

export interface ArtVaultDashboardStats extends ArtVaultCompletion {
  groups: ArtVaultDashboardGroup[];
  needsUpload: ArtVaultDashboardItem[];
}

const emptyCompletion = (): ArtVaultCompletion => ({
  total: 0,
  filled: 0,
  missing: 0,
  approved: 0,
  percent: 0
});

export function buildArtVaultDashboardStats(database: LoreDatabase): ArtVaultDashboardStats {
  const characterItems = database.entries
    .filter(isCharacterEntry)
    .map(characterToDashboardItem);
  const bestiaryItems = [
    ...(database.bestiary || []).map(creatureToDashboardItem),
    ...(database.bestiaryCategoryVaults || []).map(categoryVaultToDashboardItem)
  ];
  const pantryItems = database.entries
    .filter((entry) => entry.category === "Food & Inventory")
    .map(pantryToDashboardItem);
  const environmentItems = database.entries
    .filter((entry) => entry.category === "World")
    .map(environmentToDashboardItem);

  const groups: ArtVaultDashboardGroup[] = [
    {
      id: "characters",
      label: "Characters",
      description: "Dialogue sprites, gameplay sprites, tool pose kits, turnarounds, marketing poses, and character reference art.",
      icon: "Users",
      items: characterItems,
      ...sumCompletion(characterItems)
    },
    {
      id: "bestiary",
      label: "Bestiary",
      description: "Creature portraits, attack poses, drops, habitat references, icons, and marketing art.",
      icon: "Swords",
      items: bestiaryItems,
      ...sumCompletion(bestiaryItems)
    },
    {
      id: "pantry",
      label: "The Pantry",
      description: "Inventory icons, prepared ingredient variants, menu cards, recipe images, and food UI art.",
      icon: "Soup",
      items: pantryItems,
      ...sumCompletion(pantryItems)
    },
    {
      id: "environment",
      label: "Environment",
      description: "World/location cover art, map markers, reference galleries, and environmental screenshots.",
      icon: "Map",
      items: environmentItems,
      ...sumCompletion(environmentItems)
    }
  ];

  const totals = sumCompletion(groups);
  const needsUpload = [...characterItems, ...bestiaryItems, ...pantryItems, ...environmentItems]
    .filter((item) => item.missing > 0)
    .sort((left, right) => right.missing - left.missing || left.title.localeCompare(right.title))
    .slice(0, 12);

  return {
    ...totals,
    groups,
    needsUpload
  };
}

function characterToDashboardItem(entry: LoreEntry): ArtVaultDashboardItem {
  return {
    id: `character-${entry.id}`,
    sourceId: entry.id,
    title: entry.title,
    subtitle: entry.type || entry.status || "Character",
    kind: "character",
    ...vaultCompletion(normalizeArtVault(entry.artVault))
  };
}

function creatureToDashboardItem(creature: BestiaryCreature): ArtVaultDashboardItem {
  return {
    id: `bestiary-${creature.id}`,
    sourceId: creature.id,
    title: creature.name,
    subtitle: creature.type || creature.status || "Creature",
    kind: "bestiary",
    ...vaultCompletion(normalizeCreatureArtVault(creature.artVault))
  };
}

function categoryVaultToDashboardItem(vault: BestiaryCategoryArtVault): ArtVaultDashboardItem {
  const normalized = normalizeBestiaryCategoryArtVault(vault, vault.categoryName);
  return {
    id: `bestiary-category-${normalized.id}`,
    sourceId: normalized.id,
    title: normalized.title,
    subtitle: `${normalized.categoryName} Category Vault`,
    kind: "bestiary",
    ...vaultCompletion(normalized.artVault)
  };
}

function pantryToDashboardItem(entry: LoreEntry): ArtVaultDashboardItem {
  const slots = [
    Boolean(entry.media.iconImage || entry.fields?.imageUrl),
    Boolean(entry.media.mainImage)
  ];
  const filled = slots.filter(Boolean).length;
  const total = slots.length;
  return {
    id: `pantry-${entry.id}`,
    sourceId: entry.id,
    title: entry.title,
    subtitle: entry.type || "Food & Inventory",
    kind: "pantry",
    total,
    filled,
    missing: total - filled,
    approved: 0,
    percent: completionPercent(filled, total)
  };
}

function environmentToDashboardItem(entry: LoreEntry): ArtVaultDashboardItem {
  const slots = [
    Boolean(entry.media.mainImage),
    Boolean(entry.media.iconImage),
    entry.media.galleryImages.length > 0
  ];
  const filled = slots.filter(Boolean).length;
  const total = slots.length;
  return {
    id: `environment-${entry.id}`,
    sourceId: entry.id,
    title: entry.title,
    subtitle: entry.type || "World / Environment",
    kind: "environment",
    total,
    filled,
    missing: total - filled,
    approved: 0,
    percent: completionPercent(filled, total)
  };
}

function vaultCompletion(vault: CharacterArtVault): ArtVaultCompletion {
  const slots = vault.sections.flatMap((section) => section.slots || []);
  const total = slots.length;
  const filled = slots.filter(isVaultSlotFilled).length;
  const approved = slots.filter((slot) => slot.status === "approved").length;
  return {
    total,
    filled,
    missing: total - filled,
    approved,
    percent: completionPercent(filled, total)
  };
}

function sumCompletion(items: ArtVaultCompletion[]): ArtVaultCompletion {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const filled = items.reduce((sum, item) => sum + item.filled, 0);
  const approved = items.reduce((sum, item) => sum + item.approved, 0);
  return {
    total,
    filled,
    missing: Math.max(0, total - filled),
    approved,
    percent: completionPercent(filled, total)
  };
}

function completionPercent(filled: number, total: number) {
  return total ? Math.round((filled / total) * 100) : 0;
}

function isVaultSlotFilled(slot: ArtVaultSlot) {
  return Boolean(slot.image?.driveFileId || slot.image?.thumbnailUrl || slot.image?.webViewLink);
}

function isCharacterEntry(entry: LoreEntry) {
  return entry.category === "Characters" || entry.type.toLowerCase().includes("character");
}

export const emptyArtVaultDashboardStats = (): ArtVaultDashboardStats => ({
  ...emptyCompletion(),
  groups: [],
  needsUpload: []
});
