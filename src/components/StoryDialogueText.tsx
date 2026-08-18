import { useMemo } from "react";
import type { ImageFitSettings, LoreEntry, StoryJourneyDialogueSpriteSelection } from "../types";
import { imageFitToStyle } from "../utils/imageFit";
import { isRichText, plainTextToRichHtml, sanitizeRichHtml } from "../utils/richText";
import { DriveAwareImage } from "./DriveAwareImage";
import { Icon } from "./Icon";
import { RichLoreText } from "./RichText";

interface StoryDialogueTextProps {
  text: string;
  entries: LoreEntry[];
  relatedLore: string[];
  bubbleImageUrl?: string;
  bubbleImageFit?: ImageFitSettings;
  pageId: string;
  spriteOverrides?: Record<string, StoryJourneyDialogueSpriteSelection>;
  canEdit?: boolean;
  onEditSprite?: (target: StoryDialogueSpriteTarget) => void;
}

export interface StoryDialogueSpriteTarget {
  dialogueKey: string;
  dialogue: string;
  speaker: LoreEntry | null;
  speakerName: string;
}

interface StoryTextBlock {
  html: string;
  plain: string;
  dialogue: string;
  speaker: LoreEntry | null;
  speakerName: string;
}

interface SpeakerCandidate {
  entry: LoreEntry;
  aliases: string[];
}

export function StoryDialogueText({
  text,
  entries,
  relatedLore,
  bubbleImageUrl = "",
  bubbleImageFit,
  pageId,
  spriteOverrides = {},
  canEdit = false,
  onEditSprite
}: StoryDialogueTextProps) {
  const relatedLoreKey = relatedLore.join("\u0000");
  const blocks = useMemo(() => buildStoryTextBlocks(text, entries, relatedLore), [entries, relatedLoreKey, text]);

  if (!blocks.some((block) => block.dialogue)) return <RichLoreText text={text} />;

  return (
    <div className="story-dialogue-flow">
      {blocks.map((block, index) => {
        const dialogueKey = block.dialogue ? storyDialogueKey(pageId, block.dialogue, dialogueOccurrence(blocks, index)) : "";
        return block.dialogue ? (
          <StoryDialogueBubble
            key={dialogueKey}
            dialogueKey={dialogueKey}
            dialogue={block.dialogue}
            speaker={block.speaker}
            speakerName={block.speakerName}
            bubbleImageUrl={bubbleImageUrl}
            bubbleImageFit={bubbleImageFit}
            spriteSelection={spriteOverrides[dialogueKey]}
            canEdit={canEdit}
            onEditSprite={onEditSprite}
          />
        ) : (
          <RichLoreText key={`prose-${index}`} text={block.html} />
        );
      })}
    </div>
  );
}

function StoryDialogueBubble({
  dialogueKey,
  dialogue,
  speaker,
  speakerName,
  bubbleImageUrl,
  bubbleImageFit,
  spriteSelection,
  canEdit,
  onEditSprite
}: {
  dialogueKey: string;
  dialogue: string;
  speaker: LoreEntry | null;
  speakerName: string;
  bubbleImageUrl: string;
  bubbleImageFit?: ImageFitSettings;
  spriteSelection?: StoryJourneyDialogueSpriteSelection;
  canEdit: boolean;
  onEditSprite?: (target: StoryDialogueSpriteTarget) => void;
}) {
  const builtInBox = temporaryDialogueBoxForSpeaker(speakerName);
  const selectedFullBox = spriteSelection?.presentation === "full-box" || /\/story-dialogue\//.test(spriteSelection?.imageUrl || "");
  const fullBoxImage = selectedFullBox ? spriteSelection?.imageUrl || builtInBox : builtInBox;
  const fullBox = Boolean(fullBoxImage);
  const portrait = fullBox ? "" : spriteSelection?.imageUrl || speaker?.media.dialogueSpriteImage || "";
  const portraitFit = spriteSelection?.imageFit || speaker?.media.imageFits?.dialogueSpriteImage;
  const right = /\bgwen\b/i.test(speakerName);
  const hasCustomBubble = !fullBox && Boolean(bubbleImageUrl);

  return (
    <figure className={`story-dialogue-bubble ${right ? "speaker-right" : "speaker-left"} ${hasCustomBubble ? "has-custom-frame" : ""} ${fullBox ? "full-dialogue-box" : ""}`}>
      <div className="story-dialogue-frame">
        {fullBoxImage && (
          <div className="story-dialogue-full-box-art" aria-hidden="true">
            <DriveAwareImage src={fullBoxImage} alt="" draggable={false} />
          </div>
        )}
        {hasCustomBubble && (
          <div className="story-dialogue-frame-art" aria-hidden="true">
            <DriveAwareImage src={bubbleImageUrl} alt="" style={imageFitToStyle(bubbleImageFit)} draggable={false} />
          </div>
        )}
        <div className="story-dialogue-copy">
          <blockquote>{dialogue}</blockquote>
          <span aria-hidden="true" />
        </div>
        {!fullBox && <div className={`story-dialogue-portrait ${portrait ? "has-art" : "missing-art"}`} aria-label={`${speakerName} dialogue sprite`}>
          {portrait ? (
            <DriveAwareImage src={portrait} alt="" style={imageFitToStyle(portraitFit)} draggable={false} />
          ) : (
            <div data-story-narration-ignore>
              <Icon name="Image" className="h-6 w-6" />
              <small>Dialogue sprite</small>
            </div>
          )}
        </div>}
        {!fullBox && <figcaption>{speakerName}</figcaption>}
        {canEdit && onEditSprite && (
          <button
            type="button"
            className="story-dialogue-art-button"
            onClick={() => onEditSprite({ dialogueKey, dialogue, speaker, speakerName })}
            title={fullBox ? `Choose ${speakerName}'s dialogue emotion` : `Choose an existing dialogue sprite for ${speakerName}`}
            data-story-narration-ignore
          >
            <Icon name="Image" className="h-4 w-4" />
            {fullBox ? "Emotion" : "Choose Sprite"}
          </button>
        )}
      </div>
    </figure>
  );
}

