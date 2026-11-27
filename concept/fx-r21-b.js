// Round 21 option B (the plain slow): slow motion, an afterimage. See art/briefs/fx-round21.md. Owned by its artist alone.
// The foe moves in slowed time: dithered warm-grey echoes of its OWN earlier walk frames trail a step behind it, each
// one frame later and fainter, so the figure seems to drag its own image after it. Pure canvas, no game imports.
// A per-frame bake can do it: an echo reads only the walk frame(s) before this one, never state between frames.
import { body, sprite, maskOf, frameOf, LV } from "./fx-r21-kit.js";
import * as MIST from "./fx-r6-slow.js";

export const note = "Slow motion: the foe drags faint grey afterimages of itself a step behind, each a little behind in its stride, as if time had thickened round it. Weaker slows leave one faint echo, stronger ones three, further back and firmer; the cold mist hugs the outline in blue while the echoes trail behind in warm grey, so both read at once.";

// warm neutral greys (no blue): light, mid, dark, and the echo's tinted line
const GREY = ["#c9beb0", "#a39788", "#7c7166", "#5a5049"];
const LINE = "#4a403c";
// strength -> echoes: how many, how far back each (art px), how firm
// a: the nearest (whole) echo's strength, a2: the next (scanline) echo's; each further one x0.7
const GROW = [
  { n: 1, step: 4, a: 0.4, a2: 0 },         // under 30%
  { n: 2, step: 5, a: 0.55, a2: 0.5 },      // 30-60% (painted)
  { n: 3, step: 5, a: 0.65, a2: 0.6 },      // over 60%
];

// the sprite's own pixels as luminance, keyed to its canvas (so the echo keeps the figure's shading, in grey)
const LUM = new WeakMap();
const lumOf = (s) => {
  let L = LUM.get(s.cv); if (L) return L;
  const w = s.cv.width, h = s.cv.height, d = s.cv.getContext("2d").getImageData(0, 0, w, h).data;
  const ax = Math.round(s.ax), ay = Math.round(s.ay), map = new Map();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (d[i + 3] <= 20) continue;
    map.set((x - ax) + "," + (y - ay), (d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15) / 255);
  }
  LUM.set(s.cv, map); return map;
};

// one echo: the walk frame `f`, shifted back by dx (dy kept for trials, 0 now), skipping pixels anything nearer already covers
// (`front`: masks with their offsets). Drawn as SCANLINES, the old look of a picture smeared in time: every other row
// is the figure's own shading in warm grey, the rows between are faint or empty. The back and top edges get the
// tinted line so the echo keeps the figure's shape.
const echo = (c, e, f, dx, dy, o, front, top) => {
  const s = sprite(e, f), m = maskOf(s), L = lumOf(s);
  for (const [x, y] of m.list) {
    const X = x + dx, Y = y + dy;
    if (Y < top || front.some((fm) => fm.m.has(X - fm.dx, Y - fm.dy))) continue;   // never above the crown
    const foot = Y >= -1 ? 0.45 : 1;                                   // the echo's feet barely touch the ground
    const lit = o.solid || ((Y + o.ph) & 1) === 0;                      // the scanline rows (all rows on a solid echo)
    const edge = !m.has(x - 1, y) || !m.has(x, y - 1) || !m.has(x, y + 1) || !m.has(x + 1, y);   // its outline
    const a = (lit ? o.a : o.gap) * foot;
    if (a <= 0.02) continue;
    if (edge && o.line) { c.globalAlpha = Math.min(1, a * 1.6); c.fillStyle = LINE; c.fillRect(X, Y, 1, 1); continue; }
    const l = L.get(x + "," + y) ?? 0.5;
    c.globalAlpha = a;
    c.fillStyle = l > 0.6 ? GREY[0] : l > 0.38 ? GREY[1] : l > 0.2 ? GREY[2] : GREY[3];
    c.fillRect(X, Y, 1, 1);
  }
  c.globalAlpha = 1;
};

// how many walk frames late each echo is (8 frames a stride pair: 2 = a quarter step, so its legs visibly lag)
const LAG = 2;

export const paintAt = (c, e, lv = LV, o2 = {}) => {
  const g = GROW[lv], f = frameOf(e), ph = Math.floor(e.i / 3) % 2;   // the scanlines crawl one row every 3 cells
  const m0 = maskOf(sprite(e, f)), front = [{ m: m0, dx: 0, dy: 0 }];
  // nearest echo first (it sits in front of the further ones), each LAG walk frames later and fainter
  for (let k = 1; k <= g.n; k++) {
    const dx = -g.step * k, dy = 0, fk = (f - LAG * k + 16) % 8;
    // the nearest echo is a whole ghost (every row, its own outline) so its late pose reads; the further ones are scanlines
    const o = { ph: (ph + k) & 1, solid: k === 1, a: k === 1 ? g.a : g.a2 * Math.pow(0.7, k - 2), gap: 0, line: k === 1 };
    echo(c, e, fk, dx, dy, o, front, -m0.T);
    front.push({ m: maskOf(sprite(e, fk)), dx, dy });
  }
  if (o2.under) o2.under(c, e); else body(c, e);
};

export const paint = (c, e) => paintAt(c, e, LV);
// both slows at once (a frost aura over a spike strip): the echoes trail behind, then the figure in Round 6 C's cold
// mist (the look the game wears for frost) is drawn over them. For the lead to show if wanted; not in the row.
export const paintWithMist = (c, e) => paintAt(c, e, LV, { under: (cc, ee) => MIST.ROWS[0].C(cc, ee) });
