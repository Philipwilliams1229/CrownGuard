// ============ THE MASONS' BARRICADES ============
// The castle works' Masons' Guild (data/castle.js masons) sets rows of spiked
// barricades across the road before the Gate Guard after every wave
// (engine/update.js syncBarricades): one hedgehog of sharpened oak stakes to
// a lane. Painted once per look into a small sprite (art pixels, 2 per world
// unit, like traps.js) and stamped; a frame that has taken a beating shows it
// (worn, then broken), and shudders for a moment after each blow.
// Called by draw.js with the trapsmith's work, flush with the road, under the
// crowd.

import { INK_LINE, hash } from "./paint.js";
import { inkTint as inkOutline } from "./inktint.js";
import { lanePos } from "../engine/path.js";

const A = 2;
const OAK = { hi: "#d8b07a", lt: "#b8895a", md: "#8a6238", dk: "#5c3f24", dp: "#3e2a1c" };
const PALE = { hi: "#f4e6c4", lt: "#e2cc98", md: "#c9ad78" };       // a freshly cut point
const STEEL = { hi: "#eef0f4", lt: "#c4c8d0", md: "#8a909c", dk: "#565c68" };
const GLINT = "#fff3d2";

const canvas = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.imageSmoothingEnabled = false;
  return [cv, c];
};
const P = (c, x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
// a stake from (x0,y0) (its foot, at the hub) to (x1,y1) (its point): `w` thick
// at the foot, tapering to a pale point over its last `tip` px; lit on the
// upper-left face, shaded on the lower-right
const stake = (c, x0, y0, x1, y1, w, tip = 6, cut = 1, seed = 0) => {
  const dx = x1 - x0, dy = y1 - y0, full = Math.hypot(dx, dy), len = full * cut, ex = x0 + (dx / full) * len, ey = y0 + (dy / full) * len;
  const ux = dx / full, uy = dy / full;
  let nx = -uy, ny = ux;
  if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }          // normal on the lit (up / left) side
  const broken = cut < 1;
  for (let y = Math.floor(Math.min(y0, ey) - w); y <= Math.ceil(Math.max(y0, ey) + w); y++) {
    for (let x = Math.floor(Math.min(x0, ex) - w); x <= Math.ceil(Math.max(x0, ex) + w); x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0;
      const d = px * ux + py * uy, t = d / full;
      if (t < 0 || d > len) continue;
      const s = px * nx + py * ny;                                      // across the stake
      // a whole stake tapers to its point; a snapped one stays blunt, with a ragged top
      const half = (w / 2) * Math.min(1, Math.max(0.12, (1 - t) * (full / tip)));
      if (Math.abs(s) > half) continue;
      if (broken && d > len - 2.2 && hash(x + seed * 3, y * 5) < 0.4 + (len - d) * 0.15) continue;
      const point = !broken && t > 1 - tip / full;
      const k = s / half;
      const C = point ? PALE : OAK;
      let col = k < -0.35 ? C.hi : k < 0.35 ? C.lt : C.md;
      if (!point && k > 0.62) col = OAK.dk;
      // grain: dark streaks along the length, broken up by the hash
      if (!point && k > -0.6 && k < 0.8 && hash(Math.round(s * 1.6) + seed * 7, Math.floor(d / 4)) > 0.7) col = k < 0.35 ? OAK.md : OAK.dk;
      // the iron band that holds the stake to its hub
      if (!point && d > 5.2 && d < 7.4) col = d < 6.2 ? STEEL.lt : STEEL.dk;
      // a snapped end shows pale heartwood
      if (broken && d > len - 1.6) col = k < 0.2 ? PALE.lt : PALE.md;
      P(c, x, y, col);
    }
  }
  // the point's glint, or a splinter hanging off a snapped end
  if (!broken) P(c, ex - ux * 0.5, ey - uy * 0.5, GLINT);
  else { P(c, ex + ux * 1.4 + nx, ey + uy * 1.4 + ny, PALE.md); P(c, ex - nx * 1.2, ey - ny * 1.2 + 1, OAK.dk); }
};
const soilShade = (c, cx, cy, rx, ry) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
    if (d > 1 || (d > 0.7 && (x + y) & 1)) continue;
    P(c, x, y, d < 0.55 ? "rgba(34,22,34,0.34)" : "rgba(34,22,34,0.22)");
  }
};

// look 0 whole, 1 worn (a stake snapped short, splinters), 2 broken (two stakes
// left, one leaning)
const W_ = 46, H_ = 36, HX = 23, HY = 21;
const bakeLook = (look) => {
  const [cv, c] = canvas(W_, H_);
  soilShade(c, HX, HY + 7, 17, 5.5);
  const [bv, b] = canvas(W_, H_);
  // back stakes first, then the hub, then the front ones
  const back = [[HX, HY, 5, 5], [HX, HY, W_ - 6, 6]];
  const front = [[HX, HY, 7, H_ - 6], [HX, HY, W_ - 8, H_ - 7]];
  const cuts = look === 0 ? [1, 1, 1, 1] : look === 1 ? [1, 0.85, 1, 0.5] : [0.55, 0, 1, 0.4];
  back.forEach(([x0, y0, x1, y1], i) => { if (cuts[i] > 0) stake(b, x0, y0, x1, y1, 4, 7, cuts[i], i); });
  stake(b, HX, HY, HX, 3, 4, 8, look === 2 ? 0.45 : 1, 5);                   // the upright
  front.forEach(([x0, y0, x1, y1], i) => { if (cuts[2 + i] > 0) stake(b, x0, y0, x1, y1, 4.5, 7, cuts[2 + i], 8 + i); });
  // the iron hub and its band
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
    const d = Math.hypot(x, y * 1.1);
    if (d > 3.2) continue;
    P(b, HX + x, HY + y, d < 1.4 ? STEEL.hi : d < 2.4 ? STEEL.lt : STEEL.dk);
  }
  P(b, HX - 1, HY - 1, GLINT);
  inkOutline(bv, INK_LINE, 1);
  c.drawImage(bv, 0, 0);
  if (look > 0) {                                                           // splinters on the ground
    for (let i = 0; i < 5; i++) P(c, HX - 10 + hash(i, look) * 20, HY + 6 + hash(look, i) * 6, i & 1 ? OAK.lt : OAK.dk);
  }
  return { cv, w: W_ / A, h: H_ / A };
};
const LOOKS = [];
const put = (ctx, s, x, y) => ctx.drawImage(s.cv, Math.round((x - HX / A) * A) / A, Math.round((y - (HY + 5) / A) * A) / A, s.w, s.h);

export const drawBarricades = (ctx, g) => {
  const rows = g.barricades;
  if (!rows || !rows.length || typeof document === "undefined") return;
  const tms = (g.time || 0) * 1000;
  for (const row of rows) {
    for (const sg of row.segs) {
      if (sg.hp <= 0) continue;
      const f = sg.hp / sg.maxHp, look = f > 0.6 ? 0 : f > 0.3 ? 1 : 2;
      const [x, y] = lanePos(row.dist, sg.lane);
      // it shudders for a moment after a blow
      const sh = sg.hitAt && tms - sg.hitAt < 160 ? (Math.floor(tms / 40) % 2 ? 0.5 : -0.5) : 0;
      put(ctx, LOOKS[look] || (LOOKS[look] = bakeLook(look)), x + sh, y);
    }
  }
};
