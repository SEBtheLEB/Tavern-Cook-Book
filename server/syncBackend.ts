import type { IncomingHttpHeaders } from "node:http";

type SyncScope = "published" | "user" | "settings" | "health";
type SyncProvider = "supabase" | "github" | "none";

interface SyncEnvelope<T = unknown> {
  updatedAt: string;
  updatedBy: string;
  payload: T;
}

interface SyncRequest {
  method: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
}

interface SyncResult {
  status: number;
  body: unknown;
}

interface GitHubContentFile {
  content?: string;
  encoding?: string;
  sha?: string;
}

interface SyncReadResult {
  data: unknown;
  version: string;
}

interface SyncWriteResult {
  skipped: boolean;
  version: string;
}

interface SupabaseSyncRow {
  updated_at?: string;
  updated_by?: string;
  payload?: unknown;
}

const DEFAULT_REPO = "SEBtheLEB/Tavern-Cook-Book";
const DEFAULT_BRANCH = "tavern-sync";
const DEFAULT_SUPABASE_TABLE = "tavern_sync_documents";
const SYNC_ROOT = "sync/tavern-cook-book";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const MAIN_ADMIN_EMAIL = "stlprodz1101@gmail.com";
const STL_WORKSHOP_GOOGLE_OAUTH_CLIENT_ID = "55508806253-p292f7oom6s1do0f9er1unfhi0mjjaen.apps.googleusercontent.com";

export function getSyncHealth() {
  const provider = syncProvider();
  return {
    ok: provider !== "none",
    configured: provider !== "none",
    provider,
    repo: provider === "github" ? syncRepo() : undefined,
    branch: provider === "github" ? syncBranch() : undefined,
    table: provider === "supabase" ? supabaseTable() : undefined
  };
}

export async function handleSyncRequest(request: SyncRequest): Promise<SyncResult> {
  const url = new URL(request.url || "/api/sync", "http://localhost");
  const scope = normalizeScope(url.searchParams.get("scope"));

  if (!scope) {
    return json(400, { error: "Missing sync scope." });
  }

  if (scope === "health") {
    return json(200, getSyncHealth());
  }

  const auth = await verifyGoogleCredential(request.headers);
  const allowPublicPublishedRead = scope === "published" && request.method === "GET";
  if (!auth.ok && !allowPublicPublishedRead) {
    return json(auth.status, { error: auth.error });
  }
  const signedInEmail = auth.ok
    ? auth.email
    : normalizeEmail(url.searchParams.get("email") || readBodyEmail(request.body) || "team-member@stlproductionz.local");

  if (syncProvider() === "none") {
    return json(503, {
      error: "Cloud sync is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, or keep TAVERN_SYNC_GITHUB_TOKEN as the fallback.",
      configured: false
    });
  }

  try {
    if (request.method === "GET") {
      return handleGet(scope, url, signedInEmail);
    }
    if (request.method === "POST") {
      return handlePost(scope, request.body, signedInEmail);
    }
    return json(405, { error: "Method not allowed." });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "Cloud sync failed."
    });
  }
}

async function handleGet(scope: SyncScope, url: URL, signedInEmail: string): Promise<SyncResult> {
  const email = normalizeEmail(url.searchParams.get("email") || signedInEmail);
  if (scope === "user" && email !== signedInEmail) {
    return json(403, { error: "You can only read your own draft sync file." });
  }

  const file = await readSyncJson(scope, email);
  return json(200, {
    ok: true,
    configured: true,
    envelope: file?.data || null,
    provider: syncProvider(),
    sha: file?.version || ""
  });
}

