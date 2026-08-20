import type { StoryJourneyChapterRecord, StoryJourneyGuidePageRecord } from "../types";
import source from "./storySources/maseel-cult-leader.txt?raw";

export const MASEEL_CULT_LEADER_NARRATIVE_MIGRATION_ID = "story-guide-maseel-cult-leader-narrative-v1";
export const MASEEL_CULT_LEADER_PROFILE_LINK_MIGRATION_ID = "story-guide-maseel-cult-leader-profile-link-v2";
export const MASEEL_CULT_LEADER_NARRATIVE_PAGE_ID = "maseel-cult-leader-narrative";

const title = source.match(/^#\s+(.+)$/m)?.[1]?.trim() || "The Merchant Beneath the Earth";
const subtitle = source.match(/^##\s+(.+)$/m)?.[1]?.trim() || "The Origin of the Masil Cult";
const chapterMatches = Array.from(source.matchAll(/^###\s+Chapter\s+([IVXLCDM]+):\s+(.+)$/gm));

const markdownToRichText = (value: string) => value
  .trim()
  .split(/\r?\n\r?\n/)
  .map((block) => `<p>${block.trim()
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/\r?\n/g, "<br>")}</p>`)
  .join("");

const chapters = chapterMatches.map((match, index) => {
  const chapterNumber = match[1];
  const chapterTitle = match[2].trim();
  const bodyStart = (match.index || 0) + match[0].length;
  const bodyEnd = chapterMatches[index + 1]?.index ?? source.length;
  const text = source.slice(bodyStart, bodyEnd).trim();
  const id = `maseel-cult-leader-chapter-${chapterNumber.toLowerCase()}`;

  return {
    id,
    title: chapterTitle,
    subtitle: "",
    timelineStartLabel: `Chapter ${chapterNumber}`,
    timelineEndLabel: `Chapter ${chapterNumber}`,
    timelineStartPercent: (index / chapterMatches.length) * 100,
    timelineEndPercent: ((index + 1) / chapterMatches.length) * 100,
    era: "The Origin of the Masil Cult",
    scope: "history",
    revealLevel: "Hidden Truth",
    shortDescription: "",
    overviewText: "",
    relatedLore: ["Mas'eel Cult Leader", "Masil Cult", "FEAST", "The Triad", "The Tablemaker", "Ovenhold"],
    pages: [{
      id: `${id}-narrative`,
      title: chapterTitle,
      text: markdownToRichText(text),
      relatedLore: ["Mas'eel Cult Leader", "Masil Cult", "FEAST", "The Triad", "The Tablemaker", "Ovenhold"]
    }]
  } satisfies StoryJourneyChapterRecord;
});

export const MASEEL_CULT_LEADER_NARRATIVE_PAGE: StoryJourneyGuidePageRecord = {
  id: MASEEL_CULT_LEADER_NARRATIVE_PAGE_ID,
  pageType: "narrative",
  linkedEntryId: "masil-cult-leader",
  title: "Mas'eel Cult Leader",
  eyebrow: "People Narrative",
  summary: subtitle,
  fullText: chapters.flatMap((chapter) => chapter.pages.map((page) => page.text)).join(""),
  tags: ["Mas'eel Cult", "Masil Cult", "Cult Leader", "FEAST", "Hidden Truth"],
  narrative: {
    title,
    subtitle,
    eyebrow: "People Narrative",
    chapters
  },
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z"
};
