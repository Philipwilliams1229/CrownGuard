// ============ HOME SCREEN ============
// The title screen the game opens on: dawn over the Greenwood and the crown's
// castle on its hill (see titleArt.js), the wordmark over the sky, and the
// menu on an oak-framed board. Three layouts, one per kind of screen:
//  - wide (iPad on its side, desktop): the column stands left of the castle;
//  - compact (a phone on its side, under 500px tall): the title block and the
//    menu board sit side by side, so both show near full size;
//  - column (a phone held upright): one centred column.
// The screen never scrolls: the root is exactly the viewport, and <Fit>
// shrinks whatever is left over instead. Big taps throughout.

import { useState, useRef, useEffect } from "react";
import { Fit, useViewport } from "./fit.jsx";
import { FONT } from "./theme.js";
import { WOOD, woodBtn, goldBtn, frame } from "./frames.js";
import EnemyIcon from "./EnemyIcon.jsx";
import { rigDef } from "../render/rigs.js";
import Studs from "./Studs.jsx";
import FieldGuide from "./FieldGuide.jsx";
import { LEVELS, hasProgress, currentLevel } from "../data/campaign.js";
import { starsFree, rankName } from "../data/profile.js";
import { Star } from "./Glyphs.jsx";
import { titleVistaAsync, VW, VH } from "./titleArt.js";
import { warmMapTerrain } from "./mapArt.js";

// The defenders, in the same rigged figures that march on the board
// (render/rigs-crown.js): militia, ranger, man-at-arms, the hero, paladin,
// berserker. Drawn at one shared scale so they stand in proportion.
const CREW = ["farmer", "heroHunter", "knight", "heroKnight", "paladin", "berserk"];
const crewBox = (type, k) => { const b = rigDef(type).box; return Math.round(Math.max(b.hw * 2, b.up + b.down) * k); };
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

