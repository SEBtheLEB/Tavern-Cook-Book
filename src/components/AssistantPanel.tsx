import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { AssistantAction, AssistantMode, AssistantPatch, LoreDatabase } from "../types";
import {
  applyAssistantPatch,
  buildManualPrompt,
  callAssistant,
  parseAssistantPatch,
  undoLastAiChange
} from "../utils/assistant";
import { CustomSelect } from "./CustomSelect";
import { Icon } from "./Icon";

interface AssistantPanelProps {
  database: LoreDatabase;
  onDatabaseChange: (database: LoreDatabase) => void;
  embedded?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showLauncher?: boolean;
}

const modes: AssistantMode[] = ["suggest", "patch", "analyze", "marketing", "contradictions"];

const getDefaultScribePosition = () => {
  if (typeof window === "undefined") {
    return { x: 24, y: 96 };
  }

  const width = Math.min(560, window.innerWidth - 24);
  return {
    x: Math.max(12, window.innerWidth - width - 24),
    y: 96
  };
};

const clampScribePosition = (position: { x: number; y: number }, element?: HTMLElement | null) => {
  if (typeof window === "undefined") return position;

  const width = element?.offsetWidth || Math.min(560, window.innerWidth - 24);
  const height = element?.offsetHeight || Math.min(760, window.innerHeight - 24);
  const maxX = Math.max(12, window.innerWidth - width - 12);
  const maxY = Math.max(12, window.innerHeight - Math.min(height, window.innerHeight - 24) - 12);

  return {
    x: Math.min(Math.max(12, position.x), maxX),
    y: Math.min(Math.max(12, position.y), maxY)
  };
};

