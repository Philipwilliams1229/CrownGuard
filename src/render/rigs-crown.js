// ============ RIGS: THE CROWN'S OWN ============
// Bespoke bodies for the player's soldiers. Entries in CROWN_RIGS override
// the generic ones in rigs.js (same shape: { kind, box: { hw, up, down }, p });
// CROWN_PAINTERS maps each new `kind` to its painter (ctx, p) — pose is
// p.pose ("walk" | "fight") and p.frame (0-3 walk, 0-3 fight: see
// CROWN_FIGHT_FRAMES at the foot), feet at 0,0, facing +x. Frames are baked
// once and inked by rigs.js. Joints keep to "Joints and motion" in
// art/STYLE-GUIDE.md; the joint lab's "crown" set (joint-sets/crown.js) shows
// every frame measured.
//
// One upright human skeleton carries them all — slim, grounded, about four
// heads tall, standing straight where the goblins crouch. A hip rides the
// gait, the torso frame leans off it, two-bone legs find the ground and
// two-bone arms find the weapon. p.look picks the kit worn over it: the
// garrison knight's blue tabard, the paladin's white-and-gold plate, the
// berserker's bare chest and war paint, the militia's smock and straw hat,
// Sir Aldric's silver and red, Wren's hood and longbow. Colours come only
// from p.skin / cloth / cloth2 / hair / cape / wcol / shcol.

import { lighten, darken, mix, ball, lin, part, shadow } from "./paint.js";
import { logJoint } from "./folk-kit.js";

// ---- the kit (the same small skeleton as the horde's) ------------------------
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
// walking along a haft: u down its length, v across it
const along = (x, y, a) => { const dx = Math.cos(a), dy = Math.sin(a); return (u, v = 0) => [x + dx * u - dy * v, y + dy * u + dx * v]; };
const haft = (c, to, u0, u1, w, col) => { const [x0, y0] = to(u0), [x1, y1] = to(u1); tube(c, x0, y0, x1, y1, w, col); };

// The gait: contact, passing, contact, passing — the lifted foot trails and
// the hip rides high as it passes; the arm opposite the forward leg swings
// forward (st.swing is -1 while the near foot leads).
//
// The fight has four frames (CROWN_FIGHT_FRAMES; enemies.js picks them off
// the attack clock): 0 guard, 1 wind-up (the weight rocks onto the back foot,
// the trunk leans away), 2 strike (a step in, the weight over the front foot,
// leaning in), 3 follow-through (the step held, the trunk coming back up).
// The feet stay planted but for the front foot's step in. An archer keeps
// her feet: 0 full draw, 1 loose (a recoil), 2 reach to the quiver, 3 nock.
// x: the hip over the feet (a strike's is times o.lunge); bob: the hip's
// drop, times o.bob; head: the head's lead; fl: the cape's stream (it trails
// the body by a frame); sk: the skirts' swing.
const MELEE = [
  { near: 0.9, far: -1.0, x: -0.2, bob: 0.3, lean: 0.02, head: 0, fl: 0.4, sk: 0 },
  { near: 0.9, far: -1.0, x: -1.0, bob: 0.45, lean: -0.13, head: 0, fl: 0.1, sk: -0.4 },
  { near: -1, far: -1.0, x: 1.0, bob: 1.1, lean: 0.2, head: 0.45, fl: 1.2, sk: 0.9 },
  { near: -1, far: -1.0, x: 0.62, bob: 0.9, lean: 0.1, head: 0.25, fl: 1.9, sk: 0.5 },
];
const SHOOT = [
  { x: -0.3, bob: 0.3, lean: -0.03, head: 0, fl: 0.3, sk: 0 },
  { x: -0.7, bob: 0.3, lean: -0.09, head: -0.25, fl: 0.2, sk: -0.3 },
  { x: -0.2, bob: 0.4, lean: 0.05, head: 0.1, fl: 0.7, sk: 0.2 },
  { x: -0.1, bob: 0.4, lean: 0.03, head: 0.1, fl: 0.5, sk: 0.1 },
];
const step = (p, o) => {
  const f = (p.frame || 0) % 4, s = o.stride;
  if (p.pose !== "fight") {
    const c = [1, 0, -1, 0][f];
    return {
      fight: false, f, c,
      near: f === 3 ? [-0.3 * s, -o.lift] : [c * s + (f === 1 ? 0.2 * s : 0), 0],
      far: f === 1 ? [-0.3 * s, -o.lift] : [-c * s + (f === 3 ? 0.2 * s : 0), 0],
      x: 0, bob: f % 2 ? -o.bob : 0, lean: o.lean + (f % 2 ? 0 : o.dip), swing: -c,
      head: 0, fl: [0.6, 1.2, 0.5, 1.0][f], sk: c * 0.6,
    };
  }
  if (p.weapon === "bow") {
    const b = SHOOT[f];
    // shooting skyward (the "sky" sheet) she leans back from the hips
    return { fight: true, f, c: 0, sky: !!p.sky, near: [s * 0.9, 0], far: [-s * 1.0, 0], x: b.x - (p.sky ? 0.3 : 0), bob: o.bob * b.bob, lean: o.lean + b.lean - (p.sky ? 0.1 : 0), swing: 0, head: b.head - (p.sky ? 0.2 : 0), fl: b.fl, sk: b.sk };
  }
  const b = MELEE[f];
  // a pole cocked back rocks the head back with it (the overhead cuts keep
  // the head still, so the raised arm clears the helm)
  const head = f === 1 && (p.weapon === "halberd" || p.weapon === "fork") ? -0.3 : b.head;
  return {
    fight: true, f, c: 0, hit: f === 2,
    near: [b.near < 0 ? s * 1.1 + o.lunge * 0.8 : s * b.near, 0], far: [s * b.far, 0],
    x: b.x * (f >= 2 ? o.lunge : 1), bob: o.bob * b.bob, lean: o.lean + b.lean, swing: 0, head, fl: b.fl, sk: b.sk,
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
  if (o.plate) line(c, x - len * 0.05, y - h * 0.9, x + len * 0.3, y - h * 0.45, 0.4, lighten(col, 0.5));
});
const leg = (ctx, R, o, which, cols) => {
  const { st, T, ank } = R;
  const [fx, fy] = st[which];
  const hp = T(which === "near" ? o.hipW : -o.hipW, 0);
  const [kn, an] = ik(hp[0], hp[1], fx, fy - ank, o.L1, o.L2, 1);
  logJoint(ctx, "leg", hp, kn, [fx, fy - ank], { lens: [o.L1, o.L2] });
  // thigh, shin, greave and knee cop are ONE inked part: the cop is a colour
  // step on the leg, never a ring of ink across the knee
  part(ctx, (c) => {
    tube(c, hp[0], hp[1], kn[0], kn[1], o.thigh, cols.thigh);
    tube(c, kn[0], kn[1], an[0], an[1], o.shin, cols.shin);
    if (cols.wrap) { const t = cols.wrapAt ?? 0.55; tube(c, kn[0] + (an[0] - kn[0]) * t, kn[1] + (an[1] - kn[1]) * t, an[0], an[1], o.shin * 1.1, cols.wrap); }
    if (cols.knee) { ball(c, kn[0] + 0.3, kn[1], 1.2, 1.1, cols.knee, { hi: 0.55, lo: 0.4 }); dab(c, kn[0] - 0.1, kn[1] - 0.6, 0.5, 0.5, lighten(cols.knee, 0.7)); }
  });
  foot(ctx, an[0], an[1] + ank, o.foot, ank + 0.55, cols.foot, { plate: cols.plate, sole: cols.sole });
  return { hp, kn, an };
};
// a two-bone arm from the shoulder to where the hand must be; the elbow folds
// the way a real one does (o.bend 1 is the side-view reversal for an arm
// raised OUT to the side: a bow drawn, a hand over the shoulder to the
// quiver). Returns the hand, carrying its elbow as .el.
const arm = (ctx, sh, to, o, cols) => {
  const [el, hd] = ik(sh[0], sh[1], to[0], to[1], o.up, o.fore, o.bend ?? -1);
  // the lab measures the hand's TARGET: one out of reach reads as a stretched bone
  logJoint(ctx, "arm", sh, el, to, { lens: [o.up, o.fore], flip: (o.bend ?? -1) > 0 });
  part(ctx, (c) => {
    tube(c, sh[0], sh[1], el[0], el[1], o.w, cols.up);
    tube(c, el[0], el[1], hd[0], hd[1], o.w * 0.92, cols.fore || cols.up);
    if (cols.cuff) { const t = 0.4; tube(c, el[0] + (hd[0] - el[0]) * t, el[1] + (hd[1] - el[1]) * t, hd[0] - (hd[0] - el[0]) * 0.1, hd[1] - (hd[1] - el[1]) * 0.1, o.w * 1.08, cols.cuff); }
    if (cols.elbow) ball(c, el[0], el[1], o.w * 0.62, o.w * 0.58, cols.elbow, { hi: 0.55, lo: 0.4 });
  });
  return Object.assign([hd[0], hd[1]], { el });
};
// The joint lab can ask for the wrists: set CROWN_DEBUG.wrists = [] and every
// held weapon logs how far its haft turns off the forearm's line (a hilt in a
// fist crosses it at ~90°; never folded back past ~120°).
export const CROWN_DEBUG = { wrists: null };
const wrist = (h, an, what) => {
  if (!CROWN_DEBUG.wrists || !h.el) return;
  const fa = Math.atan2(h[1] - h.el[1], h[0] - h.el[0]);
  let d = ((an - fa) * 180) / Math.PI;
  while (d > 180) d -= 360; while (d < -180) d += 360;
  CROWN_DEBUG.wrists.push(`${what} ${Math.round(d)}`);
};
const fist = (ctx, x, y, r, col) => part(ctx, (c) => ball(c, x, y, r, r * 0.95, col, { hi: 0.45, lo: 0.4 }));

