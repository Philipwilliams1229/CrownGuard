// ============ HERO TALENTS (War Council, HEROES tab) ============
// Where a hero's talent points are spent between battles. Heroes start every
// map at level 1 and level up in battle; each level gained banks one talent
// point for that hero, kept for good in the profile (data/profile.js,
// heroRecord). Five talents of five ranks each, costing TALENT_COSTS
// (data/bands.js). A reset is free and hands every point back.
//
// Also home to the War Council's two-tap confirm (`useArm` + `ArmBand`):
// the first tap arms a button — it turns gold and says what the next tap
// will spend — and the second tap on the same button does it. A tap anywhere
// else, or three seconds, disarms it. Works by touch; nothing needs hover.
//
// Layouts (chosen by the War Council, which passes `layout`):
//  - "wide": iPads and desktops. Both heroes side by side, sizes times `z`.
//  - "rail": a phone on its side. The two heroes are a rail down the left;
//    the chosen hero's talents read three across.
//  - "stack": a phone held upright. The two heroes are a toggle across the
//    top; the talents read two across.

import { useState, useEffect } from "react";
import {
  HEROES, HERO_TALENTS, TALENT_RANKS, talentCost, talentsSpent, heroStats,
} from "../data/bands.js";
import { heroRecord, buyHeroTalent, resetHeroTalents } from "../data/profile.js";
import EnemyIcon from "./EnemyIcon.jsx";
import { btn, panel, DISPLAY, GOLD, INK } from "./theme.js";

const HERO_KEYS = Object.keys(HEROES);
const ON = { background: "#5a4f2c", boxShadow: "inset 0 0 0 2px #7a6a3c" };
// numbers in the pixel face that keeps 5/8/S apart
export const NUM = { fontFamily: "'Press Start 2P', 'Silkscreen', Verdana, monospace", fontWeight: 400, fontSizeAdjust: 0.58 };
const LABEL = { fontFamily: DISPLAY, letterSpacing: 0.5 };

// ---- the two-tap confirm ----
export function useArm(ms = 3000) {
  const [armed, setArmed] = useState(null);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(null), ms);
    // a press anywhere but the armed button disarms it
    const off = (e) => { if (!e.target?.closest?.(`[data-arm="${armed}"]`)) setArmed(null); };
    document.addEventListener("pointerdown", off, true);
    return () => { clearTimeout(t); document.removeEventListener("pointerdown", off, true); };
  }, [armed, ms]);
  return {
    armed,
    is: (id) => armed === id,
    // first tap arms; a second tap on the same id acts
    tap: (id, act) => { if (armed === id) { setArmed(null); act(); } else setArmed(id); },
    clear: () => setArmed(null),
  };
}

// The gold armed look for a button, and the band laid over its foot that
// says what the second tap will do, with a bar draining over the 3 seconds.
export const ARMED = {
  background: "#6a5a26",
  boxShadow: `inset 0 0 0 2px ${GOLD.face}, inset 0 0 0 4px ${GOLD.dk}`,
  opacity: 1,
};
export function ArmBand({ children, z = 1 }) {
  return (
    <span style={{
      position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: "none",
      background: GOLD.face, color: INK, borderTop: `2px solid ${INK}`,
      padding: `${4 * z}px 4px ${5 * z}px`, textAlign: "center",
      ...LABEL, fontWeight: "bold", fontSize: 10 * z, lineHeight: 1.2,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexWrap: "wrap",
    }}>
      <style>{"@keyframes cgArmDrain{from{transform:scaleX(1)}to{transform:scaleX(0)}}"}</style>
      {children}
      <span style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: GOLD.dk,
        transformOrigin: "0 50%", animation: "cgArmDrain 3s linear forwards",
      }} />
    </span>
  );
}

// ---- one hero's sheet ----
const SHOW_LEVEL = 10;   // stats are shown for a hero at about the end of a normal map
const RED = "#e07a72";

