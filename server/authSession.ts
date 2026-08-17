import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const STL_WORKSHOP_GOOGLE_OAUTH_CLIENT_ID = "55508806253-p292f7oom6s1do0f9er1unfhi0mjjaen.apps.googleusercontent.com";
const SESSION_COOKIE_NAME = "tavern_cookbook_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload {
  email: string;
  expiresAt: number;
}

export type VerifiedIdentity =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string };

export async function verifyRequestIdentity(headers: IncomingHttpHeaders): Promise<VerifiedIdentity> {
  const credential = bearerToken(headers);
  if (credential) return verifyGoogleIdToken(credential);

  const session = readSession(headers);
  if (session) return { ok: true, email: session.email };

  return {
    ok: false,
    status: 401,
    error: "Your secure Cookbook session has expired. Reconnect Google to continue."
  };
}

export async function verifyGoogleIdToken(credential: string): Promise<VerifiedIdentity> {
  if (!credential) {
    return { ok: false, status: 401, error: "Google did not return a sign-in credential." };
  }

  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) {
    return { ok: false, status: 401, error: "Google sign-in could not be verified. Reconnect Google and try again." };
  }

  const payload = await response.json() as Record<string, unknown>;
  const email = normalizeEmail(String(payload.email || ""));
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!email || !emailVerified) {
    return { ok: false, status: 401, error: "Google account email is not verified." };
  }

  const expectedClientIds = googleOAuthClientIds();
  if (expectedClientIds.length && !expectedClientIds.includes(String(payload.aud || ""))) {
    return { ok: false, status: 401, error: "Google sign-in was issued for a different OAuth client." };
  }

  return { ok: true, email };
}

export function createSessionCookie(email: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("TAVERN_SESSION_SECRET is not configured.");
  const payload: SessionPayload = {
    email: normalizeEmail(email),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload, secret);
  return `${SESSION_COOKIE_NAME}=${encodedPayload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secureCookieSuffix()}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookieSuffix()}`;
}

export function readSession(headers: IncomingHttpHeaders): SessionPayload | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const rawCookie = String(Array.isArray(headers.cookie) ? headers.cookie[0] || "" : headers.cookie || "");
  const cookie = rawCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
  if (!cookie) return null;

  const separator = cookie.lastIndexOf(".");
  if (separator <= 0) return null;
  const encodedPayload = cookie.slice(0, separator);
  const signature = cookie.slice(separator + 1);
  const expected = sign(encodedPayload, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    const email = normalizeEmail(payload.email || "");
    const expiresAt = Number(payload.expiresAt) || 0;
    if (!email || expiresAt <= Date.now()) return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

export function isSessionConfigured() {
  return Boolean(sessionSecret());
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
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

function sessionSecret() {
  const configured = String(process.env.TAVERN_SESSION_SECRET || "").trim();
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? "" : "local-tavern-session-development-only";
}

function secureCookieSuffix() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL ? "; Secure" : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
