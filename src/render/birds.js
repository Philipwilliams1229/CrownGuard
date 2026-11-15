// ============ THE FALCONRY'S BIRDS ============
// A falcon's stoop: thrown off the mistress's glove (or off its place on the
// wheel) with a beat or two, wings folded for the drop, talons thrown forward
// at the strike (a flash, a puff of feathers), and a beating climb back to
// its own place on the wheel. Drawn from the "talon" effect the engine
// pushes on every cast: x1,y1 -> x2,y2 (the prey, followed until the hit),
// ttl/life, `hit` (ms: the talons land — and the damage with them —
// update.js STOOP_HIT), `home` (where the wheel will have it back) and
// `kind` (hawk / king / storm plumage); `a` is the effect's fade. A Storm
// Falcons ricochet leg (foe to foe, life < 500) strikes and then climbs away
// up the sky instead of turning for home.
//
// The hawk is a small painted sprite (~13 world px across the wings) in five
// poses — tuck, strike and the three wingbeats — baked once per pose and
// 15-degree heading, mirrored for flights to the left, and stamped. Its
// ground shadow, the strike's flash and the feathers are baked stamps too.
// The Skyknight's war-eagle is a rig ("eagle" in rigs.js).

import { PX, INK_LINE, inkOutline, hash } from "./paint.js";
import { toCanvas } from "./pix/pix.js";
import { falconImage, perchedImage } from "./pix/bird-falcon.js";

// The birds are the pixel sculptor's (pix/bird-falcon.js), baked per pose, heading and plumage,
// once for each facing so the sun stays upper left.

// ---- palettes --------------------------------------------------------------
// One per bird of the mews, matching the wheel's birds (halls/falconry.js
// paintBird): the falcon, the Eyrie's King's Eagle (pale and gold), the
// Storm Falcons (slate, a lightning-blue cere). The effect's `kind` picks.
const PALS = {
  hawk: {
    back: "#8a5a32", backL: "#b8864e", backD: "#5e3b24",
    prim: "#3e2a26", primL: "#5c4234",
    cream: "#f2e4c0", creamD: "#d2b88a", bar: "#9a6c42",
    cap: "#46302a", cere: "#e8c050", beak: "#5a5662", beakL: "#9a96a2",
    eye: "#16121a", foot: "#e8b840", claw: "#241a26",
    tail: "#7a4e2e", band: "#3e2a26",
    edge: "#3a2630",
  },
  king: {
    back: "#d8ccb0", backL: "#f2e8d0", backD: "#a89a7c",
    prim: "#6a5a3a", primL: "#8a7650",
    cream: "#fff3d2", creamD: "#e0d0a8", bar: "#c8a860",
    cap: "#d8b34a", cere: "#e8c050", beak: "#5a5662", beakL: "#9a96a2",
    eye: "#16121a", foot: "#e8b840", claw: "#241a26",
    tail: "#c8b890", band: "#d8b34a",
    edge: "#3a2630",
  },
  storm: {
    back: "#6a7488", backL: "#94a0b8", backD: "#4a5264",
    prim: "#2e3442", primL: "#46506a",
    cream: "#dce6f0", creamD: "#aebccc", bar: "#8ea0b8",
    cap: "#3a4254", cere: "#b8e0ff", beak: "#4a4e5a", beakL: "#9aa0b0",
    eye: "#16121a", foot: "#d8c050", claw: "#241a26",
    tail: "#5a6478", band: "#2e3442",
    edge: "#2a2a3a",
  },
};
// the palette the painters below read; bake() sets it for the bird it paints
let K = PALS.hawk;

// ---- tiny painter's kit ----------------------------------------------------
const poly = (c, pts, col) => {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = col; c.fill();
};
const oval = (c, x, y, rx, ry, rot, col) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = col; c.fill(); };
const line = (c, x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };

