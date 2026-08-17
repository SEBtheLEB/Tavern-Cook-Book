import type { StoryJourneyChapterRecord, StoryJourneyData, StoryJourneyPageRecord } from "../types";
import { normalizeStoryJourneyChapter, normalizeStoryJourneyData } from "../utils/storyJourneyData";
import { slugify } from "../utils/entries";
import { richTextToPlainText } from "../utils/richText";
import { markdownToRichText } from "./actOneNarrative";
import historySource from "./storySources/general-history-timeline.txt?raw";

type ParsedSection = {
  title: string;
  text: string;
};

type ParsedChapter = {
  title: string;
  introduction: string;
  sections: ParsedSection[];
};

const chapterIds = [
  "general-history-three-hundred-year-war",
  "general-history-tablemaker-and-end-of-war",
  "general-history-imperial-culinary-academy",
  "general-history-other-faiths"
];

export const GENERAL_HISTORY_OTHER_FAITHS_ID = chapterIds[3];
export const GENERAL_HISTORY_CHAPTER_IDS = new Set(chapterIds);
export const LEGACY_GENERAL_HISTORY_CHAPTER_IDS = new Set([
  "three-hundred-year-war",
  "tablemakers-arrival",
  "tohm-kyatts-obsession",
  "gwen-before-the-tavern",
  "when-tohm-met-gwen",
  "stolen-recipes"
]);

const timeline = [
  { start: "Before Year 333", end: "Year 333", startPercent: 8, endPercent: 30 },
  { start: "Year 330", end: "Year 333", startPercent: 24, endPercent: 34 },
  { start: "After Year 333", end: "Current Era", startPercent: 36, endPercent: 48 },
  { start: "Current Era", end: "Current Era", startPercent: 50, endPercent: 56 }
];

const chapterLore = [
  ["Ovenhold", "Faery Realm", "Human King", "Faery King", "The Tablemaker"],
  ["The Tablemaker", "Human King", "Faery King", "Triadic Faith", "The Everfeast", "Food Essence", "Ovenhold", "Faery Realm"],
  ["Imperial Culinary Academy of Ovenhold", "Ovenhold", "Faery Realm", "The Tablemaker", "Food Essence", "Triadic Faith"],
  ["Triadic Faith", "Ovenhold", "Faery Realm", "Masil Cult", "Eastern Human Kingdom", "Whiskin Folk", "Whiskin Village", "Whisker Woods", "Tom", "Gwen", "Elves", "Dwarves"]
];

function splitHeadingBlocks(source: string, headingPattern: RegExp) {
  const matches = Array.from(source.matchAll(headingPattern));
  return matches.map((match, index) => ({
    title: String(match[1] || "").trim(),
    text: source.slice((match.index || 0) + match[0].length, matches[index + 1]?.index ?? source.length).trim()
  }));
}

