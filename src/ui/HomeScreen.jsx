// ============ HOME SCREEN ============
// The title screen the game opens on. Big taps, one column, sized to fit a
// phone first and simply grow on a desktop.

import { useState } from "react";
import { btn, title, FONT } from "./theme.js";
import PixelIcon from "./PixelIcon.jsx";
import FieldGuide from "./FieldGuide.jsx";
import { LEVELS, hasProgress, currentLevel } from "../data/campaign.js";
import { starsFree, rankName } from "../data/profile.js";
import { Star } from "./Glyphs.jsx";

const CREW = ["knight", "archer", "wizard", "catapult", "spiker", "support"];

export default function HomeScreen({ progress, profile, onNewCampaign, onContinue, onFreePlay, onCouncil }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const saved = hasProgress(progress);
  const upTo = currentLevel(progress);
  const cleared = LEVELS.filter((l) => progress.cleared[l.id]).length;
  const free = starsFree(profile);

  // Primary action: gold and unmissable. Secondary: the standard slate.
  const bigBtn = (gold) => ({
    ...btn, width: "100%", textAlign: "center", padding: "16px 12px",
    fontSize: 14, letterSpacing: 2,
    ...(gold ? { background: "#5a4f2c", boxShadow: "inset -2px -2px 0 #3a3420, inset 2px 2px 0 #8a7746", color: "#f0e4b0" } : {}),
  });

  return (
    <div style={{
      minHeight: "100dvh", background: "#20242c", color: "#e8e0c8", fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "32px 18px", boxSizing: "border-box", gap: 22,
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ ...title(40), fontSize: "clamp(22px, 7.4vw, 52px)", letterSpacing: "clamp(2px, 1vw, 10px)" }}>
          CROWNGUARD
        </h1>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10, letterSpacing: 1 }}>
          Hold the road. The castle must not fall.
        </div>
      </div>

      {/* the defenders, as a row of their own sprites */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {CREW.map((k) => <PixelIcon key={k} kind={k} size={34} />)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340 }}>
        {saved ? (
          <>
            <button style={bigBtn(true)} onClick={onContinue}>
              CONTINUE CAMPAIGN
              <div style={{ fontSize: 9, letterSpacing: 1, opacity: 0.8, marginTop: 5, fontWeight: "normal" }}>
                {cleared}/{LEVELS.length} cleared · next: {upTo.name}
              </div>
            </button>
            <button style={bigBtn(false)} onClick={onNewCampaign}>NEW CAMPAIGN</button>
          </>
        ) : (
          <button style={bigBtn(true)} onClick={onNewCampaign}>NEW CAMPAIGN</button>
        )}
        <button style={bigBtn(false)} onClick={onCouncil}>
          WAR COUNCIL
          {free > 0 && (
            <div style={{ fontSize: 9, letterSpacing: 1, marginTop: 5, fontWeight: "normal", color: "#e8d47a", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Star size={11} /> {free} star{free > 1 ? "s" : ""} to spend
            </div>
          )}
        </button>
        <button style={bigBtn(false)} onClick={onFreePlay}>FREE PLAY</button>
        <button style={bigBtn(false)} onClick={() => setGuideOpen(true)}>FIELD GUIDE</button>
      </div>

      <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>
        {rankName(profile.xp)} · {profile.xp.toLocaleString()} XP
      </div>

      <div style={{ fontSize: 10, opacity: 0.45, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
        March the campaign from the Greenwood to the Iron throne — or pick any
        realm and army in Free Play and hold out against the Endless March.
      </div>

      {guideOpen && <FieldGuide onClose={() => setGuideOpen(false)} />}
    </div>
  );
}
