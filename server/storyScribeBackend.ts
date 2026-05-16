const DEFAULT_MODEL = "gpt-4.1-mini";

type StoryScribeScope = "currentPage" | "wholeChapter";

interface StoryScribeRequest {
  command?: unknown;
  scope?: unknown;
  chapter?: unknown;
  currentPageIndex?: unknown;
}

interface StoryScribeResult {
  status: number;
  body: {
    patch?: unknown;
    error?: string;
  };
}

export function getStoryScribeHealth() {
  return {
    ok: true,
    hasKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL
  };
}

export async function handleStoryScribeRequest(body: StoryScribeRequest): Promise<StoryScribeResult> {
  const command = typeof body?.command === "string" ? body.command.trim() : "";
  const scope: StoryScribeScope = body?.scope === "wholeChapter" ? "wholeChapter" : "currentPage";
  const currentPageIndex = typeof body?.currentPageIndex === "number" && Number.isFinite(body.currentPageIndex)
    ? Math.max(0, Math.floor(body.currentPageIndex))
    : 0;

  if (!command) {
    return { status: 400, body: { error: "Missing Story Scribe command." } };
  }

  if (!body?.chapter || typeof body.chapter !== "object") {
    return { status: 400, body: { error: "Missing selected Story Journey chapter." } };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      status: 503,
      body: {
        error: "OPENAI_API_KEY is not configured on the assistant backend. Use Build Manual Prompt, or add the key to the backend environment."
      }
    };
  }

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [
          {
            role: "system",
            content:
              "You are Mini Scribe for The Tavern Cook Book's Story Journey. Help write and organize story chapter text for Tales of the Tavern. Return only JSON matching the schema. You may edit only the selected chapter fields, existing page text, existing page titles, image placeholders, captions, related lore terms, or add new story pages inside the selected chapter. Never suggest app code, UI layout, CSS, API keys, secrets, images, uploads, Drive file operations, or unrelated app data. Preserve canon unless the user explicitly changes it. Keep writing useful, specific, readable, and production-friendly for writers and artists."
          },
          {
            role: "user",
            content: JSON.stringify({
              command,
              scope,
              currentPageIndex,
              rules: [
                scope === "currentPage"
                  ? "Focus on the current page. Only add new pages if the user clearly asks for more structure."
                  : "You may improve the whole selected chapter and add pages when useful.",
                "Do not overwrite unrelated pages just to be helpful.",
                "When changing an existing page, return the complete replacement text for that page.text.",
                "Use pageId when updating a page if it exists.",
                "Keep relatedLore as clean term names, not sentences.",
                "Use warnings for uncertain canon or missing context."
              ],
              selectedChapter: body.chapter,
              requiredOutput:
                "Return summary, optional chapterPatch, pagePatches, newPages, and warnings. Empty arrays are allowed."
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "story_journey_scribe_patch",
            strict: false,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "pagePatches", "newPages", "warnings"],
              properties: {
                summary: { type: "string" },
                chapterPatch: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    subtitle: { type: "string" },
                    timelineStartLabel: { type: "string" },
                    timelineEndLabel: { type: "string" },
                    timelineStartPercent: { type: "number" },
                    timelineEndPercent: { type: "number" },
                    era: { type: "string" },
                    revealLevel: { type: "string" },
                    shortDescription: { type: "string" },
                    relatedLore: {
                      type: "array",
                      items: { type: "string" }
                    }
                  }
                },
                pagePatches: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      pageId: { type: "string" },
                      pageIndex: { type: "number" },
                      title: { type: "string" },
                      text: { type: "string" },
                      imagePlaceholder: { type: "string" },
                      caption: { type: "string" },
                      relatedLore: {
                        type: "array",
                        items: { type: "string" }
                      }
                    }
                  }
                },
                newPages: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      text: { type: "string" },
                      imagePlaceholder: { type: "string" },
                      caption: { type: "string" },
                      relatedLore: {
                        type: "array",
                        items: { type: "string" }
                      }
                    }
                  }
                },
                warnings: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          }
        }
      })
    });

    const payload = await apiResponse.json();
    if (!apiResponse.ok) {
      return {
        status: apiResponse.status,
        body: { error: payload?.error?.message || "OpenAI API request failed." }
      };
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return { status: 502, body: { error: "Story Scribe returned no JSON text." } };
    }

    return { status: 200, body: { patch: JSON.parse(outputText) } };
  } catch (error) {
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : "Story Scribe backend failed." }
    };
  }
}

function extractOutputText(payload: unknown): string {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
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
