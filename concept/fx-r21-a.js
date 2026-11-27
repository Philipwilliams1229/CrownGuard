// Round 21 option A (the plain slow): HOBBLED, dust and drag. See art/briefs/fx-round21.md. Owned by its artist alone.
// Everything rides the frame's own silhouette and stays on the LOWER body (nothing above the waist, nothing over the
// crown): a dirt-tan rim on the legs, the feet caked in dust, two scratch marks on the shins, grit kicked off the
// trailing heel on ONE leg's step only (so the stride reads uneven), and the whole figure dipping a pixel on that
// leg's step (a limp). The dip is a per-frame offset, so a bake can carry it (frame -> dy), nothing kept between frames.
import { maskOf, sprite, frameOf, H, P, bay, cl, fifth, sunEdge } from "./fx-r21-kit.js";

// dirt ramp, stepped, light to deep (tan and umber: no orange, no red, no green)
const DIRT = ["#ecd7a4", "#cfab72", "#a27a4c", "#755234", "#4a3322"];
// slow strength -> how much: how high the dirt climbs (fraction of height), grit specks, the limp's dip, scratches
const grow = (lv) => ({ reach: [0.11, 0.2, 0.3][lv], grit: [2, 4, 6][lv], dip: [0, 1, 1][lv], scr: [0, 2, 3][lv], cake: [0.22, 0.34, 0.46][lv] });
const LVL = 1;                       // paint the middle strength (30-60%)
const LAME = [1, 2];                 // the walk frames where the lame leg takes the weight: the body dips a pixel

// the leg runs on one row: [[x0, x1], ...] left to right
const runs = (m, y) => {
  const out = []; let s = null;
  for (let x = m.xl - 1; x <= m.xr + 1; x++) { const h = m.has(x, y); if (h && s === null) s = x; if (!h && s !== null) { out.push([s, x - 1]); s = null; } }
  return out;
};

export const note = "Hobbled: the legs pick up a dusty tan edge and caked feet, a couple of scratches on the shins, and one leg limps: the goblin dips on that step and kicks grit back off its heel. It grows from dusty feet (under 30%) to dirt up to the waist with a deeper limp and more grit (over 60%); under a frost aura the cold mist hangs round the body while the feet stay brown and the grit still flies.";

export const paint = (c, e, lv = LVL) => {
  const g = grow(lv), f = frameOf(e), s = sprite(e, f), m = maskOf(s), T = m.T;
  const dy = LAME.includes(f) ? g.dip : 0;
  c.drawImage(s.cv, Math.round(-s.ax), Math.round(-s.ay + dy));
  const top = -T * g.reach;                                    // the mud climbs to here
  // 1. mud caked on the shins and feet: a ragged stepped top edge riding each leg, a lit tan lip on top and on the
  //    sunward side, umber body darkening to the soles, the figure's own outline turned to a deep umber (tinted line)
  const lipAt = (x) => Math.round(top + (H(x, 3) - 0.5) * 2.4 + Math.sin(x * 1.3) * 0.8);
  for (const [x, y] of m.list) {
    const l = lipAt(x); if (y < l) continue;
    const isEdge = !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y + 1) || !m.has(x, y - 1);
    const lit = !m.has(x - 1, y) || !m.has(x - 2, y) && m.has(x - 1, y) && !m.has(x - 1, y - 1);
    const d = (y - l) / (-l + 1);                              // 0 at the lip .. 1 at the soles
    let col;
    if (isEdge && !(y === l && m.has(x, y - 1))) col = DIRT[4];
    else if (y === l || y === l + 1 && bay(x, y) < 0.5) col = DIRT[1];
    else if (lit) col = DIRT[1];
    else { const b = bay(x, y); if (b > 0.5 + d * 0.45) continue; col = b < d * 0.6 - 0.1 ? DIRT[3] : DIRT[2]; }   // the leg's own form shows through the thinner mud near the lip
    P(c, x, y + dy, col);
  }
  // 2. a dust film just above the mud: sparse dithered tan, thinning upward over 4 px (dust, not a tint)
  for (const [x, y] of m.list) {
    const u = lipAt(x) - y; if (u < 1 || u > 4) continue;
    if (bay(x + 2, y) < 0.36 - u * 0.08) P(c, x, y + dy, DIRT[1], 0.85);
  }
  // 3. scratches on the shins: a short slanted dark nick with a pale lip, one per leg, riding the leg's own run
  const sy = Math.round(top - 4);
  runs(m, sy).filter(([a, b]) => b - a >= 2).slice(0, g.scr).forEach(([a, b], k) => {
    const x = Math.round((a + b) / 2) + (k ? 0 : -1), y = sy - (k ? 1 : 0);
    for (let j = 0; j < 3; j++) if (m.has(x + j - 1, y + j - 1)) P(c, x + j - 1, y + j - 1 + dy, DIRT[4]);
    if (m.has(x - 1, y)) P(c, x - 1, y + dy, DIRT[0], 0.9);
  });
  // 4. grit off the trailing heel: kicked on the lame leg's push-off only (cells 3..5 of the 12-cell stride), flying back
  //    and dropping; chunky 2x2 bits, lit tan top-left, umber under; they land within a stride of the heel
  const heelRow = runs(m, 0).length ? 0 : -1, back = runs(m, heelRow)[0] || [m.xl, m.xl], hx = back[0], age = e.i - 3;
  if (age >= 0 && age <= 2) {
    for (let k = 0; k < g.grit; k++) {
      const vx = 1.1 + H(k, 2) * 1.4, vy = 1.6 + H(k, 5) * 1.6, t = age + 0.7 + H(k, 8) * 0.4;
      const x = Math.round(hx - 1 - vx * t), y = Math.round(-2 - vy * t + 1.15 * t * t);
      if (y > -1) continue;
      const big = H(k, 11) > 0.35 && age < 2;
      if (big) { P(c, x, y, DIRT[0]); P(c, x + 1, y, DIRT[1]); P(c, x, y + 1, DIRT[2]); P(c, x + 1, y + 1, DIRT[4]); }
      else { P(c, x, y, DIRT[1]); P(c, x, y + 1, DIRT[3]); }
    }
  }
  // 5. the scuff where the lame foot drags: a flat dithered dust smear right under the heel, 2 rows, gone in 2 cells
  const sa = e.i - 2;
  if (sa >= 0 && sa <= 2) {
    const w = 5 - sa;
    for (let x = hx - w; x <= hx + 2; x++) for (let y = -1; y <= 0; y++) if (bay(x + e.i, y) < (0.75 - sa * 0.25) * (y === 0 ? 1 : 0.55)) P(c, x, y, y === 0 ? DIRT[1] : DIRT[0], 0.8);
  }
};
