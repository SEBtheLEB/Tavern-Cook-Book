import type { IncomingMessage, ServerResponse } from "node:http";
import { handleSyncRequest } from "../server/syncBackend.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  applyCors(request, response);
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  let body: unknown = {};
  if (request.method === "POST") {
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Invalid JSON request body." });
      return;
    }
  }

  const result = await handleSyncRequest({
    method: request.method || "GET",
    url: request.url,
    headers: request.headers,
    body
  });
  sendJson(response, result.status, result.body);
}

function applyCors(request: IncomingMessage, response: ServerResponse) {
  const origin = String(request.headers.origin || "");
  const allowedOrigin = allowedCorsOrigin(origin);
  if (allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  response.setHeader("Access-Control-Max-Age", "86400");
}

function allowedCorsOrigin(origin: string) {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (origin === "https://stl-workshop.vercel.app") return origin;
    if (origin === "https://the-tavern-cook-book.vercel.app") return origin;
    if (host === "localhost" || host === "127.0.0.1") return origin;
    if (host.endsWith(".vercel.app") && (host.includes("stl-workshop") || host.includes("the-tavern-cook-book"))) {
      return origin;
    }
  } catch {
    return "";
  }
  return "";
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage) {
  const requestWithBody = request as IncomingMessage & { body?: unknown };
  if (requestWithBody.body && typeof requestWithBody.body === "object") {
    return requestWithBody.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
