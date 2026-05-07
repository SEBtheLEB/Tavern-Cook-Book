import { useEffect, useMemo, useState } from "react";
import type { AppMode, EntryConnections, EntryNotes, LoreEntry, WikiFields } from "../types";
import { isSupportedImage, readFileAsDataUrl } from "../utils/media";
import { normalizeEntry } from "../utils/entries";
import { Icon } from "./Icon";
import { isWikiEntry, WikiLayout } from "./WikiLayout";

interface EntryModalProps {
  entry: LoreEntry;
  mode: AppMode;
  onClose: () => void;
  onSave: (entry: LoreEntry) => void;
  onDuplicate: (entry: LoreEntry) => void;
  onDelete: (entry: LoreEntry) => void;
}

const statusOptions = ["Canon", "Soft Canon", "Idea", "Needs Rewrite", "Scrapped", "Old Version", "Playtest Scope"];
const spoilerOptions = ["No Spoiler", "Minor Spoiler", "Major Spoiler", "Ending Spoiler"];

const joinValues = (items: string[]) => items.filter(Boolean).join(", ");
const splitValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const FieldBlock = ({ label, value }: { label: string; value?: unknown }) => {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--muted-ink)" }}>
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
        {Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
      </p>
    </div>
  );
};

export function EntryModal({ entry, mode, onClose, onSave, onDuplicate, onDelete }: EntryModalProps) {
  const [draft, setDraft] = useState(entry);
  const [fieldsJson, setFieldsJson] = useState(JSON.stringify(entry.fields, null, 2));
  const [connectionsJson, setConnectionsJson] = useState(JSON.stringify(entry.connections, null, 2));
  const [wikiJson, setWikiJson] = useState(JSON.stringify(entry.wiki || {}, null, 2));
  const [error, setError] = useState("");
  const [videoLink, setVideoLink] = useState("");

  useEffect(() => {
    setDraft(entry);
    setFieldsJson(JSON.stringify(entry.fields, null, 2));
    setConnectionsJson(JSON.stringify(entry.connections, null, 2));
    setWikiJson(JSON.stringify(entry.wiki || {}, null, 2));
    setError("");
  }, [entry]);

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

  const uploadImage = async (slot: "iconImage" | "mainImage" | "galleryImages", file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setError("Please choose a PNG, JPG, JPEG, WEBP, or GIF image.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (slot === "galleryImages") {
      updateDraft({ media: { ...draft.media, galleryImages: [...draft.media.galleryImages, dataUrl] } });
    } else {
      updateDraft({ media: { ...draft.media, [slot]: dataUrl } });
    }
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
    try {
      const parsedFields = JSON.parse(fieldsJson) as Record<string, unknown>;
      const parsedConnections = JSON.parse(connectionsJson) as EntryConnections;
      const parsedWiki = JSON.parse(wikiJson) as WikiFields;
      onSave(
        normalizeEntry({
          ...draft,
          tags: draft.tags,
          fields: parsedFields,
          connections: parsedConnections,
          wiki: Object.keys(parsedWiki).length ? parsedWiki : undefined,
          updatedAt: new Date().toISOString()
        })
      );
      setError("");
    } catch {
      setError("One of the JSON editor fields is invalid.");
    }
  };

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
              <img src={draft.media.iconImage || draft.media.mainImage} alt="" className="h-full w-full object-cover" />
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

          {mode === "edit" ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Title</span>
                    <input className="field w-full rounded px-3 py-2" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Category</span>
                    <input className="field w-full rounded px-3 py-2" value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Type</span>
                    <input className="field w-full rounded px-3 py-2" value={draft.type} onChange={(event) => updateDraft({ type: event.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Status</span>
                    <select className="field w-full rounded px-3 py-2" value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })}>
                      {statusOptions.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Spoiler Level</span>
                    <select className="field w-full rounded px-3 py-2" value={draft.spoilerLevel} onChange={(event) => updateDraft({ spoilerLevel: event.target.value })}>
                      {spoilerOptions.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Tags</span>
                    <input className="field w-full rounded px-3 py-2" value={joinValues(draft.tags)} onChange={(event) => updateDraft({ tags: splitValues(event.target.value) })} />
                  </label>
                </div>

                {[
                  ["Summary", "summary"],
                  ["Public Description", "publicDescription"],
                  ["Internal Lore", "internalLore"]
                ].map(([label, key]) => (
                  <label key={key} className="block space-y-1">
                    <span className="text-sm font-semibold">{label}</span>
                    <textarea
                      className="field min-h-28 w-full rounded px-3 py-2"
                      value={String(draft[key as keyof LoreEntry] || "")}
                      onChange={(event) => updateDraft({ [key]: event.target.value } as Partial<LoreEntry>)}
                    />
                  </label>
                ))}

                <div className="grid gap-3 md:grid-cols-2">
                  {(["art", "gameplay", "production", "marketing", "unresolved"] as const).map((key) => (
                    <label key={key} className="block space-y-1">
                      <span className="text-sm font-semibold capitalize">{key} notes</span>
                      <textarea
                        className="field min-h-24 w-full rounded px-3 py-2"
                        value={draft.notes[key]}
                        onChange={(event) => updateNotes({ [key]: event.target.value })}
                      />
                    </label>
                  ))}
                </div>

                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Custom Fields JSON</span>
                  <textarea className="field min-h-44 w-full rounded px-3 py-2 font-mono text-xs" value={fieldsJson} onChange={(event) => setFieldsJson(event.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Connections JSON</span>
                  <textarea className="field min-h-44 w-full rounded px-3 py-2 font-mono text-xs" value={connectionsJson} onChange={(event) => setConnectionsJson(event.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Wiki Fields JSON</span>
                  <textarea className="field min-h-44 w-full rounded px-3 py-2 font-mono text-xs" value={wikiJson} onChange={(event) => setWikiJson(event.target.value)} />
                </label>
              </div>

              <aside className="space-y-4">
                <div className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Media</h3>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Icon Image", "iconImage"],
                      ["Main Image", "mainImage"],
                      ["Gallery Image", "galleryImages"]
                    ].map(([label, slot]) => (
                      <label key={slot} className="button-frame flex cursor-pointer items-center justify-center gap-2 rounded px-3 py-2 text-sm">
                        <Icon name="Upload" className="h-4 w-4" />
                        {label}
                        <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadImage(slot as "iconImage" | "mainImage" | "galleryImages", event.target.files?.[0])} />
                      </label>
                    ))}
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--panel-border)" }}>
                      <Icon name="Upload" className="h-4 w-4" />
                      Uploaded Video
                      <input className="hidden" type="file" accept="video/*" onChange={(event) => uploadVideo(event.target.files?.[0])} />
                    </label>
                    <p className="text-xs" style={{ color: "var(--muted-ink)" }}>
                      Large video files may exceed browser storage limits. For long videos, use a link instead.
                    </p>
                  </div>
                </div>

                <div className="soft-panel rounded p-4">
                  <h3 className="font-display text-xl">Video Links</h3>
                  <div className="mt-3 flex gap-2">
                    <input className="field min-w-0 flex-1 rounded px-3 py-2" value={videoLink} onChange={(event) => setVideoLink(event.target.value)} />
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
              {isWikiEntry(draft) && <WikiLayout entry={draft} />}

              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label="Summary" value={draft.summary} />
                <FieldBlock label="Public Description" value={draft.publicDescription} />
                <FieldBlock label="Internal Lore" value={draft.internalLore} />
                <FieldBlock label="Tags" value={draft.tags} />
                {Object.entries(draft.fields).map(([label, value]) => (
                  <FieldBlock key={label} label={label} value={value} />
                ))}
                {allConnections.map(([label, values]) => (
                  <FieldBlock key={label} label={`Connections: ${label}`} value={values} />
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
                    {[draft.media.mainImage, ...draft.media.galleryImages].filter(Boolean).map((src, index) => (
                      <img key={`${src}-${index}`} src={src} alt="" className="aspect-video rounded object-cover" />
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
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t p-4" style={{ borderColor: "var(--card-border)" }}>
          {mode === "edit" && (
            <>
              <button className="rounded border px-3 py-2" style={{ borderColor: "var(--panel-border)" }} onClick={() => onDuplicate(draft)}>
                Duplicate
              </button>
              <button
                className="rounded border border-rose-500/50 px-3 py-2 text-rose-700"
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
          )}
          <button className="rounded border px-4 py-2" style={{ borderColor: "var(--panel-border)" }} onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
