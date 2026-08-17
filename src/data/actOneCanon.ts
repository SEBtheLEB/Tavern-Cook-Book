import type {
  BestiaryCreature,
  LoreEntry,
  StoryJourneyChapterRecord,
  StoryJourneyData,
  WorldBuildingCategoryId,
  WorldBuildingData,
  WorldBuildingEntry
} from "../types";
import { normalizeBestiaryCreature } from "../utils/bestiary";
import { normalizeEntry, slugify } from "../utils/entries";
import { normalizeStoryJourneyData, normalizeStoryJourneyChapter } from "../utils/storyJourneyData";
import { normalizeWorldBuilding, normalizeWorldBuildingEntry } from "../utils/worldBuilding";
import { markdownToRichText, revisedActOneStoryChapters } from "./actOneNarrative";

const ACT_ONE_STAMP = "2026-08-16T12:00:00.000Z";
export const LEGACY_ACT_ONE_CHAPTER_ID = "act-one-whisker-woods";

type ChapterInput = {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  relatedLore: string[];
  playerKnowledge: string;
  consequence: string;
  revealLevel?: StoryJourneyChapterRecord["revealLevel"];
  detailedText?: string;
  developerNotes?: string;
  additionalPages?: Array<{
    id: string;
    title: string;
    text: string;
    relatedLore: string[];
    playerKnowledge: string;
    consequence: string;
  }>;
};

const sourceTypeFor = (label: string) => {
  if (/woods|pond|tavern|academy|kingdom|ovenhold|osul|island|hive|cavern|gate/i.test(label)) return "worldBuilding" as const;
  if (/prawnhusk|boar|thairrott|queen|insect|crayhusk|dapplefl/i.test(label)) return "creature" as const;
  return "entry" as const;
};

const makeChapter = (input: ChapterInput, order: number): StoryJourneyChapterRecord => {
  const start = 70 + (order - 1) * (12 / 34);
  const pageId = `${input.id}-sequence-1`;
  const pageRecords = [
    {
      id: pageId,
      title: input.title,
      text: input.text,
      detailedText: input.detailedText,
      relatedLore: input.relatedLore,
      playerKnowledge: input.playerKnowledge,
      consequence: input.consequence
    },
    ...(input.additionalPages || []).map((page) => ({ ...page, detailedText: undefined }))
  ];
  return normalizeStoryJourneyChapter({
    id: input.id,
    title: input.title,
    subtitle: input.subtitle,
    timelineStartLabel: `Act I · Chapter ${order}`,
    timelineEndLabel: `Act I · Chapter ${order}`,
    timelineStartPercent: start,
    timelineEndPercent: Math.min(82, start + 0.3),
    era: "Act I — The Queen Beneath the Frost",
    scope: "act1",
    revealLevel: input.revealLevel || "Player-Facing",
    shortDescription: input.subtitle,
    overviewText: input.text.split("\n\n")[0],
    relatedLore: input.relatedLore,
    threads: ["Gwen", "Act I", ...input.relatedLore.slice(0, 4)],
    sourceRecords: input.relatedLore.map((label) => ({
      type: sourceTypeFor(label),
      id: slugify(label),
      label
    })),
    developerNotes: input.developerNotes,
    pages: pageRecords.map((page) => ({
      id: page.id,
      title: page.title,
      text: page.text,
      detailedText: page.detailedText,
      relatedLore: page.relatedLore,
      threads: ["Gwen", "Act I", ...input.relatedLore.slice(0, 4)],
      callouts: [
        {
          id: `${page.id}-knowledge`,
          kind: "playerKnowledge",
          label: "Player knowledge",
          text: page.playerKnowledge
        },
        {
          id: `${page.id}-consequence`,
          kind: "consequence",
          label: "Story consequence",
          text: page.consequence
        }
      ],
      sourceRecords: page.relatedLore.map((label) => ({
        type: sourceTypeFor(label),
        id: slugify(label),
        label
      }))
    }))
  }, input.id);
};

