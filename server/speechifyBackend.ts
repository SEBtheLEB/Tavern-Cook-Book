import type { IncomingHttpHeaders } from "node:http";
import { createHash } from "node:crypto";
import { verifyRequestIdentity } from "./authSession.js";

const SPEECHIFY_API_BASE = "https://api.speechify.ai/v1";
const DEFAULT_MODEL = "simba-3.0";
const DEFAULT_VOICE_ID = "john-rhys-davies";
const MAX_TEXT_LENGTH = 12_000;
const MAX_REQUESTS_PER_MINUTE = 60;
const MAIN_ADMIN_EMAIL = "stlprodz1101@gmail.com";
const NARRATION_BUCKET = "tavern-narration";
const NARRATION_CACHE_VERSION = "story-reader-v3-paced-batch";
const DEFAULT_SYNC_REPO = "SEBtheLEB/Tavern-Cook-Book";
const DEFAULT_SYNC_BRANCH = "tavern-sync";
const NARRATION_GITHUB_ROOT = "sync/tavern-cook-book/narration";
const speechifyRateLimits = new Map<string, number[]>();
let speechifyGenerationQueue: Promise<void> = Promise.resolve();
let narrationBucketReady: Promise<void> | null = null;

interface SpeechifyRequest {
  action?: unknown;
  text?: unknown;
  texts?: unknown;
  voiceId?: unknown;
  language?: unknown;
  withTimestamps?: unknown;
}

interface SpeechifyWordMark {
  start: number;
  end: number;
  start_time: number;
  end_time: number;
  value: string;
}

interface StoredSpeechifyRecording {
  schemaVersion: 1;
  recordingId: string;
  voiceId: string;
  language: string;
  model: string;
  contentType: string;
  durationMs: number;
  speechMarks: SpeechifyWordMark[];
  createdAt: string;
  createdBy: string;
}

interface GeneratedSpeechifyAudio {
  audio: Buffer;
  contentType: string;
  speechMarks: SpeechifyWordMark[];
  durationMs: number;
}

class SpeechifyUpstreamError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface SpeechifyVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  previewUrl: string;
}

export function getSpeechifyHealth() {
  return {
    ok: true,
    configured: Boolean(process.env.SPEECHIFY_API_KEY),
    recordingStorageConfigured: narrationStorageConfigured(),
    recordingStorageProvider: narrationStorageProvider(),
    defaultVoiceId: process.env.SPEECHIFY_VOICE_ID || DEFAULT_VOICE_ID,
    model: process.env.SPEECHIFY_MODEL || DEFAULT_MODEL
  };
}

export async function listSpeechifyVoices(headers: IncomingHttpHeaders) {
  const auth = await verifyGoogleCredential(headers);
  if (!auth.ok) return { status: auth.status, body: { error: auth.error } };
  const apiKey = process.env.SPEECHIFY_API_KEY;
  if (!apiKey) {
    return {
      status: 503,
      body: {
        ...getSpeechifyHealth(),
        error: "Speechify is not connected yet. Add SPEECHIFY_API_KEY to the Vercel project environment."
      }
    };
  }

  try {
    const model = process.env.SPEECHIFY_MODEL || DEFAULT_MODEL;
    const voices: unknown[] = [];
    let cursor = "";

    // Speechify's catalogue is paginated. Fetch every compatible page so the
    // reader is not limited to the first group of voices returned by the API.
    for (let page = 0; page < 20; page += 1) {
      const url = new URL(`${SPEECHIFY_API_BASE}/voices`);
      url.searchParams.set("limit", "200");
      url.searchParams.set("model", model);
      url.searchParams.set("locale", "en");
      if (cursor) url.searchParams.set("cursor", cursor);

      const upstream = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const payload = await readUpstreamPayload(upstream);
      if (!upstream.ok) {
        return { status: upstream.status, body: { error: speechifyError(payload, upstream.status) } };
      }

      const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      const pageVoices = Array.isArray(record.voices)
        ? record.voices
        : Array.isArray(payload)
          ? payload
          : [];
      voices.push(...pageVoices);

      const nextCursor = stringValue(record.next_cursor);
      if (record.has_more !== true || !nextCursor) break;
      cursor = nextCursor;
    }

    return {
      status: 200,
      body: {
        ...getSpeechifyHealth(),
        voices: normalizeVoices({ voices }).filter((voice) => /^en(?:[-_]|$)/i.test(voice.language))
      }
    };
  } catch (error) {
    return {
      status: 502,
      body: { error: error instanceof Error ? error.message : "Speechify voice lookup failed." }
    };
  }
}

