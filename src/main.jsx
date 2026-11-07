// Entry point. In the iOS app the save may first have to be put back from its
// native copy (native/keep.js), and every store reads its key when its module
// loads, so the game's modules are imported only after that. On the web
// keepSaves returns at once.
// On the web it first makes sure this is the newest build (native/fresh.js):
// a home-screen app can open a copy cached before the last push.
import { keepSaves } from "./native/keep.js";
import { freshen } from "./native/fresh.js";

freshen().then((reloading) => { if (!reloading) keepSaves().finally(() => import("./boot.jsx")); });
