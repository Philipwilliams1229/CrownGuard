// Entry point. In the iOS app the save may first have to be put back from its
// native copy (native/keep.js), and every store reads its key when its module
// loads, so the game's modules are imported only after that. On the web
// keepSaves returns at once.
import { keepSaves } from "./native/keep.js";

keepSaves().finally(() => import("./boot.jsx"));
