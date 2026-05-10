import type {
  AssistantAction,
  AssistantMode,
  AssistantPatch,
  ArtVaultSection,
  ArtVaultSlot,
  BestiaryCategoryArtVault,
  BestiaryCreature,
  LoreDatabase,
  LoreEntry,
  WorldBuildingCategoryId,
  WorldBuildingEntry
} from "../types";
import { cloneDatabase, normalizeEntry, nowIso, slugify } from "./entries";
import { createBestiaryCategoryArtVaultRecord, normalizeBestiaryCategoryArtVault, normalizeBestiaryCreature } from "./bestiary";
import { createEmptyWorldBuilding, createWorldBuildingEntry, worldBuildingCategoryIds } from "./worldBuilding";

const assistantJsonInstructions = `Return only structured JSON in this exact shape:
{
  "summary": "Short explanation of proposed changes",
  "changes": [
    {
      "action": "setData",
      "target": "entry",
      "id": "entry-id",
      "path": "internalLore",
      "oldValue": "...",
      "newValue": "..."
    },
    {
      "action": "setData",
      "target": "creature",
      "id": "creature-id",
      "path": "stats.health",
      "newValue": "Medium"
    },
    {
      "action": "setData",
      "target": "worldEntry",
      "category": "cultures",
      "id": "world-entry-id",
      "path": "fields.beliefsCustoms",
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
      "action": "addCreature",
      "creature": { "name": "New Creature" }
    },
    {
      "action": "addWorldEntry",
      "category": "cultures",
      "entry": { "title": "New Culture", "summary": "..." }
    },
    {
      "action": "addArtSlot",
      "target": "creature",
      "id": "creature-id",
      "sectionTitle": "Production Art",
      "label": "New Slot"
    },
    {
      "action": "removeArtSlot",
      "target": "bestiaryCategory",
      "categoryName": "Insects",
      "label": "Old Slot"
    },
    {
      "action": "archive",
      "title": "Old Naming: Wiscan",
      "content": "Wiscan was an older name for Whisken."
    }
  ],
  "warnings": []
}
Rules: only change app database content such as text, fields, tags, bestiary stats/drops/lore, world-building fields, and art slot labels. Never propose code, layout, CSS, API keys, images, Drive file deletion, or development changes. Prefer precise updates across every related place that should reflect the user's instruction. Include warnings when canon or naming decisions are uncertain.`;

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
  const parsed = JSON.parse(extractJsonPayload(raw)) as AssistantPatch;
  if (!parsed || !Array.isArray(parsed.changes)) {
    throw new Error("The pasted JSON does not contain a changes array.");
  }

  return {
    summary: parsed.summary || "Assistant patch",
    changes: parsed.changes,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
  };
};

const extractJsonPayload = (raw: string) => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
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

const forbiddenPathParts = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "media",
  "image",
  "images",
  "imagefit",
  "iconimage",
  "mainimage",
  "logoimage",
  "picture",
  "thumbnailurl",
  "webviewlink",
  "drivefileid",
  "drivefolderid",
  "drivefolderlink",
  "apikey",
  "apiKey",
  "secret",
  "token"
].map((part) => part.toLowerCase()));

const pathParts = (path: string) =>
  path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

const canSetDataPath = (path: string) => {
  const parts = pathParts(path);
  if (!parts.length) return false;
  return parts.every((part) => !forbiddenPathParts.has(part.toLowerCase()));
};

const safeSetDeepValue = (target: Record<string, unknown>, path: string, value: unknown) => {
  if (!canSetDataPath(path)) return false;
  setDeepValue(target, path, value);
  return true;
};

