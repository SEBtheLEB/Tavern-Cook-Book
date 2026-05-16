import type {
  BestiaryCreature,
  GlossaryTerm,
  LoreDatabase,
  LoreEntry,
  StoryReference,
  StoryReferenceCanonStatus,
  StoryReferenceSpoilerLevel,
  StoryReferenceVersion,
  WorldBuildingCategoryId,
  WorldBuildingData,
  WorldBuildingEntry
} from "../types";

export const storyReferenceCanonOptions: StoryReferenceCanonStatus[] = [
  "Canon",
  "Soft Canon",
  "Idea",
  "Needs Rewrite",
  "Scrapped",
  "Old Version"
];

export const storyReferenceSpoilerOptions: StoryReferenceSpoilerLevel[] = [
  "Public Lore",
  "Player Knowledge",
  "Team Spoiler",
  "Secret Lore"
];

export interface StoryReferenceBacklink {
  id: string;
  storyReferenceId: string;
  targetType: "entry" | "world" | "creature";
  targetId: string;
  targetCategory?: WorldBuildingCategoryId | string;
  title: string;
  moduleLabel: string;
  summary: string;
  updatedAt: string;
}

export type StoryConsistencyResultKind =
  | "unlinkedMention"
  | "unusedReference"
  | "duplicateSummary"
  | "canonConflict"
  | "retiredReferenceUsed"
  | "spoilerRisk";

export interface StoryConsistencyResult {
  id: string;
  kind: StoryConsistencyResultKind;
  title: string;
  detail: string;
  actionLabel: string;
  secondaryActionLabel?: string;
  target?: StoryReferenceBacklink;
  storyReferenceId?: string;
  glossaryTermId?: string;
}

export interface StoryReferenceDraftInput {
  id?: string;
  title?: string;
  shortSummary?: string;
  fullDescription?: string;
  canonStatus?: StoryReferenceCanonStatus | string;
  spoilerLevel?: StoryReferenceSpoilerLevel | string;
  actChapter?: string;
  relatedCharacters?: string[] | string;
  relatedLocations?: string[] | string;
  relatedQuests?: string[] | string;
  relatedFactions?: string[] | string;
  relatedItems?: string[] | string;
  relatedRecipes?: string[] | string;
  relatedTimelineEvents?: string[] | string;
  relatedLoreReveals?: string[] | string;
  relatedStoryBeats?: string[] | string;
  tags?: string[] | string;
  notes?: string;
}

type StoryConsistencyTarget = StoryReferenceBacklink & {
  searchText: string;
  linkedStoryReferenceIds: string[];
};

export const normalizeLinkedStoryReferenceIds = (value: unknown): string[] => uniqueStrings(normalizeStringArray(value));

export function normalizeStoryReference(value: unknown, fallbackId = ""): StoryReference {
  const source = value && typeof value === "object" ? value as Partial<StoryReference> : {};
  const title = text(source.title) || "Untitled Story Reference";
  const createdAt = text(source.createdAt) || nowIso();
  const lastEditedAt = text(source.lastEditedAt) || text((source as { updatedAt?: string }).updatedAt) || createdAt;
  return {
    id: text(source.id) || fallbackId || createStoryReferenceId(title),
    title,
    shortSummary: text(source.shortSummary || (source as { summary?: string }).summary),
    fullDescription: text(source.fullDescription || (source as { description?: string }).description),
    canonStatus: normalizeCanonStatus(source.canonStatus),
    spoilerLevel: normalizeStorySpoilerLevel(source.spoilerLevel),
    actChapter: text(source.actChapter),
    relatedCharacters: uniqueStrings(normalizeStringArray(source.relatedCharacters)),
    relatedLocations: uniqueStrings(normalizeStringArray(source.relatedLocations)),
    relatedQuests: uniqueStrings(normalizeStringArray(source.relatedQuests)),
    relatedFactions: uniqueStrings(normalizeStringArray(source.relatedFactions)),
    relatedItems: uniqueStrings(normalizeStringArray(source.relatedItems)),
    relatedRecipes: uniqueStrings(normalizeStringArray(source.relatedRecipes)),
    relatedTimelineEvents: uniqueStrings(normalizeStringArray(source.relatedTimelineEvents)),
    relatedLoreReveals: uniqueStrings(normalizeStringArray(source.relatedLoreReveals)),
    relatedStoryBeats: uniqueStrings(normalizeStringArray(source.relatedStoryBeats)),
    tags: uniqueStrings(normalizeStringArray(source.tags)),
    notes: text(source.notes),
    createdAt,
    lastEditedAt,
    versions: normalizeStoryReferenceVersions(source.versions)
  };
}

