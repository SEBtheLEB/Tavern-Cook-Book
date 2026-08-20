import type {
  CombatAttack,
  CombatBoss,
  CombatData,
  CombatMediaReference,
  CombatPhase,
  CombatProductionState,
  CombatProductionStatus
} from "../types";
import { defaultImageFit, normalizeImageFit } from "./imageFit";

const productionStatuses: CombatProductionStatus[] = ["Not Started", "In Progress", "Review", "Approved", "Complete", "Blocked"];

export const combatProductionStatuses = productionStatuses;
export const combatDisciplines = ["design", "code", "animation", "vfx", "audio", "balance"] as const;

export function createCombatId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProductionState(value: Partial<CombatProductionState> = {}): CombatProductionState {
  return {
    design: normalizeProductionStatus(value.design),
    code: normalizeProductionStatus(value.code),
    animation: normalizeProductionStatus(value.animation),
    vfx: normalizeProductionStatus(value.vfx),
    audio: normalizeProductionStatus(value.audio),
    balance: normalizeProductionStatus(value.balance)
  };
}

export function createBlankAttack(order = 0): CombatAttack {
  return normalizeCombatAttack({
    id: createCombatId("attack"),
    internalId: "",
    name: "New Attack",
    order,
    summary: "",
    purpose: "",
    playerRead: "",
    expectedResponses: [],
    customResponse: "",
    range: "",
    knockback: "",
    stagger: "",
    damageType: "",
    production: createProductionState(),
    media: [],
    timeline: [],
    comments: [],
    history: [],
    updatedAt: new Date().toISOString()
  });
}

export function createBlankPhase(order = 0): CombatPhase {
  return normalizeCombatPhase({
    id: createCombatId("phase"),
    name: `Phase ${order + 1}`,
    order,
    healthRange: "",
    behavior: "",
    arenaNotes: "",
    designNotes: "",
    attacks: []
  });
}

export function createBlankBoss(): CombatBoss {
  return normalizeCombatBoss({
    id: createCombatId("boss"),
    name: "New Boss",
    classification: "Main Boss",
    act: "",
    location: "",
    difficulty: "",
    primaryDamageType: "",
    summary: "",
    overview: "",
    status: "Not Started",
    phases: [createBlankPhase(0)],
    animationNotes: "",
    balanceNotes: "",
    references: [],
    tags: [],
    updatedAt: new Date().toISOString()
  });
}

