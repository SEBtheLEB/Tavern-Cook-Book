import type {
  BestiaryCreature,
  LoreEntry,
  WorldBuildingCategoryId,
  WorldBuildingData,
  WorldBuildingEntry,
  WorldBuildingRelatedEntry
} from "../types";
import { normalizeImageFit } from "./imageFit";
import { slugify } from "./entries";

export interface WorldBuildingCategoryConfig {
  id: WorldBuildingCategoryId;
  title: string;
  shortTitle: string;
  icon: string;
  description: string;
  defaultType: string;
  entryLabel: string;
  sections: Array<{
    id: string;
    title: string;
    helper: string;
    placeholder: string;
  }>;
}

export const worldBuildingCategories: WorldBuildingCategoryConfig[] = [
  {
    id: "locations",
    title: "Locations & Regions",
    shortTitle: "Locations",
    icon: "Map",
    description: "Document forests, islands, kingdoms, villages, caves, taverns, ruins, and important places.",
    defaultType: "Region",
    entryLabel: "Location",
    sections: [
      section("overview", "Location Overview", "Type, parent region, current state, summary, and first appearance.", "Location type, parent area, current state, first seen, and core summary."),
      section("visualIdentity", "Visual Identity", "Mood, palette, architecture, terrain, weather, sound, and art direction.", "Environment mood, color palette, lighting, architecture, foliage, landmarks, weather, sound/music notes."),
      section("history", "History", "Origin, founders, disasters, wars, migrations, and major changes over time.", "Important past events, who founded it, what changed, disasters, curses, corruption, or migrations."),
      section("inhabitants", "Inhabitants", "Characters, cultures, creatures, and factions connected to this place.", "Characters from here, peoples who live here, creatures found here, factions that influence it."),
      section("gameplayUse", "Gameplay Use", "Hub, dungeon, boss arena, resources, quests, hazards, and unlocks.", "Gameplay role, resources, enemies, bosses, NPCs, quests, unlocks, and hazards.")
    ]
  },
  {
    id: "cultures",
    title: "Cultures & Peoples",
    shortTitle: "Cultures",
    icon: "Users",
    description: "Track peoples, species, communities, traditions, daily life, visual design, and customs.",
    defaultType: "Culture",
    entryLabel: "Culture",
    sections: [
      section("overview", "Culture Overview", "Species, home region, values, social structure, and common roles.", "Culture name, people type, home region, values, social structure, common roles/jobs."),
      section("dailyLife", "Daily Life", "Food habits, work, homes, clothing, family, taverns, games, and festivals.", "Food habits, work, homes, clothing, family structure, festivals, music, games, taverns, traditions."),
      section("beliefsCustoms", "Beliefs & Customs", "Myths, taboos, rituals, sacred items, superstitions, and hero stories.", "Myths, taboos, sacred foods/items, rituals, funeral practices, family customs, hero stories."),
      section("visualDesign", "Visual Design", "Clothing, shape language, architecture, symbols, props, and body features.", "Clothing style, color palette, architecture, symbols, props, hairstyles, body features, reference art."),
      section("relationships", "Relationship With Other Cultures", "Allies, enemies, trade partners, conflicts, and misunderstandings.", "Allies, enemies, trade partners, historical conflicts, cultural misunderstandings, shared traditions.")
    ]
  },
  {
    id: "factions",
    title: "Factions & Kingdoms",
    shortTitle: "Factions",
    icon: "Landmark",
    description: "Organize kingdoms, guilds, cults, armies, councils, political powers, and story groups.",
    defaultType: "Faction",
    entryLabel: "Faction",
    sections: [
      section("overview", "Faction Overview", "Type, leader, base, summary, goal, and current status.", "Name, faction type, leader, base/location, summary, goal, current status."),
      section("leadership", "Leadership", "Important members, ranks, hierarchy, succession, and internal conflict.", "Leader, members, ranks, hierarchy, succession rules, internal conflicts."),
      section("beliefsGoals", "Beliefs & Goals", "Ideology, fears, morals, wants, and what they will do to win.", "Main ideology, what they want, what they fear, limits, tone, moral alignment."),
      section("resourcesPower", "Resources & Power", "Military, magic, money, food, artifacts, territory, and influence.", "Military power, magic access, money, food supply, artifacts, political influence, territory."),
      section("storyRole", "Story Role", "How this faction affects the plot, quests, bosses, enemies, and stakes.", "Plot role, important story events, quests, bosses, enemies, connected characters.")
    ]
  },
  {
    id: "timeline",
    title: "History & Timeline",
    shortTitle: "Timeline",
    icon: "GitBranch",
    description: "Build a visual record of ancient events, wars, migrations, curses, discoveries, and story beats.",
    defaultType: "Timeline Event",
    entryLabel: "Event",
    sections: [
      section("event", "Timeline Event", "Era, event type, summary, full description, and tags.", "Date / era / year, event type, short summary, full description."),
      section("causes", "Causes", "What caused this event and what forces were involved.", "What caused it, who made it happen, what pressures led to it."),
      section("consequences", "Consequences", "What changed afterward for people, places, factions, magic, and story.", "What changed because of it, consequences, damage, rewards, political changes."),
      section("involved", "Involved Entries", "Characters, locations, factions, items, relics, and quests tied to the event.", "Characters involved, locations involved, factions involved, items/relics involved, related quests.")
    ]
  },
  {
    id: "magicSystems",
    title: "Magic & Culinary Arts",
    shortTitle: "Magic",
    icon: "WandSparkles",
    description: "Explain culinary magic, Dark Culinary Arts, recipe powers, curses, faery magic, and limitations.",
    defaultType: "Magic System",
    entryLabel: "Magic System",
    sections: [
      section("overview", "Magic Overview", "Source, users, learning method, manifestation, and limitations.", "Name, type, source, who can use it, how it is learned, how it manifests, limitations."),
      section("rules", "Rules", "What it can do, cannot do, costs, risks, ingredients, tools, and side effects.", "Capabilities, hard limits, costs, risks, required tools/ingredients/recipes, effects on body/mind/world."),
      section("visualEffects", "Visual Effects", "Palette, particles, symbols, aura, sound, animation, and UI notes.", "Color palette, particles, symbol shapes, aura, sound design, animation notes, UI notes."),
      section("gameplayFunction", "Gameplay Function", "Player use, unlocks, combat, puzzles, progression, restrictions, and balance.", "How the player uses it, unlock conditions, combat/puzzle/progression use, restrictions, balancing notes."),
      section("storyFunction", "Story Function", "Who uses it, conflict, Gwen/Tohm/Lillia connections, and world impact.", "Why it matters, who uses it, how it causes conflict, story stakes, world changes.")
    ]
  },
  {
    id: "foodAndRecipes",
    title: "Food, Ingredients & Recipes",
    shortTitle: "Food",
    icon: "ChefHat",
    description: "Connect food culture, ingredients, recipes, magical dishes, corrupted dishes, and gameplay effects.",
    defaultType: "Food Lore",
    entryLabel: "Food Entry",
    sections: [
      section("overview", "Food Overview", "Name, type, region, culture, rarity, and summary.", "Ingredient, recipe, meal, drink, magical dish, corrupted dish, region, culture, rarity."),
      section("culinaryUse", "Culinary Use", "Taste, texture, smell, methods, tools, pairings, and cultural meaning.", "Taste, texture, smell, cooking method, tools, pairings, cultural meaning."),
      section("gameplayUse", "Gameplay Use", "Buffs, healing, combat, crafting, quests, resource source, and locations.", "Buffs, healing, combat effect, crafting use, quest use, where found."),
      section("magicalEffect", "Magical Effect", "Powers, duration, side effects, risks, users, and corruption potential.", "Power granted, duration, side effects, risks, who used it, corruption risk.")
    ]
  },
  {
    id: "creatureLinks",
    title: "Creatures & Bestiary Links",
    shortTitle: "Creatures",
    icon: "Swords",
    description: "Reference creatures from the Bestiary inside regions, food chains, quests, and lore.",
    defaultType: "Creature Link",
    entryLabel: "Creature Link",
    sections: [
      section("loreNote", "Creature Lore Note", "How this creature fits into worldbuilding beyond its Bestiary stats.", "Regional lore, ecosystem role, story relevance, cultural meaning."),
      section("ecosystem", "Ecosystem", "Habitats, food chain, behavior, predators, prey, and corruption impact.", "Where it lives, what it eats, predators/prey, behavior, seasonal patterns, corruption effects."),
      section("gameplayStoryLinks", "Gameplay & Story Links", "Quests, drops, ingredients, bosses, and player-facing moments.", "Bestiary connection, quests, drops, ingredients, boss usage, player encounters.")
    ]
  },
  {
    id: "characterLinks",
    title: "Characters & Relationships",
    shortTitle: "Characters",
    icon: "UserRound",
    description: "Browse characters by region, culture, faction, role, relationship, act, species, and status.",
    defaultType: "Character Link",
    entryLabel: "Character Link",
    sections: [
      section("worldRole", "World Role", "How this character fits into regions, cultures, factions, and history.", "Region, culture, faction, story role, act, status, species, occupation."),
      section("relationships", "Relationship Web", "How relationships affect the world, politics, quests, and reveals.", "Important relationships, alliances, rivalries, family, mentors, enemies."),
      section("automaticLinks", "Automatic World Links", "Notes for locations, factions, cultures, magic, and bestiary connections.", "Which world entries should show this character and why.")
    ]
  },
  {
    id: "myths",
    title: "Religions, Myths & Legends",
    shortTitle: "Myths",
    icon: "BookOpen",
    description: "Record myths, legends, folktales, prophecies, symbols, beliefs, taboos, and worldview lore.",
    defaultType: "Myth",
    entryLabel: "Myth",
    sections: [
      section("overview", "Myth Overview", "Type, connected culture, region, and short summary.", "Myth, legend, prophecy, folktale, belief, taboo, ritual, culture, region."),
      section("fullStory", "Full Story", "Long-form text for the myth, legend, prophecy, or folktale.", "Write the full myth or legend here."),
      section("meaning", "Meaning", "What it teaches, what people believe, and whether it is true.", "Lesson, belief, cultural effect, what is true or false in the actual world."),
      section("symbols", "Symbols", "Colors, foods, relics, places, marks, and sacred visual language.", "Important symbols, colors, foods, relics, places, rituals."),
      section("storyRole", "Story/Game Role", "How it affects plot, quests, characters, items, and locations.", "Plot role, characters who believe it, quests, items, locations, magic systems.")
    ]
  },
  {
    id: "items",
    title: "Items, Relics & Artifacts",
    shortTitle: "Items",
    icon: "Package",
    description: "Track Dragon Knife, Cat Cauldron, recipe book, charms, relics, quest items, and important objects.",
    defaultType: "Artifact",
    entryLabel: "Item",
    sections: [
      section("overview", "Item Overview", "Type, owner, location, origin, rarity, status, and summary.", "Name, type, owner, current location, origin, rarity, status."),
      section("visualDesign", "Visual Design", "Shape, materials, colors, symbols, wear, damage, and reference art.", "Shape, materials, colors, symbols, damage, reference art."),
      section("powersUses", "Powers / Uses", "What it does, limits, risks, gameplay function, and story use.", "Power, limitations, risks, required conditions, gameplay use, story use."),
      section("history", "History", "Maker, owners, important events, and how it changed hands.", "Who made it, who owned it, major events, thefts, damage, recoveries.")
    ]
  },
  {
    id: "quests",
    title: "Quests & Story Events",
    shortTitle: "Quests",
    icon: "ScrollText",
    description: "Plan quests, story beats, dialogue, objectives, connected worldbuilding, and consequences.",
    defaultType: "Quest",
    entryLabel: "Quest",
    sections: [
      section("overview", "Quest Overview", "Act, location, characters, type, summary, and current status.", "Quest name, act/chapter, location, main characters, quest type, summary, status."),
      section("storyBeats", "Story Beats", "Setup, inciting moment, objective, complication, climax, resolution, consequence.", "Setup, inciting moment, objective, complication, climax, resolution, consequence."),
      section("objectives", "Gameplay Objectives", "Required items, NPCs, locations, combat, puzzles, rewards, and unlocks.", "What the player must do, required items/NPCs/locations, combat, puzzles, rewards."),
      section("dialogueNotes", "Dialogue Notes", "Important lines, emotions, optional branches, and tutorial messages.", "Important lines, character emotions, branches, tutorial messages."),
      section("connectedWorldbuilding", "Connected Worldbuilding", "Locations, characters, creatures, factions, items, recipes, and timeline events.", "All connected world elements and why they matter.")
    ]
  },
  {
    id: "rules",
    title: "Rules of the World",
    shortTitle: "Rules",
    icon: "ShieldAlert",
    description: "Define hard consistency rules for magic, corruption, creatures, kingdoms, seasons, economy, and travel.",
    defaultType: "World Rule",
    entryLabel: "Rule",
    sections: [
      section("rule", "Rule", "Name, category, description, reason, allowances, limits, exceptions, and examples.", "Rule name, category, description, why it exists, what it allows, what it prevents."),
      section("exceptions", "Exceptions", "When the rule can bend and what consequences follow.", "Exceptions, edge cases, consequences, who can break this rule."),
      section("affectedEntries", "Entries Affected By This Rule", "Characters, magic systems, locations, creatures, quests, and items constrained by it.", "Entries affected, examples, contradiction warnings.")
    ]
  },
  {
    id: "mysteries",
    title: "Unanswered Mysteries",
    shortTitle: "Mysteries",
    icon: "EyeOff",
    description: "Track unresolved lore questions, evidence, possible answers, and final decisions.",
    defaultType: "Mystery",
    entryLabel: "Mystery",
    sections: [
      section("question", "Question", "The unresolved question, category, and current status.", "Question, category, status: unresolved, partially answered, answered, abandoned."),
      section("possibleAnswers", "Possible Answers", "Competing theories, options, and story consequences.", "Possible answers, tradeoffs, implications, favorite option."),
      section("evidence", "Evidence", "Clues, related events, dialogue, characters, locations, and contradictions.", "Evidence, clues, related characters, locations, timeline events."),
      section("finalDecision", "Final Decision Notes", "Chosen answer, why it works, and implementation notes.", "Final decision, reason, follow-up changes needed.")
    ]
  },
  {
    id: "glossary",
    title: "Glossary",
    shortTitle: "Glossary",
    icon: "Compass",
    description: "Define important terms like Whisken, Dark Culinary Arts, Cat Cauldron, Mas'eel, and FEAST.",
    defaultType: "Glossary Term",
    entryLabel: "Term",
    sections: [
      section("definition", "Definition", "Short definition and category.", "Short definition, category, first introduced."),
      section("longExplanation", "Long Explanation", "Deeper meaning, usage, history, and nuance.", "Long explanation, examples, how this term is used."),
      section("relatedTerms", "Related Terms", "Connected concepts, entries, cultures, myths, magic, and story pieces.", "Related entries and terms.")
    ]
  }
];

