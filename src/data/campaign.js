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
        window: { start: 0, count: 5 }, gold: 250, pos: [44, 168],
        blurb: "Goblin raiders on the country road. Small bands, badly led — hold the lane and learn the ground.",
      },
      {
        id: "gw2", name: "Thornbrook Ford", realm: "thornbrook",
        window: { start: 2, count: 6 }, gold: 500, pos: [88, 146],
        blurb: "Wolves run ahead of the horde now, and the road is long. Slow them before they reach the gate.",
      },
      {
        id: "gw3", name: "Oakmere Hollow", realm: "oakmere",
        window: { start: 5, count: 6 }, gold: 900, pos: [52, 100],
        blurb: "Ironclads march with the orcs — half your arrows will skip off their plate. Bring magic.",
      },
      {
        id: "gw4", name: "The Barrowfields", realm: "barrowfields",
        window: { start: 8, count: 6 }, gold: 1600, pos: [104, 62],
        blurb: "Trolls out of the mounds, shamans chanting the wounded whole. Kill the healers first.",
      },
      {
        id: "gw5", name: "The Goblin Warrens", realm: "warrens",
        window: { start: 9, count: 6 }, gold: 1700, pos: [146, 110],
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
        window: { start: 0, count: 5 }, gold: 800, pos: [232, 150],
        blurb: "A levy column in step behind raised shields. The first two blows off any tower are wasted — hit them heavy.",
      },
      {
        id: "ir2", name: "Stonewatch", realm: "stonewatch",
        window: { start: 2, count: 6 }, gold: 800, pos: [268, 186],
        blurb: "Crossbowmen shoot your knights down from outside their reach. Cut them out of the column early.",
      },
      {
        id: "ir3", name: "Ironford", realm: "ironford",
        window: { start: 5, count: 6 }, gold: 1000, pos: [304, 140],
        blurb: "Cavaliers ride the first blocker down, and the first siege ram is at the crossing. Nothing slows it.",
      },
      {
        id: "ir4", name: "Greyhelm Pass", realm: "greyhelm",
        window: { start: 8, count: 6 }, gold: 1200, pos: [330, 86],
        blurb: "Chaplains ward the whole column against chip damage. Break the ward with something that hits once and hits hard.",
      },
      {
        id: "ir5", name: "The Citadel Gate", realm: "citadel",
        window: { start: 9, count: 6 }, gold: 1600, pos: [352, 48],
        blurb: "The last mile. The Lord Marshal's banner drives the army faster and harder — cut down the banner.",
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
