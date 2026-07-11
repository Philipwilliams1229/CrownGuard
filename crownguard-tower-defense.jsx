import React, { useRef, useEffect, useState, useCallback } from "react";

// ============ CROWNGUARD v6 — retro pixel edition, polish pass ============

const TILE = 48;
const COLS = 15;
const ROWS = 10;
const W = COLS * TILE;
const H = ROWS * TILE;
const PATH_HALF = 26;
const BLOCK_DIST = 38;
const CASTLE_HP = 20;
const RALLY_RANGE = 140;
const BUILD_TIME = 30;
const RESPAWN_MS = 7000;
const CELL = 2;

const INK = "#2b2a33";
const GRASS = "#69874e";
const GRASS_DK = "#57713f";
const GRASS_LT = "#7a9a5c";
const PATH_MAIN = "#bfa476";
const PATH_DK = "#93794f";
const PATH_EDGE = "#63512f";

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260710);

const RAW = [
  [0.9, 2], [3, 2], [3, 6], [7, 6], [7, 1], [11, 1], [11, 7], [5, 7], [5, 9], [13, 9], [13, 4], [13.7, 4],
].map(([c, r]) => [c * TILE + TILE / 2, r * TILE + TILE / 2]);

function buildSmooth() {
  const out = [RAW[0]];
  const R = 34;
  for (let i = 1; i < RAW.length - 1; i++) {
    const [px, py] = RAW[i - 1];
    const [cx, cy] = RAW[i];
    const [nx, ny] = RAW[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const r1 = Math.min(R, d1 * 0.45), r2 = Math.min(R, d2 * 0.45);
    const ax = cx - ((cx - px) / d1) * r1, ay = cy - ((cy - py) / d1) * r1;
    const bx = cx + ((nx - cx) / d2) * r2, by = cy + ((ny - cy) / d2) * r2;
    out.push([ax, ay]);
    for (let s = 1; s <= 7; s++) {
      const u = s / 7;
      out.push([
        (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cx + u * u * bx,
        (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cy + u * u * by,
      ]);
    }
  }
  out.push(RAW[RAW.length - 1]);
  return out;
}
const PTS = buildSmooth();
const SEGS = [];
let TOTAL_LEN = 0;
for (let i = 0; i < PTS.length - 1; i++) {
  const [x1, y1] = PTS[i];
  const [x2, y2] = PTS[i + 1];
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.001) continue;
  SEGS.push({ x1, y1, x2, y2, len, start: TOTAL_LEN });
  TOTAL_LEN += len;
}
function posAt(dist) {
  if (dist <= 0) { const s = SEGS[0]; return [s.x1, s.y1]; }
  for (const s of SEGS) {
    if (dist <= s.start + s.len) {
      const t = (dist - s.start) / s.len;
      return [s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t];
    }
  }
  const l = SEGS[SEGS.length - 1];
  return [l.x2, l.y2];
}
function angleAt(dist) {
  for (const s of SEGS) if (dist <= s.start + s.len) return Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
  const l = SEGS[SEGS.length - 1];
  return Math.atan2(l.y2 - l.y1, l.x2 - l.x1);
}
function nearestOnPath(x, y) {
  let best = { d: Infinity, x: 0, y: 0 };
  for (const s of SEGS) {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
    const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (s.len * s.len)));
    const px = s.x1 + vx * t, py = s.y1 + vy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { d, x: px, y: py };
  }
  return best;
}

const CHEVRONS = [];
for (let d = 40; d < TOTAL_LEN - 30; d += 52) {
  const [x, y] = posAt(d);
  CHEVRONS.push({ x, y, a: angleAt(d), d });
}
const PEBBLES = [];
for (let d = 8; d < TOTAL_LEN; d += 15) {
  const [x, y] = posAt(d);
  const a = angleAt(d) + Math.PI / 2;
  const off = (rng() - 0.5) * PATH_HALF * 1.5;
  PEBBLES.push({ x: x + Math.cos(a) * off, y: y + Math.sin(a) * off, r: 2 + rng() * 2, s: rng() });
}
const GRASS_PATCHES = [];
for (let i = 0; i < 46; i++) {
  const x = rng() * W, y = rng() * H;
  if (nearestOnPath(x, y).d < PATH_HALF + 6) continue;
  GRASS_PATCHES.push({ x, y, r: 14 + rng() * 26, s: rng() });
}
const TUFTS = [];
for (let i = 0; i < 55; i++) {
  const x = rng() * W, y = rng() * H;
  if (nearestOnPath(x, y).d < PATH_HALF + 8) continue;
  TUFTS.push({ x, y, s: 0.7 + rng() * 0.7, p: rng() * 6 });
}
const FLOWER_COLS = ["#d88aa0", "#e0c070", "#e8e4d8", "#b08ad8"];
const FLOWERS = [];
for (let i = 0; i < 26; i++) {
  const x = 14 + rng() * (W - 28), y = 14 + rng() * (H - 28);
  if (nearestOnPath(x, y).d < PATH_HALF + 10) continue;
  FLOWERS.push({ x, y, c: FLOWER_COLS[Math.floor(rng() * FLOWER_COLS.length)], p: rng() * 6 });
}
const DECOR = [
  { x: 24, y: 30, t: "pine", s: 1.1 }, { x: 70, y: 420, t: "pine", s: 1 }, { x: 690, y: 26, t: "pine", s: 1.2 },
  { x: 606, y: 116, t: "pine", s: 0.9 }, { x: 60, y: 250, t: "tree", s: 1 }, { x: 452, y: 410, t: "tree", s: 1.05 },
  { x: 700, y: 330, t: "pine", s: 1 }, { x: 250, y: 22, t: "rock", s: 1 }, { x: 460, y: 170, t: "rock", s: 1.2 },
  { x: 26, y: 460, t: "rock", s: 0.9 }, { x: 210, y: 465, t: "pine", s: 0.85 },
];

// ============ TOWERS ============
const TOWERS = {
  archer: {
    name: "Archer Tower", cost: 100, dtype: "phys", proj: "arrow",
    blurb: "Quick arrows. Each recruit on the platform looses their own shaft.",
    levels: [
      { dmg: 14, rate: 750, range: 130 },
      { dmg: 26, rate: 700, range: 140, cost: 80, label: "Twin Archers" },
      { dmg: 42, rate: 650, range: 150, cost: 120, label: "Archer Trio" },
    ],
    branches: {
      a: { name: "Ranger Company", cost: 210, stats: { dmg: 13, rate: 155, range: 120 }, desc: "Rangers loose a blinding storm of arrows in relay. Melts swarms; struggles vs. heavy armor." },
      b: { name: "Master Longbowman", cost: 210, stats: { dmg: 210, rate: 2100, range: 275, pierce: true }, desc: "One legendary archer. Slow, colossal shots that pierce any armor, from across the map." },
    },
  },
  knight: {
    name: "Knight Garrison", cost: 80, dtype: "phys", proj: "units",
    blurb: "A knight marches out to hold an enemy in melee. Upgrades add more swords.",
    levels: [
      { dmg: 16, rate: 800, range: 100, hp: 110, count: 1 },
      { dmg: 21, rate: 760, range: 105, hp: 150, count: 2, cost: 90, label: "Second Sword" },
      { dmg: 28, rate: 720, range: 110, hp: 200, count: 3, cost: 130, label: "Shield Brothers" },
    ],
    branches: {
      a: { name: "Paladin Order", cost: 230, stats: { dmg: 36, rate: 800, range: 115, hp: 280, count: 3, magic: true, stun: 0.25, stunDur: 900, heal: 7 }, desc: "Three radiant paladins: MAGIC blows that ignore armor, chance to stun, and they mend their own wounds." },
      b: { name: "Berserker Hall", cost: 230, stats: { dmg: 20, rate: 320, range: 115, hp: 150, count: 4 }, desc: "FOUR berserkers with whirling axes. Frailer than knights, but a storm of steel." },
    },
  },
  wizard: {
    name: "Wizard Spire", cost: 140, dtype: "magic", proj: "orb",
    blurb: "Arcane blasts splash in an area — strongest at the blast's heart — and ignore armor.",
    levels: [
      { dmg: 20, rate: 1300, range: 120, splash: 55 },
      { dmg: 34, rate: 1250, range: 128, splash: 60, cost: 100, label: "Adept Circle" },
      { dmg: 52, rate: 1200, range: 136, splash: 66, cost: 150, label: "High Sorcery" },
    ],
    branches: {
      a: { name: "Pyromancer", cost: 250, stats: { dmg: 46, rate: 1200, range: 140, splash: 90, burn: 14, burnDur: 3000 }, desc: "Fireballs with a huge blast that set enemies ablaze — burning damage over time." },
      b: { name: "Frost Archmage", cost: 250, stats: { dmg: 36, rate: 1150, range: 140, splash: 80, slow: 0.45, slowDur: 2000 }, desc: "Glacial bursts chill everything hit, slowing the horde by 45%." },
    },
  },
  support: {
    name: "Warden Priest", cost: 110, dtype: "magic", proj: "aura",
    blurb: "A priest on an altar rains blessings — every enemy in the aura is slowed.",
    levels: [
      { slow: 0.15, range: 100, rate: 0 },
      { slow: 0.2, range: 110, rate: 0, cost: 80, label: "Consecrated Altar" },
      { slow: 0.25, range: 120, rate: 0, cost: 120, label: "High Sanctum" },
    ],
    branches: {
      a: { name: "Sanctuary of Mending", cost: 220, stats: { slow: 0.12, heal: 22, range: 135 }, desc: "Holy light: a faint slow, but wounded knights standing in it are mended (22 hp/s)." },
      b: { name: "Chronomancer", cost: 220, stats: { slow: 0.4, range: 135 }, desc: "Time thickens — every enemy in the aura is slowed by 40%." },
      c: { name: "Battle Standard", cost: 220, stats: { slow: 0.1, buff: 0.5, range: 135 }, desc: "A war banner: knights fighting in its light strike 50% HARDER. Keeps a slight slow." },
    },
  },
};

// ============ ENEMIES ============
const ENEMIES = {
  goblin: { hp: 55, speed: 82, bounty: 6, armor: 0, size: 15, name: "Goblin", atk: 10, atkRate: 800, castleDmg: 1 },
  wolf: { hp: 42, speed: 145, bounty: 6, armor: 0, size: 15, name: "Dire Wolf", atk: 12, atkRate: 650, castleDmg: 1 },
  orc: { hp: 135, speed: 62, bounty: 10, armor: 0, size: 18, name: "Orc", atk: 22, atkRate: 900, castleDmg: 2 },
  armored: { hp: 210, speed: 55, bounty: 14, armor: 0.5, size: 17, name: "Ironclad", atk: 18, atkRate: 900, castleDmg: 2 },
  troll: { hp: 560, speed: 40, bounty: 26, armor: 0.15, regen: 9, size: 21, name: "Troll", atk: 38, atkRate: 1100, castleDmg: 3 },
  dragon: { hp: 4300, speed: 34, bounty: 200, armor: 0.3, size: 27, name: "DRAGON", boss: true, atk: 0, atkRate: 0, castleDmg: 5 },
};

const WAVES = [
  [["goblin", 8, 900]],
  [["goblin", 12, 750]],
  [["goblin", 8, 700], ["wolf", 4, 600]],
  [["orc", 8, 950]],
  [["goblin", 10, 550], ["wolf", 7, 500]],
  [["orc", 9, 850], ["armored", 4, 1100]],
  [["wolf", 16, 420]],
  [["orc", 10, 750], ["armored", 6, 950]],
  [["troll", 2, 2500], ["goblin", 12, 480]],
  [["armored", 10, 800], ["wolf", 8, 450]],
  [["troll", 4, 2000], ["orc", 10, 650]],
  [["goblin", 22, 340], ["wolf", 12, 380]],
  [["armored", 13, 650], ["troll", 4, 1800]],
  [["troll", 6, 1500], ["orc", 12, 550], ["wolf", 8, 420]],
  [["armored", 8, 900], ["dragon", 1, 0]],
];
const waveHpMult = (w) => 1 + (w - 1) * 0.13;
const waveBonus = (w) => 55 + w * 9;

let NEXT_ID = 1;

