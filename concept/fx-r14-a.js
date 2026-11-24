// Round 14, option A (Opus): the owner's reference made faithfully in our camera. See art/briefs/fx-round14.md.
// ONE straight comet of flame from the levelled staff to the wedge's far half: a white needle after a small gap at the
// staff, widening steadily the whole way, a pale core line down its middle, dense mottled orange / deep-orange / red
// clusters, small ragged licks swept back along both edges (more toward the end), and a big rounded head, the widest part,
// redder at its rim, hanging over the foes at the far end of the reach. No arc, no smoke, no ground fires.
// Motion (true 16-frame loop): the mottle and the licks rush down the jet from the staff to the head (12 art px a frame,
// one noise period = 192 px = 16 frames), a brighter surge travels down it twice a loop, the head breathes in and out.
// Everything is computed per pixel in the jet's own frame (along / across), so it bakes to one sprite per aim step and frame.
import * as K from "./fx-r14-kit.js";
const { N, FIRE, INK, H, bay, P, Lart, aimAt, mkT, hallAt, mouthOf, road, GOB, gobItem, pool, sparks, heat, FL } = K;

const TAU = Math.PI * 2;
const S_HEAD = 0.82, R0 = 24, LIFT = R0 * 0.72;          // head over the road at 0.82 of the reach, radius 24, its foot just on the road
const SHIFT = 12;                                         // texture rush, art px a frame (x16 = 192 = the noise period)

// periodic value noise along the jet (wrap = cells per 192 px), plain across it
const sm = (t) => t * t * (3 - 2 * t);
const vn = (a, v, ca, cv, wrap, seed) => {
  const x = a / ca, y = v / cv, ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
  const h = (i, j) => H((((i % wrap) + wrap) % wrap) + seed * 13.7, j * 1.37 + seed * 3.1);
  const a0 = h(ix, iy) + (h(ix + 1, iy) - h(ix, iy)) * fx, a1 = h(ix, iy + 1) + (h(ix + 1, iy + 1) - h(ix, iy + 1)) * fx;
  return a0 + (a1 - a0) * fy;
};

const geom = (ang, i) => {
  const t = mkT(ang), M = mouthOf(t), L = Lart();
  const G = { x: Math.cos(ang) * L * S_HEAD, y: Math.sin(ang) * L * S_HEAD };         // the head's spot on the road
  const C = { x: G.x, y: G.y - LIFT };                                                 // the head's centre, in the air over it
  const dx = C.x - M.x, dy = C.y - M.y, Lc = Math.hypot(dx, dy), D = { x: dx / Lc, y: dy / Lc }, Nn = { x: -D.y, y: D.x };
  const R = R0 * (1 + 0.05 * Math.sin((TAU * 2 * i) / N)) + [0, 0.6, 1, 0.6][i % 4];  // the head breathes (two pulses a loop)
  return { t, M, G, C, Lc, D, Nn, R };
};

// the half-width of the body at distance a from the staff: a steady cone, then the bulb of the head (elongated backwards)
const halfW = (a, g) => {
  const { Lc, R } = g;
  const back = R * 2.1, front = R * 0.98, da = a - Lc;
  const wc = 0.55 + 0.46 * R * Math.pow(Math.min(Math.max(0, a), Lc) / Lc, 1.15);
  const un = (p, q) => Math.pow(Math.pow(p, 4) + Math.pow(q, 4), 0.25);
  if (da >= front) return 0;
  if (da >= 0) { const k = da / front; return un(wc, R) * Math.sqrt(1 - k * k); }      // the round front cap
  const wh = da > -back ? R * Math.sqrt(1 - (da / back) * (da / back)) : 0;
  return un(wc, wh);
};

