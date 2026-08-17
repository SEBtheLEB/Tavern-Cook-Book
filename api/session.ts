import type { IncomingMessage, ServerResponse } from "node:http";
import {
  clearSessionCookie,
  createSessionCookie,
  isSessionConfigured,
  readSession,
  verifyGoogleIdToken
} from "../server/authSession.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");

  if (request.method === "DELETE") {
    response.setHeader("Set-Cookie", clearSessionCookie());
    sendJson(response, 200, { ok: true });
    return;
  }

  if (!isSessionConfigured()) {
    sendJson(response, 503, { ok: false, error: "Secure Cookbook sessions are not configured." });
    return;
  }

  if (request.method === "GET") {
    const session = readSession(request.headers);
    if (!session) {
      sendJson(response, 401, { ok: false, error: "Secure Cookbook session is unavailable." });
      return;
    }
    response.setHeader("Set-Cookie", createSessionCookie(session.email));
    sendJson(response, 200, { ok: true, email: session.email });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  const credential = bearerToken(request);
  const identity = await verifyGoogleIdToken(credential);
  if (!identity.ok) {
    sendJson(response, identity.status, { ok: false, error: identity.error });
    return;
  }

  response.setHeader("Set-Cookie", createSessionCookie(identity.email));
  sendJson(response, 200, { ok: true, email: identity.email });
}

function bearerToken(request: IncomingMessage) {
  const raw = request.headers.authorization || request.headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw || "";
  return value.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.end(JSON.stringify(body));
}
