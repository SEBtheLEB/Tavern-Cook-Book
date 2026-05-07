import type { AppMode, LoreEntry } from "../types";
import { isSupportedImage, readFileAsDataUrl } from "../utils/media";
import { Icon } from "./Icon";

interface EntryCardProps {
  entry: LoreEntry;
  mode: AppMode;
  onOpen: (entry: LoreEntry) => void;
  onUpdate: (entry: LoreEntry) => void;
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

export function EntryCard({ entry, mode, onOpen, onUpdate }: EntryCardProps) {
  const iconImage = entry.media.iconImage || entry.media.mainImage;

  const uploadIcon = async (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      alert("Please choose a PNG, JPG, JPEG, WEBP, or GIF image.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    onUpdate({
      ...entry,
      media: { ...entry.media, iconImage: dataUrl },
      updatedAt: new Date().toISOString()
    });
  };

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
        <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
          {iconImage ? (
            <img src={iconImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="BookOpen" className="h-7 w-7" />
          )}
          {mode === "edit" && (
            <label
              className="absolute inset-x-1 bottom-1 cursor-pointer rounded bg-black/65 px-1 py-0.5 text-center text-[10px] text-white opacity-0 transition group-hover:opacity-100"
              onClick={(event) => event.stopPropagation()}
            >
              Replace
              <input
                className="hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => uploadIcon(event.target.files?.[0])}
              />
            </label>
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

      <p className="mt-4 line-clamp-4 text-sm leading-6">{entry.summary || entry.internalLore || "No summary yet."}</p>

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
