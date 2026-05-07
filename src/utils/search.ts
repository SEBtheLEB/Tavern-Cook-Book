import type { LoreEntry } from "../types";

const searchableValue = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(searchableValue).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value).map(searchableValue).join(" ");
  }
  return "";
};

export const searchEntries = (entries: LoreEntry[], query: string): LoreEntry[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return entries.filter((entry) => {
    const haystack = [
      entry.title,
      entry.category,
      entry.type,
      entry.status,
      entry.spoilerLevel,
      entry.tags.join(" "),
      entry.summary,
      entry.publicDescription,
      entry.internalLore,
      searchableValue(entry.fields),
      searchableValue(entry.connections),
      searchableValue(entry.notes),
      searchableValue(entry.timeline),
      searchableValue(entry.secret),
      searchableValue(entry.wiki),
      searchableValue(entry.media)
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
};

export const countForView = (entries: LoreEntry[], category?: string, matcher?: (entry: LoreEntry) => boolean) => {
  if (matcher) return entries.filter(matcher).length;
  if (!category) return entries.length;
  return entries.filter((entry) => entry.category === category).length;
};
