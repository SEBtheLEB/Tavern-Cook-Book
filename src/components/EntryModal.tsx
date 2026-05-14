import { useEffect, useMemo, useRef, useState } from "react";
import type {
  EntryConnections,
  EntryMedia,
  EntryNotes,
  GoogleAccountUser,
  ImageFitSettings,
  LoreEntry,
  SecretInfo,
  TimelineInfo,
  WikiFields
} from "../types";
import { isSupportedImage, readFileAsDataUrl, readImageFileForStorage } from "../utils/media";
import { normalizeEntry } from "../utils/entries";
import { normalizeImageFit } from "../utils/imageFit";
import { AdjustableImage } from "./AdjustableImage";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { Icon } from "./Icon";
import { CharacterProfileView } from "./CharacterProfileView";
import { FavoriteButton } from "./FavoriteButton";
import { isWikiEntry, WikiLayout } from "./WikiLayout";
import { LoreKeywordText } from "./LoreKeywordText";
import { RichLoreText, RichTextEditor } from "./RichText";

interface EntryModalProps {
  entry: LoreEntry;
  readOnly?: boolean;
  referenceKeyword?: string;
  onClose: () => void;
  onViewReferences?: (keyword: string) => void;
  onSave: (entry: LoreEntry) => void;
  onDuplicate: (entry: LoreEntry) => void;
  onDelete: (entry: LoreEntry) => void;
  currentUser: GoogleAccountUser;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const statusOptions = [
  "Canon",
  "Soft Canon",
  "Idea",
  "Needs Rewrite",
  "Scrapped",
  "Old Version",
  "Playtest Scope"
];
const spoilerOptions = ["No Spoiler", "Minor Spoiler", "Major Spoiler", "Ending Spoiler"];

const connectionFields: Array<[keyof EntryConnections, string, string]> = [
  ["characters", "Characters", "Gwen, Tohm Kyatt, Princess Lillia"],
  ["locations", "Locations", "Whisker Woods, Kap's Pond"],
  ["recipes", "Recipes", "Veggie Broth, Magical Meals"],
  ["quests", "Quests", "Recover Recipe Pages"],
  ["items", "Items", "Recipe Pages, Dragon Knife"],
  ["factions", "Factions", "Faery Kingdom, Dwarven Kingdom"],
  ["secrets", "Secrets", "Tohm caused Tabby Island"],
  ["gameplaySystems", "Gameplay Systems", "Cooking System, Combat System"],
  ["enemies", "Enemies", "Prawnhusk, Ice Queen"],
  ["timelineEvents", "Timeline Events", "Lillia Tears Out Recipe Pages"]
];

const wikiTextFields: Array<[keyof WikiFields, string, string]> = [
  ["itemType", "Item Type", "Ingredient, Artifact, Magical Meal"],
  ["rarity", "Rarity", "Common, Rare, Legendary"],
  ["value", "Value", "25 gold or unknown"],
  ["stackSize", "Stack Size", "99"],
  ["whereToFind", "Where To Find", "Farms, Whisker Woods, boss drop"],
  ["howToCraft", "How To Craft", "Combine herbs and boga in the cauldron"],
  ["craftingStation", "Crafting Station", "Cauldron, pan, workbench"],
  ["ingredientsRequired", "Ingredients Required", "Turnip, boga, specialty herbs"],
  ["usedInRecipes", "Used In Recipes", "Veggie Broth, Fire Meal"],
  ["gameplayUse", "Gameplay Use", "Heals Gwen or grants a temporary combat buff"],
  ["loreDescription", "Lore Description", "How this item fits the world"],
  ["relatedDrops", "Related Drops", "Crayhusk Meat"],
  ["relatedEnemies", "Related Enemies", "Crayhusk, Prawnhusk"],
  ["relatedQuests", "Related Quests", "Kap's Pond Rescue"],
  ["relatedLocations", "Related Locations", "Whisker Woods"],
  ["notes", "Wiki Notes", "Balance, art, or implementation notes"]
];

const wikiBooleanFields: Array<[keyof WikiFields, string]> = [
  ["canBeSliced", "Can be sliced"],
  ["canBeChopped", "Can be chopped"],
  ["canBeCrushed", "Can be crushed"],
  ["canBeBoiled", "Can be boiled"],
  ["canBeFried", "Can be fried"],
  ["canBeBrewed", "Can be brewed"]
];

type ImageSlot =
  | "iconImage"
  | "mainImage"
  | "characterPortrait"
  | "characterHoverImage"
  | "ingameSpriteImage"
  | "dialogueSpriteImage"
  | "galleryImages";

const baseImageSlots: Array<[string, ImageSlot]> = [
  ["Icon Image", "iconImage"],
  ["Main Image", "mainImage"],
  ["Gallery Image", "galleryImages"]
];

const characterImageSlots: Array<[string, ImageSlot, string]> = [
  ["Character Button PNG", "characterPortrait", "Main character PNG used on the Characters page."],
  ["Hover Character PNG", "characterHoverImage", "Alternate PNG shown when hovering the character."],
  ["In-Game Sprite PNG", "ingameSpriteImage", "Small in-game sprite or gameplay pose."],
  ["Dialogue Sprite PNG", "dialogueSpriteImage", "Dialogue portrait or expression sheet preview."]
];

const splitValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const joinValues = (items: string[]) => items.filter(Boolean).join(", ");

const isEmptyValue = (value: unknown): boolean => {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value).every(isEmptyValue);
  return false;
};

