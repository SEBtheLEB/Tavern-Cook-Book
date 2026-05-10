import { useEffect, useMemo, useState } from "react";
import type { ActiveView, LoreDatabase, LoreEntry } from "../types";
import {
  buildArtVaultDashboardStats,
  type ArtVaultDashboardGroup,
  type ArtVaultDashboardItem
} from "../utils/artVaultDashboard";
import { ArtBinderPage, type ArtBinderInitialFilter, type ArtBinderKind } from "./ArtBinderPage";
import { Icon } from "./Icon";

interface ArtVaultDashboardProps {
  database: LoreDatabase;
  readOnly: boolean;
  onDatabaseChange: (database: LoreDatabase) => void;
  onNavigate: (view: ActiveView) => void;
  onOpenEntry: (entry: LoreEntry) => void;
  initialBinderFilter?: ArtBinderInitialFilter | null;
  onClearBinderFilter?: () => void;
}

export function ArtVaultDashboard({
  database,
  readOnly,
  onDatabaseChange,
  onNavigate,
  onOpenEntry,
  initialBinderFilter = null,
  onClearBinderFilter
}: ArtVaultDashboardProps) {
  const stats = useMemo(() => buildArtVaultDashboardStats(database), [database]);
  const [binderFilter, setBinderFilter] = useState<ArtBinderInitialFilter | null>(initialBinderFilter);
  const [showBinder, setShowBinder] = useState(Boolean(initialBinderFilter));
  const [destinationChoice, setDestinationChoice] = useState<ArtVaultDestinationChoice | null>(null);

  useEffect(() => {
    if (!initialBinderFilter) return;
    setBinderFilter(initialBinderFilter);
    setShowBinder(true);
  }, [initialBinderFilter]);

  const openItem = (item: ArtVaultDashboardItem) => {
    setDestinationChoice({ type: "item", item });
  };

  const openBinder = (filter: ArtBinderInitialFilter | null) => {
    setBinderFilter(filter);
    setShowBinder(true);
    setDestinationChoice(null);
  };

  const openSourceForItem = (item: ArtVaultDashboardItem) => {
    setDestinationChoice(null);
    if (item.kind === "bestiary") {
      onNavigate("bestiary");
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
        onBack={() => {
          setShowBinder(false);
          setBinderFilter(null);
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
                <button key={item.id} className="global-art-vault-queue-item" onClick={() => openItem(item)}>
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
  return (
    <article className="global-art-vault-group-card">
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
  return "environment";
}

function itemKindToBinderKind(kind: ArtVaultDashboardItem["kind"]): Exclude<ArtBinderKind, "all"> {
  if (kind === "character") return "character";
  if (kind === "bestiary") return "bestiary";
  return "environment";
}

function kindToView(kind: Exclude<ArtBinderKind, "all">): ActiveView {
  if (kind === "character") return "characters";
  if (kind === "bestiary") return "bestiary";
  return "world";
}

function sourcePageLabel(kind: Exclude<ArtBinderKind, "all">) {
  if (kind === "character") return "Characters Page";
  if (kind === "bestiary") return "Bestiary Page";
  return "World Page";
}

function kindIconForBinder(kind: Exclude<ArtBinderKind, "all">) {
  if (kind === "character") return "Users";
  if (kind === "bestiary") return "Swords";
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
  return (
    <button className="global-art-vault-route" onClick={onClick}>
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
  return "Map";
}

function kindLabel(kind: ArtVaultDashboardItem["kind"]) {
  if (kind === "character") return "Character";
  if (kind === "bestiary") return "Bestiary";
  return "Environment";
}
