// ============ YSOLDE the Stormcaller ============
// A ranged MAGIC hero: her bolts chain between foes, hurt wraiths and glance
// off shield pips (magic). Fragile; never blocks (foes that reach her stop
// and fight her, as with Wren). Engine: engine/heroes/ysolde.js (her shot is
// the `shoot` hook); look: render/heroes/ysolde.js; figure: rigs-crown.js
// "heroStorm". Numbers provisional (owner's playtest).
import { abilityLine } from "./kit.js";

export default {
  key: "ysolde",
  hero: {
    name: "Ysolde", title: "the Stormcaller", rig: "heroStorm", icon: "",
    blurb: "A storm-mage of the high passes. Her lightning leaps from foe to foe and finds wraiths where arrows cannot — but steel shields shrug it off.",
    base: { hp: 200, dmg: 26, rate: 950, range: 140, unitSpeed: 110, respawnMs: 10000, ranged: true, magic: true, chain: 1, chainRange: 60, chainFall: 0.6 },
    perLevel: { hp: 24, dmg: 5 },
  },
  abilities: [
    { id: "storm", name: "Chain Storm", aim: "foe", unlock: 1, cd: 20000, icon: "storm",
      desc: "A great bolt at the foe you tap that leaps through up to six foes, jolting each still a moment.",
      base: { dmg: 80, jumps: 6, fall: 0.1, pick: 80, chainRange: 80, stun: 400 }, perLevel: { dmg: 14 } },
    { id: "thunder", name: "Thunderclap", aim: "ground", unlock: 5, cd: 40000, icon: "thunder",
      desc: "A thunderhead gathers over the spot you tap, then breaks: everything under it is struck and stunned — fliers twice as hard.",
      base: { dmg: 120, r: 60, delay: 600, stun: 1500, air: 2 }, perLevel: { dmg: 20 } },
  ],
  talents: [
    { id: "ward", name: "Storm Ward", desc: "+10% health a rank.", apply: (st, r) => { st.hp = Math.round(st.hp * (1 + 0.1 * r)); } },
    { id: "charge", name: "Static", desc: "+8% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.08 * r); } },
    { id: "quick", name: "Quickening", desc: "Casts 5% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.05 * r)); } },
    { id: "arc", name: "Forked Bolt", desc: "Her bolt leaps to one more foe at ranks 2 and 4.", apply: (st, r) => { st.chain += (r >= 2 ? 1 : 0) + (r >= 4 ? 1 : 0); } },
    { id: "far", name: "Far Sight", desc: "+7% range a rank.", apply: (st, r) => { st.range = Math.round(st.range * (1 + 0.07 * r)); } },
    abilityLine("storm", "Chain Storm", "one more leap a rank", (a, r) => { a.jumps += r; }),
    abilityLine("thunder", "Thunderclap", "a wider storm", (a, r) => { a.r += 5 * r; }),
  ],
  // no retinue yet (none of the crown's rigs is a mage's apprentice)
};
