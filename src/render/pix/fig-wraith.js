// ============ CONCEPT FIGURE: the Wraith (the Hollow Court's flying hooded spirit) ============
// A drowned shroud with no feet, about 30 px from hood to the longest tatter, hovering ~16 px over
// its ground point (BOX's anchor is the ground UNDER it, as the bat's is). Facing +x: a deep hood
// whose dark holds two teal eyes, a long grey arm with a clawed hand reaching in front, the shroud
// streaming back and trailing into tatters that sway a beat apart. A flier: the biped skeleton is
// unused, each pose is a few numbers read off `F.sk.p`; the board plays `idle` for its drift.
// The look is the owner's pick: the storied one (rents and a rusted chain in the shroud, wisps for a hem,
// a cold teal glow in the hood and motes off the hem).
// Clips: idle and walk (the drift, one loop driven by time like the bat's wingbeat), attack (a lunging rake). `fx` lays the glow.
// THE BARROW WIGHT is `variant: "wight"` of this same figure, a third bigger (the whole painter drawn through a
// scaling wrapper, `big`), barrow-dark, with cold blue eyes, bronze weed and a tarnished circlet on the hood. It has
// its own box and slower, heavier clips, so it is also exported whole as `WIGHT` (BOX, BONES, CLIPS, draw, fx):
// the board wears it as mk("wight", wraith.WIGHT). The wraith's own pixels are untouched (hash-compared).
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, EASE } from "./rig.js";

const SHR = mat("#4e6278", { contrast: 1.05 });
const SHR2 = mat("#43614c");
const BONED = mat("#8a8672"), HANDM = mat("#b4c6c8"), CHAIN = mat("#5e6662", { contrast: 1.2 }), RUSTM = mat("#7a5a40"), BONE = mat("#d8d4c0"), BRONZE = mat("#5e8a74", { contrast: 1.1 });
const VOID = flat("#0c0a14"), EYE = flat("#7ce0b8", { emis: true }), EYE_H = flat("#e0fff4", { emis: true });
const GL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), GL_D = flat("#3a9c86", { emis: true, line: "#1f5a52" }), GL_H = flat("#d8fff0", { emis: true, line: "#7ce0b8" });
// the hood, facing +x, a quarter turned: H cloth (h a tone down, K the lit lip), I the dark inside,
// E an eye (e the dark socket round it)
const HOOD = [
  "...HHHHH...",
  "..HHHHHHHH.",
  ".HHHHHHHKKK",
  ".HHHHHKKIII",
  "HHHHHKIIIII",
  "HHHHHKIeEIe",
  "HHHHHKIeEIE",
  "hHHHHKIIIII",
  "hHHHHHKIIIK",
  ".hHHHHHKKK.",
  "..hhHHHH...",
];
// the wight's hood, a size up (14 x 14): the same turn, the tarnished circlet (R) riding the brow
const WHOOD = [
  "...R..R..R.R..",
  "...RR.RRRRRR..",
  "...RRRRRRRRRR.",
  "..HHHHHHHHKKK.",
  ".HHHHHHHHKKIII",
  ".HHHHHHKKIIIII",
  "HHHHHHKIIIIIII",
  "HHHHHHKIeEIIeE",
  "HHHHHHKIeEIIeE",
  "hHHHHHKIIIIIII",
  "hHHHHHHKIIIIIK",
  "hhHHHHHHKKIIK.",
  ".hhHHHHHHKKK..",
  "..hhhHHHH.....",
];
const WSHR = mat("#42506a", { contrast: 1.05 }), WSHR2 = mat("#4e4630"), WHAND = mat("#a8b4bc"), WCROWN = mat("#c09a48", { contrast: 1.15 }), WWEED = mat("#6e6034");
const WEYE = flat("#9cd4ff", { emis: true });
const WGL = flat("#8cc8ff", { emis: true, line: "#3a6aa8" }), WGL_D = flat("#4a86c8", { emis: true, line: "#24467a" });
const wlegend = (m) => ({ H: { m }, h: { m, bias: -1 }, K: { m, bias: 1 }, I: { m: VOID }, e: { m: VOID }, E: { m: WEYE }, R: { m: WCROWN, fix: 2 } });
const SC = 1.33;
// a drawing surface that scales every coordinate and radius by k (the wight is the wraith a third bigger)
const big = (px, k) => ({
  part: () => px.part(),
  capsule: (ax, ay, ra, bx, by, rb, m, z, o) => px.capsule(ax * k, ay * k, ra * k, bx * k, by * k, rb * k, m, z, o),
  poly: (pts, m, z, o) => px.poly(pts.map(([x, y]) => [x * k, y * k]), m, z, o),
  line: (ax, ay, bx, by, m, z, o) => px.line(ax * k, ay * k, bx * k, by * k, m, z, o),
  dot: (x, y, m, z, o) => px.dot(x * k, y * k, m, z, o),
});
const legend = (m) => ({ H: { m }, h: { m, bias: -1 }, K: { m, bias: 1 }, I: { m: VOID }, e: { m: VOID }, E: { m: EYE } });

