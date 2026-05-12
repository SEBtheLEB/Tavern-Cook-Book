import { useEffect, useMemo, useRef } from "react";
import { LiveObject, type JsonObject } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider, useMutation, useOthers, useStatus, useStorage, useUpdateMyPresence } from "@liveblocks/react";
import type { ActiveView, GoogleAccountUser, LoreDatabase, LoreEntry } from "../types";
import { loadGoogleCredential } from "../utils/accessControl";
import { databaseSyncHash } from "../utils/cloudSync";
import {
  mergeDatabaseChange,
  normalizeRealtimeDatabase,
  realtimeProfileFromUser,
  TAVERN_REALTIME_ENABLED,
  TAVERN_REALTIME_ROOM_ID,
  type RealtimeLocation,
  type RealtimeTarget,
  type RealtimeUserSummary,
  type TavernPresence
} from "../utils/realtimeCollaboration";
import { sanitizeDatabaseForPersistence } from "../utils/storage";

export type RealtimePublisher = (previousDatabase: LoreDatabase, nextDatabase: LoreDatabase) => void;
export type RealtimePresenceUpdater = (patch: Partial<TavernPresence>) => void;

interface RealtimeLiveUser {
  connectionId: number;
  info?: {
    name?: string;
    email?: string;
    picture?: string;
    role?: string;
  };
  presence?: {
    profile?: JsonObject | null;
    location?: JsonObject | null;
    hovering?: JsonObject | null;
  };
}

interface RealtimeRoomBridgeProps {
  currentUser: GoogleAccountUser | null;
  database: LoreDatabase;
  activeView: ActiveView;
  selectedEntry: LoreEntry | null;
  selectedBestiaryCreatureId: string;
  enabled: boolean;
  onDatabaseFromRoom: (database: LoreDatabase) => void;
  onPublisherReady: (publisher: RealtimePublisher | null) => void;
  onPresenceUpdaterReady: (updater: RealtimePresenceUpdater | null) => void;
  onUsersChange: (users: RealtimeUserSummary[]) => void;
  onStatusChange: (status: string) => void;
}

