import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  sanitizeDatabaseForPersistence,
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
import { Icon } from "./components/Icon";
import { PantryPage } from "./components/PantryPage";
import { ProfilePage } from "./components/ProfilePage";
import { QuestDashboard } from "./components/QuestDashboard";
import { SearchResults } from "./components/SearchResults";
import { SecretsView } from "./components/SecretsView";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { StoryPage } from "./components/StoryPage";
import { StoryJourneyPage } from "./components/StoryJourneyPage";
import { SpriteSheetAnimatorPage } from "./components/SpriteSheetAnimatorPage";
import { SyncPublishModal } from "./components/SyncPublishModal";
import { TimelineView } from "./components/TimelineView";
import { TopBar } from "./components/TopBar";
import { WorldBuildingPage } from "./components/WorldBuildingPage";
import { RealtimeCollaborationContext, realtimeTargetKey } from "./components/RealtimeCollaborationContext";
import { RealtimeRoomBridge, type RealtimeDatabaseResetter, type RealtimePresenceUpdater, type RealtimePublisher } from "./components/RealtimeRoomBridge";
import { buildLoreKeywords, LoreKeywordProvider } from "./components/LoreKeywordText";
import { buildArtVaultDashboardStats } from "./utils/artVaultDashboard";
import {
  clearGoogleAccount,
  disableGoogleAutoSelect,
  getGoogleUserAccess,
  loadGoogleAccount,
  loadGoogleCredential,
  roleCanAccessSettings,
  roleCanEdit,
  saveAccessUsers,
  saveGoogleAccount
} from "./utils/accessControl";
import { loadAppSyncSettings, normalizeAppSyncSettings, saveAppSyncSettings } from "./utils/appSettings";
import {
  databaseSyncHash,
  fetchCloudHealth,
  fetchPublishedDatabase,
  fetchRemoteAppSettings,
  fetchUserDraft,
  loadPublishedSyncState,
  savePublishedDatabase,
  savePublishedSyncState,
  saveRemoteAppSettings,
  saveUserDraft
} from "./utils/cloudSync";
import { isDesktopBrowserAuthRequest } from "./utils/desktopShell";
import { isFavorite as favoriteIncludes, loadFavorites, saveFavorites, toggleFavorite } from "./utils/favorites";
import { listenForLauncherProgressRequests, listenForLauncherSession } from "./utils/launcherBridge";
import {
  applySelectedPublishChanges,
  buildPublishChanges,
  type PublishChange,
  type PublishChangeKind
} from "./utils/publishDiff";
import type { RealtimeTarget, RealtimeUserSummary } from "./utils/realtimeCollaboration";
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

interface CloudSyncUiState {
  phase: "idle" | "loading" | "saving" | "saved" | "publishing" | "offline" | "needsAuth";
  message: string;
  lastSavedAt: string;
  configured: boolean;
}

interface IncomingSyncConflict extends Pick<PublishChange, "kind" | "title" | "moduleLabel" | "summary" | "entryId" | "creatureId" | "vaultId" | "worldCategory" | "worldEntryId"> {
  id: string;
}

interface SyncConflictReview {
  conflicts: IncomingSyncConflict[];
  teamDatabase: LoreDatabase;
  teamUpdatedAt: string;
}

interface AdminBaselineReview {
  localDatabase: LoreDatabase;
  teamDatabase: LoreDatabase;
  teamUpdatedAt: string;
}

const EXPLICIT_REMOVALS_KEY = "tavern-cook-book:explicit-removals";
const PENDING_TEAM_CHANGE_KEY = "tavern-cook-book:pending-team-change";
const LIVE_TEAM_SYNC = true;
const REALTIME_DATABASE_SYNC = false;
const LIVE_SYNC_AUTOSAVE_DELAY_MS = 250;
const LIVE_SYNC_POLL_MS = 1200;
const LIVE_BACKUP_SAVE_DELAY_MS = 12_000;
const PENDING_TEAM_CHANGE_MAX_AGE_MS = 60_000;

function buildWorkshopProgress(database: LoreDatabase, currentUser: GoogleAccountUser) {
  const totalEntries = database.entries.length + database.bestiary.length;
  const completedEntries =
    database.entries.filter((entry) => ["Canon", "Soft Canon", "Playtest Scope"].includes(entry.status)).length +
    database.bestiary.length;
  const total = Math.max(totalEntries, 1);
  return {
    percent: Math.round((completedEntries / total) * 100),
    label: currentUser.role === "admin" ? "Team cook book completion" : "Your cook book workspace",
    completed: completedEntries,
    total,
    source: currentUser.role === "admin" ? "Tavern Cook Book team sync" : currentUser.email
  };
}

