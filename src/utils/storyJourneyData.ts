import type {
  StoryJourneyCallout,
  StoryJourneyChapterRecord,
  StoryJourneyData,
  StoryJourneyGuideCollectionRecord,
  StoryJourneyGuidePageRecord,
  StoryJourneyGuideSourceSection,
  StoryJourneyPageRecord,
  StoryJourneyRevealLevel,
  StoryJourneyScope,
  StoryJourneySourceRecord
} from "../types";
import { normalizeImageFit } from "./imageFit";

const revealLevels = new Set<StoryJourneyRevealLevel>([
  "Ancient History",
  "Pre-Game",
  "Player-Facing",
  "Hidden Truth",
  "Minor Spoiler",
  "Major Spoiler"
]);

const scopes = new Set<StoryJourneyScope>(["history", "act1", "act2", "act3"]);

const guideSourceSections = new Set<StoryJourneyGuideSourceSection>([
  "peoples",
  "characters",
  "places",
  "factions",
  "magic",
  "creatures",
  "quests",
  "lore"
]);

const defaultGuideCollectionDefinitions: Array<{
  id: StoryJourneyGuideSourceSection;
  title: string;
  description: string;
}> = [
  { id: "peoples", title: "Peoples & Realms", description: "Cultures, kingdoms, peoples, and the traditions that distinguish them." },
  { id: "characters", title: "Characters", description: "The people whose choices move the story." },
  { id: "places", title: "Places", description: "Regions, settlements, landmarks, and important story spaces." },
  { id: "factions", title: "Factions & Faiths", description: "Organizations, alliances, religions, and competing beliefs." },
  { id: "magic", title: "Magic, Meals & Artifacts", description: "Food magic, recipes, ingredients, relics, and important objects." },
  { id: "creatures", title: "Creatures & Threats", description: "Wildlife, enemies, bosses, and corrupted beings." },
  { id: "quests", title: "Quests & Storylines", description: "Objectives and playable story threads." },
  { id: "lore", title: "Lore & Mysteries", description: "Myths, secrets, rules, unresolved questions, and glossary concepts." }
];

const cleanList = (value: unknown) => Array.isArray(value)
  ? value.map((item) => String(item || "").trim()).filter(Boolean)
  : [];

const normalizeSourceRecords = (value: unknown): StoryJourneySourceRecord[] => Array.isArray(value)
  ? value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const source = item as Partial<StoryJourneySourceRecord>;
      if (!source.id || !source.label) return [];
      return [{
        type: source.type || "entry",
        id: String(source.id),
        label: String(source.label),
        category: source.category ? String(source.category) : undefined
      }];
    })
  : [];

const normalizeCallouts = (value: unknown): StoryJourneyCallout[] => Array.isArray(value)
  ? value.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const callout = item as Partial<StoryJourneyCallout>;
      if (!callout.text) return [];
      return [{
        id: String(callout.id || `story-callout-${index + 1}`),
        kind: callout.kind || "revelation",
        label: String(callout.label || "Story context"),
        text: String(callout.text)
      }];
    })
  : [];

export const createDefaultStoryJourneyGuideCollections = (): StoryJourneyGuideCollectionRecord[] =>
  defaultGuideCollectionDefinitions.map((definition) => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    sourceSectionId: definition.id,
    hiddenSourceItemIds: [],
    pages: []
  }));

export const normalizeStoryJourneyGuidePage = (
  value: Partial<StoryJourneyGuidePageRecord>,
  fallbackId: string
): StoryJourneyGuidePageRecord => {
  const now = new Date().toISOString();
  return {
    id: String(value.id || fallbackId),
    title: String(value.title || "Untitled Guide Page"),
    eyebrow: String(value.eyebrow || "World Guide"),
    summary: String(value.summary || ""),
    fullText: String(value.fullText || value.summary || ""),
    tags: cleanList(value.tags),
    createdAt: String(value.createdAt || now),
    updatedAt: String(value.updatedAt || value.createdAt || now)
  };
};

export const normalizeStoryJourneyGuideCollections = (
  value: unknown
): StoryJourneyGuideCollectionRecord[] => {
  if (!Array.isArray(value)) return createDefaultStoryJourneyGuideCollections();
  return value.flatMap((item, collectionIndex) => {
    if (!item || typeof item !== "object") return [];
    const collection = item as Partial<StoryJourneyGuideCollectionRecord>;
    const sourceSectionId = guideSourceSections.has(collection.sourceSectionId as StoryJourneyGuideSourceSection)
      ? collection.sourceSectionId as StoryJourneyGuideSourceSection
      : undefined;
    const fallbackDefinition = sourceSectionId
      ? defaultGuideCollectionDefinitions.find((definition) => definition.id === sourceSectionId)
      : undefined;
    const id = String(collection.id || `guide-collection-${collectionIndex + 1}`);
    return [{
      id,
      title: String(collection.title || fallbackDefinition?.title || "Untitled Collection"),
      description: String(collection.description || fallbackDefinition?.description || ""),
      sourceSectionId,
      hiddenSourceItemIds: cleanList(collection.hiddenSourceItemIds),
      pages: Array.isArray(collection.pages)
        ? collection.pages.map((page, pageIndex) => normalizeStoryJourneyGuidePage(page, `${id}-page-${pageIndex + 1}`))
        : []
    }];
  });
};

