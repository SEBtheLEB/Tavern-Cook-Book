import { loadGoogleCredential } from "./accessControl";

const speechifyAudioCache = new Map<string, Blob>();
const speechifyTimedAudioCache = new Map<string, { audio: Blob; speechMarks: SpeechifySpeechMark[]; durationMs: number }>();
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

export interface SpeechifySpeechMark {
  start: number;
  end: number;
  start_time: number;
  end_time: number;
  value: string;
}

export interface SpeechifyTimedAudio {
  audioUrl: string;
  speechMarks: SpeechifySpeechMark[];
  durationMs: number;
}

export interface SpeechifyRecordingStatus {
  total: number;
  recordedCount: number;
  missingIndexes: number[];
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
  language = "en-US",
  signal?: AbortSignal
) {
  const cacheKey = `${voiceId}:${language}:${text}`;
  const cached = speechifyAudioCache.get(cacheKey);
  if (cached) return URL.createObjectURL(cached);

  const response = await fetch("/api/speechify", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId, language }),
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

export async function loadSpeechifyRecordedAudio(
  text: string,
  voiceId: string,
  language = "en-US",
  signal?: AbortSignal
): Promise<SpeechifyTimedAudio> {
  const cacheKey = `${voiceId}:${language}:${text}`;
  const cached = speechifyTimedAudioCache.get(cacheKey);
  if (cached) {
    return { audioUrl: URL.createObjectURL(cached.audio), speechMarks: cached.speechMarks, durationMs: cached.durationMs };
  }

  const response = await fetch("/api/speechify", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "load-recording", text, voiceId, language }),
    signal
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(errorMessage(payload, "The saved Story Journey narration could not be loaded."));

  return cacheTimedAudio(cacheKey, payload);
}

export async function recordSpeechifyTimedAudio(
  text: string,
  voiceId: string,
  language = "en-US",
  signal?: AbortSignal
): Promise<SpeechifyTimedAudio> {
  const cacheKey = `${voiceId}:${language}:${text}`;
  const response = await fetch("/api/speechify", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "record", text, voiceId, language }),
    signal
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(errorMessage(payload, "Speechify could not record this Story Journey section."));
  return cacheTimedAudio(cacheKey, payload);
}

export async function fetchSpeechifyRecordingStatus(
  texts: string[],
  voiceId: string,
  language = "en-US",
  signal?: AbortSignal
): Promise<SpeechifyRecordingStatus> {
  const response = await fetch("/api/speechify", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "recording-status", texts, voiceId, language }),
    signal
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(errorMessage(payload, "The shared narration recording could not be checked."));
  return {
    total: Number(payload.total) || texts.length,
    recordedCount: Number(payload.recordedCount) || 0,
    missingIndexes: Array.isArray(payload.missingIndexes)
      ? payload.missingIndexes.map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value < texts.length)
      : []
  };
}

function cacheTimedAudio(cacheKey: string, payload: Record<string, unknown>): SpeechifyTimedAudio {
  const audioBase64 = stringValue(payload.audioBase64);
  if (!audioBase64) throw new Error("The saved narration does not contain playable audio.");
  const audio = base64ToBlob(audioBase64, stringValue(payload.contentType) || "audio/mpeg");
  const speechMarks = Array.isArray(payload.speechMarks) ? payload.speechMarks.filter(isSpeechifySpeechMark) : [];
  const durationMs = Number(payload.durationMs) || 0;
  speechifyTimedAudioCache.set(cacheKey, { audio, speechMarks, durationMs });
  if (speechifyTimedAudioCache.size > MAX_CACHED_AUDIO_CHUNKS) {
    const oldestKey = speechifyTimedAudioCache.keys().next().value;
    if (oldestKey) speechifyTimedAudioCache.delete(oldestKey);
  }
  return { audioUrl: URL.createObjectURL(audio), speechMarks, durationMs };
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

function isSpeechifySpeechMark(value: unknown): value is SpeechifySpeechMark {
  if (!value || typeof value !== "object") return false;
  const mark = value as SpeechifySpeechMark;
  return typeof mark.value === "string"
    && Number.isFinite(Number(mark.start))
    && Number.isFinite(Number(mark.end))
    && Number.isFinite(Number(mark.start_time))
    && Number.isFinite(Number(mark.end_time));
}

function base64ToBlob(value: string, contentType: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: contentType });
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
