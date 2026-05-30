import { useMemo, useState } from "react";
import type { RoadmapItemStatus, RoadmapMilestone } from "../../types";
import type { TeamMember } from "../../utils/assignments";
import type { RoadmapItemView } from "../../utils/roadmap";
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
  const groups = useMemo(() => {
    const byCategory = new Map<string, RoadmapItemView[]>();
    items.forEach((item) => byCategory.set(item.category, [...(byCategory.get(item.category) || []), item]));
    return [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

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

      {groups.map(([category, categoryItems]) => {
        const isCollapsed = collapsed.has(category);
        return (
          <section className="roadmap-category-section" key={category}>
            <button
              className="roadmap-category-header"
              onClick={() => {
                setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(category)) next.delete(category);
                  else next.add(category);
                  return next;
                });
              }}
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
    </section>
  );
}
