import "dotenv/config";
import express from "express";
import { getAssistantHealth, handleAssistantRequest } from "./assistantBackend.ts";

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

app.listen(port, "127.0.0.1", () => {
  console.log(`The Tavern Cook Book backend is running on http://127.0.0.1:${port}`);
});
