import { useEffect, useMemo, useState } from "react";
import type { RoadmapItemStatus, RoadmapMilestone } from "../../types";
import type { TeamMember } from "../../utils/assignments";
import {
  calculateRoadmapStats,
  roadmapPhases,
  roadmapProductionTracks,
  type RoadmapItemView
} from "../../utils/roadmap";
import type { ArtBinderSlotCard } from "../ArtBinderPage";
import { Icon } from "../Icon";
import { RoadmapBuildReadiness } from "./RoadmapBuildReadiness";
import { RoadmapItemCard } from "./RoadmapItemCard";

interface RoadmapMilestoneDetailProps {
  milestone: RoadmapMilestone;
  items: RoadmapItemView[];
  allItems: RoadmapItemView[];
  binderCards: Map<string, ArtBinderSlotCard>;
  teamMembers: TeamMember[];
  readOnly: boolean;
  canReview: boolean;
  teammateName: (id: string) => string;
  onOpenBinderSlot: (item: RoadmapItemView) => void;
  onUploadFile: (item: RoadmapItemView, file: File, approveImmediately: boolean) => void;
  onAssign: (item: RoadmapItemView, teammateId: string) => void;
  onReviewerChange: (item: RoadmapItemView, teammateId: string) => void;
  onStatusChange: (item: RoadmapItemView, status: RoadmapItemStatus, note?: string) => void;
  onUpdateNotes: (item: RoadmapItemView, notes: string) => void;
}

export function RoadmapMilestoneDetail({
  milestone,
  items,
  allItems,
  binderCards,
  teamMembers,
  readOnly,
  canReview,
  teammateName,
  onOpenBinderSlot,
  onUploadFile,
  onAssign,
  onReviewerChange,
  onStatusChange,
  onUpdateNotes
}: RoadmapMilestoneDetailProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [selectedTrack, setSelectedTrack] = useState("All");
  const trackTabs = useMemo(() => {
    const itemTracks = new Set(items.map((item) => item.productionTrack || "Art"));
    const ordered = ["All", ...roadmapProductionTracks.filter((track) => itemTracks.has(track))];
    itemTracks.forEach((track) => {
      if (!ordered.includes(track)) ordered.push(track);
    });
    return ordered;
  }, [items]);
  const trackItems = useMemo(() => (
    selectedTrack === "All" ? items : items.filter((item) => (item.productionTrack || "Art") === selectedTrack)
  ), [items, selectedTrack]);
  const phaseGroups = useMemo(() => {
    const byPhase = new Map<string, RoadmapItemView[]>();
    trackItems.forEach((item) => {
      const phase = item.phase || roadmapPhases[0];
      byPhase.set(phase, [...(byPhase.get(phase) || []), item]);
    });
    return [...byPhase.entries()]
      .sort((left, right) => phaseSortIndex(left[0]) - phaseSortIndex(right[0]))
      .map(([phase, phaseItems]) => {
        const byCategory = new Map<string, RoadmapItemView[]>();
        phaseItems.forEach((item) => byCategory.set(item.category, [...(byCategory.get(item.category) || []), item]));
        return {
          phase,
          items: phaseItems,
          stats: calculateRoadmapStats(phaseItems),
          categories: [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        };
      });
  }, [trackItems]);

  useEffect(() => {
    if (trackTabs.includes(selectedTrack)) return;
    setSelectedTrack("All");
  }, [selectedTrack, trackTabs]);

  const toggleCollapsed = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="roadmap-detail">
      <header className="roadmap-detail-header">
        <div>
          <p>Detailed Milestone</p>
          <h2>{milestone.title}</h2>
          <span>{milestone.description}</span>
        </div>
        <div>
          <strong>{milestone.dueDate || "No deadline"}</strong>
          <small>{milestone.bonusXp} bonus XP</small>
        </div>
      </header>

      <RoadmapBuildReadiness
        items={items}
        onOpenItem={(id) => document.getElementById(`roadmap-item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
      />

      <div className="roadmap-track-tabs" aria-label="Roadmap production tabs">
        {trackTabs.map((track) => {
          const trackCount = track === "All" ? items.length : items.filter((item) => (item.productionTrack || "Art") === track).length;
          return (
            <button key={track} className={selectedTrack === track ? "active" : ""} onClick={() => setSelectedTrack(track)}>
              {track}
              <span>{trackCount}</span>
            </button>
          );
        })}
      </div>

      <div className="roadmap-phase-summary-grid">
        {phaseGroups.map((group) => (
          <article key={group.phase}>
            <span>{group.phase}</span>
            <strong>{group.stats.progress}%</strong>
            <small>{group.stats.completed} done / {group.stats.missing} missing / {group.stats.required} required</small>
          </article>
        ))}
      </div>

      {phaseGroups.map((group) => {
        const phaseKey = `phase:${group.phase}`;
        const phaseCollapsed = collapsed.has(phaseKey);
        return (
          <section className="roadmap-phase-section" key={group.phase}>
            <button
              className="roadmap-phase-header"
              onClick={() => toggleCollapsed(phaseKey)}
            >
              <Icon name={phaseCollapsed ? "ChevronRight" : "ChevronDown"} className="h-4 w-4" />
              <span>{group.phase}</span>
              <small>{group.stats.progress}% ready</small>
              <strong>{group.items.length}</strong>
            </button>
            {!phaseCollapsed && (
              <div className="roadmap-phase-body">
                {group.categories.map(([category, categoryItems]) => {
                  const categoryKey = `category:${group.phase}:${category}`;
                  const isCollapsed = collapsed.has(categoryKey);
                  return (
                    <section className="roadmap-category-section" key={categoryKey}>
                      <button
                        className="roadmap-category-header"
                        onClick={() => toggleCollapsed(categoryKey)}
                      >
                        <Icon name={isCollapsed ? "ChevronRight" : "ChevronDown"} className="h-4 w-4" />
                        <span>{category}</span>
                        <strong>{categoryItems.length}</strong>
                      </button>
                      {!isCollapsed && (
                        <div className="roadmap-item-grid">
                          {categoryItems.map((item) => (
                            <RoadmapItemCard
                              key={item.id}
                              item={item}
                              allItems={allItems}
                              binderCard={binderCards.get(item.binderSlotId) || null}
                              teamMembers={teamMembers}
                              readOnly={readOnly}
                              canReview={canReview}
                              teammateName={teammateName}
                              onOpenBinderSlot={onOpenBinderSlot}
                              onUploadFile={onUploadFile}
                              onAssign={onAssign}
                              onReviewerChange={onReviewerChange}
                              onStatusChange={onStatusChange}
                              onUpdateNotes={onUpdateNotes}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}

function phaseSortIndex(phase: string) {
  const index = roadmapPhases.indexOf(phase);
  return index === -1 ? 999 : index;
}