export function RealtimeRoomBridge({
  currentUser,
  database,
  activeView,
  selectedEntry,
  selectedBestiaryCreatureId,
  enabled,
  onDatabaseFromRoom,
  onPublisherReady,
  onPresenceUpdaterReady,
  onUsersChange,
  onStatusChange
}: RealtimeRoomBridgeProps) {
  const shouldConnect = TAVERN_REALTIME_ENABLED && enabled && Boolean(currentUser);
  const initialStorage = useMemo(
    () => ({
      database: new LiveObject<{ value: JsonObject }>({
        value: sanitizeDatabaseForPersistence(database) as unknown as JsonObject
      })
    }),
    []
  );

  if (!shouldConnect || !currentUser) {
    return null;
  }

  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        const credential = loadGoogleCredential();
        if (!credential) {
          throw new Error("Google sign-in is required for realtime collaboration.");
        }

        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credential}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            room,
            user: {
              name: currentUser.name,
              email: currentUser.email,
              picture: currentUser.picture,
              role: currentUser.role
            }
          })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(payload.error || "Realtime collaboration could not authenticate.");
        }

        return await response.json();
      }}
    >
      <RoomProvider
        id={TAVERN_REALTIME_ROOM_ID}
        initialPresence={{
          profile: realtimeProfileFromUser(currentUser) as unknown as JsonObject,
          location: realtimeLocation(activeView, selectedEntry, selectedBestiaryCreatureId, database) as unknown as JsonObject,
          hovering: null
        }}
        initialStorage={initialStorage as any}
        engine={2}
      >
        <RealtimeBridgeInner
          currentUser={currentUser}
          database={database}
          activeView={activeView}
          selectedEntry={selectedEntry}
          selectedBestiaryCreatureId={selectedBestiaryCreatureId}
          onDatabaseFromRoom={onDatabaseFromRoom}
          onPublisherReady={onPublisherReady}
          onPresenceUpdaterReady={onPresenceUpdaterReady}
          onUsersChange={onUsersChange}
          onStatusChange={onStatusChange}
        />
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function RealtimeBridgeInner({
  currentUser,
  database,
  activeView,
  selectedEntry,
  selectedBestiaryCreatureId,
  onDatabaseFromRoom,
  onPublisherReady,
  onPresenceUpdaterReady,
  onUsersChange,
  onStatusChange
}: Omit<RealtimeRoomBridgeProps, "enabled" | "currentUser"> & { currentUser: GoogleAccountUser }) {
  const liveDatabase = useStorage((root) => root.database?.value);
  const updateMyPresence = useUpdateMyPresence();
  const status = useStatus();
  const others = useOthers((users) => users.map((user) => realtimeUserSummary(user as unknown as RealtimeLiveUser)));
  const canonicalizedRoomRef = useRef(false);
  const publishDatabase = useMutation(
    ({ storage }, previousDatabase: LoreDatabase, nextDatabase: LoreDatabase) => {
      const holder = storage.get("database");
      const remoteDatabase = normalizeRealtimeDatabase(holder.get("value")) || previousDatabase;
      const mergedDatabase = mergeDatabaseChange(previousDatabase, nextDatabase, remoteDatabase);
      holder.set("value", sanitizeDatabaseForPersistence(mergedDatabase) as unknown as JsonObject);
    },
    []
  );
  const replaceDatabase = useMutation(
    ({ storage }, nextDatabase: LoreDatabase) => {
      const holder = storage.get("database");
      holder.set("value", sanitizeDatabaseForPersistence(nextDatabase) as unknown as JsonObject);
    },
    []
  );

  useEffect(() => {
    onPublisherReady(publishDatabase);
    return () => onPublisherReady(null);
  }, [onPublisherReady, publishDatabase]);

  useEffect(() => {
    const updater: RealtimePresenceUpdater = (patch) => {
      updateMyPresence({
        profile: patch.profile === undefined ? undefined : patch.profile as unknown as JsonObject | null,
        location: patch.location === undefined ? undefined : patch.location as unknown as JsonObject | null,
        hovering: patch.hovering === undefined ? undefined : patch.hovering as unknown as JsonObject | null
      });
    };
    onPresenceUpdaterReady(updater);
    return () => onPresenceUpdaterReady(null);
  }, [onPresenceUpdaterReady, updateMyPresence]);

  useEffect(() => {
    onUsersChange(others);
  }, [onUsersChange, others]);

  useEffect(() => {
    onStatusChange(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    updateMyPresence({
      profile: realtimeProfileFromUser(currentUser) as unknown as JsonObject,
      location: realtimeLocation(activeView, selectedEntry, selectedBestiaryCreatureId, database) as unknown as JsonObject
    });
  }, [activeView, currentUser, database, selectedBestiaryCreatureId, selectedEntry, updateMyPresence]);

  useEffect(() => {
    const normalized = normalizeRealtimeDatabase(liveDatabase);
    if (!normalized) return;
    const liveHash = databaseSyncHash(normalized);
    const localHash = databaseSyncHash(database);
    if (!canonicalizedRoomRef.current) {
      canonicalizedRoomRef.current = true;
      if (currentUser.role === "admin" && liveHash !== localHash) {
        replaceDatabase(database);
        return;
      }
    }
    if (liveHash === localHash) return;
    onDatabaseFromRoom(normalized);
  }, [currentUser.role, database, liveDatabase, onDatabaseFromRoom, replaceDatabase]);

  return null;
}

function realtimeLocation(
  activeView: ActiveView,
  selectedEntry: LoreEntry | null,
  selectedBestiaryCreatureId: string,
  database: LoreDatabase
): RealtimeLocation {
  if (selectedEntry) {
    return {
      view: activeView,
      label: selectedEntry.title,
      entryId: selectedEntry.id,
      entryTitle: selectedEntry.title
    };
  }

  if (activeView === "bestiary" && selectedBestiaryCreatureId) {
    const creature = (database.bestiary || []).find((item) => item.id === selectedBestiaryCreatureId);
    if (creature) {
      return {
        view: activeView,
        label: creature.name,
        entryId: creature.id,
        entryTitle: creature.name
      };
    }
  }

  return {
    view: activeView,
    label: viewLabel(activeView)
  };
}

function viewLabel(view: ActiveView) {
  return view
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function realtimeUserSummary(user: RealtimeLiveUser): RealtimeUserSummary {
  const profile = user.presence?.profile || {};
  const info = user.info || {};
  return {
    connectionId: user.connectionId,
    name: String(profile.name || info.name || "Team member"),
    email: String(profile.email || info.email || ""),
    picture: String(profile.picture || info.picture || ""),
    role: normalizeRole(String(profile.role || info.role || "viewer")),
    location: (user.presence?.location as unknown as RealtimeUserSummary["location"]) || null,
    hovering: (user.presence?.hovering as unknown as RealtimeTarget | null | undefined) || null
  };
}

function normalizeRole(role: string): RealtimeUserSummary["role"] {
  if (role === "admin" || role === "editor" || role === "viewer") return role;
  return "viewer";
}
