import { useEffect, useRef, useState } from "react";
import type { ThemeMode } from "../types";
import { useOptionalAssignments } from "./AssignmentSystem";
import { Icon } from "./Icon";

interface TopBarProps {
  theme: ThemeMode;
  searchQuery: string;
  artVaultProgress?: {
    percent: number;
    filled: number;
    total: number;
    missing: number;
  };
  onThemeChange: (theme: ThemeMode) => void;
  onSearchQueryChange: (query: string) => void;
  onSubmitSearch: () => void;
  onCreateEntry: () => void;
  onOpenArtVaultDashboard?: () => void;
  onOpenFavorites?: () => void;
  onOpenMobileNav: () => void;
  readOnly?: boolean;
  favoritesCount?: number;
  favoritesOpen?: boolean;
  assignMode?: boolean;
  onToggleAssignMode?: () => void;
}

export function TopBar({
  theme,
  searchQuery,
  artVaultProgress,
  onThemeChange,
  onSearchQueryChange,
  onSubmitSearch,
  onCreateEntry,
  onOpenArtVaultDashboard,
  onOpenFavorites,
  onOpenMobileNav,
  readOnly = false,
  favoritesCount = 0,
  favoritesOpen = false,
  assignMode = false,
  onToggleAssignMode
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const assignmentContext = useOptionalAssignments();
  const selectedAssignmentCount = assignmentContext?.selectedModuleCount || 0;

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [searchOpen]);

  return (
    <header className="top-bar-frame sticky top-0 z-20 mx-4 mt-4 flex min-h-[72px] items-center gap-3 rounded px-3 py-3 backdrop-blur md:mx-6">
      <button
        className="rounded p-2 hover:bg-black/10 lg:hidden"
        onClick={onOpenMobileNav}
        title="Open navigation"
      >
        <Icon name="PanelLeft" className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted-ink)" }}>
          STL Productionz
        </p>
        <h2 className="truncate font-display text-2xl leading-7">The Tavern Cook Book</h2>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        {readOnly ? (
          <span className="tab-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm shadow-glow">
            <Icon name="Eye" className="h-4 w-4" />
            Live View Copy
          </span>
        ) : null}
        <button
          className="tab-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
          onClick={() => onThemeChange(theme === "light" ? "dream" : "light")}
          title={theme === "light" ? "Dream Tavern Mode" : "Cozy Tavern Mode"}
        >
          <Icon name={theme === "light" ? "Sun" : "Moon"} className="h-4 w-4" />
          {theme === "light" ? "Cozy Tavern Mode" : "Dream Tavern Mode"}
        </button>
      </div>

      {!readOnly && (
        <>
          {artVaultProgress && onOpenArtVaultDashboard && (
            <button
              className="top-art-vault-button"
              onClick={onOpenArtVaultDashboard}
              title={`${artVaultProgress.percent}% asset quest complete, ${artVaultProgress.missing} assets still missing`}
            >
              <span>
                <Icon name="Image" className="h-4 w-4" />
                <strong>Art Vault</strong>
                <em>{artVaultProgress.percent}%</em>
              </span>
              <i>
                <b style={{ width: `${artVaultProgress.percent}%` }} />
              </i>
            </button>
          )}
          <button
            className="button-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
            onClick={onCreateEntry}
            title="New entry"
          >
            <Icon name="Plus" className="h-4 w-4" />
            <span className="hidden sm:inline">New Entry</span>
          </button>
          {onToggleAssignMode && (
            <button
              className={`button-frame top-assign-mode-button ${assignMode ? "active" : ""}`}
              onClick={() => {
                if (assignMode && selectedAssignmentCount > 0) {
                  assignmentContext?.openSelectedAssignPopup();
                } else {
                  onToggleAssignMode();
                }
              }}
              title={assignMode && selectedAssignmentCount > 0 ? `Assign ${selectedAssignmentCount} selected modules` : assignMode ? "Turn Assign Mode off" : "Turn Assign Mode on"}
            >
              <Icon name="Clipboard" className="h-4 w-4" />
              <span className="hidden sm:inline">{assignMode && selectedAssignmentCount > 0 ? "Assign" : "Assign Mode"}</span>
              {assignMode && selectedAssignmentCount > 0 && <em>{selectedAssignmentCount}</em>}
            </button>
          )}
        </>
      )}

      {onOpenFavorites && (
        <button
          className={`top-favorites-button ${favoritesOpen ? "active" : ""}`}
          onClick={onOpenFavorites}
          title={`${favoritesCount} favorited ${favoritesCount === 1 ? "thing" : "things"}`}
        >
          <Icon name="Star" className="h-4 w-4" />
          <span className="hidden sm:inline">Favorites</span>
          <em>{favoritesCount}</em>
        </button>
      )}

      <div className={`search-frame flex items-center rounded transition-all ${searchOpen ? "w-full max-w-sm" : "w-11"}`}>
        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded"
          onClick={() => {
            if (!searchOpen) setSearchOpen(true);
            else onSubmitSearch();
          }}
          title="Search"
        >
          <Icon name="Search" className="h-5 w-5" />
        </button>
        {searchOpen && (
          <input
            ref={inputRef}
            className="field h-10 min-w-0 flex-1 border-0 bg-transparent px-2 outline-none"
            value={searchQuery}
            placeholder="Search lore"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSubmitSearch();
              }
              if (event.key === "Escape") {
                setSearchOpen(false);
                onSearchQueryChange("");
              }
            }}
          />
        )}
      </div>
    </header>
  );
}