export function createStarterCombatData(): CombatData {
  const frostSweep = normalizeCombatAttack({
    id: "ice-queen-frost-sweep",
    internalId: "IQ_P1_FrostSweep",
    name: "Frost Sweep",
    order: 0,
    summary: "The Ice Queen sweeps her arm across the arena and releases a horizontal wave of ice toward the player.",
    purpose: "Prevents the player from remaining directly in front of the Ice Queen and encourages jumping.",
    playerRead: "The Ice Queen raises her right arm and frost begins collecting around it.",
    expectedResponses: ["Jump", "Dodge"],
    customResponse: "",
    damage: 35,
    startup: 0.8,
    activeTime: 1.4,
    recovery: 1.1,
    cooldown: 6,
    range: "Long",
    knockback: "Medium",
    stagger: "Low",
    damageType: "Ice",
    blockable: true,
    dodgeable: true,
    parryable: false,
    interruptible: false,
    production: createProductionState({ design: "Approved", code: "In Progress", animation: "In Progress" }),
    media: [
      { id: "iq-frost-frame-1", kind: "Keyframe", label: "Windup", imageUrl: "", notes: "Right arm rises as frost gathers.", timestamp: "0.0s", order: 0 },
      { id: "iq-frost-frame-2", kind: "Keyframe", label: "Strike", imageUrl: "", notes: "The sweeping motion begins.", timestamp: "0.7s", order: 1 },
      { id: "iq-frost-frame-3", kind: "Keyframe", label: "Ice Wave", imageUrl: "", notes: "The horizontal wave crosses the arena.", timestamp: "1.0s", order: 2 },
      { id: "iq-frost-frame-4", kind: "Keyframe", label: "Recovery", imageUrl: "", notes: "The Queen returns to neutral.", timestamp: "2.1s", order: 3 }
    ],
    timeline: [
      { id: "iq-frost-event-1", timestamp: 0, label: "Animation begins", eventType: "Animation", notes: "Begin windup clip." },
      { id: "iq-frost-event-2", timestamp: 0.15, label: "Telegraph begins", eventType: "Telegraph", notes: "Frost gathers around the raised arm." },
      { id: "iq-frost-event-3", timestamp: 0.8, label: "Hitbox activates", eventType: "Gameplay", notes: "Spawn the horizontal ice wave." },
      { id: "iq-frost-event-4", timestamp: 2.2, label: "Recovery begins", eventType: "AI", notes: "AI can prepare the next decision." }
    ],
    animation: {
      assetName: "IQ_FrostSweep",
      requiredClips: ["IQ_FrostSweep_Windup", "IQ_FrostSweep_Attack", "IQ_FrostSweep_Recovery"],
      keyPoses: "Raised-arm anticipation, full sweep, follow-through, neutral recovery.",
      rootMotion: "Stationary",
      looping: "No",
      notes: "Keep the anticipation silhouette clear from the player camera."
    },
    vfx: { windup: "Frost gathering on right arm", attack: "Wide ice arc", projectile: "Horizontal ice wave", impact: "Ice burst", environmental: "Brief frost trail", notes: "" },
    audio: { charge: "Ice charge", swing: "Heavy frozen sweep", projectile: "Traveling frost", impact: "Ice crack", vocalization: "Attack exertion", environmental: "Arena frost response", notes: "" },
    developer: {
      blueprint: "BP_IceQueen_FrostSweep",
      abilityClass: "",
      aiBehavior: "Long-range pressure attack",
      selectionConditions: ["Player distance > 4m", "Player distance < 14m", "Frost Sweep cooldown complete", "Ice Wall attack is not currently active"],
      minimumDistance: 4,
      maximumDistance: 14,
      attackWeight: 1,
      phaseAvailability: "Phase 1",
      notes: ""
    },
    comments: [],
    history: [],
    updatedAt: "2026-08-20T00:00:00.000Z"
  });

  return normalizeCombatData({
    bosses: [{
      id: "ice-queen",
      name: "Ice Queen",
      classification: "Main Boss",
      act: "Act I — The Queen Beneath the Frost",
      location: "Frozen Insect Hive, Whisker Woods",
      health: 3000,
      difficulty: "Act Finale",
      primaryDamageType: "Ice",
      summary: "The ruler of the frozen insect swarm and the climactic boss of Act I.",
      overview: "The Ice Queen transforms Whisker Woods into a frozen hive and tests every combat lesson Gwen has learned during the act.",
      status: "In Progress",
      phases: [
        { id: "ice-queen-phase-1", name: "The Frozen Monarch", order: 0, healthRange: "100% → 70%", behavior: "Controls space with readable ice attacks and insect support.", arenaNotes: "Keep the center lane readable for Frost Sweep.", designNotes: "Establish the Queen's authority before the fight becomes more graceful and aggressive.", attacks: [frostSweep] },
        { id: "ice-queen-phase-2", name: "The Frozen Stage", order: 1, healthRange: "70% → 35%", behavior: "The arena becomes more restrictive as ice hazards overlap.", arenaNotes: "Introduce rotating safe zones.", designNotes: "Escalate movement demands without hiding attack telegraphs.", attacks: [] },
        { id: "ice-queen-phase-3", name: "Ballerina of the Blizzard", order: 2, healthRange: "35% → 0%", behavior: "Graceful, dance-like attack strings turn the arena into a frozen stage.", arenaNotes: "Preserve a clean silhouette during spins.", designNotes: "Beauty and danger should peak together.", attacks: [] }
      ],
      animationNotes: "Phase 3 movement should feel composed and dance-like rather than frantic.",
      balanceNotes: "Use Phase 1 to teach the visual language before layering hazards in later phases.",
      references: [],
      tags: ["Act I", "Ice", "Insect", "Recipe Boss"],
      updatedAt: "2026-08-20T00:00:00.000Z"
    }],
    enemiesNotes: "Document regular enemy combat kits here as the Combat library expands.",
    playerCombatNotes: "Document Gwen's weapons, movement, defense, meals, and player-facing combat rules here.",
    combatSystemsNotes: "Document shared systems such as damage, stagger, targeting, AI selection, hit reactions, and elemental interactions here.",
    updatedAt: "2026-08-20T00:00:00.000Z"
  });
}

