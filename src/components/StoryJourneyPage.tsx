import { useEffect, useMemo, useState } from "react";
import type { BestiaryCreature, ImageFitSettings, LoreEntry } from "../types";
import { normalizeImageFit, resolveImageSourceUrl } from "../utils/imageFit";
import { richTextToPlainText } from "../utils/richText";
import { AdjustableImage } from "./AdjustableImage";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { Icon } from "./Icon";

const STORY_JOURNEY_STATE_KEY = "tavernCookBookStoryJourneyState";
const STORY_JOURNEY_CHAPTERS_KEY = "tavernCookBookStoryJourneyChapters";
const storyExpansionChapterIds = new Set(["act-one-whisker-woods", "truth-of-tabby-island", "the-maseel-hunt"]);

interface StoryJourneyPageProps {
  entries: LoreEntry[];
  bestiary: BestiaryCreature[];
  readOnly?: boolean;
  onOpenEntry: (entry: LoreEntry) => void;
  onOpenCreature: (creature: BestiaryCreature) => void;
}

interface StoryChapter {
  id: string;
  title: string;
  subtitle: string;
  timelineStartLabel: string;
  timelineEndLabel: string;
  timelineStartPercent: number;
  timelineEndPercent: number;
  era: string;
  revealLevel: "Ancient History" | "Pre-Game" | "Player-Facing" | "Hidden Truth" | "Minor Spoiler" | "Major Spoiler";
  shortDescription: string;
  coverImageUrl?: string;
  coverImageFit?: ImageFitSettings;
  relatedLore: string[];
  pages: StoryPage[];
}

interface StoryPage {
  id?: string;
  title: string;
  text: string;
  imageUrl?: string;
  imageFit?: ImageFitSettings;
  imagePlaceholder?: string;
  caption?: string;
  relatedLore: string[];
}

interface StoryJourneyState {
  selectedChapterId: string;
  activeScope: StoryJourneyScope;
  pageByChapter: Record<string, number>;
  completedChapterIds: string[];
}

type StoryJourneyScope = "history" | "act1" | "act2" | "act3";

interface LorePreview {
  name: string;
  type: string;
  description: string;
  entry?: LoreEntry;
  creature?: BestiaryCreature;
}

const timelineLabels = [
  { label: "Ancient Era", percent: 3 },
  { label: "Year 0", percent: 10 },
  { label: "Year 300", percent: 22 },
  { label: "Year 333", percent: 32 },
  { label: "Pre-Game", percent: 52 },
  { label: "Prologue", percent: 62 },
  { label: "Act 1", percent: 74 },
  { label: "Act 2", percent: 84 },
  { label: "Act 3", percent: 92 },
  { label: "Final Act", percent: 98 }
];

const storyJourneyScopeOptions: Array<{
  id: StoryJourneyScope;
  label: string;
  eyebrow: string;
  description: string;
  emptyTitle: string;
}> = [
  {
    id: "history",
    label: "General History Timeline",
    eyebrow: "World Lore",
    description: "The current full lore timeline, from ancient history through the game's major story reveals.",
    emptyTitle: "No history chapters yet."
  },
  {
    id: "act1",
    label: "Act 1",
    eyebrow: "Playable Story",
    description: "Opening playable arc, Whisker Woods, the first corruption threads, and the first recipe-page recovery.",
    emptyTitle: "No Act 1 chapters yet."
  },
  {
    id: "act2",
    label: "Act 2",
    eyebrow: "Playable Story",
    description: "Middle-game story chapters, expanding regions, deeper food magic, and rising danger.",
    emptyTitle: "No Act 2 chapters yet."
  },
  {
    id: "act3",
    label: "Act 3",
    eyebrow: "Playable Story",
    description: "Late-game reveals, final-act setup, hidden truths, and the story's biggest confrontations.",
    emptyTitle: "No Act 3 chapters yet."
  }
];

