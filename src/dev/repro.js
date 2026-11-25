// ============ DEV ONLY: plays won level -> march on -> next level by itself, and reports the frame rate ============
// Loaded by dev/canvaswatch.js when the page is opened with ?repro. Options: &cycles=N (levels, default 3),
// &secs=N (seconds of battle measured on each, default 25), &level=<id> (the first level, default the campaign's first).
// Each result is POSTed to /__perf (vite.config.js writes .shots/perf.jsonl) and shown on the phone.

import { canvasStats } from "./canvaswatch.js";
// everything else comes from the game through window.__cg (CrownguardGame.jsx): importing the engine here
// would split its modules into other chunks in a build and break their load order (an import cycle)
const CG = () => window.__cg;
const PERF = { get now() { return CG().PERF.now; } };
const TIDY = new Proxy({}, { get: (_, k) => CG().TIDY[k], set: (_, k, v) => { CG().TIDY[k] = v; return true; } });
const startWave = (g) => CG().startWave(g), placeTower = (...a) => CG().placeTower(...a), upgradeTower = (...a) => CG().upgradeTower(...a), buildableAt = (...a) => CG().buildableAt(...a);
const levelById = (id) => CG().levelById(id);

const q = new URLSearchParams(window.location.search);
const CYCLES = Math.max(1, Number(q.get("cycles")) || 2);   // levels: every one but the last is played out to its win
const SECS = Math.max(5, Number(q.get("secs")) || 60);
const SPEED = Math.max(1, Number(q.get("speed")) || 3);   // game speed in the measured battles (more happens, more sound)
const RUN = Math.random().toString(36).slice(2, 7);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const post = (o) => fetch("/__perf", { method: "POST", body: JSON.stringify({ run: RUN, t: Math.round(performance.now()), ...o }) }).catch(() => {});

let box = null;
const say = (html) => { if (box) box.innerHTML = html; };

export function showStart() {
  // whatever the crash recorder kept (native/crashlog.js), so a "hit a snag" screen can be read on the Mac
  try { post({ event: "crashlog", log: JSON.parse(localStorage.getItem("cg-crash") || "null") }); } catch (e) { post({ event: "crashlog", raw: String(localStorage.getItem("cg-crash")) }); }
  window.addEventListener("error", (e) => post({ event: "window error", message: String(e.message), at: `${e.filename}:${e.lineno}:${e.colno}`, stack: String(e.error?.stack || "") }));
  window.addEventListener("unhandledrejection", (e) => post({ event: "rejection", message: String(e.reason?.message || e.reason), stack: String(e.reason?.stack || "") }));
  box = document.createElement("div");
  box.style.cssText = "position:fixed;left:8px;top:8px;z-index:10000;max-width:70vw;padding:8px 10px;background:rgba(0,0,0,.8);color:#fff;font:600 13px/1.35 -apple-system,system-ui,sans-serif;border-radius:8px;pointer-events:auto";
  document.body.appendChild(box);
  const btn = (id, label, bg) => `<button id="${id}" style="font:700 18px -apple-system,system-ui;padding:12px 16px;margin:0 6px 6px 0;border-radius:10px;border:0;background:${bg};color:#fff">${label}</button>`;
  say(`${btn("cg-repro-old", "Start: old sound", "#a0522d")}${btn("cg-repro-new", "Start: fixed sound", "#2e8b57")}<div>Plays level 1 to a real win, marches on, and measures level 2 (about 10 min) at ${SPEED}x speed. ${window.navigator.standalone ? "Home-screen app." : "Safari tab."} Don't touch the screen.</div>`);
  const go = (untidy) => () => { TIDY.untidy = untidy; run().catch((e) => { say(`Test failed: ${e?.message}`); post({ event: "error", message: String(e?.message), stack: String(e?.stack || "") }); }); };
  box.querySelector("#cg-repro-old").onclick = go(true);
  box.querySelector("#cg-repro-new").onclick = go(false);
  box.insertAdjacentHTML("beforeend", btn("cg-repro-hand", "Play by hand", "#7a3db8"));
  box.querySelector("#cg-repro-hand").onclick = () => byHand();
  box.insertAdjacentHTML("beforeend", btn("cg-repro-stress", "Sound stress (2 min)", "#4a5bd0"));
  box.querySelector("#cg-repro-stress").onclick = () => stress().catch((e) => { say(`Test failed: ${e?.message}`); post({ event: "error", message: String(e?.message), stack: String(e?.stack || "") }); });
}

