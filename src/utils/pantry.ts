import type { BestiaryCreature, LoreEntry } from "../types";
import { resolveImageSourceUrl } from "./imageFit";

export type PantryTab = "pantry" | "meals";
export type PantryMealGroupId = "magical-meals" | "tavern-meals" | "snacks" | "ales" | "magical-ales" | "components";

export interface PantryMealGroup {
  id: PantryMealGroupId;
  title: string;
  icon: string;
  description: string;
}

export interface PantrySource {
  creatureId: string;
  creatureName: string;
  creatureType: string;
  habitat: string;
}

export interface PantryPrepVariant {
  id: string;
  name: string;
  targetIngredientId: string;
  baseName: string;
  station: string;
  resultType: string;
  notes: string;
  usedFor: string;
}

export interface PantryIngredient {
  id: string;
  name: string;
  baseName: string;
  category: string;
  imageUrl: string;
  rarity: string;
  summary: string;
  tags: string[];
  entry?: LoreEntry;
  dropsFrom: PantrySource[];
  spawnLocations: string[];
  usedInRecipes: LoreEntry[];
  prepVariants: PantryPrepVariant[];
  notes: string;
}

export interface PantryRequirement {
  id: string;
  label: string;
  kind: "specific" | "flexible";
  matchedIngredientIds: string[];
}

export interface PantryMeal {
  id: string;
  title: string;
  type: string;
  group: PantryMealGroupId;
  summary: string;
  ingredients: string[];
  requirements: PantryRequirement[];
  stations: string[];
  effects: string;
  statusEffects: string;
  castPower: string;
  weaponEffect: string;
  ultimatePower: string;
  entry: LoreEntry;
}

export interface PantryStation {
  id: string;
  name: string;
  icon: string;
  summary: string;
  examples: string[];
}

export interface PantryModel {
  ingredients: PantryIngredient[];
  meals: PantryMeal[];
  stations: PantryStation[];
}

export const pantryStations: PantryStation[] = [
  {
    id: "crushing-station",
    name: "Crushing Station",
    icon: "Hammer",
    summary: "Breaks spice rocks, minerals, shells, dried herbs, and hard ingredients into powders, flakes, or pastes.",
    examples: ["Crushed spice rocks", "Pressed slime gel", "Ground herb mix"]
  },
  {
    id: "chopping-station",
    name: "Chopping Station",
    icon: "ChefHat",
    summary: "Cuts vegetables, meats, fungi, and bulky drops into prepared ingredient forms.",
    examples: ["Sliced potato", "Chopped boar meat", "Diced turnip"]
  },
  {
    id: "cat-cauldron",
    name: "Cat Cauldron",
    icon: "Soup",
    summary: "A sentient cauldron character used for broths, magical reductions, and finalizing certain meals.",
    examples: ["Veggie broth", "Cray broth", "Slime essence base"]
  },
  {
    id: "oven",
    name: "Oven",
    icon: "Flame",
    summary: "Bakes, roasts, dries, and finishes warm meals or ingredient upgrades.",
    examples: ["Roasted potato", "Baked turnip", "Roasted boar meat"]
  },
  {
    id: "frying-station",
    name: "Frying Station",
    icon: "Flame",
    summary: "Fries chopped meats, vegetables, fungi, and prepared pieces with butter, oil, or rendered fat.",
    examples: ["Fried crayhusk meat", "Fried potato", "Crisped mushroom bits"]
  },
  {
    id: "campfire-grill",
    name: "Campfire / Grill",
    icon: "Flame",
    summary: "Roasts or grills prepared ingredients over open flame for smoky travel food and hearty meals.",
    examples: ["Grilled crayhusk meat", "Campfire boar strips", "Charred turnip"]
  }
];

