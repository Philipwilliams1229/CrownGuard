// Round 21 option A (the plain slow): HOBBLED, dust and drag. See art/briefs/fx-round21.md. Owned by its artist alone.
// Everything rides the frame's own silhouette and stays on the LOWER body (nothing above the waist, nothing over the
// crown): a dirt-tan rim on the legs, the feet caked in dust, two scratch marks on the shins, grit kicked off the
// trailing heel on ONE leg's step only (so the stride reads uneven), and the whole figure dipping a pixel on that
// leg's step (a limp). The dip is a per-frame offset, so a bake can carry it (frame -> dy), nothing kept between frames.
import { maskOf, sprite, frameOf, H, P, bay, fr } from "./fx-r21-kit.js";

// road-dust ramp, stepped, light to deep (khaki and umber: no orange, no red, no green, no blue)
const DIRT = ["#e6dab6", "#c6b186", "#9c8862", "#6c5c44", "#433a2c"];   // greyed khaki, apart from the goblin's red-brown leather
// slow strength -> how much: how high the dirt climbs (fraction of height), grit specks, the limp's dip, scratches
const grow = (lv) => ({ reach: [0.12, 0.2, 0.3][lv], grit: [4, 6, 8][lv], dip: [0, 1, 1][lv], drift: [2, 4, 6][lv] });
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
  const top = Math.round(-T * g.reach);                        // the dust climbs to here
  // 1. dust on the legs, PATCHY: mottled 2x2 patches of pale road dust (lighter on the sunward side), thick at the
  //    soles, thinning to nothing at the top line; the legs' own green shows between the patches, the outline is kept
  for (const [x, y] of m.list) {
    if (y < top) continue;
    const edge = !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y + 1);
    if (edge && m.has(x - 1, y)) continue;                     // keep the figure's own line, bar the sunward side
    const d = (y - top) / (-top + 1);                           // 0 at the top .. 1 at the soles
    const patch = H(Math.floor((x + 1) / 2), Math.floor((y + 1) / 2) + 17);
    if (patch > 0.18 + d * 0.62) continue;
    const lit = !m.has(x - 1, y) || !m.has(x - 1, y - 1);
    P(c, x, y + dy, lit ? DIRT[0] : patch < 0.25 + d * 0.25 ? DIRT[1] : DIRT[2], 0.92);
  }
  // 2. dust sifting down off the shins: short 2-px flakes leaving the legs' back edge, falling and drifting back
  const shin = m.edge.filter(([x, y]) => y >= top - 2 && y <= -3 && !m.has(x - 1, y));
  for (let k = 0; k < g.drift && shin.length; k++) {
    const q = fr(e.t * 2 + H(k, 21)), [x0, y0] = shin[Math.floor(H(k, 23) * shin.length) % shin.length];
    const x = Math.round(x0 - 1 - q * 3), y = Math.round(y0 + q * 5);
    if (y > -1 || m.has(x, y)) continue;
    P(c, x, y + dy, q < 0.5 ? DIRT[0] : DIRT[1], 1 - q * 0.4); P(c, x, y + 1 + dy, DIRT[2], 0.9 - q * 0.4);
  }
  // 3. grit kicked off the trailing heel on EVERY step (two steps a 12-cell stride): chunky 2-px bits arcing back and
  //    dropping, kept within the feet's width behind the heel; the lame leg's step throws more and bigger bits
  const r0 = runs(m, 0).length ? runs(m, 0) : runs(m, -1), hx = r0.length ? r0[0][0] : m.xl;
  const fw = r0.length ? Math.max(6, r0[r0.length - 1][1] - r0[0][0] + 1) : 8;
  const ph = (e.i + 12 - 3) % 12, lame = ph < 6, age = ph % 6;    // the lame leg pushes off at cell 3, the good one at 9
  if (age <= 3) {
    const n = lame ? g.grit : g.grit - 2;
    for (let k = 0; k < n; k++) {
      const kk = k + (lame ? 0 : 40), vx = 0.9 + H(kk, 2) * 1.2, vy = 1.5 + H(kk, 5) * 1.5, t = age + 0.7 + H(kk, 8) * 0.5;
      const x = Math.max(hx - fw, Math.round(hx - 1 - vx * t)), y = Math.round(-1 - vy * t + 0.6 * t * t);
      if (y > -1) continue;
      if (lame && age < 3) { P(c, x, y, DIRT[0]); P(c, x + 1, y, DIRT[1]); P(c, x, y + 1, DIRT[2]); P(c, x + 1, y + 1, DIRT[3]); }
      else if (H(kk, 9) > 0.5) { P(c, x, y, DIRT[0]); P(c, x + 1, y, DIRT[2]); }
      else { P(c, x, y, DIRT[0]); P(c, x, y + 1, DIRT[2]); }
    }
  }
  // 4. the scuff at each push-off: a flat dust smear right at the heel (2 rows), the lame foot's wider and longer-lived
  if (age <= (lame ? 2 : 1)) {
    const w0 = lame ? 4 : 2, k0 = lame ? 0.85 : 0.6;
    for (let x = hx - w0 + age; x <= hx + 2 - age; x++) for (let y = -1; y <= 0; y++) {
      const a = (k0 - age * 0.25) * (y === 0 ? 1 : 0.5);
      if (bay(x + e.i * 2, y) < a && !m.has(x, y)) P(c, x, y, y === 0 ? DIRT[1] : DIRT[0], 0.9);
    }
  }
};
