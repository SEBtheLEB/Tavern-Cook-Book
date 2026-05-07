import { useEffect, useRef, useState } from "react";
import type { AppMode, ThemeMode } from "../types";
import { Icon } from "./Icon";

interface TopBarProps {
  theme: ThemeMode;
  mode: AppMode;
  searchQuery: string;
  onThemeChange: (theme: ThemeMode) => void;
  onModeChange: (mode: AppMode) => void;
  onSearchQueryChange: (query: string) => void;
  onSubmitSearch: () => void;
  onCreateEntry: () => void;
  onOpenMobileNav: () => void;
  readOnly?: boolean;
}

export function TopBar({
  theme,
  mode,
  searchQuery,
  onThemeChange,
  onModeChange,
  onSearchQueryChange,
  onSubmitSearch,
  onCreateEntry,
  onOpenMobileNav,
  readOnly = false
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        ) : (
          <button
            className={`tab-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm ${
              mode === "view" ? "shadow-glow" : ""
            }`}
            onClick={() => onModeChange(mode === "view" ? "edit" : "view")}
            title={mode === "view" ? "Switch to edit mode" : "Switch to view mode"}
          >
            <Icon name={mode === "view" ? "Eye" : "Edit3"} className="h-4 w-4" />
            {mode === "view" ? "View Mode" : "Edit Mode"}
          </button>
        )}
        <button
          className="tab-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
          onClick={() => onThemeChange(theme === "light" ? "dream" : "light")}
          title={theme === "light" ? "Dream Tavern Mode" : "Light Tavern Mode"}
        >
          <Icon name={theme === "light" ? "Sun" : "Moon"} className="h-4 w-4" />
          {theme === "light" ? "Light Tavern Mode" : "Dream Tavern Mode"}
        </button>
      </div>

      {!readOnly && mode === "edit" && (
        <button
          className="button-frame inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
          onClick={onCreateEntry}
          title="New entry"
        >
          <Icon name="Plus" className="h-4 w-4" />
          <span className="hidden sm:inline">New Entry</span>
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
