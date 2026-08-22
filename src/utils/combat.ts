import type {
  CombatAttack,
  CombatBoss,
  CombatData,
  CombatEnemy,
  CombatMediaReference,
  CombatPhase,
  CombatProductionState,
  CombatProductionStatus
} from "../types";
import { defaultImageFit, normalizeImageFit } from "./imageFit";
import { normalizeSpriteAnimationSlotReference } from "./spriteAnimationSlots";

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

export function createBlankEnemy(): CombatEnemy {
  return normalizeCombatEnemy({
    id: createCombatId("enemy"),
    bestiaryCreatureId: "",
    name: "New Enemy",
    family: "Insects",
    tier: "Standard",
    role: "",
    act: "",
    location: "",
    threatLevel: "",
    summary: "",
    behavior: "",
    teamSynergy: "",
    status: "Not Started",
    attacks: [],
    animationNotes: "",
    references: [],
    tags: [],
    updatedAt: new Date().toISOString()
  });
}

function starterEnemyAttack(value: Partial<CombatAttack>): CombatAttack {
  return normalizeCombatAttack({
    production: createProductionState({ design: "Approved" }),
    media: [],
    timeline: [],
    comments: [],
    history: [],
    updatedAt: "2026-08-21T00:00:00.000Z",
    ...value
  });
}

function createCrayhuskRunMove(): CombatAttack {
  return starterEnemyAttack({
    id: "crayhusk-run",
    internalId: "CH_Run",
    name: "Run",
    order: 0,
    summary: "The Crayhusk runs quickly across the ground to pursue, reposition around, or close distance with the player.",
    purpose: "Defines the creature's core movement speed and gives its melee pressure a readable approach state.",
    playerRead: "Its legs spread into a low, rapid gait while the shell leans toward its travel direction.",
    expectedResponses: ["Reposition"],
    movementSpeed: 7,
    range: "Ground navigation",
    knockback: "None",
    stagger: "None",
    damageType: "Movement",
    blockable: false,
    dodgeable: false,
    parryable: false,
    interruptible: true,
    animation: { assetName: "CH_Run", requiredClips: ["CH_Run"], keyPoses: "Low shell silhouette with fast alternating leg contact.", rootMotion: "Forward ground movement", looping: "Loops while navigating", notes: "Animation playback should scale cleanly with the configured movement speed." },
    developer: { blueprint: "BP_Crayhusk_Run", abilityClass: "Movement", aiBehavior: "Navigate toward the current combat destination", selectionConditions: ["A movement destination is active"], minimumDistance: 0, maximumDistance: 30, attackWeight: 0, phaseAvailability: "Standard kit", notes: "Use the movement speed value as the shared design reference for navigation and animation playback." }
  });
}