async function handlePost(scope: SyncScope, body: unknown, signedInEmail: string): Promise<SyncResult> {
  if (scope === "health") return json(405, { error: "Health is read-only." });
  if (scope === "settings" && signedInEmail !== MAIN_ADMIN_EMAIL) {
    return json(403, { error: "Only the STL Productionz admin can save team settings." });
  }

  const payload = readPayload(body);
  const requestedEmail = normalizeEmail(readBodyEmail(body) || signedInEmail);

  if (scope === "user" && requestedEmail !== signedInEmail) {
    return json(403, { error: "You can only save your own draft sync file." });
  }

  const envelope: SyncEnvelope = {
    updatedAt: new Date().toISOString(),
    updatedBy: signedInEmail,
    payload
  };
  const result = await writeSyncJson(scope, requestedEmail, envelope, commitMessage(scope, signedInEmail));
  return json(200, {
    ok: true,
    configured: true,
    envelope,
    provider: syncProvider(),
    skipped: result.skipped,
    sha: result.version
  });
}

export async function verifyGoogleCredential(headers: IncomingHttpHeaders): Promise<
  | { ok: true; email: string }
  | { ok: false; status: number; error: string }
> {
  const credential = bearerToken(headers);
  if (!credential) {
    return { ok: false, status: 401, error: "Google sign-in token is missing. Sign out and sign back in." };
  }

  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) {
    return { ok: false, status: 401, error: "Google sign-in token could not be verified." };
  }

  const payload = await response.json() as Record<string, unknown>;
  const email = normalizeEmail(String(payload.email || ""));
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!email || !emailVerified) {
    return { ok: false, status: 401, error: "Google account email is not verified." };
  }

  const expectedClientIds = googleOAuthClientIds();
  if (expectedClientIds.length && !expectedClientIds.includes(String(payload.aud || ""))) {
    return { ok: false, status: 401, error: "Google sign-in token was issued for a different OAuth client." };
  }

  return { ok: true, email };
}

function bearerToken(headers: IncomingHttpHeaders) {
  const raw = headers.authorization || headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function readSyncJson(scope: SyncScope, email: string): Promise<SyncReadResult | null> {
  if (isSupabaseConfigured()) {
    const key = syncDocumentKey(scope, email);
    const supabaseFile = await readSupabaseJson(scope, key);
    if (supabaseFile) return supabaseFile;

    const githubFile = syncToken() ? await readGitHubJson(syncPath(scope, email)) : null;
    if (githubFile?.data) {
      await migrateGitHubEnvelopeToSupabase(scope, key, githubFile.data);
      return { data: githubFile.data, version: githubFile.sha };
    }
    return null;
  }

  if (syncToken()) {
    const githubFile = await readGitHubJson(syncPath(scope, email));
    return githubFile ? { data: githubFile.data, version: githubFile.sha } : null;
  }
  return null;
}

async function writeSyncJson(scope: SyncScope, email: string, envelope: SyncEnvelope, message: string): Promise<SyncWriteResult> {
  if (isSupabaseConfigured()) {
    return writeSupabaseJson(scope, syncDocumentKey(scope, email), envelope);
  }
  const result = await writeGitHubJson(syncPath(scope, email), envelope, message);
  return { skipped: result.skipped, version: result.sha };
}

async function migrateGitHubEnvelopeToSupabase(scope: SyncScope, key: string, value: unknown) {
  if (!value || typeof value !== "object") return;
  const envelope = value as Partial<SyncEnvelope>;
  await writeSupabaseJson(scope, key, {
    updatedAt: typeof envelope.updatedAt === "string" ? envelope.updatedAt : new Date().toISOString(),
    updatedBy: typeof envelope.updatedBy === "string" ? envelope.updatedBy : "github-migration",
    payload: envelope.payload && typeof envelope.payload === "object" ? envelope.payload : {}
  });
}

async function readSupabaseJson(scope: SyncScope, key: string): Promise<SyncReadResult | null> {
  const params = new URLSearchParams({
    scope: `eq.${scope}`,
    document_key: `eq.${key}`,
    select: "updated_at,updated_by,payload",
    limit: "1"
  });
  const response = await fetch(`${supabaseRestBaseUrl()}/${encodeURIComponent(supabaseTable())}?${params.toString()}`, {
    headers: supabaseHeaders()
  });

  if (!response.ok) throw new Error(await supabaseError(response, "Could not read Supabase sync document."));
  const rows = await response.json() as SupabaseSyncRow[];
  const row = rows[0];
  if (!row) return null;

  return {
    data: supabaseRowToEnvelope(row),
    version: row.updated_at || ""
  };
}

async function writeSupabaseJson(scope: SyncScope, key: string, envelope: SyncEnvelope): Promise<SyncWriteResult> {
  const response = await fetch(`${supabaseRestBaseUrl()}/${encodeURIComponent(supabaseTable())}?on_conflict=scope,document_key`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify([{
      scope,
      document_key: key,
      updated_at: envelope.updatedAt,
      updated_by: envelope.updatedBy,
      payload: envelope.payload
    }])
  });

  if (!response.ok) throw new Error(await supabaseError(response, "Could not write Supabase sync document."));
  const rows = await response.json() as SupabaseSyncRow[];
  return {
    skipped: false,
    version: rows[0]?.updated_at || envelope.updatedAt
  };
}