export const inferStoryJourneyScope = (chapter: Partial<StoryJourneyChapterRecord>): StoryJourneyScope => {
  if (chapter.scope && scopes.has(chapter.scope)) return chapter.scope;
  const value = `${chapter.id || ""} ${chapter.era || ""} ${chapter.timelineStartLabel || ""}`.toLowerCase();
  if (value.includes("act 1") || value.includes("act-one")) return "act1";
  if (value.includes("act 2") || value.includes("act-two")) return "act2";
  if (value.includes("act 3") || value.includes("act-three") || value.includes("late game") || value.includes("final act")) return "act3";
  return "history";
};

export const normalizeStoryJourneyPage = (
  value: Partial<StoryJourneyPageRecord>,
  fallbackId: string
): StoryJourneyPageRecord => ({
  id: String(value.id || fallbackId),
  title: String(value.title || "Untitled Story Beat"),
  text: String(value.text || "Needs Story Information."),
  detailedText: value.detailedText ? String(value.detailedText) : undefined,
  imageUrl: value.imageUrl ? String(value.imageUrl) : "",
  imageFit: normalizeImageFit(value.imageFit),
  imagePlaceholder: value.imagePlaceholder ? String(value.imagePlaceholder) : "",
  caption: value.caption ? String(value.caption) : "",
  relatedLore: cleanList(value.relatedLore),
  threads: cleanList(value.threads),
  callouts: normalizeCallouts(value.callouts),
  sourceRecords: normalizeSourceRecords(value.sourceRecords),
  developerNotes: value.developerNotes ? String(value.developerNotes) : undefined,
  dialogueSpriteOverrides: Object.fromEntries(
    Object.entries(value.dialogueSpriteOverrides || {}).flatMap(([key, selection]) => {
      if (!selection || typeof selection !== "object" || !selection.imageUrl) return [];
      return [[key, {
        assetId: String(selection.assetId || key),
        imageUrl: String(selection.imageUrl),
        imageFit: normalizeImageFit(selection.imageFit),
        sourceEntryId: selection.sourceEntryId ? String(selection.sourceEntryId) : undefined,
        presentation: selection.presentation === "full-box" ? "full-box" : "portrait"
      }]];
    })
  )
});

export const normalizeStoryJourneyChapter = (
  value: Partial<StoryJourneyChapterRecord>,
  fallbackId: string
): StoryJourneyChapterRecord => {
  const pages = Array.isArray(value.pages) && value.pages.length
    ? value.pages.map((page, index) => normalizeStoryJourneyPage(page, `${fallbackId}-beat-${index + 1}`))
    : [normalizeStoryJourneyPage({}, `${fallbackId}-beat-1`)];
  const revealLevel = revealLevels.has(value.revealLevel as StoryJourneyRevealLevel)
    ? value.revealLevel as StoryJourneyRevealLevel
    : "Player-Facing";
  const chapter = {
    id: String(value.id || fallbackId),
    title: String(value.title || "Untitled Chapter"),
    subtitle: String(value.subtitle || "A chapter awaiting its treatment."),
    timelineStartLabel: String(value.timelineStartLabel || "Unscheduled"),
    timelineEndLabel: String(value.timelineEndLabel || value.timelineStartLabel || "Unscheduled"),
    timelineStartPercent: Number.isFinite(value.timelineStartPercent) ? Number(value.timelineStartPercent) : 0,
    timelineEndPercent: Number.isFinite(value.timelineEndPercent) ? Number(value.timelineEndPercent) : 0,
    era: String(value.era || "Story"),
    scope: value.scope,
    revealLevel,
    shortDescription: String(value.shortDescription || "Needs Story Information."),
    overviewText: value.overviewText ? String(value.overviewText) : undefined,
    coverImageUrl: value.coverImageUrl ? String(value.coverImageUrl) : "",
    coverImageFit: normalizeImageFit(value.coverImageFit),
    relatedLore: cleanList(value.relatedLore),
    threads: cleanList(value.threads),
    sourceRecords: normalizeSourceRecords(value.sourceRecords),
    developerNotes: value.developerNotes ? String(value.developerNotes) : undefined,
    pages
  } satisfies StoryJourneyChapterRecord;
  chapter.scope = inferStoryJourneyScope(chapter);
  return chapter;
};

export const normalizeStoryJourneyData = (value: Partial<StoryJourneyData> | undefined): StoryJourneyData => {
  const description = String(value?.description || "The complete story of Tales of the Tavern in chronological order.");
  return {
    title: String(value?.title || "The Story of Tales of the Tavern"),
    description: /chronological narrative treatment assembled from the tavern cookbook's existing canon/i.test(description)
      ? "The complete story of Tales of the Tavern in chronological order."
      : description,
    dialogueBubbleImageUrl: value?.dialogueBubbleImageUrl ? String(value.dialogueBubbleImageUrl) : "",
    dialogueBubbleImageFit: normalizeImageFit(value?.dialogueBubbleImageFit),
    chapters: Array.isArray(value?.chapters)
      ? value.chapters.map((chapter, index) => normalizeStoryJourneyChapter(chapter, `story-chapter-${index + 1}`))
      : [],
    guideCollections: normalizeStoryJourneyGuideCollections(value?.guideCollections),
    updatedAt: String(value?.updatedAt || new Date().toISOString())
  };
};