// ---- arms and armour -----------------------------------------------------------
const BRASS = "#d8b34a", OAK = "#7a5334", LEATHER = "#6a4a2e", INKY = "#1a1420";

// the arming sword: pommel, grip, a gilt cross, a long bright blade
const sword = (ctx, x, y, a, col, len = 8, guard = BRASS) => part(ctx, (c) => {
  const to = along(x, y, a);
  haft(c, to, -1.5, 0.5, 1.0, "#4a3020");
  ball(c, ...to(-1.8), 0.7, 0.7, guard, { hi: 0.5, lo: 0.4 });
  const pts = [[...to(0.9, -0.62), 1], [...to(len - 1.6, -0.6), 1], [...to(len, 0), 1], [...to(len - 1.6, 0.6), 1], [...to(0.9, 0.62), 1]];
  path(c, pts); c.fillStyle = col; c.fill();
  path(c, [[...to(0.9, -0.62), 1], [...to(len - 1.6, -0.6), 1], [...to(len, 0), 1], [...to(0.9, 0), 1]]);
  c.fillStyle = lighten(col, 0.55); c.fill();
  line(c, ...to(1.4, 0.15), ...to(len - 2.2, 0.15), 0.35, darken(col, 0.3));
  line(c, ...to(0.7, -1.9), ...to(0.7, 1.9), 0.85, guard);
});

// a flanged mace, gilt for the Order
const mace = (ctx, x, y, a, col, len = 6.4) => {
  const to = along(x, y, a);
  part(ctx, (c) => { haft(c, to, -1.6, len - 0.8, 0.95, "#5a3e28"); ball(c, ...to(-1.8), 0.65, 0.65, col, { hi: 0.5, lo: 0.4 }); tube(c, ...to(-0.4), ...to(0.4), 1.3, darken(col, 0.2)); });
  part(ctx, (c) => {
    for (const v of [-1, 1]) poly(c, [to(len - 1.7, v * 0.5), to(len - 0.9, v * 2.0), to(len + 0.8, v * 1.9), to(len + 1.3, v * 0.5)], darken(col, 0.18));
    ball(c, ...to(len, 0), 1.4, 1.4, col, { hi: 0.55, lo: 0.45 });
    poly(c, [to(len + 1.1, -0.45), to(len + 2.2, 0), to(len + 1.1, 0.45)], lighten(col, 0.2));
  });
};

// the Grand Champion's maul: a long haft and a great banded head
const hammer = (ctx, x, y, a, col, len = 9.5) => {
  const to = along(x, y, a);
  // (the butt ends a hand's breadth past the rear grip, clear of the pauldron)
  part(ctx, (c) => { haft(c, to, -4.2, len, 1.3, "#5a3e28"); for (const u of [-3.7, -0.6]) tube(c, ...to(u - 0.4), ...to(u + 0.4), 1.7, darken(col, 0.25)); });
  part(ctx, (c) => {
    const pts = [[...to(len - 1.7, -2.8), 1], [...to(len + 1.7, -2.8), 1], [...to(len + 1.9, 0), 1], [...to(len + 1.7, 2.8), 1], [...to(len - 1.7, 2.8), 1], [...to(len - 1.9, 0), 1]];
    path(c, pts); c.fillStyle = cel(c, ...bbox(pts), col, 0.45, 0.45); c.fill();
    c.save(); path(c, pts); c.clip();
    for (const v of [-1.5, 1.5]) line(c, ...to(len - 2, v), ...to(len + 2, v), 0.5, darken(col, 0.4));
    line(c, ...to(len - 1.2, -2.6), ...to(len + 1.2, -2.6), 0.6, lighten(col, 0.6));
    c.restore();
    ball(c, ...to(len, 0), 0.8, 0.8, lighten(col, 0.35), { hi: 0.6, lo: 0.3 });
  });
};

// a bearded hand-axe, the edge on the +v side
const axe = (ctx, x, y, a, col, len = 5.6) => {
  const to = along(x, y, a);
  part(ctx, (c) => haft(c, to, -1.8, len + 0.6, 1.0, OAK));
  part(ctx, (c) => {
    const L = len;
    const pts = [[...to(L - 1.6, 0.4), 1], [...to(L - 2.0, 1.4)], [...to(L - 3.0, 2.6), 1], [...to(L - 1.0, 3.3)], [...to(L + 1.0, 2.8), 1], [...to(L + 0.3, 1.4)], [...to(L + 0.2, 0.4), 1], [...to(L - 0.1, -0.9), 1], [...to(L - 1.3, -0.9), 1]];
    path(c, pts); c.fillStyle = cel(c, ...bbox(pts), col, 0.35, 0.4); c.fill();
    c.strokeStyle = lighten(col, 0.65); c.lineWidth = 0.55; c.lineCap = "round";
    c.beginPath(); c.moveTo(...to(L - 2.4, 2.6)); c.quadraticCurveTo(...to(L - 0.8, 3.3), ...to(L + 0.7, 2.6)); c.stroke();
  });
};

// the Gate Guard's halberd: a long ash pole, an axe blade on the +v side
// (toward the foe), a back hook, and a spike to thrust with
const halberd = (ctx, x, y, a, col, back = 7, fwd = 9.4) => {
  const to = along(x, y, a);
  part(ctx, (c) => haft(c, to, -back, fwd + 2.6, 0.95, OAK));
  part(ctx, (c) => {
    const F = fwd;
    const spike = [[...to(F + 1.8, -0.55), 1], [...to(F + 5.6, 0), 1], [...to(F + 1.8, 0.55), 1]];
    path(c, spike); c.fillStyle = cel(c, ...bbox(spike), col, 0.5, 0.35); c.fill();
    const blade = [[...to(F - 1.4, 0.4), 1], [...to(F - 2.6, 2.4)], [...to(F - 1.2, 3.4), 1], [...to(F + 1.4, 3.3)], [...to(F + 2.2, 2.2), 1], [...to(F + 1.4, 0.4), 1]];
    path(c, blade); c.fillStyle = cel(c, ...bbox(blade), col, 0.4, 0.4); c.fill();
    const hook = [[...to(F - 0.6, -0.4), 1], [...to(F + 0.4, -2.4), 1], [...to(F + 0.6, -0.4), 1]];
    path(c, hook); c.fillStyle = cel(c, ...bbox(hook), darken(col, 0.15), 0.4, 0.4); c.fill();
    c.strokeStyle = lighten(col, 0.65); c.lineWidth = 0.5; c.lineCap = "round";
    c.beginPath(); c.moveTo(...to(F - 1.8, 3.0)); c.quadraticCurveTo(...to(F, 3.6), ...to(F + 1.8, 2.4)); c.stroke();
    dab(c, ...to(F - 0.2, -0.3), 0.9, 0.9, BRASS);
  });
};