// ============ PIXEL SPRITES ============
const SPRITES = {
  goblin: {
    pal: { o: INK, g: "#6aa04f", d: "#4d7639", e: "#c8453a" },
    frames: [
      [
        "..o.....o..",
        ".ogo...ogo.",
        ".ogooooogo.",
        "ogggggggggo",
        "ogeggggeggo",
        "ogggddggggo",
        ".ogggggggo.",
        "..oggdggo..",
        "..ogdddgo..",
        "..od...do..",
        "..oo...oo..",
      ],
      [
        "..o.....o..",
        ".ogo...ogo.",
        ".ogooooogo.",
        "ogggggggggo",
        "ogeggggeggo",
        "ogggddggggo",
        ".ogggggggo.",
        "..oggdggo..",
        "..ogdddgo..",
        ".od.....do.",
        ".oo.....oo.",
      ],
    ],
  },
  wolf: {
    pal: { o: INK, w: "#8f929c", d: "#63666f", e: "#d8b34a", n: "#2b2a33" },
    frames: [
      [
        "............oo..",
        ".o.........oddo.",
        "odo.ooooooowwddo",
        ".odowwwwwwwwweoo",
        "..owwwwwwwwwwonn",
        "..odwwwwwwwwdo..",
        "...owwwwwwwwo...",
        "...ow.oww.owo...",
        "...od.od..od....",
        "....o..o...o....",
      ],
      [
        "............oo..",
        ".o.........oddo.",
        "odo.ooooooowwddo",
        ".odowwwwwwwwweoo",
        "..owwwwwwwwwwonn",
        "..odwwwwwwwwdo..",
        "...owwwwwwwwo...",
        "...oww.ow.owo...",
        "....od..od.od...",
        ".....o...o..o...",
      ],
    ],
  },
  orc: {
    pal: { o: INK, g: "#7d9a4a", d: "#5c7638", t: "#ece0c4", e: "#c8453a", c: "#6e4f2c", m: "#63666f" },
    frames: [
      [
        "..occo.......",
        "..occo.......",
        "...oc.oooo...",
        "..oooggggo...",
        ".omogggego...",
        ".omoggggto...",
        "..oggggto....",
        "..ogddddgo...",
        "..ogddddgo...",
        "...ogddgo....",
        "...od..do....",
        "...od..do....",
        "...oo..oo....",
      ],
      [
        "..occo.......",
        "..occo.......",
        "...oc.oooo...",
        "..oooggggo...",
        ".omogggego...",
        ".omoggggto...",
        "..oggggto....",
        "..ogddddgo...",
        "..ogddddgo...",
        "...ogddgo....",
        "..od....do...",
        ".od......do..",
        ".oo......oo..",
      ],
    ],
  },
  armored: {
    pal: { o: INK, s: "#9aa0ac", d: "#63676f", h: "#c4c8d0", r: "#b04a3c", g: "#d8b34a" },
    frames: [
      [
        "....orro....",
        "....orro....",
        "...ohhhho...",
        "...oo..oo...",
        "...ohhhhoho.",
        "..ossssohho.",
        "..osddsohgo.",
        "..ossssohho.",
        "..osddsohho.",
        "...ossoohho.",
        "...od.do.o..",
        "...od.do....",
        "...oo.oo....",
      ],
      [
        "....orro....",
        "....orro....",
        "...ohhhho...",
        "...oo..oo...",
        "...ohhhhoho.",
        "..ossssohho.",
        "..osddsohgo.",
        "..ossssohho.",
        "..osddsohho.",
        "...ossoohho.",
        "..od...do.o.",
        "..od...do...",
        "..oo...oo...",
      ],
    ],
  },
  troll: {
    pal: { o: INK, g: "#6f8a55", d: "#54683f", n: "#8fa868", c: "#5f4326", y: "#d8b34a" },
    frames: [
      [
        "....ooooo.......",
        "...ogggggo......",
        "..ogggggggo.....",
        ".ogggggggggoo...",
        ".oggdgggggyno...",
        ".ogddgggggnno...",
        ".ogddggggggo.c..",
        ".oggddddggo..c..",
        "..ogddddggo..c..",
        "..oggddggo..cc..",
        "...ogggggo..cc..",
        "...od...do..oo..",
        "...od...do......",
        "..ood...doo.....",
        "..oo.....oo.....",
      ],
      [
        "....ooooo.......",
        "...ogggggo......",
        "..ogggggggo.....",
        ".ogggggggggoo...",
        ".oggdgggggyno...",
        ".ogddgggggnno...",
        ".ogddggggggo.c..",
        ".oggddddggo..c..",
        "..ogddddggo..c..",
        "..oggddggo..cc..",
        "...ogggggo..cc..",
        "..od.....do.oo..",
        "..od.....do.....",
        ".ood.....doo....",
        ".oo.......oo....",
      ],
    ],
  },
  dragon: {
    pal: { o: INK, r: "#b04a3c", d: "#7d3329", y: "#e0c070", h: "#ece0c4", e: "#e8c14a", f: "#d88a3f" },
    frames: [
      [
        "......orro..............",
        ".....orrrro.............",
        "....orrrrrro............",
        "...orrrrrrro....oho.oho.",
        "....orrrrro....orrrorro.",
        ".....orro.....orrrrrrro.",
        "oo....orro...orrrrerrro.",
        "oddo...orroorrrrrrrrroo.",
        ".oddoo.orrrrrrrrrrrfo...",
        "..odddorrrrrrrrryyoof...",
        "...oodrrrrrrrryyyyo.....",
        ".....orrrrrryyyyyo......",
        "......orrrrryyyyo.......",
        ".......orrrrrroo........",
        "........oooooo..........",
        "........................",
      ],
      [
        "........................",
        "........................",
        "................oho.oho.",
        "...............orrrorro.",
        "..............orrrrrrro.",
        "oo...........orrrrerrro.",
        "oddo.....ooorrrrrrrrroo.",
        ".oddoo..orrrrrrrrrrrfo..",
        "..odddorrrrrrrrryyoof...",
        "...oodrrrrrrrryyyyo.....",
        "....orrrrrrryyyyyo......",
        "...orrrrrrryyyyo........",
        "..orrrrrorrrroo.........",
        ".orrrro..oooo...........",
        "..ooo...................",
        "........................",
      ],
    ],
  },
  knight: {
    frames: [
      [
        "...pp...",
        "..oaao..",
        ".oassao.",
        ".oaaaao.",
        "hhoaaao.",
        "hhoaaao.",
        "hhoaaao.",
        ".oaaao..",
        "..od.do.",
        "..od.do.",
        "..oo.oo.",
      ],
      [
        "...pp...",
        "..oaao..",
        ".oassao.",
        ".oaaaao.",
        "hhoaaao.",
        "hhoaaao.",
        "hhoaaao.",
        ".oaaao..",
        ".od..do.",
        ".od..do.",
        ".oo..oo.",
      ],
    ],
  },
};
const KNIGHT_PALS = {
  base: { o: INK, a: "#8a8f9a", d: "#5f636d", s: "#e0b088", p: "#b04a3c", h: "#a04a3f" },
  paladin: { o: INK, a: "#d8cfae", d: "#b0a67f", s: "#e0b088", p: "#e0c070", h: "#d8b34a" },
  berserk: { o: INK, a: "#8a5f3f", d: "#63432b", s: "#e0b088", p: "#b04a3c" },
};

// little characters that stand on towers (and serve as menu icons)
const MINI = {
  archer: {
    frames: [[
      "...oo.....",
      "..ohho....",
      ".ohhhho...",
      "..osso....",
      ".obbbo.w..",
      "obbbbbow..",
      "obbbbbow..",
      ".obbbo.w..",
      ".obbbo....",
      ".od.do....",
      ".od.do....",
      ".oo.oo....",
    ]],
  },
  wizard: {
    frames: [[
      ".....o....",
      "....oho...",
      "...ohhho..",
      "..ohhhhho.",
      "...osso..g",
      "..obbbo.tg",
      "..obbbbot.",
      ".obbbbbot.",
      ".obbbbbot.",
      ".obbbbbot.",
      "..obbbot..",
      "..od.dot..",
      "..oo.oot..",
    ]],
  },
  priest: {
    frames: [
      [
        "...omo....",
        "..ommmo...",
        "..osso....",
        "..orro....",
        ".orrrro...",
        ".orrrro...",
        ".orcrro...",
        ".orrrro...",
        ".orrrro...",
        "..orro....",
        "..o..o....",
        "..oo.oo...",
      ],
      [
        "o..omo..o.",
        "o.ommmo.o.",
        "oo.osso.oo",
        ".oorrroo..",
        "..orrrro..",
        ".orrrro...",
        ".orcrro...",
        ".orrrro...",
        ".orrrro...",
        "..orro....",
        "..o..o....",
        "..oo.oo...",
      ],
    ],
  },
};
const ARCHER_PALS = {
  base: { o: INK, h: "#54703f", b: "#6e4c28", s: "#e0b088", w: "#4a3018" },
  a: { o: INK, h: "#3f6a34", b: "#4a7a3c", s: "#e0b088", w: "#4a3018" },
  b: { o: INK, h: "#2c3e54", b: "#3a5474", s: "#e0b088", w: "#4a3018" },
};
const WIZ_PALS = {
  base: { o: INK, h: "#5f4a86", b: "#6a5a94", s: "#e0b088", t: "#5f4326", g: "#b08ad8" },
  a: { o: INK, h: "#a0473a", b: "#8a4034", s: "#e0b088", t: "#5f4326", g: "#d8763a" },
  b: { o: INK, h: "#4a7aa0", b: "#3f6a8e", s: "#e0b088", t: "#5f4326", g: "#9fd4e8" },
};
const PRIEST_PALS = {
  base: { o: INK, m: "#e0d6ba", r: "#c8c2ae", s: "#e0b088", c: "#d8b34a" },
  a: { o: INK, m: "#bee8b0", r: "#5cae5c", s: "#e0b088", c: "#e8e4d8" },
  b: { o: INK, m: "#c8ecec", r: "#4a8aa0", s: "#e0b088", c: "#7cd4d4" },
  c: { o: INK, m: "#e0c070", r: "#a0473a", s: "#e0b088", c: "#d8b34a" },
};

function drawSprite(ctx, spr, pal, frame, x, y, flip) {
  const map = spr.frames[frame % spr.frames.length];
  const h = map.length, w = map[0].length;
  const ox = Math.round((x - (w * CELL) / 2) / CELL) * CELL;
  const oy = Math.round((y - (h * CELL) / 2) / CELL) * CELL;
  let last = null;
  for (let r = 0; r < h; r++) {
    const row = map[r];
    for (let c = 0; c < w; c++) {
      const ch = row[flip ? w - 1 - c : c];
      if (ch === "." || ch === undefined) continue;
      const col = pal[ch];
      if (!col) continue;
      if (col !== last) { ctx.fillStyle = col; last = col; }
      ctx.fillRect(ox + c * CELL, oy + r * CELL, CELL, CELL);
    }
  }
}

// pixel icon for menus — drawn from the game's own sprite data
function PixelIcon({ kind, branch = null, size = 30 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    let spr, pal;
    if (kind === "knight") { spr = SPRITES.knight; pal = branch === "a" ? KNIGHT_PALS.paladin : branch === "b" ? KNIGHT_PALS.berserk : KNIGHT_PALS.base; }
    else if (kind === "archer") { spr = MINI.archer; pal = ARCHER_PALS[branch || "base"]; }
    else if (kind === "wizard") { spr = MINI.wizard; pal = WIZ_PALS[branch || "base"]; }
    else { spr = MINI.priest; pal = PRIEST_PALS[branch || "base"]; }
    drawSprite(ctx, spr, pal, 0, size / 2, size / 2 + 1, false);
  }, [kind, branch, size]);
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, imageRendering: "pixelated", flexShrink: 0 }} />;
}