// Canvas edges come out soft; the art is hard pixels. Every art pixel is
// either there or not, then inked round with a single line.
const crisp = (cv) => {
  const c = cv.getContext("2d", { willReadFrequently: true });
  const img = c.getImageData(0, 0, cv.width, cv.height), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 100 ? 255 : 0;
  c.putImageData(img, 0, 0);
};
const bake = (size, paint, ink = true) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = Math.ceil(size * PX);
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.imageSmoothingEnabled = false;
  c.scale(PX, PX);
  c.translate(size / 2, size / 2);
  paint(c);
  crisp(cv);
  if (ink) inkOutline(cv, INK_LINE, 1);
  return cv;
};
const CACHE = new Map();
const memo = (key, make) => {
  const k = key + "|" + PX;
  let v = CACHE.get(k);
  if (!v) { v = make(); CACHE.set(k, v); }
  return v;
};

                       // baked square, world units
const STEP = Math.PI / 12;             // 15-degree headings
const hawkSprite = (pose, idx, kind = "hawk", flip = false) => memo(`hawk|${kind}|${pose}|${idx}|p${flip ? 1 : 0}`, () => {
  const img = falconImage(pose, idx, kind, flip);
  return { cv: toCanvas(img), ox: img.ox, oy: img.oy };
});

// Stamp the hawk heading along (dx, dy) on screen. Flights to the left are
// the mirrored bird, so it never flies belly-up.
export const stampHawk = (ctx, pose, x, y, dx, dy, pitchCap = 5, kind = "hawk") => {
  const flip = dx < 0;
  const ang = Math.atan2(dy, Math.abs(dx) || 0.0001);
  const idx = Math.max(-pitchCap, Math.min(pitchCap, Math.round(ang / STEP)));
  const cv = hawkSprite(pose, idx, kind, flip);
  const X = Math.round(x * PX) / PX, Y = Math.round(y * PX) / PX;
  ctx.save(); ctx.translate(X, Y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(cv.cv, -cv.ox / 2, -cv.oy / 2, cv.cv.width / 2, cv.cv.height / 2);
  ctx.restore();
};

// For the hall file (halls/falconry.js), which owns where they are drawn: a bird of the wheel
// (wing 0 down, 1 level, 2 raised, as its `paintBird` took it) and a bird sitting on the glove or
// the T-perch (hood: asleep under the falconer's hood). Both return true (the old birds are gone).
// The point is the bird's centre, as the old stamps took it.
export const wheelBird = (ctx, wing, x, y, kind = "hawk") => {
  stampHawk(ctx, wing === 2 ? "up" : wing === 1 ? "mid" : "down", x, y, 1, 0, 5, kind);
  return true;
};
export const perchedBird = (ctx, x, y, dir = 1, kind = "hawk", hood = false) => {
  const cv = memo(`perch|${kind}|${hood ? 1 : 0}|${dir < 0 ? 1 : 0}`, () => { const img = perchedImage(kind, hood, dir < 0); return { cv: toCanvas(img), ox: img.ox, oy: img.oy }; });
  const X = Math.round(x * 2) / 2, Y = Math.round(y * 2) / 2;
  ctx.save(); ctx.translate(X, Y);
  if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(cv.cv, -cv.ox / 2, -cv.oy / 2, cv.cv.width / 2, cv.cv.height / 2);
  ctx.restore();
  return true;
};

// ---- shadow, flash and feathers --------------------------------------------
const shadowSprite = (n) => memo(`shadow|${n}`, () => bake(12, (c) => {
  const rx = 1.2 + n * 0.5;
  oval(c, 0, 0, rx, rx * 0.42, 0, "rgba(36,24,40,1)");
}, false));

// the strike: a hard cream-and-gold star that bursts open and breaks up
const flashSprite = (k) => memo(`flash|${k}`, () => bake(26, (c) => {
  if (k === 0) {
    poly(c, [[0, -6], [1.6, -1.6], [7, 0], [1.6, 1.6], [0, 6], [-1.6, 1.6], [-7, 0], [-1.6, -1.6]], "#f0c850");
    poly(c, [[0, -4], [1, -1], [4.8, 0], [1, 1], [0, 4], [-1, 1], [-4.8, 0], [-1, -1]], "#fff3d2");
    return;
  }
  const r0 = 1.5 + k * 2, r1 = 5.5 + k * 2.2, w = 1.5 - k * 0.3;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + 0.39 * (k & 1);
    const ln = i % 2 ? 0.75 : 1;
    const ux = Math.cos(a), uy = Math.sin(a);
    if (k === 3) { oval(c, ux * r1 * ln, uy * r1 * ln, 0.8, 0.8, 0, i % 2 ? "#f0c850" : "#fff3d2"); continue; }
    poly(c, [[ux * r0 - uy * w, uy * r0 + ux * w], [ux * r1 * ln, uy * r1 * ln], [ux * r0 + uy * w, uy * r0 - ux * w]], i % 2 ? "#f0c850" : "#fff3d2");
  }
}, false));

