// ============ FREE PLAY: THE SANDBOX SETUP ============
// The way into Free Play: pick a preset, then bend any part of the war on
// top of it — the battlefield, the army and each foe in it, the purse, the
// castle, which halls the tray offers and how far they grow, the hero and
// the pace. Everything edits ONE settings object (data/sandbox.js); a run
// that is easier than Classic anywhere banks no stars or XP, and the badge
// in the footer always says which kind of run this is.
//
//   <SandboxSetup initial={loadSandbox()} onStart={(settings) => ...} onBack={() => ...} />
//
// `onStart` gets sanitize()d settings (realm included), already saved with
// saveSandbox. `settings.preset` stays the preset it was built from; a run
// edited away from it shows as "Custom (from <preset>)".
//
// Layout: a full-screen overlay laid out at the UI scale's size and shrunk
// whole (so a phone on its side gets the iPad's layout at 0.72). A preset
// strip, six tabs, one panel and a footer; nothing scrolls but the long tile
// lists (realms, foes), each in a well under a header that stays put. The
// busy columns sit in a <Fit> so they shrink rather than scroll.

import { useState, useRef, useEffect, useMemo } from "react";
import {
  DEFAULTS, LIMITS, PRESETS, presetById, fromPreset, sanitize, saveSandbox, isHonest, typesOf, isBoss, allTowers,
} from "../data/sandbox.js";
import { FACTIONS } from "../data/factions.js";
import { ENEMIES } from "../data/enemies.js";
import { TOWERS } from "../data/towers.js";
import { REALMS } from "../data/maps.js";
import { CHAPTERS } from "../data/campaign.js";
import { HEROES } from "../data/bands.js";
import { hasRig } from "../render/rigs.js";
import { useViewport, Fit } from "./fit.jsx";
import EnemyIcon from "./EnemyIcon.jsx";
import TowerPortrait from "./TowerPortrait.jsx";
import RealmThumb from "./RealmThumb.jsx";
import {
  CloseIcon, CoinIcon, HeartIcon, CastleIcon, SkullIcon, FlagIcon, HammerIcon, SwordIcon, ShieldIcon, StarIcon,
} from "./hud/icons.jsx";
import "./hud/hud.css";
import "./hud/sandbox.css";

const cls = (...a) => a.filter(Boolean).join(" ");

// ---- what counts as "edited away from the preset" ----
// the battlefield and the hero pick ride along with any preset
const FREE_KEYS = ["preset", "realm", "heroKey"];
const CORE = Object.keys(DEFAULTS).filter((k) => !FREE_KEYS.includes(k));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const diffs = (s, keys = CORE) => { const base = fromPreset(s.preset); return keys.filter((k) => !same(s[k], base[k])); };

// the tabs, and the settings each one edits (for its "edited" mark)
const TABS = [
  { id: "field", name: "Battlefield", short: "Field", Icon: FlagIcon, keys: [] },
  { id: "foes", name: "Enemies", short: "Enemies", Icon: SkullIcon, keys: ["army", "script", "types", "bosses", "bossEvery", "hpMul", "speedMul", "countMul", "gapMul", "crowd", "startWave", "waves"] },
  { id: "purse", name: "Economy", short: "Economy", Icon: CoinIcon, keys: ["gold", "infiniteGold", "bountyMul", "waveBonusMul", "sellRefund"] },
  { id: "castle", name: "Castle", short: "Castle", Icon: CastleIcon, keys: ["lives", "invincible"] },
  { id: "halls", name: "Halls", short: "Halls", Icon: HammerIcon, keys: ["towers", "maxTier"] },
  { id: "hero", name: "Hero and Pace", short: "Hero", Icon: SwordIcon, keys: ["hero", "heroLevel", "militia", "autoWaves", "buildTime"] },
];

// realms, grouped the way the war is: the free realms, then each chapter's
const REALM_GROUPS = [
  { name: "The Free Realms", ids: ["proving", "greenwood", "frostfang", "mistmoor", "ember"] },
  ...CHAPTERS.map((ch) => ({ name: `${ch.numeral}. ${ch.name}`, ids: ch.levels.map((l) => l.realm).filter((id) => id !== "greenwood") })),
].map((g) => ({ ...g, ids: g.ids.filter((id) => REALMS[id]) }));

const TIERS = [
  { v: 1, name: "Level 1", note: "Raise halls, no upgrades" },
  { v: 2, name: "Level 2", note: "One upgrade" },
  { v: 3, name: "Level 3", note: "Two upgrades, no branch" },
  { v: 4, name: "Branches", note: "Up to the branch" },
  { v: 5, name: "Final forms", note: "Everything, as in Classic" },
];