async function until(fn, ms = 120000) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { const v = fn(); if (v) return v; await wait(100); }
  throw new Error("timed out waiting");
}

// a few halls by the road, raised to level 3, so the battle bakes what a real one does
function buildHalls(g) {
  g.gold = 99999;
  g.lives = 999;
  const kinds = ["archer", "wizard", "catapult", "knight", "archer", "wizard", "archer", "catapult"];
  let placed = 0, tries = 0;
  while (placed < kinds.length && tries < 4000) {
    tries++;
    const x = 60 + Math.random() * (CG().W - 200), y = 40 + Math.random() * (CG().H - 80);
    const k = kinds[placed];
    if (!buildableAt(g, x, y, k)) continue;
    const n = g.towers.length;
    placeTower(g, k, x, y);
    if (g.towers.length > n) placed++;
  }
  for (const t of g.towers) { upgradeTower(g, t); upgradeTower(g, t); }
  g.gold = 99999;
  return placed;
}

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function measure(label, secs, g) {
  const samples = [];
  let last = PERF.now;
  for (let i = 0; i < secs; i++) {
    if (g) { if (g.phase === "build") startWave(g); g.lives = Math.max(g.lives, 999); g.speed = SPEED; }
    await wait(1000);
    const p = PERF.now;
    if (p && p !== last) { last = p; samples.push({ ...p, foes: g ? g.enemies.length : 0 }); }
    say(`Test ${RUN} · ${label} · ${i + 1}/${secs} s · ${p ? `${p.fps} fps · ${p.js} ms` : ""}`);
  }
  const cs = canvasStats();
  const out = {
    event: "measure", label, fps: median(samples.map((s) => s.fps)), js: median(samples.map((s) => s.js)),
    draw: median(samples.map((s) => s.draw)), ticks: median(samples.map((s) => s.ticks)), canvases: cs, audio: { ...CG().TIDY, connected: TIDY.made - TIDY.unplugged }, samples,
  };
  post(out);
  return out;
}