export const pantryMealGroups: PantryMealGroup[] = [
  {
    id: "magical-meals",
    title: "Magical Meals",
    icon: "Sparkles",
    description: "Meals that grant powers, combat tools, story magic, or special recipe-page effects."
  },
  {
    id: "tavern-meals",
    title: "Tavern Meals",
    icon: "ChefHat",
    description: "Regular meals served in the tavern, village dishes, comfort foods, and menu staples."
  },
  {
    id: "snacks",
    title: "Snacks",
    icon: "Wheat",
    description: "Small bites that help Gwen with stamina, quick buffs, recovery, or travel."
  },
  {
    id: "ales",
    title: "Ales",
    icon: "Droplets",
    description: "Tavern drinks, brewed goods, cozy ales, and non-magical beverage recipes."
  },
  {
    id: "magical-ales",
    title: "Magical Ales",
    icon: "WandSparkles",
    description: "Ales, tonics, or drinks that grant buffs, abilities, elemental effects, or magic."
  },
  {
    id: "components",
    title: "Components / Prep Bases",
    icon: "Soup",
    description: "Broths, stocks, chopped ingredients, bases, sauces, and crafted sub-recipes used inside larger meals."
  }
];

export function buildPantryModel(entries: LoreEntry[], bestiary: BestiaryCreature[]): PantryModel {
  const recipeEntries = [...entries.filter(isRecipeEntry), ...createStarterMagicalMealEntries(entries)];
  const ingredientEntries = entries.filter(isIngredientEntry);
  const ingredients = new Map<string, PantryIngredient>();

  const ensureIngredient = (name: string, patch: Partial<PantryIngredient> = {}) => {
    const cleanedName = cleanIngredientName(name);
    const key = normalizeName(cleanedName);
    const current = ingredients.get(key);
    const base: PantryIngredient = {
      id: key || slugify(cleanedName),
      name: cleanedName,
      baseName: inferBaseIngredient(cleanedName),
      category: inferIngredientCategory(cleanedName, patch.entry),
      imageUrl: "",
      rarity: "Unknown",
      summary: "",
      tags: [],
      dropsFrom: [],
      spawnLocations: [],
      usedInRecipes: [],
      prepVariants: [],
      notes: ""
    };
    const merged: PantryIngredient = { ...base, ...current, ...patch };
    const next: PantryIngredient = {
      ...merged,
      imageUrl: patch.imageUrl || current?.imageUrl || merged.imageUrl,
      tags: unique([...(current?.tags || []), ...(patch.tags || [])]),
      dropsFrom: mergeSources(current?.dropsFrom || [], patch.dropsFrom || []),
      spawnLocations: unique([...(current?.spawnLocations || []), ...(patch.spawnLocations || [])]),
      usedInRecipes: uniqueEntries([...(current?.usedInRecipes || []), ...(patch.usedInRecipes || [])])
    };
    ingredients.set(key, next);
    return next;
  };

  ingredientEntries.forEach((entry) => {
    ensureIngredient(entry.title, {
      entry,
      category: inferIngredientCategory(entry.title, entry),
      imageUrl: getEntryImage(entry),
      rarity: String(entry.fields?.rarity || entry.status || "Unknown"),
      summary: entry.summary || entry.publicDescription || entry.internalLore,
      tags: entry.tags || [],
      spawnLocations: unique([
        ...entry.connections.locations,
        ...splitLooseList(String(entry.fields?.whereFound || entry.fields?.location || ""))
      ]),
      notes: String(entry.fields?.loreDescription || entry.fields?.gameplayUse || entry.internalLore || "")
    });
  });

  bestiary.forEach((creature) => {
    const source: PantrySource = {
      creatureId: creature.id,
      creatureName: creature.name,
      creatureType: creature.type,
      habitat: creature.habitat || creature.habitatInfo?.knownLocations || "Unknown habitat"
    };
    splitLooseList(creature.drops?.droppedIngredients || "").forEach((drop) => {
      const dropIcon = findDropIconImage(creature, drop);
      ensureIngredient(drop, {
        category: inferIngredientCategory(drop),
        imageUrl: dropIcon,
        summary: `${drop} can be obtained from ${creature.name}.`,
        rarity: creature.rarity || "Unknown",
        dropsFrom: [source],
        spawnLocations: splitLooseList([creature.habitat, creature.habitatInfo?.knownLocations].filter(Boolean).join(", ")),
        notes: creature.drops?.cookingUses || creature.drops?.recipeConnections || ""
      });
    });
  });

  [...ingredients.values()].forEach((ingredient) => {
    buildPrepVariants(ingredient.name, ingredient.baseName, ingredient.category).forEach((variant) => {
      const existingVariant = ingredients.get(normalizeName(variant.name));
      ensureIngredient(
        variant.name,
        existingVariant?.entry
          ? {
              baseName: variant.baseName,
              tags: unique([...(existingVariant.tags || []), "Prepared Variant", variant.station, variant.resultType])
            }
          : {
              baseName: variant.baseName,
              category: variant.resultType,
              rarity: ingredient.rarity,
              summary: variant.notes,
              tags: unique([...ingredient.tags, "Prepared Variant", variant.station, variant.resultType]),
              spawnLocations: ingredient.spawnLocations,
              notes: variant.usedFor
            }
      );
    });
  });

  const allIngredients = [...ingredients.values()].map((ingredient) => {
    const usedInRecipes = recipeEntries.filter((recipe) => recipeUsesIngredient(recipe, ingredient));
    return {
      ...ingredient,
      usedInRecipes: uniqueEntries([...ingredient.usedInRecipes, ...usedInRecipes]),
      prepVariants: buildPrepVariants(ingredient.name, ingredient.baseName, ingredient.category)
    };
  }).sort(sortPantryIngredients);

  return {
    ingredients: allIngredients,
    meals: recipeEntries.map((entry) => {
      const requirementLabels = splitLooseList(String(entry.fields?.ingredientsRequired || entry.wiki?.ingredientsRequired || ""));
      const requirements = requirementLabels.map((label) => buildRequirement(label, allIngredients));
      return {
        id: entry.id,
        title: entry.title,
        type: entry.type,
        group: inferMealGroup(entry),
        summary: entry.summary || entry.publicDescription || entry.internalLore,
        ingredients: requirementLabels,
        requirements,
        stations: inferStationsForRecipe(entry),
        effects: String(entry.fields?.gameplayEffect || entry.fields?.magicalEffect || entry.fields?.gameplayUse || entry.summary || ""),
        statusEffects: String(entry.fields?.statusEffects || entry.fields?.statusEffect || ""),
        castPower: String(entry.fields?.castPower || entry.fields?.activePower || ""),
        weaponEffect: String(entry.fields?.weaponEffect || entry.fields?.weaponAspect || ""),
        ultimatePower: String(entry.fields?.ultimatePower || entry.fields?.ultimate || ""),
        entry
      };
    }).sort((a, b) => a.title.localeCompare(b.title)),
    stations: pantryStations
  };
}

