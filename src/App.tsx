import { useEffect, useMemo, useState } from "react";
import type { ActiveView, LoreDatabase, LoreEntry, ThemeMode, ViewConfig } from "./types";
import { createStarterDatabase } from "./data/starterData";
import { mainNavigation } from "./data/navigation";
import { createBlankEntry, normalizeEntry, slugify } from "./utils/entries";
import {
  DATABASE_KEY,
  THEME_KEY,
  loadDatabase,
  loadTheme,
  migrateDatabase,
  saveDatabase,
  saveTheme
} from "./utils/storage";
import { searchEntries } from "./utils/search";
import { richTextToPlainText } from "./utils/richText";
import { AssistantPanel } from "./components/AssistantPanel";
import { Dashboard } from "./components/Dashboard";
import { EntryGrid } from "./components/EntryGrid";
import { EntryModal } from "./components/EntryModal";
import { HubPage } from "./components/HubPage";
import { SearchResults } from "./components/SearchResults";
import { SecretsView } from "./components/SecretsView";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { TimelineView } from "./components/TimelineView";
import { TopBar } from "./components/TopBar";
import { buildLoreKeywords, LoreKeywordProvider } from "./components/LoreKeywordText";

const extraViews: ViewConfig[] = [
  {
    id: "timeline",
    label: "Timeline",
    description: "True, player, quest, and emotional chronology.",
    icon: "GitBranch"
  },
  {
    id: "secrets",
    label: "Secrets / Who Knows What",
    description: "Canon facts, who knows, who suspects, and reveal timing.",
    icon: "EyeOff"
  },
  {
    id: "recipes",
    label: "Recipes & Food Magic",
    description: "Meals, recipes, food magic, broths, ales, and corrupted dishes.",
    icon: "Soup"
  },
  {
    id: "ingredients",
    label: "Ingredients",
    description: "Ingredients, enemy drops, slime gels, and prepared food parts.",
    icon: "Wheat"
  },
  {
    id: "items",
    label: "Items & Artifacts",
    description: "Tools, artifacts, collectibles, inventory items, and magical objects.",
    icon: "Package"
  },
  {
    id: "enemies",
    label: "Enemies & Creatures",
    description: "Creatures, bosses, drops, bug enemies, slimes, and behaviors.",
    icon: "Swords"
  },
  {
    id: "factions",
    label: "Factions & Cultures",
    description: "Kingdoms, cultures, cults, naming issues, and world philosophies.",
    icon: "Landmark"
  }
];

const allViews = [...mainNavigation, ...extraViews];

