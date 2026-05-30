import type { RoadmapFilter } from "../../utils/roadmap";
import { roadmapFilters } from "../../utils/roadmap";

interface RoadmapFiltersProps {
  filter: RoadmapFilter;
  search: string;
  onFilterChange: (filter: RoadmapFilter) => void;
  onSearchChange: (search: string) => void;
}

export function RoadmapFilters({ filter, search, onFilterChange, onSearchChange }: RoadmapFiltersProps) {
  return (
    <section className="roadmap-filters" aria-label="Roadmap filters">
      <div className="roadmap-filter-tabs">
        {roadmapFilters.map((option) => (
          <button
            key={option.id}
            className={filter === option.id ? "active" : ""}
            onClick={() => onFilterChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search asset, character, milestone, category, assignee..."
      />
    </section>
  );
}
