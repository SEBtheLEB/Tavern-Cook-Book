import "dotenv/config";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 5174);
const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

app.use(express.json({ limit: "25mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    hasKey: Boolean(process.env.OPENAI_API_KEY),
    model
  });
});

app.post("/api/assistant", async (request, response) => {
  const { database, command, mode } = request.body || {};

  if (!command || typeof command !== "string") {
    response.status(400).json({ error: "Missing assistant command." });
    return;
  }

  if (!database || !Array.isArray(database.entries)) {
    response.status(400).json({ error: "Missing lore database." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({
      error:
        "OPENAI_API_KEY is not configured on the local backend. Use Build Manual Prompt, or add the key to .env and restart npm run dev."
    });
    return;
  }

  try {
    const loreContext = buildAssistantLoreContext(database, command);
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You are the secure backend lore assistant for The Tavern Cook Book, a local-first lore bible for Tales of the Tavern by STL Productionz. Return only valid JSON matching the requested schema. Make precise, reviewable changes. Never invent destructive changes. Preserve canon facts unless the user explicitly asks to change them. Tohm never drinks from the cauldron. Lillia tore pages from the recipe book; she did not steal the whole book."
          },
          {
            role: "user",
            content: JSON.stringify({
              mode: mode || "patch",
              command,
              contextPolicy:
                "You are receiving a compact lore context, not raw app storage. Media data has been removed. Use entry ids from relevantEntries or entryIndex. For exact whole-database text replacements, return renameReference instead of individual update actions. If context is insufficient for a precise update, include a warning and avoid guessing.",
              requiredPatchShape: {
                summary: "Short explanation of proposed changes",
                changes: [
                  {
                    action: "update",
                    id: "entry-id",
                    field: "internalLore",
                    oldValue: "...",
                    newValue: "..."
                  },
                  {
                    action: "renameReference",
                    oldName: "Wiscan",
                    newName: "Whisken",
                    scope: "all"
                  },
                  {
                    action: "add",
                    entry: {}
                  },
                  {
                    action: "archive",
                    title: "Old Naming: Wiscan",
                    content: "Wiscan was an older name for Whisken."
                  }
                ],
                warnings: ["This change affects 12 entries."]
              },
              loreContext
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "tavern_cook_book_patch",
            strict: false,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "changes", "warnings"],
              properties: {
                summary: { type: "string" },
                warnings: {
                  type: "array",
                  items: { type: "string" }
                },
                changes: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: true,
                    required: ["action"],
                    properties: {
                      action: {
                        type: "string",
                        enum: ["update", "renameReference", "add", "archive"]
                      },
                      id: { type: "string" },
                      field: { type: "string" },
                      oldValue: {},
                      newValue: {},
                      oldName: { type: "string" },
                      newName: { type: "string" },
                      scope: { type: "string" },
                      entry: { type: "object", additionalProperties: true },
                      title: { type: "string" },
                      content: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      })
    });

    const payload = await apiResponse.json();
    if (!apiResponse.ok) {
      response.status(apiResponse.status).json({
        error: payload?.error?.message || "OpenAI API request failed."
      });
      return;
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      response.status(502).json({ error: "Assistant returned no JSON text." });
      return;
    }

    response.json({ patch: JSON.parse(outputText) });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Assistant backend failed."
    });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`The Tavern Cook Book backend is running on http://127.0.0.1:${port}`);
});

function extractOutputText(payload: unknown): string {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .map((item) => item.text || "")
      .join("")
      .trim() || ""
  );
}

function buildAssistantLoreContext(database: { entries: unknown[] }, command: string) {
  const entries = database.entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => entry as Record<string, unknown>);
  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, command) }))
    .sort((a, b) => b.score - a.score);
  const relevantEntries = scored
    .filter((item) => item.score > 0)
    .slice(0, 24)
    .map((item) => compactEntry(item.entry, "full"));
  const fallbackRelevant = scored.slice(0, 12).map((item) => compactEntry(item.entry, "full"));

  return {
    app: "The Tavern Cook Book",
    studio: "STL Productionz",
    game: "Tales of the Tavern",
    totalEntries: entries.length,
    canonRules: [
      "Tohm never drinks from the cauldron.",
      "Lillia tore pages from Tohm's recipe book; she did not steal the whole book.",
      "No AI change should be applied blindly; the app previews every change."
    ],
    entryIndex: entries.map((entry) => compactEntry(entry, "index")),
    relevantEntries: relevantEntries.length ? relevantEntries : fallbackRelevant
  };
}

function compactEntry(entry: Record<string, unknown>, depth: "index" | "full") {
  const base = {
    id: stringValue(entry.id),
    title: stringValue(entry.title),
    category: stringValue(entry.category),
    type: stringValue(entry.type),
    status: stringValue(entry.status),
    spoilerLevel: stringValue(entry.spoilerLevel),
    tags: arrayValue(entry.tags).slice(0, 12),
    summary: truncate(stringValue(entry.summary), depth === "index" ? 360 : 900),
    connections: compactUnknown(entry.connections, depth === "index" ? 500 : 1200),
    unresolved: truncate(stringValue((entry.notes as Record<string, unknown> | undefined)?.unresolved), 360)
  };

  if (depth === "index") return base;

  return {
    ...base,
    publicDescription: truncate(stringValue(entry.publicDescription), 900),
    internalLore: truncate(stringValue(entry.internalLore), 1600),
    fields: compactUnknown(entry.fields, 1800),
    notes: compactUnknown(entry.notes, 1000),
    timeline: compactUnknown(entry.timeline, 1000),
    secret: compactUnknown(entry.secret, 1000),
    wiki: compactUnknown(entry.wiki, 1000),
    updatedAt: stringValue(entry.updatedAt)
  };
}

function scoreEntry(entry: Record<string, unknown>, command: string) {
  const terms = command
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
  const haystack = compactUnknown(
    {
      title: entry.title,
      category: entry.category,
      type: entry.type,
      tags: entry.tags,
      summary: entry.summary,
      publicDescription: entry.publicDescription,
      internalLore: entry.internalLore,
      fields: entry.fields,
      connections: entry.connections,
      notes: entry.notes,
      timeline: entry.timeline,
      secret: entry.secret,
      wiki: entry.wiki
    },
    12000
  ).toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += stringValue(entry.title).toLowerCase().includes(term) ? 5 : 1;
  }
  if (stringValue(entry.status) === "Needs Rewrite") score += 1;
  if (stringValue((entry.notes as Record<string, unknown> | undefined)?.unresolved)) score += 1;
  return score;
}

function compactUnknown(value: unknown, maxLength: number): string {
  return truncate(JSON.stringify(stripMedia(value)), maxLength);
}

function stripMedia(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.startsWith("data:")) return "[media removed]";
    return value;
  }
  if (Array.isArray(value)) return value.map(stripMedia);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "media" && key !== "iconImage" && key !== "mainImage" && key !== "galleryImages" && key !== "uploadedVideos")
        .map(([key, item]) => [key, stripMedia(item)])
    );
  }
  return value;
}

function truncate(value: string, maxLength: number) {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength)}... [truncated]` : value;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
}

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "all",
  "make",
  "find",
  "update",
  "references",
  "reference",
  "lore",
  "entry",
  "entries"
]);