const defaultStoryChapters: StoryChapter[] = [
  {
    id: "three-hundred-year-war",
    title: "The 300 Year War",
    subtitle: "Ovenhold and the Faery Realm forget how to share a table.",
    timelineStartLabel: "Year 0",
    timelineEndLabel: "Year 300",
    timelineStartPercent: 8,
    timelineEndPercent: 24,
    era: "Ancient History",
    revealLevel: "Ancient History",
    shortDescription:
      "A devastating war between Ovenhold and the Faery Realm lasted for 300 years. The conflict shaped the world, exhausted both kingdoms, and created a hunger for peace that no army could satisfy.",
    relatedLore: ["Ovenhold", "Faery Realm", "The Tablemaker", "Food Essence"],
    pages: [
      {
        title: "Two Kingdoms Divided",
        text:
          "Ovenhold was a mortal kingdom of hearths, ovens, labor, craft, survival, and cooked food. The Faery Realm was ancient, beautiful, proud, magical, and rooted in nature and spirit. Fear, hunger, pride, territory, and misunderstanding slowly turned both kingdoms away from hospitality and toward war.",
        imagePlaceholder: "A split kingdom map, half hearth-lit stonework and half luminous faery wood.",
        caption: "The first divide was not a border. It was a failure to sit together.",
        relatedLore: ["Ovenhold", "Faery Realm"]
      },
      {
        title: "Three Centuries of Hunger",
        text:
          "The war lasted 300 years. Generations were born into conflict, food became scarce, feasts vanished from memory, and even victory began to taste bitter. The damage was not only in the fields and forests. It reached the soul of hospitality itself.",
        imagePlaceholder: "A long banquet table with empty bowls, broken chairs, and cold ash.",
        caption: "A world can survive without victory longer than it can survive without bread.",
        relatedLore: ["Ovenhold", "Faery Realm", "Food Essence"]
      },
      {
        title: "The World Waits for a Meal",
        text:
          "No sword, treaty, king, queen, army, or spell could end the war. Something else had to arrive. Something simple, impossible, and sacred: a meal prepared with Passion, Taste, and Love.",
        imagePlaceholder: "A tiny warm light appearing at the center of a battlefield.",
        caption: "Before peace had a name, it had a scent.",
        relatedLore: ["The Tablemaker", "Passion", "Taste", "Love"]
      }
    ]
  },
  {
    id: "tablemakers-arrival",
    title: "The Tablemaker's Arrival",
    subtitle: "A stranger brings tools, ingredients, and a table.",
    timelineStartLabel: "Year 300",
    timelineEndLabel: "Year 333",
    timelineStartPercent: 24,
    timelineEndPercent: 34,
    era: "Ancient History",
    revealLevel: "Ancient History",
    shortDescription:
      "A mysterious figure known as the Tablemaker arrived during the final years of the war. He did not come as a warrior, king, or mage. He came as one who could prepare a table for enemies.",
    relatedLore: ["The Tablemaker", "The Everfeast", "Food Essence", "Ovenhold", "Faery Realm"],
    pages: [
      {
        title: "The Man Who Brought a Table",
        text:
          "The Tablemaker arrived with no army. He carried tools, ingredients, and a table. Ovenhold thought him foolish. The Faery Realm thought him small. Neither side understood that a table could be more dangerous to war than a blade.",
        imagePlaceholder: "A lone figure crossing a battlefield with a folded table on his back.",
        caption: "He did not ask who deserved peace. He prepared a place for it.",
        relatedLore: ["The Tablemaker", "Ovenhold", "Faery Realm"]
      },
      {
        title: "A Feast Neither Side Could Refuse",
        text:
          "The Tablemaker began preparing a meal so extraordinary that its scent crossed camps, walls, rivers, and old grudges. Soldiers paused. Faeries listened. Kings and queens grew curious despite themselves.",
        imagePlaceholder: "Steam curling like golden ribbons through battlefield fog.",
        caption: "The aroma did what banners could not.",
        relatedLore: ["The Tablemaker", "Food Essence"]
      },
      {
        title: "The Meal That Ended the War",
        text:
          "The meal perfectly held Passion, Taste, and Love. Everyone who ate remembered what it meant to be alive, hungry, forgiven, and welcomed. The war did not end because anyone surrendered. It ended because everyone remembered the table.",
        imagePlaceholder: "Ovenhold and faery leaders sharing one impossible meal.",
        caption: "Peace began with a bite.",
        relatedLore: ["Passion", "Taste", "Love", "Food Essence"]
      },
      {
        title: "The Cost of the Meal",
        text:
          "The meal was too powerful for a mortal body. The act of creating something so full of Food Essence, love, and divine culinary power killed the Tablemaker. His sacrifice became the sacred wound at the heart of magical cooking.",
        imagePlaceholder: "A fallen apron beside a glowing table.",
        caption: "The final ingredient was himself.",
        relatedLore: ["The Tablemaker", "Food Essence"]
      },
      {
        title: "Peace at the Same Table",
        text:
          "Ovenhold and the Faery Realm ended the war and became allies. Their alliance lasts to this day, not because they forgot their wounds, but because they shared a meal that made hatred impossible to swallow.",
        imagePlaceholder: "Two crowns resting on opposite sides of one table.",
        caption: "The treaty was written after the meal, but the meal made it true.",
        relatedLore: ["Ovenhold", "Faery Realm"]
      },
      {
        title: "The Culinary Beyond",
        text:
          "The Tablemaker did not truly vanish. His spirit returned to The Everfeast, a heavenly culinary realm where all meals are remembered in their perfect form. Before returning, he released a spirit of Food Essence into the world, helping form the foundation of magical cooking and the sacred nature of meals.",
        imagePlaceholder: "A doorway of warm light opening beyond an endless kitchen.",
        caption: "The Everfeast keeps every meal that ever healed someone.",
        relatedLore: ["The Tablemaker", "The Everfeast", "Food Essence"]
      }
    ]
  },
  {
    id: "tohm-kyatts-obsession",
    title: "Tohm Kyatt's Obsession",
    subtitle: "Wonder curdles into hunger for the ultimate taste.",
    timelineStartLabel: "Pre-Game",
    timelineEndLabel: "Pre-Game",
    timelineStartPercent: 46,
    timelineEndPercent: 58,
    era: "Pre-Game History",
    revealLevel: "Pre-Game",
    shortDescription:
      "Centuries later, Tohm Kyatt grows fascinated with legends of impossible meals, the Tablemaker, and magical cooking. What begins as wonder slowly turns into obsession.",
    relatedLore: ["Tohm Kyatt", "Whisken", "The Tablemaker", "The Everfeast", "Cat Cauldron", "Dragon Knife"],
    pages: [
      {
        title: "The Cat Who Could Taste Sweetness",
        text:
          "Tohm Kyatt was a rare Whisken with an extraordinary relationship to taste. Sweetness did not simply please him. It opened doors in his mind. Every flavor became a question, and every meal became a clue.",
        imagePlaceholder: "Young Tohm studying a pastry like it is a map.",
        caption: "Some people taste food. Tohm investigated it.",
        relatedLore: ["Tohm Kyatt", "Whisken"]
      },
      {
        title: "The Legend That Would Not Leave Him",
        text:
          "Tohm heard stories of the Tablemaker, The Everfeast, magical meals, and legendary recipes. The stories would not leave him. He became convinced that a meal like the Tablemaker's could be created again.",
        imagePlaceholder: "A recipe book open beside old faery tale illustrations.",
        caption: "A legend is harmless until someone mistakes it for a recipe.",
        relatedLore: ["The Tablemaker", "The Everfeast", "Recipe Book"]
      },
      {
        title: "From Wonder to Hunger",
        text:
          "Ordinary food stopped satisfying him. Tohm did not simply want to cook. He wanted the ultimate taste, a flavor beyond memory, beyond safety, beyond the limits of a chef who still knew when to stop.",
        imagePlaceholder: "A kitchen full of perfect dishes, all ignored.",
        caption: "Wonder asks. Obsession demands.",
        relatedLore: ["Tohm Kyatt", "Food Essence"]
      },
      {
        title: "The First Dangerous Step",
        text:
          "Tohm began searching for magical tools and recipes. That search would one day pull him toward the Cat Cauldron, the Dragon Knife, the Recipe Book, and disasters he was not ready to name.",
        imagePlaceholder: "A shadowed cauldron, knife, and book arranged like warnings.",
        caption: "The road to disaster smelled wonderful at first.",
        relatedLore: ["Cat Cauldron", "Dragon Knife", "Recipe Book", "Tohm Kyatt"]
      }
    ]
  },
  {
    id: "gwen-before-the-tavern",
    title: "Gwen Before the Tavern",
    subtitle: "A practical fighter from Osul, not a chosen one.",
    timelineStartLabel: "Pre-Game",
    timelineEndLabel: "Prologue",
    timelineStartPercent: 52,
    timelineEndPercent: 62,
    era: "Pre-Game History",
    revealLevel: "Player-Facing",
    shortDescription:
      "Before Gwen becomes involved in Tohm's story, she lives as a hardworking, sharp, capable fighter from Osul.",
    relatedLore: ["Gwen", "Osul", "Tohm Kyatt"],
    pages: [
      {
        title: "A Worker, Not a Chosen One",
        text:
          "Gwen was grounded and practical. She worked, gathered, fought, and survived. She was not waiting for prophecy. She paid attention, got things done, and protected what needed protecting.",
        imagePlaceholder: "Gwen carrying tools and a basket at the edge of a village path.",
        caption: "Her strength came from ordinary work done seriously.",
        relatedLore: ["Gwen", "Osul"]
      },
      {
        title: "Osul and Ordinary Strength",
        text:
          "Life in Osul taught Gwen the value of food, labor, courage, and sharp judgment. She was not chasing legend. She was trying to live well, work hard, and keep danger from reaching the people around her.",
        imagePlaceholder: "A warm Osul workyard with tools, food baskets, and practice weapons.",
        caption: "Ordinary strength is still strength.",
        relatedLore: ["Gwen", "Osul"]
      },
      {
        title: "The Kind of Person Tohm Needed",
        text:
          "Gwen was brave, smart, skilled, stubborn, and capable. That made her exactly the kind of person Tohm Kyatt needed, though whether Tohm deserved that help was another question entirely.",
        imagePlaceholder: "Gwen looking toward a strange tavern silhouette in the distance.",
        caption: "The right sous chef is sometimes the person who tells you no.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Living Tavern"]
      }
    ]
  },
  {
    id: "when-tohm-met-gwen",
    title: "When Tohm Met Gwen",
    subtitle: "A tavern job becomes the first step into the main story.",
    timelineStartLabel: "Prologue",
    timelineEndLabel: "Act 1",
    timelineStartPercent: 60,
    timelineEndPercent: 70,
    era: "Beginning of the Game",
    revealLevel: "Player-Facing",
    shortDescription:
      "Tohm Kyatt recruits Gwen, setting the playable story into motion. What seems like a simple tavern job becomes the beginning of a much larger journey.",
    relatedLore: ["Tohm Kyatt", "Gwen", "Living Tavern", "Whisker Woods"],
    pages: [
      {
        title: "The Offer",
        text:
          "Tohm Kyatt approached Gwen with work connected to the Living Tavern. It sounded like a job. It felt like a test. With Tohm, those things were often the same.",
        imagePlaceholder: "Tohm making a dramatic offer outside the Living Tavern.",
        caption: "A chef, a fighter, and a door that would not stay ordinary.",
        relatedLore: ["Tohm Kyatt", "Gwen", "Living Tavern"]
      },
      {
        title: "A Strange Chef and a Stranger Job",
        text:
          "Gwen quickly realized Tohm was brilliant, dramatic, secretive, and intense about food in a way that made normal questions feel too small. He needed help, but he was not saying everything.",
        imagePlaceholder: "A tavern kitchen filled with impossible tools and suspiciously glowing ingredients.",
        caption: "The job description did not mention mysteries.",
        relatedLore: ["Tohm Kyatt", "Gwen"]
      },
      {
        title: "The Sous Chef",
        text:
          "Gwen became tied to the tavern's work. Gathering, cooking, fighting, helping, and learning became the rhythm of the game. She was not just hired into a kitchen. She was pulled into a story.",
        imagePlaceholder: "Gwen with a basket, sword, and cooking station.",
        caption: "A sous chef can save a world if the recipe is strange enough.",
        relatedLore: ["Gwen", "Living Tavern", "Recipe Book"]
      },
      {
        title: "The Road to Whisker Woods",
        text:
          "The road led toward Whisker Woods, where the first tasks seemed simple enough: gather ingredients, help people, learn the land, and notice what was beginning to go wrong.",
        imagePlaceholder: "A forest road under warm morning light, with the Living Tavern behind.",
        caption: "Every first act begins as a place to walk into.",
        relatedLore: ["Whisker Woods", "Gwen", "Tohm Kyatt"]
      }
    ]
  },
  {
    id: "stolen-recipes",
    title: "The Stolen Recipes",
    subtitle: "Torn pages start spreading dangerous powers.",
    timelineStartLabel: "Prologue",
    timelineEndLabel: "Act 1",
    timelineStartPercent: 66,
    timelineEndPercent: 72,
    era: "Beginning of the Game",
    revealLevel: "Minor Spoiler",
    shortDescription:
      "The Recipe Book is no longer whole. Torn pages are loose in the world, and corrupted cooking begins turning hunger, power, and ambition into threats.",
    relatedLore: ["Recipe Book", "Lillia", "Dark Culinary Arts", "Gwen", "Tohm Kyatt"],
    pages: [
      {
        title: "Pages in the Wrong Hands",
        text:
          "The Recipe Book held more than instructions. Its pages carried culinary power, history, and risk. When pages were torn loose, the recipes stopped belonging only to Tohm Kyatt.",
        imagePlaceholder: "Torn recipe pages drifting over a dark kitchen flame.",
        caption: "A recipe can be a promise or a weapon.",
        relatedLore: ["Recipe Book", "Tohm Kyatt"]
      },
      {
        title: "Dark Culinary Arts",
        text:
          "Lillia's use of Dark Culinary Arts twists food into corruption. Meals that should nourish become tools of control, mutation, and fear. Gwen's recovery of recipe pages becomes more than cleanup. It becomes protection.",
        imagePlaceholder: "A beautiful dish with a dark aura cracking through it.",
        caption: "Not every meal wants to feed you.",
        relatedLore: ["Lillia", "Dark Culinary Arts", "Gwen"]
      }
    ]
  },
  {
    id: "act-one-whisker-woods",
    title: "Act 1: Whisker Woods",
    subtitle: "Gwen's first real step from tavern helper into magical meal wielder.",
    timelineStartLabel: "Act 1",
    timelineEndLabel: "Act 1",
    timelineStartPercent: 70,
    timelineEndPercent: 80,
    era: "Act 1",
    revealLevel: "Player-Facing",
    shortDescription:
      "Act 1 begins as a simple ingredient-gathering task for Tohm Kyatt and becomes Gwen's first investigation into the corruption spreading through Whisker Woods.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Whisker Woods", "Feast of Full Plates", "Kap", "Prawnhusk", "Fire Meal", "Ice Queen", "Blizzard Meal"],
    pages: [
      {
        title: "Clean Story Layout",
        text: storyText(
          "Act 1 follows Gwen's first real step from tavern helper into magical meal wielder. It begins as a simple ingredient-gathering task for Tohm Kyatt and slowly becomes a full investigation into the corruption spreading through Whisker Woods.",
          "By the end, Gwen has discovered magical cooking, seen her first trance vision, met several strange allies and enemies, and faced the Ice Queen, the ruler of the corrupted insect swarm.",
          "The act should move from cozy tavern responsibility into danger, mystery, food magic, and suspicion. Gwen starts by proving she can handle a gathering run, then learns that ingredients, recipes, monsters, and corruption are all tied together."
        ),
        imagePlaceholder: "A story map of Whisker Woods with a warm tavern on one edge and a frozen insect hive on the other.",
        caption: "Act 1 begins with a chore and ends with a recipe mystery.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Whisker Woods", "Ice Queen"]
      },
      {
        title: "Act 1 Overview",
        text: storyText(
          "Gwen works under Tohm Kyatt at his living tavern in Whisker Woods. Tohm needs ingredients before nightfall because the village is preparing for the Feast of Full Plates, an important Whisken celebration tied to food, abundance, and community.",
          "At first, Gwen's goal is simple: gather Tohm's ingredients, return before the feast, and prove she can handle real responsibility in the tavern.",
          "But Whisker Woods is not normal anymore. Bugs are becoming aggressive. Ice is appearing where it should not exist. Strange magical animals are wandering the forest. People are going missing. Recipe magic is beginning to awaken around Gwen."
        ),
        imagePlaceholder: "The Living Tavern glowing warmly while strange ice and insect trails creep through the woods beyond it.",
        caption: "The opening contrast is cozy hearth against corrupted forest.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Living Tavern", "Feast of Full Plates", "Whisker Woods"]
      },
      {
        title: "Gwen's First Task",
        text: storyText(
          "The story begins in the morning with Gwen being sent out by Tohm Kyatt. Tohm gives her an ingredient list for the feast: 2 Boar Meat, 13 Purfox, and 4 Sunchee.",
          "Gwen is told to return to the tavern before nightfall so the food can be prepared in time for the Feast of Full Plates. This opening should feel cozy at first. Gwen is doing a normal tavern chore. She knows the woods, she knows how to fight, and she has done gathering runs before.",
          "This time feels different. As Gwen moves through Whisker Woods, she notices bugs crawling near the surface, egg nests appearing in strange places, and paths blocked by unnatural ice or corrupted overgrowth.",
          "This is where the player learns the basic loop: explore, gather, fight small enemies, use tools, collect ingredients, and return before the day ends."
        ),
        imagePlaceholder: "Gwen reading Tohm's ingredient list at the tavern door before walking into a golden forest.",
        caption: "The first task should feel ordinary until the woods answer back.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Boar Meat", "Purfox", "Sunchee", "Feast of Full Plates"]
      },
      {
        title: "The Forest Starts Fighting Back",
        text: storyText(
          "As Gwen gathers ingredients, she runs into aggressive insects. These are not just normal bugs. They feel invasive, territorial, and unnaturally organized.",
          "The bugs are laying eggs too close to paths and settlements, almost like they are trying to claim the forest. Gwen clears small nests, fights early bug enemies, and begins realizing that something is spreading through Whisker Woods.",
          "Possible early enemies include Crayhusks, Dappleflys, small corrupted bugs, egg clusters, and bug nests blocking paths.",
          "This section teaches Gwen's basic combat and survival instincts. She can use ale to heal, fight with her weapon, and start discovering how dangerous the woods have become. The tone shifts from gathering ingredients for the tavern to realizing something is wrong in Whisker Woods."
        ),
        imagePlaceholder: "A cozy forest path interrupted by insect eggs, clawed roots, and a first swarm of corrupted bugs.",
        caption: "The forest should feel like it is beginning to defend the corruption.",
        relatedLore: ["Whisker Woods", "Crayhusks", "Dappleflys", "Egg Clusters", "Bug Nests"]
      },
      {
        title: "Kap at the Corrupted Lake",
        text: storyText(
          "While traveling deeper into the woods, Gwen hears cries for help near a hidden lake. The lake is corrupted, but beautiful in a strange way: a secret bioluminescent pond glowing with wrong colors beneath the surface.",
          "There, Gwen finds Kap, a Whisken fisherman. Kap is trapped near the center of the lake, surrounded by bugs. He came looking for a rare fish connected to corrupted waters, possibly a Gloomfin, because he thought it could be used in an incredible dish for the feast.",
          "Kap's thinking is very Whisken: even when everything is dangerous, he is still thinking about food. He may say something like, \"This fish only grows in corrupted waters! Imagine it with Moonbutter Herb Roast!\"",
          "Kap believes that if Gwen brings something this rare back to Tohm, Tohm might finally take her seriously as more than just a helper. But the bugs close in. Gwen has to clear Crayhusks, Dappleflys, and egg clusters around the corrupted lake while Kap tries to stay alive.",
          "Once the bugs are cleared, the ground shakes. Something much bigger rises from the water."
        ),
        imagePlaceholder: "Kap stranded at the center of a glowing corrupted lake while bug shapes gather around the shore.",
        caption: "Kap turns a rescue into a food-culture moment.",
        relatedLore: ["Kap", "Gloomfin", "Moonbutter Herb Roast", "Crayhusks", "Dappleflys", "Prawnhusk"]
      },
      {
        title: "Boss Fight: Prawnhusk",
        text: storyText(
          "The first major boss is the Prawnhusk. This is Gwen's tutorial boss and should feel like a giant corrupted lake bug, somewhere between a shrimp, crawfish, and monstrous armored insect.",
          "It emerges because Gwen disturbed the corrupted nest around the lake. Kap sees it and yells, \"LOOK OUT!\" Gwen tells Kap to row away or get to safety while she deals with it. Kap leaves, shouting that he will see her at the tavern tonight and reminding her not to die before Tohm's test.",
          "The fight is a clean 1v1 boss battle. It teaches dodging, blocking or parrying, watching attack patterns, punishing the boss after a big attack, and reading enemy tells.",
          "When Gwen defeats it, the Prawnhusk dissolves or collapses into ash, leaving strange bug remains behind. This is Gwen's first major sign that the bug problem is bigger than a normal infestation."
        ),
        imagePlaceholder: "A giant armored prawn-insect boss rising from bioluminescent water while Gwen braces on the shore.",
        caption: "The Prawnhusk is the first proof that the forest problem has boss-level teeth.",
        relatedLore: ["Gwen", "Kap", "Prawnhusk", "Whisker Woods"]
      },
      {
        title: "Returning for the Feast",
        text: storyText(
          "Gwen returns to the tavern in time for the Feast of Full Plates. This should be one of the first big cultural moments in the game, showing the Whisken people as a food-centered culture with tradition, warmth, and community.",
          "The tavern is alive with activity. Tohm is preparing food. Whisken villagers are gathering. Kap may arrive and tell people what happened at the lake. Everyone is excited for the feast.",
          "The contrast should hit hard: outside, Whisker Woods is becoming corrupted. Inside, the tavern is warm, bright, loud, and full of food.",
          "Gwen has returned with the ingredients. She has proven herself. But Tohm sees that the situation is becoming more dangerous, and he decides it is time to let Gwen try something more advanced."
        ),
        imagePlaceholder: "The Living Tavern filled with Whisken villagers, lanterns, food, and noise while dark woods press outside.",
        caption: "The Feast of Full Plates is Act 1's first warm cultural anchor.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Kap", "Whisken People", "Feast of Full Plates"]
      },
      {
        title: "Gwen Cooks the Fire Meal",
        text: storyText(
          "Tohm introduces Gwen to the idea of a magical meal. This is not normal cooking. It is tied to flavor, memory, spirit, and power. A magical meal is not just something you eat; it pulls meaning out of the world.",
          "The first magical meal is remembered as the Fire Meal. The recipe may involve ingredients like Sunchee, Honey, and Crushed Purfox.",
          "Gwen cooks the meal for the first time. She may be nervous. Tohm watches carefully. The tavern quiets down. The meal begins to glow or release strange heat.",
          "Gwen tastes it. Then everything disappears."
        ),
        imagePlaceholder: "Gwen standing over a glowing hot meal while Tohm and the tavern crowd watch in silence.",
        caption: "The Fire Meal is Gwen's doorway into magical cooking.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Fire Meal", "Sunchee", "Honey", "Crushed Purfox"]
      },
      {
        title: "The Fire Meal Trance",
        text: storyText(
          "Every first-time magical meal pulls Gwen into a vision realm. This place can be called the Between Table or the Feast Beyond. The trance is shaped by the meal's flavor, emotional meaning, and the history connected to the recipe.",
          "For the Fire Meal, Gwen's trance begins with warmth, then suddenly becomes cold. She finds herself in a snowstorm. The world is silent except for wind. She pushes through the snow and eventually finds a cave or sheltered place.",
          "Inside, she sees a small scene that feels like a memory. There is a little girl wearing a purple nightgown, possibly holding a fairy plush, comforting or standing beside a large fallen creature. The moment feels innocent at first, but deeply unsettling.",
          "This little girl is almost certainly connected to Princess Lillia, though Gwen does not understand that yet. The vision hints at Lillia's childhood, her desire to become magical, and the sadness or obsession that eventually leads to the corruption spreading through the world.",
          "Then Gwen hears guards shouting, \"Princess!\" The trance breaks. Gwen wakes up back in the tavern with fire power."
        ),
        imagePlaceholder: "A snowstorm vision with a little girl in a purple nightgown holding a fairy plush beside a fallen creature.",
        caption: "The trance gives Gwen power and quietly points at Lillia.",
        relatedLore: ["Gwen", "Fire Meal", "The Between Table", "The Feast Beyond", "Princess Lillia"]
      },
      {
        title: "Fire Opens the Woods",
        text: storyText(
          "After the feast and the trance, Gwen can now use the Fire Meal's power. This allows her to burn through enchanted overgrowth, melt unnatural ice, or clear blocked paths in Whisker Woods.",
          "Now the forest opens up. What used to be a simple ingredient route becomes a larger adventure. Gwen can reach places she could not access before.",
          "The story becomes less about returning to the tavern and more about finding the source of the corruption. The bugs are becoming worse. The ice is spreading. The forest is changing.",
          "Tohm may pretend he knows less than he actually does, but Gwen starts noticing that he understands magical meals too well."
        ),
        imagePlaceholder: "Gwen using fire power to burn away overgrowth and melt a frozen passage in Whisker Woods.",
        caption: "Fire turns Act 1 from route into investigation.",
        relatedLore: ["Gwen", "Fire Meal", "Whisker Woods", "Tohm Kyatt"]
      },
      {
        title: "The Magical Boar",
        text: storyText(
          "At some point after Gwen gains magical cooking, Tohm pushes her toward better ingredients. The lesson is simple: better ingredients create stronger magical meals.",
          "This leads Gwen to hunt or confront a Magical Boar. The boar is not just a normal animal. It may be glowing, enchanted, corrupted, or unusually aggressive.",
          "The boar represents the next level of ingredient gathering. Gwen is no longer just picking plants and hunting ordinary creatures. She is collecting ingredients with magical properties.",
          "The boar fight should feel like a wilderness hunt. It can charge, break trees, knock Gwen back, and force her to use timing instead of just attacking. After Gwen defeats it, she gains an ingredient that helps her cook stronger meals or progress deeper into the forest."
        ),
        imagePlaceholder: "A glowing magical boar charging through broken trees while Gwen prepares to dodge.",
        caption: "The boar teaches that ingredients can be boss-level prizes.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Magical Boar", "Magical Meals"]
      },
      {
        title: "The Bug That Steals",
        text: storyText(
          "During the middle of Act 1, Gwen encounters a strange bug or creature that steals from her. This enemy should be memorable because it changes the rhythm of the game. Instead of simply attacking Gwen, it takes something important and runs.",
          "It could steal an ingredient, a recipe component, a tavern item, a key object needed for a meal, or a charm or tool part.",
          "At first, it may seem like a mischievous forest creature. Later, Gwen sees the same creature again with lightning around it. This shows that the creature has changed. The bug is no longer just a thief. It has been empowered by something magical, possibly a stolen recipe, corrupted food, or the Ice Queen's influence.",
          "The lightning version becomes a guide or lure, leading Gwen toward a dungeon or deeper dangerous area. The mystery is whether it was stealing randomly, working for someone, infected after stealing magical food, or chosen by the corruption."
        ),
        imagePlaceholder: "A small bug thief clutching a stolen ingredient while sparks flicker around its shell.",
        caption: "The bug thief makes the player chase a question, not just an enemy.",
        relatedLore: ["Gwen", "Bug Thief", "Lightning Bug Thief", "Ice Queen", "Dark Culinary Arts"]
      },
      {
        title: "Thairrott and the Cavern",
        text: storyText(
          "Gwen eventually reaches the entrance to a cavern or ant nest. Here she faces Thairrott, remembered as a giant skeleton beast that emerges from the ground near the cavern entrance.",
          "Thairrott acts like a guardian blocking the path into the deeper corrupted area. The Prawnhusk teaches basic combat. The Magical Boar teaches magical ingredient hunting. Thairrott teaches that the deeper parts of Whisker Woods are guarded by ancient or corrupted forces.",
          "After Gwen defeats Thairrott, the path into the cavern opens. This marks the beginning of the darker half of Act 1.",
          "Inside the cavern, the insect infestation begins looking less like a natural swarm and more like an army. Gwen finds egg chambers, frozen tunnels, bug nests, ingredient pockets, corrupted roots, strange recipe residue, and ice spreading through underground walls.",
          "The bug thief with lightning may reappear, leading Gwen deeper or causing trouble. The player begins to connect the bugs, ice, magical food, empowered creatures, and stolen recipe power."
        ),
        imagePlaceholder: "A giant skeletal beast bursting from roots and stone before a frozen cavern mouth.",
        caption: "Thairrott is the gatekeeper into Act 1's darker half.",
        relatedLore: ["Gwen", "Thairrott", "Whisker Woods", "Bug Thief", "Ice Queen"]
      },
      {
        title: "Cedrick the Grunt",
        text: storyText(
          "In the dungeon or skeleton-related area, Gwen encounters Cedrick the Grunt. Cedrick seems like an enemy at first: a skeleton grunt, dungeon guard, or strange creature trying to survive among the corruption.",
          "At some point, Gwen defeats him or corners him. Then his skull or true vulnerable self is revealed. Instead of finishing him off, Gwen spares him.",
          "This is important because it shows Gwen's character. She is tough and aggressive when she needs to be, but she is not cruel. If someone begs or shows they are not truly evil, she can show mercy.",
          "Cedrick later puts on a hood and becomes an ally. This also unlocks or connects to charm upgrades. His Act 1 arc is enemy grunt, defeated, spared, hooded ally, charm upgrade helper."
        ),
        imagePlaceholder: "A small skeletal grunt lowering his weapon while Gwen chooses mercy in a dim cavern.",
        caption: "Cedrick turns combat victory into character definition.",
        relatedLore: ["Gwen", "Cedrick the Grunt", "Charm Upgrades"]
      },
      {
        title: "Cedar, Lyra, and Oswin",
        text: storyText(
          "Gwen later meets Cedar and Lyra. At first, they fight her, either because they do not trust Gwen, think she is working with Tohm, or are protecting someone. Their fight should feel different from monster battles because they are intelligent opponents.",
          "Cedar and Lyra are not evil. They are suspicious. After Gwen proves herself, they become allies. Cedar is especially important because he shelters Oswin, the old alchemist.",
          "Oswin is suspicious, fearful, and knowledgeable. He seems to know more about magical food, corruption, or old prophecies than most people. He may fear a false prophet or someone misusing sacred food magic.",
          "Oswin should not immediately trust Gwen. He may also be suspicious of Tohm Kyatt. This begins planting doubt around Tohm: he is Gwen's mentor, but he has secrets, understands magical meals too well, and has recipes he maybe should not have.",
          "Oswin helps push the story from bugs are attacking to there is a deeper magical history here. He may also point Gwen toward a relic or food-related artifact, such as the Fish Oven."
        ),
        imagePlaceholder: "Cedar and Lyra blocking Gwen on a forest path, with Oswin hidden in a shelter behind them.",
        caption: "Act 1 widens from Gwen and Tohm into a network of suspicious allies.",
        relatedLore: ["Gwen", "Cedar", "Lyra", "Oswin", "Tohm Kyatt", "Fish Oven"]
      },
      {
        title: "Mu'Ramar and the Destroyed Camp",
        text: storyText(
          "Gwen eventually finds a peaceful campsite or tent area where she meets Mu'Ramar, a boy. At first, this area feels like a break from the bug chaos. It is quieter and more human. Mu'Ramar may seem innocent, lost, or in need of help.",
          "Later, Gwen returns and finds the tent area destroyed. The camp has been massacred, and Mu'Ramar appears to be the only survivor. Gwen vows revenge or promises to find the monster responsible.",
          "This leads into the Dog Person transformation boss fight. The twist is that after Gwen defeats the beast, it transforms back into a dog person. The dog person explains that Cedrick gave him magical cookies weeks ago, and those cookies caused the transformations.",
          "But something about the timeline does not match. The camp was destroyed months ago. The dog person says the cookies were given weeks ago. That means something is wrong with Mu'Ramar. When Gwen realizes the contradiction, Mu'Ramar disappears.",
          "Mu'Ramar may be a ghost, a memory, a magical projection, or something tied to the corruption. This side arc gives Act 1 emotional weight and shows that magical food can twist bodies, memories, time, and truth."
        ),
        imagePlaceholder: "A torn campsite at night with a lone boy shape near the tents and claw marks in the ground.",
        caption: "Mu'Ramar turns a side quest into a timeline wound.",
        relatedLore: ["Gwen", "Mu'Ramar", "Dog Person", "Cedrick the Grunt", "Magical Cookies"]
      },
      {
        title: "The Beast Man Night Boss",
        text: storyText(
          "The dog person boss fight should happen at night or be tied to night transformation. By day, the character may seem normal or wounded. By night, they transform into a beast.",
          "This boss connects directly to corrupted magical food. The dog person did not become a monster naturally. They were changed by magical cookies, probably made using corrupted recipe magic.",
          "This teaches Gwen that meals can be dangerous when unstable or misused. It also connects back to Lillia's larger influence: corrupted dishes are spreading through the world and changing people into bosses.",
          "The fight should feel tragic, not just scary. Gwen is not killing a monster. She is stopping someone who was transformed by food magic. After the fight, the dog person returns to normal long enough to explain what happened. Then the Mu'Ramar mystery appears."
        ),
        imagePlaceholder: "A tragic dog-person beast boss under moonlight, with traces of cookie-like magic around the transformation.",
        caption: "This fight proves corrupted meals can change people, not only creatures.",
        relatedLore: ["Gwen", "Dog Person", "Magical Cookies", "Dark Culinary Arts", "Princess Lillia"]
      },
      {
        title: "Brambrik",
        text: storyText(
          "Brambrik is soft canon for now. Based on the Act 1 structure, he could fit as a Whisken or forest NPC connected to the Feast of Full Plates, a dungeon-side character who gives Gwen information about the bugs or Ice Queen, or a minor boss, miniboss, or corrupted villager connected to magical food.",
          "The cleanest placement is middle-to-late Act 1, around the time Gwen is meeting Cedar, Oswin, Cedrick, and other strange figures affected by the corruption.",
          "Possible role: Brambrik is a survivor or scout who saw the insects moving toward the frozen caverns. He warns Gwen that the bugs are not simply nesting, but gathering under one queen.",
          "This makes Brambrik useful as the character who points Gwen toward the Ice Queen threat while staying flexible until his role is locked."
        ),
        imagePlaceholder: "A wary forest scout or Whisken survivor pointing toward blue light under the trees.",
        caption: "Brambrik stays useful, but marked soft canon until locked.",
        relatedLore: ["Brambrik", "Gwen", "Ice Queen", "Whisker Woods"]
      },
      {
        title: "The Ice Queen Revealed",
        text: storyText(
          "As Gwen pushes deeper into Whisker Woods, the source of the corruption becomes clearer. The insects are being ruled by the Ice Queen.",
          "She is the queen of the bugs in Whisker Woods, likely an Ice Ant Queen or insect monarch. Her presence explains the unnatural cold, the aggressive bug behavior, and the frozen areas spreading through the forest.",
          "She is not just a large bug. She has been changed by recipe magic. This connects to Lillia's stolen recipes and the Dark Culinary Arts. Lillia is using corrupted magical food to empower creatures and people, turning them into bosses.",
          "The Ice Queen may have consumed or been infused with a recipe connected to cold, leading to the Blizzard Meal. The closer Gwen gets to her, warm forest becomes cold, green paths become frozen, bug nests become ice hives, normal enemies become frost-corrupted, and the sky and wind become unnatural."
        ),
        imagePlaceholder: "A frozen insect queen on an ice hive throne as the forest around her becomes a blizzard.",
        caption: "The Ice Queen is the face of Act 1's mystery.",
        relatedLore: ["Gwen", "Ice Queen", "Blizzard Meal", "Dark Culinary Arts", "Princess Lillia"]
      },
      {
        title: "Ice Queen Boss Fight",
        text: storyText(
          "The first stage of the Ice Queen fight is about survival and pressure. She commands bugs, ice, and the frozen battlefield. Her attacks can include summoning bug swarms, creating ice walls, freezing parts of the arena, dashing or burrowing, launching ice spikes, calling smaller insects from eggs, and creating blizzard zones.",
          "This fight tests everything Gwen learned in Act 1: basic combat from Prawnhusk, movement and dodging from the boar, dungeon survival from Thairrott, magical meal usage from Fire Meal, and enemy pattern reading from the dog person and other bosses.",
          "When Gwen defeats Stage 1, the Ice Queen changes. Stage 2 is remembered as the Ice Queen Ballerina form. This should feel elegant, eerie, and dangerous. She spins across the arena, leaves trails of ice, attacks with rhythm, and turns the battlefield into a frozen stage.",
          "This is a strong visual climax because it combines beauty and horror, matching Tales of the Tavern's tone: charming and whimsical, with dark magical danger underneath. When Gwen finally defeats her, the Ice Queen's power breaks and the frozen corruption begins to thaw."
        ),
        imagePlaceholder: "The Ice Queen shifting from monstrous insect monarch into an eerie ballerina form on a frozen stage.",
        caption: "The final fight turns the hive into a performance of corrupted beauty.",
        relatedLore: ["Gwen", "Ice Queen", "Prawnhusk", "Magical Boar", "Thairrott", "Fire Meal"]
      },
      {
        title: "Blizzard Meal Recipe",
        text: storyText(
          "After defeating the Ice Queen, Gwen receives or recovers the Blizzard Meal recipe. This is the Act 1 recipe reward and confirms that the Ice Queen's power came from magical meal corruption.",
          "This is also where Gwen may begin to suspect Tohm more seriously. If the recipes being used by enemies are connected to Tohm's recipe book, then how does Tohm fit into this?",
          "Why does Tohm understand magical meals so well? Why do these recipes keep appearing around corrupted bosses? Why does Gwen's trance show a little princess? Why are magical dishes turning people and creatures into monsters?",
          "Act 1 ends with the forest partially saved, but the larger mystery opening up. Gwen has not solved the true problem. She has only found the first recipe page."
        ),
        imagePlaceholder: "Gwen holding the Blizzard Meal recipe as frost melts from the surrounding woods.",
        caption: "A recipe recovered is also a question opened.",
        relatedLore: ["Gwen", "Blizzard Meal", "Recipe Book", "Tohm Kyatt", "Princess Lillia"]
      },
      {
        title: "Clean Act 1 Beat List",
        text: storyText(
          "Beat 1 - Tohm Sends Gwen Out: Gwen is sent to gather ingredients for the Feast of Full Plates. Her goal is to return before nightfall.\nBeat 2 - Whisker Woods Feels Wrong: Gwen notices aggressive bugs, strange eggs, blocked paths, and unnatural ice.\nBeat 3 - Gwen Finds Kap: Kap is trapped at a corrupted lake while searching for a rare fish. Bugs surround him.\nBeat 4 - Prawnhusk Boss: A giant Prawnhusk emerges from the corrupted lake. Gwen defeats it and saves Kap.\nBeat 5 - Gwen Returns to the Tavern: Gwen makes it back in time for the Feast of Full Plates.\nBeat 6 - Gwen Cooks Her First Magical Meal: Tohm lets Gwen cook a magical meal, likely the Fire Meal.\nBeat 7 - Fire Meal Trance: Gwen sees a vision of a little girl in a purple nightgown with a fairy plush, connected to Princess Lillia.\nBeat 8 - Gwen Gains Fire Power: The Fire Meal gives Gwen fire abilities, allowing her to clear blocked paths.",
          "Beat 9 - Magical Boar Hunt: Gwen hunts a magical boar to learn that stronger ingredients create stronger meals.\nBeat 10 - Bug Thief: A bug steals something from Gwen. Later, it appears with lightning around it and leads her toward danger.\nBeat 11 - Thairrott: Gwen fights Thairrott, a giant skeleton beast guarding the cavern entrance.\nBeat 12 - Cavern Investigation: Gwen enters the cavern and discovers deeper insect corruption and frozen nests.\nBeat 13 - Cedrick the Grunt: Gwen defeats Cedrick, spares him, and he later becomes an ally connected to charm upgrades.\nBeat 14 - Cedar and Lyra: Cedar and Lyra fight Gwen at first, then become allies after she proves herself.\nBeat 15 - Oswin: Gwen meets Oswin, an old alchemist who fears the deeper truth behind the corruption and possibly distrusts Tohm.",
          "Beat 16 - Mu'Ramar Camp: Gwen meets Mu'Ramar, later finds the camp destroyed, and investigates the beast responsible.\nBeat 17 - Dog Person Night Boss: Gwen fights a transformed dog person. After defeat, the dog person reveals magical cookies caused the transformation.\nBeat 18 - Mu'Ramar Mystery: The timeline does not match. Mu'Ramar disappears, implying something supernatural or tragic.\nBeat 19 - Ice Queen's Hive: Gwen reaches the frozen insect hive and discovers the Ice Queen is behind the Act 1 corruption.\nBeat 20 - Ice Queen Stage 1: Gwen fights the Ice Queen in her monstrous insect queen form.\nBeat 21 - Ice Queen Stage 2: The Ice Queen transforms into a ballerina-like form and fights with graceful ice attacks.\nBeat 22 - Blizzard Meal Recipe: Gwen defeats the Ice Queen, recovers the Blizzard Meal recipe, and realizes the corruption is tied to stolen magical recipes."
        ),
        imagePlaceholder: "A production board with twenty-two Act 1 beats pinned from tavern morning to frozen hive finale.",
        caption: "The clean beat list is the quick reference for building Act 1.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Kap", "Prawnhusk", "Fire Meal", "Ice Queen", "Blizzard Meal"]
      },
      {
        title: "Simple Act 1 Story Summary",
        text: storyText(
          "Gwen begins Act 1 as Tohm Kyatt's tavern helper, sent into Whisker Woods to gather ingredients before the Feast of Full Plates. What should be a normal gathering trip becomes dangerous when she discovers that the forest is swarming with corrupted insects. At a glowing corrupted lake, she rescues Kap from bugs and defeats a giant Prawnhusk, proving she can handle real danger.",
          "Gwen returns to the tavern in time for the feast and cooks a magical meal for the first time. When she tastes it, she falls into a trance and sees a little girl in a purple nightgown holding a fairy plush, hinting at Princess Lillia and the deeper source of the corruption. Gwen wakes with fire powers, opening new paths through the forest.",
          "As she investigates further, Gwen hunts a magical boar, follows a strange stealing bug that later appears charged with lightning, defeats Thairrott at the cavern entrance, and discovers that the insect corruption goes deep underground. Along the way she meets Cedrick the Grunt, Cedar, Lyra, and Oswin, each revealing more about the danger spreading through Whisker Woods.",
          "Gwen also encounters Mu'Ramar near a tent camp, only to later find the area destroyed. A nighttime beast fight reveals that a dog person was transformed by magical cookies, proving that corrupted meals can change people into monsters. When Mu'Ramar disappears after Gwen notices the timeline does not make sense, the story becomes even stranger.",
          "Finally, Gwen tracks the corruption to the Ice Queen, the ruler of the frozen insect swarm. After defeating the Ice Queen and her eerie ballerina form, Gwen recovers the Blizzard Meal recipe. Whisker Woods begins to thaw, but Gwen is left with bigger questions: where are these recipes coming from, why does Tohm know so much, and who was the little princess in her trance?",
          "Act 1 ends with Gwen stronger, but also more suspicious. The forest is saved for now, but the recipe mystery has only begun."
        ),
        imagePlaceholder: "Warm light returning to Whisker Woods while Gwen looks back toward the tavern with a recovered recipe page.",
        caption: "Act 1 ends with victory, suspicion, and the first recovered recipe.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Whisker Woods", "Princess Lillia", "Recipe Book", "Blizzard Meal"]
      }
    ]
  },
  {
    id: "truth-of-tabby-island",
    title: "The Truth of Tabby Island",
    subtitle: "The hidden wound in Tohm's past waits beneath the story.",
    timelineStartLabel: "Act 3",
    timelineEndLabel: "Final Act",
    timelineStartPercent: 84,
    timelineEndPercent: 92,
    era: "Late Game Reveal",
    revealLevel: "Major Spoiler",
    shortDescription:
      "The truth of Tabby Island and the Cat Cauldron reframes Tohm Kyatt, the Whisken exodus, and the Mas'eel hunt for magical recipes.",
    relatedLore: ["Tabby Island", "Cat Cauldron", "Tohm Kyatt", "Whisken People", "Mas'eel Cult", "Lel Kai"],
    pages: [
      {
        title: "The First Search for What Is Untasted",
        text:
          "Long before Gwen's journey, ancient Whisken seekers created the Cat Cauldron while trying to improve food and reach the knowledge of what is untasted. The goal began as culinary wonder, but the invention was too powerful for the island beneath it.",
        imagePlaceholder: "Ancient Whisken cooks around an unfinished cauldron under island roots.",
        caption: "The first mistake was born from hunger for knowledge.",
        relatedLore: ["Whisken People", "Cat Cauldron", "Tabby Island"]
      },
      {
        title: "The First Exodus",
        text:
          "The Cat Cauldron caused Tabby Island to begin decaying. The ancient Whisken fled, then locked the cauldron at the bottom of the island, removed it from their history books, and stopped speaking of it until the truth was forgotten.",
        imagePlaceholder: "Boats leaving a dim island while elders seal a hidden chamber.",
        caption: "A people can bury a thing so well that their children inherit only the wound.",
        relatedLore: ["Whisken People", "Tabby Island", "Cat Cauldron"]
      },
      {
        title: "Tohm Finds the Forgotten Cauldron",
        text:
          "Centuries later, Tohm Kyatt discovers the hidden knowledge and returns to Tabby Island. He cooks a meal in the Cat Cauldron and activates it. A pulse runs into the earth, and the island begins decaying again.",
        imagePlaceholder: "Tohm standing before a cat-shaped cauldron as light cracks through the floor.",
        caption: "The second disaster began with a meal no one else knew he had cooked.",
        relatedLore: ["Tohm Kyatt", "Cat Cauldron", "Tabby Island"]
      },
      {
        title: "The Pulse the Mas'eel Heard",
        text:
          "The awakened cauldron's pulse does more than damage the island. It lets the Mas'eel Cult sense the power and know it was on Tabby Island. Tohm takes the cauldron and flees in the Living Tavern before anyone understands what happened.",
        imagePlaceholder: "A magical pulse spreading from island roots toward distant black sails.",
        caption: "The island heard decay. The cult heard invitation.",
        relatedLore: ["Mas'eel Cult", "Cat Cauldron", "Tohm Kyatt", "Living Tavern"]
      },
      {
        title: "False Traders",
        text:
          "Mas'eel cultists arrive pretending to be traders. They introduce new foods, gain trust over years, secretly sear the island, rise in village influence, and begin persecuting Whisken people for holding to the Triadic faith taught by the Tablemaker.",
        imagePlaceholder: "Friendly trade stalls with beautiful spices casting wrong shadows.",
        caption: "They did not conquer the village first. They fed it lies.",
        relatedLore: ["Mas'eel False Traders", "Whisken People", "The Tablemaker", "False Trader Spice"]
      },
      {
        title: "The Second Exodus",
        text:
          "The Whisken flee again, though to them it feels like the first time. Tohm hears what is happening and gets Lel Kai, who is becoming general of the faery army, to send boats. Corruption scatters many of them, and the known survivors eventually reach Whisker Woods.",
        imagePlaceholder: "Rescue boats breaking through corrupted waters toward a forest shore.",
        caption: "The village that remains is a rescued fragment, not the whole story.",
        relatedLore: ["Lel Kai's Rescue Fleet", "Whisken Village", "Whisker Woods", "Tohm Kyatt"]
      }
    ]
  },
  {
    id: "the-maseel-hunt",
    title: "The Mas'eel Hunt",
    subtitle: "A gentle mask hides a cult searching for the cauldron and recipes.",
    timelineStartLabel: "Act 3",
    timelineEndLabel: "Final Act",
    timelineStartPercent: 88,
    timelineEndPercent: 96,
    era: "Late Game Reveal",
    revealLevel: "Major Spoiler",
    shortDescription:
      "The Mas'eel corrupt the shared Tablemaker faith into FEAST, hunt the Cat Cauldron, and tie Tabby Island's past to Princess Lillia's present danger.",
    relatedLore: ["Mas'eel Cult", "Mur'amar", "Princess Lillia", "Cat Cauldron", "Recipe Pages", "Food Essence"],
    pages: [
      {
        title: "FEAST Instead of Three Pillars",
        text:
          "Most cultures worship the Tablemaker and practice the Triadic faith through their own traditions. The Mas'eel compress Passion, Taste, and Love into FEAST, turning shared abundance into control, hunger, and power.",
        imagePlaceholder: "Three warm dots reflected in a single distorted black eye.",
        caption: "A holy meal becomes dangerous when love is removed from the recipe.",
        relatedLore: ["The Tablemaker", "Food Essence", "Mas'eel Cult"]
      },
      {
        title: "Mur'amar's Gentle Voice",
        text:
          "Mur'amar can move among villagers as if he belongs, speaking of the Mas'eel faith as something gentle. His danger is not that he looks monstrous. It is that he knows how to sound comforting while asking about the Cat Cauldron, Tohm, and magical recipes.",
        imagePlaceholder: "A peaceful stranger at a village table with a hidden symbol on his sleeve.",
        caption: "Some villains enter through the front door and compliment the soup.",
        relatedLore: ["Mur'amar", "Whisken Village", "Cat Cauldron"]
      },
      {
        title: "Lillia's Alliance",
        text:
          "After Tabby Island, the Mas'eel search for the Cat Cauldron and Tohm's magical recipes while working with Princess Lillia. Lillia wants power and magical transformation; the Mas'eel want the sacred machinery beneath that power.",
        imagePlaceholder: "A faery-realm camp kitchen where royal banners meet cult marks.",
        caption: "Different hungers can still share a kitchen.",
        relatedLore: ["Princess Lillia", "Lillia's Camp", "Dark Culinary Arts", "Recipe Pages"]
      },
      {
        title: "What Gwen Must Uncover",
        text:
          "Gwen's journey eventually becomes more than recovering recipe pages. She must understand which foods heal, which foods corrupt, which histories were erased, and why Tohm's secret brought the Mas'eel into the story.",
        imagePlaceholder: "Gwen arranging recipe pages, spice samples, and island-map clues on a tavern table.",
        caption: "A cookbook can become a case file.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Recipe Book", "Mas'eel False Traders"]
      }
    ]
  },
  {
    id: "final-confrontation",
    title: "Final Confrontation",
    subtitle: "Cooking, truth, corruption, and courage reach the same table.",
    timelineStartLabel: "Final Act",
    timelineEndLabel: "Final Act",
    timelineStartPercent: 92,
    timelineEndPercent: 100,
    era: "Final Act",
    revealLevel: "Major Spoiler",
    shortDescription:
      "The final confrontation will bring Gwen, Tohm, Lillia, the Recipe Book, Dark Culinary Arts, and the meaning of Food Essence into one decisive story meal.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Lillia", "Recipe Book", "Dark Culinary Arts", "Food Essence"],
    pages: [
      {
        title: "The Last Table",
        text:
          "The final act should not only defeat a villain. It should answer the story's central question: what is food for? Power, control, survival, memory, love, or the courage to share a table after harm?",
        imagePlaceholder: "A final table between light and corruption.",
        caption: "The end should taste like the whole journey.",
        relatedLore: ["Gwen", "Tohm Kyatt", "Lillia", "Food Essence"]
      }
    ]
  }
];

