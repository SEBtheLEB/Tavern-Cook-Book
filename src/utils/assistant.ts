import type {
  AssistantAction,
  AssistantMode,
  AssistantPatch,
  AssistantPlan,
  ArtVaultSection,
  ArtVaultSlot,
  BestiaryCategoryArtVault,
  BestiaryCreature,
  LoreDatabase,
  LoreEntry,
  WorldBuildingCategoryId,
  WorldBuildingEntry
} from "../types";
import { cloneDatabase, ensureGwenToolArtVault, normalizeEntry, nowIso, slugify } from "./entries";
import { createBestiaryCategoryArtVaultRecord, normalizeBestiaryCategoryArtVault, normalizeBestiaryCreature } from "./bestiary";
import { compactScribeTargetHelpers, getSelectedScribeHelpers, scribeTargetHelperGuidance } from "./scribeCommands";
import type { ScribeMemoryRule } from "./scribeMemory";
import { createEmptyWorldBuilding, createWorldBuildingEntry, worldBuildingCategoryIds } from "./worldBuilding";

const assistantJsonInstructions = `Return only structured JSON in this exact shape:
{
  "summary": "Short explanation of proposed changes",
  "plan": {
    "intent": "What the user asked Scribe to accomplish",
    "scope": "Where Scribe will and will not act",
    "targetModules": [
      {
        "kind": "entry",
        "id": "entry-id",
        "title": "Gwen",
        "location": "Characters",
        "reason": "Why this module needs an edit"
      }
    ],
    "steps": [
      {
        "title": "Update Gwen's age",
        "target": "Characters / Gwen",
        "intent": "Change existing age facts without changing layout",
        "allowedActions": ["setData"],
        "expectedResult": "Gwen reads as 27 everywhere relevant"
      }
    ],
    "checks": ["Recipes are stored in Food & Inventory", "No code/layout/secret changes"],
    "needsClarification": false,
    "clarificationQuestion": "",
    "riskLevel": "low"
  },
  "changes": [
    {
      "action": "setData",
      "target": "entry",
      "id": "entry-id",
      "path": "internalLore",
      "oldValue": "...",
      "newValue": "..."
    },
    {
      "action": "setData",
      "target": "creature",
      "id": "creature-id",
      "path": "stats.health",
      "newValue": "Medium"
    },
    {
      "action": "setData",
      "target": "worldEntry",
      "category": "cultures",
      "id": "world-entry-id",
      "path": "fields.beliefsCustoms",
      "newValue": "..."
    },
    {
      "action": "renameReference",
      "oldName": "Old Name",
      "newName": "New Name",
      "scope": "all"
    },
    {
      "action": "add",
      "entry": { }
    },
    {
      "action": "removeEntry",
      "id": "entry-id",
      "title": "Old Entry",
      "archiveTitle": "Removed Entry: Old Entry",
      "archiveContent": "Why it was removed and any useful notes."
    },
    {
      "action": "addCreature",
      "creature": { "name": "New Creature" }
    },
    {
      "action": "removeCreature",
      "id": "creature-id",
      "name": "Old Creature",
      "archiveTitle": "Removed Creature: Old Creature",
      "archiveContent": "Why it was removed and any useful notes."
    },
    {
      "action": "addWorldEntry",
      "category": "cultures",
      "entry": { "title": "New Culture", "summary": "..." }
    },
    {
      "action": "addArtCategory",
      "target": "creature",
      "id": "creature-id",
      "sectionTitle": "Sprite Sheets",
      "slots": ["Idle Sprite Sheet", "Attack 01 Sprite Sheet"]
    },
    {
      "action": "addArtSlot",
      "target": "creature",
      "id": "creature-id",
      "sectionTitle": "Production Art",
      "label": "New Slot"
    },
    {
      "action": "renameArtSlot",
      "target": "creature",
      "id": "creature-id",
      "sectionTitle": "Sprite Sheets",
      "label": "Old Slot",
      "newLabel": "New Slot"
    },
    {
      "action": "removeArtSlot",
      "target": "bestiaryCategory",
      "categoryName": "Insects",
      "label": "Old Slot"
    },
    {
      "action": "removeArtCategory",
      "target": "creature",
      "id": "creature-id",
      "sectionTitle": "Dialogue Sprites"
    },
    {
      "action": "archive",
      "title": "Old Entry Note",
      "content": "Short note about why this older entry was archived."
    }
  ],
  "warnings": []
}
Rules: plan first, then provide changes. The plan must explain intent, target modules, review steps, and validation checks. Only change app database content such as text, fields, tags, bestiary stats/drops/lore, world-building fields, art vault categories, and art slot labels. Never propose code, layout, CSS, API keys, images, Drive file deletion, or development changes. Prefer precise updates across every related place that should reflect the user's instruction. Include warnings when canon or naming decisions are uncertain.
Rules continued: every requested clause must produce a matching change or a warning. If the user asks to change an existing character, faction, culture, location, quest, story, item, recipe, or marketing page, use action "setData" with target "entry" and the id from entryIndex/relevantEntries. Do not use targets like "character", "faction", or "culture"; those are stored as entries. Before adding a normal lore entry, scan entryIndex for an exact or near-exact title match and update that existing entry instead of creating a duplicate. The Pantry is a top-level app tab; its underlying stored entry.category is "Food & Inventory". Food, menu items, ingredients, meals, recipes, drinks, ales, tonics, cooking inventory, and culinary magic belong in The Pantry, not Story, unless the user explicitly asks for story lore about food culture. For Art Vault and Art Binder requests, use artSlotIndex and the art actions; target one named subject only unless the user explicitly asks for all visible/all subjects/all creatures. Creature Art Binder categories should be creature-specific and should not receive character-only Dialogue Sprites or Gwen weapon slots unless explicitly requested. World Building modules are separate from lore entries: if a matching concept exists in worldIndex/relevantWorldEntries, also update it with setData target "worldEntry". If both an entry and worldEntry exist for the same concept, update both. If the user asks to remove/delete/archive a Bestiary creature, return removeCreature using the id from bestiaryIndex/relevantCreatures; do not return only archive for that request. Include archiveContent on removeCreature only when the user wants a note kept. If the user changes a character's age, update existing age text and add or update fields.Age. If the user declares a relationship between an existing character and an existing people/culture/faction, update both related existing entries when possible, update the matching worldEntry fields, and add the character to relatedEntries when the current worldEntry has relationship data. Do not copy the user's command, Scribe target directives, or UI routing phrases into summaries/descriptions/internal lore. For meals and recipes, put routing data in category, type, fields.pantryMealGroup, fields.ingredientsRequired, and wiki ingredients instead of prose like "belongs in The Pantry section".
Known Scribe target helper directives:
${scribeTargetHelperGuidance}`;

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
    area: "Gwen Tools",
    storedAs: "Tool: sections inside Gwen's character artVault",
    allowedActions: ["addArtCategory", "renameArtCategory", "removeArtCategory", "addArtSlot", "renameArtSlot", "removeArtSlot"],
    routing:
      "Gwen-specific Tool Binder pages. Pages use section titles like Tool: Makeshift Sickle, Tool: Gwen's OG Sword, Tool: Fire Meal, or Tool: Regular Ale, and should fit categories like Sickles, Pickaxes, Melee Weapons, Ranged Weapons, Magical Meals, Snacks, or Ales."
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

export const buildManualPrompt = (
  database: LoreDatabase,
  command: string,
  mode: AssistantMode,
  memoryRules: ScribeMemoryRule[] = []
) => `You are helping organize The Tavern Cook Book, the local-first lore bible for Tales of the Tavern by STL Productionz.

Mode: ${mode}
User command: ${command}
Permanent Scribe memory rules:
${memoryRules.length ? memoryRules.map((rule) => `- ${rule.text}`).join("\n") : "- No user-taught rules yet."}

${assistantJsonInstructions}

Compact lore context JSON:
${JSON.stringify(buildCompactLoreContext(database, command, memoryRules), null, 2)}`;

export const callAssistant = async (
  database: LoreDatabase,
  command: string,
  mode: AssistantMode,
  memoryRules: ScribeMemoryRule[] = []
): Promise<AssistantPatch> => {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ database: prepareAssistantRequestDatabase(database), command, mode, memoryRules })
  });

  const payload = (await response.json()) as { patch?: AssistantPatch; error?: string };
  if (!response.ok || !payload.patch) {
    throw new Error(payload.error || "Assistant call failed.");
  }
  return prepareAssistantPatchForCommand(database, payload.patch, command);
};

export const prepareAssistantRequestDatabase = (database: LoreDatabase): LoreDatabase => {
  const { lastAiBackupId: _lastAiBackupId, ...databaseWithoutBackupMarker } = database;
  return stripMedia({
    ...databaseWithoutBackupMarker,
    backups: []
  }) as LoreDatabase;
};

export const parseAssistantPatch = (raw: string): AssistantPatch => {
  const parsed = JSON.parse(extractJsonPayload(raw)) as AssistantPatch;
  if (!parsed || !Array.isArray(parsed.changes)) {
    throw new Error("The pasted JSON does not contain a changes array.");
  }

  return {
    summary: parsed.summary || "Assistant patch",
    plan: normalizeAssistantPlan(parsed.plan),
    changes: parsed.changes,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
  };
};

