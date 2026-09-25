// ============ RIGS: THE GREENWOOD HORDE ============
// Bespoke bodies for the Greenwood roster. Entries in HORDE_RIGS override the
// generic ones in rigs.js (same shape: { kind, box: { hw, up, down }, p, fly? });
// HORDE_PAINTERS maps each new `kind` to its painter (ctx, p) — the pose is
// p.pose ("walk" | "fight") and p.frame (0-3 walk, 0-1 fight), feet at 0,0,
// facing +x. Frames are baked once and inked by rigs.js.
//
// Every body here hangs off one small skeleton: a hip that rides the gait, a
// torso frame that leans from it, two-bone legs that find the ground and
// two-bone arms that find the weapon. Colours come only from p.skin / cloth /
// cloth2 / hair / cape / wcol / shcol, so the necromancer's pale revive still
// reaches everything.

import { lighten, darken, mix, rgba, ball, glow, lin, part, shadow } from "./paint.js";

// ---- the kit ----------------------------------------------------------------
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
// three-tone cel fill across a box, lit from the upper left
const cel = (c, x0, y0, x1, y1, col, hi = 0.32, lo = 0.42) => lin(c, x0, y0, x1, y1, [[0, lighten(col, hi)], [0.5, col], [1, darken(col, lo)]]);
// a lit shape as its own inked part
const shape = (ctx, pts, col, box, o = {}) => part(ctx, (c) => {
  path(c, pts); c.fillStyle = cel(c, ...box, col, o.hi, o.lo); c.fill();
  if (o.then) { c.save(); path(c, pts); c.clip(); o.then(c); c.restore(); }
});
const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const blob = (ctx, pts, col, o) => shape(ctx, pts, col, bbox(pts), o);
// a plain dab of colour, no ink: eyes, rivets, stitches
const dab = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const line = (c, x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };

// a round limb segment shaded across its width, the lit side toward the sun
const tube = (c, x0, y0, x1, y1, w, col) => {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  let nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  if (nx * SUNV[0] + ny * SUNV[1] < 0) { nx = -nx; ny = -ny; }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  c.strokeStyle = lin(c, mx + nx * w / 2, my + ny * w / 2, mx - nx * w / 2, my - ny * w / 2, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.42)]]);
  c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
};

// two bones from a root to a target: returns [joint, end]; dir 1 bends the
// joint toward +x (knees), -1 toward -x (elbows)
const ik = (ax, ay, bx, by, l1, l2, dir) => {
  const dx = bx - ax, dy = by - ay, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.02);
  const a = Math.atan2(dy, dx), k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const j = a - dir * k;
  return [[ax + Math.cos(j) * l1, ay + Math.sin(j) * l1], [ax + Math.cos(a) * d, ay + Math.sin(a) * d]];
};

// a torso frame: (lx, ly) in the body's own coordinates → the sprite's
const frameAt = (x, y, a) => { const cs = Math.cos(a), sn = Math.sin(a); return (lx, ly) => [x + lx * cs - ly * sn, y + lx * sn + ly * cs]; };
const inFrame = (ctx, x, y, a, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); fn(ctx); ctx.restore(); };

// The gait, four frames: contact, passing, contact, passing. The lifted foot
// trails behind the planted one and the hip rides high as it passes. The
// fight is a wind-up (weight back, lean back) and a strike (step in, lunge).
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
// the skeleton: gait, hip, torso frame, and the hip height that keeps the
// planted foot on the ground at full stride
const skeleton = (p, o) => {
  const st = step(p, o);
  const reach = o.L1 + o.L2, ank = o.ankle ?? 0.9;
  const hipH = Math.min(Math.sqrt(reach * reach - o.stride * o.stride) * 0.96, reach - o.bob - 0.15) + ank;
  const hip = [st.x, -hipH + st.bob];
  return { st, hip, ank, T: frameAt(hip[0], hip[1], st.lean) };
};

// a leg from the hip to the ground: thigh and shin in one piece, then the foot
const leg = (ctx, R, o, which, cols) => {
  const { st, T, ank } = R;
  const [fx, fy] = st[which];
  const hp = T(which === "near" ? o.hipW : -o.hipW, 0);
  const [kn, an] = ik(hp[0], hp[1], fx, fy - ank, o.L1, o.L2, 1);
  part(ctx, (c) => {
    tube(c, hp[0], hp[1], kn[0], kn[1], o.thigh, cols.thigh);
    tube(c, kn[0], kn[1], an[0], an[1], o.shin, cols.shin);
    if (cols.wrap) { const t = 0.55; tube(c, kn[0] + (an[0] - kn[0]) * t, kn[1] + (an[1] - kn[1]) * t, an[0], an[1], o.shin * 1.08, cols.wrap); }
  });
  foot(ctx, an[0], an[1] + ank, o.foot, ank + 0.5, cols.foot, cols.toes);
  return { hp, kn, an };
};
const foot = (ctx, x, y, len, h, col, toes) => part(ctx, (c) => {
  path(c, [[x - len * 0.32, y, 1], [x - len * 0.36, y - h * 0.7], [x - len * 0.05, y - h], [x + len * 0.4, y - h * 0.6], [x + len * 0.68, y - h * 0.15], [x + len * 0.66, y, 1]]);
  c.fillStyle = cel(c, x - len * 0.4, y - h, x + len * 0.7, y, col); c.fill();
  if (toes) for (let i = 0; i < toes; i++) dab(c, x + len * (0.62 - i * 0.22), y - 0.55, 0.5, 0.5, darken(col, 0.45));
});

// an arm from the shoulder to the hand (elbow back); returns the hand
const arm = (ctx, sh, to, o, cols) => {
  const [el, hd] = ik(sh[0], sh[1], to[0], to[1], o.up, o.fore, o.bend ?? -1);
  part(ctx, (c) => {
    tube(c, sh[0], sh[1], el[0], el[1], o.w, cols.up);
    tube(c, el[0], el[1], hd[0], hd[1], o.w * 0.9, cols.fore || cols.up);
    if (cols.cuff) { const t = 0.45; tube(c, el[0] + (hd[0] - el[0]) * t, el[1] + (hd[1] - el[1]) * t, hd[0] - (hd[0] - el[0]) * 0.12, hd[1] - (hd[1] - el[1]) * 0.12, o.w * 1.05, cols.cuff); }
  });
  return hd;
};
const fist = (ctx, x, y, r, col) => part(ctx, (c) => ball(c, x, y, r, r * 0.95, col, { hi: 0.4, lo: 0.4 }));

// ---- weapons ------------------------------------------------------------------
// each in hand at (x, y) pointing along a; `to(u, v)` walks the haft (u) and
// across it (v, toward the edge side)
const along = (x, y, a) => { const dx = Math.cos(a), dy = Math.sin(a); return (u, v = 0) => [x + dx * u - dy * v, y + dy * u + dx * v]; };
const haft = (c, to, u0, u1, w, col) => { const [x0, y0] = to(u0), [x1, y1] = to(u1); tube(c, x0, y0, x1, y1, w, col); };

const knife = (ctx, x, y, a, col, len = 4) => part(ctx, (c) => {
  const to = along(x, y, a);
  haft(c, to, -1.3, 0.4, 1.1, "#4a3020");
  line(c, ...to(0.6, -0.9), ...to(0.6, 0.9), 0.6, darken(col, 0.2));
  path(c, [[...to(0.6, -0.55), 1], [...to(len * 0.75, -0.6), 1], [...to(len, 0.1), 1], [...to(len * 0.7, 0.5), 1], [...to(0.6, 0.5), 1]]);
  c.fillStyle = col; c.fill();
  path(c, [[...to(0.6, -0.55), 1], [...to(len * 0.75, -0.6), 1], [...to(len, 0.1), 1], [...to(0.6, -0.05), 1]]);
  c.fillStyle = lighten(col, 0.45); c.fill();
});

const spear = (ctx, x, y, a, col, back = 5, fwd = 10) => part(ctx, (c) => {
  const to = along(x, y, a);
  haft(c, to, -back, fwd, 1.0, "#7a5334");
  line(c, ...to(fwd - 0.6, 0), ...to(fwd + 0.3, 0), 1.4, "#5a3e24");
  path(c, [[...to(fwd, -0.9), 1], [...to(fwd + 3.6, 0), 1], [...to(fwd, 0.9), 1]]);
  c.fillStyle = col; c.fill();
  path(c, [[...to(fwd, -0.9), 1], [...to(fwd + 3.6, 0), 1], [...to(fwd, 0), 1]]);
  c.fillStyle = lighten(col, 0.45); c.fill();
});

