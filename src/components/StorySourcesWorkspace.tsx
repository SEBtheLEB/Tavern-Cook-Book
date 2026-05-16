import { useEffect, useMemo, useState } from "react";
import type { GlossaryTerm, LoreDatabase, StoryReference, StoryReferenceVersion } from "../types";
import {
  backlinksForReference,
  buildStoryConsistencyResults,
  buildStoryReferenceBacklinks,
  createStoryReference,
  createStoryReferenceId,
  normalizeGlossaryTerm,
  normalizeStoryReference,
  storyReferenceCanonOptions,
  storyReferenceSearchText,
  storyReferenceSpoilerOptions,
  type StoryReferenceBacklink,
  type StoryReferenceDraftInput
} from "../utils/storyReferences";
import { Icon } from "./Icon";
import { StoryReferenceCard } from "./LinkedStoryReferences";
import { RichLoreText } from "./RichText";

interface StorySourcesWorkspaceProps {
  database: LoreDatabase;
  readOnly?: boolean;
  focusStoryReferenceId?: string;
  onFocusHandled?: () => void;
  onSaveReference: (reference: StoryReference, mode: "update" | "newVersion") => void;
  onCreateReference: (input: StoryReferenceDraftInput) => StoryReference;
  onRestoreVersion: (storyReferenceId: string, versionId: string) => void;
  onSaveGlossaryTerm: (term: GlossaryTerm) => void;
  onOpenTarget: (target: StoryReferenceBacklink) => void;
  onLinkTarget: (target: StoryReferenceBacklink, storyReferenceId: string) => void;
  onOpenStorySource: (storyReferenceId: string) => void;
}

type WorkspaceTab = "sources" | "checker" | "glossary";

