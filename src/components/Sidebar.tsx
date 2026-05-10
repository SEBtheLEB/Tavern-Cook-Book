import { useEffect, useMemo, useState } from "react";
import type { DragEvent, MouseEvent } from "react";
import type { ActiveView, GoogleAccountUser, LoreDatabase, ViewConfig } from "../types";
import { mainNavigation } from "../data/navigation";
import { Icon } from "./Icon";

interface SidebarProps {
  database: LoreDatabase;
  activeView: ActiveView;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (view: ActiveView) => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  readOnly?: boolean;
  storageWarning?: string;
  currentUser?: GoogleAccountUser | null;
  onSignOut?: () => void;
  onOpenProfile?: () => void;
  onOpenTavernScribe?: () => void;
  onOpenQuestDashboard?: () => void;
  questCount?: number;
  canAccessSettings?: boolean;
}

type SidebarLayoutNode =
  | { type: "item"; id: ActiveView }
  | { type: "folder"; id: string; name: string; open: boolean; children: Array<{ type: "item"; id: ActiveView }> };

type DragPayload =
  | { type: "item"; id: ActiveView }
  | { type: "folder"; id: string };

const SIDEBAR_LAYOUT_KEY = "tavern-cook-book:sidebar-layout";

export function Sidebar({
  database,
  activeView,
  collapsed,
  mobileOpen,
  onNavigate,
  onToggleCollapsed,
  onCloseMobile,
  readOnly = false,
  storageWarning = "",
  currentUser = null,
  onSignOut,
  onOpenProfile,
  onOpenTavernScribe,
  onOpenQuestDashboard,
  questCount = 0,
  canAccessSettings = false
}: SidebarProps) {
  const navigation = !canAccessSettings
    ? mainNavigation.filter((item) => item.id !== "settings")
    : mainNavigation;
  const allNavIds = useMemo(() => mainNavigation.map((item) => item.id), []);
  const [layout, setLayout] = useState<SidebarLayoutNode[]>(() => loadSidebarLayout(allNavIds));
  const [editingSidebar, setEditingSidebar] = useState(false);
  const [storageWarningOpen, setStorageWarningOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [sidebarTooltip, setSidebarTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const navigationById = useMemo(
    () => new Map(navigation.map((item) => [item.id, item] as const)),
    [navigation]
  );
  const normalizedLayout = useMemo(
    () => normalizeSidebarLayout(layout, allNavIds),
    [layout, allNavIds]
  );
  const visibleLayout = useMemo(
    () => filterVisibleLayout(normalizedLayout, navigationById),
    [normalizedLayout, navigationById]
  );

  useEffect(() => {
    if (!readOnly) saveSidebarLayout(normalizedLayout);
  }, [normalizedLayout, readOnly]);

  useEffect(() => {
    if (!storageWarning) setStorageWarningOpen(false);
  }, [storageWarning]);

  useEffect(() => {
    if (!collapsed) setSidebarTooltip(null);
  }, [collapsed]);

  const showCollapsedTooltip = (label: string, event: MouseEvent<HTMLElement>) => {
    if (!collapsed) return;
    setSidebarTooltip({ label, x: event.clientX, y: event.clientY });
  };

  const moveCollapsedTooltip = (event: MouseEvent<HTMLElement>) => {
    if (!collapsed) return;
    setSidebarTooltip((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
  };

  const hideCollapsedTooltip = () => setSidebarTooltip(null);

  const commitLayout = (updater: (current: SidebarLayoutNode[]) => SidebarLayoutNode[]) => {
    setLayout((current) => normalizeSidebarLayout(updater(normalizeSidebarLayout(current, allNavIds)), allNavIds));
  };

  const startSidebarEditing = () => {
    if (collapsed) onToggleCollapsed();
    setEditingSidebar((value) => !value);
  };

  const addFolder = () => {
    commitLayout((current) => [
      ...current,
      {
        type: "folder",
        id: `folder-${Date.now()}`,
        name: "New Folder",
        open: true,
        children: []
      }
    ]);
    if (!editingSidebar) setEditingSidebar(true);
  };

  const renameFolder = (folderId: string, name: string) => {
    commitLayout((current) =>
      current.map((node) => node.type === "folder" && node.id === folderId ? { ...node, name } : node)
    );
  };

  const toggleFolder = (folderId: string) => {
    commitLayout((current) =>
      current.map((node) => node.type === "folder" && node.id === folderId ? { ...node, open: !node.open } : node)
    );
  };

  const deleteFolder = (folderId: string) => {
    commitLayout((current) => {
      const next: SidebarLayoutNode[] = [];
      current.forEach((node) => {
        if (node.type !== "folder" || node.id !== folderId) {
          next.push(node);
          return;
        }
        next.push(...node.children);
      });
      return next;
    });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, payload: DragPayload) => {
    setDragging(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  const allowDrop = (event: DragEvent<HTMLElement>) => {
    if (!editingSidebar || !dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const dropOnRootNode = (event: DragEvent<HTMLElement>, targetIndex: number) => {
    if (!dragging) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    const insertIndex = targetIndex + (event.clientY > bounds.top + bounds.height / 2 ? 1 : 0);
    moveDraggedToRoot(dragging, insertIndex);
  };

  const dropAtRootEnd = (event: DragEvent<HTMLElement>) => {
    if (!dragging) return;
    event.preventDefault();
    moveDraggedToRoot(dragging, normalizedLayout.length);
  };

  const dropIntoFolder = (event: DragEvent<HTMLElement>, folderId: string, childIndex?: number) => {
    if (!dragging || dragging.type !== "item") return;
    event.preventDefault();
    event.stopPropagation();
    commitLayout((current) => {
      const { layout: withoutItem, item } = removeItemNode(current, dragging.id);
      return withoutItem.map((node) => {
        if (node.type !== "folder" || node.id !== folderId) return node;
        const children = [...node.children];
        children.splice(childIndex ?? children.length, 0, item);
        return { ...node, open: true, children };
      });
    });
    setDragging(null);
  };

  const moveDraggedToRoot = (payload: DragPayload, insertIndex: number) => {
    commitLayout((current) => {
      if (payload.type === "folder") {
        const sourceIndex = current.findIndex((node) => node.type === "folder" && node.id === payload.id);
        if (sourceIndex < 0) return current;
        const folder = current[sourceIndex];
        const withoutFolder = current.filter((node) => !(node.type === "folder" && node.id === payload.id));
        const adjustedIndex = sourceIndex < insertIndex ? insertIndex - 1 : insertIndex;
        withoutFolder.splice(clampIndex(adjustedIndex, withoutFolder.length), 0, folder);
        return withoutFolder;
      }

      const { layout: withoutItem, item } = removeItemNode(current, payload.id);
      withoutItem.splice(clampIndex(insertIndex, withoutItem.length), 0, item);
      return withoutItem;
    });
    setDragging(null);
  };

  const content = (
    <aside
      className={`sidebar-frame sticky top-0 flex h-screen max-h-screen shrink-0 flex-col text-[#fff5da] transition-colors duration-200 ${
        collapsed ? "w-[84px]" : "w-[280px]"
      }`}
    >
      <div className="flex min-h-[112px] items-center gap-3 border-b border-white/20 px-4 py-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded border border-amber-200/40 bg-amber-100/20">
          {database.branding.logoImage ? (
            <img
              src={database.branding.logoImage}
              alt="STL Productionz"
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon name="ChefHat" className="h-7 w-7 text-amber-100" />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-100/80">STL Productionz</p>
            <h1 className="font-display text-2xl leading-7 text-white">The Tavern Cook Book</h1>
            <p className="mt-1 text-xs text-amber-100/75">Tales of the Tavern</p>
          </div>
        )}
      </div>

      <nav
        className="entry-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4"
        onDragOver={allowDrop}
        onDrop={dropAtRootEnd}
      >
        {editingSidebar && !collapsed && (
          <div className="mb-3 rounded border border-white/15 bg-black/15 p-2 text-xs text-amber-50/75">
            Drag tabs to reorder them, or drop them onto a folder to tuck them inside.
          </div>
        )}

        {visibleLayout.map((node, index) => {
          if (node.type === "folder") {
            const folderActive = node.children.some((child) => child.id === activeView);
            return (
              <div
                key={node.id}
                className="rounded"
                draggable={editingSidebar}
                onDragStart={(event) => handleDragStart(event, { type: "folder", id: node.id })}
                onDragEnd={handleDragEnd}
                onDragOver={allowDrop}
                onDrop={(event) => dropOnRootNode(event, index)}
              >
                <div
                  className={`group flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition ${
                    folderActive
                      ? "bg-white/15 text-white"
                      : editingSidebar
                        ? "bg-black/15 text-amber-50"
                        : "text-amber-50/80 hover:bg-white/10 hover:text-white"
                  }`}
                  onDragOver={allowDrop}
                  onDrop={(event) => dropIntoFolder(event, node.id)}
                >
                  {editingSidebar && <Icon name="GripVertical" className="h-4 w-4 shrink-0 text-amber-100/55" />}
                  <button
                    className="grid h-6 w-6 shrink-0 place-items-center rounded hover:bg-white/10"
                    onClick={() => toggleFolder(node.id)}
                    title={collapsed ? undefined : node.open ? "Close folder" : "Open folder"}
                    onMouseEnter={(event) => showCollapsedTooltip(node.name || "Folder", event)}
                    onMouseMove={moveCollapsedTooltip}
                    onMouseLeave={hideCollapsedTooltip}
                  >
                    <Icon name={node.open ? "FolderOpen" : "Folder"} className="h-4 w-4" />
                  </button>
                  {!collapsed && (
                    editingSidebar ? (
                      <>
                        <input
                          className="min-w-0 flex-1 rounded border border-white/15 bg-black/20 px-2 py-1 text-sm text-amber-50 outline-none focus:border-amber-200/60"
                          value={node.name}
                          placeholder="Folder name"
                          onChange={(event) => renameFolder(node.id, event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <button
                          className="grid h-7 w-7 place-items-center rounded border border-white/15 bg-white/10 hover:bg-white/20"
                          onClick={() => deleteFolder(node.id)}
                          title="Delete folder and move tabs out"
                        >
                          <Icon name="Trash2" className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => toggleFolder(node.id)}
                      >
                        {node.name || "Untitled Folder"}
                      </button>
                    )
                  )}
                </div>
                {node.open && (
                  <div className={`${collapsed ? "ml-0" : "ml-4"} mt-1 space-y-1 border-l border-white/10 pl-2`}>
                    {node.children.map((child, childIndex) => {
                      const item = navigationById.get(child.id);
                      if (!item) return null;
                      return (
                        <SidebarNavItem
                          key={child.id}
                          item={item}
                          activeView={activeView}
                          collapsed={collapsed}
                          editing={editingSidebar}
                          count={countForItem(item, database)}
                          onTooltipShow={showCollapsedTooltip}
                          onTooltipMove={moveCollapsedTooltip}
                          onTooltipHide={hideCollapsedTooltip}
                          onNavigate={(view) => {
                            onNavigate(view);
                            onCloseMobile();
                          }}
                          onDragStart={(event) => handleDragStart(event, { type: "item", id: child.id })}
                          onDragEnd={handleDragEnd}
                          onDragOver={allowDrop}
                          onDrop={(event) => dropIntoFolder(event, node.id, childIndex)}
                        />
                      );
                    })}
                    {editingSidebar && !collapsed && (
                      <div
                        className="rounded border border-dashed border-white/20 px-3 py-2 text-xs text-amber-50/60"
                        onDragOver={allowDrop}
                        onDrop={(event) => dropIntoFolder(event, node.id)}
                      >
                        Drop tabs here
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          const item = navigationById.get(node.id);
          if (!item) return null;
          return (
            <SidebarNavItem
              key={node.id}
              item={item}
              activeView={activeView}
              collapsed={collapsed}
              editing={editingSidebar}
              count={countForItem(item, database)}
              onTooltipShow={showCollapsedTooltip}
              onTooltipMove={moveCollapsedTooltip}
              onTooltipHide={hideCollapsedTooltip}
              onNavigate={(view) => {
                onNavigate(view);
                onCloseMobile();
              }}
              onDragStart={(event) => handleDragStart(event, { type: "item", id: node.id })}
              onDragEnd={handleDragEnd}
              onDragOver={allowDrop}
              onDrop={(event) => dropOnRootNode(event, index)}
            />
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/20 p-3">
        {currentUser && (
          <div className={`sidebar-account-card ${collapsed ? "collapsed" : ""}`}>
            <button
              className="sidebar-account-main"
              onClick={() => setAccountMenuOpen((value) => !value)}
              title={collapsed ? undefined : `Account: ${currentUser.name}`}
              aria-label="Open profile menu"
              aria-expanded={accountMenuOpen}
              onMouseEnter={(event) => showCollapsedTooltip(`Account: ${currentUser.name}`, event)}
              onMouseMove={moveCollapsedTooltip}
              onMouseLeave={hideCollapsedTooltip}
            >
              <div className="sidebar-account-avatar">
                {currentUser.picture ? (
                  <img src={currentUser.picture} alt="" />
                ) : (
                  <Icon name="UserRound" className="h-5 w-5" />
                )}
              </div>
              {questCount > 0 && <span className="sidebar-account-quest-dot">{questCount}</span>}
            </button>
            {accountMenuOpen && (
              <div className="sidebar-account-menu">
                <div className="sidebar-account-menu-header">
                  <div className="sidebar-account-avatar small">
                    {currentUser.picture ? (
                      <img src={currentUser.picture} alt="" />
                    ) : (
                      <Icon name="UserRound" className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <strong>{currentUser.name}</strong>
                    <span>{currentUser.email}</span>
                    <em>{currentUser.role}{questCount ? ` / ${questCount} quests` : ""}</em>
                  </div>
                </div>
                {onOpenProfile && (
                  <button
                    className="sidebar-account-menu-action"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onOpenProfile();
                    }}
                  >
                    <Icon name="UserRound" className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                )}
                {onOpenTavernScribe && !readOnly && (
                  <button
                    className="sidebar-account-menu-action"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onOpenTavernScribe();
                    }}
                  >
                    <Icon name="ScrollText" className="h-4 w-4" />
                    <span>Tavern Scribe</span>
                  </button>
                )}
                {onOpenQuestDashboard && (
                  <button
                    className="sidebar-account-menu-action"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onOpenQuestDashboard();
                    }}
                  >
                    <Icon name="Clipboard" className="h-4 w-4" />
                    <span>Personal Quest Dashboard</span>
                  </button>
                )}
                {onSignOut && (
                  <button
                    className="sidebar-account-menu-action"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onSignOut();
                    }}
                  >
                    <Icon name="X" className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {storageWarning && (
          <div className={`sidebar-storage-warning ${collapsed ? "collapsed" : ""}`}>
            <button
              onClick={() => {
                if (collapsed) {
                  onToggleCollapsed();
                  setStorageWarningOpen(true);
                  return;
                }
                setStorageWarningOpen((value) => !value);
              }}
              className="sidebar-storage-warning-trigger"
              title={collapsed ? undefined : "Browser storage warning"}
              aria-label="Browser storage warning"
              aria-expanded={storageWarningOpen}
              onMouseEnter={(event) => showCollapsedTooltip("Browser storage warning", event)}
              onMouseMove={moveCollapsedTooltip}
              onMouseLeave={hideCollapsedTooltip}
            >
              <span>!</span>
            </button>
            {storageWarningOpen && !collapsed && (
              <div className="sidebar-storage-warning-panel">
                {storageWarning}
              </div>
            )}
          </div>
        )}
        {editingSidebar && !collapsed && (
          <button
            onClick={addFolder}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-amber-50 transition hover:bg-white/20"
          >
            <Icon name="Plus" className="h-4 w-4" />
            Add Folder
          </button>
        )}
        <div className={`grid grid-cols-2 ${collapsed ? "gap-1" : "gap-2"}`}>
          {!readOnly && (
            <button
              onClick={startSidebarEditing}
              className={`flex items-center justify-center rounded border border-white/20 py-2 text-amber-50 transition hover:bg-white/20 ${
                editingSidebar ? "bg-white/20" : "bg-white/10"
              } ${collapsed ? "px-1" : "px-3"}`}
              title={collapsed ? undefined : editingSidebar ? "Done organizing sidebar" : "Organize sidebar"}
              onMouseEnter={(event) => showCollapsedTooltip(editingSidebar ? "Done organizing sidebar" : "Organize sidebar", event)}
              onMouseMove={moveCollapsedTooltip}
              onMouseLeave={hideCollapsedTooltip}
            >
              <Icon name="Edit3" className="h-5 w-5" />
              {!collapsed && <span className="ml-2 text-sm">{editingSidebar ? "Done" : "Edit"}</span>}
            </button>
          )}
          <button
            onClick={onToggleCollapsed}
            className={`${readOnly ? "col-span-2" : ""} flex items-center justify-center rounded border border-white/20 bg-white/10 py-2 text-amber-50 transition hover:bg-white/20 ${
              collapsed ? "px-1" : "px-3"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onMouseEnter={(event) => showCollapsedTooltip(collapsed ? "Expand sidebar" : "Collapse sidebar", event)}
            onMouseMove={moveCollapsedTooltip}
            onMouseLeave={hideCollapsedTooltip}
          >
            <Icon name={collapsed ? "ChevronsRight" : "ChevronsLeft"} className="h-5 w-5" />
            {!collapsed && <span className="ml-2 text-sm">Collapse</span>}
          </button>
        </div>
        {collapsed && sidebarTooltip && (
          <div
            className="sidebar-hover-tooltip"
            style={{
              left: sidebarTooltip.x + 16,
              top: sidebarTooltip.y + 12
            }}
          >
            {sidebarTooltip.label}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          />
          <div className="relative h-full">{content}</div>
        </div>
      )}
    </>
  );
}

function SidebarNavItem({
  item,
  activeView,
  collapsed,
  editing,
  count,
  onTooltipShow,
  onTooltipMove,
  onTooltipHide,
  onNavigate,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: {
  item: ViewConfig;
  activeView: ActiveView;
  collapsed: boolean;
  editing: boolean;
  count?: number;
  onTooltipShow: (label: string, event: MouseEvent<HTMLElement>) => void;
  onTooltipMove: (event: MouseEvent<HTMLElement>) => void;
  onTooltipHide: () => void;
  onNavigate: (view: ActiveView) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}) {
  const active = activeView === item.id;
  const className = `group flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm transition ${
    active
      ? "bg-white/20 text-white shadow-glow"
      : "text-amber-50/80 hover:bg-white/10 hover:text-white"
  } ${editing ? "cursor-grab active:cursor-grabbing" : ""}`;

  if (editing) {
    return (
      <div
        title={collapsed ? undefined : item.label}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={className}
        onMouseEnter={(event) => onTooltipShow(item.label, event)}
        onMouseMove={onTooltipMove}
        onMouseLeave={onTooltipHide}
      >
        <Icon name="GripVertical" className="h-4 w-4 shrink-0 text-amber-100/55" />
        <Icon name={item.icon} className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {typeof count === "number" && (
              <span className="rounded border border-white/20 bg-black/20 px-2 py-0.5 text-xs text-amber-50/80">
                {count}
              </span>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <button
      title={collapsed ? undefined : item.label}
      onClick={() => onNavigate(item.id)}
      className={className}
      onMouseEnter={(event) => onTooltipShow(item.label, event)}
      onMouseMove={onTooltipMove}
      onMouseLeave={onTooltipHide}
    >
      <Icon name={item.icon} className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {typeof count === "number" && (
            <span className="rounded border border-white/20 bg-black/20 px-2 py-0.5 text-xs text-amber-50/80">
              {count}
            </span>
          )}
        </>
      )}
    </button>
  );
}

function countForItem(item: ViewConfig, database: LoreDatabase) {
  if (item.id === "bestiary") return database.bestiary?.length || 0;
  return item.category
    ? database.entries.filter((entry) => entry.category === item.category).length
    : undefined;
}

function loadSidebarLayout(navIds: ActiveView[]): SidebarLayoutNode[] {
  try {
    const raw = localStorage.getItem(SIDEBAR_LAYOUT_KEY);
    if (!raw) return navIds.map((id) => ({ type: "item", id }));
    return normalizeSidebarLayout(JSON.parse(raw), navIds);
  } catch {
    return navIds.map((id) => ({ type: "item", id }));
  }
}

function saveSidebarLayout(layout: SidebarLayoutNode[]) {
  try {
    localStorage.setItem(SIDEBAR_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Sidebar organization is a preference; the app can keep working if it cannot be saved.
  }
}

function normalizeSidebarLayout(value: unknown, navIds: ActiveView[]): SidebarLayoutNode[] {
  if (!Array.isArray(value)) return navIds.map((id) => ({ type: "item", id }));
  const validIds = new Set(navIds);
  const usedIds = new Set<ActiveView>();
  const normalized: SidebarLayoutNode[] = [];

  value.forEach((node) => {
    if (!node || typeof node !== "object") return;
    const candidate = node as Partial<SidebarLayoutNode>;
    if (candidate.type === "item" && typeof candidate.id === "string" && validIds.has(candidate.id as ActiveView) && !usedIds.has(candidate.id as ActiveView)) {
      usedIds.add(candidate.id as ActiveView);
      normalized.push({ type: "item", id: candidate.id as ActiveView });
      return;
    }

    if (candidate.type === "folder" && typeof candidate.id === "string") {
      const folder = candidate as Extract<SidebarLayoutNode, { type: "folder" }>;
      const children = Array.isArray(folder.children)
        ? folder.children
            .filter((child) => child?.type === "item" && validIds.has(child.id) && !usedIds.has(child.id))
            .map((child) => {
              usedIds.add(child.id);
              return { type: "item" as const, id: child.id };
            })
        : [];
      normalized.push({
        type: "folder",
        id: folder.id,
        name: typeof folder.name === "string" ? folder.name : "Folder",
        open: folder.open !== false,
        children
      });
    }
  });

  navIds.forEach((id) => {
    if (!usedIds.has(id)) normalized.push({ type: "item", id });
  });
  return normalized;
}

function filterVisibleLayout(layout: SidebarLayoutNode[], navigationById: Map<ActiveView, ViewConfig>) {
  return layout
    .map((node) => {
      if (node.type === "item") return navigationById.has(node.id) ? node : null;
      return {
        ...node,
        children: node.children.filter((child) => navigationById.has(child.id))
      };
    })
    .filter((node): node is SidebarLayoutNode => Boolean(node));
}

function removeItemNode(layout: SidebarLayoutNode[], id: ActiveView) {
  const item = { type: "item" as const, id };
  const next = layout
    .map((node) => {
      if (node.type === "item") return node.id === id ? null : node;
      return { ...node, children: node.children.filter((child) => child.id !== id) };
    })
    .filter((node): node is SidebarLayoutNode => Boolean(node));
  return { layout: next, item };
}

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), length);
}