function temporaryDialogueBoxForSpeaker(speakerName: string) {
  if (/\bgwen\b/i.test(speakerName)) return "/story-dialogue/gwen-neutral.png";
  if (/^\s*(?:tohm|thom|tom)(?:\s+kyatt)?\s*$/i.test(speakerName)) return "/story-dialogue/tohm-neutral.png";
  return "";
}

function dialogueOccurrence(blocks: StoryTextBlock[], index: number) {
  const dialogue = normalizeName(blocks[index]?.dialogue || "");
  return blocks.slice(0, index).filter((block) => normalizeName(block.dialogue) === dialogue).length;
}

function storyDialogueKey(pageId: string, dialogue: string, occurrence: number) {
  let hash = 5381;
  const value = `${normalizeName(dialogue)}:${occurrence}`;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return `${pageId}:dialogue:${(hash >>> 0).toString(36)}`;
}

function buildStoryTextBlocks(text: string, entries: LoreEntry[], relatedLore: string[]): StoryTextBlock[] {
  const rawBlocks = storyHtmlBlocks(text);
  const candidates = buildSpeakerCandidates(entries, relatedLore);
  const participants: SpeakerCandidate[] = [];
  let narrativeSpeaker: SpeakerCandidate | null = null;
  let previousSpeaker: SpeakerCandidate | null = null;

  return rawBlocks.map((block) => {
    const dialogue = standaloneDialogue(block.plain);
    if (!dialogue) {
      const mentioned = firstMentionedSpeaker(block.plain, candidates)
        || (/^(?:he|she|they)\b/i.test(block.plain) ? previousSpeaker : null);
      if (mentioned) {
        narrativeSpeaker = mentioned;
        rememberParticipant(participants, mentioned);
      }
      return { ...block, dialogue: "", speaker: null, speakerName: "" };
    }

    const distressSpeaker = /^(?:help|anyone)\b/i.test(dialogue)
      ? relatedSpeakerFallback(candidates, relatedLore, { exclude: ["gwen"] })
      : null;
    let selected = distressSpeaker || attributedSpeaker(block.plain, candidates) || narrativeSpeaker;
    let preventPreviousFallback = false;
    narrativeSpeaker = null;
    if (!selected && previousSpeaker && participants.length > 1) {
      const previousIndex = participants.findIndex((candidate) => candidate.entry.id === previousSpeaker?.entry.id);
      selected = participants[(previousIndex + 1) % participants.length] || null;
    }
    if (selected && dialogueRefersToSpeakerInThirdPerson(dialogue, selected)) {
      selected = participants.find((candidate) => candidate.entry.id !== selected?.entry.id) || null;
      preventPreviousFallback = !selected;
    }
    if (!selected && !preventPreviousFallback) selected = previousSpeaker || participants[0] || relatedSpeakerFallback(candidates, relatedLore);
    if (selected) {
      previousSpeaker = selected;
      rememberParticipant(participants, selected);
    }

    return {
      ...block,
      dialogue,
      speaker: selected?.entry || null,
      speakerName: selected?.entry.title || "Unknown Speaker"
    };
  });
}

function storyHtmlBlocks(text: string) {
  const source = isRichText(text) ? sanitizeRichHtml(text) : plainTextToRichHtml(text);
  if (typeof DOMParser === "undefined") {
    return source.split(/\n\s*\n/).filter(Boolean).map((plain) => ({ html: plainTextToRichHtml(plain), plain }));
  }
  const document = new DOMParser().parseFromString(`<div>${source}</div>`, "text/html");
  const root = document.body.firstElementChild;
  return Array.from(root?.children || []).map((element) => ({
    html: element.outerHTML,
    plain: (element.textContent || "").trim()
  })).filter((block) => block.plain);
}

