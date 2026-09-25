// ============ RIGS: THE COVERT'S BLADES ============
// The hooded killers the Assassin's Covert sends into the grass. Entries in
// rigs.js use kind "assassin"; COVERT_PAINTERS maps it to the painter
// (ctx, p) — pose is p.pose ("walk" | "fight") and p.frame (0-3 walk, 0-1
// fight), feet at 0,0, facing +x. Frames are baked once and inked by rigs.js.
//
// The same small skeleton as the crown's soldiers (so a blade stands as tall
// as a garrison knight), cut slimmer and carried lower: a stalker's lean on
// the march, up on the toes; a crouch with the dagger cocked for the wait;
// a long lunge and a straight-arm thrust for the cut. Worn over it: a deep
// hood with the face in its shade (a glint of eye, a mask over the mouth), a
// ragged cloak split into tails, a leather jerkin crossed by a baldric, a
// belt with a pouch, wrapped shins and soft boots.
//
// Colours: p.skin, p.cloth (the cloak), p.cloth2 (the leathers), p.hair (the
// hood and mantle), p.cape (the sash and scarf accent), p.wcol (the steel),
// p.trim (buckles and the guard), p.eyes, p.mask; p.offhand gives a second
// knife in the off hand, p.vials a bandolier of poison (its colour), p.venom
// a poisoned edge (its colour).

import { lighten, darken, mix, ball, lin, part, shadow } from "./paint.js";

// ---- the kit (the same small skeleton as the crown's) ---------------------------
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
// walking along a blade: u down its length, v across it
const along = (x, y, a) => { const dx = Math.cos(a), dy = Math.sin(a); return (u, v = 0) => [x + dx * u - dy * v, y + dy * u + dx * v]; };

// The gait: contact, passing, contact, passing. A blade walks up on its toes
// with the hip riding high as the foot passes. The fight: a low crouch with
// the weight back (the wait), then the lunge, stepping far in.
const step = (p, o) => {
  const f = (p.frame || 0) % 4, s = o.stride;
  if (p.pose !== "fight") {
    const c = [1, 0, -1, 0][f];
    return {
      fight: false, f, c,
      near: f === 3 ? [-0.2 * s, -o.lift] : [c * s + (f === 1 ? 0.3 * s : 0), 0],
      far: f === 1 ? [-0.2 * s, -o.lift] : [-c * s + (f === 3 ? 0.3 * s : 0), 0],
      x: 0, bob: f % 2 ? -o.bob : 0, drop: 0, lean: o.lean + (f % 2 ? 0 : o.dip), swing: -c,
    };
  }
  const hit = f === 1;
  return {
    fight: true, f, c: 0, hit,
    near: [hit ? 4.6 : 2.3, 0], far: [hit ? -3.4 : -2.9, 0],
    x: hit ? o.lunge : -0.6, bob: 0, drop: hit ? 1.9 : 1.5, lean: hit ? 0.42 : 0.2, swing: 0,
  };
};
const skeleton = (p, o) => {
  const st = step(p, o);
  const reach = o.L1 + o.L2, ank = o.ankle;
  const hipH = Math.min(Math.sqrt(reach * reach - o.stride * o.stride) * 0.96, reach - o.bob - 0.15) + ank;
  const hip = [st.x, -hipH + st.bob + st.drop];
  return { st, hip, ank, T: frameAt(hip[0], hip[1], st.lean) };
};
// a soft boot, pointed, the heel lifted when the foot trails
const foot = (ctx, x, y, len, h, col, toe = 0) => part(ctx, (c) => {
  c.save(); c.translate(x, y); c.rotate(-toe);
  path(c, [[-len * 0.3, 0, 1], [-len * 0.34, -h * 0.85], [-len * 0.05, -h], [len * 0.3, -h * 0.55], [len * 0.72, -h * 0.12], [len * 0.74, 0, 1]]);
  c.fillStyle = cel(c, -len * 0.4, -h, len * 0.75, 0, col); c.fill();
  dab(c, -len * 0.34, -h * 0.62, len * 0.5, 0.45, lighten(col, 0.25));   // the turned-down cuff
  c.restore();
});
const leg = (ctx, R, o, which, cols) => {
  const { st, T, ank } = R;
  const [fx, fy] = st[which];
  const hp = T(which === "near" ? o.hipW : -o.hipW, 0);
  const [kn, an] = ik(hp[0], hp[1], fx, fy - ank, o.L1, o.L2, 1);
  part(ctx, (c) => {
    tube(c, hp[0], hp[1], kn[0], kn[1], o.thigh, cols.thigh);
    tube(c, kn[0], kn[1], an[0], an[1], o.shin, cols.shin);
    // the shin wrapped in strips from the calf down
    const t0 = 0.3, sx = kn[0] + (an[0] - kn[0]) * t0, sy = kn[1] + (an[1] - kn[1]) * t0;
    tube(c, sx, sy, an[0], an[1], o.shin * 1.06, cols.wrap);
    for (const t of [0.25, 0.55, 0.85]) {
      const wx = sx + (an[0] - sx) * t, wy = sy + (an[1] - sy) * t;
      line(c, wx - 0.8, wy + 0.25, wx + 0.8, wy - 0.25, 0.35, darken(cols.wrap, 0.4));
    }
  });
  const lifted = fy < 0;
  foot(ctx, an[0], an[1] + ank, o.foot, ank + 0.55, cols.foot, lifted ? 0.5 : st.fight && which === "far" ? 0.35 : 0);
  return { hp, kn, an };
};
const arm = (ctx, sh, to, o, cols) => {
  const [el, hd] = ik(sh[0], sh[1], to[0], to[1], o.up, o.fore, o.bend ?? -1);
  part(ctx, (c) => {
    tube(c, sh[0], sh[1], el[0], el[1], o.w, cols.up);
    tube(c, el[0], el[1], hd[0], hd[1], o.w * 0.9, cols.fore || cols.up);
    // a leather bracer from mid-forearm to the wrist, strapped twice
    const t = 0.35, bx = el[0] + (hd[0] - el[0]) * t, by = el[1] + (hd[1] - el[1]) * t;
    const ex = hd[0] - (hd[0] - el[0]) * 0.12, ey = hd[1] - (hd[1] - el[1]) * 0.12;
    tube(c, bx, by, ex, ey, o.w * 1.08, cols.cuff);
    for (const u of [0.3, 0.75]) dab(c, bx + (ex - bx) * u - 0.25, by + (ey - by) * u - 0.25, 0.5, 0.5, cols.buckle);
  });
  return hd;
};
const fist = (ctx, x, y, r, col) => part(ctx, (c) => ball(c, x, y, r, r * 0.95, col, { hi: 0.4, lo: 0.4 }));

