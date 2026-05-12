import { useEffect, useMemo, useState } from "react";
import type {
  BestiaryCreature,
  ImageFitSettings,
  LoreEntry,
  WorldBuildingCategoryId,
  WorldBuildingData,
  WorldBuildingEntry,
  WorldBuildingFocusTarget,
  WorldBuildingRelatedEntry
} from "../types";
import {
  allWorldBuildingEntries,
  categoryConfig,
  createWorldBuildingEntry,
  normalizeWorldBuilding,
  normalizeWorldBuildingEntry,
  worldBuildingCategories
} from "../utils/worldBuilding";
import { imageFitToStyle, normalizeImageFit, resolveImageSourceUrl } from "../utils/imageFit";
import type { AssignableModuleInfo, AssignmentRecord } from "../utils/assignments";
import { richTextToPlainText } from "../utils/richText";
import { AdjustableImage } from "./AdjustableImage";
import { AssignableModule } from "./AssignmentSystem";
import { CustomSelect } from "./CustomSelect";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { Icon } from "./Icon";
import { ImageAdjustModal } from "./ImageAdjustModal";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { StoryReaderModal, type StoryReaderSection, type StoryReaderStep } from "./StoryReaderModal";

interface WorldBuildingPageProps {
  worldBuilding: WorldBuildingData;
  loreEntries: LoreEntry[];
  bestiary: BestiaryCreature[];
  readOnly: boolean;
  onWorldBuildingChange: (worldBuilding: WorldBuildingData) => void;
  onOpenEntry: (entry: LoreEntry) => void;
  onOpenCreature: (creature: BestiaryCreature) => void;
  focusedAssignment?: AssignmentRecord | null;
  focusTarget?: WorldBuildingFocusTarget | null;
}

type WorldMode = "dashboard" | "category" | "detail";

interface AddEntryDraft {
  title: string;
  type: string;
  summary: string;
  tags: string;
  image: string;
  notes: string;
}

interface RelatedPickerState {
  open: boolean;
  type: string;
  search: string;
  selectedKeys: string[];
  note: string;
  message: string;
}

interface RelationTarget {
  key: string;
  type: string;
  targetId: string;
  targetCategory?: WorldBuildingCategoryId;
  title: string;
  subtitle: string;
  summary: string;
  image: string;
  tags: string[];
  open: () => void;
}

interface ImageAdjustTarget {
  imageUrl: string;
  imageFit: ImageFitSettings;
  previewFrame?: { width: number; height: number };
}

const relationTypeOptions = [
  { label: "Character", type: "character" },
  { label: "Creature", type: "creature" },
  { label: "Location", type: "location", category: "locations" as WorldBuildingCategoryId },
  { label: "Culture", type: "culture", category: "cultures" as WorldBuildingCategoryId },
  { label: "Faction", type: "faction", category: "factions" as WorldBuildingCategoryId },
  { label: "Item", type: "item", category: "items" as WorldBuildingCategoryId },
  { label: "Recipe", type: "recipe", category: "foodAndRecipes" as WorldBuildingCategoryId },
  { label: "Magic System", type: "magic", category: "magicSystems" as WorldBuildingCategoryId },
  { label: "Timeline Event", type: "timeline", category: "timeline" as WorldBuildingCategoryId },
  { label: "Quest", type: "quest", category: "quests" as WorldBuildingCategoryId },
  { label: "Myth", type: "myth", category: "myths" as WorldBuildingCategoryId },
  { label: "Glossary Term", type: "glossary", category: "glossary" as WorldBuildingCategoryId }
];

const blankAddEntryDraft = (categoryId: WorldBuildingCategoryId): AddEntryDraft => ({
  title: "",
  type: categoryConfig(categoryId).defaultType,
  summary: "",
  tags: "",
  image: "",
  notes: ""
});

