import { useEffect, useMemo, useState } from "react";
import type {
  ActiveView,
  AssistantChangedTarget,
  BestiaryCategoryArtVault,
  BestiaryCreature,
  FavoriteKind,
  GoogleAccountUser,
  LoreDatabase,
  LoreEntry,
  ThemeMode,
  ViewConfig,
  WorldBuildingFocusTarget
} from "./types";
import { createStarterDatabase } from "./data/starterData";
import { mainNavigation } from "./data/navigation";
import { createBlankEntry, normalizeEntry, slugify } from "./utils/entries";
import { createBlankBestiaryCreature, normalizeBestiaryCategoryArtVault, normalizeBestiaryCreature } from "./utils/bestiary";
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
import { AssignmentProvider } from "./components/AssignmentSystem";
import { ArtVaultDashboard } from "./components/ArtVaultDashboard";
import type { ArtBinderInitialFilter, ArtBinderKind } from "./components/ArtBinderPage";
import { AccessGate } from "./components/AccessGate";
import { AssistantPanel } from "./components/AssistantPanel";
import { BestiaryPage } from "./components/BestiaryPage";
import { CharacterDetailPage } from "./components/CharacterDetailPage";
import { Dashboard } from "./components/Dashboard";
import { EntryGrid } from "./components/EntryGrid";
import { EntryModal } from "./components/EntryModal";
import { FavoritesPage } from "./components/FavoritesPage";
import { HubPage } from "./components/HubPage";
import { PantryPage } from "./components/PantryPage";
import { ProfilePage } from "./components/ProfilePage";
import { QuestDashboard } from "./components/QuestDashboard";
import { SearchResults } from "./components/SearchResults";
import { SecretsView } from "./components/SecretsView";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { StoryJourneyPage } from "./components/StoryJourneyPage";
import { SpriteSheetAnimatorPage } from "./components/SpriteSheetAnimatorPage";
import { TimelineView } from "./components/TimelineView";
import { TopBar } from "./components/TopBar";
import { WorldBuildingPage } from "./components/WorldBuildingPage";
import { buildLoreKeywords, LoreKeywordProvider } from "./components/LoreKeywordText";
import { buildArtVaultDashboardStats } from "./utils/artVaultDashboard";
import {
  clearGoogleAccount,
  disableGoogleAutoSelect,
  getGoogleUserAccess,
  loadGoogleAccount,
  roleCanAccessSettings,
  roleCanEdit
} from "./utils/accessControl";
import { isFavorite as favoriteIncludes, loadFavorites, saveFavorites, toggleFavorite } from "./utils/favorites";
import {
  type AssignmentRecord,
  getAssignments,
  getAssignmentsForUser,
  getQuestCategories,
  getTeamMemberForGoogleUser,
  getTeamMembers,
  getUserProfiles,
  saveAssignments,
  saveQuestCategories,
  saveTeamMembers,
  saveUserProfiles
} from "./utils/assignments";

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

interface DetailReturnTarget {
  activeView: ActiveView;
  selectedEntryId: string | null;
  selectedBestiaryCreatureId: string;
  selectedReferenceKeyword: string;
  favoritesOpen: boolean;
  artVaultDashboardOpen: boolean;
  artBinderFilter: ArtBinderInitialFilter | null;
  questDashboardOpen: boolean;
  profileOpen: boolean;
  scrollY: number;
}