function StatChip({ label, value, up, z }) {
  return (
    <div style={{ background: "#262b35", border: `2px solid ${INK}`, padding: `${4 * z}px 5px`, minWidth: 0, textAlign: "center" }}>
      <div style={{ ...LABEL, fontSize: 8.5 * z, opacity: 0.6, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ ...NUM, fontSize: 10 * z, marginTop: 3 * z, color: up ? "#a8d88c" : "#e8e0c8", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function TalentNode({ t, rank, cost, buyable, armed, onTap, z, armId }) {
  const maxed = cost == null;
  return (
    <button data-arm={armId} disabled={!buyable} onClick={onTap}
      style={{
        ...btn, position: "relative", overflow: "hidden", textAlign: "left", padding: 7 * z,
        display: "flex", flexDirection: "column", gap: 4 * z, width: "100%", height: "100%",
        boxSizing: "border-box", justifyContent: "flex-start", minHeight: 44,
        cursor: buyable ? "pointer" : "default",
        ...(maxed
          ? { background: "#3c4a32", boxShadow: "inset -2px -2px 0 #26301f, inset 2px 2px 0 #5a6e4a" }
          : rank > 0 ? { boxShadow: "inset 0 0 0 2px #7a6a3c" }
          : !buyable ? { opacity: 0.7 } : {}),
        ...(armed ? ARMED : {}),
      }}>
      <b style={{ ...LABEL, fontSize: 11 * z, color: maxed ? "#c8e0a8" : "#e8e0c8", whiteSpace: "nowrap" }}>{t.name}</b>
      {/* five rank pips, then the next rank's price — red when the bank can't meet it */}
      <span style={{ display: "flex", gap: 3, alignItems: "center", width: "100%" }}>
        {Array.from({ length: TALENT_RANKS }, (_, i) => (
          <span key={i} style={{
            width: 14 * z, height: 7 * z, border: "2px solid #10131a", boxSizing: "border-box", flexShrink: 0,
            background: i < rank ? GOLD.face : i === rank && buyable ? "#4a5162" : "#272c36",
          }} />
        ))}
        <span style={{ marginLeft: "auto", paddingLeft: 4, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 3 }}>
          {maxed ? (
            <span style={{ ...NUM, fontSize: 8.5 * z, color: "#a8d88c" }}>MAX</span>
          ) : (
            <>
              <span style={{ ...LABEL, fontSize: 8.5 * z, opacity: 0.6 }}>next</span>
              <span style={{ ...NUM, fontSize: 9 * z, color: buyable ? "#e8d47a" : RED }}>{cost}</span>
              <span style={{ ...LABEL, fontSize: 8.5 * z, color: buyable ? "#e8e0c8" : RED, opacity: buyable ? 0.7 : 1 }}>pts</span>
            </>
          )}
        </span>
      </span>
      <span style={{ fontSize: 10 * z, opacity: 0.8, lineHeight: 1.4 }}>{t.desc}</span>
      {armed && <ArmBand z={z}>TAP AGAIN · {cost} PTS</ArmBand>}
    </button>
  );
}

function HeroSheet({ hkey, profile, onBuy, onReset, arm, cols, z, portrait, note }) {
  const h = HEROES[hkey];
  const { points, talents, best } = heroRecord(profile, hkey);
  const st = heroStats(hkey, SHOW_LEVEL, talents);
  const base = heroStats(hkey, SHOW_LEVEL, null);
  const spent = talentsSpent(talents);
  const resetId = `reset:${hkey}`;
  const resetArmed = arm.is(resetId);

  return (
    <div style={{ ...panel, boxSizing: "border-box", width: "100%", display: "flex", flexDirection: "column", gap: 8 * z }}>
      {/* who: portrait, name, best level; and the bank of points, big */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 * z }}>
        {portrait && (
          <div style={{ width: 52 * z, height: 52 * z, display: "flex", alignItems: "center", justifyContent: "center", background: "#262b35", border: `2px solid ${INK}`, flexShrink: 0 }}>
            <EnemyIcon type={h.rig} box={Math.round(44 * z)} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <b style={{ ...LABEL, fontSize: 14 * z, color: GOLD.lt }}>{h.name}</b>
            <span style={{ ...LABEL, fontSize: 10 * z, opacity: 0.7 }}>{h.title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 5 * z, opacity: 0.7 }}>
            <span style={{ ...LABEL, fontSize: 9 * z }}>Best level:</span>
            <span style={{ ...NUM, fontSize: 8.5 * z }}>{best}</span>
          </div>
        </div>
        <div style={{
          flexShrink: 0, textAlign: "center", padding: `${5 * z}px ${10 * z}px`, border: `2px solid ${INK}`, minWidth: 64 * z,
          background: points ? "#5a4f2c" : "#262b35", boxShadow: points ? "inset 0 0 0 2px #7a6a3c" : "none",
        }}>
          <div style={{ ...NUM, fontSize: 17 * z, color: points ? GOLD.lt : "#8a8f9a" }}>{points}</div>
          <div style={{ ...LABEL, fontSize: 8.5 * z, opacity: 0.8, marginTop: 3 }}>{points === 1 ? "POINT" : "POINTS"}</div>
        </div>
      </div>

      {/* the numbers at level 10, green where talents have raised them */}
      <div>
        <div style={{ ...LABEL, fontSize: 8.5 * z, opacity: 0.55, marginBottom: 3 * z }}>AT LEVEL {SHOW_LEVEL}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 5 * z }}>
          <StatChip z={z} label="HEALTH" value={Math.round(st.hp)} up={st.hp > base.hp} />
          <StatChip z={z} label="DAMAGE" value={Math.round(st.dmg)} up={st.dmg > base.dmg + 0.01} />
          <StatChip z={z} label="HITS/S" value={(1000 / st.rate).toFixed(2)} up={st.rate < base.rate} />
          <StatChip z={z} label="RANGE" value={Math.round(st.range)} up={st.range > base.range} />
        </div>
      </div>

      {/* five talents and, in the sixth cell, the free reset */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridAutoRows: "1fr", gap: 6 * z }}>
        {HERO_TALENTS[hkey].map((t) => {
          const id = `tal:${hkey}:${t.id}`;
          const rank = Math.min(TALENT_RANKS, talents[t.id] || 0);
          const cost = talentCost(rank);
          const ok = cost != null && points >= cost;
          return (
            <TalentNode key={t.id} t={t} z={z} armId={id} rank={rank} cost={cost}
              buyable={ok} armed={arm.is(id)}
              onTap={() => ok && arm.tap(id, () => onBuy(hkey, t.id))} />
          );
        })}
        <button data-arm={resetId} disabled={!spent}
          onClick={() => spent && arm.tap(resetId, () => onReset(hkey))}
          style={{
            ...btn, position: "relative", overflow: "hidden", padding: 7 * z, minHeight: 44,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * z,
            textAlign: "center", cursor: spent ? "pointer" : "default", opacity: spent ? 1 : 0.45,
            ...(resetArmed ? ARMED : {}),
          }}>
          <b style={{ ...LABEL, fontSize: 11 * z }}>Reset talents</b>
          <span style={{ fontSize: 9.5 * z, opacity: 0.7, lineHeight: 1.35 }}>
            {spent ? <>Free · <span style={NUM}>{spent}</span> {spent === 1 ? "point" : "points"} back</> : "Nothing spent yet"}
          </span>
          {resetArmed && <ArmBand z={z}>TAP AGAIN · RESET</ArmBand>}
        </button>
      </div>
      {note}
    </div>
  );
}

// ---- the tab ----
export default function HeroTalents({ profile, setProfile, layout, z = 1, arm, fitted }) {
  const [pick, setPick] = useState(HERO_KEYS[0]);

  // both write to storage themselves and hand back the new profile
  const buy = (key, id) => { const p = buyHeroTalent(key, id); if (p) setProfile({ ...p }); };
  const reset = (key) => setProfile({ ...resetHeroTalents(key) });
  const deps = HERO_KEYS.map((k) => JSON.stringify(heroRecord(profile, k))).join("|");

  const line = "Every level a hero gains in battle banks a talent point. Spend them here or from the hero's panel in battle.";
  const sheet = (k, cols, portrait, note) => (
    <HeroSheet key={k} hkey={k} profile={profile} onBuy={buy} onReset={reset} arm={arm} cols={cols} z={z} portrait={portrait} note={note} />
  );
  const smallNote = <div style={{ fontSize: 9.5, opacity: 0.55, lineHeight: 1.4 }}>{line}</div>;

  if (layout === "wide") {
    return fitted(
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * z, maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontSize: 11 * z, opacity: 0.7, textAlign: "center" }}>{line}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 * z, alignItems: "start" }}>
          {HERO_KEYS.map((k) => sheet(k, 2, true, null))}
        </div>
      </div>,
      [layout, z, deps],
    );
  }

  // the hero picker for phones: a rail on the left, or a toggle across the top
  const rail = layout === "rail";
  const picker = (
    <div style={rail
      ? { display: "grid", gridTemplateRows: `repeat(${HERO_KEYS.length}, 1fr)`, gap: 6, width: 124, flexShrink: 0, minHeight: 0 }
      : { display: "grid", gridTemplateColumns: `repeat(${HERO_KEYS.length}, 1fr)`, gap: 6, flexShrink: 0 }}>
      {HERO_KEYS.map((k) => {
        const { points, talents } = heroRecord(profile, k);
        // gold when the bank can buy a rank of something
        const can = HERO_TALENTS[k].some((t) => { const c = talentCost(talents[t.id] || 0); return c != null && points >= c; });
        return (
          <button key={k} onClick={() => setPick(k)} aria-label={HEROES[k].name}
            style={{
              ...btn, position: "relative", display: "flex", flexDirection: rail ? "column" : "row", alignItems: "center",
              justifyContent: "center", gap: rail ? 4 : 8, padding: "4px 6px", minHeight: rail ? 0 : 52, textAlign: "center",
              ...(k === pick ? ON : {}),
            }}>
            <EnemyIcon type={HEROES[k].rig} box={rail ? 44 : 36} />
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <b style={{ ...LABEL, fontSize: 11, whiteSpace: "nowrap" }}>{HEROES[k].name}</b>
              <span style={{
                display: "flex", alignItems: "baseline", gap: 4, padding: "3px 5px", border: `2px solid ${INK}`,
                ...(can ? { background: GOLD.face, color: INK } : { background: "#262b35" }),
              }}>
                <span style={{ ...NUM, fontSize: 8.5 }}>{points}</span>
                <span style={{ ...LABEL, fontSize: 8.5, fontWeight: "bold" }}>PTS</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
  const body = fitted(sheet(pick, rail ? 3 : 2, false, smallNote), [layout, pick, deps]);
  return rail ? (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 8 }}>{picker}{body}</div>
  ) : (
    <>{picker}{body}</>
  );
}
