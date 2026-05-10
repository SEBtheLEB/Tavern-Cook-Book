import { useEffect, useMemo, useState } from "react";
import type { ActiveView, ArtVaultImageMetadata, ArtVaultSection, ArtVaultSlot, BestiaryCategoryArtVault, LoreDatabase, LoreEntry, SpriteAnimationSlotReference } from "../types";
import type { AssignableModuleInfo, AssignmentRecord } from "../utils/assignments";
import { statusLabel } from "../utils/assignments";
import {
  bestiaryCategoryVaultId,
  createBestiaryCategoryArtVaultRecord,
  normalizeBestiaryCategoryArtVault,
  normalizeCreatureArtVault
} from "../utils/bestiary";
import { normalizeArtVault } from "../utils/entries";
import { googleDriveFolderLink, openGoogleDriveFolderPicker, type GoogleDriveFolder } from "../utils/googlePicker";
import { googleDriveWebViewLink, normalizeImageFit } from "../utils/imageFit";
import { loadSpriteSheetAssets } from "../utils/spriteSheets";
import { CustomSelect } from "./CustomSelect";
import { Icon } from "./Icon";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { SpriteAnimation } from "./SpriteAnimation";
import { useAssignments } from "./AssignmentSystem";

export type ArtBinderKind = "all" | "character" | "bestiary" | "environment";

export interface ArtBinderInitialFilter {
  kind?: ArtBinderKind;
  groupKey?: string;
  subjectId?: string;
  category?: string;
}

interface ArtBinderSubject {
  id: string;
  kind: Exclude<ArtBinderKind, "all">;
  source: "character" | "creature" | "bestiary-category" | "environment";
  title: string;
  subtitle: string;
  groupKey: string;
  groupLabel: string;
  sections: ArtVaultSection[];
}

interface ArtBinderSlotCard {
  subject: ArtBinderSubject;
  section: ArtVaultSection;
  slot: ArtVaultSlot;
}

interface ArtBinderFolderGroup {
  category: string;
  cards: ArtBinderSlotCard[];
}

interface ArtBinderSubjectGroup {
  key: string;
  label: string;
  description: string;
  icon: string;
  count: number;
}

interface ArtBinderPageProps {
  database: LoreDatabase;
  readOnly: boolean;
  onDatabaseChange: (database: LoreDatabase) => void;
  initialFilter?: ArtBinderInitialFilter | null;
  onBack: () => void;
  onNavigate: (view: ActiveView) => void;
  onOpenEntry: (entry: LoreEntry) => void;
}

const kindOptions: { value: ArtBinderKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "character", label: "Characters" },
  { value: "bestiary", label: "Bestiary" },
  { value: "environment", label: "Environment" }
];

const binderStatusOptions = ["All", "Missing", "WIP", "Final", "Needs Revision"];