// ---- the steel -------------------------------------------------------------------
// a long dagger from the hand along `a`: pommel, a wrapped grip, a short bar
// guard, a leaf blade with a bright bevel; a poisoned edge runs green
// o.kind picks the steel: "dagger" (the leaf), "long" (the Kingslayer's
// slender estoc, a gilt cross-guard), "hanger" (the sellsword's broad,
// clipped-point short sword) or "needle" (the Widow's stiletto, a bead of
// venom at the point)
const BLADES = {
  dagger: (len) => [[[0.9, -0.62, 1], [len * 0.55, -0.72], [len, 0, 1], [len * 0.55, 0.72], [0.9, 0.62, 1]], [[0.9, -0.62, 1], [len * 0.55, -0.72], [len, 0, 1], [0.9, 0, 1]]],
  long: (len) => [[[0.9, -0.52, 1], [len * 0.82, -0.46, 1], [len, 0, 1], [len * 0.82, 0.46, 1], [0.9, 0.52, 1]], [[0.9, -0.52, 1], [len * 0.82, -0.46, 1], [len, 0, 1], [0.9, 0, 1]]],
  hanger: (len) => [[[0.9, -0.7, 1], [len * 0.55, -1.0], [len * 0.86, -1.05, 1], [len, -0.2, 1], [len * 0.8, 0.55], [0.9, 0.62, 1]], [[0.9, -0.7, 1], [len * 0.55, -1.0], [len * 0.86, -1.05, 1], [len, -0.2, 1], [0.9, -0.05, 1]]],
  needle: (len) => [[[0.9, -0.36, 1], [len, 0, 1], [0.9, 0.36, 1]], [[0.9, -0.36, 1], [len, 0, 1], [0.9, 0, 1]]],
};
const dagger = (ctx, x, y, a, col, o = {}) => part(ctx, (c) => {
  const to = along(x, y, a), len = o.len ?? 5.2, kind = o.kind || "dagger", trim = o.trim || "#c4c8d0";
  const gl = kind === "long" ? 1.9 : kind === "hanger" ? 1.6 : 1.3;                          // a longer grip for the long steel
  line(c, ...to(-gl), ...to(0.5), 1.0, o.grip || "#3a2418");
  dab(c, ...to(-gl - 0.2).map((v) => v - 0.45), 0.9, 0.9, trim);                          // the pommel
  if (kind === "needle") { c.beginPath(); c.arc(...to(0.75), 0.55, 0, Math.PI * 2); c.lineWidth = 0.45; c.strokeStyle = trim; c.stroke(); }   // a ring guard
  else {
    const gw = kind === "long" ? 1.75 : kind === "hanger" ? 1.4 : 1.2;
    line(c, ...to(0.7, -gw), ...to(0.7, gw), kind === "long" ? 0.85 : 0.7, trim);        // the guard
    if (kind === "long") { dab(c, ...to(0.9, -gw).map((v) => v - 0.35), 0.7, 0.7, trim); dab(c, ...to(0.9, gw).map((v) => v - 0.35), 0.7, 0.7, trim); }
    if (kind === "hanger") line(c, ...to(0.7, gw), ...to(-1.4, gw * 0.9), 0.45, trim);  // the knuckle-bow
  }
  const [full, lit] = BLADES[kind](len).map((pts) => pts.map(([u, v, k]) => (k ? [...to(u, v), 1] : to(u, v))));
  path(c, full); c.fillStyle = darken(col, 0.18); c.fill();
  path(c, lit); c.fillStyle = lighten(col, 0.4); c.fill();
  line(c, ...to(1.2, 0), ...to(len * (kind === "needle" ? 0.7 : 0.8), 0), 0.3, lighten(col, 0.7));   // the bevel's glint
  if (kind === "long") line(c, ...to(1.3, 0.18), ...to(len * 0.7, 0.18), 0.25, darken(col, 0.4));   // the fuller
  if (o.venom && kind === "needle") { ball(c, ...to(len - 0.2, 0.3), 0.55, 0.6, o.venom, { hi: 0.7, lo: 0.3 }); line(c, ...to(len * 0.5, 0.25), ...to(len * 0.95, 0.1), 0.35, o.venom); }
  else if (o.venom) { line(c, ...to(len * 0.35, 0.62), ...to(len * 0.92, 0.18), 0.45, o.venom); dab(c, ...to(len * 0.5, 0.95), 0.5, 0.6, o.venom); }
});

