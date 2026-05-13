import type { IncomingHttpHeaders } from "node:http";

type SyncScope = "published" | "user" | "settings" | "health";

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

const DEFAULT_REPO = "SEBtheLEB/Tavern-Cook-Book";
const DEFAULT_BRANCH = "tavern-sync";
const SYNC_ROOT = "sync/tavern-cook-book";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const MAIN_ADMIN_EMAIL = "stlprodz1101@gmail.com";
const STL_WORKSHOP_GOOGLE_OAUTH_CLIENT_ID = "55508806253-p292f7oom6s1do0f9er1unfhi0mjjaen.apps.googleusercontent.com";

export function getSyncHealth() {
  return {
    ok: Boolean(syncToken()),
    configured: Boolean(syncToken()),
    repo: syncRepo(),
    branch: syncBranch()
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
  if (!auth.ok) {
    return json(auth.status, { error: auth.error });
  }

  if (!syncToken()) {
    return json(503, {
      error: "Cloud sync is not configured. Set TAVERN_SYNC_GITHUB_TOKEN in Vercel.",
      configured: false
    });
  }

  try {
    if (request.method === "GET") {
      return handleGet(scope, url, auth.email);
    }
    if (request.method === "POST") {
      return handlePost(scope, request.body, auth.email);
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

  const path = syncPath(scope, email);
  const file = await readGitHubJson(path);
  return json(200, {
    ok: true,
    configured: true,
    envelope: file?.data || null,
    sha: file?.sha || ""
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

  const path = syncPath(scope, requestedEmail);
  const envelope: SyncEnvelope = {
    updatedAt: new Date().toISOString(),
    updatedBy: signedInEmail,
    payload
  };
  const result = await writeGitHubJson(path, envelope, commitMessage(scope, signedInEmail));
  return json(200, {
    ok: true,
    configured: true,
    envelope,
    skipped: result.skipped,
    sha: result.sha
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
    content: decodeGitHubContent(file),
    sha: file.sha || ""
  };
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
