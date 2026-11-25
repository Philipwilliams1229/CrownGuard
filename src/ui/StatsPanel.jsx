// ============ STATS (the title screen's STATS button) ============
// The all-time record and the commander's rank, on a framed box over a dimmed
// screen (owner, 2026-11-25: it was the War Council's third tab; the War Room
// is upgrades only now). The wipe that lived beside it comes along, still a
// confirm. A tap on the dark around the box closes it.
// Render it OUTSIDE any <Fit> (a fixed box inside a transform pins to it).

import { starsEarned, resetProfile, rankName, rankOf, rankProgress, MAX_STARS } from "../data/profile.js";
import { LEVELS } from "../data/campaign.js";
import { woodBtn, frame } from "./frames.js";
import { btn, panel } from "./theme.js";
import { useViewport } from "./fit.jsx";

const safePad = (t, r, b, l) =>
  `max(env(safe-area-inset-top), ${t}px) max(env(safe-area-inset-right), ${r}px) max(env(safe-area-inset-bottom), ${b}px) max(env(safe-area-inset-left), ${l}px)`;

const StatRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, padding: "3px 0", borderBottom: "1px solid #363c48" }}>
    <span style={{ opacity: 0.65 }}>{label}</span>
    <b style={{ color: "#e8e0c8" }}>{value}</b>
  </div>
);

export default function StatsPanel({ profile, setProfile, onClose }) {
  const vp = useViewport();
  const one = vp.w < 520;   // a narrow box: the two columns stack
  const s = profile.stats;
  const earned = starsEarned(profile);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(12,12,16,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: safePad(10, 12, 10, 12), boxSizing: "border-box" }}
      onClick={onClose}>
      <div style={{ ...panel, ...frame, width: "100%", maxWidth: 560, maxHeight: "100%", display: "flex", flexDirection: "column", padding: vp.short ? "10px 12px 12px" : 16, boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.75, flex: 1 }}>STATS · THE RECKONING</span>
          <button aria-label="Close" style={{ ...woodBtn, padding: "0 14px", fontSize: 13, flexShrink: 0 }} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", touchAction: "pan-y", scrollbarWidth: "thin" }}>
          {/* the commander's rank, by all-time XP */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10.5, marginBottom: 3, whiteSpace: "nowrap" }}>
              <span><span style={{ opacity: 0.55, letterSpacing: 1, fontSize: 9 }}>RANK {rankOf(profile.xp) + 1} · </span><b style={{ color: "#e8d47a" }}>{rankName(profile.xp)}</b></span>
              <span style={{ opacity: 0.6 }}>{profile.xp.toLocaleString()} XP</span>
            </div>
            <div style={{ height: 8, background: "#191d25", border: "2px solid #10131a" }}>
              <div style={{ height: "100%", width: `${Math.round(rankProgress(profile.xp) * 100)}%`, background: "#d8b34a" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: one ? "1fr" : "1fr 1fr", gap: "0 22px" }}>
            <div>
              <StatRow label="Levels cleared" value={s.levelsCleared} />
              <StatRow label="Levels lost" value={s.levelsLost} />
              <StatRow label="Flawless defences" value={s.perfect} />
              <StatRow label="Stars earned" value={`${earned} / ${LEVELS.length * MAX_STARS}`} />
            </div>
            <div>
              <StatRow label="Waves held" value={s.wavesCleared} />
              <StatRow label="Enemies slain" value={s.kills.toLocaleString()} />
              <StatRow label="Gold earned" value={s.goldEarned.toLocaleString()} />
              <StatRow label="Towers raised" value={s.towersBuilt} />
              <StatRow label="Foes that reached the gate" value={s.leaks} />
            </div>
          </div>
          <button style={{ ...btn, marginTop: 12, fontSize: 10, opacity: 0.7 }}
            onClick={() => { if (confirm("Wipe all-time stats, XP, stars and every skill bought? Campaign progress is kept.")) setProfile({ ...resetProfile() }); }}>
            Wipe record and skills
          </button>
        </div>
      </div>
    </div>
  );
}