// the militia's hay fork
const fork = (ctx, x, y, a, col, back = 6, fwd = 8.4) => part(ctx, (c) => {
  const to = along(x, y, a);
  haft(c, to, -back, fwd + 0.4, 0.95, "#9a7648");
  line(c, ...to(fwd, -1.5), ...to(fwd, 1.5), 0.75, col);
  for (const v of [-1.3, 0, 1.3]) { c.strokeStyle = col; c.lineWidth = 0.6; c.lineCap = "round"; c.beginPath(); c.moveTo(...to(fwd, v)); c.quadraticCurveTo(...to(fwd + 2.4, v * 1.05), ...to(fwd + 3.8, v * 0.8)); c.stroke(); }
  line(c, ...to(fwd + 0.4, -0.9), ...to(fwd + 2.6, -1.3), 0.3, lighten(col, 0.5));
});

// the longbow: limbs along `a` from the grip, bowed toward +v (the mark); the
// string runs tip to tip, through `nock` when it is drawn
const bow = (ctx, x, y, a, wood, nock, lim = 6.8) => {
  const to = along(x, y, a);
  const t0 = to(-lim, -1.9), t1 = to(lim, -1.9);
  part(ctx, (c) => {
    c.strokeStyle = cel(c, ...to(-lim, 0), ...to(lim, 0), wood, 0.35, 0.4); c.lineWidth = 1.05; c.lineCap = "round";
    c.beginPath(); c.moveTo(...t0); c.quadraticCurveTo(...to(0, 2.2), ...t1); c.stroke();
    tube(c, ...to(-0.9, 0.35), ...to(0.9, 0.35), 1.3, "#4a3020");
  });
  ctx.strokeStyle = "#efe6cc"; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(...t0); if (nock) ctx.lineTo(...nock); ctx.lineTo(...t1); ctx.stroke();
};
const arrow = (ctx, x0, y0, x1, y1, fl = "#c8383a") => part(ctx, (c) => {
  line(c, x0, y0, x1, y1, 0.5, "#c8a878");
  const a = Math.atan2(y1 - y0, x1 - x0), to = along(x1, y1, a), tb = along(x0, y0, a);
  poly(c, [to(-0.2, -0.65), to(1.5, 0), to(-0.2, 0.65)], "#c4c8d0");
  poly(c, [tb(0.2, 0), tb(1.8, -0.75), tb(2.2, 0), tb(1.8, 0.75)], fl);
});

// the kite shield, faced to the viewer: a field, a rim, a charge on it
const kite = (ctx, x, y, col, rim, charge, chCol, s = 1) => part(ctx, (c) => {
  const pts = [[x - 2.3 * s, y - 3.7 * s, 1], [x - 0.1 * s, y - 4.1 * s], [x + 2.3 * s, y - 3.9 * s, 1], [x + 2.5 * s, y + 0.2 * s], [x + 0.2 * s, y + 4.7 * s, 1], [x - 2.4 * s, y + 0.2 * s]];
  path(c, pts); c.fillStyle = cel(c, x - 2.6 * s, y - 4.4 * s, x + 2.6 * s, y + 4.7 * s, col, 0.35, 0.45); c.fill();
  c.save(); path(c, pts); c.clip();
  c.fillStyle = chCol;
  if (charge === "cross") { dab(c, x - 0.45 * s, y - 4.2 * s, 1.0 * s, 9 * s, chCol); dab(c, x - 2.6 * s, y - 1.8 * s, 5.2 * s, 1.0 * s, chCol); }
  else if (charge === "chevron") poly(c, [[x - 2.6 * s, y + 0.6 * s], [x + 0.1 * s, y - 2.2 * s], [x + 2.7 * s, y + 0.4 * s], [x + 2.7 * s, y + 1.8 * s], [x + 0.1 * s, y - 0.8 * s], [x - 2.6 * s, y + 2.0 * s]], chCol);
  else if (charge === "pale") dab(c, x - 0.6 * s, y - 4.2 * s, 1.3 * s, 9 * s, chCol);
  c.strokeStyle = rim; c.lineWidth = 0.75; path(c, pts); c.stroke();
  c.strokeStyle = lighten(rim, 0.5); c.lineWidth = 0.4; c.beginPath(); c.moveTo(x - 2.0 * s, y - 3.4 * s); c.lineTo(x + 2.0 * s, y - 3.6 * s); c.stroke();
  c.restore();
});

// a shoulder guard: a rolled shell over the near shoulder
const pauldron = (ctx, x, y, r, col, trim) => part(ctx, (c) => {
  const pts = [[x - r, y + r * 0.55, 1], [x - r * 0.95, y - r * 0.35], [x - r * 0.1, y - r * 0.95], [x + r * 0.85, y - r * 0.5], [x + r * 1.05, y + r * 0.55, 1]];
  path(c, pts); c.fillStyle = cel(c, x - r, y - r, x + r, y + r, col, 0.5, 0.42); c.fill();
  line(c, x - r * 0.9, y + r * 0.12, x + r * 0.95, y + r * 0.2, 0.5, trim || darken(col, 0.4));
  dab(c, x - r * 0.35, y - r * 0.6, 0.55, 0.55, lighten(col, 0.7));
});

// ---- heads ----------------------------------------------------------------------
// (0,0) the middle of the skull, +x the face; a man's head is ~4.6 across
const face = (c0, skin, o = {}) => blob(c0, [[-2.0, 0.2], [-1.9, -1.6], [-0.6, -2.5], [1.2, -2.4], [2.1, -1.4], [2.3, -0.5], [2.8, 0.3, 1], [2.2, 0.8], [2.0, 1.6], [1.1, 2.4], [-0.4, 2.3], [-1.6, 1.4]], skin, {
  hi: 0.28, lo: 0.35, then: (c) => {
    dab(c, -0.9, -0.3, 0.8, 1.2, darken(skin, 0.22));                   // the ear
    if (o.paint) { dab(c, 0.2, -0.9, 2.6, 0.75, o.paint); dab(c, 0.6, 0.4, 0.5, 1.3, o.paint); }
    line(c, 0.6, -1.25, 1.8, -1.05, 0.5, darken(o.brow || skin, 0.55));  // brow
    dab(c, 1.0, -0.75, 0.62, 0.85, INKY); dab(c, 1.0, -0.75, 0.3, 0.3, "#fff3d2");
    if (!o.beard) dab(c, 1.5, 1.25, 0.8, 0.35, darken(skin, 0.45));
    if (o.shade) { c.fillStyle = darken(skin, 0.3); c.fillRect(-3, -3, 7, 1.5); }
  },
});

// the garrison's open bascinet: cheek guards, a nasal, a short plume
const bascinet = (ctx, x, y, a, p, o = {}) => inFrame(ctx, x, y, a, (c0) => {
  const steel = p.hair || "#b8bcc4";
  if (o.plume) blob(c0, [[-0.2, -2.8], [-1.0, -4.4], [-3.0, -4.9], [-5.4, -3.8, 1], [-3.6, -3.7], [-2.6, -2.9], [-1.4, -2.4]], o.plume, { hi: 0.35, lo: 0.4, then: (c) => line(c, -1.4, -3.8, -4.4, -4.0, 0.4, darken(o.plume, 0.35)) });
  face(c0, p.skin);
  blob(c0, [[-2.5, 2.2, 1], [-2.7, -0.4], [-2.3, -2.4], [-0.6, -3.3], [1.4, -3.1], [2.5, -1.9], [2.9, -1.0, 1], [0.7, -1.0, 1], [0.4, 0.5], [0.7, 2.2, 1]], steel, {
    hi: 0.5, lo: 0.4, then: (c) => {
      dab(c, -3, -1.55, 6.2, 0.55, o.band || darken(steel, 0.35));
      line(c, -1.0, -3.2, -2.3, -0.4, 0.45, lighten(steel, 0.6));
      for (const [rx, ry] of [[-1.8, 0.2], [-0.2, 0.6], [-0.2, 1.7]]) dab(c, rx, ry, 0.5, 0.5, lighten(steel, 0.65));
      if (o.band) dab(c, 1.2, -1.55, 0.6, 0.55, lighten(o.band, 0.4));
    },
  });
  c0.fillStyle = steel; c0.fillRect(2.05, -1.1, 0.6, 1.8);              // the nasal
  c0.fillStyle = lighten(steel, 0.5); c0.fillRect(2.05, -1.1, 0.3, 1.2);
});