export const prepareAssistantPatchForCommand = (
  database: LoreDatabase,
  patch: AssistantPatch,
  command: string
): AssistantPatch => {
  const helpers = getSelectedScribeHelpers(command);
  const hasThePantryTarget = helpers.some((helper) => helper.id === "target-the-pantry");
  const hasMealsTarget = helpers.some((helper) => helper.id === "target-recipes");
  const hasPantryTarget = helpers.some((helper) => helper.id === "target-pantry");
  const warnings = [...(patch.warnings || [])];
  const changes = patch.changes.map((change): AssistantAction => {
    if (change.action !== "add") return change;
    return {
      ...change,
      entry: normalizeScribeAddedEntry(change.entry, {
        forceRecipe: hasMealsTarget && !hasPantryTarget,
        forceIngredient: hasPantryTarget && !hasMealsTarget
      })
    };
  });

  const preparedChanges = hasThePantryTarget || (hasMealsTarget && hasPantryTarget)
    ? addMissingPantryIngredientsForRecipes(database, changes)
    : changes;
  const validation = validateAssistantChanges(database, preparedChanges, command);

  return {
    ...patch,
    plan: normalizeAssistantPlan(patch.plan) || buildFallbackAssistantPlan(database, command, validation.changes),
    changes: validation.changes,
    warnings: uniqueStrings([...warnings, ...validation.warnings])
  };
};

const normalizeAssistantPlan = (value: unknown): AssistantPlan | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const plan = value as Partial<AssistantPlan>;
  return {
    intent: String(plan.intent || "").trim() || "Review requested Cook Book changes",
    scope: String(plan.scope || "").trim() || "App data only",
    targetModules: Array.isArray(plan.targetModules)
      ? plan.targetModules.map((target) => ({
          kind: String(target.kind || "entry"),
          id: target.id ? String(target.id) : undefined,
          title: String(target.title || "Cook Book Data"),
          location: String(target.location || "Unknown"),
          reason: String(target.reason || "Selected by Tavern Scribe")
        })).slice(0, 16)
      : [],
    steps: Array.isArray(plan.steps)
      ? plan.steps.map((step) => ({
          title: String(step.title || "Review change"),
          target: String(step.target || "Cook Book Data"),
          intent: String(step.intent || "Apply app-data update"),
          allowedActions: Array.isArray(step.allowedActions) ? step.allowedActions.map(String) : [],
          expectedResult: String(step.expectedResult || "")
        })).slice(0, 12)
      : [],
    checks: Array.isArray(plan.checks) ? plan.checks.map(String).filter(Boolean).slice(0, 12) : [],
    needsClarification: Boolean(plan.needsClarification),
    clarificationQuestion: String(plan.clarificationQuestion || ""),
    riskLevel: String(plan.riskLevel || "low")
  };
};

const validateAssistantChanges = (
  database: LoreDatabase,
  changes: AssistantAction[],
  command: string
): { changes: AssistantAction[]; warnings: string[] } => {
  const helpers = getSelectedScribeHelpers(command);
  const activeTargets = helpers.filter((helper) => helper.group === "target").map((helper) => helper.id);
  const warnings: string[] = [];
  const safeChanges = changes.filter((change) => {
    if ((change.action === "setData" && !canSetDataPath(change.path)) || (change.action === "update" && !canSetDataPath(change.field))) {
      warnings.push(`Skipped unsafe Scribe change to ${change.action === "setData" ? change.path : change.field}.`);
      return false;
    }

    if (activeTargets.length && !changeMatchesAnyTarget(database, change, activeTargets)) {
      warnings.push(`Skipped ${describeAssistantActionForWarning(change)} because it did not match the selected Scribe target.`);
      return false;
    }

    if (change.action === "add" && String(change.entry.category || "").toLowerCase() === "story" && looksLikeRecipeEntry(change.entry)) {
      change.entry = normalizeScribeRecipeEntry(change.entry);
      warnings.push(`${change.entry.title || "A recipe"} was routed to The Pantry instead of Story.`);
    }

    if (change.action === "archive" && /remove|delete/i.test(command) && /bestiary|creature|monster|enemy/i.test(command)) {
      warnings.push("Bestiary removals need removeCreature. Archive-only removal notes are kept as notes, not creature deletion.");
    }

    return true;
  });

  if (!safeChanges.length && changes.length) {
    warnings.push("No changes passed Scribe validation. Try selecting the right target or making the command more specific.");
  }

  return { changes: safeChanges, warnings };
};

const buildFallbackAssistantPlan = (
  database: LoreDatabase,
  command: string,
  changes: AssistantAction[]
): AssistantPlan => {
  const targets = summarizeAssistantTargets(database, changes);
  return {
    intent: command.trim() || "Review Cook Book data",
    scope: "App data only. No code, layout, image files, Drive files, keys, or secrets.",
    targetModules: targets,
    steps: targets.length
      ? targets.map((target) => ({
          title: `Update ${target.title}`,
          target: target.location,
          intent: target.reason,
          allowedActions: ["setData", "add", "remove", "art slot/category actions"],
          expectedResult: "Preview this module before applying."
        }))
      : [{
          title: "Review request",
          target: "Cook Book Data",
          intent: "No concrete target found yet",
          allowedActions: [],
          expectedResult: "Scribe should warn or ask for clarification."
        }],
    checks: scribeValidationRules.slice(0, 6),
    needsClarification: !changes.length,
    clarificationQuestion: !changes.length ? "Which exact module should Tavern Scribe change?" : "",
    riskLevel: changes.length > 8 ? "medium" : "low"
  };
};

const summarizeAssistantTargets = (database: LoreDatabase, changes: AssistantAction[]) => {
  const targets = new Map<string, AssistantPlan["targetModules"][number]>();
  changes.forEach((change) => {
    const target = targetForAction(database, change);
    targets.set(`${target.kind}:${target.id || target.title}:${target.location}`, target);
  });
  return [...targets.values()].slice(0, 16);
};

const targetForAction = (database: LoreDatabase, change: AssistantAction): AssistantPlan["targetModules"][number] => {
  if (change.action === "renameReference") {
    return {
      kind: "all",
      title: "Whole Cook Book",
      location: "Global text references",
      reason: `Rename ${change.oldName} to ${change.newName}`
    };
  }

  if (change.action === "setData" || change.action === "update") {
    const id = String(change.id || "");
    const entry = database.entries.find((item) => item.id === id);
    if (entry) {
      return {
        kind: "entry",
        id,
        title: entry.title,
        location: entry.category === "Food & Inventory" ? "The Pantry" : entry.category,
        reason: `Update ${change.action === "setData" ? change.path : change.field}`
      };
    }
    const creature = (database.bestiary || []).find((item) => item.id === id);
    if (creature) {
      return {
        kind: "creature",
        id,
        title: creature.name,
        location: "Bestiary",
        reason: `Update ${change.action === "setData" ? change.path : change.field}`
      };
    }
    const worldEntry = findWorldEntryForTarget(database, id, change.action === "setData" ? change.category : undefined);
    if (worldEntry) {
      return {
        kind: "worldEntry",
        id,
        title: worldEntry.entry.title,
        location: `World Building / ${worldEntry.category}`,
        reason: `Update ${change.action === "setData" ? change.path : change.field}`
      };
    }
  }

  if (change.action === "add") {
    return {
      kind: "entry",
      title: change.entry.title || "New Entry",
      location: change.entry.category === "Food & Inventory" ? "The Pantry" : change.entry.category || "Story",
      reason: "Create a new lore entry"
    };
  }

  if (change.action === "removeEntry") {
    return {
      kind: "entry",
      id: change.id,
      title: change.title || change.id || "Entry",
      location: "Entry removal",
      reason: "Remove an existing lore entry"
    };
  }

  if (change.action === "addCreature" || change.action === "removeCreature") {
    return {
      kind: "creature",
      id: change.action === "removeCreature" ? change.id : change.creature.id,
      title: change.action === "removeCreature" ? change.name || change.id || "Creature" : change.creature.name || "New Creature",
      location: "Bestiary",
      reason: change.action === "removeCreature" ? "Remove creature" : "Create creature"
    };
  }

  if (change.action === "addWorldEntry") {
    return {
      kind: "worldEntry",
      id: change.entry.id,
      title: change.entry.title || "New World Entry",
      location: `World Building / ${change.category}`,
      reason: "Create world-building module"
    };
  }

  if (isArtAction(change)) {
    return {
      kind: change.target,
      id: change.id,
      title: change.categoryName || change.id || "Art Module",
      location: change.target === "bestiaryCategory" ? "Bestiary Category Art" : "Art Vault / Art Binder",
      reason: describeAssistantActionForWarning(change)
    };
  }

  if (change.action === "archive") {
    return {
      kind: "entry",
      title: change.title || "Archive",
      location: "Archive",
      reason: "Create archive note"
    };
  }

  return {
    kind: "entry",
    title: "Cook Book Data",
    location: "App data",
    reason: describeAssistantActionForWarning(change)
  };
};

const findWorldEntryForTarget = (database: LoreDatabase, id: string, category?: string) => {
  const categories = validWorldCategory(category) ? [category as WorldBuildingCategoryId] : worldBuildingCategoryIds;
  for (const categoryId of categories) {
    const entry = (database.worldBuilding?.[categoryId] || []).find((item) => item.id === id);
    if (entry) return { category: categoryId, entry };
  }
  return null;
};

const changeMatchesAnyTarget = (database: LoreDatabase, change: AssistantAction, activeTargets: string[]) =>
  activeTargets.some((targetId) => changeMatchesTarget(database, change, targetId));

const changeMatchesTarget = (database: LoreDatabase, change: AssistantAction, targetId: string) => {
  if (targetId === "target-art-vault" || targetId === "target-art-binder") return isArtAction(change);
  if (targetId === "target-gwen-tools") return isGwenToolArtAction(database, change);
  if (targetId === "target-archive") return change.action === "archive" || Boolean("archiveContent" in change && change.archiveContent);
  if (targetId === "target-bestiary") {
    return change.action === "addCreature" ||
      change.action === "removeCreature" ||
      (change.action === "setData" && resolveSetDataTarget(database, change) === "creature") ||
      (isArtAction(change) && (change.target === "creature" || change.target === "bestiaryCategory"));
  }
  if (targetId === "target-world") {
    return change.action === "addWorldEntry" || (change.action === "setData" && resolveSetDataTarget(database, change) === "worldEntry");
  }
  if (targetId === "target-characters") return changeTargetsEntryCategory(database, change, "Characters");
  if (targetId === "target-quests") return changeTargetsEntryCategory(database, change, "Quests");
  if (targetId === "target-story") return changeTargetsEntryCategory(database, change, "Story");
  if (targetId === "target-marketing") return changeTargetsEntryCategory(database, change, "Marketing");
  if (targetId === "target-the-pantry" || targetId === "target-recipes" || targetId === "target-pantry" || targetId === "target-items") {
    return changeTargetsEntryCategory(database, change, "Food & Inventory");
  }
  return true;
};

