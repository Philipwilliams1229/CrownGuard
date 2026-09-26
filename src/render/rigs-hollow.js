// ============ RIGS: THE HOLLOW COURT'S DEAD (skeleton, bonearcher, ghast, crypt, gravecaller, hollowking) ============
// Bespoke bodies that override the generic entries in rigs.js (same shape:
// { kind, box: { hw, up, down }, p, fly? }); HOLLOW_PAINTERS maps each new
// `kind` to its painter (ctx, p). The pose is p.pose ("walk" | "fight") and
// p.frame (0-3 walk, 0-1 fight), feet at 0,0, facing +x. Frames are baked
// once and inked by rigs.js.
//
// The drowned dead of a sunken kingdom: real skeletons (a skull with a
// hinged jaw and witch-fire in the sockets, a ribcage you can see through,
// bony limbs with knobbed joints), hung with rotten cloth, rusted and
// tarnished metal and drowned weed. The kit is rigs-horde.js's: a hip that
// rides the gait, a torso frame, two-bone legs and arms found by ik.
//
// Colours come only from the params so the necromancer's pale revive and the
// white hit-flash reach everything: skin = bone (or the ghast's dead flesh),
// cloth / cloth2 = rags and robes (the Warden's plate), hair = helm, hood or
// crown, cape, belly = the ghast's gut, mane = drowned weed, eyes = witch-fire,
// wcol / shcol = weapon and shield.

import { lighten, darken, mix, rgba, ball, glow, lin, part, shadow } from "./paint.js";

// ---- the kit (as rigs-horde.js) --------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SUNV = [-0.59, -0.81];
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
const shape = (ctx, pts, col, box, o = {}) => part(ctx, (c) => {
  path(c, pts); c.fillStyle = cel(c, ...box, col, o.hi, o.lo); c.fill();
  if (o.then) { c.save(); path(c, pts); c.clip(); o.then(c); c.restore(); }
});
const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const blob = (ctx, pts, col, o) => shape(ctx, pts, col, bbox(pts), o);
const dab = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const line = (c, x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
const fillPts = (c, pts, col) => { path(c, pts); c.fillStyle = col; c.fill(); };
const tube = (c, x0, y0, x1, y1, w, col) => {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  let nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  if (nx * SUNV[0] + ny * SUNV[1] < 0) { nx = -nx; ny = -ny; }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  c.strokeStyle = lin(c, mx + nx * w / 2, my + ny * w / 2, mx - nx * w / 2, my - ny * w / 2, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.42)]]);
  c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
};
const ik = (ax, ay, bx, by, l1, l2, dir) => {
  const dx = bx - ax, dy = by - ay, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.02);
  const a = Math.atan2(dy, dx), k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const j = a - dir * k;
  return [[ax + Math.cos(j) * l1, ay + Math.sin(j) * l1], [ax + Math.cos(a) * d, ay + Math.sin(a) * d]];
};
const frameAt = (x, y, a) => { const cs = Math.cos(a), sn = Math.sin(a); return (lx, ly) => [x + lx * cs - ly * sn, y + lx * sn + ly * cs]; };
const inFrame = (ctx, x, y, a, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); fn(ctx); ctx.restore(); };
const step = (p, o) => {
  const f = (p.frame || 0) % 4, s = o.stride;
  if (p.pose !== "fight") {
    const c = [1, 0, -1, 0][f];
    return {
      fight: false, f, c,
      near: f === 3 ? [-0.3 * s, -o.lift] : [c * s + (f === 1 ? 0.2 * s : 0), 0],
      far: f === 1 ? [-0.3 * s, -o.lift] : [-c * s + (f === 3 ? 0.2 * s : 0), 0],
      x: 0, bob: f % 2 ? -o.bob : 0, lean: o.lean + (f % 2 ? 0 : o.dip || 0), swing: -c,
    };
  }
  const hit = f === 1;
  return {
    fight: true, f, c: 0, hit,
    near: [hit ? s * 1.1 + o.lunge * 0.8 : s * 0.8, 0], far: [-s * 0.9, 0],
    x: hit ? o.lunge : -0.4, bob: hit ? o.bob * 0.9 : o.bob * 0.3, lean: o.lean + (hit ? 0.2 : -0.14), swing: 0,
  };
};
const skeleton = (p, o) => {
  const st = step(p, o);
  const reach = o.L1 + o.L2, ank = o.ankle ?? 0.9;
  const hipH = Math.min(Math.sqrt(reach * reach - o.stride * o.stride) * 0.96, reach - o.bob - 0.15) + ank;
  const hip = [st.x, -hipH + st.bob];
  return { st, hip, ank, T: frameAt(hip[0], hip[1], st.lean) };
};
const along = (x, y, a) => { const dx = Math.cos(a), dy = Math.sin(a); return (u, v = 0) => [x + dx * u - dy * v, y + dy * u + dx * v]; };
const haft = (c, to, u0, u1, w, col) => { const [x0, y0] = to(u0), [x1, y1] = to(u1); tube(c, x0, y0, x1, y1, w, col); };

// ---- bones -----------------------------------------------------------------------
const gapOf = (b) => darken(b, 0.72);           // the dark in a socket, between ribs

// a bony leg: thigh and shin with a knobbed knee, a long foot of toe bones.
// cols.greave / cols.sabaton armour the shin and foot; cols.rag ties a strip
// of cloth round the thigh
const boneLeg = (ctx, R, o, which, b, cols = {}) => {
  const { st, T, ank } = R;
  const [fx, fy] = st[which];
  const hp = T(which === "near" ? o.hipW : -o.hipW, 0);
  const [kn, an] = ik(hp[0], hp[1], fx, fy - ank, o.L1, o.L2, 1);
  part(ctx, (c) => {
    tube(c, hp[0], hp[1], kn[0], kn[1], o.thigh, b);
    tube(c, kn[0], kn[1], an[0], an[1], o.shin, b);
  });
  if (cols.rag) part(ctx, (c) => { const t0 = 0.2, t1 = 0.5; tube(c, hp[0] + (kn[0] - hp[0]) * t0, hp[1] + (kn[1] - hp[1]) * t0, hp[0] + (kn[0] - hp[0]) * t1, hp[1] + (kn[1] - hp[1]) * t1, o.thigh * 1.7, cols.rag); });
  if (cols.greave) part(ctx, (c) => { const t = 0.18; tube(c, kn[0] + (an[0] - kn[0]) * t, kn[1] + (an[1] - kn[1]) * t, an[0], an[1], o.greaveW || o.shin * 2, cols.greave); line(c, kn[0] + 0.3, kn[1] + 1, an[0] + 0.3, an[1] - 0.2, 0.45, lighten(cols.greave, 0.45)); });
  part(ctx, (c) => ball(c, kn[0] + 0.25, kn[1], o.knee, o.knee * 0.9, cols.kneeCol || b, { hi: 0.45, lo: 0.45 }));
  if (cols.sabaton) {
    const x = an[0], y = an[1] + ank, len = o.foot, h = ank + 0.6;
    part(ctx, (c) => {
      path(c, [[x - len * 0.32, y, 1], [x - len * 0.36, y - h * 0.7], [x - len * 0.05, y - h], [x + len * 0.4, y - h * 0.6], [x + len * 0.72, y - h * 0.1], [x + len * 0.7, y, 1]]);
      c.fillStyle = cel(c, x - len * 0.4, y - h, x + len * 0.7, y, cols.sabaton); c.fill();
      line(c, x + len * 0.1, y - h * 0.8, x + len * 0.3, y - 0.1, 0.4, darken(cols.sabaton, 0.4));
    });
  } else boneFoot(ctx, an[0], an[1] + ank, o.foot, b, ank);
  return { hp, kn, an };
};
const boneFoot = (ctx, x, y, len, b, ank) => part(ctx, (c) => {
  // heel knob, the arch of the foot, toes splayed at the front
  path(c, [[x - 0.9, y, 1], [x - 1.0, y - ank - 0.4], [x - 0.1, y - ank - 0.6], [x + len * 0.45, y - 0.9], [x + len * 0.8, y - 0.55], [x + len * 0.82, y, 1]]);
  c.fillStyle = cel(c, x - 1, y - ank, x + len * 0.8, y, b); c.fill();
  for (let i = 0; i < 2; i++) dab(c, x + len * (0.34 + i * 0.24), y - 0.6, 0.35, 0.6, gapOf(b));
});

// a bony arm: upper arm and forearm with a knobbed elbow; cols.up / fore can
// dress either bone (a sleeve, a vambrace)
const boneArm = (ctx, sh, to, o, b, cols = {}) => {
  const [el, hd] = ik(sh[0], sh[1], to[0], to[1], o.up, o.fore, o.bend ?? -1);
  part(ctx, (c) => {
    tube(c, sh[0], sh[1], el[0], el[1], cols.up ? o.w * (cols.upW || 1.8) : o.w, cols.up || b);
    tube(c, el[0], el[1], hd[0], hd[1], cols.fore ? o.w * (cols.foreW || 1.7) : o.w * 0.85, cols.fore || b);
  });
  if (!cols.noElbow) part(ctx, (c) => ball(c, el[0], el[1], o.w * 0.62, o.w * 0.58, cols.elbow || b, { hi: 0.5, lo: 0.4 }));
  return { el, hd };
};
// a bony hand: knuckles, and long fingers when it claws
const boneHand = (ctx, x, y, r, b, claw = 0) => part(ctx, (c) => {
  ball(c, x, y, r, r * 0.9, b, { hi: 0.4, lo: 0.4 });
  if (claw) for (const a of [-0.9, -0.2, 0.5]) { const ca = a + (claw < 0 ? Math.PI : 0); line(c, x, y, x + Math.cos(ca) * r * 2.2, y + Math.sin(ca) * r * 2.2, r * 0.55, b); }
});

