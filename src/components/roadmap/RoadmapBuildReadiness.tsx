import type { RoadmapItemView } from "../../utils/roadmap";
import { roadmapStatusLabel, unmetDependencies } from "../../utils/roadmap";

interface RoadmapBuildReadinessProps {
  items: RoadmapItemView[];
  onOpenItem?: (itemId: string) => void;
}

export function RoadmapBuildReadiness({ items, onOpenItem }: RoadmapBuildReadinessProps) {
  const required = items.filter((item) => item.buildTier === "required");
  const polish = items.filter((item) => item.buildTier === "polish");
  const optional = items.filter((item) => item.buildTier === "optional");
  const ready = required.length > 0 && required.every((item) => item.liveStatus === "approved" || item.liveStatus === "complete");

  return (
    <section className={`roadmap-readiness ${ready ? "ready" : "not-ready"}`}>
      <header>
        <div>
          <p>Build Readiness</p>
          <h3>{ready ? "Ready for Build" : "Not Build Ready"}</h3>
        </div>
        <span>{required.length} required quest{required.length === 1 ? "" : "s"}</span>
      </header>
      <ReadinessColumn title="Required for Build" items={required} allItems={items} onOpenItem={onOpenItem} />
      <ReadinessColumn title="Important Polish" items={polish} allItems={items} onOpenItem={onOpenItem} />
      <ReadinessColumn title="Optional Nice-to-Have" items={optional} allItems={items} onOpenItem={onOpenItem} />
    </section>
  );
}

function ReadinessColumn({
  title,
  items,
  allItems,
  onOpenItem
}: {
  title: string;
  items: RoadmapItemView[];
  allItems: RoadmapItemView[];
  onOpenItem?: (itemId: string) => void;
}) {
  return (
    <div className="roadmap-readiness-column">
      <strong>{title}</strong>
      {items.length ? (
        items.map((item) => {
          const blockers = unmetDependencies(item, allItems);
          return (
            <button key={item.id} onClick={() => onOpenItem?.(item.id)}>
              <span>{item.title}</span>
              <small>{blockers.length ? `Blocked by ${blockers.length}` : roadmapStatusLabel(item.liveStatus)}</small>
            </button>
          );
        })
      ) : (
        <em>No items yet.</em>
      )}
    </div>
  );
}
