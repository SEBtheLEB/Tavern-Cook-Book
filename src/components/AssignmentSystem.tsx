import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ElementType, MouseEvent, ReactNode } from "react";
import type { GoogleAccountUser } from "../types";
import {
  type AssignableModuleInfo,
  type AssignmentRecord,
  type AssignmentStatus,
  type QuestCategory,
  type TeamMember,
  canAssignToOthers,
  canSelfAssign,
  createAssignment,
  getAssignmentForModule,
  getCurrentUserProfile,
  getTeamMemberForGoogleUser,
  saveAssignments,
  statusDisplay,
  statusLabel,
  updateAssignmentStatus
} from "../utils/assignments";
import { CustomSelect } from "./CustomSelect";
import { Icon } from "./Icon";

interface AssignmentContextValue {
  assignMode: boolean;
  assignments: AssignmentRecord[];
  currentUser: GoogleAccountUser;
  currentTeamMember: TeamMember;
  teamMembers: TeamMember[];
  questCategories: QuestCategory[];
  focusedAssignment: AssignmentRecord | null;
  openAssignPopup: (module: AssignableModuleInfo | AssignableModuleInfo[]) => void;
  openSelectedAssignPopup: () => void;
  selectedModuleCount: number;
  selectedModules: AssignableModuleInfo[];
  isModuleSelected: (moduleId: string) => boolean;
  toggleModuleSelection: (module: AssignableModuleInfo) => void;
  clearSelectedModules: () => void;
  assignmentForModule: (moduleId: string) => AssignmentRecord | null;
  setAssignmentStatus: (assignmentId: string, status: AssignmentStatus) => void;
  openQuestDashboard: () => void;
}

interface AssignmentProviderProps {
  assignMode: boolean;
  assignments: AssignmentRecord[];
  currentUser: GoogleAccountUser;
  teamMembers: TeamMember[];
  questCategories: QuestCategory[];
  focusedAssignment: AssignmentRecord | null;
  onAssignmentsChange: (assignments: AssignmentRecord[]) => void;
  onOpenQuestDashboard: () => void;
  children: ReactNode;
}

interface AssignPopupState {
  modules: AssignableModuleInfo[];
  note: string;
  dueDate: string;
  category: string;
  message: string;
  selectedModuleIds: string[];
}

const AssignmentContext = createContext<AssignmentContextValue | null>(null);

