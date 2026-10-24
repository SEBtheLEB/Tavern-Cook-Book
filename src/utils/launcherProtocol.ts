// Pure validation for the STL Workshop launcher session contract (docs/stl-workshop-integration.md).
// No browser storage or Google scripts are touched here, so the rules can be unit tested in Node.

export const WORKSHOP_SESSION_TYPE = "stl-workshop-session";
export const WORKSHOP_SESSION_REQUEST_TYPE = "stl-workshop-session-request";
export const WORKSHOP_PROGRESS_TYPE = "stl-workshop-progress";
export const WORKSHOP_PROGRESS_REQUEST_TYPE = "stl-workshop-progress-request";
export const COOKBOOK_APP_ID = "tavern-cook-book";
export const LEGACY_COOKBOOK_APP_IDS = ["tales-codex"];
// The hosted web launcher that already embeds the Cook Book. Used only when no explicit list is configured.
export const DEFAULT_LAUNCHER_ORIGINS = ["https://stl-workshop.vercel.app"];

const MAX_CREDENTIAL_LENGTH = 8192;
const MAX_PERMISSIONS = 32;
const CREDENTIAL_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

export interface LauncherSessionUser {
  name: string;
  email: string;
  picture: string;
  role: string;
  permissions: string[];
}

export interface LauncherSession {
  appId: string;
  user: LauncherSessionUser | null;
  googleCredential: string;
  credentialEmail: string;
}

export type LauncherValidation<T> = { ok: true; value: T } | { ok: false; reason: string };

export interface LauncherEventContext {
  allowedOrigins: string[];
  selfOrigin: string;
  selfWindow: unknown;
  trustedSources: unknown[];
}

export interface LauncherEventLike {
  origin: string;
  source: unknown;
  data: unknown;
}

// Exact http(s) origins only: no wildcards, paths, credentials or trailing slashes.
export function parseAllowedOrigins(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").map((item) => item.trim()).filter((item) => {
    try {
      const url = new URL(item);
      const exactHost = /^(?:[a-z0-9-]+\.)*[a-z0-9-]+$|^\[[0-9a-f:.]+\]$/i.test(url.hostname);
      return (url.protocol === "https:" || url.protocol === "http:") && exactHost && url.origin === item;
    } catch {
      return false;
    }
  }))];
}

export function launcherOrigins(configured: unknown) {
  const parsed = parseAllowedOrigins(configured);
  return parsed.length ? parsed : DEFAULT_LAUNCHER_ORIGINS;
}

export function isKnownAppId(appId: unknown) {
  return appId === undefined || appId === COOKBOOK_APP_ID || LEGACY_COOKBOOK_APP_IDS.includes(String(appId));
}

// Same-origin documents already share this app's storage, so they are trusted like the app itself.
export function isTrustedLauncherEvent(event: LauncherEventLike, context: LauncherEventContext) {
  const origin = String(event.origin || "");
  if (!origin || origin === "null") return false;
  if (origin === context.selfOrigin) {
    return event.source === context.selfWindow || context.trustedSources.includes(event.source);
  }
  if (!context.allowedOrigins.includes(origin)) return false;
  return Boolean(event.source) && context.trustedSources.includes(event.source);
}

export function validateLauncherSessionPayload(value: unknown, now = Date.now()): LauncherValidation<LauncherSession> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "payload" };
  const payload = value as Record<string, unknown>;
  if (payload.type !== WORKSHOP_SESSION_TYPE) return { ok: false, reason: "type" };
  if (payload.appId !== undefined && typeof payload.appId !== "string") return { ok: false, reason: "appId" };
  if (!isKnownAppId(payload.appId)) return { ok: false, reason: "appId" };

  let user: LauncherSessionUser | null = null;
  if (payload.user !== undefined && payload.user !== null) {
    const parsed = parseLauncherUser(payload.user);
    if (!parsed.ok) return parsed;
    user = parsed.value;
  }

  let googleCredential = "";
  let credentialEmail = "";
  if (payload.googleCredential !== undefined && payload.googleCredential !== "") {
    const credential = payload.googleCredential;
    if (typeof credential !== "string" || credential.length > MAX_CREDENTIAL_LENGTH || !CREDENTIAL_PATTERN.test(credential)) {
      return { ok: false, reason: "credential" };
    }
    const claims = readCredentialClaims(credential);
    if (!claims) return { ok: false, reason: "credential" };
    credentialEmail = String(claims.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(credentialEmail)) return { ok: false, reason: "credential" };
    const expiresAt = typeof claims.exp === "number" ? claims.exp * 1000 : 0;
    if (expiresAt && expiresAt <= now) return { ok: false, reason: "expired" };
    if (user && user.email !== credentialEmail) return { ok: false, reason: "email-mismatch" };
    googleCredential = credential;
  }

  if (!user && !googleCredential) return { ok: false, reason: "identity" };
  return {
    ok: true,
    value: {
      appId: typeof payload.appId === "string" ? payload.appId : COOKBOOK_APP_ID,
      user,
      googleCredential,
      credentialEmail
    }
  };
}

export function validateProgressRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return payload.type === WORKSHOP_PROGRESS_REQUEST_TYPE && isKnownAppId(payload.appId);
}

function parseLauncherUser(value: unknown): LauncherValidation<LauncherSessionUser> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "user" };
  const user = value as Record<string, unknown>;
  const fields = ["name", "email", "picture", "role"] as const;
  if (fields.some((field) => user[field] !== undefined && typeof user[field] !== "string")) return { ok: false, reason: "user" };
  const email = String(user.email || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { ok: false, reason: "email" };
  // Display fields are cosmetic: oversized or non-HTTPS values are dropped instead of refusing the session.
  const name = String(user.name || "").trim().slice(0, 200);
  const rawRole = String(user.role || "").trim();
  const role = rawRole.length <= 40 ? rawRole : "";
  const rawPicture = String(user.picture || "").trim();
  const picture = rawPicture.length <= 2048 && /^https:\/\//i.test(rawPicture) ? rawPicture : "";
  let permissions: string[] = [];
  if (user.permissions !== undefined) {
    if (!Array.isArray(user.permissions) || user.permissions.length > MAX_PERMISSIONS) return { ok: false, reason: "permissions" };
    if (user.permissions.some((permission) => typeof permission !== "string" || !permission.trim() || permission.length > 40)) {
      return { ok: false, reason: "permissions" };
    }
    permissions = user.permissions.map((permission) => permission.trim().toLowerCase());
  }
  return { ok: true, value: { name, email, picture, role, permissions } };
}

function readCredentialClaims(credential: string): Record<string, unknown> | null {
  try {
    const segment = credential.split(".")[1];
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    return claims && typeof claims === "object" && !Array.isArray(claims) ? claims as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
