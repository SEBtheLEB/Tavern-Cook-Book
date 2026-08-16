import { useEffect, useMemo, useRef, useState } from "react";
import type { ActiveView, ThemeMode } from "../types";
import { mainNavigation } from "../data/navigation";
import { useOptionalAssignments } from "./AssignmentSystem";
import { Icon } from "./Icon";

interface StoryFocusMenuProps {
  theme: ThemeMode;
  activeView: ActiveView;
  hiddenViewIds: ActiveView[];
  readOnly: boolean;
  canAccessSettings: boolean;
  favoritesCount: number;
  favoritesOpen: boolean;
  assignMode: boolean;
  onThemeChange: (theme: ThemeMode) => void;
  onNavigate: (view: ActiveView) => void;
  onOpenFavorites?: () => void;
  onToggleAssignMode?: () => void;
}

const quickAccessIds: ActiveView[] = [
  "storyJourney",
  "dashboard",
  "characters",
  "world",
  "quests",
  "food",
  "bestiary",
  "artVault"
];

export function StoryFocusMenu({
  theme,
  activeView,
  hiddenViewIds,
  readOnly,
  canAccessSettings,
  favoritesCount,
  favoritesOpen,
  assignMode,
  onThemeChange,
  onNavigate,
  onOpenFavorites,
  onToggleAssignMode
}: StoryFocusMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const assignmentContext = useOptionalAssignments();
  const selectedAssignmentCount = assignmentContext?.selectedModuleCount || 0;
  const hiddenViews = useMemo(() => new Set(hiddenViewIds), [hiddenViewIds]);
  const quickAccess = useMemo(() => quickAccessIds
    .filter((id) => !hiddenViews.has(id))
    .filter((id) => !(readOnly && id === "artVault"))
    .map((id) => mainNavigation.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)), [hiddenViews, readOnly]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const runAndClose = (action: () => void) => {
    setOpen(false);
    action();
  };

  const toggleAssignments = () => {
    if (!onToggleAssignMode) return;
    if (assignMode && selectedAssignmentCount > 0) assignmentContext?.openSelectedAssignPopup();
    else onToggleAssignMode();
    setOpen(false);
  };

  return (
    <div ref={menuRef} className={`story-focus-menu ${open ? "open" : ""}`}>
      <button
        className="story-focus-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        title="Open Cook Book menu"
        aria-label="Open Cook Book menu"
        aria-expanded={open}
      >
        <Icon name="Menu" className="h-5 w-5" />
      </button>

      {open && (
        <section className="story-focus-menu-panel" aria-label="Cook Book quick menu">
          <header>
            <span>Cook Book Menu</span>
            <strong>Quick Access</strong>
          </header>

          <div className="story-focus-quick-grid">
            {quickAccess.map((item) => (
              <button
                key={item.id}
                className={activeView === item.id && !favoritesOpen ? "active" : ""}
                onClick={() => runAndClose(() => onNavigate(item.id))}
              >
                <Icon name={item.icon} className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="story-focus-menu-section">
            <span>Tools</span>
            <button onClick={() => runAndClose(() => window.dispatchEvent(new Event("tavern:story-search")))}>
              <Icon name="Search" className="h-4 w-4" />
              <span>Search Story</span>
            </button>
            {onOpenFavorites && (
              <button className={favoritesOpen ? "active" : ""} onClick={() => runAndClose(onOpenFavorites)}>
                <Icon name="Star" className="h-4 w-4" />
                <span>Favorites</span>
                <em>{favoritesCount}</em>
              </button>
            )}
            {onToggleAssignMode && (
              <button className={assignMode ? "active" : ""} onClick={toggleAssignments}>
                <Icon name="Clipboard" className="h-4 w-4" />
                <span>{assignMode && selectedAssignmentCount > 0 ? "Assign Selected" : "Assign Mode"}</span>
                {selectedAssignmentCount > 0 && <em>{selectedAssignmentCount}</em>}
              </button>
            )}
          </div>

          <div className="story-focus-menu-section">
            <span>App</span>
            <button onClick={() => runAndClose(() => onThemeChange(theme === "light" ? "dream" : "light"))}>
              <Icon name={theme === "light" ? "Moon" : "Sun"} className="h-4 w-4" />
              <span>{theme === "light" ? "Dream Tavern Mode" : "Cozy Light Mode"}</span>
            </button>
            <button onClick={() => window.location.reload()}>
              <Icon name="RefreshCw" className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            {canAccessSettings && !hiddenViews.has("settings") && (
              <button onClick={() => runAndClose(() => onNavigate("settings"))}>
                <Icon name="Settings" className="h-4 w-4" />
                <span>Settings</span>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
