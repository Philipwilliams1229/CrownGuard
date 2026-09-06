// ============ THE CAMPAIGN ============
// One continuous war, told as a chain of levels across a continent. A CHAPTER
// is a country: one faction, one biome, and the handful of maps you fight
// through before the border moves. A LEVEL is one map plus a slice of that
// faction's eighteen scripted waves — so the difficulty of level 4 is the
// difficulty of wave 10 onwards, not a fresh start every time.
//
// `window: { start, count }` reads as "script waves start+1 … start+count".
// The last level of a chapter always ends on the faction's boss wave.
//
// `pos` is the level's dot on the continent map (see ui/CampaignMap.jsx), in
// that map's 400x240 coordinate space. `region` is the chapter's coastline.

export const CHAPTERS = [
  {
    id: "greenwood",
    numeral: "I",
    name: "Greenwood Vale",
    faction: "greenwood",
    color: "#7ba85e",
    colorDk: "#4e6b3c",
    label: [88, 26],
    blurb: "Goblins out of the deep wood have come down into the farms.",
    region: "M28,142 C20,116 22,86 44,64 C60,48 84,38 106,44 C122,48 134,40 146,52 C160,66 170,84 164,104 C158,124 176,140 160,162 C146,182 118,196 92,194 C64,192 40,178 28,142 Z",
    levels: [
      {
        id: "gw1", name: "The Vale Road", realm: "greenwood", short: "Vale Road",
        window: { start: 0, count: 5 }, gold: 250, pos: [44, 168],
        blurb: "Goblin raiding parties on the country road — a flood of small blades, badly led. Hold the lane and learn the ground.",
      },
      {
        id: "gw2", name: "Thornbrook Ford", realm: "thornbrook", short: "Thornbrook",
        window: { start: 2, count: 5 }, gold: 500, pos: [88, 146],
        blurb: "Wolves run ahead of the horde now, and fell bats ride over your knights' heads. The brook is the only thing here that stops for anyone.",
      },
      {
        id: "foxmere", name: "Foxmere", realm: "foxmere", labelAbove: true,
        window: { start: 4, count: 6 }, gold: 750, pos: [106, 118],
        blurb: "The road owes the mere a full circle, and the horde walks every step of it. Orcs in plate now — and the first shamans, chanting the warband whole.",
      },
      {
        id: "gw3", name: "Oakmere Hollow", realm: "oakmere", short: "Oakmere",
        window: { start: 6, count: 6 }, gold: 1000, pos: [52, 100],
        blurb: "Ironclads march with the orcs and boar riders flatten your line — then one night the wood empties all at once. Bring magic.",
      },
      {
        id: "gw4", name: "The Barrowfields", realm: "barrowfields", short: "Barrowfields",
        window: { start: 8, count: 6 }, gold: 1300, pos: [104, 62],
        blurb: "Trolls out of the mounds, shamans chanting the wounded whole. Kill the healers first, and save something heavy for the trolls.",
      },
      {
        id: "wolfrun", name: "Wolfrun Ford", realm: "wolfrun", short: "Wolfrun", labelAbove: true,
        window: { start: 10, count: 6 }, gold: 1500, pos: [150, 70],
        blurb: "Four bridges over one cold river, and a warchief's totem driving the party across all of them. The fords decide who holds the vale.",
      },
      {
        id: "gw5", name: "The Goblin Warrens", realm: "warrens", short: "The Warrens",
        window: { start: 12, count: 6 }, gold: 1800, pos: [146, 110],
        blurb: "The mouth of the burrow. Necromancers raise your kills against you — and the dragon is home.",
      },
    ],
  },
  {
    id: "iron",
    numeral: "II",
    name: "The Iron Marches",
    faction: "iron",
    color: "#8496ac",
    colorDk: "#56647a",
    label: [302, 24],
    blurb: "With the horde broken, the Iron Kingdom claims the vale. This time it is an army.",
    region: "M218,126 C212,96 224,62 252,44 C272,31 300,26 320,36 C336,44 352,32 366,46 C384,64 394,90 386,118 C378,148 372,176 342,192 C312,208 262,206 236,184 C222,172 220,146 218,126 Z",
    levels: [
      {
        id: "ir1", name: "The King's Road", realm: "kingsroad", short: "King's Road",
        window: { start: 0, count: 5 }, gold: 800, pos: [232, 150],
        blurb: "A levy column in step behind raised shields. The first two blows off any tower are wasted — hit them heavy.",
      },
      {
        id: "muster", name: "The Muster", realm: "muster",
        window: { start: 2, count: 5 }, gold: 850, pos: [244, 112], labelAbove: true,
        blurb: "The Kingdom's drill field: long straights made for a cavalry charge, and the first gryphons wheeling overhead. Look up.",
      },
      {
        id: "ir2", name: "Stonewatch", realm: "stonewatch",
        window: { start: 4, count: 6 }, gold: 950, pos: [268, 186],
        blurb: "Crossbowmen shoot your knights down from outside their reach, and gryphons pass clean over the walls. Nothing here fights fair.",
      },
      {
        id: "ir3", name: "Ironford", realm: "ironford",
        window: { start: 6, count: 6 }, gold: 1100, pos: [304, 140],
        blurb: "The river eats half your ground, cavaliers ride the first blocker down, and the siege rams come through the ford anyway.",
      },
      {
        id: "ir4", name: "Greyhelm Pass", realm: "greyhelm", short: "Greyhelm",
        window: { start: 8, count: 6 }, gold: 1250, pos: [330, 86],
        blurb: "Chaplains ward the whole column against chip damage. Break the ward with something that hits once and hits hard.",
      },
      {
        id: "undercliff", name: "Undercliff", realm: "undercliff",
        window: { start: 10, count: 6 }, gold: 1450, pos: [356, 122],
        blurb: "A shelf of road folded twice under the mountain. Your towers watch three lanes at once — and the Kingdom fills all three.",
      },
      {
        id: "ir5", name: "The Citadel Gate", realm: "citadel", short: "The Citadel",
        window: { start: 12, count: 6 }, gold: 1600, pos: [352, 48],
        blurb: "The last mile. The Lord Marshal's banner drives the army faster and harder — cut down the banner.",
      },
    ],
  },
  {
    id: "hollow",
    numeral: "III",
    name: "The Hollowfen",
    faction: "hollow",
    color: "#6a5a8c",
    colorDk: "#453a5e",
    label: [120, -44],
    blurb: "The war woke something under the fen. The drowned kingdom north of the Marches remembers it was a kingdom — and its dead want the crown back.",
    // the great fen NORTH of the Iron Marches, across a narrow strait —
    // the continent scrolls, so the war can march up the map as it grows
    region: "M236,-30 C230,-64 244,-96 274,-108 C298,-117 330,-118 352,-108 C372,-99 388,-84 392,-62 C396,-40 390,-18 372,-8 C352,2 320,4 292,0 C264,-4 240,-6 236,-30 Z",
    levels: [
      {
        id: "hl1", name: "The Grave Road", realm: "graveroad", short: "Grave Road",
        window: { start: 0, count: 5 }, gold: 900, pos: [368, -36],
        blurb: "Across the strait and into the fen, and the dead walking its causeway in floods. They are worth almost nothing — and there are so, so many.",
      },
      {
        id: "hl2", name: "The Sunken Causeway", realm: "sunkencauseway", short: "Causeway",
        window: { start: 2, count: 6 }, gold: 1000, pos: [310, -36],
        blurb: "Black water either side, wraiths drifting over your blockers, and barrow archers loosing at your knights. The dry ground is all there is.",
      },
      {
        id: "bellmarsh", name: "Bellmarsh", realm: "bellmarsh",
        window: { start: 5, count: 6 }, gold: 1150, pos: [252, -36],
        blurb: "Every standing stone here rings when struck, and the court has struck them all. Wraiths, ghasts, wardens — the fen's whole household, one after another.",
      },
      {
        id: "hl3", name: "Wightwood", realm: "wightwood", labelAbove: true,
        window: { start: 8, count: 6 }, gold: 1300, pos: [252, -88],
        blurb: "A drowned forest of white trees. Plague ghasts burst over your line here — kill them far from your knights, or regret it.",
      },
      {
        id: "hl4", name: "The Cairnfields", realm: "cairnfields", short: "Cairnfields", labelAbove: true,
        window: { start: 10, count: 6 }, gold: 1450, pos: [316, -88],
        blurb: "Every cairn a door, and gravecallers ringing them open. The flood has a source: silence the bells.",
      },
      {
        id: "hl5", name: "The Throne of Dust", realm: "thronedust", short: "Throne of Dust",
        window: { start: 12, count: 6 }, gold: 1550, pos: [358, -88],
        blurb: "The drowned throne itself. Crypt wardens, amalgams that will not stay dead — and the Hollow King, calling his court out of the ground.",
      },
    ],
  },
];

