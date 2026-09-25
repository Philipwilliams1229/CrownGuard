// ============ HOME SCREEN ============
// The title screen the game opens on: dawn over the Greenwood and the crown's
// castle on its hill (see titleArt.js), the wordmark over the sky, and the
// menu on an oak-framed board. On a landscape screen the menu stands to the
// left of the castle; on a phone it sits in the middle. Big taps throughout.

import { useState, useRef, useEffect } from "react";
import { FONT } from "./theme.js";
import { WOOD, woodBtn, goldBtn, frame } from "./frames.js";
import PixelIcon from "./PixelIcon.jsx";
import Studs from "./Studs.jsx";
import FieldGuide from "./FieldGuide.jsx";
import { LEVELS, hasProgress, currentLevel } from "../data/campaign.js";
import { starsFree, rankName } from "../data/profile.js";
import { Star } from "./Glyphs.jsx";
import { titleVistaAsync, VW, VH } from "./titleArt.js";
import { warmMapTerrain } from "./mapArt.js";

const CREW = ["knight", "archer", "wizard", "catapult", "spiker", "support"];
const INK = "#10131a";

// The crown over the wordmark, on the pixel grid, ringed in ink.
const CROWN = [[2, 4, 12, 6], [1, 2, 2, 2], [13, 2, 2, 2], [7, 0, 2, 4], [4, 3, 2, 2], [10, 3, 2, 2]];
function Crown({ size = 44 }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="-1 -1 18 13" style={{ shapeRendering: "crispEdges", display: "block" }} aria-hidden="true">
      {[[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]].map(([dx, dy]) => CROWN.map(([x, y, w, h], i) => (
        <rect key={`${dx}${dy}${i}`} x={x + dx} y={y + dy} width={w} height={h} fill={INK} />
      )))}
      {CROWN.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill="#e8c65a" />)}
      <rect x="2" y="9" width="12" height="1" fill="#a8842a" />
      <rect x="2" y="4" width="1" height="5" fill="#fff3d2" /><rect x="7" y="0" width="1" height="1" fill="#fff3d2" />
      <rect x="1" y="2" width="1" height="1" fill="#fff3d2" />
      <rect x="4" y="6" width="2" height="2" fill="#c04a52" /><rect x="7" y="6" width="2" height="2" fill="#5a8ad0" /><rect x="10" y="6" width="2" height="2" fill="#c04a52" />
    </svg>
  );
}

function useMedia(q) {
  const [on, setOn] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q), f = () => setOn(m.matches);
    m.addEventListener?.("change", f);
    return () => m.removeEventListener?.("change", f);
  }, [q]);
  return on;
}