function createStarterEnemies(): CombatEnemy[] {
  const crayhuskRun = createCrayhuskRunMove();
  const crayhuskRush = starterEnemyAttack({
    id: "crayhusk-rush-bite",
    internalId: "CH_RushBite",
    name: "Rush Bite",
    order: 1,
    summary: "The Crayhusk rapidly closes the gap and bites the player at melee range.",
    purpose: "Turns the Crayhusk into fast close-range pressure and prevents the player from ignoring it while focusing on flying enemies.",
    playerRead: "It lowers its shell, spreads its legs, and chatters its claws before sprinting in a straight line.",
    expectedResponses: ["Dodge", "Block", "Reposition"],
    damage: 18,
    startup: 0.35,
    activeTime: 0.25,
    recovery: 0.65,
    cooldown: 2.4,
    range: "Short approach into melee",
    knockback: "Low",
    stagger: "Low",
    damageType: "Physical",
    blockable: true,
    dodgeable: true,
    parryable: true,
    interruptible: true,
    animation: { assetName: "CH_RushBite", requiredClips: ["CH_Run", "CH_Bite", "CH_Bite_Recovery"], keyPoses: "Lowered sprint silhouette, open-claw bite, recoil.", rootMotion: "Forward rush", looping: "Run clip loops until attack range", notes: "The run must communicate that the Crayhusk is much faster than its idle movement suggests." },
    developer: { blueprint: "BP_Crayhusk_RushBite", abilityClass: "Melee approach", aiBehavior: "Close distance and bite", selectionConditions: ["Player is outside bite range", "Path to player is clear", "Rush Bite cooldown complete"], minimumDistance: 2, maximumDistance: 9, attackWeight: 1, phaseAvailability: "Standard kit", notes: "Abort or redirect if the path becomes blocked." }
  });
  const crayhuskForage = starterEnemyAttack({
    id: "crayhusk-burrowed-forage",
    internalId: "CH_BurrowedForage",
    name: "Burrowed Forage",
    order: 2,
    summary: "The Crayhusk hops, digs into the ground, and pulls out a rock or vegetable that a Dapplefly can collect and throw.",
    purpose: "Creates shared battlefield ammunition and establishes the Crayhusk/Dapplefly teamwork loop.",
    playerRead: "It hops in place, raises both claws, then plunges into loose soil as the ground shakes around it.",
    expectedResponses: ["Reposition"],
    customResponse: "Interrupt the dig or prepare for a Dapplefly throw",
    startup: 0.75,
    activeTime: 1.2,
    recovery: 0.6,
    cooldown: 7,
    range: "Self / ground interaction",
    knockback: "None",
    stagger: "None",
    damageType: "Utility",
    blockable: false,
    dodgeable: false,
    parryable: false,
    interruptible: true,
    animation: { assetName: "CH_BurrowedForage", requiredClips: ["CH_Dig_Start", "CH_Dig_Loop", "CH_Dig_Pullout"], keyPoses: "Hop, claws-first burrow, object lift.", rootMotion: "Short vertical hop", looping: "Dig loop can hold briefly", notes: "The pulled object must land in a clearly readable pickup state." },
    developer: { blueprint: "BP_Crayhusk_BurrowedForage", abilityClass: "Team utility", aiBehavior: "Generate throwable pickup for allied Dappleflies", selectionConditions: ["A Dapplefly ally is active", "No unclaimed throwable pickup is nearby", "Loose ground is available"], minimumDistance: 0, maximumDistance: 0, attackWeight: 0.65, phaseAvailability: "Standard kit", notes: "Spawn either a rock or a vegetable as a shared ThrowablePickup actor tagged for Dapplefly AI." }
  });
  const dappleflyPickup = starterEnemyAttack({
    id: "dapplefly-scavenge-pickup",
    internalId: "DF_ScavengePickup",
    name: "Scavenge Pickup",
    order: 0,
    summary: "The Dapplefly searches for a loose rock or vegetable, dives to the ground, and carries it into the air.",
    purpose: "Converts objects created by Crayhusks or found in the arena into readable ranged pressure.",
    playerRead: "It pauses in the air, turns toward a nearby pickup, and dives with its legs extended.",
    expectedResponses: ["Reposition"],
    customResponse: "Pressure the Dapplefly before it secures the object",
    startup: 0.45,
    activeTime: 0.9,
    recovery: 0.35,
    cooldown: 1.5,
    range: "Nearest throwable pickup",
    knockback: "None",
    stagger: "None",
    damageType: "Utility",
    blockable: false,
    dodgeable: false,
    parryable: false,
    interruptible: true,
    animation: { assetName: "DF_ScavengePickup", requiredClips: ["DF_Fly", "DF_Dive", "DF_Pickup", "DF_Carry"], keyPoses: "Hover search, dive silhouette, grasp, weighted carry flight.", rootMotion: "Flying path", looping: "Fly and carry loops", notes: "The held object must remain visible beneath the Dapplefly." },
    developer: { blueprint: "BP_Dapplefly_ScavengePickup", abilityClass: "Object interaction", aiBehavior: "Claim nearest available throwable", selectionConditions: ["Dapplefly is not carrying an object", "ThrowablePickup exists", "Pickup is not reserved by another Dapplefly"], minimumDistance: 0, maximumDistance: 20, attackWeight: 1, phaseAvailability: "Standard kit", notes: "Reserve the target pickup during the dive so two Dappleflies do not claim the same object." }
  });
  const dappleflyThrow = starterEnemyAttack({
    id: "dapplefly-arcing-throw",
    internalId: "DF_ArcingThrow",
    name: "Arcing Throw",
    order: 1,
    summary: "While carrying an object, the Dapplefly throws it toward the player along a visible arc with a marked landing point.",
    purpose: "Adds dodgeable aerial pressure without creating an unreadable off-screen projectile.",
    playerRead: "The Dapplefly hovers, pulls the object backward, and draws a visible trajectory arc and landing marker before release.",
    expectedResponses: ["Dodge", "Leave marked area"],
    damage: 16,
    startup: 0.8,
    activeTime: 1.1,
    recovery: 0.7,
    cooldown: 3.5,
    range: "Medium to long arc",
    knockback: "Low",
    stagger: "Low",
    damageType: "Physical projectile",
    blockable: true,
    dodgeable: true,
    parryable: false,
    interruptible: true,
    vfx: { windup: "Trajectory arc and landing marker fade in", attack: "Object release trail", projectile: "Readable rock or vegetable trail", impact: "Dirt burst or vegetable splatter", environmental: "Landing decal", notes: "The arc and landing point must remain visible against grass, mud, and corrupted ground." },
    animation: { assetName: "DF_ArcingThrow", requiredClips: ["DF_Throw_Windup", "DF_Throw_Release", "DF_Throw_Recovery"], keyPoses: "Weighted hover, backward windup, forward release.", rootMotion: "Hover in place", looping: "No", notes: "Keep the carried object readable throughout the windup." },
    developer: { blueprint: "BP_Dapplefly_ArcingThrow", abilityClass: "Ballistic projectile", aiBehavior: "Lead player position and throw carried object", selectionConditions: ["Dapplefly is carrying a ThrowablePickup", "Player is in throw range", "Line of arc is unobstructed"], minimumDistance: 5, maximumDistance: 18, attackWeight: 1, phaseAvailability: "Standard kit", notes: "Display a predicted ballistic spline and ground impact marker during startup; release toward the locked target point." }
  });
  const prawnhuskSlam = starterEnemyAttack({
    id: "prawnhusk-ground-slam",
    internalId: "PH_GroundSlamShockwave",
    name: "Ground Slam Shockwave",
    order: 0,
    summary: "The Prawnhusk winds up and slams the ground, sending a circular shockwave through the arena.",
    purpose: "Forces the player to dash out during the windup and dash back in through the recovery window.",
    playerRead: "It rises high on its rear legs, lifts both claws, and holds for a clear beat before crashing down.",
    expectedResponses: ["Dodge", "Reposition"],
    customResponse: "Dash away, then dash back during recovery",
    damage: 35,
    startup: 1.05,
    activeTime: 0.55,
    recovery: 1.25,
    cooldown: 5.5,
    range: "Circular close-to-medium AOE",
    knockback: "High",
    stagger: "High",
    damageType: "Physical shockwave",
    blockable: true,
    dodgeable: true,
    parryable: false,
    interruptible: false,
    animation: { assetName: "PH_GroundSlam", requiredClips: ["PH_Slam_Windup", "PH_Slam_Impact", "PH_Slam_Recovery"], keyPoses: "Raised armored silhouette, full-body impact, exposed recovery.", rootMotion: "Stationary", looping: "No", notes: "Give the recovery enough exposure to reward dashing back in." },
    developer: { blueprint: "BP_Prawnhusk_GroundSlam", abilityClass: "AOE shockwave", aiBehavior: "Close-range space clear", selectionConditions: ["Player is within shockwave radius", "Ground Slam cooldown complete"], minimumDistance: 0, maximumDistance: 7, attackWeight: 1, phaseAvailability: "Elite kit", notes: "Spawn a radial ground shockwave on impact with a brief punish window after it clears." }
  });
  const prawnhuskParry = starterEnemyAttack({
    id: "prawnhusk-shell-parry",
    internalId: "PH_ShellParry",
    name: "Shell Parry",
    order: 1,
    summary: "The Prawnhusk raises its armored shell; striking it during the guard stuns the player briefly.",
    purpose: "Punishes repeated attacks and teaches the player to read defensive states instead of attacking continuously.",
    playerRead: "It turns its shell toward the player, plants its legs, and produces a hard shell-glint cue.",
    expectedResponses: ["Reposition"],
    customResponse: "Stop attacking and wait for the guard to drop",
    startup: 0.35,
    activeTime: 1.4,
    recovery: 0.55,
    cooldown: 6,
    range: "Self defense",
    knockback: "Counter recoil",
    stagger: "Player stun on contact",
    damageType: "Defensive counter",
    blockable: false,
    dodgeable: false,
    parryable: false,
    interruptible: false,
    animation: { assetName: "PH_ShellParry", requiredClips: ["PH_Guard_Raise", "PH_Guard_Hold", "PH_Guard_Counter", "PH_Guard_Lower"], keyPoses: "Shell-forward brace, impact counter, guard release.", rootMotion: "Stationary", looping: "Guard hold can loop", notes: "The shell-up state must be unmistakable from the player camera." },
    developer: { blueprint: "BP_Prawnhusk_ShellParry", abilityClass: "Reactive defense", aiBehavior: "Guard against expected melee pressure", selectionConditions: ["Player has attacked repeatedly at close range", "Shell Parry cooldown complete"], minimumDistance: 0, maximumDistance: 4, attackWeight: 0.7, phaseAvailability: "Elite kit", notes: "Melee hits during the active guard apply a short player stun and recoil; do not punish projectiles identically unless later approved." }
  });
  const prawnhuskCharge = starterEnemyAttack({
    id: "prawnhusk-armored-charge",
    internalId: "PH_ArmoredCharge",
    name: "Armored Charge",
    order: 2,
    summary: "The Prawnhusk lines up with the player and charges forward behind its armored shell.",
    purpose: "Creates a direct lane threat and gives the player a clean lateral-dodge test.",
    playerRead: "It scrapes the ground, lowers its shell, and locks its body into a straight charging line.",
    expectedResponses: ["Dodge", "Reposition"],
    damage: 28,
    startup: 0.7,
    activeTime: 1.15,
    recovery: 1,
    cooldown: 4.5,
    range: "Long straight line",
    knockback: "High",
    stagger: "Medium",
    damageType: "Physical",
    blockable: true,
    dodgeable: true,
    parryable: false,
    interruptible: false,
    animation: { assetName: "PH_ArmoredCharge", requiredClips: ["PH_Charge_Tell", "PH_Charge_Loop", "PH_Charge_Stop"], keyPoses: "Ground scrape, shell-forward sprint, braking skid.", rootMotion: "Fast forward charge", looping: "Charge loop", notes: "Maintain the lane tell long enough for a deliberate side dash." },
    developer: { blueprint: "BP_Prawnhusk_ArmoredCharge", abilityClass: "Linear charge", aiBehavior: "Commit to player-facing lane", selectionConditions: ["Player is outside melee range", "Straight path is available", "Charge cooldown complete"], minimumDistance: 5, maximumDistance: 16, attackWeight: 1, phaseAvailability: "Elite kit", notes: "Lock the target lane near the end of startup so the player can dodge perpendicular to it." }
  });

  return [
    normalizeCombatEnemy({ id: "crayhusk", name: "Crayhusk", family: "Insects", tier: "Standard", role: "Fast melee support", act: "Act I — The Queen Beneath the Frost", location: "Whisker Woods and Kap's Pond", threatLevel: "Standard enemy", summary: "A fast ground insect that rushes the player and digs up ammunition for allied Dappleflies.", behavior: "Runs quickly toward the player for a close-range bite. When supported by a Dapplefly, it can jump, burrow into loose ground, and pull out a rock or vegetable for the flyer to collect.", teamSynergy: "Crayhusks create shared ThrowablePickup objects. Dappleflies reserve, collect, and throw those objects, turning the pair into a coordinated ground-and-air threat.", status: "In Progress", attacks: [crayhuskRun, crayhuskRush, crayhuskForage], animationNotes: "Requires idle, fast run, bite, jump, dig start/loop/end, hit reaction, and defeat animation sets.", references: [], tags: ["Insects", "Whisker Woods", "Melee", "Team Utility"], updatedAt: "2026-08-21T00:00:00.000Z" }),
    normalizeCombatEnemy({ id: "dapplefly", name: "Dapplefly", family: "Insects", tier: "Standard", role: "Flying ranged support", act: "Act I — The Queen Beneath the Frost", location: "Whisker Woods and Kap's Pond", threatLevel: "Standard enemy", summary: "A flying insect that scavenges loose objects and throws them at the player along a clearly telegraphed arc.", behavior: "Circles above the encounter until it sees the player and an available object. It dives, picks the object up, gains altitude, then displays its throw arc and landing marker before releasing.", teamSynergy: "Prioritizes rocks and vegetables unearthed by Crayhusks, but can also use approved throwable objects already placed in the environment.", status: "In Progress", attacks: [dappleflyPickup, dappleflyThrow], animationNotes: "Requires idle flight, travel flight, search hover, dive, pickup, weighted carry, throw, hit reaction, and defeat animations.", references: [], tags: ["Insects", "Whisker Woods", "Flying", "Projectile", "Team Utility"], updatedAt: "2026-08-21T00:00:00.000Z" }),
    normalizeCombatEnemy({ id: "prawnhusk", name: "Prawnhusk", family: "Insects", tier: "Elite", role: "Armored elite bruiser", act: "Act I — The Queen Beneath the Frost", location: "Kap's Corrupted Pond", threatLevel: "Elite encounter", summary: "A heavily armored insect elite that controls space with a slam, punishes reckless attacks with its shell, and charges across the arena.", behavior: "Alternates between deliberate area pressure and armored defense. Its tells are larger than a standard enemy's, but failed reads carry stronger knockback and stun consequences.", teamSynergy: "Acts as the center of an insect encounter while standard insects create movement pressure around its slow, high-impact attacks.", status: "In Progress", attacks: [prawnhuskSlam, prawnhuskParry, prawnhuskCharge], animationNotes: "Requires elite idle, locomotion, slam, shell guard/parry, charge, hit reaction, stagger, and defeat animation sets.", references: [], tags: ["Insects", "Elite", "Kap's Pond", "Armored", "Act I"], updatedAt: "2026-08-21T00:00:00.000Z" })
  ];
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
    schemaVersion: 3,
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
    enemies: createStarterEnemies(),
    enemiesNotes: "Document regular enemy combat kits here as the Combat library expands.",
    playerCombatNotes: "Document Gwen's weapons, movement, defense, meals, and player-facing combat rules here.",
    combatSystemsNotes: "Document shared systems such as damage, stagger, targeting, AI selection, hit reactions, and elemental interactions here.",
    updatedAt: "2026-08-20T00:00:00.000Z"
  });
}

