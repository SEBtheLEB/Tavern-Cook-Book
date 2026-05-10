import type { AccessRole, AccessUserPermission, GoogleAccountUser } from "../types";
import { getDriveSettings } from "./driveSettings";
import { loadGoogleApiScripts } from "./googlePicker";

const MAIN_ADMIN_EMAIL = "stlprodz1101@gmail.com";

export const DEFAULT_ACCESS_USERS: AccessUserPermission[] = [
  { email: "stlprodz1101@gmail.com", role: "admin", label: "Sebastien / Main Admin" },
  { email: "sebastianac1101@gmail.com", role: "editor", label: "Sebastien backup" }
];

export const APPROVED_USERS = DEFAULT_ACCESS_USERS.map((user) => user.email);

// Client-side approved email checks are useful for a private internal tool, but they are not strong security. For stronger security, add a backend/serverless token verification later.
export const ACCESS_GOOGLE_OAUTH_CLIENT_ID = "";

export const GOOGLE_ACCOUNT_KEY = "tavernCookbookGoogleAccount";
export const ACCESS_USERS_KEY = "tavernCookbookAccessUsers";
const ROLE_ORDER: Record<AccessRole, number> = { viewer: 0, editor: 1, admin: 2 };

interface GoogleCredentialResponse {
  credential?: string;
}

export function getAccessGoogleClientId() {
  return ACCESS_GOOGLE_OAUTH_CLIENT_ID.trim() || getDriveSettings().googleOAuthClientId.trim();
}

export function isApprovedGoogleUser(email: string) {
  return Boolean(getGoogleUserAccess(email));
}

export function getGoogleUserAccess(email: string): AccessUserPermission | null {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return loadAccessUsers().find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
}

export function loadAccessUsers(): AccessUserPermission[] {
  try {
    const raw = localStorage.getItem(ACCESS_USERS_KEY);
    if (!raw) return normalizeAccessUsers(DEFAULT_ACCESS_USERS);
    const saved = JSON.parse(raw);
    return normalizeAccessUsers(Array.isArray(saved) ? saved : []);
  } catch {
    return normalizeAccessUsers(DEFAULT_ACCESS_USERS);
  }
}

export function saveAccessUsers(users: AccessUserPermission[]) {
  localStorage.setItem(ACCESS_USERS_KEY, JSON.stringify(normalizeAccessUsers(users)));
}

export function roleCanEdit(role: AccessRole) {
  return ROLE_ORDER[role] >= ROLE_ORDER.editor;
}

export function roleCanAccessSettings(role: AccessRole) {
  return role === "admin";
}

export function saveGoogleAccount(user: GoogleAccountUser) {
  localStorage.setItem(GOOGLE_ACCOUNT_KEY, JSON.stringify(user));
}

export function loadGoogleAccount(): GoogleAccountUser | null {
  try {
    const raw = localStorage.getItem(GOOGLE_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoogleAccountUser>;
    const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    const access = getGoogleUserAccess(email);
    if (!email || !access) {
      clearGoogleAccount();
      return null;
    }
    return {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : email,
      email,
      picture: typeof parsed.picture === "string" ? parsed.picture : "",
      role: access.role
    };
  } catch {
    clearGoogleAccount();
    return null;
  }
}

export function clearGoogleAccount() {
  localStorage.removeItem(GOOGLE_ACCOUNT_KEY);
}

export function disableGoogleAutoSelect() {
  const google = getGoogleIdentity();
  google?.accounts?.id?.disableAutoSelect?.();
}

export function decodeGoogleCredential(credential: string): GoogleAccountUser {
  const payload = credential.split(".")[1];
  if (!payload) throw new Error("Google did not return a readable sign-in credential.");

  const decoded = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
  const email = String(decoded.email || "").trim().toLowerCase();
  if (!email) throw new Error("Google did not return an email address.");

  return {
    name: String(decoded.name || decoded.given_name || email),
    email,
    picture: String(decoded.picture || ""),
    role: getGoogleUserAccess(email)?.role || "viewer"
  };
}

export async function renderGoogleSignInButton(
  container: HTMLElement,
  onCredential: (response: GoogleCredentialResponse) => void
) {
  const clientId = getAccessGoogleClientId();
  if (!clientId) {
    throw new Error("Google OAuth Client ID is missing. Add it in Settings > Google Drive Integration, or set ACCESS_GOOGLE_OAUTH_CLIENT_ID in src/utils/accessControl.ts.");
  }

  await loadGoogleApiScripts();
  const google = getGoogleIdentity();
  if (!google?.accounts?.id) {
    throw new Error("Google Sign-In did not load. Check your internet connection and Google OAuth settings.");
  }

  container.innerHTML = "";
  google.accounts.id.initialize({
    client_id: clientId,
    callback: onCredential
  });
  google.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: 280
  });
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

function getGoogleIdentity() {
  return window.google as
    | {
        accounts?: {
          id?: {
            initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
            renderButton: (container: HTMLElement, options: Record<string, unknown>) => void;
            disableAutoSelect?: () => void;
          };
        };
      }
    | undefined;
}

function normalizeAccessUsers(users: unknown[]): AccessUserPermission[] {
  const byEmail = new Map<string, AccessUserPermission>();
  users
    .map((user) => sanitizeAccessUser(user))
    .filter((user): user is AccessUserPermission => Boolean(user))
    .forEach((user) => {
      const existing = byEmail.get(user.email);
      if (!existing || ROLE_ORDER[user.role] >= ROLE_ORDER[existing.role]) {
        byEmail.set(user.email, user);
      }
    });

  byEmail.set(MAIN_ADMIN_EMAIL, {
    ...byEmail.get(MAIN_ADMIN_EMAIL),
    email: MAIN_ADMIN_EMAIL,
    role: "admin",
    label: byEmail.get(MAIN_ADMIN_EMAIL)?.label || "Sebastien / Main Admin"
  });
  return [...byEmail.values()].sort((left, right) => ROLE_ORDER[right.role] - ROLE_ORDER[left.role] || left.email.localeCompare(right.email));
}

function sanitizeAccessUser(value: unknown): AccessUserPermission | null {
  if (!value || typeof value !== "object") return null;
  const user = value as Partial<AccessUserPermission>;
  const email = normalizeEmail(user.email || "");
  if (!email) return null;
  const role = user.role === "admin" || user.role === "editor" || user.role === "viewer" ? user.role : "viewer";
  return {
    email,
    role,
    label: typeof user.label === "string" ? user.label : ""
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
