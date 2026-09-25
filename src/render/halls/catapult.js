// ============ HALL: THE CATAPULT ============
// A siege engine on a wheeled bed, seen side-on in the 3/4 light. The
// mangonel's arm is winched down by the engineer at the back, a stone set in
// its cup, and when it looses it slams up into the padded stop. It GROWS:
// a rope-lashed field engine with plank wheels at one, iron-shod at two, a
// full carriage with a crate of dressed shot at three.
//   The Trebuchet stands twice as tall: a trestle, a counterweight box, a
// long arm with a sling that whips over the top. The Earthshaker hangs a
// carved granite block on it and cracks the ground; the Comet Sling chars
// its timbers over a pitch cauldron and flings its stone alight.
//   The Log Roller stops throwing: a sloped ramp and a great trimmed log,
// end-on, held by a chock the engineer knocks out with a lever. The Iron
// Drum rolls an iron-banded drum; the Powder Keg Run straps kegs to it.
//
// Pixel art: the ground, the back of the engine and its near frame are
// baked per form and facing; the arm is baked at quantised angles, so it
// swings in crisp steps; stones, sling and fire are stamped or painted live.

import { OAKWOOD, TIMBER, pennant, spriteCache, stamp, canBake } from "../buildkit.js";
import {
  IRON, ROPE, PITCH, readiness, foot, padB, skirtB, beam, planks, wheel, barrel, crate, rope, coil, boulder,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { drawCrew, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetCatapultBakes = () => cache.clear();
const BOX = { left: 44, right: 44, up: 78, down: 18 };
const WOOD = "#7a5634", ARM = "#9a6c40", WOOD_DK = "#4e3520", CHAR = "#4a3a34", GRANITE = "#8a8a94";
const D2R = Math.PI / 180;

// The numbers of one form's engine: where the arm pivots, how long it is,
// and the angles it rests, cocks and stops at (degrees from straight up,
// positive toward the target).
const spec = (t) => {
  const lvl = t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const hw = 10.5 + lvl * 0.5 + (t.branch ? 0.5 : 0);   // the bed's half-length: it must keep off the road
  if (t.branch === "a") return { hw, treb: true, px: 3, fh: 34, L: 26, butt: 8, cocked: -118, stop: 48, rest: 0, key: r4 || "a" };
  if (t.branch === "b") return { hw, roller: true, key: r4 || "b" };
  return { hw, px: 3, fh: 20 + lvl, L: 16 + lvl, butt: 3, cocked: -135, stop: 40, rest: 40, key: "l" + lvl };
};

// ---- the ground it stands on ----------------------------------------------
const paintGround = (ctx, t, x, y, f) => {
  const s = spec(t), hw = s.hw, r4 = t.rank4 ? t.branch + t.rank4 : null;
  padB(ctx, x, y, t.id, { hw });
  if (r4 === "aa") {
    // the Earthshaker has cracked its own ground
    ctx.strokeStyle = "rgba(46,34,30,0.6)"; ctx.lineWidth = 0.9; ctx.lineCap = "round";
    for (const [dx, dy, a] of [[-16, 4, 0.3], [5, 8, -0.4], [-7, 11, 0.1], [3, 3, 0.6], [-12, 9, -0.2]]) {
      ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + dx + 4, y + dy + 2 + a * 3); ctx.lineTo(x + dx + 6, y + dy + a * 4); ctx.lineTo(x + dx + 10, y + dy + 1.5 + a * 2);
      ctx.stroke();
    }
    for (const [dx, dy] of [[-14, 8], [13, 9], [2, 12]]) boulder(ctx, x + dx, y + dy, 1.6, "#8a7e6c", dx);
  }
  if (r4 === "ab") soft(ctx, x - f * (hw - 2), y + 4, 10, 4, [[0, "rgba(40,30,34,0.35)"], [1, "rgba(40,30,34,0)"]]);   // soot
  skirtB(ctx, x, y, t.id);
};

// ---- the back of the engine: bed, far frame, winch, stop ------------------
const bed = (ctx, x, y, hw, col, lvl, f) => {
  // far wheels peek out behind the bed
  if (lvl >= 3) for (const sgn of [-1, 1]) wheel(ctx, x + sgn * (hw - 5) + 1, y - 5, 4.6, darken(WOOD_DK, 0.2), { spokes: 6, rim: darken(IRON, 0.3) });
  // top face of the bed, then its planked side
  part(ctx, (c) => {
    c.fillStyle = lin(c, x - hw, y - 9, x + hw, y - 5, [[0, lighten(col, 0.35)], [1, lighten(col, 0.1)]]);
    c.beginPath(); c.moveTo(x - hw + 1, y - 9); c.lineTo(x + hw - 1, y - 9); c.lineTo(x + hw, y - 5); c.lineTo(x - hw, y - 5); c.closePath(); c.fill();
    c.fillStyle = rgba(darken(col, 0.5), 0.35);
    for (let px = x - hw + 3; px < x + hw - 1; px += 3.5) c.fillRect(px, y - 9, 0.6, 4);
  });
  planks(ctx, x - hw, y - 5, hw * 2, 6, darken(col, 0.08), 4.2, hw);
  // iron corner straps from level two
  if (lvl >= 2) part(ctx, (c) => {
    c.fillStyle = IRON;
    for (const sx of [x - hw, x + hw - 2.2]) { c.fillRect(sx, y - 5, 2.2, 6); c.fillStyle = "#8a909c"; c.fillRect(sx + 0.4, y - 4.4, 0.8, 0.8); c.fillRect(sx + 0.4, y - 1, 0.8, 0.8); c.fillStyle = IRON; }
  });
  if (lvl >= 3) part(ctx, (c) => { c.fillStyle = "#a04a3f"; c.fillRect(x - hw + 3, y - 1.6, hw * 2 - 6, 1.2); });   // a painted trim
};

const aFrame = (ctx, x, y, s, lvl, col, near, f) => {
  const px = x + f * s.px, py = y - s.fh + (near ? 2 : 0);
  const base = near ? y - 4.5 : y - 7.5;
  const back = x - f * (s.hw - (near ? 4 : 5)), front = x + f * (s.hw - (near ? 3 : 4));
  const w = s.treb ? 3.4 : lvl >= 3 ? 3 : 2.6;
  const c2 = near ? col : darken(col, 0.28);
  const bands = lvl >= 2 || s.treb ? [0.3, 0.72] : null;
  beam(ctx, back, base, px - f * 0.8, py, w, c2, { bands });
  beam(ctx, front, base, px + f * 0.8, py, w, c2, { bands });
  // the cross-brace (and a trestle rung for the tall frame)
  const k = s.treb ? 0.42 : 0.5;
  beam(ctx, back + (px - back) * k, base + (py - base) * k, front + (px - front) * k, base + (py - base) * k, 2, darken(c2, 0.08));
  // rope lashing where the legs meet (level one) — iron cap after
  if (near) {
    if (lvl === 1 && !s.treb) part(ctx, (c) => { c.fillStyle = ROPE; c.fillRect(px - 2, py - 1, 4, 2.6); c.fillStyle = darken(ROPE, 0.4); c.fillRect(px - 2, py + 0.2, 4, 0.5); });
    else part(ctx, (c) => ball(c, px, py, 2.2, 2.2, IRON, { hi: 0.5, lo: 0.4 }));
  }
};

const paintBack = (ctx, t, x, y, f) => {
  const s = spec(t), hw = s.hw, lvl = t.branch ? 3 : t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const col = r4 === "ab" ? CHAR : r4 === "aa" ? "#6a5a48" : TIMBER;
  if (s.roller) return paintRamp(ctx, t, x, y, f, s);
  // spare shot behind the bed
  if (lvl >= 3) {
    crate(ctx, x + f * (hw - 3), y - 8, 9, 6, darken(TIMBER, 0.1));
    for (const [dx, dy, r] of [[-2.2, -8.8, 2], [1.8, -8.6, 2.1], [0, -10.4, 1.9]]) boulder(ctx, x + f * (hw - 3 + dx), y + dy, r, s.key === "aa" ? GRANITE : "#8e8c94", dx * 3);
  }
  if (!t.branch && lvl < 3) {
    // the pile of field stones, behind the bed at the front
    const pts = lvl === 1 ? [[0, 0, 2.4], [3, 0.6, 2]] : [[0, 0, 2.4], [3.4, 0.6, 2.2], [1.6, -2.2, 2.1], [-2.6, 0.8, 1.8]];
    for (const [dx, dy, r] of pts) boulder(ctx, x + f * (hw - 3 + dx * 0.8), y - 8.5 + dy, r, "#8e8c94", dx * 7);
  }
  if (r4 === "ab") {
    // the pitch cauldron over its fire, behind the far wheel
    part(ctx, (c) => { for (const dx of [-3, 0, 3]) cylinder(c, x - f * (hw - 2) + dx - 0.6, y - 12, 1.2, 6, WOOD_DK, { r: 0.5 }); });
    part(ctx, (c) => { ball(c, x - f * (hw - 2), y - 13, 5, 3.6, "#3a3440", { hi: 0.35, lo: 0.45 }); ball(c, x - f * (hw - 2), y - 15.6, 3.8, 1.1, PITCH, { hi: 0.1, lo: 0.1 }); });
  }
  if (!t.branch && lvl === 1) {
    // plank wheels: solid discs
    for (const sgn of [-1, 1]) part(ctx, (c) => { ball(c, x + sgn * (hw - 5), y - 5, 4, 4, darken(WOOD_DK, 0.2), { hi: 0.3, lo: 0.4 }); });
  }
  aFrame(ctx, x, y, s, lvl, col, false, f);
  bed(ctx, x, y, hw, col, lvl, f);
  // the stop: a padded post the arm slams into
  if (!s.treb) {
    const sx = x + f * (s.px + 7), top = y - s.fh - 7;
    beam(ctx, sx, y - 6, sx, top, 2.6, darken(col, 0.05), { bands: lvl >= 2 ? [0.25] : null });
    beam(ctx, sx, y - s.fh * 0.45, x + f * (hw - 3), y - 6, 1.8, darken(col, 0.15));
    part(ctx, (c) => {   // the straw sack, roped on
      ball(c, sx - f * 1.5, top + 2.6, 1.9, 2.6, "#b8a070", { hi: 0.4, lo: 0.45 });
      c.fillStyle = darken(ROPE, 0.35); c.fillRect(sx - f * 1.5 - 1.8, top + 2.2, 3.6, 0.6);
    });
  }
  // the winch at the back of the bed
  const wx = x - f * (hw - 3), wy = y - 10;
  part(ctx, (c) => { for (const sgn of [-1, 1]) cylinder(c, wx + sgn * 2.6 - 0.8, wy - 1, 1.6, 6, WOOD_DK, { r: 0.6 }); });
  part(ctx, (c) => {
    cylinder(c, wx - 2.4, wy - 2.2, 4.8, 4.4, WOOD_DK, { r: 1.8, hi: 0.35, lo: 0.45 });
    c.fillStyle = ROPE; c.fillRect(wx - 2.2, wy - 1.2, 4.4, 0.8); c.fillRect(wx - 2.2, wy + 0.4, 4.4, 0.8);
  });
  if (s.treb) {
    // the trough the sling pouch lies in when cocked
    part(ctx, (c) => { c.fillStyle = darken(col, 0.35); c.fillRect(x - f * (hw - 2) - 4, y - 9.6, 8, 1.6); });
  }
};

// ---- the near frame and wheels, in front of the arm ------------------------
const paintFront = (ctx, t, x, y, f) => {
  const s = spec(t), hw = s.hw, lvl = t.branch ? 3 : t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const col = r4 === "ab" ? CHAR : r4 === "aa" ? "#6a5a48" : TIMBER;
  if (s.roller) return paintRampFront(ctx, t, x, y, f, s);
  aFrame(ctx, x, y, s, lvl, col, true, f);
  // near wheels
  for (const sgn of [-1, 1]) {
    const wx = x + sgn * (hw - 4), wy = y + 1.5;
    foot(ctx, wx + 1, wy + 4.2, 4);
    if (!t.branch && lvl === 1) part(ctx, (c) => {
      ball(c, wx, wy, 4.4, 4.4, WOOD, { hi: 0.3, lo: 0.45 });
      c.fillStyle = rgba(darken(WOOD, 0.5), 0.5); c.fillRect(wx - 4, wy - 0.3, 8, 0.6); c.fillRect(wx - 3.4, wy - 2.2, 6.8, 0.5); c.fillRect(wx - 3.4, wy + 1.7, 6.8, 0.5);
      ball(c, wx, wy, 1.2, 1.2, WOOD_DK, { hi: 0.3, lo: 0.4 });
    });
    else wheel(ctx, wx, wy, lvl >= 3 ? 5.4 : 5, WOOD, { spokes: lvl >= 3 ? 8 : 6, rot: sgn * 0.4 });
  }
  if (r4 === "aa") {
    // granite footings chocked under the wheels
    for (const sgn of [-1, 1]) boulder(ctx, x + sgn * (hw + 1), y + 5, 2.2, GRANITE, sgn);
  }
  if (r4 === "ab") {
    // pitch pots ready by the wheel
    for (const [dx, dy] of [[0, 0], [3.4, 1]]) part(ctx, (c) => { ball(c, x + f * (hw - 1 + dx), y + 6 + dy, 2.2, 1.8, "#5a4a44", { hi: 0.35, lo: 0.45 }); ball(c, x + f * (hw - 1 + dx), y + 4.8 + dy, 1.4, 0.6, PITCH, { hi: 0.1, lo: 0.1 }); });
  }
};

// ---- the Log Roller's ramp ---------------------------------------------------
// The bed is a sloped plank ramp running down toward the field, deep enough
// to hold a log end-on; the log waits at the top behind a chock.
const RAMP = (x, y, f, hw) => ({ ax: x - f * (hw - 3), ay: y - 15, bx: x + f * (hw + 1), by: y - 1, d: 11, sk: -f * 3 });
const rampY = (R, px) => R.ay + ((px - R.ax) / (R.bx - R.ax)) * (R.by - R.ay);
const logSpot = (t, x, y, f, s) => {
  const R = RAMP(x, y, f, s.hw), rr = t.rank4 === "a" ? 7.4 : 7;
  const lx = R.ax + f * 9;
  return { lx, ly: rampY(R, lx) - R.d * 0.35 - rr * 0.8, rr, R };
};

const paintRamp = (ctx, t, x, y, f, s) => {
  const R = RAMP(x, y, f, s.hw), r4 = t.rank4 ? t.branch + t.rank4 : null;
  // spare logs stacked behind, or iron hoops, or kegs
  if (r4 === "bb") for (const [dx, dy] of [[0, 0], [6, 0], [3, -5]]) barrel(ctx, x + f * (s.hw - 6 + dx), y - 12 + dy, 5.4, 6.5, "#8a3a2e", { hoop: "#3a3030", mark: "#e8d47a" });
  else if (r4 === "ba") for (const dx of [0, 3]) part(ctx, (c) => { c.strokeStyle = IRON; c.lineWidth = 1.4; c.beginPath(); c.ellipse(x + f * (s.hw - 5 + dx), y - 15, 3, 5, f * 0.2, 0, Math.PI * 2); c.stroke(); });
  else for (const [dx, dy] of [[0, 0], [7, 0], [3.5, -5.5]]) part(ctx, (c) => {
    ball(c, x + f * (s.hw - 7 + dx), y - 12 + dy, 3.2, 2.9, "#6e4c2e", { hi: 0.3, lo: 0.45 });
    ball(c, x + f * (s.hw - 7 + dx), y - 12 + dy, 2.2, 1.9, "#d8b888", { hi: 0.25, lo: 0.3 });
  });
  // the far rail of the ramp and its back posts
  const col = r4 === "ba" ? "#6a6058" : TIMBER;
  beam(ctx, R.ax + R.sk, R.ay - R.d, R.bx + R.sk, R.by - R.d, 2.2, darken(col, 0.25));
  beam(ctx, R.ax + R.sk, R.ay - R.d, R.ax + R.sk, y - 9, 2.6, darken(col, 0.3));
  // the bed: a plank parallelogram sloping down to the field
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(R.ax, R.ay); c.lineTo(R.bx, R.by); c.lineTo(R.bx + R.sk, R.by - R.d); c.lineTo(R.ax + R.sk, R.ay - R.d); c.closePath();
    c.fillStyle = lin(c, 0, R.ay - R.d, 0, R.by, [[0, lighten(col, 0.3)], [1, darken(col, 0.1)]]);
    c.fill();
    c.save(); c.clip();
    c.strokeStyle = rgba(darken(col, 0.5), 0.4); c.lineWidth = 0.6;
    for (let k = 1; k < 4; k++) { const o = k / 4; c.beginPath(); c.moveTo(R.ax + R.sk * o, R.ay - R.d * o); c.lineTo(R.bx + R.sk * o, R.by - R.d * o); c.stroke(); }
    c.restore();
  });
  // the winch at the top that hauls the next log up
  const wx = R.ax - f * 2, wy = R.ay - 4;
  part(ctx, (c) => cylinder(c, wx - 2.4, wy - 2.4, 4.8, 4.8, WOOD_DK, { r: 1.8, hi: 0.35, lo: 0.45 }));
  part(ctx, (c) => { c.fillStyle = r4 === "ba" ? "#8a909c" : ROPE; c.fillRect(wx - 2.2, wy - 1, 4.4, 0.8); c.fillRect(wx - 2.2, wy + 0.6, 4.4, 0.8); });
};

