import type {
  AssistantAction,
  AssistantMode,
  AssistantPatch,
  LoreDatabase,
  LoreEntry
} from "../types";
import { cloneDatabase, normalizeEntry, nowIso, slugify } from "./entries";

const assistantJsonInstructions = `Return only structured JSON in this exact shape:
{
  "summary": "Short explanation of proposed changes",
  "changes": [
    {
      "action": "update",
      "id": "entry-id",
      "field": "internalLore",
      "oldValue": "...",
      "newValue": "..."
    },
    {
      "action": "renameReference",
      "oldName": "Wiscan",
      "newName": "Whisken",
      "scope": "all"
    },
    {
      "action": "add",
      "entry": { }
    },
    {
      "action": "archive",
      "title": "Old Naming: Wiscan",
      "content": "Wiscan was an older name for Whisken."
    }
  ],
  "warnings": []
}
No blind overwrites. Prefer small precise changes and include warnings when canon or naming decisions are uncertain.`;

export const buildManualPrompt = (
  database: LoreDatabase,
  command: string,
  mode: AssistantMode
) => `You are helping organize The Tavern Cook Book, the local-first lore bible for Tales of the Tavern by STL Productionz.

Mode: ${mode}
User command: ${command}

${assistantJsonInstructions}

Compact lore context JSON:
${JSON.stringify(buildCompactLoreContext(database, command), null, 2)}`;

export const callAssistant = async (
  database: LoreDatabase,
  command: string,
  mode: AssistantMode
): Promise<AssistantPatch> => {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ database, command, mode })
  });

  const payload = (await response.json()) as { patch?: AssistantPatch; error?: string };
  if (!response.ok || !payload.patch) {
    throw new Error(payload.error || "Assistant call failed.");
  }
  return payload.patch;
};

export const parseAssistantPatch = (raw: string): AssistantPatch => {
  const parsed = JSON.parse(raw) as AssistantPatch;
  if (!parsed || !Array.isArray(parsed.changes)) {
    throw new Error("The pasted JSON does not contain a changes array.");
  }

  return {
    summary: parsed.summary || "Assistant patch",
    changes: parsed.changes,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
  };
};

const setDeepValue = (target: Record<string, unknown>, path: string, value: unknown) => {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;
  let cursor = target;

  parts.slice(0, -1).forEach((part) => {
    const next = cursor[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  });

  cursor[parts[parts.length - 1]] = value;
};

const replaceStringInUnknown = (value: unknown, oldName: string, newName: string): unknown => {
  if (typeof value === "string") {
    return value.split(oldName).join(newName);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStringInUnknown(item, oldName, newName));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceStringInUnknown(item, oldName, newName)])
    );
  }
  return value;
};

