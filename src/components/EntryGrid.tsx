import type { AppMode, LoreEntry } from "../types";
import { EntryCard } from "./EntryCard";

interface EntryGridProps {
  entries: LoreEntry[];
  mode: AppMode;
  emptyTitle?: string;
  emptyBody?: string;
  onOpenEntry: (entry: LoreEntry) => void;
  onUpdateEntry: (entry: LoreEntry) => void;
}

export function EntryGrid({
  entries,
  mode,
  emptyTitle = "No entries yet",
  emptyBody = "Switch to Edit Mode and add a new entry when you are ready.",
  onOpenEntry,
  onUpdateEntry
}: EntryGridProps) {
  if (!entries.length) {
    return (
      <div className="soft-panel rounded p-8 text-center">
        <h3 className="font-display text-2xl">{emptyTitle}</h3>
        <p className="mt-2" style={{ color: "var(--muted-ink)" }}>
          {emptyBody}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} mode={mode} onOpen={onOpenEntry} onUpdate={onUpdateEntry} />
      ))}
    </div>
  );
}
