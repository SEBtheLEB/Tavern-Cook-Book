import type { AccessRole, GoogleAccountUser } from "../types";

export type AssignmentStatus = "not-started" | "wip" | "done" | "needs-review";
export type AssignmentPermission = "owner" | "admin" | "editor" | "viewer";

export interface AssignmentRecord {
  id: string;
  moduleId: string;
  moduleTitle: string;
  moduleType: string;
  entryId: string;
  entryTitle: string;
  entryCategory: string;
  assignedToUserId: string;
  assignedToName: string;
  assignedToRole: string;
  assignedByUserId: string;
  assignedByName: string;
  status: AssignmentStatus;
  category: string;
  moodLabels: string[];
  note: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  targetRoute: string;
  editModeOnOpen: boolean;
}

export interface AssignableModuleInfo {
  moduleId: string;
  moduleTitle: string;
  moduleType: string;
  entryId: string;
  entryTitle: string;
  entryCategory: string;
  targetRoute: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  permission: AssignmentPermission;
  department: string;
  bio?: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  picture: string;
  role: string;
  department: string;
  bio: string;
}

export interface QuestCategory {
  id: string;
  name: string;
  isDefault: boolean;
  order: number;
}

export const ASSIGNMENTS_KEY = "tot_assignments";
export const TEAM_MEMBERS_KEY = "tot_team_members";
export const USER_PROFILES_KEY = "tot_user_profiles";
export const QUEST_CATEGORIES_KEY = "tot_quest_categories";

export const defaultQuestCategories: QuestCategory[] = [
  "Text Work",
  "Art Work",
  "Game System",
  "Lore",
  "Design",
  "UI",
  "Review",
  "Other"
].map((name, order) => ({
  id: slugifyAssignment(name),
  name,
  isDefault: true,
  order
}));

export const defaultTeamMembers: TeamMember[] = [
  {
    id: "stlprodz1101-gmail-com",
    name: "Sebastien",
    email: "stlprodz1101@gmail.com",
    role: "Producer",
    avatar: "",
    permission: "owner",
    department: "Production"
  },
  {
    id: "sebastianac1101-gmail-com",
    name: "Sebastien Backup",
    email: "sebastianac1101@gmail.com",
    role: "Editor",
    avatar: "",
    permission: "editor",
    department: "Production"
  },
  {
    id: "carrie-art-director",
    name: "Carrie",
    email: "carrie@team.local",
    role: "Art Director",
    avatar: "",
    permission: "editor",
    department: "Art"
  },
  {
    id: "marvin-lead-developer",
    name: "Marvin",
    email: "marvin@team.local",
    role: "Lead Developer",
    avatar: "",
    permission: "editor",
    department: "Engineering"
  }
];

export function getAssignments() {
  return normalizeAssignments(readArray<AssignmentRecord>(ASSIGNMENTS_KEY));
}

export function saveAssignments(assignments: AssignmentRecord[]) {
  writeJson(ASSIGNMENTS_KEY, normalizeAssignments(assignments));
}

