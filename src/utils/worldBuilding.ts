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
  const tablemaker = characterByTitle("The Tablemaker");
  const catCauldronCharacter = characterByTitle("The Cat Cauldron");
  const muramar = characterByTitle("Mur'amar");
  const oswin = characterByTitle("Oswin");
  const kap = characterByTitle("Kap");
  const mona = characterByTitle("Mona the Orchardist");
  const momon = characterByTitle("Momon");
  const ladyKiko = characterByTitle("Lady Kiko");
  const iceQueen = creatureByTitle("Ice Queen");
  const prawnhusk = creatureByTitle("Prawnhusk");
  const cauldronEchoSlime = creatureByTitle("Cauldron Echo Slime");
  const searedScarab = creatureByTitle("Seared Scarab");
  const falseFeastFly = creatureByTitle("False Feast Fly");

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
  seedEntry("locations", "Tabby Island", "Island / Lost Home", "Original home of the Whisken people, twice struck by Cat Cauldron decay and later infiltrated by the Mas'eel Cult.", ["Tabby Island", "Cat Cauldron", "Tohm Kyatt", "Whisken", "Mas'eel", "Major Spoiler"], {
    overview: "The original home of the Whisken people. The island first decayed after ancient Whisken created the Cat Cauldron, then decayed again after Tohm awakened it.",
    history: "Ancient Whisken created the Cat Cauldron to improve food and seek the knowledge of what is untasted. It caused the first decay and first exodus, so they buried it beneath the island and erased it from history. Tohm later found it, cooked in it, released a pulse into the earth, and fled with it in the Living Tavern. The Mas'eel sensed the pulse, arrived as false traders, gained village power, and persecuted the Whisken for their Triadic faith.",
    storyRole: "Backstory location, source of Tohm's guilt, Mas'eel infiltration site, and potential future reveal or memory sequence."
  }, [related("character", tohm?.id, "Tohm awakened the Cat Cauldron and secretly fled with it.")]);
  seedEntry("locations", "Faery Realm", "Magical Realm", "A realm rich in ambient magic where Lillia can mass-produce Dark Culinary Arts.", ["Faery Realm", "Lillia", "Dark Culinary Arts", "Magic"], {
    overview: "Magical realm connected to faeries and Lillia's later use of corrupted cooking.",
    history: "Lillia camps here because the environment lets her draw ambient magic rather than infusing every meal individually.",
    gameplayUse: "Potential late-story region, corrupted meal production source, and faery political space."
  }, [related("character", lillia?.id, "Lillia uses this realm to empower corrupted food.")]);
  seedEntry("locations", "Ovenhold", "Ancient Mortal Kingdom", "An ancient kingdom of hearths, ovens, labor, craft, survival, and cooked food that fought the Faery Realm for 300 years.", ["Ovenhold", "300 Year War", "Tablemaker", "Hearth"], {
    overview: "Mortal kingdom defined by cooking fires, stone ovens, hard work, craft, cooked food, and survival.",
    visualIdentity: "Stone kitchens, bread ovens, smoke, copper pots, labor-worn hands, hearth banners, and practical warm light.",
    history: "Ovenhold fought the Faery Realm for 300 years until the Tablemaker ended the war with a meal prepared through Passion, Taste, and Love.",
    gameplayUse: "Ancient-history slot, possible memory chapter, religious origin context, and visual contrast to the Faery Realm."
  }, [related("character", tablemaker?.id, "The Tablemaker's meal ended Ovenhold's war with the Faery Realm.")]);
  seedEntry("locations", "The Everfeast", "Sacred Culinary Realm", "A heavenly culinary realm where perfect meals are remembered and where the Tablemaker returned after his sacrifice.", ["Everfeast", "Tablemaker", "Food Essence", "Sacred Realm"], {
    overview: "A sacred culinary beyond connected to the Tablemaker, holy meals, and the memory of food that heals.",
    visualIdentity: "Endless warm kitchens, impossible banquet tables, golden steam, and meals remembered in perfect form.",
    history: "After the Tablemaker's final meal ended the 300 Year War and cost him his mortal life, his spirit returned to The Everfeast.",
    gameplayUse: "Mythic frame for late-game revelations, Food Essence, and the spiritual meaning of magical cooking."
  }, [related("character", tablemaker?.id, "The Tablemaker returns to The Everfeast.")]);
  seedEntry("locations", "Lillia's Camp", "Enemy Camp", "A Faery Realm camp where Lillia uses ambient magic to mass-produce Dark Culinary Arts with Mas'eel support.", ["Lillia", "Faery Realm", "Dark Culinary Arts", "Mas'eel"], {
    overview: "Villain-side production site for corrupted meals and late-story enemy logistics.",
    visualIdentity: "Beautiful faery light bent into black kitchen smoke, elegant tents, corrupted banquet stations, and recipe-page worktables.",
    inhabitants: "Princess Lillia, Mas'eel agents, corrupted cooks, and food-magic experiments.",
    gameplayUse: "Potential late-story dungeon, stealth/investigation space, and place to connect Lillia's ambitions to the Mas'eel hunt."
  }, [
    related("character", lillia?.id, "Lillia uses the camp to scale Dark Culinary Arts."),
    related("character", muramar?.id, "Mur'amar can connect the camp to the Mas'eel network.")
  ]);

  seedEntry("cultures", "Whisken People", "Culture / People", "Cat-like people connected to Tabby Island, Whisker Woods, tavern culture, food, gathering, community, and the Triadic faith.", ["Whisken", "Tabby Island", "Whisker Woods", "Triadic Faith"], {
    overview: "A people who originally lived on Tabby Island, forgot their first exodus, and later fled again after the Cat Cauldron's second decay and Mas'eel persecution.",
    dailyLife: "Food, hunting, farming, fishing, gathering, taverns, and community survival are central to the culture.",
    beliefsCustoms: "The Whisken follow the Tablemaker and the Triadic faith, practicing it through their own food, feasts, tavern life, and community traditions.",
    exodusHistory: "Ancient Whisken buried the Cat Cauldron and erased it from history after the first decay. Modern Whisken fled Tabby Island again after Tohm awakened it and the Mas'eel infiltrated the village."
  }, [related("character", tohm?.id, "Tohm is a Whisken chef with a hidden past.")]);
  seedEntry("cultures", "Whisken Saints", "Cultural Faith Thread", "A review slot for Whisken holy stories and teachers, harmonized under the Tablemaker and the Triadic faith.", ["Whisken", "Saints", "Tablemaker", "Needs Rewrite"], {
    overview: "A cultural layer for Whisken stories about old teachers, feast days, mercy, tavern life, and shared food.",
    dailyLife: "These stories can appear in harvest customs, village proverbs, tavern wall art, and the Festival of Full Plates.",
    beliefsCustoms: "The useful thread is the movement from hunger and isolation toward hearth, table, mercy, and community under Passion, Taste, and Love.",
    relationships: "This must not become a separate contradictory religion. It should support the wider Tablemaker faith practiced through Whisken traditions."
  }, [
    related("character", tablemaker?.id, "The Whisken saints thread sits under the Tablemaker faith."),
    related("character", ladyKiko?.id, "Lady Kiko can embody this tradition in village life.")
  ]);
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
  seedEntry("magicSystems", "Food Essence", "Sacred Culinary Magic", "The spiritual and magical force released into the world by the Tablemaker after the meal that ended the 300 Year War.", ["Food Essence", "Tablemaker", "Passion", "Taste", "Love"], {
    overview: "Food Essence is the sacred foundation that lets meals carry healing, memory, culture, magic, and danger.",
    rules: "Healthy Food Essence is aligned with Passion, Taste, and Love. Dark Culinary Arts and Mas'eel FEAST doctrine distort it toward control, hunger, and corruption.",
    visualEffects: "Warm steam, golden motes, meal-memory glows, and three-dot Triadic symbolism when expressed cleanly.",
    gameplayFunction: "Frames why cooking can heal, empower, reveal, corrupt, and solve story problems.",
    storyFunction: "Connects the Tablemaker, Tohm's obsession, Lillia's corrupted meals, and the Mas'eel distortion."
  }, [
    related("character", tablemaker?.id, "The Tablemaker released Food Essence into the world."),
    related("character", tohm?.id, "Tohm's obsession grows around sacred food and ultimate taste.")
  ]);
  seedEntry("factions", "Mas'eel Cult", "Cult", "A cult that corrupts the Triadic faith into FEAST and hunts the Cat Cauldron and Tohm's magical recipes.", ["Mas'eel", "FEAST", "Triadic Faith", "Cat Cauldron", "Princess Lillia"], {
    overview: "The Mas'eel oppose the Tablemaker's triad of Passion, Taste, and Love by corrupting it into FEAST.",
    tabbyIslandRole: "They sensed the Cat Cauldron pulse, came to Tabby Island pretending to be traders, introduced new foods, gained power in the Whisken village, and persecuted Triadic believers.",
    currentGoal: "After leaving Tabby Island, they search for the Cat Cauldron and Tohm's magical recipes while working with Princess Lillia."
  }, [related("character", lillia?.id, "The Mas'eel now work with Lillia."), related("character", tohm?.id, "The Mas'eel are hunting Tohm's recipes and the Cat Cauldron.")]);
  seedEntry("factions", "Mas'eel False Traders", "Cult Operation", "The Mas'eel trading front that entered Tabby Island with new foods and hid a slow takeover behind hospitality.", ["Mas'eel", "False Traders", "Tabby Island", "Food Corruption"], {
    overview: "A disguised Mas'eel operation that looked like trade, novelty, and abundance while spreading control.",
    leadership: "Mur'amar and other Mas'eel agents can use trader identities, food gifts, and gentle public language.",
    beliefsGoals: "Find the Cat Cauldron, locate Tohm's magical recipes, weaken Triadic faith, and replace shared abundance with FEAST.",
    resourcesPower: "Imported foods, suspicious spices, influence inside village ranks, hidden cult marks, and searing corruption.",
    storyRole: "Explains how Tabby Island was corrupted socially and spiritually before the Whisken realized what was happening."
  }, [
    related("character", muramar?.id, "Mur'amar can serve as a recognizable face of this operation."),
    related("character", tohm?.id, "Tohm's activation of the Cat Cauldron drew the false traders to Tabby Island.")
  ]);
  seedEntry("items", "Cat Cauldron", "Artifact", "An ancient Whisken cauldron created to improve food and reveal what is untasted, later awakened by Tohm and hunted by the Mas'eel.", ["Cat Cauldron", "Tabby Island", "Tohm Kyatt", "Whisken", "Mas'eel", "Major Spoiler"], {
    overview: "An ancient Whisken artifact that caused Tabby Island to decay once in antiquity and again after Tohm activated it.",
    powersUses: "Created to improve food and reach the knowledge of what is untasted. When activated, it can send a pulse into the earth strong enough to decay land and draw the Mas'eel's attention.",
    history: "The ancient Whisken buried it beneath Tabby Island and erased it from history. Tohm later discovered it, cooked in it, awakened it, and fled with it in the Living Tavern."
  }, [related("character", tohm?.id, "Tohm awakened the cauldron and secretly took it.")]);
  seedEntry("myths", "The Tablemaker and Triadic Faith", "World Faith", "The Tablemaker is the canonical divine figure, also called the Master Chef, and most cultures follow the Triadic faith in their own ways.", ["Tablemaker", "Master Chef", "Triadic Faith", "Passion", "Taste", "Love"], {
    overview: "Most races worship the Tablemaker and follow the same Triadic faith, while practicing it through their own traditions.",
    fullStory: "The Master Chef is another name for the Tablemaker, not a separate being. The faith's central triad is Passion, Taste, and Love.",
    meaning: "This faith shapes Whisken culture, Tohm's childhood stories, and the Mas'eel Cult's opposition."
  }, [related("character", tohm?.id, "Stories of the Tablemaker seed Tohm's obsession with sacred meals and untasted food.")]);
  seedEntry("foodAndRecipes", "Festival of Full Plates", "Whisken Feast", "A yearly Whisken feast celebrating balance, gratitude, remembrance, and the promise that no plate should go empty.", ["Whisken", "Festival", "Triadic Faith", "Full Plates"], {
    overview: "A Whisken feast and village tradition tied to shared abundance under the Tablemaker faith.",
    culinaryUse: "Built around Hearth Stew, Healthy Ale, roots, herbs, gathered produce, and everyone being fed.",
    gameplayUse: "Potential village event, reputation moment, recipe set, and cultural tutorial.",
    magicalEffect: "Can quietly express healthy Food Essence through Passion, Taste, and Love without becoming a combat spell."
  }, [related("character", ladyKiko?.id, "Lady Kiko can guide or protect this tradition.")]);
  seedEntry("foodAndRecipes", "Healthy Ale", "Ale / Tonic", "Oswin's famous Whisken ale; villagers rely on it even though the name is mostly optimistic.", ["Oswin", "Ale", "Whisken", "Brewing"], {
    overview: "A village drink and recipe slot in The Pantry.",
    culinaryUse: "Whisken Root Ferment, Moonlit Dew, and Specialty Herbs make it feel medicinal, odd, and tavern-ready.",
    gameplayUse: "Possible stamina, warmth, light recovery, or comedic side-effect drink.",
    magicalEffect: "Should stay lightly magical or alchemical unless later upgraded."
  }, [related("character", oswin?.id, "Oswin invented Healthy Ale.")]);
  seedEntry("foodAndRecipes", "Whisken Hearth Stew", "Tavern Meal Recipe", "A hearty Whisken stew built from roots, broth, herbs, and safe village ingredients.", ["Whisken", "Stew", "Tavern Meal", "Pantry"], {
    overview: "Practical comfort recipe for the Pantry and Whisken Village food culture.",
    culinaryUse: "Potato, Turnip, Boga, Specialty Herbs, and Cat Cauldron Broth Base.",
    gameplayUse: "Starter recovery meal, comfort meal, village favor, or cooking tutorial recipe.",
    magicalEffect: "A clean everyday Food Essence expression: feeding people before chasing power."
  }, [
    related("character", momon?.id, "Momon anchors the farming side of this meal."),
    related("character", mona?.id, "Mona can provide produce or orchard timing.")
  ]);
  seedEntry("foodAndRecipes", "False Trader Spice", "Corrupted Ingredient", "A suspicious spice blend introduced by Mas'eel false traders during their slow infiltration of Tabby Island.", ["Mas'eel", "Spice", "Corrupted Ingredient", "Tabby Island"], {
    overview: "Ingredient and clue that food culture was used as cover for the Mas'eel takeover.",
    culinaryUse: "Looks like an exciting imported spice, but belongs in corrupted recipes and investigation scenes.",
    gameplayUse: "Quest evidence, dangerous recipe component, debuff ingredient, or clue leading to Mur'amar.",
    magicalEffect: "Can carry searing corruption or distort healthy Food Essence toward FEAST."
  }, [related("character", muramar?.id, "Mur'amar may use gentle language around this kind of imported food.")]);
  seedEntry("foodAndRecipes", "Cat Cauldron Broth Base", "Recipe Component", "A flexible broth base made in the Cat Cauldron for stews, magical meals, and comfort dishes.", ["Cat Cauldron", "Broth", "Recipe Component", "Pantry"], {
    overview: "Everyday Pantry slot for the Cat Cauldron's normal cooking use.",
    culinaryUse: "Any safe meat or creature drop, produce, and Specialty Herbs simmered into a flexible base.",
    gameplayUse: "Meal component for Hearth Stew, magical meals, restorative recipes, and cooking tutorials.",
    magicalEffect: "Separates normal broth work from the catastrophic act of awakening the ancient cauldron."
  }, [related("character", catCauldronCharacter?.id, "The sentient cauldron is the station for this recipe.")]);
  seedEntry("creatureLinks", "Cauldron Echo Slime", "Bestiary Link", "A rare slime formed near places touched by Cat Cauldron pulses and old recipe memory.", ["Slime", "Cat Cauldron", "Tabby Island"], {
    loreNote: "This creature gives the Cat Cauldron disaster a visible ecosystem consequence.",
    ecosystem: "Appears near buried kitchens, ruins, broth residue, and pulse-touched ground.",
    gameplayStoryLinks: "Drops Cauldron echo gel for truth-reveal tonics and late-game investigation meals."
  }, [related("creature", cauldronEchoSlime?.id, "Bestiary slot seeded from Cat Cauldron lore.")]);
  seedEntry("creatureLinks", "Seared Scarab", "Bestiary Link", "An insect tied to Mas'eel searing, false trader stores, and corrupted Tabby Island roots.", ["Insect", "Mas'eel", "Tabby Island", "False Traders"], {
    loreNote: "A small enemy that makes the Mas'eel's slow corruption visible in the environment.",
    ecosystem: "Clusters around corrupted roots, old food stores, and false trader caches.",
    gameplayStoryLinks: "Drops Seared shell chips and traces of False Trader Spice."
  }, [related("creature", searedScarab?.id, "Bestiary slot seeded for Mas'eel corruption.")]);
  seedEntry("creatureLinks", "False Feast Fly", "Bestiary Link", "A deceptive swarm drawn to food that looks abundant but has been spiritually spoiled.", ["Insect", "Aberration", "FEAST", "Mas'eel"], {
    loreNote: "A creature-symbol for the Mas'eel version of abundance: hunger wearing a beautiful mask.",
    ecosystem: "Appears near corrupted feasts, rotten ceremonial leftovers, and Dark Culinary Arts experiments.",
    gameplayStoryLinks: "Drops False feast wings for deception tonics and corruption-diagnosis recipes."
  }, [related("creature", falseFeastFly?.id, "Bestiary slot seeded for FEAST symbolism.")]);
  seedEntry("characterLinks", "Mona the Orchardist", "Character Link", "A reserved Whisken orchardist who connects village produce, family, and longing for the wider world.", ["Mona", "Whisken", "Orchard", "Village"], {
    worldRole: "Whisken Village orchardist and possible produce source.",
    relationships: "Daughter of Momon; connected to Gwen's gathering work and village routines.",
    automaticLinks: "Whisken Village, Whisken People, Festival of Full Plates, Moonlit Dew, Whisken Hearth Stew."
  }, [related("character", mona?.id, "Main database character entry.")]);
  seedEntry("characterLinks", "Momon", "Character Link", "A Whisken farmer who anchors village food production and passes agricultural knowledge to Mona.", ["Momon", "Whisken", "Farm", "Village"], {
    worldRole: "Farmer, agricultural teacher, and food-security figure.",
    relationships: "Father of Mona; village peer to Kap, Oswin, and Lady Kiko.",
    automaticLinks: "Whisken Village, Festival of Full Plates, Whisken Hearth Stew, Potato, Turnip, Boga."
  }, [related("character", momon?.id, "Main database character entry.")]);
  seedEntry("characterLinks", "Lady Kiko", "Character Link", "A protective Whisken guide who expresses unity, faith, and community care.", ["Lady Kiko", "Whisken", "Protector", "Triadic Faith"], {
    worldRole: "Protector, mediator, or cultural guide for Whisken Village.",
    relationships: "Linked to village families, Gwen's learning of Whisken customs, and the Festival of Full Plates.",
    automaticLinks: "Whisken People, Whisken Saints, Whisken Village, Festival of Full Plates."
  }, [related("character", ladyKiko?.id, "Main database character entry.")]);
  seedEntry("characterLinks", "Mur'amar", "Character Link", "A Mas'eel-linked stranger who presents his faith gently while searching for the Cat Cauldron and recipes.", ["Mur'amar", "Mas'eel", "Deception", "Gwen"], {
    worldRole: "Cult agent or linked figure moving through Whisken spaces under a peaceful mask.",
    relationships: "Speaks with Gwen, moves among villagers as if he belongs, and connects to Princess Lillia's broader villain network.",
    automaticLinks: "Mas'eel Cult, Mas'eel False Traders, Whisken Village, Lillia's Camp, Cat Cauldron."
  }, [related("character", muramar?.id, "Main database character entry.")]);
  seedEntry("characterLinks", "The Cat Cauldron", "Character Link", "A sentient artifact-character whose everyday cooking role hides catastrophic history.", ["Cat Cauldron", "Sentient Artifact", "Tohm", "Gwen"], {
    worldRole: "Cooking station, character, lore witness, and hunted artifact.",
    relationships: "Created by ancient Whisken, awakened by Tohm, used by Gwen, and sought by the Mas'eel.",
    automaticLinks: "Cat Cauldron, Tabby Island, Cat Cauldron Broth Base, Mas'eel Cult, Tohm Kyatt."
  }, [related("character", catCauldronCharacter?.id, "Character-style entry for the sentient cauldron.")]);
  seedEntry("characterLinks", "The Tablemaker", "Character Link", "The divine figure also called the Master Chef, source of the Tablemaker faith and Food Essence.", ["Tablemaker", "Master Chef", "Triadic Faith"], {
    worldRole: "Sacred figure whose meal ended the 300 Year War and shaped most cultures' faith.",
    relationships: "Inspires Tohm's childhood stories and opposes the Mas'eel distortion of FEAST.",
    automaticLinks: "The Everfeast, Food Essence, Ovenhold, Faery Realm, Whisken People, Mas'eel Cult."
  }, [related("character", tablemaker?.id, "Main database character entry.")]);
  seedEntry("quests", "Lel Kai's Rescue Fleet", "Backstory Event / Rescue Quest", "Tohm asks Lel Kai to send boats to rescue the Whisken from Tabby Island during the second exodus.", ["Lel Kai", "Rescue", "Whisken", "Tabby Island"], {
    overview: "Rescue-fleet event explaining how the known Whisken survivors reached Whisker Woods.",
    objectives: "Gather boats, cross corrupted waters, save as many Whisken as possible, and survive scattered routes.",
    majorBeats: "Tohm hears what is happening, gets Lel Kai's help, boats are sent, corruption scatters many, known survivors reach Whisker Woods.",
    rewardsConsequences: "The current Whisken Village exists, but missing boats and survivor trauma remain story hooks."
  }, [related("character", tohm?.id, "Tohm sets the rescue in motion."), related("character", kap?.id, "Kap represents the current survivor village generation.")]);
  seedEntry("quests", "Investigate the False Traders", "Story Investigation", "A quest thread for uncovering how Mas'eel trade, spices, and gentle language corrupted Tabby Island.", ["Mas'eel", "False Traders", "Tabby Island", "Mur'amar"], {
    overview: "Investigation line connecting suspicious foods, cult signs, creature evidence, and Mur'amar's public mask.",
    objectives: "Inspect trader stores, identify False Trader Spice, fight Seared Scarabs or False Feast Flies, question Mur'amar, and connect clues to the Cat Cauldron pulse.",
    majorBeats: "The player realizes that food was not just flavor here. It was the method of takeover.",
    rewardsConsequences: "Unlocks Mas'eel truth, Dark Culinary Arts context, and Tabby Island history."
  }, [related("character", muramar?.id, "Mur'amar is a key face for this investigation.")]);
  seedEntry("timeline", "Ancient Cat Cauldron Disaster", "Ancient Timeline Event", "Ancient Whisken create the Cat Cauldron, trigger Tabby Island decay, flee, bury it, and erase it from history.", ["Cat Cauldron", "First Exodus", "Whisken", "Tabby Island"], {
    event: "Ancient Whisken seek better food and knowledge of what is untasted; the Cat Cauldron's power damages Tabby Island.",
    causes: "Good hunger for food knowledge mixed with unsafe magical invention.",
    consequences: "First exodus, Cat Cauldron buried beneath the island, records removed, and the event eventually forgotten.",
    involved: "Ancient Whisken, Tabby Island, Cat Cauldron, Tablemaker faith."
  }, [related("character", catCauldronCharacter?.id, "Sentient artifact tied to this ancient disaster.")]);
  seedEntry("timeline", "Tohm Awakens the Cat Cauldron", "Backstory Timeline Event", "Tohm discovers the forgotten Cat Cauldron, cooks in it, releases a pulse into the earth, and secretly flees with it.", ["Tohm Kyatt", "Cat Cauldron", "Mas'eel", "Major Spoiler"], {
    event: "Tohm cooks a meal in the Cat Cauldron and activates it.",
    causes: "Tohm's obsession with magical food, the Tablemaker stories, and the knowledge of what is untasted.",
    consequences: "Tabby Island begins dying again, the Mas'eel sense the cauldron, and Tohm flees with it in the Living Tavern.",
    involved: "Tohm Kyatt, Cat Cauldron, Tabby Island, Mas'eel Cult."
  }, [related("character", tohm?.id, "Tohm is the one who awakens the cauldron.")]);
  seedEntry("timeline", "Mas'eel Infiltrate Tabby Island", "Backstory Timeline Event", "Mas'eel cultists arrive as false traders, introduce new foods, gain power, and persecute the Whisken faith.", ["Mas'eel", "False Traders", "Whisken", "FEAST"], {
    event: "The Mas'eel trading front enters Tabby Island after sensing the Cat Cauldron pulse.",
    causes: "They know the Cat Cauldron was on Tabby Island and want Tohm's recipes.",
    consequences: "Whisken village authority is corrupted, Triadic believers are persecuted, and the second exodus begins.",
    involved: "Mas'eel Cult, Whisken People, Mur'amar, False Trader Spice, Tabby Island."
  }, [related("character", muramar?.id, "Mur'amar can be connected to this infiltration thread.")]);
  seedEntry("timeline", "Lel Kai's Rescue Fleet", "Backstory Timeline Event", "Lel Kai sends boats at Tohm's request, but corruption scatters many of them before the known survivors reach Whisker Woods.", ["Lel Kai", "Whisken", "Rescue", "Second Exodus"], {
    event: "Rescue boats leave for Tabby Island during the second exodus.",
    causes: "Tohm hears what is happening and gets Lel Kai, who is becoming general of the faery army, to help.",
    consequences: "Known survivors settle in Whisker Woods and Whisken Village; scattered boats and missing survivors remain open story hooks.",
    involved: "Tohm Kyatt, Lel Kai, Whisken People, Tabby Island, Whisker Woods."
  }, [related("character", tohm?.id, "Tohm initiates the rescue after hiding his own earlier role.")]);
  seedEntry("rules", "Tohm Never Drinks From The Cauldron", "Canon Rule", "A hard canon fact for contradiction detection: Tohm never drinks from the cauldron.", ["Canon Rule", "Tohm Kyatt", "Cat Cauldron"], {
    rule: "Tohm never drinks from the cauldron. Any lore implying that he does should be rewritten.",
    affectedEntries: "Tohm Kyatt, Cat Cauldron, Tabby Island disaster, Tablemaker faith, magical cooking backstory."
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
