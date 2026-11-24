// Round 16, version b (Opus): Round 15's variation 1 ("B, fixed") with the foot of the head spread wider. Began as a copy of
// concept/fx-r15-a.js. Only the head's lower part changes: below its middle it spreads sideways to 1.4x its width at the foot
// (FOOT) and its bottom flattens a little along the road (FLAT), still one rounded mass; the landing glow is 1.2x wider to match.
// Only the owner's two changes against B: (1) a wider stem: from the needle at the staff the jet now widens steadily (in a straight
// line) to half the head's width just where the head begins to flare, so it is a real body of flame before the head, not a lollipop;
// (2) no lit streak on the road from the hall's foot to the landing (only the landing's own glow under the head stays).
// Everything else is B: one straight comet aimed at 0.84 of the reach, its round head landing ON the road among the foes (depth-
// sorted pixel by pixel: the head's lower half in front of the goblins it lands on, its upper half behind them), two pumped surges a
// loop that swell the head when they arrive, the mottled body streaming toward the head, the needle and spark at the staff.
// Round 16: the head's foot. FOOT = its width at the foot against the round head; FLAT = how much its bottom is pressed onto the road.
const FOOT = 1.4, FLAT = 0.2, GLOW = 1.2;
import * as K from "./fx-r14-kit.js";
const { N, FIRE, H, bay, P, Lart, aimAt, mkT, hallAt, mouthOf, road, GOB, gobItem, pool, sparks, heat } = K;
const INK = "#8a2028", WINE = "#6a1830";
const SW = [1.15, 1.08, 1.01, 0.96, 0.94, 0.95, 0.99, 1.08];          // the head's swell through one surge (8 frames)
const per = (i, n) => ((i % n) + n) % n;
const cell = (a, b, n) => H(per(a, n), b);                             // hashed cells, periodic along the jet (seamless loop)

const geom = (e) => {
  const ang = aimAt(e.i), t = mkT(ang), M = mouthOf(t), L = Lart();
  const R = 26 * SW[e.i % 8];
  const Gp = { x: Math.cos(ang) * L * 0.84, y: Math.sin(ang) * L * 0.84 };  // where the head lands on the road
  const Hc = { x: Gp.x, y: Gp.y - R * 0.45 };
  return { ang, t, M, L, R, Gp, Hc };
};

// every pixel of the jet with a ground depth (its y on the road), so goblins can stand in front of or behind it
const jetPixels = (e, g) => {
  const { M, R, Gp, Hc } = g, i = e.i, out = [];
  const dx = Hc.x - M.x, dy = Hc.y - M.y, Lt = Math.hypot(dx, dy), ux = dx / Lt, uy = dy / Lt;
  const tp = (i % 8) / 8 * 1.15 - 0.06;                                // the surge's place along the jet
  const R0 = 26, tf = Math.max(0.5, (Lt - 1.3 * R0) / Lt);             // where the head's flare begins along the jet
  const Wf = R0 * 0.5, Rj = Wf / tf, x0 = Math.min(M.x, Hc.x) - R * 1.6, x1 = Math.max(M.x, Hc.x) + R * 1.6;
  const y0 = Math.min(M.y, Hc.y) - R * 1.6, y1 = Math.max(M.y, Hc.y) + R * 1.6;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    const px = x + 0.5 - M.x, py = y + 0.5 - M.y, a = px * ux + py * uy, b = px * -uy + py * ux, tt = a / Lt;
    if (a < 3) continue;                                                // the little gap after the spark
    const pulse = Math.max(0, 1 - Math.abs(tt - tp) / 0.09);
    // the cone: a needle widening steadily (a straight taper) to half the head's width where the flare begins
    let qc = 9, w = 1;
    if (tt <= 1) { w = (0.7 + (Wf - 0.7) * Math.max(0, tt) / tf) * (1 + 0.3 * pulse); qc = Math.abs(b) / w; }
    // the head: a round bulb, a little long along the jet
    // ...its lower part spreads sideways (and flattens a little) toward the road, eased in below the head's middle
    const fy = Math.min(1, Math.max(0, (y + 0.5 - Hc.y) / (R * 0.65))), fs = fy * fy * (3 - 2 * fy);
    const hx = Hc.x - M.x + (x + 0.5 - Hc.x) / (1 + (FOOT - 1) * fs), hy = Hc.y - M.y + (y + 0.5 - Hc.y) * (1 + FLAT * fs);
    const ha = hx * ux + hy * uy, hb = hx * -uy + hy * ux;
    const qh = Math.hypot((ha - Lt) / (R * (ha < Lt ? 1.3 : 1.0)), hb / R);
    const k = 0.07, q = -k * Math.log(Math.exp(-qc / k) + Math.exp(-qh / k));   // one mass: soft union, a neck where they meet
    const head = qh < qc * 1.05, side = b > 0 ? 1 : -1;
    // ragged licks: periodic cells streaming toward the head, more of them toward the end
    const amp = head ? (y + 0.5 > Hc.y + R * 0.3 ? 0.05 : 0.12) : 0.05 + 0.2 * Math.max(0, tt), ab = a + 0.6 * Math.max(0, Math.abs(b) - Rj * tt);   // tongues lean back
    const lk = cell(Math.floor((ab - 4 * i) / 2), side * 7 + 3, 32), lk2 = cell(Math.floor((ab - 4 * i) / 4) + 5, side * 3 + 11, 16);
    const edge = 1 + amp * (lk * lk * lk * 2.2 + lk2 * 0.5 - 0.45);
    if (q > edge) continue;
    // mottled body: two layers of cells flowing at different speeds
    const m1 = cell(Math.floor((a - 6 * i) / 3), Math.floor(b / 3) + 50, 32), m2 = cell(Math.floor((a - 5 * i) / 5), Math.floor(b / 4) + 90, 16);
    const m = m1 * 0.6 + m2 * 0.4;
    let h = (1 - q) * 0.6 + (1 - 0.4 * Math.min(1, Math.max(0, tt))) * 0.2 + (m - 0.5) * 0.55 + 0.26 * pulse;
    if (tt < 0.12) h += (0.12 - tt) * 4;
    if (head) h += 0.06 - 0.25 * Math.max(0, qh - 0.7);
    let col = h > 0.96 ? FIRE[0] : h > 0.8 ? FIRE[1] : h > 0.56 ? FIRE[2] : h > 0.32 ? FIRE[3] : FIRE[4];
    // the pale core line, broken by the mottle, the whole way to the head
    if (Math.abs(b) < Math.max(1, w * 0.13) && tt > 0.03 && tt < 0.97 && m > 0.22) col = tt < 0.25 || pulse > 0.3 ? FIRE[0] : FIRE[1];
    // rim: deep red, the head's outer edge darker and redder, a broken tinted line below it
    const rim = edge - q;
    if (rim < 0.07) col = head && y + 0.5 > Hc.y + R * 0.3 && rim < 0.035 ? INK : head && y + 0.5 > Hc.y + R * 0.3 ? WINE : FIRE[4];
    else if (rim < 0.16 && (head || tt > 0.6) && bay(x, y) < 0.5) col = FIRE[4];
    // depth on the road: along the jet it moves from the hall's foot to the landing; the head's lower half comes forward
    const tg = Math.min(1, Math.max(0, tt));
    let dep = Gp.y * tg;
    if (head) dep = Gp.y + (y + 0.5 - Hc.y) * 0.9;
    out.push(x, y, col, dep);
  }
  return out;
};

