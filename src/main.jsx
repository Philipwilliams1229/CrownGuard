// Entry point. In the iOS app the save may first have to be put back from its
// native copy (native/keep.js), and every store reads its key when its module
// loads, so the game's modules are imported only after that. On the web
// keepSaves returns at once.
// On the web it first makes sure this is the newest build (native/fresh.js):
// a home-screen app can open a copy cached before the last push.
import { keepSaves } from "./native/keep.js";
import { freshen } from "./native/fresh.js";
import { settleSlots } from "./data/saveSlots.js";

// (if the game's own code can't be fetched, a page kept from before the
// last push asked for files that push replaced: index.html's rescue reloads)
freshen().then((reloading) => {
  // a preview build (VITE_PREVIEW_SEED=1) starts with a save part-way through the campaign (native/previewSeed.js)
  const seed = import.meta.env.VITE_PREVIEW_SEED ? import("./native/previewSeed.js").then((m) => m.seedPreview()) : Promise.resolve();
  // settleSlots finishes a switch of save files cut off by a reload (data/saveSlots.js)
  if (!reloading) keepSaves().finally(() => { settleSlots(); return seed.finally(() => import("./boot.jsx").catch((err) => { console.error(err); window.__cgBootFailed?.(); })); });
});
