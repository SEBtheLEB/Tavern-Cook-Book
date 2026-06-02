const DEFAULT_MODEL = "gpt-5.4-mini";

type ScribeHelperGroup = "target" | "mode";

interface ServerScribeTargetHelper {
  label: string;
  group: ScribeHelperGroup;
  insertText: string;
  description: string;
  scribeGuidance: string;
}

const SCRIBE_TARGET_HELPERS: ServerScribeTargetHelper[] = [
  {
    label: "Characters",
    group: "target",
    insertText: "[Scribe Target: Characters only]",
    description: "Only character modules and character-page data.",
    scribeGuidance:
      "If the command contains [Scribe Target: Characters only], only change entries with category \"Characters\". For new entries, use entry.category \"Characters\" and entry.type \"Character\". Do not update world-building modules unless the user removes this target or also selects World Building."
  },
  {
    label: "World Building",
    group: "target",
    insertText: "[Scribe Target: World Building only]",
    description: "Only World Building modules like locations, cultures, myths, and rules.",
    scribeGuidance:
      "If the command contains [Scribe Target: World Building only], only change worldEntry records or create addWorldEntry records. Choose the best world category from locations, cultures, factions, timeline, magicSystems, characterLinks, myths, items, rules, mysteries, or glossary. Do not update character entries unless the user removes this target or also selects Characters."
  },
  {
    label: "Add / Remove Only",
    group: "mode",
    insertText: "[Scribe Mode: Add/remove entries only]",
    description: "Create or remove records and slots, without rewriting existing text.",
    scribeGuidance:
      "If the command contains [Scribe Mode: Add/remove entries only], do not rewrite or update existing text fields. Only create or remove character entries or world-building entries. Use add for character entries, removeEntry for character removals, and addWorldEntry for world modules. Include the user's supplied text inside any new record."
  }
];

const compactScribeTargetHelpers = () =>
  SCRIBE_TARGET_HELPERS.map(({ label, group, insertText, description }) => ({
    label,
    group,
    insertText,
    description
  }));

const scribeTargetHelperGuidance = SCRIBE_TARGET_HELPERS.map((item) =>
  `- ${item.insertText}: ${item.scribeGuidance}`
).join("\n") + "\n- If both Characters and World Building targets are present, satisfy each destination with separate correctly shaped actions. Do not copy target directives or app routing instructions into character or world descriptions.";

const scribeAppMap = [
  {
    area: "Characters",
    storedAs: "entries where category is Characters",
    allowedActions: ["setData target entry", "add entry", "removeEntry"],
    routing: "Character facts, biographies, ages, relationships, backstories, profile fields, and visual notes."
  },
  {
    area: "World Building",
    storedAs: "worldBuilding category arrays",
    allowedActions: ["setData target worldEntry", "addWorldEntry"],
    routing: "Locations, cultures, factions, timeline/history, myths, rules, magic systems, mysteries, glossary, and world modules."
  }
];

const scribeValidationRules = [
  "Scribe may only change app data, never layout, CSS, code, API keys, secrets, image files, or Drive files.",
  "Scribe AI is limited to character entries and World Building records.",
  "New character entries must use category Characters and type Character.",
  "World Building modules are separate records; matching character/world concepts should both be updated when relevant.",
  "Gameplay systems, journey chapters, recipes, bestiary records, marketing pages, archives, and art production boards are outside this app surface.",
  "When target helper buttons are selected, those directives are hard routing constraints.",
  "Every clause in the user's command needs a matching change or warning."
];

const getSelectedScribeHelpers = (command: string) =>
  SCRIBE_TARGET_HELPERS.filter((helper) => command.includes(helper.insertText)).map(
    ({ label, group, insertText, description }) => ({ label, group, insertText, description })
  );

export interface AssistantBackendRequest {
  database?: {
    entries?: unknown[];
    bestiary?: unknown[];
    bestiaryCategoryVaults?: unknown[];
    worldBuilding?: Record<string, unknown>;
  };
  command?: unknown;
  mode?: unknown;
  memoryRules?: unknown;
}

