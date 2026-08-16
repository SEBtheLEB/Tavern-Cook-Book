import type {
  StoryJourneyCallout,
  StoryJourneyChapterRecord,
  StoryJourneyData,
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
  developerNotes: value.developerNotes ? String(value.developerNotes) : undefined
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

export const normalizeStoryJourneyData = (value: Partial<StoryJourneyData> | undefined): StoryJourneyData => ({
  title: String(value?.title || "The Story of Tales of the Tavern"),
  description: String(value?.description || "A chronological narrative treatment assembled from the Tavern Cookbook's existing canon."),
  chapters: Array.isArray(value?.chapters)
    ? value.chapters.map((chapter, index) => normalizeStoryJourneyChapter(chapter, `story-chapter-${index + 1}`))
    : [],
  updatedAt: String(value?.updatedAt || new Date().toISOString())
});