export function AssistantPanel({
  database,
  onDatabaseChange,
  embedded = false,
  open,
  onOpenChange,
  showLauncher = true
}: AssistantPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [mode, setMode] = useState<AssistantMode>("patch");
  const [loading, setLoading] = useState(false);
  const [patch, setPatch] = useState<AssistantPatch | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualPatch, setManualPatch] = useState("");
  const [createBackup, setCreateBackup] = useState(true);
  const [message, setMessage] = useState("");
  const [lastSummary, setLastSummary] = useState("");
  const [scribePosition, setScribePosition] = useState(getDefaultScribePosition);
  const [dragging, setDragging] = useState(false);
  const scribeWindowRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const isOpen = open ?? internalOpen;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const setAssistantOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setScribePosition((current) => clampScribePosition(current, scribeWindowRef.current));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setScribePosition(
        clampScribePosition(
          {
            x: event.clientX - drag.offsetX,
            y: event.clientY - drag.offsetY
          },
          scribeWindowRef.current
        )
      );
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging]);

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, input, textarea, select, [data-no-drag='true']")) return;

    const rect = scribeWindowRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const buildPrompt = () => {
    const prompt = buildManualPrompt(database, command, mode);
    setManualPrompt(prompt);
    return prompt;
  };

  const run = async () => {
    if (!command.trim()) {
      setMessage("Enter a command first.");
      return;
    }
    setLoading(true);
    setMessage("");
    setLastSummary("");
    try {
      const result = await callAssistant(database, command, mode);
      setPatch(result);
      const indexes = result.changes.map((_, index) => index);
      setSelected(indexes);
      if (!result.changes.length) {
        setMessage(result.summary || "Tavern Scribe did not find any changes to apply.");
        return;
      }
      onDatabaseChange(applyAssistantPatch(database, result, indexes, true));
      setLastSummary(result.summary);
      setMessage(`Scribed ${result.changes.length} ${result.changes.length === 1 ? "change" : "changes"} into the Cook Book. A backup was created.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assistant call failed.");
    } finally {
      setLoading(false);
    }
  };

  const loadManualPatch = () => {
    try {
      const parsed = parseAssistantPatch(manualPatch);
      setPatch(parsed);
      setSelected(parsed.changes.map((_, index) => index));
      setMessage("Manual assistant changes loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read the assistant changes.");
    }
  };

  const applySelected = () => {
    if (!patch) return;
    const next = applyAssistantPatch(database, patch, selected, createBackup);
    onDatabaseChange(next);
    setMessage(`Applied ${selected.length} selected changes.`);
  };

  const undo = () => {
    const next = undoLastAiChange(database);
    if (!next) {
      setMessage("No AI backup available to undo.");
      return;
    }
    onDatabaseChange(next);
    setMessage("Last AI change was undone.");
  };

  return (
    <>
      {embedded ? (
        <section className="assistant-frame settings-assistant-panel rounded p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl">Tavern Scribe</h3>
              <p className="mt-1 text-sm leading-6" style={{ color: "var(--muted-ink)" }}>
                Type what should change in the Cook Book. Scribe can update lore text, fields, bestiary details, pantry entries, world notes, and production slots.
              </p>
            </div>
            <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={() => setAssistantOpen(true)}>
              <Icon name="WandSparkles" className="h-4 w-4" />
              Open Scribe
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="field min-w-0 rounded px-3 py-2 text-sm"
              value={command}
              placeholder="Example: Rename Wiscan to Whisken everywhere."
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setAssistantOpen(true);
                  run();
                }
              }}
            />
            <button className="button-frame rounded px-4 py-2" onClick={() => setAssistantOpen(true)}>
              Open
            </button>
          </div>
        </section>
      ) : showLauncher ? (
        <div className="group fixed bottom-4 right-0 z-30 translate-x-[132px] transition hover:translate-x-0">
          <div className="assistant-frame flex items-center gap-3 rounded-l-full px-3 py-2">
            <button
              className="button-frame grid h-12 w-12 place-items-center rounded-full"
              onClick={() => setAssistantOpen(true)}
              title="Open Tavern Scribe"
            >
              <Icon name="WandSparkles" className="h-5 w-5" />
            </button>
            <div className="w-52 pr-2">
              <p className="text-sm font-semibold">Tavern Scribe</p>
              <div className="mt-1 flex gap-1">
                <input
                  className="field min-w-0 flex-1 rounded px-2 py-1 text-xs"
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setAssistantOpen(true);
                      run();
                    }
                  }}
                />
                <button className="rounded border px-2 text-xs" style={{ borderColor: "var(--panel-border)" }} onClick={() => setAssistantOpen(true)}>
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isOpen && (
        <aside
          ref={scribeWindowRef}
          className={`assistant-frame tavern-scribe-window ${dragging ? "is-dragging" : ""}`}
          style={{
            left: scribePosition.x,
            top: scribePosition.y
          }}
        >
          <header className="tavern-scribe-header" onPointerDown={beginDrag}>
            <div className="button-frame grid h-12 w-12 place-items-center rounded-full">
              <Icon name="WandSparkles" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm uppercase tracking-[0.18em]" style={{ color: "var(--muted-ink)" }}>
                The Tavern Cook Book
              </p>
              <h2 className="font-display text-3xl">Tavern Scribe</h2>
              <p className="mt-1 text-sm leading-6" style={{ color: "var(--muted-ink)" }}>
                Drag this window by the header and keep the lore page visible while you write.
              </p>
            </div>
            <button
              className="rounded p-2 hover:bg-black/10"
              onClick={() => setScribePosition(getDefaultScribePosition())}
              title="Reset position"
            >
              <Icon name="RefreshCw" className="h-5 w-5" />
            </button>
            <button className="rounded p-2 hover:bg-black/10" onClick={() => setAssistantOpen(false)} title="Close Tavern Scribe">
              <Icon name="X" className="h-5 w-5" />
            </button>
          </header>

          <div className="entry-scroll tavern-scribe-body p-4">
            <section className="tavern-scribe-simple-panel">
              <label className="tavern-scribe-command-box">
                <span>What should change?</span>
              <textarea
                  className="field tavern-scribe-command-input"
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  placeholder="Example: Gwen is now 25. Update every profile, timeline note, Whisken culture note, pantry item, bestiary section, or production slot that should reflect this."
              />
              </label>
              <button className="button-frame tavern-scribe-it-button" onClick={run} disabled={loading}>
                <Icon name="Sparkles" className="h-4 w-4" />
                {loading ? "Scribing..." : "Scribe It"}
              </button>
            </section>

            {message && (
              <div className="tavern-scribe-message">
                <p>{message}</p>
                {patch?.warnings?.length ? (
                  <ul>
                    {patch.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}

            {lastSummary && (
              <div className="tavern-scribe-summary">
                <span>Last Scribed Change</span>
                <p>{lastSummary}</p>
              </div>
            )}

            <div className="tavern-scribe-footer-actions">
              <button className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }} onClick={undo}>
                Undo Last Scribe Change
                </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}

function describeChange(change: AssistantAction) {
  if (change.action === "update") return `Update ${change.field} on ${change.id}`;
  if (change.action === "setData") return `Update ${change.path} on ${change.target}`;
  if (change.action === "renameReference") return `Rename ${change.oldName} to ${change.newName}`;
  if (change.action === "add") return `Add ${change.entry.title || "new entry"}`;
  if (change.action === "addCreature") return `Add creature ${change.creature.name || "new creature"}`;
  if (change.action === "addWorldEntry") return `Add world entry ${change.entry.title || "new world entry"}`;
  if (change.action === "addArtSlot") return `Add slot ${change.label}`;
  if (change.action === "removeArtSlot") return `Remove slot ${change.label || change.slotId || "selected slot"}`;
  return `Archive ${change.title}`;
}

function ChangeDetails({ change }: { change: AssistantAction }) {
  if (change.action === "update" || change.action === "setData") {
    return (
      <div className="mt-2 grid gap-2 text-sm">
        <ValuePreview label="Before" value={change.oldValue} />
        <ValuePreview label="After" value={change.newValue} />
      </div>
    );
  }
  if (change.action === "renameReference") {
    return <p className="mt-1 text-sm">Scope: {change.scope || "all"}</p>;
  }
  if (change.action === "add") {
    return <ValuePreview label="New entry details" value={change.entry} />;
  }
  if (change.action === "addCreature") {
    return <ValuePreview label="New creature details" value={change.creature} />;
  }
  if (change.action === "addWorldEntry") {
    return <ValuePreview label="New world entry details" value={change.entry} />;
  }
  if (change.action === "addArtSlot" || change.action === "removeArtSlot") {
    return <p className="mt-1 text-sm">Target: {change.target}</p>;
  }
  return <p className="mt-1 text-sm">{change.content}</p>;
}

function ValuePreview({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded border p-2" style={{ borderColor: "var(--card-border)", background: "var(--panel-bg)" }}>
      <p className="text-xs font-semibold uppercase" style={{ color: "var(--muted-ink)" }}>
        {label}
      </p>
      <div className="mt-1 whitespace-pre-wrap leading-6">{formatPreviewValue(value)}</div>
    </div>
  );
}

function formatPreviewValue(value: unknown): string {
  if (value == null || value === "") return "Empty";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatPreviewValue(item)).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, item]) => item != null && item !== "" && (!Array.isArray(item) || item.length > 0))
      .map(([key, item]) => `${humanLabel(key)}: ${formatPreviewValue(item)}`)
      .join("\n");
  }
  return String(value);
}

function humanLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
