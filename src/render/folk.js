// ============ FOLK ============
// The little people's old painters are gone (the tower crews, the wall folk and the build crew
// are pix figures: pix/fig-*.js, drawn through pix/crews.js). What the engine and the sims still
// read are the shot points the old figures measured: folk-archer.js (the bow hand),
// folk-casters.js (the staff head), folk-gunners.js (the muzzle, the glove), folk-kit.js (their joint
// maths). This file only re-exports the one name a hall still imports from here.
export { mageTip } from "./folk-casters.js";
