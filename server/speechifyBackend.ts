import type { IncomingHttpHeaders } from "node:http";

const SPEECHIFY_API_BASE = "https://api.speechify.ai/v1";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const STL_WORKSHOP_GOOGLE_OAUTH_CLIENT_ID = "55508806253-p292f7oom6s1do0f9er1unfhi0mjjaen.apps.googleusercontent.com";
const DEFAULT_MODEL = "simba-3.0";
const DEFAULT_VOICE_ID = "john-rhys-davies";
const MAX_TEXT_LENGTH = 12_000;
const MAX_REQUESTS_PER_MINUTE = 12;
const speechifyRateLimits = new Map<string, number[]>();

interface SpeechifyRequest {
  text?: unknown;
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
    const upstream = await fetch(`${SPEECHIFY_API_BASE}/audio/${withTimestamps ? "stream/with-timestamps" : "stream"}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: text,
        voice_id: voiceId,
        language,
        model: process.env.SPEECHIFY_MODEL || DEFAULT_MODEL
      })
    });

    if (!upstream.ok) {
      const payload = await readUpstreamPayload(upstream);
      return jsonAudioError(upstream.status, speechifyError(payload, upstream.status));
    }

    if (withTimestamps) {
      const timestamped = parseSpeechifyTimestampStream(await upstream.text());
      return {
        status: 200,
        contentType: "application/json",
        body: Buffer.from(JSON.stringify({
          audioBase64: timestamped.audio.toString("base64"),
          contentType: upstream.headers.get("speechify-audio-content-type") || "audio/mpeg",
          speechMarks: timestamped.speechMarks,
          durationMs: timestamped.durationMs
        }))
      };
    }

    return {
      status: 200,
      contentType: upstream.headers.get("content-type") || "audio/mpeg",
      body: Buffer.from(await upstream.arrayBuffer())
    };
  } catch (error) {
    return jsonAudioError(502, error instanceof Error ? error.message : "Speechify narration failed.");
  }
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
  const credential = bearerToken(headers);
  if (!credential) return { ok: false, status: 401, error: "Google sign-in token is missing. Sign out and sign back in." };

  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) return { ok: false, status: 401, error: "Google sign-in token could not be verified." };

  const payload = await response.json() as Record<string, unknown>;
  const email = stringValue(payload.email).toLowerCase();
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!email || !emailVerified) return { ok: false, status: 401, error: "Google account email is not verified." };

  const expectedClientIds = googleOAuthClientIds();
  if (expectedClientIds.length && !expectedClientIds.includes(stringValue(payload.aud))) {
    return { ok: false, status: 401, error: "Google sign-in token was issued for a different OAuth client." };
  }
  return { ok: true, email };
}

function bearerToken(headers: IncomingHttpHeaders) {
  const raw = headers.authorization || headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw || "";
  return value.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function googleOAuthClientIds() {
  const values = [
    process.env.TAVERN_GOOGLE_OAUTH_CLIENT_ID
      || process.env.VITE_ACCESS_GOOGLE_OAUTH_CLIENT_ID
      || process.env.VITE_GOOGLE_OAUTH_CLIENT_ID
      || "",
    process.env.STL_WORKSHOP_GOOGLE_OAUTH_CLIENT_ID || STL_WORKSHOP_GOOGLE_OAUTH_CLIENT_ID
  ].flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean);
  return [...new Set(values)];
}
