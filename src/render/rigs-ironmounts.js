// ============ RIGS: THE IRON KINGDOM'S MOUNTS AND ENGINES (cavalier, gryphon, ram) ============
// Bespoke bodies that override the generic entries in rigs.js (same shape:
// { kind, box: { hw, up, down }, p, fly? }); IRONMOUNT_PAINTERS maps each new
// `kind` to its painter (ctx, p) — pose is p.pose ("walk" | "fight") and
// p.frame (0-3 walk, 0-1 fight), feet at 0,0, facing +x. Frames are baked
// once and inked by rigs.js. A flier's "fly" sheet is its walk sheet.
//
//   cavalier  a black destrier under an oxblood caparison (the grey tower on
//             its flank, a steel chanfron and crinet), galloping for real on
//             four beats; a knight in blued plate with a couched, striped
//             lance and a small heater shield. Fight: rear, then the strike.
//   gryphon   an armoured war-gryphon — eagle head, hooked beak, lion haunch
//             and tufted tail — in visible plate (head plate, crinet, peytral,
//             crupper, lames down each wing's leading edge, greaves over the
//             talons) under an oxblood saddle cloth; the same knight rides it
//             with the lance raised. Its walk/fly frames are the wingbeat.
//   ram       a long ram-shed on six wheels: an oxblood hide roof lashed with
//             rope and plated in iron at the front, the grey tower painted on
//             it, a pennant at the back; an iron ram's-head casting on a
//             banded log pokes out the front, and the crew's legs push
//             beneath. The wheels turn with the walk; the ram draws back and
//             strikes in the fight.
//
// A compact Iron rider (blued plate, oxblood surcoat, sallet) is built here —
// the foot soldiers live in rigs-iron.js. Colours ride in the params (skin,
// cloth = steel, cloth2 = surcoat, cape = caparison / hides, hair = black-iron
// trim, col / belly / mane / wing for the beasts and oak), so revive() and the
// white hit-flash reach everything.

import { lighten, darken, lin, part, shadow } from "./paint.js";

// ---- the kit ------------------------------------------------------------------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const q = (v) => Math.round(v * 2) / 2;               // snap to the art pixel
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot = ([x, y], [px, py], a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
const SUNV = [-0.59, -0.81];
const BRASS = "#b8903e", WOOD = "#6a4a2e", HOOF = "#2a2226", INKY = "#1a1420";

// a closed path; points are [x, y] (rounded through) or [x, y, 1] (a corner)
const path = (c, pts) => {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const s = pts[0][2] ? pts[0] : mid(pts[n - 1], pts[0]);
  c.beginPath(); c.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], nx = pts[(i + 1) % n];
    if (p[2]) c.lineTo(p[0], p[1]);
    else { const m = nx[2] ? nx : mid(p, nx); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  }
  c.closePath();
};
const poly = (c, pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); };
// three cel tones across a box, lit from the upper left
const cel = (c, x0, y0, x1, y1, col, hi = 0.32, lo = 0.42) => lin(c, x0, y0, x1, y1, [[0, lighten(col, hi)], [0.5, col], [1, darken(col, lo)]]);
const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const fillPath = (c, pts, col, o = {}) => { path(c, pts); c.fillStyle = cel(c, ...(o.box || bbox(pts)), col, o.hi, o.lo); c.fill(); };
// a lit shape as its own inked part; o.then paints inside it, clipped
const blob = (ctx, pts, col, o = {}) => part(ctx, (c) => {
  fillPath(c, pts, col, o);
  if (o.then) { c.save(); path(c, pts); c.clip(); o.then(c); c.restore(); }
});
const dab = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const line = (c, x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
const polyline = (c, pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.stroke(); };
// a round limb segment shaded across its width, the lit side toward the sun
const tube = (c, x0, y0, x1, y1, w, col) => {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  let nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  if (nx * SUNV[0] + ny * SUNV[1] < 0) { nx = -nx; ny = -ny; }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  c.strokeStyle = lin(c, mx + nx * w / 2, my + ny * w / 2, mx - nx * w / 2, my - ny * w / 2, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.42)]]);
  c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
};
// a tapering tube through pts, ws = width at each point (fills with the current style)
const taper = (c, pts, ws) => {
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i], r = ws[i] / 2;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (i + 1 < pts.length) {
      const [x2, y2] = pts[i + 1], r2 = ws[i + 1] / 2;
      const dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      c.beginPath(); c.moveTo(x + nx * r, y + ny * r); c.lineTo(x2 + nx * r2, y2 + ny * r2); c.lineTo(x2 - nx * r2, y2 - ny * r2); c.lineTo(x - nx * r, y - ny * r); c.closePath(); c.fill();
    }
  }
};
// two-bone reach: the middle joint for a limb from a to b; bend +1 folds the
// joint toward -x (an elbow, a hock), -1 toward +x (a knee)
const ik = (a, b, l1, l2, bend) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const t = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1), -1, 1));
  const ang = Math.atan2(dy, dx) + bend * t;
  return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
};
// draw fn in a frame turned by a about (px, py), then moved by (dx, dy)
const inFrame = (ctx, dx, dy, px, py, a, fn) => { ctx.save(); ctx.translate(dx + px, dy + py); ctx.rotate(a); ctx.translate(-px, -py); fn(ctx); ctx.restore(); };

// the Iron device: a grey iron tower (crenels, a dark door) centred on (x, y)
const tower = (c, x, y, s, col) => {
  const w = 2.6 * s, h = 3.4 * s;
  dab(c, x - w / 2, y - h / 2, w, h, col);
  for (const k of [0, 1, 2]) dab(c, x - w / 2 - 0.3 * s + k * (w / 2 + 0.15 * s) - (k === 1 ? 0.15 * s : 0), y - h / 2 - 1 * s, 1 * s, 1.1 * s, col);
  dab(c, x - w / 2, y - h / 2, w * 0.35, h, lighten(col, 0.3));
  dab(c, x - 0.4 * s, y + h / 2 - 1.3 * s, 0.9 * s, 1.3 * s, darken(col, 0.6));
};

// ---- the Iron rider ----------------------------------------------------------------
// Hip at (0, 0) on the saddle, facing +x. o: lean (radians, + forward), lance
// (angle), hand (where the near fist holds the lance), rein (the far fist),
// fl (pennon flutter), up (the lance raised as a flier carries it).
const helm = (ctx, x, y, a, p) => inFrame(ctx, x, y, 0, 0, a, (c0) => {
  const steel = p.cloth, coat = p.cloth2, iron = p.hair;
  // the oxblood horsehair crest, swept back
  blob(c0, [[0.6, -3.0], [-0.6, -4.4], [-2.8, -4.6], [-4.8, -3.4, 1], [-3.0, -3.3], [-1.6, -2.6]], coat, { hi: 0.35, lo: 0.4, then: (c) => line(c, -0.6, -3.9, -3.6, -3.8, 0.4, lighten(coat, 0.3)) });
  // the sallet: a rounded bowl, a long tail over the nape, the visor down
  blob(c0, [[-2.4, 1.0], [-2.7, -1.0], [-2.1, -2.7], [-0.3, -3.4], [1.7, -3.1], [2.8, -1.8], [3.1, 0.0, 1], [2.9, 1.4], [2.0, 2.4], [0.2, 2.7], [-1.4, 2.2], [-3.2, 2.4, 1], [-4.4, 1.9, 1]], steel, {
    hi: 0.55, lo: 0.4, then: (c) => {
      dab(c, 0.5, -0.9, 3, 0.75, INKY);                                   // the sight
      dab(c, 1.9, -0.9, 0.5, 0.4, "#e0b08a");                             // a glint of the man
      dab(c, -4.5, 0.6, 7.6, 0.5, iron);                                  // the bevor's rim
      line(c, -0.6, -3.1, -2.2, -0.6, 0.45, lighten(steel, 0.65));
      for (const [rx, ry] of [[-1.6, 1.4], [0.2, 1.6], [1.8, 1.4]]) dab(c, rx, ry, 0.45, 0.45, BRASS);
    },
  });
});

