// ============ THE CAMPAIGN ============
// One continuous war, told as a chain of levels across a continent. A CHAPTER
// is a country: one faction, one biome, and the handful of maps you fight
// through before the border moves. A LEVEL is one map plus a slice of that
// faction's eighteen scripted waves — so the difficulty of level 4 is the
// difficulty of wave 10 onwards, not a fresh start every time.
//
// `window: { from, to, count }` reads as "count waves, climbing from war-wave
// `from` to war-wave `to`" — the war being the faction's eighteen scripted
// waves and then generated ones. `boss: true` puts the faction's champion on
// the last wave. Every chapter has eleven levels on the same shape: five
// twenty-wave levels, five of twenty-five, and a thirty-wave boss, each one
// starting a little deeper into the war than the last.
// The last level of a chapter always ends on the faction's boss wave.
//
// Each level's waypoint on the continent map (`pos`) and each chapter's
// coastline (`region`) come from mapLayout.js; the Iron and Hollow chapters'
// level lists live in levels-iron.js / levels-hollow.js.

import { REGIONS, LEVEL_POS } from "./mapLayout.js";
import { IRON_LEVELS } from "./levels-iron.js";
import { HOLLOW_LEVELS } from "./levels-hollow.js";

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
    // the vale runs north now too: the ridge, the deep wood and the burned
    // holt stand on the high ground above the Barrowfields
    levels: [
      // five twenty-wave levels to learn the vale...
      {
        id: "gw1", name: "The Vale Road", realm: "greenwood", short: "Vale Road",
        window: { from: 1, to: 12, count: 20 }, gold: 250,
        blurb: "Goblin raiding parties on the country road — a flood of small blades, badly led. Hold the lane and learn the ground.",
      },
      {
        id: "gw2", name: "Thornbrook Ford", realm: "thornbrook", short: "Thornbrook",
        window: { from: 2, to: 14, count: 20 }, gold: 350,
        blurb: "Wolves run ahead of the horde now, and fell bats ride over your knights' heads. The brook is the only thing here that stops for anyone.",
      },
      {
        id: "foxmere", name: "Foxmere", realm: "foxmere", labelAbove: true,
        window: { from: 3, to: 16, count: 20 }, gold: 400,
        blurb: "The road owes the mere a full circle, and the horde walks every step of it. Orcs in plate now — and the first shamans, chanting the warband whole.",
      },
      {
        id: "gw3", name: "Oakmere Hollow", realm: "oakmere", short: "Oakmere",
        window: { from: 4, to: 17, count: 20 }, gold: 540,
        blurb: "Ironclads march with the orcs and boar riders flatten your line — then one night the wood empties all at once. Bring magic.",
      },
      {
        id: "bramblewick", name: "Bramblewick", realm: "bramblewick",
        window: { from: 5, to: 20, count: 20 }, gold: 560,
        blurb: "Hedged fields around the old millpond. The road wanders every lane of the farm, and the horde has learned to come down all of it at once.",
      },
      // ...five twenty-five-wave levels to hold it...
      {
        id: "gw4", name: "The Barrowfields", realm: "barrowfields", short: "Barrowfields",
        window: { from: 6, to: 23, count: 25 }, gold: 750,
        blurb: "Trolls out of the mounds, shamans chanting the wounded whole. Kill the healers first, and save something heavy for the trolls.",
      },
      {
        id: "wolfrun", name: "Wolfrun Ford", realm: "wolfrun", short: "Wolfrun",
        window: { from: 7, to: 25, count: 25 }, gold: 800,
        blurb: "Four bridges over one cold river, and a warchief's totem driving the party across all of them. The fords decide who holds the vale.",
      },
      {
        id: "ravenscar", name: "Ravenscar", realm: "ravenscar", labelAbove: true,
        window: { from: 8, to: 27, count: 25 }, gold: 1000,
        blurb: "The high ridge over the vale, boulders and ravens. The road climbs in long switchbacks — and every one of them is in bowshot of the next.",
      },
      {
        id: "blackbriar", name: "Blackbriar", realm: "blackbriar",
        window: { from: 9, to: 29, count: 25 }, gold: 850,
        blurb: "The deep wood the goblins came out of. The road coils blind between the trunks; you will hear the trolls before you see them.",
      },
      {
        id: "cinderholt", name: "Cinderholt", realm: "cinderholt",
        window: { from: 9, to: 31, count: 25 }, gold: 900,
        blurb: "The horde fired this wood to smoke the vale out. Nothing stands but black trunks — nothing hides the road, and nothing hides the horde on it.",
      },
      // ...and the boss, thirty waves deep
      {
        id: "gw5", name: "The Goblin Warrens", realm: "warrens", short: "The Warrens",
        window: { from: 11, to: 34, count: 30, boss: true }, gold: 1000,
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
    levels: IRON_LEVELS,
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
    levels: HOLLOW_LEVELS,
  },
];

// Every level in marching order, each carrying its chapter and its number.
// the map layout joins the levels here, on the chapter's own level objects
// too, since the map reads waypoints both through LEVELS and chapter.levels
for (const ch of CHAPTERS) {
  ch.region = REGIONS[ch.id];
  for (const lv of ch.levels) lv.pos = LEVEL_POS[lv.id] || null;
}
export const LEVELS = CHAPTERS.flatMap((ch, ci) =>
  ch.levels.map((lv, li) => ({ ...lv, pos: LEVEL_POS[lv.id] || null, chapter: ch, chapterIndex: ci, index: li })),
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
      // legacy: heroes used to carry their level between maps; unused now
      heroes: raw.heroes && typeof raw.heroes === "object" ? raw.heroes : {},
      // the crown's treasury: gold carried home from won levels, spent only
      // on the castle's works
      treasury: Number.isFinite(raw.treasury) ? raw.treasury : 0,
    };
  } catch {
    return { cleared: {}, castle: {}, heroes: {}, treasury: 0 };
  }
}
export function bankTreasury(amount) {
  const p = loadProgress();
  p.treasury = Math.max(0, Math.floor(p.treasury + amount));
  save(p);
  return p;
}
export function spendTreasury(amount) {
  const p = loadProgress();
  if (p.treasury < amount) return null;
  p.treasury -= amount;
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
  const p = { cleared: {}, castle: {}, heroes: {}, treasury: 0 };
  save(p);
  return p;
}

// A campaign in progress is one with at least one level cleared.
export const hasProgress = (p) => Object.keys(p.cleared).length > 0;

// ---- TESTING: every level open ----
// Flip to true while play-testing to open every level. Off, the chain holds:
// level 1 open, everything else behind the level before it.
export const UNLOCK_ALL = false;

// ---- the towers, earned ----
// The crown marches out with four halls. The rest are learned on the road:
// clear the named level and the hall is yours everywhere, Free Play too.
export const TOWER_UNLOCKS = {
  catapult: "gw1", spiker: "gw2", riverwatch: "foxmere", goldworks: "gw3", trapsmith: "gw4", falconry: "wolfrun",
  gunpowder: "cinderholt", assassin: "ir1", sunforge: "ir3",
};
export const towerUnlocked = (kind, p) => {
  const need = TOWER_UNLOCKS[kind];
  return !need || !!p?.cleared?.[need];
};
// What a level's clearing opens, for the victory card.
export const unlocksFor = (levelId) => Object.keys(TOWER_UNLOCKS).filter((k) => TOWER_UNLOCKS[k] === levelId);
// The level a locked hall is waiting on.
export const unlockLevel = (kind) => levelById(TOWER_UNLOCKS[kind]) || null;

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
