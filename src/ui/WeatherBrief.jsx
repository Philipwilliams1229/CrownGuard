// ============ THE WEATHER BRIEF ============
// A section of a level's card on the campaign map: the weather this road will
// bring, before the horn. The kind's pixel icon, its name and how fierce it is
// (the chapter's plan, data/weather-plan.js), when it first comes, and an (i)
// that unfolds what it does and how to meet it (data/weather-info.js). A level
// with no weather says so with the sun. Inside the card (parchment), so the
// icon sits on the same dark tile the battle's forecast chip uses.

import { useState, useRef, useEffect } from "react";
import { WeatherIcon } from "./WeatherForecast.jsx";
import { briefOf } from "../data/weather-info.js";
import { PARCH, woodBtn } from "./frames.js";

export default function WeatherBrief({ spec, compact = false }) {
  const [open, setOpen] = useState(false);
  const more = useRef(null);
  // the card scrolls: bring the unfolded details into view
  useEffect(() => { if (open && more.current) more.current.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [open]);
  const b = briefOf(spec);
  const tile = (kind) => (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: compact ? 30 : 36, height: compact ? 30 : 36, flexShrink: 0, background: "rgba(20,26,36,0.85)", border: "2px solid #10131a" }}>
      <WeatherIcon kind={kind} size={compact ? 20 : 24} />
    </span>
  );
  const label = <div style={{ fontSize: compact ? 8 : 8.5, letterSpacing: 2, color: PARCH.red, fontWeight: "bold", marginBottom: 4 }}>WEATHER</div>;
  const box = { background: "rgba(59,42,28,0.12)", border: `1px solid ${PARCH.dk}`, padding: compact ? "4px 7px" : "6px 8px" };
  if (!b) {
    return (
      <div style={box}>
        {label}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tile("clear")}
          <div style={{ fontSize: compact ? 11 : 12, lineHeight: 1.3 }}><b>Clear skies</b><div style={{ fontSize: 10, opacity: 0.8 }}>No weather on this road.</div></div>
        </div>
      </div>
    );
  }
  return (
    <div style={box}>
      {label}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {tile(b.kind)}
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <b style={{ fontSize: compact ? 12 : 13 }}>{b.name}</b>
            <span aria-label={`${b.word} strength`} title={`${b.word} strength`} style={{ display: "inline-flex", gap: 2 }}>
              {[1, 2, 3].map((i) => <span key={i} style={{ width: 7, height: 7, background: i <= b.pips ? PARCH.red : "rgba(59,42,28,0.25)", border: "1px solid #3b2a1c" }} />)}
            </span>
            <span style={{ fontSize: 9, letterSpacing: 1, color: PARCH.red, fontWeight: "bold" }}>{b.word.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: 10, opacity: 0.85 }}>{b.opens}</div>
        </div>
        <button aria-expanded={open} aria-label={open ? "Hide weather details" : "About this weather"} onClick={() => setOpen(!open)}
          style={{ ...woodBtn, width: 30, height: 30, minHeight: 30, minWidth: 30, padding: 0, flexShrink: 0, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: "bold", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {open ? "×" : "i"}
        </button>
      </div>
      {open && (
        <div ref={more} style={{ marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${PARCH.dk}`, fontSize: compact ? 10.5 : 11.5, lineHeight: 1.45, color: "#4a3826", display: "flex", flexDirection: "column", gap: 5 }}>
          <div>{b.blurb}</div>
          <div style={{ fontSize: 8.5, letterSpacing: 2, color: PARCH.red, fontWeight: "bold" }}>WHAT IT DOES</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {b.effects.map((t, i) => <li key={i}>{t}</li>)}
            <li>{b.rhythm}.</li>
          </ul>
          {b.tip && <div><b>How to meet it: </b>{b.tip}</div>}
          <div style={{ fontSize: 9.5, opacity: 0.75 }}>Weather grows stronger the further into a chapter you travel. In battle, the wave preview forecasts when it will arrive.</div>
        </div>
      )}
    </div>
  );
}
