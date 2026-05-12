import type { GoogleAccountUser, LoreDatabase, ThemeMode } from "../types";
import { APP_VERSION_LABEL } from "../utils/appVersion";
import { BrandImageEditor } from "./BrandImageEditor";
import { Icon } from "./Icon";

interface LauncherPageProps {
  database: LoreDatabase;
  currentUser: GoogleAccountUser;
  theme: ThemeMode;
  canEditBranding: boolean;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenTavernCookBook: () => void;
  onSignOut: () => void;
  onLogoChange: (logoImage: string) => void;
}

export function LauncherPage({
  database,
  currentUser,
  theme,
  canEditBranding,
  onThemeChange,
  onOpenTavernCookBook,
  onSignOut,
  onLogoChange
}: LauncherPageProps) {
  const logoImage = database.branding.logoImage || "";
  const moduleCount = database.entries.length;
  const creatureCount = database.bestiary?.length || 0;

  return (
    <main className="launcher-page">
      <header className="launcher-header">
        <div className="launcher-brand-lockup">
          <div className={`launcher-logo ${logoImage ? "has-image" : ""}`}>
            {logoImage ? (
              <img src={logoImage} alt="STL Productionz" />
            ) : (
              <Icon name="Sparkles" className="h-8 w-8" />
            )}
          </div>
          <div>
            <p>STL Productionz</p>
            <h1 className="font-display">App Launcher</h1>
            <span>Tales team workspace</span>
          </div>
        </div>

        <div className="launcher-account-panel">
          <div className="launcher-account">
            <div className="launcher-account-avatar">
              {currentUser.picture ? (
                <img src={currentUser.picture} alt="" />
              ) : (
                <Icon name="UserRound" className="h-5 w-5" />
              )}
            </div>
            <div>
              <strong>{currentUser.name}</strong>
              <span>{currentUser.email}</span>
              <em>{currentUser.role}</em>
            </div>
          </div>
          <button
            className="tab-frame launcher-icon-button"
            onClick={() => onThemeChange(theme === "light" ? "dream" : "light")}
            title={theme === "light" ? "Dream Tavern Mode" : "Cozy Tavern Mode"}
          >
            <Icon name={theme === "light" ? "Sun" : "Moon"} className="h-4 w-4" />
          </button>
          <button className="tab-frame launcher-signout-button" onClick={onSignOut}>
            <Icon name="X" className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <section className="launcher-content">
        <div className="launcher-section-head">
          <div>
            <p>Available Apps</p>
            <h2 className="font-display">Your Production Tools</h2>
          </div>
          <span>{APP_VERSION_LABEL}</span>
        </div>

        {canEditBranding && (
          <BrandImageEditor
            logoImage={logoImage}
            onLogoChange={onLogoChange}
          />
        )}

        <div className="launcher-grid">
          <button className="launcher-app-card" onClick={onOpenTavernCookBook}>
            <div className="launcher-app-art">
              {logoImage ? (
                <img src={logoImage} alt="" />
              ) : (
                <Icon name="BookOpen" className="h-9 w-9" />
              )}
            </div>
            <div className="launcher-app-copy">
              <p>Tales of the Tavern</p>
              <h3 className="font-display">The Tavern Cook Book</h3>
              <span>Living lore bible, production binder, pantry, bestiary, art vault, and Tavern Scribe.</span>
            </div>
            <div className="launcher-app-stats">
              <span>{moduleCount} modules</span>
              <span>{creatureCount} creatures</span>
              <span>{currentUser.role}</span>
            </div>
          </button>
        </div>
      </section>
    </main>
  );
}