function isIngredientEntry(entry: LoreEntry) {
  return entry.category === "Food & Inventory" && /ingredient|drop|substitute|gel|essence|produce|meat|spice/i.test(entry.type);
}

function isRecipeEntry(entry: LoreEntry) {
  return entry.category === "Food & Inventory" && /recipe|meal|menu|dish|broth|tonic|ale|drink|consumable|food magic|food item/i.test(entry.type);
}

function recipeUsesIngredient(recipe: LoreEntry, ingredient: PantryIngredient) {
  const haystack = [
    recipe.title,
    recipe.summary,
    recipe.internalLore,
    recipe.fields?.ingredientsRequired,
    recipe.fields?.usedInRecipes,
    recipe.wiki?.ingredientsRequired
  ].join(" ").toLowerCase();
  const ingredientName = ingredient.name;
  const baseName = ingredient.baseName;
  const exact = ingredientName.toLowerCase();
  const base = baseName.toLowerCase();
  const requirements = splitLooseList(String(recipe.fields?.ingredientsRequired || recipe.wiki?.ingredientsRequired || ""));
  return (
    haystack.includes(exact) ||
    (!!base && base.length > 3 && haystack.includes(base)) ||
    requirements.some((requirement) => isFlexibleRequirement(requirement) && flexibleRequirementMatches(requirement, ingredient))
  );
}

