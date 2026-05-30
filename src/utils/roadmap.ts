import type {
  RoadmapBuildTier,
  RoadmapData,
  RoadmapItem,
  RoadmapItemCategory,
  RoadmapItemStatus,
  RoadmapMilestone,
  RoadmapMilestoneStatus,
  RoadmapPriority
} from "../types";
import { slugify } from "./entries";

export type RoadmapFilter =
  | "all"
  | "missing"
  | "assigned"
  | "in-progress"
  | "uploaded"
  | "needs-review"
  | "revision-needed"
  | "approved"
  | "blocked"
  | "critical"
  | "my-tasks"
  | "due-soon";

export interface RoadmapItemView extends RoadmapItem {
  liveStatus: RoadmapItemStatus;
  liveDriveFolderId: string;
  liveDriveFolderPath: string;
  liveUploadedFileIds: string[];
  binderSlotMissing: boolean;
}

export const roadmapCategories: RoadmapItemCategory[] = [
  "Character Art",
  "Enemy Art",
  "NPC Art",
  "Environment Art",
  "UI",
  "Writing",
  "Audio",
  "Animation",
  "Gameplay"
];

export const roadmapStatuses: RoadmapItemStatus[] = [
  "missing",
  "assigned",
  "in-progress",
  "uploaded",
  "needs-review",
  "revision-needed",
  "approved",
  "complete",
  "blocked"
];

export const roadmapPriorities: RoadmapPriority[] = ["optional", "low", "medium", "high", "critical"];

export const roadmapFilters: { id: RoadmapFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missing", label: "Missing" },
  { id: "assigned", label: "Assigned" },
  { id: "in-progress", label: "In Progress" },
  { id: "uploaded", label: "Uploaded" },
  { id: "needs-review", label: "Needs Review" },
  { id: "revision-needed", label: "Revision Needed" },
  { id: "approved", label: "Approved" },
  { id: "blocked", label: "Blocked" },
  { id: "critical", label: "Critical Only" },
  { id: "my-tasks", label: "My Tasks" },
  { id: "due-soon", label: "Due Soon" }
];

export function createStarterRoadmapData(): RoadmapData {
  const now = new Date().toISOString();
  return {
    milestones: [
      {
        id: "milestone-whisker-woods-vertical-slice",
        title: "Whisker Woods Vertical Slice",
        description: "Core Act 1 production checklist for the first playable slice: Gwen, early enemies, pantry assets, UI, and build-critical art.",
        status: "active",
        dueDate: "",
        bonusXp: 150,
        categories: roadmapCategories,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "milestone-act-1-content-lock",
        title: "Act 1 Content Lock",
        description: "Broader Act 1 production pass for story, environment, creature, recipe, animation, and review work.",
        status: "planned",
        dueDate: "",
        bonusXp: 250,
        categories: roadmapCategories,
        createdAt: now,
        updatedAt: now
      }
    ],
    items: [],
    updatedAt: now
  };
}

export function normalizeRoadmapData(value: unknown): RoadmapData {
  const starter = createStarterRoadmapData();
  if (!value || typeof value !== "object") return starter;
  const input = value as Partial<RoadmapData>;
  const milestones = Array.isArray(input.milestones)
    ? input.milestones.map(normalizeRoadmapMilestone).filter((item): item is RoadmapMilestone => Boolean(item))
    : [];
  const items = Array.isArray(input.items)
    ? input.items.map(normalizeRoadmapItem).filter((item): item is RoadmapItem => Boolean(item))
    : [];
  return {
    milestones: milestones.length ? milestones : starter.milestones,
    items,
    updatedAt: stringValue(input.updatedAt, new Date().toISOString())
  };
}

export function sanitizeRoadmapForPersistence(value: RoadmapData | undefined): RoadmapData {
  return normalizeRoadmapData(value);
}

