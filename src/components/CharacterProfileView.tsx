import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { EntryConnections, EntryMedia, EntryNotes, LoreEntry } from "../types";
import { isSupportedImage, readImageFileForStorage } from "../utils/media";
import { Icon } from "./Icon";
import { LoreKeywordText } from "./LoreKeywordText";
import { RichLoreText, RichTextEditor } from "./RichText";

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
  onUploadImage: (slot: ImageSlot, file: File | undefined) => void;
  onRemoveImage: (slot: ImageSlot, galleryIndex?: number) => void;
}

interface RelationshipItem {
  name: string;
  type: string;
  note: string;
  image?: string;
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

const spoilerOptions = ["No Spoiler", "Minor Spoiler", "Major Spoiler", "Ending Spoiler"];

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
  onUploadImage,
  onRemoveImage
}: CharacterProfileViewProps) {
  const [fullStoryOpen, setFullStoryOpen] = useState(false);
  const [activeStoryTab, setActiveStoryTab] = useState<StoryReaderTab>("full");
  const [showAllRelationships, setShowAllRelationships] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantChangeRequest, setAssistantChangeRequest] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantImport, setAssistantImport] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const character = useMemo(() => buildCharacterView(entry), [entry]);
  const galleryItems = useMemo(() => buildGalleryItems(entry), [entry]);
  const visibleGallery = galleryItems.slice(0, 4);
  const visibleRelationships = showAllRelationships
    ? character.relationships
    : character.relationships.slice(0, 3);
  const hideCharacterHoverText = fieldText(entry, ["Hide Character Hover Text"]) === "true";
  const characterButtonImage = entry.media.characterPortrait || entry.media.mainImage || entry.media.iconImage || "";
  const characterButtonHoverImage =
    entry.media.characterHoverImage ||
    entry.media.dialogueSpriteImage ||
    entry.media.ingameSpriteImage ||
    characterButtonImage;

  const toggleCharacterHoverText = () => {
    onSetField("Hide Character Hover Text", hideCharacterHoverText ? "" : "true");
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

  const updateMedia = (patch: Partial<EntryMedia>) => {
    onChange({ media: { ...entry.media, ...patch } });
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

  return (
    <article className="character-codex-shell">
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
        <button className="character-codex-icon-button" title="Favorite">
          <Icon name="Star" className="h-5 w-5" />
        </button>
        {isEditing ? (
          <>
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

      <aside className="character-codex-left">
        <div className="character-codex-brand">
          <p>Tales of the</p>
          <h2 className="font-display">Tavern</h2>
        </div>

        <div className="character-codex-portrait-card">
          {isEditing ? (
            <label className="character-codex-portrait-upload">
              {character.portrait ? (
                <img src={character.portrait} alt="" />
              ) : (
                <PortraitPlaceholder />
              )}
              <span>
                <Icon name="Upload" className="h-4 w-4" />
                Replace Portrait
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => onUploadImage("characterPortrait", event.target.files?.[0])}
              />
            </label>
          ) : (
            character.portrait ? <img src={character.portrait} alt="" /> : <PortraitPlaceholder />
          )}
          {isEditing && character.portrait && (
            <button className="character-codex-remove-media" onClick={() => onRemoveImage("characterPortrait")}>
              Remove
            </button>
          )}
        </div>

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
              <UploadButton label="Upload Button PNG" slot="characterPortrait" onUpload={onUploadImage} />
              {entry.media.characterPortrait && (
                <button className="character-codex-action-button character-codex-danger-button" onClick={() => onRemoveImage("characterPortrait")}>
                  <Icon name="Trash2" className="h-4 w-4" />
                  Remove Button PNG
                </button>
              )}
              <UploadButton label="Upload Hover PNG" slot="characterHoverImage" onUpload={onUploadImage} />
              {entry.media.characterHoverImage && (
                <button className="character-codex-action-button character-codex-danger-button" onClick={() => onRemoveImage("characterHoverImage")}>
                  <Icon name="Trash2" className="h-4 w-4" />
                  Remove Hover PNG
                </button>
              )}
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
              <CharacterButtonPreview label="Button" src={characterButtonImage} />
              <CharacterButtonPreview label="Hover" src={characterButtonHoverImage} />
            </div>
          </CodexPanel>
        )}
      </aside>

      <main className="character-codex-main">
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

        <section className="character-codex-overview-grid">
          <CodexCard title="At a Glance" icon="Eye" wide>
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

          <CodexCard title="Personality" icon="ShieldAlert">
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

          <CodexCard title="Core Function / Why They Matter" icon="Star">
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

          <CodexCard title="Key Relationships" icon="Users" wide>
            <div className="character-codex-relationship-grid">
              {visibleRelationships.map((relationship) => (
                <div key={`${relationship.name}-${relationship.type}`} className="character-codex-relationship-card">
                  {relationship.image ? (
                    <img src={relationship.image} alt="" />
                  ) : (
                    <span className="character-codex-mini-icon">
                      <Icon name="UserRound" className="h-4 w-4" />
                    </span>
                  )}
                  <div>
                    <strong><LoreKeywordText text={relationship.name} /></strong>
                    <small>{relationship.type}</small>
                    <div className="character-codex-relationship-note"><RichLoreText text={relationship.note} /></div>
                  </div>
                </div>
              ))}
              {!visibleRelationships.length && <p style={{ color: "var(--muted-ink)" }}>No relationships connected yet.</p>}
            </div>
            {isEditing && (
              <div className="mt-3 grid gap-2">
                <EditTextarea
                  value={joinValues(entry.connections.characters)}
                  placeholder="Tohm Kyatt, Miri, Bram"
                  onChange={(value) => onConnectionChange("characters", value)}
                />
                <p className="character-codex-help">Use the Story drawer for deeper relationship notes.</p>
              </div>
            )}
            {character.relationships.length > 3 && (
              <button className="character-codex-link-button" onClick={() => setShowAllRelationships((value) => !value)}>
                {showAllRelationships ? "Show Fewer Relationships" : "View All Relationships"}
                <Icon name="ChevronDown" className="h-4 w-4" />
              </button>
            )}
          </CodexCard>

          <CodexCard title="World Connections" icon="Map">
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

          <CodexCard title="Reveal Level" icon="Eye">
            {isEditing ? (
              <EditSelect value={entry.spoilerLevel} options={spoilerOptions} onChange={(value) => onChange({ spoilerLevel: value })} />
            ) : (
              <RevealMeter level={character.revealLevel} />
            )}
          </CodexCard>

          <CodexCard title="Gallery" icon="Image" wide>
            <div className="character-codex-gallery-strip">
              {visibleGallery.map((item) => (
                <figure key={`${item.label}-${item.src}`} className="character-codex-gallery-thumb">
                  <img src={item.src} alt="" />
                  {isEditing && (
                    <div>
                      <label>
                        Replace
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(event) => replaceGalleryImage(item, event.target.files?.[0])}
                        />
                      </label>
                      <button onClick={() => removeGalleryImage(item)}>Remove</button>
                    </div>
                  )}
                </figure>
              ))}
              {!visibleGallery.length && <div className="character-codex-gallery-empty">No gallery images yet.</div>}
            </div>
            {isEditing && (
              <UploadButton
                label="Add Gallery Image"
                slot="galleryImages"
                onUpload={onUploadImage}
              />
            )}
          </CodexCard>
        </section>
      </main>

      {fullStoryOpen && (
        <FullStoryReader
          entry={entry}
          character={character}
          activeTab={activeStoryTab}
          isEditing={isEditing}
          onSetActiveTab={setActiveStoryTab}
          onSetField={onSetField}
          onNotesChange={onNotesChange}
          onClose={() => setFullStoryOpen(false)}
        />
      )}

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
    </article>
  );
}