const paintRampFront = (ctx, t, x, y, f, s) => {
  const R = RAMP(x, y, f, s.hw), r4 = t.rank4 ? t.branch + t.rank4 : null;
  const col = r4 === "ba" ? "#6a6058" : TIMBER;
  // the near rail, the side of the ramp, and the trestle under the high end
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(R.ax, R.ay); c.lineTo(R.bx, R.by); c.lineTo(R.bx, R.by + 2.5); c.lineTo(R.ax, R.ay + 3); c.closePath();
    c.fillStyle = darken(col, 0.2); c.fill();
  });
  const bands = r4 === "ba" ? [0.2, 0.5, 0.8] : [0.5];
  beam(ctx, R.ax, R.ay - 0.5, R.bx, R.by - 0.5, 2.4, col, { bands, bandCol: r4 === "ba" ? "#8a909c" : IRON });
  for (const k of [0, 0.4]) {
    const px = R.ax + (R.bx - R.ax) * k, top = rampY(R, px) + 2;
    beam(ctx, px, top, px, y + 2.5, 2.6, darken(col, 0.1));
    foot(ctx, px + 0.5, y + 2.8, 2.2);
  }
  beam(ctx, R.ax, y - 3, R.ax + (R.bx - R.ax) * 0.4, rampY(R, R.ax + (R.bx - R.ax) * 0.4) + 3, 1.7, darken(col, 0.2));
  // the lip where the ramp meets the ground
  part(ctx, (c) => ball(c, R.bx - f * 1, R.by + 2.5, 3.6, 1.2, "#8a7a5a", { hi: 0.3, lo: 0.4 }));
  if (r4 === "bb") coil(ctx, x + f * 3, y + 7, 2.6, "#6a5a3a");   // fuse cord
};

