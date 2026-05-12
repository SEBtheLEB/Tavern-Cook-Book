import type {
  BestiaryCategoryArtVault,
  BestiaryCreature,
  LoreDatabase,
  LoreEntry,
  WorldBuildingCategoryId,
  WorldBuildingEntry
} from "../types";
import { migrateDatabase, sanitizeDatabaseForPersistence } from "./storage";

export type PublishChangeAction = "added" | "updated" | "removed";
export type PublishChangeKind = "entry" | "creature" | "worldEntry" | "bestiaryCategoryVault" | "branding";

export interface PublishChange {
  id: string;
  kind: PublishChangeKind;
  action: PublishChangeAction;
  title: string;
  moduleLabel: string;
  summary: string;
  defaultSelected: boolean;
  entryId?: string;
  creatureId?: string;
  vaultId?: string;
  worldCategory?: WorldBuildingCategoryId | string;
  worldEntryId?: string;
}

export function buildPublishChanges(currentDatabase: LoreDatabase, publishedDatabase: LoreDatabase): PublishChange[] {
  const current = sanitizeDatabaseForPersistence(currentDatabase);
  const published = sanitizeDatabaseForPersistence(publishedDatabase);
  return [
    ...diffEntries(current.entries || [], published.entries || []),
    ...diffCreatures(current.bestiary || [], published.bestiary || []),
    ...diffWorldEntries(current.worldBuilding, published.worldBuilding),
    ...diffBestiaryCategoryVaults(current.bestiaryCategoryVaults || [], published.bestiaryCategoryVaults || []),
    ...diffBranding(current, published)
  ].sort((left, right) => left.moduleLabel.localeCompare(right.moduleLabel) || left.title.localeCompare(right.title));
}

export function applySelectedPublishChanges(
  currentDatabase: LoreDatabase,
  publishedDatabase: LoreDatabase,
  selectedChangeIds: string[]
) {
  const selected = new Set(selectedChangeIds);
  const changes = buildPublishChanges(currentDatabase, publishedDatabase).filter((change) => selected.has(change.id));
  const current = sanitizeDatabaseForPersistence(currentDatabase);
  const next = sanitizeDatabaseForPersistence(publishedDatabase);

  changes.forEach((change) => {
    if (change.kind === "entry" && change.entryId) {
      next.entries = applyArrayChange(
        next.entries || [],
        current.entries || [],
        change.entryId,
        change.action
      );
    }

    if (change.kind === "creature" && change.creatureId) {
      next.bestiary = applyArrayChange(
        next.bestiary || [],
        current.bestiary || [],
        change.creatureId,
        change.action
      );
    }

    if (change.kind === "bestiaryCategoryVault" && change.vaultId) {
      next.bestiaryCategoryVaults = applyArrayChange(
        next.bestiaryCategoryVaults || [],
        current.bestiaryCategoryVaults || [],
        change.vaultId,
        change.action
      );
    }

    if (change.kind === "worldEntry" && change.worldCategory && change.worldEntryId) {
      const category = change.worldCategory as WorldBuildingCategoryId;
      next.worldBuilding = {
        ...next.worldBuilding,
        [category]: applyArrayChange(
          next.worldBuilding?.[category] || [],
          current.worldBuilding?.[category] || [],
          change.worldEntryId,
          change.action
        )
      };
    }

    if (change.kind === "branding") {
      next.branding = current.branding;
    }
  });

  return migrateDatabase(next);
}

function diffEntries(current: LoreEntry[], published: LoreEntry[]) {
  return diffById(current, published, "entry", (entry) => ({
    title: entry.title || "Untitled Entry",
    moduleLabel: entry.category || "Lore Entry",
    summary: `${entry.category || "Entry"} / ${entry.type || "Module"}`,
    entryId: entry.id
  }));
}

