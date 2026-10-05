import { createRoot } from "react-dom/client";
import CrownguardGame from "./CrownguardGame.jsx";
import TurnDevice from "./ui/TurnDevice.jsx";
import { guardViewport } from "./ui/viewportGuard.js";

// Entry point: mount the game into the <div id="root"> in index.html. The
// game is landscape-only: TurnDevice covers every screen while a touch
// screen is held upright. guardViewport keeps an iPad's taps on target.
guardViewport();
createRoot(document.getElementById("root")).render(<><CrownguardGame /><TurnDevice /></>);
