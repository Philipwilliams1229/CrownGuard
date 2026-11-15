// ============ THE FALCONRY'S BIRDS, sculpted ============
// The hawk of the Falconry (wheeling over the mews, on the glove, the stoop) in the pixel sculptor.
// Pure picture code, no canvas: render/birds.js bakes and stamps what these return, and
// scratchpad scripts can look at them in Node.
//
// Everything is written in WORLD UNITS facing +x with the body on the origin (the old painter's
// numbers, so a bird sits where it always sat) and put into art pixels (two to a unit) through a
// turn about the body: the stoop's 15-degree headings. The sun stays upper left: a bird that
// flies to the left is baked with the light flipped and then mirrored (see `flip`).
//
//   falconImage(pose, idx, kind, flip)   one flight pose (tuck, strike, up, mid, down) at heading
//                                        idx x 15 degrees (+ nose down), a 38-pixel square, the
//                                        body at the middle
//   perchedImage(kind, hood, flip)       a bird sitting upright (the glove, the T-perch); hood: the
//                                        falconer's hood and plume on it
// `kind` picks the plumage: hawk (the falcon), king (the Eyrie's King's Eagle), storm (the Storm
// Falcons). Each returns a resolved image { data, w, h, ox, oy } (pix.js resolve).
import { Pix, mat, flat } from "./pix.js";

const PALS = {
  hawk: { back: "#8a5a32", prim: "#4a3430", cream: "#f2e4c0", bar: "#9a6c42", cap: "#4a322c", tail: "#7a4e2e", band: "#3e2a26" },
  king: { back: "#d8ccb0", prim: "#7a6840", cream: "#fff3d2", bar: "#c8a860", cap: "#d8b34a", tail: "#c8b890", band: "#d8b34a" },
  storm: { back: "#6a7488", prim: "#363e52", cream: "#dce6f0", bar: "#8ea0b8", cap: "#3a4254", tail: "#5a6478", band: "#2e3442" },
};
const CERE = { hawk: "#e8c050", king: "#e8c050", storm: "#b8e0ff" };
const matsOf = (kind) => {
  const P = PALS[kind] || PALS.hawk;
  return {
    back: mat(P.back), prim: mat(P.prim, { contrast: 1.15 }), cream: mat(P.cream), bar: mat(P.bar), cap: mat(P.cap), tail: mat(P.tail), band: mat(P.band, { floor: 1 }),
    beak: mat("#6a6670", { contrast: 1.2 }), foot: mat("#e8b840", { contrast: 1.2 }), claw: flat("#241a26"),
    eye: flat("#f0c850"), glint: flat("#fff3d2", { emis: true }), cere: flat(CERE[kind] || CERE.hawk),
    hood: mat("#8a2e3a"), hoodGold: mat("#d8b34a", { contrast: 1.2 }),
  };
};

const STEP = Math.PI / 12;
const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// A wing is its shoulder (s), wrist (w), tip (t) and the root of its trailing edge on the body (r).
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

// one wing: the membrane, four fingered primaries off the hand, secondaries along the arm, the
// lit coverts over their roots. `far`: the wing behind the body, a tone down.
const wing = (px, g, W, far, M, z) => {
  const { s, w, t, r } = W, q = L(t, r, 0.42), b = far ? -1 : 0;
  px.part();
  px.poly([g(s), g(w), g(t), g(q), g(r)], M.back, z, { round: 0.5, bias: b, cast: 1 });
  px.part();
  // the long flight feathers, tip to root so each overlaps the next
  for (let i = 0; i < 4; i++) {
    const tip = L(t, q, i / 3.2), base = L(L(w, t, 0.12), r, 0.1 + i * 0.12);
    const a = g(base), e = g(tip);
    px.capsule(a[0], a[1], 1.15, e[0], e[1], 0.55, i % 2 ? M.prim : M.back, z + 0.1 + i * 0.01, { bias: far ? -1 : i % 2 ? 0 : -1, floor: 1, cast: 0 });
  }
  px.part();
  // the lit coverts over the feathers' roots, scalloped with pale tips
  px.poly([g(s), g(w), g(L(w, t, 0.2)), g(L(s, r, 0.55))], M.back, z + 0.3, { round: 0.7, bias: far ? -1 : 1, cast: 0 });
  if (!far) for (const k of [0.3, 0.62]) { const p = g(L(L(s, w, k), L(r, L(w, t, 0.2), k), 0.35)); px.dot(p[0], p[1], M.cream, z + 0.32, { fix: 3, noLine: true }); }
  // the leading edge's dark line, near wing only
  if (!far) { const a = g(s), c = g(w), d = g(t); px.line(a[0], a[1], c[0], c[1], M.prim, z + 0.34, { fix: 1, noLine: true }); px.line(c[0], c[1], d[0], d[1], M.prim, z + 0.34, { fix: 1, noLine: true }); }
};

