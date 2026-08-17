import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type {
  ArtVaultImageMetadata,
  BestiaryCreature,
  CharacterArtVault,
  ImageFitSettings,
  LoreEntry,
  StoryReference,
  StoryJourneyChapterRecord,
  StoryJourneyCallout,
  StoryJourneyData,
  StoryJourneyPageRecord,
  StoryJourneyScope,
  WorldBuildingCategoryId,
  WorldBuildingData,
  WorldBuildingEntry
} from "../types";
import {
  extractGoogleDriveFileId,
  googleDriveThumbnailUrl,
  googleDriveWebViewLink,
  imageFitToStyle,
  normalizeImageFit,
  resolveImageSourceUrl
} from "../utils/imageFit";
import { normalizeArtVault } from "../utils/entries";
import { normalizeCreatureArtVault } from "../utils/bestiary";
import { resolveArtVaultDriveFolder } from "../utils/artVaultDriveFolders";
import { isRichText, plainTextToRichHtml, richTextToPlainText } from "../utils/richText";
import {
  createSpeechifyAudio,
  fetchSpeechifyRecordingStatus,
  fetchSpeechifyVoices,
  loadSpeechifyRecordedAudio,
  recordSpeechifyTimedAudio,
  splitSpeechifyText,
  type SpeechifyRecordingSectionStatus,
  type SpeechifySpeechMark,
  type SpeechifyVoice
} from "../utils/speechify";
import { AdjustableImage } from "./AdjustableImage";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { Icon } from "./Icon";
import { LoreKeywordHoverBoundary } from "./LoreKeywordText";
import { RichLoreText, RichTextEditor } from "./RichText";
import {
  ACT_ONE_STORY_CHAPTER_IDS,
  LEGACY_ACT_ONE_CHAPTER_ID,
  actOneStoryChapters
} from "../data/actOneCanon";

const STORY_JOURNEY_STATE_KEY = "tavernCookBookStoryJourneyState";
const STORY_JOURNEY_CHAPTERS_KEY = "tavernCookBookStoryJourneyChapters";
const storyExpansionChapterIds = new Set([
  ...ACT_ONE_STORY_CHAPTER_IDS,
  "truth-of-tabby-island",
  "the-maseel-hunt"
]);

interface StoryJourneyPageProps {
  entries: LoreEntry[];
  bestiary: BestiaryCreature[];
  worldBuilding: WorldBuildingData;
  storyReferences: StoryReference[];
  storyJourney: StoryJourneyData;
  readOnly?: boolean;
  canEditStory?: boolean;
  onOpenEntry: (entry: LoreEntry) => void;
  onOpenCreature: (creature: BestiaryCreature) => void;
  onOpenWorldEntry: (category: WorldBuildingCategoryId, entryId: string) => void;
  onSaveEntry: (entry: LoreEntry) => void;
  onSaveCreature: (creature: BestiaryCreature) => void;
  onWorldBuildingChange: (worldBuilding: WorldBuildingData) => void;
  onStoryJourneyChange: (storyJourney: StoryJourneyData) => void;
}

type StoryChapter = StoryJourneyChapterRecord;
type StoryPage = StoryJourneyPageRecord;

interface StoryJourneyState {
  selectedChapterId: string;
  activeScope: StoryJourneyScope;
  pageByChapter: Record<string, number>;
  completedChapterIds: string[];
}

type StoryScribeScope = "currentPage" | "wholeChapter" | "wholeJourney";
type StoryReadingDepth = "overview" | "standard" | "detailed";
type StoryLibrarySectionId = "peoples" | "characters" | "places" | "factions" | "magic" | "creatures" | "quests" | "lore";

interface StoryLibraryItem {
  id: string;
  title: string;
  sectionId: StoryLibrarySectionId;
  sourceType: "entry" | "world" | "creature";
  eyebrow: string;
  summary: string;
  fullText: string;
  tags: string[];
  facts: Array<{ label: string; value: string }>;
  linkedStoryReferenceIds: string[];
  entry?: LoreEntry;
  worldEntry?: WorldBuildingEntry;
  creature?: BestiaryCreature;
}

interface StoryLibrarySection {
  id: StoryLibrarySectionId;
  label: string;
  description: string;
  items: StoryLibraryItem[];
}

interface StoryNarrationWordTarget {
  value: string;
  startNode: Text;
  endNode: Text;
  nodeStart: number;
  nodeEnd: number;
  inputStart: number;
  inputEnd: number;
}

interface StoryNarrationChunk {
  text: string;
  speechText: string;
  inputStart: number;
  inputEnd: number;
  words: StoryNarrationWordTarget[];
  chapterId: string;
  chapterTitle: string;
  sectionTitle: string;
  chapterMarkers: Array<{ chapterId: string; chapterTitle: string; inputOffset: number }>;
}

const SPEECHIFY_PRICE_PER_MILLION_CHARACTERS_USD = 10;
const SPEECHIFY_FRESH_RECORDING_CAP_USD = 1.5;
type StoryNarrationKind = "heading" | "callout" | "prose";

interface StoryNarrationCatalogSection extends SpeechifyRecordingSectionStatus {
  chapterId: string;
  chapterTitle: string;
  sectionTitle: string;
  inputStart: number;
  inputEnd: number;
  chapterMarkers: Array<{ chapterId: string; chapterTitle: string; inputOffset: number }>;
}

interface StoryNarrationChapterGroup {
  id: string;
  title: string;
  firstChunkIndex: number;
  inputOffset: number;
  startMs: number;
  sectionCount: number;
  recordedCount: number;
  durationMs: number;
}

interface StoryNarrationRecordingState {
  phase: "idle" | "checking" | "recording" | "ready" | "partial" | "error";
  total: number;
  recorded: number;
  current: number;
  message: string;
}

interface StoryNarrationSectionAction {
  chapterId: string;
  phase: "idle" | "checking" | "recording" | "ready" | "error";
  current: number;
  total: number;
}

interface StoryScribeChapterPatch {
  title?: string;
  subtitle?: string;
  timelineStartLabel?: string;
  timelineEndLabel?: string;
  timelineStartPercent?: number;
  timelineEndPercent?: number;
  era?: string;
  revealLevel?: StoryChapter["revealLevel"];
  shortDescription?: string;
  overviewText?: string;
  developerNotes?: string;
  relatedLore?: string[];
}

interface StoryScribePagePatch {
  pageId?: string;
  pageIndex?: number;
  title?: string;
  text?: string;
  detailedText?: string;
  developerNotes?: string;
  imagePlaceholder?: string;
  caption?: string;
  relatedLore?: string[];
  callouts?: StoryJourneyCallout[];
}

interface StoryScribePatch {
  summary: string;
  chapterPatch?: StoryScribeChapterPatch;
  pagePatches: StoryScribePagePatch[];
  newPages: StoryScribePagePatch[];
  warnings: string[];
}

interface StoryScribeChapterDraft extends StoryScribePatch {
  chapterId: string;
}

interface StoryScribeJourneyPatch {
  summary: string;
  chapterPatches: StoryScribeChapterDraft[];
  warnings: string[];
}

interface LorePreview {
  name: string;
  type: string;
  description: string;
  entry?: LoreEntry;
  creature?: BestiaryCreature;
  worldEntry?: WorldBuildingEntry;
}

interface StoryInspectorImage {
  id: string;
  label: string;
  url: string;
  webViewLink: string;
  imageFit?: ImageFitSettings;
  source: string;
}

interface StoryInspectorSubject {
  id: string;
  title: string;
  type: string;
  summary: string;
  tags: string[];
  images: StoryInspectorImage[];
  entry?: LoreEntry;
  creature?: BestiaryCreature;
  worldEntry?: WorldBuildingEntry;
  chapter?: StoryChapter;
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
    label: "Act I — The Queen Beneath the Frost",
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

const legacyDefaultStoryChapters: StoryChapter[] = [
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

const defaultStoryChapters: StoryChapter[] = legacyDefaultStoryChapters.flatMap((chapter) =>
  chapter.id === LEGACY_ACT_ONE_CHAPTER_ID ? actOneStoryChapters : [chapter]
);

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
  "Masil Cult Leader": { type: "Character / False Prophet", description: "The cult's charismatic founder, caught between his own worldly ambition and the false angel whose revelations give him power." },
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

export function StoryJourneyPage({
  entries,
  bestiary,
  worldBuilding,
  storyReferences,
  storyJourney,
  readOnly = false,
  canEditStory = false,
  onOpenEntry,
  onOpenCreature,
  onOpenWorldEntry,
  onSaveEntry,
  onSaveCreature,
  onWorldBuildingChange,
  onStoryJourneyChange
}: StoryJourneyPageProps) {
  const initialStoryData = useMemo(() => {
    const chapters = storyJourney.chapters.length
      ? mergeStoryExpansionChapters(storyJourney.chapters)
      : loadStoryChapters();
    return {
      chapters,
      storedState: loadStoryJourneyState(chapters)
    };
  }, []);
  const lastSharedStoryHashRef = useRef("");
  const [chapters, setChapters] = useState<StoryChapter[]>(initialStoryData.chapters);
  const storedState = initialStoryData.storedState;
  const [selectedChapterId, setSelectedChapterId] = useState(storedState.selectedChapterId);
  const [activeScope, setActiveScope] = useState<StoryJourneyScope>(storedState.activeScope);
  const [pageByChapter, setPageByChapter] = useState(storedState.pageByChapter);
  const [completedChapterIds, setCompletedChapterIds] = useState<string[]>(storedState.completedChapterIds);
  const [readerOpen, setReaderOpen] = useState(true);
  const [selectedLoreTerm, setSelectedLoreTerm] = useState("");
  const [hoveredLoreTerm, setHoveredLoreTerm] = useState("");
  const [storyInspectorImageIndex, setStoryInspectorImageIndex] = useState(0);
  const [storyInspectorCollapsed, setStoryInspectorCollapsed] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 780px)").matches);
  const [storyInspectorEditSubject, setStoryInspectorEditSubject] = useState<StoryInspectorSubject | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [pageTurnKey, setPageTurnKey] = useState(0);
  const [storyEditMode, setStoryEditMode] = useState(false);
  const [inlineChapterDraft, setInlineChapterDraft] = useState<StoryChapter | null>(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [readingDepth, setReadingDepth] = useState<StoryReadingDepth>("standard");
  const [storySearch, setStorySearch] = useState("");
  const [storySearchOpen, setStorySearchOpen] = useState(false);
  const storySearchInputRef = useRef<HTMLInputElement>(null);
  const [storyThread, setStoryThread] = useState("all");
  const [activeReaderChapterId, setActiveReaderChapterId] = useState(storedState.selectedChapterId);
  const [collapsedActs, setCollapsedActs] = useState<StoryJourneyScope[]>(["history", "act1", "act2", "act3"]);
  const [chronologyCollapsed, setChronologyCollapsed] = useState(false);
  const [storyToolsOpen, setStoryToolsOpen] = useState(false);
  const [storyScribeOpen, setStoryScribeOpen] = useState(false);
  const [storyScribeTarget, setStoryScribeTarget] = useState<{ chapterId: string; pageIndex: number; scope: StoryScribeScope } | null>(null);
  const storyTreatmentReaderRef = useRef<HTMLElement | null>(null);
  const speechifyAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechifyAudioUrlRef = useRef("");
  const speechifyAbortRef = useRef<AbortController | null>(null);
  const speechifyRecordingAbortRef = useRef<AbortController | null>(null);
  const speechifySessionRef = useRef(0);
  const speechifyWaitResolveRef = useRef<(() => void) | null>(null);
  const speechifyRateRef = useRef(1);
  const speechifyTrackingFrameRef = useRef(0);
  const speechifyLastTimelineUpdateRef = useRef(0);
  const speechifyNarrationChunksRef = useRef<StoryNarrationChunk[]>([]);
  const speechifyActiveChunkRef = useRef<StoryNarrationChunk | null>(null);
  const speechifyActiveChunkIndexRef = useRef(0);
  const speechifyChunkDurationsRef = useRef<number[]>([]);
  const speechifyActiveMarksRef = useRef<SpeechifySpeechMark[]>([]);
  const speechifyHighlightedWordRef = useRef<StoryNarrationWordTarget | null>(null);
  const speechifyModeRef = useRef<"section" | "page">("section");
  const [speechifyPanelOpen, setSpeechifyPanelOpen] = useState(false);
  const [speechifyPanelTab, setSpeechifyPanelTab] = useState<"reader" | "narrations">("reader");
  const [speechifyVoices, setSpeechifyVoices] = useState<SpeechifyVoice[]>([]);
  const [speechifyVoiceId, setSpeechifyVoiceId] = useState(() => loadSpeechifyVoicePreference());
  const [speechifyRate, setSpeechifyRate] = useState(1);
  const [speechifyStatus, setSpeechifyStatus] = useState<"idle" | "connecting" | "playing" | "paused" | "error">("idle");
  const [speechifyError, setSpeechifyError] = useState("");
  const [speechifyNowPlaying, setSpeechifyNowPlaying] = useState("");
  const [speechifyChunkProgress, setSpeechifyChunkProgress] = useState({ current: 0, total: 0 });
  const [speechifyReadAllMode, setSpeechifyReadAllMode] = useState(false);
  const [speechifyNarrationCatalog, setSpeechifyNarrationCatalog] = useState<StoryNarrationCatalogSection[]>([]);
  const [speechifyTimeline, setSpeechifyTimeline] = useState({ currentMs: 0, totalMs: 0, chunkIndex: 0 });
  const [speechifyTimingDiagnostics, setSpeechifyTimingDiagnostics] = useState({ marks: 0, words: 0, matched: 0 });
  const [speechifyRecordingState, setSpeechifyRecordingState] = useState<StoryNarrationRecordingState>({
    phase: "idle",
    total: 0,
    recorded: 0,
    current: 0,
    message: ""
  });
  const [speechifyRecordingEstimateUsd, setSpeechifyRecordingEstimateUsd] = useState(0);
  const [speechifySectionAction, setSpeechifySectionAction] = useState<StoryNarrationSectionAction>({
    chapterId: "",
    phase: "idle",
    current: 0,
    total: 0
  });
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState("");
  const [collapsedLibrarySections, setCollapsedLibrarySections] = useState<StoryLibrarySectionId[]>([
    "peoples",
    "characters",
    "places",
    "factions",
    "magic",
    "creatures",
    "quests",
    "lore"
  ]);
  const deferredStorySearch = useDeferredValue(storySearch);

  const scopeChapters = useMemo(() => chaptersForScope(chapters, activeScope), [activeScope, chapters]);
  const selectedIndex = Math.max(0, scopeChapters.findIndex((chapter) => chapter.id === selectedChapterId));
  const selectedChapterOrderIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === selectedChapterId));
  const selectedChapter = scopeChapters[selectedIndex] || scopeChapters[0] || chapters.find((chapter) => chapter.id === selectedChapterId) || chapters[0];
  const selectedScopeOption = storyJourneyScopeOptions.find((option) => option.id === activeScope) || storyJourneyScopeOptions[0];
  const scopeCounts = useMemo(() => buildScopeCounts(chapters), [chapters]);
  const hasScopeChapters = scopeChapters.length > 0;
  const currentPageIndex = Math.min(pageByChapter[selectedChapter.id] || 0, selectedChapter.pages.length - 1);
  const currentPage = selectedChapter.pages[currentPageIndex];
  const selectedLore = selectedLoreTerm ? resolveLorePreview(selectedLoreTerm, entries, bestiary, worldBuilding) : null;
  const storyThreadChapters = selectedLoreTerm
    ? chapters.filter((chapter) => chapterContainsTerm(chapter, selectedLoreTerm))
    : [];
  const linkableTerms = useMemo(() => buildLinkableTerms(chapters), [chapters]);
  const storyInspectorKeywords = useMemo(() => Array.from(new Set([
    ...linkableTerms,
    ...entries.map((entry) => entry.title),
    ...bestiary.map((creature) => creature.name),
    ...Object.values(worldBuilding).flat().map((entry) => entry.title)
  ].map((term) => term.trim()).filter((term) => term.length >= 3))).sort((left, right) => right.length - left.length), [bestiary, entries, linkableTerms, worldBuilding]);
  const pageImageUrl = currentPage?.imageUrl ? resolveImageSourceUrl(currentPage.imageUrl) : "";
  const coverImageUrl = selectedChapter.coverImageUrl ? resolveImageSourceUrl(selectedChapter.coverImageUrl) : "";
  const storyThreads = useMemo(() => Array.from(new Set(chapters.flatMap((chapter) => [
    ...(chapter.threads || []),
    ...chapter.relatedLore,
    ...chapter.pages.flatMap((page) => [...(page.threads || []), ...page.relatedLore])
  ]))).filter(Boolean).sort((left, right) => left.localeCompare(right)), [chapters]);
  const normalizedStorySearch = deferredStorySearch.trim().toLowerCase();
  const readingChapters = useMemo(() => chapters.filter((chapter) => {
    const matchesThread = storyThread === "all" || chapterContainsTerm(chapter, storyThread);
    if (!matchesThread) return false;
    if (!normalizedStorySearch) return true;
    return [
      chapter.title,
      chapter.subtitle,
      chapter.shortDescription,
      ...chapter.relatedLore,
      ...chapter.pages.flatMap((page) => [page.title, plainStoryText(page.text), plainStoryText(page.detailedText || ""), ...page.relatedLore])
    ].join(" ").toLowerCase().includes(normalizedStorySearch);
  }), [chapters, normalizedStorySearch, storyThread]);
  const readingGroups = useMemo(() => storyJourneyScopeOptions.map((scope) => ({
    scope,
    chapters: readingChapters.filter((chapter) => storyChapterScope(chapter) === scope.id)
  })).filter((group) => group.chapters.length), [readingChapters]);
  const speechifyNarrationChapters = useMemo(() => buildStoryNarrationChapterGroups(speechifyNarrationCatalog), [speechifyNarrationCatalog]);
  const activeReaderIndex = Math.max(0, readingChapters.findIndex((chapter) => chapter.id === activeReaderChapterId));
  const activeReaderChapter = readingChapters[activeReaderIndex] || readingChapters[0] || null;
  const readingProgress = readingChapters.length ? ((activeReaderIndex + 1) / readingChapters.length) * 100 : 0;
  const canonReviewItems = useMemo(() => buildCanonReviewItems(chapters, entries), [chapters, entries]);
  const librarySections = useMemo(
    () => buildStoryLibrarySections(entries, bestiary, worldBuilding),
    [bestiary, entries, worldBuilding]
  );
  const selectedLibraryItem = useMemo(
    () => librarySections.flatMap((section) => section.items).find((item) => item.id === selectedLibraryItemId) || null,
    [librarySections, selectedLibraryItemId]
  );
  const filteredLibrarySections = useMemo(() => {
    if (!normalizedStorySearch) return librarySections;
    return librarySections.map((section) => ({
      ...section,
      items: section.items.filter((item) => [item.title, item.summary, plainStoryText(item.fullText), ...item.tags].join(" ").toLowerCase().includes(normalizedStorySearch))
    }));
  }, [librarySections, normalizedStorySearch]);
  const selectedLibraryReferences = useMemo(() => selectedLibraryItem
    ? storyReferences.filter((reference) => selectedLibraryItem.linkedStoryReferenceIds.includes(reference.id) || storyReferenceMentionsTitle(reference, selectedLibraryItem.title))
    : [], [selectedLibraryItem, storyReferences]);
  const selectedLibraryChapters = useMemo(() => selectedLibraryItem
    ? chapters.filter((chapter) => chapterContainsTerm(chapter, selectedLibraryItem.title))
    : [], [chapters, selectedLibraryItem]);
  const storyInspectorBaseSubject = useMemo(
    () => selectedLibraryItem
      ? storyInspectorSubjectFromLibraryItem(selectedLibraryItem, entries)
      : activeReaderChapter
        ? storyInspectorSubjectFromChapter(activeReaderChapter)
        : null,
    [activeReaderChapter, entries, selectedLibraryItem]
  );
  const storyInspectorHoverSubject = useMemo(
    () => hoveredLoreTerm
      ? storyInspectorSubjectFromLorePreview(resolveLorePreview(hoveredLoreTerm, entries, bestiary, worldBuilding), entries)
      : null,
    [bestiary, entries, hoveredLoreTerm, worldBuilding]
  );
  const storyInspectorSubject = storyInspectorHoverSubject || storyInspectorBaseSubject;
  const storyInspectorManagerSlot = useMemo(
    () => storyInspectorEditSubject ? buildStoryInspectorManagerSlot(storyInspectorEditSubject) : null,
    [storyInspectorEditSubject]
  );

  useEffect(() => {
    setStoryInspectorImageIndex(0);
  }, [storyInspectorSubject?.id]);

  useEffect(() => {
    saveStoryJourneyState({
      selectedChapterId,
      activeScope,
      pageByChapter,
      completedChapterIds
    });
  }, [activeScope, selectedChapterId, pageByChapter, completedChapterIds]);

  useEffect(() => {
    const openStorySearch = () => {
      setStorySearchOpen(true);
      window.setTimeout(() => storySearchInputRef.current?.focus(), 0);
    };
    window.addEventListener("tavern:story-search", openStorySearch);
    return () => window.removeEventListener("tavern:story-search", openStorySearch);
  }, []);

  useEffect(() => {
    if (!canEditStory) return;
    saveStoryChapters(chapters);
    const storyHash = JSON.stringify(chapters);
    if (storyHash === lastSharedStoryHashRef.current && storyJourney.chapters.length) return;
    lastSharedStoryHashRef.current = storyHash;
    onStoryJourneyChange({
      title: storyJourney.title || "The Story of Tales of the Tavern",
      description: storyJourney.description || "The complete story of Tales of the Tavern in chronological order.",
      chapters,
      updatedAt: new Date().toISOString()
    });
  }, [canEditStory, chapters, onStoryJourneyChange, storyJourney.chapters.length, storyJourney.description, storyJourney.title]);

  useEffect(() => {
    if (!storyJourney.chapters.length) return;
    const incomingHash = JSON.stringify(storyJourney.chapters);
    const currentHash = JSON.stringify(chapters);
    if (incomingHash === currentHash || incomingHash === lastSharedStoryHashRef.current) return;
    lastSharedStoryHashRef.current = incomingHash;
    setChapters(mergeStoryExpansionChapters(storyJourney.chapters));
  }, [storyJourney.updatedAt]);

  useEffect(() => {
    if (canEditStory) return;
    setStoryEditMode(false);
    setInlineChapterDraft(null);
  }, [canEditStory]);

  useEffect(() => {
    if (!scopeChapters.length) return;
    if (!scopeChapters.some((chapter) => chapter.id === selectedChapterId)) {
      setSelectedChapterId(scopeChapters[0].id);
    }
  }, [scopeChapters, selectedChapterId]);

