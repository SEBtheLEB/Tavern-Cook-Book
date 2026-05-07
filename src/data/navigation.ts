import type { ActiveView, ViewConfig } from "../types";

export const mainNavigation: ViewConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview of canon, questions, recent work, and focus areas.",
    icon: "LayoutDashboard"
  },
  {
    id: "story",
    label: "Story",
    description: "True history, reveals, arcs, secrets, cultures, and timeline work.",
    tooltip:
      "Track the true history, player-facing reveals, character arcs, and major story structure of Tales of the Tavern.",
    category: "Story",
    icon: "BookOpen"
  },
  {
    id: "quests",
    label: "Quests",
    description: "Main quests, side quests, tutorials, flows, rewards, and reveals.",
    tooltip:
      "Track main quests, side quests, tutorials, quest flows, rewards, and lore reveals.",
    category: "Quests",
    icon: "ScrollText"
  },
  {
    id: "gameplay",
    label: "Gameplay Systems",
    description: "Cooking, combat, crafting, inventory, charms, seasons, and progression.",
    tooltip:
      "Organize cooking, combat, crafting, inventory, charms, seasons, and progression systems.",
    category: "Gameplay Systems",
    icon: "Cog"
  },
  {
    id: "food",
    label: "Food & Inventory",
    description: "Ingredients, meals, recipes, tools, artifacts, inventory, and food magic.",
    tooltip:
      "Organize ingredients, meals, recipes, tools, artifacts, inventory items, and cooking-related gameplay.",
    category: "Food & Inventory",
    icon: "ChefHat"
  },
  {
    id: "characters",
    label: "Characters",
    description: "Heroes, villains, NPCs, bosses, relationships, and visual notes.",
    tooltip:
      "Manage heroes, villains, NPCs, bosses, personalities, relationships, and visual notes.",
    category: "Characters",
    icon: "Users"
  },
  {
    id: "world",
    label: "World",
    description: "Locations, regions, POIs, corrupted states, purified states, and world details.",
    tooltip:
      "Manage locations, regions, POIs, corrupted states, purified states, and environmental storytelling.",
    category: "World",
    icon: "Map"
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Spoiler-safe descriptions, post ideas, platform-safe copy, and public lore.",
    category: "Marketing",
    icon: "Megaphone"
  },
  {
    id: "archive",
    label: "Archive",
    description: "Old versions, scrapped ideas, naming decisions, and replaced canon.",
    category: "Archive",
    icon: "Archive"
  },
  {
    id: "settings",
    label: "Settings",
    description: "Data tools, storage, theme, backups, and assistant status.",
    icon: "Settings"
  }
];