function inferIngredientCategory(name: string, entry?: LoreEntry) {
  const savedCategory = typeof entry?.fields?.pantryCategory === "string" ? entry.fields.pantryCategory.trim() : "";
  if (savedCategory) return savedCategory;
  const value = `${name} ${entry?.type || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  if (/slime|gel|essence/.test(value)) return "Slime Drop";
  if (/meat|cray|prawn|boar|husk/.test(value)) return "Meat / Creature Drop";
  if (/potato|turnip|boga|herb|vegetable|root|fruit|berry/.test(value)) return "Produce";
  if (/spice|salt|rock|mineral|stone/.test(value)) return "Spice / Mineral";
  if (/corrupt|dark|magic/.test(value)) return "Magical Ingredient";
  return "Ingredient";
}

function inferBaseIngredient(name: string) {
  const cleaned = cleanIngredientName(name)
    .replace(/^(sliced|chopped|diced|crushed|ground|pressed|distilled|roasted|baked|cooked|fried|grilled|toasted|simmered|boiled|charred)\s+/i, "")
    .replace(/\s+(slice|slices|chunks|dust|powder|paste|broth|stock|base|infusion|extract|concentrate|seasoning|jam)$/i, "");
  return cleaned || name;
}

function inferMealGroup(entry: LoreEntry): PantryMealGroupId {
  const savedGroup = typeof entry.fields?.pantryMealGroup === "string" ? entry.fields.pantryMealGroup : "";
  if (pantryMealGroups.some((group) => group.id === savedGroup)) return savedGroup as PantryMealGroupId;
  const value = [
    entry.title,
    entry.type,
    entry.summary,
    entry.fields?.recipeCategory,
    entry.fields?.mealCategory,
    entry.fields?.gameplayEffect,
    entry.fields?.magicalEffect,
    entry.tags.join(" ")
  ].join(" ").toLowerCase();

  if (/\b(broth|stock|base|component|sauce|reduction|chopped|sliced|diced|crushed)\b|\bprep(?:ped)?\s+(ingredient|component|base)\b/.test(value)) return "components";
  if (/magical ale|magic ale|buff ale|ability ale|tonic|elixir/.test(value)) return "magical-ales";
  if (/\bale\b|drink|beverage|brew/.test(value)) return "ales";
  if (/snack|quick bite|travel bite|stamina|small bite/.test(value)) return "snacks";
  if (/magic|magical|power|buff|ability|combat|spell|dark culinary|food magic/.test(value)) return "magical-meals";
  return "tavern-meals";
}

function buildRequirement(label: string, ingredients: PantryIngredient[]): PantryRequirement {
  const kind = isFlexibleRequirement(label) ? "flexible" : "specific";
  const matchedIngredientIds = ingredients
    .filter((ingredient) =>
      kind === "flexible"
        ? flexibleRequirementMatches(label, ingredient)
        : normalizeName(ingredient.name) === normalizeName(label) || normalizeName(ingredient.baseName) === normalizeName(label)
    )
    .map((ingredient) => ingredient.id);

  return {
    id: slugify(label),
    label,
    kind,
    matchedIngredientIds
  };
}

function createStarterMagicalMealEntries(entries: LoreEntry[]): LoreEntry[] {
  const existingTitles = new Set(entries.map((entry) => normalizeName(entry.title)));
  const starters = [
    {
      id: "starter-magical-meal-fire",
      title: "Fire Meal",
      summary: "A blazing magical meal that turns Gwen into a burst of flame and adds fire aspect to her combat kit.",
      ingredientsRequired: "Any Spicy Slime Gel, Any Protein, Veggie Broth",
      gameplayEffect: "Grants fire-aspected movement and weapon pressure.",
      statusEffects: "Fire Aspect, Burn Chance, Heat Trail",
      castPower: "Fire Dash: Gwen dashes forward in flames, damages low-health enemies, and can set targets on fire.",
      weaponEffect: "Weapons gain fire aspect for a short duration, adding burn pressure to hits.",
      ultimatePower: "Phoenix Meteor: Gwen launches upward in a phoenix-like blaze, then crashes down in a fiery meteor impact."
    },
    {
      id: "starter-magical-meal-ice",
      title: "Ice Meal",
      summary: "A chilling magical meal for control, slowing enemies, and creating safe openings.",
      ingredientsRequired: "Any Sour Slime Gel, Any Veggie, Clear Broth",
      gameplayEffect: "Grants cold control, slow effects, and defensive spacing tools.",
      statusEffects: "Chill, Slow, Freeze Build-Up",
      castPower: "Frost Step: Gwen slides through danger and leaves a slick icy trail that slows enemies.",
      weaponEffect: "Weapons gain ice aspect and build chill on hit.",
      ultimatePower: "Winter Bloom: Gwen erupts a freezing ring that roots or freezes weakened enemies."
    },
    {
      id: "starter-magical-meal-lightning",
      title: "Lightning Meal",
      summary: "A sharp magical meal that rewards speed, chaining attacks, and quick reactions.",
      ingredientsRequired: "Any Bitter Slime Gel, Any Protein, Crushed Spice",
      gameplayEffect: "Grants fast movement, chain lightning, and burst combo potential.",
      statusEffects: "Static Charge, Shock, Haste",
      castPower: "Spark Rush: Gwen blinks forward in a crackle of lightning and chains damage between nearby enemies.",
      weaponEffect: "Weapons gain lightning aspect and can arc to nearby enemies.",
      ultimatePower: "Stormfall: Gwen calls down a focused lightning strike after a short charged leap."
    },
    {
      id: "starter-magical-meal-earth",
      title: "Earth Magical Meal",
      summary: "A grounding magical meal built from a hearty broth base, protection, and heavy impact.",
      ingredientsRequired: "Any Savory Meat, Any Veggie, Veggie Broth",
      gameplayEffect: "Grants armor, knockback resistance, and heavy earth impacts.",
      statusEffects: "Fortified, Rooted, Stagger Power",
      castPower: "Stoneguard: Gwen braces herself and gains a short defensive shell.",
      weaponEffect: "Weapons gain earth aspect and stagger smaller enemies more easily.",
      ultimatePower: "Grovebreaker: Gwen slams the ground and sends a shockwave through nearby enemies."
    }
  ];

  return starters
    .filter((meal) => !existingTitles.has(normalizeName(meal.title)))
    .map((meal) => createVirtualMealEntry(meal));
}

function createVirtualMealEntry(meal: {
  id: string;
  title: string;
  summary: string;
  ingredientsRequired: string;
  gameplayEffect: string;
  statusEffects: string;
  castPower: string;
  weaponEffect: string;
  ultimatePower: string;
}): LoreEntry {
  const now = new Date().toISOString();
  return {
    id: meal.id,
    title: meal.title,
    category: "Food & Inventory",
    type: "Magical Meal",
    status: "Idea",
    spoilerLevel: "No Spoiler",
    tags: ["Magical Meal", "Food Magic"],
    summary: meal.summary,
    publicDescription: "",
    internalLore: "",
    fields: {
      pantryVirtual: true,
      pantryMealGroup: "magical-meals",
      ingredientsRequired: meal.ingredientsRequired,
      gameplayEffect: meal.gameplayEffect,
      statusEffects: meal.statusEffects,
      castPower: meal.castPower,
      weaponEffect: meal.weaponEffect,
      ultimatePower: meal.ultimatePower
    },
    connections: {
      characters: ["Gwen"],
      locations: [],
      recipes: [],
      quests: [],
      items: [],
      factions: [],
      secrets: [],
      gameplaySystems: ["Cooking System", "Combat System"],
      enemies: [],
      timelineEvents: []
    },
    notes: {
      art: "",
      gameplay: meal.gameplayEffect,
      production: "Starter magical meal template. Save it from the Pantry to make it a normal lore entry.",
      marketing: "",
      unresolved: ""
    },
    wiki: {
      itemType: "Magical Meal",
      ingredientsRequired: meal.ingredientsRequired,
      gameplayUse: meal.gameplayEffect,
      notes: `${meal.castPower}\n${meal.weaponEffect}\n${meal.ultimatePower}`
    },
    media: {
      imageFits: {},
      galleryImages: [],
      videoLinks: [],
      uploadedVideos: [],
      mediaNotes: ""
    },
    artGallery: [],
    artVault: { sections: [] },
    characterArtBoard: { categories: [] },
    characterRelationships: [],
    driveFolderId: "",
    driveFolderLink: "",
    createdAt: now,
    updatedAt: now
  };
}

function isFlexibleRequirement(label: string) {
  return /^any\s+/i.test(label.trim());
}

function flexibleRequirementMatches(requirement: string, ingredient: PantryIngredient) {
  const requiredTraits = normalizeName(requirement).replace(/^any\s+/, "").split(/\s+/).filter(Boolean);
  const traits = inferIngredientTraits(ingredient);
  return requiredTraits.every((trait) => {
    if (trait === "veggie" || trait === "vegetable") return traits.has("veggie");
    if (trait === "protein") return traits.has("protein");
    if (trait === "meat") return traits.has("meat") || traits.has("protein");
    if (trait === "fruit") return traits.has("fruit");
    if (trait === "slime") return traits.has("slime");
    if (trait === "spice") return traits.has("spice");
    if (trait === "sweet") return traits.has("sweet");
    if (trait === "bitter") return traits.has("bitter");
    if (trait === "sour") return traits.has("sour");
    if (trait === "savory") return traits.has("savory");
    if (trait === "salty") return traits.has("salty");
    if (trait === "spicy") return traits.has("spicy");
    return traits.has(trait);
  });
}

function inferIngredientTraits(ingredient: PantryIngredient) {
  const value = [
    ingredient.name,
    ingredient.baseName,
    ingredient.category,
    ingredient.summary,
    ingredient.notes,
    ingredient.tags.join(" ")
  ].join(" ").toLowerCase();
  const traits = new Set<string>();

  if (/meat|boar|prawn|cray|fish|protein|egg|husk/.test(value)) traits.add("protein");
  if (/meat|boar|prawn|cray|fish|husk/.test(value)) traits.add("meat");
  if (/veggie|vegetable|potato|potat|turnip|root|leaf|greens|mushroom|fungi/.test(value)) traits.add("veggie");
  if (/fruit|berry|apple|pear|melon/.test(value)) traits.add("fruit");
  if (/slime|gel|essence/.test(value)) traits.add("slime");
  if (/spice|salt|pepper|rock|mineral|seasoning/.test(value)) traits.add("spice");
  if (/sweet|honey|sugar|berry|fruit/.test(value)) traits.add("sweet");
  if (/bitter|bitter slime|leafy|dark green/.test(value)) traits.add("bitter");
  if (/sour|acid|citrus/.test(value)) traits.add("sour");
  if (/savory|umami|meat|broth|stock|mushroom/.test(value)) traits.add("savory");
  if (/salty|salt|brine/.test(value)) traits.add("salty");
  if (/spicy|pepper|heat|cinder|fire/.test(value)) traits.add("spicy");

  return traits;
}

function getEntryImage(entry: LoreEntry) {
  const imageUrl = (
    entry.media.iconImage ||
    entry.media.mainImage ||
    entry.media.galleryImages[0] ||
    String(entry.fields?.imageUrl || entry.fields?.thumbnailUrl || "")
  );
  return resolveImageSourceUrl(String(imageUrl || ""));
}

function findDropIconImage(creature: BestiaryCreature, dropName: string) {
  const normalizedDrop = normalizeName(dropName);
  const icon = creature.drops?.icons?.find((candidate) => {
    const normalizedLabel = normalizeName(candidate.label);
    return normalizedLabel === normalizedDrop || normalizedLabel.includes(normalizedDrop) || normalizedDrop.includes(normalizedLabel);
  });
  return resolveImageSourceUrl(icon?.image || "");
}

function buildPrepVariants(name: string, baseName: string, category: string): PantryPrepVariant[] {
  const normalized = normalizeName(baseName);
  const normalizedName = normalizeName(name);
  const preparedStage = normalizedName === normalized ? "base" :
    /^(chopped|sliced|diced|pressed|crushed|ground)\s+/.test(normalizedName) ? "cut" :
    /^(fried|grilled|roasted|baked|toasted|charred)\s+/.test(normalizedName) ? "finished" :
    /(?:broth|stock|infusion|extract|concentrate|seasoning|jam)$/.test(normalizedName) ? "base-prep" :
    "prepared";
  const variants: PantryPrepVariant[] = [];
  const add = (label: string, station: string, resultType: string, notes: string, usedFor: string) => {
    variants.push({
      id: `${slugify(baseName)}-${slugify(label)}`,
      name: label,
      targetIngredientId: normalizeName(label),
      baseName,
      station,
      resultType,
      notes,
      usedFor
    });
  };

  if (/potato|potat/.test(normalized)) {
    if (preparedStage === "base") add(`Sliced ${baseName}`, "Chopping Station", "Prepared Ingredient", `Cut ${baseName} into thin pieces for fast cooking and crispy meal variants.`, "Pan meals, roasted sides, comfort meals.");
    if (preparedStage === "base" || preparedStage === "cut") {
      add(`Fried ${baseName}`, "Frying Station", "Cooked Ingredient", `Fried ${baseName} uses sliced ${baseName} with butter or oil until crisp.`, "Crispy sides, snacks, tavern comfort meals.");
      add(`Roasted ${baseName}`, "Oven", "Cooked Ingredient", `Baked or roasted ${baseName} until warm and hearty.`, "Hearty meals, Gwen comfort food, stamina dishes.");
      add(`${baseName} Broth Base`, "Cat Cauldron", "Broth Base", `Simmered ${baseName} into a thick body for soups and magical comfort meals.`, "Broths, restorative recipes.");
    }
  } else if (/turnip/.test(normalized)) {
    if (preparedStage === "base") add(`Diced ${baseName}`, "Chopping Station", "Prepared Ingredient", `Cut ${baseName} into cubes so it can soften evenly.`, "Veggie Broth, stews, starter meals.");
    if (preparedStage === "base" || preparedStage === "cut") {
      add(`Fried ${baseName}`, "Frying Station", "Cooked Ingredient", `Fried ${baseName} uses diced ${baseName} with butter or oil for a crisp edge.`, "Snacks, warm sides, tavern meals.");
      add(`Baked ${baseName}`, "Oven", "Cooked Ingredient", `Roasted ${baseName} to pull out sweetness.`, "Village meals and warm sides.");
      add(`${baseName} Broth Base`, "Cat Cauldron", "Broth Base", `Simmered ${baseName} into a vegetable broth base.`, "Veggie Broth, magical meal bases.");
    }
  } else if (/boar|meat|crayhusk|prawnhusk/.test(normalized) || category.includes("Meat")) {
    if (preparedStage === "base") add(`Chopped ${baseName}`, "Chopping Station", "Prepared Meat", `Portioned ${baseName} for soups, skewers, fried dishes, grilled dishes, or combat meals.`, "Broths, hearty meals, protein buffs.");
    if (preparedStage === "base" || preparedStage === "cut") {
      add(`Fried ${baseName}`, "Frying Station", "Cooked Meat", `Fried ${baseName} uses chopped ${baseName} prepared in the frying station with butter or oil.`, "Crispy protein, tavern meals, stamina snacks.");
      add(`Grilled ${baseName}`, "Campfire / Grill", "Cooked Meat", `Grilled ${baseName} uses chopped ${baseName} roasted over a campfire or grill for smoky flavor.`, "Travel meals, camp meals, hearty protein dishes.");
      add(`${baseName} Stock`, "Cat Cauldron", "Broth Base", `Simmered ${baseName} into a rich stock base.`, "Broths, stews, recovery meals.");
    }
  } else if (/slime|gel|essence/.test(normalized) || category.includes("Slime")) {
    if (preparedStage === "base") add(`Pressed ${baseName}`, "Crushing Station", "Flavor Extract", `Pressed ${baseName} into a cleaner flavor concentrate.`, "Substitutions, tonics, flavor-aspected meals.");
    if (preparedStage === "base" || preparedStage === "cut") {
      add(`${baseName} Infusion`, "Cat Cauldron", "Magical Infusion", `Reduced ${baseName} into a usable magical cooking base.`, "Magical meals, ales, slime substitutes.");
      add(`Distilled ${baseName}`, "Cat Cauldron", "Magical Concentrate", `Distilled ${baseName} into a stronger flavor-aspected concentrate.`, "Magical ales, combat meals, advanced substitutions.");
    }
  } else if (/herb|spice|salt|rock|mineral/.test(normalized) || category.includes("Spice")) {
    if (preparedStage === "base") add(`Crushed ${baseName}`, "Crushing Station", "Seasoning", `Ground ${baseName} into dust, flakes, or paste.`, "Seasonings, tonics, broths.");
    if (preparedStage === "base" || preparedStage === "cut") {
      add(`Toasted ${baseName}`, "Frying Station", "Toasted Seasoning", `Toasted ${baseName} to deepen aroma and unlock stronger flavor.`, "Sauces, warm meals, magical reductions.");
      add(`${baseName} Infusion`, "Cat Cauldron", "Infusion", `Steeped ${baseName} into a cooking infusion.`, "Ales, tonics, broth bases.");
    }
  } else if (/fruit|berry|honey/.test(normalized) || category.includes("Fruit")) {
    if (preparedStage === "base") add(`Sliced ${baseName}`, "Chopping Station", "Prepared Fruit", `Cut ${baseName} into usable pieces for snacks, desserts, and ales.`, "Snacks, sweet meals, tavern desserts.");
    if (preparedStage === "base" || preparedStage === "cut") {
      add(`Baked ${baseName}`, "Oven", "Cooked Fruit", `Baked ${baseName} until sweet and soft.`, "Desserts, tavern meals, comfort snacks.");
      add(`${baseName} Jam`, "Cat Cauldron", "Fruit Preserve", `Reduced ${baseName} into a sweet preserve.`, "Snacks, ales, pastry fillings.");
    }
  } else if (/mushroom|fungi|boga|produce|vegetable|root|herb/.test(normalized) || category.includes("Produce")) {
    if (preparedStage === "base") add(`Chopped ${baseName}`, "Chopping Station", "Prepared Ingredient", `Chopped ${baseName} into smaller pieces for even cooking.`, "Broths, stir fries, tavern meals.");
    if (preparedStage === "base" || preparedStage === "cut") {
      add(`Fried ${baseName}`, "Frying Station", "Cooked Ingredient", `Fried ${baseName} with butter or oil for a richer cooked form.`, "Sides, snacks, warm meals.");
      add(`Grilled ${baseName}`, "Campfire / Grill", "Cooked Ingredient", `Grilled ${baseName} over flame for a smoky travel-ready form.`, "Camp meals, hearty tavern dishes.");
      add(`${baseName} Broth Base`, "Cat Cauldron", "Broth Base", `Simmered ${baseName} into a usable broth base.`, "Broths, magical meal bases.");
    }
  }

  return variants.filter((variant) => normalizeName(variant.name) !== normalizeName(name));
}

function inferStationsForRecipe(entry: LoreEntry) {
  const haystack = [
    entry.title,
    entry.summary,
    entry.fields?.Preparation,
    entry.fields?.preparation,
    entry.fields?.cookingMethod,
    entry.internalLore
  ].join(" ").toLowerCase();
  const stations = new Set<string>();
  if (/chop|slice|cut|dice/.test(haystack)) stations.add("Chopping Station");
  if (/crush|grind|powder|press/.test(haystack)) stations.add("Crushing Station");
  if (/fry|fried|butter|oil/.test(haystack)) stations.add("Frying Station");
  if (/grill|campfire|char|smoky/.test(haystack)) stations.add("Campfire / Grill");
  if (/cauldron|broth|boil|simmer|stir/.test(haystack)) stations.add("Cat Cauldron");
  if (/oven|bake|roast/.test(haystack)) stations.add("Oven");
  if (!stations.size && /broth|soup|meal|recipe/.test(haystack)) stations.add("Cat Cauldron");
  return [...stations];
}

function cleanIngredientName(value: string) {
  return value
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(and|or)\b/gi, ",")
    .replace(/\s+/g, " ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "")
    .trim();
}

function splitLooseList(value: string) {
  return value
    .split(/[,;/]|\band\b/gi)
    .map(cleanIngredientName)
    .filter((item) => item && !/none|unknown|tbd/i.test(item));
}

function mergeSources(current: PantrySource[], next: PantrySource[]) {
  const map = new Map(current.map((source) => [source.creatureId, source]));
  next.forEach((source) => map.set(source.creatureId, source));
  return [...map.values()];
}

function uniqueEntries(entries: LoreEntry[]) {
  const map = new Map(entries.map((entry) => [entry.id, entry]));
  return [...map.values()];
}

function sortPantryIngredients(a: PantryIngredient, b: PantryIngredient) {
  const baseCompare = a.baseName.localeCompare(b.baseName);
  if (baseCompare !== 0) return baseCompare;
  const rankCompare = prepRank(a.name, a.baseName) - prepRank(b.name, b.baseName);
  if (rankCompare !== 0) return rankCompare;
  return a.name.localeCompare(b.name);
}

function prepRank(name: string, baseName: string) {
  const normalized = normalizeName(name);
  if (normalized === normalizeName(baseName)) return 0;
  if (/^(chopped|sliced|diced|pressed|crushed|ground)\s+/.test(normalized)) return 1;
  if (/^(fried|grilled|roasted|baked|toasted|charred)\s+/.test(normalized)) return 2;
  if (/(broth|stock|infusion|extract|concentrate|seasoning|jam)$/.test(normalized)) return 3;
  return 4;
}

function unique(values: string[]) {
  return values.filter((value, index, list) => value && list.indexOf(value) === index);
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "ingredient";
}