export function createStoryReference(input: StoryReferenceDraftInput, existingIds: string[] = []): StoryReference {
  const title = text(input.title) || "New Story Reference";
  return normalizeStoryReference({
    ...input,
    id: input.id || createStoryReferenceId(title, existingIds),
    title,
    createdAt: nowIso(),
    lastEditedAt: nowIso()
  });
}

export function createStoryReferenceVersion(reference: StoryReference, notes = "Saved before source update."): StoryReferenceVersion {
  return {
    id: `story-version-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    editedAt: nowIso(),
    previousTitle: reference.title,
    previousShortSummary: reference.shortSummary,
    previousFullDescription: reference.fullDescription,
    previousCanonStatus: reference.canonStatus,
    previousSpoilerLevel: reference.spoilerLevel,
    notes
  };
}

export function normalizeStoryReferences(value: unknown, fallback: StoryReference[] = []): StoryReference[] {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item, index) => normalizeStoryReference(item, `story_reference_${index + 1}`));
}

export function normalizeGlossaryTerm(value: unknown, fallbackId = ""): GlossaryTerm {
  const source = value && typeof value === "object" ? value as Partial<GlossaryTerm> : {};
  const primaryName = text(source.primaryName || (source as { title?: string }).title) || "Untitled Term";
  const createdAt = text(source.createdAt) || nowIso();
  return {
    id: text(source.id) || fallbackId || `term_${slugify(primaryName) || Date.now()}`,
    primaryName,
    alternateNames: uniqueStrings(normalizeStringArray(source.alternateNames)),
    shortDefinition: text(source.shortDefinition || (source as { definition?: string }).definition),
    linkedStoryReferenceId: text(source.linkedStoryReferenceId),
    relatedEntryIds: uniqueStrings(normalizeStringArray(source.relatedEntryIds)),
    spoilerLevel: normalizeStorySpoilerLevel(source.spoilerLevel),
    createdAt,
    updatedAt: text(source.updatedAt) || createdAt
  };
}

export function normalizeGlossaryTerms(value: unknown, fallback: GlossaryTerm[] = []): GlossaryTerm[] {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item, index) => normalizeGlossaryTerm(item, `term_${index + 1}`));
}

export function mergeStoryReferences(current: StoryReference[], starter: StoryReference[]) {
  const next = [...current.map((item) => normalizeStoryReference(item))];
  const existingIds = new Set(next.map((item) => item.id));
  starter.forEach((reference) => {
    if (!existingIds.has(reference.id)) next.push(normalizeStoryReference(reference));
  });
  return next;
}

export function mergeGlossaryTerms(current: GlossaryTerm[], starter: GlossaryTerm[]) {
  const next = [...current.map((item) => normalizeGlossaryTerm(item))];
  const existingIds = new Set(next.map((item) => item.id));
  starter.forEach((term) => {
    if (!existingIds.has(term.id)) next.push(normalizeGlossaryTerm(term));
  });
  return next;
}

export function createStarterStoryReferences(): StoryReference[] {
  return [
    ref("story_whisken_people_role", "Role of the Whisken People", "The Whisken people originally lived on Tabby Island, fled after Cat Cauldron disasters, and preserve Tablemaker faith through culture, saints, food, and exile.", "The Whisken people created the Cat Cauldron in ancient history while searching for ways to improve food and reach the knowledge of what is untasted. The cauldron caused Tabby Island to decay, forcing the first exodus. They buried it, erased it from history, and forgot it. Later, after Tohm reactivated the cauldron and fled, the island decayed again while the Mas'eel infiltrated as traders and persecuted Triadic faith. The surviving Whisken reached Whisker Woods and Whisken Village.", "Canon", "Team Spoiler", {
      relatedCharacters: ["Tohm Kyatt", "Gwen", "Lel Kai", "Kap"],
      relatedLocations: ["Tabby Island", "Whisker Woods", "Whisken Village"],
      relatedFactions: ["Whisken People", "Mas'eel Cult"],
      relatedTimelineEvents: ["Ancient Cat Cauldron Disaster", "Second Whisken Exodus"],
      tags: ["Whisken", "Tabby Island", "Tablemaker", "Exodus"]
    }),
    ref("story_tohm_tabby_island_disaster", "Tohm Causes the Tabby Island Disaster", "Tohm finds the buried Cat Cauldron, cooks in it, releases a pulse into the earth, and secretly starts Tabby Island's second decay.", "Tohm discovers hidden knowledge of the Cat Cauldron, returns to Tabby Island, activates it by cooking in it, and releases a pulse that causes the land to decay again. The pulse lets the Mas'eel Cult sense the cauldron's power. Tohm takes the cauldron and flees in the Living Tavern without anyone knowing, leaving the Whisken to face the consequences later.", "Canon", "Secret Lore", {
      relatedCharacters: ["Tohm Kyatt"],
      relatedLocations: ["Tabby Island", "Living Tavern"],
      relatedFactions: ["Mas'eel Cult", "Whisken People"],
      relatedItems: ["Cat Cauldron"],
      relatedTimelineEvents: ["Tohm Awakens the Cat Cauldron", "Mas'eel Sense the Cat Cauldron"],
      tags: ["Tohm", "Cat Cauldron", "Secret", "Disaster"]
    }),
    ref("story_lillia_recipe_pages", "Lillia Tears Out the Recipe Pages", "After receiving dark magic, Princess Lillia tears pages from Tohm's recipe book, scattering dangerous culinary knowledge into the game's quest structure.", "Lillia eats Tohm's Dark Magical Meal and receives dark magic. In the aftermath, she tears pages from Tohm's recipe book. Those pages become central to Gwen's journey, boss rewards, unlock structure, and the later reveal that Tohm's meal was dark rather than a true Magical Meal.", "Canon", "Team Spoiler", {
      relatedCharacters: ["Princess Lillia", "Tohm Kyatt", "Gwen"],
      relatedItems: ["Tohm's Recipe Book", "Recipe Pages"],
      relatedQuests: ["Recover Recipe Pages"],
      relatedTimelineEvents: ["Lillia Consumes the Dark Magical Meal", "Lillia Tears Out Recipe Pages"],
      tags: ["Recipe Pages", "Lillia", "Dark Culinary Arts"]
    }),
    ref("story_dragon_knife_origin", "Dragon Knife Origin", "The Dragon Knife is a major artifact connected to the royal family's search for magic, the dwarven conflict, and Lillia's transformation thread.", "The Dragon Knife belongs to the chain of events where the royal family seeks magic for Princess Lillia. The king's conflict with dwarves and Tohm's access to the knife help set up the conditions around the Dark Magical Meal and Lillia's eventual power.", "Soft Canon", "Team Spoiler", {
      relatedCharacters: ["Princess Lillia", "Tohm Kyatt"],
      relatedLocations: ["Human Kingdom", "Dwarven Mountains"],
      relatedItems: ["Dragon Knife"],
      tags: ["Dragon Knife", "Royal Family", "Artifact"]
    }),
    ref("story_dark_culinary_arts", "Dark Culinary Arts", "Dark Culinary Arts are corrupted food magic born from seeking power outside the Tablemaker's gift.", "The key twist is that Tohm did not create a true Magical Meal. He created a Dark Magical Meal because he sought magic from another place instead of the Tablemaker. Lillia receives dark magic from that meal and later turns dangerous culinary power into a broader threat.", "Canon", "Secret Lore", {
      relatedCharacters: ["Tohm Kyatt", "Princess Lillia", "Gwen"],
      relatedRecipes: ["Dark Magical Meal", "Fire Meal"],
      relatedLoreReveals: ["True Magical Meals and Dark Magical Meals"],
      tags: ["Dark Culinary Arts", "Magical Meals", "Lillia"]
    }),
    ref("story_gwen_fire_meal_discovery", "Gwen and the Fire Meal Discovery", "Gwen's Fire Meal works because she cooks in the name of the Tablemaker, creating the first true Magical Meal of the game.", "During the Feast of Full Plates, Gwen cooks Tohm's Fire Meal and it appears to fail. Later, after serving the village, she takes a bite and wakes in a snowstorm. The hidden truth is that Gwen made the meal true because she cooked in the Tablemaker's name. If Tohm had cooked the exact same recipe, it would have become dark.", "Canon", "Secret Lore", {
      relatedCharacters: ["Gwen", "Tohm Kyatt", "Lel Kai", "The Tablemaker"],
      relatedRecipes: ["Fire Meal", "Magical Meals"],
      relatedQuests: ["Feast of Full Plates Opening Night"],
      relatedTimelineEvents: ["Gwen Cooks the First True Magical Meal", "Gwen Wakes in the Snowstorm"],
      tags: ["Gwen", "Fire Meal", "Tablekeeper", "Opening"]
    }),
    ref("story_cat_cauldron", "Cat Cauldron", "The Cat Cauldron holds culinary knowledge from around the world but cannot teach true Magical Meals.", "The ancient Whisken created the Cat Cauldron in search of food knowledge. It caused Tabby Island's decay, was buried and forgotten, and was later found by Tohm. It knows chef secrets and culinary abilities from around the world, but it cannot answer Tohm's real question: how to make a true Magical Meal. Important canon rule: Tohm never drinks from the cauldron.", "Canon", "Team Spoiler", {
      relatedCharacters: ["Tohm Kyatt", "The Cat Cauldron"],
      relatedLocations: ["Tabby Island"],
      relatedItems: ["Cat Cauldron"],
      relatedTimelineEvents: ["Ancient Cat Cauldron Disaster", "Cat Cauldron Cannot Teach Magical Meals"],
      tags: ["Cat Cauldron", "Whisken", "Artifact"]
    }),
    ref("story_faery_refusal", "Faery Refusal", "The faeries' refusal to help Lillia become a faery pushes the royal family toward desperate magical solutions.", "Princess Lillia wants to become a faery. The faery side of the world refuses to grant that desire, which helps push the royal family toward other sources of magic and dangerous artifacts. This thread connects Lillia's obsession, the Dragon Knife, and later Dark Culinary Arts.", "Soft Canon", "Team Spoiler", {
      relatedCharacters: ["Princess Lillia", "Lel Kai"],
      relatedLocations: ["Faery Realm", "Human Kingdom"],
      relatedFactions: ["Faeries", "Royal Family"],
      tags: ["Faery Realm", "Lillia", "Royal Crisis"]
    }),
    ref("story_recipe_pages_scattered", "Recipe Pages Scattered", "Scattered recipe pages become Gwen's progression path and a breadcrumb trail back to Tohm and Lillia's hidden history.", "The torn recipe pages are both gameplay unlocks and story evidence. Recovering them lets Gwen gain powers, reconstruct cooking knowledge, and slowly uncover why Tohm's past and Lillia's power are tied to corrupted culinary magic.", "Canon", "Player Knowledge", {
      relatedCharacters: ["Gwen", "Tohm Kyatt", "Princess Lillia"],
      relatedItems: ["Recipe Pages", "Tohm's Recipe Book"],
      relatedQuests: ["Recover Recipe Pages"],
      tags: ["Recipe Pages", "Progression", "Quest"]
    }),
    ref("story_act1_corruption_spread", "Act 1 Corruption Spread", "Act 1 shows corruption reaching Whisker Woods through food, ponds, bugs, slimes, and village problems.", "The opening act introduces corruption as a practical threat: Kap's pond, creatures, bug pressure, ingredients, and local village survival. This player-facing corruption gradually points back toward recipe-page fallout, Dark Culinary Arts, and older Whisken history.", "Canon", "Player Knowledge", {
      relatedLocations: ["Whisker Woods", "Kap's Pond", "Whisken Village"],
      relatedQuests: ["Kap's Pond Rescue"],
      relatedFactions: ["Mas'eel Cult"],
      relatedStoryBeats: ["Act 1", "Opening Corruption"],
      tags: ["Act 1", "Corruption", "Whisker Woods"]
    })
  ];
}

export function createStarterGlossaryTerms(): GlossaryTerm[] {
  const terms: Array<Partial<GlossaryTerm>> = [
    term("term_whisken_people", "Whisken People", ["Wiscan", "Wiscans", "Whisken race"], "Catlike people originally tied to Tabby Island, later Whisker Woods and Tablemaker tradition.", "story_whisken_people_role", "Team Spoiler"),
    term("term_tabby_island", "Tabby Island", [], "Original Whisken home and the site of Cat Cauldron decay, Mas'eel infiltration, and exile history.", "story_tohm_tabby_island_disaster", "Team Spoiler"),
    term("term_cat_cauldron", "Cat Cauldron", ["The Cat Cauldron"], "Sentient culinary artifact that holds chef knowledge but cannot teach true Magical Meals.", "story_cat_cauldron", "Team Spoiler"),
    term("term_dragon_knife", "Dragon Knife", [], "Major artifact tied to the royal family's desperate search for magic.", "story_dragon_knife_origin", "Team Spoiler"),
    term("term_dark_culinary_arts", "Dark Culinary Arts", ["Dark Magical Meals", "Dark food magic"], "Corrupted food magic born apart from the Tablemaker's gift.", "story_dark_culinary_arts", "Secret Lore"),
    term("term_lillia", "Princess Lillia", ["Lillia"], "Human princess obsessed with becoming a faery and tied to the dark meal incident.", "story_lillia_recipe_pages", "Team Spoiler"),
    term("term_tohm_kyatt", "Tohm Kyatt", ["Tohm"], "Whisken chef whose obsession with an impossible flavor drives much of the hidden backstory.", "story_tohm_tabby_island_disaster", "Secret Lore"),
    term("term_gwen", "Gwen", [], "Human fighter and devoted Tablekeeper who creates the first true Magical Meal of the game.", "story_gwen_fire_meal_discovery", "Secret Lore"),
    term("term_recipe_pages", "Recipe Pages", ["Torn recipe pages"], "Pages torn from Tohm's recipe book and recovered through the game's progression.", "story_recipe_pages_scattered", "Player Knowledge"),
    term("term_faery_realm", "Faery Realm", ["Fairy Realm"], "Realm connected to Lillia's desire, Lel Kai, and faery refusal lore.", "story_faery_refusal", "Team Spoiler"),
    term("term_whisker_woods", "Whisker Woods", [], "Act 1 forest region and survivor home for Whisken Village.", "story_act1_corruption_spread", "Player Knowledge"),
    term("term_datka_dagda", "Datka / Dagda", ["Datka", "Dagda"], "Unresolved naming term for an older mythic figure from Tohm's childhood cauldron tale.", "", "Team Spoiler")
  ];
  return terms.map((item) => normalizeGlossaryTerm(item));
}

export function buildStoryReferenceBacklinks(database: Pick<LoreDatabase, "entries" | "worldBuilding" | "bestiary">): StoryReferenceBacklink[] {
  const backlinks: StoryReferenceBacklink[] = [];
  (database.entries || []).forEach((entry) => {
    normalizeLinkedStoryReferenceIds(entry.linkedStoryReferenceIds).forEach((storyReferenceId) => {
      backlinks.push({
        id: `entry:${entry.id}:${storyReferenceId}`,
        storyReferenceId,
        targetType: "entry",
        targetId: entry.id,
        title: entry.title,
        moduleLabel: entry.category || "Lore Entry",
        summary: entry.summary || entry.publicDescription || entry.internalLore || entry.type,
        updatedAt: entry.updatedAt
      });
    });
  });

  allWorldBuildingEntries(database.worldBuilding).forEach((entry) => {
    normalizeLinkedStoryReferenceIds(entry.linkedStoryReferenceIds).forEach((storyReferenceId) => {
      backlinks.push({
        id: `world:${entry.category}:${entry.id}:${storyReferenceId}`,
        storyReferenceId,
        targetType: "world",
        targetId: entry.id,
        targetCategory: entry.category,
        title: entry.title,
        moduleLabel: `World Building / ${entry.category}`,
        summary: entry.summary || entry.type,
        updatedAt: entry.updatedAt
      });
    });
  });

  (database.bestiary || []).forEach((creature) => {
    normalizeLinkedStoryReferenceIds(creature.linkedStoryReferenceIds).forEach((storyReferenceId) => {
      backlinks.push({
        id: `creature:${creature.id}:${storyReferenceId}`,
        storyReferenceId,
        targetType: "creature",
        targetId: creature.id,
        title: creature.name,
        moduleLabel: "Bestiary",
        summary: creature.description || creature.overview || creature.type,
        updatedAt: creature.updatedAt
      });
    });
  });

  return backlinks;
}

export function backlinksForReference(database: Pick<LoreDatabase, "entries" | "worldBuilding" | "bestiary">, storyReferenceId: string) {
  return buildStoryReferenceBacklinks(database).filter((backlink) => backlink.storyReferenceId === storyReferenceId);
}

export function buildStoryConsistencyResults(database: LoreDatabase): StoryConsistencyResult[] {
  const results: StoryConsistencyResult[] = [];
  const references = normalizeStoryReferences(database.storyReferences);
  const referenceById = new Map(references.map((reference) => [reference.id, reference]));
  const glossary = normalizeGlossaryTerms(database.glossaryTerms);
  const backlinks = buildStoryReferenceBacklinks(database);
  const usedReferenceIds = new Set(backlinks.map((backlink) => backlink.storyReferenceId));
  const targets = buildConsistencyTargets(database);

  glossary.forEach((term) => {
    if (!term.linkedStoryReferenceId) return;
    const names = [term.primaryName, ...term.alternateNames].map(normalizeLookup).filter(Boolean);
    targets.forEach((target) => {
      if (target.linkedStoryReferenceIds.includes(term.linkedStoryReferenceId)) return;
      const targetText = normalizeLookup(target.searchText);
      if (!names.some((name) => name && targetText.includes(name))) return;
      results.push({
        id: `unlinked:${target.id}:${term.id}`,
        kind: "unlinkedMention",
        title: "Possible Unlinked Mention",
        detail: `"${term.primaryName}" appears in ${target.moduleLabel}: ${target.title}, but its Story Reference is not linked.`,
        actionLabel: "Link Existing Reference",
        secondaryActionLabel: "Create New Reference",
        target,
        storyReferenceId: term.linkedStoryReferenceId,
        glossaryTermId: term.id
      });
    });
  });

  references.forEach((reference) => {
    if (!usedReferenceIds.has(reference.id)) {
      results.push({
        id: `unused:${reference.id}`,
        kind: "unusedReference",
        title: "Unused Story Reference",
        detail: `"${reference.title}" is not linked anywhere yet.`,
        actionLabel: "Open Source",
        storyReferenceId: reference.id
      });
    }
  });

  backlinks.forEach((backlink) => {
    const reference = referenceById.get(backlink.storyReferenceId);
    if (!reference) return;
    if (/scrapped|old version/i.test(reference.canonStatus)) {
      results.push({
        id: `retired:${backlink.id}`,
        kind: "retiredReferenceUsed",
        title: "Retired Reference Still Used",
        detail: `"${reference.title}" is marked ${reference.canonStatus} but still appears in ${backlink.moduleLabel}: ${backlink.title}.`,
        actionLabel: "Review",
        secondaryActionLabel: "Unlink",
        target: backlink,
        storyReferenceId: reference.id
      });
    }
    if (isPublicTarget(backlink) && /team spoiler|secret lore/i.test(reference.spoilerLevel)) {
      results.push({
        id: `spoiler:${backlink.id}`,
        kind: "spoilerRisk",
        title: "Potential Spoiler Issue",
        detail: `"${reference.title}" is ${reference.spoilerLevel} but appears in ${backlink.moduleLabel}: ${backlink.title}.`,
        actionLabel: "Review",
        secondaryActionLabel: "Change Spoiler Level",
        target: backlink,
        storyReferenceId: reference.id
      });
    }
  });

  const summaryBuckets = new Map<string, StoryReference[]>();
  references.forEach((reference) => {
    const key = normalizeLookup(reference.shortSummary).slice(0, 180);
    if (key.length < 40) return;
    summaryBuckets.set(key, [...(summaryBuckets.get(key) || []), reference]);
  });
  summaryBuckets.forEach((bucket) => {
    if (bucket.length < 2) return;
    results.push({
      id: `duplicate:${bucket.map((item) => item.id).join(":")}`,
      kind: "duplicateSummary",
      title: "Duplicate Story Summary",
      detail: `${bucket.map((item) => item.title).join(", ")} share nearly identical linked summaries.`,
      actionLabel: "Review Sources",
      storyReferenceId: bucket[0].id
    });
  });

  return results.slice(0, 80);
}

export function storyReferenceSyncStatus(reference: StoryReference | undefined, targetUpdatedAt?: string) {
  if (!reference) return "Missing Source";
  const sourceTime = Date.parse(reference.lastEditedAt || "");
  const targetTime = Date.parse(targetUpdatedAt || "");
  if (Number.isFinite(sourceTime) && Number.isFinite(targetTime) && sourceTime > targetTime) return "Source Updated";
  return "Synced";
}

export function createStoryReferenceId(title: string, existingIds: string[] = []) {
  const base = `story_${slugify(title).replace(/-/g, "_") || "reference"}`;
  if (!existingIds.includes(base)) return base;
  let index = 2;
  while (existingIds.includes(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

export function storyReferenceSearchText(reference: StoryReference) {
  return [
    reference.id,
    reference.title,
    reference.shortSummary,
    reference.fullDescription,
    reference.canonStatus,
    reference.spoilerLevel,
    reference.actChapter,
    reference.tags.join(" "),
    reference.relatedCharacters.join(" "),
    reference.relatedLocations.join(" "),
    reference.relatedQuests.join(" "),
    reference.relatedFactions.join(" "),
    reference.relatedItems.join(" "),
    reference.relatedRecipes.join(" "),
    reference.relatedTimelineEvents.join(" "),
    reference.relatedLoreReveals.join(" "),
    reference.relatedStoryBeats.join(" "),
    reference.notes
  ].join(" ").toLowerCase();
}

function ref(
  id: string,
  title: string,
  shortSummary: string,
  fullDescription: string,
  canonStatus: StoryReferenceCanonStatus,
  spoilerLevel: StoryReferenceSpoilerLevel,
  patch: Partial<StoryReference> = {}
) {
  return normalizeStoryReference({
    id,
    title,
    shortSummary,
    fullDescription,
    canonStatus,
    spoilerLevel,
    createdAt: starterStamp,
    lastEditedAt: starterStamp,
    versions: [],
    ...patch
  });
}

function term(
  id: string,
  primaryName: string,
  alternateNames: string[],
  shortDefinition: string,
  linkedStoryReferenceId: string,
  spoilerLevel: StoryReferenceSpoilerLevel
) {
  return {
    id,
    primaryName,
    alternateNames,
    shortDefinition,
    linkedStoryReferenceId,
    spoilerLevel,
    createdAt: starterStamp,
    updatedAt: starterStamp
  };
}

function normalizeStoryReferenceVersions(value: unknown): StoryReferenceVersion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<StoryReferenceVersion> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: text(item.id) || `story-version-${Date.now()}-${index}`,
      editedAt: text(item.editedAt) || nowIso(),
      previousTitle: text(item.previousTitle),
      previousShortSummary: text(item.previousShortSummary),
      previousFullDescription: text(item.previousFullDescription),
      previousCanonStatus: text(item.previousCanonStatus) || "Idea",
      previousSpoilerLevel: text(item.previousSpoilerLevel) || "Team Spoiler",
      notes: text(item.notes)
    }));
}

function buildConsistencyTargets(database: LoreDatabase): StoryConsistencyTarget[] {
  const entryTargets = (database.entries || []).map((entry) => ({
    id: `entry:${entry.id}`,
    storyReferenceId: "",
    targetType: "entry" as const,
    targetId: entry.id,
    title: entry.title,
    moduleLabel: entry.category || "Lore Entry",
    summary: entry.summary || entry.publicDescription || entry.internalLore || entry.type,
    updatedAt: entry.updatedAt,
    linkedStoryReferenceIds: normalizeLinkedStoryReferenceIds(entry.linkedStoryReferenceIds),
    searchText: entrySearchText(entry)
  }));
  const worldTargets = allWorldBuildingEntries(database.worldBuilding).map((entry) => ({
    id: `world:${entry.category}:${entry.id}`,
    storyReferenceId: "",
    targetType: "world" as const,
    targetId: entry.id,
    targetCategory: entry.category,
    title: entry.title,
    moduleLabel: `World Building / ${entry.category}`,
    summary: entry.summary || entry.type,
    updatedAt: entry.updatedAt,
    linkedStoryReferenceIds: normalizeLinkedStoryReferenceIds(entry.linkedStoryReferenceIds),
    searchText: worldSearchText(entry)
  }));
  const creatureTargets = (database.bestiary || []).map((creature) => ({
    id: `creature:${creature.id}`,
    storyReferenceId: "",
    targetType: "creature" as const,
    targetId: creature.id,
    title: creature.name,
    moduleLabel: "Bestiary",
    summary: creature.description || creature.overview || creature.type,
    updatedAt: creature.updatedAt,
    linkedStoryReferenceIds: normalizeLinkedStoryReferenceIds(creature.linkedStoryReferenceIds),
    searchText: creatureSearchText(creature)
  }));
  return [...entryTargets, ...worldTargets, ...creatureTargets];
}

function isPublicTarget(backlink: StoryReferenceBacklink) {
  return /marketing|public/i.test(`${backlink.moduleLabel} ${backlink.title} ${backlink.summary}`);
}

function entrySearchText(entry: LoreEntry) {
  return [
    entry.title,
    entry.category,
    entry.type,
    entry.status,
    entry.spoilerLevel,
    entry.summary,
    entry.publicDescription,
    entry.internalLore,
    entry.tags.join(" "),
    Object.values(entry.fields || {}).join(" "),
    Object.values(entry.connections || {}).flat().join(" "),
    Object.values(entry.notes || {}).join(" "),
    entry.timeline?.trueTimeline,
    entry.timeline?.playerTimeline,
    entry.secret?.trueFact,
    entry.secret?.playerKnowledge
  ].filter(Boolean).join(" ");
}

function worldSearchText(entry: WorldBuildingEntry) {
  return [
    entry.title,
    entry.category,
    entry.type,
    entry.summary,
    entry.tags.join(" "),
    Object.values(entry.fields || {}).join(" "),
    entry.relatedEntries.map((related) => related.note).join(" ")
  ].filter(Boolean).join(" ");
}

function creatureSearchText(creature: BestiaryCreature) {
  return [
    creature.name,
    creature.category,
    creature.type,
    creature.description,
    creature.overview,
    creature.fieldNotes,
    creature.habitat,
    creature.behavior,
    creature.gameplayPurpose,
    creature.productionNotes,
    Object.values(creature.lore || {}).join(" "),
    Object.values(creature.drops || {}).join(" ")
  ].filter(Boolean).join(" ");
}

function normalizeCanonStatus(value: unknown): StoryReferenceCanonStatus | string {
  const raw = text(value);
  return storyReferenceCanonOptions.includes(raw as StoryReferenceCanonStatus) ? raw : "Idea";
}

function normalizeStorySpoilerLevel(value: unknown): StoryReferenceSpoilerLevel | string {
  const raw = text(value);
  return storyReferenceSpoilerOptions.includes(raw as StoryReferenceSpoilerLevel) ? raw : "Team Spoiler";
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function uniqueStrings(values: string[]) {
  return values.filter((value, index, list) => Boolean(value.trim()) && list.indexOf(value) === index);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function normalizeLookup(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function allWorldBuildingEntries(value: WorldBuildingData) {
  return Object.values(value || {}).flat() as WorldBuildingEntry[];
}

const starterStamp = "2026-05-16T00:00:00.000Z";
