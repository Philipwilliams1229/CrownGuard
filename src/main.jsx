import { createRoot } from "react-dom/client";
import CrownguardGame from "./CrownguardGame.jsx";
import TurnDevice from "./ui/TurnDevice.jsx";

// Entry point: mount the game into the <div id="root"> in index.html. The
// game is landscape-only: TurnDevice covers every screen while a touch
// screen is held upright.
createRoot(document.getElementById("root")).render(<><CrownguardGame /><TurnDevice /></>);