export function AssignmentProvider({
  assignMode,
  assignments,
  currentUser,
  teamMembers,
  questCategories,
  focusedAssignment,
  onAssignmentsChange,
  onOpenQuestDashboard,
  children
}: AssignmentProviderProps) {
  const [popup, setPopup] = useState<AssignPopupState | null>(null);
  const [selectedModulesById, setSelectedModulesById] = useState<Record<string, AssignableModuleInfo>>({});
  const currentTeamMember = useMemo(
    () => getTeamMemberForGoogleUser(currentUser, teamMembers),
    [currentUser, teamMembers]
  );
  const selectedModules = useMemo(() => Object.values(selectedModulesById), [selectedModulesById]);

  useEffect(() => {
    if (!assignMode) setSelectedModulesById({});
  }, [assignMode]);

  const updateAssignments = (next: AssignmentRecord[]) => {
    saveAssignments(next);
    onAssignmentsChange(next);
  };

  const setAssignmentStatus = (assignmentId: string, status: AssignmentStatus) => {
    updateAssignments(updateAssignmentStatus(assignments, assignmentId, status));
  };

  const assignTo = (teammate: TeamMember) => {
    if (!popup) return;
    const selectedPopupModules = popup.modules.filter((module) => popup.selectedModuleIds.includes(module.moduleId));
    if (!selectedPopupModules.length) {
      setPopup((current) => current ? { ...current, message: "Select at least one module in this batch first." } : current);
      return;
    }
    const canAssign = teammate.id === currentTeamMember.id
      ? canSelfAssign(currentTeamMember.permission)
      : canAssignToOthers(currentTeamMember.permission);
    if (!canAssign) {
      setPopup((current) => current ? { ...current, message: "You do not have permission to assign this to that teammate." } : current);
      return;
    }
    const duplicateModuleIds = new Set(
      assignments
        .filter((assignment) =>
          assignment.assignedToUserId === teammate.id &&
          assignment.status !== "done" &&
          selectedPopupModules.some((module) => module.moduleId === assignment.moduleId)
        )
        .map((assignment) => assignment.moduleId)
    );
    const assignableModules = selectedPopupModules.filter((module) => !duplicateModuleIds.has(module.moduleId));
    if (!assignableModules.length) {
      setPopup((current) => current ? { ...current, message: "That teammate already has this active assignment." } : current);
      return;
    }
    const nextAssignments = assignableModules.map((module) => createAssignment(module, teammate, currentTeamMember, {
      category: popup.category,
      note: popup.note,
      dueDate: popup.dueDate
    }));
    updateAssignments([...nextAssignments, ...assignments]);
    const assignedModuleIds = new Set(assignableModules.map((module) => module.moduleId));
    setSelectedModulesById((current) => {
      const next = { ...current };
      assignedModuleIds.forEach((moduleId) => delete next[moduleId]);
      return next;
    });
    const remainingModules = popup.modules.filter((module) => !assignedModuleIds.has(module.moduleId));
    if (!remainingModules.length) {
      setPopup(null);
      return;
    }
    setPopup({
      ...popup,
      modules: remainingModules,
      selectedModuleIds: remainingModules.map((module) => module.moduleId),
      message: `Assigned ${assignableModules.length} module${assignableModules.length === 1 ? "" : "s"} to ${teammate.name}. ${remainingModules.length} still unassigned in this batch.`
    });
  };

  const openAssignPopup = (module: AssignableModuleInfo | AssignableModuleInfo[]) => {
    const modules = uniqueModules(Array.isArray(module) ? module : [module]);
    if (!modules.length) return;
    setPopup({
      modules,
      note: "",
      dueDate: "",
      category: defaultAssignmentCategory(modules[0], questCategories),
      message: "",
      selectedModuleIds: modules.map((item) => item.moduleId)
    });
  };

  const toggleModuleSelection = (module: AssignableModuleInfo) => {
    if (!assignMode) return;
    setSelectedModulesById((current) => {
      const next = { ...current };
      if (next[module.moduleId]) delete next[module.moduleId];
      else next[module.moduleId] = module;
      return next;
    });
  };

  const value: AssignmentContextValue = {
    assignMode,
    assignments,
    currentUser,
    currentTeamMember,
    teamMembers,
    questCategories,
    focusedAssignment,
    openAssignPopup,
    openSelectedAssignPopup: () => openAssignPopup(selectedModules),
    selectedModuleCount: selectedModules.length,
    selectedModules,
    isModuleSelected: (moduleId) => Boolean(selectedModulesById[moduleId]),
    toggleModuleSelection,
    clearSelectedModules: () => setSelectedModulesById({}),
    assignmentForModule: (moduleId) => getAssignmentForModule(assignments, moduleId),
    setAssignmentStatus,
    openQuestDashboard: onOpenQuestDashboard
  };

  return (
    <AssignmentContext.Provider value={value}>
      {children}
      {popup && (
        <AssignmentPopup
          popup={popup}
          currentTeamMember={currentTeamMember}
          teamMembers={teamMembers}
          questCategories={questCategories}
          onChange={setPopup}
          onAssign={assignTo}
          onClose={() => setPopup(null)}
        />
      )}
    </AssignmentContext.Provider>
  );
}