const fallbackLore: Record<string, { type: string; description: string }> = {
  Ovenhold: {
    type: "Kingdom",
    description: "A mortal kingdom connected to hearths, ovens, labor, survival, craft, and cooked food."
  },
  "Faery Realm": {
    type: "Kingdom",
    description: "A magical kingdom connected to nature, spirit, beauty, ancient power, and faery politics."
  },
  "The Tablemaker": {
    type: "Sacred Figure",
    description: "A mysterious culinary figure who ended the 300 year war by preparing a meal for enemies."
  },
  "The Everfeast": {
    type: "Mythic Realm",
    description: "A heavenly culinary realm where the Tablemaker returned after his sacrifice."
  },
  "Food Essence": {
    type: "Magic System",
    description: "A spiritual and magical essence released into the world by the Tablemaker."
  },
  Passion: { type: "Sacred Principle", description: "One of the three sacred principles in the Tablemaker's meal." },
  Taste: { type: "Sacred Principle", description: "One of the three sacred principles in the Tablemaker's meal." },
  Love: { type: "Sacred Principle", description: "One of the three sacred principles in the Tablemaker's meal." },
  Whisken: { type: "Culture", description: "Cat-like people tied to Tohm Kyatt, Tabby Island, and Whisker Woods lore." },
  "Whisken People": { type: "Culture", description: "Cat-like people tied to Tabby Island, Whisker Woods, the Tablemaker faith, and two exodus events." },
  "Mas'eel Cult": { type: "Faction", description: "A cult that corrupts the Triadic faith into FEAST and hunts the Cat Cauldron and magical recipes." },
  "Mas'eel False Traders": { type: "Faction Operation", description: "Mas'eel agents who entered Tabby Island as traders, brought new foods, and hid their takeover behind hospitality." },
  "False Trader Spice": { type: "Ingredient", description: "A suspicious spice blend connected to Mas'eel infiltration and corrupted food culture." },
  "Lel Kai's Rescue Fleet": { type: "Story Event", description: "The rescue boats Lel Kai sent at Tohm's request during the second Whisken exodus." },
  "Lillia's Camp": { type: "Location", description: "A Faery Realm camp where Lillia can mass-produce Dark Culinary Arts with ambient magic." },
  "Mur'amar": { type: "Character", description: "A Mas'eel-linked stranger who presents the cult gently while searching for the Cat Cauldron and recipes." },
  "Whisken Village": { type: "Location", description: "The current Whisken settlement in Whisker Woods, built by known survivors of the second exodus." },
  "Cat Cauldron": { type: "Artifact", description: "An ancient Whisken cauldron awakened by Tohm and hunted by the Mas'eel Cult." },
  Osul: { type: "Location", description: "Gwen's home region before her work with Tohm and the Living Tavern." },
  Kap: { type: "Character", description: "A character tied to the corrupted pond trouble in Act 1." },
  "Living Tavern": { type: "Location / Artifact", description: "Tohm's magical tavern and major hub." },
  "Recipe Book": { type: "Artifact", description: "Tohm's magical recipe book, source of torn recipe pages and dangerous powers." },
  "Dark Culinary Arts": { type: "Magic System", description: "A corrupted form of magical cooking tied to Lillia and dangerous meals." },
  "Feast of Full Plates": { type: "Whisken Celebration", description: "An Act 1 Whisken feast celebrating food, abundance, and community." },
  "Boar Meat": { type: "Ingredient", description: "One of the remembered opening ingredients Gwen gathers for Tohm before the Feast of Full Plates." },
  Purfox: { type: "Ingredient", description: "One of the remembered opening ingredients Gwen gathers for Tohm before the feast." },
  Sunchee: { type: "Ingredient", description: "A bright ingredient tied to Gwen's opening gathering task and possible Fire Meal recipe." },
  Honey: { type: "Ingredient", description: "A possible Fire Meal ingredient used in Gwen's first magical meal." },
  "Crushed Purfox": { type: "Ingredient", description: "A possible prepared ingredient for Gwen's first Fire Meal." },
  Prawnhusk: { type: "Boss", description: "Gwen's first major boss, a corrupted lake creature that teaches serious combat." },
  Crayhusks: { type: "Enemy", description: "Early corrupted insect enemies appearing around Whisker Woods and Kap's lake." },
  Dappleflys: { type: "Enemy", description: "Early corrupted flying insects appearing around Whisker Woods and Kap's lake." },
  "Egg Clusters": { type: "Hazard", description: "Corrupted insect nests or eggs that show the swarm claiming Whisker Woods." },
  "Bug Nests": { type: "Hazard", description: "Nest blockades and infestation points spreading through Whisker Woods." },
  Gloomfin: { type: "Ingredient / Fish", description: "A rare fish connected to corrupted waters that Kap hopes could become an incredible feast dish." },
  "Moonbutter Herb Roast": { type: "Dish", description: "A food idea Kap imagines pairing with a rare corrupted-water fish." },
  "Fire Meal": { type: "Magical Meal", description: "Gwen's first magical meal, granting fire power and triggering her first trance vision." },
  "The Between Table": { type: "Vision Realm", description: "A possible name for the place Gwen enters during first-time magical meal trances." },
  "The Feast Beyond": { type: "Vision Realm", description: "A possible name for the place Gwen enters during first-time magical meal trances." },
  "Magical Boar": { type: "Boss / Ingredient Source", description: "An Act 1 hunt teaching Gwen that stronger ingredients can create stronger magical meals." },
  "Magical Meals": { type: "Magic System", description: "Meals tied to flavor, memory, spirit, power, and the Tablemaker's deeper food magic." },
  "Bug Thief": { type: "Enemy / Mystery", description: "A strange Act 1 creature that steals from Gwen and later returns empowered by lightning." },
  "Lightning Bug Thief": { type: "Enemy / Mystery", description: "The empowered version of the bug thief, acting as a lure toward deeper danger." },
  Thairrott: { type: "Boss", description: "A giant skeleton beast guarding the cavern entrance in the darker half of Act 1." },
  "Cedrick the Grunt": { type: "Character / Ally", description: "A defeated grunt Gwen spares who later becomes a hooded ally tied to charm upgrades." },
  "Charm Upgrades": { type: "Upgrade System", description: "A progression system Cedrick may support after Gwen spares him." },
  Cedar: { type: "Character", description: "An Act 1 ally who initially fights Gwen and shelters Oswin." },
  Lyra: { type: "Character", description: "An Act 1 ally who initially fights Gwen before joining the growing ally network." },
  Oswin: { type: "Character", description: "An old alchemist suspicious of Tohm and knowledgeable about deeper food-magic corruption." },
  "Fish Oven": { type: "Artifact / Tool", description: "A possible food-related relic Oswin may point Gwen toward in Act 1." },
  "Mu'Ramar": { type: "Character / Mystery", description: "A boy at a destroyed camp whose timeline contradiction suggests something supernatural or tragic." },
  "Dog Person": { type: "Boss / Victim", description: "A tragic night-transformation boss changed by corrupted magical cookies." },
  "Magical Cookies": { type: "Corrupted Food", description: "Cookies that caused the dog person transformation and prove food magic can mutate people." },
  Brambrik: { type: "Soft Canon Character", description: "A flexible Act 1 scout, survivor, NPC, miniboss, or corrupted villager who may point Gwen toward the Ice Queen." },
  "Ice Queen": { type: "Boss", description: "The ruler of the frozen insect swarm and final Act 1 threat in Whisker Woods." },
  "Blizzard Meal": { type: "Magical Meal / Recipe", description: "The Act 1 recipe reward recovered after Gwen defeats the Ice Queen." },
  "Princess Lillia": { type: "Character", description: "Major antagonist hinted through Gwen's Fire Meal trance as a little princess in a purple nightgown." }
};

