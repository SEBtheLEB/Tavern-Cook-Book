import { useEffect, useRef, useState } from "react";
import type { RoadmapItemStatus, RoadmapMilestone } from "../../types";
import type { RoadmapItemView } from "../../utils/roadmap";
import {
  calculateRoadmapStats,
  roadmapMilestoneStatusLabel,
  roadmapPhases,
  roadmapStatusLabel
} from "../../utils/roadmap";
import type { ArtBinderSlotCard } from "../ArtBinderPage";
import { artBinderImagePreviewSource } from "../ArtBinderPage";
import { DriveAwareImage } from "../DriveAwareImage";
import { Icon } from "../Icon";

interface RoadmapMilestoneListProps {
  milestones: RoadmapMilestone[];
  items: RoadmapItemView[];
  selectedMilestoneId: string;
  binderCards: Map<string, ArtBinderSlotCard>;
  readOnly: boolean;
  canReview: boolean;
  uploadingItemId: string;
  onSelectMilestone: (id: string) => void;
  onOpenBinderSlot: (item: RoadmapItemView) => void;
  onUploadFile: (item: RoadmapItemView, file: File, approveImmediately: boolean) => void;
  onStatusChange: (item: RoadmapItemView, status: RoadmapItemStatus, note?: string) => void;
}

