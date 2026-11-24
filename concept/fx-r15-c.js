// Round 15, variation c on Round 14's B (Opus): "a stronger pump". Started as a copy of concept/fx-r14-b.js; see art/briefs/fx-round15.md.
// B's comet (needle at the staff, mottled body, pale core, back-leaning licks, a round head landing ON the road among the foes, depth-
// sorted pixel by pixel), with: a wider stem (a real body of flame well before the head), no lit trail on the road, and a pump the eye
// can follow: each surge is a fat, bright bulge (a pinch just behind it) rolling down the stem; when it lands the head squashes out
// wider and lower along the road, then springs back and settles. Two surges a loop (every 8 frames).
import * as K from "./fx-r14-kit.js";
const { N, FIRE, H, bay, P, Lart, aimAt, mkT, hallAt, mouthOf, road, GOB, gobItem, pool, sparks, heat } = K;
const INK = "#8a2028", WINE = "#6a1830";
const R0 = 26;                                                          // the head's resting radius (art px)
// through one surge (8 frames): the bulge's place along the stem, and the head's squash (x wider, y lower) as it lands
const TP = [-0.04, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
const SX = [1.4, 1.24, 1.06, 0.95, 0.94, 0.97, 1.0, 1.08];
const SY = [0.7, 0.8, 0.96, 1.06, 1.04, 1.0, 0.98, 0.9];
const REACH = [0.1, 0, 0, 0, 0.15, 0.55, 0.9, 0.6];                    // the head reaching back up the stem to take the surge in
const per = (i, n) => ((i % n) + n) % n;
const cell = (a, b, n) => H(per(a, n), b);                             // hashed cells, periodic along the jet (seamless loop)

const geom = (e) => {
  const ang = aimAt(e.i), t = mkT(ang), M = mouthOf(t), L = Lart();
  const f = e.i % 8, sx = SX[f], sy = SY[f], R = R0;
  const Gp = { x: Math.cos(ang) * L * 0.84, y: Math.sin(ang) * L * 0.84 };  // where the head lands on the road
  const Hc = { x: Gp.x, y: Gp.y - R0 * sy * 0.45 };                    // squashed lower: its foot stays on the road
  return { ang, t, M, L, R, sx, sy, f, Gp, Hc };
};

// every pixel of the jet with a ground depth (its y on the road), so goblins can stand in front of or behind it
const jetPixels = (e, g) => {
  const { M, R, sx, sy, f, Gp, Hc } = g, i = e.i, out = [], Rx = R * sx, Ry = R * sy;
  const dx = Hc.x - M.x, dy = Hc.y - M.y, Lt = Math.hypot(dx, dy), ux = dx / Lt, uy = dy / Lt;
  const tp = TP[f];                                                    // the surge's place along the jet
  const land = Math.max(0, sx - 1) / 0.4;                               // 1 the frame the surge lands, easing out
  const Rj = R * 0.56, x0 = Math.min(M.x, Hc.x) - R * 2, x1 = Math.max(M.x, Hc.x) + R * 2;
  const y0 = Math.min(M.y, Hc.y) - R * 1.6, y1 = Math.max(M.y, Hc.y) + R * 1.6;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    const px = x + 0.5 - M.x, py = y + 0.5 - M.y, a = px * ux + py * uy, b = px * -uy + py * ux, tt = a / Lt;
    if (a < 3) continue;                                                // the little gap after the spark
    const dp = (tt - tp) / (tt > tp ? 0.1 : 0.2), pulse = Math.abs(dp) < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * dp) : 0;   // the bulge, a smooth swell
    const dq = (tt - tp + 0.2) / 0.08, pinch = Math.abs(dq) < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * dq) : 0;   // a neck just behind it
    // the cone: a needle widening steadily, a real body of flame well before the head
    let qc = 9;
    if (tt <= 1) { const w = ((0.7 + (Rj - 0.7) * Math.pow(Math.max(0, tt), 0.85)) * (1 + 0.85 * pulse * Math.min(1, tt * 4)) + 2.5 * pulse * Math.min(1, tt * 5)) * (1 - 0.1 * pinch); qc = Math.abs(b) / w; }
    // the head: a round bulb, a little long along the jet behind, squashed wide and low on the road as a surge lands
    const qj = a < Lt ? Math.hypot((a - Lt) / (R * (1.3 + 0.9 * REACH[f])), b / (R * (1 - 0.15 * REACH[f]))) : 9, hx = x + 0.5 - Hc.x, hy = y + 0.5 - Hc.y;
    const qh = Math.min(qj, Math.hypot(hx / Rx, hy / (hy > 0 ? Ry * 0.9 : Ry)));
    const k = 0.07, q = -k * Math.log(Math.exp(-qc / k) + Math.exp(-qh / k));   // one mass: soft union, a neck where they meet
    const head = qh < qc * 1.05, side = b > 0 ? 1 : -1;
    // ragged licks: periodic cells streaming toward the head, more of them toward the end
    const amp = head ? (y + 0.5 > Hc.y + Ry * 0.3 ? 0.05 : 0.12 + 0.06 * land) : 0.05 + 0.2 * Math.max(0, tt), ab = a + 0.6 * Math.max(0, Math.abs(b) - Rj * tt);   // tongues lean back
    const lk = cell(Math.floor((ab - 4 * i) / 2), side * 7 + 3, 32), lk2 = cell(Math.floor((ab - 4 * i) / 4) + 5, side * 3 + 11, 16);
    const edge = 1 + amp * (lk * lk * lk * 2.2 + lk2 * 0.5 - 0.45);
    if (q > edge) continue;
    // mottled body: two layers of cells flowing at different speeds
    const m1 = cell(Math.floor((a - 6 * i) / 3), Math.floor(b / 3) + 50, 32), m2 = cell(Math.floor((a - 5 * i) / 5), Math.floor(b / 4) + 90, 16);
    const m = m1 * 0.6 + m2 * 0.4;
    let h = (1 - q) * 0.6 + (1 - 0.4 * Math.min(1, Math.max(0, tt))) * 0.2 + (m - 0.5) * 0.55 + 0.42 * pulse - 0.1 * pinch;
    if (tt < 0.12) h += (0.12 - tt) * 4;
    if (head) h += 0.06 + 0.22 * land - 0.25 * Math.max(0, qh - 0.7);
    let col = h > 0.96 ? FIRE[0] : h > 0.8 ? FIRE[1] : h > 0.56 ? FIRE[2] : h > 0.32 ? FIRE[3] : FIRE[4];
    // the pale core line, broken by the mottle, the whole way to the head
    if (Math.abs(b) < 1 + 1.2 * pulse && tt > 0.03 && tt < 0.97 && m > 0.22) col = tt < 0.25 || pulse > 0.3 ? FIRE[0] : FIRE[1];
    // rim: deep red, the head's outer edge darker and redder, a broken tinted line below it
    const rim = edge - q;
    const low = head && y + 0.5 > Hc.y + Ry * 0.3;
    if (rim < 0.07) col = low && rim < 0.035 ? INK : low ? WINE : FIRE[4];
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

// the landing's glow under the head (no trail on the road: the owner); it spreads with the squash
const groundLight = (c, g) => {
  const { Gp, R, sx } = g;
  const rx = R * 1.7 * sx, ry = R * 0.62 * (0.5 + 0.5 * sx);                                   // where the head rests: a hot, stepped glow
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
  groundLight(c, g);
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

export const note = "3, a stronger pump: the stem is a real body of flame well before the head, and twice a loop a fat, bright bulge of fire rolls down it you can follow by eye. When it lands the head squashes out wider and lower along the road over the goblins, then springs back and settles. No trail of light on the road; the landing glow under the head spreads with each squash.";
