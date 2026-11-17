// ============ The crown's soldiers and heroes: what the engine and the board still read ============
// The painters that drew these figures (the old "soldier" rig) are gone: every one is a pix figure now
// (render/pix/fig-*.js, listed in pix/pixrigs.js PIX). Two small things stayed.

// Every crown soldier's fight sheet has four frames (enemies.js fightFrame picks them off the
// attack clock): melee 0 guard, 1 wind-up, 2 strike, 3 follow-through; the bow 0 full draw,
// 1 loose, 2 reach to the quiver, 3 nock.
export const CROWN_FIGHT_FRAMES = Object.fromEntries([
  "knight", "errant", "paladin", "champion", "halberdier", "squire", "bowman", "farmer", "yeoman",
  "heroKnight", "heroHunter", "heroFriar", "heroCaptain", "heroStorm", "errantBow", "errantRider",
].map((t) => [t, 4]));

// Where Ysolde's crystal is, from her feet, facing +x, in board units at her height (+y down):
// engine/heroes/ysolde.js starts every bolt there, and the sims run with no canvas, so these are
// numbers, measured off her staff's pose when the painter was retired. sheet "walk" | "fight" |
// "sky", frame 0-3 (0 ready, 1 release, 2 recoil, 3 recover; the sky sheet 0 raise ... 3 hold).
const STORM_TIP = { // re-measured 2026-11-15 (round 4: the staff locked to her hand), figure px x 0.2; x1.22 for the taller Ysolde (scale pass, 2026-11-17)
  walk: [[6.2, -27.4], [7.8, -27.9], [9.9, -26.8], [7.8, -27.9]],
  fight: [[7.8, -29.4], [24.5, -21.8], [14.2, -29.0], [10.0, -29.5]],
  sky: [[13.4, -30.4], [12.7, -32.8], [12.4, -32.9], [13.1, -32.7]],
};
export const stormStaffTip = (sheet = "fight", frame = 1) => (STORM_TIP[sheet] || STORM_TIP.fight)[Math.max(0, Math.min(3, Math.floor(frame) || 0))];
