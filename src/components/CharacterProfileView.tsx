import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  ArtVaultImageMetadata,
  ArtVaultSection,
  ArtVaultSlot,
  CharacterArtBoardCategory,
  CharacterArtGalleryItem,
  CharacterArtVault,
  EntryConnections,
  EntryMedia,
  EntryNotes,
  CharacterRelationship,
  GoogleAccountUser,
  ImageFitSettings,
  LoreEntry
} from "../types";
import { isDriveConfigured, showDriveSetupMessage } from "../utils/driveSettings";
import {
  isDefaultCharacterArtBoardCategoryId,
  normalizeArtVault,
  normalizeCharacterArtBoard
} from "../utils/entries";
import {
  addUploadedDriveImageToCharacter,
  googleDriveFolderLink,
  handlePickedDriveFile,
  openGoogleDriveFolderPicker,
  openGooglePickerForCharacter,
  uploadImageToDrive
} from "../utils/googlePicker";
import type { GooglePickerFile, UploadedDriveFile } from "../utils/googlePicker";
import { recordArtVaultActivity } from "../utils/activityLog";
import { fileSizeLabel, isSupportedImage, readImageFileForStorage } from "../utils/media";
import { imageFitToStyle, normalizeImageFit } from "../utils/imageFit";
import type { AssignableModuleInfo, AssignmentRecord } from "../utils/assignments";
import { AdjustableImage } from "./AdjustableImage";
import { CustomSelect } from "./CustomSelect";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { ImageAdjustModal } from "./ImageAdjustModal";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { AssignableModule } from "./AssignmentSystem";
import { Icon } from "./Icon";
import { LoreKeywordText } from "./LoreKeywordText";
import { RichLoreText, RichTextEditor } from "./RichText";
import { FavoriteButton } from "./FavoriteButton";
import { StoryReaderModal, type StoryReaderSection, type StoryReaderStep } from "./StoryReaderModal";

type ImageSlot =
  | "iconImage"
  | "mainImage"
  | "characterPortrait"
  | "characterHoverImage"
  | "ingameSpriteImage"
  | "dialogueSpriteImage"
  | "galleryImages";

type StoryKey =
  | "background"
  | "incitingIncident"
  | "mainStoryRole"
  | "characterArc"
  | "secretsInternalLore"
  | "relationshipsInStory"
  | "futureUnresolvedThreads";

type StoryReaderTab = "full" | StoryKey;

interface CharacterProfileViewProps {
  entry: LoreEntry;
  readOnly: boolean;
  isEditing: boolean;
  error?: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onClose: () => void;
  onDelete: () => void;
  referenceKeyword?: string;
  onViewReferences?: (keyword: string) => void;
  onChange: (patch: Partial<LoreEntry>) => void;
  onNotesChange: (patch: Partial<EntryNotes>) => void;
  onConnectionChange: (key: keyof EntryConnections, value: string) => void;
  onSetField: (key: string, value: string) => void;
  onCommitPatch?: (patch: Partial<LoreEntry>) => void;
  onUploadImage: (slot: ImageSlot, file: File | undefined) => void;
  onRemoveImage: (slot: ImageSlot, galleryIndex?: number) => void;
  allCharacterEntries?: LoreEntry[];
  onArtVaultOpenChange?: (open: boolean) => void;
  currentUser: GoogleAccountUser;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  focusedAssignment?: AssignmentRecord | null;
  onOpenArtBinder?: () => void;
}

interface RelationshipItem {
  id?: string;
  characterId?: string;
  name: string;
  type: string;
  note: string;
  image?: string;
  source?: "structured" | "legacy" | "default";
}

interface WorldConnectionItem {
  type: string;
  title: string;
  note: string;
}

interface GalleryItem {
  label: string;
  src: string;
  slot?: Exclude<ImageSlot, "galleryImages">;
  galleryIndex?: number;
}

interface CharacterAssistantPayload {
  name?: string;
  descriptor?: string;
  tags?: string[];
  status?: string;
  spoilerLevel?: string;
  revealLevel?: string;
  essentials?: {
    age?: string;
    origin?: string;
    role?: string;
    recruitedBy?: string;
    favoriteFood?: string;
    status?: string;
  };
  atAGlance?: string;
  summary?: string;
  publicDescription?: string;
  internalLore?: string;
  personality?: string;
  coreFunction?: string;
  relationships?: RelationshipItem[];
  worldConnections?: WorldConnectionItem[];
  story?: Partial<Record<StoryKey, string>>;
  fullStory?: string;
  notes?: Partial<EntryNotes>;
}

interface DriveUploadDraft {
  file: File;
  previewUrl: string;
  category: string;
  notes: string;
  driveFolderId: string;
  driveFolderLink: string;
  driveFolderName: string;
  assetState: "wip" | "final";
  uploading: boolean;
  message: string;
}

interface CharacterImageAdjustTarget {
  slot: Exclude<ImageSlot, "galleryImages">;
  label: string;
  imageUrl: string;
  imageFit: ImageFitSettings;
  aspectRatio: string;
  previewFrame?: { width: number; height: number };
}

interface ArtVaultGalleryAdjustTarget {
  sectionId: string;
  slotId: string;
  label: string;
  imageUrl: string;
  imageFit?: ImageFitSettings;
  previewFrame?: { width: number; height: number };
}

const spoilerOptions = ["No Spoiler", "Minor Spoiler", "Major Spoiler", "Ending Spoiler"];
const artUploadCategories = ["Portraits", "Expressions", "Turnarounds", "Screenshots", "Concept Art", "Marketing Art", "Reference", "Imported From Drive"];
const artGalleryFilters = ["All", "Featured", "Portraits", "Expressions", "Turnarounds", "Screenshots", "Concept Art", "Marketing Art", "Imported From Drive"];
const artGallerySortOptions = ["Newest first", "Oldest first", "Title A-Z", "Category"];
const artVaultStatusOptions = [
  { value: "empty", label: "Missing" },
  { value: "uploaded", label: "Uploaded" },
  { value: "needs-revision", label: "Needs Revision" },
  { value: "approved", label: "Approved" }
];
const artVaultSlotFilters = ["All", "Missing", "Filled", "Needs Revision", "Approved"];
const characterArtBoardMediaSlots: Record<string, Exclude<ImageSlot, "galleryImages">> = {
  "art-board-main-portrait": "characterPortrait",
  "art-board-hover-sprite": "characterHoverImage",
  "art-board-dialogue-neutral": "dialogueSpriteImage",
  "art-board-combat-pose": "ingameSpriteImage",
  "art-board-concept-art": "mainImage",
  "art-board-sprite-sheet": "iconImage"
};

const storySections: Array<{
  key: StoryKey;
  title: string;
  icon: string;
  field: string;
  placeholder: string;
}> = [
  {
    key: "background",
    title: "Background",
    icon: "Home",
    field: "Story Background",
    placeholder: "Where this character comes from, early life, training, family, or culture."
  },
  {
    key: "incitingIncident",
    title: "Inciting Incident",
    icon: "Swords",
    field: "Story Inciting Incident",
    placeholder: "The event that pulls this character into the main story."
  },
  {
    key: "mainStoryRole",
    title: "Main Story Role",
    icon: "Compass",
    field: "Story Main Role",
    placeholder: "What this character does during the main story and why they matter."
  },
  {
    key: "characterArc",
    title: "Character Arc",
    icon: "Sparkles",
    field: "Story Character Arc",
    placeholder: "How this character changes emotionally, morally, or personally."
  },
  {
    key: "secretsInternalLore",
    title: "Secrets / Internal Lore",
    icon: "ShieldAlert",
    field: "Story Secrets / Internal Lore",
    placeholder: "Hidden information, spoilers, private writer notes, or internal-only lore."
  },
  {
    key: "relationshipsInStory",
    title: "Relationships in Story",
    icon: "Users",
    field: "Story Relationships",
    placeholder: "How relationships affect the plot, conflicts, trust, rivalries, and emotional stakes."
  },
  {
    key: "futureUnresolvedThreads",
    title: "Future / Unresolved Threads",
    icon: "GitBranch",
    field: "Story Future / Unresolved Threads",
    placeholder: "Loose ends, sequel hooks, mysteries, unanswered questions, or future plans."
  }
];

