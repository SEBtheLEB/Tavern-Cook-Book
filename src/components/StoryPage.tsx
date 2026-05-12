import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  ActiveView,
  EntryConnections,
  LoreEntry,
  SecretInfo,
  TimelineInfo,
  WorldBuildingCategoryId,
  WorldBuildingData,
  WorldBuildingEntry
} from "../types";
import { allWorldBuildingEntries, categoryConfig } from "../utils/worldBuilding";
import { richTextToPlainText } from "../utils/richText";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";
import { RichLoreText } from "./RichText";
import { StoryReaderModal, type StoryReaderSection, type StoryReaderStep } from "./StoryReaderModal";

interface StoryPageProps {
  entries: LoreEntry[];
  worldBuilding?: WorldBuildingData;
  readOnly?: boolean;
  onNavigate: (view: ActiveView) => void;
  onOpenEntry: (entry: LoreEntry) => void;
  onOpenWorldEntry?: (category: WorldBuildingCategoryId, entryId: string) => void;
  isFavorite?: (entry: LoreEntry) => boolean;
  onToggleFavorite?: (entry: LoreEntry) => void;
}

type StoryScope = "world" | "game";
type StoryPresentation = "grid" | "timeline";
type StorySortMode = "chronology" | "title" | "spoiler" | "status" | "worldLinks";
type StoryCategoryFilter = "all" | "timeline" | "faith" | "people" | "places" | "items" | "quests" | "secrets" | "magic";

interface WorldReference {
  entry: WorldBuildingEntry;
  score: number;
  reason: string;
}

interface StoryModuleView {
  entry: LoreEntry;
  scope: StoryScope;
  category: StoryCategoryFilter;
  order: number;
  dateLabel: string;
  eraLabel: string;
  worldRefs: WorldReference[];
}

interface TimelinePoint {
  id: string;
  title: string;
  summary: string;
  eraLabel: string;
  dateLabel: string;
  order: number;
  scope: StoryScope;
  category: StoryCategoryFilter;
  sourceEntry?: LoreEntry;
  worldEntry?: WorldBuildingEntry;
  relatedEntries: LoreEntry[];
  relatedWorldEntries: WorldBuildingEntry[];
}

const storyScopeTabs: Array<{ id: StoryScope; title: string; subtitle: string; icon: string }> = [
  {
    id: "world",
    title: "Lore & History of the World",
    subtitle: "Ancient events, faith, peoples, places, artifacts, factions, and backstory.",
    icon: "Landmark"
  },
  {
    id: "game",
    title: "In-Game Lore",
    subtitle: "Player-facing story from the opening hook through quests, reveals, and endings.",
    icon: "Gamepad2"
  }
];

const categoryOptions: Array<{ id: StoryCategoryFilter; label: string }> = [
  { id: "all", label: "All lore" },
  { id: "timeline", label: "Timeline events" },
  { id: "faith", label: "Faith & myths" },
  { id: "people", label: "Peoples & factions" },
  { id: "places", label: "Places" },
  { id: "items", label: "Items & artifacts" },
  { id: "quests", label: "Quests & beats" },
  { id: "secrets", label: "Secrets" },
  { id: "magic", label: "Magic & cooking" }
];

const sortOptions: Array<{ id: StorySortMode; label: string }> = [
  { id: "chronology", label: "Timeline order" },
  { id: "title", label: "Title A-Z" },
  { id: "spoiler", label: "Spoiler level" },
  { id: "status", label: "Canon status" },
  { id: "worldLinks", label: "Most world links" }
];

const timelineFocusOptions = [
  { id: "all", label: "Full timeline" },
  { id: "tablemaker", label: "Tablemaker / 300-Year War" },
  { id: "whisken", label: "Whisken & Tabby Island" },
  { id: "tohm", label: "Tohm's life" },
  { id: "lillia", label: "Lillia / Dragon Knife" },
  { id: "game", label: "Game start and Act 1" }
];

const chronologyHints = [
  "The 300 Year War",
  "The Tablemaker's Arrival",
  "The Meal That Ended the War",
  "Food Essence Enters the World",
  "Ancient Whisken Create the Cat Cauldron",
  "First Whisken Exodus",
  "Cat Cauldron Is Buried and Forgotten",
  "Tablemaker Stories Inspire Tohm",
  "Tohm Grows Up on Tabby Island",
  "Tohm Seeks a Flavor Unlike Anything Anyone Had Ever Tasted",
  "Tohm Becomes Obsessed with Magical Food",
  "Tohm Discovers the Living Tavern",
  "Tohm Awakens the Cat Cauldron",
  "Mas'eel Sense the Cat Cauldron",
  "Tohm Flees With the Cat Cauldron",
  "Mas'eel Infiltrate Tabby Island",
  "Second Whisken Exodus",
  "Survivors Reach Whisker Woods",
  "Tohm Rebuilds in Whisker Woods",
  "Lillia Wants to Become a Faery",
  "Faeries Refuse to Help",
  "King Takes the Dragon Knife",
  "Tohm Gains Access to Dragon Knife",
  "Cat Cauldron Cannot Teach Magical Meals",
  "Tohm Creates a Dark Magical Meal",
  "Lillia Consumes the Dark Magical Meal",
  "Lillia Tears Out Recipe Pages",
  "Tohm Flees",
  "Tohm Writes the Fire Meal",
  "Lillia Begins Using Dark Culinary Arts",
  "Gwen Is Recruited",
  "Feast of Full Plates Night",
  "Gwen Cooks the First True Magical Meal",
  "Gwen Wakes in the Snowstorm",
  "Kap's Pond Is Corrupted"
];

const eraRank: Record<string, number> = {
  "300 year war": 5,
  "ancient history": 10,
  "ancient whisken era": 20,
  "tohm's childhood era": 40,
  "tabby island era": 50,
  "tohm's obsession era": 60,
  "tabby island disaster": 70,
  "mas'eel infiltration era": 90,
  "whisker woods era": 120,
  "royal contest / dragon knife era": 150,
  "lillia incident": 170,
  "after lillia incident": 185,
  "game begins": 200,
  "act 1": 220
};

