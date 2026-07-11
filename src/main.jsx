import { createRoot } from "react-dom/client";
import CrownguardGame from "./CrownguardGame.jsx";

// Entry point: mount the game into the <div id="root"> in index.html.
createRoot(document.getElementById("root")).render(<CrownguardGame />);
