import { Component } from "react";
import { createRoot } from "react-dom/client";
import CrownguardGame from "./CrownguardGame.jsx";
import TurnDevice from "./ui/TurnDevice.jsx";
import { guardViewport } from "./ui/viewportGuard.js";
import { startCrashLog, noteCrash } from "./native/crashlog.js";

// Mount the game into the <div id="root"> in index.html (main.jsx imports
// this once the iOS app's save copy is back in place). The
// game is landscape-only: TurnDevice covers every screen while a touch
// screen is held upright. guardViewport keeps an iPad's taps on target.
// The crash recorder starts first (native/crashlog.js), and a screen that fails to
// draw shows a Reload button instead of a blank page (the error is logged).
startCrashLog();
guardViewport();

class Shield extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { noteCrash("screen", err, { comp: String(info?.componentStack || "").split("\n").slice(0, 4).join("\n") }); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ position: "fixed", inset: 0, background: "#20242c", color: "#e8dcc0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 18 }}>Crownguard hit a snag.</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Your progress is saved. The error was noted (Settings, Progress).</div>
        <button onClick={() => location.reload()} style={{ fontSize: 16, padding: "10px 22px", background: "#c89a3a", color: "#20242c", border: 0, borderRadius: 6 }}>Reload Crownguard</button>
      </div>
    );
  }
}

createRoot(document.getElementById("root")).render(<><Shield><CrownguardGame /></Shield><TurnDevice /></>);