export function CharacterProfileView({
  entry,
  readOnly,
  isEditing,
  error,
  onEdit,
  onSave,
  onCancel,
  onClose,
  onDelete,
  referenceKeyword = "",
  onViewReferences,
  onChange,
  onNotesChange,
  onConnectionChange,
  onSetField,
  onCommitPatch,
  onUploadImage,
  onRemoveImage,
  allCharacterEntries = [],
  onArtVaultOpenChange,
  currentUser,
  isFavorite = false,
  onToggleFavorite,
  focusedAssignment = null,
  onOpenArtBinder
}: CharacterProfileViewProps) {
  const [fullStoryOpen, setFullStoryOpen] = useState(false);
  const [activeStoryTab, setActiveStoryTab] = useState<StoryReaderTab>("full");
  const [showAllRelationships, setShowAllRelationships] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantChangeRequest, setAssistantChangeRequest] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantImport, setAssistantImport] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [artVaultOpen, setArtVaultOpen] = useState(false);
  const [artGalleryModalOpen, setArtGalleryModalOpen] = useState(false);
  const [editingArtGalleryId, setEditingArtGalleryId] = useState<string | null>(null);
  const [artGalleryDraft, setArtGalleryDraft] = useState<CharacterArtGalleryItem>(() => createBlankArtGalleryItem());
  const [driveFolderModalOpen, setDriveFolderModalOpen] = useState(false);
  const [driveFolderDraft, setDriveFolderDraft] = useState({ id: entry.driveFolderId || "", link: entry.driveFolderLink || "" });
  const [driveUploadDraft, setDriveUploadDraft] = useState<DriveUploadDraft | null>(null);
  const [imageAdjustTarget, setImageAdjustTarget] = useState<CharacterImageAdjustTarget | null>(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [artVaultGalleryFocus, setArtVaultGalleryFocus] = useState<Exclude<ImageSlot, "galleryImages"> | null>(null);
  const [artVaultGalleryAdjustTarget, setArtVaultGalleryAdjustTarget] = useState<ArtVaultGalleryAdjustTarget | null>(null);
  const [relationshipModalOpen, setRelationshipModalOpen] = useState(false);
  const [relationshipSearch, setRelationshipSearch] = useState("");
  const [selectedRelationshipCharacterId, setSelectedRelationshipCharacterId] = useState("");
  const [relationshipDescription, setRelationshipDescription] = useState("");
  const [relationshipMessage, setRelationshipMessage] = useState("");
  const driveUploadInputRef = useRef<HTMLInputElement | null>(null);
  const characterEntries = useMemo(() => {
    const byId = new Map<string, LoreEntry>();
    [...allCharacterEntries, entry].forEach((candidate) => {
      if (isCharacterEntry(candidate)) byId.set(candidate.id, candidate);
    });
    return [...byId.values()];
  }, [allCharacterEntries, entry]);
  const character = useMemo(() => buildCharacterView(entry, characterEntries), [entry, characterEntries]);
  const galleryItems = useMemo(() => buildGalleryItems(entry), [entry]);
  const artGallery = entry.artGallery || [];
  const characterArtBoard = normalizeCharacterArtBoard(entry.characterArtBoard);
  const visibleGallery = galleryItems.slice(0, 4);
  const visibleRelationships = isEditing || showAllRelationships
    ? character.relationships
    : character.relationships.slice(0, 3);
  const hideCharacterHoverText = fieldText(entry, ["Hide Character Hover Text"]) === "true";
  const characterButtonImage = entry.media.characterPortrait || entry.media.mainImage || entry.media.iconImage || "";
  const characterButtonHoverImage =
    entry.media.characterHoverImage ||
    entry.media.dialogueSpriteImage ||
    entry.media.ingameSpriteImage ||
    characterButtonImage;
  const relationshipCharactersById = useMemo(
    () => new Map(characterEntries.map((candidate) => [candidate.id, candidate])),
    [characterEntries]
  );
  const existingRelationshipCharacterIds = useMemo(() => {
    const ids = new Set<string>();
    (entry.characterRelationships || []).forEach((relationship) => {
      if (relationship.characterId) ids.add(relationship.characterId);
    });
    entry.connections.characters.forEach((name) => {
      const match = findCharacterByName(characterEntries, name);
      if (match) ids.add(match.id);
    });
    return ids;
  }, [characterEntries, entry.characterRelationships, entry.connections.characters]);
  const relationshipOptions = useMemo(() => {
    const query = relationshipSearch.trim().toLowerCase();
    return characterEntries
      .filter((candidate) => candidate.id !== entry.id)
      .filter((candidate) => !query || candidate.title.toLowerCase().includes(query));
  }, [characterEntries, entry.id, relationshipSearch]);
  const selectedRelationshipCharacter = selectedRelationshipCharacterId
    ? relationshipCharactersById.get(selectedRelationshipCharacterId)
    : undefined;

  useEffect(() => {
    onArtVaultOpenChange?.(artVaultOpen);
    return () => onArtVaultOpenChange?.(false);
  }, [artVaultOpen, onArtVaultOpenChange]);

  useEffect(() => {
    if (!focusedAssignment || focusedAssignment.entryId !== entry.id) return;
    if (!readOnly && focusedAssignment.targetRoute.includes(":art-vault:")) {
      setArtVaultOpen(true);
    }
  }, [entry.id, focusedAssignment, readOnly]);

  const commitCharacterPatch = (patch: Partial<LoreEntry>) => {
    if (onCommitPatch) {
      onCommitPatch(patch);
      return;
    }
    onChange(patch);
  };

  const toggleCharacterHoverText = () => {
    onSetField("Hide Character Hover Text", hideCharacterHoverText ? "" : "true");
  };

  const openAddRelationshipModal = () => {
    setRelationshipSearch("");
    setSelectedRelationshipCharacterId("");
    setRelationshipDescription("");
    setRelationshipMessage("");
    setRelationshipModalOpen(true);
  };

  const closeAddRelationshipModal = () => {
    setRelationshipModalOpen(false);
    setRelationshipMessage("");
  };

  const selectRelationshipCharacter = (candidate: LoreEntry) => {
    if (existingRelationshipCharacterIds.has(candidate.id)) {
      setRelationshipMessage("This character is already in Key Relationships.");
      return;
    }
    setSelectedRelationshipCharacterId(candidate.id);
    setRelationshipMessage("");
  };

  const addRelationship = () => {
    const selected = selectedRelationshipCharacter;
    const description = relationshipDescription.trim();

    if (!selected) {
      setRelationshipMessage("Choose a character first.");
      return;
    }
    if (!description) {
      setRelationshipMessage("Add a short relationship description first.");
      return;
    }
    if (selected.id === entry.id || existingRelationshipCharacterIds.has(selected.id)) {
      setRelationshipMessage("This character is already in Key Relationships.");
      return;
    }

    const timestamp = new Date().toISOString();
    const nextRelationship: CharacterRelationship = {
      id: `relationship-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      characterId: selected.id,
      description,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const nextConnections = uniqueList([...entry.connections.characters, selected.title]);
    const nextFields = {
      ...entry.fields,
      [`Relationship Note: ${selected.title}`]: description
    };

    commitCharacterPatch({
      characterRelationships: [...(entry.characterRelationships || []), nextRelationship],
      connections: {
        ...entry.connections,
        characters: nextConnections
      },
      fields: nextFields
    });
    closeAddRelationshipModal();
  };

  const removeRelationship = (relationship: RelationshipItem) => {
    if (!window.confirm("Remove this relationship?")) return;
    const relationshipKey = normalizeRelationshipName(relationship.name);
    const nextRelationships = (entry.characterRelationships || []).filter((item) => {
      if (relationship.characterId && item.characterId === relationship.characterId) return false;
      if (relationship.id && item.id === relationship.id) return false;
      return true;
    });
    const nextFields = { ...entry.fields };
    delete nextFields[`Relationship Type: ${relationship.name}`];
    delete nextFields[`Relationship Note: ${relationship.name}`];
    const nextConnections = entry.connections.characters.filter((name) => {
      if (normalizeRelationshipName(name) === relationshipKey) return false;
      const matched = findCharacterByName(characterEntries, name);
      return !(relationship.characterId && matched?.id === relationship.characterId);
    });

    commitCharacterPatch({
      characterRelationships: nextRelationships,
      connections: {
        ...entry.connections,
        characters: nextConnections
      },
      fields: nextFields
    });
  };

  const replaceGalleryImage = async (item: GalleryItem, file: File | undefined) => {
    if (!file) return;
    if (item.slot) {
      onUploadImage(item.slot, file);
      return;
    }
    if (item.galleryIndex == null) return;
    if (!isSupportedImage(file)) {
      window.alert("Use a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    try {
      const dataUrl = await readImageFileForStorage(file);
      const galleryImages = [...entry.media.galleryImages];
      galleryImages[item.galleryIndex] = dataUrl;
      onChange({ media: { ...entry.media, galleryImages } });
    } catch (galleryError) {
      window.alert(galleryError instanceof Error ? galleryError.message : "Could not replace that image.");
    }
  };

  const removeGalleryImage = (item: GalleryItem) => {
    if (item.slot) {
      onRemoveImage(item.slot);
      return;
    }
    onRemoveImage("galleryImages", item.galleryIndex);
  };

  const updateCharacterArtBoard = (categories: CharacterArtBoardCategory[]) => {
    onChange({
      characterArtBoard: normalizeCharacterArtBoard({
        categories
      })
    });
  };

  const uploadCharacterArtBoardImage = async (category: CharacterArtBoardCategory, file: File | undefined) => {
    if (!file) return;
    if (!isEditing) {
      window.alert("Click Edit first, then upload character art.");
      return;
    }
    const mediaSlot = characterArtBoardMediaSlots[category.id];
    if (mediaSlot) {
      onUploadImage(mediaSlot, file);
      return;
    }
    if (!isSupportedImage(file)) {
      window.alert("Use a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    try {
      const dataUrl = await readImageFileForStorage(file, {
        maxDimension: 1100,
        maxDataUrlLength: 640_000
      });
      updateCharacterArtBoard(
        characterArtBoard.categories.map((item) =>
          item.id === category.id ? { ...item, image: dataUrl } : item
        )
      );
    } catch (uploadError) {
      window.alert(uploadError instanceof Error ? uploadError.message : "Could not prepare that image.");
    }
  };

  const removeCharacterArtBoardImage = (category: CharacterArtBoardCategory) => {
    if (!isEditing) return;
    const mediaSlot = characterArtBoardMediaSlots[category.id];
    if (mediaSlot) {
      onRemoveImage(mediaSlot);
      return;
    }
    updateCharacterArtBoard(
      characterArtBoard.categories.map((item) =>
        item.id === category.id ? { ...item, image: "" } : item
      )
    );
  };

  const moveCharacterArtBoardCategory = (categoryId: string, direction: -1 | 1) => {
    if (!isEditing) return;
    const sorted = [...characterArtBoard.categories].sort((left, right) => left.order - right.order);
    const index = sorted.findIndex((category) => category.id === categoryId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
    [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];
    updateCharacterArtBoard(sorted.map((category, order) => ({ ...category, order })));
  };

  const addCharacterArtBoardCategory = () => {
    if (!isEditing) return;
    const label = window.prompt("New art category name", "New Art Category");
    if (!label?.trim()) return;
    const category: CharacterArtBoardCategory = {
      id: `custom-art-board-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: label.trim(),
      image: "",
      order: characterArtBoard.categories.length,
      isDefault: false
    };
    updateCharacterArtBoard([...characterArtBoard.categories, category]);
  };

  const removeCharacterArtBoardCategory = (category: CharacterArtBoardCategory) => {
    if (!isEditing) return;
    if (isDefaultCharacterArtBoardCategoryId(category.id)) {
      window.alert("Default art categories stay on this board. You can move them or leave them empty.");
      return;
    }
    if (!window.confirm(`Remove "${category.label}" from the upload board? This will not remove other character data.`)) return;
    updateCharacterArtBoard(
      characterArtBoard.categories
        .filter((item) => item.id !== category.id)
        .map((item, order) => ({ ...item, order }))
    );
  };

  const confirmDuplicateDriveFile = (driveFileId: string, ignoreGalleryId?: string | null) => {
    const normalizedId = driveFileId.trim();
    if (!normalizedId) return true;

    const duplicate = artGallery.find(
      (item) => item.driveFileId.trim() === normalizedId && item.id !== ignoreGalleryId
    );
    if (!duplicate) return true;

    return window.confirm(
      `"${duplicate.title || "This Drive file"}" is already in this character's gallery. Add it again anyway?`
    );
  };

  const driveFolderTargetFromEntry = () => ({
    driveFolderId: entry.driveFolderId || "",
    driveFolderLink: entry.driveFolderLink || googleDriveFolderLink(entry.driveFolderId || ""),
    driveFolderName: entry.driveFolderId ? `${entry.title} Drive Folder` : ""
  });

  const chooseDriveFolder = async (title = "Choose Character Drive Folder") => {
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      return null;
    }
    try {
      return await openGoogleDriveFolderPicker(title);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not open Google Drive folder picker.");
      return null;
    }
  };

  const openDriveUploadPicker = () => {
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      return;
    }
    if (!isEditing) {
      window.alert("Click Edit first, then upload art for this character.");
      return;
    }

    driveUploadInputRef.current?.click();
  };

  const prepareDriveUpload = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      window.alert("Choose a JPG, JPEG, PNG, WEBP, or GIF image.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setDriveUploadDraft((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return {
        file,
        previewUrl,
        category: "Concept Art",
        notes: "",
        assetState: "wip",
        ...driveFolderTargetFromEntry(),
        uploading: false,
        message: ""
      };
    });
  };

  const closeDriveUpload = () => {
    if (driveUploadDraft?.previewUrl) URL.revokeObjectURL(driveUploadDraft.previewUrl);
    setDriveUploadDraft(null);
  };

  const uploadSelectedImageToDrive = async () => {
    if (!driveUploadDraft) return;

    setDriveUploadDraft((current) => current ? { ...current, uploading: true, message: "Uploading image to Google Drive..." } : current);
    try {
      const targetFolderId = driveUploadDraft.driveFolderId.trim();
      if (!targetFolderId) {
        setDriveUploadDraft((current) => current
          ? { ...current, uploading: false, message: "Choose a Google Drive folder before uploading." }
          : current);
        return;
      }
      const uploadedFile = await uploadImageToDrive(driveUploadDraft.file, targetFolderId, {
        naming: {
          subjectName: entry.title,
          categoryName: driveUploadDraft.category || "Art Gallery",
          slotName: "Gallery Upload",
          sourceType: "Character",
          state: driveUploadDraft.assetState
        }
      });
      if (!confirmDuplicateDriveFile(uploadedFile.id)) {
        setDriveUploadDraft((current) => current
          ? {
              ...current,
              uploading: false,
              message: "Upload finished, but it was not added because this Drive file is already in the gallery."
            }
          : current);
        return;
      }
      addUploadedDriveImageToCharacter(
        entry.id,
        uploadedFile,
        driveUploadDraft.category,
        driveUploadDraft.notes.trim(),
        (uploadedItem) => {
          onChange({ artGallery: [uploadedItem, ...artGallery] });
        },
        {
          id: targetFolderId,
          link: driveUploadDraft.driveFolderLink || googleDriveFolderLink(targetFolderId),
          name: driveUploadDraft.driveFolderName
        }
      );
      URL.revokeObjectURL(driveUploadDraft.previewUrl);
      setDriveUploadDraft(null);
      window.alert(`Uploaded "${uploadedFile.name}" to Google Drive and added it to ${entry.title}'s gallery.`);
    } catch (uploadError) {
      setDriveUploadDraft((current) => current
        ? {
            ...current,
            uploading: false,
            message: uploadError instanceof Error ? uploadError.message : "Upload failed. Try again."
          }
        : current);
    }
  };

  const importArtFromDrive = async () => {
    if (!isEditing) {
      window.alert("Click Edit first, then import Drive art for this character.");
      return;
    }

    try {
      const pickedFile = await openGooglePickerForCharacter(entry.id);
      if (!pickedFile) return;
      if (!confirmDuplicateDriveFile(pickedFile.id)) return;

      handlePickedDriveFile(pickedFile, entry.id, (pickedItem) => {
        onChange({ artGallery: [pickedItem, ...artGallery] });
      });
      window.alert(`Imported "${pickedFile.name}" from Google Drive into ${entry.title}'s gallery.`);
    } catch (pickerError) {
      window.alert(pickerError instanceof Error ? pickerError.message : "Google Picker could not import that image.");
    }
  };

  const openAddArtGalleryItem = () => {
    if (!isEditing) {
      window.alert("Click Edit first, then add image link metadata.");
      return;
    }
    setEditingArtGalleryId(null);
    setArtGalleryDraft(createBlankArtGalleryItem());
    setArtGalleryModalOpen(true);
  };

  const openEditArtGalleryItem = (item: CharacterArtGalleryItem) => {
    if (!isEditing) {
      window.alert("Click Edit first, then edit image metadata.");
      return;
    }
    setEditingArtGalleryId(item.id);
    setArtGalleryDraft({ ...item });
    setArtGalleryModalOpen(true);
  };

  const saveArtGalleryItem = () => {
    if (!isEditing) return;
    if (isStoredImageData(artGalleryDraft.thumbnailUrl) || isStoredImageData(artGalleryDraft.webViewLink)) {
      window.alert("Use a normal image/link URL. This gallery stores metadata only, not pasted image data.");
      return;
    }

    const cleanItem: CharacterArtGalleryItem = {
      ...artGalleryDraft,
      id: artGalleryDraft.id || `art-${Date.now()}`,
      title: artGalleryDraft.title.trim() || "Untitled Art Reference",
      category: artGalleryDraft.category.trim() || "Reference",
      driveFileId: artGalleryDraft.driveFileId.trim(),
      thumbnailUrl: artGalleryDraft.thumbnailUrl.trim(),
      webViewLink: artGalleryDraft.webViewLink.trim(),
      dateAdded: artGalleryDraft.dateAdded || new Date().toISOString(),
      notes: artGalleryDraft.notes.trim()
    };
    if (!confirmDuplicateDriveFile(cleanItem.driveFileId, editingArtGalleryId)) return;
    const nextGallery = editingArtGalleryId
      ? artGallery.map((item) => (item.id === editingArtGalleryId ? cleanItem : item))
      : [cleanItem, ...artGallery];
    onChange({ artGallery: nextGallery });
    setArtGalleryModalOpen(false);
  };

  const setFeaturedArtGalleryItem = (id: string) => {
    if (!isEditing) {
      window.alert("Click Edit first, then choose a featured image.");
      return;
    }
    onChange({
      artGallery: artGallery.map((item) => ({
        ...item,
        isFeatured: item.id === id
      }))
    });
  };

  const removeArtGalleryItem = (item: CharacterArtGalleryItem) => {
    if (!isEditing) {
      window.alert("Click Edit first, then remove image metadata.");
      return;
    }
    if (!window.confirm(`Remove "${item.title || "this art reference"}" from this character? This will not delete anything from Google Drive.`)) {
      return;
    }
    if (isTemporaryObjectUrl(item.thumbnailUrl)) {
      URL.revokeObjectURL(item.thumbnailUrl);
    }
    onChange({ artGallery: artGallery.filter((galleryItem) => galleryItem.id !== item.id) });
  };

  const viewArtGalleryItem = (item: CharacterArtGalleryItem) => {
    if (!item.webViewLink) {
      window.alert("No view link has been added for this art reference yet.");
      return;
    }
    window.open(item.webViewLink, "_blank", "noopener,noreferrer");
  };

  const openDriveFolderModal = () => {
    if (!isEditing) {
      window.alert("Click Edit first, then set the character Drive folder.");
      return;
    }
    setDriveFolderDraft({ id: entry.driveFolderId || "", link: entry.driveFolderLink || "" });
    setDriveFolderModalOpen(true);
  };

  const chooseCharacterDriveFolder = async () => {
    const folder = await chooseDriveFolder("Choose Character Drive Folder");
    if (!folder) return;
    setDriveFolderDraft({ id: folder.id, link: folder.url });
  };

  const chooseDriveUploadFolder = async () => {
    const folder = await chooseDriveFolder("Choose Upload Folder");
    if (!folder) return;
    setDriveUploadDraft((current) => current
      ? {
          ...current,
          driveFolderId: folder.id,
          driveFolderLink: folder.url,
          driveFolderName: folder.name,
          message: `Upload target set to "${folder.name}".`
        }
      : current);
  };

  const saveDriveFolder = () => {
    onChange({
      driveFolderId: driveFolderDraft.id.trim(),
      driveFolderLink: driveFolderDraft.link.trim()
    });
    setDriveFolderModalOpen(false);
  };

  const openDriveFolder = () => {
    if (!entry.driveFolderLink) {
      window.alert("No Drive folder link has been set for this character yet.");
      return;
    }
    window.open(entry.driveFolderLink, "_blank", "noopener,noreferrer");
  };

  const updateMedia = (patch: Partial<EntryMedia>) => {
    onChange({ media: { ...entry.media, ...patch } });
  };

  const imageFitForSlot = (slot: Exclude<ImageSlot, "galleryImages">) =>
    normalizeImageFit(entry.media.imageFits?.[slot]);

  const openImageAdjuster = (
    slot: Exclude<ImageSlot, "galleryImages">,
    label: string,
    aspectRatio: string,
    previewFrame?: { width: number; height: number }
  ) => {
    if (!isEditing) return;
    const imageUrl = String(entry.media[slot] || "");
    if (!imageUrl) return;
    setImageAdjustTarget({
      slot,
      label,
      imageUrl,
      imageFit: imageFitForSlot(slot),
      aspectRatio,
      previewFrame
    });
  };

  const saveImageAdjustment = ({ imageUrl, imageFit }: { imageUrl: string; imageFit: ImageFitSettings }) => {
    if (!imageAdjustTarget) return;
    saveImageAdjustmentForSlot(imageAdjustTarget.slot, { imageUrl, imageFit });
    setImageAdjustTarget(null);
  };

  const saveImageAdjustmentForSlot = (slot: Exclude<ImageSlot, "galleryImages">, { imageUrl, imageFit }: { imageUrl: string; imageFit: ImageFitSettings }) => {
    updateMedia({
      [slot]: imageUrl,
      imageFits: {
        ...(entry.media.imageFits || {}),
        [slot]: normalizeImageFit(imageFit)
      }
    } as Partial<EntryMedia>);
  };

  const saveCharacterImageManager = (slots: ImageManagerSlotDraft[]) => {
    const nextMedia: EntryMedia = {
      ...entry.media,
      imageFits: { ...(entry.media.imageFits || {}) }
    };
    slots.forEach((slot) => {
      const mediaSlot = slot.id as Exclude<ImageSlot, "galleryImages">;
      nextMedia[mediaSlot] = slot.imageUrl;
      nextMedia.imageFits = {
        ...(nextMedia.imageFits || {}),
        [mediaSlot]: normalizeImageFit(slot.imageFit)
      };
    });
    commitCharacterPatch({ media: nextMedia });
    setImageManagerOpen(false);
  };

  const openArtVaultGallery = (slot: Exclude<ImageSlot, "galleryImages">) => {
    setArtVaultGalleryFocus(slot);
  };

  const saveArtVaultGalleryImageAdjustment = ({ imageUrl, imageFit }: { imageUrl: string; imageFit: ImageFitSettings }) => {
    if (!artVaultGalleryAdjustTarget) return;
    const timestamp = new Date().toISOString();
    const nextVault = normalizeArtVault(entry.artVault);
    onChange({
      artVault: {
        sections: nextVault.sections.map((section) => ({
          ...section,
          slots: section.slots.map((slot) => {
            if (section.id !== artVaultGalleryAdjustTarget.sectionId || slot.id !== artVaultGalleryAdjustTarget.slotId || !slot.image) {
              return slot;
            }
            return {
              ...slot,
              image: {
                ...slot.image,
                thumbnailUrl: imageUrl,
                imageFit: normalizeImageFit(imageFit),
                lastUpdatedByName: currentUser.name,
                lastUpdatedByEmail: currentUser.email,
                lastUpdatedAt: timestamp
              }
            };
          })
        }))
      }
    });
    setArtVaultGalleryAdjustTarget(null);
  };

  const uploadAdjustedImageToDrive = async (file: File, folderId?: string, slotLabel?: string, assetState: "wip" | "final" = "wip") => {
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      throw new Error("Google Drive is not connected yet.");
    }
    const targetFolderId = (folderId || entry.driveFolderId).trim();
    if (!targetFolderId) {
      throw new Error("Set a Drive folder for this character before uploading art.");
    }
    const uploadedFile = await uploadImageToDrive(file, targetFolderId, {
      naming: {
        subjectName: entry.title,
        categoryName: "Character Profile",
        slotName: slotLabel || "Adjusted Image",
        sourceType: "Character",
        state: assetState
      }
    });
    return googleDriveThumbnailUrl(uploadedFile.id);
  };

  const importAdjustedImageFromDrive = async () => {
    const pickedFile = await openGooglePickerForCharacter(entry.id);
    return pickedFile ? googleDriveThumbnailUrl(pickedFile.id) : "";
  };

  const renderEssentialEditor = (label: string, value: string) => {
    if (label === "Age") {
      return <EditInput value={fieldText(entry, ["Age"]) || value} placeholder="23" onChange={(next) => onSetField("Age", next)} />;
    }
    if (label === "Origin") {
      return <EditInput value={joinValues(entry.connections.locations) || value} placeholder="Osul" onChange={(next) => onConnectionChange("locations", next)} />;
    }
    if (label === "Role") {
      return <EditInput value={fieldText(entry, ["Gameplay Role", "Role"]) || value} placeholder="Fighter - Cook - Protector" onChange={(next) => onSetField("Gameplay Role", next)} />;
    }
    if (label === "Recruited By") {
      return <EditInput value={fieldText(entry, ["Recruited By", "Mentor"]) || value} placeholder="Tohm Kyatt" onChange={(next) => onSetField("Recruited By", next)} />;
    }
    if (label === "Favorite Food") {
      return <EditInput value={fieldText(entry, ["Favorite Food"]) || value} placeholder="Potatoes" onChange={(next) => onSetField("Favorite Food", next)} />;
    }
    return <EditInput value={fieldText(entry, ["Character Status"]) || value} placeholder="Active" onChange={(next) => onSetField("Character Status", next)} />;
  };

  const confirmDelete = () => {
    if (window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) {
      onDelete();
    }
  };

  const buildAssistantPromptForCharacter = () => {
    const prompt = buildCharacterAssistantPrompt(entry, character, assistantChangeRequest);
    setAssistantPrompt(prompt);
    setAssistantMessage("Prompt built from your requested changes.");
    return prompt;
  };

  const copyAssistantPrompt = async () => {
    const prompt = assistantPrompt || buildAssistantPromptForCharacter();
    try {
      await navigator.clipboard.writeText(prompt);
      setAssistantMessage("Prompt copied. Paste it into ChatGPT, then paste the returned JSON below.");
    } catch {
      setAssistantMessage("Prompt built. Select and copy it from the box below.");
    }
  };

  const applyAssistantImport = () => {
    try {
      const payload = parseCharacterAssistantPayload(assistantImport);
      const patch = characterPayloadToEntryPatch(entry, payload);
      onChange(patch);
      setAssistantMessage("Character page updated. Review it, then press Save.");
    } catch (importError) {
      setAssistantMessage(importError instanceof Error ? importError.message : "Could not read that character JSON.");
    }
  };

  if (artVaultOpen) {
    return (
      <CharacterArtVaultView
        entry={entry}
        character={character}
        artGallery={artGallery}
        readOnly={readOnly}
        isEditing={isEditing}
        onBack={() => setArtVaultOpen(false)}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onChange={onChange}
        currentUser={currentUser}
        focusedAssignment={focusedAssignment}
      />
    );
  }

  const actionToolbar = (
    <div className="character-codex-actions">
      <button
        className={`character-codex-story-toggle ${fullStoryOpen ? "active" : ""}`}
        onClick={() => {
          setActiveStoryTab("full");
          setFullStoryOpen(true);
        }}
      >
        <Icon name="ScrollText" className="h-4 w-4" />
        Open Full Story Scroll
      </button>
      {referenceKeyword && onViewReferences && (
        <button
          className="character-codex-action-button"
          onClick={() => onViewReferences(referenceKeyword)}
          title={`View every reference to ${referenceKeyword}`}
        >
          <Icon name="Search" className="h-4 w-4" />
          View all references
        </button>
      )}
      {onToggleFavorite && (
        <FavoriteButton
          active={isFavorite}
          label={entry.title}
          onToggle={onToggleFavorite}
          className="character-codex-favorite-button"
        />
      )}
      {isEditing ? (
        <>
          <button className="character-codex-action-button" onClick={() => setImageManagerOpen(true)}>
            <Icon name="Image" className="h-4 w-4" />
            Images
          </button>
          <button className="character-codex-action-button character-mini-assistant-open-button" onClick={() => setAssistantOpen(true)}>
            <Icon name="WandSparkles" className="h-4 w-4" />
            Mini Assistant
          </button>
          <button className="character-codex-action-button" onClick={onCancel}>Cancel</button>
          <button className="button-frame character-codex-action-button" onClick={onSave}>
            <Icon name="Save" className="h-4 w-4" />
            Save
          </button>
        </>
      ) : (
        !readOnly && (
          <button className="character-codex-icon-button" onClick={onEdit} title="Edit">
            <Icon name="Edit3" className="h-5 w-5" />
          </button>
        )
      )}
      {!readOnly && (
        <button className="character-codex-action-button character-codex-danger-button" onClick={confirmDelete} title="Delete character">
          <Icon name="Trash2" className="h-4 w-4" />
          Delete
        </button>
      )}
      <button className="character-codex-icon-button" onClick={onClose} title="Close">
        <Icon name="X" className="h-5 w-5" />
      </button>
    </div>
  );
  const storyReaderSections: StoryReaderSection[] = storySections.map((section) => ({
    key: section.key,
    title: section.title,
    icon: section.icon,
    value: storyValue(entry, character, section.key),
    placeholder: section.placeholder,
    onChange: (value) => {
      if (section.key === "futureUnresolvedThreads") {
        onNotesChange({ unresolved: value });
        return;
      }
      onSetField(section.field, value);
    }
  }));
  const characterStorySteps = buildCharacterStorySteps(entry, character);

  if (fullStoryOpen) {
    return (
      <StoryReaderModal
        title={entry.title}
        eyebrow="Character Full Story"
        activeTab={activeStoryTab}
        sections={storyReaderSections}
        fullStory={fullStoryText(entry, character)}
        fullStoryEditValue={fieldText(entry, ["Full Story", "Longform Story", "Complete Story"]) || fullStoryText(entry, character)}
        fullStoryPlaceholder="Write the complete in-depth character story here. This can be long-form prose, scene notes, emotional beats, mysteries, spoilers, and future plans."
        steps={characterStorySteps}
        isEditing={isEditing}
        onSetActiveTab={(tab) => setActiveStoryTab(tab as StoryReaderTab)}
        onFullStoryChange={(value) => onSetField("Full Story", value)}
        onClose={() => setFullStoryOpen(false)}
      />
    );
  }

  return (
    <article className="character-codex-shell">
      <aside className="character-codex-left">
        <div className="character-codex-brand">
          <p>Tales of the</p>
          <h2 className="font-display">Tavern</h2>
        </div>

        <div className="character-codex-portrait-card">
          {isEditing ? (
            <button
              className="character-codex-portrait-upload editable-image-trigger"
              onClick={(event) => openImageAdjuster("characterPortrait", "Character Portrait", "3 / 4", frameFromElement(event.currentTarget))}
            >
              {character.portrait ? (
                <img src={character.portrait} alt="" style={imageFitToStyle(imageFitForSlot("characterPortrait"))} />
              ) : (
                <PortraitPlaceholder />
              )}
              <span>
                <Icon name="Image" className="h-4 w-4" />
                Adjust
              </span>
            </button>
          ) : (
            character.portrait ? <img src={character.portrait} alt="" style={imageFitToStyle(imageFitForSlot("characterPortrait"))} /> : <PortraitPlaceholder />
          )}
          {isEditing && character.portrait && (
            <button className="character-codex-remove-media" onClick={() => onRemoveImage("characterPortrait")}>
              Remove
            </button>
          )}
        </div>

        {!readOnly && (
          <button className="character-art-vault-open-button" onClick={() => onOpenArtBinder ? onOpenArtBinder() : setArtVaultOpen(true)}>
            <Icon name="Archive" className="h-5 w-5" />
            Open Art Vault
          </button>
        )}

        <CodexPanel title="Essentials" icon="Compass">
          {character.essentials.map((fact) => (
            <EssentialRow key={fact.label} label={fact.label}>
              {isEditing ? renderEssentialEditor(fact.label, fact.value) : <LoreKeywordText text={fact.value || "Not set"} />}
            </EssentialRow>
          ))}
        </CodexPanel>

        {isEditing && (
          <CodexPanel title="Character Button Art" icon="Image">
            <div className="character-button-edit-tools">
              <button className="button-frame character-codex-action-button" onClick={() => setImageManagerOpen(true)}>
                <Icon name="Image" className="h-4 w-4" />
                Open Character Image Manager
              </button>
              <button
                className="character-codex-action-button character-hover-text-toggle"
                aria-pressed={!hideCharacterHoverText}
                onClick={toggleCharacterHoverText}
              >
                <Icon name={hideCharacterHoverText ? "Eye" : "EyeOff"} className="h-4 w-4" />
                {hideCharacterHoverText ? "Show Hover Text" : "Hide Hover Text"}
              </button>
            </div>
            <p className="character-codex-help">
              These images control the character button on the Characters page. The hover text is the little description that appears beside the character.
            </p>
            <div className="character-button-preview-row">
              <CharacterButtonPreview
                label="Button"
                src={characterButtonImage}
                imageFit={imageFitForSlot(entry.media.characterPortrait ? "characterPortrait" : entry.media.mainImage ? "mainImage" : "iconImage")}
                onAdjust={(next) => saveImageAdjustmentForSlot(entry.media.characterPortrait ? "characterPortrait" : entry.media.mainImage ? "mainImage" : "iconImage", next)}
              />
              <CharacterButtonPreview
                label="Hover"
                src={characterButtonHoverImage}
                imageFit={imageFitForSlot(entry.media.characterHoverImage ? "characterHoverImage" : entry.media.dialogueSpriteImage ? "dialogueSpriteImage" : entry.media.ingameSpriteImage ? "ingameSpriteImage" : entry.media.characterPortrait ? "characterPortrait" : entry.media.mainImage ? "mainImage" : "iconImage")}
                onAdjust={(next) => saveImageAdjustmentForSlot(entry.media.characterHoverImage ? "characterHoverImage" : entry.media.dialogueSpriteImage ? "dialogueSpriteImage" : entry.media.ingameSpriteImage ? "ingameSpriteImage" : entry.media.characterPortrait ? "characterPortrait" : entry.media.mainImage ? "mainImage" : "iconImage", next)}
              />
            </div>
          </CodexPanel>
        )}
      </aside>

      <main className="character-codex-main">
        {actionToolbar}
        {error && <div className="character-codex-alert">{error}</div>}

        <header className="character-codex-header">
          {isEditing ? (
            <EditInput
              className="character-codex-title-input font-display"
              value={entry.title}
              placeholder="Character name"
              onChange={(value) => onChange({ title: value })}
            />
          ) : (
            <h1 className="font-display">{entry.title}</h1>
          )}

          {isEditing ? (
            <EditInput
              value={character.descriptor}
              placeholder="Main Character - Human Fighter - Osul"
              onChange={(value) => onSetField("Descriptor", value)}
            />
          ) : (
            <p className="character-codex-descriptor">
              <LoreKeywordText text={character.descriptor} />
            </p>
          )}

          <div className="character-codex-tags">
            {isEditing ? (
              <EditInput
                value={joinValues(entry.tags)}
                placeholder="Fighter, Cook, Protector, Recruit"
                onChange={(value) => onChange({ tags: splitValues(value) })}
              />
            ) : (
              character.tags.map((tag) => (
                <span key={tag} className="character-codex-tag">
                  {tag}
                </span>
              ))
            )}
          </div>
        </header>

        <CharacterSpriteShowcase
          media={entry.media}
          isEditing={isEditing}
          onUpload={onUploadImage}
          onSetImage={(slot, imageUrl) => onChange({ media: { ...entry.media, [slot]: imageUrl } })}
          onRemove={onRemoveImage}
          getImageFit={imageFitForSlot}
          onAdjustImage={(slot, label, previewFrame) => openImageAdjuster(slot, label, "16 / 10", previewFrame)}
          onOpenGallery={openArtVaultGallery}
        />

        <div className="character-codex-section-divider" aria-hidden="true" />

        <section className="character-codex-overview-grid">
          <CodexCard title="Character Overview" icon="BookOpen" assignmentModule={characterModule(entry, "overview", "Character Overview")}>
            {isEditing ? (
              <RichTextEditor
                value={entry.summary || character.atAGlance}
                placeholder="Short quick-read overview of who this character is."
                onChange={(value) => onChange({ summary: value })}
              />
            ) : (
              <RichLoreText text={character.atAGlance} />
            )}
          </CodexCard>

          <CodexCard title="Key Traits" icon="ShieldAlert" assignmentModule={characterModule(entry, "key-traits", "Key Traits")}>
            {isEditing ? (
              <RichTextEditor
                value={fieldText(entry, ["Personality"]) || character.personality}
                placeholder="Temperament, humor, flaws, fears, strengths, and emotional texture."
                onChange={(value) => onSetField("Personality", value)}
              />
            ) : (
              <RichLoreText text={character.personality} />
            )}
          </CodexCard>

          <CodexCard title="Core Function / Why They Matter" icon="Star" wide assignmentModule={characterModule(entry, "core-function", "Core Function / Why They Matter")}>
            {isEditing ? (
              <RichTextEditor
                value={fieldText(entry, ["Core Function"]) || character.coreFunction}
                placeholder="Why this character matters to the story, gameplay, or production."
                onChange={(value) => onSetField("Core Function", value)}
              />
            ) : (
              <RichLoreText text={character.coreFunction} />
            )}
          </CodexCard>

          <CodexCard title="Key Relationships" icon="Users" wide assignmentModule={characterModule(entry, "key-relationships", "Key Relationships")}>
            {isEditing && (
              <div className="character-codex-section-actions">
                <button className="button-frame character-codex-small-action" onClick={openAddRelationshipModal}>
                  <Icon name="Plus" className="h-4 w-4" />
                  Add Relationship
                </button>
              </div>
            )}
            <div className="character-codex-relationship-grid">
              {visibleRelationships.map((relationship) => (
                <div key={relationship.id || relationship.characterId || `${relationship.name}-${relationship.type}`} className="character-codex-relationship-card">
                  {isEditing && (
                    <button className="relationship-remove-btn" onClick={() => removeRelationship(relationship)}>
                      Remove
                    </button>
                  )}
                  <div className="relationship-avatar-wrap">
                    {relationship.image ? (
                      <img src={relationship.image} alt="" />
                    ) : (
                      <span className="character-codex-mini-icon">
                        <Icon name="UserRound" className="h-5 w-5" />
                      </span>
                    )}
                  </div>
                  <strong><LoreKeywordText text={relationship.name} /></strong>
                  <div className="character-codex-relationship-note"><RichLoreText text={relationship.note} /></div>
                </div>
              ))}
              {!visibleRelationships.length && <p style={{ color: "var(--muted-ink)" }}>No relationships connected yet.</p>}
            </div>
            {!isEditing && character.relationships.length > 3 && (
              <button className="character-codex-link-button" onClick={() => setShowAllRelationships((value) => !value)}>
                {showAllRelationships ? "Show Fewer Relationships" : "View All Relationships"}
                <Icon name="ChevronDown" className="h-4 w-4" />
              </button>
            )}
          </CodexCard>

          <CodexCard title="World Connections" icon="Map" assignmentModule={characterModule(entry, "world-connections", "World Connections")}>
            <div className="character-codex-world-list">
              {character.worldConnections.map((connection) => (
                <div key={`${connection.type}-${connection.title}`} className="character-codex-world-item">
                  <span>{connection.type}</span>
                  <strong><LoreKeywordText text={connection.title} /></strong>
                  <div className="character-codex-world-note"><RichLoreText text={connection.note} /></div>
                </div>
              ))}
              {!character.worldConnections.length && <p style={{ color: "var(--muted-ink)" }}>No world connections yet.</p>}
            </div>
            {isEditing && (
              <div className="mt-3 grid gap-2">
                <EditInput
                  value={joinValues(entry.connections.locations)}
                  placeholder="Important locations"
                  onChange={(value) => onConnectionChange("locations", value)}
                />
                <EditInput
                  value={joinValues(entry.connections.factions)}
                  placeholder="Important factions or groups"
                  onChange={(value) => onConnectionChange("factions", value)}
                />
                <EditInput
                  value={joinValues(entry.connections.items)}
                  placeholder="Important objects, pages, artifacts"
                  onChange={(value) => onConnectionChange("items", value)}
                />
              </div>
            )}
          </CodexCard>

          <CodexCard title="Reveal Level" icon="Eye" assignmentModule={characterModule(entry, "reveal-level", "Reveal Level")}>
            {isEditing ? (
              <EditSelect value={entry.spoilerLevel} options={spoilerOptions} onChange={(value) => onChange({ spoilerLevel: value })} />
            ) : (
              <RevealMeter level={character.revealLevel} />
            )}
          </CodexCard>
        </section>
      </main>

      {isEditing && assistantOpen && (
        <CharacterMiniAssistant
          changeRequest={assistantChangeRequest}
          prompt={assistantPrompt}
          importText={assistantImport}
          message={assistantMessage}
          onChangeRequestChange={setAssistantChangeRequest}
          onBuildPrompt={buildAssistantPromptForCharacter}
          onCopyPrompt={copyAssistantPrompt}
          onImportTextChange={setAssistantImport}
          onApplyImport={applyAssistantImport}
          onClose={() => setAssistantOpen(false)}
        />
      )}

      {artGalleryModalOpen && (
        <CharacterArtGalleryModal
          draft={artGalleryDraft}
          onChange={(patch) => setArtGalleryDraft((current) => ({ ...current, ...patch }))}
          onSave={saveArtGalleryItem}
          onClose={() => setArtGalleryModalOpen(false)}
        />
      )}

      {driveFolderModalOpen && (
        <CharacterDriveFolderModal
          driveFolderId={driveFolderDraft.id}
          driveFolderLink={driveFolderDraft.link}
          onChange={setDriveFolderDraft}
          onPickFolder={chooseCharacterDriveFolder}
          onSave={saveDriveFolder}
          onClose={() => setDriveFolderModalOpen(false)}
        />
      )}

      {driveUploadDraft && (
        <DriveUploadModal
          draft={driveUploadDraft}
          characterName={entry.title}
          onChange={(patch) => setDriveUploadDraft((current) => current ? { ...current, ...patch } : current)}
          onChooseFolder={chooseDriveUploadFolder}
          onCancel={closeDriveUpload}
          onUpload={uploadSelectedImageToDrive}
        />
      )}

      {relationshipModalOpen && (
        <AddRelationshipModal
          characters={relationshipOptions}
          search={relationshipSearch}
          selectedCharacter={selectedRelationshipCharacter}
          description={relationshipDescription}
          message={relationshipMessage}
          existingRelationshipIds={existingRelationshipCharacterIds}
          onSearchChange={setRelationshipSearch}
          onSelectCharacter={selectRelationshipCharacter}
          onDescriptionChange={setRelationshipDescription}
          onSave={addRelationship}
          onClose={closeAddRelationshipModal}
        />
      )}

      {artVaultGalleryFocus && (
        <CharacterArtVaultGalleryModal
          characterName={entry.title}
          vault={entry.artVault}
          focusSlot={artVaultGalleryFocus}
          isEditing={isEditing && !readOnly}
          onClose={() => setArtVaultGalleryFocus(null)}
          onAdjustImage={(section, slot, previewFrame) => {
            const image = slot.image;
            const imageUrl = image?.thumbnailUrl || image?.webViewLink || "";
            if (!image || !imageUrl) return;
            setArtVaultGalleryAdjustTarget({
              sectionId: section.id,
              slotId: slot.id,
              label: image.title || `${slot.label} ${slot.requirementType}`.trim(),
              imageUrl,
              imageFit: image.imageFit,
              previewFrame
            });
          }}
        />
      )}

      {artVaultGalleryAdjustTarget && (
        <ImageAdjustModal
          slotLabel={artVaultGalleryAdjustTarget.label}
          imageUrl={artVaultGalleryAdjustTarget.imageUrl}
          imageFit={artVaultGalleryAdjustTarget.imageFit}
          aspectRatio="4 / 3"
          previewFrame={artVaultGalleryAdjustTarget.previewFrame}
          onSave={saveArtVaultGalleryImageAdjustment}
          onCancel={() => setArtVaultGalleryAdjustTarget(null)}
        />
      )}

      {imageAdjustTarget && (
        <ImageAdjustModal
          slotLabel={imageAdjustTarget.label}
          imageUrl={imageAdjustTarget.imageUrl}
          imageFit={imageAdjustTarget.imageFit}
          aspectRatio={imageAdjustTarget.aspectRatio}
          previewFrame={imageAdjustTarget.previewFrame}
          driveFolderId={entry.driveFolderId}
          driveFolderLink={entry.driveFolderLink}
          driveFolderName={entry.driveFolderId ? `${entry.title} Drive Folder` : ""}
          onSave={saveImageAdjustment}
          onCancel={() => setImageAdjustTarget(null)}
          onUploadToDrive={uploadAdjustedImageToDrive}
          onImportFromDrive={importAdjustedImageFromDrive}
        />
      )}

      {imageManagerOpen && (
        <ImageManagerModal
          title={`${entry.title} Image Manager`}
          subtitle="Assign, import, upload, download, and frame every character image in one place."
          slots={characterImageManagerSlots(entry, imageFitForSlot)}
          onClose={() => setImageManagerOpen(false)}
          onSave={saveCharacterImageManager}
        />
      )}
    </article>
  );
}

