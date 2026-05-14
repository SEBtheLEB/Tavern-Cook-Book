import { useEffect, useState } from "react";
import type { AccessRole, AccessUserPermission, ActiveView, GoogleAccountUser, LoreDatabase, ThemeMode } from "../types";
import { createStarterDatabase } from "../data/starterData";
import { mainNavigation } from "../data/navigation";
import type { AppSyncSettings } from "../utils/appSettings";
import { getHideableNavigationTabs } from "../utils/appSettings";
import type { DriveSettings } from "../utils/driveSettings";
import {
  clearDriveSettings,
  createEmptyDriveSettings,
  findUnsafeDriveSettings,
  getDriveSettings,
  isDriveConfigured,
  saveDriveSettings
} from "../utils/driveSettings";
import { estimateStorageBytes, formatBytes, migrateDatabase, sanitizeDatabaseForPersistence } from "../utils/storage";
import { loadAccessUsers, saveAccessUsers } from "../utils/accessControl";
import { openGoogleDriveFolderPicker } from "../utils/googlePicker";
import { isSupportedImage, readImageFileForStorage } from "../utils/media";
import { createShareableHtml } from "../utils/shareExport";
import { AssistantPanel } from "./AssistantPanel";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { Icon } from "./Icon";

interface SettingsPageProps {
  database: LoreDatabase;
  theme: ThemeMode;
  onDatabaseChange: (database: LoreDatabase) => void;
  onThemeChange: (theme: ThemeMode) => void;
  currentUser: GoogleAccountUser;
  appSyncSettings: AppSyncSettings;
  onAccessUsersChange: (users: AccessUserPermission[]) => void;
  onAppSyncSettingsChange: (settings: AppSyncSettings) => void;
}

interface HealthState {
  ok: boolean;
  hasKey: boolean;
  model?: string;
  error?: string;
}