export function normalizeCombatData(value: unknown): CombatData {
  const source = value && typeof value === "object" ? value as Partial<CombatData> : {};
  return {
    bosses: Array.isArray(source.bosses) ? source.bosses.map((boss) => normalizeCombatBoss(boss)) : [],
    enemiesNotes: text(source.enemiesNotes),
    playerCombatNotes: text(source.playerCombatNotes),
    combatSystemsNotes: text(source.combatSystemsNotes),
    updatedAt: text(source.updatedAt) || new Date().toISOString()
  };
}

export function normalizeCombatBoss(value: Partial<CombatBoss>): CombatBoss {
  return {
    id: text(value.id) || createCombatId("boss"),
    name: text(value.name) || "Untitled Boss",
    classification: ["Main Boss", "Mini Boss", "Elite Encounter", "Tutorial Boss"].includes(text(value.classification)) ? value.classification! : "Main Boss",
    act: text(value.act), location: text(value.location), health: optionalNumber(value.health), difficulty: text(value.difficulty),
    primaryDamageType: text(value.primaryDamageType), summary: text(value.summary), overview: text(value.overview),
    status: normalizeProductionStatus(value.status),
    artwork: value.artwork ? normalizeCombatMedia(value.artwork, 0) : undefined,
    phases: Array.isArray(value.phases) ? value.phases.map(normalizeCombatPhase).sort(byOrder) : [],
    animationNotes: text(value.animationNotes), balanceNotes: text(value.balanceNotes),
    references: Array.isArray(value.references) ? value.references.map(normalizeCombatMedia).sort(byOrder) : [],
    tags: stringList(value.tags), updatedAt: text(value.updatedAt) || new Date().toISOString()
  };
}

export function normalizeCombatPhase(value: Partial<CombatPhase>): CombatPhase {
  return {
    id: text(value.id) || createCombatId("phase"), name: text(value.name) || "Untitled Phase", order: numberOr(value.order, 0),
    healthRange: text(value.healthRange), behavior: text(value.behavior), arenaNotes: text(value.arenaNotes), designNotes: text(value.designNotes),
    artwork: value.artwork ? normalizeCombatMedia(value.artwork, 0) : undefined,
    attacks: Array.isArray(value.attacks) ? value.attacks.map(normalizeCombatAttack).sort(byOrder) : []
  };
}

