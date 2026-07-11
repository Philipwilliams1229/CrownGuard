// ============ PIXEL SPRITES ============
// Hand-made 2-frame sprite maps for every character, their color palettes,
// the little "mini" figures that stand on towers, and the drawSprite routine
// that paints a sprite map onto a canvas one pixel-cell at a time.

import { INK, CELL } from "../data/constants.js";

export const SPRITES = {
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

export const KNIGHT_PALS = {
  base: { o: INK, a: "#8a8f9a", d: "#5f636d", s: "#e0b088", p: "#b04a3c", h: "#a04a3f" },
  paladin: { o: INK, a: "#d8cfae", d: "#b0a67f", s: "#e0b088", p: "#e0c070", h: "#d8b34a" },
  berserk: { o: INK, a: "#8a5f3f", d: "#63432b", s: "#e0b088", p: "#b04a3c" },
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

export const ARCHER_PALS = {
  base: { o: INK, h: "#54703f", b: "#6e4c28", s: "#e0b088", w: "#4a3018" },
  a: { o: INK, h: "#3f6a34", b: "#4a7a3c", s: "#e0b088", w: "#4a3018" },
  b: { o: INK, h: "#2c3e54", b: "#3a5474", s: "#e0b088", w: "#4a3018" },
};

export const WIZ_PALS = {
  base: { o: INK, h: "#5f4a86", b: "#6a5a94", s: "#e0b088", t: "#5f4326", g: "#b08ad8" },
  a: { o: INK, h: "#a0473a", b: "#8a4034", s: "#e0b088", t: "#5f4326", g: "#d8763a" },
  b: { o: INK, h: "#4a7aa0", b: "#3f6a8e", s: "#e0b088", t: "#5f4326", g: "#9fd4e8" },
};

export const PRIEST_PALS = {
  base: { o: INK, m: "#e0d6ba", r: "#c8c2ae", s: "#e0b088", c: "#d8b34a" },
  a: { o: INK, m: "#bee8b0", r: "#5cae5c", s: "#e0b088", c: "#e8e4d8" },
  b: { o: INK, m: "#c8ecec", r: "#4a8aa0", s: "#e0b088", c: "#7cd4d4" },
  c: { o: INK, m: "#e0c070", r: "#a0473a", s: "#e0b088", c: "#d8b34a" },
};

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
