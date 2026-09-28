// ============ WHERE EACH SHOT LEAVES ITS WEAPON ============
// The engine starts every shot at the art: the arrow at the bow hand, the
// musket ball at the muzzle, the orb and the lightning at the staff's head,
// the bolt at the ballista's nose, the flask and the shell at the throwing
// hand. The points come from the figures' own pose tables (render/folk-*.js
// are pure maths, safe in node and in the sims), so a pose that moves takes
// its shots with it. World units, y down; `f` is the facing the hall draws
// its crew with (+1 east, -1 west): the last aim, as the halls read it.
// If a hall moves its crew or its deck, move the matching numbers here.
import { archerPose } from "../render/folk-archer.js";
import { mageTip } from "../render/folk-casters.js";
import { musketMuzzle, mistressGlove } from "../render/folk-gunners.js";
import { skiffMuzzle, SKIFF_LIFT, skiffBob } from "../render/rigs-skiff.js";
import { archerLayout } from "./towers.js";
import { nearestOnPath, SEGS } from "./path.js";
export { MUSKET_LIFE } from "../render/musketfx.js";

export const facing = (t) => (Math.cos(t.lastAim || 0) >= 0 ? 1 : -1);

// The archer at the loose: his bow hand on the grip, where the arrow leaves
// the string (folk-archer.js "loose": the grip plus the body's lean; a big
// bow's figure is drawn 1.15 up). Figure space, feet at 0, facing +x.
const bowHand = (big) => {
  const P = archerPose("loose"), s = big ? 1.15 : 1;
  return [s * (P.g[0] + P.lean), s * (P.g[1] + P.bob)];
};

// An archer hall's arrow from the archer at `spot` (archerLayout's [dx, dy];
// halls/archer.js stands him at (x + dx, y - h + 3 + dy)). The Ballista's
// bolt leaves the nose of its stock (halls/archer.js siegeBow: stamped at
// (x - 2f, y - h + 1), the stock 12 up and tipped -0.2, its nose 16 out).
export const arrowFrom = (t, [dx, dy]) => {
  const lay = archerLayout(t), f = facing(t);
  if (t.branch === "b" && t.rank4 === "a") return [t.x + f * 13.3, t.y - lay.h - 16.1];
  const [gx, gy] = bowHand(lay.big);
  return [t.x + dx + f * gx, t.y - lay.h + dy + 3 + gy];
};

// A castle bowman on the walk (castle.js: his feet at BOW_X + 2, a step
// forward or back every other man, 8 below his slot; he faces west).
export const wallArrowFrom = (bowX, slotY, big) => {
  const [gx, gy] = bowHand(big);
  const fx = bowX + 2 + (Math.round(slotY / 24) % 2 ? 4 : -1);
  return [fx - gx, slotY + 8 + gy];
};

// The Wizard Spire's orb (and the Stormcaller's lightning) at the head of
// the mage's staff as he drives it at the foe (halls/wizard.js: the mage
// stands 7 above the walk, the walk at spire height 18 + 6/level + 4
// branched; folk-casters.js mageTip(level, "strike")).
export const staffFrom = (t) => {
  const level = t.branch ? 3 : t.level;
  const spire = 18 + t.level * 6 + (t.branch ? 4 : 0);
  const [tx, ty] = mageTip(level, "strike");
  return [t.x + facing(t) * tx, t.y - spire - 7 + ty];
};

// The Powder Works stands one way for good: its store faces the road it was
// built to watch (the nearest point of it), the musketeer on that side of
// the deck and the bombardier behind him. Only the two men turn, each to
// his own last shot, and each holds it until his next (t.bAim, t.mAim).
export const powderHome = (t) => {
  if (t.face0 == null) t.face0 = !SEGS.length || nearestOnPath(t.x, t.y).x >= t.x ? 1 : -1;
  return t.face0;
};
export const bomberFacing = (t) => (t.bAim == null ? powderHome(t) : Math.cos(t.bAim) >= 0 ? 1 : -1);
export const musketFacing = (t) => (t.mAim == null ? powderHome(t) : Math.cos(t.mAim) >= 0 ? 1 : -1);

// The musketeer's ball at the muzzle as the shot kicks (halls/gunpowder.js:
// he stands 6.5 out from the hall on its deck, 9 + level up, and 2.5 above
// it; his gun by the branch — the Sharpshooters' long barrel, the grape
// bell — as GUNS there has them).
const GUNS = { plain: [7.5, 0], sharp: [13.5, 0], grape: [8, 1.2] };
export const muzzleFrom = (t) => {
  const lvl = t.branch ? 3 : t.level, f = musketFacing(t);
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const [len, lip] = GUNS[r4 === "ba" ? "sharp" : r4 === "bb" ? "grape" : "plain"];
  const mz = musketMuzzle("kick", len, lip);
  return [t.x + powderHome(t) * 6.5 + f * mz.x, t.y - 9 - lvl - 2.5 + mz.y];
};

