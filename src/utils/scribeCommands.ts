export type ScribeHelperGroup = "target" | "mode";

export interface ScribeTargetHelper {
  id: string;
  label: string;
  group: ScribeHelperGroup;
  insertText: string;
  description: string;
  scribeGuidance: string;
}

export const SCRIBE_TARGET_HELPERS: ScribeTargetHelper[] = [
  {
    id: "target-characters",
    label: "Characters",
    group: "target",
    insertText: "[Scribe Target: Characters only]",
    description: "Only character modules and character-page data.",
    scribeGuidance:
      "If the command contains [Scribe Target: Characters only], only change entries with category \"Characters\". For new entries, use entry.category \"Characters\" and entry.type \"Character\". Do not update quests, world entries, recipes, Bestiary creatures, or other pages unless the user removes this target."
  },
  {
    id: "target-recipes",
    label: "Meals / Recipes",
    group: "target",
    insertText: "[Scribe Target: Meals / Recipes only]",
    description: "Only recipe and meal entries in Food & Inventory.",
    scribeGuidance:
      "If the command contains [Scribe Target: Meals / Recipes only], the hard destination is the Pantry's Meals & Recipes tab. Update an existing same-title Food & Inventory entry from entryIndex first; only add a new entry if no same-title recipe or meal exists. New recipe/meal entries must use entry.category \"Food & Inventory\", an entry.type containing Recipe, Meal, Broth, Ale, Tonic, Consumable, or Food Magic, and fields.pantryMealGroup plus fields.ingredientsRequired when ingredients are known. Never create a Story entry for a meal or recipe."
  },
  {
    id: "target-pantry",
    label: "Pantry",
    group: "target",
    insertText: "[Scribe Target: Pantry / Ingredients only]",
    description: "Only ingredients, drops, prep variants, and pantry entries.",
    scribeGuidance:
      "If the command contains [Scribe Target: Pantry / Ingredients only], the hard destination is the Pantry ingredient tab. Only change Food & Inventory entries whose type is ingredient, drop, prepared ingredient, substitute, or pantry item. For new entries, use entry.category \"Food & Inventory\", entry.type \"Ingredient\" unless the user names a more specific pantry type, and fields.pantryCategory. If this target is selected together with Meals / Recipes, create or update the recipe in Meals / Recipes and create/update separate concrete ingredient entries for its named ingredients."
  },
  {
    id: "target-items",
    label: "Items / Tools",
    group: "target",
    insertText: "[Scribe Target: Items / Tools only]",
    description: "Only item, tool, artifact, and inventory object entries.",
    scribeGuidance:
      "If the command contains [Scribe Target: Items / Tools only], only change Food & Inventory entries whose type is item, tool, artifact, collectible, or inventory object. For new entries, use entry.category \"Food & Inventory\" and choose entry.type \"Item\", \"Tool\", or \"Artifact\" from the user's wording."
  },
  {
    id: "target-bestiary",
    label: "Bestiary",
    group: "target",
    insertText: "[Scribe Target: Bestiary only]",
    description: "Only creature records, Bestiary categories, and creature slots.",
    scribeGuidance:
      "If the command contains [Scribe Target: Bestiary only], only change Bestiary creatures, Bestiary category art slots, or Bestiary creature art slots. Use addCreature for new creatures and removeCreature for deleted creatures. Do not update lore entries or world entries."
  },
  {
    id: "target-world",
    label: "World Building",
    group: "target",
    insertText: "[Scribe Target: World Building only]",
    description: "Only World Building modules like locations, cultures, myths, and rules.",
    scribeGuidance:
      "If the command contains [Scribe Target: World Building only], only change worldEntry records or create addWorldEntry records. Choose the best world category from locations, cultures, history, magic, foodCulture, creatures, factions, quests, mysteries, glossary, or rules. Do not update normal lore entries unless the user removes this target."
  },
  {
    id: "target-quests",
    label: "Quests",
    group: "target",
    insertText: "[Scribe Target: Quests only]",
    description: "Only quest modules and quest-page data.",
    scribeGuidance:
      "If the command contains [Scribe Target: Quests only], only change entries with category \"Quests\". For new entries, use entry.category \"Quests\" and entry.type \"Quest\"."
  },
  {
    id: "target-story",
    label: "Story",
    group: "target",
    insertText: "[Scribe Target: Story only]",
    description: "Only story, lore, timeline, secret, faction, and culture entries.",
    scribeGuidance:
      "If the command contains [Scribe Target: Story only], only change entries with category \"Story\" or story-adjacent extra views such as factions, timeline, and secrets. For new entries, use entry.category \"Story\" and choose a story-focused type from the user's wording."
  },
  {
    id: "target-marketing",
    label: "Marketing",
    group: "target",
    insertText: "[Scribe Target: Marketing only]",
    description: "Only spoiler-safe public copy and marketing notes.",
    scribeGuidance:
      "If the command contains [Scribe Target: Marketing only], only change entries with category \"Marketing\". For new entries, use entry.category \"Marketing\" and entry.type \"Marketing Note\"."
  },
  {
    id: "target-archive",
    label: "Archive",
    group: "target",
    insertText: "[Scribe Target: Archive only]",
    description: "Only archive notes, old versions, and removed canon records.",
    scribeGuidance:
      "If the command contains [Scribe Target: Archive only], only create or update Archive entries. Use archive for notes about old canon. Do not use archive alone to remove Bestiary creatures; removeCreature is still required for Bestiary deletion."
  },
  {
    id: "mode-add-remove",
    label: "Add / Remove Only",
    group: "mode",
    insertText: "[Scribe Mode: Add/remove entries only]",
    description: "Create or remove records and slots, without rewriting existing text.",
    scribeGuidance:
      "If the command contains [Scribe Mode: Add/remove entries only], do not rewrite or update existing text fields. Only create or remove records: add, removeEntry, addCreature, removeCreature, addWorldEntry, addArtSlot, removeArtSlot, or archive. If creating a new entry, creature, world entry, art slot, or archive note, include the user's supplied text inside that new record. If the user asks to remove an existing normal lore entry, use removeEntry with the entry id from entryIndex/relevantEntries."
  }
];

export const getSelectedScribeHelpers = (command: string) =>
  SCRIBE_TARGET_HELPERS.filter((helper) => command.includes(helper.insertText)).map(
    ({ id, label, group, insertText, description }) => ({ id, label, group, insertText, description })
  );

export const compactScribeTargetHelpers = () =>
  SCRIBE_TARGET_HELPERS.map(({ label, group, insertText, description }) => ({
    label,
    group,
    insertText,
    description
  }));

export const scribeTargetHelperGuidance = SCRIBE_TARGET_HELPERS.map((item) =>
  `- ${item.insertText}: ${item.scribeGuidance}`
).join("\n") + "\n- If multiple [Scribe Target: ...] directives are present, treat them as multiple destinations. Produce separate actions for each destination instead of picking one. Do not copy target directives, app routing instructions, or phrases like \"in the Pantry section\" into entry descriptions; routing belongs in category, type, fields, and actions.";