async function run() {
  try { await navigator.wakeLock?.request("screen"); } catch { /* not offered: the screen may sleep */ }
  say("Starting…");
  const cg = await until(() => window.__cg);
  post({ event: "start", standalone: !!window.navigator.standalone, untidy: TIDY.untidy, speed: SPEED, ua: navigator.userAgent, screen: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`, cycles: CYCLES, secs: SECS, canvases: canvasStats() });
  cg.openMap();
  await wait(5000);
  await measure("campaign map (start)", 5, null);
  // the first level: the map card's own button, as a player starts it
  const clickText = (re) => { const b = [...document.querySelectorAll("button")].find((x) => re.test(x.textContent.trim()) && !x.disabled); if (b) b.click(); return !!b; };
  if (!clickText(/^(March on |Ride Out Again)/)) window.__cg.startLevel(levelById(q.get("level") || "") || levelById("gw1"));
  const rows = [];
  for (let c = 0; c < CYCLES; c++) {
    const t0 = performance.now();
    const g = await until(() => window.__cg.screen === "game" && window.__cg.G.current?.ckLevel && window.__cg.G.current.phase !== "won" && window.__cg.G.current);
    const lvId = g.ckLevel;
    post({ event: "on screen", level: lvId, cycle: c + 1, ms: Math.round(performance.now() - t0), canvases: canvasStats() });
    await wait(2500);
    buildHalls(g);
    const m = await measure(`level ${c + 1}: ${lvId} (first ${SECS} s)`, SECS, g);
    rows.push(`${c + 1}. ${lvId}: <b>${m.fps} fps</b> · ${m.js} ms · ${m.canvases.aliveMB} MB canvas · ${TIDY.made - TIDY.unplugged} sound nodes`);
    say(rows.join("<br>"));
    if (c === CYCLES - 1) break;
    // play the level out for real, to its last wave, at the test's speed
    const tPlay = performance.now();
    while (g.phase !== "won" && performance.now() - tPlay < 20 * 60000) {
      if (g.phase === "build") startWave(g);
      g.lives = Math.max(g.lives, 999); g.speed = SPEED; g.gold = Math.max(g.gold, 5000);
      await wait(1000);
      const p = PERF.now;
      say(`${rows.join("<br>")}<br>playing ${lvId} out: wave ${g.wave} · ${p ? `${p.fps} fps · ${p.js} ms` : ""}`);
    }
    const tail = await measure(`level ${c + 1}: ${lvId} (its end)`, 5, null);
    post({ event: "won", level: lvId, phase: g.phase, wave: g.wave, playedS: Math.round((performance.now() - tPlay) / 1000), endFps: tail.fps });
    await wait(4000);
    // the victory card's own March On, then the map card's march, as a player taps them
    if (!clickText(/^March On/)) throw new Error("no March On button");
    await until(() => window.__cg.screen === "map");
    await wait(7000);
    if (!clickText(/^(March on |Ride Out Again)/)) throw new Error("no march button on the map card");
  }
  post({ event: "done", canvases: canvasStats() });
  say(`<b>Done</b> — the results went to the Mac.<br>${rows.join("<br>")}`);
}

// Sound stress: a battle on screen while finished, still-connected sound nodes pile up in the game's own
// AudioContext 10,000 at a time (what the old sound code left behind), measuring the frame rate at each step.
// If WebKit slows down with a big graph, this shows at what size.
async function stress() {
  say("Sound stress: starting…");
  const cg = await until(() => window.__cg);
  const ctx = cg.sfx.audio()?.ctx;
  if (!ctx) throw new Error("no audio");
  try { await ctx.resume(); } catch { /* */ }
  post({ event: "start", kind: "stress", standalone: !!window.navigator.standalone, ua: navigator.userAgent, screen: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`, audioState: ctx.state, rate: ctx.sampleRate });
  cg.startLevel(levelById("gw1"));
  const g = await until(() => window.__cg.screen === "game" && window.__cg.G.current?.ckLevel && window.__cg.G.current);
  await wait(2500);
  buildHalls(g);
  TIDY.untidy = false;   // the game's own sounds unplug themselves; only the pile below grows
  let nodes = 0;
  const rows = [];
  for (let step = 0; step <= 16; step++) {
    const m = await measure(`stress ${nodes} nodes`, 6, g);
    post({ event: "stress", nodes, fps: m.fps, js: m.js, ticks: m.ticks, audioState: ctx.state });
    rows.push(`${nodes}: <b>${m.fps} fps</b> · ${m.js} ms`);
    say(`Sound stress<br>${rows.slice(-6).join("<br>")}`);
    // 10,000 more: oscillator -> filter -> gain -> out, each played for 10 ms and left connected
    for (let made = 0; made < 10000;) {
      const t = ctx.currentTime + 0.02;
      for (let i = 0; i < 600; i++) {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), v = ctx.createGain();
        v.gain.value = 0.0001;
        o.connect(f); f.connect(v); v.connect(ctx.destination);
        o.start(t); o.stop(t + 0.01);
        made += 3;
      }
      await wait(30);
    }
    nodes += 10000;
  }
  post({ event: "done", kind: "stress", nodes });
  say(`<b>Done</b> — sound stress results went to the Mac.<br>${rows.join("<br>")}`);
}

// Play by hand: the old sound code (as the live game), the box out of the way, and every 5 s a reading posted to
// the Mac (frame rate, ms of game code, where the game is, canvases and sound nodes alive), so a slowdown during
// real play is seen as it happens.
function byHand() {
  TIDY.untidy = true;
  box.style.display = "none";
  const cg = window.__cg;
  post({ event: "start", kind: "hand", standalone: !!window.navigator.standalone, ua: navigator.userAgent, screen: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}` });
  setInterval(() => {
    const c = window.__cg, g = c.G.current, p = PERF.now;
    post({ event: "live", screen: c.screen, level: g?.ckLevel || null, wave: g?.wave ?? null, phase: g?.phase || null,
      paused: !!g?.paused, speed: g?.speed, foes: g?.enemies?.length ?? 0, halls: g?.towers?.length ?? 0,
      fps: p?.fps, ticks: p?.ticks, js: p?.js, draw: p?.draw, gapMax: p?.gapMax, parts: p?.parts,
      canvases: canvasStats(), audioLeft: CG().TIDY.made - CG().TIDY.unplugged, domNodes: document.getElementsByTagName("*").length,
      upS: Math.round(performance.now() / 1000), vis: document.visibilityState });
  }, 5000);
}
