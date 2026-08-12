import type {
  BestiaryCreature,
  DevelopmentBoardAttachment,
  DevelopmentBoardConnection,
  DevelopmentBoardData,
  DevelopmentBoardGroup,
  DevelopmentBoardNode,
  DevelopmentBoardNodeStatus,
  LoreEntry,
  StoryReference,
  WorldBuildingData,
  WorldBuildingEntry
} from "../types";

const BOARD_SEED_VERSION = 1;
const SEED_DATE = "2026-08-11T00:00:00.000Z";

export const developmentBoardNodeTypes = [
  "Character",
  "Boss",
  "Story",
  "Story Arc",
  "Quest",
  "Location",
  "Visual Design",
  "Color Palette",
  "Combat Design",
  "Boss Moves",
  "Encounter",
  "Cook Battle",
  "Dish",
  "Gameplay System",
  "Lore",
  "Idea",
  "Production",
  "Custom"
] as const;

export const developmentBoardRelationshipTypes = [
  "depends-on",
  "blocks",
  "related-to",
  "part-of",
  "contains",
  "story-relationship",
  "location-relationship",
  "character-relationship",
  "custom"
] as const;

export const developmentBoardStatuses: DevelopmentBoardNodeStatus[] = [
  "not-started",
  "in-progress",
  "review",
  "complete",
  "production-locked"
];

export interface DevelopmentBoardTemplateDefinition {
  id: string;
  label: string;
  description: string;
  nodes: Array<{
    key: string;
    title: string;
    type: string;
    status?: DevelopmentBoardNodeStatus;
    offset: { x: number; y: number };
  }>;
  connections: Array<{ source: string; target: string; relationshipType: string }>;
  group: { title: string; width: number; height: number };
}