// ---- the hood ----------------------------------------------------------------------
// (0,0) the middle of the skull, +x the face. A deep cowl whose brim hangs
// out past the brow, the face sunk in its shade: a glint of eye, the line of
// the nose catching what light gets in, and a mask over mouth and jaw.
const hoodHead = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  c0.scale(0.86, 0.88);
  const hood = p.hair, skin = p.skin, shade = mix(darken(skin, 0.55), "#2a1c2c", 0.35);
  const H = [[-2.4, 3.0, 1], [-3.0, 0.6], [-3.1, -1.8], [-4.4, -3.4], [-2.2, -3.9], [0.4, -3.9], [2.3, -3.1], [3.4, -1.7, 1], [2.6, -1.2], [2.0, -0.2], [1.9, 1.6], [2.5, 2.6, 1], [0.6, 3.2]];
  const eyes = p.eyes || "#f0e0b0";
  blob(c0, H, hood, {
    hi: 0.38, lo: 0.5, then: (c) => {
      // the opening: dark, the face deep inside it
      path(c, [[3.0, -1.4, 1], [2.3, -0.2], [2.1, 1.4], [2.6, 2.6, 1], [0.7, 2.4], [0.3, 0.3], [0.8, -1.6]]); c.fillStyle = "#1c1420"; c.fill();
      if (p.face !== "gild") {   // (the gilded face is its own part, below)
        path(c, [[2.6, -0.9, 1], [2.25, 0.2], [2.2, 1.4], [2.5, 2.4, 1], [1.2, 2.2], [0.9, 0.2], [1.3, -1.0]]); c.fillStyle = shade; c.fill();
        dab(c, 2.35, 0.1, 0.6, 0.9, mix(shade, skin, 0.45));                      // the nose
        dab(c, 1.45, -0.55, 0.85, 0.55, eyes);                                    // the eye's glint
        dab(c, 1.45, -0.55, 0.4, 0.28, lighten(eyes, 0.6));
        // the mask over the mouth and jaw
        const m = p.mask || darken(hood, 0.2);
        path(c, [[3.0, 0.9, 1], [2.6, 2.6, 1], [0.5, 2.6, 1], [0.6, 1.0], [1.4, 0.7]]);
        c.fillStyle = cel(c, 0.5, 0.7, 3, 2.6, m, 0.4, 0.3); c.fill();
        line(c, 0.9, 1.7, 2.8, 1.5, 0.3, darken(m, 0.35));
      }
      // the brim's lit edge and a fold down the side of the cowl
      line(c, -1.6, -3.6, 2.6, -2.7, 0.5, p.brim || lighten(hood, 0.45));
      line(c, 2.4, -2.9, 3.2, -1.7, 0.45, p.brim || lighten(hood, 0.35));
      line(c, -1.4, -2.8, -0.4, 1.8, 0.4, darken(hood, 0.45));
    },
  });
  // the hood's tail, lying down the back
  blob(c0, [[-2.9, -1.4], [-4.1, -2.6, 1], [-3.7, -0.6], [-3.1, 1.0, 1], [-2.5, 0.8]], darken(hood, 0.12), { hi: 0.2 });

  // the Kingslayer's gilded face: a smooth gold mask that sits proud of the
  // cowl, a slit for the eyes, a ridge of nose, a shut, unsmiling mouth
  if (p.face === "gild") {
    const g = p.mask || "#e8c14a";
    blob(c0, [[1.2, -1.9, 1], [3.3, -1.5, 1], [3.0, -0.2], [3.5, 0.9, 1], [3.1, 2.1], [2.3, 3.2, 1], [1.0, 3.0, 1], [0.4, 1.0], [0.6, -1.0]], g, {
      hi: 0.55, lo: 0.5, then: (c) => {
        dab(c, 1.1, -0.75, 1.9, 0.65, "#1c1420");                                   // the eye slit
        dab(c, 1.55, -0.7, 0.6, 0.4, eyes);
        dab(c, 2.75, -0.5, 0.5, 1.4, lighten(g, 0.6));                               // the nose ridge
        line(c, 1.5, 2.05, 2.75, 1.9, 0.35, darken(g, 0.5));                        // the mouth
        dab(c, 0.5, -1.3, 2.9, 0.4, darken(g, 0.3));                                // the brow's shadow
      },
    });
  }

  // the Widow's veil: black lace falling from the brim over the face to
  // below the chin, a scalloped pale edge, the eyes burning through it
  if (p.veil) {
    const v = p.veil, lace = p.lace || "#c8c0cc";
    blob(c0, [[3.4, -2.3, 1], [3.9, 0.2], [3.8, 3.3, 1], [2.9, 4.1, 1], [1.7, 3.6, 1], [0.6, 4.0, 1], [0.1, 2.6], [0.9, 0.2], [1.3, -2.6, 1]], v, {
      hi: 0.3, lo: 0.3, then: (c) => {
        for (let r = 0; r < 6; r++) for (let xx = 0.6 + (r % 2) * 0.55; xx < 3.9; xx += 1.1) dab(c, xx, -1.6 + r * 0.9, 0.45, 0.45, mix(v, lace, 0.45));
        dab(c, 1.2, -0.75, 1.1, 0.7, eyes); dab(c, 1.35, -0.7, 0.45, 0.3, lighten(eyes, 0.6));
        line(c, 3.7, -2.0, 3.8, 3.2, 0.7, lace);                                    // the lace edge down the front
      },
    });
    part(c0, (c) => {                                                              // a fine lace edge along the veil's hem
      c.beginPath(); c.moveTo(0.3, 3.3); c.lineTo(0.6, 3.9); c.lineTo(1.7, 3.5); c.lineTo(2.9, 4.0); c.lineTo(3.8, 3.2);
      c.lineWidth = 0.55; c.lineJoin = "round"; c.strokeStyle = darken(lace, 0.15); c.stroke();
    });
  }

  // the Plague Bearer's beak: a long curved leather beak stuffed with
  // herbs, a round glass lens for the eye, a seam and a nostril hole
  if (p.beak) {
    const b = p.beak;
    blob(c0, [[1.5, -1.3], [3.4, -0.9], [5.3, 0.4], [6.8, 2.6, 1], [5.2, 2.1], [3.4, 2.4], [1.5, 2.3, 1]], b, {
      hi: 0.4, lo: 0.45, then: (c) => {
        line(c, 2.0, 0.7, 6.3, 2.3, 0.35, darken(b, 0.4));                        // the seam
        dab(c, 3.4, -0.2, 0.45, 0.35, darken(b, 0.6));                            // the nostril
        line(c, 1.6, -0.9, 4.8, 0.2, 0.35, lighten(b, 0.45));                     // the lit ridge
        dab(c, 1.6, 1.4, 2.0, 0.5, darken(b, 0.3));                               // the strap
      },
    });
    part(c0, (c) => { ball(c, 1.8, -0.55, 1.0, 1.0, p.trim || "#b89a50", { hi: 0.5, lo: 0.4 }); ball(c, 1.85, -0.55, 0.62, 0.62, eyes, { hi: 0.7, lo: 0.4 }); dab(c, 1.55, -0.95, 0.35, 0.35, "#fff3d2"); });
  }

  // the sellsword's hat over the hood: a broad slouched brim seen from
  // above, a dented crown with a band, a plume raked back
  if (p.hat) {
    const h = p.hat;
    part(c0, (c) => {
      c.beginPath(); c.ellipse(0.1, -3.1, 5.0, 1.5, 0.1, 0, Math.PI * 2);
      c.fillStyle = cel(c, -4.9, -4.6, 5.1, -1.6, h, 0.3, 0.5); c.fill();
      c.beginPath(); c.ellipse(0.1, -3.1, 5.0, 1.5, 0.1, 0.15, Math.PI - 0.15); c.lineWidth = 0.45; c.strokeStyle = darken(h, 0.5); c.stroke();
    });
    blob(c0, [[-2.5, -3.2, 1], [-2.3, -5.5], [-1.0, -6.3], [0.4, -5.8], [1.6, -6.2], [2.4, -5.3], [2.5, -3.2, 1]], h, {
      hi: 0.35, lo: 0.45, then: (c) => { dab(c, -2.6, -4.2, 5.2, 0.8, p.band || darken(h, 0.5)); dab(c, 1.2, -4.2, 0.7, 0.8, p.trim || "#c8a050"); line(c, 0.4, -5.7, 0.2, -4.4, 0.35, darken(h, 0.45)); },
    });
    blob(c0, [[-1.6, -4.6], [-3.4, -7.4], [-5.8, -7.8, 1], [-4.2, -6.3], [-2.4, -3.9, 1]], p.plume || "#c8403a", { hi: 0.45, then: (c) => line(c, -1.9, -4.3, -5.2, -7.6, 0.3, lighten(p.plume || "#c8403a", 0.4)) });
  }
});