const rider = (ctx, p, o) => {
  const steel = p.cloth, coat = p.cloth2, iron = p.hair;
  const L = o.lean || 0;
  const T = (x, y) => rot([x, y], [0, 0], L);
  // far arm: the reins and the small heater shield on the forearm
  const fsh = T(0.1, -7.2), rein = o.rein || [4.4, -4.4];
  const fel = ik(fsh, rein, 3.1, 3.2, 1);
  part(ctx, (c) => { tube(c, ...fsh, ...fel, 1.8, darken(steel, 0.3)); tube(c, ...fel, ...rein, 1.6, darken(steel, 0.3)); });
  // near leg, long in the stirrup, plated
  const kn = [4.2, 3.2], an = [3.6, 7.6];
  part(ctx, (c) => { tube(c, 0.6, 0.2, ...kn, 2.8, steel); tube(c, ...kn, ...an, 2.1, steel); });
  part(ctx, (c) => {
    path(c, [[2.6, 7.0], [4.6, 6.8], [6.4, 8.0], [6.6, 8.8, 1], [2.8, 8.9, 1]]); c.fillStyle = cel(c, 2.6, 6.8, 6.6, 8.9, darken(steel, 0.1)); c.fill();
    dab(c, 3.6, 2.4, 1.2, 1.1, lighten(steel, 0.6));                        // the knee cop
    line(c, 2.4, 9.4, 5.6, 9.4, 0.6, iron);                                 // the stirrup tread
  });
  // the torso: oxblood surcoat over the breastplate, a belt, a skirt
  inFrame(ctx, 0, 0, 0, 0, L, (c0) => {
    blob(c0, [[-2.5, 0.8, 1], [-2.8, -3.0], [-2.4, -6.4], [-1.1, -7.9], [0.9, -8.0], [2.3, -6.9], [2.8, -4.3], [2.4, -1.6], [2.9, 0.8, 1]], coat, {
      hi: 0.32, lo: 0.42, then: (c) => {
        fillPath(c, [[0.9, -8.2], [2.6, -7.2], [3.2, -4.6], [1.8, -4.8], [1.2, -6.8]], steel, { hi: 0.55, lo: 0.3 });  // the breastplate at the arm-hole
        dab(c, -3, -2.6, 6.2, 0.9, iron); dab(c, 1.0, -2.6, 0.9, 0.9, BRASS);
        line(c, -1.6, -6.6, -2.2, -3.6, 0.45, lighten(coat, 0.3));
      },
    });
    blob(c0, [[-1.0, -8.4], [0.8, -8.8], [1.6, -7.8], [-0.4, -7.4]], steel, { hi: 0.5 });   // the gorget
  });
  blob(ctx, [[-2.8, -1.4], [2.4, -1.6], [5.0, 1.2], [4.6, 2.6, 1], [3.6, 1.9], [2.6, 3.0, 1], [1.4, 2.2], [0.0, 3.0, 1], [-1.2, 2.2], [-2.8, 2.6, 1]], coat, { hi: 0.3, lo: 0.45 });
  if (o.shield !== false) {
    const sc = o.shieldAt || [6.0, -8.4];
    const [x, y] = sc;
    blob(ctx, [[x - 2.3, y - 2.8, 1], [x + 2.3, y - 2.8, 1], [x + 2.4, y + 0.2], [x + 0.9, y + 2.2], [x, y + 3.2, 1], [x - 0.9, y + 2.2], [x - 2.4, y + 0.2]], coat, {
      hi: 0.35, lo: 0.45, then: (c) => {
        tower(c, x, y + 0.2, 0.85, lighten(steel, 0.25));
        c.strokeStyle = iron; c.lineWidth = 0.8; path(c, [[x - 2.3, y - 2.8, 1], [x + 2.3, y - 2.8, 1], [x + 2.4, y + 0.2], [x + 0.9, y + 2.2], [x, y + 3.2, 1], [x - 0.9, y + 2.2], [x - 2.4, y + 0.2]]); c.stroke();
        dab(c, x - 2.1, y - 2.7, 4.2, 0.45, lighten(steel, 0.5));
      },
    });
  }
  helm(ctx, ...T(1.0, -10.4), L * 0.6, p);
  // the lance: couched under the near arm (or raised, on a gryphon), striped
  // in the colours, a vamplate at the grip and a swallow-tailed pennon
  const hand = o.hand || [2.8, -4.8], a = o.lance ?? 0, dir = [Math.cos(a), Math.sin(a)], nrm = [-dir[1], dir[0]];
  const U = (u, v = 0) => [hand[0] + dir[0] * u + nrm[0] * v, hand[1] + dir[1] * u + nrm[1] * v];
  const LL = o.len || 23;
  part(ctx, (c) => {
    // pennon first, the shaft over its root
    const fl = o.fl || 0;
    c.fillStyle = cel(c, ...U(LL - 5.5, -1), ...U(LL - 12, 3), coat, 0.3, 0.4);
    c.beginPath(); c.moveTo(...U(LL - 4.2)); c.lineTo(...U(LL - 9.5, -2.6 - fl)); c.lineTo(...U(LL - 8.2, -1.6 - fl * 0.5)); c.lineTo(...U(LL - 10.4, -0.4 - fl)); c.lineTo(...U(LL - 6.2, 0.2)); c.closePath(); c.fill();
    c.fillStyle = lighten(steel, 0.35); c.beginPath(); c.moveTo(...U(LL - 4.4, -0.4)); c.lineTo(...U(LL - 8.6, -1.9 - fl * 0.8)); c.lineTo(...U(LL - 8.4, -1.4 - fl * 0.7)); c.lineTo(...U(LL - 4.8, -0.1)); c.closePath(); c.fill();
    c.fillStyle = WOOD; taper(c, [U(-7.5), U(0), U(LL)], [1.2, 1.5, 0.8]);
    c.strokeStyle = coat; c.lineWidth = 1.1;
    for (let u = 1.5; u < LL - 1; u += 3) { c.beginPath(); c.moveTo(...U(u, -0.8)); c.lineTo(...U(u + 1.2, 0.8)); c.stroke(); }
    c.fillStyle = cel(c, ...U(LL, -1), ...U(LL + 3.8, 1), lighten(steel, 0.25), 0.5, 0.35);
    c.beginPath(); c.moveTo(...U(LL - 0.4, -0.9)); c.lineTo(...U(LL + 3.8)); c.lineTo(...U(LL - 0.4, 0.9)); c.closePath(); c.fill();
  });
  part(ctx, (c) => {        // the vamplate, a steel cone guarding the fist
    c.fillStyle = cel(c, ...U(0.6, -2.4), ...U(2.8, 2.4), steel, 0.55, 0.4);
    c.beginPath(); c.moveTo(...U(1.0, -1.7)); c.lineTo(...U(2.8, -0.6)); c.lineTo(...U(2.8, 0.6)); c.lineTo(...U(1.0, 1.7)); c.closePath(); c.fill();
  });
  // near arm, the lance clamped under it, the gauntlet on the grip
  const sh = T(0.5, -6.7);
  const el = ik(sh, hand, 3.2, 3.6, o.up ? -1 : 1);
  part(ctx, (c) => { tube(c, ...sh, ...el, 2.2, steel); tube(c, ...el, ...hand, 2.0, steel); });
  part(ctx, (c) => { c.fillStyle = cel(c, hand[0] - 1.2, hand[1] - 1.2, hand[0] + 1.2, hand[1] + 1.2, steel, 0.5, 0.4); c.beginPath(); c.ellipse(hand[0] + 0.2, hand[1], 1.2, 1.1, 0, 0, TAU); c.fill(); });
  // the pauldron over the near shoulder
  blob(ctx, [[sh[0] - 2.0, sh[1] + 1.2, 1], [sh[0] - 1.8, sh[1] - 0.8], [sh[0] - 0.2, sh[1] - 1.9], [sh[0] + 1.6, sh[1] - 1.1], [sh[0] + 2.1, sh[1] + 1.1, 1]], steel, {
    hi: 0.55, lo: 0.42, then: (c) => { line(c, sh[0] - 1.8, sh[1] + 0.2, sh[0] + 1.9, sh[1] + 0.3, 0.5, iron); dab(c, sh[0] - 0.8, sh[1] - 1.2, 0.55, 0.55, lighten(steel, 0.7)); },
  });
};