const tail = (px, g, fan, M) => {
  const sp = fan ? 1.9 : 0.6, ln = 5.0;
  const tipU = [-ln, -sp], tipD = [-ln, sp + (fan ? 0.6 : 0)], mid = [-ln - 0.3, fan ? 0.4 : 0];
  px.part();
  px.poly([g([-2.4, -0.6]), g(tipU), g(mid), g(tipD), g([-2.4, 0.7])], M.tail, 2, { round: 0.4 });
  // the dark band, then the pale tip
  const A = L([-2.4, -0.6], tipU, 0.7), B = L([-2.4, 0.7], tipD, 0.7), A2 = L([-2.4, -0.6], tipU, 0.86), B2 = L([-2.4, 0.7], tipD, 0.86);
  px.poly([g(A), g(A2), g(B2), g(B)], M.band, 2.1, { fix: 1, noLine: true });
  px.line(...g(tipU), ...g(mid), M.cream, 2.12, { fix: 3, noLine: true });
  px.line(...g(mid), ...g(tipD), M.cream, 2.12, { fix: 3, noLine: true });
};

const feet = (px, g, M, strike) => {
  px.part();
  if (strike) {
    // thrown forward at the mark: two legs and open yellow toes, a dark hook on each
    for (const [f, h] of [[[3.4, 2.3], [1.3, 1.2]], [[2.9, 3.0], [1.0, 1.4]]]) {
      const a = g(h), e = g(f);
      px.capsule(a[0], a[1], 0.9, e[0], e[1], 0.75, M.foot, 4.5, { cast: 0 });
      for (const [tx, ty] of [[1.1, -0.6], [1.3, 0.3], [0.5, 1.0]]) {
        const p = g([f[0] + tx, f[1] + ty]);
        px.capsule(e[0], e[1], 0.55, p[0], p[1], 0.45, M.foot, 4.52, { cast: 0 });
        const c = g([f[0] + tx * 1.25, f[1] + ty * 1.25]); px.dot(c[0], c[1], M.claw, 4.54, { noLine: true });
      }
    }
  } else {
    const a = g([-1.7, 1.1]), b = g([-1.0, 1.1]);
    px.capsule(a[0], a[1], 0.7, b[0], b[1], 0.7, M.foot, 4.2, { cast: 0 });
  }
};

const body = (px, g, rot, M, pose) => {
  px.part();
  const c = g([0, 0]);
  px.ellipse(c[0], c[1], 6.4, 3.2, M.back, 4, { rot, round: 1, cast: 1 });
  px.part();
  const bl = g([0.4, 0.62]);
  px.ellipse(bl[0] + 1, bl[1] + 0.4, 4.2, 1.3, M.cream, 4.1, { rot, round: 0.7, cast: 0 });
  // the barring on the belly
  for (const [bx, by] of [[-0.4, 0.8], [0.6, 1.0], [1.4, 0.7], [-1.2, 0.6]]) { const p = g([bx, by]); px.dot(p[0], p[1], M.bar, 4.15, { fix: 2, noLine: true }); }
  if (pose === "strike") feet(px, g, M, true); else if (pose !== "tuck") feet(px, g, M, false);
};

const head = (px, g, rot, M, pose) => {
  const hx = pose === "tuck" ? 3.4 : pose === "strike" ? 2.5 : 3.0, hy = pose === "strike" ? -0.9 : -0.3;
  px.part();
  const c = g([hx, hy]);
  px.ellipse(c[0], c[1], 3, 2.6, M.cap, 6, { rot, round: 1, cast: 1 });
  const ch = g([hx + 0.3, hy + 0.55]);
  px.ellipse(ch[0], ch[1], 1.6, 1.1, M.cream, 6.1, { rot, round: 0.7, cast: 0 });
  const mo = g([hx + 0.1, hy + 0.35]); px.dot(mo[0], mo[1], M.cap, 6.12, { fix: 1, noLine: true });     // the falcon's moustache
  const ey = g([hx + 0.7, hy - 0.4]); px.dot(ey[0], ey[1], M.eye, 6.2, { noLine: true });
  const eg = g([hx + 0.55, hy - 0.75]); px.dot(eg[0], eg[1], M.glint, 6.22, { noLine: true });
  px.part();
  px.poly([g([hx + 1.1, hy - 0.62]), g([hx + 2.3, hy - 0.2]), g([hx + 2.3, hy + 0.7]), g([hx + 1.8, hy + 0.3]), g([hx + 1.1, hy + 0.25])], M.beak, 6.3, { cast: 0 });
  const ce = g([hx + 1.2, hy - 0.45]); px.dot(ce[0], ce[1], M.cere, 6.32, { noLine: true });
};

