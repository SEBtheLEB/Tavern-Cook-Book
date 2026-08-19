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
  | "Hidden Lore"
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
  | "artDirection"
  | "developmentBoard"
  | "roadmap"
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

export type ArtDirectionBoardItemType = "image" | "text";

export interface ArtDirectionImageMetadata {
  driveFileId: string;
  thumbnailUrl: string;
  webViewLink: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  uploadedAt: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  driveFolderId?: string;
  driveFolderLink?: string;
  driveFolderName?: string;
}

export interface ArtDirectionBoardItem {
  id: string;
  type: ArtDirectionBoardItemType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text?: string;
  color?: string;
  textColor?: string;
  textStyle?: "body" | "heading" | "caption";
  fontSize?: number;
  fontFamily?: string;
  image?: ArtDirectionImageMetadata;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArtDirectionBoard {
  id: string;
  title: string;
  description: string;
  width: number;
  height: number;
  background: "grid" | "plain";
  items: ArtDirectionBoardItem[];
  driveFolderId: string;
  driveFolderLink: string;
  driveFolderName: string;
  createdAt: string;
  updatedAt: string;
}

export type RoadmapMilestoneStatus =
  | "planned"
  | "active"
  | "at-risk"
  | "ready-for-build"
  | "complete"
  | "paused";

export type RoadmapItemStatus =
  | "missing"
  | "assigned"
  | "in-progress"
  | "uploaded"
  | "needs-review"
  | "revision-needed"
  | "approved"
  | "complete"
  | "blocked";

export type RoadmapPriority = "optional" | "low" | "medium" | "high" | "critical";

export type RoadmapBuildTier = "required" | "polish" | "optional";

export type RoadmapProductionTrack =
  | "Art"
  | "Gameplay Systems"
  | "Level Design"
  | "Quest"
  | "Writing"
  | "Audio"
  | "UI"
  | string;

export type RoadmapSlotVisual =
  | "art-binder"
  | "bestiary"
  | "character"
  | "environment"
  | "pantry"
  | "quest"
  | "system"
  | "ui"
  | "writing"
  | "audio"
  | string;

export type RoadmapItemCategory =
  | "Character Art"
  | "Enemy Art"
  | "NPC Art"
  | "Environment Art"
  | "UI"
  | "Writing"
  | "Audio"
  | "Animation"
  | "Gameplay"
  | string;

export interface RoadmapRevisionHistoryEntry {
  id: string;
  action: "uploaded" | "approved" | "revision-requested" | "blocked" | "status-change" | "assigned" | string;
  note: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface RoadmapUploadedFileRef {
  id: string;
  driveFileId: string;
  fileName: string;
  webViewLink: string;
  thumbnailUrl: string;
  uploadedAt: string;
  uploadedById: string;
  uploadedByName: string;
}

export interface RoadmapItem {
  id: string;
  milestoneId: string;
  title: string;
  category: RoadmapItemCategory;
  type: string;
  phase: string;
  productionTrack: RoadmapProductionTrack;
  slotVisual: RoadmapSlotVisual;
  summary: string;
  priority: RoadmapPriority;
  status: RoadmapItemStatus;
  assignedTo: string;
  reviewer: string;
  dueDate: string;
  binderSlotId: string;
  driveFolderPath: string;
  googleDriveFolderId: string;
  requiredFileTypes: string[];
  xpReward: number;
  buildTier: RoadmapBuildTier;
  dependencies: string[];
  notes: string;
  uploadedFileIds: string[];
  uploadedFiles?: RoadmapUploadedFileRef[];
  revisionHistory: RoadmapRevisionHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  status: RoadmapMilestoneStatus;
  dueDate: string;
  bonusXp: number;
  categories: RoadmapItemCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapData {
  milestones: RoadmapMilestone[];
  items: RoadmapItem[];
  updatedAt: string;
}

export type DevelopmentBoardNodeStatus =
  | "not-started"
  | "in-progress"
  | "review"
  | "complete"
  | "production-locked";

export type DevelopmentBoardLinkedEntityType =
  | "entry"
  | "creature"
  | "world"
  | "story-reference"
  | "roadmap-item"
  | string;

export interface DevelopmentBoardAttachment {
  id: string;
  title: string;
  url: string;
  kind: "image" | "link" | "document" | "file" | string;
  createdAt: string;
}

export interface DevelopmentBoardNode {
  id: string;
  title: string;
  type: string;
  description: string;
  status: DevelopmentBoardNodeStatus;
  ownerId: string;
  ownerName: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  groupId: string;
  linkedEntityType: DevelopmentBoardLinkedEntityType | "";
  linkedEntityId: string;
  linkedEntityCategory: string;
  tags: string[];
  notes: string;
  attachments: DevelopmentBoardAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentBoardConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentBoardGroup {
  id: string;
  title: string;
  description: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color: string;
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentBoardViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DevelopmentBoardData {
  id: string;
  title: string;
  description: string;
  seedVersion: number;
  nodes: DevelopmentBoardNode[];
  connections: DevelopmentBoardConnection[];
  groups: DevelopmentBoardGroup[];
  viewport: DevelopmentBoardViewport;
  updatedAt: string;
}

export type StoryJourneyScope = "history" | "act1" | "act2" | "act3";

export type StoryJourneyRevealLevel =
  | "Ancient History"
  | "Pre-Game"
  | "Player-Facing"
  | "Hidden Truth"
  | "Minor Spoiler"
  | "Major Spoiler";

export type StoryJourneySourceType =
  | "entry"
  | "creature"
  | "worldBuilding"
  | "storyReference"
  | "developmentBoard";

export interface StoryJourneySourceRecord {
  type: StoryJourneySourceType;
  id: string;
  label: string;
  category?: string;
}

export interface StoryJourneyCallout {
  id: string;
  kind: "character" | "location" | "revelation" | "playerKnowledge" | "consequence" | "canonGap";
  label: string;
  text: string;
}

export interface StoryJourneyDialogueSpriteSelection {
  assetId: string;
  imageUrl: string;
  imageFit?: ImageFitSettings;
  sourceEntryId?: string;
  presentation?: "portrait" | "full-box";
}

export interface StoryJourneyPageRecord {
  id?: string;
  title: string;
  text: string;
  detailedText?: string;
  imageUrl?: string;
  imageFit?: ImageFitSettings;
  imagePlaceholder?: string;
  caption?: string;
  relatedLore: string[];
  threads?: string[];
  callouts?: StoryJourneyCallout[];
  sourceRecords?: StoryJourneySourceRecord[];
  developerNotes?: string;
  dialogueSpriteOverrides?: Record<string, StoryJourneyDialogueSpriteSelection>;
}

export interface StoryJourneyChapterRecord {
  id: string;
  title: string;
  subtitle: string;
  timelineStartLabel: string;
  timelineEndLabel: string;
  timelineStartPercent: number;
  timelineEndPercent: number;
  era: string;
  scope?: StoryJourneyScope;
  revealLevel: StoryJourneyRevealLevel;
  shortDescription: string;
  overviewText?: string;
  coverImageUrl?: string;
  coverImageFit?: ImageFitSettings;
  relatedLore: string[];
  threads?: string[];
  sourceRecords?: StoryJourneySourceRecord[];
  developerNotes?: string;
  pages: StoryJourneyPageRecord[];
}

export type StoryJourneyGuideSourceSection =
  | "peoples"
  | "characters"
  | "places"
  | "factions"
  | "magic"
  | "creatures"
  | "quests"
  | "lore";

export type StoryJourneyGuidePageType = "generic" | "place";

export type StoryJourneyPlaceSectionId =
  | "generalFacts"
  | "environment"
  | "habitats"
  | "settlements"
  | "landmarks"
  | "inhabitants"
  | "flora"
  | "ingredients"
  | "creatures"
  | "threats"
  | "culture"
  | "narrativeRole";

export interface StoryJourneyPlaceQuickFact {
  id: string;
  label: string;
  value: string;
}

export interface StoryJourneyPlaceReferenceArt {
  id: string;
  label: string;
  imageUrl: string;
  webViewLink?: string;
  imageFit?: ImageFitSettings;
  createdAt: string;
}

export interface StoryJourneyPlaceNotableFigure {
  id: string;
  entryId?: string;
  name: string;
  role: string;
}

export interface StoryJourneyPlacePageData {
  placeName: string;
  placeType: string;
  subtitle: string;
  summary: string;
  formalTitle: string;
  founded: string;
  founder: string;
  originType: string;
  historicalNotes: string;
  quickFacts: StoryJourneyPlaceQuickFact[];
  generalFacts: string;
  environment: string;
  habitats: string;
  settlements: string;
  landmarks: string;
  inhabitants: string;
  flora: string;
  ingredients: string;
  creatures: string;
  threats: string;
  culture: string;
  narrativeRole: string;
  hiddenSections: StoryJourneyPlaceSectionId[];
  referenceArt: StoryJourneyPlaceReferenceArt[];
  relatedCharacters: string[];
  notableFigures: StoryJourneyPlaceNotableFigure[];
  relatedLocations: string[];
  relatedQuests: string[];
  showcaseTitle: string;
}

export interface StoryJourneyGuidePageRecord {
  id: string;
  pageType?: StoryJourneyGuidePageType;
  title: string;
  eyebrow: string;
  summary: string;
  fullText: string;
  tags: string[];
  place?: StoryJourneyPlacePageData;
  createdAt: string;
  updatedAt: string;
}

export interface StoryJourneyGuideCollectionRecord {
  id: string;
  title: string;
  description: string;
  sourceSectionId?: StoryJourneyGuideSourceSection;
  hiddenSourceItemIds: string[];
  pages: StoryJourneyGuidePageRecord[];
}

export type StoryJourneyReaderFont = "classic" | "book" | "clean";

export interface StoryJourneyReaderAppearance {
  backgroundColor: string;
  chapterIndicatorColor: string;
  sequenceIndicatorColor: string;
  accentColor: string;
  highlightedTextColor: string;
  linkColor: string;
  headingTextColor: string;
  bodyTextColor: string;
  mutedTextColor: string;
  headingFont: StoryJourneyReaderFont;
  bodyFont: StoryJourneyReaderFont;
  bodyFontSize: number;
  lineHeight: number;
  contentWidth: number;
  grainStrength: number;
}

export interface StoryJourneyData {
  title: string;
  description: string;
  dialogueBubbleImageUrl?: string;
  dialogueBubbleImageFit?: ImageFitSettings;
  readerAppearance?: StoryJourneyReaderAppearance;
  chapters: StoryJourneyChapterRecord[];
  guideCollections?: StoryJourneyGuideCollectionRecord[];
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
  artDirection?: ArtDirectionBoard;
  roadmap?: RoadmapData;
  developmentBoard?: DevelopmentBoardData;
  storyJourney?: StoryJourneyData;
}

export interface LoreDatabase {
  schemaVersion: number;
  entries: LoreEntry[];
  bestiary: BestiaryCreature[];
  bestiaryCategoryVaults: BestiaryCategoryArtVault[];
  worldBuilding: WorldBuildingData;
  storyReferences: StoryReference[];
  glossaryTerms: GlossaryTerm[];
  artDirection: ArtDirectionBoard;
  roadmap: RoadmapData;
  developmentBoard?: DevelopmentBoardData;
  storyJourney?: StoryJourneyData;
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

export type AccessRole = "admin" | "editor" | "freelancer" | "viewer";

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