export function createAssignment(
  module: AssignableModuleInfo,
  teammate: TeamMember,
  assignedBy: TeamMember,
  options: { category: string; note: string; dueDate: string }
): AssignmentRecord {
  const timestamp = new Date().toISOString();
  return {
    id: `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    moduleId: module.moduleId,
    moduleTitle: module.moduleTitle,
    moduleType: module.moduleType,
    entryId: module.entryId,
    entryTitle: module.entryTitle,
    entryCategory: module.entryCategory,
    assignedToUserId: teammate.id,
    assignedToName: teammate.name,
    assignedToRole: teammate.role,
    assignedByUserId: assignedBy.id,
    assignedByName: assignedBy.name,
    status: "not-started",
    category: options.category || "Other",
    moodLabels: [],
    note: options.note || "",
    dueDate: options.dueDate || "",
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    targetRoute: module.targetRoute,
    editModeOnOpen: true
  };
}

export function updateAssignmentStatus(
  assignments: AssignmentRecord[],
  assignmentId: string,
  status: AssignmentStatus
) {
  const timestamp = new Date().toISOString();
  return assignments.map((assignment) =>
    assignment.id === assignmentId
      ? {
          ...assignment,
          status,
          updatedAt: timestamp,
          completedAt: status === "done" ? timestamp : null
        }
      : assignment
  );
}

export function getAssignmentsForUser(assignments: AssignmentRecord[], userId: string, email = "") {
  const normalizedEmail = normalizeEmail(email);
  return assignments.filter((assignment) =>
    assignment.assignedToUserId === userId ||
    normalizeEmail(assignment.assignedToUserId) === normalizedEmail ||
    normalizeEmail(assignment.assignedToName) === normalizedEmail
  );
}

export function getAssignmentForModule(assignments: AssignmentRecord[], moduleId: string) {
  return assignments
    .filter((assignment) => assignment.moduleId === moduleId)
    .sort((left, right) => statusWeight(left.status) - statusWeight(right.status))[0] || null;
}

export function getTeamMembers() {
  const saved = readArray<TeamMember>(TEAM_MEMBERS_KEY);
  const source = saved.length ? saved : defaultTeamMembers;
  return normalizeTeamMembers(source);
}

export function saveTeamMembers(members: TeamMember[]) {
  writeJson(TEAM_MEMBERS_KEY, normalizeTeamMembers(members));
}

export function getQuestCategories() {
  return normalizeQuestCategories(readArray<QuestCategory>(QUEST_CATEGORIES_KEY));
}

export function saveQuestCategories(categories: QuestCategory[]) {
  writeJson(QUEST_CATEGORIES_KEY, normalizeQuestCategories(categories));
}

export function getUserProfiles() {
  return normalizeUserProfiles(readArray<UserProfile>(USER_PROFILES_KEY));
}

export function saveUserProfiles(profiles: UserProfile[]) {
  writeJson(USER_PROFILES_KEY, normalizeUserProfiles(profiles));
}

export function getCurrentUserProfile(user: GoogleAccountUser, members = getTeamMembers(), profiles = getUserProfiles()): UserProfile {
  const profile = profiles.find((item) => normalizeEmail(item.email) === normalizeEmail(user.email));
  if (profile) return profile;
  const member = getTeamMemberForGoogleUser(user, members);
  return {
    userId: member.id,
    email: user.email,
    displayName: member.name || user.name,
    picture: member.avatar || user.picture || "",
    role: member.role || roleLabel(user.role),
    department: member.department || "",
    bio: member.bio || ""
  };
}

export function getTeamMemberForGoogleUser(user: GoogleAccountUser, members = getTeamMembers()): TeamMember {
  const existing = members.find((member) => normalizeEmail(member.email) === normalizeEmail(user.email));
  if (existing) return existing;
  return {
    id: user.email || `user-${Date.now()}`,
    name: user.name || user.email,
    email: user.email,
    role: roleLabel(user.role),
    avatar: user.picture || "",
    permission: permissionFromAccessRole(user.role),
    department: "",
    bio: ""
  };
}

export function permissionFromAccessRole(role: AccessRole): AssignmentPermission {
  if (role === "admin") return "owner";
  if (role === "editor") return "editor";
  return "viewer";
}

export function canAssignToOthers(permission: AssignmentPermission) {
  return permission === "owner" || permission === "admin";
}

export function canSelfAssign(permission: AssignmentPermission) {
  return permission === "owner" || permission === "admin" || permission === "editor";
}

export function statusLabel(status: AssignmentStatus) {
  if (status === "wip") return "WIP";
  if (status === "done") return "Done";
  if (status === "needs-review") return "Review";
  return "Assigned";
}

export function statusDisplay(status: AssignmentStatus) {
  if (status === "wip") return "WIP";
  if (status === "done") return "Done";
  if (status === "needs-review") return "Needs Review";
  return "Not Started";
}

export function slugifyAssignment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || `category-${Date.now()}`;
}

export function normalizeAssignments(assignments: unknown[]) {
  return assignments.map(normalizeAssignment).filter((assignment): assignment is AssignmentRecord => Boolean(assignment));
}

function normalizeAssignment(value: unknown): AssignmentRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<AssignmentRecord>;
  if (!item.moduleId || !item.entryId || !item.assignedToUserId) return null;
  const now = new Date().toISOString();
  return {
    id: stringValue(item.id, `assignment-${Date.now()}`),
    moduleId: stringValue(item.moduleId, ""),
    moduleTitle: stringValue(item.moduleTitle, "Assigned Module"),
    moduleType: stringValue(item.moduleType, "module"),
    entryId: stringValue(item.entryId, ""),
    entryTitle: stringValue(item.entryTitle, "Unknown Entry"),
    entryCategory: stringValue(item.entryCategory, "Lore"),
    assignedToUserId: stringValue(item.assignedToUserId, ""),
    assignedToName: stringValue(item.assignedToName, "Teammate"),
    assignedToRole: stringValue(item.assignedToRole, "Editor"),
    assignedByUserId: stringValue(item.assignedByUserId, ""),
    assignedByName: stringValue(item.assignedByName, "Unknown"),
    status: normalizeStatus(item.status),
    category: stringValue(item.category, "Other"),
    moodLabels: normalizeMoodLabels(item.moodLabels),
    note: stringValue(item.note, ""),
    dueDate: stringValue(item.dueDate, ""),
    createdAt: stringValue(item.createdAt, now),
    updatedAt: stringValue(item.updatedAt, stringValue(item.createdAt, now)),
    completedAt: typeof item.completedAt === "string" ? item.completedAt : null,
    targetRoute: stringValue(item.targetRoute, ""),
    editModeOnOpen: item.editModeOnOpen !== false
  };
}

export function normalizeTeamMembers(members: unknown[]) {
  const byId = new Map<string, TeamMember>();
  members
    .map(normalizeTeamMember)
    .filter((member): member is TeamMember => Boolean(member))
    .forEach((member) => byId.set(member.id, member));
  defaultTeamMembers.forEach((member) => {
    if (!byId.has(member.id)) byId.set(member.id, member);
  });
  return [...byId.values()];
}

export function normalizeQuestCategories(categories: unknown[]) {
  const saved = categories.map(normalizeQuestCategory).filter((category): category is QuestCategory => Boolean(category));
  const byId = new Map<string, QuestCategory>();
  [...defaultQuestCategories, ...saved].forEach((category) => byId.set(category.id, category));
  return [...byId.values()].sort((left, right) => left.order - right.order);
}

export function normalizeUserProfiles(profiles: unknown[]) {
  return profiles.map(normalizeUserProfile).filter((profile): profile is UserProfile => Boolean(profile));
}

function normalizeTeamMember(value: unknown): TeamMember | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<TeamMember>;
  const email = normalizeEmail(item.email || "");
  const name = stringValue(item.name, email || "Teammate");
  const id = stringValue(item.id, email ? email.replace(/[^a-z0-9]+/g, "-") : slugifyAssignment(name));
  return {
    id,
    name,
    email,
    role: stringValue(item.role, "Editor"),
    avatar: stringValue(item.avatar, ""),
    permission: normalizePermission(item.permission),
    department: stringValue(item.department, ""),
    bio: stringValue(item.bio, "")
  };
}

function normalizeQuestCategory(value: unknown): QuestCategory | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<QuestCategory>;
  const name = stringValue(item.name, "");
  if (!name) return null;
  return {
    id: stringValue(item.id, slugifyAssignment(name)),
    name,
    isDefault: Boolean(item.isDefault),
    order: typeof item.order === "number" ? item.order : 999
  };
}

function normalizeUserProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<UserProfile>;
  const email = normalizeEmail(item.email || "");
  if (!email) return null;
  return {
    userId: stringValue(item.userId, email),
    email,
    displayName: stringValue(item.displayName, email),
    picture: stringValue(item.picture, ""),
    role: stringValue(item.role, "Editor"),
    department: stringValue(item.department, ""),
    bio: stringValue(item.bio, "")
  };
}

function normalizeStatus(value: unknown): AssignmentStatus {
  if (value === "wip" || value === "done" || value === "needs-review") return value;
  return "not-started";
}

function normalizeMoodLabels(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => stringValue(item, "")).filter(Boolean))].slice(0, 3);
}

function normalizePermission(value: unknown): AssignmentPermission {
  if (value === "owner" || value === "admin" || value === "editor") return value;
  return "viewer";
}

function roleLabel(role: AccessRole) {
  if (role === "admin") return "Producer";
  if (role === "editor") return "Editor";
  return "Viewer";
}

function statusWeight(status: AssignmentStatus) {
  if (status === "wip") return 0;
  if (status === "needs-review") return 1;
  if (status === "not-started") return 2;
  return 3;
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