export async function handleSpeechifyPost(headers: IncomingHttpHeaders, body: SpeechifyRequest) {
  const action = stringValue(body.action);
  if (action === "recording-status") return speechifyRecordingStatus(headers, body);
  if (action === "load-recording") return loadSpeechifyRecording(headers, body);
  if (action === "record") return recordSpeechifyAudio(headers, body);
  return synthesizeSpeechifyAudio(headers, body);
}

export async function synthesizeSpeechifyAudio(headers: IncomingHttpHeaders, body: SpeechifyRequest) {
  const auth = await verifyGoogleCredential(headers);
  if (!auth.ok) return jsonAudioError(auth.status, auth.error);
  const apiKey = process.env.SPEECHIFY_API_KEY;
  if (!apiKey) {
    return {
      status: 503,
      contentType: "application/json",
      body: Buffer.from(JSON.stringify({ error: "Speechify is not connected yet. Add SPEECHIFY_API_KEY to Vercel." }))
    };
  }
  if (!consumeSpeechifyRequest(auth.email)) {
    return jsonAudioError(429, "Speechify is receiving too many requests from this account. Wait a moment and try again.");
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
  const language = typeof body.language === "string" ? body.language.trim() : "en-US";
  const withTimestamps = body.withTimestamps === true;

  if (!text) return jsonAudioError(400, "No story text was provided to Speechify.");
  if (!voiceId) return jsonAudioError(400, "Choose a Speechify voice before starting narration.");
  if (text.length > MAX_TEXT_LENGTH) return jsonAudioError(413, `Speechify text chunks must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.`);

  try {
    const generated = await enqueueSpeechifyGeneration(() => generateSpeechifyAudio(apiKey, text, voiceId, language, withTimestamps));
    if (withTimestamps) {
      return {
        status: 200,
        contentType: "application/json",
        body: recordingJsonBody(generated)
      };
    }

    return {
      status: 200,
      contentType: generated.contentType,
      body: generated.audio
    };
  } catch (error) {
    return speechifyRequestError(error, "Speechify narration failed.");
  }
}

async function speechifyRecordingStatus(headers: IncomingHttpHeaders, body: SpeechifyRequest) {
  const auth = await verifyGoogleCredential(headers);
  if (!auth.ok) return jsonAudioError(auth.status, auth.error);
  if (!narrationStorageConfigured()) return narrationStorageError();

  const texts = Array.isArray(body.texts)
    ? body.texts.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).slice(0, 500)
    : [];
  const voiceId = stringValue(body.voiceId);
  const language = stringValue(body.language) || "en-US";
  if (!texts.length || !voiceId) return jsonAudioError(400, "Narration status needs story sections and a voice.");
  if (texts.some((text) => text.length > MAX_TEXT_LENGTH)) return jsonAudioError(413, "A narration section is too long to record.");

  try {
    const ids = texts.map((text) => speechifyRecordingId(text, voiceId, language));
    const manifests = narrationStorageProvider() === "github"
      ? listGitHubNarrationIds().then((savedIds) => ids.map((id) => savedIds.has(id) ? true : null))
      : Promise.all(ids.map((id) => readSpeechifyRecordingManifest(id)));
    const savedSections = await manifests;
    const recordedSections = savedSections.map(Boolean);
    return jsonAudio(200, {
      ok: true,
      total: ids.length,
      recordedCount: recordedSections.filter(Boolean).length,
      missingIndexes: recordedSections.flatMap((exists, index) => exists ? [] : [index]),
      sections: ids.map((recordingId, index) => {
        const saved = savedSections[index];
        return {
          index,
          recordingId,
          exists: Boolean(saved),
          durationMs: typeof saved === "object" && saved ? saved.durationMs : 0,
          createdAt: typeof saved === "object" && saved ? saved.createdAt : ""
        };
      })
    });
  } catch (error) {
    return jsonAudioError(502, error instanceof Error ? error.message : "Narration recording status could not be checked.");
  }
}