function AddRelationshipModal({
  characters,
  search,
  selectedCharacter,
  description,
  message,
  existingRelationshipIds,
  onSearchChange,
  onSelectCharacter,
  onDescriptionChange,
  onSave,
  onClose
}: {
  characters: LoreEntry[];
  search: string;
  selectedCharacter?: LoreEntry;
  description: string;
  message: string;
  existingRelationshipIds: Set<string>;
  onSearchChange: (value: string) => void;
  onSelectCharacter: (entry: LoreEntry) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relationship-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add Key Relationship">
      <section className="relationship-modal modal-frame">
        <header className="relationship-modal-header">
          <div>
            <p>Character Link</p>
            <h2 className="font-display">Add Key Relationship</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close add relationship">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <label className="relationship-modal-search">
          <Icon name="Search" className="h-4 w-4" />
          <input
            value={search}
            placeholder="Search characters..."
            onChange={(event) => onSearchChange(event.target.value)}
            autoFocus
          />
        </label>

        <div className="relationship-character-grid">
          {characters.map((candidate) => {
            const image = getCharacterRelationshipImage(candidate);
            const alreadyLinked = existingRelationshipIds.has(candidate.id);
            const selected = selectedCharacter?.id === candidate.id;
            return (
              <button
                key={candidate.id}
                className={`relationship-character-option ${selected ? "selected" : ""} ${alreadyLinked ? "already-linked" : ""}`}
                onClick={() => onSelectCharacter(candidate)}
                type="button"
              >
                <span className="relationship-character-avatar">
                  {image ? <img src={image} alt="" /> : <Icon name="UserRound" className="h-7 w-7" />}
                </span>
                <strong>{candidate.title}</strong>
                {alreadyLinked && <small>Already linked</small>}
              </button>
            );
          })}
          {!characters.length && (
            <p className="relationship-modal-empty">No characters match that search.</p>
          )}
        </div>

        {selectedCharacter && (
          <div className="relationship-selected-preview">
            <span className="relationship-character-avatar">
              {getCharacterRelationshipImage(selectedCharacter) ? (
                <img src={getCharacterRelationshipImage(selectedCharacter)} alt="" />
              ) : (
                <Icon name="UserRound" className="h-7 w-7" />
              )}
            </span>
            <div>
              <small>Selected character</small>
              <strong>{selectedCharacter.title}</strong>
            </div>
          </div>
        )}

        <label className="relationship-description-field">
          <span>How are they related?</span>
          <textarea
            value={description}
            placeholder="Example: Mentor, rival, childhood friend, employer, sibling, sworn enemy..."
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
        </label>

        {message && <p className="relationship-modal-message">{message}</p>}

        <footer className="relationship-modal-footer">
          <button className="button-frame subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="button-frame primary" onClick={onSave}>
            Add Relationship
          </button>
        </footer>
      </section>
    </div>
  );
}

function CharacterDriveFolderModule({
  driveFolderId,
  driveFolderLink,
  isEditing,
  onSetFolder,
  onOpenFolder
}: {
  driveFolderId: string;
  driveFolderLink: string;
  isEditing: boolean;
  onSetFolder: () => void;
  onOpenFolder: () => void;
}) {
  const connected = Boolean(driveFolderId.trim());

  return (
    <section className="character-drive-folder-module">
      <div>
        <span className={connected ? "connected" : ""}>
          <Icon name={connected ? "FolderOpen" : "Folder"} className="h-4 w-4" />
          {connected ? "Drive folder connected" : "No Drive folder set"}
        </span>
        {connected && <small>{driveFolderId}</small>}
      </div>
      <div>
        <button onClick={onSetFolder} disabled={!isEditing} title={isEditing ? "Set Drive folder metadata" : "Click Edit first"}>
          <Icon name="Edit3" className="h-4 w-4" />
          Set Drive Folder
        </button>
        <button onClick={onOpenFolder} disabled={!driveFolderLink}>
          <Icon name="FolderOpen" className="h-4 w-4" />
          Open Folder
        </button>
      </div>
    </section>
  );
}