export const worldBuildingCategoryIds = worldBuildingCategories.map((category) => category.id);

export const createEmptyWorldBuilding = (): WorldBuildingData =>
  Object.fromEntries(worldBuildingCategories.map((category) => [category.id, []])) as unknown as WorldBuildingData;

export const createStarterWorldBuilding = (
  entries: LoreEntry[] = [],
  bestiary: BestiaryCreature[] = []
): WorldBuildingData => {
  const data = createEmptyWorldBuilding();
  const seedEntry = (
    category: WorldBuildingCategoryId,
    title: string,
    type: string,
    summary: string,
    tags: string[],
    fields: Record<string, string> = {},
    relatedEntries: WorldBuildingRelatedEntry[] = []
  ) => {
    data[category].push(normalizeWorldBuildingEntry({
      id: slugify(title),
      title,
      category,
      type,
      summary,
      tags,
      fields,
      relatedEntries,
      createdAt: starterStamp,
      updatedAt: starterStamp
    }, category));
  };

  const characterByTitle = (title: string) => entries.find((entry) => entry.title.toLowerCase() === title.toLowerCase());
  const creatureByTitle = (title: string) => bestiary.find((creature) => creature.name.toLowerCase() === title.toLowerCase());
  const gwen = characterByTitle("Gwen");
  const tohm = characterByTitle("Tohm Kyatt");
  const lillia = characterByTitle("Princess Lillia");
  const iceQueen = creatureByTitle("Ice Queen");
  const prawnhusk = creatureByTitle("Prawnhusk");

  seedEntry("locations", "Whisker Woods", "Forest Region", "A cozy but increasingly corrupted Act 1 forest region, village hub, gathering zone, and early danger space.", ["Whisker Woods", "Act 1", "Corruption", "Whisken"], {
    overview: "Forest region with villages, ponds, groves, bug nests, farms, and magical points of interest. Current state: partially corrupted.",
    visualIdentity: "Warm earthy colors, bold whimsical trees, cozy tavern culture, flowers, cliffs, ponds, and pockets of dark corruption.",
    inhabitants: "Gwen, Tohm Kyatt, Kap, Oswin, Whisken villagers, slimes, bugs, Prawnhusk, and the Ice Queen.",
    gameplayUse: "Opening exploration area, tutorial region, gathering zone, combat encounters, village hub, corrupted pond event, and Act 1 boss buildup."
  }, [
    related("character", gwen?.id, "Gwen protects villages and explores this region early."),
    related("character", tohm?.id, "Tohm rebuilds his life here after Tabby Island."),
    related("creature", prawnhusk?.id, "Mini-boss tied to the corrupted pond."),
    related("creature", iceQueen?.id, "Planned Act 1 boss tied to cursed bugs.")
  ]);
  seedEntry("locations", "Tabby Island", "Island / Lost Home", "Original home of the Whisken/Wiscan people, corrupted after Tohm's Cat Cauldron experiment.", ["Tabby Island", "Cat Cauldron", "Tohm Kyatt", "Major Spoiler"], {
    overview: "The original home of the Whisken/Wiscan people. Its corruption is one of Tohm's core hidden truths.",
    history: "Tohm accessed the Cat Cauldron beneath the island and attempted magical cooking despite warnings, causing a disaster.",
    storyRole: "Backstory location, source of guilt, and potential future reveal or memory sequence."
  }, [related("character", tohm?.id, "Tohm secretly caused the island disaster.")]);
  seedEntry("locations", "Faery Realm", "Magical Realm", "A realm rich in ambient magic where Lillia can mass-produce Dark Culinary Arts.", ["Faery Realm", "Lillia", "Dark Culinary Arts", "Magic"], {
    overview: "Magical realm connected to faeries and Lillia's later use of corrupted cooking.",
    history: "Lillia camps here because the environment lets her draw ambient magic rather than infusing every meal individually.",
    gameplayUse: "Potential late-story region, corrupted meal production source, and faery political space."
  }, [related("character", lillia?.id, "Lillia uses this realm to empower corrupted food.")]);

  seedEntry("cultures", "Whisken / Wiscan People", "Culture / People", "Cat-like people connected to Tabby Island, Whisker Woods, tavern culture, food, gathering, and community.", ["Whisken", "Wiscan", "Tabby Island", "Whisker Woods"], {
    overview: "A people who originally lived on Tabby Island and later fled to places like Whisker Woods.",
    dailyLife: "Food, hunting, farming, fishing, gathering, taverns, and community survival are central to the culture.",
    beliefsCustoms: "Their culture can preserve old warnings about magical cooking, cauldrons, and culinary power."
  }, [related("character", tohm?.id, "Tohm is a Whisken/Wiscan chef with a hidden past.")]);
  seedEntry("factions", "Human Kingdom", "Kingdom", "The royal human kingdom connected to Lillia, the Dragon Knife war, and fears around humans gaining magic.", ["Human Kingdom", "Royal Family", "Lillia", "Dragon Knife"], {
    overview: "Kingdom ruled by Lillia's parents. Their desire to give Lillia magic leads to war with the dwarves.",
    beliefsGoals: "The royal family wants magical access for Lillia despite warnings from faeries and dwarves.",
    storyRole: "Political engine behind the Dragon Knife incident and Lillia's magical transformation."
  }, [related("character", lillia?.id, "Princess Lillia is the center of the kingdom's magic crisis.")]);
  seedEntry("magicSystems", "Dark Culinary Arts", "Corrupted Food Magic", "A dangerous practice used by Lillia to infuse food with corruptive magic.", ["Dark Culinary Arts", "Corruption", "Food Magic", "Lillia"], {
    overview: "Corrupted culinary magic that can turn meals into sources of power, evil, or boss transformations.",
    rules: "Food can be infused with dark magic; consumers may gain powers or become corrupted. Faery ambient magic helps mass-produce it.",
    visualEffects: "Dark glowing ingredients, corrupted meal auras, unstable magic, and theatrical food-based powers.",
    storyFunction: "Explains corrupted bosses, recipe-powered enemies, and magical food as both power and danger."
  }, [related("character", lillia?.id, "Lillia spreads corrupted meals through this magic.")]);
  seedEntry("items", "Cat Cauldron", "Artifact", "A magical cauldron beneath Tabby Island that could not withstand Tohm's magical recipe experiment.", ["Cat Cauldron", "Tabby Island", "Tohm Kyatt", "Major Spoiler"], {
    overview: "A magical cauldron beneath Tabby Island. It was not Datka/Dagda's true cauldron.",
    powersUses: "Could interact with magical recipes but had limits. Tohm's experiment exceeded those limits.",
    history: "Its failure caused a massive explosion or corruption that forced the Whisken/Wiscan people to flee."
  }, [related("character", tohm?.id, "Tohm used the cauldron despite warnings.")]);
  seedEntry("myths", "Datka / Dagda Fairy Tale", "Mythic Tale", "A childhood tale about a mythic chef or god with a magical cauldron that could create impossible food.", ["Datka", "Dagda", "Cat Cauldron", "Myth"], {
    overview: "A mythic story told to young Tohm by his mother.",
    fullStory: "The tale describes a legendary figure and a cauldron capable of cooking food unlike anything in existence.",
    meaning: "This myth becomes the seed of Tohm's lifelong obsession with tasting the impossible."
  }, [related("character", tohm?.id, "The story plants Tohm's obsession with magical cooking.")]);
  seedEntry("rules", "Tohm Never Drinks From The Cauldron", "Canon Rule", "A hard canon fact for contradiction detection: Tohm never drinks from the cauldron.", ["Canon Rule", "Tohm Kyatt", "Cat Cauldron"], {
    rule: "Tohm never drinks from the cauldron. Any lore implying that he does should be rewritten.",
    affectedEntries: "Tohm Kyatt, Cat Cauldron, Tabby Island disaster, Datka/Dagda myth, magical cooking backstory."
  }, [related("character", tohm?.id, "This rule protects Tohm's canon backstory.")]);
  seedEntry("mysteries", "How Does Corruption Physically Spread?", "Unanswered Question", "Track the exact logic of how food corruption, environmental corruption, roots, ponds, and slimes interact.", ["Corruption", "Dark Culinary Arts", "Slimes", "World Rule"], {
    question: "How does corruption physically move through the world, and how does it affect food, ponds, roots, wildlife, and people?",
    possibleAnswers: "It could spread through corrupted meals, ambient magic, roots, water systems, or recipe-page fallout.",
    evidence: "Kap's Pond corruption, Dark Slime Essence, Lillia's corrupted food, and Whisker Woods bug corruption."
  });
  seedEntry("glossary", "Recipe Pages", "Glossary Term", "Torn pages from Tohm's recipe book that unlock or explain dangerous magical powers.", ["Recipe Pages", "Tohm Kyatt", "Lillia", "Gwen"], {
    definition: "Torn pages from Tohm's magical recipe book.",
    longExplanation: "Lillia tears out several pages after Tohm snatches the recipe book back. Gwen retrieves recipe pages from bosses to unlock powers and restore lost culinary knowledge."
  }, [
    related("character", gwen?.id, "Gwen recovers recipe pages through the main quest."),
    related("character", tohm?.id, "The pages came from Tohm's recipe book."),
    related("character", lillia?.id, "Lillia tore the pages out.")
  ]);

  return data;
};