export const hubSections: Record<string, { title: string; view: ActiveView; description: string }[]> = {
  story: [
    { title: "World Overview", view: "story", description: "Broad story and worldbuilding entries." },
    { title: "Timeline", view: "timeline", description: "True, player, quest, and emotional timeline." },
    { title: "Secrets / Who Knows What", view: "secrets", description: "Truth, suspicion, ignorance, and player knowledge." },
    { title: "Factions & Cultures", view: "factions", description: "People, kingdoms, cultures, and philosophies." },
    { title: "Mythology", view: "story", description: "Cauldron myths, old tales, and divine food magic." },
    { title: "Main Story Arcs", view: "story", description: "Core arcs for Gwen, Tohm, Lillia, and the world." },
    { title: "Character Arcs", view: "characters", description: "Personal story arcs and relationships." },
    { title: "Player Knowledge Timeline", view: "timeline", description: "What the player learns and when." }
  ],
  quests: [
    { title: "Main Quests", view: "quests", description: "Primary story and progression quests." },
    { title: "Side Quests", view: "quests", description: "Optional quest ideas and NPC work." },
    { title: "Tutorial Quests", view: "quests", description: "Natural teaching moments and onboarding." },
    { title: "Character Quests", view: "quests", description: "Character-led quests and relationship beats." },
    { title: "Hidden Quests", view: "quests", description: "Secret quests and discovery-based flows." },
    { title: "Boss Quests", view: "quests", description: "Recipe-page boss progression." },
    { title: "Quest Flow Tracker", view: "quests", description: "Objective lists and quest state logic." }
  ],
  gameplay: [
    { title: "Cooking System", view: "gameplay", description: "Preparation, meals, recipes, and cooking tasks." },
    { title: "Combat System", view: "gameplay", description: "Weapons, enemies, bosses, and meal powers." },
    { title: "Crafting System", view: "gameplay", description: "Tools, upgrades, gathering, and stations." },
    { title: "Inventory System", view: "gameplay", description: "Basket UI, slots, prepared ingredients." },
    { title: "Meal Wheel", view: "gameplay", description: "Equipped meals and battle consumption." },
    { title: "Day/Night & Seasons", view: "gameplay", description: "Calendar, weather, and seasonal swaps." },
    { title: "Charm System", view: "gameplay", description: "Equippable modifiers and build choices." },
    { title: "Slime Flavor / Element System", view: "gameplay", description: "Flavor profiles, slimes, substitutions, elements." },
    { title: "Dialogue / Quest Framework", view: "gameplay", description: "Story Framework 5 notes and quest logic." }
  ],
  food: [
    { title: "Ingredients", view: "ingredients", description: "Gathered, dropped, and prepared ingredients." },
    { title: "Meals / Recipes", view: "recipes", description: "Cooked dishes, magical meals, and food powers." },
    { title: "Items", view: "items", description: "Inventory objects and practical items." },
    { title: "Tools", view: "items", description: "Crafted tools and utility items." },
    { title: "Artifacts", view: "items", description: "Magical objects and story artifacts." },
    { title: "Slime Substitutes", view: "ingredients", description: "Slime gels, essences, and flavor substitutes." },
    { title: "Ales / Tonics", view: "recipes", description: "Brewing, heals, buffs, and tavern consumables." },
    { title: "Inventory Wiki", view: "items", description: "Terraria-style item reference pages." }
  ],
  world: [
    { title: "Locations", view: "world", description: "Major places, villages, and story regions." },
    { title: "Regions", view: "world", description: "Bigger map areas and biome groupings." },
    { title: "Biomes", view: "world", description: "Environment types and visual identities." },
    { title: "Villages", view: "world", description: "Settlements, hubs, and community spaces." },
    { title: "Points of Interest", view: "world", description: "POIs, gathering spots, and landmarks." },
    { title: "Corrupted / Purified Areas", view: "world", description: "State changes and restoration notes." },
    { title: "Environmental Storytelling", view: "world", description: "Scene-level lore and world clues." }
  ]
};

export const dashboardBoxes: ViewConfig[] = [
  ...mainNavigation.filter((item) =>
    ["story", "characters", "world", "quests", "food", "gameplay", "marketing", "archive", "settings"].includes(
      item.id
    )
  ),
  {
    id: "recipes",
    label: "Recipes & Food Magic",
    description: "Magical meals, broths, corrupted dishes, ales, and cooking lore.",
    icon: "Soup"
  },
  {
    id: "ingredients",
    label: "Ingredients",
    description: "Raw ingredients, prepared ingredients, slime gels, and enemy drops.",
    icon: "Wheat"
  },
  {
    id: "enemies",
    label: "Enemies & Creatures",
    description: "Slimes, bugs, bosses, mini-bosses, drops, and behaviors.",
    icon: "Swords"
  },
  {
    id: "factions",
    label: "Factions & Cultures",
    description: "Kingdoms, cultures, cults, values, and naming issues.",
    icon: "Landmark"
  },
  {
    id: "items",
    label: "Items & Artifacts",
    description: "Tools, artifacts, collectibles, and inventory wiki entries.",
    icon: "Package"
  },
  {
    id: "timeline",
    label: "Timeline",
    description: "True, player, quest, and emotional chronology.",
    icon: "GitBranch"
  },
  {
    id: "secrets",
    label: "Secrets / Who Knows What",
    description: "Canon facts, who knows, who suspects, and reveal timing.",
    icon: "EyeOff"
  }
];
