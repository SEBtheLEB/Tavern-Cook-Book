import type { AppSyncSettings } from "./appSettings";
import type { LoreDatabase } from "../types";
import { loadGoogleCredential } from "./accessControl";
import { normalizeAppSyncSettings } from "./appSettings";
import { migrateDatabase, sanitizeDatabaseForPersistence } from "./storage";

export type CloudSyncScope = "published" | "user" | "settings";

export interface CloudSyncEnvelope<T> {
  updatedAt: string;
  updatedBy: string;
  payload: T;
}

export interface DatabaseSyncPayload {
  database: LoreDatabase;
}

export interface CloudSyncResponse<T> {
  ok: boolean;
  configured: boolean;
  envelope: CloudSyncEnvelope<T> | null;
  error?: string;
}

export interface CloudSyncHealth {
  ok: boolean;
  configured: boolean;
  repo?: string;
  branch?: string;
  error?: string;
}

export const PUBLISHED_SYNC_STATE_KEY = "tavern-cook-book:published-sync-state";

export interface PublishedSyncState {
  hash: string;
  updatedAt: string;
}

export async function fetchCloudHealth(): Promise<CloudSyncHealth> {
  try {
    const response = await fetch("/api/sync?scope=health", { cache: "no-store" });
    const payload = await response.json() as Partial<CloudSyncHealth> & { error?: string };
    return {
      ok: Boolean(payload.ok),
      configured: Boolean(payload.configured),
      repo: typeof payload.repo === "string" ? payload.repo : "",
      branch: typeof payload.branch === "string" ? payload.branch : "",
      error: payload.error
    };
  } catch {
    return {
      ok: false,
      configured: false,
      error: "Cloud sync backend is not responding."
    };
  }
}

export async function fetchPublishedDatabase() {
  return normalizeDatabaseResponse(await cloudRequest<DatabaseSyncPayload>("published", "GET"));
}

export async function fetchUserDraft(email: string) {
  return normalizeDatabaseResponse(await cloudRequest<DatabaseSyncPayload>("user", "GET", { email }));
}

export async function saveUserDraft(email: string, database: LoreDatabase) {
  return normalizeDatabaseResponse(await cloudRequest<DatabaseSyncPayload>("user", "POST", {
    email,
    payload: {
      database: sanitizeDatabaseForPersistence(database)
    }
  }));
}

export async function savePublishedDatabase(email: string, database: LoreDatabase) {
  return normalizeDatabaseResponse(await cloudRequest<DatabaseSyncPayload>("published", "POST", {
    email,
    payload: {
      database: sanitizeDatabaseForPersistence(database)
    }
  }));
}

export async function fetchRemoteAppSettings() {
  return normalizeSettingsResponse(await cloudRequest<AppSyncSettings>("settings", "GET"));
}

export async function saveRemoteAppSettings(email: string, settings: AppSyncSettings) {
  return normalizeSettingsResponse(await cloudRequest<AppSyncSettings>("settings", "POST", {
    email,
    payload: normalizeAppSyncSettings(settings)
  }));
}

export function databaseSyncHash(database: LoreDatabase) {
  return compactStringHash(JSON.stringify(sanitizeDatabaseForPersistence(database)));
}

export function loadPublishedSyncState(): PublishedSyncState {
  try {
    const raw = localStorage.getItem(PUBLISHED_SYNC_STATE_KEY);
    if (!raw) return { hash: "", updatedAt: "" };
    const parsed = JSON.parse(raw) as Partial<PublishedSyncState>;
    return {
      hash: typeof parsed.hash === "string" ? normalizeStoredSyncHash(parsed.hash) : "",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : ""
    };
  } catch {
    try {
      localStorage.removeItem(PUBLISHED_SYNC_STATE_KEY);
    } catch {
      // The app can continue without the marker; cloud sync will rebuild it.
    }
    return { hash: "", updatedAt: "" };
  }
}

export function savePublishedSyncState(database: LoreDatabase, updatedAt: string) {
  const value = JSON.stringify({
    hash: databaseSyncHash(database),
    updatedAt
  });
  try {
    localStorage.setItem(PUBLISHED_SYNC_STATE_KEY, value);
  } catch {
    try {
      localStorage.removeItem(PUBLISHED_SYNC_STATE_KEY);
      localStorage.setItem(PUBLISHED_SYNC_STATE_KEY, value);
    } catch {
      // This marker is an optimization. If storage is full, do not break sync.
    }
  }
}

function normalizeStoredSyncHash(hash: string) {
  return hash.length > 128 ? compactStringHash(hash) : hash;
}

function compactStringHash(value: string) {
  let first = 0xdeadbeef ^ value.length;
  let second = 0x41c6ce57 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
  return `${value.length.toString(36)}-${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

export function newerEnvelope<T>(left: CloudSyncEnvelope<T> | null, right: CloudSyncEnvelope<T> | null) {
  if (!left) return right;
  if (!right) return left;
  return new Date(left.updatedAt).getTime() >= new Date(right.updatedAt).getTime() ? left : right;
}

async function cloudRequest<T>(
  scope: CloudSyncScope,
  method: "GET" | "POST",
  options: { email?: string; payload?: unknown } = {}
): Promise<CloudSyncResponse<T>> {
  const credential = loadGoogleCredential();
  if (!credential) {
    return {
      ok: false,
      configured: false,
      envelope: null,
      error: "Google sign-in token expired. Sign out and sign back in to turn cloud sync on."
    };
  }

  const params = new URLSearchParams({ scope });
  if (options.email) params.set("email", options.email);
  const response = await fetch(`/api/sync?${params.toString()}`, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${credential}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {})
    },
    body: method === "POST"
      ? JSON.stringify({ email: options.email, payload: options.payload })
      : undefined
  });

  const payload = await response.json().catch(() => ({})) as {
    ok?: boolean;
    configured?: boolean;
    envelope?: CloudSyncEnvelope<T> | null;
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      configured: Boolean(payload.configured),
      envelope: null,
      error: payload.error || "Cloud sync request failed."
    };
  }

  return {
    ok: Boolean(payload.ok),
    configured: payload.configured !== false,
    envelope: payload.envelope || null,
    error: payload.error
  };
}

function normalizeDatabaseResponse(response: CloudSyncResponse<DatabaseSyncPayload>): CloudSyncResponse<DatabaseSyncPayload> {
  if (!response.envelope?.payload?.database) return response;
  return {
    ...response,
    envelope: {
      ...response.envelope,
      payload: {
        database: migrateDatabase(response.envelope.payload.database)
      }
    }
  };
}

function normalizeSettingsResponse(response: CloudSyncResponse<AppSyncSettings>): CloudSyncResponse<AppSyncSettings> {
  if (!response.envelope?.payload) return response;
  return {
    ...response,
    envelope: {
      ...response.envelope,
      payload: normalizeAppSyncSettings(response.envelope.payload)
    }
  };
}
