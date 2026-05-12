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
      "If the command contains [Scribe Target: Characters only], only change entries with category \"Characters\". For new entries, use entry.category \"Characters\" and entry.type \"Character\". Do not update quests, world entries, recipes, Bestiary creatures, or other pages unless the user removes this target."
  },
  {
    label: "The Pantry",
    group: "target",
    insertText: "[Scribe Target: The Pantry only]",
    description: "Food inventory, menu items, ingredients, meals, and recipes.",
    scribeGuidance:
      "If the command contains [Scribe Target: The Pantry only], the hard visible destination is the top-level The Pantry tab. Store these as entry.category \"Food & Inventory\" because that is the app's data category for The Pantry. Put recipes, meals, menu items, broths, ales, tonics, consumables, and food magic in The Pantry's Meals & Recipes tab with recipe/meal types, fields.pantryMealGroup, and fields.ingredientsRequired when known. Put ingredients, drops, slime gels, prep variants, and food inventory ingredients in The Pantry's Pantry Inventory tab with ingredient/drop types and fields.pantryCategory. If the user asks for a recipe and its ingredients, create or update the recipe plus separate concrete ingredient entries for the named ingredients. Never create Story entries for food, menu items, ingredients, meals, or recipes."
  },
  {
    label: "Pantry Meals / Recipes",
    group: "target",
    insertText: "[Scribe Target: Meals / Recipes only]",
    description: "Only The Pantry recipe, meal, menu, drink, and food magic entries.",
    scribeGuidance:
      "If the command contains [Scribe Target: Meals / Recipes only], the hard visible destination is The Pantry's Meals & Recipes tab. Store records as entry.category \"Food & Inventory\". Update an existing same-title Food & Inventory entry from entryIndex first; only add a new entry if no same-title recipe or meal exists. New recipe/meal entries must use entry.category \"Food & Inventory\", an entry.type containing Recipe, Meal, Broth, Ale, Tonic, Consumable, or Food Magic, and fields.pantryMealGroup plus fields.ingredientsRequired when ingredients are known. Never create a Story entry for a meal, menu item, drink, or recipe."
  },
  {
    label: "Pantry Ingredients",
    group: "target",
    insertText: "[Scribe Target: Pantry / Ingredients only]",
    description: "Only The Pantry ingredients, drops, prep variants, and food inventory entries.",
    scribeGuidance:
      "If the command contains [Scribe Target: Pantry / Ingredients only], the hard visible destination is The Pantry's Pantry Inventory tab. Store records as entry.category \"Food & Inventory\". Only change Food & Inventory entries whose type is ingredient, drop, prepared ingredient, substitute, or pantry item. For new entries, use entry.category \"Food & Inventory\", entry.type \"Ingredient\" unless the user names a more specific pantry type, and fields.pantryCategory. If this target is selected together with Meals / Recipes, create or update the recipe in The Pantry's Meals & Recipes tab and create/update separate concrete ingredient entries for its named ingredients."
  },
  {
    label: "Items / Tools",
    group: "target",
    insertText: "[Scribe Target: Items / Tools only]",
    description: "Only item, tool, artifact, and inventory object entries.",
    scribeGuidance:
      "If the command contains [Scribe Target: Items / Tools only], only change Food & Inventory entries whose type is item, tool, artifact, collectible, or inventory object. For new entries, use entry.category \"Food & Inventory\" and choose entry.type \"Item\", \"Tool\", or \"Artifact\" from the user's wording."
  },
  {
    label: "Bestiary",
    group: "target",
    insertText: "[Scribe Target: Bestiary only]",
    description: "Only creature records, Bestiary categories, and creature slots.",
    scribeGuidance:
      "If the command contains [Scribe Target: Bestiary only], only change Bestiary creatures, Bestiary category art slots, or Bestiary creature art slots. Use addCreature for new creatures and removeCreature for deleted creatures. Do not update lore entries or world entries."
  },
  {
    label: "Art Vault",
    group: "target",
    insertText: "[Scribe Target: Art Vault only]",
    description: "Only subject art vault categories, slots, labels, and notes.",
    scribeGuidance:
      "If the command contains [Scribe Target: Art Vault only], only organize art production data: artVault sections/categories, art slots, slot labels, requirement types, and notes. Use target \"entry\" plus an entry id for character/lore Art Vaults, target \"creature\" plus a creature id for Bestiary creature Art Vaults, and target \"bestiaryCategory\" plus categoryName for shared Bestiary category vaults. Prefer addArtCategory, renameArtCategory, removeArtCategory, addArtSlot, renameArtSlot, and removeArtSlot. Do not change lore text, UI layout, image files, Drive files, API keys, or uploaded image metadata. If removing a category or slot, only remove local app metadata."
  },
  {
    label: "Art Binder",
    group: "target",
    insertText: "[Scribe Target: Art Binder only]",
    description: "Organize the cross-project art board by subject, category, and slot.",
    scribeGuidance:
      "If the command contains [Scribe Target: Art Binder only], organize the same artVault data as it appears in the Art Binder. If the user names one subject like Crayhusk or Gwen, affect only that subject's own Art Binder categories and slots unless the user explicitly says all subjects, all creatures, or a whole category. For creatures, avoid character-only categories such as Dialogue Sprites or character weapon attacks unless explicitly requested; use creature-specific categories such as Core Creature Art, Animation & Combat, Gameplay References, Marketing & Misc Art, or custom creature categories. Prefer addArtCategory, renameArtCategory, removeArtCategory, addArtSlot, renameArtSlot, and removeArtSlot. Do not create lore entries or alter images/Drive files."
  },
  {
    label: "World Building",
    group: "target",
    insertText: "[Scribe Target: World Building only]",
    description: "Only World Building modules like locations, cultures, myths, and rules.",
    scribeGuidance:
      "If the command contains [Scribe Target: World Building only], only change worldEntry records or create addWorldEntry records. Choose the best world category from locations, cultures, history, magic, foodCulture, creatures, factions, quests, mysteries, glossary, or rules. Do not update normal lore entries unless the user removes this target."
  },
  {
    label: "Quests",
    group: "target",
    insertText: "[Scribe Target: Quests only]",
    description: "Only quest modules and quest-page data.",
    scribeGuidance:
      "If the command contains [Scribe Target: Quests only], only change entries with category \"Quests\". For new entries, use entry.category \"Quests\" and entry.type \"Quest\"."
  },
  {
    label: "Story",
    group: "target",
    insertText: "[Scribe Target: Story only]",
    description: "Only story, lore, timeline, secret, faction, and culture entries.",
    scribeGuidance:
      "If the command contains [Scribe Target: Story only], only change entries with category \"Story\" or story-adjacent extra views such as factions, timeline, and secrets. For new entries, use entry.category \"Story\" and choose a story-focused type from the user's wording."
  },
  {
    label: "Marketing",
    group: "target",
    insertText: "[Scribe Target: Marketing only]",
    description: "Only spoiler-safe public copy and marketing notes.",
    scribeGuidance:
      "If the command contains [Scribe Target: Marketing only], only change entries with category \"Marketing\". For new entries, use entry.category \"Marketing\" and entry.type \"Marketing Note\"."
  },
  {
    label: "Archive",
    group: "target",
    insertText: "[Scribe Target: Archive only]",
    description: "Only archive notes, old versions, and removed canon records.",
    scribeGuidance:
      "If the command contains [Scribe Target: Archive only], only create or update Archive entries. Use archive for notes about old canon. Do not use archive alone to remove Bestiary creatures; removeCreature is still required for Bestiary deletion."
  },
  {
    label: "Add / Remove Only",
    group: "mode",
    insertText: "[Scribe Mode: Add/remove entries only]",
    description: "Create or remove records and slots, without rewriting existing text.",
    scribeGuidance:
      "If the command contains [Scribe Mode: Add/remove entries only], do not rewrite or update existing text fields. Only create or remove records: add, removeEntry, addCreature, removeCreature, addWorldEntry, addArtCategory, removeArtCategory, addArtSlot, removeArtSlot, or archive. If creating a new entry, creature, world entry, art category, art slot, or archive note, include the user's supplied text inside that new record. If the user asks to remove an existing normal lore entry, use removeEntry with the entry id from entryIndex/relevantEntries."
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
).join("\n") + "\n- The Pantry is a top-level app tab. Its stored entry.category is still \"Food & Inventory\" for compatibility. If a user asks for food, menu items, ingredients, meals, recipes, drinks, ales, tonics, or cooking inventory without picking a target, prefer The Pantry over Story.\n- If multiple [Scribe Target: ...] directives are present, treat them as multiple destinations. Produce separate actions for each destination instead of picking one. Do not copy target directives, app routing instructions, or phrases like \"in The Pantry section\" into entry descriptions; routing belongs in category, type, fields, and actions.";