export function AssignableModule({
  as = "section",
  className = "",
  module,
  children
}: {
  as?: ElementType;
  className?: string;
  module: AssignableModuleInfo;
  children: ReactNode;
}) {
  const context = useContext(AssignmentContext);
  const assignment = context?.assignmentForModule(module.moduleId) || null;
  const focused = Boolean(context?.focusedAssignment?.moduleId === module.moduleId);
  const selected = Boolean(context?.isModuleSelected(module.moduleId));
  const Component = as;

  return (
    <Component
      className={`${className} assignable-module ${focused ? "assignment-focus" : ""} ${selected ? "assignment-selected" : ""}`}
      data-module-id={module.moduleId}
      data-module-title={module.moduleTitle}
      data-module-type={module.moduleType}
    >
      {assignment && <AssignmentBadge assignment={assignment} />}
      {context?.assignMode && (
        <button
          type="button"
          className="assignment-corner-button"
          title="Assign this module"
          aria-label={`${selected ? "Unselect" : "Select"} ${module.moduleTitle} for assignment`}
          aria-pressed={selected}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            context.toggleModuleSelection(module);
          }}
        >
          <Icon name={selected ? "Check" : "Plus"} className="h-4 w-4" />
        </button>
      )}
      {children}
      {focused && assignment && (
        <FloatingAssignmentControl
          assignment={assignment}
          onStatusChange={(status) => context?.setAssignmentStatus(assignment.id, status)}
          onBack={context?.openQuestDashboard}
        />
      )}
    </Component>
  );
}

export function useAssignments() {
  const context = useContext(AssignmentContext);
  if (!context) throw new Error("useAssignments must be used inside AssignmentProvider");
  return context;
}

export function useOptionalAssignments() {
  return useContext(AssignmentContext);
}

function AssignmentBadge({ assignment }: { assignment: AssignmentRecord }) {
  return (
    <button
      type="button"
      className={`assignment-module-badge status-${assignment.status}`}
      title={`${statusDisplay(assignment.status)}: ${assignment.assignedToName}`}
      onClick={(event) => {
        event.stopPropagation();
        window.alert(`${assignment.moduleTitle}\n${statusDisplay(assignment.status)}: ${assignment.assignedToName}\n${assignment.note || "No assignment note."}`);
      }}
    >
      {statusLabel(assignment.status)}: {assignment.assignedToName}
    </button>
  );
}

function FloatingAssignmentControl({
  assignment,
  onStatusChange,
  onBack
}: {
  assignment: AssignmentRecord;
  onStatusChange: (status: AssignmentStatus) => void;
  onBack?: () => void;
}) {
  return (
    <div className="assignment-floating-control">
      <strong>{assignment.moduleTitle}</strong>
      <span>{statusDisplay(assignment.status)}</span>
      <div>
        <button onClick={() => onStatusChange("wip")}>Mark WIP</button>
        <button onClick={() => onStatusChange("done")}>Mark Done</button>
        <button onClick={() => onStatusChange("needs-review")}>Needs Review</button>
        {onBack && <button onClick={onBack}>Back to Quest Dashboard</button>}
      </div>
    </div>
  );
}

