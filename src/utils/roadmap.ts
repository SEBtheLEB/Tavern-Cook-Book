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

export interface RoadmapPlaytestItemSpec {
  id: string;
  title: string;
  category: RoadmapItemCategory;
  type: string;
  priority: RoadmapPriority;
  buildTier: RoadmapBuildTier;
  requiredFileTypes: string[];
  notes: string;
  subjectHints: string[];
  sectionHints: string[];
  slotHints: string[];
}

export interface RoadmapBinderResolution {
  binderSlotId?: string;
  driveFolderPath?: string;
  googleDriveFolderId?: string;
}

export const WHISKER_WOODS_PLAYTEST_MILESTONE_ID = "milestone-whisker-woods-playtest";

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
      createWhiskerWoodsPlaytestMilestone(now),
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
    items: createWhiskerWoodsPlaytestItems(),
    updatedAt: now
  };
}

export function createWhiskerWoodsPlaytestMilestone(timestamp = new Date().toISOString()): RoadmapMilestone {
  return {
    id: WHISKER_WOODS_PLAYTEST_MILESTONE_ID,
    title: "Whisker Woods Playtest",
    description:
      "Create the first playable demo area with Gwen, Tohm, Whisker Woods village, basic combat, cooking, NPC interaction, and one miniboss.",
    status: "active",
    dueDate: "",
    bonusXp: 200,
    categories: roadmapCategories,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function createWhiskerWoodsPlaytestItems(
  resolveBinder?: (spec: RoadmapPlaytestItemSpec) => RoadmapBinderResolution | null | undefined
) {
  return whiskerWoodsPlaytestItemSpecs.map((spec) => {
    const resolution = resolveBinder?.(spec) || {};
    return createRoadmapItem({
      id: playtestItemId(spec.id),
      milestoneId: WHISKER_WOODS_PLAYTEST_MILESTONE_ID,
      title: spec.title,
      category: spec.category,
      type: spec.type,
      priority: spec.priority,
      status: "missing",
      binderSlotId: resolution.binderSlotId || "",
      driveFolderPath: resolution.driveFolderPath || "",
      googleDriveFolderId: resolution.googleDriveFolderId || "",
      requiredFileTypes: spec.requiredFileTypes,
      xpReward: roadmapPriorityXp(spec.priority),
      buildTier: spec.buildTier,
      dependencies: [],
      notes: spec.notes
    });
  });
}

export function mergeWhiskerWoodsPlaytestSetup(
  roadmap: RoadmapData,
  resolveBinder?: (spec: RoadmapPlaytestItemSpec) => RoadmapBinderResolution | null | undefined
) {
  const normalized = normalizeRoadmapData(roadmap);
  const timestamp = new Date().toISOString();
  const playtestMilestone = createWhiskerWoodsPlaytestMilestone(timestamp);
  const oldMilestone = normalized.milestones.find((milestone) => milestone.id === WHISKER_WOODS_PLAYTEST_MILESTONE_ID);
  const mergedMilestone: RoadmapMilestone = {
    ...playtestMilestone,
    ...(oldMilestone || {}),
    id: WHISKER_WOODS_PLAYTEST_MILESTONE_ID,
    title: playtestMilestone.title,
    description: playtestMilestone.description,
    status: oldMilestone?.status || playtestMilestone.status,
    dueDate: oldMilestone?.dueDate || playtestMilestone.dueDate,
    bonusXp: oldMilestone?.bonusXp || playtestMilestone.bonusXp,
    categories: uniqueStrings([...roadmapCategories, ...(oldMilestone?.categories || [])]),
    updatedAt: oldMilestone?.updatedAt || timestamp
  };
  const otherMilestones = normalized.milestones.filter((milestone) => milestone.id !== WHISKER_WOODS_PLAYTEST_MILESTONE_ID);
  const itemsById = new Map(
    normalized.items.map((item) => [
      item.id,
      item
    ] as const)
  );

  whiskerWoodsPlaytestItemSpecs.forEach((spec) => {
    const id = playtestItemId(spec.id);
    const resolution = resolveBinder?.(spec) || {};
    const existing = itemsById.get(id);
    if (existing) {
      itemsById.set(id, {
        ...existing,
        milestoneId: WHISKER_WOODS_PLAYTEST_MILESTONE_ID,
        binderSlotId: existing.binderSlotId || resolution.binderSlotId || "",
        driveFolderPath: existing.driveFolderPath || resolution.driveFolderPath || "",
        googleDriveFolderId: existing.googleDriveFolderId || resolution.googleDriveFolderId || "",
        requiredFileTypes: existing.requiredFileTypes?.length ? existing.requiredFileTypes : spec.requiredFileTypes,
        xpReward: existing.xpReward || roadmapPriorityXp(spec.priority),
        buildTier: existing.buildTier || spec.buildTier
      });
      return;
    }

    itemsById.set(id, createRoadmapItem({
      id,
      milestoneId: WHISKER_WOODS_PLAYTEST_MILESTONE_ID,
      title: spec.title,
      category: spec.category,
      type: spec.type,
      priority: spec.priority,
      status: "missing",
      binderSlotId: resolution.binderSlotId || "",
      driveFolderPath: resolution.driveFolderPath || "",
      googleDriveFolderId: resolution.googleDriveFolderId || "",
      requiredFileTypes: spec.requiredFileTypes,
      xpReward: roadmapPriorityXp(spec.priority),
      buildTier: spec.buildTier,
      notes: spec.notes
    }));
  });

  const candidate = normalizeRoadmapData({
    milestones: [mergedMilestone, ...otherMilestones],
    items: [...itemsById.values()],
    updatedAt: normalized.updatedAt
  });
  return sameRoadmapContent(normalized, candidate) ? normalized : { ...candidate, updatedAt: timestamp };
}

export const whiskerWoodsPlaytestItemSpecs: RoadmapPlaytestItemSpec[] = [
  characterSpec("gwen-idle-sprites", "Gwen idle sprites", "Gwen", ["Idle Sprite Sheet", "Idle"]),
  characterSpec("gwen-run-sprites", "Gwen run sprites", "Gwen", ["Run Sprite Sheet", "Run Cycle"]),
  characterSpec("gwen-sword-swipe-sprites", "Gwen sword swipe sprites", "Gwen", ["Sword Attack 01", "Sword Attack", "Gwen's OG Sword"]),
  characterSpec("gwen-hurt-sprite", "Gwen hurt sprite", "Gwen", ["Hit Reaction", "Hurt"]),
  characterSpec("gwen-dialogue-portrait", "Gwen dialogue portrait", "Gwen", ["Dialogue Sprite", "Neutral"]),
  characterSpec("tohm-idle-sprite", "Tohm idle sprite", "Tohm Kyatt", ["Idle Sprite Sheet", "Idle"]),
  characterSpec("tohm-dialogue-portrait", "Tohm dialogue portrait", "Tohm Kyatt", ["Dialogue Sprite", "Neutral"]),
  ...enemyAnimationSpecs("crayhusk", "Crayhusk", ["Crayhusk"]),
  ...enemyAnimationSpecs("prawnhusk", "Prawnhusk", ["Prawnhusk", "PrawnHusk"]),
  ...enemyAnimationSpecs("dapplefly", "Dapplefly", ["Dapplefly", "Dapply fly", "Dappleflys"]),
  ...[
    "Dusk Slime",
    "Bitter Slime",
    "Sweet Slime",
    "Savory Slime",
    "Sour Slime",
    "Salty Slime",
    "Spicy Slime",
    "Cauldron Echo Slime"
  ].map((name) => creatureAnimationSetSpec(`slime-${slugify(name)}`, `${name} animation set`, [name, "Slime"])),
  environmentSpec("whisker-woods-tree-set", "Whisker Woods tree set"),
  environmentSpec("grass-patch-set", "Grass patch set"),
  environmentSpec("village-house-props", "Village house props"),
  environmentSpec("fishing-dock", "Fishing dock"),
  environmentSpec("farm-plot", "Farm plot"),
  environmentSpec("cliff-pieces", "Cliff pieces"),
  productionSpec("dialogue-box", "Dialogue box", "UI", "UI Asset", "critical", ["PNG", "Figma", "PSD"], "Dialogue presentation for Gwen/Tohm/NPC conversations."),
  productionSpec("quest-tracker", "Quest tracker", "UI", "UI Asset", "critical", ["PNG", "Figma", "PSD"], "On-screen quest tracker for the first quest loop."),
  productionSpec("inventory-icons", "Inventory icons", "UI", "UI Asset", "high", ["PNG", "PSD"], "Core inventory icon style for early playtest pickups."),
  productionSpec("cooking-minigame-ui", "Cooking minigame UI", "UI", "UI Asset", "critical", ["PNG", "Figma", "PSD"], "Cooking minigame interface needed for the demo loop."),
  productionSpec("meal-wheel", "Meal wheel", "UI", "UI Asset", "critical", ["PNG", "Figma", "PSD"], "Meal wheel UI for equipping/using cooked meals."),
  productionSpec("gwen-intro-dialogue", "Gwen intro dialogue", "Writing", "Dialogue", "critical", ["TXT", "DOCX"], "Opening Gwen dialogue for the playtest."),
  productionSpec("tohm-tutorial-dialogue", "Tohm tutorial dialogue", "Writing", "Dialogue", "critical", ["TXT", "DOCX"], "Tohm tutorial dialogue for gathering, cooking, and first responsibilities."),
  productionSpec("farmer-npc-dialogue", "Farmer NPC dialogue", "Writing", "Dialogue", "high", ["TXT", "DOCX"], "Farmer NPC interaction in Whisker Woods village."),
  productionSpec("first-quest-text", "First quest text", "Writing", "Quest Text", "critical", ["TXT", "DOCX"], "First quest objective text, handoff copy, and completion text."),
  productionSpec("sword-swipe-sfx", "Sword swipe SFX", "Audio", "SFX", "critical", ["WAV", "MP3"], "Primary Gwen sword swipe sound."),
  productionSpec("bug-hit-sfx", "Bug hit SFX", "Audio", "SFX", "high", ["WAV", "MP3"], "Impact sound when bug enemies are hit."),
  productionSpec("cooking-chop-sfx", "Cooking chop SFX", "Audio", "SFX", "high", ["WAV", "MP3"], "Cooking chop sound for the minigame or prep flow."),
  productionSpec("village-ambience", "Village ambience", "Audio", "Ambience", "high", ["WAV", "MP3", "OGG"], "Whisker Woods village ambience loop.")
];

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

function characterSpec(id: string, title: string, subjectName: string, slotHints: string[]): RoadmapPlaytestItemSpec {
  const dialogue = /dialogue|portrait/i.test(title);
  return {
    id,
    title,
    category: "Character Art",
    type: dialogue ? "Dialogue Portrait" : "Character Animation",
    priority: /gwen/i.test(subjectName) ? "critical" : "high",
    buildTier: "required",
    requiredFileTypes: dialogue ? ["PNG", "PSD"] : ["PNG", "Sprite Sheet"],
    notes: dialogue
      ? `${title} for the Whisker Woods playtest dialogue scenes.`
      : `${title} for the playable demo movement/combat set.`,
    subjectHints: [subjectName],
    sectionHints: dialogue ? ["Dialogue Sprites", "App Buttons & UI Slots"] : ["Sprite Sheets", "Combat / Gameplay Sprites", "Tool Binder"],
    slotHints
  };
}

function enemyAnimationSpecs(idPrefix: string, subjectName: string, subjectHints: string[]) {
  return [
    creatureAnimationSpec(`${idPrefix}-idle`, `${subjectName} idle`, subjectHints, ["Idle Sprite Sheet", "Idle"]),
    creatureAnimationSpec(`${idPrefix}-walk`, `${subjectName} walk`, subjectHints, ["Move / Crawl Sprite Sheet", "Walk", "Move"]),
    creatureAnimationSpec(`${idPrefix}-attack`, `${subjectName} attack`, subjectHints, ["Attack 01 Sprite Sheet", "Attack 01"]),
    creatureAnimationSpec(`${idPrefix}-hurt`, `${subjectName} hurt`, subjectHints, ["Hit Reaction Sprite Sheet", "Hit Reaction", "Hurt"]),
    creatureAnimationSpec(`${idPrefix}-death`, `${subjectName} death`, subjectHints, ["Death / Defeat Sprite Sheet", "Death", "Defeat"])
  ];
}

function creatureAnimationSpec(id: string, title: string, subjectHints: string[], slotHints: string[]): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category: "Enemy Art",
    type: "Enemy Animation",
    priority: "critical",
    buildTier: "required",
    requiredFileTypes: ["PNG", "Sprite Sheet"],
    notes: `${title} animation for Whisker Woods combat readability.`,
    subjectHints,
    sectionHints: ["Sprite Sheets", "Creature Sprite Sheets"],
    slotHints
  };
}

