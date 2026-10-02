// ============ THE NEWER HEROES' ENGINE HOOKS ============
// Each hero after Sir Aldric and Wren keeps its engine code in a file of its
// own here, keyed by its HEROES key; the shared engine calls into it at a few
// fixed points (Aldric's and Wren's code still lives inline in actions.js and
// update.js). Every hook is optional:
//
//   fire(g, b, u, a, id, x, y, tms)  an ability: a = b.st.abil[id] (grown
//       with level and talents), x/y the tap (aim "ground"/"foe"). Return true
//       if it went (the cooldown starts), false if refused (nothing to hit —
//       no cooldown), undefined if `id` is not this hero's. actions.js
//       fireHeroAbility.
//   tick(g, b, u, sdt, tms)  each frame the hero is alive and on the field
//       (not leaving through the gate), before the ordinary fighting; return
//       true to skip the ordinary fighting this frame (a channel, a dash).
//       update.js, the hero branch of the bands.
//   world(g, sdt, tms)  each unpaused frame of battle or build, hero or no —
//       the hero's lingering effects (keep them on g, e.g. g.consecrated).
//   shoot(g, b, u, target, tms)  a ranged hero's ordinary shot, in place of
//       the arrow (runRangedBand). The shot's clock is already reset.
//   strike(g, b, u, target, dealt, tms)  after each of a melee hero's blows
//       (runMelee), `dealt` what the blow was worth before armour.
//   hurt(g, b, u, amount, foe)  what a foe's blow actually takes off him —
//       return `amount` unchanged unless he is warded (runMelee and the held
//       foe of runRangedBand).
//
// Effects that need drawing live in render/heroes/<key>.js.
import osric from "./osric.js";
import hale from "./hale.js";
import ysolde from "./ysolde.js";

export const HERO_HOOKS = { osric, hale, ysolde };
export const heroHook = (key) => HERO_HOOKS[key] || null;
