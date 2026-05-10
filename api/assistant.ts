import type { IncomingMessage, ServerResponse } from "node:http";
import { getAssistantHealth, handleAssistantRequest } from "../server/assistantBackend.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method === "GET") {
    sendJson(response, 200, getAssistantHealth());
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

  const result = await handleAssistantRequest(body as Parameters<typeof handleAssistantRequest>[0]);
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
