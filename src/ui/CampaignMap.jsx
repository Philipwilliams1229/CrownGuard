// ============ CAMPAIGN MAP ============
// The overworld: one continent, each chapter a country on it, each level a
// waypoint on the road through. Cleared levels are gold and joined by a solid
// road; the level you are up to pulses; everything past it is sealed until
// you get there.
//
// The map is one SVG in a fixed 400x240 space that scales to the window, so
// the same picture works on a phone and on a desktop.

import { useState, useRef, useEffect } from "react";
import { CHAPTERS, LEVELS, levelById, isUnlocked, currentLevel } from "../data/campaign.js";
import { FACTIONS } from "../data/factions.js";
import { REALMS } from "../data/maps.js";
import { W, H } from "../data/constants.js";
import EnemyIcon from "./EnemyIcon.jsx";
import { Star } from "./Glyphs.jsx";
import { btn, title, panel, FONT } from "./theme.js";

const SEA = "#243444";
const INK = "#10131a";

// A pixel pine, for dressing the green country.
const Pine = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-1" y="2" width="2" height="4" fill="#4a3524" />
    <rect x="-5" y="-2" width="10" height="4" fill="#3f5c30" />
    <rect x="-4" y="-6" width="8" height="4" fill="#4a6b39" />
    <rect x="-2" y="-9" width="4" height="3" fill="#557a42" />
  </g>
);

// A pixel watchtower, for the Iron country.
const Keep = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-4" y="-8" width="8" height="14" fill="#6e7686" />
    <rect x="-4" y="-8" width="3" height="14" fill="#848c9c" />
    <rect x="-5" y="-11" width="10" height="3" fill="#5a6272" />
    <rect x="-1" y="-2" width="2" height="4" fill={INK} />
  </g>
);

// A dead tree and a leaning stone, for the drowned isle.
const DeadTree = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-1" y="-9" width="2" height="13" fill="#5a473a" />
    <rect x="-5" y="-7" width="4" height="2" fill="#5a473a" />
    <rect x="1" y="-5" width="5" height="2" fill="#5a473a" />
    <rect x="3" y="-8" width="2" height="3" fill="#5a473a" />
  </g>
);
const Stone = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-3" y="-6" width="6" height="9" fill="#8a8478" />
    <rect x="-3" y="-6" width="2" height="9" fill="#a19a88" />
    <rect x="-1" y="-4" width="2" height="4" fill="#55504a" />
  </g>
);