// the orc's heavy axe: a long haft and a bearded crescent, the edge leading
const heavyAxe = (ctx, x, y, a, col, len = 12) => {
  const to = along(x, y, a);
  part(ctx, (c) => haft(c, to, -2.6, len, 1.5, "#7a5334"));
  part(ctx, (c) => {
    const L = len;
    const pts = [[...to(L - 4.0, 0.5), 1], [...to(L - 4.6, 2.2)], [...to(L - 6.4, 4.0), 1], [...to(L - 2.6, 5.6)], [...to(L + 0.8, 4.0), 1], [...to(L - 0.6, 2.2)], [...to(L - 1.0, 0.5), 1], [...to(L - 1.6, -1.3), 1], [...to(L - 3.4, -1.3), 1]];
    path(c, pts); c.fillStyle = cel(c, ...bbox(pts), col, 0.3, 0.4); c.fill();
    // the bright bevel along the edge
    c.strokeStyle = lighten(col, 0.6); c.lineWidth = 0.7; c.lineCap = "round";
    c.beginPath(); c.moveTo(...to(L - 5.6, 3.6)); c.quadraticCurveTo(...to(L - 2.6, 5.0), ...to(L + 0.2, 3.6)); c.stroke();
    dab(c, ...to(L - 2.6, 0.2), 0.6, 0.6, darken(col, 0.5));
  });
};

// the Ironclad's cleaver-sword: broad, heavy at the tip
const cleaver = (ctx, x, y, a, col, len = 8.5) => part(ctx, (c) => {
  const to = along(x, y, a);
  haft(c, to, -1.8, 0.6, 1.2, "#4a3020");
  line(c, ...to(0.8, -1.8), ...to(0.8, 1.8), 1.0, "#8a7444");
  const pts = [[...to(1.1, -0.8), 1], [...to(len - 1.2, -1.0), 1], [...to(len, -0.2), 1], [...to(len - 0.4, 1.5), 1], [...to(1.1, 0.8), 1]];
  path(c, pts); c.fillStyle = col; c.fill();
  path(c, [[...to(1.1, -0.8), 1], [...to(len - 1.2, -1.0), 1], [...to(len, -0.2), 1], [...to(1.1, -0.1), 1]]);
  c.fillStyle = lighten(col, 0.45); c.fill();
  line(c, ...to(1.6, 0.25), ...to(len - 1.6, 0.35), 0.4, darken(col, 0.35));
});

// a knotted log, thin at the grip and fat at the head
const club = (ctx, x, y, a, col, len = 12) => {
  const to = along(x, y, a);
  part(ctx, (c) => {
    const pts = [[...to(-2.2, -1.0)], [...to(len * 0.45, -1.5)], [...to(len - 3, -2.8)], [...to(len - 0.6, -2.6)], [...to(len + 0.6, -0.4)], [...to(len - 0.2, 2.4)], [...to(len - 3.2, 2.6)], [...to(len * 0.45, 1.4)], [...to(-2.2, 1.0)]];
    path(c, pts); c.fillStyle = cel(c, ...bbox(pts), col, 0.3, 0.45); c.fill();
    c.save(); path(c, pts); c.clip();
    // bark grain and knots
    for (const [u, v, l] of [[1, -0.4, 3], [len * 0.5, 0.6, 3.4], [len - 3.5, -1.2, 2.2], [len - 2, 1, 1.8]]) line(c, ...to(u, v), ...to(u + l, v + 0.2), 0.45, darken(col, 0.45));
    ball(c, ...to(len - 2.2, -0.8), 0.9, 0.8, darken(col, 0.3), { hi: 0.1, lo: 0.3 });
    c.restore();
  });
  // a couple of iron spikes driven through the head
  part(ctx, (c) => { for (const [u, v, d] of [[len - 1.6, -2.4, -1], [len - 3.6, 2.4, 1], [len + 0.2, 0.4, 0]]) { const [x0, y0] = to(u, v), [x1, y1] = d ? to(u + 0.3, v + d * 1.6) : to(u + 1.6, v); line(c, x0, y0, x1, y1, 0.7, "#c4c8d0"); } });
};

// a gnarled caster's staff: shaft, a crook at the top, and what it carries
const staff = (ctx, x, y, a, wood, down = 6, up = 10) => {
  const to = along(x, y, a);
  part(ctx, (c) => {
    haft(c, to, -down, up, 1.1, wood);
    // a crooked fork holding the charm
    tube(c, ...to(up, 0), ...to(up + 1.6, -1.3), 0.9, wood);
    tube(c, ...to(up, 0), ...to(up + 1.8, 1.2), 0.9, wood);
    dab(c, ...to(up * 0.35, -0.3), 0.6, 0.6, darken(wood, 0.45));
  });
  return to(up + 1.9, 0);
};

// a round shield seen at three-quarters: planks, an iron rim, a boss
const roundShield = (ctx, x, y, rx, ry, col) => part(ctx, (c) => {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = cel(c, x - rx, y - ry, x + rx, y + ry, col, 0.3, 0.45); c.fill();
  c.save(); c.clip();
  for (const k of [-0.36, 0.3]) line(c, x + rx * k, y - ry, x + rx * k + 0.2, y + ry, 0.45, darken(col, 0.45));
  c.restore();
  c.strokeStyle = "#8a8a92"; c.lineWidth = 0.7; c.beginPath(); c.ellipse(x, y, rx - 0.3, ry - 0.3, 0, 0, Math.PI * 2); c.stroke();
  ball(c, x + 0.2, y - 0.1, 0.95, 1.05, "#b8bcc4", { hi: 0.5, lo: 0.4 });
});

// ---- heads ----------------------------------------------------------------------
// every head is drawn in its own frame: (0,0) the middle of the skull, +x the face

// the goblin: long ears in a V, a hooked nose, a mean little brow
const goblinHead = (ctx, x, y, a, p, o = {}) => inFrame(ctx, x, y, a, (c0) => {
  if (o.k) c0.scale(o.k, o.k);
  const skin = p.skin, eyes = p.eyes || "#c8453a";
  // the far ear, up and back behind the skull
  blob(c0, [[0, -1.6], [-2.2, -4.6, 1], [-1.6, -2.2], [-0.6, -0.8]], darken(skin, 0.18));
  blob(c0, [[-2.3, -0.6], [-1.8, -2.4], [0.4, -2.9], [2.1, -2.0], [2.6, -0.6], [2.5, 1.0], [1.5, 2.3], [-0.4, 2.3], [-2.0, 1.3]], skin, {
    then: (c) => {
      if (o.hood) dab(c, -3, -3, 7, 2.2, darken(skin, 0.25));
      // the brow, cut down toward the nose, and the eyes under it
      line(c, 0.3, -1.4, 2.3, -0.9, 0.6, darken(skin, 0.55));
      dab(c, 1.0, -0.9, 1.0, 0.6, eyes); dab(c, 2.3, -0.9, 0.5, 0.6, eyes);
      dab(c, 1.0, -0.9, 0.5, 0.3, lighten(eyes, 0.5));
      // a grin with a fang in it
      line(c, 0.9, 1.2, 2.3, 0.9, 0.45, darken(skin, 0.6));
      dab(c, 1.6, 0.9, 0.5, 0.6, "#ece0c4");
      if (o.paint) { dab(c, 0.6, -0.1, 0.5, 1.2, o.paint); dab(c, 1.6, 0, 0.5, 1.0, o.paint); }
    },
  });
  // the nose, long and hooked down
  blob(c0, [[2.0, -1.0], [4.5, 0.4, 1], [3.3, 0.6], [2.2, 0.5, 1]], skin, { hi: 0.25 });
  if (o.hood) {
    // a peaked hood falling to a short capelet, the face in its shadow
    const hood = [[-2.6, 3.4, 1], [-3.2, 0.6], [-3.3, -1.8], [-5.2, -3.6, 1], [-2.0, -3.6], [0.6, -3.7], [2.4, -2.6], [3.0, -1.4, 1], [1.4, -1.8], [0.2, -0.6], [-0.2, 1.6], [0.8, 3.4, 1]];
    blob(c0, hood, p.hair || p.cloth, { hi: 0.3, lo: 0.45, then: (c) => line(c, -2.4, -2.6, -0.8, 0.6, 0.45, darken(p.hair || p.cloth, 0.4)) });
  } else if (o.tuft) {
    blob(c0, [[-2.4, -1.6], [-1.6, -3.9, 1], [-0.9, -2.6], [0.1, -3.9, 1], [0.5, -2.6], [-0.6, -1.9]], o.tuft, { hi: 0.25 });
  }
  // the near ear, long and swept back, poking out of anything worn
  blob(c0, [[-1.2, -1.1], [-6.0, -2.9, 1], [-4.0, -0.9], [-1.6, 0.9]], skin, { hi: 0.3, then: (c) => line(c, -1.8, -0.6, -4.6, -1.8, 0.5, darken(skin, 0.35)) });
});