function parseHistorySource(source: string): ParsedChapter[] {
  return splitHeadingBlocks(source, /^##\s+(.+)$/gm).map((chapter) => {
    const chapterBody = chapter.text.replace(/\r?\n---\s*$/, "").trim();
    const sections = splitHeadingBlocks(chapterBody, /^###\s+(.+)$/gm);
    const firstSectionIndex = chapterBody.search(/^###\s+/m);
    return {
      title: chapter.title,
      introduction: (firstSectionIndex < 0 ? chapterBody : chapterBody.slice(0, firstSectionIndex)).trim(),
      sections
    };
  });
}

const parsedChapters = parseHistorySource(historySource);

function plainMarkdown(source: string) {
  return source.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1").trim();
}

function sourceRecords(labels: string[]) {
  return labels.map((label) => ({ type: "entry" as const, id: slugify(label), label }));
}

export const generalHistoryStoryChapters: StoryJourneyChapterRecord[] = parsedChapters.map((chapter, chapterIndex) => {
  const id = chapterIds[chapterIndex] || `general-history-${chapterIndex + 1}`;
  const relatedLore = chapterLore[chapterIndex] || [];
  const pages: StoryJourneyPageRecord[] = [
    ...(chapter.introduction ? [{
      id: `${id}-introduction`,
      title: chapter.title,
      text: markdownToRichText(chapter.introduction),
      relatedLore,
      threads: ["General History Timeline", ...relatedLore],
      sourceRecords: sourceRecords(relatedLore)
    }] : []),
    ...chapter.sections.map((section, sectionIndex) => ({
      id: `${id}-section-${sectionIndex + 1}`,
      title: section.title,
      text: markdownToRichText(section.text),
      relatedLore,
      threads: ["General History Timeline", ...relatedLore],
      sourceRecords: sourceRecords(relatedLore)
    }))
  ];
  const timing = timeline[chapterIndex] || timeline[timeline.length - 1];
  const subtitle = plainMarkdown(chapter.introduction.split(/\r?\n\r?\n/)[0] || chapter.title);
  return normalizeStoryJourneyChapter({
    id,
    title: chapter.title,
    subtitle,
    timelineStartLabel: timing.start,
    timelineEndLabel: timing.end,
    timelineStartPercent: timing.startPercent,
    timelineEndPercent: timing.endPercent,
    era: "General History Timeline",
    scope: "history",
    revealLevel: "Ancient History",
    shortDescription: subtitle,
    overviewText: markdownToRichText(chapter.introduction),
    relatedLore,
    threads: ["General History Timeline", ...relatedLore],
    sourceRecords: sourceRecords(relatedLore),
    pages
  }, id);
});

const otherFaithsChapter = generalHistoryStoryChapters.find((chapter) => chapter.id === GENERAL_HISTORY_OTHER_FAITHS_ID);

export const generalHistoryFaithTopics = (otherFaithsChapter?.pages.slice(1) || []).map((page) => ({
  id: `history-faith:${slugify(page.title)}`,
  title: page.title,
  summary: richTextToPlainText(page.text),
  fullText: page.text,
  tags: page.relatedLore
}));

export function replaceGeneralHistoryStoryJourney(current: StoryJourneyData): StoryJourneyData {
  const normalized = normalizeStoryJourneyData(current);
  if (!normalized.chapters.length) return normalized;
  const replacedIds = new Set([...LEGACY_GENERAL_HISTORY_CHAPTER_IDS, ...GENERAL_HISTORY_CHAPTER_IDS]);
  const firstHistoryIndex = normalized.chapters.findIndex((chapter) => replacedIds.has(chapter.id));
  const previousHistory = normalized.chapters.filter((chapter) => GENERAL_HISTORY_CHAPTER_IDS.has(chapter.id));
  const retained = normalized.chapters.filter((chapter) => !replacedIds.has(chapter.id));
  const replacements = generalHistoryStoryChapters.map((replacement) => {
    const existing = previousHistory.find((chapter) => chapter.id === replacement.id);
    if (!existing) return replacement;
    return normalizeStoryJourneyChapter({
      ...replacement,
      coverImageUrl: existing.coverImageUrl || replacement.coverImageUrl,
      coverImageFit: existing.coverImageFit || replacement.coverImageFit,
      pages: replacement.pages.map((page, pageIndex) => {
        const existingPage = existing.pages.find((candidate) => candidate.id === page.id || candidate.title === page.title)
          || existing.pages[pageIndex];
        return {
          ...page,
          imageUrl: existingPage?.imageUrl || page.imageUrl,
          imageFit: existingPage?.imageFit || page.imageFit
        };
      })
    }, replacement.id);
  });
  const insertAt = firstHistoryIndex < 0 ? 0 : Math.min(firstHistoryIndex, retained.length);
  retained.splice(insertAt, 0, ...replacements);
  return normalizeStoryJourneyData({
    ...normalized,
    chapters: retained,
    updatedAt: "2026-08-17T22:00:00.000Z"
  });
}