export function StorySourcesWorkspace({
  database,
  readOnly = false,
  focusStoryReferenceId = "",
  onFocusHandled,
  onSaveReference,
  onCreateReference,
  onRestoreVersion,
  onSaveGlossaryTerm,
  onOpenTarget,
  onLinkTarget,
  onOpenStorySource
}: StorySourcesWorkspaceProps) {
  const storyReferences = database.storyReferences || [];
  const glossaryTerms = database.glossaryTerms || [];
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("sources");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(storyReferences[0]?.id || "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StoryReference | null>(null);
  const [impactPreview, setImpactPreview] = useState<StoryReference | null>(null);

  useEffect(() => {
    if (!focusStoryReferenceId) return;
    if (storyReferences.some((reference) => reference.id === focusStoryReferenceId)) {
      setActiveTab("sources");
      setSelectedId(focusStoryReferenceId);
      setEditing(false);
      setDraft(null);
    }
    onFocusHandled?.();
  }, [focusStoryReferenceId, onFocusHandled, storyReferences]);

  useEffect(() => {
    if (!storyReferences.length) {
      setSelectedId("");
      return;
    }
    if (!storyReferences.some((reference) => reference.id === selectedId)) {
      setSelectedId(storyReferences[0].id);
    }
  }, [selectedId, storyReferences]);

  const filteredReferences = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return storyReferences
      .filter((reference) => !normalizedQuery || storyReferenceSearchText(reference).includes(normalizedQuery))
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [query, storyReferences]);
  const selectedReference = storyReferences.find((reference) => reference.id === selectedId) || filteredReferences[0] || storyReferences[0] || null;
  const activeReference = draft || selectedReference;
  const backlinks = selectedReference ? backlinksForReference(database, selectedReference.id) : [];

  const beginEdit = () => {
    if (!selectedReference) return;
    setDraft(normalizeStoryReference(selectedReference));
    setEditing(true);
  };

  const beginCreate = () => {
    const created = createStoryReference({
      title: "New Story Reference",
      shortSummary: "",
      fullDescription: "",
      canonStatus: "Idea",
      spoilerLevel: "Team Spoiler"
    }, storyReferences.map((reference) => reference.id));
    setDraft(created);
    setSelectedId(created.id);
    setEditing(true);
  };

  const requestSave = () => {
    if (!draft) return;
    setImpactPreview(normalizeStoryReference({
      ...draft,
      lastEditedAt: new Date().toISOString()
    }));
  };

  const commitSave = (mode: "update" | "newVersion") => {
    if (!impactPreview) return;
    onSaveReference(impactPreview, mode);
    setSelectedId(impactPreview.id);
    setDraft(null);
    setEditing(false);
    setImpactPreview(null);
  };

  return (
    <section className="story-source-workspace">
      <header className="story-source-workspace-header">
        <div>
          <p>Story Source of Truth</p>
          <h2 className="font-display">Linked Story References</h2>
          <span>Local notes stay where they are. Linked summaries pull from these central records.</span>
        </div>
        <div className="story-source-stats">
          <span>{storyReferences.length} sources</span>
          <span>{glossaryTerms.length} glossary terms</span>
          <span>{buildStoryReferenceBacklinks(database).length} backlinks</span>
        </div>
      </header>

      <nav className="story-source-tabs">
        <button className={activeTab === "sources" ? "active" : ""} onClick={() => setActiveTab("sources")}>Story Sources</button>
        <button className={activeTab === "checker" ? "active" : ""} onClick={() => setActiveTab("checker")}>Consistency Checker</button>
        <button className={activeTab === "glossary" ? "active" : ""} onClick={() => setActiveTab("glossary")}>Story Terms / Glossary</button>
      </nav>

      {activeTab === "sources" && (
        <div className="story-source-layout">
          <aside className="story-source-list-panel">
            <div className="story-source-search-row">
              <Icon name="Search" className="h-4 w-4" />
              <input value={query} placeholder="Search story references" onChange={(event) => setQuery(event.target.value)} />
            </div>
            {!readOnly && (
              <button className="button-frame story-source-create-button" onClick={beginCreate}>
                <Icon name="Plus" className="h-4 w-4" />
                Create Story Reference
              </button>
            )}
            <div className="story-source-list entry-scroll">
              {filteredReferences.map((reference) => (
                <button
                  key={reference.id}
                  className={reference.id === selectedReference?.id ? "active" : ""}
                  onClick={() => {
                    setSelectedId(reference.id);
                    setEditing(false);
                    setDraft(null);
                  }}
                >
                  <strong>{reference.title}</strong>
                  <span>{reference.shortSummary || "No summary yet."}</span>
                  <small>{reference.canonStatus} / {reference.spoilerLevel}</small>
                </button>
              ))}
            </div>
          </aside>

          <article className="story-source-detail-panel">
            {activeReference ? (
              <>
                <header>
                  <div>
                    <p>{activeReference.id}</p>
                    {editing ? (
                      <input className="story-source-title-input font-display" value={activeReference.title} onChange={(event) => setDraftValue({ title: event.target.value })} />
                    ) : (
                      <h3 className="font-display">{activeReference.title}</h3>
                    )}
                    <div className="story-reference-badges">
                      <span>{activeReference.canonStatus}</span>
                      <span>{activeReference.spoilerLevel}</span>
                      {activeReference.actChapter && <span>{activeReference.actChapter}</span>}
                    </div>
                  </div>
                  <div className="story-source-actions">
                    {!readOnly && editing ? (
                      <>
                        <button className="button-frame" onClick={requestSave}>
                          <Icon name="Save" className="h-4 w-4" />
                          Save
                        </button>
                        <button className="character-codex-action-button" onClick={() => {
                          setDraft(null);
                          setEditing(false);
                        }}>Cancel</button>
                      </>
                    ) : !readOnly ? (
                      <button className="button-frame" onClick={beginEdit}>
                        <Icon name="Edit3" className="h-4 w-4" />
                        Edit Source
                      </button>
                    ) : null}
                  </div>
                </header>

                {editing ? (
                  <StoryReferenceEditForm reference={activeReference} onChange={setDraftValue} />
                ) : (
                  <div className="story-source-read-grid">
                    <section className="story-source-read-block">
                      <h4>Short Linked Summary</h4>
                      <RichLoreText text={activeReference.shortSummary || "No linked summary written yet."} />
                    </section>
                    <section className="story-source-read-block">
                      <h4>Full Description</h4>
                      <RichLoreText text={activeReference.fullDescription || "No full source description written yet."} />
                    </section>
                    <section className="story-source-read-block">
                      <h4>Notes</h4>
                      <RichLoreText text={activeReference.notes || "No source notes yet."} />
                    </section>
                  </div>
                )}

                <section className="story-source-reference-preview">
                  <StoryReferenceCard reference={activeReference} mode="expanded" onOpenSource={onOpenStorySource} />
                </section>

                <ReferencedInList backlinks={backlinks} onOpenTarget={onOpenTarget} />

                <VersionHistory
                  reference={selectedReference}
                  readOnly={readOnly}
                  onRestoreVersion={(version) => selectedReference && onRestoreVersion(selectedReference.id, version.id)}
                />
              </>
            ) : (
              <div className="story-empty-state">
                <Icon name="BookOpen" className="h-8 w-8" />
                <strong>No story references yet.</strong>
              </div>
            )}
          </article>
        </div>
      )}

      {activeTab === "checker" && (
        <ConsistencyChecker
          database={database}
          onOpenTarget={onOpenTarget}
          onOpenStorySource={onOpenStorySource}
          onLinkTarget={onLinkTarget}
        />
      )}

      {activeTab === "glossary" && (
        <GlossaryWorkspace
          terms={glossaryTerms}
          storyReferences={storyReferences}
          readOnly={readOnly}
          onSaveTerm={onSaveGlossaryTerm}
          onOpenStorySource={onOpenStorySource}
        />
      )}

      {impactPreview && selectedReference && (
        <ImpactPreviewModal
          reference={impactPreview}
          backlinks={backlinksForReference(database, selectedReference.id)}
          onSave={() => commitSave("update")}
          onSaveAsNew={() => commitSave("newVersion")}
          onCancel={() => setImpactPreview(null)}
        />
      )}
    </section>
  );

  function setDraftValue(patch: Partial<StoryReference>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }
}

