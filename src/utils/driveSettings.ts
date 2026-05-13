export const DRIVE_SETTINGS_KEY = "tavernCookbookDriveSettings";

export interface DriveSettings {
  googleApiKey: string;
  googleOAuthClientId: string;
  defaultTalesFolderId: string;
  defaultCharactersFolderId: string;
  defaultWorldArtFolderId: string;
  defaultMarketingArtFolderId: string;
}

export interface DriveSettingsSecurityFinding {
  field: keyof DriveSettings;
  label: string;
  reason: string;
}

const driveSettingLabels: Record<keyof DriveSettings, string> = {
  googleApiKey: "Google API Key",
  googleOAuthClientId: "Google OAuth Client ID",
  defaultTalesFolderId: "Default Tales of the Tavern Drive Folder ID",
  defaultCharactersFolderId: "Default Characters Folder ID",
  defaultWorldArtFolderId: "Default World Art Folder ID",
  defaultMarketingArtFolderId: "Default Marketing Art Folder ID"
};

export function createEmptyDriveSettings(): DriveSettings {
  return {
    googleApiKey: "",
    googleOAuthClientId: "",
    defaultTalesFolderId: "",
    defaultCharactersFolderId: "",
    defaultWorldArtFolderId: "",
    defaultMarketingArtFolderId: ""
  };
}

export function getDriveSettings(): DriveSettings {
  try {
    const stored = localStorage.getItem(DRIVE_SETTINGS_KEY);
    if (!stored) return createEmptyDriveSettings();
    return normalizeDriveSettings(JSON.parse(stored));
  } catch {
    return createEmptyDriveSettings();
  }
}

export function saveDriveSettings(settings: DriveSettings) {
  const findings = findUnsafeDriveSettings(settings);
  if (findings.length) {
    throw new Error(securityFindingsMessage(findings));
  }
  localStorage.setItem(DRIVE_SETTINGS_KEY, JSON.stringify(normalizeDriveSettings(settings)));
}

export function clearDriveSettings() {
  localStorage.removeItem(DRIVE_SETTINGS_KEY);
}

export function isDriveConfigured(settings = getDriveSettings()) {
  return Boolean(settings.googleApiKey.trim() && settings.googleOAuthClientId.trim());
}

export function showDriveSetupMessage(settings = getDriveSettings()) {
  if (!isDriveConfigured(settings)) {
    window.alert("Google Drive is not connected yet. Add your API Key and OAuth Client ID in Settings first.");
    return false;
  }

  window.alert("Google Drive settings are saved. You can use Drive upload/import from a character gallery.");
  return true;
}

export function findUnsafeDriveSettings(settings: DriveSettings): DriveSettingsSecurityFinding[] {
  const normalized = normalizeDriveSettings(settings);
  return (Object.entries(normalized) as Array<[keyof DriveSettings, string]>).flatMap(([field, value]) => {
    const reason = unsafeDriveSettingReason(value);
    return reason ? [{ field, label: driveSettingLabels[field], reason }] : [];
  });
}

export function securityFindingsMessage(findings: DriveSettingsSecurityFinding[]) {
  const fields = findings.map((finding) => `${finding.label}: ${finding.reason}`).join(" ");
  return `Drive settings were not saved. ${fields}`;
}

export function normalizeDriveSettings(value: unknown): DriveSettings {
  const settings = typeof value === "object" && value !== null ? value as Partial<DriveSettings> : {};
  return {
    googleApiKey: String(settings.googleApiKey ?? ""),
    googleOAuthClientId: String(settings.googleOAuthClientId ?? ""),
    defaultTalesFolderId: String(settings.defaultTalesFolderId ?? ""),
    defaultCharactersFolderId: String(settings.defaultCharactersFolderId ?? ""),
    defaultWorldArtFolderId: String(settings.defaultWorldArtFolderId ?? ""),
    defaultMarketingArtFolderId: String(settings.defaultMarketingArtFolderId ?? "")
  };
}

function unsafeDriveSettingReason(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();

  if (/-----begin [a-z ]*private key-----/i.test(trimmed) || /-----begin [a-z ]*key-----/i.test(trimmed)) {
    return "looks like a private key";
  }
  if (lower.includes('"type"') && lower.includes('"service_account"')) {
    return "looks like service account JSON";
  }
  if (lower.includes('"private_key"') || lower.includes("private_key")) {
    return "looks like service account private key material";
  }
  if (lower.includes('"client_secret"') || lower.includes("client_secret") || /^gocspx-/i.test(trimmed)) {
    return "looks like an OAuth client secret";
  }
  if (lower.includes('"refresh_token"') || lower.includes("refresh_token") || /^1\/\/[a-z0-9_-]+$/i.test(trimmed)) {
    return "looks like a refresh token";
  }
  if (lower.includes('"access_token"') || lower.includes("access_token") || /^ya29\.[a-z0-9_-]+$/i.test(trimmed)) {
    return "looks like an access token";
  }
  if (/\.iam\.gserviceaccount\.com/i.test(trimmed)) {
    return "looks like a service account identifier";
  }
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) {
    return "looks like full image base64 data";
  }
  if (looksLikeSecretJson(trimmed)) {
    return "looks like credential JSON";
  }

  return "";
}

function looksLikeSecretJson(value: string) {
  if (!value.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return [
      "private_key",
      "private_key_id",
      "client_secret",
      "access_token",
      "refresh_token",
      "client_email"
    ].some((key) => key in parsed);
  } catch {
    return false;
  }
}