async function loadSpeechifyRecording(headers: IncomingHttpHeaders, body: SpeechifyRequest) {
  const auth = await verifyGoogleCredential(headers);
  if (!auth.ok) return jsonAudioError(auth.status, auth.error);
  if (!narrationStorageConfigured()) return narrationStorageError();

  const input = readSpeechifyInput(body);
  if (!input.ok) return jsonAudioError(input.status, input.error);
  try {
    const recording = await readSpeechifyRecording(speechifyRecordingId(input.text, input.voiceId, input.language));
    if (!recording) {
      return jsonAudio(404, {
        error: "This story section has not been recorded yet. An admin can use Record / Update Page to prepare it.",
        missing: true
      });
    }
    return {
      status: 200,
      contentType: "application/json",
      body: recordingJsonBody(recording.audio, recording.manifest)
    };
  } catch (error) {
    return jsonAudioError(502, error instanceof Error ? error.message : "The saved narration could not be loaded.");
  }
}

async function recordSpeechifyAudio(headers: IncomingHttpHeaders, body: SpeechifyRequest) {
  const auth = await verifyGoogleCredential(headers);
  if (!auth.ok) return jsonAudioError(auth.status, auth.error);
  if (!speechifyRecordingAdminEmails().includes(auth.email)) {
    return jsonAudioError(403, "Only a Tavern Cook Book admin can create shared narration recordings.");
  }
  if (!narrationStorageConfigured()) return narrationStorageError();

  const apiKey = process.env.SPEECHIFY_API_KEY;
  if (!apiKey) return jsonAudioError(503, "Speechify is not connected yet. Add SPEECHIFY_API_KEY to Vercel.");
  const input = readSpeechifyInput(body);
  if (!input.ok) return jsonAudioError(input.status, input.error);
  const recordingId = speechifyRecordingId(input.text, input.voiceId, input.language);

  try {
    const existing = await readSpeechifyRecording(recordingId);
    if (existing) {
      return {
        status: 200,
        contentType: "application/json",
        body: recordingJsonBody(existing.audio, existing.manifest, true)
      };
    }
    if (!consumeSpeechifyRequest(auth.email)) {
      return jsonAudioError(429, "Speechify is receiving too many requests from this account. Wait a moment and try again.");
    }

    const generated = await enqueueSpeechifyGeneration(() => generateSpeechifyAudio(
      apiKey,
      input.text,
      input.voiceId,
      input.language,
      true
    ));
    const manifest: StoredSpeechifyRecording = {
      schemaVersion: 1,
      recordingId,
      voiceId: input.voiceId,
      language: input.language,
      model: process.env.SPEECHIFY_MODEL || DEFAULT_MODEL,
      contentType: generated.contentType,
      durationMs: generated.durationMs,
      speechMarks: generated.speechMarks,
      createdAt: new Date().toISOString(),
      createdBy: auth.email
    };
    await writeSpeechifyRecording(recordingId, generated.audio, manifest);
    return {
      status: 200,
      contentType: "application/json",
      body: recordingJsonBody(generated, manifest, false)
    };
  } catch (error) {
    return speechifyRequestError(error, "The shared narration recording could not be created.");
  }
}

