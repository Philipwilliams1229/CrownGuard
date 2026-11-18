// ============ CONCEPT FIGURES: the Champion from the FRONT and BEHIND ============
// The Paladin's family at the Champion's build (fig-garrison-views.js `knightViews`, W = 1.6 with
// the scale-pass proxy of fig-champion.js, KS 0.8116): ivory plate and gold, a crowned great helm
// (a red gem at the front), a gold-rimmed kite shield on the left arm, the war hammer in the right
// fist, the blue cape: in front only its edges show behind the arms and legs, from behind it is
// the whole back. The hammer is hidden by the body from behind (owner's rule).
import { mat, flat } from "./pix.js";
import { knightViews } from "./fig-garrison-views.js";
import { CLIPS, BONES, BOX } from "./fig-champion.js";

const IVORY = mat("#b4bac8", { contrast: 1.35 }), IVMAIL = mat("#7a7e8c", { contrast: 1.15 }), GOLD = mat("#d8b34a", { contrast: 1.15 });
const COAT = mat("#ece6d2", { contrast: 1.5 }), WOOD = mat("#6a4a2e"), BLUE = mat("#3a5474", { contrast: 1.15 });
const GEM = flat("#c8383a", { emis: true, line: "#7a1c24" }), SLIT = flat("#2a2430");
const FRONT_H = [
  "..G.G.G.G.G..",
  "..GGGGRGGGG..",
  ".MMMMMMMMMMM.",
  ".MWWMMMMMMMM.",
  ".MWMMMMMMMMM.",
  ".mmmmmmmmmmm.",
  ".GGGGGGGGGGG.",
  ".MKKKKKKKKKM.",
  ".MMMMMGMMMMM.",
  ".MMMMMGMMMMM.",
  "..mMMMMMMMm..",
  "..ccccccccc..",
];
const BACK_H = [
  "..G.G.G.G.G..",
  "..GGGGGGGGG..",
  ".MMMMMMMMMMM.",
  ".MWWMMMMMMMM.",
  ".MWMMMMMMMMM.",
  ".mmmmGmmmmmm.",
  ".GGGGGGGGGGG.",
  ".MMMMMGMMMMM.",
  ".MMGMMGMMGMM.",
  ".MMMMMGMMMMM.",
  "..mMMMMMMMm..",
  "..ccccccccc..",
];
const LEG = { M: { m: IVORY }, W: { m: IVORY, bias: 1 }, m: { m: IVORY, bias: -1 }, G: { m: GOLD, fix: 3 }, R: { m: GEM }, K: { m: SLIT }, c: { m: IVMAIL } };
const look = () => ({
  front: FRONT_H, back: BACK_H, blink: FRONT_H, LEG, ay: 12, ball: [6.5, 6, 7, 6.8],
  plate: IVORY, mail: IVMAIL, cop: GOLD, rim: GOLD, field: COAT, shieldCross: GOLD, trim: GOLD, coat: COAT, hem: GOLD, cross: GOLD, backCross: false,
  plume: null, weapon: "hammer", wood: WOOD, shield: "kite", cape: BLUE,
});
const set = knightViews({ NAME: "champion", BOX, BONES, walk: CLIPS.walk, W: 1.6, KS: 0.8116, shK: 1.5, wk: 1.1, capeHem: -12.5, look });
export const FRONT = set.FRONT, BACK = set.BACK;
