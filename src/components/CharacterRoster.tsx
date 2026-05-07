import type { LoreEntry } from "../types";
import { richTextToPlainText } from "../utils/richText";
import { Icon } from "./Icon";

interface CharacterRosterProps {
  entries: LoreEntry[];
  onOpenEntry: (entry: LoreEntry) => void;
}

export function CharacterRoster({ entries, onOpenEntry }: CharacterRosterProps) {
  if (!entries.length) {
    return (
      <div className="soft-panel rounded p-8 text-center">
        <h3 className="font-display text-2xl">No characters yet</h3>
        <p className="mt-2" style={{ color: "var(--muted-ink)" }}>
          Use New Entry to add a character when you are ready.
        </p>
      </div>
    );
  }

  return (
    <section className="character-grid-roster">
      {entries.map((entry) => {
        const mainImage = entry.media.characterPortrait || entry.media.mainImage || entry.media.iconImage;
        const hoverImage =
          entry.media.characterHoverImage ||
          entry.media.dialogueSpriteImage ||
          entry.media.ingameSpriteImage ||
          mainImage;
        const hideHoverText = entry.fields["Hide Character Hover Text"] === "true";
        const description = richTextToPlainText(
          entry.publicDescription || entry.summary || entry.internalLore || "Open this character to add a description."
        );

        return (
          <button key={entry.id} className="character-grid-tile group" onClick={() => onOpenEntry(entry)}>
            <div className="character-art-stage" aria-hidden="true">
              {mainImage ? (
                <>
                  <img className="character-art character-art-base" src={mainImage} alt="" />
                  {hoverImage && <img className="character-art character-art-hover" src={hoverImage} alt="" />}
                </>
              ) : (
                <div className="character-art-placeholder">
                  <Icon name="UserRound" className="h-14 w-14" />
                </div>
              )}
            </div>

            <div className="character-name-plate">
              <h3 className="font-display text-2xl leading-tight">{entry.title}</h3>
            </div>

            {!hideHoverText && (
              <div className="character-hover-copy">
                <p className="text-xs uppercase" style={{ color: "var(--gold)" }}>
                  {entry.status} / {entry.spoilerLevel}
                </p>
                <p className="mt-2 line-clamp-4 text-sm leading-6" style={{ color: "var(--muted-ink)" }}>
                  {description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--card-border)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </button>
        );
      })}
    </section>
  );
}
