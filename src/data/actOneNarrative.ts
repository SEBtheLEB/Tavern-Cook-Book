import type { StoryJourneyCallout, StoryJourneyChapterRecord } from "../types";
import { normalizeStoryJourneyChapter } from "../utils/storyJourneyData";
import { slugify } from "../utils/entries";
import masterSource from "./storySources/act-one-queen-beneath-frost.txt?raw";
import revisionSource from "./storySources/act-one-revised-opening.txt?raw";

const splitSections = (source: string) => source
  .split(/^---\s*$/m)
  .map((section) => section.trim())
  .filter(Boolean);

const master = splitSections(masterSource);
const revision = splitSections(revisionSource);

const withoutLeadingHeadings = (text: string) => text.replace(/^(?:#{1,3}[^\n]*\r?\n\s*)+/, "").trim();
const fromMarker = (text: string, marker: string) => text.slice(Math.max(0, text.indexOf(marker))).trim();
const beforeMarker = (text: string, marker: string) => {
  const index = text.indexOf(marker);
  return (index < 0 ? text : text.slice(0, index)).trim();
};

// Story Journey stores rich text. This converts only the author's Markdown formatting;
// the wording remains the supplied narrative verbatim.
export const markdownToRichText = (source: string) => source
  .trim()
  .split(/\r?\n\r?\n/)
  .map((block) => {
    const trimmed = block.trim();
    const formatted = trimmed
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
    if (/^###\s+/.test(formatted)) return `<h4>${formatted.replace(/^###\s+/, "")}</h4>`;
    if (/^##\s+/.test(formatted)) return `<h3>${formatted.replace(/^##\s+/, "")}</h3>`;
    if (/^#\s+/.test(formatted)) return `<h2>${formatted.replace(/^#\s+/, "")}</h2>`;
    return `<p>${formatted.replace(/\r?\n/g, "<br>")}</p>`;
  })
  .join("");

type NarrativeChapter = {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  relatedLore: string[];
  callouts: Array<Omit<StoryJourneyCallout, "id">>;
};

const insight = (
  playerKnowledge: string,
  consequence: string,
  extra?: Omit<StoryJourneyCallout, "id">
): NarrativeChapter["callouts"] => [
  { kind: "playerKnowledge", label: "Player knowledge", text: playerKnowledge },
  { kind: "consequence", label: "Story consequence", text: consequence },
  ...(extra ? [extra] : [])
];

const chapters: NarrativeChapter[] = [
  {
    id: "act1-revised-opening",
    title: "Gwen's Final Examination",
    subtitle: "Gwen completes her education and chooses to return home.",
    text: withoutLeadingHeadings(revision[0]),
    relatedLore: ["Gwen", "Tohm Kyatt", "Culinary Imperial Academy of Unhold", "Feast of Full Plates", "Whisper Woods"],
    callouts: insight("Gwen begins the playable story as a qualified chef after two years of practical placement under Tohm.", "Her decision to leave the Academy celebration establishes that home and community matter more to her than prestige.", { kind: "canonGap", label: "Canon check", text: "The supplied revision uses Unhold and Whisper Woods. Existing records may still use Ovenhold and Whisker Woods, so those names remain flagged for canon review." })
  },
  {
    id: "act1-woods-feel-wrong",
    title: "Something Is Wrong with Whisker Woods",
    subtitle: "Gwen's homecoming is interrupted by the first clear sign that something has gone seriously wrong.",
    text: `The path home should be familiar, but **Whisker Woods** feels wrong almost immediately. Insects appear in unusual numbers. Beetles and **Dappleflies** behave with unnatural aggression, **egg clusters** cling to places where they should not exist, and frightened wildlife has been pushed out of its normal territory.

The signs do not yet form a complete answer, but they are too consistent to dismiss as a bad season. Something is disturbing the forest's natural balance.

As **Gwen** continues toward the tavern, she suddenly hears someone screaming for help somewhere deeper in the woods. She follows the voice until she reaches a **large corrupted pond**, where she finds **Kap** stranded in the middle while hostile insects swarm around him.

Gwen has been away completing her final Academy exam and has heard nothing about what has happened to Whisker Woods. Seeing the forest like this leaves her confused and immediately concerned.`,
    relatedLore: ["Gwen", "Whisker Woods", "Dappleflies", "Egg Clusters", "Kap", "Corrupted Pond"],
    callouts: insight("The forest's insects and wildlife are behaving unnaturally, but Gwen does not yet know the cause.", "Gwen's homecoming is interrupted by the first clear sign that something has gone seriously wrong in Whisker Woods.")
  },
  {
    id: "act1-kaps-corrupted-pond",
    title: "The Corrupted Pond",
    subtitle: "Gwen's journey home becomes an unexpected rescue.",
    text: `While traveling back toward the tavern, **Gwen** hears someone screaming for help. She follows the voice through the woods until she reaches a **large corrupted pond**, its water darkened and its surrounding vegetation beginning to die.

Insects swarm throughout the area, and **Kap** is stranded in the middle of the pond.

Gwen calls out to him, demanding to know what he is doing out here and what has happened to Whisker Woods. She has only just returned from taking her final Academy exam and has received no word about the strange changes spreading through the forest.

Kap, however, is mostly relieved to see her.

He excitedly welcomes Gwen home and explains that he came to the pond because he had heard there was an especially good fish living there. He wanted to catch it and give it to her as a **welcome-back gift**.

Gwen quickly realizes that Kap's idea of a gift is a raw fish that **she would then have to cook herself**.

She questions him on this ridiculous logic, while Kap sees absolutely nothing wrong with the idea.

Gwen fights through the hostile insects surrounding the pond and clears a path toward Kap.

Just as she is about to rescue him, **the ground begins to shake**.

Kap suddenly looks past Gwen and screams:

**"Gwen! Behind you!"**

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

Importantly, Gwen does **not** use the Prawnhusk meat in place of the boar meat for her Feast of Full Plates dish. She still recreates the winning dish from her Academy exam using **boar meat**.`,
    relatedLore: ["Gwen", "Kap", "Whisker Woods", "Corrupted Pond", "Prawnhusk", "Prawnhusk Meat", "Tohm Kyatt", "Fire Meal", "Boar Meat"],
    callouts: insight("Creatures are appearing far outside their natural habitats, and the corruption spreading through Whisker Woods is becoming increasingly abnormal. Gwen now possesses rare Prawnhusk meat, though she does not yet understand how important it will become.", "Kap is rescued, Gwen gains further evidence that something is deeply wrong with the forest, and the Prawnhusk meat provides Tom with the missing ingredient needed to create the Fire Meal, setting up Gwen's first trance.")
  },
  {
    id: "act1-queen-beneath-the-stories",
    title: "The Queen Beneath the Stories",
    subtitle: "Kap's rescue opens the older history beneath the insect crisis.",
    text: master[1],
    relatedLore: ["Gwen", "Kap", "Ant King", "Ant Queen", "Whisken People", "Prawnhusk"],
    callouts: insight("The player learns that insects and Whisken once shared a deeper relationship than the present conflict suggests.", "The Prawnhusk encounter becomes the first piece of a tragedy rooted in forgotten trust.", { kind: "revelation", label: "Important revelation", text: "The ruler beneath the frost is connected to the Ant Queen from older Whisken stories." })
  },
  {
    id: "act1-homecoming-feast",
    title: "Welcome Home, Chef Gwen",
    subtitle: "Gwen arrives during the Feast of Full Plates and returns to Tohm's kitchen.",
    text: revision[2],
    relatedLore: ["Gwen", "Tohm Kyatt", "Kap", "Feast of Full Plates", "Whisken Village"],
    callouts: insight("The village knows Gwen has qualified and welcomes her as a chef; Gwen notices Tohm react to reports of frost.", "The celebration restores Gwen to the community while quietly establishing that Tohm recognizes part of the danger.")
  },
  {
    id: "act1-gathering-rhythm",
    title: "The Forest as Pantry",
    subtitle: "Gathering, cooking, and danger settle into Gwen's daily rhythm.",
    text: master[3],
    relatedLore: ["Gwen", "Tohm Kyatt", "Whisker Woods", "Slimes", "Ingredients", "Ales"],
    callouts: insight("The player learns the normal gather-cook-fight loop and the role of slimes, snacks, and ales.", "The cozy routine gives the corruption something tangible to threaten and makes each later disruption personal.")
  },
  {
    id: "act1-cook-battle",
    title: "A Cook Battle at the Feast",
    subtitle: "Gwen's Academy training is tested before the village.",
    text: fromMarker(master[5], "Gwen spent most of the celebration"),
    relatedLore: ["Gwen", "Ressa Vale", "Tohm Kyatt", "Feast of Full Plates", "Slimes"],
    callouts: insight("Ressa represents the prestigious Academy world Gwen left behind, while the village sees Gwen apply both formal and Whisken cooking knowledge.", "Gwen's victory affirms her culinary identity and the warning from the northern road redirects the celebration toward the larger threat.")
  },
  {
    id: "act1-fire-meal",
    title: "The Fire Meal",
    subtitle: "Tohm asks Gwen to attempt the work that has defined his life.",
    text: master[6],
    relatedLore: ["Gwen", "Tohm Kyatt", "Fire Meal", "Magical Meals", "The Tablemaker"],
    callouts: insight("Gwen knows Tohm has spent years pursuing Magical Meals, but she does not yet understand why her attempt can succeed where his cannot.", "Cooking in the name of the Tablemaker turns the recipe into genuine sacred magic and initiates Gwen's first trance.", { kind: "revelation", label: "Behind the scene", text: "The same written recipe would produce dark magic in Tohm's hands; Gwen's faith is the decisive difference." })
  },
  {
    id: "act1-first-trance",
    title: "The First Trance",
    subtitle: "The Fire Meal carries Gwen into a memory hidden beneath snow.",
    text: master[7],
    relatedLore: ["Gwen", "Princess Lillia", "Ice Queen", "Fire Meal", "Magical Meal Trance"],
    callouts: insight("Gwen and the player see a lonely girl and a wounded insect-like creature but cannot yet identify either with certainty.", "The trance connects Magical Meals to buried memories and establishes the emotional bond later exploited by Lillia.", { kind: "revelation", label: "Developer revelation", text: "The girl is Lillia and the wounded creature is the future Ice Queen, though Gwen does not know this yet." })
  },
  {
    id: "act1-fire-awakening",
    title: "Fire Awakens",
    subtitle: "Gwen wakes changed, while Tohm recognizes more than he admits.",
    text: master[8],
    relatedLore: ["Gwen", "Tohm Kyatt", "Princess Lillia", "Fire Meal"],
    callouts: insight("Gwen gains fire power and notices Tohm recognize Lillia's name before he evades her questions.", "The new ability opens blocked routes, while Tohm's reaction introduces mistrust between mentor and apprentice.")
  },
  {
    id: "act1-juno-training",
    title: "Juno's Fire Lesson",
    subtitle: "Juno makes sure magic does not replace Gwen's judgment.",
    text: master[9],
    relatedLore: ["Gwen", "Juno", "Fire Meal", "Combat Training"],
    callouts: insight("Juno is a trusted friend who can challenge Gwen without treating her as a beginner.", "The spar teaches the player to integrate fire with existing combat fundamentals rather than rely on spectacle.")
  },
  {
    id: "act1-magical-boar",
    title: "The Magical Boar",
    subtitle: "A transformed animal reveals that corruption travels through food.",
    text: beforeMarker(master[10], "Before Gwen could examine it properly"),
    relatedLore: ["Gwen", "Tohm Kyatt", "Magical Boar", "Corrupted Food"],
    callouts: insight("Gwen understands that the boar was changed by something it consumed, not born magical.", "The hunt exposes the dark mirror of magical cooking: food can empower, poison, and transform living creatures.")
  },
  {
    id: "act1-bug-misunderstanding",
    title: "The Bug Misunderstanding",
    subtitle: "A frightening rumor turns out to mean a person named Bug.",
    text: withoutLeadingHeadings(revision[4]),
    relatedLore: ["Gwen", "Bug", "Lightning Magic", "Whisper Woods"],
    callouts: insight("Gwen shares the player's assumption that 'Bug' means another corrupted insect until she meets the lightning-using goblin.", "The reveal breaks the escalating horror with comedy while giving Gwen a witness connected to the northern secret.", { kind: "character", label: "Character introduced", text: "Bug is a goblin who uses lightning magic; his name causes the entire misunderstanding." })
  },
  {
    id: "act1-brambrake-gate",
    title: "The Brambrake Gate",
    subtitle: "A voice behind an enormous gate refuses Gwen passage.",
    text: withoutLeadingHeadings(revision[3]),
    relatedLore: ["Gwen", "Brambrake", "Northern Gate", "Whisper Woods"],
    callouts: insight("Gwen hears Brambrake but cannot see his face, body, or silhouette.", "The closed gate preserves Brambrake's visual reveal and establishes a controlled threshold into the deeper investigation.", { kind: "revelation", label: "Presentation rule", text: "Brambrake's appearance remains completely hidden until the later scene in which he finally permits Gwen to enter." })
  },
  {
    id: "act1-thairrott",
    title: "Thairrott",
    subtitle: "An ancient skeletal guardian blocks the descent beneath the forest.",
    text: master[12].replace("The lightning bug led her to a cavern entrance.", "Beyond the Brambrake Gate, Gwen reached a cavern entrance."),
    relatedLore: ["Gwen", "Thairrott", "Fire Meal", "Northern Cavern"],
    callouts: insight("The insects avoid Thairrott, suggesting the colony has placed or accepted guardians around its hidden routes.", "Defeating Thairrott opens the darker half of Act I and links the unnatural snow to Gwen's trance.")
  },
  {
    id: "act1-caverns-cedrick",
    title: "Cedrick the Grunt",
    subtitle: "The caverns reveal an organized colony and an enemy worth sparing.",
    text: master[13],
    relatedLore: ["Gwen", "Cedrick", "Insect Colony", "Frozen Caverns"],
    callouts: insight("Gwen discovers the insects are organized and meets Cedrick first as an apparent enemy.", "Sparing Cedrick turns a defeated grunt into an ally and opens a new view of the forces beneath the forest.")
  },
  {
    id: "act1-cedar-lyra-oswin",
    title: "Cedar, Lyra, and Oswin",
    subtitle: "Suspicious survivors widen the investigation beyond the insects.",
    text: master[14],
    relatedLore: ["Gwen", "Cedar", "Lyra", "Oswin", "Tohm Kyatt"],
    callouts: insight("Cedar and Lyra test Gwen before trusting her, while Oswin recognizes a deeper history in the corruption.", "Their alliance gives Gwen new witnesses and strengthens the suspicion that Tohm's past is connected to the present crisis.")
  },
  {
    id: "act1-muramar",
    title: "Mu'Ramar's Broken Camp",
    subtitle: "A tragic transformation leaves Gwen with an impossible timeline.",
    text: master[15],
    relatedLore: ["Gwen", "Mu'Ramar", "Cedrick", "Dog Person", "Magical Cookies"],
    callouts: insight("Gwen learns that corrupted food can transform people, but the dates in Mu'Ramar's account do not align.", "Mu'Ramar's disappearance turns a revenge story into an unresolved supernatural mystery.")
  },
  {
    id: "act1-ice-and-recipe-pages",
    title: "The Ice and the Missing Pages",
    subtitle: "Tohm finally admits that the enemy's power came from his work.",
    text: master[16],
    relatedLore: ["Gwen", "Tohm Kyatt", "Princess Lillia", "Recipe Pages", "Blizzard Meal"],
    callouts: insight("Gwen learns that Lillia stole pages from Tohm and that corrupted recipes are driving the regional disasters.", "The confession converts Gwen's scattered clues into a direct objective: reach the Queen and recover the Blizzard Meal page.", { kind: "revelation", label: "Important revelation", text: "Tohm's secrecy is rooted in shame over the dark meal Lillia consumed and the recipes she stole afterward." })
  },
  {
    id: "act1-ice-queen-hive",
    title: "The Ice Queen's Hive",
    subtitle: "Every lesson from the forest converges beneath the frost.",
    text: master[17],
    relatedLore: ["Gwen", "Ice Queen", "Princess Lillia", "Fire Meal", "Ant Colony"],
    callouts: insight("Gwen recognizes details from her trance but still enters the battle without the complete history.", "The journey's combat, cooking, allies, and revelations all become resources for the Act I climax.")
  },
  {
    id: "act1-queen-ballerina",
    title: "The Queen Beneath the Frost",
    subtitle: "The Ice Queen's second form turns remembered tenderness into horror.",
    text: master[18],
    relatedLore: ["Gwen", "Ice Queen", "Princess Lillia", "Blizzard Meal"],
    callouts: insight("The Queen's lullaby and movement reveal that fragments of her relationship with young Lillia remain inside the corruption.", "Defeating the ballerina form ends the immediate threat but reframes the Queen as a victim of betrayed trust.")
  },
  {
    id: "act1-recipe-page",
    title: "The Blizzard Meal Page",
    subtitle: "A recovered recipe reveals how Lillia weaponized trust.",
    text: master[19],
    relatedLore: ["Gwen", "Ice Queen", "Princess Lillia", "Blizzard Meal", "Recipe Pages"],
    callouts: insight("Gwen can now connect the child in the trance, the wounded Queen, and Lillia's later return.", "The recovered page proves that the corruption is part of a larger campaign built from stolen culinary knowledge.")
  },
  {
    id: "act1-thaw",
    title: "The Thaw",
    subtitle: "Whisker Woods survives, but Gwen's trust in Tohm has changed.",
    text: master[20],
    relatedLore: ["Gwen", "Tohm Kyatt", "Ice Queen", "Whisker Woods", "Recipe Pages"],
    callouts: insight("The village sees the forest recover, while Gwen understands that Tohm's hidden past helped create the danger.", "Act I closes with one recipe recovered, the mentor-apprentice relationship altered, and the larger hunt for Lillia's pages beginning.")
  }
];

export const revisedActOneStoryChapters: StoryJourneyChapterRecord[] = chapters.map((chapter, index) => {
  const order = index + 1;
  const pageId = `${chapter.id}-narrative`;
  return normalizeStoryJourneyChapter({
    id: chapter.id,
    title: chapter.title,
    subtitle: chapter.subtitle,
    timelineStartLabel: `Act I · Chapter ${order}`,
    timelineEndLabel: `Act I · Chapter ${order}`,
    timelineStartPercent: 70 + index * (12 / chapters.length),
    timelineEndPercent: Math.min(82, 70 + (index + 0.7) * (12 / chapters.length)),
    era: "Act I — The Queen Beneath the Frost",
    scope: "act1",
    revealLevel: "Player-Facing",
    shortDescription: chapter.subtitle,
    overviewText: chapter.text.split(/\r?\n\r?\n/)[0].replace(/^#+\s*/, ""),
    relatedLore: chapter.relatedLore,
    threads: ["Gwen", "Act I", ...chapter.relatedLore],
    sourceRecords: chapter.relatedLore.map((label) => ({ type: "entry", id: slugify(label), label })),
    developerNotes: "Narrative source: supplied Act I master prose, revised with the supplied opening, Brambrake Gate, and Bug Misunderstanding text.",
    pages: [{
      id: pageId,
      title: chapter.title,
      text: markdownToRichText(chapter.text),
      relatedLore: chapter.relatedLore,
      threads: ["Gwen", "Act I", ...chapter.relatedLore],
      callouts: chapter.callouts.map((callout, calloutIndex) => ({ ...callout, id: `${pageId}-insight-${calloutIndex + 1}` })),
      sourceRecords: chapter.relatedLore.map((label) => ({ type: "entry", id: slugify(label), label }))
    }]
  }, chapter.id);
});

export const REVISED_ACT_ONE_STORY_CHAPTER_IDS = new Set(revisedActOneStoryChapters.map((chapter) => chapter.id));