export default function HomeScreen({ progress, profile, onNewCampaign, onContinue, onFreePlay, onCouncil }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const saved = hasProgress(progress);
  const upTo = currentLevel(progress);
  const cleared = LEVELS.filter((l) => progress.cleared[l.id]).length;
  const free = starsFree(profile);
  const wide = useMedia("(min-width: 820px) and (min-aspect-ratio: 5/4)");

  // Paint the vista a frame after the menu shows; then, while the player
  // reads the menu, quietly lay out the campaign map so it opens at once.
  const vistaRef = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let warm = null;
    const stop = titleVistaAsync((v) => {
      const c = vistaRef.current;
      if (!c) return;
      c.getContext("2d").drawImage(v, 0, 0);
      setShown(true);
      warm = setTimeout(warmMapTerrain, 600);
    });
    return () => { stop(); clearTimeout(warm); };
  }, []);

  // Primary action: gold and unmissable. The rest: oak.
  const bigBtn = (gold) => ({
    ...(gold ? goldBtn : woodBtn), width: "100%", textAlign: "center", padding: "14px 12px", minHeight: 52,
    fontSize: 14, letterSpacing: 2, fontWeight: "bold",
  });
  const sub = { fontSize: 9, letterSpacing: 1, opacity: 0.85, marginTop: 4, fontWeight: "normal" };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "#1c2450", color: "#e8e0c8", fontFamily: FONT }}>
      <canvas ref={vistaRef} width={VW} height={VH} aria-hidden="true" style={{
        position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover",
        objectPosition: wide ? "70% 60%" : "72% 60%", imageRendering: "pixelated",
        opacity: shown ? 1 : 0, transition: "opacity 0.6s",
      }} />
      {/* a shade behind the menu so the words stand off the picture */}
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: wide
          ? "linear-gradient(90deg, rgba(16,19,34,0.55) 0%, rgba(16,19,34,0.25) 42%, rgba(16,19,34,0) 60%)"
          : "linear-gradient(180deg, rgba(16,19,34,0.35) 0%, rgba(16,19,34,0.1) 40%, rgba(16,19,34,0.45) 100%)",
      }} />

      <div style={{
        position: "relative", minHeight: "100dvh", boxSizing: "border-box",
        display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: wide ? "flex-start" : "center",
        padding: wide ? "24px 0 24px clamp(24px, 7vw, 120px)" : "28px 18px",
      }}>
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Crown size={46} />
            <h1 style={{
              margin: "6px 0 0", fontFamily: FONT, fontWeight: "bold", color: "#f2cf4a",
              fontSize: "clamp(26px, 8vw, 50px)", letterSpacing: "clamp(2px, 0.8vw, 6px)",
              textShadow: `0 3px 0 #9a7424, 0 5px 0 ${INK}, 3px 5px 0 ${INK}, -2px 0 0 ${INK}, 2px 0 0 ${INK}, 0 -2px 0 ${INK}`,
            }}>
              CROWNGUARD
            </h1>
            <div style={{ fontSize: 12, marginTop: 10, letterSpacing: 1.5, color: "#f6ead0", textShadow: `1px 1px 0 ${INK}, 0 0 6px rgba(16,19,34,0.9)` }}>
              Hold the road. The castle must not fall.
            </div>
          </div>

          {/* the defenders, as a row of their own sprites */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "5px 12px", background: "rgba(16,19,34,0.55)", border: `2px solid ${INK}`, boxShadow: `inset 0 0 0 1px ${WOOD.lt}` }}>
            {CREW.map((k) => <PixelIcon key={k} kind={k} size={32} />)}
          </div>

          {/* the menu board */}
          <div style={{ ...frame, background: "rgba(46,32,22,0.92)", padding: 16, width: "100%", maxWidth: 380, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
            <Studs />
            {saved ? (
              <>
                <button style={bigBtn(true)} onClick={onContinue}>
                  CONTINUE CAMPAIGN
                  <div style={sub}>{cleared}/{LEVELS.length} held · next: {upTo.name}</div>
                </button>
                <button style={bigBtn(false)} onClick={onNewCampaign}>NEW CAMPAIGN</button>
              </>
            ) : (
              <button style={bigBtn(true)} onClick={onNewCampaign}>NEW CAMPAIGN</button>
            )}
            <button style={bigBtn(false)} onClick={onCouncil}>
              WAR COUNCIL
              {free > 0 && (
                <div style={{ ...sub, color: "#f2cf4a", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Star size={11} /> {free} star{free > 1 ? "s" : ""} to spend
                </div>
              )}
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...bigBtn(false), fontSize: 12.5, letterSpacing: 1.5 }} onClick={onFreePlay}>FREE PLAY</button>
              <button style={{ ...bigBtn(false), fontSize: 12.5, letterSpacing: 1.5 }} onClick={() => setGuideOpen(true)}>FIELD GUIDE</button>
            </div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textAlign: "center", color: "#d8c8a0", marginTop: 2 }}>
              {rankName(profile.xp)} · {profile.xp.toLocaleString()} XP
            </div>
          </div>

          <div style={{ fontSize: 10, textAlign: "center", maxWidth: 340, lineHeight: 1.6, color: "#e8e0c8", textShadow: `1px 1px 0 ${INK}, 0 0 5px rgba(16,19,34,0.95)` }}>
            March the campaign from the Greenwood, through the Iron
            Marches, and down into the drowned Hollowfen — or pick any
            realm and army in Free Play and hold out against the Endless March.
          </div>
        </div>
      </div>

      {guideOpen && <FieldGuide onClose={() => setGuideOpen(false)} />}
    </div>
  );
}