function standaloneDialogue(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^[\u201c"]([\s\S]*?)[\u201d"]$/);
  if (match?.[1]?.trim()) return match[1].trim();
  if (!/^[\u201c"]/.test(normalized) || !/\b(?:said|asked|replied|answered|called|cried|yelled|shouted|screamed|whispered|muttered|snapped|added|continued|told|warned|insisted|explained)\b/i.test(normalized)) return "";

  const spoken: string[] = [];
  const quotePattern = /[\u201c"]([^\u201d"]+)[\u201d"]/g;
  let quote: RegExpExecArray | null;
  while ((quote = quotePattern.exec(normalized))) {
    const line = quote[1].trim();
    if (line) spoken.push(line);
  }
  return spoken.join(" ").replace(/,\s+([a-z])/g, ", $1").trim();
}

function buildSpeakerCandidates(entries: LoreEntry[], relatedLore: string[]): SpeakerCandidate[] {
  const related = new Set(relatedLore.map(normalizeName));
  return entries
    .filter((entry) => isCharacterEntry(entry) || related.has(normalizeName(entry.title)))
    .map((entry) => ({
      entry,
      aliases: speakerAliases(entry)
    }))
    .sort((left, right) => Math.max(...right.aliases.map((alias) => alias.length)) - Math.max(...left.aliases.map((alias) => alias.length)));
}

function isCharacterEntry(entry: LoreEntry) {
  return /character|cast|people/i.test(`${entry.category} ${entry.type}`) && !/culture|faction|race|religion/i.test(`${entry.category} ${entry.type}`);
}

function speakerAliases(entry: LoreEntry) {
  const aliases = [entry.title];
  const storedAliases = entry.fields.Aliases || entry.fields.aliases || entry.fields["Alternate Names"];
  if (Array.isArray(storedAliases)) aliases.push(...storedAliases.map(String));
  if (typeof storedAliases === "string") aliases.push(...storedAliases.split(/[,/]/));
  if (/tohm kyatt/i.test(entry.title)) aliases.push("Tohm", "Tom", "Tomcat");
  if (/princess lillia/i.test(entry.title)) aliases.push("Lillia", "Princess");
  if (/cedric(?:k)? the grunt/i.test(entry.title)) aliases.push("Cedric", "Cedrick");
  return Array.from(new Set(aliases.map((alias) => alias.trim()).filter((alias) => alias.length >= 2)));
}

function firstMentionedSpeaker(text: string, candidates: SpeakerCandidate[]) {
  let matchedCandidate: SpeakerCandidate | null = null;
  let matchedIndex = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate) => candidate.aliases.forEach((alias) => {
    const expression = new RegExp(`\\b${escapeRegExp(alias)}(?:'s)?\\b`, "gi");
    const result = expression.exec(text);
    if (result && result.index < matchedIndex) {
      matchedCandidate = candidate;
      matchedIndex = result.index;
    }
  }));
  return matchedCandidate;
}

function attributedSpeaker(text: string, candidates: SpeakerCandidate[]) {
  const speechVerb = "said|asked|replied|answered|called|cried|yelled|shouted|screamed|whispered|muttered|snapped|added|continued|told|warned|insisted|explained";
  for (const candidate of candidates) {
    for (const alias of candidate.aliases) {
      const name = escapeRegExp(alias);
      if (new RegExp(`\\b${name}\\b[^.!?]{0,42}\\b(?:${speechVerb})\\b|\\b(?:${speechVerb})\\b[^.!?]{0,42}\\b${name}\\b`, "i").test(text)) {
        return candidate;
      }
    }
  }
  return null;
}

function relatedSpeakerFallback(
  candidates: SpeakerCandidate[],
  relatedLore: string[],
  options: { exclude?: string[] } = {}
) {
  const excluded = new Set((options.exclude || []).map(normalizeName));
  for (const term of relatedLore) {
    const normalized = normalizeName(term);
    const candidate = candidates.find((item) => item.aliases.some((alias) => normalizeName(alias) === normalized));
    if (candidate && !candidate.aliases.some((alias) => excluded.has(normalizeName(alias)))) return candidate;
  }
  return null;
}

function dialogueRefersToSpeakerInThirdPerson(dialogue: string, speaker: SpeakerCandidate) {
  if (/\b(?:i|i'm|i've|me|my|mine)\b/i.test(dialogue)) return false;
  if (/^there (?:she|he|they)\b/i.test(dialogue)) return true;
  return speaker.aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(dialogue));
}

function rememberParticipant(participants: SpeakerCandidate[], candidate: SpeakerCandidate) {
  if (participants.some((item) => item.entry.id === candidate.entry.id)) return;
  participants.push(candidate);
  if (participants.length > 3) participants.shift();
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