export function normalizeCombatData(value: unknown): CombatData {
  const source = value && typeof value === "object" ? value as Partial<CombatData> : {};
  const sourceVersion = numberOr(source.schemaVersion, 1);
  return {
    schemaVersion: 3,
    bosses: Array.isArray(source.bosses) ? source.bosses.map((boss) => normalizeCombatBoss(boss)) : [],
    enemies: Array.isArray(source.enemies)
      ? migrateCombatEnemies(source.enemies.map((enemy) => normalizeCombatEnemy(enemy)), sourceVersion)
      : sourceVersion < 2 ? createStarterEnemies() : [],
    enemiesNotes: text(source.enemiesNotes),
    playerCombatNotes: text(source.playerCombatNotes),
    combatSystemsNotes: text(source.combatSystemsNotes),
    updatedAt: text(source.updatedAt) || new Date().toISOString()
  };
}

function migrateCombatEnemies(enemies: CombatEnemy[], sourceVersion: number) {
  if (sourceVersion >= 3) return enemies;
  return enemies.map((enemy) => {
    const hasRunMove = enemy.attacks.some((attack) => attack.id === "crayhusk-run" || normalizedEnemyName(attack.name) === "run");
    if (normalizedEnemyName(enemy.name) !== "crayhusk" || hasRunMove) return enemy;
    return { ...enemy, attacks: [createCrayhuskRunMove(), ...enemy.attacks].map((attack, order) => ({ ...attack, order })) };
  });
}