// ---- the destrier -----------------------------------------------------------------
// A four-beat gallop: fn/ff/hn/hf = near fore, far fore, near hind, far hind
// as [hoof x, hoof y (0 = ground), pastern lean]. The body turns by `pitch`
// about the hind hip; hem lifts the caparison's front and sweeps its back.
const HORSE_RUN = [
  // the hinds land under the body, the forelegs fold up to reach
  { bob: -0.5, pitch: 0.03, head: 0.06, tail: 0.2, hem: [0.8, 0.4], fn: [10.5, -4.5, -1.3], ff: [13, -2.5, -0.5], hn: [-6.5, 0, 0.45], hf: [-3.5, 0, 0.3], lance: -0.08, fl: 0.4 },
  // stretched out: forefeet reaching, hinds driving off behind
  { bob: -1, pitch: 0, head: -0.06, tail: -0.6, hem: [1.4, 1.2], fn: [15, -2, 0.1], ff: [12.5, -0.5, 0.3], hn: [-14.5, -1.5, -0.9], hf: [-12, 0, -0.45], lance: -0.1, fl: 1.2 },
  // the leading forefoot strikes; the hinds swing through
  { bob: 0, pitch: 0.05, head: 0.12, tail: 0.4, hem: [0, 0.6], fn: [10, 0, 0.5], ff: [5.5, -1.8, -0.8], hn: [-10.5, -3.5, 0.3], hf: [-8, -2.5, 0.2], lance: -0.06, fl: 0 },
  // gathered in the air, all four tucked under
  { bob: -1.5, pitch: -0.03, head: 0, tail: 1, hem: [0.4, 1.6], fn: [6.5, -4, -1.5], ff: [8.5, -3.5, -1.1], hn: [-4, -3, 0.9], hf: [-6, -2.5, 0.6], lance: -0.09, fl: 0.8 },
];
const HORSE_FIGHT = [
  // rearing, forehooves up, the lance drawn back and high
  { bob: 0, pitch: -0.3, dx: -1, head: -0.3, tail: 1.6, hem: [-0.4, 0], fn: [11.5, -9.5, -1.4], ff: [14, -7.5, -0.9], hn: [-6.5, 0, 0.4], hf: [-4, 0, 0.3], lance: -0.5, thrust: -1.6, lean: -0.18, fl: 1.4 },
  // the strike: the whole weight thrown forward down the lance
  { bob: 0.5, pitch: 0.07, dx: 2, head: 0.16, tail: -0.5, hem: [1, 1], fn: [15, 0, 0.4], ff: [11.5, -1, 0], hn: [-9, 0, 0.3], hf: [-12.5, -1.5, -0.6], lance: 0.1, thrust: 3.2, lean: 0.26, fl: 0.6 },
];
const FORE = { l1: 5, l2: 4.1, pas: 1.4, ws: [2.9, 1.9, 1.5], bend: -1 };
const HIND = { l1: 4.9, l2: 4.7, pas: 1.4, ws: [3.4, 2.1, 1.5], bend: 1 };
const PIV = [-8, -10.5];

const horseLeg = (ctx, root, [hx, hy, lean], o, col, sock) => {
  const rt = [root[0] + clamp((hx - root[0]) * 0.25, -2, 2), root[1]];
  const Ht0 = [hx, hy - 1.15];
  const fk0 = [Ht0[0] - Math.sin(lean) * o.pas, Ht0[1] - Math.cos(lean) * o.pas];
  const dx = fk0[0] - rt[0], dy = fk0[1] - rt[1], d = Math.hypot(dx, dy) || 1, m = Math.min(d, o.l1 + o.l2 - 0.05);
  const fk = [rt[0] + dx / d * m, rt[1] + dy / d * m];
  const kn = ik(rt, fk, o.l1, o.l2, o.bend);
  const ht = [fk[0] + Ht0[0] - fk0[0], fk[1] + Ht0[1] - fk0[1]];
  part(ctx, (c) => {
    c.fillStyle = col; taper(c, [rt, kn, fk], o.ws);
    c.fillStyle = lighten(col, 0.25); taper(c, [lerp(rt, kn, 0.4), kn, lerp(kn, fk, 0.5)].map(([x, y]) => [x - 0.5, y]), [0.6, 0.6, 0.5]);
    // white stockings, feathered at the fetlock
    c.fillStyle = sock; taper(c, [lerp(kn, fk, 0.7), fk, ht], [1.6, 2.2, 2.0]);
    c.fillStyle = lighten(sock, 0.3); taper(c, [lerp(kn, fk, 0.75), fk].map(([x, y]) => [x - 0.45, y]), [0.5, 0.6]);
    // the hoof, toe forward along the pastern
    const dl = Math.hypot(ht[0] - fk[0], ht[1] - fk[1]) || 1, dd = [(ht[0] - fk[0]) / dl, (ht[1] - fk[1]) / dl], nn = [dd[1], -dd[0]];
    const H = (u, v) => [ht[0] + dd[0] * u + nn[0] * v, ht[1] + dd[1] * u + nn[1] * v];
    poly(c, [H(-0.2, -0.9), H(-0.2, 0.9), H(1.3, 1.4), H(1.3, -1.0)], HOOF);
    poly(c, [H(0, 0.3), H(0, 0.9), H(1.2, 1.3), H(1.2, 0.6)], "#4a3e40");
  });
};