const setDatabaseValue = (
  database: LoreDatabase,
  action: Extract<AssistantAction, { action: "setData" }>
): LoreDatabase => {
  const stamp = nowIso();

  if (action.target === "entry" && action.id) {
    return {
      ...database,
      entries: database.entries.map((entry) => {
        if (entry.id !== action.id) return entry;
        const next = cloneDatabase({
          schemaVersion: 1,
          entries: [entry],
          bestiary: [],
          bestiaryCategoryVaults: [],
          worldBuilding: createEmptyWorldBuilding(),
          backups: [],
          branding: { studioName: "STL Productionz" }
        }).entries[0] as LoreEntry;
        if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.path, action.newValue)) return entry;
        next.updatedAt = stamp;
        return normalizeEntry(next);
      })
    };
  }

  if (action.target === "creature" && action.id) {
    return {
      ...database,
      bestiary: (database.bestiary || []).map((creature) => {
        if (creature.id !== action.id) return creature;
        const next = cloneDatabase({
          schemaVersion: 1,
          entries: [],
          bestiary: [creature],
          bestiaryCategoryVaults: [],
          worldBuilding: createEmptyWorldBuilding(),
          backups: [],
          branding: { studioName: "STL Productionz" }
        }).bestiary[0] as BestiaryCreature;
        if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.path, action.newValue)) return creature;
        next.updatedAt = stamp;
        return normalizeBestiaryCreature(next);
      })
    };
  }

  if (action.target === "worldEntry" && action.id) {
    const categoryHint = validWorldCategory(action.category || "");
    const categories = categoryHint ? [categoryHint] : worldBuildingCategoryIds;
    const worldBuilding = cloneDatabase(database).worldBuilding || createEmptyWorldBuilding();
    categories.forEach((category) => {
      worldBuilding[category] = (worldBuilding[category] || []).map((entry) => {
        if (entry.id !== action.id) return entry;
        const next = { ...entry, fields: { ...entry.fields }, tags: [...entry.tags], relatedEntries: [...entry.relatedEntries] };
        if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.path, action.newValue)) return entry;
        return { ...next, updatedAt: stamp };
      });
    });
    return { ...database, worldBuilding };
  }

  if (action.target === "bestiaryCategoryVault" && (action.id || action.categoryName)) {
    return {
      ...database,
      bestiaryCategoryVaults: (database.bestiaryCategoryVaults || []).map((vault) => {
        const matches = action.id ? vault.id === action.id : vault.categoryName.toLowerCase() === String(action.categoryName || "").toLowerCase();
        if (!matches) return vault;
        const next = cloneDatabase({
          schemaVersion: 1,
          entries: [],
          bestiary: [],
          bestiaryCategoryVaults: [vault],
          worldBuilding: createEmptyWorldBuilding(),
          backups: [],
          branding: { studioName: "STL Productionz" }
        }).bestiaryCategoryVaults[0] as BestiaryCategoryArtVault;
        if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.path, action.newValue)) return vault;
        next.updatedAt = stamp;
        return normalizeBestiaryCategoryArtVault(next, next.categoryName, database.bestiary || []);
      })
    };
  }

  return database;
};

const updateArtSlots = (
  database: LoreDatabase,
  action: Extract<AssistantAction, { action: "addArtSlot" | "removeArtSlot" }>,
  mode: "add" | "remove"
): LoreDatabase => {
  if (action.target === "entry" && action.id) {
    return {
      ...database,
      entries: database.entries.map((entry) => {
        if (entry.id !== action.id) return entry;
        return normalizeEntry({ ...entry, artVault: mutateArtVaultSlots(entry.artVault, action, mode), updatedAt: nowIso() });
      })
    };
  }

  if (action.target === "creature" && action.id) {
    return {
      ...database,
      bestiary: (database.bestiary || []).map((creature) => {
        if (creature.id !== action.id) return creature;
        return normalizeBestiaryCreature({ ...creature, artVault: mutateArtVaultSlots(creature.artVault, action, mode), updatedAt: nowIso() });
      })
    };
  }

  if (action.target === "bestiaryCategory" && action.categoryName) {
    const normalizedCategory = action.categoryName.trim();
    const existing = database.bestiaryCategoryVaults || [];
    const targetIndex = existing.findIndex((vault) => vault.categoryName.toLowerCase() === normalizedCategory.toLowerCase());
    const vaults = targetIndex >= 0
      ? existing
      : [...existing, createBestiaryCategoryArtVaultRecord(normalizedCategory, database.bestiary || [])];

    return {
      ...database,
      bestiaryCategoryVaults: vaults.map((vault) => {
        if (vault.categoryName.toLowerCase() !== normalizedCategory.toLowerCase()) return vault;
        return normalizeBestiaryCategoryArtVault(
          { ...vault, artVault: mutateArtVaultSlots(vault.artVault, action, mode), updatedAt: nowIso() },
          vault.categoryName,
          database.bestiary || []
        );
      })
    };
  }

  return database;
};

