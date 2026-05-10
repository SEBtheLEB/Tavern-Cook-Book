import { useMemo, useState } from "react";
import type { BestiaryCreature, FavoriteItem, LoreDatabase, LoreEntry } from "../types";
import { favoriteKey, isFavorite } from "../utils/favorites";
import { richTextToPlainText } from "../utils/richText";
import { CustomSelect } from "./CustomSelect";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";

interface FavoritesPageProps {
  database: LoreDatabase;
  favorites: FavoriteItem[];
  onOpenEntry: (entry: LoreEntry) => void;
  onOpenCreature: (creature: BestiaryCreature) => void;
  onToggleFavorite: (kind: "entry" | "creature", id: string) => void;
}

interface FavoriteDisplayItem {
  key: string;
  kind: "entry" | "creature";
  id: string;
  title: string;
  category: string;
  type: string;
  status: string;
  summary: string;
  image: string;
  createdAt: string;
  entry?: LoreEntry;
  creature?: BestiaryCreature;
}

export function FavoritesPage({
  database,
  favorites,
  onOpenEntry,
  onOpenCreature,
  onToggleFavorite
}: FavoritesPageProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [kindFilter, setKindFilter] = useState("All");
  const items = useMemo(
    () => buildFavoriteItems(database, favorites),
    [database, favorites]
  );
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((item) => item.category))).sort()],
    [items]
  );
  const visibleItems = items.filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.type} ${item.status} ${item.summary}`.toLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    const matchesKind = kindFilter === "All" || item.kind === kindFilter;
    return matchesQuery && matchesCategory && matchesKind;
  });
  const groupedItems = groupFavoriteItems(visibleItems);

  return (
    <div className="favorites-page space-y-5 p-4 md:p-6">
      <section className="category-header-frame rounded p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted-ink)" }}>
              Personal shortcuts
            </p>
            <h2 className="font-display text-4xl md:text-5xl">Favorites</h2>
            <p className="mt-2 max-w-3xl leading-7" style={{ color: "var(--muted-ink)" }}>
              Star characters, lore modules, creatures, and production references so the most important pieces stay easy to reach.
            </p>
          </div>
          <div className="favorites-total-card">
            <Icon name="Star" className="h-5 w-5" />
            <strong>{items.length}</strong>
            <span>favorited</span>
          </div>
        </div>
      </section>

      <section className="favorites-filter-bar">
        <label className="favorites-search">
          <Icon name="Search" className="h-4 w-4" />
          <input value={query} placeholder="Filter favorites..." onChange={(event) => setQuery(event.target.value)} />
        </label>
        <CustomSelect
          value={kindFilter}
          onChange={setKindFilter}
          options={[
            { value: "All", label: "All Things" },
            { value: "entry", label: "Lore Entries" },
            { value: "creature", label: "Bestiary" }
          ]}
        />
        <CustomSelect value={categoryFilter} onChange={setCategoryFilter} options={categories} />
        <button
          className="tab-frame rounded px-3 py-2"
          onClick={() => {
            setQuery("");
            setCategoryFilter("All");
            setKindFilter("All");
          }}
        >
          Reset
        </button>
      </section>

      {!items.length ? (
        <section className="soft-panel rounded p-8 text-center">
          <Icon name="Star" className="mx-auto h-10 w-10" />
          <h3 className="mt-3 font-display text-2xl">No favorites yet</h3>
          <p className="mt-2" style={{ color: "var(--muted-ink)" }}>
            Click a star on a card, character page, Bestiary creature, or lore popup to save it here.
          </p>
        </section>
      ) : !visibleItems.length ? (
        <section className="soft-panel rounded p-8 text-center">
          <h3 className="font-display text-2xl">No favorites match that filter</h3>
          <p className="mt-2" style={{ color: "var(--muted-ink)" }}>
            Try another category or clear the search.
          </p>
        </section>
      ) : (
        Object.entries(groupedItems).map(([category, categoryItems]) => (
          <section key={category} className="favorites-category-section">
            <header>
              <h3 className="font-display">{category}</h3>
              <span>{categoryItems.length} saved</span>
            </header>
            <div className="favorites-grid">
              {categoryItems.map((item) => (
                <article key={item.key} className="favorite-card">
                  <button
                    className="favorite-card-main"
                    onClick={() => item.entry ? onOpenEntry(item.entry) : item.creature && onOpenCreature(item.creature)}
                  >
                    <div className="favorite-card-image">
                      {item.image ? <img src={item.image} alt="" /> : <Icon name={item.kind === "creature" ? "Swords" : "BookOpen"} className="h-7 w-7" />}
                    </div>
                    <div>
                      <p>{item.type}</p>
                      <h4 className="font-display">{item.title}</h4>
                      <span>{item.status}</span>
                    </div>
                  </button>
                  <p className="favorite-card-summary">{item.summary || "No summary yet."}</p>
                  <footer>
                    <span>{item.kind === "creature" ? "Bestiary" : "Lore"}</span>
                    <FavoriteButton
                      active={isFavorite(favorites, item.kind, item.id)}
                      label={item.title}
                      onToggle={() => onToggleFavorite(item.kind, item.id)}
                    />
                  </footer>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function buildFavoriteItems(database: LoreDatabase, favorites: FavoriteItem[]): FavoriteDisplayItem[] {
  const entriesById = new Map(database.entries.map((entry) => [entry.id, entry]));
  const creaturesById = new Map((database.bestiary || []).map((creature) => [creature.id, creature]));
  return favorites
    .map((favorite): FavoriteDisplayItem | null => {
      if (favorite.kind === "creature") {
        const creature = creaturesById.get(favorite.id);
        if (!creature) return null;
        return {
          key: favoriteKey("creature", creature.id),
          kind: "creature" as const,
          id: creature.id,
          title: creature.name,
          category: "Bestiary",
          type: creature.type,
          status: creature.status || creature.threatLevel || "Creature",
          summary: creature.description || creature.overview || creature.behavior,
          image: creature.image || creature.hoverImage || "",
          createdAt: favorite.createdAt,
          creature
        };
      }

      const entry = entriesById.get(favorite.id);
      if (!entry) return null;
      return {
        key: favoriteKey("entry", entry.id),
        kind: "entry" as const,
        id: entry.id,
        title: entry.title,
        category: entry.category || "Lore",
        type: entry.type,
        status: entry.status,
        summary: richTextToPlainText(entry.summary || entry.publicDescription || entry.internalLore),
        image: entry.media.characterPortrait || entry.media.iconImage || entry.media.mainImage || "",
        createdAt: favorite.createdAt,
        entry
      };
    })
    .filter((item): item is FavoriteDisplayItem => Boolean(item))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function groupFavoriteItems(items: FavoriteDisplayItem[]) {
  return items.reduce<Record<string, FavoriteDisplayItem[]>>((groups, item) => {
    groups[item.category] = groups[item.category] || [];
    groups[item.category].push(item);
    return groups;
  }, {});
}
