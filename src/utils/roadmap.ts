import type {
  RoadmapBuildTier,
  RoadmapData,
  RoadmapItem,
  RoadmapItemCategory,
  RoadmapItemStatus,
  RoadmapMilestone,
  RoadmapMilestoneStatus,
  RoadmapPriority,
  RoadmapProductionTrack,
  RoadmapSlotVisual
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
  phase: string;
  productionTrack: RoadmapProductionTrack;
  slotVisual: RoadmapSlotVisual;
  summary: string;
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
  "Ingredient Art",
  "Tool Art",
  "UI",
  "Writing",
  "Audio",
  "Animation",
  "Gameplay",
  "Level Design",
  "Quest"
];

export const roadmapProductionTracks: RoadmapProductionTrack[] = [
  "Art",
  "Gameplay Systems",
  "Level Design",
  "Quest",
  "Writing",
  "Audio",
  "UI"
];

export const roadmapPhases = [
  "Phase 1 - Village & Core Loop",
  "Phase 2 - Forest Rescue & Combat",
  "Phase 3 - Tavern Return & Cooking"
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
      phase: spec.phase,
      productionTrack: spec.productionTrack,
      slotVisual: spec.slotVisual,
      summary: spec.summary,
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
        buildTier: existing.buildTier || spec.buildTier,
        phase: existing.phase || spec.phase,
        productionTrack: existing.productionTrack || spec.productionTrack,
        slotVisual: existing.slotVisual || spec.slotVisual,
        summary: existing.summary || spec.summary
      });
      return;
    }

    itemsById.set(id, createRoadmapItem({
      id,
      milestoneId: WHISKER_WOODS_PLAYTEST_MILESTONE_ID,
      title: spec.title,
      category: spec.category,
      type: spec.type,
      phase: spec.phase,
      productionTrack: spec.productionTrack,
      slotVisual: spec.slotVisual,
      summary: spec.summary,
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
  questSpec(
    "quest-tohm-ingredient-run",
    "Quest: Tohm sends Gwen for feast ingredients",
    roadmapPhases[0],
    "The opening quest sends Gwen to gather Boar Meat, Purfox, and Sunchee before nightfall for the Feast of Full Plates.",
    "Write and set up the first objective chain: receive list from Tohm, gather each ingredient, track progress, and return before the feast."
  ),
  questSpec(
    "quest-kap-corrupted-pool-rescue",
    "Quest: Save Kap at the corrupted pool",
    roadmapPhases[1],
    "Gwen finds Kap stranded in a corrupted glowing pool, clears bug pressure, and triggers the Prawnhusk miniboss.",
    "Build the rescue sequence from approach dialogue through bug waves, Kap safety beat, Prawnhusk reveal, and post-fight handoff."
  ),
  questSpec(
    "quest-return-feast-fire-meal",
    "Quest: Return to the Feast and cook Fire Meal",
    roadmapPhases[2],
    "Gwen returns to the living tavern, joins the Feast of Full Plates, cooks the Fire Meal, and begins the magical meal mystery.",
    "Set up tavern return, feast staging, Tohm's test, Fire Meal cooking attempt, and the first trance hook."
  ),
  gameplaySpec("core-movement-controller", "Gwen movement controller", roadmapPhases[0], "Walk, run, directional facing, interact range, and responsive movement needed before content testing."),
  gameplaySpec("basic-combat-loop", "Basic sword combat loop", roadmapPhases[0], "Light attack, hit reaction, damage timing, enemy knockback, and simple combat feedback."),
  gameplaySpec("gathering-interaction-system", "Gathering interaction system", roadmapPhases[0], "Ingredient pickup prompts, tool-required gathering checks, inventory handoff, and quest progress updates."),
  gameplaySpec("tool-equip-use-system", "Tool equip and use system", roadmapPhases[0], "Equip Gwen's tools, play idle/run/use animations, and route tool use to world interactions."),
  gameplaySpec("npc-dialogue-system", "NPC dialogue interaction system", roadmapPhases[0], "Talk prompts, portrait display, dialogue progression, and quest handoff support."),
  gameplaySpec("enemy-ai-bug-basics", "Bug enemy AI basics", roadmapPhases[1], "Patrol, aggro, chase, attack, hurt, death, and nest pressure behavior for the first bug fights."),
  gameplaySpec("prawnhusk-miniboss-system", "Prawnhusk miniboss encounter", roadmapPhases[1], "Boss arena lock, telegraphs, attack pattern, health pacing, Kap safety beat, and victory unlock."),
  gameplaySpec("cooking-minigame-loop", "Cooking minigame loop", roadmapPhases[2], "Ingredient prep, timing, result state, recipe completion, and failure-safe playtest flow."),
  gameplaySpec("meal-power-unlock-system", "Fire Meal power unlock", roadmapPhases[2], "Connect Fire Meal completion to Gwen's first magical ability and the next path unlock."),
  levelSpec("whisker-woods-village-blockout", "Whisker Woods village blockout", roadmapPhases[0], "Playable village space with tavern entrance, farm plot, houses, NPC points, and ingredient route exits."),
  levelSpec("first-gathering-route", "First ingredient gathering route", roadmapPhases[0], "A readable path from village into nearby woods that teaches gathering, tool use, and safe combat spacing."),
  levelSpec("corrupted-pool-arena", "Corrupted pool rescue arena", roadmapPhases[1], "Kap's pool area with approach lane, bug wave points, safe Kap position, and Prawnhusk arena readability."),
  levelSpec("living-tavern-feast-layout", "Living tavern feast layout", roadmapPhases[2], "Interior layout for Feast of Full Plates, cooking station, NPC gathering points, and Fire Meal staging."),
  characterSpec("gwen-idle-sprites", "Gwen idle sprites", "Gwen", ["Idle Sprite Sheet", "Idle"], roadmapPhases[0], "Playable Gwen idle animation for the demo controller."),
  characterSpec("gwen-run-sprites", "Gwen run sprites", "Gwen", ["Run Sprite Sheet", "Run Cycle"], roadmapPhases[0], "Playable Gwen run animation for Whisker Woods traversal."),
  characterSpec("gwen-sword-swipe-sprites", "Gwen sword swipe sprites", "Gwen", ["Sword Attack 01", "Sword Attack", "Gwen's OG Sword"], roadmapPhases[0], "Sword swipe animation tied to the first combat loop."),
  characterSpec("gwen-hurt-sprite", "Gwen hurt sprite", "Gwen", ["Hit Reaction", "Hurt"], roadmapPhases[0], "Damage reaction frame or animation for Gwen."),
  characterSpec("gwen-dialogue-portrait", "Gwen dialogue portrait", "Gwen", ["Dialogue Sprite", "Neutral"], roadmapPhases[0], "Gwen portrait for intro, Kap rescue, and tavern dialogue."),
  characterSpec("tohm-idle-sprite", "Tohm idle sprite", "Tohm Kyatt", ["Idle Sprite Sheet", "Idle"], roadmapPhases[0], "Tohm's idle sprite for tavern and tutorial scenes."),
  characterSpec("tohm-dialogue-portrait", "Tohm dialogue portrait", "Tohm Kyatt", ["Dialogue Sprite", "Neutral"], roadmapPhases[0], "Tohm portrait for tutorial, feast, and Fire Meal setup dialogue."),
  ...toolAnimationSpecs("makeshift-sickle", "Makeshift Sickle", "Tools / Sickle", roadmapPhases[0]),
  ...toolAnimationSpecs("makeshift-axe", "Makeshift Axe", "Tools / Axe", roadmapPhases[0]),
  ...toolAnimationSpecs("fishing-rod", "Fishing Rod", "Tools / Fishing Rod", roadmapPhases[1]),
  ...toolAnimationSpecs("hip-lantern", "Hip Lantern", "Tools / Lantern", roadmapPhases[1]),
  ...toolAnimationSpecs("makeshift-wooden-torch", "Makeshift Wooden Torch", "Tools / Torch", roadmapPhases[1]),
  ...toolAnimationSpecs("makeshift-shovel", "Makeshift Shovel", "Tools / Shovel", roadmapPhases[0]),
  ...ingredientAssetSpecs("boar-meat", "Boar Meat", roadmapPhases[0], ["Boar Meat"]),
  ...ingredientAssetSpecs("purfox", "Purfox", roadmapPhases[0], ["Purfox"]),
  ...ingredientAssetSpecs("sunchee", "Sunchee", roadmapPhases[0], ["Sunchee"]),
  ...ingredientAssetSpecs("honey", "Honey", roadmapPhases[2], ["Honey"]),
  ...ingredientAssetSpecs("gloomfin", "Gloomfin", roadmapPhases[1], ["Gloomfin"]),
  ...ingredientAssetSpecs("moonbutter-herb", "Moonbutter Herb", roadmapPhases[1], ["Moonbutter Herb"]),
  ...mealAssetSpecs("fire-meal", "Fire Meal", roadmapPhases[2], ["Fire Meal"]),
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
  environmentSpec("whisker-woods-tree-set", "Whisker Woods tree set", roadmapPhases[0]),
  environmentSpec("grass-patch-set", "Grass patch set", roadmapPhases[0]),
  environmentSpec("village-house-props", "Village house props", roadmapPhases[0]),
  environmentSpec("fishing-dock", "Fishing dock", roadmapPhases[1]),
  environmentSpec("farm-plot", "Farm plot", roadmapPhases[0]),
  environmentSpec("cliff-pieces", "Cliff pieces", roadmapPhases[1]),
  environmentSpec("corrupted-pool-set", "Corrupted pool set", roadmapPhases[1]),
  environmentSpec("living-tavern-cooking-counter", "Living tavern cooking counter", roadmapPhases[2]),
  productionSpec("dialogue-box", "Dialogue box", "UI", "UI Asset", "critical", ["PNG", "Figma", "PSD"], "Dialogue presentation for Gwen/Tohm/NPC conversations.", roadmapPhases[0], "UI", "ui"),
  productionSpec("quest-tracker", "Quest tracker", "UI", "UI Asset", "critical", ["PNG", "Figma", "PSD"], "On-screen quest tracker for the first quest loop.", roadmapPhases[0], "UI", "ui"),
  productionSpec("inventory-icons", "Inventory icons", "UI", "UI Asset", "high", ["PNG", "PSD"], "Core inventory icon style for early playtest pickups.", roadmapPhases[0], "UI", "ui"),
  productionSpec("cooking-minigame-ui", "Cooking minigame UI", "UI", "UI Asset", "critical", ["PNG", "Figma", "PSD"], "Cooking minigame interface needed for the demo loop.", roadmapPhases[2], "UI", "ui"),
  productionSpec("meal-wheel", "Meal wheel", "UI", "UI Asset", "critical", ["PNG", "Figma", "PSD"], "Meal wheel UI for equipping/using cooked meals.", roadmapPhases[2], "UI", "ui"),
  productionSpec("gwen-intro-dialogue", "Gwen intro dialogue", "Writing", "Dialogue", "critical", ["TXT", "DOCX"], "Opening Gwen dialogue for the playtest.", roadmapPhases[0], "Writing", "writing"),
  productionSpec("tohm-tutorial-dialogue", "Tohm tutorial dialogue", "Writing", "Dialogue", "critical", ["TXT", "DOCX"], "Tohm tutorial dialogue for gathering, cooking, and first responsibilities.", roadmapPhases[0], "Writing", "writing"),
  productionSpec("kap-rescue-dialogue", "Kap rescue dialogue", "Writing", "Dialogue", "critical", ["TXT", "DOCX"], "Kap's pool rescue dialogue, panic barks, and post-fight handoff.", roadmapPhases[1], "Writing", "writing"),
  productionSpec("farmer-npc-dialogue", "Farmer NPC dialogue", "Writing", "Dialogue", "high", ["TXT", "DOCX"], "Farmer NPC interaction in Whisker Woods village.", roadmapPhases[0], "Writing", "writing"),
  productionSpec("first-quest-text", "First quest text", "Writing", "Quest Text", "critical", ["TXT", "DOCX"], "First quest objective text, handoff copy, and completion text.", roadmapPhases[0], "Quest", "quest"),
  productionSpec("kap-rescue-quest-text", "Kap rescue quest text", "Writing", "Quest Text", "critical", ["TXT", "DOCX"], "Quest journal copy for the corrupted pool rescue and Prawnhusk objective.", roadmapPhases[1], "Quest", "quest"),
  productionSpec("sword-swipe-sfx", "Sword swipe SFX", "Audio", "SFX", "critical", ["WAV", "MP3"], "Primary Gwen sword swipe sound.", roadmapPhases[0], "Audio", "audio"),
  productionSpec("bug-hit-sfx", "Bug hit SFX", "Audio", "SFX", "high", ["WAV", "MP3"], "Impact sound when bug enemies are hit.", roadmapPhases[1], "Audio", "audio"),
  productionSpec("cooking-chop-sfx", "Cooking chop SFX", "Audio", "SFX", "high", ["WAV", "MP3"], "Cooking chop sound for the minigame or prep flow.", roadmapPhases[2], "Audio", "audio"),
  productionSpec("village-ambience", "Village ambience", "Audio", "Ambience", "high", ["WAV", "MP3", "OGG"], "Whisker Woods village ambience loop.", roadmapPhases[0], "Audio", "audio")
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
    phase: stringValue(input.phase, defaultRoadmapPhase(input.category, input.type, input.title)),
    productionTrack: stringValue(input.productionTrack, defaultProductionTrack(input.category, input.type)),
    slotVisual: stringValue(input.slotVisual, defaultSlotVisual(input.category, input.type)),
    summary: stringValue(input.summary, stringValue(input.notes, "")),
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
  const submitted = items.filter((item) => item.liveStatus === "uploaded" || item.liveStatus === "needs-review");
  const inProgress = items.filter((item) => item.liveStatus === "assigned" || item.liveStatus === "in-progress");
  const blocked = items.filter((item) => item.liveStatus === "blocked" || unmetDependencies(item, items).length > 0);
  const assigned = items.filter((item) => Boolean(item.assignedTo));
  const weightedProgress = items.reduce((total, item) => total + roadmapStatusProgressWeight(item.liveStatus), 0);
  const progress = items.length ? Math.round(weightedProgress / items.length) : 0;
  const ready = required.every((item) => item.liveStatus === "approved" || item.liveStatus === "complete");
  return {
    total: items.length,
    required: required.length,
    completed: completed.length,
    missing: missing.length,
    submitted: submitted.length,
    inProgress: inProgress.length,
    blocked: blocked.length,
    assigned: assigned.length,
    progress,
    buildReady: required.length > 0 && ready
  };
}

function roadmapStatusProgressWeight(status: RoadmapItemStatus | string) {
  if (status === "complete" || status === "approved") return 100;
  if (status === "uploaded" || status === "needs-review") return 72;
  if (status === "revision-needed") return 58;
  if (status === "in-progress") return 42;
  if (status === "assigned") return 18;
  if (status === "blocked") return 8;
  return 0;
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
      item.phase,
      item.productionTrack,
      item.slotVisual,
      item.summary,
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

function characterSpec(id: string, title: string, subjectName: string, slotHints: string[], phase: string, summary?: string): RoadmapPlaytestItemSpec {
  const dialogue = /dialogue|portrait/i.test(title);
  return {
    id,
    title,
    category: "Character Art",
    type: dialogue ? "Dialogue Portrait" : "Character Animation",
    phase,
    productionTrack: "Art",
    slotVisual: "character",
    summary: summary || title,
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
    creatureAnimationSpec(`${idPrefix}-idle`, `${subjectName} idle`, subjectHints, ["Idle Sprite Sheet", "Idle"], roadmapPhases[1]),
    creatureAnimationSpec(`${idPrefix}-walk`, `${subjectName} walk`, subjectHints, ["Move / Crawl Sprite Sheet", "Walk", "Move"], roadmapPhases[1]),
    creatureAnimationSpec(`${idPrefix}-attack`, `${subjectName} attack`, subjectHints, ["Attack 01 Sprite Sheet", "Attack 01"], roadmapPhases[1]),
    creatureAnimationSpec(`${idPrefix}-hurt`, `${subjectName} hurt`, subjectHints, ["Hit Reaction Sprite Sheet", "Hit Reaction", "Hurt"], roadmapPhases[1]),
    creatureAnimationSpec(`${idPrefix}-death`, `${subjectName} death`, subjectHints, ["Death / Defeat Sprite Sheet", "Death", "Defeat"], roadmapPhases[1])
  ];
}

function creatureAnimationSpec(id: string, title: string, subjectHints: string[], slotHints: string[], phase: string): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category: "Enemy Art",
    type: "Enemy Animation",
    phase,
    productionTrack: "Art",
    slotVisual: "bestiary",
    summary: `${title} animation tied to the first Whisker Woods combat encounters.`,
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
    phase: roadmapPhases[1],
    productionTrack: "Art",
    slotVisual: "bestiary",
    summary: `${title} for the slime family used in early Whisker Woods testing.`,
    priority: "high",
    buildTier: "required",
    requiredFileTypes: ["PNG", "Sprite Sheet"],
    notes: "Animation set should cover idle, movement, contact/attack, hurt, and death/defeat states.",
    subjectHints,
    sectionHints: ["Sprite Sheets", "Creature Sprite Sheets"],
    slotHints: ["Idle Sprite Sheet", "Move / Crawl Sprite Sheet", "Special Behavior Sprite Sheet", "Death / Defeat Sprite Sheet"]
  };
}

function environmentSpec(id: string, title: string, phase: string): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category: "Environment Art",
    type: "Environment Asset Set",
    phase,
    productionTrack: "Art",
    slotVisual: "environment",
    summary: `${title} for the first playable Whisker Woods area.`,
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
  notes: string,
  phase: string,
  productionTrack: RoadmapProductionTrack,
  slotVisual: RoadmapSlotVisual
): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category,
    type,
    phase,
    productionTrack,
    slotVisual,
    summary: notes,
    priority,
    buildTier: "required",
    requiredFileTypes,
    notes,
    subjectHints: [],
    sectionHints: [],
    slotHints: []
  };
}

