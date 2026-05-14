import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ArtVaultImageMetadata,
  ArtVaultSection,
  ArtVaultSlot,
  BestiaryCategoryArtVault,
  BestiaryCreature,
  BestiaryDropIcon,
  BestiaryCreatureDrops,
  BestiaryCreatureHabitatInfo,
  BestiaryCreatureLore,
  BestiaryCreatureStats,
  CharacterArtVault,
  GoogleAccountUser,
  ImageFitSettings
} from "../types";
import {
  bestiaryHabitatOptions,
  bestiarySortOptions,
  bestiaryThreatOptions,
  bestiaryCategoryVaultId,
  createBestiaryCategoryArtVaultRecord,
  createBlankBestiaryCreature,
  normalizeBestiaryCategoryArtVault,
  normalizeBestiaryCreature,
  normalizeCreatureArtVault
} from "../utils/bestiary";
import { isDriveConfigured, getDriveSettings, showDriveSetupMessage } from "../utils/driveSettings";
import { nowIso, slugify } from "../utils/entries";
import {
  googleDriveFolderLink,
  handlePickedDriveFile,
  openGoogleDriveImagePicker,
  openGoogleDriveFolderPicker,
  openGooglePickerForCharacter,
  moveDriveFileToFolder,
  uploadImageToDrive,
  type GooglePickerFile,
  type UploadedDriveFile
} from "../utils/googlePicker";
import { isSupportedImage, readImageFileForStorage } from "../utils/media";
import { recordArtVaultActivity } from "../utils/activityLog";
import { extractGoogleDriveFileId, googleDriveThumbnailUrl, imageFitToStyle, normalizeImageFit, resolveImageSourceUrl } from "../utils/imageFit";
import type { AssignableModuleInfo, AssignmentRecord } from "../utils/assignments";
import type { ArtBinderInitialFilter } from "./ArtBinderPage";
import { AssignableModule } from "./AssignmentSystem";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { FavoriteButton } from "./FavoriteButton";
import { ImageAdjustModal } from "./ImageAdjustModal";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { Icon } from "./Icon";
import { useRealtimeCollaboration } from "./RealtimeCollaborationContext";
import { StoryReaderModal, type StoryReaderSection, type StoryReaderStep } from "./StoryReaderModal";