export default function CampaignMap({ progress, profile, onStart, onBack, onReset }) {
  const rating = (id) => profile?.stars?.[id] || 0;
  const [selId, setSelId] = useState(() => currentLevel(progress).id);
  const sel = levelById(selId);
  const upTo = currentLevel(progress);

  // The map is taller than its window. On arrival, scroll the view to the
  // front line — wherever the next uncleared level waits.
  const mapRef = useRef(null);
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const svgH = el.clientWidth * (360 / 400);
    const yFrac = (upTo.pos[1] + 120) / 360;
    el.scrollTop = Math.max(0, yFrac * svgH - el.clientHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const clearedCount = LEVELS.filter((l) => progress.cleared[l.id]).length;

  const selUnlocked = sel ? isUnlocked(sel.id, progress) : false;
  const selCleared = sel ? !!progress.cleared[sel.id] : false;
  const selRealm = sel ? REALMS[sel.realm] : null;
  const selFaction = sel ? FACTIONS[sel.chapter.faction] : null;

  return (
    <div style={{
      minHeight: "100dvh", background: "#20242c", color: "#e8e0c8", fontFamily: FONT,
      padding: "14px 12px 24px", boxSizing: "border-box",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      {/* header */}
      <div style={{ width: "100%", maxWidth: 780, display: "flex", alignItems: "center", gap: 10 }}>
        <button style={{ ...btn, padding: "6px 12px", fontSize: 12 }} onClick={onBack}>◀ Menu</button>
        <div style={{ ...title(15), fontSize: 15, flex: 1, textAlign: "center" }}>THE CAMPAIGN</div>
        <div style={{ fontSize: 10, opacity: 0.6, minWidth: 78, textAlign: "right" }}>
          {clearedCount}/{LEVELS.length} cleared
        </div>
      </div>

      {/* ---- the continent ----
          Taller than the window and scrollable: the war marches NORTH up the
          map (Greenwood south, the Marches east, the Hollowfen above them
          across a strait), and the view opens on wherever the front line is. */}
      <div ref={mapRef} style={{ width: "100%", maxWidth: 780, maxHeight: "52dvh", overflowY: "auto", border: `3px solid ${INK}`, background: SEA }}>
      <svg viewBox="0 -120 400 360" style={{ width: "100%", display: "block", imageRendering: "pixelated" }}>
        {/* sea, with a few lazy swells */}
        {Array.from({ length: 22 }, (_, i) => (
          <rect key={i} x={(i * 53) % 380} y={-108 + ((i * 71) % 334)} width={16} height={2} fill="#2c4055" />
        ))}

        {/* the isthmus: the only land road from the Greenwood into the Marches */}
        <path d="M164,92 C184,86 202,100 216,110 C228,120 228,140 214,150 C200,160 182,154 172,142 C160,128 156,104 164,92 Z"
          fill="#3f4a44" transform="translate(0 4)" stroke={INK} strokeWidth="3" />
        <path d="M164,92 C184,86 202,100 216,110 C228,120 228,140 214,150 C200,160 182,154 172,142 C160,128 156,104 164,92 Z"
          fill="#65735c" stroke={INK} strokeWidth="3" />

        {CHAPTERS.map((ch) => {
          const open = isUnlocked(ch.levels[0].id, progress);
          return (
            <g key={ch.id} opacity={open ? 1 : 0.42}>
              {/* the coastline: a dark shore offset beneath the land itself */}
              <path d={ch.region} fill={open ? ch.colorDk : "#3c4450"} transform="translate(0 4)" stroke={INK} strokeWidth="3" />
              <path d={ch.region} fill={open ? ch.color : "#5c6470"} stroke={INK} strokeWidth="3" />
            </g>
          );
        })}

        {/* country dressing, kept clear of the waypoints and their labels */}
        <g opacity="0.9">
          <Pine x={74} y={110} /><Pine x={36} y={130} s={0.85} /><Pine x={120} y={100} s={0.9} />
          <Pine x={130} y={140} s={0.85} /><Pine x={92} y={182} s={0.8} /><Pine x={140} y={80} s={0.8} />
          <Pine x={66} y={74} s={0.85} /><Pine x={54} y={148} s={0.8} />
        </g>
        {isUnlocked("ir1", progress) && (
          <g opacity="0.9">
            <Keep x={266} y={122} s={0.9} /><Keep x={316} y={188} s={0.8} />
            <Keep x={360} y={116} s={0.85} /><Keep x={300} y={70} s={0.8} />
          </g>
        )}
        {isUnlocked("hl1", progress) && (
          <g opacity="0.9">
            <DeadTree x={282} y={-58} s={0.85} /><Stone x={348} y={-54} s={0.8} />
            <DeadTree x={262} y={-8} s={0.75} />
          </g>
        )}

        {/* the mountain wall between the two countries */}
        <g>
          {[[186, 104], [196, 118], [186, 132], [200, 138], [208, 124]].map(([x, y], i) => (
            <g key={i}>
              <path d={`M${x - 8},${y + 6} L${x},${y - 8} L${x + 8},${y + 6} Z`} fill="#4a5260" stroke={INK} strokeWidth="1.5" />
              <path d={`M${x - 3},${y - 2} L${x},${y - 8} L${x + 3},${y - 2} Z`} fill="#d8dce4" />
            </g>
          ))}
        </g>

        {/* the road between waypoints: walked road is solid, the rest is dashed */}
        {LEVELS.slice(1).map((lv, i) => {
          const prev = LEVELS[i];
          const walked = progress.cleared[prev.id];
          return (
            <line key={lv.id} x1={prev.pos[0]} y1={prev.pos[1]} x2={lv.pos[0]} y2={lv.pos[1]}
              stroke={walked ? "#e8d47a" : "#171b24"} strokeWidth={walked ? 3 : 2}
              strokeDasharray={walked ? "none" : "4 5"} strokeLinecap="round" opacity={walked ? 0.85 : 0.65} />
          );
        })}

        {/* the waypoints themselves */}
        {LEVELS.map((lv) => {
          const cleared = !!progress.cleared[lv.id];
          const open = isUnlocked(lv.id, progress);
          const here = lv.id === upTo.id && !cleared;
          const isSel = lv.id === selId;
          const [x, y] = lv.pos;
          const fill = cleared ? "#d8b34a" : open ? "#e8e0c8" : "#3c4250";
          const r = here ? 9 : 7;
          return (
            <g key={lv.id} onClick={() => setSelId(lv.id)} style={{ cursor: "pointer" }}>
              {here && (
                <circle cx={x} cy={y} r="14" fill="none" stroke="#e8d47a" strokeWidth="2" opacity="0.9">
                  <animate attributeName="r" values="11;16;11" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.15;0.9" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              {isSel && <rect x={x - r - 5} y={y - r - 5} width={(r + 5) * 2} height={(r + 5) * 2} fill="none" stroke="#e8d47a" strokeWidth="2" />}
              <rect x={x - r} y={y - r} width={r * 2} height={r * 2} fill={INK} />
              <rect x={x - r + 2} y={y - r + 2} width={r * 2 - 4} height={r * 2 - 4} fill={fill} />
              {/* a conquered waypoint flies your castle */}
              {cleared && (
                <g fill={INK}>
                  <rect x={x - 5} y={y - 1} width="10" height="6" />
                  <rect x={x - 5} y={y - 4} width="2.5" height="3" />
                  <rect x={x - 1.25} y={y - 4} width="2.5" height="3" />
                  <rect x={x + 2.5} y={y - 4} width="2.5" height="3" />
                  <rect x={x - 1} y={y + 1} width="2" height="4" fill={fill} />
                </g>
              )}
              {!open && <rect x={x - 2} y={y - 2} width="4" height="5" fill="#7c8494" />}
              {/* the chapter's last stand gets a boss banner */}
              {lv.index === lv.chapter.levels.length - 1 && (
                <rect x={x - 1} y={y - r - 9} width="2" height="8" fill={open ? "#e07a72" : "#4c5462"} />
              )}
              {/* the stars taken here, floating over the waypoint */}
              {rating(lv.id) > 0 && [0, 1, 2].map((i) => (
                <rect key={i} x={x - 7 + i * 5} y={y - r - 7} width="4" height="4"
                  fill={i < rating(lv.id) ? "#e8d47a" : "#3c4250"} stroke={INK} strokeWidth="1" />
              ))}
              {/* ink-outlined so a name reads over land, sea or mountain alike.
                  Crowded coasts use lv.short, and lv.labelAbove lifts a name
                  over its dot when the row below is spoken for. */}
              <text x={x} y={lv.labelAbove ? y - r - 12 : y + r + 12} textAnchor="middle" fontSize="8.5" fill={open ? "#f0e8d0" : "#98a0b0"}
                fontFamily={FONT} stroke={INK} strokeWidth="3" paintOrder="stroke" strokeLinejoin="round"
                style={{ pointerEvents: "none" }}>
                {lv.short || lv.name}
              </text>
            </g>
          );
        })}

        {/* country names, tucked into the coast */}
        {CHAPTERS.map((ch) => {
          const open = isUnlocked(ch.levels[0].id, progress);
          return (
            <text key={ch.id} x={ch.label[0]} y={ch.label[1]} textAnchor="middle"
              fontSize={ch.labelSize || 10} letterSpacing="2" fontFamily={FONT} fill={open ? "#d8b34a" : "#78808e"}
              stroke={INK} strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">
              {open ? `${ch.numeral}. ${ch.name.toUpperCase()}` : `${ch.numeral}. SEALED`}
            </text>
          );
        })}
      </svg>
      </div>

      {/* ---- the selected waypoint ---- */}
      {sel && (
        <div style={{ ...panel, width: "100%", maxWidth: 780, boxSizing: "border-box", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {/* a thumbnail of the actual road you'll be defending */}
          <svg viewBox="0 0 150 100" width="128" height="86" style={{ flexShrink: 0, border: `2px solid ${INK}`, imageRendering: "pixelated", filter: selUnlocked ? "none" : "grayscale(1) brightness(0.6)" }}>
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

          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.55 }}>
              CHAPTER {sel.chapter.numeral} · LEVEL {sel.index + 1} · {sel.window.count} WAVES
            </div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#e8d47a", margin: "3px 0 5px", display: "flex", alignItems: "center", gap: 8 }}>
              {sel.name}
              <span style={{ display: "flex", gap: 2 }}>
                {[1, 2, 3].map((i) => <Star key={i} size={13} lit={i <= rating(sel.id)} />)}
              </span>
              {selCleared && <span style={{ fontSize: 9, letterSpacing: 1, color: "#a8d88c" }}>CLEARED</span>}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.5, marginBottom: 8 }}>
              {selUnlocked ? sel.blurb : "The road this way is not yours yet. Take the level before it first."}
            </div>
            {selUnlocked && (
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 30, marginBottom: 8 }}>
                {selFaction.types.map((ty) => <EnemyIcon key={ty} type={ty} box={26} />)}
              </div>
            )}
            <button
              style={{
                ...btn, width: "100%", maxWidth: 320, textAlign: "center", padding: "13px 10px", fontSize: 13, letterSpacing: 1,
                ...(selUnlocked
                  ? { background: "#5a4f2c", boxShadow: "inset -2px -2px 0 #3a3420, inset 2px 2px 0 #8a7746", color: "#f0e4b0" }
                  : { opacity: 0.45, cursor: "not-allowed" }),
              }}
              disabled={!selUnlocked}
              onClick={() => onStart(sel)}>
              {selCleared ? `Ride Out Again — ${sel.name}` : `March on ${sel.name}`}
            </button>
          </div>
        </div>
      )}

      <button style={{ ...btn, fontSize: 10, padding: "6px 12px", opacity: 0.7 }}
        onClick={() => { if (confirm("Start the whole campaign over? Every cleared level is forgotten.")) onReset(); }}>
        Abandon campaign &amp; start over
      </button>
    </div>
  );
}
