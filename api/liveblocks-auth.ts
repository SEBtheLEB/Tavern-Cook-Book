import type { IncomingMessage, ServerResponse } from "node:http";
import { handleLiveblocksAuthRequest } from "../server/liveblocksAuthBackend.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  let body: unknown = {};
  if (request.method === "POST") {
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Invalid JSON request body." });
      return;
    }
  }

  const result = await handleLiveblocksAuthRequest({
    method: request.method || "GET",
    headers: request.headers,
    body
  });
  sendJson(response, result.status, result.body);
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
