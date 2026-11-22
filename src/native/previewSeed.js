// A PREVIEW build's starting save (2026-11-21, owner: "put some progress on the campaign map to get
// me to the first level that has it"). Only a build made with VITE_PREVIEW_SEED=1 loads this file
// (main.jsx); the real game never does. On a device with no levels cleared it writes a save with the
// Greenwood and the Iron Marches won and the Grave Road cleared, so Saltgrave Strand (the first Blood
// Moon level) is next, and every hall's paths and finals open. Each new SEED_V also tops the crown's
// treasury up to TREASURY once (owner, 2026-11-22: "give me more castle works gold"): 350,000 buys
// every castle work to its top tier. Plain ids, no imports: the stores read their keys at load.
const SEED_V = "2";
const TREASURY = 350000;
const CLEARED = ["gw1", "gw2", "gullwick", "millrace", "foxmere", "gw3", "bramblewick", "gw4", "wolfrun", "thistlecrag",
  "kingstones", "ravenscar", "blackbriar", "cinderholt", "gw5", "ir1", "muster", "ir2", "brinewick", "ironmouth",
  "gallowscross", "ir3", "kestrel", "ir4", "coldwater", "crowstair", "wardenmoor", "blackcliff", "undercliff", "ir5", "hl1"];
const HALLS = ["archer", "knight", "wizard", "catapult", "spiker", "goldworks", "trapsmith", "falconry", "gunpowder",
  "riverwatch", "assassin", "sunforge", "support", "band"];
export const seedPreview = () => {
  try {
    if (localStorage.getItem("cg-preview-seed") === SEED_V) return;
    const camp = JSON.parse(localStorage.getItem("crownguard.campaign.v1") || "{}");
    if (!camp.cleared || !Object.keys(camp.cleared).length) {
      camp.cleared = Object.fromEntries(CLEARED.map((id) => [id, true]));
      const prof = JSON.parse(localStorage.getItem("crownguard.profile.v1") || "{}");
      prof.stats = { ...(prof.stats || {}), levelsCleared: Math.max(prof.stats?.levelsCleared || 0, CLEARED.length) };
      prof.towerXp = { ...Object.fromEntries(HALLS.map((k) => [k, 10000])), ...(prof.towerXp || {}) };
      localStorage.setItem("crownguard.profile.v1", JSON.stringify(prof));
    }
    camp.treasury = Math.max(Number(camp.treasury) || 0, TREASURY);
    localStorage.setItem("crownguard.campaign.v1", JSON.stringify(camp));
    localStorage.setItem("cg-preview-seed", SEED_V);
  } catch { /* no storage in this frame: start fresh */ }
};
