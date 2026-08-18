import { useEffect, useMemo, useState } from "react";
import type { ImageFitSettings, LoreEntry, StoryJourneyDialogueSpriteSelection } from "../types";
import { imageFitToStyle, resolveImageSourceUrl } from "../utils/imageFit";
import { DriveAwareImage } from "./DriveAwareImage";
import { Icon } from "./Icon";

export interface DialogueSpriteOption extends StoryJourneyDialogueSpriteSelection {
  label: string;
  ownerName: string;
}

interface DialogueSpritePickerModalProps {
  speakerName: string;
  speakerEntryId?: string;
  dialogue: string;
  currentSelection?: StoryJourneyDialogueSpriteSelection;
  options: DialogueSpriteOption[];
  onApply: (selection: DialogueSpriteOption | null) => void;
  onClose: () => void;
}

export function DialogueSpritePickerModal({
  speakerName,
  speakerEntryId,
  dialogue,
  currentSelection,
  options,
  onApply,
  onClose
}: DialogueSpritePickerModalProps) {
  const wholeBoxMode = options.length > 0 && options.every((option) => option.presentation === "full-box");
  const neutralOption = options.find((option) => /neutral/i.test(option.label)) || options[0] || null;
  const [query, setQuery] = useState("");
  const [speakerOnly, setSpeakerOnly] = useState(Boolean(speakerEntryId));
  const [selectedAssetId, setSelectedAssetId] = useState(currentSelection?.assetId || neutralOption?.assetId || "");
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options.filter((option) => {
      if (speakerOnly && speakerEntryId && option.sourceEntryId !== speakerEntryId) return false;
      return !normalizedQuery || `${option.ownerName} ${option.label}`.toLowerCase().includes(normalizedQuery);
    });
  }, [options, query, speakerEntryId, speakerOnly]);
  const selected = options.find((option) => option.assetId === selectedAssetId) || null;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="dialogue-sprite-picker-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`dialogue-sprite-picker ${wholeBoxMode ? "whole-box-mode" : ""}`} role="dialog" aria-modal="true" aria-labelledby="dialogue-sprite-picker-title">
        <header>
          <div>
            <span>{wholeBoxMode ? "Dialogue emotion" : "Dialogue art"}</span>
            <h2 id="dialogue-sprite-picker-title">Choose {speakerName}'s {wholeBoxMode ? "Emotion" : "Sprite"}</h2>
            <p>{wholeBoxMode
              ? "Choose an emotion to replace this line's complete dialogue-box PNG."
              : "Only Dialogue Sprites already posted in the Tavern Cookbook are available here."}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close sprite picker">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <blockquote>{dialogue}</blockquote>

        {!wholeBoxMode && <div className="dialogue-sprite-picker-tools">
          <label>
            <Icon name="Search" className="h-4 w-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dialogue sprites" autoFocus />
          </label>
          <div className="dialogue-sprite-picker-scope" role="group" aria-label="Sprite owner filter">
            <button type="button" className={speakerOnly ? "active" : ""} onClick={() => setSpeakerOnly(true)} disabled={!speakerEntryId}>
              {speakerName}
            </button>
            <button type="button" className={!speakerOnly ? "active" : ""} onClick={() => setSpeakerOnly(false)}>
              All Sprites
            </button>
          </div>
        </div>}

        <div className="dialogue-sprite-picker-grid">
          {visibleOptions.map((option) => (
            <button
              type="button"
              key={option.assetId}
              className={selectedAssetId === option.assetId ? "selected" : ""}
              onClick={() => {
                setSelectedAssetId(option.assetId);
                if (wholeBoxMode) onApply(option);
              }}
            >
              <span className="dialogue-sprite-picker-preview">
                <DriveAwareImage src={option.imageUrl} alt="" style={imageFitToStyle(option.imageFit)} draggable={false} />
                {selectedAssetId === option.assetId && <Icon name="CircleCheck" className="h-5 w-5" />}
              </span>
              <strong>{option.label}</strong>
              <small>{option.ownerName}</small>
            </button>
          ))}
          {!visibleOptions.length && (
            <div className="dialogue-sprite-picker-empty">
              <Icon name="Image" className="h-7 w-7" />
              <strong>No matching Dialogue Sprites</strong>
              <p>Add the art to a character's Dialogue Sprite slot in the Art Binder, then return here.</p>
            </div>
          )}
        </div>

        <footer>
          <button type="button" onClick={() => wholeBoxMode && neutralOption ? onApply(neutralOption) : onApply(null)}>
            {wholeBoxMode ? "Use Neutral" : "Use Character Default"}
          </button>
          <span />
          <button type="button" onClick={onClose}>Cancel</button>
          {!wholeBoxMode && <button type="button" className="primary" onClick={() => selected && onApply(selected)} disabled={!selected}>
            <Icon name="CircleCheck" className="h-4 w-4" /> Apply Sprite
          </button>}
        </footer>
      </section>
    </div>
  );
}