const isGwenToolArtAction = (database: LoreDatabase, change: AssistantAction) => {
  if (!isArtAction(change)) return false;
  const target = normalizeArtActionTarget((change as { target?: unknown }).target);
  if (target !== "entry") return false;
  const id = String((change as { id?: unknown }).id || "");
  const entry = database.entries.find((item) => item.id === id);
  if (!entry || !/\bgwen\b/i.test(entry.title)) return false;
  const sectionTitle = String((change as { sectionTitle?: unknown }).sectionTitle || "").trim();
  const sectionId = String((change as { sectionId?: unknown }).sectionId || "").trim();
  return /^tool:/i.test(sectionTitle) || sectionId.startsWith("gwen-tool-");
};

const changeTargetsEntryCategory = (database: LoreDatabase, change: AssistantAction, category: string) => {
  if (change.action === "add") return String(change.entry.category || category).toLowerCase() === category.toLowerCase();
  if (change.action === "removeEntry") {
    const entry = findEntryToRemove(database, change.id, change.title);
    return !entry || entry.category.toLowerCase() === category.toLowerCase();
  }
  if (change.action === "update") {
    const entry = database.entries.find((item) => item.id === change.id);
    return Boolean(entry && entry.category.toLowerCase() === category.toLowerCase());
  }
  if (change.action === "setData") {
    const target = resolveSetDataTarget(database, change);
    if (target !== "entry" || !change.id) return false;
    const entry = database.entries.find((item) => item.id === change.id);
    return Boolean(entry && entry.category.toLowerCase() === category.toLowerCase());
  }
  if (isArtAction(change) && change.target === "entry" && change.id) {
    const entry = database.entries.find((item) => item.id === change.id);
    return Boolean(entry && entry.category.toLowerCase() === category.toLowerCase());
  }
  return false;
};

const isArtAction = (change: AssistantAction): change is Extract<AssistantAction, {
  action: "addArtSlot" | "renameArtSlot" | "removeArtSlot" | "addArtCategory" | "renameArtCategory" | "removeArtCategory";
}> =>
  change.action === "addArtSlot" ||
  change.action === "renameArtSlot" ||
  change.action === "removeArtSlot" ||
  change.action === "addArtCategory" ||
  change.action === "renameArtCategory" ||
  change.action === "removeArtCategory";

const describeAssistantActionForWarning = (change: AssistantAction) => {
  if (change.action === "setData") return `update ${change.path}`;
  if (change.action === "update") return `update ${change.field}`;
  if (change.action === "add") return `add ${change.entry.title || "entry"}`;
  if (change.action === "addCreature") return `add creature ${change.creature.name || ""}`.trim();
  if (change.action === "removeCreature") return `remove creature ${change.name || change.id || ""}`.trim();
  if (change.action === "addWorldEntry") return `add world entry ${change.entry.title || ""}`.trim();
  if (isArtAction(change)) return `${change.action} ${"label" in change ? change.label || "" : "sectionTitle" in change ? change.sectionTitle || "" : ""}`.trim();
  if (change.action === "renameReference") return `rename ${change.oldName}`;
  if (change.action === "removeEntry") return `remove entry ${change.title || change.id || ""}`.trim();
  return `archive ${change.title}`;
};

const extractJsonPayload = (raw: string) => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const setDeepValue = (target: Record<string, unknown>, path: string, value: unknown) => {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;
  let cursor = target;

  parts.slice(0, -1).forEach((part) => {
    const next = cursor[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  });

  cursor[parts[parts.length - 1]] = value;
};

const replaceStringInUnknown = (value: unknown, oldName: string, newName: string): unknown => {
  if (typeof value === "string") {
    return value.split(oldName).join(newName);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStringInUnknown(item, oldName, newName));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceStringInUnknown(item, oldName, newName)])
    );
  }
  return value;
};

const forbiddenPathParts = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "media",
  "image",
  "images",
  "imagefit",
  "iconimage",
  "mainimage",
  "logoimage",
  "picture",
  "thumbnailurl",
  "webviewlink",
  "drivefileid",
  "drivefolderid",
  "drivefolderlink",
  "apikey",
  "apiKey",
  "secret",
  "token"
].map((part) => part.toLowerCase()));

const pathParts = (path: string) =>
  path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

const canSetDataPath = (path: string) => {
  const parts = pathParts(path);
  if (!parts.length) return false;
  return parts.every((part) => !forbiddenPathParts.has(part.toLowerCase()));
};

const safeSetDeepValue = (target: Record<string, unknown>, path: string, value: unknown) => {
  if (!canSetDataPath(path)) return false;
  setDeepValue(target, path, value);
  return true;
};

const recipeTypePattern = /recipe|meal|menu|dish|broth|tonic|ale|drink|consumable|food magic|food item/i;
const ingredientTypePattern = /ingredient|drop|substitute|gel|essence|produce|meat|spice/i;

const normalizeScribeAddedEntry = (
  entry: Partial<LoreEntry>,
  options: { forceRecipe?: boolean; forceIngredient?: boolean } = {}
): Partial<LoreEntry> => {
  const cleaned = cleanScribeGeneratedEntry(entry);
  const recipeLike = options.forceRecipe || looksLikeRecipeEntry(cleaned);
  const ingredientLike = !recipeLike && (options.forceIngredient || looksLikeIngredientEntry(cleaned));

  if (recipeLike) return normalizeScribeRecipeEntry(cleaned);
  if (ingredientLike) return normalizeScribeIngredientEntry(cleaned);
  return cleaned;
};

const cleanScribeGeneratedEntry = (entry: Partial<LoreEntry>): Partial<LoreEntry> => ({
  ...entry,
  summary: cleanScribeGeneratedText(entry.summary),
  publicDescription: cleanScribeGeneratedText(entry.publicDescription),
  internalLore: cleanScribeGeneratedText(entry.internalLore),
  fields: cleanScribeGeneratedRecord(entry.fields),
  wiki: entry.wiki ? cleanScribeGeneratedRecord(entry.wiki as unknown as Record<string, unknown>) as unknown as LoreEntry["wiki"] : entry.wiki,
  notes: entry.notes ? cleanScribeGeneratedRecord(entry.notes as unknown as Record<string, unknown>) as unknown as LoreEntry["notes"] : entry.notes
});

const cleanScribeGeneratedRecord = (record: Record<string, unknown> | undefined) => {
  if (!record) return record;
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      typeof value === "string" ? cleanScribeGeneratedText(value) : value
    ])
  );
};

