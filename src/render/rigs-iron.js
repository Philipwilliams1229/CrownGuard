// ============ RIGS: THE IRON KINGDOM'S FOOT (levy, crossbow, sergeant, chaplain, magister, unseated, marshal) ============
// Bespoke bodies that override the generic entries in rigs.js (same shape:
// { kind, box: { hw, up, down }, p, fly? }); IRON_PAINTERS maps each new
// `kind` to its painter (ctx, p) — pose is p.pose ("walk" | "fight") and
// p.frame (0-3 walk; 0-3 fight: guard, wind-up, strike, follow-through — every
// rig here sets fightN: 4, see step()), feet at 0,0, facing +x. Frames are
// baked once and inked by rigs.js. Joints are checked in the joint lab's
// "irh" set (joint-sets/irh.js).
//
// A drilled human army on the same upright skeleton as the crown's soldiers
// (rigs-crown.js), but never to be taken for them: darkened, blued steel
// instead of bright silver, oxblood instead of the crown's blue, black-iron
// trim, brass only for rank, and the grey iron tower on every shield and
// banner. p.look picks the kit:
//   levy     kettle hat, padded jack, oxblood tabard, a big iron-rimmed round
//            shield held UP to the chin (it turns the first three blows,
//            whole), spear
//   bow      oxblood hood under a kettle, a quilted gambeson, a heavy arbalest
//            and a box of bolts at the hip; fights by levelling and loosing
//   sergeant blued plate, a barbute, oxblood surcoat, heater shield, longsword;
//            a heavier, steadier tread (nothing slows him)
//   chaplain cream alb and oxblood chasuble over mail, an iron-banded mitre, a
//            flanged mace and a reliquary on a chain that glows with the ward
//   magister the Aegis Magister, a court battle-mage: a black-iron robe to the
//            ankles lined in oxblood, a steel gorget and pauldron (brass-edged,
//            for rank), a tall oxblood hood with its peak swept back, and a
//            tall staff crowned with a pale-blue crystal cut in the shape of
//            the ward's shield pip (p.col, the pips' own #9ab6d8). Fight: he
//            raises the staff, then thrusts it and the aegis flares, three
//            shield pips bursting off the crystal
//   unseated the Gryphon Knight's rider on foot (rigs-ironmounts.js IRON_RIDER):
//            the same sallet with its oxblood crest, blued plate, a dagged
//            oxblood surcoat, now an arming sword and a small heater; a torn
//            riding cape and a gryphon's feather (p.mane) caught in the crest
//            tell where he fell from. Lighter than the sergeant
//   marshal  the boss: crowned great helm with a plume, a sweeping cape, and the
//            army's great war-banner on a lance
// Colours come only from p.skin / cloth / cloth2 / hair / cape / col / mane /
// wcol / shcol, so the necromancer's pale revive and the white hit-flash
// reach everything.

import { lighten, darken, mix, rgba, ball, glow, lin, part, shadow } from "./paint.js";
import { logJoint } from "./folk-kit.js";

// ---- the kit (the same small skeleton as the horde's and the crown's) -----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SUNV = [-0.59, -0.81];

// a closed path; points are [x, y] (rounded through) or [x, y, 1] (a corner)
const path = (c, pts) => {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const s = pts[0][2] ? pts[0] : mid(pts[n - 1], pts[0]);
  c.beginPath(); c.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    if (p[2]) c.lineTo(p[0], p[1]);
    else { const m = q[2] ? q : mid(p, q); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  }
  c.closePath();
};
const cel = (c, x0, y0, x1, y1, col, hi = 0.32, lo = 0.42) => lin(c, x0, y0, x1, y1, [[0, lighten(col, hi)], [0.5, col], [1, darken(col, lo)]]);
const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
// a lit shape as its own inked part; o.then paints inside it, clipped
const blob = (ctx, pts, col, o = {}) => part(ctx, (c) => {
  path(c, pts); c.fillStyle = cel(c, ...bbox(pts), col, o.hi, o.lo); c.fill();
  if (o.then) { c.save(); path(c, pts); c.clip(); o.then(c); c.restore(); }
});
const dab = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const line = (c, x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
const poly = (c, pts, col) => { c.beginPath(); c.moveTo(...pts[0]); for (const q of pts.slice(1)) c.lineTo(...q); c.closePath(); c.fillStyle = col; c.fill(); };

// a round limb segment shaded across its width, the lit side toward the sun
const tube = (c, x0, y0, x1, y1, w, col) => {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  let nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  if (nx * SUNV[0] + ny * SUNV[1] < 0) { nx = -nx; ny = -ny; }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  c.strokeStyle = lin(c, mx + nx * w / 2, my + ny * w / 2, mx - nx * w / 2, my - ny * w / 2, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.42)]]);
  c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
};
// two bones from a root to a target → [joint, end]; dir 1 bends toward +x
const ik = (ax, ay, bx, by, l1, l2, dir) => {
  const dx = bx - ax, dy = by - ay, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.02);
  const a = Math.atan2(dy, dx), k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const j = a - dir * k;
  return [[ax + Math.cos(j) * l1, ay + Math.sin(j) * l1], [ax + Math.cos(a) * d, ay + Math.sin(a) * d]];
};
const frameAt = (x, y, a) => { const cs = Math.cos(a), sn = Math.sin(a); return (lx, ly) => [x + lx * cs - ly * sn, y + lx * sn + ly * cs]; };
const inFrame = (ctx, x, y, a, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); fn(ctx); ctx.restore(); };
// walking along a haft: u down its length, v across it (+v is "below" a level haft)
const along = (x, y, a) => { const dx = Math.cos(a), dy = Math.sin(a); return (u, v = 0) => [x + dx * u - dy * v, y + dy * u + dx * v]; };
const haft = (c, to, u0, u1, w, col) => { const [x0, y0] = to(u0), [x1, y1] = to(u1); tube(c, x0, y0, x1, y1, w, col); };

// The gait: contact, passing, contact, passing. The fight is four frames
// (the rigs set fightN: 4; enemies.js plays them off the foe's attack clock):
//   0 guard   weapon up between blows, weight centred
//   1 wind-up the weapon drawn back, the weight settling on the back foot
//   2 strike  the near foot steps in, the weight thrown forward
//   3 follow  the weapon past the line, the body recovering over the planted foot
// st.drive says how far into the blow the body is (0 wound .. 1 struck) and
// st.cloth how far the hems and capes have swung — they trail the body by a
// frame and overshoot on the follow-through.
// A shooter (o.shoot, the crossbowman) stands his ground instead: 0 ready,
// 1 aim, 2 loose (the kick rocks him back), 3 reload (he stoops to the box).
const DRIVE = [0.35, 0, 1, 0.75], CLOTH = [0.45, 0, 0.75, 1];
const step = (p, o) => {
  const f = (p.frame || 0) % 4, s = o.stride;
  if (p.pose !== "fight") {
    const c = [1, 0, -1, 0][f];
    return {
      fight: false, f, c,
      near: f === 3 ? [-0.3 * s, -o.lift] : [c * s + (f === 1 ? 0.2 * s : 0), 0],
      far: f === 1 ? [-0.3 * s, -o.lift] : [-c * s + (f === 3 ? 0.2 * s : 0), 0],
      x: 0, bob: f % 2 ? -o.bob : 0, lean: o.lean + (f % 2 ? 0 : o.dip), swing: -c,
    };
  }
  const hl = o.hitLean ?? 0.2;
  if (o.shoot) return {
    fight: true, f, c: 0, hit: f === 2, drive: [0.3, 0.1, 0.5, 0.6][f], cloth: [0.3, 0.1, 0.6, 0.8][f],
    near: [s * 0.95, 0], far: [-s * 0.95, 0],
    x: [0, 0.15, -0.35, 0.2][f], bob: o.bob * [0.4, 0.6, 0.3, 1.0][f], lean: o.lean + [0.02, 0.06, -0.06, 0.2][f], swing: 0,
  };
  const planted = f >= 2;   // the near foot stepped in on the strike, and stays
  return {
    fight: true, f, c: 0, hit: f === 2, drive: DRIVE[f], cloth: CLOTH[f],
    near: [planted ? s * 1.1 + o.lunge * 0.8 : s * 0.9, 0], far: [-s * 0.95, 0],
    x: [0, -0.6, o.lunge, o.lunge * 0.8][f], bob: o.bob * [0.3, 0.2, 1.1, 0.9][f],
    lean: o.lean + [0.02, -0.13, hl, hl * 0.8][f], swing: 0,
  };
};
const skeleton = (p, o) => {
  const st = step(p, o);
  const reach = o.L1 + o.L2, ank = o.ankle;
  const hipH = Math.min(Math.sqrt(reach * reach - o.stride * o.stride) * 0.96, reach - o.bob - 0.15) + ank;
  const hip = [st.x, -hipH + st.bob];
  return { st, hip, ank, T: frameAt(hip[0], hip[1], st.lean) };
};
const foot = (ctx, x, y, len, h, col, o = {}) => part(ctx, (c) => {
  path(c, [[x - len * 0.32, y, 1], [x - len * 0.36, y - h * 0.8], [x - len * 0.05, y - h], [x + len * 0.35, y - h * 0.6], [x + len * 0.66, y - h * 0.2], [x + len * 0.68, y, 1]]);
  c.fillStyle = cel(c, x - len * 0.4, y - h, x + len * 0.7, y, col); c.fill();
  if (o.sole) dab(c, x - len * 0.4, y - 0.5, len * 1.1, 0.5, o.sole);
  if (o.plate) { line(c, x - len * 0.05, y - h * 0.9, x + len * 0.3, y - h * 0.45, 0.4, lighten(col, 0.5)); line(c, x + len * 0.1, y - h * 0.75, x + len * 0.12, y - h * 0.1, 0.35, darken(col, 0.4)); }
});
const leg = (ctx, R, o, which, cols) => {
  const { st, T, ank } = R;
  const [fx, fy] = st[which];
  const hp = T(which === "near" ? o.hipW : -o.hipW, 0);
  const [kn, an] = ik(hp[0], hp[1], fx, fy - ank, o.L1, o.L2, 1);
  logJoint(ctx, "leg", hp, kn, an, { lens: [o.L1, o.L2] });
  part(ctx, (c) => {
    tube(c, hp[0], hp[1], kn[0], kn[1], o.thigh, cols.thigh);
    tube(c, kn[0], kn[1], an[0], an[1], o.shin, cols.shin);
    if (cols.wrap) { const t = cols.wrapAt ?? 0.55; tube(c, kn[0] + (an[0] - kn[0]) * t, kn[1] + (an[1] - kn[1]) * t, an[0], an[1], o.shin * 1.1, cols.wrap); }
    if (cols.garter) { const t = 0.12; tube(c, kn[0] + (an[0] - kn[0]) * t, kn[1] + (an[1] - kn[1]) * t, kn[0] + (an[0] - kn[0]) * (t + 0.1), kn[1] + (an[1] - kn[1]) * (t + 0.1), o.shin * 1.15, cols.garter); }
    // the knee cop is a colour step in the leg's own part, never an ink ring
    // across the knee (owner, 2026-09-29: one inked part per limb)
    if (cols.knee) { ball(c, kn[0] + 0.3, kn[1], 1.25, 1.15, cols.knee, { hi: 0.5, lo: 0.45 }); dab(c, kn[0] - 0.1, kn[1] - 0.6, 0.5, 0.5, lighten(cols.knee, 0.6)); }
  });
  foot(ctx, an[0], an[1] + ank, o.foot, ank + 0.55, cols.foot, { plate: cols.plate, sole: cols.sole });
  return { hp, kn, an };
};
// An arm to the hand's target `to`: the elbow folds the natural way (the
// forearm swings forward and up off the upper arm); o.flip folds it the other
// way, ONLY for an arm raised out to the side (see "Joints and motion" in
// art/STYLE-GUIDE.md). The lab is shown the TARGET, so a hand posed out of
// reach reads as a stretched bone. The hand comes back with its elbow on it
// (hd.el) for the wrist check (`grip`).
const arm = (ctx, sh, to, o, cols) => {
  const flip = !!o.flip;
  const [el, hd] = ik(sh[0], sh[1], to[0], to[1], o.up, o.fore, flip ? 1 : -1);
  logJoint(ctx, "arm", sh, el, to, { lens: [o.up, o.fore], flip });
  hd.el = el;
  part(ctx, (c) => {
    tube(c, sh[0], sh[1], el[0], el[1], o.w, cols.up);
    tube(c, el[0], el[1], hd[0], hd[1], o.w * 0.92, cols.fore || cols.up);
    if (cols.cuff) { const t = 0.4; tube(c, el[0] + (hd[0] - el[0]) * t, el[1] + (hd[1] - el[1]) * t, hd[0] - (hd[0] - el[0]) * 0.1, hd[1] - (hd[1] - el[1]) * 0.1, o.w * 1.08, cols.cuff); }
    if (cols.elbow) ball(c, el[0], el[1], o.w * 0.62, o.w * 0.58, cols.elbow, { hi: 0.5, lo: 0.45 });
  });
  return hd;
};
// the wrist: a haft or hilt leaving the fist along `a` (logged for the lab as
// elbow → hand → a point up the haft; the lab draws it, the analysis reads it)
const grip = (ctx, hd, a) => { if (hd.el) logJoint(ctx, "wrist", hd.el, hd, [hd[0] + Math.cos(a) * 3, hd[1] + Math.sin(a) * 3]); };
const fist = (ctx, x, y, r, col) => part(ctx, (c) => ball(c, x, y, r, r * 0.95, col, { hi: 0.45, lo: 0.4 }));

