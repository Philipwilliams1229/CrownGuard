// ============ EnemyTooltip ============
// A small info popup shown when hovering/tapping an enemy in the next-wave
// preview. Lists the enemy's core stats and a short strengths/weaknesses note.
// Positioned by its parent (which should be position: relative).

import { ENEMIES } from "../data/enemies.js";
import EnemyIcon from "./EnemyIcon.jsx";

const box = {
  position: "absolute",
  bottom: "calc(100% + 8px)",
  left: 0,
  width: 210,
  zIndex: 60,
  background: "#2e2633",
  border: "2px solid #241a26",
  boxShadow: "inset 2px 2px 0 #4a3e50, inset -2px -2px 0 #1b141e, 0 3px 0 rgba(20,12,22,0.45)",
  padding: 10,
  pointerEvents: "none",
  textAlign: "left",
  fontSize: 11,
  lineHeight: 1.5,
  color: "#f2e6c4",
  fontFamily: "Verdana, Geneva, sans-serif",
};

const Row = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
    <span style={{ color: "#b9ab93" }}>{label}</span>
    <span style={{ fontWeight: "bold" }}>{children}</span>
  </div>
);

export default function EnemyTooltip({ type }) {
  const e = ENEMIES[type];
  if (!e) return null;

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: e.boss ? "#4a1e22" : "#231b27", border: "2px solid #241a26", boxShadow: "inset 2px 2px 0 #1b141e", boxSizing: "border-box" }}>
          <EnemyIcon type={type} box={28} />
        </span>
        <div style={{ fontFamily: "'Silkscreen', Verdana, sans-serif", fontWeight: 700, fontSize: 13, lineHeight: 1.1, color: e.boss ? "#ff8a78" : "#f0d27a", textShadow: "1px 1px 0 #241a26", letterSpacing: 0.5 }}>
          {e.name}{e.boss ? " · BOSS" : ""}
        </div>
      </div>

      <Row label="Health">{e.hp}</Row>
      <Row label="Speed">{e.speed}</Row>
      <Row label="Armor">{e.armor > 0 ? `${Math.round(e.armor * 100)}% physical` : "none"}</Row>
      {e.mres ? <Row label="Magic resist">{Math.round(e.mres * 100)}%</Row> : null}
      {e.flying ? <Row label="Flying">can't be blocked</Row> : null}
      {e.regen ? <Row label="Regen">{e.regen}/s</Row> : null}
      {e.atk > 0 ? <Row label="Vs. knights">{e.atk} dmg</Row> : null}
      <Row label="Castle dmg">{e.castleDmg}</Row>
      <Row label="Bounty">{e.bounty}g</Row>

      {e.note && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "2px solid #241a26", color: "#d8ccb0", fontStyle: "italic" }}>
          {e.note}
        </div>
      )}
    </div>
  );
}
