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
import { CHAPTERS, loadProgress, markCleared, resetProgress, currentLevel, nextLevel, levelById, loadCastle, saveCastle, towerUnlocked, unlocksFor, unlockLevel, bankTreasury, spendTreasury } from "./data/campaign.js";
import CastleWorksList from "./ui/CastleWorks.jsx";
import { CASTLE_WORKS, emptyWorks, worksBonusHp } from "./data/castle.js";
import { MILITIA, HEROES, heroXpFor, HERO_MAX_LEVEL, HERO_TALENTS, TALENT_RANKS, talentCost } from "./data/bands.js";
import { PTS } from "./engine/path.js";
import { coastOutline } from "./data/terrain.js";
import { loadProfile, bankLevel, bankFreeRun, heroRecord, bankHeroPoints, buyHeroTalent, MAX_STARS } from "./data/profile.js";
import { getStats, aimModes, forcedAim } from "./engine/towers.js";
import {
  towerNear, placeTower, upgradeTower, branchTower, ascendTower, sellTower,
  startWave, restartWave, masterPlan, masterPlans, placeMasterTower, completionCost, completeTower, MASTER_MIN, buyCastleWork, raiseCastleWork, nextCastleWork, callMilitia, fieldHero, heroBand,
} from "./engine/actions.js";
import { updateGame } from "./engine/update.js";
import { draw } from "./render/draw.js";
import TowerPortrait from "./ui/TowerPortrait.jsx";
import EnemyIcon from "./ui/EnemyIcon.jsx";
import EnemyTooltip from "./ui/EnemyTooltip.jsx";
import HomeScreen from "./ui/HomeScreen.jsx";
import CampaignMap from "./ui/CampaignMap.jsx";
import WarCouncil from "./ui/WarCouncil.jsx";
import FieldGuide, { describe } from "./ui/FieldGuide.jsx";
import { BookIcon, Star } from "./ui/Glyphs.jsx";
import { hasRig } from "./render/rigs.js";
import { useViewport, Fit } from "./ui/fit.jsx";
import "./ui/hud/hud.css";
import { GoldChip, LivesChip } from "./ui/hud/Chips.jsx";
import { towerTags, levelDeltas } from "./ui/hud/towerText.js";
import {
  CoinIcon, CastleIcon, SkullIcon, SwordIcon, BoltIcon, PlayIcon, PauseIcon, SpeedIcon, HammerIcon,
  LockIcon, CloseIcon, ChevronUp, ChevronDown, FlagIcon, InfoIcon,
} from "./ui/hud/icons.jsx";

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
  const [castleOpen, setCastleOpen] = useState(false);
  // the hero's talent card, and the talent armed by a first tap (a second buys it)
  const [talentsOpen, setTalentsOpen] = useState(false);
  const [armed, setArmed] = useState(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  const [banked, setBanked] = useState(0);   // gold carried home from the last won level
  // which hero rides with the crown; chosen in the pause menu, kept in the browser
  const [heroKey, setHeroKey] = useState(() => { try { return HEROES[localStorage.getItem("crownguard.hero")] ? localStorage.getItem("crownguard.hero") : "aldric"; } catch { return "aldric"; } });
  const pickHero = (key) => { setHeroKey(key); try { localStorage.setItem("crownguard.hero", key); } catch { /* private mode */ } };
  // which castle the works belong to: a campaign chapter, or a free-play realm
  const castleScope = useRef(null);
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
  // The screen, and the whole battle screen's box inside the safe area. When
  // the screen is wider than the 3:2 board (a phone on its side, a desktop),
  // the spare width becomes two RAILS beside the board that carry the HUD, so
  // nothing but the tower card ever covers the field. `s` is the size every
  // panel is drawn at (see ui/fit.jsx): 1 on an iPad, smaller on a phone.
  const vp = useViewport();
  const hudRef = useRef(null);
  const [hudBox, setHudBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = hudRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height);
      setHudBox((o) => (o.w === w && o.h === h ? o : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen]);
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

  const initGame = useCallback((startGold = 250, freeplay = true, castle = emptyWorks()) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // dev-server playtest knob: /?gold=5000 pads the war chest. Stripped from
    // production builds, so the shipped game can't be talked into it.
    const devGold = import.meta.env.DEV ? Math.max(0, Number(new URLSearchParams(window.location.search).get("gold")) || 0) : 0;
    const START_GOLD = startGold + devGold;
    G.current = {
      // tallies for the profile — banked when the level ends
      run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 },
      gold: START_GOLD, lives: CASTLE_HP + worksBonusHp(castle), wave: 0, phase: "build",
      // the works built on this castle: they came with the region, and stay
      castle: { ...castle },
      bands: [], militiaCd: 0,
      towers: [], enemies: [], projectiles: [], effects: [],
      spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
      selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
      cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false,
      // Master Builds: free play and the endless march only, and only once
      // the coffers have seen real money — masterSeen keeps it from blinking
      freeplay, masterBuild: false, masterSeen: false, masterPick: null,
    };
    // the hero rides out and waits before the gate: level 1 on every new
    // map, with the talents bought on all his earlier roads. heroBanked is
    // the highest level already paid out in talent points on this map, so a
    // restarted wave can't pay the same levels twice.
    {
      const [gx, gy] = PTS[PTS.length - 1];
      fieldHero(G.current, heroKey, 1, gx - 70, gy + (gy > H / 2 ? -50 : 50), heroRecord(loadProfile(), heroKey).talents);
      G.current.heroBanked = 1;
    }
    setBuildOpen(false);
    setCastleOpen(false);
    setTalentsOpen(false);
    setUi({ gold: START_GOLD, lives: CASTLE_HP + worksBonusHp(castle), wave: 0, phase: "build", selected: null, buildMode: null, speed: 1, paused: false, result: null, canRestart: false, cdSec: null, zoom: 1, rush: false });
  }, [heroKey]);

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
    castleScope.current = `free:${id}`;
    initGame(REALMS[id]?.startGold ?? 250, true, loadCastle(castleScope.current));
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
    castleScope.current = lv.chapter.id;
    initGame(lv.gold, false, loadCastle(castleScope.current));
    setRealmOpen(false);
    setMenuOpen(false);
    setScreen("game");
  };

  // Buy the next tier of a castle work. In the campaign the crown's
  // treasury pays and the work stays with the region; in free play the
  // run's purse pays and it stays with the realm.
  const buyWork = (key) => {
    const g = G.current;
    if (!g) return;
    let got = null;
    if (mode === "campaign") {
      const next = nextCastleWork(g, key);
      if (!next) return;
      const p = spendTreasury(next.cost);
      if (!p) return;
      setProgress(p);
      got = raiseCastleWork(g, key);
    } else got = buyCastleWork(g, key);
    if (!got) return;
    sfx.play("evolve");
    if (castleScope.current) saveCastle(castleScope.current, g.castle);
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
    if (ui.selected) { setBuildOpen(false); setCastleOpen(false); setTalentsOpen(false); }
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
    // a replay of a level already held opens no new hall
    const first = won && !loadProgress().cleared[levelId];
    setAward({ ...bankLevel(profile, lv, {
      livesLeft: ui.lives, maxLives: CASTLE_HP,
      waves: won ? lv.window.count : Math.max(0, ui.wave - 1),
      run: g?.run, won,
    }), first });
    if (g) g.run = { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 };
    setProfile(loadProfile());
    if (won) markCleared(levelId);
    // the gold left in the purse goes home to the crown's treasury
    if (won && g) { const carried = Math.floor(g.gold) + Math.floor((g.run?.goldEarned || 0) * 0.15); setBanked(carried); setProgress(bankTreasury(carried)); }
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
      // dev-server playtest handle: the live game object, for poking from the console
      if (import.meta.env.DEV) window.__g = g;

      // an engine fault must cost one tick, never the picture: log it once
      // per message and carry on drawing
      try { updateGame(g, dt); }
      catch (err) { const k = String(err?.message); if (!step.seen?.has(k)) { (step.seen ||= new Set()).add(k); console.error("updateGame failed", err); } }
      // a garrison sold mid-move takes its rally prompt with it
      if (g.rallyFor != null && g.rallyFor !== "hero" && g.rallyFor !== "militia" && !g.towers.some((t) => t.id === g.rallyFor)) g.rallyFor = null;
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
      const castleKey = g.castle ? `${g.castle.archers}${g.castle.ballista}${g.castle.guards}${g.castle.masons}` : "";
      const hb = heroBand(g);
      const hu = hb?.units[0];
      // every level the hero gains banks a talent point, for good, at once
      if (hb && hb.level > (g.heroBanked || 1)) {
        bankHeroPoints(hb.hero, hb.level - (g.heroBanked || 1), hb.level);
        g.heroBanked = hb.level;
        setProfile(loadProfile());
      }
      const heroKeyUi = hb ? `${hb.hero}|${hb.level}|${hb.xp}|${JSON.stringify(hb.talents || {})}|${hu.state}|${Math.round(hu.hp)}|${hu.maxHp}|${hu.state === "dead" ? Math.ceil(hu.respawn / 1000) : 0}` : "";
      const militiaSec = Math.ceil((g.militiaCd || 0) / 1000);
      if (u.masterShow !== masterShow || u.masterOn !== !!g.masterBuild || u.masterPick !== pickKey || u.rallyFor !== rallyFor || u.gold !== Math.floor(g.gold) || u.lives !== g.lives || u.wave !== g.wave || u.phase !== g.phase || u.selKey !== selKey || u.buildMode !== g.buildMode || u.speed !== g.speed || u.paused !== g.paused || u.canRestart !== canRestart || u.cdSec !== cdSec || u.zoom !== g.cam.zoom || u.camX !== camX || u.camY !== camY || u.rush !== g.rush || u.castleKey !== castleKey || u.heroKey !== heroKeyUi || u.militiaSec !== militiaSec) {
        setUi({
          heroKey: heroKeyUi, militiaSec,
          hero: hb ? { key: hb.hero, name: hb.name, level: hb.level, xp: hb.xp, talents: { ...(hb.talents || {}) }, next: heroXpFor(hb.level), dead: hu.state === "dead", hp: Math.max(0, Math.round(hu.hp)), maxHp: hu.maxHp, respawn: hu.state === "dead" ? Math.ceil(hu.respawn / 1000) : 0 } : null,
          castleKey, castle: { ...(g.castle || emptyWorks()) }, castleRanks: { ...(g.castleRanks || {}) }, maxLives: CASTLE_HP + worksBonusHp(g.castle, g.castleRanks),
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
    if (g.rallyFor === "hero") {
      const b = heroBand(g);
      if (b) { b.rally = { x, y }; g.effects.push({ type: "levelup", x, y, ttl: 500 }); }
      g.rallyFor = null;
      return;
    }
    if (g.rallyFor === "militia") {
      if (callMilitia(g, x, y)) sfx.play("horn");
      g.rallyFor = null;
      return;
    }
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
    // tapping the hero himself asks where he should go
    {
      const b = heroBand(g);
      const u = b?.units[0];
      if (u && u.state !== "dead" && Math.hypot(x - u.x, y - (u.y - 6)) < 16) { g.rallyFor = "hero"; g.selectedId = null; return; }
    }
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

  // enemy chips (icon in a socket + count + hover tooltip) shared by both
  // wave panels; panelKey keeps hover state independent when a type appears in both.
  const waveChips = (comp, panelKey) => comp.map(({ type, count }) => {
    const hk = `${panelKey}:${type}`;
    const boss = ENEMIES[type].boss;
    return (
      <div key={hk}
        onMouseEnter={() => setHoverEnemy(hk)}
        onMouseLeave={() => setHoverEnemy((cur) => (cur === hk ? null : cur))}
        onClick={() => setHoverEnemy((cur) => (cur === hk ? null : hk))}
        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
        {hoverEnemy === hk && <EnemyTooltip type={type} />}
        <span className="cg-well" style={{ width: boss ? 54 : 44, height: boss ? 54 : 44, display: "flex", alignItems: "center", justifyContent: "center", ...(boss ? { background: "#4a1e22" } : {}) }}>
          <EnemyIcon type={type} box={boss ? 44 : 32} />
        </span>
        <span className="cg-num" style={{ fontSize: 13, color: boss ? "#ff8a78" : "var(--cream)", textShadow: "1px 1px 0 var(--ink)" }}>×{count}</span>
      </div>
    );
  });

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
        onBuyWork={(chapterId, key, next) => {
          const p = spendTreasury(next.cost);
          if (!p) return;
          const works = loadCastle(chapterId);
          works[key] = (works[key] || 0) + 1;
          saveCastle(chapterId, works);
          setProgress(loadProgress());
        }}
      />
    );
  }

  // ---- the HUD ----
  // The board fills the screen; the purse, the horn, the build button and the
  // rest sit either in RAILS beside the board (when the screen is wider than
  // 3:2 — a phone on its side, a desktop) or float over the field's corners
  // (an iPad, where the board fills the screen edge to edge). Every panel is
  // drawn at the screen's UI scale `s` (ui/fit.jsx), so a phone gets the same
  // HUD, smaller, rather than a HUD that runs off the edge. Nothing on this
  // screen scrolls but long lists. The skin lives in ui/hud/hud.css.
  const masterOn = !!(ui.masterShow && ui.masterOn);
  const cls = (...c) => c.filter(Boolean).join(" ");
  const price = (n, can = true, size = 12) => (
    <span className={cls("cg-price", !can && "is-short")}><CoinIcon size={size} />{n}</span>
  );
  const s = vp.scale;
  const spare = hudBox.w - hudBox.h * 1.5;
  const railsOn = hudBox.w > 0 && spare >= 200;
  const railW = railsOn ? Math.min(Math.floor(spare / 2), 200) : 0;
  // a rail is at least 150 design pixels wide inside: narrower rails draw smaller
  const sR = railsOn ? Math.min(s, railW / 150) : s;
  const scaleAt = (origin) => (s === 1 ? {} : { transform: `scale(${s})`, transformOrigin: origin });
  // a small square close button that sits ON a panel's upper-right corner,
  // outside the part that scrolls, so it never scrolls away
  const cornerX = (label, onClick) => (
    <button aria-label={label} className="cg-btn cg-btn--slate cg-x cg-corner-x" onClick={onClick}><CloseIcon size={12} /></button>
  );
  // A card floating over the board: `width` design pixels wide at `left`
  // (board px), as tall as its contents up to the board's full height. It
  // hangs at height fraction `f` of the board (0 top, 1 bottom) so it sits
  // level with what it describes. Only its insides scroll; its ✕ rides the
  // upper-right corner, and a tap on the field closes it too.
  const CARD_M = 24 * s;
  const floatCard = ({ id, left, width, f, origin, closeLabel, onClose, children }) => (
    <div key={id} style={{
      position: "absolute", left, top: CARD_M, width, height: (boardCss.h - 2 * CARD_M) / s,
      transform: `scale(${s})`, transformOrigin: "0 0", zIndex: 25,
      display: "flex", flexDirection: "column", pointerEvents: "none",
    }}>
      <div style={{ flex: `${f} 1 0px` }} />
      <div className="cg-pop" style={{ position: "relative", flex: "0 1 auto", minHeight: 0, display: "flex", flexDirection: "column", pointerEvents: "auto", transformOrigin: origin }}>
        <div className="cg-frame cg-scroll" style={{ padding: 12, overflowY: "auto", overscrollBehavior: "contain", minHeight: 0, flex: "0 1 auto" }}>{children}</div>
        {cornerX(closeLabel, onClose)}
      </div>
      <div style={{ flex: `${1 - f} 1 0px` }} />
    </div>
  );
  // what the next tap will do, on a parchment ribbon across the top of the board
  const ribbon = (text, label, cancel) => (
    <div style={{
      position: "absolute", top: 8, left: "50%", zIndex: 22, pointerEvents: "none", width: "max-content",
      maxWidth: (boardCss.w * (railsOn ? 0.92 : 0.62)) / s, transform: `translateX(-50%) scale(${s})`, transformOrigin: "50% 0",
    }}>
      <div className="cg-ribbon cg-pop" style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px 4px 12px" }}>
        <span>{text}</span>
        <button className="cg-btn cg-btn--slate cg-x" aria-label={label} onClick={cancel} style={{ pointerEvents: "auto" }}><CloseIcon size={11} /></button>
      </div>
    </div>
  );
  const cancelRally = () => { if (G.current) G.current.rallyFor = null; };
  const openBuild = () => { setBuildOpen((o) => !o); setCastleOpen(false); setTalentsOpen(false); if (G.current) { G.current.selectedId = null; G.current.buildMode = null; } };
  const openCastle = () => { setCastleOpen((o) => !o); setBuildOpen(false); setTalentsOpen(false); if (G.current) { G.current.selectedId = null; G.current.buildMode = null; } };
  const cycleSpeed = () => { if (G.current) G.current.speed = G.current.speed === 1 ? 2 : G.current.speed === 2 ? 4 : 1; };

  // -- the purse, the castle, the level --
  const purse = (
    <>
      <GoldChip gold={ui.gold} />
      <LivesChip lives={ui.lives} max={ui.maxLives || CASTLE_HP} base={CASTLE_HP} />
      {level && railsOn && (
        <div className="cg-panel" style={{ padding: "5px 9px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="cg-label" style={{ fontSize: 10 }}>Chapter {level.chapter.numeral}</span>
          <span className="cg-display" style={{ fontSize: 12, color: "var(--cream)", lineHeight: 1.15 }}>{level.name}</span>
        </div>
      )}
      {level && !railsOn && boardCss.w > 760 && (
        <div className="cg-panel cg-chip" style={{ gap: 6 }}>
          <span className="cg-label">Ch. {level.chapter.numeral}</span>
          <span className="cg-display" style={{ fontSize: 12, color: "var(--cream)" }}>{level.name}</span>
        </div>
      )}
    </>
  );

  // -- build, the castle works, speed and pause --
  const resetBtn = ui.zoom > 1 && <button title="Reset view" className="cg-btn cg-btn--slate" style={{ fontSize: 12 }} onClick={() => setZoom(1)}>Reset view</button>;
  const buildBtn = ui.result == null && (
    <button aria-label="Open build menu" className={cls("cg-btn", buildOpen && "is-on")} style={railsOn ? { minHeight: 58, fontSize: 15, gap: 8 } : { gap: 7, padding: "0 12px 0 10px" }} onClick={openBuild}>
      <HammerIcon size={railsOn ? 22 : 18} /> Build
    </button>
  );
  const castleBtn = ui.result == null && (
    <button aria-label="Open the castle works" title="Castle works: defences built on the wall itself, kept for the whole region"
      className={cls("cg-btn", castleOpen && "is-on")} onClick={openCastle}>
      <CastleIcon size={20} />{railsOn && <span>Castle</span>}
    </button>
  );
  const speedBtn = (
    <button title="Game speed" aria-label={`Game speed ${ui.speed}x`} className={cls("cg-btn", ui.speed > 1 && "is-on")} style={{ minWidth: 62, gap: 5, padding: "0 8px", ...(railsOn ? { flex: 1 } : {}) }} onClick={cycleSpeed}>
      <SpeedIcon speed={ui.speed} size={14} /><span>{ui.speed}x</span>
    </button>
  );
  const pauseBtn = (
    <button title="Pause and open the menu" aria-label="Pause and open the menu" className={cls("cg-btn", menuOpen && "is-on")} style={railsOn ? { flex: 1 } : undefined} onClick={openMenu}>
      <PauseIcon size={16} />
    </button>
  );

  // -- the militia horn and the hero --
  const militiaBtn = ui.result == null && (
    <button aria-label="Call the militia" title={MILITIA.blurb}
      className={cls("cg-btn", ui.rallyFor === "militia" && "is-on")}
      style={{ minHeight: 60, minWidth: 64, flexDirection: "column", gap: 1, padding: "3px 8px", overflow: "hidden" }}
      disabled={ui.militiaSec > 0}
      onClick={() => { const g = G.current; if (!g) return; g.rallyFor = g.rallyFor === "militia" ? null : "militia"; g.selectedId = null; g.buildMode = null; setBuildOpen(false); setCastleOpen(false); }}>
      {/* the cooldown drains down the plank like sand */}
      {ui.militiaSec > 0 && <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.min(100, (100 * ui.militiaSec * 1000) / MILITIA.cooldown)}%`, background: "rgba(20,12,22,0.45)" }} />}
      {hasRig("farmer") ? <EnemyIcon type="farmer" box={28} /> : <span style={{ fontSize: 18 }}>{MILITIA.icon}</span>}
      <span style={{ fontSize: 12, position: "relative" }}>{ui.militiaSec > 0 ? `${ui.militiaSec}s` : "Militia"}</span>
    </button>
  );
  const heroBtn = ui.result == null && ui.hero && (() => {
    const hpf = ui.hero.hp / ui.hero.maxHp;
    const max = ui.hero.level >= HERO_MAX_LEVEL;
    return (
      <button aria-label="Move the hero" title={HEROES[ui.hero.key]?.blurb}
        className={cls("cg-btn cg-btn--slate", ui.rallyFor === "hero" && "is-on", ui.hero.dead && "is-off")}
        style={{ minHeight: 60, minWidth: railsOn ? 0 : 150, padding: "5px 8px 5px 5px", gap: 7, justifyContent: "flex-start" }}
        onClick={() => { const g = G.current; if (!g || ui.hero.dead) return; g.rallyFor = g.rallyFor === "hero" ? null : "hero"; g.selectedId = null; g.buildMode = null; setBuildOpen(false); setCastleOpen(false); }}>
        <span className="cg-well" style={{ width: 42, height: 46, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {hasRig(HEROES[ui.hero.key]?.rig) ? <EnemyIcon type={HEROES[ui.hero.key].rig} box={34} /> : <span style={{ fontSize: 20 }}>{HEROES[ui.hero.key]?.icon}</span>}
        </span>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: railsOn ? 0 : 88 }}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 11 }}>{ui.hero.name}</span>
            <span style={{ fontSize: 10, color: "var(--gold-lt)" }}>Lv {ui.hero.level}</span>
          </span>
          <span className="cg-bar"><i style={{ width: `${Math.round(100 * hpf)}%`, background: hpf > 0.5 ? "#7ad06a" : hpf > 0.25 ? "#e8c14a" : "#e07a72" }} /></span>
          <span className="cg-bar" style={{ height: 5 }}><i style={{ width: max ? "100%" : `${Math.round(100 * Math.min(1, ui.hero.xp / ui.hero.next))}%`, background: "var(--blue)" }} /></span>
          <span style={{ fontFamily: "var(--body)", fontWeight: "normal", textShadow: "none", fontSize: 9, color: "var(--muted)", display: "flex", justifyContent: "space-between", gap: 6 }}>
            <span>{ui.hero.dead ? `back in ${ui.hero.respawn}s` : `${ui.hero.hp}/${ui.hero.maxHp}`}</span>
            <span>{max ? "MAX" : `xp ${ui.hero.xp}/${ui.hero.next}`}</span>
          </span>
        </span>
      </button>
    );
  })();

  // -- the hero's talents: a star on the hero's panel showing the points
  // banked (it glows while a rank is affordable), and the card it opens.
  // Points come from every level a hero gains in battle and are kept for
  // good in the profile; ranks cost TALENT_COSTS. --
  const heroRec = ui.hero ? heroRecord(profile, ui.hero.key) : null;
  const heroList = ui.hero ? HERO_TALENTS[ui.hero.key] || [] : [];
  const affordable = !!heroRec && heroList.some((t) => { const c = talentCost(heroRec.talents[t.id] || 0); return c != null && heroRec.points >= c; });
  const talentBtn = ui.result == null && ui.hero && (
    <button aria-label={`Hero talents — ${heroRec.points} points`} title="Talents: every level the hero gains banks a point"
      className={cls("cg-btn", affordable ? "cg-btn--gold cg-horn" : "cg-btn--slate", talentsOpen && "is-on")}
      style={railsOn ? { minHeight: 40, gap: 8, justifyContent: "flex-start", padding: "0 10px" } : { minHeight: 60, minWidth: 48, padding: "0 6px", flexDirection: "column", gap: 2 }}
      onClick={() => { setTalentsOpen((o) => !o); setArmed(null); setBuildOpen(false); setCastleOpen(false); if (G.current) G.current.selectedId = null; }}>
      <Star size={18} lit />
      {railsOn && <span style={{ flex: 1, textAlign: "left" }}>Talents</span>}
      <span className="cg-num" style={{ fontSize: 11, textShadow: "none" }}>{heroRec.points}</span>
    </button>
  );
  const talentCard = talentsOpen && ui.hero && !sel && (() => {
    const h = ui.hero;
    const buy = (id) => {
      if (armed !== id) { setArmed(id); return; }
      setArmed(null);
      const p = buyHeroTalent(h.key, id);
      if (!p) return;
      // the rank bites at once: the engine rebuilds the hero's stats every tick
      const b = heroBand(G.current);
      if (b && b.hero === h.key) b.talents = { ...heroRecord(p, h.key).talents };
      sfx.play("evolve");
      setProfile(p);
    };
    const cw = 272 * s;
    // beside the hero's panel: the left rail's foot, or the board's lower right
    const left = railsOn ? CARD_M * 0.5 : Math.max(6 * s, boardCss.w - cw - CARD_M);
    return floatCard({
      id: "talents", left, width: 272, f: 1, origin: railsOn ? "left bottom" : "right bottom",
      closeLabel: "Close talents", onClose: () => { setTalentsOpen(false); setArmed(null); },
      children: (<>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 16 }}>
          <span className="cg-well" style={{ width: 40, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {hasRig(HEROES[h.key]?.rig) ? <EnemyIcon type={HEROES[h.key].rig} box={32} /> : <span>{HEROES[h.key]?.icon}</span>}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cg-display" style={{ fontWeight: 700, color: "var(--gold-lt)", fontSize: 13, textShadow: "1px 1px 0 var(--ink)" }}>{h.name} · Lv {h.level}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
              <b className="cg-num" style={{ fontSize: 13, color: "var(--gold-lt)", textShadow: "1px 1px 0 var(--ink)" }}>{heroRec.points}</b> points · +1 every level
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {heroList.map((t) => {
            const r = heroRec.talents[t.id] || 0;
            const cost = talentCost(r);
            const full = cost == null;
            const can = !full && heroRec.points >= cost;
            const isArmed = armed === t.id && can;
            return (
              <button key={t.id} className={cls("cg-btn", isArmed ? "cg-btn--gold" : "cg-btn--parch", !can && !full && "is-poor", full && "is-on")}
                disabled={!can}
                style={{ width: "100%", padding: "6px 8px", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 48, ...(full ? { filter: "none", cursor: "default" } : {}) }}
                onClick={() => buy(t.id)}>
                <span className={can || full ? undefined : "cg-dim"} style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, textAlign: "left" }}>
                  <span className="cg-display" style={{ fontSize: 12, fontWeight: 700 }}>{isArmed ? `Tap again — ${cost} points` : t.name}</span>
                  <span style={{ fontSize: 10, lineHeight: 1.35, color: isArmed ? "var(--wood-deep)" : "#5a4630" }}>{t.desc}</span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span className="cg-pips">
                    {Array.from({ length: TALENT_RANKS }, (_, i) => <span key={i} className={cls("cg-pip", i < r && "on")} />)}
                  </span>
                  <span className="cg-num" style={{ fontSize: 10, textShadow: "none", color: full ? "#3f7a2a" : can ? "var(--gold-deep)" : "#b4302a" }}>{full ? "MAX" : `${cost} pts`}</span>
                </span>
              </button>
            );
          })}
        </div>
      </>),
    });
  })();

  // -- the horn. While the field is quiet it is a gold "▶ WAVE 3/18" with
  // who is coming and the early-start bonus; while it fights, a plain slate
  // "WAVE 3/18". Its arrow pops up the wave's full makeup and the rush
  // switch. In a rail it stands as a column rather than a row. --
  const horn = (() => {
    const nextWave = ui.phase === "build" ? ui.wave + 1 : ui.wave;
    const comp = nextWave >= 1 ? waveComposition(nextWave) : [];
    const total = ui.wave > scriptedWaves() ? "∞" : scriptedWaves();
    const fighting = ui.phase !== "build";
    const small = { fontSize: 12, opacity: 0.75, marginLeft: 1 };
    // the horn shows the three biggest threats: bosses first, then the most numerous
    const lead = [...comp].sort((a, b) => (ENEMIES[b.type].boss ? 1e6 : b.count) - (ENEMIES[a.type].boss ? 1e6 : a.count)).slice(0, 3);
    const leadRow = lead.length > 0 && (
      <span style={{ display: "flex", gap: 3 }}>
        {lead.map(({ type, count }) => (
          <span key={type} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            <span className="cg-well" style={{ width: 30, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: ENEMIES[type].boss ? "#e8b0a0" : "var(--parch)", boxShadow: "inset 2px 2px 0 var(--parch-dk)" }}>
              <EnemyIcon type={type} box={23} />
            </span>
            <span style={{ fontSize: 10, lineHeight: 1, marginTop: 1 }}>×{count}</span>
          </span>
        ))}
      </span>
    );
    const title = (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
        <span style={{ fontSize: 10, letterSpacing: 1.5 }}>WAVE</span>
        <span className="cg-num" style={{ fontSize: 18, textShadow: "1px 1px 0 rgba(255,243,210,0.5)" }}>{ui.wave + 1}<span style={small}>/{ui.wave + 1 > scriptedWaves() ? "∞" : scriptedWaves()}</span></span>
      </span>
    );
    const bonus = ui.cdSec != null && (
      <span style={{ display: "flex", flexDirection: railsOn ? "row" : "column", alignItems: railsOn ? "center" : "flex-end", gap: railsOn ? 6 : 0, lineHeight: 1.1, paddingLeft: 2 }}>
        <span className="cg-num" style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, textShadow: "none" }}>+{Math.min(45, Math.ceil(ui.cdSec * 1.5))}<CoinIcon size={11} /></span>
        <span className="cg-num" style={{ fontSize: 9, opacity: 0.8, textShadow: "none" }}>{ui.cdSec}s</span>
      </span>
    );
    return (
      <div style={{ position: "relative" }}>
        {infoOpen && (
          <div className="cg-frame cg-pop" style={{ position: "absolute", left: 0, bottom: "calc(100% + 8px)", padding: 12, minWidth: 230, maxWidth: 360, width: "max-content", transformOrigin: "bottom left", zIndex: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="cg-label" style={{ flex: 1 }}>Wave {nextWave} — {fighting ? "on the field" : ui.wave >= scriptedWaves() ? "next · endless" : "next"}</span>
              <button aria-label="Close wave info" className="cg-btn cg-btn--slate cg-x" onClick={() => setInfoOpen(false)}><CloseIcon size={11} /></button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
              {comp.length ? waveChips(comp, fighting ? "cur" : "next") : <span style={{ fontSize: 11, color: "var(--muted)" }}>Nothing yet.</span>}
            </div>
            <button
              title="Sound the horn the moment a wave is cleared, for the full early-start bonus every time"
              className={cls("cg-btn cg-btn--slate", ui.rush && "is-on")}
              style={{ width: "100%", justifyContent: "flex-start", gap: 8 }}
              onClick={() => { const g = G.current; if (g) g.rush = !g.rush; }}>
              <BoltIcon size={16} /><span>Rush</span>
              <span style={{ fontFamily: "var(--body)", fontWeight: "normal", fontSize: 10, textShadow: "none", color: "var(--muted)" }}>auto-horn</span>
              <span className={ui.rush ? "cg-btn--gold" : ""} style={{ marginLeft: "auto", minWidth: 40, textAlign: "center", padding: "3px 6px", border: "2px solid var(--ink)", fontSize: 12, background: ui.rush ? "var(--gold)" : "var(--slate-dk)", color: ui.rush ? "var(--wood-deep)" : "var(--muted)", textShadow: "none" }}>{ui.rush ? "ON" : "OFF"}</span>
            </button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {fighting ? (
            <div className="cg-panel" style={{ minHeight: 50, padding: "0 12px 0 10px", display: "flex", alignItems: "center", gap: 8, ...(railsOn ? { flex: 1 } : {}) }}>
              <SkullIcon size={18} />
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                <span className="cg-label" style={{ fontSize: 10, color: "var(--muted)" }}>Wave</span>
                <span className="cg-num" style={{ fontSize: 22, color: "var(--cream)" }}>{ui.wave}<span style={small}>/{total}</span></span>
              </span>
            </div>
          ) : railsOn ? (
            <button className={cls("cg-btn cg-btn--gold", ui.cdSec != null && "cg-horn")} style={{ flex: 1, minWidth: 0, minHeight: 50, padding: "7px 6px 6px", flexDirection: "column", alignItems: "stretch", gap: 5 }}
              aria-label={`Sound the horn: start wave ${ui.wave + 1}`}
              onClick={() => startWave(G.current)}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><PlayIcon size={18} />{title}</span>
              {leadRow}
              {bonus}
            </button>
          ) : (
            <button className={cls("cg-btn cg-btn--gold", ui.cdSec != null && "cg-horn")} style={{ minHeight: 50, padding: "0 10px 0 9px", gap: 8 }}
              aria-label={`Sound the horn: start wave ${ui.wave + 1}`}
              onClick={() => startWave(G.current)}>
              <PlayIcon size={18} />
              {title}
              {leadRow}
              {bonus}
            </button>
          )}
          <button aria-label={infoOpen ? "Hide wave info" : "Show wave info"}
            className={cls("cg-btn", fighting ? "cg-btn--slate" : "", infoOpen && "is-on")}
            style={{ minWidth: 38, padding: 0, marginLeft: -2, minHeight: 50, flexDirection: "column", gap: 3 }}
            onClick={() => setInfoOpen((o) => !o)}>
            {infoOpen ? <ChevronDown size={7} /> : <ChevronUp size={7} />}
            {ui.rush && <BoltIcon size={11} />}
          </button>
        </div>
      </div>
    );
  })();

  // A side drawer (build, castle works): slides in over the right of the
  // screen, `w` design pixels wide at the UI scale. Its head stays put; only
  // the list below it scrolls, and only when it must.
  const drawer = (open, w, children) => (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: `calc(${Math.round(w * s)}px + env(safe-area-inset-right))`, zIndex: 40,
      boxSizing: "border-box", paddingTop: "env(safe-area-inset-top)", paddingRight: "env(safe-area-inset-right)", background: "var(--slate)",
      transform: open ? "translateX(0)" : "translateX(104%)", transition: "transform 0.2s ease",
    }}>
      <div style={{ position: "relative", height: "100%" }}>
        <div className="cg-drawer" style={{
          position: "absolute", top: 0, left: 0, width: w, height: `${100 / s}%`, boxSizing: "border-box",
          transform: s === 1 ? undefined : `scale(${s})`, transformOrigin: "0 0", display: "flex", flexDirection: "column",
        }}>
          {children}
        </div>
      </div>
    </div>
  );
  // as many columns of towers as it takes for the whole roster to show at once
  const buildCols = (() => {
    const n = Object.keys(TOWERS).length;
    const room = (vp.h / s) - 62;      // below the drawer's head, in design px
    for (let c = 2; c < 5; c++) if (Math.ceil(n / c) * 107 <= room) return c;
    return 5;
  })();

  // A rail: a column of the screen's spare width beside the board, its
  // contents drawn at the rail's own scale and filling its whole height.
  const rail = (side, top, bottom) => (
    <div style={{ width: railW, flexShrink: 0, position: "relative", zIndex: 30 }}>
      <div style={{
        position: "absolute", top: 0, [side]: 0, width: railW / sR, height: hudBox.h / sR,
        transform: `scale(${sR})`, transformOrigin: `top ${side}`, boxSizing: "border-box",
        padding: 8, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{top}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{bottom}</div>
      </div>
    </div>
  );

  return (
    <div ref={hudRef} className="cg-hud" style={{
      height: "100dvh", background: "#17111b", boxSizing: "border-box",
      display: "flex", overflow: "hidden",
      paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)", paddingBottom: "env(safe-area-inset-bottom)",
    }}>
        {menuOpen && (() => {
          // on a phone on its side the menu lies in two columns, so it fits at full size
          const two = vp.short && vp.landscape;
          const head = (
            <div style={{ textAlign: "center", marginBottom: 2 }}>
              <div className="cg-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3, color: "var(--gold)", textShadow: "2px 2px 0 var(--ink)" }}>PAUSED</div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                {level && <span>Chapter {level.chapter.numeral} · </span>}
                <b style={{ color: REALMS[realmId].tagColor }}>{REALMS[realmId].name}</b> · Wave {ui.wave}/{scriptedWaves()}
              </div>
            </div>
          );
          const resume = (
            <button className="cg-btn cg-btn--gold" style={{ minHeight: 54, fontSize: 16, fontWeight: 700 }} onClick={closeMenu}>
              <PlayIcon size={15} /> Resume
            </button>
          );
          const opts = (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="cg-btn" onClick={openGuide}><BookIcon size={16} /> Field Guide</button>
              <button className={cls("cg-btn", sndMuted && "is-on")} onClick={() => { sfx.setMuted(!sfx.muted); setSndMuted(sfx.muted); }}>
                Sound: {sndMuted ? "Off" : "On"}
              </button>
            </div>
          );
          const heroes = (
            <>
              <div className="cg-label" style={{ marginTop: two ? 0 : 4 }}>Hero</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(HEROES).map(([key, h]) => (
                  <button key={key} title={h.blurb} className={cls("cg-btn cg-btn--slate", heroKey === key && "is-on")}
                    style={{ flex: 1, minHeight: 56, padding: "4px 6px", justifyContent: "flex-start", gap: 6 }}
                    onClick={() => pickHero(key)}>
                    {hasRig(h.rig) ? <EnemyIcon type={h.rig} box={30} /> : <span>{h.icon}</span>}
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                      <span style={{ fontSize: 12 }}>{h.name}</span>
                      <span style={{ fontFamily: "var(--body)", fontWeight: "normal", fontSize: 9.5, textShadow: "none", color: heroKey === key ? "var(--gold-lt)" : "var(--muted)" }}>{heroKey === key ? "riding with you" : "next level"}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          );
          const leave = (
            <>
              <button className="cg-btn" disabled={!ui.canRestart}
                onClick={() => { restartWave(G.current); closeMenu(); }}>
                Restart Wave
              </button>
              {mode === "campaign" ? (
                <button className="cg-btn" onClick={openMap}>Campaign Map</button>
              ) : (
                <button className="cg-btn" onClick={() => { openRealmSelect("game"); closeMenu(); }}>Choose Realm...</button>
              )}
              <button className="cg-btn cg-btn--slate" onClick={goHome}>Main Menu</button>
            </>
          );
          const rule = <div style={{ height: 2, background: "var(--ink)", margin: "4px 0 2px", boxShadow: "0 1px 0 var(--slate-lt)" }} />;
          const col = { display: "flex", flexDirection: "column", gap: 9, minWidth: 0 };
          return (
            // a tap on the dark around the menu is Resume too
            <div onClick={closeMenu} style={{
              position: "fixed", inset: 0, zIndex: 50, background: "rgba(22,14,26,0.8)", boxSizing: "border-box",
              padding: "max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
            }}>
              <Fit max={1} deps={[two]}>
                <div onClick={(e) => e.stopPropagation()} className="cg-frame cg-pop"
                  style={{ width: two ? 620 : 340, margin: "0 auto", padding: "16px 18px 18px", display: "grid", gridTemplateColumns: two ? "1fr 1fr" : "1fr", gap: two ? 18 : 9 }}>
                  {two ? (
                    <>
                      <div style={col}>{head}{resume}{opts}</div>
                      <div style={col}>{heroes}{rule}{leave}</div>
                    </>
                  ) : (
                    <div style={col}>{head}{resume}{opts}{heroes}{rule}{leave}</div>
                  )}
                </div>
              </Fit>
            </div>
          );
        })()}

        {guideOpen && <FieldGuide onClose={closeGuide} />}

      {/* landscape only: a touch screen held upright is asked to turn */}
      {portrait && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "#17111b", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="cg-frame" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "22px 22px 20px", maxWidth: 320 }}>
            <div className="cg-display" style={{ fontSize: 46, lineHeight: 1, color: "var(--gold)", textShadow: "2px 2px 0 var(--ink)" }}>⟳</div>
            <div className="cg-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: "var(--gold)", textShadow: "2px 2px 0 var(--ink)" }}>TURN YOUR DEVICE</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Crownguard is played sideways — turn to landscape and the war resumes.</div>
          </div>
        </div>
      )}

      {/* ---- the left rail: the purse, the hero, the horn ---- */}
      {railsOn && rail("left", purse, <>{talentBtn}{heroBtn}{horn}</>)}

      {/* ---- the field, letterboxed to 3:2 in whatever is left beside the rails ---- */}
      <div ref={boardCellRef} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: boardCss.w, height: boardCss.h, overflow: "hidden", background: REALMS[realmId].GRASS }}>
          <canvas
            ref={canvasRef} width={W * RES} height={H * RES}
            onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerCancel={onCanvasCancel}
            onPointerLeave={(ev) => { if (ev.pointerType === "mouse" && G.current) G.current.hover = null; }}
            onContextMenu={(ev) => ev.preventDefault()}
            style={{ width: "100%", height: "100%", display: "block", cursor: ui.buildMode ? "copy" : ui.zoom > 1 ? "grab" : "pointer", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          />

          {/* over the board's corners, when there are no rails to carry them */}
          {!railsOn && (
            <>
              <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6, zIndex: 20, pointerEvents: "none", ...scaleAt("top left") }}>{purse}</div>
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6, zIndex: 20, ...scaleAt("top right") }}>{resetBtn}{buildBtn}{castleBtn}{speedBtn}{pauseBtn}</div>
              {ui.result == null && <div style={{ position: "absolute", right: 8, bottom: 8, display: "flex", gap: 6, zIndex: 20, alignItems: "flex-end", ...scaleAt("bottom right") }}>{militiaBtn}{heroBtn}{talentBtn}</div>}
              <div style={{ position: "absolute", left: 8, bottom: 8, zIndex: 20, ...scaleAt("bottom left") }}>{horn}</div>
            </>
          )}

          {/* top centre: what the next tap will do */}
          {ui.buildMode && ribbon(
            <>Placing <b>{(ui.masterOn && ui.masterPickName) || TOWERS[ui.buildMode].name}</b> — tap the {TOWERS[ui.buildMode].water ? "water" : "grass"}{ui.buildMode === "knight" ? "; knights muster south of the hall" : ""}.</>,
            "Cancel placement", () => { if (G.current) G.current.buildMode = null; })}
          {ui.rallyFor === "hero" && ribbon(
            <><b>{ui.hero?.name}</b> awaits your word — tap where the hero should go.</>, "Cancel hero move", cancelRally)}
          {ui.rallyFor === "militia" && ribbon(
            <>Sounding for the <b>militia</b> — tap where the farmers should stand.</>, "Cancel militia call", cancelRally)}
          {ui.rallyFor != null && ui.rallyFor !== "hero" && ui.rallyFor !== "militia" && ribbon(
            <>Posting the <b>rally flag</b> — tap where the knights should stand.</>, "Cancel rally move", cancelRally)}



            {talentCard}

            {!ui.buildMode && !sel && ui.masterShow && ui.masterOn && masterInfo && (() => {
              const { nums, traits } = describe(masterInfo.stats);
              // anchored to the board's left edge: the master drawer covers the right
              return floatCard({
                id: "master-info", left: 10 * s, width: 260, f: 0, origin: "left top",
                closeLabel: "Close info", onClose: () => setMasterInfo(null),
                children: (<>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingRight: 16 }}>
                    <span className="cg-well" style={{ padding: 2, display: "flex" }}><TowerPortrait kind={masterInfo.kind} branch={masterInfo.branch} rank4={masterInfo.rank4} size={40} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cg-display" style={{ fontWeight: 700, color: "var(--gold-lt)", fontSize: 13, textShadow: "1px 1px 0 var(--ink)" }}>{masterInfo.name}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>{price(masterInfo.cost, ui.gold >= masterInfo.cost, 10)} · {TOWERS[masterInfo.kind].name}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, marginTop: 8, lineHeight: 1.55 }}>{masterInfo.desc}</div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>{nums.join(" · ")}</div>
                  {traits.length > 0 && <div style={{ fontSize: 10.5, color: "var(--green)", marginTop: 3, lineHeight: 1.55 }}>{traits.join(" · ")}</div>}
                </>),
              });
            })()}

            {sel && selDef && ui.rallyFor == null && (() => {
              const g = G.current;
              const t = g?.towers.find((x) => x.id === sel.id);
              if (!t) return null;
              // beside the tower, on whichever side has more room, level with it
              const bw = boardCss.w, bh = boardCss.h;
              const tx = (((t.x - g.cam.x) * g.cam.zoom) / W) * bw;
              const ty = (((t.y - g.cam.y) * g.cam.zoom) / H) * bh;
              const CW = 292, cw = CW * s;
              const flipX = tx > bw * 0.5;
              const left = Math.max(6 * s, Math.min(bw - cw - CARD_M, flipX ? tx - 26 * s - cw : tx + 26 * s));
              const f = Math.min(1, Math.max(0, ty / bh));
              const withT = (fn) => () => { const tt = G.current?.towers.find((x) => x.id === sel.id); if (tt) fn(tt); };
              const tier = sel.rank4 ? 5 : sel.branch ? 4 : sel.level;
              const branchDef = sel.branch ? selDef.branches[sel.branch] : null;
              return (
              floatCard({
                id: sel.id, left, width: CW, f, origin: `${flipX ? "right" : "left"} center`,
                closeLabel: "Deselect tower", onClose: () => { if (G.current) G.current.selectedId = null; },
                children: (<>
                {/* who this is, and how far along its road it has come */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 16 }}>
                  <span className="cg-well" style={{ width: 54, height: 54, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TowerPortrait kind={sel.kind} branch={sel.branch} rank4={sel.rank4} size={50} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cg-display" style={{ fontWeight: 700, color: "var(--gold-lt)", fontSize: 14, lineHeight: 1.15, textShadow: "1px 1px 0 var(--ink)" }}>
                      {sel.rank4 ? branchDef.rank4[sel.rank4].name : sel.branch ? branchDef.name : selDef.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
                      {sel.rank4 ? `${branchDef.name} · final form` : sel.branch ? `${selDef.name} · path chosen` : `Level ${sel.level} of 3`}
                    </div>
                    <div className="cg-pips" style={{ marginTop: 5 }} title="three levels, a path, and a final ascension">
                      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={cls("cg-pip", i <= tier && "on", i > 3 && "big")} />)}
                    </div>
                  </div>
                </div>

                {/* its working numbers */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                  {towerTags(t).map((x, i) => (
                    <span key={i} className="cg-well" style={{ fontSize: 10, padding: "3px 6px", lineHeight: 1.3 }}>{x}</span>
                  ))}
                </div>

                {/* the service record: what this hall has actually done for you */}
                {(sel.kills > 0 || sel.dmgOut > 0) && (() => {
                  const dps = sel.dmgOut / Math.max(1, sel.liveTime);
                  const num = (v) => (v >= 10000 ? (v / 1000).toFixed(1) + "k" : Math.round(v).toLocaleString());
                  const stat = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted)" };
                  const n = { fontSize: 14, color: "var(--cream)", textShadow: "1px 1px 0 var(--ink)" };
                  return (
                    <div style={{ display: "flex", gap: 12, marginTop: 8, padding: "0 2px" }}>
                      <span title="foes this tower struck down" style={stat}><SkullIcon size={12} /><b className="cg-num" style={n}>{sel.kills}</b> kills</span>
                      <span title="total damage dealt this run" style={stat}><SwordIcon size={12} /><b className="cg-num" style={n}>{num(sel.dmgOut)}</b> dmg</span>
                      <span title="damage per second of battle — build time excluded" style={stat}><BoltIcon size={12} /><b className="cg-num" style={{ ...n, color: "var(--green)" }}>{dps >= 100 ? Math.round(dps) : dps.toFixed(1)}</b> dps</span>
                    </div>
                  );
                })()}

                {sel.kind === "catapult" && getStats(t).roller && (
                  <button className="cg-btn cg-btn--slate" style={{ width: "100%", marginTop: 10 }}
                    onClick={() => { if (G.current) G.current.rallyFor = sel.id; }}>
                    <FlagIcon size={14} /> Aim the Roll
                  </button>
                )}
                {(sel.kind === "knight" || sel.kind === "assassin") && (
                  <button className="cg-btn cg-btn--slate" style={{ width: "100%", marginTop: 10 }}
                    onClick={() => { if (G.current) G.current.rallyFor = sel.id; }}>
                    <FlagIcon size={14} /> Move Rally Flag
                  </button>
                )}

                {sel.kind === "trapsmith" && (
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
                    The smith arms the road himself — each finished charge is laid into the widest gap in his reach.
                  </div>
                )}

                {/* standing orders: who this tower shoots at */}
                {(() => {
                  const st = getStats(t);
                  const modes = aimModes(t, st);
                  if (!modes.length) return null;
                  const forced = forcedAim(st);
                  return (
                    <div style={{ marginTop: 10 }}>
                      <div className="cg-label" style={{ marginBottom: 5 }}>Targets</div>
                      {forced ? (
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          Sworn to the hunt — always takes <b style={{ color: "var(--cream)" }}>the mightiest foe</b>.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {modes.map((m) => (
                              <button key={m.id} title={m.hint}
                                className={cls("cg-btn cg-btn--slate", sel.aim === m.id && "is-on")}
                                style={{ flex: "1 1 auto", minWidth: 0, minHeight: 40, padding: "0 5px", fontSize: 12 }}
                                onClick={() => { const tt = G.current?.towers.find((x) => x.id === sel.id); if (tt) tt.aim = m.id; }}>
                                {m.label}
                              </button>
                            ))}
                          </div>
                          {!vp.short && (
                            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 5 }}>
                              {(modes.find((m) => m.id === sel.aim) || modes[0]).hint}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* the next level: its name, its price, and exactly what it changes */}
                {!sel.branch && sel.level < 3 && (() => {
                  const nxt = selDef.levels[sel.level];
                  const can = ui.gold >= nxt.cost;
                  const deltas = levelDeltas(t);
                  return (
                    <button className={cls("cg-btn cg-btn--parch", !can && "is-poor")} disabled={!can}
                      style={{ width: "100%", marginTop: 10, padding: "7px 10px 8px", alignItems: "stretch", justifyContent: "space-between", gap: 10 }}
                      onClick={withT((tt) => upgradeTower(G.current, tt))}>
                      <span className="cg-dim" style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                        <span className="cg-label">Upgrade · Level {sel.level + 1}</span>
                        <span className="cg-display" style={{ fontSize: 13, fontWeight: 700 }}>{nxt.label}</span>
                        <span style={{ display: "grid", gridTemplateColumns: "auto auto", columnGap: 10, rowGap: 1, fontSize: 10.5 }}>
                          {deltas.map((d) => (
                            <span key={d.label} style={{ display: "contents" }}>
                              <span style={{ color: "#7a6446" }}>{d.label}</span>
                              <span style={{ whiteSpace: "nowrap" }}>{d.from} <span style={{ color: d.better ? "#3f7a2a" : "#a8363c", fontWeight: "bold" }}>▸ {d.to}</span></span>
                            </span>
                          ))}
                        </span>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", fontSize: 18 }}>{price(nxt.cost, can, 16)}</span>
                    </button>
                  );
                })()}

                {!sel.branch && sel.level === 3 && (
                  <div style={{ marginTop: 10 }}>
                    <div className="cg-label" style={{ marginBottom: 6 }}>Choose a path — permanent</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {Object.entries(selDef.branches).map(([bk, br]) => {
                        const can = ui.gold >= br.cost;
                        return (
                          <button key={bk} className={cls("cg-btn cg-btn--parch", !can && "is-poor")} disabled={!can}
                            style={{ width: "100%", padding: "6px 8px", gap: 8, alignItems: "flex-start", justifyContent: "flex-start" }}
                            onClick={withT((tt) => branchTower(G.current, tt, bk))}>
                            <span className="cg-dim" style={{ flexShrink: 0 }}><TowerPortrait kind={sel.kind} branch={bk} size={40} /></span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                <span className="cg-display cg-dim" style={{ fontWeight: 700, fontSize: 12 }}>{br.name}</span>
                                {price(br.cost, can, 13)}
                              </span>
                              <span className="cg-dim" style={{ display: "block", fontSize: 10, lineHeight: 1.4, marginTop: 2, color: "#5a4630" }}>{br.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sel.branch && !sel.rank4 && branchDef.rank4 && (
                  <div style={{ marginTop: 10 }}>
                    <div className="cg-label" style={{ marginBottom: 6 }}>Final ascension — permanent</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {Object.entries(branchDef.rank4).map(([rk, r4]) => {
                        const can = ui.gold >= r4.cost;
                        return (
                          <button key={rk} className={cls("cg-btn cg-btn--parch", !can && "is-poor")} disabled={!can}
                            style={{ width: "100%", padding: "6px 8px", gap: 8, alignItems: "flex-start", justifyContent: "flex-start" }}
                            onClick={withT((tt) => ascendTower(G.current, tt, rk))}>
                            <span className="cg-dim" style={{ flexShrink: 0 }}><TowerPortrait kind={sel.kind} branch={sel.branch} rank4={rk} size={40} /></span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                <span className="cg-display cg-dim" style={{ fontWeight: 700, fontSize: 12 }}>{r4.name}</span>
                                {price(r4.cost, can, 13)}
                              </span>
                              <span className="cg-dim" style={{ display: "block", fontSize: 10, lineHeight: 1.4, marginTop: 2, color: "#5a4630" }}>{r4.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* rich-run shortcut: buy every remaining rank in one stroke */}
                {ui.masterShow && !sel.rank4 && (() => {
                  const c = completionCost(t);
                  const can = ui.gold >= c.cost;
                  return (
                    <button className={cls("cg-btn", !can && "is-poor")} disabled={!can}
                      style={{ width: "100%", marginTop: 8, fontSize: 12, gap: 6 }}
                      onClick={() => { if (can && G.current) completeTower(G.current, t); }}>
                      <BoltIcon size={13} /> <span className="cg-dim">Complete — {c.name}</span> {price(c.cost, can, 12)}
                    </button>
                  );
                })()}

                <button className="cg-btn cg-btn--red" style={{ width: "100%", marginTop: 10, justifyContent: "space-between" }}
                  onClick={withT((tt) => sellTower(G.current, tt))}>
                  <span>Sell</span>{price(`+${Math.floor(sel.invested * 0.7)}`, true, 13)}
                </button>
                </>),
              })
              );
            })()}

            {(ui.result === "won" || ui.result === "lost") && (() => {
              const campaign = mode === "campaign" && level;
              const nxt = campaign ? nextLevel(level.id) : null;
              const lastOfChapter = campaign && level.index === level.chapter.levels.length - 1;
              const won = ui.result === "won";
              const big = { minHeight: 48, fontSize: 13, padding: "0 16px" };
              return (
              <div style={{ position: "absolute", inset: 0, background: "rgba(22,14,26,0.74)", zIndex: 45, padding: "12px 12px 10px", boxSizing: "border-box" }}>
                <Fit max={1}>
                <div className="cg-frame cg-rise" style={{ width: 460, margin: "22px auto 0", padding: "0 20px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 11, textAlign: "center" }}>
                  <div className={cls("cg-banner", won ? "won" : "lost")} style={{ marginTop: -16, maxWidth: "100%" }}>
                    {!won ? "THE CASTLE HAS FALLEN"
                      : campaign ? (lastOfChapter ? `${level.chapter.name.toUpperCase()} IS FREE` : `${level.name.toUpperCase()} HELD`)
                      : "THE REALM STANDS"}
                  </div>

                  {/* stars won, and what they were worth */}
                  {campaign && won && award && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                        {/* five stars in a shallow arch, the middle one biggest */}
                        {Array.from({ length: MAX_STARS }, (_, k) => k + 1).map((i) => {
                          const off = Math.abs(i - (MAX_STARS + 1) / 2);
                          return (
                            <span key={i} className="cg-star" style={{ animationDelay: `${0.25 + i * 0.18}s`, marginBottom: [12, 6, 0][off] }}>
                              <Star lit={i <= award.rating} size={[50, 42, 36][off]} />
                            </span>
                          );
                        })}
                      </div>
                      <div className="cg-num" style={{ fontSize: 12, lineHeight: 1.4, color: "var(--gold-lt)", textShadow: "1px 1px 0 var(--ink)" }}>
                        +{award.xp} XP
                        {award.newStars > 0
                          ? ` · +${award.newStars} star${award.newStars > 1 ? "s" : ""} banked`
                          : ""}
                      </div>
                      {award.newStars === 0 && <div style={{ fontSize: 10.5, color: "var(--muted)" }}>No new stars — you'd already done better here.</div>}
                    </div>
                  )}
                  {!won && <SkullIcon size={40} />}

                  {campaign && won && banked > 0 && (
                    <div className="cg-well" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 10.5, textAlign: "left", lineHeight: 1.4 }}>
                      <CoinIcon size={22} />
                      <span><b className="cg-num" style={{ fontSize: 15, color: "var(--gold-lt)", textShadow: "1px 1px 0 var(--ink)" }}>{banked.toLocaleString("en-US")}</b> gold to the treasury<br />
                        <span style={{ color: "var(--muted)" }}>what was left, and a tithe of what was earned · {(progress.treasury || 0).toLocaleString("en-US")} banked</span></span>
                    </div>
                  )}
                  {campaign && won && award?.first && unlocksFor(level.id).length > 0 && (
                    <div className="cg-parch" style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 14px" }}>
                      {unlocksFor(level.id).map((k) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <TowerPortrait kind={k} size={44} />
                          <div style={{ textAlign: "left" }}>
                            <div className="cg-display" style={{ fontSize: 10, letterSpacing: 1, color: "#8a5a2a" }}>NEW HALL</div>
                            <div className="cg-display" style={{ fontSize: 13, fontWeight: 700 }}>{TOWERS[k].name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--text)", opacity: 0.9, maxWidth: 380, lineHeight: 1.5 }}>
                    {!won
                      ? `You fell on wave ${ui.wave}. Retry the wave with your gold and towers restored, or take the level again from the start.`
                      : campaign
                        ? (nxt
                            ? (lastOfChapter
                                ? `The chapter is closed — but word of it travels. ${nxt.chapter.name} is stirring, and ${nxt.name} lies ahead. Or dig in here and see how long this ground can hold.`
                                : `The road is yours as far as ${nxt.name}. March on — or hold this ground against the Endless March.`)
                            : "The Iron throne is taken and the whole continent is yours. The war is won — unless you'd rather see how long you can hold it.")
                        : "The dragon is slain and the road is quiet... for now. Beyond the pass, the horde has no end — march on if you dare."}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {won && campaign && nxt && (
                      <button className="cg-btn cg-btn--gold" style={big} onClick={() => startLevel(nxt)}>
                        <PlayIcon size={13} /> March On — {nxt.name}
                      </button>
                    )}
                    {won && (
                      <button className={cls("cg-btn", !(campaign && nxt) && "cg-btn--gold")} style={big}
                        onClick={() => { const g = G.current; if (g) { g.phase = "build"; g.buildUntil = g.time + 30; } setAward(null); }}>
                        Endless March
                      </button>
                    )}
                    {!won && ui.canRestart && (
                      <button className="cg-btn cg-btn--gold" style={big} onClick={() => restartWave(G.current)}>Retry Wave {ui.wave}</button>
                    )}
                    {!won && campaign && (
                      <button className="cg-btn" style={big} onClick={() => startLevel(level)}>Restart Level</button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {campaign
                      ? <button className="cg-btn cg-btn--slate" onClick={openMap}>Campaign Map</button>
                      : <button className="cg-btn cg-btn--slate" onClick={() => openRealmSelect("game")}>Choose Realm...</button>}
                    <button className="cg-btn cg-btn--slate" onClick={goHome}>Main Menu</button>
                  </div>
                </div>
                </Fit>
              </div>
              );
            })()}
        </div>
      </div>

      {/* ---- the right rail: speed, pause, build, the castle works; the militia below ---- */}
      {railsOn && rail("right", <><div style={{ display: "flex", gap: 7 }}>{speedBtn}{pauseBtn}</div>{buildBtn}{castleBtn}{resetBtn}</>, militiaBtn)}

      {/* ---- the castle works: the wall's own defences, bought once for a whole region ---- */}
      {drawer(castleOpen, 310, <>
        <div className="cg-drawer-head">
          <CastleIcon size={18} />
          <span className="cg-label">Castle Works</span>
          <button aria-label="Close castle works" className="cg-btn cg-btn--slate cg-x" onClick={() => setCastleOpen(false)}><CloseIcon size={11} /></button>
        </div>
        <div className="cg-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 10px" }}>
          <CastleWorksList
            works={ui.castle}
            ranks={mode === "campaign" ? null : ui.castleRanks}
            endless={mode !== "campaign"}
            purse={mode === "campaign" ? progress.treasury || 0 : ui.gold}
            purseLabel={mode === "campaign" ? "THE CROWN'S TREASURY" : "THIS RUN'S PURSE"}
            note={mode === "campaign"
              ? `Built on the wall itself, paid from the treasury: the gold you carry home from every level you hold. What you raise here stands for every road in the ${level?.chapter.name || "region"}.`
              : "Built on the wall itself, paid from the purse. What you raise here stands for every run in this realm — but the veteran ranks past a finished work are this run's alone."}
            onBuy={buyWork} />
        </div>
      </>)}

      {/* ---- the build panel: opens over the right of the screen from the Build button ---- */}
      {drawer(buildOpen, masterOn ? 320 : buildCols * 94 + 36, <>
        <div className="cg-drawer-head">
          <HammerIcon size={16} />
          <span className="cg-label">Raise Defenses</span>
          {ui.masterShow && (
            <button title="Master Builds: place any final form whole" className={cls("cg-btn cg-btn--slate", masterOn && "is-on")} style={{ minHeight: 36, padding: "0 8px", fontSize: 12, gap: 4 }}
              onClick={() => { const gg = G.current; if (!gg) return; gg.masterBuild = !gg.masterBuild; gg.buildMode = null; gg.masterPick = null; setMasterInfo(null); }}>
              <BoltIcon size={12} /> Master
            </button>
          )}
          <button aria-label="Close build menu" className="cg-btn cg-btn--slate cg-x" onClick={() => setBuildOpen(false)}><CloseIcon size={11} /></button>
        </div>
        <div className="cg-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 12px" }}>
          {masterOn ? (
                /* the master menu: each tower's every ascension, bought outright */
                Object.entries(TOWERS).filter(([key]) => towerUnlocked(key, progress)).map(([key, def]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div className="cg-label" style={{ fontSize: 11, margin: "2px 0 6px" }}>{def.name}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      {masterPlans(key).map((plan) => {
                        const pk = `${key}:${plan.branch}${plan.rank4 || ""}`;
                        const can = ui.gold >= plan.cost;
                        const active = ui.buildMode === key && ui.masterPick === pk;
                        return (
                          <button key={pk} title={def.branches[plan.branch].desc}
                            className={cls("cg-btn cg-btn--slate", active && "is-on", !can && "is-poor")}
                            style={{ width: "100%", flexDirection: "column", justifyContent: "flex-end", gap: 3, padding: "8px 4px 7px", minHeight: 100 }}
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
                              style={{ position: "absolute", top: 0, right: 0, padding: 5, pointerEvents: "auto", cursor: "help" }}><InfoIcon size={12} /></span>
                            <span className="cg-dim"><TowerPortrait kind={key} branch={plan.branch} rank4={plan.rank4} size={42} /></span>
                            <span className="cg-dim" style={{ fontSize: 10, lineHeight: 1.2 }}>{plan.name}</span>
                            {price(plan.cost, can, 11)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${buildCols}, 1fr)`, gap: 7 }}>
              {/* the halls you can raise first, in their usual order; the locked ones after */}
              {Object.entries(TOWERS).sort(([a], [b]) => towerUnlocked(b, progress) - towerUnlocked(a, progress)).map(([key, def]) => {
                const open = towerUnlocked(key, progress);
                const can = open && ui.gold >= def.cost;
                const active = ui.buildMode === key;
                const need = open ? null : unlockLevel(key);
                return (
                  <button key={key} title={open ? def.blurb : `Locked — clear ${need?.name || "the campaign"} to learn this hall.`}
                    className={cls("cg-btn cg-btn--slate", active && "is-on", open && !can && "is-poor", !open && "is-off")}
                    style={{ width: "100%", flexDirection: "column", gap: 3, padding: "6px 3px 6px", minHeight: 100 }}
                    onClick={() => { const gg = G.current; if (!gg) return; gg.buildMode = active ? null : key; gg.masterPick = null; gg.selectedId = null; setBuildOpen(false); }}
                    disabled={!can}>
                    <span className="cg-well cg-dim" style={{ width: 60, height: 54, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <TowerPortrait kind={key} size={50} />
                    </span>
                    <span className="cg-dim" style={{ fontSize: 10, lineHeight: 1.2 }}>{def.name}</span>
                    {open
                      ? price(def.cost, can, 12)
                      : <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--body)", fontWeight: "normal", fontSize: 9, textShadow: "none", color: "var(--muted)", lineHeight: 1.2 }}><LockIcon size={11} />{need ? need.short || need.name : "campaign"}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </>)}

            {realmOpen && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(22,14,26,0.94)", zIndex: 55, boxSizing: "border-box",
                padding: "max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))" }}>
              <Fit min={0.62} deps={[vp.short]}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: vp.short ? 6 : 10, padding: "4px 0 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="cg-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: "var(--gold)", textShadow: "2px 2px 0 var(--ink)" }}>CHOOSE YOUR REALM</div>
                  <button aria-label="Back" className="cg-btn cg-btn--slate cg-x" style={{ minWidth: 44, minHeight: 44 }} onClick={closeRealmSelect}><CloseIcon size={12} /></button>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: -4 }}>Pick who you're fighting, then a realm to fight them on.</div>

                {/* which army marches — the campaign's chapter, in miniature */}
                <div style={{ display: "grid", gridTemplateColumns: vp.short ? "repeat(3, 1fr)" : "repeat(auto-fit, minmax(250px, 1fr))", gap: vp.short ? 6 : 10, width: "100%", maxWidth: vp.short ? 900 : 620 }}>
                  {Object.values(FACTIONS).map((f) => (
                    <button key={f.id} onClick={() => setFactionId(f.id)}
                      className={cls("cg-btn cg-btn--slate", f.id === factionId && "is-on")}
                      style={{ flexDirection: "column", alignItems: "stretch", gap: 5, padding: "8px 10px", textAlign: "left" }}>
                      <span style={{ fontSize: 13, color: "var(--cream)" }}>
                        {f.name} <span style={{ fontSize: 10, letterSpacing: 1, color: f.tagColor, marginLeft: 4 }}>{f.tag}</span>
                      </span>
                      <span style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 30 }}>
                        {f.types.map((ty) => <EnemyIcon key={ty} type={ty} box={26} />)}
                      </span>
                      {!vp.short && <span style={{ fontFamily: "var(--body)", fontWeight: "normal", textShadow: "none", fontSize: 10, color: "var(--muted)", lineHeight: 1.45 }}>{f.blurb}</span>}
                    </button>
                  ))}
                </div>

                {/* realms, grouped the way the war is: the four free realms
                    first, then each chapter's battlefields under its banner */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", maxWidth: vp.short ? 900 : 620 }}>
                {[
                  { name: "THE FREE REALMS", ids: ["proving", "greenwood", "frostfang", "mistmoor", "ember"] },
                  ...CHAPTERS.map((ch) => ({
                    name: `${ch.numeral}. ${ch.name.toUpperCase()}`,
                    ids: ch.levels.map((l) => l.realm).filter((id) => id !== "greenwood"),
                  })),
                ].map((grp) => (
                <div key={grp.name}>
                <div className="cg-label" style={{ margin: vp.short ? "6px 0 4px" : "12px 0 6px" }}>{grp.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: vp.short ? "repeat(auto-fill, minmax(168px, 1fr))" : "repeat(auto-fit, minmax(250px, 1fr))", gap: vp.short ? 6 : 10 }}>
                  {grp.ids.map((id) => REALMS[id]).filter(Boolean).map((r) => (
                    <button key={r.id} onClick={() => chooseRealm(r.id)}
                      className={cls("cg-btn", r.id === realmId && "is-on")}
                      style={{ justifyContent: "flex-start", gap: 10, padding: 7, alignItems: "stretch", textAlign: "left" }}>
                      <svg viewBox="0 0 150 100" width={vp.short ? 54 : 108} height={vp.short ? 36 : 72} style={{ flexShrink: 0, border: "2px solid var(--ink)", imageRendering: "pixelated" }}>
                        <rect x="0" y="0" width="150" height="100" fill={r.GRASS} />
                        {/* the sea, where a realm runs down to the coast, with its beach */}
                        {r.coast && <polygon points={coastOutline(r).map(([x, y]) => `${x * 150 / W},${y * 100 / H}`).join(" ")} fill={r.water?.deep || "#3a6a7c"} stroke="#dcc48e" strokeWidth="2.5" strokeLinejoin="round" />}
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
                        <span style={{ fontSize: 13, color: "var(--cream)" }}>
                          {r.name} <span style={{ fontSize: 10, letterSpacing: 1, color: r.tagColor, marginLeft: 4 }}>{r.tag}</span>
                        </span>
                        {!vp.short && <span style={{ fontFamily: "var(--body)", fontWeight: "normal", textShadow: "none", fontSize: 10, color: "var(--text)", opacity: 0.8, lineHeight: 1.45 }}>{r.blurb}</span>}
                      </span>
                    </button>
                  ))}
                </div>
                </div>
                ))}
                </div>
              </div>
              </Fit>
              </div>
            )}
    </div>
  );
}