const scribeAppMap = [
  {
    area: "Characters",
    storedAs: "entries where category is Characters",
    allowedActions: ["setData target entry", "add entry", "removeEntry", "entry art slot actions"],
    routing: "Character facts, biographies, ages, relationships, full stories, profile fields, and character art slots."
  },
  {
    area: "The Pantry",
    storedAs: "entries where category is Food & Inventory",
    allowedActions: ["setData target entry", "add entry", "removeEntry"],
    routing:
      "Food, menu items, ingredients, meals, recipes, drinks, ales, tonics, cooking inventory, and culinary magic. Recipes use fields.pantryMealGroup and fields.ingredientsRequired."
  },
  {
    area: "Bestiary",
    storedAs: "bestiary creatures and bestiary category art vaults",
    allowedActions: ["setData target creature", "addCreature", "removeCreature", "creature art slot/category actions"],
    routing: "Creatures, enemies, wildlife, bosses, creature drops, creature lore, habitats, and creature-specific art slots."
  },
  {
    area: "World Building",
    storedAs: "worldBuilding category arrays",
    allowedActions: ["setData target worldEntry", "addWorldEntry"],
    routing: "Locations, cultures, factions, timeline/history, myths, rules, magic systems, food culture, mysteries, glossary, and world modules."
  },
  {
    area: "Story Library",
    storedAs: "entries where category is Story plus linked world entries",
    allowedActions: ["setData target entry", "add entry", "removeEntry", "setData target worldEntry"],
    routing: "Narrative lore, in-game story, timeline beats, secrets, factions, and player-facing story modules."
  },
  {
    area: "Art Vault / Art Binder",
    storedAs: "artVault sections and slots on entries, creatures, and bestiary category vaults",
    allowedActions: ["addArtCategory", "renameArtCategory", "removeArtCategory", "addArtSlot", "renameArtSlot", "removeArtSlot"],
    routing: "Only local production organization: categories, slots, labels, requirement types, and notes. No image or Drive file deletion."
  },
  {
    area: "Archive",
    storedAs: "entries where category is Archive",
    allowedActions: ["archive", "removeEntry with archiveContent", "removeCreature with archiveContent"],
    routing: "Old canon, removed notes, and optional removal records."
  }
];