// the skull, in its own frame: (0,0) the middle of the cranium, +x the face.
// A hinged jaw that drops open, sockets full of witch-fire, a nose hole and teeth.
const skull = (ctx, x, y, a, p, o = {}) => inFrame(ctx, x, y, a, (c0) => {
  if (o.k) c0.scale(o.k, o.k);
  const b = p.skin, gap = gapOf(b), eyes = p.eyes || "#7ce0b8";
  const op = o.open || 0;
  // the jaw first, hinged below the ear
  c0.save(); c0.translate(-0.2, 1.3); c0.rotate(op * 0.32);
  blob(c0, [[-0.5, -0.3], [1.2, 0.5], [3.0, 0.5, 1], [3.1, 1.4], [2.3, 2.2], [0.8, 2.0], [-0.4, 0.9]], darken(b, 0.06), {
    hi: 0.2, lo: 0.45, then: (c) => { dab(c, 1.4, 0.2, 1.8, 0.55, lighten(b, 0.15)); for (let i = 0; i < 3; i++) dab(c, 1.8 + i * 0.6, 0.2, 0.25, 0.55, gap); },
  });
  c0.restore();
  if (op > 0.3) { c0.fillStyle = gap; c0.fillRect(1.2, 1.6, 1.8, 0.8 * op); }
  // the cranium, the cheekbone and the upper teeth
  blob(c0, [[-2.4, 0.3], [-2.3, -1.9], [-0.7, -3.0], [1.4, -2.9], [2.8, -1.7], [3.2, -0.3], [3.0, 0.6], [3.3, 1.2], [3.1, 1.9, 1], [0.9, 1.8, 1], [-0.5, 1.9], [-2.0, 1.4]], b, {
    hi: 0.35, lo: 0.42, then: (c) => {
      c.fillStyle = gap;
      c.beginPath(); c.ellipse(1.5, -0.2, 0.95, 1.0, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(3.05, -0.2, 0.42, 0.85, 0, 0, Math.PI * 2); c.fill();
      fillPts(c, [[2.55, 0.5, 1], [3.25, 0.55, 1], [2.9, 1.3, 1]], gap);
      // the cheekbone's shadow, the temple hollow
      dab(c, -0.3, 0.9, 1.3, 0.6, darken(b, 0.3));
      dab(c, -0.9, -0.9, 0.9, 1.1, darken(b, 0.14));
      // upper teeth
      dab(c, 1.2, 1.3, 2.0, 0.6, lighten(b, 0.2));
      for (let i = 0; i < 3; i++) dab(c, 1.6 + i * 0.6, 1.3, 0.25, 0.6, gap);
      if (o.crack) { line(c, -0.9, -3.0, -0.2, -1.8, 0.35, darken(b, 0.5)); line(c, -0.2, -1.8, 0.4, -1.4, 0.3, darken(b, 0.5)); }
    },
  });
  // witch-fire in the sockets
  dab(c0, 1.2, -0.5, 0.7, 0.7, eyes); dab(c0, 1.3, -0.4, 0.35, 0.35, lighten(eyes, 0.7)); dab(c0, 2.9, -0.5, 0.4, 0.7, eyes);
  glow(c0, 1.9, -0.3, o.glow || 2.6, eyes, 0.4);
});

// a ribcage in the torso frame: a bony barrel with dark gaps between the ribs,
// the spine up its back and the breastbone down its front. `heart` puts
// witch-fire inside it
const ribcage = (c, b, o = {}) => {
  const s = o.s || 1, gap = gapOf(b);
  const pts = [[-1.6, -2.8], [-2.3, -4.8], [-2.1, -6.8], [-0.7, -7.8], [1.2, -7.7], [2.4, -6.7], [2.8, -5.0], [2.4, -3.4], [1.0, -2.6]].map(([x, y]) => [x * s, y * s]);
  blob(c, pts, b, {
    hi: 0.3, lo: 0.42, then: (cc) => {
      cc.save(); cc.scale(s, s);
      for (let i = 0; i < 3; i++) {
        const y = -6.7 + i * 1.4;
        cc.strokeStyle = gap; cc.lineWidth = 0.75; cc.lineCap = "butt";
        cc.beginPath(); cc.moveTo(-1.3, y - 0.2); cc.quadraticCurveTo(0.6, y - 0.1, 2.5, y + 0.8); cc.stroke();
        if (o.heart) { cc.strokeStyle = o.heart; cc.lineWidth = 0.3; cc.beginPath(); cc.moveTo(-0.4, y - 0.15); cc.quadraticCurveTo(0.6, y - 0.05, 1.6, y + 0.35); cc.stroke(); }
      }
      // the spine up the back, the breastbone down the front
      line(cc, -1.7, -7.6, -1.5, -2.6, 0.8, darken(b, 0.3));
      for (let i = 0; i < 4; i++) dab(cc, -2.0, -7.2 + i * 1.2, 0.5, 0.3, darken(b, 0.5));
      line(cc, 2.25, -7.0, 2.15, -4.6, 0.55, lighten(b, 0.35));
      cc.restore();
    },
  });
  // a knobbed spine below the ribs, down to the pelvis
  part(c, (cc) => {
    tube(cc, -0.6 * s, -2.8 * s, -0.4 * s, -0.6 * s, 0.9 * s, b);
    for (let i = 0; i < 2; i++) dab(cc, -1.0 * s, (-2.2 + i * 0.8) * s, 1.0 * s, 0.3, gap);
  });
};
// the pelvis: a bony bowl at the hip with its dark hollow
const pelvis = (c, b, s = 1) => blob(c, [[-2.1, -0.4], [-1.3, -1.5], [1.1, -1.4], [2.2, -0.7], [1.9, 0.6], [0.8, 1.1], [-0.7, 1.0], [-1.8, 0.4]].map(([x, y]) => [x * s, y * s]), b, {
  hi: 0.3, then: (cc) => { cc.fillStyle = gapOf(b); cc.beginPath(); cc.ellipse(0.3 * s, 0.1 * s, 0.8 * s, 0.55 * s, 0, 0, Math.PI * 2); cc.fill(); },
});

// ragged cloth hanging from a top edge: [x0, x1] at y0 down to a torn hem
const rag = (c, x0, x1, y0, hem, col, sw = 0, o = {}) => {
  const n = o.n || 4, pts = [[x0, y0], [x1, y0]];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x1 + (x0 - x1) * t + sw * (1 - t * 0.5);
    pts.push([x, hem + (i % 2 ? -1.1 : 0.2) + (o.jag ? Math.sin(i * 2.3) * 0.5 : 0), 1]);
  }
  blob(c, pts, col, { hi: 0.25, lo: 0.4, then: o.then });
};
// a strand of drowned weed, hanging: drawn straight onto the sprite (no ink of its own)
const weed = (c, x, y, len, col, sw = 0, w = 0.75) => {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round";
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 0.9 + sw * 0.5, y + len * 0.5, x + sw, y + len); c.stroke();
  c.fillStyle = lighten(col, 0.3); c.fillRect(x + 0.2 + sw * 0.3, y + len * 0.3, 0.5, 0.5);
  c.fillStyle = darken(col, 0.3); c.fillRect(x + 0.4 + sw * 0.6, y + len * 0.7, 0.5, 0.5);
};

