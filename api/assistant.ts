import type { IncomingMessage, ServerResponse } from "node:http";
import { getAssistantHealth, handleAssistantRequest } from "../server/assistantBackend";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method === "GET") {
    sendJson(response, 200, getAssistantHealth());
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const body = await readJsonBody(request);
  const result = await handleAssistantRequest(body);
  sendJson(response, result.status, result.body);
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
