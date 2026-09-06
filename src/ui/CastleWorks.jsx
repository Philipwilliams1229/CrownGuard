// ============ CASTLE WORKS LIST ============
// The four works on the castle, their tiers, and a buy button for the next
// one. Shown inside the game's side panel and on the campaign map; the
// caller says what purse pays (the crown's treasury, or a free-play run's
// gold) and does the paying.

import { CASTLE_WORKS } from "../data/castle.js";
import { btn, disabled, overlayPanel } from "./theme.js";

const gold = (n) => n.toLocaleString("en-US");

export default function CastleWorksList({ works, purse, purseLabel, onBuy, note }) {
  const hud = { ...overlayPanel, borderWidth: 2, boxShadow: "inset 0 0 0 1px #454c5a" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ ...hud, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 2, opacity: 0.7, flex: 1 }}>{purseLabel}</span>
        <b style={{ color: "#e8d47a", fontSize: 14 }}>🪙 {gold(Math.floor(purse))}</b>
      </div>
      {note && <div style={{ fontSize: 10.5, opacity: 0.7, lineHeight: 1.4, padding: "0 2px" }}>{note}</div>}
      {Object.entries(CASTLE_WORKS).map(([key, def]) => {
        const have = works?.[key] || 0;
        const cur = have > 0 ? def.tiers[have - 1] : null;
        const next = def.tiers[have] || null;
        const can = !!next && purse >= next.cost;
        return (
          <div key={key} style={{ ...hud, padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{def.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: "bold" }}>{def.name}</div>
                <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                  {def.tiers.map((_, i) => <span key={i} style={{ width: 14, height: 5, background: i < have ? "#e8c14a" : "#3a3f4c", boxShadow: "inset 0 0 0 1px #10131a" }} />)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.72, lineHeight: 1.4, margin: "6px 0" }}>
              {cur ? <span><b style={{ color: "#a8d88c" }}>{cur.label}</b> stands on the wall.</span> : def.blurb}
            </div>
            {next ? (
              <button style={{ ...btn, width: "100%", boxSizing: "border-box", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", fontSize: 11, minHeight: 40, ...(!can ? disabled : {}) }}
                disabled={!can} onClick={() => onBuy(key, next)}>
                <span>{have ? "Raise: " : "Build: "}{next.label}</span><b style={{ color: can ? "#e8d47a" : "#e07a72" }}>{gold(next.cost)}g</b>
              </button>
            ) : <div style={{ fontSize: 10, letterSpacing: 1.5, opacity: 0.6, textAlign: "center", padding: 6 }}>COMPLETE</div>}
          </div>
        );
      })}
    </div>
  );
}