export const developmentBoardTemplates: DevelopmentBoardTemplateDefinition[] = [
  {
    id: "character-cluster",
    label: "Character Cluster",
    description: "Writing, visual, gameplay, and future production planning for a character.",
    group: { title: "New Character", width: 1260, height: 930 },
    nodes: [
      { key: "character", title: "New Character", type: "Character", offset: { x: 50, y: 70 } },
      { key: "pitch", title: "Character Pitch", type: "Story", offset: { x: 360, y: 70 } },
      { key: "biography", title: "Biography & Personality", type: "Story", offset: { x: 670, y: 70 } },
      { key: "arc", title: "Story Arc & Relationships", type: "Story Arc", offset: { x: 970, y: 70 } },
      { key: "references", title: "Visual References", type: "Visual Design", offset: { x: 210, y: 350 } },
      { key: "design", title: "Concept & Final Design", type: "Visual Design", offset: { x: 520, y: 350 } },
      { key: "palette", title: "Color Palette", type: "Color Palette", offset: { x: 830, y: 350 } },
      { key: "role", title: "Gameplay Role & Abilities", type: "Gameplay System", offset: { x: 360, y: 630 } },
      { key: "moves", title: "Boss Moves / Combat", type: "Boss Moves", offset: { x: 670, y: 630 } },
      { key: "production", title: "Full Production", type: "Production", status: "production-locked", offset: { x: 970, y: 630 } }
    ],
    connections: [
      { source: "character", target: "pitch", relationshipType: "contains" },
      { source: "pitch", target: "biography", relationshipType: "depends-on" },
      { source: "biography", target: "arc", relationshipType: "depends-on" },
      { source: "pitch", target: "references", relationshipType: "depends-on" },
      { source: "references", target: "design", relationshipType: "depends-on" },
      { source: "design", target: "palette", relationshipType: "depends-on" },
      { source: "pitch", target: "role", relationshipType: "depends-on" },
      { source: "role", target: "moves", relationshipType: "depends-on" },
      { source: "arc", target: "production", relationshipType: "depends-on" },
      { source: "palette", target: "production", relationshipType: "depends-on" },
      { source: "moves", target: "production", relationshipType: "depends-on" }
    ]
  },
  {
    id: "boss-cluster",
    label: "Boss Cluster",
    description: "Purpose, visual, combat, phases, arena, rewards, and production lock.",
    group: { title: "New Boss", width: 1260, height: 650 },
    nodes: [
      { key: "boss", title: "New Boss", type: "Boss", offset: { x: 50, y: 70 } },
      { key: "story", title: "Story / Purpose", type: "Story", offset: { x: 360, y: 70 } },
      { key: "visual", title: "Visual Design", type: "Visual Design", offset: { x: 670, y: 70 } },
      { key: "combat", title: "Combat Philosophy", type: "Combat Design", offset: { x: 970, y: 70 } },
      { key: "moves", title: "Boss Moves & Phases", type: "Boss Moves", offset: { x: 210, y: 350 } },
      { key: "arena", title: "Arena / Encounter", type: "Encounter", offset: { x: 520, y: 350 } },
      { key: "rewards", title: "Rewards", type: "Production", offset: { x: 830, y: 350 } },
      { key: "production", title: "Full Production", type: "Production", status: "production-locked", offset: { x: 1070, y: 350 } }
    ],
    connections: [
      { source: "boss", target: "story", relationshipType: "contains" },
      { source: "story", target: "visual", relationshipType: "depends-on" },
      { source: "story", target: "combat", relationshipType: "depends-on" },
      { source: "combat", target: "moves", relationshipType: "depends-on" },
      { source: "moves", target: "arena", relationshipType: "depends-on" },
      { source: "arena", target: "rewards", relationshipType: "depends-on" },
      { source: "visual", target: "production", relationshipType: "depends-on" },
      { source: "rewards", target: "production", relationshipType: "depends-on" }
    ]
  },
  {
    id: "cook-battle-cluster",
    label: "Cook Battle Boss",
    description: "Character, dish, cooking gimmick, dialogue, rewards, and production planning.",
    group: { title: "New Cook Battle Boss", width: 1560, height: 650 },
    nodes: [
      { key: "boss", title: "New Cook Battle Boss", type: "Cook Battle", offset: { x: 50, y: 70 } },
      { key: "story", title: "Character Story & Personality", type: "Story", offset: { x: 360, y: 70 } },
      { key: "design", title: "Character Design & Palette", type: "Visual Design", offset: { x: 670, y: 70 } },
      { key: "dish", title: "Signature Dish", type: "Dish", offset: { x: 980, y: 70 } },
      { key: "gimmick", title: "Cook Battle Gimmick", type: "Gameplay System", offset: { x: 1290, y: 70 } },
      { key: "dialogue", title: "Dialogue", type: "Story", offset: { x: 360, y: 350 } },
      { key: "mechanics", title: "Cooking Mechanics", type: "Combat Design", offset: { x: 670, y: 350 } },
      { key: "rewards", title: "Rewards", type: "Production", offset: { x: 980, y: 350 } },
      { key: "production", title: "Full Production", type: "Production", status: "production-locked", offset: { x: 1290, y: 350 } }
    ],
    connections: [
      { source: "boss", target: "story", relationshipType: "contains" },
      { source: "story", target: "design", relationshipType: "depends-on" },
      { source: "story", target: "dish", relationshipType: "depends-on" },
      { source: "dish", target: "gimmick", relationshipType: "depends-on" },
      { source: "story", target: "dialogue", relationshipType: "depends-on" },
      { source: "gimmick", target: "mechanics", relationshipType: "depends-on" },
      { source: "dialogue", target: "production", relationshipType: "depends-on" },
      { source: "mechanics", target: "production", relationshipType: "depends-on" },
      { source: "rewards", target: "production", relationshipType: "depends-on" }
    ]
  }
];