// ---- arms ------------------------------------------------------------------------
// the Risen's notched sword: a rusted blade with bites out of its edge
const notchedSword = (ctx, x, y, a, col, len = 7.2) => part(ctx, (c) => {
  const to = along(x, y, a), rust = mix(col, "#8a4a2a", 0.55);
  haft(c, to, -1.5, 0.5, 1.0, "#4a3a30");
  line(c, ...to(0.7, -1.5), ...to(0.7, 1.5), 0.9, darken(col, 0.3));
  const pts = [[...to(1.0, -0.7), 1], [...to(len - 1.2, -0.7), 1], [...to(len, 0), 1], [...to(len - 1.0, 0.7), 1],
    [...to(len * 0.66, 0.7), 1], [...to(len * 0.6, 0.1), 1], [...to(len * 0.54, 0.7), 1], [...to(len * 0.36, 0.7), 1], [...to(len * 0.32, 0.25), 1], [...to(len * 0.27, 0.7), 1], [...to(1.0, 0.7), 1]];
  path(c, pts); c.fillStyle = col; c.fill();
  path(c, [[...to(1.0, -0.7), 1], [...to(len - 1.2, -0.7), 1], [...to(len, 0), 1], [...to(1.0, -0.1), 1]]); c.fillStyle = lighten(col, 0.4); c.fill();
  for (const [u, v] of [[len * 0.45, -0.3], [len * 0.72, 0.2], [2.0, 0.2]]) dab(c, ...to(u, v), 0.6, 0.5, rust);
});
// a round shield with a wedge broken out of it: planks, a rusted rim, the boss
const brokenShield = (ctx, x, y, rx, ry, col) => part(ctx, (c) => {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = -0.55 + (i / 14) * (Math.PI * 2 - 1.3);
    pts.push([x + Math.cos(t) * rx, y + Math.sin(t) * ry, 1]);
  }
  // the break: jagged back in toward the boss
  pts.push([x + rx * 0.55, y - ry * 0.55, 1], [x + rx * 0.4, y - ry * 0.2, 1], [x + rx * 0.75, y - ry * 0.05, 1], [x + rx * 0.5, y + ry * 0.2, 1]);
  path(c, pts); c.fillStyle = cel(c, x - rx, y - ry, x + rx, y + ry, col, 0.3, 0.45); c.fill();
  c.save(); path(c, pts); c.clip();
  for (const kx of [-0.36, 0.3]) line(c, x + rx * kx, y - ry, x + rx * kx + 0.2, y + ry, 0.45, darken(col, 0.5));
  c.strokeStyle = "#7a5a44"; c.lineWidth = 0.7; c.beginPath(); c.ellipse(x, y, rx - 0.3, ry - 0.3, 0, 0, Math.PI * 2); c.stroke();
  c.restore();
  ball(c, x - 0.1, y + 0.1, 0.9, 1.0, "#8a6a52", { hi: 0.45, lo: 0.4 });
});
// the longbow: limbs along `a` from the grip, bowed toward +v; the string
// runs tip to tip, through `nock` when drawn
const bow = (ctx, x, y, a, wood, nock, lim = 6.6) => {
  const to = along(x, y, a);
  const t0 = to(-lim, -1.9), t1 = to(lim, -1.9);
  part(ctx, (c) => {
    c.strokeStyle = cel(c, ...to(-lim, 0), ...to(lim, 0), wood, 0.35, 0.4); c.lineWidth = 1.05; c.lineCap = "round";
    c.beginPath(); c.moveTo(...t0); c.quadraticCurveTo(...to(0, 2.2), ...t1); c.stroke();
    tube(c, ...to(-0.9, 0.35), ...to(0.9, 0.35), 1.3, "#3a2c26");
  });
  ctx.strokeStyle = "#c8c0a8"; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(...t0); if (nock) ctx.lineTo(...nock); ctx.lineTo(...t1); ctx.stroke();
};
// a black arrow: a dark shaft, black fletching, a bone head
const blackArrow = (ctx, x0, y0, x1, y1, head) => part(ctx, (c) => {
  line(c, x0, y0, x1, y1, 0.55, "#3a3440");
  const a = Math.atan2(y1 - y0, x1 - x0), to = along(x1, y1, a), tb = along(x0, y0, a);
  fillPts(c, [[...to(-0.2, -0.7), 1], [...to(1.6, 0), 1], [...to(-0.2, 0.7), 1]], head);
  fillPts(c, [[...tb(0.2, 0), 1], [...tb(1.8, -0.8), 1], [...tb(2.3, 0), 1], [...tb(1.8, 0.8), 1]], "#1e1a24");
});

// ---- the Risen and the Barrow Archer --------------------------------------------
const SK = { L1: 4.7, L2: 4.5, stride: 2.2, lift: 1.8, bob: 0.6, lean: 0.1, dip: 0.05, lunge: 2.1, hipW: 0.8, thigh: 1.3, shin: 1.1, foot: 2.7, ankle: 0.7, knee: 0.85 };
const risen = (ctx, p) => {
  const k = (p.h ?? 22) / 22; ctx.save(); ctx.scale(k, k);
  const o = SK, R = skeleton(p, o), { st, T } = R;
  const b = p.skin, bF = darken(b, 0.28), archer = p.look === "archer";
  const weedC = p.mane || "#4e6a48", rot = p.cloth, rot2 = p.cloth2 || darken(p.cloth, 0.4);
  shadow(ctx, 0.4, -0.1, 4.6, 1.2, 0.22);
  const shN = T(1.0, -6.9), shF = T(-1.0, -7.1);
  const A = { up: 3.0, fore: 2.9, w: 1.05 };
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy], F = (dx, dy) => [shF[0] + dx, shF[1] + dy];
  const ph = !st.fight ? 0 : st.hit ? 2 : 1;
  let H;
  if (archer) H = [
    { hn: N(0.6 + sw * 1.0, 4.9), hf: F(3.4 - sw * 0.3, 4.2), ab: -1.42 },
    { hn: N(-0.6, -0.4), hf: F(5.8, -0.2), ab: -Math.PI / 2 + 0.06, nock: true },
    { hn: N(-2.4, 0.8), hf: F(5.8, -0.2), ab: -Math.PI / 2 + 0.06 }][ph];
  else H = [
    { hn: N(1.6 + sw * 0.8, 4.9), an: 0.95 - sw * 0.1, hf: F(3.9, 5.0) },
    { hn: N(-1.4, -3.2), an: -2.4, hf: F(4.6, 3.6) },
    { hn: N(4.4, 2.0), an: 0.42, hf: F(3.0, 5.0) }][ph];

  // behind everything: the archer's quiver of black arrows, the back of his cloak
  if (archer) inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    for (const dx of [-0.6, 0.3, 1.1]) blob(c, [[-2.4 + dx, -8.4], [-1.9 + dx, -10.6, 1], [-1.4 + dx, -8.4]], "#1e1a24", { hi: 0.2 });
    blob(c, [[-1.6, -8.9, 1], [0.1, -8.4, 1], [-2.6, -1.8, 1], [-4.2, -2.4, 1]], rot2, { hi: 0.3, then: (cc) => { dab(cc, -4, -7.6, 5, 0.6, darken(rot2, 0.4)); dab(cc, -4, -3.8, 5, 0.6, darken(rot2, 0.4)); } });
  });
  // the far arm (the shield arm, or the bow arm)
  const far = boneArm(ctx, shF, H.hf, A, bF, archer ? { up: darken(rot, 0.28), upW: 1.6 } : {});
  // legs of bare bone, a rag knotted round the near thigh
  boneLeg(ctx, R, o, "far", bF);
  boneLeg(ctx, R, o, "near", b, archer ? { rag: rot } : {});
  // the trunk: pelvis, spine, ribcage; a baldric, a rotten tabard skirt, weed
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const kick = st.fight ? (st.hit ? 0.8 : -0.2) : st.c * 0.6;
    rag(c, -2.4, 0.2, -1.2, 2.6, darken(rot, 0.3), -kick * 0.6);
    pelvis(c, b);
    ribcage(c, b);
    if (!archer) {
      // the baldric crossing the ribs, a scrap of the old tabard over it
      part(c, (cc) => { line(cc, 2.0, -7.6, -1.6, -1.6, 0.9, "#4a3a30"); dab(cc, -0.1, -4.9, 0.7, 0.7, "#8a6a52"); });
      rag(c, 0.2, 2.6, -1.4, 3.0, rot, kick, { n: 3, then: (cc) => { dab(cc, -1, -1.3, 5, 0.7, rot2); dab(cc, 1.0, 0.4, 0.6, 0.6, darken(rot, 0.4)); } });
      weed(c, 1.8, -7.6, 3.0, weedC, -0.5, 0.6);
      weed(c, -1.9, -7.4, 3.6, weedC, 0.3, 0.6);
    } else {
      // a loin rag and the ragged capelet over the shoulders
      rag(c, -0.6, 2.6, -1.2, 2.4, rot, kick);
      blob(c, [[-2.9, -5.0, 1], [-3.0, -7.4], [-1.2, -8.8], [1.4, -8.6], [2.7, -7.6], [2.9, -5.8, 1], [2.1, -6.2, 1], [1.4, -5.0, 1], [0.5, -6.0, 1], [-0.6, -4.6, 1], [-1.6, -5.6, 1]], rot, {
        hi: 0.3, lo: 0.45, then: (cc) => { line(cc, -1.6, -8.4, -2.2, -5.4, 0.45, darken(rot, 0.4)); line(cc, 0.8, -8.6, 0.6, -6.2, 0.45, darken(rot, 0.4)); },
      });
      weed(c, 2.2, -6.2, 3.0, weedC, 0.4);
    }
  });
  // the neck bones, the skull (a rusted open helm, or the archer's hood)
  const nk = T(0.9, -7.6), hd = [nk[0] + 0.9 + (st.hit ? 0.5 : 0), nk[1] - 2.3];
  part(ctx, (c) => tube(c, nk[0] - 0.2, nk[1] + 0.2, hd[0] - 0.5, hd[1] + 1.8, 0.9, bF));
  const ha = st.lean * 0.3 + (st.fight && !st.hit && !archer ? -0.12 : 0);
  if (archer) {
    hood(ctx, hd[0], hd[1], ha, p, 0.9, "back");
    skull(ctx, hd[0], hd[1], ha, p, { k: 0.88, open: st.hit ? 0.6 : 0 });
    hood(ctx, hd[0], hd[1], ha, p, 0.9, "front");
  } else {
    skull(ctx, hd[0], hd[1], ha, p, { k: 1.0, open: st.fight && !st.hit ? 1 : 0.25, crack: true });
    openHelm(ctx, hd[0], hd[1], ha, p.hair || "#7a5a44", 0.95);
  }
  // the near arm and what it holds
  if (archer) {
    const to = along(far.hd[0], far.hd[1], H.ab);
    if (st.fight) {
      const hn = ik(shN[0], shN[1], H.hn[0], H.hn[1], A.up, A.fore, -1)[1];
      bow(ctx, far.hd[0], far.hd[1], H.ab, p.wcol || "#7a5a34", H.nock ? hn : null);
      boneHand(ctx, far.hd[0], far.hd[1], 0.75, bF);
      if (H.nock) blackArrow(ctx, hn[0], hn[1], ...to(0, 3.6), b);
      else { ctx.fillStyle = rgba(p.eyes || "#7ce0b8", 0.8); for (let i = 0; i < 3; i++) ctx.fillRect(far.hd[0] + 3.6 + i * 1.6, far.hd[1] - 0.2, 1.0, 0.45); }
      const h = boneArm(ctx, shN, hn, A, b);
      boneHand(ctx, h.hd[0], h.hd[1], 0.75, b, H.nock ? 0 : 1);
    } else {
      bow(ctx, far.hd[0], far.hd[1], H.ab, p.wcol || "#7a5a34");
      boneHand(ctx, far.hd[0], far.hd[1], 0.75, bF);
      const h = boneArm(ctx, shN, H.hn, A, b);
      boneHand(ctx, h.hd[0], h.hd[1], 0.72, b);
    }
  } else {
    brokenShield(ctx, far.hd[0] + 0.7, far.hd[1] + 0.2, 2.3, 2.9, p.shcol || "#6a5238");
    const h = boneArm(ctx, shN, H.hn, A, b);
    notchedSword(ctx, h.hd[0], h.hd[1], H.an, p.wcol || "#9a968a");
    boneHand(ctx, h.hd[0], h.hd[1], 0.8, b);
  }
  ctx.restore();
};
// a rusted open helm: a riveted dome with a brim band and a nasal bar
const openHelm = (ctx, x, y, a, col, k = 1) => inFrame(ctx, x, y, a, (c0) => {
  c0.scale(k, k);
  const rust = mix(col, "#a0582e", 0.6);
  blob(c0, [[-2.9, -0.9, 1], [-2.7, -2.6], [-1.2, -3.9], [1.2, -3.9], [2.7, -2.8], [3.3, -1.7, 1], [1.2, -2.0], [-0.8, -1.7]], col, {
    hi: 0.4, lo: 0.45, then: (c) => {
      dab(c, -3, -2.3, 6.6, 0.7, darken(col, 0.3));
      for (const rx of [-1.9, -0.2, 1.6]) dab(c, rx, -2.3, 0.5, 0.5, lighten(col, 0.45));
      dab(c, 0.4, -3.4, 0.6, 1.4, rust); dab(c, -1.6, -2.6, 0.5, 1.2, rust);
      line(c, -0.2, -3.6, 0.2, -1.6, 0.4, lighten(col, 0.5));
    },
  });
  blob(c0, [[2.6, -2.0, 1], [3.3, -1.9, 1], [3.4, 0.3, 1], [2.9, 0.4, 1]], col, { hi: 0.35 });
});
// the archer's hood: a back half behind the skull, a cowl front around the face
const hood = (ctx, x, y, a, p, k, half) => inFrame(ctx, x, y, a, (c0) => {
  c0.scale(k, k);
  const col = p.hair || "#3e4a44";
  if (half === "back") {
    blob(c0, [[-3.4, 2.6, 1], [-3.6, -0.6], [-2.8, -3.3], [-0.4, -4.2], [2.0, -3.8], [3.4, -2.2], [3.6, 0.4], [2.6, 2.6, 1]], darken(col, 0.45), { hi: 0.1, lo: 0.3 });
  } else {
    blob(c0, [[-3.2, 3.0, 1], [-3.5, -0.4], [-2.8, -3.2], [-0.4, -4.3], [2.0, -3.9], [3.5, -2.4], [3.8, -0.8, 1], [2.4, -2.2], [0.6, -2.4], [-0.4, -1.4], [-0.7, 1.0], [0.1, 3.2, 1]], col, {
      hi: 0.3, lo: 0.42, then: (c) => { line(c, -2.4, -2.6, -1.6, 2.4, 0.45, darken(col, 0.4)); dab(c, 0.4, -2.6, 2.6, 0.5, lighten(col, 0.2)); },
    });
  }
});