// the Order's great helm: closed, a cross cut for the visor, gilt down the brow
const greatHelm = (ctx, x, y, a, p, o = {}) => inFrame(ctx, x, y, a, (c0) => {
  const steel = o.steel || p.hair || "#e8e2d0", gold = p.cloth2 || BRASS;
  blob(c0, [[-2.5, 2.4, 1], [-2.8, -0.6], [-2.4, -2.7], [-0.4, -3.4], [1.8, -3.1], [2.8, -1.7], [3.0, 1.0], [2.5, 2.6, 1], [0.6, 2.9, 1]], steel, {
    hi: 0.45, lo: 0.42, then: (c) => {
      dab(c, 0.4, -0.95, 2.8, 0.75, INKY);                                  // eye slit
      dab(c, 1.95, -0.3, 0.6, 1.9, INKY);                                   // and the drop of the cross
      dab(c, 1.95, -3.4, 0.6, 2.5, gold);                                   // gilt ridge down the brow
      dab(c, -3, -1.7, 6.2, 0.55, gold);
      dab(c, -3, 2.0, 6.2, 0.55, darken(gold, 0.15));
      line(c, -1.2, -3.2, -2.4, 0.4, 0.45, lighten(steel, 0.6));
      for (const [rx, ry] of [[0.6, 0.6], [0.6, 1.3], [2.7, 0.6]]) dab(c, rx, ry, 0.4, 0.4, darken(steel, 0.55));
    },
  });
  if (o.crown) blob(c0, [[-2.2, -2.5, 1], [-2.5, -5.0, 1], [-1.2, -3.8, 1], [0.1, -5.9, 1], [1.2, -3.9, 1], [2.4, -5.0, 1], [2.3, -2.4, 1], [0, -3.0, 1]], o.crown, {
    hi: 0.5, lo: 0.4, then: (c) => { dab(c, -0.3, -3.6, 0.8, 0.8, "#c8383a"); dab(c, -2.0, -3.3, 0.6, 0.6, "#3a80c0"); dab(c, 1.7, -3.3, 0.6, 0.6, "#3a80c0"); },
  });
});

// Sir Aldric's helm: open-faced, silver, a gilt browband and a red crest
const heroHelm = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const steel = p.hair || "#dde2ea", gold = p.cloth2 || "#e8c14a", crest = p.cape || "#a0303a";
  blob(c0, [[1.6, -2.7], [0.8, -4.6], [-1.6, -5.4], [-4.2, -4.6], [-6.4, -2.4, 1], [-4.6, -2.9], [-3.4, -1.8, 1], [-2.6, -2.6], [-0.4, -2.9]], crest, {
    hi: 0.35, lo: 0.42, then: (c) => { line(c, 0.4, -4.4, -3.6, -3.8, 0.45, lighten(crest, 0.35)); line(c, -1.0, -3.3, -4.6, -2.8, 0.4, darken(crest, 0.4)); },
  });
  face(c0, p.skin);
  blob(c0, [[-2.5, 2.0, 1], [-2.7, -0.4], [-2.3, -2.4], [-0.6, -3.2], [1.4, -3.0], [2.5, -1.9], [2.9, -1.0, 1], [0.8, -1.0, 1], [0.5, 0.6], [0.9, 2.1, 1]], steel, {
    hi: 0.55, lo: 0.4, then: (c) => {
      dab(c, -3, -1.6, 6.2, 0.7, gold); dab(c, 1.4, -1.6, 0.7, 0.7, lighten(gold, 0.5));
      line(c, -1.0, -3.1, -2.3, -0.4, 0.45, lighten(steel, 0.7));
      line(c, -2.6, 0.4, 0.2, 0.9, 0.45, darken(steel, 0.35));
      dab(c, -1.4, 1.0, 0.5, 0.5, lighten(steel, 0.7));
    },
  });
  c0.fillStyle = gold; c0.fillRect(2.1, -1.0, 0.6, 1.5);                // a gilt nasal
});

// the berserker: a wild red mane swept back, a forked beard, woad across the eyes
const berserkHead = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const hair = p.hair || "#a04a3f";
  blob(c0, [[-2.2, 2.2, 1], [-2.9, 0.6], [-4.4, 0.2, 1], [-2.9, -0.8], [-4.2, -2.4, 1], [-2.2, -2.4], [-2.4, -4.0, 1], [-0.6, -3.0], [0.6, -4.0, 1], [1.2, -2.8], [2.4, -2.4, 1], [1.4, -1.6], [-0.6, -1.4], [-1.2, 1.2]], hair, { hi: 0.35, lo: 0.42 });
  face(c0, p.skin, { paint: "#4a74b8", beard: true });
  // the fringe over the brow, then the beard, forked and braided
  blob(c0, [[-1.6, -1.8], [-1.2, -3.0], [0.8, -3.0], [2.2, -2.2, 1], [0.8, -1.8], [0.2, -1.2, 1], [-0.4, -1.8]], hair, { hi: 0.35 });
  blob(c0, [[0.0, 0.6], [2.5, 0.8], [2.7, 1.8], [2.2, 3.6, 1], [1.5, 2.8], [0.8, 3.8, 1], [0.2, 2.4], [-0.4, 1.4]], hair, {
    hi: 0.3, then: (c) => { line(c, 1.0, 1.0, 1.3, 2.8, 0.4, darken(hair, 0.4)); dab(c, 1.4, 1.0, 1.1, 0.4, darken(hair, 0.5)); },
  });
});

// the militia man: a broad straw hat, stubble, a wisp of hair at the neck
const farmerHead = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const straw = p.hair || "#d8b860";
  blob(c0, [[-2.4, 0.4], [-2.2, -1.6], [-1.2, -1.8], [-1.0, 1.6], [-2.0, 1.8]], "#6a4a2e", { hi: 0.3 });
  face(c0, p.skin);
  // the hat: a crown, a band, a brim that tips down at the front
  blob(c0, [[-4.0, -0.9, 1], [-2.4, -1.9], [0, -2.1], [2.4, -1.8], [4.2, -0.6, 1], [2.2, -1.0], [0, -1.2], [-2.2, -0.9]], straw, {
    hi: 0.35, lo: 0.42, then: (c) => { for (const u of [-2.6, -1.0, 0.8, 2.4]) line(c, u, -2.0, u + 0.4, -0.9, 0.35, darken(straw, 0.3)); },
  });
  blob(c0, [[-2.0, -1.6], [-1.8, -3.2], [-0.2, -3.8], [1.4, -3.4], [1.9, -1.8]], straw, {
    hi: 0.4, lo: 0.35, then: (c) => { dab(c, -2.4, -2.4, 4.6, 0.7, darken(straw, 0.5)); line(c, -0.8, -3.6, -1.2, -2.6, 0.35, lighten(straw, 0.4)); },
  });
});

// Wren: a deep green hood, peaked, the face in its shade
const hunterHead = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const hood = p.hair || "#3f6a34";
  face(c0, p.skin, { shade: true });
  blob(c0, [[-2.2, 3.2, 1], [-2.9, 0.6], [-2.9, -1.8], [-4.8, -3.6, 1], [-1.6, -3.4], [0.6, -3.4], [2.2, -2.5], [2.9, -1.3, 1], [1.4, -1.6], [0.4, -0.6], [0.3, 1.4], [1.2, 3.2, 1]], hood, {
    hi: 0.35, lo: 0.45, then: (c) => { line(c, -2.0, -2.6, -0.6, 1.0, 0.45, darken(hood, 0.4)); line(c, 0.6, -3.0, 2.2, -1.9, 0.4, lighten(hood, 0.35)); },
  });
  // a lock of chestnut hair escaping the hood
  blob(c0, [[1.0, -1.7], [2.0, -1.4], [1.3, -0.4, 1], [0.8, -0.8]], "#8a4a2a", { hi: 0.3 });
});

// ---- the soldier ------------------------------------------------------------------
const MAN = { L1: 4.8, L2: 4.6, stride: 2.3, lift: 1.8, bob: 0.6, lean: 0.03, dip: 0.03, lunge: 2.0, hipW: 0.7, thigh: 2.3, shin: 2.0, foot: 3.1, ankle: 0.8 };

// The bow's grips, frame by frame: 0 on the march, then the fight's four.
// F holds the bow, N the string; `flip` the draw arm's side-view reversal
// (raised out to the side). An archer at the string stands side-on.
const bowGrip = (sw, N, F) => [
  { hn: N(0.6 + sw * 1.1, 4.8), hf: F(4.2 - sw * 0.3, 4.2), ab: 1.64 },
  // full draw: the bow arm straight at the mark, the string hand at the jaw, elbow high
  { hn: N(2.8, -1.5), hf: F(5.9, -0.4), ab: -Math.PI / 2 + 0.06, flip: true, string: true, nock: true },
  // loose: the string hand flung back past the ear, the elbow back (still
  // out to the side), the bow arm pushing through; the fist ends fully clear
  // of the hood's back outline
  { hn: N(-3.9, -2.3), hf: F(6.2, -0.3), ab: -Math.PI / 2 + 0.2, flip: true, loose: true },
  // the reach: over the shoulder to the quiver, the elbow back at shoulder
  // height, the hand up behind the hood (never across the face), the bow lowered
  { hn: N(-2.3, -3.6), hf: F(5.0, 1.4), ab: -Math.PI / 2 + 0.32, flip: true, draw: true },
  // nock and begin the draw: the arrow set on the string before the chest,
  // the string hand out in front of the cowl's lower point, never under it
  { hn: N(3.4, 0.9), hf: F(5.8, 0.6), ab: -Math.PI / 2 + 0.14, string: true, nock: true, early: true }];
