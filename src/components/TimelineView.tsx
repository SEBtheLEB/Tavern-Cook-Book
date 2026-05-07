import { useState } from "react";
import type { LoreEntry } from "../types";
import { richTextToPlainText } from "../utils/richText";
import { EntryGrid } from "./EntryGrid";

interface TimelineViewProps {
  entries: LoreEntry[];
  onOpenEntry: (entry: LoreEntry) => void;
}

const timelineModes = [
  ["trueTimeline", "True Timeline"],
  ["playerTimeline", "Player Timeline"],
  ["questTimeline", "Quest Timeline"],
  ["emotionalTimeline", "Emotional Timeline"]
] as const;

export function TimelineView({ entries, onOpenEntry }: TimelineViewProps) {
  const [timelineMode, setTimelineMode] = useState<(typeof timelineModes)[number][0]>("trueTimeline");
  const timelineEntries = entries.filter((entry) => entry.type === "Timeline Event" || entry.timeline);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <section className="category-header-frame rounded p-5">
        <h2 className="font-display text-4xl">Timeline</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {timelineModes.map(([key, label]) => (
            <button
              key={key}
              className={`tab-frame rounded px-3 py-2 text-sm ${timelineMode === key ? "shadow-glow" : ""}`}
              onClick={() => setTimelineMode(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="soft-panel rounded p-4">
        <div className="space-y-3">
          {timelineEntries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onOpenEntry(entry)}
              className="grid w-full gap-2 rounded border p-3 text-left md:grid-cols-[180px_1fr]"
              style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}
            >
              <p className="font-semibold" style={{ color: "var(--muted-ink)" }}>
                {entry.timeline?.era || "Unplaced"}
              </p>
              <div>
                <p className="font-display text-xl">{entry.title}</p>
                <p className="mt-1 text-sm leading-6">
                  {richTextToPlainText(entry.timeline?.[timelineMode] || entry.summary)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <EntryGrid
        entries={timelineEntries}
        onOpenEntry={onOpenEntry}
        emptyTitle="No timeline entries yet"
      />
    </div>
  );
}