// ---- the Plague Ghast --------------------------------------------------------------
// a bloated drowned corpse, stooped under its own swollen gut, glowing sores
// all over it that promise the burst
const GH = { L1: 4.8, L2: 4.4, stride: 1.9, lift: 1.3, bob: 0.9, lean: 0.3, dip: 0.08, lunge: 2.0, hipW: 1.5, thigh: 3.0, shin: 2.5, foot: 3.4, ankle: 0.9 };
const sore = (c, x, y, r, skin, glowC) => {
  ball(c, x, y, r * 1.3, r * 1.2, mix(darken(skin, 0.3), "#8a5a3a", 0.3), { hi: 0.2, lo: 0.3 });
  ball(c, x, y - r * 0.1, r * 0.8, r * 0.75, glowC, { hi: 0.7, lo: 0.25 });
};
const ghast = (ctx, p) => {
  const k = (p.h ?? 26) / 26; ctx.save(); ctx.scale(k, k);
  const o = GH, R = skeleton(p, o), { st, T } = R;
  const skin = p.skin, skinF = darken(skin, 0.26), gut = p.belly || mix(skin, "#e0dcb0", 0.35), pus = p.eyes || "#d8e860";
  const bruise = mix(skin, "#5a4a78", 0.45), weedC = p.mane || "#4e6a48";
  shadow(ctx, 0.8, -0.1, 7.0, 1.7, 0.26);
  const shN = T(2.6, -9.4), shF = T(-1.4, -10.0);
  const A = { up: 4.0, fore: 3.8, w: 2.4 };
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy], F = (dx, dy) => [shF[0] + dx, shF[1] + dy];
  const H = [
    { hn: N(1.6 + sw * 0.8, 7.4), hf: F(1.2 - sw * 1.0, 7.6) },
    { hn: N(0.6, -4.2), hf: F(2.8, -4.0) },
    { hn: N(5.4, 3.6), hf: F(5.8, 3.2) }][!st.fight ? 0 : st.hit ? 2 : 1];
  // the far arm, dangling or raised
  { const a = boneArm(ctx, shF, H.hf, A, skinF, { up: skinF, fore: skinF, upW: 1.05, foreW: 0.9, noElbow: true }); boneHand(ctx, a.hd[0], a.hd[1], 1.2, skinF, st.fight ? 1 : 0.5); }
  boneLeg(ctx, R, o, "far", skinF, { kneeCol: skinF });
  boneLeg(ctx, R, o, "near", skin, { rag: p.cloth });
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    // a torn strip of shroud down the back
    blob(c, [[-4.8, -8.4], [-2.4, -11.2], [0.2, -11.0], [-2.6, -8.0], [-3.6, -2.6, 1], [-4.4, -1.0, 1], [-5.4, -2.6, 1]], darken(p.cloth, 0.2), { hi: 0.2, lo: 0.4 });
    // the swollen body: a hunched back and a great distended gut
    blob(c, [[-3.0, 1.4], [-4.2, -2.0], [-4.8, -6.0], [-4.0, -9.4], [-1.8, -11.2], [1.4, -11.0], [3.6, -9.6], [4.4, -7.4], [5.8, -5.2], [6.4, -2.2], [5.4, 0.8], [2.6, 2.1], [-0.4, 2.2]], skin, {
      hi: 0.28, lo: 0.45, then: (cc) => {
        ball(cc, 3.0, -2.6, 3.8, 3.9, gut, { hi: 0.35, lo: 0.35 });
        // the sheen of stretched skin, veins, drowned bruising
        dab(cc, 1.4, -5.4, 1.2, 0.5, lighten(gut, 0.5));
        cc.strokeStyle = bruise; cc.lineWidth = 0.4;
        cc.beginPath(); cc.moveTo(0.6, -4.2); cc.quadraticCurveTo(2.2, -3.2, 2.0, -1.0); cc.stroke();
        cc.beginPath(); cc.moveTo(4.8, -4.8); cc.quadraticCurveTo(4.0, -2.8, 5.2, -1.2); cc.stroke();
        for (const [bx, by, bw, bh] of [[-3.6, -6.4, 1.6, 1.1], [-1.0, -9.8, 1.3, 0.8], [-4.2, -3.0, 1.0, 1.6], [3.0, -9.0, 1.2, 0.8]]) dab(cc, bx, by, bw, bh, bruise);
        dab(cc, -1.6, 0.9, 5.4, 1.2, darken(skin, 0.35));
      },
    });
    // the sores: a crust of rot round each, sick light inside
    part(c, (cc) => { for (const [x, y, r] of [[-2.6, -7.4, 1.0], [0.6, -9.2, 0.8], [4.4, -3.6, 1.1], [1.6, -0.8, 0.8], [-3.2, -3.4, 0.75], [2.4, -5.4, 0.6]]) sore(cc, x, y, r, skin, pus); });
    // a loincloth of shroud, weed slung over the shoulder
    const kick = st.fight ? (st.hit ? 0.8 : -0.2) : st.c * 0.5;
    rag(c, -3.8, 5.0, 0.4, 4.2, p.cloth, kick, { n: 6, then: (cc) => dab(cc, -4, 0.2, 9.4, 0.9, p.cloth2 || darken(p.cloth, 0.4)) });
    weed(c, -1.8, -11.0, 5.4, weedC, -0.6, 0.9);
    weed(c, 0.4, -10.9, 3.4, weedC, 0.4, 0.8);
  });
  // their sick glow, over the body
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => { for (const [x, y, r] of [[-2.6, -7.4, 2.6], [4.4, -3.6, 3.0], [1.6, -0.8, 2.2]]) glow(c, x, y, r, pus, 0.35); });
  // the head, slung low and forward: swollen, bald, jaw hanging
  const hd = T(5.0, -10.6);
  ghastHead(ctx, hd[0] + (st.hit ? 0.6 : 0), hd[1] + (st.hit ? 0.6 : 0), st.lean * 0.2, p, st.fight && !st.hit, 1.1);
  { const a = boneArm(ctx, shN, H.hn, A, skin, { up: skin, fore: skin, upW: 1.05, foreW: 0.9, noElbow: true }); boneHand(ctx, a.hd[0], a.hd[1], 1.3, skin, st.fight ? 1 : 0.5); }
  // a sore on the near arm
  part(ctx, (c) => sore(c, shN[0] + 0.6, shN[1] + 1.4, 0.7, skin, pus));
  ctx.restore();
};
const ghastHead = (ctx, x, y, a, p, roar, k = 1) => inFrame(ctx, x, y, a, (c0) => {
  c0.scale(k, k);
  const skin = p.skin, eyes = p.eyes || "#d8e860";
  blob(c0, [[-2.6, 0.4], [-2.4, -2.2], [-0.4, -3.4], [2.0, -3.2], [3.4, -1.8], [3.8, 0.4], [3.6, 2.2], [2.4, 3.6], [0.4, 3.4], [-1.8, 2.2]], skin, {
    hi: 0.3, lo: 0.45, then: (c) => {
      // sunken sockets, the pale sick eyes, a slack jaw hanging open
      c.fillStyle = darken(skin, 0.5); c.beginPath(); c.ellipse(1.9, -0.6, 1.0, 0.9, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(3.4, -0.6, 0.45, 0.8, 0, 0, Math.PI * 2); c.fill();
      dab(c, 1.6, -0.9, 0.6, 0.6, eyes); dab(c, 3.3, -0.9, 0.35, 0.6, eyes);
      path(c, [[1.6, 1.4, 1], [3.9, 1.2, 1], [3.8, roar ? 3.6 : 2.8, 1], [2.0, roar ? 3.4 : 2.6, 1]]); c.fillStyle = "#2a1a24"; c.fill();
      dab(c, 2.2, 1.4, 1.2, 0.4, "#c8c0a0");
      dab(c, -1.4, -2.6, 1.4, 1.0, mix(skin, "#5a4a78", 0.45));
      dab(c, -0.6, 1.8, 1.4, 0.8, darken(skin, 0.3));
    },
  });
  // lank wet hair
  for (const [hx, l] of [[-1.4, 3.4], [-0.4, 2.6], [-2.2, 2.2]]) { c0.strokeStyle = p.hair || "#3a3a30"; c0.lineWidth = 0.6; c0.beginPath(); c0.moveTo(hx, -2.8); c0.quadraticCurveTo(hx - 1.2, -1.4, hx - 1.0, -2.8 + l); c0.stroke(); }
  glow(c0, 2.2, -0.6, 2.2, eyes, 0.3);
});

// ---- the Crypt Warden --------------------------------------------------------------
// a huge skeleton in tarnished plate, its own sarcophagus lid for a shield
// and a flanged mace on its shoulder
const CW = { L1: 5.6, L2: 5.4, stride: 2.5, lift: 1.8, bob: 0.9, lean: 0.06, dip: 0.04, lunge: 2.4, hipW: 1.5, thigh: 1.8, shin: 1.5, greaveW: 2.9, foot: 4.2, ankle: 1.0, knee: 1.3 };
const crypt = (ctx, p) => {
  const k = (p.h ?? 30) / 30; ctx.save(); ctx.scale(k, k);
  const o = CW, R = skeleton(p, o), { st, T } = R;
  const b = p.skin, bF = darken(b, 0.28), steel = p.cloth, rot = p.cloth2 || "#4a3a5e", bronze = p.hair || "#8a7a4a";
  const steelF = darken(steel, 0.25), verd = mix(steel, "#5a9a80", 0.5), weedC = p.mane || "#4e6a48";
  shadow(ctx, 0.8, -0.1, 7.6, 1.9, 0.26);
  const shN = T(2.2, -9.6), shF = T(-2.4, -9.8);
  const A = { up: 4.0, fore: 3.8, w: 1.4 };
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy], F = (dx, dy) => [shF[0] + dx, shF[1] + dy];
  const H = [
    { hn: N(2.6 + sw * 0.3, 3.6), an: -2.25 + sw * 0.04, hf: F(6.0, 5.2) },
    { hn: N(-1.2, -3.8), an: -2.6, hf: F(6.2, 4.6) },
    { hn: N(5.0, 2.8), an: 0.55, hf: F(5.2, 5.8) }][!st.fight ? 0 : st.hit ? 2 : 1];
  // the far shoulder's lames, the lid arm, behind
  lames(ctx, shF[0] - 0.4, shF[1] - 0.3, 2.3, steelF);
  const far = boneArm(ctx, shF, H.hf, A, bF, { fore: steelF, foreW: 1.6 });
  boneLeg(ctx, R, o, "far", bF, { greave: steelF, sabaton: darken(steelF, 0.1), kneeCol: steelF });
  boneLeg(ctx, R, o, "near", b, { greave: steel, sabaton: darken(steel, 0.1), kneeCol: steel });
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const kick = st.fight ? (st.hit ? 0.8 : -0.2) : st.c * 0.5;
    // skirt of lames, a rotten tabard strip down the front
    blob(c, [[-4.2, -0.8], [4.0, -0.8], [4.4 + kick * 0.4, 3.4, 1], [2.6, 3.9, 1], [1.2, 3.2, 1], [-0.2, 4.0, 1], [-1.6, 3.2, 1], [-3.0, 3.8, 1], [-4.4, 2.8, 1]], steelF, {
      then: (cc) => { for (const y of [0.6, 2.0]) line(cc, -5, y, 5, y + 0.1, 0.45, darken(steel, 0.5)); for (const x of [-2.4, 0.6, 3.0]) dab(cc, x, 0.0, 0.5, 0.5, bronze); },
    });
    // the breastplate, stove in over the heart: dark ribs and witch-fire behind
    const trunk = [[2.8, 0.2], [3.2, -2.6], [4.4, -6.0], [5.0, -8.8], [3.8, -10.6], [0.6, -11.2], [-2.6, -11.0], [-4.8, -9.6], [-4.6, -6.4], [-3.2, -2.6], [-2.8, 0.2]];
    blob(c, trunk, steel, {
      hi: 0.35, lo: 0.45, then: (cc) => {
        line(cc, 1.6, -10.2, 2.0, -3.6, 0.7, lighten(steel, 0.45));
        // the hole
        const hole = [[0.4, -7.8, 1], [2.2, -8.4, 1], [3.6, -7.2, 1], [3.2, -5.4, 1], [2.4, -4.6, 1], [0.8, -5.0, 1], [0.2, -6.4, 1]];
        fillPts(cc, hole, gapOf(b));
        cc.save(); path(cc, hole); cc.clip();
        for (let i = 0; i < 3; i++) line(cc, 0, -7.5 + i * 1.1, 4, -6.8 + i * 1.1, 0.5, darken(b, 0.2));
        dab(cc, 1.4, -6.8, 1.0, 0.8, p.eyes || "#7ce0b8");
        cc.restore();
        // tarnish and verdigris, bronze rivets, a dent
        for (const [x, y, w, h] of [[-3.6, -7.8, 1.4, 0.8], [-2.4, -4.0, 1.0, 1.2], [3.4, -3.4, 0.8, 1.0], [-1.0, -9.8, 1.2, 0.6]]) dab(cc, x, y, w, h, verd);
        for (const [x, y] of [[-3.6, -9.0], [3.4, -9.2], [-4.0, -3.8], [3.8, -2.4]]) dab(cc, x, y, 0.55, 0.55, bronze);
        dab(cc, -5, -1.4, 10.4, 1.5, darken(steel, 0.5));
        dab(cc, 1.8, -1.5, 1.4, 1.7, bronze);
      },
    });
    glow(c, 2.0, -6.4, 3.0, p.eyes || "#7ce0b8", 0.3);
    rag(c, 0.4, 3.2, -1.2, 5.6, rot, kick, { n: 3 });
    weed(c, -3.2, -10.2, 6.4, weedC, -0.6, 0.9);
    weed(c, 3.6, -9.6, 3.6, weedC, 0.4, 0.8);
  });
  // the skull in an open bascinet
  const nk = T(1.4, -10.4), hd = [nk[0] + 1.2 + (st.hit ? 0.5 : 0), nk[1] - 2.4];
  const ha = st.lean * 0.3;
  skull(ctx, hd[0], hd[1], ha, p, { k: 1.15, open: st.fight && !st.hit ? 1 : 0.2 });
  bascinet(ctx, hd[0], hd[1], ha, steel, bronze, 1.15);
  // the sarcophagus lid on the far arm
  lid(ctx, far.hd[0] + 1.5, far.hd[1] + 2.2, p.shcol || "#a39a86", weedC);
  { part(ctx, (c) => ball(c, far.hd[0], far.hd[1], 1.2, 1.1, steelF, { hi: 0.4, lo: 0.4 })); }
  // the mace arm
  const h = boneArm(ctx, shN, H.hn, A, b, { fore: steel, foreW: 1.6 });
  flangedMace(ctx, h.hd[0], h.hd[1], H.an, p.wcol || "#6c7280");
  part(ctx, (c) => ball(c, h.hd[0], h.hd[1], 1.3, 1.2, steel, { hi: 0.45, lo: 0.4 }));
  lames(ctx, shN[0] - 0.7, shN[1] - 0.2, 2.4, steel);
  ctx.restore();
};
// a shoulder of overlapping lames, lower and flatter than a helm so the two never rhyme
const lames = (ctx, x, y, r, col) => part(ctx, (c) => {
  const pts = [[x - r, y + r * 0.9, 1], [x - r * 1.05, y - r * 0.1], [x - r * 0.3, y - r * 0.7], [x + r * 0.7, y - r * 0.5], [x + r * 1.1, y + r * 0.2], [x + r * 0.9, y + r * 0.9, 1]];
  path(c, pts); c.fillStyle = cel(c, x - r, y - r, x + r, y + r, col, 0.45, 0.45); c.fill();
  c.save(); path(c, pts); c.clip();
  for (const t of [0.05, 0.5]) line(c, x - r * 1.1, y + r * t, x + r * 1.1, y + r * (t + 0.15), 0.45, darken(col, 0.5));
  dab(c, x - r * 0.4, y - r * 0.5, r * 0.8, 0.4, lighten(col, 0.5));
  c.restore();
});
const pauldron = (ctx, x, y, r, col, trim) => part(ctx, (c) => {
  const pts = [[x - r, y + r * 0.6, 1], [x - r * 0.95, y - r * 0.4], [x - r * 0.1, y - r * 0.95], [x + r * 0.85, y - r * 0.5], [x + r * 1.05, y + r * 0.6, 1]];
  path(c, pts); c.fillStyle = cel(c, x - r, y - r, x + r, y + r, col, 0.5, 0.42); c.fill();
  line(c, x - r * 0.95, y + r * 0.2, x + r, y + r * 0.3, 0.6, trim);
  dab(c, x - 0.3, y - r * 0.55, 0.55, 0.55, lighten(col, 0.6));
});
// the bascinet: a rounded helm with the face left open, a crest spike
const bascinet = (ctx, x, y, a, col, trim, k = 1) => inFrame(ctx, x, y, a, (c0) => {
  c0.scale(k, k);
  blob(c0, [[-3.2, 3.0, 1], [-3.4, -0.6], [-2.6, -3.4], [0.0, -4.5], [2.6, -3.7], [3.7, -1.8], [3.9, -0.8, 1], [1.8, -1.7], [0.3, -1.4], [-0.3, 0.6], [0.2, 3.2, 1]], col, {
    hi: 0.42, lo: 0.45, then: (c) => {
      line(c, 0.6, -2.0, 3.8, -1.2, 0.7, trim);
      line(c, -0.6, -4.4, -1.8, 0.4, 0.45, lighten(col, 0.45));
      // mail at the neck
      for (let i = 0; i < 4; i++) dab(c, -2.8 + i * 0.8, 1.8 + (i % 2) * 0.4, 0.5, 0.5, darken(col, 0.4));
      dab(c, -2.2, -2.8, 1.0, 0.8, mix(col, "#5a9a80", 0.5));
    },
  });
  blob(c0, [[-0.8, -4.0, 1], [-0.2, -6.0, 1], [0.8, -4.2, 1]], trim, { hi: 0.4 });
});
// the sarcophagus lid: a coffin-shaped slab, its carved effigy worn smooth
const lid = (ctx, x, y, col, weedC) => {
  const face = [[x - 2.1, y - 5.6, 1], [x + 2.1, y - 5.6, 1], [x + 2.8, y - 3.4, 1], [x + 1.9, y + 6.0, 1], [x - 1.9, y + 6.0, 1], [x - 2.8, y - 3.4, 1]];
  // the slab's thickness, seen along its left edge
  part(ctx, (c) => fillPts(c, face.map(([px, py, q]) => [px - 1.0, py + 0.5, q]), darken(col, 0.45)));
  part(ctx, (c) => {
    path(c, face); c.fillStyle = cel(c, x - 2.8, y - 5.6, x + 2.8, y + 6.0, col, 0.35, 0.4); c.fill();
    c.save(); path(c, face); c.clip();
    const cut = darken(col, 0.4), hi = lighten(col, 0.35);
    // the effigy: a head, folded hands on a sword running down the lid
    c.strokeStyle = cut; c.lineWidth = 0.5; c.beginPath(); c.ellipse(x, y - 3.9, 0.9, 1.0, 0, 0, Math.PI * 2); c.stroke();
    line(c, x - 1.9, y - 2.6, x + 1.9, y - 2.6, 0.45, cut);
    line(c, x, y - 1.8, x, y + 5.2, 0.6, cut); line(c, x - 1.1, y - 0.6, x + 1.1, y - 0.6, 0.6, cut);
    line(c, x + 0.2, y - 1.8, x + 0.2, y + 5.0, 0.35, hi);
    dab(c, x - 1.0, y - 2.0, 2.0, 0.9, cut);
    // the rim carved round it, a crack, a chipped corner
    c.strokeStyle = hi; c.lineWidth = 0.45; c.beginPath(); c.moveTo(x - 2.6, y - 5.2); c.lineTo(x + 2.6, y - 5.2); c.stroke();
    line(c, x + 2.0, y - 5.6, x + 1.0, y - 3.8, 0.4, darken(col, 0.55)); line(c, x + 1.0, y - 3.8, x + 1.6, y - 1.8, 0.4, darken(col, 0.55));
    line(c, x - 1.4, y + 4.0, x - 0.4, y + 5.6, 0.4, darken(col, 0.55));
    // lichen and bog-stain along the foot
    for (const [dx, dy] of [[-2.2, 4.8], [-1.2, 5.4], [1.0, 5.4], [1.6, 4.2], [-2.6, -3.0]]) dab(c, x + dx, y + dy, 0.8, 0.6, mix(col, weedC, 0.7));
    c.restore();
  });
  weed(ctx, x - 1.6, y + 5.0, 2.6, weedC, -0.4);
};
const flangedMace = (ctx, x, y, a, col, len = 9) => {
  const to = along(x, y, a);
  part(ctx, (c) => { haft(c, to, -1.8, len - 1.2, 1.1, "#4a3e36"); for (const u of [-1.4, len - 1.6]) tube(c, ...to(u - 0.3), ...to(u + 0.3), 1.6, col); });
  part(ctx, (c) => {
    const pts = [[...to(len - 1.6, -1.8), 1], [...to(len - 0.6, -2.2), 1], [...to(len + 1.8, -1.6), 1], [...to(len + 2.2, 0), 1], [...to(len + 1.8, 1.6), 1], [...to(len - 0.6, 2.2), 1], [...to(len - 1.6, 1.8), 1]];
    path(c, pts); c.fillStyle = cel(c, ...bbox(pts), col, 0.4, 0.45); c.fill();
    for (const v of [-1.1, 0, 1.1]) line(c, ...to(len - 1.0, v), ...to(len + 1.6, v * 0.9), 0.4, darken(col, 0.5));
    dab(c, ...to(len + 0.4, -1.2), 0.6, 0.6, lighten(col, 0.55));
  });
};