// why a run banks nothing (the same tests as isHonest, in words)
const cheats = (s) => {
  const r = [];
  if (s.infiniteGold) r.push("infinite gold");
  if (s.invincible) r.push("unbreakable castle");
  if (!s.infiniteGold && s.gold > DEFAULTS.gold) r.push("more start gold");
  if (s.lives > DEFAULTS.lives) r.push("more lives");
  if (s.bountyMul > 1) r.push("richer bounties");
  if (s.waveBonusMul > 1) r.push("bigger wave bonus");
  if (s.sellRefund > DEFAULTS.sellRefund) r.push("better refunds");
  if (s.hpMul < 1) r.push("weaker foes");
  if (s.speedMul < 1) r.push("slower foes");
  if (s.heroLevel > 1) r.push("hero above level 1");
  if (s.startWave > 1) r.push("a later first wave");
  return r;
};

// ---- numbers ----
const round2 = (v) => Math.round(v * 100) / 100;
const clampK = (k, v) => Math.min(LIMITS[k].max, Math.max(LIMITS[k].min, v));
const fmtMul = (v) => `x${Number.isInteger(v) ? v.toFixed(1) : String(round2(v))}`;
const fmtInt = (v) => Math.round(v).toLocaleString("en-US");
// a slider's 0..1000 position and back. "mul": x1 sits mid-slider (the left
// half runs min..1, the right 1..max); "pow": a cube, fine at the low end
// (gold, lives); "lin": straight.
const RES = 1000;
const toPos = (scale, k, v) => {
  const { min, max } = LIMITS[k];
  if (scale === "mul") return v <= 1 ? (RES / 2) * (v - min) / (1 - min) : RES / 2 + (RES / 2) * (v - 1) / (max - 1);
  if (scale === "pow") return RES * Math.cbrt((v - min) / (max - min));
  return RES * (v - min) / (max - min);
};
const fromPos = (scale, k, p) => {
  const { min, max, step } = LIMITS[k];
  const t = p / RES;
  let v;
  if (scale === "mul") v = t <= 0.5 ? min + (1 - min) * (t * 2) : 1 + (max - 1) * ((t - 0.5) * 2);
  else if (scale === "pow") v = min + (max - min) * t * t * t;
  else v = min + (max - min) * t;
  return round2(clampK(k, min + Math.round((v - min) / step) * step));
};

// press to step once; hold to keep stepping, faster (and ten at a time) the
// longer the finger stays down
function useHold(fn) {
  const t = useRef(null);
  const f = useRef(fn);
  f.current = fn;
  const stop = () => {
    clearTimeout(t.current); t.current = null;
    window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop);
  };
  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    onPointerDown: (e) => {
      if (e.button != null && e.button !== 0) return;
      stop();
      // a button that greys out at its limit stops hearing the finger, so
      // the window listens for the lift instead
      window.addEventListener("pointerup", stop); window.addEventListener("pointercancel", stop);
      f.current(1);
      let n = 0;
      const tick = () => { n++; f.current(n > 18 ? 10 : 1); t.current = setTimeout(tick, n > 5 ? 55 : 110); };
      t.current = setTimeout(tick, 380);
    },
    onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop,
    onClick: (e) => { if (e.detail === 0) f.current(1); }, // the keyboard's Enter / Space
    onContextMenu: (e) => e.preventDefault(),
  };
}