// how far the "sky" sheet raises a bowman's aim (radians): high enough that
// the flight clearly goes UP, to come down on its mark far off
export const SKY_AIM = 0.85;

// Where the hands go, per weapon: the march (the gait's swing), then the four
// fight frames. Points are offsets from the near shoulder (N) or the far one
// (F) in board axes, +x toward the foe, +y down; `an` is the weapon's angle
// (0 points at the foe, -PI/2 straight up). A two-handed haft is set by its
// two hands — the lead hand `hn` (nearer the head) and the rear hand `h2` —
// so both fists are always on it. Every hand lies within the arm's reach.
// A hilt crosses the fist at about a right angle to the forearm, tips toward
// the forearm's line through a cut, and never folds back toward the elbow.
const grip = (w, st, shN, shF) => {
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy], F = (dx, dy) => [shF[0] + dx, shF[1] + dy];
  const ph = st.fight ? 1 + st.f : 0;
  // the shield trails the body's bob by a frame
  const lag = st.fight ? 0 : [-0.25, 0.25, -0.25, 0.25][st.f];
  if (w === "hammer") return [
    // carried at the port, head up and well out before the visor, both hands
    // swinging a little with the gait
    { hn: N(2.6 + sw * 0.3, 2.2), h2: N(1.2 + sw * 0.3, 4.8) },
    // guard: the maul held slanting up before him
    { hn: N(3.0, 2.4), h2: N(1.4, 4.5) },
    // wind-up: heaved up over the near shoulder, the head hanging behind him;
    // both arms and the haft go up behind the head (the visor and crown stay
    // whole), the lead fist showing clear behind the helm, the head held
    // back and a little up
    { hn: N(-4.0, -4.6), h2: N(-1.68, -3.98), behind: true },
    // strike: brought down through the foe
    { hn: N(4.6, 3.6), h2: N(2.3, 2.3) },
    // follow-through: the head driven down into the dirt, the body sunk over it
    { hn: N(3.9, 5.2), h2: N(1.9, 3.6) }][ph];
  // the halberd stands upright in the near hand on the march, held out far
  // enough that the pole clears the face (the far arm swings free); in the
  // fight it is levelled, drawn back, driven straight out at the foe, then
  // its blade chops down
  if (w === "halberd") return [
    { hn: N(3.4 + sw * 0.3, 3.4), an: -1.34 + sw * 0.04, free: F(0.5 - sw * 1.3, 5.7) },
    { hn: N(3.2, 3.0), h2: N(0.3, 4.7), fwd: 9.4 },
    { hn: N(1.1, 3.0), h2: N(-1.5, 3.9), fwd: 9.4 },
    { hn: N(5.4, 2.0), h2: N(2.6, 2.6), fwd: 10.2 },
    { hn: N(4.7, 3.5), h2: N(2.1, 2.2), fwd: 10.0 }][ph];
  // the militia's fork: carried upright, levelled, jabbed, then heaved up as
  // if pitching hay
  if (w === "fork") return [
    { hn: N(2.8 + sw * 0.3, 3.4), an: -1.1 + sw * 0.05, free: F(0.5 - sw * 1.3, 5.7) },
    { hn: N(3.2, 3.2), h2: N(0.4, 4.8), fwd: 8.2 },
    { hn: N(1.1, 3.4), h2: N(-1.4, 4.4), fwd: 8.2 },
    { hn: N(5.2, 2.3), h2: N(2.4, 2.9), fwd: 8.6 },
    { hn: N(4.3, 0.9), h2: N(2.2, 3.3), fwd: 8.4 }][ph];
  // two axes: the far one lags the near by a frame, so a blow is a double chop
  if (w === "axes") return [
    { hn: N(1.8 + sw * 0.8, 4.4), an: -1.15 + sw * 0.1, hf: F(0.6 - sw * 1.3, 4.6), af: 0.95 },
    { hn: N(3.0, 2.8), an: -1.2, hf: F(3.8, 2.4), af: -1.0 },
    { hn: N(-3.6, -5.1), an: 2.75, hf: F(0.8, -4.9), af: -2.5, behind: true },
    { hn: N(5.0, 2.2), an: 0.55, hf: F(1.4, -4.6), af: -2.3 },
    { hn: N(3.2, 5.2), an: 1.45, hf: F(5.3, 2.6), af: 0.55 }][ph];
  // the bow (bowGrip)
  if (w === "bow") {
    const H = bowGrip(sw, N, F)[ph];
    // the "sky" sheet: the same draw swung up about each shoulder by SKY_AIM
    // (both hands keep their reach), the bow tipped back with them
    if (!st.sky || !st.fight) return H;
    const up = (p, sh) => { const dx = p[0] - sh[0], dy = p[1] - sh[1], c = Math.cos(-SKY_AIM), s2 = Math.sin(-SKY_AIM); return [sh[0] + dx * c - dy * s2, sh[1] + dx * s2 + dy * c]; };
    return { ...H, hn: up(H.hn, shN), hf: up(H.hf, shF), ab: H.ab - SKY_AIM };
  }
  // sword or mace, with a shield on the far arm. On the march the blade lies
  // back along the shoulder, nearly level (the fist up under the chin, the
  // forearm steep before the chest, the hilt across the fist): it crosses the
  // pauldron's lower half and passes UNDER the helm's back rim, so arm,
  // pauldron and steel are all drawn over the head's lower edge and the blade
  // shows whole; the fight is an overhead cut: guard, cocked high behind
  // the head (the arm up behind the head, the fist clear of the helm's back,
  // the blade hanging back-down behind), down through the foe, on past the line.
  return [
    // (the fist ~2.4 out from the shoulder: the elbow folds 135-139°, the
    // hilt ~120° off the forearm, the blade 0.8-1.0 under the helm's back
    // rim and across the pauldron's lower half)
    { hn: N(2.4 + sw * 0.1, 0.2), an: -3.28 + sw * 0.03, hf: F(4.4, 3.6 + lag), shoulder: true },
    { hn: N(3.0, 2.3), an: -1.0, hf: F(4.6, 3.1) },
    { hn: N(-4.0, -4.6), an: 2.75, hf: F(4.8, 2.5), behind: true },
    { hn: N(5.3, 1.3), an: 0.4, hf: F(3.4, 3.8) },
    { hn: N(3.6, 4.7), an: 1.35, hf: F(3.8, 3.4) }][ph];
};