function CharacterDriveFolderModal({
  driveFolderId,
  driveFolderLink,
  onChange,
  onPickFolder,
  onSave,
  onClose
}: {
  driveFolderId: string;
  driveFolderLink: string;
  onChange: (value: { id: string; link: string }) => void;
  onPickFolder: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="character-drive-folder-modal-backdrop">
      <section className="character-drive-folder-modal">
        <header>
          <div>
            <p>Character Drive Folder</p>
            <h2 className="font-display">Set Drive Folder</h2>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close Drive folder form">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>
        <div className="character-drive-folder-form">
          <button className="button-frame character-codex-action-button character-drive-folder-picker-button" onClick={onPickFolder}>
            <Icon name="FolderOpen" className="h-4 w-4" />
            Choose Folder From Google Drive
          </button>
          <label>
            <span>Google Drive Folder ID</span>
            <EditInput
              value={driveFolderId}
              placeholder="Folder ID"
              onChange={(id) => onChange({ id, link: driveFolderLink })}
            />
          </label>
          <label>
            <span>Google Drive Folder Link</span>
            <EditInput
              value={driveFolderLink}
              placeholder="https://drive.google.com/drive/folders/..."
              onChange={(link) => onChange({ id: driveFolderId, link })}
            />
          </label>
        </div>
        <footer>
          <p>Use the Google Drive picker so the folder ID and link are filled automatically. Manual fields stay here as a fallback.</p>
          <div>
            <button className="character-codex-action-button" onClick={onClose}>Cancel</button>
            <button className="button-frame character-codex-action-button" onClick={onSave}>
              <Icon name="Save" className="h-4 w-4" />
              Save Folder
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function DriveUploadModal({
  draft,
  characterName,
  onChange,
  onChooseFolder,
  onCancel,
  onUpload
}: {
  draft: DriveUploadDraft;
  characterName: string;
  onChange: (patch: Partial<Pick<DriveUploadDraft, "category" | "notes" | "driveFolderId" | "driveFolderLink" | "driveFolderName" | "assetState">>) => void;
  onChooseFolder: () => void;
  onCancel: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="character-drive-upload-modal-backdrop">
      <section className="character-drive-upload-modal">
        <header>
          <div>
            <p>Google Drive Upload</p>
            <h2 className="font-display">Upload to Drive</h2>
          </div>
          <button className="character-codex-icon-button" onClick={onCancel} title="Close upload form">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="character-drive-upload-body">
          <div className="character-drive-upload-preview">
            <img src={draft.previewUrl} alt="" />
            <span>Preview only. The saved gallery item will use Google Drive metadata.</span>
          </div>

          <div className="character-drive-upload-details">
            <InfoRow label="File Name" value={draft.file.name} />
            <InfoRow label="File Type" value={draft.file.type || "Unknown image type"} />
            <InfoRow label="File Size" value={fileSizeLabel(draft.file.size)} />
            <InfoRow label="Selected Character" value={characterName} />
            <div className="character-drive-upload-folder-target">
              <InfoRow label="Target Drive Folder" value={draft.driveFolderName || draft.driveFolderId || "Choose a folder before uploading"} />
              {draft.driveFolderId && <InfoRow label="Target Folder ID" value={draft.driveFolderId} />}
              <button className="character-codex-action-button" onClick={onChooseFolder} disabled={draft.uploading}>
                <Icon name="FolderOpen" className="h-4 w-4" />
                Choose Folder
              </button>
            </div>

            <label>
              <span>Category</span>
              <CustomSelect
                value={draft.category}
                disabled={draft.uploading}
                onChange={(value) => onChange({ category: value })}
                options={artUploadCategories}
              />
            </label>
            <div className="drive-image-source-state character-drive-upload-state">
              <span>Upload State</span>
              <button
                type="button"
                className={draft.assetState === "wip" ? "active" : ""}
                disabled={draft.uploading}
                onClick={() => onChange({ assetState: "wip" })}
              >
                WIP
              </button>
              <button
                type="button"
                className={draft.assetState === "final" ? "active final" : "final"}
                disabled={draft.uploading}
                onClick={() => onChange({ assetState: "final" })}
              >
                FINAL
              </button>
            </div>
            <label>
              <span>Notes</span>
              <textarea
                className="character-codex-edit-field"
                value={draft.notes}
                placeholder="What is this art for? Pose notes, expression notes, version notes, etc."
                disabled={draft.uploading}
                onChange={(event) => onChange({ notes: event.target.value })}
              />
            </label>
            {draft.message && (
              <p className={`character-drive-upload-message ${draft.uploading ? "loading" : "error"}`}>
                {draft.message}
              </p>
            )}
          </div>
        </div>

        <footer>
          <p>The file is uploaded to Google Drive. The Cook Book stores only Drive metadata.</p>
          <div>
            <button className="character-codex-action-button" onClick={onCancel} disabled={draft.uploading}>Cancel</button>
            <button className="button-frame character-codex-action-button" onClick={onUpload} disabled={draft.uploading}>
              <Icon name="Upload" className="h-4 w-4" />
              {draft.uploading ? "Uploading..." : "Upload to Drive"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="character-drive-upload-info-row">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

interface VaultSlotRef {
  sectionId: string;
  slotId: string;
}

interface VaultSlotDraft {
  sectionId: string;
  targetSectionId: string;
  slotId: string;
  label: string;
  requirementType: string;
  status: string;
  notes: string;
  image: ArtVaultImageMetadata | null;
}

function CharacterArtVaultView({
  entry,
  character,
  artGallery,
  readOnly,
  isEditing,
  onBack,
  onEdit,
  onSave,
  onCancel,
  onChange,
  currentUser,
  focusedAssignment
}: {
  entry: LoreEntry;
  character: ReturnType<typeof buildCharacterView>;
  artGallery: CharacterArtGalleryItem[];
  readOnly: boolean;
  isEditing: boolean;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (patch: Partial<LoreEntry>) => void;
  currentUser: GoogleAccountUser;
  focusedAssignment?: AssignmentRecord | null;
}) {
  const vault = useMemo(() => normalizeArtVault(entry.artVault), [entry.artVault]);
  const [activeSectionId, setActiveSectionId] = useState("all");
  const [slotFilter, setSlotFilter] = useState("All");
  const [slotSearch, setSlotSearch] = useState("");
  const [slotDraft, setSlotDraft] = useState<VaultSlotDraft | null>(null);
  const [linkPickerRef, setLinkPickerRef] = useState<VaultSlotRef | null>(null);
  const [uploadTarget, setUploadTarget] = useState<VaultSlotRef | null>(null);
  const [slotMenuRef, setSlotMenuRef] = useState<VaultSlotRef | null>(null);
  const [slotImageAdjustOpen, setSlotImageAdjustOpen] = useState(false);
  const [slotImageAdjustFrame, setSlotImageAdjustFrame] = useState<{ width: number; height: number } | undefined>();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(vault.sections.slice(1).map((section) => section.id))
  );
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const [vaultMessage, setVaultMessage] = useState("");
  const [vaultUploadFolder, setVaultUploadFolder] = useState(() => ({
    id: entry.driveFolderId || "",
    link: entry.driveFolderLink || googleDriveFolderLink(entry.driveFolderId || ""),
    name: entry.driveFolderId ? `${entry.title} Drive Folder` : ""
  }));
  const vaultUploadInputRef = useRef<HTMLInputElement | null>(null);
  const activeSection = vault.sections.find((section) => section.id === activeSectionId) || null;
  const visibleSections = activeSectionId === "all"
    ? vault.sections
    : vault.sections.filter((section) => section.id === activeSectionId);
  const filteredSections = visibleSections
    .map((section) => ({
      ...section,
      slots: section.slots.filter((slot) => artVaultSlotMatches(slot, slotSearch, slotFilter))
    }))
    .filter((section) => section.slots.length || !slotSearch.trim());
  const stats = calculateArtVaultStats(vault);
  const coverArt =
    artGallery.find((item) => item.isFeatured)?.thumbnailUrl ||
    character.portrait ||
    entry.media.mainImage ||
    entry.media.iconImage ||
    "";
  const role = fieldText(entry, ["Gameplay Role", "Role"]) || entry.type || "Character";
  const category = fieldText(entry, ["Character Category", "Primary Category"]) || entry.category || "Characters";

  useEffect(() => {
    if (!focusedAssignment?.targetRoute.includes(":art-vault:")) return;
    const [, entryId, , sectionId] = focusedAssignment.targetRoute.split(":");
    if (entryId !== entry.id || !sectionId) return;
    setActiveSectionId("all");
    setCollapsedSections((current) => {
      const next = new Set(current);
      next.delete(sectionId);
      return next;
    });
  }, [entry.id, focusedAssignment]);

  useEffect(() => {
    setVaultUploadFolder((current) => current.id ? current : {
      id: entry.driveFolderId || "",
      link: entry.driveFolderLink || googleDriveFolderLink(entry.driveFolderId || ""),
      name: entry.driveFolderId ? `${entry.title} Drive Folder` : ""
    });
  }, [entry.driveFolderId, entry.driveFolderLink, entry.title]);

  const saveVault = (nextVault: CharacterArtVault, extraPatch: Partial<LoreEntry> = {}) => {
    onChange({
      ...extraPatch,
      artVault: normalizeArtVault(nextVault)
    });
  };

  const requireVaultEdit = () => {
    if (isEditing) return true;
    window.alert("Click Edit Art Vault first to add, remove, or reorganize art slots.");
    return false;
  };

  const addSection = () => {
    if (!requireVaultEdit()) return;
    const title = window.prompt("New Art Vault section name", "New Art Section");
    if (!title?.trim()) return;
    const section = createCustomVaultSection(title.trim(), vault.sections.length);
    saveVault({ sections: [...vault.sections, section] });
    setActiveSectionId(section.id);
  };

  const updateSection = (sectionId: string, patch: Partial<ArtVaultSection>) => {
    if (!isEditing) return;
    saveVault({
      sections: vault.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      )
    });
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    if (!requireVaultEdit()) return;
    saveVault(moveVaultSection(vault, sectionId, direction));
  };

  const deleteSection = (sectionId: string) => {
    if (!requireVaultEdit()) return;
    const section = vault.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    if (!window.confirm(`Delete "${section.title}" from this Art Vault? This will not delete any files from Google Drive.`)) return;
    const nextSections = vault.sections.filter((candidate) => candidate.id !== sectionId);
    saveVault({ sections: normalizeVaultOrders(nextSections) });
    setActiveSectionId("all");
  };

  const addSlot = (sectionId: string) => {
    if (!requireVaultEdit()) return;
    const section = vault.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const label = window.prompt("New required art slot", "New Art Requirement");
    if (!label?.trim()) return;
    const nextSlot = createCustomVaultSlot(label.trim(), section.title, section.slots.length);
    saveVault({
      sections: vault.sections.map((candidate) =>
        candidate.id === sectionId
          ? { ...candidate, slots: normalizeVaultOrders([...candidate.slots, nextSlot]) }
          : candidate
      )
    });
  };

  const moveSlot = (ref: VaultSlotRef, direction: -1 | 1) => {
    if (!requireVaultEdit()) return;
    saveVault(moveVaultSlot(vault, ref, direction));
  };

  const deleteSlot = (ref: VaultSlotRef) => {
    if (!requireVaultEdit()) return;
    const slot = findVaultSlot(vault, ref)?.slot;
    if (!slot) return;
    if (!window.confirm(`Delete the "${slot.label}" slot? This will not delete anything from Google Drive.`)) return;
    saveVault(deleteVaultSlot(vault, ref));
  };

  const openSlotEditor = (ref: VaultSlotRef) => {
    const match = findVaultSlot(vault, ref);
    if (!match) return;
    setSlotDraft({
      sectionId: ref.sectionId,
      targetSectionId: ref.sectionId,
      slotId: ref.slotId,
      label: match.slot.label,
      requirementType: match.slot.requirementType,
      status: match.slot.status || "empty",
      notes: match.slot.notes || "",
      image: match.slot.image ? { ...match.slot.image } : null
    });
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const saveSlotDraft = () => {
    if (!slotDraft) return;
    const originalSlot = findVaultSlot(vault, { sectionId: slotDraft.sectionId, slotId: slotDraft.slotId })?.slot;
    const statusChanged = originalSlot && slotDraft.status !== originalSlot.status;
    const nextDraft = statusChanged && slotDraft.image
      ? {
          ...slotDraft,
          image: {
            ...slotDraft.image,
            lastUpdatedByName: currentUser.name,
            lastUpdatedByEmail: currentUser.email,
            lastUpdatedAt: new Date().toISOString()
          }
        }
      : slotDraft;
    saveVault(saveVaultSlotDraft(vault, nextDraft));
    if (
      originalSlot &&
      slotDraft.status !== originalSlot.status &&
      (slotDraft.status === "approved" || slotDraft.status === "needs-revision")
    ) {
      recordArtVaultActivity({
        actionType: slotDraft.status === "approved" ? "approve" : "revision",
        slotName: slotDraft.label,
        subjectName: entry.title,
        subjectType: "character",
        user: currentUser,
        fileName: nextDraft.image?.fileName || nextDraft.image?.title,
        driveFileId: nextDraft.image?.driveFileId
      });
    }
    setSlotDraft(null);
  };

  const saveSlotImageAdjustment = ({ imageUrl, imageFit }: { imageUrl: string; imageFit: ImageFitSettings }) => {
    if (!slotDraft?.image) return;
    const nextDraft: VaultSlotDraft = {
      ...slotDraft,
      image: {
        ...slotDraft.image,
        thumbnailUrl: imageUrl,
        imageFit: normalizeImageFit(imageFit),
        lastUpdatedByName: currentUser.name,
        lastUpdatedByEmail: currentUser.email,
        lastUpdatedAt: new Date().toISOString()
      }
    };
    saveVault(saveVaultSlotDraft(vault, nextDraft));
    setSlotDraft(nextDraft);
    setSlotImageAdjustOpen(false);
    setSlotImageAdjustFrame(undefined);
  };

  const uploadAdjustedSlotImageToDrive = async (file: File, folderId?: string, slotLabel?: string, assetState: "wip" | "final" = "wip") => {
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      throw new Error("Google Drive is not connected yet.");
    }
    const targetFolderId = (folderId || vaultUploadFolder.id || entry.driveFolderId).trim();
    if (!targetFolderId) {
      throw new Error("Set a Drive folder for this character before uploading art.");
    }
    const uploadedFile = await uploadImageToDrive(file, targetFolderId, {
      naming: {
        subjectName: entry.title,
        categoryName: "Art Vault",
        slotName: slotLabel || slotDraft?.label || "Vault Slot",
        sourceType: "Character",
        state: assetState
      }
    });
    return googleDriveThumbnailUrl(uploadedFile.id);
  };

  const importAdjustedSlotImageFromDrive = async () => {
    const pickedFile = await openGooglePickerForCharacter(entry.id);
    return pickedFile ? googleDriveThumbnailUrl(pickedFile.id) : "";
  };

  const assignGalleryItemToSlot = (ref: VaultSlotRef, item: CharacterArtGalleryItem) => {
    if (isStoredImageData(item.thumbnailUrl) || isTemporaryObjectUrl(item.thumbnailUrl)) {
      window.alert("That gallery item uses local image data. The Art Vault only stores Drive/link metadata.");
      return;
    }
    const match = findVaultSlot(vault, ref);
    if (!match) return;
    const vaultImage = galleryItemToVaultImage(item, match.slot.id, match.slot.requirementType, item.notes || match.slot.notes);
    saveVault(assignImageToVaultSlot(vault, ref, vaultImage));
    setSlotDraft((current) =>
      current && current.slotId === ref.slotId ? { ...current, image: vaultImage, status: "uploaded" } : current
    );
    setLinkPickerRef(null);
    setVaultMessage(`Linked "${item.title || "gallery art"}" to "${match.slot.label}".`);
  };

  const chooseVaultUploadFolder = async () => {
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      return null;
    }
    try {
      const folder = await openGoogleDriveFolderPicker("Choose Art Vault Upload Folder");
      if (!folder) return null;
      const target = { id: folder.id, link: folder.url, name: folder.name };
      setVaultUploadFolder(target);
      setVaultMessage(`Upload target set to "${folder.name}".`);
      return target;
    } catch (error) {
      setVaultMessage(error instanceof Error ? error.message : "Could not choose a Drive folder.");
      return null;
    }
  };

  const chooseSectionUploadFolder = async (sectionId: string) => {
    const folder = await chooseVaultUploadFolder();
    if (!folder) return;
    saveVault({
      sections: vault.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              driveFolderId: folder.id,
              driveFolderLink: folder.link,
              driveFolderName: folder.name
            }
          : section
      )
    });
  };

  const uploadFolderForSection = (section?: ArtVaultSection) => {
    const id = section?.driveFolderId?.trim() || vaultUploadFolder.id || entry.driveFolderId || "";
    return {
      id,
      link: section?.driveFolderLink || vaultUploadFolder.link || entry.driveFolderLink || googleDriveFolderLink(id),
      name: section?.driveFolderName || vaultUploadFolder.name || (id ? `${section?.title || entry.title} Drive Folder` : "")
    };
  };

  const beginSlotUpload = async (ref: VaultSlotRef) => {
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      return;
    }
    const match = findVaultSlot(vault, ref);
    const targetFolder = uploadFolderForSection(match?.section);
    if (!targetFolder.id.trim()) {
      const folder = await chooseVaultUploadFolder();
      if (!folder) return;
    }
    setUploadTarget(ref);
    vaultUploadInputRef.current?.click();
  };

  const uploadFileToSlot = async (file: File | undefined) => {
    const ref = uploadTarget;
    setUploadTarget(null);
    if (!file || !ref) return;
    const match = findVaultSlot(vault, ref);
    if (!match) return;
    if (!isSupportedImage(file)) {
      window.alert("Choose a JPG, JPEG, PNG, WEBP, or GIF image.");
      return;
    }

    setBusySlotId(ref.slotId);
    setVaultMessage(`Uploading "${file.name}" to Google Drive...`);
    try {
      const actionType = match.slot.image ? "replace" : "upload";
      const targetFolder = uploadFolderForSection(match.section);
      const targetFolderId = targetFolder.id.trim();
      if (!targetFolderId) throw new Error("Choose a Google Drive folder before uploading.");
      const uploadedFile = await uploadImageToDrive(file, targetFolderId, {
        naming: {
          subjectName: entry.title,
          categoryName: match.section.title,
          slotName: match.slot.label,
          sourceType: "Character",
          state: match.slot.status === "approved" ? "final" : "wip"
        }
      });
      const uploadedItem = addUploadedDriveImageToCharacter(
        entry.id,
        uploadedFile,
        match.slot.requirementType,
        match.slot.notes,
        undefined,
        targetFolder
      );
      const vaultImage = uploadedDriveFileToVaultImage(uploadedFile, match.slot.id, match.slot.requirementType, match.slot.notes, currentUser, targetFolder);
      saveVault(assignImageToVaultSlot(vault, ref, vaultImage), {
        artGallery: galleryWithItemIfMissing(artGallery, uploadedItem)
      });
      recordArtVaultActivity({
        actionType,
        slotName: match.slot.label,
        subjectName: entry.title,
        subjectType: "character",
        user: currentUser,
        fileName: uploadedFile.name,
        driveFileId: uploadedFile.id
      });
      setSlotDraft((current) =>
        current && current.slotId === ref.slotId ? { ...current, image: vaultImage, status: "uploaded" } : current
      );
      setVaultMessage(`Uploaded "${uploadedFile.name}" and assigned it to "${match.slot.label}".`);
    } catch (uploadError) {
      setVaultMessage(uploadError instanceof Error ? uploadError.message : "Upload failed. Try again.");
    } finally {
      setBusySlotId(null);
    }
  };

  const importDriveArtToSlot = async (ref: VaultSlotRef) => {
    const match = findVaultSlot(vault, ref);
    if (!match) return;

    setBusySlotId(ref.slotId);
    setVaultMessage("Opening Google Picker...");
    try {
      const actionType = match.slot.image ? "replace" : "upload";
      const pickedFile = await openGooglePickerForCharacter(entry.id);
      if (!pickedFile) {
        setVaultMessage("");
        return;
      }
      const pickedItem = handlePickedDriveFile(pickedFile, entry.id);
      const vaultImage = pickedDriveFileToVaultImage(pickedFile, match.slot.id, match.slot.requirementType, currentUser);
      saveVault(assignImageToVaultSlot(vault, ref, vaultImage), {
        artGallery: galleryWithItemIfMissing(artGallery, pickedItem)
      });
      recordArtVaultActivity({
        actionType,
        slotName: match.slot.label,
        subjectName: entry.title,
        subjectType: "character",
        user: currentUser,
        fileName: pickedFile.name,
        driveFileId: pickedFile.id
      });
      setSlotDraft((current) =>
        current && current.slotId === ref.slotId ? { ...current, image: vaultImage, status: "uploaded" } : current
      );
      setVaultMessage(`Imported "${pickedFile.name}" and assigned it to "${match.slot.label}".`);
    } catch (pickerError) {
      setVaultMessage(pickerError instanceof Error ? pickerError.message : "Google Picker could not import that image.");
    } finally {
      setBusySlotId(null);
    }
  };

  const clearSlot = (ref: VaultSlotRef) => {
    const slot = findVaultSlot(vault, ref)?.slot;
    if (!slot) return;
    if (!window.confirm(`Clear assigned art from "${slot.label}"? This will not delete the file from Google Drive or remove it from the normal gallery.`)) {
      return;
    }
    const removedImage = slot.image;
    saveVault(clearVaultSlot(vault, ref));
    recordArtVaultActivity({
      actionType: "remove",
      slotName: slot.label,
      subjectName: entry.title,
      subjectType: "character",
      user: currentUser,
      fileName: removedImage?.fileName || removedImage?.title,
      driveFileId: removedImage?.driveFileId
    });
    setSlotDraft((current) =>
      current && current.slotId === ref.slotId ? { ...current, image: null, status: "empty" } : current
    );
    setSlotMenuRef(null);
  };

  const openSlotDriveLink = (slot: ArtVaultSlot) => {
    if (!slot.image?.webViewLink) {
      window.alert("No Drive view link has been assigned to this slot yet.");
      return;
    }
    window.open(slot.image.webViewLink, "_blank", "noopener,noreferrer");
  };

  const downloadSlotImage = (slot: ArtVaultSlot) => {
    const url = slot.image?.thumbnailUrl || slot.image?.webViewLink;
    if (!url) {
      window.alert("No image has been assigned to this slot yet.");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slot.label || "character-art"}.jpg`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    setSlotMenuRef(null);
  };

  const updateSlotStatus = (ref: VaultSlotRef, status: string) => {
    const slot = findVaultSlot(vault, ref)?.slot;
    saveVault(updateVaultSlotStatus(vault, ref, status, currentUser));
    if (slot && (status === "approved" || status === "needs-revision")) {
      recordArtVaultActivity({
        actionType: status === "approved" ? "approve" : "revision",
        slotName: slot.label,
        subjectName: entry.title,
        subjectType: "character",
        user: currentUser,
        fileName: slot.image?.fileName || slot.image?.title,
        driveFileId: slot.image?.driveFileId
      });
    }
    setSlotMenuRef(null);
  };

  const renameSlot = (ref: VaultSlotRef) => {
    if (!requireVaultEdit()) return;
    const slot = findVaultSlot(vault, ref)?.slot;
    if (!slot) return;
    const label = window.prompt("Rename art slot", slot.label);
    if (!label?.trim()) return;
    saveVault(updateVaultSlotLabel(vault, ref, label.trim()));
    setSlotMenuRef(null);
  };

  const openSlotActions = (ref: VaultSlotRef) => {
    setSlotMenuRef((current) =>
      current?.sectionId === ref.sectionId && current.slotId === ref.slotId ? null : ref
    );
  };

  const triggerPrimarySlotAction = (ref: VaultSlotRef) => {
    setSlotMenuRef(null);
    openSlotEditor(ref);
  };

  return (
    <article className="character-art-vault-page">
      <header className="character-art-vault-hero">
        <button className="character-codex-action-button" onClick={onBack}>
          <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
          Back to Character
        </button>

        <div className="character-art-vault-cover">
          <GalleryThumbnail src={coverArt} title={entry.title} />
        </div>

        <div className="character-art-vault-title-block">
          <p>Character Art Vault</p>
          <h1 className="font-display">{entry.title}</h1>
          <div className="character-art-vault-meta">
            <span>{role}</span>
            <span>{category}</span>
            <span>{entry.status}</span>
          </div>
          <p className="character-art-vault-intro">
            Track required character art like a production quest board. Files stay in Google Drive; the Cook Book stores slot metadata only.
          </p>
        </div>

        <div className="character-art-vault-actions">
          {isEditing ? (
            <>
              <button className="character-codex-action-button" onClick={onCancel}>Cancel</button>
              <button className="button-frame character-codex-action-button" onClick={onSave}>
                <Icon name="Save" className="h-4 w-4" />
                Save Art Vault
              </button>
            </>
          ) : (
            !readOnly && (
              <button className="button-frame character-codex-action-button" onClick={onEdit}>
                <Icon name="Edit3" className="h-4 w-4" />
                Edit Art Vault
              </button>
            )
          )}
        </div>
      </header>

      <section className="character-art-vault-progress">
        <div>
          <p>Art Quest Progress</p>
          <strong>{stats.percent}% Complete</strong>
          <div className="character-art-vault-progress-bar">
            <span style={{ width: `${stats.percent}%` }} />
          </div>
        </div>
        <div className="character-art-vault-stat-grid">
          <VaultStat label="Required Art Slots" value={stats.total} />
          <VaultStat label="Filled Slots" value={stats.filled} />
          <VaultStat label="Missing Art" value={stats.missing} />
          <VaultStat label="Approved" value={stats.approved} />
        </div>
      </section>

      {vaultMessage && <div className="character-art-vault-message">{vaultMessage}</div>}

      <section className="character-art-vault-toolbar">
        <div className="character-art-vault-controls">
          <label className="character-art-vault-search">
            <Icon name="Search" className="h-4 w-4" />
            <input
              value={slotSearch}
              placeholder="Search art slots..."
              onChange={(event) => setSlotSearch(event.target.value)}
            />
          </label>
          <div className="character-art-vault-filter-row">
            {artVaultSlotFilters.map((filter) => (
              <button
                key={filter}
                className={slotFilter === filter ? "active" : ""}
                onClick={() => setSlotFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          {isEditing && (
            <button className="button-frame character-codex-action-button" onClick={addSection}>
            <Icon name="Plus" className="h-4 w-4" />
              Add Section
            </button>
          )}
        </div>

        <div className="character-art-vault-tabs">
          <button className={activeSectionId === "all" ? "active" : ""} onClick={() => setActiveSectionId("all")}>
            All
          </button>
          {vault.sections.map((section) => (
            <button
              key={section.id}
              className={activeSectionId === section.id ? "active" : ""}
              onClick={() => setActiveSectionId(section.id)}
            >
              {section.title}
            </button>
          ))}
        </div>
      </section>

      {isEditing && activeSection && (
        <section className="character-art-vault-section-tools">
          <div>
            <label>
              <span>Section Name</span>
              <EditInput
                value={activeSection.title}
                placeholder="Dialogue Sprites"
                onChange={(title) => updateSection(activeSection.id, { title })}
              />
            </label>
            <label>
              <span>Description</span>
              <EditTextarea
                value={activeSection.description}
                placeholder="What does this section track?"
                onChange={(description) => updateSection(activeSection.id, { description })}
              />
            </label>
          </div>
          <div>
            <button onClick={() => moveSection(activeSection.id, -1)}>Move Up</button>
            <button onClick={() => moveSection(activeSection.id, 1)}>Move Down</button>
            <button
              className="character-art-vault-icon-only"
              onClick={() => addSlot(activeSection.id)}
              title="Add slot"
              aria-label="Add slot"
            >
              <Icon name="Plus" className="h-4 w-4" />
            </button>
            <button className="danger" onClick={() => deleteSection(activeSection.id)}>Delete Section</button>
          </div>
        </section>
      )}

      <main className="character-art-vault-board">
        {filteredSections.map((section) => (
          <section key={section.id} className="character-art-vault-section">
            <header className="character-art-vault-section-header">
              <button className="character-art-vault-section-toggle" onClick={() => toggleSectionCollapse(section.id)}>
                <Icon name="ChevronDown" className={`h-4 w-4 ${collapsedSections.has(section.id) ? "-rotate-90" : ""}`} />
                <Icon name={artVaultSectionIcon(section.title)} className="h-5 w-5" />
                <div>
                  <h2 className="font-display">{section.title}</h2>
                  <span>{section.description}</span>
                </div>
                <strong>{section.slots.length} slots</strong>
              </button>
              <div className="character-art-vault-section-summary">
                <button
                  className={`character-art-vault-section-folder ${section.driveFolderId ? "connected" : ""}`}
                  onClick={() => chooseSectionUploadFolder(section.id)}
                  title={section.driveFolderId ? `Uploads in this section go to ${section.driveFolderName || section.driveFolderId}` : "Choose Drive folder for this section"}
                  aria-label={`Choose Drive folder for ${section.title}`}
                >
                  <Icon name="FolderOpen" className="h-4 w-4" />
                </button>
                <span>{sectionProgressLabel(section)}</span>
                <button onClick={() => toggleSectionCollapse(section.id)} title={collapsedSections.has(section.id) ? "Expand section" : "Collapse section"}>
                  <Icon name="ChevronDown" className={`h-4 w-4 ${collapsedSections.has(section.id) ? "-rotate-90" : ""}`} />
                </button>
                {isEditing && activeSectionId === "all" && (
                  <button
                    className="character-art-vault-icon-only"
                    onClick={() => addSlot(section.id)}
                    title="Add slot"
                    aria-label="Add slot"
                  >
                    <Icon name="Plus" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </header>
            {!collapsedSections.has(section.id) && (
              <div className="character-art-vault-slot-grid">
                {section.slots.map((slot, slotIndex) => {
                  const ref = { sectionId: section.id, slotId: slot.id };
                  const status = artVaultSlotStatus(slot);
                  const menuOpen = slotMenuRef?.sectionId === ref.sectionId && slotMenuRef.slotId === ref.slotId;
                  return (
                    <AssignableModule
                      key={slot.id}
                      as="article"
                      className={`character-art-vault-slot-card ${status} ${menuOpen ? "menu-open" : ""}`}
                      module={characterArtVaultSlotModule(entry, section, slot)}
                    >
                      <span className={`character-art-vault-status ${status}`}>{artVaultSlotStatusLabel(slot)}</span>
                      <button className="character-art-vault-kebab" onClick={() => openSlotActions(ref)} title="Slot actions">
                        ...
                      </button>
                      {menuOpen && (
                        <div className="character-art-vault-slot-menu">
                          <button onClick={() => { beginSlotUpload(ref); setSlotMenuRef(null); }} disabled={busySlotId === slot.id}>
                            Upload / Replace image
                          </button>
                          <button onClick={() => { importDriveArtToSlot(ref); setSlotMenuRef(null); }} disabled={busySlotId === slot.id}>
                            Select from Google Drive
                          </button>
                          <button onClick={() => downloadSlotImage(slot)} disabled={!slot.image}>
                            Download image
                          </button>
                          <button onClick={() => renameSlot(ref)} disabled={!isEditing}>
                            Rename slot
                          </button>
                          <button onClick={() => updateSlotStatus(ref, "approved")}>
                            Mark approved
                          </button>
                          <button onClick={() => updateSlotStatus(ref, "needs-revision")}>
                            Mark needs revision
                          </button>
                          <button onClick={() => clearSlot(ref)} disabled={!slot.image}>
                            Remove image
                          </button>
                          <button onClick={() => { openSlotEditor(ref); setSlotMenuRef(null); }}>
                            Slot settings
                          </button>
                          <button onClick={() => { moveSlot(ref, -1); setSlotMenuRef(null); }} disabled={!isEditing}>
                            Move up
                          </button>
                          <button onClick={() => { moveSlot(ref, 1); setSlotMenuRef(null); }} disabled={!isEditing}>
                            Move down
                          </button>
                          <button className="danger" onClick={() => { deleteSlot(ref); setSlotMenuRef(null); }} disabled={!isEditing}>
                            Delete slot
                          </button>
                        </div>
                      )}
                      <button className="character-art-vault-slot-main" onClick={() => triggerPrimarySlotAction(ref)}>
                        <div className="character-art-vault-slot-preview">
                          {slot.image?.thumbnailUrl ? (
                            <GalleryThumbnail src={slot.image.thumbnailUrl} title={slot.label} imageFit={slot.image.imageFit} />
                          ) : (
                            <div className="character-art-vault-slot-placeholder">
                              <span className="character-art-vault-linework" />
                              <span className="character-art-vault-plus">
                                <Icon name="Plus" className="h-8 w-8" />
                              </span>
                              <small>Open slot settings</small>
                            </div>
                          )}
                        </div>
                        <div className="character-art-vault-slot-copy">
                          <h3>{slot.label}</h3>
                          <p>{slot.requirementType}</p>
                          {slot.notes && <small>{slot.notes}</small>}
                        </div>
                      </button>
                      <footer className="character-art-vault-slot-meta">
                        <span>Slot {String(slotIndex + 1).padStart(2, "0")}</span>
                        <span>Required</span>
                        <span>{slot.image ? "1 file" : "0 files"}</span>
                      </footer>
                    </AssignableModule>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {!filteredSections.length && (
          <div className="character-art-vault-empty">
            <Icon name="Search" className="h-10 w-10" />
            <strong>No required art slots match.</strong>
            <p>Try a different search or filter.</p>
          </div>
        )}
      </main>

      <input
        ref={vaultUploadInputRef}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => {
          uploadFileToSlot(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      {slotDraft && (
        <CharacterArtVaultSlotModal
          draft={slotDraft}
          sections={vault.sections}
          isEditing={isEditing}
          onChange={(patch) => setSlotDraft((current) => current ? { ...current, ...patch } : current)}
          onSave={saveSlotDraft}
          onClose={() => setSlotDraft(null)}
          onUpload={() => beginSlotUpload({ sectionId: slotDraft.sectionId, slotId: slotDraft.slotId })}
          uploadFolder={uploadFolderForSection(vault.sections.find((section) => section.id === slotDraft.sectionId))}
          onChooseUploadFolder={() => chooseSectionUploadFolder(slotDraft.sectionId)}
          onImport={() => importDriveArtToSlot({ sectionId: slotDraft.sectionId, slotId: slotDraft.slotId })}
          onLink={() => setLinkPickerRef({ sectionId: slotDraft.sectionId, slotId: slotDraft.slotId })}
          onOpenDrive={() => slotDraft.image?.webViewLink && window.open(slotDraft.image.webViewLink, "_blank", "noopener,noreferrer")}
          onAdjustImage={(previewFrame) => {
            setSlotImageAdjustFrame(previewFrame);
            setSlotImageAdjustOpen(true);
          }}
          onDownload={() => downloadSlotImage({
            id: slotDraft.slotId,
            label: slotDraft.label,
            requirementType: slotDraft.requirementType,
            status: slotDraft.status,
            image: slotDraft.image,
            notes: slotDraft.notes,
            order: 0
          })}
          onClear={() => clearSlot({ sectionId: slotDraft.sectionId, slotId: slotDraft.slotId })}
        />
      )}

      {linkPickerRef && (
        <CharacterArtVaultLinkModal
          items={artGallery}
          onSelect={(item) => assignGalleryItemToSlot(linkPickerRef, item)}
          onClose={() => setLinkPickerRef(null)}
        />
      )}

      {slotImageAdjustOpen && slotDraft?.image && (
        <ImageAdjustModal
          slotLabel={slotDraft.label}
          imageUrl={slotDraft.image.thumbnailUrl || slotDraft.image.webViewLink}
          imageFit={slotDraft.image.imageFit}
          aspectRatio="4 / 3"
          previewFrame={slotImageAdjustFrame}
          driveFolderId={uploadFolderForSection(vault.sections.find((section) => section.id === slotDraft.sectionId)).id}
          driveFolderLink={uploadFolderForSection(vault.sections.find((section) => section.id === slotDraft.sectionId)).link}
          driveFolderName={uploadFolderForSection(vault.sections.find((section) => section.id === slotDraft.sectionId)).name}
          onSave={saveSlotImageAdjustment}
          onCancel={() => {
            setSlotImageAdjustOpen(false);
            setSlotImageAdjustFrame(undefined);
          }}
          onUploadToDrive={uploadAdjustedSlotImageToDrive}
          onImportFromDrive={importAdjustedSlotImageFromDrive}
        />
      )}
    </article>
  );
}

function VaultStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CharacterArtUploadBoard({
  categories,
  media,
  isEditing,
  onUpload,
  onRemoveImage,
  onMove,
  onAddCategory,
  onRemoveCategory
}: {
  categories: CharacterArtBoardCategory[];
  media: EntryMedia;
  isEditing: boolean;
  onUpload: (category: CharacterArtBoardCategory, file: File | undefined) => void;
  onRemoveImage: (category: CharacterArtBoardCategory) => void;
  onMove: (categoryId: string, direction: -1 | 1) => void;
  onAddCategory: () => void;
  onRemoveCategory: (category: CharacterArtBoardCategory) => void;
}) {
  const sortedCategories = [...categories].sort((left, right) => left.order - right.order);

  return (
    <section className="character-art-upload-board">
      <div className="character-art-upload-board-header">
        <div>
          <h2 className="font-display">Art Gallery / Upload Board</h2>
          <p>Large character art slots for production images, sprites, expressions, references, and concept work.</p>
        </div>
        {isEditing && (
          <button className="button-frame character-codex-action-button" onClick={onAddCategory}>
            <Icon name="Plus" className="h-4 w-4" />
            Add Art Category
          </button>
        )}
      </div>

      <div className="character-art-upload-grid">
        {sortedCategories.map((category, index) => {
          const preview = characterArtBoardPreview(category, media);
          return (
            <article key={category.id} className="character-art-upload-card">
              <label className="character-art-upload-dropzone">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={!isEditing}
                  onChange={(event) => {
                    onUpload(category, event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                {preview ? (
                  <img src={preview} alt="" />
                ) : (
                  <div>
                    <Icon name="Image" className="h-10 w-10" />
                    <span>{isEditing ? "Click to upload" : "No image yet"}</span>
                  </div>
                )}
              </label>
              <div className="character-art-upload-card-body">
                <div>
                  <span>Art Category</span>
                  <h3>{category.label}</h3>
                </div>
                {isEditing && (
                  <div className="character-art-upload-actions">
                    <button onClick={() => onMove(category.id, -1)} disabled={index === 0}>
                      Move Up
                    </button>
                    <button onClick={() => onMove(category.id, 1)} disabled={index === sortedCategories.length - 1}>
                      Move Down
                    </button>
                    <label>
                      Replace
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(event) => {
                          onUpload(category, event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <button onClick={() => onRemoveImage(category)} disabled={!preview}>
                      Remove Image
                    </button>
                    {!isDefaultCharacterArtBoardCategoryId(category.id) && (
                      <button className="danger" onClick={() => onRemoveCategory(category)}>
                        Remove Category
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CharacterArtVaultSlotModal({
  draft,
  sections,
  isEditing,
  onChange,
  onSave,
  onClose,
  onUpload,
  uploadFolder,
  onChooseUploadFolder,
  onImport,
  onLink,
  onOpenDrive,
  onAdjustImage,
  onDownload,
  onClear
}: {
  draft: VaultSlotDraft;
  sections: ArtVaultSection[];
  isEditing: boolean;
  onChange: (patch: Partial<VaultSlotDraft>) => void;
  onSave: () => void;
  onClose: () => void;
  onUpload: () => void;
  uploadFolder: { id: string; link: string; name: string };
  onChooseUploadFolder: () => void;
  onImport: () => void;
  onLink: () => void;
  onOpenDrive: () => void;
  onAdjustImage: (previewFrame?: { width: number; height: number }) => void;
  onDownload: () => void;
  onClear: () => void;
}) {
  const currentSection = sections.find((section) => section.id === draft.targetSectionId);

  return (
    <div className="character-art-vault-modal-backdrop">
      <section className="character-art-vault-slot-modal">
        <header>
          <div>
            <p>Required Art Slot</p>
            <h2 className="font-display">{draft.label || "Untitled Slot"}</h2>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close slot details">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="character-art-vault-slot-modal-body">
          <div className="character-art-vault-slot-modal-preview">
            {isEditing && draft.image?.thumbnailUrl ? (
              <button
                className="editable-image-trigger"
                onClick={(event) => onAdjustImage(frameFromElement(event.currentTarget))}
              >
                <GalleryThumbnail src={draft.image.thumbnailUrl} title={draft.label} imageFit={draft.image.imageFit} />
                <span>Adjust</span>
              </button>
            ) : (
              <GalleryThumbnail src={draft.image?.thumbnailUrl || ""} title={draft.label} imageFit={draft.image?.imageFit} />
            )}
            <span className={`character-art-vault-status ${draft.status || "empty"}`}>
              {artVaultStatusText(draft.status)}
            </span>
          </div>

          <div className="character-art-vault-slot-modal-fields">
            <label>
              <span>Slot Label</span>
              {isEditing ? (
                <EditInput value={draft.label} placeholder="Sad" onChange={(label) => onChange({ label })} />
              ) : (
                <p className="character-codex-edit-field character-codex-static-field">{draft.label || "Untitled Slot"}</p>
              )}
            </label>
            <label>
              <span>Section</span>
              <CustomSelect
                value={draft.targetSectionId}
                disabled={!isEditing}
                onChange={(value) => onChange({ targetSectionId: value })}
                options={sections.map((section) => ({ value: section.id, label: section.title }))}
              />
            </label>
            <label>
              <span>Requirement Type</span>
              {isEditing ? (
                <EditInput
                  value={draft.requirementType}
                  placeholder="Dialogue Sprite"
                  onChange={(requirementType) => onChange({ requirementType })}
                />
              ) : (
                <p className="character-codex-edit-field character-codex-static-field">{draft.requirementType || "Art Requirement"}</p>
              )}
            </label>
            <label>
              <span>Status</span>
              <CustomSelect
                value={draft.status}
                onChange={(value) => onChange({ status: value })}
                options={artVaultStatusOptions.map((status) => ({ value: status.value, label: status.label }))}
              />
            </label>
            <label className="wide">
              <span>Requirement Description</span>
              <p>{currentSection?.description || "No section description yet."}</p>
            </label>
            <label className="wide">
              <span>Notes</span>
              <EditTextarea
                value={draft.notes}
                placeholder="Pose notes, file notes, revision notes, approval notes, or production context."
                onChange={(notes) => onChange({ notes })}
                tall
              />
            </label>
            <div className="character-art-vault-assigned-metadata">
              <InfoRow label="Assigned Image" value={draft.image?.title || "No art assigned"} />
              <InfoRow label="Drive File ID" value={draft.image?.driveFileId || "No Drive file ID"} />
              <InfoRow label="Upload Folder" value={uploadFolder.name || uploadFolder.id || "Choose folder before upload"} />
              <InfoRow label="Date Added" value={formatGalleryDate(draft.image?.dateAdded || "")} />
            </div>
          </div>
        </div>

        <footer>
          <p>Clearing a slot only removes the slot assignment. It never deletes Drive files or gallery metadata.</p>
          <div>
            <button className="character-codex-action-button" onClick={onUpload}>
              <Icon name="Upload" className="h-4 w-4" />
              Upload to Drive
            </button>
            <button className="character-codex-action-button" onClick={onChooseUploadFolder}>
              <Icon name="FolderOpen" className="h-4 w-4" />
              Choose Folder
            </button>
            <button className="character-codex-action-button" onClick={onImport}>
              <Icon name="Import" className="h-4 w-4" />
              Import From Drive
            </button>
            <button className="character-codex-action-button" onClick={onLink}>
              <Icon name="Image" className="h-4 w-4" />
              Link Existing Gallery Art
            </button>
            <button className="character-codex-action-button" onClick={onOpenDrive} disabled={!draft.image?.webViewLink}>
              <Icon name="FolderOpen" className="h-4 w-4" />
              Open in Drive
            </button>
            <button className="character-codex-action-button" onClick={onDownload} disabled={!draft.image}>
              <Icon name="Download" className="h-4 w-4" />
              Download
            </button>
            <button className="character-codex-action-button character-codex-danger-button" onClick={onClear} disabled={!draft.image}>
              Clear Assigned Art
            </button>
            <button className="button-frame character-codex-action-button" onClick={onSave}>
              <Icon name="Save" className="h-4 w-4" />
              Save Slot
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function CharacterArtVaultLinkModal({
  items,
  onSelect,
  onClose
}: {
  items: CharacterArtGalleryItem[];
  onSelect: (item: CharacterArtGalleryItem) => void;
  onClose: () => void;
}) {
  return (
    <div className="character-art-vault-modal-backdrop">
      <section className="character-art-vault-link-modal">
        <header>
          <div>
            <p>Existing Character Gallery</p>
            <h2 className="font-display">Link Existing Gallery Art</h2>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close gallery picker">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>
        {items.length ? (
          <div className="character-art-vault-link-grid">
            {items.map((item) => (
              <button key={item.id} onClick={() => onSelect(item)}>
                <span className="character-art-vault-link-thumb">
                  <GalleryThumbnail src={item.thumbnailUrl} title={item.title} />
                </span>
                <strong>{item.title || "Untitled Art Reference"}</strong>
                <small>{item.category || "Reference"}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="character-art-vault-empty">
            <Icon name="Image" className="h-10 w-10" />
            <strong>No gallery art yet.</strong>
            <p>Add image links, upload to Drive, or import from Drive first.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function CharacterArtGallery({
  items,
  isEditing,
  onAdd,
  onUploadToDrive,
  onOpenDriveFolder,
  onImportFromDrive,
  onView,
  onSetFeatured,
  onEdit,
  onRemove
}: {
  items: CharacterArtGalleryItem[];
  isEditing: boolean;
  onAdd: () => void;
  onUploadToDrive: () => void;
  onOpenDriveFolder: () => void;
  onImportFromDrive: () => void;
  onView: (item: CharacterArtGalleryItem) => void;
  onSetFeatured: (id: string) => void;
  onEdit: (item: CharacterArtGalleryItem) => void;
  onRemove: (item: CharacterArtGalleryItem) => void;
}) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortMode, setSortMode] = useState("Newest first");
  const [previewItem, setPreviewItem] = useState<CharacterArtGalleryItem | null>(null);
  const visibleItems = sortArtGalleryItems(
    items.filter((item) => artGalleryFilterMatches(item, activeFilter)),
    sortMode
  );
  const hasItems = items.length > 0;

  return (
    <div className="character-art-gallery-section">
      <div className="character-art-gallery-header">
        <div>
          <h2 className="font-display">Art Gallery</h2>
          <p>Store art references, expression sheets, turnarounds, screenshots, and concept art for this character.</p>
        </div>
        <div className="character-art-gallery-actions">
          <button className="button-frame" onClick={onAdd} disabled={!isEditing} title={isEditing ? "Add image link metadata" : "Click Edit first"}>
            <Icon name="Plus" className="h-4 w-4" />
            Add Image Link
          </button>
          <button onClick={onUploadToDrive} title="Choose art to upload to Google Drive">
            <Icon name="Upload" className="h-4 w-4" />
            Upload to Drive
          </button>
          <button onClick={onImportFromDrive} title="Import art metadata from Google Drive">
            <Icon name="Import" className="h-4 w-4" />
            Import From Drive
          </button>
          <button onClick={onOpenDriveFolder} title="Open this character's Drive folder">
            <Icon name="Folder" className="h-4 w-4" />
            Open Character Drive Folder
          </button>
        </div>
      </div>

      {hasItems && (
        <div className="character-art-gallery-toolbar">
          <div className="character-art-gallery-filter-row">
            {artGalleryFilters.map((filter) => (
              <button
                key={filter}
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <label>
            <span>Sort</span>
            <CustomSelect value={sortMode} onChange={setSortMode} options={artGallerySortOptions} />
          </label>
        </div>
      )}

      {hasItems && visibleItems.length ? (
        <div className="character-art-gallery-grid">
          {visibleItems.map((item) => (
            <article key={item.id} className={`character-art-gallery-card ${item.isFeatured ? "featured" : ""}`}>
              <button className="character-art-gallery-preview character-art-gallery-preview-button" onClick={() => setPreviewItem(item)}>
                <GalleryThumbnail src={item.thumbnailUrl} title={item.title} />
                <span className={`character-art-gallery-status ${galleryStatusClass(item)}`}>
                  {galleryStatusLabel(item)}
                </span>
                {item.isFeatured && (
                  <span className="character-art-gallery-featured">
                    <Icon name="Star" className="h-3.5 w-3.5" />
                    Featured
                  </span>
                )}
              </button>
              <div className="character-art-gallery-card-body">
                <span className="character-art-gallery-category">{item.category || "Reference"}</span>
                <h3>{item.title || "Untitled Art Reference"}</h3>
                <p>{formatGalleryDate(item.dateAdded)}</p>
                {item.uploadStatus === "mock-local-preview" && (
                  <em className="character-art-gallery-warning">Local preview only. Not uploaded to Drive yet.</em>
                )}
                {item.notes && <small>{item.notes}</small>}
              </div>
              <div className="character-art-gallery-card-actions">
                <button onClick={() => onView(item)}>View</button>
                <button onClick={() => onSetFeatured(item.id)} disabled={!isEditing || item.isFeatured}>
                  Set Featured
                </button>
                <button onClick={() => onEdit(item)} disabled={!isEditing}>Edit</button>
                <button className="danger" onClick={() => onRemove(item)} disabled={!isEditing}>
                  Remove From Character
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : hasItems ? (
        <div className="character-art-gallery-empty">
          <Icon name="Search" className="h-10 w-10" />
          <strong>No art matches this filter.</strong>
          <p>Try All, another category, or a different sort order.</p>
        </div>
      ) : (
        <div className="character-art-gallery-empty">
          <Icon name="Image" className="h-10 w-10" />
          <strong>Nothing in this character's gallery yet.</strong>
          <p>Add Drive links, upload new art, or import existing image files from Google Drive.</p>
          <div className="character-art-gallery-empty-actions">
            <button className="button-frame" onClick={onAdd} disabled={!isEditing} title={isEditing ? "Add image link metadata" : "Click Edit first"}>
              <Icon name="Plus" className="h-4 w-4" />
              Add Image Link
            </button>
            <button onClick={onUploadToDrive}>
              <Icon name="Upload" className="h-4 w-4" />
              Upload to Drive
            </button>
            <button onClick={onImportFromDrive}>
              <Icon name="Import" className="h-4 w-4" />
              Import From Drive
            </button>
          </div>
        </div>
      )}

      {previewItem && (
        <CharacterArtPreviewModal
          item={previewItem}
          isEditing={isEditing}
          onClose={() => setPreviewItem(null)}
          onViewInDrive={() => onView(previewItem)}
          onSetFeatured={() => {
            onSetFeatured(previewItem.id);
            setPreviewItem({ ...previewItem, isFeatured: true });
          }}
        />
      )}
    </div>
  );
}

function GalleryThumbnail({ src, title, imageFit }: { src: string; title: string; imageFit?: ImageFitSettings }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (!src || failed) return <GalleryFallback />;
  return <img src={src} alt={title || ""} style={imageFitToStyle(imageFit)} onError={() => setFailed(true)} />;
}

function GalleryFallback() {
  return (
    <div>
      <Icon name="Image" className="h-8 w-8" />
      <span>No Preview Yet</span>
    </div>
  );
}

function CharacterArtPreviewModal({
  item,
  isEditing,
  onClose,
  onViewInDrive,
  onSetFeatured
}: {
  item: CharacterArtGalleryItem;
  isEditing: boolean;
  onClose: () => void;
  onViewInDrive: () => void;
  onSetFeatured: () => void;
}) {
  return (
    <div className="character-art-preview-modal-backdrop">
      <section className="character-art-preview-modal">
        <header>
          <div>
            <span className={`character-art-gallery-status ${galleryStatusClass(item)}`}>{galleryStatusLabel(item)}</span>
            <h2 className="font-display">{item.title || "Untitled Art Reference"}</h2>
            <p>{item.category || "Reference"}</p>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close art preview">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>
        <div className="character-art-preview-body">
          <div className="character-art-preview-image">
            <GalleryThumbnail src={item.thumbnailUrl} title={item.title} />
          </div>
          <aside className="character-art-preview-info">
            <InfoRow label="Category" value={item.category || "Reference"} />
            <InfoRow label="Drive File ID" value={item.driveFileId || "No Drive file ID"} />
            <div className="character-art-preview-notes">
              <span>Notes</span>
              <p>{item.notes || "No notes yet."}</p>
            </div>
          </aside>
        </div>
        <footer>
          <button className="character-codex-action-button" onClick={onViewInDrive} disabled={!item.webViewLink}>
            <Icon name="FolderOpen" className="h-4 w-4" />
            View in Drive
          </button>
          <button className="button-frame character-codex-action-button" onClick={onSetFeatured} disabled={!isEditing || item.isFeatured}>
            <Icon name="Star" className="h-4 w-4" />
            Set Featured
          </button>
          <button className="character-codex-action-button" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
}

function CharacterArtGalleryModal({
  draft,
  onChange,
  onSave,
  onClose
}: {
  draft: CharacterArtGalleryItem;
  onChange: (patch: Partial<CharacterArtGalleryItem>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const applyDriveFileLink = (value: string) => {
    const driveFileId = extractGoogleDriveFileId(value);
    if (!driveFileId) {
      onChange({ thumbnailUrl: value });
      return;
    }
    onChange({
      driveFileId,
      webViewLink: googleDriveWebViewLink(driveFileId),
      thumbnailUrl: googleDriveThumbnailUrl(driveFileId)
    });
  };

  const applyDriveViewLink = (value: string) => {
    const driveFileId = extractGoogleDriveFileId(value);
    if (!driveFileId) {
      onChange({ webViewLink: value });
      return;
    }
    onChange({
      driveFileId,
      webViewLink: googleDriveWebViewLink(driveFileId),
      thumbnailUrl: googleDriveThumbnailUrl(driveFileId)
    });
  };

  return (
    <div className="character-art-gallery-modal-backdrop">
      <section className="character-art-gallery-modal">
        <header>
          <div>
            <p>Character Art Metadata</p>
            <h2 className="font-display">Add Image Link</h2>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close art gallery form">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>
        <p className="character-art-gallery-helper-note">
          Paste a Google Drive image link or a normal image URL. Google Drive links will automatically generate a preview when possible.
        </p>

        <div className="character-art-gallery-form">
          <label>
            <span>Image Title</span>
            <EditInput value={draft.title} placeholder="Gwen Expression Sheet" onChange={(value) => onChange({ title: value })} />
          </label>
          <label>
            <span>Image Category</span>
            <EditInput value={draft.category} placeholder="Expressions, Turnaround, Screenshot, Concept Art" onChange={(value) => onChange({ category: value })} />
          </label>
          <label>
            <span>Thumbnail / Image</span>
            <DriveImageSourceControls
              value={draft.thumbnailUrl}
              label={draft.title || "Gallery image"}
              title="Choose Character Gallery Image"
              onChange={applyDriveFileLink}
              onPick={(imageUrl, file) => onChange({
                  thumbnailUrl: imageUrl,
                  driveFileId: file.id,
                  webViewLink: file.url || googleDriveWebViewLink(file.id),
                  title: draft.title || file.name || "Imported Drive Image"
              })}
              onUpload={(imageUrl, file) => onChange({
                thumbnailUrl: imageUrl,
                driveFileId: file.id,
                webViewLink: file.webViewLink || googleDriveWebViewLink(file.id),
                title: draft.title || file.name || "Uploaded Drive Image"
              })}
            />
          </label>
          <label>
            <span>Google Drive File ID</span>
            <EditInput value={draft.driveFileId} placeholder="Drive file ID" onChange={(value) => onChange({ driveFileId: value })} />
          </label>
          <label>
            <span>Google Drive View Link</span>
            <EditInput value={draft.webViewLink} placeholder="https://drive.google.com/..." onChange={applyDriveViewLink} />
          </label>
          <label className="character-art-gallery-notes">
            <span>Notes</span>
            <textarea
              className="character-codex-edit-field"
              value={draft.notes}
              placeholder="What is this reference for? Pose notes, expression notes, version notes, etc."
              onChange={(event) => onChange({ notes: event.target.value })}
            />
          </label>
        </div>

        <footer>
          <p>This stores metadata only. It will not upload or delete files from Google Drive.</p>
          <div>
            <button className="character-codex-action-button" onClick={onClose}>Cancel</button>
            <button className="button-frame character-codex-action-button" onClick={onSave}>
              <Icon name="Save" className="h-4 w-4" />
              Save Art Metadata
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function CharacterMiniAssistant({
  changeRequest,
  prompt,
  importText,
  message,
  onChangeRequestChange,
  onBuildPrompt,
  onCopyPrompt,
  onImportTextChange,
  onApplyImport,
  onClose
}: {
  changeRequest: string;
  prompt: string;
  importText: string;
  message: string;
  onChangeRequestChange: (value: string) => void;
  onBuildPrompt: () => void;
  onCopyPrompt: () => void;
  onImportTextChange: (value: string) => void;
  onApplyImport: () => void;
  onClose: () => void;
}) {
  return (
    <div className="character-mini-assistant-backdrop">
      <section className="character-mini-assistant">
        <div className="character-mini-assistant-header">
          <div>
            <p>Character Mini Assistant</p>
            <h3>
              <Icon name="WandSparkles" className="h-5 w-5" />
              Fill This Character With ChatGPT
            </h3>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close mini assistant">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <label className="character-mini-assistant-change-box">
          <span>Write the changes you want first</span>
          <textarea
            className="character-codex-edit-field character-mini-assistant-request"
            value={changeRequest}
            placeholder="Example: Make Gwen's story focus more on protecting villages, mention her ale struggle lightly, expand her bond with Tohm, and keep the public description spoiler-safe."
            onChange={(event) => onChangeRequestChange(event.target.value)}
          />
        </label>

        <div className="character-mini-assistant-actions">
          <button className="character-codex-action-button" onClick={onBuildPrompt}>
            <Icon name="Clipboard" className="h-4 w-4" />
            Build Prompt From Changes
          </button>
          <button className="button-frame character-codex-action-button" onClick={onCopyPrompt}>
            <Icon name="Clipboard" className="h-4 w-4" />
            Copy Prompt
          </button>
        </div>

        <div className="character-mini-assistant-grid">
          <label>
            <span>Prompt to paste into ChatGPT</span>
            <textarea
              className="character-codex-edit-field character-mini-assistant-textarea"
              value={prompt}
              placeholder="Write the changes you want, then click Build Prompt From Changes."
              readOnly
            />
          </label>
          <label>
            <span>Return Character JSON</span>
            <textarea
              className="character-codex-edit-field character-mini-assistant-textarea"
              value={importText}
              placeholder='Paste ChatGPT&apos;s returned JSON object here, then click "Apply to Character".'
              onChange={(event) => onImportTextChange(event.target.value)}
            />
          </label>
        </div>

        <div className="character-mini-assistant-footer">
          <p>{message || "This only updates the currently open character. Review the page and press Save when you like it."}</p>
          <button className="button-frame character-codex-action-button" onClick={onApplyImport}>
            <Icon name="Import" className="h-4 w-4" />
            Apply to Character
          </button>
        </div>
      </section>
    </div>
  );
}

function buildCharacterAssistantPrompt(entry: LoreEntry, character: ReturnType<typeof buildCharacterView>, changeRequest: string) {
  return `You are helping fill out one character page for the local lore bible app "The Tavern Cook Book" for the game "Tales of the Tavern".

Task:
Update this specific character page using my requested changes. Keep the character consistent with the existing data. Return ONLY valid JSON. Do not wrap it in markdown unless you absolutely have to.

My requested changes:
${changeRequest.trim() || "Fill out missing sections, improve clarity, and keep the character consistent with existing lore."}

Important:
- Do not invent huge unrelated canon.
- Use concise, game-codex style text.
- Keep spoilers in the story/internal fields, not in publicDescription.
- relationships and worldConnections should be short, useful, and easy to scan.
- Do not include image data or code. Return character JSON only.

What goes where:
- descriptor: one short line under the character name, like "Main Character - Human Fighter - Osul".
- tags: only important scan tags, usually 3-6 words.
- essentials: compact facts for the left sidebar. Keep each value short.
- atAGlance: a brief quick-read summary, 1 short paragraph. This is not the whole story.
- publicDescription: spoiler-safe marketing/public text. Avoid secret reveals here.
- internalLore: private lore, contradictions, spoilers, writer notes, and hidden truth.
- personality: brief quick-read personality description.
- coreFunction: brief explanation of why this character matters to the story/gameplay.
- relationships: small cards. Each needs name, relationship type, and a very short note.
- worldConnections: small cards. Use type/title/note for important locations, factions, items, quests, arcs, or systems.
- story.background: where they come from, early life, culture, family, training.
- story.incitingIncident: what pulls them into the main plot.
- story.mainStoryRole: what they do during the story and why they matter.
- story.characterArc: how they change emotionally, morally, or personally.
- story.secretsInternalLore: hidden/private/spoiler character lore.
- story.relationshipsInStory: how relationships affect the plot.
- story.futureUnresolvedThreads: loose ends, mysteries, future plans, sequel hooks.
- fullStory: the big readable story scroll. Put the complete in-depth character story here, including all major details, emotional beats, secrets, relationships, and future threads. This can be much longer than the quick cards.
- notes: production/art/gameplay/marketing/unresolved notes only, not the main reader text.

Return this JSON shape:
{
  "name": "Character Name",
  "descriptor": "One line descriptor",
  "tags": ["Tag", "Tag"],
  "status": "Canon",
  "spoilerLevel": "Minor Spoiler",
  "revealLevel": "Known",
  "essentials": {
    "age": "",
    "origin": "",
    "role": "",
    "recruitedBy": "",
    "favoriteFood": "",
    "status": ""
  },
  "atAGlance": "",
  "publicDescription": "",
  "internalLore": "",
  "personality": "",
  "coreFunction": "",
  "relationships": [
    { "name": "", "type": "", "note": "" }
  ],
  "worldConnections": [
    { "type": "Location", "title": "", "note": "" }
  ],
  "story": {
    "background": "",
    "incitingIncident": "",
    "mainStoryRole": "",
    "characterArc": "",
    "secretsInternalLore": "",
    "relationshipsInStory": "",
    "futureUnresolvedThreads": ""
  },
  "fullStory": "",
  "notes": {
    "art": "",
    "gameplay": "",
    "production": "",
    "marketing": "",
    "unresolved": ""
  }
}

Current character data:
${JSON.stringify(characterAssistantSnapshot(entry, character), null, 2)}
`;
}

function characterAssistantSnapshot(entry: LoreEntry, character: ReturnType<typeof buildCharacterView>) {
  return {
    id: entry.id,
    name: entry.title,
    category: entry.category,
    type: entry.type,
    status: entry.status,
    spoilerLevel: entry.spoilerLevel,
    descriptor: character.descriptor,
    tags: entry.tags,
    essentials: Object.fromEntries(character.essentials.map((item) => [camelKey(item.label), item.value])),
    atAGlance: character.atAGlance,
    publicDescription: entry.publicDescription,
    internalLore: entry.internalLore,
    personality: character.personality,
    coreFunction: character.coreFunction,
    relationships: character.relationships,
    worldConnections: character.worldConnections,
    story: Object.fromEntries(storySections.map((section) => [section.key, storyValue(entry, character, section.key)])),
    fullStory: fullStoryText(entry, character),
    notes: entry.notes,
    existingConnections: entry.connections
  };
}

function parseCharacterAssistantPayload(value: string): CharacterAssistantPayload {
  const clean = extractJsonText(value);
  const parsed = JSON.parse(clean) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Paste a single character JSON object.");
  }

  const container = parsed as Record<string, unknown>;
  const payload = (container.character || container.characterPage || container.data || parsed) as CharacterAssistantPayload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("That JSON does not look like a character update.");
  }
  return payload;
}

function extractJsonText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Paste ChatGPT's returned character JSON first.");

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] || trimmed).trim();
  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Could not find a JSON object in that text.");
  }
  return source.slice(firstBrace, lastBrace + 1);
}

function characterPayloadToEntryPatch(entry: LoreEntry, payload: CharacterAssistantPayload): Partial<LoreEntry> {
  const fields = { ...entry.fields };
  const connections: EntryConnections = {
    characters: [...entry.connections.characters],
    locations: [...entry.connections.locations],
    recipes: [...entry.connections.recipes],
    quests: [...entry.connections.quests],
    items: [...entry.connections.items],
    factions: [...entry.connections.factions],
    secrets: [...entry.connections.secrets],
    gameplaySystems: [...entry.connections.gameplaySystems],
    enemies: [...entry.connections.enemies],
    timelineEvents: [...entry.connections.timelineEvents]
  };

  const setField = (key: string, value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (trimmed) fields[key] = trimmed;
    else delete fields[key];
  };
  const addConnection = (key: keyof EntryConnections, value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return;
    connections[key] = uniqueList([...connections[key], value.trim()]);
  };

  setField("Descriptor", payload.descriptor);
  setField("Reveal Level", payload.revealLevel);
  setField("At a Glance", payload.atAGlance || payload.summary);
  setField("Personality", payload.personality);
  setField("Core Function", payload.coreFunction);
  setField("Full Story", payload.fullStory);

  if (payload.essentials) {
    setField("Age", payload.essentials.age);
    setField("Gameplay Role", payload.essentials.role);
    setField("Recruited By", payload.essentials.recruitedBy);
    setField("Favorite Food", payload.essentials.favoriteFood);
    setField("Character Status", payload.essentials.status);
    addConnection("locations", payload.essentials.origin);
    addConnection("characters", payload.essentials.recruitedBy);
  }

  storySections.forEach((section) => {
    setField(section.field, payload.story?.[section.key]);
  });

  if (Array.isArray(payload.relationships)) payload.relationships.forEach((relationship) => {
    if (!relationship?.name) return;
    addConnection("characters", relationship.name);
    setField(`Relationship Type: ${relationship.name}`, relationship.type);
    setField(`Relationship Note: ${relationship.name}`, relationship.note);
  });

  if (Array.isArray(payload.worldConnections)) payload.worldConnections.forEach((connection) => {
    if (!connection?.title) return;
    addConnection(connectionTypeToConnectionKey(connection.type), connection.title);
    setField(`World Note: ${connection.title}`, connection.note);
  });

  const nextNotes = {
    ...entry.notes,
    ...(payload.notes || {})
  };

  return {
    title: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : entry.title,
    status: typeof payload.status === "string" && payload.status.trim() ? payload.status.trim() : entry.status,
    spoilerLevel: typeof payload.spoilerLevel === "string" && payload.spoilerLevel.trim() ? payload.spoilerLevel.trim() : entry.spoilerLevel,
    tags: Array.isArray(payload.tags) ? uniqueList(payload.tags.map(String).filter(Boolean)) : entry.tags,
    summary: textOrFallback(payload.atAGlance || payload.summary, entry.summary),
    publicDescription: textOrFallback(payload.publicDescription, entry.publicDescription),
    internalLore: textOrFallback(payload.internalLore, entry.internalLore),
    fields,
    connections: normalizeConnections(connections),
    notes: nextNotes
  };
}

function connectionTypeToConnectionKey(type: string): keyof EntryConnections {
  const normalized = type.toLowerCase();
  if (/location|place|region|world/.test(normalized)) return "locations";
  if (/faction|group|culture|guild|kingdom/.test(normalized)) return "factions";
  if (/quest/.test(normalized)) return "quests";
  if (/recipe|meal|food/.test(normalized)) return "recipes";
  if (/secret/.test(normalized)) return "secrets";
  if (/system|gameplay/.test(normalized)) return "gameplaySystems";
  if (/enemy|creature|boss/.test(normalized)) return "enemies";
  if (/timeline|event/.test(normalized)) return "timelineEvents";
  return "items";
}

function normalizeConnections(connections: EntryConnections): EntryConnections {
  return {
    characters: uniqueList(connections.characters),
    locations: uniqueList(connections.locations),
    recipes: uniqueList(connections.recipes),
    quests: uniqueList(connections.quests),
    items: uniqueList(connections.items),
    factions: uniqueList(connections.factions),
    secrets: uniqueList(connections.secrets),
    gameplaySystems: uniqueList(connections.gameplaySystems),
    enemies: uniqueList(connections.enemies),
    timelineEvents: uniqueList(connections.timelineEvents)
  };
}

function uniqueList(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function textOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function camelKey(value: string) {
  return value
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function buildCharacterView(entry: LoreEntry, characterEntries: LoreEntry[] = []) {
  const isGwen = entry.title.trim().toLowerCase() === "gwen";
  const origin = fieldText(entry, ["Origin"]) || entry.connections.locations[0] || firstMatchingTag(entry.tags, ["Osul", "Whisker Woods", "Tabby Island"]);
  const role = fieldText(entry, ["Role", "Gameplay Role"]) || (isGwen ? "Fighter - Cook - Protector" : entry.type);
  const descriptor =
    fieldText(entry, ["Descriptor"]) ||
    (isGwen ? "Main Character - Human Fighter - Osul" : compactJoin([entry.type || "Character", firstSpecies(entry), origin], " - "));
  const favoriteFood = fieldText(entry, ["Favorite Food"]) || (isGwen || hasTag(entry, "potatoes") ? "Potatoes" : "");
  const mentor = fieldText(entry, ["Recruited By", "Mentor"]) || (isGwen ? "Tohm Kyatt" : entry.connections.characters[0] || "");

  return {
    portrait: entry.media.characterPortrait || entry.media.dialogueSpriteImage || entry.media.iconImage || entry.media.mainImage,
    descriptor,
    tags: importantTags(entry, isGwen),
    essentials: [
      {
        label: "Age",
        value: fieldText(entry, ["Age"]) || (isGwen ? "23" : "")
      },
      {
        label: "Origin",
        value: origin
      },
      {
        label: "Role",
        value: role
      },
      {
        label: "Recruited By",
        value: mentor
      },
      {
        label: "Favorite Food",
        value: favoriteFood
      },
      {
        label: "Status",
        value: fieldText(entry, ["Character Status"]) || (isGwen ? "Active" : entry.status)
      }
    ],
    atAGlance:
      fieldText(entry, ["At a Glance"]) ||
      entry.summary ||
      (isGwen
        ? "Gwen is a hardworking young fighter from Osul recruited by Tohm Kyatt. She protects villages, gathers ingredients, and cooks magical meals while recovering lost recipe pages to stop the dangers spreading through Whisker Woods."
        : entry.publicDescription || "Add a short character overview."),
    personality:
      fieldText(entry, ["Personality"]) ||
      (isGwen
        ? "Direct, practical, and slightly sarcastic. Brave and protective, easily annoyed by nonsense, but kind and strong beneath the tough exterior."
        : "Add a short personality description."),
    coreFunction:
      fieldText(entry, ["Core Function"]) ||
      fieldText(entry, ["Gameplay Role"]) ||
      entry.notes.gameplay ||
      (isGwen
        ? "Player character. Gathers ingredients, fights enemies, cooks meals, equips meals for combat, completes quests, and recovers recipe pages before the corruption spreads further."
        : "Add why this character matters to the story or gameplay."),
    relationships: buildRelationships(entry, isGwen, characterEntries),
    worldConnections: buildWorldConnections(entry, isGwen),
    revealLevel: fieldText(entry, ["Reveal Level"]) || revealLevelFor(entry)
  };
}

function CodexPanel({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="character-codex-panel">
      <h3>
        <Icon name={icon} className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function CodexCard({
  title,
  icon,
  wide = false,
  assignmentModule,
  children
}: {
  title: string;
  icon: string;
  wide?: boolean;
  assignmentModule?: AssignableModuleInfo;
  children: ReactNode;
}) {
  const content = (
    <>
      <h3>
        <Icon name={icon} className="h-4 w-4" />
        {title}
      </h3>
      <div className="character-codex-card-body">
        {typeof children === "string" ? <RichLoreText text={children} /> : children}
      </div>
    </>
  );
  const className = `character-codex-card ${wide ? "wide" : ""}`;

  if (assignmentModule) {
    return (
      <AssignableModule as="section" className={className} module={assignmentModule}>
        {content}
      </AssignableModule>
    );
  }

  return <section className={className}>{content}</section>;
}

function characterModule(entry: LoreEntry, sectionKey: string, moduleTitle: string): AssignableModuleInfo {
  return {
    moduleId: `${entry.id}-${sectionKey}`,
    moduleTitle,
    moduleType: "character-section",
    entryId: entry.id,
    entryTitle: entry.title,
    entryCategory: `${entry.category} / ${entry.type}`,
    targetRoute: `character:${entry.id}:${sectionKey}`
  };
}

function characterArtVaultSlotModule(entry: LoreEntry, section: ArtVaultSection, slot: ArtVaultSlot): AssignableModuleInfo {
  return {
    moduleId: `${entry.id}-art-vault-${slot.id}`,
    moduleTitle: `${entry.title}: ${slot.label}`,
    moduleType: "character-art-vault-slot",
    entryId: entry.id,
    entryTitle: entry.title,
    entryCategory: `Character Art Vault / ${section.title}`,
    targetRoute: `character:${entry.id}:art-vault:${section.id}:${slot.id}`
  };
}

function CharacterArtVaultGalleryModal({
  characterName,
  vault,
  focusSlot,
  isEditing,
  onClose,
  onAdjustImage
}: {
  characterName: string;
  vault?: CharacterArtVault;
  focusSlot: Exclude<ImageSlot, "galleryImages">;
  isEditing: boolean;
  onClose: () => void;
  onAdjustImage: (section: ArtVaultSection, slot: ArtVaultSlot, previewFrame?: { width: number; height: number }) => void;
}) {
  const normalizedVault = useMemo(() => normalizeArtVault(vault), [vault]);
  const filledSections = useMemo(
    () =>
      normalizedVault.sections
        .map((section) => ({
          ...section,
          slots: section.slots.filter((slot) => Boolean(slot.image?.thumbnailUrl || slot.image?.webViewLink))
        }))
        .filter((section) => section.slots.length),
    [normalizedVault]
  );
  const preferredSectionId = artVaultGallerySectionIdForSlot(filledSections, focusSlot);
  const [activeSectionId, setActiveSectionId] = useState(preferredSectionId);

  useEffect(() => {
    setActiveSectionId(preferredSectionId);
  }, [preferredSectionId]);

  const totalImages = filledSections.reduce((total, section) => total + section.slots.length, 0);
  const visibleSections = activeSectionId === "all"
    ? filledSections
    : filledSections.filter((section) => section.id === activeSectionId);
  const focusLabel = focusSlot === "dialogueSpriteImage" ? "Dialogue Sprite Art" : "In-Game Sprite Art";

  return (
    <div className="character-vault-gallery-backdrop" onMouseDown={onClose}>
      <section
        className="character-vault-gallery-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${characterName} ${focusLabel} gallery`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="character-vault-gallery-header">
          <div>
            <p>{characterName}</p>
            <h2 className="font-display">{focusLabel}</h2>
            <span>{totalImages} Art Vault image{totalImages === 1 ? "" : "s"} available</span>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close gallery">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <nav className="character-vault-gallery-tabs" aria-label="Art Vault sections">
          <button className={activeSectionId === "all" ? "active" : ""} onClick={() => setActiveSectionId("all")}>
            All
            <span>{totalImages}</span>
          </button>
          {filledSections.map((section) => (
            <button
              key={section.id}
              className={activeSectionId === section.id ? "active" : ""}
              onClick={() => setActiveSectionId(section.id)}
            >
              {section.title}
              <span>{section.slots.length}</span>
            </button>
          ))}
        </nav>

        <div className="character-vault-gallery-body">
          {visibleSections.length ? (
            visibleSections.map((section) => (
              <section key={section.id} className="character-vault-gallery-section">
                <header>
                  <div>
                    <p>{section.title}</p>
                    <h3 className="font-display">{section.description || "Art references from this vault section."}</h3>
                  </div>
                  <span>{section.slots.length} image{section.slots.length === 1 ? "" : "s"}</span>
                </header>
                <div className="character-vault-gallery-grid">
                  {section.slots.map((slot) => {
                    const image = slot.image;
                    const imageUrl = image?.thumbnailUrl || image?.webViewLink || "";
                    const title = image?.title || `${slot.label} ${slot.requirementType}`.trim();
                    return (
                      <article key={slot.id} className="character-vault-gallery-card">
                        <div className="character-vault-gallery-image">
                          {isEditing ? (
                            <button
                              className="editable-image-trigger"
                              onClick={(event) => onAdjustImage(section, slot, frameFromElement(event.currentTarget))}
                            >
                              <GalleryThumbnail src={imageUrl} title={title} imageFit={image?.imageFit} />
                              <span>Adjust</span>
                            </button>
                          ) : (
                            <GalleryThumbnail src={imageUrl} title={title} imageFit={image?.imageFit} />
                          )}
                        </div>
                        <div className="character-vault-gallery-card-copy">
                          <span>{section.title}</span>
                          <h4>{title}</h4>
                          <p>{slot.label} - {slot.requirementType}</p>
                          <small>{artVaultStatusText(slot.status)} • {formatGalleryDate(image?.dateAdded || "")}</small>
                          {image?.notes && <em>{image.notes}</em>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <div className="character-vault-gallery-empty">
              <Icon name="Images" className="h-10 w-10" />
              <strong>No Art Vault images found here yet.</strong>
              <p>Upload art into this character's Art Vault slots, then it will appear in this gallery.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CharacterSpriteShowcase({
  media,
  isEditing,
  onUpload,
  onSetImage,
  onRemove,
  getImageFit,
  onAdjustImage,
  onOpenGallery
}: {
  media: EntryMedia;
  isEditing: boolean;
  onUpload: (slot: ImageSlot, file: File | undefined) => void;
  onSetImage: (slot: Exclude<ImageSlot, "galleryImages">, imageUrl: string) => void;
  onRemove: (slot: ImageSlot, galleryIndex?: number) => void;
  getImageFit: (slot: Exclude<ImageSlot, "galleryImages">) => ImageFitSettings;
  onAdjustImage: (slot: Exclude<ImageSlot, "galleryImages">, label: string, previewFrame?: { width: number; height: number }) => void;
  onOpenGallery: (slot: Exclude<ImageSlot, "galleryImages">) => void;
}) {
  const sprites: Array<{ label: string; helper: string; icon: string; slot: Exclude<ImageSlot, "galleryImages">; src: string }> = [
    {
      label: "Dialogue Sprite",
      helper: "Portrait used for conversations and expression-focused scenes.",
      icon: "BookOpen",
      slot: "dialogueSpriteImage",
      src: media.dialogueSpriteImage || ""
    },
    {
      label: "In-Game Sprite",
      helper: "Small gameplay sprite or in-world character reference.",
      icon: "Gamepad2",
      slot: "ingameSpriteImage",
      src: media.ingameSpriteImage || ""
    }
  ];

  return (
    <section className="character-sprite-showcase">
      <div className="character-sprite-showcase-header">
        <div>
          <p>Character visual quick slots</p>
          <h2 className="font-display">Dialogue & In-Game Sprites</h2>
        </div>
      </div>
      <div className="character-sprite-grid">
        {sprites.map((sprite) => (
          <article
            key={sprite.slot}
            className="character-sprite-card clickable"
            role="button"
            tabIndex={0}
            title={`Open ${sprite.label} gallery from the Art Vault`}
            onClick={(event) => {
              if (isInteractiveElement(event.target)) return;
              onOpenGallery(sprite.slot);
            }}
            onKeyDown={(event) => {
              if (isInteractiveElement(event.target)) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenGallery(sprite.slot);
              }
            }}
          >
            <div className="character-sprite-preview">
              {sprite.src ? (
                isEditing ? (
                  <button
                    className="editable-image-trigger character-sprite-adjust-trigger"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAdjustImage(sprite.slot, sprite.label, frameFromElement(event.currentTarget));
                    }}
                  >
                    <img src={sprite.src} alt="" style={imageFitToStyle(getImageFit(sprite.slot))} />
                    <span>Adjust</span>
                  </button>
                ) : (
                  <img src={sprite.src} alt="" style={imageFitToStyle(getImageFit(sprite.slot))} />
                )
              ) : (
                <div className="character-sprite-placeholder">
                  <Icon name={sprite.icon} className="h-9 w-9" />
                  <span>No sprite yet</span>
                </div>
              )}
              {isEditing && (
                <div className="character-sprite-upload-source" onClick={(event) => event.stopPropagation()}>
                  <DriveImageSourceControls
                    compact
                    value={sprite.src}
                    label={sprite.label}
                    title={`Choose ${sprite.label}`}
                    showManualFallback={false}
                    onChange={(imageUrl) => onSetImage(sprite.slot, imageUrl)}
                  />
                </div>
              )}
            </div>
            <div className="character-sprite-copy">
              <span>
                <Icon name={sprite.icon} className="h-4 w-4" />
                {sprite.label}
              </span>
              <p>{sprite.helper}</p>
              {isEditing && sprite.src && (
                <button
                  className="character-sprite-remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(sprite.slot);
                  }}
                >
                  <Icon name="Trash2" className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EssentialRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="character-codex-essential-row">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

function RevealMeter({ level }: { level: string }) {
  const levels = ["Public", "Known", "Minor Spoiler", "Major Spoiler", "Secret/Internal"];
  const index = Math.max(0, levels.findIndex((item) => item.toLowerCase() === level.toLowerCase()));
  const activeIndex = index === -1 ? 1 : index;

  return (
    <div className="character-codex-reveal">
      <div className="character-codex-reveal-dots">
        {levels.map((item, dotIndex) => (
          <span key={item} className={dotIndex <= activeIndex ? "filled" : ""} />
        ))}
      </div>
      <strong>{level}</strong>
      <p>{revealCopy(level)}</p>
    </div>
  );
}

function PortraitPlaceholder() {
  return (
    <div className="character-codex-portrait-placeholder">
      <Icon name="UserRound" className="h-16 w-16" />
    </div>
  );
}

function CharacterButtonPreview({
  label,
  src,
  imageFit,
  onAdjust
}: {
  label: string;
  src: string;
  imageFit: ImageFitSettings;
  onAdjust: (next: { imageUrl: string; imageFit: ImageFitSettings }) => void;
}) {
  return (
    <figure className="character-button-preview">
      <span>{label}</span>
      {src ? (
        <AdjustableImage
          src={src}
          label={`${label} Character Button Image`}
          imageFit={imageFit}
          aspectRatio="1 / 1"
          canAdjust
          onSave={onAdjust}
        />
      ) : (
        <div>
          <Icon name="UserRound" className="h-8 w-8" />
        </div>
      )}
    </figure>
  );
}

function frameFromElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height)
  };
}

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("button,label,input,a,select,textarea"));
}

function artVaultGallerySectionIdForSlot(sections: ArtVaultSection[], slot: Exclude<ImageSlot, "galleryImages">) {
  const dialogueSection =
    sections.find((section) => section.id === "dialogue-sprites") ||
    sections.find((section) => /dialogue|expression/i.test(section.title));
  const gameplaySection =
    sections.find((section) => section.id === "combat-gameplay-sprites") ||
    sections.find((section) => /combat|gameplay|in-game|sprite/i.test(section.title));

  if (slot === "dialogueSpriteImage" && dialogueSection) return dialogueSection.id;
  if (slot === "ingameSpriteImage" && gameplaySection) return gameplaySection.id;
  return sections[0]?.id || "all";
}

function EditInput({
  value,
  placeholder,
  className = "",
  onChange
}: {
  value: string;
  placeholder: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className={`character-codex-edit-field ${className}`}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function EditTextarea({
  value,
  placeholder,
  onChange,
  tall = false
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  tall?: boolean;
}) {
  return (
    <textarea
      className={`character-codex-edit-field ${tall ? "tall" : ""}`}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function EditSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <CustomSelect value={value} onChange={onChange} options={options} />
  );
}

function UploadButton({ label, slot, onUpload }: { label: string; slot: ImageSlot; onUpload: (slot: ImageSlot, file: File | undefined) => void }) {
  return (
    <label className="button-frame character-codex-upload-button">
      <Icon name="Upload" className="h-4 w-4" />
      {label}
      <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => onUpload(slot, event.target.files?.[0])} />
    </label>
  );
}

function createBlankArtGalleryItem(): CharacterArtGalleryItem {
  return {
    id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    category: "",
    driveFileId: "",
    thumbnailUrl: "",
    webViewLink: "",
    dateAdded: new Date().toISOString(),
    isFeatured: false,
    notes: ""
  };
}

function isStoredImageData(value: string) {
  return value.trim().toLowerCase().startsWith("data:");
}

function isTemporaryObjectUrl(value: string) {
  return value.trim().toLowerCase().startsWith("blob:");
}

function extractGoogleDriveFileId(url: string) {
  const value = url.trim();
  if (!value || !/drive\.google\.com/i.test(value)) return "";

  const filePathMatch = value.match(/\/file\/d\/([^/?#]+)/i);
  if (filePathMatch?.[1]) return decodeURIComponent(filePathMatch[1]);

  try {
    const parsed = new URL(value);
    const id = parsed.searchParams.get("id");
    return id ? id.trim() : "";
  } catch {
    const queryIdMatch = value.match(/[?&]id=([^&#]+)/i);
    return queryIdMatch?.[1] ? decodeURIComponent(queryIdMatch[1]) : "";
  }
}

function googleDriveWebViewLink(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function googleDriveThumbnailUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
}

function artGalleryFilterMatches(item: CharacterArtGalleryItem, filter: string) {
  if (filter === "All") return true;
  if (filter === "Featured") return item.isFeatured;
  return categoryMatchesFilter(item.category, filter);
}

function categoryMatchesFilter(category: string, filter: string) {
  const normalizedCategory = normalizeGalleryCategory(category);
  const normalizedFilter = normalizeGalleryCategory(filter);
  if (normalizedCategory === normalizedFilter) return true;
  if (normalizedFilter === "turnarounds") return normalizedCategory.includes("turnaround");
  if (normalizedFilter === "screenshots") return normalizedCategory.includes("screenshot");
  if (normalizedFilter === "portraits") return normalizedCategory.includes("portrait");
  if (normalizedFilter === "expressions") return normalizedCategory.includes("expression");
  return normalizedCategory.includes(normalizedFilter);
}

function normalizeGalleryCategory(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function sortArtGalleryItems(items: CharacterArtGalleryItem[], sortMode: string) {
  return [...items].sort((left, right) => {
    if (sortMode === "Oldest first") return galleryTime(left) - galleryTime(right);
    if (sortMode === "Title A-Z") return (left.title || "").localeCompare(right.title || "");
    if (sortMode === "Category") {
      const categorySort = (left.category || "").localeCompare(right.category || "");
      return categorySort || (left.title || "").localeCompare(right.title || "");
    }
    return galleryTime(right) - galleryTime(left);
  });
}

function galleryTime(item: CharacterArtGalleryItem) {
  const time = new Date(item.dateAdded).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function galleryStatusLabel(item: CharacterArtGalleryItem) {
  if (item.uploadStatus === "mock-local-preview") return "Local Preview";
  if (item.uploadStatus === "imported-from-drive") return "Imported";
  if (!item.thumbnailUrl) return "No Preview";
  return "Drive";
}

function galleryStatusClass(item: CharacterArtGalleryItem) {
  return galleryStatusLabel(item).toLowerCase().replace(/\s+/g, "-");
}

function formatGalleryDate(value: string) {
  if (!value) return "No date added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `Added ${date.toLocaleDateString()}`;
}

function calculateArtVaultStats(vault: CharacterArtVault) {
  const slots = vault.sections.flatMap((section) => section.slots);
  const total = slots.length;
  const filled = slots.filter(isVaultSlotFilled).length;
  const approved = slots.filter((slot) => artVaultSlotStatus(slot) === "approved").length;
  const missing = total - filled;
  const percent = total ? Math.round((filled / total) * 100) : 0;
  return { total, filled, approved, missing, percent };
}

function sectionProgressLabel(section: ArtVaultSection) {
  const filled = section.slots.filter(isVaultSlotFilled).length;
  return `${filled} / ${section.slots.length} Completed`;
}

function artVaultSectionIcon(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("combat")) return "Swords";
  if (normalized.includes("sprite sheet")) return "LayoutDashboard";
  if (normalized.includes("design")) return "Palette";
  if (normalized.includes("marketing")) return "Image";
  if (normalized.includes("in-game")) return "Gamepad2";
  if (normalized.includes("dialogue")) return "Users";
  return "Archive";
}

function artVaultSlotMatches(slot: ArtVaultSlot, search: string, filter: string) {
  const normalizedFilter = filter.toLowerCase();
  const status = artVaultSlotStatus(slot);
  if (normalizedFilter === "missing" && status !== "empty") return false;
  if (normalizedFilter === "filled" && !isVaultSlotFilled(slot)) return false;
  if (normalizedFilter === "needs revision" && status !== "needs-revision") return false;
  if (normalizedFilter === "approved" && status !== "approved") return false;

  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    slot.label,
    slot.requirementType,
    slot.notes,
    slot.image?.title,
    slot.image?.category,
    slot.image?.notes
  ].some((value) => String(value || "").toLowerCase().includes(query));
}

function artVaultSlotStatus(slot: ArtVaultSlot) {
  const status = normalizeVaultStatusValue(slot.status);
  if (status === "empty" && isVaultSlotFilled(slot)) return "uploaded";
  return status;
}

function artVaultSlotStatusLabel(slot: ArtVaultSlot) {
  return artVaultStatusText(artVaultSlotStatus(slot));
}

function artVaultStatusText(status: string) {
  const normalized = normalizeVaultStatusValue(status);
  return artVaultStatusOptions.find((option) => option.value === normalized)?.label || "Missing";
}

function normalizeVaultStatusValue(status: string) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "needs revision" || normalized === "needs-revision") return "needs-revision";
  if (normalized === "uploaded" || normalized === "filled") return "uploaded";
  return "empty";
}

function isVaultSlotFilled(slot: ArtVaultSlot) {
  const image = slot.image;
  if (image?.driveFileId || image?.thumbnailUrl || image?.webViewLink) return true;
  const status = normalizeVaultStatusValue(slot.status);
  return status === "uploaded" || status === "needs-revision" || status === "approved";
}

function createCustomVaultSection(title: string, order: number): ArtVaultSection {
  return {
    id: `custom-art-section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    description: "Custom art requirements for this character.",
    order,
    slots: []
  };
}

function createCustomVaultSlot(label: string, requirementType: string, order: number): ArtVaultSlot {
  return {
    id: `custom-art-slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    requirementType: requirementType.replace(/s$/, "") || "Art Requirement",
    status: "empty",
    image: null,
    notes: "",
    order
  };
}

function findVaultSlot(vault: CharacterArtVault, ref: VaultSlotRef) {
  const section = vault.sections.find((candidate) => candidate.id === ref.sectionId);
  const slot = section?.slots.find((candidate) => candidate.id === ref.slotId);
  return section && slot ? { section, slot } : null;
}

function moveVaultSection(vault: CharacterArtVault, sectionId: string, direction: -1 | 1): CharacterArtVault {
  const sections = normalizeVaultOrders(vault.sections);
  const index = sections.findIndex((section) => section.id === sectionId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) return vault;
  const nextSections = [...sections];
  [nextSections[index], nextSections[targetIndex]] = [nextSections[targetIndex], nextSections[index]];
  return { sections: normalizeVaultOrders(nextSections) };
}

function moveVaultSlot(vault: CharacterArtVault, ref: VaultSlotRef, direction: -1 | 1): CharacterArtVault {
  return {
    sections: vault.sections.map((section) => {
      if (section.id !== ref.sectionId) return section;
      const slots = normalizeVaultOrders(section.slots);
      const index = slots.findIndex((slot) => slot.id === ref.slotId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= slots.length) return section;
      const nextSlots = [...slots];
      [nextSlots[index], nextSlots[targetIndex]] = [nextSlots[targetIndex], nextSlots[index]];
      return { ...section, slots: normalizeVaultOrders(nextSlots) };
    })
  };
}

function deleteVaultSlot(vault: CharacterArtVault, ref: VaultSlotRef): CharacterArtVault {
  return {
    sections: vault.sections.map((section) =>
      section.id === ref.sectionId
        ? { ...section, slots: normalizeVaultOrders(section.slots.filter((slot) => slot.id !== ref.slotId)) }
        : section
    )
  };
}

function saveVaultSlotDraft(vault: CharacterArtVault, draft: VaultSlotDraft): CharacterArtVault {
  const match = findVaultSlot(vault, { sectionId: draft.sectionId, slotId: draft.slotId });
  if (!match) return vault;
  const targetSectionId = vault.sections.some((section) => section.id === draft.targetSectionId)
    ? draft.targetSectionId
    : draft.sectionId;
  const updatedSlot: ArtVaultSlot = {
    ...match.slot,
    label: draft.label.trim() || match.slot.label,
    requirementType: draft.requirementType.trim() || match.slot.requirementType,
    status: normalizeVaultStatusValue(draft.status),
    notes: draft.notes.trim(),
    image: draft.image ? { ...draft.image, slotId: match.slot.id } : null
  };
  const moving = targetSectionId !== draft.sectionId;

  return {
    sections: vault.sections.map((section) => {
      if (section.id === draft.sectionId) {
        const slots = moving
          ? section.slots.filter((slot) => slot.id !== draft.slotId)
          : section.slots.map((slot) => (slot.id === draft.slotId ? updatedSlot : slot));
        return { ...section, slots: normalizeVaultOrders(slots) };
      }
      if (section.id === targetSectionId && moving) {
        return {
          ...section,
          slots: normalizeVaultOrders([...section.slots, { ...updatedSlot, order: section.slots.length }])
        };
      }
      return section;
    })
  };
}

function assignImageToVaultSlot(vault: CharacterArtVault, ref: VaultSlotRef, image: ArtVaultImageMetadata): CharacterArtVault {
  return {
    sections: vault.sections.map((section) =>
      section.id === ref.sectionId
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === ref.slotId
                ? { ...slot, image: { ...image, slotId: slot.id }, status: "uploaded" }
                : slot
            )
          }
        : section
    )
  };
}

function clearVaultSlot(vault: CharacterArtVault, ref: VaultSlotRef): CharacterArtVault {
  return {
    sections: vault.sections.map((section) =>
      section.id === ref.sectionId
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === ref.slotId ? { ...slot, image: null, status: "empty" } : slot
            )
          }
        : section
    )
  };
}

function updateVaultSlotStatus(vault: CharacterArtVault, ref: VaultSlotRef, status: string, user?: GoogleAccountUser): CharacterArtVault {
  const timestamp = new Date().toISOString();
  return {
    sections: vault.sections.map((section) =>
      section.id === ref.sectionId
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === ref.slotId
                ? {
                    ...slot,
                    status: normalizeVaultStatusValue(status),
                    image: slot.image && user
                      ? {
                          ...slot.image,
                          lastUpdatedByName: user.name,
                          lastUpdatedByEmail: user.email,
                          lastUpdatedAt: timestamp
                        }
                      : slot.image
                  }
                : slot
            )
          }
        : section
    )
  };
}

function updateVaultSlotLabel(vault: CharacterArtVault, ref: VaultSlotRef, label: string): CharacterArtVault {
  return {
    sections: vault.sections.map((section) =>
      section.id === ref.sectionId
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === ref.slotId ? { ...slot, label } : slot
            )
          }
        : section
    )
  };
}

function galleryItemToVaultImage(
  item: CharacterArtGalleryItem,
  slotId: string,
  category: string,
  notes: string
): ArtVaultImageMetadata {
  return {
    id: `vault-link-${slotId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: item.title || "Linked Gallery Art",
    category: item.category || category,
    slotId,
    driveFileId: item.driveFileId || "",
    thumbnailUrl: item.thumbnailUrl || "",
    webViewLink: item.webViewLink || "",
    dateAdded: new Date().toISOString(),
    uploadStatus: item.uploadStatus || "linked-gallery-art",
    notes,
    driveFolderId: item.driveFolderId || "",
    driveFolderLink: item.driveFolderLink || "",
    driveFolderName: item.driveFolderName || ""
  };
}

function uploadedDriveFileToVaultImage(
  file: UploadedDriveFile,
  slotId: string,
  category: string,
  notes: string,
  user: GoogleAccountUser,
  driveFolder?: { id?: string; link?: string; name?: string }
): ArtVaultImageMetadata {
  const timestamp = new Date().toISOString();
  return {
    id: `vault-upload-${slotId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: file.name,
    category,
    slotId,
    driveFileId: file.id,
    thumbnailUrl: googleDriveThumbnailUrl(file.id),
    webViewLink: file.webViewLink || googleDriveWebViewLink(file.id),
    dateAdded: timestamp,
    uploadStatus: "uploaded-to-drive",
    notes,
    fileName: file.name,
    downloadUrl: file.webViewLink || googleDriveWebViewLink(file.id),
    uploadedByName: user.name,
    uploadedByEmail: user.email,
    uploadedAt: timestamp,
    lastUpdatedByName: user.name,
    lastUpdatedByEmail: user.email,
    lastUpdatedAt: timestamp,
    driveFolderId: driveFolder?.id || "",
    driveFolderLink: driveFolder?.link || "",
    driveFolderName: driveFolder?.name || ""
  };
}

function pickedDriveFileToVaultImage(
  file: GooglePickerFile,
  slotId: string,
  category: string,
  user: GoogleAccountUser
): ArtVaultImageMetadata {
  const timestamp = new Date().toISOString();
  return {
    id: `vault-import-${slotId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: file.name || "Imported Drive Image",
    category,
    slotId,
    driveFileId: file.id,
    thumbnailUrl: googleDriveThumbnailUrl(file.id),
    webViewLink: file.url || googleDriveWebViewLink(file.id),
    dateAdded: timestamp,
    uploadStatus: "imported-from-drive",
    notes: "",
    fileName: file.name || "Imported Drive Image",
    downloadUrl: file.url || googleDriveWebViewLink(file.id),
    uploadedByName: user.name,
    uploadedByEmail: user.email,
    uploadedAt: timestamp,
    lastUpdatedByName: user.name,
    lastUpdatedByEmail: user.email,
    lastUpdatedAt: timestamp
  };
}

function galleryWithItemIfMissing(items: CharacterArtGalleryItem[], item: CharacterArtGalleryItem) {
  const duplicate = items.some((candidate) => {
    if (item.driveFileId && candidate.driveFileId === item.driveFileId) return true;
    return candidate.id === item.id;
  });
  return duplicate ? items : [item, ...items];
}

function characterArtBoardPreview(category: CharacterArtBoardCategory, media: EntryMedia) {
  const mediaSlot = characterArtBoardMediaSlots[category.id];
  if (mediaSlot) return String(media[mediaSlot] || "");
  return category.image || "";
}

function normalizeVaultOrders<T extends { order: number }>(items: T[]) {
  return [...items]
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({ ...item, order: index }));
}

function buildRelationships(entry: LoreEntry, isGwen: boolean, characterEntries: LoreEntry[] = []): RelationshipItem[] {
  const hasSavedRelationships = Boolean((entry.characterRelationships || []).length || entry.connections.characters.length);
  const defaults: RelationshipItem[] = isGwen && !hasSavedRelationships
    ? [
        { name: "Tohm Kyatt", type: "Mentor & Ally", note: "Recruited Gwen and trusts her judgment.", source: "default" },
        { name: "Miri", type: "Best Friend", note: "Childhood friend and fellow cook.", source: "default" },
        { name: "Bram", type: "Friendly Rival", note: "Sparring rival who pushes her limits.", source: "default" }
      ]
    : [];

  const structured = (entry.characterRelationships || []).map((relationship) => {
    const related = characterEntries.find((candidate) => candidate.id === relationship.characterId);
    return {
      id: relationship.id,
      characterId: relationship.characterId,
      name: related?.title || "Unknown Character",
      type: "Key Relationship",
      note: relationship.description,
      image: related ? getCharacterRelationshipImage(related) : "",
      source: "structured" as const
    };
  });
  const structuredIds = new Set(structured.map((relationship) => relationship.characterId).filter(Boolean));
  const structuredNames = new Set(structured.map((relationship) => normalizeRelationshipName(relationship.name)));

  const connected = entry.connections.characters
    .map((name) => {
      const related = findCharacterByName(characterEntries, name);
      return {
        characterId: related?.id,
        name: related?.title || name,
        type: fieldText(entry, [`Relationship Type: ${name}`]) || "Connected",
        note: fieldText(entry, [`Relationship Note: ${name}`]) || `Important connection for ${entry.title}.`,
        image: related ? getCharacterRelationshipImage(related) : "",
        source: "legacy" as const
      };
    })
    .filter((relationship) => {
      if (relationship.characterId && structuredIds.has(relationship.characterId)) return false;
      return !structuredNames.has(normalizeRelationshipName(relationship.name));
    });

  return mergeNamedItems(defaults, [...structured, ...connected]);
}

function buildWorldConnections(entry: LoreEntry, isGwen: boolean): WorldConnectionItem[] {
  const defaults: WorldConnectionItem[] = isGwen
    ? [
        { type: "Location", title: "Whisker Woods", note: "Primary operations and ingredient source." },
        { type: "Group", title: "Tavern Keepers' Guild", note: "Works under Tohm Kyatt's banner." },
        { type: "Story Object", title: "Recipe Pages", note: "Helps recover lost culinary knowledge." }
      ]
    : [];
  const locations = entry.connections.locations.map((title) => ({
    type: "Location",
    title,
    note: fieldText(entry, [`World Note: ${title}`]) || "Important place connected to this character."
  }));
  const factions = entry.connections.factions.map((title) => ({
    type: "Faction",
    title,
    note: fieldText(entry, [`World Note: ${title}`]) || "Important group connected to this character."
  }));
  const objects = [...entry.connections.items, ...entry.connections.quests].slice(0, 4).map((title) => ({
    type: "Story Link",
    title,
    note: fieldText(entry, [`World Note: ${title}`]) || "Important story or gameplay connection."
  }));

  return mergeWorldItems(defaults, [...locations, ...factions, ...objects]).slice(0, 6);
}

function buildGalleryItems(entry: LoreEntry): GalleryItem[] {
  const fixed = ([
    { label: "Portrait", src: entry.media.characterPortrait || "", slot: "characterPortrait" },
    { label: "Hover PNG", src: entry.media.characterHoverImage || "", slot: "characterHoverImage" },
    { label: "In-Game Sprite", src: entry.media.ingameSpriteImage || "", slot: "ingameSpriteImage" },
    { label: "Dialogue Sprite", src: entry.media.dialogueSpriteImage || "", slot: "dialogueSpriteImage" },
    { label: "Main Image", src: entry.media.mainImage || "", slot: "mainImage" }
  ] as GalleryItem[]).filter((item) => Boolean(item.src));
  const gallery = entry.media.galleryImages.map((src, galleryIndex) => ({
    label: `Gallery ${galleryIndex + 1}`,
    src,
    galleryIndex
  }));

  return [...fixed, ...gallery];
}

function characterImageManagerSlots(
  entry: LoreEntry,
  imageFitForSlot: (slot: Exclude<ImageSlot, "galleryImages">) => ImageFitSettings
) {
  const folderId = entry.driveFolderId || "";
  const folderLink = entry.driveFolderLink || (folderId ? googleDriveFolderLink(folderId) : "");
  const folderName = folderId ? `${entry.title} Drive Folder` : "";
  const base = {
    defaultFolderId: folderId,
    defaultFolderLink: folderLink,
    defaultFolderName: folderName
  };

  return [
    {
      id: "characterPortrait",
      label: "Character Button / Portrait Image",
      description: "The main character portrait and Characters page button image.",
      imageUrl: entry.media.characterPortrait || "",
      imageFit: imageFitForSlot("characterPortrait"),
      frameWidth: 210,
      frameHeight: 290,
      uploadNameContext: { subjectName: entry.title, categoryName: "Character Profile", slotName: "Portrait Button", sourceType: "Character" },
      ...base
    },
    {
      id: "characterHoverImage",
      label: "Hover Character Image",
      description: "The alternate image used for hover states on character buttons.",
      imageUrl: entry.media.characterHoverImage || "",
      imageFit: imageFitForSlot("characterHoverImage"),
      frameWidth: 210,
      frameHeight: 290,
      uploadNameContext: { subjectName: entry.title, categoryName: "Character Profile", slotName: "Hover Button", sourceType: "Character" },
      ...base
    },
    {
      id: "mainImage",
      label: "Main Page Image",
      description: "A broader character page or feature image.",
      imageUrl: entry.media.mainImage || "",
      imageFit: imageFitForSlot("mainImage"),
      frameWidth: 320,
      frameHeight: 190,
      uploadNameContext: { subjectName: entry.title, categoryName: "Character Profile", slotName: "Main Page Image", sourceType: "Character" },
      ...base
    },
    {
      id: "iconImage",
      label: "Small Icon Image",
      description: "Compact icon used in smaller cards and references.",
      imageUrl: entry.media.iconImage || "",
      imageFit: imageFitForSlot("iconImage"),
      frameWidth: 150,
      frameHeight: 150,
      uploadNameContext: { subjectName: entry.title, categoryName: "Character Profile", slotName: "Icon", sourceType: "Character" },
      ...base
    },
    {
      id: "dialogueSpriteImage",
      label: "Dialogue Sprite Image",
      description: "Portrait art used for conversations and expression-focused scenes.",
      imageUrl: entry.media.dialogueSpriteImage || "",
      imageFit: imageFitForSlot("dialogueSpriteImage"),
      frameWidth: 260,
      frameHeight: 170,
      uploadNameContext: { subjectName: entry.title, categoryName: "Dialogue Art", slotName: "Dialogue Sprite", sourceType: "Character" },
      ...base
    },
    {
      id: "ingameSpriteImage",
      label: "In-Game Sprite Image",
      description: "Small gameplay sprite or in-world character reference.",
      imageUrl: entry.media.ingameSpriteImage || "",
      imageFit: imageFitForSlot("ingameSpriteImage"),
      frameWidth: 210,
      frameHeight: 190,
      uploadNameContext: { subjectName: entry.title, categoryName: "Gameplay Sprites", slotName: "In Game Sprite", sourceType: "Character" },
      ...base
    }
  ];
}

function storyValue(entry: LoreEntry, character: ReturnType<typeof buildCharacterView>, key: StoryKey) {
  const isGwen = entry.title.trim().toLowerCase() === "gwen";
  if (key === "background") {
    return fieldText(entry, ["Story Background", "Background"]) ||
      (isGwen ? "Gwen grew up in Osul, training as a fighter and learning the value of hard work, resourcefulness, and protecting others." : "");
  }
  if (key === "incitingIncident") {
    return fieldText(entry, ["Story Inciting Incident", "Inciting Incident"]) ||
      (isGwen ? "After showing exceptional skill and heart, Gwen is recruited by Tohm Kyatt and learns about the spreading corruption in Whisker Woods tied to lost recipe pages." : entry.summary);
  }
  if (key === "mainStoryRole") {
    return fieldText(entry, ["Story Main Role", "Main Story Role"]) ||
      (isGwen ? "Gwen travels through Whisker Woods, gathering ingredients, fighting threats, cooking magical meals, and completing quests to heal the land." : character.coreFunction);
  }
  if (key === "characterArc") {
    return fieldText(entry, ["Story Character Arc", "Character Arc", "Arc"]) ||
      (isGwen ? "Gwen learns to balance fierce independence with trust in others, gradually embracing her role as both protector and leader." : "");
  }
  if (key === "secretsInternalLore") {
    return fieldText(entry, ["Story Secrets / Internal Lore", "Secrets / Internal Lore"]) ||
      (isGwen ? "Gwen carries personal losses that made her fiercely protective. Her love of cooking may come from someone important she lost." : entry.internalLore);
  }
  if (key === "relationshipsInStory") {
    return fieldText(entry, ["Story Relationships", "Relationships in Story"]) ||
      (isGwen ? "Her bond with Tohm Kyatt drives the main quest. Her friendship with Miri grounds her emotionally. Her friendly rivalry with Bram pushes her to grow stronger." : entry.connections.characters.join(", "));
  }
  return fieldText(entry, ["Story Future / Unresolved Threads", "Future / Unresolved Threads"]) ||
    entry.notes.unresolved ||
    (isGwen ? "The source of the corruption remains hidden. More recipe pages, secrets, and personal truths are still waiting to be uncovered." : "");
}

function fullStoryText(entry: LoreEntry, character: ReturnType<typeof buildCharacterView>) {
  const saved = fieldText(entry, ["Full Story", "Longform Story", "Complete Story"]);
  if (saved) return saved;

  const sections = storySections
    .map((section) => {
      const value = storyValue(entry, character, section.key);
      return value ? `${section.title}\n${value}` : "";
    })
    .filter(Boolean);

  if (sections.length) return sections.join("\n\n");
  if (entry.internalLore) return entry.internalLore;
  return "No full story scroll has been written yet.";
}

function buildCharacterStorySteps(entry: LoreEntry, character: ReturnType<typeof buildCharacterView>): StoryReaderStep[] {
  const steps = storySections
    .map((section) => {
      const value = storyValue(entry, character, section.key);
      return value ? {
        title: section.title,
        kicker: entry.type,
        text: value
      } : null;
    })
    .filter(Boolean) as StoryReaderStep[];

  if (steps.length) return steps;
  return [{
    title: "Story Notes",
    kicker: entry.type,
    text: entry.internalLore || entry.summary || "No story notes added yet."
  }];
}

function fieldText(entry: LoreEntry, labels: string[]) {
  for (const label of labels) {
    const match = Object.entries(entry.fields).find(([key]) => normalizeLabel(key) === normalizeLabel(label));
    if (match && typeof match[1] === "string" && match[1].trim()) return match[1].trim();
  }
  return "";
}

function importantTags(entry: LoreEntry, isGwen: boolean) {
  if (isGwen) return ["Fighter", "Cook", "Protector", "Recruit"];
  const preferred = ["fighter", "cook", "chef", "protector", "mentor", "antagonist", "princess", "faery", "alchemist", "fisherman", "npc", "boss"];
  const chosen = entry.tags.filter((tag) => preferred.some((item) => tag.toLowerCase().includes(item))).slice(0, 4);
  return (chosen.length ? chosen : entry.tags.slice(0, 4)).map(titleCase);
}

function firstSpecies(entry: LoreEntry) {
  return firstMatchingTag(entry.tags, ["Human", "Whisken", "Faery", "Dwarf"]) || entry.type;
}

function firstMatchingTag(tags: string[], needles: string[]) {
  return tags.find((tag) => needles.some((needle) => tag.toLowerCase() === needle.toLowerCase())) || "";
}

function hasTag(entry: LoreEntry, needle: string) {
  return entry.tags.some((tag) => tag.toLowerCase() === needle.toLowerCase());
}

function revealLevelFor(entry: LoreEntry) {
  if (/major/i.test(entry.spoilerLevel)) return "Major Spoiler";
  if (/ending|secret/i.test(entry.spoilerLevel)) return "Secret/Internal";
  if (/minor/i.test(entry.spoilerLevel)) return "Known";
  return "Public";
}

function revealCopy(level: string) {
  if (/major/i.test(level)) return "Contains major story information. Use with care.";
  if (/secret|internal/i.test(level)) return "Private writer-facing lore. Not safe for public viewing.";
  if (/minor|known/i.test(level)) return "Safe for core readers. Some details may imply story context.";
  return "Safe for all audiences. Core details are publicly known.";
}

function mergeNamedItems(defaults: RelationshipItem[], connected: RelationshipItem[]) {
  const seen = new Set<string>();
  return [...defaults, ...connected].filter((item) => {
    const key = normalizeRelationshipName(item.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCharacterEntry(entry: LoreEntry) {
  return /character/i.test(entry.category) || /character/i.test(entry.type);
}

function normalizeRelationshipName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function findCharacterByName(entries: LoreEntry[], name: string) {
  const key = normalizeRelationshipName(name);
  return entries.find((entry) => normalizeRelationshipName(entry.title) === key);
}

function imageUrlFromValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { url?: unknown }).url === "string") {
    return (value as { url: string }).url;
  }
  return "";
}

function getCharacterRelationshipImage(character?: LoreEntry) {
  if (!character) return "";
  const looseCharacter = character as LoreEntry & {
    portrait?: unknown;
    coverArt?: unknown;
    dialogueSprite?: unknown;
    inGameSprite?: unknown;
  };
  return (
    imageUrlFromValue(looseCharacter.portrait) ||
    imageUrlFromValue(looseCharacter.coverArt) ||
    imageUrlFromValue(character.media.characterPortrait) ||
    imageUrlFromValue(character.media.mainImage) ||
    imageUrlFromValue(character.media.iconImage) ||
    imageUrlFromValue(looseCharacter.dialogueSprite) ||
    imageUrlFromValue(character.media.dialogueSpriteImage) ||
    imageUrlFromValue(looseCharacter.inGameSprite) ||
    imageUrlFromValue(character.media.ingameSpriteImage) ||
    ""
  );
}

function mergeWorldItems(defaults: WorldConnectionItem[], connected: WorldConnectionItem[]) {
  const seen = new Set<string>();
  return [...defaults, ...connected].filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitValues(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinValues(items: string[]) {
  return items.filter(Boolean).join(", ");
}

function compactJoin(items: Array<string | undefined>, separator: string) {
  return items.filter((item): item is string => Boolean(item?.trim())).join(separator);
}

function titleCase(value: string) {
  if (value.toLowerCase() === "cooking") return "Cook";
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