// Every level in marching order, each carrying its chapter and its number.
export const LEVELS = CHAPTERS.flatMap((ch, ci) =>
  ch.levels.map((lv, li) => ({ ...lv, chapter: ch, chapterIndex: ci, index: li })),
);

export const levelById = (id) => LEVELS.find((l) => l.id === id) || null;

// ---- saved progress ----
// One small record in localStorage: which levels have been cleared. Kept
// forgiving — a corrupt or missing save just reads as "nothing cleared yet".

const KEY = "crownguard.campaign.v1";

export function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      cleared: raw.cleared && typeof raw.cleared === "object" ? raw.cleared : {},
      // castle works, by chapter: { greenwood: { archers: 2, ... } }
      castle: raw.castle && typeof raw.castle === "object" ? raw.castle : {},
      // the heroes' levels: { aldric: { level: 4 } }
      heroes: raw.heroes && typeof raw.heroes === "object" ? raw.heroes : {},
    };
  } catch {
    return { cleared: {}, castle: {}, heroes: {} };
  }
}
export function saveHero(key, level) {
  const p = loadProgress();
  p.heroes[key] = { level: Math.max(level, p.heroes[key]?.level || 1) };
  save(p);
  return p;
}

// The works built on a region's castle so far.
export function loadCastle(chapterId) {
  const p = loadProgress();
  return { archers: 0, ballista: 0, guards: 0, masons: 0, ...(p.castle[chapterId] || {}) };
}
export function saveCastle(chapterId, works) {
  const p = loadProgress();
  p.castle[chapterId] = { ...works };
  save(p);
  return p;
}