const actOneChapterInputs: ChapterInput[] = [
  {
    id: "act1-final-test",
    title: "The Final Test",
    subtitle: "Gwen earns the title of chef before choosing where she belongs.",
    text: "After roughly two years of practical apprenticeship under the legendary Whisken chef Tohm Kyatt, Gwen returns to the Culinary Imperial Academy of Unhold for the final stage of her education. The apprenticeship made her capable, but it did not make her officially qualified. To graduate, she must conceptualize, prepare, cook, and present a dish of her own design before the Academy judges.\n\nThe test asks more than whether she can follow instructions. Gwen must show judgment, technique, and a culinary identity shaped by both formal Academy discipline and Tohm's improvisational teaching. The judges taste her dish and pass her. Gwen leaves the examination as a newly qualified chef, carrying proof that the difficult years away from home meant something. The final name and recipe of her graduation dish remain intentionally unresolved.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Culinary Imperial Academy", "Gwen's Graduation Dish", "Academy Qualification"],
    playerKnowledge: "Gwen has already completed her apprenticeship under Tohm and passes the Academy examination before the playable homecoming begins.",
    consequence: "Gwen enters Act I as a qualified chef rather than a beginner, and her graduation dish becomes a symbol of her own culinary voice.",
    developerNotes: "Canon gap: confirm the final name and recipe of Gwen's examination dish. The Academy's Unhold/Ovenhold naming relationship also remains unresolved."
  },
  {
    id: "act1-gwen-chooses-home",
    title: "Gwen Chooses Home",
    subtitle: "The Feast of Full Plates gives Gwen a choice between prestige and community.",
    text: "Gwen's qualification falls on the Feast of Full Plates, when the Academy and Ovenhold hold an enormous prestigious celebration. She could remain among celebrated chefs and enjoy the recognition she has earned. Instead, she leaves for Whisker Woods.\n\nGwen wants to spend the feast with Tohm, Juno, Kap, and the Whisken community that became her second home. The decision quietly defines her priorities. Prestige matters less than the people who fed her, trained her, argued with her, and gave her a place at their table. Whisker Woods is not merely where Tohm's tavern happens to stand. It is the community Gwen chooses.",
    relatedLore: ["Gwen", "Feast of Full Plates", "Whisker Woods", "Tohm Kyatt", "Juno", "Kap"],
    playerKnowledge: "Gwen deliberately leaves the Academy celebration to return to Whisker Woods on the same day she qualifies.",
    consequence: "Her homecoming and the sacred feast become one celebration, establishing community as Gwen's central motivation."
  },
  {
    id: "act1-woods-feel-wrong",
    title: "Something Is Wrong with Whisker Woods",
    subtitle: "A familiar road shows the first signs of an organized corruption.",
    text: "The path home should be familiar, but Whisker Woods feels wrong almost immediately. Insects appear in unusual numbers. Beetles and Dappleflies behave with unnatural aggression, egg clusters cling to places where they should not exist, and frightened wildlife has been pushed out of its normal territory.\n\nThe signs do not yet form a complete answer, but they are too consistent to dismiss as a bad season. Something is disturbing the forest's food chain and directing creatures that should be scattered. When Gwen hears Kap screaming from the direction of his pond, the unease becomes an immediate crisis.",
    relatedLore: ["Gwen", "Whisker Woods", "Dappleflies", "Crayhusks", "Kap's Pond"],
    playerKnowledge: "The forest's insects and wildlife are behaving unnaturally, but Gwen does not yet know the cause.",
    consequence: "Gwen's homecoming becomes an investigation before she even reaches the feast."
  },
  {
    id: "act1-kaps-corrupted-pond",
    title: "Kap's Corrupted Pond",
    subtitle: "Gwen's first day as a chef becomes her first rescue.",
    text: "Gwen reaches Kap's Pond and finds its water darkened by corruption, its vegetation dying, and its banks crowded with hostile insects. Kap is trapped near damaged fishing gear while bugs close around him. Gwen fights through the swarm to reach him, only for the disturbed water to erupt beneath them.\n\nA giant corrupted Prawnhusk rises from the pond. The armored creature turns the rescue into Gwen's first major combat test after returning home. She reads its heavy claw attacks, survives its territorial charges, and defeats it long enough to get Kap to safety. The victory proves Gwen can protect this community, but the residue around the creature makes one fact unavoidable: the forest is not suffering from an ordinary infestation.",
    relatedLore: ["Gwen", "Kap", "Kap's Pond", "Prawnhusk", "Whisker Woods"],
    playerKnowledge: "Kap's pond and the Prawnhusk have been altered by the same spreading corruption.",
    consequence: "Kap is saved, while the Prawnhusk provides the first undeniable evidence that the forest itself is being changed."
  },
  {
    id: "act1-feast-of-full-plates",
    title: "Feast of Full Plates",
    subtitle: "A sacred community feast becomes Gwen's homecoming and graduation celebration.",
    text: "Gwen reaches the village after nightfall and finds Tohm's tavern overflowing with lantern light, music, food, and Whisken families. The Feast of Full Plates celebrates food shared rather than hoarded: hospitality, gratitude, abundance, reconciliation, and the promise that no one at the table should remain hungry. This year it also celebrates Gwen's return as a qualified chef.\n\nTohm's first response is a dry, 'You're late.' Kap's account of the pond and Prawnhusk finally earns Gwen his full attention. Tohm examines her Academy qualification with rare visible pride, then immediately puts her to work. Because he missed the examination, he asks Gwen to recreate the dish that earned her qualification. As they cook side by side, villagers trade rumors about lost produce, insect nests, dangerous roads, and frost appearing in the wrong season. Gwen notices that Tohm reacts to the mention of the cold before hiding it.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Feast of Full Plates", "Tohm's Tavern", "Gwen's Graduation Dish", "Whisken People"],
    playerKnowledge: "The feast is both a holy communal celebration and Gwen's graduation homecoming; Tohm appears to recognize something in the reports of unnatural frost.",
    consequence: "Gwen is welcomed home, her identity as a chef is affirmed, and Tohm's first suspicious reaction plants doubt beneath the warmth."
  },
  {
    id: "act1-junos-friendly-fight",
    title: "Juno's Friendly Fight",
    subtitle: "A familiar sparring partner tests whether Gwen's long training dulled her instincts.",
    text: "Juno challenges Gwen to a friendly spar rather than a hostile duel. Their teasing makes it clear that this is a familiar language between friends: competitive, affectionate, and sharp enough that neither can be careless.\n\nJuno blocks, dodges, punishes reckless attacks, and forces Gwen to think about spacing and timing. The encounter teaches the player combat fundamentals without pretending Gwen has never held a sword. She is already a capable fighter. Later, when the Fire Meal gives Gwen supernatural power, Juno serves the same purpose again by reminding her that flames cannot replace discipline.",
    relatedLore: ["Gwen", "Juno", "Whisker Woods", "Fire Meal"],
    playerKnowledge: "Juno is Gwen's trusted friend and capable training partner, not an enemy.",
    consequence: "The player learns Gwen's baseline combat before Magical Meals alter it."
  },
  {
    id: "act1-life-as-a-chef",
    title: "Life as a Chef in Whisker Woods",
    subtitle: "The game's everyday loop grows naturally from Gwen's place in the tavern.",
    text: "For a time, Gwen settles into the work she returned to do. Tohm needs ingredients, so she explores, gathers, hunts, fights, and brings food home to cook. Turnips, herbs, Sunchee, Purfox, fruit, meat, and slime-derived ingredients make the forest feel like a living pantry rather than a corridor between battles.\n\nThe routine introduces ordinary meals, healing ales and tonics, and smaller snacks that provide temporary strength, stamina, recovery, resistance, or mobility before Gwen ever masters a Magical Meal. Slimes belong to the food ecosystem as sources of flavor and substitution, with different gels supporting recipes and consumables. Gwen's complicated history with ale remains part of her character, but it does not reduce every tavern interaction to that struggle. The cozy loop gives the spreading corruption something meaningful to threaten.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Whisker Woods", "Ales and Tonics", "Snacks", "Slime Substitutions"],
    playerKnowledge: "Gathering, cooking, and combat are parts of Gwen's normal responsibilities, while subtle corruption signs continue between errands.",
    consequence: "The player learns the food-and-adventure loop and develops a practical reason to care about the forest's health."
  },
  {
    id: "act1-magical-boar",
    title: "The Magical Boar",
    subtitle: "A hunt proves that the corruption is moving through what creatures consume.",
    text: "A search for stronger ingredients leads Gwen to a boar that has become unnaturally powerful. The animal charges hard enough to break trees and forces Gwen to rely on timing, positioning, and patience rather than simple aggression.\n\nWhen it falls, Gwen finds magical residue associated with what the boar consumed. The encounter advances the culinary progression — better and stranger ingredients can create stronger food — while revealing its dark mirror. The forest's food chain is being poisoned or manipulated, and creatures are changing because of what enters their bodies.",
    relatedLore: ["Gwen", "Magical Boar", "Whisker Woods", "Magical Meals", "Corruption Through Consumption"],
    playerKnowledge: "The boar's transformation is linked to consumed magical residue rather than natural mutation.",
    consequence: "Gwen gains a rare ingredient and the investigation shifts toward food as the mechanism of corruption."
  },
  {
    id: "act1-academy-rival",
    title: "The Academy Rival",
    subtitle: "A Cook Battle measures what Tohm's apprenticeship added to Gwen's formal training.",
    text: "A former Academy classmate challenges Gwen to a Cook Battle. The rival is competitive but not hateful: she understands Gwen's stubbornness, recognizes the influence of Tohm's teaching, and favors precision and formal technique over wilderness improvisation.\n\nThe competition tests Taste, Technique, and Presentation through ingredient choice, heat, preparation, seasoning, timing, recovery, and risk. The rival initially dismisses one of Gwen's slime-derived substitutions as crude. Gwen makes it work by combining Academy discipline with the adaptability she learned in Whisker Woods. The result proves that her years under Tohm did not interrupt her education; they completed a missing part of it. The rival or nearby caravan also brings news of unnatural frost along the northern road. Her canonical name remains Academy Rival — Name TBD; Ressa Vale is only a retired working-name note.",
    relatedLore: ["Gwen", "Academy Rival — Name TBD", "Culinary Imperial Academy", "Cook Battle", "Slime Substitutions"],
    playerKnowledge: "The rival respects Gwen even while challenging her, and the northern frost is spreading beyond isolated forest pockets.",
    consequence: "Gwen proves her hybrid cooking style and receives another clue pointing north.",
    developerNotes: "Do not finalize Ressa Vale as the character's name without explicit confirmation."
  },
  {
    id: "act1-brambrakes-gate",
    title: "Brambrake's Gate",
    subtitle: "An unseen territorial voice blocks the road north.",
    text: "An enormous gate cuts off the northern forest. Gwen argues with Brambrake, a stubborn resident who remains concealed on the other side and insists that everything beyond the barrier is 'his side.' He dismisses the insect crisis because it has not yet affected him.\n\nThe early scenes must not show Brambrake's portrait or face. His dry, antisocial voice and the absurd scale of his territorial claim carry the encounter. Gwen returns as the cold worsens and the distinction between his side and everyone else's becomes impossible to maintain. Only when he finally opens the gate does the story give him a proper visual reveal. The exact task that convinces him remains editable until confirmed by newer canon.",
    relatedLore: ["Gwen", "Brambrake", "Brambrake's Gate", "Northern Whisker Woods"],
    playerKnowledge: "Brambrake controls access to the north, but his appearance is deliberately hidden until he allows Gwen through.",
    consequence: "The gate becomes the central story barrier between the cozy village region and the worsening northern crisis.",
    developerNotes: "Canon gap: confirm the final gate-opening quest. Never reveal Brambrake's face during the early gate exchanges."
  },
  {
    id: "act1-bug-on-the-loose",
    title: "Bug Is on the Loose",
    subtitle: "An electric-insect investigation ends with a goblin-shaped misunderstanding.",
    text: "During an insect crisis, villagers warn that 'Bug' attacked near the trail and left lightning damage behind. Gwen follows scorched bark and electrical residue, naturally assuming that another corrupted insect has gained elemental power.\n\nThe reveal is simpler and stranger: Bug is a goblin whose name is Bug. He uses lightning magic, but he is not an insect. The misunderstanding gives Act I a comedic release without making the disturbance irrelevant. Gwen may chase, fight, or bargain with him according to the existing quest, but the canonical point is the same: reports about an electric bug were reports about a lightning goblin named Bug.",
    relatedLore: ["Gwen", "Bug", "Goblins", "Whisker Woods", "Lightning Magic"],
    playerKnowledge: "Bug is a goblin character and must never be filed as an insect enemy.",
    consequence: "The mystery introduces goblins and lightning magic while puncturing the grim insect investigation with character comedy."
  },
  {
    id: "act1-fire-meal",
    title: "The Fire Meal",
    subtitle: "Tohm asks Gwen to cook a kind of meal that can change the person who eats it.",
    text: "Tohm distinguishes Magical Meals from ordinary food, snacks, ales, and tonics. A Magical Meal does not merely restore the body or provide a brief buff; it can draw power, memory, and meaning out of ingredients and the person who prepares them. The Fire Meal is Gwen's first major encounter with that power.\n\nGwen gathers its ingredients through the same loop she has learned across Whisker Woods. The exact final recipe remains editable, but the finished dish radiates an unnatural heat. Tohm watches with the focus of someone who has waited years for this moment and warns Gwen that the meal may not behave like ordinary cooking. When Gwen tastes it, the tavern disappears.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Fire Meal", "Magical Meals", "Tohm's Recipe Book"],
    playerKnowledge: "Tohm understands Magical Meals far more deeply than he has explained, and the Fire Meal is different from every consumable introduced so far.",
    consequence: "The food system crosses into the main mystery as Gwen enters her first trance."
  },
  {
    id: "act1-first-trance",
    title: "The First Trance",
    subtitle: "Fire carries Gwen into an impossible winter hidden inside Whisker Woods.",
    text: "Gwen awakens inside a vision of Whisker Woods consumed by a snowstorm. The season is impossible. Frozen paths lead toward a cavernous hive filled with eggs, Crayhusks, beetles, and Dappleflies carrying frost across their bodies. When the insects attack, Gwen instinctively draws on the Fire Meal and discovers flame moving through her sword and strikes.\n\nThe trance is not a decorative dream. It has physical rules, hostile creatures, and geography that feels disturbingly specific. Gwen pushes through the hive until she hears a child singing somewhere beyond the storm. She follows the melody deeper into the memory.",
    relatedLore: ["Gwen", "Fire Meal", "Whisker Woods", "Ice Queen's Hive", "Crayhusks", "Dappleflies"],
    playerKnowledge: "Neither Gwen nor the player knows whether the snowstorm is a future, memory, or magical warning, and the identities at its center remain hidden.",
    consequence: "Gwen discovers fire abilities and receives the first supernatural image of the Act I finale."
  },
  {
    id: "act1-girl-and-creature",
    title: "The Girl and the Creature",
    subtitle: "A child's kindness creates the trust that will later be exploited.",
    text: "The song leads Gwen to a small girl in a purple nightgown carrying a stuffed faery doll. The child cannot see or hear her. In the shadows lies an enormous wounded insect-like creature, its true shape concealed by darkness and the limited perspective of the memory.\n\nInstead of fearing the creature, the girl brings water and food, cleans its wound, comforts it, and sings. The creature trusts her. Searchers eventually call for a princess, but the trance ends before Gwen can identify either figure. At this point the Story Reader must preserve the same knowledge boundary as the game: the girl is not yet named as Lillia, and the creature is not yet named as the Ant Queen.",
    relatedLore: ["Gwen", "Princess Lillia", "Ant Queen", "Fire Meal Trance", "Faery Doll"],
    playerKnowledge: "Gwen sees a young princess and a shadowed giant insect, but does not yet know their names or future roles.",
    consequence: "The story establishes sincere childhood kindness before revealing how that relationship becomes the cause of the Ice Queen tragedy.",
    revealLevel: "Hidden Truth"
  },
  {
    id: "act1-gwen-wakes",
    title: "Gwen Wakes",
    subtitle: "The tavern returns, but Tohm's reaction makes the vision more suspicious.",
    text: "Gwen wakes in the tavern after collapsing, surrounded by scorch marks and frightened witnesses. Juno helps ground her while Gwen explains the frozen forest, the hive, the child, and the wounded creature.\n\nTohm's reaction is too controlled. He recognizes more than he admits, avoids direct answers, and redirects Gwen toward mastering the power before asking where it came from. The moment keeps him loving and protective without excusing his secrecy. Gwen still trusts her mentor, but the player can see the first clear evidence that he is withholding history connected to the meal.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Juno", "Fire Meal", "First Trance"],
    playerKnowledge: "Tohm appears to recognize details from Gwen's trance even though he refuses to explain them.",
    consequence: "The Fire Meal becomes usable power, and suspicion of Tohm becomes part of Gwen's investigation."
  },
  {
    id: "act1-learning-fire",
    title: "Learning the Fire Meal",
    subtitle: "Gwen turns a frightening vision into a controlled combat language.",
    text: "Gwen begins learning what the Fire Meal can do: ignite her sword, apply burning damage, create explosive heat, resist cold, launch fire, or build toward a stronger finishing technique. The exact move set remains a gameplay decision, but the power must feel like an extension of cooking rather than an unrelated spell list.\n\nJuno helps Gwen practice. Their second training sequence contrasts supernatural force with reliable fundamentals. Gwen can burn through barriers and overwhelm enemies, but poor timing still leaves her open. The lesson matters because the Ice Queen will eventually require both the meal's power and everything Gwen already knew as a fighter.",
    relatedLore: ["Gwen", "Juno", "Fire Meal", "Magical Meal Combat"],
    playerKnowledge: "Fire is powerful but temporary and cannot replace Gwen's ordinary fighting skill.",
    consequence: "New routes and combat options open while the story prepares the mechanical answer to the frozen north."
  },
  {
    id: "act1-north-grows-colder",
    title: "The North Grows Colder",
    subtitle: "The impossible winter begins crossing from Gwen's trance into reality.",
    text: "Cold spreads through northern Whisker Woods. More insects appear, nests become denser, roots freeze, and ordinary creatures flee south. The details increasingly match the place Gwen saw in the Fire Meal trance.\n\nOnce Brambrake finally permits access through his gate, Gwen reaches caves whose frozen roots and egg chambers mirror the vision's geography. That recognition matters: the trance was connected to a real location and a real history, not a random nightmare. The investigation now has a direction beneath the forest.",
    relatedLore: ["Gwen", "Northern Whisker Woods", "Brambrake", "Fire Meal Trance", "Ice Queen's Hive"],
    playerKnowledge: "The physical north confirms that Gwen's vision showed a real place connected to the present corruption.",
    consequence: "Brambrake's barrier opens and Gwen descends toward the organized insect colony."
  },
  {
    id: "act1-thairrott",
    title: "Thairrott",
    subtitle: "An ancient skeletal-root guardian blocks the route beneath the forest.",
    text: "At the cavern entrance, Gwen confronts Thairrott, an enormous guardian formed from bones, roots, branches, and the disturbed remains of the old forest. Its final silhouette should follow the newest approved art, but its story function is fixed: it is the gatekeeper between the surface investigation and the colony beneath.\n\nThe fight asks Gwen to read slow, devastating patterns while using fire to create openings through rooted defenses. Defeating Thairrott does not solve the corruption. It breaks the seal on a much larger network of tunnels and proves that ancient forces beneath Whisker Woods have awakened with the insects.",
    relatedLore: ["Gwen", "Thairrott", "Northern Cavern", "Whisker Woods", "Fire Meal"],
    playerKnowledge: "Thairrott is a guardian of the route into the colony, not the source of the crisis.",
    consequence: "The path into the insect kingdom opens and the investigation becomes a descent into an organized society."
  },
  {
    id: "act1-not-an-infestation",
    title: "This Is Not an Infestation",
    subtitle: "The caverns reveal a kingdom with food, labor, and hierarchy.",
    text: "Beyond Thairrott, the tunnels contain egg chambers, storage spaces, food routes, specialized workers, frozen nurseries, and defensive positions. The insects are not a mindless swarm. They belong to a functioning society with roles, logistics, and a ruler.\n\nThe corruption has distorted that society into an army, but evidence of its older purpose remains. Gwen begins to understand that clearing nests is not the same as exterminating vermin. Something central has changed the colony, and the creatures attacking the surface are symptoms of what happened to their Queen.",
    relatedLore: ["Gwen", "Ant Colony", "Intelligent Insect Society", "Ice Queen's Hive", "Whisken People"],
    playerKnowledge: "The insects form an intelligent organized colony, and their current hostility is an altered state rather than their entire identity.",
    consequence: "The moral stakes shift from defeating pests to confronting the corruption of a people and their ruler."
  },
  {
    id: "act1-cedric-the-grunt",
    title: "Cedric the Grunt",
    subtitle: "A defeated skeleton guard turns survival into a business opportunity.",
    text: "Cedric is an armed skeletal grunt guarding the corrupted northern routes under orders he would rather not explain. He is bureaucratic, evasive, and dangerous enough to require a fight, but his courage evaporates once Gwen wins. Cedric surrenders and makes himself useful before she can decide what to do with him.\n\nGwen spares him, establishing that she does not treat every enemy-shaped person as irredeemable. Cedric becomes a recurring ally associated with Charms: selling, modifying, upgrading, and profiting from them with shameless enthusiasm. He can later trade his grunt helmet for a hooded look. His information also confirms that the insects have a Queen and that lately the Queen has become 'cold.'",
    relatedLore: ["Gwen", "Cedric the Grunt", "Charms", "Ice Queen", "Ant Colony"],
    playerKnowledge: "Cedric is an intelligent skeleton and opportunistic survivor, not a mindless undead monster.",
    consequence: "Gwen unlocks the recurring Charm relationship and receives direct confirmation that the colony's Queen has changed."
  },
  {
    id: "act1-cedar-lyra-oswin",
    title: "Cedar, Lyra, and Oswin",
    subtitle: "Suspicious allies force Gwen to ask why Tohm's food resembles the corruption.",
    text: "Cedar and Lyra initially oppose Gwen because she carries Magical Meals made from Tohm's recipes while creatures across the north are being transformed by magical food. Their hostility is intelligent and defensive rather than evil. Once Gwen proves she is investigating the same danger, they bring her to Oswin, an older alchemist with enough knowledge to recognize a pattern.\n\nOswin listens to the pond, the boar, the caves, the Fire Meal, and the trance. Then he asks the questions Gwen has avoided: Where did Tohm learn these recipes? Why does the corruption resemble culinary magic? What did Tohm do before he became her mentor? Oswin does not reveal every answer, but he makes it impossible for Gwen to treat Tohm's secrecy as harmless eccentricity.",
    relatedLore: ["Gwen", "Cedar", "Lyra", "Oswin", "Tohm Kyatt", "Dark Culinary Arts"],
    playerKnowledge: "Cedar, Lyra, and Oswin distrust Tohm's connection to magical food, but they do not yet possess his full hidden history.",
    consequence: "Gwen gains allies and a framework for understanding the crisis as corrupted culinary magic."
  },
  {
    id: "act1-corruption-through-consumption",
    title: "Corruption Through Consumption",
    subtitle: "The thing that nourishes Gwen is also being used to transform bodies, minds, and ecosystems.",
    text: "The evidence points to a consistent method: creatures are not changing merely because magic is nearby. They are eating Magical Meals, recipe fragments, concentrated ingredients, residue, or corrupted food created through the Dark Culinary Arts. Food can heal, comfort, strengthen, and unite, but the same intimacy makes it capable of mutation, control, addiction, and environmental spread.\n\nAn optional side story sharpens this discovery. A camp connected to Mu'Ramar is found destroyed, and Gwen survives a night encounter with a cursed were-creature who returns to human form at dawn. The victim says magical cookies caused the transformation, possibly distributed by Cedric without proper warning. The dates do not match Mu'Ramar's account, and Mu'Ramar disappears when Gwen notices. If newer canon contradicts this quest, it remains clearly marked as a soft-canon draft rather than being erased.",
    relatedLore: ["Gwen", "Dark Culinary Arts", "Magical Meals", "Mu'Ramar", "Cedric the Grunt", "Magical Cookies"],
    playerKnowledge: "Corruption spreads through consumption. The Mu'Ramar cookie story is optional soft canon pending timeline confirmation.",
    consequence: "Gwen understands the central danger of corrupted food and sees that it can transform people as well as wildlife.",
    developerNotes: "Mu'Ramar and the were-creature remain optional/soft canon if they conflict with newer records."
  },
  {
    id: "act1-history-of-ant-queen",
    title: "The History of the Ant Queen",
    subtitle: "The Whisken once shared the forest with the colony rather than fighting it.",
    text: "Gwen learns that an Ant Kingdom existed beneath Whisker Woods long before the current attacks. The Ant Queen and the Whisken eventually formed a relationship built around cultivation, food, cooperation, balance, and shared resources. The insects helped the forest thrive, while Whisken communities benefited from the abundance they supported.\n\nOne historical version says a gluttonous Ant King hoarded food while his colony suffered, and that the Queen allied with the Whisken to overthrow or seal him away. That portion remains soft canon until confirmed. The hard canon is the positive relationship between the Queen and the Whisken. It makes the modern violence tragic and echoes the Feast of Full Plates: food shared sustains a community; food hoarded or corrupted destroys one.",
    relatedLore: ["Ant Queen", "Whisken People", "Ant Colony", "Whisker Woods", "Feast of Full Plates", "Gluttonous Ant King"],
    playerKnowledge: "The Ant Queen and Whisken were once allies; the Gluttonous Ant King version remains a historical draft.",
    consequence: "The Ice Queen can no longer be understood as an inherently evil monster, and restoring the forest gains historical weight.",
    developerNotes: "Keep the Mad/Gluttonous Ant King marked Soft Canon unless later material confirms him."
  },
  {
    id: "act1-the-blizzard",
    title: "The Blizzard",
    subtitle: "The corruption stops hiding and turns northern Whisker Woods into winter.",
    text: "A full magical blizzard consumes the north. Trees freeze, streams stop, frost-covered insects pour from the ground, and the season itself bends around the colony. The environmental corruption that first appeared in Kap's Pond is now visible across the region.\n\nGwen follows the spread back toward the Queen at the center of the hive. The evidence points to one conclusion: the ancient Ant Queen has been transformed into the Ice Queen. What remains unknown is who changed her and why she accepted the meal that carried the corruption.",
    relatedLore: ["Gwen", "Ice Queen", "Ant Queen", "Northern Whisker Woods", "The Blizzard"],
    playerKnowledge: "The Ice Queen is the transformed ruler at the center of the colony, but the person responsible has not yet been identified.",
    consequence: "The regional mystery becomes an open magical disaster and forces Tohm to surrender part of the truth."
  },
  {
    id: "act1-tohm-says-lillia",
    title: "Tohm Finally Says the Name",
    subtitle: "The unnamed princess in Gwen's vision becomes Princess Lillia of Ovenhold.",
    text: "Gwen confronts Tohm with the insects, the Queen, the corrupted meals, the frozen forest, and the child in her trance. Pressed beyond another deflection, Tohm finally gives her a name: Lillia, Princess of Ovenhold.\n\nLillia grew up fascinated by faeries. Because humans and faeries share the greater Triad order, faeries were not distant monsters but a living people whose culture and magic she could admire. Admiration became obsession. Lillia wanted not merely to know faeries but to become one and possess magic. Her father, the King of Ovenhold, loved her intensely and tried to satisfy that desire. His disordered love eventually drove him to war with the Dwarven Kingdom for the Dragon Knife. Tohm's royal culinary access later placed that stolen artifact and his own dangerous obsession in the same story.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Princess Lillia", "King of Ovenhold", "Faery Kingdom", "Dragon Knife", "Dwarven Kingdom"],
    playerKnowledge: "The child from the trance is now identified as Lillia, but Gwen still does not know the full history of Tohm's dish or the torn pages.",
    consequence: "Act I's local corruption connects to royal history, the Dragon Knife war, and Tohm's concealed past.",
    revealLevel: "Minor Spoiler"
  },
  {
    id: "act1-lillia-and-ant-queen",
    title: "Lillia and the Ant Queen",
    subtitle: "The first trance is reinterpreted as a real memory of compassion.",
    text: "When Lillia was young, she became separated from her attendants in Whisker Woods and found the Ant Queen wounded. She stayed. She brought food and water, cleaned the wound, offered comfort, and sang while the enormous creature rested. The Queen remembered the child who treated her as a life worth saving rather than a monster.\n\nThe shadowed creature in Gwen's trance was the Ant Queen, and the girl in the purple nightgown was Lillia. This kindness must remain genuine. Lillia was not born as a simple villain, and the Queen's later trust was not foolish. Their bond was formed through a real moment of mercy, which is precisely why its exploitation is so destructive.",
    relatedLore: ["Princess Lillia", "Ant Queen", "Whisker Woods", "Fire Meal Trance", "Lillia's Lullaby"],
    playerKnowledge: "The story now confirms both identities from the trance and explains why the Queen trusted Lillia.",
    consequence: "The emotional cause of the Ice Queen's transformation becomes clear before the mechanics of the corrupted meal are revealed.",
    revealLevel: "Minor Spoiler"
  },
  {
    id: "act1-meal-created-ice-queen",
    title: "The Meal That Created the Ice Queen",
    subtitle: "Lillia returns with stolen culinary power and turns remembered kindness into access.",
    text: "Years after caring for the wounded Queen, Lillia returns with dangerous magic and torn pages from Tohm's recipe book. Tohm had used the Dragon Knife and forbidden culinary knowledge to create an unstable meal that gave Lillia power. When she tried to take his book, he recovered the main volume, but she tore out pages that became the foundation of the Dark Culinary Arts.\n\nLillia brings the Ant Queen a corrupted ice-associated Magical Meal, likely the Blizzard Meal pending the final recipe name. She may regard it as repayment, empowerment, experimentation, or all three. She does not need to conquer the Queen. The Queen eats from Lillia's hand because she remembers the child who cared for her. The meal changes the Queen, then her colony and surrounding ecosystem. Kap's Pond, the aggressive insects, the unnatural eggs, and the frozen north all grow from this betrayal of trust.",
    relatedLore: ["Princess Lillia", "Ant Queen", "Ice Queen", "Blizzard Meal", "Tohm's Recipe Book", "Recipe Pages", "Dark Culinary Arts", "Dragon Knife"],
    playerKnowledge: "Lillia used a torn recipe page and the Queen's trust to create the Ice Queen; the exact final meal name remains subject to recipe canon.",
    consequence: "Every major environmental clue in Act I resolves into one causal chain leading back to Lillia and Tohm's lost pages.",
    revealLevel: "Major Spoiler",
    developerNotes: "Use Blizzard Meal unless a newer canonical Ice Meal name is confirmed."
  },
  {
    id: "act1-preparing-for-hive",
    title: "Preparing for the Hive",
    subtitle: "Every system introduced in Act I becomes part of Gwen's plan.",
    text: "Gwen prepares to enter the heart of the insect kingdom with everything Act I has taught her. She carries her sword, Fire Meal portions, healing ales, tonics, snacks, charms, gathered ingredients, Oswin's knowledge, Cedric's information, Juno's training, and the incomplete truth Tohm finally shared.\n\nThe preparation makes the final dungeon feel earned rather than detached from the rest of the act. Gathering supplied the food, cooking created the power, friendships supplied knowledge and training, and each earlier boss taught a survival skill Gwen now needs. The Ice Queen is not waiting at the end of an unrelated cave; the whole act has been teaching Gwen how to reach her.",
    relatedLore: ["Gwen", "Ice Queen's Hive", "Fire Meal", "Ales and Tonics", "Snacks", "Charms", "Oswin", "Cedric the Grunt", "Juno"],
    playerKnowledge: "Gwen now understands the Queen's origin and deliberately assembles tools from every major Act I system.",
    consequence: "The exploration, cooking, combat, and relationship arcs converge into the final dungeon."
  },
  {
    id: "act1-entering-hive",
    title: "Entering the Ice Queen's Hive",
    subtitle: "The geography of Gwen's first vision becomes the path to the final boss.",
    text: "The deeper Gwen travels, the more familiar the hive becomes. Frozen roots twist through the same shapes she saw in the trance. Egg chambers, tunnels, and insect silhouettes repeat the memory's visual language.\n\nThis recognition confirms that the Fire Meal did not create an arbitrary symbolic landscape. It connected Gwen to a memory rooted in this exact place and in the relationship between Lillia and the Queen. At the hive's center, cold and insect activity become overwhelming. The ruler who once sustained the forest is waiting inside the disaster created through her trust.",
    relatedLore: ["Gwen", "Ice Queen's Hive", "Fire Meal Trance", "Princess Lillia", "Ant Queen"],
    playerKnowledge: "The trance showed a memory attached to the real hive, and Gwen is now physically retracing it.",
    consequence: "The first Magical Meal vision pays off as spatial and emotional preparation for the Queen's chamber."
  },
  {
    id: "act1-the-ice-queen",
    title: "The Ice Queen",
    subtitle: "A scar connects the ancient ruler, the child's memory, and the monster before Gwen.",
    text: "The Ice Queen is enormous and ancient, with the original Ant Queen still visible beneath armor-like magical ice. Her colony fills the surrounding hive and answers her commands. Then Gwen notices a scar: the old wound the child tended in the trance.\n\nThe final visual clue resolves what Gwen has learned. The giant shadowed creature was this Queen before corruption. Lillia knew her, cared for her, and later returned with the meal that transformed her. Gwen is not facing a random monster. She is facing a ruler whose capacity to trust was used as the doorway for corruption.",
    relatedLore: ["Gwen", "Ice Queen", "Ant Queen", "Princess Lillia", "Ice Queen's Hive"],
    playerKnowledge: "Gwen directly recognizes the Queen by the wound shown in her trance.",
    consequence: "The emotional mystery resolves immediately before combat, changing what victory means.",
    additionalPages: [
      {
        id: "act1-the-ice-queen-phase-one",
        title: "Phase One — The Armored Queen",
        text: "The first phase emphasizes the Queen's enormous body and control of the hive. She summons insect swarms, raises ice walls and spikes, freezes sections of the arena, launches blizzard zones, and calls smaller creatures from egg chambers. Gwen uses the Fire Meal to burn paths through the swarm, melt barriers, and break the Queen's frozen armor.\n\nThe battle tests lessons from the Prawnhusk, Magical Boar, Thairrott, Juno, and the northern caverns. Gwen survives through timing, movement, gathered supplies, and controlled culinary power. When the outer frozen form breaks, the arena falls briefly still. The apparent victory is only the transition.",
        relatedLore: ["Gwen", "Ice Queen", "Fire Meal", "Prawnhusk", "Magical Boar", "Thairrott", "Ice Queen's Hive"],
        playerKnowledge: "Fire counters the Queen's frozen armor, but destroying that armor does not free or defeat her.",
        consequence: "The monstrous first form breaks and reveals a second form shaped by corrupted beauty."
      },
      {
        id: "act1-the-ice-queen-phase-two",
        title: "Phase Two — The Ice Ballerina",
        text: "The Queen emerges tall, thin, elegant, and disturbing. Her limbs extend into crystalline forms and her movement becomes dance-like. Spins create blade arcs, rings of ice expand with rhythm, frozen trails redraw the arena, and leaps end in precise spike formations. The player must watch, move, wait, and strike as though learning the Queen's dance.\n\nBeneath the storm, Gwen hears the same lullaby from her trance. Some part of the Ant Queen remembers Lillia singing beside her wound. The memory does not cure the corruption, but it makes the tragedy impossible to ignore. Gwen's hesitation nearly kills her. She draws on the last of the Fire Meal, meets frost with flame, and lands the killing strike. The corrupted magic fractures and the Ice Queen dies.",
        relatedLore: ["Gwen", "Ice Queen", "Fire Meal", "Lillia's Lullaby", "Princess Lillia"],
        playerKnowledge: "The Queen retains a fragmented memory of Lillia's childhood kindness even while the corrupted meal controls what she has become.",
        consequence: "Gwen ends the magical winter, but the victory is framed as the death of a corrupted ally rather than the destruction of an evil species."
      }
    ]
  },
  {
    id: "act1-recipe-page",
    title: "The Recipe Page",
    subtitle: "The first recovered page shows the complete memory of the Queen's betrayal.",
    text: "After the Queen dies, Gwen finds a torn page associated with the ice meal that caused the transformation. The page is most likely the Blizzard Meal recipe, though the final name remains editable until confirmed.\n\nTouching it releases another memory. Gwen sees Lillia clearly, sees the Ant Queen before corruption, and watches Lillia offer the meal. The Queen accepts because she recognizes and trusts her. Then the corruption begins. The page confirms that Lillia did not conquer the Queen by force. She weaponized a relationship built through real kindness, using knowledge torn from Tohm's recipe book.",
    relatedLore: ["Gwen", "Recipe Pages", "Blizzard Meal", "Princess Lillia", "Ant Queen", "Tohm's Recipe Book"],
    playerKnowledge: "The recovered page reveals the complete cause of the Ice Queen transformation and ties it directly to Lillia's stolen recipes.",
    consequence: "Gwen recovers the first major recipe page and gains proof that the larger crisis extends beyond Whisker Woods.",
    revealLevel: "Major Spoiler"
  },
  {
    id: "act1-the-thaw",
    title: "The Thaw",
    subtitle: "Whisker Woods survives, but the damage does not vanish with the Queen.",
    text: "The magical winter begins to end. Ice melts, streams move again, and insects stop behaving like a coordinated hostile army. Some return underground, some scatter, and others seem confused, as though waking from a shared nightmare.\n\nThe recovery is incomplete. Kap's Pond still needs healing, corrupted areas remain, and some transformed creatures may never return to what they were. Other recipe pages are still loose in the world, Lillia remains beyond Gwen's reach, and Tohm still possesses truths he has not surrendered. Whisker Woods survives the immediate disaster without pretending that one boss fight repairs an ecosystem overnight.",
    relatedLore: ["Gwen", "Whisker Woods", "Kap's Pond", "Ant Colony", "Recipe Pages", "Princess Lillia"],
    playerKnowledge: "Defeating the Queen ends the magical coordination and blizzard, but leaves lasting environmental and personal consequences.",
    consequence: "The region begins recovering while the recipe-page hunt becomes the larger direction of the game."
  },
  {
    id: "act1-aftermath",
    title: "Aftermath",
    subtitle: "The people Gwen met turn a regional victory back into daily life.",
    text: "Smaller reunions let Whisker Woods breathe after the hive. Brambrake insists that 'his side' survived and avoids admitting the crisis affected everyone. Cedric tries to turn Gwen's victory into a charm promotion and offers an insulting commemorative discount. Juno asks whether fighting a ballerina-shaped insect counts as dance training.\n\nKap returns to the difficult work of restoring his pond. Gwen's Academy rival requests another Cook Battle when the roads are safer. Oswin remains suspicious of Tohm; if anything, the recovered recipe page proves that his questions were necessary. The humor does not erase the losses, but it restores the community tone that the blizzard threatened.",
    relatedLore: ["Gwen", "Brambrake", "Cedric the Grunt", "Juno", "Kap", "Academy Rival — Name TBD", "Oswin", "Whisker Woods"],
    playerKnowledge: "The supporting cast survives the crisis with relationships changed but unresolved.",
    consequence: "Act I closes its local character loops while keeping Tohm's secrecy and the wider corruption alive."
  },
  {
    id: "act1-gwen-and-tohm",
    title: "Gwen and Tohm",
    subtitle: "The first recovered page turns mentorship into an unanswered reckoning.",
    text: "Back at the tavern, Gwen places the recovered recipe page in front of Tohm. She now knows enough to recognize the shape of his silence: he knew Lillia, understood Magical Meals, possessed the recipe book from which the pages were torn, and knew those pages could transform living creatures.\n\nTohm does not give her the entire truth. He is still hiding his deeper involvement with the Dragon Knife, Lillia's first dark meal, Tabby Island, and the Cat Cauldron. Gwen tells him that one day he will tell her everything. Tohm knows she is right. They look toward the recovering forest with the immediate crisis ended and their real journey beginning. Act I leaves Gwen stronger, officially a chef, and no longer willing to accept mystery as an answer from the mentor she loves.",
    relatedLore: ["Gwen", "Tohm Kyatt", "Recipe Pages", "Princess Lillia", "Dragon Knife", "Tabby Island", "Cat Cauldron", "Whisker Woods"],
    playerKnowledge: "Gwen knows Tohm is connected to Lillia and the pages, but neither Gwen nor the player receives every late-game secret yet.",
    consequence: "The Act I conflict resolves into the long-term recipe-page recovery quest and a growing demand for truth from Tohm.",
    revealLevel: "Major Spoiler"
  }
];