const cleanScribeGeneratedText = (value: unknown) => {
  if (typeof value !== "string") return value as string | undefined;
  return value
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("[Scribe Target:") && !line.trim().startsWith("[Scribe Mode:"))
    .join("\n")
    .replace(/\s+in the pantry'?s?\s+Meals\s*\/\s*Recipes section/gi, "")
    .replace(/\s+in the Meals\s*\/\s*Recipes section/gi, "")
    .replace(/\s+in the Pantry ingredient tab/gi, "")
    .replace(/\bIt belongs under the [^.]+?\.\s*/gi, "")
    .replace(/\bThis was added because the user asked[^.]*\.\s*/gi, "")
    .replace(/\bThe command asked[^.]*\.\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const looksLikeRecipeEntry = (entry: Partial<LoreEntry>) => {
  const title = String(entry.title || "");
  const type = String(entry.type || "");
  const tags = (entry.tags || []).join(" ");
  const hasRecipeFields = Boolean(
    entry.fields?.ingredientsRequired ||
    entry.fields?.Ingredients ||
    entry.fields?.cookingMethod ||
    entry.wiki?.ingredientsRequired
  );
  const typeLooksRecipe = recipeTypePattern.test(type) && !/system|wheel/i.test(type);
  const titleLooksRecipe = /\b(recipe|meal|menu|dish|broth|tonic|ale|drink|consumable|food item)\b/i.test(title) && !/\b(system|wheel|slot)\b/i.test(title);
  const tagLooksRecipe = recipeTypePattern.test(tags);
  return hasRecipeFields || typeLooksRecipe || titleLooksRecipe || tagLooksRecipe;
};

const looksLikeIngredientEntry = (entry: Partial<LoreEntry>) => {
  const haystack = [
    entry.title,
    entry.category,
    entry.type,
    entry.summary,
    entry.publicDescription,
    entry.internalLore,
    (entry.tags || []).join(" "),
    entry.fields && JSON.stringify(entry.fields),
    entry.wiki && JSON.stringify(entry.wiki)
  ].join(" ");
  return ingredientTypePattern.test(haystack) && !/system|recipe system|meal system/i.test(String(entry.type || ""));
};

const normalizeScribeRecipeEntry = (entry: Partial<LoreEntry>): Partial<LoreEntry> => {
  const fields = { ...(entry.fields || {}) };
  const wiki = { ...(entry.wiki || {}) };
  const type = recipeTypePattern.test(String(entry.type || "")) ? String(entry.type) : inferRecipeEntryType(entry);
  const ingredientsRequired = stringFromFirst([
    fields.ingredientsRequired,
    fields.Ingredients,
    fields.ingredients,
    wiki.ingredientsRequired
  ]);
  const gameplayEffect = stringFromFirst([
    fields.gameplayEffect,
    fields["Gameplay Effect"],
    fields.magicalEffect,
    fields.gameplayUse,
    wiki.gameplayUse
  ]);
  const pantryMealGroup = stringFromFirst([fields.pantryMealGroup]) || inferPantryMealGroup(entry);

  return {
    ...entry,
    category: "Food & Inventory",
    type,
    tags: uniqueStrings([
      ...(entry.tags || []),
      type,
      pantryMealGroupToTitle(pantryMealGroup),
      "recipe"
    ]),
    fields: {
      ...fields,
      pantryMealGroup,
      ...(ingredientsRequired ? { ingredientsRequired } : {}),
      ...(gameplayEffect ? { gameplayEffect } : {})
    },
    wiki: {
      ...wiki,
      itemType: wiki.itemType || type,
      ...(ingredientsRequired ? { ingredientsRequired } : {}),
      ...(gameplayEffect ? { gameplayUse: wiki.gameplayUse || gameplayEffect } : {})
    },
    connections: mergeEntryConnections(entry.connections, {
      recipes: pantryMealGroup === "magical-meals" ? ["Magical Meals"] : [],
      gameplaySystems: pantryMealGroup === "magical-meals"
        ? ["Cooking System", "Combat System", "Meal Slot Wheel"]
        : ["Cooking System"]
    })
  };
};

const normalizeScribeIngredientEntry = (entry: Partial<LoreEntry>): Partial<LoreEntry> => {
  const fields = { ...(entry.fields || {}) };
  const wiki = { ...(entry.wiki || {}) };
  const pantryCategory = stringFromFirst([fields.pantryCategory, wiki.itemType, entry.type]) || "Ingredient";

  return {
    ...entry,
    category: "Food & Inventory",
    type: ingredientTypePattern.test(String(entry.type || "")) ? entry.type : "Ingredient",
    tags: uniqueStrings([...(entry.tags || []), "ingredient", pantryCategory]),
    fields: {
      ...fields,
      pantryCategory,
      rarity: fields.rarity || entry.status || "Idea",
      gameplayUse: fields.gameplayUse || entry.internalLore || entry.summary || ""
    },
    wiki: {
      ...wiki,
      itemType: wiki.itemType || pantryCategory,
      loreDescription: wiki.loreDescription || entry.summary || "",
      gameplayUse: wiki.gameplayUse || entry.internalLore || ""
    }
  };
};

const inferRecipeEntryType = (entry: Partial<LoreEntry>) => {
  const value = compactUnknown(entry, 2000).toLowerCase();
  if (/magical ale|magic ale|buff ale|ability ale|tonic|elixir/.test(value)) return "Magical Ale";
  if (/\bale\b|drink|beverage|brew/.test(value)) return "Ale / Tonic";
  if (/\b(broth|stock|base|component|sauce|reduction)\b|\bprep(?:ped)?\s+(ingredient|component|base)\b/.test(value)) return "Recipe Component";
  if (/magic|magical|power|buff|ability|combat|spell|dark culinary|fire|ice|lightning|earth/.test(value)) return "Magical Meal";
  return "Meal / Recipe";
};

const inferPantryMealGroup = (entry: Partial<LoreEntry>) => {
  const value = compactUnknown(entry, 2000).toLowerCase();
  if (/\b(broth|stock|base|component|sauce|reduction)\b|\bprep(?:ped)?\s+(ingredient|component|base)\b/.test(value)) return "components";
  if (/magical ale|magic ale|buff ale|ability ale|tonic|elixir/.test(value)) return "magical-ales";
  if (/\bale\b|drink|beverage|brew/.test(value)) return "ales";
  if (/snack|quick bite|travel bite|stamina|small bite/.test(value)) return "snacks";
  if (/magic|magical|power|buff|ability|combat|spell|dark culinary|fire|ice|lightning|earth/.test(value)) return "magical-meals";
  return "tavern-meals";
};

const pantryMealGroupToTitle = (group: string) => {
  if (group === "magical-meals") return "Magical Meal";
  if (group === "magical-ales") return "Magical Ale";
  if (group === "ales") return "Ale";
  if (group === "snacks") return "Snack";
  if (group === "components") return "Recipe Component";
  return "Tavern Meal";
};

const addMissingPantryIngredientsForRecipes = (
  database: LoreDatabase,
  changes: AssistantAction[]
): AssistantAction[] => {
  const existingNames = new Set(database.entries.map((entry) => normalizeLooseName(entry.title)));
  changes.forEach((change) => {
    if (change.action === "add" && change.entry.title) {
      existingNames.add(normalizeLooseName(change.entry.title));
    }
  });

  const additions: AssistantAction[] = [];
  const addIngredient = (label: string, recipeTitle: string) => {
    const name = label.trim();
    const normalized = normalizeLooseName(name);
    if (!normalized || existingNames.has(normalized) || shouldSkipGeneratedIngredient(name)) return;
    existingNames.add(normalized);
    additions.push({
      action: "add",
      entry: normalizeScribeIngredientEntry({
        title: name,
        status: "Idea",
        spoilerLevel: "No Spoiler",
        summary: `${name} is an ingredient required by ${recipeTitle}.`,
        fields: {
          pantryCategory: inferIngredientPantryCategory(name),
          usedInRecipes: recipeTitle
        },
        wiki: {
          itemType: inferIngredientPantryCategory(name),
          usedInRecipes: recipeTitle
        },
        connections: {
          characters: [],
          locations: [],
          recipes: [recipeTitle],
          quests: [],
          items: [],
          factions: [],
          secrets: [],
          gameplaySystems: ["Cooking System"],
          enemies: [],
          timelineEvents: []
        }
      })
    });
  };

  changes.forEach((change) => {
    if (change.action === "add" && looksLikeRecipeEntry(change.entry)) {
      parseIngredientRequirementsFromEntry(change.entry).forEach((label) => addIngredient(label, change.entry.title || "new recipe"));
    }
    if (change.action === "setData" && /ingredientsrequired|ingredients/i.test(change.path)) {
      const entry = change.id ? database.entries.find((candidate) => candidate.id === change.id) : null;
      if (entry && looksLikeRecipeEntry(entry)) {
        splitIngredientList(String(change.newValue || "")).forEach((label) => addIngredient(label, entry.title));
      }
    }
  });

  return [...changes, ...additions];
};

const parseIngredientRequirementsFromEntry = (entry: Partial<LoreEntry>) =>
  splitIngredientList(stringFromFirst([
    entry.fields?.ingredientsRequired,
    entry.fields?.Ingredients,
    entry.fields?.ingredients,
    entry.wiki?.ingredientsRequired
  ]));

const splitIngredientList = (value: string) =>
  value
    .split(/[,;/]|\band\b/gi)
    .map((item) => item.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

const shouldSkipGeneratedIngredient = (name: string) =>
  /^any\b/i.test(name) || /unknown|tbd|none|optional/i.test(name);

const inferIngredientPantryCategory = (name: string) => {
  const value = name.toLowerCase();
  if (/slime|gel|essence/.test(value)) return "Slime Drop";
  if (/meat|cray|prawn|boar|husk|protein/.test(value)) return "Meat / Creature Drop";
  if (/potato|turnip|boga|herb|vegetable|veggie|root|fruit|berry/.test(value)) return "Produce";
  if (/spice|salt|pepper|rock|mineral|stone/.test(value)) return "Spice / Mineral";
  if (/corrupt|dark|magic|fire|ice|lightning|earth/.test(value)) return "Magical Ingredient";
  return "Ingredient";
};

const findExistingEntryByTitle = (database: LoreDatabase, title: string) => {
  const normalized = normalizeLooseName(title);
  if (!normalized) return null;
  return database.entries.find((entry) => normalizeLooseName(entry.title) === normalized) || null;
};

const mergeScribeEntryIntoExisting = (existing: LoreEntry, incoming: LoreEntry) =>
  normalizeEntry({
    ...existing,
    category: incoming.category || existing.category,
    type: incoming.type || existing.type,
    status: incoming.status || existing.status,
    spoilerLevel: incoming.spoilerLevel || existing.spoilerLevel,
    tags: uniqueStrings([...existing.tags, ...incoming.tags]),
    summary: incoming.summary || existing.summary,
    publicDescription: incoming.publicDescription || existing.publicDescription,
    internalLore: incoming.internalLore || existing.internalLore,
    fields: mergeNonEmptyRecords(existing.fields, incoming.fields),
    connections: mergeEntryConnections(existing.connections, incoming.connections),
    notes: mergeNonEmptyRecords(existing.notes as unknown as Record<string, unknown>, incoming.notes as unknown as Record<string, unknown>) as unknown as LoreEntry["notes"],
    wiki: mergeNonEmptyRecords(existing.wiki as unknown as Record<string, unknown> || {}, incoming.wiki as unknown as Record<string, unknown> || {}) as unknown as LoreEntry["wiki"],
    media: existing.media,
    artGallery: existing.artGallery,
    artVault: existing.artVault,
    characterArtBoard: existing.characterArtBoard,
    characterRelationships: existing.characterRelationships,
    driveFolderId: existing.driveFolderId,
    driveFolderLink: existing.driveFolderLink,
    createdAt: existing.createdAt,
    updatedAt: nowIso()
  });

const mergeNonEmptyRecords = <T extends Record<string, unknown>>(base: T, patch: Record<string, unknown> | undefined): T => ({
  ...base,
  ...Object.fromEntries(Object.entries(patch || {}).filter(([, value]) => value != null && value !== "" && (!Array.isArray(value) || value.length > 0)))
}) as T;

const mergeEntryConnections = (
  base: Partial<LoreEntry["connections"]> | undefined,
  patch: Partial<LoreEntry["connections"]> | undefined
): LoreEntry["connections"] => {
  const keys: Array<keyof LoreEntry["connections"]> = [
    "characters",
    "locations",
    "recipes",
    "quests",
    "items",
    "factions",
    "secrets",
    "gameplaySystems",
    "enemies",
    "timelineEvents"
  ];
  return Object.fromEntries(
    keys.map((key) => [key, uniqueStrings([...stringArray(base?.[key]), ...stringArray(patch?.[key])])])
  ) as unknown as LoreEntry["connections"];
};

const stringFromFirst = (values: unknown[]) =>
  values.map((value) => String(value || "").trim()).find(Boolean) || "";

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : typeof value === "string"
      ? value.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

const uniqueStrings = (values: string[]) =>
  values.map((value) => String(value || "").trim()).filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);

const setDatabaseValue = (
  database: LoreDatabase,
  action: Extract<AssistantAction, { action: "setData" }>
): LoreDatabase => {
  const stamp = nowIso();
  const target = resolveSetDataTarget(database, action);

  if (target === "entry" && action.id) {
    return {
      ...database,
      entries: database.entries.map((entry) => {
        if (entry.id !== action.id) return entry;
        const next = cloneDatabase({
          schemaVersion: 1,
          entries: [entry],
          bestiary: [],
          bestiaryCategoryVaults: [],
          worldBuilding: createEmptyWorldBuilding(),
          backups: [],
          assignments: [],
          teamMembers: [],
          userProfiles: [],
          questCategories: [],
          storyReferences: [],
          glossaryTerms: [],
          branding: { studioName: "STL Productionz" }
        }).entries[0] as LoreEntry;
        if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.path, action.newValue)) return entry;
        next.updatedAt = stamp;
        return normalizeEntry(next);
      })
    };
  }

  if (target === "creature" && action.id) {
    return {
      ...database,
      bestiary: (database.bestiary || []).map((creature) => {
        if (creature.id !== action.id) return creature;
        const next = cloneDatabase({
          schemaVersion: 1,
          entries: [],
          bestiary: [creature],
          bestiaryCategoryVaults: [],
          worldBuilding: createEmptyWorldBuilding(),
          backups: [],
          assignments: [],
          teamMembers: [],
          userProfiles: [],
          questCategories: [],
          storyReferences: [],
          glossaryTerms: [],
          branding: { studioName: "STL Productionz" }
        }).bestiary[0] as BestiaryCreature;
        if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.path, action.newValue)) return creature;
        next.updatedAt = stamp;
        return normalizeBestiaryCreature(next);
      })
    };
  }

  if (target === "worldEntry" && action.id) {
    const categoryHint = validWorldCategory(action.category || "");
    const categories = categoryHint ? [categoryHint] : worldBuildingCategoryIds;
    const worldBuilding = cloneDatabase(database).worldBuilding || createEmptyWorldBuilding();
    categories.forEach((category) => {
      worldBuilding[category] = (worldBuilding[category] || []).map((entry) => {
        if (entry.id !== action.id) return entry;
        const next = { ...entry, fields: { ...entry.fields }, tags: [...entry.tags], relatedEntries: [...entry.relatedEntries] };
        if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.path, action.newValue)) return entry;
        return { ...next, updatedAt: stamp };
      });
    });
    return { ...database, worldBuilding };
  }

  if (target === "bestiaryCategoryVault" && (action.id || action.categoryName)) {
    return {
      ...database,
      bestiaryCategoryVaults: (database.bestiaryCategoryVaults || []).map((vault) => {
        const matches = action.id ? vault.id === action.id : vault.categoryName.toLowerCase() === String(action.categoryName || "").toLowerCase();
        if (!matches) return vault;
        const next = cloneDatabase({
          schemaVersion: 1,
          entries: [],
          bestiary: [],
          bestiaryCategoryVaults: [vault],
          worldBuilding: createEmptyWorldBuilding(),
          backups: [],
          assignments: [],
          teamMembers: [],
          userProfiles: [],
          questCategories: [],
          storyReferences: [],
          glossaryTerms: [],
          branding: { studioName: "STL Productionz" }
        }).bestiaryCategoryVaults[0] as BestiaryCategoryArtVault;
        if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.path, action.newValue)) return vault;
        next.updatedAt = stamp;
        return normalizeBestiaryCategoryArtVault(next, next.categoryName, database.bestiary || []);
      })
    };
  }

  return database;
};