export interface AssistantBackendResult {
  status: number;
  body: unknown;
}

export function getAssistantModel() {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

export function getAssistantHealth() {
  return {
    ok: true,
    hasKey: Boolean(process.env.OPENAI_API_KEY),
    model: getAssistantModel()
  };
}

export async function handleAssistantRequest(body: AssistantBackendRequest): Promise<AssistantBackendResult> {
  const { database, command, mode, memoryRules } = body || {};

  if (!command || typeof command !== "string") {
    return { status: 400, body: { error: "Missing assistant command." } };
  }

  if (!database || !Array.isArray(database.entries)) {
    return { status: 400, body: { error: "Missing lore database." } };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      status: 503,
      body: {
        error:
          "OPENAI_API_KEY is not configured on the assistant backend. Use Build Manual Prompt, or add the key to the backend environment."
      }
    };
  }

  try {
    const permanentMemory = normalizeMemoryRules(memoryRules);
    const loreContext = buildAssistantLoreContext(database, command, permanentMemory);
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: getAssistantModel(),
        input: [
          {
            role: "system",
            content:
              `You are Scribe AI, the secure backend assistant for World Scribe Codex, a local-first worldbuilding and character bible for STL Productionz. Return only valid JSON matching the requested schema. First produce a concise plan, then produce precise, reviewable app-data changes. You may update character entry text, structured character fields, character tags, and World Building records. You may add character entries and world entries. You may remove character entries when asked. Never propose code, UI layout, CSS, API keys, secrets, image uploads, Drive file deletion, gameplay systems, journey chapters, recipes, bestiary records, marketing pages, archives, art production boards, or development changes. Preserve canon facts unless the user explicitly asks to change them. Apply permanentScribeMemory rules as user-taught corrections. Every requested clause must produce at least one change or a warning. Character records from entryIndex are entries; update them with setData target entry and never with targets like character, faction, or culture. Before adding a character entry, scan entryIndex for an exact or near-exact title match and update that existing entry instead of creating a duplicate. World Building modules from worldIndex are separate records; if the same concept appears in entryIndex and worldIndex, update both records. Use relationshipGraph to find connected character profiles and world modules that should be updated. If the user changes a character's age, update existing age text and add or update fields.Age. If the user declares a relationship between an existing character and an existing people, culture, faction, location, myth, or rule, update the character entry and matching worldEntry when possible, and add relatedEntries when useful. Do not copy the user's command, Scribe target directives, or UI routing phrases into summaries/descriptions/internal lore.
Known Scribe target helper directives:
${scribeTargetHelperGuidance}`
          },
          {
            role: "user",
            content: JSON.stringify({
              mode: typeof mode === "string" ? mode : "patch",
              command,
              permanentScribeMemory: permanentMemory,
              contextPolicy:
                "You are receiving compact app data, not raw app storage. Media data has been removed. Use ids from entryIndex, worldIndex, relationshipGraph, scribeTargetHelpers, and activeScribeHelpers. For direct field changes, return setData. If the user command includes a [Scribe Target: ...] or [Scribe Mode: ...] directive, treat it as a hard routing constraint. If both targets are active, satisfy each destination with separate correctly shaped actions. If the user asks to remove/delete a character entry, use removeEntry with an id from entryIndex/relevantEntries. If context is insufficient for a precise update, include a warning and avoid guessing. Do not return any action outside the worldbuilder schema. Characters from entryIndex are entries; update them with target entry. Before adding a character, scan entryIndex for same-title entries and update existing records instead of duplicating. World Building modules from worldIndex are separate records; when the same concept appears in entryIndex and worldIndex, update both records. Every requested clause must be represented by at least one change or warning. Do not copy target directives or UI routing instructions into lore descriptions.",
              requiredPatchShape: {
                summary: "Short explanation of proposed changes",
                plan: {
                  intent: "What the user wants",
                  scope: "Where Scribe will act and what it will not touch",
                  targetModules: [
                    {
                      kind: "entry",
                      id: "entry-id",
                      title: "Gwen",
                      location: "Characters",
                      reason: "Existing character fact should change"
                    }
                  ],
                  steps: [
                    {
                      title: "Update profile facts",
                      target: "Characters / Gwen",
                      intent: "Change text and fields only",
                      allowedActions: ["setData"],
                      expectedResult: "Profile and connected lore agree"
                    }
                  ],
                  checks: ["Only character/world-building data changes", "No code/layout changes", "Target helper routing obeyed"],
                  needsClarification: false,
                  clarificationQuestion: "",
                  riskLevel: "low"
                },
                changes: [
                  {
                    action: "setData",
                    target: "entry",
                    id: "entry-id",
                    path: "internalLore",
                    oldValue: "...",
                    newValue: "..."
                  },
                  {
                    action: "setData",
                    target: "worldEntry",
                    category: "cultures",
                    id: "world-entry-id",
                    path: "fields.beliefsCustoms",
                    newValue: "..."
                  },
                  {
                    action: "add",
                    entry: { title: "New Character", category: "Characters", type: "Character" }
                  },
                  {
                    action: "removeEntry",
                    id: "entry-id",
                    title: "Old Character"
                  },
                  {
                    action: "addWorldEntry",
                    category: "cultures",
                    entry: { title: "New Culture", summary: "..." }
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
            name: "world_scribe_codex_patch",
            strict: false,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "plan", "changes", "warnings"],
              properties: {
                summary: { type: "string" },
                plan: {
                  type: "object",
                  additionalProperties: false,
                  required: ["intent", "scope", "targetModules", "steps", "checks"],
                  properties: {
                    intent: { type: "string" },
                    scope: { type: "string" },
                    riskLevel: { type: "string" },
                    needsClarification: { type: "boolean" },
                    clarificationQuestion: { type: "string" },
                    targetModules: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["kind", "title", "location", "reason"],
                        properties: {
                          kind: { type: "string" },
                          id: { type: "string" },
                          title: { type: "string" },
                          location: { type: "string" },
                          reason: { type: "string" }
                        }
                      }
                    },
                    steps: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["title", "target", "intent", "allowedActions", "expectedResult"],
                        properties: {
                          title: { type: "string" },
                          target: { type: "string" },
                          intent: { type: "string" },
                          allowedActions: {
                            type: "array",
                            items: { type: "string" }
                          },
                          expectedResult: { type: "string" }
                        }
                      }
                    },
                    checks: {
                      type: "array",
                      items: { type: "string" }
                    }
                  }
                },
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
                        enum: ["update", "setData", "add", "removeEntry", "addWorldEntry"]
                      },
                      target: { type: "string" },
                      id: { type: "string" },
                      field: { type: "string" },
                      path: { type: "string" },
                      oldValue: {},
                      newValue: {},
                      oldName: { type: "string" },
                      newName: { type: "string" },
                      scope: { type: "string" },
                      category: { type: "string", enum: worldCategoryIds },
                      categoryName: { type: "string" },
                      entry: { type: "object", additionalProperties: true },
                      creature: { type: "object", additionalProperties: true },
                      name: { type: "string" },
                      archiveTitle: { type: "string" },
                      archiveContent: { type: "string" },
                      sectionId: { type: "string" },
                      sectionTitle: { type: "string" },
                      slotId: { type: "string" },
                      label: { type: "string" },
                      newLabel: { type: "string" },
                      newTitle: { type: "string" },
                      firstSlotLabel: { type: "string" },
                      slots: {
                        type: "array",
                        items: { type: "string" }
                      },
                      description: { type: "string" },
                      requirementType: { type: "string" },
                      notes: { type: "string" },
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
      return {
        status: apiResponse.status,
        body: { error: payload?.error?.message || "OpenAI API request failed." }
      };
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return { status: 502, body: { error: "Assistant returned no JSON text." } };
    }

    return { status: 200, body: { patch: JSON.parse(outputText) } };
  } catch (error) {
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : "Assistant backend failed." }
    };
  }
}

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