export function createInitialDevelopmentBoard(
  entries: LoreEntry[] = [],
  creatures: BestiaryCreature[] = [],
  worldBuilding?: WorldBuildingData,
  storyReferences: StoryReference[] = []
): DevelopmentBoardData {
  const groups: DevelopmentBoardGroup[] = [
    seedGroup("group-tales", "Tales of the Tavern", "Active pre-production / paused production", 40, 40, 2100, 520, "#a66a2c"),
    seedGroup("group-tutorial", "Whisken Village / Tutorial", "Opening village, tutorial encounters, and early boss planning.", 40, 660, 2100, 1540, "#557b5e"),
    seedGroup("group-muramar", "Mur'amar", "Canonical character work and boss planning.", 2260, 40, 1320, 1080, "#7c5f91"),
    seedGroup("group-cedar", "Cedar / Cedric", "Name clarification and related pre-production work.", 2260, 1240, 1320, 920, "#8b6b42"),
    seedGroup("group-lyra", "Lyra", "Character and encounter planning without invented canon.", 3700, 40, 1320, 920, "#55718d"),
    seedGroup("group-ice-queen", "Ice Queen", "Act 1 boss pre-production.", 3700, 1080, 1320, 1140, "#5b7f99"),
    seedGroup("group-cook-battles", "Cook Battles", "Reusable character, dish, and battle development.", 5140, 40, 1700, 1460, "#a34f4f")
  ];

  const nodes: DevelopmentBoardNode[] = [];
  const connections: DevelopmentBoardConnection[] = [];
  const addNode = (input: Partial<DevelopmentBoardNode> & Pick<DevelopmentBoardNode, "id" | "title" | "type">) => {
    const node = createDevelopmentBoardNode({ ...input, createdAt: SEED_DATE, updatedAt: SEED_DATE });
    nodes.push(node);
    return node;
  };
  const addConnection = (sourceNodeId: string, targetNodeId: string, relationshipType = "depends-on", label = "") => {
    connections.push(createDevelopmentBoardConnection({
      id: `connection-${sourceNodeId}-${targetNodeId}`,
      sourceNodeId,
      targetNodeId,
      relationshipType,
      label,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE
    }));
  };

  addNode({
    id: "node-current-phase",
    title: "Active Pre-Production / Paused Production",
    type: "Production",
    description: "Active now: worldbuilding, writing, character design, combat design, game design, and production planning.",
    notes: "Full production remains paused until funding is available.",
    tags: ["current phase", "pre-production"],
    groupId: "group-tales",
    position: { x: 120, y: 150 },
    width: 410
  });
  addNode({
    id: "node-funding-paths",
    title: "Funding Unlock Paths",
    type: "Idea",
    description: "Publisher / external funding, or STL Productionz revenue reinvestment.",
    tags: ["funding"],
    groupId: "group-tales",
    position: { x: 620, y: 150 },
    width: 370
  });
  addNode({
    id: "node-full-production-lock",
    title: "Full Production",
    type: "Production",
    description: "Implementation work reserved for a funded production period.",
    status: "production-locked",
    groupId: "group-tales",
    position: { x: 1110, y: 150 },
    width: 330
  });
  addConnection("node-funding-paths", "node-full-production-lock", "depends-on", "Funding unlocks production");

  const junoLink = findLinkedEntity(["Juno"], entries, creatures, worldBuilding, storyReferences);
  addNode({
    id: "node-juno",
    title: "Juno",
    type: "Boss",
    description: "First tutorial boss fight in Whisken Village.",
    groupId: "group-tutorial",
    position: { x: 120, y: 780 },
    ...junoLink
  });
  addNode({
    id: "node-juno-story",
    title: "Juno Story / Character Documentation",
    type: "Story",
    description: "Existing information needed. Do not invent Juno's story.",
    ownerId: "stlprodz1101-gmail-com",
    ownerName: "Sebastien",
    groupId: "group-tutorial",
    position: { x: 460, y: 780 }
  });
  addNode({
    id: "node-juno-moves",
    title: "Juno Boss Moves",
    type: "Boss Moves",
    description: "Tutorial boss move set for Whisken Village.",
    ownerId: "marvin-lead-developer",
    ownerName: "Marvin",
    groupId: "group-tutorial",
    position: { x: 800, y: 780 }
  });
  addConnection("node-juno", "node-juno-story", "contains");
  addConnection("node-juno-story", "node-juno-moves");

  const boarLink = findLinkedEntity(["Mystical Boar", "Magical Boar Boss", "Boar"], entries, creatures, worldBuilding, storyReferences);
  addNode({ id: "node-mystical-boar", title: "Mystical Boar", type: "Boss", description: "Early magical ingredient hunt and boss encounter.", groupId: "group-tutorial", position: { x: 120, y: 1120 }, ...boarLink });
  addNode({ id: "node-boar-story", title: "Mystical Boar Story / Lore", type: "Lore", description: "Needs existing information or writing.", ownerId: "stlprodz1101-gmail-com", ownerName: "Sebastien", groupId: "group-tutorial", position: { x: 460, y: 1120 } });
  addNode({ id: "node-boar-visual", title: "Mystical Boar Visual Design", type: "Visual Design", description: "Visual planning placeholder.", groupId: "group-tutorial", position: { x: 800, y: 1120 } });
  addNode({ id: "node-boar-moves", title: "Mystical Boar Boss Moves", type: "Boss Moves", description: "Combat move set and behavior.", ownerId: "marvin-lead-developer", ownerName: "Marvin", groupId: "group-tutorial", position: { x: 1140, y: 1120 } });
  addNode({ id: "node-boar-encounter", title: "Mystical Boar Encounter Design", type: "Encounter", description: "Arena, pacing, ingredient reward, and encounter flow.", groupId: "group-tutorial", position: { x: 1480, y: 1120 } });
  addNode({ id: "node-boar-production", title: "Mystical Boar Full Implementation", type: "Production", description: "Future funded production task.", status: "production-locked", groupId: "group-tutorial", position: { x: 1480, y: 1460 } });
  addConnection("node-mystical-boar", "node-boar-story", "contains");
  addConnection("node-boar-story", "node-boar-visual");
  addConnection("node-boar-story", "node-boar-moves");
  addConnection("node-boar-moves", "node-boar-encounter");
  addConnection("node-boar-visual", "node-boar-production");
  addConnection("node-boar-encounter", "node-boar-production");

  const muramarLink = findLinkedEntity(["Mur'amar", "Muramar"], entries, creatures, worldBuilding, storyReferences);
  addNode({ id: "node-muramar", title: muramarLink.linkedEntityId ? "Mur'amar" : "Muramar", type: "Character", description: "Canonical character source and related boss planning.", groupId: "group-muramar", position: { x: 2340, y: 160 }, ...muramarLink });
  addNode({ id: "node-muramar-story", title: "Mur'amar Story", type: "Story", description: "Review the linked canonical character information before expanding.", ownerId: "stlprodz1101-gmail-com", ownerName: "Sebastien", status: muramarLink.linkedEntityId ? "review" : "not-started", groupId: "group-muramar", position: { x: 2700, y: 160 }, ...muramarLink });
  addNode({ id: "node-muramar-design", title: "Mur'amar Character Design", type: "Visual Design", description: "Character design planning linked to the canonical story.", groupId: "group-muramar", position: { x: 2340, y: 500 } });
  addNode({ id: "node-muramar-palette", title: "Mur'amar Final Color Palette", type: "Color Palette", description: "Final palette selection.", ownerName: "Kari", groupId: "group-muramar", position: { x: 2700, y: 500 } });
  addNode({ id: "node-muramar-moves", title: "Mur'amar Boss Moves", type: "Boss Moves", description: "Boss move set based on the approved character direction.", ownerId: "marvin-lead-developer", ownerName: "Marvin", groupId: "group-muramar", position: { x: 3060, y: 500 } });
  addNode({ id: "node-muramar-encounter", title: "Mur'amar Encounter / Boss Design", type: "Encounter", description: "Encounter structure and arena planning.", groupId: "group-muramar", position: { x: 2700, y: 830 } });
  addNode({ id: "node-muramar-production", title: "Mur'amar Full Implementation", type: "Production", status: "production-locked", groupId: "group-muramar", position: { x: 3060, y: 830 } });
  addConnection("node-muramar", "node-muramar-story", "contains");
  addConnection("node-muramar-story", "node-muramar-design");
  addConnection("node-muramar-design", "node-muramar-palette");
  addConnection("node-muramar-story", "node-muramar-moves");
  addConnection("node-muramar-moves", "node-muramar-encounter");
  addConnection("node-muramar-palette", "node-muramar-production");
  addConnection("node-muramar-encounter", "node-muramar-production");

  addNode({ id: "node-cedar-cedric-canon", title: "Canon Check: Cedar / Cedric", type: "Lore", description: "Confirm whether Cedar and Cedric are separate characters or a naming inconsistency.", status: "review", ownerId: "stlprodz1101-gmail-com", ownerName: "Sebastien", groupId: "group-cedar", position: { x: 2340, y: 1360 } });
  addNode({ id: "node-cedar-moves", title: "Cedar Boss Moves", type: "Boss Moves", description: "Hold until the canonical identity and role are clear.", ownerId: "marvin-lead-developer", ownerName: "Marvin", groupId: "group-cedar", position: { x: 2700, y: 1360 } });
  addNode({ id: "node-cedric-palette", title: "Cedric Final Color Palette", type: "Color Palette", description: "Hold until the canonical identity and design are clear.", ownerName: "Kari", groupId: "group-cedar", position: { x: 2340, y: 1700 } });
  addNode({ id: "node-cedric-moves", title: "Cedric Boss Moves", type: "Boss Moves", description: "Hold until the canonical identity and role are clear.", ownerId: "marvin-lead-developer", ownerName: "Marvin", groupId: "group-cedar", position: { x: 2700, y: 1700 } });
  addConnection("node-cedar-cedric-canon", "node-cedar-moves");
  addConnection("node-cedar-cedric-canon", "node-cedric-palette");
  addConnection("node-cedar-cedric-canon", "node-cedric-moves");

  const lyraLink = findLinkedEntity(["Lyra"], entries, creatures, worldBuilding, storyReferences);
  addNode({ id: "node-lyra", title: "Lyra", type: "Character", description: "Character source and pre-production planning.", groupId: "group-lyra", position: { x: 3780, y: 160 }, ...lyraLink });
  addNode({ id: "node-lyra-story", title: "Lyra Story / Character Documentation", type: "Story", description: "Existing information needed. Do not invent missing canon.", ownerId: "stlprodz1101-gmail-com", ownerName: "Sebastien", groupId: "group-lyra", position: { x: 4140, y: 160 } });
  addNode({ id: "node-lyra-visual", title: "Lyra Visual Design", type: "Visual Design", description: "Visual planning based on approved character direction.", groupId: "group-lyra", position: { x: 3780, y: 500 } });
  addNode({ id: "node-lyra-moves", title: "Lyra Boss Moves", type: "Boss Moves", description: "Boss move set and combat identity.", ownerId: "marvin-lead-developer", ownerName: "Marvin", groupId: "group-lyra", position: { x: 4140, y: 500 } });
  addConnection("node-lyra", "node-lyra-story", "contains");
  addConnection("node-lyra-story", "node-lyra-visual");
  addConnection("node-lyra-story", "node-lyra-moves");

  const iceQueenLink = findLinkedEntity(["Ice Queen"], entries, creatures, worldBuilding, storyReferences);
  addNode({ id: "node-ice-queen", title: "Ice Queen", type: "Boss", description: "Act 1 ruler of the corrupted insect swarm.", groupId: "group-ice-queen", position: { x: 3780, y: 1200 }, ...iceQueenLink });
  addNode({ id: "node-ice-story", title: "Ice Queen Story / Character Documentation", type: "Story", description: "Review existing Cookbook material before expanding.", status: iceQueenLink.linkedEntityId ? "review" : "not-started", ownerId: "stlprodz1101-gmail-com", ownerName: "Sebastien", groupId: "group-ice-queen", position: { x: 4140, y: 1200 }, ...iceQueenLink });
  addNode({ id: "node-ice-design", title: "Ice Queen Character Design", type: "Visual Design", groupId: "group-ice-queen", position: { x: 3780, y: 1540 } });
  addNode({ id: "node-ice-palette", title: "Ice Queen Color Palette", type: "Color Palette", groupId: "group-ice-queen", position: { x: 4140, y: 1540 } });
  addNode({ id: "node-ice-moves", title: "Ice Queen Boss Moves", type: "Boss Moves", ownerId: "marvin-lead-developer", ownerName: "Marvin", groupId: "group-ice-queen", position: { x: 4500, y: 1540 } });
  addNode({ id: "node-ice-arena", title: "Ice Queen Arena / Encounter", type: "Encounter", groupId: "group-ice-queen", position: { x: 4140, y: 1870 } });
  addNode({ id: "node-ice-production", title: "Ice Queen Full Implementation", type: "Production", status: "production-locked", groupId: "group-ice-queen", position: { x: 4500, y: 1870 } });
  addConnection("node-ice-queen", "node-ice-story", "contains");
  addConnection("node-ice-story", "node-ice-design");
  addConnection("node-ice-design", "node-ice-palette");
  addConnection("node-ice-story", "node-ice-moves");
  addConnection("node-ice-moves", "node-ice-arena");
  addConnection("node-ice-palette", "node-ice-production");
  addConnection("node-ice-arena", "node-ice-production");

  addNode({ id: "node-cook-battles", title: "Cook Battles", type: "Cook Battle", description: "Plan the reusable Cook Battle boss format before creating specific bosses.", status: "in-progress", groupId: "group-cook-battles", position: { x: 5220, y: 160 } });
  addNode({ id: "node-cook-boss-planning", title: "Cook Battle Bosses - Planning", type: "Idea", description: "Decide scope and create specific bosses without inventing a fixed count.", groupId: "group-cook-battles", position: { x: 5580, y: 160 } });
  addNode({ id: "node-cook-writing", title: "Character Writing", type: "Story", description: "Character concepts, stories, personalities, and dialogue foundations.", ownerId: "stlprodz1101-gmail-com", ownerName: "Sebastien", groupId: "group-cook-battles", position: { x: 5220, y: 500 } });
  addNode({ id: "node-cook-visual", title: "Character Visual Development", type: "Visual Design", description: "Design and palette work after character direction is established.", ownerName: "Kari", groupId: "group-cook-battles", position: { x: 5580, y: 500 } });
  addNode({ id: "node-cook-dishes", title: "Signature Dishes", type: "Dish", groupId: "group-cook-battles", position: { x: 5940, y: 500 } });
  addNode({ id: "node-cook-mechanics", title: "Battle Mechanics & Cooking Gimmicks", type: "Gameplay System", groupId: "group-cook-battles", position: { x: 6300, y: 500 } });
  addNode({ id: "node-cook-dialogue", title: "Cook Battle Dialogue", type: "Story", groupId: "group-cook-battles", position: { x: 5220, y: 840 } });
  addNode({ id: "node-cook-rewards", title: "Cook Battle Rewards", type: "Production", groupId: "group-cook-battles", position: { x: 5580, y: 840 } });
  addNode({ id: "node-cook-production", title: "Cook Battle Full Production", type: "Production", status: "production-locked", groupId: "group-cook-battles", position: { x: 5940, y: 840 } });
  addConnection("node-cook-battles", "node-cook-boss-planning", "contains");
  addConnection("node-cook-boss-planning", "node-cook-writing");
  addConnection("node-cook-writing", "node-cook-visual");
  addConnection("node-cook-writing", "node-cook-dishes");
  addConnection("node-cook-dishes", "node-cook-mechanics");
  addConnection("node-cook-writing", "node-cook-dialogue");
  addConnection("node-cook-mechanics", "node-cook-rewards");
  addConnection("node-cook-visual", "node-cook-production");
  addConnection("node-cook-dialogue", "node-cook-production");
  addConnection("node-cook-rewards", "node-cook-production");

  return {
    id: "tales-development-board",
    title: "Tales Development Board",
    description: "A visual source map for Tales of the Tavern pre-production, dependencies, ownership, and canonical Cookbook links.",
    seedVersion: BOARD_SEED_VERSION,
    nodes,
    connections,
    groups,
    viewport: { x: 30, y: 30, zoom: 0.42 },
    updatedAt: SEED_DATE
  };
}

