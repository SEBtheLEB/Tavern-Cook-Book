import type { ActiveView, LoreDatabase } from "../types";
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
}

export function Sidebar({
  database,
  activeView,
  collapsed,
  mobileOpen,
  onNavigate,
  onToggleCollapsed,
  onCloseMobile,
  readOnly = false
}: SidebarProps) {
  const navigation = readOnly
    ? mainNavigation.filter((item) => item.id !== "settings")
    : mainNavigation;

  const content = (
    <aside
      className={`sidebar-frame flex h-full flex-col text-[#fff5da] transition-all duration-300 ${
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

      <nav className="entry-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const active = activeView === item.id;
          const count = item.category
            ? database.entries.filter((entry) => entry.category === item.category).length
            : undefined;

          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => {
                onNavigate(item.id);
                onCloseMobile();
              }}
              className={`group flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "bg-white/20 text-white shadow-glow"
                  : "text-amber-50/80 hover:bg-white/10 hover:text-white"
              }`}
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
        })}
      </nav>

      <div className="border-t border-white/20 p-3">
        <button
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-center rounded border border-white/20 bg-white/10 px-3 py-2 text-amber-50 transition hover:bg-white/20"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "ChevronsRight" : "ChevronsLeft"} className="h-5 w-5" />
          {!collapsed && <span className="ml-2 text-sm">Collapse</span>}
        </button>
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
