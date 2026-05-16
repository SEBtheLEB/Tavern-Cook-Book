import { useMemo, useState } from "react";
import type { StoryReference } from "../types";
import {
  createStoryReference,
  storyReferenceCanonOptions,
  storyReferenceSearchText,
  storyReferenceSpoilerOptions,
  storyReferenceSyncStatus,
  type StoryReferenceDraftInput
} from "../utils/storyReferences";
import { Icon } from "./Icon";
import { RichLoreText } from "./RichText";

interface StoryReferenceCardProps {
  reference?: StoryReference;
  mode?: "compact" | "expanded";
  targetUpdatedAt?: string;
  onOpenSource?: (storyReferenceId: string) => void;
  onUnlink?: (storyReferenceId: string) => void;
}

interface LinkedStoryReferencesSectionProps {
  storyReferences: StoryReference[];
  linkedStoryReferenceIds: string[];
  targetUpdatedAt?: string;
  readOnly?: boolean;
  isEditing?: boolean;
  title?: string;
  onChangeLinkedIds?: (ids: string[]) => void;
  onCreateReference?: (input: StoryReferenceDraftInput) => StoryReference;
  onOpenStorySource?: (storyReferenceId: string) => void;
}

interface StoryReferencePickerProps {
  storyReferences: StoryReference[];
  linkedStoryReferenceIds: string[];
  onLink: (storyReferenceId: string) => void;
  onCreateReference?: (input: StoryReferenceDraftInput) => StoryReference;
  onClose: () => void;
}

const allFilterValue = "All";

export function StoryReferenceCard({
  reference,
  mode = "compact",
  targetUpdatedAt,
  onOpenSource,
  onUnlink
}: StoryReferenceCardProps) {
  if (!reference) {
    return (
      <article className="story-reference-card missing-source">
        <div>
          <p>Linked Story Reference</p>
          <h4>Missing Source</h4>
          <span>This linked story source no longer exists.</span>
        </div>
        <strong className="story-reference-sync missing">Missing Source</strong>
      </article>
    );
  }

  const syncStatus = storyReferenceSyncStatus(reference, targetUpdatedAt);
  return (
    <article className={`story-reference-card ${mode}`}>
      <header>
        <div>
          <p>Linked Story</p>
          <h4>{reference.title}</h4>
        </div>
        <span className={`story-reference-sync ${syncStatusClass(syncStatus)}`}>{syncStatus}</span>
      </header>
      <div className="story-reference-summary">
        <RichLoreText text={reference.shortSummary || "No linked summary written yet."} />
      </div>
      <div className="story-reference-badges">
        <span>{reference.canonStatus}</span>
        <span>{reference.spoilerLevel}</span>
        {reference.actChapter && <span>{reference.actChapter}</span>}
      </div>
      {syncStatus === "Source Updated" && (
        <p className="story-reference-review-note">Source updated. Review this page?</p>
      )}
      {mode === "expanded" && (
        <div className="story-reference-expanded-body">
          <RichLoreText text={reference.fullDescription || "No full description written yet."} />
          <ReferenceRelatedList label="Characters" values={reference.relatedCharacters} />
          <ReferenceRelatedList label="Locations" values={reference.relatedLocations} />
          <ReferenceRelatedList label="Quests" values={reference.relatedQuests} />
          <ReferenceRelatedList label="Timeline" values={reference.relatedTimelineEvents} />
          {reference.notes && (
            <div>
              <strong>Notes</strong>
              <RichLoreText text={reference.notes} />
            </div>
          )}
        </div>
      )}
      <footer>
        <button className="character-codex-action-button" onClick={() => onOpenSource?.(reference.id)}>
          <Icon name="BookOpen" className="h-4 w-4" />
          Open Story Source
        </button>
        <button className="character-codex-action-button" onClick={() => copyLinkedSummary(reference)}>
          <Icon name="Copy" className="h-4 w-4" />
          Copy Linked Summary
        </button>
        {onUnlink && (
          <button className="character-codex-action-button story-reference-unlink" onClick={() => onUnlink(reference.id)}>
            <Icon name="Unlink" className="h-4 w-4" />
            Unlink
          </button>
        )}
      </footer>
    </article>
  );
}