export function normalizeDevelopmentBoardData(
  value: unknown,
  fallback: DevelopmentBoardData = createEmptyDevelopmentBoard()
): DevelopmentBoardData {
  if (!value || typeof value !== "object") return cloneBoard(fallback);
  const source = value as Partial<DevelopmentBoardData>;
  const nodes = Array.isArray(source.nodes) ? source.nodes.map(normalizeDevelopmentBoardNode).filter(Boolean) as DevelopmentBoardNode[] : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const groups = Array.isArray(source.groups) ? source.groups.map(normalizeDevelopmentBoardGroup).filter(Boolean) as DevelopmentBoardGroup[] : [];
  const connections = Array.isArray(source.connections)
    ? source.connections
        .map(normalizeDevelopmentBoardConnection)
        .filter((connection): connection is DevelopmentBoardConnection => connection !== null)
        .filter((connection) => nodeIds.has(connection.sourceNodeId) && nodeIds.has(connection.targetNodeId))
    : [];
  return {
    id: stringValue(source.id, "tales-development-board"),
    title: stringValue(source.title, "Tales Development Board"),
    description: stringValue(source.description, "A visual map of Tales of the Tavern pre-production."),
    seedVersion: numberValue(source.seedVersion, 0, 999, BOARD_SEED_VERSION),
    nodes,
    connections,
    groups,
    viewport: normalizeViewport(source.viewport),
    updatedAt: stringValue(source.updatedAt, SEED_DATE)
  };
}