function normalizedEnemyName(value: unknown) {
  return text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeCombatEnemy(value: Partial<CombatEnemy>): CombatEnemy {
  return {
    id: text(value.id) || createCombatId("enemy"),
    bestiaryCreatureId: text(value.bestiaryCreatureId),
    name: text(value.name) || "Untitled Enemy",
    family: text(value.family) || "Uncategorized",
    tier: value.tier === "Elite" ? "Elite" : "Standard",
    role: text(value.role),
    act: text(value.act),
    location: text(value.location),
    threatLevel: text(value.threatLevel),
    summary: text(value.summary),
    behavior: text(value.behavior),
    teamSynergy: text(value.teamSynergy),
    status: normalizeProductionStatus(value.status),
    artwork: value.artwork ? normalizeCombatMedia(value.artwork, 0) : undefined,
    attacks: Array.isArray(value.attacks) ? value.attacks.map(normalizeCombatAttack).sort(byOrder) : [],
    animationNotes: text(value.animationNotes),
    references: Array.isArray(value.references) ? value.references.map(normalizeCombatMedia).sort(byOrder) : [],
    tags: stringList(value.tags),
    updatedAt: text(value.updatedAt) || new Date().toISOString()
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
    damage: optionalNumber(value.damage), startup: optionalNumber(value.startup), activeTime: optionalNumber(value.activeTime), recovery: optionalNumber(value.recovery), cooldown: optionalNumber(value.cooldown), movementSpeed: optionalNumber(value.movementSpeed),
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
    imageUrl: text(value.imageUrl), webViewLink: text(value.webViewLink) || undefined, imageFit: normalizeImageFit(value.imageFit || defaultImageFit), spriteAnimation: normalizeSpriteAnimationSlotReference(value.spriteAnimation), timestamp: text(value.timestamp) || undefined,
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