const resolveSetDataTarget = (
  database: LoreDatabase,
  action: Extract<AssistantAction, { action: "setData" }>
) => {
  const rawTarget = String(action.target || "").toLowerCase().replace(/[^a-z]/g, "");
  if (worldTargetAliases.has(rawTarget)) return "worldEntry";
  if (bestiaryCategoryVaultTargetAliases.has(rawTarget)) return "bestiaryCategoryVault";
  if (creatureTargetAliases.has(rawTarget)) return "creature";
  if (entryTargetAliases.has(rawTarget)) return "entry";

  const id = String(action.id || "").trim();
  if (id) {
    if (database.entries.some((entry) => entry.id === id)) return "entry";
    if ((database.bestiary || []).some((creature) => creature.id === id)) return "creature";
    if (worldBuildingCategoryIds.some((category) => (database.worldBuilding?.[category] || []).some((entry) => entry.id === id))) {
      return "worldEntry";
    }
    if ((database.bestiaryCategoryVaults || []).some((vault) => vault.id === id)) return "bestiaryCategoryVault";
  }

  const categoryName = String(action.categoryName || "").trim().toLowerCase();
  if (categoryName && (database.bestiaryCategoryVaults || []).some((vault) => vault.categoryName.toLowerCase() === categoryName)) {
    return "bestiaryCategoryVault";
  }

  return action.target;
};

const entryTargetAliases = new Set([
  "entry",
  "loreentry",
  "lore",
  "character",
  "characters",
  "faction",
  "factions",
  "culture",
  "cultures",
  "people",
  "location",
  "locations",
  "quest",
  "quests",
  "story",
  "item",
  "items",
  "recipe",
  "recipes",
  "marketing",
  "page"
]);

const creatureTargetAliases = new Set(["creature", "creatures", "bestiary", "monster", "enemy", "enemies"]);
const worldTargetAliases = new Set(["worldentry", "world", "worldbuilding", "rule", "rules", "myth", "myths", "glossary"]);
const bestiaryCategoryVaultTargetAliases = new Set([
  "bestiarycategoryvault",
  "categoryvault",
  "bestiarycategoryartvault",
  "bestiarycategory"
]);

type ArtSlotAction = Extract<AssistantAction, { action: "addArtSlot" | "renameArtSlot" | "removeArtSlot" }>;
type ArtCategoryAction = Extract<AssistantAction, { action: "addArtCategory" | "renameArtCategory" | "removeArtCategory" }>;
type AnyArtAction = ArtSlotAction | ArtCategoryAction;
type ArtSectionRef = { sectionId?: string; sectionTitle?: string };
type ArtSlotRef = { slotId?: string; label?: string };

const updateArtVaultForAction = (
  database: LoreDatabase,
  action: AnyArtAction,
  mutate: (artVault: { sections?: ArtVaultSection[] } | undefined) => { sections: ArtVaultSection[] }
): LoreDatabase => {
  const target = normalizeArtActionTarget(action.target);
  if (target === "entry" && action.id) {
    return {
      ...database,
      entries: database.entries.map((entry) => {
        if (entry.id !== action.id) return entry;
        return normalizeEntry({ ...entry, artVault: mutate(entry.artVault), updatedAt: nowIso() });
      })
    };
  }

  if (target === "creature" && action.id) {
    return {
      ...database,
      bestiary: (database.bestiary || []).map((creature) => {
        if (creature.id !== action.id) return creature;
        return normalizeBestiaryCreature({ ...creature, artVault: mutate(creature.artVault), updatedAt: nowIso() });
      })
    };
  }

  if (target === "bestiaryCategory" && action.categoryName) {
    const normalizedCategory = action.categoryName.trim();
    const existing = database.bestiaryCategoryVaults || [];
    const targetIndex = existing.findIndex((vault) => vault.categoryName.toLowerCase() === normalizedCategory.toLowerCase());
    const vaults = targetIndex >= 0
      ? existing
      : [...existing, createBestiaryCategoryArtVaultRecord(normalizedCategory, database.bestiary || [])];

    return {
      ...database,
      bestiaryCategoryVaults: vaults.map((vault) => {
        if (vault.categoryName.toLowerCase() !== normalizedCategory.toLowerCase()) return vault;
        return normalizeBestiaryCategoryArtVault(
          { ...vault, artVault: mutate(vault.artVault), updatedAt: nowIso() },
          vault.categoryName,
          database.bestiary || []
        );
      })
    };
  }

  return database;
};

const normalizeArtActionTarget = (target: unknown) => {
  const normalized = String(target || "").toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "character" || normalized === "entry" || normalized === "loreentry") return "entry";
  if (normalized === "creature" || normalized === "bestiary" || normalized === "monster" || normalized === "enemy") return "creature";
  if (
    normalized === "bestiarycategory" ||
    normalized === "bestiarycategoryvault" ||
    normalized === "categoryvault"
  ) return "bestiaryCategory";
  return String(target || "");
};

const updateArtSlots = (
  database: LoreDatabase,
  action: ArtSlotAction,
  mode: "add" | "rename" | "remove"
): LoreDatabase => updateArtVaultForAction(database, action, (artVault) => mutateArtVaultSlots(artVault, action, mode));

const updateArtCategories = (
  database: LoreDatabase,
  action: ArtCategoryAction
): LoreDatabase => updateArtVaultForAction(database, action, (artVault) => mutateArtVaultCategories(artVault, action));

