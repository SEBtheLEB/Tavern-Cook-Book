import type { IncomingMessage, ServerResponse } from "node:http";
import { handleDriveListRequest } from "../server/driveListBackend.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const result = await handleDriveListRequest({
    method: request.method || "GET",
    url: request.url,
    headers: request.headers
  });
  sendJson(response, result.status, result.body);
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}
