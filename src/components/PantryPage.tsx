import { useEffect, useMemo, useState } from "react";
import type { BestiaryCreature, LoreEntry } from "../types";
import {
  buildPantryModel,
  pantryMealGroups,
  type PantryMealGroupId,
  type PantryIngredient,
  type PantryMeal,
  type PantryPrepVariant,
  type PantryRequirement,
  type PantryTab
} from "../utils/pantry";
import { createBlankEntry } from "../utils/entries";
import { googleDriveFolderLink, openGoogleDriveFolderPicker, type GoogleDriveFolder } from "../utils/googlePicker";
import { googleDriveWebViewLink } from "../utils/imageFit";
import { CustomSelect } from "./CustomSelect";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { Icon } from "./Icon";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";
import { useRealtimeCollaboration } from "./RealtimeCollaborationContext";

interface PantryPageProps {
  entries: LoreEntry[];
  bestiary: BestiaryCreature[];
  initialTab?: PantryTab;
  readOnly?: boolean;
  onOpenEntry: (entry: LoreEntry) => void;
  onOpenCreature: (creature: BestiaryCreature) => void;
  onSaveEntry?: (entry: LoreEntry) => void;
}

const allOption = "All";
const PANTRY_DRIVE_FOLDER_KEY = "tavernCookbookPantryDriveFolder";

interface PantryDriveFolder {
  id: string;
  link: string;
  name: string;
}

interface IngredientDraft {
  name: string;
  category: string;
  rarity: string;
  summary: string;
  notes: string;
  locations: string;
  imageUrl: string;
  imageDriveFileId: string;
  imageDriveViewLink: string;
  driveFolderId: string;
  driveFolderLink: string;
  driveFolderName: string;
  tags: string;
}

interface MealDraft {
  title: string;
  type: string;
  group: PantryMealGroupId;
  summary: string;
  ingredientsRequired: string;
  cookingMethod: string;
  effects: string;
  statusEffects: string;
  castPower: string;
  weaponEffect: string;
  ultimatePower: string;
}