function supabaseRowToEnvelope(row: SupabaseSyncRow): SyncEnvelope {
  return {
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
    updatedBy: typeof row.updated_by === "string" ? row.updated_by : "",
    payload: row.payload && typeof row.payload === "object" ? row.payload : {}
  };
}

function supabaseHeaders() {
  const key = supabaseServiceRoleKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json"
  };
}

async function supabaseError(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { message?: string; details?: string; hint?: string; code?: string };
    return [fallback, payload.message, payload.details, payload.hint, payload.code ? `(${payload.code})` : ""]
      .filter(Boolean)
      .join(" ");
  } catch {
    return fallback;
  }
}

async function readGitHubJson(path: string): Promise<{ data: unknown; sha: string } | null> {
  const raw = await readGitHubRaw(path);
  if (!raw) return null;
  const content = raw.content.trim();
  if (!content) return null;
  try {
    return {
      data: JSON.parse(content),
      sha: raw.sha
    };
  } catch (error) {
    throw new Error(
      `Sync file ${path} contains invalid JSON. ${error instanceof Error ? error.message : "Could not parse file."}`
    );
  }
}

async function readGitHubRaw(path: string): Promise<{ content: string; sha: string } | null> {
  const response = await fetch(gitHubContentsUrl(path), {
    headers: gitHubHeaders()
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await gitHubError(response, "Could not read sync file."));

  const file = await response.json() as GitHubContentFile;
  return {
    content: decodeGitHubContent(file) || (file.sha ? await readGitHubBlob(file.sha) : ""),
    sha: file.sha || ""
  };
}

async function readGitHubBlob(sha: string) {
  const response = await fetch(gitHubBlobUrl(sha), {
    headers: gitHubHeaders()
  });

  if (!response.ok) throw new Error(await gitHubError(response, "Could not read large sync file."));

  const blob = await response.json() as GitHubContentFile;
  return decodeGitHubContent(blob);
}

async function writeGitHubJson(path: string, value: unknown, message: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const current = await readGitHubRaw(path);
    const content = `${JSON.stringify(value, null, 2)}\n`;
    if (current?.content === content) {
      return { skipped: true, sha: current.sha };
    }

    const response = await fetch(gitHubContentsUrl(path), {
      method: "PUT",
      headers: {
        ...gitHubHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch: syncBranch(),
        sha: current?.sha || undefined
      })
    });

    if (response.ok) {
      const result = await response.json() as { content?: { sha?: string } };
      return { skipped: false, sha: result.content?.sha || "" };
    }

    if (response.status === 409 && attempt < 3) {
      await wait(150 * attempt);
      continue;
    }

    throw new Error(await gitHubError(response, "Could not write sync file."));
  }

  throw new Error("Could not write sync file.");
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function decodeGitHubContent(file: GitHubContentFile) {
  if (!file.content) return "";
  const normalized = file.content.replace(/\s/g, "");
  return Buffer.from(normalized, file.encoding === "base64" ? "base64" : "utf8").toString("utf8");
}