function readSpeechifyInput(body: SpeechifyRequest):
  | { ok: true; text: string; voiceId: string; language: string }
  | { ok: false; status: number; error: string } {
  const text = stringValue(body.text);
  const voiceId = stringValue(body.voiceId);
  const language = stringValue(body.language) || "en-US";
  if (!text) return { ok: false, status: 400, error: "No story text was provided for narration." };
  if (!voiceId) return { ok: false, status: 400, error: "Choose a Speechify voice before preparing narration." };
  if (text.length > MAX_TEXT_LENGTH) {
    return { ok: false, status: 413, error: `Speechify text chunks must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.` };
  }
  return { ok: true, text, voiceId, language };
}

async function generateSpeechifyAudio(
  apiKey: string,
  text: string,
  voiceId: string,
  language: string,
  withTimestamps: boolean
): Promise<GeneratedSpeechifyAudio> {
  if (withTimestamps && text.length > 2_000) {
    throw new SpeechifyUpstreamError(413, "Saved narration parts must be 2,000 characters or fewer.");
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const upstream = await fetch(`${SPEECHIFY_API_BASE}/audio/${withTimestamps ? "speech" : "stream"}`, {
      method: "POST",
      headers: {
        Accept: withTimestamps ? "application/json" : "audio/mpeg",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: text,
        voice_id: voiceId,
        language,
        model: process.env.SPEECHIFY_MODEL || DEFAULT_MODEL,
        ...(withTimestamps ? { audio_format: "mp3" } : { output_format: "mp3_24000_64" })
      })
    });

    if (!upstream.ok) {
      const payload = await readUpstreamPayload(upstream);
      const message = speechifyError(payload, upstream.status);
      if (upstream.status === 429 && isConcurrencyLimitError(payload, message) && attempt < 3) {
        const retrySeconds = Math.max(1, Math.min(5, Number(upstream.headers.get("retry-after")) || attempt + 1));
        await wait(retrySeconds * 1_000);
        continue;
      }
      throw new SpeechifyUpstreamError(upstream.status, message);
    }

    if (withTimestamps) {
      const timestamped = parseSpeechifySpeechResponse(await upstream.json());
      return {
        audio: timestamped.audio,
        contentType: "audio/mpeg",
        speechMarks: timestamped.speechMarks,
        durationMs: timestamped.durationMs
      };
    }

    return {
      audio: Buffer.from(await upstream.arrayBuffer()),
      contentType: upstream.headers.get("content-type") || "audio/mpeg",
      speechMarks: [],
      durationMs: 0
    };
  }
  throw new SpeechifyUpstreamError(429, "Speechify is still busy. Wait a moment, then continue recording.");
}

export function parseSpeechifySpeechResponse(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Speechify returned an unreadable narration response.");
  const payload = value as Record<string, unknown>;
  const encodedAudio = stringValue(payload.audio_data).replace(/^data:[^,]+,/, "");
  if (!encodedAudio) throw new Error("Speechify returned timestamps without playable audio.");

  const speechMarksRecord = payload.speech_marks && typeof payload.speech_marks === "object"
    ? payload.speech_marks as Record<string, unknown>
    : {};
  const rawMarks = Array.isArray(speechMarksRecord.chunks)
    ? speechMarksRecord.chunks
    : Array.isArray(payload.speech_marks)
      ? payload.speech_marks
      : [];
  const speechMarks = rawMarks.flatMap((mark) => {
    const normalized = normalizeSpeechMark(mark);
    return normalized ? [normalized] : [];
  });
  const durationMs = numberValue(speechMarksRecord.end_time)
    || speechMarks.reduce((maximum, mark) => Math.max(maximum, mark.end_time), 0);
  return { audio: Buffer.from(encodedAudio, "base64"), speechMarks, durationMs };
}

function enqueueSpeechifyGeneration<T>(task: () => Promise<T>) {
  const run = speechifyGenerationQueue.catch(() => undefined).then(task);
  speechifyGenerationQueue = run.then(() => undefined, () => undefined);
  return run;
}

