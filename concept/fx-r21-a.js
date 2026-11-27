// Round 21 option A (the plain slow): HOBBLED, dust and drag. See art/briefs/fx-round21.md. Owned by its artist alone.
// Everything rides the frame's own silhouette and stays on the LOWER body (nothing above the waist, nothing over the
// crown): a dirt-tan rim on the legs, the feet caked in dust, two scratch marks on the shins, grit kicked off the
// trailing heel on ONE leg's step only (so the stride reads uneven), and the whole figure dipping a pixel on that
// leg's step (a limp). The dip is a per-frame offset, so a bake can carry it (frame -> dy), nothing kept between frames.
import { maskOf, sprite, frameOf, H, P, bay, cl, fifth, sunEdge } from "./fx-r21-kit.js";

// road-dust ramp, stepped, light to deep (khaki and umber: no orange, no red, no green, no blue)
const DIRT = ["#e6dab6", "#c6b186", "#9c8862", "#6c5c44", "#433a2c"];   // greyed khaki, apart from the goblin's red-brown leather
// slow strength -> how much: how high the dirt climbs (fraction of height), grit specks, the limp's dip, scratches
const grow = (lv) => ({ reach: [0.09, 0.15, 0.24][lv], grit: [3, 5, 7][lv], dip: [0, 1, 1][lv], scr: [0, 2, 3][lv], cake: [0.22, 0.34, 0.46][lv] });
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
  // 1. mud caked on the shins and feet, in solid stepped tones (no checker): a ragged lit lip on top, umber body, the
  //    soles darkest, the sunward side lit, the figure's own outline turned to a deep umber there (the tinted line)
  const lipAt = (x) => Math.round(top + (H(x, 3) > 0.6 ? -1 : H(x, 3) < 0.25 ? 1 : 0));
  for (const [x, y] of m.list) {
    const l = lipAt(x); if (y < l) continue;
    const out = !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y + 1) || (!m.has(x, y - 1) && y > l);
    let col = DIRT[2];
    if (!m.has(x - 1, y)) col = y >= -1 ? DIRT[2] : DIRT[1];                  // sunward edge catches the light
    else if (out) col = DIRT[4];
    else if (y === l) col = DIRT[1];                                         // the lip
    else if (y >= -1) col = DIRT[3];                                         // the soles
    else if (H(x * 3, y * 7) > 0.82) col = DIRT[3];                          // a clod here and there
    P(c, x, y + dy, col, col === DIRT[2] || col === DIRT[3] ? 0.8 : 1);
  }
  // 1b. the dust rim: a warm tan line one pixel OUTSIDE the sunward (back) edge of the legs and hips, up to a few px over
  //     the mud, dithering out at its top: the "glow" of the slow, in dust colours, only on the lower body
  const rimTop = Math.round(top) - 6;
  for (const [x, y] of m.edge) {
    if (y < rimTop || y > -1 || m.has(x - 1, y)) continue;
    const fade = cl((y - rimTop) / 3);
    if (bay(x, y + e.i) > fade) continue;
    P(c, x - 1, y + dy, y >= lipAt(x) ? DIRT[0] : DIRT[1], 0.95);
    if (y > top + 1 && !m.has(x - 2, y) && bay(x + 1, y) < 0.4) P(c, x - 2, y + dy, DIRT[1], 0.6);
  }
  // 2. splashes thrown up above the lip: a few single tan / umber specks on the leg, never on the tunic's top
  for (let k = 0; k < 4; k++) {
    const r = runs(m, Math.round(top) - 2 - (k & 1)); if (!r.length) break;
    const [a0, b0] = r[k % r.length], x = a0 + 1 + Math.floor(H(k, f + 1) * Math.max(1, b0 - a0 - 1)), y = Math.round(top) - 2 - (k & 1);
    if (m.has(x, y)) P(c, x, y + dy, k & 1 ? DIRT[3] : DIRT[1]);
  }
  // 3. scratches on the shins: a short slanted dark nick with a pale lip, one per leg, riding the leg's own run
  const sy = Math.round(top - 4);
  runs(m, sy).filter(([a, b]) => b - a >= 2).slice(0, g.scr).forEach(([a, b], k) => {
    const x = Math.round((a + b) / 2) + (k ? 0 : -1), y = sy - (k ? 1 : 0);
    for (let j = 0; j < 3; j++) if (m.has(x + j - 1, y + j - 1)) P(c, x + j - 1, y + j - 1 + dy, DIRT[4]);
    if (m.has(x - 1, y)) P(c, x - 1, y + dy, DIRT[0], 0.9);
  });
  // 4. grit off the trailing heel: kicked on the lame leg's push-off only (cells 3..6 of the 12-cell stride), flying back
  //    and dropping; chunky 2x2 bits, lit tan top-left, umber under; they land within a stride of the heel
  const foot = (row) => runs(m, row)[0] || runs(m, row - 1)[0] || [m.xl, m.xl];
  const [hx] = foot(0), age = e.i - 3;
  if (age >= 0 && age <= 3) {
    for (let k = 0; k < g.grit; k++) {
      const vx = 0.8 + H(k, 2) * 1.8, vy = 1.6 + H(k, 5) * 1.6, t = age + 0.8 + H(k, 8) * 0.4;
      const x = Math.round(hx - 1 - vx * t), y = Math.round(-1 - vy * t + 0.62 * t * t);
      if (y > -1) continue;
      if (H(k, 11) > 0.3 && age < 3) { P(c, x, y, DIRT[0]); P(c, x + 1, y, DIRT[1]); P(c, x, y + 1, DIRT[2]); P(c, x + 1, y + 1, DIRT[4]); }
      else { P(c, x, y, DIRT[1]); P(c, x, y + 1, DIRT[3]); }
    }
  }
  // 5. dust scuffed up at the footfalls: flat, low smears (2 rows) under the back heel, no wider than the feet; the
  //    lame foot drags a big one (cells 2..4), the good foot only a light puff (cells 8..9): the stride reads uneven
  const smear = (age, w0, k0) => {
    for (let x = hx - w0 + age; x <= hx + 3 - age; x++) for (let y = -2; y <= 0; y++) {
      const a = (k0 - age * 0.22) * (y === 0 ? 1 : y === -1 ? 0.6 : 0.25);
      if (bay(x + e.i * 2, y) < a && !m.has(x, y)) P(c, x, y, y === 0 ? DIRT[2] : DIRT[1], 0.9);
    }
  };
  if (e.i >= 2 && e.i <= 4) smear(e.i - 2, 4, 0.8);
  if (e.i >= 8 && e.i <= 9) smear(e.i - 8 + 1, 2, 0.45);
};