const FEATHER_COLS = [[K.back, K.backD], [K.cream, K.creamD], [K.tail, K.cream]];
const featherSprite = (v, r) => memo(`feather|${v}|${r}`, () => bake(7, (c) => {
  c.rotate(r * Math.PI / 4);
  const [a, b] = FEATHER_COLS[v];
  oval(c, 0.2, 0, 1.9, 0.75, 0, a);
  line(c, -2.1, 0, 1.6, 0, 0.5, b);
}));

const stamp = (ctx, cv, size, x, y) => ctx.drawImage(cv, Math.round(x * PX) / PX - size / 2, Math.round(y * PX) / PX - size / 2, size, size);

// ---- the flight --------------------------------------------------------------
const quad = (p0, p1, p2, t) => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};
const smooth = (t) => t * t * (3 - 2 * t);

// The engine's timing: the talons land `fx.hit` ms into the effect's `life`
// (update.js STOOP_HIT / STOOP_LIFE, the ricochet's own) — the damage lands
// then too, so the bird must be on its prey at that moment. The prey is
// followed: the engine moves x2, y2 with it until the hit.
const hitShare = (fx) => Math.max(0.15, Math.min(0.7, (fx.hit ?? (fx.life || 520) * 0.5) / (fx.life || 520)));

// Where the bird is at `prog` (0..1), and the ground under it. Cast from
// her glove (or its place on the wheel) it lifts a touch, folds and drops
// on the prey gathering speed; then it beats back up and round to its own
// place on the wheel (fx.home) — or, off a ricochet, away up the sky.
const flight = (fx) => {
  const chain = (fx.life || 520) < 500, S = hitShare(fx);
  const alt0 = chain ? 6 : 38, alt1 = 6;          // height above the ground at the start and the mark
  const side = ((Math.round(fx.x1 + fx.y1)) & 2) - 1;
  const A = [fx.x1, fx.y1], B = [fx.x2, fx.y2];
  const Ag = [fx.x1, fx.y1 + alt0], Bg = [fx.x2, fx.y2 + alt1];
  const mx = (fx.x1 + fx.x2) / 2, my = (fx.y1 + fx.y2) / 2, mgy = (Ag[1] + Bg[1]) / 2;
  // out: off a ricochet wide round the side; off the glove or the wheel up a
  // little first, then a steep drop onto the prey
  const c1 = chain ? [mx + side * 26, my - 14] : [A[0] + (B[0] - A[0]) * 0.3, Math.min(A[1], B[1]) - 12];
  const c1g = [c1[0], mgy];
  const H = chain ? [fx.x2 - side * 18, fx.y2 - 46] : fx.home || A;
  const Hg = chain ? [fx.x2 - side * 18, fx.y2 + alt1] : [H[0], H[1] + alt0];
  const c2 = [(B[0] + H[0]) / 2 - side * 16, Math.min(B[1], H[1]) - 16], c2g = [c2[0], (Bg[1] + Hg[1]) / 2];
  return (prog) => {
    if (prog <= S) {
      const o = prog / S, t = o * o;               // gathering speed all the way down
      const p = quad(A, c1, B, t), g = quad(Ag, c1g, Bg, t);
      return { x: p[0], y: p[1], gx: g[0], gy: g[1] };
    }
    const t = smooth((prog - S) / (1 - S));
    const lift = Math.sin(t * Math.PI) * 6;
    const p = quad(B, c2, H, t), g = quad(Bg, c2g, Hg, t);
    return { x: p[0], y: p[1] - lift, gx: g[0], gy: g[1] };
  };
};

