import { useEffect, useMemo, useState } from "react";
import type { GoogleAccountUser, LoreDatabase, RoadmapItem, RoadmapItemStatus, RoadmapMilestone } from "../../types";
import type { AssignmentRecord, TeamMember } from "../../utils/assignments";
import {
  createAssignment,
  getTeamMemberForGoogleUser
} from "../../utils/assignments";
import {
  calculateRoadmapStats,
  calculateRoadmapXp,
  createRoadmapItem,
  filterRoadmapItems,
  normalizeRoadmapData,
  roadmapStatusLabel,
  type RoadmapFilter,
  type RoadmapItemView
} from "../../utils/roadmap";
import { uploadRoadmapItemFile } from "../../utils/roadmapDrive";
import type { ArtBinderInitialFilter, ArtBinderSlotCard } from "../ArtBinderPage";
import {
  artBinderDriveContext,
  artBinderImageManagerSlot,
  artBinderSlotModule,
  artBinderStatus,
  buildArtBinderSubjects,
  updateDatabaseSlotImage
} from "../ArtBinderPage";
import type { ImageManagerSlotDraft } from "../ImageManagerModal";
import { artVaultDriveFolderPathLabel } from "../../utils/artVaultDriveFolders";
import { normalizeImageFit } from "../../utils/imageFit";
import { Icon } from "../Icon";
import { RoadmapAdminEditor } from "./RoadmapAdminEditor";
import { RoadmapFilters } from "./RoadmapFilters";
import { RoadmapMilestoneDetail } from "./RoadmapMilestoneDetail";
import { RoadmapMilestoneList } from "./RoadmapMilestoneList";

interface RoadmapPageProps {
  database: LoreDatabase;
  readOnly: boolean;
  currentUser: GoogleAccountUser | null;
  teamMembers: TeamMember[];
  assignments: AssignmentRecord[];
  onDatabaseChange: (database: LoreDatabase) => void;
  onAssignmentsChange: (assignments: AssignmentRecord[]) => void;
  onOpenArtBinder?: (filter: ArtBinderInitialFilter | null) => void;
}

type RoadmapViewMode = "milestones" | "my-tasks" | "xp";

