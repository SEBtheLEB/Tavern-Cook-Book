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
  return JSON.stringify(sanitizeDatabaseForPersistence(database));
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