const legacyGeneratedActOneChapterIds = actOneChapterInputs.map((chapter) => chapter.id);
export const actOneStoryChapters = revisedActOneStoryChapters;
export const ACT_ONE_STORY_CHAPTER_IDS = new Set([
  ...legacyGeneratedActOneChapterIds,
  ...actOneStoryChapters.map((chapter) => chapter.id)
]);

type EntryPatch = {
  title: string;
  aliases?: string[];
  category: string;
  type: string;
  status?: string;
  spoilerLevel?: string;
  tags: string[];
  summary: string;
  internalLore: string;
  fields?: Record<string, unknown>;
  connections?: Partial<LoreEntry["connections"]>;
};

const entryPatches: EntryPatch[] = [
  {
    title: "Gwen", category: "Characters", type: "Character", status: "Canon", spoilerLevel: "Minor Spoiler",
    tags: ["protagonist", "human", "age 23", "qualified chef", "fighter", "Act I", "Tablekeeper"],
    summary: "Gwen is the 23-year-old protagonist, a practical human fighter and newly qualified chef who returns to Whisker Woods after two years apprenticing under Tohm Kyatt and passing her final Culinary Imperial Academy examination.",
    internalLore: "Gwen combines formal Academy discipline with Tohm's wilderness improvisation. On the Feast of Full Plates she chooses Whisker Woods over the prestigious Academy celebration, rescues Kap, investigates food-borne corruption, cooks the Fire Meal, and receives a trance showing young Lillia caring for the wounded Ant Queen. She later defeats the transformed Ice Queen and recovers the Blizzard Meal recipe page. Gwen is direct, protective, intelligent, slightly sarcastic, a talented fighter and chef, loves potatoes, and is working through an established struggle with ale addiction.",
    fields: { Age: "23", Profession: "Newly qualified chef, fighter, and adventurer", Origin: "Osul", "Act I Arc": "Passes her final Academy examination, chooses Whisker Woods, masters the Fire Meal, uncovers the Ice Queen's origin, and recovers the first recipe page." },
    connections: { characters: ["Tohm Kyatt", "Juno", "Kap", "Princess Lillia", "Lel Kai", "Oswin", "Brambrake", "Bug", "Cedric the Grunt", "Academy Rival — Name TBD"], locations: ["Osul", "Culinary Imperial Academy", "Whisker Woods", "Kap's Pond", "Ice Queen's Hive"], recipes: ["Gwen's Graduation Dish", "Fire Meal", "Blizzard Meal", "Magical Meals"], quests: actOneChapterInputs.map((chapter) => chapter.title), items: ["Gwen's Sword", "Gwen's Basket", "Academy Qualification", "Recipe Pages"], factions: ["Triad Faith", "Culinary Imperial Academy", "Whisken Community of Whisker Woods"], enemies: ["Prawnhusk", "Magical Boar", "Thairrott", "Ice Queen"] }
  },
  {
    title: "Tohm Kyatt", aliases: ["Tomcat"], category: "Characters", type: "Character", status: "Canon", spoilerLevel: "Major Spoiler",
    tags: ["Whisken", "legendary chef", "mentor", "food critic", "Act I", "secret", "redemption"],
    summary: "Tohm Kyatt, sometimes called Tomcat in conversation, is Gwen's brilliant and secretive Whisken mentor whose culinary obsession links the Dragon Knife, Lillia, the torn Recipe Pages, Tabby Island, and the Cat Cauldron.",
    internalLore: "Tohm trained Gwen for roughly two years before she returned to the Academy for her final examination. He is genuinely proud of her but expresses affection through criticism, work, food, impossible standards, and sarcasm. His dangerous search for a flavor unlike anything anyone had ever tasted led through the Cat Cauldron and Dragon Knife to an unstable dark meal consumed by Lillia. She tore pages from his recipe book and used them to develop the Dark Culinary Arts. During Act I, Tohm recognizes the meaning of the frost and Gwen's trance but reveals only enough to name Lillia. He is morally compromised and responsible for great harm, but he is not purely evil and has a redemption arc. Hard canon: Tohm never drinks from the cauldron.",
    fields: { "Act I Role": "Mentor, tavern chef, quest giver, and guarded source of the recipe-page mystery.", "Relationship with Gwen": "Deep mentor-student bond; genuine pride hidden behind criticism and work.", "Hidden Act I Truth": "He knows Lillia and the origin of the torn pages but withholds his complete role.", "Hard Canon": "Tohm never drinks from the cauldron." },
    connections: { characters: ["Gwen", "Princess Lillia", "King of Ovenhold", "The Tablemaker"], locations: ["Tohm's Tavern", "Whisker Woods", "Culinary Imperial Academy", "Ovenhold", "Tabby Island"], recipes: ["Fire Meal", "Magical Meals", "Dark Culinary Arts"], items: ["Tohm's Recipe Book", "Recipe Pages", "Dragon Knife", "Cat Cauldron"], factions: ["Whisken People", "Triad Faith"] }
  },
  {
    title: "Juno", category: "Characters", type: "Character", status: "Canon", spoilerLevel: "No Spoiler",
    tags: ["Gwen's friend", "fighter", "training partner", "Act I"],
    summary: "Juno is Gwen's trusted friend and capable sparring partner, introducing combat through a friendly challenge and later helping Gwen control the Fire Meal.",
    internalLore: "Juno's relationship with Gwen is teasing, competitive, and grounded in genuine trust. Their first spar establishes that Gwen is already a capable fighter. Their later Fire Meal training shows that supernatural power cannot replace timing, positioning, and discipline.",
    fields: { Role: "Friendly rival and combat training partner", "Act I Encounters": "Friendly tutorial spar, Fire Meal practice, and post-Ice Queen aftermath." },
    connections: { characters: ["Gwen", "Tohm Kyatt"], locations: ["Whisker Woods", "Tohm's Tavern"], recipes: ["Fire Meal"], quests: ["Juno's Friendly Fight", "Learning the Fire Meal"] }
  },
  {
    title: "Kap", category: "Characters", type: "Character", status: "Canon", spoilerLevel: "No Spoiler",
    tags: ["Whisken", "fisherman", "Act I", "Kap's Pond"],
    summary: "Kap is a generous Whisken fisherman whose rescue at a corrupted pond gives Gwen her first direct encounter with the Act I crisis.",
    internalLore: "Gwen hears Kap screaming during her return to Whisker Woods. She fights insects and a corrupted Prawnhusk to rescue him. His damaged pond remains an early environmental wound that still needs healing after the Ice Queen dies.",
    fields: { "Act I Role": "Early rescue NPC and fishing-system connection", Home: "Kap's Pond / Whisken Village" },
    connections: { characters: ["Gwen", "Tohm Kyatt"], locations: ["Kap's Pond", "Whisker Woods", "Whisken Village"], quests: ["Kap's Corrupted Pond", "The Thaw"], enemies: ["Prawnhusk"] }
  },
  {
    title: "Brambrake", aliases: ["Brambrik"], category: "Characters", type: "Character", status: "Canon", spoilerLevel: "Minor Spoiler",
    tags: ["reclusive", "territorial", "northern Whisker Woods", "Act I"],
    summary: "Brambrake is a stubborn, territorial resident behind the gate to northern Whisker Woods whose face remains hidden until he finally lets Gwen through.",
    internalLore: "Brambrake is antisocial, dry, difficult, and unintentionally funny. He insists the land beyond the massive gate is 'his side' and initially refuses to help because the insect crisis does not affect him. Early scenes use only his unseen voice; his first proper appearance occurs after he opens the gate. The exact gate-opening quest remains unresolved.",
    fields: { "Presentation Rule": "Do not show Brambrake's face or portrait before he opens the gate.", "Canon Gap": "Confirm the exact task that convinces him to permit access." },
    connections: { characters: ["Gwen"], locations: ["Brambrake's Gate", "Northern Whisker Woods"], quests: ["Brambrake's Gate", "The North Grows Colder"] }
  },
  {
    title: "Bug", category: "Characters", type: "Goblin Character", status: "Canon", spoilerLevel: "No Spoiler",
    tags: ["goblin", "lightning", "character", "Act I", "not an insect"],
    summary: "Bug is a lightning-using goblin whose name creates an intentional electric-insect misunderstanding during Act I.",
    internalLore: "Villagers report that 'Bug' is on the loose during an insect crisis, causing Gwen and the player to expect an electrified creature. Bug is actually a goblin named Bug. He must be stored and presented as a character, never as a bug or insect enemy.",
    fields: { Species: "Goblin", Magic: "Lightning", "Hard Canon": "Bug is not an insect. Bug is a goblin whose name is Bug." },
    connections: { characters: ["Gwen"], locations: ["Whisker Woods"], quests: ["Bug Is on the Loose"], gameplaySystems: ["Lightning Magic"] }
  },
  {
    title: "Cedric the Grunt", aliases: ["Cedrick the Grunt", "Cedric", "Cedrick"], category: "Characters", type: "Undead Character", status: "Canon", spoilerLevel: "Minor Spoiler",
    tags: ["skeleton", "grunt", "charms", "merchant", "Act I"],
    summary: "Cedric is an opportunistic skeletal grunt whom Gwen defeats and spares before he becomes a recurring charm merchant and upgrade helper.",
    internalLore: "Cedric begins as an armed guard in the northern caverns. He surrenders after Gwen defeats him and becomes useful through the Charm system. He is bureaucratic, cowardly when convenient, money-minded, funny, and not fundamentally evil. He confirms that the insect colony has a Queen who has lately become cold. A later hooded appearance can replace his grunt helmet.",
    fields: { "Act I Arc": "Enemy grunt, defeated, spared, recurring ally, Charm upgrade helper.", "Gameplay Role": "Sell, improve, upgrade, or modify Charms." },
    connections: { characters: ["Gwen"], locations: ["Northern Cavern", "Ice Queen's Hive"], quests: ["Cedric the Grunt"], items: ["Charms"], enemies: ["Ice Queen"] }
  },
  {
    title: "Academy Rival — Name TBD", aliases: ["Ressa Vale", "Academy Rival"], category: "Characters", type: "Character", status: "Canon", spoilerLevel: "No Spoiler",
    tags: ["Academy", "chef", "rival", "Cook Battle", "name TBD"],
    summary: "Gwen's unnamed Academy classmate is a competitive but non-villainous culinary rival whose formal precision contrasts with Gwen's Academy-and-Tohm hybrid style.",
    internalLore: "The rival studied with Gwen at the Culinary Imperial Academy and understands her style and stubbornness. Their Act I Cook Battle tests Taste, Technique, and Presentation. She questions Gwen's unconventional slime substitution, then acknowledges that it works. Ressa Vale is only a previous working name and must not be treated as final canon.",
    fields: { "Canonical Name": "Academy Rival — Name TBD", "Previous Working Name": "Ressa Vale; do not finalize without confirmation.", "Cooking Style": "Formal, precise, and presentation-focused." },
    connections: { characters: ["Gwen", "Tohm Kyatt"], locations: ["Culinary Imperial Academy", "Whisker Woods"], quests: ["The Academy Rival"], gameplaySystems: ["Cook Battle"] }
  },
  {
    title: "Princess Lillia", category: "Characters", type: "Character", status: "Canon", spoilerLevel: "Major Spoiler",
    tags: ["Ovenhold", "princess", "antagonist", "faery obsession", "Dark Culinary Arts", "Act I"],
    summary: "Princess Lillia is a tragic major antagonist whose genuine childhood kindness toward the Ant Queen later gives her the trust she exploits with a corrupted Magical Meal.",
    internalLore: "Lillia grew up fascinated with faeries and eventually wanted to become one. Her father's attempt to grant her magic led to war with the dwarves for the Dragon Knife. Tohm used the knife and dangerous culinary knowledge to create an unstable dark meal that Lillia consumed. She later tore pages from his recipe book and developed the Dark Culinary Arts. As a child she had cared for the wounded Ant Queen with food, water, and a lullaby. Years later she returned with a corrupted ice meal. The Queen accepted it because her trust in Lillia was real, becoming the Ice Queen.",
    fields: { "Childhood Bond": "Cared for the wounded Ant Queen and earned her lasting trust.", "Act I Hidden Role": "Uses a corrupted Ice/Blizzard Meal to transform the Ant Queen.", "Motivation": "Faery admiration becomes an obsession with possessing magic and becoming like the faeries." },
    connections: { characters: ["King of Ovenhold", "Queen of Ovenhold", "Tohm Kyatt", "Gwen", "Ice Queen"], locations: ["Ovenhold", "Faery Kingdom", "Whisker Woods", "Ice Queen's Hive"], recipes: ["Dark Culinary Arts", "Blizzard Meal", "Magical Meals"], items: ["Dragon Knife", "Recipe Pages", "Tohm's Recipe Book"], factions: ["Royal House of Ovenhold"] }
  },
  {
    title: "King of Ovenhold", category: "Characters", type: "Character", status: "Canon", spoilerLevel: "Major Spoiler",
    tags: ["king", "Ovenhold", "Lillia", "Dragon Knife", "morally flawed"],
    summary: "Ovenhold's legitimate but morally flawed King allows his love for Lillia to become indulgence, obsession, and appetite, eventually waging war for the Dragon Knife.",
    internalLore: "The King occupies a legitimate office within the shared Triad order. His wrongdoing does not make the Triad false or the institution inherently evil. He loves Lillia deeply but tries to satisfy her desire for magic at any cost. The dwarves refuse to surrender the Dragon Knife, and he goes to war to take it. This is a major moral failure, but he must retain meaningful redemptive qualities for his later arc.",
    fields: { "Triad Distortion": "Love becomes indulgence, Passion becomes obsession, and Taste becomes appetite.", "Canon Guardrail": "Distinguish the King's sin from the legitimate institution and Triad faith he represents." },
    connections: { characters: ["Princess Lillia", "Queen of Ovenhold", "Tohm Kyatt"], locations: ["Ovenhold", "Dwarven Kingdom"], items: ["Dragon Knife"], factions: ["Royal House of Ovenhold", "Triad Faith"] }
  },
  {
    title: "Queen of Ovenhold", category: "Characters", type: "Character", status: "Soft Canon", spoilerLevel: "Major Spoiler",
    tags: ["queen", "Ovenhold", "royal family", "Lillia"],
    summary: "Lillia's mother is part of the Royal House of Ovenhold and the unresolved family history surrounding Lillia's pursuit of magic.",
    internalLore: "The Queen belongs to Lillia's royal family and the broader effort around Lillia's desire for magical powers. Her exact responsibility, disagreements with the King, personality, and later arc remain expandable rather than invented here.",
    fields: { "Canon Gap": "Define her degree of responsibility, opposition, and later arc." },
    connections: { characters: ["King of Ovenhold", "Princess Lillia"], locations: ["Ovenhold"], factions: ["Royal House of Ovenhold"] }
  },
  {
    title: "Lel Kai", category: "Characters", type: "Character", status: "Canon", spoilerLevel: "Minor Spoiler",
    tags: ["faery", "military", "Ovenhold", "Triad", "Gwen"],
    summary: "Lel Kai is a major faery military figure who operates within the shared Triad order and can rise to become General of Ovenhold without surrendering his faery identity.",
    internalLore: "Lel Kai demonstrates the healthy political and religious union between Ovenhold and the Faery Kingdom. The kingdoms share one Triad order while the faeries retain their own culture, hierarchy, military, governance, and identity. His existing ties to Gwen, Tohm, and Whisker Woods should remain intact.",
    fields: { "Political Role": "Faery military figure who can eventually become General of Ovenhold.", "Canon Guardrail": "Service to Ovenhold does not erase or betray Lel Kai's faery identity." },
    connections: { characters: ["Gwen", "Tohm Kyatt"], locations: ["Ovenhold", "Faery Kingdom", "Whisker Woods"], factions: ["Triad Faith", "Faery Kingdom", "Ovenhold"] }
  },
  {
    title: "Oswin", category: "Characters", type: "Alchemist / Lore Character", status: "Canon", spoilerLevel: "Minor Spoiler",
    tags: ["alchemist", "elder", "Tohm skeptic", "Act I"],
    summary: "Oswin is an older alchemist who recognizes that Whisker Woods' corruption resembles magical cooking and forces Gwen to question Tohm's hidden past.",
    internalLore: "Sheltered through Cedar and Lyra, Oswin understands enough about alchemy, corrupted food, and Tohm to recognize a deeper pattern. He does not dump every secret. Instead he asks why Tohm knows these recipes, why creatures are changing through food, and why Gwen should accept her mentor's silence.",
    fields: { "Act I Role": "Investigative lore ally and counterweight to Tohm's secrecy.", Knowledge: "Alchemy, food-borne corruption, old magical history, and reasons to distrust Tohm." },
    connections: { characters: ["Gwen", "Tohm Kyatt", "Cedar", "Lyra"], locations: ["Northern Whisker Woods"], quests: ["Cedar, Lyra, and Oswin", "Corruption Through Consumption"], recipes: ["Dark Culinary Arts", "Magical Meals"] }
  },
  {
    title: "Cedar", category: "Characters", type: "Character", status: "Canon", spoilerLevel: "Minor Spoiler",
    tags: ["northern investigation", "Lyra", "Oswin", "Act I"],
    summary: "Cedar is a northern investigator and Lyra's partner who initially distrusts Gwen's connection to Tohm before helping her reach Oswin.",
    internalLore: "Cedar's exact personality should retain any existing record. His fixed Act I function is to oppose Gwen for understandable reasons, recognize that they are investigating the same corruption, protect or shelter Oswin, and become an ally without losing his skepticism toward Tohm's Magical Meals.",
    fields: { "Act I Role": "Suspicious opponent turned ally; protects or shelters Oswin.", "Canon Guardrail": "Cedar is a separate character from Cedric the Grunt." },
    connections: { characters: ["Gwen", "Lyra", "Oswin", "Tohm Kyatt"], locations: ["Northern Whisker Woods"], quests: ["Cedar, Lyra, and Oswin"] }
  },
  {
    title: "Lyra", category: "Characters", type: "Character", status: "Canon", spoilerLevel: "Minor Spoiler",
    tags: ["northern investigation", "Cedar", "Oswin", "Act I"],
    summary: "Lyra is Cedar's partner in the northern investigation and an intelligent opponent who becomes Gwen's ally after their misunderstanding is resolved.",
    internalLore: "Lyra has reason to distrust Gwen while corruption spreads through magical food tied to Tohm. Her existing personality and deeper lore remain authoritative. In Act I she fights alongside or near Cedar, helps test Gwen's intentions, and connects the investigation to Oswin.",
    fields: { "Act I Role": "Suspicious intelligent opponent turned ally in the northern investigation." },
    connections: { characters: ["Gwen", "Cedar", "Oswin", "Tohm Kyatt"], locations: ["Northern Whisker Woods"], quests: ["Cedar, Lyra, and Oswin"] }
  },
  {
    title: "Mu'Ramar", aliases: ["Mur'amar"], category: "Characters", type: "Character / Mystery", status: "Soft Canon", spoilerLevel: "Major Spoiler",
    tags: ["optional Act I quest", "magical cookies", "timeline mystery"],
    summary: "Mu'Ramar is connected to an optional Act I camp mystery in which a cursed were-creature and contradictory dates reveal that corrupted food can alter people and perhaps memory or time.",
    internalLore: "Preserve Mu'Ramar's established biography and Mas'eel connections. If compatible, Act I includes a destroyed camp, a night-transformed person cursed by magical cookies, and a timeline contradiction that causes Mu'Ramar to disappear. This quest remains soft canon if it conflicts with newer records and must not replace established identity lore.",
    fields: { "Optional Act I Thread": "Destroyed camp, were-creature, magical cookies, and a contradictory timeline.", Status: "Soft Canon pending compatibility with established Mu'Ramar/Mur'amar lore." },
    connections: { characters: ["Gwen", "Cedric the Grunt"], locations: ["Whisker Woods"], quests: ["Corruption Through Consumption"], recipes: ["Magical Cookies", "Dark Culinary Arts"] }
  },
  {
    title: "The Tablemaker", aliases: ["Tablemaker"], category: "Religion & Myth", type: "Foundational Sacred Figure", status: "Canon", spoilerLevel: "Major Spoiler",
    tags: ["Triad", "Love", "Taste", "Passion", "ancient reconciliation"],
    summary: "The Tablemaker ended the ancient human-faery war by sacrificing his life to prepare a meal through which enemies remembered how to share one table.",
    internalLore: "The Tablemaker's meal expressed Love, Taste, and Passion, ended the ancient war, and became foundational to the shared Triad order. The table is where enemies become family. His exact metaphysical relationship to the Triad God remains unresolved and must not be invented as incarnation, son, prophet, or saint without newer confirmation.",
    fields: { "Foundational Act": "Sacrificial meal ending the ancient Ovenhold-Faery war.", "Canon Gap": "Exact metaphysical relationship to the Triad God remains unresolved." },
    connections: { characters: ["Gwen", "Tohm Kyatt"], locations: ["Ovenhold", "Faery Kingdom"], factions: ["Triad Faith"] }
  },
  {
    title: "Ice Queen", aliases: ["Ant Queen", "The Ant Queen"], category: "Enemies & Creatures", type: "Boss / Intelligent Insect Ruler", status: "Canon", spoilerLevel: "Major Spoiler",
    tags: ["Ant Queen", "Ice Queen", "Act I final boss", "intelligent insect", "corrupted ruler"],
    summary: "The Ice Queen is the ancient Ant Queen after a corrupted meal from Lillia transforms her into the tragic ruler of Act I's frozen insect crisis.",
    internalLore: "The Ant Queen once maintained a positive relationship with the Whisken and helped the forest thrive. Young Lillia cared for her when she was wounded, creating genuine trust. Years later the Queen accepted Lillia's Blizzard or Ice Meal because she remembered that kindness. The meal corrupted her body, colony, and environment. Phase one uses her enormous armored insect form; phase two becomes a grotesque ice ballerina. She retains a fragmented memory of Lillia's lullaby. Ant Queen and Ice Queen are one character before and after corruption, not separate entities.",
    fields: { "Original Identity": "Ant Queen", "Corrupted Identity": "Ice Queen", "Boss Phase One": "Massive armored insect ruler with swarms and battlefield ice.", "Boss Phase Two": "Tall, elegant, grotesque ice ballerina with rhythmic attacks.", "Hard Canon": "Ant Queen and Ice Queen are the same individual." },
    connections: { characters: ["Princess Lillia", "Gwen"], locations: ["Whisker Woods", "Ice Queen's Hive"], recipes: ["Blizzard Meal", "Fire Meal", "Dark Culinary Arts"], items: ["Recipe Pages"], factions: ["Ant Colony"] }
  }
];