// ---- the Iron Kingdom's colours ----------------------------------------------------
const IRONK = "#2e3038", BRASS = "#b8903e", OAK = "#6a4a2e", LEATHER = "#5a3e28", INKY = "#1a1420";
const DEVICE = "#aeb2bc";   // the grey iron tower

// the device: a grey tower, three merlons and a dark door, s ≈ its half-width
const towerDevice = (c, x, y, s, col = DEVICE) => {
  dab(c, x - 0.95 * s, y - 0.5 * s, 1.9 * s, 2.3 * s, col);
  dab(c, x - 1.25 * s, y - 0.95 * s, 2.5 * s, 0.6 * s, col);
  for (const k of [-1.25, -0.3, 0.65]) dab(c, x + k * s, y - 1.6 * s, 0.6 * s, 0.7 * s, col);
  dab(c, x + 0.35 * s, y - 0.4 * s, 0.6 * s, 2.2 * s, darken(col, 0.3));
  dab(c, x - 0.3 * s, y + 0.85 * s, 0.6 * s, 0.95 * s, darken(col, 0.7));
  dab(c, x - 0.95 * s, y - 0.9 * s, 0.4 * s, 0.4 * s, lighten(col, 0.5));
};

// the levy's great round shield, held up to the chin: a red field, the tower,
// a broad black-iron rim studded with rivets
const roundShield = (ctx, x, y, rx, ry, field, device = true) => part(ctx, (c) => {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = cel(c, x - rx, y - ry, x + rx, y + ry, IRONK, 0.55, 0.4); c.fill();
  const ix = rx - 0.85, iy = ry - 0.85;
  c.beginPath(); c.ellipse(x, y, ix, iy, 0, 0, Math.PI * 2);
  c.fillStyle = cel(c, x - ix, y - iy, x + ix, y + iy, field, 0.3, 0.42); c.fill();
  c.save(); c.clip();
  for (const k of [-0.5, 0.5]) line(c, x + ix * k, y - iy, x + ix * k + 0.1, y + iy, 0.35, darken(field, 0.3));
  if (device) towerDevice(c, x + 0.1, y - 0.2, ix * 0.4);
  c.restore();
  // the lit top-left of the rim, and its rivets
  c.strokeStyle = lighten(IRONK, 0.7); c.lineWidth = 0.4;
  c.beginPath(); c.ellipse(x, y, rx - 0.3, ry - 0.3, 0, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.35; dab(c, x + Math.cos(a) * (rx - 0.45) - 0.25, y + Math.sin(a) * (ry - 0.45) - 0.25, 0.5, 0.5, lighten(IRONK, 0.9)); }
});

// the heater: a flat top, straight sides bending to a point; faced to the viewer
const heater = (ctx, x, y, field, s = 1) => part(ctx, (c) => {
  const pts = [[x - 2.6 * s, y - 3.7 * s, 1], [x + 2.6 * s, y - 3.9 * s, 1], [x + 2.7 * s, y + 0.2 * s], [x + 1.6 * s, y + 3.2 * s], [x + 0.1 * s, y + 4.7 * s, 1], [x - 1.6 * s, y + 3.1 * s], [x - 2.6 * s, y + 0.2 * s]];
  path(c, pts); c.fillStyle = cel(c, x - 2.7 * s, y - 4 * s, x + 2.7 * s, y + 4.7 * s, field, 0.32, 0.45); c.fill();
  c.save(); path(c, pts); c.clip();
  towerDevice(c, x + 0.05 * s, y - 0.4 * s, 1.05 * s);
  c.strokeStyle = IRONK; c.lineWidth = 0.9; path(c, pts); c.stroke();
  c.strokeStyle = lighten(IRONK, 0.7); c.lineWidth = 0.35; c.beginPath(); c.moveTo(x - 2.3 * s, y - 3.35 * s); c.lineTo(x + 2.3 * s, y - 3.55 * s); c.stroke();
  c.restore();
});

// a shoulder guard: a rolled shell, black-iron edged (brass for rank)
const pauldron = (ctx, x, y, r, col, trim = IRONK) => part(ctx, (c) => {
  const pts = [[x - r, y + r * 0.6, 1], [x - r * 0.95, y - r * 0.35], [x - r * 0.1, y - r * 0.95], [x + r * 0.85, y - r * 0.5], [x + r * 1.05, y + r * 0.6, 1]];
  path(c, pts); c.fillStyle = cel(c, x - r, y - r, x + r, y + r, col, 0.45, 0.45); c.fill();
  line(c, x - r * 0.95, y + r * 0.45, x + r * 1.0, y + r * 0.5, 0.55, trim);
  line(c, x - r * 0.9, y + r * 0.02, x + r * 0.95, y + r * 0.1, 0.35, darken(col, 0.4));
  dab(c, x - r * 0.35, y - r * 0.6, 0.55, 0.55, lighten(col, 0.7));
});

// ---- weapons ------------------------------------------------------------------------
const spear = (ctx, x, y, a, col, back = 5, fwd = 10) => part(ctx, (c) => {
  const to = along(x, y, a);
  haft(c, to, -back, fwd, 1.0, OAK);
  line(c, ...to(fwd - 0.7, 0), ...to(fwd + 0.2, 0), 1.35, IRONK);
  path(c, [[...to(fwd, -0.95), 1], [...to(fwd + 1.2, -1.0)], [...to(fwd + 3.8, 0), 1], [...to(fwd + 1.2, 1.0)], [...to(fwd, 0.95), 1]]);
  c.fillStyle = col; c.fill();
  path(c, [[...to(fwd, -0.95), 1], [...to(fwd + 1.2, -1.0)], [...to(fwd + 3.8, 0), 1], [...to(fwd, 0), 1]]);
  c.fillStyle = lighten(col, 0.45); c.fill();
});

// the longsword: black-iron cross, brass pommel, a long grey blade
const longsword = (ctx, x, y, a, col, len = 9.2) => part(ctx, (c) => {
  const to = along(x, y, a);
  haft(c, to, -2.2, 0.5, 1.0, "#3a2a20");
  ball(c, ...to(-2.5), 0.75, 0.75, BRASS, { hi: 0.5, lo: 0.4 });
  const pts = [[...to(0.9, -0.66), 1], [...to(len - 1.8, -0.6), 1], [...to(len, 0), 1], [...to(len - 1.8, 0.6), 1], [...to(0.9, 0.66), 1]];
  path(c, pts); c.fillStyle = col; c.fill();
  path(c, [[...to(0.9, -0.66), 1], [...to(len - 1.8, -0.6), 1], [...to(len, 0), 1], [...to(0.9, 0), 1]]);
  c.fillStyle = lighten(col, 0.5); c.fill();
  line(c, ...to(1.4, 0.12), ...to(len - 2.4, 0.12), 0.35, darken(col, 0.35));
  line(c, ...to(0.7, -2.1), ...to(0.7, 2.1), 0.95, IRONK);
});

// the chaplain's flanged mace, black iron
const mace = (ctx, x, y, a, col, len = 6.2) => {
  const to = along(x, y, a);
  part(ctx, (c) => { haft(c, to, -1.6, len - 0.8, 0.95, "#4a3424"); ball(c, ...to(-1.8), 0.6, 0.6, BRASS, { hi: 0.5, lo: 0.4 }); tube(c, ...to(-0.4), ...to(0.4), 1.3, darken(col, 0.3)); });
  part(ctx, (c) => {
    for (const v of [-1, 1]) poly(c, [to(len - 1.9, v * 0.5), to(len - 1.0, v * 2.1), to(len + 0.9, v * 2.0), to(len + 1.4, v * 0.5)], darken(col, 0.15));
    ball(c, ...to(len, 0), 1.35, 1.35, col, { hi: 0.55, lo: 0.45 });
    for (const v of [-1, 1]) line(c, ...to(len - 0.9, v * 1.9), ...to(len + 0.8, v * 1.8), 0.35, lighten(col, 0.5));
    poly(c, [to(len + 1.2, -0.45), to(len + 2.2, 0), to(len + 1.2, 0.45)], lighten(col, 0.25));
  });
};