function gameplaySpec(id: string, title: string, phase: string, notes: string): RoadmapPlaytestItemSpec {
  return productionSpec(id, title, "Gameplay", "Gameplay System", "critical", ["Implementation", "Tuning Notes"], notes, phase, "Gameplay Systems", "system");
}

function levelSpec(id: string, title: string, phase: string, notes: string): RoadmapPlaytestItemSpec {
  return productionSpec(id, title, "Level Design", "Playable Space", "critical", ["Blockout", "Map Notes"], notes, phase, "Level Design", "environment");
}

function questSpec(id: string, title: string, phase: string, summary: string, notes: string): RoadmapPlaytestItemSpec {
  return {
    ...productionSpec(id, title, "Quest", "Quest Beat", "critical", ["Quest Text", "Implementation Notes"], notes, phase, "Quest", "quest"),
    summary
  };
}

function toolAnimationSpecs(idPrefix: string, toolName: string, subjectHint: string, phase: string): RoadmapPlaytestItemSpec[] {
  const subjectHints = ["Gwen", toolName, subjectHint];
  const base = `Gwen ${toolName}`;
  return [
    toolSpec(`${idPrefix}-tool-design`, `${toolName} design sheet`, toolName, ["Tool Design", toolName], phase, `${toolName} standalone design for the tool binder.`),
    toolSpec(`${idPrefix}-tool-sprite`, `${toolName} sprite`, toolName, ["Tool Sprite", toolName], phase, `${toolName} in-game sprite and pickup/readable held version.`),
    characterToolSpec(`${idPrefix}-idle-pose`, `${base} idle pose`, subjectHints, ["Idle Pose", toolName], phase, `${base} idle stance while equipped.`),
    characterToolSpec(`${idPrefix}-run-pose`, `${base} run pose`, subjectHints, ["Run Pose", toolName], phase, `${base} run cycle while equipped.`),
    characterToolSpec(`${idPrefix}-use-start`, `${base} use start animation`, subjectHints, ["Start Animation", toolName], phase, `${base} startup frames when tool use begins.`),
    characterToolSpec(`${idPrefix}-use-loop`, `${base} use loop / middle animation`, subjectHints, ["Middle Animation", "Loop", toolName], phase, `${base} active/held frames for the tool action.`),
    characterToolSpec(`${idPrefix}-use-end`, `${base} use end animation`, subjectHints, ["End Animation", toolName], phase, `${base} recovery frames when Gwen stops using the tool.`)
  ];
}

