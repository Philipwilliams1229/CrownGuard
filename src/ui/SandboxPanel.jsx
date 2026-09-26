// ============ THE SANDBOX'S HANDS (in battle) ============
// The Free Play sandbox's live controls, opened from the battle tray during a
// sandbox run: a wide card over the middle of the map, in three columns so it
// never scrolls (only the foe grid may scroll, inside its own box).
//
//   <SandboxPanel game={() => G.current} onClose={...} s={scale} />
//
// Place it inside the board's viewport box (position: relative/absolute): it
// fills that box, measures it, and centres its card there at scale `s`,
// leaving the map around it live (tap the field to close, as the other
// cards do). It re-renders itself four times a second to keep the purse,
// the castle and the wave current.
//
//   PURSE & WALLS  infinite gold, an unbreakable castle, +gold, +lives
//   THE WAR AHEAD  health / pace / count / spacing multipliers, the champion
//                  rhythm, skip to a wave (between waves only)
//   SUMMON         any foe in the game, 1-25 at a time, at the gate or mid-road;
//                  sweep the road (two taps)
//
// Everything goes through data/sandbox.js (tweakSandbox, SANDBOX, runHonest)
// and engine/sandboxTools.js. A helping hand (gold, lives, a swept road, a
// skipped wave) or any setting easier than Classic ends the run's rewards for
// good; calling up MORE foes never does.

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import "./hud/hud.css";
import "./hud/sandbox-panel.css";
import { SANDBOX, LIMITS, tweakSandbox, runHonest, typesOf, isBoss, INFINITE_GOLD } from "../data/sandbox.js";
import { sandboxSpawn, sandboxClear, sandboxGold, sandboxLives, sandboxSkipTo } from "../engine/sandboxTools.js";
import { ENEMIES } from "../data/enemies.js";
import { FACTIONS } from "../data/factions.js";
import EnemyIcon from "./EnemyIcon.jsx";
import { useArm, ARMED } from "./HeroTalents.jsx";
import { CoinIcon, HeartIcon, CastleIcon, SkullIcon, SwordIcon, FlagIcon, ShieldIcon, StarIcon, CloseIcon, LockIcon } from "./hud/icons.jsx";

const cls = (...a) => a.filter(Boolean).join(" ");
const num = (n) => Math.floor(n).toLocaleString("en-US");
// a multiplier as the player reads it: x1, x1.5, x0.35
const mul = (v) => `x${+(+v).toFixed(2)}`;
const COUNTS = [1, 5, 10, 25];

// every foe in the game, by army: each army's roster order, champions last
const FOES = Object.keys(FACTIONS).map((id) => {
  const types = typesOf({ army: id }).filter((t) => ENEMIES[t]);
  return { id, name: FACTIONS[id].name, color: FACTIONS[id].tagColor, types: [...types.filter((t) => !isBoss(t)), ...types.filter(isBoss)] };
});

// A stepper: − value +. Holding a button repeats, faster the longer it's held.
function Stepper({ value, onStep, canDown = true, canUp = true, label, show, wide = 58 }) {
  const hold = useRef(null);
  const stop = () => { if (hold.current) { clearTimeout(hold.current.t); hold.current = null; } };
  useEffect(() => stop, []);
  const start = (dir) => (e) => {
    if (e.button != null && e.button !== 0) return;
    stop();
    onStep(dir);
    const h = { n: 0, t: 0 };
    const again = () => { h.n++; onStep(dir); h.t = setTimeout(again, h.n > 8 ? 45 : 110); };
    h.t = setTimeout(again, 380);
    hold.current = h;
  };
  const btn = (dir, ok, text) => (
    <button type="button" className="cg-btn cg-btn--slate sbp-step" disabled={!ok} aria-label={`${label} ${dir < 0 ? "down" : "up"}`}
      onPointerDown={ok ? start(dir) : undefined} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if (ok && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onStep(dir); } }}
      onContextMenu={(e) => e.preventDefault()}>{text}</button>
  );
  return (
    <span className="sbp-stepper">
      {btn(-1, canDown, "−")}
      <span className="cg-well sbp-val" style={{ width: wide }}><b className="cg-num">{show ?? value}</b></span>
      {btn(1, canUp, "+")}
    </span>
  );
}