// the orc: a heavy brow, a jutting jaw, two tusks up from the underbite
const orcHead = (ctx, x, y, a, p, o = {}) => inFrame(ctx, x, y, a, (c0) => {
  const skin = p.skin, eyes = p.eyes || "#e8c14a";
  // the ear, small and pointed, back of the jaw
  blob(c0, [[-1.0, -1.4], [-3.6, -2.4, 1], [-1.4, 0.8]], darken(skin, 0.1));
  blob(c0, [[-2.4, -0.4], [-2.1, -2.4], [-0.4, -3.3], [1.8, -3.1], [2.9, -1.9], [3.3, -0.6, 1], [3.9, 0.4], [3.9, 1.8], [3.3, 2.8], [1.4, 3.1], [-0.8, 2.6], [-2.2, 1.2]], skin, {
    then: (c) => {
      // brow ridge, a squint of yellow under it
      path(c, [[0.2, -2.0, 1], [3.4, -1.6, 1], [3.2, -0.8, 1], [0.4, -1.1, 1]]); c.fillStyle = darken(skin, 0.28); c.fill();
      dab(c, 1.6, -0.9, 1.1, 0.55, eyes); dab(c, 2.9, -0.9, 0.5, 0.55, eyes);
      // flat nose, the mouth line, the jaw's shadow
      dab(c, 3.4, -0.4, 0.7, 0.9, darken(skin, 0.18));
      line(c, 2.0, 1.4, 3.8, 1.3, 0.45, darken(skin, 0.6));
      path(c, [[-1.0, 2.4, 1], [3.6, 2.2, 1], [3.2, 3.4, 1], [-1, 3.4, 1]]); c.fillStyle = darken(skin, 0.2); c.fill();
      if (o.scar) line(c, 0.2, -2.6, 1.2, -0.4, 0.4, lighten(skin, 0.35));
    },
  });
  // tusks
  for (const [tx, h] of [[2.3, 1.7], [3.4, 1.3]]) { c0.fillStyle = "#ece0c4"; c0.beginPath(); c0.moveTo(tx - 0.45, 1.5); c0.lineTo(tx + 0.4, 1.5); c0.lineTo(tx + 0.1, 1.5 - h); c0.closePath(); c0.fill(); }
  // a black topknot, tied back
  if (!o.bald) {
    blob(c0, [[-0.4, -3.0], [-1.6, -4.1], [-0.2, -4.7], [0.8, -3.8]], p.hair || "#2a1a10", { hi: 0.4 });
    blob(c0, [[-1.2, -3.8], [-3.6, -3.4], [-4.8, -1.4, 1], [-3.2, -2.4], [-1.0, -2.8]], p.hair || "#2a1a10", { hi: 0.4 });
  }
});

// ---- the goblins --------------------------------------------------------------
const GOB = { L1: 4.1, L2: 4.0, stride: 2.2, lift: 1.9, bob: 0.7, lean: 0.22, dip: 0.05, lunge: 2.2, hipW: 0.5, thigh: 2.1, shin: 1.8, foot: 2.8, ankle: 0.7 };
const goblin = (ctx, p) => {
  const k = (p.h ?? 20) / 20; ctx.save(); ctx.scale(k, k);
  const o = GOB, R = skeleton(p, o), { st, T } = R;
  const skin = p.skin, skinF = darken(skin, 0.24), wrap = p.robe ? darken(p.cloth, 0.35) : darken(p.cloth2 || p.cloth, 0.05);
  const robe = p.robe;
  shadow(ctx, 0.4, -0.1, 4.4, 1.2, 0.22);
  const shN = T(0.8, -5.3), shF = T(-0.8, -5.5);
  const A = { up: 2.6, fore: 2.5, w: 1.7 };
  // where the hands go
  let hn, an, hf;
  const w = p.weapon;
  if (!st.fight) {
    hn = [shN[0] + 1.4 + st.swing * 1.0, shN[1] + 3.6];
    an = w === "spear" ? -0.42 : w === "staff" ? -1.42 + st.swing * 0.06 : 0.3 - st.swing * 0.15;
    hf = p.shield ? [shF[0] + 3.9 - st.swing * 0.3, shF[1] + 3.6] : [shF[0] + 0.5 - st.swing * 1.2, shF[1] + 4.1];
    if (w === "staff") { hn = [shN[0] + 4.0 + st.swing * 0.4, shN[1] + 3.0]; an = -1.36 + st.swing * 0.06; }
  } else if (!st.hit) {
    hn = w === "staff" ? [shN[0] + 0.6, shN[1] - 3.4] : [shN[0] - 2.0, shN[1] + 2.4];
    an = w === "staff" ? -1.95 : w === "spear" ? -0.2 : -0.12;
    hf = p.shield ? [shF[0] + 4.2, shF[1] + 1.6] : [shF[0] + 3.6, shF[1] + 0.2];
  } else {
    hn = w === "staff" ? [shN[0] + 3.6, shN[1] + 0.4] : w === "spear" ? [shN[0] + 3.6, shN[1] + 1.6] : [shN[0] + 5.4, shN[1] + 1.4];
    an = w === "staff" ? -1.0 : w === "spear" ? 0.02 : 0.05;
    hf = p.shield ? [shF[0] + 2.4, shF[1] + 3.4] : [shF[0] + 4.4, shF[1] + 1.8];
  }
  const twoHand = w === "spear";
  // far arm, behind (unless it helps with the spear)
  if (!twoHand) { const h = arm(ctx, shF, hf, A, { up: skinF }); if (!p.shield) fist(ctx, h[0], h[1], 0.95, skinF); }
  // legs
  leg(ctx, R, o, "far", { thigh: skinF, shin: skinF, wrap: darken(wrap, 0.2), foot: darken(wrap, 0.25) });
  leg(ctx, R, o, "near", { thigh: skin, shin: skin, wrap, foot: darken(wrap, 0.05) });
  // the tunic (or the shaman's robe), ragged at the hem, belted with rope
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const hemY = robe ? 4.4 : 1.9, sw = st.fight ? 0.4 : st.c * 0.5;
    const pts = [[2.6 + sw, hemY, 1], [1.6, hemY - 0.8, 1], [0.7 + sw * 0.5, hemY + 0.2, 1], [-0.3, hemY - 0.7, 1], [-1.3, hemY + 0.1, 1], [-2.5 - sw * 0.5, hemY - 0.4, 1],
      [-2.8, -1.6], [-2.4, -4.6], [-1.3, -6.0], [0.8, -6.1], [2.1, -5.0], [2.4, -2.5], [robe ? 2.8 : 2.3, 0.5]];
    blob(c, pts, p.cloth, {
      then: (cc) => {
        dab(cc, -3.2, -1.4, 6.4, 0.9, robe ? darken(p.cloth, 0.45) : p.cloth2 || darken(p.cloth, 0.4));
        dab(cc, 1.6, -0.6, 0.6, 1.4, p.cloth2 || darken(p.cloth, 0.4));
        if (robe) { dab(cc, -3.5, hemY - 1.2, 7, 0.9, robe); for (let i = 0; i < 3; i++) dab(cc, -2.2 + i * 1.8, hemY - 2.6, 0.6, 0.6, robe); }
        else { dab(cc, -1.6, -4.2, 1.1, 1.1, lighten(p.cloth, 0.22)); dab(cc, -1.6, -4.2, 0.5, 0.5, darken(p.cloth, 0.45)); }
        if (!p.head || p.head === "bare") dab(cc, 0.3, -6.4, 1.8, 1.2, skin);
      },
    });
    if (p.beads) for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? "#ece0c4" : lighten(p.beads, 0.1); c.beginPath(); c.arc(-0.6 + i * 0.7, -5.2 + Math.sin(i * 0.8) * 0.5 + i * 0.25, 0.4, 0, 7); c.fill(); }
  });
  // the head, pushed forward on a scrawny neck
  const nk = T(0.9, -6.0), hd = [nk[0] + 1.0 + (st.hit ? 0.6 : 0), nk[1] - 2.0];
  goblinHead(ctx, hd[0], hd[1], st.lean * 0.3, p, { k: 0.9, hood: p.head === "hood", tuft: p.head === "hood" ? null : p.hair || darken(p.cloth, 0.35), paint: p.feathers ? "#ece0c4" : null });
  if (p.feathers) {
    // a headband and a fan of feathers, back over the crown
    inFrame(ctx, hd[0], hd[1], st.lean * 0.3, (c) => {
      for (const [ang, col, l] of [[-2.35, "#c8383a", 5.2], [-1.95, p.cloth2 || "#e8c14a", 5.8], [-1.55, "#3a80c0", 4.8]]) {
        const to = along(-0.6, -2.4, ang);
        blob(c, [[...to(0, 0), 1], [...to(l * 0.5, -0.8)], [...to(l, 0), 1], [...to(l * 0.5, 0.8)]], col, { hi: 0.35 });
      }
      blob(c, [[-2.5, -2.4], [0.2, -3.2], [2.4, -2.3], [2.3, -1.5], [0.2, -2.2], [-2.4, -1.4]], p.cloth2 || "#e8c14a", { hi: 0.3 });
    });
  }
  if (p.shield) roundShield(ctx, hf[0] + 0.8, hf[1] + 0.1, 2.3, 3.0, p.shcol || "#8a6238");
  // the weapon hand
  if (twoHand) {
    hn = ik(shN[0], shN[1], hn[0], hn[1], A.up, A.fore, -1)[1];
    const to = along(hn[0], hn[1], an);
    const grip = to(-3.2);
    const h2 = arm(ctx, shF, grip, A, { up: skinF });
    spear(ctx, hn[0], hn[1], an, p.wcol || "#c4c8d0", st.hit ? 6.5 : 4.5, st.hit ? 6.5 : 8.5);
    fist(ctx, h2[0], h2[1], 0.95, skinF);
    const h = arm(ctx, shN, hn, A, { up: skin });
    fist(ctx, h[0], h[1], 1.0, skin);
  } else {
    const h = arm(ctx, shN, hn, A, { up: skin });
    if (w === "knife") knife(ctx, h[0], h[1], an, p.wcol || "#a8acb4");
    if (w === "staff") {
      const tip = staff(ctx, h[0], h[1], an, "#7a5334", 6.6, 9.4);
      const wc = p.wcol || "#7ce0b8";
      glow(ctx, tip[0], tip[1], st.fight ? 4.4 : 3.2, wc, 0.38);
      part(ctx, (c) => ball(c, tip[0], tip[1], 1.3, 1.3, wc, { hi: 0.7, lo: 0.3 }));
      if (st.fight) { ctx.fillStyle = lighten(wc, 0.5); for (let i = 0; i < 4; i++) { const t = i * 1.6 + st.f; ctx.fillRect(tip[0] + Math.cos(t) * 3.2 - 0.25, tip[1] + Math.sin(t) * 3.2 - 0.25, 0.5, 0.5); } }
    }
    fist(ctx, h[0], h[1], 1.0, skin);
  }
  ctx.restore();
};