const applyAction = (entries: LoreEntry[], action: AssistantAction): LoreEntry[] => {
  if (action.action === "update") {
    return entries.map((entry) => {
      if (entry.id !== action.id) return entry;
      const next = cloneDatabase({
        schemaVersion: 1,
        entries: [entry],
        backups: [],
        branding: { studioName: "STL Productionz" }
      }).entries[0] as LoreEntry;
      setDeepValue(next as unknown as Record<string, unknown>, action.field, action.newValue);
      next.updatedAt = nowIso();
      return normalizeEntry(next);
    });
  }

  if (action.action === "renameReference") {
    return entries.map((entry) => {
      const replaced = replaceStringInUnknown(entry, action.oldName, action.newName) as LoreEntry;
      return normalizeEntry({ ...replaced, updatedAt: nowIso() });
    });
  }

  if (action.action === "add") {
    const newEntry = normalizeEntry({
      id: action.entry.id || `${slugify(action.entry.title || "assistant-entry")}-${Date.now()}`,
      category: action.entry.category || "Story",
      type: action.entry.type || "Lore Entry",
      status: action.entry.status || "Idea",
      spoilerLevel: action.entry.spoilerLevel || "No Spoiler",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...action.entry
    });
    return [newEntry, ...entries];
  }

  if (action.action === "archive") {
    const archiveEntry = normalizeEntry({
      id: `archive-${slugify(action.title)}-${Date.now()}`,
      title: action.title,
      category: "Archive",
      type: "AI Archive Note",
      status: "Old Version",
      spoilerLevel: "No Spoiler",
      tags: ["assistant", "archive"],
      summary: action.content,
      internalLore: action.content,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    return [archiveEntry, ...entries];
  }

  return entries;
};

export const applyAssistantPatch = (
  database: LoreDatabase,
  patch: AssistantPatch,
  selectedIndexes: number[],
  shouldBackup: boolean
): LoreDatabase => {
  const backupId = `ai-backup-${Date.now()}`;
  const selected = new Set(selectedIndexes);
  let entries = cloneDatabase(database).entries;

  patch.changes.forEach((change, index) => {
    if (selected.has(index)) {
      entries = applyAction(entries, change);
    }
  });

  const backup = {
    id: backupId,
    label: `AI change: ${patch.summary || "Assistant patch"}`,
    createdAt: nowIso(),
    entries: cloneDatabase(database).entries
  };

  return {
    ...database,
    entries,
    backups: shouldBackup ? [backup, ...database.backups].slice(0, 12) : database.backups,
    lastAiBackupId: shouldBackup ? backupId : database.lastAiBackupId
  };
};

export const undoLastAiChange = (database: LoreDatabase): LoreDatabase | null => {
  const backup = database.backups.find((item) => item.id === database.lastAiBackupId);
  if (!backup) return null;

  return {
    ...database,
    entries: cloneDatabase({
      schemaVersion: 1,
      entries: backup.entries,
      backups: [],
      branding: database.branding
    }).entries,
    lastAiBackupId: undefined
  };
};

const buildCompactLoreContext = (database: LoreDatabase, command: string) => {
  const scored = database.entries
    .map((entry) => ({ entry, score: scoreEntry(entry, command) }))
    .sort((a, b) => b.score - a.score);
  const relevantEntries = scored
    .filter((item) => item.score > 0)
    .slice(0, 24)
    .map((item) => compactEntry(item.entry, "full"));

  return {
    app: "The Tavern Cook Book",
    studio: database.branding.studioName,
    game: "Tales of the Tavern",
    totalEntries: database.entries.length,
    contextPolicy:
      "This compact context removes media payloads. For exact whole-database replacements, return renameReference instead of many update actions.",
    entryIndex: database.entries.map((entry) => compactEntry(entry, "index")),
    relevantEntries: relevantEntries.length
      ? relevantEntries
      : scored.slice(0, 12).map((item) => compactEntry(item.entry, "full"))
  };
};

const compactEntry = (entry: LoreEntry, depth: "index" | "full") => {
  const base = {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    type: entry.type,
    status: entry.status,
    spoilerLevel: entry.spoilerLevel,
    tags: entry.tags.slice(0, 12),
    summary: truncate(entry.summary, depth === "index" ? 360 : 900),
    connections: compactUnknown(entry.connections, depth === "index" ? 500 : 1200),
    unresolved: truncate(entry.notes.unresolved, 360)
  };

  if (depth === "index") return base;

  return {
    ...base,
    publicDescription: truncate(entry.publicDescription, 900),
    internalLore: truncate(entry.internalLore, 1600),
    fields: compactUnknown(entry.fields, 1800),
    notes: compactUnknown(entry.notes, 1000),
    timeline: compactUnknown(entry.timeline, 1000),
    secret: compactUnknown(entry.secret, 1000),
    wiki: compactUnknown(entry.wiki, 1000),
    updatedAt: entry.updatedAt
  };
};

const scoreEntry = (entry: LoreEntry, command: string) => {
  const terms = command
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
  const haystack = compactUnknown(
    {
      title: entry.title,
      category: entry.category,
      type: entry.type,
      tags: entry.tags,
      summary: entry.summary,
      publicDescription: entry.publicDescription,
      internalLore: entry.internalLore,
      fields: entry.fields,
      connections: entry.connections,
      notes: entry.notes,
      timeline: entry.timeline,
      secret: entry.secret,
      wiki: entry.wiki
    },
    12000
  ).toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += entry.title.toLowerCase().includes(term) ? 5 : 1;
  }
  if (entry.status === "Needs Rewrite") score += 1;
  if (entry.notes.unresolved) score += 1;
  return score;
};

const compactUnknown = (value: unknown, maxLength: number) =>
  truncate(JSON.stringify(stripMedia(value)), maxLength);

const stripMedia = (value: unknown): unknown => {
  if (value == null) return value;
  if (typeof value === "string") return value.startsWith("data:") ? "[media removed]" : value;
  if (Array.isArray(value)) return value.map(stripMedia);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(
          ([key]) =>
            !["media", "iconImage", "mainImage", "galleryImages", "uploadedVideos"].includes(key)
        )
        .map(([key, item]) => [key, stripMedia(item)])
    );
  }
  return value;
};

const truncate = (value: string, maxLength: number) => {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength)}... [truncated]` : value;
};

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "all",
  "make",
  "find",
  "update",
  "references",
  "reference",
  "lore",
  "entry",
  "entries"
]);
