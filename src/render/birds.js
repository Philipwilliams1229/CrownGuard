// ============ THE FALCONRY'S BIRDS ============
// A falcon's stoop: out from the roost with a beat or two, wings folded for
// the dive, talons thrown forward at the strike (a puff of feathers), and a
// beating climb home round the other side of a loop. Drawn from the "talon"
// effect (x1,y1 -> x2,y2, ttl/life) the engine pushes on every strike; `a` is
// the effect's fade. A Storm Falcons ricochet leg (foe to foe, life < 500)
// strikes and then climbs away up the sky instead of turning for home.
//
// The hawk is a small painted sprite (~13 world px across the wings) in five
// poses — tuck, strike and the three wingbeats — baked once per pose and
// 15-degree heading, mirrored for flights to the left, and stamped. Its
// ground shadow, the strike's flash and the feathers are baked stamps too.
// The Skyknight's war-eagle is a rig ("eagle" in rigs.js).

import { PX, INK_LINE, inkOutline, hash } from "./paint.js";

// ---- palette -------------------------------------------------------------
const K = {
  back: "#8a5a32", backL: "#b8864e", backD: "#5e3b24",
  prim: "#3e2a26", primL: "#5c4234",
  cream: "#f2e4c0", creamD: "#d2b88a", bar: "#9a6c42",
  cap: "#46302a", cere: "#e8c050", beak: "#5a5662", beakL: "#9a96a2",
  eye: "#16121a", foot: "#e8b840", claw: "#241a26",
  tail: "#7a4e2e", band: "#3e2a26",
  edge: "#3a2630",
};

