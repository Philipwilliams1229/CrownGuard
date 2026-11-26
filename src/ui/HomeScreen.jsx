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
import { FONT, MARK, WAR_ROOM } from "./theme.js";
import { woodBtn, goldBtn, frame } from "./frames.js";
import Studs from "./Studs.jsx";
import FieldGuide from "./FieldGuide.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import { LEVELS, hasProgress, currentLevel } from "../data/campaign.js";
import { starsFree, rankName, heroRecord } from "../data/profile.js";
import { HEROES } from "../data/bands.js";
import { Star } from "./Glyphs.jsx";
import { CastleIcon, CoinIcon, ValorIcon } from "./hud/icons.jsx";
import StatsPanel from "./StatsPanel.jsx";
import SaveFilesModal from "./SaveFilesModal.jsx";
import { readSlots } from "../data/saveSlots.js";
import BuildTag from "./BuildTag.jsx";
import { titleVistaAsync, VW, VH } from "./titleArt.js";
import { startCrowd } from "./titleCrowd.js";
import { warmMapTerrain } from "./mapArt.js";

const INK = "#10131a";

export default function HomeScreen({ progress, profile, setProfile, resume, onContinue, onFreePlay, onWarRoom, onCampaignReset }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  // SAVE FILES (data/saveSlots.js): three whole games; a new one starts in an empty file
  const [filesOpen, setFilesOpen] = useState(false);
  const fileNo = readSlots().active;
  const saved = hasProgress(progress) || !!resume;   // a battle left on the first level is a save too
  const upTo = currentLevel(progress);
  const cleared = LEVELS.filter((l) => progress.cleared[l.id]).length;
  // what waits to be spent: the towers' shared stars and the heroes' valor
  const free = starsFree(profile);
  const valor = Object.keys(HEROES).reduce((n, k) => n + heroRecord(profile, k).points, 0);
  const treasury = progress.treasury || 0;
  const vp = useViewport();
  const compact = vp.short && vp.landscape;                      // phone on its side
  const wide = !compact && vp.w >= 820 && vp.w / vp.h >= 1.25;   // iPad on its side, desktop
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
  // where NEW CAMPAIGN used to be: a new game goes in an empty save file, so
  // no campaign is ever wiped by it (owner, 2026-11-24)
  const filesBtn = (
    <button style={smallBtn} onClick={() => setFilesOpen(true)}>
      SAVE FILES
      <div style={sub}>file {fileNo} of 3</div>
    </button>
  );

  // the wordmark and motto; the defenders themselves are out on the road
  // in the picture (titleCrowd.js)
  const title = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* compact: the castle mark stands beside the wordmark, to save a line of height */}
        <div style={{ display: "flex", flexDirection: compact ? "row" : "column", alignItems: "center", gap: compact ? 12 : 0 }}>
          <CastleIcon size={compact ? 36 : 48} title="Crownguard" />
          <h1 style={{
            margin: compact ? 0 : "6px 0 0", fontFamily: MARK, fontWeight: "bold", color: "#f2cf4a", whiteSpace: "nowrap",
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

  // the War Room: every upgrade, stars and gold (owner, 2026-11-25); its line shows what waits to be spent
  const warRoomBtn = (
    <button key="war" style={smallBtn} onClick={onWarRoom}>
      {WAR_ROOM}
      <div style={{ ...sub, color: "#f2cf4a", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 11, whiteSpace: "nowrap" }}>
        {free > 0 || valor > 0 || treasury > 0 ? (
          [free > 0 && <><Star size={11} /> {free}</>, valor > 0 && <><ValorIcon size={11} /> {valor}</>, treasury > 0 && <><CoinIcon size={11} /> {treasury.toLocaleString("en-US")}</>]
            .filter(Boolean).flatMap((x, i) => (i ? [<span key={`d${i}`} style={{ opacity: 0.6 }}>·</span>, <span key={i} style={{ display: "contents" }}>{x}</span>] : [<span key={i} style={{ display: "contents" }}>{x}</span>]))
        ) : <span style={{ opacity: 0.6, color: "#e8e0c8" }}>castle, towers, heroes</span>}
      </div>
    </button>
  );
  // the all-time record (it was the War Council's third tab)
  const statsBtn = (
    <button key="stats" style={smallBtn} onClick={() => setStatsOpen(true)}>
      STATS
      <div style={{ ...sub, minHeight: 11, whiteSpace: "nowrap" }}>
        {profile.stats.kills > 0 ? `${profile.stats.kills.toLocaleString("en-US")} foes slain` : "the all-time record"}
      </div>
    </button>
  );
  const menuPairs = [
    [warRoomBtn, <button key="free" style={smallBtn} onClick={onFreePlay}>FREE PLAY</button>],
    [statsBtn, <button key="guide" style={smallBtn} onClick={() => setGuideOpen(true)}>FIELD GUIDE</button>],
    [<span key="files" style={{ display: "contents" }}>{filesBtn}</span>, <button key="set" style={smallBtn} onClick={() => setSettingsOpen(true)}>SETTINGS</button>],
  ];

  const board = (
    <div style={{
      ...frame, background: "rgba(46,32,22,0.92)", padding: compact ? 13 : 16, width: "100%", maxWidth: compact ? 400 : 380,
      boxSizing: "border-box", position: "relative", gap: compact ? 8 : 10,
      // compact: a two-wide grid, three rows of taps instead of five
      ...(compact ? { display: "grid", gridTemplateColumns: "1fr 1fr" } : { display: "flex", flexDirection: "column" }),
    }}>
      <Studs />
      {/* over a save, CONTINUE leads; SAVE FILES holds the other games */}
      {saved ? (
        <button style={{ ...bigBtn(true), ...span }} onClick={onContinue}>
          CONTINUE CAMPAIGN
          {/* a battle left unfinished (data/checkpoint.js) is picked straight back up */}
          <div style={sub}>{resume ? `${resume.name} · wave ${resume.wave} next` : `${cleared}/${LEVELS.length} held · next: ${upTo.name}`}</div>
        </button>
      ) : (
        <button style={{ ...bigBtn(true), ...span }} onClick={onContinue}>NEW CAMPAIGN</button>
      )}
      {/* six buttons two by two (owner, 2026-11-26): War Room | Free Play, Stats | Field Guide,
          Save Files | Settings; a grid on a phone on its side, rows of two elsewhere */}
      {compact ? menuPairs.flat() : menuPairs.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 10 }}>{row}</div>
      ))}
      <div style={{ ...span, fontSize: 10, letterSpacing: 1.5, textAlign: "center", color: "#d8c8a0", marginTop: compact ? 0 : 2 }}>
        {rankName(profile.xp)} · {profile.xp.toLocaleString()} XP
      </div>
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
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#1c2450", color: "#e8e0c8", fontFamily: FONT }}>
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
        <Fit deps={[compact, wide, saved, free > 0, treasury > 0]}>
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
              </div>
            </div>
          )}
        </Fit>
      </div>

      <BuildTag style={{ position: "absolute", left: "max(env(safe-area-inset-left), 10px)", bottom: "max(env(safe-area-inset-bottom), 6px)" }} />

      {/* outside the <Fit>: a fixed modal inside a transform would pin to it */}
      {guideOpen && <FieldGuide onClose={() => setGuideOpen(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} onCampaignReset={onCampaignReset} />}
      {filesOpen && <SaveFilesModal short={compact} resume={resume} onClose={() => setFilesOpen(false)} />}
      {statsOpen && <StatsPanel profile={profile} setProfile={setProfile} onClose={() => setStatsOpen(false)} />}
    </div>
  );
}