// The log, end-on: bark, rings, and the length of it running back.
const paintLog = (ctx, cx, cy, rr, r4) => {
  const body = r4 === "ba" ? "#4e525c" : "#6a4a2c";
  const face = r4 === "ba" ? "#7a808c" : "#d8b888";
  const ry = rr * 0.85, dx = -3, dy = -10;   // the length runs back up the ramp
  part(ctx, (c) => {
    c.beginPath();
    c.moveTo(cx - rr, cy);
    c.lineTo(cx - rr + dx, cy + dy);
    c.ellipse(cx + dx, cy + dy, rr, ry, 0, Math.PI, Math.PI * 2);
    c.lineTo(cx + rr, cy);
    c.closePath();
    c.fillStyle = lin(c, cx - rr, 0, cx + rr, 0, [[0, lighten(body, 0.3)], [0.45, body], [1, darken(body, 0.45)]]);
    c.fill();
    c.strokeStyle = rgba(darken(body, 0.6), 0.55); c.lineWidth = 0.7;
    for (const k of [-0.55, -0.1, 0.4]) { c.beginPath(); c.moveTo(cx + k * rr + dx * 0.9, cy + dy * 0.9 - ry * 0.6); c.lineTo(cx + k * rr + dx * 0.25, cy + dy * 0.25 - ry * 0.6); c.stroke(); }
  });
  if (r4 === "ba") part(ctx, (c) => { c.fillStyle = "#3a3c46"; c.beginPath(); c.ellipse(cx + dx * 0.5, cy + dy * 0.5, rr + 0.2, ry, 0, Math.PI, Math.PI * 2); c.lineWidth = 1.6; c.strokeStyle = "#3a3c46"; c.stroke(); });
  // the near end
  part(ctx, (c) => {
    ball(c, cx, cy, rr, rr * 0.85, body, { hi: 0.25, lo: 0.4 });
    ball(c, cx, cy, rr - 1.4, rr * 0.85 - 1.2, face, { hi: 0.3, lo: 0.35 });
    c.strokeStyle = rgba(darken(face, r4 === "ba" ? 0.4 : 0.3), 0.8); c.lineWidth = 0.6;
    if (r4 === "ba") {
      c.fillStyle = "#3a3c46";
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.fillRect(cx + Math.cos(a) * (rr - 2.6) - 0.5, cy + Math.sin(a) * (rr - 2.4) * 0.85 - 0.5, 1, 1); }
      ball(c, cx, cy, 1.8, 1.6, "#3a3c46", { hi: 0.4, lo: 0.3 });
    } else {
      for (const k of [0.35, 0.62]) { c.beginPath(); c.ellipse(cx + 0.4, cy + 0.3, (rr - 1.4) * k, (rr * 0.85 - 1.2) * k, 0, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = darken(face, 0.35); c.fillRect(cx + 0.2, cy, 0.9, 0.9);
    }
  });
  if (r4 === "bb") {
    // kegs lashed along its back
    for (const k of [-3.2, 3.2]) barrel(ctx, cx + k + dx * 0.5, cy - ry - 1 + dy * 0.5, 5, 6, "#8a3a2e", { hoop: "#3a3030" });
    part(ctx, (c) => { c.fillStyle = ROPE; c.fillRect(cx - rr + 0.5 + dx * 0.5, cy - ry - 3.5 + dy * 0.5, rr * 2 - 1, 1); });
  }
};

// ---- the arm -----------------------------------------------------------------
const armSprite = (t, s, deg) => cache.get(`arm|${s.key}|${deg}`, 80, 80, (c) => {
  const cx = 40, cy = 40, a = deg * D2R, ux = Math.sin(a), uy = -Math.cos(a);
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const col = r4 === "ab" ? "#5a4638" : r4 === "aa" ? "#8a6a48" : ARM;
  const lvl = t.branch ? 3 : t.level;
  const w = s.treb ? 3.6 : 2.6 + lvl * 0.3;
  const bands = s.treb ? [0.3, 0.55, 0.85] : lvl === 1 ? null : lvl === 2 ? [0.5, 0.85] : [0.35, 0.62, 0.88];
  beam(c, cx - ux * s.butt, cy - uy * s.butt, cx + ux * s.L, cy + uy * s.L, w, col, { bands });
  const tx = cx + ux * s.L, ty = cy + uy * s.L;
  if (!s.treb) {
    if (lvl === 1) part(c, (k) => { k.fillStyle = ROPE; for (const fr of [0.3, 0.7]) k.fillRect(cx + ux * s.L * fr - 1, cy + uy * s.L * fr - 1, 2, 2); });
    // the cup: a leather sling-bucket at one, iron after
    part(c, (k) => ball(k, tx, ty, 3.2, 3, lvl === 1 ? "#6a4a2e" : "#4a4e58", { hi: 0.4, lo: 0.45 }));
    part(c, (k) => ball(k, tx - uy * 0.9, ty + ux * 0.9 - 0.4, 2, 1.3, lvl === 1 ? "#3a2818" : "#2a2c34", { hi: 0.1, lo: 0.1 }));
  } else {
    // the short end's pin, and the tip's release hook
    part(c, (k) => ball(k, cx - ux * s.butt, cy - uy * s.butt, 1.8, 1.8, IRON, { hi: 0.5, lo: 0.4 }));
    part(c, (k) => ball(k, tx, ty, 1.5, 1.5, IRON, { hi: 0.5, lo: 0.4 }));
  }
});

// The trebuchet's counterweight, which always hangs plumb from its pin.
const paintWeight = (ctx, x, y, key) => {
  part(ctx, (c) => { c.fillStyle = IRON; c.fillRect(x - 3, y, 1, 4); c.fillRect(x + 2, y, 1, 4); });
  if (key === "aa") {
    // a carved granite block, iron-hooped
    part(ctx, (c) => { cylinder(c, x - 8, y + 3, 16, 14, GRANITE, { r: 2, hi: 0.35, lo: 0.5 }); });
    part(ctx, (c) => {
      c.fillStyle = "#3a3c46"; c.fillRect(x - 8, y + 5, 16, 1.4); c.fillRect(x - 8, y + 14, 16, 1.4);
      c.fillStyle = rgba("#2a2230", 0.5); c.fillRect(x - 2, y + 7.5, 4, 3); c.fillRect(x - 1, y + 6.5, 2, 5);   // a mason's rune
    });
  } else {
    // a planked box heaped with stones
    part(ctx, (c) => cylinder(c, x - 6, y + 3, 12, 10, key === "ab" ? CHAR : TIMBER, { r: 1, hi: 0.3, lo: 0.5 }));
    part(ctx, (c) => {
      c.fillStyle = IRON; c.fillRect(x - 6, y + 3, 1.6, 10); c.fillRect(x + 4.4, y + 3, 1.6, 10);
      c.fillStyle = rgba(darken(TIMBER, 0.5), 0.5); c.fillRect(x - 4.4, y + 7.5, 8.8, 0.6);
    });
    for (const [dx, r] of [[-2.5, 2], [1, 2.2], [3.4, 1.7]]) boulder(ctx, x + dx, y + 3, r, "#8e8c94", dx);
  }
};

// ---- per-frame -----------------------------------------------------------------
const armAngle = (t, s, r) => {
  if (t.anim > 0) {
    const p = 1 - t.anim;
    if (s.treb) return s.rest + (s.stop - s.rest) * Math.pow(1 - p, 1.4) * Math.cos(p * 4);
    return s.stop + 12 * Math.sin(p * Math.PI * 2.5) * (1 - p) * (1 - p);
  }
  const k = Math.max(0, Math.min(1, (r - 0.08) / 0.7));
  const e = k * k * (3 - 2 * k);
  return s.rest + (s.cocked - s.rest) * e;
};

export const drawCatapult = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const s = spec(t), hw = s.hw;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const f = t._idle ? 1 : (Math.cos(t.lastAim || 0) >= 0 ? 1 : -1);
  const bake = canBake();
  const r = readiness(t);
  const anim = t.anim || 0;
  const id5 = t.id % 5;
  const form = `${t.level}|${t.branch}|${t.rank4}|${f}`;
  const layer = (name, fn) => {
    if (!bake) { fn(ctx, t, x, y, f); return; }
    const cv = cache.get(`${name}|${form}|${name === "g" ? id5 : 0}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => fn(c, { ...t, id: id5 }, BOX.left, BOX.up, f));
    stamp(ctx, cv, x, y + (name !== "g" ? jolt : 0), BOX.left, BOX.up);
  };
  // the whole bed hops when the arm lets go
  const jolt = anim > 0.72 ? -1 : 0;
  layer("g", paintGround);
  layer("b", paintBack);

  if (s.roller) {
    const { lx, ly, rr } = logSpot(t, x, y, f, s);
    // the log waits; after a release the ramp stands empty until the winch
    // has hauled the next one up, and it settles into place
    const loaded = anim === 0 && r > 0.55;
    if (loaded) {
      const k = Math.min(1, (r - 0.55) / 0.25);
      const back = (1 - k) * 7;
      const cv = bake ? cache.get(`log|${t.rank4}`, 30, 40, (c) => paintLog(c, 15, 30, rr, r4)) : null;
      const shake = !t._idle && r > 0.93 ? (Math.sin(time * 38) > 0 ? 0.5 : 0) : 0;
      if (cv) stamp(ctx, cv, lx - f * back + shake, ly - back * 0.45 + jolt, 15, 30, f);
      else paintLog(ctx, lx, ly, rr, r4);
      // the Powder Keg Run lights its fuse at the last moment
      if (r4 === "bb" && (r > 0.9 || t._idle)) {
        const fl = Math.sin(time * 30) > 0;
        const fx = lx + f * 1.7, fy = ly - rr * 0.85 - 13;
        glow(ctx, fx, fy, fl ? 3 : 2.2, "#f4c060", 0.9);
        ctx.fillStyle = fl ? "#fff3d2" : "#f0903a"; ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
      }
    } else if (anim > 0.4) {
      // dust where it left the lip
      const R = RAMP(x, y, f, hw);
      for (let i = 0; i < 3; i++) soft(ctx, R.bx + f * (4 + i * 4) * (1 - anim + 0.3), R.by + 1 - i, 4 - i, 2.5 - i * 0.5, [[0, `rgba(190,170,130,${0.55 * anim})`], [1, "rgba(190,170,130,0)"]]);
    }
    layer("f", paintFront);
    // the chock and its lever: set, or knocked out
    const R = RAMP(x, y, f, hw);
    const cx = lx + f * (rr + 1.5), cy = rampY(R, cx) - 2;
    const out = anim > 0 || r < 0.55;
    ctx.fillStyle = "#4e3520";
    if (!out) { ctx.fillRect(cx - 1.4, cy - 3, 2.8, 3.6); ctx.fillStyle = "#6a4a2e"; ctx.fillRect(cx - 1.4, cy - 3, 1, 3.6); }
    else { ctx.fillRect(cx - 2, cy + 0.5, 3.6, 1.8); }
    const hx = x - f * (hw - 4.5), hy = y - 10 + (out ? -3 : 0);
    ctx.strokeStyle = "#241a26"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - f * 1, cy + 1); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = "#8a6238"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(cx - f * 1, cy + 1); ctx.lineTo(hx, hy); ctx.stroke();
  } else {
    const deg = Math.round(armAngle(t, s, r) / 6) * 6;
    const a = deg * D2R, ux = f * Math.sin(a), uy = -Math.cos(a);
    const px = x + f * s.px, py = y - s.fh + 1 + jolt;
    const tx = px + ux * s.L, ty = py + uy * s.L;
    // release: a smear of air where the arm just was
    if (anim > 0.5) {
      const a1 = Math.atan2(uy, ux), sweep = 1.1;
      const a0 = a1 - f * sweep;
      ctx.lineCap = "round";
      for (const [rr, al, w] of [[s.L - 1, 0.5, 1.8], [s.L * 0.7, 0.3, 1.2]]) {
        ctx.strokeStyle = `rgba(255,243,210,${al * (anim - 0.5) * 2})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.arc(px, py, rr, f > 0 ? a0 : a1, f > 0 ? a1 - 0.12 : a0, false); ctx.stroke();
      }
    }
    if (bake) stamp(ctx, armSprite(t, s, deg), px, py, 40, 40, f);
    const loaded = anim === 0 && r > 0.8;
    if (s.treb) {
      // the sling: resting in its trough when cocked, hanging while it winds,
      // whipping out over the top as it looses
      let sx, sy;
      if (anim > 0) { sx = tx + ux * 9 + f * 4 * anim; sy = ty + uy * 9 - 3 * anim; }
      else if (r > 0.8) { sx = x - f * (hw - 2); sy = y - 10.5 + jolt; }
      else { sx = tx + Math.sin(time * 2.5) * 0.8; sy = ty + 9; }
      rope(ctx, tx, ty, sx, sy, anim > 0 ? 0 : 1.5, ROPE, 0.8);
      ball(ctx, sx, sy, 2.2, 1.6, "#6a4a2e", { hi: 0.35, lo: 0.4 });
      if (loaded) {
        if (bake) stamp(ctx, cache.get(`shot|${s.key}`, 10, 10, (c) => boulder(c, 5, 5, s.key === "aa" ? 3 : 2.6, s.key === "aa" ? GRANITE : "#8e8c94", 2)), sx, sy - 1.8, 5, 5);
        if (r4 === "ab") comet(ctx, sx, sy - 1.8, time);
      }
      // the winch rope to the arm while it cocks
      if (anim === 0) rope(ctx, x - f * (hw - 3), y - 10 + jolt, px + ux * s.L * 0.55, py + uy * s.L * 0.55, 0.5, ROPE, 0.7);
    } else {
      if (loaded && bake) stamp(ctx, cache.get(`shot|${s.key}`, 10, 10, (c) => boulder(c, 5, 5, 2.5, "#8e8c94", 1)), tx - uy * f * 0.5, ty - 2.2, 5, 5);
      if (anim === 0 && r < 0.95) rope(ctx, x - f * (hw - 3), y - 10 + jolt, tx, ty, 0.3, ROPE, 0.7);
    }
    layer("f", paintFront);
    // the counterweight hangs plumb from the short end, out in front
    if (s.treb) {
      const wx = px - ux * s.butt, wy = py - uy * s.butt;
      if (bake) stamp(ctx, cache.get(`weight|${s.key}`, 24, 22, (c) => paintWeight(c, 12, 2, s.key)), wx, wy, 12, 2);
      else paintWeight(ctx, wx, wy, s.key);
    }
    if (!s.treb && anim === 0 && r >= 0.95 && !t._idle) {
      // cocked and trembling: the rope is taut to the trigger
      ctx.strokeStyle = "rgba(240,224,180,0.95)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x - f * (hw - 3), y - 10); ctx.lineTo(tx, ty); ctx.stroke();
    }
    // a thump of dust at the wheels as it looses
    if (anim > 0.5) for (const sgn of [-1, 1]) soft(ctx, x + sgn * (hw - 1), y + 5, 6 * anim, 2.4, [[0, `rgba(190,170,130,${0.5 * anim})`], [1, "rgba(190,170,130,0)"]]);
  }
  // the standard, at the front of the bed
  const pc = s.treb ? (r4 === "aa" ? "#8a8a94" : r4 === "ab" ? "#d0602a" : "#6a86b0") : s.roller ? (r4 === "ba" ? "#5c626e" : r4 === "bb" ? "#c05848" : "#a0603a") : "#a04a3f";
  if (t.level >= 2 || t.branch) pennant(ctx, x + f * (hw - 1), y - (s.treb ? 36 : 26), s.treb ? 28 : 18, pc, time, t.id, f);
  // Comet Sling: the cauldron smokes and glows under
  if (r4 === "ab") {
    const cx = x - f * (hw - 2);
    glow(ctx, cx, y - 9, 4 + Math.sin(time * 7 + t.id), "#f08a3a", 0.8);
    for (let i = 0; i < 2; i++) { const k = ((time * 0.6 + i * 0.5 + t.id * 0.1) % 1); soft(ctx, cx + Math.sin(time + i) * 2, y - 18 - k * 14, 2 + k * 3, 2 + k * 3, [[0, `rgba(60,52,58,${0.4 * (1 - k)})`], [1, "rgba(60,52,58,0)"]]); }
  }
  // ---- the engineer, at the winch behind the bed
  const cranking = !t._idle && anim === 0 && r < 0.8;
  const work = cranking ? Math.round((Math.sin(time * 9 + t.id) + 1) * 1.5)
    : t._idle ? Math.round((Math.sin(time * 1.2 + t.id) + 1) * 0.5) : 2;
  const ex = x - f * (hw + 1), ey = y + 3;
  if (bake) stamp(ctx, cache.get(`crew|${work}`, 28, 30, (c) => drawCrew(c, 12, 27, 1, CREW_FOLK.engineer, (work - 1.5) * 0.4)), ex, ey, 12, 27, f);
  else drawCrew(ctx, ex, ey, f, CREW_FOLK.engineer, 0);
  // idle upkeep: now and then he taps a peg home and it sparks
  if (t._idle && Math.sin(time * 3.5 + t.id * 1.7) > 0.93) glow(ctx, x - f * (hw - 2), y - 11, 2.5, "#ffe08a", 0.9);
};

// A stone wrapped in burning pitch.
const comet = (ctx, x, y, time) => {
  glow(ctx, x, y - 1, 6, "#f08a3a", 0.75);
  const fl = Math.sin(time * 22) > 0 ? 1 : 0;
  ctx.fillStyle = "#f4c060"; ctx.fillRect(x - 1, y - 4 - fl, 2, 2);
  ctx.fillStyle = "#fff3d2"; ctx.fillRect(x - 0.5, y - 2.5, 1, 1);
};