function normalizeMemoryRules(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "text" in item) return String((item as { text?: unknown }).text || "").trim();
      return "";
    })
    .filter(Boolean)
    .slice(0, 24);
}

function buildAssistantLoreContext(
  database: AssistantBackendRequest["database"],
  command: string,
  permanentMemory: string[] = []
) {
  const entries = (database?.entries || [])
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => entry as Record<string, unknown>)
    .filter(isWorldScribeEntry);
  const creatures: Record<string, unknown>[] = [];
  const categoryVaults: Record<string, unknown>[] = [];
  const worldEntries = worldCategoryIds.flatMap((category) => {
    const entriesForCategory = Array.isArray(database?.worldBuilding?.[category])
      ? database?.worldBuilding?.[category] as unknown[]
      : [];
    return entriesForCategory
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({ category, entry: entry as Record<string, unknown> }));
  });
  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, command) }))
    .sort((a, b) => b.score - a.score);
  const relevantEntries = scored
    .filter((item) => item.score > 0)
    .slice(0, 24)
    .map((item) => compactEntry(item.entry, "full"));
  const fallbackRelevant = scored.slice(0, 12).map((item) => compactEntry(item.entry, "full"));

  return {
    app: "World Scribe Codex",
    studio: "STL Productionz",
    focus: "World building and characters",
    appMap: scribeAppMap,
    validationRules: scribeValidationRules,
    permanentScribeMemory: permanentMemory,
    scribeTargetHelpers: compactScribeTargetHelpers(),
    activeScribeHelpers: getSelectedScribeHelpers(command),
    totalEntries: entries.length,
    totalBestiaryCreatures: 0,
    totalWorldEntries: worldEntries.length,
    canonRules: [
      "Scribe AI may only change character entries and World Building records.",
      "Scribe AI may not change code, layout, images, secrets, gameplay systems, journey chapters, bestiary records, recipes, archives, art boards, or Drive files."
    ],
    entryIndex: entries.map((entry) => compactEntry(entry, "index")),
    relevantEntries: relevantEntries.length ? relevantEntries : fallbackRelevant,
    bestiaryIndex: [],
    relevantCreatures: [],
    worldIndex: compactWorldEntries(worldEntries, command, "index"),
    relevantWorldEntries: compactWorldEntries(worldEntries, command, "full").slice(0, 18),
    relationshipGraph: buildScribeRelationshipGraph(entries, worldEntries, command),
    artCategoryIndex: [],
    artSlotIndex: []
  };
}