// The arbalest, gripped at (x, y) — the trigger hand — the stock along a: a
// heavy oak tiller, a steel prod across its nose, a stirrup, and the string
// spanned back to the nut (or flung forward, loosed).
const arbalest = (ctx, x, y, a, steel, o = {}) => {
  const to0 = along(x, y, a), k = o.s || 1, to = (u, v = 0) => to0(u * k, v * k);
  // o.loosed: the string flung forward and a streak ahead; o.empty: the
  // string forward and no bolt (spent, waiting to be spanned again)
  const loosed = !!o.loosed || !!o.empty, nut = 0.9, pu = 5.4, span = 4.4;
  const bend = loosed ? 0.5 : 1.4;
  const tip0 = to(pu - bend, -span), tip1 = to(pu - bend, span);
  const sAt = loosed ? pu - 0.2 : nut;
  // the far limb and the far string first, behind the tiller
  part(ctx, (c) => {
    c.strokeStyle = darken(steel, 0.3); c.lineWidth = 1.0; c.lineCap = "round";
    c.beginPath(); c.moveTo(...to(pu, 0)); c.quadraticCurveTo(...to(pu + 0.1, -span * 0.6), ...tip0); c.stroke();
  });
  ctx.strokeStyle = "#e8dcc0"; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(...tip0); ctx.lineTo(...to(sAt, 0)); ctx.stroke();
  // the tiller: fat at the butt, a trigger lever under it
  part(ctx, (c) => {
    const pts = [[...to(-3.8, -0.7), 1], [...to(-3.9, 1.3), 1], [...to(-1.2, 0.8)], [...to(pu + 0.9, 0.6), 1], [...to(pu + 1.0, -0.6), 1], [...to(-1.0, -0.65)]];
    path(c, pts); c.fillStyle = cel(c, ...bbox(pts), OAK, 0.35, 0.45); c.fill();
    line(c, ...to(-3.4, -0.35), ...to(pu, -0.4), 0.3, lighten(OAK, 0.4));
    for (const u of [-2.6, 2.4]) line(c, ...to(u, -0.7), ...to(u, 0.7), 0.45, IRONK);
    line(c, ...to(-0.6, 0.6), ...to(-1.6, 2.4), 0.5, IRONK);
    dab(c, ...to(nut, -0.4), 0.55, 0.55, BRASS);
  });
  // the bolt in the groove, while it is spanned
  if (!loosed) part(ctx, (c) => {
    line(c, ...to(nut + 0.2, -0.75), ...to(pu + 2.2, -0.75), 0.5, "#c8a878");
    poly(c, [to(pu + 2.1, -1.3), to(pu + 3.3, -0.75), to(pu + 2.1, -0.2)], lighten(steel, 0.2));
    poly(c, [to(nut + 0.2, -0.75), to(nut + 1.4, -1.5), to(nut + 1.7, -0.75)], "#e8e2d0");
  });
  // the stirrup at the nose, then the near limb and near string
  part(ctx, (c) => {
    c.strokeStyle = IRONK; c.lineWidth = 0.55; c.lineCap = "round";
    c.beginPath(); c.moveTo(...to(pu + 0.6, -0.8)); c.quadraticCurveTo(...to(pu + 2.8, 0), ...to(pu + 0.6, 0.8)); c.stroke();
  });
  part(ctx, (c) => {
    c.strokeStyle = cel(c, ...to(pu, -span), ...to(pu, span), steel, 0.5, 0.4); c.lineWidth = 1.1; c.lineCap = "round";
    c.beginPath(); c.moveTo(...to(pu, 0)); c.quadraticCurveTo(...to(pu + 0.1, span * 0.6), ...tip1); c.stroke();
    tube(c, ...to(pu - 0.2, -0.9), ...to(pu - 0.2, 0.9), 1.3, IRONK);
  });
  ctx.strokeStyle = "#efe6cc"; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(...tip1); ctx.lineTo(...to(sAt, 0)); ctx.stroke();
  if (o.loosed) {
    // the bolt is gone: a streak ahead of the nose
    ctx.fillStyle = "rgba(255,243,210,0.85)";
    for (let i = 0; i < 3; i++) { const [sx, sy] = to(pu + 3.2 + i * 1.8, -0.4); ctx.fillRect(sx - 0.5, sy - 0.2, 1.1 - i * 0.2, 0.45); }
  }
  return to;
};

// the great war-banner on a lance: the grip at (x, y), the lance along a,
// the flag streaming back (and down, when the lance is lowered)
const warBanner = (ctx, x, y, a, p, f, o = {}) => {
  const to = along(x, y, a);
  const back = o.back ?? 6, fwd = o.fwd ?? 16, field = p.cloth, steel = p.wcol || "#c4c8d0";
  const flag = o.only !== "pole", pole = o.only !== "flag";
  if (pole) part(ctx, (c) => {
    haft(c, to, -back, fwd, 1.25, "#4a3424");
    for (const u of [-0.9, 1.3]) tube(c, ...to(u - 0.35), ...to(u + 0.35), 1.7, BRASS);
    tube(c, ...to(-back - 0.3), ...to(-back + 0.6), 1.4, IRONK);
  });
  // the flag: hung along the top of the shaft, flying off toward (dx, dy)
  const A0 = to(fwd - 1.2), A1 = to(fwd - (o.flag ?? 7.4));
  const dirx = o.lowered ? -0.25 : -1, diry = o.lowered ? 1 : 0.18, dl = Math.hypot(dirx, diry), D = [dirx / dl, diry / dl];
  const W = o.fly ?? (o.lowered ? 7.5 : 9.5), wv = [0.7, -0.5, 0.9, -0.3][(f || 0) % 4];
  const N = [-D[1], D[0]];               // across the fly, for the ripple
  const at = (P, k, r = 0) => [P[0] + D[0] * W * k + N[0] * r, P[1] + D[1] * W * k + N[1] * r];
  const M = [(A0[0] + A1[0]) / 2, (A0[1] + A1[1]) / 2];
  const pts = [[...A0, 1], [...at(A0, 0.5, wv)], [...at(A0, 1.0, wv * 0.4), 1], [...at(M, 0.72, -wv * 0.3), 1], [...at(A1, 1.0, -wv * 0.5), 1], [...at(A1, 0.5, -wv)], [...A1, 1]];
  if (flag) blob(ctx, pts, field, {
    hi: 0.3, lo: 0.4, then: (c) => {
      const C = at(M, 0.36, wv * 0.2);
      towerDevice(c, C[0], C[1], 1.35);
      // a fold down the fly, a brass band along the hoist
      c.strokeStyle = darken(field, 0.35); c.lineWidth = 0.45;
      c.beginPath(); c.moveTo(...at(A0, 0.62, wv)); c.quadraticCurveTo(...at(M, 0.66, 0), ...at(A1, 0.62, -wv)); c.stroke();
      c.strokeStyle = BRASS; c.lineWidth = 0.8; c.beginPath(); c.moveTo(...at(A0, 0.06)); c.lineTo(...at(A1, 0.06)); c.stroke();
    },
  });
  // brass fringe on the tails
  if (flag) part(ctx, (c) => { for (const [P, k, r] of [[A0, 1.0, wv * 0.4], [A1, 1.0, -wv * 0.5]]) { const q = at(P, k, r); ball(c, q[0], q[1], 0.6, 0.6, BRASS, { hi: 0.5, lo: 0.4 }); } });
  // the crossbar finial and the lance head
  if (pole) part(ctx, (c) => {
    tube(c, ...to(fwd - 1.0, -1.4), ...to(fwd - 1.0, 1.4), 0.9, BRASS);
    ball(c, ...to(fwd + 0.2), 0.9, 0.9, BRASS, { hi: 0.55, lo: 0.4 });
    const pts2 = [[...to(fwd + 0.8, -0.8), 1], [...to(fwd + 2.2, -1.0)], [...to(fwd + 4.2, 0), 1], [...to(fwd + 2.2, 1.0)], [...to(fwd + 0.8, 0.8), 1]];
    path(c, pts2); c.fillStyle = steel; c.fill();
    path(c, [[...to(fwd + 0.8, -0.8), 1], [...to(fwd + 2.2, -1.0)], [...to(fwd + 4.2, 0), 1], [...to(fwd + 0.8, 0), 1]]); c.fillStyle = lighten(steel, 0.45); c.fill();
  });
};

// the chaplain's reliquary: a little brass house on a chain, its windows lit
// with the ward's cold light, a few runes of it drifting off
const reliquary = (ctx, hx, hy, sway, p, bright) => {
  const x = hx + sway, y = hy + 3.4, s = 1.35;
  const ward = "#b8d0f0";
  ctx.strokeStyle = "#9a9aa2"; ctx.lineWidth = 0.45;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + sway * 0.3, hy + 1.6, x, y - 2.4 * s); ctx.stroke();
  glow(ctx, x, y, bright ? 7 : 5, ward, bright ? 0.7 : 0.55);
  part(ctx, (c) => {
    const pts = [[x - 1.3 * s, y + 1.5 * s, 1], [x - 1.3 * s, y - 0.6 * s, 1], [x, y - 1.9 * s, 1], [x + 1.3 * s, y - 0.6 * s, 1], [x + 1.3 * s, y + 1.5 * s, 1]];
    path(c, pts); c.fillStyle = cel(c, x - 1.3 * s, y - 1.9 * s, x + 1.3 * s, y + 1.5 * s, BRASS, 0.45, 0.4); c.fill();
    dab(c, x - 0.8 * s, y - 0.4 * s, 0.6 * s, 1.4 * s, "#f4f8ff"); dab(c, x + 0.2 * s, y - 0.4 * s, 0.6 * s, 1.4 * s, ward);
    dab(c, x - 1.4 * s, y + 1.1 * s, 2.8 * s, 0.5 * s, darken(BRASS, 0.4));
    dab(c, x - 0.25, y - 2.6 * s, 0.5, 1.2 * s, BRASS); dab(c, x - 0.6 * s, y - 2.3 * s, 1.2 * s, 0.45, BRASS);
  });
  // runes of the ward drifting up off it
  ctx.fillStyle = "#e4eefa";
  const n = bright ? 6 : 4;
  for (let i = 0; i < n; i++) { const t = i * 2.1 + (p.frame || 0) * 0.9; ctx.fillRect(x + Math.cos(t) * (2.8 + i * 0.4) - 0.3, y - 0.8 + Math.sin(t) * 2.2 - i * 0.6, 0.6, 0.6); }
};

// the ward's pip: a little heater of light, as the health bar draws it
const pip = (ctx, x, y, s, light) => part(ctx, (c) => {
  poly(c, [[x - s, y - s], [x + s, y - s], [x + s, y + 0.25 * s], [x, y + 1.5 * s], [x - s, y + 0.25 * s]], light);
  poly(c, [[x - s, y - s], [x, y - s], [x, y + 1.5 * s], [x - s, y + 0.25 * s]], mix(light, "#f4f8ff", 0.6));
});

