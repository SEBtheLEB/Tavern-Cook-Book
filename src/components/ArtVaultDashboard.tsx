import { useEffect, useMemo, useState } from "react";
import type { ActiveView, LoreDatabase, LoreEntry } from "../types";
import {
  buildArtVaultDashboardStats,
  type ArtVaultDashboardGroup,
  type ArtVaultDashboardItem
} from "../utils/artVaultDashboard";
import { ArtBinderPage, type ArtBinderInitialFilter, type ArtBinderKind, type ArtBinderSessionState } from "./ArtBinderPage";
import { Icon } from "./Icon";
import { useRealtimeCollaboration } from "./RealtimeCollaborationContext";

interface ArtVaultDashboardProps {
  database: LoreDatabase;
  readOnly: boolean;
  onDatabaseChange: (database: LoreDatabase) => void;
  onNavigate: (view: ActiveView) => void;
  onOpenEntry: (entry: LoreEntry) => void;
  initialBinderFilter?: ArtBinderInitialFilter | null;
  initialBinderOpen?: boolean;
  initialBinderSessionState?: ArtBinderSessionState | null;
  onClearBinderFilter?: () => void;
  onBinderVisibilityChange?: (open: boolean, filter: ArtBinderInitialFilter | null) => void;
  onBinderSessionStateChange?: (state: ArtBinderSessionState) => void;
}

