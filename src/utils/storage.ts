import { createStarterDatabase } from "../data/starterData";
import type { LoreBackup, LoreDatabase, LoreEntry, ThemeMode } from "../types";
import { cloneDatabase, normalizeEntry, nowIso } from "./entries";

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
    ? incoming.entries.map((item) => normalizeEntry(item as Partial<LoreEntry>))
    : starter.entries;

  return {
    schemaVersion: currentSchemaVersion,
    entries,
    backups: Array.isArray(incoming.backups)
      ? incoming.backups
          .filter((backup) => backup && Array.isArray((backup as LoreBackup).entries))
          .map((backup) => ({
            id: String((backup as LoreBackup).id || `backup-${Date.now()}`),
            label: String((backup as LoreBackup).label || "Imported backup"),
            createdAt: String((backup as LoreBackup).createdAt || nowIso()),
            entries: (backup as LoreBackup).entries.map((item) => normalizeEntry(item))
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
    localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
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
    entries: cloneDatabase(database).entries
  };

  next.backups = [backup, ...(next.backups || [])].slice(0, 12);
  return next;
};

export const estimateStorageBytes = (database: LoreDatabase) =>
  new Blob([JSON.stringify(database)]).size;

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