function isConcurrencyLimitError(payload: unknown, message: string) {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const error = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : {};
  return stringValue(error.code) === "concurrency_limited" || /concurrenc|simultaneous requests/i.test(message);
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function speechifyRequestError(error: unknown, fallback: string) {
  if (error instanceof SpeechifyUpstreamError) return jsonAudioError(error.status, error.message);
  return jsonAudioError(502, error instanceof Error ? error.message : fallback);
}

function recordingJsonBody(
  audio: GeneratedSpeechifyAudio | Buffer,
  manifest?: StoredSpeechifyRecording,
  cached?: boolean
) {
  const generated = Buffer.isBuffer(audio) ? null : audio;
  const audioBuffer = Buffer.isBuffer(audio) ? audio : audio.audio;
  return Buffer.from(JSON.stringify({
    ok: true,
    cached: Boolean(cached),
    recordingId: manifest?.recordingId || "",
    audioBase64: audioBuffer.toString("base64"),
    contentType: manifest?.contentType || generated?.contentType || "audio/mpeg",
    speechMarks: manifest?.speechMarks || generated?.speechMarks || [],
    durationMs: manifest?.durationMs || generated?.durationMs || 0,
    createdAt: manifest?.createdAt || ""
  }));
}

function jsonAudio(status: number, body: unknown) {
  return {
    status,
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(body))
  };
}

function narrationStorageError() {
  return jsonAudioError(503, "Shared narration storage is not configured. Connect Supabase or the Cookbook's GitHub sync storage first.");
}

export function parseSpeechifyTimestampStream(stream: string) {
  const audioParts: Buffer[] = [];
  const speechMarks: SpeechifyWordMark[] = [];
  let durationMs = 0;

  for (const block of stream.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/);
    const eventType = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "";
    const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!data) continue;

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(data) as Record<string, unknown>;
    } catch {
      continue;
    }

    const type = eventType || stringValue(payload.type);
    if (type === "speech.error") throw new Error(speechifyError(payload, 502));
    if (type === "speech.done") {
      durationMs = numberValue(payload.audio_duration_ms);
      continue;
    }
    if (type !== "speech.chunk") continue;

    const audio = stringValue(payload.audio);
    if (audio) audioParts.push(Buffer.from(audio, "base64"));
    if (Array.isArray(payload.speech_marks)) {
      payload.speech_marks.forEach((mark) => {
        const normalized = normalizeSpeechMark(mark);
        if (normalized) speechMarks.push(normalized);
      });
    }
  }

  if (!audioParts.length) throw new Error("Speechify returned timestamps without playable audio.");
  return { audio: Buffer.concat(audioParts), speechMarks, durationMs };
}

function normalizeSpeechMark(value: unknown): SpeechifyWordMark | null {
  if (!value || typeof value !== "object") return null;
  const mark = value as Record<string, unknown>;
  const normalized = {
    start: numberValue(mark.start),
    end: numberValue(mark.end),
    start_time: numberValue(mark.start_time),
    end_time: numberValue(mark.end_time),
    value: stringValue(mark.value)
  };
  return normalized.value ? normalized : null;
}

function speechifyRecordingId(text: string, voiceId: string, language: string) {
  return createHash("sha256")
    .update([
      NARRATION_CACHE_VERSION,
      process.env.SPEECHIFY_MODEL || DEFAULT_MODEL,
      voiceId,
      language,
      text
    ].join("\0"))
    .digest("hex");
}

async function readSpeechifyRecordingManifest(recordingId: string): Promise<StoredSpeechifyRecording | null> {
  if (narrationStorageProvider() === "github") {
    const stored = await readGitHubNarrationObject(`${recordingId}.json`);
    if (!stored) return null;
    const payload = JSON.parse(stored.body.toString("utf8")) as { manifest?: StoredSpeechifyRecording };
    return payload.manifest || null;
  }
  await ensureNarrationBucket();
  const response = await fetch(supabaseStorageObjectUrl(`${recordingId}.json`), {
    headers: supabaseStorageHeaders()
  });
  if (await isSupabaseMissingResource(response)) return null;
  if (!response.ok) throw new Error(await supabaseStorageError(response, "Could not load saved narration timing."));
  return response.json() as Promise<StoredSpeechifyRecording>;
}