export function ArtBinderPage({
  database,
  readOnly,
  onDatabaseChange,
  initialFilter = null,
  onBack,
  onNavigate,
  onOpenEntry
}: ArtBinderPageProps) {
  const assignmentContext = useAssignments();
  const subjects = useMemo(() => buildArtBinderSubjects(database), [database]);
  const initialSubject = subjects.find((subject) => subject.id === initialFilter?.subjectId);
  const [kindFilter, setKindFilter] = useState<ArtBinderKind>(initialFilter?.kind || "all");
  const [subjectGroupFilter, setSubjectGroupFilter] = useState(initialFilter?.groupKey || initialSubject?.groupKey || "all");
  const [subjectFilter, setSubjectFilter] = useState(initialFilter?.subjectId || "all");
  const [categoryFilter, setCategoryFilter] = useState(initialFilter?.category || "all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set());
  const [editingCard, setEditingCard] = useState<ArtBinderSlotCard | null>(null);
  const [folderGroup, setFolderGroup] = useState<ArtBinderFolderGroup | null>(null);

  useEffect(() => {
    if (!initialFilter) return;
    const matchingSubject = subjects.find((subject) => subject.id === initialFilter.subjectId);
    setKindFilter(initialFilter.kind || "all");
    setSubjectGroupFilter(initialFilter.groupKey || matchingSubject?.groupKey || "all");
    setSubjectFilter(initialFilter.subjectId || "all");
    setCategoryFilter(initialFilter.category || "all");
  }, [initialFilter, subjects]);

  const visibleSubjects = subjects.filter((subject) =>
    (kindFilter === "all" || subject.kind === kindFilter) &&
    (subjectGroupFilter === "all" || subject.groupKey === subjectGroupFilter) &&
    (subjectFilter === "all" || subject.id === subjectFilter)
  );
  const subjectOptions = subjects.filter((subject) => kindFilter === "all" || subject.kind === kindFilter);
  const subjectGroups = buildSubjectGroups(subjectOptions, kindFilter);
  const specificSubjectOptions = subjectOptions.filter((subject) => subjectGroupFilter === "all" || subject.groupKey === subjectGroupFilter);
  const selectedGroupLabel = subjectGroupFilter === "all"
    ? subjectGroups.find((group) => group.key === "all")?.label || "All Subjects"
    : subjectGroups.find((group) => group.key === subjectGroupFilter)?.label || "Selected Subject";
  const categoryOptions = useMemo(
    () => unique(["all", ...visibleSubjects.flatMap((subject) => subject.sections.map((section) => section.title))]),
    [visibleSubjects]
  );
  const cards = visibleSubjects.flatMap((subject) =>
    subject.sections.flatMap((section) =>
      section.slots.map((slot) => ({ subject, section, slot }))
    )
  ).filter((card) => artBinderCardMatches(card, categoryFilter, statusFilter, search));
  const grouped = groupCardsByCategory(cards);
  const totalSlots = cards.length;
  const filledSlots = cards.filter((card) => isSlotFilled(card.slot)).length;
  const finalSlots = cards.filter((card) => artBinderStatus(card.slot) === "Final").length;
  const missingSlots = Math.max(0, totalSlots - filledSlots);
  const completion = totalSlots ? Math.round((filledSlots / totalSlots) * 100) : 0;
  const selectedAssignmentCards = cards.filter((card) => assignmentContext.isModuleSelected(artBinderSlotModule(card).moduleId));
  const editableVisibleSubjects = visibleSubjects.filter((subject) => subject.source !== "environment");

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const selectSubjectGroup = (groupKey: string) => {
    setSubjectGroupFilter(groupKey);
    setSubjectFilter("all");
    setCategoryFilter("all");
  };

  const openSubject = (subject: ArtBinderSubject) => {
    if (subject.kind === "character") {
      const entry = database.entries.find((candidate) => candidate.id === subject.id);
      if (entry) onOpenEntry(entry);
      else onNavigate("characters");
      return;
    }
    if (subject.kind === "bestiary") {
      onNavigate("bestiary");
      return;
    }
    onNavigate("world");
  };

  const saveBinderSlotImage = (slots: ImageManagerSlotDraft[]) => {
    if (!editingCard) return;
    const imageSlot = slots[0];
    if (!imageSlot) return;
    onDatabaseChange(updateDatabaseSlotImage(database, editingCard, imageSlot));
    setEditingCard(null);
  };

  const openSlotManager = (card: ArtBinderSlotCard) => {
    if (readOnly) return;
    setEditingCard(card);
  };

  const toggleAssignmentSelection = (card: ArtBinderSlotCard) => {
    assignmentContext.toggleModuleSelection(artBinderSlotModule(card));
  };

  const activateCard = (card: ArtBinderSlotCard) => {
    if (assignmentContext.assignMode) {
      toggleAssignmentSelection(card);
      return;
    }
    openSlotManager(card);
  };

  const assignSelectedCards = () => {
    if (!selectedAssignmentCards.length) return;
    assignmentContext.openSelectedAssignPopup();
  };

  const chooseFolderForSection = async (card: ArtBinderSlotCard) => {
    if (readOnly) return;
    const folder = await openGoogleDriveFolderPicker(`Choose folder for ${card.subject.title} / ${card.section.title}`);
    if (!folder) return;
    onDatabaseChange(updateDatabaseSectionFolder(database, card, folder));
  };

  const clearFolderForSection = (card: ArtBinderSlotCard) => {
    if (readOnly) return;
    onDatabaseChange(updateDatabaseSectionFolder(database, card, null));
  };

  const addCategoryToVisibleSubjects = () => {
    if (readOnly) return;
    if (!editableVisibleSubjects.length) {
      window.alert("Choose a character, bestiary, or category subject before adding an Art Binder category.");
      return;
    }
    const title = window.prompt(`New Art Binder category name for ${editableVisibleSubjects.length} visible subject${editableVisibleSubjects.length === 1 ? "" : "s"}`)?.trim();
    if (!title) return;
    const slotLabel = window.prompt("First slot name for this category", "New Art Slot")?.trim() || "New Art Slot";
    onDatabaseChange(updateDatabaseAddArtBinderCategory(database, editableVisibleSubjects, title, slotLabel));
    setCategoryFilter(title);
    setCollapsedCategories((current) => {
      const next = new Set(current);
      next.delete(title);
      return next;
    });
  };

  const renameCategory = (group: ArtBinderFolderGroup) => {
    if (readOnly) return;
    const cardsToRename = uniqueSectionCards(group.cards).filter((card) => card.subject.source !== "environment");
    if (!cardsToRename.length) {
      window.alert("This category is generated from environment media and cannot be renamed from the Art Binder yet.");
      return;
    }
    const nextTitle = window.prompt("Rename Art Binder category", group.category)?.trim();
    if (!nextTitle || nextTitle === group.category) return;
    onDatabaseChange(updateDatabaseRenameArtBinderCategory(database, cardsToRename, nextTitle));
    setCategoryFilter((current) => current === group.category ? nextTitle : current);
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.delete(group.category)) next.add(nextTitle);
      return next;
    });
  };

  const addSlotToCategory = (group: ArtBinderFolderGroup) => {
    if (readOnly) return;
    const cardsToUpdate = uniqueSectionCards(group.cards).filter((card) => card.subject.source !== "environment");
    if (!cardsToUpdate.length) {
      window.alert("This category is generated from environment media and cannot receive custom slots from the Art Binder yet.");
      return;
    }
    const slotLabel = window.prompt(`Add slot to ${group.category}`, "New Art Slot")?.trim();
    if (!slotLabel) return;
    const requirementType = window.prompt("Requirement type", group.category)?.trim() || group.category;
    onDatabaseChange(updateDatabaseAddSlotToCategory(database, cardsToUpdate, slotLabel, requirementType));
  };

  return (
    <section className="art-binder-page">
      <header className="art-binder-hero">
        <button className="character-codex-action-button" onClick={onBack}>
          <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
          Back to Art Vault
        </button>
        <div>
          <p>Studio Asset Index</p>
          <h1 className="font-display">The Art Binder</h1>
          <span>Browse every art slot by category, then filter down to Gwen, one creature, a slime family, or the whole production board.</span>
        </div>
        <div className="art-binder-progress">
          <strong>{completion}%</strong>
          <span>{filledSlots} / {totalSlots} slots filled</span>
          <i><b style={{ width: `${completion}%` }} /></i>
        </div>
        {!readOnly && (
          <div className="art-binder-hero-actions">
            <button className="button-frame" onClick={addCategoryToVisibleSubjects} disabled={!editableVisibleSubjects.length}>
              <Icon name="Plus" className="h-4 w-4" />
              Add Category
            </button>
          </div>
        )}
      </header>

      <section className="art-binder-stats">
        <BinderStat icon="Image" label="Visible Slots" value={totalSlots} />
        <BinderStat icon="Upload" label="Filled" value={filledSlots} />
        <BinderStat icon="ShieldAlert" label="Missing" value={missingSlots} />
        <BinderStat icon="Star" label="Final" value={finalSlots} />
      </section>

      <section className="art-binder-filters">
        <label className="art-binder-search">
          <Icon name="Search" className="h-4 w-4" />
          <input value={search} placeholder="Search art slots, characters, creatures..." onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          <span>Board</span>
          <CustomSelect
            value={kindFilter}
            options={kindOptions.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(value) => {
              const nextKind = value as ArtBinderKind;
              setKindFilter(nextKind);
              setSubjectGroupFilter("all");
              setSubjectFilter("all");
              setCategoryFilter("all");
            }}
          />
        </label>
        <label>
          <span>Specific</span>
          <CustomSelect
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { value: "all", label: subjectGroupFilter === "all" ? "All Boards" : `All ${selectedGroupLabel}` },
              ...specificSubjectOptions.map((subject) => ({ value: subject.id, label: subject.title }))
            ]}
          />
        </label>
        <label>
          <span>Art Category</span>
          <CustomSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions.map((category) => ({ value: category, label: category === "all" ? "All Categories" : category }))}
          />
        </label>
        <label>
          <span>Status</span>
          <CustomSelect value={statusFilter} onChange={setStatusFilter} options={binderStatusOptions} />
        </label>
      </section>

      {assignmentContext.assignMode && !readOnly && (
        <section className="art-binder-assignment-toolbar">
          <div>
            <p>Assign Mode</p>
            <strong>{selectedAssignmentCards.length} slot{selectedAssignmentCards.length === 1 ? "" : "s"} selected</strong>
            <span>Click Art Binder slots to build a batch, then assign them to a teammate.</span>
          </div>
          <div>
            <button className="button-frame" disabled={!selectedAssignmentCards.length} onClick={assignSelectedCards}>
              <Icon name="Clipboard" className="h-4 w-4" />
              Assign Selected
            </button>
            <button disabled={!selectedAssignmentCards.length} onClick={assignmentContext.clearSelectedModules}>
              Clear Selection
            </button>
          </div>
        </section>
      )}

      <section className="art-binder-subject-board">
        <div className="art-binder-subject-board-heading">
          <div>
            <p>Choose Subject</p>
            <h2 className="font-display">Broad Asset Shelves</h2>
          </div>
          <span>Pick a broad shelf first, like Slimes, Bosses, or Characters. Then narrow down to one specific creature or person.</span>
        </div>
        <div className="art-binder-subject-buttons">
          {subjectGroups.map((group) => (
            <button
              key={group.key}
              className={subjectGroupFilter === group.key ? "active" : ""}
              onClick={() => selectSubjectGroup(group.key)}
            >
              <Icon name={group.icon} className="h-5 w-5" />
              <span>
                <strong>{group.label}</strong>
                <small>{group.description}</small>
              </span>
              <em>{group.count}</em>
            </button>
          ))}
        </div>
      </section>

      <main className="art-binder-categories">
        {grouped.map((group) => {
          const isCollapsed = collapsedCategories.has(group.category);
          return (
            <section key={group.category} className={`art-binder-category ${isCollapsed ? "collapsed" : ""}`}>
              <header>
                <button className="art-binder-category-toggle" onClick={() => toggleCategoryCollapse(group.category)} aria-expanded={!isCollapsed}>
                  <Icon name="ChevronDown" className="h-4 w-4" />
                  <div>
                    <p>Art Category</p>
                    <h2 className="font-display">{group.category}</h2>
                  </div>
                </button>
                <div className="art-binder-category-actions">
                  <span>{group.cards.length} slot{group.cards.length === 1 ? "" : "s"}</span>
                  {!readOnly && (
                    <>
                      <button className="art-binder-set-folder-button" onClick={() => renameCategory(group)}>
                        <Icon name="Edit3" className="h-4 w-4" />
                        Rename
                      </button>
                      <button className="art-binder-set-folder-button" onClick={() => addSlotToCategory(group)}>
                        <Icon name="Plus" className="h-4 w-4" />
                        Slot
                      </button>
                      <button
                        className="art-binder-set-folder-button"
                        onClick={() => setFolderGroup({ category: group.category, cards: uniqueSectionCards(group.cards) })}
                      >
                        <Icon name="FolderOpen" className="h-4 w-4" />
                        Set Folders
                      </button>
                    </>
                  )}
                </div>
              </header>
              {!isCollapsed && (
                <div className="art-binder-grid">
                  {group.cards.map((card) => (
                    <ArtBinderCard
                      key={`${card.subject.id}-${card.section.id}-${card.slot.id}`}
                      card={card}
                      readOnly={readOnly}
                      selected={assignmentContext.isModuleSelected(artBinderSlotModule(card).moduleId)}
                      assignMode={assignmentContext.assignMode}
                      assignment={assignmentContext.assignmentForModule(artBinderSlotModule(card).moduleId)}
                      focused={assignmentContext.focusedAssignment?.moduleId === artBinderSlotModule(card).moduleId}
                      onActivate={activateCard}
                      onOpenSubject={openSubject}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {!grouped.length && (
          <div className="art-binder-empty">
            <Icon name="Search" className="h-10 w-10" />
            <strong>No art slots match these filters.</strong>
            <span>Try All Subjects, All Categories, or a different search.</span>
          </div>
        )}
      </main>
      {editingCard && (
        <ImageManagerModal
          title={`${editingCard.subject.title} / ${editingCard.slot.label}`}
          subtitle="Upload, import, download, adjust, and mark this slot as WIP or Final. Saving writes back to the source page."
          slots={[artBinderImageManagerSlot(editingCard)]}
          onClose={() => setEditingCard(null)}
          onSave={saveBinderSlotImage}
        />
      )}
      {folderGroup && (
        <ArtBinderFolderModal
          category={folderGroup.category}
          cards={folderGroup.cards}
          onChooseFolder={chooseFolderForSection}
          onClearFolder={clearFolderForSection}
          onClose={() => setFolderGroup(null)}
        />
      )}
    </section>
  );
}

function ArtBinderCard({
  card,
  readOnly,
  selected,
  assignMode,
  assignment,
  focused,
  onActivate,
  onOpenSubject
}: {
  card: ArtBinderSlotCard;
  readOnly: boolean;
  selected: boolean;
  assignMode: boolean;
  assignment: AssignmentRecord | null;
  focused: boolean;
  onActivate: (card: ArtBinderSlotCard) => void;
  onOpenSubject: (subject: ArtBinderSubject) => void;
}) {
  const module = artBinderSlotModule(card);

  return (
    <article
      className={`art-binder-card ${artBinderStatusClass(card.slot)} ${readOnly ? "" : "is-clickable"} ${assignMode ? "assignable-module" : ""} ${selected ? "assignment-selected" : ""} ${focused ? "assignment-focus" : ""}`}
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
      title={readOnly ? undefined : assignMode ? "Select this slot for assignment" : "Open upload, import, download, and image adjustment tools"}
      data-module-id={module.moduleId}
      data-module-title={module.moduleTitle}
      data-module-type={module.moduleType}
      onClick={() => onActivate(card)}
      onKeyDown={(event) => {
        if (readOnly) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(card);
        }
      }}
    >
      {assignMode && !readOnly && (
        <span className={`art-binder-select-corner ${selected ? "active" : ""}`}>
          <Icon name={selected ? "Check" : "Clipboard"} className="h-4 w-4" />
        </span>
      )}
      {assignment && (
        <span className={`art-binder-assignment-badge status-${assignment.status}`}>
          {statusLabel(assignment.status)}: {assignment.assignedToName}
        </span>
      )}
      <div className="art-binder-card-image">
        {card.slot.image?.spriteAnimation ? (
          <ArtBinderSpriteAnimation reference={card.slot.image.spriteAnimation} />
        ) : card.slot.image?.thumbnailUrl ? (
          <img src={card.slot.image.thumbnailUrl} alt="" />
        ) : (
          <Icon name="Image" className="h-8 w-8" />
        )}
      </div>
      <div className="art-binder-card-copy">
        <span className="art-binder-kind">{kindLabel(card.subject.kind)}</span>
        <h3>{card.slot.label}</h3>
        <strong>{card.subject.title}</strong>
        <p>{card.slot.requirementType || card.section.title}</p>
        {card.slot.notes && <small>{card.slot.notes}</small>}
      </div>
      <footer>
        <span className={`art-binder-status ${artBinderStatusClass(card.slot)}`}>{artBinderStatus(card.slot)}</span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onOpenSubject(card.subject);
          }}
        >
          Open Source
        </button>
      </footer>
    </article>
  );
}

function BinderStat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <article>
      <Icon name={icon} className="h-5 w-5" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function buildArtBinderSubjects(database: LoreDatabase): ArtBinderSubject[] {
  const characters = database.entries
    .filter(isCharacterEntry)
    .map((entry) => ({
      id: entry.id,
      kind: "character" as const,
      source: "character" as const,
      title: entry.title,
      subtitle: entry.type || "Character",
      groupKey: "character-all",
      groupLabel: "Characters",
      sections: normalizeArtVault(entry.artVault).sections
    }));

  const creatures = (database.bestiary || []).map((creature) => ({
    id: creature.id,
    kind: "bestiary" as const,
    source: "creature" as const,
    title: creature.name,
    subtitle: creature.type || "Creature",
    groupKey: artBinderGroupKey("bestiary", creature.category || creature.type || "Creatures"),
    groupLabel: creature.category || creature.type || "Creatures",
    sections: normalizeCreatureArtVault(creature.artVault).sections
  }));

  const savedCategoryVaults = database.bestiaryCategoryVaults || [];
  const savedCategoryVaultIds = new Set(savedCategoryVaults.map((vault) => vault.id));
  const virtualCategoryVaults = unique((database.bestiary || []).map((creature) => creature.category).filter(Boolean))
    .map((category) => createBestiaryCategoryArtVaultRecord(category, database.bestiary || []))
    .filter((vault) => !savedCategoryVaultIds.has(vault.id) && vault.id === bestiaryCategoryVaultId(vault.categoryName));

  const categoryVaults = [...savedCategoryVaults, ...virtualCategoryVaults].map((vault: BestiaryCategoryArtVault) => {
    const normalized = normalizeBestiaryCategoryArtVault(vault, vault.categoryName, database.bestiary || []);
    return {
      id: normalized.id,
      kind: "bestiary" as const,
      source: "bestiary-category" as const,
      title: normalized.title,
      subtitle: `${normalized.categoryName} Category Vault`,
      groupKey: artBinderGroupKey("bestiary", normalized.categoryName),
      groupLabel: normalized.categoryName,
      sections: normalized.artVault.sections
    };
  });

  const environments = database.entries
    .filter((entry) => entry.category === "World")
    .map((entry) => ({
      id: entry.id,
      kind: "environment" as const,
      source: "environment" as const,
      title: entry.title,
      subtitle: entry.type || "World",
      groupKey: artBinderGroupKey("environment", entry.type || "World"),
      groupLabel: entry.type || "World",
      sections: environmentSections(entry)
    }));

  return [...characters, ...creatures, ...categoryVaults, ...environments];
}

function environmentSections(entry: LoreEntry): ArtVaultSection[] {
  const sectionId = `${entry.id}-environment-images`;
  const slots: ArtVaultSlot[] = [
    imageSlotFromUrl("main-image", "Main Image", entry.media.mainImage),
    imageSlotFromUrl("icon-image", "Icon Image", entry.media.iconImage),
    ...entry.media.galleryImages.map((image, index) => imageSlotFromUrl(`gallery-${index}`, `Gallery Image ${index + 1}`, image))
  ];

  return [{
    id: sectionId,
    title: "Environment Images",
    description: "World/location image references and gallery art.",
    order: 0,
    driveFolderId: stringField(entry.fields, artBinderFolderField(sectionId, "id")),
    driveFolderLink: stringField(entry.fields, artBinderFolderField(sectionId, "link")),
    driveFolderName: stringField(entry.fields, artBinderFolderField(sectionId, "name")),
    slots
  }];
}

function imageSlotFromUrl(id: string, label: string, imageUrl?: string): ArtVaultSlot {
  return {
    id,
    label,
    requirementType: "Environment Art",
    status: imageUrl ? "uploaded" : "empty",
    image: imageUrl ? {
      id: `${id}-image`,
      title: label,
      category: "Environment Images",
      slotId: id,
      driveFileId: "",
      thumbnailUrl: imageUrl,
      webViewLink: imageUrl,
      dateAdded: "",
      uploadStatus: "linked",
      notes: ""
    } : null,
    notes: "",
    order: 0
  };
}


function ArtBinderSpriteAnimation({ reference }: { reference: SpriteAnimationSlotReference }) {
  const asset = loadSpriteSheetAssets().find((item) => item.id === reference.spriteSheetAssetId);
  const preset = asset?.animationPresets.find((item) => item.id === reference.animationPresetId);
  if (!asset || !preset) {
    return <Icon name="Gamepad2" className="h-8 w-8" />;
  }
  return (
    <div className="art-binder-sprite-preview">
      <SpriteAnimation
        spriteSheet={asset}
        preset={preset}
        autoplay={reference.playback === "autoplay"}
        playOnHover={reference.playback === "hover"}
        loopWhileHovering={reference.loop}
      />
    </div>
  );
}
function artBinderSlotModule(card: ArtBinderSlotCard): AssignableModuleInfo {
  return {
    moduleId: `art-binder-${card.subject.source}-${card.subject.id}-${card.section.id}-${card.slot.id}`,
    moduleTitle: `${card.subject.title} / ${card.slot.label}`,
    moduleType: "art-binder-slot",
    entryId: card.subject.id,
    entryTitle: card.subject.title,
    entryCategory: `Art Binder / ${card.section.title}`,
    targetRoute: `art-binder:${card.subject.kind}:${card.subject.id}:${encodeURIComponent(card.section.title)}`
  };
}

function artBinderImageManagerSlot(card: ArtBinderSlotCard) {
  return {
    id: card.slot.id,
    label: card.slot.label,
    description: `${card.subject.title} / ${card.section.title}`,
    imageUrl: card.slot.image?.thumbnailUrl || card.slot.image?.webViewLink || "",
    imageFit: card.slot.image?.imageFit,
    webViewLink: card.slot.image?.webViewLink,
    frameWidth: card.subject.kind === "environment" ? 320 : 240,
    frameHeight: card.subject.kind === "environment" ? 200 : 240,
    defaultFolderId: card.section.driveFolderId || "",
    defaultFolderLink: card.section.driveFolderLink || (card.section.driveFolderId ? googleDriveFolderLink(card.section.driveFolderId) : ""),
    defaultFolderName: card.section.driveFolderName || (card.section.driveFolderId ? `${card.subject.title} / ${card.section.title}` : ""),
    uploadNameContext: {
      subjectName: card.subject.title,
      categoryName: card.section.title,
      slotName: card.slot.label,
      sourceType: card.subject.kind,
      state: artBinderAssetState(card.slot) === "final" ? "final" : "wip"
    },
    showAssetState: true,
    assetState: artBinderAssetState(card.slot) === "final" ? "final" as const : "wip" as const,
    spriteAnimation: card.slot.image?.spriteAnimation
  };
}

function updateDatabaseRenameArtBinderCategory(database: LoreDatabase, cards: ArtBinderSlotCard[], nextTitle: string): LoreDatabase {
  return updateDatabaseArtBinderSections(database, cards, (section) => ({
    ...section,
    title: nextTitle,
    slots: section.slots.map((slot) => ({
      ...slot,
      image: slot.image ? { ...slot.image, category: nextTitle } : slot.image
    }))
  }));
}

function updateDatabaseAddSlotToCategory(database: LoreDatabase, cards: ArtBinderSlotCard[], slotLabel: string, requirementType: string): LoreDatabase {
  return updateDatabaseArtBinderSections(database, cards, (section) => addSlotToSection(section, slotLabel, requirementType || section.title));
}

function updateDatabaseAddArtBinderCategory(database: LoreDatabase, subjects: ArtBinderSubject[], title: string, firstSlotLabel: string): LoreDatabase {
  return subjects
    .filter((subject) => subject.source !== "environment")
    .reduce((current, subject) => addArtBinderCategoryToSubject(current, subject, title, firstSlotLabel), database);
}

function updateDatabaseArtBinderSections(
  database: LoreDatabase,
  cards: ArtBinderSlotCard[],
  updater: (section: ArtVaultSection) => ArtVaultSection
): LoreDatabase {
  return uniqueSectionCards(cards)
    .filter((card) => card.subject.source !== "environment")
    .reduce((current, card) => updateDatabaseArtBinderSection(current, card, updater), database);
}

function updateDatabaseArtBinderSection(
  database: LoreDatabase,
  card: ArtBinderSlotCard,
  updater: (section: ArtVaultSection) => ArtVaultSection
): LoreDatabase {
  if (card.subject.source === "character") {
    return {
      ...database,
      entries: database.entries.map((entry) =>
        entry.id === card.subject.id
          ? {
              ...entry,
              artVault: updateArtVaultSection(normalizeArtVault(entry.artVault), card.section.id, updater),
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    };
  }

  if (card.subject.source === "creature") {
    return {
      ...database,
      bestiary: (database.bestiary || []).map((creature) =>
        creature.id === card.subject.id
          ? {
              ...creature,
              artVault: updateArtVaultSection(normalizeCreatureArtVault(creature.artVault), card.section.id, updater),
              updatedAt: new Date().toISOString()
            }
          : creature
      )
    };
  }

  if (card.subject.source === "bestiary-category") {
    const existing = database.bestiaryCategoryVaults || [];
    const current =
      existing.find((vault) => vault.id === card.subject.id) ||
      createBestiaryCategoryArtVaultRecord(card.subject.groupLabel, database.bestiary || []);
    const normalized = normalizeBestiaryCategoryArtVault(current, current.categoryName || card.subject.groupLabel, database.bestiary || []);
    const updated = {
      ...normalized,
      artVault: updateArtVaultSection(normalized.artVault, card.section.id, updater),
      updatedAt: new Date().toISOString()
    };
    return {
      ...database,
      bestiaryCategoryVaults: existing.some((vault) => vault.id === updated.id)
        ? existing.map((vault) => (vault.id === updated.id ? updated : vault))
        : [updated, ...existing]
    };
  }

  return database;
}

function addArtBinderCategoryToSubject(database: LoreDatabase, subject: ArtBinderSubject, title: string, firstSlotLabel: string): LoreDatabase {
  if (subject.source === "character") {
    return {
      ...database,
      entries: database.entries.map((entry) =>
        entry.id === subject.id
          ? {
              ...entry,
              artVault: addSectionToVault(normalizeArtVault(entry.artVault), title, firstSlotLabel),
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    };
  }

  if (subject.source === "creature") {
    return {
      ...database,
      bestiary: (database.bestiary || []).map((creature) =>
        creature.id === subject.id
          ? {
              ...creature,
              artVault: addSectionToVault(normalizeCreatureArtVault(creature.artVault), title, firstSlotLabel),
              updatedAt: new Date().toISOString()
            }
          : creature
      )
    };
  }

  if (subject.source === "bestiary-category") {
    const existing = database.bestiaryCategoryVaults || [];
    const current =
      existing.find((vault) => vault.id === subject.id) ||
      createBestiaryCategoryArtVaultRecord(subject.groupLabel, database.bestiary || []);
    const normalized = normalizeBestiaryCategoryArtVault(current, current.categoryName || subject.groupLabel, database.bestiary || []);
    const updated = {
      ...normalized,
      artVault: addSectionToVault(normalized.artVault, title, firstSlotLabel),
      updatedAt: new Date().toISOString()
    };
    return {
      ...database,
      bestiaryCategoryVaults: existing.some((vault) => vault.id === updated.id)
        ? existing.map((vault) => (vault.id === updated.id ? updated : vault))
        : [updated, ...existing]
    };
  }

  return database;
}

function updateArtVaultSection(vault: { sections: ArtVaultSection[] }, sectionId: string, updater: (section: ArtVaultSection) => ArtVaultSection) {
  return {
    sections: vault.sections.map((section) => section.id === sectionId ? updater(section) : section)
  };
}

function addSectionToVault(vault: { sections: ArtVaultSection[] }, title: string, firstSlotLabel: string) {
  const existing = vault.sections.find((section) => section.title.toLowerCase() === title.toLowerCase());
  if (existing) {
    return updateArtVaultSection(vault, existing.id, (section) => addSlotToSection(section, firstSlotLabel, title));
  }
  const order = vault.sections.reduce((max, section) => Math.max(max, section.order || 0), -1) + 1;
  const id = uniqueSectionId(vault.sections, `custom-${slugify(title)}`);
  const slot = createArtBinderSlot(firstSlotLabel, title, 0, []);
  return {
    sections: [
      ...vault.sections,
      {
        id,
        title,
        description: `Custom Art Binder category for ${title}.`,
        order,
        driveFolderId: "",
        driveFolderLink: "",
        driveFolderName: "",
        slots: [slot]
      }
    ]
  };
}

function addSlotToSection(section: ArtVaultSection, slotLabel: string, requirementType: string) {
  const order = section.slots.reduce((max, slot) => Math.max(max, slot.order || 0), -1) + 1;
  return {
    ...section,
    slots: [...section.slots, createArtBinderSlot(slotLabel, requirementType, order, section.slots)]
  };
}

function createArtBinderSlot(label: string, requirementType: string, order: number, siblingSlots: ArtVaultSlot[]): ArtVaultSlot {
  return {
    id: uniqueSlotId(siblingSlots, slugify(label || "art-slot")),
    label: label || "New Art Slot",
    requirementType: requirementType || "Art",
    status: "empty",
    image: null,
    notes: "",
    order
  };
}

function uniqueSectionId(sections: ArtVaultSection[], baseId: string) {
  const existing = new Set(sections.map((section) => section.id));
  let candidate = baseId || "custom-art-category";
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  return candidate;
}

function uniqueSlotId(slots: ArtVaultSlot[], baseId: string) {
  const existing = new Set(slots.map((slot) => slot.id));
  let candidate = baseId || "art-slot";
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  return candidate;
}
function updateDatabaseSlotImage(database: LoreDatabase, card: ArtBinderSlotCard, imageSlot: ImageManagerSlotDraft): LoreDatabase {
  if (card.subject.source === "character") {
    return {
      ...database,
      entries: database.entries.map((entry) =>
        entry.id === card.subject.id
          ? {
              ...entry,
              artVault: updateArtVaultSlotImage(normalizeArtVault(entry.artVault), card, imageSlot),
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    };
  }

  if (card.subject.source === "creature") {
    return {
      ...database,
      bestiary: (database.bestiary || []).map((creature) =>
        creature.id === card.subject.id
          ? {
              ...creature,
              artVault: updateArtVaultSlotImage(normalizeCreatureArtVault(creature.artVault), card, imageSlot),
              updatedAt: new Date().toISOString()
            }
          : creature
      )
    };
  }

  if (card.subject.source === "bestiary-category") {
    const existing = database.bestiaryCategoryVaults || [];
    const current =
      existing.find((vault) => vault.id === card.subject.id) ||
      createBestiaryCategoryArtVaultRecord(card.subject.groupLabel, database.bestiary || []);
    const normalized = normalizeBestiaryCategoryArtVault(current, current.categoryName || card.subject.groupLabel, database.bestiary || []);
    const updated = {
      ...normalized,
      artVault: updateArtVaultSlotImage(normalized.artVault, card, imageSlot),
      updatedAt: new Date().toISOString()
    };
    return {
      ...database,
      bestiaryCategoryVaults: existing.some((vault) => vault.id === updated.id)
        ? existing.map((vault) => (vault.id === updated.id ? updated : vault))
        : [updated, ...existing]
    };
  }

  return {
    ...database,
    entries: database.entries.map((entry) =>
      entry.id === card.subject.id
        ? updateEnvironmentImageSlot(entry, card.slot.id, imageSlot)
        : entry
    )
  };
}

function updateArtVaultSlotImage(vault: { sections: ArtVaultSection[] }, card: ArtBinderSlotCard, imageSlot: ImageManagerSlotDraft) {
  return {
    sections: vault.sections.map((section) =>
      section.id === card.section.id
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === card.slot.id
                ? {
                    ...slot,
                    status: imageSlot.imageUrl ? (imageSlot.assetState === "final" ? "approved" : "uploaded") : "empty",
                    image: imageSlot.imageUrl
                      ? artBinderSlotImageMetadata(slot, card, imageSlot)
                      : null
                  }
                : slot
            )
          }
        : section
    )
  };
}

function updateDatabaseSectionFolder(database: LoreDatabase, card: ArtBinderSlotCard, folder: GoogleDriveFolder | null): LoreDatabase {
  if (card.subject.source === "character") {
    return {
      ...database,
      entries: database.entries.map((entry) =>
        entry.id === card.subject.id
          ? {
              ...entry,
              artVault: updateArtVaultSectionFolder(normalizeArtVault(entry.artVault), card, folder),
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    };
  }

  if (card.subject.source === "creature") {
    return {
      ...database,
      bestiary: (database.bestiary || []).map((creature) =>
        creature.id === card.subject.id
          ? {
              ...creature,
              artVault: updateArtVaultSectionFolder(normalizeCreatureArtVault(creature.artVault), card, folder),
              updatedAt: new Date().toISOString()
            }
          : creature
      )
    };
  }

  if (card.subject.source === "bestiary-category") {
    const existing = database.bestiaryCategoryVaults || [];
    const current =
      existing.find((vault) => vault.id === card.subject.id) ||
      createBestiaryCategoryArtVaultRecord(card.subject.groupLabel, database.bestiary || []);
    const normalized = normalizeBestiaryCategoryArtVault(current, current.categoryName || card.subject.groupLabel, database.bestiary || []);
    const updated = {
      ...normalized,
      artVault: updateArtVaultSectionFolder(normalized.artVault, card, folder),
      updatedAt: new Date().toISOString()
    };
    return {
      ...database,
      bestiaryCategoryVaults: existing.some((vault) => vault.id === updated.id)
        ? existing.map((vault) => (vault.id === updated.id ? updated : vault))
        : [updated, ...existing]
    };
  }

  return {
    ...database,
    entries: database.entries.map((entry) =>
      entry.id === card.subject.id ? updateEnvironmentSectionFolder(entry, card.section.id, folder) : entry
    )
  };
}

function updateArtVaultSectionFolder(vault: { sections: ArtVaultSection[] }, card: ArtBinderSlotCard, folder: GoogleDriveFolder | null) {
  return {
    sections: vault.sections.map((section) =>
      section.id === card.section.id
        ? {
            ...section,
            driveFolderId: folder?.id || "",
            driveFolderLink: folder?.url || "",
            driveFolderName: folder?.name || ""
          }
        : section
    )
  };
}

function artBinderSlotImageMetadata(slot: ArtVaultSlot, card: ArtBinderSlotCard, imageSlot: ImageManagerSlotDraft): ArtVaultImageMetadata {
  const driveFileId = driveFileIdFromUrl(imageSlot.imageUrl || imageSlot.webViewLink || "");
  return {
    id: slot.image?.id || `binder-${card.subject.id}-${slot.id}-${Date.now()}`,
    title: slot.label,
    category: card.section.title,
    slotId: slot.id,
    driveFileId,
    thumbnailUrl: imageSlot.imageUrl,
    webViewLink: imageSlot.webViewLink || (driveFileId ? googleDriveWebViewLink(driveFileId) : imageSlot.imageUrl),
    dateAdded: slot.image?.dateAdded || new Date().toISOString(),
    uploadStatus: imageSlot.assetState === "final" ? "final" : (driveFileId ? "imported-from-drive" : "linked"),
    assetState: imageSlot.assetState === "final" ? "final" : "wip",
    notes: slot.image?.notes || slot.notes || "",
    imageFit: normalizeImageFit(imageSlot.imageFit),
    driveFolderId: slot.image?.driveFolderId || imageSlot.defaultFolderId || card.section.driveFolderId || "",
    driveFolderLink: slot.image?.driveFolderLink || imageSlot.defaultFolderLink || card.section.driveFolderLink || "",
    driveFolderName: slot.image?.driveFolderName || imageSlot.defaultFolderName || card.section.driveFolderName || "",
    spriteAnimation: imageSlot.spriteAnimation
  };
}

function updateEnvironmentSectionFolder(entry: LoreEntry, sectionId: string, folder: GoogleDriveFolder | null): LoreEntry {
  const fields = { ...entry.fields };
  const idKey = artBinderFolderField(sectionId, "id");
  const linkKey = artBinderFolderField(sectionId, "link");
  const nameKey = artBinderFolderField(sectionId, "name");
  if (folder) {
    fields[idKey] = folder.id;
    fields[linkKey] = folder.url;
    fields[nameKey] = folder.name;
  } else {
    delete fields[idKey];
    delete fields[linkKey];
    delete fields[nameKey];
  }
  return {
    ...entry,
    fields,
    updatedAt: new Date().toISOString()
  };
}

function updateEnvironmentImageSlot(entry: LoreEntry, slotId: string, imageSlot: ImageManagerSlotDraft): LoreEntry {
  if (slotId === "main-image") {
    return {
      ...entry,
      media: { ...entry.media, mainImage: imageSlot.imageUrl },
      updatedAt: new Date().toISOString()
    };
  }
  if (slotId === "icon-image") {
    return {
      ...entry,
      media: { ...entry.media, iconImage: imageSlot.imageUrl },
      updatedAt: new Date().toISOString()
    };
  }
  const galleryMatch = slotId.match(/^gallery-(\d+)$/);
  if (galleryMatch) {
    const index = Number(galleryMatch[1]);
    const galleryImages = [...entry.media.galleryImages];
    galleryImages[index] = imageSlot.imageUrl;
    return {
      ...entry,
      media: { ...entry.media, galleryImages },
      updatedAt: new Date().toISOString()
    };
  }
  return entry;
}

function driveFileIdFromUrl(value: string) {
  const direct = value.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
  if (direct?.[1]) return direct[1];
  const query = value.match(/[?&]id=([^&#]+)/i);
  return query?.[1] ? decodeURIComponent(query[1]) : "";
}

function artBinderCardMatches(card: ArtBinderSlotCard, categoryFilter: string, statusFilter: string, search: string) {
  const query = search.trim().toLowerCase();
  const haystack = [
    card.subject.title,
    card.subject.subtitle,
    card.section.title,
    card.slot.label,
    card.slot.requirementType,
    card.slot.notes
  ].join(" ").toLowerCase();

  return (
    (categoryFilter === "all" || card.section.title === categoryFilter) &&
    (statusFilter === "All" || artBinderStatus(card.slot) === statusFilter) &&
    (!query || haystack.includes(query))
  );
}

function buildSubjectGroups(subjects: ArtBinderSubject[], kindFilter: ArtBinderKind): ArtBinderSubjectGroup[] {
  const allLabel = kindFilter === "all"
    ? "All Shelves"
    : `All ${kindOptions.find((option) => option.value === kindFilter)?.label || "Shelves"}`;
  const groups = new Map<string, ArtBinderSubjectGroup>();
  subjects.forEach((subject) => {
    const current = groups.get(subject.groupKey);
    const label = subject.groupLabel || kindLabel(subject.kind);
    groups.set(subject.groupKey, {
      key: subject.groupKey,
      label,
      description: subjectGroupDescription(subject),
      icon: subjectGroupIcon(subject.kind, label),
      count: (current?.count || 0) + 1
    });
  });

  return [
    {
      key: "all",
      label: allLabel,
      description: "Show every broad shelf in this board.",
      icon: "Archive",
      count: subjects.length
    },
    ...[...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
  ];
}

function subjectGroupDescription(subject: ArtBinderSubject) {
  if (subject.kind === "bestiary") return `General art plus every ${subject.groupLabel.toLowerCase()} subject in the Bestiary.`;
  if (subject.kind === "character") return "All character art boards, with a specific character picker after this.";
  return `Environment boards grouped by ${subject.groupLabel.toLowerCase()}.`;
}

function subjectGroupIcon(kind: ArtBinderSubject["kind"], label: string) {
  const normalized = label.toLowerCase();
  if (kind === "character") return "Users";
  if (kind === "environment") return "Map";
  if (normalized.includes("slime")) return "Droplets";
  if (normalized.includes("boss")) return "Crown";
  if (normalized.includes("skell") || normalized.includes("undead")) return "Skull";
  if (normalized.includes("boar") || normalized.includes("wild")) return "PawPrint";
  if (normalized.includes("insect") || normalized.includes("bug")) return "Bug";
  return "Swords";
}

function groupCardsByCategory(cards: ArtBinderSlotCard[]) {
  const groups = new Map<string, ArtBinderSlotCard[]>();
  cards.forEach((card) => {
    const key = card.section.title || "Unsorted Art";
    groups.set(key, [...(groups.get(key) || []), card]);
  });
  return [...groups.entries()].map(([category, groupCards]) => ({ category, cards: groupCards }));
}

function artBinderStatus(slot: ArtVaultSlot) {
  if (slot.status === "approved" || slot.image?.assetState === "final" || slot.image?.uploadStatus === "final") return "Final";
  if (slot.status === "needs-revision") return "Needs Revision";
  return isSlotFilled(slot) ? "WIP" : "Missing";
}

function artBinderAssetState(slot: ArtVaultSlot) {
  if (!isSlotFilled(slot)) return "wip";
  if (slot.status === "approved" || slot.image?.assetState === "final" || slot.image?.uploadStatus === "final") return "final";
  return "wip";
}

function artBinderStatusClass(slot: ArtVaultSlot) {
  return artBinderStatus(slot).toLowerCase().replace(/\s+/g, "-");
}

function isSlotFilled(slot: ArtVaultSlot) {
  return Boolean(slot.image?.thumbnailUrl || slot.image?.webViewLink || slot.image?.driveFileId);
}

function unique(values: string[]) {
  return values.filter((value, index, list) => list.indexOf(value) === index);
}

function uniqueSectionCards(cards: ArtBinderSlotCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.subject.source}:${card.subject.id}:${card.section.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function artBinderFolderField(sectionId: string, field: "id" | "link" | "name") {
  return `artBinderFolder:${sectionId}:${field}`;
}

function stringField(fields: Record<string, unknown>, key: string) {
  const value = fields[key];
  return typeof value === "string" ? value : "";
}

function artBinderGroupKey(kind: Exclude<ArtBinderKind, "all">, label: string) {
  return `${kind}-${slugify(label || kind)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['â€™]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "general";
}

function kindLabel(kind: ArtBinderSubject["kind"]) {
  if (kind === "character") return "Character";
  if (kind === "bestiary") return "Bestiary";
  return "Environment";
}

function isCharacterEntry(entry: LoreEntry) {
  return entry.category === "Characters" || entry.type.toLowerCase().includes("character");
}

function ArtBinderFolderModal({
  category,
  cards,
  onChooseFolder,
  onClearFolder,
  onClose
}: {
  category: string;
  cards: ArtBinderSlotCard[];
  onChooseFolder: (card: ArtBinderSlotCard) => void;
  onClearFolder: (card: ArtBinderSlotCard) => void;
  onClose: () => void;
}) {
  return (
    <div className="art-binder-folder-backdrop" role="dialog" aria-modal="true" aria-label={`Set folders for ${category}`}>
      <section className="art-binder-folder-modal">
        <header>
          <div>
            <p>Category Upload Routing</p>
            <h2 className="font-display">{category}</h2>
            <span>Choose a Drive folder for each subject in this category. For example, Gwen dialogue sprites can go into Gwen's folder while Tohm's dialogue sprites use Tohm's folder.</span>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close folder routing">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="art-binder-folder-list">
          {cards.map((card) => (
            <article key={`${card.subject.source}-${card.subject.id}-${card.section.id}`} className="art-binder-folder-row">
              <div>
                <strong>{card.subject.title}</strong>
                <span>{card.subject.subtitle} / {card.section.title}</span>
              </div>
              <div className="art-binder-folder-current">
                <span>{card.section.driveFolderName || card.section.driveFolderId || "No folder set"}</span>
                {card.section.driveFolderId && <small>{card.section.driveFolderId}</small>}
              </div>
              <div className="art-binder-folder-actions">
                <button className="button-frame" onClick={() => onChooseFolder(card)}>
                  <Icon name="FolderOpen" className="h-4 w-4" />
                  Choose Folder
                </button>
                <button onClick={() => onClearFolder(card)} disabled={!card.section.driveFolderId}>
                  Clear
                </button>
              </div>
            </article>
          ))}
        </div>

        <footer>
          <button className="character-codex-action-button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}