export default function App() {
  const hostedViewer = import.meta.env.VITE_READONLY_VIEWER === "true";
  const forcedReadOnly =
    hostedViewer || new URLSearchParams(window.location.search).get("readonly") === "1";
  const [database, setDatabase] = useState<LoreDatabase>(() =>
    hostedViewer ? createStarterDatabase() : loadDatabase()
  );
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedEntry, setSelectedEntry] = useState<LoreEntry | null>(null);
  const [selectedBestiaryCreatureId, setSelectedBestiaryCreatureId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [referenceQuery, setReferenceQuery] = useState("");
  const [selectedReferenceKeyword, setSelectedReferenceKeyword] = useState("");
  const [keywordPopup, setKeywordPopup] = useState("");
  const [artVaultDashboardOpen, setArtVaultDashboardOpen] = useState(false);
  const [artBinderFilter, setArtBinderFilter] = useState<ArtBinderInitialFilter | null>(null);
  const [detailReturnTarget, setDetailReturnTarget] = useState<DetailReturnTarget | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [questDashboardOpen, setQuestDashboardOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tavernScribeOpen, setTavernScribeOpen] = useState(false);
  const [worldBuildingFocus, setWorldBuildingFocus] = useState<WorldBuildingFocusTarget | null>(null);
  const [assignMode, setAssignMode] = useState(false);
  const [focusedAssignment, setFocusedAssignment] = useState<AssignmentRecord | null>(null);
  const [assignments, setAssignments] = useState(() => getAssignments());
  const [teamMembers, setTeamMembers] = useState(() => getTeamMembers());
  const [userProfiles, setUserProfiles] = useState(() => getUserProfiles());
  const [questCategories, setQuestCategories] = useState(() => getQuestCategories());
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [currentUser, setCurrentUser] = useState<GoogleAccountUser | null>(() => loadGoogleAccount());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const currentRole = currentUser?.role || "viewer";
  const canEdit = roleCanEdit(currentRole);
  const canAccessSettings = roleCanAccessSettings(currentRole);
  const readOnly = forcedReadOnly || !canEdit;

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
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    saveAssignments(assignments);
  }, [assignments]);

  useEffect(() => {
    saveTeamMembers(teamMembers);
  }, [teamMembers]);

  useEffect(() => {
    saveUserProfiles(userProfiles);
  }, [userProfiles]);

  useEffect(() => {
    saveQuestCategories(questCategories);
  }, [questCategories]);

  useEffect(() => {
    document.title = readOnly ? "The Tavern Cook Book - Live View" : "The Tavern Cook Book";
  }, [readOnly]);

  useEffect(() => {
    if (!readOnly || !artVaultDashboardOpen) return;
    setArtVaultDashboardOpen(false);
    setArtBinderFilter(null);
  }, [readOnly, artVaultDashboardOpen]);

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
  const selectedCharacterEntry = selectedEntry && isCharacterEntry(selectedEntry) ? selectedEntry : null;

  const captureDetailReturnTarget = (): DetailReturnTarget => ({
    activeView,
    selectedEntryId: selectedEntry?.id || null,
    selectedBestiaryCreatureId,
    selectedReferenceKeyword,
    favoritesOpen,
    artVaultDashboardOpen,
    artBinderFilter,
    questDashboardOpen,
    profileOpen,
    scrollY: window.scrollY
  });

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

  const artVaultProgress = useMemo(
    () => buildArtVaultDashboardStats(database),
    [database]
  );
  const currentTeamMember = currentUser ? getTeamMemberForGoogleUser(currentUser, teamMembers) : null;
  const currentQuestCount = currentUser && currentTeamMember
    ? getAssignmentsForUser(assignments, currentTeamMember.id, currentUser.email).filter((assignment) => assignment.status !== "done").length
    : 0;

  const updateDatabase = (next: LoreDatabase) => {
    if (readOnly) return;
    setDatabase(next);
  };

  const upsertEntry = (entry: LoreEntry, options: { openDetail?: boolean } = {}) => {
    if (readOnly) return;
    const normalized = normalizeEntry({ ...entry, updatedAt: new Date().toISOString() });
    setDatabase((current) => ({
      ...current,
      entries: current.entries.some((item) => item.id === normalized.id)
        ? current.entries.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...current.entries]
    }));
    if (options.openDetail !== false) {
      setSelectedEntry(normalized);
    }
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
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    if (activeView === "bestiary") {
      const creature = createBlankBestiaryCreature();
      setDatabase((current) => ({ ...current, bestiary: [creature, ...(current.bestiary || [])] }));
      return;
    }
    const category = categoryForView(activeView);
    const blank = createBlankEntry(category);
    setDatabase((current) => ({ ...current, entries: [blank, ...current.entries] }));
    setSelectedEntry(blank);
    setSelectedReferenceKeyword("");
  };

  const openEntry = (entry: LoreEntry) => {
    setDetailReturnTarget(captureDetailReturnTarget());
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setSelectedEntry(entry);
    setSelectedReferenceKeyword("");
  };

  const submitSearch = () => {
    if (!searchQuery.trim()) return;
    setCommittedSearch(searchQuery.trim());
    setReferenceQuery("");
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setActiveView("search");
  };

  const openAllReferences = (keyword: string) => {
    setSearchQuery(keyword);
    setCommittedSearch(keyword);
    setReferenceQuery(keyword);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setActiveView("search");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openKeywordReference = (keyword: string) => {
    setKeywordPopup(keyword);
  };

  const openEntryFromKeywordPopup = (entry: LoreEntry) => {
    setDetailReturnTarget(captureDetailReturnTarget());
    setArtVaultDashboardOpen(false);
    setSelectedEntry(entry);
    setSelectedReferenceKeyword(keywordPopup);
    setKeywordPopup("");
  };

  const closeCharacterDetailPage = () => {
    const target = detailReturnTarget;
    setDetailReturnTarget(null);
    setKeywordPopup("");

    if (!target) {
      setSelectedEntry(null);
      setSelectedReferenceKeyword("");
      setArtVaultDashboardOpen(false);
      setFavoritesOpen(false);
      setActiveView("characters");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const returnEntry = target.selectedEntryId
      ? database.entries.find((entry) => entry.id === target.selectedEntryId) || null
      : null;
    setActiveView(target.activeView);
    setSelectedEntry(returnEntry);
    setSelectedBestiaryCreatureId(target.selectedBestiaryCreatureId);
    setSelectedReferenceKeyword(target.selectedReferenceKeyword);
    setFavoritesOpen(target.favoritesOpen);
    setArtVaultDashboardOpen(target.artVaultDashboardOpen);
    setArtBinderFilter(target.artBinderFilter);
    setQuestDashboardOpen(target.questDashboardOpen);
    setProfileOpen(target.profileOpen);
    window.setTimeout(() => window.scrollTo({ top: target.scrollY, behavior: "smooth" }), 0);
  };

  const goToCharactersPage = () => {
    setDetailReturnTarget(null);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setQuestDashboardOpen(false);
    setProfileOpen(false);
    setSelectedBestiaryCreatureId("");
    setActiveView("characters");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToBestiaryPage = () => {
    setDetailReturnTarget(null);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setQuestDashboardOpen(false);
    setProfileOpen(false);
    setSelectedBestiaryCreatureId("");
    setActiveView("bestiary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigate = (view: ActiveView) => {
    setDetailReturnTarget(null);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setQuestDashboardOpen(false);
    setProfileOpen(false);
    if (view !== "bestiary") setSelectedBestiaryCreatureId("");
    if (view !== "world") setWorldBuildingFocus(null);
    if (!canAccessSettings && view === "settings") {
      setActiveView("dashboard");
      return;
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openFavorites = () => {
    setDetailReturnTarget(null);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openQuestDashboard = () => {
    setDetailReturnTarget(null);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setProfileOpen(false);
    setQuestDashboardOpen(true);
    setAssignMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openProfile = () => {
    setDetailReturnTarget(null);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setQuestDashboardOpen(false);
    setProfileOpen(true);
    setAssignMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFavoriteById = (kind: FavoriteKind, id: string) => {
    setFavorites((current) => toggleFavorite(current, kind, id));
  };

  const isEntryFavorite = (entry: LoreEntry) => favoriteIncludes(favorites, "entry", entry.id);
  const isCreatureFavorite = (creature: BestiaryCreature) => favoriteIncludes(favorites, "creature", creature.id);

  const openFavoriteCreature = (creature: BestiaryCreature) => {
    setDetailReturnTarget(captureDetailReturnTarget());
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setSelectedBestiaryCreatureId(creature.id);
    setActiveView("bestiary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openQuestAssignment = (assignment: AssignmentRecord) => {
    setFocusedAssignment(assignment);
    setQuestDashboardOpen(false);
    setProfileOpen(false);
    setFavoritesOpen(false);
    setArtVaultDashboardOpen(false);
    setAssignMode(false);

    if (assignment.targetRoute.startsWith("world:")) {
      setSelectedEntry(null);
      setSelectedReferenceKeyword("");
      setActiveView("world");
    } else if (assignment.targetRoute.startsWith("character:")) {
      const entry = database.entries.find((candidate) => candidate.id === assignment.entryId);
      if (entry) {
        setSelectedEntry(entry);
        setSelectedReferenceKeyword("");
        setActiveView("characters");
      }
    } else if (assignment.targetRoute.startsWith("bestiary:")) {
      setSelectedEntry(null);
      setSelectedBestiaryCreatureId(assignment.entryId);
      setActiveView("bestiary");
    } else if (assignment.targetRoute.startsWith("art-binder:")) {
      const [, rawKind, subjectId, encodedCategory] = assignment.targetRoute.split(":");
      const kind = normalizeArtBinderKind(rawKind);
      setSelectedEntry(null);
      setSelectedReferenceKeyword("");
      setSelectedBestiaryCreatureId("");
      setArtBinderFilter({
        kind,
        subjectId: subjectId || assignment.entryId,
        category: encodedCategory ? decodeURIComponent(encodedCategory) : undefined
      });
      setArtVaultDashboardOpen(true);
    }

    window.setTimeout(() => scrollToAssignmentModule(assignment.moduleId), 350);
    window.setTimeout(() => scrollToAssignmentModule(assignment.moduleId), 900);
  };

  const upsertCreature = (creature: BestiaryCreature) => {
    if (readOnly) return;
    const normalized = normalizeBestiaryCreature({ ...creature, updatedAt: new Date().toISOString() });
    setDatabase((current) => ({
      ...current,
      bestiary: (current.bestiary || []).some((item) => item.id === normalized.id)
        ? (current.bestiary || []).map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...(current.bestiary || [])]
    }));
  };

  const deleteCreature = (creatureId: string) => {
    if (readOnly) return;
    setDatabase((current) => ({
      ...current,
      bestiary: (current.bestiary || []).filter((creature) => creature.id !== creatureId)
    }));
  };

  const upsertBestiaryCategoryArtVault = (vault: BestiaryCategoryArtVault) => {
    if (readOnly) return;
    const normalized = normalizeBestiaryCategoryArtVault({ ...vault, updatedAt: new Date().toISOString() }, vault.categoryName, database.bestiary || []);
    setDatabase((current) => ({
      ...current,
      bestiaryCategoryVaults: (current.bestiaryCategoryVaults || []).some((item) => item.id === normalized.id)
        ? (current.bestiaryCategoryVaults || []).map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...(current.bestiaryCategoryVaults || [])]
    }));
  };

  const updateWorldBuilding = (worldBuilding: LoreDatabase["worldBuilding"]) => {
    if (readOnly) return;
    setDatabase((current) => ({ ...current, worldBuilding }));
  };

  const openBestiaryCreature = (creature: BestiaryCreature) => {
    setDetailReturnTarget(captureDetailReturnTarget());
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setSelectedBestiaryCreatureId(creature.id);
    setActiveView("bestiary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openScribeChangedTarget = (target: AssistantChangedTarget) => {
    setDetailReturnTarget(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setFavoritesOpen(false);
    setQuestDashboardOpen(false);
    setProfileOpen(false);
    setArtVaultDashboardOpen(false);
    setArtBinderFilter(null);
    setFocusedAssignment(null);

    if (target.kind === "view" && target.view) {
      setSelectedEntry(null);
      setSelectedBestiaryCreatureId("");
      setWorldBuildingFocus(null);
      setActiveView(target.view);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (target.kind === "entry" && target.entryId) {
      const entry = database.entries.find((candidate) => candidate.id === target.entryId);
      if (entry) {
        setSelectedEntry(entry);
        setActiveView(categoryToView(entry.category));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (target.kind === "creature" && target.creatureId) {
      setSelectedEntry(null);
      setSelectedBestiaryCreatureId(target.creatureId);
      setActiveView("bestiary");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (target.kind === "worldEntry" && target.worldCategory && target.worldEntryId) {
      setSelectedEntry(null);
      setSelectedBestiaryCreatureId("");
      setActiveView("world");
      setWorldBuildingFocus({
        category: target.worldCategory as WorldBuildingFocusTarget["category"],
        entryId: target.worldEntryId,
        nonce: Date.now()
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (target.kind === "bestiaryCategory") {
      setSelectedEntry(null);
      setSelectedBestiaryCreatureId("");
      setActiveView("bestiary");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSelectedEntry(null);
    setSelectedBestiaryCreatureId("");
    setActiveView("search");
  };

  const openArtBinder = (filter: ArtBinderInitialFilter | null = null) => {
    if (readOnly) return;
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setFavoritesOpen(false);
    setQuestDashboardOpen(false);
    setProfileOpen(false);
    setArtBinderFilter(filter);
    setArtVaultDashboardOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const signOut = () => {
    clearGoogleAccount();
    disableGoogleAutoSelect();
    setCurrentUser(null);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setQuestDashboardOpen(false);
    setProfileOpen(false);
    setFocusedAssignment(null);
  };

  const refreshCurrentUserAccess = () => {
    if (!currentUser) return;
    const access = getGoogleUserAccess(currentUser.email);
    if (!access) {
      signOut();
      return;
    }
    setCurrentUser({ ...currentUser, role: access.role });
  };

  useEffect(() => {
    const openSpriteAnimator = () => {
      setDetailReturnTarget(null);
      setSelectedEntry(null);
      setSelectedReferenceKeyword("");
      setKeywordPopup("");
      setArtVaultDashboardOpen(false);
      setArtBinderFilter(null);
      setFavoritesOpen(false);
      setQuestDashboardOpen(false);
      setProfileOpen(false);
      setSelectedBestiaryCreatureId("");
      setActiveView("spriteAnimator");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("tavern:open-sprite-animator", openSpriteAnimator);
    return () => window.removeEventListener("tavern:open-sprite-animator", openSpriteAnimator);
  }, []);
  const themeClassName = theme === "dream" ? "theme-dream" : "theme-light";

  if (!currentUser) {
    return (
      <div className={themeClassName}>
        <AccessGate onSignIn={setCurrentUser} />
      </div>
    );
  }

  return (
    <div className={themeClassName}>
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
          storageWarning={storageWarning}
          currentUser={currentUser}
          onSignOut={signOut}
          onOpenProfile={openProfile}
          onOpenTavernScribe={() => setTavernScribeOpen(true)}
          onOpenQuestDashboard={openQuestDashboard}
          questCount={currentQuestCount}
          canAccessSettings={canAccessSettings}
        />

        <main className="min-w-0 flex-1">
          <AssignmentProvider
            assignMode={assignMode}
            assignments={assignments}
            currentUser={currentUser}
            teamMembers={teamMembers}
            questCategories={questCategories}
            focusedAssignment={focusedAssignment}
            onAssignmentsChange={setAssignments}
            onOpenQuestDashboard={openQuestDashboard}
          >
          <div className={assignMode ? "assign-mode" : ""}>
          <TopBar
            theme={theme}
            searchQuery={searchQuery}
            artVaultProgress={!readOnly ? artVaultProgress : undefined}
            onThemeChange={setTheme}
            onSearchQueryChange={setSearchQuery}
            onSubmitSearch={submitSearch}
            onCreateEntry={createEntry}
            onOpenArtVaultDashboard={!readOnly ? () => {
              openArtBinder(null);
            } : undefined}
            onOpenFavorites={openFavorites}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            readOnly={readOnly}
            favoritesCount={favorites.length}
            favoritesOpen={favoritesOpen}
            assignMode={assignMode}
            onToggleAssignMode={!readOnly ? () => setAssignMode((value) => !value) : undefined}
          />

          {profileOpen ? (
            <ProfilePage
              currentUser={currentUser}
              teamMembers={teamMembers}
              profiles={userProfiles}
              onTeamMembersChange={setTeamMembers}
              onProfilesChange={setUserProfiles}
              onOpenQuestDashboard={openQuestDashboard}
              onBack={() => setProfileOpen(false)}
            />
          ) : questDashboardOpen ? (
            <QuestDashboard
              currentUser={currentUser}
              assignments={assignments}
              teamMembers={teamMembers}
              questCategories={questCategories}
              onAssignmentsChange={setAssignments}
              onQuestCategoriesChange={setQuestCategories}
              onOpenAssignment={openQuestAssignment}
              onBack={() => setQuestDashboardOpen(false)}
            />
          ) : favoritesOpen ? (
            <FavoritesPage
              database={database}
              favorites={favorites}
              onOpenEntry={openEntry}
              onOpenCreature={openFavoriteCreature}
              onToggleFavorite={toggleFavoriteById}
            />
          ) : artVaultDashboardOpen && !readOnly ? (
            <ArtVaultDashboard
              database={database}
              readOnly={readOnly}
              onDatabaseChange={updateDatabase}
              onNavigate={navigate}
              onOpenEntry={openEntry}
              initialBinderFilter={artBinderFilter}
              onClearBinderFilter={() => setArtBinderFilter(null)}
            />
          ) : selectedCharacterEntry ? (
            <CharacterDetailPage
              entry={selectedCharacterEntry}
              characterEntries={database.entries.filter(isCharacterEntry)}
              readOnly={readOnly}
              referenceKeyword={selectedReferenceKeyword}
              onBack={closeCharacterDetailPage}
              onGoToCharacters={goToCharactersPage}
              onViewReferences={openAllReferences}
              onSave={upsertEntry}
              onDelete={deleteEntry}
              currentUser={currentUser}
              isFavorite={isEntryFavorite(selectedCharacterEntry)}
              onToggleFavorite={() => toggleFavoriteById("entry", selectedCharacterEntry.id)}
              focusedAssignment={focusedAssignment}
              onOpenArtBinder={!readOnly ? () => openArtBinder({ kind: "character", subjectId: selectedCharacterEntry.id }) : undefined}
            />
          ) : (
            <>
              {activeView === "dashboard" && (
                <Dashboard database={database} onNavigate={navigate} onOpenEntry={openEntry} />
              )}

              {activeView === "spriteAnimator" && (
                <SpriteSheetAnimatorPage readOnly={readOnly} />
              )}

              {activeView === "storyJourney" && (
                <StoryJourneyPage
                  entries={database.entries}
                  bestiary={database.bestiary || []}
                  readOnly={readOnly}
                  onOpenEntry={openEntry}
                  onOpenCreature={openBestiaryCreature}
                />
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
                    setArtVaultDashboardOpen(false);
                    setFavoritesOpen(false);
                    setActiveView("dashboard");
                  }}
                  onOpenEntry={openEntry}
                  isFavorite={isEntryFavorite}
                  onToggleFavorite={(entry) => toggleFavoriteById("entry", entry.id)}
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
                  currentUser={currentUser}
                  onAccessUsersChange={refreshCurrentUserAccess}
                />
              )}

              {activeView === "bestiary" && (
                <BestiaryPage
                  creatures={database.bestiary || []}
                  categoryArtVaults={database.bestiaryCategoryVaults || []}
                  readOnly={readOnly}
                  onSaveCreature={upsertCreature}
                  onDeleteCreature={deleteCreature}
                  onSaveCategoryArtVault={upsertBestiaryCategoryArtVault}
                  currentUser={currentUser}
                  selectedCreatureId={selectedBestiaryCreatureId}
                  isCreatureFavorite={isCreatureFavorite}
                  onToggleCreatureFavorite={(creature) => toggleFavoriteById("creature", creature.id)}
                  focusedAssignment={focusedAssignment}
                  onBackToPrevious={detailReturnTarget ? closeCharacterDetailPage : undefined}
                  onGoToBestiary={detailReturnTarget ? goToBestiaryPage : undefined}
                  onOpenArtBinder={!readOnly ? (filter) => openArtBinder(filter) : undefined}
                />
              )}

              {(activeView === "ingredients" || activeView === "recipes") && (
                <PantryPage
                  entries={database.entries}
                  bestiary={database.bestiary || []}
                  initialTab={activeView === "recipes" ? "meals" : "pantry"}
                  readOnly={readOnly}
                  onOpenEntry={openEntry}
                  onOpenCreature={openBestiaryCreature}
                  onSaveEntry={(entry) => upsertEntry(entry, { openDetail: false })}
                />
              )}

              {activeView === "world" && (
                <WorldBuildingPage
                  worldBuilding={database.worldBuilding}
                  loreEntries={database.entries}
                  bestiary={database.bestiary || []}
                  readOnly={readOnly}
                  onWorldBuildingChange={updateWorldBuilding}
                  onOpenEntry={openEntry}
                  onOpenCreature={openBestiaryCreature}
                  focusedAssignment={focusedAssignment}
                  focusTarget={worldBuildingFocus}
                />
              )}

              {!["dashboard", "storyJourney", "spriteAnimator", "search", "timeline", "secrets", "settings", "bestiary", "world", "ingredients", "recipes"].includes(activeView) && (
                <HubPage
                  view={activeConfig}
                  entries={viewEntries}
                  readOnly={readOnly}
                  onNavigate={navigate}
                  onOpenEntry={openEntry}
                  onSaveEntry={upsertEntry}
                  isFavorite={isEntryFavorite}
                  onToggleFavorite={(entry) => toggleFavoriteById("entry", entry.id)}
                />
              )}
            </>
          )}

          </div>
          </AssignmentProvider>
        </main>

        {!readOnly && (
          <AssistantPanel
            database={database}
            onDatabaseChange={updateDatabase}
            open={tavernScribeOpen}
            onOpenChange={setTavernScribeOpen}
            showLauncher={false}
            onOpenChangedTarget={openScribeChangedTarget}
          />
        )}

        {selectedEntry && !selectedCharacterEntry && (
          <EntryModal
            entry={selectedEntry}
            readOnly={readOnly}
            referenceKeyword={selectedReferenceKeyword}
            onClose={() => setSelectedEntry(null)}
            onViewReferences={openAllReferences}
            onSave={upsertEntry}
            onDuplicate={duplicateEntry}
            onDelete={deleteEntry}
            currentUser={currentUser}
            isFavorite={isEntryFavorite(selectedEntry)}
            onToggleFavorite={() => toggleFavoriteById("entry", selectedEntry.id)}
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

function isCharacterEntry(entry: LoreEntry) {
  return /character/i.test(entry.category) || /character/i.test(entry.type);
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

function categoryToView(category: string): ActiveView {
  if (category === "Characters") return "characters";
  if (category === "Enemies & Creatures") return "bestiary";
  if (category === "Food & Inventory") return "ingredients";
  if (category === "Marketing") return "marketing";
  return allViews.find((item) => item.category === category)?.id || "search";
}

function normalizeArtBinderKind(value: string): ArtBinderKind {
  if (value === "character" || value === "bestiary" || value === "environment") return value;
  return "all";
}

function scrollToAssignmentModule(moduleId: string) {
  const selector = `[data-module-id="${CSS.escape(moduleId)}"]`;
  const element = document.querySelector(selector);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.classList.add("assignment-open-flash");
  window.setTimeout(() => element.classList.remove("assignment-open-flash"), 1800);
}


