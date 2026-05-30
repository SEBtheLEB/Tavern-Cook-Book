import type { RoadmapMilestone } from "../../types";
import type { RoadmapItemView } from "../../utils/roadmap";
import { calculateRoadmapStats, roadmapMilestoneStatusLabel } from "../../utils/roadmap";

interface RoadmapMilestoneListProps {
  milestones: RoadmapMilestone[];
  items: RoadmapItemView[];
  selectedMilestoneId: string;
  onSelectMilestone: (id: string) => void;
}

export function RoadmapMilestoneList({ milestones, items, selectedMilestoneId, onSelectMilestone }: RoadmapMilestoneListProps) {
  return (
    <section className="roadmap-milestone-grid" aria-label="Roadmap milestones">
      {milestones.map((milestone) => {
        const milestoneItems = items.filter((item) => item.milestoneId === milestone.id);
        const stats = calculateRoadmapStats(milestoneItems);
        return (
          <button
            key={milestone.id}
            className={`roadmap-milestone-card ${selectedMilestoneId === milestone.id ? "active" : ""}`}
            onClick={() => onSelectMilestone(milestone.id)}
          >
            <header>
              <span>{roadmapMilestoneStatusLabel(milestone.status)}</span>
              <strong>{stats.buildReady ? "Ready for Build" : "Not Build Ready"}</strong>
            </header>
            <h3>{milestone.title}</h3>
            <p>{milestone.description}</p>
            <div className="roadmap-progress">
              <span style={{ width: `${stats.progress}%` }} />
            </div>
            <footer>
              <span>{stats.progress}%</span>
              <span>{stats.required} required</span>
              <span>{stats.completed} complete</span>
              <span>{stats.missing} missing</span>
              <span>{stats.blocked} blocked</span>
              <span>{stats.assigned} assigned</span>
              <span>{milestone.dueDate || "No deadline"}</span>
            </footer>
          </button>
        );
      })}
    </section>
  );
}
