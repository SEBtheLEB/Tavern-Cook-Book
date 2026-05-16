import { dashboardBoxes, hubSections, mainNavigation } from "../data/navigation";
import type { BestiaryCreature, LoreDatabase, LoreEntry } from "../types";

const safeJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const publicEntry = (entry: LoreEntry) => ({
  id: entry.id,
  title: entry.title,
  category: entry.category,
  type: entry.type,
  status: entry.status,
  spoilerLevel: entry.spoilerLevel,
  tags: entry.tags,
  summary: entry.summary,
  publicDescription: entry.publicDescription,
  internalLore: entry.internalLore,
  fields: entry.fields,
  connections: entry.connections,
  linkedStoryReferenceIds: entry.linkedStoryReferenceIds,
  notes: entry.notes,
  timeline: entry.timeline,
  secret: entry.secret,
  wiki: entry.wiki,
  media: {
    iconImage: entry.media.iconImage,
    mainImage: entry.media.mainImage,
    characterPortrait: entry.media.characterPortrait,
    characterHoverImage: entry.media.characterHoverImage,
    ingameSpriteImage: entry.media.ingameSpriteImage,
    dialogueSpriteImage: entry.media.dialogueSpriteImage,
    galleryImages: entry.media.galleryImages,
    videoLinks: entry.media.videoLinks,
    mediaNotes: entry.media.mediaNotes
  },
  updatedAt: entry.updatedAt
});

const publicCreature = (creature: BestiaryCreature) => ({
  id: creature.id,
  name: creature.name,
  type: creature.type,
  image: creature.image,
  hoverImage: creature.hoverImage,
  status: creature.status,
  threatLevel: creature.threatLevel,
  rarity: creature.rarity,
  size: creature.size,
  diet: creature.diet,
  habitat: creature.habitat,
  behavior: creature.behavior,
  description: creature.description,
  overview: creature.overview,
  fieldNotes: creature.fieldNotes,
  stats: creature.stats,
  drops: creature.drops,
  habitatInfo: creature.habitatInfo,
  lore: creature.lore,
  productionNotes: creature.productionNotes,
  linkedStoryReferenceIds: creature.linkedStoryReferenceIds,
  updatedAt: creature.updatedAt
});

const sharedViews = [
  ...mainNavigation.filter((item) => item.id !== "settings" && item.id !== "search"),
  ...dashboardBoxes.filter(
    (box, index, boxes) =>
      !mainNavigation.some((item) => item.id === box.id) &&
      boxes.findIndex((item) => item.id === box.id) === index
  )
].map((view) => ({
  id: view.id,
  label: view.label,
  description: view.description,
  category: view.category,
  icon: view.icon
}));

