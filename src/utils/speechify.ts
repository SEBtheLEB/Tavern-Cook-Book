import { loadGoogleCredential } from "./accessControl";

const speechifyAudioCache = new Map<string, Blob>();
const MAX_CACHED_AUDIO_CHUNKS = 24;

export interface SpeechifyVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  previewUrl: string;
}

export interface SpeechifyVoiceResponse {
  configured: boolean;
  defaultVoiceId: string;
  voices: SpeechifyVoice[];
}

export async function fetchSpeechifyVoices(signal?: AbortSignal): Promise<SpeechifyVoiceResponse> {
  const response = await fetch("/api/speechify", { headers: authHeaders(), signal });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(errorMessage(payload, "Speechify is not available."));
  return {
    configured: Boolean(payload.configured),
    defaultVoiceId: stringValue(payload.defaultVoiceId),
    voices: Array.isArray(payload.voices) ? payload.voices.filter(isSpeechifyVoice) : []
  };
}

export async function createSpeechifyAudio(
  text: string,
  voiceId: string,
  signal?: AbortSignal
) {
  const cacheKey = `${voiceId}:${text}`;
  const cached = speechifyAudioCache.get(cacheKey);
  if (cached) return URL.createObjectURL(cached);

  const response = await fetch("/api/speechify", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId, language: "en-US" }),
    signal
  });
  if (!response.ok) {
    const payload = await readJson(response);
    throw new Error(errorMessage(payload, "Speechify could not read this story section."));
  }
  const audio = await response.blob();
  speechifyAudioCache.set(cacheKey, audio);
  if (speechifyAudioCache.size > MAX_CACHED_AUDIO_CHUNKS) {
    const oldestKey = speechifyAudioCache.keys().next().value;
    if (oldestKey) speechifyAudioCache.delete(oldestKey);
  }
  return URL.createObjectURL(audio);
}

export function splitSpeechifyText(text: string, maxLength = 2_500) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = `${current} ${sentence.trim()}`.trim();
    if (next.length <= maxLength) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    if (sentence.length <= maxLength) {
      current = sentence.trim();
      continue;
    }
    for (let index = 0; index < sentence.length; index += maxLength) {
      chunks.push(sentence.slice(index, index + maxLength).trim());
    }
    current = "";
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function isSpeechifyVoice(value: unknown): value is SpeechifyVoice {
  return Boolean(value && typeof value === "object" && typeof (value as SpeechifyVoice).id === "string");
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function errorMessage(payload: Record<string, unknown>, fallback: string) {
  return stringValue(payload.error || payload.message) || fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function authHeaders(): Record<string, string> {
  const credential = loadGoogleCredential();
  return credential ? { Authorization: `Bearer ${credential}` } : {};
}
