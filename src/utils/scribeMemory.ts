import { nowIso } from "./entries";

export interface ScribeMemoryRule {
  id: string;
  text: string;
  createdAt: string;
}

export interface ScribeHistoryItem {
  id: string;
  command: string;
  summary: string;
  changeCount: number;
  targetTitles: string[];
  backupId?: string;
  createdAt: string;
}

const SCRIBE_MEMORY_KEY = "tavern-cook-book:scribe-memory";
const SCRIBE_HISTORY_KEY = "tavern-cook-book:scribe-history";
const maxMemoryRules = 24;
const maxHistoryItems = 20;

export const loadScribeMemoryRules = (): ScribeMemoryRule[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SCRIBE_MEMORY_KEY) || "[]") as ScribeMemoryRule[];
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            id: String(item.id || `scribe-rule-${Date.now()}`),
            text: String(item.text || "").trim(),
            createdAt: String(item.createdAt || nowIso())
          }))
          .filter((item) => item.text)
          .slice(0, maxMemoryRules)
      : [];
  } catch {
    return [];
  }
};

export const saveScribeMemoryRules = (rules: ScribeMemoryRule[]) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SCRIBE_MEMORY_KEY, JSON.stringify(rules.slice(0, maxMemoryRules)));
};

export const addScribeMemoryRule = (text: string) => {
  const cleanText = text.trim();
  if (!cleanText) return loadScribeMemoryRules();
  const existing = loadScribeMemoryRules();
  const next = [
    {
      id: `scribe-rule-${Date.now()}`,
      text: cleanText,
      createdAt: nowIso()
    },
    ...existing.filter((item) => item.text.toLowerCase() !== cleanText.toLowerCase())
  ].slice(0, maxMemoryRules);
  saveScribeMemoryRules(next);
  return next;
};

export const removeScribeMemoryRule = (id: string) => {
  const next = loadScribeMemoryRules().filter((item) => item.id !== id);
  saveScribeMemoryRules(next);
  return next;
};

export const loadScribeHistory = (): ScribeHistoryItem[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SCRIBE_HISTORY_KEY) || "[]") as ScribeHistoryItem[];
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            id: String(item.id || `scribe-history-${Date.now()}`),
            command: String(item.command || ""),
            summary: String(item.summary || "Scribe change"),
            changeCount: Number(item.changeCount || 0),
            targetTitles: Array.isArray(item.targetTitles)
              ? item.targetTitles.map((title) => String(title || "").trim()).filter(Boolean)
              : [],
            backupId: typeof item.backupId === "string" ? item.backupId : undefined,
            createdAt: String(item.createdAt || nowIso())
          }))
          .slice(0, maxHistoryItems)
      : [];
  } catch {
    return [];
  }
};

export const saveScribeHistory = (items: ScribeHistoryItem[]) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SCRIBE_HISTORY_KEY, JSON.stringify(items.slice(0, maxHistoryItems)));
};

export const recordScribeHistory = (item: Omit<ScribeHistoryItem, "id" | "createdAt">) => {
  const next = [
    {
      ...item,
      id: `scribe-history-${Date.now()}`,
      createdAt: nowIso()
    },
    ...loadScribeHistory()
  ].slice(0, maxHistoryItems);
  saveScribeHistory(next);
  return next;
};
