// ============ CASTLE WORKS LIST ============
// The four works on the castle, their tiers, and a buy button for the next
// one. Shown inside the game's side panel and on the campaign map; the
// caller says what purse pays (the crown's treasury, or a free-play run's
// gold) and does the paying. Wears the battle HUD's skin (hud.css), and
// carries its own .cg-hud so the skin's colours come along to the map too.

import { CASTLE_WORKS, nextWork } from "../data/castle.js";
import "./hud/hud.css";
import { CoinIcon } from "./hud/icons.jsx";

const gold = (n) => n.toLocaleString("en-US");

export default function CastleWorksList({ works, ranks = null, endless = false, purse, purseLabel, onBuy, note }) {
  return (
    <div className="cg-hud" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="cg-well" style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="cg-label" style={{ fontSize: 11, flex: 1 }}>{purseLabel}</span>
        <CoinIcon size={16} />
        <b className="cg-num" style={{ color: "var(--gold-lt)", fontSize: 18 }}>{gold(Math.floor(purse))}</b>
      </div>
      {note && <div style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.45, padding: "0 2px" }}>{note}</div>}
      {/* one column in a narrow drawer, two side by side in a wide box (a
          phone on its side), so a short screen scrolls less */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(236px, 100%), 1fr))", gap: 8 }}>
      {Object.entries(CASTLE_WORKS).map(([key, def]) => {
        const have = works?.[key] || 0;
        const cur = have > 0 ? def.tiers[have - 1] : null;
        // past the last tier, the endless offers ranks (see data/castle.js)
        const next = nextWork(works, key, ranks, endless);
        const rank = ranks?.[key] || 0;
        const can = !!next && purse >= next.cost;
        return (
          <div key={key} className="cg-panel" style={{ padding: "9px 10px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span className="cg-well" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{def.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cg-display" style={{ fontSize: 12, fontWeight: 700, color: "var(--cream)", textShadow: "1px 1px 0 var(--ink)" }}>{def.name}</div>
                <div className="cg-pips" style={{ marginTop: 4 }}>
                  {def.tiers.map((_, i) => <span key={i} className={`cg-pip big${i < have ? " on" : ""}`} />)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.45, margin: "7px 0 8px" }}>
              {cur ? <span><b style={{ color: "var(--green)" }}>{cur.label}</b> stands on the wall{rank ? <>, <b style={{ color: "var(--gold-lt)" }}>veteran rank {rank}</b></> : null}.</span> : def.blurb}
            </div>
            {next ? (
              <button className={`cg-btn${can ? "" : " is-poor"}`} style={{ width: "100%", justifyContent: "space-between", fontSize: 11 }}
                disabled={!can} onClick={() => onBuy(key, next)}>
                <span className="cg-dim">{next.rank ? "" : have ? "Raise: " : "Build: "}{next.label}</span>
                <span className={`cg-price${can ? "" : " is-short"}`}><CoinIcon size={13} />{gold(next.cost)}</span>
              </button>
            ) : <div className="cg-label" style={{ textAlign: "center", padding: 6, color: "var(--green)" }}>Complete</div>}
          </div>
        );
      })}
      </div>
    </div>
  );
}