export const normalizeWorldBuilding = (value: unknown): WorldBuildingData => {
  const empty = createEmptyWorldBuilding();
  if (!value || typeof value !== "object") return empty;
  const source = value as Partial<Record<WorldBuildingCategoryId, unknown>>;
  worldBuildingCategories.forEach((category) => {
    const entries = Array.isArray(source[category.id]) ? source[category.id] as unknown[] : [];
    empty[category.id] = entries.map((entry) => normalizeWorldBuildingEntry(entry, category.id));
  });
  return empty;
};

export const normalizeWorldBuildingEntry = (
  value: unknown,
  fallbackCategory: WorldBuildingCategoryId
): WorldBuildingEntry => {
  const source = value && typeof value === "object" ? value as Partial<WorldBuildingEntry> : {};
  const title = stringValue(source.title, "Untitled World Entry");
  const now = new Date().toISOString();
  return {
    id: stringValue(source.id, `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`),
    title,
    category: validCategory(source.category) || fallbackCategory,
    type: stringValue(source.type, categoryConfig(fallbackCategory).defaultType),
    summary: stringValue(source.summary, ""),
    tags: normalizeStringArray(source.tags),
    image: unsafePersistentImage(source.image) ? "" : stringValue(source.image, ""),
    imageFit: normalizeImageFit(source.imageFit),
    fields: normalizeFieldMap(source.fields),
    relatedEntries: normalizeRelatedEntries(source.relatedEntries),
    createdAt: stringValue(source.createdAt, now),
    updatedAt: stringValue(source.updatedAt, stringValue(source.createdAt, now))
  };
};

