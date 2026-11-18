// ============ CONCEPT FIGURES: the Paladin Order's knight from the FRONT and BEHIND ============
// Same drawer as the garrison knight (fig-garrison-views.js `knightViews`): ivory plate and gold,
// a closed flat-topped great helm (front: the gilt cross-slit with breathing holes; back: a gilt
// seam and rivets), the gold-flanged mace in the right fist (screen left in front), the ringed
// silver sun-staff held up in the left. From behind the mace is hidden by the body (owner's rule).
import { mat, flat } from "./pix.js";
import { knightViews } from "./fig-garrison-views.js";
import { CLIPS, BONES, BOX } from "./fig-paladin.js";
import { SKIN, LEATHER } from "./fig-garrison.js";

const IVORY = mat("#d6d0be", { contrast: 1.45 }), IVMAIL = mat("#9a988e", { contrast: 1.15 }), GOLD = mat("#d8b34a", { contrast: 1.15 });
const COAT = mat("#ece6d2", { contrast: 1.5 }), SILVER = mat("#dfe3ea", { contrast: 1.25 }), WOOD = mat("#6a4a2e"), SLIT = flat("#2a2430");
const FRONT_H = [
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MWWMMMMMMMM.",
  ".MWMMMMMMMMM.",
  ".mmmmmmmmmmm.",
  ".GGGGGGGGGGG.",
  ".MKKKKKKKKKM.",
  ".MMMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  "..mMMMMMMMm..",
  "..ccccccccc..",
];
const BACK_H = [
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MWWMMMMMMMM.",
  ".MWMMMMMMMMM.",
  ".mmmmmmmmmmm.",
  ".GGGGGGGGGGG.",
  ".MMMMMMMMMMM.",
  ".MMGMMMMMGMM.",
  ".MMMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  "..mMMMMMMMm..",
  "..ccccccccc..",
];
const LEG = { M: { m: IVORY }, W: { m: IVORY, bias: 1 }, m: { m: IVORY, bias: -1 }, G: { m: GOLD, fix: 3 }, K: { m: SLIT }, c: { m: IVMAIL } };
const look = () => ({
  front: FRONT_H, back: BACK_H, blink: FRONT_H, LEG, ay: 10, ball: [6.5, 5.5, 6.6, 6.6],
  plate: IVORY, mail: IVMAIL, cop: GOLD, rim: IVORY, trim: GOLD, coat: COAT, hem: GOLD, sun: GOLD, backCross: false,
  plume: null, weapon: "mace", wood: WOOD, shield: "kite", rim: GOLD, field: COAT, shieldSun: true,
});
const set = knightViews({ NAME: "paladin", BOX, BONES, walk: CLIPS.walk, W: 1, look });
export const FRONT = set.FRONT, BACK = set.BACK;