const mutateArtVaultSlots = (
  artVault: { sections?: ArtVaultSection[] } | undefined,
  action: Extract<AssistantAction, { action: "addArtSlot" | "removeArtSlot" }>,
  mode: "add" | "remove"
) => {
  const sections = [...(artVault?.sections || [])].map((section) => ({
    ...section,
    slots: [...(section.slots || [])]
  }));
  const section = findOrCreateArtSection(sections, action);

  if (mode === "add" && action.action === "addArtSlot") {
    const label = action.label.trim();
    if (!label || section.slots.some((slot) => slot.label.toLowerCase() === label.toLowerCase())) {
      return { sections };
    }
    section.slots.push(createScribeArtSlot(section.id, label, action.requirementType || "Optional", section.slots.length, action.notes || ""));
  }

  if (mode === "remove" && action.action === "removeArtSlot") {
    const slotId = action.slotId?.trim().toLowerCase() || "";
    const label = action.label?.trim().toLowerCase() || "";
    section.slots = section.slots.filter((slot) => {
      if (slotId && slot.id.toLowerCase() === slotId) return false;
      if (label && slot.label.toLowerCase() === label) return false;
      return true;
    }).map((slot, index) => ({ ...slot, order: index }));
  }

  return { sections };
};

const findOrCreateArtSection = (
  sections: ArtVaultSection[],
  action: Extract<AssistantAction, { action: "addArtSlot" | "removeArtSlot" }>
) => {
  const sectionId = action.sectionId?.trim().toLowerCase() || "";
  const sectionTitle = action.sectionTitle?.trim() || "Scribe Slots";
  const existing = sections.find((section) =>
    sectionId ? section.id.toLowerCase() === sectionId : section.title.toLowerCase() === sectionTitle.toLowerCase()
  );
  if (existing) return existing;

  const section: ArtVaultSection = {
    id: `scribe-section-${slugify(sectionTitle) || Date.now()}`,
    title: sectionTitle,
    description: "Slots created by Tavern Scribe.",
    slots: [],
    order: sections.length
  };
  sections.push(section);
  return section;
};

const createScribeArtSlot = (
  sectionId: string,
  label: string,
  requirementType: string,
  order: number,
  notes: string
): ArtVaultSlot => ({
  id: `${sectionId}-${slugify(label) || Date.now()}`,
  label,
  requirementType,
  status: "Missing",
  image: null,
  notes,
  order
});

const validWorldCategory = (value: unknown): WorldBuildingCategoryId | "" => {
  const normalized = String(value || "");
  return worldBuildingCategoryIds.includes(normalized as WorldBuildingCategoryId)
    ? normalized as WorldBuildingCategoryId
    : "";
};

