export type ThemeMode = "light" | "dream";

export type EntryStatus =
  | "Canon"
  | "Soft Canon"
  | "Idea"
  | "Needs Rewrite"
  | "Scrapped"
  | "Old Version"
  | "Playtest Scope";

export type SpoilerLevel =
  | "No Spoiler"
  | "Minor Spoiler"
  | "Major Spoiler"
  | "Ending Spoiler";

export type ActiveView =
  | "dashboard"
  | "story"
  | "quests"
  | "gameplay"
  | "food"
  | "characters"
  | "world"
  | "marketing"
  | "archive"
  | "settings"
  | "search"
  | "timeline"
  | "secrets"
  | "recipes"
  | "ingredients"
  | "items"
  | "enemies"
  | "factions";

export interface EntryConnections {
  characters: string[];
  locations: string[];
  recipes: string[];
  quests: string[];
  items: string[];
  factions: string[];
  secrets: string[];
  gameplaySystems: string[];
  enemies: string[];
  timelineEvents: string[];
}

export interface EntryNotes {
  art: string;
  gameplay: string;
  production: string;
  marketing: string;
  unresolved: string;
}

export interface TimelineInfo {
  era?: string;
  trueTimeline?: string;
  playerTimeline?: string;
  questTimeline?: string;
  emotionalTimeline?: string;
}

export interface SecretInfo {
  trueFact?: string;
  knownBy: string[];
  suspectedBy: string[];
  unknownTo: string[];
  playerKnowledge?: string;
  relatedQuests: string[];
  relatedDialogue: string[];
}

export interface WikiFields {
  itemType?: string;
  rarity?: string;
  value?: string;
  stackSize?: string;
  whereToFind?: string;
  howToCraft?: string;
  craftingStation?: string;
  ingredientsRequired?: string;
  usedInRecipes?: string;
  canBeSliced?: boolean;
  canBeChopped?: boolean;
  canBeCrushed?: boolean;
  canBeBoiled?: boolean;
  canBeFried?: boolean;
  canBeBrewed?: boolean;
  gameplayUse?: string;
  loreDescription?: string;
  relatedDrops?: string;
  relatedEnemies?: string;
  relatedQuests?: string;
  relatedLocations?: string;
  notes?: string;
}

export interface MediaAsset {
  name: string;
  dataUrl: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface EntryMedia {
  iconImage?: string;
  mainImage?: string;
  characterPortrait?: string;
  characterHoverImage?: string;
  ingameSpriteImage?: string;
  dialogueSpriteImage?: string;
  galleryImages: string[];
  videoLinks: string[];
  uploadedVideos: MediaAsset[];
  mediaNotes?: string;
}

export interface LoreEntry {
  id: string;
  title: string;
  category: string;
  type: string;
  status: EntryStatus | string;
  spoilerLevel: SpoilerLevel | string;
  tags: string[];
  summary: string;
  publicDescription: string;
  internalLore: string;
  fields: Record<string, unknown>;
  connections: EntryConnections;
  notes: EntryNotes;
  timeline?: TimelineInfo;
  secret?: SecretInfo;
  wiki?: WikiFields;
  media: EntryMedia;
  createdAt: string;
  updatedAt: string;
}

export interface LoreBackup {
  id: string;
  label: string;
  createdAt: string;
  entries: LoreEntry[];
}

export interface LoreDatabase {
  schemaVersion: number;
  entries: LoreEntry[];
  backups: LoreBackup[];
  lastAiBackupId?: string;
  branding: {
    studioName: string;
    logoImage?: string;
  };
}

export type AssistantMode =
  | "suggest"
  | "patch"
  | "analyze"
  | "marketing"
  | "contradictions";

export type AssistantAction =
  | {
      action: "update";
      id: string;
      field: string;
      oldValue?: unknown;
      newValue: unknown;
    }
  | {
      action: "renameReference";
      oldName: string;
      newName: string;
      scope?: "all" | string;
    }
  | {
      action: "add";
      entry: Partial<LoreEntry>;
    }
  | {
      action: "archive";
      title: string;
      content: string;
    };

export interface AssistantPatch {
  summary: string;
  changes: AssistantAction[];
  warnings: string[];
}

export interface AssistantRequest {
  database: LoreDatabase;
  command: string;
  mode: AssistantMode;
}

export interface AssistantResponse {
  patch?: AssistantPatch;
  raw?: string;
  error?: string;
}

export interface ViewConfig {
  id: ActiveView;
  label: string;
  description: string;
  tooltip?: string;
  category?: string;
  typeIncludes?: string[];
  icon: string;
}