  useEffect(() => {
    if (!readerOpen) return;
    const chapterNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-story-reader-chapter]"));
    if (!chapterNodes.length) return;
    const observer = new IntersectionObserver((observed) => {
      const visible = observed
        .filter((item) => item.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top - 150) - Math.abs(right.boundingClientRect.top - 150));
      const chapterId = visible[0]?.target.getAttribute("data-story-reader-chapter");
      if (chapterId) setActiveReaderChapterId(chapterId);
    }, { rootMargin: "-120px 0px -58% 0px", threshold: [0, 0.08, 0.3] });
    chapterNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [readerOpen, readingDepth, normalizedStorySearch, storyThread]);

  useEffect(() => {
    if (!readingChapters.length || readingChapters.some((chapter) => chapter.id === activeReaderChapterId)) return;
    setActiveReaderChapterId(readingChapters[0].id);
  }, [activeReaderChapterId, readingChapters]);

  useEffect(() => {
    speechifyRateRef.current = speechifyRate;
    if (speechifyAudioRef.current) speechifyAudioRef.current.playbackRate = speechifyRate;
  }, [speechifyRate]);

  useEffect(() => {
    if (!speechifyPanelOpen || speechifyVoices.length) return;
    const controller = new AbortController();
    void loadSpeechifyVoiceOptions(controller.signal);
    return () => controller.abort();
  }, [speechifyPanelOpen, speechifyVoices.length]);

  useEffect(() => {
    if (!speechifyPanelOpen || !speechifyVoices.length || !speechifyVoiceId) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => void refreshSpeechifyRecordingStatus(controller.signal), 80);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    speechifyPanelOpen,
    speechifyVoiceId,
    speechifyVoices.length,
    readingDepth,
    storyThread,
    selectedLibraryItemId,
    normalizedStorySearch,
    chapters
  ]);

  useEffect(() => {
    if (speechifyModeRef.current === "page") stopSpeechifyNarration();
  }, [readingDepth, storyThread, selectedLibraryItemId, normalizedStorySearch]);

  useEffect(() => () => {
    speechifySessionRef.current += 1;
    speechifyAbortRef.current?.abort();
    speechifyRecordingAbortRef.current?.abort();
    speechifyWaitResolveRef.current?.();
    speechifyAudioRef.current?.pause();
    window.cancelAnimationFrame(speechifyTrackingFrameRef.current);
    clearStoryNarrationHighlight();
    if (speechifyAudioUrlRef.current) URL.revokeObjectURL(speechifyAudioUrlRef.current);
  }, []);

  const changeStoryScope = (scope: StoryJourneyScope) => {
    const nextChapters = chaptersForScope(chapters, scope);
    setActiveScope(scope);
    if (nextChapters[0]) {
      setSelectedChapterId(nextChapters[0].id);
      setPageByChapter((current) => ({ ...current, [nextChapters[0].id]: current[nextChapters[0].id] || 0 }));
    }
    setReaderOpen(true);
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
    setReaderOpen(true);
    setSelectedLibraryItemId("");
    setSelectedLoreTerm("");
    setPageTurnKey((key) => key + 1);
    window.setTimeout(() => scrollToStorySection(chapterId), 40);
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
      scope: activeScope,
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
    setActiveReaderChapterId(chapter.id);
    setPageByChapter((current) => ({ ...current, [chapter.id]: 0 }));
    setReaderOpen(true);
    setStoryEditMode(false);
    setInlineChapterDraft(chapter);
    setStoryToolsOpen(false);
    window.setTimeout(() => scrollToStorySection(chapter.id), 60);
  };

  const deleteSelectedChapter = () => {
    if (chapters.length <= 1) return;
    const confirmed = window.confirm(`Delete "${selectedChapter.title}" from Story Journey?`);
    if (!confirmed) return;
    const nextChapters = chapters.filter((chapter) => chapter.id !== selectedChapter.id);
    setChapters(nextChapters);
    const nextScopeChapters = chaptersForScope(nextChapters, activeScope);
    setSelectedChapterId(nextScopeChapters[Math.max(0, selectedIndex - 1)]?.id || nextScopeChapters[0]?.id || nextChapters[Math.max(0, selectedChapterOrderIndex - 1)]?.id || nextChapters[0].id);
    setReaderOpen(true);
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

  const applyStoryScribeDraft = (draft: StoryScribePatch) => {
    updateChapter(selectedChapter.id, (chapter) => applyStoryScribePatch(chapter, draft));
    setPageTurnKey((key) => key + 1);
  };

  const openStoryScribe = (scope: StoryScribeScope, chapterId?: string, pageIndex = 0) => {
    if (!canEditStory) return;
    const targetChapter = chapters.find((chapter) => chapter.id === chapterId)
      || activeReaderChapter
      || selectedChapter
      || chapters[0];
    if (!targetChapter) return;
    setStoryScribeTarget({
      chapterId: targetChapter.id,
      pageIndex: Math.max(0, Math.min(pageIndex, targetChapter.pages.length - 1)),
      scope
    });
    setStoryScribeOpen(true);
  };

  const applyStoryScribeJourneyDraft = (draft: StoryScribeJourneyPatch) => {
    const patchesByChapter = new Map(draft.chapterPatches.map((item) => [item.chapterId, item]));
    setChapters((current) => current.map((chapter) => {
      const patch = patchesByChapter.get(chapter.id);
      return patch ? applyStoryScribePatch(chapter, patch) : chapter;
    }));
    setPageTurnKey((key) => key + 1);
  };

  const openLoreFullPage = (preview: LorePreview) => {
    if (preview.entry) onOpenEntry(preview.entry);
    if (preview.creature) onOpenCreature(preview.creature);
    if (preview.worldEntry) onOpenWorldEntry(preview.worldEntry.category, preview.worldEntry.id);
  };

  const openLoreThread = () => {
    if (!storyThreadChapters.length) return;
    selectChapter(storyThreadChapters[0].id);
  };

  const scrollToStorySection = (chapterId: string, pageId?: string) => {
    setActiveReaderChapterId(chapterId);
    window.requestAnimationFrame(() => {
      document.getElementById(pageId ? `story-beat-${pageId}` : `story-chapter-${chapterId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const editReaderChapter = (chapterId: string) => {
    const chapter = chapters.find((item) => item.id === chapterId);
    if (!chapter || !canEditStory) return;
    setActiveScope(storyChapterScope(chapter));
    setSelectedChapterId(chapter.id);
    setPageByChapter((current) => ({ ...current, [chapter.id]: current[chapter.id] || 0 }));
    setSelectedLibraryItemId("");
    setReaderOpen(true);
    setStoryEditMode(false);
    setInlineChapterDraft(structuredClone(chapter));
    window.setTimeout(() => scrollToStorySection(chapter.id), 40);
  };

  const updateInlineChapterDraft = (patch: Partial<StoryChapter>) => {
    setInlineChapterDraft((current) => current ? normalizeStoryChapter({ ...current, ...patch }, current.id) : current);
  };

  const updateInlinePageDraft = (pageId: string, patch: Partial<StoryPage>) => {
    setInlineChapterDraft((current) => current ? normalizeStoryChapter({
      ...current,
      pages: current.pages.map((page) => page.id === pageId ? normalizeStoryPage({ ...page, ...patch }, page.id) : page)
    }, current.id) : current);
  };

  const addInlinePageDraft = () => {
    setInlineChapterDraft((current) => {
      if (!current) return current;
      const pageNumber = current.pages.length + 1;
      const page = normalizeStoryPage({
        id: `${current.id}-page-${Date.now()}`,
        title: `Sequence ${pageNumber}`,
        text: "Write this story sequence here.",
        detailedText: "",
        imageUrl: "",
        imagePlaceholder: "",
        caption: "",
        relatedLore: []
      }, `${current.id}-page-${pageNumber}`);
      return normalizeStoryChapter({ ...current, pages: [...current.pages, page] }, current.id);
    });
  };

  const deleteInlinePageDraft = (pageId: string) => {
    setInlineChapterDraft((current) => {
      if (!current || current.pages.length <= 1) return current;
      return normalizeStoryChapter({ ...current, pages: current.pages.filter((page) => page.id !== pageId) }, current.id);
    });
  };

  const saveInlineChapterDraft = () => {
    if (!inlineChapterDraft || !canEditStory) return;
    updateChapter(inlineChapterDraft.id, () => inlineChapterDraft);
    setInlineChapterDraft(null);
  };

  const openStoryOverview = () => {
    setSelectedLibraryItemId("");
    setStorySearch("");
    setStoryThread("all");
    window.requestAnimationFrame(() => document.querySelector(".story-treatment-titlepage")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openLibraryItem = (item: StoryLibraryItem) => {
    setSelectedLibraryItemId(item.id);
    setStorySearch("");
    window.requestAnimationFrame(() => document.querySelector(".story-library-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openLibrarySource = (item: StoryLibraryItem) => {
    if (item.entry) onOpenEntry(item.entry);
    if (item.creature) onOpenCreature(item.creature);
    if (item.worldEntry) onOpenWorldEntry(item.worldEntry.category, item.worldEntry.id);
  };

  const openStoryInspectorSource = (subject: StoryInspectorSubject) => {
    if (subject.entry) onOpenEntry(subject.entry);
    else if (subject.creature) onOpenCreature(subject.creature);
    else if (subject.worldEntry) onOpenWorldEntry(subject.worldEntry.category, subject.worldEntry.id);
    else if (subject.chapter) scrollToStorySection(subject.chapter.id);
  };

  const openStoryInspectorArtManager = (subject: StoryInspectorSubject) => {
    if (!canEditStory) return;
    setStoryInspectorEditSubject(subject);
  };

  const saveStoryInspectorArt = (slots: ImageManagerSlotDraft[]) => {
    const subject = storyInspectorEditSubject;
    const draft = slots[0];
    if (!subject || !draft?.imageUrl) {
      setStoryInspectorEditSubject(null);
      return;
    }

    if (subject.entry) {
      onSaveEntry(appendStoryReferenceArtToEntry(subject.entry, draft));
    } else if (subject.creature) {
      onSaveCreature(appendStoryReferenceArtToCreature(subject.creature, draft));
    } else if (subject.worldEntry) {
      const category = subject.worldEntry.category;
      onWorldBuildingChange({
        ...worldBuilding,
        [category]: worldBuilding[category].map((entry) => entry.id === subject.worldEntry?.id
          ? { ...entry, image: draft.imageUrl, imageFit: normalizeImageFit(draft.imageFit), updatedAt: new Date().toISOString() }
          : entry)
      });
    } else if (subject.chapter) {
      updateChapter(subject.chapter.id, (chapter) => ({
        ...chapter,
        coverImageUrl: draft.imageUrl,
        coverImageFit: normalizeImageFit(draft.imageFit)
      }));
    }
    setStoryInspectorEditSubject(null);
  };

  const openLibraryChronologyChapter = (chapterId: string) => {
    setSelectedLibraryItemId("");
    setStorySearch("");
    setStoryThread("all");
    window.setTimeout(() => scrollToStorySection(chapterId), 60);
  };

  async function loadSpeechifyVoiceOptions(signal?: AbortSignal) {
    if (speechifyStatus === "idle") setSpeechifyStatus("connecting");
    setSpeechifyError("");
    try {
      const response = await fetchSpeechifyVoices(signal);
      setSpeechifyVoices(response.voices);
      const preferred = response.voices.find((voice) => voice.id === speechifyVoiceId)
        || response.voices.find((voice) => voice.id === response.defaultVoiceId)
        || response.voices.find((voice) => /(^|[-_])en/i.test(voice.language))
        || response.voices[0];
      if (!preferred) throw new Error("No Speechify voices are available for this API account.");
      setSpeechifyVoiceId(preferred.id);
      saveSpeechifyVoicePreference(preferred.id);
      setSpeechifyStatus((current) => current === "connecting" ? "idle" : current);
      return preferred.id;
    } catch (error) {
      if (signal?.aborted) return "";
      setSpeechifyError(error instanceof Error ? error.message : "Speechify could not be connected.");
      setSpeechifyStatus("error");
      setSpeechifyPanelOpen(true);
      return "";
    }
  }

  function releaseSpeechifyMedia() {
    speechifyAudioRef.current?.pause();
    speechifyAudioRef.current = null;
    speechifyWaitResolveRef.current?.();
    speechifyWaitResolveRef.current = null;
    window.cancelAnimationFrame(speechifyTrackingFrameRef.current);
    speechifyTrackingFrameRef.current = 0;
    speechifyActiveChunkRef.current = null;
    speechifyActiveMarksRef.current = [];
    if (speechifyAudioUrlRef.current) URL.revokeObjectURL(speechifyAudioUrlRef.current);
    speechifyAudioUrlRef.current = "";
  }

  function stopSpeechifyNarration() {
    speechifySessionRef.current += 1;
    speechifyAbortRef.current?.abort();
    speechifyAbortRef.current = null;
    releaseSpeechifyMedia();
    clearStoryNarrationHighlight();
    speechifyHighlightedWordRef.current = null;
    speechifyNarrationChunksRef.current = [];
    speechifyModeRef.current = "section";
    setSpeechifyReadAllMode(false);
    setSpeechifyStatus("idle");
    setSpeechifyNowPlaying("");
    setSpeechifyChunkProgress({ current: 0, total: 0 });
  }

  function speechifyLanguageForVoice(voiceId: string) {
    return speechifyVoices.find((voice) => voice.id === voiceId)?.language
      || (voiceId === "john-rhys-davies" ? "en-GB" : "en-US");
  }

  function visibleStoryNarrationChunks() {
    const root = storyTreatmentReaderRef.current;
    return root ? buildStoryNarrationChunks(root) : [];
  }

  function applySpeechifyRecordingStatus(
    chunks: StoryNarrationChunk[],
    sections: SpeechifyRecordingSectionStatus[]
  ) {
    const byIndex = new Map(sections.map((section) => [section.index, section]));
    const catalog = chunks.map<StoryNarrationCatalogSection>((chunk, index) => {
      const saved = byIndex.get(index);
      return {
        index,
        recordingId: saved?.recordingId || "",
        exists: Boolean(saved?.exists),
        durationMs: saved?.exists ? saved.durationMs || estimateSpeechifyDuration(chunk.text) : 0,
        createdAt: saved?.createdAt || "",
        chapterId: chunk.chapterId,
        chapterTitle: chunk.chapterTitle,
        sectionTitle: chunk.sectionTitle,
        inputStart: chunk.inputStart,
        inputEnd: chunk.inputEnd,
        chapterMarkers: chunk.chapterMarkers
      };
    });
    const durations = catalog.map((section) => section.exists ? section.durationMs : 0);
    speechifyChunkDurationsRef.current = durations;
    setSpeechifyNarrationCatalog(catalog);
    setSpeechifyTimeline((current) => {
      const totalMs = durations.reduce((total, duration) => total + duration, 0);
      return { ...current, currentMs: Math.min(current.currentMs, totalMs), totalMs };
    });
  }

  async function resolveSpeechifyVoiceId(signal?: AbortSignal) {
    return speechifyVoices.some((voice) => voice.id === speechifyVoiceId)
      ? speechifyVoiceId
      : loadSpeechifyVoiceOptions(signal);
  }

  async function refreshSpeechifyRecordingStatus(signal?: AbortSignal) {
    const chunks = visibleStoryNarrationChunks();
    setSpeechifyRecordingEstimateUsd(estimateSpeechifyRecordingCost(chunks));
    if (!chunks.length) {
      setSpeechifyRecordingState({ phase: "idle", total: 0, recorded: 0, current: 0, message: "No readable story sections are visible." });
      return;
    }
    setSpeechifyRecordingState((current) => ({ ...current, phase: "checking", total: chunks.length, message: "Checking the shared recording..." }));
    try {
      const voiceId = await resolveSpeechifyVoiceId(signal);
      if (!voiceId || signal?.aborted) return;
      const status = await fetchSpeechifyRecordingStatus(
        chunks.map((chunk) => chunk.speechText),
        voiceId,
        speechifyLanguageForVoice(voiceId),
        signal
      );
      applySpeechifyRecordingStatus(chunks, status.sections);
      const complete = status.recordedCount === status.total;
      setSpeechifyRecordingState({
        phase: complete ? "ready" : "partial",
        total: status.total,
        recorded: status.recordedCount,
        current: 0,
        message: complete
          ? "This page is recorded and ready for the team."
          : status.recordedCount
            ? `${status.missingIndexes.length} new or edited ${status.missingIndexes.length === 1 ? "section needs" : "sections need"} recording. Record will resume with the first missing section.`
            : "No matching saved sections remain. Record will begin from the start of this version."
      });
    } catch (error) {
      if (signal?.aborted) return;
      setSpeechifyRecordingState({
        phase: "error",
        total: chunks.length,
        recorded: 0,
        current: 0,
        message: error instanceof Error ? error.message : "The shared recording could not be checked."
      });
    }
  }

  async function recordAllSpeechifySections() {
    if (!canEditStory) return;
    const chunks = visibleStoryNarrationChunks();
    if (!chunks.length) {
      setSpeechifyRecordingState({ phase: "idle", total: 0, recorded: 0, current: 0, message: "No readable story sections are visible." });
      return;
    }

    const fullRecordingCost = estimateSpeechifyRecordingCost(chunks);
    if (fullRecordingCost > SPEECHIFY_FRESH_RECORDING_CAP_USD) {
      setSpeechifyRecordingState({
        phase: "error",
        total: chunks.length,
        recorded: 0,
        current: 0,
        message: `This recording is estimated at $${fullRecordingCost.toFixed(2)}, above the $${SPEECHIFY_FRESH_RECORDING_CAP_USD.toFixed(2)} safety cap.`
      });
      return;
    }

    stopSpeechifyNarration();
    speechifyRecordingAbortRef.current?.abort();
    const controller = new AbortController();
    speechifyRecordingAbortRef.current = controller;
    let recorded = 0;
    try {
      const voiceId = await resolveSpeechifyVoiceId(controller.signal);
      if (!voiceId || controller.signal.aborted) return;
      const language = speechifyLanguageForVoice(voiceId);
      const status = await fetchSpeechifyRecordingStatus(chunks.map((chunk) => chunk.speechText), voiceId, language, controller.signal);
      applySpeechifyRecordingStatus(chunks, status.sections);
      recorded = status.recordedCount;
      speechifyChunkDurationsRef.current = status.sections.map((section, index) => section.exists
        ? section.durationMs || estimateSpeechifyDuration(chunks[index]?.text || "")
        : 0);

      if (!status.missingIndexes.length) {
        setSpeechifyRecordingState({ phase: "ready", total: status.total, recorded: status.total, current: 0, message: "The complete paced recording is saved and ready for the team." });
        return;
      }

      setSpeechifyPanelOpen(true);
      setSpeechifyPanelTab("narrations");
      setSpeechifyError("");
      setSpeechifyRecordingState({
        phase: "recording",
        total: status.total,
        recorded,
        current: 0,
        message: "Creating the fresh paced recording. Every completed part is saved immediately."
      });

      for (let position = 0; position < status.missingIndexes.length; position += 1) {
        const chunkIndex = status.missingIndexes[position];
        const chunk = chunks[chunkIndex];
        if (!chunk || controller.signal.aborted) break;
        setSpeechifyRecordingState({
          phase: "recording",
          total: status.total,
          recorded,
          current: position + 1,
          message: `${recorded} parts are safely saved. Recording ${chunk.chapterTitle}, part ${position + 1} of ${status.missingIndexes.length}...`
        });
        const timed = await recordSpeechifyTimedAudio(chunk.speechText, voiceId, language, controller.signal);
        URL.revokeObjectURL(timed.audioUrl);
        recorded += 1;
        speechifyChunkDurationsRef.current[chunkIndex] = timed.durationMs || estimateSpeechifyDuration(chunk.text);
        setSpeechifyRecordingState({
          phase: recorded === status.total ? "ready" : "recording",
          total: status.total,
          recorded,
          current: position + 1,
          message: `${recorded} of ${status.total} audio parts are safely saved.`
        });
        if (position < status.missingIndexes.length - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_250));
        }
      }

      if (controller.signal.aborted) {
        setSpeechifyRecordingState({
          phase: recorded ? "partial" : "idle",
          total: status.total,
          recorded,
          current: 0,
          message: recorded
            ? `Recording stopped. ${recorded} parts are saved; Record Remaining will continue with the next missing part.`
            : "Recording stopped before the first part finished."
        });
        return;
      }

      setSpeechifyRecordingState({
        phase: "ready",
        total: status.total,
        recorded: status.total,
        current: status.missingIndexes.length,
        message: "The complete fresh Story Journey recording is saved and ready for the team."
      });
      void refreshSpeechifyRecordingStatus();
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "The complete Story Journey recording stopped unexpectedly.";
      setSpeechifyRecordingState({ phase: recorded ? "partial" : "error", total: chunks.length, recorded, current: 0, message });
      setSpeechifyError(message);
    } finally {
      if (speechifyRecordingAbortRef.current === controller) speechifyRecordingAbortRef.current = null;
    }
  }

  async function handleSpeechifyChapterNarration(chapterId: string, chapterTitle: string) {
    if (speechifyNowPlaying === chapterTitle && speechifyReadAllMode && (speechifyStatus === "playing" || speechifyStatus === "paused")) {
      toggleSpeechifyPageNarration();
      return;
    }

    const chunks = visibleStoryNarrationChunks().filter((chunk) => chunk.chapterId === chapterId);
    if (!chunks.length) {
      setSpeechifyError(`There is no readable story text in ${chapterTitle} yet.`);
      setSpeechifyStatus("error");
      setSpeechifyPanelOpen(true);
      return;
    }

    stopSpeechifyNarration();
    speechifyRecordingAbortRef.current?.abort();
    const controller = new AbortController();
    speechifyRecordingAbortRef.current = controller;
    setSpeechifyError("");
    setSpeechifyStatus("connecting");
    setSpeechifyNowPlaying(chapterTitle);
    setSpeechifySectionAction({ chapterId, phase: "checking", current: 0, total: chunks.length });
    let recorded = 0;

    try {
      const voiceId = await resolveSpeechifyVoiceId(controller.signal);
      if (!voiceId || controller.signal.aborted) return;
      const language = speechifyLanguageForVoice(voiceId);
      const status = await fetchSpeechifyRecordingStatus(chunks.map((chunk) => chunk.speechText), voiceId, language, controller.signal);
      recorded = status.recordedCount;
      speechifyChunkDurationsRef.current = status.sections.map((section, index) => section.exists
        ? section.durationMs || estimateSpeechifyDuration(chunks[index]?.text || "")
        : 0);

      if (!status.missingIndexes.length) {
        setSpeechifySectionAction({ chapterId, phase: "ready", current: status.total, total: status.total });
        await startSpeechifyPageNarration(chunks[0].inputStart, chunks, undefined, chapterTitle);
        return;
      }

      if (!canEditStory) {
        throw new Error(`${chapterTitle} has not been recorded yet. An admin can use its Speechify button to prepare it for the team.`);
      }

      setSpeechifyStatus("idle");
      const confirmed = window.confirm(
        `${chapterTitle} has ${status.missingIndexes.length} unrecorded ${status.missingIndexes.length === 1 ? "part" : "parts"}. Record and save this section with Speechify now?`
      );
      if (!confirmed) {
        setSpeechifyNowPlaying("");
        setSpeechifySectionAction({ chapterId: "", phase: "idle", current: 0, total: 0 });
        return;
      }

      setSpeechifyPanelOpen(true);
      setSpeechifyPanelTab("narrations");
      setSpeechifyStatus("connecting");
      setSpeechifyRecordingState({
        phase: "recording",
        total: status.total,
        recorded,
        current: 0,
        message: `Recording ${chapterTitle}. Each completed part is saved immediately.`
      });

      for (let position = 0; position < status.missingIndexes.length; position += 1) {
        const chunkIndex = status.missingIndexes[position];
        const chunk = chunks[chunkIndex];
        if (!chunk || controller.signal.aborted) break;
        setSpeechifySectionAction({
          chapterId,
          phase: "recording",
          current: position + 1,
          total: status.missingIndexes.length
        });
        setSpeechifyRecordingState({
          phase: "recording",
          total: status.total,
          recorded,
          current: position + 1,
          message: `${recorded} parts are safely saved. Recording ${chapterTitle}, part ${position + 1} of ${status.missingIndexes.length}...`
        });
        const timed = await recordSpeechifyTimedAudio(chunk.speechText, voiceId, language, controller.signal);
        URL.revokeObjectURL(timed.audioUrl);
        recorded += 1;
        const durationMs = timed.durationMs || estimateSpeechifyDuration(chunk.text);
        speechifyChunkDurationsRef.current[chunkIndex] = durationMs;
        setSpeechifyRecordingState({
          phase: recorded === status.total ? "ready" : "recording",
          total: status.total,
          recorded,
          current: position + 1,
          message: `${recorded} of ${status.total} parts of ${chapterTitle} are safely saved.`
        });
        if (position < status.missingIndexes.length - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 750));
        }
      }

      if (controller.signal.aborted) {
        setSpeechifySectionAction({ chapterId, phase: recorded ? "ready" : "idle", current: recorded, total: status.total });
        setSpeechifyRecordingState({
          phase: recorded ? "partial" : "idle",
          total: status.total,
          recorded,
          current: 0,
          message: recorded
            ? `Recording stopped. ${recorded} parts of ${chapterTitle} are saved; its Speechify button will resume with the next missing part.`
            : "Recording stopped before the first section finished."
        });
        setSpeechifyStatus("idle");
        return;
      }

      setSpeechifyRecordingState({
        phase: "ready",
        total: status.total,
        recorded: status.total,
        current: status.missingIndexes.length,
        message: `${chapterTitle} is recorded and saved. It is ready to play for the team.`
      });
      setSpeechifySectionAction({ chapterId, phase: "ready", current: status.total, total: status.total });
      setSpeechifyStatus("idle");
      setSpeechifyNowPlaying("");
      void refreshSpeechifyRecordingStatus();
    } catch (error) {
      if (controller.signal.aborted) {
        setSpeechifySectionAction({ chapterId, phase: recorded ? "ready" : "idle", current: recorded, total: chunks.length });
        setSpeechifyNowPlaying("");
        setSpeechifyRecordingState((current) => ({
          ...current,
          phase: current.recorded ? "partial" : "idle",
          current: 0,
          message: current.recorded
            ? `Recording stopped. ${current.recorded} sections are saved; the next recording will resume automatically.`
            : "Recording stopped before the first section finished."
        }));
        setSpeechifyStatus("idle");
        return;
      }
      const message = error instanceof Error ? error.message : `${chapterTitle} could not be recorded.`;
      setSpeechifySectionAction({ chapterId, phase: "error", current: recorded, total: chunks.length });
      setSpeechifyRecordingState((current) => ({
        ...current,
        phase: current.recorded ? "partial" : "error",
        message: current.recorded
          ? `${current.recorded} sections were saved before recording stopped. ${message}`
          : message
      }));
      setSpeechifyError(message);
      setSpeechifyStatus("error");
    } finally {
      if (speechifyRecordingAbortRef.current === controller) speechifyRecordingAbortRef.current = null;
    }
  }

  function stopSpeechifyRecording() {
    speechifyRecordingAbortRef.current?.abort();
  }

  function beginSpeechifyWordTracking(
    audio: HTMLAudioElement,
    marks: SpeechifySpeechMark[],
    chunk: StoryNarrationChunk,
    session: number,
    chunkIndex: number
  ) {
    window.cancelAnimationFrame(speechifyTrackingFrameRef.current);
    const wordTargets = alignSpeechifyMarksToStoryWords(marks, chunk.words);
    const track = () => {
      if (session !== speechifySessionRef.current || speechifyModeRef.current !== "page" || audio.paused) return;
      const now = performance.now();
      const currentChunkMs = audio.currentTime * 1_000;
      const markIndex = findSpeechMarkIndexAtTime(marks, currentChunkMs);
      const target = markIndex >= 0 ? wordTargets[markIndex] : null;
      if (target && target !== speechifyHighlightedWordRef.current) {
        speechifyHighlightedWordRef.current = target;
        highlightStoryNarrationWord(target, true);
      }
      if (now - speechifyLastTimelineUpdateRef.current >= 90) {
        speechifyLastTimelineUpdateRef.current = now;
        setSpeechifyTimeline((current) => ({
          currentMs: Math.min(current.totalMs, speechifyDurationBeforeChunk(speechifyChunkDurationsRef.current, chunkIndex) + currentChunkMs),
          totalMs: current.totalMs,
          chunkIndex
        }));
      }
      speechifyTrackingFrameRef.current = window.requestAnimationFrame(track);
    };
    speechifyTrackingFrameRef.current = window.requestAnimationFrame(track);
  }

  async function startSpeechifyNarration(text: string, label: string) {
    const chunks = splitSpeechifyText(plainStoryText(text));
    if (!chunks.length) {
      setSpeechifyError("There is no readable story text in this section yet.");
      setSpeechifyStatus("error");
      setSpeechifyPanelOpen(true);
      return;
    }

    stopSpeechifyNarration();
    speechifyModeRef.current = "section";
    const session = ++speechifySessionRef.current;
    const controller = new AbortController();
    speechifyAbortRef.current = controller;
    setSpeechifyStatus("connecting");
    setSpeechifyError("");
    setSpeechifyNowPlaying(label);
    setSpeechifyChunkProgress({ current: 0, total: chunks.length });

    try {
      const voiceId = speechifyVoices.some((voice) => voice.id === speechifyVoiceId)
        ? speechifyVoiceId
        : await loadSpeechifyVoiceOptions(controller.signal);
      if (!voiceId || session !== speechifySessionRef.current) return;
      const language = speechifyLanguageForVoice(voiceId);

      for (let index = 0; index < chunks.length; index += 1) {
        if (session !== speechifySessionRef.current) return;
        setSpeechifyChunkProgress({ current: index + 1, total: chunks.length });
        const audioUrl = await createSpeechifyAudio(chunks[index], voiceId, language, controller.signal);
        if (session !== speechifySessionRef.current) {
          URL.revokeObjectURL(audioUrl);
          return;
        }

        releaseSpeechifyMedia();
        speechifyAudioUrlRef.current = audioUrl;
        const audio = new Audio(audioUrl);
        audio.preload = "auto";
        audio.playbackRate = speechifyRateRef.current;
        speechifyAudioRef.current = audio;
        setSpeechifyStatus("playing");

        await new Promise<void>((resolve, reject) => {
          speechifyWaitResolveRef.current = resolve;
          audio.addEventListener("ended", () => resolve(), { once: true });
          audio.addEventListener("error", () => reject(new Error("The Speechify audio stream could not be played.")), { once: true });
          void audio.play().catch(reject);
        });
      }

      if (session === speechifySessionRef.current) {
        releaseSpeechifyMedia();
        setSpeechifyStatus("idle");
        setSpeechifyNowPlaying("");
        setSpeechifyChunkProgress({ current: 0, total: 0 });
      }
    } catch (error) {
      if (controller.signal.aborted || session !== speechifySessionRef.current) return;
      releaseSpeechifyMedia();
      setSpeechifyError(error instanceof Error ? error.message : "Speechify narration failed.");
      setSpeechifyStatus("error");
      setSpeechifyPanelOpen(true);
    }
  }

  async function startSpeechifyPageNarration(
    inputOffset = 0,
    preparedChunks?: StoryNarrationChunk[],
    timelineStart?: { chunkIndex: number; timeMs: number },
    nowPlayingLabel?: string
  ) {
    const root = storyTreatmentReaderRef.current;
    const chunks = preparedChunks?.length ? preparedChunks : root ? buildStoryNarrationChunks(root) : [];
    if (!chunks.length) {
      setSpeechifyError("There is no readable story text on this page yet.");
      setSpeechifyStatus("error");
      setSpeechifyPanelOpen(true);
      return;
    }

    stopSpeechifyNarration();
    speechifyModeRef.current = "page";
    speechifyNarrationChunksRef.current = chunks;
    const requestedWord = inputOffset > 0
      ? chunks.flatMap((chunk) => chunk.words).find((word) => word.inputStart <= inputOffset && word.inputEnd > inputOffset)
        || chunks.flatMap((chunk) => chunk.words).find((word) => word.inputStart >= inputOffset)
      : null;
    if (requestedWord) {
      highlightStoryNarrationWord(requestedWord, true);
      speechifyHighlightedWordRef.current = requestedWord;
    }
    setSpeechifyReadAllMode(true);
    const session = ++speechifySessionRef.current;
    const controller = new AbortController();
    speechifyAbortRef.current = controller;
    setSpeechifyStatus("connecting");
    setSpeechifyError("");
    setSpeechifyNowPlaying(nowPlayingLabel || selectedLibraryItem?.title || "Full Story Journey");

    const startChunkIndex = timelineStart
      ? Math.max(0, Math.min(timelineStart.chunkIndex, chunks.length - 1))
      : Math.max(0, chunks.findIndex((chunk) => inputOffset < chunk.inputEnd));
    setSpeechifyChunkProgress({ current: startChunkIndex + 1, total: chunks.length });
    setSpeechifyTimeline((current) => ({
      ...current,
      currentMs: speechifyDurationBeforeChunk(speechifyChunkDurationsRef.current, startChunkIndex) + (timelineStart?.timeMs || 0),
      chunkIndex: startChunkIndex
    }));
    if (inputOffset <= 0) root?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const voiceId = await resolveSpeechifyVoiceId(controller.signal);
      if (!voiceId || session !== speechifySessionRef.current) return;
      const language = speechifyLanguageForVoice(voiceId);

      for (let index = startChunkIndex; index < chunks.length; index += 1) {
        if (session !== speechifySessionRef.current) return;
        const chunk = chunks[index];
        setSpeechifyChunkProgress({ current: index + 1, total: chunks.length });
        const timed = await loadSpeechifyRecordedAudio(chunk.speechText, voiceId, language, controller.signal);
        if (session !== speechifySessionRef.current) {
          URL.revokeObjectURL(timed.audioUrl);
          return;
        }

        releaseSpeechifyMedia();
        speechifyAudioUrlRef.current = timed.audioUrl;
        speechifyActiveChunkRef.current = chunk;
        speechifyActiveChunkIndexRef.current = index;
        speechifyActiveMarksRef.current = timed.speechMarks;
        const alignedWords = alignSpeechifyMarksToStoryWords(timed.speechMarks, chunk.words);
        setSpeechifyTimingDiagnostics({
          marks: timed.speechMarks.length,
          words: chunk.words.length,
          matched: alignedWords.filter(Boolean).length
        });
        if (timed.durationMs > 0) {
          speechifyChunkDurationsRef.current[index] = timed.durationMs;
          setSpeechifyTimeline((current) => ({
            ...current,
            totalMs: speechifyChunkDurationsRef.current.reduce((total, duration) => total + duration, 0),
            chunkIndex: index
          }));
        }
        const audio = new Audio(timed.audioUrl);
        audio.preload = "auto";
        audio.playbackRate = speechifyRateRef.current;
        speechifyAudioRef.current = audio;

        if (index === startChunkIndex && timelineStart && timelineStart.timeMs > 0) {
          await waitForSpeechifyAudioMetadata(audio);
          if (session !== speechifySessionRef.current) return;
          audio.currentTime = Math.max(0, Math.min(timelineStart.timeMs / 1_000, Number.isFinite(audio.duration) ? audio.duration - 0.02 : timelineStart.timeMs / 1_000));
        } else if (index === startChunkIndex && inputOffset > chunk.inputStart) {
          const mark = findSpeechMarkForInputOffset(timed.speechMarks, chunk, inputOffset - chunk.inputStart);
          if (mark) {
            await waitForSpeechifyAudioMetadata(audio);
            if (session !== speechifySessionRef.current) return;
            audio.currentTime = Math.max(0, mark.start_time / 1_000);
          }
        }

        if (index === startChunkIndex && audio.currentTime > 0) {
          const mark = findSpeechMarkAtTime(timed.speechMarks, audio.currentTime * 1_000);
          const target = mark ? findStoryNarrationWordForMark(chunk, mark, timed.speechMarks) : chunk.words[0];
          if (target) {
            speechifyHighlightedWordRef.current = target;
            highlightStoryNarrationWord(target, true);
          }
        }

        setSpeechifyStatus("playing");
        await new Promise<void>((resolve, reject) => {
          speechifyWaitResolveRef.current = resolve;
          audio.addEventListener("ended", () => resolve(), { once: true });
          audio.addEventListener("error", () => reject(new Error("The synchronized Speechify audio could not be played.")), { once: true });
          void audio.play().then(() => beginSpeechifyWordTracking(audio, timed.speechMarks, chunk, session, index)).catch(reject);
        });
      }

      if (session === speechifySessionRef.current) {
        releaseSpeechifyMedia();
        clearStoryNarrationHighlight();
        speechifyHighlightedWordRef.current = null;
        speechifyNarrationChunksRef.current = [];
        speechifyModeRef.current = "section";
        setSpeechifyReadAllMode(false);
        setSpeechifyStatus("idle");
        setSpeechifyNowPlaying("");
        setSpeechifyChunkProgress({ current: 0, total: 0 });
        setSpeechifyTimeline((current) => ({ ...current, currentMs: current.totalMs, chunkIndex: Math.max(0, chunks.length - 1) }));
      }
    } catch (error) {
      if (controller.signal.aborted || session !== speechifySessionRef.current) return;
      releaseSpeechifyMedia();
      clearStoryNarrationHighlight();
      speechifyHighlightedWordRef.current = null;
      speechifyNarrationChunksRef.current = [];
      speechifyModeRef.current = "section";
      setSpeechifyReadAllMode(false);
      setSpeechifyError(error instanceof Error ? error.message : "Synchronized Speechify narration failed.");
      setSpeechifyStatus("error");
      setSpeechifyPanelOpen(true);
    }
  }

  function toggleSpeechifyPageNarration() {
    if (speechifyReadAllMode && speechifyStatus === "playing" && speechifyAudioRef.current) {
      speechifyAudioRef.current.pause();
      window.cancelAnimationFrame(speechifyTrackingFrameRef.current);
      setSpeechifyStatus("paused");
      return;
    }
    if (speechifyReadAllMode && speechifyStatus === "paused" && speechifyAudioRef.current) {
      const audio = speechifyAudioRef.current;
      void audio.play().then(() => {
        setSpeechifyStatus("playing");
        const chunk = speechifyActiveChunkRef.current;
        if (chunk) beginSpeechifyWordTracking(audio, speechifyActiveMarksRef.current, chunk, speechifySessionRef.current, speechifyActiveChunkIndexRef.current);
      }).catch((error) => {
        setSpeechifyError(error instanceof Error ? error.message : "Speechify audio could not resume.");
        setSpeechifyStatus("error");
      });
      return;
    }
    void startSpeechifyPageNarration();
  }

  function seekSpeechifyTimeline(targetMs: number) {
    const chunks = visibleStoryNarrationChunks();
    if (!chunks.length) return;
    const location = findSpeechifyTimelineLocation(
      Math.max(0, Math.min(targetMs, speechifyTimeline.totalMs)),
      speechifyChunkDurationsRef.current
    );
    setSpeechifyPanelTab("narrations");
    void startSpeechifyPageNarration(chunks[location.chunkIndex]?.inputStart || 0, chunks, location);
  }

  function toggleSavedSpeechifyNarration() {
    if (speechifyReadAllMode && (speechifyStatus === "playing" || speechifyStatus === "paused")) {
      toggleSpeechifyPageNarration();
      return;
    }
    seekSpeechifyTimeline(speechifyTimeline.currentMs >= speechifyTimeline.totalMs ? 0 : speechifyTimeline.currentMs);
  }

  function seekSpeechifyChapter(group: StoryNarrationChapterGroup) {
    const chunks = visibleStoryNarrationChunks();
    if (!chunks.length) return;
    setSpeechifyPanelTab("narrations");
    void startSpeechifyPageNarration(group.inputOffset, chunks);
  }

  function seekAdjacentSpeechifyChapter(direction: -1 | 1) {
    if (!speechifyNarrationChapters.length) return;
    const currentGroupIndex = Math.max(0, speechifyNarrationChapters.findIndex((group) => isSpeechifyChapterActive(
      group,
      speechifyNarrationChapters,
      speechifyTimeline.currentMs
    )));
    const target = speechifyNarrationChapters[Math.max(0, Math.min(currentGroupIndex + direction, speechifyNarrationChapters.length - 1))];
    if (target) seekSpeechifyChapter(target);
  }

  function handleStoryNarrationWordClick(event: ReactMouseEvent<HTMLElement>) {
    if (!speechifyReadAllMode) return;
    const root = storyTreatmentReaderRef.current;
    if (!root) return;
    const target = findStoryNarrationWordAtPoint(
      root,
      event.clientX,
      event.clientY,
      speechifyNarrationChunksRef.current.flatMap((chunk) => chunk.words)
    );
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    highlightStoryNarrationWord(target, true);
    speechifyHighlightedWordRef.current = target;
    void startSpeechifyPageNarration(target.inputStart, speechifyNarrationChunksRef.current);
  }

  function toggleSpeechifyNarration() {
    if (speechifyReadAllMode) {
      toggleSpeechifyPageNarration();
      return;
    }
    if (speechifyStatus === "playing" && speechifyAudioRef.current) {
      speechifyAudioRef.current.pause();
      setSpeechifyStatus("paused");
      return;
    }
    if (speechifyStatus === "paused" && speechifyAudioRef.current) {
      void speechifyAudioRef.current.play().then(() => setSpeechifyStatus("playing")).catch((error) => {
        setSpeechifyError(error instanceof Error ? error.message : "Speechify audio could not resume.");
        setSpeechifyStatus("error");
      });
      return;
    }
    if (selectedLibraryItem) {
      void startSpeechifyNarration(`${selectedLibraryItem.title}. ${selectedLibraryItem.fullText}`, selectedLibraryItem.title);
      return;
    }
    if (activeReaderChapter) {
      void handleSpeechifyChapterNarration(activeReaderChapter.id, activeReaderChapter.title);
    }
  }

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
                <>
                  <StoryChapterEditor
                    chapter={selectedChapter}
                    chapterIndex={selectedChapterOrderIndex}
                    chapterCount={chapters.length}
                    onChange={updateSelectedChapter}
                    onMove={moveSelectedChapter}
                    onDelete={deleteSelectedChapter}
                  />
                  <StoryPageEditor
                    page={currentPage}
                    pageIndex={currentPageIndex}
                    pageCount={selectedChapter.pages.length}
                    onChange={updateCurrentPage}
                    onAddPage={addPage}
                    onDeletePage={deleteCurrentPage}
                    onSelectPage={setPage}
                  />
                  <StoryMiniScribe
                    chapter={selectedChapter}
                    currentPageIndex={currentPageIndex}
                    readOnly={readOnly}
                    onApply={applyStoryScribeDraft}
                  />
                </>
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
        <section className="story-treatment-shell">
          <header className="story-treatment-toolbar">
            <button className="story-reader-exit" onClick={openStoryOverview}>
              <Icon name="BookOpen" className="h-4 w-4" />
              Story Overview
            </button>
            <div className="story-treatment-depth" aria-label="Reading depth">
              {(["overview", "standard", "detailed"] as StoryReadingDepth[]).map((depth) => (
                <button key={depth} className={readingDepth === depth ? "active" : ""} onClick={() => setReadingDepth(depth)}>
                  {depth[0].toUpperCase() + depth.slice(1)}
                </button>
              ))}
            </div>
            <div className={`story-speechify-control ${speechifyPanelOpen ? "open" : ""}`}>
              <div className="story-speechify-trigger-group">
                <button
                  type="button"
                  className={speechifyReadAllMode && (speechifyStatus === "playing" || speechifyStatus === "paused") ? "active" : ""}
                  onClick={toggleSpeechifyPageNarration}
                  disabled={speechifyStatus === "connecting" || (!activeReaderChapter && !selectedLibraryItem)}
                  title={speechifyReadAllMode && speechifyStatus === "playing" ? "Pause full-page narration" : speechifyReadAllMode && speechifyStatus === "paused" ? "Resume full-page narration" : "Read this page from top to bottom"}
                >
                  <Icon name={speechifyReadAllMode && speechifyStatus === "playing" ? "Pause" : "Play"} className="h-4 w-4" />
                  {speechifyReadAllMode && speechifyStatus === "playing" ? "Pause" : speechifyReadAllMode && speechifyStatus === "paused" ? "Resume" : "Play All"}
                </button>
                <button
                  type="button"
                  className="story-speechify-options-button"
                  onClick={() => setSpeechifyPanelOpen((current) => !current)}
                  title="Speechify voice and playback settings"
                  aria-label="Speechify voice and playback settings"
                >
                  <Icon name="ChevronDown" className="h-4 w-4" />
                </button>
              </div>
              {speechifyPanelOpen && (
                <section
                  className="story-speechify-panel"
                  data-speechify-timing={`${speechifyTimingDiagnostics.marks}:${speechifyTimingDiagnostics.words}:${speechifyTimingDiagnostics.matched}`}
                >
                  <header>
                    <div>
                      <span>Story Narration</span>
                      <strong>Speechify Reader</strong>
                    </div>
                    <button type="button" onClick={() => setSpeechifyPanelOpen(false)} title="Close Speechify settings" aria-label="Close Speechify settings">
                      <Icon name="X" className="h-4 w-4" />
                    </button>
                  </header>

                  <div className="story-speechify-tabs" role="tablist" aria-label="Speechify reader views">
                    <button type="button" role="tab" aria-selected={speechifyPanelTab === "reader"} className={speechifyPanelTab === "reader" ? "active" : ""} onClick={() => setSpeechifyPanelTab("reader")}>
                      <Icon name="Volume2" className="h-4 w-4" /> Reader
                    </button>
                    <button type="button" role="tab" aria-selected={speechifyPanelTab === "narrations"} className={speechifyPanelTab === "narrations" ? "active" : ""} onClick={() => setSpeechifyPanelTab("narrations")}>
                      <Icon name="ListChecks" className="h-4 w-4" /> Narrations
                    </button>
                  </div>

                  {speechifyPanelTab === "reader" && (<div className="story-speechify-tab-panel">
                  {speechifyNowPlaying && (
                    <div className="story-speechify-now-playing">
                      <Icon name="Volume2" className="h-4 w-4" />
                      <div>
                        <span>{speechifyStatus === "connecting" ? "Preparing" : speechifyStatus === "paused" ? "Paused" : "Reading"}</span>
                        <strong>{speechifyNowPlaying}</strong>
                        {speechifyChunkProgress.total > 1 && <small>Part {speechifyChunkProgress.current} of {speechifyChunkProgress.total}</small>}
                      </div>
                    </div>
                  )}

                  <label>
                    <span>Voice</span>
                    <select
                      value={speechifyVoiceId}
                      onChange={(event) => {
                        stopSpeechifyNarration();
                        setSpeechifyVoiceId(event.target.value);
                        saveSpeechifyVoicePreference(event.target.value);
                      }}
                      disabled={!speechifyVoices.length || speechifyRecordingState.phase === "recording"}
                    >
                      {!speechifyVoices.length && <option value="">{speechifyStatus === "connecting" ? "Loading Speechify voices..." : "No voices loaded"}</option>}
                      {speechifyVoices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name}{voice.language ? ` · ${voice.language}` : ""}{voice.gender ? ` · ${voice.gender}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Reading speed</span>
                    <select value={speechifyRate} onChange={(event) => setSpeechifyRate(Number(event.target.value))}>
                      {[0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
                    </select>
                  </label>

                  <div className="story-speechify-actions">
                    <button type="button" onClick={toggleSpeechifyNarration} disabled={speechifyStatus === "connecting" || (!activeReaderChapter && !selectedLibraryItem)}>
                      <Icon name={speechifyStatus === "playing" ? "Pause" : "Volume2"} className="h-4 w-4" />
                      {speechifyStatus === "playing" ? "Pause" : speechifyStatus === "paused" ? "Resume" : "Speechify Current"}
                    </button>
                    <button type="button" onClick={stopSpeechifyNarration} disabled={speechifyStatus === "idle"}>
                      <Icon name="Square" className="h-4 w-4" />
                      Stop
                    </button>
                  </div>
                  <small className="story-speechify-footnote">
                    {speechifyReadAllMode
                      ? "Click any word in the story to continue narration from that point. Playback uses the shared recording."
                      : "Play All uses the shared recording, so team playback does not spend Speechify credits."}
                  </small>
                  </div>)}

                  {speechifyPanelTab === "narrations" && (<div className="story-speechify-tab-panel story-speechify-narrations">
                  <div className={`story-speechify-recording ${speechifyRecordingState.phase}`}>
                    <div>
                      <Icon
                        name={speechifyRecordingState.phase === "ready" ? "CircleCheck" : speechifyRecordingState.phase === "error" ? "CircleAlert" : "UploadCloud"}
                        className="h-4 w-4"
                      />
                      <div>
                        <span>Saved Story Sections</span>
                        <strong>
                          {speechifyRecordingState.phase === "checking"
                            ? "Checking sections"
                            : speechifyRecordingState.phase === "recording"
                              ? `Recording part ${speechifyRecordingState.current}`
                              : speechifyRecordingState.total
                                ? `${speechifyRecordingState.recorded} of ${speechifyRecordingState.total} audio parts ready`
                                : "Choose a section below"}
                        </strong>
                      </div>
                    </div>
                    {speechifyRecordingState.total > 0 && (
                      <div className="story-speechify-recording-progress" aria-label={`${speechifyRecordingState.recorded} of ${speechifyRecordingState.total} narration sections recorded`}>
                        <span style={{ width: `${Math.round((speechifyRecordingState.recorded / speechifyRecordingState.total) * 100)}%` }} />
                      </div>
                    )}
                    {speechifyRecordingState.message && <p>{speechifyRecordingState.message}</p>}
                    {speechifyRecordingState.phase === "recording" && canEditStory && (
                      <button type="button" onClick={stopSpeechifyRecording}>
                        <Icon name="Square" className="h-4 w-4" /> Stop and Save Progress
                      </button>
                    )}
                    {speechifyRecordingState.phase !== "recording" && canEditStory && speechifyRecordingState.total > 0 && (
                      <button
                        type="button"
                        onClick={() => void recordAllSpeechifySections()}
                        disabled={speechifyRecordingState.phase === "ready" || speechifyRecordingState.phase === "checking"}
                      >
                        <Icon name={speechifyRecordingState.phase === "ready" ? "CircleCheck" : "RefreshCw"} className="h-4 w-4" />
                        {speechifyRecordingState.phase === "ready"
                          ? "Recording Complete"
                          : speechifyRecordingState.recorded
                            ? "Record Remaining"
                            : "Create Fresh Recording"}
                        {speechifyRecordingState.phase !== "ready" && speechifyRecordingEstimateUsd > 0
                          ? ` - est. $${speechifyRecordingEstimateUsd.toFixed(2)}`
                          : ""}
                      </button>
                    )}
                  </div>

                  {speechifyRecordingState.recorded > 0 && speechifyTimeline.totalMs > 0 && (
                    <div className="story-speechify-player">
                      <div className="story-speechify-player-controls">
                        <button type="button" onClick={() => seekAdjacentSpeechifyChapter(-1)} title="Previous chapter" aria-label="Previous chapter"><Icon name="ChevronsLeft" className="h-4 w-4" /></button>
                        <button type="button" className="primary" onClick={toggleSavedSpeechifyNarration} title={speechifyStatus === "playing" ? "Pause narration" : "Play saved narration"} aria-label={speechifyStatus === "playing" ? "Pause narration" : "Play saved narration"}>
                          <Icon name={speechifyStatus === "playing" ? "Pause" : "Play"} className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => seekAdjacentSpeechifyChapter(1)} title="Next chapter" aria-label="Next chapter"><Icon name="ChevronsRight" className="h-4 w-4" /></button>
                      </div>
                      <input
                        className="story-speechify-timeline"
                        type="range"
                        min={0}
                        max={Math.max(1, speechifyTimeline.totalMs)}
                        step={250}
                        value={Math.min(speechifyTimeline.currentMs, speechifyTimeline.totalMs)}
                        onChange={(event) => setSpeechifyTimeline((current) => ({ ...current, currentMs: Number(event.target.value) }))}
                        onPointerUp={(event) => seekSpeechifyTimeline(Number(event.currentTarget.value))}
                        onKeyUp={(event) => {
                          if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) seekSpeechifyTimeline(Number(event.currentTarget.value));
                        }}
                        aria-label="Narration timeline"
                      />
                      <div className="story-speechify-time-row">
                        <span>{formatSpeechifyDuration(speechifyTimeline.currentMs)}</span>
                        <div>
                          <button type="button" onClick={() => seekSpeechifyTimeline(speechifyTimeline.currentMs - 15_000)}>15s back</button>
                          <button type="button" onClick={() => seekSpeechifyTimeline(speechifyTimeline.currentMs + 15_000)}>15s ahead</button>
                        </div>
                        <span>{formatSpeechifyDuration(speechifyTimeline.totalMs)}</span>
                      </div>
                    </div>
                  )}

                  <div className="story-speechify-chapter-list">
                    {speechifyNarrationChapters.map((group) => (
                      <button
                        type="button"
                        key={group.id}
                        className={isSpeechifyChapterActive(group, speechifyNarrationChapters, speechifyTimeline.currentMs) ? "active" : ""}
                        onClick={() => void handleSpeechifyChapterNarration(group.id, group.title)}
                        disabled={speechifySectionAction.phase === "recording" && speechifySectionAction.chapterId !== group.id}
                      >
                        <Icon name={group.recordedCount === group.sectionCount ? "CircleCheck" : group.recordedCount ? "CircleDashed" : "CircleAlert"} className="h-4 w-4" />
                        <span>
                          <strong>{group.title}</strong>
                          <small>{group.recordedCount === group.sectionCount ? "Saved and ready" : group.recordedCount ? `${group.recordedCount} of ${group.sectionCount} parts saved` : canEditStory ? "Click to record" : "Awaiting admin recording"}</small>
                        </span>
                        <time>{group.durationMs ? formatSpeechifyDuration(group.durationMs) : "--:--"}</time>
                      </button>
                    ))}
                  </div>
                  <small className="story-speechify-footnote">Sections are listed in story order. Click one to play its saved narration; admins are asked before any missing part is recorded.</small>
                  </div>)}

                  {speechifyError && speechifyError !== speechifyRecordingState.message && (
                    <div className="story-speechify-error" role="alert">
                      <Icon name="CircleAlert" className="h-4 w-4" />
                      <span>{speechifyError}</span>
                    </div>
                  )}
                </section>
              )}
            </div>
            {storySearchOpen && (
              <label className="story-treatment-search">
                <Icon name="Search" className="h-4 w-4" />
                <input
                  ref={storySearchInputRef}
                  value={storySearch}
                  onChange={(event) => setStorySearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setStorySearch("");
                      setStorySearchOpen(false);
                    }
                  }}
                  placeholder={selectedLibraryItem ? "Search the world guide" : "Search the story"}
                />
                <button
                  type="button"
                  onClick={() => {
                    setStorySearch("");
                    setStorySearchOpen(false);
                  }}
                  title="Close search"
                  aria-label="Close search"
                >
                  <Icon name="X" className="h-4 w-4" />
                </button>
              </label>
            )}
            <select value={storyThread} onChange={(event) => setStoryThread(event.target.value)} aria-label="Story thread" disabled={Boolean(selectedLibraryItem)}>
              <option value="all">All story threads</option>
              {storyThreads.map((thread) => <option key={thread} value={thread}>{thread}</option>)}
            </select>
            <button className="button-frame" onClick={() => setStoryToolsOpen(true)}>
              <Icon name="ListChecks" className="h-4 w-4" />
              Story Tools
            </button>
            {canEditStory && (
              <button className="button-frame story-scribe-toolbar-button" onClick={() => openStoryScribe("wholeJourney")}>
                <Icon name="Sparkles" className="h-4 w-4" />
                Tavern Scribe
              </button>
            )}
          </header>

          <div className="story-treatment-progress" aria-label={selectedLibraryItem ? "World guide topic open" : `Reading progress ${Math.round(readingProgress)} percent`}>
            <span style={{ width: `${selectedLibraryItem ? 100 : readingProgress}%` }} />
          </div>

          <div className={`story-treatment-layout ${storyInspectorCollapsed ? "story-inspector-is-collapsed" : ""}`}>
            <aside className="story-treatment-navigator">
              <div className="story-treatment-navigator-heading">
                <p>Story &amp; World Navigator</p>
                <strong>{selectedLibraryItem ? selectedLibraryItem.eyebrow : `${readingChapters.length ? activeReaderIndex + 1 : 0} of ${readingChapters.length} chapters`}</strong>
              </div>
              <section className="story-navigator-collection chronology">
                <button className="story-treatment-act-toggle story-navigator-collection-toggle" onClick={() => setChronologyCollapsed((current) => !current)}>
                  <span><Icon name="Clock3" className="h-4 w-4" /> Chronological Story</span>
                  <b>{chapters.length}</b>
                  <Icon name={chronologyCollapsed ? "ChevronRight" : "ChevronDown"} className="h-4 w-4" />
                </button>
                {!chronologyCollapsed && readingGroups.map(({ scope, chapters: groupChapters }) => {
                  const collapsed = collapsedActs.includes(scope.id);
                  return (
                    <div key={scope.id} className="story-navigator-act-group">
                      <button className="story-treatment-act-toggle" onClick={() => setCollapsedActs((current) => current.includes(scope.id) ? current.filter((id) => id !== scope.id) : [...current, scope.id])}>
                        <span>{scope.label}</span>
                        <Icon name={collapsed ? "ChevronRight" : "ChevronDown"} className="h-4 w-4" />
                      </button>
                      {!collapsed && groupChapters.map((chapter) => (
                        <div key={chapter.id} className={`story-treatment-nav-chapter ${!selectedLibraryItem && activeReaderChapterId === chapter.id ? "active" : ""}`}>
                          <button onClick={() => { setSelectedLibraryItemId(""); window.setTimeout(() => scrollToStorySection(chapter.id), 40); }}>{chapter.title}</button>
                          {readingDepth !== "overview" && chapter.pages.map((page) => (
                            <button key={page.id || page.title} className="story-treatment-nav-beat" onClick={() => { setSelectedLibraryItemId(""); window.setTimeout(() => scrollToStorySection(chapter.id, page.id), 40); }}>
                              {page.title}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>

              <p className="story-navigator-divider">World Guide</p>
              {filteredLibrarySections.map((section) => {
                const collapsed = collapsedLibrarySections.includes(section.id) && !normalizedStorySearch;
                return (
                  <section key={section.id} className="story-navigator-collection">
                    <button className="story-treatment-act-toggle story-navigator-collection-toggle" onClick={() => setCollapsedLibrarySections((current) => current.includes(section.id) ? current.filter((id) => id !== section.id) : [...current, section.id])}>
                      <span>{section.label}</span>
                      <b>{section.items.length}</b>
                      <Icon name={collapsed ? "ChevronRight" : "ChevronDown"} className="h-4 w-4" />
                    </button>
                    {!collapsed && (
                      <div className="story-library-nav-items">
                        {section.items.length ? section.items.map((item) => (
                          <button key={item.id} className={selectedLibraryItemId === item.id ? "active" : ""} onClick={() => openLibraryItem(item)}>
                            <span>{item.title}</span>
                            <small>{item.eyebrow}</small>
                          </button>
                        )) : <span className="story-library-no-results">No matches</span>}
                      </div>
                    )}
                  </section>
                );
              })}
            </aside>

            <LoreKeywordHoverBoundary
              additionalKeywords={storyInspectorKeywords}
              onKeywordEnter={setHoveredLoreTerm}
              onKeywordLeave={(keyword) => setHoveredLoreTerm((current) => normalizeTerm(current) === normalizeTerm(keyword) ? "" : current)}
            >
              <main
                ref={storyTreatmentReaderRef}
                className={`story-treatment-reader ${speechifyReadAllMode ? "narration-following" : ""}`}
                onClickCapture={handleStoryNarrationWordClick}
              >
              {selectedLibraryItem ? (
                <article className="story-library-reader">
                  <header className="story-library-titlepage" data-story-narration-block>
                    <span>{selectedLibraryItem.eyebrow}</span>
                    <h1 className="font-display">{selectedLibraryItem.title}</h1>
                    <p>{selectedLibraryItem.summary || "This topic does not have a written summary yet."}</p>
                    <div>
                      {selectedLibraryItem.tags.slice(0, 8).map((tag) => <strong key={tag}>{tag}</strong>)}
                    </div>
                  </header>

                  {readingDepth !== "overview" && (
                    <section className="story-library-prose" data-story-narration-block>
                      <span>Story Reading Guide</span>
                      <h2>Key Story Context</h2>
                      <RichLoreText text={selectedLibraryItem.fullText || selectedLibraryItem.summary} />
                    </section>
                  )}

                  {readingDepth === "detailed" && selectedLibraryItem.facts.length > 0 && (
                    <section className="story-library-facts" data-story-narration-block>
                      <span>Reference Notes</span>
                      <h2>Key details</h2>
                      <dl>
                        {selectedLibraryItem.facts.map((fact) => (
                          <div key={`${fact.label}-${fact.value}`}>
                            <dt>{fact.label}</dt>
                            <dd>{fact.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}

                  {selectedLibraryChapters.length > 0 && (
                    <section className="story-library-connections">
                      <span>Chronology</span>
                      <h2>Appears in the story</h2>
                      <div>
                        {selectedLibraryChapters.map((chapter) => (
                          <button key={chapter.id} onClick={() => openLibraryChronologyChapter(chapter.id)}>
                            <small>{chapter.era}</small>
                            <strong>{chapter.title}</strong>
                            <p>{chapter.shortDescription}</p>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedLibraryReferences.length > 0 && (
                    <section className="story-library-connections">
                      <span>Story Sources</span>
                      <h2>Linked canon references</h2>
                      <div>
                        {selectedLibraryReferences.map((reference) => (
                          <article key={reference.id} data-story-narration-block>
                            <small>{reference.canonStatus} · {reference.spoilerLevel}</small>
                            <strong>{reference.title}</strong>
                            <p>{reference.shortSummary}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  <footer className="story-library-footer">
                    <p>This reading page is generated from the existing Cookbook record. Editing its source updates this guide.</p>
                    <button className="button-frame" onClick={() => openLibrarySource(selectedLibraryItem)}>
                      <Icon name="ExternalLink" className="h-4 w-4" />
                      Open Full Source Module
                    </button>
                  </footer>
                </article>
              ) : (
                <>
              <header className="story-treatment-titlepage" data-story-narration-block>
                <p>Tales of the Tavern · Story Reader</p>
                <h1 className="font-display">{storyJourney.title || "The Story of Tales of the Tavern"}</h1>
                <span>{storyJourney.description}</span>
                <div>
                  <strong>{readingChapters.length} chapters</strong>
                  <strong>{readingChapters.reduce((total, chapter) => total + chapter.pages.length, 0)} story beats</strong>
                  <strong>{readingDepth} reading depth</strong>
                </div>
              </header>

              {!readingChapters.length ? (
                <section className="story-treatment-empty">
                  <Icon name="Search" className="h-8 w-8" />
                  <h2>No story sections match.</h2>
                  <p>Clear the search or choose another story thread.</p>
                </section>
              ) : readingGroups.map(({ scope, chapters: groupChapters }) => (
                <section key={scope.id} className="story-treatment-act">
                  <header data-story-narration-block>
                    <span>{scope.eyebrow}</span>
                    <h2 className="font-display">{scope.label}</h2>
                    <p>{scope.description}</p>
                  </header>
                  {groupChapters.map((chapter, chapterIndex) => (
                    <StoryTreatmentChapter
                      key={chapter.id}
                      chapter={chapter}
                      chapterIndex={chapterIndex}
                      scopeLabel={scope.label}
                      readingDepth={readingDepth}
                      canEdit={canEditStory}
                      draft={inlineChapterDraft?.id === chapter.id ? inlineChapterDraft : null}
                      entries={entries}
                      bestiary={bestiary}
                      onLoreClick={setSelectedLoreTerm}
                      onEdit={() => editReaderChapter(chapter.id)}
                      onScribeChapter={() => openStoryScribe("wholeChapter", chapter.id)}
                      onScribePage={(pageIndex) => openStoryScribe("currentPage", chapter.id, pageIndex)}
                      onDraftChange={updateInlineChapterDraft}
                      onPageChange={updateInlinePageDraft}
                      onAddPage={addInlinePageDraft}
                      onDeletePage={deleteInlinePageDraft}
                      onSave={saveInlineChapterDraft}
                      onCancel={() => setInlineChapterDraft(null)}
                      onSpeechifyChapter={() => void handleSpeechifyChapterNarration(chapter.id, chapter.title)}
                      speechifyAction={speechifySectionAction.chapterId === chapter.id ? speechifySectionAction : null}
                      narrationLabel={speechifyNowPlaying}
                      narrationStatus={speechifyStatus}
                    />
                  ))}
                </section>
              ))}
                </>
              )}
              </main>
            </LoreKeywordHoverBoundary>
            <StoryContextInspector
              subject={storyInspectorSubject}
              isHoverPreview={Boolean(storyInspectorHoverSubject)}
              imageIndex={storyInspectorImageIndex}
              collapsed={storyInspectorCollapsed}
              canEdit={canEditStory}
              onImageIndexChange={setStoryInspectorImageIndex}
              onToggleCollapsed={() => setStoryInspectorCollapsed((current) => !current)}
              onOpenSource={openStoryInspectorSource}
              onAddArt={openStoryInspectorArtManager}
            />
          </div>
        </section>
      )}

      {selectedLore && (
        <aside className="story-lore-panel">
          <button className="story-lore-close" onClick={() => setSelectedLoreTerm("")}>X</button>
          <p>{selectedLore.type}</p>
          <h2 className="font-display">{selectedLore.name}</h2>
          <span>{selectedLore.description}</span>
          <div>
            <button className="button-frame" onClick={() => openLoreFullPage(selectedLore)} disabled={!selectedLore.entry && !selectedLore.creature && !selectedLore.worldEntry}>
              Open Full Page
            </button>
            <button onClick={openLoreThread} disabled={!storyThreadChapters.length}>
              View Story Thread
            </button>
            <button onClick={() => openLoreFullPage(selectedLore)} disabled={!selectedLore.entry && !selectedLore.creature && !selectedLore.worldEntry}>
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
      {storyToolsOpen && (
        <div className="story-tools-backdrop" role="presentation" onMouseDown={() => setStoryToolsOpen(false)}>
          <section className="story-tools-panel" role="dialog" aria-modal="true" aria-label="Story tools" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>Story Tools</p>
                <h2 className="font-display">Canon Review</h2>
                <span>Questions and contradictions found across the current Cookbook. These are kept out of the clean reader until canon is confirmed.</span>
              </div>
              <button onClick={() => setStoryToolsOpen(false)} aria-label="Close story tools">×</button>
            </header>
            <div className="story-tools-summary">
              <strong>{canonReviewItems.length} review items</strong>
              <span>{canonReviewItems.filter((item) => item.severity === "gap").length} missing story connections</span>
              <span>{canonReviewItems.filter((item) => item.severity === "conflict").length} naming or canon conflicts</span>
              {canEditStory && (
                <button onClick={addChapter}>
                  <Icon name="Plus" className="h-4 w-4" /> Add Chapter
                </button>
              )}
            </div>
            <div className="story-tools-list">
              {canonReviewItems.map((item) => (
                <article key={item.id} className={item.severity}>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  {item.chapterId && <button onClick={() => { setStoryToolsOpen(false); scrollToStorySection(item.chapterId!); }}>Open in reader</button>}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
      {storyScribeOpen && storyScribeTarget && canEditStory && (
        <div className="story-scribe-backdrop" role="presentation" onMouseDown={() => setStoryScribeOpen(false)}>
          <div className="story-scribe-dialog" role="dialog" aria-modal="true" aria-label="Tavern Scribe for Story Journey" onMouseDown={(event) => event.stopPropagation()}>
            <StoryJourneyScribe
              chapters={chapters}
              target={storyScribeTarget}
              onTargetChange={setStoryScribeTarget}
              onApply={applyStoryScribeJourneyDraft}
              onClose={() => setStoryScribeOpen(false)}
            />
          </div>
        </div>
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
      {storyInspectorEditSubject && storyInspectorManagerSlot && (
        <ImageManagerModal
          title={`Add ${storyInspectorEditSubject.title} Reference Art`}
          subtitle="Upload or choose one strong still image. It is saved to this subject's existing Art Vault and Google Drive folder, so every connected view can use it."
          slots={[storyInspectorManagerSlot]}
          onClose={() => setStoryInspectorEditSubject(null)}
          onSave={saveStoryInspectorArt}
        />
      )}
    </section>
  );
}

function StoryContextInspector({
  subject,
  isHoverPreview,
  imageIndex,
  collapsed,
  canEdit,
  onImageIndexChange,
  onToggleCollapsed,
  onOpenSource,
  onAddArt
}: {
  subject: StoryInspectorSubject | null;
  isHoverPreview: boolean;
  imageIndex: number;
  collapsed: boolean;
  canEdit: boolean;
  onImageIndexChange: (index: number) => void;
  onToggleCollapsed: () => void;
  onOpenSource: (subject: StoryInspectorSubject) => void;
  onAddArt: (subject: StoryInspectorSubject) => void;
}) {
  const activeImage = subject?.images[Math.min(imageIndex, Math.max(0, subject.images.length - 1))] || null;

  if (collapsed) {
    return (
      <aside className="story-context-inspector collapsed">
        <button type="button" className="story-context-expand" onClick={onToggleCollapsed} title="Open live story reference" aria-label="Open live story reference">
          <Icon name="Eye" className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="story-context-inspector" aria-live="polite">
      <header className="story-context-header">
        <div>
          <span>{isHoverPreview ? "Live hover preview" : "Reading reference"}</span>
          <strong>Story &amp; Art Viewer</strong>
        </div>
        <button type="button" onClick={onToggleCollapsed} title="Collapse story reference" aria-label="Collapse story reference">
          <Icon name="ChevronRight" className="h-4 w-4" />
        </button>
      </header>

      {subject ? (
        <div className="story-context-content">
          <div className="story-context-subject">
            <span>{subject.type}</span>
            <h2 className="font-display">{subject.title}</h2>
            <p>{subject.summary || "This subject does not have a short description yet."}</p>
          </div>

          <section className="story-context-gallery" aria-label={`${subject.title} reference art`}>
            {activeImage ? (
              <>
                <div className="story-context-hero">
                  <DriveAwareImage
                    src={activeImage.url}
                    alt={activeImage.label || subject.title}
                    loading="lazy"
                    draggable={false}
                    style={imageFitToStyle(activeImage.imageFit)}
                  />
                </div>
                <div className="story-context-image-meta">
                  <span>{activeImage.source}</span>
                  <strong>{activeImage.label}</strong>
                </div>
                {subject.images.length > 1 && (
                  <div className="story-context-thumbnails">
                    {subject.images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        className={index === imageIndex ? "active" : ""}
                        onClick={() => onImageIndexChange(index)}
                        title={image.label}
                      >
                        <DriveAwareImage src={image.url} alt="" loading="lazy" draggable={false} style={imageFitToStyle(image.imageFit)} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="story-context-empty-art">
                <Icon name="Image" className="h-7 w-7" />
                <strong>No reference art yet</strong>
                <span>Add a still, portrait, or concept image without leaving the reader.</span>
              </div>
            )}
          </section>

          {subject.tags.length > 0 && (
            <div className="story-context-tags">
              {subject.tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}

          <div className="story-context-actions">
            <button type="button" onClick={() => onOpenSource(subject)}>
              <Icon name="ExternalLink" className="h-4 w-4" /> Open source
            </button>
            {canEdit && (
              <button type="button" className="primary" onClick={() => onAddArt(subject)}>
                <Icon name="Plus" className="h-4 w-4" /> Add reference art
              </button>
            )}
          </div>
          <p className="story-context-hint">
            Hover a highlighted name in the story to preview its information and art here.
          </p>
        </div>
      ) : (
        <div className="story-context-empty">
          <Icon name="BookOpen" className="h-7 w-7" />
          <strong>Choose a story subject</strong>
          <span>Open a World Guide topic or hover a highlighted name while reading.</span>
        </div>
      )}
    </aside>
  );
}

function StoryTreatmentChapter({
  chapter,
  chapterIndex,
  scopeLabel,
  readingDepth,
  canEdit,
  draft,
  entries,
  bestiary,
  onLoreClick,
  onEdit,
  onScribeChapter,
  onScribePage,
  onDraftChange,
  onPageChange,
  onAddPage,
  onDeletePage,
  onSave,
  onCancel,
  onSpeechifyChapter,
  speechifyAction,
  narrationLabel,
  narrationStatus
}: {
  chapter: StoryChapter;
  chapterIndex: number;
  scopeLabel: string;
  readingDepth: StoryReadingDepth;
  canEdit: boolean;
  draft: StoryChapter | null;
  entries: LoreEntry[];
  bestiary: BestiaryCreature[];
  onLoreClick: (term: string) => void;
  onEdit: () => void;
  onScribeChapter: () => void;
  onScribePage: (pageIndex: number) => void;
  onDraftChange: (patch: Partial<StoryChapter>) => void;
  onPageChange: (pageId: string, patch: Partial<StoryPage>) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onSpeechifyChapter: () => void;
  speechifyAction: StoryNarrationSectionAction | null;
  narrationLabel: string;
  narrationStatus: "idle" | "connecting" | "playing" | "paused" | "error";
}) {
  const visibleChapter = draft || chapter;
  const editing = Boolean(draft && canEdit);

  return (
    <article
      id={`story-chapter-${chapter.id}`}
      data-story-reader-chapter={chapter.id}
      className={`story-treatment-chapter ${editing ? "inline-editing" : ""}`}
    >
      <header className="story-treatment-chapter-heading">
        <div data-story-narration-block={!editing ? "true" : undefined}>
          <span>{scopeLabel} · Chapter {chapterIndex + 1}</span>
          {editing ? (
            <>
              <input
                className="story-inline-title-input font-display"
                value={visibleChapter.title}
                onChange={(event) => onDraftChange({ title: event.target.value })}
                aria-label="Chapter title"
              />
              <input
                className="story-inline-subtitle-input"
                value={visibleChapter.subtitle}
                onChange={(event) => onDraftChange({ subtitle: event.target.value })}
                placeholder="Chapter subtitle"
                aria-label="Chapter subtitle"
              />
            </>
          ) : (
            <>
              <h2 className="font-display">{visibleChapter.title}</h2>
              <p>{visibleChapter.subtitle}</p>
            </>
          )}
        </div>
        <div className="story-treatment-chapter-actions">
          <em>{visibleChapter.revealLevel}</em>
          {!editing && (
            <button
              className={narrationLabel === visibleChapter.title && narrationStatus !== "idle" ? "story-listen-active" : ""}
              onClick={onSpeechifyChapter}
              title={`Record or play ${visibleChapter.title} with Speechify`}
              disabled={speechifyAction?.phase === "checking" || speechifyAction?.phase === "recording"}
            >
              <Icon name={speechifyAction?.phase === "ready" ? "CircleCheck" : "Volume2"} className="h-4 w-4" />
              {speechifyAction?.phase === "checking"
                ? "Checking..."
                : speechifyAction?.phase === "recording"
                  ? `Recording ${speechifyAction.current}/${speechifyAction.total}`
                  : narrationLabel === visibleChapter.title && narrationStatus === "playing"
                    ? "Pause"
                    : narrationLabel === visibleChapter.title && narrationStatus === "paused"
                      ? "Resume"
                      : "Speechify"}
            </button>
          )}
          {editing ? (
            <>
              <button className="story-inline-save" onClick={onSave}><Icon name="Save" className="h-4 w-4" /> Save</button>
              <button onClick={onCancel}><Icon name="X" className="h-4 w-4" /> Cancel</button>
            </>
          ) : canEdit ? (
            <>
              <button onClick={onScribeChapter}><Icon name="Sparkles" className="h-4 w-4" /> Scribe</button>
              <button onClick={onEdit}><Icon name="Edit3" className="h-4 w-4" /> Edit</button>
            </>
          ) : null}
        </div>
      </header>

      {editing ? (
        <section className="story-inline-rich-field story-inline-overview-field">
          <span>Chapter overview</span>
          <RichTextEditor
            value={visibleChapter.overviewText || visibleChapter.shortDescription}
            placeholder="Write the chapter overview. Highlight text to format it."
            onChange={(overviewText) => onDraftChange({ overviewText })}
          />
        </section>
      ) : (
        <div className="story-treatment-lede" data-story-narration-block><RichLoreText text={visibleChapter.overviewText || visibleChapter.shortDescription} /></div>
      )}

      {readingDepth !== "overview" && visibleChapter.pages.map((page, pageIndex) => (
        <section key={page.id || page.title} id={`story-beat-${page.id || `${visibleChapter.id}-page-${pageIndex + 1}`}`} className={`story-treatment-beat ${editing ? "inline-editing" : ""}`}>
          <div className="story-treatment-beat-heading">
            <span>Sequence {pageIndex + 1}</span>
            {!editing ? (
              <div className="story-sequence-actions">
                {canEdit && (
                  <button type="button" onClick={() => onScribePage(pageIndex)} title={`Ask Tavern Scribe to edit ${page.title}`}>
                    <Icon name="Sparkles" className="h-4 w-4" /> Scribe
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="story-inline-delete"
                onClick={() => onDeletePage(page.id || `${visibleChapter.id}-page-${pageIndex + 1}`)}
                disabled={visibleChapter.pages.length <= 1}
                title="Remove this sequence"
              >
                <Icon name="Trash2" className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          {editing ? (
            <input
              className="story-inline-beat-title"
              value={page.title}
              onChange={(event) => onPageChange(page.id || `${visibleChapter.id}-page-${pageIndex + 1}`, { title: event.target.value })}
              aria-label={`Sequence ${pageIndex + 1} title`}
            />
          ) : (
            <h3 data-story-narration-block>{page.title}</h3>
          )}

          <div
            className={`story-treatment-prose ${editing ? "story-inline-rich-field" : ""}`}
            data-story-narration-block={!editing ? "true" : undefined}
          >
            {editing ? (
              <>
                <span>Story text</span>
                <RichTextEditor
                  value={page.text}
                  placeholder="Write this story sequence. Highlight text to format it."
                  tall
                  onChange={(text) => onPageChange(page.id || `${visibleChapter.id}-page-${pageIndex + 1}`, { text })}
                />
                <details className="story-inline-detailed-editor" open={readingDepth === "detailed"}>
                  <summary>Detailed reading text</summary>
                  <RichTextEditor
                    value={page.detailedText || ""}
                    placeholder="Add optional motivation, side-scene, or production context."
                    onChange={(detailedText) => onPageChange(page.id || `${visibleChapter.id}-page-${pageIndex + 1}`, { detailedText })}
                  />
                </details>
              </>
            ) : (
              <>
                <RichLoreText text={page.text} />
                {readingDepth === "detailed" && page.detailedText && <RichLoreText text={page.detailedText} />}
              </>
            )}
          </div>

          {!editing && buildBeatCallouts(visibleChapter, page).map((callout) => (
            <aside key={callout.id} className={`story-treatment-callout ${callout.kind}`} data-story-narration-block>
              <strong>{callout.label}</strong>
              <span>{callout.text}</span>
            </aside>
          ))}
          {!editing && readingDepth === "detailed" && (
            <details className="story-treatment-sources">
              <summary>Context, sources, and story notes</summary>
              <div className="story-page-lore-links">
                {Array.from(new Set([...visibleChapter.relatedLore, ...page.relatedLore])).map((term) => {
                  const source = resolveLorePreview(term, entries, bestiary);
                  return (
                    <button key={term} onClick={() => onLoreClick(term)} title={`Source: ${source.type}`}>
                      <small>{source.type}</small>
                      {term}
                    </button>
                  );
                })}
              </div>
              {(page.developerNotes || visibleChapter.developerNotes) && <p>{page.developerNotes || visibleChapter.developerNotes}</p>}
            </details>
          )}
        </section>
      ))}

      {editing && readingDepth !== "overview" && (
        <button type="button" className="story-inline-add-sequence" onClick={onAddPage}>
          <Icon name="Plus" className="h-4 w-4" /> Add Sequence
        </button>
      )}

      {!editing && visibleChapter.pages.length <= 1 && visibleChapter.shortDescription.toLowerCase().includes("will") && (
        <aside className="story-treatment-gap">
          <Icon name="CircleAlert" className="h-5 w-5" />
          <div><strong>Canon gap</strong><span>This future section is still a direction, not a complete sequence of documented events.</span></div>
        </aside>
      )}
    </article>
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
        <label>
          <span>Act / story section</span>
          <CustomSelect
            value={chapter.scope || storyChapterScope(chapter)}
            onChange={(value) => onChange({ scope: value as StoryJourneyScope })}
            options={storyJourneyScopeOptions.map((option) => ({ value: option.id, label: option.label }))}
          />
        </label>
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
          <span>Overview reading text</span>
          <textarea value={chapter.overviewText || ""} onChange={(event) => onChange({ overviewText: event.target.value })} placeholder="Optional concise chapter treatment used in Overview mode." />
        </label>
        <label className="wide">
          <span>Related lore terms</span>
          <input value={chapter.relatedLore.join(", ")} onChange={(event) => onChange({ relatedLore: splitTerms(event.target.value) })} placeholder="Gwen, Tohm Kyatt, Whisker Woods..." />
        </label>
        <label className="wide">
          <span>Story threads</span>
          <input value={(chapter.threads || []).join(", ")} onChange={(event) => onChange({ threads: splitTerms(event.target.value) })} placeholder="Gwen, Main Quest, Food Magic, Lillia..." />
        </label>
        <label className="wide">
          <span>Story notes</span>
          <textarea value={chapter.developerNotes || ""} onChange={(event) => onChange({ developerNotes: event.target.value })} placeholder="Canon questions, prerequisites, consequences, and writing notes." />
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
  onDeletePage,
  onSelectPage
}: {
  page: StoryPage;
  pageIndex: number;
  pageCount: number;
  onChange: (patch: Partial<StoryPage>) => void;
  onAddPage: () => void;
  onDeletePage: () => void;
  onSelectPage?: (index: number) => void;
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
      {onSelectPage && (
        <div className="story-page-editor-nav">
          <button onClick={() => onSelectPage(pageIndex - 1)} disabled={pageIndex <= 0}>Previous Page</button>
          <span>Editing page {pageIndex + 1} of {pageCount}</span>
          <button onClick={() => onSelectPage(pageIndex + 1)} disabled={pageIndex >= pageCount - 1}>Next Page</button>
        </div>
      )}
      <div className="story-editor-grid">
        <StoryTextField label="Page title" value={page.title} onChange={(value) => onChange({ title: value })} />
        <label className="wide">
          <span>Story text</span>
          <textarea className="story-editor-textarea-large" value={page.text} onChange={(event) => onChange({ text: event.target.value })} />
        </label>
        <label className="wide">
          <span>Detailed reading text</span>
          <textarea className="story-editor-textarea-large" value={page.detailedText || ""} onChange={(event) => onChange({ detailedText: event.target.value })} placeholder="Optional side-scene, motivation, gameplay transition, or deeper story context shown only in Detailed mode." />
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
        <label className="wide">
          <span>Story threads</span>
          <input value={(page.threads || []).join(", ")} onChange={(event) => onChange({ threads: splitTerms(event.target.value) })} placeholder="Gwen, Main Quest, Food Magic..." />
        </label>
        <label className="wide">
          <span>Story notes and source context</span>
          <textarea value={page.developerNotes || ""} onChange={(event) => onChange({ developerNotes: event.target.value })} placeholder="Prerequisite events, consequences, canon questions, or source-record notes." />
        </label>
      </div>
    </section>
  );
}

function StoryMiniScribe({
  chapter,
  currentPageIndex,
  readOnly,
  onApply
}: {
  chapter: StoryChapter;
  currentPageIndex: number;
  readOnly: boolean;
  onApply: (draft: StoryScribePatch) => void;
}) {
  const [scope, setScope] = useState<StoryScribeScope>("currentPage");
  const [command, setCommand] = useState("");
  const [draft, setDraft] = useState<StoryScribePatch | null>(null);
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualJson, setManualJson] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const currentPage = chapter.pages[currentPageIndex] || chapter.pages[0];

  useEffect(() => {
    setDraft(null);
    setManualPrompt("");
    setManualJson("");
    setStatus("");
    setError("");
  }, [chapter.id, currentPageIndex]);

  const runScribe = async () => {
    const cleanCommand = command.trim();
    if (!cleanCommand || isLoading || readOnly) return;
    setIsLoading(true);
    setDraft(null);
    setManualPrompt("");
    setError("");
    setStatus("Scribing a safe draft for this chapter...");
    try {
      const response = await fetch("/api/story-scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cleanCommand,
          scope,
          chapter: prepareStoryChapterForScribe(chapter),
          currentPageIndex
        })
      });
      const payload = (await response.json()) as { patch?: unknown; error?: string };
      if (!response.ok || !payload.patch) {
        throw new Error(payload.error || "Story Scribe could not create a draft.");
      }
      setDraft(normalizeStoryScribePatch(payload.patch));
      setStatus("Draft ready. Review it before applying.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Story Scribe failed.");
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const buildManual = async () => {
    const prompt = buildStoryScribeManualPrompt(chapter, currentPageIndex, command, scope);
    setManualPrompt(prompt);
    setDraft(null);
    setError("");
    setStatus("Manual prompt ready.");
    try {
      await navigator.clipboard?.writeText(prompt);
      setStatus("Manual prompt copied. Paste the JSON response back into the box if needed.");
    } catch {
      // Clipboard access is optional; the prompt stays visible for manual copying.
    }
  };

  const applyDraft = () => {
    if (!draft) return;
    onApply(draft);
    setDraft(null);
    setStatus("Draft applied to this Story Journey chapter.");
  };

  const pasteManualJson = () => {
    try {
      const source = manualJson.trim() || command.trim();
      setDraft(normalizeStoryScribePatch(JSON.parse(source)));
      setError("");
      setManualPrompt("");
      setStatus("Pasted draft ready. Review it before applying.");
    } catch {
      setError("Paste a valid Story Scribe JSON draft into the pasted JSON box first.");
    }
  };

  const changedPageCount = (draft?.pagePatches.length || 0) + (draft?.newPages.length || 0);

  return (
    <section
      className="story-mini-scribe"
      aria-busy={isLoading}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header>
        <div>
          <p>Mini Scribe</p>
          <h2 className="font-display">Write With This Chapter</h2>
          <span>
            Scoped to {chapter.title}{scope === "currentPage" && currentPage ? ` / ${currentPage.title}` : ""}.
          </span>
        </div>
        <div className="story-scribe-scope">
          <button className={scope === "currentPage" ? "active" : ""} onClick={() => setScope("currentPage")} type="button">
            Current Page
          </button>
          <button className={scope === "wholeChapter" ? "active" : ""} onClick={() => setScope("wholeChapter")} type="button">
            Whole Chapter
          </button>
        </div>
      </header>
      <textarea
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder="Ask Mini Scribe to expand this beat, rewrite the current page, add pages, clean up chapter summary, or turn notes into story text."
        readOnly={readOnly}
      />
      <div className="story-scribe-actions">
        <button type="button" className="button-frame" onClick={runScribe} disabled={readOnly || isLoading || !command.trim()}>
          <Icon name="Sparkles" className="h-4 w-4" />
          {isLoading ? "Scribing..." : "Scribe Chapter"}
        </button>
        <button type="button" onClick={buildManual} disabled={isLoading || readOnly}>
          Build Manual Prompt
        </button>
        <button type="button" onClick={pasteManualJson} disabled={isLoading || !(manualJson.trim() || command.trim())}>
          Use Pasted JSON
        </button>
      </div>
      {status && <p className="story-scribe-status">{status}</p>}
      {error && <p className="story-scribe-error">{error}</p>}
      {draft && (
        <section className="story-scribe-draft">
          <div>
            <strong>{draft.summary}</strong>
            <span>
              {draft.chapterPatch ? "Chapter fields may change. " : ""}
              {changedPageCount} page {changedPageCount === 1 ? "change" : "changes"} ready.
            </span>
          </div>
          {draft.warnings.length > 0 && (
            <ul>
              {draft.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
            </ul>
          )}
          <div className="story-scribe-draft-actions">
            <button type="button" className="button-frame" onClick={applyDraft}>Apply Draft</button>
            <button type="button" onClick={() => setDraft(null)}>Discard</button>
          </div>
        </section>
      )}
      {manualPrompt && (
        <label className="story-scribe-manual story-scribe-manual-prompt">
          <span>Manual prompt to copy</span>
          <textarea readOnly value={manualPrompt} />
        </label>
      )}
      <label className="story-scribe-manual">
        <span>Paste Story Scribe JSON response</span>
        <textarea
          value={manualJson}
          onChange={(event) => setManualJson(event.target.value)}
          placeholder="Paste the JSON draft from ChatGPT here, then click Use Pasted JSON."
          readOnly={readOnly}
        />
      </label>
    </section>
  );
}

function StoryJourneyScribe({
  chapters,
  target,
  onTargetChange,
  onApply,
  onClose
}: {
  chapters: StoryChapter[];
  target: { chapterId: string; pageIndex: number; scope: StoryScribeScope };
  onTargetChange: (target: { chapterId: string; pageIndex: number; scope: StoryScribeScope }) => void;
  onApply: (draft: StoryScribeJourneyPatch) => void;
  onClose: () => void;
}) {
  const [command, setCommand] = useState("");
  const [draft, setDraft] = useState<StoryScribeJourneyPatch | null>(null);
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualJson, setManualJson] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chapter = chapters.find((item) => item.id === target.chapterId) || chapters[0];
  const page = chapter?.pages[target.pageIndex] || chapter?.pages[0];

  const setScope = (scope: StoryScribeScope) => onTargetChange({ ...target, scope });
  const setChapter = (chapterId: string) => onTargetChange({ chapterId, pageIndex: 0, scope: target.scope });
  const setPage = (pageIndex: number) => onTargetChange({ ...target, pageIndex });
  const preparedChapters = target.scope === "wholeJourney"
    ? chapters.map(prepareStoryChapterForScribe)
    : chapter ? [prepareStoryChapterForScribe(chapter)] : [];

  const runScribe = async () => {
    if (!command.trim() || !chapter || isLoading) return;
    setIsLoading(true);
    setDraft(null);
    setManualPrompt("");
    setError("");
    setStatus(target.scope === "wholeJourney" ? "Reviewing the complete Story Journey..." : "Scribing a safe Story Journey draft...");
    try {
      const response = await fetch("/api/story-scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: command.trim(),
          scope: target.scope,
          chapters: preparedChapters,
          currentChapterId: chapter.id,
          currentPageIndex: target.pageIndex
        })
      });
      const payload = (await response.json()) as { patch?: unknown; error?: string };
      if (!response.ok || !payload.patch) throw new Error(payload.error || "Tavern Scribe could not create a draft.");
      const nextDraft = normalizeStoryScribeJourneyPatch(payload.patch, chapter.id);
      setDraft(nextDraft);
      setStatus(nextDraft.chapterPatches.length
        ? `Draft ready for ${nextDraft.chapterPatches.length} ${nextDraft.chapterPatches.length === 1 ? "chapter" : "chapters"}. Review before applying.`
        : "Tavern Scribe found no Story Journey text that needed changing.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tavern Scribe failed.");
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const buildManual = async () => {
    const prompt = buildStoryScribeJourneyManualPrompt(preparedChapters, target, command);
    setManualPrompt(prompt);
    setDraft(null);
    setError("");
    setStatus("Manual prompt ready.");
    try {
      await navigator.clipboard?.writeText(prompt);
      setStatus("Manual prompt copied. Paste the returned JSON below.");
    } catch {
      // The prompt remains visible when clipboard access is unavailable.
    }
  };

  const loadManual = () => {
    try {
      const nextDraft = normalizeStoryScribeJourneyPatch(JSON.parse(manualJson), chapter.id);
      setDraft(nextDraft);
      setError("");
      setStatus("Pasted draft ready. Review before applying.");
    } catch {
      setError("Paste a valid Tavern Scribe Story Journey JSON response first.");
    }
  };

  const applyDraft = () => {
    if (!draft?.chapterPatches.length) return;
    onApply(draft);
    setDraft(null);
    setStatus("Tavern Scribe changes applied and sent to the shared Story Journey save system.");
  };

  return (
    <section className="story-mini-scribe story-journey-scribe" aria-busy={isLoading}>
      <header>
        <div>
          <p>Admin Story Assistant</p>
          <h2 className="font-display">Tavern Scribe</h2>
          <span>Edit one section, one chapter, or the complete Story Journey without changing app code.</span>
        </div>
        <button type="button" className="story-scribe-close" onClick={onClose} title="Close Tavern Scribe" aria-label="Close Tavern Scribe">
          <Icon name="X" className="h-5 w-5" />
        </button>
      </header>

      <div className="story-scribe-scope" aria-label="Tavern Scribe scope">
        <button className={target.scope === "currentPage" ? "active" : ""} onClick={() => setScope("currentPage")} type="button">Current Section</button>
        <button className={target.scope === "wholeChapter" ? "active" : ""} onClick={() => setScope("wholeChapter")} type="button">Current Chapter</button>
        <button className={target.scope === "wholeJourney" ? "active" : ""} onClick={() => setScope("wholeJourney")} type="button">Whole Story Journey</button>
      </div>

      {target.scope !== "wholeJourney" && chapter && (
        <div className="story-scribe-target-selectors">
          <label>
            <span>Chapter</span>
            <select value={chapter.id} onChange={(event) => setChapter(event.target.value)}>
              {chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          {target.scope === "currentPage" && (
            <label>
              <span>Section</span>
              <select value={target.pageIndex} onChange={(event) => setPage(Number(event.target.value))}>
                {chapter.pages.map((item, index) => <option key={item.id || `${chapter.id}-${index}`} value={index}>{item.title}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="story-scribe-current-target">
        <Icon name="BookOpen" className="h-4 w-4" />
        <span>{target.scope === "wholeJourney" ? `${chapters.length} chapters` : target.scope === "wholeChapter" ? chapter?.title : `${chapter?.title} / ${page?.title}`}</span>
      </div>

      <textarea
        autoFocus
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder='Example: Replace every incorrect school name with "Imperial Culinary Academy of Ovenhold" and change every use of "Unhold" to "Ovenhold".'
      />
      <div className="story-scribe-actions">
        <button type="button" className="button-frame" onClick={runScribe} disabled={isLoading || !command.trim()}>
          <Icon name="Sparkles" className="h-4 w-4" />
          {isLoading ? "Scribing..." : "Scribe It"}
        </button>
        <button type="button" onClick={buildManual} disabled={isLoading || !command.trim()}>Build Manual Prompt</button>
      </div>

      {status && <p className="story-scribe-status">{status}</p>}
      {error && <p className="story-scribe-error">{error}</p>}

      {draft && (
        <section className="story-scribe-draft">
          <div>
            <strong>{draft.summary}</strong>
            <span>{draft.chapterPatches.length} affected {draft.chapterPatches.length === 1 ? "chapter" : "chapters"}</span>
          </div>
          <div className="story-scribe-impact-list">
            {draft.chapterPatches.map((item) => {
              const affectedChapter = chapters.find((candidate) => candidate.id === item.chapterId);
              const count = item.pagePatches.length + item.newPages.length + (item.chapterPatch ? 1 : 0);
              return (
                <article key={item.chapterId}>
                  <Icon name="FileText" className="h-4 w-4" />
                  <div><strong>{affectedChapter?.title || item.chapterId}</strong><span>{count} proposed {count === 1 ? "change" : "changes"}</span></div>
                </article>
              );
            })}
          </div>
          {[...draft.warnings, ...draft.chapterPatches.flatMap((item) => item.warnings)].length > 0 && (
            <ul>{[...draft.warnings, ...draft.chapterPatches.flatMap((item) => item.warnings)].map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
          )}
          <div className="story-scribe-draft-actions">
            <button type="button" className="button-frame" onClick={applyDraft} disabled={!draft.chapterPatches.length}>Apply Changes</button>
            <button type="button" onClick={() => setDraft(null)}>Discard</button>
          </div>
        </section>
      )}

      <details className="story-scribe-manual">
        <summary>Manual ChatGPT mode</summary>
        {manualPrompt && <textarea readOnly value={manualPrompt} />}
        <textarea value={manualJson} onChange={(event) => setManualJson(event.target.value)} placeholder="Paste the JSON response here." />
        <button type="button" onClick={loadManual} disabled={!manualJson.trim()}>Use Pasted JSON</button>
      </details>
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

function prepareStoryChapterForScribe(chapter: StoryChapter) {
  return {
    id: chapter.id,
    title: chapter.title,
    subtitle: chapter.subtitle,
    timelineStartLabel: chapter.timelineStartLabel,
    timelineEndLabel: chapter.timelineEndLabel,
    timelineStartPercent: chapter.timelineStartPercent,
    timelineEndPercent: chapter.timelineEndPercent,
    era: chapter.era,
    revealLevel: chapter.revealLevel,
    shortDescription: chapter.shortDescription,
    overviewText: chapter.overviewText,
    developerNotes: chapter.developerNotes,
    relatedLore: chapter.relatedLore,
    pages: chapter.pages.map((page, index) => ({
      id: page.id,
      index,
      title: page.title,
      text: page.text,
      detailedText: page.detailedText,
      developerNotes: page.developerNotes,
      imagePlaceholder: page.imagePlaceholder,
      caption: page.caption,
      relatedLore: page.relatedLore,
      callouts: page.callouts
    }))
  };
}

function buildStoryScribeJourneyManualPrompt(
  chapters: ReturnType<typeof prepareStoryChapterForScribe>[],
  target: { chapterId: string; pageIndex: number; scope: StoryScribeScope },
  command: string
) {
  return `You are Tavern Scribe for The Tavern Cook Book's Story Journey.

User request: ${command}
Scope: ${target.scope}
Current chapter id: ${target.chapterId}
Current section index: ${target.pageIndex}

Return only valid JSON with this shape:
{
  "summary": "What will change",
  "chapterPatches": [
    {
      "chapterId": "existing chapter id",
      "chapterPatch": { "title": "optional", "subtitle": "optional", "shortDescription": "optional", "overviewText": "optional", "relatedLore": ["optional"] },
      "pagePatches": [{ "pageId": "existing page id", "pageIndex": 0, "title": "optional", "text": "optional complete replacement", "detailedText": "optional", "relatedLore": ["optional"], "callouts": [] }],
      "newPages": [],
      "warnings": []
    }
  ],
  "warnings": []
}

Only return chapters and fields that actually need changing. Preserve all unrelated wording and rich-text HTML. Never edit app code, layout, permissions, images, Drive files, or settings.

Story Journey JSON:
${JSON.stringify(chapters, null, 2)}`;
}

function buildStoryScribeManualPrompt(chapter: StoryChapter, currentPageIndex: number, command: string, scope: StoryScribeScope) {
  return `You are Mini Scribe for The Tavern Cook Book's Story Journey.

Only help with the selected Story Journey chapter. Do not suggest code, layout, CSS, app settings, image uploads, API keys, or Drive file changes.

Scope: ${scope === "currentPage" ? "Current page only unless new pages are clearly requested." : "Whole selected chapter."}
User request: ${command || "(Write a useful improvement draft for this chapter.)"}

Return only valid JSON in this shape:
{
  "summary": "Short summary of what your draft changes",
  "chapterPatch": {
    "title": "optional",
    "subtitle": "optional",
    "era": "optional",
    "revealLevel": "optional",
    "shortDescription": "optional",
    "relatedLore": ["optional"]
  },
  "pagePatches": [
    {
      "pageId": "existing page id if updating",
      "pageIndex": 0,
      "title": "optional",
      "text": "optional full replacement text",
      "imagePlaceholder": "optional",
      "caption": "optional",
      "relatedLore": ["optional"]
    }
  ],
  "newPages": [
    {
      "title": "optional",
      "text": "optional",
      "imagePlaceholder": "optional",
      "caption": "optional",
      "relatedLore": ["optional"]
    }
  ],
  "warnings": []
}

Selected chapter JSON:
${JSON.stringify(prepareStoryChapterForScribe(chapter), null, 2)}

Current page index: ${currentPageIndex}`;
}

function normalizeStoryScribePatch(value: unknown): StoryScribePatch {
  const patch = isRecord(value) ? value : {};
  return {
    summary: typeof patch.summary === "string" ? patch.summary : "Story Scribe draft",
    chapterPatch: normalizeStoryScribeChapterPatch(patch.chapterPatch),
    pagePatches: Array.isArray(patch.pagePatches)
      ? patch.pagePatches.map(normalizeStoryScribePagePatch).filter((item): item is StoryScribePagePatch => Boolean(item))
      : [],
    newPages: Array.isArray(patch.newPages)
      ? patch.newPages.map(normalizeStoryScribePagePatch).filter((item): item is StoryScribePagePatch => Boolean(item))
      : [],
    warnings: Array.isArray(patch.warnings) ? patch.warnings.map((warning) => String(warning)).filter(Boolean) : []
  };
}

function normalizeStoryScribeJourneyPatch(value: unknown, fallbackChapterId: string): StoryScribeJourneyPatch {
  const source = isRecord(value) ? value : {};
  const rawChapterPatches = Array.isArray(source.chapterPatches) ? source.chapterPatches : [];
  const chapterPatches = rawChapterPatches.map((item) => {
    if (!isRecord(item) || typeof item.chapterId !== "string" || !item.chapterId.trim()) return null;
    const patch = normalizeStoryScribePatch(item);
    return { ...patch, chapterId: item.chapterId.trim() };
  }).filter((item): item is StoryScribeChapterDraft => Boolean(item));

  // Accept older single-chapter Story Scribe JSON in manual mode.
  if (!chapterPatches.length && (source.chapterPatch || source.pagePatches || source.newPages)) {
    chapterPatches.push({ ...normalizeStoryScribePatch(source), chapterId: fallbackChapterId });
  }

  return {
    summary: typeof source.summary === "string" ? source.summary : "Tavern Scribe Story Journey draft",
    chapterPatches,
    warnings: Array.isArray(source.warnings) ? source.warnings.map((warning) => String(warning)).filter(Boolean) : []
  };
}

function normalizeStoryScribeChapterPatch(value: unknown): StoryScribeChapterPatch | undefined {
  if (!isRecord(value)) return undefined;
  const patch: StoryScribeChapterPatch = {};
  if (typeof value.title === "string") patch.title = value.title;
  if (typeof value.subtitle === "string") patch.subtitle = value.subtitle;
  if (typeof value.timelineStartLabel === "string") patch.timelineStartLabel = value.timelineStartLabel;
  if (typeof value.timelineEndLabel === "string") patch.timelineEndLabel = value.timelineEndLabel;
  if (typeof value.timelineStartPercent === "number") patch.timelineStartPercent = clamp(value.timelineStartPercent, 0, 100);
  if (typeof value.timelineEndPercent === "number") patch.timelineEndPercent = clamp(value.timelineEndPercent, 0, 100);
  if (typeof value.era === "string") patch.era = value.era;
  if (typeof value.revealLevel === "string") patch.revealLevel = normalizeRevealLevel(value.revealLevel);
  if (typeof value.shortDescription === "string") patch.shortDescription = value.shortDescription;
  if (typeof value.overviewText === "string") patch.overviewText = value.overviewText;
  if (typeof value.developerNotes === "string") patch.developerNotes = value.developerNotes;
  if (Array.isArray(value.relatedLore)) patch.relatedLore = value.relatedLore.map((term) => String(term).trim()).filter(Boolean);
  return Object.keys(patch).length ? patch : undefined;
}

function normalizeStoryScribePagePatch(value: unknown): StoryScribePagePatch | null {
  if (!isRecord(value)) return null;
  const patch: StoryScribePagePatch = {};
  if (typeof value.pageId === "string") patch.pageId = value.pageId;
  if (typeof value.pageIndex === "number" && Number.isFinite(value.pageIndex)) patch.pageIndex = Math.max(0, Math.floor(value.pageIndex));
  if (typeof value.title === "string") patch.title = value.title;
  if (typeof value.text === "string") patch.text = value.text;
  if (typeof value.detailedText === "string") patch.detailedText = value.detailedText;
  if (typeof value.developerNotes === "string") patch.developerNotes = value.developerNotes;
  if (typeof value.imagePlaceholder === "string") patch.imagePlaceholder = value.imagePlaceholder;
  if (typeof value.caption === "string") patch.caption = value.caption;
  if (Array.isArray(value.relatedLore)) patch.relatedLore = value.relatedLore.map((term) => String(term).trim()).filter(Boolean);
  if (Array.isArray(value.callouts)) {
    patch.callouts = value.callouts.map((callout, index) => normalizeStoryScribeCallout(callout, index)).filter((item): item is StoryJourneyCallout => Boolean(item));
  }
  return Object.keys(patch).length ? patch : null;
}

function normalizeStoryScribeCallout(value: unknown, index: number): StoryJourneyCallout | null {
  if (!isRecord(value) || typeof value.text !== "string" || !value.text.trim()) return null;
  const allowedKinds: StoryJourneyCallout["kind"][] = ["character", "location", "revelation", "playerKnowledge", "consequence", "canonGap"];
  const kind = allowedKinds.includes(value.kind as StoryJourneyCallout["kind"])
    ? value.kind as StoryJourneyCallout["kind"]
    : "revelation";
  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : `scribe-callout-${Date.now()}-${index}`,
    kind,
    label: typeof value.label === "string" && value.label.trim() ? value.label : "Story insight",
    text: value.text
  };
}

function applyStoryScribePatch(chapter: StoryChapter, draft: StoryScribePatch): StoryChapter {
  const nextChapter: StoryChapter = {
    ...chapter,
    ...draft.chapterPatch,
    relatedLore: draft.chapterPatch?.relatedLore || chapter.relatedLore,
    pages: chapter.pages.map((page, index) => {
      const pagePatch = draft.pagePatches.find((patch) =>
        (patch.pageId && patch.pageId === page.id) || (!patch.pageId && patch.pageIndex === index)
      );
      return pagePatch ? normalizeStoryPage({ ...page, ...pagePatch }, page.id || `${chapter.id}-page-${index + 1}`) : page;
    })
  };

  if (draft.newPages.length) {
    nextChapter.pages = [
      ...nextChapter.pages,
      ...draft.newPages.map((page, index) => normalizeStoryPage(page, `${chapter.id}-scribe-page-${Date.now()}-${index + 1}`))
    ];
  }

  return normalizeStoryChapter(nextChapter, chapter.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function storyInspectorSubjectFromLibraryItem(item: StoryLibraryItem, entries: LoreEntry[]): StoryInspectorSubject {
  const linkedEntry = item.entry || findStoryInspectorEntry(item.title, entries);
  return {
    id: item.id,
    title: item.title,
    type: item.eyebrow,
    summary: item.summary,
    tags: item.tags,
    images: collectStoryInspectorImages({ entry: linkedEntry, creature: item.creature, worldEntry: item.worldEntry }),
    entry: linkedEntry,
    creature: item.creature,
    worldEntry: item.worldEntry
  };
}

function storyInspectorSubjectFromChapter(chapter: StoryChapter): StoryInspectorSubject {
  return {
    id: `chapter:${chapter.id}`,
    title: chapter.title,
    type: chapter.era || "Story Chapter",
    summary: plainStoryText(chapter.shortDescription || chapter.overviewText || chapter.subtitle),
    tags: Array.from(new Set([chapter.revealLevel, ...(chapter.threads || []), ...chapter.relatedLore].filter(Boolean))),
    images: collectStoryInspectorChapterImages(chapter),
    chapter
  };
}

function storyInspectorSubjectFromLorePreview(preview: LorePreview, entries: LoreEntry[]): StoryInspectorSubject {
  const linkedEntry = preview.entry || findStoryInspectorEntry(preview.name, entries);
  return {
    id: preview.entry
      ? `entry:${preview.entry.id}`
      : preview.creature
        ? `creature:${preview.creature.id}`
        : preview.worldEntry
          ? `world:${preview.worldEntry.category}:${preview.worldEntry.id}`
          : `term:${normalizeTerm(preview.name)}`,
    title: preview.name,
    type: preview.type,
    summary: preview.description,
    tags: Array.from(new Set([
      ...(linkedEntry?.tags || []),
      ...(preview.worldEntry?.tags || []),
      preview.creature?.category || "",
      preview.creature?.threatLevel || ""
    ].filter(Boolean))),
    images: collectStoryInspectorImages({ entry: linkedEntry, creature: preview.creature, worldEntry: preview.worldEntry }),
    entry: linkedEntry,
    creature: preview.creature,
    worldEntry: preview.worldEntry
  };
}

function collectStoryInspectorImages({
  entry,
  creature,
  worldEntry
}: {
  entry?: LoreEntry;
  creature?: BestiaryCreature;
  worldEntry?: WorldBuildingEntry;
}) {
  const images: StoryInspectorImage[] = [];

  if (worldEntry?.image) {
    pushStoryInspectorImage(images, {
      id: `world-${worldEntry.id}`,
      label: `${worldEntry.title} reference`,
      url: worldEntry.image,
      imageFit: worldEntry.imageFit,
      source: "World Guide"
    });
  }

  if (entry) {
    const directImages = [
      ["characterPortrait", "Portrait", entry.media.characterPortrait],
      ["mainImage", "Main art", entry.media.mainImage],
      ["iconImage", "App art", entry.media.iconImage],
      ["characterHoverImage", "Alternate art", entry.media.characterHoverImage]
    ] as const;
    directImages.forEach(([id, label, url]) => {
      if (!url) return;
      pushStoryInspectorImage(images, {
        id: `${entry.id}-${id}`,
        label,
        url,
        imageFit: entry.media.imageFits?.[id],
        source: "Cookbook"
      });
    });

    entry.artGallery.forEach((image) => {
      if (!isStoryInspectorStaticArt([image.title, image.category, image.notes].join(" "))) return;
      pushStoryInspectorImage(images, {
        id: image.id,
        label: image.title || image.category || "Gallery art",
        url: image.thumbnailUrl || image.webViewLink,
        webViewLink: image.webViewLink,
        imageFit: image.imageFit,
        source: image.category || "Art Gallery"
      });
    });

    normalizeArtVault(entry.artVault).sections.forEach((section) => {
      section.slots.forEach((slot) => {
        if (!slot.image || slot.image.spriteAnimation) return;
        if (!isStoryInspectorStaticArt([section.title, slot.label, slot.requirementType, slot.image.title, slot.image.category, slot.image.fileName].join(" "))) return;
        pushStoryInspectorImage(images, storyInspectorImageFromMetadata(slot.image, slot.label, section.title));
      });
    });
  }

  if (creature) {
    const directImages = [
      ["image", "Main creature art", creature.image, creature.imageFit],
      ["expandedImage", "Expanded art", creature.expandedImage, creature.expandedImageFit],
      ["hoverImage", "Alternate pose", creature.hoverImage, creature.hoverImageFit],
      ["slotImage", "Bestiary portrait", creature.slotImage, creature.slotImageFit]
    ] as const;
    directImages.forEach(([id, label, url, imageFit]) => {
      if (!url) return;
      pushStoryInspectorImage(images, { id: `${creature.id}-${id}`, label, url, imageFit, source: "Bestiary" });
    });
    normalizeCreatureArtVault(creature.artVault).sections.forEach((section) => {
      section.slots.forEach((slot) => {
        if (!slot.image || slot.image.spriteAnimation) return;
        if (!isStoryInspectorStaticArt([section.title, slot.label, slot.requirementType, slot.image.title, slot.image.category, slot.image.fileName].join(" "))) return;
        pushStoryInspectorImage(images, storyInspectorImageFromMetadata(slot.image, slot.label, section.title));
      });
    });
  }

  return images.slice(0, 6);
}

function collectStoryInspectorChapterImages(chapter: StoryChapter) {
  const images: StoryInspectorImage[] = [];
  if (chapter.coverImageUrl) {
    pushStoryInspectorImage(images, {
      id: `${chapter.id}-cover`,
      label: "Chapter cover",
      url: chapter.coverImageUrl,
      imageFit: chapter.coverImageFit,
      source: "Story Journey"
    });
  }
  chapter.pages.forEach((page) => {
    if (!page.imageUrl) return;
    pushStoryInspectorImage(images, {
      id: `${chapter.id}-${page.id}`,
      label: page.title,
      url: page.imageUrl,
      imageFit: page.imageFit,
      source: "Story beat"
    });
  });
  return images.slice(0, 6);
}

function storyInspectorImageFromMetadata(image: ArtVaultImageMetadata, fallbackLabel: string, source: string): StoryInspectorImage {
  const url = image.thumbnailUrl || (image.driveFileId ? googleDriveThumbnailUrl(image.driveFileId) : image.webViewLink);
  return {
    id: image.id || `${image.slotId}-${image.driveFileId}`,
    label: image.title || fallbackLabel,
    url,
    webViewLink: image.webViewLink || (image.driveFileId ? googleDriveWebViewLink(image.driveFileId) : ""),
    imageFit: image.imageFit,
    source
  };
}

function pushStoryInspectorImage(images: StoryInspectorImage[], image: Omit<StoryInspectorImage, "webViewLink"> & { webViewLink?: string }) {
  const url = resolveImageSourceUrl(image.url || image.webViewLink || "");
  if (!url) return;
  const fileId = extractGoogleDriveFileId(image.webViewLink || image.url || url);
  const dedupeKey = fileId || url;
  if (images.some((existing) => (extractGoogleDriveFileId(existing.webViewLink || existing.url) || existing.url) === dedupeKey)) return;
  images.push({ ...image, url, webViewLink: image.webViewLink || (fileId ? googleDriveWebViewLink(fileId) : "") });
}

function isStoryInspectorStaticArt(value: string) {
  return !/(sprite\s*sheet|sprite\s*animation|animation\s*(?:frames?|sequence|cycle)|frame\s*(?:strip|set|sequence))/i.test(value);
}

function findStoryInspectorEntry(title: string, entries: LoreEntry[]) {
  const normalized = normalizeTerm(title);
  return entries.find((entry) => normalizeTerm(entry.title) === normalized)
    || entries.find((entry) => entry.tags.some((tag) => normalizeTerm(tag) === normalized));
}

function buildStoryInspectorManagerSlot(subject: StoryInspectorSubject) {
  const existingVault = subject.entry
    ? normalizeArtVault(subject.entry.artVault)
    : subject.creature
      ? normalizeCreatureArtVault(subject.creature.artVault)
      : null;
  const existingSection = existingVault?.sections.find((section) => section.id === "story-reference-art" || normalizeTerm(section.title) === "story reference art");
  const context = storyInspectorDriveContext(subject);
  return {
    id: "storyReferenceArt",
    label: `${subject.title} Reference Art`,
    description: "A still image, portrait, concept piece, or environment view used by the live Story Journey viewer.",
    imageUrl: "",
    frameWidth: 360,
    frameHeight: 260,
    defaultFolderId: existingSection?.driveFolderId || "",
    defaultFolderLink: existingSection?.driveFolderLink || "",
    defaultFolderName: existingSection?.driveFolderName || "",
    resolveUploadFolder: async () => resolveArtVaultDriveFolder(context),
    uploadNameContext: {
      subjectName: subject.title,
      categoryName: "Story Reference Art",
      slotName: "Reference Art",
      sourceType: context.sourceType || "Story"
    },
    showAssetState: true,
    assetState: "final" as const
  };
}

function storyInspectorDriveContext(subject: StoryInspectorSubject) {
  if (subject.creature) {
    return {
      sourceType: "Bestiary Creature",
      groupName: subject.creature.category || subject.creature.type || "Creatures",
      subjectCategory: subject.creature.category,
      subjectType: subject.creature.type,
      subjectThreatLevel: subject.creature.threatLevel,
      subjectHabitat: subject.creature.habitat,
      subjectBehavior: subject.creature.behavior,
      subjectStatus: subject.creature.status,
      subjectName: subject.title,
      categoryName: "Story Reference Art"
    };
  }
  const sourceType = subject.entry?.category || (subject.worldEntry ? "World" : "Story");
  return {
    sourceType,
    groupName: subject.entry?.category || subject.worldEntry?.category || "Story Journey",
    subjectType: subject.entry?.type || subject.worldEntry?.type || subject.type,
    subjectName: subject.title,
    categoryName: "Story Reference Art"
  };
}

function appendStoryReferenceArtToEntry(entry: LoreEntry, draft: ImageManagerSlotDraft): LoreEntry {
  return {
    ...entry,
    artVault: appendStoryReferenceArt(normalizeArtVault(entry.artVault), draft, entry.title),
    updatedAt: new Date().toISOString()
  };
}

function appendStoryReferenceArtToCreature(creature: BestiaryCreature, draft: ImageManagerSlotDraft): BestiaryCreature {
  return {
    ...creature,
    artVault: appendStoryReferenceArt(normalizeCreatureArtVault(creature.artVault), draft, creature.name),
    updatedAt: new Date().toISOString()
  };
}

function appendStoryReferenceArt(vault: CharacterArtVault, draft: ImageManagerSlotDraft, subjectName: string): CharacterArtVault {
  const timestamp = Date.now();
  const sectionIndex = vault.sections.findIndex((section) => section.id === "story-reference-art" || normalizeTerm(section.title) === "story reference art");
  const currentSection = sectionIndex >= 0 ? vault.sections[sectionIndex] : null;
  const slotId = `story-reference-art-${timestamp}`;
  const image = storyInspectorMetadataFromDraft(draft, slotId, subjectName);
  const section = {
    id: currentSection?.id || "story-reference-art",
    title: "Story Reference Art",
    description: "Curated stills, concept art, portraits, and locations used by the Story Journey live viewer.",
    slots: [
      ...(currentSection?.slots || []),
      {
        id: slotId,
        label: `${subjectName} Reference ${(currentSection?.slots.length || 0) + 1}`,
        requirementType: "Story Reference Art",
        status: "uploaded",
        image,
        notes: "Added from the Story Journey live viewer.",
        order: currentSection?.slots.length || 0
      }
    ],
    order: currentSection?.order ?? vault.sections.length,
    driveFolderId: draft.defaultFolderId || currentSection?.driveFolderId || "",
    driveFolderLink: draft.defaultFolderLink || currentSection?.driveFolderLink || "",
    driveFolderName: draft.defaultFolderName || currentSection?.driveFolderName || ""
  };
  const sections = [...vault.sections];
  if (sectionIndex >= 0) sections[sectionIndex] = section;
  else sections.push(section);
  return { sections };
}

function storyInspectorMetadataFromDraft(draft: ImageManagerSlotDraft, slotId: string, subjectName: string): ArtVaultImageMetadata {
  const driveFileId = extractGoogleDriveFileId(draft.webViewLink || draft.imageUrl);
  const now = new Date().toISOString();
  return {
    id: `story-reference-image-${Date.now()}`,
    title: `${subjectName} Reference Art`,
    category: "Story Reference Art",
    slotId,
    driveFileId,
    thumbnailUrl: resolveImageSourceUrl(draft.imageUrl) || (driveFileId ? googleDriveThumbnailUrl(driveFileId) : ""),
    webViewLink: draft.webViewLink || (driveFileId ? googleDriveWebViewLink(driveFileId) : ""),
    dateAdded: now,
    uploadStatus: "uploaded",
    assetState: draft.assetState || "final",
    notes: "Added from Story Journey.",
    uploadedAt: now,
    lastUpdatedAt: now,
    imageFit: normalizeImageFit(draft.imageFit),
    driveFolderId: draft.defaultFolderId || "",
    driveFolderLink: draft.defaultFolderLink || "",
    driveFolderName: draft.defaultFolderName || ""
  };
}

function resolveLorePreview(term: string, entries: LoreEntry[], bestiary: BestiaryCreature[], worldBuilding?: WorldBuildingData): LorePreview {
  const normalized = normalizeTerm(term);
  const exactEntry = entries.find((candidate) => normalizeTerm(candidate.title) === normalized);
  const exactCreature = bestiary.find((candidate) => normalizeTerm(candidate.name) === normalized);
  const worldEntries = worldBuilding ? Object.values(worldBuilding).flat() : [];
  const exactWorldEntry = worldEntries.find((candidate) => normalizeTerm(candidate.title) === normalized);
  if (exactEntry) {
    return {
      name: exactEntry.title,
      type: exactEntry.type || exactEntry.category,
      description: richTextToPlainText(exactEntry.summary || exactEntry.publicDescription || exactEntry.internalLore || "No description has been written yet."),
      entry: exactEntry
    };
  }

  if (exactCreature) {
    return {
      name: exactCreature.name,
      type: exactCreature.type || "Creature",
      description: exactCreature.description || exactCreature.overview || "No creature description has been written yet.",
      creature: exactCreature
    };
  }

  if (exactWorldEntry) {
    return {
      name: exactWorldEntry.title,
      type: exactWorldEntry.type || storyWorldCategoryLabel(exactWorldEntry.category),
      description: plainStoryText(exactWorldEntry.summary || Object.values(exactWorldEntry.fields).find(Boolean) || "No description has been written yet."),
      worldEntry: exactWorldEntry
    };
  }

  const relatedEntry = entries.find((candidate) => normalizeTerm(candidate.title).includes(normalized))
    || entries.find((candidate) => candidate.tags.some((value) => normalizeTerm(value) === normalized));
  if (relatedEntry) {
    return {
      name: relatedEntry.title,
      type: relatedEntry.type || relatedEntry.category,
      description: richTextToPlainText(relatedEntry.summary || relatedEntry.publicDescription || relatedEntry.internalLore || "No description has been written yet."),
      entry: relatedEntry
    };
  }

  const relatedWorldEntry = worldEntries.find((candidate) => normalizeTerm(candidate.title).includes(normalized));
  if (relatedWorldEntry) {
    return {
      name: relatedWorldEntry.title,
      type: relatedWorldEntry.type || storyWorldCategoryLabel(relatedWorldEntry.category),
      description: plainStoryText(relatedWorldEntry.summary || Object.values(relatedWorldEntry.fields).find(Boolean) || "No description has been written yet."),
      worldEntry: relatedWorldEntry
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
  const haystack = normalizeTerm([
    chapter.title,
    chapter.subtitle,
    chapter.shortDescription,
    ...chapter.relatedLore,
    ...chapter.pages.flatMap((page) => [page.title, page.text, ...page.relatedLore])
  ].join(" "));
  return new RegExp(`\\b${escapeRegExp(normalized)}\\b`, "i").test(haystack);
}

const storyLibrarySectionDefinitions: Array<Omit<StoryLibrarySection, "items">> = [
  { id: "peoples", label: "Peoples & Realms", description: "Cultures, kingdoms, peoples, and the traditions that distinguish them." },
  { id: "characters", label: "Characters", description: "The people whose choices move the story." },
  { id: "places", label: "Places", description: "Regions, settlements, landmarks, and important story spaces." },
  { id: "factions", label: "Factions & Faiths", description: "Organizations, alliances, religions, and competing beliefs." },
  { id: "magic", label: "Magic, Meals & Artifacts", description: "Food magic, recipes, ingredients, relics, and important objects." },
  { id: "creatures", label: "Creatures & Threats", description: "Wildlife, enemies, bosses, and corrupted beings." },
  { id: "quests", label: "Quests & Storylines", description: "Objectives and playable story threads." },
  { id: "lore", label: "Lore & Mysteries", description: "Myths, secrets, rules, unresolved questions, and glossary concepts." }
];

function buildStoryLibrarySections(
  entries: LoreEntry[],
  bestiary: BestiaryCreature[],
  worldBuilding: WorldBuildingData
): StoryLibrarySection[] {
  const items: StoryLibraryItem[] = [];

  entries.forEach((entry) => {
    if (normalizeTerm(entry.category) === "archive") return;
    const sectionId = classifyLoreEntryForStoryLibrary(entry);
    if (!sectionId) return;
    const fullText = joinUniqueStoryText([
      entry.summary,
      entry.publicDescription,
      entry.internalLore,
      entry.wiki?.loreDescription || "",
      entry.timeline?.trueTimeline || "",
      entry.secret?.trueFact || ""
    ]);
    items.push({
      id: `entry:${entry.id}`,
      title: entry.title,
      sectionId,
      sourceType: "entry",
      eyebrow: entry.type || entry.category || "Cookbook Entry",
      summary: plainStoryText(entry.summary || entry.publicDescription || entry.internalLore),
      fullText,
      tags: Array.from(new Set([entry.category, entry.type, entry.status, ...entry.tags].filter(Boolean))),
      facts: compactStoryFacts([
        ["Category", entry.category],
        ["Type", entry.type],
        ["Status", entry.status],
        ["Spoiler level", entry.spoilerLevel],
        ["Timeline", entry.timeline?.playerTimeline || entry.timeline?.era || ""],
        ["Player knowledge", entry.secret?.playerKnowledge || ""]
      ]),
      linkedStoryReferenceIds: entry.linkedStoryReferenceIds || [],
      entry
    });
  });

  Object.values(worldBuilding).flat().forEach((entry) => {
    const sectionId = classifyWorldEntryForStoryLibrary(entry);
    const fieldText = Object.values(entry.fields || {}).filter((value) => typeof value === "string");
    items.push({
      id: `world:${entry.category}:${entry.id}`,
      title: entry.title,
      sectionId,
      sourceType: "world",
      eyebrow: entry.type || storyWorldCategoryLabel(entry.category),
      summary: plainStoryText(entry.summary),
      fullText: joinUniqueStoryText([entry.summary, ...fieldText]),
      tags: Array.from(new Set([storyWorldCategoryLabel(entry.category), entry.type, ...entry.tags].filter(Boolean))),
      facts: compactStoryFacts([
        ["World guide section", storyWorldCategoryLabel(entry.category)],
        ["Type", entry.type],
        ...Object.entries(entry.fields || {}).slice(0, 10)
      ]),
      linkedStoryReferenceIds: entry.linkedStoryReferenceIds || [],
      worldEntry: entry
    });
  });

  bestiary.forEach((creature) => {
    items.push({
      id: `creature:${creature.id}`,
      title: creature.name,
      sectionId: "creatures",
      sourceType: "creature",
      eyebrow: creature.type || creature.category || "Creature",
      summary: plainStoryText(creature.overview || creature.description),
      fullText: joinUniqueStoryText([
        creature.overview,
        creature.description,
        creature.fieldNotes,
        creature.lore?.origin,
        creature.lore?.culturalMeaning,
        creature.lore?.rumors,
        creature.lore?.questConnections,
        creature.lore?.hiddenNotes,
        creature.lore?.fullStory || ""
      ]),
      tags: Array.from(new Set([creature.category, creature.type, creature.status, creature.threatLevel].filter(Boolean))),
      facts: compactStoryFacts([
        ["Category", creature.category],
        ["Type", creature.type],
        ["Threat", creature.threatLevel],
        ["Rarity", creature.rarity],
        ["Habitat", creature.habitat],
        ["Behavior", creature.behavior],
        ["Story purpose", creature.gameplayPurpose]
      ]),
      linkedStoryReferenceIds: creature.linkedStoryReferenceIds || [],
      creature
    });
  });

  return storyLibrarySectionDefinitions.map((definition) => ({
    ...definition,
    items: deduplicateStoryLibraryItems(items.filter((item) => item.sectionId === definition.id))
  }));
}

function classifyLoreEntryForStoryLibrary(entry: LoreEntry): StoryLibrarySectionId | null {
  const haystack = normalizeTerm([entry.title, entry.category, entry.type, ...entry.tags].join(" "));
  const identity = normalizeTerm(`${entry.title} ${entry.type}`);
  if (/cauldron|dragon knife|recipe book|magical meal|food essence|artifact/.test(identity)) return "magic";
  if (haystack.includes("character") || normalizeTerm(entry.category) === "characters") return "characters";
  if (/quest|storyline|tutorial|mission|objective/.test(haystack) || normalizeTerm(entry.category) === "quests") return "quests";
  if (/culture|kingdom|people|race|whisken|human realm|faery realm|dwarven/.test(haystack)) return "peoples";
  if (/faction|cult|faith|religion|tablekeeper|saint/.test(haystack)) return "factions";
  if (/meal|recipe|food|ingredient|magic|artifact|item|cauldron|knife|essence|pantry/.test(haystack) || ["food", "inventory", "items"].includes(normalizeTerm(entry.category))) return "magic";
  if (/location|village|woods|island|lake|pond|camp|tavern|ovenhold|mountain|meadow|hollow|glade/.test(haystack) || normalizeTerm(entry.category) === "world") return "places";
  if (/enemy|creature|boss|wildlife|bestiary/.test(haystack)) return "creatures";
  if (["story", "secrets", "lore", "glossary"].includes(normalizeTerm(entry.category))) return "lore";
  return null;
}

function classifyWorldEntryForStoryLibrary(entry: WorldBuildingEntry): StoryLibrarySectionId {
  if (entry.category === "cultures") return "peoples";
  if (entry.category === "characterLinks") return "characters";
  if (entry.category === "locations") return "places";
  if (entry.category === "factions") return "factions";
  if (["magicSystems", "foodAndRecipes", "items"].includes(entry.category)) return "magic";
  if (entry.category === "creatureLinks") return "creatures";
  if (entry.category === "quests") return "quests";
  return "lore";
}

function storyWorldCategoryLabel(category: WorldBuildingCategoryId) {
  const labels: Partial<Record<WorldBuildingCategoryId, string>> = {
    locations: "Places",
    cultures: "Peoples & Realms",
    factions: "Factions & Faiths",
    timeline: "Timeline",
    magicSystems: "Magic Systems",
    foodAndRecipes: "Food & Recipes",
    creatureLinks: "Creatures",
    characterLinks: "Characters",
    myths: "Myths",
    items: "Artifacts & Items",
    quests: "Quests",
    rules: "World Rules",
    mysteries: "Mysteries",
    glossary: "Glossary"
  };
  return labels[category] || category;
}

function deduplicateStoryLibraryItems(items: StoryLibraryItem[]) {
  const byTitle = new Map<string, StoryLibraryItem>();
  items.forEach((item) => {
    const key = normalizeTerm(item.title);
    const current = byTitle.get(key);
    if (!current || item.fullText.length > current.fullText.length) byTitle.set(key, item);
  });
  return Array.from(byTitle.values()).sort((left, right) => left.title.localeCompare(right.title));
}

function compactStoryFacts(values: Array<[string, unknown]>) {
  const seen = new Set<string>();
  return values.flatMap(([label, raw]) => {
    const value = plainStoryText(typeof raw === "string" ? raw : String(raw || ""));
    if (!value || seen.has(`${label}:${value}`)) return [];
    seen.add(`${label}:${value}`);
    return [{ label: humanizeStoryLabel(label), value }];
  });
}

function joinUniqueStoryText(values: unknown[]) {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const source = typeof value === "string" ? value : "";
    const text = plainStoryText(source);
    const key = normalizeTerm(text);
    if (!text || seen.has(key)) return [];
    seen.add(key);
    return [isRichText(source) ? source : plainTextToRichHtml(source)];
  }).join("");
}

function plainStoryText(value: string) {
  return richTextToPlainText(String(value || "")).trim();
}

const STORY_NARRATION_HIGHLIGHT = "story-speechify-current-word";

function buildStoryNarrationChunks(root: HTMLElement, maxLength = 900): StoryNarrationChunk[] {
  type CharacterLocation = { node: Text; offset: number } | null;
  type BlockMeta = { chapterId: string; chapterTitle: string; sectionTitle: string; kind: StoryNarrationKind };
  const locations: CharacterLocation[] = [];
  const blockRanges: Array<{ start: number; end: number; meta: BlockMeta }> = [];
  const pauseOffsets: Array<{ offset: number; milliseconds: number }> = [];
  let input = "";
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-story-narration-block]"))
    .filter((block) => !block.parentElement?.closest("[data-story-narration-block]") && block.getClientRects().length > 0);

  const appendSeparator = (milliseconds: number) => {
    if (!input) return;
    while (/\s$/.test(input)) {
      input = input.slice(0, -1);
      locations.pop();
    }
    const separator = /[.!?]$/.test(input) ? " " : ". ";
    input += separator;
    separator.split("").forEach(() => locations.push(null));
    pauseOffsets.push({ offset: input.length, milliseconds });
  };

  blocks.forEach((block, blockIndex) => {
    if (blockIndex > 0) appendSeparator(650);
    const blockStart = input.length;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const textNode = node as Text;
        const parent = textNode.parentElement;
        if (!parent || parent.closest("[data-story-narration-ignore], input, textarea, [contenteditable='true']")) {
          return NodeFilter.FILTER_REJECT;
        }
        return textNode.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    let currentGroup: Element | null = null;
    let current = walker.nextNode() as Text | null;
    while (current) {
      const nextGroup = storyNarrationSemanticGroup(current, block);
      if (currentGroup && nextGroup !== currentGroup) appendSeparator(450);
      currentGroup = nextGroup;
      for (let offset = 0; offset < current.data.length; offset += 1) {
        const character = current.data[offset];
        if (/\s/.test(character)) {
          if (input && !/\s$/.test(input)) {
            input += " ";
            locations.push({ node: current, offset });
          }
        } else {
          input += character;
          locations.push({ node: current, offset });
        }
      }
      current = walker.nextNode() as Text | null;
    }
    while (input.length > blockStart && /\s$/.test(input)) {
      input = input.slice(0, -1);
      locations.pop();
    }
    if (input.length > blockStart) {
      blockRanges.push({
        start: blockStart,
        end: input.length,
        meta: { ...storyNarrationBlockMeta(block, blockIndex), kind: storyNarrationBlockKind(block) }
      });
    }
  });

  input = input.trim();
  locations.length = input.length;
  if (!input) return [];

  const words: StoryNarrationWordTarget[] = [];
  const wordPattern = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;
  let match: RegExpExecArray | null;
  while ((match = wordPattern.exec(input))) {
    const inputStart = match.index;
    const inputEnd = inputStart + match[0].length;
    const startLocation = nearestCharacterLocation(locations, inputStart, inputEnd, 1);
    const endLocation = nearestCharacterLocation(locations, inputEnd - 1, inputStart, -1);
    if (!startLocation || !endLocation) continue;
    words.push({
      value: match[0],
      startNode: startLocation.node,
      endNode: endLocation.node,
      nodeStart: startLocation.offset,
      nodeEnd: endLocation.offset + 1,
      inputStart,
      inputEnd
    });
  }

  const splitRanges = blockRanges.flatMap((block) => splitStoryNarrationRanges(input.slice(block.start, block.end), maxLength)
    .map(({ start, end }) => ({ start: block.start + start, end: block.start + end, meta: block.meta })));
  const ranges = splitRanges.reduce<Array<{ start: number; end: number; meta: BlockMeta }>>((merged, range) => {
    const previous = merged[merged.length - 1];
    if (previous && previous.meta.chapterId === range.meta.chapterId && range.end - previous.start <= maxLength) {
      previous.end = range.end;
    } else {
      merged.push({ ...range, meta: { ...range.meta } });
    }
    return merged;
  }, []);
  return ranges.map(({ start, end, meta }) => {
    const chapterMarkers = blockRanges
      .filter((block) => block.start >= start && block.start < end)
      .reduce<Array<{ chapterId: string; chapterTitle: string; inputOffset: number }>>((markers, block) => {
        const previous = markers.at(-1);
        if (previous?.chapterId === block.meta.chapterId) return markers;
        markers.push({
          chapterId: block.meta.chapterId,
          chapterTitle: block.meta.chapterTitle,
          inputOffset: block.start
        });
        return markers;
      }, []);
    if (!chapterMarkers.length) {
      chapterMarkers.push({ chapterId: meta.chapterId, chapterTitle: meta.chapterTitle, inputOffset: start });
    }
    return {
      text: input.slice(start, end),
      speechText: buildPacedStoryNarrationSsml(input, start, end, blockRanges, pauseOffsets),
      inputStart: start,
      inputEnd: end,
      words: words.filter((word) => word.inputStart >= start && word.inputStart < end),
      chapterMarkers,
      ...meta
    };
  }).filter((chunk) => chunk.text.trim() && chunk.words.length);
}

function storyNarrationSemanticGroup(node: Text, block: HTMLElement) {
  const semanticSelector = "h1, h2, h3, h4, h5, h6, p, li, dt, dd, blockquote, figcaption";
  let element: Element | null = node.parentElement;
  let directChild: Element | null = element;
  while (element && element !== block) {
    if (element.matches(semanticSelector)) return element;
    directChild = element;
    element = element.parentElement;
  }
  return directChild;
}

function storyNarrationBlockKind(block: HTMLElement): StoryNarrationKind {
  if (
    block.matches("h1, h2, h3, h4, h5, h6")
    || block.closest(".story-treatment-titlepage, .story-treatment-chapter-heading")
    || (block.closest(".story-treatment-act") && block.querySelector("h2"))
  ) return "heading";
  if (block.closest(".story-treatment-callout, .story-library-fact, aside")) return "callout";
  return "prose";
}

function buildPacedStoryNarrationSsml(
  input: string,
  start: number,
  end: number,
  blockRanges: Array<{ start: number; end: number; meta: { kind: StoryNarrationKind } }>,
  pauseOffsets: Array<{ offset: number; milliseconds: number }>
) {
  const renderRange = (rangeStart: number, rangeEnd: number) => {
    let cursor = rangeStart;
    let output = "";
    pauseOffsets
      .filter((pause) => pause.offset > rangeStart && pause.offset < rangeEnd)
      .forEach((pause) => {
        output += escapeStoryNarrationSsml(input.slice(cursor, pause.offset));
        output += `<break time="${pause.milliseconds}ms"/>`;
        cursor = pause.offset;
      });
    return output + escapeStoryNarrationSsml(input.slice(cursor, rangeEnd));
  };

  let cursor = start;
  let ssml = "<speak>";
  blockRanges
    .filter((block) => block.end > start && block.start < end)
    .forEach((block) => {
      const blockStart = Math.max(start, block.start);
      const blockEnd = Math.min(end, block.end);
      if (blockStart > cursor) ssml += renderRange(cursor, blockStart);
      const content = renderRange(blockStart, blockEnd);
      if (block.meta.kind === "heading") {
        ssml += `<prosody rate="90%"><emphasis level="moderate">${content}</emphasis></prosody>`;
      } else if (block.meta.kind === "callout") {
        ssml += `<prosody rate="95%">${content}</prosody>`;
      } else {
        ssml += content;
      }
      cursor = blockEnd;
    });
  if (cursor < end) ssml += renderRange(cursor, end);
  return `${ssml}</speak>`;
}

function escapeStoryNarrationSsml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function storyNarrationBlockMeta(block: HTMLElement, blockIndex: number) {
  const chapter = block.closest<HTMLElement>("[data-story-reader-chapter]");
  if (chapter) {
    const chapterId = chapter.dataset.storyReaderChapter || `chapter-${blockIndex + 1}`;
    const chapterTitle = chapter.querySelector<HTMLElement>(".story-treatment-chapter-heading h2")?.textContent?.trim()
      || `Chapter ${blockIndex + 1}`;
    const beat = block.closest<HTMLElement>(".story-treatment-beat");
    const sectionTitle = beat?.querySelector<HTMLElement>("h3")?.textContent?.trim()
      || (block.closest(".story-treatment-chapter-heading") ? "Chapter Introduction" : chapterTitle);
    return { chapterId, chapterTitle, sectionTitle };
  }

  const libraryReader = block.closest<HTMLElement>(".story-library-reader");
  if (libraryReader) {
    const title = libraryReader.querySelector<HTMLElement>("h1")?.textContent?.trim() || "World Guide";
    const sectionTitle = block.querySelector<HTMLElement>("h2")?.textContent?.trim()
      || block.querySelector<HTMLElement>("strong")?.textContent?.trim()
      || title;
    return { chapterId: `library-${normalizeTerm(title) || "entry"}`, chapterTitle: title, sectionTitle };
  }

  const act = block.closest<HTMLElement>(".story-treatment-act");
  if (act) {
    const title = act.querySelector<HTMLElement>(":scope > header h2")?.textContent?.trim() || "Story Section";
    return { chapterId: `act-${normalizeTerm(title) || blockIndex}`, chapterTitle: title, sectionTitle: "Act Introduction" };
  }

  const title = rootNarrationTitle(block) || "Story Introduction";
  return { chapterId: "story-introduction", chapterTitle: title, sectionTitle: "Opening" };
}

function rootNarrationTitle(block: HTMLElement) {
  return block.closest<HTMLElement>(".story-treatment-reader")?.querySelector<HTMLElement>("h1")?.textContent?.trim() || "";
}

function nearestCharacterLocation(
  locations: Array<{ node: Text; offset: number } | null>,
  from: number,
  limit: number,
  direction: 1 | -1
) {
  for (let index = from; direction > 0 ? index < limit : index >= limit; index += direction) {
    if (locations[index]) return locations[index];
  }
  return null;
}

function splitStoryNarrationRanges(text: string, maxLength: number) {
  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;
  while (start < text.length) {
    while (start < text.length && /\s/.test(text[start])) start += 1;
    if (start >= text.length) break;
    let end = Math.min(text.length, start + maxLength);
    if (end < text.length) {
      const minimum = start + Math.floor(maxLength * 0.55);
      const sample = text.slice(minimum, end);
      const sentenceBreaks = Array.from(sample.matchAll(/[.!?]["'’”)]*\s/g));
      const sentenceBreak = sentenceBreaks.at(-1);
      if (sentenceBreak?.index !== undefined) {
        end = minimum + sentenceBreak.index + sentenceBreak[0].length;
      } else {
        const wordBreak = text.lastIndexOf(" ", end);
        if (wordBreak > minimum) end = wordBreak + 1;
      }
    }
    while (end > start && /\s/.test(text[end - 1])) end -= 1;
    if (end <= start) end = Math.min(text.length, start + maxLength);
    ranges.push({ start, end });
    start = end;
  }
  return ranges;
}

function estimateSpeechifyDuration(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1_000, Math.round((words / 2.55) * 1_000));
}

function speechifyRecordingCostForText(text: string) {
  return (text.length / 1_000_000) * SPEECHIFY_PRICE_PER_MILLION_CHARACTERS_USD;
}

function estimateSpeechifyRecordingCost(chunks: StoryNarrationChunk[]) {
  return chunks.reduce((total, chunk) => total + speechifyRecordingCostForText(chunk.speechText), 0);
}

function speechifyDurationBeforeChunk(durations: number[], chunkIndex: number) {
  return durations.slice(0, Math.max(0, chunkIndex)).reduce((total, duration) => total + duration, 0);
}

function findSpeechifyTimelineLocation(targetMs: number, durations: number[]) {
  if (!durations.length) return { chunkIndex: 0, timeMs: 0 };
  let elapsed = 0;
  for (let index = 0; index < durations.length; index += 1) {
    const duration = Math.max(0, durations[index]);
    if (targetMs < elapsed + duration || index === durations.length - 1) {
      return { chunkIndex: index, timeMs: Math.max(0, Math.min(duration, targetMs - elapsed)) };
    }
    elapsed += duration;
  }
  return { chunkIndex: durations.length - 1, timeMs: Math.max(0, durations.at(-1) || 0) };
}

function buildStoryNarrationChapterGroups(sections: StoryNarrationCatalogSection[]): StoryNarrationChapterGroup[] {
  const markers: Array<{ id: string; title: string; firstChunkIndex: number; inputOffset: number; startMs: number }> = [];
  let elapsedMs = 0;
  sections.forEach((section) => {
    const span = Math.max(1, section.inputEnd - section.inputStart);
    section.chapterMarkers.forEach((marker) => {
      if (markers.at(-1)?.id === marker.chapterId) return;
      const ratio = Math.max(0, Math.min(1, (marker.inputOffset - section.inputStart) / span));
      markers.push({
        id: marker.chapterId,
        title: marker.chapterTitle,
        firstChunkIndex: section.index,
        inputOffset: marker.inputOffset,
        startMs: elapsedMs + (section.exists ? section.durationMs * ratio : 0)
      });
    });
    elapsedMs += section.exists ? section.durationMs : 0;
  });

  return markers.map((marker, index) => {
    const next = markers[index + 1];
    const lastChunkIndex = next ? Math.max(marker.firstChunkIndex, next.firstChunkIndex) : sections.length - 1;
    const relevantSections = sections.slice(marker.firstChunkIndex, lastChunkIndex + 1);
    return {
      ...marker,
      sectionCount: relevantSections.length,
      recordedCount: relevantSections.filter((section) => section.exists).length,
      durationMs: Math.max(0, (next?.startMs ?? elapsedMs) - marker.startMs)
    };
  });
}

function formatSpeechifyDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function isSpeechifyChapterActive(group: StoryNarrationChapterGroup, groups: StoryNarrationChapterGroup[], currentMs: number) {
  const index = groups.indexOf(group);
  const next = groups[index + 1];
  return currentMs >= group.startMs && (!next || currentMs < next.startMs);
}

function findSpeechMarkAtTime(marks: SpeechifySpeechMark[], timeMs: number) {
  const index = findSpeechMarkIndexAtTime(marks, timeMs);
  return index >= 0 ? marks[index] : null;
}

function findSpeechMarkIndexAtTime(marks: SpeechifySpeechMark[], timeMs: number) {
  if (!marks.length || timeMs < marks[0].start_time) return -1;
  let low = 0;
  let high = marks.length - 1;
  let closest = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const mark = marks[middle];
    if (mark.start_time <= timeMs) {
      closest = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return closest;
}

function findSpeechMarkForInputOffset(marks: SpeechifySpeechMark[], chunk: StoryNarrationChunk, inputOffset: number) {
  const targetOffset = chunk.inputStart + inputOffset;
  const wordIndex = chunk.words.findIndex((word) => word.inputEnd > targetOffset);
  if (wordIndex < 0) return marks.at(-1) || null;
  const aligned = alignSpeechifyMarksToStoryWords(marks, chunk.words);
  const markIndex = aligned.findIndex((word) => word === chunk.words[wordIndex]);
  return markIndex >= 0 ? marks[markIndex] : marks.at(-1) || null;
}

function findStoryNarrationWordForMark(chunk: StoryNarrationChunk, mark: SpeechifySpeechMark, marks: SpeechifySpeechMark[]) {
  const markIndex = marks.indexOf(mark);
  return markIndex >= 0 ? alignSpeechifyMarksToStoryWords(marks, chunk.words)[markIndex] || null : null;
}

function alignSpeechifyMarksToStoryWords(marks: SpeechifySpeechMark[], words: StoryNarrationWordTarget[]) {
  const aligned: Array<StoryNarrationWordTarget | null> = Array.from({ length: marks.length }, () => null);
  let wordIndex = 0;
  marks.forEach((mark, markIndex) => {
    const spoken = normalizeSpeechifySpokenWord(mark.value);
    if (!spoken) return;
    const matchIndex = words.findIndex((word, index) => {
      if (index < wordIndex) return false;
      const visible = normalizeSpeechifySpokenWord(word.value);
      return visible === spoken || visible.includes(spoken) || spoken.includes(visible);
    });
    const resolvedIndex = matchIndex >= 0 ? matchIndex : wordIndex;
    if (!words[resolvedIndex]) return;
    aligned[markIndex] = words[resolvedIndex];
    wordIndex = resolvedIndex + 1;
  });
  return aligned;
}

function normalizeSpeechifySpokenWord(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&(?:lt|#60);/gi, "<")
    .replace(/&(?:gt|#62);/gi, ">")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLocaleLowerCase();
}

function findStoryNarrationWordAtPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number,
  words: StoryNarrationWordTarget[]
) {
  const documentWithCaret = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = documentWithCaret.caretPositionFromPoint?.(clientX, clientY);
  const fallbackRange = position ? null : documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
  const node = (position?.offsetNode || fallbackRange?.startContainer) as Node | undefined;
  const offset = position?.offset ?? fallbackRange?.startOffset ?? -1;
  if (!(node instanceof Text) || offset < 0 || !root.contains(node)) return null;

  const exact = words.find((word) => word.startNode === node && word.endNode === node && offset >= word.nodeStart && offset <= word.nodeEnd);
  if (exact) return exact;
  const sameNodeWords = words.filter((word) => word.startNode === node && word.endNode === node);
  return sameNodeWords.reduce<StoryNarrationWordTarget | null>((nearest, word) => {
    if (!nearest) return word;
    const wordDistance = offset < word.nodeStart ? word.nodeStart - offset : Math.max(0, offset - word.nodeEnd);
    const nearestDistance = offset < nearest.nodeStart ? nearest.nodeStart - offset : Math.max(0, offset - nearest.nodeEnd);
    return wordDistance < nearestDistance ? word : nearest;
  }, null);
}

function highlightStoryNarrationWord(target: StoryNarrationWordTarget, follow: boolean) {
  const range = document.createRange();
  range.setStart(target.startNode, Math.min(target.nodeStart, target.startNode.length));
  range.setEnd(target.endNode, Math.min(target.nodeEnd, target.endNode.length));
  const registry = (CSS as unknown as { highlights?: { set: (name: string, highlight: unknown) => void } }).highlights;
  const HighlightConstructor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (registry && HighlightConstructor) {
    registry.set(STORY_NARRATION_HIGHLIGHT, new HighlightConstructor(range));
  } else {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  if (!follow) return;
  const rect = range.getBoundingClientRect();
  if (rect.top < 120 || rect.bottom > window.innerHeight - 100) {
    (target.startNode.parentElement || target.endNode.parentElement)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function clearStoryNarrationHighlight() {
  const registry = (CSS as unknown as { highlights?: { delete: (name: string) => void } }).highlights;
  if (registry) registry.delete(STORY_NARRATION_HIGHLIGHT);
  else window.getSelection()?.removeAllRanges();
}

function waitForSpeechifyAudioMetadata(audio: HTMLAudioElement) {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      audio.removeEventListener("loadedmetadata", finish);
      audio.removeEventListener("error", finish);
      resolve();
    };
    const timeout = window.setTimeout(finish, 2_000);
    audio.addEventListener("loadedmetadata", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
  });
}

function loadSpeechifyVoicePreference() {
  try {
    return localStorage.getItem("tavernCookBookSpeechifyVoice:v2") || "";
  } catch {
    return "";
  }
}

function saveSpeechifyVoicePreference(voiceId: string) {
  try {
    localStorage.setItem("tavernCookBookSpeechifyVoice:v2", voiceId);
  } catch {
    // Voice selection is optional preference data.
  }
}

function humanizeStoryLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}

function storyReferenceMentionsTitle(reference: StoryReference, title: string) {
  const target = normalizeTerm(title);
  const haystack = normalizeTerm([
    reference.title,
    reference.shortSummary,
    ...reference.relatedCharacters,
    ...reference.relatedLocations,
    ...reference.relatedQuests,
    ...reference.relatedFactions,
    ...reference.relatedItems,
    ...reference.relatedRecipes,
    ...reference.relatedTimelineEvents,
    ...reference.tags
  ].join(" "));
  return new RegExp(`\\b${escapeRegExp(target)}\\b`, "i").test(haystack);
}

function splitStoryParagraphs(value: string) {
  return String(value || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

function buildBeatCallouts(chapter: StoryChapter, page: StoryPage): StoryJourneyCallout[] {
  const authored = page.callouts || [];
  if (authored.length) return authored;
  const title = page.title.toLowerCase();
  if (title.includes("fire meal trance")) {
    return [
      {
        id: `${page.id}-player-knowledge`,
        kind: "playerKnowledge",
        label: "Player knowledge",
        text: "Gwen and the player see a young princess and a shadowy creature, but neither yet understands that the vision points toward Lillia and the Ice Queen."
      },
      {
        id: `${page.id}-consequence`,
        kind: "consequence",
        label: "Story consequence",
        text: "Gwen wakes with fire power, proving that her cooking can grant abilities and reveal memories connected to corrupted recipe magic."
      }
    ];
  }
  if (title.includes("prawnhusk")) {
    return [{
      id: `${page.id}-consequence`,
      kind: "consequence",
      label: "Story consequence",
      text: "Saving Kap turns the gathering trip into an investigation and gives Gwen her first undeniable proof that the infestation is not natural."
    }];
  }
  if (title.includes("second exodus")) {
    return [{
      id: `${page.id}-revelation`,
      kind: "revelation",
      label: "Hidden context",
      text: "The surviving Whisken understand this as their first exodus because their ancestors deliberately erased the earlier Cat Cauldron disaster from communal memory."
    }];
  }
  if (chapter.id === "final-confrontation") {
    return [{
      id: `${page.id}-gap`,
      kind: "canonGap",
      label: "Needs Story Information",
      text: "The Cookbook establishes the thematic destination, but not yet the complete chain of scenes, choices, and consequences that reaches it."
    }];
  }
  return [];
}

interface CanonReviewItem {
  id: string;
  severity: "gap" | "conflict" | "review";
  label: string;
  title: string;
  description: string;
  chapterId?: string;
}

function buildCanonReviewItems(chapters: StoryChapter[], entries: LoreEntry[]): CanonReviewItem[] {
  const items: CanonReviewItem[] = [
    {
      id: "academy-name-review",
      severity: "review",
      label: "Naming review",
      title: "Unhold and Ovenhold Academy naming",
      description: "The final examination is documented, but the relationship between Culinary Imperial Academy of Unhold and Ovenhold remains unresolved. Keep one Academy record until the place-name relationship is confirmed."
    },
    {
      id: "academy-rival-name-review",
      severity: "review",
      label: "Name TBD",
      title: "Academy Rival needs a final name",
      description: "The rival's story role and Cook Battle are documented. Ressa Vale remains only a previous working name and should not be treated as final canon."
    },
    {
      id: "cedric-name-conflict",
      severity: "conflict",
      label: "Naming conflict",
      title: "Cedric or Cedrick spelling",
      description: "The new canonical record uses Cedric the Grunt and treats Cedrick as an alias. Confirm whether the display spelling should change before removing that alias."
    },
    {
      id: "brambrik-review",
      severity: "review",
      label: "Soft canon",
      title: "Brambrake's gate-opening task",
      description: "Brambrake's role, personality, and hidden early presentation are documented. The exact quest that convinces him to open the gate still needs confirmation."
    },
    {
      id: "masil-maseel-name-conflict",
      severity: "conflict",
      label: "Naming review",
      title: "Masil Cult or Mas'eel Cult",
      description: "The new cult leader record uses Masil, while the established faction and older lore use Mas'eel. The records are safely linked, but the project should confirm whether Masil replaces Mas'eel or names a distinct branch."
    }
  ];
  if (entries.some((entry) => entry.title === "Old Version: Tohm Builds Trust with King Over Months") && entries.some((entry) => entry.title === "Newer Version: Tohm Wins Royal Food Contest")) {
    items.push({
      id: "tohm-royal-access-version",
      severity: "conflict",
      label: "Old and newer versions",
      title: "How Tohm gains royal access",
      description: "Both an old gradual-trust version and a newer royal food contest version remain in the Cookbook. The newer contest version is preferred, while the old record should remain archived rather than blended into it."
    });
  }
  (["act2", "act3"] as StoryJourneyScope[]).forEach((scope) => {
    if (chapters.some((chapter) => storyChapterScope(chapter) === scope)) return;
    items.push({
      id: `missing-${scope}`,
      severity: "gap",
      label: "Missing act treatment",
      title: `${scope === "act2" ? "Act 2" : "Act 3"} has no documented chapters`,
      description: "The Cookbook does not yet contain enough ordered scene information to assemble this act without inventing canon."
    });
  });
  chapters.filter((chapter) => chapter.pages.length <= 1 && chapter.pages.reduce((total, page) => total + richTextToPlainText(page.text).split(/\s+/).filter(Boolean).length, 0) < 120).forEach((chapter) => {
    items.push({
      id: `shallow-${chapter.id}`,
      severity: "gap",
      label: "Thin chapter",
      title: chapter.title,
      description: "This chapter has only one documented sequence and needs connective events before it can read as a complete part of the story.",
      chapterId: chapter.id
    });
  });
  return items;
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
  if (chapter.scope) return normalizeStoryJourneyScope(chapter.scope);
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
  const next = chapters.filter((chapter) => chapter.id !== LEGACY_ACT_ONE_CHAPTER_ID);
  defaultStoryChapters
    .filter((chapter) => storyExpansionChapterIds.has(chapter.id))
    .forEach((defaultChapter) => {
      const index = next.findIndex((chapter) => chapter.id === defaultChapter.id);
      if (index >= 0) {
        next[index] = normalizeStoryChapter(next[index], defaultChapter.id);
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
    // The shared database remains authoritative if this optional local recovery cache is full.
  }
}

function normalizeStoryChapter(value: Partial<StoryChapter>, fallbackId?: string): StoryChapter {
  const title = editableString(value.title, "Untitled Story Chapter");
  const id = String(value.id || fallbackId || slugify(title) || `story-chapter-${Date.now()}`);
  const startPercent = clamp(Number(value.timelineStartPercent), 0, 100);
  const endPercent = clamp(Number(value.timelineEndPercent), 0, 100);
  const pages = Array.isArray(value.pages) && value.pages.length
    ? value.pages.map((page, index) => normalizeStoryPage(page, `${id}-page-${index + 1}`))
    : [normalizeStoryPage({}, `${id}-page-1`)];

  return {
    id,
    title,
    subtitle: editableString(value.subtitle, "Add a chapter subtitle."),
    timelineStartLabel: editableString(value.timelineStartLabel, "Pre-Game"),
    timelineEndLabel: editableString(value.timelineEndLabel, editableString(value.timelineStartLabel, "Act 1")),
    timelineStartPercent: Math.min(startPercent, endPercent),
    timelineEndPercent: Math.max(startPercent, endPercent),
    era: editableString(value.era, "Draft"),
    scope: value.scope ? normalizeStoryJourneyScope(value.scope) : undefined,
    revealLevel: normalizeRevealLevel(value.revealLevel),
    shortDescription: editableString(value.shortDescription, "Write the chapter preview here."),
    overviewText: editableString(value.overviewText, "") || undefined,
    coverImageUrl: String(value.coverImageUrl || ""),
    coverImageFit: normalizeImageFit(value.coverImageFit),
    relatedLore: normalizeTermList(value.relatedLore),
    threads: normalizeTermList(value.threads),
    sourceRecords: Array.isArray(value.sourceRecords) ? value.sourceRecords : [],
    developerNotes: editableString(value.developerNotes, "") || undefined,
    pages
  };
}

function normalizeStoryPage(value: Partial<StoryPage>, fallbackId: string): StoryPage {
  return {
    id: String(value.id || fallbackId),
    title: editableString(value.title, "Untitled Page"),
    text: editableString(value.text, "Write this story page here."),
    detailedText: editableString(value.detailedText, "") || undefined,
    imageUrl: String(value.imageUrl || ""),
    imageFit: normalizeImageFit(value.imageFit),
    imagePlaceholder: editableString(value.imagePlaceholder, ""),
    caption: editableString(value.caption, ""),
    relatedLore: normalizeTermList(value.relatedLore),
    threads: normalizeTermList(value.threads),
    callouts: Array.isArray(value.callouts) ? value.callouts : [],
    sourceRecords: Array.isArray(value.sourceRecords) ? value.sourceRecords : [],
    developerNotes: editableString(value.developerNotes, "") || undefined
  };
}

function editableString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
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