export default function Crownguard() {
  const canvasRef = useRef(null);
  const bufRef = useRef(null);
  const G = useRef(null);
  const [ui, setUi] = useState({ gold: 0, lives: 0, wave: 0, phase: "build", selected: null, buildMode: null, speed: 1, paused: false, result: null, canRestart: false, cdSec: null, zoom: 1 });
  const [menuOpen, setMenuOpen] = useState(false);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  const initGame = useCallback(() => {
    G.current = {
      gold: 250, lives: CASTLE_HP, wave: 0, phase: "build",
      towers: [], enemies: [], projectiles: [], effects: [],
      spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
      selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
      cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null,
    };
    setUi({ gold: 250, lives: CASTLE_HP, wave: 0, phase: "build", selected: null, buildMode: null, speed: 1, paused: false, result: null, canRestart: false, cdSec: null, zoom: 1 });
  }, []);

  const towerNear = (g, x, y) => g.towers.find((t) => Math.hypot(t.x - x, t.y - y) < 30);
  const buildableAt = (g, x, y) => {
    if (x < 18 || x > W - 18 || y < 22 || y > H - 16) return false;
    if (nearestOnPath(x, y).d < BLOCK_DIST) return false;
    const [cvx, cvy] = PTS[0];
    const [csx, csy] = PTS[PTS.length - 1];
    if (Math.hypot(x - cvx, y - cvy) < 50 || Math.hypot(x - (csx + 6), y - csy) < 62) return false;
    for (const d of DECOR) if (Math.hypot(d.x - x, d.y - y) < 26 * d.s) return false;
    if (towerNear(g, x, y)) return false;
    return true;
  };

  const getStats = (t) => {
    const def = TOWERS[t.kind];
    if (t.branch) {
      const b = def.branches[t.branch];
      return { ...b.stats, dtype: b.stats.magic ? "magic" : def.dtype };
    }
    return { ...def.levels[t.level - 1], dtype: def.dtype };
  };

  const unitSlots = (t) => {
    const n = getStats(t).count || 1;
    const base = [[0, -11], [-14, 3], [14, 3], [0, 15]];
    return base.slice(0, n).map(([dx, dy]) => [t.rally.x + dx, t.rally.y + dy]);
  };
  const syncUnits = (t) => {
    const st = getStats(t);
    const n = st.count || 1;
    if (!t.units) t.units = [];
    while (t.units.length < n) {
      const slots = unitSlots(t);
      const i = t.units.length;
      t.units.push({ id: NEXT_ID++, hp: st.hp, maxHp: st.hp, x: slots[i][0], y: slots[i][1], state: "rally", targetId: null, atkCd: 0, respawn: 0, face: 1, swing: 0, healGlow: 0, atkBuff: 0 });
    }
    for (const u of t.units) { u.maxHp = st.hp; if (u.state !== "dead") u.hp = Math.min(u.hp, u.maxHp); }
  };

  const makeTower = (kind, x, y, level = 1, branch = null, invested = null) => {
    const t = {
      id: NEXT_ID++, kind, x, y, level, branch, cd: 0,
      invested: invested ?? TOWERS[kind].cost, lastAim: -Math.PI / 2, anim: 0, shotIdx: 0,
    };
    if (kind === "knight") {
      // knights muster just south of their hall by default
      t.rally = { x, y: y + 28 };
      syncUnits(t);
    }
    return t;
  };

  const startWave = () => {
    const g = G.current;
    if (!g || g.phase !== "build" || g.wave >= WAVES.length) return;
    g.snapshot = {
      wave: g.wave, gold: g.gold, lives: g.lives,
      towers: g.towers.map((t) => ({ kind: t.kind, x: t.x, y: t.y, level: t.level, branch: t.branch, invested: t.invested })),
    };
    if (g.buildUntil != null) {
      const rem = Math.max(0, g.buildUntil - g.time);
      const bonus = Math.min(45, Math.ceil(rem * 1.5));
      if (bonus > 0) {
        g.gold += bonus;
        g.effects.push({ type: "coin", x: W / 2, y: 60, ttl: 1100, text: `Early horn! +${bonus}g`, big: true });
      }
      g.buildUntil = null;
    }
    g.wave += 1;
    g.phase = "combat";
    const mult = waveHpMult(g.wave);
    const queue = [];
    let delay = 400;
    for (const [type, count, gap] of WAVES[g.wave - 1]) {
      for (let i = 0; i < count; i++) { queue.push({ type, at: delay, mult }); delay += gap; }
      delay += 900;
    }
    g.spawnQueue = queue;
    g.spawnTimer = 0;
  };

  const restartWave = () => {
    const g = G.current;
    if (!g || !g.snapshot) return;
    const s = g.snapshot;
    g.wave = s.wave; g.gold = s.gold; g.lives = s.lives;
    g.towers = s.towers.map((td) => makeTower(td.kind, td.x, td.y, td.level, td.branch, td.invested));
    g.enemies = []; g.projectiles = []; g.effects = []; g.spawnQueue = [];
    g.phase = "build"; g.selectedId = null; g.buildMode = null; g.paused = false; g.buildUntil = null;
  };

  const placeTower = (g, kind, x, y) => {
    const def = TOWERS[kind];
    if (g.gold < def.cost || !buildableAt(g, x, y)) return;
    g.gold -= def.cost;
    g.towers.push(makeTower(kind, x, y));
    g.buildMode = null;
  };

  const upgradeTower = (t) => {
    const g = G.current;
    const def = TOWERS[t.kind];
    if (t.branch || t.level >= 3) return;
    const cost = def.levels[t.level].cost;
    if (g.gold < cost) return;
    g.gold -= cost; t.level += 1; t.invested += cost;
    if (t.kind === "knight") { syncUnits(t); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
    g.effects.push({ type: "levelup", x: t.x, y: t.y, ttl: 600 });
    g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 700, life: 700, gold: false });
  };

  const branchTower = (t, key) => {
    const g = G.current;
    const br = TOWERS[t.kind].branches[key];
    if (t.branch || t.level < 3 || g.gold < br.cost) return;
    g.gold -= br.cost; t.branch = key; t.invested += br.cost;
    if (t.kind === "knight") { syncUnits(t); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
    g.effects.push({ type: "evolve", x: t.x, y: t.y, ttl: 900 });
    g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 1100, life: 1100, gold: true });
    g.effects.push({ type: "flash", x: t.x, y: t.y - 10, ttl: 450 });
  };

  const releaseEnemy = (g, e) => { if (!e) return; e.blockedBy = null; e.engaged = false; };

  const sellTower = (t) => {
    const g = G.current;
    if (t.units) for (const u of t.units) { const e = g.enemies.find((x) => x.blockedBy === u.id); releaseEnemy(g, e); }
    g.gold += Math.floor(t.invested * 0.7);
    g.towers = g.towers.filter((x) => x.id !== t.id);
    g.selectedId = null;
  };

  const dealDamage = (g, e, amount, dtype, pierce) => {
    let dmg = amount;
    if (dtype === "phys" && !pierce) dmg *= 1 - e.armor;
    e.hp -= dmg;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      g.gold += e.bounty;
      g.effects.push({ type: "coin", x: e.x, y: e.y - 14, ttl: 700, text: `+${e.bounty}` });
      g.effects.push({ type: "poof", x: e.x, y: e.y, ttl: 350 });
    }
  };

  // ============ MAIN LOOP ============
  useEffect(() => {
    initGame();
    let raf, last = performance.now();

    const step = (now) => {
      raf = requestAnimationFrame(step);
      const g = G.current;
      if (!g) return;
      let dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const sdt = g.paused ? 0 : dt * g.speed;
      g.time += sdt;
      const tms = g.time * 1000;

      if (!g.paused && g.phase === "combat") {
        g.spawnTimer += sdt * 1000;
        while (g.spawnQueue.length && g.spawnQueue[0].at <= g.spawnTimer) {
          const s = g.spawnQueue.shift();
          const d = ENEMIES[s.type];
          g.enemies.push({
            id: NEXT_ID++, type: s.type, hp: d.hp * s.mult, maxHp: d.hp * s.mult, dist: 0,
            speed: d.speed, armor: d.armor, bounty: d.bounty, regen: d.regen || 0,
            boss: !!d.boss, size: d.size, atk: d.atk, atkRate: d.atkRate, castleDmg: d.castleDmg || 1,
            lane: d.boss ? 0 : (Math.random() - 0.5) * PATH_HALF * 1.15,
            x: PTS[0][0], y: PTS[0][1], face: 1, atkAnim: 0, auraSlow: 0,
            slowUntil: 0, slowPct: 0, burnUntil: 0, burnDps: 0,
            stunUntil: 0, dead: false, blockedBy: null, engaged: false, meleeCd: 0,
          });
        }
        for (const e of g.enemies) e.auraSlow = 0;
        for (const t of g.towers) if (t.units) for (const u of t.units) u.atkBuff = 0;
        for (const t of g.towers) {
          if (t.kind !== "support") continue;
          const st = getStats(t);
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range) e.auraSlow = Math.max(e.auraSlow, st.slow);
          }
          if (st.heal || st.buff) {
            for (const t2 of g.towers) {
              if (!t2.units) continue;
              for (const u of t2.units) {
                if (u.state === "dead") continue;
                if (Math.hypot(u.x - t.x, u.y - t.y) > st.range) continue;
                if (st.heal && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + st.heal * sdt); u.healGlow = 250; }
                if (st.buff) u.atkBuff = Math.max(u.atkBuff, st.buff);
              }
            }
          }
        }
        for (const e of g.enemies) {
          if (e.dead) continue;
          if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.regen * sdt);
          if (e.burnUntil > tms) dealDamage(g, e, e.burnDps * sdt, "magic");
          if (e.dead) continue;
          e.atkAnim = Math.max(0, e.atkAnim - sdt * 1000);
          const stunned = e.stunUntil > tms;
          const held = e.blockedBy && e.engaged;
          if (!stunned && !held) {
            const slow = Math.max(e.slowUntil > tms ? e.slowPct : 0, e.auraSlow || 0);
            e.dist += e.speed * (1 - slow) * sdt;
          }
          const [px, py] = posAt(e.dist);
          const a = angleAt(e.dist);
          e.x = px + Math.cos(a + Math.PI / 2) * e.lane;
          e.y = py + Math.sin(a + Math.PI / 2) * e.lane;
          if (!held && Math.abs(Math.cos(a)) > 0.3) e.face = Math.cos(a) >= 0 ? 1 : -1;
          if (e.dist >= TOTAL_LEN) {
            e.dead = true;
            const dmgC = e.castleDmg || 1;
            g.lives -= dmgC;
            g.shake = 5 + dmgC * 2.5;
            g.effects.push({ type: "leak", x: e.x - 10, y: e.y, ttl: 700, text: `-${dmgC}` });
            if (g.lives <= 0) { g.lives = 0; g.phase = "lost"; }
          }
        }
        g.enemies = g.enemies.filter((e) => !e.dead);

        for (const t of g.towers) {
          if (t.kind !== "knight") continue;
          syncUnits(t);
          const st = getStats(t);
          const slots = unitSlots(t);
          t.units.forEach((u, i) => {
            if (u.state === "dead") {
              u.respawn -= sdt * 1000;
              if (u.respawn <= 0) { u.state = "rally"; u.hp = st.hp; u.x = slots[i][0]; u.y = slots[i][1]; u.targetId = null; }
              return;
            }
            if (st.heal && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + st.heal * sdt);
            u.atkCd -= sdt * 1000;
            u.swing = Math.max(0, u.swing - sdt * 1000);
            u.healGlow = Math.max(0, (u.healGlow || 0) - sdt * 1000);

            let target = u.targetId ? g.enemies.find((e) => e.id === u.targetId && !e.dead) : null;
            if (target && Math.hypot(target.x - t.rally.x, target.y - t.rally.y) > st.range + 60) { releaseEnemy(g, target); target = null; u.targetId = null; }
            if (!target && u.targetId) u.targetId = null;

            if (!target) {
              let best = null, bestDist = -1;
              for (const e of g.enemies) {
                if (e.dead || e.boss || e.blockedBy) continue;
                if (Math.hypot(e.x - t.rally.x, e.y - t.rally.y) <= st.range && e.dist > bestDist) { bestDist = e.dist; best = e; }
              }
              if (best) { best.blockedBy = u.id; u.targetId = best.id; u.state = "moving"; target = best; }
            }

            if (target) {
              const dx = target.x - u.x, dy = target.y - u.y;
              const d = Math.hypot(dx, dy);
              if (d > 17) {
                target.engaged = d < 30;
                const sp = 95 * sdt;
                u.x += (dx / d) * sp; u.y += (dy / d) * sp;
                u.face = dx >= 0 ? 1 : -1;
                u.state = "moving";
              } else {
                target.engaged = true;
                u.state = "fighting";
                u.face = dx >= 0 ? 1 : -1;
                target.face = -u.face;
                if (u.atkCd <= 0) {
                  u.atkCd = st.rate;
                  u.swing = 180;
                  dealDamage(g, target, st.dmg * (1 + (u.atkBuff || 0)), st.magic ? "magic" : "phys", st.magic);
                  g.effects.push({ type: "spark", x: target.x, y: target.y - 6, ttl: 160, gold: !!st.magic || u.atkBuff > 0 });
                  if (st.stun && Math.random() < st.stun) target.stunUntil = tms + st.stunDur;
                  if (target.dead) { u.targetId = null; u.state = "rally"; }
                }
                if (!target.dead && target.stunUntil <= tms && target.atk > 0) {
                  target.meleeCd -= sdt * 1000;
                  if (target.meleeCd <= 0) {
                    target.meleeCd = target.atkRate;
                    target.atkAnim = 200;
                    u.hp -= target.atk;
                    g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 200 });
                    if (u.hp <= 0) {
                      u.state = "dead"; u.respawn = RESPAWN_MS; u.targetId = null;
                      releaseEnemy(g, target);
                      g.effects.push({ type: "poof", x: u.x, y: u.y, ttl: 400 });
                    }
                  }
                }
              }
            } else {
              const hx = slots[i][0], hy = slots[i][1];
              const dx = hx - u.x, dy = hy - u.y;
              const d = Math.hypot(dx, dy);
              if (d > 3) { const sp = 85 * sdt; u.x += (dx / d) * sp; u.y += (dy / d) * sp; u.face = dx >= 0 ? 1 : -1; u.state = "moving"; }
              else u.state = "rally";
            }
          });
        }

        for (const t of g.towers) {
          t.anim = Math.max(0, t.anim - sdt * 4);
          if (t.kind === "knight" || t.kind === "support") continue;
          t.cd -= sdt * 1000;
          if (t.cd > 0) continue;
          const st = getStats(t);
          let target = null, best = -1;
          for (const e of g.enemies) {
            if (e.dead) continue;
            const d = Math.hypot(e.x - t.x, e.y - t.y);
            if (d <= st.range && e.dist > best) { best = e.dist; target = e; }
          }
          if (!target) continue;
          t.cd = st.rate;
          t.anim = 1;
          t.lastAim = Math.atan2(target.y - t.y, target.x - t.x);
          if (t.kind === "archer") {
            const hgt = t.branch === "b" ? 38 : 14 + t.level * 6;
            let offs;
            if (t.branch === "a") {
              const spots = [[-9, -1], [8, -2], [0, -8]];
              t.shotIdx = (t.shotIdx + 1) % 3;
              offs = [spots[t.shotIdx]];
            } else if (t.branch === "b") {
              offs = [[0, -4]];
            } else {
              offs = t.level === 1 ? [[0, -3]] : t.level === 2 ? [[-7, -2], [7, -3]] : [[-9, -1], [9, -2], [0, -8]];
            }
            const per = t.branch ? st.dmg : Math.round(st.dmg / offs.length);
            offs.forEach(([ox, oy], i) => {
              g.projectiles.push({
                id: NEXT_ID++, x: t.x + ox, y: t.y - hgt + oy - 6, targetId: target.id,
                tx: target.x, ty: target.y, speed: 460, delay: i * 90,
                dmg: per, dtype: st.dtype, pierce: !!st.pierce, splash: 0,
                burn: 0, burnDur: 0, slow: 0, slowDur: 0, kind: "arrow",
              });
            });
          } else {
            g.projectiles.push({
              id: NEXT_ID++, x: t.x, y: t.y - 30, targetId: target.id,
              tx: target.x, ty: target.y, speed: 300, delay: 0,
              dmg: st.dmg, dtype: st.dtype, pierce: !!st.pierce, splash: st.splash || 0,
              burn: st.burn || 0, burnDur: st.burnDur || 0, slow: st.slow || 0, slowDur: st.slowDur || 0,
              kind: "orb",
            });
          }
        }

        for (const p of g.projectiles) {
          if (p.delay > 0) { p.delay -= sdt * 1000; continue; }
          const target = g.enemies.find((e) => e.id === p.targetId && !e.dead);
          if (target) { p.tx = target.x; p.ty = target.y; }
          const dx = p.tx - p.x, dy = p.ty - p.y;
          const d = Math.hypot(dx, dy);
          const stepLen = p.speed * sdt;
          if (d <= stepLen + 4) {
            p.done = true;
            if (p.splash > 0) {
              g.effects.push({ type: p.burn ? "boom" : p.slow ? "frost" : "arcane", x: p.tx, y: p.ty, ttl: 320, r: p.splash });
              for (const e of g.enemies) {
                if (e.dead) continue;
                const dd = Math.hypot(e.x - p.tx, e.y - p.ty);
                if (dd <= p.splash) {
                  dealDamage(g, e, p.dmg * (1 - 0.55 * (dd / p.splash)), p.dtype, p.pierce);
                  if (p.burn) { e.burnUntil = tms + p.burnDur; e.burnDps = p.burn; }
                  if (p.slow) { e.slowUntil = tms + p.slowDur; e.slowPct = p.slow; }
                }
              }
            } else if (target) {
              dealDamage(g, target, p.dmg, p.dtype, p.pierce);
              if (p.pierce) g.effects.push({ type: "pierce", x: p.tx, y: p.ty, ttl: 250 });
            }
          } else {
            p.x += (dx / d) * stepLen;
            p.y += (dy / d) * stepLen;
            p.angle = Math.atan2(dy, dx);
          }
        }
        g.projectiles = g.projectiles.filter((p) => !p.done);

        if (!g.spawnQueue.length && g.enemies.length === 0 && g.phase === "combat") {
          g.gold += waveBonus(g.wave);
          g.effects.push({ type: "coin", x: W / 2, y: 40, ttl: 1200, text: `Wave cleared! +${waveBonus(g.wave)}g`, big: true });
          if (g.wave >= WAVES.length) g.phase = "won";
          else { g.phase = "build"; g.buildUntil = g.time + BUILD_TIME; }
        }
      }

      if (!g.paused && g.phase === "build" && g.buildUntil != null && g.time >= g.buildUntil) {
        startWave();
      }

      if (!g.paused) {
        for (const fx of g.effects) fx.ttl -= sdt * 1000;
        g.effects = g.effects.filter((fx) => fx.ttl > 0);
        if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 30);
      }

      draw(g);

      const u = uiRef.current;
      const sel = g.towers.find((t) => t.id === g.selectedId) || null;
      const selKey = sel ? `${sel.id}-${sel.level}-${sel.branch}` : null;
      const canRestart = !!g.snapshot && (g.phase === "combat" || g.phase === "lost" || (g.phase === "build" && g.wave > 0));
      const cdSec = g.phase === "build" && g.buildUntil != null ? Math.max(0, Math.ceil(g.buildUntil - g.time)) : null;
      if (u.gold !== Math.floor(g.gold) || u.lives !== g.lives || u.wave !== g.wave || u.phase !== g.phase || u.selKey !== selKey || u.buildMode !== g.buildMode || u.speed !== g.speed || u.paused !== g.paused || u.canRestart !== canRestart || u.cdSec !== cdSec || u.zoom !== g.cam.zoom) {
        setUi({
          gold: Math.floor(g.gold), lives: g.lives, wave: g.wave, phase: g.phase,
          selected: sel ? { id: sel.id, kind: sel.kind, level: sel.level, branch: sel.branch, invested: sel.invested } : null,
          selKey, buildMode: g.buildMode, speed: g.speed, paused: g.paused, canRestart, cdSec, zoom: g.cam.zoom,
          result: g.phase === "won" ? "won" : g.phase === "lost" ? "lost" : null,
        });
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ DRAWING ============
  const S = (v) => Math.round(v / CELL) * CELL;

  const drawEnemy = (ctx, e, time, tms) => {
    const spr = SPRITES[e.type];
    const fighting = e.blockedBy && e.engaged;
    const rate = e.type === "wolf" ? 8 : e.type === "goblin" || e.type === "orc" ? 5 : 4;
    const frame = fighting && e.type !== "dragon" ? Math.floor(time * 8) % 2 : Math.floor(time * rate + e.id) % 2;
    ctx.fillStyle = "rgba(20,20,26,0.3)";
    const shw = Math.round(e.size * 0.6 / CELL) * CELL;
    ctx.fillRect(S(e.x - shw), S(e.y + e.size * 0.55), shw * 2, CELL * 2);
    const lunge = e.atkAnim > 0 ? CELL * e.face : 0;
    const hover = e.type === "dragon" ? S(Math.sin(time * 3 + e.id) * 3) - 10 : 0;
    drawSprite(ctx, spr, spr.pal, frame, e.x + lunge, e.y + hover, e.face < 0);
    if (e.slowUntil > tms || e.auraSlow > 0) {
      ctx.fillStyle = "#9fd4e8";
      for (let i = 0; i < 3; i++) {
        const ang = time * 2 + i * 2.1;
        ctx.fillRect(S(e.x + Math.cos(ang) * 11), S(e.y - 2 + Math.sin(ang) * 4), CELL, CELL * 2);
      }
    }
    if (e.burnUntil > tms) {
      for (let i = 0; i < 3; i++) {
        const fx = e.x - 8 + i * 8;
        const fy = e.y - e.size - 2 - ((time * 30 + i * 7) % 8);
        ctx.fillStyle = i === 1 ? "#e8c14a" : "#d8763a";
        ctx.fillRect(S(fx), S(fy), CELL, CELL * 2);
      }
    }
    if (e.stunUntil > tms) {
      ctx.fillStyle = "#e8d47a";
      for (let i = 0; i < 3; i++) {
        const ang = time * 6 + i * 2.09;
        ctx.fillRect(S(e.x + Math.cos(ang) * 11), S(e.y - e.size - 6 + Math.sin(ang) * 3), CELL, CELL);
      }
    }
    const w = e.boss ? 44 : 26;
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = INK;
    ctx.fillRect(e.x - w / 2 - 1, e.y - e.size - 12, w + 2, 6);
    ctx.fillStyle = pct > 0.5 ? "#6fae5c" : pct > 0.25 ? "#d8b34a" : "#c05248";
    ctx.fillRect(e.x - w / 2, e.y - e.size - 11, Math.round(w * pct / CELL) * CELL, 4);
    if (e.armor >= 0.3) {
      ctx.fillStyle = "#9aa0ac";
      ctx.fillRect(e.x + w / 2 + 4, e.y - e.size - 12, 4, 4);
      ctx.fillRect(e.x + w / 2 + 5, e.y - e.size - 8, 2, 2);
    }
  };

  const drawKnightUnit = (ctx, u, t, time) => {
    if (u.state === "dead") return;
    const berserk = t.branch === "b";
    const paladin = t.branch === "a";
    const pal = paladin ? KNIGHT_PALS.paladin : berserk ? KNIGHT_PALS.berserk : KNIGHT_PALS.base;
    const frame = u.state === "moving" ? Math.floor(time * 8 + u.id) % 2 : 0;
    ctx.fillStyle = "rgba(20,20,26,0.3)";
    ctx.fillRect(S(u.x - 6), S(u.y + 9), 12, CELL);
    drawSprite(ctx, SPRITES.knight, pal, frame, u.x, u.y - 2, u.face < 0);
    const raised = u.swing > 90;
    const wx = S(u.x + (u.face < 0 ? -8 : 6));
    const wy = S(u.y - (raised ? 14 : 6));
    if (berserk) {
      ctx.fillStyle = "#5f4326";
      ctx.fillRect(wx, wy, CELL, 10);
      ctx.fillStyle = "#b8bcc4";
      ctx.fillRect(wx + (u.face < 0 ? -CELL * 2 : CELL), wy, CELL * 2, 6);
    } else {
      ctx.fillStyle = paladin ? "#e8d47a" : "#c4c8d0";
      ctx.fillRect(wx, wy - 4, CELL, 12);
      ctx.fillStyle = "#8a7444";
      ctx.fillRect(wx - CELL, wy + 6, CELL * 3, CELL);
    }
    if (paladin && u.swing > 120) {
      ctx.fillStyle = "rgba(232,212,122,0.35)";
      ctx.beginPath(); ctx.arc(S(u.x), S(u.y - 4), 11, 0, 7); ctx.fill();
    }
    if (u.atkBuff > 0) {
      ctx.fillStyle = "#d8b34a";
      ctx.fillRect(S(u.x) - CELL, S(u.y - 22), CELL, CELL);
      ctx.fillRect(S(u.x) - CELL * 2, S(u.y - 20), CELL, CELL);
      ctx.fillRect(S(u.x), S(u.y - 20), CELL, CELL);
    }
    if (u.healGlow > 0) {
      ctx.fillStyle = "#8ce08c";
      for (let i = 0; i < 2; i++) {
        const gy = u.y - 20 - ((time * 16 + i * 7 + u.id) % 10);
        const gx = u.x - 5 + i * 10;
        ctx.fillRect(S(gx) - CELL, S(gy), CELL * 3, CELL);
        ctx.fillRect(S(gx), S(gy) - CELL, CELL, CELL * 3);
      }
    }
    if (u.hp < u.maxHp) {
      const pct = Math.max(0, u.hp / u.maxHp);
      ctx.fillStyle = INK;
      ctx.fillRect(u.x - 10, u.y - 18, 20, 5);
      ctx.fillStyle = pct > 0.4 ? "#7cb4d8" : "#c05248";
      ctx.fillRect(u.x - 9, u.y - 17, Math.round(18 * pct / CELL) * CELL, 3);
    }
  };

  const drawArcherTower = (ctx, t, time) => {
    const x = S(t.x), y = S(t.y);
    const lvl = t.level;
    const tall = t.branch === "b";
    const h = tall ? 38 : 14 + lvl * 6;
    const wdt = tall ? 12 : 8 + lvl * 2;
    ctx.fillStyle = "rgba(20,20,26,0.3)";
    ctx.fillRect(x - wdt - 2, y + 14, (wdt + 2) * 2, 4);
    const wood = lvl === 1 && !t.branch;
    ctx.fillStyle = INK;
    ctx.fillRect(x - wdt - 2, y - h + 6, wdt * 2 + 4, h + 10);
    ctx.fillStyle = wood ? "#8a6238" : "#9a958a";
    ctx.fillRect(x - wdt, y - h + 8, wdt * 2, h + 6);
    ctx.fillStyle = wood ? "#a0754a" : "#b5b0a2";
    ctx.fillRect(x - wdt, y - h + 8, 4, h + 6);
    if (wood) {
      ctx.fillStyle = "#6e4c28";
      for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 6, y - h + 8, 2, h + 6);
    } else {
      ctx.fillStyle = "#7d786e";
      for (let i = 0; i < 3; i++) ctx.fillRect(x - wdt, y - h + 14 + i * 8, wdt * 2, 2);
    }
    const pw = 14 + lvl * 2;
    ctx.fillStyle = INK;
    ctx.fillRect(x - pw - 2, y - h, (pw + 2) * 2, 11);
    ctx.fillStyle = "#8a6238";
    ctx.fillRect(x - pw, y - h + 2, pw * 2, 7);
    ctx.fillStyle = "#a0754a";
    ctx.fillRect(x - pw, y - h + 2, pw * 2, 2);
    ctx.fillStyle = "#5f4326";
    for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * S(pw / 2.2) - 2, y - h - 4, 4, 6);
    const bc = t.branch === "a" ? "#5c8a44" : t.branch === "b" ? "#4a6a92" : "#a04a3f";
    const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(x + pw - 2, y - h - 16, 2, 14);
    ctx.fillStyle = bc;
    ctx.fillRect(x + pw, y - h - 16, 8 + wave, 3);
    ctx.fillRect(x + pw, y - h - 13, 5 + wave, 3);
    // pixel archers on the platform
    const recoil = t.anim > 0.4 ? CELL : 0;
    const pal = ARCHER_PALS[t.branch || "base"];
    const dir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
    const drawGuy = (gx, gy, big) => {
      const ax = t.x + gx, ay = t.y - h + gy - 8;
      drawSprite(ctx, MINI.archer, pal, 0, ax, ay, dir < 0);
      const bx = S(ax + dir * (7 - recoil));
      ctx.fillStyle = "#4a3018";
      ctx.fillRect(bx, S(ay - (big ? 10 : 7)), 2, big ? 18 : 13);
    };
    if (t.branch === "a") { drawGuy(-9, -1); drawGuy(8, -2); drawGuy(0, -8); }
    else if (t.branch === "b") drawGuy(0, -4, true);
    else {
      const spots = lvl === 1 ? [[0, -3]] : lvl === 2 ? [[-7, -2], [7, -3]] : [[-9, -1], [9, -2], [0, -8]];
      for (const [dx, dy] of spots) drawGuy(dx, dy);
    }
  };

  const drawWizardSpire = (ctx, t, time) => {
    const x = S(t.x), y = S(t.y);
    const lvl = t.level;
    const pal = WIZ_PALS[t.branch || "base"];
    const trim = pal.h;
    const orbCol = pal.g;
    const bodyH = 16 + lvl * 5;
    ctx.fillStyle = "rgba(20,20,26,0.3)";
    ctx.fillRect(x - 13, y + 14, 26, 4);
    ctx.fillStyle = INK;
    ctx.fillRect(x - 12, y - bodyH - 2, 24, bodyH + 18);
    ctx.fillStyle = "#8a8496";
    ctx.fillRect(x - 10, y - bodyH, 20, bodyH + 14);
    ctx.fillStyle = "#a29cb2";
    ctx.fillRect(x - 10, y - bodyH, 4, bodyH + 14);
    ctx.fillStyle = trim;
    ctx.fillRect(x - 10, y - bodyH, 20, 3);
    const pulse = Math.sin(time * 3 + t.id) > 0;
    for (let i = 0; i < lvl; i++) {
      ctx.fillStyle = pulse ? "#e8d47a" : "#c4a94a";
      ctx.fillRect(x - 2, y - 2 - i * 8, 4, 4);
    }
    // top platform where the mage stands
    ctx.fillStyle = INK;
    ctx.fillRect(x - 15, y - bodyH - 8, 30, 8);
    ctx.fillStyle = "#8a6238";
    ctx.fillRect(x - 13, y - bodyH - 6, 26, 5);
    ctx.fillStyle = trim;
    ctx.fillRect(x - 14, y - bodyH - 8, 3, 4);
    ctx.fillRect(x + 11, y - bodyH - 8, 3, 4);
    if (lvl >= 2 || t.branch) {
      ctx.fillStyle = "#b8a2d8";
      for (let i = 0; i < 6; i++) {
        const ang = time * 0.9 + (i / 6) * Math.PI * 2;
        ctx.fillRect(S(x + Math.cos(ang) * 16), S(y - bodyH / 2 + Math.sin(ang) * 5), CELL, CELL);
      }
    }
    // the little mage on top
    const flipped = Math.cos(t.lastAim) < 0;
    const my = y - bodyH - 18;
    drawSprite(ctx, MINI.wizard, pal, 0, x - 1, my, flipped);
    // orb above the staff, flares when casting
    const bob = S(Math.sin(time * 2.5 + t.id) * 2);
    const big = t.anim > 0.4 ? CELL : 0;
    const orbX = x + (flipped ? -9 : 9);
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(orbX, my - 12 + bob, 4 + big, 0, 7); ctx.fill();
    ctx.fillStyle = orbCol;
    ctx.beginPath(); ctx.arc(orbX, my - 12 + bob, 3 + big, 0, 7); ctx.fill();
    if (lvl >= 3 || t.branch) {
      ctx.fillStyle = orbCol;
      for (let i = 0; i < 3; i++) {
        const ang = time * 1.7 + i * 2.09 + t.id;
        const cx = S(x + Math.cos(ang) * 15);
        const cy = S(my - 4 + Math.sin(ang) * 5);
        ctx.fillRect(cx, cy - 2, CELL, CELL * 3);
        ctx.fillRect(cx - CELL, cy, CELL * 3, CELL);
      }
    }
  };

  const drawGarrison = (ctx, t, time) => {
    const x = S(t.x), y = S(t.y);
    const lvl = t.level;
    const paladin = t.branch === "a";
    const berserk = t.branch === "b";
    const bc = paladin ? "#d8b34a" : berserk ? "#a0473a" : "#a04a3f";
    const hw = 10 + lvl * 2;
    const wallH = 9 + lvl;
    const baseY = y + 14;
    ctx.fillStyle = "rgba(20,20,26,0.3)";
    ctx.fillRect(x - hw - 4, baseY, (hw + 4) * 2, 4);
    // palisade behind (Lv3+)
    if (lvl >= 3 || t.branch) {
      ctx.fillStyle = berserk ? "#4a3226" : "#6e4c28";
      for (let i = -3; i <= 3; i++) {
        const px = x + i * 7;
        const ph = 14 - Math.abs(i) * 2;
        ctx.fillRect(px - 2, baseY - wallH - 10 - ph, 4, ph + 6);
      }
    }
    // fence (Lv2+)
    if (lvl >= 2 || t.branch) {
      ctx.fillStyle = "#6e4c28";
      for (const side of [-1, 1]) {
        const fx = x + side * (hw + 9);
        ctx.fillRect(fx - 1, baseY - 10, 2, 10);
        ctx.fillRect(fx + side * 7 - 1, baseY - 8, 2, 8);
        ctx.fillRect(Math.min(fx, fx + side * 8) - 1, baseY - 7, 10, 2);
      }
    }
    // walls
    const wall = paladin ? "#d8d2be" : berserk ? "#6a4634" : "#9a7a52";
    const wallLt = paladin ? "#e8e0cc" : berserk ? "#7d5540" : "#ae8c60";
    ctx.fillStyle = INK;
    ctx.fillRect(x - hw - 2, baseY - wallH - 2, hw * 2 + 4, wallH + 2);
    ctx.fillStyle = wall;
    ctx.fillRect(x - hw, baseY - wallH, hw * 2, wallH);
    ctx.fillStyle = wallLt;
    ctx.fillRect(x - hw, baseY - wallH, 4, wallH);
    // pitched roof, stepped
    const roofCol = paladin ? "#d8b34a" : berserk ? "#48291f" : "#a0503c";
    const roofLt = paladin ? "#e8c968" : berserk ? "#5c3a2c" : "#b46450";
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const wRow = hw + 4 - Math.round(((i + 1) / rows) * (hw + 2));
      ctx.fillStyle = INK;
      ctx.fillRect(x - wRow - 2, baseY - wallH - 4 - i * 4, wRow * 2 + 4, 5);
    }
    for (let i = 0; i < rows; i++) {
      const wRow = hw + 3 - Math.round(((i + 1) / rows) * (hw + 2));
      if (wRow <= 0) break;
      ctx.fillStyle = i === 0 ? roofLt : roofCol;
      ctx.fillRect(x - wRow, baseY - wallH - 3 - i * 4, wRow * 2, 4);
    }
    // south-facing door (knights muster out of it)
    ctx.fillStyle = INK;
    ctx.fillRect(x - 4, baseY - wallH + 2, 8, wallH - 2);
    ctx.fillStyle = "#33291a";
    ctx.fillRect(x - 3, baseY - wallH + 3, 6, wallH - 3);
    // emblem
    ctx.fillStyle = bc;
    ctx.fillRect(x - hw + 3, baseY - wallH + 3, 5, 5);
    ctx.fillStyle = "#e0d6ba";
    ctx.fillRect(x - hw + 5, baseY - wallH + 5, 2, 2);
    // weapon rack (Lv2+)
    if (lvl >= 2 || t.branch) {
      const rx = x + hw + 6;
      ctx.fillStyle = "#c4c8d0";
      ctx.fillRect(rx - 3, baseY - 14, 2, 14);
      ctx.fillRect(rx + 1, baseY - 14, 2, 14);
      ctx.fillStyle = "#6e4c28";
      ctx.fillRect(rx - 5, baseY - 2, 10, 2);
    }
    // campfire (Lv3+)
    if (lvl >= 3 || t.branch) {
      const fx = S(x - hw - 10), fy = baseY - 4;
      ctx.fillStyle = "#5f4326";
      ctx.fillRect(fx - 5, fy + 1, 10, 2);
      const fl = Math.sin(time * 13 + t.id) > 0 ? 2 : 0;
      ctx.fillStyle = "#d8763a";
      ctx.fillRect(fx - 2, fy - 6 - fl, 4, 6 + fl);
      ctx.fillStyle = "#e8d47a";
      ctx.fillRect(fx - 1, fy - 3 - fl, 2, 3 + fl);
    }
    // banner at the roof peak
    const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
    const peakY = baseY - wallH - 3 - rows * 4;
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(x - 1, peakY - 14, 2, 14);
    ctx.fillStyle = bc;
    ctx.fillRect(x + 1, peakY - 14, 10 + wave, 3);
    ctx.fillRect(x + 1, peakY - 11, 7 + wave, 3);
    // rally flag
    if (t.rally) {
      const rx = S(t.rally.x), ry = S(t.rally.y);
      ctx.fillStyle = "#5f4326";
      ctx.fillRect(rx - 1, ry - 10, 2, 14);
      ctx.fillStyle = bc;
      ctx.fillRect(rx + 1, ry - 10, 7, 3);
      ctx.fillRect(rx + 1, ry - 7, 5, 2);
    }
  };

  const drawSupportTower = (ctx, t, time) => {
    const x = S(t.x), y = S(t.y);
    const lvl = t.level;
    const key = t.branch || "base";
    const pal = PRIEST_PALS[key];
    const st = getStats(t);
    const auraCol = key === "a" ? "140,224,140" : key === "b" ? "124,212,212" : key === "c" ? "216,179,74" : "224,214,186";
    const pr = ((time * 34 + t.id * 40) % st.range);
    ctx.strokeStyle = `rgba(${auraCol},${0.4 * (1 - pr / st.range)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke();
    ctx.strokeStyle = `rgba(${auraCol},0.16)`;
    ctx.beginPath(); ctx.arc(x, y, st.range, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(20,20,26,0.3)";
    ctx.fillRect(x - 13, y + 14, 26, 4);
    // stone altar platform (grows with level)
    const pw = 8 + lvl * 2;
    ctx.fillStyle = INK;
    ctx.fillRect(x - pw - 4, y + 4, (pw + 4) * 2, 12);
    ctx.fillStyle = "#948c80";
    ctx.fillRect(x - pw - 3, y + 6, (pw + 3) * 2, 8);
    ctx.fillStyle = INK;
    ctx.fillRect(x - pw - 1, y - 2, (pw + 1) * 2, 8);
    ctx.fillStyle = "#a8a094";
    ctx.fillRect(x - pw, y, pw * 2, 6);
    ctx.fillStyle = "#bcb4a6";
    ctx.fillRect(x - pw, y, 4, 6);
    // pillars + candles (Lv2+)
    if (lvl >= 2 || t.branch) {
      for (const side of [-1, 1]) {
        const px = x + side * (pw + 6);
        ctx.fillStyle = INK; ctx.fillRect(px - 3, y - 14, 6, 22);
        ctx.fillStyle = "#948c80"; ctx.fillRect(px - 2, y - 12, 4, 18);
        ctx.fillStyle = "#bcb4a6"; ctx.fillRect(px - 3, y - 15, 6, 3);
        const fl = Math.sin(time * 12 + side + t.id) > 0 ? CELL : 0;
        ctx.fillStyle = "#e8d47a";
        ctx.fillRect(px - 1, y - 19 - fl, 2, 3 + fl);
      }
    }
    // battle standard: banner pole behind the priest
    if (key === "c") {
      const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
      ctx.fillStyle = "#5f4326";
      ctx.fillRect(x + 8, y - 42, 2, 42);
      ctx.fillStyle = "#a0473a";
      ctx.fillRect(x + 10, y - 42, 13 + wave, 5);
      ctx.fillRect(x + 10, y - 37, 9 + wave, 4);
      ctx.fillStyle = "#d8b34a";
      ctx.fillRect(x + 11, y - 41, 5, 2);
    }
    // chronomancer: floating hourglass
    if (key === "b") {
      const hy = S(y - 34 + Math.sin(time * 2.5 + t.id) * 3);
      ctx.fillStyle = "#7cd4d4";
      ctx.fillRect(x + 9, hy, 6, 2);
      ctx.fillRect(x + 10, hy + 2, 4, 2);
      ctx.fillRect(x + 11, hy + 4, 2, 2);
      ctx.fillRect(x + 10, hy + 6, 4, 2);
      ctx.fillRect(x + 9, hy + 8, 6, 2);
    }
    // the priest, raising arms to cast blessings
    const raising = ((time * 0.9 + t.id * 0.7) % 1.6) < 0.55;
    drawSprite(ctx, MINI.priest, pal, raising ? 1 : 0, x, y - 14, false);
    // halo (Lv3+)
    if (lvl >= 3 || t.branch) {
      ctx.fillStyle = key === "a" ? "#bee8b0" : key === "b" ? "#c8ecec" : "#e8d47a";
      const hy = S(y - 30 + Math.sin(time * 2 + t.id) * 2);
      ctx.fillRect(x - 7, hy, 14, 2);
    }
    // blessings drifting down inside the aura
    ctx.fillStyle = `rgba(${auraCol},0.95)`;
    for (let i = 0; i < 3; i++) {
      const fall = ((time * 22 + i * 15 + t.id * 5) % 40);
      const bx = x + (i === 0 ? -14 : i === 1 ? 15 : -2) + Math.round(Math.sin(time * 2 + i) * 3);
      const by = y - 34 + fall;
      ctx.fillRect(S(bx) - CELL, S(by), CELL * 3, CELL);
      ctx.fillRect(S(bx), S(by) - CELL, CELL, CELL * 3);
    }
  };

  const drawTree = (ctx, d, time) => {
    const x = S(d.x), y = S(d.y);
    const s = d.s;
    ctx.fillStyle = "rgba(20,20,26,0.3)";
    ctx.fillRect(x - S(10 * s), y + 14, S(20 * s), 4);
    if (d.t === "pine") {
      ctx.fillStyle = "#5f4326";
      ctx.fillRect(x - 2, y + 8, 4, 8);
      ctx.fillStyle = INK;
      for (let i = 0; i < 3; i++) {
        const wRow = S((13 - i * 3) * s);
        ctx.fillRect(x - wRow - 1, y + 8 - (i + 1) * S(9 * s), wRow * 2 + 2, S(9 * s) + 2);
      }
      const greens = ["#4a6a3e", "#557a46", "#628a50"];
      for (let i = 0; i < 3; i++) {
        const wRow = S((12 - i * 3) * s);
        ctx.fillStyle = greens[i];
        ctx.fillRect(x - wRow, y + 7 - (i + 1) * S(9 * s), wRow * 2, S(9 * s));
      }
    } else if (d.t === "tree") {
      ctx.fillStyle = "#5f4326";
      ctx.fillRect(x - 2, y + 2, 5, 14);
      ctx.fillStyle = INK;
      ctx.fillRect(x - S(11 * s) - 1, y - S(16 * s) - 1, S(22 * s) + 2, S(16 * s) + 2);
      ctx.fillStyle = "#557a46";
      ctx.fillRect(x - S(11 * s), y - S(16 * s), S(22 * s), S(16 * s));
      ctx.fillStyle = "#628a50";
      ctx.fillRect(x - S(11 * s), y - S(16 * s), S(9 * s), S(7 * s));
    } else {
      // rounded pixel boulder: stacked dome rows
      const rows = [[10, 0], [9, 1], [8, 2], [6, 3], [4, 4]];
      ctx.fillStyle = INK;
      for (const [wr, i] of rows) {
        const wRow = S(wr * s);
        ctx.fillRect(x - wRow - 2, y + 8 - (i + 1) * 5, wRow * 2 + 4, 7);
      }
      for (const [wr, i] of rows) {
        const wRow = S(wr * s);
        ctx.fillStyle = i >= 3 ? "#a2a2aa" : "#8a8a92";
        ctx.fillRect(x - wRow, y + 8 - (i + 1) * 5, wRow * 2, 5);
      }
      ctx.fillStyle = "#b8b8c0";
      ctx.fillRect(x - S(5 * s), y - 10, S(4 * s), 4);
      ctx.fillStyle = "#8a8a92";
      ctx.fillRect(x + S(11 * s), y + 6, 5, 4);
    }
  };

  const drawCastle = (ctx, time, hpPct) => {
    const [ex, ey] = PTS[PTS.length - 1];
    const x = S(ex + 6), y = S(ey);
    ctx.fillStyle = INK;
    ctx.fillRect(x - 37, y - 42, 74, 70);
    ctx.fillStyle = "#8a8474";
    ctx.fillRect(x - 24, y - 34, 48, 60);
    ctx.fillStyle = "#9b9584";
    ctx.fillRect(x - 24, y - 34, 20, 60);
    ctx.fillStyle = "#767061";
    for (let i = 0; i < 5; i++) {
      if (hpPct < 0.5 && i === 1) { ctx.fillRect(x - 24 + i * 11, y - 36, 7, 4); continue; }
      if (hpPct < 0.25 && i === 3) continue;
      ctx.fillRect(x - 24 + i * 11, y - 40, 7, 8);
    }
    ctx.fillStyle = "#7d7768";
    ctx.fillRect(x - 34, y - 26, 12, 52);
    ctx.fillRect(x + 22, y - 26, 12, 52);
    ctx.fillStyle = "#5f5a4d";
    for (let i = 0; i < 4; i++) {
      const wRow = 8 - i * 2;
      ctx.fillRect(x - 28 - wRow, y - 28 - i * 4, wRow * 2, 4);
      ctx.fillRect(x + 28 - wRow, y - 28 - i * 4, wRow * 2, 4);
    }
    if (hpPct < 0.75) {
      ctx.fillStyle = "#3a352c";
      ctx.fillRect(x - 14, y - 30, 2, 8); ctx.fillRect(x - 12, y - 22, 2, 6); ctx.fillRect(x - 15, y - 16, 2, 6);
      ctx.fillRect(x + 12, y - 6, 2, 8); ctx.fillRect(x + 9, y + 2, 2, 8);
    }
    if (hpPct < 0.5) {
      ctx.fillStyle = "#3a352c";
      ctx.fillRect(x + 4, y - 32, 2, 12); ctx.fillRect(x + 1, y - 20, 2, 10); ctx.fillRect(x + 5, y - 10, 2, 12);
      ctx.fillStyle = "#6a6456";
      ctx.fillRect(x - 22, y + 22, 6, 4); ctx.fillRect(x + 15, y + 23, 5, 3);
    }
    ctx.fillStyle = "#4a3a24";
    ctx.fillRect(x - 10, y - 2, 20, 28);
    ctx.fillRect(x - 8, y - 6, 16, 4);
    ctx.fillRect(x - 5, y - 9, 10, 3);
    ctx.fillStyle = "#33291a";
    for (let i = -6; i <= 6; i += 4) ctx.fillRect(x + i, y - 4, 2, 30);
    if (hpPct < 0.5) {
      for (let i = 0; i < 2; i++) {
        const prog = ((time * 22 + i * 18) % 36) / 36;
        ctx.fillStyle = `rgba(110,108,104,${(1 - prog) * 0.5})`;
        const smx = S(x - 6 + i * 14 + Math.sin(time * 2 + i * 3) * 3);
        ctx.beginPath(); ctx.arc(smx, S(y - 44 - prog * 26), 4 + prog * 4, 0, 7); ctx.fill();
      }
    }
    if (hpPct < 0.25) {
      for (let i = 0; i < 2; i++) {
        const fx = x - 10 + i * 20;
        const fl = Math.sin(time * 14 + i * 2) > 0 ? 4 : 0;
        ctx.fillStyle = "#d8763a";
        ctx.fillRect(fx - 3, y - 40 - fl, 6, 8 + fl);
        ctx.fillStyle = "#e8d47a";
        ctx.fillRect(fx - 1, y - 36 - fl, 2, 4 + fl);
      }
    }
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(x - 1, y - 58, 2, 18);
    if (hpPct >= 0.25) {
      const wave = Math.round(Math.sin(time * 5)) * CELL;
      ctx.fillStyle = "#d8b34a";
      if (hpPct < 0.5) {
        ctx.fillRect(x - 9 - wave, y - 58, 9, 3);
        ctx.fillRect(x - 6 - wave, y - 53, 6, 3);
      } else {
        ctx.fillRect(x - 14 - wave, y - 58, 14, 4);
        ctx.fillRect(x - 10 - wave, y - 54, 10, 4);
      }
    }
  };

  const drawCave = (ctx, time) => {
    const [psx, psy] = PTS[0];
    const sx = S(psx), sy = S(psy);
    ctx.fillStyle = "rgba(20,20,26,0.3)";
    ctx.fillRect(sx - 36, sy + 24, 72, 4);
    ctx.fillStyle = INK;
    for (let i = 0; i < 8; i++) {
      const wRow = 38 - i * 4;
      ctx.fillRect(sx - wRow - 1, sy + 26 - (i + 1) * 7, wRow * 2 + 2, 8);
    }
    for (let i = 0; i < 8; i++) {
      const wRow = 36 - i * 4;
      if (wRow <= 0) break;
      ctx.fillStyle = i > 4 ? "#4f6340" : "#6a6152";
      ctx.fillRect(sx - wRow, sy + 26 - (i + 1) * 7, wRow * 2, 7);
    }
    ctx.fillStyle = "#7a7264";
    ctx.fillRect(sx - 30, sy + 4, 10, 8);
    ctx.fillRect(sx + 20, sy - 2, 8, 8);
    ctx.fillStyle = "#14100c";
    for (let i = 0; i < 6; i++) {
      const wRow = 17 - i * 2;
      ctx.fillRect(sx - wRow, sy + 26 - (i + 1) * 7, wRow * 2, 8);
    }
    ctx.fillStyle = "#8a8272";
    const rim = [[-19, 4], [-17, -6], [-9, -13], [1, -16], [10, -12], [17, -5], [19, 4]];
    for (const [rx, ry] of rim) ctx.fillRect(S(sx + rx) - 3, S(sy + ry) - 2, 7, 5);
    if (Math.sin(time * 1.1) > -0.8) {
      ctx.fillStyle = Math.sin(time * 5) > 0 ? "#e05248" : "#a03a32";
      ctx.fillRect(sx - 6, sy, 3, 3);
      ctx.fillRect(sx + 4, sy, 3, 3);
    }
    ctx.fillStyle = "#e0d6ba";
    ctx.fillRect(sx - 26, sy + 20, 8, 2);
    ctx.fillRect(sx + 19, sy + 22, 8, 2);
    ctx.fillRect(sx + 21, sy + 25, 4, 4);
  };

  // ============ RENDER ============
  const draw = (g) => {
    const cv = canvasRef.current;
    if (!cv) return;
    let buf = bufRef.current;
    if (!buf) {
      buf = document.createElement("canvas");
      buf.width = W / 2; buf.height = H / 2;
      bufRef.current = buf;
    }
    const ctx = buf.getContext("2d");
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W / 2, H / 2);
    ctx.scale(0.5, 0.5);
    if (g.shake > 0) ctx.translate(S((Math.random() - 0.5) * g.shake), S((Math.random() - 0.5) * g.shake));
    ctx.scale(g.cam.zoom, g.cam.zoom);
    ctx.translate(-g.cam.x, -g.cam.y);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    ctx.fillStyle = GRASS;
    ctx.fillRect(0, 0, W, H);
    for (const p of GRASS_PATCHES) {
      ctx.fillStyle = p.s > 0.5 ? GRASS_LT : GRASS_DK;
      ctx.fillRect(S(p.x - p.r), S(p.y - p.r * 0.6), S(p.r * 2), S(p.r * 1.2));
    }
    ctx.fillStyle = GRASS_DK;
    for (const tf of TUFTS) {
      const sway = Math.sin(g.time * 1.8 + tf.p) > 0 ? CELL : 0;
      ctx.fillRect(S(tf.x) + sway, S(tf.y - 5 * tf.s), CELL, S(5 * tf.s));
      ctx.fillRect(S(tf.x) + CELL * 2 + sway, S(tf.y - 4 * tf.s), CELL, S(4 * tf.s));
    }
    // wildflowers
    for (const f of FLOWERS) {
      const sway = Math.sin(g.time * 1.5 + f.p) > 0 ? CELL : 0;
      ctx.fillStyle = GRASS_DK;
      ctx.fillRect(S(f.x) + 1, S(f.y) + 2, CELL, CELL * 2);
      ctx.fillStyle = f.c;
      ctx.fillRect(S(f.x) + sway, S(f.y) - 2, CELL * 2, CELL * 2);
      ctx.fillStyle = "#e8d47a";
      ctx.fillRect(S(f.x) + sway + 1, S(f.y) - 1, 2, 2);
    }

    const strokePath = (width, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(PTS[0][0], PTS[0][1]);
      for (let i = 1; i < PTS.length; i++) ctx.lineTo(PTS[i][0], PTS[i][1]);
      ctx.stroke();
    };
    strokePath(PATH_HALF * 2 + 10, PATH_EDGE);
    strokePath(PATH_HALF * 2 + 4, PATH_DK);
    strokePath(PATH_HALF * 2 - 4, PATH_MAIN);
    ctx.lineWidth = 1;
    for (const pb of PEBBLES) {
      ctx.fillStyle = pb.s > 0.6 ? PATH_DK : "#d2ba8e";
      ctx.fillRect(S(pb.x), S(pb.y), S(pb.r * 2) || CELL, S(pb.r * 1.4) || CELL);
    }
    for (const ch of CHEVRONS) {
      const on = Math.sin(g.time * 2.2 - ch.d * 0.045) > 0;
      ctx.save();
      ctx.translate(S(ch.x), S(ch.y));
      ctx.rotate(Math.round(ch.a / (Math.PI / 2)) * (Math.PI / 2));
      ctx.fillStyle = on ? "rgba(60,46,28,0.55)" : "rgba(60,46,28,0.28)";
      ctx.fillRect(-4, -6, 3, 3); ctx.fillRect(-1, -3, 3, 3); ctx.fillRect(2, 0, 3, 3);
      ctx.fillRect(-1, 3, 3, 3); ctx.fillRect(-4, 6, 3, 3);
      ctx.restore();
    }

    drawCave(ctx, g.time);

    const [lsx, lsy] = PTS[0];
    const bounce = Math.sin(g.time * 4) > 0 ? CELL : 0;
    ctx.fillStyle = "#e07a72";
    ctx.font = "bold 11px monospace";
    ctx.fillText("THEY COME", S(lsx), S(lsy) - 48);
    ctx.fillRect(S(lsx) - 5, S(lsy) - 42 + bounce, 10, 3);
    ctx.fillRect(S(lsx) - 2, S(lsy) - 39 + bounce, 4, 4);

    if (g.buildMode && g.hover) {
      const [hx, hy] = g.hover;
      const ok = buildableAt(g, hx, hy) && g.gold >= TOWERS[g.buildMode].cost;
      const radius = g.buildMode === "knight" ? RALLY_RANGE : TOWERS[g.buildMode].levels[0].range;
      ctx.fillStyle = ok ? "rgba(140,224,140,0.25)" : "rgba(224,110,100,0.28)";
      ctx.fillRect(S(hx) - 20, S(hy) - 20, 40, 40);
      ctx.strokeStyle = ok ? "rgba(140,224,140,0.6)" : "rgba(224,110,100,0.6)";
      ctx.beginPath(); ctx.arc(S(hx), S(hy), radius, 0, 7); ctx.stroke();
    }

    const sel = g.towers.find((t) => t.id === g.selectedId);
    if (sel) {
      const st = getStats(sel);
      const radius = sel.kind === "knight" ? RALLY_RANGE : st.range;
      ctx.fillStyle = "rgba(216,179,74,0.1)";
      ctx.strokeStyle = "rgba(216,179,74,0.6)";
      ctx.beginPath(); ctx.arc(S(sel.x), S(sel.y), radius, 0, 7); ctx.fill(); ctx.stroke();
    }

    const drawables = [];
    for (const d of DECOR) drawables.push({ y: d.y + 14, fn: () => drawTree(ctx, d, g.time) });
    for (const t of g.towers) {
      drawables.push({
        y: t.y + 14,
        fn: () => {
          if (t.kind === "archer") drawArcherTower(ctx, t, g.time);
          else if (t.kind === "wizard") drawWizardSpire(ctx, t, g.time);
          else if (t.kind === "support") drawSupportTower(ctx, t, g.time);
          else drawGarrison(ctx, t, g.time);
          if (!t.branch) {
            ctx.fillStyle = "#e8d47a";
            for (let i = 0; i < t.level; i++) ctx.fillRect(S(t.x) - 10 + i * 10, S(t.y) + 20, 4, 4);
          } else {
            ctx.fillStyle = "#e8d47a";
            ctx.fillRect(S(t.x) - 2, S(t.y) + 19, 4, 4);
            ctx.fillRect(S(t.x) - 4, S(t.y) + 21, 8, 2);
          }
        },
      });
      if (t.units) for (const u of t.units) drawables.push({ y: u.y + 9, fn: () => drawKnightUnit(ctx, u, t, g.time) });
    }
    const tms = g.time * 1000;
    for (const e of g.enemies) {
      if (!e.dead) drawables.push({ y: e.y + 10, fn: () => drawEnemy(ctx, e, g.time, tms) });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();

    drawCastle(ctx, g.time, Math.max(0, g.lives) / CASTLE_HP);

    for (const p of g.projectiles) {
      if (p.delay > 0) continue;
      if (p.kind === "arrow") {
        ctx.fillStyle = p.pierce ? "#e8d47a" : "#d2c6a2";
        const dx = Math.cos(p.angle || 0), dy = Math.sin(p.angle || 0);
        for (let i = -2; i <= 2; i++) ctx.fillRect(S(p.x + dx * i * 3), S(p.y + dy * i * 3), CELL, CELL);
      } else {
        const col = p.burn ? "#d8763a" : p.slow ? "#9fd4e8" : "#b08ad8";
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(S(p.x), S(p.y), 5, 0, 7); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(S(p.x), S(p.y), 3.5, 0, 7); ctx.fill();
      }
    }

    for (const fx of g.effects) {
      const a = Math.min(1, fx.ttl / 300);
      if (fx.type === "boom" || fx.type === "frost" || fx.type === "arcane") {
        // round magic, as it should be
        const col = fx.type === "boom" ? "216,118,58" : fx.type === "frost" ? "159,212,232" : "176,138,216";
        const r = fx.r * (1 - a * 0.3);
        ctx.fillStyle = `rgba(${col},${a * 0.35})`;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(${col},${a * 0.85})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
        ctx.lineWidth = 1;
      } else if (fx.type === "coin") {
        ctx.fillStyle = `rgba(232,212,122,${a})`;
        ctx.font = fx.big ? "bold 16px monospace" : "bold 12px monospace";
        ctx.fillText(fx.text, fx.x, fx.y - (700 - fx.ttl) * 0.02);
      } else if (fx.type === "poof") {
        ctx.fillStyle = `rgba(220,218,210,${a * 0.7})`;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 12 * (1 - a) + 4, 0, 7); ctx.fill();
      } else if (fx.type === "hit") {
        ctx.fillStyle = `rgba(224,110,100,${a})`;
        ctx.fillRect(S(fx.x) - 2, S(fx.y) - 2, 4, 4);
      } else if (fx.type === "spark") {
        ctx.fillStyle = fx.gold ? `rgba(232,212,122,${a})` : `rgba(240,240,240,${a})`;
        for (let i = 0; i < 4; i++) {
          const ang = i * 1.57 + 0.4;
          ctx.fillRect(S(fx.x + Math.cos(ang) * 6), S(fx.y + Math.sin(ang) * 6), CELL, CELL);
        }
      } else if (fx.type === "burst") {
        const prog = 1 - fx.ttl / fx.life;
        ctx.fillStyle = fx.gold ? `rgba(232,196,90,${1 - prog})` : `rgba(150,224,150,${1 - prog})`;
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2 + (fx.gold ? prog * 1.6 : 0);
          const r = prog * (fx.gold ? 44 : 30);
          ctx.fillRect(S(fx.x + Math.cos(ang) * r), S(fx.y + Math.sin(ang) * r * 0.75 - prog * 8), CELL, CELL);
        }
      } else if (fx.type === "flash") {
        const fa = fx.ttl / 450;
        ctx.fillStyle = `rgba(244,240,224,${fa * 0.5})`;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 34 * (1.4 - fa), 0, 7); ctx.fill();
      } else if (fx.type === "levelup" || fx.type === "evolve") {
        ctx.strokeStyle = fx.type === "evolve" ? `rgba(232,196,90,${a})` : `rgba(150,224,150,${a})`;
        ctx.lineWidth = 3;
        const r = (1 - fx.ttl / (fx.type === "evolve" ? 900 : 600)) * 34 + 10;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.stroke();
        ctx.lineWidth = 1;
      } else if (fx.type === "leak") {
        ctx.fillStyle = `rgba(224,90,80,${a})`;
        ctx.font = "bold 18px monospace";
        ctx.fillText(fx.text || "-1", fx.x, fx.y - 14 - (700 - fx.ttl) * 0.02);
      } else if (fx.type === "pierce") {
        ctx.fillStyle = `rgba(232,212,122,${a * 0.7})`;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 8, 0, 7); ctx.fill();
      }
    }
    ctx.restore();

    const sc = cv.getContext("2d");
    sc.imageSmoothingEnabled = false;
    sc.clearRect(0, 0, W, H);
    sc.drawImage(buf, 0, 0, W, H);

    if (g.paused && g.phase !== "won" && g.phase !== "lost") {
      sc.fillStyle = "rgba(16,14,20,0.5)";
      sc.fillRect(0, 0, W, H);
      sc.fillStyle = "#e8d47a";
      sc.font = "bold 24px monospace";
      sc.textAlign = "center"; sc.textBaseline = "middle";
      sc.fillText("* PAUSED *", W / 2, H / 2);
    }
  };

  // ---- input ----
  const dragRef = useRef({ down: false, panned: false, sx: 0, sy: 0, cx: 0, cy: 0 });

  const screenPos = (ev) => {
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    return [((ev.clientX - rect.left) / rect.width) * W, ((ev.clientY - rect.top) / rect.height) * H];
  };
  const worldPos = (ev) => {
    const g = G.current;
    const [px, py] = screenPos(ev);
    if (!g) return [px, py];
    return [g.cam.x + px / g.cam.zoom, g.cam.y + py / g.cam.zoom];
  };
  const clampCam = (g) => {
    const z = g.cam.zoom;
    g.cam.x = Math.min(Math.max(0, g.cam.x), W - W / z);
    g.cam.y = Math.min(Math.max(0, g.cam.y), H - H / z);
  };
  const setZoom = (nz) => {
    const g = G.current;
    if (!g) return;
    const z0 = g.cam.zoom;
    const z = Math.min(2.5, Math.max(1, nz));
    const wx = g.cam.x + (W / 2) / z0, wy = g.cam.y + (H / 2) / z0;
    g.cam.zoom = z;
    g.cam.x = wx - (W / 2) / z;
    g.cam.y = wy - (H / 2) / z;
    clampCam(g);
  };
  const handleTap = (x, y) => {
    const g = G.current;
    if (!g || g.phase === "won" || g.phase === "lost" || g.paused) return;
    if (g.buildMode) { placeTower(g, g.buildMode, x, y); return; }
    const t = towerNear(g, x, y);
    if (t) { g.selectedId = t.id; return; }
    // selected garrison: click inside its circle to move the rally flag
    const selT = g.towers.find((tt) => tt.id === g.selectedId);
    if (selT && selT.kind === "knight") {
      if (Math.hypot(x - selT.x, y - selT.y) <= RALLY_RANGE) {
        selT.rally = { x, y };
        g.effects.push({ type: "levelup", x, y, ttl: 500 });
        return;
      }
    }
    g.selectedId = null;
  };
  const onCanvasDown = (ev) => {
    const g = G.current;
    if (!g) return;
    const [px, py] = screenPos(ev);
    dragRef.current = { down: true, panned: false, sx: px, sy: py, cx: g.cam.x, cy: g.cam.y };
  };
  const onCanvasMove = (ev) => {
    const g = G.current;
    if (!g) return;
    g.hover = worldPos(ev);
    const d = dragRef.current;
    if (d.down && g.cam.zoom > 1) {
      const [px, py] = screenPos(ev);
      if (d.panned || Math.hypot(px - d.sx, py - d.sy) > 6) {
        d.panned = true;
        g.cam.x = d.cx - (px - d.sx) / g.cam.zoom;
        g.cam.y = d.cy - (py - d.sy) / g.cam.zoom;
        clampCam(g);
      }
    }
  };
  const onCanvasUp = (ev) => {
    const d = dragRef.current;
    if (d.down && !d.panned) {
      const [x, y] = worldPos(ev);
      handleTap(x, y);
    }
    d.down = false;
  };

  const sel = ui.selected;
  const selDef = sel ? TOWERS[sel.kind] : null;

  const FONT = "Verdana, Geneva, sans-serif";
  const btn = {
    fontFamily: FONT, cursor: "pointer", border: "2px solid #10131a",
    background: "#3a4150", color: "#e8e0c8", borderRadius: 0,
    padding: "8px 10px", fontSize: 12, textAlign: "left",
    boxShadow: "inset -2px -2px 0 #262b36, inset 2px 2px 0 #545c6e",
  };
  const panel = {
    background: "#2c313c", border: "3px solid #10131a", borderRadius: 0, padding: 10,
    boxShadow: "inset 0 0 0 2px #454c5a",
  };
  const disabled = { opacity: 0.45, cursor: "not-allowed" };
  const statLabel = { fontSize: 9, letterSpacing: 1, opacity: 0.6, marginRight: 3 };

  return (
    <div style={{ minHeight: "100vh", background: "#20242c", color: "#e8e0c8", fontFamily: FONT, padding: 12, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <button aria-label="Open settings menu" onClick={() => setMenuOpen(true)}
            style={{ ...btn, fontSize: 16, padding: "4px 12px", lineHeight: 1 }}>☰</button>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 4, color: "#d8b34a", textShadow: "2px 2px 0 #10131a" }}>CROWNGUARD</h1>
          <span style={{ fontSize: 11, opacity: 0.7 }}>Hold the road. The castle must not fall.</span>
        </div>

        {menuOpen && (
          <div onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(12,12,16,0.6)", zIndex: 40 }} />
        )}
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 300, maxWidth: "85vw", zIndex: 50,
          background: "#2c313c", borderRight: "3px solid #10131a", padding: 16, boxSizing: "border-box",
          overflowY: "auto", transform: menuOpen ? "translateX(0)" : "translateX(-105%)",
          transition: "transform 0.25s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, letterSpacing: 3, color: "#d8b34a" }}>SETTINGS</div>
            <button aria-label="Close settings menu" onClick={() => setMenuOpen(false)} style={{ ...btn, padding: "2px 10px", fontSize: 13 }}>✕</button>
          </div>

          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.7, marginBottom: 6 }}>GAME SPEED</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[1, 2, 4].map((s) => (
              <button key={s}
                style={{ ...btn, flex: 1, textAlign: "center", ...(ui.speed === s ? { background: "#5a4f2c", boxShadow: "inset 2px 2px 0 #3a3420, inset -2px -2px 0 #7a6a3c" } : {}) }}
                onClick={() => { if (G.current) G.current.speed = s; }}>
                {s}x
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            <button style={{ ...btn, textAlign: "center" }}
              onClick={() => { if (G.current) G.current.paused = !G.current.paused; }}>
              {ui.paused ? "Resume" : "Pause"}
            </button>
            <button style={{ ...btn, textAlign: "center", ...(ui.canRestart ? {} : disabled) }} disabled={!ui.canRestart}
              onClick={() => { restartWave(); setMenuOpen(false); }}>
              Restart Wave
            </button>
            <button style={{ ...btn, textAlign: "center" }}
              onClick={() => { initGame(); setMenuOpen(false); }}>
              New Campaign
            </button>
          </div>

          <div style={{ borderTop: "2px solid #10131a", paddingTop: 12, fontSize: 11, lineHeight: 1.65, opacity: 0.9 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.8, marginBottom: 6 }}>FIELD GUIDE</div>
            <b>Knights</b> march out and each pin one enemy in melee — the rest push past. Fallen knights respawn in 7s. Knights muster just south of their hall; select the hall and click inside its circle to move the rally flag.<br /><br />
            <b>Warden Priests</b> slow every enemy in their aura. Their paths: mend knights, deepen the slow, or raise a Battle Standard so knights strike 50% harder.<br /><br />
            <b>Ironclads</b> (shield badge) shrug off half of all physical damage — magic ignores armor.<br /><br />
            <b>Dire wolves</b> are fast; blocking, slows, and stuns tame them.<br /><br />
            <b>Trolls</b> regenerate and hit knights hard — burst them down.<br /><br />
            The <b>dragon</b> flies — knights cannot block it.<br /><br />
            <b>The castle has 20 HP</b>, carried between waves. Goblins &amp; wolves cost 1, orcs &amp; ironclads 2, trolls 3, the dragon 5. It cracks, smokes, and burns as it weakens.<br /><br />
            Towers reach Lv 3, then <b>evolve down one of several paths</b>.<br /><br />
            After a wave, the next <b>auto-starts in 30s</b>. Sound the horn early for bonus gold.<br /><br />
            <b>Zoom</b> with the -/+ buttons; drag the map to pan while zoomed.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ position: "relative", flex: "1 1 560px", minWidth: 320 }}>
            <div style={{ display: "flex", gap: 14, padding: "6px 10px", background: "#2c313c", border: "3px solid #10131a", borderBottom: "none", fontSize: 13, flexWrap: "wrap", alignItems: "center", boxShadow: "inset 0 0 0 2px #454c5a" }}>
              <span><span style={statLabel}>GOLD</span><b style={{ color: "#e8d47a" }}>{ui.gold}</b></span>
              <span><span style={statLabel}>CASTLE</span><b style={{ color: ui.lives <= 5 ? "#e07a72" : ui.lives <= 10 ? "#d8b34a" : "#e8e0c8" }}>{ui.lives}</b><span style={{ opacity: 0.6 }}>/{CASTLE_HP}</span></span>
              <span><span style={statLabel}>WAVE</span><b>{ui.wave}</b><span style={{ opacity: 0.6 }}>/{WAVES.length}</span></span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button title="Zoom out" style={{ ...btn, padding: "2px 9px", fontSize: 12 }} onClick={() => setZoom((G.current?.cam.zoom || 1) / 1.3)}>-</button>
                <button title="Zoom in" style={{ ...btn, padding: "2px 9px", fontSize: 12 }} onClick={() => setZoom((G.current?.cam.zoom || 1) * 1.3)}>+</button>
                {ui.zoom > 1 && <button title="Reset view" style={{ ...btn, padding: "2px 9px", fontSize: 11 }} onClick={() => setZoom(1)}>reset</button>}
                <button title={ui.paused ? "Resume" : "Pause"} style={{ ...btn, padding: "2px 10px", fontSize: 11, ...(ui.paused ? { background: "#5a4f2c" } : {}) }}
                  onClick={() => { if (G.current) G.current.paused = !G.current.paused; }}>
                  {ui.paused ? "resume" : "pause"}
                </button>
                <button style={{ ...btn, padding: "2px 10px", fontSize: 11, ...(ui.speed > 1 ? { background: "#5a4f2c" } : {}) }}
                  onClick={() => { if (G.current) G.current.speed = G.current.speed === 1 ? 2 : G.current.speed === 2 ? 4 : 1; }}>
                  {ui.speed}x
                </button>
              </span>
            </div>
            <canvas
              ref={canvasRef} width={W} height={H}
              onMouseDown={onCanvasDown} onMouseMove={onCanvasMove} onMouseUp={onCanvasUp}
              onMouseLeave={() => { if (G.current) G.current.hover = null; dragRef.current.down = false; }}
              style={{ width: "100%", display: "block", border: "3px solid #10131a", background: GRASS, cursor: ui.buildMode ? "copy" : ui.zoom > 1 ? "grab" : "pointer", touchAction: "none", imageRendering: "pixelated" }}
            />
            {(ui.result === "won" || ui.result === "lost") && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(12,12,16,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
                <div style={{ fontSize: 20, letterSpacing: 3, color: ui.result === "won" ? "#e8d47a" : "#e07a72", textShadow: "2px 2px 0 #10131a" }}>
                  {ui.result === "won" ? "THE REALM STANDS" : "THE CASTLE HAS FALLEN"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, maxWidth: 340 }}>
                  {ui.result === "won"
                    ? "The dragon is slain and the road is quiet. A victory earned — not bought."
                    : `You fell on wave ${ui.wave}. Retry the wave with your gold and towers restored, or start fresh.`}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {ui.result === "lost" && ui.canRestart && (
                    <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center", background: "#5a4f2c" }} onClick={restartWave}>Retry Wave {ui.wave}</button>
                  )}
                  <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center" }} onClick={initGame}>New Campaign</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: "1 1 520px", minWidth: 300, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 240px", minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...btn, flex: 1, fontSize: 13, textAlign: "center", padding: "12px 8px", ...(ui.phase === "build" && ui.wave < WAVES.length ? { background: "#5a4f2c" } : {}), ...(ui.phase !== "build" ? disabled : {}) }}
                onClick={startWave} disabled={ui.phase !== "build"}>
                {ui.phase === "combat" ? `Wave ${ui.wave} in progress...`
                  : ui.wave >= WAVES.length ? "Campaign complete"
                  : ui.cdSec != null ? (<>Start Wave {ui.wave + 1} <span style={{ color: "#e8d47a" }}>+{Math.min(45, Math.ceil(ui.cdSec * 1.5))}g</span><div style={{ fontSize: 10, opacity: 0.75 }}>auto-starts in {ui.cdSec}s</div></>)
                  : `Start Wave ${ui.wave + 1}`}
              </button>
              <button
                title="Restart the current/last wave with gold, castle HP, and towers restored to how they were when it began"
                style={{ ...btn, fontSize: 11, textAlign: "center", ...(ui.canRestart ? {} : disabled) }}
                onClick={restartWave} disabled={!ui.canRestart}>
                Restart<br />Wave
              </button>
            </div>

            <div style={panel}>
              <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.7, marginBottom: 8 }}>RAISE DEFENSES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(TOWERS).map(([key, def]) => {
                  const can = ui.gold >= def.cost;
                  const active = ui.buildMode === key;
                  return (
                    <button key={key}
                      style={{ ...btn, display: "flex", gap: 8, alignItems: "center", ...(active ? { background: "#5a4f2c" } : {}), ...(!can ? disabled : {}) }}
                      onClick={() => { const gg = G.current; if (!gg) return; gg.buildMode = active ? null : key; gg.selectedId = null; }}
                      disabled={!can}>
                      <PixelIcon kind={key} />
                      <span style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: 12 }}>{def.name} <span style={{ color: "#e8d47a" }}>{def.cost}g</span></div>
                        <div style={{ fontSize: 10, opacity: 0.75 }}>{def.blurb}</div>
                      </span>
                    </button>
                  );
                })}
              </div>
              {ui.buildMode && <div style={{ fontSize: 10, marginTop: 8, color: "#a8d88c" }}>Click the grass to build. {ui.buildMode === "knight" ? "Knights muster just south of the hall." : ""} Click again to cancel.</div>}
            </div>
            </div>

            <div style={{ flex: "1 1 240px", minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
            {sel && selDef && (
              <div style={{ ...panel, boxShadow: "inset 0 0 0 2px #7a6a3c" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PixelIcon kind={sel.kind} branch={sel.branch} size={34} />
                  <div>
                    <div style={{ fontWeight: "bold", color: "#e8d47a", fontSize: 13 }}>
                      {sel.branch ? selDef.branches[sel.branch].name : `${selDef.name} - Lv ${sel.level}`}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.75 }}>
                      {(() => {
                        const t = G.current?.towers.find((x) => x.id === sel.id);
                        if (!t) return "";
                        const st = getStats(t);
                        if (t.kind === "knight") return `${st.count || 1} knight${(st.count || 1) > 1 ? "s" : ""} · ${st.dmg} dmg · ${(st.rate / 1000).toFixed(2)}s · ${st.hp} hp${st.magic ? " · magic" : ""}${st.heal ? " · self-heal" : ""}`;
                        if (t.kind === "support") return `${Math.round(st.slow * 100)}% slow aura · ${st.range} range${st.heal ? ` · mends knights ${st.heal}/s` : ""}${st.buff ? ` · knights +${Math.round(st.buff * 100)}% dmg` : ""}`;
                        return `${st.dmg} dmg · ${(st.rate / 1000).toFixed(2)}s · ${st.range}rng${st.splash ? ` · ${st.splash} splash (full dmg at core)` : ""}${st.pierce ? " · pierces armor" : ""}${st.dtype === "magic" ? " · magic" : ""}`;
                      })()}
                    </div>
                  </div>
                </div>

                {sel.kind === "knight" && (
                  <div style={{ fontSize: 10, marginTop: 6, color: "#a8d88c" }}>
                    Click anywhere inside the circle to move the rally flag.
                  </div>
                )}

                {!sel.branch && sel.level < 3 && (() => {
                  const nxt = selDef.levels[sel.level];
                  const can = ui.gold >= nxt.cost;
                  return (
                    <button style={{ ...btn, width: "100%", marginTop: 8, ...(!can ? disabled : {}) }} disabled={!can}
                      onClick={() => { const t = G.current?.towers.find((x) => x.id === sel.id); if (t) upgradeTower(t); }}>
                      {nxt.label} — <span style={{ color: "#e8d47a" }}>{nxt.cost}g</span>
                      <div style={{ fontSize: 10, opacity: 0.75 }}>
                        {nxt.slow != null
                          ? `${Math.round(nxt.slow * 100)}% slow · ${nxt.range} range`
                          : `${nxt.count ? `${nxt.count} knights · ` : ""}${nxt.dmg} dmg · ${(nxt.rate / 1000).toFixed(2)}s${nxt.hp ? ` · ${nxt.hp} hp` : ` · ${nxt.range} range`}`}
                      </div>
                    </button>
                  );
                })()}

                {!sel.branch && sel.level === 3 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: "#e8d47a", marginBottom: 6 }}>CHOOSE A PATH — PERMANENT</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.entries(selDef.branches).map(([bk, br]) => {
                        const can = ui.gold >= br.cost;
                        return (
                          <button key={bk} style={{ ...btn, display: "flex", gap: 8, alignItems: "flex-start", ...(!can ? disabled : {}) }} disabled={!can}
                            onClick={() => { const t = G.current?.towers.find((x) => x.id === sel.id); if (t) branchTower(t, bk); }}>
                            <PixelIcon kind={sel.kind} branch={bk} size={26} />
                            <span>
                              <div style={{ fontWeight: "bold", fontSize: 12 }}>{br.name} — <span style={{ color: "#e8d47a" }}>{br.cost}g</span></div>
                              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{br.desc}</div>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button style={{ ...btn, width: "100%", marginTop: 8, textAlign: "center", background: "#4a3228" }}
                  onClick={() => { const t = G.current?.towers.find((x) => x.id === sel.id); if (t) sellTower(t); }}>
                  Sell for {Math.floor(sel.invested * 0.7)}g
                </button>
              </div>
            )}

            {!sel && (
              <div style={{ ...panel, fontSize: 10.5, lineHeight: 1.6, opacity: 0.85 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.8, marginBottom: 6 }}>COMMAND POST</div>
                Select a tower on the field to upgrade, evolve, or sell it here.<br />
                Enemy lore, tactics, and game options live in the <b>menu</b>, top left.
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
