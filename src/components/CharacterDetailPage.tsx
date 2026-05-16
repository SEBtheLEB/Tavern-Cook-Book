import { useEffect, useRef, useState } from "react";
import type { EntryConnections, EntryMedia, EntryNotes, GoogleAccountUser, LoreEntry, StoryReference } from "../types";
import type { AssignmentRecord } from "../utils/assignments";
import { normalizeEntry } from "../utils/entries";
import { isSupportedImage, readImageFileForStorage } from "../utils/media";
import type { StoryReferenceDraftInput } from "../utils/storyReferences";
import { CharacterProfileView } from "./CharacterProfileView";
import { Icon } from "./Icon";

type ImageSlot =
  | "iconImage"
  | "mainImage"
  | "characterPortrait"
  | "characterHoverImage"
  | "ingameSpriteImage"
  | "dialogueSpriteImage"
  | "galleryImages";

interface CharacterDetailPageProps {
  entry: LoreEntry;
  characterEntries?: LoreEntry[];
  readOnly?: boolean;
  referenceKeyword?: string;
  onBack: () => void;
  onGoToCharacters?: () => void;
  onViewReferences?: (keyword: string) => void;
  onSave: (entry: LoreEntry) => void;
  onDelete: (entry: LoreEntry) => void;
  currentUser: GoogleAccountUser;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  focusedAssignment?: AssignmentRecord | null;
  onOpenArtBinder?: () => void;
  storyReferences?: StoryReference[];
  onCreateStoryReference?: (input: StoryReferenceDraftInput) => StoryReference;
  onOpenStorySource?: (storyReferenceId: string) => void;
}

const splitValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function CharacterDetailPage({
  entry,
  characterEntries = [],
  readOnly = false,
  referenceKeyword = "",
  onBack,
  onGoToCharacters,
  onViewReferences,
  onSave,
  onDelete,
  currentUser,
  isFavorite = false,
  onToggleFavorite,
  focusedAssignment = null,
  onOpenArtBinder,
  storyReferences = [],
  onCreateStoryReference,
  onOpenStorySource
}: CharacterDetailPageProps) {
  const [draft, setDraft] = useState(entry);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [artVaultOpen, setArtVaultOpen] = useState(false);
  const activeEntryId = useRef(entry.id);

  useEffect(() => {
    const openedDifferentEntry = activeEntryId.current !== entry.id;

    if (openedDifferentEntry) {
      activeEntryId.current = entry.id;
      setDraft(entry);
      setIsEditing(!readOnly && entry.title === "New Lore Entry");
      setArtVaultOpen(false);
      setError("");
      return;
    }

    if (!isEditing) {
      setDraft(entry);
    }

    if (readOnly && isEditing) {
      setIsEditing(false);
    }
  }, [entry, isEditing, readOnly]);

  useEffect(() => {
    if (!focusedAssignment || focusedAssignment.entryId !== entry.id || readOnly) return;
    setIsEditing(Boolean(focusedAssignment.editModeOnOpen));
  }, [entry.id, focusedAssignment, readOnly]);

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

  const setCustomField = (key: string, value: string) => {
    const fields = { ...draft.fields };
    if (value.trim()) fields[key] = value;
    else delete fields[key];
    updateDraft({ fields });
  };

  const commitDraftPatch = (patch: Partial<LoreEntry>) => {
    setDraft((current) => {
      const next = normalizeEntry({ ...current, ...patch, updatedAt: new Date().toISOString() });
      onSave(next);
      return next;
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
      setDraft((current) => {
        const media: EntryMedia =
          slot === "galleryImages"
            ? { ...current.media, galleryImages: [...current.media.galleryImages, dataUrl] }
            : { ...current.media, [slot]: dataUrl };
        return { ...current, media, updatedAt: new Date().toISOString() };
      });
      setError("");
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

  const save = () => {
    onSave(normalizeEntry({ ...draft, updatedAt: new Date().toISOString() }));
    setIsEditing(false);
    setError("");
  };

  return (
    <section className={`character-detail-page ${artVaultOpen ? "art-vault-active" : ""}`}>
      {!artVaultOpen && (
        <div className="character-detail-page-topbar">
          <button className="button-frame character-codex-action-button" onClick={onBack}>
            <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
            Back
          </button>
          {onGoToCharacters && (
            <button className="character-codex-action-button" onClick={onGoToCharacters}>
              <Icon name="Users" className="h-4 w-4" />
              Go to Characters
            </button>
          )}
        </div>
      )}

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
        onClose={onBack}
        onDelete={() => onDelete(draft)}
        referenceKeyword={referenceKeyword}
        onViewReferences={onViewReferences}
        onChange={updateDraft}
        onNotesChange={updateNotes}
        onConnectionChange={updateConnection}
        onSetField={setCustomField}
        onCommitPatch={commitDraftPatch}
        onUploadImage={uploadImage}
        onRemoveImage={removeImage}
        allCharacterEntries={characterEntries}
        onArtVaultOpenChange={setArtVaultOpen}
        currentUser={currentUser}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        focusedAssignment={focusedAssignment}
        onOpenArtBinder={onOpenArtBinder}
        storyReferences={storyReferences}
        onCreateStoryReference={onCreateStoryReference}
        onOpenStorySource={onOpenStorySource}
      />
    </section>
  );
}
