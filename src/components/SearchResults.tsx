import type { LoreEntry } from "../types";
import { EntryGrid } from "./EntryGrid";
import { Icon } from "./Icon";

interface SearchResultsProps {
  query: string;
  referenceQuery?: string;
  results: LoreEntry[];
  onClear: () => void;
  onOpenEntry: (entry: LoreEntry) => void;
}

export function SearchResults({
  query,
  referenceQuery,
  results,
  onClear,
  onOpenEntry
}: SearchResultsProps) {
  const isReferencePage = Boolean(referenceQuery);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <section className="category-header-frame flex flex-col gap-4 rounded p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted-ink)" }}>
            {results.length} matches
          </p>
          <h2 className="font-display text-4xl">
            {isReferencePage ? `References for "${referenceQuery}"` : `Search Results for "${query}"`}
          </h2>
        </div>
        <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={onClear}>
          <Icon name="X" className="h-4 w-4" />
          Clear Search
        </button>
      </section>

      <EntryGrid
        entries={results}
        emptyTitle="No results found"
        emptyBody="Try a character, location, recipe, secret, status, tag, or note."
        onOpenEntry={onOpenEntry}
      />
    </div>
  );
}