const normalizeName = (value: string) => value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const mergeConnections = (current: LoreEntry["connections"], patch: Partial<LoreEntry["connections"]> = {}) => ({
  characters: unique([...(current.characters || []), ...(patch.characters || [])]),
  locations: unique([...(current.locations || []), ...(patch.locations || [])]),
  recipes: unique([...(current.recipes || []), ...(patch.recipes || [])]),
  quests: unique([...(current.quests || []), ...(patch.quests || [])]),
  items: unique([...(current.items || []), ...(patch.items || [])]),
  factions: unique([...(current.factions || []), ...(patch.factions || [])]),
  secrets: unique([...(current.secrets || []), ...(patch.secrets || [])]),
  gameplaySystems: unique([...(current.gameplaySystems || []), ...(patch.gameplaySystems || [])]),
  enemies: unique([...(current.enemies || []), ...(patch.enemies || [])]),
  timelineEvents: unique([...(current.timelineEvents || []), ...(patch.timelineEvents || [])])
});

export function mergeActOneCanonEntries(currentEntries: LoreEntry[]): LoreEntry[] {
  const next = currentEntries.map((entry) => normalizeEntry(entry));
  entryPatches.forEach((patch) => {
    const names = [patch.title, ...(patch.aliases || [])].map(normalizeName);
    const matches = next.map((entry, index) => ({ entry, index })).filter(({ entry }) => names.includes(normalizeName(entry.title)));
    const primary = matches[0];
    const existing = primary?.entry || normalizeEntry({ id: slugify(patch.title), title: patch.title, category: patch.category, createdAt: ACT_ONE_STAMP });
    const merged = normalizeEntry({
      ...existing,
      title: patch.title,
      category: patch.category,
      type: patch.type,
      status: patch.status || existing.status,
      spoilerLevel: patch.spoilerLevel || existing.spoilerLevel,
      tags: unique([...(existing.tags || []), ...patch.tags]),
      summary: patch.summary,
      publicDescription: existing.publicDescription || patch.summary,
      internalLore: existing.fields?.seedBatch === "act-one-canon-2026-08-16"
        ? patch.internalLore
        : [
            existing.internalLore,
            `ACT I CANON UPDATE — THE QUEEN BENEATH THE FROST\n${patch.internalLore}`
          ].filter(Boolean).join("\n\n"),
      fields: { ...(existing.fields || {}), ...(patch.fields || {}), seedBatch: "act-one-canon-2026-08-16" },
      connections: mergeConnections(existing.connections, patch.connections),
      createdAt: existing.createdAt || ACT_ONE_STAMP,
      updatedAt: ACT_ONE_STAMP
    }, patch.category);
    if (primary) next[primary.index] = merged;
    else next.push(merged);
    matches.slice(1).reverse().forEach(({ index }) => next.splice(index, 1));
  });
  return next;
}

