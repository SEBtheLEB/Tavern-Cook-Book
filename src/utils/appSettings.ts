import type { AccessUserPermission, ActiveView } from "../types";
import { DEFAULT_ACCESS_USERS, loadAccessUsers, saveAccessUsers } from "./accessControl";
import {
  type DriveSettings,
  getDriveSettings,
  normalizeDriveSettings,
  saveDriveSettings
} from "./driveSettings";

export interface AppVisibilitySettings {
  hiddenForMembers: ActiveView[];
}

export interface AppSyncSettings {
  visibility: AppVisibilitySettings;
  accessUsers: AccessUserPermission[];
  driveSettings: DriveSettings;
}

export const APP_SYNC_SETTINGS_KEY = "tavern-cook-book:sync-settings";

const hideableTabs: ActiveView[] = [
  "storyJourney",
  "story",
  "quests",
  "gameplay",
  "food",
  "characters",
  "world",
  "bestiary",
  "marketing",
  "archive"
];

export function createDefaultAppSyncSettings(): AppSyncSettings {
  return {
    visibility: {
      hiddenForMembers: []
    },
    accessUsers: loadAccessUsers(),
    driveSettings: getDriveSettings()
  };
}

export function loadAppSyncSettings(): AppSyncSettings {
  try {
    const raw = localStorage.getItem(APP_SYNC_SETTINGS_KEY);
    if (!raw) return createDefaultAppSyncSettings();
    return normalizeAppSyncSettings(JSON.parse(raw));
  } catch {
    return createDefaultAppSyncSettings();
  }
}

export function saveAppSyncSettings(settings: AppSyncSettings) {
  const normalized = normalizeAppSyncSettings(settings);
  localStorage.setItem(APP_SYNC_SETTINGS_KEY, JSON.stringify(normalized));
  saveAccessUsers(normalized.accessUsers);
  saveDriveSettings(normalized.driveSettings);
}

export function normalizeAppSyncSettings(value: unknown): AppSyncSettings {
  const source = value && typeof value === "object" ? value as Partial<AppSyncSettings> : {};
  const visibility = source.visibility && typeof source.visibility === "object"
    ? source.visibility as Partial<AppVisibilitySettings>
    : {};
  const hiddenForMembers = Array.isArray(visibility.hiddenForMembers)
    ? visibility.hiddenForMembers.filter((id): id is ActiveView => hideableTabs.includes(id as ActiveView))
    : [];
  const accessUsers = Array.isArray(source.accessUsers) && source.accessUsers.length
    ? normalizeAccessUsers(source.accessUsers)
    : loadAccessUsers();
  const driveSettings = source.driveSettings
    ? normalizeDriveSettings(source.driveSettings)
    : getDriveSettings();

  return {
    visibility: {
      hiddenForMembers: [...new Set(hiddenForMembers)]
    },
    accessUsers,
    driveSettings
  };
}

export function getHideableNavigationTabs() {
  return hideableTabs;
}

function normalizeAccessUsers(users: unknown[]): AccessUserPermission[] {
  const normalized: AccessUserPermission[] = [];
  users.forEach((user) => {
    if (!user || typeof user !== "object") return;
    const candidate = user as Partial<AccessUserPermission>;
    const email = String(candidate.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    normalized.push({
      email,
      role: candidate.role === "admin" || candidate.role === "editor" || candidate.role === "viewer" ? candidate.role : "viewer",
      label: typeof candidate.label === "string" ? candidate.label : ""
    });
  });

  const byEmail = new Map<string, AccessUserPermission>();
  [...DEFAULT_ACCESS_USERS, ...normalized].forEach((user) => {
    byEmail.set(user.email, user);
  });

  return [...byEmail.values()];
}