const applyAction = (database: LoreDatabase, action: AssistantAction): LoreDatabase => {
  if (action.action === "update") {
    return {
      ...database,
      entries: database.entries.map((entry) => {
      if (entry.id !== action.id) return entry;
      const next = cloneDatabase({
        schemaVersion: 1,
        entries: [entry],
        bestiary: [],
        bestiaryCategoryVaults: [],
        worldBuilding: createEmptyWorldBuilding(),
        backups: [],
        branding: { studioName: "STL Productionz" }
      }).entries[0] as LoreEntry;
      if (!safeSetDeepValue(next as unknown as Record<string, unknown>, action.field, action.newValue)) return entry;
      next.updatedAt = nowIso();
      return normalizeEntry(next);
      })
    };
  }

  if (action.action === "setData") {
    return setDatabaseValue(database, action);
  }

  if (action.action === "renameReference") {
    const stamp = nowIso();
    return {
      ...database,
      entries: database.entries.map((entry) =>
        normalizeEntry({ ...(replaceStringInUnknown(entry, action.oldName, action.newName) as LoreEntry), updatedAt: stamp })
      ),
      bestiary: (database.bestiary || []).map((creature) =>
        normalizeBestiaryCreature({ ...(replaceStringInUnknown(creature, action.oldName, action.newName) as BestiaryCreature), updatedAt: stamp })
      ),
      bestiaryCategoryVaults: (database.bestiaryCategoryVaults || []).map((vault) =>
        normalizeBestiaryCategoryArtVault(
          { ...(replaceStringInUnknown(vault, action.oldName, action.newName) as BestiaryCategoryArtVault), updatedAt: stamp },
          vault.categoryName,
          database.bestiary || []
        )
      ),
      worldBuilding: Object.fromEntries(
        worldBuildingCategoryIds.map((category) => [
          category,
          (database.worldBuilding?.[category] || []).map((entry) => ({
            ...(replaceStringInUnknown(entry, action.oldName, action.newName) as WorldBuildingEntry),
            updatedAt: stamp
          }))
        ])
      ) as LoreDatabase["worldBuilding"]
    };
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
    return {
      ...database,
      entries: [newEntry, ...database.entries]
    };
  }

  if (action.action === "addCreature") {
    const creature = normalizeBestiaryCreature({
      id: action.creature.id || `creature-${slugify(action.creature.name || "scribe-creature")}-${Date.now()}`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...action.creature
    });
    return {
      ...database,
      bestiary: [creature, ...(database.bestiary || [])]
    };
  }

  if (action.action === "addWorldEntry") {
    const category = validWorldCategory(action.category) || "glossary";
    const entry = createWorldBuildingEntry(category, action.entry);
    return {
      ...database,
      worldBuilding: {
        ...database.worldBuilding,
        [category]: [entry, ...(database.worldBuilding?.[category] || [])]
      }
    };
  }

  if (action.action === "addArtSlot") {
    return updateArtSlots(database, action, "add");
  }

  if (action.action === "removeArtSlot") {
    return updateArtSlots(database, action, "remove");
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
    return {
      ...database,
      entries: [archiveEntry, ...database.entries]
    };
  }

  return database;
};

