// ============ CAPTAIN HALE of the Watch ============
// A halberdier who holds the road like a gate: he can hold several foes at
// once (`holds`) and his halberd sweeps through every foe he holds. His first
// ability is a triple half-circle sweep (Halberd Sweep; id `brace` kept so
// saved talents hold), his second calls watchmen and crossbowmen onto him.
// Engine: engine/heroes/hale.js; look: render/heroes/hale.js; figure:
// rigs-crown.js "heroCaptain". Numbers provisional (owner's playtest).
import { abilityLine } from "./kit.js";

export default {
  key: "hale",
  hero: {
    name: "Captain Hale", title: "of the Watch", rig: "heroCaptain", icon: "",
    blurb: "The captain of the castle watch. He holds three foes at once and his halberd sweeps through all of them. His sweep clears a half-circle, three times over.",
    base: { hp: 680, dmg: 15, rate: 950, range: 95, unitSpeed: 95, respawnMs: 14000, holds: 3 },
    perLevel: { hp: 95, dmg: 3 },
  },
  abilities: [
    { id: "brace", name: "Halberd Sweep", aim: "none", unlock: 1, cd: 22000, icon: "brace",
      desc: "Planted where he stands, three wide halberd swings, each a half-circle before him: all it reaches is struck and stunned, riders twice over.",
      base: { dmg: 40, beats: 3, lead: 320, gap: 520, r: 68, stun: 700, mounted: 2, harm: 0.6 }, perLevel: { dmg: 6 } },
    { id: "levy", name: "Sound the Levy", aim: "none", unlock: 5, cd: 45000, icon: "levy",
      desc: "Two watchmen and two crossbowmen fall in on the spot he stands for fifteen seconds; soldiers near him strike a quarter harder.",
      base: { men: 2, bows: 2, life: 15000, buff: 0.25, buffDur: 8000, r: 90, hp: 260, mdmg: 14, rate: 850, range: 72, bowHp: 150, bowDmg: 13, bowRate: 1000, bowRange: 130 }, perLevel: { hp: 20, mdmg: 2, bowHp: 12, bowDmg: 1.5 } },
  ],
  talents: [
    { id: "plate", name: "Watch Plate", desc: "+10% health a rank.", apply: (st, r) => { st.hp = Math.round(st.hp * (1 + 0.1 * r)); } },
    { id: "reach", name: "Long Reach", desc: "+8% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.08 * r); } },
    { id: "drill", name: "Drill", desc: "Swings 5% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.05 * r)); } },
    { id: "line", name: "Hold the Line", desc: "Holds one more foe at ranks 3 and 5.", apply: (st, r) => { st.holds += (r >= 3 ? 1 : 0) + (r >= 5 ? 1 : 0); } },
    { id: "muster", name: "Muster", desc: "Back on his feet 12% sooner a rank.", apply: (st, r) => { st.respawnMs = Math.round(st.respawnMs * (1 - 0.12 * r)); } },
    abilityLine("brace", "Halberd Sweep", "a longer reach", (a, r) => { a.r += 4 * r; a.stun += 100 * r; }),
    abilityLine("levy", "Sound the Levy", "the watchmen stay longer", (a, r) => { a.life += 1500 * r; a.mdmg *= 1 + 0.12 * r; a.bowDmg *= 1 + 0.12 * r; }),
  ],
  // his retinue: watchmen of the castle (the Gate Guard's halberdiers)
  retinue: { name: "Watchman", rig: "halberdier", at: [10, 15], joins: "a watchman falls in beside him!",
    st: { hp: 420, dmg: 24, rate: 880, range: 80, unitSpeed: 95, respawnMs: 10000 } },
};
