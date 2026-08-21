import { useEffect, useMemo, useState } from "react";
import type {
  CombatAttack,
  BestiaryCreature,
  CombatBoss,
  CombatBossType,
  CombatData,
  CombatEnemy,
  CombatMediaKind,
  CombatMediaReference,
  CombatPhase,
  CombatProductionStatus,
  GoogleAccountUser
} from "../types";
import {
  combatBossProgress,
  combatDisciplines,
  combatProductionStatuses,
  createBlankAttack,
  createBlankBoss,
  createBlankPhase,
  createCombatId,
  normalizeCombatAttack,
  normalizeCombatBoss,
  normalizeCombatData,
  normalizeCombatPhase,
  productionStatusPercent
} from "../utils/combat";
import { AssignableModule } from "./AssignmentSystem";
import { CustomSelect } from "./CustomSelect";
import { DriveAwareImage } from "./DriveAwareImage";
import { Icon } from "./Icon";
import { ImageManagerModal, type ImageManagerSlotDraft } from "./ImageManagerModal";

interface CombatPageProps {
  combat?: CombatData;
  bestiary: BestiaryCreature[];
  readOnly: boolean;
  currentUser: GoogleAccountUser;
  onCombatChange: (combat: CombatData) => void;
  focusRoute?: string;
}

type CombatSection = "home" | "bosses" | "enemies";
type BossTab = "Overview" | "Moveset" | "Animation" | "Balance" | "References";
type ModalState = { type: "boss"; draft: CombatBoss } | { type: "phase"; bossId: string; draft: CombatPhase } | { type: "attack"; bossId: string; phaseId: string; draft: CombatAttack } | null;
type MediaTarget = { type: "boss"; bossId: string } | { type: "phase"; bossId: string; phaseId: string } | { type: "attack"; bossId: string; phaseId: string; attackId: string } | null;

const bossTypes: CombatBossType[] = ["Main Boss", "Mini Boss", "Elite Encounter", "Tutorial Boss"];
const bossTabs: BossTab[] = ["Overview", "Moveset", "Animation", "Balance", "References"];
const responseOptions = ["Jump", "Dodge", "Block", "Parry", "Move behind boss", "Leave marked area"];
const mediaKinds: CombatMediaKind[] = ["Rough Sketch", "Storyboard", "Keyframe", "Animation Reference", "Final Animation", "VFX Reference", "In-Game Capture", "Hitbox Reference"];