export const BOX = { w: 64, h: 58, ox: 30, oy: 44 };
export const BONES = HUMAN;            // unused: a flier poses itself
const HOVER = 17;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const draw = (px0, { sk, lag1, lag2 }, o = {}) => {
  const W = o.variant === "wight", px = W ? big(px0, SC) : px0;
  const p = sk.p, p1 = lag1.p, p2 = lag2.p;
  const B = [Math.round(p.bx || 0), Math.round(-HOVER + (p.by || 0))];     // the chest
  const m = W ? WSHR : SHR, m2 = W ? WSHR2 : SHR2, HAND = W ? WHAND : HANDM, sw1 = (p1.t || 0), sw2 = (p2.t || 0);
  const lean = p.lean || 0;
  const H = [B[0] + 2 + lean * 2, B[1] - 9];                 // the hood's centre

  // ---- the far arm, a tone down, reaching a little behind
  const far = [B[0] + 8 + (p.rf || 0), B[1] - 1 + (p.rfy || 0)];
  px.part();
  px.capsule(B[0] + 1, B[1] - 6, 1.6, far[0] - 3, far[1] - 2.4, 1.2, m, 1, { bias: -1 });
  px.capsule(far[0] - 3, far[1] - 2.4, 1.2, far[0], far[1], 0.8, HAND, 1, { bias: -1 });
  for (const [dx, dy] of [[2.4, -0.8], [2.8, 0.4], [2.2, 1.6]]) px.line(far[0], far[1], far[0] + dx, far[1] + dy, HAND, 1, { bias: -1 });

  // ---- the shroud, from the shoulders down and back into tatters
  const ph6 = (p.ph || 0) * 6.283, str = p.stream || 0;
  // the hem: a short ragged edge of small teeth; the real length is in the wisps below
  const hy0 = B[1] + 9, tips = [[B[0] + 4, hy0 - 1], [B[0] + 1, hy0 + 1.4], [B[0] - 2.4, hy0 - 0.4], [B[0] - 5.6, hy0 + 2], [B[0] - 8.6, hy0 - 1.6]];
  const body = [[B[0] - 2, B[1] - 10], [B[0] + 4.4, B[1] - 8], [B[0] + 5.4 + lean, B[1] - 1], [B[0] + 5.2, B[1] + 6]];
  px.part();
  px.poly([...body, ...tips, [B[0] - 9.6, B[1] + 2], [B[0] - 7, B[1] - 3], [B[0] - 4, B[1] - 8]], m, 2, { round: 0.75, floor: 1 });
  // a second layer of hem, weed green, ragged: the faithful old rig's cloth2
  px.part();
  px.poly([[B[0] + 3.4, B[1] + 3], [B[0] - 7, B[1] + 3.6], [B[0] - 6, hy0 - 1.4], [B[0] - 3, hy0 + 0.4], [B[0] + 0.4, hy0 - 1.6], [B[0] + 3.6, hy0 - 0.4]], m2, 2.2, { round: 0.7, floor: 1 });
  // wisps: fewer, longer, uneven, tapering to a pixel; solid and outlined near the hem, then a
  // dither with no outline so the bottom dissolves
  const WL = [15, 8, 18, 11];
  const WX = [3, -1, -4.6, -8];
  WL.forEach((Ln, i) => {
    const x0 = B[0] + WX[i], y0 = hy0 - 1 + (i % 2) * 1.4, sw = Math.sin(ph6 + i * 1.9) * 1.6, dx = -0.55 - str * 0.05;
    const at = (t) => [x0 + dx * Ln * t * 1.1 + sw * t * t, y0 + Ln * t * 0.9];
    px.part();
    let prev = at(0), pw = 3.4;
    for (let s = 1; s <= 10; s++) {
      const t = s / 10, c = at(t), w = 3.4 * (1 - t) + 0.6;
      if (t <= 0.5) { px.capsule(prev[0], prev[1], pw, c[0], c[1], w, m, 2.05, { floor: 1 }); }
      else { const n = Math.ceil(Ln * 0.1 * 2); for (let k = 0; k <= n; k++) { const q = at(t - 0.1 + (0.1 * k) / n); for (let ox = -Math.floor(w + 0.5); ox <= Math.floor(w); ox++) { const X = Math.floor(q[0] + ox), Y = Math.floor(q[1]); if (((X + Y) & 1) === 0 || t < 0.62) px.dot(X, Y, m, 2.05, { noLine: true, bias: 1, fix: 2 }); } } }
      prev = c; pw = w;
    }
  });
  {
    // rents torn in the shroud: the dark shows through
    for (const [dx, dy, l] of [[-3, 1, 3], [0, -3, 2], [-6, 6, 3]]) px.line(B[0] + dx, B[1] + dy, B[0] + dx - l * 0.6, B[1] + dy + l, VOID, 2.6);
  }
  {
    // a rusted chain hung from the shoulder, and weed
    px.part();
    for (let i = 0; i < 6; i++) { const x = B[0] - 2 + i * 1.2 + Math.sin(i * 1.2 + (p.ph || 0) * 6.28) * 0.6, y = B[1] - 8 + i * 2.2; px.dot(x, y, i % 2 ? CHAIN : RUSTM, 3, { fix: i % 2 ? 2 : 1 }); }
    { const wd = W ? WWEED : m2; px.dot(B[0] + 2, B[1] + 6, wd, 3); px.dot(B[0] - 1, B[1] + 8, wd, 3); px.dot(B[0] - 4, B[1] + 5, wd, 3); }
  }

  // ---- the hood, and in it the eyes (whole pixels)
  const hx = Math.round(H[0]), hy = Math.round(H[1]);
  px0.part();
  if (W) px0.stamp(WHOOD, Math.round(hx * SC) + 1, Math.round(hy * SC) + 4, wlegend(m), 5, { ax: 6, ay: 8, ball: [7, 8, 7.6, 8.6], cast: 1 });
  else px.stamp(HOOD, hx + 1, hy + 2, legend(m), 5, { ax: 5, ay: 6, ball: [5.5, 5.5, 6, 6], cast: 1 });

  // ---- the near arm: a long shoulder, a long forearm, and the claw
  const reach = p.reach || 0, near = [B[0] + 11 + reach * 5, B[1] - 3 + (p.reachY || 0) - reach * 1];
  const sh = [B[0] + 3, B[1] - 6], el = [mix(sh, near, 0.5)[0], mix(sh, near, 0.5)[1] + 3];
  px.part();
  px.capsule(sh[0], sh[1], 1.8, el[0], el[1], 1.5, m, 6, { floor: 1 });
  px.capsule(el[0], el[1], 1.4, near[0], near[1], 1.0, HAND, 6.1);
  const sp = p.spread ?? 1;
  const claws = [[3.2, -1.4], [3.6, 0.4], [3, 1.9]];
  px.part();
  for (const [dx, dy] of claws) { px.line(near[0], near[1], near[0] + dx * (0.5 + 0.5 * sp), near[1] + dy * sp, HAND, 6.2, { fix: 3 }); px.dot(near[0] + dx * (0.5 + 0.5 * sp) + 0.6, near[1] + dy * sp + (dy > 0 ? 0.6 : -0.2), BONE, 6.25, { fix: 4 }); }
  return { glow: { hood: [hx + 3, hy] }, B, H: [hx, hy], W, near, reach: p.reach || 0 };
};

