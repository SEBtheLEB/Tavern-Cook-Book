import type { AssignmentRecord, QuestCategory, TeamMember, UserProfile } from "./utils/assignments";

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

export type StoryReferenceCanonStatus =
  | "Canon"
  | "Soft Canon"
  | "Idea"
  | "Needs Rewrite"
  | "Scrapped"
  | "Old Version";

export type StoryReferenceSpoilerLevel =
  | "Public Lore"
  | "Player Knowledge"
  | "Team Spoiler"
  | "Secret Lore";

export type ActiveView =
  | "dashboard"
  | "storyJourney"
  
  | "spriteAnimator"
  | "story"
  | "quests"
  | "gameplay"
  | "food"
  | "characters"
  | "world"
  | "bestiary"
  | "artVault"
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
  imageFits?: Record<string, ImageFitSettings>;
  galleryImages: string[];
  videoLinks: string[];
  uploadedVideos: MediaAsset[];
  mediaNotes?: string;
}

export type ImageFitMode = "contain" | "cover" | "fill" | "custom";

export interface ImageFitSettings {
  mode: ImageFitMode;
  scale: number;
  x: number;
  y: number;
}

export interface SpriteAnimationSheetSnapshot {
  id: string;
  type: "spriteSheet";
  name: string;
  category: string;
  folderId: string;
  folderLink: string;
  folderName: string;
  driveFileId: string;
  driveUrl: string;
  thumbnailUrl: string;
  originalFileName: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface SpriteAnimationPresetSnapshot {
  id: string;
  spriteSheetAssetId: string;
  presetName: string;
  animationName: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  startFrame: number;
  endFrame: number;
  fps: number;
  loop: boolean;
  pingPong: boolean;
  playOnce: boolean;
  scale: number;
  frameHoldCounts?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface SpriteAnimationFrameImage {
  frameIndex: number;
  driveFileId: string;
  thumbnailUrl: string;
  webViewLink: string;
  fileName: string;
}

export interface SpriteAnimationSlotReference {
  mode: "spriteAnimation";
  spriteSheetAssetId: string;
  animationPresetId: string;
  playback: "autoplay" | "hover";
  loop: boolean;
  spriteSheet?: SpriteAnimationSheetSnapshot;
  preset?: SpriteAnimationPresetSnapshot;
  frameImages?: SpriteAnimationFrameImage[];
  frameFolderId?: string;
  frameFolderLink?: string;
  frameFolderName?: string;
}

export interface CharacterArtGalleryItem {
  id: string;
  title: string;
  category: string;
  driveFileId: string;
  thumbnailUrl: string;
  webViewLink: string;
  dateAdded: string;
  isFeatured: boolean;
  notes: string;
  uploadStatus?: "mock-local-preview" | string;
  imageFit?: ImageFitSettings;
  driveFolderId?: string;
  driveFolderLink?: string;
  driveFolderName?: string;
}

export type ArtVaultSlotStatus = "empty" | "uploaded" | "needs-revision" | "approved";

export interface ArtVaultImageMetadata {
  id: string;
  title: string;
  category: string;
  slotId: string;
  driveFileId: string;
  thumbnailUrl: string;
  webViewLink: string;
  dateAdded: string;
  uploadStatus: string;
  assetState?: "wip" | "final" | string;
  notes: string;
  fileName?: string;
  downloadUrl?: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  uploadedAt?: string;
  lastUpdatedByName?: string;
  lastUpdatedByEmail?: string;
  lastUpdatedAt?: string;
  imageFit?: ImageFitSettings;
  driveFolderId?: string;
  driveFolderLink?: string;
  driveFolderName?: string;
  spriteAnimation?: SpriteAnimationSlotReference;
}

export interface ArtVaultSlot {
  id: string;
  label: string;
  requirementType: string;
  status: ArtVaultSlotStatus | string;
  image: ArtVaultImageMetadata | null;
  notes: string;
  order: number;
}

export interface ArtVaultSection {
  id: string;
  title: string;
  description: string;
  slots: ArtVaultSlot[];
  order: number;
  driveFolderId?: string;
  driveFolderLink?: string;
  driveFolderName?: string;
}

export interface CharacterArtVault {
  sections: ArtVaultSection[];
}

export interface BestiaryCategoryArtVault {
  id: string;
  categoryName: string;
  title: string;
  description: string;
  artVault: CharacterArtVault;
  driveFolderId: string;
  driveFolderLink: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterArtBoardCategory {
  id: string;
  label: string;
  image?: string;
  order: number;
  isDefault?: boolean;
}

export interface CharacterArtBoard {
  categories: CharacterArtBoardCategory[];
}

export interface CharacterRelationship {
  id: string;
  characterId: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export type WorldBuildingCategoryId =
  | "locations"
  | "cultures"
  | "factions"
  | "timeline"
  | "magicSystems"
  | "foodAndRecipes"
  | "creatureLinks"
  | "characterLinks"
  | "myths"
  | "items"
  | "quests"
  | "rules"
  | "mysteries"
  | "glossary";

export type WorldBuildingRelatedType =
  | "world"
  | "character"
  | "creature"
  | "location"
  | "culture"
  | "faction"
  | "item"
  | "recipe"
  | "magic"
  | "timeline"
  | "quest"
  | "myth"
  | "glossary";

export interface WorldBuildingRelatedEntry {
  id: string;
  type: WorldBuildingRelatedType | string;
  targetId: string;
  targetCategory?: WorldBuildingCategoryId | string;
  note: string;
}

export interface WorldBuildingEntry {
  id: string;
  title: string;
  category: WorldBuildingCategoryId;
  type: string;
  summary: string;
  tags: string[];
  image: string;
  imageFit?: ImageFitSettings;
  fields: Record<string, string>;
  relatedEntries: WorldBuildingRelatedEntry[];
  linkedStoryReferenceIds: string[];
  storyReferenceReviews?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type WorldBuildingData = Record<WorldBuildingCategoryId, WorldBuildingEntry[]>;

export interface BestiaryCreatureStats {
  health: string;
  damage: string;
  speed: string;
  defense: string;
  aggression: string;
  weakness: string;
  resistances: string;
  abilities: string;
  attackPatterns: string;
  bossPhaseNotes: string;
}

export interface BestiaryCreatureDrops {
  droppedIngredients: string;
  craftingMaterials: string;
  rareDrops: string;
  cookingUses: string;
  sellValue: string;
  recipeConnections: string;
  icons: BestiaryDropIcon[];
}

export interface BestiaryDropIcon {
  id: string;
  label: string;
  category: string;
  image: string;
  notes: string;
}

export interface BestiaryCreatureHabitatInfo {
  knownLocations: string;
  spawnConditions: string;
  timeOfDay: string;
  season: string;
  weatherConditions: string;
  nearbyPointsOfInterest: string;
  mapNotes: string;
}

export interface BestiaryCreatureLore {
  origin: string;
  culturalMeaning: string;
  rumors: string;
  questConnections: string;
  relatedCreatures: string;
  hiddenNotes: string;
  fullStory?: string;
}

export interface BestiaryCreature {
  id: string;
  name: string;
  category: string;
  type: string;
  slotImage: string;
  image: string;
  expandedImage: string;
  hoverImage: string;
  imagePositionX: number;
  imagePositionY: number;
  imageZoom: number;
  slotImageFit: ImageFitSettings;
  imageFit: ImageFitSettings;
  hoverImageFit: ImageFitSettings;
  expandedImageFit: ImageFitSettings;
  status: string;
  threatLevel: string;
  rarity: string;
  size: string;
  diet: string;
  habitat: string;
  behavior: string;
  description: string;
  overview: string;
  fieldNotes: string;
  stats: BestiaryCreatureStats;
  drops: BestiaryCreatureDrops;
  habitatInfo: BestiaryCreatureHabitatInfo;
  lore: BestiaryCreatureLore;
  visualDesignNotes: string;
  animationNotes: string;
  soundNotes: string;
  gameplayPurpose: string;
  productionNotes: string;
  linkedStoryReferenceIds: string[];
  storyReferenceReviews?: Record<string, string>;
  artVault: CharacterArtVault;
  driveFolderId: string;
  driveFolderLink: string;
  createdAt: string;
  updatedAt: string;
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
  linkedStoryReferenceIds: string[];
  storyReferenceReviews?: Record<string, string>;
  notes: EntryNotes;
  timeline?: TimelineInfo;
  secret?: SecretInfo;
  wiki?: WikiFields;
  media: EntryMedia;
  artGallery: CharacterArtGalleryItem[];
  artVault: CharacterArtVault;
  characterArtBoard: CharacterArtBoard;
  characterRelationships: CharacterRelationship[];
  driveFolderId: string;
  driveFolderLink: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryReferenceVersion {
  id: string;
  editedAt: string;
  previousTitle: string;
  previousShortSummary: string;
  previousFullDescription: string;
  previousCanonStatus: StoryReferenceCanonStatus | string;
  previousSpoilerLevel: StoryReferenceSpoilerLevel | string;
  notes?: string;
}

export interface StoryReference {
  id: string;
  title: string;
  shortSummary: string;
  fullDescription: string;
  canonStatus: StoryReferenceCanonStatus | string;
  spoilerLevel: StoryReferenceSpoilerLevel | string;
  actChapter?: string;
  relatedCharacters: string[];
  relatedLocations: string[];
  relatedQuests: string[];
  relatedFactions: string[];
  relatedItems: string[];
  relatedRecipes: string[];
  relatedTimelineEvents: string[];
  relatedLoreReveals: string[];
  relatedStoryBeats: string[];
  tags: string[];
  notes: string;
  createdAt: string;
  lastEditedAt: string;
  versions: StoryReferenceVersion[];
}

export interface GlossaryTerm {
  id: string;
  primaryName: string;
  alternateNames: string[];
  shortDefinition: string;
  linkedStoryReferenceId: string;
  relatedEntryIds: string[];
  spoilerLevel: StoryReferenceSpoilerLevel | string;
  createdAt: string;
  updatedAt: string;
}

export interface LoreBackup {
  id: string;
  label: string;
  createdAt: string;
  entries: LoreEntry[];
  bestiary?: BestiaryCreature[];
  bestiaryCategoryVaults?: BestiaryCategoryArtVault[];
  worldBuilding?: WorldBuildingData;
  storyReferences?: StoryReference[];
  glossaryTerms?: GlossaryTerm[];
}

export interface LoreDatabase {
  schemaVersion: number;
  entries: LoreEntry[];
  bestiary: BestiaryCreature[];
  bestiaryCategoryVaults: BestiaryCategoryArtVault[];
  worldBuilding: WorldBuildingData;
  storyReferences: StoryReference[];
  glossaryTerms: GlossaryTerm[];
  assignments: AssignmentRecord[];
  teamMembers: TeamMember[];
  userProfiles: UserProfile[];
  questCategories: QuestCategory[];
  backups: LoreBackup[];
  lastAiBackupId?: string;
  branding: {
    studioName: string;
    logoImage?: string;
  };
}

export type AccessRole = "admin" | "editor" | "viewer";

export interface AccessUserPermission {
  email: string;
  role: AccessRole;
  label?: string;
}

export interface GoogleAccountUser {
  name: string;
  email: string;
  picture?: string;
  role: AccessRole;
}

export interface ArtVaultActivityLogEntry {
  id: string;
  actionType: string;
  slotName: string;
  subjectName: string;
  subjectType: "character" | "creature" | "environment" | string;
  userName: string;
  userEmail: string;
  timestamp: string;
  fileName?: string;
  driveFileId?: string;
}

export type FavoriteKind = "entry" | "creature";

export interface FavoriteItem {
  kind: FavoriteKind;
  id: string;
  createdAt: string;
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
      action: "setData";
      target: "entry" | "creature" | "worldEntry" | "bestiaryCategoryVault";
      id?: string;
      category?: WorldBuildingCategoryId | string;
      categoryName?: string;
      path: string;
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
      action: "removeEntry";
      id?: string;
      title?: string;
      archiveTitle?: string;
      archiveContent?: string;
    }
  | {
      action: "addCreature";
      creature: Partial<BestiaryCreature>;
    }
  | {
      action: "removeCreature";
      id?: string;
      name?: string;
      archiveTitle?: string;
      archiveContent?: string;
    }
  | {
      action: "addWorldEntry";
      category: WorldBuildingCategoryId | string;
      entry: Partial<WorldBuildingEntry>;
    }
  | {
      action: "addArtSlot";
      target: "entry" | "creature" | "bestiaryCategory";
      id?: string;
      categoryName?: string;
      sectionId?: string;
      sectionTitle?: string;
      label: string;
      requirementType?: string;
      notes?: string;
    }
  | {
      action: "renameArtSlot";
      target: "entry" | "creature" | "bestiaryCategory";
      id?: string;
      categoryName?: string;
      sectionId?: string;
      sectionTitle?: string;
      slotId?: string;
      label?: string;
      newLabel: string;
      requirementType?: string;
      notes?: string;
    }
  | {
      action: "removeArtSlot";
      target: "entry" | "creature" | "bestiaryCategory";
      id?: string;
      categoryName?: string;
      sectionId?: string;
      sectionTitle?: string;
      slotId?: string;
      label?: string;
    }
  | {
      action: "addArtCategory";
      target: "entry" | "creature" | "bestiaryCategory";
      id?: string;
      categoryName?: string;
      sectionTitle: string;
      description?: string;
      firstSlotLabel?: string;
      slots?: string[];
      requirementType?: string;
      notes?: string;
    }
  | {
      action: "renameArtCategory";
      target: "entry" | "creature" | "bestiaryCategory";
      id?: string;
      categoryName?: string;
      sectionId?: string;
      sectionTitle?: string;
      newTitle: string;
      description?: string;
    }
  | {
      action: "removeArtCategory";
      target: "entry" | "creature" | "bestiaryCategory";
      id?: string;
      categoryName?: string;
      sectionId?: string;
      sectionTitle?: string;
    }
  | {
      action: "archive";
      title: string;
      content: string;
    };

export interface AssistantPlanStep {
  title: string;
  target: string;
  intent: string;
  allowedActions: string[];
  expectedResult: string;
}

export interface AssistantPlanTarget {
  kind: AssistantChangedTargetKind | string;
  id?: string;
  title: string;
  location: string;
  reason: string;
}

export interface AssistantPlan {
  intent: string;
  scope: string;
  targetModules: AssistantPlanTarget[];
  steps: AssistantPlanStep[];
  checks: string[];
  needsClarification?: boolean;
  clarificationQuestion?: string;
  riskLevel?: "low" | "medium" | "high" | string;
}

export interface AssistantPatch {
  summary: string;
  plan?: AssistantPlan;
  changes: AssistantAction[];
  warnings: string[];
}

export type AssistantChangedTargetKind =
  | "entry"
  | "creature"
  | "worldEntry"
  | "bestiaryCategory"
  | "all";

export interface AssistantChangedTarget {
  kind: AssistantChangedTargetKind;
  entryId?: string;
  creatureId?: string;
  worldCategory?: WorldBuildingCategoryId | string;
  worldEntryId?: string;
  categoryName?: string;
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

export interface WorldBuildingFocusTarget {
  category: WorldBuildingCategoryId;
  entryId: string;
  nonce: number;
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