const destrier = (ctx, p) => {
  const fight = p.pose === "fight";
  const k = fight ? HORSE_FIGHT[(p.frame || 0) % 2] : HORSE_RUN[(p.frame || 0) % 4];
  const s = (p.len ?? 34) / 34;
  const col = p.col, cape = p.cape, steel = p.cloth, iron = p.hair, mane = p.mane, sock = p.belly;
  const far = darken(col, 0.3), farSock = darken(sock, 0.35);
  shadow(ctx, 1.5, 0.4, 14 * s, 2.4 * s, 0.3);
  ctx.save(); ctx.scale(s, s);
  const b = q(k.bob), dx = k.dx || 0, pitch = k.pitch;
  const B = (pt) => add(rot(pt, PIV, pitch), [dx, b]);
  const body = (fn) => inFrame(ctx, dx, b, PIV[0], PIV[1], pitch, fn);
  // far legs, in shade
  horseLeg(ctx, B([-9, -11]), k.hf, HIND, far, farSock);
  horseLeg(ctx, B([6.5, -11]), k.ff, FORE, far, farSock);
  // the tail, black and streaming
  const tw = k.tail;
  body((c0) => part(c0, (c) => {
    c.fillStyle = cel(c, -22, -17, -12, -7, mane, 0.35, 0.3);
    taper(c, [[-12.4, -15.6], [-15.8, -15.4 + tw * 0.5], [-19.4, -13.2 + tw], [-21.8, -10.6 + tw * 1.6]], [2.8, 2.6, 1.9, 0.8]);
    taper(c, [[-12.8, -14.8], [-15.6, -13.6 + tw * 0.4], [-18, -10.8 + tw], [-18.8, -8 + tw * 1.4]], [2.4, 2.2, 1.5, 0.6]);
    line(c, -14.4, -15.6 + tw * 0.2, -19.2, -13.6 + tw, 0.45, lighten(mane, 0.3));
    line(c, -14.6, -14 + tw * 0.2, -17.4, -11.4 + tw, 0.45, lighten(mane, 0.2));
  }));
  // near legs
  horseLeg(ctx, B([-8, -10.5]), k.hn, HIND, col, sock);
  horseLeg(ctx, B([7.5, -10.5]), k.fn, FORE, col, sock);
  // neck and head, turned by `head` about the neck's root
  const nb = [10.2, -14];
  const P0 = rot([17.6, -21.8], nb, k.head);
  const ha = k.head;
  const Hd = (pt) => add(rot(pt, [0, 0], ha), P0);
  body((c0) => {
    part(c0, (c) => {
      // far ear
      poly(c, [Hd([0.6, -1.2]), Hd([0.9, -3.8]), Hd([1.8, -1.2])], darken(col, 0.3));
      c.fillStyle = cel(c, 9, -26, 18, -12, col, 0.3, 0.42);
      taper(c, [nb, lerp(nb, P0, 0.5), P0], [7.4, 5.2, 4.0]);
    });
    // the head
    inFrame(c0, P0[0], P0[1], 0, 0, ha, (c1) => {
      c1.scale(1.12, 1.12);
      blob(c1, [[-1.4, -0.6], [0.2, -1.8], [2.6, -1.3], [5, 0.6], [6.8, 2.5], [7.4, 3.7], [7.1, 4.9, 1], [5.6, 5.3], [4.2, 4.7], [2.6, 3.9], [0.6, 3.3], [-1.4, 2.0]], col, {
        hi: 0.3, lo: 0.4, then: (c) => {
          c.fillStyle = darken(col, 0.2); c.beginPath(); c.ellipse(0.6, 2.2, 1.8, 1.2, 0.3, 0, TAU); c.fill();
          dab(c, 6.4, 3.7, 0.7, 0.6, INKY);                                  // the nostril
          line(c, 5.4, 4.9, 7.0, 5.0, 0.4, darken(col, 0.6));
        },
      });
      // the chanfron over the face, a spike on the brow, a flanged eye-guard
      blob(c1, [[-0.2, -1.9, 1], [2.8, -1.5], [5.6, 0.8], [7.2, 2.6], [6.6, 3.4, 1], [4.4, 2.1], [2.2, 1.2], [0.1, 0.4, 1]], steel, {
        hi: 0.55, lo: 0.4, then: (c) => {
          line(c, 0.6, -1.2, 6.2, 1.7, 0.5, lighten(steel, 0.6));
          line(c, 1.4, 0.9, 5.8, 3.0, 0.5, iron);
          dab(c, 3.6, 0.2, 0.5, 0.5, BRASS); dab(c, 5.2, 1.3, 0.5, 0.5, BRASS);
        },
      });
      part(c1, (c) => { poly(c, [[0.6, -1.5], [2.4, -3.9], [1.9, -1.2]], lighten(steel, 0.3)); poly(c, [[1.5, -1.8], [2.4, -3.9], [1.9, -1.2]], darken(steel, 0.25)); });
      part(c1, (c) => { c.fillStyle = darken(steel, 0.2); c.beginPath(); c.ellipse(1.8, 0.9, 1.2, 0.9, 0.4, 0, TAU); c.fill(); dab(c, 1.5, 0.6, 0.8, 0.7, INKY); dab(c, 1.5, 0.6, 0.35, 0.35, "#e8dfc6"); });
      // near ear and forelock, the bit
      part(c1, (c) => {
        poly(c, [[-1.0, -1.0], [-0.9, -3.9], [0.5, -1.4]], col); poly(c, [[-0.6, -1.3], [-0.6, -3.1], [0.1, -1.4]], darken(col, 0.45));
        poly(c, [[-0.4, -1.6], [0.9, -2.4], [1.4, -0.9], [0.4, -0.4]], mane);
        c.strokeStyle = BRASS; c.lineWidth = 0.5; c.beginPath(); c.arc(5.3, 4.5, 0.65, 0, TAU); c.stroke();
        line(c, 5.0, 4.3, 0.2, 0.9, 0.5, iron);
      });
    });
    // the crinet: steel lames down the crest, the mane showing under them
    part(c0, (c) => {
      const top = [[10.4, -17.7], [12.8, -19.6], [15.2, -21.6], [17.1, -23.6]].map((pt, i) => rot(add(pt, [0, 0]), nb, ha * (i / 3)));
      c.fillStyle = mane;
      for (let i = 0; i < 4; i++) { const [x, y] = lerp(top[0], top[3], i / 3.2); poly(c, [[x - 0.3, y + 0.4], [x + 1.4, y + 0.9], [x - 0.9, y + 3.2]]); }
      c.fillStyle = cel(c, 10, -26, 17, -17, steel, 0.55, 0.4); taper(c, top, [2.2, 2.0, 1.9, 1.6]);
      for (let i = 1; i < 4; i++) { const [x, y] = top[i]; line(c, x - 1.1, y - 0.7, x + 0.5, y + 1.2, 0.5, darken(steel, 0.5)); }
      for (let i = 0; i < 3; i++) { const [x, y] = lerp(top[i], top[i + 1], 0.5); dab(c, x - 0.6, y - 0.9, 0.5, 0.5, lighten(steel, 0.7)); }
    });
  });
  // the caparison: oxblood over body and legs to the knee, black-iron hem,
  // brass studs, the grey tower on the flank
  const [hf, hb] = k.hem;
  const hy = -7.8;
  body((c0) => {
    const x0 = -14.6 - hb * 1.6, x1 = 12.8 + hf * 0.8;
    const hem = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t;
      const y = hy - hb * 0.8 * (1 - t) - hf * 0.9 * t + Math.sin(t * 7 + hb * 2) * 0.35;
      hem.push([x, y + (i % 2 ? -0.8 : 0.3), i % 2 ? 0 : 1]);
    }
    const cap = [[11, -16.6], [6, -18.6], [0, -18.9], [-6, -18.6], [-10.6, -17.4], [-13.4, -15], [-14.2 - hb * 0.8, -11], ...hem, [13.2, -10.5], [12.6, -14]];
    blob(c0, cap, cape, {
      hi: 0.32, lo: 0.45, box: [-15, -19, 13, -6],
      then: (c) => {
        // folds hanging from the back
        c.fillStyle = darken(cape, 0.25);
        for (const fx of [-11, -4.5, 2, 8.5]) poly(c, [[fx, -14], [fx + 1, -14], [fx + 1.6 + hb * 0.3, -6], [fx - 0.6 + hb * 0.3, -6]]);
        c.fillStyle = lighten(cape, 0.2);
        for (const fx of [-8, -1, 5.5]) poly(c, [[fx, -15.5], [fx + 0.5, -15.5], [fx + 0.8, -6], [fx - 0.2, -6]]);
        // the back's sunlit edge
        polyline(c, [[-12.6, -16.2], [-6, -18.2], [0, -18.5], [6, -18.2], [10.6, -16.4]], 0.9, lighten(cape, 0.4));
        // the hem band
        const band = hem.map(([x, y]) => [x, y - 1.3]);
        polyline(c, [[x0 - 1, band[0][1]], ...band, [x1 + 1, band[band.length - 1][1]]], 1.2, iron);
        band.forEach(([x, y], i) => { if (i % 2 === 0 && i > 0 && i < n) dab(c, x - 0.25, y - 0.25, 0.5, 0.5, BRASS); });
        // the device
        tower(c, -7.4, -11.6, 1.1, lighten(steel, 0.3));
        // the breast-strap
        polyline(c, [[12.8, -13.6], [9.6, -12.2], [7.6, -12.6]], 1, iron);
      },
    });
  });
  // the war saddle's cantle and pommel, the rider between
  const seat = [-0.8, -18.6];
  const lean = fight ? k.lean : 0.12;
  const rein = [5.6, -6.2];
  body((c0) => {
    blob(c0, [[-3.4, -18.4, 1], [-4.6, -21.4], [-3.4, -21.6], [-2.2, -18.8, 1]], darken(cape, 0.35), { hi: 0.35 });
    blob(c0, [[2.0, -18.6, 1], [2.8, -20.8], [3.8, -20.4], [3.8, -18.4, 1]], darken(cape, 0.35), { hi: 0.35, then: (c) => dab(c, 2.8, -20.4, 0.6, 0.6, BRASS) });
    // the reins, bit to fist
    const bit = add(rot([5.3 * 1.12, 4.5 * 1.12], [0, 0], ha), P0);
    part(c0, (c) => polyline(c, [bit, [bit[0] - 4, bit[1] + 1.2], add(seat, rein)], 0.55, iron));
    c0.save(); c0.translate(...seat);
    const thrust = fight ? k.thrust : 0;
    rider(c0, p, { lean, lance: k.lance, hand: [2.8 + thrust, -5.2 + (fight && k.lance < -0.3 ? -1.2 : 0)], rein, fl: k.fl, len: 23 });
    c0.restore();
  });
  ctx.restore();
};

