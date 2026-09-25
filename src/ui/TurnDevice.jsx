// ============ TURN YOUR DEVICE ============
// Crownguard is played sideways, on every screen: title, map, council and
// battle. A browser can't force the orientation, so when a touch screen is
// held upright this card covers whatever is showing until it's turned. (The
// installed app also declares landscape in its manifest, and where the
// browser allows it — Android, full screen — the first tap locks it.)

import { useEffect } from "react";
import { useViewport } from "./fit.jsx";
import "./hud/hud.css";

export default function TurnDevice() {
  const vp = useViewport();
  const upright = vp.touch && !vp.landscape;
  useEffect(() => {
    const lock = () => { try { screen.orientation?.lock?.("landscape")?.catch?.(() => {}); } catch { /* not allowed here */ } };
    window.addEventListener("pointerdown", lock, { once: true });
    return () => window.removeEventListener("pointerdown", lock);
  }, []);
  if (!upright) return null;
  return (
    <div className="cg-hud" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#17111b", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="cg-frame" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "22px 22px 20px", maxWidth: 320 }}>
        <div className="cg-display" style={{ fontSize: 46, lineHeight: 1, color: "var(--gold)", textShadow: "2px 2px 0 var(--ink)" }}>⟳</div>
        <div className="cg-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: "var(--gold)", textShadow: "2px 2px 0 var(--ink)" }}>TURN YOUR DEVICE</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Crownguard is played sideways. Turn to landscape and the war resumes.</div>
      </div>
    </div>
  );
}
