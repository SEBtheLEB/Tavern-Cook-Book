import type { AccessRole, ActiveView, GoogleAccountUser, LoreDatabase } from "../types";
import { databaseSyncHash } from "./cloudSync";
import { migrateDatabase, sanitizeDatabaseForPersistence } from "./storage";

export const TAVERN_REALTIME_ROOM_ID = import.meta.env.VITE_TAVERN_REALTIME_ROOM_ID || "tavern-cook-book:shared-v2";
export const TAVERN_REALTIME_ENABLED = import.meta.env.VITE_TAVERN_REALTIME_DISABLED !== "true";

export interface RealtimeLocation {
  view: ActiveView;
  label: string;
  entryId?: string;
  entryTitle?: string;
}

export interface RealtimeTarget {
  type: "entry" | "character" | "creature" | "art-slot" | "world" | "module";
  id: string;
  label: string;
  module?: string;
}

export interface RealtimeProfile {
  name: string;
  email: string;
  picture: string;
  role: AccessRole;
}

export interface TavernPresence {
  profile: RealtimeProfile | null;
  location: RealtimeLocation | null;
  hovering: RealtimeTarget | null;
}

export interface RealtimeUserSummary {
  connectionId: number;
  name: string;
  email: string;
  picture: string;
  role: AccessRole;
  location: RealtimeLocation | null;
  hovering: RealtimeTarget | null;
}

export function realtimeProfileFromUser(user: GoogleAccountUser): RealtimeProfile {
  return {
    name: user.name,
    email: user.email,
    picture: user.picture || "",
    role: user.role
  };
}

export function normalizeRealtimeDatabase(value: unknown): LoreDatabase | null {
  if (!value || typeof value !== "object") return null;
  try {
    return migrateDatabase(value);
  } catch {
    return null;
  }
}

export function mergeDatabaseChange(
  previousDatabase: LoreDatabase,
  nextDatabase: LoreDatabase,
  remoteDatabase: LoreDatabase
) {
  const previous = sanitizeDatabaseForPersistence(previousDatabase);
  const next = sanitizeDatabaseForPersistence(nextDatabase);
  const remote = sanitizeDatabaseForPersistence(remoteDatabase);

  if (databaseSyncHash(previous) === databaseSyncHash(next)) return remote;
  if (databaseSyncHash(previous) === databaseSyncHash(remote)) return migrateDatabase(next);

  const worldBuilding = { ...remote.worldBuilding };
  const worldCategories = new Set([
    ...Object.keys(previous.worldBuilding || {}),
    ...Object.keys(next.worldBuilding || {}),
    ...Object.keys(remote.worldBuilding || {})
  ]);
  worldCategories.forEach((category) => {
    const key = category as keyof LoreDatabase["worldBuilding"];
    worldBuilding[key] = mergeRecordArray(
      previous.worldBuilding?.[key] || [],
      next.worldBuilding?.[key] || [],
      remote.worldBuilding?.[key] || []
    ) as LoreDatabase["worldBuilding"][typeof key];
  });

  return migrateDatabase({
    ...remote,
    entries: mergeRecordArray(previous.entries || [], next.entries || [], remote.entries || []),
    bestiary: mergeRecordArray(previous.bestiary || [], next.bestiary || [], remote.bestiary || []),
    bestiaryCategoryVaults: mergeRecordArray(
      previous.bestiaryCategoryVaults || [],
      next.bestiaryCategoryVaults || [],
      remote.bestiaryCategoryVaults || []
    ),
    branding: sameValue(previous.branding, next.branding) ? remote.branding : next.branding,
    worldBuilding
  });
}

function mergeRecordArray<T extends { id: string }>(previousItems: T[], nextItems: T[], remoteItems: T[]) {
  const previousById = new Map(previousItems.map((item) => [item.id, item] as const));
  const nextById = new Map(nextItems.map((item) => [item.id, item] as const));
  const remoteById = new Map(remoteItems.map((item) => [item.id, item] as const));
  const deletedIds = new Set<string>();
  const changed = new Map<string, T>();

  previousItems.forEach((previousItem) => {
    const nextItem = nextById.get(previousItem.id);
    if (!nextItem) {
      deletedIds.add(previousItem.id);
      return;
    }
    if (!sameValue(previousItem, nextItem)) {
      changed.set(nextItem.id, nextItem);
    }
  });

  nextItems.forEach((nextItem) => {
    if (!previousById.has(nextItem.id)) {
      changed.set(nextItem.id, nextItem);
    }
  });

  const orderedIds = new Set<string>();
  const merged: T[] = [];

  nextItems.forEach((nextItem) => {
    if (deletedIds.has(nextItem.id)) return;
    const item = changed.get(nextItem.id) || remoteById.get(nextItem.id) || nextItem;
    merged.push(item);
    orderedIds.add(item.id);
  });

  remoteItems.forEach((remoteItem) => {
    if (orderedIds.has(remoteItem.id) || deletedIds.has(remoteItem.id)) return;
    merged.push(remoteItem);
  });

  return merged;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
