import { useMemo, useState } from "react";
import type { GoogleAccountUser } from "../types";
import {
  type AssignmentRecord,
  type AssignmentStatus,
  type QuestCategory,
  type TeamMember,
  getAssignmentsForUser,
  getTeamMemberForGoogleUser,
  saveAssignments,
  saveQuestCategories,
  slugifyAssignment,
  statusDisplay,
  updateAssignmentStatus
} from "../utils/assignments";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { Icon } from "./Icon";

interface QuestDashboardProps {
  currentUser: GoogleAccountUser;
  assignments: AssignmentRecord[];
  teamMembers: TeamMember[];
  questCategories: QuestCategory[];
  onAssignmentsChange: (assignments: AssignmentRecord[]) => void;
  onQuestCategoriesChange: (categories: QuestCategory[]) => void;
  onOpenAssignment: (assignment: AssignmentRecord) => void;
  onBack: () => void;
}

const statusFilters = ["All", "Not Started", "WIP", "Done", "Needs Review"];
const defaultQuestTags = [
  "Fun",
  "Creative",
  "Quick Win",
  "Huge",
  "Tedious",
  "Tiring",
  "Research",
  "Tricky",
  "Blocked",
  "Polish",
  "Spicy",
  "Chill"
];
const questTagLimit = 8;
type QuestDashboardView = "categories" | "sticky";