export const createShareableHtml = (database: LoreDatabase) => {
  const shareData = {
    title: "The Tavern Cook Book",
    studio: database.branding.studioName,
    game: "Tales of the Tavern",
    exportedAt: new Date().toISOString(),
    logoImage: database.branding.logoImage,
    entries: database.entries.map(publicEntry),
    bestiary: (database.bestiary || []).map(publicCreature),
    worldBuilding: database.worldBuilding,
    storyReferences: database.storyReferences,
    glossaryTerms: database.glossaryTerms,
    views: sharedViews,
    dashboardBoxes: dashboardBoxes
      .filter((box) => box.id !== "settings")
      .map((box) => ({
        id: box.id,
        label: box.label,
        description: box.description,
        category: box.category,
        icon: box.icon
      })),
    hubSections
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Tavern Cook Book - Read-Only Share</title>
  <style>
    :root {
      --app-bg: #e7d0a4;
      --app-ink: #2b1c12;
      --muted-ink: #6d5438;
      --panel-bg: rgba(245, 224, 184, 0.94);
      --panel-border: #a97734;
      --panel-shadow: 0 18px 38px rgba(63, 35, 14, 0.2), inset 0 1px rgba(255, 244, 210, 0.46);
      --card-bg: rgba(251, 235, 200, 0.94);
      --card-border: rgba(124, 79, 29, 0.36);
      --card-frame: linear-gradient(135deg, rgba(250, 232, 194, 0.96), rgba(226, 190, 124, 0.9));
      --button-bg: #6f3824;
      --button-border: #a76f32;
      --modal-bg: rgba(250, 233, 199, 0.98);
      --modal-frame: #7d4b25;
      --sidebar-frame: linear-gradient(180deg, #5f321f 0%, #332018 100%);
      --field-bg: rgba(255, 239, 205, 0.7);
      --gold: #c98b2f;
      --teal: #2b695f;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    }
    .dream {
      --app-bg: #101728;
      --app-ink: #f4e8ce;
      --muted-ink: #bcae93;
      --panel-bg: rgba(28, 31, 50, 0.9);
      --panel-border: #8c6a9a;
      --panel-shadow: 0 18px 42px rgba(0, 0, 0, 0.36);
      --card-bg: rgba(31, 35, 56, 0.92);
      --card-border: rgba(215, 171, 91, 0.26);
      --card-frame: linear-gradient(135deg, rgba(36, 42, 68, 0.96), rgba(48, 31, 60, 0.92));
      --button-bg: #b97236;
      --button-border: #f0c16d;
      --modal-bg: rgba(21, 26, 43, 0.98);
      --modal-frame: #bd9be0;
      --sidebar-frame: linear-gradient(180deg, #171f38 0%, #2a1a35 100%);
      --field-bg: rgba(255, 255, 255, 0.08);
    }
    * { box-sizing: border-box; min-width: 0; }
    html, body { min-height: 100%; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 16% 6%, rgba(255, 199, 108, 0.34), transparent 30%),
        radial-gradient(circle at 86% 12%, rgba(129, 67, 32, 0.18), transparent 34%),
        linear-gradient(135deg, rgba(74, 38, 18, 0.08), transparent 44%),
        var(--app-bg);
      color: var(--app-ink);
      letter-spacing: 0;
      overflow-x: hidden;
    }
    button, input, select { font: inherit; }
    button { color: inherit; }
    h1, h2, h3, h4, p { overflow-wrap: anywhere; word-break: break-word; }
    h1, h2, h3, h4 { font-family: Georgia, Cambria, "Times New Roman", serif; margin: 0; line-height: 1.08; }
    p { margin: 0; line-height: 1.6; }
    .app-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      background:
        radial-gradient(circle at 18% 0%, rgba(255, 211, 134, 0.22), transparent 30%),
        radial-gradient(circle at 96% 8%, rgba(117, 60, 27, 0.18), transparent 34%),
        linear-gradient(120deg, rgba(255, 226, 166, 0.16), transparent 46%),
        repeating-linear-gradient(90deg, rgba(91, 50, 22, 0.035), rgba(91, 50, 22, 0.035) 1px, transparent 1px, transparent 14px);
    }
    .sidebar {
      background: var(--sidebar-frame);
      color: #fff5da;
      min-height: 100vh;
      position: sticky;
      top: 0;
      align-self: start;
      display: flex;
      flex-direction: column;
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.14);
      z-index: 5;
    }
    .brand {
      min-height: 112px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    .logo, .entry-icon {
      display: grid;
      place-items: center;
      overflow: hidden;
      flex: 0 0 auto;
      border: 1px solid rgba(255, 220, 150, 0.42);
      background: rgba(255, 255, 255, 0.12);
    }
    .logo { width: 56px; height: 56px; border-radius: 8px; }
    .logo img, .entry-icon img { width: 100%; height: 100%; object-fit: cover; }
    .brand-kicker, .small-kicker {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: rgba(255, 244, 215, 0.8);
    }
    .brand-title { font-size: 25px; color: #fff; }
    .nav {
      padding: 14px 12px;
      overflow-y: auto;
      display: grid;
      gap: 6px;
    }
    .nav-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: rgba(255, 244, 215, 0.84);
      padding: 10px 12px;
      text-align: left;
      cursor: pointer;
    }
    .nav-button:hover, .nav-button.active { background: rgba(255, 255, 255, 0.16); color: #fff; }
    .nav-icon { width: 24px; text-align: center; flex: 0 0 auto; }
    .nav-label { flex: 1; white-space: normal; }
    .nav-count { border: 1px solid rgba(255,255,255,.2); border-radius: 999px; padding: 1px 7px; font-size: 12px; }
    .main { min-width: 0; }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 4;
      margin: 16px 24px 0;
      min-height: 72px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      box-shadow: var(--panel-shadow);
      backdrop-filter: blur(8px);
    }
    .mobile-menu { display: none; }
    .top-title { flex: 1; }
    .top-title h1 { font-size: 28px; }
    .field {
      background: var(--field-bg);
      border: 1px solid color-mix(in srgb, var(--panel-border) 62%, transparent);
      color: var(--app-ink);
      border-radius: 8px;
      padding: 10px 12px;
      max-width: 100%;
    }
    .search { width: min(380px, 42vw); }
    .button {
      background: var(--button-bg);
      border: 1px solid var(--button-border);
      color: #fff7df;
      border-radius: 8px;
      padding: 10px 13px;
      cursor: pointer;
      box-shadow: inset 0 1px rgba(255, 255, 255, 0.18), 0 8px 18px rgba(0, 0, 0, 0.16);
      white-space: normal;
    }
    .content { padding: 24px; display: grid; gap: 24px; }
    .panel, .hero, .soft-panel {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      box-shadow: var(--panel-shadow);
      border-radius: 8px;
    }
    .hero { padding: 20px; }
    .hero-grid { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); }
    .title { font-size: clamp(34px, 5vw, 58px); }
    .muted { color: var(--muted-ink); }
    .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .stat, .focus-item, .need-item, .field-block {
      border: 1px solid var(--card-border);
      background: var(--field-bg);
      border-radius: 8px;
      padding: 12px;
      overflow: hidden;
    }
    .stat-number { font-family: Georgia, Cambria, "Times New Roman", serif; font-size: 32px; line-height: 1; }
    .section-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr) minmax(280px, 340px); }
    .mini-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .hub-grid, .entry-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }
    .hub-card, .entry-card {
      background: var(--card-frame);
      border: 1px solid var(--card-border);
      box-shadow: var(--panel-shadow);
      border-radius: 8px;
      padding: 16px;
      text-align: left;
      cursor: pointer;
      min-height: 168px;
      overflow: hidden;
      width: 100%;
    }
    .hub-card:hover, .entry-card:hover { transform: translateY(-2px); }
    .hub-top, .entry-top { display: flex; align-items: flex-start; gap: 12px; }
    .hub-icon, .entry-icon {
      width: 52px;
      height: 52px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      background: var(--field-bg);
      display: grid;
      place-items: center;
      color: var(--app-ink);
    }
    .entry-card { min-height: 234px; display: flex; flex-direction: column; gap: 13px; }
    .entry-main { flex: 1; }
    .entry-title { font-size: 22px; margin-top: 10px; }
    .entry-summary {
      margin-top: 8px;
      color: var(--muted-ink);
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .badge {
      border: 1px solid var(--card-border);
      border-radius: 999px;
      padding: 3px 8px;
      color: var(--muted-ink);
      font-size: 12px;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .subnav { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
    .timeline-row {
      display: grid;
      grid-template-columns: 190px minmax(0, 1fr);
      gap: 12px;
      border: 1px solid var(--card-border);
      background: var(--field-bg);
      border-radius: 8px;
      padding: 12px;
      text-align: left;
      cursor: pointer;
    }
    .secret-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
    .modal {
      border: 1px solid var(--modal-frame);
      background: var(--modal-bg);
      color: var(--app-ink);
      border-radius: 8px;
      width: min(1100px, calc(100vw - 28px));
      max-height: calc(100vh - 28px);
      padding: 0;
      box-shadow: 0 28px 80px rgba(0, 0, 0, 0.36);
    }
    .modal::backdrop { background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(4px); }
    .modal-head {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
      padding: 16px;
    }
    .modal-body {
      padding: 18px;
      overflow-y: auto;
      max-height: calc(100vh - 132px);
    }
    .field-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .field-block { white-space: pre-wrap; overflow-wrap: anywhere; }
    .field-label {
      display: block;
      color: var(--muted-ink);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 8px;
    }
    .gallery { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); margin-top: 12px; }
    .gallery img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid var(--card-border);
    }
    .empty { padding: 28px; text-align: center; }
    .hide { display: none !important; }
    @media (max-width: 980px) {
      .app-shell { grid-template-columns: 1fr; }
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: min(310px, 86vw);
        transform: translateX(-105%);
        transition: transform .2s ease;
      }
      .sidebar.open { transform: translateX(0); }
      .mobile-menu { display: inline-block; }
      .topbar { margin: 12px; }
      .content { padding: 12px; }
      .hero-grid, .section-grid { grid-template-columns: 1fr; }
      .search { width: 100%; }
      .topbar { flex-wrap: wrap; }
      .top-title { min-width: 220px; }
    }
    @media (max-width: 620px) {
      .stats, .mini-grid { grid-template-columns: 1fr; }
      .timeline-row { grid-template-columns: 1fr; }
      .modal-head { flex-wrap: wrap; }
      .entry-grid, .hub-grid, .subnav, .secret-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app-shell" id="root">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="logo" id="logo">TCB</div>
        <div>
          <div class="brand-kicker" id="studio"></div>
          <h1 class="brand-title">The Tavern Cook Book</h1>
          <p class="brand-kicker">Tales of the Tavern</p>
        </div>
      </div>
      <nav class="nav" id="nav"></nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <button class="button mobile-menu" id="menuButton">Menu</button>
        <div class="top-title">
          <div class="small-kicker muted">Read-only share snapshot</div>
          <h1>The Tavern Cook Book</h1>
        </div>
        <input class="field search" id="search" type="search" placeholder="Search the Cook Book" />
        <select class="field" id="themeSelect" title="Theme">
          <option value="light">Cozy Tavern Mode</option>
          <option value="dream">Dream Tavern Mode</option>
        </select>
      </header>
      <section class="content" id="content"></section>
    </main>
  </div>

  <dialog class="modal" id="modal">
    <div class="modal-head">
      <div class="entry-icon" id="modalIcon">TCB</div>
      <div style="flex: 1;">
        <p class="muted" id="modalMeta"></p>
        <h2 id="modalTitle"></h2>
      </div>
      <button class="button" id="modalClose">Close</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </dialog>

  <script id="cookbook-data" type="application/json">${safeJson(shareData)}</script>
  <script>
    const data = JSON.parse(document.getElementById("cookbook-data").textContent);
    const state = { view: "dashboard", query: "", timelineMode: "trueTimeline" };
    const content = document.getElementById("content");
    const nav = document.getElementById("nav");
    const sidebar = document.getElementById("sidebar");
    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modalTitle");
    const modalMeta = document.getElementById("modalMeta");
    const modalBody = document.getElementById("modalBody");
    const modalIcon = document.getElementById("modalIcon");

    document.getElementById("studio").textContent = data.studio;
    if (data.logoImage) document.getElementById("logo").innerHTML = '<img alt="' + escapeHtml(data.studio) + '" src="' + data.logoImage + '" />';
    document.getElementById("menuButton").addEventListener("click", () => sidebar.classList.toggle("open"));
    document.getElementById("modalClose").addEventListener("click", () => modal.close());
    document.getElementById("themeSelect").addEventListener("change", event => {
      document.body.classList.toggle("dream", event.target.value === "dream");
    });
    document.getElementById("search").addEventListener("input", event => {
      state.query = event.target.value.trim().toLowerCase();
      if (state.query) state.view = "search";
      render();
    });

    function renderNav() {
      nav.innerHTML = data.views.map(view => {
        const count = view.category ? entriesForView(view.id).length : "";
        return '<button class="nav-button ' + (state.view === view.id ? "active" : "") + '" data-view="' + escapeAttr(view.id) + '">' +
          '<span class="nav-icon">' + iconText(view.label) + '</span>' +
          '<span class="nav-label">' + escapeHtml(view.label) + '</span>' +
          (count === "" ? "" : '<span class="nav-count">' + count + '</span>') +
        '</button>';
      }).join("");
      nav.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => {
          state.view = button.dataset.view;
          state.query = "";
          document.getElementById("search").value = "";
          sidebar.classList.remove("open");
          render();
        });
      });
    }

    function render() {
      renderNav();
      if (state.view === "dashboard") renderDashboard();
      else if (state.view === "search") renderEntryPage('Search Results for "' + state.query + '"', searchEntries(), "Search across all public snapshot fields.");
      else if (state.view === "timeline") renderTimeline();
      else if (state.view === "secrets") renderSecrets();
      else if (state.view === "bestiary") renderBestiary();
      else renderHubPage();
      wireEntryButtons();
      wireViewButtons();
    }

    function renderDashboard() {
      const entries = data.entries;
      const unresolved = entries.filter(entry => entry.notes?.unresolved || entry.status === "Needs Rewrite");
      const recent = [...entries].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))).slice(0, 6);
      const stats = [
        ["Total Entries", entries.length],
        ["Canon Entries", entries.filter(entry => entry.status === "Canon").length],
        ["Soft Canon Entries", entries.filter(entry => entry.status === "Soft Canon").length],
        ["Needs Rewrite", entries.filter(entry => entry.status === "Needs Rewrite").length],
        ["Old / Scrapped", entries.filter(entry => entry.status === "Old Version" || entry.status === "Scrapped").length],
        ["Unresolved Questions", unresolved.length]
      ];
      content.innerHTML =
        '<section class="hero"><div class="hero-grid"><div>' +
          '<p class="small-kicker muted">' + escapeHtml(data.studio) + ' / ' + escapeHtml(data.game) + '</p>' +
          '<h2 class="title">The Tavern Cook Book</h2>' +
          '<p class="muted" style="margin-top: 12px;">A read-only lore bible, story database, quest tracker, recipe book, wiki, and production reference for Tales of the Tavern.</p>' +
        '</div><div class="stats">' +
          stats.map(([label, value]) => '<div class="stat"><div class="stat-number">' + value + '</div><p class="small-kicker muted">' + escapeHtml(label) + '</p></div>').join("") +
        '</div></div></section>' +
        '<section class="section-grid"><div class="soft-panel" style="padding:16px;"><h3>Current Focus</h3><div class="mini-grid" style="margin-top:12px;">' +
          ["Whisker Woods Vertical Slice", "Act 1 Story", "Cooking & Recipe System", "Lillia / Dark Culinary Arts Arc", "Tohm Kyatt Redemption Arc"].map(item => '<div class="focus-item"><strong>' + escapeHtml(item) + '</strong></div>').join("") +
        '</div></div><div class="soft-panel" style="padding:16px;"><h3>Needs Attention</h3><div style="display:grid; gap:8px; margin-top:12px;">' +
          (unresolved.slice(0, 5).map(entry => '<button class="need-item entry-link" data-id="' + escapeAttr(entry.id) + '"><strong>' + escapeHtml(entry.title) + '</strong><p class="muted">' + escapeHtml(entry.status) + '</p></button>').join("") || '<p class="muted">Nothing flagged right now.</p>') +
        '</div></div></section>' +
        '<section><h3 style="margin-bottom:12px;">Cook Book Hubs</h3><div class="hub-grid">' +
          data.dashboardBoxes.map(box => hubCard(box)).join("") +
        '</div></section>' +
        '<section class="soft-panel" style="padding:16px;"><h3>Recently Edited</h3><div class="hub-grid" style="margin-top:12px;">' +
          recent.map(entry => '<button class="need-item entry-link" data-id="' + escapeAttr(entry.id) + '"><strong>' + escapeHtml(entry.title) + '</strong><p class="muted">' + escapeHtml(entry.category) + '</p></button>').join("") +
        '</div></section>';
    }

    function renderHubPage() {
      const view = data.views.find(item => item.id === state.view) || data.views[0];
      const entries = entriesForView(state.view);
      const sections = data.hubSections[state.view] || [];
      content.innerHTML =
        '<section class="hero"><p class="small-kicker muted">' + entries.length + ' entries</p><h2 class="title">' + escapeHtml(view.label) + '</h2><p class="muted" style="margin-top:10px;">' + escapeHtml(view.description || "") + '</p></section>' +
        (sections.length ? '<section class="subnav">' + sections.map(section => '<button class="hub-card view-link" data-view="' + escapeAttr(section.view) + '"><h3>' + escapeHtml(section.title) + '</h3><p class="muted" style="margin-top:8px;">' + escapeHtml(section.description) + '</p></button>').join("") + '</section>' : "") +
        entryGrid(entries);
    }

    function renderEntryPage(title, entries, description) {
      content.innerHTML = '<section class="hero"><p class="small-kicker muted">' + entries.length + ' matches</p><h2 class="title">' + escapeHtml(title) + '</h2><p class="muted" style="margin-top:10px;">' + escapeHtml(description) + '</p></section>' + entryGrid(entries);
    }

    function renderTimeline() {
      const entries = data.entries.filter(entry => entry.type === "Timeline Event" || entry.timeline);
      const modes = [["trueTimeline", "True Timeline"], ["playerTimeline", "Player Timeline"], ["questTimeline", "Quest Timeline"], ["emotionalTimeline", "Emotional Timeline"]];
      content.innerHTML =
        '<section class="hero"><h2 class="title">Timeline</h2><div class="badges" style="margin-top:12px;">' +
          modes.map(([key, label]) => '<button class="badge timeline-mode" data-mode="' + key + '">' + escapeHtml(label) + '</button>').join("") +
        '</div></section><section class="soft-panel" style="padding:16px; display:grid; gap:10px;">' +
          entries.map(entry => '<button class="timeline-row entry-link" data-id="' + escapeAttr(entry.id) + '"><strong class="muted">' + escapeHtml(entry.timeline?.era || "Unplaced") + '</strong><span><strong>' + escapeHtml(entry.title) + '</strong><p>' + escapeHtml(plainText(entry.timeline?.[state.timelineMode] || entry.summary)) + '</p></span></button>').join("") +
        '</section>';
      content.querySelectorAll(".timeline-mode").forEach(button => {
        button.addEventListener("click", () => {
          state.timelineMode = button.dataset.mode;
          renderTimeline();
          wireEntryButtons();
        });
      });
    }

    function renderSecrets() {
      const secrets = data.entries.filter(entry => entry.type === "Secret" || entry.secret);
      content.innerHTML =
        '<section class="hero"><h2 class="title">Secrets / Who Knows What</h2><p class="muted" style="margin-top:10px;">Canon facts, who knows, who suspects, and when the player learns.</p></section>' +
        '<section class="secret-grid">' + secrets.map(entry => '<button class="hub-card entry-link" data-id="' + escapeAttr(entry.id) + '"><h3>' + escapeHtml(entry.title.replace("Secret: ", "")) + '</h3><p style="margin-top:10px;">' + escapeHtml(plainText(entry.secret?.trueFact || entry.summary)) + '</p><div class="badges" style="margin-top:12px;"><span class="badge">' + escapeHtml(entry.spoilerLevel) + '</span><span class="badge">Known by: ' + escapeHtml((entry.secret?.knownBy || []).join(", ")) + '</span></div></button>').join("") + '</section>';
    }

    function renderBestiary() {
      const creatures = data.bestiary || [];
      content.innerHTML =
        '<section class="hero"><p class="small-kicker muted">' + creatures.length + ' creatures</p><h2 class="title">Bestiary</h2><p class="muted" style="margin-top:10px;">Creatures, monsters, and beasts that roam the world.</p></section>' +
        '<section class="entry-grid">' + creatures.map(creature => '<button class="entry-card creature-link" data-id="' + escapeAttr(creature.id) + '"><div class="entry-top"><div class="entry-icon">' + (creature.image ? '<img alt="" src="' + escapeAttr(creature.image) + '" />' : 'BT') + '</div><div class="entry-main"><div class="badges"><span class="badge">' + escapeHtml(creature.threatLevel || "Unknown") + '</span><span class="badge">' + escapeHtml(creature.status || "WIP") + '</span></div><h3 class="entry-title">' + escapeHtml(creature.name) + '</h3><p class="muted">' + escapeHtml((creature.type || "Creature") + " / " + (creature.habitat || "Unknown")) + '</p></div></div><p class="entry-summary">' + escapeHtml(plainText(creature.description || creature.overview || "No description yet.")) + '</p></button>').join("") + '</section>';
      content.querySelectorAll(".creature-link").forEach(button => {
        button.addEventListener("click", () => openCreature(button.dataset.id));
      });
    }

    function entryGrid(entries) {
      if (!entries.length) return '<section class="panel empty"><h3>No entries found</h3><p class="muted">Try another section or search term.</p></section>';
      return '<section class="entry-grid">' + entries.map(entryCard).join("") + '</section>';
    }

    function entryCard(entry) {
      const image = entry.media?.characterPortrait || entry.media?.iconImage || entry.media?.mainImage;
      return '<button class="entry-card entry-link" data-id="' + escapeAttr(entry.id) + '">' +
        '<div class="entry-top"><div class="entry-icon">' + (image ? '<img alt="" src="' + image + '" />' : 'TCB') + '</div><div class="entry-main">' +
        '<div class="badges"><span class="badge">' + escapeHtml(entry.status) + '</span><span class="badge">' + escapeHtml(entry.spoilerLevel) + '</span></div>' +
        '<h3 class="entry-title">' + escapeHtml(entry.title) + '</h3><p class="muted">' + escapeHtml(entry.category + " / " + entry.type) + '</p></div></div>' +
        '<p class="entry-summary">' + escapeHtml(plainText(entry.summary || entry.publicDescription || entry.internalLore || "No summary yet.")) + '</p>' +
        '<div class="badges">' + (entry.tags || []).slice(0, 5).map(tag => '<span class="badge">' + escapeHtml(tag) + '</span>').join("") + '</div>' +
      '</button>';
    }

    function hubCard(box) {
      return '<button class="hub-card view-link" data-view="' + escapeAttr(box.id) + '"><div class="hub-top"><div class="hub-icon">' + iconText(box.label) + '</div><div><h3>' + escapeHtml(box.label) + '</h3><p class="muted" style="margin-top:8px;">' + escapeHtml(box.description) + '</p></div></div><p style="margin-top:14px;"><strong>' + entriesForView(box.id).length + ' entries</strong></p></button>';
    }

    function entriesForView(view) {
      if (view === "bestiary") return data.bestiary || [];
      if (view === "recipes") return data.entries.filter(entry => /recipe|meal|menu|dish|broth|tonic|ale|drink|consumable|food magic|food item/i.test(entry.type));
      if (view === "ingredients") return data.entries.filter(entry => /ingredient|drop|substitute/i.test(entry.type));
      if (view === "items") return data.entries.filter(entry => /item|artifact|tool|collectible/i.test(entry.type));
      if (view === "enemies") return data.entries.filter(entry => entry.category === "Enemies & Creatures");
      if (view === "timeline") return data.entries.filter(entry => entry.type === "Timeline Event" || entry.timeline);
      if (view === "secrets") return data.entries.filter(entry => entry.type === "Secret" || entry.secret);
      if (view === "factions") return data.entries.filter(entry => /Faction|Culture|Cult/i.test(entry.type));
      const config = data.views.find(item => item.id === view);
      return config?.category ? data.entries.filter(entry => entry.category === config.category) : data.entries;
    }

    function searchEntries() {
      if (!state.query) return [];
      return data.entries.filter(entry => JSON.stringify(entry).toLowerCase().includes(state.query));
    }

    function openEntry(id) {
      const entry = data.entries.find(item => item.id === id);
      if (!entry) return;
      const image = entry.media?.characterPortrait || entry.media?.iconImage || entry.media?.mainImage;
      modalIcon.innerHTML = image ? '<img alt="" src="' + image + '" />' : "TCB";
      modalTitle.textContent = entry.title;
      modalMeta.textContent = entry.category + " / " + entry.type + " / " + entry.status + " / " + entry.spoilerLevel;
      const blocks = [
        ["Summary", entry.summary],
        ["Public Description", entry.publicDescription],
        ["Internal Lore", entry.internalLore],
        ["Tags", (entry.tags || []).join(", ")],
        ["Custom Fields", pretty(entry.fields)],
        ["Connections", pretty(entry.connections)],
        ["Art Notes", entry.notes?.art],
        ["Gameplay Notes", entry.notes?.gameplay],
        ["Production Notes", entry.notes?.production],
        ["Marketing Notes", entry.notes?.marketing],
        ["Unresolved Questions", entry.notes?.unresolved],
        ["Timeline", pretty(entry.timeline)],
        ["Secret", pretty(entry.secret)],
        ["Wiki", pretty(entry.wiki)],
        ["Video Links", (entry.media?.videoLinks || []).join("\\n")]
      ].filter(([, value]) => value && value !== "{}");
      const gallery = [
        entry.media?.characterPortrait,
        entry.media?.characterHoverImage,
        entry.media?.ingameSpriteImage,
        entry.media?.dialogueSpriteImage,
        entry.media?.mainImage,
        ...(entry.media?.galleryImages || [])
      ].filter(Boolean);
      modalBody.innerHTML = '<div class="field-grid">' + blocks.map(([label, value]) => '<div class="field-block"><span class="field-label">' + escapeHtml(label) + '</span>' + escapeHtml(plainText(value)) + '</div>').join("") + '</div>' + (gallery.length ? '<div class="gallery">' + gallery.map(src => '<img alt="" src="' + src + '" />').join("") + '</div>' : "");
      modal.showModal();
    }

    function openCreature(id) {
      const creature = (data.bestiary || []).find(item => item.id === id);
      if (!creature) return;
      modalIcon.innerHTML = creature.image ? '<img alt="" src="' + escapeAttr(creature.image) + '" />' : "BT";
      modalTitle.textContent = creature.name;
      modalMeta.textContent = (creature.type || "Creature") + " / " + (creature.threatLevel || "Unknown") + " / " + (creature.habitat || "Unknown");
      const blocks = [
        ["Description", creature.description],
        ["Overview", creature.overview],
        ["Size", creature.size],
        ["Diet", creature.diet],
        ["Behavior", creature.behavior],
        ["Field Notes", creature.fieldNotes],
        ["Stats", pretty(creature.stats)],
        ["Drops", pretty(creature.drops)],
        ["Habitat", pretty(creature.habitatInfo)],
        ["Lore", pretty(creature.lore)],
        ["Production Notes", creature.productionNotes]
      ].filter(([, value]) => value && value !== "{}");
      modalBody.innerHTML = '<div class="field-grid">' + blocks.map(([label, value]) => '<div class="field-block"><span class="field-label">' + escapeHtml(label) + '</span>' + escapeHtml(plainText(value)) + '</div>').join("") + '</div>';
      modal.showModal();
    }

    function wireEntryButtons() {
      content.querySelectorAll(".entry-link").forEach(button => {
        button.addEventListener("click", () => openEntry(button.dataset.id));
      });
    }

    function wireViewButtons() {
      content.querySelectorAll(".view-link").forEach(button => {
        button.addEventListener("click", () => {
          state.view = button.dataset.view;
          sidebar.classList.remove("open");
          render();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }

    function iconText(label) {
      return String(label || "TCB").split(/\\s+/).slice(0, 2).map(word => word[0] || "").join("").toUpperCase();
    }
    function pretty(value) {
      if (!hasValue(value)) return "";
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
      if (Array.isArray(value)) return value.filter(hasValue).map(item => pretty(item)).filter(Boolean).join(", ");
      if (typeof value === "object") {
        return Object.entries(value)
          .filter(([, item]) => hasValue(item))
          .map(([key, item]) => humanLabel(key) + ": " + pretty(item))
          .join("\\n");
      }
      return String(value);
    }
    function hasValue(value) {
      if (value == null || value === "") return false;
      if (Array.isArray(value)) return value.some(hasValue);
      if (typeof value === "object") return Object.values(value).some(hasValue);
      return true;
    }
    function humanLabel(value) {
      return String(value)
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, char => char.toUpperCase());
    }
    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
    }
    function plainText(value) {
      const text = String(value ?? "");
      if (!/<\\/?(strong|b|em|i|u|span|font|h2|h3|h4|p|div|br|ul|ol|li)(\\s|>|\\/)/i.test(text)) return text;
      const holder = document.createElement("div");
      holder.innerHTML = text.replace(/<br\\s*\\/?>/gi, "\\n").replace(/<\\/(p|div|h2|h3|h4|li)>/gi, "\\n");
      return (holder.textContent || "").replace(/\\n{3,}/g, "\\n\\n").trim();
    }
    function escapeAttr(value) {
      return escapeHtml(value).replace(/\\n/g, " ");
    }
    render();
  </script>
</body>
</html>`;
};
