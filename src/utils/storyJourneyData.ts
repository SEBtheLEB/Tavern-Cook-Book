import type {
  StoryJourneyCallout,
  StoryJourneyChapterRecord,
  StoryJourneyData,
  StoryJourneyGuideCollectionRecord,
  StoryJourneyGuidePageRecord,
  StoryJourneyGuidePageType,
  StoryJourneyGuideSourceSection,
  StoryJourneyPlacePageData,
  StoryJourneyPlaceSectionId,
  StoryJourneyPageRecord,
  StoryJourneyReaderAppearance,
  StoryJourneyReaderFont,
  StoryJourneyRevealLevel,
  StoryJourneyScope,
  StoryJourneySourceRecord
} from "../types";
import { ACADEMY_PLACE_MIGRATION_ID, ACADEMY_PLACE_PAGE } from "../data/academyPlacePage";
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
const readerFonts = new Set<StoryJourneyReaderFont>(["classic", "book", "clean"]);

export const DEFAULT_STORY_READER_APPEARANCE: StoryJourneyReaderAppearance = {
  backgroundColor: "#020b18",
  chapterIndicatorColor: "#deaa5e",
  sequenceIndicatorColor: "#deaa5e",
  accentColor: "#deaa5e",
  highlightedTextColor: "#deaa5e",
  linkColor: "#deaa5e",
  headingTextColor: "#f3e4ca",
  bodyTextColor: "#e3dbd1",
  mutedTextColor: "#c3bab6",
  headingFont: "classic",
  bodyFont: "classic",
  bodyFontSize: 17,
  lineHeight: 1.78,
  contentWidth: 760,
  grainStrength: 7
};

const LEGACY_STORY_READER_COLORS = {
  chapterIndicatorColor: "#d6a447",
  sequenceIndicatorColor: "#c99442",
  accentColor: "#c99442",
  highlightedTextColor: "#e4ba68",
  linkColor: "#e4ba68",
  headingTextColor: "#f5e7cf",
  bodyTextColor: "#eadfce"
} as const;

const normalizeHexColor = (value: unknown, fallback: string) => {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
};

const normalizeMigratedReaderColor = (value: unknown, legacy: string, fallback: string) => {
  const color = normalizeHexColor(value, fallback);
  return color === legacy ? fallback : color;
};

const clampNumber = (value: unknown, minimum: number, maximum: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
};