const linkableTerms = Array.from(
  new Set([
    ...Object.keys(fallbackLore),
    ...defaultStoryChapters.flatMap((chapter) => [
      chapter.title,
      ...chapter.relatedLore,
      ...chapter.pages.flatMap((page) => [page.title, ...page.relatedLore])
    ])
  ])
).sort((left, right) => right.length - left.length);

export function StoryJourneyPage({ entries, bestiary, readOnly = false, onOpenEntry, onOpenCreature }: StoryJourneyPageProps) {
  const initialStoryData = useMemo(() => {
    const chapters = loadStoryChapters();
    return {
      chapters,
      storedState: loadStoryJourneyState(chapters)
    };
  }, []);
  const [chapters, setChapters] = useState<StoryChapter[]>(initialStoryData.chapters);
  const storedState = initialStoryData.storedState;
  const [selectedChapterId, setSelectedChapterId] = useState(storedState.selectedChapterId);
  const [activeScope, setActiveScope] = useState<StoryJourneyScope>(storedState.activeScope);
  const [pageByChapter, setPageByChapter] = useState(storedState.pageByChapter);
  const [completedChapterIds, setCompletedChapterIds] = useState<string[]>(storedState.completedChapterIds);
  const [readerOpen, setReaderOpen] = useState(false);
  const [selectedLoreTerm, setSelectedLoreTerm] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [pageTurnKey, setPageTurnKey] = useState(0);
  const [storyEditMode, setStoryEditMode] = useState(false);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);

  const scopeChapters = useMemo(() => chaptersForScope(chapters, activeScope), [activeScope, chapters]);
  const selectedIndex = Math.max(0, scopeChapters.findIndex((chapter) => chapter.id === selectedChapterId));
  const selectedChapterOrderIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === selectedChapterId));
  const selectedChapter = scopeChapters[selectedIndex] || scopeChapters[0] || chapters.find((chapter) => chapter.id === selectedChapterId) || chapters[0];
  const selectedScopeOption = storyJourneyScopeOptions.find((option) => option.id === activeScope) || storyJourneyScopeOptions[0];
  const scopeCounts = useMemo(() => buildScopeCounts(chapters), [chapters]);
  const hasScopeChapters = scopeChapters.length > 0;
  const currentPageIndex = Math.min(pageByChapter[selectedChapter.id] || 0, selectedChapter.pages.length - 1);
  const currentPage = selectedChapter.pages[currentPageIndex];
  const selectedLore = selectedLoreTerm ? resolveLorePreview(selectedLoreTerm, entries, bestiary) : null;
  const storyThreadChapters = selectedLoreTerm
    ? chapters.filter((chapter) => chapterContainsTerm(chapter, selectedLoreTerm))
    : [];
  const linkableTerms = useMemo(() => buildLinkableTerms(chapters), [chapters]);
  const canEditStory = !readOnly;
  const pageImageUrl = currentPage?.imageUrl ? resolveImageSourceUrl(currentPage.imageUrl) : "";
  const coverImageUrl = selectedChapter.coverImageUrl ? resolveImageSourceUrl(selectedChapter.coverImageUrl) : "";

  useEffect(() => {
    saveStoryJourneyState({
      selectedChapterId,
      activeScope,
      pageByChapter,
      completedChapterIds
    });
  }, [activeScope, selectedChapterId, pageByChapter, completedChapterIds]);

  useEffect(() => {
    saveStoryChapters(chapters);
  }, [chapters]);

  useEffect(() => {
    if (readOnly) setStoryEditMode(false);
  }, [readOnly]);

  useEffect(() => {
    if (!scopeChapters.length) return;
    if (!scopeChapters.some((chapter) => chapter.id === selectedChapterId)) {
      setSelectedChapterId(scopeChapters[0].id);
    }
  }, [scopeChapters, selectedChapterId]);

  const changeStoryScope = (scope: StoryJourneyScope) => {
    const nextChapters = chaptersForScope(chapters, scope);
    setActiveScope(scope);
    if (nextChapters[0]) {
      setSelectedChapterId(nextChapters[0].id);
      setPageByChapter((current) => ({ ...current, [nextChapters[0].id]: current[nextChapters[0].id] || 0 }));
    }
    setReaderOpen(false);
    setSelectedLoreTerm("");
    setPageTurnKey((key) => key + 1);
  };

  const selectChapter = (chapterId: string) => {
    const targetChapter = chapters.find((chapter) => chapter.id === chapterId);
    if (targetChapter && activeScope !== "history") {
      const targetScope = storyChapterScope(targetChapter);
      if (targetScope !== activeScope) setActiveScope(targetScope);
    }
    setSelectedChapterId(chapterId);
    setReaderOpen(false);
    setSelectedLoreTerm("");
    setPageTurnKey((key) => key + 1);
  };

  const setPage = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(selectedChapter.pages.length - 1, nextIndex));
    setPageByChapter((current) => ({ ...current, [selectedChapter.id]: clamped }));
    setPageTurnKey((key) => key + 1);
  };

  const proceedToNextChapter = () => {
    const nextChapter = scopeChapters[selectedIndex + 1];
    if (!nextChapter) return;
    setTransitioning(true);
    setCompletedChapterIds((current) =>
      current.includes(selectedChapter.id) ? current : [...current, selectedChapter.id]
    );
    window.setTimeout(() => {
      setSelectedChapterId(nextChapter.id);
      setPageByChapter((current) => ({ ...current, [nextChapter.id]: 0 }));
      setPageTurnKey((key) => key + 1);
      setTransitioning(false);
    }, 520);
  };

  const updateChapter = (chapterId: string, updater: (chapter: StoryChapter) => StoryChapter) => {
    setChapters((current) => current.map((chapter) => chapter.id === chapterId ? normalizeStoryChapter(updater(chapter), chapter.id) : chapter));
  };

  const updateSelectedChapter = (patch: Partial<StoryChapter>) => {
    updateChapter(selectedChapter.id, (chapter) => ({ ...chapter, ...patch }));
  };

  const updateCurrentPage = (patch: Partial<StoryPage>) => {
    updateChapter(selectedChapter.id, (chapter) => ({
      ...chapter,
      pages: chapter.pages.map((page, index) => index === currentPageIndex ? normalizeStoryPage({ ...page, ...patch }, `${chapter.id}-page-${index + 1}`) : page)
    }));
  };

  const saveChapterCoverAdjustment = (next: { imageUrl: string; imageFit: ImageFitSettings }) => {
    updateSelectedChapter({
      coverImageUrl: next.imageUrl,
      coverImageFit: normalizeImageFit(next.imageFit)
    });
  };

  const savePageImageAdjustment = (next: { imageUrl: string; imageFit: ImageFitSettings }) => {
    updateCurrentPage({
      imageUrl: next.imageUrl,
      imageFit: normalizeImageFit(next.imageFit)
    });
  };

  const saveStoryImageManager = (slots: ImageManagerSlotDraft[]) => {
    const chapterCover = slots.find((slot) => slot.id === "chapterCover");
    const pageImage = slots.find((slot) => slot.id === "pageImage");
    if (chapterCover) {
      updateSelectedChapter({
        coverImageUrl: chapterCover.imageUrl,
        coverImageFit: normalizeImageFit(chapterCover.imageFit)
      });
    }
    if (pageImage) {
      updateCurrentPage({
        imageUrl: pageImage.imageUrl,
        imageFit: normalizeImageFit(pageImage.imageFit)
      });
    }
    setImageManagerOpen(false);
  };

  const addChapter = () => {
    const nextNumber = chapters.length + 1;
    const template = storyChapterTemplateForScope(activeScope, nextNumber);
    const title = template.title;
    const id = uniqueId(slugify(title), chapters.map((chapter) => chapter.id));
    const chapter = normalizeStoryChapter({
      id,
      title,
      subtitle: template.subtitle,
      timelineStartLabel: template.timelineStartLabel,
      timelineEndLabel: template.timelineEndLabel,
      timelineStartPercent: template.timelineStartPercent,
      timelineEndPercent: template.timelineEndPercent,
      era: template.era,
      revealLevel: "Player-Facing",
      shortDescription: template.shortDescription,
      coverImageUrl: "",
      relatedLore: [],
      pages: [
        {
          id: `${id}-page-1`,
          title: "First Page",
          text: "Start writing this chapter page here.",
          imageUrl: "",
          imagePlaceholder: "Add an image link or describe the art needed for this page.",
          caption: "",
          relatedLore: []
        }
      ]
    });
    setChapters((current) => [...current, chapter]);
    setSelectedChapterId(chapter.id);
    setPageByChapter((current) => ({ ...current, [chapter.id]: 0 }));
    setReaderOpen(false);
    setStoryEditMode(true);
  };

  const deleteSelectedChapter = () => {
    if (chapters.length <= 1) return;
    const confirmed = window.confirm(`Delete "${selectedChapter.title}" from Story Journey?`);
    if (!confirmed) return;
    const nextChapters = chapters.filter((chapter) => chapter.id !== selectedChapter.id);
    setChapters(nextChapters);
    const nextScopeChapters = chaptersForScope(nextChapters, activeScope);
    setSelectedChapterId(nextScopeChapters[Math.max(0, selectedIndex - 1)]?.id || nextScopeChapters[0]?.id || nextChapters[Math.max(0, selectedChapterOrderIndex - 1)]?.id || nextChapters[0].id);
    setReaderOpen(false);
  };

  const moveSelectedChapter = (direction: -1 | 1) => {
    const targetIndex = selectedChapterOrderIndex + direction;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;
    setChapters((current) => {
      const next = [...current];
      const [chapter] = next.splice(selectedChapterOrderIndex, 1);
      next.splice(targetIndex, 0, chapter);
      return next;
    });
  };

  const addPage = () => {
    updateChapter(selectedChapter.id, (chapter) => {
      const nextIndex = chapter.pages.length + 1;
      const page: StoryPage = normalizeStoryPage({
        id: `${chapter.id}-page-${Date.now()}`,
        title: `Page ${nextIndex}`,
        text: "Write this story page here.",
        imageUrl: "",
        imagePlaceholder: "Add an image link or describe the art needed for this page.",
        caption: "",
        relatedLore: []
      }, `${chapter.id}-page-${nextIndex}`);
      return { ...chapter, pages: [...chapter.pages, page] };
    });
    setPageByChapter((current) => ({ ...current, [selectedChapter.id]: selectedChapter.pages.length }));
    setPageTurnKey((key) => key + 1);
  };

  const deleteCurrentPage = () => {
    if (selectedChapter.pages.length <= 1) return;
    const confirmed = window.confirm(`Delete page "${currentPage.title}"?`);
    if (!confirmed) return;
    updateChapter(selectedChapter.id, (chapter) => ({
      ...chapter,
      pages: chapter.pages.filter((_, index) => index !== currentPageIndex)
    }));
    setPageByChapter((current) => ({ ...current, [selectedChapter.id]: Math.max(0, currentPageIndex - 1) }));
  };

  const openLoreFullPage = (preview: LorePreview) => {
    if (preview.entry) onOpenEntry(preview.entry);
    if (preview.creature) onOpenCreature(preview.creature);
  };

  const openLoreThread = () => {
    if (!storyThreadChapters.length) return;
    selectChapter(storyThreadChapters[0].id);
  };

  return (
    <section className={`story-journey-page ${readerOpen ? "reading" : ""} ${storyEditMode ? "story-edit-mode" : ""}`}>
      {!readerOpen ? (
        <>
          <header className="story-journey-hero">
            <div>
              <p>Interactive Storybook Timeline</p>
              <h1 className="font-display">Story Journey</h1>
              <span>
                {selectedScopeOption.description}
              </span>
            </div>
            <div className="story-journey-toolbar">
              {canEditStory && (
                <>
                  <button className="button-frame" onClick={() => setStoryEditMode((current) => !current)}>
                    <Icon name="Edit3" className="h-5 w-5" />
                    {storyEditMode ? "Done Editing" : "Edit Story Journey"}
                  </button>
                  {storyEditMode && (
                    <>
                      <button className="button-frame" onClick={() => setImageManagerOpen(true)}>
                        <Icon name="Image" className="h-5 w-5" />
                        Images
                      </button>
                      <button className="button-frame" onClick={addChapter}>
                        <Icon name="Plus" className="h-5 w-5" />
                        Add Chapter
                      </button>
                    </>
                  )}
                </>
              )}
              <button className="button-frame story-journey-start-button" onClick={() => setReaderOpen(true)} disabled={!hasScopeChapters}>
                <Icon name="BookOpen" className="h-5 w-5" />
                Start Reading
              </button>
            </div>
          </header>

          <nav className="story-act-selector" aria-label="Story Journey act selector">
            {storyJourneyScopeOptions.map((option) => {
              const chapterCount = scopeCounts[option.id] || 0;
              return (
                <button
                  key={option.id}
                  className={activeScope === option.id ? "active" : ""}
                  onClick={() => changeStoryScope(option.id)}
                  type="button"
                >
                  <span>{option.eyebrow}</span>
                  <strong>{option.label}</strong>
                  <em>{chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}</em>
                </button>
              );
            })}
          </nav>

          {hasScopeChapters ? (
            <>
              <div className="story-chapter-capsules">
                {scopeChapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    className={[
                      "story-chapter-capsule",
                      chapter.id === selectedChapter.id ? "selected" : "",
                      completedChapterIds.includes(chapter.id) ? "completed" : ""
                    ].filter(Boolean).join(" ")}
                    onClick={() => selectChapter(chapter.id)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{chapter.title}</strong>
                    <em>{chapter.era}</em>
                  </button>
                ))}
              </div>

              <StoryTimeline chapter={selectedChapter} compact={false} />

              <section key={selectedChapter.id} className="story-journey-preview">
                <div className="story-preview-copy">
                  <span>{selectedChapter.timelineStartLabel} - {selectedChapter.timelineEndLabel}</span>
                  <h2 className="font-display">{selectedChapter.title}</h2>
                  <p>{selectedChapter.shortDescription}</p>
                  <div>
                    <strong>{selectedChapter.revealLevel}</strong>
                    <strong>{selectedChapter.pages.length} pages</strong>
                    <strong>{selectedChapter.era}</strong>
                  </div>
                  <button className="button-frame story-journey-start-button" onClick={() => setReaderOpen(true)}>
                    <Icon name="BookOpen" className="h-5 w-5" />
                    Start Reading
                  </button>
                </div>
                <div className="story-preview-card">
                  {coverImageUrl && (
                    storyEditMode ? (
                      <AdjustableImage
                        src={coverImageUrl}
                        label={`${selectedChapter.title} chapter cover`}
                        imageFit={selectedChapter.coverImageFit}
                        aspectRatio="16 / 9"
                        canAdjust
                        className="story-preview-cover-adjustable"
                        imageClassName="story-preview-cover-image"
                        overlayLabel="Adjust Cover"
                        onSave={saveChapterCoverAdjustment}
                      />
                    ) : (
                      <DriveAwareImage className="story-preview-cover-image" src={coverImageUrl} alt="" />
                    )
                  )}
                  <p>Selected Chapter</p>
                  <h3>{selectedChapter.subtitle}</h3>
                  <div className="story-preview-lore">
                    {selectedChapter.relatedLore.map((term) => (
                      <button key={term} onClick={() => setSelectedLoreTerm(term)}>{term}</button>
                    ))}
                  </div>
                </div>
              </section>
              {storyEditMode && (
                <StoryChapterEditor
                  chapter={selectedChapter}
                  chapterIndex={selectedChapterOrderIndex}
                  chapterCount={chapters.length}
                  onChange={updateSelectedChapter}
                  onMove={moveSelectedChapter}
                  onDelete={deleteSelectedChapter}
                />
              )}
            </>
          ) : (
            <section className="story-scope-empty">
              <Icon name="BookOpen" className="h-10 w-10" />
              <p>{selectedScopeOption.eyebrow}</p>
              <h2 className="font-display">{selectedScopeOption.emptyTitle}</h2>
              <span>{selectedScopeOption.description}</span>
              {canEditStory && (
                <button className="button-frame" onClick={addChapter}>
                  <Icon name="Plus" className="h-5 w-5" />
                  Add {selectedScopeOption.label} Chapter
                </button>
              )}
            </section>
          )}
        </>
      ) : (
        <section className={`story-reader-shell ${transitioning ? "transitioning" : ""}`}>
          <header className="story-reader-header">
            <button className="story-reader-exit" onClick={() => setReaderOpen(false)}>
              <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
              Exit Chapter
            </button>
            <div>
              <p>{selectedChapter.era} / {selectedChapter.revealLevel}</p>
              <h1 className="font-display">{selectedChapter.title}</h1>
            </div>
            <span>Page {currentPageIndex + 1} of {selectedChapter.pages.length}</span>
          </header>

          <StoryTimeline chapter={selectedChapter} compact />

          <article key={`${selectedChapter.id}-${currentPageIndex}-${pageTurnKey}`} className="story-book-page">
            <div className="story-page-art">
              <div>
                {pageImageUrl ? (
                  storyEditMode ? (
                    <AdjustableImage
                      src={pageImageUrl}
                      label={`${currentPage.title} page art`}
                      imageFit={currentPage.imageFit}
                      aspectRatio="4 / 3"
                      canAdjust
                      className="story-page-image-adjustable"
                      imageClassName="story-page-image"
                      overlayLabel="Adjust Page Art"
                      onSave={savePageImageAdjustment}
                    />
                  ) : (
                    <DriveAwareImage className="story-page-image" src={pageImageUrl} alt="" />
                  )
                ) : (
                  <>
                    <Icon name="Image" className="h-10 w-10" />
                    <strong>{currentPage.imagePlaceholder || "Story image placeholder"}</strong>
                  </>
                )}
              </div>
              {currentPage.caption && <p>{currentPage.caption}</p>}
            </div>
            <div className="story-page-copy">
              <span>{selectedChapter.timelineStartLabel} - {selectedChapter.timelineEndLabel}</span>
              <h2 className="font-display">{currentPage.title}</h2>
              <p>{renderLinkedStoryText(currentPage.text, setSelectedLoreTerm, linkableTerms)}</p>
              <div className="story-page-lore-links">
                {currentPage.relatedLore.map((term) => (
                  <button key={term} onClick={() => setSelectedLoreTerm(term)}>{term}</button>
                ))}
              </div>
            </div>
          </article>
          {storyEditMode && (
            <StoryPageEditor
              page={currentPage}
              pageIndex={currentPageIndex}
              pageCount={selectedChapter.pages.length}
              onChange={updateCurrentPage}
              onAddPage={addPage}
              onDeletePage={deleteCurrentPage}
            />
          )}

          <footer className="story-reader-controls">
            <button onClick={() => setPage(currentPageIndex - 1)} disabled={currentPageIndex <= 0}>
              Previous Page
            </button>
            <div className="story-page-dots">
              {selectedChapter.pages.map((page, index) => (
                <button
                  key={page.id || page.title}
                  className={index === currentPageIndex ? "active" : ""}
                  onClick={() => setPage(index)}
                  title={page.title}
                />
              ))}
            </div>
            {currentPageIndex < selectedChapter.pages.length - 1 ? (
              <button className="button-frame" onClick={() => setPage(currentPageIndex + 1)}>
                Next Page
              </button>
            ) : selectedIndex < scopeChapters.length - 1 ? (
              <button className="button-frame story-proceed-button" onClick={proceedToNextChapter}>
                Proceed to Next Chapter
              </button>
            ) : (
              <button className="button-frame" onClick={() => setReaderOpen(false)}>
                Return to Story Journey
              </button>
            )}
            {canEditStory && (
              <>
                {storyEditMode && (
                  <button onClick={() => setImageManagerOpen(true)}>
                    <Icon name="Image" className="h-4 w-4" />
                    Images
                  </button>
                )}
                <button onClick={() => setStoryEditMode((current) => !current)}>
                  {storyEditMode ? "Done Editing" : "Edit Chapter"}
                </button>
              </>
            )}
          </footer>
        </section>
      )}

      {selectedLore && (
        <aside className="story-lore-panel">
          <button className="story-lore-close" onClick={() => setSelectedLoreTerm("")}>X</button>
          <p>{selectedLore.type}</p>
          <h2 className="font-display">{selectedLore.name}</h2>
          <span>{selectedLore.description}</span>
          <div>
            <button className="button-frame" onClick={() => openLoreFullPage(selectedLore)} disabled={!selectedLore.entry && !selectedLore.creature}>
              Open Full Page
            </button>
            <button onClick={openLoreThread} disabled={!storyThreadChapters.length}>
              View Story Thread
            </button>
            <button onClick={() => openLoreFullPage(selectedLore)} disabled={!selectedLore.entry && !selectedLore.creature}>
              View Related Art Vault
            </button>
          </div>
          {storyThreadChapters.length > 0 && (
            <section>
              <strong>Appears in</strong>
              {storyThreadChapters.map((chapter) => (
                <button key={chapter.id} onClick={() => selectChapter(chapter.id)}>{chapter.title}</button>
              ))}
            </section>
          )}
        </aside>
      )}
      {imageManagerOpen && (
        <ImageManagerModal
          title={`${selectedChapter.title} Image Manager`}
          subtitle="Assign, import, upload, download, and frame this chapter cover plus the current story page image."
          slots={[
            {
              id: "chapterCover",
              label: "Chapter Cover Image",
              description: "The preview/cover art for this story chapter.",
              imageUrl: selectedChapter.coverImageUrl || "",
              imageFit: selectedChapter.coverImageFit,
              frameWidth: 360,
              frameHeight: 200,
              uploadNameContext: {
                subjectName: selectedChapter.title,
                categoryName: "Story Journey",
                slotName: "Chapter Cover",
                sourceType: "Story Chapter"
              }
            },
            {
              id: "pageImage",
              label: `Page Image: ${currentPage.title}`,
              description: "The image used on the currently selected storybook page.",
              imageUrl: currentPage.imageUrl || "",
              imageFit: currentPage.imageFit,
              frameWidth: 340,
              frameHeight: 240,
              uploadNameContext: {
                subjectName: selectedChapter.title,
                categoryName: "Story Journey",
                slotName: currentPage.title || `Page ${currentPageIndex + 1}`,
                sourceType: "Story Page"
              }
            }
          ]}
          onClose={() => setImageManagerOpen(false)}
          onSave={saveStoryImageManager}
        />
      )}
    </section>
  );
}

