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
      "If the command contains [Scribe Target: Characters only], only change entries with category \"Characters\". For new entries, use entry.category \"Characters\" and entry.type \"Character\". Do not update world-building modules unless the user removes this target or also selects World Building."
  },
  {
    id: "target-world",
    label: "World Building",
    group: "target",
    insertText: "[Scribe Target: World Building only]",
    description: "Only World Building modules like locations, cultures, myths, and rules.",
    scribeGuidance:
      "If the command contains [Scribe Target: World Building only], only change worldEntry records or create addWorldEntry records. Choose the best world category from locations, cultures, factions, timeline, magicSystems, characterLinks, myths, items, rules, mysteries, or glossary. Do not update character entries unless the user removes this target or also selects Characters."
  },
  {
    id: "mode-add-remove",
    label: "Add / Remove Only",
    group: "mode",
    insertText: "[Scribe Mode: Add/remove entries only]",
    description: "Create or remove records and slots, without rewriting existing text.",
    scribeGuidance:
      "If the command contains [Scribe Mode: Add/remove entries only], do not rewrite or update existing text fields. Only create or remove character entries or world-building entries. Use add for character entries, removeEntry for character removals, and addWorldEntry for world modules. Include the user's supplied text inside any new record."
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
).join("\n") + "\n- If both Characters and World Building targets are present, satisfy each destination with separate correctly shaped actions. Do not copy target directives or app routing instructions into character or world descriptions.";
