import type { ActiveView, LoreDatabase, LoreEntry } from "../types";
import { dashboardBoxes } from "../data/navigation";
import { Icon } from "./Icon";

interface DashboardProps {
  database: LoreDatabase;
  onNavigate: (view: ActiveView) => void;
  onOpenEntry: (entry: LoreEntry) => void;
  hiddenViewIds?: ActiveView[];
}

const focusPanels = [
  "Whisker Woods Vertical Slice",
  "Act 1 Story",
  "Cooking & Recipe System",
  "Lillia / Dark Culinary Arts Arc",
  "Tohm Kyatt Redemption Arc"
];

export function Dashboard({ database, onNavigate, onOpenEntry, hiddenViewIds = [] }: DashboardProps) {
  const entries = database.entries;
  const hiddenViewSet = new Set(hiddenViewIds);
  const countStatus = (status: string) => entries.filter((entry) => entry.status === status).length;
  const unresolved = entries.filter((entry) => entry.notes.unresolved || entry.status === "Needs Rewrite");
  const recent = [...entries]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const stats = [
    ["Total Entries", entries.length],
    ["Canon Entries", countStatus("Canon")],
    ["Soft Canon Entries", countStatus("Soft Canon")],
    ["Needs Rewrite", countStatus("Needs Rewrite")],
    ["Old / Scrapped", countStatus("Old Version") + countStatus("Scrapped")],
    ["Unresolved Questions", unresolved.length]
  ];

  const countForBox = (view: ActiveView) => {
    if (view === "bestiary") return database.bestiary?.length || 0;
    if (view === "recipes") {
      return entries.filter((entry) => /recipe|meal|menu|dish|broth|tonic|ale|drink|consumable|food magic|food item/i.test(entry.type)).length;
    }
    if (view === "ingredients") {
      return entries.filter((entry) => /ingredient|drop|substitute/i.test(entry.type)).length;
    }
    if (view === "items") {
      return entries.filter((entry) => /item|artifact|tool|collectible/i.test(entry.type)).length;
    }
    if (view === "enemies") return entries.filter((entry) => entry.category === "Enemies & Creatures").length;
    if (view === "timeline") return entries.filter((entry) => entry.type === "Timeline Event").length;
    if (view === "secrets") return entries.filter((entry) => entry.type === "Secret").length;
    if (view === "factions") return entries.filter((entry) => /Faction|Culture|Cult/i.test(entry.type)).length;
    const box = dashboardBoxes.find((item) => item.id === view);
    return box?.category ? entries.filter((entry) => entry.category === box.category).length : entries.length;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="category-header-frame rounded p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm uppercase tracking-[0.18em]" style={{ color: "var(--muted-ink)" }}>
              STL Productionz / Tales of the Tavern
            </p>
            <h2 className="mt-2 font-display text-4xl leading-tight md:text-5xl">The Tavern Cook Book</h2>
            <p className="mt-3 max-w-3xl leading-7" style={{ color: "var(--muted-ink)" }}>
              A living lore bible, story database, quest tracker, recipe book, wiki, and assistant-ready
              organization tool for the whole tavern-shaped world.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
                <p className="font-display text-3xl">{value}</p>
                <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--muted-ink)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="soft-panel rounded p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-2 font-display text-lg">Current Focus</h3>
            {focusPanels.map((panel) => (
              <span
                key={panel}
                className="rounded border px-2.5 py-1 text-xs font-semibold"
                style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}
              >
                {panel}
              </span>
            ))}
          </div>
        </div>
        <details className="soft-panel rounded p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="font-display text-lg">Needs Attention</span>
            <span className="rounded border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
              {unresolved.length} flagged
            </span>
          </summary>
          <div className="mt-3 space-y-2">
            {unresolved.slice(0, 8).map((entry) => (
              <button
                key={entry.id}
                onClick={() => onOpenEntry(entry)}
                className="block w-full rounded border p-2.5 text-left text-sm transition hover:bg-black/5"
                style={{ borderColor: "var(--card-border)" }}
              >
                <span className="font-semibold">{entry.title}</span>
                <span className="block text-xs" style={{ color: "var(--muted-ink)" }}>
                  {entry.status}
                </span>
              </button>
            ))}
            {!unresolved.length && <p className="text-sm" style={{ color: "var(--muted-ink)" }}>Nothing flagged right now.</p>}
          </div>
        </details>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--muted-ink)" }}>
              Main workspace
            </p>
            <h3 className="font-display text-3xl md:text-4xl">Cook Book Hubs</h3>
          </div>
          <p className="max-w-xl text-sm" style={{ color: "var(--muted-ink)" }}>
            Jump into the major lore, art, story, quest, and production areas.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {dashboardBoxes.filter((box) => !hiddenViewSet.has(box.id)).map((box) => (
            <button
              key={`${box.id}-${box.label}`}
              className="dashboard-category-box-frame min-h-[190px] rounded p-5 text-left transition hover:-translate-y-0.5 hover:shadow-glow"
              title={box.tooltip || box.description}
              onClick={() => onNavigate(box.id)}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded border" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
                  <Icon name={box.icon} className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-display text-xl leading-6">{box.label}</h4>
                  <p className="mt-1 text-sm leading-5" style={{ color: "var(--muted-ink)" }}>
                    {box.description}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold">{countForBox(box.id)} entries</p>
            </button>
          ))}
        </div>
      </section>

      <section className="soft-panel rounded p-3">
        <h3 className="font-display text-xl">Recently Edited</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {recent.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onOpenEntry(entry)}
              className="rounded border p-2.5 text-left text-xs transition hover:bg-black/5"
              style={{ borderColor: "var(--card-border)" }}
            >
              <span className="font-semibold">{entry.title}</span>
              <span className="mt-1 block" style={{ color: "var(--muted-ink)" }}>
                {entry.category} / {new Date(entry.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
