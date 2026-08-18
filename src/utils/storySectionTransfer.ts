import type { StoryJourneyCallout, StoryJourneyPageRecord } from "../types";
import { escapeHtml, isRichText, richTextToPlainText, sanitizeRichHtml } from "./richText";

export interface ParsedStorySection {
  title: string;
  text: string;
  detailedText?: string;
  callouts: StoryJourneyCallout[];
  replacedCalloutKinds: StoryJourneyCallout["kind"][];
  hasDetailedText: boolean;
}

const calloutHeadings: Array<{
  labels: string[];
  kind: StoryJourneyCallout["kind"];
  label: string;
}> = [
  { labels: ["player knowledge"], kind: "playerKnowledge", label: "Player knowledge" },
  { labels: ["story consequence", "consequence"], kind: "consequence", label: "Story consequence" },
  { labels: ["important revelation", "revelation", "hidden context"], kind: "revelation", label: "Important revelation" },
  { labels: ["canon gap", "needs story information"], kind: "canonGap", label: "Canon gap" },
  { labels: ["character introduced", "character"], kind: "character", label: "Character introduced" },
  { labels: ["location"], kind: "location", label: "Location" }
];

const detailedHeadings = new Set(["detailed reading", "detailed text", "detailed version"]);

export function exportStorySectionForChatGpt(
  page: StoryJourneyPageRecord,
  displayedCallouts: StoryJourneyCallout[] = page.callouts || []
) {
  const blocks = [`-- ${page.title.trim() || "Untitled Section"} --`, richHtmlToTransferText(page.text)];

  if (page.detailedText?.trim()) {
    blocks.push("-- Detailed Reading --", richHtmlToTransferText(page.detailedText));
  }

  displayedCallouts.forEach((callout) => {
    blocks.push(`-- ${callout.label} --`, richTextToPlainText(callout.text));
  });

  return blocks.filter((block) => block.trim()).join("\n\n");
}

export function parseStorySectionTransfer(value: string, fallbackTitle = "Untitled Section"): ParsedStorySection {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  let title = fallbackTitle;
  let titleFound = false;
  let activeSection: "story" | "detailed" | StoryJourneyCallout["kind"] = "story";
  const storyLines: string[] = [];
  const detailedLines: string[] = [];
  const calloutLines = new Map<StoryJourneyCallout["kind"], string[]>();
  const calloutLabels = new Map<StoryJourneyCallout["kind"], string>();

  lines.forEach((line) => {
    const heading = parseTransferHeading(line);
    if (!heading) {
      targetLines(activeSection, storyLines, detailedLines, calloutLines).push(line);
      return;
    }

    const normalized = normalizeHeading(heading.text);
    const callout = calloutHeadings.find((candidate) => candidate.labels.includes(normalized));
    if (callout) {
      activeSection = callout.kind;
      calloutLabels.set(callout.kind, callout.label);
      if (!calloutLines.has(callout.kind)) calloutLines.set(callout.kind, []);
      return;
    }

    if (detailedHeadings.has(normalized)) {
      activeSection = "detailed";
      return;
    }

    if (!titleFound && !hasMeaningfulContent(storyLines, detailedLines, calloutLines)) {
      title = heading.text.trim() || fallbackTitle;
      titleFound = true;
      activeSection = "story";
      return;
    }

    targetLines(activeSection, storyLines, detailedLines, calloutLines).push(`${"#".repeat(Math.max(2, heading.level))} ${heading.text}`);
  });

  const callouts = Array.from(calloutLines.entries())
    .map(([kind, content], index) => ({
      id: `imported-${kind}-${index + 1}`,
      kind,
      label: calloutLabels.get(kind) || calloutHeadings.find((item) => item.kind === kind)?.label || "Story note",
      text: markdownToPlainText(content.join("\n"))
    }))
    .filter((callout) => callout.text.trim());

  const detailedSource = trimBlankLines(detailedLines).join("\n");
  return {
    title,
    text: markdownToRichHtml(trimBlankLines(storyLines).join("\n")),
    detailedText: detailedSource.trim() ? markdownToRichHtml(detailedSource) : undefined,
    callouts,
    replacedCalloutKinds: Array.from(calloutLines.keys()),
    hasDetailedText: detailedHeadings.size > 0 && detailedLines.some((line) => line.trim())
  };
}

function targetLines(
  section: "story" | "detailed" | StoryJourneyCallout["kind"],
  story: string[],
  detailed: string[],
  callouts: Map<StoryJourneyCallout["kind"], string[]>
) {
  if (section === "story") return story;
  if (section === "detailed") return detailed;
  const lines = callouts.get(section) || [];
  callouts.set(section, lines);
  return lines;
}

function parseTransferHeading(line: string) {
  const marker = line.trim().match(/^--\s*(.+?)\s*--$/);
  if (marker) return { level: 2, text: marker[1].trim() };
  const markdown = line.trim().match(/^(#{1,4})\s+(.+?)\s*#*$/);
  if (markdown) return { level: markdown[1].length, text: markdown[2].trim() };
  return null;
}

function normalizeHeading(value: string) {
  return value.toLowerCase().replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
}

function hasMeaningfulContent(story: string[], detailed: string[], callouts: Map<StoryJourneyCallout["kind"], string[]>) {
  return [...story, ...detailed, ...Array.from(callouts.values()).flat()].some((line) => line.trim());
}

function trimBlankLines(lines: string[]) {
  const copy = [...lines];
  while (copy.length && !copy[0].trim()) copy.shift();
  while (copy.length && !copy[copy.length - 1].trim()) copy.pop();
  return copy;
}

function markdownToRichHtml(value: string) {
  if (!value.trim()) return "";
  const lines = value.split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listType || !listItems.length) return;
    blocks.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  lines.forEach((line) => {
    const heading = line.trim().match(/^(#{2,4})\s+(.+)$/);
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(4, Math.max(2, heading[1].length));
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unordered?.[1] || ordered?.[1] || "").trim());
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  });

  flushParagraph();
  flushList();
  return sanitizeRichHtml(blocks.join(""));
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_\n]+?)_/g, "$1<em>$2</em>");
}

function markdownToPlainText(value: string) {
  return value
    .replace(/^\s*#{1,4}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*([^*]+?)\*/g, "$1")
    .replace(/_([^_]+?)_/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function richHtmlToTransferText(value: string) {
  if (!value.trim()) return "";
  if (!isRichText(value) || typeof DOMParser === "undefined") return richTextToPlainText(value);

  const document = new DOMParser().parseFromString(`<div>${value}</div>`, "text/html");
  const root = document.body.firstElementChild;
  if (!root) return richTextToPlainText(value);

  return Array.from(root.childNodes)
    .map((node) => transferNode(node, 0))
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function transferNode(node: ChildNode, listIndex: number): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map((child, index) => transferNode(child, index)).join("");

  if (tag === "strong" || tag === "b") return `**${children}**`;
  if (tag === "em" || tag === "i") return `*${children}*`;
  if (tag === "h2" || tag === "h3" || tag === "h4") return `${"#".repeat(Number(tag[1]))} ${children.trim()}\n\n`;
  if (tag === "p" || tag === "div") return `${children.trim()}\n\n`;
  if (tag === "br") return "\n";
  if (tag === "li") return `${element.parentElement?.tagName.toLowerCase() === "ol" ? `${listIndex + 1}.` : "-"} ${children.trim()}\n`;
  if (tag === "ul" || tag === "ol") return `${children}\n`;
  return children;
}
