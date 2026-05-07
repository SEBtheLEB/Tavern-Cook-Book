import type { AppMode, LoreEntry } from "../types";
import { EntryGrid } from "./EntryGrid";

interface SecretsViewProps {
  entries: LoreEntry[];
  mode: AppMode;
  onOpenEntry: (entry: LoreEntry) => void;
  onUpdateEntry: (entry: LoreEntry) => void;
}

export function SecretsView({ entries, mode, onOpenEntry, onUpdateEntry }: SecretsViewProps) {
  const secrets = entries.filter((entry) => entry.type === "Secret" || entry.secret);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <section className="category-header-frame rounded p-5">
        <h2 className="font-display text-4xl">Secrets / Who Knows What</h2>
        <p className="mt-2 max-w-3xl leading-7" style={{ color: "var(--muted-ink)" }}>
          Canon facts, suspicion, ignorance, player reveal stage, related quests, dialogue, and spoiler level.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {secrets.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onOpenEntry(entry)}
            className="wiki-item-frame rounded p-4 text-left transition hover:-translate-y-0.5 hover:shadow-glow"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-display text-2xl">{entry.title.replace("Secret: ", "")}</h3>
              <span className="rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--card-border)" }}>
                {entry.spoilerLevel}
              </span>
            </div>
            <p className="mt-3 leading-6">{entry.secret?.trueFact || entry.summary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Info label="Known by" value={entry.secret?.knownBy} />
              <Info label="Suspected by" value={entry.secret?.suspectedBy} />
              <Info label="Unknown to" value={entry.secret?.unknownTo} />
              <Info label="Player knowledge" value={entry.secret?.playerKnowledge} />
              <Info label="Related quests" value={entry.secret?.relatedQuests} />
              <Info label="Related dialogue" value={entry.secret?.relatedDialogue} />
            </div>
          </button>
        ))}
      </section>

      <EntryGrid entries={secrets} mode={mode} onOpenEntry={onOpenEntry} onUpdateEntry={onUpdateEntry} />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string[] | string }) {
  const content = Array.isArray(value) ? value.join(", ") : value;
  if (!content) return null;

  return (
    <div className="rounded border p-2 text-sm" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
      <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--muted-ink)" }}>
        {label}
      </p>
      <p className="mt-1">{content}</p>
    </div>
  );
}