function StoryChapterEditor({
  chapter,
  chapterIndex,
  chapterCount,
  onChange,
  onMove,
  onDelete
}: {
  chapter: StoryChapter;
  chapterIndex: number;
  chapterCount: number;
  onChange: (patch: Partial<StoryChapter>) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <section className="story-editor-panel">
      <header>
        <div>
          <p>Chapter editor</p>
          <h2 className="font-display">Edit Selected Chapter</h2>
        </div>
        <div className="story-editor-actions">
          <button onClick={() => onMove(-1)} disabled={chapterIndex <= 0}>Move Up</button>
          <button onClick={() => onMove(1)} disabled={chapterIndex >= chapterCount - 1}>Move Down</button>
          <button className="danger" onClick={onDelete} disabled={chapterCount <= 1}>Delete Chapter</button>
        </div>
      </header>
      <div className="story-editor-grid">
        <StoryTextField label="Chapter title" value={chapter.title} onChange={(value) => onChange({ title: value })} />
        <StoryTextField label="Subtitle" value={chapter.subtitle} onChange={(value) => onChange({ subtitle: value })} />
        <StoryTextField label="Era" value={chapter.era} onChange={(value) => onChange({ era: value })} />
        <label>
          <span>Reveal level</span>
          <CustomSelect
            value={chapter.revealLevel}
            onChange={(value) => onChange({ revealLevel: value as StoryChapter["revealLevel"] })}
            options={["Ancient History", "Pre-Game", "Player-Facing", "Hidden Truth", "Minor Spoiler", "Major Spoiler"]}
          />
        </label>
        <StoryTextField label="Timeline start label" value={chapter.timelineStartLabel} onChange={(value) => onChange({ timelineStartLabel: value })} />
        <StoryTextField label="Timeline end label" value={chapter.timelineEndLabel} onChange={(value) => onChange({ timelineEndLabel: value })} />
        <StoryNumberField label="Timeline start %" value={chapter.timelineStartPercent} onChange={(value) => onChange({ timelineStartPercent: value })} />
        <StoryNumberField label="Timeline end %" value={chapter.timelineEndPercent} onChange={(value) => onChange({ timelineEndPercent: value })} />
        <label className="wide">
          <span>Chapter cover image</span>
          <DriveImageSourceControls
            value={chapter.coverImageUrl || ""}
            label={`${chapter.title || "Chapter"} cover`}
            title="Choose Chapter Cover Image"
            onChange={(coverImageUrl) => onChange({ coverImageUrl })}
          />
        </label>
        <label className="wide">
          <span>Short chapter description</span>
          <textarea value={chapter.shortDescription} onChange={(event) => onChange({ shortDescription: event.target.value })} />
        </label>
        <label className="wide">
          <span>Related lore terms</span>
          <input value={chapter.relatedLore.join(", ")} onChange={(event) => onChange({ relatedLore: splitTerms(event.target.value) })} placeholder="Gwen, Tohm Kyatt, Whisker Woods..." />
        </label>
      </div>
    </section>
  );
}