export function StoryPage({
  entries,
  worldBuilding,
  readOnly = false,
  onNavigate,
  onOpenEntry,
  onOpenWorldEntry,
  isFavorite,
  onToggleFavorite
}: StoryPageProps) {
  const storyModules = useMemo(() => entries.filter(isStoryModule), [entries]);
  const worldEntries = useMemo(() => (worldBuilding ? allWorldBuildingEntries(worldBuilding) : []), [worldBuilding]);
  const [selectedId, setSelectedId] = useState(storyModules[0]?.id || "");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<StoryScope>("world");
  const [categoryFilter, setCategoryFilter] = useState<StoryCategoryFilter>("all");
  const [sortMode, setSortMode] = useState<StorySortMode>("chronology");
  const [presentation, setPresentation] = useState<StoryPresentation>("grid");
  const [timelineFocus, setTimelineFocus] = useState("all");
  const [activeTimelineId, setActiveTimelineId] = useState("");
  const [fullStoryOpen, setFullStoryOpen] = useState(false);
  const [activeStoryTab, setActiveStoryTab] = useState("full");

  const moduleViews = useMemo(
    () => storyModules.map((entry) => buildStoryModuleView(entry, worldEntries)),
    [storyModules, worldEntries]
  );

  const filteredModules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortStoryModuleViews(
      moduleViews.filter((item) => {
        if (item.scope !== scope) return false;
        if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
        return !normalizedQuery || storyModuleSearchText(item).includes(normalizedQuery);
      }),
      sortMode
    );
  }, [categoryFilter, moduleViews, query, scope, sortMode]);

  const timelinePoints = useMemo(
    () => buildTimelinePoints(storyModules, entries, worldEntries),
    [entries, storyModules, worldEntries]
  );

  const filteredTimelinePoints = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return timelinePoints
      .filter((point) => point.scope === scope)
      .filter((point) => categoryFilter === "all" || point.category === categoryFilter || categoryFilter === "timeline")
      .filter((point) => timelineFocusMatches(point, timelineFocus))
      .filter((point) => !normalizedQuery || timelineSearchText(point).includes(normalizedQuery))
      .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
  }, [categoryFilter, query, scope, timelineFocus, timelinePoints]);

  const selectedModule =
    filteredModules.find((item) => item.entry.id === selectedId) ||
    filteredModules[0] ||
    moduleViews.find((item) => item.entry.id === selectedId) ||
    moduleViews[0] ||
    null;
  const selectedEntry = selectedModule?.entry || null;
  const readerSections = selectedEntry ? buildStoryReaderSections(selectedEntry) : [];
  const readerSteps = selectedEntry ? buildStoryReaderSteps(selectedEntry) : [];
  const fullStory = selectedEntry ? storyFullText(selectedEntry, readerSections) : "";
  const activeTimelinePoint =
    filteredTimelinePoints.find((point) => point.id === activeTimelineId) ||
    filteredTimelinePoints[0] ||
    null;

  useEffect(() => {
    if (!storyModules.length) {
      setSelectedId("");
      return;
    }
    if (!storyModules.some((entry) => entry.id === selectedId)) {
      setSelectedId(storyModules[0].id);
    }
  }, [selectedId, storyModules]);

  useEffect(() => {
    if (!filteredTimelinePoints.length) {
      setActiveTimelineId("");
      return;
    }
    if (!filteredTimelinePoints.some((point) => point.id === activeTimelineId)) {
      setActiveTimelineId(filteredTimelinePoints[0].id);
    }
  }, [activeTimelineId, filteredTimelinePoints]);

  if (fullStoryOpen && selectedEntry) {
    return (
      <div className="story-codex-page">
        <StoryReaderModal
          title={selectedEntry.title}
          eyebrow="Story Module Full Reader"
          activeTab={activeStoryTab}
          sections={readerSections}
          fullStory={fullStory}
          steps={readerSteps}
          onSetActiveTab={setActiveStoryTab}
          onClose={() => setFullStoryOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="story-codex-page">
      <section className="story-codex-header">
        <div>
          <p>Story Codex</p>
          <h1 className="font-display">Story Library</h1>
          <span>{storyModules.length} lore modules linked to {worldEntries.length} world-building records</span>
        </div>
        <div className="story-codex-header-actions">
          <button className="character-codex-action-button" onClick={() => onNavigate("storyJourney")}>
            <Icon name="BookOpen" className="h-4 w-4" />
            Story Journey
          </button>
          <button className="character-codex-action-button" onClick={() => onNavigate("world")}>
            <Icon name="Map" className="h-4 w-4" />
            World Building
          </button>
          <button className="character-codex-action-button" onClick={() => onNavigate("secrets")}>
            <Icon name="EyeOff" className="h-4 w-4" />
            Secrets
          </button>
        </div>
      </section>

      <section className="story-scope-tabs" aria-label="Story lore scope">
        {storyScopeTabs.map((tab) => (
          <button
            key={tab.id}
            className={scope === tab.id ? "active" : ""}
            onClick={() => {
              setScope(tab.id);
            }}
          >
            <Icon name={tab.icon} className="h-5 w-5" />
            <span>
              <strong>{tab.title}</strong>
              <small>{tab.subtitle}</small>
            </span>
          </button>
        ))}
      </section>

      <section className="story-codex-controls story-library-controls">
        <label>
          <span>Search</span>
          <input value={query} placeholder="Search lore, tags, events, or world links" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          <span>View</span>
          <select value={presentation} onChange={(event) => setPresentation(event.target.value as StoryPresentation)}>
            <option value="grid">Lore boxes</option>
            <option value="timeline">Timeline view</option>
          </select>
        </label>
        <label>
          <span>Filter</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as StoryCategoryFilter)}>
            {categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        {presentation === "grid" ? (
          <label>
            <span>Order</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as StorySortMode)}>
              {sortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        ) : (
          <label>
            <span>Timeline Focus</span>
            <select value={timelineFocus} onChange={(event) => setTimelineFocus(event.target.value)}>
              {timelineFocusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        )}
      </section>

      {presentation === "grid" ? (
        <>
          <section className="story-lore-grid" aria-label="Story lore cards">
            {filteredModules.length ? filteredModules.map((item) => (
              <StoryLoreCard
                key={item.entry.id}
                item={item}
                active={selectedEntry?.id === item.entry.id}
                favorite={Boolean(isFavorite?.(item.entry))}
                onToggleFavorite={onToggleFavorite}
                onSelect={() => setSelectedId(item.entry.id)}
              />
            )) : (
              <div className="story-empty-state">
                <Icon name="Search" className="h-6 w-6" />
                <strong>No matching lore modules</strong>
              </div>
            )}
          </section>

          <section className="story-module-detail story-library-detail">
            {selectedModule ? (
              <>
                <header>
                  <div>
                    <p>{selectedModule.eraLabel}</p>
                    <h2 className="font-display">{selectedEntry?.title}</h2>
                    <div className="story-detail-pills">
                      <span>{selectedEntry?.type}</span>
                      <span>{selectedEntry?.status}</span>
                      <span>{selectedEntry?.spoilerLevel}</span>
                      <span>{selectedModule.worldRefs.length} world links</span>
                    </div>
                  </div>
                  <div className="story-detail-actions">
                    <button
                      className={`character-codex-story-toggle ${fullStoryOpen ? "active" : ""}`}
                      onClick={() => {
                        setActiveStoryTab("full");
                        setFullStoryOpen(true);
                      }}
                    >
                      <Icon name="ScrollText" className="h-4 w-4" />
                      Open Full Story
                    </button>
                    {selectedEntry && (
                      <button className="character-codex-action-button" onClick={() => onOpenEntry(selectedEntry)}>
                        <Icon name={readOnly ? "Eye" : "Edit3"} className="h-4 w-4" />
                        {readOnly ? "Open Entry" : "Edit Entry"}
                      </button>
                    )}
                  </div>
                </header>

                {selectedEntry && (
                  <>
                    <div className="story-primary-text-grid">
                      <StoryTextBlock title="Summary" text={selectedEntry.summary || selectedEntry.publicDescription || "No summary added yet."} />
                      <StoryTextBlock title="Internal Lore" text={selectedEntry.internalLore || "No internal lore added yet."} />
                    </div>

                    <div className="story-detail-accordions">
                      <StoryDetails title="Related World Building" icon="Map" defaultOpen>
                        <WorldReferenceList
                          refs={selectedModule.worldRefs}
                          onOpenWorldEntry={onOpenWorldEntry}
                        />
                      </StoryDetails>
                      <StoryDetails title="Tags" icon="Sparkles">
                        <div className="story-chip-row">
                          {selectedEntry.tags.length ? selectedEntry.tags.map((tag) => <span key={tag}>{tag}</span>) : <em>No tags added yet.</em>}
                        </div>
                      </StoryDetails>
                      <StoryDetails title="Connections" icon="Compass">
                        <ConnectionList connections={selectedEntry.connections} />
                      </StoryDetails>
                      <StoryDetails title="Timeline / History" icon="GitBranch">
                        <TimelineBlock timeline={selectedEntry.timeline} events={selectedEntry.connections.timelineEvents} dateLabel={selectedModule.dateLabel} />
                      </StoryDetails>
                      <StoryDetails title="Secrets / Reveals" icon="EyeOff">
                        <SecretBlock secret={selectedEntry.secret} spoilerLevel={selectedEntry.spoilerLevel} />
                      </StoryDetails>
                      <StoryDetails title="Fields" icon="ListChecks">
                        <FieldList fields={selectedEntry.fields} />
                      </StoryDetails>
                      <StoryDetails title="Production Notes" icon="Clipboard">
                        <NotesBlock entry={selectedEntry} />
                      </StoryDetails>
                    </div>

                  </>
                )}
              </>
            ) : (
              <div className="story-empty-state">
                <Icon name="BookOpen" className="h-7 w-7" />
                <strong>No story modules yet</strong>
              </div>
            )}
          </section>
        </>
      ) : (
        <StoryTimeline
          points={filteredTimelinePoints}
          activePoint={activeTimelinePoint}
          onSelectPoint={setActiveTimelineId}
          onSelectStoryEntry={(entry) => {
            setPresentation("grid");
            setSelectedId(entry.id);
            window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
          }}
          onOpenStoryEntry={onOpenEntry}
          onOpenWorldEntry={onOpenWorldEntry}
        />
      )}
    </div>
  );
}