function gitHubContentsUrl(path: string) {
  const [owner, repo] = syncRepo().split("/");
  const encodedPath = path.split("/").map((part) => encodeURIComponent(part)).join("/");
  const params = new URLSearchParams({ ref: syncBranch() });
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?${params.toString()}`;
}

function gitHubBlobUrl(sha: string) {
  const [owner, repo] = syncRepo().split("/");
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(sha)}`;
}

function gitHubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${syncToken()}`,
    "User-Agent": "the-tavern-cook-book-sync",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function gitHubError(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { message?: string };
    return payload.message ? `${fallback} ${payload.message}` : fallback;
  } catch {
    return fallback;
  }
}

function syncPath(scope: SyncScope, email: string) {
  if (scope === "published") return `${SYNC_ROOT}/published.json`;
  if (scope === "settings") return `${SYNC_ROOT}/settings.json`;
  return `${SYNC_ROOT}/users/${safeEmailFileName(email)}.json`;
}

function syncDocumentKey(scope: SyncScope, email: string) {
  if (scope === "published" || scope === "settings") return "team";
  return normalizeEmail(email);
}

function safeEmailFileName(email: string) {
  return Buffer.from(normalizeEmail(email), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function commitMessage(scope: SyncScope, email: string) {
  if (scope === "published") return `Publish Tavern Cook Book changes from ${email}`;
  if (scope === "settings") return `Update Tavern Cook Book team settings from ${email}`;
  return `Autosave Tavern Cook Book draft for ${email}`;
}

function readPayload(body: unknown) {
  if (!body || typeof body !== "object") return {};
  const payload = (body as { payload?: unknown }).payload;
  return payload && typeof payload === "object" ? payload : {};
}

function readBodyEmail(body: unknown) {
  if (!body || typeof body !== "object") return "";
  return typeof (body as { email?: unknown }).email === "string" ? String((body as { email?: unknown }).email) : "";
}

function normalizeScope(scope: string | null): SyncScope | "" {
  if (scope === "published" || scope === "user" || scope === "settings" || scope === "health") return scope;
  return "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function syncToken() {
  return (process.env.TAVERN_SYNC_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "").trim();
}

function syncRepo() {
  return (process.env.TAVERN_SYNC_GITHUB_REPO || process.env.GITHUB_REPOSITORY || DEFAULT_REPO).trim();
}

function syncBranch() {
  return (process.env.TAVERN_SYNC_GITHUB_BRANCH || DEFAULT_BRANCH).trim();
}

function syncProvider(): SyncProvider {
  if (isSupabaseConfigured()) return "supabase";
  if (syncToken()) return "github";
  return "none";
}

function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}

function supabaseUrl() {
  return (process.env.TAVERN_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/g, "");
}

function supabaseRestBaseUrl() {
  return `${supabaseUrl()}/rest/v1`;
}

function supabaseServiceRoleKey() {
  return (process.env.TAVERN_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

function supabaseTable() {
  return (process.env.TAVERN_SUPABASE_SYNC_TABLE || DEFAULT_SUPABASE_TABLE).trim();
}

function googleOAuthClientIds() {
  return unique([
    process.env.TAVERN_GOOGLE_OAUTH_CLIENT_ID ||
    process.env.VITE_ACCESS_GOOGLE_OAUTH_CLIENT_ID ||
    process.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
    "",
    process.env.STL_WORKSHOP_GOOGLE_OAUTH_CLIENT_ID || STL_WORKSHOP_GOOGLE_OAUTH_CLIENT_ID
  ].flatMap((value) => value.split(","))).map((value) => value.trim()).filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function json(status: number, body: unknown): SyncResult {
  return { status, body };
}
