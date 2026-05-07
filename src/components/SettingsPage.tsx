import { useEffect, useState } from "react";
import type { LoreDatabase, ThemeMode } from "../types";
import { createStarterDatabase } from "../data/starterData";
import { estimateStorageBytes, formatBytes, migrateDatabase } from "../utils/storage";
import { isSupportedImage, readFileAsDataUrl } from "../utils/media";
import { createShareableHtml } from "../utils/shareExport";
import { Icon } from "./Icon";

interface SettingsPageProps {
  database: LoreDatabase;
  theme: ThemeMode;
  onDatabaseChange: (database: LoreDatabase) => void;
  onThemeChange: (theme: ThemeMode) => void;
}

interface HealthState {
  ok: boolean;
  hasKey: boolean;
  model?: string;
  error?: string;
}

export function SettingsPage({ database, theme, onDatabaseChange, onThemeChange }: SettingsPageProps) {
  const [message, setMessage] = useState("");
  const [health, setHealth] = useState<HealthState | null>(null);
  const storageBytes = estimateStorageBytes(database);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((payload) => setHealth(payload as HealthState))
      .catch(() =>
        setHealth({
          ok: false,
          hasKey: false,
          error: "Backend is not responding."
        })
      );
  }, []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(database, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `the-tavern-cook-book-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
  };

  const exportWebsiteDataJson = () => {
    const blob = new Blob([JSON.stringify(database, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "lore-data.json";
    link.click();
    URL.revokeObjectURL(href);
    setMessage(
      "Downloaded lore-data.json. Put this file in the public folder of the GitHub Pages viewer repo."
    );
  };

  const exportShareableHtml = () => {
    const html = createShareableHtml(database);
    const blob = new Blob([html], { type: "text/html" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `the-tavern-cook-book-share-${new Date().toISOString().slice(0, 10)}.html`;
    link.click();
    URL.revokeObjectURL(href);
    setMessage(
      "Downloaded a read-only HTML snapshot. Upload that file to your website, then embed it with an iframe."
    );
  };

  const openLiveViewCopy = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("readonly", "1");
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setMessage(
      "Opened a live read-only view copy. Keep this app open for editing, and use the new tab/window for viewing."
    );
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = migrateDatabase(JSON.parse(text));
      onDatabaseChange(imported);
      setMessage("Imported JSON successfully.");
    } catch {
      setMessage("Invalid import JSON. No data was changed.");
    }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setMessage("Please choose a PNG, JPG, JPEG, WEBP, or GIF image.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    onDatabaseChange({
      ...database,
      branding: { ...database.branding, logoImage: dataUrl }
    });
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <section className="category-header-frame rounded p-5">
        <h2 className="font-display text-4xl">Settings</h2>
        <p className="mt-2 max-w-3xl leading-7" style={{ color: "var(--muted-ink)" }}>
          Data tools, theme, storage, logo, backups, and assistant backend status.
        </p>
      </section>

      {message && (
        <div className="soft-panel rounded p-3 text-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="soft-panel rounded p-4">
          <h3 className="font-display text-2xl">Import / Export</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={exportJson}>
              <Icon name="Download" className="h-4 w-4" />
              Export JSON
            </button>
            <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={exportWebsiteDataJson}>
              <Icon name="Download" className="h-4 w-4" />
              Download Website Data
            </button>
            <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={exportShareableHtml}>
              <Icon name="FileJson" className="h-4 w-4" />
              Download Shareable HTML
            </button>
            <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={openLiveViewCopy}>
              <Icon name="Eye" className="h-4 w-4" />
              Open Live View Copy
            </button>
            <label className="button-frame inline-flex cursor-pointer items-center gap-2 rounded px-4 py-2">
              <Icon name="Import" className="h-4 w-4" />
              Import JSON
              <input className="hidden" type="file" accept="application/json,.json" onChange={(event) => importJson(event.target.files?.[0])} />
            </label>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-ink)" }}>
            The live view copy is the exact app in read-only mode and updates beside this editor. The
            downloaded HTML is only a portable snapshot for uploading elsewhere.
          </p>
        </div>

        <div className="soft-panel rounded p-4">
          <h3 className="font-display text-2xl">Local Storage</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
              <p className="font-display text-3xl">{formatBytes(storageBytes)}</p>
              <p className="text-sm" style={{ color: "var(--muted-ink)" }}>Current app data</p>
            </div>
            <div className="rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
              <p className="font-display text-3xl">{database.backups.length}</p>
              <p className="text-sm" style={{ color: "var(--muted-ink)" }}>Saved backups</p>
            </div>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-ink)" }}>
            Large uploaded files may exceed browser storage limits. Video links are best for long clips.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="soft-panel rounded p-4">
          <h3 className="font-display text-2xl">Theme</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className={`tab-frame inline-flex items-center gap-2 rounded px-4 py-2 ${theme === "light" ? "shadow-glow" : ""}`}
              onClick={() => onThemeChange("light")}
            >
              <Icon name="Sun" className="h-4 w-4" />
              Light Tavern Mode
            </button>
            <button
              className={`tab-frame inline-flex items-center gap-2 rounded px-4 py-2 ${theme === "dream" ? "shadow-glow" : ""}`}
              onClick={() => onThemeChange("dream")}
            >
              <Icon name="Moon" className="h-4 w-4" />
              Dream Tavern Mode
            </button>
          </div>
        </div>

        <div className="soft-panel rounded p-4">
          <h3 className="font-display text-2xl">STL Productionz Logo</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded border" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
              {database.branding.logoImage ? (
                <img src={database.branding.logoImage} alt="STL Productionz" className="h-full w-full object-cover" />
              ) : (
                <Icon name="ChefHat" className="h-8 w-8" />
              )}
            </div>
            <label className="button-frame inline-flex cursor-pointer items-center gap-2 rounded px-4 py-2">
              <Icon name="Upload" className="h-4 w-4" />
              Replace Logo
              <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadLogo(event.target.files?.[0])} />
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="soft-panel rounded p-4">
          <h3 className="font-display text-2xl">AI Backend Status</h3>
          <div className="mt-4 rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
            <p className="font-semibold">{health?.ok ? "Backend Online" : "Backend Offline"}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-ink)" }}>
              API key: {health?.hasKey ? "Configured" : "Missing"} {health?.model ? `/ Model: ${health.model}` : ""}
            </p>
            {health?.error && <p className="mt-2 text-sm text-rose-600">{health.error}</p>}
          </div>
        </div>

        <div className="soft-panel rounded p-4">
          <h3 className="font-display text-2xl">App Data Tools</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded border px-4 py-2"
              style={{ borderColor: "var(--panel-border)" }}
              onClick={() => {
                if (window.confirm("Reset to starter data? This replaces current entries.")) {
                  onDatabaseChange(createStarterDatabase());
                }
              }}
            >
              Reset Starter Data
            </button>
            <button
              className="rounded border border-rose-500/50 px-4 py-2 text-rose-700"
              onClick={() => {
                if (window.confirm("Clear all local app data?")) {
                  onDatabaseChange(createStarterDatabase());
                  setMessage("Local data was cleared and starter data restored.");
                }
              }}
            >
              Clear Local App Data
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