const mutateArtVaultSlots = (
  artVault: { sections?: ArtVaultSection[] } | undefined,
  action: ArtSlotAction,
  mode: "add" | "rename" | "remove"
) => {
  const sections = [...(artVault?.sections || [])].map((section) => ({
    ...section,
    slots: [...(section.slots || [])]
  }));
  const section = mode === "add" ? findOrCreateArtSection(sections, action) : findExistingArtSection(sections, action);
  if (!section) return { sections: normalizeArtVaultOrders(sections) };

  if (mode === "add" && action.action === "addArtSlot") {
    const label = action.label.trim();
    if (!label || section.slots.some((slot) => slot.label.toLowerCase() === label.toLowerCase())) {
      return { sections: normalizeArtVaultOrders(sections) };
    }
    section.slots.push(createScribeArtSlot(section.id, label, action.requirementType || section.title || "Optional", section.slots.length, action.notes || "", section.slots));
  }

  if (mode === "rename" && action.action === "renameArtSlot") {
    const slot = findExistingArtSlot(section, action);
    const newLabel = action.newLabel.trim();
    if (slot && newLabel) {
      slot.label = newLabel;
      if (action.requirementType?.trim()) slot.requirementType = action.requirementType.trim();
      if (typeof action.notes === "string") slot.notes = action.notes;
      if (slot.image) slot.image = { ...slot.image, title: newLabel, category: section.title };
    }
  }

  if (mode === "remove" && action.action === "removeArtSlot") {
    section.slots = section.slots.filter((slot) => {
      if (action.slotId?.trim() && slot.id.toLowerCase() === action.slotId.trim().toLowerCase()) return false;
      if (action.label?.trim() && slot.label.toLowerCase() === action.label.trim().toLowerCase()) return false;
      return true;
    });
  }

  return { sections: normalizeArtVaultOrders(sections) };
};

const mutateArtVaultCategories = (
  artVault: { sections?: ArtVaultSection[] } | undefined,
  action: ArtCategoryAction
) => {
  let sections = [...(artVault?.sections || [])].map((section) => ({
    ...section,
    slots: [...(section.slots || [])]
  }));

  if (action.action === "addArtCategory") {
    const title = action.sectionTitle.trim();
    if (!title) return { sections: normalizeArtVaultOrders(sections) };
    const section = findExistingArtSection(sections, { ...action, sectionTitle: title }) || createScribeArtSection(sections, title, action.description || "Category created by Tavern Scribe.");
    const slotLabels = uniqueStrings([
      ...(Array.isArray(action.slots) ? action.slots : []),
      action.firstSlotLabel || ""
    ]);
    slotLabels.forEach((label) => {
      if (!label || section.slots.some((slot) => slot.label.toLowerCase() === label.toLowerCase())) return;
      section.slots.push(createScribeArtSlot(section.id, label, action.requirementType || title, section.slots.length, action.notes || "", section.slots));
    });
  }

  if (action.action === "renameArtCategory") {
    const section = findExistingArtSection(sections, action);
    const newTitle = action.newTitle.trim();
    if (section && newTitle) {
      const oldTitle = section.title;
      section.title = newTitle;
      if (typeof action.description === "string") section.description = action.description;
      section.slots = section.slots.map((slot) => ({
        ...slot,
        requirementType: slot.requirementType === oldTitle ? newTitle : slot.requirementType,
        image: slot.image ? { ...slot.image, category: newTitle } : slot.image
      }));
    }
  }

  if (action.action === "removeArtCategory") {
    const section = findExistingArtSection(sections, action);
    if (section) sections = sections.filter((candidate) => candidate.id !== section.id);
  }

  return { sections: normalizeArtVaultOrders(sections) };
};

const findOrCreateArtSection = (
  sections: ArtVaultSection[],
  action: ArtSectionRef
) => {
  const existing = findExistingArtSection(sections, action);
  if (existing) return existing;
  return createScribeArtSection(sections, action.sectionTitle?.trim() || "Scribe Slots", "Slots created by Tavern Scribe.");
};

const findExistingArtSection = (
  sections: ArtVaultSection[],
  action: ArtSectionRef
) => {
  const sectionId = action.sectionId?.trim().toLowerCase() || "";
  const sectionTitle = action.sectionTitle?.trim().toLowerCase() || "";
  if (!sectionId && !sectionTitle) return null;
  const existing = sections.find((section) =>
    sectionId ? section.id.toLowerCase() === sectionId : section.title.toLowerCase() === sectionTitle
  );
  return existing || null;
};

const createScribeArtSection = (
  sections: ArtVaultSection[],
  title: string,
  description: string
) => {
  const section: ArtVaultSection = {
    id: uniqueArtSectionId(sections, `scribe-section-${slugify(title) || Date.now()}`),
    title,
    description,
    slots: [],
    order: sections.length
  };
  sections.push(section);
  return section;
};

const findExistingArtSlot = (
  section: ArtVaultSection,
  action: ArtSlotRef
) => {
  const slotId = action.slotId?.trim().toLowerCase() || "";
  const label = action.label?.trim().toLowerCase() || "";
  return section.slots.find((slot) =>
    slotId ? slot.id.toLowerCase() === slotId : Boolean(label) && slot.label.toLowerCase() === label
  ) || null;
};

const createScribeArtSlot = (
  sectionId: string,
  label: string,
  requirementType: string,
  order: number,
  notes: string,
  siblingSlots: ArtVaultSlot[]
): ArtVaultSlot => ({
  id: uniqueArtSlotId(siblingSlots, `${sectionId}-${slugify(label) || Date.now()}`),
  label,
  requirementType,
  status: "Missing",
  image: null,
  notes,
  order
});

const uniqueArtSectionId = (sections: ArtVaultSection[], baseId: string) => {
  const existing = new Set(sections.map((section) => section.id));
  let candidate = baseId || `scribe-section-${Date.now()}`;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  return candidate;
};

const uniqueArtSlotId = (slots: ArtVaultSlot[], baseId: string) => {
  const existing = new Set(slots.map((slot) => slot.id));
  let candidate = baseId || `scribe-slot-${Date.now()}`;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  return candidate;
};

const normalizeArtVaultOrders = (sections: ArtVaultSection[]) =>
  sections.map((section, sectionIndex) => ({
    ...section,
    order: sectionIndex,
    slots: section.slots.map((slot, slotIndex) => ({ ...slot, order: slotIndex }))
  }));

const validWorldCategory = (value: unknown): WorldBuildingCategoryId | "" => {
  const normalized = String(value || "");
  return worldBuildingCategoryIds.includes(normalized as WorldBuildingCategoryId)
    ? normalized as WorldBuildingCategoryId
    : "";
};

const applyAction = (database: LoreDatabase, action: AssistantAction): LoreDatabase => {
  if (action.action === "update") {
    return {
      ...database,
      entries: database.entries.map((entry) => {
      if (entry.id !== action.id) return entry;
      const next = cloneDatabase({
        schemaVersion: 1,
        entries: [entry],
        bestiary: [],
        bestiaryCategoryVaults: [],
        worldBuilding: createEmptyWorldBuilding(),
        backups: [],
        assignments: [],
        teamMembers: [],
        userProfiles: [],
        questCategories: [],
        storyReferences: [],
        glossaryTerms: [],
        branding: { studioName: "STL Productionz" }
      }).entries[0] as LoreEntry;
      if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.field, action.newValue)) return entry;
      next.updatedAt = nowIso();
      return normalizeEntry(next);
      })
    };
  }

  if (action.action === "setData") {
    return setDatabaseValue(database, action);
  }

  if (action.action === "renameReference") {
    const stamp = nowIso();
    return {
      ...database,
      entries: database.entries.map((entry) =>
        normalizeEntry({ ...(replaceStringInUnknown(entry, action.oldName, action.newName) as LoreEntry), updatedAt: stamp })
      ),
      bestiary: (database.bestiary || []).map((creature) =>
        normalizeBestiaryCreature({ ...(replaceStringInUnknown(creature, action.oldName, action.newName) as BestiaryCreature), updatedAt: stamp })
      ),
      bestiaryCategoryVaults: (database.bestiaryCategoryVaults || []).map((vault) =>
        normalizeBestiaryCategoryArtVault(
          { ...(replaceStringInUnknown(vault, action.oldName, action.newName) as BestiaryCategoryArtVault), updatedAt: stamp },
          vault.categoryName,
          database.bestiary || []
        )
      ),
      worldBuilding: Object.fromEntries(
        worldBuildingCategoryIds.map((category) => [
          category,
          (database.worldBuilding?.[category] || []).map((entry) => ({
            ...(replaceStringInUnknown(entry, action.oldName, action.newName) as WorldBuildingEntry),
            updatedAt: stamp
          }))
        ])
      ) as LoreDatabase["worldBuilding"]
    };
  }

  if (action.action === "add") {
    const preparedEntry = normalizeScribeAddedEntry(action.entry);
    const newEntry = normalizeEntry({
      id: preparedEntry.id || `${slugify(preparedEntry.title || "assistant-entry")}-${Date.now()}`,
      category: preparedEntry.category || "Story",
      type: preparedEntry.type || "Lore Entry",
      status: preparedEntry.status || "Idea",
      spoilerLevel: preparedEntry.spoilerLevel || "No Spoiler",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...preparedEntry
    });
    const existing = findExistingEntryByTitle(database, newEntry.title);
    if (existing) {
      return {
        ...database,
        entries: database.entries.map((entry) =>
          entry.id === existing.id ? mergeScribeEntryIntoExisting(entry, newEntry) : entry
        )
      };
    }
    return {
      ...database,
      entries: [newEntry, ...database.entries]
    };
  }

  if (action.action === "removeEntry") {
    const entry = findEntryToRemove(database, action.id, action.title);
    if (!entry) return database;

    const archiveContent = String(action.archiveContent || "").trim();
    const archiveEntry = archiveContent
      ? createArchiveEntry(
          action.archiveTitle || `Removed Entry: ${entry.title}`,
          archiveContent
        )
      : null;

    return {
      ...database,
      entries: [
        ...(archiveEntry ? [archiveEntry] : []),
        ...database.entries.filter((candidate) => candidate.id !== entry.id)
      ]
    };
  }

  if (action.action === "addCreature") {
    const creature = normalizeBestiaryCreature({
      id: action.creature.id || `creature-${slugify(action.creature.name || "scribe-creature")}-${Date.now()}`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...action.creature
    });
    return {
      ...database,
      bestiary: [creature, ...(database.bestiary || [])]
    };
  }

  if (action.action === "removeCreature") {
    const creature = findCreatureToRemove(database, action.id, action.name);
    if (!creature) return database;

    const archiveContent = String(action.archiveContent || "").trim();
    const archiveEntry = archiveContent
      ? createArchiveEntry(
          action.archiveTitle || `Removed Creature: ${creature.name}`,
          archiveContent
        )
      : null;

    return {
      ...database,
      entries: archiveEntry ? [archiveEntry, ...database.entries] : database.entries,
      bestiary: (database.bestiary || []).filter((candidate) => candidate.id !== creature.id)
    };
  }

  if (action.action === "addWorldEntry") {
    const category = validWorldCategory(action.category) || "glossary";
    const entry = createWorldBuildingEntry(category, action.entry);
    return {
      ...database,
      worldBuilding: {
        ...database.worldBuilding,
        [category]: [entry, ...(database.worldBuilding?.[category] || [])]
      }
    };
  }

  if (action.action === "addArtSlot") {
    return updateArtSlots(database, action, "add");
  }

  if (action.action === "renameArtSlot") {
    return updateArtSlots(database, action, "rename");
  }

  if (action.action === "removeArtSlot") {
    return updateArtSlots(database, action, "remove");
  }

  if (action.action === "addArtCategory" || action.action === "renameArtCategory" || action.action === "removeArtCategory") {
    return updateArtCategories(database, action);
  }

  if (action.action === "archive") {
    const archiveEntry = createArchiveEntry(action.title, action.content);
    return {
      ...database,
      entries: [archiveEntry, ...database.entries]
    };
  }

  return database;
};

