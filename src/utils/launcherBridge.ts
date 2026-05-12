import type { AccessRole, GoogleAccountUser } from "../types";
import { saveGoogleAccount, saveGoogleCredential } from "./accessControl";

interface LauncherSessionPayload {
  type?: string;
  appId?: string;
  user?: {
    name?: string;
    email?: string;
    picture?: string;
    role?: string;
    permissions?: string[];
  };
  googleCredential?: string;
}

const WORKSHOP_SESSION_TYPE = "stl-workshop-session";
const WORKSHOP_SESSION_REQUEST_TYPE = "stl-workshop-session-request";
const COOKBOOK_APP_ID = "tavern-cook-book";

export function requestLauncherSession() {
  if (window.parent === window) return;
  window.parent.postMessage({
    type: WORKSHOP_SESSION_REQUEST_TYPE,
    appId: COOKBOOK_APP_ID
  }, "*");
}

export function listenForLauncherSession(onSession: (user: GoogleAccountUser) => void) {
  const handler = (event: MessageEvent) => {
    if (!isAllowedLauncherOrigin(event.origin)) return;
    const payload = event.data as LauncherSessionPayload;
    if (!payload || payload.type !== WORKSHOP_SESSION_TYPE) return;
    if (payload.appId && payload.appId !== COOKBOOK_APP_ID && payload.appId !== "tales-codex") return;
    const user = normalizeLauncherUser(payload.user);
    if (!user) return;

    if (payload.googleCredential) saveGoogleCredential(payload.googleCredential);
    saveGoogleAccount(user);
    onSession(user);
  };

  window.addEventListener("message", handler);
  requestLauncherSession();
  return () => window.removeEventListener("message", handler);
}

function normalizeLauncherUser(user: LauncherSessionPayload["user"]): GoogleAccountUser | null {
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return {
    name: String(user?.name || email),
    email,
    picture: String(user?.picture || ""),
    role: roleFromLauncher(user?.role, user?.permissions)
  };
}

function roleFromLauncher(role: string | undefined, permissions: string[] | undefined): AccessRole {
  const normalizedRole = String(role || "").toLowerCase();
  const normalizedPermissions = (permissions || []).map((permission) => permission.toLowerCase());
  if (normalizedRole.includes("admin") || normalizedPermissions.includes("admin")) return "admin";
  if (
    normalizedRole.includes("editor") ||
    normalizedRole.includes("writer") ||
    normalizedRole.includes("producer") ||
    normalizedRole.includes("developer") ||
    normalizedPermissions.some((permission) => ["editor", "writer", "producer", "developer", "designer", "lead"].includes(permission))
  ) {
    return "editor";
  }
  return "viewer";
}

function isAllowedLauncherOrigin(origin: string) {
  const allowed = (import.meta.env.VITE_STL_WORKSHOP_ORIGINS || "")
    .split(",")
    .map((item: string) => item.trim())
    .filter(Boolean);
  if (!allowed.length) {
    if (origin === window.location.origin) return true;
    if (new URLSearchParams(window.location.search).get("launcher") !== "stl-workshop") return false;
    try {
      const host = new URL(origin).hostname;
      return host.includes("stl-workshop") || host === "localhost" || host === "127.0.0.1";
    } catch {
      return false;
    }
  }
  return allowed.includes(origin);
}
