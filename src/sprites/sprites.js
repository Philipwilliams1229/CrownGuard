// ============ PIXEL SPRITES ============
// Hand-made 2-frame sprite maps for every character, their color palettes,
// the little "mini" figures that stand on towers, and the drawSprite routine
// that paints a sprite map onto a canvas one pixel-cell at a time.

import { INK, CELL } from "../data/constants.js";

export const SPRITES = {
  // v2 high-fidelity goblin: round head with close-set eyes, long arms hanging
  // to the ground (they pump while he scampers), loincloth, 4-frame walk and a
  // 2-frame arms-overhead jaws-wide fight flail. Highlight (l), teeth (t), cloth (b).
  goblin: {
    pal: { o: INK, g: "#6aa04f", l: "#86ba64", d: "#4d7639", e: "#c8453a", t: "#ece0c4", b: "#6e4c28" },
    rate: 10,
    frames: [
      [
        "....ooooo....",
        "...oglgggo...",
        "..oglgggggo..",
        "..ogeggeggo..",
        "..ogtdtdtgo..",
        "ogggggggggggo",
        "ogogdddddgogo",
        "ogogdddddgogo",
        "odo.ogggo.odo",
        ".o..obbbo..o.",
        "....obbbo....",
        "...od...do...",
        "...oo...oo...",
      ],
      [
        "....ooooo....",
        "...oglgggo...",
        "..oglgggggo..",
        "..ogeggeggo..",
        "..ogtdtdtgo..",
        "ogggggggggggo",
        "odogdddddgodo",
        "..ogdddddgo..",
        "....ogggo....",
        "....obbbo....",
        "....obbbo....",
        "....od.do....",
        "....oo.oo....",
      ],
      [
        "....ooooo....",
        "...oglgggo...",
        "..oglgggggo..",
        "..ogeggeggo..",
        "..ogtdtdtgo..",
        "ogggggggggggo",
        "ogogdddddgogo",
        "ogogdddddgogo",
        "odo.ogggo.odo",
        ".o..obbbo..o.",
        "....obbbo....",
        "...od...do...",
        "..oo.....oo..",
      ],
      [
        "....ooooo....",
        "...oglgggo...",
        "..oglgggggo..",
        "..ogeggeggo..",
        "..ogtdtdtgo..",
        "ogggggggggggo",
        "odogdddddgodo",
        "..ogdddddgo..",
        "....ogggo....",
        "....obbbo....",
        "....obbbo....",
        "....od..do...",
        "....oo..oo...",
      ],
    ],
    fight: [
      [
        "....ooooo....",
        ".o.oglgggo.o.",
        "odoglgggggodo",
        "ogogeggeggogo",
        "ogotdtdtdtogo",
        "ogggtttttgggo",
        "..ogdddddgo..",
        "..ogdddddgo..",
        "....ogggo....",
        "....obbbo....",
        "....obbbo....",
        "...od...do...",
        "..oo.....oo..",
      ],
      [
        "....ooooo....",
        "...oglgggo...",
        "..oglgggggo..",
        "..ogeggeggo..",
        "..ogtdtdtgo..",
        "ogggggggggggo",
        "ogogdddddgogo",
        "ogogdddddgogo",
        "odo.ogggo.odo",
        ".o..obbbo..o.",
        "....obbbo....",
        "...od...do...",
        "...oo...oo...",
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

export const KNIGHT_PALS = {
  base: { o: INK, a: "#8a8f9a", d: "#5f636d", s: "#e0b088", p: "#b04a3c", h: "#a04a3f" },
  paladin: { o: INK, a: "#d8cfae", d: "#b0a67f", s: "#e0b088", p: "#e0c070", h: "#d8b34a" },
  berserk: { o: INK, a: "#8a5f3f", d: "#63432b", s: "#e0b088", p: "#b04a3c" },
  champion: { o: INK, a: "#e8e0c4", d: "#c8b878", s: "#e0b088", p: "#e8c14a", h: "#d8b34a" },
};

// little characters that stand on towers (and serve as menu icons)
export const MINI = {
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

MINI.catapult = {
  frames: [[
    "...oo.........",
    "..oddo........",
    "..odrro.......",
    "...od.o.......",
    "....od........",
    ".....od.......",
    "..oooowdoooo..",
    ".owwwwwwwwwwo.",
    "..ow.o..o.wo..",
    ".oddoo..ooddo.",
    "..oo......oo..",
  ]],
};

export const CATAPULT_PALS = {
  base: { o: INK, w: "#8a6238", d: "#5f4326", r: "#8a8a92" },
  a: { o: INK, w: "#6e4c28", d: "#4a3018", r: "#7d7768" },
  b: { o: INK, w: "#8a6238", d: "#5f4326", r: "#b8b8c0" },
};

export const ARCHER_PALS = {
  base: { o: INK, h: "#54703f", b: "#6e4c28", s: "#e0b088", w: "#4a3018" },
  a: { o: INK, h: "#3f6a34", b: "#4a7a3c", s: "#e0b088", w: "#4a3018" },
  b: { o: INK, h: "#2c3e54", b: "#3a5474", s: "#e0b088", w: "#4a3018" },
  // rank-4 finals: briar (venom green), hawkeye (pale sky), dragonslayer (crimson)
  aa: { o: INK, h: "#2f5230", b: "#3c6a34", s: "#c8d8a0", w: "#4a3018" },
  ab: { o: INK, h: "#9fc4dc", b: "#5a7a94", s: "#e0b088", w: "#4a3018" },
  bb: { o: INK, h: "#8e2f2a", b: "#a0473a", s: "#e0b088", w: "#d8b34a" },
};

// the mounted siege bow of the Ballista ascension
MINI.ballista = {
  frames: [[
    ".o.........o.",
    "obo.......obo",
    "obbo.....obbo",
    ".obbo...obbo.",
    "..obboooobb..",
    "...oomwoo....",
    "..owwwmwwwo..",
    "....odmdo....",
    "....od.do....",
    "...oddoddo...",
    "....o...o....",
  ]],
};
export const BALLISTA_PAL = { o: INK, b: "#6e4c28", w: "#8a6238", d: "#5f4326", m: "#c4c8d0" };

export const WIZ_PALS = {
  base: { o: INK, h: "#5f4a86", b: "#6a5a94", s: "#e0b088", t: "#5f4326", g: "#b08ad8" },
  a: { o: INK, h: "#a0473a", b: "#8a4034", s: "#e0b088", t: "#5f4326", g: "#d8763a" },
  b: { o: INK, h: "#7a7434", b: "#98883c", s: "#e0b088", t: "#5f4326", g: "#f0e068" },
  // rank-4 finals: lava, wildfire, tempest, thunder
  aa: { o: INK, h: "#7d2f1a", b: "#a0473a", s: "#e0b088", t: "#5f4326", g: "#e8c14a" },
  ab: { o: INK, h: "#c05a28", b: "#a0473a", s: "#e0b088", t: "#5f4326", g: "#e88a3a" },
  ba: { o: INK, h: "#8a883c", b: "#a8a04c", s: "#e0b088", t: "#5f4326", g: "#f8f0a0" },
  bb: { o: INK, h: "#4a4458", b: "#5c5470", s: "#e0b088", t: "#5f4326", g: "#f0f0e0" },
};

// Warden Mage: frost-touched at base; deep ice (a) and warm life (b) branches
export const PRIEST_PALS = {
  base: { o: INK, m: "#d8ecf0", r: "#8fb4c4", s: "#e0b088", c: "#7cd4d4" },
  a: { o: INK, m: "#c8ecec", r: "#4a8aa0", s: "#dcecf4", c: "#7cd4d4" },
  b: { o: INK, m: "#bee8b0", r: "#5cae5c", s: "#e0b088", c: "#e8e4d8" },
  // rank-4 finals
  aa: { o: INK, m: "#e8f8fc", r: "#3a7a94", s: "#dcecf4", c: "#b8f0f8" },
  ab: { o: INK, m: "#b8dce8", r: "#2c5a74", s: "#dcecf4", c: "#8cd4e8" },
  ba: { o: INK, m: "#f0ecc8", r: "#b0a04c", s: "#e0b088", c: "#e8d47a" },
  bb: { o: INK, m: "#f4f0e0", r: "#a0473a", s: "#e0b088", c: "#d8b34a" },
};

// A palette where every key maps to bone-white — used for hit flashes and
// the first beat of death animations. Cached per source palette.
const whiteCache = new WeakMap();
export function whitePal(pal) {
  let w = whiteCache.get(pal);
  if (!w) {
    w = {};
    for (const k of Object.keys(pal)) w[k] = "#f4f2ea";
    whiteCache.set(pal, w);
  }
  return w;
}

export function drawSprite(ctx, spr, pal, frame, x, y, flip) {
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