// ---- the war-gryphon ----------------------------------------------------------------
// The wingbeat (the walk sheet is its fly sheet): 0 wings high, 1 driving
// down, 2 low, 3 swept back rising. The body rises on the downstroke.
const GRY_FLY = [
  { bob: 1, wing: 0, tail: 1, leg: 0, lance: -0.72, fl: 1.2 },
  { bob: 0, wing: 1, tail: 0.3, leg: 0.5, lance: -0.7, fl: 0.6 },
  { bob: -1.5, wing: 2, tail: -1, leg: 1, lance: -0.74, fl: 0 },
  { bob: -0.5, wing: 3, tail: 0, leg: 0.5, lance: -0.76, fl: 0.8 },
];
const GRY_FIGHT = [
  { bob: 0, wing: 0, tail: 1.2, leg: 0, talon: 1, lance: -0.95, thrust: -1, fl: 1.4 },
  { bob: 1, wing: 2, tail: -1, leg: 1, talon: 2, lance: 0.25, thrust: 3, fl: 0.4 },
];
// relative to the shoulder: E elbow, W wrist, T five primary tips (leading
// first), B where the trailing edge meets the flank
const FWINGS = [
  { E: [-3.5, -6], W: [-1, -14], T: [[3, -25], [-1, -27], [-5, -27], [-9, -25.5], [-12.5, -22.5]], B: [-13, -2] },
  { E: [-3, -4], W: [5, -8], T: [[16.5, -11], [14.5, -14], [11, -16], [7, -16.5], [3, -15.5]], B: [-12, 0] },
  { E: [-2, 3], W: [4, 7.5], T: [[12.5, 13], [9.5, 16], [5.5, 17.5], [1.5, 17.5], [-2.5, 16]], B: [-12, 1] },
  { E: [-4, -3], W: [-3, -9.5], T: [[-9, -17], [-12.5, -17], [-15.5, -15.5], [-18, -13], [-19.5, -10]], B: [-12, 0] },
];

const fwing = (ctx, R, key, sc, wcol, steel, tilt = 0) => {
  const P = (v) => { const r = rot(v, [0, 0], tilt); return [R[0] + r[0] * sc, R[1] + r[1] * sc]; };
  const E = P(key.E), W = P(key.W), T = key.T.map(P), B = P(key.B);
  // the outline: the arm to the wrist, the primaries tip to tip, then the
  // secondaries' rounded ends back down the trailing edge to the flank
  const outline = [[R[0], R[1], 1], [E[0], E[1]], [W[0], W[1], 1], [T[0][0], T[0][1], 1]];
  for (let i = 1; i < T.length; i++) {
    const gap = lerp(lerp(T[i - 1], T[i], 0.5), W, 0.16);
    outline.push([gap[0], gap[1], 1], [T[i][0], T[i][1], 1]);
  }
  const sec = 5, tr = [];
  for (let i = 1; i <= sec; i++) {
    const bow = (t) => lerp(lerp(T[T.length - 1], B, t), E, Math.sin(Math.PI * t) * 0.2);
    const a = bow((i - 0.5) / sec), bb = bow(i / sec), inn = lerp(bb, E, 0.1);
    tr.push(a);
    outline.push([a[0], a[1]], [inn[0], inn[1], 1]);
  }
  outline.push([B[0], B[1], 1]);
  const bx = bbox([R, E, W, ...T, B]);
  part(ctx, (c) => {
    path(c, outline);
    c.fillStyle = cel(c, ...bx, wcol, 0.25, 0.4); c.fill();
    c.save(); path(c, outline); c.clip();
    // dark primaries toward the tips, a paler bar of coverts along the arm
    c.fillStyle = darken(wcol, 0.28);
    path(c, [lerp(W, T[0], 0.55), ...T.map((t) => lerp(W, t, 1.1)), lerp(W, T[T.length - 1], 0.55)].map(([x, y]) => [x, y, 1])); c.fill();
    c.fillStyle = darken(wcol, 0.2);
    path(c, [lerp(T[T.length - 1], E, 0.2), ...tr.map((t) => lerp(t, E, -0.2)), lerp(B, E, 0.2)].map(([x, y]) => [x, y, 1])); c.fill();
    c.fillStyle = lighten(wcol, 0.22);
    path(c, [R, E, W, lerp(W, T[0], 0.3), lerp(W, T[2], 0.36), lerp(W, T[4], 0.4), lerp(T[4], B, 0.35), lerp(E, B, 0.45)].map(([x, y]) => [x, y, 1])); c.fill();
    c.fillStyle = lighten(wcol, 0.42);
    path(c, [R, E, W, lerp(W, T[2], 0.18), lerp(E, T[4], 0.3), lerp(R, B, 0.25)].map(([x, y]) => [x, y, 1])); c.fill();
    // the feathers' edges, short strokes at the tips and down the trailing edge
    for (let i = 0; i < T.length - 1; i++) line(c, ...lerp(lerp(T[i], T[i + 1], 0.5), W, 0.16), ...lerp(lerp(T[i], T[i + 1], 0.5), W, 0.55), 0.45, darken(wcol, 0.55));
    for (let i = 1; i < sec; i++) { const e = lerp(T[T.length - 1], B, i / sec); line(c, ...e, ...lerp(e, E, 0.35), 0.45, darken(wcol, 0.45)); }
    c.restore();
  });
  // plate down the leading edge: lames and a cop at the wrist
  part(ctx, (c) => {
    c.fillStyle = cel(c, ...bbox([R, E, W]), steel, 0.55, 0.4);
    taper(c, [lerp(R, E, 0.15), E, W], [3.2 * sc, 2.8 * sc, 2.4 * sc]);
    for (const t of [0.55]) { const m = lerp(R, E, t); line(c, m[0] - 1.2, m[1] - 0.4, m[0] + 1.2, m[1] + 0.4, 0.45, darken(steel, 0.5)); }
    for (const t of [0.35, 0.7]) { const m = lerp(E, W, t); line(c, m[0] - 1.2, m[1], m[0] + 1.2, m[1] + 0.3, 0.45, darken(steel, 0.5)); }
    c.fillStyle = lighten(steel, 0.2); c.beginPath(); c.arc(W[0], W[1], 1.6 * sc, 0, TAU); c.fill();
    dab(c, W[0] - 0.8, W[1] - 0.8, 0.6, 0.6, lighten(steel, 0.7));
    const d = lerp(R, E, 0.8); dab(c, d[0] - 0.8, d[1] - 0.5, 0.5, 0.5, lighten(steel, 0.7));
  });
};