export function RoadmapMilestoneList({
  milestones,
  items,
  selectedMilestoneId,
  binderCards,
  readOnly,
  canReview,
  uploadingItemId,
  onSelectMilestone,
  onOpenBinderSlot,
  onUploadFile,
  onStatusChange
}: RoadmapMilestoneListProps) {
  const [openMilestoneIds, setOpenMilestoneIds] = useState<Set<string>>(
    () => new Set([selectedMilestoneId || milestones[0]?.id].filter(Boolean))
  );

  useEffect(() => {
    if (!selectedMilestoneId) return;
    setOpenMilestoneIds((current) => {
      if (current.has(selectedMilestoneId)) return current;
      return new Set([...current, selectedMilestoneId]);
    });
  }, [selectedMilestoneId]);

  const toggleMilestone = (id: string) => {
    onSelectMilestone(id);
    setOpenMilestoneIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="roadmap-milestone-grid" aria-label="Roadmap milestones">
      {milestones.map((milestone) => {
        const milestoneItems = items.filter((item) => item.milestoneId === milestone.id);
        const stats = calculateRoadmapStats(milestoneItems);
        const isOpen = openMilestoneIds.has(milestone.id);
        const phaseGroups = groupMilestoneItems(milestoneItems);
        return (
          <article
            key={milestone.id}
            className={`roadmap-milestone-card ${selectedMilestoneId === milestone.id ? "active" : ""}`}
          >
            <button
              type="button"
              className="roadmap-milestone-summary"
              aria-expanded={isOpen}
              onClick={() => toggleMilestone(milestone.id)}
            >
              <header>
                <div className="roadmap-milestone-badges">
                  <span>{roadmapMilestoneStatusLabel(milestone.status)}</span>
                  <strong>{stats.buildReady ? "Ready for Build" : "Not Build Ready"}</strong>
                </div>
                <Icon name={isOpen ? "ChevronDown" : "ChevronRight"} className="h-5 w-5" />
              </header>
              <h3>{milestone.title}</h3>
              <p>{milestone.description}</p>
              <div className="roadmap-milestone-meter">
                <div className="roadmap-progress" aria-label={`${stats.progress}% filled`}>
                  <span style={{ width: `${stats.progress}%` }} />
                </div>
                <strong>{stats.progress}% filled</strong>
              </div>
              <footer>
                <span>{stats.required} required</span>
                <span>{stats.completed} approved</span>
                <span>{stats.submitted} in review</span>
                <span>{stats.inProgress} cooking</span>
                <span>{stats.missing} missing</span>
                <span>{stats.blocked} blocked</span>
                <span>{milestone.dueDate || "No deadline"}</span>
              </footer>
            </button>

            {isOpen && (
              <div className="roadmap-milestone-dropdown">
                <div className="roadmap-milestone-dropdown-header">
                  <div>
                    <p>Milestone Slot Intake</p>
                    <strong>{milestoneItems.length} linked production slots</strong>
                  </div>
                  <span>Submit here to update the Roadmap and any linked Art Binder slot.</span>
                </div>

                {phaseGroups.length ? (
                  phaseGroups.map((phaseGroup) => (
                    <section className="roadmap-milestone-phase-pack" key={phaseGroup.phase}>
                      <div className="roadmap-milestone-phase-title">
                        <span>{phaseGroup.phase}</span>
                        <small>{phaseGroup.items.length} slots</small>
                      </div>
                      {phaseGroup.tracks.map((trackGroup) => (
                        <div className="roadmap-milestone-track-block" key={`${phaseGroup.phase}:${trackGroup.track}`}>
                          <div className="roadmap-milestone-track-title">
                            <strong>{trackGroup.track}</strong>
                            <span>{trackGroup.items.length}</span>
                          </div>
                          <div className="roadmap-milestone-slot-list">
                            {trackGroup.items.map((item) => (
                              <RoadmapMilestoneSlotRow
                                key={item.id}
                                item={item}
                                binderCard={binderCards.get(item.binderSlotId) || null}
                                readOnly={readOnly}
                                canReview={canReview}
                                isUploading={uploadingItemId === item.id}
                                onOpenBinderSlot={onOpenBinderSlot}
                                onUploadFile={onUploadFile}
                                onStatusChange={onStatusChange}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>
                  ))
                ) : (
                  <div className="roadmap-milestone-empty">
                    <Icon name="ListChecks" className="h-5 w-5" />
                    <span>No slots have been attached to this milestone yet.</span>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function RoadmapMilestoneSlotRow({
  item,
  binderCard,
  readOnly,
  canReview,
  isUploading,
  onOpenBinderSlot,
  onUploadFile,
  onStatusChange
}: {
  item: RoadmapItemView;
  binderCard: ArtBinderSlotCard | null;
  readOnly: boolean;
  canReview: boolean;
  isUploading: boolean;
  onOpenBinderSlot: (item: RoadmapItemView) => void;
  onUploadFile: (item: RoadmapItemView, file: File, approveImmediately: boolean) => void;
  onStatusChange: (item: RoadmapItemView, status: RoadmapItemStatus, note?: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageSrc = binderCard ? artBinderImagePreviewSource(binderCard.slot.image) : "";
  const slotClass = slotClassName(item.slotVisual || slotVisualForItem(item, binderCard));
  const statusLabel = roadmapStatusLabel(item.liveStatus);
  const sourceLabel = binderCard
    ? `${sourceNameForKind(binderCard.subject.kind)} / ${binderCard.subject.title}`
    : sourceSlotLabel(item);
  const slotLabel = binderCard
    ? `${binderCard.section.title} / ${binderCard.slot.label}`
    : item.type;
  const canSubmitFile = Boolean(binderCard) && !readOnly;
  const canMarkSubmitted = !binderCard && !readOnly;

  return (
    <article className={`roadmap-milestone-slot-row slot-${slotClass} status-${item.liveStatus}`}>
      <div className={`roadmap-milestone-slot-thumb slot-${slotClass}`}>
        {imageSrc ? <DriveAwareImage src={imageSrc} alt="" /> : <Icon name={iconForSlot(item, binderCard)} className="h-5 w-5" />}
      </div>

      <div className="roadmap-milestone-slot-main">
        <div className="roadmap-milestone-slot-title">
          <strong>{item.title}</strong>
          <span>{statusLabel}</span>
        </div>
        <p>{item.summary || item.notes || "No summary yet."}</p>
        <div className="roadmap-milestone-slot-meta">
          <span className={`roadmap-source-pill source-${slotClass}`}>{sourceLabel}</span>
          <span>{slotLabel}</span>
          <span>{item.category}</span>
          <span>{item.requiredFileTypes.join(", ")}</span>
        </div>
      </div>

      <div className="roadmap-milestone-slot-actions">
        <button type="button" onClick={() => onOpenBinderSlot(item)} disabled={!binderCard}>
          <Icon name="ExternalLink" className="h-4 w-4" />
          Open
        </button>
        <button
          type="button"
          disabled={readOnly || isUploading || (!canSubmitFile && !canMarkSubmitted)}
          onClick={() => {
            if (canSubmitFile) {
              fileInputRef.current?.click();
              return;
            }
            onStatusChange(item, "needs-review", "Submitted from milestone intake.");
          }}
        >
          <Icon name={isUploading ? "LoaderCircle" : "Upload"} className="h-4 w-4" />
          {isUploading ? "Uploading" : binderCard ? "Submit Slot" : "Mark Submitted"}
        </button>
        <button
          type="button"
          disabled={readOnly || !canReview}
          onClick={() => onStatusChange(item, "approved", "Approved from milestone intake.")}
        >
          <Icon name="Check" className="h-4 w-4" />
          Approve
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              const approveImmediately = canReview && window.confirm("Approve this file immediately after uploading?");
              onUploadFile(item, file, approveImmediately);
            }
            event.currentTarget.value = "";
          }}
        />
      </div>
    </article>
  );
}

function groupMilestoneItems(items: RoadmapItemView[]) {
  const phaseMap = new Map<string, RoadmapItemView[]>();
  items.forEach((item) => {
    const phase = item.phase || roadmapPhases[0];
    phaseMap.set(phase, [...(phaseMap.get(phase) || []), item]);
  });
  return [...phaseMap.entries()]
    .sort((left, right) => phaseSortIndex(left[0]) - phaseSortIndex(right[0]))
    .map(([phase, phaseItems]) => {
      const trackMap = new Map<string, RoadmapItemView[]>();
      phaseItems.forEach((item) => {
        const track = item.productionTrack || "Art";
        trackMap.set(track, [...(trackMap.get(track) || []), item]);
      });
      return {
        phase,
        items: phaseItems,
        tracks: [...trackMap.entries()]
          .sort((left, right) => left[0].localeCompare(right[0]))
          .map(([track, trackItems]) => ({
            track,
            items: trackItems.sort((left, right) => left.category.localeCompare(right.category) || left.title.localeCompare(right.title))
          }))
      };
    });
}

function phaseSortIndex(phase: string) {
  const index = roadmapPhases.indexOf(phase);
  return index === -1 ? 999 : index;
}

function slotVisualForItem(item: RoadmapItemView, binderCard: ArtBinderSlotCard | null) {
  if (binderCard?.subject.kind) return binderCard.subject.kind;
  const value = `${item.category} ${item.type}`.toLowerCase();
  if (value.includes("ingredient") || value.includes("meal")) return "pantry";
  if (value.includes("enemy") || value.includes("creature") || value.includes("slime")) return "bestiary";
  if (value.includes("character") || value.includes("npc")) return "character";
  if (value.includes("quest")) return "quest";
  if (value.includes("gameplay") || value.includes("system")) return "system";
  if (value.includes("audio")) return "audio";
  if (value.includes("writing") || value.includes("dialogue")) return "writing";
  if (value.includes("ui")) return "ui";
  if (value.includes("environment") || value.includes("level")) return "environment";
  return "art-binder";
}

function iconForSlot(item: RoadmapItemView, binderCard: ArtBinderSlotCard | null) {
  const visual = slotVisualForItem(item, binderCard);
  if (visual === "pantry") return "Utensils";
  if (visual === "bestiary") return "Bug";
  if (visual === "character") return "User";
  if (visual === "quest") return "ScrollText";
  if (visual === "system") return "Cog";
  if (visual === "audio") return "Volume2";
  if (visual === "writing") return "BookOpen";
  if (visual === "ui") return "PanelTop";
  if (visual === "environment") return "Trees";
  return "Image";
}

function sourceNameForKind(kind: string) {
  if (kind === "pantry") return "Pantry";
  if (kind === "bestiary") return "Bestiary";
  if (kind === "character") return "Character";
  if (kind === "environment") return "Environment";
  return "Art Binder";
}

function sourceSlotLabel(item: RoadmapItemView) {
  if (item.slotVisual === "pantry") return "Pantry slot needed";
  if (item.slotVisual === "bestiary") return "Bestiary slot needed";
  if (item.slotVisual === "quest") return "Quest Board / Story Journey";
  if (item.slotVisual === "system") return "Gameplay system task";
  if (item.slotVisual === "audio") return "Audio task";
  if (item.slotVisual === "writing") return "Writing task";
  return "Source slot needed";
}

function slotClassName(value: string) {
  return String(value || "art-binder").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "art-binder";
}