export const normalizeStoryReaderAppearance = (value: Partial<StoryJourneyReaderAppearance> | undefined): StoryJourneyReaderAppearance => ({
  backgroundColor: normalizeHexColor(value?.backgroundColor, DEFAULT_STORY_READER_APPEARANCE.backgroundColor),
  chapterIndicatorColor: normalizeMigratedReaderColor(value?.chapterIndicatorColor, LEGACY_STORY_READER_COLORS.chapterIndicatorColor, DEFAULT_STORY_READER_APPEARANCE.chapterIndicatorColor),
  sequenceIndicatorColor: normalizeMigratedReaderColor(value?.sequenceIndicatorColor, LEGACY_STORY_READER_COLORS.sequenceIndicatorColor, DEFAULT_STORY_READER_APPEARANCE.sequenceIndicatorColor),
  accentColor: normalizeMigratedReaderColor(value?.accentColor, LEGACY_STORY_READER_COLORS.accentColor, DEFAULT_STORY_READER_APPEARANCE.accentColor),
  highlightedTextColor: normalizeMigratedReaderColor(value?.highlightedTextColor, LEGACY_STORY_READER_COLORS.highlightedTextColor, DEFAULT_STORY_READER_APPEARANCE.highlightedTextColor),
  linkColor: normalizeMigratedReaderColor(value?.linkColor, LEGACY_STORY_READER_COLORS.linkColor, DEFAULT_STORY_READER_APPEARANCE.linkColor),
  headingTextColor: normalizeMigratedReaderColor(value?.headingTextColor, LEGACY_STORY_READER_COLORS.headingTextColor, DEFAULT_STORY_READER_APPEARANCE.headingTextColor),
  bodyTextColor: normalizeMigratedReaderColor(value?.bodyTextColor, LEGACY_STORY_READER_COLORS.bodyTextColor, DEFAULT_STORY_READER_APPEARANCE.bodyTextColor),
  mutedTextColor: normalizeHexColor(value?.mutedTextColor, DEFAULT_STORY_READER_APPEARANCE.mutedTextColor),
  headingFont: readerFonts.has(value?.headingFont as StoryJourneyReaderFont) ? value?.headingFont as StoryJourneyReaderFont : DEFAULT_STORY_READER_APPEARANCE.headingFont,
  bodyFont: readerFonts.has(value?.bodyFont as StoryJourneyReaderFont) ? value?.bodyFont as StoryJourneyReaderFont : DEFAULT_STORY_READER_APPEARANCE.bodyFont,
  bodyFontSize: clampNumber(value?.bodyFontSize, 14, 24, DEFAULT_STORY_READER_APPEARANCE.bodyFontSize),
  lineHeight: clampNumber(value?.lineHeight, 1.35, 2.2, DEFAULT_STORY_READER_APPEARANCE.lineHeight),
  contentWidth: clampNumber(value?.contentWidth, 580, 980, DEFAULT_STORY_READER_APPEARANCE.contentWidth),
  grainStrength: clampNumber(value?.grainStrength, 0, 20, DEFAULT_STORY_READER_APPEARANCE.grainStrength)
});

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
const guidePageTypes = new Set<StoryJourneyGuidePageType>(["generic", "place"]);
const placeSectionIds = new Set<StoryJourneyPlaceSectionId>([
  "generalFacts",
  "environment",
  "habitats",
  "settlements",
  "landmarks",
  "inhabitants",
  "flora",
  "ingredients",
  "creatures",
  "threats",
  "culture",
  "narrativeRole"
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

export const createDefaultStoryJourneyPlaceData = (placeName = "Untitled Place"): StoryJourneyPlacePageData => ({
  placeName,
  placeType: "Region",
  subtitle: "A place whose paths, people, and history shape the world around it.",
  summary: "",
  formalTitle: placeName,
  founded: "",
  founder: "",
  originType: "",
  historicalNotes: "",
  quickFacts: [],
  generalFacts: "",
  environment: "",
  habitats: "",
  settlements: "",
  landmarks: "",
  inhabitants: "",
  flora: "",
  ingredients: "",
  creatures: "",
  threats: "",
  culture: "",
  narrativeRole: "",
  hiddenSections: [],
  referenceArt: [],
  relatedCharacters: [],
  notableFigures: [],
  relatedLocations: [],
  relatedQuests: [],
  showcaseTitle: "Notable Figures"
});

export const normalizeStoryJourneyPlaceData = (
  value: Partial<StoryJourneyPlacePageData> | undefined,
  fallbackName: string
): StoryJourneyPlacePageData => {
  const source = value || {};
  const defaults = createDefaultStoryJourneyPlaceData(fallbackName);
  const now = new Date().toISOString();
  return {
    ...defaults,
    placeName: String(source.placeName || fallbackName),
    placeType: String(source.placeType || defaults.placeType),
    subtitle: String(source.subtitle || ""),
    summary: String(source.summary || ""),
    formalTitle: String(source.formalTitle || source.placeName || fallbackName),
    founded: String(source.founded || ""),
    founder: String(source.founder || ""),
    originType: String(source.originType || ""),
    historicalNotes: String(source.historicalNotes || ""),
    quickFacts: Array.isArray(source.quickFacts) ? source.quickFacts.flatMap((fact, index) => {
      if (!fact || typeof fact !== "object") return [];
      const label = String(fact.label || "").trim();
      const factValue = String(fact.value || "").trim();
      if (!label && !factValue) return [];
      return [{ id: String(fact.id || `place-fact-${index + 1}`), label, value: factValue }];
    }) : [],
    generalFacts: String(source.generalFacts || ""),
    environment: String(source.environment || ""),
    habitats: String(source.habitats || ""),
    settlements: String(source.settlements || ""),
    landmarks: String(source.landmarks || ""),
    inhabitants: String(source.inhabitants || ""),
    flora: String(source.flora || ""),
    ingredients: String(source.ingredients || ""),
    creatures: String(source.creatures || ""),
    threats: String(source.threats || ""),
    culture: String(source.culture || ""),
    narrativeRole: String(source.narrativeRole || ""),
    hiddenSections: cleanList(source.hiddenSections).filter((id): id is StoryJourneyPlaceSectionId => placeSectionIds.has(id as StoryJourneyPlaceSectionId)),
    referenceArt: Array.isArray(source.referenceArt) ? source.referenceArt.flatMap((art, index) => {
      if (!art || typeof art !== "object" || !art.imageUrl) return [];
      return [{
        id: String(art.id || `place-reference-art-${index + 1}`),
        label: String(art.label || `${fallbackName} reference art`),
        imageUrl: String(art.imageUrl),
        webViewLink: art.webViewLink ? String(art.webViewLink) : undefined,
        imageFit: normalizeImageFit(art.imageFit),
        createdAt: String(art.createdAt || now)
      }];
    }) : [],
    relatedCharacters: cleanList(source.relatedCharacters),
    notableFigures: Array.isArray(source.notableFigures) ? source.notableFigures.flatMap((figure, index) => {
      if (!figure || typeof figure !== "object") return [];
      const name = String(figure.name || "").trim();
      if (!name) return [];
      return [{
        id: String(figure.id || `place-figure-${index + 1}`),
        entryId: figure.entryId ? String(figure.entryId) : undefined,
        name,
        role: String(figure.role || "")
      }];
    }) : [],
    relatedLocations: cleanList(source.relatedLocations),
    relatedQuests: cleanList(source.relatedQuests),
    showcaseTitle: String(source.showcaseTitle || defaults.showcaseTitle)
  };
};

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
  const pageType = guidePageTypes.has(value.pageType as StoryJourneyGuidePageType)
    ? value.pageType as StoryJourneyGuidePageType
    : value.place ? "place" : "generic";
  const title = String(value.title || "Untitled Guide Page");
  return {
    id: String(value.id || fallbackId),
    pageType,
    title,
    eyebrow: String(value.eyebrow || "World Guide"),
    summary: String(value.summary || ""),
    fullText: String(value.fullText || value.summary || ""),
    tags: cleanList(value.tags),
    place: pageType === "place" ? normalizeStoryJourneyPlaceData(value.place, title) : undefined,
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
  const contentMigrations = cleanList(value?.contentMigrations);
  const guideCollections = normalizeStoryJourneyGuideCollections(value?.guideCollections);

  if (!contentMigrations.includes(ACADEMY_PLACE_MIGRATION_ID)) {
    const academyTitle = ACADEMY_PLACE_PAGE.title.trim().toLowerCase();
    const placesCollection = guideCollections.find((collection) => collection.sourceSectionId === "places" || collection.id === "places");
    const academyExists = guideCollections.some((collection) => collection.pages.some((page) => (
      page.id === ACADEMY_PLACE_PAGE.id || page.title.trim().toLowerCase() === academyTitle
    )));

    if (!academyExists) {
      if (placesCollection) {
        placesCollection.pages.push(normalizeStoryJourneyGuidePage(ACADEMY_PLACE_PAGE, ACADEMY_PLACE_PAGE.id));
      } else {
        const defaultPlacesCollection = createDefaultStoryJourneyGuideCollections().find((collection) => collection.id === "places");
        if (defaultPlacesCollection) {
          defaultPlacesCollection.pages.push(normalizeStoryJourneyGuidePage(ACADEMY_PLACE_PAGE, ACADEMY_PLACE_PAGE.id));
          guideCollections.push(defaultPlacesCollection);
        }
      }
    }

    contentMigrations.push(ACADEMY_PLACE_MIGRATION_ID);
  }

  return {
    title: String(value?.title || "The Story of Tales of the Tavern"),
    description: /chronological narrative treatment assembled from the tavern cookbook's existing canon/i.test(description)
      ? "The complete story of Tales of the Tavern in chronological order."
      : description,
    dialogueBubbleImageUrl: value?.dialogueBubbleImageUrl ? String(value.dialogueBubbleImageUrl) : "",
    dialogueBubbleImageFit: normalizeImageFit(value?.dialogueBubbleImageFit),
    readerAppearance: normalizeStoryReaderAppearance(value?.readerAppearance),
    chapters: Array.isArray(value?.chapters)
      ? value.chapters.map((chapter, index) => normalizeStoryJourneyChapter(chapter, `story-chapter-${index + 1}`))
      : [],
    guideCollections,
    contentMigrations,
    updatedAt: String(value?.updatedAt || new Date().toISOString())
  };
};
