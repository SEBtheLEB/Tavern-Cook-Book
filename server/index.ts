import "dotenv/config";
import express from "express";
import { getAssistantHealth, handleAssistantRequest } from "./assistantBackend.ts";
import { handleDriveListRequest } from "./driveListBackend.ts";
import { getSyncHealth, handleSyncRequest } from "./syncBackend.ts";
import { getStoryScribeHealth, handleStoryScribeRequest } from "./storyScribeBackend.ts";
import { getSpeechifyHealth, handleSpeechifyPost, listSpeechifyVoices } from "./speechifyBackend.ts";

const app = express();
const port = Number(process.env.PORT || 5174);

app.use(express.json({ limit: "25mb" }));

app.get("/api/health", (_request, response) => {
  response.json(getAssistantHealth());
});

app.post("/api/assistant", async (request, response) => {
  const result = await handleAssistantRequest(request.body || {});
  response.status(result.status).json(result.body);
});

app.get("/api/story-scribe", (_request, response) => {
  response.json(getStoryScribeHealth());
});

app.post("/api/story-scribe", async (request, response) => {
  const result = await handleStoryScribeRequest(request.body || {});
  response.status(result.status).json(result.body);
});

app.get("/api/speechify", async (request, response) => {
  if (request.query.mode === "health") {
    response.json(getSpeechifyHealth());
    return;
  }
  const result = await listSpeechifyVoices(request.headers);
  response.status(result.status).json(result.body);
});

app.post("/api/speechify", async (request, response) => {
  const result = await handleSpeechifyPost(request.headers, request.body || {});
  response.status(result.status).type(result.contentType).send(result.body);
});

app.get("/api/sync", async (request, response) => {
  const result = await handleSyncRequest({
    method: "GET",
    url: request.originalUrl,
    headers: request.headers,
    body: {}
  });
  response.status(result.status).json(result.body);
});

app.post("/api/sync", async (request, response) => {
  const result = await handleSyncRequest({
    method: "POST",
    url: request.originalUrl,
    headers: request.headers,
    body: request.body || {}
  });
  response.status(result.status).json(result.body);
});

app.get("/api/sync-health", (_request, response) => {
  response.json(getSyncHealth());
});

app.get("/api/drive-list", async (request, response) => {
  const result = await handleDriveListRequest({
    method: "GET",
    url: request.originalUrl,
    headers: request.headers
  });
  response.status(result.status).json(result.body);
});

app.listen(port, "127.0.0.1", () => {
  console.log(`The Tavern Cook Book backend is running on http://127.0.0.1:${port}`);
});