// The magister's staff, gripped at (x, y) along a: a dark shaft shod and
// banded in black iron, and at its head two iron claws cradling the aegis
// crystal — a pale-blue heater, the ward's pip writ large, always upright.
// o.top: grip to crystal; o.butt: grip to foot; o.flare 0 at rest, 1 raised,
// 2 thrown (the aegis bursts: rays and three pips flying off).
const aegisStaff = (ctx, x, y, a, p, o) => {
  const to = along(x, y, a), top = o.top ?? 13, butt = o.butt ?? 10, fl = o.flare || 0;
  const light = p.col || "#9ab6d8", iron = p.wcol || "#3a3c46", white = mix(light, "#f4f8ff", 0.75);
  part(ctx, (c) => {
    haft(c, to, -butt, top - 0.6, 1.0, "#3e2c22");
    tube(c, ...to(-butt - 0.3), ...to(-butt + 0.9), 1.25, iron);          // the shoe
    tube(c, ...to(-1.3), ...to(-0.9), 1.3, BRASS);                          // a brass band under the hand
    tube(c, ...to(top - 1.9), ...to(top - 0.9), 1.5, iron);                 // the collar
  });
  const C = to(top + 1.2);
  const [cx, cy] = C;
  // (kept under the ink's alpha cut, so the halo stays soft and unlined)
  glow(ctx, cx, cy, [5.4, 6.4, 7.6][fl], light, 0.42);
  // the claws, up either side of the crystal
  part(ctx, (c) => {
    c.strokeStyle = iron; c.lineWidth = 0.6; c.lineCap = "round";
    for (const v of [-1, 1]) { c.beginPath(); c.moveTo(...to(top - 1.1, v * 0.4)); c.quadraticCurveTo(...to(top - 0.2, v * 2.0), cx + v * 1.9, cy - 0.9); c.stroke(); }
  });
  // the crystal: flat top, sides, the point below
  const s = fl ? 1.95 : 1.75;
  part(ctx, (c) => {
    const pts = [[cx - s, cy - s * 1.15, 1], [cx + s, cy - s * 1.15, 1], [cx + s, cy + s * 0.2, 1], [cx, cy + s * 1.55, 1], [cx - s, cy + s * 0.2, 1]];
    path(c, pts); c.fillStyle = light; c.fill();
    poly(c, [[cx - s, cy - s * 1.15], [cx, cy - s * 1.15], [cx, cy + s * 1.55], [cx - s, cy + s * 0.2]], lighten(light, 0.3));
    poly(c, [[cx + 0.1, cy + 0.2], [cx + s, cy + 0.2], [cx, cy + s * 1.55]], darken(light, 0.3));
    dab(c, cx - s * 0.7, cy - s * 0.85, 0.6, 1.1, white);
    if (fl) dab(c, cx - s * 0.7, cy - s * 0.85, s * 1.4, 0.55, white);
  });
  if (fl > 1) {
    // the aegis thrown: faint rays (unlined) and three pips of light flying off
    ctx.fillStyle = rgba(white, 0.4);
    for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4 + Math.PI / 8; ctx.fillRect(cx + Math.cos(t) * 3.4 - 0.4, cy + Math.sin(t) * 3.4 - 0.4, 0.8, 0.8); }
    for (const t of [-0.66 * Math.PI, -0.14 * Math.PI, 0.36 * Math.PI]) pip(ctx, cx + Math.cos(t) * 5.4, cy + Math.sin(t) * 5.2, 1.0, light);
  }
};

// ---- heads --------------------------------------------------------------------------
// (0,0) the middle of the skull, +x the face; a man's head is ~4.6 across
const face = (c0, skin, o = {}) => blob(c0, [[-2.0, 0.2], [-1.9, -1.6], [-0.6, -2.5], [1.2, -2.4], [2.1, -1.4], [2.3, -0.5], [2.8, 0.3, 1], [2.2, 0.8], [2.0, 1.6], [1.1, 2.4], [-0.4, 2.3], [-1.6, 1.4]], skin, {
  hi: 0.26, lo: 0.36, then: (c) => {
    dab(c, -0.9, -0.3, 0.8, 1.2, darken(skin, 0.24));                    // the ear
    line(c, 0.6, -1.2, 1.9, -1.0, 0.55, darken(o.brow || skin, 0.6));   // a hard brow
    dab(c, 1.0, -0.72, 0.62, 0.85, o.eyes || INKY);
    if (!o.eyes) dab(c, 1.0, -0.72, 0.3, 0.3, "#fff3d2");
    line(c, 1.9, 0.0, 2.3, 0.6, 0.4, darken(skin, 0.3));                 // the nose's side
    if (o.beard) blob(c, [[-0.6, 0.3], [1.0, 1.0], [2.4, 1.0], [2.6, 2.0], [1.8, 3.4, 1], [0.6, 3.0], [-0.6, 2.2]], o.beard, { hi: 0.3 });
    else { dab(c, 1.4, 1.3, 0.9, 0.35, darken(skin, 0.45)); dab(c, 0.4, 0.4, 0.4, 1.4, darken(skin, 0.14)); }  // a set mouth, a weathered cheek
    if (o.stubble) dab(c, 0.4, 1.6, 2.0, 0.9, mix(skin, o.stubble, 0.35));
    if (o.shade) { c.fillStyle = darken(skin, 0.32); c.fillRect(-3, -3, 7, o.shade); }
  },
});

// the levy's kettle hat: a round dome over a broad, tilted brim; the eyes in its shadow
const kettle = (ctx, x, y, a, p, o = {}) => inFrame(ctx, x, y, a, (c0) => {
  const steel = p.hair || "#6c7280", brim = o.brim ?? 4.3;
  if (o.hood) {
    // an oxblood hood under the hat, its tail down the nape
    blob(c0, [[-2.6, 2.6, 1], [-3.0, -0.4], [-2.4, -2.4], [0.6, -2.8], [2.2, -1.6], [1.0, -1.2], [0.2, 0.8], [0.8, 2.8, 1]], o.hood, { hi: 0.3, lo: 0.42 });
  }
  face(c0, p.skin, { shade: 1.3, eyes: p.eyes, stubble: o.stubble, brow: o.stubble });
  if (o.hood) blob(c0, [[-2.4, 2.6, 1], [-2.6, 0.2], [-1.6, -1.4], [-0.4, -1.0], [-0.8, 1.2], [-0.2, 2.8, 1]], o.hood, { hi: 0.25, lo: 0.4, then: (c) => line(c, -1.6, -0.6, -1.9, 2.4, 0.4, darken(o.hood, 0.35)) });
  // the dome
  blob(c0, [[-2.5, -1.2, 1], [-2.5, -2.4], [-1.6, -3.9], [0.2, -4.4], [1.9, -3.8], [2.6, -2.4], [2.6, -1.2, 1]], steel, {
    hi: 0.5, lo: 0.42, then: (c) => {
      line(c, -1.2, -3.8, -2.0, -1.6, 0.5, lighten(steel, 0.6));
      line(c, 0.2, -4.4, 0.2, -1.2, 0.45, darken(steel, 0.35));
      dab(c, -3, -1.9, 6, 0.5, darken(steel, 0.3));
    },
  });
  // the brim, seen a little from above: a lit top and a dark rolled edge
  blob(c0, [[-brim, -0.8, 1], [-brim + 0.8, -1.9], [0, -2.3], [brim - 0.4, -1.8], [brim + 0.3, -0.4, 1], [brim - 0.8, -0.2], [0, -0.7], [-brim + 1.2, -0.3]], steel, {
    hi: 0.55, lo: 0.4, then: (c) => {
      c.strokeStyle = darken(steel, 0.45); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(-brim, -0.6); c.quadraticCurveTo(0, -0.1, brim + 0.3, -0.4); c.stroke();
      for (const rx of [-2.2, 0.2, 2.4]) dab(c, rx, -1.6, 0.45, 0.45, lighten(steel, 0.6));
    },
  });
  if (o.strap) line(c0, 1.2, -0.4, 0.8, 2.3, 0.4, LEATHER);
});

// the sergeant's barbute: a deep bowl down to the jaw, a T cut for the face
const barbute = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const steel = p.hair || "#6c7280";
  blob(c0, [[-2.6, 2.8, 1], [-2.9, -0.4], [-2.4, -2.7], [-0.5, -3.6], [1.6, -3.3], [2.7, -2.0], [3.0, 0.2], [2.9, 2.2], [2.2, 3.1, 1], [-0.2, 3.2, 1]], steel, {
    hi: 0.5, lo: 0.45, then: (c) => {
      // the T: eyes across, the mouth down; the face deep in its shadow
      poly(c, [[0.5, -1.3], [3.2, -1.2], [3.2, -0.1], [2.5, -0.1], [2.4, 3.4], [1.3, 3.4], [1.35, -0.1], [0.5, -0.2]], darken(p.skin, 0.55));
      dab(c, 1.6, -1.0, 0.7, 0.6, p.eyes || INKY);
      dab(c, 1.45, 0.3, 0.9, 1.2, darken(p.skin, 0.4));
      // the medial ridge, lit, and a brass rivet at the temple
      line(c, -0.6, -3.5, -2.6, 0.8, 0.5, lighten(steel, 0.6));
      line(c, 0.6, -3.6, 2.9, -1.8, 0.45, darken(steel, 0.35));
      dab(c, -1.2, -0.2, 0.6, 0.6, BRASS);
      line(c, -2.9, 2.2, 2.9, 2.5, 0.45, darken(steel, 0.45));
    },
  });
  // a short black crest along the ridge
  blob(c0, [[-2.6, -2.4], [-2.0, -3.9], [0.4, -4.3], [1.4, -3.6], [0.2, -3.5], [-1.4, -2.8]], IRONK, { hi: 0.5 });
});

// the chaplain's mitre over a mail coif, a grey beard below
const mitre = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const cream = p.cloth2 || "#e0d8c4", red = p.cloth || "#7a2a2c", mail = mix(p.cloth2 || "#e0d8c4", "#6c7280", 0.78);
  // the coif, round the face and down onto the shoulders
  blob(c0, [[-2.8, 3.2, 1], [-3.1, 0.2], [-2.6, -2.2], [0.2, -2.9], [2.2, -2.0], [2.5, -1.2], [0.6, -1.4], [0.1, 1.4], [1.4, 3.3, 1]], mail, {
    hi: 0.4, lo: 0.4, then: (c) => { for (let yy = -2; yy < 3.4; yy += 0.9) for (let xx = -3; xx < 2; xx += 0.9) dab(c, xx + (yy * 1.1 % 0.9), yy, 0.35, 0.35, darken(mail, 0.3)); },
  });
  face(c0, p.skin, { beard: p.hair || "#c8c0b0", eyes: p.eyes, brow: p.hair });
  // the mitre: two lit faces rising to a peak, an iron band, an oxblood orphrey
  blob(c0, [[-2.4, -1.4, 1], [-2.6, -3.4], [-1.8, -6.2], [-0.2, -7.9, 1], [1.2, -6.4], [2.4, -3.8], [2.3, -1.4, 1]], cream, {
    hi: 0.3, lo: 0.42, then: (c) => {
      dab(c, -0.55, -8, 1.1, 7, red);
      dab(c, -1.6, -5.2, 3.2, 0.8, red);
      line(c, -1.9, -6.0, -0.4, -7.6, 0.4, lighten(cream, 0.4));
      dab(c, -3, -2.3, 6, 0.95, IRONK);
      for (const rx of [-1.8, 0.2, 1.8]) dab(c, rx, -2.1, 0.45, 0.45, BRASS);
    },
  });
  // the lappets hang behind
  blob(c0, [[-2.2, -1.6], [-1.4, -1.6], [-2.0, 2.6, 1], [-3.0, 2.4, 1]], red, { hi: 0.25, then: (c) => dab(c, -3.2, 1.8, 2, 0.4, BRASS) });
});

