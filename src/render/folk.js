// ============ FOLK ============
// The little people of the kingdom, as one shared body: a slim, rounded
// figure about 22 world pixels tall, drawn from the feet up in lit, soft
// forms — no outlines. Tower crews stand on this rig now; the soldiers and
// the horde will stand on it next.
//
// Every figure faces +x in its own space and is mirrored by `dir`. A
// palette names the visible materials: skin, hood, coat, boots, trim.
// The body kit is folk-kit.js; the figures are split by crew into
// folk-archer.js, folk-casters.js, folk-workers.js and folk-gunners.js, all
// re-exported here. This file keeps the build crew.

import { lighten, darken, shadow, roundRect, lin, part } from "./paint.js";
import { limb, blob, dab, head, torso, legs, hand, arm, cap, logJoint } from "./folk-kit.js";
export * from "./folk-kit.js";
export * from "./folk-archer.js";
export * from "./folk-casters.js";
export * from "./folk-workers.js";
export * from "./folk-gunners.js";
export { soft } from "./paint.js";

// ---- the builders ------------------------------------------------------------
// The crew that sprints out of the castle gate to raise a new hall
// (builders.js bakes every frame once and stamps it). The same slim body in
// work clothes, posed limb by limb: two-bone legs that find the ground (a
// boot that pitches toe-up at the heel strike and toe-down at the push), the
// upper body leaning off the hip, two-bone arms. Three looks:
//   mason  — the cream coif and a long leather apron, a wooden mallet
//   hod    — a flat cap and a short canvas apron; carries a plank out on his
//            shoulder and hands the stone up the ladder
//   setter — a red knitted cap and a canvas bib apron; carries a dressed
//            block out in his arms and feeds the courses from the pile
// Poses (WORKER_POSES gives each one's frame count):
//   run (6)    lean forward, knees up, arms pumping; `o.load` carries the
//              plank / block out (the mason always has his mallet)
//   climb (4)  seen from behind on a ladder, hand over hand, mallet at the belt
//   hammer (3) raised, coming down, struck
//   hand (4)   a block lifted from the knees to the chest, overhead, let go
//   pick (4)   crouched reaching, crouched holding, up with it, tossed
//   jump (3)   crouched to spring, rising, falling
//   land (2)   squashed, rising out of it
//   cheer (2)  the tool held up high
//   stand (1)
// Feet at (x, y), facing +x (mirrored by dir). No ground shadow unless
// o.shadow: the builders stamp their own, so it stays on the ground in a
// jump and is left off in the water.
export const WORKER_POSES = { run: 6, climb: 4, hammer: 3, hand: 4, pick: 4, jump: 3, land: 2, cheer: 2, stand: 1 };
export const BUILDER_FOLK = {
  mason: { skin: "#e8b990", hood: "#e4d8b8", coat: "#8a7a5a", boots: "#3e2a1a", trim: "#5a4a3a", apron: "#9a643a" },
  hod: { skin: "#d9a47a", hood: "#6e5434", coat: "#9c8a60", boots: "#3a2818", trim: "#4a3a2a", apron: "#dcd0b4", hair: "#5a3a22" },
  setter: { skin: "#e8b990", hood: "#b04a38", coat: "#76684c", boots: "#3e2a1a", trim: "#4a3a2a", apron: "#d2c4a2", hair: "#a06a38" },
};
const WK = { wood: "#c49a5c", woodHi: "#e8c486", woodLo: "#94693a", stone: "#a19a8a", stoneHi: "#c8c0ac", haft: "#6a4a2e", maul: "#b4804a" };

