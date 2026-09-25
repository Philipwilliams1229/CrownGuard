// ============ CAMPAIGN MAP ============
// The overworld: one continent, each chapter a country on it, each level a
// waypoint on the road through. The land is pixel art painted once (see
// mapArt.js); over it sit a progress layer (the gold of the walked road, a
// banner on every won waypoint, a shield on the next fight, fog over the
// countries not yet reached) and an SVG layer for the names, the pulse on
// the front line, and the taps.
//
// All three share the map's 400x360 unit space (y from -120 to 240), so the
// same picture works on a phone and on a desktop. On a landscape tablet the
// map takes the height of the screen and the chosen level's card stands
// beside it; on a phone held upright the card drops below.
//
// Three layouts, from useViewport (ui/fit.jsx):
//  - "wide":  a tablet or desktop on its side. Header on top, map + card.
//  - "short": a phone on its side (under 500px tall). No header row: the
//    map fills the whole height, and the Menu / Works buttons sit over the
//    card beside it. The card is compact; only its text scrolls, the March
//    button stays pinned at its foot.
//  - "stack": a phone held upright. Header, map, card; the map gives up
//    height so the card fits without scrolling the page.

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useViewport } from "./fit.jsx";
import { CHAPTERS, LEVELS, levelById, isUnlocked, currentLevel, loadCastle } from "../data/campaign.js";
import CastleWorksList from "./CastleWorks.jsx";
import { FACTIONS } from "../data/factions.js";
import { REALMS } from "../data/maps.js";
import { W, H } from "../data/constants.js";
import EnemyIcon from "./EnemyIcon.jsx";
import { Star } from "./Glyphs.jsx";
import { MAX_STARS } from "../data/profile.js";
import { panel, FONT } from "./theme.js";
import { PARCH, woodBtn, goldBtn, frame } from "./frames.js";
import Studs from "./Studs.jsx";
import { AW, AH, MAP, terrainFor, drawMapState, labelBox, LABEL_FONT, BANNER_AT } from "./mapArt.js";

const INK = "#10131a";
const LINE = "#241a26";
const SEA = "#2a4a6a";
// where the fen's lights wander: [x, y, delay]
const WISPS = [[262, -58, 0], [334, -46, 0.7], [282, -104, 1.3], [352, -62, 0.4], [236, -50, 1.8], [322, -108, 1.1], [376, -44, 2.2]];
const STAR_SLOTS = Array.from({ length: MAX_STARS }, (_, i) => i + 1);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// padding that keeps clear of a notch or the home bar
const safePad = (t, r, b, l) =>
  `max(${t}px, env(safe-area-inset-top)) max(${r}px, env(safe-area-inset-right)) max(${b}px, env(safe-area-inset-bottom)) max(${l}px, env(safe-area-inset-left))`;

// A name scroll: parchment with curled ends, the name in ink.
function Scroll({ lv, open, sel }) {
  const b = labelBox(lv);
  const face = open ? PARCH.face : "#9c968a", curl = open ? PARCH.dk : "#77716a";
  // a name hung over its waypoint gets a little tab pointing down at it
  const cx = b.x + b.w / 2, above = b.y < lv.pos[1];
  return (
    <g style={{ pointerEvents: "none" }} shapeRendering="crispEdges">
      {above && <path d={`M${cx - 2.6},${b.y + b.h - 0.4} h5.2 l-2.6,2.8 z`} fill={sel ? "#f2cf4a" : face} stroke={LINE} strokeWidth="0.7" />}
      <rect x={b.x - 1.6} y={b.y + 1.6} width={2.6} height={b.h - 1.2} fill={curl} stroke={LINE} strokeWidth="0.6" />
      <rect x={b.x + b.w - 1} y={b.y + 1.6} width={2.6} height={b.h - 1.2} fill={curl} stroke={LINE} strokeWidth="0.6" />
      <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={face} stroke={sel ? "#f2cf4a" : LINE} strokeWidth={sel ? 1.1 : 0.7} />
      <rect x={b.x + 0.6} y={b.y + 0.6} width={b.w - 1.2} height={0.8} fill={open ? PARCH.lt : "#aca698"} />
      <text x={b.x + b.w / 2} y={b.y + b.h / 2 + LABEL_FONT * 0.36} textAnchor="middle"
        fontSize={LABEL_FONT} fontWeight="bold" fontFamily={FONT} fill={open ? PARCH.ink : "#46424c"}>
        {lv.short || lv.name}
      </text>
    </g>
  );
}

