// ============ CROWNGUARD — main component ============
// The thin React shell: it holds the mutable game state in a ref, runs the
// animation loop (update + draw each frame), mirrors a small snapshot into
// React state for the panels, handles mouse input, and renders the UI.

import { useRef, useEffect, useState, useCallback } from "react";
import { W, H, GRASS, CASTLE_HP, RALLY_RANGE } from "./data/constants.js";
import { TOWERS } from "./data/towers.js";
import { ENEMIES } from "./data/enemies.js";
import { WAVES } from "./data/waves.js";
import { getStats } from "./engine/towers.js";
import {
  towerNear, placeTower, upgradeTower, branchTower, ascendTower, sellTower,
  startWave, restartWave,
} from "./engine/actions.js";
import { updateGame } from "./engine/update.js";
import { draw } from "./render/draw.js";
import PixelIcon from "./ui/PixelIcon.jsx";
import EnemyIcon from "./ui/EnemyIcon.jsx";
import EnemyTooltip from "./ui/EnemyTooltip.jsx";

// Aggregate a wave's spawn list into { type, count } entries, keeping the
// order each enemy type first appears. Used by the next-wave preview.
function waveComposition(waveIndex) {
  const spec = WAVES[waveIndex];
  if (!spec) return [];
  const out = [];
  for (const [type, count] of spec) {
    const found = out.find((c) => c.type === type);
    if (found) found.count += count;
    else out.push({ type, count });
  }
  return out;
}

