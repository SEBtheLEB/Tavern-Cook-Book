import type { ActiveView, AppMode, LoreEntry, ViewConfig } from "../types";
import { hubSections } from "../data/navigation";
import { EntryGrid } from "./EntryGrid";
import { Icon } from "./Icon";

interface HubPageProps {
  view: ViewConfig;
  entries: LoreEntry[];
  mode: AppMode;
  onNavigate: (view: ActiveView) => void;
  onOpenEntry: (entry: LoreEntry) => void;
  onUpdateEntry: (entry: LoreEntry) => void;
}

export function HubPage({ view, entries, mode, onNavigate, onOpenEntry, onUpdateEntry }: HubPageProps) {
  const sections = hubSections[view.id] || [];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <section className="category-header-frame rounded p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="grid h-14 w-14 place-items-center rounded border" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
            <Icon name={view.icon} className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted-ink)" }}>
              {entries.length} entries
            </p>
            <h2 className="font-display text-4xl leading-tight">{view.label}</h2>
            <p className="mt-2 max-w-3xl leading-7" style={{ color: "var(--muted-ink)" }}>
              {view.description}
            </p>
          </div>
        </div>
      </section>

      {sections.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <button
              key={`${section.title}-${section.view}`}
              onClick={() => onNavigate(section.view)}
              className="dashboard-category-box-frame rounded p-4 text-left transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <h3 className="font-display text-xl">{section.title}</h3>
              <p className="mt-2 text-sm leading-5" style={{ color: "var(--muted-ink)" }}>
                {section.description}
              </p>
            </button>
          ))}
        </section>
      )}

      <EntryGrid entries={entries} mode={mode} onOpenEntry={onOpenEntry} onUpdateEntry={onUpdateEntry} />
    </div>
  );
}