export function SettingsPage({
  database,
  theme,
  onDatabaseChange,
  onThemeChange,
  currentUser,
  appSyncSettings,
  onAccessUsersChange,
  onAppSyncSettingsChange
}: SettingsPageProps) {
  const [message, setMessage] = useState("");
  const [health, setHealth] = useState<HealthState | null>(null);
  const [driveSettings, setDriveSettingsState] = useState<DriveSettings>(() => appSyncSettings.driveSettings || getDriveSettings());
  const [accessUsers, setAccessUsers] = useState<AccessUserPermission[]>(() => loadAccessUsers());
  const [newAccessEmail, setNewAccessEmail] = useState("");
  const [newAccessRole, setNewAccessRole] = useState<AccessRole>("viewer");
  const storageBytes = estimateStorageBytes(database);
  const driveConfigured = isDriveConfigured(driveSettings);
  const hideableNavigation = mainNavigation.filter((item) => getHideableNavigationTabs().includes(item.id));

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

  useEffect(() => {
    setDriveSettingsState(appSyncSettings.driveSettings || getDriveSettings());
  }, [appSyncSettings.driveSettings]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(sanitizeDatabaseForPersistence(database), null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `the-tavern-cook-book-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
  };

  const exportWebsiteDataJson = () => {
    const blob = new Blob([JSON.stringify(sanitizeDatabaseForPersistence(database), null, 2)], { type: "application/json" });
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
    try {
      const dataUrl = await readImageFileForStorage(file, {
        maxDimension: 600,
        maxDataUrlLength: 320_000
      });
      onDatabaseChange({
        ...database,
        branding: { ...database.branding, logoImage: dataUrl }
      });
      setMessage("Logo image saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare this logo image for storage.");
    }
  };

  const updateDriveSetting = (key: keyof DriveSettings, value: string) => {
    setDriveSettingsState((current) => ({ ...current, [key]: value }));
  };

  const chooseDriveSettingsFolder = async (key: keyof Pick<DriveSettings, "defaultTalesFolderId" | "defaultCharactersFolderId" | "defaultWorldArtFolderId" | "defaultMarketingArtFolderId">) => {
    if (!isDriveConfigured(driveSettings)) {
      setMessage("Save your Google API Key and OAuth Client ID first, then choose folders from Google Drive.");
      return;
    }

    try {
      saveDriveSettings(driveSettings);
      const folder = await openGoogleDriveFolderPicker("Choose Default Drive Folder");
      if (!folder) return;
      updateDriveSetting(key, folder.id);
      setMessage(`Selected "${folder.name}" for ${folderSettingLabel(key)}. Save Drive Settings to keep it.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not choose a Google Drive folder.");
    }
  };

  const saveCurrentDriveSettings = () => {
    const findings = findUnsafeDriveSettings(driveSettings);
    if (findings.length) {
      setMessage(
        `Drive settings were not saved. ${findings.map((finding) => `${finding.label} ${finding.reason}`).join("; ")}.`
      );
      return;
    }

    try {
      saveDriveSettings(driveSettings);
      onAppSyncSettingsChange({
        ...appSyncSettings,
        driveSettings
      });
      setMessage("Google Drive settings saved for the team. STL Workshop and this app can reuse them now.");
    } catch {
      setMessage("Could not save Google Drive settings in this browser.");
    }
  };

  const testDriveSetup = () => {
    if (!isDriveConfigured(driveSettings)) {
      setMessage("Google Drive is not connected yet. Add your API Key and OAuth Client ID in Settings first.");
      return;
    }

    const optionalFoldersMissing = [
      driveSettings.defaultTalesFolderId,
      driveSettings.defaultCharactersFolderId,
      driveSettings.defaultWorldArtFolderId,
      driveSettings.defaultMarketingArtFolderId
    ].some((field) => !field.trim());

    setMessage(
      optionalFoldersMissing
        ? "Drive setup has the required API Key and OAuth Client ID. Folder IDs can be added now or later."
        : "Drive setup looks ready locally. No Google connection or upload was attempted."
    );
  };

  const clearCurrentDriveSettings = () => {
    if (!window.confirm("Clear saved Google Drive settings from this browser?")) return;
    try {
      clearDriveSettings();
      const emptySettings = createEmptyDriveSettings();
      setDriveSettingsState(emptySettings);
      onAppSyncSettingsChange({
        ...appSyncSettings,
        driveSettings: emptySettings
      });
      setMessage("Google Drive settings cleared.");
    } catch {
      setMessage("Could not clear Google Drive settings in this browser.");
    }
  };

  const updateAccessUser = (email: string, patch: Partial<AccessUserPermission>) => {
    setAccessUsers((current) =>
      current.map((user) => {
        if (user.email !== email) return user;
        if (user.email === "stlprodz1101@gmail.com") {
          return { ...user, ...patch, email: "stlprodz1101@gmail.com", role: "admin" };
        }
        return { ...user, ...patch };
      })
    );
  };

  const addAccessUser = () => {
    const email = newAccessEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setMessage("Enter a valid Gmail address before adding access.");
      return;
    }
    if (accessUsers.some((user) => user.email === email)) {
      setMessage("That email is already in the access list.");
      return;
    }
    setAccessUsers((current) => [...current, { email, role: newAccessRole }]);
    setNewAccessEmail("");
    setNewAccessRole("viewer");
  };

  const removeAccessUser = (email: string) => {
    if (email === "stlprodz1101@gmail.com") {
      setMessage("The main admin account cannot be removed.");
      return;
    }
    setAccessUsers((current) => current.filter((user) => user.email !== email));
  };

  const saveCurrentAccessUsers = () => {
    try {
      saveAccessUsers(accessUsers);
      const savedUsers = loadAccessUsers();
      setAccessUsers(savedUsers);
      onAccessUsersChange(savedUsers);
      onAppSyncSettingsChange({
        ...appSyncSettings,
        accessUsers: savedUsers
      });
      setMessage("Team access saved. New sign-ins will use these permissions.");
    } catch {
      setMessage("Could not save team access in this browser.");
    }
  };

  const toggleHiddenMemberTab = (viewId: ActiveView) => {
    const hidden = new Set(appSyncSettings.visibility.hiddenForMembers);
    if (hidden.has(viewId)) hidden.delete(viewId);
    else hidden.add(viewId);
    onAppSyncSettingsChange({
      ...appSyncSettings,
      visibility: {
        hiddenForMembers: [...hidden]
      }
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

      <section className="soft-panel rounded p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl">Member Tab Visibility</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-ink)" }}>
              Hidden tabs stay available to admins.
            </p>
          </div>
          <span className="rounded border px-3 py-1 text-sm" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
            {appSyncSettings.visibility.hiddenForMembers.length} hidden
          </span>
        </div>
        <div className="settings-visibility-grid mt-4">
          {hideableNavigation.map((item) => {
            const hidden = appSyncSettings.visibility.hiddenForMembers.includes(item.id);
            return (
              <label key={item.id} className={`settings-visibility-row ${hidden ? "is-hidden" : ""}`}>
                <input
                  type="checkbox"
                  checked={!hidden}
                  onChange={() => toggleHiddenMemberTab(item.id)}
                />
                <span>
                  <strong>{item.label}</strong>
                  <em>{hidden ? "Hidden from members" : "Visible to members"}</em>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="soft-panel rounded p-4 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl">Team Access</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-ink)" }}>
                Admin can access Settings and manage Gmail permissions. Editors can create, edit, upload, and download. Viewers can only read and click links.
              </p>
            </div>
            <span className="rounded border px-3 py-1 text-sm" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
              Signed in as {currentUser.email}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {accessUsers.map((user) => {
              const lockedAdmin = user.email === "stlprodz1101@gmail.com";
              return (
                <div key={user.email} className="settings-access-row">
                  <input
                    value={user.email}
                    disabled={lockedAdmin}
                    onChange={(event) => updateAccessUser(user.email, { email: event.target.value.trim().toLowerCase() })}
                    aria-label="Team member email"
                  />
                  <CustomSelect
                    value={user.role}
                    disabled={lockedAdmin}
                    onChange={(value) => updateAccessUser(user.email, { role: value as AccessRole })}
                    ariaLabel="Team member permission"
                    options={[
                      { value: "viewer", label: "Viewer" },
                      { value: "editor", label: "Editor" },
                      { value: "admin", label: "Admin" }
                    ]}
                  />
                  <input
                    value={user.label || ""}
                    placeholder="Optional name or note"
                    onChange={(event) => updateAccessUser(user.email, { label: event.target.value })}
                    aria-label="Team member note"
                  />
                  <button className="tab-frame rounded px-3 py-2" onClick={() => removeAccessUser(user.email)} disabled={lockedAdmin}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div className="settings-access-add-row mt-4">
            <input
              value={newAccessEmail}
              placeholder="newteammate@gmail.com"
              onChange={(event) => setNewAccessEmail(event.target.value)}
              aria-label="New Gmail account"
            />
            <CustomSelect
              value={newAccessRole}
              onChange={(value) => setNewAccessRole(value as AccessRole)}
              ariaLabel="New permission"
              options={[
                { value: "viewer", label: "Viewer" },
                { value: "editor", label: "Editor" },
                { value: "admin", label: "Admin" }
              ]}
            />
            <button className="tab-frame rounded px-4 py-2" onClick={addAccessUser}>
              Add Gmail
            </button>
            <button className="button-frame rounded px-4 py-2" onClick={saveCurrentAccessUsers}>
              Save Team Access
            </button>
          </div>
        </div>

        <div className="soft-panel rounded p-4">
          <h3 className="font-display text-2xl">Theme</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className={`tab-frame inline-flex items-center gap-2 rounded px-4 py-2 ${theme === "light" ? "shadow-glow" : ""}`}
              onClick={() => onThemeChange("light")}
            >
              <Icon name="Sun" className="h-4 w-4" />
              Cozy Tavern Mode
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
                <DriveAwareImage src={database.branding.logoImage} alt="STL Productionz" className="h-full w-full object-cover" />
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

      <section className="soft-panel rounded p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl">Google Drive Integration</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: "var(--muted-ink)" }}>
              Add your Google API Key and OAuth Client ID from Google Cloud Console. Admin-saved setup is
              synced through the shared app settings so STL Workshop and Tavern use the same connection.
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
            {driveConfigured ? "Configured for team" : "Not connected"}
          </span>
        </div>

        <div className="mt-4 rounded border p-3" style={{ borderColor: "var(--danger-border)", background: "var(--danger-bg)" }}>
          <p className="font-semibold" style={{ color: "var(--danger-ink)" }}>
            Only use a restricted Google API key. Do not paste service account keys, client secrets, private keys, access tokens, or refresh tokens here.
          </p>
        </div>

        <div className="mt-4 rounded border p-3" style={{ borderColor: "var(--card-border)", background: "var(--field-bg)" }}>
          <h4 className="font-display text-xl">Drive Security Checklist</h4>
          <ul className="mt-2 grid gap-1 text-sm" style={{ color: "var(--muted-ink)" }}>
            <li>API key restricted to this website/domain</li>
            <li>API key restricted to only required Google APIs</li>
            <li>OAuth JavaScript origins restricted to this app domain</li>
            <li>Drive scope limited to drive.file</li>
            <li>Shared Drive folder permissions configured manually in Google Drive</li>
          </ul>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <DriveSettingsInput
            label="Google API Key"
            value={driveSettings.googleApiKey}
            placeholder="Paste API key from Google Cloud Console"
            type="password"
            onChange={(value) => updateDriveSetting("googleApiKey", value)}
          />
          <DriveSettingsInput
            label="Google OAuth Client ID"
            value={driveSettings.googleOAuthClientId}
            placeholder="Paste OAuth client ID from Google Cloud Console"
            onChange={(value) => updateDriveSetting("googleOAuthClientId", value)}
          />
          <DriveSettingsInput
            label="Default Tales of the Tavern Drive Folder ID"
            value={driveSettings.defaultTalesFolderId}
            placeholder="Main lore bible Drive folder ID"
            onChange={(value) => updateDriveSetting("defaultTalesFolderId", value)}
            onPickFolder={() => chooseDriveSettingsFolder("defaultTalesFolderId")}
          />
          <DriveSettingsInput
            label="Default Characters Folder ID"
            value={driveSettings.defaultCharactersFolderId}
            placeholder="Characters art/reference folder ID"
            onChange={(value) => updateDriveSetting("defaultCharactersFolderId", value)}
            onPickFolder={() => chooseDriveSettingsFolder("defaultCharactersFolderId")}
          />
          <DriveSettingsInput
            label="Default World Art Folder ID"
            value={driveSettings.defaultWorldArtFolderId}
            placeholder="World art/reference folder ID"
            onChange={(value) => updateDriveSetting("defaultWorldArtFolderId", value)}
            onPickFolder={() => chooseDriveSettingsFolder("defaultWorldArtFolderId")}
          />
          <DriveSettingsInput
            label="Default Marketing Art Folder ID"
            value={driveSettings.defaultMarketingArtFolderId}
            placeholder="Marketing art folder ID"
            onChange={(value) => updateDriveSetting("defaultMarketingArtFolderId", value)}
            onPickFolder={() => chooseDriveSettingsFolder("defaultMarketingArtFolderId")}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={saveCurrentDriveSettings}>
            <Icon name="Save" className="h-4 w-4" />
            Save Drive Settings
          </button>
          <button className="button-frame inline-flex items-center gap-2 rounded px-4 py-2" onClick={testDriveSetup}>
            <Icon name="Activity" className="h-4 w-4" />
            Test Drive Setup
          </button>
          <button className="rounded border border-rose-500/50 px-4 py-2 text-rose-700" onClick={clearCurrentDriveSettings}>
            Clear Drive Settings
          </button>
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

        <AssistantPanel database={database} onDatabaseChange={onDatabaseChange} embedded />

        <div className="soft-panel rounded p-4 xl:col-span-2">
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

function DriveSettingsInput({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
  onPickFolder
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "password";
  onChange: (value: string) => void;
  onPickFolder?: () => void;
}) {
  return (
    <div className="block text-sm">
      <label>
        <span className="font-semibold">{label}</span>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          style={{ borderColor: "var(--card-border)", background: "var(--field-bg)", color: "var(--ink)" }}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {onPickFolder && (
        <button className="mt-2 inline-flex items-center gap-2 rounded border px-3 py-2" style={{ borderColor: "var(--card-border)" }} onClick={onPickFolder}>
          <Icon name="FolderOpen" className="h-4 w-4" />
          Choose From Google Drive
        </button>
      )}
    </div>
  );
}

function folderSettingLabel(key: keyof Pick<DriveSettings, "defaultTalesFolderId" | "defaultCharactersFolderId" | "defaultWorldArtFolderId" | "defaultMarketingArtFolderId">) {
  if (key === "defaultCharactersFolderId") return "Default Characters Folder";
  if (key === "defaultWorldArtFolderId") return "Default World Art Folder";
  if (key === "defaultMarketingArtFolderId") return "Default Marketing Art Folder";
  return "Default Tales Folder";
}
