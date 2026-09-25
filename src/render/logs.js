// ============ THE LOG ROLLER'S LOGS ============
// Drawn by draw.js for every rolling log in g.logs (engine: update.js).

import { rgba } from "./paint.js";

// ---- the Log Roller's barrels -----------------------------------------------
// A rolling trunk (or the Iron Drum, or the Powder Keg Run) drawn in its own
// frame: across = along the barrel, along = the way it rolls. Lit as a
// cylinder from the upper left, its grain / rivets turning with `spin` so it
// visibly rolls, cut ends showing their rings. Art-pixel rects, so it keeps
// the board's pixel grain even at an angle.
const LOGC = { lt: "#b8895a", md: "#8a6238", dk: "#5c3f24", ink: "#2c1c18", grain: "#4a3018", end: "#d8b884", ring: "#a8804e" };
const DRUMC = { lt: "#c4c8d0", md: "#8a909c", dk: "#565c68", ink: "#22222a", grain: "#3a3e48", end: "#9aa0ac", ring: "#6a707c" };
export const drawLog = (ctx, lg, time) => {
  const drum = !!lg.stun, keg = !!lg.blast;
  const C = drum ? DRUMC : LOGC;
  const half = lg.w * 0.5, R = drum ? 8 : 7;
  const px = 0.5;                                     // one art pixel
  const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h); };
  ctx.save();
  ctx.translate(Math.round(lg.x * 2) / 2, Math.round(lg.y * 2) / 2);
  ctx.rotate(lg.a + Math.PI / 2);
  // shadow and the dust it throws up behind
  ctx.fillStyle = "rgba(30,22,32,0.28)";
  ctx.fillRect(-half + 1, R - 1, lg.w + 2, 4);
  ctx.fillStyle = "rgba(190,172,140,0.55)";
  for (let i = 0; i < 5; i++) {
    const o = (lg.spin * 9 + i * 5.3) % 14;
    r(-half + i * (lg.w / 5) + 1, R + 1 + o * 0.6, 1.5 + (i & 1) * 0.5, 1, "rgba(190,172,140,0.55)");
  }
  // the body: an ink capsule — a barrel's silhouette has rounded shoulders,
  // not a crate's corners — then three tones round it
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.roundRect(-half - 1.5, -R - px, lg.w + 3, R * 2 + px * 2, [2.5]); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(-half - 0.5, -R, lg.w + 1, R * 2, [2]); ctx.clip();
  const bands = [[-R, 0.28 * R, C.lt], [-R + 0.28 * R, 1.1 * R, C.md], [0.38 * R, R - 0.38 * R, C.dk]];
  for (const [y0, h, c] of bands) r(-half - 0.5, y0, lg.w + 1, h, c);
  r(-half, -R, lg.w, px, drum ? "#eef0f4" : "#d8b07a");    // a glint along the top
  // what turns: bark grain and knots, or iron bands and rivets
  const turn = (k) => { const t = ((k + lg.spin * 1.6) % 4 + 4) % 4; return -R + 1 + (t / 4) * (2 * R - 2); };
  if (drum) {
    for (const bx of [-half + 1.5, 0 - 1, half - 3.5]) { r(bx, -R, 2.5, R * 2, C.dk); r(bx, -R, 2.5, px, C.lt); }
    for (let k = 0; k < 4; k++) { const y = turn(k); if (y < -R + 1 || y > R - 2) continue; for (const bx of [-half + 2.5, half - 2.5]) r(bx - 0.5, y, 1, 1, "#e0e4ea"); }
  } else {
    for (let k = 0; k < 4; k++) {
      const y = turn(k); if (y > R - 1) continue;
      r(-half + 1, y, lg.w - 2, px, C.grain);
      r(-half + 2 + ((k * 7) % Math.max(3, lg.w - 6)), y - px, 2, 1.5, C.dk);   // a knot riding the grain
    }
  }
  if (keg) {
    // powder packed under red-painted hoops, and the fuse sparking at one end
    for (const bx of [-half + lg.w * 0.25, half - lg.w * 0.25 - 2]) { r(bx, -R, 2, R * 2, "#b8483e"); r(bx, -R, 2, px, "#e08070"); }
    const sp = Math.sin(time * 26) > 0;
    r(half - 1, -R - 2.5, 1, 2, "#3a2a22");
    r(half - 1.5 + (sp ? 0.5 : 0), -R - 4, 1.5, 1.5, sp ? "#fff3d2" : "#f8d868");
    r(half + (sp ? 0 : -1), -R - 5, 0.5, 0.5, "#f09838");
  }
  ctx.restore();
  // the cut ends seen at a slant: narrow ellipses of pale wood with a ring
  // and a heart (iron caps with a boss on the drum)
  for (const s of [-1, 1]) {
    const ex = s * (half + 0.2);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(ex, 0, 2.2, R + px, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.end; ctx.beginPath(); ctx.ellipse(ex, 0, 1.6, R - 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ring; ctx.beginPath(); ctx.ellipse(ex, 0, 0.9, R * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    r(ex - 0.5, -0.5, 1, 1, drum ? C.ink : "#6a4a2c");
  }
  ctx.restore();
  if (lg.burn) {
    // pitch flames licking off the top as it rolls
    const nx = -Math.sin(lg.a), ny = Math.cos(lg.a);
    for (let i = 0; i < 3; i++) {
      const ph = (time * 3 + i * 0.33) % 1;
      const fx = lg.x + nx * (i - 1) * lg.w * 0.3, fy = lg.y + ny * (i - 1) * lg.w * 0.3 - 6 - ph * 6;
      r(fx, fy, 1, ph < 0.4 ? 2 : 1, ph < 0.3 ? "#f8d868" : ph < 0.6 ? "#f09838" : "#d0502e");
    }
  }
};
