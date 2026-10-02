// ============ BROTHER OSRIC, battle friar ============
// A melee hero who blocks like a knight but strikes with HOLY blows (st.magic:
// runMelee deals them as magic and dealDamage lets them through a wraith),
// so he is the one hero who can stand against the Hollow Court. He mends the
// soldiers round him. Engine: engine/heroes/osric.js; look: render/heroes/osric.js;
// figure: rigs-crown.js "heroFriar". Numbers provisional (owner's playtest).
import { abilityLine } from "./kit.js";

export default {
  key: "osric",
  hero: {
    name: "Brother Osric", title: "the Lantern", rig: "heroFriar", icon: "",
    blurb: "A battle friar with a blessed mace. His blows are holy — wraiths feel them, and the dead take them hardest — and the soldiers round him mend while he stands.",
    // smite: his blows land that much again on the undead (engine/heroes/osric.js
    // strike); mend: a share of max health every mendEvery ms to every soldier
    // within mendRange. Sims (2026-10-02, --endure, posts 0.35/0.5/0.65, seeds
    // 1-2, no abilities fired): level with Aldric in the Greenwood (gw3) and
    // the early Iron (ir1), ~6% behind at ir2, level or ahead in the Hollow
    // (hl2, hl4; the Lichgate's best post 33 against his 48).
    base: { hp: 440, dmg: 22, rate: 820, range: 90, unitSpeed: 95, respawnMs: 13000, magic: true, smite: 0.75, mend: 0.05, mendEvery: 3000, mendRange: 70 },
    perLevel: { hp: 66, dmg: 4 },
  },
  abilities: [
    // the dead in the ring take dmg (holy magic, less their mres) and a stun;
    // the living on foot only a daze (that share of the stun) — so it hits
    // like Aldric's Slam in the Hollow and is a heal elsewhere
    { id: "sanctuary", name: "Sanctuary", aim: "none", unlock: 1, cd: 24000, icon: "sanctuary",
      desc: "A ring of light round him: heals every soldier in it, sears and stuns the undead, dazzles the living.",
      base: { dmg: 80, r: 70, heal: 0.35, stun: 1600, daze: 0.35 }, perLevel: { dmg: 16 } },
    // dmg a second to the undead on it (the living half), a `tick` burn that
    // a shield pip shrugs off; the dead are slowed `slow`, soldiers mend
    // `mend` of max health a second
    { id: "consecrate", name: "Consecrate", aim: "ground", unlock: 5, cd: 32000, icon: "consecrate",
      desc: "Blesses the ground you tap for six seconds: the undead burn and slow on it, soldiers on it mend.",
      base: { dmg: 45, r: 52, dur: 6000, mend: 0.04, slow: 0.35 }, perLevel: { dmg: 8 } },
  ],
  talents: [
    { id: "faith", name: "Iron Faith", desc: "+10% health a rank.", apply: (st, r) => { st.hp = Math.round(st.hp * (1 + 0.1 * r)); } },
    { id: "smite", name: "Smite", desc: "+8% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.08 * r); } },
    { id: "mercy", name: "Mercy", desc: "Mends 20% more a rank.", apply: (st, r) => { st.mend = st.mend * (1 + 0.2 * r); } },
    { id: "vigil", name: "Vigil", desc: "Mends soldiers 10% further away a rank.", apply: (st, r) => { st.mendRange = Math.round(st.mendRange * (1 + 0.1 * r)); } },
    { id: "rise", name: "Rise Again", desc: "Back on his feet 12% sooner a rank.", apply: (st, r) => { st.respawnMs = Math.round(st.respawnMs * (1 - 0.12 * r)); } },
    abilityLine("sanctuary", "Sanctuary", "a wider ring", (a, r) => { a.r += 5 * r; }),
    abilityLine("consecrate", "Consecrate", "the blessing lasts longer", (a, r) => { a.dur += 500 * r; }),
  ],
  // his retinue: Templars (the Paladin tree's look), holy blades like his own
  retinue: { name: "Templar", rig: "paladin", at: [10, 15], joins: "a templar takes up the mace beside him!",
    st: { hp: 340, dmg: 26, rate: 800, range: 80, unitSpeed: 100, respawnMs: 10000, magic: true } },
};
