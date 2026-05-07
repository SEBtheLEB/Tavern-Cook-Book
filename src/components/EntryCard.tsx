import type { LoreEntry } from "../types";
import { richTextToPlainText } from "../utils/richText";
import { Icon } from "./Icon";

interface EntryCardProps {
  entry: LoreEntry;
  onOpen: (entry: LoreEntry) => void;
}

const statusTone: Record<string, string> = {
  Canon: "border-emerald-500/50 bg-emerald-500/10",
  "Soft Canon": "border-teal-500/50 bg-teal-500/10",
  Idea: "border-amber-500/50 bg-amber-500/10",
  "Needs Rewrite": "border-rose-500/50 bg-rose-500/10",
  Scrapped: "border-zinc-500/50 bg-zinc-500/10",
  "Old Version": "border-purple-500/50 bg-purple-500/10",
  "Playtest Scope": "border-sky-500/50 bg-sky-500/10"
};

export function EntryCard({ entry, onOpen }: EntryCardProps) {
  const iconImage = entry.media.iconImage || entry.media.mainImage;
  const summary = richTextToPlainText(entry.summary || entry.internalLore || "No summary yet.");

  return (
    <article
      role="button"
      tabIndex={0}
      className="lore-card-frame group flex h-full min-h-[230px] flex-col rounded p-4 text-left transition hover:-translate-y-0.5 hover:shadow-glow"
      onClick={() => onOpen(entry)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(entry);
      }}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
          {iconImage ? (
            <img src={iconImage} alt="" className="h-full w-full object-cover" />
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
