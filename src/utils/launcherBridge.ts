import type { AccessRole, GoogleAccountUser } from "../types";
import { decodeGoogleCredential, saveGoogleAccount, saveGoogleCredential } from "./accessControl";
import {
  COOKBOOK_APP_ID,
  WORKSHOP_PROGRESS_TYPE,
  WORKSHOP_SESSION_REQUEST_TYPE,
  isTrustedLauncherEvent,
  launcherOrigins,
  validateLauncherSessionPayload,
  validateProgressRequest,
  type LauncherSession
} from "./launcherProtocol";
import { workshopHost } from "./workshopRuntime";

interface LauncherProgressPayload {
  percent: number;
  label: string;
  completed?: number;
  total?: number;
  source: string;
}

// Exact launcher origins (VITE_STL_WORKSHOP_ORIGINS, comma separated). Same-origin pages are always trusted.
const allowedLauncherOrigins = launcherOrigins(import.meta.env.VITE_STL_WORKSHOP_ORIGINS);

function launcherWindows() {
  const windows: Window[] = [];
  if (window.parent && window.parent !== window) windows.push(window.parent);
  if (window.opener && window.opener !== window) windows.push(window.opener as Window);
  return windows;
}

function launcherEventContext() {
  return {
    allowedOrigins: allowedLauncherOrigins,
    selfOrigin: window.location.origin,
    selfWindow: window,
    trustedSources: launcherWindows()
  };
}

export function requestLauncherSession() {
  const request = {
    type: WORKSHOP_SESSION_REQUEST_TYPE,
    appId: COOKBOOK_APP_ID
  };
  // Addressed to each approved origin; the browser drops it for any other parent/opener.
  const targetOrigins = new Set([...allowedLauncherOrigins, window.location.origin]);
  for (const target of launcherWindows()) {
    for (const origin of targetOrigins) {
      try {
        target.postMessage(request, origin);
      } catch {
        // A closed opener or detached frame cannot answer; Google sign-in remains available.
      }
    }
  }
}

export function listenForLauncherSession(onSession: (user: GoogleAccountUser) => void) {
  const accept = (data: unknown) => {
    const result = validateLauncherSessionPayload(data);
    if (!result.ok) return;
    const user = normalizeLauncherUser(result.value);
    if (!user) return;

    if (result.value.googleCredential) saveGoogleCredential(result.value.googleCredential);
    saveGoogleAccount(user);
    onSession(user);
  };
  const handler = (event: MessageEvent) => {
    if (!isTrustedLauncherEvent(event, launcherEventContext())) return;
    accept(event.data);
  };

  window.addEventListener("message", handler);
  // STL Workshop's desktop host hands the session over through its preload bridge instead of postMessage.
  const stopHostSession = workshopHost?.onSession(accept);
  if (workshopHost) void workshopHost.requestSession().then(accept).catch(() => {});
  requestLauncherSession();
  return () => {
    window.removeEventListener("message", handler);
    stopHostSession?.();
  };
}

export function listenForLauncherProgressRequests(getProgress: () => LauncherProgressPayload) {
  const handler = (event: MessageEvent) => {
    if (!isTrustedLauncherEvent(event, launcherEventContext())) return;
    if (!validateProgressRequest(event.data)) return;
    const source = event.source as Window | null;
    source?.postMessage({
      type: WORKSHOP_PROGRESS_TYPE,
      appId: COOKBOOK_APP_ID,
      progress: getProgress()
    }, event.origin);
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

function normalizeLauncherUser(session: LauncherSession): GoogleAccountUser | null {
  const credentialUser = session.googleCredential ? decodeLauncherCredential(session.googleCredential) : null;
  const user = session.user;
  const email = String(credentialUser?.email || user?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  const launcherRole = roleFromLauncher(user?.role, user?.permissions, credentialUser?.role);
  return {
    name: String(credentialUser?.name || user?.name || email),
    email,
    picture: String(credentialUser?.picture || user?.picture || ""),
    role: launcherRole
  };
}

function decodeLauncherCredential(credential: string) {
  try {
    return decodeGoogleCredential(credential);
  } catch {
    return null;
  }
}

function roleFromLauncher(role: string | undefined, permissions: string[] | undefined, fallback: AccessRole = "viewer"): AccessRole {
  const normalizedRole = String(role || "").toLowerCase();
  const normalizedPermissions = (permissions || []).map((permission) => permission.toLowerCase());
  if (normalizedRole.includes("admin") || normalizedPermissions.includes("admin")) return "admin";
  if (normalizedRole.includes("freelancer") || normalizedPermissions.includes("freelancer")) return "freelancer";
  if (
    normalizedRole.includes("editor") ||
    normalizedRole.includes("writer") ||
    normalizedRole.includes("producer") ||
    normalizedRole.includes("developer") ||
    normalizedPermissions.some((permission) => ["editor", "writer", "producer", "developer", "designer", "lead"].includes(permission))
  ) {
    return "editor";
  }
  if (normalizedRole.includes("viewer")) return "viewer";
  return fallback;
}