// the Lord Marshal's great helm: flat-topped and dark, breaths pierced in the
// cheek, a brass coronet, a long plume sweeping back
const marshalHelm = (ctx, x, y, a, p, f) => inFrame(ctx, x, y, a, (c0) => {
  const steel = p.hair || "#5e6472", plume = p.plume || "#e8e0cc", fl = [0.3, 0.7, 0.2, 0.5][(f || 0) % 4];
  blob(c0, [[0.2, -3.8], [-1.2, -5.6], [-3.6, -6.0], [-6.2, -4.8], [-7.6 - fl, -2.6, 1], [-5.8, -3.4], [-4.8 - fl * 0.5, -1.6, 1], [-3.6, -3.2], [-1.6, -3.4]], plume, {
    hi: 0.25, lo: 0.4, then: (c) => { line(c, -1.0, -4.8, -5.6, -4.2, 0.45, darken(plume, 0.3)); line(c, -2.2, -3.9, -6.2, -2.8, 0.4, darken(plume, 0.25)); },
  });
  blob(c0, [[-2.6, 2.7, 1], [-2.9, -0.4], [-2.8, -3.2, 1], [-0.4, -3.6, 1], [2.3, -3.3, 1], [3.1, -1.0], [3.2, 1.2], [2.6, 2.9, 1], [0.4, 3.2, 1]], steel, {
    hi: 0.5, lo: 0.45, then: (c) => {
      dab(c, 0.5, -1.25, 2.9, 0.8, INKY);                                   // the sight
      dab(c, 1.4, -1.2, 0.7, 0.55, p.eyes || "#e8c860");                   // a glint within
      line(c, 2.3, -3.3, 2.5, 3.0, 0.55, lighten(steel, 0.35));             // the prow
      for (const [bx, by] of [[1.1, 0.6], [1.9, 0.6], [1.1, 1.4], [1.9, 1.4], [1.5, 2.2]]) dab(c, bx, by, 0.4, 0.4, INKY);
      dab(c, -3, -0.3, 6.4, 0.5, BRASS);
      line(c, -1.4, -3.2, -2.4, 0.4, 0.5, lighten(steel, 0.6));
      dab(c, -3, 2.3, 6.4, 0.6, BRASS);
    },
  });
  // the coronet: a brass band of merlons — the tower, crowned
  blob(c0, [[-2.8, -2.6, 1], [-2.9, -4.6, 1], [-2.0, -4.6, 1], [-1.9, -3.8, 1], [-0.8, -3.8, 1], [-0.7, -5.2, 1], [0.4, -5.2, 1], [0.5, -3.8, 1], [1.5, -3.8, 1], [1.6, -4.7, 1], [2.5, -4.7, 1], [2.4, -2.6, 1], [0, -3.0, 1]], BRASS, {
    hi: 0.5, lo: 0.4, then: (c) => { dab(c, -0.4, -4.6, 0.8, 0.8, "#c8383a"); dab(c, -2.5, -3.8, 0.5, 0.5, lighten(BRASS, 0.5)); },
  });
});

// the magister's hood: an oxblood cowl close round a stern, bearded face,
// its stiff peak standing up and swept back; brass edging the opening (rank)
const magHood = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const red = p.cloth || "#7a2a2c";
  // the cowl's lining behind the head, falling onto the shoulders
  blob(c0, [[-3.0, 3.4, 1], [-3.4, 0.2], [-2.8, -2.8], [-0.8, -4.0], [1.4, -3.6], [2.6, -2.0], [1.2, -1.0], [0.4, 1.4], [1.4, 3.4, 1]], darken(red, 0.3), { hi: 0.15, lo: 0.4 });
  face(c0, p.skin, { shade: 1.5, eyes: p.eyes || lighten(p.col || "#9ab6d8", 0.2), beard: darken(p.skin, 0.66), brow: darken(p.skin, 0.5) });
  blob(c0, [[2.9, -1.2, 1], [2.6, -2.9], [1.3, -4.3], [0.0, -5.0], [-1.2, -5.8], [-2.7, -7.3, 1], [-2.6, -5.6], [-3.2, -3.9], [-3.4, -2.0], [-2.9, 0.0], [-3.5, 1.8], [-3.3, 3.3, 1], [-1.1, 3.5, 1], [-0.6, 1.2], [0.1, -0.6], [1.5, -1.4]], red, {
    hi: 0.3, lo: 0.42, then: (c) => {
      // the opening's brass edge, and the folds of the cowl
      c.strokeStyle = BRASS; c.lineWidth = 0.45; c.beginPath(); c.moveTo(2.8, -1.4); c.quadraticCurveTo(0.6, -1.4, -0.4, 1.2); c.lineTo(-0.9, 3.4); c.stroke();
      line(c, -1.2, -4.4, -2.8, -0.4, 0.45, darken(red, 0.4));
      line(c, 0.9, -4.2, -2.3, -6.6, 0.4, lighten(red, 0.3));
      poly(c, [[-2.6, -5.6], [-3.4, -3.8], [-3.4, -1.8], [-2.9, -0.2], [-2.2, -2.6], [-2.0, -4.6]], darken(red, 0.25));
      line(c, -2.2, 0.6, -2.4, 3.2, 0.35, darken(red, 0.3));
    },
  });
});

// the unseated knight's sallet — the Gryphon Knight's own helm (rigs-
// ironmounts.js): a rounded bowl with a long tail over the nape, the visor
// down, the bevor's black-iron rim, an oxblood crest swept back; and one
// tawny gryphon's feather caught in it from the fall
const sallet = (ctx, x, y, a, p, f) => inFrame(ctx, x, y, a, (c0) => {
  const steel = p.hair || "#6c7280", crest = p.cloth || "#7a2a2c", fl = [0.2, 0.6, 0.1, 0.45][(f || 0) % 4];
  if (p.mane) blob(c0, [[0.0, -3.0], [-0.9, -5.0], [-2.7, -6.8, 1], [-1.8, -4.9], [-1.1, -3.0]], p.mane, { hi: 0.4, lo: 0.35, then: (c) => line(c, -0.5, -3.3, -2.3, -6.2, 0.3, darken(p.mane, 0.45)) });
  blob(c0, [[0.6, -3.0], [-0.6, -4.4], [-2.8, -4.7 - fl * 0.2], [-4.9 - fl, -3.4 + fl * 0.3, 1], [-3.0, -3.3], [-1.6, -2.6]], crest, { hi: 0.35, lo: 0.4, then: (c) => line(c, -0.6, -3.9, -3.6, -3.8, 0.4, lighten(crest, 0.3)) });
  blob(c0, [[-2.4, 1.0], [-2.7, -1.0], [-2.1, -2.7], [-0.3, -3.4], [1.7, -3.1], [2.8, -1.8], [3.1, 0.0, 1], [2.9, 1.4], [2.0, 2.4], [0.2, 2.7], [-1.4, 2.2], [-3.2, 2.4, 1], [-4.4, 1.9, 1]], steel, {
    hi: 0.55, lo: 0.4, then: (c) => {
      dab(c, 0.5, -0.9, 3, 0.75, INKY);                                   // the sight
      dab(c, 1.9, -0.9, 0.5, 0.4, p.eyes || p.skin);                      // a glint of the man
      dab(c, -4.5, 0.6, 7.6, 0.5, IRONK);                                 // the bevor's rim
      line(c, -0.6, -3.1, -2.2, -0.6, 0.45, lighten(steel, 0.65));
      for (const [rx, ry] of [[-1.6, 1.4], [0.2, 1.6], [1.8, 1.4]]) dab(c, rx, ry, 0.45, 0.45, BRASS);
    },
  });
});

// ---- the soldier ------------------------------------------------------------------
const MAN = { L1: 4.8, L2: 4.6, stride: 2.3, lift: 1.8, bob: 0.6, lean: 0.04, dip: 0.03, lunge: 1.3, hitLean: 0.16, hipW: 0.7, thigh: 2.3, shin: 2.0, foot: 3.1, ankle: 0.8 };
// plate walks heavier: a shorter, flatter step, square shoulders, no lean
const HEAVY = { L1: 4.8, L2: 4.6, stride: 2.0, lift: 1.3, bob: 0.4, lean: 0.0, dip: 0.02, lunge: 1.2, hipW: 0.9, thigh: 2.6, shin: 2.3, foot: 3.3, ankle: 0.85, hitLean: 0.14 };
const ROBE = { L1: 4.8, L2: 4.6, stride: 1.9, lift: 1.2, bob: 0.45, lean: 0.03, dip: 0.02, lunge: 1.1, hipW: 0.6, thigh: 2.2, shin: 1.9, foot: 3.0, ankle: 0.8 };
// a rider's plate, lighter than the sergeant's: a longer, livelier step
// the crossbowman stands his ground to shoot (see step); the levy thrusts
// from behind his shield, barely stepping out of the line
const SHOOTER = { ...MAN, shoot: true };
const LEVY = { ...MAN, lunge: 0.6, hitLean: 0.08 };
const KNIGHT = { L1: 4.8, L2: 4.6, stride: 2.2, lift: 1.6, bob: 0.5, lean: 0.03, dip: 0.03, lunge: 1.3, hipW: 0.8, thigh: 2.4, shin: 2.1, foot: 3.2, ankle: 0.85, hitLean: 0.18 };

