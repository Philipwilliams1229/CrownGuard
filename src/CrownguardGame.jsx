// ============ CROWNGUARD — main component ============
// The thin React shell: it holds the mutable game state in a ref, runs the
// animation loop (update + draw each frame), mirrors a small snapshot into
// React state for the panels, handles mouse input, and renders the UI.

import { useRef, useEffect, useState, useCallback } from "react";
import { W, H, RES, CASTLE_HP, RALLY_RANGE } from "./data/constants.js";
import { REALMS, REALM, selectRealm } from "./data/maps.js";
import { sfx } from "./audio/sfx.js";
import { FACTIONS, FACTION, selectFaction } from "./data/factions.js";
import { TOWERS } from "./data/towers.js";
import { ENEMIES } from "./data/enemies.js";
import { scriptedWaves, waveSpec, setWaveWindow } from "./data/waves.js";
import { CHAPTERS, loadProgress, markCleared, resetProgress, currentLevel, nextLevel, levelById } from "./data/campaign.js";
import { loadProfile, bankLevel, bankFreeRun } from "./data/profile.js";
import { getStats, aimModes, forcedAim } from "./engine/towers.js";
import {
  towerNear, placeTower, upgradeTower, branchTower, ascendTower, sellTower,
  startWave, restartWave, masterPlan, masterPlans, placeMasterTower, completionCost, completeTower, MASTER_MIN,
} from "./engine/actions.js";
import { updateGame } from "./engine/update.js";
import { draw } from "./render/draw.js";
import PixelIcon from "./ui/PixelIcon.jsx";
import TowerPortrait from "./ui/TowerPortrait.jsx";
import EnemyIcon from "./ui/EnemyIcon.jsx";
import EnemyTooltip from "./ui/EnemyTooltip.jsx";
import HomeScreen from "./ui/HomeScreen.jsx";
import CampaignMap from "./ui/CampaignMap.jsx";
import WarCouncil from "./ui/WarCouncil.jsx";
import FieldGuide, { describe } from "./ui/FieldGuide.jsx";
import { BookIcon, PauseIcon, FlagIcon, Star } from "./ui/Glyphs.jsx";
import { FONT, btn, panel, disabled, overlayPanel, title } from "./ui/theme.js";

