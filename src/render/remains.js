// ============ THE FALLEN, LYING ON THE ROAD ============
// The corpses a necromancer may raise (g.corpses, engine/actions.js) lie
// where they fell for as long as their wave goes on, so they are drawn: a
// small heap of bones and a skull, flush with the road under the crowd.
// When the wave is cleared they dissolve piece by piece (fadeAt/fadeMs, set
// by update.js dissolveCorpses).
//
// Each piece (spine, three ribs, the skull, a long
// bone) is painted ONCE as a little pixel sprite at art resolution (PX per
// world unit): lit from the upper left in four bone tones, with a one-pixel
// edge tinted umber, and stamped with one drawImage. A corpse is five blits
// and a dithered shadow row, whatever it looks like.
import { PX, hash } from "./paint.js";

const SHADE = "rgba(34,22,34,0.3)";
const HI = "#f8f0d6", LT = "#e6dcbc", MD = "#c4b794", DK = "#9a8e6e", EDGE = "#4a3a30", SOCK = "#2a2028";

// ---- the new pieces ----------------------------------------------------------
// a piece is rows of tone letters, one per art pixel: h lit, l light, m mid, d shade, s socket
const TONE = { h: HI, l: LT, m: MD, d: DK, s: SOCK };
const PIECES = {
  rib: ["h", "l", "l", "m", "m", "d"].map((t) => t),                    // a vertical rib, 6 px, lit at the top
  rib2: ["hl", ".l", ".m", ".m", "d."],                                  // a curled rib
  skull: [".hhl.", "hllllm", "lslslm", "llllmm", ".lmmm.", ".dddd."],
  skullB: [".hhl.", "hlllm", "lsslm", "lllmm", ".mmd."],
  long: ["hllllmd"],
  longB: ["hlllmd", ".mdd.."],
};
const spineRow = (n) => "h" + "l".repeat(n - 2) + "m";
const ink = (rows) => {
  const g = rows.map((r) => [...r]);
  const H = g.length + 2, W = Math.max(...g.map((r) => r.length)) + 2;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const at = (x, y) => (g[y] && g[y][x] && g[y][x] !== "." ? g[y][x] : null);
  for (let y = -1; y <= g.length; y++) for (let x = -1; x <= W - 2; x++) {
    const t = at(x, y);
    if (t) { c.fillStyle = TONE[t]; c.fillRect(x + 1, y + 1, 1, 1); continue; }
    if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) { c.fillStyle = EDGE; c.fillRect(x + 1, y + 1, 1, 1); }
  }
  return { cv, w: W, h: H };
};
const SPR = new Map();
const spr = (key, rows) => { let s = SPR.get(key); if (!s) { s = ink(rows); SPR.set(key, s); } return s; };
const stamp = (ctx, s, x, y) => ctx.drawImage(s.cv, Math.round(x * PX) / PX, Math.round(y * PX) / PX, s.w / PX, s.h / PX);
const shade = (ctx, x, y, n) => {                 // a dithered contact shadow, n art pixels long, two rows
  ctx.fillStyle = SHADE;
  for (let i = 0; i < n; i++) {
    ctx.fillRect(x + i / PX, y, 1 / PX, 1 / PX);
    if (i > 0 && i < n - 1 && (i & 1)) ctx.fillRect(x + i / PX, y + 1 / PX, 1 / PX, 1 / PX);
  }
};

const drawNewCorpse = (ctx, c, p) => {
  const k = Math.max(0.7, Math.min(1.5, (c.size || 14) / 15));
  const n = k < 1 ? 7 : k < 1.25 ? 9 : 11;                          // spine length, art pixels
  const x = Math.round(c.x), y = Math.round(c.y + 2), s = hash(x, y), left = s < 0.5;
  let i = 0;
  const part = (draw) => { i++; if (p > 0 && hash(x + i * 13, y + i * 7) < p) return; draw(); };
  const w = n / PX;
  // shadow, lower right of the heap
  part(() => shade(ctx, x - w / 2 + 1 / PX, y + 1.5, n + 1));
  // the spine, then three ribs standing off it
  part(() => stamp(ctx, spr("sp" + n, [spineRow(n)]), x - w / 2, y - 0.5));
  for (let r = -1; r <= 1; r++) part(() => stamp(ctx, spr("ri" + (r & 1), r & 1 ? PIECES.rib2 : PIECES.rib.map((t) => t)), x + r * (n / 4 / PX) - 1 / PX, y - 3 / PX - (r & 1 ? 0 : 1 / PX)));
  part(() => stamp(ctx, spr(left ? "skA" : "skB", left ? PIECES.skull : PIECES.skullB), x + (left ? 3.2 : -4.2) * k, y - 2.2));
  part(() => stamp(ctx, spr(left ? "loA" : "loB", left ? PIECES.long : PIECES.longB), x + (left ? -5.4 : 2.4) * k, y + 0.8));
};

export const drawRemains = (ctx, g) => {
  const cs = g.corpses;
  if (!cs || !cs.length) return;
  const now = g.time * 1000;
  for (const c of cs) {
    const p = c.fadeMs ? Math.max(0, Math.min(1, (now - c.fadeAt) / c.fadeMs)) : 0;
    drawNewCorpse(ctx, c, p);
  }
};