function FullStoryReader({
  entry,
  character,
  activeTab,
  isEditing,
  onSetActiveTab,
  onSetField,
  onNotesChange,
  onClose
}: {
  entry: LoreEntry;
  character: ReturnType<typeof buildCharacterView>;
  activeTab: StoryReaderTab;
  isEditing: boolean;
  onSetActiveTab: (tab: StoryReaderTab) => void;
  onSetField: (key: string, value: string) => void;
  onNotesChange: (patch: Partial<EntryNotes>) => void;
  onClose: () => void;
}) {
  const fullStory = fullStoryText(entry, character);
  const activeSection = storySections.find((section) => section.key === activeTab);
  const activeSectionValue = activeSection ? storyValue(entry, character, activeSection.key) : "";
  const activeSectionTitle = activeSection?.title || "Full Story";

  return (
    <div className="character-story-reader-backdrop">
      <section className="character-story-reader">
        <header>
          <div>
            <p>Longform Story Scroll</p>
            <h2 className="font-display">{entry.title}</h2>
          </div>
          <button className="character-codex-icon-button" onClick={onClose} title="Close full story">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="character-story-reader-layout">
          <aside className="character-story-reader-tabs">
            <button className={activeTab === "full" ? "active" : ""} onClick={() => onSetActiveTab("full")}>
              <Icon name="ScrollText" className="h-4 w-4" />
              Full Story
            </button>
            {storySections.map((section, index) => (
              <button
                key={section.key}
                className={activeTab === section.key ? "active" : ""}
                onClick={() => onSetActiveTab(section.key)}
              >
                <span>{index + 1}</span>
                <Icon name={section.icon} className="h-4 w-4" />
                {section.title}
              </button>
            ))}
          </aside>

          <div className="character-story-reader-body entry-scroll">
            <h3>{activeSectionTitle}</h3>
            {activeTab === "full" ? (
              isEditing ? (
                <RichTextEditor
                  value={fieldText(entry, ["Full Story", "Longform Story", "Complete Story"]) || fullStory}
                  placeholder="Write the complete in-depth character story here. This can be long-form prose, scene notes, emotional beats, mysteries, spoilers, and future plans."
                  onChange={(value) => onSetField("Full Story", value)}
                  tall
                />
              ) : (
                <div className="character-story-reader-prose">
                  <RichLoreText text={fullStory} />
                </div>
              )
            ) : activeSection ? (
              isEditing ? (
                <RichTextEditor
                  value={activeSectionValue}
                  placeholder={activeSection.placeholder}
                  onChange={(value) => {
                    if (activeSection.key === "futureUnresolvedThreads") {
                      onNotesChange({ unresolved: value });
                      return;
                    }
                    onSetField(activeSection.field, value);
                  }}
                  tall
                />
              ) : (
                <div className="character-story-reader-prose">
                  <RichLoreText text={activeSectionValue || "No story notes added yet."} />
                </div>
              )
            ) : null}
          </div>
        </div>
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

function buildCharacterView(entry: LoreEntry) {
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
    relationships: buildRelationships(entry, isGwen),
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
  children
}: {
  title: string;
  icon: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`character-codex-card ${wide ? "wide" : ""}`}>
      <h3>
        <Icon name={icon} className="h-4 w-4" />
        {title}
      </h3>
      <div className="character-codex-card-body">
        {typeof children === "string" ? <RichLoreText text={children} /> : children}
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

function CharacterButtonPreview({ label, src }: { label: string; src: string }) {
  return (
    <figure className="character-button-preview">
      <span>{label}</span>
      {src ? (
        <img src={src} alt="" />
      ) : (
        <div>
          <Icon name="UserRound" className="h-8 w-8" />
        </div>
      )}
    </figure>
  );
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
    <select className="character-codex-edit-field" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
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

function buildRelationships(entry: LoreEntry, isGwen: boolean): RelationshipItem[] {
  const defaults: RelationshipItem[] = isGwen
    ? [
        { name: "Tohm Kyatt", type: "Mentor & Ally", note: "Recruited Gwen and trusts her judgment." },
        { name: "Miri", type: "Best Friend", note: "Childhood friend and fellow cook." },
        { name: "Bram", type: "Friendly Rival", note: "Sparring rival who pushes her limits." }
      ]
    : [];

  const connected = entry.connections.characters.map((name) => ({
    name,
    type: fieldText(entry, [`Relationship Type: ${name}`]) || "Connected",
    note: fieldText(entry, [`Relationship Note: ${name}`]) || `Important connection for ${entry.title}.`
  }));

  return mergeNamedItems(defaults, connected);
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
  return firstMatchingTag(entry.tags, ["Human", "Whisken", "Wiscan", "Faery", "Dwarf"]) || entry.type;
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
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
