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
    // Her bolt: `dmg` magic to the mark, then `chain` leaps within
    // `chainRange`, each `chainFall` of the last (engine/heroes/ysolde.js).
    // Sims (2026-10-02, --endure, seeds 1-2, best post of 0.35/0.5/0.65):
    // level with Wren in the Greenwood, a little better in the Hollow (she
    // hits wraiths), a little worse in the Iron Marches — alone on a warded
    // column her bolts glance off (bench: ~6-14 dps to Wren's ~21-43) and
    // she lives on what the halls strip bare.
    base: { hp: 200, dmg: 26, rate: 950, range: 140, unitSpeed: 110, respawnMs: 10000, ranged: true, magic: true, chain: 1, chainRange: 60, chainFall: 0.6 },
    perLevel: { hp: 24, dmg: 5 },
  },
  abilities: [
    // a great bolt at the foe nearest the tap, on through `jumps` foes in all
    // (each within `chainRange` of the last, never the same twice), each leap
    // `fall` weaker (0.1: a tenth off each time), every one jolted `stun` ms.
    // Measured into a clump of 12 (level 5, foes x2): ~620-900 in all, beside
    // Wren's Volley ~630-1260 (aimed well) and Aldric's Slam ~480-1140; it
    // needs no aim and finds the column wherever it bends. (Was 80 + 14.)
    { id: "storm", name: "Chain Storm", aim: "foe", unlock: 1, cd: 20000, icon: "storm",
      desc: "A great bolt at the foe you tap that leaps through up to six foes, jolting each still a moment.",
      base: { dmg: 120, jumps: 6, fall: 0.1, pick: 80, chainRange: 80, stun: 400 }, perLevel: { dmg: 18 } },
    // gathers `delay` ms over the spot (a quick foe can walk out of it), then
    // strikes everything within `r` and stuns it `stun` ms; fliers `air` x.
    // Measured into a clump of 12 (level 5, foes x2): ~600-1630 — the most of
    // any hero's one blow, on the longest wait (Volley ~1260 every 18 s, Slam
    // ~1140 every 25). (Was 120 + 20 a level in r 60, stun 1.5 s.)
    { id: "thunder", name: "Thunderclap", aim: "ground", unlock: 5, cd: 40000, icon: "thunder",
      desc: "A thunderhead gathers over the spot you tap, then breaks: everything under it is struck and stunned — fliers twice as hard.",
      base: { dmg: 80, r: 56, delay: 600, stun: 1200, air: 2 }, perLevel: { dmg: 14 } },
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