export function createRoadmapItem(input: Partial<RoadmapItem> & Pick<RoadmapItem, "milestoneId" | "title" | "binderSlotId">): RoadmapItem {
  const now = new Date().toISOString();
  const priority = normalizePriority(input.priority);
  return {
    id: stringValue(input.id, `roadmap-${slugify(input.title)}-${Math.random().toString(36).slice(2, 7)}`),
    milestoneId: input.milestoneId,
    title: input.title,
    category: input.category || "Character Art",
    type: stringValue(input.type, "Asset"),
    priority,
    status: normalizeStatus(input.status),
    assignedTo: stringValue(input.assignedTo, ""),
    reviewer: stringValue(input.reviewer, ""),
    dueDate: stringValue(input.dueDate, ""),
    binderSlotId: input.binderSlotId,
    driveFolderPath: stringValue(input.driveFolderPath, ""),
    googleDriveFolderId: stringValue(input.googleDriveFolderId, ""),
    requiredFileTypes: normalizeStringArray(input.requiredFileTypes).length ? normalizeStringArray(input.requiredFileTypes) : ["PNG", "PSD", "Sprite Sheet"],
    xpReward: typeof input.xpReward === "number" ? input.xpReward : roadmapPriorityXp(priority),
    buildTier: normalizeBuildTier(input.buildTier),
    dependencies: normalizeStringArray(input.dependencies),
    notes: stringValue(input.notes, ""),
    uploadedFileIds: normalizeStringArray(input.uploadedFileIds),
    uploadedFiles: Array.isArray(input.uploadedFiles) ? input.uploadedFiles.map((file) => ({
      id: stringValue(file.id, `file-${Date.now()}`),
      driveFileId: stringValue(file.driveFileId, ""),
      fileName: stringValue(file.fileName, "Uploaded file"),
      webViewLink: stringValue(file.webViewLink, ""),
      thumbnailUrl: stringValue(file.thumbnailUrl, ""),
      uploadedAt: stringValue(file.uploadedAt, now),
      uploadedById: stringValue(file.uploadedById, ""),
      uploadedByName: stringValue(file.uploadedByName, "")
    })).filter((file) => file.driveFileId || file.webViewLink) : [],
    revisionHistory: Array.isArray(input.revisionHistory) ? input.revisionHistory.map((entry) => ({
      id: stringValue(entry.id, `revision-${Date.now()}`),
      action: stringValue(entry.action, "status-change"),
      note: stringValue(entry.note, ""),
      authorId: stringValue(entry.authorId, ""),
      authorName: stringValue(entry.authorName, ""),
      createdAt: stringValue(entry.createdAt, now)
    })) : [],
    createdAt: stringValue(input.createdAt, now),
    updatedAt: stringValue(input.updatedAt, now)
  };
}

export function roadmapPriorityXp(priority: RoadmapPriority | string) {
  if (priority === "optional") return 5;
  if (priority === "low") return 10;
  if (priority === "high") return 40;
  if (priority === "critical") return 60;
  return 25;
}

export function roadmapStatusLabel(status: RoadmapItemStatus | string) {
  const labels: Record<RoadmapItemStatus, string> = {
    missing: "Ingredient Missing",
    assigned: "Sent to Cook",
    "in-progress": "On the Stove",
    uploaded: "Plated",
    "needs-review": "Taste Test",
    "revision-needed": "Needs More Seasoning",
    approved: "Approved Dish",
    complete: "Served",
    blocked: "Kitchen Blocked"
  };
  return labels[normalizeStatus(status)] || "Ingredient Missing";
}

export function roadmapMilestoneStatusLabel(status: RoadmapMilestoneStatus | string) {
  if (status === "active") return "On the Board";
  if (status === "at-risk") return "Needs Attention";
  if (status === "ready-for-build") return "Ready for Build";
  if (status === "complete") return "Served";
  if (status === "paused") return "Paused";
  return "Planned";
}

export function calculateRoadmapStats(items: RoadmapItemView[]) {
  const required = items.filter((item) => item.buildTier === "required");
  const completed = items.filter((item) => item.liveStatus === "approved" || item.liveStatus === "complete");
  const missing = items.filter((item) => item.liveStatus === "missing");
  const blocked = items.filter((item) => item.liveStatus === "blocked" || unmetDependencies(item, items).length > 0);
  const assigned = items.filter((item) => Boolean(item.assignedTo));
  const progress = items.length ? Math.round((completed.length / items.length) * 100) : 0;
  const ready = required.every((item) => item.liveStatus === "approved" || item.liveStatus === "complete");
  return {
    total: items.length,
    required: required.length,
    completed: completed.length,
    missing: missing.length,
    blocked: blocked.length,
    assigned: assigned.length,
    progress,
    buildReady: required.length > 0 && ready
  };
}

export function calculateRoadmapXp(items: RoadmapItemView[], milestones: RoadmapMilestone[]) {
  const completedItems = items.filter((item) => item.liveStatus === "approved" || item.liveStatus === "complete");
  const earnedByItem = completedItems.reduce((total, item) => total + (item.xpReward || roadmapPriorityXp(item.priority)), 0);
  const completeMilestoneIds = new Set(
    milestones
      .filter((milestone) => {
        const milestoneItems = items.filter((item) => item.milestoneId === milestone.id);
        return milestoneItems.length > 0 && milestoneItems.every((item) => item.liveStatus === "approved" || item.liveStatus === "complete");
      })
      .map((milestone) => milestone.id)
  );
  const milestoneBonus = milestones
    .filter((milestone) => completeMilestoneIds.has(milestone.id))
    .reduce((total, milestone) => total + (milestone.bonusXp || 0), 0);
  const byAssignee = new Map<string, number>();
  completedItems.forEach((item) => {
    if (!item.assignedTo) return;
    byAssignee.set(item.assignedTo, (byAssignee.get(item.assignedTo) || 0) + (item.xpReward || roadmapPriorityXp(item.priority)));
  });
  return {
    teamXp: earnedByItem + milestoneBonus,
    itemXp: earnedByItem,
    milestoneBonus,
    byAssignee
  };
}