type WorldSeed = {
  category: WorldBuildingCategoryId;
  title: string;
  aliases?: string[];
  type: string;
  summary: string;
  tags: string[];
  fields: Record<string, string>;
};

const worldSeeds: WorldSeed[] = [
  { category: "myths", title: "Triad Faith", aliases: ["The Tablemaker and Triadic Faith", "Triadic Faith"], type: "Shared Faith and Order", summary: "The shared religious, philosophical, cultural, and gameplay order centered on Love, Taste, and Passion.", tags: ["Love", "Taste", "Passion", "Tablemaker", "Canon"], fields: { overview: "Love, Taste, and Passion are spiritual principles, cultural values, and gameplay ideas. The Triad sets the principles by which authority and life should be judged.", meaning: "A sinful ruler does not make the Triad false. Legitimate earthly authority can remain legitimate while an individual leader acts wrongly.", storyRole: "The Tablemaker's sacrificial meal ended the ancient human-faery war and founded their shared order." } },
  { category: "factions", title: "Ovenhold", type: "Kingdom and Institutional Center", summary: "The human civilization and institutional center of the shared Triad order, where cooking, hospitality, and culinary education carry exceptional prestige.", tags: ["Humans", "Triad", "Kingdom", "Academy"], fields: { overview: "Ovenhold is the central human kingdom and institutional center of the Triad order.", leadership: "Led by the King and Queen of Ovenhold; the office remains legitimate even when its holder sins.", beliefsGoals: "Food, hospitality, the table, chefs, ritual, and culinary education shape public life.", storyRole: "Home of Lillia, the royal family, and the political consequences of the Dragon Knife war." } },
  { category: "factions", title: "Faery Kingdom", aliases: ["Faery Realm"], type: "Kingdom within the Shared Triad Order", summary: "A self-governing faery kingdom that retains its identity, hierarchy, military, and culture while sharing the greater Triad order with Ovenhold.", tags: ["Faeries", "Triad", "Tablemaker", "Lel Kai"], fields: { overview: "The Faery Kingdom was once at war with humanity but reconciled through the Tablemaker's final meal.", leadership: "Retains its own nobility, governance, military, hierarchy, and cultural identity.", storyRole: "Lel Kai can serve and eventually become General of Ovenhold without abandoning his faery identity." } },
  { category: "factions", title: "Dwarven Kingdom", type: "Independent Kingdom", summary: "An independent civilization of powerful magical craftsmanship and the original holder of the Dragon Knife.", tags: ["Dwarves", "Dragon Knife", "War"], fields: { overview: "The dwarves possessed the Dragon Knife and refused the King of Ovenhold's demand for it.", storyRole: "The King's war to seize the Knife is one of his major moral failures and part of Lillia's magical origin." } },
  { category: "factions", title: "Royal House of Ovenhold", type: "Royal Family", summary: "The King, Queen, and Princess Lillia, whose family choices connect royal authority to the Dragon Knife and Dark Culinary Arts.", tags: ["Ovenhold", "King", "Queen", "Lillia"], fields: { leadership: "King and Queen of Ovenhold; Princess Lillia is their daughter.", storyRole: "The King's disordered love for Lillia drives the Dragon Knife conflict and creates the conditions for Tohm's unstable dish." } },
  { category: "factions", title: "Culinary Imperial Academy", aliases: ["Culinary Imperial Academy of Unhold"], type: "Culinary Institution", summary: "The prestigious Academy where Gwen completes her formal education and passes her final qualification examination after apprenticing under Tohm.", tags: ["Academy", "Gwen", "Cooking", "Ovenhold", "Unhold naming unresolved"], fields: { overview: "Gwen studied here, left for roughly two years of practical apprenticeship under Tohm, then returned for her final examination.", storyRole: "The final test requires Gwen to create and present an original dish that proves her culinary identity.", unresolved: "Use one Academy record. The relationship between the names Unhold and Ovenhold remains unresolved." } },
  { category: "factions", title: "Whisken Community of Whisker Woods", type: "Community", summary: "The Whisken tavern-and-village community Gwen chooses over the Academy's prestigious Feast celebration.", tags: ["Whisken", "Whisker Woods", "Feast of Full Plates"], fields: { overview: "Includes Tohm, Kap, villagers, farmers, fishers, and the tavern community.", beliefsGoals: "Food is shared through hospitality, gratitude, abundance, reconciliation, and communal responsibility.", storyRole: "The community gives Gwen a home worth defending throughout Act I." } },
  { category: "factions", title: "Ant Colony", aliases: ["Insect Kingdom", "Intelligent Insect Society"], type: "Intelligent Insect Society", summary: "An organized society beneath Whisker Woods that once cooperated with the Whisken under the Ant Queen before corruption transformed it into a hostile frozen army.", tags: ["Ant Queen", "Ice Queen", "Whisker Woods", "Act I"], fields: { overview: "The colony contains hierarchy, gathering, food logistics, nests, chambers, workers, and a ruling Queen.", storyRole: "Lillia's corrupted meal changes the Queen and spreads through the colony, creating the Act I crisis." } },
  { category: "cultures", title: "Humans", aliases: ["Human Kingdom"], type: "People", summary: "Humans are one of the major peoples of the shared Triad civilization, with Ovenhold as their central kingdom and culinary institution.", tags: ["Humans", "Ovenhold", "Triad"], fields: { overview: "Important human characters include Gwen, Lillia, the King and Queen, and the unnamed Academy rival.", dailyLife: "Ovenhold's human culture gives exceptional prestige to cooking, chefs, hospitality, ritual, and education.", relationships: "Humans and faeries share one Triad order after the Tablemaker ended their ancient war." } },
  { category: "cultures", title: "Whisken People", aliases: ["Wiscan People", "Wisken", "Whisken"], type: "People and Culture", summary: "A cat-like people tied to Tabby Island, Whisker Woods, tavern culture, food, the Feast of Full Plates, and Tohm Kyatt.", tags: ["Whisken", "Tabby Island", "Whisker Woods", "Feast"], fields: { overview: "Use the existing canonical spelling and treat Wiscan/Wisken as aliases rather than separate peoples.", dailyLife: "Food, hospitality, taverns, fishing, gathering, and communal feasts shape village life.", beliefsCustoms: "Most follow the shared Triad faith through Whisken traditions, including the Feast of Full Plates." } },
  { category: "cultures", title: "Faeries", aliases: ["Fairies"], type: "People and Culture", summary: "The people of the Faery Kingdom retain their own culture, hierarchy, military, governance, nobility, and identity within the greater Triad order.", tags: ["Faeries", "Faery Kingdom", "Triad"], fields: { overview: "Faeries are not a separate competing religion from Ovenhold's humans.", relationships: "The Tablemaker's meal reconciled faeries and humans after the ancient war." } },
  { category: "cultures", title: "Goblins", type: "People", summary: "Goblins are established in Act I through Bug, a goblin character who uses lightning magic.", tags: ["Goblins", "Bug", "Lightning"], fields: { overview: "Do not invent an entire goblin civilization beyond existing records.", relationships: "Bug is the confirmed Act I example." } },
  { category: "cultures", title: "Dwarves", type: "People", summary: "The people of the Dwarven Kingdom are known for powerful magical craftsmanship and originally possessed the Dragon Knife.", tags: ["Dwarves", "Dragon Knife", "Dwarven Kingdom"], fields: { overview: "The King of Ovenhold wages war after the dwarves refuse to surrender the Dragon Knife.", relationships: "The conflict carries major political and moral importance later in the story." } },
  { category: "cultures", title: "Intelligent Undead", aliases: ["Skeletons", "Undead"], type: "People / Existence", summary: "Cedric proves that intelligent skeletons can speak, negotiate, fear danger, conduct commerce, and change allegiance.", tags: ["Undead", "Skeletons", "Cedric"], fields: { overview: "Do not portray every skeleton as mindless or inherently evil.", relationships: "Cedric becomes Gwen's recurring Charm-system ally." } },
  { category: "locations", title: "Whisker Woods", aliases: ["Whisper Woods"], type: "Main Act I Region", summary: "A cozy food-rich forest community of villages, farms, ponds, groves, caves, and taverns that becomes the center of an expanding insect-and-frost corruption.", tags: ["Act I", "Gwen", "Whisken", "Ice Queen"], fields: { overview: "Main Act I region and Gwen's chosen home after qualifying as a chef.", history: "Whisken and the Ant Queen once sustained a positive relationship here.", inhabitants: "Whisken villagers, Tohm, Kap, Juno, Brambrake, wildlife, slimes, and the intelligent insect colony.", gameplayUse: "Hub, gathering region, farms, ponds, bosses, Fire Meal routes, northern caverns, and final hive." } },
  { category: "locations", title: "Tohm's Tavern", aliases: ["Living Tavern"], type: "Tavern and Act I Hub", summary: "Gwen's Act I home and hub for the Feast of Full Plates, cooking, quests, Magical Meal development, and character scenes.", tags: ["Tohm", "Gwen", "Whisker Woods", "Feast"], fields: { overview: "A warm living tavern within Whisker Woods where Tohm trains Gwen and serves the community.", history: "Connected to Tohm's long travels and hidden culinary research.", gameplayUse: "Hub for cooking, quests, conversations, upgrades, and story returns." } },
  { category: "locations", title: "Kap's Pond", type: "Corrupted Pond", summary: "The early Act I rescue location where Gwen saves Kap and defeats a corrupted Prawnhusk.", tags: ["Kap", "Prawnhusk", "Corruption", "Act I"], fields: { overview: "A fishing pond darkened by corruption and surrounded by aggressive insects.", gameplayUse: "Opening rescue, insect combat, Prawnhusk tutorial boss, and later environmental restoration." } },
  { category: "locations", title: "Brambrake's Gate", type: "Story Barrier", summary: "The massive gate blocking northern Whisker Woods, controlled by the unseen Brambrake until the crisis reaches his side.", tags: ["Brambrake", "North", "Act I"], fields: { overview: "A territorial barrier between the village region and frozen north.", gameplayUse: "Repeated story gate; do not reveal Brambrake's face until it opens." } },
  { category: "locations", title: "Northern Whisker Woods", type: "Corrupted Forest Region", summary: "The portion of Whisker Woods consumed by unnatural frost as the Ice Queen's influence spreads.", tags: ["Ice Queen", "Blizzard", "Act I"], fields: { overview: "Frozen roots, altered wildlife, dense nests, and cavern entrances increasingly match Gwen's trance.", gameplayUse: "Fire-gated exploration, bosses, colony investigation, and route to the hive." } },
  { category: "locations", title: "Northern Cavern", aliases: ["Thairrott's Area", "Thairrott's Cavern"], type: "Boss Region", summary: "The skeletal-root cavern guarded by Thairrott before the deeper insect colony.", tags: ["Thairrott", "Cavern", "Act I"], fields: { overview: "Ancient roots, bones, frozen tunnels, and the gateway into organized colony space.", gameplayUse: "Thairrott boss and transition from surface exploration into the hive network." } },
  { category: "locations", title: "Ice Queen's Hive", type: "Act I Final Dungeon", summary: "The organized frozen insect city beneath Whisker Woods and the real location reflected in Gwen's Fire Meal trance.", tags: ["Ice Queen", "Ant Colony", "Final Dungeon", "Act I"], fields: { overview: "Egg chambers, food stores, frozen roots, social spaces, defenses, and the Queen's chamber.", history: "Once part of a functioning Whisken-insect relationship before Lillia's meal corrupted the Queen.", gameplayUse: "Final dungeon, Ice Queen two-phase boss, and first recipe-page recovery." } },
  { category: "foodAndRecipes", title: "Gwen's Graduation Dish", type: "Examination Dish", summary: "The original dish Gwen creates for her final Academy examination and later recreates for Tohm during the Feast of Full Plates.", tags: ["Gwen", "Academy", "Name TBD", "Act I"], fields: { overview: "Represents Gwen's own culinary identity after Academy study and Tohm's apprenticeship.", culinaryUse: "Final name and exact recipe remain intentionally unresolved.", storyFunction: "Proves Gwen is a qualified chef and gives her homecoming feast personal meaning." } },
  { category: "foodAndRecipes", title: "Fire Meal", type: "Magical Meal", summary: "Gwen's first major Magical Meal grants fire-based combat power and pulls her into a trance connected to Lillia, the Ant Queen, and the real hive beneath Whisker Woods.", tags: ["Gwen", "Tohm", "Fire", "First Trance", "Act I"], fields: { overview: "Prepared through Tohm's recipe and Gwen's cooking; exact final ingredient list remains editable.", gameplayUse: "Flaming sword, burn damage, explosive heat, cold resistance, projectiles, or a fire ultimate according to final combat design.", magicalEffect: "Triggers Gwen's first trance and becomes the main counter to the Ice Queen.", storyFunction: "Connects cooking, combat progression, memory, and the Act I mystery." } },
  { category: "foodAndRecipes", title: "Blizzard Meal", aliases: ["Ice Meal"], type: "Corrupted Magical Meal / Recipe Page", summary: "The likely ice-associated meal Lillia gives the trusting Ant Queen, transforming her into the Ice Queen; exact final name remains reviewable.", tags: ["Lillia", "Ice Queen", "Recipe Page", "Name Review"], fields: { overview: "A torn-page recipe connected to the Ice Queen's corruption and recovered after the Act I boss.", magicalEffect: "Transforms the Ant Queen, spreads frost through the colony, and creates magical winter.", unresolved: "Use Blizzard Meal unless a newer confirmed Ice Meal name supersedes it." } },
  { category: "foodAndRecipes", title: "Corruption Through Consumption", type: "Culinary Magic Rule", summary: "Magical food can carry healing and unity, but corrupted food can also alter minds, bodies, creatures, and ecosystems.", tags: ["Dark Culinary Arts", "Magical Meals", "Act I", "World Rule"], fields: { overview: "Act I creatures change because they consume corrupted meals, ingredients, recipe fragments, or residue.", magicalEffect: "Can corrupt, mutate, enslave, alter minds, transform bodies, and spread through ecosystems.", storyFunction: "Dark mirror of Gwen's food-based progression." } },
  { category: "items", title: "Academy Qualification", aliases: ["Chef Seal"], type: "Credential", summary: "Proof that Gwen passed the Culinary Imperial Academy's final examination and is officially qualified as a chef.", tags: ["Gwen", "Academy", "Act I"], fields: { overview: "Earned immediately before Gwen returns to Whisker Woods.", history: "Tohm examines it with rare visible pride during the Feast of Full Plates." } },
  { category: "items", title: "Gwen's Sword", type: "Weapon", summary: "Gwen's primary combat weapon and the focus through which she first channels the Fire Meal.", tags: ["Gwen", "Combat", "Fire Meal"], fields: { powersUses: "Baseline sword combat; can become flame-wreathed while Fire Meal power is active." } },
  { category: "items", title: "Gwen's Basket", type: "Gathering and Inventory Item", summary: "Gwen's practical gathering identity item, used to carry ingredients gathered across Whisker Woods.", tags: ["Gwen", "Gathering", "Inventory"], fields: { powersUses: "Supports gathering, ingredient collection, and Gwen's visual identity." } },
  { category: "items", title: "Tohm's Recipe Book", aliases: ["Recipe Book"], type: "Magical Culinary Artifact", summary: "Tohm's book of dangerous culinary knowledge, from which Lillia tears pages that later spread the Dark Culinary Arts.", tags: ["Tohm", "Lillia", "Recipe Pages", "Major Spoiler"], fields: { history: "Tohm keeps the main book during his struggle with Lillia, but she escapes with multiple torn pages.", powersUses: "Source of powerful Magical Meal knowledge and the long-term recovery quest." } },
  { category: "items", title: "Recipe Pages", aliases: ["Torn Recipe Pages"], type: "Story Collectible", summary: "Pages torn from Tohm's Recipe Book that carry dangerous culinary magic, empower corrupted bosses, and become Gwen's long-term recovery objective.", tags: ["Gwen", "Tohm", "Lillia", "Progression"], fields: { powersUses: "Recovered from bosses to restore knowledge, unlock meals, and reveal the truth behind Dark Culinary Arts.", history: "Lillia tore them from Tohm's book after consuming his unstable dark meal." } },
  { category: "items", title: "Dragon Knife", type: "Dwarven Magical Artifact", summary: "A powerful dwarven artifact seized after the King of Ovenhold wages war in his attempt to grant Lillia magic.", tags: ["Dwarves", "King of Ovenhold", "Lillia", "Tohm"], fields: { history: "The Dwarven Kingdom refuses to surrender it; Ovenhold's King goes to war and takes it.", powersUses: "Later becomes part of Tohm's dangerous creation of the meal that gives Lillia magic." } },
  { category: "items", title: "Charms", type: "Upgrade Items", summary: "Passive or modifying equipment managed through Cedric's recurring merchant and upgrade role.", tags: ["Cedric", "Upgrades", "Act I"], fields: { powersUses: "Sell, equip, improve, modify, or upgrade gameplay bonuses.", history: "Cedric turns his survival after Gwen defeats him into an ongoing business relationship." } }
];

