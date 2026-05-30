import type { RoadmapBuildTier, RoadmapItem, RoadmapMilestone, RoadmapPriority } from "../../types";
import type { TeamMember } from "../../utils/assignments";
import { createRoadmapItem, roadmapCategories, roadmapPriorities } from "../../utils/roadmap";
import type { ArtBinderSlotCard } from "../ArtBinderPage";
import { artBinderSlotModule } from "../ArtBinderPage";
import { Icon } from "../Icon";

interface RoadmapAdminEditorProps {
  milestone: RoadmapMilestone;
  milestones: RoadmapMilestone[];
  items: RoadmapItem[];
  binderCards: ArtBinderSlotCard[];
  teamMembers: TeamMember[];
  onMilestonesChange: (milestones: RoadmapMilestone[]) => void;
  onItemsChange: (items: RoadmapItem[]) => void;
}

export function RoadmapAdminEditor({
  milestone,
  milestones,
  items,
  binderCards,
  teamMembers,
  onMilestonesChange,
  onItemsChange
}: RoadmapAdminEditorProps) {
  const updateMilestone = (patch: Partial<RoadmapMilestone>) => {
    const timestamp = new Date().toISOString();
    onMilestonesChange(milestones.map((candidate) => (
      candidate.id === milestone.id ? { ...candidate, ...patch, updatedAt: timestamp } : candidate
    )));
  };

  const createMilestone = () => {
    const timestamp = new Date().toISOString();
    onMilestonesChange([
      ...milestones,
      {
        id: `milestone-${Date.now()}`,
        title: "New Milestone",
        description: "Describe the production goal.",
        status: "planned",
        dueDate: "",
        bonusXp: 150,
        categories: roadmapCategories,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ]);
  };

  const addBinderSlotItem = (binderSlotId: string) => {
    const card = binderCards.find((candidate) => artBinderSlotModule(candidate).moduleId === binderSlotId);
    if (!card) return;
    const existing = items.some((item) => item.binderSlotId === binderSlotId && item.milestoneId === milestone.id);
    if (existing) return;
    onItemsChange([
      ...items,
      createRoadmapItem({
        milestoneId: milestone.id,
        title: `${card.subject.title} - ${card.slot.label}`,
        category: categoryForCard(card),
        type: card.slot.requirementType || card.section.title,
        phase: phaseForCard(card),
        productionTrack: "Art",
        slotVisual: slotVisualForCard(card),
        summary: card.slot.notes || `${card.subject.title} / ${card.section.title} / ${card.slot.label}`,
        priority: "medium",
        buildTier: "required",
        assignedTo: "",
        reviewer: "",
        binderSlotId,
        driveFolderPath: `${card.subject.title} / ${card.section.title}`,
        googleDriveFolderId: card.section.driveFolderId || "",
        notes: card.slot.notes || ""
      })
    ]);
  };

  return (
    <section className="roadmap-admin-editor">
      <header>
        <div>
          <p>Admin Milestone Editor</p>
          <h3>Edit roadmap structure</h3>
        </div>
        <button onClick={createMilestone}>
          <Icon name="Plus" className="h-4 w-4" />
          Milestone
        </button>
      </header>

      <div className="roadmap-admin-grid">
        <label>
          <span>Title</span>
          <input value={milestone.title} onChange={(event) => updateMilestone({ title: event.target.value })} />
        </label>
        <label>
          <span>Status</span>
          <select value={milestone.status} onChange={(event) => updateMilestone({ status: event.target.value as RoadmapMilestone["status"] })}>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="at-risk">At Risk</option>
            <option value="ready-for-build">Ready For Build</option>
            <option value="complete">Complete</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label>
          <span>Deadline</span>
          <input type="date" value={milestone.dueDate} onChange={(event) => updateMilestone({ dueDate: event.target.value })} />
        </label>
        <label>
          <span>Bonus XP</span>
          <input type="number" value={milestone.bonusXp} onChange={(event) => updateMilestone({ bonusXp: Number(event.target.value) || 0 })} />
        </label>
        <label className="roadmap-admin-wide">
          <span>Description</span>
          <textarea value={milestone.description} onChange={(event) => updateMilestone({ description: event.target.value })} />
        </label>
      </div>

      <RoadmapQuickItemCreator
        milestoneId={milestone.id}
        binderCards={binderCards}
        teamMembers={teamMembers}
        onAdd={addBinderSlotItem}
      />
    </section>
  );
}

function RoadmapQuickItemCreator({
  binderCards,
  onAdd
}: {
  milestoneId: string;
  binderCards: ArtBinderSlotCard[];
  teamMembers: TeamMember[];
  onAdd: (binderSlotId: string) => void;
}) {
  return (
    <div className="roadmap-quick-item">
      <label>
        <span>Add existing Art Binder slot as quest</span>
        <select defaultValue="" onChange={(event) => {
          if (!event.target.value) return;
          onAdd(event.target.value);
          event.currentTarget.value = "";
        }}>
          <option value="">Choose a Binder slot...</option>
          {binderCards.map((card) => (
            <option key={artBinderSlotModule(card).moduleId} value={artBinderSlotModule(card).moduleId}>
              {card.subject.title} / {card.section.title} / {card.slot.label}
            </option>
          ))}
        </select>
      </label>
      <small>New physical Art Binder slots are still created from Art Binder, then linked here so Drive routing stays clean.</small>
    </div>
  );
}

function categoryForCard(card: ArtBinderSlotCard) {
  if (card.subject.kind === "environment") return "Environment Art";
  if (card.subject.kind === "pantry") return "Ingredient Art";
  if (card.section.title.toLowerCase().includes("sprite")) return "Animation";
  if (card.subject.kind === "bestiary") return card.subject.groupLabel.toLowerCase().includes("npc") ? "NPC Art" : "Enemy Art";
  return "Character Art";
}

function slotVisualForCard(card: ArtBinderSlotCard) {
  if (card.subject.kind === "pantry") return "pantry";
  if (card.subject.kind === "bestiary") return "bestiary";
  if (card.subject.kind === "environment") return "environment";
  if (card.subject.kind === "character") return "character";
  return "art-binder";
}

function phaseForCard(card: ArtBinderSlotCard) {
  const value = `${card.subject.title} ${card.section.title} ${card.slot.label}`.toLowerCase();
  if (value.includes("meal") || value.includes("cook") || value.includes("tavern")) return "Phase 3 - Tavern Return & Cooking";
  if (value.includes("bug") || value.includes("enemy") || value.includes("prawn") || value.includes("kap") || value.includes("pool")) return "Phase 2 - Forest Rescue & Combat";
  return "Phase 1 - Village & Core Loop";
}