// ---- controls ----
// a value that is words ("Endless after the script") reads in the display face
const WORDY = /[a-z]{4,}/i;
// A number: the label and value on top; − slider + beneath (or − value +).
function Num({ k, s, set, label, Icon, fmt = fmtInt, scale = "lin", slider = true, chips, off, note, valueText }) {
  const { step } = LIMITS[k];
  const v = s[k];
  const bump = (dir) => (mult) => set(k, (old) => round2(clampK(k, old + dir * step * mult)));
  const dn = useHold(bump(-1)), up = useHold(bump(1));
  const shown = valueText ?? fmt(v);
  const notch = toPos(scale, k, DEFAULTS[k]) / RES;
  return (
    <div className={cls("sbs-ctl", off && "is-off")} aria-disabled={off || undefined}>
      <div className="sbs-ctl-top">
        <span className="cg-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>{Icon && <Icon size={12} />}{label}</span>
        {slider && (WORDY.test(shown)
          ? <span className={cls("cg-display", off && "is-dim")} style={{ fontSize: 10, color: off ? "var(--muted)" : "var(--gold-lt)", textShadow: "1px 1px 0 var(--ink)", whiteSpace: "nowrap" }}>{shown}</span>
          : <span className={cls("sbs-val", off && "is-dim")} style={{ fontSize: 12 }}>{shown}</span>)}
      </div>
      <div className="sbs-ctl-row">
        <button type="button" aria-label={`Less ${label}`} className="cg-btn cg-btn--slate sbs-step" disabled={off || v <= LIMITS[k].min} {...dn}>−</button>
        {slider ? (
          <span className="sbs-rangebox">
            <input type="range" className="sbs-range" aria-label={label} min={0} max={RES} step={1} disabled={off}
              value={Math.round(toPos(scale, k, v))} onChange={(e) => set(k, fromPos(scale, k, Number(e.target.value)))}
              onKeyDown={(e) => {
                // arrows step by the setting's own step (a slider tick can be finer than that)
                const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
                if (d) { e.preventDefault(); bump(Math.sign(d))(Math.abs(d)); }
              }} />
            <i className="sbs-notch" style={{ left: `calc(8px + ${notch} * (100% - 16px))` }} />
          </span>
        ) : (
          <span className="cg-well sbs-well" style={{ flex: 1 }}><span className="sbs-val" style={{ fontSize: 13 }}>{shown}</span></span>
        )}
        <button type="button" aria-label={`More ${label}`} className="cg-btn cg-btn--slate sbs-step" disabled={off || v >= LIMITS[k].max} {...up}>+</button>
      </div>
      {chips && (
        <div className="sbs-chips">
          {chips.map((c) => (
            <button type="button" key={c} className={cls("cg-btn cg-btn--slate sbs-chip", v === c && "is-on")} disabled={off} onClick={() => set(k, c)}>{fmt(c)}</button>
          ))}
        </div>
      )}
      {note && <span className="sbs-note">{note}</span>}
    </div>
  );
}