export function WorldBuildingPage({
  worldBuilding,
  loreEntries,
  bestiary,
  readOnly,
  onWorldBuildingChange,
  onOpenEntry,
  onOpenCreature,
  focusedAssignment = null,
  focusTarget = null
}: WorldBuildingPageProps) {
  const normalizedWorldBuilding = useMemo(() => normalizeWorldBuilding(worldBuilding), [worldBuilding]);
  const [mode, setMode] = useState<WorldMode>("dashboard");
  const [selectedCategoryId, setSelectedCategoryId] = useState<WorldBuildingCategoryId>("locations");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortMode, setSortMode] = useState("Recently Updated");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<AddEntryDraft>(() => blankAddEntryDraft("locations"));
  const [isEditing, setIsEditing] = useState(false);
  const [entryDraft, setEntryDraft] = useState<WorldBuildingEntry | null>(null);
  const [fullStoryOpen, setFullStoryOpen] = useState(false);
  const [activeStoryTab, setActiveStoryTab] = useState("full");
  const [relatedPicker, setRelatedPicker] = useState<RelatedPickerState>({
    open: false,
    type: "character",
    search: "",
    selectedKeys: [],
    note: "",
    message: ""
  });
  const [imageAdjustTarget, setImageAdjustTarget] = useState<ImageAdjustTarget | null>(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);

  const allWorldEntries = useMemo(() => allWorldBuildingEntries(normalizedWorldBuilding), [normalizedWorldBuilding]);
  const characterEntries = useMemo(() => loreEntries.filter(isCharacterEntry), [loreEntries]);
  const selectedCategory = categoryConfig(selectedCategoryId);
  const selectedEntry = selectedEntryId
    ? allWorldEntries.find((entry) => entry.id === selectedEntryId) || null
    : null;

  useEffect(() => {
    if (!focusedAssignment?.targetRoute.startsWith("world:")) return;
    const found = allWorldEntries.find((entry) => entry.id === focusedAssignment.entryId);
    if (!found) return;
    setSelectedCategoryId(found.category);
    setSelectedEntryId(found.id);
    setMode("detail");
    if (!readOnly && focusedAssignment.editModeOnOpen) setIsEditing(true);
  }, [allWorldEntries, focusedAssignment, readOnly]);

  useEffect(() => {
    if (!focusTarget) return;
    const exists = (normalizedWorldBuilding[focusTarget.category] || []).some((entry) => entry.id === focusTarget.entryId);
    if (!exists) return;
    setSelectedCategoryId(focusTarget.category);
    setSelectedEntryId(focusTarget.entryId);
    setCategorySearch("");
    setMode("detail");
    setIsEditing(false);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }, [focusTarget, normalizedWorldBuilding]);

  useEffect(() => {
    if (!selectedEntry) {
      setEntryDraft(null);
      setIsEditing(false);
      return;
    }
    if (!isEditing) setEntryDraft(selectedEntry);
  }, [selectedEntry, isEditing]);

  const relationTargets = useMemo(
    () => buildRelationTargets({
      worldBuilding: normalizedWorldBuilding,
      loreEntries: characterEntries,
      bestiary,
      onOpenWorldEntry: (entry) => openWorldEntry(entry.category, entry.id),
      onOpenEntry,
      onOpenCreature
    }),
    [normalizedWorldBuilding, characterEntries, bestiary, onOpenEntry, onOpenCreature]
  );

  const resolvedTargets = useMemo(
    () => new Map(relationTargets.map((target) => [target.key, target])),
    [relationTargets]
  );

  const dashboardResults = useMemo(() => {
    const query = dashboardSearch.trim().toLowerCase();
    if (!query && !tagFilter) return [];
    return searchAllTargets(relationTargets, query, tagFilter).slice(0, 18);
  }, [dashboardSearch, relationTargets, tagFilter]);

  const categoryEntries = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return sortWorldEntries(normalizedWorldBuilding[selectedCategoryId] || [], sortMode)
      .filter((entry) => !query || entrySearchText(entry).includes(query))
      .filter((entry) => !tagFilter || entry.tags.some((tag) => normalizeTag(tag) === normalizeTag(tagFilter)));
  }, [categorySearch, normalizedWorldBuilding, selectedCategoryId, sortMode, tagFilter]);

  const backlinks = useMemo(() => {
    if (!selectedEntry) return [];
    return allWorldEntries
      .filter((entry) => entry.id !== selectedEntry.id)
      .flatMap((entry) =>
        entry.relatedEntries
          .filter((related) => related.targetId === selectedEntry.id)
          .map((related) => ({ entry, related }))
      );
  }, [allWorldEntries, selectedEntry]);

  const openCategory = (categoryId: WorldBuildingCategoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedEntryId("");
    setCategorySearch("");
    setMode("category");
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openWorldEntry = (categoryId: WorldBuildingCategoryId, entryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedEntryId(entryId);
    setMode("detail");
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAddModal = (categoryId = selectedCategoryId) => {
    if (readOnly) return;
    setSelectedCategoryId(categoryId);
    setAddDraft(blankAddEntryDraft(categoryId));
    setAddModalOpen(true);
  };

  const addEntry = () => {
    if (readOnly) return;
    if (!addDraft.title.trim()) return;
    const entry = createWorldBuildingEntry(selectedCategoryId, {
      title: addDraft.title,
      type: addDraft.type,
      summary: addDraft.summary,
      tags: splitTags(addDraft.tags),
      image: addDraft.image,
      fields: addDraft.notes.trim() ? { deepNotes: addDraft.notes } : {}
    });
    const next = {
      ...normalizedWorldBuilding,
      [selectedCategoryId]: [entry, ...(normalizedWorldBuilding[selectedCategoryId] || [])]
    };
    onWorldBuildingChange(next);
    setAddModalOpen(false);
    openWorldEntry(selectedCategoryId, entry.id);
    setEntryDraft(entry);
    setIsEditing(true);
  };

  const deleteSelectedEntry = () => {
    if (readOnly || !selectedEntry) return;
    if (!window.confirm(`Delete "${selectedEntry.title}" from World Building?`)) return;
    const next = {
      ...normalizedWorldBuilding,
      [selectedEntry.category]: (normalizedWorldBuilding[selectedEntry.category] || []).filter((entry) => entry.id !== selectedEntry.id)
    };
    onWorldBuildingChange(next);
    setMode("category");
    setSelectedEntryId("");
    setIsEditing(false);
  };

  const saveEntryDraft = () => {
    if (readOnly || !entryDraft) return;
    const normalized = normalizeWorldBuildingEntry({
      ...entryDraft,
      updatedAt: new Date().toISOString()
    }, entryDraft.category);
    const next = {
      ...normalizedWorldBuilding,
      [normalized.category]: (normalizedWorldBuilding[normalized.category] || []).map((entry) =>
        entry.id === normalized.id ? normalized : entry
      )
    };
    onWorldBuildingChange(next);
    setSelectedEntryId(normalized.id);
    setEntryDraft(normalized);
    setIsEditing(false);
  };

  const persistEntryDraftPatch = (patch: Partial<WorldBuildingEntry>) => {
    if (readOnly || !entryDraft) return;
    const normalized = normalizeWorldBuildingEntry({
      ...entryDraft,
      ...patch,
      updatedAt: new Date().toISOString()
    }, entryDraft.category);
    const next = {
      ...normalizedWorldBuilding,
      [normalized.category]: (normalizedWorldBuilding[normalized.category] || []).map((entry) =>
        entry.id === normalized.id ? normalized : entry
      )
    };
    onWorldBuildingChange(next);
    setSelectedEntryId(normalized.id);
    setEntryDraft(normalized);
  };

  const saveWorldImageManager = (slots: ImageManagerSlotDraft[]) => {
    const imageSlot = slots[0];
    if (!imageSlot) return;
    persistEntryDraftPatch({
      image: imageSlot.imageUrl,
      imageFit: normalizeImageFit(imageSlot.imageFit)
    });
    setImageManagerOpen(false);
  };

  const updateDraftField = (key: string, value: string) => {
    setEntryDraft((current) => current ? { ...current, fields: { ...current.fields, [key]: value } } : current);
  };

  const removeRelatedEntry = (relatedId: string) => {
    setEntryDraft((current) => current
      ? { ...current, relatedEntries: current.relatedEntries.filter((related) => related.id !== relatedId) }
      : current
    );
  };

  const openRelatedPicker = () => {
    setRelatedPicker({
      open: true,
      type: "character",
      search: "",
      selectedKeys: [],
      note: "",
      message: ""
    });
  };

  const addRelatedEntries = () => {
    if (!entryDraft) return;
    if (!relatedPicker.selectedKeys.length) {
      setRelatedPicker((current) => ({ ...current, message: "Choose at least one entry to connect." }));
      return;
    }
    const existingKeys = new Set(entryDraft.relatedEntries.map(relationKey));
    const nextRelated = relatedPicker.selectedKeys
      .map((key) => resolvedTargets.get(key))
      .filter((target): target is RelationTarget => Boolean(target))
      .filter((target) => !existingKeys.has(`${target.type}:${target.targetId}`))
      .map((target) => ({
        id: `world-related-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: target.type,
        targetId: target.targetId,
        targetCategory: target.targetCategory,
        note: relatedPicker.note.trim() || `Connected to ${entryDraft.title}.`
      }));
    if (!nextRelated.length) {
      setRelatedPicker((current) => ({ ...current, message: "Those entries are already related." }));
      return;
    }
    setEntryDraft((current) => current ? { ...current, relatedEntries: [...current.relatedEntries, ...nextRelated] } : current);
    setRelatedPicker((current) => ({ ...current, open: false }));
  };

  const saveImageFit = (imageUrl: string, imageFit: ImageFitSettings) => {
    setEntryDraft((current) => current
      ? { ...current, image: imageUrl, imageFit: normalizeImageFit(imageFit) }
      : current
    );
    setImageAdjustTarget(null);
  };

  const saveCardImageFit = (entry: WorldBuildingEntry, imageUrl: string, imageFit: ImageFitSettings) => {
    if (readOnly) return;
    const normalized = normalizeWorldBuildingEntry({
      ...entry,
      image: imageUrl,
      imageFit: normalizeImageFit(imageFit),
      updatedAt: new Date().toISOString()
    }, entry.category);
    onWorldBuildingChange({
      ...normalizedWorldBuilding,
      [normalized.category]: (normalizedWorldBuilding[normalized.category] || []).map((candidate) =>
        candidate.id === normalized.id ? normalized : candidate
      )
    });
    if (selectedEntryId === normalized.id) setEntryDraft(normalized);
  };

  const renderDashboard = () => (
    <div className="world-building-page">
      <WorldBuildingHeader />
      <WorldSearchPanel
        search={dashboardSearch}
        tagFilter={tagFilter}
        results={dashboardResults}
        onSearchChange={setDashboardSearch}
        onClearTag={() => setTagFilter("")}
        onOpenTarget={(target) => target.open()}
      />
      <section className="world-building-category-grid">
        {worldBuildingCategories.map((category) => {
          const entries = normalizedWorldBuilding[category.id] || [];
          const lastEdited = latestEdited(entries);
          return (
            <button
              key={category.id}
              className="world-building-category-card"
              onClick={() => openCategory(category.id)}
            >
              <span className="world-building-category-icon">
                <Icon name={category.icon} className="h-7 w-7" />
              </span>
              <span>
                <strong className="font-display">{category.title}</strong>
                <small>{category.description}</small>
              </span>
              <span className="world-building-card-meta">
                <span>{entries.length} entries</span>
                {lastEdited && <span>Last edited {lastEdited}</span>}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );

  const renderCategory = () => (
    <div className="world-building-page">
      <button className="button-frame world-building-back-button" onClick={() => setMode("dashboard")}>
        <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
        Back to World Building
      </button>

      <section className="world-building-category-header">
        <div className="world-building-category-icon">
          <Icon name={selectedCategory.icon} className="h-8 w-8" />
        </div>
        <div>
          <p>{categoryEntries.length} entries</p>
          <h2 className="font-display">{selectedCategory.title}</h2>
          <span>{selectedCategory.description}</span>
        </div>
        {!readOnly && (
          <button className="button-frame primary world-building-add-button" onClick={() => openAddModal()}>
            <Icon name="Plus" className="h-4 w-4" />
            Add Entry
          </button>
        )}
      </section>

      <section className="world-building-filter-row">
        <label className="world-building-search">
          <Icon name="Search" className="h-4 w-4" />
          <input value={categorySearch} placeholder="Search within category..." onChange={(event) => setCategorySearch(event.target.value)} />
        </label>
        <input
          className="world-building-tag-input"
          value={tagFilter}
          placeholder="Filter by tag..."
          onChange={(event) => setTagFilter(event.target.value)}
        />
        <CustomSelect value={sortMode} onChange={setSortMode} options={["Recently Updated", "Title A-Z", "Type"]} />
        {tagFilter && (
          <button className="button-frame subtle" onClick={() => setTagFilter("")}>
            Clear Tag
          </button>
        )}
      </section>

      {categoryEntries.length ? (
        <section className="world-building-entry-grid">
          {categoryEntries.map((entry) => (
            <WorldEntryCard
              key={entry.id}
              entry={entry}
              relatedCount={entry.relatedEntries.length}
              canAdjustImage={!readOnly}
              onSaveImage={(next) => saveCardImageFit(entry, next.imageUrl, next.imageFit)}
              onOpen={() => openWorldEntry(entry.category, entry.id)}
              onTagClick={(tag) => setTagFilter(tag)}
            />
          ))}
        </section>
      ) : (
        <section className="world-building-empty-state">
          <Icon name={selectedCategory.icon} className="h-10 w-10" />
          <h3 className="font-display">No entries yet.</h3>
          <p>Start building this part of the world.</p>
          {!readOnly && (
            <button className="button-frame primary" onClick={() => openAddModal()}>
              <Icon name="Plus" className="h-4 w-4" />
              Add First Entry
            </button>
          )}
        </section>
      )}
    </div>
  );

  const renderDetail = () => {
    const activeEntry = entryDraft || selectedEntry;
    if (!activeEntry) return renderCategory();
    const config = categoryConfig(activeEntry.category);
    const relatedTargets = activeEntry.relatedEntries
      .map((related) => ({ related, target: resolveRelatedTarget(related, relationTargets) }))
      .filter((item) => item.target);
    const storySections = buildWorldStoryReaderSections(activeEntry, config.sections);
    const storySteps = buildWorldStoryReaderSteps(activeEntry, config.sections);
    const fullStory = buildWorldFullStory(activeEntry, storySections);

    if (fullStoryOpen) {
      return (
        <StoryReaderModal
          title={activeEntry.title}
          eyebrow="World Building Full Story"
          activeTab={activeStoryTab}
          sections={storySections.map((section) => ({
            ...section,
            onChange: isEditing && section.key !== "connections" ? (value) => {
              if (section.key === "summary") {
                setEntryDraft((current) => current ? { ...current, summary: value } : current);
                return;
              }
              updateDraftField(section.key, value);
            } : undefined
          }))}
          fullStory={fullStory}
          fullStoryEditValue={activeEntry.fields.fullStory || fullStory}
          fullStoryPlaceholder="Write the full worldbuilding story here: history, cultural context, secrets, player-facing version, and future use."
          steps={storySteps}
          isEditing={isEditing}
          onSetActiveTab={setActiveStoryTab}
          onFullStoryChange={(value) => updateDraftField("fullStory", value)}
          onClose={() => setFullStoryOpen(false)}
        />
      );
    }

    return (
      <div className="world-building-page">
        <button className="button-frame world-building-back-button" onClick={() => setMode("category")}>
          <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
          Back to {config.title}
        </button>

        <section className="world-building-detail-header">
          <div className="world-building-detail-art">
            {activeEntry.image ? (
              <button
                className={isEditing ? "editable-image-trigger world-building-image-button" : "world-building-image-button"}
                onClick={(event) => {
                  if (isEditing) setImageAdjustTarget({
                    imageUrl: activeEntry.image,
                    imageFit: normalizeImageFit(activeEntry.imageFit),
                    previewFrame: frameFromElement(event.currentTarget)
                  });
                }}
              >
                <img src={resolveImageSourceUrl(activeEntry.image)} alt="" style={imageFitToStyle(activeEntry.imageFit)} />
                {isEditing && <span>Adjust</span>}
              </button>
            ) : (
              <div className="world-building-image-placeholder">
                <Icon name={config.icon} className="h-10 w-10" />
                <span>No image yet</span>
              </div>
            )}
          </div>
          <div className="world-building-detail-copy">
            {isEditing ? (
              <>
                <input
                  className="world-building-title-input font-display"
                  value={activeEntry.title}
                  onChange={(event) => setEntryDraft((current) => current ? { ...current, title: event.target.value } : current)}
                />
                <input
                  className="world-building-inline-input"
                  value={activeEntry.type}
                  onChange={(event) => setEntryDraft((current) => current ? { ...current, type: event.target.value } : current)}
                />
                <textarea
                  className="world-building-summary-input"
                  value={activeEntry.summary}
                  placeholder="Short summary..."
                  onChange={(event) => setEntryDraft((current) => current ? { ...current, summary: event.target.value } : current)}
                />
                <input
                  className="world-building-inline-input"
                  value={activeEntry.tags.join(", ")}
                  placeholder="Tags separated by commas"
                  onChange={(event) => setEntryDraft((current) => current ? { ...current, tags: splitTags(event.target.value) } : current)}
                />
                <DriveImageSourceControls
                  value={activeEntry.image}
                  label={`${activeEntry.title || "World entry"} image`}
                  title="Choose World Building Image"
                  onChange={(image) => persistEntryDraftPatch({ image })}
                />
                <button className="button-frame world-building-action-button" onClick={() => setImageManagerOpen(true)}>
                  <Icon name="Image" className="h-4 w-4" />
                  Open Image Manager
                </button>
              </>
            ) : (
              <>
                <p>{config.title} / {activeEntry.type}</p>
                <h2 className="font-display">{activeEntry.title}</h2>
                <span>{activeEntry.summary || "No summary yet."}</span>
                <TagList tags={activeEntry.tags} onTagClick={setTagFilterAndCategory} />
              </>
            )}
          </div>
          <div className="world-building-detail-actions">
            <button
              className="button-frame"
              onClick={() => {
                setActiveStoryTab("full");
                setFullStoryOpen(true);
              }}
            >
              <Icon name="ScrollText" className="h-4 w-4" />
              Full Story
            </button>
            {!readOnly && !isEditing && (
              <button className="button-frame" onClick={() => setIsEditing(true)}>
                <Icon name="Edit3" className="h-4 w-4" />
                Edit Entry
              </button>
            )}
            {!readOnly && isEditing && (
              <>
                <button className="button-frame primary" onClick={saveEntryDraft}>
                  <Icon name="Save" className="h-4 w-4" />
                  Save
                </button>
                <button className="button-frame subtle" onClick={() => {
                  setEntryDraft(selectedEntry);
                  setIsEditing(false);
                }}>
                  Cancel
                </button>
                <button className="button-frame danger" onClick={deleteSelectedEntry}>
                  <Icon name="Trash2" className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </section>

        <section className="world-building-detail-grid">
          {config.sections.map((section) => (
            <AssignableModule
              key={section.id}
              as="article"
              className="world-building-info-card"
              module={worldAssignmentModule(activeEntry, section.id, section.title, config.title)}
            >
              <h3 className="font-display">{section.title}</h3>
              <p>{section.helper}</p>
              {isEditing ? (
                <textarea
                  value={activeEntry.fields[section.id] || ""}
                  placeholder={section.placeholder}
                  onChange={(event) => updateDraftField(section.id, event.target.value)}
                />
              ) : (
                <div className="world-building-read-text">
                  {activeEntry.fields[section.id] || "No notes yet."}
                </div>
              )}
            </AssignableModule>
          ))}
        </section>

        <AssignableModule
          as="section"
          className="world-building-deep-panel"
          module={worldAssignmentModule(activeEntry, "deep-notes", "Deep Notes", config.title)}
        >
          <h3 className="font-display">Deep Notes</h3>
          {isEditing ? (
            <textarea
              value={activeEntry.fields.deepNotes || ""}
              placeholder="Long-form notes, extra lore, production details, contradictions, and open questions."
              onChange={(event) => updateDraftField("deepNotes", event.target.value)}
            />
          ) : (
            <div className="world-building-read-text large">
              {activeEntry.fields.deepNotes || "No deep notes yet."}
            </div>
          )}
        </AssignableModule>

        <section className="world-building-reference-layout">
          <AssignableModule
            as="article"
            className="world-building-reference-panel"
            module={worldAssignmentModule(activeEntry, "related-entries", "Related Entries", config.title)}
          >
            <header>
              <h3 className="font-display">Related Entries</h3>
              {isEditing && (
                <button className="button-frame" onClick={openRelatedPicker}>
                  <Icon name="Plus" className="h-4 w-4" />
                  Add Related Entry
                </button>
              )}
            </header>
            <div className="world-building-related-grid">
              {relatedTargets.map(({ related, target }) => target && (
                <RelatedEntryCard
                  key={related.id}
                  related={related}
                  target={target}
                  isEditing={isEditing}
                  onRemove={() => removeRelatedEntry(related.id)}
                />
              ))}
              {!relatedTargets.length && <p className="world-building-muted">No related entries connected yet.</p>}
            </div>
          </AssignableModule>

          <article className="world-building-reference-panel">
            <header>
              <h3 className="font-display">Referenced By</h3>
            </header>
            <div className="world-building-backlink-list">
              {backlinks.map(({ entry, related }) => (
                <button key={`${entry.id}-${related.id}`} onClick={() => openWorldEntry(entry.category, entry.id)}>
                  <strong>{entry.title}</strong>
                  <span>{related.note || `References ${activeEntry.title}.`}</span>
                </button>
              ))}
              {!backlinks.length && <p className="world-building-muted">No backlinks yet.</p>}
            </div>
          </article>
        </section>
      </div>
    );
  };

  const setTagFilterAndCategory = (tag: string) => {
    setTagFilter(tag);
    setMode("category");
  };

  return (
    <>
      {mode === "dashboard" && renderDashboard()}
      {mode === "category" && renderCategory()}
      {mode === "detail" && renderDetail()}

      {addModalOpen && (
        <AddWorldEntryModal
          category={selectedCategory}
          draft={addDraft}
          onChange={(patch) => setAddDraft((current) => ({ ...current, ...patch }))}
          onSave={addEntry}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {relatedPicker.open && (
        <RelatedEntryPicker
          state={relatedPicker}
          targets={relationTargets}
          currentEntryId={selectedEntryId}
          onChange={setRelatedPicker}
          onSave={addRelatedEntries}
          onClose={() => setRelatedPicker((current) => ({ ...current, open: false }))}
        />
      )}

      {imageAdjustTarget && (
        <ImageAdjustModal
          slotLabel="World Building Image"
          imageUrl={imageAdjustTarget.imageUrl}
          imageFit={imageAdjustTarget.imageFit}
          aspectRatio="16 / 10"
          previewFrame={imageAdjustTarget.previewFrame}
          onSave={(next) => saveImageFit(next.imageUrl, next.imageFit)}
          onCancel={() => setImageAdjustTarget(null)}
        />
      )}
      {imageManagerOpen && (entryDraft || selectedEntry) && (
        <ImageManagerModal
          title={`${(entryDraft || selectedEntry)?.title || "World Entry"} Image Manager`}
          subtitle="Assign, import, upload, download, and frame this world-building entry image."
          slots={[{
            id: "worldEntryImage",
            label: "World Entry Image",
            description: "The primary reference image for this world-building entry.",
            imageUrl: (entryDraft || selectedEntry)?.image || "",
            imageFit: (entryDraft || selectedEntry)?.imageFit,
            frameWidth: 320,
            frameHeight: 210,
            uploadNameContext: {
              subjectName: (entryDraft || selectedEntry)?.title || "World Entry",
              categoryName: "World Building",
              slotName: "Reference Image",
              sourceType: categoryConfig((entryDraft || selectedEntry)?.category || "locations").title || "World Entry"
            }
          }]}
          onClose={() => setImageManagerOpen(false)}
          onSave={saveWorldImageManager}
        />
      )}
    </>
  );
}

function WorldBuildingHeader() {
  return (
    <section className="world-building-hero">
      <div className="world-building-hero-icon">
        <Icon name="Map" className="h-9 w-9" />
      </div>
      <div>
        <p>Tales of the Tavern</p>
        <h1 className="font-display">World Building</h1>
        <span>
          A living archive of the lands, cultures, histories, creatures, factions, and mysteries that shape the world of Tales of the Tavern.
        </span>
      </div>
    </section>
  );
}

function WorldSearchPanel({
  search,
  tagFilter,
  results,
  onSearchChange,
  onClearTag,
  onOpenTarget
}: {
  search: string;
  tagFilter: string;
  results: RelationTarget[];
  onSearchChange: (value: string) => void;
  onClearTag: () => void;
  onOpenTarget: (target: RelationTarget) => void;
}) {
  return (
    <section className="world-building-search-panel">
      <label className="world-building-search large">
        <Icon name="Search" className="h-5 w-5" />
        <input value={search} placeholder="Search world bible..." onChange={(event) => onSearchChange(event.target.value)} />
      </label>
      {tagFilter && (
        <button className="world-building-active-tag" onClick={onClearTag}>
          Tag: {tagFilter}
          <Icon name="X" className="h-4 w-4" />
        </button>
      )}
      {!!results.length && (
        <div className="world-building-search-results">
          {results.map((target) => (
            <button key={target.key} onClick={() => onOpenTarget(target)}>
              <strong>{target.title}</strong>
              <span>{target.subtitle}</span>
              <small>{target.summary || "Open this linked entry."}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function WorldEntryCard({
  entry,
  relatedCount,
  canAdjustImage,
  onSaveImage,
  onOpen,
  onTagClick
}: {
  entry: WorldBuildingEntry;
  relatedCount: number;
  canAdjustImage?: boolean;
  onSaveImage?: (next: { imageUrl: string; imageFit: ImageFitSettings }) => void;
  onOpen: () => void;
  onTagClick: (tag: string) => void;
}) {
  return (
    <article className="world-building-entry-card">
      <button className="world-building-entry-card-main" onClick={onOpen}>
        <div className="world-building-entry-thumb">
          {entry.image ? (
            <AdjustableImage
              src={resolveImageSourceUrl(entry.image)}
              label={`${entry.title} world card image`}
              imageFit={entry.imageFit}
              aspectRatio="1 / 1"
              canAdjust={canAdjustImage}
              onSave={onSaveImage}
            />
          ) : (
            <Icon name={categoryConfig(entry.category).icon} className="h-8 w-8" />
          )}
        </div>
        <div>
          <p>{entry.type}</p>
          <h3 className="font-display">{entry.title}</h3>
          <span>{entry.summary || "No summary yet."}</span>
        </div>
      </button>
      <div className="world-building-entry-card-footer">
        <TagList tags={entry.tags.slice(0, 4)} onTagClick={onTagClick} />
        <small>{relatedCount} related</small>
      </div>
      <button className="button-frame world-building-open-card" onClick={onOpen}>Open</button>
    </article>
  );
}

function TagList({ tags, onTagClick }: { tags: string[]; onTagClick: (tag: string) => void }) {
  if (!tags.length) return <span className="world-building-muted">No tags yet.</span>;
  return (
    <div className="world-building-tag-list">
      {tags.map((tag) => (
        <button key={tag} onClick={() => onTagClick(tag)}>
          {tag}
        </button>
      ))}
    </div>
  );
}

function AddWorldEntryModal({
  category,
  draft,
  onChange,
  onSave,
  onClose
}: {
  category: ReturnType<typeof categoryConfig>;
  draft: AddEntryDraft;
  onChange: (patch: Partial<AddEntryDraft>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="world-building-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add world-building entry">
      <section className="world-building-modal modal-frame">
        <header>
          <div>
            <p>{category.title}</p>
            <h2 className="font-display">Add {category.entryLabel}</h2>
          </div>
          <button className="world-building-icon-button" onClick={onClose} aria-label="Close">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>
        <div className="world-building-modal-grid">
          <label>
            <span>Entry title</span>
            <input value={draft.title} onChange={(event) => onChange({ title: event.target.value })} />
          </label>
          <label>
            <span>Entry type</span>
            <input value={draft.type} onChange={(event) => onChange({ type: event.target.value })} />
          </label>
          <label className="wide">
            <span>Short summary</span>
            <textarea value={draft.summary} onChange={(event) => onChange({ summary: event.target.value })} />
          </label>
          <label>
            <span>Tags</span>
            <input placeholder="Whisker Woods, Act 1, Corruption" value={draft.tags} onChange={(event) => onChange({ tags: event.target.value })} />
          </label>
          <label>
            <span>Optional image</span>
            <DriveImageSourceControls
              value={draft.image}
              label={`${draft.title || "New world entry"} image`}
              title="Choose World Entry Image"
              onChange={(image) => onChange({ image })}
            />
          </label>
          <label className="wide">
            <span>Initial notes</span>
            <textarea value={draft.notes} onChange={(event) => onChange({ notes: event.target.value })} />
          </label>
        </div>
        <footer>
          <button className="button-frame subtle" onClick={onClose}>Cancel</button>
          <button className="button-frame primary" onClick={onSave}>Create Entry</button>
        </footer>
      </section>
    </div>
  );
}

function RelatedEntryPicker({
  state,
  targets,
  currentEntryId,
  onChange,
  onSave,
  onClose
}: {
  state: RelatedPickerState;
  targets: RelationTarget[];
  currentEntryId: string;
  onChange: (state: RelatedPickerState) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const selectedOption = relationTypeOptions.find((option) => option.type === state.type) || relationTypeOptions[0];
  const filteredTargets = targets
    .filter((target) => target.targetId !== currentEntryId)
    .filter((target) => {
      if (selectedOption.category) return target.type === selectedOption.type && target.targetCategory === selectedOption.category;
      return target.type === selectedOption.type;
    })
    .filter((target) => {
      const query = state.search.trim().toLowerCase();
      return !query || `${target.title} ${target.subtitle} ${target.summary} ${target.tags.join(" ")}`.toLowerCase().includes(query);
    });

  const toggleSelected = (key: string) => {
    const selected = state.selectedKeys.includes(key)
      ? state.selectedKeys.filter((item) => item !== key)
      : [...state.selectedKeys, key];
    onChange({ ...state, selectedKeys: selected, message: "" });
  };

  return (
    <div className="world-building-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add Related Entry">
      <section className="world-building-modal world-building-related-modal modal-frame">
        <header>
          <div>
            <p>Cross-reference</p>
            <h2 className="font-display">Add Related Entry</h2>
          </div>
          <button className="world-building-icon-button" onClick={onClose} aria-label="Close">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>
        <div className="world-building-modal-grid compact">
          <label>
            <span>Entry type</span>
            <CustomSelect
              value={state.type}
              onChange={(value) => onChange({ ...state, type: value, selectedKeys: [], message: "" })}
              options={relationTypeOptions.map((option) => option.type)}
            />
          </label>
          <label>
            <span>Search entries</span>
            <input value={state.search} onChange={(event) => onChange({ ...state, search: event.target.value })} />
          </label>
          <label className="wide">
            <span>Connection note</span>
            <textarea value={state.note} placeholder="Explain why these entries connect." onChange={(event) => onChange({ ...state, note: event.target.value })} />
          </label>
        </div>
        <div className="world-building-picker-grid">
          {filteredTargets.map((target) => (
            <button
              key={target.key}
              className={state.selectedKeys.includes(target.key) ? "selected" : ""}
              onClick={() => toggleSelected(target.key)}
            >
              <span>
                {target.image ? <img src={resolveImageSourceUrl(target.image)} alt="" /> : <Icon name="BookOpen" className="h-6 w-6" />}
              </span>
              <strong>{target.title}</strong>
              <small>{target.subtitle}</small>
            </button>
          ))}
          {!filteredTargets.length && <p className="world-building-muted">No matching entries found.</p>}
        </div>
        {state.message && <p className="world-building-modal-message">{state.message}</p>}
        <footer>
          <button className="button-frame subtle" onClick={onClose}>Cancel</button>
          <button className="button-frame primary" onClick={onSave}>Add Selected</button>
        </footer>
      </section>
    </div>
  );
}

function RelatedEntryCard({
  related,
  target,
  isEditing,
  onRemove
}: {
  related: WorldBuildingRelatedEntry;
  target: RelationTarget;
  isEditing: boolean;
  onRemove: () => void;
}) {
  return (
    <article className="world-building-related-card">
      {isEditing && (
        <button className="world-building-remove-related" onClick={onRemove}>
          Remove
        </button>
      )}
      <button className="world-building-related-main" onClick={target.open}>
        <span>
          {target.image ? <img src={resolveImageSourceUrl(target.image)} alt="" /> : <Icon name="BookOpen" className="h-6 w-6" />}
        </span>
        <strong>{target.title}</strong>
        <small>{target.subtitle}</small>
      </button>
      <p>{related.note}</p>
    </article>
  );
}

function buildWorldStoryReaderSections(
  entry: WorldBuildingEntry,
  configSections: Array<{ id: string; title: string; helper: string; placeholder: string }>
): StoryReaderSection[] {
  const configuredSections = configSections.map((section) => ({
    key: section.id,
    title: section.title,
    icon: iconForWorldStorySection(section.id),
    value: entry.fields[section.id] || "",
    placeholder: section.placeholder
  }));

  return [
    {
      key: "summary",
      title: "Summary",
      icon: "BookOpen",
      value: entry.summary || "No summary added yet.",
      placeholder: "A clean quick-read summary."
    },
    ...configuredSections,
    {
      key: "deepNotes",
      title: "Deep Notes",
      icon: "ScrollText",
      value: entry.fields.deepNotes || "No deep notes yet.",
      placeholder: "Long-form notes, extra lore, production details, contradictions, and open questions."
    },
    {
      key: "connections",
      title: "Connections",
      icon: "Compass",
      value: formatWorldConnections(entry),
      placeholder: "Connected entries and why they matter."
    }
  ];
}

function buildWorldStoryReaderSteps(
  entry: WorldBuildingEntry,
  configSections: Array<{ id: string; title: string; helper: string; placeholder: string }>
): StoryReaderStep[] {
  return [
    { title: "What It Is", kicker: entry.type, text: entry.summary },
    ...configSections.map((section) => ({
      title: section.title,
      kicker: section.helper,
      text: entry.fields[section.id] || ""
    })),
    { title: "Deep Notes", kicker: "Internal", text: entry.fields.deepNotes || "" },
    { title: "Connections", kicker: "References", text: formatWorldConnections(entry) }
  ].filter((step) => step.text && step.text.trim());
}

function buildWorldFullStory(entry: WorldBuildingEntry, sections: StoryReaderSection[]) {
  if (entry.fields.fullStory?.trim()) return entry.fields.fullStory;
  return sections
    .map((section) => {
      const value = section.value.trim();
      if (!value || /^No .* yet\.$/i.test(value) || /^No .* added yet\.$/i.test(value)) return "";
      return `${section.title}\n${value}`;
    })
    .filter(Boolean)
    .join("\n\n") || "No full worldbuilding story has been written yet.";
}

function formatWorldConnections(entry: WorldBuildingEntry) {
  const related = entry.relatedEntries
    .map((item) => `${item.type}: ${item.targetId}${item.note ? ` - ${item.note}` : ""}`)
    .join("\n");
  const tags = entry.tags.length ? `Tags: ${entry.tags.join(", ")}` : "";
  return [tags, related].filter(Boolean).join("\n\n") || "No connections added yet.";
}

function iconForWorldStorySection(sectionId: string) {
  if (/history|timeline|origin/i.test(sectionId)) return "GitBranch";
  if (/people|culture|belief|relationship/i.test(sectionId)) return "Users";
  if (/magic|power|rule/i.test(sectionId)) return "Sparkles";
  if (/visual|image|look/i.test(sectionId)) return "Image";
  if (/quest|gameplay|story/i.test(sectionId)) return "Compass";
  return "BookOpen";
}

function buildRelationTargets({
  worldBuilding,
  loreEntries,
  bestiary,
  onOpenWorldEntry,
  onOpenEntry,
  onOpenCreature
}: {
  worldBuilding: WorldBuildingData;
  loreEntries: LoreEntry[];
  bestiary: BestiaryCreature[];
  onOpenWorldEntry: (entry: WorldBuildingEntry) => void;
  onOpenEntry: (entry: LoreEntry) => void;
  onOpenCreature: (creature: BestiaryCreature) => void;
}): RelationTarget[] {
  const worldTargets = allWorldBuildingEntries(worldBuilding).map((entry) => {
    const type = worldTypeForCategory(entry.category);
    return {
      key: `${type}:${entry.id}`,
      type,
      targetId: entry.id,
      targetCategory: entry.category,
      title: entry.title,
      subtitle: `${categoryConfig(entry.category).title} / ${entry.type}`,
      summary: entry.summary,
      image: entry.image,
      tags: entry.tags,
      open: () => onOpenWorldEntry(entry)
    };
  });
  const characterTargets = loreEntries.map((entry) => ({
    key: `character:${entry.id}`,
    type: "character",
    targetId: entry.id,
    title: entry.title,
    subtitle: entry.type || "Character",
    summary: richTextToPlainText(entry.summary || entry.publicDescription || entry.internalLore || ""),
    image: entry.media.characterPortrait || entry.media.mainImage || entry.media.iconImage || entry.media.dialogueSpriteImage || entry.media.ingameSpriteImage || "",
    tags: entry.tags || [],
    open: () => onOpenEntry(entry)
  }));
  const creatureTargets = bestiary.map((creature) => ({
    key: `creature:${creature.id}`,
    type: "creature",
    targetId: creature.id,
    title: creature.name,
    subtitle: `${creature.type} / ${creature.habitat || "Unknown region"}`,
    summary: creature.description || creature.overview || "",
    image: creature.image || creature.hoverImage || "",
    tags: [creature.type, creature.habitat, creature.status, creature.threatLevel].filter(Boolean),
    open: () => onOpenCreature(creature)
  }));
  return [...worldTargets, ...characterTargets, ...creatureTargets];
}

function resolveRelatedTarget(related: WorldBuildingRelatedEntry, targets: RelationTarget[]) {
  const exactKey = `${related.type}:${related.targetId}`;
  return targets.find((target) => target.key === exactKey)
    || targets.find((target) => target.targetId === related.targetId && (!related.targetCategory || target.targetCategory === related.targetCategory))
    || null;
}

function worldAssignmentModule(
  entry: WorldBuildingEntry,
  sectionKey: string,
  moduleTitle: string,
  categoryTitle: string
): AssignableModuleInfo {
  return {
    moduleId: `${entry.id}-${sectionKey}`,
    moduleTitle,
    moduleType: "world-building-section",
    entryId: entry.id,
    entryTitle: entry.title,
    entryCategory: `${categoryTitle} / ${entry.type}`,
    targetRoute: `world:${entry.category}:${entry.id}:${sectionKey}`
  };
}

function searchAllTargets(targets: RelationTarget[], query: string, tagFilter: string) {
  return targets.filter((target) => {
    const matchesQuery = !query || `${target.title} ${target.subtitle} ${target.summary} ${target.tags.join(" ")}`.toLowerCase().includes(query);
    const matchesTag = !tagFilter || target.tags.some((tag) => normalizeTag(tag) === normalizeTag(tagFilter));
    return matchesQuery && matchesTag;
  });
}

function sortWorldEntries(entries: WorldBuildingEntry[], sortMode: string) {
  return [...entries].sort((left, right) => {
    if (sortMode === "Title A-Z") return left.title.localeCompare(right.title);
    if (sortMode === "Type") return left.type.localeCompare(right.type) || left.title.localeCompare(right.title);
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function entrySearchText(entry: WorldBuildingEntry) {
  return `${entry.title} ${entry.type} ${entry.summary} ${entry.tags.join(" ")} ${Object.values(entry.fields).join(" ")}`.toLowerCase();
}

function latestEdited(entries: WorldBuildingEntry[]) {
  const latest = entries
    .map((entry) => new Date(entry.updatedAt).getTime())
    .filter((time) => Number.isFinite(time))
    .sort((left, right) => right - left)[0];
  return latest ? new Date(latest).toLocaleDateString() : "";
}

function splitTags(value: string) {
  return value.split(/[,\n]/).map((tag) => tag.trim()).filter(Boolean);
}

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function relationKey(related: WorldBuildingRelatedEntry) {
  return `${related.type}:${related.targetId}`;
}

function worldTypeForCategory(category: WorldBuildingCategoryId) {
  const map: Partial<Record<WorldBuildingCategoryId, string>> = {
    locations: "location",
    cultures: "culture",
    factions: "faction",
    timeline: "timeline",
    magicSystems: "magic",
    foodAndRecipes: "recipe",
    creatureLinks: "creature-link",
    characterLinks: "character-link",
    myths: "myth",
    items: "item",
    quests: "quest",
    rules: "rule",
    mysteries: "mystery",
    glossary: "glossary"
  };
  return map[category] || "world";
}

function frameFromElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height)
  };
}

function isCharacterEntry(entry: LoreEntry) {
  return /character/i.test(entry.category) || /character/i.test(entry.type);
}