// ---- the orcs ------------------------------------------------------------------
const ORC = { L1: 5.0, L2: 4.9, stride: 2.7, lift: 2.2, bob: 0.8, lean: 0.12, dip: 0.04, lunge: 2.6, hipW: 1.4, thigh: 3.2, shin: 2.8, foot: 3.8, ankle: 1.0 };
const orc = (ctx, p) => {
  const plate = !!p.armor, o = ORC, R = skeleton(p, o), { st, T } = R;
  const skin = p.skin, skinF = darken(skin, 0.24);
  const lea = p.cloth, dark = p.cloth2 || darken(p.cloth, 0.4);
  const steel = p.cloth;       // for the Ironclad, cloth is his plate
  shadow(ctx, 0.6, -0.1, 6.4, 1.6, 0.24);
  const shN = T(2.4, -8.2), shF = T(-2.6, -8.4);
  const A = { up: 3.5, fore: 3.3, w: plate ? 3.0 : 3.1 };
  // hands: the orc two-hands his axe; the Ironclad cuts one-handed behind a shield
  let hn, an, hf;
  if (!st.fight) {
    hn = plate ? [shN[0] + 0.6 + st.swing * 0.8, shN[1] + 6.0] : [shN[0] + 1.6 + st.swing * 0.6, shN[1] + 6.2];
    an = plate ? 1.15 - st.swing * 0.1 : 0.42 - st.swing * 0.06;
    hf = plate ? [shF[0] + 7.0, shF[1] + 6.4] : [shF[0] + 0.6 - st.swing * 1.6, shF[1] + 6.2];
  } else if (!st.hit) {
    hn = [shN[0] - 2.0, shN[1] - 3.6]; an = -2.25;
    hf = plate ? [shF[0] + 7.2, shF[1] + 5.4] : null;
  } else {
    hn = [shN[0] + 4.8, shN[1] + 3.4]; an = plate ? 0.5 : 0.78;
    hf = plate ? [shF[0] + 4.6, shF[1] + 6.6] : null;
  }
  const armCols = plate ? { up: darken(dark, 0.1), fore: steel, cuff: lighten(steel, 0.15) } : { up: skin, cuff: lea };
  const armColsF = plate ? { up: darken(dark, 0.3), fore: darken(steel, 0.25), cuff: darken(steel, 0.15) } : { up: skinF, cuff: darken(lea, 0.25) };
  // far arm (free, or behind the shield)
  if (hf && !plate) { const h = arm(ctx, shF, hf, A, armColsF); fist(ctx, h[0], h[1], 1.5, skinF); }
  if (plate) arm(ctx, shF, hf, A, armColsF);
  // legs
  const legCols = plate
    ? { thigh: dark, shin: steel, wrap: lighten(steel, 0.1), foot: darken(steel, 0.1) }
    : { thigh: darken(dark, -0.2), shin: darken(dark, -0.2), wrap: lea, foot: darken(lea, 0.25) };
  const legColsF = { thigh: darken(legCols.thigh, 0.25), shin: darken(legCols.shin, 0.25), wrap: darken(legCols.wrap, 0.25), foot: darken(legCols.foot, 0.25) };
  leg(ctx, R, o, "far", legColsF);
  const nl = leg(ctx, R, o, "near", legCols);
  if (plate) part(ctx, (c) => ball(c, nl.kn[0] + 0.2, nl.kn[1], 1.4, 1.3, lighten(steel, 0.1), { hi: 0.5, lo: 0.4 }));
  // the trunk: broad shoulders, a thick waist, the belt and what hangs from it
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    // kilt of leather strips (the orc) or a skirt of plates (the Ironclad)
    const sw = st.fight ? 0.5 : st.c * 0.5;
    const kilt = [[-4.0, -0.4], [3.8, -0.4], [4.2 + sw, 3.4, 1], [2.4, 3.9, 1], [1.2, 3.1, 1], [0, 4.0, 1], [-1.3, 3.2, 1], [-2.8 - sw * 0.5, 3.9, 1], [-4.2, 3.0, 1]];
    blob(c, kilt, plate ? dark : lea, { then: (cc) => { for (const x of [-2.1, 0.6, 2.9]) line(cc, x, 0.4, x + 0.1, 4, 0.45, darken(plate ? dark : lea, 0.45)); if (plate) for (const x of [-3, -0.8]) dab(cc, x, 1.0, 0.5, 0.5, lighten(dark, 0.55)); } });
    if (plate) blob(c, [[0.8, -1.2, 1], [3.6, -1.2, 1], [3.9 + sw * 0.6, 5.2, 1], [2.3, 4.4, 1], [0.9 + sw * 0.4, 5.4, 1]], "#7a3430", { hi: 0.25 });
    const trunk = [[3.3, 0.6], [3.9, -2.2], [4.6, -5.2], [4.9, -7.8], [3.4, -9.4], [0.4, -10.0], [-2.8, -9.7], [-4.8, -8.2], [-5.0, -5.0], [-4.2, -2.0], [-3.5, 0.6]];
    blob(c, trunk, plate ? steel : skin, {
      hi: 0.3, then: (cc) => {
        if (plate) {
          // breastplate: a centre ridge, lames at the belly, rivets
          line(cc, 1.4, -9.2, 1.8, -3.4, 0.7, lighten(steel, 0.5));
          for (const y of [-3.2, -1.8]) line(cc, -5, y, 5, y + 0.1, 0.5, darken(steel, 0.45));
          for (const [x, y] of [[-3.6, -7.2], [3.6, -7.2], [-3.8, -4.4], [3.9, -4.4]]) dab(cc, x, y, 0.55, 0.55, lighten(steel, 0.6));
        } else {
          // pecs and belly, then a leather harness over them
          cc.strokeStyle = darken(skin, 0.3); cc.lineWidth = 0.45;
          cc.beginPath(); cc.moveTo(-1.6, -5.4); cc.quadraticCurveTo(1.4, -4.2, 4.2, -5.0); cc.stroke();
          line(cc, 1.6, -4.0, 1.8, -1.6, 0.4, darken(skin, 0.3));
          line(cc, 2.8, -9.8, -3.8, -1.2, 1.5, lea);
          line(cc, 2.8, -9.8, -3.8, -1.2, 0.4, lighten(lea, 0.25));
          ball(cc, 0.1, -5.9, 0.8, 0.8, "#b8bcc4", { hi: 0.5, lo: 0.4 });
        }
        dab(cc, -5.2, -1.5, 10.4, 1.7, dark);
        dab(cc, 2.1, -1.6, 1.4, 1.9, plate ? "#c8a84a" : "#b8bcc4");
        dab(cc, 2.5, -1.2, 0.6, 1.0, dark);
      },
    });
  });
  // the head, low and forward between the shoulders
  const nk = T(1.8, -9.4), hd = [nk[0] + 1.7 + (st.hit ? 0.5 : 0), nk[1] - 1.9];
  if (plate) ironHelm(ctx, hd[0], hd[1], st.lean * 0.3, p);
  else orcHead(ctx, hd[0], hd[1], st.lean * 0.3, p, { scar: true });
  if (plate) {
    // the far pauldron shows over the back of the shoulders
    kiteShield(ctx, hf[0] + 1.0, hf[1] - 0.8, p.shcol || "#5c626e", "#8a3a2e");
    const h = arm(ctx, shN, hn, A, armCols);
    pauldron(ctx, shN[0] - 0.4, shN[1] - 0.1, 2.4, steel);
    cleaver(ctx, h[0], h[1], an, p.wcol || "#c4c8d0");
    fist(ctx, h[0], h[1], 1.5, lighten(steel, 0.1));
  } else {
    // both hands on the haft: the far one low, the near one high
    hn = ik(shN[0], shN[1], hn[0], hn[1], A.up, A.fore, -1)[1];
    const to = along(hn[0], hn[1], an);
    const low = to(st.fight ? -1.6 : 3.6);
    if (!st.fight) { heavyAxe(ctx, hn[0], hn[1], an, p.wcol || "#b8bcc4"); }
    const h2 = st.fight ? arm(ctx, shF, low, A, armColsF) : null;
    if (st.fight) heavyAxe(ctx, hn[0], hn[1], an, p.wcol || "#b8bcc4");
    if (h2) fist(ctx, h2[0], h2[1], 1.5, skinF);
    const h = arm(ctx, shN, hn, A, armCols);
    pauldron(ctx, shN[0] - 0.4, shN[1] - 0.2, 2.6, lea, true);
    fist(ctx, h[0], h[1], 1.6, skin);
  }
};
// a shoulder guard: a rounded shell with a rolled edge (and a fur trim for leather)
const pauldron = (ctx, x, y, r, col, fur) => part(ctx, (c) => {
  const pts = [[x - r, y + r * 0.5, 1], [x - r * 0.9, y - r * 0.5], [x, y - r * 0.9], [x + r * 0.9, y - r * 0.4], [x + r, y + r * 0.6, 1]];
  path(c, pts); c.fillStyle = cel(c, x - r, y - r, x + r, y + r, col, 0.4, 0.4); c.fill();
  if (fur) { for (let i = 0; i < 5; i++) dab(c, x - r + i * r * 0.45, y + r * 0.35 + (i % 2) * 0.4, 0.6, 0.9, lighten(col, 0.45)); }
  else { line(c, x - r * 0.9, y + r * 0.1, x + r * 0.9, y + r * 0.2, 0.5, darken(col, 0.4)); dab(c, x - 0.3, y - r * 0.5, 0.55, 0.55, lighten(col, 0.6)); }
});
// the Ironclad's closed helm: a bucket with a slit, tusks through the chin
const ironHelm = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const hc = p.hair || "#8a909c", eyes = p.eyes || "#e8c14a";
  blob(c0, [[-2.6, 2.6, 1], [-2.9, -0.6], [-2.2, -3.0], [0.4, -3.8], [2.6, -3.0], [3.4, -1.0], [3.6, 2.4, 1], [0.6, 3.0, 1]], hc, {
    hi: 0.4, then: (c) => {
      dab(c, 0.4, -1.2, 3.6, 1.0, "#1a1420");
      dab(c, 1.3, -1.0, 0.9, 0.55, eyes); dab(c, 2.8, -1.0, 0.6, 0.55, eyes);
      line(c, 0.2, -3.8, 0.4, 3, 0.55, lighten(hc, 0.5));
      for (const [bx, by] of [[1.6, 0.8], [2.6, 0.8], [2.1, 1.7]]) dab(c, bx, by, 0.5, 0.5, darken(hc, 0.55));
      for (const [rx, ry] of [[-1.8, 1.8], [-1.9, -1.2]]) dab(c, rx, ry, 0.55, 0.55, lighten(hc, 0.6));
    },
  });
  glow(c0, 1.9, -0.7, 1.9, eyes, 0.3);
  for (const [tx, h] of [[2.2, 1.9], [3.2, 1.5]]) { c0.fillStyle = "#ece0c4"; c0.beginPath(); c0.moveTo(tx - 0.45, 3.4); c0.lineTo(tx + 0.4, 3.4); c0.lineTo(tx + 0.2, 3.4 - h); c0.closePath(); c0.fill(); }
  // a short crest spike
  blob(c0, [[-0.4, -3.4, 1], [0.2, -5.6, 1], [1.2, -3.5, 1]], darken(hc, 0.1), { hi: 0.4 });
});
// the kite shield, held edge-forward, a painted band down its face
const kiteShield = (ctx, x, y, col, band) => part(ctx, (c) => {
  const pts = [[x - 2.4, y - 4.0, 1], [x + 2.4, y - 4.2, 1], [x + 2.6, y + 1.0], [x + 0.2, y + 5.6, 1], [x - 2.4, y + 1.0]];
  path(c, pts); c.fillStyle = cel(c, x - 2.6, y - 5, x + 2.6, y + 6, col, 0.35, 0.45); c.fill();
  c.save(); path(c, pts); c.clip();
  c.fillStyle = band; c.beginPath(); c.moveTo(x - 0.7, y - 5); c.lineTo(x + 1.0, y - 5); c.lineTo(x + 0.9, y + 6.4); c.lineTo(x - 0.5, y + 6.4); c.closePath(); c.fill();
  c.strokeStyle = lighten(col, 0.45); c.lineWidth = 0.6; path(c, pts); c.stroke();
  c.restore();
  ball(c, x + 0.2, y - 0.6, 1.0, 1.1, lighten(col, 0.2), { hi: 0.6, lo: 0.4 });
  for (const [rx, ry] of [[-1.6, -3.8], [1.8, -3.9], [-1.6, 0.8], [1.9, 0.8]]) dab(c, x + rx, y + ry, 0.5, 0.5, lighten(col, 0.6));
});