// ---- the blade --------------------------------------------------------------------
const BLADE = { L1: 4.8, L2: 4.6, stride: 2.1, lift: 2.3, bob: 0.8, lean: 0.12, dip: 0.04, lunge: 2.6, hipW: 0.6, thigh: 1.85, shin: 1.5, foot: 2.8, ankle: 0.7 };

// where the hands go: [march, the wait, the cut]. The dagger rides low in a
// reverse grip on the march, cocked back at the hip for the wait, and goes
// straight out at the mark on the cut; an off-hand knife guards, then sweeps.
const hands = (st, shN, shF) => {
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy], F = (dx, dy) => [shF[0] + dx, shF[1] + dy];
  const ph = !st.fight ? 0 : st.hit ? 2 : 1;
  return [
    { hn: N(0.9 + sw * 0.9, 4.6), an: 1.95 + sw * 0.08, hf: F(1.0 - sw * 1.3, 4.3), af: 2.1 - sw * 0.1 },
    { hn: N(-1.9, 3.4), an: -0.28, hf: F(3.6, 1.6), af: -0.55 },
    { hn: N(5.8, 0.4), an: -0.08, hf: F(-2.2, 3.6), af: 2.5 }][ph];
};

const blade = (ctx, p) => {
  const k = (p.h ?? 22) / 22; ctx.save(); ctx.scale(k, k);
  const o = BLADE, R = skeleton(p, o), { st, T } = R;
  const skin = p.skin, cloak = p.cloth, lea = p.cloth2, hood = p.hair, sash = p.cape || "#7a3a3a";
  const steel = p.wcol || "#c4c8d0", trim = p.trim || "#b8bcc4";
  shadow(ctx, 0.4 + (st.fight ? st.x * 0.5 : 0), -0.1, 4.6, 1.2, 0.26);
  const shN = T(0.9, -6.5), shF = T(-1.0, -6.7);
  const A = { up: 3.1, fore: 2.9, w: 1.6 };
  const H = hands(st, shN, shF);
  const tights = darken(mix(lea, cloak, 0.7), 0.08);
  const armN = { up: lea, fore: lea, cuff: darken(lea, 0.28), buckle: trim };
  const armF = { up: darken(lea, 0.28), fore: darken(lea, 0.28), cuff: darken(lea, 0.45), buckle: darken(trim, 0.3) };
  const legN = { thigh: tights, shin: tights, wrap: mix(lea, "#c8b898", 0.32), foot: darken(lea, 0.3) };
  const legF = { thigh: darken(tights, 0.28), shin: darken(tights, 0.28), wrap: darken(legN.wrap, 0.28), foot: darken(legN.foot, 0.25) };

  // the cloak, behind everything: from the shoulders to the knee, split into
  // ragged tails that stream back as he goes and fly out on the lunge
  const fl = st.fight ? (st.hit ? 2.2 : 0.6) : [0.5, 1.1, 0.4, 0.9][st.f];
  const lift = st.fight && st.hit ? 1.4 : 0;
  // (p.long: the Widow's mourning cloak falls to the ankle, a band of pale
  // lace scalloped along its hem; p.hem: a gilt edge along the hem)
  const ext = p.long ? (st.fight ? 0.32 : 0.5) : 0, dn = (y) => (y > 1 ? y + (y - 1) * ext : y);
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const pts = [[1.0, -7.4], [-1.4, -7.6], [-2.4, -6.0], [-2.6 - fl * 0.3, -2.0], [-3.2 - fl, 1.6 - lift * 0.5], [-4.4 - fl * 1.3, 4.8 - lift, 1], [-3.5 - fl, 3.8 - lift, 1], [-2.9 - fl * 0.8, 5.3 - lift * 0.8, 1], [-2.1 - fl * 0.5, 4.0 - lift * 0.5, 1], [-1.3 - fl * 0.3, 4.9 - lift * 0.4, 1], [-0.7, 2.6], [-0.2, -3.6]]
      .map(([x, y, k]) => [x - (p.long && y > 1 ? (y - 1) * 0.12 : 0), dn(y), k]);
    const hemA = [-4.2 - fl * 1.3, dn(4.5 - lift)], hemB = [-1.2 - fl * 0.3, dn(4.6 - lift * 0.4)];
    blob(c, pts, cloak, {
      hi: 0.34, lo: 0.4, then: (cc) => {
        line(cc, -1.7, -5.0, -3.0 - fl, dn(3.8 - lift), 0.5, darken(cloak, 0.4));
        line(cc, -1.0, -3.4, -2.2 - fl * 0.5, dn(4.2 - lift * 0.5), 0.45, darken(cloak, 0.35));
        line(cc, -2.4, -6.6, -2.9 - fl * 0.2, -2.6, 0.5, lighten(cloak, 0.35));
        // the lining shows at the hem (gilt on the Kingslayer, lace on the Widow)
        if (p.long) {
          // a band of lace along the scalloped hem, pierced with holes
          const lace = p.lace || "#c8c0cc", hem = pts.slice(5, 10);
          cc.beginPath(); cc.moveTo(hem[0][0], hem[0][1]); for (const q of hem.slice(1)) cc.lineTo(q[0], q[1] + 0.2);
          cc.lineWidth = 1.5; cc.lineJoin = "round"; cc.strokeStyle = darken(lace, 0.22); cc.stroke();
          for (const q of hem) dab(cc, q[0] - 0.2, q[1] - 0.5, 0.4, 0.4, darken(lace, 0.6));
        } else line(cc, ...hemA, ...hemB, p.hem ? 0.8 : 0.5, p.hem || mix(cloak, sash, 0.5));
        if (p.hem) line(cc, 0.6, -7.2, -0.3, -3.4, 0.5, p.hem);
      },
    });
  });

  // the far arm, behind the body: the off-hand knife, or an empty hand
  // (the Plague Bearer carries his censer out in front on the march)
  if (p.censer && !st.fight) H.hf = [shF[0] + 3.0 - st.swing * 0.7, shF[1] + 3.6];
  const hf = arm(ctx, shF, H.hf, A, armF);
  if (p.offhand) dagger(ctx, hf[0], hf[1], H.af, darken(steel, 0.12), { len: 3.8, trim: darken(trim, 0.2), venom: p.venom && darken(p.venom, 0.1) });
  fist(ctx, hf[0], hf[1], 0.85, darken(skin, 0.3));

  // legs
  leg(ctx, R, o, "far", legF);
  leg(ctx, R, o, "near", legN);

  // the spore censer on its chain from the far hand: a brass ball pierced
  // with holes that glow with what smoulders inside, swinging as he goes
  const censer = () => {
    if (!p.censer) return;
    const ang = st.fight ? (st.hit ? -0.55 : 0.35) : 0.4 + st.swing * 0.25, L = 2.4;
    const cx = hf[0] + Math.sin(ang) * L, cy = hf[1] + Math.cos(ang) * L;
    part(ctx, (c) => { for (let u = 0.15; u < 0.8; u += 0.22) dab(c, hf[0] + (cx - hf[0]) * u - 0.25, hf[1] + (cy - hf[1]) * u - 0.25, 0.5, 0.5, "#8a8478"); });
    part(ctx, (c) => {
      ball(c, cx, cy + 0.45, 1.5, 1.45, p.brass || "#b89a50", { hi: 0.55, lo: 0.45 });
      dab(c, cx - 0.6, cy - 1.25, 1.2, 0.55, darken(p.brass || "#b89a50", 0.2));      // the lid's knob
      for (const [dx, dy] of [[-0.75, 0.2], [0.45, 0.05], [-0.15, 1.0], [0.75, 0.95]]) dab(c, cx + dx - 0.2, cy + dy, 0.42, 0.42, p.spore || "#d8e860");
    });
  };

  // the trunk: a slim leather jerkin, skirts split at the hip, the baldric,
  // the belt and what hangs from it
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const sw = st.fight ? (st.hit ? 0.9 : 0.2) : st.c * 0.5;
    const skirt = (pts, col) => blob(c, pts, col, { hi: 0.28, then: (cc) => dab(cc, -4, 1.9, 8, 0.7, darken(col, 0.4)) });
    skirt([[-2.2, -1.0], [0.1, -1.0], [-0.2 - sw * 0.3, 2.6, 1], [-2.5 - sw * 0.6, 2.3, 1]], darken(lea, 0.2));
    skirt([[-0.2, -1.0], [2.1, -1.0], [2.5 + sw, 2.4, 1], [0.1 + sw * 0.4, 2.6, 1]], lea);
    // the Open Contract's contract: a fat parchment roll slung across the
    // back, poking up past the far shoulder, its red seal on a ribbon
    if (p.scroll) {
      part(c, (cc) => {
        tube(cc, -1.2, -0.8, -3.9, -9.3, 1.5, p.scroll);
        dab(cc, -4.5, -9.9, 1.1, 0.7, darken(p.scroll, 0.35));                      // the roll's open end
        line(cc, -2.9, -7.6, -2.3, -5.4, 0.3, darken(p.scroll, 0.35));                // the rolled edge
        line(cc, -2.2, -5.2, -3.0, -5.0, 0.6, "#8a2a2a");                            // the ribbon round it
      });
      part(c, (cc) => ball(cc, -3.3, -4.6, 0.7, 0.7, p.seal || "#b83232", { hi: 0.5, lo: 0.4 }));
    }
    // the sash tail, hanging from the far hip
    blob(c, [[-1.6, -1.4], [-0.6, -1.2], [-1.6 - sw * 0.4, 3.4, 1], [-2.6 - sw * 0.8, 3.2, 1]], darken(sash, 0.1), { hi: 0.3, then: (cc) => line(cc, -1.2, -0.8, -2.0 - sw * 0.6, 3.0, 0.3, darken(sash, 0.4)) });

    const trunk = [[1.7, 0.2], [1.9, -1.8], [2.3, -4.2], [2.4, -5.9], [1.6, -7.0], [0, -7.3], [-1.6, -7.0], [-2.3, -5.8], [-2.2, -3.6], [-1.7, -1.6], [-1.8, 0.2]];
    blob(c, trunk, lea, {
      hi: 0.32, lo: 0.45, then: (cc) => {
        // the jerkin laced up the breast
        line(cc, 1.5, -6.6, 1.6, -2.4, 0.4, darken(lea, 0.45));
        for (const y of [-5.8, -4.8, -3.8, -2.9]) dab(cc, 1.25, y, 0.7, 0.3, lighten(lea, 0.35));
        // the baldric from the near shoulder to the far hip, a buckle on it
        line(cc, 1.9, -7.1, -2.1, -1.8, 1.1, darken(lea, 0.5));
        line(cc, 1.9, -7.4, -2.1, -2.1, 0.3, darken(lea, 0.15));
        if (p.vials) {
          // the poisoner's bandolier: three stoppered vials
          for (const [vx, vy] of [[1.0, -6.3], [0.0, -5.0], [-1.0, -3.7]]) {
            dab(cc, vx - 0.45, vy - 0.4, 0.9, 1.3, darken(p.vials, 0.25));
            dab(cc, vx - 0.45, vy - 0.4, 0.45, 0.9, p.vials);
            dab(cc, vx - 0.3, vy - 0.4, 0.3, 0.3, lighten(p.vials, 0.6));
            dab(cc, vx - 0.35, vy - 0.85, 0.7, 0.45, "#8a6a4a");
          }
        } else dab(cc, 0.1, -4.9, 0.9, 0.9, trim);
        // the sash and the belt over it
        dab(cc, -3, -2.3, 6, 1.3, sash);
        dab(cc, -3, -2.3, 6, 0.4, lighten(sash, 0.3));
        dab(cc, -3, -1.2, 6, 0.7, darken(lea, 0.5));
        dab(cc, 1.1, -1.35, 0.9, 0.95, trim);
      },
    });
    // the pouch at the hip, and a sheathed spare at the small of the back
    if (p.purse) {
      // the sellsword's fat purse, the drawstring tied off, a coin at its lip
      part(c, (cc) => { ball(cc, 0.2, 0.5, 1.25, 1.2, p.purse, { hi: 0.45, lo: 0.45 }); dab(cc, -0.4, -0.9, 1.2, 0.5, darken(p.purse, 0.45)); dab(cc, 0.5, -0.75, 0.7, 0.45, "#f0cc58"); dab(cc, 0.6, -0.75, 0.3, 0.2, "#fff3d2"); });
    } else blob(c, [[-0.6, -0.9], [0.9, -0.9], [1.0, 0.9, 1], [-0.5, 1.0, 1]], darken(lea, 0.1), { hi: 0.35, then: (cc) => { dab(cc, -0.8, -0.9, 2.2, 0.5, darken(lea, 0.4)); dab(cc, 0.1, -0.5, 0.4, 0.4, trim); } });
    if (!p.offhand) blob(c, [[-1.8, -1.9], [-1.3, -1.5], [-3.3, 1.0, 1], [-3.8, 0.6, 1]], "#3a2418", { hi: 0.25, then: (cc) => dab(cc, -2.2, -2.0, 0.7, 0.7, trim) });
  });
  censer();

  // the mantle over the shoulders, the hood's own cloth
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => blob(c, [[-2.4, -8.0], [1.4, -8.2], [2.6, -7.0], [2.2, -5.9, 1], [1.2, -5.2], [-0.4, -5.6], [-2.0, -5.0], [-3.1, -5.9, 1], [-3.0, -7.2]], hood, {
    hi: 0.35, lo: 0.45, then: (cc) => { line(cc, -2.8, -7.6, 1.0, -7.9, 0.45, lighten(hood, 0.4)); dab(cc, -0.6, -6.4, 0.5, 1.0, darken(hood, 0.4)); dab(cc, 1.2, -6.8, 0.5, 0.8, darken(hood, 0.4)); },
  }));

  // the head, carried low and forward, the chin tucked
  const hd = T(0.95, -9.25); hd[0] += st.hit ? 0.5 : 0.2;
  hoodHead(ctx, hd[0], hd[1], st.lean * 0.25 + (st.fight ? 0.05 : 0), p);

  // the dagger hand
  const hn = arm(ctx, shN, H.hn, A, armN);
  // the sellsword's odd steel pauldron, strapped over the leathers
  if (p.pauldron) inFrame(ctx, shN[0], shN[1], st.lean, (c) => blob(c, [[-1.4, 1.1], [0.1, 0.5], [1.6, 1.0], [1.8, 2.3, 1], [0.2, 2.9], [-1.3, 2.5, 1]], p.pauldron, {
    hi: 0.5, lo: 0.45, then: (cc) => { line(cc, -1.3, 1.8, 1.7, 1.6, 0.35, darken(p.pauldron, 0.45)); line(cc, -1.1, 1.1, 1.1, 0.7, 0.35, lighten(p.pauldron, 0.5)); dab(cc, 0.0, 2.1, 0.45, 0.45, p.trim || trim); },
  }));
  const BL = { long: [6.6, 8.2], hanger: [4.6, 5.3], needle: [5.4, 6.4] }[p.blade] || [4.8, 5.4];
  dagger(ctx, hn[0], hn[1], H.an, steel, { len: BL[st.fight ? 1 : 0], trim, venom: p.venom, kind: p.blade });
  fist(ctx, hn[0], hn[1], 0.95, skin);
  ctx.restore();
};

export const COVERT_PAINTERS = { assassin: blade };