// the cold glow: teal over the hood's dark and (c) the core; a pulse with the breath. The wight's is blue, scaled
// up, and in its blow a few motes stream off the claw back to the hood: the life it drinks.
export const fx = (px, F, info, clip) => {
  if (!info || !info.glow) return;
  const W = info.W, k = 0.5 + 0.5 * Math.sin((F.sk.p.ph || 0) * 6.283), S = W ? SC : 1;
  const [hx, hy] = info.glow.hood, G = W ? WGL : GL, GD = W ? WGL_D : GL_D;
  px.dot(hx * S - 3, hy * S - 3, GD, 9); px.dot(hx * S - 2, hy * S + 6, GD, 9);
  for (let i = 0; i < 3; i++) px.dot((info.B[0] - 3 - i * 2) * S, (info.B[1] + 5 + i + (k > 0.5 ? 1 : 0)) * S, G, 9);      // motes drifting off the hem
  if (W && clip === "attack" && info.reach > 0.9) {
    const [nx, ny] = info.near, hxx = hx * S, hyy = hy * S;
    for (let i = 1; i <= 4; i++) { const t = i / 5; px.dot(nx * S + (hxx - nx * S) * t, ny * S + (hyy - ny * S) * t - Math.sin(t * Math.PI) * 4, i % 2 ? WGL_D : WGL, 9); }
  }
};