export function createEmptyDevelopmentBoard(): DevelopmentBoardData {
  const now = new Date().toISOString();
  return {
    id: "tales-development-board",
    title: "Tales Development Board",
    description: "A visual map of Tales of the Tavern pre-production.",
    seedVersion: BOARD_SEED_VERSION,
    nodes: [],
    connections: [],
    groups: [],
    viewport: { x: 0, y: 0, zoom: 0.75 },
    updatedAt: now
  };
}

export function sanitizeDevelopmentBoardForPersistence(value: unknown): DevelopmentBoardData {
  const board = normalizeDevelopmentBoardData(value);
  return {
    ...board,
    nodes: board.nodes.map((node) => ({
      ...node,
      attachments: node.attachments.filter((attachment) => /^https?:\/\//i.test(attachment.url))
    }))
  };
}

export function createDevelopmentBoardNode(
  input: Partial<DevelopmentBoardNode> & Pick<DevelopmentBoardNode, "title">
): DevelopmentBoardNode {
  const now = new Date().toISOString();
  const title = stringValue(input.title, "Untitled Node");
  return {
    id: stringValue(input.id, `development-node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title,
    type: stringValue(input.type, "Custom"),
    description: stringValue(input.description, ""),
    status: normalizeStatus(input.status),
    ownerId: stringValue(input.ownerId, ""),
    ownerName: stringValue(input.ownerName, ""),
    position: normalizePosition(input.position),
    width: numberValue(input.width, 220, 720, 300),
    height: numberValue(input.height, 130, 520, 190),
    groupId: stringValue(input.groupId, ""),
    linkedEntityType: stringValue(input.linkedEntityType, ""),
    linkedEntityId: stringValue(input.linkedEntityId, ""),
    linkedEntityCategory: stringValue(input.linkedEntityCategory, ""),
    tags: normalizeStringArray(input.tags),
    notes: stringValue(input.notes, ""),
    attachments: Array.isArray(input.attachments) ? input.attachments.map(normalizeAttachment).filter(Boolean) as DevelopmentBoardAttachment[] : [],
    createdAt: stringValue(input.createdAt, now),
    updatedAt: stringValue(input.updatedAt, now)
  };
}

export function createDevelopmentBoardConnection(
  input: Partial<DevelopmentBoardConnection> & Pick<DevelopmentBoardConnection, "sourceNodeId" | "targetNodeId">
): DevelopmentBoardConnection {
  const now = new Date().toISOString();
  return {
    id: stringValue(input.id, `development-connection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    sourceNodeId: stringValue(input.sourceNodeId, ""),
    targetNodeId: stringValue(input.targetNodeId, ""),
    relationshipType: stringValue(input.relationshipType, "related-to"),
    label: stringValue(input.label, ""),
    createdAt: stringValue(input.createdAt, now),
    updatedAt: stringValue(input.updatedAt, now)
  };
}

export function createDevelopmentBoardGroup(
  input: Partial<DevelopmentBoardGroup> & Pick<DevelopmentBoardGroup, "title">
): DevelopmentBoardGroup {
  const now = new Date().toISOString();
  return {
    id: stringValue(input.id, `development-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: stringValue(input.title, "New Group"),
    description: stringValue(input.description, ""),
    position: normalizePosition(input.position),
    width: numberValue(input.width, 600, 5000, 1200),
    height: numberValue(input.height, 400, 5000, 800),
    color: normalizeColor(input.color),
    collapsed: Boolean(input.collapsed),
    createdAt: stringValue(input.createdAt, now),
    updatedAt: stringValue(input.updatedAt, now)
  };
}

export function instantiateDevelopmentBoardTemplate(
  template: DevelopmentBoardTemplateDefinition,
  origin: { x: number; y: number },
  title: string
): { group: DevelopmentBoardGroup; nodes: DevelopmentBoardNode[]; connections: DevelopmentBoardConnection[] } {
  const stamp = Date.now();
  const idPrefix = `template-${slugify(title || template.label)}-${stamp}`;
  const group = createDevelopmentBoardGroup({
    id: `${idPrefix}-group`,
    title: stringValue(title, template.group.title),
    description: template.description,
    position: origin,
    width: template.group.width,
    height: template.group.height
  });
  const keyToId = new Map<string, string>();
  const nodes = template.nodes.map((definition) => {
    const id = `${idPrefix}-${definition.key}`;
    keyToId.set(definition.key, id);
    return createDevelopmentBoardNode({
      id,
      title: definition.key === "character" || definition.key === "boss" ? stringValue(title, definition.title) : definition.title,
      type: definition.type,
      status: definition.status,
      groupId: group.id,
      position: { x: origin.x + definition.offset.x, y: origin.y + definition.offset.y }
    });
  });
  const connections = template.connections.map((definition) => createDevelopmentBoardConnection({
    id: `${idPrefix}-connection-${definition.source}-${definition.target}`,
    sourceNodeId: keyToId.get(definition.source) || "",
    targetNodeId: keyToId.get(definition.target) || "",
    relationshipType: definition.relationshipType
  }));
  return { group, nodes, connections };
}

export function getDevelopmentBoardDependencyState(board: DevelopmentBoardData, nodeId: string) {
  const dependencyIds = board.connections
    .filter((connection) => connection.targetNodeId === nodeId && connection.relationshipType === "depends-on")
    .map((connection) => connection.sourceNodeId);
  const dependencies = dependencyIds
    .map((dependencyId) => board.nodes.find((node) => node.id === dependencyId))
    .filter((node): node is DevelopmentBoardNode => Boolean(node));
  const waitingOn = dependencies.filter((node) => node.status !== "complete");
  return {
    dependencies,
    waitingOn,
    isBlocked: waitingOn.length > 0,
    isReady: dependencies.length > 0 && waitingOn.length === 0
  };
}

export function developmentBoardDisplayStatus(board: DevelopmentBoardData, node: DevelopmentBoardNode) {
  if (node.status === "production-locked") return "PRODUCTION LOCKED";
  if (node.status === "complete") return "COMPLETE";
  if (node.status === "in-progress") return "IN PROGRESS";
  if (node.status === "review") return "REVIEW";
  const dependencyState = getDevelopmentBoardDependencyState(board, node.id);
  if (dependencyState.isBlocked) return "BLOCKED";
  if (dependencyState.isReady) return "READY";
  return "NOT STARTED";
}

export function developmentBoardIconName(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("character")) return "UserRound";
  if (normalized.includes("boss") || normalized.includes("combat") || normalized.includes("moves")) return "Swords";
  if (normalized.includes("story") || normalized.includes("lore")) return "BookOpen";
  if (normalized.includes("quest")) return "ScrollText";
  if (normalized.includes("location") || normalized.includes("encounter")) return "Map";
  if (normalized.includes("visual") || normalized.includes("palette")) return "Palette";
  if (normalized.includes("dish") || normalized.includes("cook")) return "ChefHat";
  if (normalized.includes("gameplay")) return "Gamepad2";
  if (normalized.includes("production")) return "Hammer";
  if (normalized.includes("idea")) return "Sparkles";
  return "StickyNote";
}

function findLinkedEntity(
  names: string[],
  entries: LoreEntry[],
  creatures: BestiaryCreature[],
  worldBuilding: WorldBuildingData | undefined,
  storyReferences: StoryReference[]
) {
  const normalizedNames = names.map(normalizeSearch);
  const entry = entries.find((candidate) => normalizedNames.includes(normalizeSearch(candidate.title)));
  if (entry) return { linkedEntityType: "entry", linkedEntityId: entry.id, linkedEntityCategory: entry.category };
  const creature = creatures.find((candidate) => normalizedNames.includes(normalizeSearch(candidate.name)));
  if (creature) return { linkedEntityType: "creature", linkedEntityId: creature.id, linkedEntityCategory: creature.category };
  const worldEntries = Object.values(worldBuilding || {}).flat() as WorldBuildingEntry[];
  const worldEntry = worldEntries.find((candidate) => normalizedNames.includes(normalizeSearch(candidate.title)));
  if (worldEntry) return { linkedEntityType: "world", linkedEntityId: worldEntry.id, linkedEntityCategory: worldEntry.category };
  const storyReference = storyReferences.find((candidate) => normalizedNames.includes(normalizeSearch(candidate.title)));
  if (storyReference) return { linkedEntityType: "story-reference", linkedEntityId: storyReference.id, linkedEntityCategory: "story" };
  return {};
}

function normalizeDevelopmentBoardNode(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<DevelopmentBoardNode>;
  if (!stringValue(input.title, "")) return null;
  return createDevelopmentBoardNode(input as Partial<DevelopmentBoardNode> & Pick<DevelopmentBoardNode, "title">);
}

function normalizeDevelopmentBoardConnection(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<DevelopmentBoardConnection>;
  if (!stringValue(input.sourceNodeId, "") || !stringValue(input.targetNodeId, "")) return null;
  return createDevelopmentBoardConnection(input as Partial<DevelopmentBoardConnection> & Pick<DevelopmentBoardConnection, "sourceNodeId" | "targetNodeId">);
}

function normalizeDevelopmentBoardGroup(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<DevelopmentBoardGroup>;
  if (!stringValue(input.title, "")) return null;
  return createDevelopmentBoardGroup(input as Partial<DevelopmentBoardGroup> & Pick<DevelopmentBoardGroup, "title">);
}

function normalizeAttachment(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<DevelopmentBoardAttachment>;
  const url = stringValue(input.url, "");
  if (!url) return null;
  return {
    id: stringValue(input.id, `development-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: stringValue(input.title, "Attachment"),
    url,
    kind: stringValue(input.kind, "link"),
    createdAt: stringValue(input.createdAt, new Date().toISOString())
  } as DevelopmentBoardAttachment;
}

function seedGroup(id: string, title: string, description: string, x: number, y: number, width: number, height: number, color: string) {
  return createDevelopmentBoardGroup({ id, title, description, position: { x, y }, width, height, color, createdAt: SEED_DATE, updatedAt: SEED_DATE });
}

function normalizeStatus(value: unknown): DevelopmentBoardNodeStatus {
  return developmentBoardStatuses.includes(value as DevelopmentBoardNodeStatus) ? value as DevelopmentBoardNodeStatus : "not-started";
}

function normalizePosition(value: unknown) {
  const input = value && typeof value === "object" ? value as { x?: unknown; y?: unknown } : {};
  return {
    x: numberValue(input.x, -100000, 100000, 0),
    y: numberValue(input.y, -100000, 100000, 0)
  };
}

function normalizeViewport(value: unknown) {
  const input = value && typeof value === "object" ? value as { x?: unknown; y?: unknown; zoom?: unknown } : {};
  return {
    x: numberValue(input.x, -100000, 100000, 0),
    y: numberValue(input.y, -100000, 100000, 0),
    zoom: numberValue(input.zoom, 0.05, 4, 0.75)
  };
}

function normalizeColor(value: unknown) {
  const color = stringValue(value, "#8a6338");
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#8a6338";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function normalizeSearch(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value: string) {
  return normalizeSearch(value).replace(/\s+/g, "-") || "item";
}

function cloneBoard(board: DevelopmentBoardData): DevelopmentBoardData {
  return JSON.parse(JSON.stringify(board)) as DevelopmentBoardData;
}