// Aggregate a wave's spawn list into { type, count } entries, keeping the
// order each enemy type first appears. Used by the next-wave preview.
function waveComposition(waveNum) {
  if (waveNum < 1) return [];
  const spec = waveSpec(waveNum);
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
  const [ui, setUi] = useState({ gold: 0, lives: 0, wave: 0, phase: "build", selected: null, buildMode: null, rallyFor: null, speed: 1, paused: false, result: null, canRestart: false, cdSec: null, zoom: 1, rush: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [hoverEnemy, setHoverEnemy] = useState(null);
  const [buildOpen, setBuildOpen] = useState(false);
  // the incoming-wave chip folds down to a small arrow when the board needs the room
  const [infoOpen, setInfoOpen] = useState(false);
  const [realmId, setRealmId] = useState(REALM.id);
  const [factionId, setFactionId] = useState(FACTION.id);
  const [realmOpen, setRealmOpen] = useState(false);
  // where backing out of realm select should land you
  const [realmReturn, setRealmReturn] = useState("home");
  const [sndMuted, setSndMuted] = useState(sfx.muted);
  // "home" = title screen, "map" = the campaign continent, "game" = battlefield
  const [screen, setScreen] = useState("home");
  // "campaign" = one level of the war, "free" = pick-a-realm endless run
  const [mode, setMode] = useState("free");
  const [levelId, setLevelId] = useState(null);
  const [progress, setProgress] = useState(loadProgress);
  const [profile, setProfile] = useState(loadProfile);
  // what the level just ended awarded: { rating, newStars, xp }
  const [award, setAward] = useState(null);
  // which master-menu final the player is reading about: {kind, branch, rank4, name, cost, desc, stats}
  const [masterInfo, setMasterInfo] = useState(null);
  const level = levelId ? levelById(levelId) : null;
  const uiRef = useRef(ui);
  uiRef.current = ui;

  // ---- the shape of the screen ----
  // Wide (a tablet on its side, a desktop): the board fills the left, a
  // column of controls stands at the right. Narrow: panels slide over the
  // board instead. The board itself is always sized to fit its cell at 3:2.
  const [wide, setWide] = useState(() => typeof window === "undefined" || window.innerWidth >= 900);
  const [portrait, setPortrait] = useState(false);
  const boardCellRef = useRef(null);
  const [boardCss, setBoardCss] = useState({ w: 720, h: 480 });
  useEffect(() => {
    const onResize = () => {
      setWide(window.innerWidth >= 900);
      // only a touch device is asked to turn; a narrow desktop window is just narrow
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      setPortrait(coarse && window.innerHeight > window.innerWidth);
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("orientationchange", onResize); };
  }, []);
  useEffect(() => {
    const el = boardCellRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(200, Math.min(r.width, r.height * 1.5));
      setBoardCss({ w: Math.floor(w), h: Math.floor(w / 1.5) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, wide]);

  const initGame = useCallback((startGold = 250, freeplay = true) => {
    // dev-server playtest knob: /?gold=5000 pads the war chest. Stripped from
    // production builds, so the shipped game can't be talked into it.
    const devGold = import.meta.env.DEV ? Math.max(0, Number(new URLSearchParams(window.location.search).get("gold")) || 0) : 0;
    const START_GOLD = startGold + devGold;
    G.current = {
      // tallies for the profile — banked when the level ends
      run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 },
      gold: START_GOLD, lives: CASTLE_HP, wave: 0, phase: "build",
      towers: [], enemies: [], projectiles: [], effects: [],
      spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
      selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
      cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false,
      // Master Builds: free play and the endless march only, and only once
      // the coffers have seen real money — masterSeen keeps it from blinking
      freeplay, masterBuild: false, masterSeen: false, masterPick: null,
    };
    setBuildOpen(false);
    setUi({ gold: START_GOLD, lives: CASTLE_HP, wave: 0, phase: "build", selected: null, buildMode: null, speed: 1, paused: false, result: null, canRestart: false, cdSec: null, zoom: 1, rush: false });
  }, []);

  // Swap the battlefield: rebuild road + scenery for the realm, then start a
  // fresh Free Play run on it — full fifteen waves, then the Endless March.
  const chooseRealm = (id) => {
    selectRealm(id);
    selectFaction(factionId);
    setWaveWindow(null);
    setRealmId(id);
    setMode("free");
    setLevelId(null);
    // a realm may open its gates with a heavier purse — the Proving Field does
    initGame(REALMS[id]?.startGold ?? 250);
    setRealmOpen(false);
    setScreen("game");
  };

  // Ride out on one campaign level: its map, its army, its slice of the wave
  // script, and the war chest it starts you with.
  const startLevel = (lv) => {
    selectRealm(lv.realm);
    selectFaction(lv.chapter.faction);
    setWaveWindow(lv.window);
    setRealmId(lv.realm);
    setFactionId(lv.chapter.faction);
    setMode("campaign");
    setLevelId(lv.id);
    setAward(null);
    initGame(lv.gold, false);
    setRealmOpen(false);
    setMenuOpen(false);
    setScreen("game");
  };

  const openMap = () => {
    if (G.current) G.current.paused = false;
    setMenuOpen(false);
    setRealmOpen(false);
    setProgress(loadProgress());
    setScreen("map");
  };

  // The side menu IS the pause screen: opening it halts the battle, and every
  // way out of it (Resume, ✕, tapping the board) starts things moving again.
  const openMenu = () => {
    if (G.current) G.current.paused = true;
    setMenuOpen(true);
  };
  const closeMenu = () => {
    if (G.current) G.current.paused = false;
    setMenuOpen(false);
  };
  // Reading the guide holds the battle too — but if the pause menu is behind it,
  // that menu stays in charge of un-pausing.
  const openGuide = () => {
    if (G.current) G.current.paused = true;
    setGuideOpen(true);
  };
  const closeGuide = () => {
    if (G.current && !menuOpen) G.current.paused = false;
    setGuideOpen(false);
  };
  const goHome = () => {
    if (G.current) G.current.paused = false;
    setMenuOpen(false);
    setRealmOpen(false);
    setScreen("home");
  };
  // Open realm select, remembering whether cancelling means "back to the
  // title screen" or "back to the battle already in progress".
  const openRealmSelect = (from) => { setRealmReturn(from); setRealmOpen(true); };
  const closeRealmSelect = () => (realmReturn === "home" ? goHome() : setRealmOpen(false));

  // Mirror the build-drawer open state into the game so the update loop can
  // apply the tactical half-speed while the player is building.
  useEffect(() => {
    if (G.current) G.current.buildMenuOpen = buildOpen;
  }, [buildOpen]);

  // Only one side panel at a time: selecting a tower closes the build drawer.
  useEffect(() => {
    if (ui.selected) setBuildOpen(false);
  }, [ui.selected]);

  // The moment a campaign level ends, bank it: all-time tallies either way,
  // and on a win the stars, the XP and the next stretch of road. g.run is
  // zeroed afterwards so retrying a lost wave can't count its kills twice.
  useEffect(() => {
    if (!ui.result) return;
    const g = G.current;
    // a Free Play run has no level to rate, but its tallies still count
    if (mode !== "campaign" || !levelId) {
      setProfile({ ...bankFreeRun(profile, { waves: Math.max(0, ui.wave - (ui.result === "won" ? 0 : 1)), run: g?.run }) });
      if (g) g.run = { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 };
      return;
    }
    const lv = levelById(levelId);
    if (!lv) return;
    const won = ui.result === "won";
    // a fall AFTER the level was already won is the Endless March ending,
    // not the level being lost — bank the extra waves like a free run's tail
    if (!won && g?.victory) {
      setProfile({ ...bankFreeRun(profile, { waves: Math.max(0, ui.wave - 1 - lv.window.count), run: g.run }) });
      g.run = { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 };
      return;
    }
    setAward(bankLevel(profile, lv, {
      livesLeft: ui.lives, maxLives: CASTLE_HP,
      waves: won ? lv.window.count : Math.max(0, ui.wave - 1),
      run: g?.run, won,
    }));
    if (g) g.run = { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 };
    setProfile(loadProfile());
    if (won) setProgress(markCleared(levelId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.result, mode, levelId]);

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
      // a garrison sold mid-move takes its rally prompt with it
      if (g.rallyFor != null && !g.towers.some((t) => t.id === g.rallyFor)) g.rallyFor = null;
      draw(g, canvasRef.current, bufRef);

      // mirror a snapshot of state into React so the panels update
      const u = uiRef.current;
      const sel = g.towers.find((t) => t.id === g.selectedId) || null;
      const selKey = sel ? `${sel.id}-${sel.level}-${sel.branch}-${sel.rank4}-${sel.aim}-${sel.kills || 0}` : null;
      const canRestart = !!g.snapshot && (g.phase === "combat" || g.phase === "lost" || (g.phase === "build" && g.wave > 0));
      const cdSec = g.phase === "build" && g.buildUntil != null ? Math.max(0, Math.ceil(g.buildUntil - g.time)) : null;
      const camX = Math.round(g.cam.x), camY = Math.round(g.cam.y);
      const rallyFor = g.rallyFor ?? null;
      // Master Builds surfaces once the coffers could cover a full build, and
      // stays surfaced for the rest of the run so it doesn't blink in and out
      if ((g.freeplay || g.victory) && g.gold >= MASTER_MIN) g.masterSeen = true;
      const masterShow = (g.freeplay || g.victory) && g.masterSeen;
      const pickKey = g.masterPick ? `${g.masterPick.kind}:${g.masterPick.branch}${g.masterPick.rank4 || ""}` : null;
      if (u.masterShow !== masterShow || u.masterOn !== !!g.masterBuild || u.masterPick !== pickKey || u.rallyFor !== rallyFor || u.gold !== Math.floor(g.gold) || u.lives !== g.lives || u.wave !== g.wave || u.phase !== g.phase || u.selKey !== selKey || u.buildMode !== g.buildMode || u.speed !== g.speed || u.paused !== g.paused || u.canRestart !== canRestart || u.cdSec !== cdSec || u.zoom !== g.cam.zoom || u.camX !== camX || u.camY !== camY || u.rush !== g.rush) {
        setUi({
          gold: Math.floor(g.gold), lives: g.lives, wave: g.wave, phase: g.phase,
          selected: sel ? { id: sel.id, kind: sel.kind, level: sel.level, branch: sel.branch, rank4: sel.rank4, invested: sel.invested, aim: sel.aim,
            kills: sel.kills || 0, dmgOut: sel.dmgOut || 0, liveTime: sel.liveTime || 0 } : null,
          selKey, buildMode: g.buildMode, rallyFor, speed: g.speed, paused: g.paused, canRestart, cdSec, zoom: g.cam.zoom, camX, camY, rush: g.rush,
          masterShow, masterOn: !!g.masterBuild,
          masterPick: pickKey, masterPickName: g.masterPick?.name || null,
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

  // The mouse wheel zooms toward the cursor. A native listener, because the
  // page must not scroll while the board is under the pointer.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const onWheel = (ev) => {
      const g = G.current;
      if (!g) return;
      ev.preventDefault();
      const rect = cv.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      const py = ((ev.clientY - rect.top) / rect.height) * H;
      const z0 = g.cam.zoom;
      const z = Math.min(3, Math.max(1, z0 * Math.exp(-ev.deltaY * 0.0022)));
      if (z === z0) return;
      const wx = g.cam.x + px / z0, wy = g.cam.y + py / z0;
      g.cam.zoom = z;
      g.cam.x = Math.min(Math.max(0, wx - px / z), W - W / z);
      g.cam.y = Math.min(Math.max(0, wy - py / z), H - H / z);
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    return () => cv.removeEventListener("wheel", onWheel);
    // the canvas is only mounted on the battle screen, so listen again each time it appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

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
    const z = Math.min(3, Math.max(1, nz));
    const wx = g.cam.x + (W / 2) / z0, wy = g.cam.y + (H / 2) / z0;
    g.cam.zoom = z;
    g.cam.x = wx - (W / 2) / z;
    g.cam.y = wy - (H / 2) / z;
    clampCam(g);
  };
  // Posting a rally flag: the garrison's panel steps aside so the whole circle
  // is reachable, and a click anywhere plants the flag — outside the circle it
  // slides to the nearest spot on the rim rather than missing.
  const postRally = (g, t, x, y) => {
    // a Log Roller is not mustering anyone: the flag is a BEARING, and it may
    // be planted anywhere, because the log will roll until it leaves the board
    if (t.kind === "catapult") {
      t.logAim = Math.atan2(y - t.y, x - t.x);
      t.rally = { x, y };
      g.effects.push({ type: "levelup", x, y, ttl: 500 });
      g.rallyFor = null;
      return;
    }
    const dx = x - t.x, dy = y - t.y;
    const d = Math.hypot(dx, dy);
    const k = d > RALLY_RANGE ? RALLY_RANGE / d : 1;
    t.rally = { x: t.x + dx * k, y: t.y + dy * k };
    g.effects.push({ type: "levelup", x: t.rally.x, y: t.rally.y, ttl: 500 });
    g.rallyFor = null;
  };
  const handleTap = (x, y) => {
    const g = G.current;
    if (!g || g.phase === "won" || g.phase === "lost" || g.paused) return;
    if (g.rallyFor != null) {
      const t = g.towers.find((tt) => tt.id === g.rallyFor);
      if (t) postRally(g, t, x, y);
      else g.rallyFor = null;
      return;
    }
    if (g.buildMode) {
      if (g.masterBuild && (g.freeplay || g.victory)) {
        const pick = g.masterPick && g.masterPick.kind === g.buildMode ? g.masterPick : null;
        placeMasterTower(g, g.buildMode, x, y, pick);
      } else placeTower(g, g.buildMode, x, y);
      // placement clears buildMode on success — close the drawer with it
      if (!g.buildMode) { g.masterPick = null; setBuildOpen(false); }
      return;
    }
    // tapping the field outside a menu dismisses the build drawer
    setBuildOpen(false);
    const t = towerNear(g, x, y);
    if (t) { g.selectedId = t.id; return; }
    // selected garrison: click inside its circle to move the rally flag
    const selT = g.towers.find((tt) => tt.id === g.selectedId);
    if (selT && (selT.kind === "knight" || selT.kind === "assassin" || (selT.kind === "catapult" && getStats(selT).roller)) && Math.hypot(x - selT.x, y - selT.y) <= RALLY_RANGE * 1.6) {
      postRally(g, selT, x, y);
      return;
    }
    g.selectedId = null;
  };
  // ---- pointer input: mouse, pen and touch through one door ----
  // One finger taps and (when zoomed) pans; while a tower is being placed the
  // ghost rides the finger and the tower lands where it lifts. Two fingers
  // pinch to zoom about the point between them and drag to pan.
  const ptrs = useRef(new Map());
  const pinchRef = useRef(null);
  const clampCamTo = (g, z) => {
    g.cam.zoom = z;
    g.cam.x = Math.min(Math.max(0, g.cam.x), W - W / z);
    g.cam.y = Math.min(Math.max(0, g.cam.y), H - H / z);
  };
  const onCanvasDown = (ev) => {
    const g = G.current;
    if (!g) return;
    try { ev.currentTarget.setPointerCapture?.(ev.pointerId); } catch { /* a synthetic or already-lifted pointer */ }
    const [px, py] = screenPos(ev);
    ptrs.current.set(ev.pointerId, [px, py]);
    if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      pinchRef.current = {
        d0: Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1])),
        mid0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        z0: g.cam.zoom, cx0: g.cam.x, cy0: g.cam.y,
      };
      dragRef.current.down = false;
      return;
    }
    dragRef.current = { down: true, panned: false, sx: px, sy: py, cx: g.cam.x, cy: g.cam.y };
    if (g.buildMode) g.hover = worldPos(ev);
  };
  const onCanvasMove = (ev) => {
    const g = G.current;
    if (!g) return;
    if (ptrs.current.has(ev.pointerId)) ptrs.current.set(ev.pointerId, screenPos(ev));
    const pinch = pinchRef.current;
    if (pinch && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1]));
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const z = Math.min(3, Math.max(1, pinch.z0 * (d / pinch.d0)));
      // the world point that sat between the fingers stays between them
      const wx = pinch.cx0 + pinch.mid0[0] / pinch.z0, wy = pinch.cy0 + pinch.mid0[1] / pinch.z0;
      g.cam.x = wx - mid[0] / z;
      g.cam.y = wy - mid[1] / z;
      clampCamTo(g, z);
      return;
    }
    g.hover = worldPos(ev);
    const d = dragRef.current;
    if (d.down && !g.buildMode && g.cam.zoom > 1) {
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
    const g = G.current;
    ptrs.current.delete(ev.pointerId);
    if (pinchRef.current) {
      // the pinch ends when the second finger lifts; neither lifting is a tap
      if (ptrs.current.size < 2) pinchRef.current = null;
      dragRef.current.down = false;
      return;
    }
    const d = dragRef.current;
    if (d.down && !d.panned && g) {
      const [x, y] = worldPos(ev);
      handleTap(x, y);
      // a finger leaves no hover behind it; a mouse keeps its ghost
      if (ev.pointerType !== "mouse") g.hover = null;
    }
    d.down = false;
  };
  const onCanvasCancel = (ev) => {
    ptrs.current.delete(ev.pointerId);
    if (ptrs.current.size < 2) pinchRef.current = null;
    dragRef.current.down = false;
  };

  const sel = ui.selected;
  const selDef = sel ? TOWERS[sel.kind] : null;

  // enemy chips (icon + count + hover tooltip) shared by both wave panels;
  // panelKey keeps hover state independent when a type appears in both.
  const waveChips = (comp, panelKey) => comp.map(({ type, count }) => {
    const hk = `${panelKey}:${type}`;
    return (
      <div key={hk}
        onMouseEnter={() => setHoverEnemy(hk)}
        onMouseLeave={() => setHoverEnemy((cur) => (cur === hk ? null : cur))}
        onClick={() => setHoverEnemy((cur) => (cur === hk ? null : hk))}
        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
        {hoverEnemy === hk && <EnemyTooltip type={type} />}
        <EnemyIcon type={type} box={ENEMIES[type].boss ? 42 : 28} />
        <span style={{ fontSize: 11, color: ENEMIES[type].boss ? "#e07a72" : "#e8e0c8" }}>
          <span style={{ opacity: 0.6 }}>×</span>{count}
        </span>
      </div>
    );
  });

  const statLabel = { fontSize: 9, letterSpacing: 1, opacity: 0.6, marginRight: 3 };

  // The build drawer covers the board's right side, so it slides out of the way
  // while a tower is actively being placed (buildMode set) or a tower is selected
  // (its pop-up takes over), keeping the board clear and one panel showing at a time.
  const drawerVisible = buildOpen && !ui.buildMode && !sel;

  // Title screen: the campaign goes through the map, Free Play through realm select.
  if (screen === "home") {
    return (
      <HomeScreen
        progress={progress}
        profile={profile}
        onContinue={openMap}
        onNewCampaign={() => { setProgress(resetProgress()); setScreen("map"); }}
        onFreePlay={() => { setMode("free"); setLevelId(null); openRealmSelect("home"); setScreen("game"); }}
        onCouncil={() => setScreen("council")}
      />
    );
  }

  // Where stars are spent: the permanent per-tower skill trees.
  if (screen === "council") {
    return <WarCouncil profile={profile} setProfile={setProfile} onBack={() => setScreen("home")} />;
  }

  // The continent: where the campaign is chosen from and returned to.
  if (screen === "map") {
    return (
      <CampaignMap
        progress={progress}
        profile={profile}
        onStart={startLevel}
        onBack={() => setScreen("home")}
        onReset={() => setProgress(resetProgress())}
      />
    );
  }

  // ---- the HUD ----
  // The board fills the screen beside a dock of towers; everything else
  // floats over the field in small panels, the way a tablet game is laid
  // out. Nothing on this screen scrolls except the dock's own list.
  const masterOn = !!(ui.masterShow && ui.masterOn);
  const hud = { ...overlayPanel, borderWidth: 2, boxShadow: "inset 0 0 0 1px #454c5a" };
  const chip = { ...hud, padding: "6px 10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };
  const hudBtn = { ...btn, minHeight: 44, minWidth: 44, padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 13 };
  const prompt = { ...hud, position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 22, padding: "6px 8px 6px 12px", fontSize: 12, color: "#a8d88c", display: "flex", alignItems: "center", gap: 10, maxWidth: "70%", pointerEvents: "none" };
  const tile = (active, can) => ({
    ...btn, width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 3, padding: "6px 2px 5px", minHeight: 74, textAlign: "center",
    ...(active ? { background: "#5a4f2c", boxShadow: "inset -2px -2px 0 #3a3420, inset 2px 2px 0 #8a7746" } : {}), ...(!can ? disabled : {}),
  });

  return (
    <div style={{
      height: "100dvh", background: "#12151b", color: "#e8e0c8", fontFamily: FONT, boxSizing: "border-box",
      display: "flex", overflow: "hidden",
      paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)", paddingBottom: "env(safe-area-inset-bottom)",
    }}>
        {menuOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(20,23,30,0.86)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 6, padding: 20, boxSizing: "border-box", overflowY: "auto",
          }}>
            <div style={{ ...title(24), fontSize: "clamp(20px, 6.5vw, 30px)" }}>CROWNGUARD</div>
            <div style={{ fontSize: 10, letterSpacing: 3, opacity: 0.55, marginBottom: 16 }}>PAUSED</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, width: "100%", maxWidth: 320 }}>
              <button style={{ ...btn, textAlign: "center", padding: "15px 10px", fontSize: 14, letterSpacing: 1, background: "#5a4f2c", boxShadow: "inset -2px -2px 0 #3a3420, inset 2px 2px 0 #8a7746" }}
                onClick={closeMenu}>
                Resume
              </button>
              <button style={{ ...btn, textAlign: "center", padding: "13px 10px", fontSize: 13 }}
                onClick={openGuide}>
                Field Guide
              </button>
              <button style={{ ...btn, textAlign: "center", padding: "13px 10px", fontSize: 13 }}
                onClick={() => { sfx.setMuted(!sfx.muted); setSndMuted(sfx.muted); }}>
                Sound: {sndMuted ? "Off" : "On"}
              </button>
              <button style={{ ...btn, textAlign: "center", padding: "13px 10px", fontSize: 13, ...(ui.canRestart ? {} : disabled) }} disabled={!ui.canRestart}
                onClick={() => { restartWave(G.current); closeMenu(); }}>
                Restart Wave
              </button>
              {mode === "campaign" ? (
                <button style={{ ...btn, textAlign: "center", padding: "13px 10px", fontSize: 13 }} onClick={openMap}>
                  Campaign Map
                </button>
              ) : (
                <button style={{ ...btn, textAlign: "center", padding: "13px 10px", fontSize: 13 }}
                  onClick={() => { openRealmSelect("game"); closeMenu(); }}>
                  Choose Realm...
                </button>
              )}
              <button style={{ ...btn, textAlign: "center", padding: "13px 10px", fontSize: 13 }} onClick={goHome}>
                Main Menu
              </button>
            </div>

            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 16 }}>
              {level && <span style={{ opacity: 0.8 }}>Chapter {level.chapter.numeral} · </span>}
              <b style={{ color: REALMS[realmId].tagColor }}>{REALMS[realmId].name}</b> · Wave {ui.wave}/{scriptedWaves()}
            </div>
          </div>
        )}

        {guideOpen && <FieldGuide onClose={closeGuide} />}

      {/* landscape only: a touch screen held upright is asked to turn */}
      {portrait && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "#20242c", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 44 }}>⟳</div>
          <div style={{ ...title(22) }}>TURN YOUR DEVICE</div>
          <div style={{ fontSize: 13, opacity: 0.75, maxWidth: 300, lineHeight: 1.5 }}>Crownguard is played sideways — turn to landscape and the war resumes.</div>
        </div>
      )}

      {/* ---- the field, letterboxed to 3:2 in whatever is left beside the dock ---- */}
      <div ref={boardCellRef} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: boardCss.w, height: boardCss.h, overflow: "hidden", background: REALMS[realmId].GRASS }}>
          <canvas
            ref={canvasRef} width={W * RES} height={H * RES}
            onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerCancel={onCanvasCancel}
            onPointerLeave={(ev) => { if (ev.pointerType === "mouse" && G.current) G.current.hover = null; }}
            onContextMenu={(ev) => ev.preventDefault()}
            style={{ width: "100%", height: "100%", display: "block", cursor: ui.buildMode ? "copy" : ui.zoom > 1 ? "grab" : "pointer", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          />

          {/* top-left: the purse, the castle, the wave */}
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6, zIndex: 20, pointerEvents: "none" }}>
            <div style={chip}><span style={{ opacity: 0.7 }}>🪙</span><b style={{ color: "#e8d47a" }}>{ui.gold}</b></div>
            <div style={chip}><span style={{ opacity: 0.7 }}>🏰</span><b style={{ color: ui.lives > CASTLE_HP ? "#e8c14a" : ui.lives <= 5 ? "#e07a72" : ui.lives <= 10 ? "#d8b34a" : "#e8e0c8" }}>{ui.lives}</b><span style={{ opacity: 0.55, fontSize: 11 }}>/{CASTLE_HP}</span></div>
            {level && boardCss.w > 760 && (
              <div style={{ ...chip, fontSize: 10, letterSpacing: 1, opacity: 0.85 }}>
                <span style={{ color: "#d8b34a" }}>CH. {level.chapter.numeral}</span>{level.name}
              </div>
            )}
          </div>

          {/* top-right: speed and pause */}
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6, zIndex: 20 }}>
            {ui.zoom > 1 && <button title="Reset view" style={{ ...hudBtn, fontSize: 11 }} onClick={() => setZoom(1)}>reset</button>}
            {ui.result == null && (
              <button aria-label="Open build menu" style={{ ...hudBtn, gap: 6, ...(buildOpen ? { background: "#5a4f2c" } : {}) }}
                onClick={() => { setBuildOpen((o) => !o); if (G.current) { G.current.selectedId = null; G.current.buildMode = null; } }}>
                <PixelIcon kind="archer" size={18} /> Build
              </button>
            )}
            <button title="Game speed" style={{ ...hudBtn, ...(ui.speed > 1 ? { background: "#5a4f2c" } : {}) }}
              onClick={() => { if (G.current) G.current.speed = G.current.speed === 1 ? 2 : G.current.speed === 2 ? 4 : 1; }}>
              {ui.speed}x
            </button>
            <button title="Pause and open the menu" aria-label="Pause and open the menu" style={{ ...hudBtn, ...(menuOpen ? { background: "#5a4f2c" } : {}) }} onClick={openMenu}>
              <PauseIcon />
            </button>
          </div>

          {/* top centre: what the next tap will do */}
          {ui.buildMode && (
            <div style={prompt}>
              <span>Placing <b style={{ color: "#e8d47a" }}>{(ui.masterOn && ui.masterPickName) || TOWERS[ui.buildMode].name}</b> — tap the {TOWERS[ui.buildMode].water ? "river" : "grass"}{ui.buildMode === "knight" ? "; knights muster south of the hall" : ""}.</span>
              <button aria-label="Cancel placement" onClick={() => { if (G.current) G.current.buildMode = null; }} style={{ ...hudBtn, minHeight: 36, minWidth: 36, padding: "0 10px", pointerEvents: "auto" }}>✕</button>
            </div>
          )}
          {ui.rallyFor != null && (
            <div style={prompt}>
              <span>Posting the <b style={{ color: "#e8d47a" }}>rally flag</b> — tap where the knights should stand.</span>
              <button aria-label="Cancel rally move" onClick={() => { if (G.current) G.current.rallyFor = null; }} style={{ ...hudBtn, minHeight: 36, minWidth: 36, padding: "0 10px", pointerEvents: "auto" }}>✕</button>
            </div>
          )}

          {/* bottom-left: the horn. One button: "▶ 3/18" with the early-start
              bonus while the field is quiet, a plain "Wave 3/18" while it
              fights. Its arrow pops up the wave's makeup and the rush switch. */}
          {(() => {
            const nextWave = ui.phase === "build" ? ui.wave + 1 : ui.wave;
            const comp = nextWave >= 1 ? waveComposition(nextWave) : [];
            const total = ui.wave > scriptedWaves() ? "∞" : scriptedWaves();
            const fighting = ui.phase !== "build";
            const small = { fontSize: 10, opacity: 0.6, fontWeight: "normal", marginLeft: 1 };
            return (
              <div style={{ position: "absolute", left: 8, bottom: 8, zIndex: 20 }}>
                {infoOpen && (
                  <div style={{ ...hud, position: "absolute", left: 0, bottom: "calc(100% + 6px)", padding: "8px 10px", minWidth: 200, maxWidth: 360 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 9, letterSpacing: 2, opacity: 0.75, flex: 1 }}>WAVE INFO — {fighting ? "ON THE FIELD" : ui.wave >= scriptedWaves() ? "NEXT · ENDLESS" : "NEXT"}</span>
                      <button aria-label="Close wave info" onClick={() => setInfoOpen(false)} style={{ ...btn, minHeight: 28, minWidth: 28, padding: "0 6px", fontSize: 11 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 8 }}>
                      {comp.length ? waveChips(comp, fighting ? "cur" : "next") : <span style={{ fontSize: 11, opacity: 0.6 }}>Nothing yet.</span>}
                    </div>
                    <button
                      title="Sound the horn the moment a wave is cleared, for the full early-start bonus every time"
                      style={{ ...btn, width: "100%", minHeight: 36, fontSize: 12, display: "flex", alignItems: "center", gap: 8, ...(ui.rush ? { background: "#5a4f2c", boxShadow: "inset 0 0 0 2px #7a6a3c" } : {}) }}
                      onClick={() => { const g = G.current; if (g) g.rush = !g.rush; }}>
                      <span>⚡ Rush</span><span style={{ marginLeft: "auto", opacity: 0.85 }}>{ui.rush ? "ON" : "OFF"}</span>
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  <button
                    style={{ ...hudBtn, padding: "0 14px", gap: 8, minHeight: 46, ...(fighting
                      ? { background: "#2c313c", cursor: "default", boxShadow: "inset 0 0 0 2px #454c5a" }
                      : { background: "#5a4f2c", boxShadow: "inset -2px -2px 0 #3a3420, inset 2px 2px 0 #8a7746" }) }}
                    onClick={() => { if (!fighting) startWave(G.current); }} disabled={fighting}>
                    {fighting
                      ? <span style={{ fontSize: 14 }}>Wave {ui.wave}<span style={small}>/{total}</span></span>
                      : <>
                          <span style={{ fontSize: 15 }}>▶ {ui.wave + 1}<span style={small}>/{ui.wave + 1 > scriptedWaves() ? "∞" : scriptedWaves()}</span></span>
                          {ui.cdSec != null && <span style={{ color: "#e8d47a", fontSize: 12 }}>+{Math.min(45, Math.ceil(ui.cdSec * 1.5))}g</span>}
                          {ui.cdSec != null && <span style={{ fontSize: 10, opacity: 0.6 }}>{ui.cdSec}s</span>}
                        </>}
                  </button>
                  <button aria-label={infoOpen ? "Hide wave info" : "Show wave info"}
                    style={{ ...hudBtn, minWidth: 34, padding: 0, fontSize: 12, borderLeft: "none", minHeight: 46, ...(infoOpen ? { background: "#5a4f2c" } : {}), ...(ui.rush ? { color: "#e8d47a" } : {}) }}
                    onClick={() => setInfoOpen((o) => !o)}>
                    {infoOpen ? "▾" : "▴"}
                  </button>
                </div>
              </div>
            );
          })()}

            {!ui.buildMode && !sel && ui.masterShow && ui.masterOn && masterInfo && (() => {
              const { nums, traits } = describe(masterInfo.stats);
              return (
                <div style={{
                  // anchored to the BOARD's left edge, not to a percentage of it:
                  // the drawer caps at 264px, so a percentage offset shoved this
                  // card off the map on a narrow board
                  position: "absolute", top: 12, left: 8, zIndex: 31,
                  maxWidth: "min(250px, calc(100% - 286px))", minWidth: 150,
                  ...overlayPanel, boxShadow: "inset 0 0 0 2px #7a6a3c",
                  padding: 10, maxHeight: "76%", overflowY: "auto",
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <TowerPortrait kind={masterInfo.kind} branch={masterInfo.branch} rank4={masterInfo.rank4} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "bold", color: "#e8d47a", fontSize: 12 }}>{masterInfo.name}</div>
                      <div style={{ fontSize: 10, color: "#e8d47a", opacity: 0.8 }}>⚡{masterInfo.cost}g · {TOWERS[masterInfo.kind].name}</div>
                    </div>
                    <button aria-label="Close info" onClick={() => setMasterInfo(null)} style={{ ...btn, padding: "1px 7px", fontSize: 11 }}>✕</button>
                  </div>
                  <div style={{ fontSize: 10.5, opacity: 0.9, marginTop: 6, lineHeight: 1.55 }}>{masterInfo.desc}</div>
                  <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 6, lineHeight: 1.6 }}>{nums.join(" · ")}</div>
                  {traits.length > 0 && <div style={{ fontSize: 10.5, color: "#a8d88c", marginTop: 3, lineHeight: 1.55 }}>{traits.join(" · ")}</div>}
                </div>
              );
            })()}

            {sel && selDef && ui.rallyFor == null && (() => {
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
              <div style={{ position: "absolute", width: 300, maxWidth: "48%", zIndex: 25, ...overlayPanel, boxShadow: "inset 0 0 0 2px #7a6a3c", padding: 10, overflowY: "auto", ...anchor }}>
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
                        // perks leave stats fractional on purpose — round for the panel
                        const raw = getStats(t);
                        const st = { ...raw };
                        for (const k of ["dmg", "hp", "range", "splash", "heal", "colddps"]) {
                          if (typeof st[k] === "number") st[k] = Math.round(st[k]);
                        }
                        if (t.kind === "knight") return `${st.count || 1} knight${(st.count || 1) > 1 ? "s" : ""} · ${st.dmg} dmg · ${(st.rate / 1000).toFixed(2)}s · ${st.hp} hp${st.magic ? " · magic" : ""}${st.heal ? " · self-heal" : ""}${st.sear ? " · searing ground" : ""}${st.frenzy ? " · frenzy + lifesteal" : ""}${st.unitSpeed ? " · wolf-swift" : ""}`;
                        if (t.kind === "support") return `${Math.round(st.slow * 100)}% slow aura · ${st.range} range${st.colddps ? ` · ${st.colddps} cold dps` : ""}${st.nova ? " · frost novas freeze" : ""}${st.brittle ? " · brittles foes (+phys dmg)" : ""}${st.heal ? ` · mends knights ${st.heal}/s` : ""}${st.shield ? " · shields knights" : ""}${st.mend ? " · +1 castle HP per wave" : ""}`;
                        if (t.kind === "gunpowder") return `BOMBARDIER ${Math.round(st.dmg)} dmg · ${st.splash} splash · ${st.range}rng${st.shells > 1 ? ` · ${st.shells} charges` : ""}${st.burn ? " · burning" : ""}${st.burnSpread ? " · fire spreads" : ""}  ·  MUSKET ${Math.round(st.mDmg)} dmg · ${(st.mRate / 1000).toFixed(2)}s · ${st.mRange}rng${st.mPierce ? " · pierces" : ""}${st.mCrit ? " · every 3rd triples" : ""}${st.mShots > 1 ? ` · ${st.mShots}-ball fan` : ""}`;
                        if (t.kind === "riverwatch") return `${st.count || 1} skiff${(st.count || 1) > 1 ? "s" : ""} on the water · ${Math.round(st.dmg)} dmg · ${(st.rate / 1000).toFixed(2)}s · ${st.range}rng${st.splash ? ` · ${st.splash} splash` : ""}${st.burn ? " · burning pitch" : ""}${st.pierce ? " · pierces armor" : ""}${st.slow ? " · harpoons drag" : ""}${st.stun ? " · the boom stuns" : ""} · rows the river`;
                        if (t.kind === "assassin") return `${st.count || 1} blade${(st.count || 1) > 1 ? "s" : ""} afield · ${Math.round(st.dmg)} dmg · ×${st.preyMult} vs support · ${(st.rate / 1000).toFixed(2)}s · ${st.hp} hp each${st.pierce ? " · pierces armor" : ""}${st.cull ? " · culls the weak" : ""}${st.silence ? " · silences" : ""}${st.venom ? ` · ${st.venom}/s venom` : ""}${st.venomNoHeal ? " · unhealable venom" : ""}${st.spores ? " · spore clouds" : ""} · never blocks`;
                        if (t.kind === "trapsmith") return `${Math.round(st.trapDmg)} trap dmg · ${st.maxCharges} charge${st.maxCharges > 1 ? "s" : ""}, one per ${(st.chargeEvery / 1000).toFixed(0)}s · ${st.range}rng${st.root ? " · jaws hold fast" : ""}${st.execute ? " · finishes the weak" : ""}${st.burn ? " · burning mines" : ""}${st.stunAll ? " · stunning blasts" : ""}${st.autoSeed ? " · reseeds each wave" : ""}`;
                        if (t.kind === "goldworks") return `pays ${Math.round(st.income + (t.mintBonus || 0))}g per wave held${st.compound ? ` · grows +${st.compound} each wave` : ""}${st.hoard ? " · hoard doubles or withholds" : ""}${st.mend ? " · mends the castle" : ""}${st.bountyAura ? ` · kills nearby pay +${Math.round(st.bountyAura * 100)}%` : ""}${st.shredAura ? " · aura strips armor" : ""}${st.midas ? " · midas shots" : ""} · has paid ${Math.round(t.paidTotal || 0)}g this run`;
                        if (t.kind === "sunforge") return `${Math.round(st.dps)}/s beam, ramps to ×${st.rampMax} · ${st.range}rng${st.beams > 1 ? ` · ${st.beams} beams` : ""}${st.igniteBurn ? " · ignites at full focus" : ""}${st.beamSplash ? " · spills over at focus" : ""}${st.wellRoot ? " · pins its victim" : ""}${st.beamSlow ? " · slows the held" : ""}`;
                        return `${st.dmg} dmg${st.shots ? ` ×${st.shots} stones` : ""}${st.spikes ? ` ×${st.spikes} spikes, all directions` : ""}${st.nova ? " · flame ring hits ALL in reach" : ""}${st.spikePierce > 1 ? " · spikes skewer through" : ""} · ${(st.rate / 1000).toFixed(2)}s · ${st.range}rng${st.arc ? ` · chains ×${st.arc}` : ""}${st.zapStun ? " · shocks can stun" : ""}${st.minRange ? ` · blind under ${st.minRange}` : ""}${st.splash ? ` · ${st.splash} splash (full dmg at core)` : ""}${st.poolDps ? " · lava pools" : ""}${st.burnSpread ? " · fire spreads" : ""}${st.frag ? " · shrapnel bursts" : ""}${st.pierce ? " · pierces armor" : ""}${st.dtype === "magic" ? " · magic" : ""}`;
                      })()}
                    </div>
                  </div>
                  <button aria-label="Deselect tower" onClick={() => { if (G.current) G.current.selectedId = null; }} style={{ ...btn, padding: "1px 8px", fontSize: 12 }}>✕</button>
                </div>

                {sel.kind === "catapult" && getStats(t).roller && (
                  <button style={{ ...btn, width: "100%", marginTop: 8, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => { if (G.current) G.current.rallyFor = sel.id; }}>
                    <FlagIcon /> Aim the Roll
                  </button>
                )}
                {(sel.kind === "knight" || sel.kind === "assassin") && (
                  <button style={{ ...btn, width: "100%", marginTop: 8, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => { if (G.current) G.current.rallyFor = sel.id; }}>
                    <FlagIcon /> Move Rally Flag
                  </button>
                )}

                {/* the service record: what this hall has actually done for you */}
                {(sel.kills > 0 || sel.dmgOut > 0) && (() => {
                  const dps = sel.dmgOut / Math.max(1, sel.liveTime);
                  const num = (v) => (v >= 10000 ? (v / 1000).toFixed(1) + "k" : Math.round(v).toLocaleString());
                  return (
                    <div style={{ display: "flex", gap: 10, marginTop: 7, padding: "5px 7px", background: "#23262f", border: "2px solid #10131a", fontSize: 10.5 }}>
                      <span title="foes this tower struck down"><b style={{ color: "#e8d47a" }}>{sel.kills}</b> <span style={{ opacity: 0.65 }}>kills</span></span>
                      <span title="total damage dealt this run"><b style={{ color: "#e8d47a" }}>{num(sel.dmgOut)}</b> <span style={{ opacity: 0.65 }}>dmg</span></span>
                      <span title="damage per second of battle — build time excluded"><b style={{ color: "#a8d88c" }}>{dps >= 100 ? Math.round(dps) : dps.toFixed(1)}</b> <span style={{ opacity: 0.65 }}>dps</span></span>
                    </div>
                  );
                })()}

                {/* rich-run shortcut: buy every remaining rank in one stroke */}
                {ui.masterShow && !sel.rank4 && (() => {
                  const c = completionCost(t);
                  const can = ui.gold >= c.cost;
                  return (
                    <button
                      style={{ ...btn, width: "100%", marginTop: 8, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, ...(can ? {} : disabled) }}
                      onClick={() => { if (can && G.current) completeTower(G.current, t); }}
                      disabled={!can}>
                      ⚡ Complete — {c.name} ({c.cost}g)
                    </button>
                  );
                })()}

                {sel.kind === "trapsmith" && (
                  <div style={{ fontSize: 10, opacity: 0.75, marginTop: 8, lineHeight: 1.5 }}>
                    🪤 The smith arms the road himself — each finished charge is laid into the widest gap in his reach.
                  </div>
                )}

                {/* standing orders: who this tower shoots at */}
                {(() => {
                  const st = getStats(t);
                  const modes = aimModes(t, st);
                  if (!modes.length) return null;
                  const forced = forcedAim(st);
                  return (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, letterSpacing: 2, color: "#e8d47a", marginBottom: 5 }}>TARGETS</div>
                      {forced ? (
                        <div style={{ fontSize: 10, opacity: 0.75 }}>
                          Sworn to the hunt — always takes <b style={{ color: "#e8e0c8" }}>the mightiest foe</b>.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {modes.map((m) => (
                              <button key={m.id} title={m.hint}
                                style={{
                                  ...btn, flex: "1 1 auto", padding: "5px 6px", fontSize: 10, textAlign: "center",
                                  ...(sel.aim === m.id ? { background: "#5a4f2c", boxShadow: "inset -2px -2px 0 #3a3420, inset 2px 2px 0 #8a7746" } : {}),
                                }}
                                onClick={() => { const tt = G.current?.towers.find((x) => x.id === sel.id); if (tt) tt.aim = m.id; }}>
                                {m.label}
                              </button>
                            ))}
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                            {(modes.find((m) => m.id === sel.aim) || modes[0]).hint}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

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

            {(ui.result === "won" || ui.result === "lost") && (() => {
              const campaign = mode === "campaign" && level;
              const nxt = campaign ? nextLevel(level.id) : null;
              const lastOfChapter = campaign && level.index === level.chapter.levels.length - 1;
              return (
              <div style={{ position: "absolute", inset: 0, background: "rgba(12,12,16,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", zIndex: 45 }}>
                <div style={{ fontSize: 20, letterSpacing: 3, color: ui.result === "won" ? "#e8d47a" : "#e07a72", textShadow: "2px 2px 0 #10131a" }}>
                  {ui.result === "lost" ? "THE CASTLE HAS FALLEN"
                    : campaign ? (lastOfChapter ? `${level.chapter.name.toUpperCase()} IS FREE` : `${level.name.toUpperCase()} HELD`)
                    : "THE REALM STANDS"}
                </div>
                {/* stars won, and what they were worth */}
                {campaign && ui.result === "won" && award && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 2, 3].map((i) => <Star key={i} lit={i <= award.rating} size={30} />)}
                    </div>
                    <div style={{ fontSize: 11, color: "#e8d47a" }}>
                      +{award.xp} XP
                      {award.newStars > 0
                        ? ` · +${award.newStars} star${award.newStars > 1 ? "s" : ""} banked`
                        : " · no new stars — you'd already done better"}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 12, opacity: 0.85, maxWidth: 360, padding: "0 12px" }}>
                  {ui.result === "lost"
                    ? `You fell on wave ${ui.wave}. Retry the wave with your gold and towers restored, or take the level again from the start.`
                    : campaign
                      ? (nxt
                          ? (lastOfChapter
                              ? `The chapter is closed — but word of it travels. ${nxt.chapter.name} is stirring, and ${nxt.name} lies ahead. Or dig in here and see how long this ground can hold.`
                              : `The road is yours as far as ${nxt.name}. March on — or hold this ground against the Endless March.`)
                          : "The Iron throne is taken and the whole continent is yours. The war is won — unless you'd rather see how long you can hold it.")
                      : "The dragon is slain and the road is quiet... for now. Beyond the pass, the horde has no end — march on if you dare."}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", padding: "0 12px" }}>
                  {ui.result === "won" && campaign && nxt && (
                    <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center", background: "#5a4f2c" }}
                      onClick={() => startLevel(nxt)}>
                      March On — {nxt.name}
                    </button>
                  )}
                  {ui.result === "won" && (
                    <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center", ...(campaign && nxt ? {} : { background: "#5a4f2c" }) }}
                      onClick={() => { const g = G.current; if (g) { g.phase = "build"; g.buildUntil = g.time + 30; } setAward(null); }}>
                      March On — Endless
                    </button>
                  )}
                  {ui.result === "lost" && ui.canRestart && (
                    <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center", background: "#5a4f2c" }} onClick={() => restartWave(G.current)}>Retry Wave {ui.wave}</button>
                  )}
                  {ui.result === "lost" && campaign && (
                    <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center" }} onClick={() => startLevel(level)}>Restart Level</button>
                  )}
                  {campaign
                    ? <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center" }} onClick={openMap}>Campaign Map</button>
                    : <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center" }} onClick={() => openRealmSelect("game")}>Choose Realm...</button>}
                  <button style={{ ...btn, fontSize: 13, padding: "10px 18px", textAlign: "center" }} onClick={goHome}>Main Menu</button>
                </div>
              </div>
              );
            })()}
        </div>
      </div>

      {/* ---- the build panel: opens over the right of the screen from the Build button ---- */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: masterOn ? 310 : 244, zIndex: 40, boxSizing: "border-box",
        display: "flex", flexDirection: "column", background: "rgba(30,33,42,0.98)", borderLeft: "3px solid #10131a",
        paddingTop: "env(safe-area-inset-top)", paddingRight: "env(safe-area-inset-right)",
        transform: buildOpen ? "translateX(0)" : "translateX(104%)", transition: "transform 0.2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px 6px" }}>
          <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.75, flex: 1 }}>RAISE DEFENSES</span>
          {ui.masterShow && (
            <button title="Master Builds: place any final form whole" style={{ ...hudBtn, minHeight: 36, padding: "0 10px", fontSize: 11, ...(masterOn ? { background: "#5a4f2c", boxShadow: "inset 0 0 0 2px #7a6a3c" } : {}) }}
              onClick={() => { const gg = G.current; if (!gg) return; gg.masterBuild = !gg.masterBuild; gg.buildMode = null; gg.masterPick = null; setMasterInfo(null); }}>
              ⚡ Master
            </button>
          )}
          <button aria-label="Close build menu" onClick={() => setBuildOpen(false)} style={{ ...hudBtn, minHeight: 36, minWidth: 36, padding: "0 10px" }}>✕</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 10px", WebkitOverflowScrolling: "touch" }}>
          {masterOn ? (
                /* the master menu: each tower's every ascension, bought outright */
                Object.entries(TOWERS).map(([key, def]) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9.5, letterSpacing: 1.5, color: "#d8b34a", margin: "2px 0 5px" }}>{def.name.toUpperCase()}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {masterPlans(key).map((plan) => {
                        const pk = `${key}:${plan.branch}${plan.rank4 || ""}`;
                        const can = ui.gold >= plan.cost;
                        const active = ui.buildMode === key && ui.masterPick === pk;
                        return (
                          <button key={pk} title={def.branches[plan.branch].desc}
                            style={{
                              ...btn, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                              gap: 4, padding: "8px 4px 7px", textAlign: "center", minHeight: 94,
                              ...(active ? { background: "#5a4f2c" } : {}), ...(!can ? disabled : {}),
                            }}
                            onClick={() => {
                              const gg = G.current;
                              if (!gg) return;
                              gg.buildMode = active ? null : key;
                              gg.masterPick = active ? null : { kind: key, branch: plan.branch, rank4: plan.rank4, name: plan.name };
                              gg.selectedId = null;
                              if (!active) setBuildOpen(false);
                            }}
                            disabled={!can}>
                            <span role="button" aria-label={`About ${plan.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const br = def.branches[plan.branch];
                                const stats = plan.rank4 ? br.rank4[plan.rank4].stats : br.stats;
                                setMasterInfo({ kind: key, ...plan, desc: plan.rank4 ? br.rank4[plan.rank4].desc : br.desc, stats });
                              }}
                              style={{ position: "absolute", top: 2, right: 6, fontSize: 11, opacity: 0.65, pointerEvents: "auto" }}>ⓘ</span>
                            <TowerPortrait kind={key} branch={plan.branch} rank4={plan.rank4} size={38} />
                            <span style={{ fontSize: 10, fontWeight: "bold", lineHeight: 1.25 }}>{plan.name}</span>
                            <span style={{ fontSize: 10, color: can ? "#e8d47a" : "#e07a72" }}>⚡{plan.cost}g</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {Object.entries(TOWERS).map(([key, def]) => {
                const can = ui.gold >= def.cost;
                const active = ui.buildMode === key;
                return (
                  <button key={key} title={def.blurb} style={tile(active, can)}
                    onClick={() => { const gg = G.current; if (!gg) return; gg.buildMode = active ? null : key; gg.masterPick = null; gg.selectedId = null; setBuildOpen(false); }}
                    disabled={!can}>
                    <TowerPortrait kind={key} size={44} />
                    <span style={{ fontSize: 10, fontWeight: "bold", lineHeight: 1.15 }}>{def.name}</span>
                    <span style={{ fontSize: 10, color: can ? "#e8d47a" : "#e07a72" }}>{def.cost}g</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

            {realmOpen && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(12,12,16,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 10, zIndex: 55, padding: 16, boxSizing: "border-box", overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto" }}>
                  <div style={{ fontSize: 16, letterSpacing: 3, color: "#d8b34a", textShadow: "2px 2px 0 #10131a" }}>CHOOSE YOUR REALM</div>
                  <button aria-label="Back" onClick={closeRealmSelect} style={{ ...btn, padding: "4px 12px", fontSize: 14 }}>✕</button>
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: -4 }}>Pick who you're fighting, then a realm to fight them on.</div>

                {/* which army marches — the campaign's chapter, in miniature */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10, width: "100%", maxWidth: 620 }}>
                  {Object.values(FACTIONS).map((f) => (
                    <button key={f.id} onClick={() => setFactionId(f.id)}
                      style={{
                        ...btn, display: "flex", flexDirection: "column", gap: 5, padding: 8, textAlign: "left",
                        ...(f.id === factionId
                          ? { background: "#5a4f2c", boxShadow: "inset -2px -2px 0 #3a3420, inset 2px 2px 0 #8a7746" }
                          : {}),
                      }}>
                      <span style={{ fontWeight: "bold", fontSize: 13, color: "#e8e0c8" }}>
                        {f.name} <span style={{ fontSize: 9, letterSpacing: 1, color: f.tagColor, marginLeft: 4 }}>{f.tag}</span>
                      </span>
                      <span style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 30 }}>
                        {f.types.map((ty) => <EnemyIcon key={ty} type={ty} box={26} />)}
                      </span>
                      <span style={{ fontSize: 10, opacity: 0.8, lineHeight: 1.45 }}>{f.blurb}</span>
                    </button>
                  ))}
                </div>

                {/* realms, grouped the way the war is: the four free realms
                    first, then each chapter's battlefields under its banner */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", maxWidth: 620, marginBottom: "auto" }}>
                {[
                  { name: "THE FREE REALMS", ids: ["proving", "greenwood", "frostfang", "mistmoor", "ember"] },
                  ...CHAPTERS.map((ch) => ({
                    name: `${ch.numeral}. ${ch.name.toUpperCase()}`,
                    ids: ch.levels.map((l) => l.realm).filter((id) => id !== "greenwood"),
                  })),
                ].map((grp) => (
                <div key={grp.name}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#d8b34a", margin: "10px 0 6px" }}>{grp.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
                  {grp.ids.map((id) => REALMS[id]).filter(Boolean).map((r) => (
                    <button key={r.id} onClick={() => chooseRealm(r.id)}
                      style={{ ...btn, display: "flex", gap: 10, padding: 8, alignItems: "stretch", ...(r.id === realmId ? { boxShadow: "inset 0 0 0 2px #7a6a3c" } : {}) }}>
                      <svg viewBox="0 0 150 100" width="108" height="72" style={{ flexShrink: 0, border: "2px solid #10131a", imageRendering: "pixelated" }}>
                        <rect x="0" y="0" width="150" height="100" fill={r.GRASS} />
                        {(r.rivers || []).map((rv, i) => (
                          <polyline key={`rv${i}`} points={rv.pts.map(([c, row]) => `${c * 10 + 5},${row * 10 + 5}`).join(" ")}
                            fill="none" stroke={r.water?.deep || "#3a6478"} strokeWidth={Math.max(4, (rv.w || 32) / 5)}
                            strokeLinejoin="round" strokeLinecap="round" />
                        ))}
                        <polyline points={r.path.map(([c, row]) => `${c * 10 + 5},${row * 10 + 5}`).join(" ")}
                          fill="none" stroke={r.PATH_EDGE} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
                        <polyline points={r.path.map(([c, row]) => `${c * 10 + 5},${row * 10 + 5}`).join(" ")}
                          fill="none" stroke={r.PATH_MAIN} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
                        {r.ponds.map((p, i) => (
                          <rect key={i} x={(p.x - p.w / 2) * 150 / W} y={(p.y - p.h / 2) * 100 / H} width={p.w * 150 / W} height={p.h * 100 / H}
                            fill={p.t === "lava" ? "#c05a32" : p.t === "ice" ? "#b8d4e0" : "#2c4638"} />
                        ))}
                        <circle cx={r.path[0][0] * 10 + 5} cy={r.path[0][1] * 10 + 5} r="4" fill="#e05248" />
                        <rect x={r.path[r.path.length - 1][0] * 10 - 1} y={r.path[r.path.length - 1][1] * 10 - 1} width="12" height="12" fill="#d8b34a" />
                      </svg>
                      <span style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left" }}>
                        <span style={{ fontWeight: "bold", fontSize: 13, color: "#e8e0c8" }}>
                          {r.name} <span style={{ fontSize: 9, letterSpacing: 1, color: r.tagColor, marginLeft: 4 }}>{r.tag}</span>
                        </span>
                        <span style={{ fontSize: 10, opacity: 0.8, lineHeight: 1.45 }}>{r.blurb}</span>
                      </span>
                    </button>
                  ))}
                </div>
                </div>
                ))}
                </div>
              </div>
            )}
    </div>
  );
}