function save(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode — play on */ }
}

export function markCleared(levelId) {
  const p = loadProgress();
  p.cleared[levelId] = true;
  save(p);
  return p;
}

export function resetProgress() {
  const p = { cleared: {}, castle: {}, heroes: {} };
  save(p);
  return p;
}

// A campaign in progress is one with at least one level cleared.
export const hasProgress = (p) => Object.keys(p.cleared).length > 0;

// ---- TESTING: every level open ----
// Temporary while the campaign is being play-tested. Flip to false to put the
// chain back: level 1 open, everything else behind the level before it.
export const UNLOCK_ALL = true;

// Levels open in order: the first is always open, the rest need the one
// before them cleared.
export function isUnlocked(levelId, p) {
  if (UNLOCK_ALL) return true;
  const i = LEVELS.findIndex((l) => l.id === levelId);
  if (i <= 0) return i === 0;
  return !!p.cleared[LEVELS[i - 1].id];
}

// Where "Continue" drops you: the first level not yet cleared, or the last
// one if the whole war is won.
export function currentLevel(p) {
  return LEVELS.find((l) => !p.cleared[l.id]) || LEVELS[LEVELS.length - 1];
}

export const nextLevel = (levelId) => LEVELS[LEVELS.findIndex((l) => l.id === levelId) + 1] || null;
