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
  background: "#20242c",
  border: "3px solid #10131a",
  boxShadow: "inset 0 0 0 2px #454c5a, 0 4px 0 rgba(0,0,0,0.35)",
  padding: 10,
  pointerEvents: "none",
  textAlign: "left",
  fontSize: 11,
  lineHeight: 1.5,
  color: "#e8e0c8",
};

const Row = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
    <span style={{ opacity: 0.6 }}>{label}</span>
    <span style={{ fontWeight: "bold" }}>{children}</span>
  </div>
);

export default function EnemyTooltip({ type }) {
  const e = ENEMIES[type];
  if (!e) return null;

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <EnemyIcon type={type} box={30} />
        <div style={{ fontWeight: "bold", color: e.boss ? "#e07a72" : "#e8d47a", letterSpacing: 1 }}>
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
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "2px solid #10131a", opacity: 0.9, fontStyle: "italic" }}>
          {e.note}
        </div>
      )}
    </div>
  );
}
