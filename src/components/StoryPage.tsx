import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ActiveView, EntryConnections, LoreEntry, SecretInfo, TimelineInfo } from "../types";
import { richTextToPlainText } from "../utils/richText";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";
import { RichLoreText } from "./RichText";
import { StoryReaderModal, type StoryReaderSection, type StoryReaderStep } from "./StoryReaderModal";

interface StoryPageProps {
  entries: LoreEntry[];
  readOnly?: boolean;
  onNavigate: (view: ActiveView) => void;
  onOpenEntry: (entry: LoreEntry) => void;
  isFavorite?: (entry: LoreEntry) => boolean;
  onToggleFavorite?: (entry: LoreEntry) => void;
}

const storyFilters = [
  { id: "all", label: "All" },
  { id: "canon", label: "Canon" },
  { id: "major", label: "Major" },
  { id: "timeline", label: "Timeline" },
  { id: "secrets", label: "Secrets" },
  { id: "factions", label: "Factions" }
];

export function StoryPage({
  entries,
  readOnly = false,
  onNavigate,
  onOpenEntry,
  isFavorite,
  onToggleFavorite
}: StoryPageProps) {
  const storyModules = useMemo(() => entries.filter(isStoryModule).sort(sortStoryModules), [entries]);
  const [selectedId, setSelectedId] = useState(storyModules[0]?.id || "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [fullStoryOpen, setFullStoryOpen] = useState(false);
  const [activeStoryTab, setActiveStoryTab] = useState("full");

  const filteredModules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return storyModules.filter((entry) => {
      const matchesQuery = !normalizedQuery || [
        entry.title,
        entry.type,
        entry.status,
        entry.spoilerLevel,
        entry.summary,
        entry.internalLore,
        entry.tags.join(" ")
      ].some((value) => richTextToPlainText(String(value || "")).toLowerCase().includes(normalizedQuery));
      if (!matchesQuery) return false;
      if (filter === "canon") return /canon/i.test(entry.status);
      if (filter === "major") return /major|ending/i.test(entry.spoilerLevel);
      if (filter === "timeline") return Boolean(entry.timeline) || entry.connections.timelineEvents.length > 0 || /timeline|event|history/i.test(entry.type);
      if (filter === "secrets") return Boolean(entry.secret) || /secret|hidden|reveal/i.test(`${entry.title} ${entry.type} ${entry.tags.join(" ")}`);
      if (filter === "factions") return /faction|culture|cult|people|kingdom/i.test(entry.type);
      return true;
    });
  }, [filter, query, storyModules]);

  const selectedEntry =
    filteredModules.find((entry) => entry.id === selectedId) ||
    storyModules.find((entry) => entry.id === selectedId) ||
    filteredModules[0] ||
    storyModules[0] ||
    null;
  const readerSections = selectedEntry ? buildStoryReaderSections(selectedEntry) : [];
  const readerSteps = selectedEntry ? buildStoryReaderSteps(selectedEntry) : [];
  const fullStory = selectedEntry ? storyFullText(selectedEntry, readerSections) : "";

  useEffect(() => {
    if (!storyModules.length) {
      setSelectedId("");
      return;
    }
    if (!storyModules.some((entry) => entry.id === selectedId)) {
      setSelectedId(storyModules[0].id);
    }
  }, [selectedId, storyModules]);

  return (
    <div className="story-codex-page">
      <section className="story-codex-header">
        <div>
          <p>Story Codex</p>
          <h1 className="font-display">Story</h1>
          <span>{storyModules.length} modules</span>
        </div>
        <div className="story-codex-header-actions">
          <button className="character-codex-action-button" onClick={() => onNavigate("storyJourney")}>
            <Icon name="BookOpen" className="h-4 w-4" />
            Story Journey
          </button>
          <button className="character-codex-action-button" onClick={() => onNavigate("timeline")}>
            <Icon name="GitBranch" className="h-4 w-4" />
            Timeline
          </button>
          <button className="character-codex-action-button" onClick={() => onNavigate("secrets")}>
            <Icon name="EyeOff" className="h-4 w-4" />
            Secrets
          </button>
        </div>
      </section>

      <section className="story-codex-controls">
        <label>
          <span>Search</span>
          <input value={query} placeholder="Search story modules" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="story-codex-filter-row">
          {storyFilters.map((item) => (
            <button
              key={item.id}
              className={filter === item.id ? "active" : ""}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="story-codex-layout">
        <section className="story-module-list" aria-label="Story modules">
          {filteredModules.length ? filteredModules.map((entry) => (
            <StoryModuleButton
              key={entry.id}
              entry={entry}
              active={selectedEntry?.id === entry.id}
              favorite={Boolean(isFavorite?.(entry))}
              onToggleFavorite={onToggleFavorite}
              onSelect={() => setSelectedId(entry.id)}
            />
          )) : (
            <div className="story-empty-state">
              <Icon name="Search" className="h-6 w-6" />
              <strong>No story modules found</strong>
            </div>
          )}
        </section>

        <section className="story-module-detail">
          {selectedEntry ? (
            <>
              <header>
                <div>
                  <p>{selectedEntry.type}</p>
                  <h2 className="font-display">{selectedEntry.title}</h2>
                  <div className="story-detail-pills">
                    <span>{selectedEntry.status}</span>
                    <span>{selectedEntry.spoilerLevel}</span>
                    <span>{connectionCount(selectedEntry.connections)} links</span>
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
                  <button className="character-codex-action-button" onClick={() => onOpenEntry(selectedEntry)}>
                    <Icon name={readOnly ? "Eye" : "Edit3"} className="h-4 w-4" />
                    {readOnly ? "Open Entry" : "Edit Entry"}
                  </button>
                </div>
              </header>

              <div className="story-primary-text-grid">
                <StoryTextBlock title="Summary" text={selectedEntry.summary || selectedEntry.publicDescription || "No summary added yet."} />
                <StoryTextBlock title="Internal Lore" text={selectedEntry.internalLore || "No internal lore added yet."} />
              </div>

              <div className="story-detail-accordions">
                <StoryDetails title="Tags" icon="Sparkles">
                  <div className="story-chip-row">
                    {selectedEntry.tags.length ? selectedEntry.tags.map((tag) => <span key={tag}>{tag}</span>) : <em>No tags added yet.</em>}
                  </div>
                </StoryDetails>
                <StoryDetails title="Connections" icon="Compass">
                  <ConnectionList connections={selectedEntry.connections} />
                </StoryDetails>
                <StoryDetails title="Timeline / History" icon="GitBranch">
                  <TimelineBlock timeline={selectedEntry.timeline} events={selectedEntry.connections.timelineEvents} />
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

              {fullStoryOpen && (
                <StoryReaderModal
                  title={selectedEntry.title}
                  eyebrow="Story Module Scroll"
                  activeTab={activeStoryTab}
                  sections={readerSections}
                  fullStory={fullStory}
                  steps={readerSteps}
                  onSetActiveTab={setActiveStoryTab}
                  onClose={() => setFullStoryOpen(false)}
                />
              )}
            </>
          ) : (
            <div className="story-empty-state">
              <Icon name="BookOpen" className="h-7 w-7" />
              <strong>No story modules yet</strong>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StoryModuleButton({
  entry,
  active,
  favorite,
  onToggleFavorite,
  onSelect
}: {
  entry: LoreEntry;
  active: boolean;
  favorite: boolean;
  onToggleFavorite?: (entry: LoreEntry) => void;
  onSelect: () => void;
}) {
  const summary = richTextToPlainText(entry.summary || entry.internalLore || "No summary yet.");
  return (
    <article className={`story-module-button ${active ? "active" : ""}`}>
      <button className="story-module-select-button" onClick={onSelect}>
        <div className="story-module-icon">
          <Icon name={iconForStoryEntry(entry)} className="h-5 w-5" />
        </div>
        <div>
          <div className="story-module-button-topline">
            <span>{entry.status}</span>
            <span>{entry.spoilerLevel}</span>
          </div>
          <h3>{entry.title}</h3>
          <p>{summary}</p>
          <small>{entry.type}</small>
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

function StoryTextBlock({ title, text }: { title: string; text: string }) {
  return (
    <article className="story-text-block">
      <h3>{title}</h3>
      <RichLoreText text={text} />
    </article>
  );
}

function StoryDetails({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <details className="story-details">
      <summary>
        <Icon name={icon} className="h-4 w-4" />
        {title}
        <Icon name="ChevronDown" className="h-4 w-4" />
      </summary>
      <div>{children}</div>
    </details>
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

function TimelineBlock({ timeline, events }: { timeline?: TimelineInfo; events: string[] }) {
  const lines = [
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

function isStoryModule(entry: LoreEntry) {
  return entry.category === "Story";
}

function sortStoryModules(left: LoreEntry, right: LoreEntry) {
  const statusScore = statusRank(left.status) - statusRank(right.status);
  if (statusScore) return statusScore;
  return left.title.localeCompare(right.title);
}

function statusRank(status: string) {
  if (/canon/i.test(status)) return 0;
  if (/soft canon/i.test(status)) return 1;
  if (/needs rewrite/i.test(status)) return 2;
  if (/idea/i.test(status)) return 3;
  return 4;
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

function connectionCount(connections: EntryConnections) {
  return Object.values(connections).reduce((total, values) => total + values.length, 0);
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
  for (const label of labels) {
    const match = Object.entries(entry.fields || {}).find(([key]) => normalizeLabel(key) === normalizeLabel(label));
    if (match && typeof match[1] === "string" && match[1].trim()) return match[1].trim();
  }
  return "";
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
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