export const falconImage = (pose, idx = 0, kind = "hawk", flip = false) => {
  const M = matsOf(kind), W = WINGS[pose] || WINGS.mid, ang = idx * STEP, c = Math.cos(ang), s = Math.sin(ang);
  const g = ([x, y]) => [(x * c - y * s) * 2, (x * s + y * c) * 2];
  const px = new Pix(38, 38, 19, 19);
  wing(px, g, W.far, true, M, 1);
  tail(px, g, pose === "strike" || pose === "up", M);
  const nearOver = pose === "up" || pose === "strike";
  if (!nearOver) wing(px, g, W.near, false, M, 3);
  body(px, g, ang, M, pose);
  if (nearOver) wing(px, g, W.near, false, M, 7);
  head(px, g, ang, M, pose);
  const img = px.resolve({ flip, line: "tint" });
  return img;
};

// ---- the bird at rest: upright on the glove or the perch, facing +x --------------------------------
export const perchedImage = (kind = "hawk", hood = false, flip = false) => {
  const M = matsOf(kind);
  const px = new Pix(26, 30, 13, 18);
  // the tail hangs down behind, the folded wing over the body, a pale breast
  px.part();
  px.poly([[-3.4, 4], [-5.4, 9.4], [-3.2, 10.4], [-1.4, 9.8], [-0.6, 4]], M.tail, 2, { round: 0.4 });
  px.poly([[-4.6, 8], [-3.8, 9.2], [-2, 9.4], [-1.6, 8.2]], M.band, 2.1, { fix: 1, noLine: true });
  px.part();
  px.ellipse(0, 0.6, 4.2, 6, M.back, 4, { rot: 0.1 });
  px.part();
  px.ellipse(1.8, 1.4, 2.3, 4.2, M.cream, 4.1, { rot: 0.1, round: 0.7, cast: 0 });
  for (const [bx, by] of [[1.2, 0.4], [2.2, 1.6], [1.0, 2.8], [2.0, 3.6]]) px.dot(bx, by, M.bar, 4.15, { fix: 2, noLine: true });
  // the folded wing, primaries crossing at the tail
  px.part();
  px.poly([[-3.6, -2.4], [-0.8, -3], [0.2, 1], [-1, 6.4], [-4.2, 7.6], [-4.6, 3]], M.back, 4.3, { round: 0.6, bias: 1, cast: 1 });
  px.line(-1.2, 1.4, -2.6, 7, M.prim, 4.36, { fix: 1, noLine: true }); px.line(-2.4, 0.8, -3.6, 6.2, M.prim, 4.36, { fix: 1, noLine: true });
  // the feet gripping
  px.part();
  px.capsule(0.2, 6.2, 0.7, 0.2, 8.6, 0.7, M.foot, 4.2, { cast: 0 }); px.capsule(1.6, 6.2, 0.7, 1.6, 8.6, 0.7, M.foot, 4.2, { cast: 0 });
  // the head
  const hx = 1.6, hy = -5.6;
  px.part();
  px.ellipse(hx, hy, 3.1, 2.9, M.cap, 6, { round: 1 });
  if (hood) {
    // a hooded bird asleep: a red leather cap over the eyes and a gold plume, the beak showing
    px.part();
    px.ellipse(hx - 0.2, hy - 0.4, 3.5, 3.1, M.hood, 6.4, { round: 1, cast: 1 });
    px.poly([[hx - 1.2, hy - 3.2], [hx - 0.6, hy - 5.8], [hx + 0.4, hy - 3.4]], M.hoodGold, 6.5, { fix: 3 });
    px.dot(hx + 2, hy - 0.4, M.hoodGold, 6.55, { fix: 3, noLine: true });
  } else {
    px.ellipse(hx + 0.6, hy + 1.1, 1.8, 1.2, M.cream, 6.1, { round: 0.7, cast: 0 });
    px.dot(hx + 0.2, hy + 0.6, M.cap, 6.12, { fix: 1, noLine: true });
    px.dot(hx + 1.2, hy - 0.8, M.eye, 6.2, { noLine: true }); px.dot(hx + 0.8, hy - 1.4, M.glint, 6.22, { noLine: true });
  }
  px.part();
  px.poly([[hx + 2.2, hy - 0.9], [hx + 4.8, hy - 0.1], [hx + 4.8, hy + 1.4], [hx + 3.6, hy + 0.7], [hx + 2.2, hy + 0.6]], M.beak, 6.3, { cast: 0 });
  px.dot(hx + 2.4, hy - 0.8, M.cere, 6.32, { noLine: true });
  return px.resolve({ flip, line: "tint" });
};