const gryphon = (ctx, p) => {
  const fight = p.pose === "fight";
  const k = fight ? GRY_FIGHT[(p.frame || 0) % 2] : GRY_FLY[(p.frame || 0) % 4];
  const s = (p.len ?? 34) / 34;
  const col = p.col, head = p.belly, plume = p.mane, wcol = p.wing, steel = p.cloth, cape = p.cape, iron = p.hair;
  const claw = "#d8a838";
  ctx.save(); ctx.scale(s, s);
  const b = q(k.bob);
  ctx.translate(0, b);
  const key = FWINGS[k.wing];
  // far wing, in shade, set back and up
  fwing(ctx, [0.8, -20.8], key, 0.9, darken(wcol, 0.28), darken(steel, 0.28), -0.18);
  // far legs: lion hind trailing, eagle fore tucked
  const lg = k.leg, tw = k.tail;
  const hindLeg = (o, c1) => part(ctx, (c) => {
    const hp = add(o, [-9.5, -13.5]), kn = add(o, [-11.5 - lg * 0.6, -9.6]), hk = add(o, [-15.5 - lg, -8.6 + lg * 0.4]), pw = add(o, [-18.6 - lg, -7.6 + lg * 0.6]);
    c.fillStyle = c1; taper(c, [hp, kn, hk, pw], [4.4, 2.8, 2.0, 2.0]);
    c.fillStyle = darken(c1, 0.25); c.beginPath(); c.ellipse(pw[0] - 0.6, pw[1] + 0.3, 1.6, 1.0, 0.3, 0, TAU); c.fill();
  });
  const foreLeg = (o, c1, s1, t1) => {
    const talon = k.talon || 0;
    const th = add(o, [5.5, -11]), kn = add(o, [6.2 + talon, -7.5 - talon * 1.2]), ft = add(o, [8.5 + talon * 2.2, -4.2 - talon * 1.6 + lg * 0.3]);
    part(ctx, (c) => {
      c.fillStyle = c1; taper(c, [th, kn], [3.6, 2.6]);
      c.fillStyle = s1; taper(c, [kn, ft], [2.0, 1.6]);
      for (let i = 0; i < 3; i++) dab(c, ...lerp(kn, ft, 0.25 + i * 0.25), 0.5, 0.5, lighten(s1, 0.5));
      c.fillStyle = t1;
      for (const [ax, ay] of [[1.8, 0.3], [1.3, 1.3], [-0.6, 1.1]]) { taper(c, [ft, [ft[0] + ax, ft[1] + ay]], [1, 0.7]); }
      c.fillStyle = INKY; for (const [ax, ay] of [[1.8, 0.3], [1.3, 1.3], [-0.6, 1.1]]) c.fillRect(ft[0] + ax * 1.2 - 0.3, ft[1] + ay * 1.2 - 0.2, 0.6, 0.6);
    });
  };
  hindLeg([-1, -1], darken(col, 0.3));
  foreLeg([-1.4, -0.6], darken(plume, 0.3), darken(steel, 0.3), darken(claw, 0.3));
  // the lion's tail, a dark tuft at its end
  part(ctx, (c) => {
    const pts = [[-13.2, -16.4], [-17, -15.6 + tw], [-20.6, -17.2 + tw * 1.6], [-23, -20 + tw * 2.2]];
    c.fillStyle = cel(c, -24, -22, -13, -14, col, 0.3, 0.4); taper(c, pts, [2.4, 1.6, 1.3, 1.1]);
    const e = pts[3];
    path(c, [[e[0] + 0.8, e[1] + 0.6], [e[0] - 0.6, e[1] - 1.2], [e[0] - 1.8, e[1] - 3.4, 1], [e[0] - 2.4, e[1] - 0.6], [e[0] - 3.4, e[1] + 0.4, 1], [e[0] - 1.2, e[1] + 1.4]]);
    c.fillStyle = cel(c, e[0] - 3, e[1] - 3, e[0] + 1, e[1] + 1, darken(plume, 0.3), 0.3, 0.3); c.fill();
  });
  // the lion's barrel and haunch, the crupper plate over the rump
  blob(ctx, [[-2, -19.6], [-8, -19.2], [-12.6, -18], [-14.6, -15.2], [-13.8, -11.8], [-10.5, -10.2], [-5, -10.4], [0, -11.2]], col, {
    hi: 0.3, lo: 0.42, then: (c) => {
      c.fillStyle = lighten(col, 0.35); c.beginPath(); c.ellipse(-10, -15.6, 2.6, 1.8, -0.3, 0, TAU); c.fill();
      dab(c, -8, -11.4, 6, 1.2, darken(col, 0.25));
    },
  });
  blob(ctx, [[-6.4, -19.8], [-11.4, -18.8], [-13.8, -16.4, 1], [-12.2, -15.6], [-9.4, -17], [-6.2, -17.6]], steel, {
    hi: 0.55, lo: 0.4, then: (c) => { line(c, -9, -19.6, -10.6, -16.8, 0.45, darken(steel, 0.5)); dab(c, -8.2, -18.8, 0.5, 0.5, BRASS); dab(c, -11.4, -17.6, 0.5, 0.5, BRASS); },
  });
  // the eagle's breast, feathered, the steel peytral over it
  blob(ctx, [[-2.4, -20.2], [3.6, -21.4], [8, -20], [10.6, -16.6], [10.2, -12.6], [7, -10.2], [2, -10], [-1.2, -11], [-2.8, -12.4, 1], [-1.6, -13.4], [-3.2, -14.8, 1], [-1.8, -15.8], [-3.4, -17.4, 1], [-1.8, -18.2]], plume, {
    hi: 0.35, lo: 0.42, then: (c) => {
      c.strokeStyle = darken(plume, 0.3); c.lineWidth = 0.45;
      for (const [x, y] of [[1, -17], [4, -17.5], [2.5, -14.6], [5.4, -14.8], [1.4, -12.2], [4.2, -12]]) { c.beginPath(); c.arc(x, y, 1.1, 0.3, Math.PI - 0.3); c.stroke(); }
    },
  });
  blob(ctx, [[6.2, -19.6, 1], [9.4, -17.6], [10.9, -14.2], [10.4, -11.4, 1], [8.4, -12.6], [7.6, -15.6]], steel, {
    hi: 0.55, lo: 0.4, then: (c) => {
      line(c, 7.2, -18.6, 9.4, -13.2, 0.5, lighten(steel, 0.65));
      line(c, 7.4, -15.4, 10.6, -14.8, 0.45, darken(steel, 0.5));
      dab(c, 8.9, -17.2, 0.5, 0.5, BRASS); dab(c, 9.6, -13, 0.5, 0.5, BRASS);
    },
  });
  // neck and the eagle head: hooked beak, heavy brow, a steel head plate
  const HB = [13.2, -24.4];
  part(ctx, (c) => {
    c.fillStyle = cel(c, 5, -27, 14, -15, head, 0.25, 0.35);
    taper(c, [[6.6, -18], [9.8, -21.6], HB], [7.4, 5.8, 4.8]);
    c.fillStyle = darken(head, 0.2);
    for (const [x, y] of [[7.4, -18.4], [9.8, -20.2], [8.2, -16.6]]) poly(c, [[x - 1.2, y], [x + 1.2, y], [x, y + 1.4]]);
  });
  inFrame(ctx, HB[0], HB[1], 0, 0, (k.talon === 2 ? 0.12 : 0), (c0) => {
    // nape feathers swept back
    part(c0, (c) => {
      c.fillStyle = cel(c, -6, -3, 0, 2, head, 0.25, 0.35);
      path(c, [[-1, -1.8], [-4.2, -2.2], [-6.4, -1.4, 1], [-4.2, -0.6], [-5.8, 0.6, 1], [-3.2, 0.8], [-4.6, 2.2, 1], [-1.2, 1.6]]); c.fill();
    });
    blob(c0, [[-2.2, 0.8], [-2.2, -1.6], [-0.4, -2.8], [1.8, -2.6], [3.2, -1.2], [3.4, 0.8], [1.6, 2.2], [-1, 2.2]], head, { hi: 0.3, lo: 0.35 });
    // the beak
    blob(c0, [[2.4, -1.5], [4.4, -1.4], [6.0, -0.4], [6.7, 1.3], [6.3, 2.5, 1], [5.6, 1.2], [4.4, 1.0], [2.6, 1.3]], claw, {
      hi: 0.4, lo: 0.4, then: (c) => { line(c, 3.0, 0.6, 5.4, 0.9, 0.45, darken(claw, 0.5)); dab(c, 3.2, -0.9, 0.6, 0.5, INKY); },
    });
    // the steel head plate, a spike standing off the brow
    blob(c0, [[-1.8, -1.6, 1], [-0.6, -3.2], [1.6, -3.2], [3.0, -1.8], [2.8, -0.9, 1], [0.8, -1.2], [-1.4, -0.6, 1]], steel, {
      hi: 0.6, lo: 0.4, then: (c) => { line(c, -0.6, -2.8, 2.2, -2.4, 0.45, lighten(steel, 0.7)); dab(c, 0.4, -2.0, 0.5, 0.5, BRASS); },
    });
    part(c0, (c) => poly(c, [[-0.2, -3.0], [-0.6, -5.4], [1.0, -3.0]], lighten(steel, 0.3)));
    // the fierce eye under the plate's rim
    part(c0, (c) => { dab(c, 1.0, -0.8, 1.4, 0.9, p.eyes || "#e8a830"); dab(c, 1.8, -0.8, 0.6, 0.9, INKY); dab(c, 0.6, -1.1, 2.2, 0.4, darken(steel, 0.5)); });
  });
  // the crinet: lames down the back of the neck
  part(ctx, (c) => {
    const top = [[5.4, -21.2], [8, -23.2], [10.6, -26.2]];
    c.fillStyle = cel(c, 5, -27, 11, -20, steel, 0.55, 0.4); taper(c, top, [2.6, 2.4, 2.2]);
    for (const t of [0.4, 0.8]) { const [x, y] = lerp(top[0], top[2], t); line(c, x - 1, y - 0.8, x + 0.4, y + 1, 0.45, darken(steel, 0.5)); }
  });
  // the oxblood saddle cloth, dagged, the tower on it
  blob(ctx, [[-6.6, -20.2], [1.6, -21], [2.4, -16], [1.8, -12.8, 1], [0.6, -13.9], [-0.8, -12.4, 1], [-2, -13.6], [-3.4, -12.2, 1], [-4.6, -13.4], [-5.9, -12.2, 1], [-7.1, -14.8]], cape, {
    hi: 0.3, lo: 0.45, then: (c) => {
      polyline(c, [[-7.2, -14.4], [-5.9, -13.4], [-4.6, -14.4], [-3.4, -13.4], [-2, -14.6], [-0.8, -13.6], [0.6, -14.9], [1.8, -14]], 1, iron);
      tower(c, -2.4, -17.2, 0.9, lighten(steel, 0.3));
    },
  });
  // near legs
  hindLeg([0, 0], col);
  foreLeg([0, 0], plume, steel, claw);
  // the saddle, the near wing, then the knight in front of it
  const seat = [-2, -20.6];
  blob(ctx, [[-4.6, -20.4, 1], [-5.8, -23.2], [-4.6, -23.4], [-3.6, -20.8, 1]], darken(cape, 0.35), { hi: 0.35 });
  fwing(ctx, [2.2, -19.4], key, 1, wcol, steel);
  ctx.save(); ctx.translate(...seat);
  const thrust = k.thrust || 0;
  const hand = [2.2 + thrust * 0.8, -6.2 + (k.lance < -0.8 ? -1.2 : 0)];
  rider(ctx, p, { lean: fight && k.talon === 2 ? 0.28 : 0.1, lance: k.lance, hand, rein: [4.6, -4.2], fl: k.fl, len: 20, up: true });
  ctx.restore();
  ctx.restore();
};