// the little red tag on anything that would end the run's rewards
const Ends = ({ on }) => (on ? <span className="sbp-ends">ends rewards</span> : null);

export default function SandboxPanel({ game, onClose, s = 1 }) {
  // live numbers: four looks a second
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 250); return () => clearInterval(t); }, []);

  // the box we stand in, so the card fits it at scale s
  const boxRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [count, setCount] = useState(5);
  const [at, setAt] = useState(0);            // 0 = the gate (the road's mouth), 0.5 = mid-road
  const [said, setSaid] = useState(null);     // the last summon, for a line of feedback
  const [skipTo, setSkipTo] = useState(null);
  const arm = useArm();

  const g = game?.();
  const S = SANDBOX;
  const honest = runHonest();
  if (!S) {
    return (
      <div ref={boxRef} className="cg-hud sbp-box">
        <div className="cg-frame sbp-card" style={{ transform: `scale(${s})`, width: 320 }}>
          <div className="cg-label">Sandbox</div>
          <p className="sbp-note">The sandbox's hands only work in a Free Play sandbox run.</p>
          <button aria-label="Close the sandbox" className="cg-btn cg-btn--slate cg-x cg-corner-x" onClick={onClose}><CloseIcon size={12} /></button>
        </div>
      </div>
    );
  }

  const phase = g?.phase || "build";
  const wave = g?.wave || 0;
  const between = phase === "build";
  const target = Math.max(1, skipTo ?? wave + 1);
  const tweak = (patch) => { tweakSandbox(patch); setTick((n) => n + 1); };
  const step = (k) => (dir) => {
    const L = LIMITS[k];
    const cur = SANDBOX?.[k] ?? 1;
    const v = Math.min(L.max, Math.max(L.min, Math.round((cur + dir * L.step) / L.step) * L.step));
    tweak({ [k]: +v.toFixed(2) });
  };
  const bump = () => setTick((n) => n + 1);

  // the card: as wide as the columns want, never wider than the box
  const M = 24 * s;
  const cw = box.w ? Math.min(820, (box.w - 2 * M) / s) : 720;
  const ch = box.h ? (box.h - 2 * M) / s : 420;
  const tight = ch < 470;       // a phone on its side: slimmer rows

  const gold = S.infiniteGold ? "∞" : num(g?.gold ?? 0);
  const phaseText = phase === "build" ? "between waves" : phase === "combat" ? "on the march" : phase === "won" ? "won" : "lost";

  // -- PURSE & WALLS --
  const purse = (
    <section className="sbp-col">
      <div className="cg-label sbp-head"><CoinIcon size={13} /> Purse &amp; walls</div>
      <div className="cg-well sbp-readout">
        <span className="sbp-read"><CoinIcon size={15} /><b className="cg-num" style={{ color: "var(--gold-lt)", fontSize: S.infiniteGold ? 20 : 14 }}>{gold}</b></span>
        <span className="sbp-read"><HeartIcon size={15} /><b className="cg-num" style={{ color: "#ffb4a8", fontSize: 14 }}>{num(g?.lives ?? 0)}</b></span>
      </div>
      <button type="button" className={cls("cg-btn sbp-toggle", S.infiniteGold && "is-on")} aria-pressed={S.infiniteGold}
        onClick={() => {
          const on = !S.infiniteGold;
          tweak({ infiniteGold: on });
          // the engine holds the purse at INFINITE_GOLD while it's on; off, it
          // drops back to the run's starting purse rather than keep the hoard
          if (!on && g && g.gold >= INFINITE_GOLD) g.gold = S.gold;
        }}>
        <span className="sbp-tick">{S.infiniteGold ? "✓" : ""}</span>
        <span className="sbp-tl">Infinite gold<Ends on={honest && !S.infiniteGold} /></span>
      </button>
      <button type="button" className={cls("cg-btn sbp-toggle", S.invincible && "is-on")} aria-pressed={S.invincible}
        onClick={() => tweak({ invincible: !S.invincible })}>
        <span className="sbp-tick">{S.invincible ? "✓" : ""}</span>
        <span className="sbp-tl">Unbreakable castle<Ends on={honest && !S.invincible} /></span>
      </button>
      <div className="sbp-pair">
        <button type="button" className="cg-btn" disabled={S.infiniteGold} onClick={() => { sandboxGold(g, 100); bump(); }}>
          <CoinIcon size={12} /><span className="cg-num sbp-bn">+100</span></button>
        <button type="button" className="cg-btn" disabled={S.infiniteGold} onClick={() => { sandboxGold(g, 1000); bump(); }}>
          <CoinIcon size={12} /><span className="cg-num sbp-bn">+1000</span></button>
      </div>
      <div className="sbp-pair">
        <button type="button" className="cg-btn" onClick={() => { sandboxLives(g, 1); bump(); }}>
          <HeartIcon size={12} /><span className="cg-num sbp-bn">+1</span></button>
        <button type="button" className="cg-btn" onClick={() => { sandboxLives(g, 10); bump(); }}>
          <HeartIcon size={12} /><span className="cg-num sbp-bn">+10</span></button>
      </div>
      {honest && <div className="sbp-note">Gold and lives from here <b className="sbp-red">end rewards</b> for this run.</div>}
    </section>
  );

  // -- THE WAR AHEAD --
  const row = (k, label, easier) => {
    const L = LIMITS[k], v = S[k];
    return (
      <div className="sbp-row" key={k}>
        <span className="sbp-rl">{label}</span>
        <Stepper label={label} value={v} show={mul(v)} onStep={step(k)} canDown={v > L.min + 1e-9} canUp={v < L.max - 1e-9} />
        {easier(v) ? <span className="sbp-dot" title="easier than Classic: no rewards" /> : <span className="sbp-dot is-ok" />}
      </div>
    );
  };
  const war = (
    <section className="sbp-col">
      <div className="cg-label sbp-head"><SwordIcon size={13} /> The war ahead</div>
      {row("hpMul", "Health", (v) => v < 1)}
      {row("speedMul", "Pace", (v) => v < 1)}
      {row("countMul", "Count", () => false)}
      {row("gapMul", "Spacing", () => false)}
      <div className="sbp-row">
        <button type="button" className={cls("cg-btn sbp-champ", S.bosses && "is-on")} aria-pressed={S.bosses}
          title="Champions lead the waves" onClick={() => tweak({ bosses: !S.bosses })}>
          <StarIcon size={12} lit={S.bosses} /><span>Champ</span>
        </button>
        {S.bosses
          ? <Stepper label="Champion every" value={S.bossEvery} show={`/${S.bossEvery}`} wide={48}
              onStep={step("bossEvery")} canDown={S.bossEvery > LIMITS.bossEvery.min} canUp={S.bossEvery < LIMITS.bossEvery.max} />
          : <span className="sbp-note" style={{ flex: 1 }}>No champions.</span>}
      </div>
      <div className="sbp-note sbp-sub">{S.bosses ? `A champion leads every ${S.bossEvery === 1 ? "wave" : `${S.bossEvery}th wave`}.` : "Tap Champ to bring them back."} Changes apply from the next wave; pace, to new foes.</div>
      <div className="sbp-row">
        <span className="sbp-rl">Wave</span>
        <Stepper label="Skip to wave" value={target} wide={48}
          onStep={(d) => setSkipTo(Math.min(LIMITS.startWave.max, Math.max(1, target + d)))} canDown={target > 1} canUp={target < LIMITS.startWave.max} />
        <button type="button" className="cg-btn cg-btn--gold sbp-go" disabled={!between}
          onClick={() => { if (sandboxSkipTo(g, target)) { setSkipTo(null); bump(); } }}>
          {between ? <FlagIcon size={12} /> : <LockIcon size={12} />}Go</button>
      </div>
      <div className={cls("sbp-note sbp-sub", !between && "sbp-warn")}>
        {between ? <>The next horn sounds wave {target}.{honest && <> Skipping <b className="sbp-red">ends rewards</b>.</>}</>
          : "Skip only between waves: clear this one first."}
      </div>
    </section>
  );

  // -- SUMMON --
  const summon = (
    <section className="sbp-col sbp-summon">
      <div className="cg-label sbp-head"><SkullIcon size={13} /> Summon</div>
      <div className="sbp-seg" role="group" aria-label="How many">
        {COUNTS.map((n) => (
          <button key={n} type="button" className={cls("cg-btn cg-btn--slate", count === n && "is-on")} aria-pressed={count === n} onClick={() => setCount(n)}>
            <span className="cg-num sbp-bn">{n}</span></button>
        ))}
      </div>
      <div className="sbp-seg sbp-seg2" role="group" aria-label="Where">
        <button type="button" className={cls("cg-btn cg-btn--slate", at === 0 && "is-on")} aria-pressed={at === 0} onClick={() => setAt(0)}>At the gate</button>
        <button type="button" className={cls("cg-btn cg-btn--slate", at === 0.5 && "is-on")} aria-pressed={at === 0.5} onClick={() => setAt(0.5)}>Mid-road</button>
      </div>
      <div className="cg-well cg-scroll sbp-foes">
        {FOES.map((f) => (
          <div key={f.id} className="sbp-army">
            <div className="sbp-army-name" style={{ color: f.color }}>{f.name}</div>
            <div className="sbp-grid">
              {f.types.map((t) => {
                const d = ENEMIES[t], boss = isBoss(t);
                return (
                  <button key={t} type="button" className={cls("cg-btn cg-btn--slate sbp-foe", boss && "is-boss")} title={d.name}
                    aria-label={`Summon ${count} ${d.name}`}
                    onClick={() => { const n = sandboxSpawn(g, t, count, at); setSaid({ t, n, k: Date.now() }); bump(); }}>
                    <EnemyIcon type={t} box={boss ? 34 : 30} />
                    {boss && <span className="sbp-crown"><StarIcon size={10} /></span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="sbp-said" aria-live="polite">
        {said ? <span key={said.k} className="cg-rise"><b className="cg-num" style={{ fontSize: 10 }}>{said.n}</b> {ENEMIES[said.t].name} {at ? "mid-road" : "at the gate"}</span>
          : <span className="sbp-dim">Tap a foe to call it up. ★ marks a champion.</span>}
      </div>
      <button type="button" data-arm="sbp-clear" className="cg-btn cg-btn--red sbp-clear"
        style={arm.is("sbp-clear") ? ARMED : undefined}
        onClick={() => arm.tap("sbp-clear", () => { sandboxClear(g); setSaid(null); bump(); })}>
        {arm.is("sbp-clear")
          ? <span className="sbp-again">TAP AGAIN TO CLEAR</span>
          : <><ShieldIcon size={13} /> Clear the road <span className="cg-num sbp-bn sbp-dim">{g?.enemies?.length || 0}</span><Ends on={honest} /></>}
      </button>
    </section>
  );

  return (
    <div ref={boxRef} className="cg-hud sbp-box">
      <div className={cls("cg-pop sbp-pos", tight && "is-tight")}
        style={{ width: cw, maxHeight: ch, transform: `scale(${s})` }}>
        <div className="cg-frame sbp-card" style={{ maxHeight: ch }}>
          <div className="sbp-top">
            <span className="cg-label sbp-title"><CastleIcon size={16} /> Sandbox</span>
            <span className="sbp-wave"><span className="cg-label" style={{ color: "var(--muted)" }}>Wave</span>
              <b className="cg-num" style={{ fontSize: 13, color: "var(--cream)" }}>{wave}</b>
              <span className="sbp-dim">{phaseText}</span></span>
            <span className={cls("sbp-honest", honest ? "is-ok" : "is-off")}>
              <StarIcon size={12} lit={honest} />{honest ? "Rewards on" : "No rewards this run"}
            </span>
          </div>
          <div className="sbp-honest-note">
            {honest
              ? "This run still banks stars and XP. Anything marked ends rewards — or a war made easier than Classic — turns them off for the whole run."
              : "This run was made easier, so it banks no stars or XP — for the rest of the run, whatever you change back."}
          </div>
          <div className="sbp-cols">
            {purse}
            {war}
            {summon}
          </div>
        </div>
        <button aria-label="Close the sandbox" className="cg-btn cg-btn--slate cg-x cg-corner-x" onClick={onClose}><CloseIcon size={12} /></button>
      </div>
    </div>
  );
}