const questSeeds: WorldSeed[] = actOneStoryChapters.map((chapter, index) => ({
  category: "quests" as const,
  title: chapter.title,
  type: index === 0 || index === actOneStoryChapters.length - 1 ? "Main Story Chapter" : "Act I Story Node",
  summary: chapter.shortDescription,
  tags: ["Act I", `Chapter ${index + 1}`, ...chapter.relatedLore.slice(0, 4)],
  fields: {
    overview: chapter.shortDescription,
    storyBeats: chapter.pages.map((page) => page.text).join("\n\n"),
    objectives: chapter.pages[0]?.callouts?.find((callout) => callout.kind === "consequence")?.text || "Advance the Act I story.",
    connectedWorldbuilding: chapter.relatedLore.join(", "),
    chronology: `Act I — The Queen Beneath the Frost · Chapter ${index + 1} of ${actOneStoryChapters.length}`
  }
}));

export function mergeActOneCanonWorldBuilding(currentWorld: WorldBuildingData): WorldBuildingData {
  const next = normalizeWorldBuilding(currentWorld);
  [...worldSeeds, ...questSeeds].forEach((seed) => {
    const aliases = [seed.title, ...(seed.aliases || [])].map(normalizeName);
    let existingCategory: WorldBuildingCategoryId | undefined;
    let existingIndex = -1;
    (Object.keys(next) as WorldBuildingCategoryId[]).some((category) => {
      const index = next[category].findIndex((entry) => aliases.includes(normalizeName(entry.title)));
      if (index < 0) return false;
      existingCategory = category;
      existingIndex = index;
      return true;
    });
    const existing = existingCategory && existingIndex >= 0 ? next[existingCategory][existingIndex] : undefined;
    const merged = normalizeWorldBuildingEntry({
      ...(existing || {}),
      id: existing?.id || `world-${seed.category}-${slugify(seed.title)}`,
      title: seed.title,
      category: seed.category,
      type: seed.type,
      summary: seed.summary,
      tags: unique([...(existing?.tags || []), ...seed.tags]),
      fields: { ...(existing?.fields || {}), ...seed.fields, seedBatch: "act-one-canon-2026-08-16" },
      relatedEntries: existing?.relatedEntries || [],
      linkedStoryReferenceIds: existing?.linkedStoryReferenceIds || [],
      image: existing?.image || "",
      imageFit: existing?.imageFit,
      createdAt: existing?.createdAt || ACT_ONE_STAMP,
      updatedAt: ACT_ONE_STAMP
    }, seed.category);
    if (existingCategory && existingIndex >= 0) next[existingCategory].splice(existingIndex, 1);
    next[seed.category].push(merged);
  });
  return next;
}