export const applyAssistantPatch = (
  database: LoreDatabase,
  patch: AssistantPatch,
  selectedIndexes: number[],
  shouldBackup: boolean
): LoreDatabase => {
  const backupId = `ai-backup-${Date.now()}`;
  const selected = new Set(selectedIndexes);
  let nextDatabase = cloneDatabase(database);

  patch.changes.forEach((change, index) => {
    if (selected.has(index)) {
      nextDatabase = applyAction(nextDatabase, change);
    }
  });

  const backup = {
    id: backupId,
    label: `AI change: ${patch.summary || "Assistant patch"}`,
    createdAt: nowIso(),
    entries: cloneDatabase(database).entries
  };

  return {
    ...nextDatabase,
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
      bestiary: database.bestiary || [],
      bestiaryCategoryVaults: database.bestiaryCategoryVaults || [],
      worldBuilding: database.worldBuilding || createEmptyWorldBuilding(),
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
    totalBestiaryCreatures: (database.bestiary || []).length,
    totalWorldEntries: worldBuildingCategoryIds.reduce((count, category) => count + (database.worldBuilding?.[category] || []).length, 0),
    contextPolicy:
      "This compact context removes media payloads. Tavern Scribe can only return app-data changes: text, fields, tags, bestiary stats/drops/lore, world-building fields, lore entries, creatures, world entries, and art slot add/remove actions. It cannot change code, UI layout, images, Drive files, API keys, secrets, or development settings. For exact whole-database replacements, return renameReference instead of many update actions.",
    entryIndex: database.entries.map((entry) => compactEntry(entry, "index")),
    relevantEntries: relevantEntries.length
      ? relevantEntries
      : scored.slice(0, 12).map((item) => compactEntry(item.entry, "full")),
    bestiaryIndex: (database.bestiary || []).map((creature) => compactCreature(creature, "index")),
    relevantCreatures: relevantCreatures(database, command),
    worldIndex: compactWorldEntries(database, command, "index"),
    relevantWorldEntries: compactWorldEntries(database, command, "full").slice(0, 18),
    artSlotIndex: compactArtSlotIndex(database).slice(0, 80)
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

const compactCreature = (creature: BestiaryCreature, depth: "index" | "full") => {
  const base = {
    id: creature.id,
    name: creature.name,
    category: creature.category,
    type: creature.type,
    status: creature.status,
    threatLevel: creature.threatLevel,
    rarity: creature.rarity,
    habitat: creature.habitat,
    summary: truncate(creature.overview || creature.description, depth === "index" ? 420 : 900),
    artSlots: (creature.artVault?.sections || []).flatMap((section) =>
      (section.slots || []).map((slot) => `${section.title}: ${slot.label}`)
    ).slice(0, depth === "index" ? 12 : 36)
  };

  if (depth === "index") return base;

  return {
    ...base,
    behavior: truncate(creature.behavior, 800),
    fieldNotes: truncate(creature.fieldNotes, 800),
    stats: compactUnknown(creature.stats, 1200),
    drops: compactUnknown(creature.drops, 1200),
    habitatInfo: compactUnknown(creature.habitatInfo, 1000),
    lore: compactUnknown(creature.lore, 1400),
    gameplayPurpose: truncate(creature.gameplayPurpose, 800),
    productionNotes: truncate(creature.productionNotes, 800)
  };
};

const relevantCreatures = (database: LoreDatabase, command: string) => {
  const scored = (database.bestiary || [])
    .map((creature) => ({ creature, score: scoreUnknown(creature, command, creature.name) }))
    .sort((a, b) => b.score - a.score);
  const relevant = scored.filter((item) => item.score > 0).slice(0, 18);
  return (relevant.length ? relevant : scored.slice(0, 8)).map((item) => compactCreature(item.creature, "full"));
};

const compactWorldEntries = (database: LoreDatabase, command: string, depth: "index" | "full") => {
  const entries = worldBuildingCategoryIds.flatMap((category) =>
    (database.worldBuilding?.[category] || []).map((entry) => ({ entry, category }))
  );
  return entries
    .map((item) => ({ ...item, score: depth === "index" ? 1 : scoreUnknown(item.entry, command, item.entry.title) }))
    .filter((item) => depth === "index" || item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, depth === "index" ? 120 : 32)
    .map(({ entry, category }) => ({
      id: entry.id,
      category,
      title: entry.title,
      type: entry.type,
      summary: truncate(entry.summary, depth === "index" ? 320 : 900),
      tags: entry.tags.slice(0, 10),
      fields: depth === "full" ? compactUnknown(entry.fields, 1800) : undefined,
      relatedEntries: depth === "full" ? compactUnknown(entry.relatedEntries, 800) : undefined
    }));
};

const compactArtSlotIndex = (database: LoreDatabase) => {
  const entrySlots = database.entries.flatMap((entry) =>
    (entry.artVault?.sections || []).flatMap((section) =>
      (section.slots || []).map((slot) => ({
        target: "entry",
        id: entry.id,
        title: entry.title,
        sectionId: section.id,
        sectionTitle: section.title,
        slotId: slot.id,
        label: slot.label
      }))
    )
  );
  const creatureSlots = (database.bestiary || []).flatMap((creature) =>
    (creature.artVault?.sections || []).flatMap((section) =>
      (section.slots || []).map((slot) => ({
        target: "creature",
        id: creature.id,
        title: creature.name,
        sectionId: section.id,
        sectionTitle: section.title,
        slotId: slot.id,
        label: slot.label
      }))
    )
  );
  const categorySlots = (database.bestiaryCategoryVaults || []).flatMap((vault) =>
    (vault.artVault?.sections || []).flatMap((section) =>
      (section.slots || []).map((slot) => ({
        target: "bestiaryCategory",
        categoryName: vault.categoryName,
        sectionId: section.id,
        sectionTitle: section.title,
        slotId: slot.id,
        label: slot.label
      }))
    )
  );
  return [...entrySlots, ...creatureSlots, ...categorySlots];
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

const scoreUnknown = (value: unknown, command: string, title = "") => {
  const terms = command
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
  const haystack = compactUnknown(value, 12000).toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += title.toLowerCase().includes(term) ? 5 : 1;
  }
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
