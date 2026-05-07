import type { LoreDatabase, LoreEntry } from "../types";
import { normalizeEntry, slugify } from "../utils/entries";

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
      "Wiscan",
      "food critic",
      "mentor",
      "secret",
      "Tabby Island",
      "Cat Cauldron",
      "redemption"
    ],
    summary:
      "Tohm Kyatt is a world-renowned Whisken/Wiscan chef and food critic who hires Gwen to recover torn magical recipe pages.",
    publicDescription:
      "Tohm Kyatt is a world-renowned Whisken chef and food critic whose mysterious recipes may be the key to saving the land. Brilliant, dramatic, and more than a little secretive, Tohm recruits Gwen to help recover stolen recipes before they cause even more chaos.",
    internalLore:
      "Tohm Kyatt is a Wiscan/Whisken cat chef and food critic. He is the only cat to ever possess sweet taste buds, making him obsessed with tasting every possible food. As a child, his mother told him fairy tales about Datka/Dagda and a magical cauldron capable of creating food unlike anything in the world. Tohm originally lived on Tabby Island with the Wiscan/Whisken people. Beneath Tabby Island was the Cat Cauldron. Tohm attempted to use magical cooking knowledge connected to Datka/Dagda and the Cat Cauldron despite warnings. His experiment caused a massive explosion/corruption that forced the Wiscan/Whisken people to flee Tabby Island. No one publicly knows Tohm caused this disaster. After fleeing, Tohm settled in Whisker Woods, rebuilt his life, and became known as a world-renowned chef and award-winning food critic. He recruits Gwen as his sous chef and later involves her in recovering torn recipe pages. Tohm is not purely evil. He is flawed, obsessive, secretive, prideful, and morally compromised, but he has a redemption arc. He wants to fix the harm caused by his obsession. Important canon detail: Tohm never drinks from the cauldron. Updated Lillia Incident: Tohm creates an unstable magical dish using the dragon knife and magical culinary knowledge. Lillia consumes it and gains dangerous magical powers. The living chicken tavern suddenly stands up, causing Lillia, who wears large pajamas resembling a witch costume, to fall over. This gives Tohm the opportunity to snatch the recipe book back, but Lillia rips out several pages. As guards approach, Tohm is forced to flee.",
    fields: {
      Motivation:
        "To taste the impossible, master magical cooking, and eventually fix the damage his obsession caused.",
      Arc:
        "From obsessive culinary genius hiding from his consequences to flawed mentor seeking redemption.",
      "Gameplay Role":
        "Quest giver, mentor, chef, lore source, recipe system anchor, morally complex guide."
    },
    connections: {
      characters: ["Gwen", "Princess Lillia", "Datka / Dagda", "King"],
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
      factions: ["Whisken / Wiscan People"],
      secrets: [
        "Secret: Tohm Caused Tabby Island",
        "Secret: Tohm Never Drinks From The Cauldron"
      ],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: [
        "Tohm Finds / Uses the Cat Cauldron",
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
      "corrupted recipes"
    ],
    summary:
      "Princess Lillia is a stubborn young princess of the human kingdom who grew up wanting to become a faery. Her obsession with magic leads to the spread of the Dark Culinary Arts.",
    publicDescription:
      "Princess Lillia is a magical threat tied to the rise of corrupted cooking and dangerous recipe-powered enemies. Her obsession with magic has left a trail of strange meals, twisted powers, and chaos across the land.",
    internalLore:
      "Lillia is the daughter of the king and queen. Because the royal family was close to the faery kingdom, Lillia grew up fascinated by faeries and eventually became obsessed with becoming one. The king and queen spent about a year consulting mages and allies to find a way to give her magical powers. The faeries refused to help because they feared humans gaining magic would lead to humans dominating all kingdoms. The king eventually turned to the dwarven kingdom, knowing they possessed a magical dragon knife. The dwarves refused to give it up, and the king declared war. After winning, he took the dragon knife. Tohm Kyatt eventually gains access to the dragon knife through the royal food contest / royal access plotline. He creates an unstable magical dish. Lillia consumes it and gains dangerous magical powers. She attempts to steal Tohm's recipe book, but only tears out several pages before Tohm escapes. The torn recipe pages become central to the game. Lillia later sets up camp in the faery realm because she can consume the magic in the environment to mass-produce Dark Culinary Arts instead of infusing each meal one at a time.",
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
      factions: ["Faery Kingdom", "Dwarven Kingdom", "Human Kingdom"],
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
    tags: ["faery", "magical", "Whisker Woods", "NPC"],
    summary:
      "Lel Kai is a character connected to Tales of the Tavern's faery/magical side and appears in plans for Whisker Woods content and marketing scenes.",
    internalLore:
      "Lel Kai has a human form and is connected to the fairy/faery kingdom side of the world. They are planned to appear in the Whisker Woods vertical slice and later story progression. In New Year marketing art, Lel Kai appears at the fairy kingdom popping champagne with fairy dust in the sky like fireworks.",
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
      locations: ["Faery Realm", "Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: ["Faery Kingdom"],
      secrets: [],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Oswin",
    category: "Characters",
    type: "Character",
    status: "Soft Canon",
    spoilerLevel: "Minor Spoiler",
    tags: ["alchemist", "elder", "suspicious", "Tohm"],
    summary: "Oswin is an alchemist elder who is suspicious of Tohm Kyatt.",
    internalLore:
      "Oswin functions as a skeptical elder/alchemist figure who may understand more about magic, food, corruption, or Tohm's past than most villagers. He is suspicious of Tohm and can serve as a counterweight to Tohm's secrecy.",
    fields: {
      "Gameplay Role":
        "Potential NPC, lore explainer, alchemy/crafting system connection, quest giver."
    },
    connections: {
      characters: ["Tohm Kyatt", "Gwen"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: ["Secret: Tohm Caused Tabby Island"],
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
      "Kap is a fisherman in Whisken Village connected to the corrupted pond / opening quest event.",
    internalLore:
      "Kap is a villager/fisherman who gets attacked or endangered near the corrupted pond. Gwen hears him screaming for help, fights bugs, and eventually faces a prawnhusk mini-boss.",
    fields: {
      "Gameplay Role":
        "Opening quest NPC, fishing system connection, emotional reason to care about the village."
    },
    connections: {
      characters: ["Gwen"],
      locations: ["Whisker Woods", "Kap's Pond"],
      recipes: [],
      quests: ["Kap's Pond Rescue"],
      items: [],
      factions: [],
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
    title: "Datka / Dagda",
    category: "Characters",
    type: "Mythic Figure",
    status: "Needs Rewrite",
    spoilerLevel: "Minor Spoiler",
    tags: ["myth", "cauldron", "magical cooking", "naming decision"],
    summary:
      "Datka/Dagda is the legendary figure from Tohm's childhood fairy tale, associated with a magical cauldron and divine recipes.",
    internalLore:
      "Tohm's mother used to tell him a fairy tale about a god or mythic chef with a magical cauldron that could cook food unlike anything in existence. This tale becomes the seed of Tohm's lifelong obsession.",
    notes: {
      art: "",
      gameplay: "",
      production: "Naming issue: choose either Datka or Dagda.",
      marketing: "",
      unresolved: "Need consistency. Choose either Datka or Dagda."
    },
    connections: {
      characters: ["Tohm Kyatt"],
      locations: ["Tabby Island"],
      recipes: ["Magical Meals"],
      quests: [],
      items: ["Cat Cauldron", "Recipe Pages", "Tohm's Recipe Book"],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: ["Datka/Dagda Fairy Tale"]
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
      "Whisker Woods is a major early-game region where the Wiscan/Whisken people live after fleeing Tabby Island.",
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
      factions: ["Whisken / Wiscan People"],
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
    tags: ["village", "Whisken", "Wiscan", "tavern culture", "NPC hub"],
    summary:
      "Village area in Whisker Woods where the Whisken/Wiscan people live.",
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
      factions: ["Whisken / Wiscan People"],
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
    tags: ["original home", "corruption", "Cat Cauldron", "Tohm secret", "Wiscan"],
    summary:
      "The original home of the Wiscan/Whisken people, corrupted after Tohm's experiment with the Cat Cauldron.",
    internalLore:
      "Tabby Island was once the home of the Wiscan/Whisken people, including Tohm Kyatt. The Cat Cauldron was located beneath the island. Tohm secretly accessed it and tried to cook with it despite warnings. The result was a massive explosion/corruption that forced the Wiscan/Whisken people to flee. No one publicly knows that Tohm caused the disaster.",
    fields: {
      "Gameplay / Story Purpose":
        "Major backstory location, source of Tohm's guilt, potential future reveal location or memory sequence."
    },
    connections: {
      characters: ["Tohm Kyatt"],
      locations: ["Whisker Woods"],
      recipes: [],
      quests: [],
      items: ["Cat Cauldron"],
      factions: ["Whisken / Wiscan People"],
      secrets: ["Secret: Tohm Caused Tabby Island", "Secret: Cat Cauldron Beneath Tabby Island"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: ["Tabby Island Is Corrupted"]
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
    title: "Whisken / Wiscan People",
    category: "Story",
    type: "Faction / Culture",
    status: "Needs Rewrite",
    spoilerLevel: "Minor Spoiler",
    tags: ["Whisken", "Wiscan", "cat people", "culture", "naming decision"],
    summary:
      "Cat-like people connected to Tabby Island, Whisker Woods, tavern culture, food, hunting, farming, fishing, and community.",
    internalLore:
      "The Whisken/Wiscan people originally lived on Tabby Island but fled after the corruption caused by Tohm's experiment with the Cat Cauldron. They now live in places like Whisker Woods. Their culture is deeply tied to taverns, food, gathering, and community.",
    notes: {
      art: "",
      gameplay: "",
      production: "Naming issue: decide consistent spelling, Whisken or Wiscan.",
      marketing: "",
      unresolved: "Need to decide consistent spelling: Whisken or Wiscan."
    },
    connections: {
      characters: ["Tohm Kyatt"],
      locations: ["Whisker Woods", "Tabby Island", "Whisken Village"],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: ["Secret: Tohm Caused Tabby Island"],
      gameplaySystems: [],
      enemies: [],
      timelineEvents: ["Tabby Island Is Corrupted"]
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
    status: "Idea",
    spoilerLevel: "Minor Spoiler",
    tags: ["cult", "FEAST", "triad", "corruption", "world mythology"],
    summary: "A cult that perverts the triadic culinary philosophy into FEAST.",
    internalLore:
      "The core worldbuilding triad is Passion, Taste, Love. The Mas'eel cult corrupts this into FEAST. Their symbol is a single distorted dot/eye, opposing the three dots of the triad.",
    connections: {
      characters: [],
      locations: [],
      recipes: ["Dark Culinary Arts"],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Slime Flavor / Element System"],
      enemies: [],
      timelineEvents: []
    }
  }),
  entry({
    title: "Cat Cauldron",
    category: "Food & Inventory",
    type: "Artifact",
    status: "Canon",
    spoilerLevel: "Major Spoiler",
    tags: ["artifact", "cauldron", "Tabby Island", "Tohm", "disaster"],
    summary:
      "A magical cauldron located beneath Tabby Island that Tohm tried to use, causing disaster.",
    internalLore:
      "The Cat Cauldron was not Datka/Dagda's true cauldron and could not withstand the magical recipes Tohm attempted to cook. Despite warnings, Tohm tried to use it, causing a massive explosion/corruption that forced the Wiscan/Whisken people to flee Tabby Island. Important: Tohm never drinks from the cauldron.",
    wiki: {
      itemType: "Artifact",
      rarity: "Legendary",
      whereToFind: "Beneath Tabby Island.",
      gameplayUse: "Major lore artifact and disaster source.",
      loreDescription:
        "A dangerous magical cauldron tied to Tohm's guilt and Tabby Island's corruption."
    },
    connections: {
      characters: ["Tohm Kyatt", "Datka / Dagda"],
      locations: ["Tabby Island"],
      recipes: ["Magical Meals"],
      quests: [],
      items: [],
      factions: ["Whisken / Wiscan People"],
      secrets: [
        "Secret: Cat Cauldron Beneath Tabby Island",
        "Secret: Tohm Never Drinks From The Cauldron"
      ],
      gameplaySystems: ["Cooking System"],
      enemies: [],
      timelineEvents: ["Tohm Finds / Uses the Cat Cauldron", "Tabby Island Is Corrupted"]
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
  ...[
    ["Datka/Dagda Fairy Tale", "Ancient Myth / Fairy Tale Era", "A mythic tale about a magical cauldron and food unlike anything in existence is passed down and eventually told to young Tohm by his mother."],
    ["Tohm Grows Up on Tabby Island", "Tabby Island Era", "Tohm lives among the Wiscan/Whisken people on Tabby Island."],
    ["Tohm Becomes Obsessed with Magical Food", "Tohm's Obsession Era", "Because he has sweet taste buds and has tasted every normal food, Tohm becomes obsessed with tasting magical food."],
    ["Tohm Finds / Uses the Cat Cauldron", "Tabby Island Disaster", "Tohm accesses the Cat Cauldron beneath Tabby Island and attempts magical cooking despite warnings."],
    ["Tabby Island Is Corrupted", "Tabby Island Disaster", "The Cat Cauldron cannot withstand the recipe/magic, causing a massive explosion or corruption. The Wiscan/Whisken people flee. The public does not know Tohm caused it."],
    ["Tohm Rebuilds in Whisker Woods", "Whisker Woods Era", "Tohm flees and eventually establishes himself in Whisker Woods, later becoming a renowned chef and food critic."],
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
      title: "Secret: Tohm Caused Tabby Island",
      fact: "Tohm caused the corruption of Tabby Island.",
      knownBy: ["Tohm Kyatt"],
      suspectedBy: ["Oswin"],
      unknownTo: ["Gwen", "Villagers", "Public"],
      playerKnowledge: "Unknown early, revealed later.",
      spoilerLevel: "Major Spoiler"
    },
    {
      title: "Secret: Public Does Not Know Tohm Caused Disaster",
      fact: "The public does not know Tohm caused the disaster.",
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
      fact: "The Cat Cauldron was beneath Tabby Island.",
      knownBy: ["Tohm Kyatt"],
      suspectedBy: ["Old Wiscan/Whisken sources"],
      unknownTo: ["Gwen", "Public"],
      playerKnowledge: "Revealed later.",
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
      factions: ["Whisken / Wiscan People"],
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
  }),
  entry({
    title: "Naming Decision Needed: Whisken vs Wiscan",
    category: "Archive",
    type: "Naming Decision",
    status: "Needs Rewrite",
    spoilerLevel: "No Spoiler",
    tags: ["naming decision", "Whisken", "Wiscan"],
    summary:
      "Both names have been used for the cat people. The app should flag this as a naming consistency issue.",
    notes: {
      art: "",
      gameplay: "",
      production: "Choose one current spelling and archive the older one.",
      marketing: "",
      unresolved: "Need final naming decision."
    }
  }),
  entry({
    title: "Naming Decision Needed: Datka vs Dagda",
    category: "Archive",
    type: "Naming Decision",
    status: "Needs Rewrite",
    spoilerLevel: "Minor Spoiler",
    tags: ["naming decision", "Datka", "Dagda"],
    summary:
      "Both names have been used for the mythic cauldron figure. The app should flag this as a naming consistency issue.",
    notes: {
      art: "",
      gameplay: "",
      production: "Choose the final mythic figure name and archive the old one.",
      marketing: "",
      unresolved: "Need final naming decision."
    }
  })
];

export const createStarterDatabase = (): LoreDatabase => ({
  schemaVersion: 1,
  entries: starterEntries.map((item) => JSON.parse(JSON.stringify(item)) as LoreEntry),
  backups: [],
  branding: {
    studioName: "STL Productionz"
  }
});