// A chapter's name on a ribbon out at sea.
function Banner({ ch, open }) {
  const [cx, cy] = BANNER_AT[ch.id];
  const text = open ? `${ch.numeral}. ${ch.name.toUpperCase()}` : `${ch.numeral}. SEALED`;
  const w = text.length * 5.6 + 14, h = 11, x = cx - w / 2, y = cy - h / 2;
  const cloth = open ? "#a8505c" : "#5c5c6c", dk = open ? "#7a3440" : "#44444f", lt = open ? "#c46a70" : "#74748a";
  return (
    <g style={{ pointerEvents: "none" }} shapeRendering="crispEdges">
      {/* the swallow tails, tucked behind */}
      <path d={`M${x - 8},${y + 3} h10 v${h} h-10 l3,${-h / 2} z`} fill={dk} stroke={LINE} strokeWidth="0.8" />
      <path d={`M${x + w + 8},${y + 3} h-10 v${h} h10 l-3,${-h / 2} z`} fill={dk} stroke={LINE} strokeWidth="0.8" />
      <rect x={x} y={y} width={w} height={h} fill={cloth} stroke={LINE} strokeWidth="0.9" />
      <rect x={x + 0.8} y={y + 0.8} width={w - 1.6} height={1.2} fill={lt} />
      <rect x={x + 0.8} y={y + h - 2} width={w - 1.6} height={1.2} fill={dk} />
      <text x={cx} y={cy + 2.9} textAnchor="middle" fontSize="8" fontWeight="bold" letterSpacing="1.2" fontFamily={FONT}
        fill={open ? "#f2dc8a" : "#c8c8d4"} stroke={LINE} strokeWidth="1.6" paintOrder="stroke">
        {text}
      </text>
    </g>
  );
}