const soldier = (ctx, p) => {
  const k = (p.h ?? 22) / 22; ctx.save(); ctx.scale(k, k);
  const look = p.look, o = MAN, R = skeleton(p, o), { st, T } = R;
  const plated = look === "knight" || look === "guard" || look === "paladin" || look === "hero" || look === "champion";
  // the Gate Guard is kitted as the garrison's knights are, in the castle's colours
  const kn = look === "knight" || look === "guard";
  const skin = p.skin, skinF = darken(skin, 0.24);
  const steel = p.cloth, trim = p.cloth2;
  shadow(ctx, 0.4, -0.1, 4.8, 1.3, 0.22);
  const burly = look === "berserk" ? 1.14 : 1;
  const w = p.weapon, bowFight = w === "bow" && st.fight;
  // an archer at the string turns side-on: the bow shoulder comes round to the front
  const shN = bowFight ? T(-0.3, -6.6) : T(1.0 * burly, -6.6), shF = bowFight ? T(1.3, -6.9) : T(-1.1 * burly, -6.8);
  const A = { up: 3.4, fore: 3.2, w: plated ? 2.0 : burly > 1 ? 2.15 : 1.8 };
  const H = grip(w, st, shN, shF);
  // a two-handed haft runs from the rear hand through the lead hand to the head
  const twoHand = !!H.h2;
  if (twoHand) H.an = Math.atan2(H.hn[1] - H.h2[1], H.hn[0] - H.h2[0]);

  // colours for the limbs
  let armN, armF, legN, legF, fistN, fistF;
  if (plated) {
    const mail = mix(darken(steel, 0.25), "#8a909c", 0.4);
    armN = { up: mail, fore: steel, cuff: lighten(steel, 0.12), elbow: lighten(steel, 0.08) };
    armF = { up: darken(mail, 0.25), fore: darken(steel, 0.25), cuff: darken(steel, 0.15) };
    legN = { thigh: mail, shin: steel, wrap: lighten(steel, 0.1), wrapAt: 0.3, foot: darken(steel, 0.08), knee: lighten(steel, 0.1), plate: true };
    fistN = lighten(steel, 0.05); fistF = darken(steel, 0.25);
  } else if (look === "berserk") {
    const fur = mix(p.cloth, "#c8b898", 0.55);
    armN = { up: skin, cuff: trim }; armF = { up: skinF, cuff: darken(trim, 0.25) };
    legN = { thigh: p.cloth, shin: p.cloth, wrap: fur, wrapAt: 0.35, foot: darken(trim, 0.1) };
    fistN = skin; fistF = skinF;
  } else if (look === "farmer") {
    armN = { up: p.cloth, fore: skin }; armF = { up: darken(p.cloth, 0.25), fore: skinF };
    legN = { thigh: trim, shin: trim, wrap: mix(p.cloth, "#e8dcc0", 0.35), wrapAt: 0.55, foot: "#5a3e28" };
    fistN = skin; fistF = skinF;
  } else {
    // the ranger's shirt sleeves, paler than the jerkin and the hood, so the
    // string arm reads as an arm where it crosses the cowl (the draw, the
    // loose, the reach to the quiver), not as a seam in it
    const sleeve = mix(p.cloth, "#e8dcc0", 0.35);
    armN = { up: sleeve, cuff: LEATHER }; armF = { up: darken(sleeve, 0.25), cuff: darken(LEATHER, 0.25) };
    legN = { thigh: trim, shin: trim, wrap: "#6a4a30", wrapAt: 0.2, foot: "#5a3e28" };
    fistN = skin; fistF = skinF;
  }
  legF = Object.fromEntries(Object.entries(legN).map(([kk, v]) => [kk, typeof v === "string" ? darken(v, 0.25) : v]));

  // the cape, behind everything, streaming as he goes
  if (p.cape && look !== "berserk") {
    const len = look === "hunter" ? 5.2 : 8.0, fl = st.fl;
    const cape = p.cape;
    inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => blob(c, [[1.2, -7.2], [-1.6, -7.4], [-2.9, -5.6], [-3.4 - fl * 0.3, -1.0], [-4.2 - fl, 3.6], [-5.0 - fl * 1.3, len, 1], [-3.6 - fl, len - 0.7, 1], [-2.4 - fl * 0.6, len + 0.1, 1], [-1.0 - fl * 0.3, len - 0.6, 1], [-0.6, 2.0], [-0.2, -4.0]], cape, {
      hi: 0.3, lo: 0.42, then: (cc) => {
        line(cc, -2.2, -4.6, -3.8 - fl, len - 0.4, 0.5, darken(cape, 0.35));
        line(cc, -1.2, -3.0, -1.9 - fl * 0.5, len - 0.4, 0.45, darken(cape, 0.3));
        if (look === "hero" || look === "champion") { cc.strokeStyle = trim; cc.lineWidth = 0.8; path(cc, [[1.2, -7.2], [-1.6, -7.4], [-2.9, -5.6], [-3.4 - fl * 0.3, -1.0], [-4.2 - fl, 3.6], [-5.0 - fl * 1.3, len, 1], [-3.6 - fl, len - 0.7, 1], [-2.4 - fl * 0.6, len + 0.1, 1], [-1.0 - fl * 0.3, len - 0.6, 1], [-0.6, 2.0], [-0.2, -4.0]]); cc.stroke(); }
      },
    }));
  }
  // what rides on the back: the champion's shield, Wren's quiver
  if (look === "champion") inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => { c.save(); c.translate(-2.6, -4.2); c.rotate(-0.25); kite(c, 0, 0, p.shcol || BRASS, lighten(p.shcol || BRASS, 0.3), "cross", "#f4efe0", 0.95); c.restore(); });
  if (look === "hunter") inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    for (const [dx, col] of [[-0.4, "#e8e2d0"], [0.6, "#c8383a"], [1.4, "#e8e2d0"]]) blob(c, [[-1.8 + dx, -8.0], [-1.2 + dx, -10.2, 1], [-0.7 + dx, -8.0]], col, { hi: 0.3 });
    blob(c, [[-1.4, -8.6, 1], [0.4, -8.2, 1], [-2.4, -1.6, 1], [-4.0, -2.2, 1]], LEATHER, { hi: 0.3, then: (cc) => { dab(cc, -4, -7.4, 5, 0.6, darken(LEATHER, 0.4)); dab(cc, -4, -3.6, 5, 0.6, darken(LEATHER, 0.4)); } });
  });

  // the far arm, behind the body: the shield arm, the second axe, a hand
  // swinging free on the march, the bow carried on the march
  if (w === "axes") { const h = arm(ctx, shF, H.hf, A, armF); axe(ctx, h[0], h[1], H.af, darken(p.wcol || "#b8bcc4", 0.2), 4.8); wrist(h, H.af, "axeF"); fist(ctx, h[0], h[1], 0.95, fistF); }
  else if (w === "sword" || w === "mace") arm(ctx, shF, H.hf, A, armF);
  else if (H.free) { const h = arm(ctx, shF, H.free, A, armF); fist(ctx, h[0], h[1], 0.95, fistF); }
  const bowHand = w === "bow" && !st.fight ? arm(ctx, shF, H.hf, A, armF) : null;

  // legs
  leg(ctx, R, o, "far", legF);
  leg(ctx, R, o, "near", legN);

  // the trunk, the skirts below the belt, and what is worn on them
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const sw = st.sk;
    const hem = look === "farmer" ? 2.6 : look === "berserk" ? 3.0 : 3.4;
    const skirtCol = kn ? trim : look === "hero" ? p.cape : look === "paladin" || look === "champion" ? mix(steel, "#fff3d2", 0.35) : p.cloth;
    const hemCol = kn ? darken(trim, 0.35) : look === "farmer" || look === "hunter" || look === "berserk" ? darken(skirtCol, 0.35) : trim;
    const panel = (pts, col) => blob(c, pts, col, { hi: 0.28, then: (cc) => { cc.fillStyle = hemCol; cc.fillRect(-4, hem - 0.9, 8, 1.2); } });
    panel([[-2.5, -1.0], [0.2, -1.0], [0.0 - sw * 0.3, hem, 1], [-2.9 - sw * 0.6, hem - 0.3, 1]], darken(skirtCol, 0.15));
    if (look === "berserk") {
      // a kilt of hide strips, ragged at the hem
      const fur = mix(p.cloth, "#c8b898", 0.55);
      blob(c, [[-2.6, -1.0], [2.5, -1.0], [2.8 + sw, hem, 1], [1.8, hem - 0.8, 1], [1.0 + sw * 0.5, hem + 0.2, 1], [0.1, hem - 0.7, 1], [-0.8, hem + 0.1, 1], [-1.8, hem - 0.6, 1], [-2.9 - sw * 0.5, hem - 0.1, 1]], p.cloth, { then: (cc) => { for (const x of [-1.4, 0.6, 1.9]) line(cc, x, -0.4, x + 0.2, hem, 0.4, darken(p.cloth, 0.45)); } });
      blob(c, [[-2.9, -1.8], [2.8, -1.8], [3.0, -0.2], [-3.0, -0.2]], fur, { hi: 0.4, then: (cc) => { for (let i = 0; i < 6; i++) dab(cc, -2.8 + i * 1.0, -0.8 + (i % 2) * 0.3, 0.45, 0.8, darken(fur, 0.3)); } });
    } else panel([[-0.3, -1.0], [2.4, -1.0], [2.9 + sw, hem - 0.2, 1], [0.2 + sw * 0.4, hem, 1]], skirtCol);

    const trunk = [[2.0, 0.2], [2.2, -1.8], [2.7, -4.2], [2.8, -5.9], [1.9, -7.0], [0, -7.4], [-1.8, -7.1], [-2.6, -5.8], [-2.5, -3.6], [-2.0, -1.6], [-2.1, 0.2]].map(([x, y]) => [x * (y < -2 ? burly : 1), y]);
    const trunkCol = kn ? trim : look === "berserk" ? skin : plated ? steel : p.cloth;
    blob(c, trunk, trunkCol, {
      hi: plated && !kn ? 0.5 : 0.3, lo: 0.42, then: (cc) => {
        if (kn) {
          // the garrison's blue surcoat over mail, a pale cross on the breast;
          // the Gate Guard's is the castle's red, a gold bar across it
          line(cc, 2.1, -6.4, 2.3, -2.2, 0.45, lighten(trim, 0.35));
          if (look === "guard") dab(cc, -0.7, -5.0, 3.2, 1.0, BRASS);
          else { dab(cc, 0.3, -6.2, 0.8, 3.4, "#e8e2d0"); dab(cc, -0.7, -5.2, 2.8, 0.8, "#e8e2d0"); }
          dab(cc, -3, -7.8, 6, 1.3, mix(darken(steel, 0.25), "#8a909c", 0.4));
          line(cc, -2.6, -6.4, 2.9, -6.4, 0.4, lighten(steel, 0.25));
        } else if (plated) {
          // a breastplate: the ridge and its gilt, lames at the belly
          const gold = trim;
          dab(cc, -3, -7.8, 6, 1.1, gold);
          line(cc, 1.5, -6.6, 1.8, -2.4, 0.9, look === "hero" ? lighten(steel, 0.6) : gold);
          if (look !== "hero") dab(cc, 0.3, -5.1, 3.0, 0.8, gold);
          else ball(cc, 1.4, -4.9, 0.9, 0.9, gold, { hi: 0.6, lo: 0.3 });
          for (const y of [-2.8, -1.9]) line(cc, -3, y, 3, y + 0.1, 0.4, darken(steel, 0.4));
          line(cc, -1.6, -6.4, -2.2, -3.6, 0.5, lighten(steel, 0.6));
        } else if (look === "berserk") {
          // chest and belly, woad stripes, a baldric
          cc.strokeStyle = darken(skin, 0.3); cc.lineWidth = 0.4;
          cc.beginPath(); cc.moveTo(-0.6, -4.6); cc.quadraticCurveTo(1.2, -3.8, 2.8, -4.4); cc.stroke();
          line(cc, 1.2, -3.4, 1.4, -1.8, 0.35, darken(skin, 0.3));
          for (const [x, y] of [[1.6, -6.2], [2.0, -5.4]]) line(cc, x - 1.0, y + 0.4, x + 0.8, y - 0.2, 0.45, "#4a74b8");
          line(cc, 2.2, -7.2, -2.4, -1.4, 1.2, trim); line(cc, 2.2, -7.2, -2.4, -1.4, 0.35, lighten(trim, 0.3));
        } else if (look === "farmer") {
          // an open neck, a patch, the smock gathered at a rope belt
          poly(cc, [[0.6, -7.4], [2.4, -7.4], [1.5, -5.6]], skin);
          dab(cc, -1.8, -4.8, 1.6, 1.5, trim);
          for (const [x, y] of [[-1.9, -4.9], [-0.4, -4.9], [-1.9, -3.5], [-0.4, -3.5]]) dab(cc, x, y, 0.4, 0.4, lighten(p.cloth, 0.4));
          line(cc, -1.0, -6.8, -1.6, -2.4, 0.4, darken(p.cloth, 0.3));
        } else {
          // the ranger's jerkin: laced at the breast, the quiver strap across
          line(cc, 1.6, -6.8, 1.8, -2.6, 0.45, darken(p.cloth, 0.4));
          for (const y of [-6.0, -5.0, -4.0]) dab(cc, 1.4, y, 0.8, 0.35, lighten(p.cloth, 0.4));
          line(cc, -2.2, -7.2, 2.4, -1.8, 1.0, LEATHER);
        }
        // the belt
        const belt = look === "farmer" ? mix(p.hair || "#d8b860", "#8a7a5a", 0.35) : plated && !kn ? darken(trim, 0.2) : look === "berserk" ? trim : "#4a3020";
        dab(cc, -3, -1.6, 6, 1.0, belt);
        if (look !== "farmer") { dab(cc, 1.3, -1.7, 0.9, 1.2, look === "berserk" ? "#b8bcc4" : BRASS); dab(cc, 1.6, -1.4, 0.35, 0.6, darken(belt, 0.4)); }
        else line(cc, 1.6, -1.1, 2.2, 0.8, 0.45, belt);
      },
    });
    // the gorget or the collar at the throat
    if (plated) blob(c, [[-1.2, -7.9], [1.4, -8.0], [1.9, -7.0], [-1.6, -6.9]], kn ? steel : trim, { hi: 0.5 });
    if (look === "hunter") blob(c, [[-2.4, -7.8], [1.2, -7.9], [2.2, -6.8], [0.6, -5.8, 1], [-1.2, -6.4], [-2.6, -6.4]], p.cape || p.cloth, { hi: 0.3 });
  });

  // a weapon cocked behind the head goes behind it (and, for a two-handed
  // haft, the far arm with it: it must never cross the face)
  const reachN = (to) => ik(shN[0], shN[1], to[0], to[1], A.up, A.fore, H.flip ? 1 : -1)[1];
  const blade = (h) => w === "sword" ? sword(ctx, h[0], h[1], H.an, p.wcol || "#dde2ea", look === "hero" ? 8.6 : 7.8, look === "hero" ? "#e8c14a" : BRASS) : mace(ctx, h[0], h[1], H.an, p.wcol || "#e8d47a");
  const POLE = w === "halberd" ? 16.4 : 14.2;
  const pole = (h) => {
    if (w === "hammer") hammer(ctx, h[0], h[1], H.an, p.wcol || "#e8d47a");
    else if (w === "halberd") halberd(ctx, h[0], h[1], H.an, p.wcol || "#d8dce4", POLE - (H.fwd || 9.4), H.fwd || 9.4);
    else fork(ctx, h[0], h[1], H.an, p.wcol || "#b8bcc4", POLE - (H.fwd || 8.4), H.fwd || 8.4);
  };
  const back = !!H.behind;
  // raised up past a steel helm (the wind-up), the near arm's gauntlet takes
  // the mail's darker tone, so the arm doesn't melt into the helm behind it
  const upN = back && plated, colsN = upN ? { ...armN, fore: armN.up, cuff: darken(steel, 0.12) } : armN, fistUp = upN ? darken(fistN, 0.12) : fistN;
  const farGrip = () => { const h2 = arm(ctx, shF, H.h2, A, armF); fist(ctx, h2[0], h2[1], 1.0, fistF); };
  const leadGrip = () => { const h = arm(ctx, shN, H.hn, A, colsN); wrist(h, H.an, w); fist(ctx, h[0], h[1], 1.05, fistUp); };
  if (back) {
    const h = reachN(H.hn);
    if (w === "sword" || w === "mace") blade(h);
    else if (w === "axes") axe(ctx, h[0], h[1], H.an, p.wcol || "#b8bcc4");
    // the haft and the far arm go behind the head; the lead arm comes up past
    // the back of the helm, drawn after it (below)
    else if (twoHand) { pole(h); farGrip(); }
  }

  // the shield, held before the body on the far arm (the head, nearer the
  // eye than the far arm, is drawn over its rim)
  if (w === "sword" || w === "mace") {
    const sc = p.shcol || "#3a5474";
    if (look === "knight") kite(ctx, H.hf[0] + 0.9, H.hf[1] + 0.2, sc, "#c4c8d0", "cross", "#e8e2d0");
    else if (look === "hero") kite(ctx, H.hf[0] + 0.9, H.hf[1] + 0.2, sc, trim, "chevron", trim, 1.05);
    else kite(ctx, H.hf[0] + 0.9, H.hf[1] + 0.2, sc, lighten(sc, 0.35), "cross", "#f4efe0");
  }

  // the one-handed weapon hand: the arm, its pauldron, the steel, the fist,
  // all drawn AFTER the head (below). The pauldron sits on the near side of
  // the neck, over the helm's lower rim; on the march the blade lies level
  // along the shoulder under the helm's back rim, so it shows whole. Cocked
  // overhead (the wind-up) the steel hangs behind the head (drawn above), but
  // the arm and fist come up past the back of the helm in front of it: the
  // elbow sits behind the head's middle, so the arm covers only the back of
  // the helm and the ear, never the face.
  const pl = plated && !kn;
  const nearHand = () => {
    const h = arm(ctx, shN, H.hn, A, colsN);
    // (with the blade on the shoulder the shell rides up a hair, so the
    // blade crosses its lower half and the helm's rim sits in its curve)
    if (plated) pauldron(ctx, shN[0] - 0.2, shN[1] + (H.shoulder ? -0.2 : 0.1), 1.8, steel, pl ? trim : null);
    if ((w === "sword" || w === "mace") && !back) blade(h);
    else if (w === "axes" && !back) axe(ctx, h[0], h[1], H.an, p.wcol || "#b8bcc4");
    wrist(h, H.an, w);
    fist(ctx, h[0], h[1], 1.05, fistUp);
  };

  // the bow, its arms and hands. On the march and at the nock the string arm
  // hangs from the shoulder and the hood's cowl drapes over it, so the group
  // goes under the head (the cowl covers the shoulder; the bow, held in the
  // far hand, is farther from the eye than the face); drawn, loosed or at the
  // quiver the raised string arm is drawn over the cowl, clear of the face
  const bowGroup = () => {
    if (st.fight) {
      // the bow arm at the mark; the string hand at the jaw, flung back, at the quiver or nocking
      const hf = arm(ctx, shF, H.hf, A, armF);
      const to = along(hf[0], hf[1], H.ab);
      const hn = reachN(H.hn);
      bow(ctx, hf[0], hf[1], H.ab, p.wcol || "#6a4428", H.string ? hn : null, 6.8);
      fist(ctx, hf[0], hf[1], 0.95, fistF);
      if (H.nock) arrow(ctx, hn[0], hn[1], ...to(0, 3.4));
      if (H.loose) {
        ctx.fillStyle = "rgba(255,243,210,0.8)";
        // the streaks fly off the way the arrow went (skyward on the "sky" sheet)
        if (st.sky) for (let i = 0; i < 3; i++) { const [lx, ly] = to(0, 3.9 + i * 1.6); ctx.fillRect(lx - 0.5, ly - 0.2, 1.0, 0.4); }
        else for (let i = 0; i < 3; i++) ctx.fillRect(hf[0] + 3.6 + i * 1.6, hf[1] - 0.2, 1.0, 0.4);
      }
      const h = arm(ctx, shN, H.hn, { ...A, bend: H.flip ? 1 : -1 }, armN);
      // at the quiver the fingers close on a fletching
      if (H.draw) blob(ctx, [[h[0] - 0.5, h[1] - 0.6], [h[0] - 0.1, h[1] - 2.4, 1], [h[0] + 0.4, h[1] - 0.6]], "#e8e2d0", { hi: 0.3 });
      fist(ctx, h[0], h[1], 0.95, fistN);
    } else {
      // on the march the bow rides upright in the far hand, carried out
      // before him with the string forward, so the upper limb stands clear
      // of the face
      bow(ctx, bowHand[0], bowHand[1], H.ab, p.wcol || "#6a4428"); fist(ctx, bowHand[0], bowHand[1], 0.95, fistF);
      const h = arm(ctx, shN, H.hn, A, armN); fist(ctx, h[0], h[1], 0.95, fistN);
    }
  };
  const bowEarly = w === "bow" && (!st.fight || H.early);
  if (bowEarly) bowGroup();

  // the head
  const hd = T(0.85, -9.35); hd[0] += st.head;
  const ha = st.lean * 0.3;
  if (look === "knight") bascinet(ctx, hd[0], hd[1], ha, p, { plume: trim });
  else if (look === "guard") bascinet(ctx, hd[0], hd[1], ha, p, { band: BRASS });
  else if (look === "paladin") greatHelm(ctx, hd[0], hd[1], ha, p);
  else if (look === "champion") greatHelm(ctx, hd[0], hd[1], ha, p, { steel: p.cloth, crown: p.hair || "#e8c14a" });
  else if (look === "hero") heroHelm(ctx, hd[0], hd[1], ha, p);
  else if (look === "berserk") berserkHead(ctx, hd[0], hd[1], ha, p);
  else if (look === "farmer") farmerHead(ctx, hd[0], hd[1], ha, p);
  else hunterHead(ctx, hd[0], hd[1], ha, p);

  // the weapon hand
  if (twoHand) {
    // the haft first, then the rear hand closing on it, then the lead hand
    // (cocked behind the head, the haft and rear hand are already down)
    if (!back) { pole(H.hn); farGrip(); }
    leadGrip();
  } else if (w === "halberd" || w === "fork") {
    // carried upright in the near hand
    pole(H.hn);
    const h = arm(ctx, shN, H.hn, A, armN);
    wrist(h, H.an, w);
    fist(ctx, h[0], h[1], 1.05, fistN);
  } else if (w === "bow") {
    if (!bowEarly) bowGroup();
  } else nearHand();
  if (plated && (twoHand || w === "halberd")) pauldron(ctx, shN[0] - 0.2, shN[1] + 0.1, 1.8, steel, trim);
  ctx.restore();
};

