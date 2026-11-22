// A PREVIEW build's starting save (2026-11-21, owner: "put some progress on the campaign map to get
// me to the first level that has it"). Only a build made with VITE_PREVIEW_SEED=1 loads this file
// (main.jsx); the real game never does. On a device with no save yet it writes one: the Greenwood
// and the Iron Marches won and the Grave Road cleared, so Saltgrave Strand (the first Blood Moon
// level) is next; every hall's paths and finals open; some gold in the crown's treasury. A save
// with any level cleared is left alone. Plain ids, no imports: the stores read their keys at load.
const CLEARED = ["gw1", "gw2", "gullwick", "millrace", "foxmere", "gw3", "bramblewick", "gw4", "wolfrun", "thistlecrag",
  "kingstones", "ravenscar", "blackbriar", "cinderholt", "gw5", "ir1", "muster", "ir2", "brinewick", "ironmouth",
  "gallowscross", "ir3", "kestrel", "ir4", "coldwater", "crowstair", "wardenmoor", "blackcliff", "undercliff", "ir5", "hl1"];
const HALLS = ["archer", "knight", "wizard", "catapult", "spiker", "goldworks", "trapsmith", "falconry", "gunpowder",
  "riverwatch", "assassin", "sunforge", "support", "band"];
export const seedPreview = () => {
  try {
    const had = JSON.parse(localStorage.getItem("crownguard.campaign.v1") || "{}");
    if (had.cleared && Object.keys(had.cleared).length) return;
    localStorage.setItem("crownguard.campaign.v1", JSON.stringify({
      cleared: Object.fromEntries(CLEARED.map((id) => [id, true])), castle: {}, heroes: {}, treasury: 20000 }));
    {
      localStorage.setItem("crownguard.profile.v1", JSON.stringify({
        stats: { levelsCleared: CLEARED.length }, towerXp: Object.fromEntries(HALLS.map((k) => [k, 10000])) }));
    }
  } catch { /* no storage in this frame: start fresh */ }
};
