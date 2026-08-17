import type { AccessUserPermission, ActiveView } from "../types";
import { DEFAULT_ACCESS_USERS, loadAccessUsers, normalizeAccessRole, saveAccessUsers } from "./accessControl";
import {
  type DriveSettings,
  getDriveSettings,
  normalizeDriveSettings,
  saveDriveSettings
} from "./driveSettings";

export interface AppVisibilitySettings {
  hiddenForMembers: ActiveView[];
  hiddenByMemberEmail: Record<string, ActiveView[]>;
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
  "artVault",
  "artDirection",
  "developmentBoard",
  "roadmap",
  "marketing",
  "archive"
];

const freelancerLockedTabs: ActiveView[] = [
  "storyJourney",
  "story",
  "quests",
  "gameplay",
  "food",
  "characters",
  "world",
  "bestiary",
  "artDirection",
  "developmentBoard",
  "roadmap",
  "marketing",
  "archive",
  "settings",
  "search",
  "timeline",
  "secrets",
  "recipes",
  "ingredients",
  "items",
  "enemies",
  "factions",
  "spriteAnimator"
];

export function createDefaultAppSyncSettings(): AppSyncSettings {
  return {
    visibility: {
      hiddenForMembers: [],
      hiddenByMemberEmail: {}
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
  const hiddenForMembers = normalizeVisibilityTabs(visibility.hiddenForMembers);
  const hiddenByMemberEmail = normalizeMemberVisibility(visibility.hiddenByMemberEmail);
  const accessUsers = Array.isArray(source.accessUsers) && source.accessUsers.length
    ? normalizeAccessUsers(source.accessUsers)
    : loadAccessUsers();
  const driveSettings = source.driveSettings
    ? normalizeDriveSettings(source.driveSettings)
    : getDriveSettings();

  return {
    visibility: {
      hiddenForMembers,
      hiddenByMemberEmail
    },
    accessUsers,
    driveSettings
  };
}

export function getHideableNavigationTabs() {
  return hideableTabs;
}

export function getFreelancerLockedTabs() {
  return freelancerLockedTabs;
}

export function getHiddenTabsForAccessUser(settings: AppSyncSettings, email: string, role: AccessUserPermission["role"]): ActiveView[] {
  if (role === "admin") return [];
  const normalizedEmail = normalizeEmail(email);
  const customHidden = normalizedEmail ? settings.visibility.hiddenByMemberEmail[normalizedEmail] : undefined;
  if (customHidden) return customHidden;
  if (role === "freelancer") return getFreelancerLockedTabs();
  return customHidden || settings.visibility.hiddenForMembers;
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
      role: normalizeAccessRole(candidate.role),
      label: typeof candidate.label === "string" ? candidate.label : ""
    });
  });

  const byEmail = new Map<string, AccessUserPermission>();
  [...DEFAULT_ACCESS_USERS, ...normalized].forEach((user) => {
    byEmail.set(user.email, user);
  });

  return [...byEmail.values()];
}

function normalizeMemberVisibility(value: unknown): Record<string, ActiveView[]> {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  return Object.entries(source).reduce<Record<string, ActiveView[]>>((result, [email, tabs]) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return result;
    result[normalizedEmail] = normalizeVisibilityTabs(tabs);
    return result;
  }, {});
}

function normalizeVisibilityTabs(value: unknown): ActiveView[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is ActiveView => hideableTabs.includes(id as ActiveView)))]
    : [];
}

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}