// where the hands go, per look: the march (swinging with the stride), then
// the four fight frames [guard, wind-up, strike, follow-through]. hn is the
// weapon hand's target and an the haft's angle out of the fist (0 = +x,
// forward); hf the far hand. Every pose keeps the elbow folding the natural
// way and under ~145°, and the haft crossing the fist, never folded back.
const hands = (look, st, shN, shF) => {
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy], F = (dx, dy) => [shF[0] + dx, shF[1] + dy];
  const pick = (march, fight) => (st.fight ? fight[st.f] : march);
  // the levy: spear at the slope on the march, leaning out ahead of his nose;
  // in the fight he thrusts from behind the shield with the fist at his
  // collarbone and the point angled up, so the shaft runs back UNDER the jaw
  // (never across the face): drawn back low to the chest, driven out, over-reached
  if (look === "levy") return pick({ hn: N(2.3 + sw * 0.3, 3.1), an: -1.22 + sw * 0.04, hf: F(4.4, 2.3) }, [
    { hn: N(3.0, 0.4), an: -0.22, hf: F(4.6, 1.8) },
    { hn: N(1.8, 1.6), an: -0.45, hf: F(4.3, 2.0) },
    { hn: N(4.6, -0.1), an: -0.12, hf: F(4.5, 2.2) },
    { hn: N(4.4, 0.8), an: 0.06, hf: F(4.6, 2.0) }]);
  // the crossbowman: the arbalest carried at the ready on the march, nose up
  // and forward (the fore hand on the tiller; the prod stands out ahead of the
  // kettle's brim instead of across the face); in the fight a shooting cycle — ready, aim at the cheek, loose
  // (the nose kicks up), reload (the nose down in the far hand, the near hand
  // back to the bolt box). grip: how far up the tiller the fore hand holds;
  // held: "far" when only the far hand holds it (at `grip` up the tiller).
  // The trigger hand's forearm runs under the stock like a rifleman's.
  if (look === "bow") return pick({ hn: N(0.6 + sw * 0.2, 3.3), an: -0.3 + sw * 0.03, grip: 1.2 }, [
    { hn: N(1.4, 2.2), an: -0.5, grip: 1.3 },
    { hn: N(2.3, -1.0), an: -0.04, grip: 1.1 },
    { hn: N(2.0, -1.3), an: -0.2, grip: 1.1, loosed: true },
    { hn: N(-2.0, 5.2), an: 0.9, hf: F(4.4, 4.0), grip: 2.2, held: "far" }]);
  // the chaplain: the mace carried up; in the fight the reliquary raised in
  // the far hand as the mace goes up overhead and comes down
  if (look === "chaplain") return pick({ hn: N(2.5 + sw * 0.3, 4.0), an: -0.95 + sw * 0.04, hf: F(3.4 - sw * 0.5, 3.4), sway: sw * 0.6 }, [
    { hn: N(3.2, 1.0), an: -1.25, hf: F(4.6, -1.2), sway: 0.3, bright: true },
    { hn: N(-3.0, -4.7), an: -2.4, hf: F(4.4, -3.2), sway: -0.4, bright: true },
    { hn: N(4.4, 1.6), an: 0.4, hf: F(4.8, -0.6), sway: 0.9, bright: true },
    { hn: N(3.0, 3.8), an: 1.05, hf: F(4.4, 0.6), sway: 1.3, bright: true }]);
  // the Lord Marshal: the war-banner upright on the march; in the fight he
  // rears it back and brings the lance-head down like a blow
  if (look === "marshal") return pick({ hn: N(4.2 + sw * 0.2, 4.0), an: -1.6 + sw * 0.03, hf: F(4.3, 3.2) }, [
    { hn: N(4.1, 2.4), an: -1.42, hf: F(4.8, 2.6), back: 6, fwd: 14 },
    { hn: N(0.3, -2.3), an: -2.28, hf: F(4.6, 2.6), back: 6, fwd: 14, fly: 8 },
    { hn: N(4.0, 0.8), an: -0.85, hf: F(3.0, 3.8), back: 9, fwd: 11, flag: 6.6, lowered: true },
    { hn: N(3.2, 2.4), an: -0.72, hf: F(3.4, 3.6), back: 9, fwd: 11, flag: 6.6, lowered: true }]);
  // the magister: the staff carried tall like a walking staff; in the fight
  // raised (the far palm open, casting), thrust up as the aegis flares, and
  // settling as it fades — the fist and the staff always ahead of the beard,
  // never across the face
  if (look === "magister") return pick({ hn: N(4.0 + sw * 0.3, 3.2), an: -1.44 + sw * 0.03, hf: F(1.4 - sw * 0.6, 5.0), top: 15.6, butt: 10.5, flare: 0 }, [
    { hn: N(3.6, 1.8), an: -1.36, hf: F(4.0, 1.4), top: 10.5, butt: 8, flare: 0 },
    { hn: N(3.9, -3.6), an: -1.3, hf: F(5.4, -0.8), top: 7.5, butt: 9, flare: 1, palm: true },
    { hn: N(4.7, -1.9), an: -1.16, hf: F(5.5, -0.6), top: 8.5, butt: 9, flare: 2, palm: true },
    { hn: N(4.4, -0.8), an: -1.26, hf: F(5.0, -0.6), top: 8.5, butt: 9, flare: 1, palm: true }]);
  // the unseated knight: an arming sword held up at the ready and a small
  // heater; he fights with the point — drawn back low, thrust, recover
  if (look === "unseated") return pick({ hn: N(2.2 + sw * 0.3, 3.8), an: -0.85 + sw * 0.05, hf: F(4.9, 2.2) }, [
    { hn: N(2.6, 1.4), an: -1.2, hf: F(5.0, 1.8) },
    { hn: N(0.3, 3.5), an: -0.25, hf: F(5.0, 1.6) },
    { hn: N(5.2, -0.4), an: -0.12, hf: F(4.2, 2.8) },
    { hn: N(4.6, 1.4), an: 0.38, hf: F(4.4, 2.4) }]);
  // the sergeant: blade carried low and level, a heater on the far arm; in
  // the fight a heavy cut from over the shoulder, the shield covering
  return pick({ hn: N(2.0 + sw * 0.3, 4.1), an: -0.3 - sw * 0.05, hf: F(4.4, 3.2) }, [
    { hn: N(2.8, 1.4), an: -1.2, hf: F(4.8, 2.4) },
    { hn: N(-2.7, -5.2), an: -2.3, hf: F(5.0, 2.0) },
    { hn: N(3.6, 1.3), an: 0.55, hf: F(3.4, 3.6) },
    { hn: N(3.0, 3.8), an: 1.05, hf: F(4.2, 3.0) }]);
};