function creatureAnimationSetSpec(id: string, title: string, subjectHints: string[]): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category: "Enemy Art",
    type: "Slime Animation Set",
    priority: "high",
    buildTier: "required",
    requiredFileTypes: ["PNG", "Sprite Sheet"],
    notes: "Animation set should cover idle, movement, contact/attack, hurt, and death/defeat states.",
    subjectHints,
    sectionHints: ["Sprite Sheets", "Creature Sprite Sheets"],
    slotHints: ["Idle Sprite Sheet", "Move / Crawl Sprite Sheet", "Special Behavior Sprite Sheet", "Death / Defeat Sprite Sheet"]
  };
}

function environmentSpec(id: string, title: string): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category: "Environment Art",
    type: "Environment Asset Set",
    priority: "high",
    buildTier: "required",
    requiredFileTypes: ["PNG", "PSD", "Tileset"],
    notes: `${title} needed for the first Whisker Woods village/playtest area.`,
    subjectHints: ["Whisker Woods"],
    sectionHints: ["Environment Images"],
    slotHints: [title]
  };
}

function productionSpec(
  id: string,
  title: string,
  category: RoadmapItemCategory,
  type: string,
  priority: RoadmapPriority,
  requiredFileTypes: string[],
  notes: string
): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category,
    type,
    priority,
    buildTier: "required",
    requiredFileTypes,
    notes,
    subjectHints: [],
    sectionHints: [],
    slotHints: []
  };
}

function playtestItemId(id: string) {
  return `roadmap-whisker-woods-playtest-${slugify(id)}`;
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

function uniqueStrings(values: string[]) {
  return values.map((value) => String(value || "").trim()).filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sameRoadmapContent(left: RoadmapData, right: RoadmapData) {
  return JSON.stringify({ ...left, updatedAt: "" }) === JSON.stringify({ ...right, updatedAt: "" });
}