const jet = (c, g, i) => {
  const { M, D, Nn, Lc, R } = g, Lt = Lc + R * 0.98, sh = SHIFT * i, pad = R + 12;
  const ends = [M, { x: M.x + D.x * Lt, y: M.y + D.y * Lt }];
  const x0 = Math.floor(Math.min(ends[0].x, ends[1].x) - pad), x1 = Math.ceil(Math.max(ends[0].x, ends[1].x) + pad);
  const y0 = Math.floor(Math.min(ends[0].y, ends[1].y) - pad), y1 = Math.ceil(Math.max(ends[0].y, ends[1].y) + pad);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const rx = x + 0.5 - M.x, ry = y + 0.5 - M.y, a = rx * D.x + ry * D.y, v = rx * Nn.x + ry * Nn.y;
    if (a < 2.2 || a > Lt) continue;                                         // the small clear gap at the staff
    const u = a / Lt, side = v > 0 ? 1 : 0, av = Math.abs(v), as = a - sh;   // as: the rushing coordinate
    const surge = Math.sin(TAU * (a / 96) - (TAU * 2 * i) / N);                  // a brighter swell running down twice a loop
    const w = halfW(a, g) * (1 + 0.05 * surge * Math.min(1, u * 2));
    const amp = 0.25 + 1.7 * u * u;                                            // ragged edge, rougher toward the end
    const e = Math.max(0.6, w + amp * (vn(as, side * 40, 5, 9, 32, 7 + side) - 0.45) * 2);
    if (av > e || e < 0.7 && a > Lc) {                                                                 // licks: thin tongues swept back toward the staff
      if (u < 0.12 || a > g.Lc + g.R * 0.6) continue;               // none off the round front cap
      const o = av - e, sp = 8, li = Math.floor((as + o * 1.1) / sp), f = (as + o * 1.1) / sp - li;
      const lh = H((((li % 24) + 24) % 24) + side * 50, 9);
      const len = (1.4 + 6 * u * u) * (0.35 + 0.8 * lh) * (lh > 0.2 ? 1 : 0);
      if (o > len) continue;
      const wid = (0.4 + 0.25 * u) * (1 - o / (len + 0.8));
      if (f > wid) continue;
      P(c, x, y, o > len - 1.2 ? FIRE[4] : o < 1.2 && u > 0.45 && f < wid - 0.15 ? FIRE[2] : FIRE[3]);
      continue;
    }
    const q = av / e, rim = e - av;
    // the pale core line, wobbling a little, fading out inside the head
    const cv = v - Math.sin(as * 0.11 + side) * 0.5 * u, cw = 0.55 + 1.9 * u;
    const n1 = vn(as, v, 6, 3.2, 32, 1), n2 = vn(as, v, 3, 1.7, 64, 2), n = n1 * 0.65 + n2 * 0.35;
    let tone;
    if (Math.abs(cv) < cw && u < 0.9 && n > 0.22 - 0.25 * (1 - u)) tone = u < 0.16 || (u < 0.5 && Math.abs(cv) < 0.6) ? 0 : 1;
    else {
      const head = Math.max(0, (u - 0.6) / 0.4);
      const g2 = 0.18 + 0.62 * q + 0.22 * head * q + (n - 0.5) * 0.95 - 0.08 * surge - (u < 0.12 ? 0.35 : 0) + (bay(x & 1023, y & 1023) - 0.5) * 0.08;
      tone = g2 < 0.3 ? 1 : g2 < 0.56 ? 2 : g2 < 0.86 ? 3 : 4;
    }
    if (rim < 1 && u > 0.1) tone = u > 0.62 && (v * Nn.y > 0 || u > 0.93) ? INK : 4;   // the rim: deep red, darkest on the head's lower edge
    P(c, x, y, typeof tone === "string" ? tone : FIRE[tone]);
  }
  // the spark at the staff: a white-gold flick in the gap and two motes
  const fl = FL[i % 4];
  P(c, M.x + D.x * 1.2, M.y + D.y * 1.2, FIRE[0]); P(c, M.x + D.x * 1.2 + Nn.x, M.y + D.y * 1.2 + Nn.y, FIRE[1], 0.8);
  if (fl !== 1) P(c, M.x - Nn.x * 2 + D.x, M.y - Nn.y * 2 - 1, HOTC);
  if (fl !== 0) P(c, M.x + Nn.x * 2 + D.x * 2, M.y + Nn.y * 2 - 2, HOTC, 0.85);
};
const HOTC = "#ffd860";

export const paint = (c, e) => {
  const ang = aimAt(e.i), g = geom(ang, e.i), items = [];
  road(c, e.ground === "dark");
  pool(c, ang, 0.5, 1.05);
  heat(c, ang, e.i, 0.13, 0.3);                               // the head's light marks exactly the damage wedge on the road
  hallAt(c, g.t, 1.2);
  GOB.forEach((gb, k) => items.push(gobItem(c, e, gb, k, ang, 1.1)));
  items.push({ y: g.G.y - 4, draw: () => jet(c, g, e.i) });   // goblins standing nearer the camera than the head are drawn over it
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  sparks(c, ang, e.i, 8, 0.6, 0.62, 30);
};

export const note = "The reference, straight: one jet of flame that leaves the levelled staff as a thin white needle (a spark and a small clear gap at the staff) and widens steadily all the way, a pale core line down its middle, dense mottled orange and red clusters, small licks swept back along both edges, and a big round head, redder at its rim, hanging over the foes in the far half of the reach. No arc, no smoke, no ground fires; because the staff stands high, the jet slants down to the road in one straight line. It lives by rushing: the mottle and licks race down the jet from the staff to the head, a brighter swell runs down it twice a loop, and the head breathes in and out.";