export function collectDialogueSpriteOptions(entries: LoreEntry[]): DialogueSpriteOption[] {
  const options: DialogueSpriteOption[] = temporaryDialogueBoxOptions(entries);
  const seen = new Set<string>();
  const add = (entry: LoreEntry, assetId: string, label: string, imageUrl: string, imageFit?: ImageFitSettings) => {
    const resolvedUrl = resolveImageSourceUrl(imageUrl) || imageUrl;
    if (!resolvedUrl || seen.has(`${entry.id}:${resolvedUrl}`)) return;
    seen.add(`${entry.id}:${resolvedUrl}`);
    options.push({ assetId, label, ownerName: entry.title, imageUrl: resolvedUrl, imageFit, sourceEntryId: entry.id });
  };

  entries.forEach((entry) => {
    if (entry.media.dialogueSpriteImage) {
      add(entry, `${entry.id}:media:dialogue-sprite`, "Default Dialogue Sprite", entry.media.dialogueSpriteImage, entry.media.imageFits?.dialogueSpriteImage);
    }
    entry.artGallery.forEach((image) => {
      if (!/dialogue|conversation|talking portrait/i.test(`${image.category} ${image.title} ${image.notes}`)) return;
      add(entry, `${entry.id}:gallery:${image.id}`, image.title || "Dialogue Sprite", image.thumbnailUrl || image.webViewLink, image.imageFit);
    });
    entry.artVault.sections.forEach((section) => section.slots.forEach((slot) => {
      const image = slot.image;
      if (!image || !/dialogue|conversation|talking portrait/i.test(`${section.title} ${section.description} ${slot.label} ${slot.requirementType} ${image.title} ${image.category}`)) return;
      add(entry, `${entry.id}:vault:${image.id || slot.id}`, slot.label || image.title || "Dialogue Sprite", image.thumbnailUrl || image.downloadUrl || image.webViewLink, image.imageFit);
    }));
  });

  const emotionOrder = new Map(["Neutral", "Angry", "Disgusted", "Laughing", "Surprised"].map((label, index) => [label, index]));
  return options.sort((left, right) => (
    left.ownerName.localeCompare(right.ownerName)
    || (emotionOrder.get(left.label) ?? 99) - (emotionOrder.get(right.label) ?? 99)
    || left.label.localeCompare(right.label)
  ));
}

function temporaryDialogueBoxOptions(entries: LoreEntry[]): DialogueSpriteOption[] {
  const gwen = entries.find((entry) => /^gwen\b/i.test(entry.title));
  const tohm = entries.find((entry) => /^(?:tohm|thom|tom)(?:\s+kyatt)?$/i.test(entry.title));
  const option = (ownerName: string, sourceEntryId: string | undefined, emotion: string, fileName: string): DialogueSpriteOption => ({
    assetId: `temporary-dialogue-box:${ownerName.toLowerCase().replace(/\s+/g, "-")}:${emotion.toLowerCase()}`,
    label: emotion,
    ownerName,
    imageUrl: `/story-dialogue/${fileName}`,
    sourceEntryId,
    presentation: "full-box"
  });
  return [
    option("Gwen", gwen?.id, "Neutral", "gwen-neutral.png"),
    option("Gwen", gwen?.id, "Angry", "gwen-angry.png"),
    option("Gwen", gwen?.id, "Disgusted", "gwen-disgusted.png"),
    option("Gwen", gwen?.id, "Laughing", "gwen-laughing.png"),
    option("Gwen", gwen?.id, "Surprised", "gwen-surprised.png"),
    option("Tohm Kyatt", tohm?.id, "Neutral", "tohm-neutral.png")
  ];
}