const HOLD = { bx: 0, by: 0, lean: 0, reach: 0, reachY: 0, rf: 0, rfy: 0, spread: 0.7, stream: 0, ph: 0 };
const drift = (ph) => ({ ...HOLD, by: -1.6 * Math.sin(ph * Math.PI * 2), reach: 0.15 + 0.2 * Math.sin(ph * Math.PI * 2 + 1), rf: 0.8 * Math.sin(ph * Math.PI * 2 + 2.4), rfy: 0.6 * Math.cos(ph * Math.PI * 2), stream: 1.2 * Math.sin(ph * Math.PI * 2 + 0.6) + 1, ph });
export const CLIPS = {
  idle: { n: 8, ms: 1400, loop: true, lag: 0.09, pose: drift },
  walk: { n: 8, ms: 1000, loop: true, lag: 0.09, pose: (ph) => ({ ...drift(ph), lean: 0.35, bx: 1, stream: 2.4 + 1.4 * Math.sin(ph * Math.PI * 2 + 0.6) }) },
  attack: {
    n: 10, ms: 700, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: HOLD },
      // draw back: the body sinks and tilts away, the claw cocked high behind
      { t: 0.3, e: "out", p: { ...HOLD, bx: -3, by: 1, lean: -0.6, reach: -0.7, reachY: -5, spread: 1.2, rf: -3, stream: 3 } },
      // the rake: swept forward and down, the shroud snapped back
      { t: 0.5, e: "in3", p: { ...HOLD, bx: 5, by: 1.4, lean: 0.9, reach: 1.8, reachY: 4, spread: 1.4, rf: 2, stream: -2 } },
      { t: 0.62, e: "out", p: { ...HOLD, bx: 6, by: 1.8, lean: 1, reach: 2, reachY: 5, spread: 1.5, rf: 2, stream: -3 } },
      { t: 0.85, e: "io", p: { ...HOLD, bx: 2, by: 0, lean: 0.3, reach: 0.4, spread: 0.9, stream: 0 } },
      { t: 1, e: "io", p: HOLD },
    ], ph),
  },
};

// ---- the Barrow Wight, whole: its own (larger) box and slow, heavy clips (a blow every 1800 ms, a drift, not a lunge)
const WBOX = { w: 88, h: 78, ox: 40, oy: 60 };
const wdrift = (ph) => ({ ...drift(ph), by: -1.2 * Math.sin(ph * Math.PI * 2), stream: 0.8 * Math.sin(ph * Math.PI * 2 + 0.6) + 0.8 });
export const WIGHT = {
  BOX: WBOX, BONES, fx,
  draw: (px, F, o = {}) => draw(px, F, { ...o, variant: "wight" }),
  CLIPS: {
    idle: { n: 8, ms: 2000, loop: true, lag: 0.12, pose: wdrift },
    walk: { n: 8, ms: 1400, loop: true, lag: 0.12, pose: (ph) => ({ ...wdrift(ph), lean: 0.3, bx: 0.8, stream: 2 + 1.2 * Math.sin(ph * Math.PI * 2 + 0.6) }) },
    // the heavy blow: the whole king hauled up and back, held, then dragged down through the foe
    attack: {
      n: 12, ms: 1300, loop: false, lag: 0.09,
      pose: (ph) => sampleKeys([
        { t: 0, p: HOLD },
        { t: 0.32, e: "out", p: { ...HOLD, bx: -4, by: 2, lean: -0.8, reach: -0.9, reachY: -7, spread: 1.3, rf: -4, stream: 3.5 } },
        { t: 0.46, e: "io", p: { ...HOLD, bx: -5, by: 2.4, lean: -1, reach: -1, reachY: -8, spread: 1.4, rf: -4.5, stream: 4 } },
        { t: 0.56, e: "in3", p: { ...HOLD, bx: 5, by: 2, lean: 1, reach: 1.9, reachY: 5, spread: 1.5, rf: 2, stream: -2.5 } },
        { t: 0.7, e: "out", p: { ...HOLD, bx: 6.4, by: 2.4, lean: 1.1, reach: 2.1, reachY: 6, spread: 1.5, rf: 2.4, stream: -3 } },
        { t: 0.9, e: "io", p: { ...HOLD, bx: 2, by: 0.4, lean: 0.3, reach: 0.4, spread: 0.9, stream: 0 } },
        { t: 1, e: "io", p: HOLD },
      ], ph),
    },
  },
};