// ---- the roster -------------------------------------------------------------------
export const CROWN_RIGS = {
  knight: { kind: "crown", box: { hw: 20, up: 30, down: 4 }, p: { look: "knight", h: 22, skin: "#e8b990", cloth: "#b8bcc4", cloth2: "#3a5474", hair: "#c4c8d0", weapon: "sword", wcol: "#dde2ea", shcol: "#3a5474" } },
  paladin: { kind: "crown", box: { hw: 21, up: 30, down: 4 }, p: { look: "paladin", h: 22, skin: "#e8b990", cloth: "#e0dccf", cloth2: "#d8b34a", hair: "#e8e2d0", weapon: "mace", wcol: "#e8c860", shcol: "#d8b34a" } },
  berserk: { kind: "crown", box: { hw: 20, up: 30, down: 4 }, p: { look: "berserk", h: 22, skin: "#e8b990", cloth: "#6a3a2a", cloth2: "#3a2018", hair: "#b0503a", weapon: "axes", wcol: "#b8bcc4" } },
  champion: { kind: "crown", box: { hw: 34, up: 46, down: 4 }, p: { look: "champion", h: 34, skin: "#e8b990", cloth: "#e0dccf", cloth2: "#d8b34a", hair: "#e8c14a", cape: "#3a5474", weapon: "hammer", wcol: "#e8c860", shcol: "#d8b34a" } },
  halberdier: { kind: "crown", box: { hw: 27, up: 38, down: 4 }, p: { look: "guard", h: 22, skin: "#e8b990", cloth: "#b8bcc4", cloth2: "#7c3f4a", hair: "#c4c8d0", weapon: "halberd", wcol: "#d8dce4" } },
  // the heroes' retinues (bands.js HERO_RETINUE): Sir Aldric's squires wear
  // the garrison's kit in his red; Wren's archers her hood in woodland brown
  squire: { kind: "crown", box: { hw: 20, up: 30, down: 4 }, p: { look: "knight", h: 21, skin: "#e8b990", cloth: "#b8bcc4", cloth2: "#a0303a", hair: "#c4c8d0", weapon: "sword", wcol: "#dde2ea", shcol: "#a0303a" } },
  bowman: { kind: "crown", box: { hw: 18, up: 30, down: 4 }, p: { look: "hunter", h: 21, skin: "#e8b990", cloth: "#80703f", cloth2: "#4a3e2c", hair: "#6c5634", weapon: "bow", wcol: "#6a4428" } },
  farmer: { kind: "crown", box: { hw: 24, up: 30, down: 4 }, p: { look: "farmer", h: 21, skin: "#e8b990", cloth: "#9a8a62", cloth2: "#5a4a3a", hair: "#d8b860", weapon: "fork", wcol: "#b8bcc4" } },
  heroKnight: { kind: "crown", box: { hw: 22, up: 33, down: 4 }, p: { look: "hero", h: 24, skin: "#e8b990", cloth: "#d4d8e0", cloth2: "#e8c14a", hair: "#dde2ea", cape: "#a0303a", weapon: "sword", wcol: "#f0f0f4", shcol: "#a0303a" } },
  heroHunter: { kind: "crown", box: { hw: 18, up: 30, down: 4 }, p: { look: "hunter", h: 22, skin: "#e8c9a2", cloth: "#4e7f3e", cloth2: "#3a4a2c", hair: "#3f6a34", cape: "#3a5a30", weapon: "bow", wcol: "#6a4428" } },
};
export const CROWN_PAINTERS = { crown: soldier };

// Every crown soldier's fight sheet has four frames (enemies.js fightFrame
// picks them off the attack clock): melee 0 guard, 1 wind-up, 2 strike,
// 3 follow-through; the bow 0 full draw, 1 loose, 2 reach to the quiver, 3 nock.
export const CROWN_FIGHT_FRAMES = Object.fromEntries(Object.keys(CROWN_RIGS).map((t) => [t, 4]));