const findEntryToRemove = (database: LoreDatabase, id?: string, title?: string) => {
  const normalizedId = String(id || "").trim();
  if (normalizedId) {
    const byId = database.entries.find((entry) => entry.id === normalizedId);
    if (byId) return byId;
  }

  const normalizedTitle = normalizeLooseName(title || "");
  if (!normalizedTitle) return null;
  return database.entries.find((entry) => normalizeLooseName(entry.title) === normalizedTitle) || null;
};

const findCreatureToRemove = (database: LoreDatabase, id?: string, name?: string) => {
  const normalizedId = String(id || "").trim();
  if (normalizedId) {
    const byId = (database.bestiary || []).find((creature) => creature.id === normalizedId);
    if (byId) return byId;
  }

  const normalizedName = normalizeLooseName(name || "");
  if (!normalizedName) return null;
  return (database.bestiary || []).find((creature) => normalizeLooseName(creature.name) === normalizedName) || null;
};

const normalizeLooseName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const createArchiveEntry = (title: string, content: string) => normalizeEntry({
  id: `archive-${slugify(title)}-${Date.now()}`,
  title,
  category: "Archive",
  type: "AI Archive Note",
  status: "Old Version",
  spoilerLevel: "No Spoiler",
  tags: ["assistant", "archive"],
  summary: content,
  internalLore: content,
  createdAt: nowIso(),
  updatedAt: nowIso()
});

export const applyAssistantPatch = (
  database: LoreDatabase,
  patch: AssistantPatch,
  selectedIndexes: number[],
  shouldBackup: boolean
): LoreDatabase => {
  const backupId = `ai-backup-${Date.now()}`;
  const selected = new Set(selectedIndexes);
  let nextDatabase = cloneDatabase(database);

  patch.changes.forEach((change, index) => {
    if (selected.has(index)) {
      nextDatabase = applyAction(nextDatabase, change);
    }
  });

  const backup = {
    id: backupId,
    label: `AI change: ${patch.summary || "Assistant patch"}`,
    createdAt: nowIso(),
    entries: cloneDatabase(database).entries,
    bestiary: cloneDatabase(database).bestiary || [],
    bestiaryCategoryVaults: cloneDatabase(database).bestiaryCategoryVaults || [],
    worldBuilding: cloneDatabase(database).worldBuilding || createEmptyWorldBuilding(),
    storyReferences: cloneDatabase(database).storyReferences || [],
    glossaryTerms: cloneDatabase(database).glossaryTerms || []
  };

  return {
    ...nextDatabase,
    backups: shouldBackup ? [backup, ...database.backups].slice(0, 12) : database.backups,
    lastAiBackupId: shouldBackup ? backupId : database.lastAiBackupId
  };
};

export const undoLastAiChange = (database: LoreDatabase): LoreDatabase | null => {
  const backup = database.backups.find((item) => item.id === database.lastAiBackupId);
  if (!backup) return null;

  return {
    ...database,
    entries: cloneDatabase({
      schemaVersion: 1,
      entries: backup.entries,
      bestiary: database.bestiary || [],
      bestiaryCategoryVaults: database.bestiaryCategoryVaults || [],
      worldBuilding: database.worldBuilding || createEmptyWorldBuilding(),
      backups: [],
      assignments: [],
      teamMembers: [],
      userProfiles: [],
      questCategories: [],
      storyReferences: database.storyReferences || [],
      glossaryTerms: database.glossaryTerms || [],
      branding: database.branding
    }).entries,
    bestiary: backup.bestiary
      ? cloneDatabase({
          schemaVersion: 1,
          entries: [],
          bestiary: backup.bestiary,
          bestiaryCategoryVaults: backup.bestiaryCategoryVaults || database.bestiaryCategoryVaults || [],
          worldBuilding: backup.worldBuilding || database.worldBuilding || createEmptyWorldBuilding(),
          backups: [],
          assignments: [],
          teamMembers: [],
          userProfiles: [],
          questCategories: [],
          storyReferences: database.storyReferences || [],
          glossaryTerms: database.glossaryTerms || [],
          branding: database.branding
        }).bestiary
      : database.bestiary,
    bestiaryCategoryVaults: backup.bestiaryCategoryVaults || database.bestiaryCategoryVaults,
    worldBuilding: backup.worldBuilding || database.worldBuilding,
    lastAiBackupId: undefined
  };
};

const buildCompactLoreContext = (
  database: LoreDatabase,
  command: string,
  memoryRules: ScribeMemoryRule[] = []
) => {
  const scored = database.entries
    .map((entry) => ({ entry, score: scoreEntry(entry, command) }))
    .sort((a, b) => b.score - a.score);
  const relevantEntries = scored
    .filter((item) => item.score > 0)
    .slice(0, 24)
    .map((item) => compactEntry(item.entry, "full"));

  return {
    app: "The Tavern Cook Book",
    studio: database.branding.studioName,
    game: "Tales of the Tavern",
    appMap: scribeAppMap,
    validationRules: scribeValidationRules,
    permanentScribeMemory: memoryRules.map((rule) => rule.text),
    scribeTargetHelpers: compactScribeTargetHelpers(),
    activeScribeHelpers: getSelectedScribeHelpers(command),
    totalEntries: database.entries.length,
    totalBestiaryCreatures: (database.bestiary || []).length,
    totalWorldEntries: worldBuildingCategoryIds.reduce((count, category) => count + (database.worldBuilding?.[category] || []).length, 0),
    contextPolicy:
      "This compact context removes media payloads. Tavern Scribe can only return app-data changes: text, fields, tags, bestiary stats/drops/lore, world-building fields, lore entries, creatures, world entries, bestiary creature remove actions, entry remove actions, and art vault/category/slot organization actions. It cannot change code, UI layout, images, Drive files, API keys, secrets, or development settings. Use activeScribeHelpers plus any [Scribe Target: ...] or [Scribe Mode: ...] directives in the user command as hard routing constraints. If multiple target helpers are active, satisfy each selected destination with separate correctly shaped actions. For exact whole-database replacements, return renameReference instead of many update actions. Characters, factions, cultures, locations, quests, items, recipes, story pages, and marketing pages from entryIndex are entries; update them with setData target entry. Before adding, scan entryIndex for same-title entries and update existing records instead of duplicating. The Pantry is a top-level app tab whose stored category is Food & Inventory. Food, menu items, ingredients, meals, recipes, drinks, ales, tonics, cooking inventory, and culinary magic should be Food & Inventory entries for The Pantry, never Story entries. For Art Vault and Art Binder requests, use artCategoryIndex, artSlotIndex, and activeScribeHelpers. Target one named subject only unless the user explicitly asks for all subjects/all creatures. Creature art categories should be creature-specific and should not include character-only Dialogue Sprites or Gwen weapon slots unless explicitly requested. World Building modules from worldIndex are separate records; when the same concept appears in entryIndex and worldIndex, update both records. For removing Bestiary creatures, return removeCreature with the creature id from bestiaryIndex. For removing normal lore entries, return removeEntry with the entry id from entryIndex. Every requested clause must be represented by at least one change or warning. Do not copy target directives or UI routing instructions into lore descriptions.",
    entryIndex: database.entries.map((entry) => compactEntry(entry, "index")),
    relevantEntries: relevantEntries.length
      ? relevantEntries
      : scored.slice(0, 12).map((item) => compactEntry(item.entry, "full")),
    bestiaryIndex: (database.bestiary || []).map((creature) => compactCreature(creature, "index")),
    relevantCreatures: relevantCreatures(database, command),
    worldIndex: compactWorldEntries(database, command, "index"),
    relevantWorldEntries: compactWorldEntries(database, command, "full").slice(0, 18),
    relationshipGraph: buildScribeRelationshipGraph(database, command),
    artCategoryIndex: compactArtCategoryIndex(database).slice(0, 120),
    artSlotIndex: compactArtSlotIndex(database).slice(0, 120)
  };
};