// the spark at the staff's ring: a little star, white-gold, flickering
const nozzle = (c, M, i) => {
  const s = [2, 3, 2, 1][i % 4];
  P(c, M.x, M.y, FIRE[0]);
  for (let k = 1; k <= s; k++) { const col = k === s ? FIRE[2] : FIRE[1]; P(c, M.x + k, M.y, col); P(c, M.x - k, M.y, col); P(c, M.x, M.y + k, col); P(c, M.x, M.y - k, col); }
  if (s > 1) { P(c, M.x + 1, M.y + 1, FIRE[1], 0.8); P(c, M.x - 1, M.y - 1, FIRE[1], 0.8); }
};

// light on the road: only the landing's glow under the head (Round 14's lit streak from the hall's foot is gone, owner)
const groundLight = (c, g, i) => {
  const { Gp, R } = g;
  const rx = R * 1.7 * GLOW, ry = R * 0.62;                                   // where the head rests: a hot, stepped glow
  for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) {
    const d = Math.hypot(x / rx, y / ry); if (d > 1) continue;
    const st = Math.ceil((1 - d) * 4) / 4;
    if (bay(x + 512, y + 512) < st * 0.85) P(c, Gp.x + x, Gp.y + y + 3, st > 0.7 ? FIRE[0] : st > 0.4 ? FIRE[1] : FIRE[2], 0.78);
  }
};

export const paint = (c, e) => {
  const g = geom(e), { ang, t, M } = g, items = [];
  road(c, e.ground === "dark");
  heat(c, ang, e.i, 0.16, 0.25);                                      // the wedge, exactly
  pool(c, ang, 0.5, 1.05);
  groundLight(c, g, e.i);
  hallAt(c, t, 1.2);
  GOB.forEach((gb, k) => items.push(gobItem(c, e, gb, k, ang, 1.1)));
  items.sort((a, b) => a.y - b.y);
  // the jet drawn between the goblins by depth
  const px = jetPixels(e, g), cut = items.map((it) => it.y), nb = cut.length + 1, buckets = Array.from({ length: nb }, () => []);
  for (let j = 0; j < px.length; j += 4) { let b = 0; while (b < cut.length && px[j + 3] > cut[b]) b++; buckets[b].push(px[j], px[j + 1], px[j + 2]); }
  for (let b = 0; b < nb; b++) {
    const L = buckets[b]; for (let j = 0; j < L.length; j += 3) { c.fillStyle = L[j + 2]; c.fillRect(L[j], L[j + 1], 1, 1); }
    if (b < items.length) items[b].draw();
  }
  nozzle(c, M, e.i);
  sparks(c, ang, e.i, 10, 0.7, 0.62, 34);
};

export const note = "Round 15's version 1 with the bottom of the head spread a little more (about 1.4 times at the foot) and flattened slightly along the road, so the flame pools onto the goblins as one rounded mass; the glow where it lands is widened to match. The stem, the top of the head, the colours and the two pumped surges are unchanged.";
