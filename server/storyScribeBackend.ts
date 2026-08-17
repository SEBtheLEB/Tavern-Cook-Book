const DEFAULT_MODEL = "gpt-4.1-mini";

type StoryScribeScope = "currentPage" | "wholeChapter" | "wholeJourney";

interface StoryScribeRequest {
  command?: unknown;
  scope?: unknown;
  chapter?: unknown;
  chapters?: unknown;
  currentChapterId?: unknown;
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
  const scope: StoryScribeScope = body?.scope === "wholeJourney"
    ? "wholeJourney"
    : body?.scope === "wholeChapter" ? "wholeChapter" : "currentPage";
  const currentPageIndex = typeof body?.currentPageIndex === "number" && Number.isFinite(body.currentPageIndex)
    ? Math.max(0, Math.floor(body.currentPageIndex))
    : 0;

  if (!command) {
    return { status: 400, body: { error: "Missing Story Scribe command." } };
  }

  const chapters = Array.isArray(body?.chapters) ? body.chapters.filter((chapter) => chapter && typeof chapter === "object") : [];
  if (chapters.length) {
    if (!process.env.OPENAI_API_KEY) {
      return { status: 503, body: { error: "OPENAI_API_KEY is not configured on the assistant backend. Use Build Manual Prompt, or add the key to the backend environment." } };
    }
    return handleJourneyScribeRequest({
      command,
      scope,
      chapters,
      currentChapterId: typeof body.currentChapterId === "string" ? body.currentChapterId : "",
      currentPageIndex
    });
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

async function handleJourneyScribeRequest(input: {
  command: string;
  scope: StoryScribeScope;
  chapters: unknown[];
  currentChapterId: string;
  currentPageIndex: number;
}): Promise<StoryScribeResult> {
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
              "You are Tavern Scribe, the admin-only writing assistant for The Tavern Cook Book's Story Journey. Return only structured JSON. Edit only the supplied Story Journey data. For currentPage, patch only the selected page. For wholeChapter, patch only the current chapter. For wholeJourney, inspect every supplied chapter but return patches only for chapters and fields that genuinely require the requested change. Preserve all unrelated wording, rich-text HTML, IDs, formatting, canon, callouts, and metadata. A global terminology correction must update every matching occurrence in chapter fields, page fields, related lore, and callouts. Never edit code, UI, permissions, images, uploads, Drive data, API keys, or other app systems."
          },
          {
            role: "user",
            content: JSON.stringify({
              command: input.command,
              scope: input.scope,
              currentChapterId: input.currentChapterId,
              currentPageIndex: input.currentPageIndex,
              rules: [
                "Return only chapter IDs that exist in the supplied Story Journey.",
                "Return complete replacement values only for fields that change.",
                "When page text changes, preserve its existing HTML tags and all unrelated prose exactly.",
                "Do not rewrite a complete passage when a precise word or phrase replacement is sufficient.",
                "Do not add chapters or pages unless the user explicitly asks.",
                "Use warnings only for genuine ambiguity or canon conflicts."
              ],
              storyJourney: input.chapters
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "story_journey_tavern_scribe_patch",
            strict: false,
            schema: storyJourneyScribeSchema
          }
        }
      })
    });

    const payload = await apiResponse.json();
    if (!apiResponse.ok) {
      return { status: apiResponse.status, body: { error: payload?.error?.message || "OpenAI API request failed." } };
    }
    const outputText = extractOutputText(payload);
    if (!outputText) return { status: 502, body: { error: "Tavern Scribe returned no JSON text." } };
    return { status: 200, body: { patch: JSON.parse(outputText) } };
  } catch (error) {
    return { status: 500, body: { error: error instanceof Error ? error.message : "Tavern Scribe backend failed." } };
  }
}

const storyJourneyCalloutSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    kind: { type: "string", enum: ["character", "location", "revelation", "playerKnowledge", "consequence", "canonGap"] },
    label: { type: "string" },
    text: { type: "string" }
  }
};

const storyJourneyPagePatchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    pageId: { type: "string" },
    pageIndex: { type: "number" },
    title: { type: "string" },
    text: { type: "string" },
    detailedText: { type: "string" },
    developerNotes: { type: "string" },
    imagePlaceholder: { type: "string" },
    caption: { type: "string" },
    relatedLore: { type: "array", items: { type: "string" } },
    callouts: { type: "array", items: storyJourneyCalloutSchema }
  }
};

const storyJourneyScribeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "chapterPatches", "warnings"],
  properties: {
    summary: { type: "string" },
    chapterPatches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["chapterId", "pagePatches", "newPages", "warnings"],
        properties: {
          chapterId: { type: "string" },
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
              overviewText: { type: "string" },
              developerNotes: { type: "string" },
              relatedLore: { type: "array", items: { type: "string" } }
            }
          },
          pagePatches: { type: "array", items: storyJourneyPagePatchSchema },
          newPages: { type: "array", items: storyJourneyPagePatchSchema },
          warnings: { type: "array", items: { type: "string" } }
        }
      }
    },
    warnings: { type: "array", items: { type: "string" } }
  }
};

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
