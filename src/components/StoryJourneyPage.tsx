import { useEffect, useMemo, useState } from "react";
import type { BestiaryCreature, ImageFitSettings, LoreEntry } from "../types";
import { normalizeImageFit, resolveImageSourceUrl } from "../utils/imageFit";
import { richTextToPlainText } from "../utils/richText";
import { AdjustableImage } from "./AdjustableImage";
import { CustomSelect } from "./CustomSelect";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { Icon } from "./Icon";

const STORY_JOURNEY_STATE_KEY = "tavernCookBookStoryJourneyState";
const STORY_JOURNEY_CHAPTERS_KEY = "tavernCookBookStoryJourneyChapters";

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
  pageByChapter: Record<string, number>;
  completedChapterIds: string[];
}

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
    subtitle: "Cozy village life meets corruption, bugs, and the first recipe page.",
    timelineStartLabel: "Act 1",
    timelineEndLabel: "Act 1",
    timelineStartPercent: 70,
    timelineEndPercent: 80,
    era: "During the Game",
    revealLevel: "Player-Facing",
    shortDescription:
      "Gwen begins her journey in Whisker Woods, where cozy village life is being threatened by corruption, strange creatures, and the first signs of the stolen recipes.",
    relatedLore: ["Gwen", "Whisker Woods", "Kap", "Recipe Book", "Ice Queen"],
    pages: [
      {
        title: "The First Task",
        text:
          "Gwen begins by gathering ingredients and learning the rhythm of the world. Whisker Woods seems warm and alive, full of paths, villagers, food, and small needs that make a place feel real.",
        imagePlaceholder: "Gwen gathering ingredients in a golden forest clearing.",
        caption: "A good first task teaches the world without stopping it.",
        relatedLore: ["Gwen", "Whisker Woods"]
      },
      {
        title: "Something Wrong in the Woods",
        text:
          "Bug nests, corrupted creatures, and strange changes begin appearing. The woods are not merely dangerous. They are being altered by something that does not belong in the natural order.",
        imagePlaceholder: "A cozy forest path interrupted by dark roots and insect nests.",
        caption: "Corruption is easiest to notice when it touches somewhere gentle.",
        relatedLore: ["Whisker Woods", "Dark Culinary Arts"]
      },
      {
        title: "Kap at the Corrupted Pond",
        text:
          "Gwen helps Kap and sees that the problem is larger than expected. The pond is not just a local trouble spot. It is proof that the stolen recipes are reaching into daily life.",
        imagePlaceholder: "A pond with ripples of dark color and a worried figure nearby.",
        caption: "The first rescue shows the shape of the danger.",
        relatedLore: ["Kap", "Gwen", "Whisker Woods"]
      },
      {
        title: "The First Recipe Page",
        text:
          "Gwen begins to understand that stolen recipe pages are connected to the corrupted powers spreading through the world. Recovery is not optional. Every missing page can become another disaster.",
        imagePlaceholder: "A torn recipe page glowing in Gwen's hand.",
        caption: "A page recovered is a wound closed.",
        relatedLore: ["Recipe Book", "Gwen", "Tohm Kyatt"]
      },
      {
        title: "The Ice Queen",
        text:
          "The act builds toward the Ice Queen, the cursed ruler of corrupted bugs in Whisker Woods. She turns a local threat into a boss story: creature design, corruption, and recipe power all meeting in one fight.",
        imagePlaceholder: "A frozen insect queen in a corrupted nest throne.",
        caption: "Every act needs a face for its danger.",
        relatedLore: ["Ice Queen", "Whisker Woods", "Dark Culinary Arts"]
      },
      {
        title: "A Recipe Recovered",
        text:
          "Gwen defeats the threat, recovers a recipe page, and the story opens toward the next act. The woods are not fully safe, but the player has learned the rule: cook, fight, help, recover, and keep asking what Tohm is hiding.",
        imagePlaceholder: "Warm light returning to part of Whisker Woods.",
        caption: "Act 1 ends by making the world bigger.",
        relatedLore: ["Gwen", "Recipe Book", "Tohm Kyatt"]
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
      "The truth of Tabby Island and the Cat Cauldron eventually reframes Tohm Kyatt's story. This chapter is a major spoiler thread for later expansion.",
    relatedLore: ["Tabby Island", "Cat Cauldron", "Tohm Kyatt", "Whisken"],
    pages: [
      {
        title: "The Secret Beneath the Island",
        text:
          "Tabby Island hides the Cat Cauldron and the consequences of Tohm Kyatt's choices. The public version of the disaster is incomplete, and the truth waits until the player is ready to understand what Tohm has carried.",
        imagePlaceholder: "A hidden cauldron chamber beneath an island.",
        caption: "Some secrets are not buried. They simmer.",
        relatedLore: ["Tabby Island", "Cat Cauldron", "Tohm Kyatt"]
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
  Osul: { type: "Location", description: "Gwen's home region before her work with Tohm and the Living Tavern." },
  Kap: { type: "Character", description: "A character tied to the corrupted pond trouble in Act 1." },
  "Living Tavern": { type: "Location / Artifact", description: "Tohm's magical tavern and major hub." },
  "Recipe Book": { type: "Artifact", description: "Tohm's magical recipe book, source of torn recipe pages and dangerous powers." },
  "Dark Culinary Arts": { type: "Magic System", description: "A corrupted form of magical cooking tied to Lillia and dangerous meals." }
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
  const [pageByChapter, setPageByChapter] = useState(storedState.pageByChapter);
  const [completedChapterIds, setCompletedChapterIds] = useState<string[]>(storedState.completedChapterIds);
  const [readerOpen, setReaderOpen] = useState(false);
  const [selectedLoreTerm, setSelectedLoreTerm] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [pageTurnKey, setPageTurnKey] = useState(0);
  const [storyEditMode, setStoryEditMode] = useState(false);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);

  const selectedIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === selectedChapterId));
  const selectedChapter = chapters[selectedIndex] || chapters[0];
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
      pageByChapter,
      completedChapterIds
    });
  }, [selectedChapterId, pageByChapter, completedChapterIds]);

  useEffect(() => {
    saveStoryChapters(chapters);
  }, [chapters]);

  useEffect(() => {
    if (readOnly) setStoryEditMode(false);
  }, [readOnly]);

  useEffect(() => {
    if (!chapters.some((chapter) => chapter.id === selectedChapterId) && chapters[0]) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters, selectedChapterId]);

  const selectChapter = (chapterId: string) => {
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
    const nextChapter = chapters[selectedIndex + 1];
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
    const title = `New Story Chapter ${nextNumber}`;
    const id = uniqueId(slugify(title), chapters.map((chapter) => chapter.id));
    const chapter = normalizeStoryChapter({
      id,
      title,
      subtitle: "Add a short hook for this chapter.",
      timelineStartLabel: "Pre-Game",
      timelineEndLabel: "Act 1",
      timelineStartPercent: 50,
      timelineEndPercent: 60,
      era: "Draft",
      revealLevel: "Player-Facing",
      shortDescription: "Write the quick chapter preview here.",
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
    setSelectedChapterId(nextChapters[Math.max(0, selectedIndex - 1)]?.id || nextChapters[0].id);
    setReaderOpen(false);
  };

  const moveSelectedChapter = (direction: -1 | 1) => {
    const targetIndex = selectedIndex + direction;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;
    setChapters((current) => {
      const next = [...current];
      const [chapter] = next.splice(selectedIndex, 1);
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
                The starting ground for the story of Tales of the Tavern, from ancient meals to Gwen's playable journey.
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
              <button className="button-frame story-journey-start-button" onClick={() => setReaderOpen(true)}>
                <Icon name="BookOpen" className="h-5 w-5" />
                Start Reading
              </button>
            </div>
          </header>

          <div className="story-chapter-capsules">
            {chapters.map((chapter, index) => (
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
                  <img className="story-preview-cover-image" src={coverImageUrl} alt="" />
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
              chapterIndex={selectedIndex}
              chapterCount={chapters.length}
              onChange={updateSelectedChapter}
              onMove={moveSelectedChapter}
              onDelete={deleteSelectedChapter}
            />
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
                    <img className="story-page-image" src={pageImageUrl} alt="" />
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
            ) : selectedIndex < chapters.length - 1 ? (
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

function loadStoryJourneyState(chapters: StoryChapter[]): StoryJourneyState {
  try {
    const stored = localStorage.getItem(STORY_JOURNEY_STATE_KEY);
    if (!stored) return createDefaultStoryJourneyState(chapters);
    const parsed = JSON.parse(stored) as Partial<StoryJourneyState>;
    return {
      selectedChapterId: chapters.some((chapter) => chapter.id === parsed.selectedChapterId)
        ? String(parsed.selectedChapterId)
        : chapters[0].id,
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
    return normalized.length ? normalized : defaultStoryChapters.map((chapter) => normalizeStoryChapter(chapter));
  } catch {
    return defaultStoryChapters.map((chapter) => normalizeStoryChapter(chapter));
  }
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
