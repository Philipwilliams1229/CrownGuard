// ============ SETTINGS ============
// The title screen's SETTINGS window: a row of tabs over one panel, and Done.
// A new tab is one more entry in TABS (an id, a name and what it shows).
// It sits outside any <Fit> (a fixed modal inside a transform would pin to it).
import { useState } from "react";
import SoundPanel from "./SoundPanel.jsx";
import "./hud/hud.css";
import "./hud/sandbox.css";

const cls = (...a) => a.filter(Boolean).join(" ");

const TABS = [
  { id: "sound", name: "Sound", Body: SoundPanel },
];

export default function SettingsPanel({ onClose }) {
  const [tab, setTab] = useState(TABS[0].id);
  const { Body } = TABS.find((t) => t.id === tab);
  return (
    <div onClick={onClose} className="cg-hud" style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(22,14,26,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} className="cg-frame cg-pop" style={{ width: 360, maxWidth: "100%", maxHeight: "100%", overflow: "auto", padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="cg-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: "var(--gold)", textAlign: "center", textShadow: "2px 2px 0 var(--ink)" }}>SETTINGS</div>
        <div className="sbs-tabs" role="tablist">
          {TABS.map((t) => (
            <button type="button" key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={cls("cg-btn cg-btn--slate sbs-tab", tab === t.id && "is-on")} style={{ minHeight: 44 }}>
              {t.name}
            </button>
          ))}
        </div>
        <div className="cg-panel" role="tabpanel" style={{ padding: 12 }}>
          <Body />
        </div>
        <button className="cg-btn cg-btn--gold" style={{ minHeight: 44 }} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
