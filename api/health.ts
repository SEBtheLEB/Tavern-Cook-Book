import type { IncomingMessage, ServerResponse } from "node:http";
import { getAssistantHealth } from "../server/assistantBackend";

export default function handler(_request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(getAssistantHealth()));
}
