// ============ CROWNGUARD — main component ============
// The thin React shell: it holds the mutable game state in a ref, runs the
// animation loop (update + draw each frame), mirrors a small snapshot into
// React state for the panels, handles mouse input, and renders the UI.

import { useRef, useEffect, useState, useCallback } from "react";
import { W, H, MY, RES, CASTLE_HP, RALLY_RANGE } from "./data/constants.js";
import { REALMS, REALM, selectRealm } from "./data/maps.js";
import { sfx } from "./audio/sfx.js";
import { FACTIONS, FACTION, selectFaction } from "./data/factions.js";
import { TOWERS } from "./data/towers.js";
import { ENEMIES } from "./data/enemies.js";
import { scriptedWaves, victoryWave, waveSpec, setWaveWindow } from "./data/waves.js";
import { SANDBOX, startSandbox, endSandbox, runHonest, tierOpen, hallOpen, loadSandbox } from "./data/sandbox.js";
import { CHAPTERS, loadProgress, markCleared, resetProgress, currentLevel, nextLevel, levelById, loadCastle, saveCastle, towerUnlocked, unlocksFor, unlockLevel, bankTreasury, spendTreasury } from "./data/campaign.js";
import CastleWorksList from "./ui/CastleWorks.jsx";
import { CASTLE_WORKS, emptyWorks, worksBonusHp } from "./data/castle.js";
import { MILITIA, HEROES, heroXpFor, HERO_MAX_LEVEL, heroAbilities } from "./data/bands.js";
import { PTS } from "./engine/path.js";
import { coastOutline } from "./data/terrain.js";
import { loadProfile, bankLevel, bankFreeRun, heroRecord, bankHeroStars, MAX_STARS } from "./data/profile.js";
import { getStats, aimModes, forcedAim } from "./engine/towers.js";
import {
  towerNear, placeTower, upgradeTower, branchTower, ascendTower, sellTower,
  startWave, restartWave, masterPlan, masterPlans, placeMasterTower, completionCost, completeTower, MASTER_MIN, buyCastleWork, raiseCastleWork, nextCastleWork, callMilitia, fieldHero, heroBand, heroAbilityState, fireHeroAbility,
} from "./engine/actions.js";
import { updateGame } from "./engine/update.js";
import { draw } from "./render/draw.js";
import { paintApron } from "./render/apron.js";
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
import SandboxPanel from "./ui/SandboxPanel.jsx";
import SandboxSetup from "./ui/SandboxSetup.jsx";
import { towerTags, levelDeltas, formDeltas } from "./ui/hud/towerText.js";
import { useArm } from "./ui/HeroTalents.jsx";
import {
  CoinIcon, CastleIcon, SkullIcon, SwordIcon, BoltIcon, PlayIcon, PauseIcon, SpeedIcon, HammerIcon,
  LockIcon, CloseIcon, ChevronUp, ChevronDown, FlagIcon, InfoIcon, ArrowIcon, TargetIcon,
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
  // the hero's menu (move, abilities), and what a hero's win paid in stars
  const [talentsOpen, setTalentsOpen] = useState(false);
  const [heroAward, setHeroAward] = useState(null);
  // Upgrades take two taps, for touch: the first arms a button (it turns gold,
  // lists what changes, and the map shows the new reach); the second buys.
  // A tap anywhere else, or three seconds, disarms it (useArm).
  const upArm = useArm(3000);
  // the form each armed button would buy, so the board can preview its reach
  const armForms = useRef({});
  useEffect(() => {
    const g = G.current;
    if (!g) return;
    const m = upArm.armed && /^up:(\d+):/.exec(upArm.armed);
    g.upPreview = m && armForms.current[upArm.armed] ? { id: Number(m[1]), form: armForms.current[upArm.armed] } : null;
  }, [upArm.armed]);
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
  // the Free Play sandbox's live panel, in battle
  const [sandboxPanel, setSandboxPanel] = useState(false);
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
  const boardCellRef = useRef(null);
  // the canvas behind the map that paints the realm's landscape beyond it,
  // and the tower being dragged out of the tray
  const apronRef = useRef(null);
  const tileDrag = useRef(null);
  // the tower picture that follows a finger dragging it out of the tray,
  // and whether a phone's tray shows its locked halls
  const [dragGhost, setDragGhost] = useState(null);
  const [showLocked, setShowLocked] = useState(false);
  // the canvas's css size (w, h), and the visible box it's shown in (vw, vh)
  const [boardCss, setBoardCss] = useState({ w: 720, h: 480, vw: 720, vh: 480, x: 0, y: 0 });
  // The screen, and the whole battle screen's box inside the safe area. When
  // the screen is wider than the 3:2 board (a phone on its side, a desktop),
  // the spare width becomes two RAILS beside the board that carry the HUD, so
  // nothing but the tower card ever covers the field. `s` is the size every
  // panel is drawn at (see ui/fit.jsx): 1 on an iPad, smaller on a phone.
  const vp = useViewport();
  const vpRef = useRef(vp);
  vpRef.current = vp;
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
      // The map comes first: as big as the screen allows at its true shape,
      // and where the screen is too short for it, only the decorative border
      // along the top and bottom (MY) is trimmed away — never the field.
      // The map runs under the notch strip and the home indicator too: in
      // landscape the camera cutout covers only a sliver mid-edge, and every
      // button and number keeps clear of both on its own (`inset`). It stands
      // flush against the tray; the landscape fills whatever is left.
      const sf = { left: 0, bottom: 0, top: 0 };
      const aw = r.width - sf.left, ah = r.height - sf.bottom - sf.top;
      const k = Math.max(0.1, Math.min(aw / W, ah / (H - 2 * MY)));
      const w = Math.floor(W * k), h = Math.floor(H * k);
      const vw = Math.min(w, Math.floor(aw)), vh = Math.min(h, Math.floor(ah));
      setBoardCss({ w, h, vw, vh, x: Math.floor(r.width - vw), y: Math.floor(sf.top + (ah - vh) / 2), cw: Math.floor(r.width), ch: Math.floor(r.height) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, wide]);

  // the realm's landscape beyond the map: repainted (cached) whenever the
  // play area, the map's place in it or the realm changes
  useEffect(() => {
    const cv = apronRef.current;
    if (screen !== "game" || !cv || !boardCss.cw) return;
    const cropY = Math.round((boardCss.vh - boardCss.h) / 2);
    try {
      paintApron(cv, { cssW: boardCss.cw, cssH: boardCss.ch, dpr: Math.min(2, window.devicePixelRatio || 1),
        board: { x: boardCss.x, y: boardCss.y + cropY, w: boardCss.w, h: boardCss.h } });
    } catch (err) { console.error("paintApron failed", err); }
  }, [screen, realmId, boardCss]);

  // opts (the Free Play sandbox): { lives, wave, rush, hero: false, heroKey, heroLevel }
  const initGame = useCallback((startGold = 250, freeplay = true, castle = emptyWorks(), opts = {}) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // dev-server playtest knob: /?gold=5000 pads the war chest. Stripped from
    // production builds, so the shipped game can't be talked into it.
    const devGold = import.meta.env.DEV ? Math.max(0, Number(new URLSearchParams(window.location.search).get("gold")) || 0) : 0;
    const START_GOLD = startGold + devGold;
    G.current = {
      // tallies for the profile — banked when the level ends
      run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 },
      gold: START_GOLD, lives: (opts.lives ?? CASTLE_HP) + worksBonusHp(castle), wave: opts.wave ?? 0, phase: "build",
      // the works built on this castle: they came with the region, and stay
      castle: { ...castle },
      bands: [], militiaCd: 0,
      towers: [], enemies: [], projectiles: [], effects: [],
      spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
      selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
      cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: !!opts.rush,
      // Master Builds: free play and the endless march only, and only once
      // the coffers have seen real money — masterSeen keeps it from blinking
      freeplay, masterBuild: false, masterSeen: false, masterPick: null,
    };
    // the hero rides out and waits before the gate: level 1 on every new
    // map, with the talents bought on the Home Screen. What level he ends a
    // won map's scripted waves at is paid out as his stars (see below).
    if (opts.hero !== false) {
      const [gx, gy] = PTS[PTS.length - 1];
      const hk = opts.heroKey && HEROES[opts.heroKey] ? opts.heroKey : heroKey;
      fieldHero(G.current, hk, opts.heroLevel || 1, gx - 70, gy + (gy > H / 2 ? -50 : 50), heroRecord(loadProfile(), hk).talents);
    }
    setHeroAward(null);
    setBuildOpen(false);
    setCastleOpen(false);
    setTalentsOpen(false);
    setUi({ gold: START_GOLD, lives: (opts.lives ?? CASTLE_HP) + worksBonusHp(castle), wave: opts.wave ?? 0, phase: "build", selected: null, buildMode: null, speed: 1, paused: false, result: null, canRestart: false, cdSec: null, zoom: 1, rush: !!opts.rush });
  }, [heroKey]);

  // Swap the battlefield: rebuild road + scenery for the realm, then start a
  // fresh Free Play run on it — full fifteen waves, then the Endless March.
  // Ride out on a Free Play sandbox run: the settings from the setup screen
  // (ui/SandboxSetup.jsx) arm the engine through sandbox.js, then the run
  // starts on its realm with its purse, walls, wave, hero and pace.
  const startSandboxRun = (settings) => {
    const sb = startSandbox(settings);
    const id = sb.realm in REALMS ? sb.realm : "greenwood";
    selectRealm(id);
    setWaveWindow(null);
    setRealmId(id);
    setFactionId(sb.army === "all" ? "greenwood" : sb.army);
    setMode("free");
    setLevelId(null);
    castleScope.current = `free:${id}`;
    // a realm may open its gates with a heavier purse — the Proving Field does
    initGame(Math.max(sb.gold, REALMS[id]?.startGold ?? 0), true, loadCastle(castleScope.current), {
      lives: sb.lives, wave: sb.startWave - 1, rush: sb.autoWaves,
      hero: sb.hero, heroKey: sb.heroKey, heroLevel: sb.heroLevel,
    });
    setRealmOpen(false);
    setSandboxPanel(false);
    setScreen("game");
  };

  // Ride out on one campaign level: its map, its army, its slice of the wave
  // script, and the war chest it starts you with.
  const startLevel = (lv) => {
    selectRealm(lv.realm);
    endSandbox(lv.chapter.faction);
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
    // A won map pays the hero's level at the end of its scripted waves as
    // that hero's stars — once per win, never for the Endless March after.
    // It runs AFTER bankLevel / bankFreeRun (they save the profile they were
    // handed) and reads storage fresh, so neither overwrites the other.
    const payHero = () => {
      if (ui.result !== "won" || !g || g.heroPaid) return;
      // a sandbox run made easier than Classic pays no stars
      if (mode !== "campaign" && !runHonest()) return;
      const hb = heroBand(g);
      if (!hb) return;
      g.heroPaid = true;
      setHeroAward({ key: hb.hero, name: hb.name, ...bankHeroStars(hb.hero, mode === "campaign" && levelId ? levelId : `free:${realmId}`, hb.level) });
      setProfile(loadProfile());
    };
    // a Free Play run has no level to rate, but its tallies still count
    if (mode !== "campaign" || !levelId) {
      if (runHonest()) setProfile({ ...bankFreeRun(profile, { waves: Math.max(0, ui.wave - (ui.result === "won" ? 0 : 1)), run: g?.run }) });
      if (g) g.run = { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 };
      payHero();
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
    payHero();
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
      const abAim = typeof g.rallyFor === "string" && g.rallyFor.startsWith("ab:");
      if (g.rallyFor != null && g.rallyFor !== "hero" && g.rallyFor !== "militia" && !abAim && !g.towers.some((t) => t.id === g.rallyFor)) g.rallyFor = null;
      // an ability can't take aim for a hero who has fallen
      if (abAim && heroBand(g)?.units[0].state === "dead") g.rallyFor = null;
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
      // the hero's two abilities, as the menu shows them
      const heroAbs = hb ? heroAbilities(hb.hero).map((a) => ({ id: a.id, name: a.name, aim: a.aim, desc: a.desc, ...heroAbilityState(hb, a) })) : [];
      const heroKeyUi = hb ? `${hb.hero}|${hb.level}|${hb.xp}|${hu.state}|${Math.round(hu.hp)}|${hu.maxHp}|${hu.state === "dead" ? Math.ceil(hu.respawn / 1000) : 0}|${heroAbs.map((x) => x.state + (x.sec || "")).join(",")}` : "";
      const militiaSec = Math.ceil((g.militiaCd || 0) / 1000);
      if (u.masterShow !== masterShow || u.masterOn !== !!g.masterBuild || u.masterPick !== pickKey || u.rallyFor !== rallyFor || u.gold !== Math.floor(g.gold) || u.lives !== g.lives || u.wave !== g.wave || u.phase !== g.phase || u.selKey !== selKey || u.buildMode !== g.buildMode || u.speed !== g.speed || u.paused !== g.paused || u.canRestart !== canRestart || u.cdSec !== cdSec || u.zoom !== g.cam.zoom || u.camX !== camX || u.camY !== camY || u.rush !== g.rush || u.castleKey !== castleKey || u.heroKey !== heroKeyUi || u.militiaSec !== militiaSec) {
        setUi({
          heroKey: heroKeyUi, militiaSec,
          hero: hb ? { key: hb.hero, name: hb.name, level: hb.level, xp: hb.xp, next: heroXpFor(hb.level), dead: hu.state === "dead", hp: Math.max(0, Math.round(hu.hp)), maxHp: hu.maxHp, respawn: hu.state === "dead" ? Math.ceil(hu.respawn / 1000) : 0, abilities: heroAbs } : null,
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
      g.selectedId = null;       // the order is given: the card stays closed
      return;
    }
    const dx = x - t.x, dy = y - t.y;
    const d = Math.hypot(dx, dy);
    const k = d > RALLY_RANGE ? RALLY_RANGE / d : 1;
    t.rally = { x: t.x + dx * k, y: t.y + dy * k };
    g.effects.push({ type: "levelup", x: t.rally.x, y: t.rally.y, ttl: 500 });
    g.rallyFor = null;
    // the flag is planted: the tower's card stays closed rather than popping
    // back over the field (tap the tower again to reopen it)
    g.selectedId = null;
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
    // a hero ability taking aim: a Heartseeker tapped where no foe stands
    // keeps aiming, so the arrow is never wasted on bare ground
    if (typeof g.rallyFor === "string" && g.rallyFor.startsWith("ab:")) {
      const id = g.rallyFor.slice(3);
      if (fireHeroAbility(g, id, x, y)) g.rallyFor = null;
      else g.effects.push({ type: "poof", x, y, ttl: 300 });
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
  // Bloons-style, the same on every screen: the map sits against a TRAY
  // down the right edge and never shrinks for chrome. The tray holds the
  // wave and pause at its head, the castle works, the towers (tap one then
  // the grass, or drag it straight onto the map), and the horn and speed at
  // its foot; selecting a tower, the castle, the hero's talents or the wave
  // turns the tray into that thing's panel, so no card ever covers the
  // field. On the map itself only small pieces float: lives and gold top
  // left, the hero, his talents and the militia bottom left. Whatever the
  // map doesn't cover is more of the realm's landscape (render/apron.js).
  // Everything is drawn at the screen's UI scale `s` (ui/fit.jsx). The skin
  // lives in ui/hud/hud.css.
  const masterOn = !!(ui.masterShow && ui.masterOn);
  const cls = (...c) => c.filter(Boolean).join(" ");
  const price = (n, can = true, size = 12) => (
    <span className={cls("cg-price", !can && "is-short")}><CoinIcon size={size} />{n}</span>
  );
  const s = vp.scale;
  const inset = vp.safe || { top: 0, right: 0, bottom: 0, left: 0 };
  // phones get the compact pieces; the old rails are gone
  const railsOn = false;
  const compact = vp.short;
  const cropTop = Math.round((boardCss.vh - boardCss.h) / 2);
  const scaleAt = (origin) => (s === 1 ? {} : { transform: `scale(${s})`, transformOrigin: origin });
  // what the next tap will do, on a parchment ribbon across the top of the board
  const ribbon = (text, label, cancel) => (
    <div style={{
      position: "absolute", top: 8, left: "50%", zIndex: 22, pointerEvents: "none", width: "max-content",
      maxWidth: (boardCss.vw * 0.8) / s, transform: `translateX(-50%) scale(${s})`, transformOrigin: "50% 0",
    }}>
      <div className="cg-ribbon cg-pop" style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px 4px 12px" }}>
        <span>{text}</span>
        <button className="cg-btn cg-btn--slate cg-x" aria-label={label} onClick={cancel} style={{ pointerEvents: "auto" }}><CloseIcon size={11} /></button>
      </div>
    </div>
  );
  const cancelRally = () => { if (G.current) G.current.rallyFor = null; };
  // a small square close button that sits ON a card's upper-right corner,
  // outside the part that scrolls, so it never scrolls away
  const cornerX = (label, onClick) => (
    <button aria-label={label} className="cg-btn cg-btn--slate cg-x cg-corner-x" onClick={onClick}><CloseIcon size={12} /></button>
  );
  // A card floating over the board, beside what it describes: `width`
  // design px wide at `left` (board px), as tall as its contents up to the
  // board's height, hung at height fraction `f` so it sits level with it.
  const CARD_M = 24 * s;
  const floatCard = ({ id, left, width, f, origin, closeLabel, onClose, children }) => (
    <div key={id} style={{
      position: "absolute", left, top: CARD_M, width, height: (boardCss.vh - 2 * CARD_M) / s,
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
  // the sandbox decides which halls Free Play offers; the campaign, what's won
  const hallAvail = (key) => (mode === "free" && SANDBOX ? hallOpen(key) : towerUnlocked(key, progress));
  // "12/18", or "∞" once the run is past its cap (or has none)
  const capOf = (n) => { const c = victoryWave(); return Number.isFinite(c) && n <= c ? c : "∞"; };
  const capNote = (
    <div className="cg-parch" style={{ marginTop: 10, padding: "7px 9px", fontSize: 10.5, lineHeight: 1.45, color: "#5a4630" }}>
      <div className="cg-label" style={{ marginBottom: 2, color: "#7a6446" }}>Capped in this sandbox</div>
      This run's settings stop halls at this tier.
    </div>
  );
  const cycleSpeed = () => { if (G.current) G.current.speed = G.current.speed === 1 ? 2 : G.current.speed === 2 ? 4 : 1; };
  // one panel at a time in the tray: the tower grid is home
  const trayHome = () => { setSandboxPanel(false); setCastleOpen(false); setTalentsOpen(false); setInfoOpen(false); setArmed(null); setMasterInfo(null); if (G.current) G.current.selectedId = null; };
  const trayOpen = (which) => {
    const was = which === "castle" ? castleOpen : which === "talents" ? talentsOpen : infoOpen;
    trayHome();
    if (was) return;
    if (G.current) G.current.buildMode = null;
    if (which === "castle") setCastleOpen(true);
    else if (which === "talents") setTalentsOpen(true);
    else setInfoOpen(true);
  };
  const buildCols = 2;

  // -- the purse, the castle, the level --
  const purse = (
    <>
      <GoldChip gold={mode === "free" && SANDBOX?.infiniteGold ? "∞" : ui.gold} />
      <LivesChip lives={ui.lives} max={ui.maxLives || CASTLE_HP} base={CASTLE_HP} />
      {level && !railsOn && boardCss.vw > 760 && (
        <div className="cg-panel cg-chip" style={{ gap: 6 }}>
          <span className="cg-label">Ch. {level.chapter.numeral}</span>
          <span className="cg-display" style={{ fontSize: 12, color: "var(--cream)" }}>{level.name}</span>
        </div>
      )}
    </>
  );


  // -- the militia horn and the hero --
  const militiaBtn = ui.result == null && !(mode === "free" && SANDBOX?.militia === false) && (
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
  // the hero stands in the tray's foot, where only his portrait and bars fit
  const heroSlim = true;
  // the hero is taking aim (moving, or an ability waiting for its spot)
  const aiming = ui.rallyFor === "hero" || (typeof ui.rallyFor === "string" && ui.rallyFor.startsWith("ab:"));
  const anyReady = !!ui.hero?.abilities?.some((a) => a.state === "ready");
  const heroBtn = ui.result == null && ui.hero && (() => {
    const hpf = ui.hero.hp / ui.hero.maxHp;
    const max = ui.hero.level >= HERO_MAX_LEVEL;
    return (
      <button aria-label={`${ui.hero.name}: move and abilities`} title={HEROES[ui.hero.key]?.blurb}
        className={cls("cg-btn cg-btn--slate", (talentsOpen || aiming) && "is-on", ui.hero.dead && "is-off", anyReady && !talentsOpen && "cg-horn")}
        style={{ flex: 1, minHeight: 60, minWidth: heroSlim ? 0 : 150, padding: "5px 8px 5px 5px", gap: 7, justifyContent: "flex-start" }}
        onClick={() => { const g = G.current; if (!g) return; if (aiming) { g.rallyFor = null; return; } trayOpen("talents"); }}>
        <span className="cg-well" style={{ width: 42, height: 46, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {hasRig(HEROES[ui.hero.key]?.rig) ? <EnemyIcon type={HEROES[ui.hero.key].rig} box={34} /> : <span style={{ fontSize: 20 }}>{HEROES[ui.hero.key]?.icon}</span>}
        </span>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: heroSlim ? 0 : 88 }}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
            {!heroSlim && <span style={{ fontSize: 11 }}>{ui.hero.name}</span>}
            <span style={{ fontSize: 10, color: "var(--gold-lt)" }}>Lv {ui.hero.level}</span>
          </span>
          <span className="cg-bar"><i style={{ width: `${Math.round(100 * hpf)}%`, background: hpf > 0.5 ? "#7ad06a" : hpf > 0.25 ? "#e8c14a" : "#e07a72" }} /></span>
          <span className="cg-bar" style={{ height: 5 }}><i style={{ width: max ? "100%" : `${Math.round(100 * Math.min(1, ui.hero.xp / ui.hero.next))}%`, background: "var(--blue)" }} /></span>
          <span style={{ fontFamily: "var(--body)", fontWeight: "normal", textShadow: "none", fontSize: 9, color: "var(--muted)", display: heroSlim ? "none" : "flex", justifyContent: "space-between", gap: 6 }}>
            <span>{ui.hero.dead ? `back in ${ui.hero.respawn}s` : `${ui.hero.hp}/${ui.hero.maxHp}`}</span>
            <span>{max ? "MAX" : `xp ${ui.hero.xp}/${ui.hero.next}`}</span>
          </span>
        </span>
      </button>
    );
  })();


  // -- the hero's menu: move him, or fire one of his two abilities. Talents
  // are bought on the Home Screen only, with the stars a won map pays --
  const talentBtn = null;
  const ABIL_ICON = { slam: <HammerIcon size={13} />, charge: <SwordIcon size={13} />, volley: <ArrowIcon size={13} />, heart: <TargetIcon size={13} /> };
  const talentPanel = talentsOpen && ui.hero && (() => {
    const h = ui.hero;
    const g = G.current;
    const close = () => trayHome();
    const move = () => { if (!g || h.dead) return; close(); g.rallyFor = "hero"; g.selectedId = null; g.buildMode = null; setBuildOpen(false); };
    const fire = (a) => {
      if (!g || a.state !== "ready") return;
      close();
      if (a.aim === "none") { fireHeroAbility(g, a.id); return; }
      g.rallyFor = `ab:${a.id}`; g.selectedId = null; g.buildMode = null; setBuildOpen(false);
    };
    const hpf = h.hp / h.maxHp;
    const max = h.level >= HERO_MAX_LEVEL;
    const tile = { width: "100%", minHeight: 92, padding: "7px 8px", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", gap: 4, textAlign: "left", position: "relative", overflow: "hidden" };
    return (<>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 16 }}>
          <span className="cg-well" style={{ width: 40, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {hasRig(HEROES[h.key]?.rig) ? <EnemyIcon type={HEROES[h.key].rig} box={32} /> : <span>{HEROES[h.key]?.icon}</span>}
          </span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <div className="cg-display" style={{ fontWeight: 700, color: "var(--gold-lt)", fontSize: 13, textShadow: "1px 1px 0 var(--ink)" }}>{h.name} · Lv {h.level}</div>
            <span className="cg-bar"><i style={{ width: `${Math.round(100 * hpf)}%`, background: hpf > 0.5 ? "#7ad06a" : hpf > 0.25 ? "#e8c14a" : "#e07a72" }} /></span>
            <span className="cg-bar" style={{ height: 5 }}><i style={{ width: max ? "100%" : `${Math.round(100 * Math.min(1, h.xp / h.next))}%`, background: "var(--blue)" }} /></span>
            <div style={{ fontSize: 9.5, color: "var(--muted)", display: "flex", justifyContent: "space-between", gap: 6 }}>
              <span>{h.dead ? `back in ${h.respawn}s` : `${h.hp}/${h.maxHp} health`}</span>
              <span>{max ? "MAX LEVEL" : `xp ${h.xp}/${h.next} · from kills`}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 10 }}>
          <button className={cls("cg-btn", h.dead ? "cg-btn--slate is-off" : "cg-btn--parch")} disabled={h.dead} style={tile} onClick={move}>
            <span className="cg-display" style={{ fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}><FlagIcon size={13} /> Move</span>
            <span style={{ fontSize: 10, lineHeight: 1.35, color: "#5a4630" }}>{h.dead ? `Back on his feet in ${h.respawn}s.` : "Tap the map where the hero should stand."}</span>
          </button>
          {h.abilities.map((a) => {
            const ready = a.state === "ready";
            const label = ready ? (a.aim === "none" ? "Ready — tap to use" : a.aim === "foe" ? "Ready — then tap a foe" : "Ready — then tap the map")
              : a.state === "cooling" ? `Recharging · ${a.sec}s` : a.state === "locked" ? `Wakes at level ${a.unlock}` : "Hero is down";
            return (
              <button key={a.id} className={cls("cg-btn", ready ? "cg-btn--gold" : "cg-btn--slate is-off")} disabled={!ready} style={tile} onClick={() => fire(a)}>
                {/* the recharge drains down the plank like the militia's horn */}
                {a.state === "cooling" && <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.round(100 * Math.min(1, a.frac))}%`, background: "rgba(20,12,22,0.4)" }} />}
                <span className="cg-display" style={{ fontSize: 12, fontWeight: 700, position: "relative", display: "inline-flex", alignItems: "center", gap: 5 }}>{ABIL_ICON[a.id] || <BoltIcon size={13} />} {a.name}</span>
                <span className="cg-num" style={{ fontSize: 9.5, textShadow: "none", position: "relative", color: ready ? "var(--wood-deep)" : "var(--gold-lt)" }}>{label}</span>
                <span style={{ fontSize: 9.5, lineHeight: 1.35, position: "relative", color: ready ? "var(--wood-deep)" : "var(--muted)" }}>{a.desc}</span>
              </button>
            );
          })}
        </div>
      </>);
  })();

  // -- the tower panel: everything about the selected hall --
  const towerPanel = sel && selDef && (() => {
    const g = G.current;
    const t = g?.towers.find((x) => x.id === sel.id);
    if (!t) return null;
    const withT = (fn) => () => { const tt = G.current?.towers.find((x) => x.id === sel.id); if (tt) fn(tt); };
    // two taps to buy: arm with the first (preview), buy with the second
    const armId = (key) => `up:${sel.id}:${key}`;
    const buy2 = (key, form, fn) => {
      armForms.current[armId(key)] = form;
      return () => upArm.tap(armId(key), () => { withT(fn)(); if (G.current) G.current.upPreview = null; });
    };
    const deltaGrid = (deltas) => (
      <span style={{ display: "grid", gridTemplateColumns: "auto auto", columnGap: 10, rowGap: 1, fontSize: 10.5 }}>
        {deltas.map((d) => (
          <span key={d.label} style={{ display: "contents" }}>
            <span style={{ color: "#7a6446" }}>{d.label}</span>
            <span style={{ whiteSpace: "nowrap" }}>{d.from} <span style={{ color: d.better ? "#3f7a2a" : "#a8363c", fontWeight: "bold" }}>▸ {d.to}</span></span>
          </span>
        ))}
      </span>
    );
    // the armed button's call to action: a dark tag on the gold, easy to read
    const tapAgain = () => (
      <span style={{ alignSelf: "flex-start", background: "var(--ink)", color: "var(--gold-lt)", fontFamily: "var(--display)", fontSize: 12, fontWeight: 700, letterSpacing: 1, lineHeight: 1.2, padding: "3px 8px", textShadow: "none" }}>TAP AGAIN TO BUY</span>
    );
    const tier = sel.rank4 ? 5 : sel.branch ? 4 : sel.level;
    const branchDef = sel.branch ? selDef.branches[sel.branch] : null;
    // nothing left to buy: the card goes to one column, and says what the
    // final form does where the upgrades used to be
    const maxed = !!sel.rank4 || (!!sel.branch && !branchDef?.rank4);
    const finalDesc = sel.rank4 ? branchDef.rank4[sel.rank4].desc : maxed ? branchDef.desc : null;
    return { maxed, left: (<>
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

    </>), right: (<>
                {finalDesc && (
                  <div className="cg-parch" style={{ marginTop: 10, padding: "7px 9px", fontSize: 10.5, lineHeight: 1.45, color: "#5a4630" }}>
                    <div className="cg-label" style={{ marginBottom: 3, color: "#7a6446" }}>Fully upgraded</div>
                    {finalDesc}
                  </div>
                )}
                {/* the next level: its name, its price, and exactly what it changes */}
                {!sel.branch && sel.level < 3 && !tierOpen(sel.level + 1) && capNote}
                {!sel.branch && sel.level < 3 && tierOpen(sel.level + 1) && (() => {
                  const nxt = selDef.levels[sel.level];
                  const can = ui.gold >= nxt.cost;
                  const deltas = levelDeltas(t);
                  return (
                    <button data-arm={armId("level")} className={cls("cg-btn", upArm.is(armId("level")) ? "cg-btn--gold" : "cg-btn--parch", !can && "is-poor")} disabled={!can}
                      style={{ width: "100%", marginTop: 10, padding: "7px 10px 8px", alignItems: "stretch", justifyContent: "space-between", gap: 10 }}
                      onClick={buy2("level", { level: sel.level + 1 }, (tt) => upgradeTower(G.current, tt))}>
                      <span className="cg-dim" style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                        {upArm.is(armId("level")) ? tapAgain() : <span className="cg-label">Upgrade · Level {sel.level + 1}</span>}
                        <span className="cg-display" style={{ fontSize: 13, fontWeight: 700 }}>{nxt.label}</span>
                        {deltaGrid(deltas)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", fontSize: 18 }}>{price(nxt.cost, can, 16)}</span>
                    </button>
                  );
                })()}

                {!sel.branch && sel.level === 3 && !tierOpen(4) && capNote}
                {!sel.branch && sel.level === 3 && tierOpen(4) && (
                  <div style={{ marginTop: 10 }}>
                    <div className="cg-label" style={{ marginBottom: 6 }}>Choose a path — permanent</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {Object.entries(selDef.branches).map(([bk, br]) => {
                        const can = ui.gold >= br.cost;
                        return (
                          <button key={bk} data-arm={armId(`branch:${bk}`)} className={cls("cg-btn", upArm.is(armId(`branch:${bk}`)) ? "cg-btn--gold" : "cg-btn--parch", !can && "is-poor")} disabled={!can}
                            style={{ width: "100%", padding: "6px 8px", gap: 8, alignItems: "flex-start", justifyContent: "flex-start" }}
                            onClick={buy2(`branch:${bk}`, { branch: bk }, (tt) => branchTower(G.current, tt, bk))}>
                            <span className="cg-dim" style={{ flexShrink: 0 }}><TowerPortrait kind={sel.kind} branch={bk} size={40} /></span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                <span className="cg-display cg-dim" style={{ fontWeight: 700, fontSize: 12 }}>{br.name}</span>
                                {price(br.cost, can, 13)}
                              </span>
                              {upArm.is(armId(`branch:${bk}`))
                                ? <span style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>{tapAgain()}{deltaGrid(formDeltas(t, { branch: bk }))}</span>
                                : <span className="cg-dim" style={{ display: "block", fontSize: 10, lineHeight: 1.4, marginTop: 2, color: "#5a4630" }}>{br.desc}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sel.branch && !sel.rank4 && branchDef.rank4 && !tierOpen(5) && capNote}
                {sel.branch && !sel.rank4 && branchDef.rank4 && tierOpen(5) && (
                  <div style={{ marginTop: 10 }}>
                    <div className="cg-label" style={{ marginBottom: 6 }}>Final ascension — permanent</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {Object.entries(branchDef.rank4).map(([rk, r4]) => {
                        const can = ui.gold >= r4.cost;
                        return (
                          <button key={rk} data-arm={armId(`ascend:${rk}`)} className={cls("cg-btn", upArm.is(armId(`ascend:${rk}`)) ? "cg-btn--gold" : "cg-btn--parch", !can && "is-poor")} disabled={!can}
                            style={{ width: "100%", padding: "6px 8px", gap: 8, alignItems: "flex-start", justifyContent: "flex-start" }}
                            onClick={buy2(`ascend:${rk}`, { rank4: rk }, (tt) => ascendTower(G.current, tt, rk))}>
                            <span className="cg-dim" style={{ flexShrink: 0 }}><TowerPortrait kind={sel.kind} branch={sel.branch} rank4={rk} size={40} /></span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                <span className="cg-display cg-dim" style={{ fontWeight: 700, fontSize: 12 }}>{r4.name}</span>
                                {price(r4.cost, can, 13)}
                              </span>
                              {upArm.is(armId(`ascend:${rk}`))
                                ? <span style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>{tapAgain()}{deltaGrid(formDeltas(t, { rank4: rk }))}</span>
                                : <span className="cg-dim" style={{ display: "block", fontSize: 10, lineHeight: 1.4, marginTop: 2, color: "#5a4630" }}>{r4.desc}</span>}
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
                    <button data-arm={armId("complete")} className={cls("cg-btn", upArm.is(armId("complete")) && "cg-btn--gold", !can && "is-poor")} disabled={!can}
                      style={{ width: "100%", marginTop: 8, fontSize: 12, gap: 6 }}
                      onClick={buy2("complete", { level: 3, branch: sel.branch || c.branch, rank4: c.rank4 }, (tt) => { if (can && G.current) completeTower(G.current, tt); })}>
                      <BoltIcon size={13} /> {upArm.is(armId("complete")) ? tapAgain() : <span className="cg-dim">Complete — {c.name}</span>} {price(c.cost, can, 12)}
                    </button>
                  );
                })()}

                {/* selling takes two taps too: an accidental sale can't be undone */}
                <button data-arm={armId("sell")} className={cls("cg-btn cg-btn--red", upArm.is(armId("sell")) && "is-on")}
                  style={{ width: "100%", marginTop: 10, justifyContent: "space-between", ...(upArm.is(armId("sell")) ? { boxShadow: "inset 0 0 0 2px var(--gold)" } : {}) }}
                  onClick={() => upArm.tap(armId("sell"), withT((tt) => sellTower(G.current, tt)))}>
                  <span>{upArm.is(armId("sell")) ? "Tap again to sell" : "Sell"}</span>{price(`+${Math.floor(sel.invested * 0.7)}`, true, 13)}
                </button>
    </>) };
  })();

  // -- a master-build final, read about before buying --
  const masterInfoPanel = !ui.buildMode && !sel && ui.masterShow && ui.masterOn && masterInfo && (() => {
    const { nums, traits } = describe(masterInfo.stats);
    return (<>
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
    </>);
  })();

  // -- the next wave: who's coming, and the rush switch --
  const nextWave = ui.phase === "build" ? ui.wave + 1 : ui.wave;
  const comp = nextWave >= 1 ? waveComposition(nextWave) : [];
  const fighting = ui.phase !== "build";
  const lead = [...comp].sort((a, b) => (ENEMIES[b.type].boss ? 1e6 : b.count) - (ENEMIES[a.type].boss ? 1e6 : a.count)).slice(0, 3);
  const wavePanel = infoOpen && (
    <>
      <div className="cg-label" style={{ marginBottom: 8 }}>Wave {nextWave} — {fighting ? "on the field" : ui.wave >= victoryWave() ? "next · endless" : "next"}</div>
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
        <span style={{ marginLeft: "auto", minWidth: 40, textAlign: "center", padding: "3px 6px", border: "2px solid var(--ink)", fontSize: 12, background: ui.rush ? "var(--gold)" : "var(--slate-dk)", color: ui.rush ? "var(--wood-deep)" : "var(--muted)", textShadow: "none" }}>{ui.rush ? "ON" : "OFF"}</span>
      </button>
    </>
  );

  // -- drag a tower from the tray straight onto the map (Bloons-style). A
  // tap on a tile just arms it. A drag that heads off sideways picks the
  // tower up: its picture rides above the finger, the ghost follows on the
  // map, and it's built where the finger lifts over the field. A drag that
  // runs up or down the tray scrolls the tray instead. Tiles take
  // touch-action: none, so the browser never steals the gesture. --
  const startTileDrag = (ev, kind, pick = null) => {
    const list = ev.currentTarget.closest(".cg-scroll");
    tileDrag.current = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, kind, pick, mode: null, list, top0: list ? list.scrollTop : 0 };
    const toWorld = (e) => {
      const cv = canvasRef.current, g = G.current;
      if (!cv || !g) return null;
      const r = cv.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
      const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
      return [g.cam.x + px / g.cam.zoom, g.cam.y + py / g.cam.zoom];
    };
    const move = (e) => {
      const d = tileDrag.current, g = G.current;
      if (!d || e.pointerId !== d.id || !g) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.mode && Math.hypot(dx, dy) > 8) {
        if (Math.abs(dy) > Math.abs(dx) * 1.3 && d.list) d.mode = "scroll";
        else {
          d.mode = "drag";
          g.buildMode = d.kind; g.masterPick = d.pick; g.selectedId = null;
        }
      }
      if (d.mode === "scroll") d.list.scrollTop = d.top0 - dy;
      if (d.mode === "drag") {
        g.hover = toWorld(e);
        setDragGhost({ kind: d.kind, pick: d.pick, x: e.clientX, y: e.clientY });
      }
    };
    const up = (e) => {
      const d = tileDrag.current;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      tileDrag.current = null;
      setDragGhost(null);
      if (!d || d.mode !== "drag" || e.type === "pointercancel") return;
      d.dropped = true;
      const at = toWorld(e);
      if (at) handleTap(at[0], at[1]);
      if (G.current && e.pointerType !== "mouse") G.current.hover = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // what the tray is showing
  const trayMode = masterInfoPanel ? "info" : "build";
  const TRAY_D = compact ? 204 : 252;         // the tray's width, design px
  const trayW = Math.round(TRAY_D * s) + inset.right;   // the scaled panel, plus the notch side
  const trayTitle = { tower: null, castle: "Castle Works", talents: ui.hero?.name || "Hero", info: "Master build", wave: "The next wave", build: masterOn ? "Master builds" : "Towers" }[trayMode];

  return (
    <div ref={hudRef} className="cg-hud" style={{
      // the whole screen: the map and its landscape fill it, the tray stands
      // at the right; everything keeps clear of the notch and home indicator
      position: "relative", height: "100dvh", background: REALMS[realmId].GRASS_DK || "#17111b", boxSizing: "border-box", overflow: "hidden",
    }}>
        {menuOpen && (() => {
          // on a phone on its side the menu lies in two columns, so it fits at full size
          const two = vp.short && vp.landscape;
          const head = (
            <div style={{ textAlign: "center", marginBottom: 2 }}>
              <div className="cg-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3, color: "var(--gold)", textShadow: "2px 2px 0 var(--ink)" }}>PAUSED</div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                {level && <span>Chapter {level.chapter.numeral} · </span>}
                <b style={{ color: REALMS[realmId].tagColor }}>{REALMS[realmId].name}</b> · Wave {ui.wave}/{capOf(ui.wave)}
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
      {dragGhost && (
        <div aria-hidden="true" style={{ position: "fixed", left: dragGhost.x, top: dragGhost.y, zIndex: 200, pointerEvents: "none", transform: `translate(-50%, -115%) scale(${s})`, transformOrigin: "50% 100%", opacity: 0.92 }}>
          <span className="cg-well" style={{ display: "flex", padding: 3 }}><TowerPortrait kind={dragGhost.kind} branch={dragGhost.pick?.branch} rank4={dragGhost.pick?.rank4} size={56} /></span>
        </div>
      )}

      {/* ---- the play area: the realm's landscape, the map against the tray ---- */}
      <div ref={boardCellRef} style={{ position: "absolute", left: 0, top: 0, bottom: 0, right: trayW, overflow: "hidden" }}
        onPointerDown={(e) => { if (e.target === e.currentTarget || e.target === apronRef.current) trayHome(); }}>
        <canvas ref={apronRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: ui.zoom > 1 ? 0.45 : 1, transition: "opacity 0.3s" }} />
        <div style={{ position: "absolute", left: boardCss.x, top: boardCss.y, width: boardCss.vw, height: boardCss.vh, overflow: "hidden", background: REALMS[realmId].GRASS }}>
          <canvas
            ref={canvasRef} width={W * RES} height={H * RES}
            onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerCancel={onCanvasCancel}
            onPointerLeave={(ev) => { if (ev.pointerType === "mouse" && G.current) G.current.hover = null; }}
            onContextMenu={(ev) => ev.preventDefault()}
            style={{ position: "absolute", left: 0, top: cropTop, width: boardCss.w, height: boardCss.h, display: "block", cursor: ui.buildMode ? "copy" : ui.zoom > 1 ? "grab" : "pointer", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          />

          {/* top centre: what the next tap will do */}
          {ui.buildMode && ribbon(
            <>Placing <b>{(ui.masterOn && ui.masterPickName) || TOWERS[ui.buildMode].name}</b> — tap the {TOWERS[ui.buildMode].water ? "water" : "grass"}{ui.buildMode === "knight" ? "; knights muster south of the hall" : ""}.</>,
            "Cancel placement", () => { if (G.current) G.current.buildMode = null; })}
          {ui.rallyFor === "hero" && ribbon(
            <><b>{ui.hero?.name}</b> awaits your word — tap where the hero should go.</>, "Cancel hero move", cancelRally)}
          {ui.rallyFor === "militia" && ribbon(
            <>Sounding for the <b>militia</b> — tap where the farmers should stand.</>, "Cancel militia call", cancelRally)}
          {typeof ui.rallyFor === "string" && ui.rallyFor.startsWith("ab:") && (() => {
            const a = ui.hero?.abilities?.find((x) => `ab:${x.id}` === ui.rallyFor);
            return ribbon(a?.aim === "foe"
              ? <><b>{a.name}</b> — tap near a foe: the biggest one there takes the arrow.</>
              : <><b>{a?.name}</b> — tap the map where it should land.</>, "Cancel ability", cancelRally);
          })()}
          {ui.rallyFor != null && ui.rallyFor !== "hero" && ui.rallyFor !== "militia" && !(typeof ui.rallyFor === "string" && ui.rallyFor.startsWith("ab:")) && ribbon(
            <>Posting the <b>rally flag</b> — tap where the knights should stand.</>, "Cancel rally move", cancelRally)}

            {/* the Free Play sandbox's live controls: its own card over the map */}
            {sandboxPanel && mode === "free" && SANDBOX && !sel && (
              <SandboxPanel game={() => G.current} onClose={() => setSandboxPanel(false)} s={s} />
            )}

            {/* the castle works and the hero's talents: a wide card over the middle of the map, in columns so it doesn't scroll */}
            {(castleOpen || talentPanel) && !sel && (() => {
              const CW = Math.min(castleOpen ? 540 : 480, (boardCss.vw - 2 * CARD_M) / s);
              return floatCard({
                id: castleOpen ? "castle" : "talents", left: (boardCss.vw - CW * s) / 2, width: CW, f: 0.5, origin: "center",
                closeLabel: castleOpen ? "Close castle works" : "Close the hero's menu", onClose: trayHome,
                children: castleOpen ? (
                  <>
                    <div className="cg-label" style={{ marginBottom: 6, paddingRight: 16, display: "flex", alignItems: "center", gap: 6 }}><CastleIcon size={16} /> Castle works</div>
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
                  </>
                ) : talentPanel,
              });
            })()}

            {sel && towerPanel && ui.rallyFor == null && (() => {
              const g = G.current;
              const t = g?.towers.find((x) => x.id === sel.id);
              if (!t) return null;
              // beside the tower, on whichever side has more room, level with it;
              // on a short screen the card lies in two columns so it never scrolls
              // a maxed tower has nothing on its right but Sell: one column then
              const two = compact && !towerPanel.maxed;
              const bw = boardCss.vw, bh = boardCss.vh;
              const tx = (((t.x - g.cam.x) * g.cam.zoom) / W) * boardCss.w;
              const ty = (((t.y - g.cam.y) * g.cam.zoom) / H) * boardCss.h + cropTop;
              const CW = two ? 500 : 292, cw = CW * s;
              const flipX = tx > bw * 0.5;
              const left = Math.max(6 * s, Math.min(bw - cw - CARD_M, flipX ? tx - 26 * s - cw : tx + 26 * s));
              const f = Math.min(1, Math.max(0, ty / bh));
              return floatCard({
                id: sel.id, left, width: CW, f, origin: `${flipX ? "right" : "left"} center`,
                closeLabel: "Deselect tower", onClose: () => { if (G.current) G.current.selectedId = null; },
                children: two
                  ? <div className="cg-card-two" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 12, alignItems: "start" }}><div style={{ minWidth: 0 }}>{towerPanel.left}</div><div style={{ minWidth: 0 }}>{towerPanel.right}</div></div>
                  : <>{towerPanel.left}{towerPanel.right}</>,
              });
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

                  {/* the hero's level at the end of the waves, paid in their own stars */}
                  {won && heroAward && (
                    <div className="cg-well" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 10.5, textAlign: "left", lineHeight: 1.4 }}>
                      {hasRig(HEROES[heroAward.key]?.rig) ? <EnemyIcon type={HEROES[heroAward.key].rig} box={26} /> : <Star size={20} lit />}
                      <span><b style={{ color: "var(--gold-lt)" }}>{heroAward.name}</b> finished at level <b className="cg-num">{heroAward.level}</b> · <b className="cg-num" style={{ fontSize: 14, color: "var(--gold-lt)", textShadow: "1px 1px 0 var(--ink)" }}>+{heroAward.paid}</b> hero ★<br />
                        <span style={{ color: "var(--muted)" }}>{heroAward.prev ? (heroAward.level > heroAward.prev ? `a new best here (was ${heroAward.prev}) · ` : `best here is ${heroAward.prev}: a replay pays half · `) : "first win here · "}{heroAward.total} to spend on the Home Screen</span></span>
                    </div>
                  )}

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

        {/* ---- on the map: the purse top left; the hero, his talents and the militia bottom left ---- */}
        <div style={{ position: "absolute", top: 8 + inset.top, left: 8 + inset.left, display: "flex", flexDirection: compact ? "column" : "row", alignItems: "flex-start", gap: 6, zIndex: 20, pointerEvents: "none", ...scaleAt("top left") }}>
          {purse}
          {ui.zoom > 1 && <button title="Reset view" className="cg-btn cg-btn--slate" style={{ fontSize: 12, pointerEvents: "auto" }} onClick={() => setZoom(1)}>Reset view</button>}
        </div>
        {/* ---- bottom left: the horn, its arrow to the next wave's makeup and the rush switch, and the speed ---- */}
        {ui.result == null && (
          <div style={{ position: "absolute", left: 8 + inset.left, bottom: 8 + inset.bottom, zIndex: 20, ...scaleAt("bottom left") }}>
            {infoOpen && (
              <div className="cg-frame cg-pop" style={{ position: "absolute", left: 0, bottom: "calc(100% + 8px)", padding: 12, minWidth: 230, maxWidth: 340, width: "max-content", transformOrigin: "bottom left" }}>
                {wavePanel}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "stretch" }}>
                <button className={cls("cg-btn", fighting ? "cg-btn--slate" : "cg-btn--gold", !fighting && ui.cdSec != null && "cg-horn")} disabled={fighting}
                  style={{ minHeight: 54, padding: "0 10px 0 9px", gap: 8, ...(fighting ? { filter: "none", cursor: "default" } : {}) }}
                  aria-label={fighting ? `Wave ${ui.wave} on the field` : `Sound the horn: start wave ${ui.wave + 1}`}
                  onClick={() => startWave(G.current)}>
                  {fighting ? <SkullIcon size={18} /> : <PlayIcon size={18} />}
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                    <span style={{ fontSize: 10, letterSpacing: 1.5 }}>WAVE</span>
                    <span className="cg-num" style={{ fontSize: 18, textShadow: fighting ? "2px 2px 0 var(--ink)" : "1px 1px 0 rgba(255,243,210,0.5)" }}>{nextWave}<span style={{ fontSize: 12, opacity: 0.75, marginLeft: 1 }}>/{capOf(nextWave)}</span></span>
                  </span>
                  {lead.length > 0 && (
                    <span style={{ display: "flex", gap: 3 }}>
                      {lead.map(({ type, count }) => (
                        <span key={type} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span className="cg-well" style={{ width: 30, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: ENEMIES[type].boss ? "#e8b0a0" : "var(--parch)", boxShadow: "inset 2px 2px 0 var(--parch-dk)" }}>
                            <EnemyIcon type={type} box={23} />
                          </span>
                          <span style={{ fontSize: 10, lineHeight: 1, marginTop: 1 }}>×{count}</span>
                        </span>
                      ))}
                    </span>
                  )}
                  {!fighting && ui.cdSec != null && (
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1, paddingLeft: 2 }}>
                      <span className="cg-num" style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, textShadow: "none" }}>+{Math.min(45, Math.ceil(ui.cdSec * 1.5))}<CoinIcon size={11} /></span>
                      <span className="cg-num" style={{ fontSize: 9, opacity: 0.8, textShadow: "none" }}>{ui.cdSec}s</span>
                    </span>
                  )}
                </button>
                <button aria-label={infoOpen ? "Hide wave info" : "Show wave info and the rush switch"}
                  className={cls("cg-btn", fighting ? "cg-btn--slate" : "", infoOpen && "is-on")}
                  style={{ minWidth: 38, padding: 0, marginLeft: -2, minHeight: 54, flexDirection: "column", gap: 3 }}
                  onClick={() => setInfoOpen((o) => !o)}>
                  {infoOpen ? <ChevronDown size={7} /> : <ChevronUp size={7} />}
                  {ui.rush && <BoltIcon size={11} />}
                </button>
              </div>
              <button title="Game speed" aria-label={`Game speed ${ui.speed}x`} className={cls("cg-btn", ui.speed > 1 && "is-on")} style={{ minWidth: 54, minHeight: 54, flexDirection: "column", gap: 2, padding: "0 6px" }} onClick={cycleSpeed}>
                <SpeedIcon speed={ui.speed} size={16} /><span style={{ fontSize: 11 }}>{ui.speed}x</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- the tray ---- */}
      <div className="cg-drawer" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: trayW, boxSizing: "border-box", paddingLeft: 0, paddingRight: inset.right, zIndex: 30 }}>
        <div style={{ position: "relative", height: "100%" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, width: TRAY_D, height: `${100 / s}%`, boxSizing: "border-box",
            transform: s === 1 ? undefined : `scale(${s})`, transformOrigin: "0 0",
            // the oak rim down the tray's left edge is 10 css px wide
            display: "flex", flexDirection: "column", padding: `${6 + inset.top / s}px 6px ${6 + inset.bottom / s}px ${10 / s + 4}px`, gap: 6,
          }}>
            {/* head: the wave count and the pause menu */}
            <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
              <div className="cg-panel" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "0 8px", minHeight: 40 }}>
                <SkullIcon size={14} />
                <span className="cg-label" style={{ fontSize: 10, color: "var(--muted)" }}>Wave</span>
                <span className="cg-num" style={{ fontSize: 15, color: "var(--cream)" }}>{Math.max(ui.wave, 1)}<span style={{ fontSize: 11, opacity: 0.75 }}>/{capOf(ui.wave)}</span></span>
              </div>
              <button title="Pause and open the menu" aria-label="Pause and open the menu" className={cls("cg-btn", menuOpen && "is-on")} style={{ minWidth: 42, minHeight: 40, padding: 0 }} onClick={openMenu}>
                <PauseIcon size={15} />
              </button>
            </div>
            {/* the castle works, and Master Builds when the purse can afford them */}
            {ui.result == null && (
              <div style={{ display: "flex", gap: 6 }}>
                <button aria-label="Open the castle works" title="Castle works: defences built on the wall itself, kept for the whole region"
                  className={cls("cg-btn", castleOpen && "is-on")} style={{ flex: 1, minHeight: 40, fontSize: 12, gap: 6 }} onClick={() => trayOpen("castle")}>
                  <CastleIcon size={18} /> Castle
                </button>
                {mode === "free" && SANDBOX && (
                  <button aria-label="Open the sandbox controls" title="Sandbox: gold, walls, summon any foe, reshape the war ahead"
                    className={cls("cg-btn cg-btn--slate", sandboxPanel && "is-on")} style={{ minHeight: 40, padding: "0 8px", fontSize: 12, gap: 4 }}
                    onClick={() => { const was = sandboxPanel; trayHome(); if (!was) { if (G.current) G.current.buildMode = null; setSandboxPanel(true); } }}>
                    <HammerIcon size={12} /> Sandbox
                  </button>
                )}
                {ui.masterShow && (
                  <button title="Master Builds: place any final form whole" className={cls("cg-btn cg-btn--slate", masterOn && "is-on")} style={{ minHeight: 40, padding: "0 8px", fontSize: 12, gap: 4 }}
                    onClick={() => { const gg = G.current; if (!gg) return; gg.masterBuild = !gg.masterBuild; gg.buildMode = null; gg.masterPick = null; setMasterInfo(null); trayHome(); }}>
                    <BoltIcon size={12} /> Master
                  </button>
                )}
              </div>
            )}

            {/* the panel: towers by default, else whatever is selected */}
            <div className="cg-panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--slate-in)" }}>
              {trayMode !== "build" && (
                <div className="cg-drawer-head" style={{ margin: 0, padding: "4px 4px 4px 10px" }}>
                  <span className="cg-label" style={{ flex: 1, whiteSpace: "normal" }}>{trayTitle || (selDef ? selDef.name : "")}</span>
                  <button aria-label="Back to the towers" className="cg-btn cg-btn--slate cg-x" onClick={trayHome}><CloseIcon size={11} /></button>
                </div>
              )}
              <div className="cg-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: trayMode === "build" ? 6 : "8px 8px 10px" }}>
                {trayMode === "info" && masterInfoPanel}
                {trayMode === "wave" && wavePanel}
                {trayMode === "build" && (
                  <>
          {masterOn ? (
                /* the master menu: each tower's every ascension, bought outright */
                Object.entries(TOWERS).filter(([key]) => hallAvail(key)).map(([key, def]) => (
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
                            style={{ width: "100%", flexDirection: "column", justifyContent: "flex-end", gap: 3, padding: "8px 4px 7px", minHeight: 100, touchAction: "none" }}
                            onPointerDown={(e) => { if (can) startTileDrag(e, key, { kind: key, branch: plan.branch, rank4: plan.rank4, name: plan.name }); }}
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
              {Object.entries(TOWERS).sort(([a], [b]) => hallAvail(b) - hallAvail(a))
                .filter(([key]) => !compact || showLocked || hallAvail(key)).map(([key, def]) => {
                const open = hallAvail(key);
                const can = open && ui.gold >= def.cost;
                const active = ui.buildMode === key;
                const need = open ? null : unlockLevel(key);
                // a hall the sandbox left out, rather than one still to be won
                const benched = !open && mode === "free" && !!SANDBOX;
                return (
                  <button key={key} title={open ? def.blurb : benched ? "Left out of this sandbox run." : `Locked — clear ${need?.name || "the campaign"} to learn this hall.`}
                    className={cls("cg-btn cg-btn--slate", active && "is-on", open && !can && "is-poor", !open && "is-off")}
                    style={{ width: "100%", flexDirection: "column", gap: 3, padding: "6px 3px 6px", minHeight: compact ? 88 : 100, touchAction: "none" }}
                    onPointerDown={(e) => { if (can) startTileDrag(e, key); }}
                    onClick={() => { const gg = G.current; if (!gg) return; gg.buildMode = active ? null : key; gg.masterPick = null; gg.selectedId = null; setBuildOpen(false); }}
                    disabled={!can}>
                    <span className="cg-well cg-dim" style={{ width: compact ? 56 : 60, height: compact ? 50 : 54, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <TowerPortrait kind={key} size={compact ? 48 : 50} />
                    </span>
                    <span className="cg-dim" style={{ fontSize: compact ? 11 : 10, lineHeight: 1.15 }}>{def.name}</span>
                    {open
                      ? price(def.cost, can, 12)
                      : <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--body)", fontWeight: "normal", fontSize: 9, textShadow: "none", color: "var(--muted)", lineHeight: 1.2 }}><LockIcon size={11} />{!compact && (benched ? "sandbox" : need ? need.short || need.name : "campaign")}</span>}
                  </button>
                );
              })}
              {compact && Object.keys(TOWERS).some((k) => !hallAvail(k)) && (
                <button className="cg-btn cg-btn--slate" style={{ width: "100%", minHeight: 44, fontSize: 11, gap: 5, gridColumn: "1 / -1" }} onClick={() => setShowLocked((o) => !o)}>
                  <LockIcon size={12} />{showLocked ? "Hide locked" : `${Object.keys(TOWERS).filter((k) => !hallAvail(k)).length} locked`}
                </button>
              )}
            </div>
          )}
                  </>
                )}
              </div>
            </div>

            {/* foot: the hero, his talents and the militia */}
            {ui.result == null && (
              <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                {heroBtn}{talentBtn}{militiaBtn}
              </div>
            )}
          </div>
        </div>
      </div>

            {/* Free Play's way in: the sandbox setup (presets, then any setting) */}
            {realmOpen && (
              <SandboxSetup initial={{ ...loadSandbox(), ...(SANDBOX ? { realm: SANDBOX.realm } : {}) }}
                onStart={startSandboxRun} onBack={closeRealmSelect} />
            )}
    </div>
  );
}