async function readSpeechifyRecording(recordingId: string): Promise<{
  audio: Buffer;
  manifest: StoredSpeechifyRecording;
} | null> {
  if (narrationStorageProvider() === "github") {
    const stored = await readGitHubNarrationObject(`${recordingId}.json`);
    if (!stored) return null;
    const payload = JSON.parse(stored.body.toString("utf8")) as {
      manifest?: StoredSpeechifyRecording;
      audioBase64?: string;
    };
    if (!payload.manifest || !payload.audioBase64) throw new Error("The saved GitHub narration file is incomplete.");
    return {
      audio: Buffer.from(payload.audioBase64, "base64"),
      manifest: payload.manifest
    };
  }
  await ensureNarrationBucket();
  const manifestResponse = await fetch(supabaseStorageObjectUrl(`${recordingId}.json`), {
    headers: supabaseStorageHeaders()
  });
  if (await isSupabaseMissingResource(manifestResponse)) return null;
  if (!manifestResponse.ok) throw new Error(await supabaseStorageError(manifestResponse, "Could not load the narration timing file."));
  const manifest = await manifestResponse.json() as StoredSpeechifyRecording;

  const audioResponse = await fetch(supabaseStorageObjectUrl(`${recordingId}.mp3`), {
    headers: supabaseStorageHeaders()
  });
  if (await isSupabaseMissingResource(audioResponse)) return null;
  if (!audioResponse.ok) throw new Error(await supabaseStorageError(audioResponse, "Could not load the saved narration audio."));
  return {
    audio: Buffer.from(await audioResponse.arrayBuffer()),
    manifest
  };
}

async function writeSpeechifyRecording(
  recordingId: string,
  audio: Buffer,
  manifest: StoredSpeechifyRecording
) {
  if (narrationStorageProvider() === "github") {
    await writeGitHubNarrationObject(`${recordingId}.json`, Buffer.from(JSON.stringify({
      manifest,
      audioBase64: audio.toString("base64")
    })));
    return;
  }
  await ensureNarrationBucket();
  await uploadSupabaseStorageObject(`${recordingId}.mp3`, audio, manifest.contentType || "audio/mpeg");
  await uploadSupabaseStorageObject(`${recordingId}.json`, Buffer.from(JSON.stringify(manifest)), "application/json");
}

async function uploadSupabaseStorageObject(path: string, body: Buffer, contentType: string) {
  const response = await fetch(supabaseStorageUploadUrl(path), {
    method: "POST",
    headers: {
      ...supabaseStorageHeaders(),
      "Content-Type": contentType,
      "x-upsert": "true",
      "Cache-Control": "3600"
    },
    body: Uint8Array.from(body)
  });
  if (!response.ok) throw new Error(await supabaseStorageError(response, `Could not save narration file ${path}.`));
}

async function ensureNarrationBucket() {
  if (!supabaseStorageConfigured()) throw new Error("Shared narration storage is not configured.");
  if (!narrationBucketReady) {
    narrationBucketReady = (async () => {
      const existing = await fetch(`${supabaseUrl()}/storage/v1/bucket/${encodeURIComponent(NARRATION_BUCKET)}`, {
        headers: supabaseStorageHeaders()
      });
      if (existing.ok) return;
      if (!(await isSupabaseMissingResource(existing))) {
        throw new Error(await supabaseStorageError(existing, "Could not check the narration storage bucket."));
      }

      const created = await fetch(`${supabaseUrl()}/storage/v1/bucket`, {
        method: "POST",
        headers: {
          ...supabaseStorageHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: NARRATION_BUCKET,
          name: NARRATION_BUCKET,
          public: false,
          file_size_limit: 25 * 1024 * 1024,
          allowed_mime_types: ["audio/mpeg", "application/json"]
        })
      });
      if (!created.ok && created.status !== 409) {
        throw new Error(await supabaseStorageError(created, "Could not create the narration storage bucket."));
      }
    })().catch((error) => {
      narrationBucketReady = null;
      throw error;
    });
  }
  return narrationBucketReady;
}