export const drawStoop = (ctx, fx, a) => {
  const life = fx.life || 520;
  const prog = Math.max(0, Math.min(1, 1 - fx.ttl / life));
  const chain = life < 500, S = hitShare(fx);
  const ms = prog * life, hitMs = S * life;
  const at = flight(fx);
  const P = at(prog);
  // heading: where the bird is going next
  const e = 0.012;
  const Q = prog + e <= 1 ? at(prog + e) : P;
  const R = prog + e <= 1 ? P : at(prog - e);
  let dx = Q.x - R.x, dy = Q.y - R.y;

  // the pose, by the clock: a beat or two off the glove, folded for the
  // drop, talons thrown forward from just before the hit, then the wings
  // working all the way home (one beat every 60 ms, not every frame)
  let pose, cap = 5;
  if (!chain && ms < Math.min(70, hitMs * 0.35)) pose = ["mid", "down"][Math.floor(ms / 35) % 2];
  else if (ms < hitMs - 40) pose = "tuck";
  else if (ms < hitMs + 90) {
    pose = "strike";
    // braking: the body rears up, the feet go forward along the line of the dive
    const i0 = at(Math.max(0, S - 0.03)), i1 = at(S);
    dx = i1.x - i0.x; dy = i1.y - i0.y;
    const ang = Math.atan2(dy, Math.abs(dx) || 0.0001) * 0.3 - 0.35;
    dx = Math.sign(dx || 1) * Math.cos(ang); dy = Math.sin(ang);
    cap = 3;
  } else pose = ["up", "mid", "down", "mid"][Math.floor((ms - hitMs - 90) / 60) % 4];

  // a bird going home lands on its place in the wheel (the hall shows it
  // there again the moment this ends); off a ricochet it melts into the sky
  const fade = chain && prog > 0.86 ? Math.max(0, (1 - prog) / 0.14) : 1;
  const alpha = Math.min(1, Math.max(fade, 0)) * (chain ? Math.min(1, a + 0.4) : 1);
  if (alpha <= 0.02) return;
  const kind = fx.kind || "hawk";

  ctx.save();
  // its shadow on the ground, small and faint while it is high
  const alt = Math.max(0, P.gy - P.y);
  const sh = Math.max(0, Math.min(5, Math.round(4.5 - alt / 9)));
  ctx.globalAlpha = alpha * Math.max(0.1, 0.34 - alt * 0.005);
  stamp(ctx, shadowSprite(sh), 12, P.x + 1.5 + alt * 0.06, P.gy + 1);

  // the strike: a flash on the mark and a puff of the quarry's feathers
  if (ms > hitMs - 10 && ms < hitMs + 260) {
    const k = (ms - hitMs + 10) / 270;
    const seed = Math.round(fx.x2 * 7 + fx.y2 * 13);
    for (let i = 0; i < 6; i++) {
      const ang = hash(seed, i) * Math.PI * 2, sp = 5 + hash(seed, i + 9) * 7;
      const ex = fx.x2 + Math.cos(ang) * sp * Math.sqrt(k);
      const ey = fx.y2 + Math.sin(ang) * sp * 0.7 * Math.sqrt(k) + k * k * 7;
      ctx.globalAlpha = alpha * Math.max(0, Math.min(1, 2 - k * 2));
      stamp(ctx, featherSprite(i % 3, Math.floor(k * 6 + i) % 4), 7, ex, ey);
    }
  }

  // speed lines behind the dive
  if (pose === "tuck") {
    ctx.fillStyle = "#fff3d2";
    for (let i = 1; i <= 3; i++) {
      const G = at(Math.max(0, prog - i * 0.025));
      ctx.globalAlpha = alpha * (0.4 - i * 0.11);
      ctx.fillRect(Math.round(G.x * PX) / PX - 0.5, Math.round(G.y * PX) / PX - 0.5, 1, 1);
    }
  }

  ctx.globalAlpha = alpha;
  stampHawk(ctx, pose, P.x, P.y, dx, dy, cap, kind);

  // the flash of the strike goes over the bird: the moment the talons hit
  if (ms >= hitMs && ms < hitMs + 130) {
    const k = (ms - hitMs) / 130;
    ctx.globalAlpha = alpha * (k < 0.5 ? 1 : 1 - (k - 0.5) * 1.6);
    stamp(ctx, flashSprite(Math.min(3, Math.floor(k * 4))), 26, fx.x2, fx.y2);
  }
  ctx.restore();
};