function StoryPageEditor({
  page,
  pageIndex,
  pageCount,
  onChange,
  onAddPage,
  onDeletePage
}: {
  page: StoryPage;
  pageIndex: number;
  pageCount: number;
  onChange: (patch: Partial<StoryPage>) => void;
  onAddPage: () => void;
  onDeletePage: () => void;
}) {
  return (
    <section className="story-editor-panel story-page-editor">
      <header>
        <div>
          <p>Page editor</p>
          <h2 className="font-display">Edit Page {pageIndex + 1}</h2>
        </div>
        <div className="story-editor-actions">
          <button onClick={onAddPage}>Add Page</button>
          <button className="danger" onClick={onDeletePage} disabled={pageCount <= 1}>Delete Page</button>
        </div>
      </header>
      <div className="story-editor-grid">
        <StoryTextField label="Page title" value={page.title} onChange={(value) => onChange({ title: value })} />
        <label className="wide">
          <span>Story text</span>
          <textarea className="story-editor-textarea-large" value={page.text} onChange={(event) => onChange({ text: event.target.value })} />
        </label>
        <label className="wide">
          <span>Page image</span>
          <DriveImageSourceControls
            value={page.imageUrl || ""}
            label={`${page.title || "Story page"} image`}
            title="Choose Story Page Image"
            onChange={(imageUrl) => onChange({ imageUrl })}
          />
        </label>
        <label className="wide">
          <span>Image placeholder / art direction</span>
          <textarea value={page.imagePlaceholder || ""} onChange={(event) => onChange({ imagePlaceholder: event.target.value })} placeholder="Describe the image needed for this page." />
        </label>
        <label className="wide">
          <span>Image caption</span>
          <input value={page.caption || ""} onChange={(event) => onChange({ caption: event.target.value })} placeholder="Optional caption under the image." />
        </label>
        <label className="wide">
          <span>Related lore terms</span>
          <input value={page.relatedLore.join(", ")} onChange={(event) => onChange({ relatedLore: splitTerms(event.target.value) })} placeholder="Gwen, Tohm Kyatt, Whisker Woods..." />
        </label>
      </div>
    </section>
  );
}

function StoryTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StoryNumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), 0, 100))}
      />
    </label>
  );
}

function StoryTimeline({ chapter, compact }: { chapter: StoryChapter; compact: boolean }) {
  return (
    <section className={`story-timeline ${compact ? "compact" : ""}`}>
      <div className="story-timeline-title">
        <span>{chapter.timelineStartLabel} - {chapter.timelineEndLabel}</span>
        <strong>{chapter.title}</strong>
      </div>
      <div className="story-timeline-track">
        <i />
        <b
          style={{
            left: `${chapter.timelineStartPercent}%`,
            width: `${Math.max(4, chapter.timelineEndPercent - chapter.timelineStartPercent)}%`
          }}
        />
        {timelineLabels.map((tick) => (
          <span key={tick.label} style={{ left: `${tick.percent}%` }}>
            <em />
            {!compact && <small>{tick.label}</small>}
          </span>
        ))}
      </div>
    </section>
  );
}

function renderLinkedStoryText(text: string, onTermClick: (term: string) => void, linkableTerms: string[]) {
  const terms = linkableTerms.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
  if (!terms.length) return text;
  const regex = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return text.split(regex).map((part, index) => {
    const term = terms.find((candidate) => candidate.toLowerCase() === part.toLowerCase());
    if (!term) return part;
    return (
      <button key={`${part}-${index}`} className="story-inline-lore-link" onClick={() => onTermClick(term)}>
        {part}
      </button>
    );
  });
}