export default function Crownguard() {
  const canvasRef = useRef(null);
  const bufRef = useRef(null);
  const G = useRef(null);
  const [ui, setUi] = useState({ gold: 0, lives: 0, wave: 0, phase: "build", selected: null, buildMode: null, speed: 1, paused: false, result: null, canRestart: false, cdSec: null, zoom: 1 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverEnemy, setHoverEnemy] = useState(null);
  const [buildOpen, setBuildOpen] = useState(false);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  const initGame = useCallback(() => {
    // SANDBOX MODE: unlimited gold while the owner explores the tech trees.
    // Restore to 250 for the real economy.
    const START_GOLD = 999999;
    G.current = {
      gold: START_GOLD, lives: CASTLE_HP, wave: 0, phase: "build",
      towers: [], enemies: [], projectiles: [], effects: [],
      spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
      selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
      cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false,
    };
    setBuildOpen(false);
    setUi({ gold: START_GOLD, lives: CASTLE_HP, wave: 0, phase: "build", selected: null, buildMode: null, speed: 1, paused: false, result: null, canRestart: false, cdSec: null, zoom: 1 });
  }, []);

  // Mirror the build-drawer open state into the game so the update loop can
  // apply the tactical half-speed while the player is building.
  useEffect(() => {
    if (G.current) G.current.buildMenuOpen = buildOpen;
  }, [buildOpen]);

  // Only one side panel at a time: selecting a tower closes the build drawer.
  useEffect(() => {
    if (ui.selected) setBuildOpen(false);
  }, [ui.selected]);

  // ============ MAIN LOOP ============
  useEffect(() => {
    initGame();
    let raf, last = performance.now();

    const step = (now) => {
      raf = requestAnimationFrame(step);
      const g = G.current;
      if (!g) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      updateGame(g, dt);
      draw(g, canvasRef.current, bufRef);

      // mirror a snapshot of state into React so the panels update
      const u = uiRef.current;
      const sel = g.towers.find((t) => t.id === g.selectedId) || null;
      const selKey = sel ? `${sel.id}-${sel.level}-${sel.branch}-${sel.rank4}` : null;
      const canRestart = !!g.snapshot && (g.phase === "combat" || g.phase === "lost" || (g.phase === "build" && g.wave > 0));
      const cdSec = g.phase === "build" && g.buildUntil != null ? Math.max(0, Math.ceil(g.buildUntil - g.time)) : null;
      const camX = Math.round(g.cam.x), camY = Math.round(g.cam.y);
      if (u.gold !== Math.floor(g.gold) || u.lives !== g.lives || u.wave !== g.wave || u.phase !== g.phase || u.selKey !== selKey || u.buildMode !== g.buildMode || u.speed !== g.speed || u.paused !== g.paused || u.canRestart !== canRestart || u.cdSec !== cdSec || u.zoom !== g.cam.zoom || u.camX !== camX || u.camY !== camY) {
        setUi({
          gold: Math.floor(g.gold), lives: g.lives, wave: g.wave, phase: g.phase,
          selected: sel ? { id: sel.id, kind: sel.kind, level: sel.level, branch: sel.branch, rank4: sel.rank4, invested: sel.invested } : null,
          selKey, buildMode: g.buildMode, speed: g.speed, paused: g.paused, canRestart, cdSec, zoom: g.cam.zoom, camX, camY,
          result: g.phase === "won" ? "won" : g.phase === "lost" ? "lost" : null,
        });
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- input ----
  const dragRef = useRef({ down: false, panned: false, sx: 0, sy: 0, cx: 0, cy: 0 });

  const screenPos = (ev) => {
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    return [((ev.clientX - rect.left) / rect.width) * W, ((ev.clientY - rect.top) / rect.height) * H];
  };
  const worldPos = (ev) => {
    const g = G.current;
    const [px, py] = screenPos(ev);
    if (!g) return [px, py];
    return [g.cam.x + px / g.cam.zoom, g.cam.y + py / g.cam.zoom];
  };
  const clampCam = (g) => {
    const z = g.cam.zoom;
    g.cam.x = Math.min(Math.max(0, g.cam.x), W - W / z);
    g.cam.y = Math.min(Math.max(0, g.cam.y), H - H / z);
  };
  const setZoom = (nz) => {
    const g = G.current;
    if (!g) return;
    const z0 = g.cam.zoom;
    const z = Math.min(2.5, Math.max(1, nz));
    const wx = g.cam.x + (W / 2) / z0, wy = g.cam.y + (H / 2) / z0;
    g.cam.zoom = z;
    g.cam.x = wx - (W / 2) / z;
    g.cam.y = wy - (H / 2) / z;
    clampCam(g);
  };
  const handleTap = (x, y) => {
    const g = G.current;
    if (!g || g.phase === "won" || g.phase === "lost" || g.paused) return;
    if (g.buildMode) {
      placeTower(g, g.buildMode, x, y);
      // placeTower clears buildMode on success — close the drawer with it
      if (!g.buildMode) setBuildOpen(false);
      return;
    }
    // tapping the field outside a menu dismisses the build drawer
    setBuildOpen(false);
    const t = towerNear(g, x, y);
    if (t) { g.selectedId = t.id; return; }
    // selected garrison: click inside its circle to move the rally flag
    const selT = g.towers.find((tt) => tt.id === g.selectedId);
    if (selT && selT.kind === "knight") {
      if (Math.hypot(x - selT.x, y - selT.y) <= RALLY_RANGE) {
        selT.rally = { x, y };
        g.effects.push({ type: "levelup", x, y, ttl: 500 });
        return;
      }
    }
    g.selectedId = null;
  };
  const onCanvasDown = (ev) => {
    const g = G.current;
    if (!g) return;
    const [px, py] = screenPos(ev);
    dragRef.current = { down: true, panned: false, sx: px, sy: py, cx: g.cam.x, cy: g.cam.y };
  };
  const onCanvasMove = (ev) => {
    const g = G.current;
    if (!g) return;
    g.hover = worldPos(ev);
    const d = dragRef.current;
    if (d.down && g.cam.zoom > 1) {
      const [px, py] = screenPos(ev);
      if (d.panned || Math.hypot(px - d.sx, py - d.sy) > 6) {
        d.panned = true;
        g.cam.x = d.cx - (px - d.sx) / g.cam.zoom;
        g.cam.y = d.cy - (py - d.sy) / g.cam.zoom;
        clampCam(g);
      }
    }
  };
  const onCanvasUp = (ev) => {
    const d = dragRef.current;
    if (d.down && !d.panned) {
      const [x, y] = worldPos(ev);
      handleTap(x, y);
    }
    d.down = false;
  };

  const sel = ui.selected;
  const selDef = sel ? TOWERS[sel.kind] : null;

  const FONT = "Verdana, Geneva, sans-serif";
  const btn = {
    fontFamily: FONT, cursor: "pointer", border: "2px solid #10131a",
    background: "#3a4150", color: "#e8e0c8", borderRadius: 0,
    padding: "8px 10px", fontSize: 12, textAlign: "left",
    boxShadow: "inset -2px -2px 0 #262b36, inset 2px 2px 0 #545c6e",
  };
  const panel = {
    background: "#2c313c", border: "3px solid #10131a", borderRadius: 0, padding: 10,
    boxShadow: "inset 0 0 0 2px #454c5a",
  };
  const disabled = { opacity: 0.45, cursor: "not-allowed" };
  const statLabel = { fontSize: 9, letterSpacing: 1, opacity: 0.6, marginRight: 3 };
  const overlayPanel = {
    background: "rgba(38,42,52,0.97)", border: "3px solid #10131a", boxSizing: "border-box",
  };

  // The build drawer covers the board's right side, so it slides out of the way
  // while a tower is actively being placed (buildMode set) or a tower is selected
  // (its pop-up takes over), keeping the board clear and one panel showing at a time.
  const drawerVisible = buildOpen && !ui.buildMode && !sel;

  return (
    <div style={{ minHeight: "100vh", background: "#20242c", color: "#e8e0c8", fontFamily: FONT, padding: 12, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <button aria-label="Open settings menu" onClick={() => setMenuOpen(true)}
            style={{ ...btn, fontSize: 16, padding: "4px 12px", lineHeight: 1 }}>☰</button>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 4, color: "#d8b34a", textShadow: "2px 2px 0 #10131a" }}>CROWNGUARD</h1>
          <span style={{ fontSize: 11, opacity: 0.7 }}>Hold the road. The castle must not fall.</span>
        </div>

        {menuOpen && (
          <div onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(12,12,16,0.6)", zIndex: 40 }} />
        )}
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 300, maxWidth: "85vw", zIndex: 50,
          background: "#2c313c", borderRight: "3px solid #10131a", padding: 16, boxSizing: "border-box",
          overflowY: "auto", transform: menuOpen ? "translateX(0)" : "translateX(-105%)",
          transition: "transform 0.25s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, letterSpacing: 3, color: "#d8b34a" }}>SETTINGS</div>
            <button aria-label="Close settings menu" onClick={() => setMenuOpen(false)} style={{ ...btn, padding: "2px 10px", fontSize: 13 }}>✕</button>
          </div>

          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.7, marginBottom: 6 }}>GAME SPEED</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[1, 2, 4].map((s) => (
              <button key={s}
                style={{ ...btn, flex: 1, textAlign: "center", ...(ui.speed === s ? { background: "#5a4f2c", boxShadow: "inset 2px 2px 0 #3a3420, inset -2px -2px 0 #7a6a3c" } : {}) }}
                onClick={() => { if (G.current) G.current.speed = s; }}>
                {s}x
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            <button style={{ ...btn, textAlign: "center" }}
              onClick={() => { if (G.current) G.current.paused = !G.current.paused; }}>
              {ui.paused ? "Resume" : "Pause"}
            </button>
            <button style={{ ...btn, textAlign: "center", ...(ui.canRestart ? {} : disabled) }} disabled={!ui.canRestart}
              onClick={() => { restartWave(G.current); setMenuOpen(false); }}>
              Restart Wave
            </button>
            <button style={{ ...btn, textAlign: "center" }}
              onClick={() => { initGame(); setMenuOpen(false); }}>
              New Campaign
            </button>
          </div>

          <div style={{ borderTop: "2px solid #10131a", paddingTop: 12, fontSize: 11, lineHeight: 1.65, opacity: 0.9 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.8, marginBottom: 6 }}>FIELD GUIDE</div>
            <b>Knights</b> march out and each pin one enemy in melee — the rest push past. Fallen knights respawn in 7s. Knights muster just south of their hall; select the hall and click inside its circle to move the rally flag.<br /><br />
            <b>Warden Priests</b> slow every enemy in their aura. Their paths: mend knights, deepen the slow, or raise a Battle Standard so knights strike 50% harder.<br /><br />
            <b>Catapults</b> lob boulders in a high arc — heavy physical splash at long range, but they cannot strike foes inside their inner red circle. Rocks land where the enemy was <i>headed</i>, so fast runners can slip the blast.<br /><br />
            <b>Ironclads</b> (shield badge) shrug off half of all physical damage — magic ignores armor.<br /><br />
            <b>Dire wolves</b> are fast; blocking, slows, and stuns tame them.<br /><br />
            <b>Trolls</b> regenerate and hit knights hard — burst them down.<br /><br />
            The <b>dragon</b> flies — knights cannot block it.<br /><br />
            <b>The castle has 20 HP</b>, carried between waves. Goblins &amp; wolves cost 1, orcs &amp; ironclads 2, trolls 3, the dragon 5. It cracks, smokes, and burns as it weakens.<br /><br />
            Towers reach Lv 3, then <b>evolve down one of several paths</b> — and some evolutions can <b>ascend once more</b> into a final form. The archer line leads the way.<br /><br />
            After a wave, the next <b>auto-starts in 30s</b>. Sound the horn early for bonus gold.<br /><br />
            <b>Building or selecting a tower</b> slows the battle to half-speed so you have time to think.<br /><br />
            <b>Zoom</b> with the -/+ buttons; drag the map to pan while zoomed.
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {/* stat bar */}
          <div style={{ display: "flex", gap: 14, padding: "6px 10px", background: "#2c313c", border: "3px solid #10131a", borderBottom: "none", fontSize: 13, flexWrap: "wrap", alignItems: "center", boxShadow: "inset 0 0 0 2px #454c5a" }}>
            <span><span style={statLabel}>GOLD</span><b style={{ color: "#e8d47a" }}>{ui.gold}</b></span>
            <span><span style={statLabel}>CASTLE</span><b style={{ color: ui.lives <= 5 ? "#e07a72" : ui.lives <= 10 ? "#d8b34a" : "#e8e0c8" }}>{ui.lives}</b><span style={{ opacity: 0.6 }}>/{CASTLE_HP}</span></span>
            <span><span style={statLabel}>WAVE</span><b>{ui.wave}</b><span style={{ opacity: 0.6 }}>/{WAVES.length}</span></span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button title="Zoom out" style={{ ...btn, padding: "2px 9px", fontSize: 12 }} onClick={() => setZoom((G.current?.cam.zoom || 1) / 1.3)}>-</button>
              <button title="Zoom in" style={{ ...btn, padding: "2px 9px", fontSize: 12 }} onClick={() => setZoom((G.current?.cam.zoom || 1) * 1.3)}>+</button>
              {ui.zoom > 1 && <button title="Reset view" style={{ ...btn, padding: "2px 9px", fontSize: 11 }} onClick={() => setZoom(1)}>reset</button>}
              <button title={ui.paused ? "Resume" : "Pause"} style={{ ...btn, padding: "2px 10px", fontSize: 11, ...(ui.paused ? { background: "#5a4f2c" } : {}) }}
                onClick={() => { if (G.current) G.current.paused = !G.current.paused; }}>
                {ui.paused ? "resume" : "pause"}
              </button>
              <button style={{ ...btn, padding: "2px 10px", fontSize: 11, ...(ui.speed > 1 ? { background: "#5a4f2c" } : {}) }}
                onClick={() => { if (G.current) G.current.speed = G.current.speed === 1 ? 2 : G.current.speed === 2 ? 4 : 1; }}>
                {ui.speed}x
              </button>
            </span>
          </div>

          {/* board + in-window overlays */}
          <div style={{ position: "relative", overflow: "hidden" }}>
            <canvas
              ref={canvasRef} width={W} height={H}
              onMouseDown={onCanvasDown} onMouseMove={onCanvasMove} onMouseUp={onCanvasUp}
              onMouseLeave={() => { if (G.current) G.current.hover = null; dragRef.current.down = false; }}
              style={{ width: "100%", display: "block", border: "3px solid #10131a", background: GRASS, cursor: ui.buildMode ? "copy" : ui.zoom > 1 ? "grab" : "pointer", touchAction: "none", imageRendering: "pixelated" }}
            />

            {/* open-build-menu tab (right edge) */}
            {ui.result == null && !buildOpen && (
              <button aria-label="Open build menu"
                onClick={() => { setBuildOpen(true); if (G.current) G.current.selectedId = null; }}
                style={{ ...btn, position: "absolute", top: 10, right: 10, zIndex: 20, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontSize: 12 }}>
                <PixelIcon kind="archer" size={18} /> Build
              </button>
            )}

            {/* placement hint (shown while a tower is chosen and the drawer is tucked away) */}
            {ui.buildMode && (
              <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 22, ...overlayPanel, borderWidth: 2, padding: "6px 10px", fontSize: 11, color: "#a8d88c", display: "flex", alignItems: "center", gap: 10, maxWidth: "92%" }}>
                <span>Placing <b style={{ color: "#e8d47a" }}>{TOWERS[ui.buildMode].name}</b> — click the grass.{ui.buildMode === "knight" ? " Knights muster south of the hall." : ""}</span>
                <button aria-label="Cancel placement" onClick={() => { if (G.current) G.current.buildMode = null; }} style={{ ...btn, padding: "1px 8px", fontSize: 11 }}>✕</button>
              </div>
            )}

            {/* build drawer (right side) */}
            <div style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: "72%", maxWidth: 264, zIndex: 30,
              ...overlayPanel, border: "none", borderLeft: "3px solid #10131a",
              padding: 12, overflowY: "auto",
              transform: drawerVisible ? "translateX(0)" : "translateX(103%)", transition: "transform 0.22s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.75 }}>RAISE DEFENSES</div>
                <button aria-label="Close build menu" onClick={() => setBuildOpen(false)} style={{ ...btn, padding: "2px 9px", fontSize: 13 }}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(TOWERS).map(([key, def]) => {
                  const can = ui.gold >= def.cost;
                  const active = ui.buildMode === key;
                  return (
                    <button key={key}
                      style={{ ...btn, display: "flex", gap: 8, alignItems: "center", ...(active ? { background: "#5a4f2c" } : {}), ...(!can ? disabled : {}) }}
                      onClick={() => { const gg = G.current; if (!gg) return; gg.buildMode = active ? null : key; gg.selectedId = null; }}
                      disabled={!can}>
                      <PixelIcon kind={key} />
                      <span style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: 12 }}>{def.name} <span style={{ color: "#e8d47a" }}>{def.cost}g</span></div>
                        <div style={{ fontSize: 10, opacity: 0.75 }}>{def.blurb}</div>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, marginTop: 10, opacity: 0.6 }}>Time runs at half-speed while you build or manage a tower.</div>
            </div>

            {/* selected tower pop-up, anchored beside the tower itself:
                above & to the right by default, flipping left near the right
                edge and below near the top so it always stays on the board. */}
            {sel && selDef && (() => {
              const g = G.current;
              const t = g?.towers.find((x) => x.id === sel.id);
              if (!t) return null;
              const sx = ((t.x - g.cam.x) * g.cam.zoom) / W;
              const sy = ((t.y - g.cam.y) * g.cam.zoom) / H;
              const flipX = sx > 0.55;
              const below = sy < 0.5;
              const anchor = {
                ...(flipX
                  ? { right: `${Math.max(1, (1 - sx) * 100 + 2).toFixed(1)}%` }
                  : { left: `${Math.max(1, sx * 100 + 2).toFixed(1)}%` }),
                ...(below
                  ? { top: `${(sy * 100 + 4).toFixed(1)}%`, maxHeight: `${Math.max(30, (1 - sy) * 100 - 8).toFixed(1)}%` }
                  : { bottom: `${((1 - sy) * 100 + 4).toFixed(1)}%`, maxHeight: `${Math.max(30, sy * 100 - 8).toFixed(1)}%` }),
              };
              return (
              <div style={{
                position: "absolute", width: "72%", maxWidth: 264, zIndex: 25,
                ...overlayPanel, boxShadow: "inset 0 0 0 2px #7a6a3c",
                padding: 10, overflowY: "auto", ...anchor,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PixelIcon kind={sel.kind} branch={sel.branch} rank4={sel.rank4} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", color: "#e8d47a", fontSize: 13 }}>
                      {sel.rank4 ? selDef.branches[sel.branch].rank4[sel.rank4].name
                        : sel.branch ? selDef.branches[sel.branch].name
                        : `${selDef.name} - Lv ${sel.level}`}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.75 }}>
                      {(() => {
                        const t = G.current?.towers.find((x) => x.id === sel.id);
                        if (!t) return "";
                        const st = getStats(t);
                        if (t.kind === "knight") return `${st.count || 1} knight${(st.count || 1) > 1 ? "s" : ""} · ${st.dmg} dmg · ${(st.rate / 1000).toFixed(2)}s · ${st.hp} hp${st.magic ? " · magic" : ""}${st.heal ? " · self-heal" : ""}`;
                        if (t.kind === "support") return `${Math.round(st.slow * 100)}% slow aura · ${st.range} range${st.heal ? ` · mends knights ${st.heal}/s` : ""}${st.buff ? ` · knights +${Math.round(st.buff * 100)}% dmg` : ""}`;
                        return `${st.dmg} dmg${st.shots ? ` ×${st.shots} stones` : ""} · ${(st.rate / 1000).toFixed(2)}s · ${st.range}rng${st.minRange ? ` · blind under ${st.minRange}` : ""}${st.splash ? ` · ${st.splash} splash (full dmg at core)` : ""}${st.pierce ? " · pierces armor" : ""}${st.dtype === "magic" ? " · magic" : ""}`;
                      })()}
                    </div>
                  </div>
                  <button aria-label="Deselect tower" onClick={() => { if (G.current) G.current.selectedId = null; }} style={{ ...btn, padding: "1px 8px", fontSize: 12 }}>✕</button>
                </div>

                {sel.kind === "knight" && (
                  <div style={{ fontSize: 10, marginTop: 6, color: "#a8d88c" }}>
                    Click anywhere inside the circle to move the rally flag.
                  </div>
                )}

                {!sel.branch && sel.level < 3 && (() => {
                  const nxt = selDef.levels[sel.level];
                  const can = ui.gold >= nxt.cost;
                  return (
                    <button style={{ ...btn, width: "100%", marginTop: 8, ...(!can ? disabled : {}) }} disabled={!can}
                      onClick={() => { const t = G.current?.towers.find((x) => x.id === sel.id); if (t) upgradeTower(G.current, t); }}>
                      {nxt.label} — <span style={{ color: "#e8d47a" }}>{nxt.cost}g</span>
                      <div style={{ fontSize: 10, opacity: 0.75 }}>
                        {nxt.slow != null
                          ? `${Math.round(nxt.slow * 100)}% slow · ${nxt.range} range`
                          : `${nxt.count ? `${nxt.count} knights · ` : ""}${nxt.dmg} dmg · ${(nxt.rate / 1000).toFixed(2)}s${nxt.hp ? ` · ${nxt.hp} hp` : ` · ${nxt.range} range`}`}
                      </div>
                    </button>
                  );
                })()}

                {!sel.branch && sel.level === 3 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: "#e8d47a", marginBottom: 6 }}>CHOOSE A PATH — PERMANENT</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.entries(selDef.branches).map(([bk, br]) => {
                        const can = ui.gold >= br.cost;
                        return (
                          <button key={bk} style={{ ...btn, display: "flex", gap: 8, alignItems: "flex-start", ...(!can ? disabled : {}) }} disabled={!can}
                            onClick={() => { const t = G.current?.towers.find((x) => x.id === sel.id); if (t) branchTower(G.current, t, bk); }}>
                            <PixelIcon kind={sel.kind} branch={bk} size={26} />
                            <span>
                              <div style={{ fontWeight: "bold", fontSize: 12 }}>{br.name} — <span style={{ color: "#e8d47a" }}>{br.cost}g</span></div>
                              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{br.desc}</div>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sel.branch && !sel.rank4 && selDef.branches[sel.branch].rank4 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: "#e8d47a", marginBottom: 6 }}>FINAL ASCENSION — PERMANENT</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.entries(selDef.branches[sel.branch].rank4).map(([rk, r4]) => {
                        const can = ui.gold >= r4.cost;
                        return (
                          <button key={rk} style={{ ...btn, display: "flex", gap: 8, alignItems: "flex-start", ...(!can ? disabled : {}) }} disabled={!can}
                            onClick={() => { const t = G.current?.towers.find((x) => x.id === sel.id); if (t) ascendTower(G.current, t, rk); }}>
                            <PixelIcon kind={sel.kind} branch={sel.branch} rank4={rk} size={26} />
                            <span>
                              <div style={{ fontWeight: "bold", fontSize: 12 }}>{r4.name} — <span style={{ color: "#e8d47a" }}>{r4.cost}g</span></div>
                              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{r4.desc}</div>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button style={{ ...btn, width: "100%", marginTop: 8, textAlign: "center", background: "#4a3228" }}
                  onClick={() => { const t = G.current?.towers.find((x) => x.id === sel.id); if (t) sellTower(G.current, t); }}>
                  Sell for {Math.floor(sel.invested * 0.7)}g
                </button>
              </div>
              );
            })()}

            {(ui.result === "won" || ui.result === "lost") && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(12,12,16,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", zIndex: 45 }}>
                <div style={{ fontSize: 20, letterSpacing: 3, color: ui.result === "won" ? "#e8d47a" : "#e07a72", textShadow: "2px 2px 0 #10131a" }}>
                  {ui.result === "won" ? "THE REALM STANDS" : "THE CASTLE HAS FALLEN"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, maxWidth: 340 }}>
                  {ui.result === "won"
                    ? "The dragon is slain and the road is quiet. A victory earned — not bought."
                    : `You fell on wave ${ui.wave}. Retry the wave with your gold and towers restored, or start fresh.`}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {ui.result === "lost" && ui.canRestart && (
                    <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center", background: "#5a4f2c" }} onClick={() => restartWave(G.current)}>Retry Wave {ui.wave}</button>
                  )}
                  <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center" }} onClick={initGame}>New Campaign</button>
                </div>
              </div>
            )}
          </div>

          {/* wave controls + next-wave preview */}
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...btn, flex: 1, fontSize: 13, textAlign: "center", padding: "12px 8px", ...(ui.phase === "build" && ui.wave < WAVES.length ? { background: "#5a4f2c" } : {}), ...(ui.phase !== "build" ? disabled : {}) }}
                onClick={() => startWave(G.current)} disabled={ui.phase !== "build"}>
                {ui.phase === "combat" ? `Wave ${ui.wave} in progress...`
                  : ui.wave >= WAVES.length ? "Campaign complete"
                  : ui.cdSec != null ? (<>Start Wave {ui.wave + 1} <span style={{ color: "#e8d47a" }}>+{Math.min(45, Math.ceil(ui.cdSec * 1.5))}g</span><div style={{ fontSize: 10, opacity: 0.75 }}>auto-starts in {ui.cdSec}s</div></>)
                  : `Start Wave ${ui.wave + 1}`}
              </button>
              <button
                title="Restart the current/last wave with gold, castle HP, and towers restored to how they were when it began"
                style={{ ...btn, fontSize: 11, textAlign: "center", ...(ui.canRestart ? {} : disabled) }}
                onClick={() => restartWave(G.current)} disabled={!ui.canRestart}>
                Restart<br />Wave
              </button>
            </div>

            {ui.phase === "build" && ui.wave < WAVES.length && (
              <div style={panel}>
                <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.7, marginBottom: 8 }}>INCOMING — WAVE {ui.wave + 1}</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
                  {waveComposition(ui.wave).map(({ type, count }) => (
                    <div key={type}
                      onMouseEnter={() => setHoverEnemy(type)}
                      onMouseLeave={() => setHoverEnemy((cur) => (cur === type ? null : cur))}
                      onClick={() => setHoverEnemy((cur) => (cur === type ? null : type))}
                      style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
                      {hoverEnemy === type && <EnemyTooltip type={type} />}
                      <EnemyIcon type={type} box={ENEMIES[type].boss ? 42 : 28} />
                      <span style={{ fontSize: 11, color: ENEMIES[type].boss ? "#e07a72" : "#e8e0c8" }}>
                        <span style={{ opacity: 0.6 }}>×</span>{count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
