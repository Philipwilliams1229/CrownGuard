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
    blurb: "A battle friar with a blessed mace. His blows are holy — wraiths feel them — and the soldiers round him mend while he stands.",
    base: { hp: 440, dmg: 22, rate: 820, range: 90, unitSpeed: 95, respawnMs: 13000, magic: true, mend: 0.05, mendEvery: 3000, mendRange: 70 },
    perLevel: { hp: 66, dmg: 4 },
  },
  abilities: [
    { id: "sanctuary", name: "Sanctuary", aim: "none", unlock: 1, cd: 24000, icon: "sanctuary",
      desc: "A ring of light round him: heals every soldier in it and sears and stuns the undead.",
      base: { dmg: 50, r: 70, heal: 0.35, stun: 1600 }, perLevel: { dmg: 10 } },
    { id: "consecrate", name: "Consecrate", aim: "ground", unlock: 5, cd: 36000, icon: "consecrate",
      desc: "Blesses the ground you tap for six seconds: the undead burn on it, soldiers on it mend.",
      base: { dmg: 30, r: 48, dur: 6000 }, perLevel: { dmg: 5 } },
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