export function filterRoadmapItems(
  items: RoadmapItemView[],
  filter: RoadmapFilter,
  search: string,
  options: { currentUserId?: string; currentUserEmail?: string; teammateNameForId?: (id: string) => string; milestoneTitleForId?: (id: string) => string } = {}
) {
  const query = search.trim().toLowerCase();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const assigneeName = options.teammateNameForId?.(item.assignedTo) || item.assignedTo;
    const milestoneTitle = options.milestoneTitleForId?.(item.milestoneId) || item.milestoneId;
    const dueAt = item.dueDate ? Date.parse(item.dueDate) : 0;
    const matchesFilter =
      filter === "all" ||
      item.liveStatus === filter ||
      (filter === "critical" && item.priority === "critical") ||
      (filter === "my-tasks" && Boolean(item.assignedTo) && (item.assignedTo === options.currentUserId || item.assignedTo === options.currentUserEmail)) ||
      (filter === "due-soon" && Boolean(dueAt) && dueAt >= now - sevenDays && dueAt <= now + sevenDays);
    if (!matchesFilter) return false;
    if (!query) return true;
    return [
      item.title,
      item.category,
      item.type,
      item.priority,
      item.liveStatus,
      item.driveFolderPath,
      item.liveDriveFolderPath,
      assigneeName,
      milestoneTitle,
      item.notes
    ].join(" ").toLowerCase().includes(query);
  });
}

export function unmetDependencies(item: RoadmapItem, allItems: RoadmapItemView[] | RoadmapItem[]) {
  const byId = new Map(allItems.map((candidate) => [candidate.id, candidate] as const));
  return (item.dependencies || [])
    .map((id) => byId.get(id))
    .filter((dependency): dependency is RoadmapItem | RoadmapItemView => Boolean(dependency))
    .filter((dependency) => {
      const status = "liveStatus" in dependency ? dependency.liveStatus : dependency.status;
      return status !== "approved" && status !== "complete";
    });
}

function normalizeRoadmapMilestone(input: Partial<RoadmapMilestone> | null | undefined): RoadmapMilestone | null {
  if (!input || typeof input !== "object") return null;
  const title = stringValue(input.title, "");
  if (!title) return null;
  const now = new Date().toISOString();
  return {
    id: stringValue(input.id, `milestone-${slugify(title)}`),
    title,
    description: stringValue(input.description, ""),
    status: normalizeMilestoneStatus(input.status),
    dueDate: stringValue(input.dueDate, ""),
    bonusXp: typeof input.bonusXp === "number" ? input.bonusXp : 150,
    categories: normalizeStringArray(input.categories).length ? normalizeStringArray(input.categories) : roadmapCategories,
    createdAt: stringValue(input.createdAt, now),
    updatedAt: stringValue(input.updatedAt, now)
  };
}

function normalizeRoadmapItem(input: Partial<RoadmapItem> | null | undefined): RoadmapItem | null {
  if (!input || typeof input !== "object") return null;
  const title = stringValue(input.title, "");
  if (!title) return null;
  return createRoadmapItem({
    ...input,
    milestoneId: stringValue(input.milestoneId, "milestone-whisker-woods-vertical-slice"),
    title,
    binderSlotId: stringValue(input.binderSlotId, "")
  });
}

function normalizeStatus(value: unknown): RoadmapItemStatus {
  return roadmapStatuses.includes(value as RoadmapItemStatus) ? value as RoadmapItemStatus : "missing";
}

function normalizePriority(value: unknown): RoadmapPriority {
  return roadmapPriorities.includes(value as RoadmapPriority) ? value as RoadmapPriority : "medium";
}

function normalizeBuildTier(value: unknown): RoadmapBuildTier {
  if (value === "polish" || value === "optional") return value;
  return "required";
}

function normalizeMilestoneStatus(value: unknown): RoadmapMilestoneStatus {
  if (value === "active" || value === "at-risk" || value === "ready-for-build" || value === "complete" || value === "paused") return value;
  return "planned";
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