function StoryReferenceEditForm({ reference, onChange }: { reference: StoryReference; onChange: (patch: Partial<StoryReference>) => void }) {
  return (
    <div className="story-source-edit-form">
      <label>
        <span>Reference ID</span>
        <input value={reference.id} onChange={(event) => onChange({ id: cleanReferenceId(event.target.value) })} />
      </label>
      <label>
        <span>Short Linked Summary</span>
        <textarea value={reference.shortSummary} onChange={(event) => onChange({ shortSummary: event.target.value })} />
      </label>
      <label>
        <span>Full Description</span>
        <textarea value={reference.fullDescription} onChange={(event) => onChange({ fullDescription: event.target.value })} />
      </label>
      <label>
        <span>Canon Status</span>
        <select value={String(reference.canonStatus)} onChange={(event) => onChange({ canonStatus: event.target.value })}>
          {storyReferenceCanonOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label>
        <span>Spoiler Level</span>
        <select value={String(reference.spoilerLevel)} onChange={(event) => onChange({ spoilerLevel: event.target.value })}>
          {storyReferenceSpoilerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label>
        <span>Act / Chapter</span>
        <input value={reference.actChapter || ""} onChange={(event) => onChange({ actChapter: event.target.value })} />
      </label>
      <MultiText label="Related Characters" values={reference.relatedCharacters} onChange={(values) => onChange({ relatedCharacters: values })} />
      <MultiText label="Related Locations" values={reference.relatedLocations} onChange={(values) => onChange({ relatedLocations: values })} />
      <MultiText label="Related Quests" values={reference.relatedQuests} onChange={(values) => onChange({ relatedQuests: values })} />
      <MultiText label="Related Factions / Cultures" values={reference.relatedFactions} onChange={(values) => onChange({ relatedFactions: values })} />
      <MultiText label="Related Items / Artifacts" values={reference.relatedItems} onChange={(values) => onChange({ relatedItems: values })} />
      <MultiText label="Related Recipes / Meals" values={reference.relatedRecipes} onChange={(values) => onChange({ relatedRecipes: values })} />
      <MultiText label="Related Timeline Events" values={reference.relatedTimelineEvents} onChange={(values) => onChange({ relatedTimelineEvents: values })} />
      <MultiText label="Related Lore Reveals" values={reference.relatedLoreReveals} onChange={(values) => onChange({ relatedLoreReveals: values })} />
      <MultiText label="Related Story Beats" values={reference.relatedStoryBeats} onChange={(values) => onChange({ relatedStoryBeats: values })} />
      <MultiText label="Tags" values={reference.tags} onChange={(values) => onChange({ tags: values })} />
      <label>
        <span>Notes</span>
        <textarea value={reference.notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>
    </div>
  );
}

function ReferencedInList({ backlinks, onOpenTarget }: { backlinks: StoryReferenceBacklink[]; onOpenTarget: (target: StoryReferenceBacklink) => void }) {
  const grouped = backlinks.reduce<Record<string, StoryReferenceBacklink[]>>((groups, backlink) => {
    groups[backlink.moduleLabel] = [...(groups[backlink.moduleLabel] || []), backlink];
    return groups;
  }, {});

  return (
    <section className="story-source-referenced-in">
      <header>
        <h4 className="font-display">Referenced In</h4>
        <span>{backlinks.length} linked places</span>
      </header>
      {Object.entries(grouped).map(([moduleLabel, items]) => (
        <div key={moduleLabel} className="story-source-backlink-group">
          <strong>{moduleLabel}</strong>
          {items.map((item) => (
            <button key={item.id} onClick={() => onOpenTarget(item)}>
              <span>{item.title}</span>
              <small>{item.summary || "Linked story card"}</small>
            </button>
          ))}
        </div>
      ))}
      {!backlinks.length && <p className="world-building-muted">No backlinks yet. Attach this source to Characters, World Building, Bestiary, or lore entries.</p>}
    </section>
  );
}

function VersionHistory({
  reference,
  readOnly,
  onRestoreVersion
}: {
  reference: StoryReference | null;
  readOnly: boolean;
  onRestoreVersion: (version: StoryReferenceVersion) => void;
}) {
  if (!reference) return null;
  return (
    <details className="story-source-version-history">
      <summary>View Version History ({reference.versions.length})</summary>
      <div className="story-source-version-list">
        {reference.versions.map((version) => (
          <article key={version.id}>
            <div>
              <strong>{version.previousTitle}</strong>
              <span>{new Date(version.editedAt).toLocaleString()}</span>
              <small>{version.previousCanonStatus} / {version.previousSpoilerLevel}</small>
            </div>
            <p>{version.previousShortSummary || "No previous summary."}</p>
            {!readOnly && <button className="character-codex-action-button" onClick={() => onRestoreVersion(version)}>Restore Previous Version</button>}
          </article>
        ))}
        {!reference.versions.length && <p>No saved previous versions yet.</p>}
      </div>
    </details>
  );
}

function ConsistencyChecker({
  database,
  onOpenTarget,
  onOpenStorySource,
  onLinkTarget
}: {
  database: LoreDatabase;
  onOpenTarget: (target: StoryReferenceBacklink) => void;
  onOpenStorySource: (storyReferenceId: string) => void;
  onLinkTarget: (target: StoryReferenceBacklink, storyReferenceId: string) => void;
}) {
  const results = useMemo(() => buildStoryConsistencyResults(database), [database]);
  return (
    <section className="story-consistency-panel">
      <header>
        <div>
          <p>Story Consistency Checker</p>
          <h3 className="font-display">{results.length} suggestions</h3>
        </div>
      </header>
      <div className="story-consistency-grid">
        {results.map((result) => (
          <article key={result.id} className={`story-consistency-card ${result.kind}`}>
            <p>{result.kind.replace(/([A-Z])/g, " $1")}</p>
            <h4>{result.title}</h4>
            <span>{result.detail}</span>
            <footer>
              {result.storyReferenceId && (
                <button className="button-frame" onClick={() => onOpenStorySource(result.storyReferenceId || "")}>
                  {result.actionLabel}
                </button>
              )}
              {result.kind === "unlinkedMention" && result.target && result.storyReferenceId && (
                <button className="character-codex-action-button" onClick={() => onLinkTarget(result.target as StoryReferenceBacklink, result.storyReferenceId || "")}>
                  Link Existing Reference
                </button>
              )}
              {result.target && (
                <button className="character-codex-action-button" onClick={() => onOpenTarget(result.target as StoryReferenceBacklink)}>
                  Review Page
                </button>
              )}
            </footer>
          </article>
        ))}
        {!results.length && (
          <div className="story-empty-state">
            <Icon name="ShieldCheck" className="h-8 w-8" />
            <strong>No story consistency issues found.</strong>
          </div>
        )}
      </div>
    </section>
  );
}

function GlossaryWorkspace({
  terms,
  storyReferences,
  readOnly,
  onSaveTerm,
  onOpenStorySource
}: {
  terms: GlossaryTerm[];
  storyReferences: StoryReference[];
  readOnly: boolean;
  onSaveTerm: (term: GlossaryTerm) => void;
  onOpenStorySource: (storyReferenceId: string) => void;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<GlossaryTerm>(() => createBlankGlossaryDraft());
  const referenceById = new Map(storyReferences.map((reference) => [reference.id, reference]));

  const save = () => {
    if (!draft.primaryName.trim()) return;
    onSaveTerm(normalizeGlossaryTerm({
      ...draft,
      id: draft.id || `term_${Date.now()}`,
      updatedAt: new Date().toISOString()
    }));
    setDraft(createBlankGlossaryDraft());
    setDraftOpen(false);
  };

  return (
    <section className="story-glossary-panel">
      <header>
        <div>
          <p>Story Terms / Glossary</p>
          <h3 className="font-display">Registered Terms</h3>
        </div>
        {!readOnly && (
          <button className="button-frame" onClick={() => setDraftOpen((value) => !value)}>
            <Icon name="Plus" className="h-4 w-4" />
            Add Term
          </button>
        )}
      </header>
      {draftOpen && (
        <div className="story-glossary-form">
          <input value={draft.primaryName} placeholder="Primary name" onChange={(event) => setDraft((current) => ({ ...current, primaryName: event.target.value }))} />
          <input value={draft.alternateNames.join(", ")} placeholder="Alternate names / spellings" onChange={(event) => setDraft((current) => ({ ...current, alternateNames: splitValues(event.target.value) }))} />
          <textarea value={draft.shortDefinition} placeholder="Short definition" onChange={(event) => setDraft((current) => ({ ...current, shortDefinition: event.target.value }))} />
          <select value={draft.linkedStoryReferenceId} onChange={(event) => setDraft((current) => ({ ...current, linkedStoryReferenceId: event.target.value }))}>
            <option value="">No linked story source</option>
            {storyReferences.map((reference) => <option key={reference.id} value={reference.id}>{reference.title}</option>)}
          </select>
          <select value={String(draft.spoilerLevel)} onChange={(event) => setDraft((current) => ({ ...current, spoilerLevel: event.target.value }))}>
            {storyReferenceSpoilerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button className="button-frame" onClick={save}>Save Term</button>
        </div>
      )}
      <div className="story-glossary-grid">
        {terms.map((term) => (
          <article key={term.id} className="story-glossary-card">
            <p>{term.spoilerLevel}</p>
            <h4>{term.primaryName}</h4>
            <span>{term.shortDefinition || "No definition yet."}</span>
            {term.alternateNames.length > 0 && <small>Also: {term.alternateNames.join(", ")}</small>}
            {term.linkedStoryReferenceId && (
              <button className="character-codex-action-button" onClick={() => onOpenStorySource(term.linkedStoryReferenceId)}>
                Open Source: {referenceById.get(term.linkedStoryReferenceId)?.title || "Missing Source"}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ImpactPreviewModal({
  reference,
  backlinks,
  onSave,
  onSaveAsNew,
  onCancel
}: {
  reference: StoryReference;
  backlinks: StoryReferenceBacklink[];
  onSave: () => void;
  onSaveAsNew: () => void;
  onCancel: () => void;
}) {
  const counts = backlinks.reduce<Record<string, number>>((map, backlink) => {
    map[backlink.moduleLabel] = (map[backlink.moduleLabel] || 0) + 1;
    return map;
  }, {});
  return (
    <div className="story-reference-picker-backdrop">
      <section className="story-impact-modal modal-frame" role="dialog" aria-modal="true">
        <header>
          <div>
            <p>Linked Update Warning</p>
            <h3 className="font-display">Updating {reference.title}</h3>
          </div>
        </header>
        <div className="story-impact-body entry-scroll">
          <p>This story reference is used in {backlinks.length} places across the app. Updating it will update linked summaries everywhere.</p>
          <div className="story-impact-counts">
            {Object.entries(counts).map(([label, count]) => <span key={label}>{count} {label}</span>)}
          </div>
          {backlinks.map((backlink) => (
            <article key={backlink.id} className="story-source-backlink-preview">
              <strong>{backlink.title}</strong>
              <span>{backlink.moduleLabel}</span>
              <small>{backlink.summary}</small>
            </article>
          ))}
        </div>
        <footer>
          <button className="character-codex-action-button" onClick={onCancel}>Cancel</button>
          <button className="character-codex-action-button" onClick={onSaveAsNew}>Save as New Version</button>
          <button className="button-frame" onClick={onSave}>Save Update</button>
        </footer>
      </section>
    </div>
  );
}

function MultiText({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input value={values.join(", ")} onChange={(event) => onChange(splitValues(event.target.value))} />
    </label>
  );
}

function splitValues(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function createBlankGlossaryDraft(): GlossaryTerm {
  const now = new Date().toISOString();
  return {
    id: "",
    primaryName: "",
    alternateNames: [],
    shortDefinition: "",
    linkedStoryReferenceId: "",
    relatedEntryIds: [],
    spoilerLevel: "Team Spoiler",
    createdAt: now,
    updatedAt: now
  };
}

function cleanReferenceId(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
}
