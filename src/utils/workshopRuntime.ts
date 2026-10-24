// STL Workshop runtime contract (docs/stl-workshop-integration.md).
// Standalone, Vercel and Tauri builds have no Workshop signal and keep their normal behavior.

export type WorkshopMode = "standalone" | "offline" | "live";

export interface StlWorkshopHostBridge {
  version: 1;
  mode: "offline" | "live";
  appId: string;
  requestSession(): Promise<unknown>;
  onSession(listener: (payload: unknown) => void): () => void;
  signIn?(): Promise<unknown>;
  onCredential?(listener: (credential: string) => void): () => void;
  loadSnapshot?(): Promise<unknown>;
  cacheSnapshot?(snapshot: unknown): Promise<unknown>;
}

export interface WorkshopSnapshot {
  savedAt: string;
  teamUpdatedAt: string;
  database: unknown;
  settings: unknown;
}

declare global {
  interface Window {
    stlWorkshopHost?: unknown;
  }
}

export const OFFLINE_SERVICE_MESSAGE =
  "Workshop Offline Preview: team sync, Google Drive, Tavern Scribe and narration are disabled. Use Launch Live Cookbook in STL Workshop for current team data.";
export const OFFLINE_BLOCKED_MESSAGE = "Blocked by Workshop Offline Preview";

export function readWorkshopHost(candidate: unknown): StlWorkshopHostBridge | null {
  if (!candidate || typeof candidate !== "object") return null;
  const host = candidate as Record<string, unknown>;
  if (host.version !== 1 || (host.mode !== "offline" && host.mode !== "live")) return null;
  if (typeof host.appId !== "string" || typeof host.requestSession !== "function" || typeof host.onSession !== "function") return null;
  return host as unknown as StlWorkshopHostBridge;
}

// Either signal can only restrict the app: any offline (or unrecognized) request wins over live.
export function resolveWorkshopMode(envMode: unknown, host: StlWorkshopHostBridge | null): WorkshopMode {
  const requested = typeof envMode === "string" ? envMode.trim().toLowerCase() : "";
  if (host?.mode === "offline" || (requested && requested !== "live")) return "offline";
  if (host?.mode === "live" || requested === "live") return "live";
  return "standalone";
}

const runtimeEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env;
export const workshopHost = typeof window === "undefined" ? null : readWorkshopHost(window.stlWorkshopHost);
export const workshopMode: WorkshopMode = resolveWorkshopMode(runtimeEnv?.VITE_STL_WORKSHOP_MODE, workshopHost);

export function isWorkshopOffline() {
  return workshopMode === "offline";
}

export function isWorkshopLive() {
  return workshopMode === "live";
}

export function workshopSignInAvailable() {
  return workshopMode === "live" && typeof workshopHost?.signIn === "function";
}

export type OfflineRequestDecision = "local" | "api" | "blocked";

// Same-origin assets keep loading; same-origin /api calls get an explicit offline answer; everything else is refused.
export function classifyOfflineRequest(rawUrl: string, pageUrl: string): OfflineRequestDecision {
  let url: URL;
  try {
    url = new URL(rawUrl, pageUrl);
  } catch {
    return "blocked";
  }
  if (url.protocol === "data:" || url.protocol === "blob:") return "local";
  if (url.origin !== new URL(pageUrl).origin) return "blocked";
  return url.pathname === "/api" || url.pathname.startsWith("/api/") ? "api" : "local";
}

// Only the local development server's own socket (Vite hot reload) may connect.
export function offlineSocketAllowed(rawUrl: string, pageUrl: string) {
  try {
    const url = new URL(rawUrl, pageUrl);
    const page = new URL(pageUrl);
    return (url.protocol === "ws:" || url.protocol === "wss:") && url.host === page.host;
  } catch {
    return false;
  }
}

