import { useRef } from "react";
import type { RoadmapItemStatus } from "../../types";
import type { TeamMember } from "../../utils/assignments";
import type { RoadmapItemView } from "../../utils/roadmap";
import { roadmapStatusLabel, unmetDependencies } from "../../utils/roadmap";
import type { ArtBinderSlotCard } from "../ArtBinderPage";
import { artBinderImagePreviewSource } from "../ArtBinderPage";
import { DriveAwareImage } from "../DriveAwareImage";
import { Icon } from "../Icon";
import { RoadmapAssignmentPanel } from "./RoadmapAssignmentPanel";

interface RoadmapItemCardProps {
  item: RoadmapItemView;
  allItems: RoadmapItemView[];
  binderCard: ArtBinderSlotCard | null;
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

export function RoadmapItemCard({
  item,
  allItems,
  binderCard,
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
}: RoadmapItemCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blockers = unmetDependencies(item, allItems);
  const imageSrc = binderCard ? artBinderImagePreviewSource(binderCard.slot.image) : "";
  const folderLink = binderCard?.section.driveFolderLink || (item.liveDriveFolderId ? `https://drive.google.com/drive/folders/${item.liveDriveFolderId}` : "");
  const slotClass = slotClassName(item.slotVisual || slotVisualForItem(item, binderCard));
  const summary = item.summary || item.notes;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const approveImmediately = canReview && window.confirm("Approve this file immediately after uploading?");
    onUploadFile(item, file, approveImmediately);
  };

  return (
    <article className={`roadmap-item-card status-${item.liveStatus} priority-${item.priority} slot-${slotClass}`} id={`roadmap-item-${item.id}`}>
      <header>
        <div className={`roadmap-item-preview slot-${slotClass}`}>
          {imageSrc ? <DriveAwareImage src={imageSrc} alt="" /> : <Icon name="Image" className="h-6 w-6" />}
        </div>
        <div>
          <span className="roadmap-kicker">{item.category} / {item.type}</span>
          <h4>{item.title}</h4>
          <div className="roadmap-item-badges">
            <span>{item.productionTrack || "Art"}</span>
            <span>{roadmapStatusLabel(item.liveStatus)}</span>
            <span>{item.priority}</span>
            <span>{item.buildTier === "required" ? "Required for Build" : item.buildTier === "polish" ? "Important Polish" : "Optional"}</span>
            <span>{item.xpReward} XP</span>
          </div>
        </div>
      </header>

      {summary && <p className="roadmap-item-summary">{summary}</p>}

      <details className="roadmap-item-meta">
        <summary>
          <Icon name="ListChecks" className="h-4 w-4" />
          Production details
        </summary>
        <dl>
          <div>
            <dt>Phase</dt>
            <dd>{item.phase || "Phase not set"}</dd>
          </div>
          <div>
            <dt>Tab</dt>
            <dd>{item.productionTrack || "Art"}</dd>
          </div>
          <div>
            <dt>Assigned</dt>
            <dd>{item.assignedTo ? teammateName(item.assignedTo) : "Unassigned"}</dd>
          </div>
          <div>
            <dt>Reviewer</dt>
            <dd>{item.reviewer ? teammateName(item.reviewer) : "No reviewer"}</dd>
          </div>
          <div>
            <dt>Due</dt>
            <dd>{item.dueDate || "No date"}</dd>
          </div>
          <div>
            <dt>Source Slot</dt>
            <dd>{binderCard ? `${binderCard.subject.title} / ${binderCard.slot.label}` : sourceSlotLabel(item)}</dd>
          </div>
          <div>
            <dt>Drive Path</dt>
            <dd>{item.liveDriveFolderPath || item.driveFolderPath || "Folder will be created from the linked route"}</dd>
          </div>
          <div>
            <dt>Required Files</dt>
            <dd>{item.requiredFileTypes.join(", ")}</dd>
          </div>
          <div>
            <dt>Dependencies</dt>
            <dd>{blockers.length ? blockers.map((blocker) => blocker.title).join(", ") : "Clear"}</dd>
          </div>
        </dl>
      </details>

      <RoadmapAssignmentPanel
        assignedTo={item.assignedTo}
        reviewer={item.reviewer}
        teamMembers={teamMembers}
        disabled={readOnly}
        onAssign={(teammateId) => onAssign(item, teammateId)}
        onReviewerChange={(teammateId) => onReviewerChange(item, teammateId)}
      />

      <label className="roadmap-notes-field">
        <span>Notes</span>
        <textarea
          value={item.notes}
          disabled={readOnly}
          onChange={(event) => onUpdateNotes(item, event.target.value)}
          placeholder="Production notes, revision notes, dependencies, or context..."
        />
      </label>

      <div className="roadmap-item-actions">
        <button onClick={() => onOpenBinderSlot(item)} disabled={!binderCard}>
          <Icon name="ExternalLink" className="h-4 w-4" />
          Open Binder Slot
        </button>
        <button disabled={readOnly || !binderCard} onClick={() => fileInputRef.current?.click()}>
          <Icon name="Upload" className="h-4 w-4" />
          Upload File
        </button>
        <button disabled={readOnly} onClick={() => onStatusChange(item, "blocked", window.prompt("Why is this blocked?") || "")}>
          Mark Blocked
        </button>
        <button disabled={readOnly || !canReview} onClick={() => onStatusChange(item, "revision-needed", window.prompt("Revision request notes") || "")}>
          Request Revision
        </button>
        <button disabled={readOnly || !canReview} onClick={() => onStatusChange(item, "approved", "Approved from Roadmap.")}>
          Approve
        </button>
        <button disabled={!folderLink} onClick={() => folderLink && window.open(folderLink, "_blank", "noopener,noreferrer")}>
          <Icon name="FolderOpen" className="h-4 w-4" />
          View Drive Folder
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
      </div>
    </article>
  );
}

function slotVisualForItem(item: RoadmapItemView, binderCard: ArtBinderSlotCard | null) {
  if (binderCard?.subject.kind === "pantry") return "pantry";
  if (binderCard?.subject.kind === "bestiary") return "bestiary";
  if (binderCard?.subject.kind === "character") return "character";
  if (binderCard?.subject.kind === "environment") return "environment";
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

function slotClassName(value: string) {
  return String(value || "art-binder").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "art-binder";
}

function sourceSlotLabel(item: RoadmapItemView) {
  if (item.slotVisual === "pantry") return "Pantry slot needed";
  if (item.slotVisual === "bestiary") return "Bestiary slot needed";
  if (item.slotVisual === "quest") return "Quest Board / Story Journey link";
  if (item.slotVisual === "system") return "Gameplay system task";
  return "Source slot needed";
}