export default function CampaignMap({ progress, profile, onStart, onBack, onReset, onBuyWork }) {
  const rating = (id) => profile?.stars?.[id] || 0;
  const [selId, setSelId] = useState(() => currentLevel(progress).id);
  const [worksOpen, setWorksOpen] = useState(false);
  const [painted, setPainted] = useState(false);
  const sel = levelById(selId);
  const upTo = currentLevel(progress);
  const front = progress.cleared[upTo.id] ? null : upTo;
  const vp = useViewport();
  const wide = vp.w >= 600 && vp.w / vp.h >= 1.25;   // map and card side by side
  const short = wide && vp.h < 500;                   // ...on a phone on its side
  const compact = short || vp.w < 700;                // a phone: the tight card
  const mode = short ? "short" : wide ? "wide" : "stack";

  // Side by side, the map takes as much of the screen as it can while the
  // whole continent still fits the height; what is left goes to the card.
  const bodyRef = useRef(null);
  const [room, setRoom] = useState(null);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!wide || !el) return;
    const fit = () => setRoom((o) => (o && o.w === el.clientWidth && o.h === el.clientHeight ? o : { w: el.clientWidth, h: el.clientHeight }));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);
  const CHROME = 26, GAP = short ? 8 : 12;
  let CARD_W = 320;
  let mapBox = null;
  if (short && room) {
    // a phone on its side: the card column takes a bit under half, the map
    // the rest, both the full height of the screen
    CARD_W = Math.round(clamp(room.w * 0.46, 290, 420));
    mapBox = { width: room.w - CARD_W - GAP, height: room.h };
  } else if (wide && room) {
    const byW = room.w - CARD_W - 12 - CHROME, byH = (room.h - CHROME) / 0.9;
    const inner = Math.max(200, Math.min(byW, Math.max(byH, Math.min(byW, 420))));
    mapBox = { width: inner + CHROME, height: Math.min(room.h, inner * 0.9 + CHROME) };
  }

  // Paint the land and the progress over it. The land is baked once per
  // visit to the page (a few hundred ms the first time), so it waits a frame
  // for the page to show before it starts.
  const landRef = useRef(null), stateRef = useRef(null);
  const starKey = LEVELS.map((l) => rating(l.id)).join("");
  const clearKey = LEVELS.map((l) => (progress.cleared[l.id] ? 1 : 0)).join("");
  useEffect(() => {
    let dead = false;
    const id = setTimeout(() => {
      if (dead || !landRef.current || !stateRef.current) return;
      const land = landRef.current.getContext("2d");
      land.clearRect(0, 0, AW, AH);
      land.drawImage(terrainFor(progress), 0, 0);
      const st = stateRef.current.getContext("2d");
      st.clearRect(0, 0, AW, AH);
      drawMapState(st, { progress, stars: profile?.stars || {} });
      setPainted(true);
    }, painted ? 0 : 30);
    return () => { dead = true; clearTimeout(id); };
    // the layout changing remounts the canvases (blank), so it repaints too
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearKey, starKey, mode]);

  // Close up (the default) the map is half again the size of its window and
  // panned, Kingdom Rush style; the button in its corner pulls back to the
  // whole continent. On arrival the view goes to the front line.
  const [close, setClose] = useState(true);
  const scrollRef = useRef(null);
  // the size of the map's window, so the continent inside can be sized to it
  const [view, setView] = useState(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fit = () => setView((o) => (o && o.w === el.clientWidth && o.h === el.clientHeight ? o : { w: el.clientWidth, h: el.clientHeight }));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);
  // close up: half again the window's width (never under 640px on a phone,
  // so the names stay readable); pulled back: the whole continent, fitted
  const land = view && view.w > 0
    ? (close ? Math.max(view.w * 1.5, compact ? 640 : 0) : Math.min(view.w, view.h / 0.9))
    : null;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // frame the whole country the front line is in, if it fits; if not,
    // the front line itself
    const k = el.scrollWidth / MAP.w, ps = upTo.chapter.levels.map((l) => l.pos);
    const x0 = Math.min(...ps.map((p) => p[0])) - 26, x1 = Math.max(...ps.map((p) => p[0])) + 26;
    const y0 = Math.min(...ps.map((p) => p[1])) - 34, y1 = Math.max(...ps.map((p) => p[1])) + 24;
    const fits = (x1 - x0) * k <= el.clientWidth && (y1 - y0) * k <= el.clientHeight;
    const [fx, fy] = fits ? [(x0 + x1) / 2, (y0 + y1) / 2] : upTo.pos;
    el.scrollTop = Math.max(0, (fy - MAP.y) * k - el.clientHeight / 2);
    el.scrollLeft = Math.max(0, (fx - MAP.x) * k - el.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // re-framed whenever the continent is drawn at a new size (a new layout,
    // a turned phone); Safari's bars coming and going change only the
    // window's height, which leaves the close-up's size alone
  }, [mode, close, land]);
  // A mouse can drag the map about too (touch pans it natively). A drag
  // that moved is not a tap, so it selects nothing.
  const drag = useRef(null);
  const panDown = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollRef.current;
    drag.current = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop, moved: false };
  };
  const panMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    scrollRef.current.scrollLeft = d.l - dx;
    scrollRef.current.scrollTop = d.t - dy;
  };
  const panUp = () => { setTimeout(() => { drag.current = null; }, 0); };
  const panClick = (e) => { if (drag.current?.moved) { e.stopPropagation(); e.preventDefault(); } };
  const clearedCount = LEVELS.filter((l) => progress.cleared[l.id]).length;

  const selUnlocked = sel ? isUnlocked(sel.id, progress) : false;
  const selCleared = sel ? !!progress.cleared[sel.id] : false;
  const selRealm = sel ? REALMS[sel.realm] : null;
  const selFaction = sel ? FACTIONS[sel.chapter.faction] : null;
  const selBoss = sel ? sel.index === sel.chapter.levels.length - 1 : false;

  const abandon = (
    <button style={{ ...woodBtn, fontSize: 10.5, padding: "6px 14px", minHeight: 44, opacity: 0.85, alignSelf: "center" }}
      onClick={() => { if (confirm("Start the whole campaign over? Every cleared level is forgotten.")) onReset(); }}>
      Abandon campaign &amp; start over
    </button>
  );

  // ---- the continent ----
  const map = (
    <div style={{
      ...frame, background: SEA, padding: 8, boxSizing: "border-box", position: "relative",
      ...(wide
        ? { ...(mapBox || { height: "100%", aspectRatio: "400 / 360" }), flexShrink: 0 }
        // upright, the map takes whatever height the card below leaves it
        // (down to a floor; the close-up pans, so any shape of window works)
        : { width: "100%", maxWidth: 780, flex: "1 1 0", minHeight: 210, maxHeight: "calc(min(100vw - 20px, 780px) * 1.5)", display: "flex" }),
    }}>
      <Studs />
      <button aria-label={close ? "Show the whole continent" : "Look closer"} title={close ? "The whole continent" : "Closer"}
        onClick={() => setClose((v) => !v)}
        style={{ ...woodBtn, position: "absolute", top: 14, right: 14, zIndex: 3, width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="22" height="22" viewBox="0 0 11 11" style={{ shapeRendering: "crispEdges", display: "block" }} aria-hidden="true">
          <path d="M3,0h3v1h1v1h1v3h-1v1h-1v1h-3v-1h-1v-1h-1v-3h1v-1h1z" fill="#10131a" />
          <path d="M3,1h3v1h1v3h-1v1h-3v-1h-1v-3h1z" fill="#cfe2e6" />
          <rect x="7" y="7" width="2" height="2" fill="#10131a" /><rect x="8" y="8" width="3" height="3" fill="#10131a" />
          <rect x="8" y="8" width="2" height="2" fill="#8a6440" />
          <rect x="2.5" y="3" width="4" height="1" fill="#10131a" />
          {!close && <rect x="4" y="1.5" width="1" height="4" fill="#10131a" />}
        </svg>
      </button>
      <div ref={scrollRef} onPointerDown={panDown} onPointerMove={panMove} onPointerUp={panUp} onPointerLeave={panUp} onClickCapture={panClick}
        style={{ width: "100%", height: "100%", overflow: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", border: `2px solid ${INK}`, boxSizing: "border-box", cursor: close ? "grab" : "default", display: "flex" }}>
        {/* close up the continent is drawn larger than its window and
            panned, so the names stay readable; a phone never goes below
            that size */}
        <div style={{
          position: "relative", flexShrink: 0, margin: "auto", background: SEA,
          ...(land ? { width: land, height: land * 0.9 } : { width: close ? "150%" : "100%", aspectRatio: "400 / 360" }),
        }}>
          <canvas ref={landRef} width={AW} height={AH}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated", opacity: painted ? 1 : 0, transition: "opacity 0.35s" }} />
          <canvas ref={stateRef} width={AW} height={AH}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />
          {!painted && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, letterSpacing: 2, color: "#9fb8cc" }}>
              UNROLLING THE MAP…
            </div>
          )}
          <svg viewBox={`${MAP.x} ${MAP.y} ${MAP.w} ${MAP.h}`} preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: painted ? 1 : 0 }}>
            {CHAPTERS.map((ch) => <Banner key={ch.id} ch={ch} open={isUnlocked(ch.levels[0].id, progress)} />)}

            {/* will-o'-wisps drifting over the fen, once the war gets there */}
            {isUnlocked(CHAPTERS[2].levels[0].id, progress) && WISPS.map(([x, y, d], i) => (
              <g key={i} style={{ pointerEvents: "none" }} shapeRendering="crispEdges">
                <animateTransform attributeName="transform" type="translate" values={`0 0; ${i % 2 ? 2 : -2} -2.5; 0 0`} dur={`${3 + (i % 3)}s`} begin={`${d}s`} repeatCount="indefinite" />
                <rect x={x - 1.4} y={y - 1.4} width="2.8" height="2.8" fill="#9ae8b0" opacity="0.35">
                  <animate attributeName="opacity" values="0.1;0.45;0.1" dur="2.4s" begin={`${d}s`} repeatCount="indefinite" />
                </rect>
                <rect x={x - 0.6} y={y - 0.6} width="1.2" height="1.2" fill="#e8fff0">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="2.4s" begin={`${d}s`} repeatCount="indefinite" />
                </rect>
              </g>
            ))}

            {/* the front line: rings spreading out from the next fight, and
                a gold chevron bobbing over it */}
            {front && (
              <g style={{ pointerEvents: "none" }}>
                {[0, 0.8].map((d) => (
                  <ellipse key={d} cx={front.pos[0]} cy={front.pos[1]} rx="6" ry="3" fill="none" stroke="#f2cf4a" strokeWidth="1.2">
                    <animate attributeName="rx" values="5;13" dur="1.6s" begin={`${d}s`} repeatCount="indefinite" />
                    <animate attributeName="ry" values="2.5;6.5" dur="1.6s" begin={`${d}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0" dur="1.6s" begin={`${d}s`} repeatCount="indefinite" />
                  </ellipse>
                ))}
                {labelBox(front).y > front.pos[1] && <g>
                  <animateTransform attributeName="transform" type="translate" values="0 0; 0 -2.2; 0 0" dur="0.9s" repeatCount="indefinite" />
                  <path d={`M${front.pos[0] - 3.6},${front.pos[1] - 28} h7.2 l-3.6,4.2 z`} fill="#f2cf4a" stroke={LINE} strokeWidth="0.8" strokeLinejoin="round" />
                </g>}
              </g>
            )}

            {/* the chosen waypoint: gold corner brackets */}
            {sel && (() => {
              const [x, y] = sel.pos, l = x - 11, r = x + 11, t = y - 23, b = y + 6, k = 3.6;
              const d = `M${l},${t + k}V${t}H${l + k} M${r - k},${t}H${r}V${t + k} M${r},${b - k}V${b}H${r - k} M${l + k},${b}H${l}V${b - k}`;
              return (
                <g style={{ pointerEvents: "none" }} fill="none" strokeLinecap="square">
                  <path d={d} stroke={LINE} strokeWidth="2.6" />
                  <path d={d} stroke="#f2cf4a" strokeWidth="1.2" />
                </g>
              );
            })()}

            {/* names, for every country the war has reached */}
            {LEVELS.filter((lv) => isUnlocked(lv.chapter.levels[0].id, progress)).map((lv) => (
              <Scroll key={lv.id} lv={lv} open={isUnlocked(lv.id, progress)} sel={lv.id === selId} />
            ))}

            {/* the taps: every waypoint is a generous target, its name too */}
            {LEVELS.map((lv) => {
              const [x, y] = lv.pos, b = labelBox(lv);
              return (
                <g key={lv.id} role="button" tabIndex={0} aria-label={lv.name}
                  onClick={() => setSelId(lv.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelId(lv.id); }}
                  style={{ cursor: "pointer", outline: "none" }}>
                  <rect x={x - 13} y={y - 24} width="26" height="31" fill="transparent" />
                  <rect x={b.x - 2} y={b.y - 1} width={b.w + 4} height={b.h + 2} fill="transparent" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );

  // ---- the chosen waypoint's card ----
  // a thumbnail of the actual road you'll be defending
  const thumb = (width) => (
    <svg viewBox="0 0 150 100" width={width} style={{ flexShrink: 0, aspectRatio: "3 / 2", height: "auto", border: `3px solid ${LINE}`, boxShadow: `0 0 0 2px ${PARCH.dk}`, imageRendering: "pixelated", boxSizing: "border-box", filter: selUnlocked ? "none" : "grayscale(1) brightness(0.6)" }}>
      <rect x="0" y="0" width="150" height="100" fill={selRealm.GRASS} />
      {(selRealm.rivers || []).map((rv, i) => (
        <polyline key={`rv${i}`} points={rv.pts.map(([c, r]) => `${c * 10 + 5},${r * 10 + 5}`).join(" ")}
          fill="none" stroke={selRealm.water?.deep || "#3a6478"} strokeWidth={Math.max(4, (rv.w || 32) / 5)}
          strokeLinejoin="round" strokeLinecap="round" />
      ))}
      <polyline points={selRealm.path.map(([c, r]) => `${c * 10 + 5},${r * 10 + 5}`).join(" ")}
        fill="none" stroke={selRealm.PATH_EDGE} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={selRealm.path.map(([c, r]) => `${c * 10 + 5},${r * 10 + 5}`).join(" ")}
        fill="none" stroke={selRealm.PATH_MAIN} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      {(selRealm.ponds || []).map((p, i) => (
        <rect key={i} x={(p.x - p.w / 2) * 150 / W} y={(p.y - p.h / 2) * 100 / H} width={p.w * 150 / W} height={p.h * 100 / H}
          fill={p.t === "lava" ? "#c05a32" : p.t === "ice" ? "#b8d4e0" : p.t === "swamp" ? "#2c4638" : "#4a7a94"} />
      ))}
      <circle cx={selRealm.path[0][0] * 10 + 5} cy={selRealm.path[0][1] * 10 + 5} r="4" fill="#e05248" />
      <rect x={selRealm.path[selRealm.path.length - 1][0] * 10 - 1} y={selRealm.path[selRealm.path.length - 1][1] * 10 - 1} width="12" height="12" fill="#d8b34a" />
    </svg>
  );
  const marchStyle = {
    ...goldBtn, width: "100%", textAlign: "center", padding: "14px 10px", fontSize: 14, letterSpacing: 1, minHeight: 52,
    ...(selUnlocked ? {} : { background: "#8a8274", boxShadow: "inset -3px -3px 0 #6a6258, inset 3px 3px 0 #a8a092", color: "#4a4450", cursor: "not-allowed" }),
  };
  const marchLabel = selUnlocked ? (selCleared ? `Ride Out Again` : `March on ${sel.short || sel.name}`) : "🔒 Sealed";

  const fullCard = sel && (
    <div style={{
      ...frame, background: PARCH.face, color: PARCH.ink, padding: 16, boxSizing: "border-box", position: "relative",
      display: "flex", flexDirection: "column", gap: 10,
      ...(wide ? { width: CARD_W, flexShrink: 0, height: mapBox ? mapBox.height : "100%", overflowY: "auto", overflowX: "hidden", touchAction: "pan-y" } : { width: "100%" }),
    }}>
      <Studs />
      <div style={{ display: "flex", gap: 12, flexWrap: wide ? "wrap" : "nowrap", alignItems: "flex-start" }}>
        {thumb(wide ? "100%" : 132)}
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: PARCH.red, fontWeight: "bold" }}>
            CHAPTER {sel.chapter.numeral} · LEVEL {sel.index + 1} · {sel.window.count} WAVES{selBoss ? " · BOSS" : ""}
          </div>
          <div style={{ fontSize: 17, fontWeight: "bold", color: "#4a2418", margin: "4px 0 4px", lineHeight: 1.2 }}>
            {sel.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {STAR_SLOTS.map((i) => <Star key={i} size={15} lit={i <= rating(sel.id)} />)}
            {selCleared && <span style={{ fontSize: 9, letterSpacing: 1, color: "#3e6a2a", fontWeight: "bold", marginLeft: 6 }}>✓ HELD</span>}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.55, color: "#4a3826" }}>
        {selUnlocked ? sel.blurb : "The road this way is not yours yet. Take the level before it first."}
      </div>
      {selUnlocked && (
        <div style={{ background: "rgba(59,42,28,0.12)", border: `1px solid ${PARCH.dk}`, padding: "6px 8px" }}>
          <div style={{ fontSize: 8.5, letterSpacing: 2, color: PARCH.red, fontWeight: "bold", marginBottom: 4 }}>ON THE ROAD</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", flexWrap: "wrap", minHeight: 28 }}>
            {selFaction.types.map((ty) => <EnemyIcon key={ty} type={ty} box={26} />)}
          </div>
        </div>
      )}
      <div style={{ flex: wide ? 1 : 0 }} />
      <button style={marchStyle} disabled={!selUnlocked} onClick={() => onStart(sel)}>{marchLabel}</button>
      {wide && abandon}
    </div>
  );

  // The phone card: the same facts, tighter. Its text scrolls inside it if a
  // screen is too short for it; the March button never scrolls away.
  const compactCard = sel && (
    <div style={{
      ...frame, background: PARCH.face, color: PARCH.ink, padding: "12px 12px 11px", boxSizing: "border-box", position: "relative",
      display: "flex", flexDirection: "column", gap: 8, width: "100%",
      ...(short ? { flex: "1 1 0", minHeight: 0 } : { flexShrink: 0 }),
    }}>
      <Studs />
      <div style={{ flex: short ? "1 1 auto" : "0 0 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", touchAction: "pan-y", scrollbarWidth: "thin", display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {thumb(short ? (vp.h >= 375 ? 120 : 92) : 100)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8.5, letterSpacing: 1.2, color: PARCH.red, fontWeight: "bold", lineHeight: 1.3 }}>
              CH. {sel.chapter.numeral} · LEVEL {sel.index + 1} · {sel.window.count} WAVES{selBoss ? " · BOSS" : ""}
            </div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#4a2418", margin: "3px 0", lineHeight: 1.15 }}>
              {sel.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {STAR_SLOTS.map((i) => <Star key={i} size={13} lit={i <= rating(sel.id)} />)}
              {selCleared && <span style={{ fontSize: 8.5, letterSpacing: 1, color: "#3e6a2a", fontWeight: "bold", marginLeft: 5 }}>✓ HELD</span>}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.45, color: "#4a3826" }}>
          {selUnlocked ? sel.blurb : "The road this way is not yours yet. Take the level before it first."}
        </div>
        {selUnlocked && (
          <div style={{ background: "rgba(59,42,28,0.12)", border: `1px solid ${PARCH.dk}`, padding: "4px 7px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 8, letterSpacing: 1.5, color: PARCH.red, fontWeight: "bold", lineHeight: 1.25, flexShrink: 0 }}>ON THE<br />ROAD</div>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", flexWrap: "wrap", minHeight: 24 }}>
              {selFaction.types.map((ty) => <EnemyIcon key={ty} type={ty} box={22} />)}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button style={{ ...marchStyle, flex: 1, padding: "10px 8px", fontSize: 13, minHeight: 48 }} disabled={!selUnlocked} onClick={() => onStart(sel)}>{marchLabel}</button>
        <button aria-label="Abandon campaign and start over"
          style={{ ...woodBtn, flexShrink: 0, width: 62, padding: "4px 6px", fontSize: 9, letterSpacing: 1, lineHeight: 1.25, textAlign: "center", opacity: 0.85 }}
          onClick={() => { if (confirm("Start the whole campaign over? Every cleared level is forgotten.")) onReset(); }}>
          START<br />OVER
        </button>
      </div>
    </div>
  );
  const card = compact ? compactCard : fullCard;

  // ---- the header: back to the menu, the tally, the castle works ----
  const header = (
    <div style={{ width: "100%", maxWidth: short ? "none" : wide ? 1400 : 780, display: "flex", alignItems: "center", gap: short ? 6 : 10, flexShrink: 0 }}>
      <button style={{ ...woodBtn, padding: compact ? "0 11px" : "0 14px", fontSize: compact ? 12 : 13, flexShrink: 0 }} onClick={onBack}>◀ Menu</button>
      <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
        <div style={{ fontSize: compact ? 13 : 17, fontWeight: "bold", letterSpacing: compact ? 2 : 4, color: "#e8c65a", textShadow: `2px 2px 0 ${INK}`, whiteSpace: "nowrap" }}>THE CAMPAIGN</div>
        <div style={{ fontSize: compact ? 9 : 9.5, letterSpacing: 1.5, opacity: 0.7, marginTop: 2 }}>{clearedCount} of {LEVELS.length} held</div>
      </div>
      <button title="The crown's treasury and the castle's works" aria-label="Castle works"
        style={{ ...woodBtn, padding: compact ? "0 10px" : "0 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }} onClick={() => setWorksOpen(true)}>
        <span aria-hidden="true">🏰</span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
          <span style={{ fontSize: 8, letterSpacing: 1.5, opacity: 0.8 }}>WORKS</span>
          <b style={{ color: "#f2cf4a" }}>{(progress.treasury || 0).toLocaleString("en-US")}</b>
        </span>
      </button>
    </div>
  );

  // ---- the castle works, bought here between levels from the treasury ----
  // The box's head (title and X) stays put while the works scroll beneath
  // it; a tap on the dark around the box closes it too. On a phone on its
  // side the box goes wide and the works stand two abreast.
  const works = worksOpen && sel && (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(12,12,16,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: safePad(10, 12, 10, 12), boxSizing: "border-box" }}
      onClick={() => setWorksOpen(false)}>
      <div style={{ ...panel, ...frame, width: "100%", maxWidth: short ? 620 : 380, maxHeight: "100%", display: "flex", flexDirection: "column", padding: short ? "10px 12px 12px" : 16, boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.75, flex: 1 }}>🏰 CASTLE WORKS — {sel.chapter.name.toUpperCase()}</span>
          <button aria-label="Close" style={{ ...woodBtn, padding: "0 14px", fontSize: 13, flexShrink: 0 }} onClick={() => setWorksOpen(false)}>✕</button>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", touchAction: "pan-y", scrollbarWidth: "thin" }}>
          <CastleWorksList
            works={loadCastle(sel.chapter.id)}
            purse={progress.treasury || 0}
            purseLabel="THE CROWN'S TREASURY"
            note={`Every level you hold sends its leftover gold home. Spend it here on the ${sel.chapter.name}'s castle: what you build stands at every level of the chapter.`}
            onBuy={(key, next) => onBuyWork(sel.chapter.id, key, next)} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      height: "100dvh", background: "radial-gradient(ellipse at 50% 40%, #243044 0%, #161b24 75%)", color: "#e8e0c8", fontFamily: FONT,
      padding: short ? safePad(6, 8, 6, 8) : wide ? safePad(10, 12, 12, 12) : safePad(8, 10, 10, 10), boxSizing: "border-box", overflow: wide ? "hidden" : "auto",
      display: "flex", flexDirection: "column", alignItems: "center", gap: wide ? 10 : 8,
    }}>
      {works}
      {short ? (
        // a phone on its side: the map the full height, the header over the card
        <div ref={bodyRef} style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", gap: GAP, justifyContent: "center" }}>
          {map}
          <div style={{ width: CARD_W, flexShrink: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {header}
            {card}
          </div>
        </div>
      ) : wide ? (
        <>
          {header}
          <div ref={bodyRef} style={{ flex: 1, minHeight: 0, width: "100%", maxWidth: 1400, display: "flex", gap: GAP, justifyContent: "center", alignItems: "flex-start" }}>
            {map}
            {card}
          </div>
        </>
      ) : (
        <>
          {header}
          {map}
          <div style={{ width: "100%", maxWidth: 780, flexShrink: 0 }}>{card}</div>
          {!compact && abandon}
        </>
      )}
    </div>
  );
}
