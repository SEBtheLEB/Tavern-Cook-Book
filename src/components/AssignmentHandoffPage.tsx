import { useEffect, useMemo, useRef, useState } from "react";
import workshopLogo from "../assets/stl-workshop-logo.png";
import type { GoogleAccountUser, LoreDatabase, LoreEntry } from "../types";
import {
  getAssignmentsForUser,
  getTeamMemberForGoogleUser,
  statusDisplay,
  type AssignmentRecord,
  type TeamMember
} from "../utils/assignments";
import { ensureGwenToolArtVault, isGwenToolArtVaultSection } from "../utils/entries";
import {
  artBinderImageManagerSlot,
  artBinderImagePreviewSource,
  buildArtBinderSubjects,
  updateDatabaseSlotImage,
  type ArtBinderSlotCard,
  type ArtBinderSubject
} from "./ArtBinderPage";
import { DriveAwareImage } from "./DriveAwareImage";
import { Icon } from "./Icon";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { useAssignments } from "./AssignmentSystem";

interface AssignmentHandoffPageProps {
  assignmentIds: string[];
  assignments: AssignmentRecord[];
  teamMembers: TeamMember[];
  currentUser: GoogleAccountUser;
  database: LoreDatabase;
  ready: boolean;
  onDatabaseChange: (database: LoreDatabase) => void;
  onOpenAssignment: (assignment: AssignmentRecord) => void;
}