type CreaturePatch = Partial<BestiaryCreature> & { name: string; aliases?: string[] };
const creaturePatches: CreaturePatch[] = [
  { name: "Prawnhusk", status: "Canon", type: "Act I Tutorial Boss", category: "Insects", habitat: "Kap's Pond, Whisker Woods", description: "A giant corrupted pond creature that emerges while Gwen rescues Kap and serves as her first major Act I boss.", behavior: "Uses heavy claw swipes, charges, and territorial pond attacks.", gameplayPurpose: "Teach dodging, blocking or parrying, attack tells, and punish windows.", lore: { origin: "Altered by the corruption spreading through Kap's Pond.", questConnections: "Kap's Corrupted Pond", hiddenNotes: "Its residue is early evidence that the forest crisis spreads through consumed corruption.", culturalMeaning: "", rumors: "", relatedCreatures: "Crayhusks", fullStory: "Gwen defeats the Prawnhusk on the day she returns to Whisker Woods, saving Kap before the Feast of Full Plates." } },
  { name: "Magical Boar", aliases: ["Mystical Boar"], status: "Canon", type: "Act I Ingredient Boss", category: "Wildlife", habitat: "Whisker Woods", description: "A boar made unnaturally powerful by magical residue in its food, introducing rare ingredients and corruption through consumption.", behavior: "Charges, breaks trees, and forces deliberate timing.", gameplayPurpose: "Teach hunting, stronger ingredients, and food-chain corruption.", lore: { origin: "Transformed after consuming magical residue.", questConnections: "The Magical Boar", hiddenNotes: "Shows the Dark Culinary Arts' mechanism before Gwen knows its name.", culturalMeaning: "", rumors: "", relatedCreatures: "", fullStory: "The hunt gives Gwen a rare ingredient and proof that creatures are changing because of what they eat." } },
  { name: "Thairrott", status: "Canon", type: "Act I Gatekeeper Boss", category: "Ancient Beasts", habitat: "Northern Cavern, Whisker Woods", description: "An enormous skeletal-root guardian that blocks the route into the organized insect colony.", behavior: "Uses heavy bone-and-root attacks and controls the cavern entrance.", gameplayPurpose: "Gate the darker half of Act I and test Fire Meal use against rooted defenses.", lore: { origin: "An ancient force beneath Whisker Woods awakened by the spreading corruption.", questConnections: "Thairrott", hiddenNotes: "Final design follows the newest approved art.", culturalMeaning: "", rumors: "", relatedCreatures: "", fullStory: "Defeating Thairrott opens the path into the colony and reveals the crisis is larger than a surface infestation." } },
  { name: "Ice Queen", aliases: ["Ant Queen"], status: "Canon", type: "Act I Final Boss", category: "Insects", habitat: "Ice Queen's Hive, Whisker Woods", description: "The ancient Ant Queen after Lillia's corrupted meal transforms her into the tragic ruler of the frozen colony.", behavior: "Commands insects and ice in a massive first phase, then fights as a grotesque rhythmic ice ballerina.", gameplayPurpose: "Act I culmination using Fire Meal, combat fundamentals, supplies, and knowledge earned across the entire region.", lore: { origin: "Once an ally of the Whisken. She trusted Lillia because Lillia genuinely cared for her when wounded as a child.", questConnections: "Ice Queen — Phase One; Ice Queen — Phase Two; The Recipe Page", hiddenNotes: "Ant Queen and Ice Queen are the same individual. She retains fragmented memory of Lillia's lullaby.", culturalMeaning: "A tragedy of trust corrupted through food.", rumors: "The Queen has become cold.", relatedCreatures: "Ant Colony, Crayhusks, Dappleflies", fullStory: "Lillia returns years after earning the Queen's trust and feeds her a corrupted Blizzard Meal. Gwen eventually recognizes the Queen's old scar, defeats both forms, and recovers the recipe page." } }
];