const compactEntry = (entry: LoreEntry, depth: "index" | "full") => {
  const base = {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    type: entry.type,
    status: entry.status,
    spoilerLevel: entry.spoilerLevel,
    tags: entry.tags.slice(0, 12),
    summary: truncate(entry.summary, depth === "index" ? 360 : 900),
    connections: compactUnknown(entry.connections, depth === "index" ? 500 : 1200),
    unresolved: truncate(entry.notes.unresolved, 360)
  };

  if (depth === "index") return base;

  return {
    ...base,
    publicDescription: truncate(entry.publicDescription, 900),
    internalLore: truncate(entry.internalLore, 1600),
    fields: compactUnknown(entry.fields, 1800),
    notes: compactUnknown(entry.notes, 1000),
    timeline: compactUnknown(entry.timeline, 1000),
    secret: compactUnknown(entry.secret, 1000),
    wiki: compactUnknown(entry.wiki, 1000),
    updatedAt: entry.updatedAt
  };
};

const compactCreature = (creature: BestiaryCreature, depth: "index" | "full") => {
  const base = {
    id: creature.id,
    name: creature.name,
    category: creature.category,
    type: creature.type,
    status: creature.status,
    threatLevel: creature.threatLevel,
    rarity: creature.rarity,
    habitat: creature.habitat,
    summary: truncate(creature.overview || creature.description, depth === "index" ? 420 : 900),
    artSlots: (creature.artVault?.sections || []).flatMap((section) =>
      (section.slots || []).map((slot) => `${section.title}: ${slot.label}`)
    ).slice(0, depth === "index" ? 12 : 36)
  };

  if (depth === "index") return base;

  return {
    ...base,
    behavior: truncate(creature.behavior, 800),
    fieldNotes: truncate(creature.fieldNotes, 800),
    stats: compactUnknown(creature.stats, 1200),
    drops: compactUnknown(creature.drops, 1200),
    habitatInfo: compactUnknown(creature.habitatInfo, 1000),
    lore: compactUnknown(creature.lore, 1400),
    gameplayPurpose: truncate(creature.gameplayPurpose, 800),
    productionNotes: truncate(creature.productionNotes, 800)
  };
};

const relevantCreatures = (database: LoreDatabase, command: string) => {
  const scored = (database.bestiary || [])
    .map((creature) => ({ creature, score: scoreUnknown(creature, command, creature.name) }))
    .sort((a, b) => b.score - a.score);
  const relevant = scored.filter((item) => item.score > 0).slice(0, 18);
  return (relevant.length ? relevant : scored.slice(0, 8)).map((item) => compactCreature(item.creature, "full"));
};

const compactWorldEntries = (database: LoreDatabase, command: string, depth: "index" | "full") => {
  const entries = worldBuildingCategoryIds.flatMap((category) =>
    (database.worldBuilding?.[category] || []).map((entry) => ({ entry, category }))
  );
  return entries
    .map((item) => ({ ...item, score: depth === "index" ? 1 : scoreUnknown(item.entry, command, item.entry.title) }))
    .filter((item) => depth === "index" || item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, depth === "index" ? 120 : 32)
    .map(({ entry, category }) => ({
      id: entry.id,
      category,
      title: entry.title,
      type: entry.type,
      summary: truncate(entry.summary, depth === "index" ? 320 : 900),
      tags: entry.tags.slice(0, 10),
      fields: depth === "full" ? compactUnknown(entry.fields, 1800) : undefined,
      relatedEntries: depth === "full" ? compactUnknown(entry.relatedEntries, 800) : undefined
    }));
};

const buildScribeRelationshipGraph = (database: LoreDatabase, command: string) => {
  const terms = commandTerms(command);
  const nameMatchesCommand = (name: string) => {
    const normalized = normalizeLooseName(name);
    return terms.some((term) => normalized.includes(term) || term.includes(normalized));
  };
  const relevantEntries = database.entries
    .filter((entry) => nameMatchesCommand(entry.title) || scoreEntry(entry, command) > 0)
    .slice(0, 16);
  const relevantWorld = worldBuildingCategoryIds.flatMap((category) =>
    (database.worldBuilding?.[category] || [])
      .filter((entry) => nameMatchesCommand(entry.title) || scoreUnknown(entry, command, entry.title) > 0)
      .map((entry) => ({ category, entry }))
  ).slice(0, 16);

  return {
    entryLinks: relevantEntries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      linkedCharacters: entry.connections.characters.slice(0, 8),
      linkedLocations: entry.connections.locations.slice(0, 8),
      linkedRecipes: entry.connections.recipes.slice(0, 8),
      linkedQuests: entry.connections.quests.slice(0, 8),
      linkedItems: entry.connections.items.slice(0, 8),
      linkedFactions: entry.connections.factions.slice(0, 8),
      timelineEvents: entry.connections.timelineEvents.slice(0, 8)
    })),
    worldLinks: relevantWorld.map(({ category, entry }) => ({
      id: entry.id,
      title: entry.title,
      category,
      relatedEntries: entry.relatedEntries.slice(0, 10).map((related) => ({
        type: related.type,
        targetId: related.targetId,
        targetCategory: related.targetCategory,
        note: related.note
      }))
    })),
    instruction:
      "Use this relationship graph to update connected profiles, world modules, story modules, pantry records, and bestiary records when the user's fact logically affects more than one place."
  };
};

const compactArtSlotIndex = (database: LoreDatabase) => {
  const entrySlots = database.entries.flatMap((entry) => {
    const gwenToolBinderInitialized = String(entry.fields?.["Gwen Tool Binder Initialized"] || "") === "true";
    const sections = /\bgwen\b/i.test(entry.title) && !gwenToolBinderInitialized
      ? ensureGwenToolArtVault(entry.artVault).sections
      : entry.artVault?.sections || [];
    return sections.flatMap((section) =>
      (section.slots || []).map((slot) => ({
        target: "entry",
        id: entry.id,
        title: entry.title,
        sectionId: section.id,
        sectionTitle: section.title,
        slotId: slot.id,
        label: slot.label
      }))
    );
  });
  const creatureSlots = (database.bestiary || []).flatMap((creature) =>
    (creature.artVault?.sections || []).flatMap((section) =>
      (section.slots || []).map((slot) => ({
        target: "creature",
        id: creature.id,
        title: creature.name,
        sectionId: section.id,
        sectionTitle: section.title,
        slotId: slot.id,
        label: slot.label
      }))
    )
  );
  const categorySlots = (database.bestiaryCategoryVaults || []).flatMap((vault) =>
    (vault.artVault?.sections || []).flatMap((section) =>
      (section.slots || []).map((slot) => ({
        target: "bestiaryCategory",
        categoryName: vault.categoryName,
        sectionId: section.id,
        sectionTitle: section.title,
        slotId: slot.id,
        label: slot.label
      }))
    )
  );
  return [...entrySlots, ...creatureSlots, ...categorySlots];
};

const compactArtCategoryIndex = (database: LoreDatabase) => {
  const entryCategories = database.entries.flatMap((entry) => {
    const gwenToolBinderInitialized = String(entry.fields?.["Gwen Tool Binder Initialized"] || "") === "true";
    const sections = /\bgwen\b/i.test(entry.title) && !gwenToolBinderInitialized
      ? ensureGwenToolArtVault(entry.artVault).sections
      : entry.artVault?.sections || [];
    return sections.map((section) => ({
      target: "entry",
      id: entry.id,
      title: entry.title,
      sectionId: section.id,
      sectionTitle: section.title,
      slotCount: section.slots?.length || 0
    }));
  });
  const creatureCategories = (database.bestiary || []).flatMap((creature) =>
    (creature.artVault?.sections || []).map((section) => ({
      target: "creature",
      id: creature.id,
      title: creature.name,
      sectionId: section.id,
      sectionTitle: section.title,
      slotCount: section.slots?.length || 0
    }))
  );
  const bestiaryCategoryCategories = (database.bestiaryCategoryVaults || []).flatMap((vault) =>
    (vault.artVault?.sections || []).map((section) => ({
      target: "bestiaryCategory",
      categoryName: vault.categoryName,
      sectionId: section.id,
      sectionTitle: section.title,
      slotCount: section.slots?.length || 0
    }))
  );
  return [...entryCategories, ...creatureCategories, ...bestiaryCategoryCategories];
};

const scoreEntry = (entry: LoreEntry, command: string) => {
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
    if (haystack.includes(term)) score += entry.title.toLowerCase().includes(term) ? 5 : 1;
  }
  if (entry.status === "Needs Rewrite") score += 1;
  if (entry.notes.unresolved) score += 1;
  return score;
};

const scoreUnknown = (value: unknown, command: string, title = "") => {
  const terms = commandTerms(command);
  const haystack = compactUnknown(value, 12000).toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += title.toLowerCase().includes(term) ? 5 : 1;
  }
  return score;
};

const commandTerms = (command: string) =>
  command
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));

const compactUnknown = (value: unknown, maxLength: number) =>
  truncate(JSON.stringify(stripMedia(value)), maxLength);

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

const stripMedia = (value: unknown): unknown => {
  if (value == null) return value;
  if (typeof value === "string") return value.startsWith("data:") ? "[media removed]" : value;
  if (Array.isArray(value)) return value.map(stripMedia);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !mediaPayloadKeys.has(key.toLowerCase()))
        .map(([key, item]) => [key, stripMedia(item)])
    );
  }
  return value;
};

const truncate = (value: string, maxLength: number) => {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength)}... [truncated]` : value;
};

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