export function offlineApiResponse() {
  return new Response(JSON.stringify({ ok: false, configured: false, offline: true, error: OFFLINE_SERVICE_MESSAGE }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

type GuardScope = Window & typeof globalThis & { __stlWorkshopOfflineGuard?: boolean };

// Defense in depth: STL Workshop also blocks non-loopback traffic for the offline view's browser session.
export function installOfflineNetworkGuard(scope: GuardScope = window as GuardScope) {
  if (scope.__stlWorkshopOfflineGuard) return;
  scope.__stlWorkshopOfflineGuard = true;
  const page = () => scope.location.href;
  const blocked = (raw: string) => {
    try {
      return `${OFFLINE_BLOCKED_MESSAGE}: ${new URL(raw, page()).host || raw}`;
    } catch {
      return OFFLINE_BLOCKED_MESSAGE;
    }
  };

  const nativeFetch = scope.fetch.bind(scope);
  scope.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const decision = classifyOfflineRequest(raw, page());
    if (decision === "local") return nativeFetch(input, init);
    if (decision === "api") return Promise.resolve(offlineApiResponse());
    return Promise.reject(new TypeError(blocked(raw)));
  };

  if (scope.XMLHttpRequest) {
    const nativeOpen = scope.XMLHttpRequest.prototype.open as (...args: unknown[]) => void;
    scope.XMLHttpRequest.prototype.open = function guardedOpen(this: XMLHttpRequest, ...args: unknown[]) {
      const raw = String(args[1]);
      if (classifyOfflineRequest(raw, page()) !== "local") throw new DOMException(blocked(raw), "SecurityError");
      return nativeOpen.apply(this, args);
    } as XMLHttpRequest["open"];
  }

  for (const name of ["WebSocket", "EventSource"] as const) {
    const Native = scope[name] as unknown as (new (...args: unknown[]) => object) | undefined;
    if (!Native) continue;
    const allowed = name === "WebSocket"
      ? (raw: string) => offlineSocketAllowed(raw, page())
      : (raw: string) => classifyOfflineRequest(raw, page()) === "local";
    (scope as unknown as Record<string, unknown>)[name] = new Proxy(Native, {
      construct(target, args) {
        const raw = String(args[0]);
        if (!allowed(raw)) throw new DOMException(blocked(raw), "SecurityError");
        return Reflect.construct(target, args);
      }
    });
  }

  if (typeof scope.navigator?.sendBeacon === "function") {
    const nativeBeacon = scope.navigator.sendBeacon.bind(scope.navigator);
    scope.navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) =>
      classifyOfflineRequest(String(url), page()) === "local" ? nativeBeacon(url, data) : false;
  }
}

export function readWorkshopSnapshot(value: unknown): WorkshopSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  const payload = snapshot.payload && typeof snapshot.payload === "object" ? snapshot.payload as Record<string, unknown> : null;
  if (!payload || !payload.database || typeof payload.database !== "object") return null;
  return {
    savedAt: typeof snapshot.savedAt === "string" ? snapshot.savedAt : "",
    teamUpdatedAt: typeof snapshot.teamUpdatedAt === "string" ? snapshot.teamUpdatedAt : "",
    database: payload.database,
    settings: payload.settings && typeof payload.settings === "object" ? payload.settings : null
  };
}

export async function loadWorkshopSnapshot() {
  if (!isWorkshopOffline() || typeof workshopHost?.loadSnapshot !== "function") return null;
  try {
    return readWorkshopSnapshot(await workshopHost.loadSnapshot());
  } catch {
    return null;
  }
}

export async function cacheWorkshopSnapshot(snapshot: { teamUpdatedAt: string; database: unknown; settings: unknown }) {
  if (!isWorkshopLive() || typeof workshopHost?.cacheSnapshot !== "function") return false;
  try {
    await workshopHost.cacheSnapshot(snapshot);
    return true;
  } catch {
    return false;
  }
}

export interface OfflineBaseMarker {
  savedAt: string;
  hash: string;
}

export const OFFLINE_BASE_KEY = "tavern-cook-book:workshop-offline-base";

export type OfflineDatabaseChoice = "snapshot" | "local" | "local-drafts";

// Offline drafts stay local. A newer team snapshot replaces local data only when nothing was edited offline.
export function chooseOfflineDatabase(input: {
  snapshotSavedAt: string | null;
  localHash: string;
  base: OfflineBaseMarker | null;
}): OfflineDatabaseChoice {
  if (!input.snapshotSavedAt) return "local";
  if (!input.base) return "snapshot";
  if (input.base.savedAt === input.snapshotSavedAt) return "local";
  return input.localHash === input.base.hash ? "snapshot" : "local-drafts";
}

export function loadOfflineBase(): OfflineBaseMarker | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_BASE_KEY) || "null") as Partial<OfflineBaseMarker> | null;
    return parsed && typeof parsed.savedAt === "string" && typeof parsed.hash === "string"
      ? { savedAt: parsed.savedAt, hash: parsed.hash }
      : null;
  } catch {
    return null;
  }
}

export function saveOfflineBase(marker: OfflineBaseMarker) {
  try {
    localStorage.setItem(OFFLINE_BASE_KEY, JSON.stringify(marker));
  } catch {
    // The marker only decides whether a newer snapshot may replace untouched local data.
  }
}

// Used when the offline preview runs without the Workshop host (for example a direct Vite run with the offline flag).
export const OFFLINE_PREVIEW_IDENTITY = {
  type: "stl-workshop-session",
  appId: "tavern-cook-book",
  user: { name: "Workshop Preview", email: "workshop-preview@stl-workshop.local", role: "admin" }
};