// ---- the Gravecaller ---------------------------------------------------------------
// a robed, hooded thing with a skull for a face; a crook with a bronze bell
// hung from its hook, a corpse-candle lantern in the other hand
const GC = { L1: 5.0, L2: 4.8, stride: 1.9, lift: 1.2, bob: 0.5, lean: 0.16, dip: 0.03, lunge: 1.8, hipW: 0.8, thigh: 2.2, shin: 1.8, foot: 3.0, ankle: 0.9, knee: 0 };
const gravecaller = (ctx, p) => {
  const k = (p.h ?? 26) / 26; ctx.save(); ctx.scale(k, k);
  const o = GC, R = skeleton(p, o), { st, T } = R;
  const robe = p.cloth, trim = p.cloth2 || "#4a5a50", cape = p.cape || darken(robe, 0.2), b = p.skin, fire = p.eyes || "#7ce0b8";
  const weedC = p.mane || "#4e6a48";
  shadow(ctx, 0.6, -0.1, 5.8, 1.4, 0.22);
  const shN = T(1.6, -9.6), shF = T(-1.8, -9.8);
  const A = { up: 3.6, fore: 3.4, w: 2.2 };
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy], F = (dx, dy) => [shF[0] + dx, shF[1] + dy];
  const H = [
    { hn: N(4.2 + sw * 0.4, 4.4), an: -1.42 + sw * 0.05, hf: F(1.6 - sw * 1.0, 6.2), ring: sw * 0.5 },
    { hn: N(1.0, -1.6), an: -1.68, hf: F(4.8, 3.4), ring: -1.2 },
    { hn: N(3.8, 0.6), an: -1.0, hf: F(5.2, 3.6), ring: 1.4 }][!st.fight ? 0 : st.hit ? 2 : 1];
  // the cape streaming behind
  const fl = st.fight ? (st.hit ? 1.6 : 0.4) : [0.6, 1.0, 0.4, 0.8][st.f];
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => blob(c, [[-1.2, -10.4], [-3.6, -9.8], [-5.6, -3.6], [-6.8 - fl, 3.8], [-7.6 - fl, 8.0, 1], [-6.4, 7.0, 1], [-5.4 - fl * 0.5, 8.6, 1], [-4.2, 7.4, 1], [-3.0, 8.6, 1], [-2, 0]], cape, {
    hi: 0.3, lo: 0.35, then: (cc) => { line(cc, -4.6, -4, -6.2 - fl, 7.8, 0.6, darken(cape, 0.4)); weed(cc, -5.4, 2.0, 4.0, weedC, -0.4); },
  }));
  // the lantern hand, behind
  { const a = boneArm(ctx, shF, H.hf, A, darken(b, 0.25), { up: darken(robe, 0.3), fore: darken(robe, 0.3), upW: 1, foreW: 1, noElbow: true }); boneHand(ctx, a.hd[0], a.hd[1], 0.9, darken(b, 0.25)); lantern(ctx, a.hd[0], a.hd[1], fire, st.f); }
  boneLeg(ctx, R, o, "far", darken(b, 0.3));
  boneLeg(ctx, R, o, "near", darken(b, 0.1));
  // the robe, ragged at the hem, a rope belt hung with finger bones
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const kick = st.fight ? (st.hit ? 1.2 : 0.4) : st.c * 0.9, hem = 7.6;
    const pts = [[4.0 + kick, hem, 1], [2.8, hem - 1.2, 1], [1.8 + kick * 0.5, hem + 0.2, 1], [0.4, hem - 1.0, 1], [-1, hem + 0.3, 1], [-2.4, hem - 1.0, 1], [-3.8 - kick * 0.4, hem, 1],
      [-3.6, 3], [-3.2, -3], [-3.0, -8.6], [-1.6, -10.4], [1.4, -10.2], [2.8, -8.6], [2.6, -4], [3.0, 2]];
    blob(c, pts, robe, {
      hi: 0.28, lo: 0.4, then: (cc) => {
        path(cc, [[0.6, -10.4, 1], [2.0, -10.4, 1], [2.9, hem + 1, 1], [1.2, hem + 1, 1]]); cc.fillStyle = trim; cc.fill();
        line(cc, -1.6, -8, -2.4, hem, 0.45, darken(robe, 0.45));
        dab(cc, -3.6, -0.8, 7, 0.9, "#6a5a44");
        for (let i = 0; i < 3; i++) dab(cc, -2.2 + i * 1.2, -0.2, 0.4, 1.4 + (i % 2) * 0.6, b);
        // bog-stain up from the hem
        dab(cc, -4, hem - 1.6, 8, 1.0, mix(robe, weedC, 0.45));
      },
    });
    weed(c, 2.2, -1.0, 4.4, weedC, 0.5);
  });
  // the hood, a skull in its shadow
  const hd = T(1.3, -12.2), ha = st.lean * 0.4;
  hood(ctx, hd[0], hd[1], ha, { hair: p.hair || "#242c30" }, 1.0, "back");
  skull(ctx, hd[0] + 0.2, hd[1] + 0.3, ha, p, { k: 0.78, open: st.hit ? 0.8 : 0 });
  hood(ctx, hd[0], hd[1], ha, { hair: p.hair || "#242c30" }, 1.0, "front");
  // the crook and its bell
  const a = boneArm(ctx, shN, H.hn, A, b, { up: robe, fore: robe, upW: 1, foreW: 1, noElbow: true });
  const end = crook(ctx, a.hd[0], a.hd[1], H.an, "#5a4a3a", 6.8, 10.6);
  boneHand(ctx, a.hd[0], a.hd[1], 0.9, b);
  bell(ctx, end[0], end[1], H.ring, p.wcol || "#a8843e", fire, st.fight && st.hit);
  ctx.restore();
};
// a shepherd's crook: a staff that hooks forward and down at the top; returns
// the hook's end, where the bell's cord ties on
const crook = (ctx, x, y, a, wood, down, up) => {
  const to = along(x, y, a);
  part(ctx, (c) => {
    haft(c, to, -down, up, 1.1, wood);
    c.strokeStyle = wood; c.lineWidth = 1.1; c.lineCap = "round";
    c.beginPath(); c.moveTo(...to(up, 0)); c.quadraticCurveTo(...to(up + 3.0, 0.2), ...to(up + 2.4, 2.6)); c.stroke();
    c.strokeStyle = lighten(wood, 0.3); c.lineWidth = 0.4; c.beginPath(); c.moveTo(...to(up - 3, -0.3)); c.lineTo(...to(up, -0.3)); c.stroke();
    dab(c, ...to(up * 0.4, -0.3), 0.6, 0.6, darken(wood, 0.45));
  });
  return to(up + 2.3, 2.7);
};
// the bronze handbell hung from the crook, swinging `ring` (-1 back .. 1 forward)
const bell = (ctx, x, y, ring, col, fire, toll) => {
  const bx = x + ring * 1.2, by = y + 2.6 - Math.abs(ring) * 0.3, tilt = ring * 0.35;
  part(ctx, (c) => line(c, x, y, bx, by - 1.4, 0.4, "#3a3028"));
  inFrame(ctx, bx, by, tilt, (c0) => part(c0, (c) => {
    path(c, [[-0.9, -1.4], [0.9, -1.4], [1.3, 0.0], [2.0, 1.3, 1], [-2.0, 1.3, 1], [-1.3, 0.0]]);
    c.fillStyle = cel(c, -2, -1.6, 2, 1.4, col, 0.45, 0.45); c.fill();
    dab(c, -2.0, 0.6, 4.0, 0.5, darken(col, 0.3));
    dab(c, -0.8, -1.0, 0.5, 1.2, lighten(col, 0.55));
    dab(c, -0.3, 1.3, 0.7, 0.7, darken(col, 0.5));
  }));
  if (toll) {
    // the toll going out in rings of witch-fire
    glow(ctx, bx, by, 5.2, fire, 0.35);
    for (const [r, al] of [[3.4, 0.9], [5.6, 0.55]]) {
      ctx.strokeStyle = rgba(fire, al); ctx.lineWidth = 0.6;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(bx, by, r, s > 0 ? -0.7 : Math.PI - 0.7 + 1.4 - 1.4, s > 0 ? 0.7 : Math.PI + 0.7); ctx.stroke(); }
    }
  }
};
// the corpse-candle lantern: an iron cage with a teal flame in it
const lantern = (ctx, x, y, fire, f) => {
  const ly = y + 2.2;
  part(ctx, (c) => {
    line(c, x, y, x, ly - 1.4, 0.35, "#2e3038");
    c.fillStyle = "#2e3038"; c.fillRect(x - 1.2, ly - 1.6, 2.4, 0.6); c.fillRect(x - 1.2, ly + 1.2, 2.4, 0.6);
    c.fillStyle = lighten(fire, 0.2); c.fillRect(x - 0.9, ly - 1.0, 1.8, 2.2);
    c.fillStyle = lighten(fire, 0.7); c.fillRect(x - 0.3, ly - 0.4 + (f % 2) * 0.3, 0.6, 1.0);
    c.fillStyle = "#2e3038"; c.fillRect(x - 1.2, ly - 1.0, 0.4, 2.2); c.fillRect(x + 0.8, ly - 1.0, 0.4, 2.2); c.fillRect(x - 0.15, ly - 1.0, 0.3, 2.2);
  });
  glow(ctx, x, ly, 3.4, fire, 0.4);
};

