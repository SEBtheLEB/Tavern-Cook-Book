import type { ActiveView, ViewConfig } from "../types";

export const mainNavigation: ViewConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview of characters, world modules, open questions, and recent edits.",
    icon: "LayoutDashboard"
  },
  {
    id: "characters",
    label: "Characters",
    description: "Heroes, villains, NPCs, relationships, backstories, and visual notes.",
    tooltip:
      "Manage heroes, villains, NPCs, personalities, relationships, histories, and visual references.",
    category: "Characters",
    icon: "Users"
  },
  {
    id: "world",
    label: "World Building",
    description: "Living encyclopedia for locations, cultures, history, magic, myths, rules, and mysteries.",
    tooltip:
      "Manage the lands, cultures, histories, factions, myths, rules, and mysteries that shape the setting.",
    category: "World",
    icon: "Map"
  },
  {
    id: "settings",
    label: "Settings",
    description: "Data tools, storage, theme, backups, sync, and Scribe AI status.",
    icon: "Settings"
  }
];

export const hubSections: Record<string, { title: string; view: ActiveView; description: string }[]> = {
  story: [
    { title: "Characters", view: "characters", description: "Profiles, relationships, biographies, and character notes." },
    { title: "World Building", view: "world", description: "Locations, cultures, factions, histories, myths, rules, and mysteries." }
  ],
  quests: [],
  gameplay: [],
  food: [],
  world: [
    { title: "Locations", view: "world", description: "Major places, villages, regions, and landmarks." },
    { title: "Cultures", view: "world", description: "Peoples, traditions, daily life, and beliefs." },
    { title: "Factions", view: "world", description: "Groups, politics, leadership, resources, and conflicts." },
    { title: "Rules & Mysteries", view: "world", description: "Canon rules, unresolved questions, and contradiction notes." }
  ]
};

export const dashboardBoxes: ViewConfig[] = [
  ...mainNavigation.filter((item) => ["characters", "world", "settings"].includes(item.id))
];