export function AssignmentHandoffPage({
  assignmentIds,
  assignments,
  teamMembers,
  currentUser,
  database,
  ready,
  onDatabaseChange,
  onOpenAssignment
}: AssignmentHandoffPageProps) {
  const assignmentContext = useAssignments();
  const databaseRef = useRef(database);
  const [editing, setEditing] = useState<{ assignment: AssignmentRecord; card: ArtBinderSlotCard } | null>(null);
  const currentMember = useMemo(
    () => getTeamMemberForGoogleUser(currentUser, teamMembers),
    [currentUser, teamMembers]
  );

  useEffect(() => {
    databaseRef.current = database;
  }, [database]);

  const requestedAssignments = useMemo(() => {
    const requestedIds = new Set(assignmentIds);
    const requested = assignments.filter((assignment) => requestedIds.has(assignment.id));
    if (currentUser.role === "admin") return requested;
    const allowedIds = new Set(
      getAssignmentsForUser(assignments, currentMember.id, currentUser.email).map((assignment) => assignment.id)
    );
    return requested.filter((assignment) => allowedIds.has(assignment.id));
  }, [assignmentIds, assignments, currentMember.id, currentUser.email, currentUser.role]);

  const artCards = useMemo(() => buildAssignmentArtCards(database), [database]);
  const resolvedAssignments = useMemo(() => requestedAssignments.map((assignment) => ({
    assignment,
    card: findAssignmentCard(assignment, artCards)
  })), [artCards, requestedAssignments]);

  const saveSlot = (assignment: AssignmentRecord, card: ArtBinderSlotCard, slots: ImageManagerSlotDraft[], close: boolean) => {
    const slot = slots[0];
    if (!slot) return;
    const nextDatabase = updateDatabaseSlotImage(databaseRef.current, card, slot);
    databaseRef.current = nextDatabase;
    onDatabaseChange(nextDatabase);
    if (slot.imageUrl || slot.spriteAnimation) {
      assignmentContext.setAssignmentStatus(assignment.id, "needs-review");
    }
    if (close) setEditing(null);
  };

  const leaveAssignmentView = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("assignment");
    window.location.assign(url.pathname + url.search + url.hash);
  };

  const waitingForTeamData = !requestedAssignments.length && (!ready || !assignments.length);

  return (
    <main className="assignment-handoff-page">
      <header className="assignment-handoff-brand">
        <div className="assignment-handoff-logo">
          <img src={workshopLogo} alt="STL Productionz" />
        </div>
        <div>
          <span>STL Productionz</span>
          <strong className="font-display">Tales of the Tavern</strong>
        </div>
        <button type="button" onClick={leaveAssignmentView} title="Open the full Cook Book">
          <Icon name="LayoutDashboard" className="h-4 w-4" />
          Cook Book
        </button>
      </header>

      <section className="assignment-handoff-intro">
        <span className="assignment-handoff-kicker">Assigned Uploads</span>
        <h1 className="font-display">Your work is ready for you.</h1>
        <p>Choose a slot, upload the finished art, and the Cook Book handles its Drive folder and file name.</p>
        <div>
          <span><Icon name="UserRound" className="h-4 w-4" /> {currentMember.name}</span>
          <span><Icon name="ListChecks" className="h-4 w-4" /> {resolvedAssignments.length} slot{resolvedAssignments.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      {waitingForTeamData ? (
        <section className="assignment-handoff-state">
          <Icon name="CircleDashed" className="h-8 w-8 assignment-handoff-spinner" />
          <strong>Loading your assigned slots...</strong>
          <span>Syncing the latest Cook Book assignment data.</span>
        </section>
      ) : resolvedAssignments.length ? (
        <section className="assignment-handoff-grid" aria-label="Assigned upload slots">
          {resolvedAssignments.map(({ assignment, card }) => (
            <article key={assignment.id} className={`assignment-handoff-card status-${assignment.status}`}>
              <button
                type="button"
                className="assignment-handoff-card-main"
                onClick={() => card ? setEditing({ assignment, card }) : onOpenAssignment(assignment)}
              >
                <span className="assignment-handoff-preview">
                  {card && artBinderImagePreviewSource(card.slot.image) ? (
                    <DriveAwareImage src={artBinderImagePreviewSource(card.slot.image)} alt="" />
                  ) : (
                    <Icon name={card ? "Upload" : "FileText"} className="h-10 w-10" />
                  )}
                </span>
                <span className="assignment-handoff-copy">
                  <small>{assignment.entryCategory}</small>
                  <strong>{assignment.moduleTitle}</strong>
                  {assignment.note && <em>{assignment.note}</em>}
                  <span className="assignment-handoff-status">{statusDisplay(assignment.status)}</span>
                </span>
                <span className="assignment-handoff-upload-button">
                  <Icon name={card ? "Upload" : "ExternalLink"} className="h-5 w-5" />
                  {card ? "Upload" : "Open"}
                </span>
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="assignment-handoff-state">
          <Icon name="ShieldAlert" className="h-8 w-8" />
          <strong>This assignment link is not available for this account.</strong>
          <span>Sign in with the email that received the assignment, or ask the assigner for a fresh link.</span>
          <button type="button" className="button-frame" onClick={leaveAssignmentView}>Open Cook Book</button>
        </section>
      )}

      <footer className="assignment-handoff-footer">
        <Icon name="UploadCloud" className="h-4 w-4" />
        Uploads save to the shared Cook Book and the correct Google Drive folder.
      </footer>

      {editing && (
        <ImageManagerModal
          title={editing.assignment.moduleTitle}
          subtitle="Upload or import the asset. It will be named, filed in Google Drive, and saved back to this shared slot automatically."
          slots={[artBinderImageManagerSlot(editing.card)]}
          onClose={() => setEditing(null)}
          onSave={(slots) => saveSlot(editing.assignment, editing.card, slots, true)}
          onAutoSave={(slots) => saveSlot(editing.assignment, editing.card, slots, false)}
          simpleUpload
        />
      )}
    </main>
  );
}

function buildAssignmentArtCards(database: LoreDatabase) {
  const standardCards = buildArtBinderSubjects(database).flatMap((subject) =>
    subject.sections.flatMap((section) => section.slots.map((slot) => ({ subject, section, slot })))
  );
  const gwenToolCards = database.entries
    .filter((entry) => isCharacterEntry(entry) && /\bgwen\b/i.test(entry.title))
    .flatMap((entry) => {
      const subject: ArtBinderSubject = {
        id: entry.id,
        kind: "character",
        source: "character",
        title: entry.title,
        subtitle: entry.type || "Character",
        groupKey: "character-all",
        groupLabel: "Characters",
        sections: ensureGwenToolArtVault(entry.artVault).sections.filter(isGwenToolArtVaultSection)
      };
      return subject.sections.flatMap((section) => section.slots.map((slot) => ({ subject, section, slot })));
    });
  return [...standardCards, ...gwenToolCards];
}

function findAssignmentCard(assignment: AssignmentRecord, cards: ArtBinderSlotCard[]) {
  const route = assignment.targetRoute.split(":");
  if (route[0] === "art-binder") {
    const subjectId = route[2] || assignment.entryId;
    const sectionId = decodeRoutePart(route[4]);
    const slotId = decodeRoutePart(route[5]);
    return cards.find((card) => card.subject.id === subjectId && card.section.id === sectionId && card.slot.id === slotId) || null;
  }
  if ((route[0] === "character" || route[0] === "bestiary") && route[2] === "art-vault") {
    const subjectId = route[1] || assignment.entryId;
    const sectionId = decodeRoutePart(route[3]);
    const slotId = decodeRoutePart(route[4]);
    return cards.find((card) => card.subject.id === subjectId && card.section.id === sectionId && card.slot.id === slotId) || null;
  }
  return null;
}

function decodeRoutePart(value = "") {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isCharacterEntry(entry: LoreEntry) {
  return /character/i.test(entry.category) || /character/i.test(entry.type);
}
