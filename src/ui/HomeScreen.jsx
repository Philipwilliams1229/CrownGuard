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
import { woodBtn, goldBtn, frame } from "./frames.js";
import Studs from "./Studs.jsx";
import FieldGuide from "./FieldGuide.jsx";
import { LEVELS, hasProgress, currentLevel } from "../data/campaign.js";
import { starsFree, rankName } from "../data/profile.js";
import { Star } from "./Glyphs.jsx";
import { CastleIcon } from "./hud/icons.jsx";
import { titleVistaAsync, VW, VH } from "./titleArt.js";
import { startCrowd } from "./titleCrowd.js";
import { warmMapTerrain } from "./mapArt.js";

const INK = "#10131a";

export default function HomeScreen({ progress, profile, onNewCampaign, onContinue, onFreePlay, onCouncil }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const saved = hasProgress(progress);
  const upTo = currentLevel(progress);
  const cleared = LEVELS.filter((l) => progress.cleared[l.id]).length;
  const free = starsFree(profile);
  const vp = useViewport();
  const compact = vp.short && vp.landscape;                      // phone on its side
  const wide = !compact && vp.w >= 820 && vp.w / vp.h >= 1.25;   // iPad on its side, desktop
  // the blurb is the first thing to go when height is short, and on a phone
  // held upright it would sit on the road where the crowd walks
  const blurb = !compact && !vp.narrow && vp.h >= (wide ? 600 : 640);

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

  // The crown's people on the road (titleCrowd.js), on a canvas laid exactly
  // over the vista: same aspect, same object-fit and position, so they stay
  // on the road under every crop. It holds K pixels per vista pixel, K matched
  // to the screen's own pixels so each figure is drawn once at its true size.
  const crowdRef = useRef(null), crowd = useRef(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const K = Math.min(3, Math.max(1, Math.round(Math.max(vp.w / VW, vp.h / VH) * dpr * 4) / 4));
  useEffect(() => {
    if (!shown || !crowdRef.current) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const c = startCrowd(crowdRef.current, { still });
    crowd.current = c;
    if (import.meta.env.DEV) window.__titleCrowd = c;   // for checking the walk from the console
    return () => { c.stop(); crowd.current = null; };
  }, [shown]);
  useEffect(() => { crowd.current?.redraw(); }, [K]);

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

  // the wordmark and motto; the defenders themselves are out on the road
  // in the picture (titleCrowd.js)
  const title = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* compact: the castle mark stands beside the wordmark, to save a line of height */}
        <div style={{ display: "flex", flexDirection: compact ? "row" : "column", alignItems: "center", gap: compact ? 12 : 0 }}>
          <CastleIcon size={compact ? 36 : 48} title="Crownguard" />
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

  // the vista and the crowd over it share one placement
  const vistaStyle = {
    position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
    objectPosition: wide || compact ? "70% 60%" : "72% 60%", imageRendering: "pixelated",
    opacity: shown ? 1 : 0, transition: "opacity 0.6s",
  };

  // the safe area (the notch sits on a side when the phone lies down), plus a margin
  const pad = (m) => `max(env(safe-area-inset-top), ${m}px) max(env(safe-area-inset-right), ${m}px) max(env(safe-area-inset-bottom), ${m}px) max(env(safe-area-inset-left), ${m}px)`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden", background: "#1c2450", color: "#e8e0c8", fontFamily: FONT }}>
      <canvas ref={vistaRef} width={VW} height={VH} aria-hidden="true" style={vistaStyle} />
      <canvas ref={crowdRef} width={Math.round(VW * K)} height={Math.round(VH * K)} aria-hidden="true" style={vistaStyle} />
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
