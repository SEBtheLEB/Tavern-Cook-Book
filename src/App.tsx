import { useEffect, useMemo, useState } from "react";
import type { ActiveView, AppMode, LoreDatabase, LoreEntry, ThemeMode, ViewConfig } from "./types";
import { createStarterDatabase } from "./data/starterData";
import { mainNavigation } from "./data/navigation";
import { createBlankEntry, normalizeEntry, slugify } from "./utils/entries";
import {
  DATABASE_KEY,
  THEME_KEY,
  loadAppMode,
  loadDatabase,
  loadTheme,
  migrateDatabase,
  saveAppMode,
  saveDatabase,
  saveTheme
} from "./utils/storage";
import { searchEntries } from "./utils/search";
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
  const [mode, setMode] = useState<AppMode>(() => loadAppMode());
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedEntry, setSelectedEntry] = useState<LoreEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!readOnly) {
      saveDatabase(database);
    }
  }, [database, readOnly]);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!readOnly) {
      saveAppMode(mode);
    }
  }, [mode, readOnly]);

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
  };

  const submitSearch = () => {
    if (!searchQuery.trim()) return;
    setCommittedSearch(searchQuery.trim());
    setActiveView("search");
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
            mode={readOnly ? "view" : mode}
            searchQuery={searchQuery}
            onThemeChange={setTheme}
            onModeChange={setMode}
            onSearchQueryChange={setSearchQuery}
            onSubmitSearch={submitSearch}
            onCreateEntry={createEntry}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            readOnly={readOnly}
          />

          {activeView === "dashboard" && (
            <Dashboard database={database} onNavigate={navigate} onOpenEntry={setSelectedEntry} />
          )}

          {activeView === "search" && (
            <SearchResults
              query={committedSearch}
              results={results}
              mode={readOnly ? "view" : mode}
              onClear={() => {
                setSearchQuery("");
                setCommittedSearch("");
                setActiveView("dashboard");
              }}
              onOpenEntry={setSelectedEntry}
              onUpdateEntry={upsertEntry}
            />
          )}

          {activeView === "timeline" && (
            <TimelineView
              entries={database.entries}
              mode={readOnly ? "view" : mode}
              onOpenEntry={setSelectedEntry}
              onUpdateEntry={upsertEntry}
            />
          )}

          {activeView === "secrets" && (
            <SecretsView
              entries={database.entries}
              mode={readOnly ? "view" : mode}
              onOpenEntry={setSelectedEntry}
              onUpdateEntry={upsertEntry}
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
              mode={readOnly ? "view" : mode}
              onNavigate={navigate}
              onOpenEntry={setSelectedEntry}
              onUpdateEntry={upsertEntry}
            />
          )}

          {!readOnly && <AssistantPanel database={database} onDatabaseChange={updateDatabase} />}
        </main>

        {selectedEntry && (
          <EntryModal
            entry={selectedEntry}
            mode={readOnly ? "view" : mode}
            onClose={() => setSelectedEntry(null)}
            onSave={upsertEntry}
            onDuplicate={duplicateEntry}
            onDelete={deleteEntry}
          />
        )}
      </div>
    </div>
  );
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
