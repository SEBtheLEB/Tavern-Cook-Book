import type { LoreEntry } from "../types";
import { Icon } from "./Icon";

const boolLabel = (value?: boolean) => (value ? "Yes" : "No");

interface WikiLayoutProps {
  entry: LoreEntry;
}

export function isWikiEntry(entry: LoreEntry) {
  const type = entry.type.toLowerCase();
  return Boolean(
    entry.wiki ||
      type.includes("ingredient") ||
      type.includes("recipe") ||
      type.includes("item") ||
      type.includes("artifact") ||
      type.includes("tonic") ||
      type.includes("meal") ||
      type.includes("drop")
  );
}

export function WikiLayout({ entry }: WikiLayoutProps) {
  const wiki = entry.wiki || {};
  const iconImage = entry.media.iconImage || entry.media.mainImage;

  const rows = [
    ["Item type", wiki.itemType || entry.type],
    ["Rarity", wiki.rarity],
    ["Value", wiki.value],
    ["Stack size", wiki.stackSize],
    ["Where to find", wiki.whereToFind],
    ["How to craft", wiki.howToCraft],
    ["Crafting station", wiki.craftingStation],
    ["Ingredients required", wiki.ingredientsRequired],
    ["Used in recipes", wiki.usedInRecipes],
    ["Gameplay use", wiki.gameplayUse],
    ["Lore description", wiki.loreDescription],
    ["Related quests", wiki.relatedQuests || entry.connections.quests.join(", ")],
    ["Related locations", wiki.relatedLocations || entry.connections.locations.join(", ")],
    ["Related enemies/drops", wiki.relatedEnemies || wiki.relatedDrops || entry.connections.enemies.join(", ")],
    ["Notes", wiki.notes || entry.notes.gameplay || entry.notes.unresolved],
    ["Spoiler level", entry.spoilerLevel]
  ].filter(([, value]) => value);

  return (
    <section className="wiki-item-frame rounded p-4">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <div className="grid aspect-square place-items-center overflow-hidden rounded border" style={{ borderColor: "var(--wiki-frame)", background: "var(--field-bg)" }}>
            {iconImage ? (
              <img src={iconImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="Package" className="h-14 w-14" />
            )}
          </div>
          {entry.media.mainImage && entry.media.mainImage !== iconImage && (
            <img
              src={entry.media.mainImage}
              alt=""
              className="aspect-video w-full rounded border object-cover"
              style={{ borderColor: "var(--wiki-frame)" }}
            />
          )}
          <div className="rounded border p-3 text-sm" style={{ borderColor: "var(--wiki-frame)", background: "var(--field-bg)" }}>
            <p className="font-display text-xl">{entry.title}</p>
            <p style={{ color: "var(--muted-ink)" }}>{entry.category}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Sliced", boolLabel(wiki.canBeSliced)],
              ["Chopped", boolLabel(wiki.canBeChopped)],
              ["Crushed", boolLabel(wiki.canBeCrushed)],
              ["Boiled", boolLabel(wiki.canBeBoiled)],
              ["Fried", boolLabel(wiki.canBeFried)],
              ["Brewed", boolLabel(wiki.canBeBrewed)]
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded border px-3 py-2 text-sm"
                style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}
              >
                <span style={{ color: "var(--muted-ink)" }}>{label}: </span>
                <span>{value}</span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded border" style={{ borderColor: "var(--wiki-frame)" }}>
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-2 border-b p-3 text-sm last:border-b-0 md:grid-cols-[180px_1fr]" style={{ borderColor: "var(--card-border)" }}>
                <p className="font-semibold" style={{ color: "var(--muted-ink)" }}>
                  {label}
                </p>
                <p className="whitespace-pre-wrap leading-6">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
