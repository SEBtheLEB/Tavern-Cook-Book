import type { LoreEntry } from "../types";
import { EntryCard } from "./EntryCard";

interface EntryGridProps {
  entries: LoreEntry[];
  emptyTitle?: string;
  emptyBody?: string;
  onOpenEntry: (entry: LoreEntry) => void;
}

export function EntryGrid({
  entries,
  emptyTitle = "No entries yet",
  emptyBody = "Use New Entry to add something here when you are ready.",
  onOpenEntry
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
        <EntryCard key={entry.id} entry={entry} onOpen={onOpenEntry} />
      ))}
    </div>
  );
}