export default function App() {
  const hostedViewer = import.meta.env.VITE_READONLY_VIEWER === "true";
  const forcedReadOnly =
    hostedViewer || new URLSearchParams(window.location.search).get("readonly") === "1";
  const [currentUser, setCurrentUser] = useState<GoogleAccountUser | null>(() => loadGoogleAccount());
  const initialLocalDatabaseRef = useRef<LoreDatabase | null>(null);
  if (!initialLocalDatabaseRef.current) {
    initialLocalDatabaseRef.current = hostedViewer ? createStarterDatabase() : loadDatabase();
  }
  const [database, setLocalDatabase] = useState<LoreDatabase>(() =>
    hostedViewer || currentUser ? createStarterDatabase() : initialLocalDatabaseRef.current || loadDatabase()
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
  const [publishedDatabase, setPublishedDatabase] = useState<LoreDatabase>(() => createStarterDatabase());
  const [publishedReady, setPublishedReady] = useState(false);
  const [hasCloudCredential, setHasCloudCredential] = useState(() => Boolean(loadGoogleCredential()));
  const [teamSaveSignal, setTeamSaveSignal] = useState(0);
  const [appSyncSettings, setAppSyncSettings] = useState(() => loadAppSyncSettings());
  const [cloudSync, setCloudSync] = useState<CloudSyncUiState>({
    phase: "idle",
    message: "Cloud sync is waiting for sign-in.",
    lastSavedAt: "",
    configured: false
  });
  const [pushReviewOpen, setPushReviewOpen] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [pullingLatest, setPullingLatest] = useState(false);
  const [syncConflictReview, setSyncConflictReview] = useState<SyncConflictReview | null>(null);
  const [adminBaselineReview, setAdminBaselineReview] = useState<AdminBaselineReview | null>(null);
  const [adminBaselineSaving, setAdminBaselineSaving] = useState(false);
  const [explicitRemovalIds, setExplicitRemovalIds] = useState<string[]>(() => loadExplicitRemovalIds());
  const [realtimeUsers, setRealtimeUsers] = useState<RealtimeUserSummary[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState("initial");
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const databaseRef = useRef(database);
  const realtimeBaseDatabaseRef = useRef(database);
  const realtimeLastPublishedHashRef = useRef(databaseSyncHash(database));
  const realtimePublishTimerRef = useRef<number | null>(null);
  const liveBackupTimerRef = useRef<number | null>(null);
  const lastLiveBackupHashRef = useRef("");
  const realtimePublisherRef = useRef<RealtimePublisher | null>(null);
  const realtimeResetterRef = useRef<RealtimeDatabaseResetter | null>(null);
  const realtimePresenceUpdaterRef = useRef<RealtimePresenceUpdater | null>(null);
  const realtimeRemoteLoadRef = useRef(false);
  const remoteLoadRef = useRef(false);
  const skipNextLocalDatabaseSaveRef = useRef(false);
  const adminBaselinePromptedRef = useRef(false);
  const lastDraftHashRef = useRef("");
  const lastPublishedHashRef = useRef("");
  const lastPublishedDatabaseRef = useRef<LoreDatabase>(createStarterDatabase());
  const lastDraftUpdatedAtRef = useRef("");
  const pendingTeamChangeHashRef = useRef(getFreshPendingTeamChange().hash);
  const syncSettingsSaveTimerRef = useRef<number | null>(null);
  const currentRole = currentUser?.role || "viewer";
  const canEdit = roleCanEdit(currentRole);
  const canAccessSettings = roleCanAccessSettings(currentRole);
  const canWriteTeamDatabase = LIVE_TEAM_SYNC && canAccessSettings;
  const usesWorkingCopy = LIVE_TEAM_SYNC && Boolean(currentUser && !hostedViewer && canEdit && !canAccessSettings);
  const realtimeActive = Boolean(currentUser && !hostedViewer && realtimeReady);
  const teamDataReady = publishedReady;
  const cloudCredentialRequired = Boolean(LIVE_TEAM_SYNC && currentUser && !hostedViewer && !hasCloudCredential);
  const readOnly = forcedReadOnly || !canEdit || Boolean(currentUser && !hostedViewer && (!teamDataReady || cloudCredentialRequired));
  const setDatabase = useCallback((
    nextValue: LoreDatabase | ((current: LoreDatabase) => LoreDatabase),
    options: { source?: "local" | "remote" } = {}
  ) => {
    const previous = databaseRef.current;
    const next = typeof nextValue === "function"
      ? (nextValue as (current: LoreDatabase) => LoreDatabase)(previous)
      : nextValue;

    databaseRef.current = next;
    setLocalDatabase(next);
    if (options.source === "remote") return;
    if (canWriteTeamDatabase && currentUser && !hostedViewer && !readOnly) {
      const pending = savePendingTeamChange(next);
      pendingTeamChangeHashRef.current = pending.hash;
      setTeamSaveSignal((value) => value + 1);
    }
  }, [canWriteTeamDatabase, currentUser?.email, hostedViewer, readOnly]);
  useEffect(() => {
    databaseRef.current = database;
  }, [database]);

  useEffect(() => {
    return () => {
      if (realtimePublishTimerRef.current) {
        window.clearTimeout(realtimePublishTimerRef.current);
        realtimePublishTimerRef.current = null;
      }
      if (liveBackupTimerRef.current) {
        window.clearTimeout(liveBackupTimerRef.current);
        liveBackupTimerRef.current = null;
      }
    };
  }, []);

  const scheduleLiveBackup = useCallback((nextHash: string) => {
    if (!LIVE_TEAM_SYNC || !currentUser || hostedViewer) return;
    if (nextHash === lastLiveBackupHashRef.current) return;
    if (liveBackupTimerRef.current) {
      window.clearTimeout(liveBackupTimerRef.current);
    }

    liveBackupTimerRef.current = window.setTimeout(() => {
      liveBackupTimerRef.current = null;
      const databaseToBackUp = databaseRef.current;
      const backupHash = databaseSyncHash(databaseToBackUp);
      if (backupHash === lastLiveBackupHashRef.current) return;

      void savePublishedDatabase(currentUser.email, databaseToBackUp)
        .then((result) => {
          const envelope = result.envelope;
          if (!result.ok || !envelope?.payload.database) {
            if (result.error?.includes("sign-in token")) {
              setHasCloudCredential(false);
            }
            setCloudSync((current) => ({
              ...current,
              message: result.error
                ? `Live editing is working, but the GitHub backup failed: ${result.error}`
                : "Live editing is working, but the GitHub backup failed.",
              configured: result.configured
            }));
            return;
          }

          const savedDatabase = envelope.payload.database;
          const savedHash = databaseSyncHash(savedDatabase);
          lastLiveBackupHashRef.current = savedHash;
          setPublishedDatabase(savedDatabase);
          setPublishedReady(true);
          lastPublishedDatabaseRef.current = savedDatabase;
          lastPublishedHashRef.current = savedHash;
          savePublishedSyncState(savedDatabase, envelope.updatedAt);
          setCloudSync((current) => ({
            ...current,
            phase: "saved",
            message: "Live team changes shared and backed up.",
            lastSavedAt: envelope.updatedAt,
            configured: true
          }));
        })
        .catch((error) => {
          setCloudSync((current) => ({
            ...current,
            message: error instanceof Error
              ? `Live editing is working, but the GitHub backup failed: ${error.message}`
              : "Live editing is working, but the GitHub backup failed.",
            configured: true
          }));
        });
    }, LIVE_BACKUP_SAVE_DELAY_MS);
  }, [currentUser?.email, hostedViewer]);

  useEffect(() => {
    if (!currentUser || hostedViewer) return;
    if (realtimeStatus === "disconnected" || realtimeStatus.startsWith("failed")) {
      setCloudSync((current) => ({
        ...current,
        phase: "offline",
        message: realtimeStatus.startsWith("failed:")
          ? realtimeStatus.slice("failed:".length)
          : "Realtime collaboration is not connected. Add LIVEBLOCKS_SECRET_KEY in Vercel to enable instant team editing.",
        configured: current.configured
      }));
    }
  }, [currentUser, hostedViewer, realtimeStatus]);
  const hiddenViewIds = useMemo(
    () => canAccessSettings ? [] : expandHiddenViewIds(appSyncSettings.visibility.hiddenForMembers),
    [appSyncSettings.visibility.hiddenForMembers, canAccessSettings]
  );
  const explicitRemovalSet = useMemo(() => new Set(explicitRemovalIds), [explicitRemovalIds]);
  const publishChanges = useMemo(
    () => LIVE_TEAM_SYNC
      ? []
      : buildPublishChanges(database, publishedDatabase).filter((change) =>
        change.action !== "removed" || explicitRemovalSet.has(change.id)
      ),
    [database, publishedDatabase, explicitRemovalSet]
  );
  const pendingPublishCount = publishChanges.length;

  useEffect(() => {
    if (!readOnly) {
      if (skipNextLocalDatabaseSaveRef.current) {
        skipNextLocalDatabaseSaveRef.current = false;
        return;
      }
      const result = saveDatabase(database);
      setStorageWarning(result.ok ? "" : result.message || "The app could not save this change.");
      if (usesWorkingCopy) {
        setCloudSync((current) => ({
          ...current,
          phase: result.ok ? "saved" : "offline",
          message: result.ok
            ? "Working copy saved in this browser from the admin version."
            : result.message || "The app could not save this working copy.",
          lastSavedAt: result.ok ? new Date().toISOString() : current.lastSavedAt,
          configured: true
        }));
      }
    }
  }, [database, readOnly, usesWorkingCopy]);

  useEffect(() => {
    if (!publishedReady) return;
    if (!currentUser || readOnly || hostedViewer || remoteLoadRef.current || realtimeRemoteLoadRef.current) return;
    if (LIVE_TEAM_SYNC && !canAccessSettings) return;
    if (LIVE_TEAM_SYNC && !hasCloudCredential) {
      setCloudSync((current) => ({
        ...current,
        phase: "needsAuth",
        message: "Google sync token is missing or expired. Sign in again before editing."
      }));
      return;
    }
    const pendingDatabase = databaseRef.current;
    const nextHash = databaseSyncHash(pendingDatabase);
    if (nextHash === lastDraftHashRef.current && nextHash !== pendingTeamChangeHashRef.current) return;
    if (LIVE_TEAM_SYNC) {
      const pending = savePendingTeamChange(pendingDatabase);
      pendingTeamChangeHashRef.current = pending.hash;
    }

    setCloudSync((current) => ({
      ...current,
      phase: "saving",
      message: LIVE_TEAM_SYNC ? "Saving live team changes..." : "Autosaving your private draft..."
    }));

    const timer = window.setTimeout(() => {
      const databaseToSave = databaseRef.current;
      const databaseToSaveHash = databaseSyncHash(databaseToSave);
      const save = LIVE_TEAM_SYNC
        ? savePublishedDatabase(currentUser.email, databaseToSave)
        : saveUserDraft(currentUser.email, databaseToSave);

      void save
        .then((result) => {
          if (!result.ok || !result.envelope) {
            if (result.error?.includes("sign-in token")) {
              setHasCloudCredential(false);
            }
            setCloudSync({
              phase: result.error?.includes("sign-in token") ? "needsAuth" : "offline",
              message: result.error || "Live sync failed. Local browser save is still active.",
              lastSavedAt: "",
              configured: result.configured
            });
            return;
          }
          const savedDatabase = result.envelope.payload.database;
          const savedHash = databaseSyncHash(savedDatabase);
          if (LIVE_TEAM_SYNC && canAccessSettings) {
            setPublishedDatabase(savedDatabase);
            setPublishedReady(true);
            lastPublishedDatabaseRef.current = savedDatabase;
            lastPublishedHashRef.current = savedHash;
            savePublishedSyncState(savedDatabase, result.envelope.updatedAt);
            if (pendingTeamChangeHashRef.current === savedHash || pendingTeamChangeHashRef.current === databaseToSaveHash) {
              pendingTeamChangeHashRef.current = "";
              clearPendingTeamChange(databaseToSaveHash);
              clearPendingTeamChange(savedHash);
            }
          }
          lastDraftHashRef.current = savedHash;
          lastDraftUpdatedAtRef.current = result.envelope.updatedAt;
          setCloudSync({
            phase: "saved",
            message: LIVE_TEAM_SYNC ? "Live team changes saved." : "Private draft saved to your account.",
            lastSavedAt: result.envelope.updatedAt,
            configured: true
          });
        })
        .catch((error) => {
          setCloudSync({
            phase: "offline",
            message: error instanceof Error ? error.message : "Live sync failed. Local browser save is still active.",
            lastSavedAt: "",
            configured: true
          });
        });
    }, LIVE_SYNC_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [database, teamSaveSignal, currentUser?.email, readOnly, hostedViewer, publishedReady, realtimeActive, hasCloudCredential, canAccessSettings]);

  useEffect(() => {
    if (!LIVE_TEAM_SYNC) return;
    if (!REALTIME_DATABASE_SYNC) return;
    if (!publishedReady || !realtimeActive) return;
    if (!currentUser || readOnly || hostedViewer) return;
    if (remoteLoadRef.current || realtimeRemoteLoadRef.current) return;
    const publisher = realtimePublisherRef.current;
    if (!publisher) return;

    const nextHash = databaseSyncHash(database);
    if (nextHash === realtimeLastPublishedHashRef.current) return;
    if (realtimePublishTimerRef.current) {
      window.clearTimeout(realtimePublishTimerRef.current);
    }

    setCloudSync((current) => ({
      ...current,
      phase: "saving",
      message: "Sharing live team changes..."
    }));

    realtimePublishTimerRef.current = window.setTimeout(() => {
      realtimePublishTimerRef.current = null;
      if (remoteLoadRef.current || realtimeRemoteLoadRef.current) return;
      const latestDatabase = databaseRef.current;
      const latestHash = databaseSyncHash(latestDatabase);
      if (latestHash === realtimeLastPublishedHashRef.current) return;

      try {
        publisher(realtimeBaseDatabaseRef.current, latestDatabase);
        realtimeBaseDatabaseRef.current = latestDatabase;
        realtimeLastPublishedHashRef.current = latestHash;
        lastDraftHashRef.current = latestHash;
        setPublishedDatabase(latestDatabase);
        lastPublishedDatabaseRef.current = latestDatabase;
        setCloudSync((current) => ({
          ...current,
          phase: "saved",
          message: "Live team changes shared.",
          lastSavedAt: new Date().toISOString(),
          configured: true
        }));
        scheduleLiveBackup(latestHash);
      } catch (error) {
        setCloudSync((current) => ({
          ...current,
          phase: "offline",
          message: error instanceof Error ? error.message : "Realtime save failed. Local browser save is still active.",
          configured: true
        }));
      }
    }, LIVE_SYNC_AUTOSAVE_DELAY_MS);

    return () => {
      if (realtimePublishTimerRef.current) {
        window.clearTimeout(realtimePublishTimerRef.current);
        realtimePublishTimerRef.current = null;
      }
    };
  }, [database, currentUser?.email, readOnly, hostedViewer, publishedReady, realtimeActive, scheduleLiveBackup]);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    saveExplicitRemovalIds(explicitRemovalIds);
  }, [explicitRemovalIds]);

  useEffect(() => {
    if (LIVE_TEAM_SYNC) return;
    if (!currentUser || readOnly || hostedViewer) return;
    const interval = window.setInterval(() => {
      void fetchUserDraft(currentUser.email)
        .then((result) => {
          if (!result.ok || !result.envelope?.payload.database) return;
          const remoteUpdatedAt = result.envelope.updatedAt;
          if (!remoteUpdatedAt || remoteUpdatedAt <= lastDraftUpdatedAtRef.current) return;
          const remoteHash = databaseSyncHash(result.envelope.payload.database);
          const publishedState = loadPublishedSyncState();
          if (remoteHash === lastPublishedHashRef.current || remoteHash === publishedState.hash) return;
          const localHash = databaseSyncHash(database);
          if (localHash !== lastDraftHashRef.current) {
            setCloudSync((current) => ({
              ...current,
              message: "A newer account draft exists on another device. Push or reload when you finish this edit."
            }));
            return;
          }

          remoteLoadRef.current = true;
          setDatabase(result.envelope.payload.database, { source: "remote" });
          saveDatabase(result.envelope.payload.database);
          window.setTimeout(() => {
            remoteLoadRef.current = false;
          }, 0);
          lastDraftHashRef.current = remoteHash;
          lastDraftUpdatedAtRef.current = remoteUpdatedAt;
          setCloudSync({
            phase: "saved",
            message: "Loaded newer account draft from another device.",
            lastSavedAt: remoteUpdatedAt,
            configured: true
          });
        })
        .catch(() => {});
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [currentUser?.email, database, readOnly, hostedViewer]);

  useEffect(() => {
    if (!publishedReady) return;
    if (!currentUser || hostedViewer) return;
    const interval = window.setInterval(() => {
      void fetchPublishedDatabase()
        .then((result) => {
          if (!result.ok || !result.envelope?.payload.database) return;
          const remotePublished = result.envelope.payload.database;
          const remotePublishedHash = databaseSyncHash(remotePublished);
          if (remotePublishedHash === lastPublishedHashRef.current) return;

          if (LIVE_TEAM_SYNC) {
            const localHash = databaseSyncHash(databaseRef.current);
            const pendingTeamChange = getFreshPendingTeamChange();
            if (pendingTeamChangeHashRef.current && pendingTeamChangeHashRef.current !== pendingTeamChange.hash) {
              pendingTeamChangeHashRef.current = "";
            }
            const pendingHash = pendingTeamChange.hash;
            if (pendingHash && localHash === pendingHash) {
              setCloudSync((current) => ({
                ...current,
                message: "Saving your latest edit before loading team changes."
              }));
              return;
            }
            if (lastDraftUpdatedAtRef.current && !isSyncDateAfter(result.envelope.updatedAt, lastDraftUpdatedAtRef.current)) {
              return;
            }
            if (!readOnly && pendingHash && localHash !== lastDraftHashRef.current) {
              setCloudSync((current) => ({
                ...current,
                message: "New live team changes are waiting while your current edit saves."
              }));
              return;
            }

            remoteLoadRef.current = true;
            setDatabase(remotePublished, { source: "remote" });
            saveDatabase(remotePublished);
            window.setTimeout(() => {
              remoteLoadRef.current = false;
            }, 0);
            setPublishedDatabase(remotePublished);
            setPublishedReady(true);
            lastPublishedHashRef.current = remotePublishedHash;
            lastPublishedDatabaseRef.current = remotePublished;
            lastDraftHashRef.current = remotePublishedHash;
            lastDraftUpdatedAtRef.current = result.envelope.updatedAt;
            savePublishedSyncState(remotePublished, result.envelope.updatedAt);
            setCloudSync({
              phase: "saved",
              message: "Loaded live team changes.",
              lastSavedAt: result.envelope.updatedAt,
              configured: true
            });
            return;
          }

          const previousPublishedDatabase = lastPublishedDatabaseRef.current;
          const merge = readOnly
            ? { database: remotePublished, conflicts: [], appliedCount: 0, changed: true }
            : mergeIncomingTeamDatabase(databaseRef.current, previousPublishedDatabase, remotePublished, explicitRemovalSet);
          const mergedHash = databaseSyncHash(merge.database);
          setPublishedDatabase(remotePublished);
          setPublishedReady(true);
          lastPublishedHashRef.current = remotePublishedHash;
          lastPublishedDatabaseRef.current = remotePublished;

          remoteLoadRef.current = true;
          setDatabase(merge.database, { source: "remote" });
          saveDatabase(merge.database);
          window.setTimeout(() => {
            remoteLoadRef.current = false;
          }, 0);
          savePublishedSyncState(remotePublished, result.envelope.updatedAt);
          lastDraftHashRef.current = mergedHash;
          lastDraftUpdatedAtRef.current = latestSyncDate(lastDraftUpdatedAtRef.current, result.envelope.updatedAt);
          if (merge.conflicts.length) {
            setSyncConflictReview({
              conflicts: merge.conflicts,
              teamDatabase: remotePublished,
              teamUpdatedAt: result.envelope.updatedAt
            });
          }
          setCloudSync({
            phase: "saved",
            message: LIVE_TEAM_SYNC
              ? merge.conflicts.length
                ? `Admin version updated, but ${merge.conflicts.length} overlap ${merge.conflicts.length === 1 ? "needs" : "need"} your choice.`
                : merge.appliedCount
                  ? `Admin version updated. Kept your working copy and added ${merge.appliedCount} admin ${merge.appliedCount === 1 ? "change" : "changes"}.`
                  : "Admin version updated. Your working copy is still saved in this browser."
              : merge.conflicts.length
                ? `Loaded team changes, but ${merge.conflicts.length} overlap ${merge.conflicts.length === 1 ? "needs" : "need"} your choice.`
                : merge.appliedCount
                  ? `Loaded ${merge.appliedCount} latest team ${merge.appliedCount === 1 ? "change" : "changes"}.`
                  : "Loaded the latest team push.",
            lastSavedAt: result.envelope.updatedAt,
            configured: true
          });
          if (!LIVE_TEAM_SYNC && !readOnly && currentUser) {
            void saveUserDraft(currentUser.email, merge.database)
              .then((draftResult) => {
                if (!draftResult.ok || !draftResult.envelope?.payload.database) return;
                lastDraftHashRef.current = databaseSyncHash(draftResult.envelope.payload.database);
                lastDraftUpdatedAtRef.current = latestSyncDate(lastDraftUpdatedAtRef.current, draftResult.envelope.updatedAt);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }, LIVE_TEAM_SYNC ? LIVE_SYNC_POLL_MS : 15_000);

    return () => window.clearInterval(interval);
  }, [currentUser?.email, database, readOnly, hostedViewer, explicitRemovalSet, publishedReady, realtimeActive, canAccessSettings]);

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
    saveAppSyncSettings(appSyncSettings);
    if (!currentUser || !canAccessSettings || hostedViewer) return;
    if (syncSettingsSaveTimerRef.current) window.clearTimeout(syncSettingsSaveTimerRef.current);
    syncSettingsSaveTimerRef.current = window.setTimeout(() => {
      void saveRemoteAppSettings(currentUser.email, appSyncSettings).catch(() => {});
    }, 2500);

    return () => {
      if (syncSettingsSaveTimerRef.current) {
        window.clearTimeout(syncSettingsSaveTimerRef.current);
        syncSettingsSaveTimerRef.current = null;
      }
    };
  }, [appSyncSettings, currentUser?.email, canAccessSettings, hostedViewer]);

  useEffect(() => {
    if (!currentUser) {
      document.title = "STL Productionz";
      return;
    }
    document.title = readOnly ? "The Tavern Cook Book - Live View" : "The Tavern Cook Book";
  }, [currentUser, readOnly]);

  useEffect(() => {
    if (hostedViewer) return;
    return listenForLauncherSession((launcherUser) => {
      setHasCloudCredential(Boolean(loadGoogleCredential()));
      setCurrentUser((current) => {
        if (
          current?.email === launcherUser.email &&
          current?.role === launcherUser.role &&
          current?.name === launcherUser.name
        ) {
          return current;
        }
        return launcherUser;
      });
    });
  }, [hostedViewer]);

  useEffect(() => {
    if (!currentUser || hostedViewer) return;
    return listenForLauncherProgressRequests(() => buildWorkshopProgress(database, currentUser));
  }, [currentUser, database, hostedViewer]);

  useEffect(() => {
    if (!currentUser || hostedViewer) return;
    let cancelled = false;
    const localDatabase = initialLocalDatabaseRef.current || database;

    const loadRemoteState = async () => {
      setPublishedReady(false);
      if (!hasCloudCredential) {
        setCloudSync({
          phase: "needsAuth",
          message: "Google sync token is missing or expired. Sign in again before editing.",
          lastSavedAt: "",
          configured: true
        });
        return;
      }
      setCloudSync((current) => ({
        ...current,
        phase: "loading",
        message: "Checking cloud sync...",
        configured: current.configured
      }));

      const health = await fetchCloudHealth();
      if (cancelled) return;
      if (!health.configured) {
        setCloudSync({
          phase: "offline",
          message: health.error || "Cloud sync needs TAVERN_SYNC_GITHUB_TOKEN in Vercel.",
          lastSavedAt: "",
          configured: false
        });
        setPublishedReady(false);
        return;
      }

      const [settingsResult, publishedResult, draftResult] = await Promise.all([
        fetchRemoteAppSettings(),
        fetchPublishedDatabase(),
        !LIVE_TEAM_SYNC && canEdit ? fetchUserDraft(currentUser.email) : Promise.resolve(null)
      ]);
      if (cancelled) return;

      let effectiveCurrentUser = currentUser;
      let effectiveCanEdit = canEdit;
      let effectiveCanAccessSettings = canAccessSettings;
      if (settingsResult.ok && settingsResult.envelope?.payload) {
        const remoteSettings = normalizeAppSyncSettings(settingsResult.envelope.payload);
        saveAppSyncSettings(remoteSettings);
        saveAccessUsers(remoteSettings.accessUsers);
        setAppSyncSettings(remoteSettings);
        const currentEmail = currentUser.email.trim().toLowerCase();
        const access = remoteSettings.accessUsers.find((user) => user.email === currentEmail);
        if (access) {
          effectiveCurrentUser = { ...currentUser, role: access.role };
          effectiveCanEdit = roleCanEdit(access.role);
          effectiveCanAccessSettings = roleCanAccessSettings(access.role);
          if (access.role !== currentUser.role) {
            saveGoogleAccount(effectiveCurrentUser);
            setCurrentUser(effectiveCurrentUser);
          }
        }
      }

      const fetchedPublished = publishedResult.ok && publishedResult.envelope?.payload.database
        ? publishedResult.envelope.payload.database
        : createStarterDatabase();
      const publishedEnvelope = publishedResult.ok ? publishedResult.envelope : null;
      const remotePublished = publishedEnvelope ? fetchedPublished : localDatabase;
      const draftEnvelope = !LIVE_TEAM_SYNC && canEdit && draftResult?.ok ? draftResult.envelope : null;
      const remotePublishedHash = databaseSyncHash(remotePublished);
      const localDatabaseHash = databaseSyncHash(localDatabase);
      const adminTeamWriter = LIVE_TEAM_SYNC && effectiveCanAccessSettings;
      const localWorkingCopy = LIVE_TEAM_SYNC && effectiveCanEdit && !effectiveCanAccessSettings;
      const pendingTeamChange = adminTeamWriter ? getFreshPendingTeamChange() : { hash: "", updatedAt: "" };
      const shouldKeepPendingLocalChange =
        adminTeamWriter &&
        effectiveCanEdit &&
        Boolean(pendingTeamChange.hash) &&
        pendingTeamChange.hash === localDatabaseHash &&
        (!publishedEnvelope || isSyncDateAfter(pendingTeamChange.updatedAt, publishedEnvelope.updatedAt));
      const shouldReviewAdminBaseline =
        adminTeamWriter &&
        !shouldKeepPendingLocalChange &&
        !adminBaselinePromptedRef.current &&
        publishedEnvelope &&
        localDatabaseHash !== remotePublishedHash &&
        hasAdminLocalBaselineDifference(localDatabase, remotePublished);
      if (shouldReviewAdminBaseline) {
        adminBaselinePromptedRef.current = true;
        setAdminBaselineReview({
          localDatabase,
          teamDatabase: remotePublished,
          teamUpdatedAt: publishedEnvelope.updatedAt
        });
      }
      setPublishedDatabase(remotePublished);
      setPublishedReady(true);
      lastPublishedHashRef.current = remotePublishedHash;
      lastPublishedDatabaseRef.current = remotePublished;
      if (publishedEnvelope) {
        savePublishedSyncState(remotePublished, publishedEnvelope.updatedAt);
      }

      const draftDatabase = draftEnvelope?.payload.database || null;
      const draftHash = draftDatabase ? databaseSyncHash(draftDatabase) : "";
      const mergedDraft = draftDatabase && publishedEnvelope
        ? mergeDraftOntoPublished(draftDatabase, remotePublished, explicitRemovalSet)
        : null;
      const localWorkingMerge = localWorkingCopy && publishedEnvelope
        ? mergeDraftOntoPublished(localDatabase, remotePublished, explicitRemovalSet)
        : null;
      const chosenDatabase = adminTeamWriter
        ? (shouldKeepPendingLocalChange ? localDatabase : (publishedEnvelope ? remotePublished : localDatabase))
        : localWorkingCopy
          ? localWorkingMerge?.database || (publishedEnvelope ? remotePublished : localDatabase)
          : mergedDraft?.database || draftDatabase || (publishedEnvelope ? remotePublished : localDatabase);
      const chosenHash = databaseSyncHash(chosenDatabase);

      remoteLoadRef.current = true;
      if (shouldReviewAdminBaseline) {
        skipNextLocalDatabaseSaveRef.current = true;
      }
      setDatabase(chosenDatabase, { source: "remote" });
      if (!shouldReviewAdminBaseline) {
        saveDatabase(chosenDatabase);
      }
      window.setTimeout(() => {
        remoteLoadRef.current = false;
      }, 0);

      if (shouldKeepPendingLocalChange) {
        pendingTeamChangeHashRef.current = pendingTeamChange.hash;
      }
      lastDraftHashRef.current = shouldKeepPendingLocalChange ? remotePublishedHash : chosenHash;
      lastDraftUpdatedAtRef.current = adminTeamWriter || localWorkingCopy
        ? publishedEnvelope?.updatedAt || ""
        : latestSyncDate(publishedEnvelope?.updatedAt || "", draftEnvelope?.updatedAt || "");
      setCloudSync({
        phase: publishedEnvelope || draftEnvelope ? "saved" : "idle",
        message: adminTeamWriter
          ? shouldKeepPendingLocalChange
            ? "Loaded your latest browser edit and saving it to the team."
            : publishedEnvelope
            ? `Loaded live team database saved ${new Date(publishedEnvelope.updatedAt).toLocaleString()}.`
            : "Live sync is ready. Your next edit will save for the team."
          : localWorkingCopy
          ? localWorkingMerge?.privateCount
            ? `Loaded the admin version and kept ${localWorkingMerge.privateCount} local working ${localWorkingMerge.privateCount === 1 ? "change" : "changes"}.`
            : publishedEnvelope
              ? `Loaded the admin version saved ${new Date(publishedEnvelope.updatedAt).toLocaleString()}. Your edits save to this browser.`
              : "Working copy is ready. Your edits save to this browser."
          : mergedDraft?.privateCount
          ? `Loaded the latest team version and kept ${mergedDraft.privateCount} private ${mergedDraft.privateCount === 1 ? "change" : "changes"}.`
          : publishedEnvelope
            ? `Loaded latest team version saved ${new Date(publishedEnvelope.updatedAt).toLocaleString()}.`
            : draftEnvelope
              ? `Loaded private draft saved ${new Date(draftEnvelope.updatedAt).toLocaleString()}.`
              : "Cloud sync is ready. Your next edit will autosave.",
        lastSavedAt: adminTeamWriter || localWorkingCopy
          ? publishedEnvelope?.updatedAt || ""
          : latestSyncDate(publishedEnvelope?.updatedAt || "", draftEnvelope?.updatedAt || ""),
        configured: true
      });
      if (!LIVE_TEAM_SYNC && effectiveCanEdit && draftDatabase && chosenHash !== draftHash) {
        void saveUserDraft(effectiveCurrentUser.email, chosenDatabase)
          .then((draftResult) => {
            if (!draftResult.ok || !draftResult.envelope?.payload.database) return;
            lastDraftHashRef.current = databaseSyncHash(draftResult.envelope.payload.database);
            lastDraftUpdatedAtRef.current = latestSyncDate(lastDraftUpdatedAtRef.current, draftResult.envelope.updatedAt);
          })
          .catch(() => {});
      }
    };

    loadRemoteState().catch((error) => {
      if (cancelled) return;
      setPublishedReady(false);
      setCloudSync({
        phase: "offline",
        message: error instanceof Error ? error.message : "Cloud sync could not load.",
        lastSavedAt: "",
        configured: true
      });
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, currentUser?.role, hostedViewer, explicitRemovalSet, hasCloudCredential]);

  useEffect(() => {
    if (!readOnly || !artVaultDashboardOpen) return;
    setArtVaultDashboardOpen(false);
    setArtBinderFilter(null);
  }, [readOnly, artVaultDashboardOpen]);

  useEffect(() => {
    if (canAccessSettings) return;
    if (hiddenViewIds.includes(activeView)) {
      setActiveView("dashboard");
    }
  }, [activeView, hiddenViewIds, canAccessSettings]);

  useEffect(() => {
    if (!hostedViewer) return;

    fetch("./lore-data.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("No hosted lore data found.");
        return response.json();
      })
      .then((payload) => setDatabase(migrateDatabase(payload), { source: "remote" }))
      .catch(() => setDatabase(createStarterDatabase(), { source: "remote" }));
  }, [hostedViewer]);

  useEffect(() => {
    if (!selectedEntry) return;
    const latest = database.entries.find((entry) => entry.id === selectedEntry.id);
    setSelectedEntry(latest || null);
  }, [database.entries, selectedEntry]);

  useEffect(() => {
    if (hostedViewer) return;
    const handleStorage = (event: StorageEvent) => {
      if (!currentUser && event.key === DATABASE_KEY) {
        setDatabase(loadDatabase(), { source: "remote" });
      }
      if (event.key === THEME_KEY) {
        setTheme(loadTheme());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [currentUser, hostedViewer, setDatabase]);

  const handleRealtimeDatabase = useCallback((nextDatabase: LoreDatabase) => {
    if (!REALTIME_DATABASE_SYNC) return;
    const nextHash = databaseSyncHash(nextDatabase);
    const currentHash = databaseSyncHash(databaseRef.current);
    realtimeBaseDatabaseRef.current = nextDatabase;
    realtimeLastPublishedHashRef.current = nextHash;
    lastDraftHashRef.current = nextHash;
    lastPublishedDatabaseRef.current = nextDatabase;
    setPublishedDatabase(nextDatabase);

    if (nextHash === currentHash) return;

    realtimeRemoteLoadRef.current = true;
    remoteLoadRef.current = true;
    setDatabase(nextDatabase, { source: "remote" });
    const result = saveDatabase(nextDatabase);
    setStorageWarning(result.ok ? "" : result.message || "The app could not save the live team change locally.");
    window.setTimeout(() => {
      realtimeRemoteLoadRef.current = false;
      remoteLoadRef.current = false;
    }, 0);
    setCloudSync((current) => ({
      ...current,
      phase: "saved",
      message: "Live team change received.",
      lastSavedAt: new Date().toISOString(),
      configured: true
    }));
  }, [setDatabase]);

  const handleRealtimePublisherReady = useCallback((publisher: RealtimePublisher | null) => {
    realtimePublisherRef.current = publisher;
    setRealtimeReady(Boolean(publisher));
    if (publisher) {
      realtimeBaseDatabaseRef.current = databaseRef.current;
      realtimeLastPublishedHashRef.current = databaseSyncHash(databaseRef.current);
    }
    setCloudSync((current) => ({
      ...current,
      phase: publisher ? "saved" : current.phase,
      message: publisher ? "Team presence is live. Edits save through shared cloud sync." : current.message,
      configured: current.configured
    }));
  }, []);

  const handleRealtimeResetterReady = useCallback((resetter: RealtimeDatabaseResetter | null) => {
    realtimeResetterRef.current = resetter;
  }, []);

  useEffect(() => {
    if (publishedReady) return;
    setRealtimeReady(false);
    setRealtimeUsers([]);
  }, [publishedReady]);

  const handleRealtimePresenceUpdaterReady = useCallback((updater: RealtimePresenceUpdater | null) => {
    realtimePresenceUpdaterRef.current = updater;
  }, []);

  const setRealtimeHoverTarget = useCallback((target: RealtimeTarget | null) => {
    realtimePresenceUpdaterRef.current?.({ hovering: target });
  }, []);

  const usersHoveringTarget = useCallback((target: RealtimeTarget) => {
    const key = realtimeTargetKey(target);
    return realtimeUsers.filter((user) => user.hovering && realtimeTargetKey(user.hovering) === key);
  }, [realtimeUsers]);

  const realtimeContextValue = useMemo(() => ({
    enabled: realtimeReady,
    users: realtimeUsers,
    setHoverTarget: setRealtimeHoverTarget,
    usersHoveringTarget
  }), [realtimeReady, realtimeUsers, setRealtimeHoverTarget, usersHoveringTarget]);

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

  const useTeamBaselineHere = () => {
    setAdminBaselineReview(null);
    if (databaseRef.current) {
      initialLocalDatabaseRef.current = databaseRef.current;
    }
    const result = saveDatabase(databaseRef.current);
    setStorageWarning(result.ok ? "" : result.message || "The app could not save the team baseline locally.");
  };

  const centralizeAdminBaseline = async () => {
    if (!currentUser || currentUser.role !== "admin" || !adminBaselineReview) return;
    setAdminBaselineSaving(true);
    setCloudSync((current) => ({
      ...current,
      phase: "publishing",
      message: "Setting this admin copy as the team baseline..."
    }));

    try {
      const result = await savePublishedDatabase(currentUser.email, adminBaselineReview.localDatabase);
      if (!result.ok || !result.envelope?.payload.database) {
        setCloudSync({
          phase: "offline",
          message: result.error || "Could not set the admin copy as the team baseline.",
          lastSavedAt: cloudSync.lastSavedAt,
          configured: result.configured
        });
        return;
      }

      const nextDatabase = result.envelope.payload.database;
      const nextHash = databaseSyncHash(nextDatabase);
      initialLocalDatabaseRef.current = nextDatabase;
      remoteLoadRef.current = true;
      setDatabase(nextDatabase, { source: "remote" });
      saveDatabase(nextDatabase);
      window.setTimeout(() => {
        remoteLoadRef.current = false;
      }, 0);
      realtimeResetterRef.current?.(nextDatabase);
      setPublishedDatabase(nextDatabase);
      setPublishedReady(true);
      lastPublishedDatabaseRef.current = nextDatabase;
      lastPublishedHashRef.current = nextHash;
      lastDraftHashRef.current = nextHash;
      lastDraftUpdatedAtRef.current = result.envelope.updatedAt;
      realtimeBaseDatabaseRef.current = nextDatabase;
      realtimeLastPublishedHashRef.current = nextHash;
      savePublishedSyncState(nextDatabase, result.envelope.updatedAt);
      setAdminBaselineReview(null);
      setCloudSync({
        phase: "saved",
        message: "Admin copy is now the team baseline. Other accounts will load it automatically.",
        lastSavedAt: result.envelope.updatedAt,
        configured: true
      });
    } catch (error) {
      setCloudSync({
        phase: "offline",
        message: error instanceof Error ? error.message : "Could not set the admin copy as the team baseline.",
        lastSavedAt: cloudSync.lastSavedAt,
        configured: true
      });
    } finally {
      setAdminBaselineSaving(false);
    }
  };

  const forceSaveTeamDatabase = async () => {
    if (!LIVE_TEAM_SYNC || !currentUser || readOnly || hostedViewer) return;
    if (!canAccessSettings) {
      const savedAt = new Date().toISOString();
      const result = saveDatabase(databaseRef.current);
      setStorageWarning(result.ok ? "" : result.message || "The app could not save this working copy.");
      setCloudSync((current) => ({
        ...current,
        phase: result.ok ? "saved" : "offline",
        message: result.ok
          ? "Working copy saved in this browser from the admin version."
          : result.message || "The app could not save this working copy.",
        lastSavedAt: savedAt,
        configured: true
      }));
      return;
    }
    if (!hasCloudCredential) {
      setCloudSync((current) => ({
        ...current,
        phase: "needsAuth",
        message: "Google sync token is missing or expired. Sign in again before editing."
      }));
      return;
    }
    const databaseToSave = databaseRef.current;
    const databaseToSaveHash = databaseSyncHash(databaseToSave);
    const pending = savePendingTeamChange(databaseToSave);
    pendingTeamChangeHashRef.current = pending.hash;
    setCloudSync((current) => ({
      ...current,
      phase: "saving",
      message: "Saving this cookbook to the team database now..."
    }));

    try {
      const result = await savePublishedDatabase(currentUser.email, databaseToSave);
      if (!result.ok || !result.envelope?.payload.database) {
        if (result.error?.includes("sign-in token")) {
          setHasCloudCredential(false);
        }
        setCloudSync({
          phase: result.error?.includes("sign-in token") ? "needsAuth" : "offline",
          message: result.error || "Team save failed. Sign in again or check cloud sync settings.",
          lastSavedAt: cloudSync.lastSavedAt,
          configured: result.configured
        });
        return;
      }

      const savedDatabase = result.envelope.payload.database;
      const savedHash = databaseSyncHash(savedDatabase);
      remoteLoadRef.current = true;
      setDatabase(savedDatabase, { source: "remote" });
      saveDatabase(savedDatabase);
      window.setTimeout(() => {
        remoteLoadRef.current = false;
      }, 0);
      setPublishedDatabase(savedDatabase);
      setPublishedReady(true);
      lastPublishedDatabaseRef.current = savedDatabase;
      lastPublishedHashRef.current = savedHash;
      lastDraftHashRef.current = savedHash;
      lastDraftUpdatedAtRef.current = result.envelope.updatedAt;
      savePublishedSyncState(savedDatabase, result.envelope.updatedAt);
      pendingTeamChangeHashRef.current = "";
      clearPendingTeamChange(databaseToSaveHash);
      clearPendingTeamChange(savedHash);
      setCloudSync({
        phase: "saved",
        message: `Live team changes saved at ${new Date(result.envelope.updatedAt).toLocaleTimeString()}.`,
        lastSavedAt: result.envelope.updatedAt,
        configured: true
      });
    } catch (error) {
      setCloudSync({
        phase: "offline",
        message: error instanceof Error ? error.message : "Team save failed. Local browser save is still active.",
        lastSavedAt: cloudSync.lastSavedAt,
        configured: true
      });
    }
  };

  const rememberExplicitRemoval = (changeId: string) => {
    setExplicitRemovalIds((current) => current.includes(changeId) ? current : [...current, changeId]);
  };

  const openPushReview = () => {
    setPushMessage(
      cloudSync.configured
        ? ""
        : "Cloud sync is not configured yet. Add TAVERN_SYNC_GITHUB_TOKEN in Vercel before pushing globally."
    );
    setPushReviewOpen(true);
  };

  const publishSelectedChanges = async (selectedChangeIds: string[]) => {
    if (!currentUser || !selectedChangeIds.length) return;
    setPushMessage("");
    setCloudSync((current) => ({
      ...current,
      phase: "publishing",
      message: "Pushing selected changes to the team..."
    }));

    try {
      const latestPublished = await fetchPublishedDatabase();
      const basePublished = latestPublished.ok && latestPublished.envelope?.payload.database
        ? latestPublished.envelope.payload.database
        : publishedDatabase;
      const nextPublished = applySelectedPublishChanges(database, basePublished, selectedChangeIds);
      const result = await savePublishedDatabase(currentUser.email, nextPublished);
      if (!result.ok || !result.envelope?.payload.database) {
        const errorMessage = result.error || "Push failed. Nothing was published.";
        setPushMessage(errorMessage);
        setCloudSync({
          phase: "offline",
          message: errorMessage,
          lastSavedAt: cloudSync.lastSavedAt,
          configured: result.configured
        });
        return;
      }

      setPublishedDatabase(result.envelope.payload.database);
      setPublishedReady(true);
      lastPublishedDatabaseRef.current = result.envelope.payload.database;
      lastPublishedHashRef.current = databaseSyncHash(result.envelope.payload.database);
      savePublishedSyncState(result.envelope.payload.database, result.envelope.updatedAt);
      setExplicitRemovalIds((current) => current.filter((id) => !selectedChangeIds.includes(id)));
      setPushReviewOpen(false);
      setPushMessage("");
      setCloudSync({
        phase: "saved",
        message: `Pushed ${selectedChangeIds.length} selected changes for the team.`,
        lastSavedAt: result.envelope.updatedAt,
        configured: true
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Push failed. Nothing was published.";
      setPushMessage(errorMessage);
      setCloudSync({
        phase: "offline",
        message: errorMessage,
        lastSavedAt: cloudSync.lastSavedAt,
        configured: true
      });
    }
  };

  const pullLatestTeamVersion = async () => {
    if (!currentUser) return;
    const confirmed = window.confirm(
      "Pull the latest team version? This replaces this account's private draft in this browser with the live team copy. Anything not pushed from this account will be discarded."
    );
    if (!confirmed) return;

    setPullingLatest(true);
    setPushMessage("Pulling the latest team version...");
    setCloudSync((current) => ({
      ...current,
      phase: "loading",
      message: "Pulling the latest team version..."
    }));

    try {
      const result = await fetchPublishedDatabase();
      if (!result.ok || !result.envelope?.payload.database) {
        const errorMessage = result.error || "No published team version is available yet.";
        setPushMessage(errorMessage);
        setCloudSync({
          phase: "offline",
          message: errorMessage,
          lastSavedAt: cloudSync.lastSavedAt,
          configured: result.configured
        });
        return;
      }

      const remotePublished = result.envelope.payload.database;
      const remoteHash = databaseSyncHash(remotePublished);
      remoteLoadRef.current = true;
      setDatabase(remotePublished, { source: "remote" });
      saveDatabase(remotePublished);
      window.setTimeout(() => {
        remoteLoadRef.current = false;
      }, 0);

      setPublishedDatabase(remotePublished);
      setPublishedReady(true);
      lastPublishedDatabaseRef.current = remotePublished;
      lastPublishedHashRef.current = remoteHash;
      lastDraftHashRef.current = remoteHash;
      lastDraftUpdatedAtRef.current = result.envelope.updatedAt;
      savePublishedSyncState(remotePublished, result.envelope.updatedAt);
      setExplicitRemovalIds([]);

      const draftResult = readOnly ? null : await saveUserDraft(currentUser.email, remotePublished);
      if (draftResult && (!draftResult.ok || !draftResult.envelope?.payload.database)) {
        const warning = draftResult.error || "Pulled locally, but the account draft could not be reset.";
        setPushMessage(warning);
        setCloudSync({
          phase: "offline",
          message: warning,
          lastSavedAt: result.envelope.updatedAt,
          configured: draftResult.configured
        });
        return;
      }

      if (draftResult?.envelope?.payload.database) {
        lastDraftHashRef.current = databaseSyncHash(draftResult.envelope.payload.database);
        lastDraftUpdatedAtRef.current = draftResult.envelope.updatedAt;
      }

      setPushReviewOpen(false);
      setPushMessage("");
      setCloudSync({
        phase: "saved",
        message: "Pulled the latest team version.",
        lastSavedAt: draftResult?.envelope?.updatedAt || result.envelope.updatedAt,
        configured: true
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not pull the latest team version.";
      setPushMessage(errorMessage);
      setCloudSync({
        phase: "offline",
        message: errorMessage,
        lastSavedAt: cloudSync.lastSavedAt,
        configured: true
      });
    } finally {
      setPullingLatest(false);
    }
  };

  const resolveSyncConflicts = (choice: "team" | "mine") => {
    if (!syncConflictReview || !currentUser) {
      setSyncConflictReview(null);
      return;
    }

    if (choice === "mine") {
      setSyncConflictReview(null);
      setCloudSync((current) => ({
        ...current,
        message: "Kept your private versions for the overlapping team changes."
      }));
      return;
    }

    const nextDatabase = applyTeamConflictChoices(
      database,
      syncConflictReview.teamDatabase,
      syncConflictReview.conflicts
    );
    const nextHash = databaseSyncHash(nextDatabase);
    remoteLoadRef.current = true;
    setDatabase(nextDatabase, { source: "remote" });
    saveDatabase(nextDatabase);
    window.setTimeout(() => {
      remoteLoadRef.current = false;
    }, 0);
    lastDraftHashRef.current = nextHash;
    lastDraftUpdatedAtRef.current = latestSyncDate(lastDraftUpdatedAtRef.current, syncConflictReview.teamUpdatedAt);
    setExplicitRemovalIds((current) =>
      current.filter((id) => !syncConflictReview.conflicts.some((conflict) => conflictToRemovalId(conflict) === id))
    );
    setSyncConflictReview(null);
    setCloudSync({
      phase: "saved",
      message: "Used the team version for the overlapping changes.",
      lastSavedAt: syncConflictReview.teamUpdatedAt,
      configured: true
    });

    if (!readOnly) {
      void saveUserDraft(currentUser.email, nextDatabase)
        .then((draftResult) => {
          if (!draftResult.ok || !draftResult.envelope?.payload.database) return;
          lastDraftHashRef.current = databaseSyncHash(draftResult.envelope.payload.database);
          lastDraftUpdatedAtRef.current = latestSyncDate(lastDraftUpdatedAtRef.current, draftResult.envelope.updatedAt);
        })
        .catch(() => {});
    }
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
    rememberExplicitRemoval(`entry:${entry.id}:removed`);
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

  const openWorldBuildingEntry = (category: WorldBuildingFocusTarget["category"], entryId: string) => {
    setDetailReturnTarget(null);
    setSelectedEntry(null);
    setSelectedReferenceKeyword("");
    setKeywordPopup("");
    setArtVaultDashboardOpen(false);
    setFavoritesOpen(false);
    setQuestDashboardOpen(false);
    setProfileOpen(false);
    setSelectedBestiaryCreatureId("");
    setWorldBuildingFocus({ category, entryId, nonce: Date.now() });
    setActiveView("world");
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
    if (!canAccessSettings && hiddenViewIds.includes(view)) {
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
    rememberExplicitRemoval(`creature:${creatureId}:removed`);
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

  const updateBrandingLogo = (logoImage: string) => {
    if (forcedReadOnly) return;
    const next = {
      ...database,
      branding: {
        ...database.branding,
        logoImage
      }
    };
    setDatabase(next);
    const result = saveDatabase(next);
    setStorageWarning(result.ok ? "" : result.message || "The app could not save this change.");
  };

  const signOut = () => {
    clearGoogleAccount();
    disableGoogleAutoSelect();
    setHasCloudCredential(false);
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
    const updatedUser = { ...currentUser, role: access.role };
    saveGoogleAccount(updatedUser);
    setCurrentUser(updatedUser);
  };

  const updateAccessUsersFromSettings = (users: Parameters<typeof saveAccessUsers>[0]) => {
    saveAccessUsers(users);
    setAppSyncSettings((current) => normalizeAppSyncSettings({ ...current, accessUsers: users }));
    refreshCurrentUserAccess();
  };

  const updateAppSyncSettings = (settings: typeof appSyncSettings) => {
    const normalized = normalizeAppSyncSettings(settings);
    saveAccessUsers(normalized.accessUsers);
    setAppSyncSettings(normalized);
    refreshCurrentUserAccess();
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
  const desktopBrowserAuthMode = isDesktopBrowserAuthRequest();
  const needsCloudReauth = Boolean(currentUser && !hostedViewer && LIVE_TEAM_SYNC && !hasCloudCredential);

  if (!currentUser || desktopBrowserAuthMode || needsCloudReauth) {
    return (
      <div className={themeClassName}>
        <AccessGate
          onSignIn={(user) => {
            setHasCloudCredential(Boolean(loadGoogleCredential()));
            setCurrentUser(user);
          }}
          brandingLogoImage={database.branding.logoImage}
          onBrandingLogoChange={!forcedReadOnly ? updateBrandingLogo : undefined}
        />
      </div>
    );
  }

  return (
    <div className={themeClassName}>
      <LoreKeywordProvider keywords={loreKeywords} onKeywordClick={openKeywordReference}>
      <RealtimeCollaborationContext.Provider value={realtimeContextValue}>
      <RealtimeRoomBridge
        currentUser={currentUser}
        database={database}
        canonicalDatabase={publishedReady ? publishedDatabase : database}
        canonicalReady={publishedReady}
        activeView={activeView}
        selectedEntry={selectedEntry}
        selectedBestiaryCreatureId={selectedBestiaryCreatureId}
        enabled={Boolean(currentUser && !hostedViewer)}
        onDatabaseFromRoom={handleRealtimeDatabase}
        onPublisherReady={handleRealtimePublisherReady}
        onResetterReady={handleRealtimeResetterReady}
        onPresenceUpdaterReady={handleRealtimePresenceUpdaterReady}
        onUsersChange={setRealtimeUsers}
        onStatusChange={setRealtimeStatus}
      />
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
          onOpenProfile={openProfile}
          onOpenTavernScribe={() => setTavernScribeOpen(true)}
          onOpenQuestDashboard={openQuestDashboard}
          onOpenPushChanges={LIVE_TEAM_SYNC ? undefined : openPushReview}
          onForceLiveSync={forceSaveTeamDatabase}
          questCount={currentQuestCount}
          pendingPublishCount={pendingPublishCount}
          canAccessSettings={canAccessSettings}
          hiddenViewIds={hiddenViewIds}
          syncLabel={cloudSync.message}
          syncName={usesWorkingCopy ? "Working Copy" : "Live Sync"}
          syncActionTitle={usesWorkingCopy ? "Click to save this working copy in this browser" : "Click to save this cookbook to team sync now"}
          syncWorking={cloudSync.phase === "publishing" || cloudSync.phase === "saving" || cloudSync.phase === "loading"}
          liveUsers={realtimeUsers}
          liveStatus={realtimeStatus}
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
                <Dashboard database={database} onNavigate={navigate} onOpenEntry={openEntry} hiddenViewIds={hiddenViewIds} />
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

              {activeView === "story" && (
                <StoryPage
                  entries={database.entries}
                  worldBuilding={database.worldBuilding}
                  readOnly={readOnly}
                  onNavigate={navigate}
                  onOpenEntry={openEntry}
                  onOpenWorldEntry={openWorldBuildingEntry}
                  isFavorite={isEntryFavorite}
                  onToggleFavorite={(entry) => toggleFavoriteById("entry", entry.id)}
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
                  appSyncSettings={appSyncSettings}
                  onAccessUsersChange={updateAccessUsersFromSettings}
                  onAppSyncSettingsChange={updateAppSyncSettings}
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

              {(activeView === "food" || activeView === "ingredients" || activeView === "recipes") && (
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

              {!["dashboard", "storyJourney", "story", "spriteAnimator", "search", "timeline", "secrets", "settings", "bestiary", "world", "food", "ingredients", "recipes"].includes(activeView) && (
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

        {!LIVE_TEAM_SYNC && pushReviewOpen && (
          <SyncPublishModal
            changes={publishChanges}
            publishing={cloudSync.phase === "publishing"}
            pulling={pullingLatest}
            message={pushMessage || cloudSync.message}
            onClose={() => setPushReviewOpen(false)}
            onPublish={publishSelectedChanges}
            onPullLatest={pullLatestTeamVersion}
          />
        )}

        {syncConflictReview && (
          <SyncConflictModal
            conflicts={syncConflictReview.conflicts}
            onUseTeam={() => resolveSyncConflicts("team")}
            onKeepMine={() => resolveSyncConflicts("mine")}
            onClose={() => setSyncConflictReview(null)}
          />
        )}

        {adminBaselineReview && (
          <AdminBaselineModal
            review={adminBaselineReview}
            saving={adminBaselineSaving}
            message={cloudSync.message}
            onUseAdminCopy={centralizeAdminBaseline}
            onUseTeamBaseline={useTeamBaselineHere}
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
      </RealtimeCollaborationContext.Provider>
      </LoreKeywordProvider>
    </div>
  );
}

function isCharacterEntry(entry: LoreEntry) {
  return /character/i.test(entry.category) || /character/i.test(entry.type);
}

function expandHiddenViewIds(hiddenViewIds: ActiveView[]) {
  const expanded = new Set<ActiveView>(hiddenViewIds);
  if (expanded.has("food")) {
    expanded.add("ingredients");
    expanded.add("recipes");
    expanded.add("items");
  }
  if (expanded.has("story")) {
    expanded.add("timeline");
    expanded.add("secrets");
    expanded.add("factions");
  }
  if (expanded.has("bestiary")) {
    expanded.add("enemies");
  }
  return [...expanded];
}

function latestSyncDate(left = "", right = "") {
  if (!left) return right;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function isSyncDateAfter(left = "", right = "") {
  if (!left) return false;
  if (!right) return true;
  return new Date(left).getTime() > new Date(right).getTime();
}

function mergeDraftOntoPublished(
  draftDatabase: LoreDatabase,
  publishedDatabase: LoreDatabase,
  explicitRemovalSet: Set<string>
) {
  const draft = sanitizeDatabaseForPersistence(draftDatabase);
  const published = sanitizeDatabaseForPersistence(publishedDatabase);
  let privateCount = 0;

  const entries = mergeDraftArray(published.entries || [], draft.entries || [], explicitRemovalSet, (id) => removalChangeId("entry", id));
  const bestiary = mergeDraftArray(published.bestiary || [], draft.bestiary || [], explicitRemovalSet, (id) => removalChangeId("creature", id));
  const bestiaryCategoryVaults = mergeDraftArray(
    published.bestiaryCategoryVaults || [],
    draft.bestiaryCategoryVaults || [],
    explicitRemovalSet,
    (id) => removalChangeId("bestiaryCategoryVault", id)
  );
  privateCount += entries.privateCount + bestiary.privateCount + bestiaryCategoryVaults.privateCount;

  const worldBuilding = { ...published.worldBuilding };
  const worldCategories = new Set([
    ...Object.keys(published.worldBuilding || {}),
    ...Object.keys(draft.worldBuilding || {})
  ]);
  worldCategories.forEach((category) => {
    const key = category as keyof LoreDatabase["worldBuilding"];
    const merged = mergeDraftArray(
      published.worldBuilding?.[key] || [],
      draft.worldBuilding?.[key] || [],
      explicitRemovalSet,
      (id) => removalChangeId("worldEntry", id, String(category))
    ) as { items: LoreDatabase["worldBuilding"][typeof key]; privateCount: number };
    worldBuilding[key] = merged.items;
    privateCount += merged.privateCount;
  });

  return {
    database: migrateDatabase({
      ...published,
      entries: entries.items,
      bestiary: bestiary.items,
      bestiaryCategoryVaults: bestiaryCategoryVaults.items,
      worldBuilding
    }),
    privateCount
  };
}

function mergeIncomingTeamDatabase(
  localDatabase: LoreDatabase,
  previousPublishedDatabase: LoreDatabase,
  nextPublishedDatabase: LoreDatabase,
  explicitRemovalSet: Set<string>
) {
  const local = sanitizeDatabaseForPersistence(localDatabase);
  const previous = sanitizeDatabaseForPersistence(previousPublishedDatabase);
  const next = sanitizeDatabaseForPersistence(nextPublishedDatabase);
  const conflicts: IncomingSyncConflict[] = [];
  let appliedCount = 0;

  const entries = mergeIncomingArray(local.entries || [], previous.entries || [], next.entries || [], explicitRemovalSet, entryConflict);
  const bestiary = mergeIncomingArray(local.bestiary || [], previous.bestiary || [], next.bestiary || [], explicitRemovalSet, creatureConflict);
  const bestiaryCategoryVaults = mergeIncomingArray(
    local.bestiaryCategoryVaults || [],
    previous.bestiaryCategoryVaults || [],
    next.bestiaryCategoryVaults || [],
    explicitRemovalSet,
    vaultConflict
  );
  appliedCount += entries.appliedCount + bestiary.appliedCount + bestiaryCategoryVaults.appliedCount;
  conflicts.push(...entries.conflicts, ...bestiary.conflicts, ...bestiaryCategoryVaults.conflicts);

  const worldBuilding = { ...local.worldBuilding };
  const worldCategories = new Set([
    ...Object.keys(local.worldBuilding || {}),
    ...Object.keys(previous.worldBuilding || {}),
    ...Object.keys(next.worldBuilding || {})
  ]);
  worldCategories.forEach((category) => {
    const key = category as keyof LoreDatabase["worldBuilding"];
    const merged = mergeIncomingArray(
      local.worldBuilding?.[key] || [],
      previous.worldBuilding?.[key] || [],
      next.worldBuilding?.[key] || [],
      explicitRemovalSet,
      (item) => worldConflict(item, String(category))
    ) as {
      items: LoreDatabase["worldBuilding"][typeof key];
      conflicts: IncomingSyncConflict[];
      appliedCount: number;
    };
    worldBuilding[key] = merged.items;
    appliedCount += merged.appliedCount;
    conflicts.push(...merged.conflicts);
  });

  const brandingChangedByTeam = !sameValue(next.branding, previous.branding);
  const brandingChangedLocally = !sameValue(local.branding, previous.branding);
  const branding = brandingChangedByTeam && !brandingChangedLocally ? next.branding : local.branding;
  if (brandingChangedByTeam && !brandingChangedLocally && !sameValue(local.branding, next.branding)) appliedCount += 1;
  if (brandingChangedByTeam && brandingChangedLocally && !sameValue(local.branding, next.branding)) {
    conflicts.push({
      id: "branding:studio",
      kind: "branding",
      title: "STL Productionz Branding",
      moduleLabel: "Branding",
      summary: "Both your account and the team version changed the studio branding."
    });
  }

  const database = migrateDatabase({
    ...local,
    entries: entries.items,
    bestiary: bestiary.items,
    bestiaryCategoryVaults: bestiaryCategoryVaults.items,
    worldBuilding,
    branding
  });

  return {
    database,
    conflicts,
    appliedCount,
    changed: databaseSyncHash(database) !== databaseSyncHash(local)
  };
}

function mergeDraftArray<T extends { id: string }>(
  publishedItems: T[],
  draftItems: T[],
  explicitRemovalSet: Set<string>,
  removalIdFor: (id: string) => string
) {
  const draftById = new Map(draftItems.map((item) => [item.id, item] as const));
  const publishedIds = new Set(publishedItems.map((item) => item.id));
  const items: T[] = [];
  let privateCount = 0;

  publishedItems.forEach((publishedItem) => {
    const draftItem = draftById.get(publishedItem.id);
    if (explicitRemovalSet.has(removalIdFor(publishedItem.id))) {
      privateCount += 1;
      return;
    }
    if (draftItem && isDraftItemNewer(draftItem, publishedItem) && !sameValue(draftItem, publishedItem)) {
      items.push(draftItem);
      privateCount += 1;
      return;
    }
    items.push(publishedItem);
  });

  draftItems.forEach((draftItem) => {
    if (publishedIds.has(draftItem.id)) return;
    items.unshift(draftItem);
    privateCount += 1;
  });

  return { items, privateCount };
}

function mergeIncomingArray<T extends { id: string }>(
  localItems: T[],
  previousItems: T[],
  nextItems: T[],
  explicitRemovalSet: Set<string>,
  describeConflict: (item: T) => IncomingSyncConflict
) {
  const localById = new Map(localItems.map((item) => [item.id, item] as const));
  const previousById = new Map(previousItems.map((item) => [item.id, item] as const));
  const nextById = new Map(nextItems.map((item) => [item.id, item] as const));
  const items: T[] = [];
  const conflicts: IncomingSyncConflict[] = [];
  const seen = new Set<string>();
  let appliedCount = 0;

  nextItems.forEach((nextItem) => {
    const localItem = localById.get(nextItem.id);
    const previousItem = previousById.get(nextItem.id);
    const teamChanged = !previousItem || !sameValue(nextItem, previousItem);
    const localChanged = Boolean(localItem && previousItem && !sameValue(localItem, previousItem));
    const removalId = removalIdFromConflict(describeConflict(nextItem));
    seen.add(nextItem.id);

    if (!localItem) {
      if (explicitRemovalSet.has(removalId) && previousItem) {
        if (teamChanged) conflicts.push(describeConflict(nextItem));
        return;
      }
      items.push(nextItem);
      if (teamChanged) appliedCount += 1;
      return;
    }

    if (teamChanged && localChanged && !sameValue(localItem, nextItem)) {
      items.push(localItem);
      conflicts.push(describeConflict(nextItem));
      return;
    }

    if (teamChanged && !sameValue(localItem, nextItem)) {
      items.push(nextItem);
      appliedCount += 1;
      return;
    }

    items.push(localItem);
  });

  localItems.forEach((localItem) => {
    if (seen.has(localItem.id)) return;
    const previousItem = previousById.get(localItem.id);
    if (!previousItem) {
      items.push(localItem);
      return;
    }
    if (!nextById.has(localItem.id) && !sameValue(localItem, previousItem)) {
      items.push(localItem);
      conflicts.push(describeConflict(localItem));
      return;
    }
    if (!nextById.has(localItem.id)) appliedCount += 1;
  });

  return { items, conflicts, appliedCount };
}

function applyTeamConflictChoices(
  localDatabase: LoreDatabase,
  teamDatabase: LoreDatabase,
  conflicts: IncomingSyncConflict[]
) {
  let next = sanitizeDatabaseForPersistence(localDatabase);
  const team = sanitizeDatabaseForPersistence(teamDatabase);
  conflicts.forEach((conflict) => {
    if (conflict.kind === "entry" && conflict.entryId) {
      next = { ...next, entries: applyTeamArrayChoice(next.entries || [], team.entries || [], conflict.entryId) };
    }
    if (conflict.kind === "creature" && conflict.creatureId) {
      next = { ...next, bestiary: applyTeamArrayChoice(next.bestiary || [], team.bestiary || [], conflict.creatureId) };
    }
    if (conflict.kind === "bestiaryCategoryVault" && conflict.vaultId) {
      next = {
        ...next,
        bestiaryCategoryVaults: applyTeamArrayChoice(
          next.bestiaryCategoryVaults || [],
          team.bestiaryCategoryVaults || [],
          conflict.vaultId
        )
      };
    }
    if (conflict.kind === "worldEntry" && conflict.worldCategory && conflict.worldEntryId) {
      const category = conflict.worldCategory as keyof LoreDatabase["worldBuilding"];
      next = {
        ...next,
        worldBuilding: {
          ...next.worldBuilding,
          [category]: applyTeamArrayChoice(
            next.worldBuilding?.[category] || [],
            team.worldBuilding?.[category] || [],
            conflict.worldEntryId
          ) as LoreDatabase["worldBuilding"][typeof category]
        }
      };
    }
    if (conflict.kind === "branding") {
      next = { ...next, branding: team.branding };
    }
  });
  return migrateDatabase(next);
}

function applyTeamArrayChoice<T extends { id: string }>(localItems: T[], teamItems: T[], id: string) {
  const teamItem = teamItems.find((item) => item.id === id);
  if (!teamItem) return localItems.filter((item) => item.id !== id);
  return localItems.some((item) => item.id === id)
    ? localItems.map((item) => item.id === id ? teamItem : item)
    : [teamItem, ...localItems];
}

function entryConflict(entry: LoreEntry): IncomingSyncConflict {
  return {
    id: `entry:${entry.id}`,
    kind: "entry",
    title: entry.title || "Untitled Entry",
    moduleLabel: entry.category || "Lore Entry",
    summary: `${entry.category || "Entry"} / ${entry.type || "Module"}`,
    entryId: entry.id
  };
}

function creatureConflict(creature: BestiaryCreature): IncomingSyncConflict {
  return {
    id: `creature:${creature.id}`,
    kind: "creature",
    title: creature.name || "Untitled Creature",
    moduleLabel: "Bestiary",
    summary: `${creature.category || "Creature"} / ${creature.type || "Bestiary"}`,
    creatureId: creature.id
  };
}

function vaultConflict(vault: BestiaryCategoryArtVault): IncomingSyncConflict {
  return {
    id: `bestiaryCategoryVault:${vault.id}`,
    kind: "bestiaryCategoryVault",
    title: vault.title || vault.categoryName || "Untitled Art Binder",
    moduleLabel: "Art Binder",
    summary: `Bestiary art category / ${vault.categoryName || "Category"}`,
    vaultId: vault.id
  };
}

function worldConflict(entry: { id: string; title?: string; type?: string; tags?: string[] }, category: string): IncomingSyncConflict {
  return {
    id: `worldEntry:${category}:${entry.id}`,
    kind: "worldEntry",
    title: entry.title || "Untitled World Entry",
    moduleLabel: `World Building / ${category}`,
    summary: `${entry.type || "World entry"} / ${entry.tags?.slice(0, 3).join(", ") || "No tags"}`,
    worldCategory: category,
    worldEntryId: entry.id
  };
}

function conflictToRemovalId(conflict: IncomingSyncConflict) {
  if (conflict.kind === "entry" && conflict.entryId) return removalChangeId("entry", conflict.entryId);
  if (conflict.kind === "creature" && conflict.creatureId) return removalChangeId("creature", conflict.creatureId);
  if (conflict.kind === "bestiaryCategoryVault" && conflict.vaultId) return removalChangeId("bestiaryCategoryVault", conflict.vaultId);
  if (conflict.kind === "worldEntry" && conflict.worldCategory && conflict.worldEntryId) {
    return removalChangeId("worldEntry", conflict.worldEntryId, String(conflict.worldCategory));
  }
  return conflict.id;
}

function removalIdFromConflict(conflict: IncomingSyncConflict) {
  return conflictToRemovalId(conflict);
}

function removalChangeId(kind: PublishChangeKind, id: string, worldCategory = "") {
  if (kind === "worldEntry") return `worldEntry:${worldCategory}:${id}:removed`;
  return `${kind}:${id}:removed`;
}

function isDraftItemNewer(left: unknown, right: unknown) {
  const leftTime = itemUpdatedTime(left);
  const rightTime = itemUpdatedTime(right);
  return Boolean(leftTime && (!rightTime || leftTime > rightTime));
}

function itemUpdatedTime(value: unknown) {
  if (!value || typeof value !== "object") return 0;
  const record = value as { updatedAt?: unknown; lastUpdatedAt?: unknown; dateAdded?: unknown; createdAt?: unknown };
  const raw = record.updatedAt || record.lastUpdatedAt || record.dateAdded || record.createdAt;
  if (typeof raw !== "string") return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sameValue(left: unknown, right: unknown) {
  return stableString(left) === stableString(right);
}

function stableString(value: unknown) {
  return JSON.stringify(value);
}

function hasAdminLocalBaselineDifference(localDatabase: LoreDatabase, teamDatabase: LoreDatabase) {
  const localIds = collectDatabaseIdentitySet(localDatabase);
  const teamIds = collectDatabaseIdentitySet(teamDatabase);
  if ([...localIds].some((id) => !teamIds.has(id))) return true;
  if ([...teamIds].some((id) => !localIds.has(id))) return true;
  return databaseSyncHash(localDatabase) !== databaseSyncHash(teamDatabase);
}

function collectDatabaseIdentitySet(database: LoreDatabase) {
  const ids = new Set<string>();
  (database.entries || []).forEach((entry) => ids.add(`entry:${entry.id}`));
  (database.bestiary || []).forEach((creature) => ids.add(`creature:${creature.id}`));
  (database.bestiaryCategoryVaults || []).forEach((vault) => ids.add(`vault:${vault.id}`));
  Object.entries(database.worldBuilding || {}).forEach(([category, entries]) => {
    (entries || []).forEach((entry) => ids.add(`world:${category}:${entry.id}`));
  });
  return ids;
}

function baselineSummary(database: LoreDatabase) {
  const worldCount = Object.values(database.worldBuilding || {}).reduce(
    (total, entries) => total + (entries?.length || 0),
    0
  );
  const characterCount = (database.entries || []).filter(isCharacterEntry).length;
  const artBinderCount =
    (database.entries || []).reduce((total, entry) => total + (entry.artVault?.sections?.length || 0), 0) +
    (database.bestiary || []).reduce((total, creature) => total + (creature.artVault?.sections?.length || 0), 0) +
    (database.bestiaryCategoryVaults || []).reduce((total, vault) => total + (vault.artVault?.sections?.length || 0), 0);

  return {
    loreEntries: database.entries?.length || 0,
    characters: characterCount,
    bestiary: database.bestiary?.length || 0,
    world: worldCount,
    artBinder: artBinderCount
  };
}

function loadExplicitRemovalIds() {
  try {
    const raw = localStorage.getItem(EXPLICIT_REMOVALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveExplicitRemovalIds(ids: string[]) {
  try {
    localStorage.setItem(EXPLICIT_REMOVALS_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Explicit removals only affect the push review; the app can keep working without this cache.
  }
}

function loadPendingTeamChange() {
  try {
    const raw = localStorage.getItem(PENDING_TEAM_CHANGE_KEY);
    const parsed = raw ? JSON.parse(raw) as { hash?: unknown; updatedAt?: unknown } : {};
    return {
      hash: typeof parsed.hash === "string" ? parsed.hash : "",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : ""
    };
  } catch {
    return { hash: "", updatedAt: "" };
  }
}

function isPendingTeamChangeFresh(pending: { hash: string; updatedAt: string }) {
  if (!pending.hash || !pending.updatedAt) return false;
  const updatedAt = Date.parse(pending.updatedAt);
  if (!Number.isFinite(updatedAt)) return false;
  return Date.now() - updatedAt <= PENDING_TEAM_CHANGE_MAX_AGE_MS;
}

function getFreshPendingTeamChange() {
  const pending = loadPendingTeamChange();
  if (!pending.hash || isPendingTeamChangeFresh(pending)) return pending;
  clearPendingTeamChange(pending.hash);
  return { hash: "", updatedAt: "" };
}

function savePendingTeamChange(database: LoreDatabase) {
  const pending = {
    hash: databaseSyncHash(database),
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(PENDING_TEAM_CHANGE_KEY, JSON.stringify(pending));
  } catch {
    // The local database itself is still saved separately; this marker only protects refresh/load decisions.
  }
  return pending;
}

function clearPendingTeamChange(savedHash: string) {
  try {
    const pending = loadPendingTeamChange();
    if (!pending.hash || pending.hash === savedHash) {
      localStorage.removeItem(PENDING_TEAM_CHANGE_KEY);
    }
  } catch {
    // Clearing this marker is best-effort.
  }
}

function SyncConflictModal({
  conflicts,
  onUseTeam,
  onKeepMine,
  onClose
}: {
  conflicts: IncomingSyncConflict[];
  onUseTeam: () => void;
  onKeepMine: () => void;
  onClose: () => void;
}) {
  return (
    <div className="sync-conflict-backdrop">
      <section className="sync-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="sync-conflict-title">
        <header>
          <div className="sync-conflict-icon">
            <Icon name="ShieldAlert" className="h-5 w-5" />
          </div>
          <div>
            <p>Team Sync Conflict</p>
            <h2 id="sync-conflict-title" className="font-display">Choose Which Version Wins</h2>
          </div>
          <button className="sync-publish-icon-button" onClick={onClose} title="Review later">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>
        <div className="sync-conflict-body entry-scroll">
          <p>
            The latest team push was loaded where it did not overlap. These modules were changed in both places.
          </p>
          {conflicts.map((conflict) => (
            <article key={conflict.id} className="sync-conflict-row">
              <strong>{conflict.title}</strong>
              <span>{conflict.moduleLabel}</span>
              <small>{conflict.summary}</small>
            </article>
          ))}
        </div>
        <footer>
          <button className="tab-frame rounded px-4 py-2" onClick={onKeepMine}>Keep My Version</button>
          <button className="button-frame rounded px-4 py-2" onClick={onUseTeam}>Use Team Version</button>
        </footer>
      </section>
    </div>
  );
}

function AdminBaselineModal({
  review,
  saving,
  message,
  onUseAdminCopy,
  onUseTeamBaseline
}: {
  review: AdminBaselineReview;
  saving: boolean;
  message: string;
  onUseAdminCopy: () => void;
  onUseTeamBaseline: () => void;
}) {
  const adminSummary = baselineSummary(review.localDatabase);
  const teamSummary = baselineSummary(review.teamDatabase);

  return (
    <div className="sync-conflict-backdrop">
      <section className="sync-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="admin-baseline-title">
        <header>
          <div className="sync-conflict-icon">
            <Icon name="Database" className="h-5 w-5" />
          </div>
          <div>
            <p>Admin Baseline</p>
            <h2 id="admin-baseline-title" className="font-display">Choose The Team Source</h2>
          </div>
        </header>
        <div className="sync-conflict-body entry-scroll">
          <p>
            This admin browser has a different cook book than the published team version. Choose the admin copy to make
            it the shared baseline for every account, or keep the current team baseline in this browser.
          </p>
          <div className="sync-conflict-row">
            <strong>Admin browser copy</strong>
            <span>{adminSummary.loreEntries} lore entries / {adminSummary.characters} characters / {adminSummary.bestiary} bestiary</span>
            <small>{adminSummary.world} world records / {adminSummary.artBinder} art binder sections</small>
          </div>
          <div className="sync-conflict-row">
            <strong>Published team baseline</strong>
            <span>{teamSummary.loreEntries} lore entries / {teamSummary.characters} characters / {teamSummary.bestiary} bestiary</span>
            <small>
              {teamSummary.world} world records / {teamSummary.artBinder} art binder sections
              {review.teamUpdatedAt ? ` / saved ${new Date(review.teamUpdatedAt).toLocaleString()}` : ""}
            </small>
          </div>
        </div>
        {message && <div className="sync-publish-message">{message}</div>}
        <footer>
          <button className="tab-frame rounded px-4 py-2" onClick={onUseTeamBaseline} disabled={saving}>
            Use Team Baseline Here
          </button>
          <button className="button-frame rounded px-4 py-2" onClick={onUseAdminCopy} disabled={saving}>
            {saving ? "Centralizing..." : "Use Admin Copy For Everyone"}
          </button>
        </footer>
      </section>
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
    return entries.filter((entry) => /recipe|meal|menu|dish|broth|tonic|ale|drink|consumable|food magic|food item/i.test(entry.type));
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
  if (category === "Food & Inventory") return "food";
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


