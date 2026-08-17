import type { IncomingMessage, ServerResponse } from "node:http";
import { getSpeechifyHealth, handleSpeechifyPost, listSpeechifyVoices } from "../server/speechifyBackend.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method === "GET") {
    const url = new URL(request.url || "/api/speechify", "https://tavern.local");
    if (url.searchParams.get("mode") === "health") {
      sendJson(response, 200, getSpeechifyHealth());
      return;
    }
    const result = await listSpeechifyVoices(request.headers);
    sendJson(response, result.status, result.body);
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { error: "Invalid JSON request body." });
    return;
  }

  const result = await handleSpeechifyPost(request.headers, body as Parameters<typeof handleSpeechifyPost>[1]);
  response.statusCode = result.status;
  response.setHeader("Content-Type", result.contentType);
  response.setHeader("Cache-Control", "private, no-store");
  response.end(result.body);
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage) {
  const requestWithBody = request as IncomingMessage & { body?: unknown };
  if (requestWithBody.body && typeof requestWithBody.body === "object") return requestWithBody.body;

  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