// ---- the troll ------------------------------------------------------------------
const TROLL = { L1: 5.7, L2: 5.4, stride: 3.2, lift: 2.2, bob: 1.3, lean: 0.12, dip: 0.07, lunge: 3.0, hipW: 1.8, thigh: 4.6, shin: 4.0, foot: 5.0, ankle: 1.1 };
const troll = (ctx, p) => {
  const o = TROLL, R = skeleton(p, o), { st, T } = R;
  const skin = p.skin, skinF = darken(skin, 0.26), belly = mix(skin, "#e8dcb0", 0.3), moss = mix(skin, "#86b04a", 0.55);
  shadow(ctx, 1, -0.1, 8.6, 2.0, 0.26);
  const shN = T(3.4, -14.2), shF = T(-2.2, -15.2);
  const A = { up: 5.8, fore: 5.4, w: 4.0 };
  let hn, an, hf;
  if (!st.fight) {
    hn = [shN[0] + 0.6 + st.swing * 0.5, shN[1] + 8.6]; an = -1.86 + st.swing * 0.04;
    hf = [shF[0] + 1.4 - st.swing * 2.4, shF[1] + 10.8];
  } else if (!st.hit) {
    hn = [shN[0] + 0.4, shN[1] - 4.6]; an = -1.95;
    hf = [shF[0] + 6.8, shF[1] + 3.4];
  } else {
    hn = [shN[0] + 5.0, shN[1] + 6.6]; an = 1.08;
    hf = [shF[0] - 1.6, shF[1] + 8.4];
  }
  // the far arm, long enough to drag its knuckles
  { const h = arm(ctx, shF, hf, A, { up: skinF }); fist(ctx, h[0], h[1], 2.1, skinF); }
  leg(ctx, R, o, "far", { thigh: skinF, shin: skinF, foot: skinF, toes: 3 });
  leg(ctx, R, o, "near", { thigh: skin, shin: skin, foot: skin, toes: 3 });
  // the hulk: a hump of back, a belly, a loincloth
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const body = [[-4.8, 1.6], [-6.8, -3.6], [-7.8, -9.6], [-6.6, -14.6], [-3.4, -17.6], [0.8, -17.8], [4.2, -16.2], [6.0, -12.4], [6.6, -8.6], [7.6, -4.4], [6.4, -0.6], [3.0, 1.8]];
    blob(c, body, skin, {
      hi: 0.3, lo: 0.45, then: (cc) => {
        ball(cc, 4.2, -5.0, 3.8, 4.6, belly, { hi: 0.25, lo: 0.3 });
        cc.strokeStyle = darken(skin, 0.3); cc.lineWidth = 0.5;
        cc.beginPath(); cc.moveTo(0.6, -10.6); cc.quadraticCurveTo(3.6, -9.2, 6.6, -10.0); cc.stroke();
        path(cc, [[-7.8, -9.0], [-6.8, -13.6], [-4.2, -16.4], [-0.6, -17.4], [0.4, -16.4], [-2.6, -15.2], [-4.8, -12.8], [-5.8, -9.6]]); cc.fillStyle = moss; cc.fill();
        path(cc, [[-7.6, -9.4], [-6.6, -13.2], [-4.4, -15.6], [-4.8, -13.4], [-6.2, -10.8]]); cc.fillStyle = lighten(moss, 0.25); cc.fill();
        for (const [wx, wy] of [[-3.6, -7.4], [-5.2, -4.6], [1.2, -13.6], [-2.4, -11.6]]) dab(cc, wx, wy, 0.6, 0.6, darken(skin, 0.35));
        for (const [wx, wy] of [[-4.2, -15.4], [-6.4, -11.2], [-1.2, -17.2]]) dab(cc, wx, wy, 0.5, 0.5, lighten(moss, 0.4));
      },
    });
    const sw = st.fight ? 0.6 : st.c * 0.6;
    blob(c, [[-5.4, -1.0], [6.0, -1.2], [5.6 + sw, 3.8, 1], [3.4, 3.0, 1], [1.8 + sw * 0.5, 4.6, 1], [-0.4, 3.2, 1], [-2.6, 4.2, 1], [-5.8 - sw * 0.4, 2.0, 1]], p.cloth, {
      then: (cc) => { dab(cc, -6, -1.4, 12.4, 1.2, darken(p.cloth, 0.4)); line(cc, 1.2, 0.2, 1.4, 3.6, 0.45, darken(p.cloth, 0.45)); },
    });
  });
  // the head, slung low in front of the hump
  const hd = T(8.4, -12.4);
  trollHead(ctx, hd[0] + (st.hit ? 0.8 : 0), hd[1] + (st.hit ? 0.6 : 0), st.lean * 0.4 - (st.fight && !st.hit ? 0.15 : 0), p, st.fight && !st.hit);
  // the club arm
  const h = arm(ctx, shN, hn, A, { up: skin });
  club(ctx, h[0], h[1], an, p.wcol || "#7a5a3a", 12.5);
  fist(ctx, h[0], h[1], 2.2, skin);
};
const trollHead = (ctx, x, y, a, p, roar) => inFrame(ctx, x, y, a, (c0) => {
  const skin = p.skin, eyes = p.eyes || "#e8c14a";
  // a droopy ear behind the jaw
  blob(c0, [[-1.8, -1.2], [-4.8, 0.2, 1], [-3.0, 1.2], [-1.4, 1.2]], darken(skin, 0.15));
  blob(c0, [[-2.8, 0], [-2.4, -2.6], [-0.2, -3.8], [2.6, -3.4], [3.8, -1.6], [4.4, 0.8], [4.6, 3.0], [3.4, 4.0], [0.4, 4.0], [-2.0, 2.6]], skin, {
    hi: 0.3, then: (c) => {
      path(c, [[0, -2.6, 1], [4.2, -2.0, 1], [4.0, -1.0, 1], [0.2, -1.4, 1]]); c.fillStyle = darken(skin, 0.3); c.fill();
      dab(c, 1.6, -1.2, 0.9, 0.6, eyes); dab(c, 3.1, -1.1, 0.6, 0.6, eyes);
      if (roar) { path(c, [[1.8, 1.6, 1], [4.8, 1.4, 1], [4.6, 3.6, 1], [2.2, 3.4, 1]]); c.fillStyle = "#4a1e24"; c.fill(); }
      else line(c, 1.8, 2.4, 4.4, 2.2, 0.5, darken(skin, 0.6));
    },
  });
  // underbite teeth, then the great lumpy nose over them
  c0.fillStyle = "#ece0c4";
  for (const [tx, h] of [[2.4, 1.3], [3.9, 1.6]]) { c0.beginPath(); c0.moveTo(tx - 0.45, 2.6); c0.lineTo(tx + 0.45, 2.6); c0.lineTo(tx + 0.1, 2.6 - h); c0.closePath(); c0.fill(); }
  blob(c0, [[2.6, -1.4], [5.4, -0.2], [6.4, 1.6], [5.4, 2.4], [3.8, 1.8], [2.8, 0.8]], lighten(skin, 0.05), { hi: 0.35 });
  // a few wiry tufts
  blob(c0, [[-1.6, -3.0], [-2.2, -4.8, 1], [-0.8, -3.8], [0.2, -5.2, 1], [0.8, -3.6], [-0.4, -3.2]], p.hair || "#3a3a2a", { hi: 0.3 });
});

