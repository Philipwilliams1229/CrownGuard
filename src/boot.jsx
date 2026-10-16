import { createRoot } from "react-dom/client";
import CrownguardGame from "./CrownguardGame.jsx";
import TurnDevice from "./ui/TurnDevice.jsx";
import { guardViewport } from "./ui/viewportGuard.js";

// Mount the game into the <div id="root"> in index.html (main.jsx imports
// this once the iOS app's save copy is back in place). The
// game is landscape-only: TurnDevice covers every screen while a touch
// screen is held upright. guardViewport keeps an iPad's taps on target.
guardViewport();
createRoot(document.getElementById("root")).render(<><CrownguardGame /><TurnDevice /></>);