export function CombatPage({ combat, bestiary, readOnly, currentUser, onCombatChange, focusRoute = "" }: CombatPageProps) {
  const normalized = useMemo(() => normalizeCombatData(combat), [combat]);
  const [section, setSection] = useState<CombatSection>("home");
  const [selectedBossId, setSelectedBossId] = useState("");
  const [selectedEnemyId, setSelectedEnemyId] = useState("");
  const [selectedAttack, setSelectedAttack] = useState<{ phaseId: string; attackId: string } | null>(null);
  const [bossTab, setBossTab] = useState<BossTab>("Moveset");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [enemyFilter, setEnemyFilter] = useState("All Insects");
  const [enemyQuery, setEnemyQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [mediaTarget, setMediaTarget] = useState<MediaTarget>(null);

  useEffect(() => {
    if (!focusRoute.startsWith("combat:")) return;
    const [, bossId, phaseId, attackId] = focusRoute.split(":");
    if (bossId === "enemy") {
      setSection("enemies");
      setSelectedEnemyId(phaseId || "");
      setSelectedBossId("");
      setSelectedAttack(null);
      return;
    }
    setSection("bosses");
    setSelectedBossId(bossId || "");
    setSelectedAttack(phaseId && attackId ? { phaseId, attackId } : null);
    setBossTab("Moveset");
  }, [focusRoute]);

  useEffect(() => {
    const openCombatHome = () => {
      setSection("home");
      setSelectedBossId("");
      setSelectedEnemyId("");
      setSelectedAttack(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("tavern:combat-home", openCombatHome);
    return () => window.removeEventListener("tavern:combat-home", openCombatHome);
  }, []);

  const selectedBoss = normalized.bosses.find((boss) => boss.id === selectedBossId) || null;
  const selectedEnemy = normalized.enemies.find((enemy) => enemy.id === selectedEnemyId) || null;
  const selectedPhase = selectedBoss && selectedAttack ? selectedBoss.phases.find((phase) => phase.id === selectedAttack.phaseId) || null : null;
  const attack = selectedPhase && selectedAttack ? selectedPhase.attacks.find((item) => item.id === selectedAttack.attackId) || null : null;

  const saveCombat = (next: CombatData) => onCombatChange(normalizeCombatData({ ...next, updatedAt: new Date().toISOString() }));
  const updateBoss = (boss: CombatBoss) => saveCombat({
    ...normalized,
    bosses: normalized.bosses.some((item) => item.id === boss.id)
      ? normalized.bosses.map((item) => item.id === boss.id ? normalizeCombatBoss({ ...boss, updatedAt: new Date().toISOString() }) : item)
      : [normalizeCombatBoss(boss), ...normalized.bosses]
  });
  const updatePhase = (bossId: string, phase: CombatPhase) => {
    const boss = normalized.bosses.find((item) => item.id === bossId);
    if (!boss) return;
    updateBoss({ ...boss, phases: boss.phases.some((item) => item.id === phase.id) ? boss.phases.map((item) => item.id === phase.id ? normalizeCombatPhase(phase) : item) : [...boss.phases, normalizeCombatPhase(phase)] });
  };
  const updateAttack = (bossId: string, phaseId: string, nextAttack: CombatAttack) => {
    const boss = normalized.bosses.find((item) => item.id === bossId);
    const phase = boss?.phases.find((item) => item.id === phaseId);
    if (!boss || !phase) return;
    const stamped = normalizeCombatAttack({
      ...nextAttack,
      updatedAt: new Date().toISOString(),
      history: [...nextAttack.history, { id: createCombatId("history"), message: "Attack updated", createdAt: new Date().toISOString() }].slice(-40)
    });
    updatePhase(bossId, { ...phase, attacks: phase.attacks.some((item) => item.id === stamped.id) ? phase.attacks.map((item) => item.id === stamped.id ? stamped : item) : [...phase.attacks, stamped] });
  };

  const openBoss = (bossId: string) => { setSelectedBossId(bossId); setSelectedAttack(null); setBossTab("Moveset"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openEnemy = (enemyId: string) => { setSelectedEnemyId(enemyId); setSelectedBossId(""); setSelectedAttack(null); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="combat-page">
      {attack && selectedBoss && selectedPhase ? (
        <AttackWorkspace attack={attack} boss={selectedBoss} phase={selectedPhase} readOnly={readOnly} currentUser={currentUser} onBack={() => setSelectedAttack(null)} onOpenBossTab={(tab) => { setSelectedAttack(null); setBossTab(tab); }} onOpenAttack={(phaseId, attackId) => setSelectedAttack({ phaseId, attackId })} onEdit={() => setModal({ type: "attack", bossId: selectedBoss.id, phaseId: selectedPhase.id, draft: structuredClone(attack) })} onManageMedia={() => setMediaTarget({ type: "attack", bossId: selectedBoss.id, phaseId: selectedPhase.id, attackId: attack.id })} onSave={(next) => updateAttack(selectedBoss.id, selectedPhase.id, next)} />
      ) : selectedBoss ? (
        <BossWorkspace boss={selectedBoss} tab={bossTab} readOnly={readOnly} onBack={() => setSelectedBossId("")} onTabChange={setBossTab} onEdit={() => setModal({ type: "boss", draft: structuredClone(selectedBoss) })} onManageMedia={() => setMediaTarget({ type: "boss", bossId: selectedBoss.id })} onAddPhase={() => setModal({ type: "phase", bossId: selectedBoss.id, draft: createBlankPhase(selectedBoss.phases.length) })} onEditPhase={(phase) => setModal({ type: "phase", bossId: selectedBoss.id, draft: structuredClone(phase) })} onManagePhaseMedia={(phase) => setMediaTarget({ type: "phase", bossId: selectedBoss.id, phaseId: phase.id })} onDeletePhase={(phaseId) => deletePhase(selectedBoss, phaseId, updateBoss)} onMovePhase={(phaseId, direction) => updateBoss({ ...selectedBoss, phases: reorder(selectedBoss.phases, phaseId, direction) })} onAddAttack={(phase) => setModal({ type: "attack", bossId: selectedBoss.id, phaseId: phase.id, draft: createBlankAttack(phase.attacks.length) })} onEditAttack={(phase, item) => setModal({ type: "attack", bossId: selectedBoss.id, phaseId: phase.id, draft: structuredClone(item) })} onOpenAttack={(phaseId, attackId) => setSelectedAttack({ phaseId, attackId })} onDeleteAttack={(phase, attackId) => deleteAttack(selectedBoss.id, phase, attackId, updatePhase)} onMoveAttack={(phase, attackId, direction) => updatePhase(selectedBoss.id, { ...phase, attacks: reorder(phase.attacks, attackId, direction) })} />
      ) : selectedEnemy ? (
        <EnemyWorkspace enemy={selectedEnemy} bestiary={bestiary} onBack={() => setSelectedEnemyId("")} />
      ) : section === "home" ? (
        <CombatHome bosses={normalized.bosses} enemies={normalized.enemies} bestiary={bestiary} onOpen={(next) => setSection(next)} onOpenBoss={openBoss} onOpenEnemy={openEnemy} />
      ) : section === "bosses" ? (
        <BossLibrary bosses={normalized.bosses} readOnly={readOnly} filter={filter} query={query} onFilter={setFilter} onQuery={setQuery} onBack={() => setSection("home")} onOpen={openBoss} onAdd={() => setModal({ type: "boss", draft: createBlankBoss() })} onDelete={(boss) => deleteBoss(boss, normalized, saveCombat)} />
      ) : (
        <EnemyLibrary enemies={normalized.enemies} bestiary={bestiary} filter={enemyFilter} query={enemyQuery} onFilter={setEnemyFilter} onQuery={setEnemyQuery} onBack={() => setSection("home")} onOpen={openEnemy} />
      )}

      {modal?.type === "boss" && <BossEditor draft={modal.draft} onChange={(draft) => setModal({ type: "boss", draft })} onCancel={() => setModal(null)} onSave={() => { updateBoss(modal.draft); setModal(null); openBoss(modal.draft.id); }} />}
      {modal?.type === "phase" && <PhaseEditor draft={modal.draft} onChange={(draft) => setModal({ ...modal, draft })} onCancel={() => setModal(null)} onSave={() => { updatePhase(modal.bossId, modal.draft); setModal(null); }} />}
      {modal?.type === "attack" && <AttackEditor draft={modal.draft} onChange={(draft) => setModal({ ...modal, draft })} onCancel={() => setModal(null)} onSave={() => { updateAttack(modal.bossId, modal.phaseId, modal.draft); setModal(null); }} />}
      {mediaTarget && <CombatMediaManager target={mediaTarget} bosses={normalized.bosses} onClose={() => setMediaTarget(null)} onSave={(boss) => { updateBoss(boss); setMediaTarget(null); }} />}
    </div>
  );
}

function CombatHome({ bosses, enemies, bestiary, onOpen, onOpenBoss, onOpenEnemy }: { bosses: CombatBoss[]; enemies: CombatEnemy[]; bestiary: BestiaryCreature[]; onOpen: (section: CombatSection) => void; onOpenBoss: (id: string) => void; onOpenEnemy: (id: string) => void }) {
  const bossCount = bosses.length;
  const bossAttacks = bosses.flatMap((boss) => boss.phases.flatMap((phase) => phase.attacks));
  const aggregate = bossAttacks.length
    ? Math.round(bossAttacks.reduce((total, attack) => total + combatDisciplines.reduce((sum, discipline) => sum + productionStatusPercent(attack.production[discipline]), 0) / combatDisciplines.length, 0) / bossAttacks.length)
    : 0;
  const categories = [
    { title: "Bosses", icon: "Crown", count: bossCount, description: "Encounter chapters, phases, movesets, production status, and implementation handoff.", action: () => onOpen("bosses"), image: bosses.find((boss) => boss.artwork?.imageUrl)?.artwork?.imageUrl, meta: `${aggregate}% production health` },
    { title: "Enemies", icon: "Skull", count: enemies.length, description: "Enemy families, elites, coordinated behaviors, attack kits, and production requirements.", action: () => onOpen("enemies"), image: enemies.map((enemy) => enemyCoverImage(enemy, bestiary)).find(Boolean), meta: `${enemies.filter((enemy) => enemy.tier === "Elite").length} elite` },
    { title: "Player Combat", icon: "ShieldAlert", count: 0, description: "Gwen's weapons, defense, movement, meals, tools, and player-facing rules.", meta: "Player discipline" },
    { title: "Combat Systems", icon: "Cog", count: 0, description: "Damage, stagger, hit reactions, targeting, AI selection, and elemental interactions.", meta: "Systems discipline" }
  ];
  const recent = [
    ...bosses.map((boss) => ({ id: boss.id, name: boss.name, kind: boss.classification, updatedAt: boss.updatedAt, image: boss.artwork?.imageUrl || "", onOpen: () => onOpenBoss(boss.id), icon: "Crown" })),
    ...enemies.map((enemy) => ({ id: enemy.id, name: enemy.name, kind: `${enemy.family} · ${enemy.tier}`, updatedAt: enemy.updatedAt, image: enemyCoverImage(enemy, bestiary), onOpen: () => onOpenEnemy(enemy.id), icon: enemy.tier === "Elite" ? "ShieldAlert" : "Bug" }))
  ].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 6);
  return <>
    <CombatHeader eyebrow="Production Library" title="Combat" description="Design and produce every combat encounter through one shared Cookbook workspace." icon="Swords" />
    <section className="combat-category-grid">
      {categories.map((category) => <button key={category.title} className="combat-category-card dashboard-category-box-frame" onClick={category.action} disabled={!category.action}>
        <span className="combat-category-visual">{category.image ? <DriveAwareImage src={category.image} alt="" /> : <Icon name={category.icon} className="h-9 w-9" />}</span>
        <span className="combat-category-copy"><small>{category.count} documents · {category.meta}</small><strong>{category.title}</strong><p>{category.description}</p><em>{category.action ? "Open department" : "Ready to expand"} <Icon name="ChevronRight" className="h-4 w-4" /></em></span>
      </button>)}
    </section>
    <section className="combat-recent-section">
      <SectionHeading eyebrow="Shared Production Activity" title="Recently Edited" />
      <div className="combat-recent-grid">{recent.map((item) => <button key={`${item.kind}-${item.id}`} onClick={item.onOpen}><span>{item.image ? <DriveAwareImage src={item.image} alt="" /> : <Icon name={item.icon} className="h-5 w-5" />}</span><div><b>{item.name}</b><small>{item.kind} · {formatUpdatedAt(item.updatedAt)}</small></div><Icon name="ChevronRight" className="h-4 w-4" /></button>)}{!recent.length && <p className="combat-muted">Combat activity will appear here as the library grows.</p>}</div>
    </section>
  </>;
}

function EnemyLibrary({ enemies, bestiary, filter, query, onFilter, onQuery, onBack, onOpen }: { enemies: CombatEnemy[]; bestiary: BestiaryCreature[]; filter: string; query: string; onFilter: (value: string) => void; onQuery: (value: string) => void; onBack: () => void; onOpen: (id: string) => void }) {
  const filters = ["All Insects", "Standard", "Elite", "In Development", "Complete"];
  const visible = enemies.filter((enemy) => {
    const matchesQuery = !query.trim() || `${enemy.name} ${enemy.family} ${enemy.tier} ${enemy.role} ${enemy.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === "All Insects" || filter === enemy.tier || (filter === "In Development" && enemy.status !== "Complete") || (filter === "Complete" && enemy.status === "Complete");
    return enemy.family === "Insects" && matchesQuery && matchesFilter;
  });
  return <>
    <div className="combat-library-heading">
      <button className="combat-icon-button" onClick={onBack} title="Back to Combat"><Icon name="ChevronLeft" className="h-5 w-5" /></button>
      <div><small>Enemy Family · Insects</small><h1 className="font-display">Insect Enemies</h1><p>Ground pressure, aerial teamwork, and elite encounter kits for Whisker Woods.</p></div>
    </div>
    <div className="combat-filter-bar">
      <label><Icon name="Search" className="h-4 w-4" /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search insect enemies" /></label>
      <div className="combat-filter-tabs">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => onFilter(item)}>{item}</button>)}</div>
    </div>
    <section className="combat-enemy-grid">{visible.map((enemy) => <EnemyCard key={enemy.id} enemy={enemy} bestiary={bestiary} onOpen={() => onOpen(enemy.id)} />)}</section>
    {!visible.length && <EmptyState title="No insect enemies match this view" description="Change the search or selected production filter." />}
  </>;
}

function EnemyCard({ enemy, bestiary, onOpen }: { enemy: CombatEnemy; bestiary: BestiaryCreature[]; onOpen: () => void }) {
  const image = enemyCoverImage(enemy, bestiary);
  const average = enemy.attacks.length ? Math.round(enemy.attacks.reduce((total, attack) => total + combatDisciplines.reduce((sum, discipline) => sum + productionStatusPercent(attack.production[discipline]), 0) / combatDisciplines.length, 0) / enemy.attacks.length) : 0;
  return <AssignableModule as="article" className={`combat-enemy-card lore-card-frame ${enemy.tier === "Elite" ? "elite" : ""}`} module={{ moduleId: `combat-enemy:${enemy.id}`, moduleTitle: enemy.name, moduleType: "combat-enemy", entryId: enemy.id, entryTitle: enemy.name, entryCategory: `Combat / Enemies / ${enemy.family}`, targetRoute: `combat:enemy:${enemy.id}` }}>
    <button onClick={onOpen}>
      <span className="combat-enemy-art">{image ? <DriveAwareImage src={image} alt={enemy.name} /> : <Icon name={enemy.tier === "Elite" ? "ShieldAlert" : "Bug"} className="h-11 w-11" />}</span>
      <span className="combat-enemy-card-copy"><small>{enemy.family} · {enemy.tier}</small><strong className="font-display">{enemy.name}</strong><em>{enemy.role}</em><p>{enemy.summary}</p></span>
      <span className="combat-card-stats"><span><b>{enemy.attacks.length}</b> moves</span><span><b>{enemy.threatLevel || "—"}</b> threat</span><span><b>{average}%</b> production</span></span>
      <span className="combat-card-progress"><i style={{ width: `${average}%` }} /></span>
    </button>
  </AssignableModule>;
}

function EnemyWorkspace({ enemy, bestiary, onBack }: { enemy: CombatEnemy; bestiary: BestiaryCreature[]; onBack: () => void }) {
  const creature = linkedBestiaryCreature(enemy, bestiary);
  const cover = enemyCoverImage(enemy, bestiary);
  const assets = creatureArtAssets(creature);
  return <main className="combat-enemy-workspace">
    <CombatBreadcrumbs items={[{ label: "Combat", onClick: onBack }, { label: "Enemies", onClick: onBack }, { label: enemy.family }, { label: enemy.name }]} />
    <header className={`combat-enemy-hero ${enemy.tier === "Elite" ? "elite" : ""}`}>
      <div className="combat-enemy-hero-art">{cover ? <DriveAwareImage src={cover} alt={enemy.name} /> : <Icon name={enemy.tier === "Elite" ? "ShieldAlert" : "Bug"} className="h-16 w-16" />}</div>
      <div><small>{enemy.family} · {enemy.tier} {enemy.tier === "Elite" ? "Encounter" : "Enemy"}</small><h1 className="font-display">{enemy.name}</h1><p>{enemy.summary}</p><div className="combat-hero-facts"><span>Role <b>{enemy.role}</b></span><span>Threat <b>{enemy.threatLevel}</b></span><span>Moves <b>{enemy.attacks.length}</b></span><span>Location <b>{enemy.location}</b></span><span>Status <b>{enemy.status}</b></span></div></div>
      <span className="combat-enemy-tier-seal"><Icon name={enemy.tier === "Elite" ? "ShieldAlert" : "Bug"} className="h-5 w-5" />{enemy.tier}</span>
    </header>
    <section className="combat-enemy-overview-grid">
      <article className="combat-reading-panel"><SectionHeading eyebrow="Combat Behavior" title="How It Fights" /><p>{enemy.behavior}</p></article>
      <article className="combat-reading-panel"><SectionHeading eyebrow="Encounter Ecology" title="Team Synergy" /><p>{enemy.teamSynergy}</p></article>
    </section>
    <section className="combat-workspace-section combat-enemy-moves"><SectionHeading eyebrow={`${enemy.tier} Kit`} title="Moveset" /><div className="combat-enemy-move-grid">{enemy.attacks.map((attack, index) => <EnemyMoveCard key={attack.id} attack={attack} index={index} />)}</div></section>
    <section className="combat-enemy-overview-grid">
      <article className="combat-reading-panel"><SectionHeading eyebrow="Animation Handoff" title="Required Motion" /><p>{enemy.animationNotes}</p><div className="combat-clip-list">{enemy.attacks.flatMap((attack) => attack.animation.requiredClips).map((clip) => <code key={clip}>{clip}</code>)}</div></article>
      <article className="combat-reading-panel"><SectionHeading eyebrow="Cookbook Source" title="Bestiary Link" />{creature ? <><p>{creature.description || creature.overview || `${enemy.name} is linked to its Bestiary record.`}</p><div className="combat-tag-row"><span>{creature.category}</span><span>{creature.type}</span><span>{creature.status}</span>{assets.length > 0 && <span>{assets.length} linked art assets</span>}</div></> : <p className="combat-muted">No matching Bestiary record is available yet. Combat art will connect automatically when one is added under this name.</p>}</article>
    </section>
    <section className="combat-workspace-section"><SectionHeading eyebrow="Bestiary & Art Binder" title="Linked Visuals" /><div className="combat-enemy-media-grid">{assets.map((asset) => <article key={asset.id}><span><DriveAwareImage src={asset.imageUrl} alt={asset.label} /></span><small>{asset.section}</small><b>{asset.label}</b>{asset.animated && <em>Animated sprite</em>}</article>)}{!assets.length && <div className="combat-empty-inline">Images and sprite sheets uploaded to {enemy.name}'s Bestiary or Art Binder will appear here automatically.</div>}</div></section>
  </main>;
}

function EnemyMoveCard({ attack, index }: { attack: CombatAttack; index: number }) {
  return <article className="combat-enemy-move-card">
    <header><span>{String(index + 1).padStart(2, "0")}</span><div><small>{attack.damageType || "Combat move"}</small><h3 className="font-display">{attack.name}</h3><code>{attack.internalId}</code></div></header>
    <p>{attack.summary}</p>
    <div className="combat-enemy-move-values"><span><small>Startup</small><b>{formatSeconds(attack.startup)}</b></span><span><small>Cooldown</small><b>{formatSeconds(attack.cooldown)}</b></span><span><small>Range</small><b>{attack.range}</b></span><span><small>Response</small><b>{[...attack.expectedResponses, attack.customResponse].filter(Boolean).join(" · ")}</b></span></div>
    <details><summary>Design intent and implementation</summary><div><span><b>Purpose</b>{attack.purpose}</span><span><b>Player read</b>{attack.playerRead}</span><span><b>AI conditions</b>{attack.developer.selectionConditions.join(" · ")}</span></div></details>
    <div className="combat-status-strip">{combatDisciplines.map((discipline) => <i key={discipline} className={`status-${slug(attack.production[discipline])}`} title={`${titleCase(discipline)}: ${attack.production[discipline]}`} />)}</div>
  </article>;
}

function linkedBestiaryCreature(enemy: CombatEnemy, bestiary: BestiaryCreature[]) {
  const normalizedName = normalizedCreatureName(enemy.name);
  return bestiary.find((creature) => creature.id === enemy.bestiaryCreatureId)
    || bestiary.find((creature) => normalizedCreatureName(creature.name) === normalizedName)
    || null;
}

function normalizedCreatureName(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function creatureArtAssets(creature: BestiaryCreature | null) {
  if (!creature) return [];
  return (creature.artVault?.sections || []).flatMap((section) => section.slots.flatMap((slot) => {
    const image = slot.image;
    const imageUrl = image?.thumbnailUrl || image?.downloadUrl || "";
    return imageUrl ? [{ id: image?.id || `${section.id}-${slot.id}`, label: slot.label, section: section.title, imageUrl, animated: Boolean(image?.spriteAnimation) }] : [];
  }));
}

function enemyCoverImage(enemy: CombatEnemy, bestiary: BestiaryCreature[]) {
  if (enemy.artwork?.imageUrl) return enemy.artwork.imageUrl;
  const creature = linkedBestiaryCreature(enemy, bestiary);
  return creature?.slotImage || creature?.image || creature?.expandedImage || creature?.hoverImage || creatureArtAssets(creature)[0]?.imageUrl || "";
}

function BossLibrary({ bosses, readOnly, filter, query, onFilter, onQuery, onBack, onOpen, onAdd, onDelete }: { bosses: CombatBoss[]; readOnly: boolean; filter: string; query: string; onFilter: (value: string) => void; onQuery: (value: string) => void; onBack: () => void; onOpen: (id: string) => void; onAdd: () => void; onDelete: (boss: CombatBoss) => void }) {
  const visible = bosses.filter((boss) => {
    const matchesQuery = !query.trim() || `${boss.name} ${boss.act} ${boss.location} ${boss.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === "All" || (filter === "Main Bosses" && boss.classification === "Main Boss") || (filter === "Mini Bosses" && boss.classification === "Mini Boss") || (filter === "In Development" && boss.status !== "Complete") || (filter === "Complete" && boss.status === "Complete");
    return matchesQuery && matchesFilter;
  });
  return <>
    <div className="combat-library-heading">
      <button className="combat-icon-button" onClick={onBack} title="Back to Combat"><Icon name="ChevronLeft" className="h-5 w-5" /></button>
      <div><small>Combat Library</small><h1 className="font-display">Bosses</h1><p>Each boss remains one cohesive document containing phases, attacks, production disciplines, and references.</p></div>
      {!readOnly && <button className="button-frame combat-action" onClick={onAdd}><Icon name="Plus" className="h-4 w-4" /> Add Boss</button>}
    </div>
    <div className="combat-filter-bar">
      <label><Icon name="Search" className="h-4 w-4" /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search bosses" /></label>
      <div className="combat-filter-tabs">{["All", "Main Bosses", "Mini Bosses", "In Development", "Complete"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => onFilter(item)}>{item}</button>)}</div>
    </div>
    <section className="combat-boss-grid">{visible.map((boss) => <BossCard key={boss.id} boss={boss} readOnly={readOnly} onOpen={() => onOpen(boss.id)} onDelete={() => onDelete(boss)} />)}</section>
    {!visible.length && <EmptyState title="No bosses match this view" description="Change the filter or create a new boss document." />}
  </>;
}

function BossCard({ boss, readOnly, onOpen, onDelete }: { boss: CombatBoss; readOnly: boolean; onOpen: () => void; onDelete: () => void }) {
  const attacks = boss.phases.reduce((sum, phase) => sum + phase.attacks.length, 0);
  const progress = combatBossProgress(boss);
  const overall = Math.round(Object.values(progress).reduce((sum, value) => sum + value, 0) / combatDisciplines.length);
  return <AssignableModule as="article" className="combat-boss-card lore-card-frame" module={{ moduleId: `combat-boss:${boss.id}`, moduleTitle: boss.name, moduleType: "combat-boss", entryId: boss.id, entryTitle: boss.name, entryCategory: "Combat / Bosses", targetRoute: `combat:${boss.id}` }}>
    <button className="combat-boss-open" onClick={onOpen}>
      <span className="combat-boss-art">{boss.artwork?.imageUrl ? <DriveAwareImage src={boss.artwork.imageUrl} alt="" /> : <Icon name="Crown" className="h-10 w-10" />}</span>
      <span className="combat-boss-copy"><small>{boss.classification} · {boss.act || "Act not set"}</small><strong className="font-display">{boss.name}</strong><p>{boss.summary || "Add a concise boss summary."}</p></span>
      <span className="combat-card-stats"><span><b>{boss.phases.length}</b> phases</span><span><b>{attacks}</b> attacks</span><span><b>{overall}%</b> production</span></span>
      <span className="combat-card-progress"><i style={{ width: `${overall}%` }} /></span>
    </button>
    {!readOnly && <details className="combat-overflow combat-card-overflow"><summary title={`${boss.name} actions`}><Icon name="MoreHorizontal" className="h-4 w-4" /></summary><div><button onClick={onOpen}><Icon name="ExternalLink" className="h-4 w-4" /> Open</button><button className="danger" onClick={onDelete}><Icon name="Trash2" className="h-4 w-4" /> Delete</button></div></details>}
  </AssignableModule>;
}

function BossWorkspace(props: { boss: CombatBoss; tab: BossTab; readOnly: boolean; onBack: () => void; onTabChange: (tab: BossTab) => void; onEdit: () => void; onManageMedia: () => void; onAddPhase: () => void; onEditPhase: (phase: CombatPhase) => void; onManagePhaseMedia: (phase: CombatPhase) => void; onDeletePhase: (id: string) => void; onMovePhase: (id: string, direction: -1 | 1) => void; onAddAttack: (phase: CombatPhase) => void; onEditAttack: (phase: CombatPhase, attack: CombatAttack) => void; onOpenAttack: (phaseId: string, attackId: string) => void; onDeleteAttack: (phase: CombatPhase, id: string) => void; onMoveAttack: (phase: CombatPhase, id: string, direction: -1 | 1) => void }) {
  const { boss } = props;
  const [movesetView, setMovesetView] = useState<"visual" | "production">("visual");
  const [navOpen, setNavOpen] = useState(false);
  const totalAttacks = boss.phases.reduce((sum, phase) => sum + phase.attacks.length, 0);
  const openPhase = (phaseId: string) => {
    props.onTabChange("Moveset");
    setNavOpen(false);
    window.setTimeout(() => document.getElementById(`combat-phase-${phaseId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  return <div className="combat-boss-layout">
    <button className="combat-boss-nav-toggle combat-action" onClick={() => setNavOpen(true)}><Icon name="ListTree" className="h-4 w-4" /> Fight Navigator</button>
    <CombatBossNavigator boss={boss} activeTab={props.tab} open={navOpen} onClose={() => setNavOpen(false)} onTab={(tab) => { props.onTabChange(tab); setNavOpen(false); }} onPhase={openPhase} onAttack={props.onOpenAttack} />
    <main className="combat-boss-main">
      <CombatBreadcrumbs items={[{ label: "Combat", onClick: props.onBack }, { label: "Bosses", onClick: props.onBack }, { label: boss.name }]} />
      <header className="combat-boss-hero">
        <div className="combat-boss-hero-art">{boss.artwork?.imageUrl ? <DriveAwareImage src={boss.artwork.imageUrl} alt={boss.name} /> : <Icon name="Crown" className="h-14 w-14" />}</div>
        <div className="combat-boss-hero-copy"><small>{boss.classification} · {boss.act || "Act not set"}</small><h1 className="font-display">{boss.name}</h1><p>{boss.summary || "Add a concise boss summary."}</p><div className="combat-hero-facts"><span>Location <b>{boss.location || "Not set"}</b></span><span>Health <b>{boss.health ?? "—"}</b></span><span>Phases <b>{boss.phases.length}</b></span><span>Difficulty <b>{boss.difficulty || "—"}</b></span><span>Element <b>{boss.primaryDamageType || "—"}</b></span></div></div>
        {!props.readOnly && <div className="combat-hero-actions"><button className="combat-action" onClick={props.onManageMedia}><Icon name="Image" className="h-4 w-4" /> Artwork</button><button className="button-frame combat-action" onClick={props.onEdit}><Icon name="Edit3" className="h-4 w-4" /> Edit Boss</button></div>}
      </header>
      <BossProductionOverview boss={boss} />
      <div className="combat-sticky-identity"><div><Icon name="Crown" className="h-4 w-4" /><span>{boss.name}</span></div><nav className="combat-inner-tabs">{bossTabs.map((tab) => <button key={tab} className={props.tab === tab ? "active" : ""} onClick={() => props.onTabChange(tab)}>{tab}</button>)}</nav></div>
      {props.tab === "Moveset" && <Moveset {...props} totalAttacks={totalAttacks} view={movesetView} onViewChange={setMovesetView} />}
      {props.tab === "Overview" && <BossOverview boss={boss} onPhase={openPhase} />}
      {props.tab === "Animation" && <section className="combat-reading-panel"><SectionHeading eyebrow="Boss-Wide Direction" title="Animation" /><p>{boss.animationNotes || "No boss-wide animation notes yet."}</p></section>}
      {props.tab === "Balance" && <section className="combat-reading-panel"><SectionHeading eyebrow="Tuning Direction" title="Balance" /><p>{boss.balanceNotes || "No boss-wide balance notes yet."}</p><ProductionBoard boss={boss} /></section>}
      {props.tab === "References" && <ReferenceGallery media={boss.references} empty="No boss references have been attached yet." onManage={!props.readOnly ? props.onManageMedia : undefined} />}
    </main>
  </div>;
}

function CombatBossNavigator({ boss, activeTab, activeAttackId = "", open, onClose, onTab, onPhase, onAttack }: { boss: CombatBoss; activeTab: BossTab; activeAttackId?: string; open: boolean; onClose: () => void; onTab: (tab: BossTab) => void; onPhase: (phaseId: string) => void; onAttack: (phaseId: string, attackId: string) => void }) {
  return <aside className={`combat-boss-nav ${open ? "open" : ""}`}>
    <header><div><small>Boss Document</small><b>{boss.name}</b></div><button className="combat-icon-button" onClick={onClose} title="Close navigator"><Icon name="X" className="h-4 w-4" /></button></header>
    <nav>
      <button className={activeTab === "Overview" ? "active" : ""} onClick={() => onTab("Overview")}><Icon name="Gauge" className="h-4 w-4" /> Overview</button>
      <button className={activeTab === "Moveset" ? "active" : ""} onClick={() => onTab("Moveset")}><Icon name="Swords" className="h-4 w-4" /> Moveset</button>
      <div className="combat-boss-nav-tree">{boss.phases.map((phase, phaseIndex) => <div key={phase.id}><button onClick={() => onPhase(phase.id)}><span>{toRoman(phaseIndex + 1)}</span>{phase.name}</button>{phase.attacks.map((attack, attackIndex) => <button key={attack.id} className={activeAttackId === attack.id ? "active" : ""} onClick={() => { onAttack(phase.id, attack.id); onClose(); }}><small>{String(attackIndex + 1).padStart(2, "0")}</small>{attack.name}</button>)}</div>)}</div>
      {(["Animation", "Balance", "References"] as BossTab[]).map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => onTab(tab)}><Icon name={tab === "Animation" ? "Clapperboard" : tab === "Balance" ? "Scale" : "Images"} className="h-4 w-4" /> {tab}</button>)}
    </nav>
  </aside>;
}

function CombatBreadcrumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return <nav className="combat-breadcrumbs" aria-label="Combat breadcrumb">{items.map((item, index) => <span key={`${item.label}-${index}`}>{index > 0 && <Icon name="ChevronRight" className="h-3 w-3" />}{item.onClick ? <button onClick={item.onClick}>{item.label}</button> : <b>{item.label}</b>}</span>)}</nav>;
}

function BossProductionOverview({ boss }: { boss: CombatBoss }) {
  const progress = combatBossProgress(boss);
  const overall = Math.round(Object.values(progress).reduce((sum, value) => sum + value, 0) / combatDisciplines.length);
  return <section className="combat-boss-production-overview"><div className="combat-overall-progress"><span><small>Overall Production</small><b>{overall}%</b></span><i><em style={{ width: `${overall}%` }} /></i></div><div className="combat-discipline-health">{combatDisciplines.map((discipline) => <div key={discipline}><span><small>{titleCase(discipline)}</small><b>{progress[discipline]}%</b></span><i><em style={{ width: `${progress[discipline]}%` }} /></i></div>)}</div></section>;
}

function BossOverview({ boss, onPhase }: { boss: CombatBoss; onPhase: (phaseId: string) => void }) {
  const attacks = boss.phases.flatMap((phase) => phase.attacks.map((attack) => ({ phase, attack })));
  const attention = attacks.filter(({ attack }) => combatDisciplines.some((discipline) => ["Blocked", "Review"].includes(attack.production[discipline])));
  const activity = attacks.flatMap(({ attack }) => attack.history.map((item) => ({ ...item, attackName: attack.name }))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6);
  return <div className="combat-overview-dashboard">
    <section className="combat-reading-panel"><SectionHeading eyebrow="Fight Intent" title="What This Encounter Tests" /><p>{boss.overview || "No overview has been written yet."}</p>{boss.tags.length > 0 && <div className="combat-tag-row">{boss.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}</section>
    <section className="combat-reading-panel"><SectionHeading eyebrow="Fight Structure" title="Escalation Across Health" /><div className="combat-phase-structure">{boss.phases.map((phase, index) => <button key={phase.id} onClick={() => onPhase(phase.id)}><small>Phase {toRoman(index + 1)}</small><b>{phase.name}</b><span>{phase.healthRange || "Health range not set"}</span><Icon name="ChevronRight" className="h-4 w-4" /></button>)}</div></section>
    <section className="combat-overview-columns"><div className="combat-reading-panel"><SectionHeading eyebrow="Production Health" title="Needs Attention" />{attention.map(({ attack, phase }) => <article key={attack.id} className="combat-attention-row"><div><b>{attack.name}</b><small>{phase.name}</small></div><span>{combatDisciplines.filter((discipline) => ["Blocked", "Review"].includes(attack.production[discipline])).map((discipline) => `${titleCase(discipline)}: ${attack.production[discipline]}`).join(" · ")}</span></article>)}{!attention.length && <p className="combat-muted">No blocked or review-stage attacks.</p>}</div><div className="combat-reading-panel"><SectionHeading eyebrow="Activity" title="Recent Changes" />{activity.map((item) => <article key={item.id} className="combat-attention-row"><div><b>{item.message}</b><small>{item.attackName}</small></div><time>{formatUpdatedAt(item.createdAt)}</time></article>)}{!activity.length && <p className="combat-muted">Activity will appear as attacks are edited.</p>}</div></section>
  </div>;
}

function CombatProductionTable({ boss, phase, readOnly, onOpenAttack, onEditAttack, onDeleteAttack }: { boss: CombatBoss; phase: CombatPhase; readOnly: boolean; onOpenAttack: (phaseId: string, attackId: string) => void; onEditAttack: (phase: CombatPhase, attack: CombatAttack) => void; onDeleteAttack: (phase: CombatPhase, id: string) => void }) {
  return <div className="combat-production-table" role="table"><div className="combat-production-row header" role="row"><span>Attack</span>{combatDisciplines.map((discipline) => <span key={discipline}>{titleCase(discipline)}</span>)}<span>Actions</span></div>{phase.attacks.map((attack, index) => <AssignableModule key={attack.id} as="div" className="combat-production-row" module={{ moduleId: `combat-attack:${boss.id}:${phase.id}:${attack.id}`, moduleTitle: attack.name, moduleType: "combat-attack", entryId: attack.id, entryTitle: boss.name, entryCategory: `Combat / ${phase.name}`, targetRoute: `combat:${boss.id}:${phase.id}:${attack.id}` }}><button className="combat-production-attack" onClick={() => onOpenAttack(phase.id, attack.id)}><small>{String(index + 1).padStart(2, "0")}</small><b>{attack.name}</b><code>{attack.internalId || "ID not set"}</code></button>{combatDisciplines.map((discipline) => <span key={discipline} className={`combat-status-pill status-${slug(attack.production[discipline])}`}>{attack.production[discipline]}</span>)}<div className="combat-production-actions"><button onClick={() => onOpenAttack(phase.id, attack.id)} title="Open attack"><Icon name="ExternalLink" className="h-4 w-4" /></button>{!readOnly && <><button onClick={() => onEditAttack(phase, attack)} title="Edit attack"><Icon name="Edit3" className="h-4 w-4" /></button><button onClick={() => onDeleteAttack(phase, attack.id)} title="Delete attack"><Icon name="Trash2" className="h-4 w-4" /></button></>}</div></AssignableModule>)}</div>;
}

function Moveset({ boss, totalAttacks, readOnly, onAddPhase, onEditPhase, onManagePhaseMedia, onDeletePhase, onMovePhase, onAddAttack, onEditAttack, onOpenAttack, onDeleteAttack, onMoveAttack, view, onViewChange }: Parameters<typeof BossWorkspace>[0] & { totalAttacks: number; view: "visual" | "production"; onViewChange: (view: "visual" | "production") => void }) {
  return <>
    <section className="combat-moveset-summary"><div><small>Encounter Journey</small><strong>{totalAttacks} attacks across {boss.phases.length} phases</strong><p>Follow the fight from opening pressure through its final escalation.</p></div><div className="combat-moveset-controls"><div className="combat-view-switch"><button className={view === "visual" ? "active" : ""} onClick={() => onViewChange("visual")}><Icon name="LayoutGrid" className="h-4 w-4" /> Visual</button><button className={view === "production" ? "active" : ""} onClick={() => onViewChange("production")}><Icon name="Rows3" className="h-4 w-4" /> Production</button></div>{!readOnly && <div className="combat-hero-actions"><button className="combat-action" disabled={!boss.phases.length} onClick={() => boss.phases[0] && onAddAttack(boss.phases[0])}><Icon name="Plus" className="h-4 w-4" /> Add Attack</button><button className="button-frame combat-action" onClick={onAddPhase}><Icon name="Plus" className="h-4 w-4" /> Add Phase</button></div>}</div></section>
    <div className="combat-phase-list">{boss.phases.map((phase, phaseIndex) => <section key={phase.id} id={`combat-phase-${phase.id}`} className="combat-phase-section">
      <header className="combat-phase-heading"><span className="combat-phase-number">{phaseIndex + 1}</span><div><small>Phase {phaseIndex + 1} · {phase.healthRange || "Health range not set"}</small><h2 className="font-display">{phase.name}</h2><p>{phase.behavior || "Add the behavior and escalation plan for this phase."}</p></div>{!readOnly && <div className="combat-row-actions"><button onClick={() => onMovePhase(phase.id, -1)} disabled={phaseIndex === 0} title="Move phase up"><Icon name="ChevronLeft" className="h-4 w-4 rotate-90" /></button><button onClick={() => onMovePhase(phase.id, 1)} disabled={phaseIndex === boss.phases.length - 1} title="Move phase down"><Icon name="ChevronRight" className="h-4 w-4 rotate-90" /></button><button onClick={() => onManagePhaseMedia(phase)}><Icon name="Image" className="h-4 w-4" /> Art</button><button onClick={() => onEditPhase(phase)}><Icon name="Edit3" className="h-4 w-4" /> Edit</button><button className="danger" onClick={() => onDeletePhase(phase.id)}><Icon name="Trash2" className="h-4 w-4" /></button></div>}</header>
      {(phase.arenaNotes || phase.designNotes) && <details className="combat-phase-notes"><summary>Phase notes and arena direction</summary><div>{phase.arenaNotes && <span><b>Arena</b>{phase.arenaNotes}</span>}{phase.designNotes && <span><b>Design</b>{phase.designNotes}</span>}</div></details>}
      {view === "visual" ? <div className="combat-attack-grid">{phase.attacks.map((attack, attackIndex) => <AttackCard key={attack.id} attack={attack} boss={boss} phase={phase} index={attackIndex} readOnly={readOnly} onOpen={() => onOpenAttack(phase.id, attack.id)} onEdit={() => onEditAttack(phase, attack)} onDelete={() => onDeleteAttack(phase, attack.id)} onMove={(direction) => onMoveAttack(phase, attack.id, direction)} />)}</div> : <CombatProductionTable boss={boss} phase={phase} readOnly={readOnly} onOpenAttack={onOpenAttack} onEditAttack={onEditAttack} onDeleteAttack={onDeleteAttack} />}
      {!phase.attacks.length && <p className="combat-empty-inline">No attacks in this phase yet.</p>}
      {!readOnly && <button className="combat-add-inline" onClick={() => onAddAttack(phase)}><Icon name="Plus" className="h-4 w-4" /> Add Attack to {phase.name}</button>}
    </section>)}</div>
  </>;
}

function AttackCard({ attack, boss, phase, index, readOnly, onOpen, onEdit, onDelete, onMove }: { attack: CombatAttack; boss: CombatBoss; phase: CombatPhase; index: number; readOnly: boolean; onOpen: () => void; onEdit: () => void; onDelete: () => void; onMove: (direction: -1 | 1) => void }) {
  const preview = attack.media.find((item) => item.imageUrl);
  const blocked = combatDisciplines.filter((discipline) => attack.production[discipline] === "Blocked");
  const review = combatDisciplines.filter((discipline) => attack.production[discipline] === "Review");
  return <AssignableModule as="article" className="combat-attack-card" module={{ moduleId: `combat-attack:${boss.id}:${phase.id}:${attack.id}`, moduleTitle: attack.name, moduleType: "combat-attack", entryId: attack.id, entryTitle: boss.name, entryCategory: `Combat / ${phase.name}`, targetRoute: `combat:${boss.id}:${phase.id}:${attack.id}` }}>
    <button className="combat-attack-main" onClick={onOpen}><span className="combat-attack-preview">{preview ? <DriveAwareImage src={preview.imageUrl} alt="" /> : <Icon name="Frame" className="h-7 w-7" />}</span><span className="combat-attack-title"><small>Attack {String(index + 1).padStart(2, "0")}</small><strong>{attack.name}</strong><code>{attack.internalId || "ID not set"}</code><p>{attack.summary || "Add a short attack description."}</p></span><span className="combat-attack-values"><span><b>{attack.damage ?? "—"}</b> damage</span><span><b>{formatSeconds(attack.startup)}</b> startup</span><span><b>{formatSeconds(attack.cooldown)}</b> cooldown</span><span><b>{attack.range || "—"}</b> range</span></span><span className="combat-status-strip">{combatDisciplines.map((discipline) => <i key={discipline} className={`status-${slug(attack.production[discipline])}`} title={`${titleCase(discipline)}: ${attack.production[discipline]}`} />)}</span>{(blocked.length > 0 || review.length > 0) && <span className="combat-attack-alerts">{blocked.length > 0 && <b><Icon name="CircleAlert" className="h-3 w-3" /> {blocked.length} blocked</b>}{review.length > 0 && <em><Icon name="Eye" className="h-3 w-3" /> {review.length} in review</em>}</span>}</button>
    {!readOnly && <details className="combat-overflow combat-attack-overflow"><summary title="Attack actions"><Icon name="MoreHorizontal" className="h-4 w-4" /></summary><div><button onClick={onOpen}><Icon name="ExternalLink" className="h-4 w-4" /> Open</button><button onClick={() => onMove(-1)}><Icon name="ChevronLeft" className="h-4 w-4 rotate-90" /> Move up</button><button onClick={() => onMove(1)}><Icon name="ChevronRight" className="h-4 w-4 rotate-90" /> Move down</button><button onClick={onEdit}><Icon name="Edit3" className="h-4 w-4" /> Edit</button><button className="danger" onClick={onDelete}><Icon name="Trash2" className="h-4 w-4" /> Delete</button></div></details>}
  </AssignableModule>;
}

function AttackWorkspace({ attack, boss, phase, readOnly, currentUser, onBack, onOpenBossTab, onOpenAttack, onEdit, onManageMedia, onSave }: { attack: CombatAttack; boss: CombatBoss; phase: CombatPhase; readOnly: boolean; currentUser: GoogleAccountUser; onBack: () => void; onOpenBossTab: (tab: BossTab) => void; onOpenAttack: (phaseId: string, attackId: string) => void; onEdit: () => void; onManageMedia: () => void; onSave: (attack: CombatAttack) => void }) {
  const [comment, setComment] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [collaborationTab, setCollaborationTab] = useState<"Discussion" | "Activity">("Discussion");
  return <div className="combat-boss-layout combat-attack-layout">
    <button className="combat-boss-nav-toggle combat-action" onClick={() => setNavOpen(true)}><Icon name="ListTree" className="h-4 w-4" /> Fight Navigator</button>
    <CombatBossNavigator boss={boss} activeTab="Moveset" activeAttackId={attack.id} open={navOpen} onClose={() => setNavOpen(false)} onTab={onOpenBossTab} onPhase={() => onBack()} onAttack={onOpenAttack} />
    <main className="combat-boss-main combat-attack-workspace">
      <CombatBreadcrumbs items={[{ label: "Combat", onClick: () => onOpenBossTab("Overview") }, { label: "Bosses", onClick: () => onOpenBossTab("Overview") }, { label: boss.name, onClick: onBack }, { label: phase.name, onClick: onBack }, { label: attack.name }]} />
      <AssignableModule as="header" className="combat-attack-header" module={{ moduleId: `combat-attack:${boss.id}:${phase.id}:${attack.id}`, moduleTitle: attack.name, moduleType: "combat-attack", entryId: attack.id, entryTitle: boss.name, entryCategory: `Combat / ${phase.name}`, targetRoute: `combat:${boss.id}:${phase.id}:${attack.id}` }}><div className="combat-attack-index"><small>Attack</small><b>{String(phase.attacks.findIndex((item) => item.id === attack.id) + 1).padStart(2, "0")}</b></div><div><small>{boss.name} · {phase.name}</small><h1 className="font-display">{attack.name}</h1><p>{attack.summary || "Add a short attack description."}</p><code>{attack.internalId || "Internal ID not set"}</code></div><div className="combat-hero-actions"><button className="combat-action" onClick={() => { setCollaborationOpen(true); setCollaborationTab("Discussion"); }}><Icon name="MessagesSquare" className="h-4 w-4" /> Collaborate</button>{!readOnly && <><button className="combat-action" onClick={onManageMedia}><Icon name="Image" className="h-4 w-4" /> Media</button><button className="button-frame combat-action" onClick={onEdit}><Icon name="Edit3" className="h-4 w-4" /> Edit Attack</button></>}</div></AssignableModule>
      <ProductionStatusGrid production={attack.production} />
      <AttackMediaHero attack={attack} readOnly={readOnly} onManageMedia={onManageMedia} />
      <section className="combat-intent-flow"><InfoBlock title="Purpose" text={attack.purpose} icon="Target" /><span><Icon name="ChevronRight" className="h-5 w-5" /></span><InfoBlock title="Player Read" text={attack.playerRead} icon="Eye" /><span><Icon name="ChevronRight" className="h-5 w-5" /></span><InfoBlock title="Expected Response" text={[...attack.expectedResponses, attack.customResponse].filter(Boolean).join(" · ")} icon="MoveRight" /></section>
      <GameplayValueGroups attack={attack} />
      <AttackTimeline attack={attack} />
      <ProductionRequirements attack={attack} />
    </main>
    <CollaborationDrawer attack={attack} open={collaborationOpen} tab={collaborationTab} readOnly={readOnly} comment={comment} currentUser={currentUser} onTab={setCollaborationTab} onComment={setComment} onClose={() => setCollaborationOpen(false)} onSave={onSave} />
  </div>;
}

function AttackMediaHero({ attack, readOnly, onManageMedia }: { attack: CombatAttack; readOnly: boolean; onManageMedia: () => void }) {
  const [selectedId, setSelectedId] = useState(attack.media.find((item) => item.imageUrl)?.id || attack.media[0]?.id || "");
  useEffect(() => setSelectedId(attack.media.find((item) => item.imageUrl)?.id || attack.media[0]?.id || ""), [attack.id]);
  const selected = attack.media.find((item) => item.id === selectedId) || attack.media[0];
  return <section className="combat-workspace-section combat-media-dossier"><SectionHeading eyebrow="Visual Handoff" title="Attack Preview & Storyboard" /><div className="combat-media-stage"><div className="combat-media-selected">{selected?.imageUrl ? <DriveAwareImage src={selected.imageUrl} alt={selected.label} /> : <div><Icon name="Frame" className="h-10 w-10" /><b>No visual selected</b><span>Add a rough sketch, storyboard, keyframe, or capture.</span></div>}</div><aside>{selected ? <><small>{selected.kind}{selected.timestamp ? ` · ${selected.timestamp}` : ""}</small><h3 className="font-display">{selected.label}</h3><p>{selected.notes || "No notes for this visual."}</p>{selected.webViewLink && <a href={selected.webViewLink} target="_blank" rel="noreferrer"><Icon name="ExternalLink" className="h-4 w-4" /> Open Drive source</a>}</> : <p className="combat-muted">Media metadata will appear here.</p>}{!readOnly && <button className="button-frame combat-action" onClick={onManageMedia}><Icon name="Image" className="h-4 w-4" /> Manage Media</button>}</aside></div><div className="combat-media-thumbnails">{attack.media.map((item, index) => <button key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span>{item.imageUrl ? <DriveAwareImage src={item.imageUrl} alt="" /> : <Icon name="Image" className="h-5 w-5" />}</span><small>{item.timestamp || `Frame ${String(index + 1).padStart(2, "0")}`}</small><b>{item.label}</b></button>)}</div></section>;
}

function GameplayValueGroups({ attack }: { attack: CombatAttack }) {
  const groups: { title: string; icon: string; values: [string, unknown][] }[] = [
    { title: "Damage", icon: "Zap", values: [["Damage", attack.damage], ["Stagger", attack.stagger], ["Knockback", attack.knockback], ["Damage type", attack.damageType]] },
    { title: "Timing", icon: "Timer", values: [["Startup", formatSeconds(attack.startup)], ["Active", formatSeconds(attack.activeTime)], ["Recovery", formatSeconds(attack.recovery)], ["Cooldown", formatSeconds(attack.cooldown)]] },
    { title: "Interaction", icon: "ShieldCheck", values: [["Blockable", yesNo(attack.blockable)], ["Dodgeable", yesNo(attack.dodgeable)], ["Parryable", yesNo(attack.parryable)], ["Interruptible", yesNo(attack.interruptible)]] },
    { title: "Spatial", icon: "Move", values: [["Range", attack.range]] }
  ];
  return <section className="combat-workspace-section"><SectionHeading eyebrow="Structured Values" title="Gameplay" /><div className="combat-value-groups">{groups.map((group) => <article key={group.title}><header><Icon name={group.icon} className="h-4 w-4" /><b>{group.title}</b></header><div>{group.values.map(([label, value]) => <span key={label}><small>{label}</small><b>{String(value ?? "—")}</b></span>)}</div></article>)}</div></section>;
}

function AttackTimeline({ attack }: { attack: CombatAttack }) {
  const duration = Math.max(attack.startup || 0, ...attack.timeline.map((item) => item.timestamp), 1);
  const lanes = ["Animation", "Telegraph", "Audio", "Hitbox", "Projectile", "VFX", "Recovery", "AI"];
  return <section className="combat-workspace-section"><SectionHeading eyebrow="Shared Timing" title="Attack Timeline" /><div className="combat-timeline-scale"><span>0.00s</span><span>{(duration / 2).toFixed(2)}s</span><span>{duration.toFixed(2)}s</span></div><div className="combat-timeline-lanes">{lanes.map((lane) => { const events = attack.timeline.filter((event) => timelineLane(event.eventType) === lane); return <div key={lane} className="combat-timeline-lane"><b>{lane}</b><div><i />{events.map((event) => <span key={event.id} style={{ left: `${Math.min(100, event.timestamp / duration * 100)}%` }} title={event.notes || event.label}><em /><strong>{event.timestamp.toFixed(2)}s</strong><small>{event.label}</small></span>)}</div></div>; })}</div>{!attack.timeline.length && <p className="combat-muted">No attack timeline events yet.</p>}</section>;
}

function ProductionRequirements({ attack }: { attack: CombatAttack }) {
  const [tab, setTab] = useState<"Animation" | "VFX" | "Audio" | "Implementation">("Animation");
  const items: Record<typeof tab, [string, unknown][]> = {
    Animation: [["Asset", attack.animation.assetName], ["Required clips", attack.animation.requiredClips.join("\n")], ["Key poses", attack.animation.keyPoses], ["Root motion", attack.animation.rootMotion], ["Looping", attack.animation.looping], ["Notes", attack.animation.notes]],
    VFX: Object.entries(attack.vfx),
    Audio: Object.entries(attack.audio),
    Implementation: [["Blueprint", attack.developer.blueprint], ["Ability / class", attack.developer.abilityClass], ["AI behavior", attack.developer.aiBehavior], ["Available when", attack.developer.selectionConditions.join("\n")], ["Distance", rangeLabel(attack.developer.minimumDistance, attack.developer.maximumDistance)], ["Weight", attack.developer.attackWeight], ["Phase", attack.developer.phaseAvailability], ["Notes", attack.developer.notes]]
  };
  return <section className="combat-workspace-section"><SectionHeading eyebrow="Production Handoff" title="Requirements" /><nav className="combat-requirement-tabs">{(["Animation", "VFX", "Audio", "Implementation"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav><ProductionNotes title={tab === "Implementation" ? "Developer Implementation" : `${tab} Requirements`} items={items[tab]} /></section>;
}

function CollaborationDrawer({ attack, open, tab, readOnly, comment, currentUser, onTab, onComment, onClose, onSave }: { attack: CombatAttack; open: boolean; tab: "Discussion" | "Activity"; readOnly: boolean; comment: string; currentUser: GoogleAccountUser; onTab: (tab: "Discussion" | "Activity") => void; onComment: (comment: string) => void; onClose: () => void; onSave: (attack: CombatAttack) => void }) {
  return <aside className={`combat-collaboration-drawer ${open ? "open" : ""}`} aria-hidden={!open}><header><div><small>Attack Collaboration</small><b>{attack.name}</b></div><button className="combat-icon-button" onClick={onClose}><Icon name="X" className="h-4 w-4" /></button></header><nav><button className={tab === "Discussion" ? "active" : ""} onClick={() => onTab("Discussion")}>Discussion <span>{attack.comments.length}</span></button><button className={tab === "Activity" ? "active" : ""} onClick={() => onTab("Activity")}>Activity <span>{attack.history.length}</span></button></nav><div className="combat-collaboration-content">{tab === "Discussion" ? <>{attack.comments.map((item) => <article key={item.id}><header><b>{item.author}</b><time>{new Date(item.createdAt).toLocaleString()}</time></header><p>{item.text}</p></article>)}{!attack.comments.length && <p className="combat-muted">No production discussion yet.</p>}{!readOnly && <div className="combat-comment-form"><textarea value={comment} onChange={(event) => onComment(event.target.value)} placeholder="Add a production note or reply..." /><button className="button-frame combat-action" disabled={!comment.trim()} onClick={() => { onSave({ ...attack, comments: [...attack.comments, { id: createCombatId("comment"), author: currentUser.name, authorEmail: currentUser.email, text: comment.trim(), createdAt: new Date().toISOString() }] }); onComment(""); }}>Add Comment</button></div>}</> : <>{[...attack.history].reverse().map((item) => <article key={item.id}><header><b>{item.message}</b><time>{new Date(item.createdAt).toLocaleString()}</time></header></article>)}{!attack.history.length && <p className="combat-muted">No changes recorded yet.</p>}</>}</div></aside>;
}

function BossEditor({ draft, onChange, onCancel, onSave }: { draft: CombatBoss; onChange: (draft: CombatBoss) => void; onCancel: () => void; onSave: () => void }) {
  return <EditorShell title={draft.name === "New Boss" ? "Add Boss" : `Edit ${draft.name}`} onCancel={onCancel} onSave={onSave}><div className="combat-form-grid"><Field label="Boss name"><input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} /></Field><Field label="Classification"><CustomSelect value={draft.classification} options={bossTypes} onChange={(value) => onChange({ ...draft, classification: value as CombatBossType })} /></Field><Field label="Act / story section"><input value={draft.act} onChange={(e) => onChange({ ...draft, act: e.target.value })} /></Field><Field label="Location"><input value={draft.location} onChange={(e) => onChange({ ...draft, location: e.target.value })} /></Field><Field label="Health"><input type="number" value={draft.health ?? ""} onChange={(e) => onChange({ ...draft, health: optionalInputNumber(e.target.value) })} /></Field><Field label="Difficulty"><input value={draft.difficulty} onChange={(e) => onChange({ ...draft, difficulty: e.target.value })} /></Field><Field label="Primary element / damage type"><input value={draft.primaryDamageType} onChange={(e) => onChange({ ...draft, primaryDamageType: e.target.value })} /></Field><Field label="General status"><CustomSelect value={draft.status} options={combatProductionStatuses} onChange={(value) => onChange({ ...draft, status: value as CombatProductionStatus })} /></Field><Field wide label="Card summary"><textarea value={draft.summary} onChange={(e) => onChange({ ...draft, summary: e.target.value })} /></Field><Field wide label="Fight overview"><textarea value={draft.overview} onChange={(e) => onChange({ ...draft, overview: e.target.value })} /></Field><Field wide label="Boss-wide animation notes"><textarea value={draft.animationNotes} onChange={(e) => onChange({ ...draft, animationNotes: e.target.value })} /></Field><Field wide label="Boss-wide balance notes"><textarea value={draft.balanceNotes} onChange={(e) => onChange({ ...draft, balanceNotes: e.target.value })} /></Field><Field wide label="Tags (comma separated)"><input value={draft.tags.join(", ")} onChange={(e) => onChange({ ...draft, tags: splitList(e.target.value) })} /></Field></div><EditorSection title="Reference Slots"><div className="combat-editor-list">{draft.references.map((media) => <div key={media.id} className="combat-editor-list-row"><CustomSelect value={media.kind} options={mediaKinds} onChange={(value) => onChange({ ...draft, references: patchMedia(draft.references, media.id, { kind: value as CombatMediaKind }) })} /><input value={media.label} placeholder="Reference label" onChange={(event) => onChange({ ...draft, references: patchMedia(draft.references, media.id, { label: event.target.value }) })} /><input value={media.timestamp || ""} placeholder="Optional time" onChange={(event) => onChange({ ...draft, references: patchMedia(draft.references, media.id, { timestamp: event.target.value }) })} /><input value={media.notes} placeholder="Notes" onChange={(event) => onChange({ ...draft, references: patchMedia(draft.references, media.id, { notes: event.target.value }) })} /><button onClick={() => onChange({ ...draft, references: draft.references.filter((item) => item.id !== media.id) })}><Icon name="Trash2" className="h-4 w-4" /></button></div>)}<button className="combat-add-inline" onClick={() => onChange({ ...draft, references: [...draft.references, { id: createCombatId("media"), kind: "Storyboard", label: `Reference ${draft.references.length + 1}`, imageUrl: "", notes: "", order: draft.references.length }] })}><Icon name="Plus" className="h-4 w-4" /> Add Reference Slot</button></div></EditorSection></EditorShell>;
}

function PhaseEditor({ draft, onChange, onCancel, onSave }: { draft: CombatPhase; onChange: (draft: CombatPhase) => void; onCancel: () => void; onSave: () => void }) {
  return <EditorShell title={`Edit ${draft.name}`} onCancel={onCancel} onSave={onSave}><div className="combat-form-grid"><Field label="Phase name"><input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} /></Field><Field label="Health range"><input value={draft.healthRange} placeholder="100% → 70%" onChange={(e) => onChange({ ...draft, healthRange: e.target.value })} /></Field><Field wide label="Phase behavior"><textarea value={draft.behavior} onChange={(e) => onChange({ ...draft, behavior: e.target.value })} /></Field><Field wide label="Arena notes"><textarea value={draft.arenaNotes} onChange={(e) => onChange({ ...draft, arenaNotes: e.target.value })} /></Field><Field wide label="Design notes"><textarea value={draft.designNotes} onChange={(e) => onChange({ ...draft, designNotes: e.target.value })} /></Field></div></EditorShell>;
}

function AttackEditor({ draft, onChange, onCancel, onSave }: { draft: CombatAttack; onChange: (draft: CombatAttack) => void; onCancel: () => void; onSave: () => void }) {
  const set = <K extends keyof CombatAttack>(key: K, value: CombatAttack[K]) => onChange({ ...draft, [key]: value });
  const updateNested = (group: "animation" | "vfx" | "audio" | "developer", key: string, value: unknown) => onChange({ ...draft, [group]: { ...draft[group], [key]: value } as never });
  return <EditorShell title={`Attack Workspace · ${draft.name}`} wide onCancel={onCancel} onSave={onSave}><div className="combat-form-grid"><Field label="Attack name"><input value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field><Field label="Internal Attack ID"><input value={draft.internalId} placeholder="IQ_P1_FrostSweep" onChange={(e) => set("internalId", e.target.value)} /></Field><Field wide label="Short description"><textarea value={draft.summary} onChange={(e) => set("summary", e.target.value)} /></Field><Field wide label="Purpose"><textarea value={draft.purpose} onChange={(e) => set("purpose", e.target.value)} /></Field><Field wide label="Player Read"><textarea value={draft.playerRead} onChange={(e) => set("playerRead", e.target.value)} /></Field><Field wide label="Expected response"><div className="combat-choice-row">{responseOptions.map((option) => <label key={option}><input type="checkbox" checked={draft.expectedResponses.includes(option)} onChange={() => set("expectedResponses", toggleList(draft.expectedResponses, option))} /> {option}</label>)}</div><input value={draft.customResponse} placeholder="Custom response" onChange={(e) => set("customResponse", e.target.value)} /></Field></div>
    <EditorSection title="Gameplay Values"><div className="combat-form-grid compact">{(["damage", "startup", "activeTime", "recovery", "cooldown"] as const).map((key) => <Field key={key} label={titleCase(key)}><input type="number" step="0.1" value={draft[key] ?? ""} onChange={(e) => set(key, optionalInputNumber(e.target.value))} /></Field>)}{(["range", "knockback", "stagger", "damageType"] as const).map((key) => <Field key={key} label={titleCase(key)}><input value={draft[key]} onChange={(e) => set(key, e.target.value)} /></Field>)}{(["blockable", "dodgeable", "parryable", "interruptible"] as const).map((key) => <Field key={key} label={titleCase(key)}><CustomSelect value={draft[key] === undefined ? "Optional" : draft[key] ? "Yes" : "No"} options={["Optional", "Yes", "No"]} onChange={(value) => set(key, value === "Optional" ? undefined : value === "Yes")} /></Field>)}</div></EditorSection>
    <EditorSection title="Production Status"><div className="combat-form-grid compact">{combatDisciplines.map((key) => <Field key={key} label={titleCase(key)}><CustomSelect value={draft.production[key]} options={combatProductionStatuses} onChange={(value) => set("production", { ...draft.production, [key]: value as CombatProductionStatus })} /></Field>)}</div></EditorSection>
    <EditorSection title="Storyboard / Reference Slots"><div className="combat-editor-list">{draft.media.map((media) => <div key={media.id} className="combat-editor-list-row"><CustomSelect value={media.kind} options={mediaKinds} onChange={(value) => set("media", draft.media.map((item) => item.id === media.id ? { ...item, kind: value as CombatMediaKind } : item))} /><input value={media.label} placeholder="Label" onChange={(e) => set("media", patchMedia(draft.media, media.id, { label: e.target.value }))} /><input value={media.timestamp || ""} placeholder="0.0s" onChange={(e) => set("media", patchMedia(draft.media, media.id, { timestamp: e.target.value }))} /><input value={media.notes} placeholder="Notes" onChange={(e) => set("media", patchMedia(draft.media, media.id, { notes: e.target.value }))} /><button onClick={() => set("media", draft.media.filter((item) => item.id !== media.id))}><Icon name="Trash2" className="h-4 w-4" /></button></div>)}<button className="combat-add-inline" onClick={() => set("media", [...draft.media, { id: createCombatId("media"), kind: "Keyframe", label: `Frame ${String(draft.media.length + 1).padStart(2, "0")}`, imageUrl: "", notes: "", order: draft.media.length }])}><Icon name="Plus" className="h-4 w-4" /> Add Visual Slot</button></div></EditorSection>
    <EditorSection title="Attack Timeline"><div className="combat-editor-list">{draft.timeline.map((event) => <div key={event.id} className="combat-editor-list-row timeline"><input type="number" step="0.05" value={event.timestamp} onChange={(e) => set("timeline", draft.timeline.map((item) => item.id === event.id ? { ...item, timestamp: Number(e.target.value) } : item))} /><input value={event.label} placeholder="Event" onChange={(e) => set("timeline", draft.timeline.map((item) => item.id === event.id ? { ...item, label: e.target.value } : item))} /><input value={event.eventType} placeholder="Type" onChange={(e) => set("timeline", draft.timeline.map((item) => item.id === event.id ? { ...item, eventType: e.target.value } : item))} /><input value={event.notes} placeholder="Notes" onChange={(e) => set("timeline", draft.timeline.map((item) => item.id === event.id ? { ...item, notes: e.target.value } : item))} /><button onClick={() => set("timeline", draft.timeline.filter((item) => item.id !== event.id))}><Icon name="Trash2" className="h-4 w-4" /></button></div>)}<button className="combat-add-inline" onClick={() => set("timeline", [...draft.timeline, { id: createCombatId("event"), timestamp: 0, label: "New event", eventType: "Animation", notes: "" }])}><Icon name="Plus" className="h-4 w-4" /> Add Timeline Event</button></div></EditorSection>
    <EditorSection title="Animation Requirements"><div className="combat-form-grid compact"><Field label="Asset name"><input value={draft.animation.assetName} onChange={(e) => updateNested("animation", "assetName", e.target.value)} /></Field><Field label="Required clips (one per line)"><textarea value={draft.animation.requiredClips.join("\n")} onChange={(e) => updateNested("animation", "requiredClips", splitLines(e.target.value))} /></Field><Field label="Required key poses"><textarea value={draft.animation.keyPoses} onChange={(e) => updateNested("animation", "keyPoses", e.target.value)} /></Field><Field label="Root motion"><input value={draft.animation.rootMotion} onChange={(e) => updateNested("animation", "rootMotion", e.target.value)} /></Field><Field label="Looping"><input value={draft.animation.looping} onChange={(e) => updateNested("animation", "looping", e.target.value)} /></Field><Field label="Animation notes"><textarea value={draft.animation.notes} onChange={(e) => updateNested("animation", "notes", e.target.value)} /></Field></div></EditorSection>
    <EditorSection title="VFX"><NestedTextFields group={draft.vfx} onChange={(key, value) => updateNested("vfx", key, value)} /></EditorSection><EditorSection title="Audio"><NestedTextFields group={draft.audio} onChange={(key, value) => updateNested("audio", key, value)} /></EditorSection>
    <EditorSection title="Developer Implementation"><div className="combat-form-grid compact"><Field label="Blueprint / asset"><input value={draft.developer.blueprint} onChange={(e) => updateNested("developer", "blueprint", e.target.value)} /></Field><Field label="Ability / attack class"><input value={draft.developer.abilityClass} onChange={(e) => updateNested("developer", "abilityClass", e.target.value)} /></Field><Field wide label="AI behavior"><textarea value={draft.developer.aiBehavior} onChange={(e) => updateNested("developer", "aiBehavior", e.target.value)} /></Field><Field wide label="Selection conditions (one per line)"><textarea value={draft.developer.selectionConditions.join("\n")} onChange={(e) => updateNested("developer", "selectionConditions", splitLines(e.target.value))} /></Field><Field label="Minimum distance"><input type="number" value={draft.developer.minimumDistance ?? ""} onChange={(e) => updateNested("developer", "minimumDistance", optionalInputNumber(e.target.value))} /></Field><Field label="Maximum distance"><input type="number" value={draft.developer.maximumDistance ?? ""} onChange={(e) => updateNested("developer", "maximumDistance", optionalInputNumber(e.target.value))} /></Field><Field label="Attack weight"><input type="number" value={draft.developer.attackWeight ?? ""} onChange={(e) => updateNested("developer", "attackWeight", optionalInputNumber(e.target.value))} /></Field><Field label="Phase availability"><input value={draft.developer.phaseAvailability} onChange={(e) => updateNested("developer", "phaseAvailability", e.target.value)} /></Field><Field wide label="Developer notes"><textarea value={draft.developer.notes} onChange={(e) => updateNested("developer", "notes", e.target.value)} /></Field></div></EditorSection>
  </EditorShell>;
}

function CombatMediaManager({ target, bosses, onClose, onSave }: { target: Exclude<MediaTarget, null>; bosses: CombatBoss[]; onClose: () => void; onSave: (boss: CombatBoss) => void }) {
  const boss = bosses.find((item) => item.id === target.bossId)!;
  const phase = target.type !== "boss" ? boss.phases.find((item) => item.id === target.phaseId)! : null;
  const attack = target.type === "attack" ? phase!.attacks.find((item) => item.id === target.attackId)! : null;
  const sourceMedia: CombatMediaReference[] = target.type === "boss"
    ? [boss.artwork || { id: "boss-artwork", kind: "In-Game Capture", label: "Boss Artwork", imageUrl: "", notes: "", order: 0 }, ...boss.references]
    : target.type === "phase"
      ? [phase!.artwork || { id: `phase-artwork-${phase!.id}`, kind: "Storyboard", label: `${phase!.name} Artwork`, imageUrl: "", notes: "", order: 0 }]
      : attack!.media;
  const mediaTitle = target.type === "boss" ? `${boss.name} · Artwork & References` : target.type === "phase" ? `${phase!.name} · Phase Artwork` : `${attack!.name} · Storyboard & References`;
  return <ImageManagerModal title={mediaTitle} subtitle="Uses the Cookbook's shared Google Drive image workflow." slots={sourceMedia.map((media) => ({ id: media.id, label: media.label, description: `${media.kind}${media.timestamp ? ` · ${media.timestamp}` : ""}${media.notes ? ` · ${media.notes}` : ""}`, imageUrl: media.imageUrl, imageFit: media.imageFit, webViewLink: media.webViewLink, aspectRatio: target.type === "boss" && media.id === "boss-artwork" ? "16 / 10" : "16 / 9", uploadNameContext: { subjectName: boss.name, categoryName: target.type === "boss" ? "Combat Boss Art" : target.type === "phase" ? `Combat Phase - ${phase!.name}` : `Combat Attack - ${attack!.name}`, slotName: media.label } }))} onClose={onClose} onSave={(slots) => {
    const nextMedia = mergeMedia(sourceMedia, slots);
    if (target.type === "boss") onSave({ ...boss, artwork: nextMedia[0], references: nextMedia.slice(1) });
    else if (target.type === "phase") onSave({ ...boss, phases: boss.phases.map((item) => item.id === phase!.id ? { ...item, artwork: nextMedia[0] } : item) });
    else onSave({ ...boss, phases: boss.phases.map((item) => item.id === phase!.id ? { ...item, attacks: item.attacks.map((candidate) => candidate.id === attack!.id ? { ...candidate, media: nextMedia, updatedAt: new Date().toISOString() } : candidate) } : item) });
  }} />;
}

function CombatHeader({ eyebrow, title, description, icon }: { eyebrow: string; title: string; description: string; icon: string }) { return <section className="combat-header category-header-frame"><span><Icon name={icon} className="h-7 w-7" /></span><div><small>{eyebrow}</small><h1 className="font-display">{title}</h1><p>{description}</p></div></section>; }
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <header className="combat-section-heading"><small>{eyebrow}</small><h2 className="font-display">{title}</h2></header>; }
function InfoBlock({ title, text, icon }: { title: string; text: string; icon?: string }) { return <article className="combat-info-block">{icon && <Icon name={icon} className="h-5 w-5" />}<small>{title}</small><p>{text || "Not documented yet."}</p></article>; }
function ProductionNotes({ title, items }: { title: string; items: [string, unknown][] }) { const visible = items.filter(([, value]) => value !== "" && value !== undefined && value !== null); return <article className="combat-production-block"><h3 className="font-display">{title}</h3>{visible.map(([label, value]) => <div key={label}><small>{titleCase(label)}</small><p>{String(value)}</p></div>)}{!visible.length && <p className="combat-muted">No requirements documented yet.</p>}</article>; }
function ProductionStatusGrid({ production }: { production: CombatAttack["production"] }) { return <section className="combat-production-grid">{combatDisciplines.map((discipline) => <div key={discipline}><span><small>{titleCase(discipline)}</small><b>{production[discipline]}</b></span><i><em style={{ width: `${productionStatusPercent(production[discipline])}%` }} /></i></div>)}</section>; }
function ProductionBoard({ boss }: { boss: CombatBoss }) { const progress = combatBossProgress(boss); return <div className="combat-boss-production"><h3>Production progress from attacks</h3>{combatDisciplines.map((discipline) => <div key={discipline}><span>{titleCase(discipline)} <b>{progress[discipline]}%</b></span><i><em style={{ width: `${progress[discipline]}%` }} /></i></div>)}</div>; }
function ReferenceGallery({ media, empty, onManage }: { media: CombatMediaReference[]; empty: string; onManage?: () => void }) { return <div className="combat-reference-gallery">{media.map((item) => <figure key={item.id}><span>{item.imageUrl ? <DriveAwareImage src={item.imageUrl} alt={item.label} /> : <Icon name="Image" className="h-7 w-7" />}</span><figcaption><small>{item.kind}{item.timestamp ? ` · ${item.timestamp}` : ""}</small><b>{item.label}</b>{item.notes && <p>{item.notes}</p>}</figcaption></figure>)}{!media.length && <div className="combat-reference-empty"><Icon name="Image" className="h-7 w-7" /><p>{empty}</p></div>}{onManage && <button className="combat-add-reference" onClick={onManage}><Icon name="Image" className="h-4 w-4" /> Manage Media</button>}</div>; }
function NestedTextFields({ group, onChange }: { group: Record<string, string>; onChange: (key: string, value: string) => void }) { return <div className="combat-form-grid compact">{Object.entries(group).map(([key, value]) => <Field key={key} label={titleCase(key)}>{key === "notes" ? <textarea value={value} onChange={(e) => onChange(key, e.target.value)} /> : <input value={value} onChange={(e) => onChange(key, e.target.value)} />}</Field>)}</div>; }
function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={`combat-field ${wide ? "wide" : ""}`}><span>{label}</span>{children}</label>; }
function EditorSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="combat-editor-section"><h3 className="font-display">{title}</h3>{children}</section>; }
function EditorShell({ title, wide = false, children, onCancel, onSave }: { title: string; wide?: boolean; children: React.ReactNode; onCancel: () => void; onSave: () => void }) { return <div className="combat-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}><section className={`combat-modal modal-frame ${wide ? "wide" : ""}`} role="dialog" aria-modal="true"><header><div><small>Combat Editor</small><h2 className="font-display">{title}</h2></div><button className="combat-icon-button" onClick={onCancel}><Icon name="X" className="h-5 w-5" /></button></header><div className="combat-modal-content">{children}</div><footer><button className="combat-action" onClick={onCancel}>Cancel</button><button className="button-frame combat-action" onClick={onSave}><Icon name="Save" className="h-4 w-4" /> Save</button></footer></section></div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <section className="combat-empty"><Icon name="Swords" className="h-8 w-8" /><h2 className="font-display">{title}</h2><p>{description}</p></section>; }

function reorder<T extends { id: string; order: number }>(items: T[], id: string, direction: -1 | 1) { const next = [...items].sort((a, b) => a.order - b.order); const index = next.findIndex((item) => item.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= next.length) return next; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, order) => ({ ...item, order })); }
function deleteBoss(boss: CombatBoss, combat: CombatData, save: (data: CombatData) => void) { if (window.confirm(`Delete ${boss.name} and all of its combat documentation?`)) save({ ...combat, bosses: combat.bosses.filter((item) => item.id !== boss.id) }); }
function deletePhase(boss: CombatBoss, phaseId: string, save: (boss: CombatBoss) => void) { const phase = boss.phases.find((item) => item.id === phaseId); if (phase && window.confirm(`Delete ${phase.name} and its ${phase.attacks.length} attacks?`)) save({ ...boss, phases: boss.phases.filter((item) => item.id !== phaseId).map((item, order) => ({ ...item, order })) }); }
function deleteAttack(bossId: string, phase: CombatPhase, attackId: string, save: (bossId: string, phase: CombatPhase) => void) { const attack = phase.attacks.find((item) => item.id === attackId); if (attack && window.confirm(`Delete ${attack.name}?`)) save(bossId, { ...phase, attacks: phase.attacks.filter((item) => item.id !== attackId).map((item, order) => ({ ...item, order })) }); }
function mergeMedia(source: CombatMediaReference[], slots: ImageManagerSlotDraft[]) { return source.map((item) => { const slot = slots.find((candidate) => candidate.id === item.id); return slot ? { ...item, imageUrl: slot.imageUrl, imageFit: slot.imageFit, webViewLink: slot.webViewLink } : item; }); }
function patchMedia(media: CombatMediaReference[], id: string, patch: Partial<CombatMediaReference>) { return media.map((item) => item.id === id ? { ...item, ...patch } : item); }
function toggleList(items: string[], value: string) { return items.includes(value) ? items.filter((item) => item !== value) : [...items, value]; }
function splitList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function splitLines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function optionalInputNumber(value: string) { return value === "" ? undefined : Number(value); }
function formatSeconds(value?: number) { return value === undefined ? "—" : `${value}s`; }
function yesNo(value?: boolean) { return value === undefined ? "Optional" : value ? "Yes" : "No"; }
function rangeLabel(min?: number, max?: number) { return min === undefined && max === undefined ? "" : `${min ?? "—"}m – ${max ?? "—"}m`; }
function slug(value: string) { return value.toLowerCase().replace(/\s+/g, "-"); }
function titleCase(value: string) { return value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase()).trim(); }
function toRoman(value: number) { return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][value - 1] || String(value); }
function formatUpdatedAt(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined }); }
function timelineLane(eventType: string) { const value = eventType.toLowerCase(); if (value.includes("telegraph") || value.includes("cue")) return "Telegraph"; if (value.includes("audio") || value.includes("sound")) return "Audio"; if (value.includes("hitbox")) return "Hitbox"; if (value.includes("projectile")) return "Projectile"; if (value.includes("vfx") || value.includes("effect")) return "VFX"; if (value.includes("recover")) return "Recovery"; if (value.includes("ai") || value.includes("availability")) return "AI"; return "Animation"; }