function StoryLoreCard({
  item,
  active,
  favorite,
  onToggleFavorite,
  onSelect
}: {
  item: StoryModuleView;
  active: boolean;
  favorite: boolean;
  onToggleFavorite?: (entry: LoreEntry) => void;
  onSelect: () => void;
}) {
  const entry = item.entry;
  const summary = richTextToPlainText(entry.summary || entry.internalLore || "No summary yet.");
  return (
    <article className={`story-lore-card ${active ? "active" : ""}`}>
      <button className="story-lore-card-main" onClick={onSelect}>
        <div className="story-lore-card-kicker">
          <span>{item.dateLabel}</span>
          <span>{categoryOptions.find((option) => option.id === item.category)?.label || entry.type}</span>
        </div>
        <div className="story-lore-card-title-row">
          <div className="story-module-icon">
            <Icon name={iconForStoryEntry(entry)} className="h-5 w-5" />
          </div>
          <div>
            <h3>{entry.title}</h3>
            <small>{entry.type} / {entry.status}</small>
          </div>
        </div>
        <p>{summary}</p>
        <div className="story-lore-card-footer">
          <span>{entry.spoilerLevel}</span>
          <span>{item.worldRefs.length} world links</span>
        </div>
      </button>
      {onToggleFavorite && (
        <FavoriteButton
          active={favorite}
          label={entry.title}
          onToggle={() => onToggleFavorite(entry)}
          className="story-module-favorite"
        />
      )}
    </article>
  );
}