// An on/off switch plank.
function Toggle({ on, onClick, label, sub, Icon, off, style }) {
  return (
    <button type="button" className={cls("cg-btn cg-btn--slate sbs-toggle", on && "is-on")} disabled={off} onClick={onClick} aria-pressed={on} style={{ width: "100%", ...style }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        {Icon && <Icon size={14} />}
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span>{label}</span>
          {sub && <span className="sbs-note" style={{ fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>}
        </span>
      </span>
      <span className="sbs-lamp">{on ? "ON" : "OFF"}</span>
    </button>
  );
}

// A heading over a group, with room for buttons at its end.
function Head({ label, children, Icon }) {
  return (
    <div className="sbs-h">
      <span className="cg-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>{Icon && <Icon size={12} />}{label}</span>
      <span style={{ flex: 1 }} />
      {children}
    </div>
  );
}
const MiniBtn = ({ children, onClick, on, off }) => (
  <button type="button" className={cls("cg-btn cg-btn--slate", on && "is-on")} disabled={off} onClick={onClick} style={{ minHeight: 30, minWidth: 48, padding: "0 8px", fontSize: 10 }}>{children}</button>
);

// A list that may be all (null), some ([...]) or none ([]): toggling one.
const flip = (list, all, id) => {
  const cur = list ?? all;
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : all.filter((x) => x === id || cur.includes(x));
  return next.length === all.length ? null : next;
};
const has = (list, id) => !list || list.includes(id);

// ================================================================
export default function SandboxSetup({ initial, onStart, onBack, initialTab = "field" }) {
  const vp = useViewport();
  const [s, setS] = useState(() => sanitize(initial || fromPreset("classic")));
  const [tab, setTab] = useState(initialTab);
  const set = (k, v) => setS((o) => ({ ...o, [k]: typeof v === "function" ? v(o[k]) : v }));
  const patch = (p) => setS((o) => ({ ...o, ...p }));

  // Escape backs out, like the ✕
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") onBack?.(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onBack]);

  // ---- the stage: laid out at the UI scale's size, then shrunk whole ----
  const k = vp.scale;
  const sw = (vp.w - vp.safe.left - vp.safe.right) / k, sh = (vp.h - vp.safe.top - vp.safe.bottom) / k;
  const roomy = sh >= 680;
  const grand = sw >= 1300 && sh >= 820;   // room for every preset's blurb on its card

  const base = presetById(s.preset);
  const edited = diffs(s);
  const custom = edited.length > 0;
  const honest = isHonest(s);
  const allTypes = useMemo(() => typesOf(s), [s.army]); // eslint-disable-line react-hooks/exhaustive-deps
  const halls = allTowers();
  const noFoes = Array.isArray(s.types) && s.types.length === 0;
  const noHalls = Array.isArray(s.towers) && s.towers.length === 0;
  const blocked = noFoes ? "Pick at least one foe (Enemies)" : noHalls ? "Pick at least one hall (Halls)" : null;

  const pickPreset = (id) => setS((o) => ({ ...fromPreset(id, { realm: o.realm }), heroKey: o.heroKey }));
  const reset = () => pickPreset(s.preset);
  // a new army keeps only the foe picks it can still field
  const pickArmy = (army) => setS((o) => {
    if (!o.types) return { ...o, army };
    const ok = typesOf({ ...o, army });
    const types = o.types.filter((t) => ok.includes(t));
    return { ...o, army, types: types.length && types.length < ok.length ? types : null };
  });
  const start = () => {
    if (blocked) return;
    const out = sanitize(s);
    saveSandbox(out);
    onStart?.(out);
  };

  const realm = REALMS[s.realm] || REALMS.greenwood;
  const armyName = s.army === "all" ? "Every Army" : FACTIONS[s.army]?.name;
  const riderKey = (() => { try { const h = localStorage.getItem("crownguard.hero"); return HEROES[h] ? h : "aldric"; } catch { return "aldric"; } })();

  // ---- the pieces ----
  const closeBtn = (
    <button type="button" aria-label="Back" className="cg-btn cg-btn--slate cg-x" style={{ minWidth: 44, minHeight: 44, flexShrink: 0 }} onClick={onBack}><CloseIcon size={12} /></button>
  );

  const presetCards = PRESETS.map((p) => {
    const on = p.id === s.preset;
    return (
      <button type="button" key={p.id} onClick={() => pickPreset(p.id)} title={p.blurb}
        className={cls("cg-btn cg-btn--slate sbs-preset", on && "is-on")} style={{ flex: "1 1 0", minHeight: grand ? 118 : roomy ? 56 : 44, justifyContent: roomy ? "flex-start" : "center" }}>
        <span className="sbs-pname">{p.name}</span>
        {roomy && <span className="sbs-ptag">{p.tag}</span>}
        {grand && <span className="sbs-pblurb">{p.blurb}</span>}
        {isHonest(fromPreset(p.id)) && <span className="sbs-star" title="Banks stars and XP">★</span>}
        {on && custom && <span className="sbs-edited">EDITED</span>}
      </button>
    );
  });
  const presetStatus = (
    <span className="cg-display" style={{ fontSize: 11, color: custom ? "var(--gold-lt)" : "var(--muted)", textShadow: "1px 1px 0 var(--ink)", whiteSpace: "nowrap" }}>
      {custom ? `Custom (from ${base.name})` : base.name}
    </span>
  );

  // ---- tab: BATTLEFIELD ----
  const tw = roomy ? 90 : 66, th = roomy ? 60 : 44;
  const fieldTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      <Head label="Battlefield" Icon={FlagIcon}>
        <span className="cg-display" style={{ fontSize: 12, color: "var(--cream)", textShadow: "1px 1px 0 var(--ink)" }}>
          {realm.name} <span style={{ fontSize: 9, letterSpacing: 1, color: realm.tagColor }}>{realm.tag}</span>
        </span>
      </Head>
      <div className="cg-well cg-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 8px 10px" }}>
        {REALM_GROUPS.map((grp) => (
          <div key={grp.name}>
            <div className="cg-label" style={{ margin: "8px 0 5px", fontSize: 10 }}>{grp.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${roomy ? 260 : 200}px, 1fr))`, gap: 6 }}>
              {grp.ids.map((id) => REALMS[id]).map((r) => (
                <button type="button" key={r.id} onClick={() => set("realm", r.id)} className={cls("cg-btn sbs-realm", r.id === s.realm && "is-on")}>
                  <RealmThumb realm={r} width={tw} height={th} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span className="sbs-rname">{r.name}</span>
                    <span className="sbs-rtag" style={{ color: r.tagColor }}>{r.tag}</span>
                    {roomy && <span className="sbs-rblurb">{r.blurb}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- tab: ENEMIES ----
  const armies = [...Object.values(FACTIONS).map((f) => ({ id: f.id, name: f.name, short: f.name.replace(/^The /, ""), tag: f.tag, color: f.tagColor, icons: f.types, lead: f.endlessBoss || f.types[0] })),
    { id: "all", name: "Every Army", short: "Every Army", tag: "ALL CROWNS", color: "var(--gold-lt)", icons: Object.values(FACTIONS).map((f) => f.endlessBoss).filter(Boolean), lead: null }];
  const foeCount = s.types ? s.types.length : allTypes.length;
  const foesTab = (
    <div style={{ display: "flex", gap: 12, height: "100%" }}>
      <div style={{ flex: "0 0 44%", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <Head label="Army" Icon={ShieldIcon} />
        {!roomy ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {armies.map((a) => (
              <button type="button" key={a.id} onClick={() => pickArmy(a.id)} className={cls("cg-btn cg-btn--slate", s.army === a.id && "is-on")}
                style={{ justifyContent: "space-between", padding: "0 8px", minHeight: 40, fontSize: 10, minWidth: 0 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.short}</span>
                <span style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 22, flexShrink: 0 }}>{(a.lead ? [a.lead] : a.icons).map((t) => <EnemyIcon key={t} type={t} box={20} />)}</span>
              </button>
            ))}
          </div>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {armies.map((a) => (
            <button type="button" key={a.id} onClick={() => pickArmy(a.id)} className={cls("cg-btn cg-btn--slate", s.army === a.id && "is-on")}
              style={{ flexDirection: "column", alignItems: "stretch", gap: 3, padding: "5px 7px", textAlign: "left", minWidth: 0 }}>
              <span style={{ fontSize: 11, color: s.army === a.id ? "var(--gold-lt)" : "var(--cream)", whiteSpace: "nowrap" }}>
                {a.name} <span style={{ fontSize: 8, letterSpacing: 1, color: a.color, marginLeft: 3 }}>{a.tag}</span>
              </span>
              <span style={{ display: "flex", gap: 2, alignItems: "flex-end", height: roomy ? 26 : 20, overflow: "hidden" }}>
                {a.icons.map((ty) => <EnemyIcon key={ty} type={ty} box={roomy ? 24 : 18} />)}
              </span>
            </button>
          ))}
        </div>
        )}
        <Head label={`Foes`} Icon={SkullIcon}>
          <span className="sbs-val" style={{ fontSize: 10, color: noFoes ? "#ff7a6a" : undefined }}>{foeCount}/{allTypes.length}</span>
          <MiniBtn on={!s.types} onClick={() => set("types", null)}>All</MiniBtn>
          <MiniBtn on={noFoes} onClick={() => set("types", [])}>None</MiniBtn>
        </Head>
        <div className="cg-well cg-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${roomy ? 86 : 64}px, 1fr))`, gap: 4 }}>
            {allTypes.map((t) => {
              const on = has(s.types, t), champ = isBoss(t);
              return (
                <button type="button" key={t} title={`${ENEMIES[t].name}${champ ? " (champion)" : ""}: ${on ? "marches" : "stays home"}`}
                  className={cls("cg-btn cg-btn--slate sbs-tile", !on && "is-out", champ && "is-champ")} aria-pressed={on}
                  onClick={() => set("types", flip(s.types, allTypes, t))} style={{ minHeight: roomy ? 76 : 56 }}>
                  {champ && <span className="sbs-crown">★</span>}
                  <span style={{ height: roomy ? 46 : 30, display: "flex", alignItems: "flex-end" }}><EnemyIcon type={t} box={roomy ? 44 : 28} /></span>
                  <span className="sbs-tname">{ENEMIES[t].name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <Fit min={0.6} align="top" deps={[tab, roomy]}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: roomy ? "12px 16px" : "8px 14px", padding: "2px 2px 4px" }}>
            <Toggle on={s.script} onClick={() => set("script", !s.script)} label="Scripted waves" sub="the army's own waves first" Icon={FlagIcon} />
            <Toggle on={s.crowd} onClick={() => set("crowd", !s.crowd)} label="Crowd swell" sub="waves grow as the war goes on" Icon={SkullIcon} />
            <Toggle on={s.bosses} onClick={() => set("bosses", !s.bosses)} label="Champions" sub="lead the generated waves" Icon={StarIcon} />
            <EveryN s={s} set={set} />
            <Num k="hpMul" s={s} set={set} label="Health" fmt={fmtMul} scale="mul" />
            <Num k="speedMul" s={s} set={set} label="Pace" fmt={fmtMul} scale="mul" />
            <Num k="countMul" s={s} set={set} label="Count" fmt={fmtMul} scale="mul" />
            <Num k="gapMul" s={s} set={set} label="Spacing" fmt={fmtMul} scale="mul" note={roomy ? "Lower packs them tighter" : null} />
            <Num k="startWave" s={s} set={set} label="Start wave" />
            <Num k="waves" s={s} set={set} label="Wave cap"
              valueText={s.waves === 0 ? (s.script ? "Endless after the script" : "Endless") : `Won at ${s.waves}`} />
          </div>
        </Fit>
      </div>
    </div>
  );

  // ---- tab: ECONOMY ----
  const purseTab = (
    <Fit min={0.6} align={roomy ? "center" : "top"} deps={[tab, roomy]}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: roomy ? "14px 24px" : "10px 18px", padding: "2px 2px 4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: roomy ? 14 : 10 }}>
          <Head label="The purse" Icon={CoinIcon} />
          <Toggle on={s.infiniteGold} onClick={() => set("infiniteGold", !s.infiniteGold)} label="Infinite gold" sub="the coffers never empty (no stars or XP)" Icon={CoinIcon} style={{ minHeight: 52 }} />
          <Num k="gold" s={s} set={set} label="Start gold" Icon={CoinIcon} scale="pow" off={s.infiniteGold}
            valueText={s.infiniteGold ? "Infinite" : fmtInt(s.gold)} chips={[100, 250, 500, 1000, 2500, 10000]}
            note={s.infiniteGold ? "Infinite gold is on." : s.gold > DEFAULTS.gold ? `Above ${DEFAULTS.gold} banks no stars or XP.` : null} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: roomy ? 14 : 10 }}>
          <Head label="Income" Icon={StarIcon} />
          <Num k="bountyMul" s={s} set={set} label="Bounty per kill" fmt={fmtMul} scale="mul" />
          <Num k="waveBonusMul" s={s} set={set} label="Wave bonus" fmt={fmtMul} scale="mul" />
          <Num k="sellRefund" s={s} set={set} label="Sell refund" fmt={(v) => `${Math.round(v * 100)}%`} />
        </div>
      </div>
    </Fit>
  );

  // ---- tab: CASTLE ----
  const castleTab = (
    <Fit min={0.6} align={roomy ? "center" : "top"} deps={[tab, roomy]}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: roomy ? "14px 24px" : "10px 18px", padding: "2px 2px 4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: roomy ? 14 : 10 }}>
          <Head label="The walls" Icon={HeartIcon} />
          <Num k="lives" s={s} set={set} label="Lives" Icon={HeartIcon} scale="pow" chips={[1, 5, 10, 20, 50, 100]}
            note={s.lives > DEFAULTS.lives ? `Above ${DEFAULTS.lives} banks no stars or XP.` : "Each foe that reaches the gate costs one."} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: roomy ? 14 : 10 }}>
          <Head label="The last word" Icon={CastleIcon} />
          <Toggle on={s.invincible} onClick={() => set("invincible", !s.invincible)} label="Unbreakable castle" sub="leaks are counted, it never falls" Icon={CastleIcon} style={{ minHeight: 52 }} />
          <span className="sbs-note">An unbreakable castle is for trying builds and watching armies; a run with it on banks no stars or XP.</span>
        </div>
      </div>
    </Fit>
  );

  // ---- tab: HALLS ----
  const hallCount = s.towers ? s.towers.length : halls.length;
  const hallsTab = (
    <div style={{ display: "flex", gap: 12, height: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <Head label="Halls on the tray" Icon={HammerIcon}>
          <span className="sbs-val" style={{ fontSize: 10, color: noHalls ? "#ff7a6a" : undefined }}>{hallCount}/{halls.length}</span>
          <MiniBtn on={!s.towers} onClick={() => set("towers", null)}>All</MiniBtn>
          <MiniBtn on={noHalls} onClick={() => set("towers", [])}>None</MiniBtn>
        </Head>
        <div className="cg-well cg-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${roomy ? 116 : 84}px, 1fr))`, gap: 4 }}>
            {halls.map((kd) => {
              const on = has(s.towers, kd);
              return (
                <button type="button" key={kd} title={TOWERS[kd].blurb} className={cls("cg-btn cg-btn--slate sbs-tile", !on && "is-out")} aria-pressed={on}
                  onClick={() => set("towers", flip(s.towers, halls, kd))} style={{ minHeight: roomy ? 118 : 80 }}>
                  <TowerPortrait kind={kd} size={roomy ? 84 : 54} />
                  <span className="sbs-tname" style={{ fontSize: 9 }}>{TOWERS[kd].name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ flex: "0 0 30%", minWidth: 0, position: "relative" }}>
        <Fit min={0.6} align="top" deps={[tab, roomy]}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "0 2px 4px" }}>
            <Head label="Halls grow to" Icon={StarIcon} />
            {TIERS.map((t) => (
              <button type="button" key={t.v} onClick={() => set("maxTier", t.v)} className={cls("cg-btn cg-btn--slate", s.maxTier === t.v && "is-on")}
                style={{ justifyContent: "space-between", padding: "0 10px", minHeight: roomy ? 48 : 42 }}>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <span>{t.name}</span>
                  <span className="sbs-note" style={{ fontSize: 9 }}>{t.note}</span>
                </span>
                <span className="cg-pips">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={cls("cg-pip", i <= t.v && "on")} />)}</span>
              </button>
            ))}
          </div>
        </Fit>
      </div>
    </div>
  );

  // ---- tab: HERO & PACE ----
  const heroCards = [{ key: null, name: "Your hero", title: `the hero you ride with (${HEROES[riderKey].name})`, rig: HEROES[riderKey].rig },
    ...Object.entries(HEROES).map(([key, h]) => ({ key, name: h.name, title: h.title, rig: h.rig }))];
  const heroTab = (
    <Fit min={0.6} align={roomy ? "center" : "top"} deps={[tab, roomy]}>
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: roomy ? "14px 24px" : "10px 18px", padding: "2px 2px 4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: roomy ? 12 : 8 }}>
          <Head label="The hero" Icon={SwordIcon} />
          <Toggle on={s.hero} onClick={() => set("hero", !s.hero)} label="Hero on the field" sub="he walks out at the start of the map" Icon={SwordIcon} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {heroCards.map((h) => (
              <button type="button" key={h.key || "rider"} disabled={!s.hero} onClick={() => set("heroKey", h.key)}
                className={cls("cg-btn cg-btn--slate", s.heroKey === h.key && "is-on")}
                style={{ flexDirection: "column", gap: 3, padding: "5px 4px", minHeight: roomy ? 108 : 88, minWidth: 0 }}>
                <span style={{ height: roomy ? 58 : 44, display: "flex", alignItems: "flex-end" }}>
                  {hasRig(h.rig) ? <EnemyIcon type={h.rig} box={roomy ? 60 : 46} /> : <SwordIcon size={24} />}
                </span>
                <span style={{ fontSize: 11 }}>{h.name}</span>
                <span className="sbs-note" style={{ fontSize: 8, textAlign: "center", lineHeight: 1.25 }}>{h.title}</span>
              </button>
            ))}
          </div>
          <Num k="heroLevel" s={s} set={set} label="Starting level" off={!s.hero} valueText={`Lv ${s.heroLevel}`}
            note={s.heroLevel > 1 ? "Above level 1 banks no stars or XP." : null} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: roomy ? 12 : 8 }}>
          <Head label="Help and pace" Icon={FlagIcon} />
          <Toggle on={s.militia} onClick={() => set("militia", !s.militia)} label="Militia" sub="the call to arms from the tray" Icon={ShieldIcon} />
          <Toggle on={s.autoWaves} onClick={() => set("autoWaves", !s.autoWaves)} label="Auto-horn" sub="the horn sounds itself (Rush)" Icon={FlagIcon} />
          <Num k="buildTime" s={s} set={set} label="Build time" valueText={`${s.buildTime}s`}
            note="Seconds between waves before the horn sounds anyway." />
        </div>
      </div>
    </Fit>
  );

  const body = { field: fieldTab, foes: foesTab, purse: purseTab, castle: castleTab, halls: hallsTab, hero: heroTab }[tab] || fieldTab;
  const why = cheats(s);

  return (
    <div className="cg-hud sbs-root" role="dialog" aria-label="Free Play setup">
      <div className="sbs-stage" style={{
        left: vp.safe.left, top: vp.safe.top, width: sw, height: sh, transform: `scale(${k})`,
        padding: roomy ? "12px 18px 12px" : "7px 12px 8px", gap: roomy ? 8 : 6,
      }}>
        <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto", height: "100%", display: "flex", flexDirection: "column", gap: roomy ? 8 : 6 }}>
          {/* head: the title (roomy screens) and the presets */}
          {roomy ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CastleIcon size={22} />
              <span className="cg-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: "var(--gold)", textShadow: "2px 2px 0 var(--ink)" }}>FREE PLAY</span>
              <span className="sbs-note" style={{ fontSize: 11 }}>Pick a preset, then bend any part of the war.</span>
              <span style={{ flex: 1 }} />
              {presetStatus}
              {closeBtn}
            </div>
          ) : (
            <div className="sbs-h" style={{ minHeight: 14 }}>
              <span className="cg-label" style={{ fontSize: 10 }}>Free Play · Presets</span>
              <span style={{ flex: 1 }} />
              {presetStatus}
            </div>
          )}
          <div style={{ display: "flex", gap: 5, alignItems: "stretch" }}>
            {presetCards}
            {!roomy && closeBtn}
          </div>
          {roomy && !grand && <div className="sbs-note" style={{ fontSize: 11, color: "var(--text)", minHeight: 16, marginTop: -2 }}>{base.blurb}</div>}

          {/* the tabs, and the one panel they open */}
          <div className="sbs-tabs" role="tablist">
            {TABS.map((t) => {
              const mark = t.keys.length && diffs(s, t.keys).length > 0;
              return (
                <button type="button" key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className={cls("cg-btn cg-btn--slate sbs-tab", tab === t.id && "is-on")} style={{ minHeight: roomy ? 44 : 40 }}>
                  <t.Icon size={12} />{t.name}
                  {mark ? <span title="Edited" style={{ width: 6, height: 6, background: "var(--gold-lt)", border: "1px solid var(--ink)", marginLeft: 2 }} /> : null}
                </button>
              );
            })}
          </div>
          <div className="cg-panel" style={{ flex: 1, minHeight: 0, padding: roomy ? 12 : 8, position: "relative" }}>
            {body}
          </div>

          {/* foot: where, the honest-run badge, reset and START */}
          <div style={{ display: "flex", gap: 8, alignItems: "stretch", minHeight: roomy ? 52 : 46 }}>
            <button type="button" onClick={() => setTab("field")} className="cg-btn cg-btn--slate" title="Change the battlefield"
              style={{ justifyContent: "flex-start", gap: 8, padding: "3px 10px 3px 4px", maxWidth: roomy ? 320 : 250, minWidth: 0 }}>
              <RealmThumb realm={realm} width={roomy ? 60 : 51} height={roomy ? 40 : 34} />
              <span style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start", minWidth: 0 }}>
                <span style={{ fontSize: 11, color: "var(--cream)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{realm.name}</span>
                <span className="sbs-note" style={{ fontSize: 9, whiteSpace: "nowrap" }}>vs {armyName}</span>
              </span>
            </button>
            {blocked ? (
              <div className="sbs-badge is-cheat" style={{ flex: 1 }}>
                <span className="sbs-bt" style={{ color: "#ff9a86" }}>{blocked}</span>
              </div>
            ) : (
              <div className={cls("sbs-badge", honest ? "is-honest" : "is-cheat")} style={{ flex: 1 }} aria-live="polite">
                <StarIcon size={18} lit={honest} />
                <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span className="sbs-bt">{honest ? "Stars and XP banked" : "Sandbox — no stars or XP"}</span>
                  <span className="sbs-bs">{honest ? "Classic or harder: this run counts." : `Easier than Classic: ${why.join(", ")}.`}</span>
                </span>
              </div>
            )}
            <button type="button" className="cg-btn cg-btn--slate" disabled={!custom} onClick={reset} title={`Reset to ${base.name}`}
              style={{ padding: "0 12px", fontSize: 11 }}>
              {roomy ? `Reset to ${base.name}` : "Reset"}
            </button>
            <button type="button" className="cg-btn cg-btn--gold" disabled={!!blocked} onClick={start}
              style={{ minWidth: roomy ? 170 : 140, fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
              START
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// "Every [−] 5 [+] waves": the champions' rhythm, in one plank's height.
function EveryN({ s, set }) {
  const k = "bossEvery";
  const bump = (dir) => (mult) => set(k, (old) => clampK(k, old + dir * mult));
  const dn = useHold(bump(-1)), up = useHold(bump(1));
  const off = !s.bosses;
  return (
    <div className={cls("sbs-ctl", off && "is-off")} style={{ justifyContent: "center" }}>
      <div className="sbs-ctl-row">
        <span className="cg-label" style={{ flex: 1 }}>Every</span>
        <button type="button" aria-label="Champions more often" className="cg-btn cg-btn--slate sbs-step" disabled={off || s[k] <= LIMITS[k].min} {...dn}>−</button>
        <span className="cg-well sbs-well" style={{ minWidth: 56 }}><span className="sbs-val" style={{ fontSize: 13 }}>{s[k]}</span></span>
        <button type="button" aria-label="Champions less often" className="cg-btn cg-btn--slate sbs-step" disabled={off || s[k] >= LIMITS[k].max} {...up}>+</button>
        <span className="cg-label" style={{ flex: 1, textAlign: "right" }}>{s[k] === 1 ? "wave" : "waves"}</span>
      </div>
    </div>
  );
}
