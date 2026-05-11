import type { BestiaryCategoryArtVault, BestiaryCreature, LoreDatabase, LoreEntry } from "../types";
import { normalizeEntry, slugify } from "../utils/entries";
import { createBestiaryCategoryArtVaultRecord, normalizeBestiaryCreature } from "../utils/bestiary";
import { createStarterWorldBuilding } from "../utils/worldBuilding";

const stamp = "2026-05-07T00:00:00.000Z";

type StarterInput = Partial<LoreEntry> & { title: string; category: string };

const entry = (input: StarterInput): LoreEntry =>
  normalizeEntry(
    {
      id: input.id || slugify(input.title),
      createdAt: stamp,
      updatedAt: stamp,
      ...input
    },
    input.category
  );

export const starterEntries: LoreEntry[] = [
  entry({
    title: "Gwen",
    category: "Characters",
    type: "Character",
    status: "Canon",
    spoilerLevel: "Minor Spoiler",
    tags: [
      "protagonist",
      "human",
      "fighter",
      "Osul",
      "cooking",
      "player character",
      "potatoes"
    ],
    summary:
      "Gwen is the main protagonist of Tales of the Tavern. She is a 23-year-old human woman from Osul who used to work with her uncle before being recruited by Tohm Kyatt to work at his tavern in Neverue / Whisker Woods.",
    publicDescription:
      "Gwen is a hardworking young fighter from Osul who finds herself swept into a strange culinary adventure after joining Tohm Kyatt's tavern. Armed with her sword, basket, and appetite, she gathers ingredients, protects villages, and cooks magical meals to face the dangers spreading through Whisker Woods.",
    internalLore:
      "Gwen is tomboyish, hardworking, smart, a talented fighter, and protective of villages. She goes out to farm, gather, complete tasks, fight critters, and protect people with her sword. She has an ale addiction she is working on. Her favorite food is anything potatoes. She is recruited by Tohm Kyatt to help recover stolen/torn recipes and stop the spread of magical corruption.",
    fields: {
      Personality:
        "Direct, practical, slightly sarcastic, brave, protective, easily annoyed by nonsense, but kind underneath.",
      "Gameplay Role":
        "Player character. She gathers ingredients, fights enemies, cooks meals, equips meals for combat buffs and abilities, completes quests, explores Whisker Woods, and recovers recipe pages.",
      "Visual Notes":
        "In-game Gwen has a big nose, but for cinematic/anime-style marketing her nose should be drawn smaller because the original look does not translate as well visually. She should feel strong, grounded, expressive, practical, and charming.",
      "Pose Suggestions":
        "Hands on hips, leaning on sword, carrying basket, rummaging through basket, protective combat stance, tired but determined, annoyed at Tohm, smiling after a good meal."
    },
    connections: {
      characters: ["Tohm Kyatt", "Princess Lillia", "Lel Kai", "Oswin"],
      locations: ["Whisker Woods", "Osul"],
      recipes: ["Magical Meals"],
      quests: ["Recover Recipe Pages", "Kap's Pond Rescue"],
      items: ["Recipe Pages", "Gwen's Basket"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Meal Slot Wheel", "Ales / Tonics"],
      enemies: [],
      timelineEvents: ["Gwen Is Recruited"]
    }
  }),
  entry({
    title: "Tohm Kyatt",
    category: "Characters",
    type: "Character",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: [
      "chef",
      "Whisken",
      "food critic",
      "mentor",
      "secret",
      "Tablemaker",
      "Tabby Island",
      "Cat Cauldron",
      "redemption"
    ],
    summary:
      "Tohm Kyatt is a world-renowned Whisken chef and food critic who discovers the Cat Cauldron, awakens its power, and later hires Gwen to recover torn magical recipe pages.",
    publicDescription:
      "Tohm Kyatt is a world-renowned Whisken chef and food critic whose mysterious recipes may be the key to saving the land. Brilliant, dramatic, and more than a little secretive, Tohm recruits Gwen to help recover stolen recipes before they cause even more chaos.",
    internalLore:
      "Tohm Kyatt is a Whisken cat chef and food critic. He is the only cat to ever possess sweet taste buds, making him obsessed with tasting every possible food. As a child, his mother told him stories of the Tablemaker, the canonical divine figure also called the Master Chef, and those stories shaped his obsession with cooking, sacred meals, and the knowledge of what is untasted. Tohm originally lived on Tabby Island with the Whisken people. Later in life, he discovered that the ancient Whisken had created the Cat Cauldron beneath Tabby Island and erased it from their own history after it caused the island's first decay and first exodus. Tohm returned to Tabby Island, found the Cat Cauldron, and cooked a meal in it. Activating it released a large pulse into the earth, causing Tabby Island to begin decaying again and allowing the Mas'eel Cult to sense the Cat Cauldron's power. Tohm then took the Cat Cauldron and fled in the Living Tavern without anyone knowing. When he later heard that Tabby Island had become corrupted and that the Whisken were being persecuted by Mas'eel infiltrators, he got his friend Lel Kai, who was becoming general of the faery army, to send boats and save as many people as possible. Tohm is not purely evil. He is flawed, obsessive, secretive, prideful, and morally compromised, but he has a redemption arc. He wants to fix the harm caused by his obsession. Important canon detail: Tohm never drinks from the cauldron. Updated Lillia Incident: Tohm creates an unstable magical dish using the dragon knife and magical culinary knowledge. Lillia consumes it and gains dangerous magical powers. The living chicken tavern suddenly stands up, causing Lillia, who wears large pajamas resembling a witch costume, to fall over. This gives Tohm the opportunity to snatch the recipe book back, but Lillia rips out several pages. As guards approach, Tohm is forced to flee.",
    fields: {
      Motivation:
        "To taste the impossible, master magical cooking, and eventually fix the damage his obsession caused.",
      Arc:
        "From obsessive culinary genius hiding from his consequences to flawed mentor seeking redemption.",
      "Gameplay Role":
        "Quest giver, mentor, chef, lore source, recipe system anchor, morally complex guide.",
      "Faith Link": "Raised on stories of the Tablemaker, also called the Master Chef.",
      "Canon Note": "Discarded older mythic names are not canon entities."
    },
    connections: {
      characters: ["Gwen", "Princess Lillia", "Lel Kai", "King"],
      locations: ["Tabby Island", "Whisker Woods"],
      recipes: ["Dark Culinary Arts", "Magical Meals"],
      quests: ["Recover Recipe Pages"],
      items: [
        "Cat Cauldron",
        "Dragon Knife",
        "Tohm's Recipe Book",
        "Recipe Pages",
        "Living Chicken Tavern"
      ],
      factions: ["Whisken People", "Mas'eel Cult"],
      secrets: [
        "Secret: Tohm Awakened the Cat Cauldron",
        "Secret: Tohm Never Drinks From The Cauldron"
      ],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: [
        "Tohm Awakens the Cat Cauldron",
        "Mas'eel Infiltrate Tabby Island",
        "Second Whisken Exodus",
        "Lillia Consumes the Unstable Magical Dish"
      ]
    }
  }),
  entry({
    title: "Princess Lillia",
    category: "Characters",
    type: "Character",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: [
      "antagonist",
      "princess",
      "magic",
      "faery obsession",
      "Dark Culinary Arts",
      "corrupted recipes",
      "Mas'eel"
    ],
    summary:
      "Princess Lillia is a stubborn young princess of the human kingdom who grew up wanting to become a faery. Her obsession with magic leads to the spread of the Dark Culinary Arts.",
    publicDescription:
      "Princess Lillia is a magical threat tied to the rise of corrupted cooking and dangerous recipe-powered enemies. Her obsession with magic has left a trail of strange meals, twisted powers, and chaos across the land.",
    internalLore:
      "Lillia is the daughter of the king and queen. Because the royal family was close to the faery kingdom, Lillia grew up fascinated by faeries and eventually became obsessed with becoming one. The king and queen spent about a year consulting mages and allies to find a way to give her magical powers. The faeries refused to help because they feared humans gaining magic would lead to humans dominating all kingdoms. The king eventually turned to the dwarven kingdom, knowing they possessed a magical dragon knife. The dwarves refused to give it up, and the king declared war. After winning, he took the dragon knife. Tohm Kyatt eventually gains access to the dragon knife through the royal food contest / royal access plotline. He creates an unstable magical dish. Lillia consumes it and gains dangerous magical powers. She attempts to steal Tohm's recipe book, but only tears out several pages before Tohm escapes. The torn recipe pages become central to the game. Lillia later sets up camp in the faery realm because she can consume the magic in the environment to mass-produce Dark Culinary Arts instead of infusing each meal one at a time. The Mas'eel Cult now works with her while searching for the Cat Cauldron and Tohm's magical recipes.",
    fields: {
      "Dark Culinary Arts":
        "Lillia uses magic to corrupt food. Food infused with the Dark Culinary Arts can make consumers evil or corrupted. She distributes magically enhanced dishes to people who later become bosses Gwen must defeat.",
      Personality:
        "Stubborn, entitled, obsessive, magical, theatrical, dangerous, childish in some ways but terrifying because of her power.",
      "Gameplay Role":
        "Major antagonist. Source of corrupted magical meals and recipe-powered bosses."
    },
    connections: {
      characters: ["Tohm Kyatt", "Gwen", "King", "Queen"],
      locations: ["Faery Realm", "Human Kingdom / Royal Castle", "Dwarven Mountains"],
      recipes: ["Dark Culinary Arts"],
      quests: ["Recover Recipe Pages"],
      items: ["Dragon Knife", "Recipe Pages", "Tohm's Recipe Book"],
      factions: ["Faery Kingdom", "Dwarven Kingdom", "Human Kingdom", "Mas'eel Cult"],
      secrets: ["Secret: Lillia Tore Recipe Pages"],
      gameplaySystems: ["Cooking System"],
      enemies: ["Ice Queen"],
      timelineEvents: ["Lillia Tears Out Recipe Pages"]
    }
  }),
  entry({
    title: "Lel Kai",
    category: "Characters",
    type: "Character",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["faery", "magical", "Whisker Woods", "NPC", "Tabby Island rescue"],
    summary:
      "Lel Kai is a character connected to Tales of the Tavern's faery/magical side and appears in plans for Whisker Woods content and marketing scenes.",
    internalLore:
      "Lel Kai has a human form and is connected to the fairy/faery kingdom side of the world. Later, as Lel Kai is becoming general of the faery army, Tohm conveniently gets them to send boats to rescue the Whisken from Tabby Island during the second exodus. The corruption is severe enough that many boats are dispersed, and the known survivors are the Whisken who reach Whisker Woods. Lel Kai is planned to appear in the Whisker Woods vertical slice and later story progression. In New Year marketing art, Lel Kai appears at the fairy kingdom popping champagne with fairy dust in the sky like fireworks.",
    notes: {
      art: "Needs dialogue art planned.",
      gameplay: "",
      production:
        "Needs idle and walk animations for playtest scope. May appear after the Thairrott mini-boss in a planned vertical slice meet-up with Cedar and Lyra.",
      marketing: "Useful for faery-side seasonal art.",
      unresolved: ""
    },
    connections: {
      characters: ["Gwen", "Tohm Kyatt"],
      locations: ["Faery Realm", "Whisker Woods", "Tabby Island"],
      recipes: [],
      quests: [],
      items: [],
      factions: ["Faery Kingdom", "Whisken People"],
      secrets: [],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: ["Second Whisken Exodus", "Survivors Reach Whisker Woods"]
    }
  }),
  entry({
    title: "Oswin",
    category: "Characters",
    type: "Character",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["alchemist", "elder", "suspicious", "Tohm", "Healthy Ale", "Whisken"],
    summary: "Oswin is an alchemist elder, village remedy-maker, and inventor of Healthy Ale who is suspicious of Tohm Kyatt.",
    internalLore:
      "Oswin functions as a skeptical elder/alchemist figure who may understand more about magic, food, corruption, or Tohm's past than most villagers. He is suspicious of Tohm and can serve as a counterweight to Tohm's secrecy. Notion lore also gives him the village-famous Healthy Ale, a remedy-like drink that Whisken villagers rely on even though the name is funnier than it is medically accurate.",
    fields: {
      "Gameplay Role":
        "Potential NPC, lore explainer, alchemy/crafting system connection, quest giver.",
      "Known Creation": "Healthy Ale",
      "Village Role": "Remedy-maker and brewing elder."
    },
    connections: {
      characters: ["Tohm Kyatt", "Gwen"],
      locations: ["Whisker Woods", "Whisken Village"],
      recipes: ["Healthy Ale"],
      quests: [],
      items: ["Whisken Root Ferment", "Moonlit Dew", "Specialty Herbs"],
      factions: ["Whisken People"],
      secrets: ["Secret: Tohm Awakened the Cat Cauldron"],
      gameplaySystems: ["Cooking System", "Crafting System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Kap",
    category: "Characters",
    type: "Character",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["fisherman", "Whisken Village", "pond", "NPC", "quest"],
    summary:
      "Kap is a generous Whisken fisherman tied to the corrupted pond opening quest and dreams of setting sail someday.",
    internalLore:
      "Kap is a villager and fisherman who gets attacked or endangered near the corrupted pond. Gwen hears him screaming for help, fights bugs, and eventually faces a prawnhusk mini-boss. Notion lore frames Kap as someone who loves the ocean, dreams of setting sail, and shares his catches generously with the village.",
    fields: {
      "Gameplay Role":
        "Opening quest NPC, fishing system connection, emotional reason to care about the village.",
      "Personal Dream": "Sail beyond Whisker Woods and see the wider waters.",
      "Village Role": "Fisherman and provider."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods", "Kap's Pond"],
      recipes: ["Cat Cauldron Broth Base", "Whisken Hearth Stew"],
      quests: ["Kap's Pond Rescue"],
      items: ["Prawnhusk Meat"],
      factions: ["Whisken People"],
      secrets: [],
      gameplaySystems: ["Fishing System"],
      enemies: ["Prawnhusk"],
      timelineEvents: []
    }
  }),
  entry({
    title: "King",
    category: "Characters",
    type: "Character",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["human kingdom", "Lillia", "dragon knife", "dwarves", "war"],
    summary:
      "The human king is Lillia's father. His obsession with granting her magic leads him to war with the dwarves and obtain the dragon knife.",
    internalLore:
      "The king loves Lillia but becomes increasingly obsessed with fulfilling her wish to gain magic. After the faeries refuse to help, he turns to the dwarves, who possess the magical dragon knife. When they refuse to give it up, he declares war, wins, and takes the knife. This act sets the stage for Tohm's involvement and Lillia's eventual corruption.",
    connections: {
      characters: ["Princess Lillia", "Queen", "Tohm Kyatt"],
      locations: ["Human Kingdom / Royal Castle", "Dwarven Mountains"],
      recipes: [],
      quests: [],
      items: ["Dragon Knife"],
      factions: ["Faery Kingdom", "Dwarven Kingdom", "Human Kingdom"],
      secrets: ["Secret: King's Obsession Caused War"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: ["King Takes the Dragon Knife"]
    }
  }),
  entry({
    title: "Queen",
    category: "Characters",
    type: "Character",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["human kingdom", "Lillia", "royal family"],
    summary:
      "The queen is Lillia's mother and part of the royal family's attempt to grant Lillia magical powers.",
    internalLore:
      "The queen indulges Lillia's obsession alongside the king and supports the search for magical solutions. She is connected to the royal family's year-long effort to give Lillia magic.",
    connections: {
      characters: ["Princess Lillia", "King"],
      locations: ["Human Kingdom / Royal Castle"],
      recipes: [],
      quests: [],
      items: ["Dragon Knife"],
      factions: ["Faery Kingdom", "Human Kingdom"],
      secrets: [],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "The Tablemaker and Triadic Faith",
    category: "Story",
    type: "World Faith",
    status: "Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["Tablemaker", "Master Chef", "Triadic faith", "Passion", "Taste", "Love"],
    summary:
      "The Tablemaker is the canonical divine figure of the setting, also called the Master Chef, and most cultures follow the Triadic faith in their own traditions.",
    internalLore:
      "The Tablemaker is the canonical one God of the world. The Master Chef is another name for him, not a separate being. Most races now worship the Tablemaker and follow the Triadic faith, though each race practices the faith through its own local traditions, foods, feasts, rites, and cultural habits. The core triad is Passion, Taste, and Love. The Whisken people are strongly tied to this faith, and Tohm grew up listening to stories of the Tablemaker before his obsession with magical cooking and the Cat Cauldron took hold.",
    fields: {
      Aliases: "The Master Chef",
      "Core Triad": "Passion, Taste, Love",
      "Cultural Practice":
        "Most races believe in the same God and same faith, but practice it differently through their own traditions.",
      "Canon Note": "Discarded older mythic names are not canon figures."
    },
    connections: {
      characters: ["Tohm Kyatt"],
      locations: ["Tabby Island"],
      recipes: ["Magical Meals"],
      quests: [],
      items: ["Cat Cauldron", "Recipe Pages", "Tohm's Recipe Book"],
      factions: ["Whisken People", "Mas'eel Cult"],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: ["Tablemaker Stories Inspire Tohm"]
    }
  }),
  entry({
    title: "Whisker Woods",
    category: "World",
    type: "Location",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["forest", "Act 1", "Whisken", "village", "playtest", "corruption"],
    summary:
      "Whisker Woods is a major early-game region where the Whisken survivors live after fleeing Tabby Island.",
    internalLore:
      "Whisker Woods is a cozy but increasingly corrupted forest region. It includes cliffs, flowers, grass, trees, village areas, ponds, bug nests, groves, farms, and magical points of interest. It is the main setting for the Act 1 / vertical slice playtest.",
    fields: {
      "Visual Identity":
        "Warm earthy colors, bold outlines, whimsical forest shapes, tavern/cozy fantasy atmosphere, charming but with pockets of corruption.",
      "Gameplay Purpose":
        "Opening exploration area, tutorial region, gathering zone, enemy encounters, cooking resources, village hub, corrupted pond event, bug nest blockade, Act 1 boss buildup."
    },
    connections: {
      characters: ["Gwen", "Tohm Kyatt", "Kap", "Oswin"],
      locations: ["Whisken Village", "Kap's Pond"],
      recipes: ["Slime Substitutions"],
      quests: ["Opening Grocery Quest", "Kap's Pond Rescue"],
      items: ["Recipe Pages"],
      factions: ["Whisken People"],
      secrets: [],
      gameplaySystems: ["Cooking System", "Day / Night and Seasons"],
      enemies: ["Slimes", "Ice Queen", "Prawnhusk"],
      timelineEvents: ["Kap's Pond Is Corrupted"]
    }
  }),
  entry({
    title: "Whisken Village",
    category: "World",
    type: "Location",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["village", "Whisken", "tavern culture", "NPC hub"],
    summary:
      "Village area in Whisker Woods where the Whisken survivors live.",
    internalLore:
      "A village culture built around taverns, cooking, hunting, farming, fishing, gathering, and community survival. The village represents the cozy heart of the game and shows how food is tied to identity and daily life.",
    fields: {
      "Gameplay Purpose": "NPC hub, quest hub, cooking/tavern connection, social location."
    },
    connections: {
      characters: ["Gwen", "Tohm Kyatt", "Kap", "Oswin"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: ["Whisken People"],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Tabby Island",
    category: "World",
    type: "Location",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["original home", "corruption", "Cat Cauldron", "Tohm secret", "Whisken", "Mas'eel"],
    summary:
      "The original home of the Whisken people, twice struck by decay tied to the Cat Cauldron and later infiltrated by the Mas'eel Cult.",
    internalLore:
      "Tabby Island was the original home of the Whisken people, including Tohm Kyatt. In ancient times, Whisken seekers created the Cat Cauldron while trying to improve food and reach the knowledge of what is untasted. Its power caused the island to begin decaying, leading to the first exodus. The ancient Whisken locked the Cat Cauldron away at the bottom of the island, erased it from history books, and stopped speaking about it until it was forgotten by the time their people returned. Later, Tohm discovered the buried knowledge, returned to Tabby Island, cooked a meal in the Cat Cauldron, and released a pulse into the earth that started the island decaying again. Tohm fled with the Cat Cauldron in the Living Tavern without anyone knowing. The pulse also let the Mas'eel Cult sense the artifact, and cultists came to Tabby Island pretending to be traders before slowly searing the island, gaining power in the village, and persecuting the Whisken for their Triadic faith.",
    fields: {
      "Gameplay / Story Purpose":
        "Major backstory location, source of Tohm's guilt, Mas'eel infiltration site, potential future reveal location or memory sequence.",
      "First Exodus": "Ancient Whisken fled after the Cat Cauldron caused Tabby Island to decay.",
      "Second Exodus":
        "Later Whisken fled again after Tohm reawakened the Cat Cauldron and the Mas'eel Cult corrupted the island."
    },
    connections: {
      characters: ["Tohm Kyatt", "Lel Kai"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: ["Cat Cauldron"],
      factions: ["Whisken People", "Mas'eel Cult"],
      secrets: [
        "Secret: Tohm Awakened the Cat Cauldron",
        "Secret: Cat Cauldron Beneath Tabby Island",
        "Secret: Mas'eel Infiltrated Tabby Island"
      ],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: [
        "First Whisken Exodus",
        "Tohm Awakens the Cat Cauldron",
        "Mas'eel Infiltrate Tabby Island",
        "Second Whisken Exodus"
      ]
    }
  }),
  entry({
    title: "Kap's Pond",
    category: "World",
    type: "Location",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["pond", "fishing", "corruption", "Kap", "Prawnhusk"],
    summary:
      "A fishing pond in Whisker Woods where Kap is attacked during an early quest.",
    internalLore:
      "Normal: peaceful fishing spot. Corrupted: dark water, bugs, Kap in danger, prawnhusk emerges. Purified: fish return, villagers may revisit, slime formation may occur.",
    fields: {
      "Gameplay Purpose":
        "Opening quest event, combat tutorial, fishing system connection, corrupted zone demonstration."
    },
    connections: {
      characters: ["Kap", "Gwen"],
      locations: ["Whisker Woods"],
      recipes: ["Slime Substitutions"],
      quests: ["Kap's Pond Rescue"],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Fishing System"],
      enemies: ["Prawnhusk", "Slimes"],
      timelineEvents: ["Kap's Pond Is Corrupted"]
    }
  }),
  entry({
    title: "Faery Realm",
    category: "World",
    type: "Location",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["faery", "magic", "Lillia", "Dark Culinary Arts"],
    summary:
      "A magical realm connected to faeries and Lillia's later use of the Dark Culinary Arts.",
    internalLore:
      "Lillia sets up camp in the faery realm because she can consume the magic in the faery environment to mass-produce the Dark Culinary Arts. If she stayed in the castle, she would need to infuse each meal one at a time.",
    connections: {
      characters: ["Princess Lillia", "Lel Kai"],
      locations: [],
      recipes: ["Dark Culinary Arts"],
      quests: [],
      items: [],
      factions: ["Faery Kingdom"],
      secrets: ["Secret: Lillia Uses Dark Culinary Arts"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Human Kingdom / Royal Castle",
    category: "World",
    type: "Location",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["humans", "royal family", "Lillia", "dragon knife"],
    summary:
      "The kingdom ruled by Lillia's parents. The royal family's desire to grant Lillia magic leads to war and the dragon knife incident.",
    connections: {
      characters: ["Princess Lillia", "King", "Queen", "Tohm Kyatt"],
      locations: ["Dwarven Mountains"],
      recipes: [],
      quests: [],
      items: ["Dragon Knife"],
      factions: ["Human Kingdom", "Dwarven Kingdom"],
      secrets: ["Secret: King's Obsession Caused War"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Dwarven Mountains",
    category: "World",
    type: "Location",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["dwarves", "dragon knife", "war"],
    summary:
      "The region where the dwarves possessed the magical dragon knife before the human king took it through war.",
    connections: {
      characters: ["King", "Princess Lillia"],
      locations: ["Human Kingdom / Royal Castle"],
      recipes: [],
      quests: [],
      items: ["Dragon Knife"],
      factions: ["Dwarven Kingdom"],
      secrets: ["Secret: King's Obsession Caused War"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Saltlick Stones",
    category: "World",
    type: "Point of Interest",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["Whisker Woods", "mineral", "salt", "gathering"],
    summary:
      "A Whisker Woods point of interest connected to minerals, salt, wildlife, or food gathering.",
    fields: {
      "Gameplay Purpose": "Gathering area, environmental storytelling, possible mineral/salt ingredient source."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: ["Specialty Herbs"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Gathering"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Mushroom Ring Glade",
    category: "World",
    type: "Point of Interest",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["mushrooms", "faery", "glade", "Whisker Woods"],
    summary:
      "A magical forest glade with mushrooms, possible faery activity, ingredients, slimes, or hidden secrets.",
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: ["Faery Kingdom"],
      secrets: [],
      gameplaySystems: ["Gathering"],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Honey Hollow",
    category: "World",
    type: "Point of Interest",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["honey", "sweet", "bees", "slimes", "Whisker Woods"],
    summary:
      "A sweet resource area with honey, bees, sticky hazards, and possible sweet-flavored slimes.",
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: ["Slime Substitutions"],
      quests: [],
      items: ["Strawberry Slime Gel", "Blueberry Slime Gel"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Firefly Meadow",
    category: "World",
    type: "Point of Interest",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["fireflies", "night", "glow", "Whisker Woods"],
    summary:
      "A glowing meadow that can show the beauty and magic of Whisker Woods, especially at night.",
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Day / Night and Seasons"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Dark Culinary Arts",
    category: "Food & Inventory",
    type: "Food Magic System",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["dark magic", "Lillia", "corruption", "food magic", "bosses"],
    summary:
      "A corrupted magical cooking practice used by Lillia to infuse food with dark magic.",
    internalLore:
      "The Dark Culinary Arts allow food to be infused with corruptive magic. Consumers of these meals can become evil, corrupted, or gain dangerous powers. Lillia uses the magic of the faery realm to mass-produce these corrupted meals and distribute them to individuals who later become bosses.",
    fields: {
      "Gameplay Purpose":
        "Explains corrupted bosses, recipe-powered enemies, dark meals, and magical food as both power and danger."
    },
    connections: {
      characters: ["Princess Lillia", "Tohm Kyatt"],
      locations: ["Faery Realm"],
      recipes: ["Magical Meals"],
      quests: ["Recover Recipe Pages"],
      items: ["Recipe Pages"],
      factions: [],
      secrets: ["Secret: Dark Culinary Arts Can Corrupt Consumers"],
      gameplaySystems: ["Cooking System"],
      enemies: ["Ice Queen"],
      timelineEvents: ["Lillia Begins Using Dark Culinary Arts"]
    }
  }),
  entry({
    title: "Magical Meals",
    category: "Food & Inventory",
    type: "Recipe System",
    status: "Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["meals", "powers", "combat", "buffs", "cooking"],
    summary:
      "Meals that grant Gwen temporary combat powers, stat boosts, ultimate abilities, or special effects.",
    internalLore:
      "Players gather ingredients, prepare them, cook meals, and equip meals in a meal slot wheel. Gwen can consume meals mid-battle for temporary powers.",
    connections: {
      characters: ["Gwen", "Tohm Kyatt"],
      locations: [],
      recipes: [],
      quests: ["Recover Recipe Pages"],
      items: ["Recipe Pages"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Meal Slot Wheel"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Cray Broth",
    category: "Food & Inventory",
    type: "Recipe",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["broth", "Crayhusk", "savory", "cauldron"],
    summary:
      "A savory aquatic broth made from Crayhusk meat, specialty herbs, and boga.",
    fields: {
      Ingredients: "Crayhusk meat, specialty herbs, boga.",
      Preparation:
        "Drag valid ingredients into the cauldron, boil, and stir slowly as it cooks.",
      "Gameplay Effect": "Could provide defensive, aquatic, or savory/umami buffs."
    },
    wiki: {
      itemType: "Recipe",
      rarity: "Uncommon",
      ingredientsRequired: "Crayhusk meat, specialty herbs, boga",
      gameplayUse: "Potential defensive, aquatic, or savory/umami buff.",
      loreDescription: "A savory aquatic broth with cauldron-task preparation."
    },
    connections: {
      characters: [],
      locations: [],
      recipes: [],
      quests: [],
      items: ["Crayhusk Meat", "Specialty Herbs", "Boga"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: ["Crayhusk"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Veggie Broth",
    category: "Food & Inventory",
    type: "Recipe",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["broth", "vegetables", "healing", "cauldron"],
    summary:
      "A comforting vegetable broth made from specialty herbs, boga, and turnip.",
    fields: {
      Ingredients: "Specialty herbs, boga, turnip.",
      Preparation: "Boil ingredients in cauldron and stir slowly.",
      "Gameplay Effect": "Could provide healing, stamina, or comfort buffs."
    },
    wiki: {
      itemType: "Recipe",
      rarity: "Common",
      ingredientsRequired: "Specialty herbs, boga, turnip",
      gameplayUse: "Potential healing, stamina, or comfort buff.",
      loreDescription: "A cozy vegetable broth made from starter ingredients."
    },
    connections: {
      characters: [],
      locations: [],
      recipes: [],
      quests: [],
      items: ["Specialty Herbs", "Boga", "Turnip"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Fire Meal",
    category: "Food & Inventory",
    type: "Magical Meal",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["fire", "spicy", "magical meal", "combat"],
    summary:
      "A spicy magical meal that could give Gwen fire-based combat abilities.",
    fields: {
      "Gameplay Effect":
        "Could give Gwen fire attacks, burn damage, warmth resistance, or explosive cooking energy."
    },
    wiki: {
      itemType: "Magical Meal",
      rarity: "Rare",
      gameplayUse:
        "Fire attacks, burn damage, warmth resistance, or explosive cooking energy.",
      loreDescription: "A spicy magical meal concept tied to combat powers."
    },
    connections: {
      characters: ["Gwen"],
      locations: [],
      recipes: ["Magical Meals"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Combat System", "Meal Slot Wheel"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Ales / Tonics",
    category: "Food & Inventory",
    type: "Consumable System",
    status: "Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["ale", "tonic", "healing", "buff", "Gwen"],
    summary: "Ales and tonics provide buffs, heals, or gameplay advantages.",
    internalLore:
      "Gwen has an ale addiction she is working on, so ale has both gameplay and character-story relevance.",
    fields: {
      "Gameplay Purpose": "Healing, buffs, status effects, tavern economy, character depth."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisken Village"],
      recipes: [],
      quests: [],
      items: ["Ale Ingredients", "Strawberry Slime Gel", "Blueberry Slime Gel"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Slime Flavor / Element System"],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Slime Substitutions",
    category: "Food & Inventory",
    type: "Ingredient System",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["slimes", "ingredients", "substitutions", "flavor"],
    summary:
      "Slimes can sometimes substitute for ingredients based on flavor.",
    internalLore:
      "Slimes are born from excess nutrients released through roots in ripe and healthy forests. These nutrients gather in ponds and slowly form into slimes. Their flavors come from whatever plants are abundant near the pond. Strawberry slime can substitute for strawberry, blueberry slime for blueberry, etc. Slimes can also be brewed into ales. Elemental slimes are tied to flavor profiles. Dark elemental slimes come from excess corruption rather than healthy forest nutrients.",
    fields: {
      "Gameplay Purpose":
        "Ingredient substitution, ale brewing, flavor/element system, resource gathering."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods", "Kap's Pond"],
      recipes: ["Ales / Tonics"],
      quests: [],
      items: ["Strawberry Slime Gel", "Blueberry Slime Gel", "Dark Slime Essence"],
      factions: [],
      secrets: ["Secret: Slimes Born From Nutrients Or Corruption"],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Potato",
    category: "Food & Inventory",
    type: "Ingredient",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["ingredient", "root vegetable", "Gwen favorite", "comfort food"],
    summary: "Gwen's favorite food category.",
    wiki: {
      itemType: "Ingredient",
      rarity: "Common",
      whereToFind: "Farms, gardens, Whisker Woods.",
      usedInRecipes: "Comfort/hearty meals.",
      canBeSliced: true,
      canBeBoiled: true,
      canBeFried: true,
      gameplayUse: "Comfort/hearty meals and starter cooking.",
      loreDescription: "A humble staple and Gwen's favorite food category."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Turnip",
    category: "Food & Inventory",
    type: "Ingredient",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["ingredient", "root vegetable", "Veggie Broth"],
    summary: "Root vegetable used in veggie broth.",
    wiki: {
      itemType: "Ingredient",
      rarity: "Common",
      usedInRecipes: "Veggie Broth",
      canBeSliced: true,
      canBeChopped: true,
      canBeBoiled: true,
      gameplayUse: "Starter vegetable and broth ingredient.",
      loreDescription: "A plain root vegetable with cozy meal potential."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: ["Veggie Broth"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Boga",
    category: "Food & Inventory",
    type: "Ingredient",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["ingredient", "broth", "needs lore"],
    summary: "Ingredient used in broths. Needs more lore.",
    notes: {
      art: "",
      gameplay: "",
      production: "",
      marketing: "",
      unresolved: "Define what boga actually is and where it comes from."
    },
    wiki: {
      itemType: "Ingredient",
      rarity: "Uncommon",
      usedInRecipes: "Cray Broth, Veggie Broth",
      gameplayUse: "Broth ingredient.",
      loreDescription: "A brothy ingredient that needs more lore."
    },
    connections: {
      characters: [],
      locations: [],
      recipes: ["Cray Broth", "Veggie Broth"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Specialty Herbs",
    category: "Food & Inventory",
    type: "Ingredient",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["ingredient", "herbs", "seasoning", "broths"],
    summary: "Herbs used in broths, seasoning, and magical meals.",
    wiki: {
      itemType: "Ingredient",
      rarity: "Uncommon",
      usedInRecipes: "Broths and seasonings.",
      canBeCrushed: true,
      canBeBoiled: true,
      gameplayUse: "Seasoning, broth, and magical meal support ingredient.",
      loreDescription: "A bundle of useful herbs with both flavor and magic potential."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: ["Cray Broth", "Veggie Broth"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Crayhusk Meat",
    category: "Food & Inventory",
    type: "Enemy Drop / Ingredient",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["enemy drop", "ingredient", "Crayhusk", "savory", "aquatic"],
    summary: "Meat from Crayhusk enemy.",
    fields: {
      Flavor: "Savory/umami/aquatic."
    },
    wiki: {
      itemType: "Enemy Drop / Ingredient",
      rarity: "Uncommon",
      relatedEnemies: "Crayhusk",
      usedInRecipes: "Cray Broth",
      canBeSliced: true,
      canBeBoiled: true,
      canBeFried: true,
      gameplayUse: "Savory aquatic ingredient.",
      loreDescription: "Meat harvested from a Crayhusk enemy."
    },
    connections: {
      characters: [],
      locations: ["Kap's Pond"],
      recipes: ["Cray Broth"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: ["Crayhusk"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Prawnhusk Meat",
    category: "Food & Inventory",
    type: "Enemy Drop / Ingredient",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["enemy drop", "ingredient", "Prawnhusk", "aquatic", "savory"],
    summary: "Meat from Prawnhusk enemy.",
    fields: {
      Flavor: "Aquatic/savory."
    },
    wiki: {
      itemType: "Enemy Drop / Ingredient",
      rarity: "Uncommon",
      relatedEnemies: "Prawnhusk",
      gameplayUse: "Aquatic savory ingredient.",
      loreDescription: "Meat from the corrupted pond mini-boss family."
    },
    connections: {
      characters: ["Kap"],
      locations: ["Kap's Pond"],
      recipes: [],
      quests: ["Kap's Pond Rescue"],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: ["Prawnhusk"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Strawberry Slime Gel",
    category: "Food & Inventory",
    type: "Slime Ingredient / Sweetener Substitute",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["slime", "ingredient", "sweet", "strawberry", "ale"],
    summary: "Sweet slime ingredient substitute.",
    wiki: {
      itemType: "Slime Ingredient / Sweetener Substitute",
      rarity: "Common",
      relatedEnemies: "Red/strawberry-flavored slimes",
      usedInRecipes: "Sweet meals and ales.",
      canBeBrewed: true,
      gameplayUse: "Can substitute for strawberry.",
      loreDescription: "A sweet gel that carries the flavor of nearby strawberry plants."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: ["Slime Substitutions", "Ales / Tonics"],
      quests: [],
      items: [],
      factions: [],
      secrets: ["Secret: Slimes Born From Nutrients Or Corruption"],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Blueberry Slime Gel",
    category: "Food & Inventory",
    type: "Slime Ingredient / Sweetener Substitute",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["slime", "ingredient", "sweet", "tart", "blueberry", "ale"],
    summary: "Sweet/tart slime ingredient substitute.",
    wiki: {
      itemType: "Slime Ingredient / Sweetener Substitute",
      rarity: "Common",
      relatedEnemies: "Blue/blueberry-flavored slimes",
      usedInRecipes: "Sweet/tart meals and ales.",
      canBeBrewed: true,
      gameplayUse: "Can substitute for blueberry.",
      loreDescription: "A blue gel with sweet and tart berry qualities."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: ["Slime Substitutions", "Ales / Tonics"],
      quests: [],
      items: [],
      factions: [],
      secrets: ["Secret: Slimes Born From Nutrients Or Corruption"],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Dark Slime Essence",
    category: "Food & Inventory",
    type: "Corrupted Ingredient",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["slime", "corruption", "dark", "ingredient"],
    summary: "Corrupted slime essence from areas of excess corruption.",
    wiki: {
      itemType: "Corrupted Ingredient",
      rarity: "Rare",
      relatedEnemies: "Dark slimes",
      gameplayUse: "Can corrupt recipes or produce dark effects.",
      loreDescription:
        "A dark essence born from excess corruption instead of healthy forest nutrients."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods", "Kap's Pond"],
      recipes: ["Dark Culinary Arts", "Slime Substitutions"],
      quests: [],
      items: [],
      factions: [],
      secrets: ["Secret: Slimes Born From Nutrients Or Corruption"],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Ale Ingredients",
    category: "Food & Inventory",
    type: "Brewing Ingredients",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["ale", "brewing", "buffs", "heals"],
    summary: "Ingredients used for brewing buffs/heals.",
    wiki: {
      itemType: "Brewing Ingredients",
      rarity: "Varies",
      usedInRecipes: "Ales / Tonics",
      canBeBrewed: true,
      gameplayUse: "Brewing buffs and heals.",
      loreDescription: "A category for future ale and tonic ingredients."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisken Village"],
      recipes: ["Ales / Tonics"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Opening Grocery Quest",
    category: "Quests",
    type: "Main Quest / Tutorial Quest",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["opening", "Gwen", "Tohm", "gathering", "tutorial"],
    summary:
      "Gwen finishes a meal and must gather ingredients for Tohm's menu before a deadline.",
    fields: {
      "Quest Flow":
        "1. Gwen finishes a meal and reacts that it was awesome. 2. She references Tohm's harsh critique and deadline to bring new recipe/menu by 8pm. 3. Gwen receives or checks a grocery list. 4. The player gathers ingredients like boar meat, Purfox, Sunchee, or other starter ingredients. 5. The route introduces gathering, movement, and early exploration. 6. A bug nest blockade interrupts the route and introduces combat.",
      "Gameplay Tutorials": "Gathering, quest tracker, basic movement, possibly inventory."
    },
    connections: {
      characters: ["Gwen", "Tohm Kyatt"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Quest System"],
      enemies: ["Boar", "Beetle Enemy 1"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Kap's Pond Rescue",
    category: "Quests",
    type: "Main Quest / Tutorial Quest",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["Kap", "pond", "combat", "corruption", "Prawnhusk"],
    summary:
      "Gwen hears Kap screaming for help near a corrupted pond and fights bugs before a prawnhusk mini-boss appears.",
    fields: {
      "Quest Flow":
        "1. Player approaches pond. 2. Kap screams for help. 3. Gwen reaches corrupted pond. 4. Small bug enemies attack. 5. Prawnhusk mini-boss appears. 6. Gwen defeats it. 7. Kap thanks Gwen and heads to the tavern. 8. Pond may eventually become purified.",
      "Gameplay Tutorials": "Combat, enemy waves, mini-boss, healing ale, corruption introduction.",
      "Lore Revealed": "Corruption is spreading through Whisker Woods. Ponds and wildlife can be affected."
    },
    connections: {
      characters: ["Kap", "Gwen"],
      locations: ["Kap's Pond", "Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Combat System", "Quest System"],
      enemies: ["Prawnhusk"],
      timelineEvents: ["Kap's Pond Is Corrupted"]
    }
  }),
  entry({
    title: "Craft a Pickaxe Tutorial",
    category: "Quests",
    type: "Tutorial Quest",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["crafting", "pickaxe", "rocks", "tutorial"],
    summary:
      "When the player tries to break rocks with a sword, the game teaches pickaxe crafting.",
    fields: {
      Flow:
        "1. Player attacks rock with sword. 2. Prompt appears explaining that a pickaxe is needed. 3. Crafting menu opens or is introduced. 4. Player collects sticks and stones. 5. Player crafts a basic pickaxe. 6. Player breaks rock."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Crafting System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Craft a Slingshot Tutorial",
    category: "Quests",
    type: "Tutorial Quest",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["slingshot", "fruit", "crafting", "tutorial"],
    summary:
      "When the player finds fruit trees, the game teaches slingshot crafting.",
    fields: {
      Flow: "Player sees fruit out of reach, crafts slingshot, shoots fruit down."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Crafting System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Craft a Shovel Tutorial",
    category: "Quests",
    type: "Tutorial Quest",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["shovel", "root vegetables", "dirt mounds", "crafting"],
    summary:
      "When the player finds dirt mounds/root vegetables, the game teaches shovel crafting.",
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: ["Potato", "Turnip"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Crafting System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Cave Entrance Tutorial",
    category: "Quests",
    type: "Tutorial Quest",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["cave", "exploration", "torch", "lantern"],
    summary:
      "When the player steps near the cave entrance, the game introduces cave exploration naturally without needing an exclamation icon.",
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Crafting System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Recover Recipe Pages",
    category: "Quests",
    type: "Main Quest",
    status: "Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["recipe pages", "bosses", "Lillia", "Tohm", "Gwen"],
    summary:
      "Gwen must defeat individuals empowered by magical recipe pages to recover Tohm's torn recipes.",
    internalLore:
      "Bosses have powers connected to the recipes they consumed or were corrupted by. After defeating bosses, Gwen retrieves recipe pages and unlocks new powers/meals.",
    connections: {
      characters: ["Gwen", "Tohm Kyatt", "Princess Lillia"],
      locations: ["Whisker Woods"],
      recipes: ["Dark Culinary Arts", "Magical Meals"],
      quests: [],
      items: ["Recipe Pages", "Tohm's Recipe Book"],
      factions: [],
      secrets: ["Secret: Lillia Tore Recipe Pages"],
      gameplaySystems: ["Quest System", "Cooking System", "Meal Slot Wheel"],
      enemies: ["Ice Queen", "Magical Boar Boss", "Aquatic Monster Boss"],
      timelineEvents: ["Lillia Tears Out Recipe Pages", "Gwen Is Recruited"]
    }
  }),
  entry({
    title: "Slimes",
    category: "Enemies & Creatures",
    type: "Creature / Ingredient Source",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["slime", "flavor", "ingredient source", "nutrients", "corruption"],
    summary:
      "Slimes are creatures born from excess nutrients. They come in different flavors and behaviors.",
    internalLore:
      "When a forest is ripe and healthy, it disposes of extra nutrients through plant roots. These nutrients gather in ponds and slowly form into slimes. The flavor of a slime comes from whatever plants are abundant around that pond. Some slimes attack on sight. Some are neutral. Some only attack if attacked. Some run away. Slimes can be used as ingredient substitutes, sweeteners, and ale brewing materials. Elements are tied to flavor profiles. Dark elemental slimes are born from excess corruption in an area. Examples: red slime = strawberry flavor, blue slime = blueberry flavor, dark slime = corruption flavor/profile.",
    connections: {
      characters: [],
      locations: ["Whisker Woods", "Kap's Pond"],
      recipes: ["Slime Substitutions", "Ales / Tonics"],
      quests: [],
      items: ["Strawberry Slime Gel", "Blueberry Slime Gel", "Dark Slime Essence"],
      factions: [],
      secrets: ["Secret: Slimes Born From Nutrients Or Corruption"],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Prawnhusk",
    category: "Enemies & Creatures",
    type: "Enemy / Mini-boss",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["enemy", "mini-boss", "aquatic", "corruption", "Kap"],
    summary:
      "An aquatic/crustacean-like enemy tied to corrupted pond encounters.",
    internalLore: "Appears as a mini-boss during Kap's Pond Rescue and drops Prawnhusk meat.",
    connections: {
      characters: ["Kap", "Gwen"],
      locations: ["Kap's Pond"],
      recipes: [],
      quests: ["Kap's Pond Rescue"],
      items: ["Prawnhusk Meat"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Combat System"],
      enemies: ["Crayhusk"],
      timelineEvents: ["Kap's Pond Is Corrupted"]
    }
  }),
  entry({
    title: "Crayhusk",
    category: "Enemies & Creatures",
    type: "Enemy",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["enemy", "crayfish", "aquatic", "ingredient drop"],
    summary:
      "A crawfish/crayfish-like enemy that can drop meat used in broths.",
    internalLore: "Drops Crayhusk meat and relates to aquatic enemy families.",
    connections: {
      characters: [],
      locations: ["Kap's Pond"],
      recipes: ["Cray Broth"],
      quests: [],
      items: ["Crayhusk Meat"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Combat System", "Cooking System"],
      enemies: ["Prawnhusk"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Beetle Enemy 1",
    category: "Enemies & Creatures",
    type: "Enemy",
    status: "Playtest Scope",
    spoilerLevel: "No Spoiler",
    tags: ["bug", "playtest", "Whisker Woods"],
    summary: "Basic bug enemy planned for Whisker Woods playtest."
  }),
  entry({
    title: "Beetle Enemy 2",
    category: "Enemies & Creatures",
    type: "Enemy",
    status: "Playtest Scope",
    spoilerLevel: "No Spoiler",
    tags: ["bug", "playtest", "Whisker Woods"],
    summary: "Second beetle variation planned for Whisker Woods playtest."
  }),
  entry({
    title: "Fly Bug",
    category: "Enemies & Creatures",
    type: "Enemy",
    status: "Playtest Scope",
    spoilerLevel: "No Spoiler",
    tags: ["bug", "flying", "playtest"],
    summary: "Flying bug enemy planned for Whisker Woods playtest."
  }),
  entry({
    title: "Sword Skelly",
    category: "Enemies & Creatures",
    type: "Enemy",
    status: "Playtest Scope",
    spoilerLevel: "No Spoiler",
    tags: ["skeleton", "sword", "playtest"],
    summary: "Skeleton sword enemy planned for playtest scope."
  }),
  entry({
    title: "Boar",
    category: "Enemies & Creatures",
    type: "Enemy / Resource Creature",
    status: "Playtest Scope",
    spoilerLevel: "No Spoiler",
    tags: ["boar", "meat", "resource", "playtest"],
    summary:
      "Boar enemy/resource creature tied to meat gathering and possible magical boar boss idea.",
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: ["Opening Grocery Quest"],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Combat System", "Cooking System"],
      enemies: ["Magical Boar Boss"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Chicken",
    category: "Enemies & Creatures",
    type: "Creature / Resource Creature",
    status: "Playtest Scope",
    spoilerLevel: "No Spoiler",
    tags: ["chicken", "resource", "tavern"],
    summary: "Chicken creature/enemy/resource creature."
  }),
  entry({
    title: "Ice Queen",
    category: "Enemies & Creatures",
    type: "Boss",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["boss", "Act 1", "cursed bugs", "Whisker Woods"],
    summary: "Act 1 final boss, queen of cursed bugs in Whisker Woods.",
    fields: {
      "Gameplay Purpose": "Major boss encounter for Act 1. Could represent the peak of bug corruption."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: ["Dark Culinary Arts"],
      quests: ["Recover Recipe Pages"],
      items: ["Recipe Pages"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Combat System"],
      enemies: ["Beetle Enemy 1", "Beetle Enemy 2", "Fly Bug"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Magical Boar Boss",
    category: "Enemies & Creatures",
    type: "Boss",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["boss", "boar", "grove", "magical meal"],
    summary: "A magical boar boss in a grove.",
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: ["Magical Meals"],
      quests: ["Recover Recipe Pages"],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Combat System"],
      enemies: ["Boar"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Were-Dog NPC Boss",
    category: "Enemies & Creatures",
    type: "Boss",
    status: "Idea",
    spoilerLevel: "Minor Spoiler",
    tags: ["boss", "night", "curse", "meal conditions"],
    summary: "An NPC boss triggered by night or meal conditions.",
    fields: {
      "Gameplay Concept":
        "Could connect day/night cycle, food, curse mechanics, and player choice."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: ["Magical Meals"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Day / Night and Seasons", "Combat System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Aquatic Monster Boss",
    category: "Enemies & Creatures",
    type: "Boss",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["boss", "fishing", "rare bait", "water"],
    summary: "A boss spawned by rare bait.",
    fields: {
      "Gameplay Concept":
        "Ties fishing, rare ingredients, water areas, and boss encounters together."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Kap's Pond"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Fishing System", "Combat System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Whisken People",
    category: "Story",
    type: "Faction / Culture",
    status: "Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["Whisken", "cat people", "culture", "Tabby Island", "Triadic faith"],
    summary:
      "Cat-like people connected to Tabby Island, Whisker Woods, tavern culture, food, hunting, farming, fishing, community, and the Triadic faith.",
    internalLore:
      "The Whisken people originally lived on Tabby Island. In ancient times, Whisken seekers created the Cat Cauldron while looking for ways to improve food and achieve knowledge of what is untasted. The Cat Cauldron caused Tabby Island to decay, triggering the first exodus. The ancient Whisken locked it away beneath the island, removed it from their history books, stopped talking about it, and eventually forgot it. By the time later Whisken returned to Tabby Island, the first exodus had fallen out of memory. After Tohm Kyatt reactivated the Cat Cauldron and fled with it, the island started decaying again. Before the Whisken understood what was happening, the Mas'eel arrived pretending to be traders, introduced new foods, gained power in the village over years, and began persecuting the Whisken for believing in the Triadic faith taught by the Tablemaker. The Whisken fled again, though to them it felt like the first time. Tohm heard what was happening and got Lel Kai, who was becoming general of the faery army, to send boats. The corruption scattered many boats, and the known survivors became the current Whisken who live in Whisker Woods and Whisken Village.",
    fields: {
      Faith: "The Whisken follow the Tablemaker and the Triadic faith.",
      "Faith Practice":
        "Like most races, they believe in the same God and faith but practice it through their own traditions.",
      "Known Refugees": "The current Whisken in Whisker Woods / Whisken Village are the known survivors.",
      "Canon Name": "Whisken"
    },
    connections: {
      characters: ["Tohm Kyatt", "Lel Kai"],
      locations: ["Whisker Woods", "Tabby Island", "Whisken Village"],
      recipes: [],
      quests: [],
      items: ["Cat Cauldron"],
      factions: ["Mas'eel Cult"],
      secrets: [
        "Secret: Tohm Awakened the Cat Cauldron",
        "Secret: Cat Cauldron Beneath Tabby Island",
        "Secret: Mas'eel Infiltrated Tabby Island"
      ],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: [
        "First Whisken Exodus",
        "Cat Cauldron Is Buried and Forgotten",
        "Tohm Awakens the Cat Cauldron",
        "Mas'eel Infiltrate Tabby Island",
        "Second Whisken Exodus",
        "Survivors Reach Whisker Woods"
      ]
    }
  }),
  entry({
    title: "Faery Kingdom",
    category: "Story",
    type: "Faction",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["faery", "magic", "humans", "world balance"],
    summary:
      "The faeries are magical allies of the human royal family but refuse to help give humans magic.",
    internalLore:
      "The faeries fear that if humans gain magic, they will become too powerful and potentially dominate or destroy everything. Their refusal pushes the king toward desperate measures, including the war with the dwarves.",
    connections: {
      characters: ["Princess Lillia", "King", "Queen", "Lel Kai"],
      locations: ["Faery Realm"],
      recipes: ["Dark Culinary Arts"],
      quests: [],
      items: [],
      factions: ["Human Kingdom"],
      secrets: ["Secret: Faeries Refused Human Magic"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: ["Faeries Refuse to Help"]
    }
  }),
  entry({
    title: "Human Kingdom",
    category: "Story",
    type: "Faction",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["humans", "king", "queen", "Lillia", "magic"],
    summary:
      "The kingdom ruled by Lillia's parents. Humans are already dominant, and gaining magic would threaten the world balance.",
    connections: {
      characters: ["Princess Lillia", "King", "Queen"],
      locations: ["Human Kingdom / Royal Castle"],
      recipes: [],
      quests: [],
      items: ["Dragon Knife"],
      factions: ["Faery Kingdom", "Dwarven Kingdom"],
      secrets: ["Secret: Faeries Refused Human Magic", "Secret: King's Obsession Caused War"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Dwarven Kingdom",
    category: "Story",
    type: "Faction",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["dwarves", "dragon knife", "war"],
    summary:
      "The dwarves possessed the dragon knife before the human king took it through war.",
    connections: {
      characters: ["King", "Princess Lillia"],
      locations: ["Dwarven Mountains"],
      recipes: [],
      quests: [],
      items: ["Dragon Knife"],
      factions: ["Human Kingdom"],
      secrets: ["Secret: King's Obsession Caused War"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: ["King Takes the Dragon Knife"]
    }
  }),
  entry({
    title: "Mas'eel Cult",
    category: "Story",
    type: "Faction / Cult",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["cult", "FEAST", "triad", "corruption", "world mythology", "Tabby Island", "Princess Lillia"],
    summary: "A cult that perverts the Triadic faith into FEAST and hunts the Cat Cauldron and Tohm's magical recipes.",
    internalLore:
      "The core world faith is the Triadic faith of Passion, Taste, and Love. The Mas'eel Cult corrupts this into FEAST. Their symbol is a single distorted dot or eye, opposing the three dots of the triad. When Tohm activated the Cat Cauldron on Tabby Island, the pulse let the Mas'eel sense its power and know it was on the island. Cultists sailed there pretending to be traders, introduced new foods, and spent years secretly searing the island, gaining power inside the Whisken village, and persecuting Whisken people for believing in the Triadic faith taught by the Tablemaker. After the second exodus, the Mas'eel left Tabby Island and began searching for the Cat Cauldron and Tohm's magical recipes while working with Princess Lillia.",
    fields: {
      "Doctrine": "FEAST, a distorted compression of Passion, Taste, and Love into consumption and control.",
      "Symbol": "One distorted dot or eye, opposing the three-dot Triadic symbol.",
      "Tactics": "False trade, new foods, gentle language, slow influence, searing corruption, and faith persecution.",
      "Possible Influence": "Leirbag is Notion-sourced and needs review before becoming hard canon."
    },
    connections: {
      characters: ["Princess Lillia", "Tohm Kyatt", "Mur'amar"],
      locations: ["Tabby Island", "Whisker Woods", "Lillia's Camp"],
      recipes: ["Dark Culinary Arts", "Magical Meals", "False Trader Spice"],
      quests: [],
      items: ["Cat Cauldron", "Tohm's Recipe Book", "Recipe Pages"],
      factions: ["Whisken People"],
      secrets: ["Secret: Mas'eel Infiltrated Tabby Island", "Secret: Tohm Awakened the Cat Cauldron"],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: [],
      timelineEvents: ["Mas'eel Sense the Cat Cauldron", "Mas'eel Infiltrate Tabby Island", "Second Whisken Exodus"]
    }
  }),
  entry({
    title: "Mur'amar",
    category: "Characters",
    type: "Character",
    status: "Soft Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["Mas'eel", "cult agent", "Swan of Peace", "deception"],
    summary:
      "Mur'amar is a Mas'eel-linked figure whose name spelling is canonical as Mur'amar.",
    internalLore:
      "Mur'amar is tied to the Mas'eel Cult and should use this spelling going forward. He can present himself as peaceful or benevolent while still serving the cult's search for the Cat Cauldron and Tohm's magical recipes. Notion lore has him moving among Whisken villagers as if he belongs and speaking to Gwen about the Mas'eel faith as something gentle. He may wear or carry Mas'eel signs openly because the current Whisken do not understand what the symbol means.",
    fields: {
      "Canon Name": "Mur'amar",
      "Faction Link": "Mas'eel Cult",
      "Public Mask": "Gentle stranger / Swan of Peace figure.",
      "Questions He Asks": "Cat Cauldron, Tohm's recipes, and what Gwen knows about magical cooking."
    },
    connections: {
      characters: ["Princess Lillia", "Tohm Kyatt", "Gwen"],
      locations: ["Tabby Island", "Whisker Woods", "Whisken Village", "Lillia's Camp"],
      recipes: ["Dark Culinary Arts", "False Trader Spice"],
      quests: [],
      items: ["Cat Cauldron", "Tohm's Recipe Book", "Recipe Pages"],
      factions: ["Mas'eel Cult"],
      secrets: ["Secret: Mas'eel Infiltrated Tabby Island"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: ["Mas'eel Infiltrate Tabby Island"]
    }
  }),
  entry({
    title: "Cat Cauldron",
    category: "Food & Inventory",
    type: "Artifact",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["artifact", "cauldron", "Tabby Island", "Tohm", "Whisken", "Mas'eel", "disaster"],
    summary:
      "An ancient Whisken cauldron created to improve food and discover what is untasted, later awakened by Tohm and hunted by the Mas'eel Cult.",
    internalLore:
      "The ancient Whisken created the Cat Cauldron while looking for ways to improve food and achieve knowledge of what is untasted. Its power caused Tabby Island to begin decaying, creating the first exodus. The Whisken locked it away at the bottom of the island, removed it from their history books, and stopped talking about it until it was forgotten. Tohm later discovered the hidden knowledge, returned to Tabby Island, cooked a meal in the Cat Cauldron, and activated it. The cauldron released a large pulse into the earth, causing Tabby Island to decay again and letting the Mas'eel Cult sense its power. Tohm took the Cat Cauldron and fled in the Living Tavern without anyone knowing. Important: Tohm never drinks from the cauldron.",
    wiki: {
      itemType: "Artifact",
      rarity: "Legendary",
      whereToFind: "Originally buried beneath Tabby Island; later taken by Tohm in the Living Tavern.",
      gameplayUse: "Major lore artifact, disaster source, and object hunted by the Mas'eel Cult.",
      loreDescription:
        "A dangerous ancient Whisken cauldron tied to Tohm's guilt, Tabby Island's decay, and the Mas'eel hunt for magical recipes."
    },
    connections: {
      characters: ["Tohm Kyatt"],
      locations: ["Tabby Island"],
      recipes: ["Magical Meals"],
      quests: [],
      items: [],
      factions: ["Whisken People", "Mas'eel Cult"],
      secrets: [
        "Secret: Cat Cauldron Beneath Tabby Island",
        "Secret: Tohm Awakened the Cat Cauldron",
        "Secret: Tohm Never Drinks From The Cauldron"
      ],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: [
        "Ancient Whisken Create the Cat Cauldron",
        "First Whisken Exodus",
        "Cat Cauldron Is Buried and Forgotten",
        "Tohm Awakens the Cat Cauldron",
        "Mas'eel Sense the Cat Cauldron"
      ]
    }
  }),
  entry({
    title: "Dragon Knife",
    category: "Food & Inventory",
    type: "Artifact",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["artifact", "knife", "dwarves", "Lillia", "Tohm"],
    summary:
      "A magical knife originally possessed by the dwarves, later taken by the human king and used in the chain of events that gave Lillia powers.",
    internalLore:
      "The king took the dragon knife after declaring war on the dwarves. Tohm gained access to it through the royal setup / cooking contest and used it in preparing magical ingredients. It became a key tool in creating the unstable magical dish Lillia consumed.",
    wiki: {
      itemType: "Artifact",
      rarity: "Legendary",
      whereToFind: "Originally held by the dwarves; later taken by the human king.",
      gameplayUse: "Magical cooking catalyst and story artifact.",
      loreDescription:
        "A magical knife that helped make the unstable dish that changed Lillia."
    },
    connections: {
      characters: ["King", "Princess Lillia", "Tohm Kyatt"],
      locations: ["Dwarven Mountains", "Human Kingdom / Royal Castle"],
      recipes: ["Magical Meals"],
      quests: [],
      items: [],
      factions: ["Dwarven Kingdom", "Human Kingdom"],
      secrets: ["Secret: King's Obsession Caused War"],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: ["King Takes the Dragon Knife", "Tohm Gains Access to Dragon Knife"]
    }
  }),
  entry({
    title: "Tohm's Recipe Book",
    category: "Food & Inventory",
    type: "Artifact",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["artifact", "recipe book", "Tohm", "Lillia", "pages"],
    summary:
      "Tohm's complex magical recipe book. Lillia tears out several pages from it.",
    internalLore:
      "The recipes are too complex for even Tohm to fully memorize. Lillia attempts to steal the book but only tears out several pages when Tohm snatches it back. These recipe pages become the basis for boss powers and Gwen's progression.",
    wiki: {
      itemType: "Artifact",
      rarity: "Legendary",
      gameplayUse: "Source of recipe pages, boss powers, and Gwen's progression.",
      loreDescription: "A magical recipe book too complex for even Tohm to fully memorize."
    },
    connections: {
      characters: ["Tohm Kyatt", "Princess Lillia", "Gwen"],
      locations: [],
      recipes: ["Magical Meals", "Dark Culinary Arts"],
      quests: ["Recover Recipe Pages"],
      items: ["Recipe Pages"],
      factions: [],
      secrets: ["Secret: Lillia Tore Recipe Pages"],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: ["Lillia Tears Out Recipe Pages"]
    }
  }),
  entry({
    title: "Recipe Pages",
    category: "Food & Inventory",
    type: "Artifact / Collectible",
    status: "Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["artifact", "collectible", "recipe pages", "bosses", "progression"],
    summary:
      "Torn pages from Tohm's recipe book that grant or explain magical powers.",
    internalLore:
      "Gwen retrieves recipe pages by defeating bosses. Each page may unlock a new magical meal, combat power, or progression ability.",
    wiki: {
      itemType: "Artifact / Collectible",
      rarity: "Rare",
      gameplayUse: "Unlocks magical meals, combat powers, or progression abilities.",
      loreDescription: "Torn pages from Tohm's recipe book with dangerous magical knowledge."
    },
    connections: {
      characters: ["Gwen", "Princess Lillia", "Tohm Kyatt"],
      locations: [],
      recipes: ["Magical Meals", "Dark Culinary Arts"],
      quests: ["Recover Recipe Pages"],
      items: ["Tohm's Recipe Book"],
      factions: [],
      secrets: ["Secret: Lillia Tore Recipe Pages"],
      gameplaySystems: ["Cooking System", "Meal Slot Wheel"],
      enemies: ["Ice Queen", "Magical Boar Boss", "Aquatic Monster Boss"],
      timelineEvents: ["Lillia Tears Out Recipe Pages"]
    }
  }),
  entry({
    title: "Living Chicken Tavern",
    category: "World",
    type: "Artifact / Location / Creature",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["living tavern", "chicken legs", "Tohm", "workshop"],
    summary:
      "A living tavern with chicken legs that becomes Tohm's home/workshop.",
    internalLore:
      "Tohm discovers or partners with a living tavern with chicken legs in a distant barren land or during his post-disaster journey. During the Lillia incident, the tavern suddenly stands up, causing Lillia to fall and allowing Tohm to snatch the recipe book back.",
    connections: {
      characters: ["Tohm Kyatt", "Princess Lillia", "Gwen"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: ["Tohm's Recipe Book"],
      factions: [],
      secrets: ["Secret: Lillia Tore Recipe Pages"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: ["Lillia Tears Out Recipe Pages"]
    }
  }),
  entry({
    title: "Gwen's Basket",
    category: "Food & Inventory",
    type: "Inventory Item / UI",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["inventory", "basket", "Gwen", "UI"],
    summary:
      "Gwen's inventory is represented by a basket. When the inventory opens, the camera zooms in and Gwen rummages through it.",
    internalLore:
      "Redesign inventory as a top-down view into the basket with inventory slots inside it. The crafting menu could pop out to the left of Gwen while the inventory appears on the right.",
    wiki: {
      itemType: "Inventory Item / UI",
      rarity: "Core",
      gameplayUse: "Inventory framing and character animation moment.",
      loreDescription: "Gwen's personal basket, used as a playful inventory metaphor."
    },
    connections: {
      characters: ["Gwen"],
      locations: [],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Inventory System", "Crafting System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Cooking System",
    category: "Gameplay Systems",
    type: "System",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["cooking", "ingredients", "meals", "cauldron", "frying"],
    summary:
      "The main gameplay system where players gather ingredients, prepare them, cook meals, and use meals for buffs, powers, and progression.",
    internalLore:
      "Players can slice, chop, crush, boil, fry, brew, and combine ingredients. Prepared ingredients become new inventory items, such as sliced potato or pan-fried meat. Some ingredients only work with certain prep stations. For example, bread cannot be boiled, meat cannot be crushed, etc. Cauldron task: the player drags valid ingredients into the cauldron and stirs slowly as it boils. Mixing ingredients creates different outcomes, such as Cray Broth or Veggie Broth. Frying task: the player drags valid mostly chopped/sliced ingredients into the pan, waits until the food browns on one side, then holds and drags upward quickly to flip. The pan itself should move during the flip and the object should bounce up and back into the pan. Then the player drags right to remove it and add it to inventory.",
    connections: {
      characters: ["Gwen", "Tohm Kyatt"],
      locations: [],
      recipes: ["Magical Meals", "Cray Broth", "Veggie Broth"],
      quests: ["Opening Grocery Quest"],
      items: ["Recipe Pages"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Inventory System", "Meal Slot Wheel"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Meal Slot Wheel",
    category: "Gameplay Systems",
    type: "System",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["meal wheel", "combat", "buffs", "ultimate abilities"],
    summary:
      "After cooking a meal, Gwen can access a meal slot wheel and consume meals mid-battle for temporary powers, stat boosts, and ultimate abilities.",
    connections: {
      characters: ["Gwen"],
      locations: [],
      recipes: ["Magical Meals"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Combat System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Crafting System",
    category: "Gameplay Systems",
    type: "System",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["crafting", "tools", "gathering", "upgrades"],
    summary: "Gwen can craft tools and items from gathered resources.",
    internalLore:
      "Tools: axe for wood/trees, pickaxe for stone/crystals, sickle for grass/bushes with swords also able to gather some but sickles giving better yield, shovel for dirt mounds/root vegetables, slingshot for fruit trees or distant gathering, torch with durability for dark areas, glowglob lantern as a waist-light made from processed resources. Tools should have linear upgrades such as wood, stone, iron, magical, etc.",
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [
        "Craft a Pickaxe Tutorial",
        "Craft a Slingshot Tutorial",
        "Craft a Shovel Tutorial",
        "Cave Entrance Tutorial"
      ],
      items: ["Gwen's Basket"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Inventory System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Inventory System",
    category: "Gameplay Systems",
    type: "System",
    status: "Needs Rewrite",
    spoilerLevel: "No Spoiler",
    tags: ["inventory", "basket", "UI", "prepared ingredients"],
    summary:
      "Inventory appears beside Gwen as the camera zooms in and Gwen rummages through her basket.",
    internalLore:
      "Redesign as a top-down basket UI with inventory slots inside the basket. Newly prepared ingredients should go into the next available empty slot so players can easily identify what they just made.",
    connections: {
      characters: ["Gwen"],
      locations: [],
      recipes: [],
      quests: [],
      items: ["Gwen's Basket"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Crafting System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Quest System",
    category: "Gameplay Systems",
    type: "System",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["quests", "dialogue", "objectives", "Story Framework 5"],
    summary:
      "The game uses a quest tracker with objectives, dialogue, inventory checks, and quest states.",
    internalLore:
      "The project uses Story Framework 5 from FAB for quests, dialogue, interaction, and HasItem inventory checks.",
    connections: {
      characters: ["Gwen"],
      locations: [],
      recipes: [],
      quests: ["Opening Grocery Quest", "Kap's Pond Rescue", "Recover Recipe Pages"],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Combat System",
    category: "Gameplay Systems",
    type: "System",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["combat", "sword", "bow", "buttons", "meals"],
    summary:
      "Gwen fights using a sword and bow mapped directly to buttons without needing to switch in the inventory.",
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: ["Magical Meals"],
      quests: ["Kap's Pond Rescue"],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Meal Slot Wheel"],
      enemies: ["Prawnhusk", "Ice Queen", "Boar"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Day / Night and Seasons",
    category: "Gameplay Systems",
    type: "System",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["calendar", "day night", "seasons", "weather", "materials"],
    summary:
      "The game has a year-round calendar with day/night cycle, seasons, weather, and dynamic visual changes.",
    internalLore:
      "Seasonal swaps can change colors, materials, particles, foliage, and available resources.",
    connections: {
      characters: [],
      locations: ["Whisker Woods", "Firefly Meadow"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: [],
      enemies: ["Were-Dog NPC Boss"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Slime Flavor / Element System",
    category: "Gameplay Systems",
    type: "System",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["slimes", "flavor", "elements", "ingredients"],
    summary:
      "Slimes connect flavor profiles, ingredients, and elements. Elements are tied to flavor profiles rather than generic elemental categories.",
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: ["Slime Substitutions", "Ales / Tonics"],
      quests: [],
      items: ["Strawberry Slime Gel", "Blueberry Slime Gel", "Dark Slime Essence"],
      factions: [],
      secrets: ["Secret: Slimes Born From Nutrients Or Corruption"],
      gameplaySystems: [],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Charm System",
    category: "Gameplay Systems",
    type: "System",
    status: "Soft Canon",
    spoilerLevel: "No Spoiler",
    tags: ["charms", "progression", "combat", "exploration"],
    summary: "Players can find, buy, or win charms and equip up to 3 at a time.",
    internalLore:
      "Examples: Leecher's Stone attacks heal you for 5% of the damage dealt. Striker's Ring attacks deal 20% more damage. Other ideas: increased speed, two dashes, heal when dashing, chance enemies heal you when killed, faster ranged attack speed, auto-pick vegetable charm.",
    connections: {
      characters: ["Gwen"],
      locations: [],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Combat System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  ...([
    {
      title: "The Tablemaker",
      category: "Characters",
      type: "Divine Figure",
      status: "Canon",
      spoilerLevel: "Minor Spoiler",
      tags: ["Tablemaker", "Master Chef", "Triadic faith", "Food Essence", "Everfeast"],
      summary:
        "The Tablemaker is the canonical divine figure of the setting, also called the Master Chef, whose meal ended the 300 Year War.",
      internalLore:
        "The Tablemaker arrived during the final years of the 300 Year War between Ovenhold and the Faery Realm. He came not as a soldier, king, or mage, but as one who could prepare a table for enemies. His final meal perfectly contained Passion, Taste, and Love. It ended the war, cost him his mortal life, and released Food Essence into the world before his spirit returned to The Everfeast. The Master Chef is another name for him, not a separate being.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        Aliases: "The Master Chef",
        "Sacred Principles": "Passion, Taste, Love",
        "Sacred Realm": "The Everfeast",
        "World Impact": "Ended the 300 Year War and made magical cooking sacred."
      },
      connections: {
        characters: ["Tohm Kyatt"],
        locations: ["Ovenhold", "Faery Realm", "The Everfeast"],
        recipes: ["Festival of Full Plates"],
        factions: ["Whisken People", "Mas'eel Cult"],
        items: ["Food Essence"],
        timelineEvents: ["The Tablemaker's Arrival", "The Meal That Ended the War"]
      }
    },
    {
      title: "The Cat Cauldron",
      category: "Characters",
      type: "Sentient Artifact Character",
      status: "Canon",
      spoilerLevel: "Major Spoiler",
      tags: ["sentient cauldron", "Cat Cauldron", "cooking station", "Whisken", "Tohm"],
      summary:
        "The Cat Cauldron is a sentient cooking station and character tied to broth, meal finalization, Whisken history, and Tohm's hidden disaster.",
      internalLore:
        "The Cat Cauldron should be tracked as both an artifact and a character. In gameplay terms, it is the sentient cauldron used for broth bases, simmered meals, and certain final meal steps. In lore, ancient Whisken created it while seeking better food and the knowledge of what is untasted. Its awakening caused pulses of decay on Tabby Island and drew the Mas'eel Cult's attention after Tohm cooked in it.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Gameplay Role": "Cooking station for broths, meal finalization, and magical recipe moments.",
        "Character Role": "Sentient artifact companion / dangerous lore witness.",
        "Canon Link": "Same entity as the Cat Cauldron artifact entry."
      },
      connections: {
        characters: ["Tohm Kyatt", "Gwen"],
        locations: ["Tabby Island", "The Living Tavern"],
        recipes: ["Cat Cauldron Broth Base", "Magical Meals"],
        factions: ["Whisken People", "Mas'eel Cult"],
        items: ["Cat Cauldron"],
        secrets: ["Secret: Cat Cauldron Beneath Tabby Island", "Secret: Tohm Awakened the Cat Cauldron"],
        timelineEvents: ["Ancient Whisken Create the Cat Cauldron", "Tohm Awakens the Cat Cauldron"]
      }
    },
    {
      title: "Mona the Orchardist",
      category: "Characters",
      type: "Whisken Villager",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["Whisken", "villager", "orchardist", "Whisken Village", "Momon"],
      summary:
        "Mona is a reserved young Whisken orchardist who loves her family but dreams of seeing the world beyond Whisken Village.",
      internalLore:
        "Mona is connected to Whisken Village's orchards and food-gathering culture. She is quiet and thoughtful, often keeping her thoughts to herself. She loves her family and village, but dreams of exploring the world beyond Whisker Woods. Her orchard work makes her a natural link between pantry ingredients, village routines, and Gwen's early gathering quests.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Village Role": "Orchardist / produce source",
        "Family": "Daughter of Momon",
        "Story Use": "Can introduce fruit, harvest timing, and the emotional cost of staying versus leaving."
      },
      connections: {
        characters: ["Momon", "Gwen", "Kap"],
        locations: ["Whisken Village", "Whisker Woods"],
        recipes: ["Festival of Full Plates", "Whisken Hearth Stew"],
        factions: ["Whisken People"],
        items: ["Moonlit Dew", "Whisken Root Ferment"]
      }
    },
    {
      title: "Momon",
      category: "Characters",
      type: "Whisken Villager",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["Whisken", "villager", "farmer", "Whisken Village", "Mona"],
      summary:
        "Momon is a hardworking Whisken farmer who passes down agricultural knowledge and anchors village food production.",
      internalLore:
        "Momon works the Whisken Village farm and treats food production as both survival and tradition. He understands Mona's longing for the wider world, but his own life is rooted in the land, the harvest, and keeping the village fed after the exodus.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Village Role": "Farmer / agricultural teacher",
        "Family": "Father of Mona",
        "Story Use": "Can explain fields, harvest ingredients, and practical Whisken food customs."
      },
      connections: {
        characters: ["Mona the Orchardist", "Gwen"],
        locations: ["Whisken Village", "Whisker Woods"],
        recipes: ["Whisken Hearth Stew", "Festival of Full Plates"],
        factions: ["Whisken People"],
        items: ["Potato", "Turnip", "Boga"]
      }
    },
    {
      title: "Lady Kiko",
      category: "Characters",
      type: "Whisken Villager",
      status: "Soft Canon",
      spoilerLevel: "Minor Spoiler",
      tags: ["Whisken", "village leader", "protector", "community", "Triadic faith"],
      summary:
        "Lady Kiko is a guiding Whisken presence associated with unity, protection, and the heart of Whisken Village.",
      internalLore:
        "Lady Kiko is remembered as a mysterious but trusted presence in Whisken Village. She can function as a protector, mediator, or cultural guide who helps express Whisken unity, the Festival of Full Plates, and the quiet practice of the Triadic faith through food and community.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Village Role": "Protector / community guide",
        "Faith Link": "Triadic faith practiced through food, hospitality, and protection.",
        "Story Use": "Can help Gwen understand Whisken customs and village stakes."
      },
      connections: {
        characters: ["Gwen", "Kap", "Mona the Orchardist", "Momon"],
        locations: ["Whisken Village"],
        recipes: ["Festival of Full Plates"],
        factions: ["Whisken People"]
      }
    },
    {
      title: "Ovenhold",
      category: "World",
      type: "Kingdom / Ancient Culture",
      status: "Canon",
      spoilerLevel: "No Spoiler",
      tags: ["Ovenhold", "ancient history", "hearths", "300 Year War", "Tablemaker"],
      summary:
        "Ovenhold is an ancient mortal kingdom of hearths, ovens, labor, survival, craft, and cooked food.",
      internalLore:
        "Ovenhold stood opposite the Faery Realm during the 300 Year War. It represents mortal craft, hearth work, cooked food, endurance, and the stubborn labor of survival. Its conflict with the Faery Realm ended only when the Tablemaker prepared the meal that neither side could refuse.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Story Era": "Ancient History",
        "Core Imagery": "Hearths, ovens, stone kitchens, craft, smoke, bread, labor.",
        "Conflict": "Fought the Faery Realm for 300 years."
      },
      connections: {
        characters: ["The Tablemaker"],
        locations: ["Faery Realm"],
        recipes: ["Festival of Full Plates"],
        factions: ["Faery Kingdom"],
        timelineEvents: ["The 300 Year War", "The Meal That Ended the War"]
      }
    },
    {
      title: "The Everfeast",
      category: "World",
      type: "Sacred Realm",
      status: "Canon",
      spoilerLevel: "Minor Spoiler",
      tags: ["Everfeast", "Tablemaker", "Food Essence", "sacred realm"],
      summary:
        "The Everfeast is the heavenly culinary realm where the Tablemaker returned after his sacrifice.",
      internalLore:
        "The Everfeast preserves meals in their perfect form. After the Tablemaker's final meal ended the 300 Year War and cost him his mortal life, his spirit returned to The Everfeast. Before returning, he released Food Essence into the world, making meals and magical cooking sacred.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Realm Type": "Heavenly culinary realm",
        "Connected Figure": "The Tablemaker",
        "Story Use": "Ancient faith, myth, and magical cooking origin."
      },
      connections: {
        characters: ["The Tablemaker", "Tohm Kyatt"],
        locations: ["Ovenhold", "Faery Realm"],
        items: ["Food Essence"],
        timelineEvents: ["The Meal That Ended the War"]
      }
    },
    {
      title: "Food Essence",
      category: "Food & Inventory",
      type: "Culinary Magic System",
      status: "Canon",
      spoilerLevel: "Minor Spoiler",
      tags: ["Food Essence", "Tablemaker", "magical cooking", "Passion", "Taste", "Love"],
      summary:
        "Food Essence is the sacred culinary force released into the world by the Tablemaker after the meal that ended the 300 Year War.",
      internalLore:
        "Food Essence is not a normal ingredient. It is the spiritual and magical foundation that makes meals sacred and allows culinary magic to matter. It entered the world after the Tablemaker's final meal and is tied to Passion, Taste, and Love. Dark Culinary Arts and Mas'eel FEAST doctrine are corruptions or distortions of what Food Essence is meant to be.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Not A Pantry Ingredient": "Track as a magic system, not a cookable item.",
        "Core Principles": "Passion, Taste, Love",
        "Corrupted By": "Dark Culinary Arts, Mas'eel FEAST doctrine"
      },
      connections: {
        characters: ["The Tablemaker", "Tohm Kyatt", "Princess Lillia"],
        locations: ["The Everfeast"],
        recipes: ["Magical Meals", "Festival of Full Plates"],
        factions: ["Mas'eel Cult"],
        gameplaySystems: ["Cooking System", "Slime Flavor / Element System"]
      }
    },
    {
      title: "Whisken Saints",
      category: "Story",
      type: "Religious / Cultural Lore",
      status: "Needs Rewrite",
      spoilerLevel: "Minor Spoiler",
      tags: ["Whisken", "saints", "Tablemaker", "Triadic faith", "culture"],
      summary:
        "A Whisken cultural thread about holy figures and old teachers who helped shape the people into a hearth-centered culture.",
      internalLore:
        "The Whisken Saints material should be organized as cultural lore rather than treated as a separate religion. It frames older Whisken history as a movement from tooth, instinct, hunger, and isolation toward hearth, table, mercy, and shared food. It should harmonize with the wider Tablemaker faith and the Three Pillars of Love, Passion, and Taste.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Needs Rewrite": "Keep the useful cultural shape, but reconcile it with current Cat Cauldron and Tablemaker canon.",
        "Culture Use": "Stories told around tavern fires, harvests, and feast days.",
        "Faith Link": "Triadic faith under the Tablemaker."
      },
      connections: {
        characters: ["The Tablemaker", "Lady Kiko"],
        locations: ["Tabby Island", "Whisken Village"],
        recipes: ["Festival of Full Plates", "Healthy Ale"],
        factions: ["Whisken People"],
        timelineEvents: ["Tablemaker Stories Inspire Tohm"]
      }
    },
    {
      title: "Mas'eel False Traders",
      category: "Story",
      type: "Villain Operation",
      status: "Canon",
      spoilerLevel: "Major Spoiler",
      tags: ["Mas'eel", "false traders", "Tabby Island", "Whisken", "FEAST"],
      summary:
        "Mas'eel cultists came to Tabby Island pretending to be traders, using food and trust to gain power over the Whisken.",
      internalLore:
        "After Tohm awakened the Cat Cauldron, the Mas'eel sensed its power and sailed to Tabby Island disguised as traders. They introduced new foods, built trust over years, secretly seared the island, gained influence in Whisken village ranks, and persecuted Whisken people for following the Triadic faith taught by the Tablemaker.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Cover Story": "Traders bringing new foods.",
        "True Goal": "Find the Cat Cauldron and Tohm's magical recipes.",
        "Current Link": "Now connected to Princess Lillia."
      },
      connections: {
        characters: ["Mur'amar", "Princess Lillia", "Tohm Kyatt"],
        locations: ["Tabby Island", "Whisken Village"],
        recipes: ["False Trader Spice", "Dark Culinary Arts"],
        factions: ["Mas'eel Cult", "Whisken People"],
        items: ["Cat Cauldron", "Tohm's Recipe Book", "Recipe Pages"],
        secrets: ["Secret: Mas'eel Infiltrated Tabby Island"],
        timelineEvents: ["Mas'eel Sense the Cat Cauldron", "Mas'eel Infiltrate Tabby Island"]
      }
    },
    {
      title: "Lel Kai's Rescue Fleet",
      category: "Story",
      type: "Story Event",
      status: "Canon",
      spoilerLevel: "Major Spoiler",
      tags: ["Lel Kai", "Whisken", "Tabby Island", "rescue", "second exodus"],
      summary:
        "Tohm asks Lel Kai to send boats to rescue the Whisken from Tabby Island during the second exodus.",
      internalLore:
        "When Tohm hears what is happening on Tabby Island, he gets his friend Lel Kai, who is becoming general of the faery army, to gather boats and save as many Whisken as possible. The island's corruption is already severe, scattering many boats. The known survivors become the Whisken who now live in Whisker Woods and Whisken Village.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Known Survivors": "Current Whisken in Whisker Woods / Whisken Village.",
        "Complication": "Corruption scatters many rescue boats.",
        "Story Function": "Explains why the current village is incomplete, displaced, and haunted by missing kin."
      },
      connections: {
        characters: ["Tohm Kyatt", "Lel Kai", "Lady Kiko", "Kap"],
        locations: ["Tabby Island", "Whisker Woods", "Whisken Village"],
        factions: ["Whisken People", "Faery Kingdom", "Mas'eel Cult"],
        timelineEvents: ["Second Whisken Exodus", "Survivors Reach Whisker Woods"]
      }
    },
    {
      title: "Lillia's Camp",
      category: "World",
      type: "Enemy Camp / Location",
      status: "Soft Canon",
      spoilerLevel: "Major Spoiler",
      tags: ["Lillia", "Faery Realm", "Dark Culinary Arts", "Mas'eel"],
      summary:
        "Lillia's camp in the Faery Realm lets her use ambient magic to mass-produce Dark Culinary Arts.",
      internalLore:
        "Lillia camps in the Faery Realm because the ambient magic allows her to produce corrupted meals at scale instead of infusing each dish one at a time. The Mas'eel connection gives this camp a broader villain network: Lillia wants power and magical transformation, while the Mas'eel hunt for the Cat Cauldron and Tohm's recipes.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Gameplay Role": "Late-story enemy production site and corrupted food source.",
        "Villain Link": "Princess Lillia and the Mas'eel Cult."
      },
      connections: {
        characters: ["Princess Lillia", "Mur'amar"],
        locations: ["Faery Realm"],
        recipes: ["Dark Culinary Arts"],
        factions: ["Mas'eel Cult"]
      }
    },
    {
      title: "Leirbag",
      category: "Story",
      type: "Dark Angel / Mas'eel Influence",
      status: "Needs Rewrite",
      spoilerLevel: "Major Spoiler",
      tags: ["Mas'eel", "dark angel", "FEAST", "Needs Review"],
      summary:
        "Leirbag is a Notion-sourced Mas'eel influence that should be reviewed before becoming hard canon.",
      internalLore:
        "Notion lore says the Mas'eel Cult's skewed view of the Tablemaker was inspired by a Dark Angel called Leirbag. Keep this as a review slot rather than fully resolved canon until its role, origin, and relationship to the Tablemaker faith are clarified.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        "Canon Status": "Needs review",
        "Possible Role": "Origin or corrupter of Mas'eel FEAST doctrine.",
        "Do Not Confuse With": "Discarded older mythic names are not canon."
      },
      connections: {
        factions: ["Mas'eel Cult"],
        recipes: ["Dark Culinary Arts"],
        timelineEvents: ["Mas'eel Infiltrate Tabby Island"]
      }
    },
    {
      title: "Festival of Full Plates",
      category: "Food & Inventory",
      type: "Tavern Feast / Meal",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["Whisken", "festival", "feast", "Triadic faith", "community"],
      summary:
        "A yearly Whisken feast celebrating balance, gratitude, remembrance, and the promise that no plate should go empty.",
      internalLore:
        "The Festival of Full Plates is a Whisken celebration of balance, gratitude, remembrance, and shared food. It ties the village's tavern culture to the Tablemaker's Triadic faith. This should stay distinct from the Mas'eel corruption of FEAST: the festival fills plates to share, while FEAST hoards and consumes.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryMealGroup: "tavern-meals",
        ingredientsRequired: "Whisken Hearth Stew, Healthy Ale, Potato, Turnip, Specialty Herbs",
        "Faith Meaning": "Shared abundance under Passion, Taste, and Love."
      },
      connections: {
        characters: ["Lady Kiko", "Mona the Orchardist", "Momon", "Kap"],
        locations: ["Whisken Village"],
        factions: ["Whisken People"],
        recipes: ["Whisken Hearth Stew", "Healthy Ale"],
        items: ["Potato", "Turnip", "Specialty Herbs"]
      }
    },
    {
      title: "Healthy Ale",
      category: "Food & Inventory",
      type: "Ale Recipe",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["ale", "Whisken", "Oswin", "drink", "buff"],
      summary:
        "A famous Whisken ale invented by Oswin; despite the name, it is still not especially healthy.",
      internalLore:
        "Healthy Ale is a village-famous drink tied to Oswin's odd remedies and Whisken brewing culture. It can be funny, useful, and slightly suspect: villagers rely on Oswin, but the drink's name should not be taken too literally.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryMealGroup: "ales",
        ingredientsRequired: "Whisken Root Ferment, Moonlit Dew, Specialty Herbs",
        gameplayEffect: "Possible stamina, warmth, or light recovery buff with comedic side effects.",
        "Invented By": "Oswin"
      },
      connections: {
        characters: ["Oswin", "Gwen"],
        locations: ["Whisken Village"],
        factions: ["Whisken People"],
        items: ["Whisken Root Ferment", "Moonlit Dew", "Specialty Herbs"]
      }
    },
    {
      title: "Whisken Hearth Stew",
      category: "Food & Inventory",
      type: "Tavern Meal Recipe",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["recipe", "Whisken", "stew", "tavern meal", "community"],
      summary:
        "A hearty Whisken village stew built from roots, herbs, broth, and whatever the village can safely gather.",
      internalLore:
        "Whisken Hearth Stew is a practical village meal and a good starter recipe slot for the Pantry. It can represent the Whisken instinct to feed everyone first, especially after displacement and scattered rescue boats made food security a sacred concern.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryMealGroup: "tavern-meals",
        ingredientsRequired: "Potato, Turnip, Boga, Specialty Herbs, Cat Cauldron Broth Base",
        gameplayEffect: "Comfort meal, basic recovery, village reputation boost."
      },
      connections: {
        characters: ["Momon", "Mona the Orchardist", "Gwen"],
        locations: ["Whisken Village"],
        factions: ["Whisken People"],
        items: ["Potato", "Turnip", "Boga", "Specialty Herbs", "Cat Cauldron Broth Base"]
      }
    },
    {
      title: "Cat Cauldron Broth Base",
      category: "Food & Inventory",
      type: "Broth Recipe",
      status: "Canon",
      spoilerLevel: "Minor Spoiler",
      tags: ["broth", "Cat Cauldron", "meal component", "recipe base"],
      summary:
        "A flexible broth base made in the Cat Cauldron and used to finalize stews, magical meals, and comfort dishes.",
      internalLore:
        "This is a practical Pantry slot for the Cat Cauldron's everyday cooking function. It should separate normal broth use from the catastrophic lore of awakening the ancient cauldron. Gwen can use it as a meal component while the deeper truth remains hidden.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryMealGroup: "components",
        ingredientsRequired: "Any Meat / Creature Drop, Any Produce, Specialty Herbs",
        craftingStation: "Cat Cauldron",
        gameplayEffect: "Component for stews, magical meals, and restorative recipes."
      },
      connections: {
        characters: ["The Cat Cauldron", "Gwen", "Tohm Kyatt"],
        recipes: ["Whisken Hearth Stew", "Magical Meals"],
        items: ["Cat Cauldron", "Specialty Herbs"]
      }
    },
    {
      title: "False Trader Spice",
      category: "Food & Inventory",
      type: "Corrupted Spice / Ingredient",
      status: "Canon",
      spoilerLevel: "Major Spoiler",
      tags: ["Mas'eel", "spice", "corrupted ingredient", "false traders", "Tabby Island"],
      summary:
        "A suspicious spice blend introduced by Mas'eel false traders during their slow infiltration of Tabby Island.",
      internalLore:
        "False Trader Spice is a practical ingredient slot for the Mas'eel infiltration. It appears harmless or exciting as a new imported flavor, but is tied to the cult's slow searing of Tabby Island and their corruption of Whisken faith and food culture.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryCategory: "Corrupted Spice",
        whereFound: "Tabby Island, Mas'eel trader stores",
        gameplayUse: "Quest clue, corrupted recipe component, possible debuff ingredient."
      },
      connections: {
        characters: ["Mur'amar"],
        locations: ["Tabby Island"],
        factions: ["Mas'eel Cult"],
        recipes: ["Dark Culinary Arts"],
        secrets: ["Secret: Mas'eel Infiltrated Tabby Island"]
      }
    },
    {
      title: "Moonlit Dew",
      category: "Food & Inventory",
      type: "Ingredient",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["ingredient", "Whisken", "dew", "brewing", "night"],
      summary: "A night-gathered dew used in Whisken ales, tonics, and gentle infusions.",
      internalLore:
        "Moonlit Dew fits Whisken brewing traditions and gives Oswin, Mona, and the village a gentle night-gathering ingredient for ales and tonics.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryCategory: "Brewing Ingredient",
        whereFound: "Whisker Woods, Whisken Village orchards at night",
        usedInRecipes: "Healthy Ale"
      },
      connections: {
        characters: ["Mona the Orchardist", "Oswin"],
        locations: ["Whisker Woods", "Whisken Village"],
        recipes: ["Healthy Ale"],
        factions: ["Whisken People"]
      }
    },
    {
      title: "Whisken Root Ferment",
      category: "Food & Inventory",
      type: "Brewing Ingredient",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["ingredient", "Whisken", "ferment", "ale", "roots"],
      summary: "A fermented root base used in Whisken ales, tonics, and tavern drinks.",
      internalLore:
        "Whisken Root Ferment is a practical Pantry ingredient for village brewing. It supports Healthy Ale, festival drinks, and Oswin's odd remedies without needing to invent a new system.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryCategory: "Brewing Ingredient",
        whereFound: "Whisken Village cellars, Whisker Woods roots",
        usedInRecipes: "Healthy Ale, Festival of Full Plates"
      },
      connections: {
        characters: ["Oswin", "Momon"],
        locations: ["Whisken Village", "Whisker Woods"],
        recipes: ["Healthy Ale"],
        factions: ["Whisken People"]
      }
    },
    {
      title: "Boar Meat",
      category: "Food & Inventory",
      type: "Enemy Drop / Ingredient",
      status: "Canon",
      spoilerLevel: "No Spoiler",
      tags: ["ingredient", "meat", "boar", "Whisker Woods"],
      summary: "A hearty meat drop from Thornback Boars, useful for stews and combat meals.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryCategory: "Meat / Creature Drop",
        whereFound: "Whisker Woods",
        usedInRecipes: "Whisken Hearth Stew, Cat Cauldron Broth Base"
      },
      connections: {
        locations: ["Whisker Woods"],
        recipes: ["Whisken Hearth Stew", "Cat Cauldron Broth Base"],
        enemies: ["Thornback Boar"]
      }
    },
    {
      title: "Mushroom Bits",
      category: "Food & Inventory",
      type: "Creature Drop / Ingredient",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["ingredient", "mushroom", "Mushgrub", "earthy"],
      summary: "Earthy mushroom pieces gathered from Mushgrubs or mushroom-heavy paths.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryCategory: "Produce / Creature Drop",
        whereFound: "Mushroom Grottos",
        usedInRecipes: "Cat Cauldron Broth Base, Whisken Hearth Stew"
      },
      connections: {
        locations: ["Mushroom Grottos"],
        recipes: ["Cat Cauldron Broth Base"],
        enemies: ["Mushgrub"]
      }
    },
    {
      title: "Mushgrub Jelly",
      category: "Food & Inventory",
      type: "Creature Drop / Ingredient",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["ingredient", "jelly", "Mushgrub", "binding agent"],
      summary: "A soft jelly drop from Mushgrubs that can bind sauces, broths, and bait recipes.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryCategory: "Creature Drop",
        whereFound: "Mushroom Grottos",
        usedInRecipes: "Bait recipes, broths, sauces"
      },
      connections: {
        locations: ["Mushroom Grottos"],
        enemies: ["Mushgrub"]
      }
    },
    {
      title: "Honey Globs",
      category: "Food & Inventory",
      type: "Creature Drop / Ingredient",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["ingredient", "honey", "Honeybloat", "sweet"],
      summary: "Sticky honey globs from Honeybloats, useful for sweets, ales, and trap-like recipes.",
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryCategory: "Sweetener / Creature Drop",
        whereFound: "Whisker Woods",
        usedInRecipes: "Healthy Ale, sweet meals, sticky trap recipes"
      },
      connections: {
        locations: ["Whisker Woods"],
        recipes: ["Healthy Ale"],
        enemies: ["Honeybloat"]
      }
    },
    ...["Dusk", "Bitter", "Sweet", "Savory", "Sour", "Salty", "Spicy"].map((flavor) => ({
      title: `${flavor} Slime Gel`,
      category: "Food & Inventory",
      type: "Slime Ingredient / Gel",
      status: "Soft Canon",
      spoilerLevel: "No Spoiler",
      tags: ["ingredient", "slime gel", flavor, "Slime Flavor System"],
      summary: `${flavor} Slime Gel is a flavor-aspected slime drop used in magical meals, substitutions, ales, and tonics.`,
      internalLore:
        `${flavor} Slime Gel gives the Pantry a concrete ingredient slot for the ${flavor.toLowerCase()} flavor branch of the Slime Flavor / Element System.`,
      fields: {
        seedBatch: "lore-expansion-2026-05-11",
        pantryCategory: "Slime Drop",
        whereFound: flavor === "Salty" ? "Caves" : flavor === "Spicy" ? "Villages" : "Whisker Woods",
        usedInRecipes: "Slime Substitutions, Magical Meals, Ales / Tonics"
      },
      connections: {
        locations: [flavor === "Salty" ? "Caves" : flavor === "Spicy" ? "Whisken Village" : "Whisker Woods"],
        recipes: ["Slime Substitutions", "Magical Meals", "Ales / Tonics"],
        gameplaySystems: ["Slime Flavor / Element System"],
        enemies: [`${flavor} Slime`]
      }
    }))
  ] as unknown as StarterInput[]).map((item) => entry(item)),
  ...[
    ["Ancient Whisken Create the Cat Cauldron", "Ancient Whisken Era", "Ancient Whisken seekers create the Cat Cauldron while trying to improve food and reach the knowledge of what is untasted."],
    ["First Whisken Exodus", "Ancient Whisken Era", "The Cat Cauldron causes Tabby Island to begin decaying, forcing the ancient Whisken to flee for the first time."],
    ["Cat Cauldron Is Buried and Forgotten", "Ancient Whisken Era", "The ancient Whisken lock the Cat Cauldron at the bottom of Tabby Island, remove it from history books, and stop speaking of it until it is forgotten."],
    ["Tablemaker Stories Inspire Tohm", "Tohm's Childhood Era", "Stories of the Tablemaker, also called the Master Chef, are told to young Tohm and seed his obsession with sacred meals and untasted food."],
    ["Tohm Grows Up on Tabby Island", "Tabby Island Era", "Tohm lives among the Whisken people on Tabby Island."],
    ["Tohm Becomes Obsessed with Magical Food", "Tohm's Obsession Era", "Because he has sweet taste buds and has tasted every normal food, Tohm becomes obsessed with tasting magical food."],
    ["Tohm Awakens the Cat Cauldron", "Tabby Island Disaster", "Tohm discovers the forgotten Cat Cauldron, cooks a meal in it, releases a pulse into the earth, and begins Tabby Island's second decay."],
    ["Mas'eel Sense the Cat Cauldron", "Tabby Island Disaster", "The pulse from the awakened Cat Cauldron lets the Mas'eel Cult sense its power and know it was on Tabby Island."],
    ["Tohm Flees With the Cat Cauldron", "Tabby Island Disaster", "Tohm takes the Cat Cauldron and flees in the Living Tavern without anyone knowing."],
    ["Mas'eel Infiltrate Tabby Island", "Mas'eel Infiltration Era", "Mas'eel cultists sail to Tabby Island pretending to be traders, introduce new foods, gain power, and persecute the Whisken for their Triadic faith."],
    ["Second Whisken Exodus", "Mas'eel Infiltration Era", "The Whisken flee Tabby Island again, though to them it feels like the first time, while Lel Kai's rescue boats are scattered by corruption."],
    ["Survivors Reach Whisker Woods", "Whisker Woods Era", "The known Whisken survivors reach Whisker Woods and establish the current Whisken Village."],
    ["Tohm Rebuilds in Whisker Woods", "Whisker Woods Era", "Tohm establishes himself in Whisker Woods and later becomes a renowned chef and food critic while carrying guilt over the Cat Cauldron."],
    ["Lillia Wants to Become a Faery", "Royal Contest / Dragon Knife Era", "Princess Lillia becomes obsessed with gaining magic and becoming like a faery."],
    ["Faeries Refuse to Help", "Royal Contest / Dragon Knife Era", "The faeries refuse to give humans magic because they fear humans would dominate the world."],
    ["King Takes the Dragon Knife", "Royal Contest / Dragon Knife Era", "The king wages war against the dwarves and takes the magical dragon knife."],
    ["Tohm Gains Access to Dragon Knife", "Royal Contest / Dragon Knife Era", "Tohm gains access to the royal family's spoils / dragon knife through a food contest or royal arrangement."],
    ["Lillia Consumes the Unstable Magical Dish", "Lillia Incident", "Tohm creates an unstable magical dish. Lillia consumes it and gains dangerous powers."],
    ["Lillia Tears Out Recipe Pages", "Lillia Incident", "Lillia attempts to take Tohm's recipe book, but Tohm snatches it back after the living chicken tavern stands up. Lillia tears out several pages."],
    ["Tohm Flees", "Lillia Incident", "Guards approach and Tohm is forced to flee."],
    ["Lillia Begins Using Dark Culinary Arts", "Game Begins", "Lillia uses torn recipe pages and magic to create corrupted meals and empower others."],
    ["Gwen Is Recruited", "Game Begins", "Gwen is recruited by Tohm and becomes involved in recovering the recipe pages."],
    ["Kap's Pond Is Corrupted", "Act 1", "Gwen encounters corruption spreading through Whisker Woods when Kap is attacked near the pond."]
  ].map(([title, era, summary]) =>
    entry({
      title,
      category: "Story",
      type: "Timeline Event",
      status: "Canon",
      spoilerLevel:
        title.includes("Cat Cauldron") ||
        title.includes("Tabby") ||
        title.includes("Lillia") ||
        title.includes("Dragon Knife")
          ? "Major Spoiler"
          : "Minor Spoiler",
      tags: ["timeline", era],
      summary,
      timeline: {
        era,
        trueTimeline: summary,
        playerTimeline: title.includes("Tabby") ? "Revealed later." : summary,
        questTimeline: title.includes("Kap") ? "Act 1 quest event." : "",
        emotionalTimeline: summary
      }
    })
  ),
  ...[
    {
      title: "Secret: Tohm Awakened the Cat Cauldron",
      fact: "Tohm activated the buried Cat Cauldron, restarted Tabby Island's decay, drew the Mas'eel Cult's attention, and fled with the artifact.",
      knownBy: ["Tohm Kyatt"],
      suspectedBy: ["Oswin"],
      unknownTo: ["Gwen", "Villagers", "Public"],
      playerKnowledge: "Unknown early, revealed later.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Public Does Not Know Tohm Caused Disaster",
      fact: "The public does not know Tohm awakened the Cat Cauldron, removed it from Tabby Island, and triggered the second decay.",
      knownBy: ["Tohm Kyatt"],
      suspectedBy: [],
      unknownTo: ["Gwen", "Villagers", "Public"],
      playerKnowledge: "Later reveal.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Tohm Never Drinks From The Cauldron",
      fact: "Tohm never drinks from the cauldron.",
      knownBy: ["Tohm Kyatt"],
      suspectedBy: [],
      unknownTo: [],
      playerKnowledge: "Canon contradiction detection fact.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Cat Cauldron Beneath Tabby Island",
      fact: "The ancient Whisken created the Cat Cauldron, buried it beneath Tabby Island, erased it from their history, and forgot it.",
      knownBy: ["Tohm Kyatt"],
      suspectedBy: ["Old Whisken sources"],
      unknownTo: ["Gwen", "Public"],
      playerKnowledge: "Revealed later.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Mas'eel Infiltrated Tabby Island",
      fact: "The Mas'eel arrived as false traders, introduced new foods, gained village power, persecuted Triadic Whisken, and then left to hunt the Cat Cauldron and Tohm's recipes with Princess Lillia.",
      knownBy: ["Mas'eel Cult", "Princess Lillia"],
      suspectedBy: ["Tohm Kyatt"],
      unknownTo: ["Gwen", "Whisken Village", "Public"],
      playerKnowledge: "Revealed through Tabby Island / Whisken history.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Lillia Tore Recipe Pages",
      fact: "Lillia tore pages from Tohm's recipe book.",
      knownBy: ["Tohm Kyatt", "Princess Lillia"],
      suspectedBy: [],
      unknownTo: ["Gwen", "Public"],
      playerKnowledge: "Eventually revealed.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Lillia Uses Dark Culinary Arts",
      fact: "Lillia uses the Dark Culinary Arts to corrupt food.",
      knownBy: ["Princess Lillia"],
      suspectedBy: [],
      unknownTo: ["Gwen", "Villagers"],
      playerKnowledge: "Learned by Gwen over time.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: King's Obsession Caused War",
      fact: "The king's obsession with giving Lillia magic caused war with the dwarves.",
      knownBy: ["King", "Queen", "Dwarven Kingdom"],
      suspectedBy: [],
      unknownTo: ["Gwen", "Public"],
      playerKnowledge: "Major spoiler.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Faeries Refused Human Magic",
      fact: "The faeries refused to help give humans magic because they feared humans would become too powerful.",
      knownBy: ["Faery Kingdom", "Royal Family"],
      suspectedBy: [],
      unknownTo: ["Gwen", "Public"],
      playerKnowledge: "Major spoiler.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Dark Culinary Arts Can Corrupt Consumers",
      fact: "Dark Culinary Arts can make consumers evil or corrupted.",
      knownBy: ["Princess Lillia"],
      suspectedBy: ["Gwen", "Tohm Kyatt"],
      unknownTo: [],
      playerKnowledge: "Known through gameplay and story.",
      spoilerLevel: "Minor Spoiler"
    },
    {
      title: "Secret: Slimes Born From Nutrients Or Corruption",
      fact: "Slimes are born from excess nutrients or excess corruption depending on their type.",
      knownBy: ["Tohm Kyatt", "Oswin"],
      suspectedBy: ["Gwen"],
      unknownTo: [],
      playerKnowledge: "Known as creature/system lore.",
      spoilerLevel: "No Spoiler"
    }
  ].map((secret) =>
    entry({
      title: secret.title,
      category: "Story",
      type: "Secret",
      status: "Canon",
      spoilerLevel: secret.spoilerLevel,
      tags: ["secret", "who knows what"],
      summary: secret.fact,
      internalLore: secret.fact,
      secret: {
        trueFact: secret.fact,
        knownBy: secret.knownBy,
        suspectedBy: secret.suspectedBy,
        unknownTo: secret.unknownTo,
        playerKnowledge: secret.playerKnowledge,
        relatedQuests: [
          ...(secret.title.includes("Lillia") ? ["Recover Recipe Pages"] : []),
          ...(secret.title.includes("Kap") ? ["Kap's Pond Rescue"] : [])
        ],
        relatedDialogue: []
      }
    })
  ),
  entry({
    title: "Public Gwen Description",
    category: "Marketing",
    type: "Public Lore",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["Gwen", "marketing", "spoiler safe", "public"],
    summary:
      "Gwen is a hardworking young fighter from Osul who finds herself swept into a strange culinary adventure after joining Tohm Kyatt's tavern.",
    publicDescription:
      "Gwen is a hardworking young fighter from Osul who finds herself swept into a strange culinary adventure after joining Tohm Kyatt's tavern. Armed with her sword, basket, and appetite, she gathers ingredients, protects villages, and cooks magical meals to face the dangers spreading through Whisker Woods.",
    fields: {
      "Safe for Instagram": "Yes",
      "Safe for Steam": "Yes",
      "Safe for Trailer": "Yes",
      "Safe for Website": "Yes",
      "Suggested Post Ideas": "Gwen with sword and basket; Gwen cooking after a fight; potato-themed character post."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods"],
      recipes: ["Magical Meals"],
      quests: [],
      items: ["Gwen's Basket"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Combat System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Public Tohm Description",
    category: "Marketing",
    type: "Public Lore",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["Tohm", "marketing", "spoiler safe", "public"],
    summary:
      "Tohm Kyatt is a world-renowned Whisken chef and food critic whose mysterious recipes may be the key to saving the land.",
    publicDescription:
      "Tohm Kyatt is a world-renowned Whisken chef and food critic whose mysterious recipes may be the key to saving the land. Brilliant, dramatic, and more than a little secretive, Tohm recruits Gwen to help recover stolen recipes before they cause even more chaos.",
    fields: {
      "Safe for Instagram": "Yes",
      "Safe for Steam": "Yes",
      "Safe for Trailer": "Yes",
      "Safe for Website": "Yes",
      "Suggested Post Ideas": "Mysterious chef profile; critic quote graphic; tavern recruitment tease."
    },
    connections: {
      characters: ["Tohm Kyatt", "Gwen"],
      locations: ["Whisker Woods"],
      recipes: ["Magical Meals"],
      quests: ["Recover Recipe Pages"],
      items: ["Recipe Pages"],
      factions: ["Whisken People"],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Public Lillia Description",
    category: "Marketing",
    type: "Public Lore",
    status: "Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["Lillia", "marketing", "spoiler safe", "public"],
    summary:
      "Princess Lillia is a magical threat tied to the rise of corrupted cooking and dangerous recipe-powered enemies.",
    publicDescription:
      "Princess Lillia is a magical threat tied to the rise of corrupted cooking and dangerous recipe-powered enemies. Her obsession with magic has left a trail of strange meals, twisted powers, and chaos across the land.",
    fields: {
      "Safe for Instagram": "Yes",
      "Safe for Steam": "Yes",
      "Safe for Trailer": "Careful: avoid deep royal backstory.",
      "Safe for Website": "Yes",
      "Suggested Post Ideas": "Corrupted recipe tease; mysterious princess silhouette; magical cooking danger post."
    },
    connections: {
      characters: ["Princess Lillia"],
      locations: [],
      recipes: ["Dark Culinary Arts"],
      quests: ["Recover Recipe Pages"],
      items: ["Recipe Pages"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Public Slime Description",
    category: "Marketing",
    type: "Public Lore",
    status: "Canon",
    spoilerLevel: "No Spoiler",
    tags: ["slimes", "marketing", "spoiler safe", "public"],
    summary:
      "Slimes are colorful flavor-filled creatures born from the excess nutrients of healthy forests.",
    publicDescription:
      "Slimes are colorful flavor-filled creatures born from the excess nutrients of healthy forests. Depending on where they form, they may taste like berries, herbs, fruit, or something far stranger. Some are friendly, some flee, and some are best avoided.",
    fields: {
      "Safe for Instagram": "Yes",
      "Safe for Steam": "Yes",
      "Safe for Trailer": "Yes",
      "Safe for Website": "Yes",
      "Suggested Post Ideas": "Flavor chart; red and blue slime comparison; friendly vs hostile slime behaviors."
    },
    connections: {
      characters: [],
      locations: ["Whisker Woods"],
      recipes: ["Slime Substitutions"],
      quests: [],
      items: ["Strawberry Slime Gel", "Blueberry Slime Gel"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: ["Slimes"],
      timelineEvents: []
    }
  }),
  entry({
    title: "Old Version: Tohm Builds Trust with King Over Months",
    category: "Archive",
    type: "Old Version",
    status: "Old Version",
    spoilerLevel: "Major Spoiler",
    tags: ["old version", "Tohm", "king", "dragon knife"],
    summary:
      "In an older version, Tohm slowly gained the king's trust over months in order to access the dragon knife.",
    internalLore:
      "This version is archived for reference and should not override the newer royal food contest idea unless revived."
  }),
  entry({
    title: "Newer Version: Tohm Wins Royal Food Contest",
    category: "Archive",
    type: "Naming / Version Note",
    status: "Soft Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["newer version", "Tohm", "royal food contest", "dragon knife"],
    summary:
      "In a newer version, the king creates a nationwide cooking contest, and Tohm wins, giving him access to royal spoils including the dragon knife.",
    internalLore:
      "This is the newer preferred access path, but it still needs exact quest/story structure."
  })
];

export const starterBestiary: BestiaryCreature[] = [
  {
    name: "Mushgrub",
    type: "Insect",
    status: "WIP",
    threatLevel: "Runs Away When Hit",
    rarity: "Common",
    size: "Small",
    diet: "Mushrooms, damp roots, and fallen fruit.",
    habitat: "Mushroom Grottos",
    behavior: "Timid until disturbed. Burrows under soft moss and pops out near mushroom clusters.",
    description: "A soft-bodied grub with mushroom caps growing from its back. It is more nuisance than monster, but groups can overwhelm careless travelers.",
    overview: "A starter creature for mushroom-heavy areas and early gathering routes.",
    fieldNotes: "Good candidate for teaching creature drops without making the forest feel cruel.",
    drops: { droppedIngredients: "Mushroom bits, grub jelly", cookingUses: "Earthy soups and bait recipes" },
    lore: { rumors: "Some villagers claim Mushgrubs hum when rain is coming." }
  },
  {
    name: "Thornback Boar",
    type: "Beast",
    status: "WIP",
    threatLevel: "Territorial",
    rarity: "Uncommon",
    size: "Medium",
    diet: "Roots, tubers, bark, and fallen fruit.",
    habitat: "Whisker Woods",
    behavior: "Territorial charger. Scrapes trees and dirt to mark feeding grounds.",
    description: "A forest boar with bramble-like thorn ridges along its back. It can be hunted for hearty ingredients, but it punishes direct approaches.",
    stats: { health: "Medium", damage: "Medium", speed: "Fast charge", defense: "Armored back", weakness: "Soft flank" },
    drops: { droppedIngredients: "Boar meat", craftingMaterials: "Thorn bristles", cookingUses: "Hearty meals and combat food" }
  },
  {
    name: "Hollow Whisper",
    type: "Spirit",
    status: "Idea",
    threatLevel: "Unknown",
    rarity: "Rare",
    size: "Small / drifting",
    diet: "Echoes, secrets, and old grief.",
    habitat: "Caves",
    behavior: "Avoids light. Repeats fragments of old conversations to lure the curious.",
    description: "A pale drifting spirit that seems stitched together from forgotten tavern songs and cave echoes.",
    lore: { origin: "Possibly born where old stories are buried instead of told.", hiddenNotes: "Could connect to hidden recipe-page memory scenes." }
  },
  {
    name: "Honeybloat",
    type: "Wildlife",
    status: "Idea",
    threatLevel: "Defensive",
    rarity: "Uncommon",
    size: "Small",
    diet: "Honey, pollen, and sweet sap.",
    habitat: "Whisker Woods",
    behavior: "Slow, sticky, defensive. Bursts into slowing honey if hit too hard.",
    description: "A round honey-fed forest critter with a translucent amber belly and tiny stubborn feet.",
    drops: { droppedIngredients: "Honey globs", cookingUses: "Sweet meals, ales, and sticky trap recipes" }
  },
  {
    name: "Rootstalker",
    type: "Plant",
    status: "WIP",
    threatLevel: "Aggro When Hit",
    rarity: "Uncommon",
    size: "Medium",
    diet: "Soil nutrients and ambient magic.",
    habitat: "Whisker Woods",
    behavior: "Pretends to be a dead stump until prey walks close.",
    description: "A root-bound plant creature that drags itself through the forest floor and lashes with vine limbs.",
    stats: { health: "Medium", damage: "Medium", speed: "Slow", weakness: "Fire and chopping tools", abilities: "Root snare" }
  },
  {
    name: "Cinderwing Moth",
    type: "Magical Creature",
    status: "Idea",
    threatLevel: "Passive",
    rarity: "Rare",
    size: "Small",
    diet: "Candlelight, warm ash, and spiced nectar.",
    habitat: "Villages",
    behavior: "Drawn to tavern windows and cooking fires at night.",
    description: "A moth with ember-dusted wings that leaves warm spark trails as it flutters.",
    productionNotes: "Could be a cozy night ambience creature or a rare alchemy ingredient source."
  },
  {
    name: "Dusk Slime",
    category: "Slimes",
    type: "Magical Creature",
    status: "Soft Canon",
    threatLevel: "Runs Away When Hit",
    rarity: "Uncommon",
    size: "Small",
    diet: "Twilight berries and excess forest nutrients.",
    habitat: "Whisker Woods",
    behavior: "Bounces away from direct conflict unless corrupted.",
    description: "A purple-blue slime that forms around twilight berry patches and glows faintly after sunset.",
    drops: { droppedIngredients: "Dusk slime gel", cookingUses: "Berry meals, ales, and night-vision recipes" },
    lore: { relatedCreatures: "Related to the broader Slime Flavor / Element System." }
  },
  {
    name: "Bitter Slime",
    category: "Slimes",
    type: "Magical Creature",
    status: "WIP",
    threatLevel: "Runs Away When Hit",
    rarity: "Common",
    size: "Small",
    diet: "Bitter herbs, bark oils, and excess forest nutrients.",
    habitat: "Whisker Woods",
    behavior: "Recoils from direct hits and leaves a sharp herbal residue behind.",
    description: "A flavor-aspected slime slot for bitter ingredient drops, food magic, and recipe testing.",
    drops: { droppedIngredients: "Bitter slime gel", cookingUses: "Bitter tonics, cleansing meals, and sharp herbal recipes" },
    lore: { relatedCreatures: "Part of the Slime Flavor / Element System." }
  },
  {
    name: "Sweet Slime",
    category: "Slimes",
    type: "Magical Creature",
    status: "WIP",
    threatLevel: "Runs Away When Hit",
    rarity: "Common",
    size: "Small",
    diet: "Fruit sugars, honey, nectar, and healthy excess nutrients.",
    habitat: "Whisker Woods",
    behavior: "Bouncy and skittish. Drawn to berries and sugary smells.",
    description: "A flavor-aspected slime slot for sweet ingredient drops, food magic, and recipe testing.",
    drops: { droppedIngredients: "Sweet slime gel", cookingUses: "Desserts, restorative meals, ales, and sweet buffs" },
    lore: { relatedCreatures: "Part of the Slime Flavor / Element System." }
  },
  {
    name: "Savory Slime",
    category: "Slimes",
    type: "Magical Creature",
    status: "WIP",
    threatLevel: "Passive",
    rarity: "Common",
    size: "Small",
    diet: "Mushrooms, cooked scraps, broth steam, and nutrient-rich soil.",
    habitat: "Whisker Woods",
    behavior: "Slow and curious. Lingers near campfires, tavern vents, and mushroom patches.",
    description: "A flavor-aspected slime slot for savory ingredient drops, food magic, and recipe testing.",
    drops: { droppedIngredients: "Savory slime gel", cookingUses: "Broths, stews, hearty meals, and umami recipes" },
    lore: { relatedCreatures: "Part of the Slime Flavor / Element System." }
  },
  {
    name: "Sour Slime",
    category: "Slimes",
    type: "Magical Creature",
    status: "WIP",
    threatLevel: "Aggro When Hit",
    rarity: "Common",
    size: "Small",
    diet: "Fermented fruit, tart berries, and acidic plant juices.",
    habitat: "Whisker Woods",
    behavior: "Splatters tart gel when startled and may bounce erratically after being struck.",
    description: "A flavor-aspected slime slot for sour ingredient drops, food magic, and recipe testing.",
    drops: { droppedIngredients: "Sour slime gel", cookingUses: "Pickles, sour sauces, sharp buffs, and fermentation recipes" },
    lore: { relatedCreatures: "Part of the Slime Flavor / Element System." }
  },
  {
    name: "Salty Slime",
    category: "Slimes",
    type: "Magical Creature",
    status: "WIP",
    threatLevel: "Defensive",
    rarity: "Common",
    size: "Small",
    diet: "Mineral water, salt licks, and dried sea-seasoned plants.",
    habitat: "Caves",
    behavior: "Defensive near mineral deposits. Leaves crystalline salt flecks in its trail.",
    description: "A flavor-aspected slime slot for salty ingredient drops, food magic, and recipe testing.",
    drops: { droppedIngredients: "Salty slime gel", cookingUses: "Seasoning bases, preserved foods, stamina meals, and mineral recipes" },
    lore: { relatedCreatures: "Part of the Slime Flavor / Element System." }
  },
  {
    name: "Spicy Slime",
    category: "Slimes",
    type: "Magical Creature",
    status: "WIP",
    threatLevel: "Aggressive",
    rarity: "Uncommon",
    size: "Small",
    diet: "Pepper plants, warm ash, chili oils, and heated food magic.",
    habitat: "Villages",
    behavior: "Jumpy and hot-tempered. May burst forward when approached too quickly.",
    description: "A flavor-aspected slime slot for spicy ingredient drops, food magic, and recipe testing.",
    drops: { droppedIngredients: "Spicy slime gel", cookingUses: "Fire meals, warming buffs, pepper sauces, and heat-based recipes" },
    lore: { relatedCreatures: "Part of the Slime Flavor / Element System." }
  },
  {
    name: "Cauldron Echo Slime",
    category: "Slimes",
    type: "Magical Creature",
    status: "Idea",
    threatLevel: "Unknown",
    rarity: "Rare",
    size: "Small",
    diet: "Residual Food Essence, old broth steam, and magical nutrients left by Cat Cauldron pulses.",
    habitat: "Tabby Island",
    behavior: "Appears near buried kitchens, ruins, and places where the Cat Cauldron's power touched the earth.",
    description: "A shimmering slime that flickers with old recipe memories and faint cauldron-shaped ripples.",
    overview: "Lore-forward slime variant for Tabby Island, Cat Cauldron aftereffects, and dangerous recipe-memory gathering.",
    fieldNotes: "Good candidate for a late-game ingredient clue that points back to Tohm's hidden disaster.",
    drops: {
      droppedIngredients: "Cauldron echo gel",
      cookingUses: "Truth-reveal tonics, pulse-sensitive broths, dangerous memory meals",
      recipeConnections: "Cat Cauldron Broth Base"
    },
    lore: {
      origin: "Formed where the Cat Cauldron's old pulse left Food Essence and decay tangled in the ground.",
      questConnections: "Tabby Island truth reveal, Cat Cauldron investigation",
      relatedCreatures: "Related to the Slime Flavor / Element System.",
      hiddenNotes: "Seed batch: lore-expansion-2026-05-11."
    },
    productionNotes: "Seed batch: lore-expansion-2026-05-11."
  },
  {
    name: "Seared Scarab",
    category: "Insects",
    type: "Insect",
    status: "Idea",
    threatLevel: "Aggro When Hit",
    rarity: "Uncommon",
    size: "Small",
    diet: "Seared roots, corrupted spice residue, and old food stores touched by Mas'eel magic.",
    habitat: "Tabby Island",
    behavior: "Clusters near false trader caches and burns little black trails through wood, grain, and pantry shelves.",
    description: "A black-and-amber beetle marked by tiny heat scars, as if the island's corruption cooked it from inside.",
    overview: "Mas'eel-flavored insect slot for Tabby Island corruption and false trader evidence.",
    drops: {
      droppedIngredients: "Seared shell chips, False Trader Spice traces",
      cookingUses: "Corruption clues, risky heat recipes, Dark Culinary Arts analysis",
      recipeConnections: "False Trader Spice"
    },
    lore: {
      origin: "Born from the Mas'eel's slow searing of Tabby Island stores and roots.",
      questConnections: "Mas'eel false trader investigation",
      hiddenNotes: "Seed batch: lore-expansion-2026-05-11."
    },
    productionNotes: "Seed batch: lore-expansion-2026-05-11."
  },
  {
    name: "False Feast Fly",
    category: "Insects",
    type: "Aberration",
    status: "Idea",
    threatLevel: "Defensive",
    rarity: "Rare",
    size: "Tiny swarm",
    diet: "Rotten feasts, corrupted sweet glaze, and ceremonial leftovers from Mas'eel rites.",
    habitat: "Tabby Island",
    behavior: "Gathers around food that looks abundant but has been spiritually spoiled.",
    description: "A glittering swarm that makes spoiled food seem inviting until the light hits its wings wrong.",
    overview: "A deception-themed insect for Mas'eel food corruption, FEAST symbolism, and investigation scenes.",
    drops: {
      droppedIngredients: "False feast wings",
      cookingUses: "Deception tonics, corruption diagnosis, anti-Mas'eel recipe clues",
      recipeConnections: "Dark Culinary Arts"
    },
    lore: {
      culturalMeaning: "A warning sign that the Mas'eel version of abundance is actually hunger wearing a mask.",
      questConnections: "Mas'eel false trader investigation, Lillia's Camp",
      hiddenNotes: "Seed batch: lore-expansion-2026-05-11."
    },
    productionNotes: "Seed batch: lore-expansion-2026-05-11."
  },
  {
    name: "Stoneback Tortoise",
    type: "Wildlife",
    status: "Idea",
    threatLevel: "Passive",
    rarity: "Rare",
    size: "Large",
    diet: "Moss and mineral-rich weeds.",
    habitat: "Mountains",
    behavior: "Peaceful unless its nesting stones are disturbed.",
    description: "A gentle tortoise with a stone-like shell that supports moss, tiny flowers, and sometimes sleeping fireflies."
  },
  {
    name: "Prawnhusk",
    type: "Boss",
    status: "Soft Canon",
    threatLevel: "Boss",
    rarity: "Rare",
    size: "Large",
    diet: "Fish, pond insects, and corrupted scraps.",
    habitat: "Whisker Woods",
    behavior: "Bursts from corrupted pond water and protects its territory with heavy claw swipes.",
    description: "An aquatic crustacean mini-boss tied to Kap's Pond Rescue.",
    overview: "Early mini-boss that teaches pond corruption, enemy waves, and recovery after danger.",
    stats: { health: "High for early game", damage: "Medium", defense: "Armored shell", attackPatterns: "Claw swipe, mud splash, water lunge" },
    drops: { droppedIngredients: "Prawnhusk meat", cookingUses: "Aquatic savory meals" },
    lore: { questConnections: "Kap's Pond Rescue" }
  },
  {
    name: "Crayhusk",
    type: "Beast",
    status: "Soft Canon",
    threatLevel: "Aggro When Hit",
    rarity: "Uncommon",
    size: "Medium",
    diet: "Aquatic plants and small pond creatures.",
    habitat: "Swamps",
    behavior: "Skittish alone, aggressive near nests.",
    description: "A crawfish-like enemy whose meat can be used for savory broth.",
    drops: { droppedIngredients: "Crayhusk meat", cookingUses: "Cray Broth" }
  },
  {
    name: "Ice Queen",
    type: "Boss",
    status: "Soft Canon",
    threatLevel: "Boss",
    rarity: "Unique",
    size: "Large",
    diet: "Unknown",
    habitat: "Whisker Woods",
    behavior: "Commands cursed bugs and marks the peak of Act 1 corruption.",
    description: "The queen of cursed bugs in Whisker Woods and a planned Act 1 boss.",
    stats: { health: "Boss", damage: "High", abilities: "Summons insects, cold area pressure", bossPhaseNotes: "Could escalate from bug swarm control to direct ice attacks." },
    lore: { questConnections: "Act 1 boss buildup", hiddenNotes: "May be tied to corrupted bug hierarchy." }
  },
  {
    name: "Corrupted Beetle",
    type: "Insect",
    status: "Playtest Scope",
    threatLevel: "Aggressive",
    rarity: "Common",
    size: "Small",
    diet: "Rotting leaves and corrupted growth.",
    habitat: "Whisker Woods",
    behavior: "Simple melee bug enemy for early playtest combat.",
    description: "A basic beetle twisted by local corruption. Useful for teaching simple enemy reads."
  }
].map((creature, index) =>
  normalizeBestiaryCreature({
    id: slugify(creature.name),
    createdAt: stamp,
    updatedAt: stamp,
    ...creature,
    status: creature.status || "WIP"
  } as Partial<BestiaryCreature>)
);

const starterBestiaryCategoryVaults: BestiaryCategoryArtVault[] = Array.from(
  new Set(starterBestiary.map((creature) => creature.category).filter(Boolean))
).map((category) => createBestiaryCategoryArtVaultRecord(category, starterBestiary));

export const createStarterDatabase = (): LoreDatabase => ({
  schemaVersion: 2,
  entries: starterEntries.map((item) => JSON.parse(JSON.stringify(item)) as LoreEntry),
  bestiary: starterBestiary.map((item) => JSON.parse(JSON.stringify(item)) as BestiaryCreature),
  bestiaryCategoryVaults: starterBestiaryCategoryVaults.map((item) => JSON.parse(JSON.stringify(item)) as BestiaryCategoryArtVault),
  worldBuilding: createStarterWorldBuilding(starterEntries, starterBestiary),
  backups: [],
  branding: {
    studioName: "STL Productionz"
  }
});