const soldier = (ctx, p) => {
  const k = (p.h ?? 22) / 22; ctx.save(); ctx.scale(k, k);
  const look = p.look;
  const knight = look === "unseated", mage = look === "magister";
  const plated = look === "sergeant" || look === "marshal" || knight;
  const o = knight ? KNIGHT : plated ? HEAVY : look === "chaplain" || mage ? ROBE : look === "bow" ? SHOOTER : look === "levy" ? LEVY : MAN;
  // cloth swing in a fight: `wound` when drawn back, `struck` at the blow (trailing a frame)
  const cl = (struck, wound) => wound + (struck - wound) * st.cloth;
  const R = skeleton(p, o), { st, T } = R;
  const skin = p.skin, skinF = darken(skin, 0.24);
  const red = p.cloth, under = p.cloth2;          // oxblood, and what's under it (padding, plate, the alb)
  const steel = plated ? under : null;
  const burly = look === "marshal" ? 1.16 : look === "sergeant" ? 1.08 : knight ? 1.03 : 1;
  shadow(ctx, 0.4, -0.1, 4.8 * burly, 1.3, 0.24);
  const shN = T(1.0 * burly, -6.6), shF = T(-1.1 * burly, -6.8);
  const A = { up: 3.1, fore: 2.9, w: plated ? 2.1 : look === "levy" ? 2.0 : 1.9 };
  const H = hands(look, st, shN, shF);

  // limb colours
  let armN, armF, legN, fistN, fistF;
  const hose = mix(under, "#3a3440", 0.62), boot = LEATHER;
  if (plated) {
    const mail = mix(darken(steel, 0.2), "#7a808c", 0.4);
    // the rider is plated to the shoulder; the foot wear mail on the upper arm
    const upper = knight ? steel : mail;
    armN = { up: upper, fore: steel, cuff: lighten(steel, 0.1), elbow: lighten(steel, 0.08) };
    armF = { up: darken(upper, 0.25), fore: darken(steel, 0.25), cuff: darken(steel, 0.15) };
    legN = { thigh: steel, shin: steel, wrap: lighten(steel, 0.06), wrapAt: 0.3, foot: darken(steel, 0.08), knee: lighten(steel, 0.12), plate: true };
    fistN = lighten(steel, 0.05); fistF = darken(steel, 0.25);
  } else if (look === "chaplain") {
    const mail = mix(under, "#6c7280", 0.78);
    armN = { up: mail, fore: mail, cuff: under }; armF = { up: darken(mail, 0.25), cuff: darken(under, 0.25) };
    legN = { thigh: darken(under, 0.3), shin: darken(under, 0.3), foot: boot };
    fistN = skin; fistF = skinF;
  } else if (mage) {
    // robe sleeves with steel vambraces; dark hose and boots under the robe
    const vam = p.hair || "#6c7280";
    armN = { up: under, fore: under, cuff: vam }; armF = { up: darken(under, 0.25), cuff: darken(vam, 0.25) };
    legN = { thigh: darken(under, 0.25), shin: darken(under, 0.25), foot: boot };
    fistN = skin; fistF = skinF;
  } else {
    // quilted sleeves; hose and turned-down boots
    armN = { up: under, cuff: LEATHER }; armF = { up: darken(under, 0.25), cuff: darken(LEATHER, 0.25) };
    legN = { thigh: hose, shin: hose, wrap: boot, wrapAt: 0.45, foot: darken(boot, 0.1), garter: look === "levy" ? red : null };
    fistN = skin; fistF = skinF;
  }
  const legF = Object.fromEntries(Object.entries(legN).map(([kk, v]) => [kk, typeof v === "string" ? darken(v, 0.25) : v]));

  // the marshal's cape, sweeping behind everything; the banner's flag flies
  // behind him too (only the lowered strike carries it before him)
  const bannerO = { back: H.back ?? 5.5, fwd: H.fwd ?? 16, flag: H.flag, lowered: H.lowered, fly: H.fly };
  if (look === "marshal" && !H.lowered) {
    const hB = ik(shN[0], shN[1], H.hn[0], H.hn[1], A.up, A.fore, -1)[1];
    warBanner(ctx, hB[0], hB[1], H.an, p, st.fight ? st.f + 1 : st.f, { ...bannerO, only: "flag" });
  }
  if (look === "marshal") {
    const cape = p.cape || red, len = 7.4, fl = st.fight ? cl(2.2, 0.4) : [0.8, 1.6, 0.6, 1.3][st.f];
    const pts = [[1.6, -7.8], [-1.8, -8.0], [-3.4, -6.0], [-4.0 - fl * 0.3, -1.0], [-5.2 - fl, 3.6], [-6.6 - fl * 1.4, len, 1], [-5.0 - fl, len - 0.8, 1], [-3.6 - fl * 0.7, len + 0.1, 1], [-2.2 - fl * 0.4, len - 0.7, 1], [-0.9, len - 0.1, 1], [-0.6, 2.0], [-0.2, -4.0]];
    inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => blob(c, pts, cape, {
      hi: 0.3, lo: 0.45, then: (cc) => {
        line(cc, -2.6, -5.0, -4.9 - fl, len - 0.4, 0.55, darken(cape, 0.4));
        line(cc, -1.3, -3.2, -2.4 - fl * 0.5, len - 0.4, 0.45, darken(cape, 0.32));
        cc.strokeStyle = BRASS; cc.lineWidth = 0.7; cc.beginPath(); cc.moveTo(-6.8 - fl * 1.4, len - 0.2); cc.lineTo(-5.0 - fl, len - 1.0); cc.lineTo(-3.6 - fl * 0.7, len - 0.1); cc.lineTo(-2.2 - fl * 0.4, len - 0.9); cc.lineTo(-0.9, len - 0.3); cc.stroke();
      },
    }));
  }
  // the unseated knight's riding cape, short and torn in the fall
  if (knight) {
    const cape = p.cape || red, fl = st.fight ? cl(1.6, 0.3) : [0.7, 1.3, 0.5, 1.1][st.f], len = 4.4;
    const pts = [[1.2, -7.8], [-1.6, -8.0], [-3.0, -6.2], [-3.4 - fl * 0.3, -2.0], [-4.2 - fl, 1.8], [-5.0 - fl * 1.3, len, 1], [-4.1 - fl, len - 1.6, 1], [-3.5 - fl * 0.8, len + 0.3, 1], [-2.7 - fl * 0.6, len - 0.9, 1], [-2.2 - fl * 0.4, len - 0.1, 1], [-1.3, len - 2.6, 1], [-0.8, -0.8], [-0.4, -4.0]];
    inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => blob(c, pts, cape, {
      hi: 0.3, lo: 0.45, then: (cc) => {
        line(cc, -2.4, -5.2, -4.0 - fl, len - 1.2, 0.5, darken(cape, 0.4));
        // the rip: a dark slit up from the hem
        line(cc, -2.9 - fl * 0.6, len - 0.4, -2.3 - fl * 0.3, len - 3.4, 0.45, darken(cape, 0.6));
      },
    }));
  }
  // the magister's robe falls to the ankles behind the legs
  if (mage) inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const sw = st.fight ? cl(0.9, -0.4) : st.c * 0.6;
    blob(c, [[-2.4, -1.2], [-2.8 - sw * 0.3, 3.5], [-3.6 - sw * 0.5, 7.7, 1], [3.1 + sw, 7.7, 1], [2.6 + sw * 0.4, 3.5], [2.3, -1.2]], darken(under, 0.25), { hi: 0.15, then: (cc) => dab(cc, -4, 7.0, 8, 0.7, darken(red, 0.3)) });
  });
  // the chaplain's alb hangs behind the legs
  if (look === "chaplain") inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const sw = st.fight ? cl(0.8, -0.3) : st.c * 0.5;
    blob(c, [[-2.4, -1.2], [-2.6 - sw * 0.3, 3.5], [-3.2 - sw * 0.5, 6.9, 1], [2.9 + sw, 6.9, 1], [2.4 + sw * 0.4, 3.5], [2.2, -1.2]], darken(under, 0.22), { hi: 0.2 });
  });
  // the crossbowman's bolt box rides on the back hip
  const quiver = () => inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    for (const [dx, col] of [[-0.2, "#e8e2d0"], [0.5, red], [1.2, "#e8e2d0"]]) blob(c, [[-3.2 + dx, -1.8], [-3.0 + dx, -3.4, 1], [-2.5 + dx, -1.8]], col, { hi: 0.3 });
    blob(c, [[-3.8, -2.0, 1], [-1.6, -2.0, 1], [-1.4, 2.4, 1], [-3.4, 2.8, 1]], LEATHER, { hi: 0.35, then: (cc) => { dab(cc, -4, -1.4, 3, 0.5, IRONK); dab(cc, -4, 1.4, 3, 0.5, IRONK); dab(cc, -2.8, -0.6, 0.5, 0.5, BRASS); } });
  });

  // the far arm, behind the body: the shield arm and the reliquary arm
  const twoHand = look === "bow";
  const shielded = look === "levy" || look === "sergeant" || look === "marshal" || knight;
  let hfC = null;
  if (shielded) arm(ctx, shF, H.hf, A, armF);
  if (look === "chaplain" || mage) hfC = arm(ctx, shF, H.hf, A, armF);

  // legs
  leg(ctx, R, o, "far", legF);
  leg(ctx, R, o, "near", legN);

  // the trunk, the skirts below the belt, and what is worn on them
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const sw = st.fight ? cl(0.8, -0.2) : st.c * 0.6;
    if (look === "chaplain") {
      // the alb to the ankles, the chasuble over it to the knee
      const hem = 6.9, kick = st.fight ? cl(1.0, -0.3) : st.c * 0.7;
      blob(c, [[-2.5, -1.2], [2.3, -1.2], [2.7 + kick * 0.5, 3.4], [3.2 + kick, hem, 1], [-0.2 + kick * 0.3, hem + 0.2, 1], [-0.4, 2.8]], under, {
        hi: 0.28, lo: 0.4, then: (cc) => { dab(cc, -3, hem - 0.9, 7, 0.8, red); line(cc, 1.4, 0, 1.8 + kick * 0.5, hem, 0.4, darken(under, 0.3)); },
      });
    } else if (mage) {
      // the robe to the ankles, open down the front on its oxblood lining,
      // brass along the hem (rank); it swings with the stride
      const hem = 7.6, kick = st.fight ? cl(1.1, -0.3) : st.c * 0.7;
      blob(c, [[-2.5, -1.2], [2.4, -1.2], [2.8 + kick * 0.5, 3.4], [3.3 + kick, hem, 1], [-1.4 + kick * 0.3, hem + 0.2, 1], [-2.3, 3.2]], under, {
        hi: 0.28, lo: 0.42, then: (cc) => {
          line(cc, 2.3, -1.2, 3.0 + kick, hem, 0.9, red);
          dab(cc, -3, hem - 0.6, 8, 0.6, BRASS);
          line(cc, 0.4, 0.2, 0.6 + kick * 0.5, hem - 0.6, 0.4, darken(under, 0.35));
          line(cc, -1.2, 0.8, -1.3 + kick * 0.2, hem - 0.6, 0.35, lighten(under, 0.2));
        },
      });
    } else if (knight) {
      // the rider's short surcoat skirt, dagged at the hem
      const hem = 3.6;
      blob(c, [[-2.6, -1.0], [2.5, -1.0], [3.0 + sw, hem - 0.7], [2.7 + sw, hem + 0.2, 1], [1.7 + sw * 0.6, hem - 0.6], [0.7 + sw * 0.4, hem + 0.3, 1], [-0.3, hem - 0.6], [-1.4 - sw * 0.3, hem + 0.2, 1], [-2.3 - sw * 0.5, hem - 0.6], [-3.0 - sw * 0.6, hem, 1]], red, {
        hi: 0.3, lo: 0.45, then: (cc) => line(cc, 0.6, -0.6, 0.9 + sw * 0.4, hem - 0.4, 0.4, darken(red, 0.3)),
      });
    } else if (plated) {
      // the surcoat's skirts, long and split, over plated thighs
      const hem = look === "marshal" ? 4.8 : 4.2;
      const panel = (pts, col) => blob(c, pts, col, { hi: 0.28, then: (cc) => { cc.fillStyle = look === "marshal" ? BRASS : IRONK; cc.fillRect(-4, hem - 0.8, 8, 0.8); } });
      panel([[-2.6, -1.0], [0.2, -1.0], [0.0 - sw * 0.3, hem, 1], [-3.0 - sw * 0.6, hem - 0.3, 1]], darken(red, 0.2));
      panel([[-0.3, -1.0], [2.5, -1.0], [3.0 + sw, hem - 0.2, 1], [0.2 + sw * 0.4, hem, 1]], red);
    } else {
      // the padded skirt, and the tabard's front flap over it
      const hem = 3.0;
      blob(c, [[-2.5, -1.0], [2.4, -1.0], [2.8 + sw, hem, 1], [-2.9 - sw * 0.6, hem - 0.2, 1]], under, { hi: 0.28, then: (cc) => { for (const x of [-1.6, -0.2, 1.2]) line(cc, x, -0.6, x + 0.2, hem, 0.35, darken(under, 0.3)); } });
      if (look === "levy") blob(c, [[-0.2, -1.0], [2.3, -1.0], [2.6 + sw, hem + 0.6, 1], [0.2 + sw * 0.4, hem + 0.8, 1]], red, { hi: 0.3, then: (cc) => dab(cc, -1, hem - 0.1, 5, 0.6, IRONK) });
    }

    const trunk = [[2.0, 0.2], [2.2, -1.8], [2.7, -4.2], [2.8, -5.9], [1.9, -7.0], [0, -7.4], [-1.8, -7.1], [-2.6, -5.8], [-2.5, -3.6], [-2.0, -1.6], [-2.1, 0.2]].map(([x, y]) => [x * (y < -2 ? burly : 1), y]);
    const trunkCol = plated ? red : under;
    blob(c, trunk, trunkCol, {
      hi: 0.3, lo: 0.42, then: (cc) => {
        if (knight) {
          // the rider's surcoat: the breastplate shows at the arm-hole
          const bp = [[0.9, -8.2], [2.6, -7.2], [3.2, -4.6], [1.8, -4.8], [1.2, -6.8]];
          path(cc, bp); cc.fillStyle = cel(cc, ...bbox(bp), steel, 0.55, 0.3); cc.fill();
          line(cc, -1.6, -6.6, -2.2, -3.6, 0.45, lighten(red, 0.3));
        } else if (mage) {
          // the black-iron robe: the oxblood lining down its opening, the
          // tower on the breast
          poly(cc, [[1.7, -7.6], [3.2, -7.6], [3.2, 0.6], [2.2, 0.6]], red);
          line(cc, 1.9, -7.4, 2.4, 0.4, 0.35, BRASS);
          towerDevice(cc, 0.1, -4.5, 0.75);
          line(cc, -2.2, -6.0, -2.3, -1.8, 0.45, lighten(under, 0.25));
        } else if (plated) {
          // the oxblood surcoat over plate, the tower on the breast
          towerDevice(cc, 0.9, -4.6, 0.95);
          line(cc, 2.2, -6.4, 2.4, -2.2, 0.45, lighten(red, 0.3));
          dab(cc, -3.2, -8.0, 6.4, 1.4, mix(darken(steel, 0.2), "#7a808c", 0.4));
        } else if (look === "chaplain") {
          // the chasuble: an oxblood yoke with a cream-and-brass Y down the front
          poly(cc, [[-3, -7.6], [3, -7.6], [3, 0.6], [-3, 0.6]], red);
          poly(cc, [[1.0, -7.6], [1.9, -7.6], [1.9, 0.6], [1.0, 0.6]], under);
          poly(cc, [[-2.4, -7.4], [-1.6, -7.4], [1.5, -4.6], [1.4, -3.8]], under);
          dab(cc, 1.25, -5.0, 0.45, 0.45, BRASS); dab(cc, 1.25, -2.6, 0.45, 0.45, BRASS);
          line(cc, -2.2, -6.0, -2.4, -1.0, 0.45, lighten(red, 0.25));
        } else {
          // quilted padding, diamond-stitched
          cc.strokeStyle = darken(under, 0.28); cc.lineWidth = 0.35;
          for (let i = -3; i < 4; i++) { cc.beginPath(); cc.moveTo(-3 + i * 1.6, -7.6); cc.lineTo(3 + i * 1.6, 0.6); cc.stroke(); cc.beginPath(); cc.moveTo(3 + i * 1.6, -7.6); cc.lineTo(-3 + i * 1.6, 0.6); cc.stroke(); }
          if (look === "levy") {
            // the oxblood tabard: a panel down the front, the tower on it
            poly(cc, [[-0.2, -7.6], [3.2, -7.6], [3.2, 0.6], [-0.2, 0.6]], red);
            line(cc, 2.4, -6.6, 2.6, -2.2, 0.4, lighten(red, 0.3));
            towerDevice(cc, 1.4, -4.6, 0.7);
          } else {
            // the hood's capelet over the shoulders
            poly(cc, [[-3, -7.6], [3, -7.6], [3, -5.6], [1.2, -4.8], [-0.6, -5.4], [-3, -5.2]], red);
            dab(cc, -3, -5.6, 6, 0.4, darken(red, 0.35));
            line(cc, 2.0, -7.2, -2.2, -1.6, 0.9, LEATHER);                // the baldric of the bolt box
          }
        }
        // the belt: black iron and a brass buckle for plate, leather otherwise
        const belt = plated || mage ? IRONK : look === "chaplain" ? mix(under, "#8a7a5a", 0.4) : "#3e2a1c";
        dab(cc, -3.2, -1.6, 6.4, 1.0, belt);
        if (look !== "chaplain") { dab(cc, 1.3, -1.7, 0.9, 1.2, plated || mage ? BRASS : "#8a8a92"); dab(cc, 1.6, -1.4, 0.35, 0.6, darken(belt, 0.4)); }
        else { line(cc, 1.6, -1.1, 2.0, 2.4, 0.45, belt); line(cc, 2.1, -1.1, 2.8, 1.8, 0.45, belt); }
      },
    });
    // the gorget or collar at the throat
    if (plated) blob(c, [[-1.4 * burly, -8.0], [1.5 * burly, -8.1], [2.0 * burly, -7.0], [-1.7 * burly, -6.9]], steel, { hi: 0.5, then: (cc) => { if (look === "marshal") dab(cc, -3, -7.4, 6, 0.5, BRASS); } });
    if (look === "levy") blob(c, [[-1.8, -7.8], [1.4, -7.9], [2.0, -6.9], [-2.1, -6.9]], darken(under, 0.12), { hi: 0.35 });
    if (mage) {
      blob(c, [[-1.7, -8.1], [1.6, -8.2], [2.2, -6.9], [-1.9, -6.8]], p.hair || "#6c7280", { hi: 0.5, then: (cc) => dab(cc, -3, -7.3, 6, 0.45, BRASS) });
      // the aegis brooch pinning the robe: the ward's pip in brass
      part(c, (cc) => { dab(cc, 0.5, -7.3, 2.3, 1.6, BRASS); poly(cc, [[0.9, -7.0], [2.4, -7.0], [2.4, -6.2], [1.65, -5.4], [0.9, -6.2]], p.col || "#9ab6d8"); dab(cc, 0.9, -7.0, 0.7, 0.6, mix(p.col || "#9ab6d8", "#f4f8ff", 0.7)); });
    }
  });
  if (look === "bow") quiver();

  // the head
  // the head follows the blow (and bows to the stock to aim, and looks down to reload)
  const hd = T(0.85, -9.35); hd[0] += st.fight ? 0.4 * st.drive : 0;
  const ha = st.lean * 0.3 + (look === "bow" && st.fight ? [0.06, 0.14, 0.02, 0.3][st.f] : 0);
  const head = () => {
    if (look === "levy") kettle(ctx, hd[0], hd[1], ha, p, { brim: 4.4, strap: true, stubble: "#3a2a20" });
    else if (look === "bow") kettle(ctx, hd[0], hd[1], ha, p, { brim: 3.4, hood: red });
    else if (look === "sergeant") barbute(ctx, hd[0], hd[1], ha, p);
    else if (look === "chaplain") mitre(ctx, hd[0], hd[1], ha, p);
    else if (mage) magHood(ctx, hd[0], hd[1], ha, p);
    else if (knight) sallet(ctx, hd[0], hd[1], ha, p, st.fight ? st.f + 1 : st.f);
    else marshalHelm(ctx, hd[0], hd[1], ha, p, st.fight ? st.f + 1 : st.f);
  };
  // An overhead wind-up (the sergeant's sword, the chaplain's mace cocked back
  // over the shoulder, the marshal's banner reared back): a raised near arm in
  // plate or mail is as wide as the helm and would hide the face, so the arm
  // goes up BEHIND the head — the head is drawn after it, cleanly in front —
  // and the blade rises clear above.
  const heave = st.fight && st.f === 1 && (look === "sergeant" || look === "chaplain" || look === "marshal");
  // the levy's great round shield rides on the far arm, held up to the chin:
  // it goes on before the head, so its rim tucks under the jaw instead of over the face
  if (look === "levy") roundShield(ctx, H.hf[0] + 1.7, H.hf[1] - 0.8, 3.9, 4.8, p.shcol || red);
  if (!heave) head();

  // the shield, before the body
  if (look === "levy") { /* drawn above, under the head */ }
  else if (look === "sergeant") heater(ctx, H.hf[0] + 0.9, H.hf[1] + 0.1, p.shcol || red, 1.0);
  else if (look === "marshal") heater(ctx, H.hf[0] + 1.0, H.hf[1] + 0.2, p.shcol || red, 1.05);
  else if (knight) heater(ctx, H.hf[0] + 0.8, H.hf[1] + 0.1, p.shcol || red, 0.8);
  if (look === "chaplain") { reliquary(ctx, hfC[0], hfC[1], H.sway, p, H.bright); fist(ctx, hfC[0], hfC[1], 0.95, fistF); }
  // the magister's far hand, open and casting, a little of the aegis on the
  // palm (held out below the beard: the far arm is behind the body, so its
  // hand must never land on the face)
  if (mage && H.palm) { glow(ctx, hfC[0] + 0.6, hfC[1] - 0.4, 2.6, p.col || "#9ab6d8", 0.6); fist(ctx, hfC[0], hfC[1], 0.95, fistF); }

  // the weapon hand
  if (twoHand) {
    const KB = 1.15, bowCol = p.wcol || "#c4c8d0";
    if (H.held === "far") {
      // reloading: the arbalest hangs nose-down in the far hand (at `grip` up
      // the tiller) while the near hand goes back to the bolt box
      const hf = ik(shF[0], shF[1], H.hf[0], H.hf[1], A.up, A.fore, -1)[1];
      const dx = Math.cos(H.an), dy = Math.sin(H.an), u = H.grip * KB, v = 0.5 * KB;
      arbalest(ctx, hf[0] - dx * u + dy * v, hf[1] - dy * u - dx * v, H.an, bowCol, { s: KB, empty: true });
      const h2 = arm(ctx, shF, hf, A, armF);
      grip(ctx, h2, H.an);
      fist(ctx, h2[0], h2[1], 0.95, fistF);
      const h = arm(ctx, shN, H.hn, A, armN);
      fist(ctx, h[0], h[1], 1.0, fistN);
    } else {
      const hn = ik(shN[0], shN[1], H.hn[0], H.hn[1], A.up, A.fore, -1)[1];
      const to = arbalest(ctx, hn[0], hn[1], H.an, bowCol, { loosed: H.loosed, s: KB });
      const h2 = arm(ctx, shF, to(H.grip, 0.5), A, armF);
      grip(ctx, h2, H.an);
      fist(ctx, h2[0], h2[1], 0.95, fistF);
      const h = arm(ctx, shN, hn, A, armN);
      grip(ctx, h, H.an);
      fist(ctx, h[0], h[1], 1.0, fistN);
    }
  } else {
    const h = arm(ctx, shN, H.hn, A, armN);
    grip(ctx, h, H.an);
    if (look === "levy") spear(ctx, h[0], h[1], H.an, p.wcol || "#c4c8d0", st.fight ? 9.0 : 4.2, st.fight ? 6.0 : 11.2);
    else if (look === "sergeant") longsword(ctx, h[0], h[1], H.an, p.wcol || "#dde2ea");
    else if (look === "chaplain") mace(ctx, h[0], h[1], H.an, p.wcol || "#6c7280");
    else if (mage) aegisStaff(ctx, h[0], h[1], H.an, p, H);
    else if (knight) longsword(ctx, h[0], h[1], H.an, p.wcol || "#dde2ea", 7.8);
    else if (look === "marshal") warBanner(ctx, h[0], h[1], H.an, p, st.fight ? st.f + 1 : st.f, { ...bannerO, only: H.lowered ? null : "pole" });
    fist(ctx, h[0], h[1], plated ? 1.15 : 1.0, fistN);
    // (in the heave the helm covers the arm, and the pauldron rides on the
    // shoulder in front of the helm's nape, so the raised arm still reads)
    if (heave) head();
    if (plated) pauldron(ctx, shN[0] - 0.2, shN[1] + 0.1, 1.9 * burly, steel, look === "marshal" ? BRASS : IRONK);
    if (mage) pauldron(ctx, shN[0] - 0.2, shN[1] + 0.1, 1.8, p.hair || "#6c7280", BRASS);
  }
  ctx.restore();
};