function toolSpec(id: string, title: string, subjectName: string, slotHints: string[], phase: string, summary: string): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category: "Tool Art",
    type: "Tool Asset",
    phase,
    productionTrack: "Art",
    slotVisual: "art-binder",
    summary,
    priority: "high",
    buildTier: "required",
    requiredFileTypes: ["PNG", "PSD"],
    notes: summary,
    subjectHints: [subjectName, "Gwen", "Tool Binder"],
    sectionHints: ["Tool Binder", "Tools"],
    slotHints
  };
}

function characterToolSpec(id: string, title: string, subjectHints: string[], slotHints: string[], phase: string, summary: string): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category: "Character Art",
    type: "Tool Animation",
    phase,
    productionTrack: "Art",
    slotVisual: "character",
    summary,
    priority: "critical",
    buildTier: "required",
    requiredFileTypes: ["PNG", "Sprite Sheet"],
    notes: summary,
    subjectHints,
    sectionHints: ["Tool Binder", "Sprite Sheets", "Gwen Tools"],
    slotHints
  };
}

function ingredientAssetSpecs(idPrefix: string, ingredientName: string, phase: string, subjectHints: string[]): RoadmapPlaytestItemSpec[] {
  return [
    ingredientSpec(`${idPrefix}-tavern-render`, `${ingredientName} tavern cooking render`, ingredientName, phase, "High-quality close camera art for cooking/prep scenes.", ["High Quality", "Cooking Render", ingredientName], ["PNG", "PSD"]),
    ingredientSpec(`${idPrefix}-world-model`, `${ingredientName} in-world model`, ingredientName, phase, "In-world pickup or 3D/reference version for exploration spaces.", ["World Model", "Pickup", ingredientName], ["PNG", "GLB", "FBX", "Reference"]),
    ingredientSpec(`${idPrefix}-inventory-icon`, `${ingredientName} inventory icon`, ingredientName, phase, "Inventory/pantry icon used in UI and quest tracking.", ["Inventory Icon", "App Button", ingredientName], ["PNG", "PSD"]),
    ingredientSpec(`${idPrefix}-chopped-state`, `${ingredientName} chopped/prepped state`, ingredientName, phase, "Prepared ingredient state for cooking flow and pantry state slots.", ["Chopped", "Prepared", ingredientName], ["PNG", "PSD"]),
    ingredientSpec(`${idPrefix}-cooked-state`, `${ingredientName} cooked/fried state`, ingredientName, phase, "Cooked or fried ingredient state for recipes and meal assembly.", ["Cooked", "Fried", ingredientName], ["PNG", "PSD"])
  ].map((spec) => ({
    ...spec,
    subjectHints: uniqueStrings([...spec.subjectHints, ...subjectHints])
  }));
}