function diffCreatures(current: BestiaryCreature[], published: BestiaryCreature[]) {
  return diffById(current, published, "creature", (creature) => ({
    title: creature.name || "Untitled Creature",
    moduleLabel: "Bestiary",
    summary: `${creature.category || "Creature"} / ${creature.type || "Bestiary"}`,
    creatureId: creature.id
  }));
}

function diffBestiaryCategoryVaults(current: BestiaryCategoryArtVault[], published: BestiaryCategoryArtVault[]) {
  return diffById(current, published, "bestiaryCategoryVault", (vault) => ({
    title: vault.title || vault.categoryName || "Untitled Art Binder",
    moduleLabel: "Art Binder",
    summary: `Bestiary art category / ${vault.categoryName || "Category"}`,
    vaultId: vault.id
  }));
}

function diffWorldEntries(current: LoreDatabase["worldBuilding"], published: LoreDatabase["worldBuilding"]) {
  const categories = new Set([
    ...Object.keys(current || {}),
    ...Object.keys(published || {})
  ]);

  return [...categories].flatMap((category) =>
    diffById(
      current?.[category as WorldBuildingCategoryId] || [],
      published?.[category as WorldBuildingCategoryId] || [],
      "worldEntry",
      (entry: WorldBuildingEntry) => ({
        title: entry.title || "Untitled World Entry",
        moduleLabel: `World Building / ${category}`,
        summary: `${entry.type || "World entry"} / ${entry.tags?.slice(0, 3).join(", ") || "No tags"}`,
        worldCategory: category,
        worldEntryId: entry.id
      })
    )
  );
}

function diffBranding(current: LoreDatabase, published: LoreDatabase): PublishChange[] {
  if (stableString(current.branding) === stableString(published.branding)) return [];
  return [{
    id: "branding:studio",
    kind: "branding",
    action: published.branding?.logoImage || published.branding?.studioName ? "updated" : "added",
    title: "STL Productionz Branding",
    moduleLabel: "Branding",
    summary: "Studio name or logo image changed.",
    defaultSelected: true
  }];
}

function diffById<T extends { id: string }>(
  current: T[],
  published: T[],
  kind: PublishChangeKind,
  details: (item: T) => Omit<PublishChange, "id" | "kind" | "action" | "defaultSelected">
): PublishChange[] {
  const currentById = new Map(current.map((item) => [item.id, item] as const));
  const publishedById = new Map(published.map((item) => [item.id, item] as const));
  const changes: PublishChange[] = [];

  current.forEach((item) => {
    const oldItem = publishedById.get(item.id);
    if (!oldItem) {
      changes.push(toChange(kind, "added", details(item)));
      return;
    }
    if (stableString(item) !== stableString(oldItem)) {
      changes.push(toChange(kind, "updated", details(item)));
    }
  });

  published.forEach((item) => {
    if (currentById.has(item.id)) return;
    changes.push(toChange(kind, "removed", details(item)));
  });

  return changes;
}

function toChange(
  kind: PublishChangeKind,
  action: PublishChangeAction,
  details: Omit<PublishChange, "id" | "kind" | "action" | "defaultSelected">
): PublishChange {
  const targetId =
    details.entryId ||
    details.creatureId ||
    details.vaultId ||
    (details.worldCategory && details.worldEntryId ? `${details.worldCategory}:${details.worldEntryId}` : "studio");
  return {
    ...details,
    id: `${kind}:${targetId}:${action}`,
    kind,
    action,
    defaultSelected: action !== "removed"
  };
}

function applyArrayChange<T extends { id: string }>(
  publishedItems: T[],
  currentItems: T[],
  id: string,
  action: PublishChangeAction
) {
  if (action === "removed") {
    return publishedItems.filter((item) => item.id !== id);
  }

  const currentItem = currentItems.find((item) => item.id === id);
  if (!currentItem) return publishedItems;
  if (publishedItems.some((item) => item.id === id)) {
    return publishedItems.map((item) => item.id === id ? currentItem : item);
  }
  return [currentItem, ...publishedItems];
}

function stableString(value: unknown) {
  return JSON.stringify(value);
}