const clampW = (v, a, b) => (v < a ? a : v > b ? b : v);
// two bones from a root to a target: the joint, bending toward +x (dir 1)
const joint2 = (ax, ay, bx, by, l1, l2, dir = 1) => {
  const dx = bx - ax, dy = by - ay, d = clampW(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.05, l1 + l2 - 0.02);
  const a = Math.atan2(dy, dx), k = Math.acos(clampW((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const j = a - dir * k;
  return [ax + Math.cos(j) * l1, ay + Math.sin(j) * l1];
};
// a boot about its ankle, pitched by `ang` (positive: toe down)
const BOOT = [[-1.1, -1.0], [0.8, -1.0], [2.2, 0.8, 1], [1.8, 1.4, 1], [-1.2, 1.4, 1]];
const bootAt = (ctx, ax, ay, ang, col) => {
  const c = Math.cos(ang), s = Math.sin(ang);
  blob(ctx, BOOT.map(([x, y, k]) => (k ? [ax + x * c - y * s, ay + x * s + y * c, 1] : [ax + x * c - y * s, ay + x * s + y * c])), col, { hi: 0.35 });
};
const LEG1 = 3.9, LEG2 = 3.0;
const workLeg = (ctx, hx, hy, [ax, ay, ang], col, bootCol) => {
  const [kx, ky] = joint2(hx, hy, ax, ay, LEG1, LEG2, 1);
  limb(ctx, hx, hy, kx, ky, 2.7, col);
  limb(ctx, kx, ky, ax, ay, 2.3, col);
  bootAt(ctx, ax, ay, ang, bootCol);
};
// an arm from the shoulder to the hand: [hx, hy, bend (1 elbow down, -1
// up), ex, ey] — a raised arm names its elbow, so it lifts in front of the
// face rather than across it
const workArm = (ctx, sx, sy, [hx, hy, bend = 1, ex, ey], pal, col) => {
  if (ex === undefined) { arm(ctx, sx, sy, hx, hy, pal, { col, bend }); return; }
  logJoint(ctx, "arm", [sx, sy], [ex, ey], [hx, hy]);
  limb(ctx, sx, sy, ex, ey, 2.4, col);
  limb(ctx, ex, ey, hx, hy, 2.2, col);
  hand(ctx, hx, hy, pal.skin);
};

// the tools and loads, in the upper body's frame
const malletAt = (ctx, hx, hy, ang) => part(ctx, (c) => {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const ex = hx + ca * 5.4, ey = hy + sa * 5.4;
  c.strokeStyle = WK.haft; c.lineWidth = 1.1; c.lineCap = "round";
  c.beginPath(); c.moveTo(hx - ca * 1.1, hy - sa * 1.1); c.lineTo(ex, ey); c.stroke();
  c.save(); c.translate(ex, ey); c.rotate(ang);
  c.fillStyle = lin(c, 0, -2.2, 0, 2.2, [[0, lighten(WK.maul, 0.38)], [0.5, WK.maul], [1, darken(WK.maul, 0.42)]]);
  roundRect(c, -1.2, -2.2, 3.0, 4.4, 0.7); c.fill();
  c.fillStyle = darken(WK.maul, 0.3); c.fillRect(-1.2, -2.2, 3.0, 0.6); c.fillRect(-1.2, 1.6, 3.0, 0.6);   // the end grain
  c.restore();
});
const plankAt = (ctx, x, y, a, len = 17) => part(ctx, (c) => {
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = WK.wood; c.fillRect(-len / 2, -0.9, len, 1.9);
  c.fillStyle = WK.woodHi; c.fillRect(-len / 2, -0.9, len, 0.6);
  c.fillStyle = WK.woodLo; c.fillRect(-len / 2, 0.5, len, 0.5); c.fillRect(-len / 2, -0.9, 0.6, 1.9); c.fillRect(len / 2 - 0.6, -0.9, 0.6, 1.9);
  c.fillStyle = darken(WK.wood, 0.25); c.fillRect(-len / 2 + 5, -0.2, 2.2, 0.4); c.fillRect(len / 2 - 6, 0, 1.6, 0.4);   // grain
  c.restore();
});
export const drawBuilderBlock = (ctx, x, y) => part(ctx, (c) => {
  c.fillStyle = WK.stone; c.fillRect(x - 2.3, y - 1.8, 4.6, 3.6);
  c.fillStyle = WK.stoneHi; c.fillRect(x - 2.3, y - 1.8, 4.6, 1.1);
  c.fillStyle = darken(WK.stone, 0.3); c.fillRect(x + 1.5, y - 0.7, 0.8, 2.5);
  c.fillStyle = darken(WK.stone, 0.15); c.fillRect(x - 1.4, y + 0.2, 1.2, 0.4);   // a tool mark
});
// the apron over the torso: a long bib (mason, setter) or a short waist one
// (hod); `flap` blows its hem back on the run
const apronOn = (ctx, pal, look, flap) => {
  const col = pal.apron, f = flap * 1.8;
  if (look === "hod") {
    blob(ctx, [[-0.5, -3.1, 1], [3.3, -3.1, 1], [3.8 - f, 2.6 - f * 0.25, 1], [-0.7 - f, 2.9 - f * 0.2, 1]], col, {
      hi: 0.25, lo: 0.3, then: (c) => { dab(c, -1, -3.2, 5, 0.6, darken(col, 0.3)); dab(c, 1.2 - f * 0.4, -1.2, 0.5, 3.5, darken(col, 0.18)); },
    });
    return;
  }
  blob(ctx, [[0.0, -7.7, 1], [2.9, -7.7, 1], [3.3, -3.4], [3.9 - f, 3.3 - f * 0.35, 1], [-0.9 - f, 3.5 - f * 0.25, 1], [-0.5, -3.4]], col, {
    hi: 0.28, lo: 0.36, then: (c) => {
      dab(c, -3.6, -3.0, 7.5, 0.6, darken(col, 0.35));                                  // the waist tie
      dab(c, 0.6, -1.4, 2.2, 1.6, darken(col, 0.2)); dab(c, 0.6, -1.4, 2.2, 0.4, darken(col, 0.4));   // a pocket
      if (look === "mason") dab(c, 1.0 - f * 0.3, 1.2, 0.5, 2.0, lighten(col, 0.2));   // a scuffed crease
    },
  });
  part(ctx, (c) => { c.strokeStyle = darken(col, 0.3); c.lineWidth = 0.55; c.beginPath(); c.moveTo(0.3, -7.6); c.lineTo(1.0, -9.6); c.stroke(); });   // the neck strap
};
// the head and its cap, in the upper body's frame (neck at 0.3, -10.5)
const workHead = (ctx, pal, look, tilt) => {
  ctx.save();
  ctx.translate(0.3, -10.5); ctx.rotate(tilt); ctx.translate(-0.3, 10.5);
  if (look === "mason") head(ctx, 0.4, -12.7, pal, { hood: true });
  else {
    head(ctx, 0.4, -12.7, pal, { hood: false });
    if (look === "hod") cap(ctx, 0.4, -12.7, pal.hood, { band: darken(pal.hood, 0.35) });
    else cap(ctx, 0.4, -12.7, pal.hood, { tall: true, band: lighten(pal.hood, 0.3) });
  }
  ctx.restore();
};

// One posed figure. S: { hip: [x, y], lean, tilt, legs: [near, far] as
// [ankleX, ankleY, bootAngle] in foot space, hands: [near, far] as [x, y,
// bend] in the upper body's frame (origin at the hip, turned by lean),
// mallet: angle | null (in the near hand), load: { kind, x, y, a } | null,
// flap }.
const SH_N = [0.9, -8.6], SH_F = [-1.0, -8.8];
const workerBody = (ctx, pal, look, S) => {
  const [hx, hy] = S.hip;
  const farC = darken(pal.coat, 0.2);
  const up = (fn) => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(S.lean || 0); fn(); ctx.restore(); };
  // the far arm, behind everything
  up(() => workArm(ctx, SH_F[0], SH_F[1], S.hands[1], pal, farC));
  workLeg(ctx, hx - 0.5, hy, S.legs[1], darken(pal.boots, 0.14), darken(pal.boots, 0.28));
  workLeg(ctx, hx + 0.5, hy, S.legs[0], pal.boots, darken(pal.boots, 0.18));
  up(() => {
    torso(ctx, 0, -9.2, 10, 7, pal);
    apronOn(ctx, pal, look, S.flap || 0);
    const L = S.load;
    if (L && L.kind === "plank") plankAt(ctx, L.x, L.y, L.a || 0, L.len || 17);
    workHead(ctx, pal, look, S.tilt || 0);
    if (L && L.kind === "block") drawBuilderBlock(ctx, L.x, L.y);
    if (S.mallet != null) malletAt(ctx, S.hands[0][0], S.hands[0][1], S.mallet);
    workArm(ctx, SH_N[0], SH_N[1], S.hands[0], pal, pal.coat);
    if (S.open) { dab(ctx, S.hands[0][0] + 0.4, S.hands[0][1] - 2.0, 0.6, 1.0, pal.skin); dab(ctx, S.hands[0][0] - 0.8, S.hands[0][1] - 1.9, 0.6, 1.0, pal.skin); }
  });
};

// ---- the poses ----
// the run: contact, down, push-and-knee-up, then the same on the other leg
const RUN_LEGS = [
  [0.0, -7.0, [3.6, -1.2, -0.35], [-3.8, -3.0, 0.7]],
  [0.2, -6.5, [0.8, -1.2, 0.0], [-2.2, -5.0, 0.95]],
  [0.5, -7.9, [-3.0, -2.0, 0.8], [3.4, -4.9, -0.1]],
];
const RUN_ARMS = [
  [[-3.0, -4.4, -1], [4.2, -10.2, 1]],
  [[-1.2, -5.0, -1], [2.8, -8.6, 1]],
  [[2.6, -8.6, 1], [-1.6, -5.2, -1]],
  [[4.2, -10.2, 1], [-3.0, -4.4, -1]],
  [[2.8, -8.6, 1], [-1.2, -5.0, -1]],
  [[-1.6, -5.2, -1], [2.6, -8.6, 1]],
];
const runPose = (look, f, load) => {
  const [hx, hy, a, b] = RUN_LEGS[f % 3];
  const legs = f < 3 ? [a, b] : [b, a];
  let hands = RUN_ARMS[f], lean = 0.3, mallet = null, L = null;
  const bob = f % 3 === 1 ? 0.15 : 0;
  if (look === "mason") {
    // the mallet pumps with the near arm, head up when it swings forward
    mallet = [2.5, 2.0, -0.5, -1.1, -0.9, 1.2][f];
  } else if (load && look === "hod") {
    // the plank on the near shoulder, steadied by the near hand
    hands = [[2.6, -9.2, 1, 2.4, -5.4], RUN_ARMS[f][1]];
    L = { kind: "plank", x: 0.4, y: -9.0 + bob, a: -0.06 };
    lean = 0.16;
  } else if (load && look === "setter") {
    // the block hugged to the belly, both arms round it
    hands = [[3.0, -4.6 + bob, 1], [4.6, -5.8 + bob, 1]];
    L = { kind: "block", x: 3.8, y: -5.0 + bob };
    lean = 0.12;
  }
  return { hip: [hx, hy], lean, tilt: -lean * 0.55, legs, hands, mallet, load: L, flap: 1 };
};
const STAND_LEGS = [[1.5, -1.2, 0], [-1.3, -1.2, 0]];
const workerPose = (look, pose, f, load) => {
  const mason = look === "mason";
  switch (pose) {
    case "run": return runPose(look, f, load);
    case "hammer": {
      const K = [
        { hip: [-0.3, -7.6], lean: -0.12, hands: [[3.4, -17.4, -1, 5.4, -12.4], [3.2, -4.6, 1]], mallet: -2.7 },
        { hip: [0.0, -7.5], lean: 0.08, hands: [[6.4, -12.8, -1, 4.6, -10.0], [3.4, -5.0, 1]], mallet: -0.95 },
        { hip: [0.3, -7.0], lean: 0.3, hands: [[6.0, -5.2, 1, 3.8, -6.0], [2.8, -4.6, 1]], mallet: 0.45 },
      ][f];
      return { ...K, tilt: -K.lean * 0.4, legs: [[2.8, -1.2, 0], [-2.4, -1.2, 0]] };
    }
    case "hand": {
      const blk = f < 3;
      const K = [
        { hip: [-0.6, -5.6], lean: 0.5, hands: [[4.0, -2.4, 1], [5.2, -3.0, 1]], load: { kind: "block", x: 4.8, y: -2.2 }, legs: [[2.4, -1.2, 0], [-2.2, -1.2, 0.15]] },
        { hip: [-0.2, -7.3], lean: 0.1, hands: [[3.2, -7.2, 1], [4.4, -7.8, 1]], load: { kind: "block", x: 4.0, y: -7.6 }, legs: STAND_LEGS },
        { hip: [0.0, -8.0], lean: -0.18, hands: [[4.8, -17.0, -1, 5.0, -12.2], [3.4, -17.6, -1, 3.0, -12.6]], load: { kind: "block", x: 4.2, y: -19.2 }, legs: [[1.8, -1.7, 0.35], [-1.2, -1.6, 0.35]] },
        { hip: [0.0, -8.0], lean: -0.14, hands: [[5.2, -17.8, -1, 5.1, -12.6], [3.8, -18.2, -1, 3.2, -12.8]], load: null, open: true, legs: [[1.8, -1.7, 0.35], [-1.2, -1.6, 0.35]] },
      ][f];
      if (!blk) K.load = null;
      return { tilt: -K.lean * 0.3, ...K };
    }
    case "pick": {
      const K = [
        { hip: [-1.0, -5.2], lean: 0.62, hands: [[4.4, -0.6, 1], [5.4, -1.0, 1]], load: null, legs: [[2.4, -1.2, 0], [-2.4, -1.2, 0.2]] },
        { hip: [-1.0, -5.4], lean: 0.55, hands: [[4.0, -1.8, 1], [5.2, -2.4, 1]], load: { kind: "block", x: 4.8, y: -1.4 }, legs: [[2.4, -1.2, 0], [-2.4, -1.2, 0.2]] },
        { hip: [0.0, -7.7], lean: 0.06, hands: [[3.0, -5.8, 1], [4.4, -6.4, 1]], load: { kind: "block", x: 3.8, y: -6.2 }, legs: STAND_LEGS },
        { hip: [0.4, -7.5], lean: 0.22, hands: [[6.2, -10.6, 1], [5.6, -11.2, 1]], load: null, open: true, legs: [[2.8, -1.2, 0], [-2.2, -1.4, 0.3]] },
      ][f];
      return { tilt: -K.lean * 0.5, ...K };
    }
    case "jump": {
      const K = [
        { hip: [-0.4, -5.2], lean: 0.4, hands: [[-3.4, -3.2, -1], [-2.8, -2.6, -1]], mallet: 2.3, legs: [[2.0, -1.2, 0], [-1.6, -1.2, 0.2]] },
        { hip: [0.0, -8.6], lean: 0.02, hands: [[4.8, -16.6, -1, 4.8, -11.8], [-3.6, -15.4, -1, -3.8, -11.0]], mallet: -1.9, legs: [[2.4, -3.4, -0.2], [-1.4, -4.4, 0.5]] },
        { hip: [0.0, -8.3], lean: -0.04, hands: [[6.2, -13.8, -1, 4.8, -10.4], [-4.8, -13.2, -1, -3.8, -10.0]], mallet: -1.4, legs: [[1.4, -0.9, 0.35], [-1.3, -0.7, 0.45]] },
      ][f];
      return { tilt: 0, flap: f === 2 ? -0.5 : 0.3, ...K, mallet: mason ? K.mallet : null };
    }
    case "land": {
      const K = [
        { hip: [0.4, -4.4], lean: 0.5, hands: [[4.8, -4.4, 1], [-2.6, -3.6, -1]], mallet: 0.2, legs: [[2.7, -1.2, 0], [-2.5, -1.2, 0]] },
        { hip: [0.2, -6.4], lean: 0.22, hands: [[3.4, -4.8, 1], [-2.4, -4.2, -1]], mallet: 0.6, legs: [[2.5, -1.2, 0], [-2.3, -1.2, 0]] },
      ][f];
      return { tilt: -K.lean * 0.5, flap: 0.2, ...K, mallet: mason ? K.mallet : null };
    }
    case "cheer": {
      const hip = f ? [0, -8.2] : [0, -7.8];
      return { hip, lean: -0.06, tilt: -0.15, legs: f ? [[1.5, -1.6, 0.3], [-1.3, -1.6, 0.3]] : STAND_LEGS,
        hands: [[4.8, -18.2 - f * 0.6, -1, 5.0, -12.6], [-3.2, -15.8 - f, -1, -3.6, -11.6]], mallet: mason ? -1.75 : null, open: !mason };
    }
    default:
      return { hip: [0, -7.8], lean: 0.02, legs: STAND_LEGS, hands: [[2.6, -0.9, 1], [-2.4, -1.0, 1]], mallet: mason ? 1.35 : null };
  }
};

// The climb, seen from behind: hand over hand up a ladder facing us.
const workerClimb = (ctx, pal, look, f) => {
  const side = f < 2 ? 1 : -1;                       // which foot is up
  const mid = f % 2 === 1;
  const footUp = mid ? -1.6 : -3.2, handUp = mid ? -21.8 : -23.0;
  const legC = pal.boots, farLeg = darken(pal.boots, 0.12);
  // legs: one boot on the rung, the other lifted to the next
  for (const s of [-1, 1]) {
    const up = s === side, fx = s * 1.4, fy = up ? footUp : 0;
    const kx = s * 2.0, ky = up ? fy - 3.6 : -3.9;
    limb(ctx, s * 1.1, -7.8, kx, ky, 2.7, up ? legC : farLeg);
    limb(ctx, kx, ky, fx, fy - 1.0, 2.3, up ? legC : farLeg);
    blob(ctx, [[fx - 1.2, fy - 1.6], [fx + 1.2, fy - 1.6], [fx + 1.3, fy + 0.3, 1], [fx - 1.3, fy + 0.3, 1]], darken(pal.boots, 0.2), { hi: 0.3 });
  }
  // the back of the jerkin, the belt, the apron's bow
  blob(ctx, [[-3.5, -16.8], [0, -17.4], [3.5, -16.8], [3.9, -11], [3.5, -5.6, 1], [-3.5, -5.6, 1], [-3.9, -11]], pal.coat, {
    hi: 0.25, lo: 0.4, then: (c) => {
      dab(c, -4, -10.4, 8, 1.2, darken(pal.trim, 0.1));
      dab(c, -4, -6.4, 8, 0.8, darken(pal.coat, 0.4));
      dab(c, -0.2, -15.6, 0.5, 5, darken(pal.coat, 0.3));                              // the back seam
      if (look !== "hod") { dab(c, -4, -16.2, 1.2, 6, darken(pal.apron, 0.2)); dab(c, 2.9, -16.2, 1.2, 6, darken(pal.apron, 0.2)); }   // the bib's straps
    },
  });
  blob(ctx, [[-1.0, -11.0, 1], [1.0, -11.0, 1], [1.4, -9.0, 1], [0, -9.8], [-1.4, -9.0, 1]], darken(pal.apron, 0.12), { hi: 0.3 });   // the apron's knot
  if (look === "mason") {
    // the mallet stuck through the belt while his hands are on the rungs
    part(ctx, (c) => { c.strokeStyle = WK.haft; c.lineWidth = 1; c.beginPath(); c.moveTo(3.0, -12.0); c.lineTo(3.8, -6.8); c.stroke(); });
    blob(ctx, [[2.3, -7.4, 1], [5.4, -7.8, 1], [5.6, -5.4, 1], [2.5, -5.0, 1]], WK.maul, { hi: 0.35 });
  }
  // the head from behind: the neck, the ears, the coif or the hair and cap
  dab(ctx, -1, -18.2, 2, 1.2, darken(pal.skin, 0.25));
  const hy = -20.8;
  if (look === "mason") {
    blob(ctx, [[-2.7, hy + 2.6, 1], [-3.0, hy], [-2.3, hy - 2.8], [0, hy - 3.5], [2.3, hy - 2.8], [3.0, hy], [2.7, hy + 2.6, 1]], pal.hood, {
      hi: 0.3, lo: 0.42, then: (c) => { dab(c, -0.2, hy - 3.4, 0.5, 4.4, darken(pal.hood, 0.3)); dab(c, -3, hy + 1.4, 6, 0.7, darken(pal.hood, 0.35)); },
    });
    blob(ctx, [[-0.9, hy + 1.2], [0.9, hy + 1.2], [0.6, hy + 3.4, 1], [-0.6, hy + 3.4, 1]], darken(pal.hood, 0.12), { hi: 0.2 });   // the tie at the nape
  } else {
    dab(ctx, -2.9, hy - 0.8, 1, 1.4, pal.skin); dab(ctx, 1.9, hy - 0.8, 1, 1.4, pal.skin);    // the ears
    blob(ctx, [[-2.3, hy + 1.8], [-2.5, hy - 1.2], [-1.3, hy - 2.7], [1.3, hy - 2.7], [2.5, hy - 1.2], [2.3, hy + 1.8], [0, hy + 2.5]], pal.hair, { hi: 0.25 });
    const tall = look === "setter";
    blob(ctx, [[-2.7, hy - 1.2, 1], [2.7, hy - 1.2, 1], [2.3, hy - 3.2], [0, hy - (tall ? 5.4 : 4.2)], [-2.3, hy - 3.2]], pal.hood, {
      hi: 0.3, then: (c) => dab(c, -3, hy - 2.1, 6, 0.8, tall ? lighten(pal.hood, 0.3) : darken(pal.hood, 0.35)),
    });
  }
  // arms up to the rails either side of the head, one reaching higher
  for (const s of [-1, 1]) {
    const hi = s === -side;
    const hx = s * 3.4, hy2 = hi ? handUp : handUp + 2.6, ex = s * 4.6, ey = hi ? -19.8 : -18.6;
    limb(ctx, s * 3.0, -16.2, ex, ey, 2.4, s < 0 ? darken(pal.coat, 0.1) : pal.coat);
    limb(ctx, ex, ey, hx, hy2, 2.2, s < 0 ? darken(pal.coat, 0.1) : pal.coat);
    hand(ctx, hx, hy2, pal.skin);
  }
};

export const drawWorker = (ctx, x, y, dir, pal, pose, frame = 0, o = {}) => {
  const look = o.look || "mason";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  if (o.shadow) shadow(ctx, 1, 0.4, 4.6, 1.6, 0.3);
  if (pose === "climb") workerClimb(ctx, pal, look, frame % 4);
  else workerBody(ctx, pal, look, workerPose(look, pose, frame % (WORKER_POSES[pose] || 1), !!o.load));
  ctx.restore();
};

