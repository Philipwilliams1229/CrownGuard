// ============ SAVE FILES BOX ============
// The title screen's SAVE FILES (owner, 2026-11-24): three save files, each a
// whole game of its own (levels, stars, xp, heroes, castle works, a battle
// left unfinished). Sound and display settings belong to the device and stay
// the same in every file. Play another file, or start a new game in an empty
// one, and the page reloads into it; Erase takes two taps. The storage is
// data/saveSlots.js. Render it OUTSIDE any <Fit> (a fixed box inside a
// transform pins to it).

import { useState } from "react";
import { woodBtn, goldBtn, frame } from "./frames.js";
import { panel } from "./theme.js";
import { useArm, ARMED } from "./HeroTalents.jsx";
import { Star } from "./Glyphs.jsx";
import { LEVELS } from "../data/campaign.js";
import { fileSummaries, switchFile, eraseFile } from "../data/saveSlots.js";

const safePad = (t, r, b, l) =>
  `max(env(safe-area-inset-top), ${t}px) max(env(safe-area-inset-right), ${r}px) max(env(safe-area-inset-bottom), ${b}px) max(env(safe-area-inset-left), ${l}px)`;

const when = (ms) => {
  const d = new Date(ms);
  return isNaN(d) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function SaveFilesModal({ short, resume, onClose }) {
  const [files, setFiles] = useState(() => fileSummaries(LEVELS));
  const arm = useArm();
  const btn = (base) => ({ ...base, textAlign: "center", minHeight: 44, padding: "0 12px", fontSize: 12, letterSpacing: 1.5, fontWeight: "bold", flex: 1 });
  const line = { fontSize: 10, letterSpacing: 0.5, opacity: 0.85, marginTop: 3, lineHeight: 1.4 };

  const erase = (f) => arm.tap(`erase${f.n}`, () => {
    eraseFile(f.n);                                  // the file in use reloads as a new game
    setFiles(fileSummaries(LEVELS));
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(12,12,16,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: safePad(10, 12, 10, 12), boxSizing: "border-box" }}
      onClick={onClose}>
      <div style={{ ...panel, ...frame, width: "100%", maxWidth: short ? 620 : 400, maxHeight: "100%", display: "flex", flexDirection: "column", padding: short ? "10px 12px 12px" : 16, boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.75, flex: 1 }}>SAVE FILES</span>
          <button aria-label="Close" style={{ ...woodBtn, padding: "0 14px", fontSize: 13, flexShrink: 0 }} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", touchAction: "pan-y", scrollbarWidth: "thin",
          display: short ? "grid" : "flex", gridTemplateColumns: short ? "1fr 1fr 1fr" : undefined, flexDirection: "column", gap: 10 }}>
          {files.map((f) => {
            const armed = arm.is(`erase${f.n}`);
            return (
              <div key={f.n} style={{ background: f.active ? "rgba(242,207,74,0.12)" : "rgba(0,0,0,0.25)", border: `2px solid ${f.active ? "#f2cf4a" : "#10131a"}`, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, letterSpacing: 2, fontWeight: "bold", color: "#f2cf4a", flex: 1 }}>FILE {f.n}</span>
                    {f.active && <span style={{ fontSize: 9, letterSpacing: 1.5, color: "#10131a", background: "#f2cf4a", padding: "2px 6px" }}>IN USE</span>}
                  </div>
                  {f.empty ? (
                    <div style={line}>Empty: a new campaign from the first level.</div>
                  ) : (
                    <>
                      <div style={line}>
                        {f.cleared}/{LEVELS.length} held{f.active && resume ? ` · ${resume.name}, wave ${resume.wave} next` : f.next ? ` · next: ${f.next}` : " · every level won"}
                      </div>
                      <div style={{ ...line, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <Star size={10} /> <span>{f.stars} · {f.xp.toLocaleString("en-US")} XP</span>
                      </div>
                      {f.at && <div style={line}>Last played {when(f.at)}</div>}
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  {f.active ? (
                    <button style={btn(goldBtn)} onClick={onClose}>PLAY</button>
                  ) : (
                    <button style={btn(goldBtn)} onClick={() => switchFile(f.n)}>{f.empty ? "NEW GAME" : "PLAY"}</button>
                  )}
                  {!f.empty && (
                    <button data-arm={`erase${f.n}`} style={{ ...btn(woodBtn), ...(armed ? ARMED : null) }} onClick={() => erase(f)}>
                      {armed ? "TAP AGAIN" : "ERASE"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, lineHeight: 1.4, opacity: 0.7, marginTop: 10, flexShrink: 0 }}>
          Each file is a whole game of its own. Sound and display settings are shared by all three. Erasing a file takes two taps and can't be undone.
        </div>
      </div>
    </div>
  );
}