export function PantryPage({
  entries,
  bestiary,
  initialTab = "pantry",
  readOnly = false,
  onOpenEntry,
  onOpenCreature,
  onSaveEntry
}: PantryPageProps) {
  const model = useMemo(() => buildPantryModel(entries, bestiary), [entries, bestiary]);
  const [tab, setTab] = useState<PantryTab>(initialTab);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(allOption);
  const [baseFilter, setBaseFilter] = useState(allOption);
  const [sourceFilter, setSourceFilter] = useState(allOption);
  const [recipeUseFilter, setRecipeUseFilter] = useState(allOption);
  const [selectedIngredientId, setSelectedIngredientId] = useState(model.ingredients[0]?.id || "");
  const [selectedMealId, setSelectedMealId] = useState(model.meals[0]?.id || "");
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [collapsedMealGroups, setCollapsedMealGroups] = useState<Record<string, boolean>>({});
  const [ingredientDraft, setIngredientDraft] = useState<IngredientDraft | null>(null);
  const [mealDraft, setMealDraft] = useState<MealDraft | null>(null);
  const [pantryDriveFolder, setPantryDriveFolder] = useState<PantryDriveFolder>(() => loadPantryDriveFolder());

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const ingredientCategories = useMemo(() => [allOption, ...unique(model.ingredients.map((ingredient) => ingredient.category))], [model.ingredients]);
  const baseIngredients = useMemo(() => [allOption, ...unique(model.ingredients.map((ingredient) => ingredient.baseName))], [model.ingredients]);
  const sourceOptions = useMemo(
    () => [allOption, "Bestiary Drop", "World / Spawn", "Recipe Ingredient", "Prepared Variant"],
    []
  );
  const recipeUseOptions = useMemo(() => [allOption, "Has Recipes", "No Recipes"], []);

  const visibleIngredients = model.ingredients.filter((ingredient) => {
    const query = search.trim().toLowerCase();
    const haystack = [
      ingredient.name,
      ingredient.baseName,
      ingredient.category,
      ingredient.summary,
      ingredient.rarity,
      ingredient.tags.join(" "),
      ingredient.dropsFrom.map((source) => source.creatureName).join(" "),
      ingredient.spawnLocations.join(" "),
      ingredient.usedInRecipes.map((recipe) => recipe.title).join(" "),
      ingredient.prepVariants.map((variant) => variant.name).join(" ")
    ].join(" ").toLowerCase();

    const sourceMatches =
      sourceFilter === allOption ||
      (sourceFilter === "Bestiary Drop" && ingredient.dropsFrom.length > 0) ||
      (sourceFilter === "World / Spawn" && ingredient.spawnLocations.length > 0) ||
      (sourceFilter === "Recipe Ingredient" && ingredient.usedInRecipes.length > 0) ||
      (sourceFilter === "Prepared Variant" && (
        ingredient.prepVariants.length > 0 ||
        ingredient.tags.includes("Prepared Variant") ||
        /prepared|cooked|broth|stock|infusion|seasoning|preserve/i.test(ingredient.category)
      ));
    const recipeUseMatches =
      recipeUseFilter === allOption ||
      (recipeUseFilter === "Has Recipes" && ingredient.usedInRecipes.length > 0) ||
      (recipeUseFilter === "No Recipes" && ingredient.usedInRecipes.length === 0);

    return (
      (!query || haystack.includes(query)) &&
      (categoryFilter === allOption || ingredient.category === categoryFilter) &&
      (baseFilter === allOption || ingredient.baseName === baseFilter) &&
      sourceMatches &&
      recipeUseMatches
    );
  });

  const visibleMeals = model.meals.filter((meal) => {
    const query = search.trim().toLowerCase();
    const haystack = [
      meal.title,
      meal.type,
      meal.summary,
      meal.ingredients.join(" "),
      meal.requirements.map((requirement) => requirement.label).join(" "),
      meal.stations.join(" "),
      meal.effects,
      meal.group
    ].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });

  const mealsByGroup = pantryMealGroups.map((group) => ({
    ...group,
    meals: visibleMeals.filter((meal) => meal.group === group.id)
  }));

  const selectedIngredient =
    model.ingredients.find((ingredient) => ingredient.id === selectedIngredientId) ||
    visibleIngredients[0] ||
    model.ingredients[0] ||
    null;
  const selectedMeal =
    model.meals.find((meal) => meal.id === selectedMealId) ||
    visibleMeals[0] ||
    model.meals[0] ||
    null;

  const linkedBestiary = (source: { creatureId: string }) =>
    bestiary.find((creature) => creature.id === source.creatureId);

  const selectIngredient = (ingredient: PantryIngredient) => {
    setSelectedIngredientId(ingredient.id);
    setTab("pantry");
    setMealDraft(null);
    setIngredientDraft(null);
  };

  const selectMeal = (meal: PantryMeal) => {
    setSelectedMealId(meal.id);
    setTab("meals");
    setIngredientDraft(null);
    setMealDraft(null);
  };

  const addIngredient = () => {
    if (readOnly || !onSaveEntry) return;
    const entry = createBlankEntry("Food & Inventory", "Ingredient");
    const next = {
      ...entry,
      title: "New Ingredient",
      type: "Ingredient",
      status: "Idea",
      fields: {
        ...entry.fields,
        pantryCategory: "Ingredient",
        rarity: "Common",
        whereFound: "",
        imageUrl: "",
        pantryDriveFolderId: "",
        pantryDriveFolderLink: "",
        pantryDriveFolderName: ""
      }
    };
    onSaveEntry(next);
    setSelectedIngredientId(normalizeName("New Ingredient"));
    setIngredientDraft({
      name: "New Ingredient",
      category: "Ingredient",
      rarity: "Common",
      summary: "",
      notes: "",
      locations: "",
      imageUrl: "",
      imageDriveFileId: "",
      imageDriveViewLink: "",
      driveFolderId: "",
      driveFolderLink: "",
      driveFolderName: "",
      tags: ""
    });
  };

  const choosePantryDriveFolder = async () => {
    try {
      const folder = await openGoogleDriveFolderPicker("Choose Pantry Upload Folder");
      if (!folder) return;
      const next = driveFolderFromGoogleFolder(folder);
      savePantryDriveFolder(next);
      setPantryDriveFolder(next);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not choose a Google Drive folder.");
    }
  };

  const clearPantryDriveFolder = () => {
    if (!window.confirm("Clear the Pantry default Drive folder? Ingredient-specific folders will stay unchanged.")) return;
    const next = emptyPantryDriveFolder();
    savePantryDriveFolder(next);
    setPantryDriveFolder(next);
  };

  const addMeal = () => {
    if (readOnly || !onSaveEntry) return;
    const entry = createBlankEntry("Food & Inventory", "Magical Meal");
    const next = {
      ...entry,
      title: "New Magical Meal",
      type: "Magical Meal",
      status: "Idea",
      summary: "Describe what this magical meal does.",
      tags: ["Magical Meal"],
      fields: {
        ...entry.fields,
        pantryMealGroup: "magical-meals",
        ingredientsRequired: "Any Protein, Any Veggie",
        cookingMethod: "Cat Cauldron",
        gameplayEffect: "",
        statusEffects: "",
        castPower: "",
        weaponEffect: "",
        ultimatePower: ""
      },
      wiki: {
        ...entry.wiki,
        itemType: "Magical Meal",
        ingredientsRequired: "Any Protein, Any Veggie"
      }
    };
    onSaveEntry(next);
    setSelectedMealId(next.id);
    setMealDraft(makeMealDraft({
      id: next.id,
      title: next.title,
      type: next.type,
      group: "magical-meals",
      summary: next.summary,
      ingredients: ["Any Protein", "Any Veggie"],
      requirements: [],
      stations: ["Cat Cauldron"],
      effects: "",
      statusEffects: "",
      castPower: "",
      weaponEffect: "",
      ultimatePower: "",
      entry: next
    }));
  };

  const saveIngredientDraft = (ingredient: PantryIngredient, draft: IngredientDraft) => {
    if (readOnly || !onSaveEntry) return;
    const entry = buildIngredientEntry(ingredient, draft);
    onSaveEntry(entry);
    setSelectedIngredientId(normalizeName(draft.name));
    setIngredientDraft(null);
  };

  const persistIngredientDraft = (ingredient: PantryIngredient, draft: IngredientDraft) => {
    if (readOnly || !onSaveEntry) return;
    const entry = buildIngredientEntry(ingredient, draft);
    onSaveEntry(entry);
    setSelectedIngredientId(normalizeName(draft.name));
    setIngredientDraft(draft);
  };

  const saveMealDraft = (meal: PantryMeal, draft: MealDraft) => {
    if (readOnly || !onSaveEntry) return;
    const entry = buildMealEntry(meal, draft);
    onSaveEntry(entry);
    setSelectedMealId(entry.id);
    setMealDraft(null);
  };

  const pantryTabs = (
    <div className="pantry-tabs">
      <button className={tab === "pantry" ? "active" : ""} onClick={() => setTab("pantry")}>
        <Icon name="Wheat" className="h-4 w-4" />
        Pantry Inventory
      </button>
      <button className={tab === "meals" ? "active" : ""} onClick={() => setTab("meals")}>
        <Icon name="Soup" className="h-4 w-4" />
        Meals & Recipes
      </button>
    </div>
  );

  return (
    <section className={`pantry-page ${tab === "pantry" ? "pantry-inventory-page" : "pantry-meals-page"}`}>
      {tab === "meals" && (
        <>
          <header className="pantry-hero">
            <div>
              <p>The Pantry</p>
              <h1 className="font-display">Food Inventory & Recipes</h1>
              <span>Track every ingredient, menu item, magical meal, recipe, creature drop, prepared form, cooking station, and meal connection in Tales of the Tavern.</span>
            </div>
            <div className="pantry-hero-stats">
              <article>
                <strong>{model.ingredients.length}</strong>
                <span>ingredients</span>
              </article>
              <article>
                <strong>{model.meals.length}</strong>
                <span>meals</span>
              </article>
              <article>
                <strong>{model.stations.length}</strong>
                <span>stations</span>
              </article>
            </div>
          </header>

          <section className="pantry-stations">
            {model.stations.map((station) => (
              <article key={station.id}>
                <Icon name={station.icon} className="h-5 w-5" />
                <div>
                  <strong>{station.name}</strong>
                  <p>{station.summary}</p>
                  <span>{station.examples.join(" / ")}</span>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {tab === "pantry" ? (
        <section className="pantry-layout pantry-archive-layout">
          <div className="pantry-grid-panel">
            <div className="pantry-panel-tabs">{pantryTabs}</div>
            <div className="pantry-section-heading">
              <div>
                <p>Ingredient Archive</p>
                <h2 className="font-display">{baseFilter === allOption ? "The Pantry" : `${baseFilter} Family`}</h2>
              </div>
              <div className="pantry-heading-actions">
                <span>{visibleIngredients.length} shown</span>
                <span className="pantry-folder-status">
                  <Icon name="Folder" className="h-4 w-4" />
                  {pantryDriveFolder.name || pantryDriveFolder.id || "No Pantry Drive folder"}
                </span>
                {!readOnly && <button onClick={choosePantryDriveFolder}>Set Pantry Drive Folder</button>}
                {!readOnly && pantryDriveFolder.id && <button onClick={clearPantryDriveFolder}>Clear Folder</button>}
                {!readOnly && <button onClick={addIngredient}>+ Add Ingredient</button>}
              </div>
            </div>
            <div className="pantry-archive-tools">
              <label className="pantry-search">
                <Icon name="Search" className="h-4 w-4" />
                <input value={search} placeholder="Search ingredients..." onChange={(event) => setSearch(event.target.value)} />
              </label>
              <CustomSelect
                ariaLabel="Ingredient type filter"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[{ value: allOption, label: "All Types" }, ...ingredientCategories.filter((option) => option !== allOption)]}
              />
              <CustomSelect
                ariaLabel="Ingredient family filter"
                value={baseFilter}
                onChange={setBaseFilter}
                options={[{ value: allOption, label: "All Families" }, ...baseIngredients.filter((option) => option !== allOption)]}
              />
              <CustomSelect
                ariaLabel="Ingredient source filter"
                value={sourceFilter}
                onChange={setSourceFilter}
                options={[{ value: allOption, label: "Any Source" }, ...sourceOptions.filter((option) => option !== allOption)]}
              />
              <CustomSelect
                ariaLabel="Recipe use filter"
                value={recipeUseFilter}
                onChange={setRecipeUseFilter}
                options={[{ value: allOption, label: "Recipe Use" }, ...recipeUseOptions.filter((option) => option !== allOption)]}
              />
            </div>
            <div className="pantry-grid">
              {visibleIngredients.map((ingredient) => (
                <PantryIngredientCard
                  key={ingredient.id}
                  ingredient={ingredient}
                  selected={selectedIngredient?.id === ingredient.id}
                  onSelect={() => selectIngredient(ingredient)}
                />
              ))}
            </div>
          </div>

          {detailExpanded && <button className="pantry-detail-backdrop" aria-label="Collapse pantry detail" onClick={() => setDetailExpanded(false)} />}
          <aside className={`pantry-detail-panel ${detailExpanded ? "expanded" : ""}`}>
            {selectedIngredient ? (
              <IngredientDetail
                ingredient={selectedIngredient}
                ingredients={model.ingredients}
                entries={entries}
                linkedBestiary={linkedBestiary}
                onOpenEntry={onOpenEntry}
                onOpenCreature={onOpenCreature}
                onFilterBase={(baseName) => {
                  setBaseFilter(baseName);
                  setTab("pantry");
                }}
                onSelectIngredient={selectIngredient}
                onOpenMeal={selectMeal}
                expanded={detailExpanded}
                onToggleExpand={() => setDetailExpanded((current) => !current)}
                readOnly={readOnly}
                pantryDriveFolder={pantryDriveFolder}
                draft={ingredientDraft}
                onDraftChange={setIngredientDraft}
                onStartEdit={() => setIngredientDraft(makeIngredientDraft(selectedIngredient))}
                onCancelEdit={() => setIngredientDraft(null)}
                onSaveDraft={(draft) => saveIngredientDraft(selectedIngredient, draft)}
                onPersistDraft={(draft) => persistIngredientDraft(selectedIngredient, draft)}
              />
            ) : (
              <EmptyPantryDetail />
            )}
          </aside>
        </section>
      ) : (
        <section className="pantry-layout meals">
          <div className="pantry-grid-panel">
            <div className="pantry-toolbar compact">
              {pantryTabs}
              <label className="pantry-search">
                <Icon name="Search" className="h-4 w-4" />
                <input value={search} placeholder="Search meals, recipes, stations..." onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>
            <div className="pantry-section-heading">
              <div>
                <p>Meals & Recipes</p>
                <h2 className="font-display">Recipe Uses</h2>
              </div>
              <div className="pantry-heading-actions">
                <span>{visibleMeals.length} shown</span>
                {!readOnly && <button onClick={addMeal}>+ Add Meal</button>}
              </div>
            </div>
            <div className="pantry-meal-accordion">
              {mealsByGroup.map((group) => {
                const collapsed = collapsedMealGroups[group.id];
                return (
                  <section key={group.id} className={`pantry-meal-category ${collapsed ? "collapsed" : ""}`}>
                    <button
                      className="pantry-meal-category-header"
                      onClick={() => setCollapsedMealGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}
                    >
                      <Icon name={collapsed ? "ChevronDown" : "ChevronDown"} className="h-4 w-4" />
                      <span className="pantry-meal-category-icon">
                        <Icon name={group.icon} className="h-4 w-4" />
                      </span>
                      <span>
                        <strong>{group.title}</strong>
                        <small>{group.description}</small>
                      </span>
                      <em>{group.meals.length}</em>
                    </button>
                    {!collapsed && (
                      <div className="pantry-grid meals">
                        {group.meals.length ? group.meals.map((meal) => (
                          <PantryMealCard
                            key={meal.id}
                            meal={meal}
                            groupIcon={group.icon}
                            selected={selectedMeal?.id === meal.id}
                            onSelect={() => selectMeal(meal)}
                          />
                        )) : (
                          <div className="pantry-empty-category">No recipes in this group yet.</div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>

          {detailExpanded && <button className="pantry-detail-backdrop" aria-label="Collapse pantry detail" onClick={() => setDetailExpanded(false)} />}
          <aside className={`pantry-detail-panel ${detailExpanded ? "expanded" : ""}`}>
            {selectedMeal ? (
              <MealDetail
                meal={selectedMeal}
                ingredients={model.ingredients}
                onOpenEntry={onOpenEntry}
                onSelectIngredient={selectIngredient}
                expanded={detailExpanded}
                onToggleExpand={() => setDetailExpanded((current) => !current)}
                readOnly={readOnly}
                draft={mealDraft}
                onDraftChange={setMealDraft}
                onStartEdit={() => setMealDraft(makeMealDraft(selectedMeal))}
                onCancelEdit={() => setMealDraft(null)}
                onSaveDraft={(draft) => saveMealDraft(selectedMeal, draft)}
                onSaveAndOpen={(draft) => {
                  if (readOnly || !onSaveEntry) return;
                  const entry = buildMealEntry(selectedMeal, draft);
                  onSaveEntry(entry);
                  setSelectedMealId(entry.id);
                  setMealDraft(null);
                  onOpenEntry(entry);
                }}
              />
            ) : (
              <EmptyPantryDetail />
            )}
          </aside>
        </section>
      )}
    </section>
  );
}

function PantryIngredientCard({
  ingredient,
  selected,
  onSelect
}: {
  ingredient: PantryIngredient;
  selected: boolean;
  onSelect: () => void;
}) {
  const realtime = useRealtimeCollaboration();
  const realtimeTarget = {
    type: "module" as const,
    id: `pantry:ingredient:${ingredient.id}`,
    label: ingredient.name,
    module: "The Pantry"
  };
  const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);

  return (
    <button
      className={`pantry-card realtime-hover-surface ${selected ? "active" : ""} ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
      onMouseLeave={() => realtime.setHoverTarget(null)}
    >
      {hoveringUsers.length > 0 && (
        <span className="realtime-hover-badge">
          {hoveringUsers.length === 1 ? `${hoveringUsers[0].name} is here` : `${hoveringUsers.length} people here`}
        </span>
      )}
      <IngredientImage ingredient={ingredient} />
      <strong>{ingredient.name}</strong>
      <small>{ingredient.category}</small>
      <footer>
        <em>{ingredient.usedInRecipes.length} recipes</em>
      </footer>
    </button>
  );
}

function PantryMealCard({
  meal,
  groupIcon,
  selected,
  onSelect
}: {
  meal: PantryMeal;
  groupIcon: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const realtime = useRealtimeCollaboration();
  const realtimeTarget = {
    type: "module" as const,
    id: `pantry:meal:${meal.id}`,
    label: meal.title,
    module: "The Pantry"
  };
  const hoveringUsers = realtime.usersHoveringTarget(realtimeTarget);

  return (
    <button
      className={`pantry-card meal realtime-hover-surface ${selected ? "active" : ""} ${hoveringUsers.length ? "realtime-hover-active" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => realtime.setHoverTarget(realtimeTarget)}
      onMouseLeave={() => realtime.setHoverTarget(null)}
    >
      {hoveringUsers.length > 0 && (
        <span className="realtime-hover-badge">
          {hoveringUsers.length === 1 ? `${hoveringUsers[0].name} is here` : `${hoveringUsers.length} people here`}
        </span>
      )}
      <span className="pantry-card-icon">
        <Icon name={groupIcon} className="h-5 w-5" />
      </span>
      <strong>{meal.title}</strong>
      <small>{meal.type}</small>
      <p>{meal.summary || "No meal summary yet."}</p>
      <footer>
        <span>{meal.requirements.length || meal.ingredients.length} requirements</span>
        <em>{meal.stations.join(", ") || "Station TBD"}</em>
      </footer>
    </button>
  );
}

function IngredientDetail({
  ingredient,
  ingredients,
  entries,
  linkedBestiary,
  onOpenEntry,
  onOpenCreature,
  onFilterBase,
  onSelectIngredient,
  onOpenMeal,
  expanded,
  onToggleExpand,
  readOnly,
  pantryDriveFolder,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveDraft,
  onPersistDraft
}: {
  ingredient: PantryIngredient;
  ingredients: PantryIngredient[];
  entries: LoreEntry[];
  linkedBestiary: (source: { creatureId: string }) => BestiaryCreature | undefined;
  onOpenEntry: (entry: LoreEntry) => void;
  onOpenCreature: (creature: BestiaryCreature) => void;
  onFilterBase: (baseName: string) => void;
  onSelectIngredient: (ingredient: PantryIngredient) => void;
  onOpenMeal: (meal: PantryMeal) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  readOnly: boolean;
  pantryDriveFolder: PantryDriveFolder;
  draft: IngredientDraft | null;
  onDraftChange: (draft: IngredientDraft | null) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveDraft: (draft: IngredientDraft) => void;
  onPersistDraft: (draft: IngredientDraft) => void;
}) {
  const openLocation = (location: string) => {
    const normalizedLocation = location.toLowerCase();
    const entry = entries.find((candidate) => candidate.title.toLowerCase() === normalizedLocation) ||
      entries.find((candidate) => candidate.title.toLowerCase().includes(normalizedLocation) || normalizedLocation.includes(candidate.title.toLowerCase()));
    if (entry) onOpenEntry(entry);
  };
  const findVariantIngredient = (variant: PantryPrepVariant) =>
    ingredients.find((candidate) => candidate.id === variant.targetIngredientId) ||
    ingredients.find((candidate) => normalizeName(candidate.name) === normalizeName(variant.name));

  return (
    <div className="pantry-detail-content">
      <div className="pantry-detail-title">
        <div className="pantry-detail-title-row">
          <p>Ingredient Detail</p>
          <button className="pantry-expand-button" onClick={onToggleExpand}>
            <Icon name={expanded ? "ChevronsRight" : "ChevronsLeft"} className="h-4 w-4" />
            {expanded ? "Collapse" : "Expand"}
          </button>
          {!readOnly && (
            <button className="pantry-edit-button" onClick={draft ? onCancelEdit : onStartEdit}>
              <Icon name={draft ? "X" : "Edit3"} className="h-4 w-4" />
              {draft ? "Cancel Edit" : "Edit"}
            </button>
          )}
        </div>
        <div className="pantry-detail-identity">
          <IngredientImage ingredient={ingredient} />
          <h2 className="font-display">{ingredient.name}</h2>
        </div>
        <div>
          <span>{ingredient.category}</span>
          <span>{ingredient.rarity}</span>
          <button onClick={() => onFilterBase(ingredient.baseName)}>Show {ingredient.baseName} Family</button>
        </div>
      </div>

      {draft && (
        <IngredientEditForm
          draft={draft}
          pantryDriveFolder={pantryDriveFolder}
          onChange={onDraftChange}
          onSave={() => onSaveDraft(draft)}
          onPersist={onPersistDraft}
          onCancel={onCancelEdit}
        />
      )}

      <section className="pantry-detail-block">
        <Icon name="Package" className="h-5 w-5" />
        <div>
          <h3>Loot / Source Details</h3>
          <p>{ingredient.summary || ingredient.notes || "Add source, rarity, and gameplay notes to this ingredient entry."}</p>
          {ingredient.entry && (
            <button className="pantry-link-button" onClick={() => onOpenEntry(ingredient.entry!)}>
              <Icon name="BookOpen" className="h-4 w-4" />
              Open Ingredient Lore Entry
            </button>
          )}
        </div>
      </section>

      <section className="pantry-detail-block">
        <Icon name="Swords" className="h-5 w-5" />
        <div>
          <h3>Drops From</h3>
          {ingredient.dropsFrom.length ? (
            <div className="pantry-chip-grid">
              {ingredient.dropsFrom.map((source) => {
                const creature = linkedBestiary(source);
                return (
                  <button key={source.creatureId} onClick={() => creature && onOpenCreature(creature)}>
                    <Icon name="Swords" className="h-4 w-4" />
                    <span>
                      <strong>{source.creatureName}</strong>
                      <small>{source.creatureType} / {source.habitat}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p>No Bestiary drop source connected yet.</p>
          )}
        </div>
      </section>

      <section className="pantry-detail-block">
        <Icon name="Map" className="h-5 w-5" />
        <div>
          <h3>Where It Spawns / Appears</h3>
          {ingredient.spawnLocations.length ? (
            <div className="pantry-tag-row">
              {ingredient.spawnLocations.map((location) => (
                <button key={location} onClick={() => openLocation(location)}>{location}</button>
              ))}
            </div>
          ) : (
            <p>No world location connected yet.</p>
          )}
        </div>
      </section>

      <section className="pantry-detail-block">
        <Icon name="Soup" className="h-5 w-5" />
        <div>
          <h3>Used In Meals</h3>
          {ingredient.usedInRecipes.length ? (
            <div className="pantry-chip-grid">
              {ingredient.usedInRecipes.map((recipe) => (
                <button key={recipe.id} onClick={() => onOpenMeal(recipeToMeal(recipe))}>
                  <Icon name="Soup" className="h-4 w-4" />
                  <span>
                    <strong>{recipe.title}</strong>
                    <small>{recipe.type}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p>No recipe currently lists this ingredient.</p>
          )}
        </div>
      </section>

      <section className="pantry-detail-block">
        <Icon name="ChefHat" className="h-5 w-5" />
        <div>
          <h3>Prep Chain</h3>
          {ingredient.prepVariants.length ? (
            <div className="pantry-prep-list">
              {ingredient.prepVariants.map((variant) => {
                const targetIngredient = findVariantIngredient(variant);
                return (
                  <button
                    key={variant.id}
                    className="pantry-prep-link"
                    onClick={() => targetIngredient && onSelectIngredient(targetIngredient)}
                    disabled={!targetIngredient}
                  >
                    <Icon name={stationIcon(variant.station)} className="h-4 w-4" />
                    <div>
                      <strong>{variant.name}</strong>
                      <span>{variant.station} / {variant.resultType}</span>
                      <p>{variant.notes}</p>
                      <small>{targetIngredient ? "Open prepared ingredient" : "Prepared ingredient not generated yet"} / {variant.usedFor}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p>No prep variants set yet. Use stations to define chopped, crushed, oven, or cauldron forms.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function MealDetail({
  meal,
  ingredients,
  onOpenEntry,
  onSelectIngredient,
  expanded,
  onToggleExpand,
  readOnly,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveDraft,
  onSaveAndOpen
}: {
  meal: PantryMeal;
  ingredients: PantryIngredient[];
  onOpenEntry: (entry: LoreEntry) => void;
  onSelectIngredient: (ingredient: PantryIngredient) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  readOnly: boolean;
  draft: MealDraft | null;
  onDraftChange: (draft: MealDraft | null) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveDraft: (draft: MealDraft) => void;
  onSaveAndOpen: (draft: MealDraft) => void;
}) {
  const saveAndOpen = () => {
    if (!readOnly && meal.entry.fields?.pantryVirtual) {
      const draftToSave = draft || makeMealDraft(meal);
      onSaveAndOpen(draftToSave);
      return;
    }
    onOpenEntry(meal.entry);
  };

  return (
    <div className="pantry-detail-content">
      <div className="pantry-detail-title">
        <div className="pantry-detail-title-row">
          <p>Meal / Recipe Detail</p>
          <button className="pantry-expand-button" onClick={onToggleExpand}>
            <Icon name={expanded ? "ChevronsRight" : "ChevronsLeft"} className="h-4 w-4" />
            {expanded ? "Collapse" : "Expand"}
          </button>
          {!readOnly && (
            <button className="pantry-edit-button" onClick={draft ? onCancelEdit : onStartEdit}>
              <Icon name={draft ? "X" : "Edit3"} className="h-4 w-4" />
              {draft ? "Cancel Edit" : "Edit"}
            </button>
          )}
        </div>
        <h2 className="font-display">{meal.title}</h2>
        <div>
          <span>{meal.type}</span>
          <span>{pantryMealGroups.find((group) => group.id === meal.group)?.title || "Recipe"}</span>
          {meal.stations.map((station) => <span key={station}>{station}</span>)}
        </div>
      </div>

      {draft && (
        <MealEditForm
          draft={draft}
          onChange={onDraftChange}
          onSave={() => onSaveDraft(draft)}
          onCancel={onCancelEdit}
        />
      )}

      <section>
        <h3>Recipe Overview</h3>
        <p>{meal.summary || "No recipe overview yet."}</p>
        <button className="pantry-link-button" onClick={saveAndOpen}>
          <Icon name="BookOpen" className="h-4 w-4" />
          {meal.entry.fields?.pantryVirtual ? "Save / Open Recipe Lore Entry" : "Open Recipe Lore Entry"}
        </button>
      </section>

      {(meal.statusEffects || meal.castPower || meal.weaponEffect || meal.ultimatePower) && (
        <section>
          <h3>Powers / Status Effects</h3>
          <div className="pantry-power-list">
            {meal.statusEffects && <p><strong>Status Effects:</strong> {meal.statusEffects}</p>}
            {meal.castPower && <p><strong>Cast Power:</strong> {meal.castPower}</p>}
            {meal.weaponEffect && <p><strong>Weapon Effect:</strong> {meal.weaponEffect}</p>}
            {meal.ultimatePower && <p><strong>Ultimate:</strong> {meal.ultimatePower}</p>}
          </div>
        </section>
      )}

      <section>
        <h3>Ingredients Required</h3>
        {meal.requirements.length ? (
          <div className="pantry-requirement-list">
            {meal.requirements.map((requirement) => (
              <RecipeRequirement
                key={requirement.id}
                requirement={requirement}
                ingredients={ingredients}
                onSelectIngredient={onSelectIngredient}
              />
            ))}
          </div>
        ) : (
          <p>No ingredient list has been added yet.</p>
        )}
      </section>

      <section>
        <h3>Cooking Stations</h3>
        <div className="pantry-prep-list">
          {(meal.stations.length ? meal.stations : ["Station TBD"]).map((station) => (
            <article key={station}>
              <Icon name={stationIcon(station)} className="h-4 w-4" />
              <div>
                <strong>{station}</strong>
                <p>{station === "Station TBD" ? "Add a station to the recipe entry." : "This station participates in the recipe flow."}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3>Gameplay / Magical Use</h3>
        <p>{meal.effects || "No gameplay or magical effect documented yet."}</p>
      </section>
    </div>
  );
}

function RecipeRequirement({
  requirement,
  ingredients,
  onSelectIngredient
}: {
  requirement: PantryRequirement;
  ingredients: PantryIngredient[];
  onSelectIngredient: (ingredient: PantryIngredient) => void;
}) {
  const matches = requirement.matchedIngredientIds
    .map((id) => ingredients.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is PantryIngredient => Boolean(ingredient));

  return (
    <article className={`pantry-requirement ${requirement.kind}`}>
      <div>
        <strong>{requirement.label}</strong>
        <span>{requirement.kind === "flexible" ? "Flexible slot" : "Specific ingredient"}</span>
      </div>
      {matches.length ? (
        <div className="pantry-requirement-matches">
          {matches.slice(0, 8).map((ingredient) => (
            <button key={ingredient.id} onClick={() => onSelectIngredient(ingredient)}>
              <IngredientImage ingredient={ingredient} />
              <span>{ingredient.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <small>No matching pantry item yet.</small>
      )}
    </article>
  );
}

function IngredientEditForm({
  draft,
  pantryDriveFolder,
  onChange,
  onSave,
  onPersist,
  onCancel
}: {
  draft: IngredientDraft;
  pantryDriveFolder: PantryDriveFolder;
  onChange: (draft: IngredientDraft) => void;
  onSave: () => void;
  onPersist: (draft: IngredientDraft) => void;
  onCancel: () => void;
}) {
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const update = (field: keyof IngredientDraft, value: string) => onChange({ ...draft, [field]: value });
  const commitMediaDraft = (next: IngredientDraft) => {
    onChange(next);
    onPersist(next);
  };
  const saveImageManager = (slots: ImageManagerSlotDraft[]) => {
    const imageSlot = slots[0];
    if (!imageSlot) return;
    commitMediaDraft({
      ...draft,
      imageUrl: imageSlot.imageUrl,
      imageDriveFileId: imageSlot.imageUrl.match(/[?&]id=([^&#]+)/i)?.[1] || draft.imageDriveFileId,
      imageDriveViewLink: imageSlot.webViewLink || draft.imageDriveViewLink
    });
    setImageManagerOpen(false);
  };
  const inheritedFolderId = draft.driveFolderId || pantryDriveFolder.id;
  const inheritedFolderLink = draft.driveFolderLink || pantryDriveFolder.link;
  const inheritedFolderName = draft.driveFolderName || pantryDriveFolder.name || (pantryDriveFolder.id ? "Pantry folder" : "");
  const setIngredientDriveFolder = (folder: GoogleDriveFolder) => {
    commitMediaDraft({
      ...draft,
      driveFolderId: folder.id,
      driveFolderLink: folder.url || googleDriveFolderLink(folder.id),
      driveFolderName: folder.name
    });
  };
  const clearIngredientDriveFolder = () => {
    commitMediaDraft({
      ...draft,
      driveFolderId: "",
      driveFolderLink: "",
      driveFolderName: ""
    });
  };

  return (
    <section className="pantry-edit-form">
      <header>
        <h3>Edit Ingredient</h3>
        <div>
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" onClick={onSave}>Save Ingredient</button>
        </div>
      </header>
      <div className="pantry-edit-grid">
        <label>
          <span>Name</span>
          <input value={draft.name} onChange={(event) => update("name", event.target.value)} />
        </label>
        <label>
          <span>Type / Category</span>
          <input value={draft.category} placeholder="Produce, Slime Drop, Meat / Creature Drop..." onChange={(event) => update("category", event.target.value)} />
        </label>
        <label>
          <span>Rarity / Status</span>
          <input value={draft.rarity} placeholder="Common, Idea, Rare..." onChange={(event) => update("rarity", event.target.value)} />
        </label>
        <label>
          <span>Ingredient Image</span>
          <button type="button" className="button-frame pantry-link-button" onClick={() => setImageManagerOpen(true)}>
            <Icon name="Image" className="h-4 w-4" />
            Open Image Manager
          </button>
          <DriveImageSourceControls
            value={draft.imageUrl}
            label={`${draft.name || "Ingredient"} image`}
            title="Choose Ingredient Image"
            defaultFolderId={inheritedFolderId}
            defaultFolderLink={inheritedFolderLink}
            defaultFolderName={inheritedFolderName}
            uploadNameContext={{
              subjectName: draft.name || "Pantry Item",
              categoryName: "Pantry",
              slotName: "Inventory Icon",
              sourceType: draft.category || "Ingredient"
            }}
            onChange={(imageUrl) => commitMediaDraft({ ...draft, imageUrl })}
            onPick={(imageUrl, file) => commitMediaDraft({
              ...draft,
              imageUrl,
              imageDriveFileId: file.id,
              imageDriveViewLink: file.url || googleDriveWebViewLink(file.id)
            })}
            onUpload={(imageUrl, file) => commitMediaDraft({
              ...draft,
              imageUrl,
              imageDriveFileId: file.id,
              imageDriveViewLink: file.webViewLink || googleDriveWebViewLink(file.id)
            })}
            onFolderChange={setIngredientDriveFolder}
          />
        </label>
        <div className="pantry-drive-folder-editor">
          <span>Ingredient Drive Folder</span>
          <strong>
            {draft.driveFolderName || draft.driveFolderId
              ? `${draft.driveFolderName || "Custom folder"}${draft.driveFolderId ? ` (${draft.driveFolderId})` : ""}`
              : pantryDriveFolder.name || pantryDriveFolder.id
                ? `Using Pantry folder: ${pantryDriveFolder.name || pantryDriveFolder.id}`
                : "No folder set yet"}
          </strong>
          <p>Use the Folder button above to override where this ingredient uploads. Clear it to use the Pantry default folder.</p>
          {draft.driveFolderId && <button type="button" onClick={clearIngredientDriveFolder}>Use Pantry Folder Instead</button>}
        </div>
        <label>
          <span>Where Found / Spawns</span>
          <input value={draft.locations} placeholder="Whisker Woods, Whisken Village..." onChange={(event) => update("locations", event.target.value)} />
        </label>
        <label>
          <span>Tags</span>
          <input value={draft.tags} placeholder="sweet, veggie, Act 1..." onChange={(event) => update("tags", event.target.value)} />
        </label>
        <label className="wide">
          <span>Loot / Source Details</span>
          <textarea value={draft.summary} onChange={(event) => update("summary", event.target.value)} />
        </label>
        <label className="wide">
          <span>Gameplay / Prep Notes</span>
          <textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
        </label>
      </div>
      {imageManagerOpen && (
        <ImageManagerModal
          title={`${draft.name || "Ingredient"} Image Manager`}
          subtitle="Assign, import, upload, download, and frame this pantry item image."
          slots={[{
            id: "ingredientImage",
            label: "Ingredient Inventory Icon",
            description: "The small survival-game style icon used in pantry slots.",
            imageUrl: draft.imageUrl,
            frameWidth: 170,
            frameHeight: 170,
            defaultFolderId: inheritedFolderId,
            defaultFolderLink: inheritedFolderLink,
            defaultFolderName: inheritedFolderName,
            uploadNameContext: {
              subjectName: draft.name || "Pantry Item",
              categoryName: "Pantry",
              slotName: "Inventory Icon",
              sourceType: draft.category || "Ingredient"
            }
          }]}
          onClose={() => setImageManagerOpen(false)}
          onSave={saveImageManager}
        />
      )}
    </section>
  );
}

function MealEditForm({
  draft,
  onChange,
  onSave,
  onCancel
}: {
  draft: MealDraft;
  onChange: (draft: MealDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (field: keyof MealDraft, value: string) => onChange({ ...draft, [field]: value });
  return (
    <section className="pantry-edit-form">
      <header>
        <h3>Edit Meal / Recipe</h3>
        <div>
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" onClick={onSave}>Save Meal</button>
        </div>
      </header>
      <div className="pantry-edit-grid">
        <label>
          <span>Name</span>
          <input value={draft.title} onChange={(event) => update("title", event.target.value)} />
        </label>
        <label>
          <span>Type</span>
          <input value={draft.type} placeholder="Magical Meal, Ale, Snack..." onChange={(event) => update("type", event.target.value)} />
        </label>
        <label>
          <span>Meal Category</span>
          <CustomSelect
            value={draft.group}
            onChange={(value) => onChange({ ...draft, group: value as PantryMealGroupId })}
            options={pantryMealGroups.map((group) => ({ value: group.id, label: group.title }))}
          />
        </label>
        <label>
          <span>Cooking Stations</span>
          <input value={draft.cookingMethod} placeholder="Cat Cauldron, Oven..." onChange={(event) => update("cookingMethod", event.target.value)} />
        </label>
        <label className="wide">
          <span>Ingredients Required</span>
          <textarea value={draft.ingredientsRequired} placeholder="Any Protein, Any Bitter Veggie, Veggie Broth..." onChange={(event) => update("ingredientsRequired", event.target.value)} />
        </label>
        <label className="wide">
          <span>Overview</span>
          <textarea value={draft.summary} onChange={(event) => update("summary", event.target.value)} />
        </label>
        <label className="wide">
          <span>Gameplay Effect</span>
          <textarea value={draft.effects} onChange={(event) => update("effects", event.target.value)} />
        </label>
        <label className="wide">
          <span>Status Effects</span>
          <input value={draft.statusEffects} placeholder="Burn, Haste, Fire Aspect..." onChange={(event) => update("statusEffects", event.target.value)} />
        </label>
        <label className="wide">
          <span>Cast Power</span>
          <textarea value={draft.castPower} onChange={(event) => update("castPower", event.target.value)} />
        </label>
        <label className="wide">
          <span>Weapon Effect</span>
          <textarea value={draft.weaponEffect} onChange={(event) => update("weaponEffect", event.target.value)} />
        </label>
        <label className="wide">
          <span>Ultimate Power</span>
          <textarea value={draft.ultimatePower} onChange={(event) => update("ultimatePower", event.target.value)} />
        </label>
      </div>
    </section>
  );
}

function IngredientImage({ ingredient }: { ingredient: PantryIngredient }) {
  return (
    <span className={`pantry-ingredient-image ${ingredient.imageUrl ? "has-image" : ""}`}>
      {ingredient.imageUrl ? (
        <img src={ingredient.imageUrl} alt="" loading="lazy" />
      ) : (
        <Icon name={ingredientIcon(ingredient)} className="h-6 w-6" />
      )}
    </span>
  );
}

function EmptyPantryDetail() {
  return (
    <div className="pantry-empty-detail">
      <Icon name="Wheat" className="h-10 w-10" />
      <strong>No pantry item selected.</strong>
      <span>Select an ingredient or meal to inspect its drops, uses, prep chain, and world connections.</span>
    </div>
  );
}

function recipeToMeal(entry: LoreEntry): PantryMeal {
  const ingredients = String(entry.fields?.ingredientsRequired || entry.wiki?.ingredientsRequired || "").split(",").map((item) => item.trim()).filter(Boolean);
  return {
    id: entry.id,
    title: entry.title,
    type: entry.type,
    group: "tavern-meals",
    summary: entry.summary,
    ingredients,
    requirements: ingredients.map((label) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label,
      kind: /^any\s+/i.test(label) ? "flexible" : "specific",
      matchedIngredientIds: []
    })),
    stations: [],
    effects: String(entry.fields?.gameplayEffect || entry.fields?.magicalEffect || entry.summary || ""),
    statusEffects: String(entry.fields?.statusEffects || entry.fields?.statusEffect || ""),
    castPower: String(entry.fields?.castPower || entry.fields?.activePower || ""),
    weaponEffect: String(entry.fields?.weaponEffect || entry.fields?.weaponAspect || ""),
    ultimatePower: String(entry.fields?.ultimatePower || entry.fields?.ultimate || ""),
    entry
  };
}

function makeIngredientDraft(ingredient: PantryIngredient): IngredientDraft {
  const entry = ingredient.entry;
  return {
    name: ingredient.name,
    category: ingredient.category,
    rarity: ingredient.rarity,
    summary: ingredient.summary,
    notes: ingredient.notes,
    locations: ingredient.spawnLocations.join(", "),
    imageUrl: ingredient.imageUrl,
    imageDriveFileId: String(entry?.fields?.imageDriveFileId || ""),
    imageDriveViewLink: String(entry?.fields?.imageDriveViewLink || ""),
    driveFolderId: String(entry?.fields?.pantryDriveFolderId || ""),
    driveFolderLink: String(entry?.fields?.pantryDriveFolderLink || ""),
    driveFolderName: String(entry?.fields?.pantryDriveFolderName || ""),
    tags: (entry?.tags || ingredient.tags || []).join(", ")
  };
}

function buildIngredientEntry(ingredient: PantryIngredient, draft: IngredientDraft): LoreEntry {
  const title = draft.name.trim() || ingredient.name || "New Ingredient";
  const base = ingredient.entry || {
    ...createBlankEntry("Food & Inventory", "Ingredient"),
    id: `ingredient-${slugifyLocal(title)}`
  };
  const locations = splitList(draft.locations);
  const tags = splitList(draft.tags);
  return {
    ...base,
    title,
    category: "Food & Inventory",
    type: "Ingredient",
    status: draft.rarity || base.status || "Idea",
    tags,
    summary: draft.summary,
    internalLore: draft.notes,
    fields: {
      ...base.fields,
      pantryCategory: draft.category || "Ingredient",
      rarity: draft.rarity,
      whereFound: draft.locations,
      imageUrl: draft.imageUrl,
      imageDriveFileId: draft.imageDriveFileId,
      imageDriveViewLink: draft.imageDriveViewLink,
      pantryDriveFolderId: draft.driveFolderId,
      pantryDriveFolderLink: draft.driveFolderLink,
      pantryDriveFolderName: draft.driveFolderName,
      gameplayUse: draft.notes
    },
    connections: {
      ...base.connections,
      locations
    },
    wiki: {
      ...base.wiki,
      itemType: draft.category || "Ingredient",
      rarity: draft.rarity,
      whereToFind: draft.locations,
      gameplayUse: draft.notes,
      loreDescription: draft.summary
    },
    media: {
      ...base.media,
      iconImage: draft.imageUrl,
      mainImage: base.media.mainImage
    }
  };
}

function emptyPantryDriveFolder(): PantryDriveFolder {
  return { id: "", link: "", name: "" };
}

function loadPantryDriveFolder(): PantryDriveFolder {
  try {
    const raw = localStorage.getItem(PANTRY_DRIVE_FOLDER_KEY);
    if (!raw) return emptyPantryDriveFolder();
    const parsed = JSON.parse(raw) as Partial<PantryDriveFolder>;
    return {
      id: String(parsed.id || ""),
      link: String(parsed.link || ""),
      name: String(parsed.name || "")
    };
  } catch {
    return emptyPantryDriveFolder();
  }
}

function savePantryDriveFolder(folder: PantryDriveFolder) {
  if (!folder.id && !folder.link && !folder.name) {
    localStorage.removeItem(PANTRY_DRIVE_FOLDER_KEY);
    return;
  }
  localStorage.setItem(PANTRY_DRIVE_FOLDER_KEY, JSON.stringify(folder));
}

function driveFolderFromGoogleFolder(folder: GoogleDriveFolder): PantryDriveFolder {
  return {
    id: folder.id,
    link: folder.url || googleDriveFolderLink(folder.id),
    name: folder.name
  };
}

function makeMealDraft(meal: PantryMeal): MealDraft {
  return {
    title: meal.title,
    type: meal.type,
    group: meal.group,
    summary: meal.summary,
    ingredientsRequired: meal.ingredients.join(", "),
    cookingMethod: meal.stations.join(", "),
    effects: meal.effects,
    statusEffects: meal.statusEffects,
    castPower: meal.castPower,
    weaponEffect: meal.weaponEffect,
    ultimatePower: meal.ultimatePower
  };
}

function buildMealEntry(meal: PantryMeal, draft: MealDraft): LoreEntry {
  const base = meal.entry.fields?.pantryVirtual ? createBlankEntry("Food & Inventory", draft.type || "Magical Meal") : meal.entry;
  const ingredients = draft.ingredientsRequired;
  return {
    ...base,
    id: meal.entry.fields?.pantryVirtual ? `meal-${Date.now()}` : base.id,
    title: draft.title.trim() || meal.title || "New Meal",
    category: "Food & Inventory",
    type: draft.type || "Meal",
    summary: draft.summary,
    tags: unique([...base.tags, pantryMealGroups.find((group) => group.id === draft.group)?.title || "Meal"]),
    fields: {
      ...base.fields,
      pantryVirtual: undefined,
      pantryMealGroup: draft.group,
      ingredientsRequired: ingredients,
      cookingMethod: draft.cookingMethod,
      gameplayEffect: draft.effects,
      statusEffects: draft.statusEffects,
      castPower: draft.castPower,
      weaponEffect: draft.weaponEffect,
      ultimatePower: draft.ultimatePower
    },
    wiki: {
      ...base.wiki,
      itemType: draft.type || "Meal",
      ingredientsRequired: ingredients,
      craftingStation: draft.cookingMethod,
      gameplayUse: draft.effects,
      notes: [draft.statusEffects, draft.castPower, draft.weaponEffect, draft.ultimatePower].filter(Boolean).join("\n")
    },
    notes: {
      ...base.notes,
      gameplay: draft.effects
    }
  };
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugifyLocal(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "ingredient";
}

function ingredientIcon(ingredient: PantryIngredient) {
  if (/slime/i.test(ingredient.category)) return "Droplets";
  if (/meat|drop/i.test(ingredient.category)) return "Drumstick";
  if (/spice|mineral/i.test(ingredient.category)) return "Gem";
  if (/magic/i.test(ingredient.category)) return "Sparkles";
  return "Wheat";
}

function stationIcon(station: string) {
  if (/crush/i.test(station)) return "Hammer";
  if (/chop/i.test(station)) return "ChefHat";
  if (/fry|campfire|grill/i.test(station)) return "Flame";
  if (/cauldron|broth/i.test(station)) return "Soup";
  if (/oven|roast|bake/i.test(station)) return "Flame";
  return "Cog";
}

function unique(values: string[]) {
  return values.filter((value, index, list) => value && list.indexOf(value) === index).sort((a, b) => a.localeCompare(b));
}