export default function HomeScreen({ progress, profile, onNewCampaign, onContinue, onFreePlay, onCouncil }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const saved = hasProgress(progress);
  const upTo = currentLevel(progress);
  const cleared = LEVELS.filter((l) => progress.cleared[l.id]).length;
  const free = starsFree(profile);
  const vp = useViewport();
  const compact = vp.short && vp.landscape;                      // phone on its side
  const wide = !compact && vp.w >= 820 && vp.w / vp.h >= 1.25;   // iPad on its side, desktop
  // the blurb is the first thing to go when height is short
  const blurb = !compact && vp.h >= (wide ? 600 : 640);

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

  // Primary action: gold and unmissable. The rest: oak. Compact trims the
  // padding, never the 44px tap height.
  const bigBtn = (gold) => ({
    ...(gold ? goldBtn : woodBtn), width: "100%", textAlign: "center",
    padding: compact ? "8px 10px" : "14px 12px", minHeight: compact ? 44 : 52,
    fontSize: compact ? 13 : 14, letterSpacing: compact ? 1.5 : 2, fontWeight: "bold",
  });
  const smallBtn = { ...bigBtn(false), fontSize: compact ? 12 : 12.5, letterSpacing: 1.5 };
  const span = compact ? { gridColumn: "1 / -1" } : null;
  const sub = { fontSize: 9, letterSpacing: 1, opacity: 0.85, marginTop: compact ? 2 : 4, fontWeight: "normal" };

  const title = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: compact ? 10 : 16 }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* compact: the crown stands beside the wordmark, to save a line of height */}
        <div style={{ display: "flex", flexDirection: compact ? "row" : "column", alignItems: "center", gap: compact ? 12 : 0 }}>
          <Crown size={compact ? 40 : 46} />
          <h1 style={{
            margin: compact ? 0 : "6px 0 0", fontFamily: FONT, fontWeight: "bold", color: "#f2cf4a", whiteSpace: "nowrap",
            fontSize: compact ? 36 : "clamp(26px, 8vw, 50px)", letterSpacing: compact ? 3 : "clamp(2px, 0.8vw, 6px)",
            textShadow: `0 3px 0 #9a7424, 0 5px 0 ${INK}, 3px 5px 0 ${INK}, -2px 0 0 ${INK}, 2px 0 0 ${INK}, 0 -2px 0 ${INK}`,
          }}>
            CROWNGUARD
          </h1>
        </div>
        <div style={{ fontSize: compact ? 11 : 12, marginTop: compact ? 8 : 10, letterSpacing: compact ? 1 : 1.5, color: "#f6ead0", textShadow: `1px 1px 0 ${INK}, 0 0 6px rgba(16,19,34,0.9)` }}>
          Hold the road. The castle must not fall.
        </div>
      </div>

      {/* the defenders, as a row of their own sprites */}
      <div style={{ display: "flex", gap: compact ? 4 : 6, alignItems: "flex-end", justifyContent: "center", padding: compact ? "2px 14px" : "3px 16px", background: "rgba(16,19,34,0.55)", border: `2px solid ${INK}`, boxShadow: `inset 0 0 0 1px ${WOOD.lt}` }}>
        {CREW.map((t) => {
          // a rig's box leaves room for swings and reach; trim that air so the
          // figures stand shoulder to shoulder at a readable size
          const b = crewBox(t, compact ? 1.45 : 1.85);
          return (
            <div key={t} style={{ display: "flex", margin: `${-Math.round(b * 0.16)}px ${-Math.round(b * 0.14)}px ${-Math.round(b * 0.04)}px` }}>
              <EnemyIcon type={t} box={b} />
            </div>
          );
        })}
      </div>
    </div>
  );

  const board = (
    <div style={{
      ...frame, background: "rgba(46,32,22,0.92)", padding: compact ? 13 : 16, width: "100%", maxWidth: compact ? 400 : 380,
      boxSizing: "border-box", position: "relative", gap: compact ? 8 : 10,
      // compact: a two-wide grid, three rows of taps instead of five
      ...(compact ? { display: "grid", gridTemplateColumns: "1fr 1fr" } : { display: "flex", flexDirection: "column" }),
    }}>
      <Studs />
      {saved ? (
        <>
          <button style={{ ...bigBtn(true), ...span }} onClick={onContinue}>
            CONTINUE CAMPAIGN
            <div style={sub}>{cleared}/{LEVELS.length} held · next: {upTo.name}</div>
          </button>
          <button style={bigBtn(false)} onClick={onNewCampaign}>NEW CAMPAIGN</button>
        </>
      ) : (
        <button style={{ ...bigBtn(true), ...span }} onClick={onNewCampaign}>NEW CAMPAIGN</button>
      )}
      <button style={{ ...bigBtn(false), ...(saved ? null : span) }} onClick={onCouncil}>
        WAR COUNCIL
        {free > 0 && (
          <div style={{ ...sub, color: "#f2cf4a", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Star size={11} /> {free} star{free > 1 ? "s" : ""} to spend
          </div>
        )}
      </button>
      {compact ? (
        <>
          <button style={smallBtn} onClick={onFreePlay}>FREE PLAY</button>
          <button style={smallBtn} onClick={() => setGuideOpen(true)}>FIELD GUIDE</button>
        </>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <button style={smallBtn} onClick={onFreePlay}>FREE PLAY</button>
          <button style={smallBtn} onClick={() => setGuideOpen(true)}>FIELD GUIDE</button>
        </div>
      )}
      <div style={{ ...span, fontSize: 10, letterSpacing: 1.5, textAlign: "center", color: "#d8c8a0", marginTop: compact ? 0 : 2 }}>
        {rankName(profile.xp)} · {profile.xp.toLocaleString()} XP
      </div>
    </div>
  );

  const story = blurb && (
    <div style={{ fontSize: 10, textAlign: "center", maxWidth: 340, lineHeight: 1.6, color: "#e8e0c8", textShadow: `1px 1px 0 ${INK}, 0 0 5px rgba(16,19,34,0.95)` }}>
      March the campaign from the Greenwood, through the Iron
      Marches, and down into the drowned Hollowfen — or pick any
      realm and army in Free Play and hold out against the Endless March.
    </div>
  );

  // the safe area (the notch sits on a side when the phone lies down), plus a margin
  const pad = (m) => `max(env(safe-area-inset-top), ${m}px) max(env(safe-area-inset-right), ${m}px) max(env(safe-area-inset-bottom), ${m}px) max(env(safe-area-inset-left), ${m}px)`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden", background: "#1c2450", color: "#e8e0c8", fontFamily: FONT }}>
      <canvas ref={vistaRef} width={VW} height={VH} aria-hidden="true" style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
        objectPosition: wide || compact ? "70% 60%" : "72% 60%", imageRendering: "pixelated",
        opacity: shown ? 1 : 0, transition: "opacity 0.6s",
      }} />
      {/* a shade behind the menu so the words stand off the picture */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: compact
          ? "linear-gradient(90deg, rgba(16,19,34,0.6) 0%, rgba(16,19,34,0.3) 50%, rgba(16,19,34,0) 72%)"
          : wide
            ? "linear-gradient(90deg, rgba(16,19,34,0.55) 0%, rgba(16,19,34,0.25) 42%, rgba(16,19,34,0) 60%)"
            : "linear-gradient(180deg, rgba(16,19,34,0.35) 0%, rgba(16,19,34,0.1) 40%, rgba(16,19,34,0.45) 100%)",
      }} />

      <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", padding: pad(compact ? 10 : 18) }}>
        <Fit deps={[compact, wide, blurb, saved, free > 0]}>
          {compact ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", paddingLeft: "clamp(0px, 4vw, 48px)" }}>
              <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                {title}
                {board}
              </div>
            </div>
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: wide ? "flex-start" : "center",
              paddingLeft: wide ? "clamp(6px, calc(7vw - 18px), 102px)" : 0,
            }}>
              <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                {title}
                {board}
                {story}
              </div>
            </div>
          )}
        </Fit>
      </div>

      {/* outside the <Fit>: a fixed modal inside a transform would pin to it */}
      {guideOpen && <FieldGuide onClose={() => setGuideOpen(false)} />}
    </div>
  );
}