async function listGitHubNarrationIds() {
  const [owner, repo] = githubSyncRepo().split("/");
  const encodedPath = NARRATION_GITHUB_ROOT.split("/").map((part) => encodeURIComponent(part)).join("/");
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(githubSyncBranch())}`,
    { headers: gitHubNarrationHeaders() }
  );
  if (response.status === 404) return new Set<string>();
  if (!response.ok) throw new Error(await gitHubNarrationError(response, "Could not list saved narration in GitHub."));
  const files = await response.json() as Array<{ name?: string }>;
  return new Set(files.flatMap((file) => typeof file.name === "string" && file.name.endsWith(".json")
    ? [file.name.slice(0, -5)]
    : []));
}

async function readGitHubNarrationObject(path: string): Promise<{ body: Buffer; sha: string } | null> {
  const response = await fetch(gitHubNarrationContentsUrl(path), {
    headers: gitHubNarrationHeaders()
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await gitHubNarrationError(response, "Could not load saved narration from GitHub."));
  const file = await response.json() as { content?: string; encoding?: string; sha?: string };
  let body: Buffer;
  if (file.content) {
    body = Buffer.from(file.content.replace(/\s/g, ""), file.encoding === "base64" ? "base64" : "utf8");
  } else if (file.sha) {
    const blobResponse = await fetch(gitHubNarrationBlobUrl(file.sha), { headers: gitHubNarrationHeaders() });
    if (!blobResponse.ok) throw new Error(await gitHubNarrationError(blobResponse, "Could not load the large narration recording from GitHub."));
    const blob = await blobResponse.json() as { content?: string; encoding?: string };
    body = Buffer.from((blob.content || "").replace(/\s/g, ""), blob.encoding === "base64" ? "base64" : "utf8");
  } else {
    throw new Error("GitHub returned narration metadata without file content.");
  }
  return { body, sha: file.sha || "" };
}

async function writeGitHubNarrationObject(path: string, body: Buffer) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const current = await readGitHubNarrationObject(path);
    const response = await fetch(gitHubNarrationContentsUrl(path), {
      method: "PUT",
      headers: {
        ...gitHubNarrationHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Record Story Journey narration ${path.slice(0, 12)}`,
        content: body.toString("base64"),
        branch: githubSyncBranch(),
        sha: current?.sha || undefined
      })
    });
    if (response.ok) return;
    if (response.status === 409 && attempt < 3) {
      await wait(150 * attempt);
      continue;
    }
    throw new Error(await gitHubNarrationError(response, "Could not save the shared narration recording to GitHub."));
  }
}

function gitHubNarrationContentsUrl(path: string) {
  const [owner, repo] = githubSyncRepo().split("/");
  const encodedPath = `${NARRATION_GITHUB_ROOT}/${path}`.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(githubSyncBranch())}`;
}

function gitHubNarrationBlobUrl(sha: string) {
  const [owner, repo] = githubSyncRepo().split("/");
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(sha)}`;
}

function gitHubNarrationHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubSyncToken()}`,
    "User-Agent": "the-tavern-cook-book-narration",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function gitHubNarrationError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text) as Record<string, unknown>;
    const message = stringValue(payload.message);
    if ((response.status === 403 || response.status === 429) && /rate limit|secondary rate|abuse detection/i.test(message)) {
      const resetSeconds = Number(response.headers.get("x-ratelimit-reset")) || 0;
      const resetAt = resetSeconds ? new Date(resetSeconds * 1_000) : null;
      return `GitHub temporarily paused shared narration storage${resetAt ? ` until ${resetAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })}` : ""}. Your completed recordings are safe. Try Record / Update Page again after the pause, or connect Supabase Storage to remove this GitHub limit.`;
    }
    return message || fallback;
  } catch {
    return fallback;
  }
}

function supabaseStorageObjectUrl(path: string) {
  return `${supabaseUrl()}/storage/v1/object/authenticated/${encodeURIComponent(NARRATION_BUCKET)}/${encodeStoragePath(path)}`;
}

function supabaseStorageUploadUrl(path: string) {
  return `${supabaseUrl()}/storage/v1/object/${encodeURIComponent(NARRATION_BUCKET)}/${encodeStoragePath(path)}`;
}

function encodeStoragePath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function supabaseStorageHeaders() {
  const key = supabaseServiceRoleKey();
  const headers: Record<string, string> = {
    apikey: key,
    Accept: "application/json"
  };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function supabaseStorageError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text) as Record<string, unknown>;
    return stringValue(payload.message || payload.error || payload.statusCode) || fallback;
  } catch {
    return `${fallback} ${text}`.trim();
  }
}

async function isSupabaseMissingResource(response: Response) {
  if (response.status === 404) return true;
  if (response.status !== 400) return false;
  const text = await response.clone().text();
  return /(?:object|bucket)[^\n]*not found|not found[^\n]*(?:object|bucket)/i.test(text);
}

function supabaseStorageConfigured() {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}

function narrationStorageConfigured() {
  return narrationStorageProvider() !== "none";
}

function narrationStorageProvider(): "supabase" | "github" | "none" {
  if (supabaseStorageConfigured()) return "supabase";
  if (githubSyncToken()) return "github";
  return "none";
}

function supabaseUrl() {
  return (process.env.TAVERN_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/g, "");
}

function supabaseServiceRoleKey() {
  return (
    process.env.TAVERN_SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SECRET_KEY
    || process.env.TAVERN_SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || ""
  ).trim();
}

function githubSyncToken() {
  return (process.env.TAVERN_SYNC_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "").trim();
}

function githubSyncRepo() {
  return (process.env.TAVERN_SYNC_GITHUB_REPO || process.env.GITHUB_REPOSITORY || DEFAULT_SYNC_REPO).trim();
}

function githubSyncBranch() {
  return (process.env.TAVERN_SYNC_GITHUB_BRANCH || DEFAULT_SYNC_BRANCH).trim();
}

function speechifyRecordingAdminEmails() {
  const configured = (process.env.SPEECHIFY_RECORDING_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([MAIN_ADMIN_EMAIL, ...configured])];
}

function normalizeVoices(payload: unknown): SpeechifyVoice[] {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(record.voices)
      ? record.voices
      : Array.isArray(record.items)
        ? record.items
        : [];

  return candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const voice = candidate as Record<string, unknown>;
    const id = stringValue(voice.id || voice.voice_id);
    if (!id) return [];
    return [{
      id,
      name: stringValue(voice.name || voice.display_name) || "Speechify Voice",
      language: stringValue(voice.locale || voice.language || voice.language_code),
      gender: stringValue(voice.gender),
      previewUrl: stringValue(voice.preview_audio || voice.preview_url || voice.preview)
    }];
  });
}

async function readUpstreamPayload(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function speechifyError(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const detail = record.detail && typeof record.detail === "object" ? record.detail as Record<string, unknown> : {};
    const error = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : {};
    return stringValue(record.message || error.message || error.code || detail.message || detail.error)
      || `Speechify request failed (${status}).`;
  }
  return `Speechify request failed (${status}).`;
}

function jsonAudioError(status: number, error: string) {
  return {
    status,
    contentType: "application/json",
    body: Buffer.from(JSON.stringify({ error }))
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function consumeSpeechifyRequest(email: string) {
  const now = Date.now();
  const recent = (speechifyRateLimits.get(email) || []).filter((time) => now - time < 60_000);
  if (recent.length >= MAX_REQUESTS_PER_MINUTE) {
    speechifyRateLimits.set(email, recent);
    return false;
  }
  recent.push(now);
  speechifyRateLimits.set(email, recent);
  return true;
}

async function verifyGoogleCredential(headers: IncomingHttpHeaders): Promise<
  | { ok: true; email: string }
  | { ok: false; status: number; error: string }
> {
  return verifyRequestIdentity(headers);
}
