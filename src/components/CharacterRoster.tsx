import type { LoreEntry } from "../types";
import type { AssignableModuleInfo } from "../utils/assignments";
import { imageFitToStyle } from "../utils/imageFit";
import { richTextToPlainText } from "../utils/richText";
import { AssignableModule } from "./AssignmentSystem";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";
import { useRealtimeCollaboration } from "./RealtimeCollaborationContext";

interface CharacterRosterProps {
  entries: LoreEntry[];
  readOnly?: boolean;
  onOpenEntry: (entry: LoreEntry) => void;
  onSaveEntry?: (entry: LoreEntry) => void;
  isFavorite?: (entry: LoreEntry) => boolean;
  onToggleFavorite?: (entry: LoreEntry) => void;
}

type CharacterImageSlot = "iconImage" | "mainImage" | "characterPortrait" | "characterHoverImage" | "ingameSpriteImage" | "dialogueSpriteImage";

export function CharacterRoster({ entries, onOpenEntry, isFavorite, onToggleFavorite }: CharacterRosterProps) {
  const realtime = useRealtimeCollaboration();
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
        const mainSlot: CharacterImageSlot = entry.media.characterPortrait ? "characterPortrait" : entry.media.mainImage ? "mainImage" : "iconImage";
        const mainImage = entry.media[mainSlot] || "";
        const hoverSlot: CharacterImageSlot =
          entry.media.characterHoverImage ? "characterHoverImage" :
          entry.media.dialogueSpriteImage ? "dialogueSpriteImage" :
          entry.media.ingameSpriteImage ? "ingameSpriteImage" :
          mainSlot;
        const hoverImage = entry.media[hoverSlot] || mainImage;
        const hideHoverText = entry.fields["Hide Character Hover Text"] === "true";
        const description = richTextToPlainText(
          entry.publicDescription || entry.summary || entry.internalLore || "Open this character to add a description."
        );
        const realtimeTarget = { type: "character" as const, id: entry.id, label: entry.title, module: "Characters" };
        const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);

        return (
          <AssignableModule
            key={entry.id}
            as="div"
            className="character-grid-assignable"
            module={characterTileAssignment(entry)}
          >
            <article
              className={`character-grid-tile realtime-hover-surface group ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => onOpenEntry(entry)}
              onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
              onMouseLeave={() => realtime.setHoverTarget(null)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onOpenEntry(entry);
              }}
            >
              {hoveringUsers.length > 0 && (
                <span className="realtime-hover-badge">
                  {hoveringUsers.length === 1 ? `${hoveringUsers[0].name} is here` : `${hoveringUsers.length} people here`}
                </span>
              )}
              {onToggleFavorite && (
                <FavoriteButton
                  active={Boolean(isFavorite?.(entry))}
                  label={entry.title}
                  onToggle={() => onToggleFavorite(entry)}
                  className="character-roster-favorite"
                />
              )}
              <div className="character-art-stage">
                {mainImage ? (
                  <>
                    <img
                      className="character-art character-art-base"
                      src={mainImage}
                      alt=""
                      style={imageFitToStyle(entry.media.imageFits?.[mainSlot])}
                    />
                    {hoverImage && (
                      <img
                        className="character-art character-art-hover"
                        src={hoverImage}
                        alt=""
                        style={imageFitToStyle(entry.media.imageFits?.[hoverSlot])}
                      />
                    )}
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
            </article>
          </AssignableModule>
        );
      })}
    </section>
  );
}

function characterTileAssignment(entry: LoreEntry): AssignableModuleInfo {
  return {
    moduleId: `${entry.id}-overview`,
    moduleTitle: `${entry.title} Character Page`,
    moduleType: "character-entry",
    entryId: entry.id,
    entryTitle: entry.title,
    entryCategory: `${entry.category} / ${entry.type}`,
    targetRoute: `character:${entry.id}:overview`
  };
}
