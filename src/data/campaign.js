// ============ THE CAMPAIGN ============
// One continuous war, told as a chain of levels across a continent. A CHAPTER
// is a country: one faction, one biome, and the handful of maps you fight
// through before the border moves. A LEVEL is one map plus a slice of that
// faction's fifteen scripted waves — so the difficulty of level 4 is the
// difficulty of wave 9 onwards, not a fresh start every time.
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
    blurb: "Goblins out of the deep wood have come down into the farms.",
    region: "M28,142 C20,116 22,86 44,64 C60,48 84,38 106,44 C122,48 134,40 146,52 C160,66 170,84 164,104 C158,124 176,140 160,162 C146,182 118,196 92,194 C64,192 40,178 28,142 Z",
    levels: [
      {
        id: "gw1", name: "The Vale Road", realm: "greenwood",
        window: { start: 0, count: 6 }, gold: 250, pos: [44, 168],
        blurb: "Goblin raiding parties on the country road — a flood of small blades, badly led. Hold the lane and learn the ground.",
      },
      {
        id: "gw2", name: "Thornbrook Ford", realm: "thornbrook",
        window: { start: 3, count: 6 }, gold: 500, pos: [88, 146],
        blurb: "Wolves run ahead of the horde now, and fell bats ride over your knights' heads. The brook is the only thing here that stops for anyone.",
      },
      {
        id: "gw3", name: "Oakmere Hollow", realm: "oakmere",
        window: { start: 6, count: 6 }, gold: 1000, pos: [52, 100],
        blurb: "Ironclads march with the orcs and boar riders flatten your line — then one night the wood empties all at once. Bring magic.",
      },
      {
        id: "gw4", name: "The Barrowfields", realm: "barrowfields",
        window: { start: 9, count: 7 }, gold: 1600, pos: [104, 62],
        blurb: "Trolls out of the mounds, shamans chanting the wounded whole — and one night the whole wood empties at once. Kill the healers first.",
      },
      {
        id: "gw5", name: "The Goblin Warrens", realm: "warrens",
        window: { start: 11, count: 7 }, gold: 1700, pos: [146, 110],
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
    blurb: "With the horde broken, the Iron Kingdom claims the vale. This time it is an army.",
    region: "M218,126 C212,96 224,62 252,44 C272,31 300,26 320,36 C336,44 352,32 366,46 C384,64 394,90 386,118 C378,148 372,176 342,192 C312,208 262,206 236,184 C222,172 220,146 218,126 Z",
    levels: [
      {
        id: "ir1", name: "The King's Road", realm: "kingsroad",
        window: { start: 0, count: 6 }, gold: 800, pos: [232, 150],
        blurb: "A levy column in step behind raised shields. The first two blows off any tower are wasted — hit them heavy.",
      },
      {
        id: "ir2", name: "Stonewatch", realm: "stonewatch",
        window: { start: 3, count: 7 }, gold: 800, pos: [268, 186],
        blurb: "Crossbowmen shoot your knights down from outside their reach, and the first gryphons pass clean over the walls. Look up.",
      },
      {
        id: "ir3", name: "Ironford", realm: "ironford",
        window: { start: 6, count: 7 }, gold: 1000, pos: [304, 140],
        blurb: "The river eats half your ground, cavaliers ride the first blocker down, and the siege rams come through the ford anyway.",
      },
      {
        id: "ir4", name: "Greyhelm Pass", realm: "greyhelm",
        window: { start: 9, count: 7 }, gold: 1200, pos: [330, 86],
        blurb: "Chaplains ward the whole column against chip damage. Break the ward with something that hits once and hits hard.",
      },
      {
        id: "ir5", name: "The Citadel Gate", realm: "citadel",
        window: { start: 11, count: 7 }, gold: 1600, pos: [352, 48],
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
    blurb: "The war woke something under the fen. The drowned kingdom remembers it was a kingdom — and its dead want the crown back.",
    region: "M104,196 C112,180 134,172 158,176 C174,179 192,172 210,178 C232,185 248,192 252,206 C256,220 244,232 222,236 C196,240 168,238 142,234 C120,230 100,216 104,196 Z",
    levels: [
      {
        id: "hl1", name: "The Grave Road", realm: "graveroad",
        window: { start: 0, count: 6 }, gold: 900, pos: [120, 212],
        blurb: "The causeway into the fen, and the dead walking it in floods. They are worth almost nothing — and there are so, so many.",
      },
      {
        id: "hl2", name: "The Sunken Causeway", realm: "sunkencauseway",
        window: { start: 3, count: 7 }, gold: 1000, pos: [152, 196],
        blurb: "Black water either side, wraiths drifting over your blockers, and barrow archers loosing at your knights. The dry ground is all there is.",
      },
      {
        id: "hl3", name: "Wightwood", realm: "wightwood",
        window: { start: 6, count: 7 }, gold: 1200, pos: [184, 220],
        blurb: "A drowned forest of white trees. Plague ghasts burst over your line here — kill them far from your knights, or regret it.",
      },
      {
        id: "hl4", name: "The Cairnfields", realm: "cairnfields",
        window: { start: 9, count: 7 }, gold: 1400, pos: [216, 202],
        blurb: "Every cairn a door, and gravecallers ringing them open. The flood has a source: silence the bells.",
      },
      {
        id: "hl5", name: "The Throne of Dust", realm: "thronedust",
        window: { start: 11, count: 7 }, gold: 1500, pos: [242, 222],
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
    return { cleared: raw.cleared && typeof raw.cleared === "object" ? raw.cleared : {} };
  } catch {
    return { cleared: {} };
  }
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
  const p = { cleared: {} };
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