export function mergeActOneCanonBestiary(currentCreatures: BestiaryCreature[]): BestiaryCreature[] {
  const next = currentCreatures.map((creature) => normalizeBestiaryCreature(creature));
  creaturePatches.forEach((patch) => {
    const names = [patch.name, ...(patch.aliases || [])].map(normalizeName);
    const matches = next.map((creature, index) => ({ creature, index })).filter(({ creature }) => names.includes(normalizeName(creature.name)));
    const primary = matches[0];
    const existing = primary?.creature;
    const merged = normalizeBestiaryCreature({
      ...(existing || {}),
      ...patch,
      id: existing?.id || slugify(patch.name),
      name: patch.name,
      slotImage: existing?.slotImage || "",
      image: existing?.image || "",
      expandedImage: existing?.expandedImage || "",
      hoverImage: existing?.hoverImage || "",
      lore: { ...(existing?.lore || {}), ...(patch.lore || {}) },
      artVault: existing?.artVault,
      driveFolderId: existing?.driveFolderId || "",
      driveFolderLink: existing?.driveFolderLink || "",
      createdAt: existing?.createdAt || ACT_ONE_STAMP,
      updatedAt: ACT_ONE_STAMP
    });
    if (primary) next[primary.index] = merged;
    else next.push(merged);
    matches.slice(1).reverse().forEach(({ index }) => next.splice(index, 1));
  });
  return next;
}

export function mergeActOneStoryJourney(current: StoryJourneyData): StoryJourneyData {
  const normalized = normalizeStoryJourneyData(current);
  if (!normalized.chapters.length) return normalized;
  const retained = normalized.chapters.filter((chapter) => chapter.id !== LEGACY_ACT_ONE_CHAPTER_ID && !ACT_ONE_STORY_CHAPTER_IDS.has(chapter.id));
  // This migration intentionally replaces the previous short Act I treatment once.
  // After schema 14, ordinary Story Journey edits remain user-owned and are preserved.
  const replacements = actOneStoryChapters;
  const laterIndex = retained.findIndex((chapter) => chapter.id === "truth-of-tabby-island" || chapter.scope === "act3");
  if (laterIndex >= 0) retained.splice(laterIndex, 0, ...replacements);
  else retained.push(...replacements);
  return normalizeStoryJourneyData({
    ...normalized,
    chapters: retained,
    updatedAt: ACT_ONE_STAMP
  });
}

const ACT_ONE_POND_REVISION_STAMP = "2026-08-17T20:00:00.000Z";

const whiskerWoodsWarningText = `The path home should be familiar, but **Whisker Woods** feels wrong almost immediately. Insects appear in unusual numbers. Beetles and **Dappleflies** behave with unnatural aggression, **egg clusters** cling to places where they should not exist, and frightened wildlife has been pushed out of its normal territory.

The signs do not yet form a complete answer, but they are too consistent to dismiss as a bad season. Something is disturbing the forest's natural balance.

As **Gwen** continues toward the tavern, she suddenly hears someone screaming for help somewhere deeper in the woods. She follows the voice until she reaches a **large corrupted pond**, where she finds **Kap** stranded in the middle while hostile insects swarm around him.

Gwen has been away completing her final Academy exam and has heard nothing about what has happened to Whisker Woods. Seeing the forest like this leaves her confused and immediately concerned.`;

const corruptedPondOverview = `While returning to the tavern, Gwen hears Kap screaming for help and follows his voice to a large corrupted pond. Kap is stranded in the middle while aggressive insects swarm around him. After learning that he came here trying to catch a special fish as a welcome-home gift for her, Gwen fights through the insects to rescue him. Just as she is about to reach Kap, the ground begins to shake. Kap looks behind her and screams a warning. Gwen turns to see something she never expected to encounter on the surface: a Prawnhusk.`;

const corruptedPondText = `While traveling back toward the tavern, **Gwen** hears someone screaming for help. She follows the voice through the woods until she reaches a **large corrupted pond**, its water darkened and its surrounding vegetation beginning to die.

Insects swarm throughout the area, and **Kap** is stranded in the middle of the pond.

Gwen calls out to him, demanding to know what he is doing out here and what has happened to Whisker Woods. She has only just returned from taking her final Academy exam and has received no word about the strange changes spreading through the forest.

Kap, however, is mostly relieved to see her.

He excitedly welcomes Gwen home and explains that he came to the pond because he had heard there was an especially good fish living there. He wanted to catch it and give it to her as a **welcome-back gift**.

Gwen quickly realizes that Kap's idea of a gift is a raw fish that **she would then have to cook herself**.

She questions him on this ridiculous logic, while Kap sees absolutely nothing wrong with the idea.

Gwen fights through the hostile insects surrounding the pond and clears a path toward Kap.

Just as she is about to rescue him, **the ground begins to shake**.

Kap suddenly looks past Gwen and screams:

**“Gwen! Behind you!”**

Gwen turns around.

A massive **Prawnhusk** has emerged from beneath the ground.

Gwen is stunned.

Prawnhusks are not creatures that should be anywhere near the surface. They are known to live **deep beneath the earth in dangerous underground cave systems**, and Gwen has never actually seen one before. She recognizes the creature only from what she has read.

Kap has no idea what he is looking at.

Gwen explains that it is a Prawnhusk and that its presence this far above ground makes no sense. She then remembers something else she has read about them: **Prawnhusk meat is said to have an extraordinary flavor and is considered one of the finest insect meats.**

The Prawnhusk attacks, turning the rescue into **Gwen's first major combat test after returning home**.

Gwen defeats the creature, rescues Kap, and takes some of the Prawnhusk meat with her before continuing toward the tavern.

The discovery gives Gwen another troubling clue that whatever is happening in Whisker Woods is affecting creatures far beyond their normal habitats.

She does not yet know why.

Later, when **Tom / Tohm Kyatt** sees that Gwen has somehow returned with Prawnhusk meat, he is shocked. The rare meat is exactly the ingredient he needs to **make the Fire Meal again**.

Importantly, Gwen does **not** use the Prawnhusk meat in place of the boar meat for her Feast of Full Plates dish. She still recreates the winning dish from her Academy exam using **boar meat**.`;

type PondChapterReplacement = {
  title: string;
  subtitle: string;
  overviewText: string;
  text: string;
  relatedLore: string[];
  playerKnowledge: string;
  consequence: string;
};

const pondChapterReplacements: Record<string, PondChapterReplacement> = {
  "act1-woods-feel-wrong": {
    title: "Something Is Wrong with Whisker Woods",
    subtitle: "Gwen's homecoming is interrupted by the first clear sign that something is wrong.",
    overviewText: "The path home should be familiar, but Whisker Woods feels wrong almost immediately.",
    text: whiskerWoodsWarningText,
    relatedLore: ["Gwen", "Whisker Woods", "Dappleflies", "Egg Clusters", "Kap", "Corrupted Pond"],
    playerKnowledge: "The forest's insects and wildlife are behaving unnaturally, but Gwen does not yet know the cause.",
    consequence: "Gwen's homecoming is interrupted by the first clear sign that something has gone seriously wrong in Whisker Woods."
  },
  "act1-kaps-corrupted-pond": {
    title: "The Corrupted Pond",
    subtitle: "Gwen's journey home becomes an unexpected rescue.",
    overviewText: corruptedPondOverview,
    text: corruptedPondText,
    relatedLore: ["Gwen", "Kap", "Whisker Woods", "Corrupted Pond", "Prawnhusk", "Prawnhusk Meat", "Tohm Kyatt", "Fire Meal", "Boar Meat"],
    playerKnowledge: "Creatures are appearing far outside their natural habitats, and the corruption spreading through Whisker Woods is becoming increasingly abnormal. Gwen now possesses rare Prawnhusk meat, though she does not yet understand how important it will become.",
    consequence: "Kap is rescued, Gwen gains further evidence that something is deeply wrong with the forest, and the Prawnhusk meat provides Tom with the missing ingredient needed to create the Fire Meal, setting up Gwen's first trance."
  }
};

export function replaceActOnePondStoryChapters(current: StoryJourneyData): StoryJourneyData {
  const normalized = normalizeStoryJourneyData(current);
  let changed = false;
  const chapters = normalized.chapters.map((chapter) => {
    const replacement = pondChapterReplacements[chapter.id];
    if (!replacement) return chapter;
    changed = true;
    const page = chapter.pages[0];
    const pageId = page?.id || `${chapter.id}-sequence-1`;
    const callouts = [
      {
        id: page?.callouts?.find((callout) => callout.kind === "playerKnowledge")?.id || `${pageId}-knowledge`,
        kind: "playerKnowledge" as const,
        label: "Player knowledge",
        text: replacement.playerKnowledge
      },
      {
        id: page?.callouts?.find((callout) => callout.kind === "consequence")?.id || `${pageId}-consequence`,
        kind: "consequence" as const,
        label: "Story consequence",
        text: replacement.consequence
      }
    ];
    return normalizeStoryJourneyChapter({
      ...chapter,
      title: replacement.title,
      subtitle: replacement.subtitle,
      shortDescription: replacement.subtitle,
      overviewText: markdownToRichText(replacement.overviewText),
      relatedLore: replacement.relatedLore,
      threads: ["Gwen", "Act I", ...replacement.relatedLore],
      sourceRecords: replacement.relatedLore.map((label) => ({ type: sourceTypeFor(label), id: slugify(label), label })),
      pages: [{
        ...page,
        id: pageId,
        title: replacement.title,
        text: markdownToRichText(replacement.text),
        relatedLore: replacement.relatedLore,
        threads: ["Gwen", "Act I", ...replacement.relatedLore],
        callouts,
        sourceRecords: replacement.relatedLore.map((label) => ({ type: sourceTypeFor(label), id: slugify(label), label }))
      }]
    }, chapter.id);
  });

  return changed
    ? normalizeStoryJourneyData({ ...normalized, chapters, updatedAt: ACT_ONE_POND_REVISION_STAMP })
    : normalized;
}