function AssignmentPopup({
  popup,
  currentTeamMember,
  teamMembers,
  questCategories,
  onChange,
  onAssign,
  onClose
}: {
  popup: AssignPopupState;
  currentTeamMember: TeamMember;
  teamMembers: TeamMember[];
  questCategories: QuestCategory[];
  onChange: (popup: AssignPopupState) => void;
  onAssign: (teammate: TeamMember) => void;
  onClose: () => void;
}) {
  const visibleMembers = canAssignToOthers(currentTeamMember.permission)
    ? teamMembers
    : teamMembers.filter((member) => member.id === currentTeamMember.id);
  const selectedCount = popup.selectedModuleIds.length;
  const togglePopupModule = (moduleId: string) => {
    const selected = popup.selectedModuleIds.includes(moduleId);
    onChange({
      ...popup,
      selectedModuleIds: selected
        ? popup.selectedModuleIds.filter((id) => id !== moduleId)
        : [...popup.selectedModuleIds, moduleId],
      message: ""
    });
  };

  return (
    <div className="assignment-popup-backdrop" role="dialog" aria-modal="true" aria-label="Assign Module">
      <section className="assignment-popup modal-frame">
        <header>
          <div>
            <p>Assign Module</p>
            <h2 className="font-display">{assignmentPopupTitle(popup.modules)}</h2>
            <span>{assignmentPopupEntryLine(popup.modules)}</span>
            <small>{assignmentPopupCategoryLine(popup.modules)}</small>
          </div>
          <button className="assignment-icon-button" onClick={onClose} aria-label="Close assignment popup">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="assignment-popup-fields">
          {popup.modules.length > 1 && (
            <section className="assignment-batch-picker">
              <header>
                <div>
                  <span>Selected for this teammate</span>
                  <strong>{selectedCount} / {popup.modules.length}</strong>
                </div>
                <div>
                  <button type="button" onClick={() => onChange({ ...popup, selectedModuleIds: popup.modules.map((module) => module.moduleId), message: "" })}>
                    Select All
                  </button>
                  <button type="button" onClick={() => onChange({ ...popup, selectedModuleIds: [], message: "" })}>
                    Clear
                  </button>
                </div>
              </header>
              <div className="assignment-batch-module-list">
                {popup.modules.map((module) => {
                  const selected = popup.selectedModuleIds.includes(module.moduleId);
                  return (
                    <button
                      type="button"
                      key={module.moduleId}
                      className={selected ? "selected" : ""}
                      onClick={() => togglePopupModule(module.moduleId)}
                    >
                      <Icon name={selected ? "CheckSquare" : "Square"} className="h-4 w-4" />
                      <span>
                        <strong>{module.moduleTitle}</strong>
                        <small>{module.entryTitle} • {module.entryCategory}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <label>
            <span>Assignment category</span>
            <CustomSelect
              value={popup.category}
              onChange={(value) => onChange({ ...popup, category: value })}
              options={questCategories.map((category) => category.name)}
            />
          </label>
          <label>
            <span>Due date</span>
            <input type="date" value={popup.dueDate} onChange={(event) => onChange({ ...popup, dueDate: event.target.value })} />
          </label>
          <label className="wide">
            <span>Assignment note</span>
            <textarea value={popup.note} placeholder="What should this teammate fill out or review?" onChange={(event) => onChange({ ...popup, note: event.target.value })} />
          </label>
        </div>

        <div className="assignment-teammate-grid">
          {visibleMembers.map((member) => (
            <button key={member.id} onClick={() => onAssign(member)}>
              <span className="assignment-teammate-avatar">
                {member.avatar ? <img src={member.avatar} alt="" /> : <Icon name="UserRound" className="h-6 w-6" />}
              </span>
              <strong>{member.name}</strong>
              <small>{member.role}</small>
              <em>{member.permission}</em>
            </button>
          ))}
        </div>

        {popup.message && <p className="assignment-popup-message">{popup.message}</p>}

        <footer>
          <button className="button-frame subtle" onClick={onClose}>Cancel</button>
          <button className="button-frame primary" onClick={() => onAssign(currentTeamMember)}>Assign to Myself</button>
        </footer>
      </section>
    </div>
  );
}

function assignmentPopupTitle(modules: AssignableModuleInfo[]) {
  return modules.length === 1 ? modules[0].moduleTitle : `${modules.length} selected modules`;
}

function assignmentPopupEntryLine(modules: AssignableModuleInfo[]) {
  if (modules.length === 1) return modules[0].entryTitle;
  const uniqueEntries = [...new Set(modules.map((module) => module.entryTitle))];
  return uniqueEntries.length === 1 ? uniqueEntries[0] : `${uniqueEntries.length} entries selected`;
}

function assignmentPopupCategoryLine(modules: AssignableModuleInfo[]) {
  if (modules.length === 1) return modules[0].entryCategory;
  const uniqueCategories = [...new Set(modules.map((module) => module.entryCategory))];
  return uniqueCategories.length === 1 ? uniqueCategories[0] : "Batch assignment";
}

function uniqueModules(modules: AssignableModuleInfo[]) {
  const byId = new Map<string, AssignableModuleInfo>();
  modules.forEach((module) => {
    if (module?.moduleId) byId.set(module.moduleId, module);
  });
  return [...byId.values()];
}

export function profileForAssignmentUser(user: GoogleAccountUser, members: TeamMember[]) {
  return getCurrentUserProfile(user, members);
}

function defaultAssignmentCategory(module: AssignableModuleInfo, categories: QuestCategory[]) {
  const preferred = module.moduleType.includes("art-vault") ? "Art Work" : "Text Work";
  return categories.find((category) => category.name === preferred)?.name || categories[0]?.name || preferred;
}