const displayLabel = (label: string) =>
  label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .replace(/\bId\b/g, "ID");

const DisplayValue = ({ value }: { value: unknown }) => {
  if (isEmptyValue(value)) return null;

  if (typeof value === "boolean") {
    return <p className="mt-2 text-sm leading-6">{value ? "Yes" : "No"}</p>;
  }

  if (typeof value === "string" || typeof value === "number") {
    return <div className="mt-2 whitespace-pre-wrap text-sm leading-6"><RichLoreText text={String(value)} /></div>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {value.map((item) => (
          <span
            key={String(item)}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--card-border)", color: "var(--app-ink)" }}
          >
            <LoreKeywordText text={String(item)} />
          </span>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    const rows = Object.entries(value).filter(([, item]) => !isEmptyValue(item));
    if (!rows.length) return null;
    return (
      <div className="mt-2 space-y-2 text-sm">
        {rows.map(([key, item]) => (
          <div key={key} className="rounded border p-2" style={{ borderColor: "var(--card-border)" }}>
            <p className="font-semibold" style={{ color: "var(--muted-ink)" }}>
              {displayLabel(key)}
            </p>
            <DisplayValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const FieldBlock = ({ label, value }: { label: string; value?: unknown }) => {
  if (isEmptyValue(value)) return null;
  return (
    <div className="rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--muted-ink)" }}>
        {label}
      </p>
      <DisplayValue value={value} />
    </div>
  );
};

const TextInput = ({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-1">
    <span className="text-sm font-semibold">{label}</span>
    <input
      className="field w-full rounded px-3 py-2"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const TextArea = ({
  label,
  value,
  placeholder,
  minHeight = "min-h-28",
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  minHeight?: string;
  onChange: (value: string) => void;
}) => (
  <label className="block space-y-1">
    <span className="text-sm font-semibold">{label}</span>
    <RichTextEditor
      value={value}
      placeholder={placeholder}
      tall={minHeight === "min-h-40" || minHeight === "min-h-28"}
      onChange={onChange}
    />
  </label>
);

const ImagePreview = ({
  label,
  src,
  imageFit,
  canAdjust,
  onAdjust,
  onRemove
}: {
  label: string;
  src?: string;
  imageFit?: ImageFitSettings;
  canAdjust?: boolean;
  onAdjust?: (next: { imageUrl: string; imageFit: ImageFitSettings }) => void;
  onRemove: () => void;
}) => {
  if (!src) return null;
  return (
    <div className="rounded border p-2" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted-ink)" }}>
          {label}
        </span>
        <button className="rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--panel-border)" }} onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="mt-2 aspect-video w-full overflow-hidden rounded">
        <AdjustableImage
          src={src}
          label={label}
          imageFit={imageFit}
          aspectRatio="16 / 9"
          canAdjust={canAdjust}
          onSave={onAdjust}
          imageClassName="h-full w-full"
        />
      </div>
    </div>
  );
};

export function EntryModal({
  entry,
  readOnly = false,
  referenceKeyword = "",
  onClose,
  onViewReferences,
  onSave,
  onDuplicate,
  onDelete,
  currentUser,
  isFavorite = false,
  onToggleFavorite
}: EntryModalProps) {
  const [draft, setDraft] = useState(entry);
  const [isEditing, setIsEditing] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [error, setError] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const activeEntryId = useRef(entry.id);

  useEffect(() => {
    const openedDifferentEntry = activeEntryId.current !== entry.id;

    if (openedDifferentEntry) {
      activeEntryId.current = entry.id;
      setDraft(entry);
      setIsEditing(!readOnly && entry.title === "New Lore Entry");
      setNewFieldName("");
      setNewFieldValue("");
      setError("");
      setVideoLink("");
      return;
    }

    if (!isEditing) {
      setDraft(entry);
    }

    if (readOnly && isEditing) {
      setIsEditing(false);
    }
  }, [entry, isEditing, readOnly]);

  const allConnections = useMemo(
    () =>
      Object.entries(draft.connections).filter(([, values]) => Array.isArray(values) && values.length > 0),
    [draft.connections]
  );

  const updateDraft = (patch: Partial<LoreEntry>) => {
    setDraft((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  };

  const updateNotes = (patch: Partial<EntryNotes>) => {
    updateDraft({ notes: { ...draft.notes, ...patch } });
  };

  const updateConnection = (key: keyof EntryConnections, value: string) => {
    updateDraft({
      connections: {
        ...draft.connections,
        [key]: splitValues(value)
      }
    });
  };

  const updateCustomField = (oldKey: string, nextKey: string, value: string) => {
    const fields = { ...draft.fields };
    delete fields[oldKey];
    if (nextKey.trim()) fields[nextKey.trim()] = value;
    updateDraft({ fields });
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    updateDraft({
      fields: {
        ...draft.fields,
        [newFieldName.trim()]: newFieldValue
      }
    });
    setNewFieldName("");
    setNewFieldValue("");
  };

  const setCustomField = (key: string, value: string) => {
    const fields = { ...draft.fields };
    if (value.trim()) fields[key] = value;
    else delete fields[key];
    updateDraft({ fields });
  };

  const updateWiki = (patch: Partial<WikiFields>) => {
    updateDraft({ wiki: { ...(draft.wiki || {}), ...patch } });
  };

  const updateTimeline = (patch: Partial<TimelineInfo>) => {
    updateDraft({ timeline: { ...(draft.timeline || {}), ...patch } });
  };

  const updateSecret = (patch: Partial<SecretInfo>) => {
    updateDraft({
      secret: {
        knownBy: [],
        suspectedBy: [],
        unknownTo: [],
        relatedQuests: [],
        relatedDialogue: [],
        ...(draft.secret || {}),
        ...patch
      }
    });
  };

  const uploadImage = async (slot: ImageSlot, file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setError("Please choose a PNG, JPG, JPEG, WEBP, or GIF image.");
      return;
    }
    try {
      const dataUrl = await readImageFileForStorage(file, {
        maxDimension: slot === "galleryImages" || slot === "mainImage" ? 1300 : 900,
        maxDataUrlLength: slot === "galleryImages" || slot === "mainImage" ? 760_000 : 520_000
      });
      setDriveImage(slot, dataUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not prepare this image for storage.");
    }
  };

  const removeImage = (slot: ImageSlot, galleryIndex?: number) => {
    setDraft((current) => {
      if (slot === "galleryImages" && typeof galleryIndex === "number") {
        return {
          ...current,
          media: {
            ...current.media,
            galleryImages: current.media.galleryImages.filter((_, index) => index !== galleryIndex)
          },
          updatedAt: new Date().toISOString()
        };
      }

      return {
        ...current,
        media: { ...current.media, [slot]: undefined },
        updatedAt: new Date().toISOString()
      };
    });
  };

  const setDriveImage = (slot: ImageSlot, imageUrl: string) => {
    setDraft((current) => {
      const media: EntryMedia =
        slot === "galleryImages"
          ? { ...current.media, galleryImages: [...current.media.galleryImages, imageUrl] }
          : { ...current.media, [slot]: imageUrl };
      return { ...current, media, updatedAt: new Date().toISOString() };
    });
    setError("");
  };

  const saveImageFit = (slot: Exclude<ImageSlot, "galleryImages">, next: { imageUrl: string; imageFit: ImageFitSettings }) => {
    setDraft((current) => ({
      ...current,
      media: {
        ...current.media,
        [slot]: next.imageUrl,
        imageFits: {
          ...(current.media.imageFits || {}),
          [slot]: normalizeImageFit(next.imageFit)
        }
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const uploadVideo = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 7 * 1024 * 1024) {
      setError("Large video files may exceed browser storage limits. For long videos, use a link instead.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    updateDraft({
      media: {
        ...draft.media,
        uploadedVideos: [
          ...draft.media.uploadedVideos,
          { name: file.name, type: file.type, size: file.size, dataUrl, createdAt: new Date().toISOString() }
        ]
      }
    });
  };

  const save = () => {
    onSave(normalizeEntry({ ...draft, updatedAt: new Date().toISOString() }));
    setIsEditing(false);
    setError("");
  };

  const timeline = draft.timeline || {};
  const secret = draft.secret || {
    knownBy: [],
    suspectedBy: [],
    unknownTo: [],
    relatedQuests: [],
    relatedDialogue: []
  };
  const isCharacterEntry = /character/i.test(draft.category) || /character/i.test(draft.type);
  const visibleCharacterImages = [
    ["Character Button PNG", draft.media.characterPortrait],
    ["Hover Character PNG", draft.media.characterHoverImage],
    ["In-Game Sprite PNG", draft.media.ingameSpriteImage],
    ["Dialogue Sprite PNG", draft.media.dialogueSpriteImage]
  ].filter(([, src]) => Boolean(src));

  if (isCharacterEntry) {
    return (
      <div className="fixed inset-0 z-50">
        <button
          className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Close entry"
        />
        <section className="character-profile-modal entry-scroll absolute inset-x-3 top-4 mx-auto max-h-[calc(100vh-2rem)] max-w-7xl overflow-y-auto rounded md:inset-x-6">
          <CharacterProfileView
            entry={draft}
            readOnly={readOnly}
            isEditing={isEditing}
            error={error}
            onEdit={() => setIsEditing(true)}
            onSave={save}
            onCancel={() => {
              setDraft(entry);
              setIsEditing(false);
              setError("");
            }}
            onClose={onClose}
            onDelete={() => onDelete(draft)}
            referenceKeyword={referenceKeyword}
            onViewReferences={onViewReferences}
            onChange={updateDraft}
            onNotesChange={updateNotes}
            onConnectionChange={updateConnection}
            onSetField={setCustomField}
            onUploadImage={uploadImage}
            onRemoveImage={removeImage}
            currentUser={currentUser}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close entry"
      />
      <section className="modal-frame entry-scroll absolute inset-x-3 top-4 mx-auto flex max-h-[calc(100vh-2rem)] max-w-6xl flex-col overflow-hidden rounded md:inset-x-6">
        <header className="flex items-start gap-3 border-b p-4" style={{ borderColor: "var(--card-border)" }}>
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
            {draft.media.iconImage || draft.media.mainImage ? (
              <DriveAwareImage src={draft.media.iconImage || draft.media.mainImage || ""} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="BookOpen" className="h-7 w-7" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm" style={{ color: "var(--muted-ink)" }}>
              {draft.category} / {draft.type}
            </p>
            <h2 className="font-display text-3xl leading-9">{draft.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded border px-2 py-1" style={{ borderColor: "var(--card-border)" }}>
                {draft.status}
              </span>
              <span className="rounded border px-2 py-1" style={{ borderColor: "var(--card-border)" }}>
                {draft.spoilerLevel}
              </span>
              <span className="rounded border px-2 py-1" style={{ borderColor: "var(--card-border)" }}>
                Last edited {new Date(draft.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
          {onToggleFavorite && (
            <FavoriteButton
              active={isFavorite}
              label={draft.title}
              onToggle={onToggleFavorite}
              className="shrink-0"
            />
          )}
          {referenceKeyword && onViewReferences && (
            <button
              className="button-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
              onClick={() => onViewReferences(referenceKeyword)}
            >
              <Icon name="Search" className="h-4 w-4" />
              View all references
            </button>
          )}
          {!readOnly && !isEditing && (
            <button className="button-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={() => setIsEditing(true)}>
              <Icon name="Edit3" className="h-4 w-4" />
              Edit
            </button>
          )}
          <button className="rounded p-2 hover:bg-black/10" onClick={onClose} title="Close">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="entry-scroll overflow-y-auto p-4 md:p-6">
          {error && (
            <div className="mb-4 rounded border border-rose-500/50 bg-rose-500/10 p-3 text-sm">
              {error}
            </div>
          )}

          {isEditing ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div className="space-y-5">
                <section className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Core Details</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <TextInput label="Title" value={draft.title} placeholder="Gwen, Whisker Woods, Cray Broth" onChange={(value) => updateDraft({ title: value })} />
                    <TextInput label="Category" value={draft.category} placeholder="Characters, World, Quests, Food & Inventory" onChange={(value) => updateDraft({ category: value })} />
                    <TextInput label="Type" value={draft.type} placeholder="Character, Location, Recipe, Artifact" onChange={(value) => updateDraft({ type: value })} />
                    <label className="space-y-1">
                      <span className="text-sm font-semibold">Status</span>
                      <CustomSelect value={draft.status} onChange={(value) => updateDraft({ status: value })} options={statusOptions} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-semibold">Spoiler Level</span>
                      <CustomSelect value={draft.spoilerLevel} onChange={(value) => updateDraft({ spoilerLevel: value })} options={spoilerOptions} />
                    </label>
                    <TextInput label="Tags" value={joinValues(draft.tags)} placeholder="protagonist, cooking, Whisker Woods" onChange={(value) => updateDraft({ tags: splitValues(value) })} />
                  </div>
                  <div className="mt-4 space-y-3">
                    <TextArea label="Summary" value={draft.summary} placeholder="Short plain-English summary for cards and quick scanning." onChange={(value) => updateDraft({ summary: value })} />
                    <TextArea label="Public Description" value={draft.publicDescription} placeholder="Spoiler-safe description for Steam, website, trailer, or social posts." onChange={(value) => updateDraft({ publicDescription: value })} />
                    <TextArea label="Internal Lore" value={draft.internalLore} placeholder="Full private canon, backstory, contradictions, spoilers, and implementation notes." minHeight="min-h-40" onChange={(value) => updateDraft({ internalLore: value })} />
                  </div>
                </section>

                <section className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Notes</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <TextArea label="Art Notes" value={draft.notes.art} placeholder="Concept art, pose ideas, silhouette, colors, animation notes." minHeight="min-h-24" onChange={(value) => updateNotes({ art: value })} />
                    <TextArea label="Gameplay Notes" value={draft.notes.gameplay} placeholder="How this affects quests, combat, cooking, inventory, or progression." minHeight="min-h-24" onChange={(value) => updateNotes({ gameplay: value })} />
                    <TextArea label="Production Notes" value={draft.notes.production} placeholder="To-do items, asset status, naming decisions, build notes." minHeight="min-h-24" onChange={(value) => updateNotes({ production: value })} />
                    <TextArea label="Marketing Notes" value={draft.notes.marketing} placeholder="Spoiler-safe wording, post ideas, trailer-safe angles." minHeight="min-h-24" onChange={(value) => updateNotes({ marketing: value })} />
                    <TextArea label="Unresolved Questions" value={draft.notes.unresolved} placeholder="Questions to answer later, contradictions, missing canon decisions." minHeight="min-h-24" onChange={(value) => updateNotes({ unresolved: value })} />
                  </div>
                </section>

                <section className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Custom Fields</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--muted-ink)" }}>
                    Add named lore fields without writing code.
                  </p>
                  <div className="mt-3 space-y-3">
                    {Object.entries(draft.fields).map(([key, value]) => (
                      <div key={key} className="grid gap-2 rounded border p-3 md:grid-cols-[220px_1fr_auto]" style={{ borderColor: "var(--card-border)" }}>
                        <input className="field rounded px-3 py-2" value={key} placeholder="Field name, like Personality" onChange={(event) => updateCustomField(key, event.target.value, String(value ?? ""))} />
                        <RichTextEditor value={String(value ?? "")} placeholder="What should this field say?" onChange={(nextValue) => updateCustomField(key, key, nextValue)} />
                        <button className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }} onClick={() => updateCustomField(key, "", "")}>
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="grid gap-2 rounded border p-3 md:grid-cols-[220px_1fr_auto]" style={{ borderColor: "var(--card-border)" }}>
                      <input className="field rounded px-3 py-2" value={newFieldName} placeholder="New field name, like Personality" onChange={(event) => setNewFieldName(event.target.value)} />
                      <RichTextEditor value={newFieldValue} placeholder="New field details." onChange={setNewFieldValue} />
                      <button className="button-frame rounded px-3 py-2 text-sm" onClick={addCustomField}>
                        Add Field
                      </button>
                    </div>
                  </div>
                </section>

                <section className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Connections</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {connectionFields.map(([key, label, placeholder]) => (
                      <TextInput key={key} label={label} value={joinValues(draft.connections[key])} placeholder={placeholder} onChange={(value) => updateConnection(key, value)} />
                    ))}
                  </div>
                </section>

                {(draft.type === "Timeline Event" || draft.timeline) && (
                  <section className="soft-panel rounded p-4">
                    <h3 className="font-display text-xl">Timeline</h3>
                    <div className="mt-3 space-y-3">
                      <TextInput label="Era" value={timeline.era || ""} placeholder="Act 1, Lillia Incident, Tabby Island Disaster" onChange={(value) => updateTimeline({ era: value })} />
                      <TextArea label="True Timeline" value={timeline.trueTimeline || ""} placeholder="What really happened in canon." onChange={(value) => updateTimeline({ trueTimeline: value })} />
                      <TextArea label="Player Timeline" value={timeline.playerTimeline || ""} placeholder="What the player knows at this point." onChange={(value) => updateTimeline({ playerTimeline: value })} />
                      <TextArea label="Quest Timeline" value={timeline.questTimeline || ""} placeholder="How this appears through quests." onChange={(value) => updateTimeline({ questTimeline: value })} />
                      <TextArea label="Emotional Timeline" value={timeline.emotionalTimeline || ""} placeholder="The emotional character beat or reveal." onChange={(value) => updateTimeline({ emotionalTimeline: value })} />
                    </div>
                  </section>
                )}

                {(draft.type === "Secret" || draft.secret) && (
                  <section className="soft-panel rounded p-4">
                    <h3 className="font-display text-xl">Secret / Who Knows What</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <TextArea label="True Fact" value={secret.trueFact || ""} placeholder="The private canon truth." onChange={(value) => updateSecret({ trueFact: value })} />
                      <TextInput label="Known By" value={joinValues(secret.knownBy)} placeholder="Tohm Kyatt, Princess Lillia" onChange={(value) => updateSecret({ knownBy: splitValues(value) })} />
                      <TextInput label="Suspected By" value={joinValues(secret.suspectedBy)} placeholder="Oswin, Gwen later" onChange={(value) => updateSecret({ suspectedBy: splitValues(value) })} />
                      <TextInput label="Unknown To" value={joinValues(secret.unknownTo)} placeholder="Gwen, villagers, public" onChange={(value) => updateSecret({ unknownTo: splitValues(value) })} />
                      <TextArea label="Player Knowledge" value={secret.playerKnowledge || ""} placeholder="Unknown early, revealed after Act 1." onChange={(value) => updateSecret({ playerKnowledge: value })} />
                      <TextInput label="Related Quests" value={joinValues(secret.relatedQuests)} placeholder="Recover Recipe Pages" onChange={(value) => updateSecret({ relatedQuests: splitValues(value) })} />
                      <TextInput label="Related Dialogue" value={joinValues(secret.relatedDialogue)} placeholder="Oswin warning, Tohm confession" onChange={(value) => updateSecret({ relatedDialogue: splitValues(value) })} />
                    </div>
                  </section>
                )}

                <section className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Inventory Wiki Fields</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {wikiTextFields.map(([key, label, placeholder]) => (
                      <TextArea key={key} label={label} value={String(draft.wiki?.[key] || "")} placeholder={placeholder} minHeight="min-h-20" onChange={(value) => updateWiki({ [key]: value })} />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {wikiBooleanFields.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded border p-3 text-sm" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
                        <input type="checkbox" checked={Boolean(draft.wiki?.[key])} onChange={(event) => updateWiki({ [key]: event.target.checked })} />
                        {label}
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <div className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Media</h3>
                  <div className="mt-3 space-y-2">
                    {baseImageSlots.map(([label, slot]) => (
                      <div key={slot} className="entry-media-action-row">
                        <DriveImageSourceControls
                          compact
                          value={slot === "galleryImages" ? "" : String(draft.media[slot] || "")}
                          label={label}
                          title={`Choose ${label}`}
                          onChange={(imageUrl) => setDriveImage(slot, imageUrl)}
                        />
                      </div>
                    ))}
                    {isCharacterEntry && (
                      <div className="mt-4 space-y-2 rounded border p-3" style={{ borderColor: "var(--card-border)" }}>
                        <h4 className="font-display text-lg">Character Button Images</h4>
                        <p className="text-xs" style={{ color: "var(--muted-ink)" }}>
                          These control the Characters page hover button and sprite previews.
                        </p>
                        {characterImageSlots.map(([label, slot, title]) => (
                          <div key={slot} className="entry-media-action-row">
                            <DriveImageSourceControls
                              compact
                              value={String(draft.media[slot] || "")}
                              label={label}
                              title={`Choose ${label}`}
                              onChange={(imageUrl) => setDriveImage(slot, imageUrl)}
                            />
                            <small style={{ color: "var(--muted-ink)" }}>{title}</small>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }}>
                      <Icon name="Upload" className="h-4 w-4" />
                      Uploaded Video
                      <input className="hidden" type="file" accept="video/*" onChange={(event) => uploadVideo(event.target.files?.[0])} />
                    </label>
                    <p className="text-xs" style={{ color: "var(--muted-ink)" }}>
                      Large video files may exceed browser storage limits. For long videos, use a link instead.
                    </p>
                    <div className="mt-4 space-y-2">
                      <ImagePreview label="Icon Image" src={draft.media.iconImage} imageFit={draft.media.imageFits?.iconImage} canAdjust={isEditing} onAdjust={(next) => saveImageFit("iconImage", next)} onRemove={() => removeImage("iconImage")} />
                      <ImagePreview label="Main Image" src={draft.media.mainImage} imageFit={draft.media.imageFits?.mainImage} canAdjust={isEditing} onAdjust={(next) => saveImageFit("mainImage", next)} onRemove={() => removeImage("mainImage")} />
                      {isCharacterEntry && (
                        <>
                          <ImagePreview label="Character Button PNG" src={draft.media.characterPortrait} imageFit={draft.media.imageFits?.characterPortrait} canAdjust={isEditing} onAdjust={(next) => saveImageFit("characterPortrait", next)} onRemove={() => removeImage("characterPortrait")} />
                          <ImagePreview label="Hover Character PNG" src={draft.media.characterHoverImage} imageFit={draft.media.imageFits?.characterHoverImage} canAdjust={isEditing} onAdjust={(next) => saveImageFit("characterHoverImage", next)} onRemove={() => removeImage("characterHoverImage")} />
                          <ImagePreview label="In-Game Sprite PNG" src={draft.media.ingameSpriteImage} imageFit={draft.media.imageFits?.ingameSpriteImage} canAdjust={isEditing} onAdjust={(next) => saveImageFit("ingameSpriteImage", next)} onRemove={() => removeImage("ingameSpriteImage")} />
                          <ImagePreview label="Dialogue Sprite PNG" src={draft.media.dialogueSpriteImage} imageFit={draft.media.imageFits?.dialogueSpriteImage} canAdjust={isEditing} onAdjust={(next) => saveImageFit("dialogueSpriteImage", next)} onRemove={() => removeImage("dialogueSpriteImage")} />
                        </>
                      )}
                      {draft.media.galleryImages.map((src, index) => (
                        <ImagePreview key={`${src}-${index}`} label={`Gallery Image ${index + 1}`} src={src} onRemove={() => removeImage("galleryImages", index)} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Video Links</h3>
                  <div className="mt-3 flex gap-2">
                    <input className="field min-w-0 flex-1 rounded px-3 py-2" value={videoLink} placeholder="https://youtube.com/..." onChange={(event) => setVideoLink(event.target.value)} />
                    <button
                      className="button-frame rounded px-3"
                      onClick={() => {
                        if (!videoLink.trim()) return;
                        updateDraft({ media: { ...draft.media, videoLinks: [...draft.media.videoLinks, videoLink.trim()] } });
                        setVideoLink("");
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {draft.media.videoLinks.map((link) => (
                      <div key={link} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{link}</span>
                        <button
                          className="rounded p-1 hover:bg-black/10"
                          onClick={() => updateDraft({ media: { ...draft.media, videoLinks: draft.media.videoLinks.filter((item) => item !== link) } })}
                        >
                          <Icon name="X" className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="space-y-5">
              {isWikiEntry(draft) && (
                <WikiLayout
                  entry={draft}
                  canAdjustImages={isEditing}
                  onSaveImage={(slot, next) => saveImageFit(slot, next)}
                />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label="Summary" value={draft.summary} />
                <FieldBlock label="Public Description" value={draft.publicDescription} />
                <FieldBlock label="Internal Lore" value={draft.internalLore} />
                <FieldBlock label="Tags" value={draft.tags} />
                {Object.entries(draft.fields).map(([label, value]) => (
                  <FieldBlock key={label} label={label} value={value} />
                ))}
                {allConnections.map(([label, values]) => (
                  <FieldBlock key={label} label={`Connections: ${displayLabel(label)}`} value={values} />
                ))}
                <FieldBlock label="Art Notes" value={draft.notes.art} />
                <FieldBlock label="Gameplay Notes" value={draft.notes.gameplay} />
                <FieldBlock label="Production Notes" value={draft.notes.production} />
                <FieldBlock label="Marketing Notes" value={draft.notes.marketing} />
                <FieldBlock label="Unresolved Questions" value={draft.notes.unresolved} />
                <FieldBlock label="Timeline" value={draft.timeline} />
                <FieldBlock label="Secret" value={draft.secret} />
              </div>

              {(draft.media.mainImage || draft.media.galleryImages.length > 0 || draft.media.videoLinks.length > 0 || draft.media.uploadedVideos.length > 0) && (
                <section className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Media Gallery</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[draft.media.mainImage, ...draft.media.galleryImages].filter((src): src is string => Boolean(src)).map((src, index) => (
                      <DriveAwareImage key={`${src}-${index}`} src={src} alt="" className="aspect-video rounded object-cover" />
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {draft.media.videoLinks.map((link) => (
                      <a key={link} href={link} target="_blank" rel="noreferrer" className="block truncate underline">
                        {link}
                      </a>
                    ))}
                    {draft.media.uploadedVideos.map((video) => (
                      <video key={video.name} controls className="w-full rounded">
                        <source src={video.dataUrl} type={video.type} />
                      </video>
                    ))}
                  </div>
                </section>
              )}

              {visibleCharacterImages.length > 0 && (
                <section className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Character Images</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {visibleCharacterImages.map(([label, src]) => (
                      <figure key={label} className="rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
                        <div className="grid aspect-square place-items-center overflow-hidden rounded">
                          <DriveAwareImage src={src || ""} alt="" className="h-full w-full object-contain" />
                        </div>
                        <figcaption className="mt-2 text-center text-xs uppercase tracking-[0.12em]" style={{ color: "var(--muted-ink)" }}>
                          {label}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t p-4" style={{ borderColor: "var(--card-border)" }}>
          {isEditing ? (
            <>
              <button
                className="rounded border px-3 py-2"
                style={{ borderColor: "var(--panel-border)" }}
                onClick={() => {
                  setDraft(entry);
                  setIsEditing(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button className="rounded border px-3 py-2" style={{ borderColor: "var(--panel-border)" }} onClick={() => onDuplicate(draft)}>
                Duplicate
              </button>
              <button
                className="danger-button rounded border px-3 py-2"
                onClick={() => {
                  if (window.confirm(`Delete "${draft.title}"?`)) onDelete(draft);
                }}
              >
                Delete
              </button>
              <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={save}>
                <Icon name="Save" className="h-4 w-4" />
                Save
              </button>
            </>
          ) : (
            <>
              {referenceKeyword && onViewReferences && (
                <button
                  className="button-frame inline-flex items-center gap-2 rounded px-4 py-2"
                  onClick={() => onViewReferences(referenceKeyword)}
                >
                  <Icon name="Search" className="h-4 w-4" />
                  View all references
                </button>
              )}
              {!readOnly && (
                <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={() => setIsEditing(true)}>
                  <Icon name="Edit3" className="h-4 w-4" />
                  Edit
                </button>
              )}
              <button className="rounded border px-4 py-2" style={{ borderColor: "var(--panel-border)" }} onClick={onClose}>
                Close
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
