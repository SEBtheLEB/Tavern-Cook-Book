import type { ActiveView, AssistantChangedTarget } from "../types";

export interface ScribeCommandDefinition {
  id: string;
  command: string;
  aliases: string[];
  destination: string;
  description: string;
  scribeGuidance: string;
  target?: AssistantChangedTarget;
}

const viewTarget = (view: ActiveView): AssistantChangedTarget => ({ kind: "view", view });

export const SCRIBE_COMMANDS: ScribeCommandDefinition[] = [
  {
    id: "add-character",
    command: "Add Character",
    aliases: ["add new character", "add nee character", "new character", "create character"],
    destination: "Characters",
    description: "Creates a new character module on the Characters page.",
    scribeGuidance:
      "When the user says Add Character, Add New Character, Add Nee Character, New Character, or Create Character, return an add action with entry.category \"Characters\", entry.type \"Character\", entry.status \"Idea\", and a title from the command or \"New Character\" if no name is given.",
    target: viewTarget("characters")
  },
  {
    id: "add-recipe",
    command: "Add Recipe",
    aliases: ["add meal", "new recipe", "create meal", "add food"],
    destination: "Food & Inventory / Meals / Recipes",
    description: "Creates a new recipe or meal module in the Meals / Recipes area.",
    scribeGuidance:
      "When the user says Add Recipe, Add Meal, New Recipe, Create Meal, or Add Food, return an add action with entry.category \"Food & Inventory\", entry.type \"Recipe / Meal\", entry.status \"Idea\", and a title from the command or \"New Recipe\" if no name is given. This should appear in the recipes view.",
    target: viewTarget("recipes")
  },
  {
    id: "add-ingredient",
    command: "Add Ingredient",
    aliases: ["add pantry item", "new ingredient", "add drop"],
    destination: "Food & Inventory / Pantry",
    description: "Creates a new pantry ingredient, drop, or prepared ingredient module.",
    scribeGuidance:
      "When the user says Add Ingredient, Add Pantry Item, New Ingredient, or Add Drop, return an add action with entry.category \"Food & Inventory\", entry.type \"Ingredient\", entry.status \"Idea\", and a title from the command or \"New Ingredient\" if no name is given. This should appear in the pantry/ingredients view.",
    target: viewTarget("ingredients")
  },
  {
    id: "add-item",
    command: "Add Item",
    aliases: ["add tool", "add artifact", "new inventory item"],
    destination: "Food & Inventory / Items",
    description: "Creates a new item, tool, artifact, or inventory module.",
    scribeGuidance:
      "When the user says Add Item, Add Tool, Add Artifact, or New Inventory Item, return an add action with entry.category \"Food & Inventory\", entry.type \"Item\", entry.status \"Idea\", and a title from the command or \"New Item\" if no name is given. Use type \"Tool\" or \"Artifact\" when the command says tool or artifact.",
    target: viewTarget("items")
  },
  {
    id: "add-creature",
    command: "Add Creature",
    aliases: ["add bestiary entry", "add monster", "add enemy", "new creature"],
    destination: "Bestiary",
    description: "Creates a new creature record in the Bestiary.",
    scribeGuidance:
      "When the user says Add Creature, Add Bestiary Entry, Add Monster, Add Enemy, or New Creature, return addCreature. Use the creature name from the command or \"New Creature\" if no name is given. If the user says insects, bosses, slimes, friendly, wildlife, or another Bestiary group, set creature.category to that group.",
    target: viewTarget("bestiary")
  },
  {
    id: "add-faction",
    command: "Add Faction",
    aliases: ["add culture", "add people", "add cult", "new faction"],
    destination: "Factions & Cultures",
    description: "Creates a faction/culture lore module and, when useful, a matching world-building entry.",
    scribeGuidance:
      "When the user says Add Faction, Add Culture, Add People, Add Cult, or New Faction, return an add action with entry.category \"Story\", entry.type \"Faction / Culture\", entry.status \"Idea\", and a title from the command or \"New Faction\" if no name is given. If the request is clearly a world-building culture, people, kingdom, or cult, also return addWorldEntry with category \"cultures\".",
    target: viewTarget("factions")
  },
  {
    id: "add-world-entry",
    command: "Add World Entry",
    aliases: ["add location", "add place", "add myth", "add worldbuilding"],
    destination: "World Building",
    description: "Creates a new World Building module such as a location, culture, myth, rule, or mystery.",
    scribeGuidance:
      "When the user says Add World Entry, Add Location, Add Place, Add Myth, or Add Worldbuilding, return addWorldEntry. Choose the best world category from locations, cultures, history, magic, foodCulture, creatures, factions, quests, mysteries, glossary, or rules. Use the title from the command or \"New World Entry\" if no name is given.",
    target: viewTarget("world")
  },
  {
    id: "add-quest",
    command: "Add Quest",
    aliases: ["add side quest", "add main quest", "new quest"],
    destination: "Quests",
    description: "Creates a quest module in the Quests area.",
    scribeGuidance:
      "When the user says Add Quest, Add Side Quest, Add Main Quest, or New Quest, return an add action with entry.category \"Quests\", entry.type \"Quest\", entry.status \"Idea\", and a title from the command or \"New Quest\" if no name is given.",
    target: viewTarget("quests")
  },
  {
    id: "add-story",
    command: "Add Story Entry",
    aliases: ["add story", "add lore page", "new story page"],
    destination: "Story",
    description: "Creates a new story or lore module for arcs, reveals, and canon notes.",
    scribeGuidance:
      "When the user says Add Story Entry, Add Story, Add Lore Page, or New Story Page, return an add action with entry.category \"Story\", entry.type \"Story Page\", entry.status \"Idea\", and a title from the command or \"New Story Entry\" if no name is given.",
    target: viewTarget("story")
  },
  {
    id: "add-marketing",
    command: "Add Marketing Note",
    aliases: ["add marketing", "add post idea", "new public copy"],
    destination: "Marketing",
    description: "Creates a spoiler-safe marketing or public-copy module.",
    scribeGuidance:
      "When the user says Add Marketing Note, Add Marketing, Add Post Idea, or New Public Copy, return an add action with entry.category \"Marketing\", entry.type \"Marketing Note\", entry.status \"Idea\", and a spoiler-safe title from the command or \"New Marketing Note\" if no name is given.",
    target: viewTarget("marketing")
  },
  {
    id: "archive-note",
    command: "Archive Note",
    aliases: ["archive this", "save old version", "old version note"],
    destination: "Archive",
    description: "Creates an Archive note for old canon, replaced names, or removed ideas.",
    scribeGuidance:
      "When the user says Archive Note, Archive This, Save Old Version, or Old Version Note, return archive with a clear title and content. Do not use archive alone to remove a Bestiary creature; use removeCreature for Bestiary creature removal.",
    target: viewTarget("archive")
  },
  {
    id: "add-art-slot",
    command: "Add Art Slot",
    aliases: ["add production slot", "add image slot", "add visual slot"],
    destination: "Relevant module art slots",
    description: "Adds a production/image slot to a specific character, creature, or Bestiary category.",
    scribeGuidance:
      "When the user says Add Art Slot, Add Production Slot, Add Image Slot, or Add Visual Slot, return addArtSlot for the target module. Use target \"entry\" with an entry id for characters/items/quests/etc., target \"creature\" with a creature id for Bestiary creatures, or target \"bestiaryCategory\" with categoryName for Bestiary category slots. Include sectionTitle and label."
  }
];

export const compactScribeCommands = () =>
  SCRIBE_COMMANDS.map(({ command, aliases, destination, description }) => ({
    command,
    aliases,
    destination,
    description
  }));

export const scribeCommandGuidance = SCRIBE_COMMANDS.map((item) =>
  `- ${item.command}: ${item.scribeGuidance}`
).join("\n");