const scribeValidationRules = [
  "Scribe may only change app data, never layout, CSS, code, API keys, secrets, image files, or Drive files.",
  "Food and recipes go to The Pantry, stored as Food & Inventory entries.",
  "Ingredients should be separate Food & Inventory entries when a recipe names concrete ingredient requirements.",
  "Characters, factions, cultures, locations, quests, story pages, items, recipes, and marketing pages are normal entries.",
  "World Building modules are separate records; matching concepts in entries and worldBuilding should both be updated when relevant.",
  "Bestiary creature removal must use removeCreature, not archive alone.",
  "Art Binder and Art Vault commands should use art category/slot actions and target one named subject unless the user asks for all.",
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
              `You are Tavern Scribe, the secure backend lore assistant for The Tavern Cook Book, a local-first lore bible for Tales of the Tavern by STL Productionz. Return only valid JSON matching the requested schema. First produce a concise plan, then produce precise, reviewable app-data changes. You may update lore text, structured fields, tags, bestiary stats/drops/lore, world-building entries, pantry/recipe/item entries, art vault categories, and art slot labels. You may add lore entries, bestiary creatures, world entries, art categories, and art slots. You may remove Bestiary creatures, art categories, and art slots when asked. Never propose code, UI layout, CSS, API keys, secrets, image uploads, Drive file deletion, or development changes. Preserve canon facts unless the user explicitly asks to change them. Apply permanentScribeMemory rules as user-taught corrections. Tohm never drinks from the cauldron. Lillia tore pages from the recipe book; she did not steal the whole book. Every requested clause must produce at least one change or a warning. Characters, factions, cultures, locations, quests, story pages, items, recipes, and marketing pages from entryIndex are entries; update them with setData target entry and never with targets like character, faction, or culture. Before adding a normal lore entry, scan entryIndex for an exact or near-exact title match and update that existing entry instead of creating a duplicate. The Pantry is a top-level app tab; its underlying stored entry.category is "Food & Inventory". Food, menu items, ingredients, meals, recipes, drinks, ales, tonics, cooking inventory, and culinary magic belong in The Pantry, not Story, unless the user explicitly asks for story lore about food culture. For Art Vault and Art Binder requests, use artSlotIndex and the art actions; target one named subject only unless the user explicitly asks for all visible/all subjects/all creatures. Creature Art Binder categories should be creature-specific and should not receive character-only Dialogue Sprites or Gwen weapon slots unless explicitly requested. World Building modules from worldIndex are separate records; if the same concept appears in entryIndex and worldIndex, update both records. Use relationshipGraph to find connected modules that should be updated. If the user asks to remove/delete/archive a Bestiary creature, return removeCreature using the id from bestiaryIndex/relevantCreatures; do not return only archive. Include archiveContent on removeCreature only when the user wants a note kept. If the user changes a character's age, update existing age text and add or update fields.Age. If the user declares a relationship between an existing character and an existing people/culture/faction, update both related existing entries when possible, update matching worldEntry fields, and add the character to relatedEntries when the current worldEntry has relationship data. Do not copy the user's command, Scribe target directives, or UI routing phrases into summaries/descriptions/internal lore. For meals and recipes, put routing data in category, type, fields.pantryMealGroup, fields.ingredientsRequired, and wiki ingredients instead of prose like "belongs in The Pantry section".
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
                "You are receiving compact app data, not raw app storage. Media data has been removed. Use ids from entryIndex, bestiaryIndex, worldIndex, relationshipGraph, artCategoryIndex, artSlotIndex, scribeTargetHelpers, and activeScribeHelpers. For direct field changes, return setData. For text replacements that should affect all entries/creatures/world records, return renameReference. If the user command includes a [Scribe Target: ...] or [Scribe Mode: ...] directive, treat it as a hard routing constraint. If multiple targets are active, satisfy each destination with separate correctly shaped actions. If the user asks to add/remove/rename visual production categories or slots, use addArtCategory, renameArtCategory, removeArtCategory, addArtSlot, renameArtSlot, or removeArtSlot. If the user asks to remove/delete/archive a Bestiary creature, use removeCreature with an id from bestiaryIndex/relevantCreatures. If the user asks to remove/delete a normal lore entry, use removeEntry with an id from entryIndex/relevantEntries. Do not satisfy Bestiary creature removal with archive alone. If context is insufficient for a precise update, include a warning and avoid guessing. Do not return any action outside the app-data schema. Characters, factions, cultures, locations, quests, story pages, items, recipes, and marketing pages from entryIndex are entries; update them with target entry. Before adding, scan entryIndex for same-title entries and update existing records instead of duplicating. The Pantry is a top-level app tab whose stored category is Food & Inventory. Food, menu items, ingredients, meals, recipes, drinks, ales, tonics, cooking inventory, and culinary magic should be Food & Inventory entries for The Pantry, never Story entries. For Art Vault and Art Binder requests, target one named subject only unless the user explicitly asks for all subjects/all creatures; creature art categories should be creature-specific and should not include character-only Dialogue Sprites or Gwen weapon slots unless explicitly requested. World Building modules from worldIndex are separate records; when the same concept appears in entryIndex and worldIndex, update both records. Every requested clause must be represented by at least one change or warning. Do not copy target directives or UI routing instructions into lore descriptions.",
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
                  checks: ["No code/layout changes", "Target helper routing obeyed"],
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
                    target: "creature",
                    id: "creature-id",
                    path: "stats.health",
                    newValue: "Medium"
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
                    action: "removeEntry",
                    id: "entry-id",
                    title: "Old Entry",
                    archiveTitle: "Removed Entry: Old Entry",
                    archiveContent: "Why it was removed and any useful notes."
                  },
                  {
                    action: "addCreature",
                    creature: { name: "New Creature" }
                  },
                  {
                    action: "removeCreature",
                    id: "creature-id",
                    name: "Old Creature",
                    archiveTitle: "Removed Creature: Old Creature",
                    archiveContent: "Why it was removed and any useful notes."
                  },
                  {
                    action: "addWorldEntry",
                    category: "cultures",
                    entry: { title: "New Culture", summary: "..." }
                  },
                  {
                    action: "addArtCategory",
                    target: "creature",
                    id: "creature-id",
                    sectionTitle: "Animation & Combat",
                    slots: ["Idle Animation", "Attack 01"]
                  },
                  {
                    action: "addArtSlot",
                    target: "creature",
                    id: "creature-id",
                    sectionTitle: "Production Art",
                    label: "New Slot"
                  },
                  {
                    action: "renameArtSlot",
                    target: "creature",
                    id: "creature-id",
                    sectionTitle: "Animation & Combat",
                    label: "Old Slot",
                    newLabel: "New Slot"
                  },
                  {
                    action: "removeArtSlot",
                    target: "bestiaryCategory",
                    categoryName: "Insects",
                    label: "Old Slot"
                  },
                  {
                    action: "removeArtCategory",
                    target: "creature",
                    id: "creature-id",
                    sectionTitle: "Dialogue Sprites"
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
                        enum: ["update", "setData", "renameReference", "add", "removeEntry", "addCreature", "removeCreature", "addWorldEntry", "addArtCategory", "renameArtCategory", "removeArtCategory", "addArtSlot", "renameArtSlot", "removeArtSlot", "archive"]
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
                      category: { type: "string" },
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
    .map((entry) => entry as Record<string, unknown>);
  const creatures = (Array.isArray(database?.bestiary) ? database?.bestiary || [] : [])
    .filter((creature) => creature && typeof creature === "object")
    .map((creature) => creature as Record<string, unknown>);
  const categoryVaults = (Array.isArray(database?.bestiaryCategoryVaults) ? database?.bestiaryCategoryVaults || [] : [])
    .filter((vault) => vault && typeof vault === "object")
    .map((vault) => vault as Record<string, unknown>);
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
    app: "The Tavern Cook Book",
    studio: "STL Productionz",
    game: "Tales of the Tavern",
    appMap: scribeAppMap,
    validationRules: scribeValidationRules,
    permanentScribeMemory: permanentMemory,
    scribeTargetHelpers: compactScribeTargetHelpers(),
    activeScribeHelpers: getSelectedScribeHelpers(command),
    totalEntries: entries.length,
    totalBestiaryCreatures: creatures.length,
    totalWorldEntries: worldEntries.length,
    canonRules: [
      "Tohm never drinks from the cauldron.",
      "Lillia tore pages from Tohm's recipe book; she did not steal the whole book.",
      "Tavern Scribe may only change app data, not code, layout, images, secrets, or Drive files."
    ],
    entryIndex: entries.map((entry) => compactEntry(entry, "index")),
    relevantEntries: relevantEntries.length ? relevantEntries : fallbackRelevant,
    bestiaryIndex: creatures.map((creature) => compactCreature(creature, "index")),
    relevantCreatures: relevantCreatures(creatures, command),
    worldIndex: compactWorldEntries(worldEntries, command, "index"),
    relevantWorldEntries: compactWorldEntries(worldEntries, command, "full").slice(0, 18),
    relationshipGraph: buildScribeRelationshipGraph(entries, worldEntries, command),
    artCategoryIndex: compactArtCategoryIndex(entries, creatures, categoryVaults).slice(0, 120),
    artSlotIndex: compactArtSlotIndex(entries, creatures, categoryVaults).slice(0, 120)
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
        linkedRecipes: arrayValue(connections.recipes).slice(0, 8),
        linkedQuests: arrayValue(connections.quests).slice(0, 8),
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
      "Use this relationship graph to update connected profiles, world modules, story modules, pantry records, and bestiary records when the user's fact logically affects more than one place."
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
  "foodAndRecipes",
  "creatureLinks",
  "characterLinks",
  "myths",
  "items",
  "quests",
  "rules",
  "mysteries",
  "glossary"
];