// ---- the siege ram ----------------------------------------------------------------------
const RAM_SWING = { walk: [0, 0.6, 0, -0.6], fight: [-4.2, 4.6] };
const wheel = (ctx, x, y, r, roll, oak, iron, dim = 0) => part(ctx, (c) => {
  const o = dim ? darken(oak, dim) : oak, ir = dim ? darken(iron, dim * 0.5) : iron;
  c.fillStyle = cel(c, x - r, y - r, x + r, y + r, ir, 0.4, 0.4); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = darken(o, 0.6); c.beginPath(); c.arc(x, y, r - 1.1, 0, TAU); c.fill();
  c.strokeStyle = o; c.lineWidth = 1.1; c.beginPath(); c.arc(x, y, r - 1.6, 0, TAU); c.stroke();
  for (let i = 0; i < 6; i++) { const a = roll + i * Math.PI / 3; tube(c, x, y, x + Math.cos(a) * (r - 1.4), y + Math.sin(a) * (r - 1.4), 1.1, o); }
  c.fillStyle = cel(c, x - 1.5, y - 1.5, x + 1.5, y + 1.5, ir, 0.5, 0.4); c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill();
  dab(c, x - 0.3, y - 0.3, 0.6, 0.6, dim ? ir : BRASS);
  // hobnails round the tyre turn with it
  for (let i = 0; i < 8; i++) { const a = roll + 0.2 + i * Math.PI / 4; dab(c, x + Math.cos(a) * (r - 0.5) - 0.25, y + Math.sin(a) * (r - 0.5) - 0.25, 0.5, 0.5, lighten(ir, 0.5)); }
});