function storyText(...paragraphs: string[]) {
  return paragraphs.join("\n\n");
}

function resolveLorePreview(term: string, entries: LoreEntry[], bestiary: BestiaryCreature[]): LorePreview {
  const normalized = normalizeTerm(term);
  const entry = entries.find((candidate) =>
    [candidate.title, ...candidate.tags].some((value) => normalizeTerm(value) === normalized)
  ) || entries.find((candidate) => normalizeTerm(candidate.title).includes(normalized));
  if (entry) {
    return {
      name: entry.title,
      type: entry.type || entry.category,
      description: richTextToPlainText(entry.summary || entry.publicDescription || entry.internalLore || "No description has been written yet."),
      entry
    };
  }

  const creature = bestiary.find((candidate) => normalizeTerm(candidate.name) === normalized);
  if (creature) {
    return {
      name: creature.name,
      type: creature.type || "Creature",
      description: creature.description || creature.overview || "No creature description has been written yet.",
      creature
    };
  }

  const fallback = fallbackLore[term] || { type: "Lore Term", description: "A story term that can be connected to a full lore module later." };
  return {
    name: term,
    type: fallback.type,
    description: fallback.description
  };
}

function chapterContainsTerm(chapter: StoryChapter, term: string) {
  const normalized = normalizeTerm(term);
  return normalizeTerm([
    chapter.title,
    chapter.subtitle,
    chapter.shortDescription,
    ...chapter.relatedLore,
    ...chapter.pages.flatMap((page) => [page.title, page.text, ...page.relatedLore])
  ].join(" ")).includes(normalized);
}

function normalizeStoryJourneyScope(value: unknown): StoryJourneyScope {
  if (value === "history" || value === "act1" || value === "act2" || value === "act3") return value;
  return "history";
}

function chaptersForScope(chapters: StoryChapter[], scope: StoryJourneyScope) {
  if (scope === "history") return chapters;
  return chapters.filter((chapter) => storyChapterScope(chapter) === scope);
}

function storyChapterScope(chapter: StoryChapter): StoryJourneyScope {
  const haystack = normalizeTerm([
    chapter.id,
    chapter.title,
    chapter.subtitle,
    chapter.era,
    chapter.timelineStartLabel,
    chapter.timelineEndLabel,
    chapter.shortDescription,
    ...chapter.relatedLore,
    ...chapter.pages.flatMap((page) => [page.title, ...page.relatedLore])
  ].join(" "));

  if (/\bact\s*1\b/.test(haystack) || haystack.includes("act-one")) return "act1";
  if (/\bact\s*2\b/.test(haystack) || haystack.includes("act-two")) return "act2";
  if (/\bact\s*3\b/.test(haystack) || haystack.includes("act-three") || haystack.includes("final act")) return "act3";
  return "history";
}

function buildScopeCounts(chapters: StoryChapter[]): Record<StoryJourneyScope, number> {
  return chapters.reduce<Record<StoryJourneyScope, number>>((counts, chapter) => {
    counts.history += 1;
    const scope = storyChapterScope(chapter);
    if (scope !== "history") counts[scope] += 1;
    return counts;
  }, { history: 0, act1: 0, act2: 0, act3: 0 });
}

function storyChapterTemplateForScope(scope: StoryJourneyScope, nextNumber: number) {
  if (scope === "act1") {
    return {
      title: `Act 1 Chapter ${nextNumber}`,
      subtitle: "Add the opening playable story beat.",
      timelineStartLabel: "Act 1",
      timelineEndLabel: "Act 1",
      timelineStartPercent: 70,
      timelineEndPercent: 78,
      era: "Act 1",
      shortDescription: "Write the Act 1 story summary here."
    };
  }

  if (scope === "act2") {
    return {
      title: `Act 2 Chapter ${nextNumber}`,
      subtitle: "Add the middle-game story beat.",
      timelineStartLabel: "Act 2",
      timelineEndLabel: "Act 2",
      timelineStartPercent: 80,
      timelineEndPercent: 88,
      era: "Act 2",
      shortDescription: "Write the Act 2 story summary here."
    };
  }

  if (scope === "act3") {
    return {
      title: `Act 3 Chapter ${nextNumber}`,
      subtitle: "Add the late-game story beat.",
      timelineStartLabel: "Act 3",
      timelineEndLabel: "Final Act",
      timelineStartPercent: 90,
      timelineEndPercent: 98,
      era: "Act 3",
      shortDescription: "Write the Act 3 story summary here."
    };
  }

  return {
    title: `New History Chapter ${nextNumber}`,
    subtitle: "Add a history or lore timeline chapter.",
    timelineStartLabel: "Pre-Game",
    timelineEndLabel: "Pre-Game",
    timelineStartPercent: 50,
    timelineEndPercent: 56,
    era: "General History",
    shortDescription: "Write the general lore history summary here."
  };
}

function loadStoryJourneyState(chapters: StoryChapter[]): StoryJourneyState {
  try {
    const stored = localStorage.getItem(STORY_JOURNEY_STATE_KEY);
    if (!stored) return createDefaultStoryJourneyState(chapters);
    const parsed = JSON.parse(stored) as Partial<StoryJourneyState>;
    return {
      selectedChapterId: chapters.some((chapter) => chapter.id === parsed.selectedChapterId)
        ? String(parsed.selectedChapterId)
        : chapters[0].id,
      activeScope: normalizeStoryJourneyScope(parsed.activeScope),
      pageByChapter: typeof parsed.pageByChapter === "object" && parsed.pageByChapter !== null ? parsed.pageByChapter as Record<string, number> : {},
      completedChapterIds: Array.isArray(parsed.completedChapterIds)
        ? parsed.completedChapterIds.filter((id): id is string => typeof id === "string")
        : []
    };
  } catch {
    return createDefaultStoryJourneyState(chapters);
  }
}

function saveStoryJourneyState(state: StoryJourneyState) {
  try {
    localStorage.setItem(STORY_JOURNEY_STATE_KEY, JSON.stringify(state));
  } catch {
    // Story Journey progress is helpful, but the page still works without localStorage.
  }
}

function createDefaultStoryJourneyState(chapters = defaultStoryChapters): StoryJourneyState {
  return {
    selectedChapterId: chapters[0].id,
    activeScope: "history",
    pageByChapter: {},
    completedChapterIds: []
  };
}

function loadStoryChapters(): StoryChapter[] {
  try {
    const stored = localStorage.getItem(STORY_JOURNEY_CHAPTERS_KEY);
    if (!stored) return defaultStoryChapters.map((chapter) => normalizeStoryChapter(chapter));
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return defaultStoryChapters.map((chapter) => normalizeStoryChapter(chapter));
    const normalized = parsed.map((chapter, index) => normalizeStoryChapter(chapter, `story-chapter-${index + 1}`));
    return normalized.length
      ? mergeStoryExpansionChapters(normalized)
      : defaultStoryChapters.map((chapter) => normalizeStoryChapter(chapter));
  } catch {
    return defaultStoryChapters.map((chapter) => normalizeStoryChapter(chapter));
  }
}

function mergeStoryExpansionChapters(chapters: StoryChapter[]): StoryChapter[] {
  const next = [...chapters];
  defaultStoryChapters
    .filter((chapter) => storyExpansionChapterIds.has(chapter.id))
    .forEach((defaultChapter) => {
      const index = next.findIndex((chapter) => chapter.id === defaultChapter.id);
      if (index >= 0) {
        next[index] = preserveStoryChapterImages(next[index], defaultChapter);
        return;
      }

      const defaultIndex = defaultStoryChapters.findIndex((chapter) => chapter.id === defaultChapter.id);
      const laterDefaultIds = new Set(defaultStoryChapters.slice(defaultIndex + 1).map((chapter) => chapter.id));
      const insertIndex = next.findIndex((chapter) => laterDefaultIds.has(chapter.id));
      if (insertIndex >= 0) {
        next.splice(insertIndex, 0, normalizeStoryChapter(defaultChapter));
      } else {
        next.push(normalizeStoryChapter(defaultChapter));
      }
    });

  return next.map((chapter) => normalizeStoryChapter(chapter));
}

function preserveStoryChapterImages(currentChapter: StoryChapter, defaultChapter: StoryChapter): StoryChapter {
  return normalizeStoryChapter({
    ...defaultChapter,
    coverImageUrl: currentChapter.coverImageUrl || defaultChapter.coverImageUrl,
    coverImageFit: currentChapter.coverImageFit || defaultChapter.coverImageFit,
    pages: defaultChapter.pages.map((defaultPage, index) => {
      const currentPage = currentChapter.pages.find((page) => page.title === defaultPage.title) || currentChapter.pages[index];
      return {
        ...defaultPage,
        imageUrl: currentPage?.imageUrl || defaultPage.imageUrl,
        imageFit: currentPage?.imageFit || defaultPage.imageFit
      };
    })
  }, defaultChapter.id);
}

function saveStoryChapters(chapters: StoryChapter[]) {
  try {
    localStorage.setItem(STORY_JOURNEY_CHAPTERS_KEY, JSON.stringify(chapters));
  } catch {
    // Chapter authoring data is local-first; if browser storage is full, the page remains usable.
  }
}

function normalizeStoryChapter(value: Partial<StoryChapter>, fallbackId?: string): StoryChapter {
  const title = String(value.title || "Untitled Story Chapter");
  const id = String(value.id || fallbackId || slugify(title) || `story-chapter-${Date.now()}`);
  const startPercent = clamp(Number(value.timelineStartPercent), 0, 100);
  const endPercent = clamp(Number(value.timelineEndPercent), 0, 100);
  const pages = Array.isArray(value.pages) && value.pages.length
    ? value.pages.map((page, index) => normalizeStoryPage(page, `${id}-page-${index + 1}`))
    : [normalizeStoryPage({}, `${id}-page-1`)];

  return {
    id,
    title,
    subtitle: String(value.subtitle || "Add a chapter subtitle."),
    timelineStartLabel: String(value.timelineStartLabel || "Pre-Game"),
    timelineEndLabel: String(value.timelineEndLabel || value.timelineStartLabel || "Act 1"),
    timelineStartPercent: Math.min(startPercent, endPercent),
    timelineEndPercent: Math.max(startPercent, endPercent),
    era: String(value.era || "Draft"),
    revealLevel: normalizeRevealLevel(value.revealLevel),
    shortDescription: String(value.shortDescription || "Write the chapter preview here."),
    coverImageUrl: String(value.coverImageUrl || ""),
    coverImageFit: normalizeImageFit(value.coverImageFit),
    relatedLore: normalizeTermList(value.relatedLore),
    pages
  };
}

function normalizeStoryPage(value: Partial<StoryPage>, fallbackId: string): StoryPage {
  return {
    id: String(value.id || fallbackId),
    title: String(value.title || "Untitled Page"),
    text: String(value.text || "Write this story page here."),
    imageUrl: String(value.imageUrl || ""),
    imageFit: normalizeImageFit(value.imageFit),
    imagePlaceholder: String(value.imagePlaceholder || ""),
    caption: String(value.caption || ""),
    relatedLore: normalizeTermList(value.relatedLore)
  };
}

function normalizeRevealLevel(value: unknown): StoryChapter["revealLevel"] {
  if (
    value === "Ancient History" ||
    value === "Pre-Game" ||
    value === "Player-Facing" ||
    value === "Hidden Truth" ||
    value === "Minor Spoiler" ||
    value === "Major Spoiler"
  ) {
    return value;
  }
  return "Player-Facing";
}

function buildLinkableTerms(chapters: StoryChapter[]) {
  return Array.from(
    new Set([
      ...Object.keys(fallbackLore),
      ...chapters.flatMap((chapter) => [
        chapter.title,
        ...chapter.relatedLore,
        ...chapter.pages.flatMap((page) => [page.title, ...page.relatedLore])
      ])
    ])
  ).filter(Boolean).sort((left, right) => right.length - left.length);
}

function splitTerms(value: string) {
  return value.split(",").map((term) => term.trim()).filter(Boolean);
}

function normalizeTermList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((term) => String(term).trim()).filter(Boolean);
}

function slugify(value: string) {
  return normalizeTerm(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "story-chapter";
}

function uniqueId(base: string, existingIds: string[]) {
  let id = base;
  let counter = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  return id;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeTerm(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