export const createWorldBuildingEntry = (
  categoryId: WorldBuildingCategoryId,
  input: Partial<WorldBuildingEntry>
): WorldBuildingEntry => normalizeWorldBuildingEntry({
  id: `world-${categoryId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  category: categoryId,
  type: categoryConfig(categoryId).defaultType,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...input
}, categoryId);

export const categoryConfig = (id: WorldBuildingCategoryId) =>
  worldBuildingCategories.find((category) => category.id === id) || worldBuildingCategories[0];

export const allWorldBuildingEntries = (worldBuilding: WorldBuildingData) =>
  worldBuildingCategories.flatMap((category) => worldBuilding[category.id] || []);

export const sanitizeWorldBuildingForPersistence = (value: WorldBuildingData): WorldBuildingData => {
  const normalized = normalizeWorldBuilding(value);
  worldBuildingCategories.forEach((category) => {
    normalized[category.id] = normalized[category.id].map((entry) => ({
      ...entry,
      image: unsafePersistentImage(entry.image) ? "" : entry.image,
      imageFit: normalizeImageFit(entry.imageFit),
      fields: normalizeFieldMap(entry.fields),
      relatedEntries: normalizeRelatedEntries(entry.relatedEntries)
    }));
  });
  return normalized;
};

const starterStamp = "2026-05-07T00:00:00.000Z";

function section(id: string, title: string, helper: string, placeholder: string) {
  return { id, title, helper, placeholder };
}

function related(type: string, targetId: string | undefined, note: string): WorldBuildingRelatedEntry {
  return {
    id: `related-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    targetId: targetId || "",
    note
  };
}

function normalizeRelatedEntries(value: unknown): WorldBuildingRelatedEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<WorldBuildingRelatedEntry> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: stringValue(item.id, `related-${Date.now()}-${index}`),
      type: stringValue(item.type, "world"),
      targetId: stringValue(item.targetId || (item as { id?: string }).id, ""),
      targetCategory: typeof item.targetCategory === "string" ? item.targetCategory : undefined,
      note: stringValue(item.note, "")
    }))
    .filter((item) => item.targetId);
}

function normalizeFieldMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, fieldValue]) => [key, String(fieldValue || "")])
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function validCategory(value: unknown): WorldBuildingCategoryId | "" {
  if (typeof value !== "string") return "";
  return worldBuildingCategoryIds.includes(value as WorldBuildingCategoryId) ? value as WorldBuildingCategoryId : "";
}

function unsafePersistentImage(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.startsWith("blob:") || normalized.startsWith("data:");
}