interface BestiaryPageProps {
  creatures: BestiaryCreature[];
  categoryArtVaults: BestiaryCategoryArtVault[];
  readOnly: boolean;
  onSaveCreature: (creature: BestiaryCreature) => void;
  onDeleteCreature: (creatureId: string) => void;
  onSaveCategoryArtVault: (vault: BestiaryCategoryArtVault) => void;
  currentUser: GoogleAccountUser;
  selectedCreatureId?: string;
  isCreatureFavorite?: (creature: BestiaryCreature) => boolean;
  onToggleCreatureFavorite?: (creature: BestiaryCreature) => void;
  focusedAssignment?: AssignmentRecord | null;
  onBackToPrevious?: () => void;
  onGoToBestiary?: () => void;
  onOpenArtBinder?: (filter: ArtBinderInitialFilter) => void;
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

type CreatureImageAdjustSlot = "slotImage" | "image" | "expandedImage" | "hoverImage";
type ImagePreviewFrame = { width: number; height: number };
type BestiaryDriveFolderTarget = { id: string; link: string; name: string };

interface CreatureImageAdjustTarget {
  slot: CreatureImageAdjustSlot;
  label: string;
  imageUrl: string;
  imageFit: ImageFitSettings;
  aspectRatio: string;
  previewFrame?: ImagePreviewFrame;
}

interface BestiaryDriveFileMoveCandidate {
  fileId: string;
  label: string;
  source: string;
}

const BESTIARY_CATEGORIES_KEY = "tavernCookBookBestiaryCategories";
const BESTIARY_SLIME_SLOTS_KEY = "tavernCookBookBestiarySlimeSlotsSeeded";
const artVaultStatusFilters = ["All", "Missing", "Filled", "Needs Revision", "Approved"];
const defaultBestiaryCategoryTabs = ["All", "Wildlife", "Insects", "Slimes", "Bosses", "Corrupted", "Friendly", "Region-Based"];
const slimeSlotNames = ["Bitter Slime", "Sweet Slime", "Savory Slime", "Sour Slime", "Salty Slime", "Spicy Slime"];
const creaturePanelTabs = [
  { id: "about", label: "About" },
  { id: "loot", label: "Loot & Combat" },
  { id: "habitat", label: "Habitat & Lore" }
] as const;

type CreaturePanelTab = (typeof creaturePanelTabs)[number]["id"];

export function BestiaryPage({
  creatures,
  categoryArtVaults,
  readOnly,
  onSaveCreature,
  onDeleteCreature,
  onSaveCategoryArtVault,
  currentUser,
  selectedCreatureId = "",
  isCreatureFavorite,
  onToggleCreatureFavorite,
  focusedAssignment = null,
  onBackToPrevious,
  onGoToBestiary,
  onOpenArtBinder
}: BestiaryPageProps) {
  const normalizedCreatures = useMemo(
    () => creatures.map((creature) => normalizeBestiaryCreature(creature)),
    [creatures]
  );
  const [selectedId, setSelectedId] = useState(normalizedCreatures[0]?.id || "");
  const [search, setSearch] = useState("");
  const [bestiaryCategoryTabs, setBestiaryCategoryTabs] = useState<string[]>(() => loadBestiaryCategories());
  const [categoryTab, setCategoryTab] = useState("All");
  const [threatFilter, setThreatFilter] = useState("All Temperaments");
  const [habitatFilter, setHabitatFilter] = useState("All Habitats");
  const [sortMode, setSortMode] = useState("Name A-Z");
  const [activePanelTab, setActivePanelTab] = useState<CreaturePanelTab>("about");
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BestiaryCreature | null>(null);
  const [artVaultCreatureId, setArtVaultCreatureId] = useState("");
  const [artVaultCategoryId, setArtVaultCategoryId] = useState("");
  const [artVaultCategoryName, setArtVaultCategoryName] = useState("");
  const [imageAdjustTarget, setImageAdjustTarget] = useState<CreatureImageAdjustTarget | null>(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [fullStoryOpen, setFullStoryOpen] = useState(false);
  const [activeStoryTab, setActiveStoryTab] = useState("full");

  useEffect(() => {
    if (!normalizedCreatures.length) {
      setSelectedId("");
      return;
    }
    if (!normalizedCreatures.some((creature) => creature.id === selectedId)) {
      setSelectedId(normalizedCreatures[0].id);
    }
  }, [normalizedCreatures, selectedId]);

  useEffect(() => {
    saveBestiaryCategories(bestiaryCategoryTabs);
  }, [bestiaryCategoryTabs]);

  useEffect(() => {
    if (!bestiaryCategoryTabs.includes(categoryTab)) setCategoryTab("All");
  }, [bestiaryCategoryTabs, categoryTab]);

  useEffect(() => {
    if (readOnly) return;
    if (localStorage.getItem(BESTIARY_SLIME_SLOTS_KEY) === "1") return;
    localStorage.setItem(BESTIARY_SLIME_SLOTS_KEY, "1");
    const existing = new Set(normalizedCreatures.map((creature) => creature.name.trim().toLowerCase()));
    const missingSlimes = slimeSlotNames.filter((name) => !existing.has(name.toLowerCase()));
    missingSlimes.forEach((name) => onSaveCreature(createSlimeCreatureSlot(name)));
  }, [normalizedCreatures, onSaveCreature, readOnly]);

  useEffect(() => {
    if (selectedCreatureId && normalizedCreatures.some((creature) => creature.id === selectedCreatureId)) {
      setSelectedId(selectedCreatureId);
      setActivePanelTab("about");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCreatureId]);

  useEffect(() => {
    if (!focusedAssignment?.targetRoute.startsWith("bestiary:")) return;
    if (!normalizedCreatures.some((creature) => creature.id === focusedAssignment.entryId)) return;
    setSelectedId(focusedAssignment.entryId);
    setArtVaultCreatureId(!readOnly && focusedAssignment.targetRoute.includes(":art-vault:") ? focusedAssignment.entryId : "");
    setActivePanelTab(tabForBestiaryModule(focusedAssignment.moduleId));
    if (!readOnly && focusedAssignment.editModeOnOpen) setEditing(true);
  }, [focusedAssignment, normalizedCreatures, readOnly]);

  const selectedCreature = normalizedCreatures.find((creature) => creature.id === selectedId) || normalizedCreatures[0] || null;
  const artVaultCreature = normalizedCreatures.find((creature) => creature.id === artVaultCreatureId) || null;
  const artVaultCategory =
    categoryArtVaults.find((vault) => vault.id === artVaultCategoryId) ||
    (artVaultCategoryId && artVaultCategoryName
      ? createBestiaryCategoryArtVaultRecord(artVaultCategoryName, normalizedCreatures)
      : null);
  const visibleCreatures = useMemo(
    () => filterAndSortCreatures(normalizedCreatures, search, categoryTab, threatFilter, habitatFilter, sortMode),
    [normalizedCreatures, search, categoryTab, threatFilter, habitatFilter, sortMode]
  );

  const categoryFolderForName = (categoryName: string): BestiaryDriveFolderTarget | null => {
    const normalizedCategory = normalizeBestiaryCategoryName(categoryName);
    if (!normalizedCategory || normalizedCategory === "All") return null;
    const vaultId = bestiaryCategoryVaultId(normalizedCategory);
    const vault = categoryArtVaults.find(
      (candidate) =>
        candidate.id === vaultId ||
        candidate.categoryName.trim().toLowerCase() === normalizedCategory.toLowerCase()
    );
    const id = vault?.driveFolderId?.trim() || "";
    if (!id) return null;
    return {
      id,
      link: vault?.driveFolderLink || googleDriveFolderLink(id),
      name: `${vault?.categoryName || normalizedCategory} Drive Folder`
    };
  };

  const categoryFolderForCreature = (creature?: BestiaryCreature | null) =>
    creature ? categoryFolderForName(creature.category) : null;

  useEffect(() => {
    if (!selectedCreature || editing) return;
    setDraft(selectedCreature);
  }, [selectedCreature, editing]);

  const beginEdit = () => {
    if (!selectedCreature || readOnly) return;
    setDraft(selectedCreature);
    setEditing(true);
  };

  const saveDraft = () => {
    if (!draft || readOnly) return;
    const normalized = normalizeBestiaryCreature({ ...draft, updatedAt: nowIso() });
    onSaveCreature(normalized);
    setSelectedId(normalized.id);
    setEditing(false);
    setDraft(normalized);
  };

  const cancelEdit = () => {
    setDraft(selectedCreature);
    setEditing(false);
  };

  const addCreature = () => {
    if (readOnly) return;
    const creature = createBlankBestiaryCreature();
    onSaveCreature(creature);
    setSelectedId(creature.id);
    setDraft(creature);
    setEditing(true);
    setActivePanelTab("about");
  };

  const addBestiaryCategory = () => {
    if (readOnly) return;
    const name = window.prompt("New Bestiary category name:");
    const category = normalizeBestiaryCategoryName(name || "");
    if (!category) return;
    const existingCategory = bestiaryCategoryTabs.find((tab) => tab.toLowerCase() === category.toLowerCase());
    if (existingCategory) {
      setCategoryTab(existingCategory);
      return;
    }
    setBestiaryCategoryTabs((current) => [...current, category]);
    setCategoryTab(category);
  };

  const openCategoryArtVault = (categoryName: string) => {
    if (readOnly) return;
    const normalizedCategory = normalizeBestiaryCategoryName(categoryName);
    if (!normalizedCategory || normalizedCategory === "All") return;
    const vaultId = bestiaryCategoryVaultId(normalizedCategory);
    const existing = categoryArtVaults.find((vault) => vault.id === vaultId);
    setArtVaultCategoryName(normalizedCategory);
    if (existing) {
      if (onOpenArtBinder) {
        onOpenArtBinder({ kind: "bestiary", subjectId: existing.id });
        return;
      }
      setArtVaultCategoryId(existing.id);
      return;
    }
    const created = createBestiaryCategoryArtVaultRecord(normalizedCategory, normalizedCreatures);
    onSaveCategoryArtVault(created);
    if (onOpenArtBinder) {
      onOpenArtBinder({ kind: "bestiary", subjectId: created.id });
      return;
    }
    setArtVaultCategoryId(created.id);
  };

  const chooseCategoryDriveFolder = async (categoryName: string) => {
    if (readOnly) return;
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      return;
    }
    const normalizedCategory = normalizeBestiaryCategoryName(categoryName);
    if (!normalizedCategory || normalizedCategory === "All") return;
    try {
      const folder = await openGoogleDriveFolderPicker(`Choose ${singularBestiaryCategoryLabel(normalizedCategory)} Drive Folder`);
      if (!folder) return;
      const vaultId = bestiaryCategoryVaultId(normalizedCategory);
      const existing = categoryArtVaults.find(
        (vault) => vault.id === vaultId || vault.categoryName.trim().toLowerCase() === normalizedCategory.toLowerCase()
      );
      const base = existing
        ? normalizeBestiaryCategoryArtVault(existing, normalizedCategory, normalizedCreatures)
        : createBestiaryCategoryArtVaultRecord(normalizedCategory, normalizedCreatures);
      onSaveCategoryArtVault(
        normalizeBestiaryCategoryArtVault(
          {
            ...base,
            driveFolderId: folder.id,
            driveFolderLink: folder.url,
            updatedAt: nowIso()
          },
          normalizedCategory,
          normalizedCreatures
        )
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not choose a Google Drive folder for this Bestiary type.");
    }
  };

  const moveCategoryDriveFilesToFolder = async (categoryName: string) => {
    if (readOnly) return;
    const normalizedCategory = normalizeBestiaryCategoryName(categoryName);
    const targetFolder = categoryFolderForName(normalizedCategory);
    if (!targetFolder?.id) {
      window.alert(`Set a Drive folder for ${normalizedCategory || "this Bestiary type"} first.`);
      return;
    }
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      return;
    }

    const categoryVault = categoryArtVaults.find(
      (vault) =>
        vault.id === bestiaryCategoryVaultId(normalizedCategory) ||
        vault.categoryName.trim().toLowerCase() === normalizedCategory.toLowerCase()
    );
    const candidates = collectBestiaryCategoryDriveFiles(normalizedCreatures, normalizedCategory, categoryVault);
    if (!candidates.length) {
      window.alert(`No Google Drive images were found for ${normalizedCategory}. Local images and empty slots cannot be moved.`);
      return;
    }

    const confirmed = window.confirm(
      `Move ${candidates.length} Google Drive file${candidates.length === 1 ? "" : "s"} for ${normalizedCategory} into ${targetFolder.name}?\n\nThis changes the files' Drive folder location, but it will not delete app metadata.`
    );
    if (!confirmed) return;

    let moved = 0;
    let alreadyThere = 0;
    const failures: string[] = [];
    for (const candidate of candidates) {
      try {
        const result = await moveDriveFileToFolder(candidate.fileId, targetFolder.id);
        if (result.alreadyInFolder) alreadyThere += 1;
        else moved += 1;
      } catch (error) {
        failures.push(`${candidate.label}: ${error instanceof Error ? error.message : "Move failed"}`);
      }
    }

    const failureSummary = failures.length
      ? `\n\nCould not move ${failures.length}:\n${failures.slice(0, 6).join("\n")}${failures.length > 6 ? "\n..." : ""}`
      : "";
    window.alert(`Moved ${moved} file${moved === 1 ? "" : "s"}. ${alreadyThere} already in that folder.${failureSummary}`);
  };

  const removeCreature = () => {
    if (!selectedCreature || readOnly) return;
    if (!window.confirm(`Delete "${selectedCreature.name}" from the Bestiary?`)) return;
    onDeleteCreature(selectedCreature.id);
    setEditing(false);
    setDraft(null);
  };

  const updateDraft = (patch: Partial<BestiaryCreature>) => {
    setDraft((current) => current ? normalizeBestiaryCreature({ ...current, ...patch }) : current);
  };

  const persistCreaturePatch = (patch: Partial<BestiaryCreature>) => {
    if (!displayCreature || readOnly) return;
    const normalized = normalizeBestiaryCreature({ ...displayCreature, ...patch, updatedAt: nowIso() });
    setDraft(normalized);
    setSelectedId(normalized.id);
    onSaveCreature(normalized);
  };

  const openCreatureImageAdjuster = (slot: CreatureImageAdjustSlot, label: string, previewFrame?: ImagePreviewFrame) => {
    if (!editing || !displayCreature) return;
    const imageUrl = creatureImageForSlot(displayCreature, slot);
    if (!imageUrl) return;
    setImageAdjustTarget({
      slot,
      label,
      imageUrl,
      imageFit: creatureImageFitForSlot(displayCreature, slot),
      aspectRatio: creatureImageAspectForSlot(slot),
      previewFrame
    });
  };

  const saveCreatureImageAdjustment = ({ imageUrl, imageFit }: { imageUrl: string; imageFit: ImageFitSettings }) => {
    if (!imageAdjustTarget) return;
    const patch = creatureImagePatchForSlot(imageAdjustTarget.slot, imageUrl, imageFit);
    updateDraft(patch);
    persistCreaturePatch(patch);
    setImageAdjustTarget(null);
  };

  const saveCreatureImageManager = (slots: ImageManagerSlotDraft[]) => {
    const patch = slots.reduce<Partial<BestiaryCreature>>((nextPatch, slot) => ({
      ...nextPatch,
      ...creatureImagePatchForSlot(slot.id as CreatureImageAdjustSlot, slot.imageUrl, slot.imageFit)
    }), {});
    updateDraft(patch);
    persistCreaturePatch(patch);
    setImageManagerOpen(false);
  };

  const chooseCreatureDriveFolder = async () => {
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      return;
    }
    try {
      const folder = await openGoogleDriveFolderPicker("Choose Creature Drive Folder");
      if (!folder) return;
      persistCreaturePatch({
        driveFolderId: folder.id,
        driveFolderLink: folder.url
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not choose a Google Drive folder.");
    }
  };

  const uploadAdjustedCreatureImageToDrive = async (file: File, folderId?: string, slotLabel?: string, assetState: "wip" | "final" = "wip") => {
    if (!displayCreature) throw new Error("Choose a creature first.");
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      throw new Error("Google Drive is not connected yet.");
    }
    const categoryFolder = categoryFolderForCreature(displayCreature);
    const targetFolderId = (folderId || driveFolderForCreature(displayCreature, categoryFolder)).trim();
    if (!targetFolderId) throw new Error("Set a Drive folder for this creature before uploading art.");
    const uploadedFile = await uploadImageToDrive(file, targetFolderId, {
      naming: {
        subjectName: displayCreature.name,
        categoryName: "Bestiary",
        slotName: slotLabel || "Creature Image",
        sourceType: "Creature",
        state: assetState
      }
    });
    return googleDriveThumbnailUrl(uploadedFile.id);
  };

  const importAdjustedCreatureImageFromDrive = async () => {
    if (!displayCreature) throw new Error("Choose a creature first.");
    const pickedFile = await openGooglePickerForCharacter(displayCreature.id);
    return pickedFile ? googleDriveThumbnailUrl(pickedFile.id) : "";
  };

  if (artVaultCreature) {
    return (
      <section className="character-detail-page art-vault-active creature-art-vault-shell">
        <CreatureArtVaultPage
          creature={artVaultCreature}
          readOnly={readOnly}
          onBack={() => setArtVaultCreatureId("")}
          onSaveCreature={(creature) => {
            onSaveCreature(creature);
            setSelectedId(creature.id);
          }}
          currentUser={currentUser}
          focusedAssignment={focusedAssignment}
          categoryDriveFolder={categoryFolderForCreature(artVaultCreature)}
        />
      </section>
    );
  }

  if (artVaultCategory) {
    const categorySubject = bestiaryCategoryVaultToCreature(artVaultCategory);
    return (
      <section className="character-detail-page art-vault-active creature-art-vault-shell">
        <CreatureArtVaultPage
          creature={categorySubject}
          readOnly={readOnly}
          onBack={() => {
            setArtVaultCategoryId("");
            setArtVaultCategoryName("");
          }}
          onSaveCreature={(subject) => {
            onSaveCategoryArtVault(
              normalizeBestiaryCategoryArtVault(
                {
                  ...artVaultCategory,
                  artVault: subject.artVault,
                  driveFolderId: subject.driveFolderId,
                  driveFolderLink: subject.driveFolderLink,
                  updatedAt: nowIso()
                },
                artVaultCategory.categoryName,
                normalizedCreatures
              )
            );
          }}
          currentUser={currentUser}
          focusedAssignment={focusedAssignment}
          vaultEyebrow="Bestiary Category Art Vault"
          backLabel="Back to Bestiary"
          intro={`Shared art board for ${artVaultCategory.categoryName.toLowerCase()} as a whole. Use this for lineup art, family rules, shared icons, habitats, and category-wide references.`}
          activitySubjectType="creature-category"
          assignmentCategoryPrefix="Bestiary Category Art Vault"
        />
      </section>
    );
  }

  const displayCreature = editing && draft ? draft : selectedCreature;
  const activeCategoryFolder = categoryFolderForName(categoryTab);
  const displayCreatureFolder = displayCreature
    ? driveFolderTargetForCreature(displayCreature, categoryFolderForCreature(displayCreature))
    : {
        id: getDriveSettings().defaultTalesFolderId.trim(),
        link: googleDriveFolderLink(getDriveSettings().defaultTalesFolderId.trim()),
        name: "Default Tales Folder"
      };
  const bestiaryStorySections = displayCreature
    ? buildBestiaryStoryReaderSections(displayCreature, editing ? (patch) => updateDraft(patch) : undefined)
    : [];
  const bestiaryStorySteps = displayCreature ? buildBestiaryStoryReaderSteps(displayCreature) : [];
  const bestiaryFullStory = displayCreature ? buildBestiaryFullStory(displayCreature, bestiaryStorySections) : "";

  if (fullStoryOpen && displayCreature) {
    return (
      <div className="bestiary-page">
        <StoryReaderModal
          title={displayCreature.name}
          eyebrow="Bestiary Full Story"
          activeTab={activeStoryTab}
          sections={bestiaryStorySections}
          fullStory={bestiaryFullStory}
          fullStoryEditValue={displayCreature.lore.fullStory || bestiaryFullStory}
          fullStoryPlaceholder="Write the full creature story here: origin, habitat history, culture, rumors, hidden truth, and how this creature matters."
          steps={bestiaryStorySteps}
          isEditing={editing}
          onSetActiveTab={setActiveStoryTab}
          onFullStoryChange={(fullStory) => updateDraft({ lore: { ...displayCreature.lore, fullStory } })}
          onClose={() => setFullStoryOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="bestiary-page">
      <section className={`bestiary-layout ${detailExpanded ? "detail-expanded" : ""}`}>
        <div className="bestiary-left-column">
          <section className="bestiary-header">
            <div>
              {onBackToPrevious && (
                <div className="bestiary-return-toolbar">
                  <button className="button-frame bestiary-action-button" onClick={onBackToPrevious}>
                    <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
                    Back
                  </button>
                  {onGoToBestiary && (
                    <button className="bestiary-action-button" onClick={onGoToBestiary}>
                      <Icon name="Swords" className="h-4 w-4" />
                      Go to Bestiary
                    </button>
                  )}
                </div>
              )}
              <h2 className="font-display">Bestiary</h2>
              <span>A living archive of creatures, enemies, wildlife, bosses, and strange beings found across the world.</span>
            </div>
            {(categoryTab !== "All" || !readOnly) && (
              <div className="bestiary-header-actions">
                {categoryTab !== "All" && !readOnly && (
                  <>
                    <button
                      className="button-frame bestiary-action-button"
                      onClick={() => chooseCategoryDriveFolder(categoryTab)}
                      title={activeCategoryFolder ? `Uploads inherit ${activeCategoryFolder.name}` : `Set a shared folder for ${categoryTab}`}
                    >
                      <Icon name="FolderOpen" className="h-4 w-4" />
                      {activeCategoryFolder ? "Change" : "Set"} {singularBestiaryCategoryLabel(categoryTab)} Folder
                    </button>
                    {activeCategoryFolder && (
                      <button
                        className="button-frame bestiary-action-button"
                        onClick={() => moveCategoryDriveFilesToFolder(categoryTab)}
                        title={`Move stored Drive files for ${categoryTab} into ${activeCategoryFolder.name}`}
                      >
                        <Icon name="FolderOpen" className="h-4 w-4" />
                        Move {singularBestiaryCategoryLabel(categoryTab)} Files Here
                      </button>
                    )}
                    <button className="button-frame bestiary-action-button" onClick={() => openCategoryArtVault(categoryTab)}>
                      <Icon name="Archive" className="h-4 w-4" />
                      Open {singularBestiaryCategoryLabel(categoryTab)} Art Vault
                    </button>
                  </>
                )}
                {!readOnly && (
                  <>
                    <button className="button-frame bestiary-action-button" onClick={addBestiaryCategory}>
                      <Icon name="Plus" className="h-4 w-4" />
                      Add Category
                    </button>
                    <button className="button-frame bestiary-action-button" onClick={addCreature}>
                      <Icon name="Plus" className="h-4 w-4" />
                      New Entry
                    </button>
                  </>
                )}
              </div>
            )}
          </section>

          <nav className="bestiary-category-tabs" aria-label="Bestiary categories">
            {bestiaryCategoryTabs.map((tab) => (
              <button
                key={tab}
                className={categoryTab === tab ? "active" : ""}
                onClick={() => setCategoryTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>

          <section className="bestiary-filters">
            <label className="bestiary-search">
              <Icon name="Search" className="h-4 w-4" />
              <input value={search} placeholder="Search creatures..." onChange={(event) => setSearch(event.target.value)} />
            </label>
            <BestiarySelect label="Region" value={habitatFilter} options={bestiaryHabitatOptions} onChange={setHabitatFilter} />
            <BestiarySelect label="Threat Level" value={threatFilter} options={bestiaryThreatOptions} onChange={setThreatFilter} />
            <BestiarySelect label="Sort" value={sortMode} options={bestiarySortOptions} onChange={setSortMode} />
          </section>

          <div className="bestiary-grid-panel">
            <div className="bestiary-grid-header">
              <h3 className="font-display">Creature Archive</h3>
              <span>{visibleCreatures.length} shown</span>
            </div>
            <div className="bestiary-creature-grid">
              {visibleCreatures.map((creature) => {
                const isSelectedCreature = displayCreature?.id === creature.id;
                const cardCreature = editing && isSelectedCreature && displayCreature ? displayCreature : creature;
                return (
                  <CreatureCard
                    key={creature.id}
                    creature={cardCreature}
                    selected={isSelectedCreature}
                    isFavorite={Boolean(isCreatureFavorite?.(creature))}
                    onToggleFavorite={() => onToggleCreatureFavorite?.(creature)}
                    canAdjustImage={Boolean(editing && isSelectedCreature && !readOnly)}
                    onAdjustImage={(previewFrame) =>
                      openCreatureImageAdjuster("slotImage", "Creature Archive Slot Image", previewFrame)
                    }
                    onClick={() => {
                      setSelectedId(creature.id);
                      setEditing(false);
                      setDraft(creature);
                      setActivePanelTab("about");
                    }}
                  />
                );
              })}
            </div>
            {!visibleCreatures.length && (
              <div className="bestiary-empty">
                <Icon name="Plus" className="h-8 w-8" />
                <strong>New Creature Slot</strong>
                <span>No creatures match this view yet.</span>
                {!readOnly && (
                  <button className="button-frame bestiary-action-button" onClick={addCreature}>
                    Add Creature
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className={`bestiary-detail-panel ${editing ? "is-editing" : ""}`}>
          {displayCreature ? (
            <CreatureDetails
              creature={displayCreature}
              activePanelTab={activePanelTab}
              expanded={detailExpanded}
              editing={editing}
              readOnly={readOnly}
              onTabChange={setActivePanelTab}
              onToggleExpanded={() => setDetailExpanded((value) => !value)}
              onEdit={beginEdit}
              onSave={saveDraft}
              onCancel={cancelEdit}
              onDelete={removeCreature}
              onChange={updateDraft}
              onPersistChange={persistCreaturePatch}
              categories={bestiaryCategoryTabs.filter((tab) => tab !== "All")}
              categoryDriveFolder={categoryFolderForCreature(displayCreature)}
              onChooseDriveFolder={chooseCreatureDriveFolder}
              onChooseCategoryDriveFolder={() => chooseCategoryDriveFolder(displayCreature.category)}
              onOpenImageManager={() => setImageManagerOpen(true)}
              onOpenArtVault={() => {
                if (onOpenArtBinder) {
                  onOpenArtBinder({ kind: "bestiary", subjectId: displayCreature.id });
                  return;
                }
                setArtVaultCreatureId(displayCreature.id);
              }}
              onAdjustImage={(previewFrame, expandedImage) =>
                openCreatureImageAdjuster(
                  expandedImage ? "expandedImage" : "image",
                  expandedImage ? "Expanded Creature Image" : "Creature Image",
                  previewFrame
                )
              }
              onOpenFullStory={() => {
                setActiveStoryTab("full");
                setFullStoryOpen(true);
              }}
              isFavorite={Boolean(isCreatureFavorite?.(displayCreature))}
              onToggleFavorite={() => onToggleCreatureFavorite?.(displayCreature)}
            />
          ) : (
            <div className="bestiary-empty detail">
              <Icon name="BookOpen" className="h-10 w-10" />
              <strong>No Bestiary creatures yet.</strong>
              {!readOnly && <button className="button-frame bestiary-action-button" onClick={addCreature}>Create First Creature</button>}
            </div>
          )}
        </aside>
      </section>

      {imageAdjustTarget && (
        <ImageAdjustModal
          slotLabel={imageAdjustTarget.label}
          imageUrl={imageAdjustTarget.imageUrl}
          imageFit={imageAdjustTarget.imageFit}
          aspectRatio={imageAdjustTarget.aspectRatio}
          previewFrame={imageAdjustTarget.previewFrame}
          driveFolderId={displayCreatureFolder.id}
          driveFolderLink={displayCreatureFolder.link}
          driveFolderName={displayCreatureFolder.name}
          onSave={saveCreatureImageAdjustment}
          onCancel={() => setImageAdjustTarget(null)}
          onUploadToDrive={uploadAdjustedCreatureImageToDrive}
          onImportFromDrive={importAdjustedCreatureImageFromDrive}
        />
      )}
      {imageManagerOpen && displayCreature && (
        <ImageManagerModal
          title={`${displayCreature.name} Image Manager`}
          subtitle="Assign, import, upload, download, and frame every Bestiary image for this creature in one place."
          slots={creatureImageManagerSlots(displayCreature, categoryFolderForCreature(displayCreature))}
          onClose={() => setImageManagerOpen(false)}
          onSave={saveCreatureImageManager}
        />
      )}
    </div>
  );
}

function buildBestiaryStoryReaderSections(
  creature: BestiaryCreature,
  onPatch?: (patch: Partial<BestiaryCreature>) => void
): StoryReaderSection[] {
  const setLore = (patch: Partial<BestiaryCreatureLore>) => onPatch?.({ lore: { ...creature.lore, ...patch } });
  return [
    {
      key: "overview",
      title: "Overview",
      icon: "BookOpen",
      value: joinStoryParts([creature.description, creature.overview, creature.fieldNotes]) || "No overview added yet.",
      onChange: onPatch ? (value) => onPatch({ overview: value }) : undefined
    },
    {
      key: "origin",
      title: "Origin",
      icon: "GitBranch",
      value: creature.lore.origin || "No origin notes added yet.",
      onChange: onPatch ? (origin) => setLore({ origin }) : undefined
    },
    {
      key: "habitat",
      title: "Habitat",
      icon: "Map",
      value: joinStoryParts([
        `Habitat: ${creature.habitat || "Unknown"}`,
        creature.habitatInfo.knownLocations,
        creature.habitatInfo.spawnConditions,
        creature.habitatInfo.mapNotes
      ]),
      onChange: onPatch ? (mapNotes) => onPatch({ habitatInfo: { ...creature.habitatInfo, mapNotes } }) : undefined
    },
    {
      key: "culture",
      title: "Culture",
      icon: "Landmark",
      value: joinStoryParts([creature.lore.culturalMeaning, creature.lore.rumors]) || "No cultural lore added yet.",
      onChange: onPatch ? (culturalMeaning) => setLore({ culturalMeaning }) : undefined
    },
    {
      key: "story",
      title: "Story Use",
      icon: "Compass",
      value: joinStoryParts([creature.lore.questConnections, creature.gameplayPurpose, creature.lore.relatedCreatures]),
      onChange: onPatch ? (questConnections) => setLore({ questConnections }) : undefined
    },
    {
      key: "secrets",
      title: "Secrets",
      icon: "EyeOff",
      value: creature.lore.hiddenNotes || "No hidden notes added yet.",
      onChange: onPatch ? (hiddenNotes) => setLore({ hiddenNotes }) : undefined
    }
  ];
}

function buildBestiaryStoryReaderSteps(creature: BestiaryCreature): StoryReaderStep[] {
  return [
    { title: "First Sight", kicker: creature.type, text: creature.description || creature.overview },
    { title: "Where It Lives", kicker: creature.habitat || "Habitat", text: joinStoryParts([creature.habitatInfo.knownLocations, creature.habitatInfo.spawnConditions, creature.habitatInfo.mapNotes]) },
    { title: "Origin", kicker: "Lore", text: creature.lore.origin },
    { title: "Culture and Rumors", kicker: "World", text: joinStoryParts([creature.lore.culturalMeaning, creature.lore.rumors]) },
    { title: "Game Story Use", kicker: "Player-facing", text: joinStoryParts([creature.lore.questConnections, creature.gameplayPurpose, creature.lore.relatedCreatures]) },
    { title: "Hidden Truth", kicker: "Spoilers", text: creature.lore.hiddenNotes }
  ].filter((step) => step.text && step.text.trim());
}

function buildBestiaryFullStory(creature: BestiaryCreature, sections: StoryReaderSection[]) {
  if (creature.lore.fullStory?.trim()) return creature.lore.fullStory;
  return sections
    .map((section) => section.value && !/^No .* added yet\.$/i.test(section.value) ? `${section.title}\n${section.value}` : "")
    .filter(Boolean)
    .join("\n\n") || "No full creature story has been written yet.";
}

function joinStoryParts(parts: Array<string | undefined>) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join("\n\n");
}

function CreatureCard({
  creature,
  selected,
  isFavorite,
  onToggleFavorite,
  canAdjustImage,
  onAdjustImage,
  onClick
}: {
  creature: BestiaryCreature;
  selected: boolean;
  isFavorite: boolean;
  onToggleFavorite?: () => void;
  canAdjustImage?: boolean;
  onAdjustImage?: (previewFrame?: ImagePreviewFrame) => void;
  onClick: () => void;
}) {
  const image = creatureImageForSlot(creature, "slotImage");
  const imageFit = creatureImageFitForSlot(creature, "slotImage");
  const typeTag = creatureArchiveTypeTag(creature);
  const region = creatureRegion(creature);
  const temperament = creatureTemperament(creature);
  const realtime = useRealtimeCollaboration();
  const realtimeTarget = { type: "creature" as const, id: creature.id, label: creature.name, module: "Bestiary" };
  const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);
  return (
    <AssignableModule
      as="div"
      className="bestiary-card-assignable"
      module={bestiaryAssignmentModule(creature, "overview", `${creature.name} Bestiary Entry`)}
    >
      <article
        className={`bestiary-card realtime-hover-surface ${selected ? "selected" : ""} ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
        onMouseLeave={() => realtime.setHoverTarget(null)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onClick();
        }}
      >
        {hoveringUsers.length > 0 && (
          <span className="realtime-hover-badge">
            {hoveringUsers.length === 1 ? `${hoveringUsers[0].name} is here` : `${hoveringUsers.length} people here`}
          </span>
        )}
        {onToggleFavorite && (
          <FavoriteButton active={isFavorite} label={creature.name} onToggle={onToggleFavorite} className="bestiary-card-favorite" />
        )}
        <div className="bestiary-card-image">
          {image ? (
            canAdjustImage ? (
              <button
                className="editable-image-trigger bestiary-image-adjust-trigger"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onAdjustImage?.(frameFromElement(event.currentTarget));
                }}
                title={`Adjust ${creature.name} archive image`}
              >
                <DriveAwareImage src={image} alt="" style={imageFitToStyle(imageFit)} />
                <span>Adjust</span>
              </button>
            ) : (
              <DriveAwareImage src={image} alt="" style={imageFitToStyle(imageFit)} />
            )
          ) : <CreaturePlaceholder />}
          {!image && <span className="bestiary-card-art-badge">Needs Art</span>}
        </div>
        <div className="bestiary-card-copy">
          <h4 className="font-display">{creature.name}</h4>
          <div className="bestiary-card-tags">
            <span>{typeTag}</span>
            <span>{region}</span>
          </div>
          <div className="bestiary-card-threat">
            <ThreatDots threat={temperament} />
            <small>{temperament}</small>
          </div>
        </div>
      </article>
    </AssignableModule>
  );
}

function CreatureDetails({
  creature,
  activePanelTab,
  expanded,
  editing,
  readOnly,
  onTabChange,
  onToggleExpanded,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onChange,
  onPersistChange,
  categories,
  categoryDriveFolder,
  onChooseDriveFolder,
  onChooseCategoryDriveFolder,
  onOpenImageManager,
  onOpenArtVault,
  onAdjustImage,
  onOpenFullStory,
  isFavorite,
  onToggleFavorite
}: {
  creature: BestiaryCreature;
  activePanelTab: CreaturePanelTab;
  expanded: boolean;
  editing: boolean;
  readOnly: boolean;
  onTabChange: (tab: CreaturePanelTab) => void;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onChange: (patch: Partial<BestiaryCreature>) => void;
  onPersistChange: (patch: Partial<BestiaryCreature>) => void;
  categories: string[];
  categoryDriveFolder: BestiaryDriveFolderTarget | null;
  onChooseDriveFolder: () => void;
  onChooseCategoryDriveFolder: () => void;
  onOpenImageManager: () => void;
  onOpenArtVault: () => void;
  onAdjustImage: (previewFrame?: ImagePreviewFrame, expandedImage?: boolean) => void;
  onOpenFullStory: () => void;
  isFavorite: boolean;
  onToggleFavorite?: () => void;
}) {
  const detailImageSlot: CreatureImageAdjustSlot = expanded ? "expandedImage" : "image";
  const detailImage = creatureImageForSlot(creature, detailImageSlot);
  const detailImageFit = creatureImageFitForSlot(creature, detailImageSlot);
  return (
    <>
      <button
        className="bestiary-detail-expand-toggle"
        onClick={onToggleExpanded}
        title={expanded ? "Shrink details panel" : "Expand details panel"}
        aria-label={expanded ? "Shrink details panel" : "Expand details panel"}
        aria-pressed={expanded}
      >
        <Icon name={expanded ? "ChevronsRight" : "ChevronsLeft"} className="h-4 w-4" />
        <span>{expanded ? "Shrink" : "Expand"}</span>
      </button>
      <header className="bestiary-detail-header">
        <div className="bestiary-detail-image">
          {detailImage ? (
            editing ? (
              <button className="editable-image-trigger bestiary-image-adjust-trigger" onClick={(event) => onAdjustImage(frameFromElement(event.currentTarget), expanded)}>
                <DriveAwareImage src={detailImage} alt="" style={imageFitToStyle(detailImageFit)} />
                <span>Adjust</span>
              </button>
            ) : (
              <DriveAwareImage src={detailImage} alt="" style={imageFitToStyle(detailImageFit)} />
            )
          ) : <CreaturePlaceholder />}
        </div>
        <div className="bestiary-detail-title">
          {editing ? (
            <input
              className="bestiary-edit-field title"
              value={creature.name}
              placeholder="Creature name"
              onChange={(event) => onChange({ name: event.target.value })}
            />
          ) : (
            <h3 className="font-display">{creature.name}</h3>
          )}
          <div className="bestiary-detail-pills">
            <span>{creature.type}</span>
            <span>{creatureTemperament(creature)}</span>
            <span>{creature.rarity}</span>
          </div>
          {editing ? (
            <textarea
              className="bestiary-edit-field"
              value={creature.description}
              placeholder="Short creature description"
              onChange={(event) => onChange({ description: event.target.value })}
            />
          ) : (
            <p>{creature.description || "No creature description yet."}</p>
          )}
        </div>
      </header>

      <div className="bestiary-detail-actions">
        <nav className="bestiary-panel-tabs" aria-label="Creature details">
          {creaturePanelTabs.map((tab) => (
            <button
              key={tab.id}
              className={activePanelTab === tab.id ? "active" : ""}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="bestiary-panel-tools">
          {onToggleFavorite && (
            <FavoriteButton active={isFavorite} label={creature.name} onToggle={onToggleFavorite} />
          )}
          <button className="button-frame bestiary-action-button" onClick={onOpenFullStory}>
            <Icon name="ScrollText" className="h-4 w-4" />
            Full Story
          </button>
          {!readOnly && (
            editing ? (
              <>
                <button className="button-frame bestiary-action-button" onClick={onOpenImageManager}>
                  <Icon name="Image" className="h-4 w-4" />
                  Images
                </button>
                <button className="button-frame bestiary-action-button" onClick={onSave}>
                  <Icon name="Save" className="h-4 w-4" />
                  Save
                </button>
                <button className="bestiary-action-button" onClick={onCancel}>Cancel</button>
                <button className="bestiary-action-button danger" onClick={onDelete}>Delete</button>
              </>
            ) : (
              <button className="button-frame bestiary-action-button" onClick={onEdit}>
                <Icon name="Edit3" className="h-4 w-4" />
                Edit
              </button>
            )
          )}
        </div>
      </div>

      {editing && (
        <div className="bestiary-edit-grid">
          <div className="bestiary-image-manager-callout">
            <span>Creature Images</span>
            <strong>Manage archive, detail, expanded, and hover images together.</strong>
            <button className="button-frame bestiary-action-button" onClick={onOpenImageManager}>
              <Icon name="Image" className="h-4 w-4" />
              Open Image Manager
            </button>
          </div>
          <EditSelect label="Bestiary Category" value={creature.category || "Wildlife"} options={categories} onChange={(category) => onChange({ category })} />
          <EditField label="Type" value={creature.type} onChange={(type) => onChange({ type })} />
          <EditSelect
            label="Temperament"
            value={creatureTemperament(creature)}
            options={bestiaryThreatOptions.filter((option) => option !== "All Temperaments")}
            onChange={(threatLevel) => onChange({ threatLevel })}
          />
          <EditField label="Habitat" value={creature.habitat} onChange={(habitat) => onChange({ habitat })} />
          <EditField label="Status" value={creature.status} onChange={(status) => onChange({ status })} />
          <div className="bestiary-drive-folder-picker">
            <span>Drive Upload Folder</span>
            <strong>{creature.driveFolderId || categoryDriveFolder?.id || "No creature or type folder set"}</strong>
            <small>
              {creature.driveFolderId
                ? "Creature-specific folder. This overrides the type folder."
                : categoryDriveFolder
                  ? `Inherited from the ${creature.category || "Bestiary"} type folder.`
                  : "Set a type folder or choose a creature-specific folder before uploading."}
            </small>
            <button className="bestiary-action-button" onClick={onChooseDriveFolder}>
              <Icon name="FolderOpen" className="h-4 w-4" />
              Choose Creature Folder
            </button>
            <button className="bestiary-action-button" onClick={onChooseCategoryDriveFolder}>
              <Icon name="FolderOpen" className="h-4 w-4" />
              {categoryDriveFolder ? "Change Type Folder" : "Set Type Folder"}
            </button>
          </div>
          <EditField
            label="Drive Folder Link"
            value={creature.driveFolderLink}
            onChange={(driveFolderLink) => {
              onChange({ driveFolderLink });
              onPersistChange({ driveFolderLink });
            }}
          />
        </div>
      )}

      <div className="bestiary-tab-page">
        <CreaturePanelTabContent
          creature={creature}
          activeTab={activePanelTab}
          editing={editing}
          readOnly={readOnly}
          onChange={onChange}
          onPersistChange={onPersistChange}
          onOpenArtVault={onOpenArtVault}
        />
      </div>
    </>
  );
}

function CreaturePanelTabContent({
  creature,
  activeTab,
  editing,
  readOnly,
  onChange,
  onPersistChange,
  onOpenArtVault
}: {
  creature: BestiaryCreature;
  activeTab: CreaturePanelTab;
  editing: boolean;
  readOnly: boolean;
  onChange: (patch: Partial<BestiaryCreature>) => void;
  onPersistChange: (patch: Partial<BestiaryCreature>) => void;
  onOpenArtVault: () => void;
}) {
  const setStats = (patch: Partial<BestiaryCreatureStats>) => onChange({ stats: { ...creature.stats, ...patch } });
  const setDrops = (patch: Partial<BestiaryCreatureDrops>, persist = false) => {
    const drops = { ...creature.drops, ...patch };
    onChange({ drops });
    if (persist) onPersistChange({ drops });
  };
  const setHabitat = (patch: Partial<BestiaryCreatureHabitatInfo>) => onChange({ habitatInfo: { ...creature.habitatInfo, ...patch } });
  const setLore = (patch: Partial<BestiaryCreatureLore>) => onChange({ lore: { ...creature.lore, ...patch } });
  const moduleFor = (sectionKey: string, moduleTitle: string) => bestiaryAssignmentModule(creature, sectionKey, moduleTitle);

  return (
    <section className="bestiary-panel-content">
      <div className="bestiary-quick-meta">
        <InfoPill label="Region" value={creatureRegion(creature)} />
        <InfoPill label="Threat" value={creatureTemperament(creature)} />
        <InfoPill label="Type" value={creatureArchiveTypeTag(creature)} />
      </div>

      {activeTab === "about" && (
        <div className="bestiary-panel-grid">
          <CreatureField label="Short Description" value={creature.description} editing={editing} textarea wide assignmentModule={moduleFor("description", "Short Description")} onChange={(description) => onChange({ description })} />
          <CreatureField label="Overview" value={creature.overview} editing={editing} textarea wide assignmentModule={moduleFor("overview", "Overview")} onChange={(overview) => onChange({ overview })} />
          <CreatureField label="Behavior" value={creature.behavior} editing={editing} textarea assignmentModule={moduleFor("behavior", "Behavior")} onChange={(behavior) => onChange({ behavior })} />
          <CreatureField label="Field Notes" value={creature.fieldNotes} editing={editing} textarea assignmentModule={moduleFor("field-notes", "Field Notes")} onChange={(fieldNotes) => onChange({ fieldNotes })} />
          <CreatureField label="Size" value={creature.size} editing={editing} onChange={(size) => onChange({ size })} />
          <CreatureField label="Diet" value={creature.diet} editing={editing} onChange={(diet) => onChange({ diet })} />
          <CreatureField label="Rarity" value={creature.rarity} editing={editing} onChange={(rarity) => onChange({ rarity })} />
          <CreatureField label="Gameplay Purpose" value={creature.gameplayPurpose} editing={editing} textarea assignmentModule={moduleFor("gameplay-purpose", "Gameplay Purpose")} onChange={(gameplayPurpose) => onChange({ gameplayPurpose })} />
          <CreatureField label="Production Notes" value={creature.productionNotes} editing={editing} textarea wide assignmentModule={moduleFor("production-notes", "Production Notes")} onChange={(productionNotes) => onChange({ productionNotes })} />
        </div>
      )}

      {activeTab === "loot" && (
        <div className="bestiary-panel-grid">
          <CreatureDropIconBoard
            title="Dropped Ingredient Icons"
            category="Dropped Ingredients"
            icons={creature.drops.icons}
            editing={editing}
            onChange={(icons) => setDrops({ icons }, true)}
          />
          <CreatureDropIconBoard
            title="Crafting Material Icons"
            category="Crafting Materials"
            icons={creature.drops.icons}
            editing={editing}
            onChange={(icons) => setDrops({ icons }, true)}
          />
          <CreatureDropIconBoard
            title="Rare Drop Icons"
            category="Rare Drops"
            icons={creature.drops.icons}
            editing={editing}
            onChange={(icons) => setDrops({ icons }, true)}
          />
          <CreatureField label="Dropped Ingredients" value={creature.drops.droppedIngredients} editing={editing} textarea assignmentModule={moduleFor("dropped-ingredients", "Dropped Ingredients")} onChange={(droppedIngredients) => setDrops({ droppedIngredients })} />
          <CreatureField label="Crafting Materials" value={creature.drops.craftingMaterials} editing={editing} textarea assignmentModule={moduleFor("crafting-materials", "Crafting Materials")} onChange={(craftingMaterials) => setDrops({ craftingMaterials })} />
          <CreatureField label="Rare Drops" value={creature.drops.rareDrops} editing={editing} textarea assignmentModule={moduleFor("rare-drops", "Rare Drops")} onChange={(rareDrops) => setDrops({ rareDrops })} />
          <CreatureField label="Cooking Uses" value={creature.drops.cookingUses} editing={editing} textarea assignmentModule={moduleFor("cooking-uses", "Cooking Uses")} onChange={(cookingUses) => setDrops({ cookingUses })} />
          <CreatureField label="Sell Value" value={creature.drops.sellValue} editing={editing} onChange={(sellValue) => setDrops({ sellValue })} />
          <CreatureField label="Recipe Connections" value={creature.drops.recipeConnections} editing={editing} textarea onChange={(recipeConnections) => setDrops({ recipeConnections })} />
          <CreatureField label="Health" value={creature.stats.health} editing={editing} onChange={(health) => setStats({ health })} />
          <CreatureField label="Damage" value={creature.stats.damage} editing={editing} onChange={(damage) => setStats({ damage })} />
          <CreatureField label="Speed" value={creature.stats.speed} editing={editing} onChange={(speed) => setStats({ speed })} />
          <CreatureField label="Defense" value={creature.stats.defense} editing={editing} onChange={(defense) => setStats({ defense })} />
          <CreatureField label="Weaknesses" value={creature.stats.weakness} editing={editing} textarea onChange={(weakness) => setStats({ weakness })} />
          <CreatureField label="Resistances" value={creature.stats.resistances} editing={editing} textarea onChange={(resistances) => setStats({ resistances })} />
          <CreatureField label="Abilities" value={creature.stats.abilities} editing={editing} textarea wide assignmentModule={moduleFor("abilities", "Abilities")} onChange={(abilities) => setStats({ abilities })} />
          <CreatureField label="Attack Patterns" value={creature.stats.attackPatterns} editing={editing} textarea wide assignmentModule={moduleFor("attack-patterns", "Attack Patterns")} onChange={(attackPatterns) => setStats({ attackPatterns })} />
          <CreatureField label="Boss Phase Notes" value={creature.stats.bossPhaseNotes} editing={editing} textarea wide assignmentModule={moduleFor("boss-phase-notes", "Boss Phase Notes")} onChange={(bossPhaseNotes) => setStats({ bossPhaseNotes })} />
        </div>
      )}

      {activeTab === "habitat" && (
        <div className="bestiary-panel-grid">
          <CreatureField label="Habitat / Region" value={creature.habitat} editing={editing} onChange={(habitat) => onChange({ habitat })} />
          <CreatureField label="Known Locations" value={creature.habitatInfo.knownLocations} editing={editing} textarea assignmentModule={moduleFor("known-locations", "Known Locations")} onChange={(knownLocations) => setHabitat({ knownLocations })} />
          <CreatureField label="Spawn Conditions" value={creature.habitatInfo.spawnConditions} editing={editing} textarea assignmentModule={moduleFor("spawn-conditions", "Spawn Conditions")} onChange={(spawnConditions) => setHabitat({ spawnConditions })} />
          <CreatureField label="Time of Day" value={creature.habitatInfo.timeOfDay} editing={editing} onChange={(timeOfDay) => setHabitat({ timeOfDay })} />
          <CreatureField label="Season" value={creature.habitatInfo.season} editing={editing} onChange={(season) => setHabitat({ season })} />
          <CreatureField label="Weather Conditions" value={creature.habitatInfo.weatherConditions} editing={editing} onChange={(weatherConditions) => setHabitat({ weatherConditions })} />
          <CreatureField label="Nearby Points of Interest" value={creature.habitatInfo.nearbyPointsOfInterest} editing={editing} textarea onChange={(nearbyPointsOfInterest) => setHabitat({ nearbyPointsOfInterest })} />
          <CreatureField label="Map Notes" value={creature.habitatInfo.mapNotes} editing={editing} textarea wide assignmentModule={moduleFor("map-notes", "Map Notes")} onChange={(mapNotes) => setHabitat({ mapNotes })} />
          <CreatureField label="Origin" value={creature.lore.origin} editing={editing} textarea assignmentModule={moduleFor("origin", "Origin")} onChange={(origin) => setLore({ origin })} />
          <CreatureField label="Cultural Meaning" value={creature.lore.culturalMeaning} editing={editing} textarea assignmentModule={moduleFor("cultural-meaning", "Cultural Meaning")} onChange={(culturalMeaning) => setLore({ culturalMeaning })} />
          <CreatureField label="Rumors" value={creature.lore.rumors} editing={editing} textarea assignmentModule={moduleFor("rumors", "Rumors")} onChange={(rumors) => setLore({ rumors })} />
          <CreatureField label="Related Quests" value={creature.lore.questConnections} editing={editing} textarea assignmentModule={moduleFor("related-quests", "Related Quests")} onChange={(questConnections) => setLore({ questConnections })} />
          <CreatureField label="Relationship to Other Creatures" value={creature.lore.relatedCreatures} editing={editing} textarea assignmentModule={moduleFor("related-creatures", "Relationship to Other Creatures")} onChange={(relatedCreatures) => setLore({ relatedCreatures })} />
          <CreatureField label="Story Spoilers / Hidden Notes" value={creature.lore.hiddenNotes} editing={editing} textarea wide assignmentModule={moduleFor("hidden-notes", "Story Spoilers / Hidden Notes")} onChange={(hiddenNotes) => setLore({ hiddenNotes })} />
          <CreatureField label="Visual Design Notes" value={creature.visualDesignNotes} editing={editing} textarea assignmentModule={moduleFor("visual-design-notes", "Visual Design Notes")} onChange={(visualDesignNotes) => onChange({ visualDesignNotes })} />
          <CreatureField label="Animation Notes" value={creature.animationNotes} editing={editing} textarea assignmentModule={moduleFor("animation-notes", "Animation Notes")} onChange={(animationNotes) => onChange({ animationNotes })} />
          <CreatureField label="Sound Notes" value={creature.soundNotes} editing={editing} textarea assignmentModule={moduleFor("sound-notes", "Sound Notes")} onChange={(soundNotes) => onChange({ soundNotes })} />
        </div>
      )}

      {!readOnly && (
        <button className="button-frame bestiary-art-vault-button" onClick={onOpenArtVault}>
          <Icon name="Image" className="h-5 w-5" />
          Open Art Vault
        </button>
      )}
    </section>
  );
}

function CreatureDropIconBoard({
  title,
  category,
  icons,
  editing,
  onChange
}: {
  title: string;
  category: string;
  icons: BestiaryDropIcon[];
  editing: boolean;
  onChange: (icons: BestiaryDropIcon[]) => void;
}) {
  const categoryIcons = icons.filter((icon) => icon.category === category);

  const addIcon = () => {
    onChange([
      ...icons,
      {
        id: `drop-icon-${slugify(category)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: defaultDropIconLabel(category),
        category,
        image: "",
        notes: ""
      }
    ]);
  };

  const updateIcon = (id: string, patch: Partial<BestiaryDropIcon>) => {
    onChange(icons.map((icon) => icon.id === id ? { ...icon, ...patch } : icon));
  };

  const removeIcon = (id: string) => {
    onChange(icons.filter((icon) => icon.id !== id));
  };

  const uploadIcon = async (id: string, file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      window.alert("Use a PNG, JPG, WEBP, or GIF inventory icon.");
      return;
    }
    try {
      const image = await readImageFileForStorage(file, {
        maxDimension: 128,
        maxDataUrlLength: 60_000,
        quality: 0.9
      });
      updateIcon(id, {
        image,
        label: icons.find((icon) => icon.id === id)?.label || file.name.replace(/\.[^.]+$/, "")
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not prepare that icon.");
    }
  };

  const importIconFromDrive = async (id: string) => {
    try {
      const file = await openGoogleDriveImagePicker(`Choose ${icons.find((icon) => icon.id === id)?.label || category} icon`);
      if (!file) return;
      updateIcon(id, {
        image: googleDriveThumbnailUrl(file.id),
        label: icons.find((icon) => icon.id === id)?.label || file.name.replace(/\.[^.]+$/, "")
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import that icon from Google Drive.");
    }
  };

  return (
    <section className="bestiary-drop-icon-board">
      <header>
        <div>
          <strong>{title}</strong>
          <span>Small inventory-style icons for in-game drops.</span>
        </div>
        {editing && (
          <button type="button" className="bestiary-drop-icon-add" onClick={addIcon}>
            <Icon name="Plus" className="h-4 w-4" />
            Add
          </button>
        )}
      </header>
      <div className="bestiary-drop-icon-grid">
        {categoryIcons.map((icon) => (
          <article key={icon.id} className="bestiary-drop-icon-card">
            <label className={`bestiary-drop-icon-upload ${editing ? "editable" : ""}`} title={editing ? "Upload or replace icon" : icon.label}>
              {icon.image ? <DriveAwareImage src={icon.image} alt="" /> : <span><Icon name="Package" className="h-6 w-6" /></span>}
              {editing && (
                <input
                  className="hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => {
                    uploadIcon(icon.id, event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              )}
            </label>
            {editing && (
              <button type="button" className="bestiary-drop-icon-drive" onClick={() => importIconFromDrive(icon.id)}>
                <Icon name="FolderOpen" className="h-3 w-3" />
                Drive
              </button>
            )}
            {editing ? (
              <input
                value={icon.label}
                placeholder="Drop name"
                onChange={(event) => updateIcon(icon.id, { label: event.target.value })}
              />
            ) : (
              <small>{icon.label}</small>
            )}
            {editing && (
              <button type="button" className="bestiary-drop-icon-remove" onClick={() => removeIcon(icon.id)} title="Remove icon">
                <Icon name="X" className="h-3 w-3" />
              </button>
            )}
          </article>
        ))}
        {!categoryIcons.length && (
          <div className="bestiary-drop-icon-empty">
            <Icon name="Package" className="h-5 w-5" />
            <span>{editing ? "Add an icon slot, then upload the inventory PNG." : "No icons yet."}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function defaultDropIconLabel(category: string) {
  if (category === "Rare Drops") return "Rare Drop";
  if (category === "Crafting Materials") return "Material";
  return "Ingredient";
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value || "Unknown"}</strong>
    </span>
  );
}

function OverviewTab({
  creature,
  editing,
  onChange
}: {
  creature: BestiaryCreature;
  editing: boolean;
  onChange: (patch: Partial<BestiaryCreature>) => void;
}) {
  return (
    <div className="bestiary-info-grid">
      <CreatureField label="Size" value={creature.size} editing={editing} onChange={(size) => onChange({ size })} />
      <CreatureField label="Diet" value={creature.diet} editing={editing} onChange={(diet) => onChange({ diet })} />
      <CreatureField label="Habitat" value={creature.habitat} editing={editing} onChange={(habitat) => onChange({ habitat })} />
      <CreatureField label="Temperament Tag" value={creatureTemperament(creature)} editing={editing} onChange={(threatLevel) => onChange({ threatLevel })} />
      <CreatureField label="Behavior Notes" value={creature.behavior} editing={editing} textarea onChange={(behavior) => onChange({ behavior })} />
      <CreatureField label="Rarity" value={creature.rarity} editing={editing} onChange={(rarity) => onChange({ rarity })} />
      <CreatureField label="Field Notes" value={creature.fieldNotes} editing={editing} textarea onChange={(fieldNotes) => onChange({ fieldNotes })} />
      <CreatureField label="Overview" value={creature.overview} editing={editing} textarea wide onChange={(overview) => onChange({ overview })} />
    </div>
  );
}

function StatsTab({
  creature,
  editing,
  onChange
}: {
  creature: BestiaryCreature;
  editing: boolean;
  onChange: (patch: Partial<BestiaryCreature>) => void;
}) {
  const setStats = (patch: Partial<BestiaryCreatureStats>) => onChange({ stats: { ...creature.stats, ...patch } });
  return (
    <div className="bestiary-info-grid">
      <CreatureField label="Health" value={creature.stats.health} editing={editing} onChange={(health) => setStats({ health })} />
      <CreatureField label="Damage" value={creature.stats.damage} editing={editing} onChange={(damage) => setStats({ damage })} />
      <CreatureField label="Speed" value={creature.stats.speed} editing={editing} onChange={(speed) => setStats({ speed })} />
      <CreatureField label="Defense" value={creature.stats.defense} editing={editing} onChange={(defense) => setStats({ defense })} />
      <CreatureField label="Aggression" value={creature.stats.aggression} editing={editing} onChange={(aggression) => setStats({ aggression })} />
      <CreatureField label="Weakness" value={creature.stats.weakness} editing={editing} onChange={(weakness) => setStats({ weakness })} />
      <CreatureField label="Resistances" value={creature.stats.resistances} editing={editing} onChange={(resistances) => setStats({ resistances })} />
      <CreatureField label="Abilities" value={creature.stats.abilities} editing={editing} textarea onChange={(abilities) => setStats({ abilities })} />
      <CreatureField label="Attack Patterns" value={creature.stats.attackPatterns} editing={editing} textarea onChange={(attackPatterns) => setStats({ attackPatterns })} />
      <CreatureField label="Boss Phase Notes" value={creature.stats.bossPhaseNotes} editing={editing} textarea wide onChange={(bossPhaseNotes) => setStats({ bossPhaseNotes })} />
    </div>
  );
}

function DropsTab({
  creature,
  editing,
  onChange
}: {
  creature: BestiaryCreature;
  editing: boolean;
  onChange: (patch: Partial<BestiaryCreature>) => void;
}) {
  const setDrops = (patch: Partial<BestiaryCreatureDrops>) => onChange({ drops: { ...creature.drops, ...patch } });
  return (
    <div className="bestiary-info-grid">
      <CreatureField label="Dropped Ingredients" value={creature.drops.droppedIngredients} editing={editing} textarea onChange={(droppedIngredients) => setDrops({ droppedIngredients })} />
      <CreatureField label="Crafting Materials" value={creature.drops.craftingMaterials} editing={editing} textarea onChange={(craftingMaterials) => setDrops({ craftingMaterials })} />
      <CreatureField label="Rare Drops" value={creature.drops.rareDrops} editing={editing} textarea onChange={(rareDrops) => setDrops({ rareDrops })} />
      <CreatureField label="Cooking Uses" value={creature.drops.cookingUses} editing={editing} textarea onChange={(cookingUses) => setDrops({ cookingUses })} />
      <CreatureField label="Sell Value" value={creature.drops.sellValue} editing={editing} onChange={(sellValue) => setDrops({ sellValue })} />
      <CreatureField label="Recipe Connections" value={creature.drops.recipeConnections} editing={editing} textarea onChange={(recipeConnections) => setDrops({ recipeConnections })} />
    </div>
  );
}

function HabitatTab({
  creature,
  editing,
  onChange
}: {
  creature: BestiaryCreature;
  editing: boolean;
  onChange: (patch: Partial<BestiaryCreature>) => void;
}) {
  const setHabitat = (patch: Partial<BestiaryCreatureHabitatInfo>) => onChange({ habitatInfo: { ...creature.habitatInfo, ...patch } });
  return (
    <div className="bestiary-info-grid">
      <CreatureField label="Known Locations" value={creature.habitatInfo.knownLocations} editing={editing} textarea onChange={(knownLocations) => setHabitat({ knownLocations })} />
      <CreatureField label="Spawn Conditions" value={creature.habitatInfo.spawnConditions} editing={editing} textarea onChange={(spawnConditions) => setHabitat({ spawnConditions })} />
      <CreatureField label="Time of Day" value={creature.habitatInfo.timeOfDay} editing={editing} onChange={(timeOfDay) => setHabitat({ timeOfDay })} />
      <CreatureField label="Season" value={creature.habitatInfo.season} editing={editing} onChange={(season) => setHabitat({ season })} />
      <CreatureField label="Weather Conditions" value={creature.habitatInfo.weatherConditions} editing={editing} onChange={(weatherConditions) => setHabitat({ weatherConditions })} />
      <CreatureField label="Nearby Points of Interest" value={creature.habitatInfo.nearbyPointsOfInterest} editing={editing} textarea onChange={(nearbyPointsOfInterest) => setHabitat({ nearbyPointsOfInterest })} />
      <CreatureField label="Map Notes" value={creature.habitatInfo.mapNotes} editing={editing} textarea wide onChange={(mapNotes) => setHabitat({ mapNotes })} />
    </div>
  );
}

function LoreTab({
  creature,
  editing,
  onChange
}: {
  creature: BestiaryCreature;
  editing: boolean;
  onChange: (patch: Partial<BestiaryCreature>) => void;
}) {
  const setLore = (patch: Partial<BestiaryCreatureLore>) => onChange({ lore: { ...creature.lore, ...patch } });
  return (
    <div className="bestiary-info-grid">
      <CreatureField label="Origin" value={creature.lore.origin} editing={editing} textarea onChange={(origin) => setLore({ origin })} />
      <CreatureField label="Cultural Meaning" value={creature.lore.culturalMeaning} editing={editing} textarea onChange={(culturalMeaning) => setLore({ culturalMeaning })} />
      <CreatureField label="Rumors" value={creature.lore.rumors} editing={editing} textarea onChange={(rumors) => setLore({ rumors })} />
      <CreatureField label="Quest Connections" value={creature.lore.questConnections} editing={editing} textarea onChange={(questConnections) => setLore({ questConnections })} />
      <CreatureField label="Relationship to Other Creatures" value={creature.lore.relatedCreatures} editing={editing} textarea onChange={(relatedCreatures) => setLore({ relatedCreatures })} />
      <CreatureField label="Story Spoilers / Hidden Notes" value={creature.lore.hiddenNotes} editing={editing} textarea wide onChange={(hiddenNotes) => setLore({ hiddenNotes })} />
    </div>
  );
}

function DescriptionTab({
  creature,
  editing,
  onChange,
  onOpenArtVault
}: {
  creature: BestiaryCreature;
  editing: boolean;
  onChange: (patch: Partial<BestiaryCreature>) => void;
  onOpenArtVault: () => void;
}) {
  void onOpenArtVault;
  return (
    <div className="bestiary-description-tab">
      <div className="bestiary-info-grid">
        <CreatureField label="Full Creature Description" value={creature.description} editing={editing} textarea wide onChange={(description) => onChange({ description })} />
        <CreatureField label="Visual Design Notes" value={creature.visualDesignNotes} editing={editing} textarea onChange={(visualDesignNotes) => onChange({ visualDesignNotes })} />
        <CreatureField label="Animation Notes" value={creature.animationNotes} editing={editing} textarea onChange={(animationNotes) => onChange({ animationNotes })} />
        <CreatureField label="Sound Notes" value={creature.soundNotes} editing={editing} textarea onChange={(soundNotes) => onChange({ soundNotes })} />
        <CreatureField label="Gameplay Purpose" value={creature.gameplayPurpose} editing={editing} textarea onChange={(gameplayPurpose) => onChange({ gameplayPurpose })} />
        <CreatureField label="Production Notes" value={creature.productionNotes} editing={editing} textarea wide onChange={(productionNotes) => onChange({ productionNotes })} />
      </div>
    </div>
  );
}

function CreatureArtVaultPage({
  creature,
  readOnly,
  onBack,
  onSaveCreature,
  currentUser,
  focusedAssignment,
  categoryDriveFolder = null,
  vaultEyebrow = "Creature Art Vault",
  backLabel = "Back to Bestiary",
  intro = "Track required creature art like a production quest board. Files stay in Google Drive; the Cook Book stores slot metadata only.",
  activitySubjectType = "creature",
  assignmentCategoryPrefix = "Creature Art Vault"
}: {
  creature: BestiaryCreature;
  readOnly: boolean;
  onBack: () => void;
  onSaveCreature: (creature: BestiaryCreature) => void;
  currentUser: GoogleAccountUser;
  focusedAssignment?: AssignmentRecord | null;
  categoryDriveFolder?: BestiaryDriveFolderTarget | null;
  vaultEyebrow?: string;
  backLabel?: string;
  intro?: string;
  activitySubjectType?: string;
  assignmentCategoryPrefix?: string;
}) {
  const [vault, setVault] = useState<CharacterArtVault>(() => normalizeCreatureArtVault(creature.artVault));
  const [editing, setEditing] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [slotSearch, setSlotSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState("All");
  const [slotMenuRef, setSlotMenuRef] = useState<VaultSlotRef | null>(null);
  const [slotDraft, setSlotDraft] = useState<VaultSlotDraft | null>(null);
  const [uploadTarget, setUploadTarget] = useState<VaultSlotRef | null>(null);
  const [busySlotId, setBusySlotId] = useState("");
  const [message, setMessage] = useState("");
  const inheritedUploadFolder = driveFolderTargetForCreature(creature, categoryDriveFolder);
  const [vaultUploadFolder, setVaultUploadFolder] = useState(() => inheritedUploadFolder);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setVault(normalizeCreatureArtVault(creature.artVault));
  }, [creature.id, creature.artVault]);

  useEffect(() => {
    const inherited = driveFolderTargetForCreature(creature, categoryDriveFolder);
    setVaultUploadFolder((current) => {
      if (!current.id || current.name === "Default Tales Folder") return inherited;
      return current;
    });
  }, [creature, categoryDriveFolder]);

  useEffect(() => {
    if (!focusedAssignment?.targetRoute.includes(":art-vault:")) return;
    const [, creatureId, , sectionId] = focusedAssignment.targetRoute.split(":");
    if (creatureId !== creature.id || !sectionId) return;
    setActiveSectionId("all");
    setCollapsedSections((current) => {
      const next = new Set(current);
      next.delete(sectionId);
      return next;
    });
  }, [creature.id, focusedAssignment]);

  const stats = artVaultStats(vault);
  const cover = creature.image || firstVaultImage(vault);
  const sections = useMemo(
    () => filteredVaultSections(vault, activeSectionId, slotSearch, slotFilter),
    [vault, activeSectionId, slotSearch, slotFilter]
  );
  const activeSection = vault.sections.find((section) => section.id === activeSectionId);
  const realtime = useRealtimeCollaboration();

  const commitVault = (nextVault: CharacterArtVault) => {
    const normalized = normalizeCreatureArtVault(nextVault);
    setVault(normalized);
    onSaveCreature(normalizeBestiaryCreature({ ...creature, artVault: normalized, updatedAt: nowIso() }));
  };

  const requireEdit = () => {
    if (editing) return true;
    window.alert("Click Edit Art Vault first to add, remove, or reorganize art slots.");
    return false;
  };

  const addSection = () => {
    if (!requireEdit()) return;
    const title = window.prompt("New Art Vault section name", "New Creature Art Section");
    if (!title?.trim()) return;
    const nextSection: ArtVaultSection = {
      id: `creature-section-${slugify(title)}-${Date.now()}`,
      title: title.trim(),
      description: "",
      order: vault.sections.length,
      slots: []
    };
    commitVault({ sections: [...vault.sections, nextSection] });
    setActiveSectionId(nextSection.id);
  };

  const addSlot = (sectionId: string) => {
    if (!requireEdit()) return;
    const section = vault.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const label = window.prompt("New required creature art slot", "New Creature Art");
    if (!label?.trim()) return;
    const slot: ArtVaultSlot = {
      id: `${sectionId}-${slugify(label)}-${Date.now()}`,
      label: label.trim(),
      requirementType: section.title,
      status: "empty",
      image: null,
      notes: "",
      order: section.slots.length
    };
    commitVault({
      sections: vault.sections.map((candidate) =>
        candidate.id === sectionId ? { ...candidate, slots: normalizeSlotOrders([...candidate.slots, slot]) } : candidate
      )
    });
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    if (!requireEdit()) return;
    const sections = [...vault.sections];
    const index = sections.findIndex((section) => section.id === sectionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    commitVault({ sections: normalizeSectionOrders(sections) });
  };

  const deleteSection = (sectionId: string) => {
    if (!requireEdit()) return;
    const section = vault.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    if (!window.confirm(`Delete "${section.title}" from this creature Art Vault? This will not delete anything from Google Drive.`)) return;
    commitVault({ sections: normalizeSectionOrders(vault.sections.filter((candidate) => candidate.id !== sectionId)) });
    setActiveSectionId("all");
  };

  const moveSlot = (ref: VaultSlotRef, direction: -1 | 1) => {
    if (!requireEdit()) return;
    commitVault({
      sections: vault.sections.map((section) => {
        if (section.id !== ref.sectionId) return section;
        const slots = [...section.slots];
        const index = slots.findIndex((slot) => slot.id === ref.slotId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= slots.length) return section;
        [slots[index], slots[target]] = [slots[target], slots[index]];
        return { ...section, slots: normalizeSlotOrders(slots) };
      })
    });
  };

  const deleteSlot = (ref: VaultSlotRef) => {
    if (!requireEdit()) return;
    const slot = findVaultSlot(vault, ref)?.slot;
    if (!slot) return;
    if (!window.confirm(`Delete the "${slot.label}" slot? This will not delete anything from Google Drive.`)) return;
    commitVault({
      sections: vault.sections.map((section) =>
        section.id === ref.sectionId
          ? { ...section, slots: normalizeSlotOrders(section.slots.filter((candidate) => candidate.id !== ref.slotId)) }
          : section
      )
    });
  };

  const openSlotEditor = (ref: VaultSlotRef) => {
    const match = findVaultSlot(vault, ref);
    if (!match) return;
    setSlotMenuRef(null);
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
            lastUpdatedAt: nowIso()
          }
        }
      : slotDraft;
    commitVault(saveVaultSlotDraft(vault, nextDraft));
    if (
      originalSlot &&
      slotDraft.status !== originalSlot.status &&
      (slotDraft.status === "approved" || slotDraft.status === "needs-revision")
    ) {
      recordArtVaultActivity({
        actionType: slotDraft.status === "approved" ? "approve" : "revision",
        slotName: slotDraft.label,
        subjectName: creature.name,
        subjectType: activitySubjectType,
        user: currentUser,
        fileName: nextDraft.image?.fileName || nextDraft.image?.title,
        driveFileId: nextDraft.image?.driveFileId
      });
    }
    setSlotDraft(null);
  };

  const chooseVaultUploadFolder = async () => {
    if (!isDriveConfigured()) {
      showDriveSetupMessage();
      return null;
    }
    try {
      const folder = await openGoogleDriveFolderPicker("Choose Creature Art Upload Folder");
      if (!folder) return null;
      const target = { id: folder.id, link: folder.url, name: folder.name };
      setVaultUploadFolder(target);
      setMessage(`Upload target set to "${folder.name}".`);
      return target;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not choose a Google Drive folder.");
      return null;
    }
  };

  const chooseSectionUploadFolder = async (sectionId: string) => {
    const folder = await chooseVaultUploadFolder();
    if (!folder) return;
    commitVault({
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
    const fallback = driveFolderTargetForCreature(creature, categoryDriveFolder);
    const id = section?.driveFolderId?.trim() || vaultUploadFolder.id || fallback.id || "";
    return {
      id,
      link: section?.driveFolderLink || vaultUploadFolder.link || fallback.link || googleDriveFolderLink(id),
      name: section?.driveFolderName || vaultUploadFolder.name || fallback.name || (id ? `${section?.title || creature.name} Drive Folder` : "")
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
    uploadInputRef.current?.click();
  };

  const uploadFileToSlot = async (file: File | undefined) => {
    const ref = uploadTarget;
    setUploadTarget(null);
    if (!file || !ref) return;
    if (!isSupportedImage(file)) {
      window.alert("Choose a JPG, JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    const match = findVaultSlot(vault, ref);
    if (!match) return;

    setBusySlotId(ref.slotId);
    setMessage(`Uploading "${file.name}" to Google Drive...`);
    try {
      const actionType = match.slot.image ? "replace" : "upload";
      const targetFolder = uploadFolderForSection(match.section);
      const targetFolderId = targetFolder.id.trim();
      if (!targetFolderId) throw new Error("Choose a Google Drive folder before uploading.");
      const uploaded = await uploadImageToDrive(file, targetFolderId, {
        naming: {
          subjectName: creature.name,
          categoryName: match.section.title,
          slotName: match.slot.label,
          sourceType: activitySubjectType,
          state: match.slot.status === "approved" ? "final" : "wip"
        }
      });
      const image = uploadedDriveFileToVaultImage(uploaded, match.slot.id, match.slot.requirementType, match.slot.notes, currentUser, targetFolder);
      commitVault(assignImageToVaultSlot(vault, ref, image));
      recordArtVaultActivity({
        actionType,
        slotName: match.slot.label,
        subjectName: creature.name,
        subjectType: activitySubjectType,
        user: currentUser,
        fileName: uploaded.name,
        driveFileId: uploaded.id
      });
      setSlotDraft((current) =>
        current && current.slotId === ref.slotId ? { ...current, image, status: "uploaded" } : current
      );
      setMessage(`Uploaded "${uploaded.name}" and assigned it to "${match.slot.label}".`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Try again.");
    } finally {
      setBusySlotId("");
    }
  };

  const importDriveArtToSlot = async (ref: VaultSlotRef) => {
    const match = findVaultSlot(vault, ref);
    if (!match) return;
    setBusySlotId(ref.slotId);
    setMessage("Opening Google Picker...");
    try {
      const actionType = match.slot.image ? "replace" : "upload";
      const picked = await openGooglePickerForCharacter(creature.id);
      if (!picked) {
        setMessage("");
        return;
      }
      handlePickedDriveFile(picked, creature.id);
      const image = pickedDriveFileToVaultImage(picked, match.slot.id, match.slot.requirementType, currentUser);
      commitVault(assignImageToVaultSlot(vault, ref, image));
      recordArtVaultActivity({
        actionType,
        slotName: match.slot.label,
        subjectName: creature.name,
        subjectType: activitySubjectType,
        user: currentUser,
        fileName: picked.name,
        driveFileId: picked.id
      });
      setSlotDraft((current) =>
        current && current.slotId === ref.slotId ? { ...current, image, status: "uploaded" } : current
      );
      setMessage(`Imported "${picked.name}" and assigned it to "${match.slot.label}".`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Picker could not import that image.");
    } finally {
      setBusySlotId("");
    }
  };

  const clearSlot = (ref: VaultSlotRef) => {
    const slot = findVaultSlot(vault, ref)?.slot;
    if (!slot) return;
    if (!window.confirm(`Clear assigned art from "${slot.label}"? This will not delete the Drive file.`)) return;
    const removedImage = slot.image;
    commitVault(clearVaultSlot(vault, ref));
    recordArtVaultActivity({
      actionType: "remove",
      slotName: slot.label,
      subjectName: creature.name,
      subjectType: activitySubjectType,
      user: currentUser,
      fileName: removedImage?.fileName || removedImage?.title,
      driveFileId: removedImage?.driveFileId
    });
    setSlotDraft((current) => current && current.slotId === ref.slotId ? { ...current, image: null, status: "empty" } : current);
    setSlotMenuRef(null);
  };

  const updateSlotStatus = (ref: VaultSlotRef, status: string) => {
    const slot = findVaultSlot(vault, ref)?.slot;
    commitVault(updateVaultSlotStatus(vault, ref, status, currentUser));
    if (slot && (status === "approved" || status === "needs-revision")) {
      recordArtVaultActivity({
        actionType: status === "approved" ? "approve" : "revision",
        slotName: slot.label,
        subjectName: creature.name,
        subjectType: activitySubjectType,
        user: currentUser,
        fileName: slot.image?.fileName || slot.image?.title,
        driveFileId: slot.image?.driveFileId
      });
    }
    setSlotMenuRef(null);
  };

  const downloadSlotImage = (slot: ArtVaultSlot) => {
    const url = slot.image?.thumbnailUrl || slot.image?.webViewLink;
    if (!url) {
      window.alert("No image has been assigned to this slot yet.");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slot.label || "creature-art"}.jpg`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    setSlotMenuRef(null);
  };

  return (
    <article className="character-art-vault-page creature-art-vault-page">
      <header className="character-art-vault-hero">
        <button className="character-codex-action-button" onClick={onBack}>
          <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
          {backLabel}
        </button>
        <div className="character-art-vault-cover">
          {cover ? <DriveAwareImage src={cover} alt="" /> : <CreaturePlaceholder />}
        </div>
        <div className="character-art-vault-title-block">
          <p>{vaultEyebrow}</p>
          <h1 className="font-display">{creature.name}</h1>
          <div className="character-art-vault-meta">
            <span>{creature.type}</span>
            <span>{creatureTemperament(creature)}</span>
            <span>{creature.status}</span>
          </div>
          <p className="character-art-vault-intro">
            {intro}
          </p>
        </div>
        <div className="character-art-vault-actions">
          {!readOnly && (
            editing ? (
              <>
                <button className="character-codex-action-button" onClick={() => setEditing(false)}>Done</button>
                <button className="button-frame character-codex-action-button" onClick={addSection}>
                  <Icon name="Plus" className="h-4 w-4" />
                  Section
                </button>
              </>
            ) : (
              <button className="button-frame character-codex-action-button" onClick={() => setEditing(true)}>
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
          <div className="character-art-vault-progress-bar"><span style={{ width: `${stats.percent}%` }} /></div>
        </div>
        <div className="character-art-vault-stat-grid">
          <VaultStat label="Required Art Slots" value={stats.total} />
          <VaultStat label="Filled Slots" value={stats.filled} />
          <VaultStat label="Missing Art" value={stats.missing} />
          <VaultStat label="Approved" value={stats.approved} />
        </div>
      </section>

      {message && <div className="character-art-vault-message">{message}</div>}

      <section className="character-art-vault-toolbar">
        <div className="character-art-vault-controls">
          <label className="character-art-vault-search">
            <Icon name="Search" className="h-4 w-4" />
            <input value={slotSearch} placeholder="Search art slots..." onChange={(event) => setSlotSearch(event.target.value)} />
          </label>
          <div className="character-art-vault-filter-row">
            {artVaultStatusFilters.map((filter) => (
              <button key={filter} className={slotFilter === filter ? "active" : ""} onClick={() => setSlotFilter(filter)}>
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="character-art-vault-tabs">
          <button className={activeSectionId === "all" ? "active" : ""} onClick={() => setActiveSectionId("all")}>All</button>
          {vault.sections.map((section) => (
            <button key={section.id} className={activeSectionId === section.id ? "active" : ""} onClick={() => setActiveSectionId(section.id)}>
              {section.title}
            </button>
          ))}
        </div>
      </section>

      {editing && activeSection && (
        <section className="character-art-vault-section-tools">
          <div>
            <label>
              <span>Section Name</span>
              <input
                className="character-codex-edit-field"
                value={activeSection.title}
                onChange={(event) => commitVault(updateVaultSection(vault, activeSection.id, { title: event.target.value }))}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                className="character-codex-edit-field"
                value={activeSection.description}
                onChange={(event) => commitVault(updateVaultSection(vault, activeSection.id, { description: event.target.value }))}
              />
            </label>
          </div>
          <div>
            <button onClick={() => moveSection(activeSection.id, -1)}>Move Up</button>
            <button onClick={() => moveSection(activeSection.id, 1)}>Move Down</button>
            <button className="character-art-vault-icon-only" onClick={() => addSlot(activeSection.id)} title="Add slot" aria-label="Add slot">
              <Icon name="Plus" className="h-4 w-4" />
            </button>
            <button className="danger" onClick={() => deleteSection(activeSection.id)}>Delete Section</button>
          </div>
        </section>
      )}

      <main className="character-art-vault-board">
        {sections.map((section) => (
          <section key={section.id} className="character-art-vault-section">
            <header className="character-art-vault-section-header">
              <button className="character-art-vault-section-toggle" onClick={() => toggleSetValue(setCollapsedSections, section.id)}>
                <Icon name="ChevronDown" className={`h-4 w-4 ${collapsedSections.has(section.id) ? "-rotate-90" : ""}`} />
                <Icon name="Image" className="h-5 w-5" />
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
                <button onClick={() => toggleSetValue(setCollapsedSections, section.id)} title={collapsedSections.has(section.id) ? "Expand section" : "Collapse section"}>
                  <Icon name="ChevronDown" className={`h-4 w-4 ${collapsedSections.has(section.id) ? "-rotate-90" : ""}`} />
                </button>
                {editing && activeSectionId === "all" && (
                  <button className="character-art-vault-icon-only" onClick={() => addSlot(section.id)} title="Add slot" aria-label="Add slot">
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
                  const assignmentModule = creatureArtVaultSlotModule(creature, section, slot, assignmentCategoryPrefix);
                  const realtimeTarget = {
                    type: "art-slot" as const,
                    id: assignmentModule.moduleId,
                    label: assignmentModule.moduleTitle,
                    module: "Art Vault"
                  };
                  const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);
                  return (
                    <AssignableModule
                      key={slot.id}
                      as="article"
                      className={`character-art-vault-slot-card realtime-hover-surface ${status} ${menuOpen ? "menu-open" : ""} ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
                      module={assignmentModule}
                      onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
                      onMouseLeave={() => realtime.setHoverTarget(null)}
                    >
                      {hoveringUsers.length > 0 && (
                        <span className="realtime-hover-badge">
                          {hoveringUsers.length === 1 ? `${hoveringUsers[0].name} is here` : `${hoveringUsers.length} people here`}
                        </span>
                      )}
                      <span className={`character-art-vault-status ${status}`}>{artVaultStatusText(slot.status)}</span>
                      <button className="character-art-vault-kebab" onClick={() => setSlotMenuRef(menuOpen ? null : ref)} title="Slot actions">...</button>
                      {menuOpen && (
                        <div className="character-art-vault-slot-menu">
                          <button onClick={() => { beginSlotUpload(ref); setSlotMenuRef(null); }} disabled={busySlotId === slot.id}>Upload / Replace image</button>
                          <button onClick={() => { importDriveArtToSlot(ref); setSlotMenuRef(null); }} disabled={busySlotId === slot.id}>Select from Google Drive</button>
                          <button onClick={() => downloadSlotImage(slot)} disabled={!slot.image}>Download image</button>
                          <button onClick={() => updateSlotStatus(ref, "approved")}>Mark approved</button>
                          <button onClick={() => updateSlotStatus(ref, "needs-revision")}>Mark needs revision</button>
                          <button onClick={() => clearSlot(ref)} disabled={!slot.image}>Remove image</button>
                          <button onClick={() => openSlotEditor(ref)}>Slot settings</button>
                          <button onClick={() => { moveSlot(ref, -1); setSlotMenuRef(null); }} disabled={!editing}>Move up</button>
                          <button onClick={() => { moveSlot(ref, 1); setSlotMenuRef(null); }} disabled={!editing}>Move down</button>
                          <button className="danger" onClick={() => { deleteSlot(ref); setSlotMenuRef(null); }} disabled={!editing}>Delete slot</button>
                        </div>
                      )}
                      <button className="character-art-vault-slot-main" onClick={() => openSlotEditor(ref)}>
                        <div className="character-art-vault-slot-preview">
                          {slot.image?.thumbnailUrl ? (
                            <DriveAwareImage src={slot.image.thumbnailUrl} alt="" />
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
      </main>

      <input
        ref={uploadInputRef}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => {
          uploadFileToSlot(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      {slotDraft && (
        <div className="character-art-vault-modal-backdrop">
          <section className="character-art-vault-slot-modal">
            <header>
              <div>
                <p>Creature Art Slot</p>
                <h2 className="font-display">{slotDraft.label}</h2>
              </div>
              <button className="character-codex-icon-button" onClick={() => setSlotDraft(null)} title="Close slot details">
                <Icon name="X" className="h-5 w-5" />
              </button>
            </header>
            <div className="character-art-vault-slot-modal-body">
              <div className="character-art-vault-slot-modal-preview">
                {slotDraft.image?.thumbnailUrl ? <DriveAwareImage src={slotDraft.image.thumbnailUrl} alt="" /> : <CreaturePlaceholder />}
                <span className={`character-art-vault-status ${slotDraft.status || "empty"}`}>{artVaultStatusText(slotDraft.status)}</span>
              </div>
              <div className="character-art-vault-slot-modal-fields">
                <label>
                  <span>Slot Label</span>
                  {editing ? (
                    <input className="character-codex-edit-field" value={slotDraft.label} onChange={(event) => setSlotDraft((current) => current ? { ...current, label: event.target.value } : current)} />
                  ) : (
                    <p className="character-codex-edit-field character-codex-static-field">{slotDraft.label}</p>
                  )}
                </label>
                <label>
                  <span>Section</span>
                  <CustomSelect
                    value={slotDraft.targetSectionId}
                    disabled={!editing}
                    onChange={(value) => setSlotDraft((current) => current ? { ...current, targetSectionId: value } : current)}
                    options={vault.sections.map((section) => ({ value: section.id, label: section.title }))}
                  />
                </label>
                <label>
                  <span>Requirement Type</span>
                  {editing ? (
                    <input className="character-codex-edit-field" value={slotDraft.requirementType} onChange={(event) => setSlotDraft((current) => current ? { ...current, requirementType: event.target.value } : current)} />
                  ) : (
                    <p className="character-codex-edit-field character-codex-static-field">{slotDraft.requirementType}</p>
                  )}
                </label>
                <label>
                  <span>Status</span>
                  <CustomSelect
                    value={slotDraft.status}
                    onChange={(value) => setSlotDraft((current) => current ? { ...current, status: value } : current)}
                    options={[
                      { value: "empty", label: "Missing" },
                      { value: "uploaded", label: "Uploaded" },
                      { value: "needs-revision", label: "Needs Revision" },
                      { value: "approved", label: "Approved" }
                    ]}
                  />
                </label>
                <label className="wide">
                  <span>Notes</span>
                  <textarea className="character-codex-edit-field tall" value={slotDraft.notes} onChange={(event) => setSlotDraft((current) => current ? { ...current, notes: event.target.value } : current)} />
                </label>
                <div className="character-art-vault-assigned-metadata">
                  <InfoLine label="Assigned Image" value={slotDraft.image?.title || "No art assigned"} />
                  <InfoLine label="Drive File ID" value={slotDraft.image?.driveFileId || "No Drive file ID"} />
                  <InfoLine label="Upload Folder" value={uploadFolderForSection(vault.sections.find((section) => section.id === slotDraft.sectionId)).name || uploadFolderForSection(vault.sections.find((section) => section.id === slotDraft.sectionId)).id || "Choose folder before upload"} />
                </div>
              </div>
            </div>
            <footer>
              <p>Clearing a slot only removes the slot assignment. It never deletes Drive files.</p>
              <div>
                <button className="character-codex-action-button" onClick={() => beginSlotUpload({ sectionId: slotDraft.sectionId, slotId: slotDraft.slotId })}>
                  <Icon name="Upload" className="h-4 w-4" />
                  Upload to Drive
                </button>
                <button className="character-codex-action-button" onClick={() => chooseSectionUploadFolder(slotDraft.sectionId)}>
                  <Icon name="FolderOpen" className="h-4 w-4" />
                  Choose Folder
                </button>
                <button className="character-codex-action-button" onClick={() => importDriveArtToSlot({ sectionId: slotDraft.sectionId, slotId: slotDraft.slotId })}>
                  <Icon name="Import" className="h-4 w-4" />
                  Import From Drive
                </button>
                <button className="character-codex-action-button" onClick={() => slotDraft.image?.webViewLink && window.open(slotDraft.image.webViewLink, "_blank", "noopener,noreferrer")} disabled={!slotDraft.image?.webViewLink}>
                  <Icon name="FolderOpen" className="h-4 w-4" />
                  Open in Drive
                </button>
                <button className="character-codex-action-button" onClick={() => downloadSlotImage(slotDraftToSlot(slotDraft))} disabled={!slotDraft.image}>
                  <Icon name="Download" className="h-4 w-4" />
                  Download
                </button>
                <button className="character-codex-action-button character-codex-danger-button" onClick={() => clearSlot({ sectionId: slotDraft.sectionId, slotId: slotDraft.slotId })} disabled={!slotDraft.image}>
                  Clear Assigned Art
                </button>
                <button className="button-frame character-codex-action-button" onClick={saveSlotDraft}>
                  <Icon name="Save" className="h-4 w-4" />
                  Save Slot
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </article>
  );
}

function BestiarySelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="bestiary-filter-select">
      <span>{label}</span>
      <CustomSelect value={value} onChange={onChange} options={options} />
    </label>
  );
}

function bestiaryAssignmentModule(creature: BestiaryCreature, sectionKey: string, moduleTitle: string): AssignableModuleInfo {
  return {
    moduleId: `${creature.id}-${sectionKey}`,
    moduleTitle,
    moduleType: "bestiary-section",
    entryId: creature.id,
    entryTitle: creature.name,
    entryCategory: `Bestiary / ${creature.type}`,
    targetRoute: `bestiary:${creature.id}:${sectionKey}`
  };
}

function creatureArtVaultSlotModule(
  creature: BestiaryCreature,
  section: ArtVaultSection,
  slot: ArtVaultSlot,
  categoryPrefix = "Creature Art Vault"
): AssignableModuleInfo {
  return {
    moduleId: `${creature.id}-art-vault-${slot.id}`,
    moduleTitle: `${creature.name}: ${slot.label}`,
    moduleType: "creature-art-vault-slot",
    entryId: creature.id,
    entryTitle: creature.name,
    entryCategory: `${categoryPrefix} / ${section.title}`,
    targetRoute: `bestiary:${creature.id}:art-vault:${section.id}:${slot.id}`
  };
}

function tabForBestiaryModule(moduleId: string): CreaturePanelTab {
  if (/(drop|crafting|rare|cooking|health|damage|speed|defense|weakness|resistance|abilit|attack|boss)/i.test(moduleId)) {
    return "loot";
  }
  if (/(habitat|location|spawn|season|weather|map|origin|culture|rumor|quest|creature|hidden|visual|animation|sound)/i.test(moduleId)) {
    return "habitat";
  }
  return "about";
}

function CreatureField({
  label,
  value,
  editing,
  textarea = false,
  wide = false,
  assignmentModule,
  onChange
}: {
  label: string;
  value: string;
  editing: boolean;
  textarea?: boolean;
  wide?: boolean;
  assignmentModule?: AssignableModuleInfo;
  onChange: (value: string) => void;
}) {
  const content = (
    <>
      <span>{label}</span>
      {editing ? (
        textarea ? (
          <textarea value={value} placeholder={`Add ${label.toLowerCase()}...`} onChange={(event) => onChange(event.target.value)} />
        ) : (
          <input value={value} placeholder={`Add ${label.toLowerCase()}...`} onChange={(event) => onChange(event.target.value)} />
        )
      ) : (
        <p>{value || "Not set yet."}</p>
      )}
    </>
  );
  const className = `bestiary-info-card ${wide ? "wide" : ""}`;

  if (assignmentModule) {
    return (
      <AssignableModule as="section" className={className} module={assignmentModule}>
        {content}
      </AssignableModule>
    );
  }

  return <label className={className}>{content}</label>;
}

function EditField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} placeholder={label} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CreatureImageUrlField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const applyValue = (nextValue: string) => onChange(resolveCreatureImageUrl(nextValue));
  return (
    <label className="bestiary-image-url-field">
      <span>{label}</span>
      <DriveImageSourceControls
        value={value}
        label={label}
        title={`Choose ${label}`}
        onChange={applyValue}
      />
    </label>
  );
}

function CreatureImageFrameEditor({
  creature,
  onChange
}: {
  creature: BestiaryCreature;
  onChange: (patch: Partial<BestiaryCreature>) => void;
}) {
  const image = creature.image || creature.hoverImage;
  return (
    <div className="bestiary-image-frame-editor">
      <div className="bestiary-image-frame-preview">
        {image ? <DriveAwareImage src={image} alt="" style={creatureImageStyle(creature)} /> : <CreaturePlaceholder />}
      </div>
      <div className="bestiary-image-frame-controls">
        <strong>Creature Gallery Framing</strong>
        <RangeField
          label="Move Left / Right"
          value={creature.imagePositionX}
          min={0}
          max={100}
          step={1}
          onChange={(imagePositionX) => onChange({ imagePositionX })}
        />
        <RangeField
          label="Move Up / Down"
          value={creature.imagePositionY}
          min={0}
          max={100}
          step={1}
          onChange={(imagePositionY) => onChange({ imagePositionY })}
        />
        <RangeField
          label="Zoom"
          value={creature.imageZoom}
          min={1}
          max={3}
          step={0.05}
          onChange={(imageZoom) => onChange({ imageZoom })}
        />
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="bestiary-range-field">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <em>{step < 1 ? value.toFixed(2) : Math.round(value)}</em>
    </label>
  );
}

function EditSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <CustomSelect value={value} onChange={onChange} options={options} />
    </label>
  );
}

function CreaturePlaceholder() {
  return (
    <div className="bestiary-creature-placeholder">
      <span />
      <Icon name="Swords" className="h-9 w-9" />
    </div>
  );
}

function ThreatDots({ threat }: { threat: string }) {
  const count = threatRank(threat);
  return (
    <span className="bestiary-threat-dots" aria-label={`Temperament ${threat}`}>
      {[0, 1, 2, 3, 4].map((index) => <i key={index} className={index < count ? "active" : ""} />)}
    </span>
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="character-drive-upload-info-row">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function filterAndSortCreatures(
  creatures: BestiaryCreature[],
  search: string,
  categoryTab: string,
  threatFilter: string,
  habitatFilter: string,
  sortMode: string
) {
  const query = search.trim().toLowerCase();
  const filtered = creatures.filter((creature) => {
    const haystack = [
      creature.name,
      creature.category,
      creature.type,
      creature.status,
      creature.threatLevel,
      creatureTemperament(creature),
      creature.rarity,
      creature.habitat,
      creature.behavior,
      creature.description,
      creature.overview,
      creature.fieldNotes,
      creature.productionNotes,
      JSON.stringify(creature.stats),
      JSON.stringify(creature.drops),
      JSON.stringify(creature.habitatInfo),
      JSON.stringify(creature.lore)
    ].join(" ").toLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      categoryMatchesCreature(categoryTab, creature) &&
      (threatFilter === "All Temperaments" || creatureTemperament(creature) === threatFilter) &&
      (habitatFilter === "All Habitats" || creature.habitat === habitatFilter)
    );
  });

  return [...filtered].sort((left, right) => {
    if (sortMode === "Temperament") return threatRank(right.threatLevel) - threatRank(left.threatLevel);
    if (sortMode === "Recently Updated") return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (sortMode === "Habitat") return left.habitat.localeCompare(right.habitat) || left.name.localeCompare(right.name);
    if (sortMode === "Type") return left.type.localeCompare(right.type) || left.name.localeCompare(right.name);
    return left.name.localeCompare(right.name);
  });
}

function categoryMatchesCreature(category: string, creature: BestiaryCreature) {
  if (category === "All") return true;
  if (creature.category && creature.category.toLowerCase() === category.toLowerCase()) return true;
  const haystack = [
    creature.name,
    creature.category,
    creature.type,
    creature.status,
    creature.threatLevel,
    creature.habitat,
    creature.behavior,
    creature.description,
    creature.overview,
    creature.fieldNotes,
    creature.lore.origin,
    creature.lore.rumors,
    creature.lore.hiddenNotes
  ].join(" ").toLowerCase();

  if (category === "Slimes") return /slime/.test(haystack);
  if (category === "Wildlife") return /wildlife|beast|boar|tortoise|bird|fish|animal/.test(haystack);
  if (category === "Insects") return /insect|bug|beetle|moth|grub|husk|prawn|cray|queen/.test(haystack);
  if (category === "Bosses") return /boss|mini-boss|miniboss|queen/.test(haystack) || creatureTemperament(creature) === "Boss";
  if (category === "Corrupted") return /corrupt|dark|cursed|hollow|dusk/.test(haystack);
  if (category === "Friendly") return /friendly|ally|passive|neutral|merchant|runs away/.test(haystack) || creatureTemperament(creature) === "Passive";
  if (category === "Region-Based") return Boolean(creatureRegion(creature) && creatureRegion(creature) !== "Unknown");
  return haystack.includes(category.toLowerCase());
}

function creatureArchiveTypeTag(creature: BestiaryCreature) {
  const haystack = `${creature.name} ${creature.category} ${creature.type} ${creature.status} ${creature.description}`.toLowerCase();
  if (creature.category && !["Region-Based"].includes(creature.category)) return singularBestiaryCategoryLabel(creature.category);
  if (/boss|queen/.test(haystack) || creatureTemperament(creature) === "Boss") return "Boss";
  if (/corrupt|dark|cursed|hollow|dusk/.test(haystack)) return "Corrupted";
  if (/slime/.test(haystack)) return "Slime";
  if (/insect|bug|beetle|moth|grub/.test(haystack)) return "Bug";
  if (/wildlife|beast|boar|tortoise|animal/.test(haystack)) return "Wildlife";
  if (/friendly|passive|neutral/.test(haystack)) return "Friendly";
  return creature.type || "Creature";
}

function loadBestiaryCategories() {
  try {
    const stored = localStorage.getItem(BESTIARY_CATEGORIES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const storedCategories = Array.isArray(parsed)
      ? parsed.map((item) => normalizeBestiaryCategoryName(String(item))).filter(Boolean)
      : [];
    return mergeBestiaryCategories(defaultBestiaryCategoryTabs, storedCategories);
  } catch {
    return defaultBestiaryCategoryTabs;
  }
}

function saveBestiaryCategories(categories: string[]) {
  try {
    localStorage.setItem(BESTIARY_CATEGORIES_KEY, JSON.stringify(mergeBestiaryCategories(defaultBestiaryCategoryTabs, categories)));
  } catch {
    // Category tabs are a convenience layer; the Bestiary still works if browser storage is unavailable.
  }
}

function mergeBestiaryCategories(...groups: string[][]) {
  const merged: string[] = [];
  groups.flat().forEach((item) => {
    const category = normalizeBestiaryCategoryName(item);
    if (!category) return;
    if (!merged.some((existing) => existing.toLowerCase() === category.toLowerCase())) {
      merged.push(category);
    }
  });
  return merged;
}

function normalizeBestiaryCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function createSlimeCreatureSlot(name: string) {
  const flavor = name.replace(/\s*Slime$/i, "");
  const flavorKey = flavor.toLowerCase();
  const slimeDetails: Record<string, { temperament: string; habitat: string; behavior: string; drops: string; uses: string }> = {
    bitter: {
      temperament: "Defensive",
      habitat: "Whisker Woods",
      behavior: "Keeps distance until disturbed, then lashes out with sharp bitter bursts.",
      drops: "Bitter slime gel, bitter essence",
      uses: "Useful for recipes that cut sweetness, antidotes, and sharp tonic flavors."
    },
    sweet: {
      temperament: "Passive",
      habitat: "Whisker Woods",
      behavior: "Bounces toward ripe fruit and usually flees when threatened.",
      drops: "Sweet slime gel, sugar sap",
      uses: "Useful for desserts, healing snacks, and gentle beginner recipes."
    },
    savory: {
      temperament: "Aggro When Hit",
      habitat: "Mushroom Grottos",
      behavior: "Calm while feeding, but stubbornly guards mineral-rich patches.",
      drops: "Savory slime gel, umami spores",
      uses: "Useful for stews, broths, stamina meals, and rich cooking bases."
    },
    sour: {
      temperament: "Runs Away When Hit",
      habitat: "Swamps",
      behavior: "Skittish and quick, leaving acidic splashes behind as it escapes.",
      drops: "Sour slime gel, tart droplets",
      uses: "Useful for bright sauces, cleansing tonics, and reactive puzzle meals."
    },
    salty: {
      temperament: "Territorial",
      habitat: "Caves",
      behavior: "Claims damp mineral pockets and bumps intruders away from salt clusters.",
      drops: "Salty slime gel, mineral flakes",
      uses: "Useful for preserving food, seasoning, stamina meals, and sea-style recipes."
    },
    spicy: {
      temperament: "Aggressive",
      habitat: "Mountains",
      behavior: "Hot-tempered and fast, flaring up when anything enters its path.",
      drops: "Spicy slime gel, pepper sparks",
      uses: "Useful for attack meals, warming tonics, and fire-flavored cooking."
    }
  };
  const details = slimeDetails[flavorKey] || {
    temperament: "Unknown",
    habitat: "Unknown",
    behavior: "Flavor-aspected slime behavior still needs design notes.",
    drops: `${flavor} slime gel`,
    uses: "Needs cooking and recipe design notes."
  };
  const stamp = nowIso();

  return normalizeBestiaryCreature({
    id: slugify(name) || `slime-${Date.now()}`,
    name,
    category: "Slimes",
    type: "Magical Creature",
    status: "WIP",
    threatLevel: details.temperament,
    rarity: "Common",
    size: "Small",
    diet: "Flavor-rich nutrients and forest residue",
    habitat: details.habitat,
    behavior: details.behavior,
    description: `${name} is a flavor-aspected slime used for ingredient drops, food magic, and recipe testing.`,
    overview: `${name} belongs to the slime flavor system and can act as a cooking ingredient substitute when its recipe logic is defined.`,
    fieldNotes: "Starter slot for slime design, drops, art, combat behavior, and recipe connections.",
    drops: {
      droppedIngredients: details.drops,
      craftingMaterials: "",
      rareDrops: "",
      cookingUses: details.uses,
      sellValue: "",
      recipeConnections: "",
      icons: []
    },
    lore: {
      origin: "Born from excess nutrients, flavor residue, or corruption depending on the region.",
      culturalMeaning: "",
      rumors: "",
      questConnections: "",
      relatedCreatures: "Part of the Slime Flavor / Element System.",
      hiddenNotes: ""
    },
    createdAt: stamp,
    updatedAt: stamp
  });
}

function singularBestiaryCategoryLabel(category: string) {
  if (category === "Slimes") return "Slime";
  if (category === "Bosses") return "Boss";
  if (category === "Insects") return "Insect";
  return category;
}

function bestiaryCategoryVaultToCreature(vault: BestiaryCategoryArtVault): BestiaryCreature {
  return normalizeBestiaryCreature({
    id: vault.id,
    name: vault.title || `${singularBestiaryCategoryLabel(vault.categoryName)} Art Vault`,
    category: vault.categoryName,
    type: `${singularBestiaryCategoryLabel(vault.categoryName)} Category`,
    status: "Shared Art",
    threatLevel: "General Vault",
    rarity: "Category",
    habitat: "All related habitats",
    description: vault.description,
    overview: vault.description,
    artVault: vault.artVault,
    driveFolderId: vault.driveFolderId,
    driveFolderLink: vault.driveFolderLink,
    createdAt: vault.createdAt,
    updatedAt: vault.updatedAt
  });
}

function creatureRegion(creature: BestiaryCreature) {
  return creature.habitat || creature.habitatInfo.knownLocations.split(",")[0]?.trim() || "Unknown";
}

function threatRank(threat: string) {
  const normalized = creatureTemperament({ threatLevel: threat } as BestiaryCreature).toLowerCase();
  if (normalized.includes("boss") || normalized.includes("aggressive")) return 5;
  if (normalized.includes("territorial")) return 4;
  if (normalized.includes("defensive") || normalized.includes("aggro")) return 3;
  if (normalized.includes("runs away")) return 2;
  if (normalized.includes("passive")) return 1;
  return 0;
}

function creatureTemperament(creature: Pick<BestiaryCreature, "threatLevel">) {
  const value = creature.threatLevel || "Unknown";
  const normalized = value.trim().toLowerCase();
  if (normalized === "harmless") return "Passive";
  if (normalized === "low") return "Runs Away When Hit";
  if (normalized === "medium") return "Aggro When Hit";
  if (normalized === "high") return "Aggressive";
  if (normalized.includes("run")) return "Runs Away When Hit";
  if (normalized.includes("aggro") && normalized.includes("hit")) return "Aggro When Hit";
  if (normalized === "aggro" || normalized.includes("aggressive")) return "Aggressive";
  if (normalized.includes("passive")) return "Passive";
  if (normalized.includes("defensive")) return "Defensive";
  if (normalized.includes("territorial")) return "Territorial";
  if (normalized.includes("boss")) return "Boss";
  return value || "Unknown";
}

function creatureImageStyle(creature: Pick<BestiaryCreature, "imagePositionX" | "imagePositionY" | "imageZoom">) {
  const x = clampNumber(creature.imagePositionX, 0, 100, 50);
  const y = clampNumber(creature.imagePositionY, 0, 100, 50);
  const zoom = clampNumber(creature.imageZoom, 1, 3, 1);
  const panFactor = zoom <= 1 ? 0 : (zoom - 1) / zoom;
  const translateX = (x - 50) * panFactor;
  const translateY = (y - 50) * panFactor;
  return {
    objectPosition: `${x}% ${y}%`,
    transform: `translate(${translateX}%, ${translateY}%) scale(${zoom})`,
    transformOrigin: "center center"
  };
}

function resolveCreatureImageUrl(value: string) {
  return resolveImageSourceUrl(value);
}

function frameFromElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height)
  };
}

function creatureImageForSlot(creature: BestiaryCreature, slot: CreatureImageAdjustSlot) {
  if (slot === "slotImage") return creature.slotImage;
  if (slot === "expandedImage") return creature.expandedImage;
  if (slot === "hoverImage") return creature.hoverImage;
  return creature.image;
}

function creatureImageFitForSlot(creature: BestiaryCreature, slot: CreatureImageAdjustSlot) {
  if (slot === "slotImage") return creature.slotImageFit;
  if (slot === "expandedImage") return creature.expandedImageFit;
  if (slot === "hoverImage") return creature.hoverImageFit || creature.slotImageFit;
  return creature.imageFit;
}

function creatureImageAspectForSlot(slot: CreatureImageAdjustSlot) {
  if (slot === "slotImage") return "1 / 1";
  if (slot === "expandedImage") return "1 / 1";
  if (slot === "hoverImage") return "1 / 1";
  return "16 / 10";
}

function creatureImageManagerSlots(creature: BestiaryCreature, categoryFolder?: BestiaryDriveFolderTarget | null) {
  const folder = driveFolderTargetForCreature(creature, categoryFolder);
  const folderId = folder.id;
  const folderLink = folder.link;
  const folderName = folder.name;
  return [
    {
      id: "slotImage",
      label: "Creature Archive Slot Image",
      description: "The smaller image shown on the Bestiary archive card.",
      imageUrl: creature.slotImage || "",
      imageFit: creatureImageFitForSlot(creature, "slotImage"),
      frameWidth: 190,
      frameHeight: 190,
      uploadNameContext: { subjectName: creature.name, categoryName: "Bestiary", slotName: "Archive Slot Image", sourceType: "Creature" },
      defaultFolderId: folderId,
      defaultFolderLink: folderLink,
      defaultFolderName: folderName
    },
    {
      id: "image",
      label: "Normal Detail Image",
      description: "The regular right-side Bestiary detail image.",
      imageUrl: creature.image || "",
      imageFit: creatureImageFitForSlot(creature, "image"),
      frameWidth: 300,
      frameHeight: 190,
      uploadNameContext: { subjectName: creature.name, categoryName: "Bestiary", slotName: "Detail Image", sourceType: "Creature" },
      defaultFolderId: folderId,
      defaultFolderLink: folderLink,
      defaultFolderName: folderName
    },
    {
      id: "expandedImage",
      label: "Expanded Detail Image",
      description: "The larger image used when the detail panel is expanded.",
      imageUrl: creature.expandedImage || "",
      imageFit: creatureImageFitForSlot(creature, "expandedImage"),
      frameWidth: 420,
      frameHeight: 420,
      uploadNameContext: { subjectName: creature.name, categoryName: "Bestiary", slotName: "Expanded Detail Image", sourceType: "Creature" },
      defaultFolderId: folderId,
      defaultFolderLink: folderLink,
      defaultFolderName: folderName
    },
    {
      id: "hoverImage",
      label: "Hover / Alternate Image",
      description: "Optional alternate image for hover or secondary creature states.",
      imageUrl: creature.hoverImage || "",
      imageFit: creatureImageFitForSlot(creature, "hoverImage"),
      frameWidth: 190,
      frameHeight: 190,
      uploadNameContext: { subjectName: creature.name, categoryName: "Bestiary", slotName: "Hover Alternate Image", sourceType: "Creature" },
      defaultFolderId: folderId,
      defaultFolderLink: folderLink,
      defaultFolderName: folderName
    }
  ];
}

function collectBestiaryCategoryDriveFiles(
  creatures: BestiaryCreature[],
  categoryName: string,
  categoryVault?: BestiaryCategoryArtVault
): BestiaryDriveFileMoveCandidate[] {
  const candidates = new Map<string, BestiaryDriveFileMoveCandidate>();
  creatures
    .filter((creature) => categoryMatchesCreature(categoryName, creature))
    .forEach((creature) => collectBestiaryCreatureDriveFiles(creature, candidates));
  if (categoryVault) collectArtVaultDriveFiles(categoryVault.artVault, `${categoryVault.categoryName} shared art`, candidates);
  return Array.from(candidates.values());
}

function collectBestiaryCreatureDriveFiles(
  creature: BestiaryCreature,
  candidates: Map<string, BestiaryDriveFileMoveCandidate>
) {
  addDriveFileCandidate(candidates, creature.slotImage, `${creature.name} archive slot image`, creature.name);
  addDriveFileCandidate(candidates, creature.image, `${creature.name} detail image`, creature.name);
  addDriveFileCandidate(candidates, creature.expandedImage, `${creature.name} expanded image`, creature.name);
  addDriveFileCandidate(candidates, creature.hoverImage, `${creature.name} hover image`, creature.name);
  creature.drops.icons.forEach((icon) => addDriveFileCandidate(candidates, icon.image, `${creature.name} ${icon.label}`, `${creature.name} drops`));
  collectArtVaultDriveFiles(creature.artVault, creature.name, candidates);
}

function collectArtVaultDriveFiles(
  vault: CharacterArtVault,
  source: string,
  candidates: Map<string, BestiaryDriveFileMoveCandidate>
) {
  vault.sections.forEach((section) => {
    section.slots.forEach((slot) => {
      const image = slot.image;
      if (!image) return;
      addDriveFileCandidate(
        candidates,
        image.driveFileId || image.thumbnailUrl || image.webViewLink || image.downloadUrl || "",
        `${source} - ${section.title} / ${slot.label}`,
        source
      );
    });
  });
}

function addDriveFileCandidate(
  candidates: Map<string, BestiaryDriveFileMoveCandidate>,
  value: string,
  label: string,
  source: string
) {
  const trimmed = value.trim();
  const rawDriveId = /^[a-zA-Z0-9_-]{10,}$/.test(trimmed) ? trimmed : "";
  const fileId = extractGoogleDriveFileId(trimmed) || rawDriveId;
  if (!fileId || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return;
  if (!candidates.has(fileId)) candidates.set(fileId, { fileId, label, source });
}

function creatureImagePatchForSlot(
  slot: CreatureImageAdjustSlot,
  imageUrl: string,
  imageFit: ImageFitSettings
): Partial<BestiaryCreature> {
  const normalizedFit = normalizeImageFit(imageFit);
  if (slot === "slotImage") return { slotImage: imageUrl, slotImageFit: normalizedFit };
  if (slot === "expandedImage") return { expandedImage: imageUrl, expandedImageFit: normalizedFit };
  if (slot === "hoverImage") return { hoverImage: imageUrl, hoverImageFit: normalizedFit };
  return { image: imageUrl, imageFit: normalizedFit };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}

function artVaultStats(vault: CharacterArtVault) {
  const slots = vault.sections.flatMap((section) => section.slots);
  const total = slots.length;
  const filled = slots.filter((slot) => slot.image).length;
  const approved = slots.filter((slot) => slot.status === "approved").length;
  const missing = total - filled;
  return {
    total,
    filled,
    approved,
    missing,
    percent: total ? Math.round((filled / total) * 100) : 0
  };
}

function firstVaultImage(vault: CharacterArtVault) {
  return vault.sections.flatMap((section) => section.slots).find((slot) => slot.image?.thumbnailUrl)?.image?.thumbnailUrl || "";
}

function filteredVaultSections(vault: CharacterArtVault, activeSectionId: string, search: string, filter: string) {
  const query = search.trim().toLowerCase();
  return vault.sections
    .filter((section) => activeSectionId === "all" || section.id === activeSectionId)
    .map((section) => ({
      ...section,
      slots: section.slots.filter((slot) => {
        const status = artVaultSlotStatus(slot);
        const matchesFilter =
          filter === "All" ||
          (filter === "Missing" && status === "empty") ||
          (filter === "Filled" && status !== "empty") ||
          (filter === "Needs Revision" && status === "needs-revision") ||
          (filter === "Approved" && status === "approved");
        const haystack = `${slot.label} ${slot.requirementType} ${slot.notes}`.toLowerCase();
        return matchesFilter && (!query || haystack.includes(query));
      })
    }))
    .filter((section) => section.slots.length || !query);
}

function findVaultSlot(vault: CharacterArtVault, ref: VaultSlotRef) {
  const section = vault.sections.find((candidate) => candidate.id === ref.sectionId);
  const slot = section?.slots.find((candidate) => candidate.id === ref.slotId);
  return section && slot ? { section, slot } : null;
}

function assignImageToVaultSlot(vault: CharacterArtVault, ref: VaultSlotRef, image: ArtVaultImageMetadata): CharacterArtVault {
  return {
    sections: vault.sections.map((section) =>
      section.id === ref.sectionId
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === ref.slotId ? { ...slot, image, status: "uploaded" } : slot
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
  const timestamp = nowIso();
  return {
    sections: vault.sections.map((section) =>
      section.id === ref.sectionId
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === ref.slotId
                ? {
                    ...slot,
                    status,
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

function updateVaultSection(vault: CharacterArtVault, sectionId: string, patch: Partial<ArtVaultSection>) {
  return {
    sections: vault.sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section)
  };
}

function saveVaultSlotDraft(vault: CharacterArtVault, draft: VaultSlotDraft): CharacterArtVault {
  const moving = draft.targetSectionId !== draft.sectionId;
  const updatedSlot = (slot: ArtVaultSlot): ArtVaultSlot => ({
    ...slot,
    label: draft.label,
    requirementType: draft.requirementType,
    status: draft.status,
    notes: draft.notes,
    image: draft.image
  });

  if (!moving) {
    return {
      sections: vault.sections.map((section) =>
        section.id === draft.sectionId
          ? { ...section, slots: section.slots.map((slot) => slot.id === draft.slotId ? updatedSlot(slot) : slot) }
          : section
      )
    };
  }

  const source = findVaultSlot(vault, { sectionId: draft.sectionId, slotId: draft.slotId });
  if (!source) return vault;
  return {
    sections: vault.sections.map((section) => {
      if (section.id === draft.sectionId) {
        return { ...section, slots: normalizeSlotOrders(section.slots.filter((slot) => slot.id !== draft.slotId)) };
      }
      if (section.id === draft.targetSectionId) {
        return { ...section, slots: normalizeSlotOrders([...section.slots, updatedSlot(source.slot)]) };
      }
      return section;
    })
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
  const timestamp = nowIso();
  return {
    id: `vault-image-${slotId}-${Date.now()}`,
    title: file.name,
    category,
    slotId,
    driveFileId: file.id,
    thumbnailUrl: googleDriveThumbnailUrl(file.id),
    webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    dateAdded: timestamp,
    uploadStatus: "uploaded-to-drive",
    notes,
    fileName: file.name,
    downloadUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
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
  const timestamp = nowIso();
  return {
    id: `vault-image-${slotId}-${Date.now()}`,
    title: file.name,
    category,
    slotId,
    driveFileId: file.id,
    thumbnailUrl: googleDriveThumbnailUrl(file.id),
    webViewLink: file.url || `https://drive.google.com/file/d/${file.id}/view`,
    dateAdded: timestamp,
    uploadStatus: "imported-from-drive",
    notes: "",
    fileName: file.name,
    downloadUrl: file.url || `https://drive.google.com/file/d/${file.id}/view`,
    uploadedByName: user.name,
    uploadedByEmail: user.email,
    uploadedAt: timestamp,
    lastUpdatedByName: user.name,
    lastUpdatedByEmail: user.email,
    lastUpdatedAt: timestamp
  };
}

function slotDraftToSlot(draft: VaultSlotDraft): ArtVaultSlot {
  return {
    id: draft.slotId,
    label: draft.label,
    requirementType: draft.requirementType,
    status: draft.status,
    image: draft.image,
    notes: draft.notes,
    order: 0
  };
}

function artVaultSlotStatus(slot: ArtVaultSlot) {
  if (slot.status === "approved") return "approved";
  if (slot.status === "needs-revision") return "needs-revision";
  return slot.image ? "uploaded" : "empty";
}

function artVaultStatusText(status: string) {
  if (status === "approved") return "Approved";
  if (status === "needs-revision") return "Needs Revision";
  if (status === "uploaded") return "Uploaded";
  return "Missing";
}

function sectionProgressLabel(section: ArtVaultSection) {
  const total = section.slots.length;
  const complete = section.slots.filter((slot) => slot.image).length;
  return `${complete} / ${total} Completed`;
}

function normalizeSectionOrders(sections: ArtVaultSection[]) {
  return sections.map((section, order) => ({ ...section, order }));
}

function normalizeSlotOrders(slots: ArtVaultSlot[]) {
  return slots.map((slot, order) => ({ ...slot, order }));
}

function toggleSetValue(setter: (updater: (current: Set<string>) => Set<string>) => void, value: string) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

function driveFolderTargetForCreature(
  creature: BestiaryCreature,
  categoryFolder?: BestiaryDriveFolderTarget | null
): BestiaryDriveFolderTarget {
  const creatureFolderId = creature.driveFolderId?.trim() || "";
  const categoryFolderId = categoryFolder?.id?.trim() || "";
  const defaultFolderId = getDriveSettings().defaultTalesFolderId.trim();
  const id = creatureFolderId || categoryFolderId || defaultFolderId;
  const link = creatureFolderId
    ? creature.driveFolderLink || googleDriveFolderLink(id)
    : categoryFolderId
      ? categoryFolder?.link || googleDriveFolderLink(id)
      : googleDriveFolderLink(id);
  const name = creatureFolderId
    ? `${creature.name} Drive Folder`
    : categoryFolderId
      ? categoryFolder?.name || `${creature.category || "Bestiary"} Drive Folder`
      : "Default Tales Folder";
  return { id, link, name };
}

function driveFolderForCreature(creature: BestiaryCreature, categoryFolder?: BestiaryDriveFolderTarget | null) {
  return driveFolderTargetForCreature(creature, categoryFolder).id;
}