const siegeRam = (ctx, p) => {
  const fight = p.pose === "fight";
  const f = (p.frame || 0) % (fight ? 2 : 4);
  const s = (p.len ?? 44) / 44;
  const oak = p.col, hide = p.cape, steel = p.cloth, iron = p.hair, hose = darken(p.cloth2, 0.15), boot = darken(p.col, 0.5);
  const castIron = darken(steel, 0.3);
  shadow(ctx, 0, 0.6, 27 * s, 3.4 * s, 0.34);
  ctx.save(); ctx.scale(s, s);
  const roll = (f / 4) * (Math.PI / 3) + (fight ? 0.1 : 0);
  // the dark under the shed (translucent: no ink)
  ctx.fillStyle = lin(ctx, 0, -12, 0, -2, [[0, "rgba(36,26,38,0.42)"], [1, "rgba(36,26,38,0.16)"]]);
  ctx.fillRect(-27, -12, 49, 10);
  // far wheels, in shade
  for (const wx of [-15, 1, 17]) wheel(ctx, wx + 1.6, -6.6, 4.6, roll, oak, iron, 0.45);
  // the crew, bent to it: legs straining back from under the skirt
  const man = (x, ph) => {
    const g = (f + ph) % 4, sw = fight ? (f ? 1.4 : -0.6) : [1.6, 0, -1.6, 0][g];
    for (const [side, dim] of [[-1, 0.35], [1, 0]]) {
      const lift = !fight && g % 2 === 1 && side === (g === 1 ? 1 : -1) ? 1.2 : 0;
      const hip = [x + side * 0.4, -11.2], foot = [x - 3.4 + side * sw, -lift];
      const kn = ik(hip, [foot[0] + 0.6, foot[1] - 1], 5.2, 4.8, -1);
      const hc = dim ? darken(hose, dim) : hose, bc = dim ? darken(boot, dim) : boot;
      part(ctx, (c) => {
        tube(c, ...hip, ...kn, 2.3, hc);
        tube(c, ...kn, foot[0] + 0.6, foot[1] - 1, 2.0, bc);
        path(c, [[foot[0] - 0.6, foot[1], 1], [foot[0] - 0.4, foot[1] - 1.8], [foot[0] + 1.4, foot[1] - 1.4], [foot[0] + 2.6, foot[1], 1]]);
        c.fillStyle = darken(bc, 0.1); c.fill();
      });
    }
  };
  man(-7, 0); man(9, 2); man(-23, 1);
  // the plank wall under the eaves, a dark sill at its foot
  blob(ctx, [[-27.6, -16.4, 1], [22.6, -16.4, 1], [22.6, -11, 1], [-27.6, -11, 1]], oak, {
    hi: 0.25, lo: 0.4, then: (c) => {
      for (let x = -25.5; x < 22; x += 3.2) dab(c, x, -16.4, 0.5, 5.4, darken(oak, 0.35));
      dab(c, -28, -12, 51, 1, darken(oak, 0.5));
      for (const x of [-17.5, 3]) { dab(c, x, -15, 1.2, 3.4, iron); dab(c, x + 0.3, -13.8, 0.5, 0.5, lighten(steel, 0.3)); }
    },
  });
  // the ram: a banded oak log, an iron ram's head cast on its end
  const sw = fight ? RAM_SWING.fight[f] : RAM_SWING.walk[f];
  const ry = -13.6 + (fight ? (f ? 0.3 : -0.8) : 0);
  const X = 26 + sw;
  part(ctx, (c) => {
    c.fillStyle = cel(c, 18, ry - 2.6, 18, ry + 2.6, oak, 0.3, 0.45); c.fillRect(19, ry - 2.5, X - 19, 5);
    for (let x = X - 1.8; x > 19.5; x -= 3.4) { dab(c, x, ry - 2.6, 1, 5.2, iron); dab(c, x + 0.2, ry - 2, 0.5, 0.5, lighten(steel, 0.4)); }
    dab(c, 19, ry - 2.5, X - 19, 0.7, lighten(oak, 0.35));
  });
  inFrame(ctx, X, ry, 0, 0, fight && f === 0 ? -0.08 : 0, (c0) => {
    c0.scale(1.3, 1.3);
    blob(c0, [[-1.2, -3.4], [2.6, -3.8], [5.6, -2.8], [7.6, -0.8], [8.2, 1.4, 1], [6.4, 2.8], [3, 3.2], [-1.2, 3.0]], castIron, {
      hi: 0.5, lo: 0.4, then: (c) => {
        dab(c, 7.2, -0.8, 1.2, 2.6, lighten(steel, 0.35));                 // the battered striking face
        dab(c, 3.8, -2.4, 2.2, 0.7, darken(castIron, 0.55));                // the brow
        dab(c, 4.3, -1.8, 1.1, 0.9, BRASS); dab(c, 5.0, -1.8, 0.4, 0.9, INKY); // a brass eye
        dab(c, 7.2, 0.2, 0.6, 0.5, INKY);                                   // nostril
        line(c, 5.4, 2.2, 7.8, 1.9, 0.45, darken(castIron, 0.55));
      },
    });
    // the curled horn, coiled round the ear and hooking forward under the jaw
    part(c0, (c) => {
      c.strokeStyle = cel(c, -2, -3, 4, 3, lighten(steel, 0.1), 0.55, 0.4); c.lineWidth = 2.2; c.lineCap = "round";
      c.beginPath(); c.arc(1.4, 0.2, 2.2, -2.4, 1.7); c.stroke();
      c.lineWidth = 1.5; c.beginPath(); c.moveTo(1.1, 2.4); c.quadraticCurveTo(3.4, 4.2, 4.8, 3.2); c.stroke();
      c.strokeStyle = darken(castIron, 0.5); c.lineWidth = 0.4;
      for (const a of [-1.8, -0.8, 0.2, 1.1]) { c.beginPath(); c.moveTo(1.4 + Math.cos(a) * 1.2, 0.2 + Math.sin(a) * 1.2); c.lineTo(1.4 + Math.cos(a) * 3.2, 0.2 + Math.sin(a) * 3.2); c.stroke(); }
    });
    blob(c0, [[-2.2, -3.2, 1], [-0.6, -3.2, 1], [-0.6, 3.2, 1], [-2.2, 3.2, 1]], BRASS, { hi: 0.4, lo: 0.4 });   // the collar
  });
  // the front post the ram runs out past
  blob(ctx, [[21.4, -18.4, 1], [24.2, -18.4, 1], [24.2, -10, 1], [21.4, -10, 1]], oak, {
    hi: 0.3, lo: 0.45, then: (c) => { dab(c, 21.4, -18.4, 2.8, 1.4, iron); dab(c, 21.4, -11.6, 2.8, 1.4, iron); dab(c, 22.4, -15.8, 0.6, 0.6, lighten(steel, 0.4)); },
  });
  // the roof, hipped: the south slope toward us, wet oxblood hides lashed
  // down, iron lames over the front, the grey tower painted on it
  const top = -29.4, eave = -16.4, fx0 = 13.6, fx1 = 25, bx0 = -20.6, bx1 = -30.4;
  const xe = (y) => fx0 + (y - top) / (eave - top) * (fx1 - fx0);
  const roof = [[bx0, top, 1], [fx0, top, 1], [fx1, eave, 1], [bx1, eave, 1]];
  blob(ctx, roof, hide, {
    hi: 0.3, lo: 0.45, box: [-30, -30, 25, -15],
    then: (c) => {
      // hide seams, stitched, and a sunlit sheen on the wet hides
      for (const x of [-15, -6]) { line(c, x + 0.8, top, x - 1.4, eave, 0.5, darken(hide, 0.4)); for (let y = top + 1.4; y < eave - 1; y += 2.2) dab(c, x + 0.4 - (y - top) * 0.17, y, 0.9, 0.4, lighten(hide, 0.3)); }
      line(c, -26, -22.8, 8, -22.8, 0.5, darken(hide, 0.35));
      dab(c, bx0 + 1, top + 1, 22, 0.7, lighten(hide, 0.35));
      // rope lashings
      for (const x of [-19, -11, -2]) line(c, x + 3, top, x - 1.8, eave, 0.8, lighten(oak, 0.3));
      // the device
      tower(c, -10.6, -22.6, 1.9, lighten(steel, 0.25));
      // iron lames over the front, lapped downward, riveted
      for (let r = 0; r < 3; r++) {
        const y0 = top - 0.4 + r * 4.5, y1 = y0 + 4.9, l0 = xe(y0) - 12 + r * 0.6, l1 = xe(y1) - 12 + r * 0.6;
        fillPath(c, [[l0, y0, 1], [xe(y0) + 1, y0, 1], [xe(y1) + 1, y1, 1], [l1, y1, 1]], steel, { hi: 0.5, lo: 0.4 });
        line(c, l1, y1 - 0.3, xe(y1) + 1, y1 - 0.3, 0.7, darken(steel, 0.6));
        line(c, l0, y0 + 0.2, l1, y1, 0.5, darken(steel, 0.5));
        dab(c, l0 + 0.6, y0 + 0.4, xe(y0) - l0, 0.5, lighten(steel, 0.45));
        for (let x = l0 + 1.4; x < xe(y0) - 0.4; x += 2.6) dab(c, x + (r ? 0.8 : 0), y0 + 1.4, 0.5, 0.5, lighten(steel, 0.65));
      }
      line(c, -31, eave - 0.4, 26, eave - 0.4, 1, darken(hide, 0.5));
    },
  });
  // the ridge, capped in iron
  part(ctx, (c) => {
    c.fillStyle = cel(c, bx0, top - 1, fx0, top + 1, iron, 0.4, 0.3); taper(c, [[bx0 - 0.4, top - 0.2], [fx0 + 0.4, top - 0.2]], [2.2, 2.2]);
    for (let x = bx0 + 3; x < fx0; x += 6) dab(c, x, top - 0.8, 0.6, 0.6, lighten(steel, 0.4));
  });
  // the hide skirt hanging off the eave, dagged
  const skirt = [[bx1 - 0.4, eave - 0.6, 1], [fx1 + 0.4, eave - 0.6, 1]];
  for (let x = fx1; x > bx1; x -= 2.8) skirt.push([x, eave + 2.4, 1], [x - 1.4, eave + 1.4, 1]);
  blob(ctx, skirt, darken(hide, 0.12), { hi: 0.25, lo: 0.45, box: [-30, -17, 25, -13], then: (c) => { dab(c, -31, eave - 0.8, 57, 0.9, iron); for (let x = -27; x < 24; x += 5.4) dab(c, x, eave - 0.7, 0.5, 0.5, BRASS); } });
  // the pennant at the back, the tower on oxblood
  const fl = fight ? [1, 0][f] : [0, 0.8, 1.4, 0.6][f];
  part(ctx, (c) => {
    tube(c, -18.4, top, -18.4, top - 10.5, 1, WOOD);
    c.fillStyle = cel(c, -28, top - 11, -18, top - 5, hide, 0.35, 0.4);
    const ty = top - 10.4;
    c.beginPath(); c.moveTo(-18.8, ty); c.quadraticCurveTo(-22.4, ty - 0.2 + fl, -27.4, ty + 1 + fl * 1.4); c.lineTo(-24.6, ty + 2.2 + fl); c.lineTo(-27, ty + 3.8 + fl * 1.2); c.quadraticCurveTo(-22.4, ty + 3.6 + fl * 0.6, -18.8, ty + 4); c.closePath(); c.fill();
    tower(c, -21.6, ty + 2.1 + fl * 0.4, 0.55, lighten(steel, 0.3));
    dab(c, -19, ty - 1, 1.2, 1.2, BRASS);
  });
  // the near wheels, turning
  for (const wx of [-15, 1, 17]) wheel(ctx, wx, -5.2, 5.2, roll, oak, iron);
  ctx.restore();
};

// ---- the roster -----------------------------------------------------------------------
const IRON_RIDER = { skin: "#e0b08a", cloth: "#6c7280", cloth2: "#7a2a2c", hair: "#2e3038" };
export const IRONMOUNT_RIGS = {
  cavalier: { kind: "destrier", box: { hw: 30, up: 40, down: 4 }, p: { len: 34, col: "#5a4c54", belly: "#d8d0c0", mane: "#2a2228", cape: "#7a2a2c", ...IRON_RIDER } },
  gryphon: { kind: "wargryphon", fly: true, box: { hw: 28, up: 50, down: 6 }, p: { len: 34, col: "#b08850", belly: "#e8e0cc", mane: "#8a6a3e", wing: "#6e5238", cape: "#7a2a2c", eyes: "#e8a830", ...IRON_RIDER } },
  ram: { kind: "siegeram", box: { hw: 38, up: 42, down: 4 }, p: { len: 44, col: "#6a4a2e", cape: "#7a2a2c", ...IRON_RIDER, cloth2: "#521a1e" } },
};
export const IRONMOUNT_PAINTERS = { destrier, wargryphon: gryphon, siegeram: siegeRam };