function StoryTimeline({
  points,
  activePoint,
  onSelectPoint,
  onSelectStoryEntry,
  onOpenStoryEntry,
  onOpenWorldEntry
}: {
  points: TimelinePoint[];
  activePoint: TimelinePoint | null;
  onSelectPoint: (id: string) => void;
  onSelectStoryEntry: (entry: LoreEntry) => void;
  onOpenStoryEntry: (entry: LoreEntry) => void;
  onOpenWorldEntry?: (category: WorldBuildingCategoryId, entryId: string) => void;
}) {
  if (!points.length) {
    return (
      <div className="story-empty-state">
        <Icon name="GitBranch" className="h-7 w-7" />
        <strong>No timeline events found</strong>
      </div>
    );
  }

  return (
    <section className="story-timeline-panel">
      <div className="story-timeline-track" aria-label="Story timeline">
        {points.map((point, index) => (
          <button
            key={point.id}
            className={`story-timeline-bubble ${activePoint?.id === point.id ? "active" : ""}`}
            onClick={() => onSelectPoint(point.id)}
          >
            <span>{point.dateLabel}</span>
            <strong>{point.title}</strong>
            <small>{point.eraLabel}</small>
          </button>
        ))}
      </div>

      {activePoint && (
        <article className="story-timeline-summary">
          <p>{activePoint.eraLabel}</p>
          <h2 className="font-display">{activePoint.title}</h2>
          <div className="story-detail-pills">
            <span>{activePoint.dateLabel}</span>
            <span>{categoryOptions.find((option) => option.id === activePoint.category)?.label || "Lore"}</span>
            <span>{activePoint.relatedWorldEntries.length} world refs</span>
          </div>
          <RichLoreText text={activePoint.summary || "No summary added yet."} />
          <div className="story-timeline-summary-actions">
            {activePoint.sourceEntry && (
              <>
                <button className="character-codex-action-button" onClick={() => onSelectStoryEntry(activePoint.sourceEntry as LoreEntry)}>
                  <Icon name="BookOpen" className="h-4 w-4" />
                  Show Lore Card
                </button>
                <button className="character-codex-action-button" onClick={() => onOpenStoryEntry(activePoint.sourceEntry as LoreEntry)}>
                  <Icon name="ScrollText" className="h-4 w-4" />
                  Open Story Entry
                </button>
              </>
            )}
            {activePoint.worldEntry && onOpenWorldEntry && (
              <button className="character-codex-action-button" onClick={() => onOpenWorldEntry(activePoint.worldEntry!.category, activePoint.worldEntry!.id)}>
                <Icon name="Map" className="h-4 w-4" />
                Open World Entry
              </button>
            )}
          </div>
          <div className="story-timeline-related-grid">
            {activePoint.relatedEntries.slice(0, 6).map((entry) => (
              <button key={entry.id} onClick={() => onSelectStoryEntry(entry)}>
                <strong>{entry.title}</strong>
                <small>{entry.category} / {entry.type}</small>
              </button>
            ))}
            {activePoint.relatedWorldEntries.slice(0, 6).map((entry) => (
              <button key={`world-${entry.id}`} onClick={() => onOpenWorldEntry?.(entry.category, entry.id)}>
                <strong>{entry.title}</strong>
                <small>{categoryConfig(entry.category).shortTitle} / {entry.type}</small>
              </button>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

function StoryTextBlock({ title, text }: { title: string; text: string }) {
  return (
    <article className="story-text-block">
      <h3>{title}</h3>
      <RichLoreText text={text} />
    </article>
  );
}

function StoryDetails({
  title,
  icon,
  defaultOpen = false,
  children
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="story-details" open={defaultOpen || undefined}>
      <summary>
        <Icon name={icon} className="h-4 w-4" />
        {title}
        <Icon name="ChevronDown" className="h-4 w-4" />
      </summary>
      <div>{children}</div>
    </details>
  );
}

function WorldReferenceList({
  refs,
  onOpenWorldEntry
}: {
  refs: WorldReference[];
  onOpenWorldEntry?: (category: WorldBuildingCategoryId, entryId: string) => void;
}) {
  if (!refs.length) return <em>No direct World Building references found yet.</em>;
  return (
    <div className="story-world-reference-grid">
      {refs.slice(0, 8).map(({ entry, reason }) => (
        <button
          key={`${entry.category}-${entry.id}`}
          disabled={!onOpenWorldEntry}
          onClick={() => onOpenWorldEntry?.(entry.category, entry.id)}
        >
          <span>{categoryConfig(entry.category).shortTitle}</span>
          <strong>{entry.title}</strong>
          <small>{reason}</small>
        </button>
      ))}
    </div>
  );
}

function ConnectionList({ connections }: { connections: EntryConnections }) {
  const groups = Object.entries(connections)
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
    .map(([key, values]) => ({ key, values }));

  if (!groups.length) return <em>No connections added yet.</em>;
  return (
    <div className="story-connection-grid">
      {groups.map((group) => (
        <div key={group.key}>
          <strong>{connectionLabel(group.key)}</strong>
          <p>{group.values.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}

function TimelineBlock({ timeline, events, dateLabel }: { timeline?: TimelineInfo; events: string[]; dateLabel: string }) {
  const lines = [
    dateLabel ? `Timeline marker: ${dateLabel}` : "",
    timeline?.era ? `Era: ${timeline.era}` : "",
    timeline?.trueTimeline ? `True timeline: ${timeline.trueTimeline}` : "",
    timeline?.playerTimeline ? `Player timeline: ${timeline.playerTimeline}` : "",
    timeline?.questTimeline ? `Quest timeline: ${timeline.questTimeline}` : "",
    timeline?.emotionalTimeline ? `Emotional timeline: ${timeline.emotionalTimeline}` : "",
    events.length ? `Linked events: ${events.join(", ")}` : ""
  ].filter(Boolean);

  if (!lines.length) return <em>No timeline notes added yet.</em>;
  return (
    <ul className="story-line-list">
      {lines.map((line) => <li key={line}>{line}</li>)}
    </ul>
  );
}

function SecretBlock({ secret, spoilerLevel }: { secret?: SecretInfo; spoilerLevel: string }) {
  const lines = [
    secret?.trueFact ? `True fact: ${secret.trueFact}` : "",
    secret?.playerKnowledge ? `Player knowledge: ${secret.playerKnowledge}` : "",
    secret?.knownBy?.length ? `Known by: ${secret.knownBy.join(", ")}` : "",
    secret?.suspectedBy?.length ? `Suspected by: ${secret.suspectedBy.join(", ")}` : "",
    secret?.unknownTo?.length ? `Unknown to: ${secret.unknownTo.join(", ")}` : "",
    secret?.relatedQuests?.length ? `Related quests: ${secret.relatedQuests.join(", ")}` : "",
    secret?.relatedDialogue?.length ? `Related dialogue: ${secret.relatedDialogue.join(", ")}` : ""
  ].filter(Boolean);

  if (!lines.length) return <p>Spoiler level: {spoilerLevel}</p>;
  return (
    <ul className="story-line-list">
      {lines.map((line) => <li key={line}>{line}</li>)}
    </ul>
  );
}

function FieldList({ fields }: { fields: Record<string, unknown> }) {
  const pairs = Object.entries(fields || {}).filter(([, value]) => hasDisplayValue(value));
  if (!pairs.length) return <em>No custom fields added yet.</em>;
  return (
    <div className="story-field-list">
      {pairs.map(([key, value]) => (
        <div key={key}>
          <strong>{key}</strong>
          <p>{formatFieldValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function NotesBlock({ entry }: { entry: LoreEntry }) {
  const notes = [
    entry.notes.art ? `Art: ${entry.notes.art}` : "",
    entry.notes.gameplay ? `Gameplay: ${entry.notes.gameplay}` : "",
    entry.notes.production ? `Production: ${entry.notes.production}` : "",
    entry.notes.marketing ? `Marketing: ${entry.notes.marketing}` : "",
    entry.notes.unresolved ? `Unresolved: ${entry.notes.unresolved}` : ""
  ].filter(Boolean);

  if (!notes.length) return <em>No production notes added yet.</em>;
  return (
    <ul className="story-line-list">
      {notes.map((note) => <li key={note}>{note}</li>)}
    </ul>
  );
}

function buildStoryReaderSections(entry: LoreEntry): StoryReaderSection[] {
  return [
    {
      key: "overview",
      title: "Overview",
      icon: "BookOpen",
      value: storySectionText([
        entry.summary,
        entry.publicDescription
      ]) || "No overview added yet."
    },
    {
      key: "internalLore",
      title: "Internal Lore",
      icon: "ShieldAlert",
      value: entry.internalLore || "No internal lore added yet."
    },
    {
      key: "history",
      title: "History",
      icon: "GitBranch",
      value: storySectionText([
        formatTimeline(entry.timeline, entry.connections.timelineEvents),
        fieldText(entry, ["History", "Timeline", "Backstory", "Origin"])
      ]) || "No history notes added yet."
    },
    {
      key: "reveals",
      title: "Reveals",
      icon: "EyeOff",
      value: storySectionText([
        formatSecret(entry.secret),
        `Spoiler level: ${entry.spoilerLevel}`
      ])
    },
    {
      key: "connections",
      title: "Connections",
      icon: "Compass",
      value: formatConnections(entry.connections) || "No connections added yet."
    },
    {
      key: "future",
      title: "Future Threads",
      icon: "Sparkles",
      value: storySectionText([
        entry.notes.unresolved,
        fieldText(entry, ["Future", "Future Threads", "Unresolved", "Next Steps"])
      ]) || "No future threads added yet."
    }
  ];
}

function buildStoryReaderSteps(entry: LoreEntry): StoryReaderStep[] {
  const sections = buildStoryReaderSections(entry);
  const candidates: StoryReaderStep[] = [
    {
      title: "Opening Context",
      kicker: entry.type,
      text: sections.find((section) => section.key === "overview")?.value || ""
    },
    {
      title: "Hidden Truth",
      kicker: entry.spoilerLevel,
      text: sections.find((section) => section.key === "internalLore")?.value || ""
    },
    {
      title: "History Path",
      kicker: "Timeline",
      text: sections.find((section) => section.key === "history")?.value || ""
    },
    {
      title: "People and Forces",
      kicker: "Connections",
      text: sections.find((section) => section.key === "connections")?.value || ""
    },
    {
      title: "Reveals",
      kicker: "Player Knowledge",
      text: sections.find((section) => section.key === "reveals")?.value || ""
    },
    {
      title: "Open Threads",
      kicker: entry.status,
      text: sections.find((section) => section.key === "future")?.value || ""
    }
  ];

  return candidates.filter((step) => Boolean(richTextToPlainText(step.text).trim()));
}

function storyFullText(entry: LoreEntry, sections: StoryReaderSection[]) {
  const saved = fieldText(entry, ["Full Story", "Longform Story", "Complete Story"]);
  if (saved) return saved;
  return sections
    .map((section) => {
      const text = richTextToPlainText(section.value).trim();
      return text ? `${section.title}\n${section.value}` : "";
    })
    .filter(Boolean)
    .join("\n\n") || "No full story has been written yet.";
}

function buildStoryModuleView(entry: LoreEntry, worldEntries: WorldBuildingEntry[]): StoryModuleView {
  const order = storyChronologyOrder(entry);
  return {
    entry,
    scope: storyScopeForEntry(entry),
    category: storyCategoryForEntry(entry),
    order,
    dateLabel: storyDateLabel(entry, order),
    eraLabel: storyEraLabel(entry),
    worldRefs: buildWorldReferences(entry, worldEntries)
  };
}

function buildTimelinePoints(
  storyModules: LoreEntry[],
  allEntries: LoreEntry[],
  worldEntries: WorldBuildingEntry[]
): TimelinePoint[] {
  const points = new Map<string, TimelinePoint>();
  const addPoint = (point: TimelinePoint) => {
    const key = normalizeLookup(point.title);
    const existing = points.get(key);
    if (!existing) {
      points.set(key, point);
      return;
    }
    points.set(key, {
      ...existing,
      summary: richerSummary(existing.summary, point.summary),
      sourceEntry: existing.sourceEntry || point.sourceEntry,
      worldEntry: existing.worldEntry || point.worldEntry,
      relatedEntries: uniqueEntries([...existing.relatedEntries, ...point.relatedEntries]),
      relatedWorldEntries: uniqueWorldEntries([...existing.relatedWorldEntries, ...point.relatedWorldEntries]),
      order: Math.min(existing.order, point.order)
    });
  };

  storyModules.filter(isTimelineCandidate).forEach((entry) => {
    const order = storyChronologyOrder(entry);
    addPoint({
      id: `story-${entry.id}`,
      title: entry.title,
      summary: entry.summary || entry.internalLore || formatTimeline(entry.timeline, entry.connections.timelineEvents),
      eraLabel: storyEraLabel(entry),
      dateLabel: storyDateLabel(entry, order),
      order,
      scope: storyScopeForEntry(entry),
      category: storyCategoryForText(entrySearchSource(entry)),
      sourceEntry: entry,
      relatedEntries: relatedEntriesForEvent(entry.title, allEntries),
      relatedWorldEntries: relatedWorldEntriesForEvent(entry.title, worldEntries)
    });
  });

  worldEntries.filter((entry) => entry.category === "timeline").forEach((entry) => {
    const order = worldChronologyOrder(entry);
    addPoint({
      id: `world-${entry.id}`,
      title: entry.title,
      summary: worldEntrySummary(entry),
      eraLabel: entry.type || categoryConfig(entry.category).shortTitle,
      dateLabel: worldDateLabel(entry, order),
      order,
      scope: worldStoryScope(entry),
      category: storyCategoryForText(worldEntrySearchSource(entry)),
      worldEntry: entry,
      relatedEntries: relatedEntriesForEvent(entry.title, allEntries),
      relatedWorldEntries: uniqueWorldEntries([entry, ...relatedWorldEntriesForEvent(entry.title, worldEntries)])
    });
  });

  timelineEventNames(allEntries).forEach((title) => {
    if (points.has(normalizeLookup(title))) return;
    const relatedEntries = relatedEntriesForEvent(title, allEntries);
    const relatedWorldEntries = relatedWorldEntriesForEvent(title, worldEntries);
    const order = chronologyOrderForTitle(title, relatedEntries);
    addPoint({
      id: `event-${normalizeLookup(title)}`,
      title,
      summary: buildReferenceTimelineSummary(title, relatedEntries, relatedWorldEntries),
      eraLabel: eraLabelForTitle(title, relatedEntries),
      dateLabel: dateLabelForTitle(title, order),
      order,
      scope: eventScopeForTitle(title, relatedEntries, relatedWorldEntries),
      category: storyCategoryForText(`${title} ${relatedEntries.map(entrySearchSource).join(" ")} ${relatedWorldEntries.map(worldEntrySearchSource).join(" ")}`),
      relatedEntries,
      relatedWorldEntries
    });
  });

  return Array.from(points.values()).sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
}

function buildWorldReferences(entry: LoreEntry, worldEntries: WorldBuildingEntry[]): WorldReference[] {
  const names = new Set([
    entry.title,
    ...Object.values(entry.connections || {}).flat(),
    ...entry.tags
  ].map(normalizeLookup).filter(Boolean));
  const searchable = entrySearchSource(entry);
  const normalizedSearch = normalizeLookup(searchable);

  return worldEntries
    .map((worldEntry) => {
      const worldTitle = normalizeLookup(worldEntry.title);
      const sharedTags = worldEntry.tags.filter((tag) => names.has(normalizeLookup(tag)));
      let score = 0;
      let reason = "";
      if (names.has(worldTitle)) {
        score += 90;
        reason = "Named in this module";
      }
      if (normalizedSearch.includes(worldTitle)) {
        score += 40;
        reason ||= "Mentioned in the lore text";
      }
      if (sharedTags.length) {
        score += sharedTags.length * 8;
        reason ||= `Shared tags: ${sharedTags.slice(0, 2).join(", ")}`;
      }
      if (score === 0 && worldEntry.tags.some((tag) => normalizedSearch.includes(normalizeLookup(tag)))) {
        score += 10;
        reason = "Related tag match";
      }
      return { entry: worldEntry, score, reason: reason || "Related lore" };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.title.localeCompare(right.entry.title))
    .slice(0, 10);
}

function sortStoryModuleViews(items: StoryModuleView[], sortMode: StorySortMode) {
  return [...items].sort((left, right) => {
    if (sortMode === "title") return left.entry.title.localeCompare(right.entry.title);
    if (sortMode === "spoiler") return spoilerRank(left.entry.spoilerLevel) - spoilerRank(right.entry.spoilerLevel) || left.order - right.order;
    if (sortMode === "status") return statusRank(left.entry.status) - statusRank(right.entry.status) || left.order - right.order;
    if (sortMode === "worldLinks") return right.worldRefs.length - left.worldRefs.length || left.order - right.order;
    return left.order - right.order || left.entry.title.localeCompare(right.entry.title);
  });
}

function isStoryModule(entry: LoreEntry) {
  return entry.category === "Story";
}

function isTimelineCandidate(entry: LoreEntry) {
  const text = entrySearchSource(entry);
  return Boolean(entry.timeline) || /timeline event|history event|exodus|war|incident|game begins|act 1/i.test(text);
}

function storyScopeForEntry(entry: LoreEntry): StoryScope {
  const text = entrySearchSource(entry);
  const order = storyChronologyOrder(entry);
  if (/game begins|act 1|act 2|act 3|quest|player|gwen is recruited|kap's pond|boss|opening|ending/i.test(text)) return "game";
  return order >= 200 ? "game" : "world";
}

function worldStoryScope(entry: WorldBuildingEntry): StoryScope {
  const text = worldEntrySearchSource(entry);
  if (/game begins|act 1|quest|player|gwen|kap's pond|boss|opening|ending/i.test(text)) return "game";
  return worldChronologyOrder(entry) >= 200 ? "game" : "world";
}

function eventScopeForTitle(title: string, entries: LoreEntry[], worldEntries: WorldBuildingEntry[]): StoryScope {
  const text = `${title} ${entries.map(entrySearchSource).join(" ")} ${worldEntries.map(worldEntrySearchSource).join(" ")}`;
  if (/game begins|act 1|quest|player|gwen is recruited|kap's pond|boss|opening|ending/i.test(text)) return "game";
  return chronologyOrderForTitle(title, entries) >= 200 ? "game" : "world";
}

function storyCategoryForText(text: string): StoryCategoryFilter {
  if (/timeline|event|history|exodus|war|incident|era/i.test(text)) return "timeline";
  if (/secret|hidden|reveal|unknown|truth/i.test(text)) return "secrets";
  if (/faith|myth|legend|tablemaker|master chef|triadic|saint|everfeast/i.test(text)) return "faith";
  if (/people|faction|cult|kingdom|whisken|mas'eel|faery|dwarven|human kingdom/i.test(text)) return "people";
  if (/location|island|woods|village|realm|camp|pond|mountain|region|place/i.test(text)) return "places";
  if (/cauldron|knife|recipe|page|book|artifact|item|relic/i.test(text)) return "items";
  if (/quest|act|rescue|opening|objective|beat|player/i.test(text)) return "quests";
  if (/magic|culinary|meal|food|cooking|corruption|essence/i.test(text)) return "magic";
  return "all";
}

function storyCategoryForEntry(entry: LoreEntry): StoryCategoryFilter {
  const primary = `${entry.title} ${entry.type} ${entry.tags.join(" ")}`;
  if (/secret|hidden|reveal|unknown|truth/i.test(primary) || entry.secret) return "secrets";
  if (/timeline event|history event|exodus|war|incident|era/i.test(primary) || entry.timeline) return "timeline";
  if (/faith|myth|legend|tablemaker|master chef|triadic|saint|everfeast/i.test(primary)) return "faith";
  if (/people|faction|culture|cult|kingdom|whisken|mas'eel|faery|dwarven|human kingdom/i.test(primary)) return "people";
  if (/location|island|woods|village|realm|camp|pond|mountain|region|place/i.test(primary)) return "places";
  if (/cauldron|knife|recipe|page|book|artifact|item|relic/i.test(primary)) return "items";
  if (/quest|act|rescue|opening|objective|beat|player/i.test(primary)) return "quests";
  if (/magic|culinary|meal|food|cooking|corruption|essence/i.test(primary)) return "magic";
  return storyCategoryForText(entrySearchSource(entry));
}

function storyChronologyOrder(entry: LoreEntry) {
  return chronologyOrderForTitle(entry.title, [entry]);
}

function worldChronologyOrder(entry: WorldBuildingEntry) {
  const titleOrder = titleHintOrder(entry.title);
  if (titleOrder < 900) return titleOrder;
  const text = worldEntrySearchSource(entry);
  const titleMatch = chronologyHints.findIndex((hint) => normalizeLookup(text).includes(normalizeLookup(hint)));
  if (titleMatch >= 0) return (titleMatch + 1) * 10;
  return eraOrder(entry.type) || 500;
}

function chronologyOrderForTitle(title: string, entries: LoreEntry[]) {
  const titleOrder = titleHintOrder(title);
  if (titleOrder < 900) return titleOrder;
  const eventOrders = entries
    .flatMap((entry) => entry.connections?.timelineEvents || [])
    .map(titleHintOrder)
    .filter((order) => order < 900);
  if (eventOrders.length) return Math.min(...eventOrders);
  const eras = entries.map((entry) => entry.timeline?.era || "").map(eraOrder).filter(Boolean);
  if (eras.length) return Math.min(...eras);
  return 500;
}

function titleHintOrder(title: string) {
  const normalizedTitle = normalizeLookup(title);
  const exact = chronologyHints.findIndex((hint) => normalizeLookup(hint) === normalizedTitle);
  if (exact >= 0) return (exact + 1) * 10;
  const partial = chronologyHints.findIndex((hint) => normalizedTitle.includes(normalizeLookup(hint)) || normalizeLookup(hint).includes(normalizedTitle));
  if (partial >= 0) return (partial + 1) * 10;
  return 900;
}

function eraOrder(era: string) {
  return eraRank[normalizeLookup(era)] || 0;
}

function storyDateLabel(entry: LoreEntry, order: number) {
  return extractDateLabel(entrySearchSource(entry)) || dateLabelForTitle(entry.title, order);
}

function worldDateLabel(entry: WorldBuildingEntry, order: number) {
  return extractDateLabel(worldEntrySearchSource(entry)) || dateLabelForTitle(entry.title, order);
}

function dateLabelForTitle(title: string, order: number) {
  const text = normalizeLookup(title);
  if (/300 year war|ovenhold/.test(text)) return "300-Year War";
  if (/tablemaker|meal that ended/.test(text) && order <= 40) return "War's End";
  if (order < 40) return "Ancient War";
  if (order < 70) return "Tohm's Youth";
  if (order < 90) return "Tabby Disaster";
  if (order < 120) return "Second Exodus";
  if (order < 170) return "Royal Crisis";
  if (order < 200) return "Lillia Incident";
  if (order < 220) return "Game Start";
  if (order < 260) return "Act 1";
  return "Lore Era";
}

function extractDateLabel(text: string) {
  const range = text.match(/\b(?:year|yr)\s*[:#-]?\s*(\d{1,4}\s*(?:to|-)\s*\d{1,4})\b/i);
  if (range) return `Year ${range[1].replace(/\s+/g, " ")}`;
  const year = text.match(/\b(?:year|yr)\s*[:#-]?\s*(\d{1,4})\b/i);
  if (year) return `Year ${year[1]}`;
  if (/\b300\s*year\s*war\b/i.test(text)) return "300-Year War";
  return "";
}

function storyEraLabel(entry: LoreEntry) {
  return entry.timeline?.era || entry.type || "Story Lore";
}

function eraLabelForTitle(title: string, entries: LoreEntry[]) {
  const fromEntry = entries.find((entry) => entry.timeline?.era)?.timeline?.era;
  if (fromEntry) return fromEntry;
  return dateLabelForTitle(title, chronologyOrderForTitle(title, entries));
}

function timelineFocusMatches(point: TimelinePoint, focus: string) {
  if (focus === "all") return true;
  const text = timelineSearchText(point);
  if (focus === "tablemaker") return /tablemaker|300 year war|ovenhold|everfeast|food essence|triadic/.test(text);
  if (focus === "whisken") return /whisken|tabby island|cat cauldron|exodus|mas'eel/.test(text);
  if (focus === "tohm") return /tohm|cat cauldron|recipe book|living tavern/.test(text);
  if (focus === "lillia") return /lillia|dragon knife|king|queen|faery|dwarven/.test(text);
  if (focus === "game") return point.scope === "game";
  return true;
}

function timelineEventNames(entries: LoreEntry[]) {
  return Array.from(new Set(
    entries.flatMap((entry) => entry.connections?.timelineEvents || [])
      .map((event) => event.trim())
      .filter(Boolean)
  ));
}

function relatedEntriesForEvent(title: string, entries: LoreEntry[]) {
  const normalizedTitle = normalizeLookup(title);
  return entries.filter((entry) => {
    const hasEvent = (entry.connections?.timelineEvents || []).some((event) => normalizeLookup(event) === normalizedTitle);
    return hasEvent || normalizeLookup(entry.title) === normalizedTitle;
  });
}

function relatedWorldEntriesForEvent(title: string, worldEntries: WorldBuildingEntry[]) {
  const normalizedTitle = normalizeLookup(title);
  return worldEntries.filter((entry) => {
    const source = normalizeLookup(worldEntrySearchSource(entry));
    return normalizeLookup(entry.title) === normalizedTitle || source.includes(normalizedTitle);
  });
}

function buildReferenceTimelineSummary(title: string, entries: LoreEntry[], worldEntries: WorldBuildingEntry[]) {
  const direct = entries.find((entry) => normalizeLookup(entry.title) === normalizeLookup(title));
  if (direct) return direct.summary || direct.internalLore || title;
  const world = worldEntries.find((entry) => normalizeLookup(entry.title) === normalizeLookup(title));
  if (world) return worldEntrySummary(world);
  const linkedNames = [...entries.slice(0, 3).map((entry) => entry.title), ...worldEntries.slice(0, 3).map((entry) => entry.title)];
  return linkedNames.length
    ? `${title} is referenced by ${linkedNames.join(", ")}. Open the related entries to expand this event into a dedicated page.`
    : title;
}

function uniqueEntries(entries: LoreEntry[]) {
  return Array.from(new Map(entries.map((entry) => [entry.id, entry])).values());
}

function uniqueWorldEntries(entries: WorldBuildingEntry[]) {
  return Array.from(new Map(entries.map((entry) => [`${entry.category}-${entry.id}`, entry])).values());
}

function richerSummary(left: string, right: string) {
  return richTextToPlainText(right).length > richTextToPlainText(left).length ? right : left;
}

function storyModuleSearchText(item: StoryModuleView) {
  return `${entrySearchSource(item.entry)} ${item.eraLabel} ${item.dateLabel} ${item.worldRefs.map((ref) => `${ref.entry.title} ${ref.entry.type} ${ref.entry.tags.join(" ")}`).join(" ")}`.toLowerCase();
}

function timelineSearchText(point: TimelinePoint) {
  return `${point.title} ${point.summary} ${point.eraLabel} ${point.dateLabel} ${point.relatedEntries.map(entrySearchSource).join(" ")} ${point.relatedWorldEntries.map(worldEntrySearchSource).join(" ")}`.toLowerCase();
}

function entrySearchSource(entry: LoreEntry) {
  return [
    entry.title,
    entry.category,
    entry.type,
    entry.status,
    entry.spoilerLevel,
    entry.summary,
    entry.publicDescription,
    entry.internalLore,
    entry.tags.join(" "),
    Object.values(entry.fields || {}).map(formatFieldValue).join(" "),
    Object.values(entry.connections || {}).flat().join(" "),
    entry.timeline?.era,
    entry.timeline?.trueTimeline,
    entry.timeline?.playerTimeline,
    entry.timeline?.questTimeline,
    entry.timeline?.emotionalTimeline,
    entry.secret?.trueFact,
    entry.secret?.playerKnowledge
  ].filter(Boolean).join(" ");
}

function worldEntrySearchSource(entry: WorldBuildingEntry) {
  return [
    entry.title,
    entry.type,
    entry.summary,
    entry.tags.join(" "),
    Object.values(entry.fields || {}).join(" "),
    entry.relatedEntries.map((related) => `${related.type} ${related.targetId} ${related.note}`).join(" ")
  ].filter(Boolean).join(" ");
}

function worldEntrySummary(entry: WorldBuildingEntry) {
  return storySectionText([
    entry.summary,
    fieldTextFromMap(entry.fields, ["event", "overview", "history", "causes", "consequences", "storyRole"])
  ]) || entry.title;
}

function iconForStoryEntry(entry: LoreEntry) {
  const text = `${entry.title} ${entry.type} ${entry.tags.join(" ")}`.toLowerCase();
  if (/secret|hidden|reveal/.test(text)) return "EyeOff";
  if (/timeline|event|history|exodus/.test(text)) return "GitBranch";
  if (/faction|culture|cult|kingdom|people/.test(text)) return "Landmark";
  if (/faith|myth|tablemaker|legend/.test(text)) return "Sparkles";
  if (/quest|rescue|investigate/.test(text)) return "ScrollText";
  return "BookOpen";
}

function statusRank(status: string) {
  if (/canon/i.test(status) && !/soft/i.test(status)) return 0;
  if (/soft canon/i.test(status)) return 1;
  if (/needs rewrite/i.test(status)) return 2;
  if (/idea/i.test(status)) return 3;
  return 4;
}

function spoilerRank(spoilerLevel: string) {
  if (/no spoiler/i.test(spoilerLevel)) return 0;
  if (/minor/i.test(spoilerLevel)) return 1;
  if (/major/i.test(spoilerLevel)) return 2;
  if (/ending/i.test(spoilerLevel)) return 3;
  return 4;
}

function connectionLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

function storySectionText(values: Array<string | undefined>) {
  return values.map((value) => String(value || "").trim()).filter(Boolean).join("\n\n");
}

function formatTimeline(timeline: TimelineInfo | undefined, events: string[]) {
  return [
    timeline?.era ? `Era: ${timeline.era}` : "",
    timeline?.trueTimeline ? `True timeline: ${timeline.trueTimeline}` : "",
    timeline?.playerTimeline ? `Player timeline: ${timeline.playerTimeline}` : "",
    timeline?.questTimeline ? `Quest timeline: ${timeline.questTimeline}` : "",
    timeline?.emotionalTimeline ? `Emotional timeline: ${timeline.emotionalTimeline}` : "",
    events.length ? `Linked events: ${events.join(", ")}` : ""
  ].filter(Boolean).join("\n");
}

function formatSecret(secret: SecretInfo | undefined) {
  if (!secret) return "";
  return [
    secret.trueFact ? `True fact: ${secret.trueFact}` : "",
    secret.playerKnowledge ? `Player knowledge: ${secret.playerKnowledge}` : "",
    secret.knownBy.length ? `Known by: ${secret.knownBy.join(", ")}` : "",
    secret.suspectedBy.length ? `Suspected by: ${secret.suspectedBy.join(", ")}` : "",
    secret.unknownTo.length ? `Unknown to: ${secret.unknownTo.join(", ")}` : "",
    secret.relatedQuests.length ? `Related quests: ${secret.relatedQuests.join(", ")}` : "",
    secret.relatedDialogue.length ? `Related dialogue: ${secret.relatedDialogue.join(", ")}` : ""
  ].filter(Boolean).join("\n");
}

function formatConnections(connections: EntryConnections) {
  return Object.entries(connections)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => `${connectionLabel(key)}\n${values.join(", ")}`)
    .join("\n\n");
}

function fieldText(entry: LoreEntry, labels: string[]) {
  return fieldTextFromMap(entry.fields || {}, labels);
}

function fieldTextFromMap(fields: Record<string, unknown>, labels: string[]) {
  for (const label of labels) {
    const match = Object.entries(fields || {}).find(([key]) => normalizeLabel(key) === normalizeLabel(label));
    if (match && typeof match[1] === "string" && match[1].trim()) return match[1].trim();
  }
  return "";
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeLookup(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasDisplayValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.some(hasDisplayValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasDisplayValue);
  return true;
}

function formatFieldValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatFieldValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, nestedValue]) => hasDisplayValue(nestedValue))
      .map(([key, nestedValue]) => `${key}: ${formatFieldValue(nestedValue)}`)
      .join("; ");
  }
  return String(value);
}