export function RoadmapPage({
  database,
  readOnly,
  currentUser,
  teamMembers,
  assignments,
  onDatabaseChange,
  onAssignmentsChange,
  onOpenArtBinder
}: RoadmapPageProps) {
  const roadmap = useMemo(() => normalizeRoadmapData(database.roadmap), [database.roadmap]);
  const binderCards = useMemo(() => buildArtBinderCards(database), [database]);
  const binderCardMap = useMemo(() => new Map(binderCards.map((card) => [roadmapBinderSlotId(card), card] as const)), [binderCards]);
  const currentMember = currentUser ? getTeamMemberForGoogleUser(currentUser, teamMembers) : null;
  const isAdmin = currentUser?.role === "admin" || currentMember?.permission === "owner" || currentMember?.permission === "admin";
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(roadmap.milestones[0]?.id || "");
  const [filter, setFilter] = useState<RoadmapFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<RoadmapViewMode>("milestones");
  const [uploadingItemId, setUploadingItemId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (selectedMilestoneId && roadmap.milestones.some((milestone) => milestone.id === selectedMilestoneId)) return;
    setSelectedMilestoneId(roadmap.milestones[0]?.id || "");
  }, [roadmap.milestones, selectedMilestoneId]);

  useEffect(() => {
    if (readOnly || roadmap.items.length || !binderCards.length) return;
    const seeded = seedRoadmapItemsFromBinder(roadmap.milestones, binderCards);
    if (!seeded.length) return;
    onDatabaseChange({
      ...database,
      roadmap: {
        ...roadmap,
        items: seeded,
        updatedAt: new Date().toISOString()
      }
    });
  }, [binderCards, database, onDatabaseChange, readOnly, roadmap]);

  const items = useMemo(
    () => roadmap.items.map((item) => deriveRoadmapItemView(item, binderCardMap)),
    [binderCardMap, roadmap.items]
  );
  const selectedMilestone = roadmap.milestones.find((milestone) => milestone.id === selectedMilestoneId) || roadmap.milestones[0];
  const teammateName = (id: string) => teamMembers.find((member) => member.id === id || member.email === id)?.name || id || "Unassigned";
  const milestoneTitle = (id: string) => roadmap.milestones.find((milestone) => milestone.id === id)?.title || id;
  const visibleItems = filterRoadmapItems(items, filter, search, {
    currentUserId: currentMember?.id,
    currentUserEmail: currentUser?.email,
    teammateNameForId: teammateName,
    milestoneTitleForId: milestoneTitle
  });
  const selectedItems = viewMode === "my-tasks"
    ? visibleItems.filter((item) => item.assignedTo === currentMember?.id || item.assignedTo === currentUser?.email)
    : visibleItems.filter((item) => !selectedMilestone || item.milestoneId === selectedMilestone.id);
  const allStats = calculateRoadmapStats(items);
  const xp = calculateRoadmapXp(items, roadmap.milestones);

  const saveRoadmap = (patch: Partial<LoreDatabase["roadmap"]>) => {
    onDatabaseChange({
      ...database,
      roadmap: normalizeRoadmapData({
        ...roadmap,
        ...patch,
        updatedAt: new Date().toISOString()
      })
    });
  };

  const updateItem = (itemId: string, patch: Partial<RoadmapItem>, historyNote = "") => {
    const timestamp = new Date().toISOString();
    saveRoadmap({
      items: roadmap.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
              revisionHistory: historyNote
                ? [
                    ...(item.revisionHistory || []),
                    {
                      id: `revision-${Date.now()}`,
                      action: patch.status ? "status-change" : "assigned",
                      note: historyNote,
                      authorId: currentMember?.id || currentUser?.email || "",
                      authorName: currentMember?.name || currentUser?.name || "Unknown",
                      createdAt: timestamp
                    }
                  ]
                : item.revisionHistory,
              updatedAt: timestamp
            }
          : item
      )
    });
  };

  const handleStatusChange = (item: RoadmapItemView, status: RoadmapItemStatus, note = "") => {
    const card = binderCardMap.get(item.binderSlotId);
    if (status === "approved" && card?.slot.image) {
      const slot = artBinderImageManagerSlot(card);
      const imageDraft: ImageManagerSlotDraft = {
        ...slot,
        imageUrl: slot.imageUrl,
        imageFit: normalizeImageFit(slot.imageFit),
        webViewLink: slot.webViewLink,
        defaultFolderId: slot.defaultFolderId,
        defaultFolderLink: slot.defaultFolderLink,
        defaultFolderName: slot.defaultFolderName,
        assetState: "final"
      };
      const updatedDatabase = updateDatabaseSlotImage(database, card, imageDraft);
      onDatabaseChange({
        ...updatedDatabase,
        roadmap: {
          ...updatedDatabase.roadmap,
          items: updatedDatabase.roadmap.items.map((candidate) =>
            candidate.id === item.id ? { ...candidate, status, updatedAt: new Date().toISOString() } : candidate
          )
        }
      });
      return;
    }
    updateItem(item.id, { status }, note || roadmapStatusLabel(status));
  };

  const handleAssign = (item: RoadmapItemView, teammateId: string) => {
    const member = teamMembers.find((candidate) => candidate.id === teammateId);
    updateItem(item.id, {
      assignedTo: teammateId,
      status: teammateId && item.liveStatus === "missing" ? "assigned" : item.status
    }, teammateId ? `Assigned to ${member?.name || teammateId}.` : "Unassigned.");
    if (!member || !currentMember) return;
    const card = binderCardMap.get(item.binderSlotId);
    const module = card ? artBinderSlotModule(card) : {
      moduleId: `roadmap-${item.id}`,
      moduleTitle: item.title,
      moduleType: "roadmap-item",
      entryId: item.id,
      entryTitle: item.title,
      entryCategory: `Roadmap / ${item.category}`,
      targetRoute: `roadmap:${item.milestoneId}:${item.id}`
    };
    const assignmentModule = {
      ...module,
      moduleId: `roadmap-${item.id}`,
      moduleTitle: item.title,
      moduleType: "roadmap-item",
      entryCategory: `Roadmap / ${item.category}`,
      targetRoute: `roadmap:${item.milestoneId}:${item.id}`
    };
    const existing = assignments.find((assignment) => assignment.moduleId === assignmentModule.moduleId);
    const nextAssignment = existing
      ? {
          ...existing,
          assignedToUserId: member.id,
          assignedToName: member.name,
          assignedToRole: member.role,
          dueDate: item.dueDate,
          updatedAt: new Date().toISOString()
        }
      : createAssignment(assignmentModule, member, currentMember, {
          category: item.category,
          note: item.notes,
          dueDate: item.dueDate
        });
    onAssignmentsChange(existing
      ? assignments.map((assignment) => assignment.id === existing.id ? nextAssignment : assignment)
      : [nextAssignment, ...assignments]
    );
  };

  const handleUpload = async (item: RoadmapItemView, file: File, approveImmediately: boolean) => {
    const card = binderCardMap.get(item.binderSlotId);
    if (!card) {
      setMessage("That roadmap item is missing its linked Art Binder slot.");
      return;
    }
    setUploadingItemId(item.id);
    setMessage(`Uploading ${file.name}...`);
    try {
      const nextDatabase = await uploadRoadmapItemFile({
        database,
        item,
        card,
        file,
        currentUser,
        approveImmediately
      });
      onDatabaseChange(nextDatabase);
      setMessage(approveImmediately ? "Roadmap upload approved and saved to Art Binder." : "Roadmap upload saved to Art Binder and sent to review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Roadmap upload failed.");
    } finally {
      setUploadingItemId("");
    }
  };

  const openBinderSlot = (item: RoadmapItemView) => {
    const card = binderCardMap.get(item.binderSlotId);
    if (!card) return;
    onOpenArtBinder?.({
      kind: card.subject.kind,
      groupKey: card.subject.groupKey,
      subjectId: card.subject.id,
      category: card.section.title
    });
  };

  return (
    <section className="roadmap-page">
      <header className="roadmap-hero">
        <div>
          <p>Tavern Quest Board</p>
          <h1 className="font-display">Roadmap</h1>
          <span>Milestone production board linked to Art Binder slots, Drive folders, assignments, reviews, and build readiness.</span>
        </div>
        <div className="roadmap-hero-stats">
          <article>
            <strong>{allStats.progress}%</strong>
            <span>Total Progress</span>
          </article>
          <article>
            <strong>{xp.teamXp}</strong>
            <span>Team XP</span>
          </article>
          <article>
            <strong>{allStats.buildReady ? "Ready" : "Not Ready"}</strong>
            <span>Build Status</span>
          </article>
        </div>
      </header>

      <div className="roadmap-view-tabs">
        <button className={viewMode === "milestones" ? "active" : ""} onClick={() => setViewMode("milestones")}>
          <Icon name="Map" className="h-4 w-4" />
          Milestones
        </button>
        <button className={viewMode === "my-tasks" ? "active" : ""} onClick={() => setViewMode("my-tasks")}>
          <Icon name="UserCheck" className="h-4 w-4" />
          My Roadmap Tasks
        </button>
        <button className={viewMode === "xp" ? "active" : ""} onClick={() => setViewMode("xp")}>
          <Icon name="Sparkles" className="h-4 w-4" />
          Team XP
        </button>
      </div>

      <RoadmapFilters filter={filter} search={search} onFilterChange={setFilter} onSearchChange={setSearch} />
      {message && <div className={`roadmap-message ${uploadingItemId ? "busy" : ""}`}>{message}</div>}

      {viewMode === "xp" ? (
        <RoadmapXpPanel items={items} milestones={roadmap.milestones} teamMembers={teamMembers} />
      ) : (
        <>
          {viewMode === "milestones" && (
            <RoadmapMilestoneList
              milestones={roadmap.milestones}
              items={items}
              selectedMilestoneId={selectedMilestone?.id || ""}
              onSelectMilestone={setSelectedMilestoneId}
            />
          )}

          {selectedMilestone && (
            <RoadmapMilestoneDetail
              milestone={viewMode === "my-tasks" ? myTasksMilestone(selectedMilestone) : selectedMilestone}
              items={selectedItems}
              allItems={items}
              binderCards={binderCardMap}
              teamMembers={teamMembers}
              readOnly={readOnly}
              canReview={isAdmin}
              teammateName={teammateName}
              onOpenBinderSlot={openBinderSlot}
              onUploadFile={handleUpload}
              onAssign={handleAssign}
              onReviewerChange={(item, reviewer) => updateItem(item.id, { reviewer }, reviewer ? `Reviewer set to ${teammateName(reviewer)}.` : "Reviewer cleared.")}
              onStatusChange={handleStatusChange}
              onUpdateNotes={(item, notes) => updateItem(item.id, { notes })}
            />
          )}
        </>
      )}

      {isAdmin && !readOnly && selectedMilestone && (
        <RoadmapAdminEditor
          milestone={selectedMilestone}
          milestones={roadmap.milestones}
          items={roadmap.items}
          binderCards={binderCards}
          teamMembers={teamMembers}
          onMilestonesChange={(milestones) => saveRoadmap({ milestones })}
          onItemsChange={(nextItems) => saveRoadmap({ items: nextItems })}
        />
      )}
    </section>
  );
}