function isWorldScribeEntry(entry: Record<string, unknown>) {
  return /character/i.test(stringValue(entry.category)) || /character/i.test(stringValue(entry.type));
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

function compactCreature(creature: Record<string, unknown>, depth: "index" | "full") {
  const base = {
    id: stringValue(creature.id),
    name: stringValue(creature.name),
    category: stringValue(creature.category),
    type: stringValue(creature.type),
    status: stringValue(creature.status),
    threatLevel: stringValue(creature.threatLevel),
    rarity: stringValue(creature.rarity),
    habitat: stringValue(creature.habitat),
    summary: truncate(stringValue(creature.overview) || stringValue(creature.description), depth === "index" ? 420 : 900),
    artSlots: artSlotLabels(creature).slice(0, depth === "index" ? 12 : 36)
  };

  if (depth === "index") return base;

  return {
    ...base,
    behavior: truncate(stringValue(creature.behavior), 800),
    fieldNotes: truncate(stringValue(creature.fieldNotes), 800),
    stats: compactUnknown(creature.stats, 1200),
    drops: compactUnknown(creature.drops, 1200),
    habitatInfo: compactUnknown(creature.habitatInfo, 1000),
    lore: compactUnknown(creature.lore, 1400),
    gameplayPurpose: truncate(stringValue(creature.gameplayPurpose), 800),
    productionNotes: truncate(stringValue(creature.productionNotes), 800)
  };
}

function relevantCreatures(creatures: Record<string, unknown>[], command: string) {
  const scored = creatures
    .map((creature) => ({ creature, score: scoreUnknown(creature, command, stringValue(creature.name)) }))
    .sort((a, b) => b.score - a.score);
  const relevant = scored.filter((item) => item.score > 0).slice(0, 18);
  return (relevant.length ? relevant : scored.slice(0, 8)).map((item) => compactCreature(item.creature, "full"));
}

function compactWorldEntries(
  entries: Array<{ category: string; entry: Record<string, unknown> }>,
  command: string,
  depth: "index" | "full"
) {
  return entries
    .map((item) => ({ ...item, score: depth === "index" ? 1 : scoreUnknown(item.entry, command, stringValue(item.entry.title)) }))
    .filter((item) => depth === "index" || item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, depth === "index" ? 120 : 32)
    .map(({ entry, category }) => ({
      id: stringValue(entry.id),
      category,
      title: stringValue(entry.title),
      type: stringValue(entry.type),
      summary: truncate(stringValue(entry.summary), depth === "index" ? 320 : 900),
      tags: arrayValue(entry.tags).slice(0, 10),
      fields: depth === "full" ? compactUnknown(entry.fields, 1800) : undefined,
      relatedEntries: depth === "full" ? compactUnknown(entry.relatedEntries, 800) : undefined
    }));
}

function buildScribeRelationshipGraph(
  entries: Record<string, unknown>[],
  worldEntries: Array<{ category: string; entry: Record<string, unknown> }>,
  command: string
) {
  const terms = commandTerms(command);
  const nameMatchesCommand = (name: string) => {
    const normalized = normalizeLooseName(name);
    return terms.some((term) => normalized.includes(term) || term.includes(normalized));
  };
  const relevantEntries = entries
    .filter((entry) => nameMatchesCommand(stringValue(entry.title)) || scoreEntry(entry, command) > 0)
    .slice(0, 16);
  const relevantWorld = worldEntries
    .filter((item) => nameMatchesCommand(stringValue(item.entry.title)) || scoreUnknown(item.entry, command, stringValue(item.entry.title)) > 0)
    .slice(0, 16);

  return {
    entryLinks: relevantEntries.map((entry) => {
      const connections = entry.connections && typeof entry.connections === "object"
        ? entry.connections as Record<string, unknown>
        : {};
      return {
        id: stringValue(entry.id),
        title: stringValue(entry.title),
        category: stringValue(entry.category),
        linkedCharacters: arrayValue(connections.characters).slice(0, 8),
        linkedLocations: arrayValue(connections.locations).slice(0, 8),
        linkedItems: arrayValue(connections.items).slice(0, 8),
        linkedFactions: arrayValue(connections.factions).slice(0, 8),
        timelineEvents: arrayValue(connections.timelineEvents).slice(0, 8)
      };
    }),
    worldLinks: relevantWorld.map(({ category, entry }) => ({
      id: stringValue(entry.id),
      title: stringValue(entry.title),
      category,
      relatedEntries: Array.isArray(entry.relatedEntries)
        ? entry.relatedEntries
            .filter((related): related is Record<string, unknown> => Boolean(related) && typeof related === "object")
            .slice(0, 10)
            .map((related) => ({
              type: stringValue(related.type),
              targetId: stringValue(related.targetId),
              targetCategory: stringValue(related.targetCategory),
              note: stringValue(related.note)
            }))
        : []
    })),
    instruction:
      "Use this relationship graph to update connected character profiles and world modules when the user's fact logically affects more than one place."
  };
}

function compactArtSlotIndex(
  entries: Record<string, unknown>[],
  creatures: Record<string, unknown>[],
  categoryVaults: Record<string, unknown>[]
) {
  const entrySlots = entries.flatMap((entry) =>
    artSlots(entry).map((slot) => ({
      target: "entry",
      id: stringValue(entry.id),
      title: stringValue(entry.title),
      ...slot
    }))
  );
  const creatureSlots = creatures.flatMap((creature) =>
    artSlots(creature).map((slot) => ({
      target: "creature",
      id: stringValue(creature.id),
      title: stringValue(creature.name),
      ...slot
    }))
  );
  const categorySlots = categoryVaults.flatMap((vault) =>
    artSlots(vault).map((slot) => ({
      target: "bestiaryCategory",
      categoryName: stringValue(vault.categoryName),
      ...slot
    }))
  );
  return [...entrySlots, ...creatureSlots, ...categorySlots];
}

function compactArtCategoryIndex(
  entries: Record<string, unknown>[],
  creatures: Record<string, unknown>[],
  categoryVaults: Record<string, unknown>[]
) {
  const entryCategories = entries.flatMap((entry) =>
    artSections(entry).map((section) => ({
      target: "entry",
      id: stringValue(entry.id),
      title: stringValue(entry.title),
      ...section
    }))
  );
  const creatureCategories = creatures.flatMap((creature) =>
    artSections(creature).map((section) => ({
      target: "creature",
      id: stringValue(creature.id),
      title: stringValue(creature.name),
      ...section
    }))
  );
  const categoryCategories = categoryVaults.flatMap((vault) =>
    artSections(vault).map((section) => ({
      target: "bestiaryCategory",
      categoryName: stringValue(vault.categoryName),
      ...section
    }))
  );
  return [...entryCategories, ...creatureCategories, ...categoryCategories];
}

function scoreEntry(entry: Record<string, unknown>, command: string) {
  const terms = commandTerms(command);
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

function scoreUnknown(value: unknown, command: string, title = "") {
  const terms = commandTerms(command);
  const haystack = compactUnknown(value, 12000).toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += title.toLowerCase().includes(term) ? 5 : 1;
  }
  return score;
}

function commandTerms(command: string) {
  return command
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
}

function normalizeLooseName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function artSlotLabels(subject: Record<string, unknown>) {
  return artSlots(subject).map((slot) => `${slot.sectionTitle}: ${slot.label}`);
}

function artSections(subject: Record<string, unknown>) {
  const artVault = subject.artVault && typeof subject.artVault === "object"
    ? subject.artVault as { sections?: unknown[] }
    : { sections: [] };
  return (Array.isArray(artVault.sections) ? artVault.sections : [])
    .filter((sectionValue): sectionValue is Record<string, unknown> => Boolean(sectionValue) && typeof sectionValue === "object")
    .map((section) => ({
      sectionId: stringValue(section.id),
      sectionTitle: stringValue(section.title),
      slotCount: Array.isArray(section.slots) ? section.slots.length : 0
    }));
}

function artSlots(subject: Record<string, unknown>) {
  const artVault = subject.artVault && typeof subject.artVault === "object"
    ? subject.artVault as { sections?: unknown[] }
    : { sections: [] };
  return (Array.isArray(artVault.sections) ? artVault.sections : []).flatMap((sectionValue) => {
    const section = sectionValue && typeof sectionValue === "object"
      ? sectionValue as Record<string, unknown>
      : {};
    const slots = Array.isArray(section.slots) ? section.slots : [];
    return slots
      .filter((slot): slot is Record<string, unknown> => Boolean(slot) && typeof slot === "object")
      .map((slot) => ({
        sectionId: stringValue(section.id),
        sectionTitle: stringValue(section.title),
        slotId: stringValue(slot.id),
        label: stringValue(slot.label)
      }));
  });
}

function compactUnknown(value: unknown, maxLength: number): string {
  return truncate(JSON.stringify(stripMedia(value)), maxLength);
}

const mediaPayloadKeys = new Set([
  "artgallery",
  "drivefileid",
  "drivefolderid",
  "drivefolderlink",
  "galleryimages",
  "iconimage",
  "image",
  "imagefit",
  "imagefits",
  "images",
  "imageurl",
  "imageurls",
  "logoimage",
  "mainimage",
  "media",
  "picture",
  "spriteanimation",
  "thumbnailurl",
  "uploadedvideos",
  "webviewlink"
]);

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
        .filter(([key]) => !mediaPayloadKeys.has(key.toLowerCase()))
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

const worldCategoryIds = [
  "locations",
  "cultures",
  "factions",
  "timeline",
  "magicSystems",
  "characterLinks",
  "myths",
  "items",
  "rules",
  "mysteries",
  "glossary"
];