export function normalizeCombatAttack(value: Partial<CombatAttack>): CombatAttack {
  const animation = value.animation || {} as CombatAttack["animation"];
  const vfx = value.vfx || {} as CombatAttack["vfx"];
  const audio = value.audio || {} as CombatAttack["audio"];
  const developer = value.developer || {} as CombatAttack["developer"];
  return {
    id: text(value.id) || createCombatId("attack"), internalId: text(value.internalId), name: text(value.name) || "Untitled Attack", order: numberOr(value.order, 0),
    summary: text(value.summary), purpose: text(value.purpose), playerRead: text(value.playerRead), expectedResponses: stringList(value.expectedResponses), customResponse: text(value.customResponse),
    damage: optionalNumber(value.damage), startup: optionalNumber(value.startup), activeTime: optionalNumber(value.activeTime), recovery: optionalNumber(value.recovery), cooldown: optionalNumber(value.cooldown),
    range: text(value.range), knockback: text(value.knockback), stagger: text(value.stagger), damageType: text(value.damageType),
    blockable: optionalBoolean(value.blockable), dodgeable: optionalBoolean(value.dodgeable), parryable: optionalBoolean(value.parryable), interruptible: optionalBoolean(value.interruptible),
    production: createProductionState(value.production),
    media: Array.isArray(value.media) ? value.media.map(normalizeCombatMedia).sort(byOrder) : [],
    timeline: Array.isArray(value.timeline) ? value.timeline.map((event) => ({ id: text(event.id) || createCombatId("event"), timestamp: numberOr(event.timestamp, 0), label: text(event.label), eventType: text(event.eventType), notes: text(event.notes) })).sort((a, b) => a.timestamp - b.timestamp) : [],
    animation: { assetName: text(animation.assetName), requiredClips: stringList(animation.requiredClips), keyPoses: text(animation.keyPoses), rootMotion: text(animation.rootMotion), looping: text(animation.looping), notes: text(animation.notes) },
    vfx: { windup: text(vfx.windup), attack: text(vfx.attack), projectile: text(vfx.projectile), impact: text(vfx.impact), environmental: text(vfx.environmental), notes: text(vfx.notes) },
    audio: { charge: text(audio.charge), swing: text(audio.swing), projectile: text(audio.projectile), impact: text(audio.impact), vocalization: text(audio.vocalization), environmental: text(audio.environmental), notes: text(audio.notes) },
    developer: { blueprint: text(developer.blueprint), abilityClass: text(developer.abilityClass), aiBehavior: text(developer.aiBehavior), selectionConditions: stringList(developer.selectionConditions), minimumDistance: optionalNumber(developer.minimumDistance), maximumDistance: optionalNumber(developer.maximumDistance), attackWeight: optionalNumber(developer.attackWeight), phaseAvailability: text(developer.phaseAvailability), notes: text(developer.notes) },
    comments: Array.isArray(value.comments) ? value.comments.map((comment) => ({ id: text(comment.id) || createCombatId("comment"), author: text(comment.author), authorEmail: text(comment.authorEmail), text: text(comment.text), createdAt: text(comment.createdAt) || new Date().toISOString() })) : [],
    history: Array.isArray(value.history) ? value.history.map((item) => ({ id: text(item.id) || createCombatId("history"), message: text(item.message), createdAt: text(item.createdAt) || new Date().toISOString() })) : [],
    updatedAt: text(value.updatedAt) || new Date().toISOString()
  };
}

export function normalizeCombatMedia(value: Partial<CombatMediaReference>, index = 0): CombatMediaReference {
  const kinds = ["Rough Sketch", "Storyboard", "Keyframe", "Animation Reference", "Final Animation", "VFX Reference", "In-Game Capture", "Hitbox Reference"];
  return {
    id: text(value.id) || createCombatId("media"), kind: kinds.includes(text(value.kind)) ? value.kind! : "Keyframe", label: text(value.label) || `Reference ${index + 1}`,
    imageUrl: text(value.imageUrl), webViewLink: text(value.webViewLink) || undefined, imageFit: normalizeImageFit(value.imageFit || defaultImageFit), timestamp: text(value.timestamp) || undefined,
    notes: text(value.notes), order: numberOr(value.order, index)
  };
}

export function combatBossProgress(boss: CombatBoss) {
  const attacks = boss.phases.flatMap((phase) => phase.attacks);
  return Object.fromEntries(combatDisciplines.map((discipline) => {
    if (!attacks.length) return [discipline, 0];
    const total = attacks.reduce((sum, attack) => sum + productionStatusPercent(attack.production[discipline]), 0);
    return [discipline, Math.round(total / attacks.length)];
  })) as Record<(typeof combatDisciplines)[number], number>;
}

export function productionStatusPercent(status: CombatProductionStatus) {
  return ({ "Not Started": 0, "In Progress": 35, Review: 70, Approved: 90, Complete: 100, Blocked: 20 })[status];
}

function normalizeProductionStatus(value: unknown): CombatProductionStatus {
  return productionStatuses.includes(value as CombatProductionStatus) ? value as CombatProductionStatus : "Not Started";
}
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function numberOr(value: unknown, fallback: number) { const next = Number(value); return Number.isFinite(next) ? next : fallback; }
function optionalNumber(value: unknown) { if (value === "" || value === null || value === undefined) return undefined; const next = Number(value); return Number.isFinite(next) ? next : undefined; }
function optionalBoolean(value: unknown) { return typeof value === "boolean" ? value : undefined; }
function stringList(value: unknown) { return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : []; }
function byOrder<T extends { order: number }>(a: T, b: T) { return a.order - b.order; }
