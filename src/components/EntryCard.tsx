import type { ImageFitSettings, LoreEntry } from "../types";
import { nowIso } from "../utils/entries";
import { normalizeImageFit } from "../utils/imageFit";
import { richTextToPlainText } from "../utils/richText";
import { AdjustableImage } from "./AdjustableImage";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";
import { useRealtimeCollaboration } from "./RealtimeCollaborationContext";

interface EntryCardProps {
  entry: LoreEntry;
  readOnly?: boolean;
  onOpen: (entry: LoreEntry) => void;
  onSaveEntry?: (entry: LoreEntry) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (entry: LoreEntry) => void;
}

type EntryImageSlot = "iconImage" | "mainImage" | "characterPortrait" | "characterHoverImage" | "ingameSpriteImage" | "dialogueSpriteImage";

const statusTone: Record<string, string> = {
  Canon: "border-emerald-500/50 bg-emerald-500/10",
  "Soft Canon": "border-teal-500/50 bg-teal-500/10",
  Idea: "border-amber-500/50 bg-amber-500/10",
  "Needs Rewrite": "border-rose-500/50 bg-rose-500/10",
  Scrapped: "border-zinc-500/50 bg-zinc-500/10",
  "Old Version": "border-purple-500/50 bg-purple-500/10",
  "Playtest Scope": "border-sky-500/50 bg-sky-500/10"
};

export function EntryCard({ entry, readOnly = false, onOpen, onSaveEntry, isFavorite = false, onToggleFavorite }: EntryCardProps) {
  const iconSlot = entry.media.iconImage ? "iconImage" : "mainImage";
  const iconImage = entry.media[iconSlot];
  const summary = richTextToPlainText(entry.summary || entry.internalLore || "No summary yet.");
  const realtime = useRealtimeCollaboration();
  const realtimeTarget = { type: "entry" as const, id: entry.id, label: entry.title, module: entry.category };
  const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);
  const saveImageFit = (slot: EntryImageSlot, next: { imageUrl: string; imageFit: ImageFitSettings }) => {
    if (!onSaveEntry) return;
    onSaveEntry({
      ...entry,
      media: {
        ...entry.media,
        [slot]: next.imageUrl,
        imageFits: {
          ...(entry.media.imageFits || {}),
          [slot]: normalizeImageFit(next.imageFit)
        }
      },
      updatedAt: nowIso()
    });
  };

  return (
    <article
      role="button"
      tabIndex={0}
      className={`lore-card-frame realtime-hover-surface group flex h-full min-h-[230px] flex-col rounded p-4 text-left transition hover:-translate-y-0.5 hover:shadow-glow ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
      onClick={() => onOpen(entry)}
      onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
      onMouseLeave={() => realtime.setHoverTarget(null)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(entry);
      }}
    >
      {hoveringUsers.length > 0 && <RealtimeHoverBadge users={hoveringUsers.map((user) => user.name)} />}
      <div className="flex items-start gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
          {iconImage ? (
            <AdjustableImage
              src={iconImage}
              label={`${entry.title} card image`}
              imageFit={entry.media.imageFits?.[iconSlot]}
              aspectRatio="1 / 1"
              imageClassName="h-full w-full"
              canAdjust={!readOnly && Boolean(onSaveEntry)}
              onSave={(next) => saveImageFit(iconSlot, next)}
            />
          ) : (
            <Icon name="BookOpen" className="h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs ${statusTone[entry.status] || statusTone.Idea}`}>
              {entry.status}
            </span>
            <span className="rounded border px-2 py-0.5 text-xs" style={{ borderColor: "var(--card-border)", color: "var(--muted-ink)" }}>
              {entry.spoilerLevel}
            </span>
          </div>
          <h3 className="mt-3 line-clamp-2 font-display text-xl leading-6">{entry.title}</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-ink)" }}>
            {entry.category} / {entry.type}
          </p>
        </div>
        {onToggleFavorite && (
          <FavoriteButton
            active={isFavorite}
            label={entry.title}
            onToggle={() => onToggleFavorite(entry)}
            className="shrink-0"
          />
        )}
      </div>

      <p className="mt-4 line-clamp-4 text-sm leading-6">{summary}</p>

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded border px-2 py-0.5 text-xs"
              style={{ borderColor: "var(--card-border)", color: "var(--muted-ink)" }}
            >
              {tag}
            </span>
          ))}
          {entry.tags.length > 5 && (
            <span className="text-xs" style={{ color: "var(--muted-ink)" }}>
              +{entry.tags.length - 5}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function RealtimeHoverBadge({ users }: { users: string[] }) {
  return (
    <span className="realtime-hover-badge">
      {users.length === 1 ? `${users[0]} is here` : `${users.length} people here`}
    </span>
  );
}