export default function App() {
  const hostedViewer = import.meta.env.VITE_READONLY_VIEWER === "true";
  const readOnly =
    hostedViewer || new URLSearchParams(window.location.search).get("readonly") === "1";
  const [database, setDatabase] = useState<LoreDatabase>(() =>
    hostedViewer ? createStarterDatabase() : loadDatabase()
  );
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedEntry, setSelectedEntry] = useState<LoreEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [referenceQuery, setReferenceQuery] = useState("");
  const [selectedReferenceKeyword, setSelectedReferenceKeyword] = useState("");
  const [keywordPopup, setKeywordPopup] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");

  useEffect(() => {
    if (!readOnly) {
      const result = saveDatabase(database);
      setStorageWarning(result.ok ? "" : result.message || "The app could not save this change.");
    }
  }, [database, readOnly]);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.title = readOnly ? "The Tavern Cook Book - Live View" : "The Tavern Cook Book";
  }, [readOnly]);

  useEffect(() => {
    if (!hostedViewer) return;

    fetch("./lore-data.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("No hosted lore data found.");
        return response.json();
      })
      .then((payload) => setDatabase(migrateDatabase(payload)))
      .catch(() => setDatabase(createStarterDatabase()));
  }, [hostedViewer]);

  useEffect(() => {
    if (!selectedEntry) return;
    const latest = database.entries.find((entry) => entry.id === selectedEntry.id);
    setSelectedEntry(latest || null);
  }, [database.entries, selectedEntry]);

  useEffect(() => {
    if (hostedViewer) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DATABASE_KEY) {
        setDatabase(loadDatabase());
      }
      if (event.key === THEME_KEY) {
        setTheme(loadTheme());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [hostedViewer]);

  const activeConfig = allViews.find((view) => view.id === activeView) || mainNavigation[0];

  const results = useMemo(
    () => searchEntries(database.entries, committedSearch),
    [database.entries, committedSearch]
  );

  const loreKeywords = useMemo(
    () => buildLoreKeywords(database.entries),
    [database.entries]
  );

  const viewEntries = useMemo(
    () => selectEntriesForView(database.entries, activeView),
    [database.entries, activeView]
  );

  const updateDatabase = (next: LoreDatabase) => {
    if (readOnly) return;
    setDatabase(next);
  };

  const upsertEntry = (entry: LoreEntry) => {
    if (readOnly) return;
    const normalized = normalizeEntry({ ...entry, updatedAt: new Date().toISOString() });
    setDatabase((current) => ({
      ...current,
      entries: current.entries.some((item) => item.id === normalized.id)
        ? current.entries.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...current.entries]
    }));
    setSelectedEntry(normalized);
  };

  const duplicateEntry = (entry: LoreEntry) => {
    if (readOnly) return;
    const duplicate = normalizeEntry({
      ...entry,
      id: `${slugify(entry.title)}-copy-${Date.now()}`,
      title: `${entry.title} Copy`,
      status: entry.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setDatabase((current) => ({ ...current, entries: [duplicate, ...current.entries] }));
    setSelectedEntry(duplicate);
    setSelectedReferenceKeyword("");
  };

  const deleteEntry = (entry: LoreEntry) => {
    if (readOnly) return;
    setDatabase((current) => ({
      ...current,
      entries: current.entries.filter((item) => item.id !== entry.id)
    }));
    setSelectedEntry(null);
  };

  const createEntry = () => {
    if (readOnly) return;
    const category = categoryForView(activeView);
    const blank = createBlankEntry(category);
    setDatabase((current) => ({ ...current, entries: [blank, ...current.entries] }));
    setSelectedEntry(blank);
    setSelectedReferenceKeyword("");
  };

  const openEntry = (entry: LoreEntry) => {
    setSelectedEntry(entry);
    setSelectedReferenceKeyword("");
  };

  const submitSearch = () => {
    if (!searchQuery.trim()) return;
    setCommittedSearch(searchQuery.trim());
    setReferenceQuery("");
    setActiveView("search");
  };

  const openAllReferences = (keyword: string) => {
    setSearchQuery(keyword);
    setCommittedSearch(keyword);
    setReferenceQuery(keyword);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setActiveView("search");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openKeywordReference = (keyword: string) => {
    setKeywordPopup(keyword);
  };

  const openEntryFromKeywordPopup = (entry: LoreEntry) => {
    setSelectedEntry(entry);
    setSelectedReferenceKeyword(keywordPopup);
    setKeywordPopup("");
  };

  const navigate = (view: ActiveView) => {
    if (readOnly && view === "settings") {
      setActiveView("dashboard");
      return;
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={theme === "dream" ? "theme-dream" : ""}>
      <LoreKeywordProvider keywords={loreKeywords} onKeywordClick={openKeywordReference}>
      <div className="app-shell flex min-h-screen">
        <Sidebar
          database={database}
          activeView={activeView}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileNavOpen}
          onNavigate={navigate}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          onCloseMobile={() => setMobileNavOpen(false)}
          readOnly={readOnly}
        />

        <main className="min-w-0 flex-1">
          <TopBar
            theme={theme}
            searchQuery={searchQuery}
            onThemeChange={setTheme}
            onSearchQueryChange={setSearchQuery}
            onSubmitSearch={submitSearch}
            onCreateEntry={createEntry}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            readOnly={readOnly}
          />

          {storageWarning && (
            <div className="mx-4 mt-4 rounded border border-amber-500/60 bg-amber-500/10 p-3 text-sm md:mx-6">
              {storageWarning}
            </div>
          )}

          {activeView === "dashboard" && (
            <Dashboard database={database} onNavigate={navigate} onOpenEntry={openEntry} />
          )}

          {activeView === "search" && (
            <SearchResults
              query={committedSearch}
              referenceQuery={referenceQuery}
              results={results}
              onClear={() => {
                setSearchQuery("");
                setCommittedSearch("");
                setReferenceQuery("");
                setActiveView("dashboard");
              }}
              onOpenEntry={openEntry}
            />
          )}

          {activeView === "timeline" && (
            <TimelineView
              entries={database.entries}
              onOpenEntry={openEntry}
            />
          )}

          {activeView === "secrets" && (
            <SecretsView
              entries={database.entries}
              onOpenEntry={openEntry}
            />
          )}

          {activeView === "settings" && (
            <SettingsPage
              database={database}
              theme={theme}
              onDatabaseChange={updateDatabase}
              onThemeChange={setTheme}
            />
          )}

          {!["dashboard", "search", "timeline", "secrets", "settings"].includes(activeView) && (
            <HubPage
              view={activeConfig}
              entries={viewEntries}
              onNavigate={navigate}
              onOpenEntry={openEntry}
            />
          )}

          {!readOnly && <AssistantPanel database={database} onDatabaseChange={updateDatabase} />}
        </main>

        {selectedEntry && (
          <EntryModal
            entry={selectedEntry}
            readOnly={readOnly}
            referenceKeyword={selectedReferenceKeyword}
            onClose={() => setSelectedEntry(null)}
            onViewReferences={openAllReferences}
            onSave={upsertEntry}
            onDuplicate={duplicateEntry}
            onDelete={deleteEntry}
          />
        )}

        {keywordPopup && (
          <KeywordReferencePopup
            keyword={keywordPopup}
            entries={database.entries}
            onClose={() => setKeywordPopup("")}
            onOpenEntry={openEntryFromKeywordPopup}
            onViewAllReferences={openAllReferences}
          />
        )}
      </div>
      </LoreKeywordProvider>
    </div>
  );
}

function KeywordReferencePopup({
  keyword,
  entries,
  onClose,
  onOpenEntry,
  onViewAllReferences
}: {
  keyword: string;
  entries: LoreEntry[];
  onClose: () => void;
  onOpenEntry: (entry: LoreEntry) => void;
  onViewAllReferences: (keyword: string) => void;
}) {
  const primaryEntry = findPrimaryKeywordEntry(entries, keyword);
  const referenceEntries = orderKeywordReferences(searchEntries(entries, keyword), primaryEntry);
  const previewEntries = referenceEntries.slice(0, 8);

  return (
    <div className="keyword-reference-backdrop">
      <section className="keyword-reference-popup">
        <header className="keyword-reference-header">
          <div>
            <p>Linked lore keyword</p>
            <h2 className="font-display">{keyword}</h2>
          </div>
          <button className="keyword-reference-close" onClick={onClose} title="Close keyword references">
            X
          </button>
        </header>

        <div className="keyword-reference-body entry-scroll">
          {primaryEntry && (
            <article className="keyword-reference-primary">
              <div>
                <p>Main module</p>
                <h3>{primaryEntry.title}</h3>
                <span>{primaryEntry.category} / {primaryEntry.type}</span>
              </div>
              <button onClick={() => onOpenEntry(primaryEntry)}>
                Open Main Module
              </button>
            </article>
          )}

          <div className="keyword-reference-list">
            {previewEntries.map((entry) => (
              <article key={entry.id} className="keyword-reference-card">
                <div className="keyword-reference-thumb">
                  {entry.media.iconImage || entry.media.mainImage || entry.media.characterPortrait ? (
                    <img src={entry.media.iconImage || entry.media.mainImage || entry.media.characterPortrait} alt="" />
                  ) : (
                    <span>{entry.title.slice(0, 1)}</span>
                  )}
                </div>
                <div>
                  <p>{entry.category} / {entry.type}</p>
                  <h3>{entry.title}</h3>
                  <span>{richTextToPlainText(entry.summary || entry.publicDescription || entry.internalLore || "No summary yet.")}</span>
                </div>
                <button onClick={() => onOpenEntry(entry)}>
                  Open
                </button>
              </article>
            ))}
          </div>

          {!referenceEntries.length && (
            <div className="keyword-reference-empty">
              No modules reference this keyword yet.
            </div>
          )}
        </div>

        <footer className="keyword-reference-footer">
          <button onClick={onClose}>Stay Here</button>
          <button className="button-frame" onClick={() => onViewAllReferences(keyword)}>
            View Full References Page
          </button>
        </footer>
      </section>
    </div>
  );
}

function orderKeywordReferences(results: LoreEntry[], primaryEntry: LoreEntry | null) {
  if (!primaryEntry) return results;
  return [
    primaryEntry,
    ...results.filter((entry) => entry.id !== primaryEntry.id)
  ];
}

function findPrimaryKeywordEntry(entries: LoreEntry[], keyword: string) {
  const normalizedKeyword = normalizeKeyword(keyword);
  if (!normalizedKeyword) return null;

  return (
    entries.find((entry) =>
      getEntryKeywordAliases(entry).some((alias) => normalizeKeyword(alias) === normalizedKeyword)
    ) || null
  );
}

function getEntryKeywordAliases(entry: LoreEntry) {
  const aliases = [
    entry.title,
    entry.title.replace(/^Secret:\s*/i, ""),
    entry.title.replace(/^Public\s+/i, ""),
    ...entry.title.split(/\s*\/\s*/)
  ];

  return aliases.filter(Boolean);
}

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function selectEntriesForView(entries: LoreEntry[], view: ActiveView) {
  if (view === "recipes") {
    return entries.filter((entry) => /recipe|meal|food magic|consumable/i.test(entry.type));
  }
  if (view === "ingredients") {
    return entries.filter((entry) => /ingredient|drop|substitute/i.test(entry.type));
  }
  if (view === "items") {
    return entries.filter((entry) => /item|artifact|tool|collectible/i.test(entry.type));
  }
  if (view === "enemies") {
    return entries.filter((entry) => entry.category === "Enemies & Creatures");
  }
  if (view === "factions") {
    return entries.filter((entry) => /Faction|Culture|Cult/i.test(entry.type));
  }

  const config = allViews.find((item) => item.id === view);
  if (config?.category) {
    return entries.filter((entry) => entry.category === config.category);
  }
  return entries;
}

function categoryForView(view: ActiveView) {
  const config = allViews.find((item) => item.id === view);
  if (config?.category) return config.category;
  if (view === "enemies") return "Enemies & Creatures";
  if (view === "recipes" || view === "ingredients" || view === "items") return "Food & Inventory";
  if (view === "timeline" || view === "secrets" || view === "factions") return "Story";
  return "Story";
}