export function QuestDashboard({
  currentUser,
  assignments,
  teamMembers,
  questCategories,
  onAssignmentsChange,
  onQuestCategoriesChange,
  onOpenAssignment,
  onBack
}: QuestDashboardProps) {
  const [filter, setFilter] = useState("All");
  const [labelFilter, setLabelFilter] = useState("All Labels");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("Newest");
  const [viewMode, setViewMode] = useState<QuestDashboardView>("categories");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [newCategoryName, setNewCategoryName] = useState("");
  const userMember = getTeamMemberForGoogleUser(currentUser, teamMembers);
  const userAssignments = useMemo(
    () => getAssignmentsForUser(assignments, userMember.id, currentUser.email),
    [assignments, currentUser.email, userMember.id]
  );
  const visibleAssignments = useMemo(
    () => sortAssignments(userAssignments, sortMode)
      .filter((assignment) => filterMatches(assignment, filter))
      .filter((assignment) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [
          assignment.moduleTitle,
          assignment.entryTitle,
          assignment.entryCategory,
          assignment.note,
          assignment.category,
          assignment.assignedByName,
          ...(assignment.moodLabels || [])
        ].some((value) => value.toLowerCase().includes(query));
      })
      .filter((assignment) => labelFilter === "All Labels" || (assignment.moodLabels || []).includes(labelFilter)),
    [filter, labelFilter, search, sortMode, userAssignments]
  );
  const allTagOptions = useMemo(
    () => uniqueTagLabels([...defaultQuestTags, ...userAssignments.flatMap((assignment) => assignment.moodLabels || [])]),
    [userAssignments]
  );
  const tagFilterOptions = labelFilter !== "All Labels" && !allTagOptions.includes(labelFilter)
    ? ["All Labels", labelFilter, ...allTagOptions]
    : ["All Labels", ...allTagOptions];

  const stats = {
    total: userAssignments.length,
    notStarted: userAssignments.filter((assignment) => assignment.status === "not-started").length,
    wip: userAssignments.filter((assignment) => assignment.status === "wip").length,
    done: userAssignments.filter((assignment) => assignment.status === "done").length,
    review: userAssignments.filter((assignment) => assignment.status === "needs-review").length
  };
  const completedPercent = statsPercent(userAssignments);
  const activeCount = stats.total - stats.done;

  const setStatus = (assignmentId: string, status: AssignmentStatus) => {
    const next = updateAssignmentStatus(assignments, assignmentId, status);
    saveAssignments(next);
    onAssignmentsChange(next);
  };

  const setMoodLabels = (assignmentId: string, moodLabels: string[]) => {
    const next = assignments.map((assignment) =>
      assignment.id === assignmentId
        ? { ...assignment, moodLabels: uniqueTagLabels(moodLabels).slice(0, questTagLimit), updatedAt: new Date().toISOString() }
        : assignment
    );
    saveAssignments(next);
    onAssignmentsChange(next);
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const next = [
      ...questCategories,
      {
        id: `custom-${slugifyAssignment(name)}-${Date.now()}`,
        name,
        isDefault: false,
        order: questCategories.length
      }
    ];
    saveQuestCategories(next);
    onQuestCategoriesChange(next);
    setNewCategoryName("");
  };

  const renameCategory = (categoryId: string, name: string) => {
    const next = questCategories.map((category) => category.id === categoryId ? { ...category, name } : category);
    saveQuestCategories(next);
    onQuestCategoriesChange(next);
  };

  const deleteCategory = (categoryId: string) => {
    const category = questCategories.find((item) => item.id === categoryId);
    if (!category || category.isDefault) return;
    const used = assignments.some((assignment) => assignment.category === category.name);
    if (used) {
      window.alert("Only empty custom categories can be deleted.");
      return;
    }
    const next = questCategories.filter((item) => item.id !== categoryId);
    saveQuestCategories(next);
    onQuestCategoriesChange(next);
  };

  return (
    <div className="quest-dashboard-page">
      <button className="button-frame quest-back-button" onClick={onBack}>
        <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
        Back
      </button>

      <section className="quest-dashboard-header">
        <div className="quest-profile-avatar">
          {userMember.avatar || currentUser.picture ? (
            <DriveAwareImage src={userMember.avatar || currentUser.picture || ""} alt="" />
          ) : (
            <Icon name="UserRound" className="h-9 w-9" />
          )}
        </div>
        <div>
          <p>Personal Quest Dashboard</p>
          <h1 className="font-display">{userMember.name || currentUser.name}</h1>
          <span>{userMember.role || currentUser.role}</span>
        </div>
        <div className="quest-stat-grid">
          <QuestStat label="Assigned" value={stats.total} />
          <QuestStat label="Ready" value={stats.notStarted} />
          <QuestStat label="WIP" value={stats.wip} />
          <QuestStat label="Done" value={stats.done} />
          <QuestStat label="Review" value={stats.review} />
        </div>
        <div className="quest-progress-panel">
          <div>
            <span>Quest Progress</span>
            <strong>{completedPercent}% Complete</strong>
            <small>{stats.done} done / {activeCount} active</small>
          </div>
          <div className="quest-progress-track" aria-label={`Quest progress ${completedPercent}%`}>
            <i style={{ width: `${completedPercent}%` }} />
          </div>
        </div>
      </section>

      <section className="quest-filter-panel">
        <label className="quest-search">
          <Icon name="Search" className="h-4 w-4" />
          <input value={search} placeholder="Search assignments..." onChange={(event) => setSearch(event.target.value)} />
        </label>
        <CustomSelect value={sortMode} onChange={setSortMode} options={["Newest", "Due Date", "Status", "Entry Type", "Fun First", "Quick Wins", "Most Tags"]} />
        <CustomSelect value={labelFilter} onChange={setLabelFilter} options={tagFilterOptions} />
        <div className="quest-view-switch" role="tablist" aria-label="Quest board view">
          <button className={viewMode === "categories" ? "active" : ""} onClick={() => setViewMode("categories")}>
            <Icon name="ScrollText" className="h-4 w-4" />
            Categories
          </button>
          <button className={viewMode === "sticky" ? "active" : ""} onClick={() => setViewMode("sticky")}>
            <Icon name="StickyNote" className="h-4 w-4" />
            Sticky Wall
          </button>
        </div>
        <div className="quest-status-filters">
          {statusFilters.map((item) => (
            <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="quest-category-tools">
        <input value={newCategoryName} placeholder="New quest category..." onChange={(event) => setNewCategoryName(event.target.value)} />
        <button className="button-frame" onClick={addCategory}>
          <Icon name="Plus" className="h-4 w-4" />
          Add Category
        </button>
      </section>

      {viewMode === "sticky" ? (
        <section className="quest-sticky-wall" aria-label="Quest sticky note wall">
          <header>
            <div>
              <p>Sticky Wall</p>
              <h2 className="font-display">All Visible Quests</h2>
            </div>
            <span>{visibleAssignments.length} note{visibleAssignments.length === 1 ? "" : "s"}</span>
          </header>
          {visibleAssignments.length ? (
            <div className="quest-sticky-grid">
              {visibleAssignments.map((assignment, index) => (
                <QuestStickyNote
                  key={assignment.id}
                  assignment={assignment}
                  tone={index}
                  onOpen={() => onOpenAssignment(assignment)}
                />
              ))}
            </div>
          ) : (
            <p className="quest-empty">No quests match these filters yet.</p>
          )}
        </section>
      ) : (
        <section className="quest-category-list">
          {questCategories.map((category) => {
            const categoryAssignments = visibleAssignments.filter((assignment) => assignment.category === category.name);
            if (!categoryAssignments.length && filter !== "All" && search.trim()) return null;
            const isCollapsed = collapsed.has(category.id);
            return (
              <article key={category.id} className="quest-category-section">
                <header>
                  <button onClick={() => toggleCategory(category.id)}>
                    <Icon name="ChevronDown" className={`h-4 w-4 ${isCollapsed ? "-rotate-90" : ""}`} />
                    <strong>{category.name}</strong>
                    <span>{categoryAssignments.length}</span>
                  </button>
                  {!category.isDefault && (
                    <div>
                      <input value={category.name} onChange={(event) => renameCategory(category.id, event.target.value)} />
                      <button onClick={() => deleteCategory(category.id)}>Delete</button>
                    </div>
                  )}
                </header>
                {!isCollapsed && (
                  <div className="quest-card-grid">
                    {categoryAssignments.map((assignment) => (
                      <QuestCard
                        key={assignment.id}
                        assignment={assignment}
                        tagOptions={allTagOptions}
                        onOpen={() => onOpenAssignment(assignment)}
                        onStatusChange={(status) => setStatus(assignment.id, status)}
                        onLabelsChange={(labels) => setMoodLabels(assignment.id, labels)}
                      />
                    ))}
                    {!categoryAssignments.length && (
                      <p className="quest-empty">No active assignments in this category.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function QuestStat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function QuestCard({
  assignment,
  tagOptions,
  onOpen,
  onStatusChange,
  onLabelsChange
}: {
  assignment: AssignmentRecord;
  tagOptions: string[];
  onOpen: () => void;
  onStatusChange: (status: AssignmentStatus) => void;
  onLabelsChange: (labels: string[]) => void;
}) {
  const [labelOpen, setLabelOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const moodLabels = assignment.moodLabels || [];
  const toggleLabel = (label: string) => {
    if (moodLabels.includes(label)) {
      onLabelsChange(moodLabels.filter((item) => item !== label));
      return;
    }
    if (moodLabels.length >= questTagLimit) return;
    onLabelsChange(uniqueTagLabels([...moodLabels, label]).slice(0, questTagLimit));
  };
  const addCustomLabel = () => {
    const normalized = normalizeQuestTag(customLabel);
    if (!normalized || moodLabels.length >= questTagLimit) return;
    onLabelsChange(uniqueTagLabels([...moodLabels, normalized]).slice(0, questTagLimit));
    setCustomLabel("");
  };

  return (
    <article className={`quest-assignment-card status-${assignment.status}`}>
      <div className="quest-card-topline">
        <span className={`quest-status-badge status-${assignment.status}`}>{statusDisplay(assignment.status)}</span>
        {assignment.dueDate && <span className="quest-due-date">Due {assignment.dueDate}</span>}
      </div>
      <h3 className="font-display">{assignment.moduleTitle}</h3>
      <p>{assignment.entryTitle}</p>
      <small>{assignment.entryCategory}</small>
      {assignment.note && <em>{assignment.note}</em>}
      <span>Assigned by {assignment.assignedByName}</span>
      <div className="quest-card-labels">
        {moodLabels.length ? moodLabels.map((label) => (
          <span key={label}>{label}</span>
        )) : <small>No labels yet</small>}
      </div>
      <div className="quest-label-menu-wrap">
        <button className="quest-label-button" onClick={() => setLabelOpen((value) => !value)}>
          <Icon name="Tags" className="h-4 w-4" />
          Labels
          <small>{moodLabels.length}/{questTagLimit}</small>
        </button>
        {labelOpen && (
          <div className="quest-label-menu">
            <strong>Quest Tags</strong>
            <p>Pick premade tags or add your own custom tag for this task.</p>
            <div className="quest-custom-tag-row">
              <input
                value={customLabel}
                placeholder="Custom tag..."
                maxLength={32}
                onChange={(event) => setCustomLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addCustomLabel();
                }}
              />
              <button type="button" onClick={addCustomLabel} disabled={!normalizeQuestTag(customLabel) || moodLabels.length >= questTagLimit}>
                Add
              </button>
            </div>
            <div className="quest-tag-preset-grid">
              {tagOptions.map((label) => {
                const active = moodLabels.includes(label);
                const disabled = !active && moodLabels.length >= questTagLimit;
                return (
                  <button
                    key={label}
                    className={active ? "active" : ""}
                    disabled={disabled}
                    onClick={() => toggleLabel(label)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <footer>
        <button className="button-frame primary" onClick={onOpen}>Open Module</button>
        <button onClick={() => onStatusChange("wip")}>Mark WIP</button>
        <button onClick={() => onStatusChange("done")}>Mark Done</button>
        <button onClick={() => onStatusChange("needs-review")}>Needs Review</button>
      </footer>
    </article>
  );
}

function statsPercent(assignments: AssignmentRecord[]) {
  if (!assignments.length) return 0;
  const done = assignments.filter((assignment) => assignment.status === "done").length;
  return Math.round((done / assignments.length) * 100);
}

function QuestStickyNote({
  assignment,
  tone,
  onOpen
}: {
  assignment: AssignmentRecord;
  tone: number;
  onOpen: () => void;
}) {
  const labels = assignment.moodLabels || [];
  return (
    <button
      type="button"
      className={`quest-sticky-note tone-${tone % 5} status-${assignment.status}`}
      onClick={onOpen}
    >
      <span className={`quest-status-badge status-${assignment.status}`}>{statusDisplay(assignment.status)}</span>
      <strong className="font-display">{assignment.moduleTitle}</strong>
      <small>{assignment.entryTitle}</small>
      <em>{assignment.entryCategory}</em>
      {assignment.note && <p>{assignment.note}</p>}
      <div className="quest-card-labels">
        {labels.length ? labels.slice(0, 5).map((label) => <span key={label}>{label}</span>) : <small>No tags yet</small>}
      </div>
      <span>{assignment.dueDate ? `Due ${assignment.dueDate}` : `Assigned by ${assignment.assignedByName}`}</span>
    </button>
  );
}

function filterMatches(assignment: AssignmentRecord, filter: string) {
  if (filter === "All") return true;
  if (filter === "Not Started") return assignment.status === "not-started";
  if (filter === "WIP") return assignment.status === "wip";
  if (filter === "Done") return assignment.status === "done";
  if (filter === "Needs Review") return assignment.status === "needs-review";
  return true;
}

function sortAssignments(assignments: AssignmentRecord[], sortMode: string) {
  return [...assignments].sort((left, right) => {
    if (sortMode === "Fun First") return tagSortScore(right, "Fun") - tagSortScore(left, "Fun") || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (sortMode === "Quick Wins") return tagSortScore(right, "Quick Win") - tagSortScore(left, "Quick Win") || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (sortMode === "Most Tags") return (right.moodLabels || []).length - (left.moodLabels || []).length;
    if (sortMode === "Due Date") return (left.dueDate || "9999").localeCompare(right.dueDate || "9999");
    if (sortMode === "Status") return left.status.localeCompare(right.status);
    if (sortMode === "Entry Type") return left.entryCategory.localeCompare(right.entryCategory);
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function tagSortScore(assignment: AssignmentRecord, tag: string) {
  return (assignment.moodLabels || []).some((label) => label.toLowerCase() === tag.toLowerCase()) ? 1 : 0;
}

function normalizeQuestTag(value: string) {
  return value
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
}

function uniqueTagLabels(labels: string[]) {
  const byKey = new Map<string, string>();
  labels.forEach((label) => {
    const normalized = normalizeQuestTag(label);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, normalized);
  });
  return [...byKey.values()];
}
