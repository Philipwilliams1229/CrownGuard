// ============ THE CHAPTERS' MARKS ============
// Each chapter's colours and its sigil, sculpted at art size for the campaign map's chapter titles
// (CampaignMap.jsx Banner): `crestPixels(id, open, shape)` returns { w, h, px } (rows of colours or null),
// a heater shield ("shield") or a round medallion ("disc") with the sigil in gold on the chapter's field,
// lit from the upper left, a one-pixel tinted outline. Sealed: slate, a padlock for the sigil.

const INK = "#241a26";
const GOLD = ["#6e4a18", "#93681f", "#b8902e", "#d8b34a", "#f0d27a", "#fff3d2"];
const SLATE = ["#2a2632", "#3a3644", "#4a4656", "#5c5868", "#706c7c", "#86828e"];

// field ramps (dark .. light) and the ribbon cloth for each chapter
export const CHAPTER_COL = {
  greenwood: { field: ["#24401f", "#2f5228", "#3f6a33", "#548540", "#6a9c4c"], cloth: { cloth: "#4a7a3a", lt: "#62944a", dk: "#33592a", fold: "#1c3016" } },
  iron:      { field: ["#232a36", "#2e3646", "#3e4a5e", "#536178", "#6a7a92"], cloth: { cloth: "#4e5c74", lt: "#66768e", dk: "#38435a", fold: "#1e2432" } },
  hollow:    { field: ["#2c1a32", "#3a2440", "#4e3256", "#64426e", "#7a5686"], cloth: { cloth: "#5e3e68", lt: "#7a5686", dk: "#432a4c", fold: "#22142a" } },
  rime:      { field: ["#1f3a4e", "#2a4a62", "#3a6280", "#4e7c9c", "#6898b6"], cloth: { cloth: "#46708e", lt: "#6290ae", dk: "#304f68", fold: "#18283a" } },
};

// 9 x 9 sigils: x gold, h shine, d dark (a hole in the gold)
const SIGIL = {
  greenwood: [   // an oak leaf
    "....x....",
    "...xxx...",
    "..xxhxx..",
    ".xxxhxxx.",
    "..xxhxx..",
    ".xxxhxxx.",
    "..xxhxx..",
    "...xhx...",
    "....x....",
  ],
  iron: [        // a barred helm
    "..xxxxx..",
    ".xhhxxxx.",
    ".xhxxxxx.",
    ".xdddddx.",
    ".xxxdxxx.",
    ".xxxdxxx.",
    ".xxxdxxx.",
    "..xx.xx..",
    ".........",
  ],
  hollow: [      // a skull
    "..xxxxx..",
    ".xhhxxxx.",
    "xhxxxxxxx",
    "xxddxddxx",
    "xxddxddxx",
    ".xxxdxxx.",
    "..xxxxx..",
    "..x.x.x..",
    ".........",
  ],
  rime: [        // a snowflake
    "....x....",
    ".x..x..x.",
    "..x.x.x..",
    "...xxx...",
    "xxxxhxxxx",
    "...xxx...",
    "..x.x.x..",
    ".x..x..x.",
    "....x....",
  ],
  sealed: [      // a padlock
    "...xxx...",
    "..x...x..",
    "..x...x..",
    ".xxxxxxx.",
    ".xhxxxxx.",
    ".xxxdxxx.",
    ".xxxdxxx.",
    ".xxxxxxx.",
    ".........",
  ],
};

const CACHE = new Map();
export function crestPixels(id, open = true, shape = "shield") {
  const key = `${id}|${open ? 1 : 0}|${shape}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const field = open ? (CHAPTER_COL[id] || CHAPTER_COL.greenwood).field : SLATE;
  const rim = open ? GOLD : SLATE.map((c, i) => SLATE[Math.min(5, i + 1)]);
  const W = shape === "disc" ? 15 : 15, H = shape === "disc" ? 15 : 17;
  // inside test, and the distance to the edge, for the two shapes
  const inside = shape === "disc"
    ? (x, y) => Math.hypot(x + 0.5 - W / 2, y + 0.5 - H / 2) <= W / 2 - 0.6
    : (x, y) => {
      const X = x + 0.5, Y = y + 0.5;
      if (Y < 0.6 || X < 0.6 || X > W - 0.6) return false;
      if (Y <= 9) return true;
      const t = (Y - 9) / (H - 0.6 - 9);   // the sides curve in to the point
      const half = (W / 2 - 0.6) * Math.sqrt(Math.max(0, 1 - t * t));
      return Math.abs(X - W / 2) <= half;
    };
  const px = Array.from({ length: H + 2 }, () => Array(W + 2).fill(null));
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && inside(x, y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!solid(x, y)) continue;
    const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
    const lit = x + y < (W + H) / 2 - 2;
    let c;
    if (edge) c = rim[lit ? (x + y < 8 ? 4 : 3) : 1];
    else {
      const k = 3 - (x > W / 2 ? 1 : 0) - (y > H * 0.62 ? 1 : 0) + (x + y < 7 ? 1 : 0);
      c = field[Math.max(0, Math.min(4, k))];
    }
    px[y + 1][x + 1] = c;
  }
  // the sigil, centred (a little high on the shield)
  const sg = SIGIL[open ? id : "sealed"] || SIGIL.sealed;
  const ox = Math.round((W - 9) / 2) + 1, oy = (shape === "disc" ? Math.round((H - 9) / 2) : 3) + 1;
  const sgCol = open ? GOLD : SLATE.map((c, i) => SLATE[Math.min(5, i + 2)]);
  sg.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === ".") return;
    const x = ox + i, y = oy + j;
    if (!px[y]?.[x]) return;
    px[y][x] = ch === "h" ? sgCol[5] : ch === "d" ? field[0] : (i + j < 8 ? sgCol[4] : sgCol[3]);
  }));
  // the one-pixel outline
  const out = px.map((r) => r.slice());
  for (let y = 0; y < px.length; y++) for (let x = 0; x < px[0].length; x++) {
    if (px[y][x]) continue;
    if (px[y - 1]?.[x] || px[y + 1]?.[x] || px[y]?.[x - 1] || px[y]?.[x + 1]) out[y][x] = INK;
  }
  const res = { w: W + 2, h: H + 2, px: out };
  CACHE.set(key, res);
  return res;
}
