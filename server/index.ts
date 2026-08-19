import "dotenv/config";
import express from "express";
import { getAssistantHealth, handleAssistantRequest } from "./assistantBackend.js";
import { handleDriveListRequest } from "./driveListBackend.js";
import { getSyncHealth, handleSyncRequest } from "./syncBackend.js";
import { getStoryScribeHealth, handleStoryScribeRequest } from "./storyScribeBackend.js";
import { getSpeechifyHealth, handleSpeechifyPost, listSpeechifyVoices } from "./speechifyBackend.js";
import { clearSessionCookie, createSessionCookie, isSessionConfigured, readSession, verifyGoogleIdToken } from "./authSession.js";

const app = express();
const port = Number(process.env.PORT || 5174);

app.use(express.json({ limit: "25mb" }));

app.get("/api/session", (request, response) => {
  if (!isSessionConfigured()) {
    response.status(503).json({ ok: false, error: "Secure Cookbook sessions are not configured." });
    return;
  }
  const session = readSession(request.headers);
  if (!session) {
    response.status(401).json({ ok: false, error: "Secure Cookbook session is unavailable." });
    return;
  }
  response.setHeader("Set-Cookie", createSessionCookie(session.email));
  response.json({ ok: true, email: session.email });
});

app.post("/api/session", async (request, response) => {
  const authorization = String(request.headers.authorization || "");
  const credential = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  const identity = await verifyGoogleIdToken(credential);
  if (!identity.ok) {
    response.status(identity.status).json({ ok: false, error: identity.error });
    return;
  }
  response.setHeader("Set-Cookie", createSessionCookie(identity.email));
  response.json({ ok: true, email: identity.email });
});

app.delete("/api/session", (_request, response) => {
  response.setHeader("Set-Cookie", clearSessionCookie());
  response.json({ ok: true });
});

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