// ---- the roster -------------------------------------------------------------------
const SKIN = "#e0b08a", OX = "#7a2a2c", BLUED = "#6c7280";
export const IRON_RIGS = {
  levy: { kind: "ironFoot", box: { hw: 17, up: 30, down: 4 }, fightN: 4, p: { look: "levy", h: 22, skin: SKIN, cloth: OX, cloth2: "#8e8266", hair: BLUED, wcol: "#c4c8d0", shcol: OX } },
  crossbow: { kind: "ironFoot", box: { hw: 17, up: 30, down: 4 }, fightN: 4, p: { look: "bow", h: 22, skin: SKIN, cloth: OX, cloth2: "#a8966e", hair: BLUED, wcol: "#c4c8d0" } },
  sergeant: { kind: "ironFoot", box: { hw: 18, up: 32, down: 4 }, fightN: 4, p: { look: "sergeant", h: 25, skin: SKIN, cloth: OX, cloth2: BLUED, hair: "#646a78", wcol: "#dde2ea", shcol: OX } },
  chaplain: { kind: "ironFoot", box: { hw: 18, up: 32, down: 4 }, fightN: 4, p: { look: "chaplain", h: 23, skin: SKIN, cloth: OX, cloth2: "#e0d8c4", hair: "#c8c0b0", wcol: "#6c7280" } },
  magister: { kind: "ironFoot", box: { hw: 20, up: 37, down: 4 }, fightN: 4, p: { look: "magister", h: 23, skin: SKIN, cloth: OX, cloth2: "#4a4c58", hair: BLUED, col: "#9ab6d8", wcol: "#34363f" } },
  unseated: { kind: "ironFoot", box: { hw: 19, up: 32, down: 4 }, fightN: 4, p: { look: "unseated", h: 23.5, skin: SKIN, cloth: OX, cloth2: BLUED, hair: BLUED, cape: "#6a2226", mane: "#b08850", wcol: "#dde2ea", shcol: OX } },
  marshal: { kind: "ironFoot", box: { hw: 25, up: 46, down: 4 }, fightN: 4, p: { look: "marshal", h: 30, skin: SKIN, cloth: OX, cloth2: "#646a78", hair: "#5a606e", cape: "#6a2226", plume: "#e8e0cc", wcol: "#c4c8d0", shcol: OX } },
};
export const IRON_PAINTERS = { ironFoot: soldier };