function ingredientSpec(
  id: string,
  title: string,
  ingredientName: string,
  phase: string,
  summary: string,
  slotHints: string[],
  requiredFileTypes: string[]
): RoadmapPlaytestItemSpec {
  return {
    id,
    title,
    category: "Ingredient Art",
    type: "Ingredient State",
    phase,
    productionTrack: "Art",
    slotVisual: "pantry",
    summary,
    priority: "high",
    buildTier: "required",
    requiredFileTypes,
    notes: `${summary} Keep this linked to the Pantry slot for ${ingredientName}.`,
    subjectHints: [ingredientName],
    sectionHints: ["The Pantry", "Ingredients", "Meals / Recipes", "App Buttons & UI Slots"],
    slotHints
  };
}

function mealAssetSpecs(idPrefix: string, mealName: string, phase: string, subjectHints: string[]): RoadmapPlaytestItemSpec[] {
  return [
    ingredientSpec(`${idPrefix}-recipe-card`, `${mealName} recipe card art`, mealName, phase, "Readable recipe card or prepared meal view for tavern cooking.", ["Recipe Card", mealName], ["PNG", "PSD"]),
    ingredientSpec(`${idPrefix}-meal-icon`, `${mealName} meal wheel icon`, mealName, phase, "Meal wheel and inventory icon for the first magical meal.", ["Meal Wheel", "Inventory Icon", mealName], ["PNG", "PSD"]),
    ingredientSpec(`${idPrefix}-cooked-plate`, `${mealName} cooked plate render`, mealName, phase, "Finished meal art shown during the close camera cooking payoff.", ["Cooked Plate", "Finished Meal", mealName], ["PNG", "PSD"])
  ].map((spec) => ({
    ...spec,
    category: "Ingredient Art",
    type: "Meal Asset",
    subjectHints: uniqueStrings([...spec.subjectHints, ...subjectHints])
  }));
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

function defaultRoadmapPhase(category: unknown, type: unknown, title: unknown) {
  const value = normalizeSearch([category, type, title].join(" "));
  if (value.includes("cook") || value.includes("meal") || value.includes("tavern") || value.includes("feast")) return roadmapPhases[2];
  if (value.includes("boss") || value.includes("enemy") || value.includes("bug") || value.includes("pool") || value.includes("kap")) return roadmapPhases[1];
  return roadmapPhases[0];
}

function defaultProductionTrack(category: unknown, type: unknown): RoadmapProductionTrack {
  const value = normalizeSearch([category, type].join(" "));
  if (value.includes("quest")) return "Quest";
  if (value.includes("gameplay") || value.includes("system")) return "Gameplay Systems";
  if (value.includes("level")) return "Level Design";
  if (value.includes("writing") || value.includes("dialogue")) return "Writing";
  if (value.includes("audio") || value.includes("sfx") || value.includes("ambience")) return "Audio";
  if (value.includes("ui")) return "UI";
  return "Art";
}

function defaultSlotVisual(category: unknown, type: unknown): RoadmapSlotVisual {
  const value = normalizeSearch([category, type].join(" "));
  if (value.includes("ingredient") || value.includes("meal") || value.includes("pantry")) return "pantry";
  if (value.includes("enemy") || value.includes("creature") || value.includes("slime")) return "bestiary";
  if (value.includes("character") || value.includes("npc")) return "character";
  if (value.includes("environment") || value.includes("level")) return "environment";
  if (value.includes("quest")) return "quest";
  if (value.includes("gameplay") || value.includes("system")) return "system";
  if (value.includes("audio")) return "audio";
  if (value.includes("writing") || value.includes("dialogue")) return "writing";
  if (value.includes("ui")) return "ui";
  return "art-binder";
}

function normalizeSearch(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