// The bombardier's shell at the top of his throw (halls/gunpowder.js: he
// stands 5.5 back on the deck, and the charge leaves his hand 7 ahead of
// him; folk-gunners.js bomberFrame "whip").
export const shellFrom = (t) => {
  const lvl = t.branch ? 3 : t.level;
  return [t.x - powderHome(t) * 5.5 + bomberFacing(t) * 7, t.y - 34 - lvl];
};

// A River Watch skiff's ball at the muzzle as the shot kicks: the gunner in
// the bow (rigs-skiff.js skiffMuzzle; enemies.js drawSkiff stands the rig
// SKIFF_LIFT under u.y, bobbing on the water, facing u.face).
export const skiffShotFrom = (u, time) => {
  const [mx, my] = skiffMuzzle("kick");
  return [u.x + (u.face < 0 ? -1 : 1) * mx, u.y + SKIFF_LIFT + skiffBob(time, u.id) + my];
};

// A bowman of the bands (Wren, her retinue's archers): the bow hand at full
// draw (rigs-crown.js's "bow" grip, measured off the painter: 6.9 out and
// 16.6 up from the feet, which enemies.js stands at u.y + 9; the retinue's
// bowman is drawn at 21/22 of Wren's height).
export const bandArrowFrom = (u, hero) => {
  const s = hero ? 1 : 21 / 22, f = u.face < 0 ? -1 : 1;
  return [u.x + f * 6.9 * s, u.y + 9 - 16.6 * s];
};

// A foe that looses on the march: the crossbowman's quarrel from the nose of
// the arbalest carried across his chest (rigs-iron.js walk: the fore hand
// ~5 out and 15 up, the nose 4 past it), the barrow archer's arrow from its
// bow hand (rigs-hollow.js walk: ~4 out, 12 up). enemies.js stands a rig's
// feet at e.y + size * 0.55, facing e.face.
export const foeShotFrom = (e) => {
  const feet = e.y + (e.size || 14) * 0.55, f = e.face < 0 ? -1 : 1;
  return e.type === "bonearcher" ? [e.x + f * 4, feet - 12.4] : [e.x + f * 8.8, feet - 15];
};

// ---- the Falconry's birds (halls/falconry.js draws them from these) ----------
// Her perch h over the hall's foot and where she stands on it (my); how many
// birds the mews keeps; which bird is which (the King's Eagle is bird 0 of
// the Eyrie of Kings, every Storm Falcon a storm bird).
const falconLvl = (t) => (t.branch ? 3 : t.level);
export const falconPerch = (t) => {
  const lvl = falconLvl(t);
  const h = lvl === 1 ? 22 : lvl === 2 ? 28 : t.branch ? 34 : 32;
  return { h, my: t.y - h - 2 + (lvl === 1 ? -1 : 0) };
};
export const falconCount = (t, st) => {
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  return r4 === "bb" ? 3 : st.shots >= 3 ? 3 : (t.branch === "a" || falconLvl(t) >= 2) ? 2 : 1;
};
export const falconKind = (t, b) => {
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  return r4 === "ab" ? "storm" : r4 === "ba" && b === 0 ? "king" : "hawk";
};
// bird b of n on the wheel over the mews at game time `time` (seconds)
export const wheelAt = (t, b, n, time) => {
  const ang = time * 1.7 + t.id * 0.7 + (b / n) * Math.PI * 2, { my } = falconPerch(t);
  return [t.x + Math.cos(ang) * 18, my - 28 + Math.sin(ang) * 6];
};
// a bird sitting on her glove in `pose` (folk-gunners.js mistressGlove), facing f
export const gloveBirdAt = (t, pose, f = facing(t)) => {
  const [gx, gy] = mistressGlove(pose), { my } = falconPerch(t);
  return [t.x + f * (gx + 1), my + gy - 3.1];
};

// The Transmuter's shots: the alchemist's flask at the release, his feet at
// halls/goldworks.js crewSpot, facing west — or, the Midas Cannon, the
// gilded gun's muzzle (it points east: its smoke and flash sit at x + 21).
export const flaskFrom = (t) => {
  if (t.rank4 === "a") return [t.x + 21, t.y - 5.5];
  return [t.x + (t.rank4 ? -8 : 4), t.y - 14];
};