// ---- THE HOLLOW KING ---------------------------------------------------------------
// the drowned king: a tall crowned skeleton in the rags of his royal robes,
// witch-fire burning in his ribs, weed hanging off him, a great sword of
// witch-fire in both hands
const HK = { L1: 6.4, L2: 6.2, stride: 2.9, lift: 2.1, bob: 0.8, lean: 0.05, dip: 0.03, lunge: 2.8, hipW: 1.4, thigh: 1.8, shin: 1.5, foot: 4.0, ankle: 1.0, knee: 1.15 };
const hollowKing = (ctx, p) => {
  const k = (p.h ?? 36) / 36; ctx.save(); ctx.scale(k, k);
  const o = HK, R = skeleton(p, o), { st, T } = R;
  const b = p.skin, bF = darken(b, 0.28), robe = p.cloth, gold = p.cloth2 || "#8a7a4a", cape = p.cape || darken(robe, 0.25);
  const verd = p.hair || "#5a8a78", fire = p.eyes || "#7ce0b8", weedC = p.mane || "#4e6a48";
  // the witch-fire mist he walks in, then his shadow
  glow(ctx, 0.6, -0.4, 9.0, fire, 0.18);
  shadow(ctx, 0.8, -0.1, 8.4, 2.0, 0.28);
  const S = 1.3;                                    // his torso, scaled up from the Risen's
  const shN = T(1.6, -9.6), shF = T(-1.8, -9.9);
  const A = { up: 4.4, fore: 4.2, w: 1.35 };
  const sw = st.swing, N = (dx, dy) => [shN[0] + dx, shN[1] + dy];
  const H = [
    { hn: N(3.0 + sw * 0.3, 5.4), an: -1.12 + sw * 0.03 },
    { hn: N(-1.0, -4.2), an: -2.5 },
    { hn: N(5.4, 3.0), an: 0.5 }][!st.fight ? 0 : st.hit ? 2 : 1];
  // the royal cape, long and torn, streaming behind
  const fl = st.fight ? (st.hit ? 2.0 : 0.4) : [0.8, 1.4, 0.6, 1.2][st.f];
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const pts = [[1.0, -11.2], [-2.6, -11.4], [-4.6, -8.6], [-5.6 - fl * 0.3, -2.0], [-7.2 - fl, 5.0], [-8.4 - fl * 1.3, 11.6, 1], [-7.0 - fl, 10.2, 1], [-6.0 - fl * 0.8, 12.0, 1], [-4.6 - fl * 0.5, 10.4, 1], [-3.4 - fl * 0.3, 12.2, 1], [-2.0, 10.6, 1], [-1.2, 3.0], [-0.6, -5.0]];
    blob(c, pts, cape, {
      hi: 0.3, lo: 0.4, then: (cc) => {
        line(cc, -3.0, -8, -5.6 - fl, 11, 0.6, darken(cape, 0.4)); line(cc, -1.8, -6, -3.0 - fl * 0.5, 11, 0.5, darken(cape, 0.35));
        cc.strokeStyle = gold; cc.lineWidth = 0.8; path(cc, pts); cc.stroke();
        dab(cc, -9, 9.2, 8, 1.4, mix(cape, weedC, 0.5));
      },
    });
    weed(c, -6.2 - fl, 8.0, 4.4, weedC, -0.6, 0.9);
  });
  // the far arm (on the pommel in a fight, else hanging in its sleeve)
  const grip = along(...ik(shN[0], shN[1], H.hn[0], H.hn[1], A.up, A.fore, -1)[1], H.an)(-2.6);
  const far = boneArm(ctx, shF, grip, A, bF, { up: darken(robe, 0.3), upW: 2.0 });
  boneLeg(ctx, R, o, "far", bF);
  boneLeg(ctx, R, o, "near", b);
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const kick = st.fight ? (st.hit ? 1.0 : -0.2) : st.c * 0.7;
    // the back skirt of the robe, falling to the shins
    rag(c, -3.6, 1.0, -1.6, 7.6, darken(robe, 0.2), -kick * 0.5, { n: 5 });
    pelvis(c, b, S);
    ribcage(c, b, { s: S, heart: fire });
    // the girdle, a hanging chain, the front skirt panel
    part(c, (cc) => { dab(cc, -3.0, -1.9, 6.4, 1.3, gold); dab(cc, -3.0, -1.9, 6.4, 0.4, lighten(gold, 0.4)); ball(cc, 1.8, -1.3, 0.9, 0.8, fire, { hi: 0.6, lo: 0.3 }); });
    rag(c, 0.6, 3.6, -0.8, 7.2, robe, kick, { n: 4, then: (cc) => { dab(cc, 0, -1, 1.0, 9, gold); dab(cc, -1, 5.6, 6, 1.4, mix(robe, weedC, 0.45)); } });
    // the mantle over the shoulders: a collar of tarnished gold, verdigris fittings
    blob(c, [[-4.8, -8.0, 1], [-4.6, -10.6], [-2.4, -12.4], [1.2, -12.2], [3.6, -10.8], [4.2, -8.6, 1], [3.0, -9.4, 1], [1.8, -8.4, 1], [0.6, -9.4, 1], [-0.8, -8.2, 1], [-2.0, -9.2, 1], [-3.4, -8.0, 1]], robe, {
      hi: 0.3, lo: 0.4, then: (cc) => { dab(cc, -5, -10.6, 10, 1.0, gold); for (const x of [-3.2, -0.6, 2.2]) dab(cc, x, -10.4, 0.6, 0.6, verd); line(cc, -2.8, -12, -3.6, -8.6, 0.45, darken(robe, 0.4)); },
    });
    weed(c, 2.6, -9.6, 4.6, weedC, 0.4, 0.9);
    weed(c, -3.8, -9.0, 5.4, weedC, -0.3, 0.9);
  });
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => glow(c, 0.8, -6.4, 3.2, fire, 0.3));
  // the crowned skull
  const nk = T(1.2, -11.6), hd = [nk[0] + 1.2 + (st.hit ? 0.6 : 0), nk[1] - 2.8], ha = st.lean * 0.3;
  part(ctx, (c) => tube(c, nk[0] - 0.3, nk[1] + 0.4, hd[0] - 0.6, hd[1] + 2.0, 1.1, bF));
  skull(ctx, hd[0], hd[1], ha, p, { k: 1.12, open: st.fight && !st.hit ? 1 : 0.15, glow: 3.2 });
  crownOf(ctx, hd[0], hd[1], ha, verd, fire, weedC);
  // the great sword in both hands
  const hn = ik(shN[0], shN[1], H.hn[0], H.hn[1], A.up, A.fore, -1)[1];
  greatSword(ctx, hn[0], hn[1], H.an, p.wcol || "#7ce0b8", st.f);
  boneHand(ctx, far.hd[0], far.hd[1], 0.95, bF);
  const h = boneArm(ctx, shN, hn, A, b, { up: robe, upW: 2.0 });
  boneHand(ctx, h.hd[0], h.hd[1], 1.0, b);
  ctx.restore();
};
// the drowned crown: a verdigris band with tall points, witch-fire gems, weed caught on it
const crownOf = (ctx, x, y, a, col, fire, weedC) => inFrame(ctx, x, y, a, (c0) => {
  const pts = [[-2.9, -1.2, 1], [-3.0, -3.0, 1], [-3.2, -5.8, 1], [-2.0, -3.6, 1], [-1.2, -6.8, 1], [-0.2, -3.8, 1], [0.9, -7.2, 1], [1.8, -3.8, 1], [2.9, -6.4, 1], [3.1, -3.4, 1], [3.4, -1.4, 1]];
  blob(c0, pts, col, {
    hi: 0.45, lo: 0.4, then: (c) => {
      dab(c, -3.2, -2.6, 6.8, 1.2, darken(col, 0.25));
      dab(c, -3.2, -2.6, 6.8, 0.4, lighten(col, 0.4));
      for (const gx of [-1.8, 0.6, 2.6]) dab(c, gx, -2.4, 0.7, 0.7, fire);
      dab(c, -1.4, -5.4, 0.5, 1.2, lighten(col, 0.5)); dab(c, 1.0, -6.0, 0.5, 1.4, lighten(col, 0.5));
    },
  });
  for (const [gx, gy] of [[0.9, -7.2], [-1.2, -6.8], [2.9, -6.4]]) { c0.fillStyle = fire; c0.fillRect(gx - 0.3, gy - 0.3, 0.6, 0.6); }
  weed(c0, -2.6, -1.8, 5.0, weedC, -0.8, 0.8);
  weed(c0, -1.4, -1.6, 3.0, weedC, -0.3, 0.7);
});
// the witch-fire greatsword: a long dark blade with a burning edge
const greatSword = (ctx, x, y, a, fire, f) => {
  const to = along(x, y, a), len = 14.5, steel = "#4a5260";
  part(ctx, (c) => {
    haft(c, to, -3.4, 0.6, 1.2, "#2e2a36");
    ball(c, ...to(-3.8), 0.9, 0.9, "#8a7a4a", { hi: 0.5, lo: 0.4 });
    tube(c, ...to(0.9, -2.6), ...to(0.9, 2.6), 1.0, "#8a7a4a");
    for (const s of [-1, 1]) ball(c, ...to(1.0, s * 2.7), 0.6, 0.6, "#8a7a4a", { hi: 0.5, lo: 0.4 });
  });
  part(ctx, (c) => {
    const pts = [[...to(1.3, -1.0), 1], [...to(len - 2.0, -0.9), 1], [...to(len, 0), 1], [...to(len - 2.0, 0.9), 1], [...to(1.3, 1.0), 1]];
    path(c, pts); c.fillStyle = cel(c, ...bbox(pts), steel, 0.35, 0.45); c.fill();
    line(c, ...to(1.8, 0), ...to(len - 2.2, 0), 0.45, darken(steel, 0.5));
    // the burning edges
    line(c, ...to(1.6, -0.85), ...to(len - 1.2, -0.55), 0.5, fire);
    line(c, ...to(1.6, 0.85), ...to(len - 1.2, 0.55), 0.4, lighten(fire, 0.2));
    dab(c, ...to(len - 1.4, -0.2), 0.6, 0.5, lighten(fire, 0.7));
  });
  // witch-fire licking off the blade
  const fn = along(x, y, a);
  for (let i = 0; i < 4; i++) {
    const u = 4 + i * 2.6 + (f % 2) * 0.8, [fx, fy] = fn(u, -1.0);
    ctx.fillStyle = rgba(fire, 0.85); ctx.fillRect(fx - 0.3, fy - 1.2 - (i % 2) * 0.6, 0.6, 1.0 + (i % 2) * 0.6);
    ctx.fillStyle = rgba(lighten(fire, 0.6), 0.9); ctx.fillRect(fx - 0.25, fy - 0.4, 0.5, 0.5);
  }
  glow(ctx, ...to(len * 0.55), len * 0.45, fire, 0.22);
};