export function ArtVaultDashboard({
  database,
  readOnly,
  onDatabaseChange,
  onNavigate,
  onOpenEntry,
  initialBinderFilter = null,
  initialBinderOpen = false,
  initialBinderSessionState = null,
  onClearBinderFilter,
  onBinderVisibilityChange,
  onBinderSessionStateChange
}: ArtVaultDashboardProps) {
  const stats = useMemo(() => buildArtVaultDashboardStats(database), [database]);
  const [binderFilter, setBinderFilter] = useState<ArtBinderInitialFilter | null>(initialBinderFilter);
  const [showBinder, setShowBinder] = useState(Boolean(initialBinderOpen || initialBinderFilter));
  const [destinationChoice, setDestinationChoice] = useState<ArtVaultDestinationChoice | null>(null);

  useEffect(() => {
    if (!initialBinderOpen && !initialBinderFilter) return;
    setBinderFilter(initialBinderFilter);
    setShowBinder(true);
  }, [initialBinderOpen, initialBinderFilter]);

  const openItem = (item: ArtVaultDashboardItem) => {
    setDestinationChoice({ type: "item", item });
  };

  const openBinder = (filter: ArtBinderInitialFilter | null) => {
    setBinderFilter(filter);
    setShowBinder(true);
    setDestinationChoice(null);
    onBinderVisibilityChange?.(true, filter);
  };

  const openSourceForItem = (item: ArtVaultDashboardItem) => {
    setDestinationChoice(null);
    if (item.kind === "bestiary") {
      onNavigate("bestiary");
      return;
    }
    if (item.kind === "pantry") {
      onNavigate("food");
      return;
    }

    const entry = database.entries.find((candidate) => candidate.id === item.sourceId);
    if (entry) onOpenEntry(entry);
    else onNavigate(item.kind === "character" ? "characters" : "world");
  };

  if (showBinder) {
    return (
      <ArtBinderPage
        database={database}
        readOnly={readOnly}
        onDatabaseChange={onDatabaseChange}
        initialFilter={binderFilter}
        initialSessionState={initialBinderSessionState}
        onSessionStateChange={onBinderSessionStateChange}
        onBack={() => {
          setShowBinder(false);
          setBinderFilter(null);
          onBinderVisibilityChange?.(false, null);
          onClearBinderFilter?.();
        }}
        onNavigate={onNavigate}
        onOpenEntry={onOpenEntry}
      />
    );
  }

  return (
    <section className="global-art-vault-page">
      <header className="global-art-vault-hero">
        <div>
          <p>Production Asset Hub</p>
          <h1 className="font-display">Art Vault</h1>
          <span>One dashboard for character, creature, and environment assets still needed for Tales of the Tavern.</span>
        </div>
        <div className="global-art-vault-hero-progress">
          <strong>{stats.percent}%</strong>
          <span>Asset Quest Complete</span>
          <div className="global-art-vault-progress-bar">
            <i style={{ width: `${stats.percent}%` }} />
          </div>
          <small>{stats.filled} of {stats.total} required assets filled</small>
        </div>
      </header>

      <section className="global-art-vault-stat-row">
        <StatCard label="Total Required" value={stats.total} icon="Image" />
        <StatCard label="Uploaded / Linked" value={stats.filled} icon="Upload" />
        <StatCard label="Still Missing" value={stats.missing} icon="ShieldAlert" />
        <StatCard label="Approved" value={stats.approved} icon="Star" />
      </section>

      <section className="global-art-vault-groups">
        {stats.groups.map((group) => (
          <GroupCard key={group.id} group={group} onChoose={() => setDestinationChoice({ type: "group", group })} />
        ))}
      </section>

      <section className="global-art-vault-board">
        <div className="global-art-vault-panel">
          <div className="global-art-vault-panel-heading">
            <div>
              <p>Next Uploads</p>
              <h2 className="font-display">Missing Asset Queue</h2>
            </div>
            <span>{stats.needsUpload.length} shown</span>
          </div>

          {stats.needsUpload.length ? (
            <div className="global-art-vault-queue">
              {stats.needsUpload.map((item) => (
                <ArtVaultQueueItem key={item.id} item={item} onOpen={() => openItem(item)} />
              ))}
            </div>
          ) : (
            <div className="global-art-vault-empty">
              <Icon name="Sparkles" className="h-10 w-10" />
              <strong>Every tracked asset slot is filled.</strong>
              <span>The board is clear. That little number is allowed to feel good.</span>
            </div>
          )}
        </div>

        <div className="global-art-vault-panel compact">
          <div className="global-art-vault-panel-heading">
            <div>
              <p>Asset Routes</p>
              <h2 className="font-display">Open a Board</h2>
            </div>
          </div>
          <div className="global-art-vault-route-list">
            <RouteButton icon="BookOpen" label="The Art Binder" detail="Open the shared category board for all assets." onClick={() => openBinder(null)} />
            <RouteButton icon="Users" label="Character Assets" detail="Choose Art Binder or the character page." onClick={() => setDestinationChoice({ type: "route", kind: "character", label: "Characters" })} />
            <RouteButton icon="Swords" label="Bestiary Assets" detail="Choose Art Binder or the Bestiary page." onClick={() => setDestinationChoice({ type: "route", kind: "bestiary", label: "Bestiary" })} />
            <RouteButton icon="Soup" label="Pantry Assets" detail="Choose Art Binder or the Pantry page." onClick={() => setDestinationChoice({ type: "route", kind: "pantry", label: "The Pantry" })} />
            <RouteButton icon="Map" label="Environment Assets" detail="Choose Art Binder or the World page." onClick={() => setDestinationChoice({ type: "route", kind: "environment", label: "Environment" })} />
          </div>
        </div>
      </section>

      {destinationChoice && (
        <ArtVaultDestinationModal
          choice={destinationChoice}
          onClose={() => setDestinationChoice(null)}
          onOpenBinder={(filter) => openBinder(filter)}
          onOpenSource={(choice) => {
            if (choice.type === "item") {
              openSourceForItem(choice.item);
              return;
            }
            const kind = choice.type === "group" ? groupIdToKind(choice.group.id) : choice.kind;
            setDestinationChoice(null);
            onNavigate(kindToView(kind));
          }}
        />
      )}
    </section>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <article className="global-art-vault-stat">
      <Icon name={icon} className="h-5 w-5" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

type ArtVaultDestinationChoice =
  | { type: "group"; group: ArtVaultDashboardGroup }
  | { type: "item"; item: ArtVaultDashboardItem }
  | { type: "route"; kind: Exclude<ArtBinderKind, "all">; label: string };

function GroupCard({ group, onChoose }: { group: ArtVaultDashboardGroup; onChoose: () => void }) {
  const realtime = useRealtimeCollaboration();
  const realtimeTarget = {
    type: "module" as const,
    id: `art-vault:group:${group.id}`,
    label: group.label,
    module: "Art Vault"
  };
  const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);

  return (
    <article
      className={`global-art-vault-group-card realtime-hover-surface ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
      onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
      onMouseLeave={() => realtime.setHoverTarget(null)}
    >
      {hoveringUsers.length > 0 && (
        <span className="realtime-hover-badge">
          {hoveringUsers.length === 1 ? `${hoveringUsers[0].name} is here` : `${hoveringUsers.length} people here`}
        </span>
      )}
      <div className="global-art-vault-group-top">
        <span>
          <Icon name={group.icon} className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display">{group.label}</h2>
          <p>{group.description}</p>
        </div>
      </div>
      <div className="global-art-vault-progress-bar">
        <i style={{ width: `${group.percent}%` }} />
      </div>
      <footer>
        <strong>{group.percent}%</strong>
        <span>{group.missing} missing</span>
        <button onClick={onChoose}>
          Open
        </button>
      </footer>
    </article>
  );
}

function ArtVaultQueueItem({ item, onOpen }: { item: ArtVaultDashboardItem; onOpen: () => void }) {
  const realtime = useRealtimeCollaboration();
  const realtimeTarget = {
    type: "art-slot" as const,
    id: `art-vault:item:${item.id}`,
    label: item.title,
    module: "Art Vault"
  };
  const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);

  return (
    <button
      className={`global-art-vault-queue-item realtime-hover-surface ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
      onClick={onOpen}
      onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
      onMouseLeave={() => realtime.setHoverTarget(null)}
    >
      {hoveringUsers.length > 0 && (
        <span className="realtime-hover-badge">
          {hoveringUsers.length === 1 ? `${hoveringUsers[0].name} is here` : `${hoveringUsers.length} people here`}
        </span>
      )}
      <span className="global-art-vault-queue-icon">
        <Icon name={kindIcon(item.kind)} className="h-4 w-4" />
      </span>
      <span>
        <strong>{item.title}</strong>
        <small>{item.subtitle} / {kindLabel(item.kind)}</small>
      </span>
      <span className="global-art-vault-mini-progress">
        <i style={{ width: `${item.percent}%` }} />
      </span>
      <em>{item.missing} missing</em>
    </button>
  );
}

function ArtVaultDestinationModal({
  choice,
  onClose,
  onOpenBinder,
  onOpenSource
}: {
  choice: ArtVaultDestinationChoice;
  onClose: () => void;
  onOpenBinder: (filter: ArtBinderInitialFilter | null) => void;
  onOpenSource: (choice: ArtVaultDestinationChoice) => void;
}) {
  const title = destinationTitle(choice);
  const kind = destinationKind(choice);
  const subjectId = choice.type === "item" ? choice.item.sourceId : undefined;

  return (
    <div className="global-art-vault-choice-backdrop" role="dialog" aria-modal="true">
      <section className="global-art-vault-choice">
        <button className="character-codex-icon-button" onClick={onClose} title="Close">
          <Icon name="X" className="h-5 w-5" />
        </button>
        <p>Choose Destination</p>
        <h2 className="font-display">{title}</h2>
        <span>Open the shared Art Binder category view, or jump to the regular source page.</span>
        <div>
          <button className="button-frame" onClick={() => onOpenBinder({ kind, subjectId })}>
            <Icon name="BookOpen" className="h-4 w-4" />
            Open in Art Binder
          </button>
          <button onClick={() => onOpenSource(choice)}>
            <Icon name={kindIconForBinder(kind)} className="h-4 w-4" />
            Go to {sourcePageLabel(kind)}
          </button>
        </div>
      </section>
    </div>
  );
}

function destinationTitle(choice: ArtVaultDestinationChoice) {
  if (choice.type === "group") return choice.group.label;
  if (choice.type === "item") return choice.item.title;
  return choice.label;
}

function destinationKind(choice: ArtVaultDestinationChoice): Exclude<ArtBinderKind, "all"> {
  if (choice.type === "group") return groupIdToKind(choice.group.id);
  if (choice.type === "item") return itemKindToBinderKind(choice.item.kind);
  return choice.kind;
}

function groupIdToKind(id: ArtVaultDashboardGroup["id"]): Exclude<ArtBinderKind, "all"> {
  if (id === "characters") return "character";
  if (id === "bestiary") return "bestiary";
  if (id === "pantry") return "pantry";
  return "environment";
}

function itemKindToBinderKind(kind: ArtVaultDashboardItem["kind"]): Exclude<ArtBinderKind, "all"> {
  if (kind === "character") return "character";
  if (kind === "bestiary") return "bestiary";
  if (kind === "pantry") return "pantry";
  return "environment";
}

function kindToView(kind: Exclude<ArtBinderKind, "all">): ActiveView {
  if (kind === "character") return "characters";
  if (kind === "bestiary") return "bestiary";
  if (kind === "pantry") return "food";
  return "world";
}

function sourcePageLabel(kind: Exclude<ArtBinderKind, "all">) {
  if (kind === "character") return "Characters Page";
  if (kind === "bestiary") return "Bestiary Page";
  if (kind === "pantry") return "Pantry Page";
  return "World Page";
}

function kindIconForBinder(kind: Exclude<ArtBinderKind, "all">) {
  if (kind === "character") return "Users";
  if (kind === "bestiary") return "Swords";
  if (kind === "pantry") return "Soup";
  return "Map";
}

function RouteButton({
  icon,
  label,
  detail,
  onClick
}: {
  icon: string;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  const realtime = useRealtimeCollaboration();
  const realtimeTarget = {
    type: "module" as const,
    id: `art-vault:route:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
    module: "Art Vault"
  };
  const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);

  return (
    <button
      className={`global-art-vault-route realtime-hover-surface ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
      onClick={onClick}
      onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
      onMouseLeave={() => realtime.setHoverTarget(null)}
    >
      {hoveringUsers.length > 0 && (
        <span className="realtime-hover-badge">
          {hoveringUsers.length === 1 ? `${hoveringUsers[0].name} is here` : `${hoveringUsers.length} people here`}
        </span>
      )}
      <Icon name={icon} className="h-5 w-5" />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

function kindIcon(kind: ArtVaultDashboardItem["kind"]) {
  if (kind === "character") return "Users";
  if (kind === "bestiary") return "Swords";
  if (kind === "pantry") return "Soup";
  return "Map";
}

function kindLabel(kind: ArtVaultDashboardItem["kind"]) {
  if (kind === "character") return "Character";
  if (kind === "bestiary") return "Bestiary";
  if (kind === "pantry") return "Pantry";
  return "Environment";
}