// ---- the casters -----------------------------------------------------------------
// the necromancer: a tall pointed hood, a void where the face is, witch-fire
const NEC = { L1: 5.0, L2: 4.8, stride: 2.0, lift: 1.3, bob: 0.5, lean: 0.06, dip: 0.02, lunge: 1.8, hipW: 0.8, thigh: 2.4, shin: 2.0, foot: 3.2, ankle: 0.9 };
const necro = (ctx, p) => {
  const o = NEC, R = skeleton(p, o), { st, T } = R;
  const robe = mix(p.cloth, "#6a5a8a", 0.3), cape = mix(p.cape || p.cloth, "#4a3a5a", 0.2), trim = p.cloth2 || "#5a4a8c";
  const skin = p.skin, fire = p.wcol || "#b08ad8";
  shadow(ctx, 0.6, -0.1, 5.6, 1.4, 0.22);
  const shN = T(1.6, -9.6), shF = T(-1.8, -9.8);
  const A = { up: 3.6, fore: 3.4, w: 2.2 };
  let hn, an, hf;
  if (!st.fight) {
    hn = [shN[0] + 4.4 + st.swing * 0.4, shN[1] + 4.4]; an = -1.4 + st.swing * 0.05;
    hf = [shF[0] + 0.8 - st.swing * 1.2, shF[1] + 5.8];
  } else if (!st.hit) {
    hn = [shN[0] + 0.4, shN[1] - 1.6]; an = -1.9;
    hf = [shF[0] + 5.0, shF[1] - 0.6];
  } else {
    hn = [shN[0] + 3.8, shN[1] + 1.0]; an = -0.95;
    hf = [shF[0] + 5.8, shF[1] + 2.0];
  }
  // the cape streams out behind
  const fl = st.fight ? (st.hit ? 1.6 : 0.4) : [0.6, 1.0, 0.4, 0.8][st.f];
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => blob(c, [[-1.2, -10.4], [-3.6, -9.8], [-5.8, -3.6], [-7.2 - fl, 3.8], [-8.2 - fl, 8.0, 1], [-6.8, 7.2, 1], [-5.8 - fl * 0.5, 8.6, 1], [-4.4, 7.6, 1], [-3.2, 8.6, 1], [-2, 0]], cape, { hi: 0.3, lo: 0.35, then: (cc) => line(cc, -4.6, -4, -6.4 - fl, 7.8, 0.6, trim) }));
  // the far sleeve
  { const h = arm(ctx, shF, hf, A, { up: darken(robe, 0.3) }); bony(ctx, h[0], h[1], darken(skin, 0.2), st.fight); }
  // feet peek out under the hem
  leg(ctx, R, o, "far", { thigh: darken(robe, 0.4), shin: darken(robe, 0.4), foot: darken(robe, 0.45) });
  leg(ctx, R, o, "near", { thigh: darken(robe, 0.2), shin: darken(robe, 0.2), foot: darken(robe, 0.3) });
  // the robe, flared and ragged, a stole of witch-purple down the front
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const kick = st.fight ? (st.hit ? 1.2 : 0.4) : st.c * 0.9, hem = 8.4;
    const pts = [[4.0 + kick, hem, 1], [2.8, hem - 0.8, 1], [1.8 + kick * 0.5, hem + 0.3, 1], [0.4, hem - 0.6, 1], [-1, hem + 0.3, 1], [-2.4, hem - 0.6, 1], [-3.8 - kick * 0.4, hem, 1],
      [-3.6, 3], [-3.2, -3], [-3.0, -8.6], [-1.6, -10.4], [1.4, -10.2], [2.8, -8.6], [2.6, -4], [3.0, 2]];
    blob(c, pts, robe, {
      hi: 0.28, lo: 0.4, then: (cc) => {
        path(cc, [[0.6, -10.4, 1], [2.0, -10.4, 1], [2.9, hem + 1, 1], [1.2, hem + 1, 1]]); cc.fillStyle = trim; cc.fill();
        for (let i = 0; i < 4; i++) dab(cc, 1.5 + i * 0.12, -7 + i * 3.4, 0.5, 0.5, lighten(trim, 0.45));
        dab(cc, -3.6, -0.6, 7, 1.0, darken(trim, 0.25));
        dab(cc, 1.4, -0.9, 0.9, 1.6, "#ece0c4");
      },
    });
  });
  const hd = T(1.2, -12.4);
  necroHead(ctx, hd[0] + (st.hit ? 0.5 : 0), hd[1], st.lean * 0.4, p);
  // the staff hand
  const h = arm(ctx, shN, hn, A, { up: robe, cuff: darken(trim, 0.1) });
  const tip = staff(ctx, h[0], h[1], an, "#4a3a3a", 7.4, 10);
  bony(ctx, h[0], h[1], skin);
  // a little skull in the crook, witch-fire rising off it
  const big = st.fight ? 1.35 : 1;
  glow(ctx, tip[0], tip[1] - 1.2, 3.6 * big, fire, 0.36);
  part(ctx, (c) => { ball(c, tip[0], tip[1], 1.3, 1.2, "#e0d8c4", { hi: 0.4, lo: 0.4 }); dab(c, tip[0] - 0.1, tip[1] - 0.3, 0.5, 0.5, "#2a2230"); dab(c, tip[0] + 0.7, tip[1] - 0.3, 0.5, 0.5, "#2a2230"); });
  flame(ctx, tip[0] + 0.1, tip[1] - 1.0, 1.4 * big, 3.6 * big, fire, st.f);
};
const bony = (ctx, x, y, col, splay) => part(ctx, (c) => {
  ball(c, x, y, 0.9, 0.9, col, { hi: 0.4, lo: 0.4 });
  if (splay) for (const a of [-0.8, -0.2, 0.4]) line(c, x, y, x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 0.45, col);
});
// a tongue of flame: a teardrop with a hot core
const flame = (ctx, x, y, w, h, col, f = 0) => part(ctx, (c) => {
  const lean = (f % 2 ? 0.4 : -0.3);
  path(c, [[x - w, y, 1], [x - w * 0.8, y - h * 0.45], [x + lean, y - h, 1], [x + w * 0.9, y - h * 0.4], [x + w, y, 1], [x, y + w * 0.6]]);
  c.fillStyle = col; c.fill();
  path(c, [[x - w * 0.45, y, 1], [x + lean * 0.5, y - h * 0.6, 1], [x + w * 0.45, y, 1], [x, y + w * 0.3]]);
  c.fillStyle = lighten(col, 0.6); c.fill();
});
const necroHead = (ctx, x, y, a, p) => inFrame(ctx, x, y, a, (c0) => {
  const hood = mix(p.hair || p.cloth, "#6a5a88", 0.42), eyes = p.eyes || "#b08ad8";
  blob(c0, [[-2.8, 2.6, 1], [-3.4, -0.6], [-2.8, -3.0], [-5.0, -6.0, 1], [-0.8, -4.4], [1.8, -3.6], [3.2, -1.4], [3.4, 1.4], [2.4, 2.8, 1]], hood, {
    hi: 0.35, lo: 0.4, then: (c) => {
      c.fillStyle = "#140e1a"; c.beginPath(); c.ellipse(1.9, 0.1, 1.5, 2.2, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = p.skin; c.beginPath(); c.ellipse(2.1, 1.6, 1.0, 0.7, 0, 0, Math.PI); c.fill();
      dab(c, 1.2, -0.5, 0.6, 0.6, eyes); dab(c, 2.5, -0.5, 0.6, 0.6, eyes);
      line(c, -2.6, -2.6, -0.2, 2.2, 0.5, darken(hood, 0.4));
    },
  });
  glow(c0, 1.9, -0.3, 2.2, eyes, 0.34);
});

// ---- the warchief -------------------------------------------------------------------
const HOB = { L1: 5.4, L2: 5.2, stride: 2.8, lift: 2.2, bob: 0.8, lean: 0.14, dip: 0.04, lunge: 2.6, hipW: 1.3, thigh: 3.0, shin: 2.6, foot: 3.8, ankle: 1.0 };
const hobgoblin = (ctx, p) => {
  const o = HOB, R = skeleton(p, o), { st, T } = R;
  const skin = p.skin, skinF = darken(skin, 0.24), lea = p.cloth, gold = p.cloth2 || "#e8c14a";
  const fur = mix(p.cloth, "#b8ab90", 0.55);
  shadow(ctx, 0.6, -0.1, 6.2, 1.6, 0.24);
  const shN = T(2.2, -8.8), shF = T(-2.4, -9.0);
  const A = { up: 3.7, fore: 3.5, w: 2.8 };
  let hn, an, hf;
  if (!st.fight) {
    hn = [shN[0] + 1.4 + st.swing * 1.0, shN[1] + 6.2]; an = 0;
    hf = [shF[0] - 1.4 + st.swing * 0.3, shF[1] + 5.4];
  } else if (!st.hit) {
    hn = [shN[0] - 0.2, shN[1] - 4.2]; an = -2.05;
    hf = [shF[0] + 5.6, shF[1] + 1.0];
  } else {
    hn = [shN[0] + 4.2, shN[1] + 2.4]; an = 0.62;
    hf = [shF[0] + 1.0, shF[1] + 5.6];
  }
  // marching, the standard rides in the far hand behind him; in a fight he swings it
  { const h = arm(ctx, shF, hf, A, { up: skinF, cuff: darken(gold, 0.35) }); if (!st.fight) totem(ctx, h[0], h[1], -1.66 - st.swing * 0.04, p, st.f); fist(ctx, h[0], h[1], 1.4, skinF); }
  leg(ctx, R, o, "far", { thigh: skinF, shin: skinF, wrap: darken(fur, 0.35), foot: darken(lea, 0.55) });
  leg(ctx, R, o, "near", { thigh: skin, shin: skin, wrap: fur, foot: darken(lea, 0.35) });
  inFrame(ctx, R.hip[0], R.hip[1], st.lean, (c) => {
    const sw = st.fight ? 0.5 : st.c * 0.5;
    blob(c, [[-3.8, -0.4], [3.6, -0.4], [4.0 + sw, 3.6, 1], [2.2, 4.2, 1], [0.8, 3.2, 1], [-0.6, 4.2, 1], [-2.2, 3.2, 1], [-4.0 - sw * 0.4, 3.8, 1]], lea, { then: (cc) => { for (const x of [-1.4, 1.5]) line(cc, x, 0.2, x, 4, 0.45, darken(lea, 0.45)); } });
    const trunk = [[3.2, 0.6], [3.8, -2.6], [4.2, -6.0], [4.0, -8.4], [2.4, -9.8], [-0.4, -10.3], [-3.2, -9.8], [-4.6, -8.0], [-4.6, -4.6], [-3.9, -1.8], [-3.3, 0.6]];
    blob(c, trunk, lea, {
      then: (cc) => {
        // a studded cuirass with a gold-bossed belt
        line(cc, -3.6, -8.6, 3.4, -1.8, 1.3, darken(lea, 0.35));
        for (const [sx, sy] of [[-1.8, -6.8], [1.6, -3.3]]) dab(cc, sx, sy, 0.6, 0.6, gold);
        line(cc, 2.8, -9.6, 3.4, -2.0, 0.45, lighten(lea, 0.25));
        dab(cc, -5, -1.6, 10, 1.6, darken(lea, 0.45));
        ball(cc, 2.2, -0.8, 1.1, 1.0, gold, { hi: 0.5, lo: 0.4 });
      },
    });
    // the fur mantle over the shoulders
    blob(c, [[-5.0, -6.6, 1], [-5.2, -9.0], [-2.4, -11.0], [1.4, -11.0], [4.4, -9.2], [4.8, -7.0, 1], [3.8, -7.6, 1], [2.8, -6.6, 1], [1.6, -7.6, 1], [0.4, -6.8, 1], [-0.8, -7.8, 1], [-2.0, -6.8, 1], [-3.2, -7.6, 1], [-4.2, -6.6, 1]], fur, {
      hi: 0.35, lo: 0.4, then: (cc) => { for (let i = 0; i < 6; i++) line(cc, -4.2 + i * 1.6, -8.2, -3.6 + i * 1.6, -7.2, 0.45, darken(fur, 0.35)); },
    });
  });
  const nk = T(1.4, -10.0), hd = [nk[0] + 1.3 + (st.hit ? 0.5 : 0), nk[1] - 2.4];
  hobHead(ctx, hd[0], hd[1], st.lean * 0.3, p);
  const h = arm(ctx, shN, hn, A, { up: skin, cuff: gold });
  if (st.fight) totem(ctx, h[0], h[1], an, p, st.f);
  fist(ctx, h[0], h[1], 1.5, skin);
};
const hobHead = (ctx, x, y, a, p) => {
  goblinHead(ctx, x, y, a, { ...p, skin: p.skin }, { paint: "#c8383a" });
  inFrame(ctx, x, y, a, (c0) => {
    const iron = mix(p.cloth, "#8a909c", 0.75), horn = "#e8dfc6";
    // the far horn, then the iron cap, then the near horn sweeping up and back
    blob(c0, [[0.8, -2.4], [2.6, -4.4], [2.4, -7.0, 1], [3.8, -4.6], [2.0, -2.0]], darken(horn, 0.15), { hi: 0.3 });
    blob(c0, [[-2.5, -1.2, 1], [-2.4, -2.6], [-0.6, -3.8], [1.6, -3.4], [2.7, -1.8, 1], [1.2, -1.9], [-1.0, -1.5]], iron, { hi: 0.45, then: (c) => { dab(c, -2.6, -1.9, 5.4, 0.6, darken(iron, 0.4)); for (const rx of [-1.6, 0.2, 1.8]) dab(c, rx, -1.9, 0.5, 0.5, lighten(iron, 0.6)); } });
    blob(c0, [[-1.2, -2.6], [-3.4, -4.2], [-3.6, -7.6, 1], [-2.0, -5.0], [-0.2, -3.4]], horn, { hi: 0.4, then: (c) => { for (const yy of [-4.4, -5.6]) line(c, -4, yy, -1.6, yy + 0.6, 0.4, darken(horn, 0.35)); } });
  });
};
// the war totem: a pole, a crossbar hung with feathers and a torn pennant,
// and a horned skull at the top
const totem = (ctx, x, y, a, p, f) => {
  const to = along(x, y, a);
  const up = p.pose === "fight" ? 13.4 : 17.6, bone = p.wcol || "#e8dfc6";
  part(ctx, (c) => { haft(c, to, -7.4, up, 1.4, "#7a5334"); for (const u of [-3, 4]) tube(c, ...to(u - 0.5), ...to(u + 0.5), 1.8, darken(p.cloth2 || "#e8c14a", 0.2)); });
  // crossbar, pennant and feathers hang toward the ground whichever way the pole points
  const [bx, by] = to(up - 3.6), n = [-Math.sin(a), Math.cos(a)];
  const side = n[0] > 0 ? -1 : 1;
  const bar0 = [bx - side * n[0] * 2.4, by - side * n[1] * 2.4], bar1 = [bx + side * n[0] * 2.4 * 0.3, by + side * n[1] * 2.4 * 0.3];
  part(ctx, (c) => tube(c, ...bar0, ...bar1, 1.0, "#6a4a2e"));
  const flap = f % 2 ? 0.6 : -0.4;
  part(ctx, (c) => {
    const [px, py] = bar0;
    const pts = [[px, py, 1], [bx, by, 1], [bx - 0.6 + flap, by + 4.6, 1], [bx - 1.6 + flap, by + 3.4, 1], [px - 0.4 + flap, by + 5.2, 1]];
    path(c, pts); c.fillStyle = cel(c, px, py, bx, by + 5, "#a8403a", 0.3, 0.4); c.fill();
    dab(c, px + 0.8, py + 1.2, 0.8, 0.8, bone);
  });
  for (const [i, col] of [[0, "#c8383a"], [1, "#3a80c0"]]) {
    const fx = bar0[0] - 0.4 + i * 0.1, fy = bar0[1] + 0.4;
    blob(ctx, [[fx, fy, 1], [fx - 0.6 + flap * 0.5, fy + 1.6], [fx - 0.2 + flap, fy + 3.2, 1], [fx + 0.5, fy + 1.6]], col, { hi: 0.3 });
  }
  // the skull, horned, grinning
  const [sx, sy] = to(up + 0.6);
  part(ctx, (c) => {
    for (const s of [-1, 1]) { c.strokeStyle = darken(bone, 0.1); c.lineWidth = 0.9; c.lineCap = "round"; c.beginPath(); c.moveTo(sx + s * 1.2, sy - 1.0); c.quadraticCurveTo(sx + s * 3.2, sy - 1.6, sx + s * 2.8, sy - 3.6); c.stroke(); }
  });
  part(ctx, (c) => {
    ball(c, sx, sy, 2.0, 2.1, bone, { hi: 0.4, lo: 0.4 });
    dab(c, sx - 1.0, sy - 0.4, 0.8, 0.8, "#2a2230"); dab(c, sx + 0.5, sy - 0.4, 0.8, 0.8, "#2a2230");
    dab(c, sx - 0.2, sy + 0.6, 0.5, 0.5, "#2a2230");
    for (let i = 0; i < 3; i++) dab(c, sx - 0.8 + i * 0.6, sy + 1.4, 0.4, 0.5, darken(bone, 0.4));
  });
};

// ---- the roster -------------------------------------------------------------------
const G = "#6aa04f";
export const HORDE_RIGS = {
  goblin: { kind: "hGoblin", box: { hw: 16, up: 26, down: 4 }, p: { h: 20, skin: G, cloth: "#5f4326", cloth2: "#3c2a18", head: "hood", hair: "#5a4630", eyes: "#c8453a", weapon: "knife", wcol: "#a8acb4", shield: "round", shcol: "#8a6238" } },
  goblinBare: { kind: "hGoblin", box: { hw: 16, up: 26, down: 4 }, p: { h: 20, skin: G, cloth: "#6e4c28", cloth2: "#3c2a18", head: "bare", hair: "#3a2a1c", eyes: "#c8453a", weapon: "knife", wcol: "#a8acb4" } },
  rafter: { kind: "hGoblin", box: { hw: 19, up: 26, down: 4 }, p: { h: 20, skin: G, cloth: "#6e4c28", cloth2: "#3c2a18", head: "bare", hair: "#3a2a1c", eyes: "#c8453a", weapon: "spear", wcol: "#b8bcc4" } },
  shaman: { kind: "hGoblin", box: { hw: 18, up: 30, down: 4 }, p: { h: 21, skin: G, cloth: "#8a4a3a", cloth2: "#e8c14a", robe: "#e8c14a", head: "bare", hair: "#3a2a1c", eyes: "#c8453a", feathers: true, beads: "#c8383a", weapon: "staff", wcol: "#7ce0b8" } },
  orc: { kind: "hOrc", box: { hw: 21, up: 36, down: 4 }, p: { h: 27, skin: "#5a8a3c", cloth: "#6a4a32", cloth2: "#2e2218", hair: "#2a1a10", eyes: "#e8c14a", wcol: "#b8bcc4" } },
  armored: { kind: "hOrc", box: { hw: 20, up: 35, down: 4 }, p: { h: 26, skin: "#5a8a3c", cloth: "#7a808c", cloth2: "#4a4e58", armor: true, hair: "#9aa0ac", eyes: "#e8c14a", wcol: "#c4c8d0", shcol: "#5c626e" } },
  troll: { kind: "hTroll", box: { hw: 26, up: 46, down: 4 }, p: { h: 36, skin: "#7a8a5a", cloth: "#5a4a3a", hair: "#3a3a2a", eyes: "#e8c14a", wcol: "#7a5a3a" } },
  necro: { kind: "hNecro", box: { hw: 21, up: 38, down: 4 }, p: { h: 28, skin: "#c8c0b0", cloth: "#2a2434", cloth2: "#5a4a8c", hair: "#1e1826", eyes: "#b08ad8", cape: "#2a2434", wcol: "#b08ad8" } },
  hobgoblin: { kind: "hHob", box: { hw: 24, up: 42, down: 4 }, p: { h: 30, skin: "#7a9a48", cloth: "#5a3a2a", cloth2: "#e8c14a", ears: "long", eyes: "#e05248", wcol: "#e8dfc6" } },
};
export const HORDE_PAINTERS = { hGoblin: goblin, hOrc: orc, hTroll: troll, hNecro: necro, hHob: hobgoblin };
