import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  AssistantAction,
  AssistantChangedTarget,
  AssistantMode,
  AssistantPatch,
  LoreDatabase,
  WorldBuildingCategoryId,
  WorldBuildingEntry
} from "../types";
import {
  applyAssistantPatch,
  buildManualPrompt,
  callAssistant,
  parseAssistantPatch,
  prepareAssistantPatchForCommand,
  undoLastAiChange
} from "../utils/assistant";
import { SCRIBE_TARGET_HELPERS, type ScribeTargetHelper } from "../utils/scribeCommands";
import { categoryConfig, worldBuildingCategoryIds } from "../utils/worldBuilding";
import { CustomSelect } from "./CustomSelect";
import { Icon } from "./Icon";

interface AssistantPanelProps {
  database: LoreDatabase;
  onDatabaseChange: (database: LoreDatabase) => void;
  embedded?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showLauncher?: boolean;
  onOpenChangedTarget?: (target: AssistantChangedTarget) => void;
}

const modes: AssistantMode[] = ["suggest", "patch", "analyze", "marketing", "contradictions"];

interface ScribeChangeReportItem {
  key: string;
  title: string;
  subtitle: string;
  summary: string;
  changeCount: number;
  target?: AssistantChangedTarget;
}

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
  showLauncher = true,
  onOpenChangedTarget
}: AssistantPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [mode, setMode] = useState<AssistantMode>("patch");
  const [loading, setLoading] = useState(false);
  const [patch, setPatch] = useState<AssistantPatch | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualPatch, setManualPatch] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [targetMenuOpen, setTargetMenuOpen] = useState(false);
  const [createBackup, setCreateBackup] = useState(true);
  const [message, setMessage] = useState("");
  const [lastSummary, setLastSummary] = useState("");
  const [changeReport, setChangeReport] = useState<ScribeChangeReportItem[]>([]);
  const [scribePosition, setScribePosition] = useState(getDefaultScribePosition);
  const [dragging, setDragging] = useState(false);
  const scribeWindowRef = useRef<HTMLElement | null>(null);
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null);
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

  const applyPatchWithReport = (
    parsedPatch: AssistantPatch,
    indexes: number[],
    shouldBackup: boolean,
    appliedMessage: string
  ) => {
    const before = database;
    const next = applyAssistantPatch(before, parsedPatch, indexes, shouldBackup);
    onDatabaseChange(next);
    setChangeReport(buildChangeReport(before, next, parsedPatch, indexes));
    setLastSummary(parsedPatch.summary);
    setMessage(appliedMessage);
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
        setChangeReport([]);
        setMessage(result.summary || "Tavern Scribe did not find any changes to apply.");
        return;
      }
      applyPatchWithReport(
        result,
        indexes,
        true,
        `Scribed ${result.changes.length} ${result.changes.length === 1 ? "change" : "changes"} into the Cook Book. A backup was created.`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Assistant call failed.";
      setMessage(`${errorMessage} You can use Manual ChatGPT Mode below to copy/paste without API billing.`);
      setManualOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const loadManualPatch = () => {
    try {
      const parsed = prepareAssistantPatchForCommand(database, parseAssistantPatch(manualPatch), command);
      setPatch(parsed);
      setSelected(parsed.changes.map((_, index) => index));
      setLastSummary(parsed.summary);
      setMessage(
        parsed.changes.length
          ? `Loaded ${parsed.changes.length} pasted ${parsed.changes.length === 1 ? "change" : "changes"}. Use Apply Pasted Response when ready.`
          : parsed.summary || "The pasted response did not include changes to apply."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read the assistant changes.");
    }
  };

  const generateManualPrompt = () => {
    if (!command.trim()) {
      setMessage("Type what should change first, then generate the manual prompt.");
      return;
    }
    const prompt = buildPrompt();
    setManualOpen(true);
    setMessage("Full ChatGPT prompt generated.");
    return prompt;
  };

  const copyManualPrompt = async () => {
    const prompt = manualPrompt || generateManualPrompt();
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setMessage("Full ChatGPT prompt copied.");
  };

  const applyManualPatch = () => {
    try {
      const parsed = prepareAssistantPatchForCommand(database, parseAssistantPatch(manualPatch), command);
      const indexes = parsed.changes.map((_, index) => index);
      setPatch(parsed);
      setSelected(indexes);
      if (!parsed.changes.length) {
        setChangeReport([]);
        setMessage(parsed.summary || "The pasted response did not include changes to apply.");
        return;
      }
      applyPatchWithReport(
        parsed,
        indexes,
        true,
        `Applied ${parsed.changes.length} pasted ${parsed.changes.length === 1 ? "change" : "changes"}. A backup was created.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not apply the pasted ChatGPT response.");
    }
  };

  const applySelected = () => {
    if (!patch) return;
    const next = applyAssistantPatch(database, patch, selected, createBackup);
    onDatabaseChange(next);
    setChangeReport(buildChangeReport(database, next, patch, selected));
    setMessage(`Applied ${selected.length} selected changes.`);
  };

  const undo = () => {
    const next = undoLastAiChange(database);
    if (!next) {
      setMessage("No AI backup available to undo.");
      return;
    }
    onDatabaseChange(next);
    setChangeReport([]);
    setMessage("Last AI change was undone.");
  };

  const applyScribeHelper = (helper: ScribeTargetHelper) => {
    const lines = command.split(/\r?\n/);
    const directiveLines = lines
      .map((line) => line.trim())
      .filter((line) => line.startsWith("[Scribe Target:") || line.startsWith("[Scribe Mode:"));
    const body = lines
      .filter((line) => {
        const trimmed = line.trim();
        return !trimmed.startsWith("[Scribe Target:") && !trimmed.startsWith("[Scribe Mode:");
      })
      .join("\n")
      .trimStart();
    const active = directiveLines.includes(helper.insertText);
    const nextDirectives = active
      ? directiveLines.filter((line) => line !== helper.insertText)
      : helper.group === "mode"
        ? [...directiveLines.filter((line) => !line.startsWith("[Scribe Mode:")), helper.insertText]
        : [...directiveLines, helper.insertText];
    const uniqueDirectives = nextDirectives.filter((line, index, list) => list.indexOf(line) === index);
    const nextCommand = [...uniqueDirectives, body].filter(Boolean).join("\n");
    setCommand(nextCommand ? `${nextCommand}${body ? "" : "\n"}` : "");
    setMessage(`${helper.label} helper ${active ? "removed" : "added"}.`);
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
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
                  ref={commandInputRef}
                  className="field tavern-scribe-command-input"
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  placeholder="Example: Gwen is now 25. Update every profile, timeline note, Whisken culture note, pantry item, bestiary section, or production slot that should reflect this."
                />
              </label>
              <div className="tavern-scribe-target-helper">
                <button
                  className="tavern-scribe-target-toggle"
                  type="button"
                  onClick={() => setTargetMenuOpen((current) => !current)}
                  aria-expanded={targetMenuOpen}
                >
                  <Icon name="ListChecks" className="h-4 w-4" />
                  Target Dropdown
                  <Icon name="ChevronDown" className={`h-4 w-4 ${targetMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {targetMenuOpen && (
                  <div className="tavern-scribe-target-menu">
                    <div className="tavern-scribe-helper-group">
                      <span>Target</span>
                      <div className="tavern-scribe-helper-grid">
                        {SCRIBE_TARGET_HELPERS.filter((helper) => helper.group === "target").map((helper) => (
                          <button
                            key={helper.id}
                            className={`tavern-scribe-helper-button ${command.includes(helper.insertText) ? "active" : ""}`}
                            type="button"
                            onClick={() => applyScribeHelper(helper)}
                          >
                            <strong>{helper.label}</strong>
                            <small>{helper.description}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="tavern-scribe-helper-group">
                      <span>Mode</span>
                      <div className="tavern-scribe-helper-grid">
                        {SCRIBE_TARGET_HELPERS.filter((helper) => helper.group === "mode").map((helper) => (
                          <button
                            key={helper.id}
                            className={`tavern-scribe-helper-button mode ${command.includes(helper.insertText) ? "active" : ""}`}
                            type="button"
                            onClick={() => applyScribeHelper(helper)}
                          >
                            <strong>{helper.label}</strong>
                            <small>{helper.description}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button className="button-frame tavern-scribe-it-button" onClick={run} disabled={loading}>
                <Icon name="Sparkles" className="h-4 w-4" />
                {loading ? "Scribing..." : "Scribe It"}
              </button>
            </section>

            <details
              className="tavern-scribe-manual"
              open={manualOpen}
              onToggle={(event) => setManualOpen(event.currentTarget.open)}
            >
              <summary>
                <span>Manual ChatGPT Mode</span>
                <Icon name="ChevronDown" className="h-4 w-4" />
              </summary>
              <div className="tavern-scribe-manual-scroll">
                <div className="tavern-scribe-manual-actions">
                  <button className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }} onClick={generateManualPrompt}>
                    Generate Full Prompt
                  </button>
                  <button className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }} onClick={copyManualPrompt}>
                    Copy Full Prompt
                  </button>
                </div>

                <label className="tavern-scribe-command-box">
                  <span>Prompt to paste into ChatGPT</span>
                  <textarea
                    className="field tavern-scribe-manual-textarea"
                    value={manualPrompt}
                    onChange={(event) => setManualPrompt(event.target.value)}
                    placeholder="Generate the full prompt, then paste it into ChatGPT."
                  />
                </label>

                <label className="tavern-scribe-command-box">
                  <span>Paste ChatGPT's JSON response here</span>
                  <textarea
                    className="field tavern-scribe-manual-paste"
                    value={manualPatch}
                    onChange={(event) => setManualPatch(event.target.value)}
                    placeholder="Paste the JSON response from ChatGPT here. Markdown code fences are okay."
                  />
                </label>

                <div className="tavern-scribe-manual-actions">
                  <button className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }} onClick={loadManualPatch}>
                    Check Pasted Response
                  </button>
                  <button className="button-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={applyManualPatch}>
                    <Icon name="Save" className="h-4 w-4" />
                    Apply Pasted Response
                  </button>
                </div>
              </div>
            </details>

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

            {changeReport.length ? (
              <section className="tavern-scribe-change-report" aria-label="Scribe changed modules">
                <div className="tavern-scribe-change-report-head">
                  <div>
                    <span>Changed Modules</span>
                    <h3>Review what Scribe touched</h3>
                  </div>
                  <strong>{changeReport.length}</strong>
                </div>
                <div className="tavern-scribe-change-list">
                  {changeReport.map((item) => (
                    <article className="tavern-scribe-change-card" key={item.key}>
                      <div>
                        <span>{item.subtitle}</span>
                        <h4>{item.title}</h4>
                        <p>{item.summary}</p>
                        <small>{item.changeCount} {item.changeCount === 1 ? "change" : "changes"}</small>
                      </div>
                      {item.target && onOpenChangedTarget ? (
                        <button className="button-frame tavern-scribe-open-change" onClick={() => onOpenChangedTarget(item.target!)}>
                          <Icon name="ExternalLink" className="h-4 w-4" />
                          Open
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

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

function buildChangeReport(
  before: LoreDatabase,
  after: LoreDatabase,
  patch: AssistantPatch,
  selectedIndexes: number[]
): ScribeChangeReportItem[] {
  const selected = new Set(selectedIndexes);
  const grouped = new Map<string, ScribeChangeReportItem>();

  patch.changes.forEach((change, index) => {
    if (!selected.has(index)) return;
    const item = resolveChangedItem(before, after, change);
    const existing = grouped.get(item.key);
    if (existing) {
      existing.changeCount += 1;
      if (!existing.summary.includes(describeChange(change))) {
        existing.summary = `${existing.summary}; ${describeChange(change)}`;
      }
      return;
    }
    grouped.set(item.key, item);
  });

  return [...grouped.values()].slice(0, 18);
}

function resolveChangedItem(
  before: LoreDatabase,
  after: LoreDatabase,
  change: AssistantAction
): ScribeChangeReportItem {
  if (change.action === "renameReference") {
    return {
      key: `all:${change.oldName}:${change.newName}`,
      title: "Whole Cook Book",
      subtitle: "Global Text Update",
      summary: `Renamed ${change.oldName} to ${change.newName}`,
      changeCount: 1
    };
  }

  if (change.action === "update") {
    const entry = findEntry(after, change.id);
    if (entry) return entryReport(entry, describeChange(change));
  }

  if (change.action === "setData") {
    const id = String(change.id || "");
    const entry = findEntry(after, id);
    if (entry) return entryReport(entry, describeChange(change));

    const creature = findCreature(after, id);
    if (creature) {
      return {
        key: `creature:${creature.id}`,
        title: creature.name,
        subtitle: "Bestiary Module",
        summary: describeChange(change),
        changeCount: 1,
        target: { kind: "creature", creatureId: creature.id }
      };
    }

    const worldEntry = findWorldEntry(after, id, change.category);
    if (worldEntry) return worldEntryReport(worldEntry, describeChange(change));

    const categoryName = String(change.categoryName || "");
    if (categoryName) {
      return {
        key: `bestiaryCategory:${categoryName}`,
        title: categoryName,
        subtitle: "Bestiary Category Module",
        summary: describeChange(change),
        changeCount: 1,
        target: { kind: "bestiaryCategory", categoryName }
      };
    }
  }

  if (change.action === "add") {
    const entry = findAddedEntry(before, after, change.entry.id, change.entry.title);
    if (entry) return entryReport(entry, describeChange(change));
  }

  if (change.action === "removeEntry") {
    const entry = findRemovedEntry(before, after, change.id, change.title);
    if (entry) {
      return {
        key: `removedEntry:${entry.id}`,
        title: entry.title,
        subtitle: "Removed Entry",
        summary: describeChange(change),
        changeCount: 1
      };
    }
  }

  if (change.action === "addCreature") {
    const creature = findAddedCreature(before, after, change.creature.id, change.creature.name);
    if (creature) {
      return {
        key: `creature:${creature.id}`,
        title: creature.name,
        subtitle: "Bestiary Module",
        summary: describeChange(change),
        changeCount: 1,
        target: { kind: "creature", creatureId: creature.id }
      };
    }
  }

  if (change.action === "removeCreature") {
    const creature = findRemovedCreature(before, after, change.id, change.name);
    if (creature) {
      return {
        key: `removedCreature:${creature.id}`,
        title: creature.name,
        subtitle: "Removed From Bestiary",
        summary: describeChange(change),
        changeCount: 1,
        target: { kind: "bestiaryCategory", categoryName: creature.category }
      };
    }
  }

  if (change.action === "addWorldEntry") {
    const worldEntry = findAddedWorldEntry(before, after, change.category, change.entry.id, change.entry.title);
    if (worldEntry) return worldEntryReport(worldEntry, describeChange(change));
  }

  if (
    change.action === "addArtSlot" ||
    change.action === "renameArtSlot" ||
    change.action === "removeArtSlot" ||
    change.action === "addArtCategory" ||
    change.action === "renameArtCategory" ||
    change.action === "removeArtCategory"
  ) {
    if (change.target === "entry" && change.id) {
      const entry = findEntry(after, change.id);
      if (entry) return entryReport(entry, describeChange(change));
    }
    if (change.target === "creature" && change.id) {
      const creature = findCreature(after, change.id);
      if (creature) {
        return {
          key: `creature:${creature.id}`,
          title: creature.name,
          subtitle: "Bestiary Art Module",
          summary: describeChange(change),
          changeCount: 1,
          target: { kind: "creature", creatureId: creature.id }
        };
      }
    }
    if (change.target === "bestiaryCategory" && change.categoryName) {
      return {
        key: `bestiaryCategory:${change.categoryName}`,
        title: change.categoryName,
        subtitle: "Bestiary Category Art Module",
        summary: describeChange(change),
        changeCount: 1,
        target: { kind: "bestiaryCategory", categoryName: change.categoryName }
      };
    }
  }

  if (change.action === "archive") {
    const entry = findAddedEntry(before, after, undefined, change.title);
    if (entry) return entryReport(entry, describeChange(change));
  }

  return {
    key: `change:${JSON.stringify(change).slice(0, 80)}`,
    title: "Cook Book Data",
    subtitle: "Scribe Change",
    summary: describeChange(change),
    changeCount: 1
  };
}

function entryReport(entry: LoreDatabase["entries"][number], summary: string): ScribeChangeReportItem {
  return {
    key: `entry:${entry.id}`,
    title: entry.title,
    subtitle: `${entry.category} Module`,
    summary,
    changeCount: 1,
    target: { kind: "entry", entryId: entry.id }
  };
}

function worldEntryReport(
  item: { category: WorldBuildingCategoryId; entry: WorldBuildingEntry },
  summary: string
): ScribeChangeReportItem {
  const config = categoryConfig(item.category);
  return {
    key: `worldEntry:${item.category}:${item.entry.id}`,
    title: item.entry.title,
    subtitle: `World Building / ${config.title}`,
    summary,
    changeCount: 1,
    target: { kind: "worldEntry", worldCategory: item.category, worldEntryId: item.entry.id }
  };
}

function findEntry(database: LoreDatabase, id: string) {
  return database.entries.find((entry) => entry.id === id) || null;
}

function findCreature(database: LoreDatabase, id: string) {
  return (database.bestiary || []).find((creature) => creature.id === id) || null;
}

function findWorldEntry(database: LoreDatabase, id: string, category?: string) {
  const categories = validWorldReportCategory(category) ? [category as WorldBuildingCategoryId] : worldBuildingCategoryIds;
  for (const categoryId of categories) {
    const entry = (database.worldBuilding?.[categoryId] || []).find((candidate) => candidate.id === id);
    if (entry) return { category: categoryId, entry };
  }
  return null;
}

function findAddedEntry(before: LoreDatabase, after: LoreDatabase, id?: string, title?: string) {
  const beforeIds = new Set(before.entries.map((entry) => entry.id));
  if (id) {
    const entry = after.entries.find((candidate) => candidate.id === id);
    if (entry) return entry;
  }
  const normalizedTitle = String(title || "").trim().toLowerCase();
  return after.entries.find((entry) => !beforeIds.has(entry.id) && (!normalizedTitle || entry.title.toLowerCase() === normalizedTitle)) || null;
}

function findRemovedEntry(before: LoreDatabase, after: LoreDatabase, id?: string, title?: string) {
  const afterIds = new Set(after.entries.map((entry) => entry.id));
  if (id) {
    const entry = before.entries.find((candidate) => candidate.id === id);
    if (entry && !afterIds.has(entry.id)) return entry;
  }
  const normalizedTitle = String(title || "").trim().toLowerCase();
  return before.entries.find((entry) =>
    !afterIds.has(entry.id) && (!normalizedTitle || entry.title.toLowerCase() === normalizedTitle)
  ) || null;
}

function findAddedCreature(before: LoreDatabase, after: LoreDatabase, id?: string, name?: string) {
  const beforeIds = new Set((before.bestiary || []).map((creature) => creature.id));
  if (id) {
    const creature = (after.bestiary || []).find((candidate) => candidate.id === id);
    if (creature) return creature;
  }
  const normalizedName = String(name || "").trim().toLowerCase();
  return (after.bestiary || []).find((creature) => !beforeIds.has(creature.id) && (!normalizedName || creature.name.toLowerCase() === normalizedName)) || null;
}

function findRemovedCreature(before: LoreDatabase, after: LoreDatabase, id?: string, name?: string) {
  const afterIds = new Set((after.bestiary || []).map((creature) => creature.id));
  if (id) {
    const creature = (before.bestiary || []).find((candidate) => candidate.id === id);
    if (creature && !afterIds.has(creature.id)) return creature;
  }
  const normalizedName = String(name || "").trim().toLowerCase();
  return (before.bestiary || []).find((creature) =>
    !afterIds.has(creature.id) && (!normalizedName || creature.name.toLowerCase() === normalizedName)
  ) || null;
}

function findAddedWorldEntry(
  before: LoreDatabase,
  after: LoreDatabase,
  category: string,
  id?: string,
  title?: string
) {
  const categoryId = validWorldReportCategory(category) ? category as WorldBuildingCategoryId : "glossary";
  const beforeIds = new Set((before.worldBuilding?.[categoryId] || []).map((entry) => entry.id));
  if (id) {
    const entry = (after.worldBuilding?.[categoryId] || []).find((candidate) => candidate.id === id);
    if (entry) return { category: categoryId, entry };
  }
  const normalizedTitle = String(title || "").trim().toLowerCase();
  const entry = (after.worldBuilding?.[categoryId] || []).find((candidate) =>
    !beforeIds.has(candidate.id) && (!normalizedTitle || candidate.title.toLowerCase() === normalizedTitle)
  );
  return entry ? { category: categoryId, entry } : null;
}

function validWorldReportCategory(value: unknown): value is WorldBuildingCategoryId {
  return worldBuildingCategoryIds.includes(value as WorldBuildingCategoryId);
}

function describeChange(change: AssistantAction) {
  if (change.action === "update") return `Updated ${humanLabel(change.field)}`;
  if (change.action === "setData") return `Updated ${humanLabel(change.path.split(".").slice(-1)[0] || change.path)}`;
  if (change.action === "renameReference") return `Rename ${change.oldName} to ${change.newName}`;
  if (change.action === "add") return `Add ${change.entry.title || "new entry"}`;
  if (change.action === "removeEntry") return `Remove entry ${change.title || change.id || "from Cook Book"}`;
  if (change.action === "addCreature") return `Add creature ${change.creature.name || "new creature"}`;
  if (change.action === "removeCreature") return `Remove creature ${change.name || change.id || "from Bestiary"}`;
  if (change.action === "addWorldEntry") return `Add world entry ${change.entry.title || "new world entry"}`;
  if (change.action === "addArtCategory") return `Add art category ${change.sectionTitle}`;
  if (change.action === "renameArtCategory") return `Rename art category ${change.sectionTitle || change.sectionId || "selected category"} to ${change.newTitle}`;
  if (change.action === "removeArtCategory") return `Remove art category ${change.sectionTitle || change.sectionId || "selected category"}`;
  if (change.action === "addArtSlot") return `Add slot ${change.label}`;
  if (change.action === "renameArtSlot") return `Rename slot ${change.label || change.slotId || "selected slot"} to ${change.newLabel}`;
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
  if (change.action === "removeEntry") {
    return <ValuePreview label="Removed entry" value={{ id: change.id, title: change.title, archiveTitle: change.archiveTitle }} />;
  }
  if (change.action === "addCreature") {
    return <ValuePreview label="New creature details" value={change.creature} />;
  }
  if (change.action === "removeCreature") {
    return <ValuePreview label="Removed creature" value={{ id: change.id, name: change.name, archiveTitle: change.archiveTitle }} />;
  }
  if (change.action === "addWorldEntry") {
    return <ValuePreview label="New world entry details" value={change.entry} />;
  }
  if (
    change.action === "addArtSlot" ||
    change.action === "renameArtSlot" ||
    change.action === "removeArtSlot" ||
    change.action === "addArtCategory" ||
    change.action === "renameArtCategory" ||
    change.action === "removeArtCategory"
  ) {
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
