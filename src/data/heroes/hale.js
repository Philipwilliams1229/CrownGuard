// ============ CAPTAIN HALE of the Watch ============
// A halberdier who holds the road like a gate: he can hold several foes at
// once (`holds`) and his halberd sweeps through every foe he holds. Built
// against charges (cavalry, boar riders: Brace Pikes) and to call the levy.
// Engine: engine/heroes/hale.js; look: render/heroes/hale.js; figure:
// rigs-crown.js "heroCaptain". Numbers provisional (owner's playtest).
import { abilityLine } from "./kit.js";

export default {
  key: "hale",
  hero: {
    name: "Captain Hale", title: "of the Watch", rig: "heroCaptain", icon: "",
    blurb: "The captain of the castle watch. He holds three foes at once and his halberd sweeps through all of them. Charges break on him.",
    base: { hp: 680, dmg: 15, rate: 950, range: 95, unitSpeed: 95, respawnMs: 14000, holds: 3 },
    perLevel: { hp: 95, dmg: 3 },
  },
  abilities: [
    { id: "brace", name: "Brace Pikes", aim: "none", unlock: 1, cd: 22000, icon: "brace",
      desc: "Sets his halberd for four seconds: what reaches him is impaled and stunned — riders twice over — and he takes half harm.",
      base: { dmg: 70, dur: 4000, stun: 1200, mounted: 2, harm: 0.5 }, perLevel: { dmg: 12 } },
    { id: "levy", name: "Sound the Levy", aim: "ground", unlock: 5, cd: 45000, icon: "levy",
      desc: "Three watchmen run out to the spot you tap for fifteen seconds; soldiers near it strike a quarter harder.",
      base: { men: 3, life: 15000, buff: 0.25, buffDur: 8000, r: 90, hp: 260, mdmg: 18, rate: 850, range: 72 }, perLevel: { hp: 20, mdmg: 2 } },
  ],
  talents: [
    { id: "plate", name: "Watch Plate", desc: "+10% health a rank.", apply: (st, r) => { st.hp = Math.round(st.hp * (1 + 0.1 * r)); } },
    { id: "reach", name: "Long Reach", desc: "+8% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.08 * r); } },
    { id: "drill", name: "Drill", desc: "Swings 5% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.05 * r)); } },
    { id: "line", name: "Hold the Line", desc: "Holds one more foe at ranks 3 and 5.", apply: (st, r) => { st.holds += (r >= 3 ? 1 : 0) + (r >= 5 ? 1 : 0); } },
    { id: "muster", name: "Muster", desc: "Back on his feet 12% sooner a rank.", apply: (st, r) => { st.respawnMs = Math.round(st.respawnMs * (1 - 0.12 * r)); } },
    abilityLine("brace", "Brace Pikes", "braced longer", (a, r) => { a.dur += 300 * r; }),
    abilityLine("levy", "Sound the Levy", "the watchmen stay longer", (a, r) => { a.life += 1500 * r; a.mdmg *= 1 + 0.12 * r; }),
  ],
  // his retinue: watchmen of the castle (the Gate Guard's halberdiers)
  retinue: { name: "Watchman", rig: "halberdier", at: [10, 15], joins: "a watchman falls in beside him!",
    st: { hp: 420, dmg: 24, rate: 880, range: 80, unitSpeed: 95, respawnMs: 10000 } },
};
