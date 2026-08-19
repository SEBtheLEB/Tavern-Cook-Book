import type { StoryJourneyGuidePageRecord } from "../types";

export const ACADEMY_PLACE_MIGRATION_ID = "place-imperial-culinary-academy-v1";

const createdAt = "2026-08-18T00:00:00.000Z";

export const ACADEMY_PLACE_PAGE: StoryJourneyGuidePageRecord = {
  id: "place-imperial-culinary-academy-of-ovenhold",
  pageType: "place",
  title: "Imperial Culinary Academy of Ovenhold",
  eyebrow: "Place Entry",
  summary: "The most prestigious culinary institution in the known kingdoms: a proving ground where cooks learn the land, ingredients, survival, preparation, and the making of extraordinary meals.",
  fullText: "The Imperial Culinary Academy of Ovenhold is the most prestigious culinary institution in the known kingdoms.",
  tags: [
    "Academy",
    "Ovenhold",
    "Human Kingdom",
    "Culinary Education",
    "Imperial Chefs",
    "Triad Faith",
    "Hall of Flame"
  ],
  place: {
    placeName: "Imperial Culinary Academy of Ovenhold",
    placeType: "Culinary Academy",
    subtitle: "Through Flame, We Forge Legacy.",
    summary: `<p>The <strong>Imperial Culinary Academy of Ovenhold</strong> is the most prestigious culinary institution in the known kingdoms. More than an ordinary cooking school, it is a proving ground for those who seek to master cuisine from its very beginning: understanding the land, finding ingredients, surviving the environments they come from, preparing them properly, and ultimately transforming them into extraordinary meals.</p>`,
    formalTitle: "The Imperial Culinary Academy of Ovenhold",
    founded: "Over 300 years ago, in the generations following the end of the great war between Ovenhold and the Faery Kingdom",
    founder: "Jerjes Chakra",
    originType: "Founded culinary institution",
    historicalNotes: `<p>The Academy was founded in the aftermath of one of the darkest periods in recorded history. Generations of war between humanity and the Faery Kingdom had devastated the land and left countless people starving for nearly three centuries.</p>
<p>The war finally ended through the sacrifice of the <strong>Tablemaker</strong>, whose legendary meal was shared between the opposing armies when both sides stood on the verge of destroying one another. The meal did more than satisfy their hunger. It reminded both peoples of what they had lost and demonstrated the power that food could have to bring people together.</p>
<p>In the generations that followed, Ovenhold became determined that such hunger should never consume the world again.</p>
<p>Jerjes Chakra founded the Imperial Culinary Academy around a simple principle:</p>
<blockquote><p><strong>The world needed more people capable of feeding it well.</strong></p></blockquote>
<p>The Academy would train cooks who could travel anywhere, understand unfamiliar lands and ingredients, survive difficult conditions, and create meals worth sharing with others.</p>
<p>As relations between Ovenhold and the Faery Kingdom strengthened, both peoples contributed knowledge to the Academy. Human culinary traditions were combined with <strong>Faery magic</strong>, allowing the school to develop extraordinary training environments that could replicate conditions from throughout the world.</p>`,
    quickFacts: [
      { id: "academy-fact-location", label: "Location", value: "Capital City of Ovenhold, Human Kingdom" },
      { id: "academy-fact-motto", label: "Motto", value: "Through Flame, We Forge Legacy." },
      { id: "academy-fact-acceptance", label: "Acceptance Rate", value: "Approximately 5%" },
      { id: "academy-fact-graduation", label: "Graduation Rate", value: "Approximately 18%" },
      { id: "academy-fact-standard-tuition", label: "Standard Track", value: "60,000 gold coins per year" },
      { id: "academy-fact-royal-track", label: "Royal Track", value: "Crown-sponsored; ten years of Crown service after graduation" },
      { id: "academy-fact-apprenticeship", label: "Independent Apprenticeship", value: "33,000 gold coins per year with limited advanced access" }
    ],
    generalFacts: `<h3>Philosophy of the Academy</h3>
<p>The Academy teaches that a great chef must understand far more than a recipe.</p>
<p>An Imperial Chef is expected to understand:</p>
<ul>
<li><strong>The Land</strong> from which ingredients come</li>
<li><strong>The Beast</strong> or plant being harvested</li>
<li><strong>The Element</strong> and conditions used to prepare it</li>
<li><strong>The Plate</strong> and the person who will ultimately receive it</li>
</ul>
<p>Students are trained to <strong>cook, hunt, gather, adapt, survive, and create</strong>.</p>
<p>A chef who can prepare a flawless meal inside a palace kitchen but cannot feed people when ingredients are scarce is considered incomplete by Academy standards.</p>
<p>For this reason, survival knowledge and culinary knowledge are treated as closely connected disciplines.</p>
<h3>Curriculum</h3>
<p>Unlike ordinary culinary schools, the Imperial Culinary Academy combines <strong>gastronomy, survival, exploration, and practical field training</strong> into a single rigorous curriculum.</p>
<p>Major areas of study include:</p>
<ul>
<li><strong>Huntcraft &amp; Creature Preparation</strong></li>
<li><strong>Emergency Foraging &amp; Nutrition</strong></li>
<li><strong>Ingredient Identification</strong></li>
<li><strong>Creature Anatomy &amp; Butchery</strong></li>
<li><strong>Wild Ingredient Gathering</strong></li>
<li><strong>Elemental Cooking Techniques</strong></li>
<li><strong>Cultural Cuisine Diplomacy</strong></li>
<li><strong>Food Preservation</strong></li>
<li><strong>Survival Cooking</strong></li>
<li><strong>Culinary History</strong></li>
<li><strong>Plating Under Pressure</strong></li>
<li><strong>Improvisational Cooking</strong></li>
<li><strong>Field Kitchen Management</strong></li>
</ul>
<p>Students are regularly placed into situations where ideal ingredients, tools, or conditions are unavailable.</p>
<p>They are expected to adapt.</p>
<p>A student may enter an examination expecting to prepare a particular dish only to discover that one of its primary ingredients is unavailable, forcing them to identify an alternative and rebuild the dish around it.</p>
<p>This ability to improvise is considered one of the defining qualities of an Imperial Chef.</p>
<h3>Academy Training</h3>
<p>Education at the Academy is deliberately demanding.</p>
<p>Students participate in traditional kitchen instruction alongside field exercises, survival courses, magical simulations, creature hunts, gathering expeditions, and timed culinary examinations.</p>
<p>Training is designed to test both physical and mental endurance.</p>
<p>A student may be required to:</p>
<ol>
<li>Enter an unfamiliar environment.</li>
<li>Identify safe and useful ingredients.</li>
<li>Hunt or gather what they require.</li>
<li>Establish a functioning cooking area.</li>
<li>Prepare ingredients correctly.</li>
<li>Adapt to unexpected complications.</li>
<li>Produce a complete dish within a limited period of time.</li>
</ol>
<p>Students are judged not only on flavor, but also on efficiency, judgment, creativity, ingredient knowledge, presentation, and their ability to remain composed under pressure.</p>
<h3>Academy Stats</h3>
<p><strong>Acceptance Rate: ~5%</strong></p>
<p>Only the most promising applicants are accepted after a week-long entrance trial testing reflexes, taste sensitivity, ingredient recognition, memory, survival instincts, and improvisational cooking under stress.</p>
<p><strong>Graduation Rate: ~18%</strong></p>
<p>The Academy has one of the highest dropout rates among major institutions in Ovenhold. Many students leave during their first year after discovering that culinary talent alone is not enough to survive the program.</p>
<p>Those who complete their education are recognized throughout the kingdoms as members of an elite culinary tradition.</p>
<p><strong>Tuition:</strong></p>
<ul>
<li><strong>Standard Track:</strong> 60,000 gold coins per year</li>
<li><strong>Royal Track:</strong> Free for Crown-sponsored students, who are required to serve the Crown for ten years following graduation</li>
<li><strong>Independent Apprenticeship Option:</strong> 33,000 gold coins per year, with limited access to certain advanced classes, facilities, and magical simulators</li>
</ul>`,
    environment: `<p>Within the Academy, students may find themselves gathering ingredients beneath artificial snowfall one day and cooking beneath the heat of a magically replicated desert the next.</p>
<p>Training environments include scenarios such as:</p>
<ul>
<li>Scorching deserts</li>
<li>Snow-covered hills and forests</li>
<li>Deep spice caves</li>
<li>Swamps and wetlands</li>
<li>Mountain environments</li>
<li>Dense wilderness</li>
<li>Simulated storms and other extreme conditions</li>
<li>Artificial ecosystems containing creatures and ingredients from distant regions</li>
</ul>
<p>These environments allow students to practice without requiring constant expeditions across the kingdoms and have become one of the Academy's defining features.</p>`,
    habitats: "",
    settlements: "",
    landmarks: `<h3>The Hall of Flame</h3>
<p>The <strong>Hall of Flame</strong> is one of the Academy's most famous halls, dedicated to graduates whose achievements significantly influenced cuisine, Ovenhold, or the wider world.</p>
<p>Portraits, statues, personal cooking tools, handwritten recipes, and other artifacts belonging to legendary chefs are preserved throughout the hall.</p>
<p>Being formally recognized within the Hall of Flame is considered one of the greatest honors an Academy graduate can receive.</p>
<h3>The Spice Library</h3>
<p>Vel Ormoor's surviving collection of more than 400 extinct spices became the foundation of the enormous <strong>Spice Library</strong> preserved beneath the Academy.</p>`,
    inhabitants: `<h3>Famous Alumni &amp; Academy Legends</h3>
<p><strong>Tohm Kyatt</strong></p>
<p><strong>Status:</strong> Alive</p>
<p>One of the Academy's most celebrated graduates. Known for extraordinary culinary talent and a career that has influenced generations of chefs.</p>
<p><strong>Chef Lysandre</strong></p>
<p><strong>Status:</strong> Deceased</p>
<p>Former Head Chef of Ovenhold Palace and one of the most respected masters in Academy history. His techniques are still studied by advanced students, and much of his work is preserved within the Hall of Flame.</p>
<p><strong>La' Ra</strong></p>
<p><strong>Status:</strong> Alive</p>
<p>A Faery-born chef who pioneered the art of aroma-based infusion. Her dishes became famous for producing vivid sensations, memories, emotional responses, and occasionally powerful hallucinations.</p>
<p><strong>Bruldir Stonegut</strong></p>
<p><strong>Status:</strong> Alive</p>
<p>A dwarf chef who combined traditional baking with experimental food alchemy. He accidentally created the infamous <strong>Fire Scone</strong>, which is now prohibited in five kingdoms.</p>
<p><strong>Ciel Valford</strong></p>
<p><strong>Status:</strong> Deceased</p>
<p>An aristocratic chef who became a renowned war cook. Her morale-boosting meals are credited with helping change the course of the <strong>Siege of Bunglewatch</strong>.</p>
<p><strong>Marrick &amp; Marrock</strong></p>
<p><strong>Status:</strong> Alive</p>
<p>Twin illusionists from the Eastern Shores who transformed dining into performance. Their famous dinner theaters combine food, illusion, storytelling, and magical spectacle into a single experience.</p>
<p><strong>Vel Ormoor</strong></p>
<p><strong>Status:</strong> Deceased</p>
<p>A quiet researcher and culinary historian who catalogued more than 400 extinct spices. His surviving collection became the foundation of the enormous <strong>Spice Library</strong> preserved beneath the Academy.</p>`,
    flora: "",
    ingredients: "",
    creatures: "",
    threats: "",
    culture: `<h3>The Triad Within the Academy</h3>
<p>The <strong>Triad faith of Love, Taste, and Passion</strong> is deeply woven into the culture of Ovenhold, and the Academy is no exception.</p>
<p>The Academy is <strong>not a seminary or religious order</strong>. Its primary purpose is the teaching and advancement of culinary arts.</p>
<p>However, the faith that shaped Ovenhold after the Tablemaker's sacrifice remains visibly present throughout the institution.</p>
<p>Students may encounter:</p>
<ul>
<li>Statues and artwork depicting the <strong>Triad</strong></li>
<li>Statues and memorials dedicated to important saints and historical figures</li>
<li>Triad symbols carved into halls, kitchens, and classrooms</li>
<li>Lessons discussing the historical and philosophical relationship between food and the Triad</li>
<li>Ceremonies and traditions influenced by Ovenhold's faith</li>
<li>Memorials dedicated to the Tablemaker and those who suffered during the ancient war</li>
</ul>
<p>The three principles of the Triad also naturally influence the Academy's approach to food.</p>
<p><strong>Taste</strong> represents the understanding and mastery of ingredients.</p>
<p><strong>Passion</strong> represents creativity, discipline, effort, and the desire to create something extraordinary.</p>
<p><strong>Love</strong> represents the person receiving the meal and the belief that food ultimately exists to nourish, comfort, and bring people together.</p>
<p>Students are not training to become theologians or clergy. They are training to become chefs within a civilization whose understanding of food has been deeply shaped by its faith and history.</p>`,
    narrativeRole: `<h3>The Academy Today</h3>
<p>More than three centuries after its founding, the Imperial Culinary Academy continues to represent one of Ovenhold's oldest promises:</p>
<blockquote><p><strong>That knowledge of food should never again become so scarce that entire peoples are left helpless against hunger.</strong></p></blockquote>
<p>Its graduates can be found in royal courts, village taverns, traveling kitchens, research halls, military camps, expeditions, and distant settlements throughout the world.</p>
<p>Some pursue fame.</p>
<p>Some pursue discovery.</p>
<p>Some serve kings.</p>
<p>Others simply return home and feed their communities.</p>
<p>The Academy considers all of these paths worthy.</p>
<p>Because beneath its prestige, competitions, brutal examinations, and centuries of tradition remains the same idea that inspired its creation:</p>
<blockquote><p><strong>Learn how to feed others, and carry that knowledge wherever it is needed.</strong></p></blockquote>`,
    hiddenSections: ["habitats", "settlements", "flora", "ingredients", "creatures", "threats"],
    referenceArt: [],
    relatedCharacters: [
      "Jerjes Chakra",
      "The Tablemaker",
      "Tohm Kyatt",
      "Chef Lysandre",
      "La' Ra",
      "Bruldir Stonegut",
      "Ciel Valford",
      "Marrick & Marrock",
      "Vel Ormoor"
    ],
    notableFigures: [
      { id: "academy-figure-tohm-kyatt", name: "Tohm Kyatt", role: "Celebrated graduate; alive" },
      { id: "academy-figure-chef-lysandre", name: "Chef Lysandre", role: "Former Head Chef of Ovenhold Palace; deceased" },
      { id: "academy-figure-la-ra", name: "La' Ra", role: "Pioneer of aroma-based infusion; alive" },
      { id: "academy-figure-bruldir-stonegut", name: "Bruldir Stonegut", role: "Baker and food alchemist; alive" },
      { id: "academy-figure-ciel-valford", name: "Ciel Valford", role: "War cook; deceased" },
      { id: "academy-figure-marrick-marrock", name: "Marrick & Marrock", role: "Illusionist dinner-theater twins; alive" },
      { id: "academy-figure-vel-ormoor", name: "Vel Ormoor", role: "Culinary historian; deceased" }
    ],
    relatedLocations: ["Capital City of Ovenhold", "Ovenhold", "Human Kingdom", "Faery Kingdom", "Ovenhold Palace", "Eastern Shores"],
    relatedQuests: [],
    showcaseTitle: "Hall of Flame"
  },
  createdAt,
  updatedAt: createdAt
};