export function LinkedStoryReferencesSection({
  storyReferences,
  linkedStoryReferenceIds,
  targetUpdatedAt,
  readOnly = false,
  isEditing = false,
  title = "Linked Story References",
  onChangeLinkedIds,
  onCreateReference,
  onOpenStorySource
}: LinkedStoryReferencesSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const uniqueLinkedIds = useMemo(() => uniqueStrings(linkedStoryReferenceIds), [linkedStoryReferenceIds]);
  const referenceById = useMemo(() => new Map(storyReferences.map((reference) => [reference.id, reference])), [storyReferences]);
  const canEditLinks = !readOnly && isEditing && Boolean(onChangeLinkedIds);

  const unlink = (storyReferenceId: string) => {
    if (!canEditLinks) return;
    onChangeLinkedIds?.(uniqueLinkedIds.filter((id) => id !== storyReferenceId));
  };

  const link = (storyReferenceId: string) => {
    if (!onChangeLinkedIds) return;
    onChangeLinkedIds(uniqueStrings([...uniqueLinkedIds, storyReferenceId]));
  };

  return (
    <section className="linked-story-reference-section">
      <header>
        <div>
          <p>Local Notes stay on this page. Linked Story References pull from the Story Journal source.</p>
          <h3 className="font-display">{title}</h3>
        </div>
        {canEditLinks && (
          <button className="button-frame character-codex-action-button" onClick={() => setPickerOpen(true)}>
            <Icon name="Plus" className="h-4 w-4" />
            Attach Story Reference
          </button>
        )}
      </header>
      <div className="linked-story-reference-grid">
        {uniqueLinkedIds.length ? (
          uniqueLinkedIds.map((storyReferenceId) => (
            <StoryReferenceCard
              key={storyReferenceId}
              reference={referenceById.get(storyReferenceId)}
              targetUpdatedAt={targetUpdatedAt}
              onOpenSource={onOpenStorySource}
              onUnlink={canEditLinks ? unlink : undefined}
            />
          ))
        ) : (
          <div className="linked-story-reference-empty">
            <Icon name="Link" className="h-5 w-5" />
            <span>No Story References linked yet.</span>
          </div>
        )}
      </div>
      {pickerOpen && (
        <StoryReferencePicker
          storyReferences={storyReferences}
          linkedStoryReferenceIds={uniqueLinkedIds}
          onLink={link}
          onCreateReference={onCreateReference}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </section>
  );
}

function StoryReferencePicker({
  storyReferences,
  linkedStoryReferenceIds,
  onLink,
  onCreateReference,
  onClose
}: StoryReferencePickerProps) {
  const [query, setQuery] = useState("");
  const [actFilter, setActFilter] = useState(allFilterValue);
  const [characterFilter, setCharacterFilter] = useState(allFilterValue);
  const [locationFilter, setLocationFilter] = useState(allFilterValue);
  const [questFilter, setQuestFilter] = useState(allFilterValue);
  const [factionFilter, setFactionFilter] = useState(allFilterValue);
  const [spoilerFilter, setSpoilerFilter] = useState(allFilterValue);
  const [canonFilter, setCanonFilter] = useState(allFilterValue);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<StoryReferenceDraftInput>({
    title: "",
    shortSummary: "",
    fullDescription: "",
    canonStatus: "Canon",
    spoilerLevel: "Team Spoiler",
    actChapter: ""
  });

  const options = useMemo(() => buildPickerOptions(storyReferences), [storyReferences]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return storyReferences.filter((reference) => {
      if (linkedStoryReferenceIds.includes(reference.id)) return false;
      if (actFilter !== allFilterValue && reference.actChapter !== actFilter) return false;
      if (characterFilter !== allFilterValue && !reference.relatedCharacters.includes(characterFilter)) return false;
      if (locationFilter !== allFilterValue && !reference.relatedLocations.includes(locationFilter)) return false;
      if (questFilter !== allFilterValue && !reference.relatedQuests.includes(questFilter)) return false;
      if (factionFilter !== allFilterValue && !reference.relatedFactions.includes(factionFilter)) return false;
      if (spoilerFilter !== allFilterValue && reference.spoilerLevel !== spoilerFilter) return false;
      if (canonFilter !== allFilterValue && reference.canonStatus !== canonFilter) return false;
      return !normalizedQuery || storyReferenceSearchText(reference).includes(normalizedQuery);
    });
  }, [actFilter, canonFilter, characterFilter, factionFilter, linkedStoryReferenceIds, locationFilter, query, questFilter, spoilerFilter, storyReferences]);

  const createAndLink = () => {
    if (!createDraft.title?.trim()) return;
    const reference = onCreateReference
      ? onCreateReference(createDraft)
      : createStoryReference(createDraft, storyReferences.map((item) => item.id));
    onLink(reference.id);
    setCreateDraft({
      title: "",
      shortSummary: "",
      fullDescription: "",
      canonStatus: "Canon",
      spoilerLevel: "Team Spoiler",
      actChapter: ""
    });
    setCreateOpen(false);
  };

  return (
    <div className="story-reference-picker-backdrop">
      <section className="story-reference-picker modal-frame" role="dialog" aria-modal="true" aria-label="Attach Story Reference">
        <header>
          <div>
            <p>Attach Story Reference</p>
            <h3 className="font-display">Story Source Picker</h3>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close">
            <Icon name="X" className="h-4 w-4" />
          </button>
        </header>

        <div className="story-reference-picker-controls">
          <label>
            <span>Search</span>
            <input value={query} placeholder="Search story sources" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <PickerSelect label="Act" value={actFilter} options={options.acts} onChange={setActFilter} />
          <PickerSelect label="Character" value={characterFilter} options={options.characters} onChange={setCharacterFilter} />
          <PickerSelect label="Location" value={locationFilter} options={options.locations} onChange={setLocationFilter} />
          <PickerSelect label="Quest" value={questFilter} options={options.quests} onChange={setQuestFilter} />
          <PickerSelect label="Faction" value={factionFilter} options={options.factions} onChange={setFactionFilter} />
          <PickerSelect label="Spoiler" value={spoilerFilter} options={storyReferenceSpoilerOptions} onChange={setSpoilerFilter} />
          <PickerSelect label="Canon" value={canonFilter} options={storyReferenceCanonOptions} onChange={setCanonFilter} />
        </div>

        <div className="story-reference-picker-body entry-scroll">
          <button className="button-frame story-reference-create-toggle" onClick={() => setCreateOpen((value) => !value)}>
            <Icon name="Plus" className="h-4 w-4" />
            Create New Story Reference
          </button>
          {createOpen && (
            <div className="story-reference-create-form">
              <input value={createDraft.title || ""} placeholder="Title, like Role of the Whisken People" onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))} />
              <textarea value={createDraft.shortSummary || ""} placeholder="Short linked summary" onChange={(event) => setCreateDraft((current) => ({ ...current, shortSummary: event.target.value }))} />
              <textarea value={createDraft.fullDescription || ""} placeholder="Full description" onChange={(event) => setCreateDraft((current) => ({ ...current, fullDescription: event.target.value }))} />
              <div className="story-reference-create-row">
                <select value={String(createDraft.canonStatus || "Canon")} onChange={(event) => setCreateDraft((current) => ({ ...current, canonStatus: event.target.value }))}>
                  {storyReferenceCanonOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={String(createDraft.spoilerLevel || "Team Spoiler")} onChange={(event) => setCreateDraft((current) => ({ ...current, spoilerLevel: event.target.value }))}>
                  {storyReferenceSpoilerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <input value={createDraft.actChapter || ""} placeholder="Act / chapter" onChange={(event) => setCreateDraft((current) => ({ ...current, actChapter: event.target.value }))} />
              </div>
              <button className="button-frame" onClick={createAndLink}>Create and Link</button>
            </div>
          )}

          <div className="story-reference-picker-list">
            {filtered.map((reference) => (
              <article key={reference.id} className="story-reference-picker-row">
                <div>
                  <strong>{reference.title}</strong>
                  <span>{reference.shortSummary || "No linked summary yet."}</span>
                  <small>{reference.canonStatus} / {reference.spoilerLevel}{reference.actChapter ? ` / ${reference.actChapter}` : ""}</small>
                </div>
                <button className="button-frame" onClick={() => onLink(reference.id)}>Link</button>
              </article>
            ))}
            {!filtered.length && <div className="linked-story-reference-empty">No unlinked story references match this search.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function PickerSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={allFilterValue}>All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ReferenceRelatedList({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div>
      <strong>{label}</strong>
      <div className="story-reference-badges">
        {values.map((value) => <span key={value}>{value}</span>)}
      </div>
    </div>
  );
}

function buildPickerOptions(references: StoryReference[]) {
  return {
    acts: uniqueStrings(references.map((reference) => reference.actChapter || "")),
    characters: uniqueStrings(references.flatMap((reference) => reference.relatedCharacters)),
    locations: uniqueStrings(references.flatMap((reference) => reference.relatedLocations)),
    quests: uniqueStrings(references.flatMap((reference) => reference.relatedQuests)),
    factions: uniqueStrings(references.flatMap((reference) => reference.relatedFactions))
  };
}

function copyLinkedSummary(reference: StoryReference) {
  const summary = `${reference.title}\n${reference.shortSummary || ""}`.trim();
  if (!summary) return;
  void navigator.clipboard?.writeText(summary);
}

function syncStatusClass(value: string) {
  if (/missing/i.test(value)) return "missing";
  if (/updated|review/i.test(value)) return "updated";
  return "synced";
}

function uniqueStrings(values: string[]) {
  return values.map((value) => value.trim()).filter((value, index, list) => value && list.indexOf(value) === index).sort((left, right) => left.localeCompare(right));
}
