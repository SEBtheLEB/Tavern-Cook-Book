import { useMemo, useState } from "react";
import type { AssistantAction, AssistantMode, AssistantPatch, LoreDatabase } from "../types";
import {
  applyAssistantPatch,
  buildManualPrompt,
  callAssistant,
  parseAssistantPatch,
  undoLastAiChange
} from "../utils/assistant";
import { Icon } from "./Icon";

interface AssistantPanelProps {
  database: LoreDatabase;
  onDatabaseChange: (database: LoreDatabase) => void;
}

const modes: AssistantMode[] = ["suggest", "patch", "analyze", "marketing", "contradictions"];

export function AssistantPanel({ database, onDatabaseChange }: AssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [mode, setMode] = useState<AssistantMode>("patch");
  const [loading, setLoading] = useState(false);
  const [patch, setPatch] = useState<AssistantPatch | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualPatch, setManualPatch] = useState("");
  const [createBackup, setCreateBackup] = useState(true);
  const [message, setMessage] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);

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
    try {
      const result = await callAssistant(database, command, mode);
      setPatch(result);
      setSelected(result.changes.map((_, index) => index));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assistant call failed.");
      buildPrompt();
    } finally {
      setLoading(false);
    }
  };

  const loadManualPatch = () => {
    try {
      const parsed = parseAssistantPatch(manualPatch);
      setPatch(parsed);
      setSelected(parsed.changes.map((_, index) => index));
      setMessage("Manual JSON patch loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not parse assistant JSON.");
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
      <div className="group fixed bottom-4 right-0 z-30 translate-x-[132px] transition hover:translate-x-0">
        <div className="assistant-frame flex items-center gap-3 rounded-l-full px-3 py-2">
          <button
            className="button-frame grid h-12 w-12 place-items-center rounded-full"
            onClick={() => setOpen(true)}
            title="Open assistant"
          >
            <Icon name="WandSparkles" className="h-5 w-5" />
          </button>
          <div className="w-52 pr-2">
            <p className="text-sm font-semibold">Need help sorting the Cook Book?</p>
            <div className="mt-1 flex gap-1">
              <input
                className="field min-w-0 flex-1 rounded px-2 py-1 text-xs"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setOpen(true);
                    run();
                  }
                }}
              />
              <button className="rounded border px-2 text-xs" style={{ borderColor: "var(--panel-border)" }} onClick={() => setOpen(true)}>
                Go
              </button>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close assistant" />
          <aside className="assistant-frame entry-scroll absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col overflow-hidden border-l" style={{ borderColor: "var(--panel-border)" }}>
            <header className="flex items-start gap-3 border-b p-4" style={{ borderColor: "var(--card-border)" }}>
              <div className="button-frame grid h-12 w-12 place-items-center rounded-full">
                <Icon name="WandSparkles" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-[0.18em]" style={{ color: "var(--muted-ink)" }}>
                  The Tavern Cook Book
                </p>
                <h2 className="font-display text-3xl">Assistant</h2>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--muted-ink)" }}>
                  Sort, update, rename, rewrite, cross-reference, and clean up lore with previewed changes.
                </p>
              </div>
              <button className="rounded p-2 hover:bg-black/10" onClick={() => setOpen(false)}>
                <Icon name="X" className="h-5 w-5" />
              </button>
            </header>

            <div className="entry-scroll flex-1 space-y-5 overflow-y-auto p-4">
              {message && <div className="rounded border p-3 text-sm" style={{ borderColor: "var(--panel-border)" }}>{message}</div>}

              <section className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Command</span>
                  <textarea
                    className="field min-h-28 w-full rounded px-3 py-2"
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    placeholder="Rename Wiscan to Whisken everywhere."
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select className="field rounded px-3 py-2" value={mode} onChange={(event) => setMode(event.target.value as AssistantMode)}>
                    {modes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <button className="button-frame inline-flex items-center justify-center gap-2 rounded px-4 py-2" onClick={run} disabled={loading}>
                    <Icon name="Sparkles" className="h-4 w-4" />
                    {loading ? "Running..." : "Run Assistant"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }} onClick={buildPrompt}>
                    Build Manual Prompt
                  </button>
                  <button
                    className="rounded border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--panel-border)" }}
                    onClick={async () => {
                      const prompt = manualPrompt || buildPrompt();
                      await navigator.clipboard.writeText(prompt);
                      setMessage("Prompt copied.");
                    }}
                  >
                    Copy Prompt
                  </button>
                  <button className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }} onClick={undo}>
                    Undo Last AI Change
                  </button>
                </div>
              </section>

              {manualPrompt && (
                <section className="space-y-2">
                  <h3 className="font-display text-xl">Manual Prompt</h3>
                  <textarea className="field min-h-40 w-full rounded px-3 py-2 font-mono text-xs" value={manualPrompt} onChange={(event) => setManualPrompt(event.target.value)} />
                </section>
              )}

              <section className="space-y-2">
                <h3 className="font-display text-xl">Paste Returned JSON Patch</h3>
                <textarea
                  className="field min-h-32 w-full rounded px-3 py-2 font-mono text-xs"
                  value={manualPatch}
                  onChange={(event) => setManualPatch(event.target.value)}
                />
                <button className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }} onClick={loadManualPatch}>
                  Preview Pasted Patch
                </button>
              </section>

              {patch && (
                <section className="space-y-3">
                  <div className="rounded border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--field-bg)" }}>
                    <h3 className="font-display text-xl">Preview Changes</h3>
                    <p className="mt-1 text-sm leading-6">{patch.summary}</p>
                    {patch.warnings.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {patch.warnings.map((warning) => (
                          <li key={warning}>Warning: {warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2">
                    {patch.changes.map((change, index) => (
                      <label key={`${index}-${describeChange(change)}`} className="block rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedSet.has(index)}
                            onChange={(event) => {
                              if (event.target.checked) setSelected((items) => [...items, index]);
                              else setSelected((items) => items.filter((item) => item !== index));
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{describeChange(change)}</p>
                            <ChangeDetails change={change} />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={createBackup} onChange={(event) => setCreateBackup(event.target.checked)} />
                    Create Backup Before Applying
                  </label>
                  <button className="button-frame w-full rounded px-4 py-3" onClick={applySelected}>
                    Apply Selected Changes
                  </button>
                </section>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function describeChange(change: AssistantAction) {
  if (change.action === "update") return `Update ${change.field} on ${change.id}`;
  if (change.action === "renameReference") return `Rename ${change.oldName} to ${change.newName}`;
  if (change.action === "add") return `Add ${change.entry.title || "new entry"}`;
  return `Archive ${change.title}`;
}

function ChangeDetails({ change }: { change: AssistantAction }) {
  if (change.action === "update") {
    return (
      <div className="mt-2 grid gap-2 text-xs">
        <pre className="entry-scroll max-h-32 overflow-auto rounded bg-black/10 p-2">{JSON.stringify(change.oldValue, null, 2)}</pre>
        <pre className="entry-scroll max-h-32 overflow-auto rounded bg-black/10 p-2">{JSON.stringify(change.newValue, null, 2)}</pre>
      </div>
    );
  }
  if (change.action === "renameReference") {
    return <p className="mt-1 text-sm">Scope: {change.scope || "all"}</p>;
  }
  if (change.action === "add") {
    return <pre className="entry-scroll mt-2 max-h-36 overflow-auto rounded bg-black/10 p-2 text-xs">{JSON.stringify(change.entry, null, 2)}</pre>;
  }
  return <p className="mt-1 text-sm">{change.content}</p>;
}
