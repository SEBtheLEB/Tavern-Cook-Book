import type { FavoriteItem, FavoriteKind } from "../types";

export const FAVORITES_KEY = "tavernCookbookFavorites";

export function favoriteKey(kind: FavoriteKind, id: string) {
  return `${kind}:${id}`;
}

export function loadFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Partial<FavoriteItem> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        kind: (item.kind === "creature" ? "creature" : "entry") as FavoriteKind,
        id: typeof item.id === "string" ? item.id : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }))
      .filter((item) => item.id);
  } catch {
    return [];
  }
}

export function saveFavorites(items: FavoriteItem[]) {
  const deduped = new Map<string, FavoriteItem>();
  items.forEach((item) => {
    if (!item.id) return;
    deduped.set(favoriteKey(item.kind, item.id), item);
  });
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...deduped.values()]));
}

export function isFavorite(items: FavoriteItem[], kind: FavoriteKind, id: string) {
  return items.some((item) => item.kind === kind && item.id === id);
}

export function toggleFavorite(items: FavoriteItem[], kind: FavoriteKind, id: string): FavoriteItem[] {
  if (isFavorite(items, kind, id)) {
    return items.filter((item) => !(item.kind === kind && item.id === id));
  }
  return [{ kind, id, createdAt: new Date().toISOString() }, ...items];
}