// ---- tiny painter's kit ----------------------------------------------------
const poly = (c, pts, col) => {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = col; c.fill();
};
const oval = (c, x, y, rx, ry, rot, col) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = col; c.fill(); };
const line = (c, x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

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

// ---- the hawk --------------------------------------------------------------
// Facing +x, body centred on the origin, world units. A wing is its shoulder
// (s), wrist (w), tip (t) and the root of its trailing edge on the body (r).
const WINGS = {
  tuck: {
    far: { s: [1.2, -0.6], w: [-0.2, -2.7], t: [-6.8, -2.0], r: [-2.4, -0.4] },
    near: { s: [1.2, 0.6], w: [-0.2, 2.8], t: [-6.8, 2.2], r: [-2.4, 0.5] },
  },
  up: {
    far: { s: [0.5, -0.7], w: [-0.7, -3.9], t: [-3.8, -6.6], r: [-2.3, -0.6] },
    near: { s: [0.5, -0.1], w: [-1.0, -3.0], t: [-4.6, -5.0], r: [-2.4, 0] },
  },
  mid: {
    far: { s: [0.6, -0.6], w: [0.1, -3.7], t: [-2.4, -6.8], r: [-2.3, -0.5] },
    near: { s: [0.6, 0.6], w: [0.2, 3.7], t: [-2.2, 6.8], r: [-2.3, 0.5] },
  },
  down: {
    far: { s: [0.5, -0.5], w: [-0.4, -2.0], t: [-2.9, -2.6], r: [-2.2, -0.4] },
    near: { s: [0.6, 0.6], w: [0.8, 3.5], t: [-0.6, 7.0], r: [-2.0, 0.6] },
  },
  strike: {
    far: { s: [0.3, -0.6], w: [1.0, -3.7], t: [-0.4, -7.1], r: [-2.2, -0.5] },
    near: { s: [0.2, -0.1], w: [1.6, -2.7], t: [0.7, -6.0], r: [-2.3, 0] },
  },
};

const wing = (c, g, far) => {
  const { s, w, t, r } = g;
  const q = L(t, r, 0.42);                          // where the long flight feathers end
  // the whole wing, then the dark primaries at the hand, then the lit coverts
  poly(c, [s, w, t, q, r], far ? K.backD : K.back);
  poly(c, [L(w, t, 0.08), t, q, L(w, q, 0.25)], far ? K.prim : K.primL);
  poly(c, [s, w, L(w, t, 0.14), L(s, r, 0.45)], far ? K.back : K.backL);
  // the trailing edge's feather gaps
  for (const k of [0.25, 0.55]) { const a = L(t, q, k), b = L(w, s, 0.2 + k * 0.4); line(c, a[0], a[1], L(a, b, 0.4)[0], L(a, b, 0.4)[1], 0.45, far ? K.edge : K.prim); }
  if (!far) {
    c.strokeStyle = K.edge; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(w[0], w[1]); c.lineTo(t[0], t[1]); c.stroke();
  }
};

const tail = (c, fan) => {
  const sp = fan ? 1.9 : 0.6, ln = fan ? 5.0 : 5.0;
  const tipU = [-ln, -sp], tipD = [-ln, sp + (fan ? 0.6 : 0)], mid = [-ln - 0.3, fan ? 0.4 : 0];
  poly(c, [[-2.4, -0.6], tipU, mid, tipD, [-2.4, 0.7]], K.tail);
  // the dark band and pale tip of a falcon's tail
  poly(c, [L([-2.4, -0.6], tipU, 0.72), L([-2.4, -0.6], tipU, 0.86), L([-2.4, 0.7], tipD, 0.86), L([-2.4, 0.7], tipD, 0.72)], K.band);
  line(c, tipU[0], tipU[1], mid[0], mid[1], 0.45, K.creamD);
  line(c, mid[0], mid[1], tipD[0], tipD[1], 0.45, K.creamD);
};

const body = (c, pose) => {
  oval(c, 0, 0, 3.1, 1.5, 0, K.back);
  oval(c, 0.4, 0.55, 2.6, 0.95, 0, K.cream);                       // pale breast and belly
  for (const [bx, by] of [[-0.4, 0.8], [0.6, 1.0], [1.4, 0.7], [-1.2, 0.6]]) c.fillStyle = K.bar, c.fillRect(bx, by, 0.5, 0.5);
  oval(c, -0.4, -0.7, 2.0, 0.55, 0, K.backL);                      // the sun on the mantle
  if (pose === "strike") {
    // talons thrown forward at the mark
    oval(c, 0.9, 0.9, 1.0, 0.8, 0.5, K.cream);
    line(c, 1.3, 1.2, 3.4, 2.3, 0.7, K.foot);
    line(c, 1.0, 1.4, 2.9, 3.0, 0.6, K.foot);
    // open feet: yellow toes spread, a dark hook on each
    for (const [fx, fy] of [[3.4, 2.3], [2.9, 3.0]]) {
      for (const [tx, ty] of [[1.1, -0.6], [1.3, 0.3], [0.5, 1.0]]) {
        line(c, fx, fy, fx + tx, fy + ty, 0.5, K.foot);
        c.fillStyle = K.claw; c.fillRect(fx + tx * 1.15 - 0.25, fy + ty * 1.15 - 0.25, 0.5, 0.5);
      }
    }
  } else if (pose !== "tuck") {
    c.fillStyle = K.foot; c.fillRect(-1.9, 0.8, 1.0, 0.6);           // feet tucked under the tail
  }
};

const head = (c, pose) => {
  const hx = pose === "tuck" ? 3.4 : pose === "strike" ? 2.5 : 3.0;
  const hy = pose === "strike" ? -0.9 : -0.3;
  oval(c, hx, hy, 1.4, 1.2, 0, K.cap);
  oval(c, hx + 0.3, hy + 0.55, 0.8, 0.55, 0, K.cream);             // pale cheek and throat
  c.fillStyle = K.cap; c.fillRect(hx + 0.1, hy - 0.1, 0.5, 1.0);   // the falcon's moustache
  c.fillStyle = K.eye; c.fillRect(hx + 0.55, hy - 0.55, 0.5, 0.5);
  c.fillStyle = K.cere; c.fillRect(hx + 1.1, hy - 0.5, 0.5, 0.5);
  // the hooked beak
  poly(c, [[hx + 1.2, hy - 0.6], [hx + 2.3, hy - 0.2], [hx + 2.25, hy + 0.55], [hx + 1.8, hy + 0.25], [hx + 1.2, hy + 0.2]], K.beak);
  c.fillStyle = K.beakL; c.fillRect(hx + 1.3, hy - 0.5, 0.6, 0.4);
};

const paintHawk = (c, pose) => {
  const g = WINGS[pose];
  wing(c, g.far, true);
  tail(c, pose === "strike" || pose === "up");
  // a wing below the body line lies behind it; a raised one comes over it
  const nearOver = pose === "up" || pose === "strike";
  if (!nearOver) wing(c, g.near, false);
  body(c, pose);
  if (nearOver) wing(c, g.near, false);
  head(c, pose);
};

const HAWK = 19;                       // baked square, world units
const STEP = Math.PI / 12;             // 15-degree headings
const hawkSprite = (pose, idx) => memo(`hawk|${pose}|${idx}`, () =>
  bake(HAWK, (c) => { c.rotate(idx * STEP); paintHawk(c, pose); }));

// Stamp the hawk heading along (dx, dy) on screen. Flights to the left are
// the mirrored bird, so it never flies belly-up.
export const stampHawk = (ctx, pose, x, y, dx, dy, pitchCap = 5) => {
  const flip = dx < 0;
  const ang = Math.atan2(dy, Math.abs(dx) || 0.0001);
  const idx = Math.max(-pitchCap, Math.min(pitchCap, Math.round(ang / STEP)));
  const cv = hawkSprite(pose, idx);
  const X = Math.round(x * PX) / PX, Y = Math.round(y * PX) / PX;
  ctx.save(); ctx.translate(X, Y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(cv, -HAWK / 2, -HAWK / 2, HAWK, HAWK);
  ctx.restore();
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
const STRIKE = 0.5;                    // the flight's share spent going out

// Where the bird is at `prog` (0..1), and the ground under it.
const flight = (fx) => {
  const chain = (fx.life || 520) < 500;
  const alt0 = chain ? 6 : 38, alt1 = 6;          // height above the ground at roost and mark
  const side = ((Math.round(fx.x1 + fx.y1)) & 2) - 1;
  const A = [fx.x1, fx.y1], B = [fx.x2, fx.y2];
  const Ag = [fx.x1, fx.y1 + alt0], Bg = [fx.x2, fx.y2 + alt1];
  const mx = (fx.x1 + fx.x2) / 2, my = (fx.y1 + fx.y2) / 2, mgy = (Ag[1] + Bg[1]) / 2;
  // out wide and down hard...
  const c1 = [mx + side * 26, my - 14], c1g = [mx + side * 26, mgy];
  // ...and home round the other side of the loop (or, off a ricochet, away up the sky)
  const H = chain ? [fx.x2 - side * 18, fx.y2 - 46] : A;
  const Hg = chain ? [fx.x2 - side * 18, fx.y2 + alt1] : Ag;
  const c2 = [(B[0] + H[0]) / 2 - side * 20, (B[1] + H[1]) / 2 - 22], c2g = [c2[0], (Bg[1] + Hg[1]) / 2];
  return (prog) => {
    if (prog <= STRIKE) {
      const o = prog / STRIKE, t = o * o;          // gathering speed all the way down
      const p = quad(A, c1, B, t), g = quad(Ag, c1g, Bg, t);
      return { x: p[0], y: p[1], gx: g[0], gy: g[1] };
    }
    const t = smooth((prog - STRIKE) / (1 - STRIKE));
    const lift = Math.sin(t * Math.PI) * 6;
    const p = quad(B, c2, H, t), g = quad(Bg, c2g, Hg, t);
    return { x: p[0], y: p[1] - lift, gx: g[0], gy: g[1] };
  };
};

export const drawStoop = (ctx, fx, a) => {
  const life = fx.life || 520;
  const prog = Math.max(0, Math.min(1, 1 - fx.ttl / life));
  const chain = life < 500;
  const at = flight(fx);
  const P = at(prog);
  // heading: where the bird is going next
  const e = 0.012;
  const Q = prog + e <= 1 ? at(prog + e) : P;
  const R = prog + e <= 1 ? P : at(prog - e);
  let dx = Q.x - R.x, dy = Q.y - R.y;

  // the pose for this moment of the flight
  let pose, cap = 5;
  if (prog < 0.1) pose = ["mid", "down", "mid", "up"][Math.floor(prog / 0.025) % 4];
  else if (prog < 0.43) pose = "tuck";
  else if (prog < 0.6) {
    pose = "strike";
    // braking: the body rears up, the feet go forward along the line of the dive
    const i0 = at(STRIKE - 0.02), i1 = at(STRIKE);
    dx = i1.x - i0.x; dy = i1.y - i0.y;
    const ang = Math.atan2(dy, Math.abs(dx) || 0.0001) * 0.3 - 0.35;
    dx = Math.sign(dx || 1) * Math.cos(ang); dy = Math.sin(ang);
    cap = 3;
  } else pose = ["up", "mid", "down", "mid"][Math.floor((prog - 0.6) / 0.035) % 4];

  // the bird fades as it drops into the roost (or melts into the sky)
  const fade = prog > 0.86 ? Math.max(0, (1 - prog) / 0.14) : 1;
  const alpha = Math.min(1, Math.max(fade, 0)) * (chain ? Math.min(1, a + 0.4) : 1);
  if (alpha <= 0.02) return;

  ctx.save();
  // its shadow on the ground, small and faint while it is high
  const alt = Math.max(0, P.gy - P.y);
  const sh = Math.max(0, Math.min(5, Math.round(4.5 - alt / 9)));
  ctx.globalAlpha = alpha * Math.max(0.1, 0.34 - alt * 0.005);
  stamp(ctx, shadowSprite(sh), 12, P.x + 1.5 + alt * 0.06, P.gy + 1);

  // the strike: a flash on the mark and a puff of the quarry's feathers
  if (prog > 0.46 && prog < 0.8) {
    const k = (prog - 0.46) / 0.34;
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
  stampHawk(ctx, pose, P.x, P.y, dx, dy, cap);

  // the flash of the strike goes over the bird: the moment the talons hit
  if (prog > 0.47 && prog < 0.64) {
    const k = (prog - 0.47) / 0.17;
    ctx.globalAlpha = alpha * (k < 0.5 ? 1 : 1 - (k - 0.5) * 1.6);
    stamp(ctx, flashSprite(Math.min(3, Math.floor(k * 4))), 26, fx.x2, fx.y2);
  }
  ctx.restore();
};
