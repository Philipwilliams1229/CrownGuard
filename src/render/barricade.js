// ============ THE MASONS' BARRICADES ============
// The castle works' Masons' Guild (data/castle.js masons) sets rows of spiked
// barricades across the road before the Gate Guard after every wave
// (engine/update.js syncBarricades): one hedgehog to a lane: oak stakes (`mat` "wood"), iron-shod dark oak
// ("iron") or bright steel spikes ("steel"); hp 0 draws a low wreck. Painted once per look into a small sprite (art pixels, 2 per world
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
// materials: wood is today's oak hedgehog; iron is dark oak shod in iron; steel is bright steel spikes
const IRON = { hi: "#aab0bc", lt: "#7c8390", md: "#565c68", dk: "#3a3f4a" };
const OAKD = { hi: "#7a5634", lt: "#5e4026", md: "#46301e", dk: "#2e2016" };
const SHINE = { hi: "#ffffff", lt: "#eef2f8", md: "#bcc6d6", dk: "#7e8aa0", dp: "#4e5a70" };
const MATS = {
  wood: { body: OAK, grain: true, point: PALE, tipCol: null, bands: [[5.2, 7.4, STEEL.lt, STEEL.dk]], rivets: [], end: PALE, glint: GLINT, hub: [STEEL.hi, STEEL.lt, STEEL.dk], hubR: 3.2 },
  iron: { body: OAKD, grain: true, point: IRON, tipCol: 1, bands: [[4.4, 6.6, IRON.lt, IRON.dk], [11.6, 13.6, IRON.lt, IRON.dk]], rivets: [5.5, 12.6], end: PALE, glint: "#e8ecf4", hub: [IRON.hi, IRON.md, IRON.dk], hubR: 3.6 },
  steel: { body: SHINE, grain: false, point: SHINE, tipCol: 1, bands: [[4.6, 5.8, SHINE.dk, SHINE.dp]], rivets: [], end: SHINE, glint: "#ffffff", hub: [SHINE.hi, SHINE.md, SHINE.dk], hubR: 4.2, fuller: true },
};

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
const stake = (c, x0, y0, x1, y1, w, tip = 6, cut = 1, seed = 0, M = MATS.wood) => {
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
      const OAKX = M.body, C = point ? M.point : OAKX;
      let col = k < -0.35 ? C.hi : k < 0.35 ? C.lt : C.md;
      if (!point && k > 0.62) col = OAKX.dk;
      if (point && k > 0.62 && M.tipCol) col = C.dk || C.md;
      if (M.fuller && !point && Math.abs(k) < 0.14) col = OAKX.md;           // the groove down a steel blade
      // grain: dark streaks along the length, broken up by the hash
      if (M.grain && !point && k > -0.6 && k < 0.8 && hash(Math.round(s * 1.6) + seed * 7, Math.floor(d / 4)) > 0.7) col = k < 0.35 ? OAKX.md : OAKX.dk;
      // the iron bands that hold the stake to its hub
      if (!point) for (const [d0, d1, ca, cb] of M.bands) if (d > d0 && d < d1) col = d < (d0 + d1) / 2 ? ca : cb;
      for (const rv of M.rivets) if (!point && Math.abs(d - rv) < 0.6 && Math.abs(s) < 0.7) col = IRON.hi;   // a rivet head
      // a snapped end shows pale heartwood (bright cut metal on steel)
      if (broken && d > len - 1.6) col = k < 0.2 ? M.end.lt : M.end.md;
      P(c, x, y, col);
    }
  }
  // the point's glint, or a splinter hanging off a snapped end
  if (!broken) P(c, ex - ux * 0.5, ey - uy * 0.5, M.glint);
  else { P(c, ex + ux * 1.4 + nx, ey + uy * 1.4 + ny, M.end.md); P(c, ex - nx * 1.2, ey - ny * 1.2 + 1, M.body.dk); }
};
const soilShade = (c, cx, cy, rx, ry) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
    if (d > 1 || (d > 0.7 && (x + y) & 1)) continue;
    P(c, x, y, d < 0.55 ? "rgba(34,22,34,0.34)" : "rgba(34,22,34,0.22)");
  }
};