// ---- the roster --------------------------------------------------------------------
const BONE = "#e0d8c4", TEAL = "#7ce0b8", WEED = "#4e6a48";
export const HOLLOW_RIGS = {
  skeleton: { kind: "hlwRisen", box: { hw: 17, up: 29, down: 4 }, p: { h: 22, skin: BONE, cloth: "#4a3a5e", cloth2: "#2a2434", hair: "#6e6860", mane: WEED, eyes: TEAL, wcol: "#9a968a", shcol: "#6a5238" } },
  bonearcher: { kind: "hlwRisen", box: { hw: 17, up: 29, down: 4 }, p: { look: "archer", h: 22, skin: BONE, cloth: "#4a5a50", cloth2: "#4a3a2c", hair: "#3a4640", mane: WEED, eyes: TEAL, wcol: "#7a5a34" } },
  ghast: { kind: "hlwGhast", box: { hw: 20, up: 32, down: 4 }, p: { h: 26, skin: "#a4ae8c", belly: "#c8c8a0", cloth: "#4a5a50", cloth2: "#2a2434", hair: "#3a3a30", mane: WEED, eyes: "#d8e860" } },
  crypt: { kind: "hlwCrypt", box: { hw: 22, up: 38, down: 4 }, p: { h: 31, skin: BONE, cloth: "#5e665e", cloth2: "#4a3a5e", hair: "#8a7a4a", mane: WEED, eyes: TEAL, wcol: "#7a808c", shcol: "#a39a86" } },
  gravecaller: { kind: "hlwCaller", box: { hw: 20, up: 34, down: 4 }, p: { h: 26, skin: "#d8d0bc", cloth: "#2e3a3c", cloth2: "#4a5a50", hair: "#242c30", cape: "#2a2434", mane: WEED, eyes: TEAL, wcol: "#a8843e" } },
  hollowking: { kind: "hlwKing", box: { hw: 27, up: 49, down: 5 }, p: { h: 39, skin: BONE, cloth: "#3a2e4a", cloth2: "#8a7a4a", hair: "#5a8a78", cape: "#2a2434", mane: WEED, eyes: TEAL, wcol: TEAL } },
};
export const HOLLOW_PAINTERS = { hlwRisen: risen, hlwGhast: ghast, hlwCrypt: crypt, hlwCaller: gravecaller, hlwKing: hollowKing };
