// ============ SHARED: the bowmen's layer rules (hall bowman, field bowman, Barrow Archer) ============
// The bow, string, arrow and arms were layered for aim 0 and never re-ordered as the weapon turns
// (art/briefs/joints-clipping-plan.md, section 2). One order, named, with the rules that move a part
// for the aim; every bow figure draws through `bowZ(pose, aim)` and tags what it draws, so
// `scripts/pix-audit.mjs` can check each figure's MUST list at every aim from -70 to +70.
//
//   order (back to front): deep (an arrow stowed behind the quiver) quiver farArm bowLower bowUpper bowGrip
//   farHand legFar legNear torso cape hoodTail hood string arrow carry face nearArm nearHand
//   (the string arm over the shoulder to the quiver: nearArm, nearHand and carry move down behind hoodTail; so
//   does the draw arm itself when the shot is steeply down (> 20): its elbow rides up behind the head, and only
//   the hand, at the chin, stays in front)
//   `aim` is the EFFECTIVE aim: the variant's degrees x the pose's aim weight, so a figure at rest never reorders.
//
//   - the FACE is above the string, the arrow and the bow: nothing of the weapon is ever drawn across it;
//     the hood (the part of the head that is not face) is below them, so the string and the limbs may cross
//     the cowl but the face stays whole.
//   - aim up (< -12): the upper limb swings back over the head; it goes IN FRONT of the hood (behind the face).
//   - aim down (> 12): the lower limb swings back toward the hip; it goes IN FRONT of the tunic and legs
//     (it is on the far side, but the near arm and the string hand are over it).
//   - the string arm carried over the shoulder to the quiver (`nb`) is behind the head, in front of the cape.
// Tags the figures write: quiver farArm bowLower bowUpper bowGrip farHand string arrow nearArm nearHand head face.
import { layers } from "./pix.js";

export const BOW_ORDER = ["deep", "quiver", "farArm", "bowLower", "bowUpper", "bowGrip", "farHand", "legFar", "legNear", "torso", "cape", "hoodTail", "hood", "string", "arrow", "carry", "face", "nearArm", "nearHand"];
export const BOW_RULES = [
  { when: (p, aim) => aim < -12, put: "bowUpper", above: "hood" },
  { when: (p, aim) => aim > 12, put: "bowLower", above: "torso" },
  { when: (p, aim) => aim > 20, put: "nearArm", above: "cape" },          // the draw elbow comes up behind the head
  { when: (p) => (p.nb || 0) >= 0.5, put: "nearArm", above: "cape" },
  { when: (p) => (p.nb || 0) >= 0.5, put: "nearHand", above: "nearArm" },
  { when: (p) => (p.nb || 0) >= 0.5, put: "carry", above: "nearHand" },
  { when: (p) => (p.aa || 0) > 0.8, put: "carry", above: "deep" },
];
export const bowZ = layers(BOW_ORDER, BOW_RULES, { z0: 1, step: 1 });

// Stamp a head, lifting the FACE glyphs (`faceChars`) to `faceZ` so they sit above the string and the bow,
// and tag them for the audit: the head's cells tag "head", the face's "face", the eyes' `eyeChars` "eyes"
// (the eyes sit above even the string hand: a hand may pass over the cheek, never over an eye) (px.foot.face / px.foot.eyes list each footprint's pixels BEFORE anything else is drawn on them).
export const stampFace = (px, rows, x, y, legend, z, faceZ, o, faceChars, eyeChars = "E", eyeZ = faceZ) => {
  px.tag("head"); const headIx = px._tag;
  const lg = {};
  for (const [c, e] of Object.entries(legend)) lg[c] = eyeChars.includes(c) ? { ...e, dz: eyeZ - z } : faceChars.includes(c) ? { ...e, dz: faceZ - z } : e;
  px.stamp(rows, x, y, lg, z, o);
  px.tag("face"); const faceIx = px._tag; px.tag("eyes"); const eyeIx = px._tag; px.tag(null);
  const gx = Math.round(x) - (o.ax || 0), gy = Math.round(y) - (o.ay || 0), face = [], eyes = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (!faceChars.includes(ch)) return;
    const i = gx + c + Math.floor(px.ox), j = gy + r + Math.floor(px.oy);
    if (i < 0 || j < 0 || i >= px.w || j >= px.h) return;
    const k = j * px.w + i;
    face.push(k);
    const eye = eyeChars.includes(ch); if (eye) eyes.push(k);
    if (px.tg[k] === headIx) px.tg[k] = eye ? eyeIx : faceIx;
  }));
  px.foot = { face: Int32Array.from(face), eyes: Int32Array.from(eyes) };
};

// The bow: two limbs sprung from a grip, each its own tagged part so the layer rules can address them.
//   R(x, y) the bow's frame (grip at the hand); spec { g, rg, mid:[x,y], rm, tip:[x,y], rt, tipEnd:[x,y]?, grip: mat, gripR, gripHalf }
//   y is the limb's half-length; the upper limb is y < 0. Returns the limbs' two string ends [top, bot].
export const drawLimbs = (px, R, S, mat, gripMat, Z) => {
  px.part();
  for (const [name, s, z] of [["bowUpper", -1, Z.bowUpper], ["bowLower", 1, Z.bowLower]]) {
    px.tag(name);
    px.capsule(...R(0.3, s * S.g), S.rg, ...R(S.mid[0], s * S.mid[1]), S.rm, mat, z, { edge: true });
    px.capsule(...R(S.mid[0], s * S.mid[1]), S.rm, ...R(S.tip[0], s * S.tip[1]), S.rt, mat, z, { edge: true });
  }
  px.tag("bowGrip");
  px.capsule(...R(0.3, -S.gripHalf), S.gripR, ...R(0.3, S.gripHalf), S.gripR, gripMat, Z.bowGrip + 0.02);
};