function buildArtBinderCards(database: LoreDatabase) {
  return buildArtBinderSubjects(database).flatMap((subject) =>
    subject.sections.flatMap((section) =>
      section.slots.map((slot) => ({ subject, section, slot }))
    )
  );
}

function roadmapBinderSlotId(card: ArtBinderSlotCard) {
  return artBinderSlotModule(card).moduleId;
}

function deriveRoadmapItemView(item: RoadmapItem, binderCards: Map<string, ArtBinderSlotCard>): RoadmapItemView {
  const card = binderCards.get(item.binderSlotId);
  const liveStatus = card ? liveStatusFromBinder(item, card) : item.status || "missing";
  const driveFolderId = card?.section.driveFolderId || card?.slot.image?.driveFolderId || item.googleDriveFolderId || "";
  return {
    ...item,
    liveStatus,
    liveDriveFolderId: driveFolderId,
    liveDriveFolderPath: card ? artVaultDriveFolderPathLabel(artBinderDriveContext(card)) : item.driveFolderPath,
    liveUploadedFileIds: card?.slot.image?.driveFileId ? [card.slot.image.driveFileId] : item.uploadedFileIds || [],
    binderSlotMissing: !card
  };
}

function liveStatusFromBinder(item: RoadmapItem, card: ArtBinderSlotCard): RoadmapItemStatus {
  if (item.status === "blocked" || item.status === "revision-needed") return item.status;
  const binderStatus = artBinderStatus(card.slot);
  if (binderStatus === "Final") return item.status === "complete" ? "complete" : "approved";
  if (binderStatus === "Needs Revision") return "revision-needed";
  if (binderStatus === "WIP") {
    if (item.status === "approved" || item.status === "complete") return item.status;
    return item.status === "uploaded" ? "uploaded" : "needs-review";
  }
  if (item.assignedTo && item.status === "missing") return "assigned";
  return item.status || "missing";
}