// look 0 whole, 1 worn (a stake snapped short, splinters), 2 broken (two stakes
// left, one leaning); look 3 is the WRECK (hp 0): low stumps and spikes lying flat
const W_ = 46, H_ = 36, HX = 23, HY = 21;
const bakeLook = (mat, look) => {
  const M = MATS[mat] || MATS.wood;
  const [cv, c] = canvas(W_, H_);
  soilShade(c, HX, HY + 7, 17, 5.5);
  const [bv, b] = canvas(W_, H_);
  if (look === 3) {
    // everything lies on the ground: the hub tipped over, short blunt stumps, one spike thrown flat
    const y = HY + 5;
    stake(b, HX - 12, y + 3, HX - 1, y + 1, 4, 7, 0.6, 21, M);                // a stump, snapped
    stake(b, HX + 3, y - 1, HX + 15, y + 3, 4, 7, 0.45, 22, M);               // another
    stake(b, HX + 2, y + 5, HX + 15, y + 7, 3.5, 7, 1, 23, M);                // a whole spike lying flat
    stake(b, HX - 14, y + 7, HX - 5, y + 8, 3.5, 7, 0.5, 24, M);
    for (let yy = -2; yy <= 2; yy++) for (let x = -3; x <= 3; x++) {          // the hub, lying on its side
      const d = Math.hypot(x / 1.4, yy);
      if (d > 2.4) continue;
      P(b, HX + x, y + yy + 1, d < 1.2 ? M.hub[0] : d < 1.9 ? M.hub[1] : M.hub[2]);
    }
    inkOutline(bv, INK_LINE, 1);
    c.drawImage(bv, 0, 0);
    for (let i = 0; i < 8; i++) P(c, HX - 14 + hash(i, 9) * 28, y - 2 + hash(9, i) * 10, i & 1 ? M.body.lt : M.body.dk);
    return { cv, w: W_ / A, h: H_ / A };
  }
  // back stakes first, then the hub, then the front ones
  const back = [[HX, HY, 5, 5], [HX, HY, W_ - 6, 6]];
  const front = [[HX, HY, 7, H_ - 6], [HX, HY, W_ - 8, H_ - 7]];
  const cuts = look === 0 ? [1, 1, 1, 1] : look === 1 ? [1, 0.85, 1, 0.5] : [0.55, 0, 1, 0.4];
  const tip = mat === "wood" ? 7 : 9;
  back.forEach(([x0, y0, x1, y1], i) => { if (cuts[i] > 0) stake(b, x0, y0, x1, y1, 4, tip, cuts[i], i, M); });
  stake(b, HX, HY, HX, 3, 4, tip + 1, look === 2 ? 0.45 : 1, 5, M);          // the upright
  front.forEach(([x0, y0, x1, y1], i) => { if (cuts[2 + i] > 0) stake(b, x0, y0, x1, y1, 4.5, tip, cuts[2 + i], 8 + i, M); });
  // the hub and its band
  const R = M.hubR;
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
    const d = Math.hypot(x, y * 1.1);
    if (d > R) continue;
    P(b, HX + x, HY + y, d < R * 0.45 ? M.hub[0] : d < R * 0.75 ? M.hub[1] : M.hub[2]);
  }
  if (mat === "iron") for (const [rx, ry] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) P(b, HX + rx, HY + ry, IRON.hi);   // rivets
  if (mat === "steel") { P(b, HX, HY, SHINE.dp); P(b, HX - 1, HY - 1, "#ffffff"); P(b, HX - 2, HY - 2, "#ffffff"); }
  else P(b, HX - 1, HY - 1, GLINT);
  inkOutline(bv, INK_LINE, 1);
  c.drawImage(bv, 0, 0);
  if (look > 0) {                                                           // splinters (shards on metal) on the ground
    for (let i = 0; i < 5; i++) P(c, HX - 10 + hash(i, look) * 20, HY + 6 + hash(look, i) * 6, i & 1 ? M.body.lt : M.body.dk);
  }
  return { cv, w: W_ / A, h: H_ / A };
};
const LOOKS = {};
export const barricadeSprite = (mat, look) => { const k = (MATS[mat] ? mat : "wood") + look; return LOOKS[k] || (LOOKS[k] = bakeLook(MATS[mat] ? mat : "wood", look)); };
const put = (ctx, s, x, y) => ctx.drawImage(s.cv, Math.round((x - HX / A) * A) / A, Math.round((y - (HY + 5) / A) * A) / A, s.w, s.h);

export const drawBarricades = (ctx, g) => {
  const rows = g.barricades;
  if (!rows || !rows.length || typeof document === "undefined") return;
  const tms = (g.time || 0) * 1000;
  for (const row of rows) {
    for (const sg of row.segs) {
      const f = sg.hp / sg.maxHp, look = sg.hp <= 0 ? 3 : f > 0.6 ? 0 : f > 0.3 ? 1 : 2;
      const [x, y] = lanePos(row.dist, sg.lane);
      // it shudders for a moment after a blow
      const sh = sg.hitAt && tms - sg.hitAt < 160 ? (Math.floor(tms / 40) % 2 ? 0.5 : -0.5) : 0;
      put(ctx, barricadeSprite(sg.mat, look), x + (look === 3 ? 0 : sh), y);
    }
  }
};

// Each frame's health (owner, 2026-11-18), drawn over the crowd (draw.js, after the figures) so the
// foes hacking at it never hide it: a slim bar under the frame in a stone rim, once it has been hurt.
export const drawBarricadeBars = (ctx, g) => {
  const rows = g.barricades;
  if (!rows || !rows.length) return;
  for (const row of rows) for (const sg of row.segs) {
    if (sg.hp <= 0 || sg.hp >= sg.maxHp) continue;
    const pct = sg.hp / sg.maxHp, [x, y] = lanePos(row.dist, sg.lane);
    // (UNDER the frame, at road level, in a pale stone rim: the foes' own bars ride over their heads
    // just above, so a bar here never reads as one of theirs)
    const w = 14, x0 = Math.round(x - w / 2), y0 = Math.round(y + 7);
    ctx.fillStyle = "#c9c2b2"; ctx.fillRect(x0 - 2, y0 - 2, w + 4, 6);
    ctx.fillStyle = "rgba(36,26,38,0.9)"; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 4);
    ctx.fillStyle = pct > 0.5 ? "#7cc05e" : pct > 0.25 ? "#e0b84a" : "#d0564a";
    ctx.fillRect(x0, y0, Math.max(1, Math.round(w * pct)), 2);
  }
};