function seedRoadmapItemsFromBinder(milestones: RoadmapMilestone[], cards: ArtBinderSlotCard[]) {
  const primaryMilestoneId = milestones[0]?.id || "milestone-whisker-woods-vertical-slice";
  return cards
    .filter((card) => !card.slot.label.toLowerCase().includes("unused"))
    .slice(0, 48)
    .map((card, index) => {
      const priority = index < 12 ? "high" : index < 28 ? "medium" : "low";
      return createRoadmapItem({
        milestoneId: primaryMilestoneId,
        title: `${card.subject.title} - ${card.slot.label}`,
        category: categoryForBinderCard(card),
        type: card.slot.requirementType || card.section.title,
        priority,
        status: artBinderStatus(card.slot) === "Final" ? "approved" : artBinderStatus(card.slot) === "WIP" ? "needs-review" : "missing",
        binderSlotId: roadmapBinderSlotId(card),
        driveFolderPath: artVaultDriveFolderPathLabel(artBinderDriveContext(card)),
        googleDriveFolderId: card.section.driveFolderId || "",
        buildTier: index < 24 ? "required" : index < 40 ? "polish" : "optional",
        requiredFileTypes: card.section.title.toLowerCase().includes("sprite") ? ["PNG", "Sprite Sheet"] : ["PNG", "PSD"],
        notes: card.slot.notes || ""
      });
    });
}

function categoryForBinderCard(card: ArtBinderSlotCard) {
  const section = card.section.title.toLowerCase();
  if (section.includes("sprite") || section.includes("animation")) return "Animation";
  if (card.subject.kind === "environment") return "Environment Art";
  if (card.subject.kind === "pantry") return "UI";
  if (card.subject.kind === "bestiary") return "Enemy Art";
  return "Character Art";
}

function myTasksMilestone(base: RoadmapMilestone): RoadmapMilestone {
  return {
    ...base,
    title: "My Roadmap Tasks",
    description: "Every roadmap quest assigned to the signed-in teammate."
  };
}

function RoadmapXpPanel({
  items,
  milestones,
  teamMembers
}: {
  items: RoadmapItemView[];
  milestones: RoadmapMilestone[];
  teamMembers: TeamMember[];
}) {
  const xp = calculateRoadmapXp(items, milestones);
  return (
    <section className="roadmap-xp-panel">
      <header>
        <p>Team XP</p>
        <h2>{xp.teamXp} XP Earned</h2>
        <span>{xp.itemXp} from served quests and {xp.milestoneBonus} from completed milestone feasts.</span>
      </header>
      <div className="roadmap-xp-grid">
        {teamMembers.map((member) => {
          const amount = xp.byAssignee.get(member.id) || 0;
          return (
            <article key={member.id}>
              <strong>{member.name}</strong>
              <span>{member.department || member.role}</span>
              <b>{amount} XP</b>
              <small>{badgeForXp(amount)}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function badgeForXp(xp: number) {
  if (xp >= 300) return "Master Chef";
  if (xp >= 120) return "Line Cook";
  if (xp >= 40) return "Prep Cook";
  return "New Apron";
}
