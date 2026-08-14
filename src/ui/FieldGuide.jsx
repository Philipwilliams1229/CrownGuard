// ============ FIELD GUIDE ============
// A full-screen compendium: browse every tower and every foe as a grid of
// sprites, tap one to read it in full. The tower entries lay out the whole
// evolution tree — three levels, two paths, and each path's two final
// ascensions.

import { useState } from "react";
import { TOWERS } from "../data/towers.js";
import { ENEMIES } from "../data/enemies.js";
import { FACTIONS } from "../data/factions.js";
import { btn, title, FONT } from "./theme.js";
import PixelIcon from "./PixelIcon.jsx";
import EnemyIcon from "./EnemyIcon.jsx";

// ---- turning a raw stat block into plain English ----

// Numbers worth spelling out, in reading order.
const NUMBERS = [
  ["count", (v) => `${v} on the field`],
  ["dmg", (v) => `${v} damage`],
  ["rate", (v) => `every ${(v / 1000).toFixed(2)}s`],
  ["hp", (v) => `${v} health each`],
  ["range", (v) => `${v} range`],
  ["minRange", (v) => `blind within ${v}`],
  ["splash", (v) => `${v} splash`],
  ["shots", (v) => `${v} stones per volley`],
  ["spikes", (v) => `${v} spikes per spin`],
  ["slow", (v) => `${Math.round(v * 100)}% slow aura`],
  ["heal", (v) => `mends ${v}/s`],
  ["burn", (v) => `${v} burn damage`],
  ["poison", (v) => `${v} poison per stack`],
  ["colddps", (v) => `${v} cold damage/s`],
  ["poolDps", (v) => `${v} lava damage/s`],
  ["sear", (v) => `${v} searing damage/s`],
  ["arc", (v) => `lightning leaps ${v}×`],
  ["chain", (v) => `ricochets to ${v} more`],
  ["nova", (v) => `${v} nova damage`],
  ["income", (v) => `pays ${v}g per wave held`],
  ["compound", (v) => `payout grows +${v} each wave`],
  ["bountyAura", (v) => `kills nearby pay +${Math.round(v * 100)}%`],
  ["maxCharges", (v) => `holds ${v} trap charges`],
  ["trapDmg", (v) => `${v} trap damage`],
  ["airMult", (v) => `×${v} vs fliers`],
  ["mark", (v) => `marks prey +${Math.round(v * 100)}% from all towers`],
  ["dps", (v) => `${v}/s beam`],
  ["rampMax", (v) => `focus ramps to ×${v}`],
  ["beams", (v) => `${v} beams`],
  ["eagleHp", (v) => `war-eagle: ${v} health`],
  ["eagleDmg", (v) => `${v} eagle talon damage`],
  ["autoSeed", (v) => `self-seeds ${v} mines per wave`],
];

// Flags that change how a tower behaves, phrased as short traits.
const TRAITS = [
  ["magic", "magic damage — ignores armor"],
  ["pierce", "pierces armor"],
  ["stun", "can stun"],
  ["zapStun", "shocks can stun"],
  ["crit", "every 3rd shot triples"],
  ["frenzy", "attacks quicken as it fights"],
  ["lifesteal", "heals from damage dealt"],
  ["shield", "wards knights against one blow"],
  ["mend", "restores 1 castle HP per wave"],
  ["brittle", "leaves foes brittle — more physical damage taken"],
  ["burnSpread", "fire leaps between foes"],
  ["frag", "bursts into shrapnel"],
  ["spikePierce", "spikes skewer through"],
  ["rider", "mounted — very fast"],
  ["giant", "one colossal champion"],
  ["bolt", "screaming siege bolt"],
  ["novaFreeze", "novas flash-freeze"],
  ["targeting", "always hunts the mightiest foe"],
  ["hoard", "pays double — or nothing if the castle bled"],
  ["mend", "restores 1 castle HP per wave"],
  ["shredAura", "aura strips armor"],
  ["midas", "every 12th shot turns a lesser foe to gold"],
  ["root", "traps hold lesser foes fast"],
  ["execute", "finishes the nearly-dead outright"],
  ["caltrops", "sprung traps leave slowing ground"],
  ["stunAll", "the blast stuns everything it touches"],
  ["markShred", "marks also strip armor"],
  ["diveStun", "dives can stun"],
  ["kingsight", "the mightiest foe is always marked"],
  ["wellRoot", "at full focus the beam pins its victim"],
  ["igniteBurn", "at full focus the beam ignites"],
  ["beamSlow", "the held foe is slowed"],
  ["beamSplash", "at full focus the light spills over"],
  ["skyknight", "a rider on a war-eagle HOLDS one flier at a time — even dragons"],
  ["balloon", "every 3rd charge rises on a balloon — a bomb for fliers"],
];

export function describe(s) {
  const nums = NUMBERS.filter(([k]) => s[k] != null).map(([k, f]) => f(s[k]));
  const traits = TRAITS.filter(([k]) => s[k]).map(([, t]) => t);
  return { nums, traits };
}

// ---- shared bits of chrome ----

const StatLine = ({ stats }) => {
  const { nums, traits } = describe(stats);
  return (
    <div style={{ fontSize: 10.5, lineHeight: 1.6, marginTop: 3 }}>
      <div style={{ opacity: 0.85 }}>{nums.join(" · ")}</div>
      {traits.length > 0 && <div style={{ color: "#a8d88c", marginTop: 2 }}>{traits.join(" · ")}</div>}
    </div>
  );
};

const card = {
  background: "#2c313c", border: "2px solid #10131a", padding: 10,
  boxShadow: "inset 0 0 0 2px #454c5a",
};

const Heading = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: 2, color: "#d8b34a", margin: "16px 0 8px" }}>{children}</div>
);

// ---- tower detail: the full evolution tree ----

function TowerDetail({ kind }) {
  const def = TOWERS[kind];
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <PixelIcon kind={kind} size={46} />
        <div>
          <div style={{ fontWeight: "bold", color: "#e8d47a", fontSize: 15 }}>{def.name}</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>
            {def.cost}g to raise · {def.dtype === "magic" ? "magic damage" : "physical damage"}
          </div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 6, lineHeight: 1.55 }}>{def.blurb}</div>
        </div>
      </div>

      <Heading>LEVELS 1–3 — BUILD IT UP</Heading>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8, alignItems: "start" }}>
        {def.levels.map((lv, i) => (
          <div key={i} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontWeight: "bold", fontSize: 12 }}>
                Lv {i + 1}{lv.label ? ` — ${lv.label}` : ""}
              </span>
              <span style={{ color: "#e8d47a", fontSize: 11 }}>{lv.cost ? `${lv.cost}g` : "included"}</span>
            </div>
            <StatLine stats={lv} />
          </div>
        ))}
      </div>

      <Heading>AT LEVEL 3 — CHOOSE ONE PATH, FOREVER</Heading>
      {/* the two paths sit side by side so they read as a straight comparison,
          and fall back to stacked when the screen is too narrow for two */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10, alignItems: "start" }}>
        {Object.entries(def.branches).map(([bk, br]) => (
          <div key={bk}>
            <div style={{ ...card, borderTop: "4px solid #7a6a3c" }}>
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <PixelIcon kind={kind} branch={bk} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "bold", fontSize: 12.5, color: "#e8d47a" }}>
                    {br.name} <span style={{ fontWeight: "normal" }}>— {br.cost}g</span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3, lineHeight: 1.5 }}>{br.desc}</div>
                  <StatLine stats={br.stats} />
                </div>
              </div>
            </div>

            {br.rank4 && (
              <div style={{ marginLeft: 10, marginTop: 6, borderLeft: "2px solid #454c5a", paddingLeft: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.55 }}>THEN ASCEND — ONE OF:</div>
                {Object.entries(br.rank4).map(([rk, r4]) => (
                  <div key={rk} style={card}>
                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <PixelIcon kind={kind} branch={bk} rank4={rk} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "bold", fontSize: 12, color: "#e8d47a" }}>
                          {r4.name} <span style={{ fontWeight: "normal" }}>— {r4.cost}g</span>
                        </div>
                        <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 3, lineHeight: 1.5 }}>{r4.desc}</div>
                        <StatLine stats={r4.stats} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- enemy detail ----

const Row = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, padding: "3px 0" }}>
    <span style={{ opacity: 0.6 }}>{label}</span>
    <span style={{ fontWeight: "bold" }}>{children}</span>
  </div>
);

function EnemyDetail({ type }) {
  const e = ENEMIES[type];
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <EnemyIcon type={type} box={46} />
        <div>
          <div style={{ fontWeight: "bold", color: e.boss ? "#e07a72" : "#e8d47a", fontSize: 15 }}>
            {e.name}{e.boss ? " · BOSS" : ""}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Worth {e.bounty}g</div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <Row label="Health">{e.hp}</Row>
        <Row label="Speed">{e.speed}</Row>
        <Row label="Armor">{e.armor > 0 ? `${Math.round(e.armor * 100)}% physical` : "none"}</Row>
        {e.mres ? <Row label="Magic resist">{Math.round(e.mres * 100)}%</Row> : null}
        {e.guard ? <Row label="Shield">swallows {e.guard} blow{e.guard > 1 ? "s" : ""}</Row> : null}
        {e.regen ? <Row label="Regeneration">{e.regen}/s</Row> : null}
        {e.immSlow || e.immStun ? (
          <Row label="Immune to">{[e.immSlow && "slows", e.immStun && "stuns"].filter(Boolean).join(" & ")}</Row>
        ) : null}
        {e.trample ? <Row label="Tramples">{e.trample} blocker{e.trample > 1 ? "s" : ""}</Row> : null}
        {e.flying ? <Row label="Flying">knights can't block</Row> : null}
        {e.atk > 0 ? <Row label="Vs. knights">{e.atk} damage</Row> : null}
        {e.rangedAtk ? <Row label="Shoots knights">{e.rangedAtk} at {e.rangedRange} range</Row> : null}
        {e.heal ? <Row label="Heals warband">{e.heal} per chant</Row> : null}
        {e.wardHits ? <Row label="Wards allies">{e.wardHits} blow each</Row> : null}
        {e.bannerRange ? <Row label="Banner">+{Math.round(e.bannerSpeed * 100)}% speed, +{Math.round(e.bannerArmor * 100)}% armor</Row> : null}
        {e.summonEvery ? <Row label="Summons">{e.summonCount} {ENEMIES[e.summonType]?.name || e.summonType}{e.summonCount > 1 ? "s" : ""} / {(e.summonEvery / 1000).toFixed(1)}s</Row> : null}
        {e.splitInto ? <Row label="On death">splits into {e.splitInto[1]} {ENEMIES[e.splitInto[0]]?.name || e.splitInto[0]}s</Row> : null}
        {e.deathBurst ? <Row label="On death">bursts — {e.deathBurst.dmg} dmg to knights + plague ground</Row> : null}
        <Row label="Castle damage">{e.castleDmg}</Row>
      </div>

      {e.note && (
        <div style={{ fontSize: 11.5, lineHeight: 1.65, marginTop: 12, fontStyle: "italic", opacity: 0.9 }}>
          {e.note}
        </div>
      )}
    </div>
  );
}

// ---- the rules that aren't about any one unit ----

function Basics() {
  return (
    <div style={{ fontSize: 11.5, lineHeight: 1.7 }}>
      <Heading>THE CASTLE</Heading>
      Your castle has <b>20 HP</b>, carried between waves. Anything that reaches it takes a bite — small things cost 1, bruisers 2 or 3, and a faction's champion 5. It cracks, smokes, and burns as it weakens.

      <Heading>WAVES</Heading>
      Eighteen scripted waves stand between you and each faction's champion — and they open with proper grunt floods, so build for volume early. After each wave the next <b>auto-starts in 30 seconds</b> — sound the horn early and you pocket bonus gold for every second you skip. <b>Rush</b> does that automatically, every time.<br /><br />
      Slay the champion on wave 18 to save the realm, then <b>March On</b> into the <b>Endless March</b>: ever-larger warbands, the champion returning every 5th wave, and foes that only grow stronger.

      <Heading>THE THREE ARMIES</Heading>
      <b>The Greenwood Horde</b> is numbers and teeth: swarms, fast wolves, bats over your blockers, and shamans mending the whole warband. <b>The Iron Kingdom</b> is discipline: shields that swallow blows, crossbows and gryphons, chaplain wards, siege rams nothing slows. <b>The Hollow Court</b> is the dead in floods — wraiths your knights can't touch, ghasts that burst over your line, and gravecallers whose bells raise more. Each army wants a different castle: read the wave preview, and build against what's actually coming.

      <Heading>BUILDING</Heading>
      Towers reach <b>Lv 3</b>, then <b>evolve down one of two paths</b> — and each path can <b>ascend once more</b> into a final form. Both choices are permanent, so read them before you spend.<br /><br />
      Selling returns <b>70%</b> of everything you put in. Time runs at <b>half speed</b> while you're building or managing a tower, so you can think.

      <Heading>KNIGHTS</Heading>
      Knights march out and each pin <i>one</i> enemy in melee — the rest push past. Fallen knights respawn in 7 seconds. They muster just south of their hall; select the hall and click inside its circle to move the rally flag.

      <Heading>STANDING ORDERS</Heading>
      Select any shooting tower and it shows a <b>TARGETS</b> row. <b>First</b> takes whoever is closest to your castle — the default. <b>Last</b> hits the tail of the column, <b>Strong</b> the healthiest foe, <b>Weak</b> the one nearest death. Towers that splash also get <b>Most</b>, which aims wherever the blast will catch the biggest crowd.<br /><br />
      Orders are free and can be changed mid-battle. A few evolutions — the Ballista and the Comet Sling — are sworn to the mightiest foe and can't be re-pointed.

      <Heading>DAMAGE TYPES</Heading>
      <b>Physical</b> damage is reduced by armor — Ironclads shrug off half of it. <b>Magic</b> damage ignores armor entirely, but Goblin Shamans resist most of it. Bring both.

      <Heading>THE VIEW</Heading>
      Zoom with the <b>-</b> and <b>+</b> buttons, then drag the map to pan around.
    </div>
  );
}

// ---- the guide itself ----

const TABS = [
  { id: "towers", label: "TOWERS" },
  { id: "enemies", label: "FOES" },
  { id: "basics", label: "BASICS" },
];

export default function FieldGuide({ onClose }) {
  const [tab, setTab] = useState("towers");
  const [pick, setPick] = useState(null); // the entry being read, if any

  const open = (t, id) => { setTab(t); setPick(id); };
  const back = () => setPick(null);

  // A sprite-and-name tile — the whole grid is built from these.
  const tile = (key, label, icon, onClick) => (
    <button key={key} onClick={onClick}
      style={{ ...btn, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, padding: "12px 6px", textAlign: "center", minHeight: 86 }}>
      {icon}
      <span style={{ fontSize: 10.5, lineHeight: 1.3 }}>{label}</span>
    </button>
  );

  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70, fontFamily: FONT, color: "#e8e0c8",
      background: "rgba(22,25,32,0.94)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column",
    }}>
      {/* header: title, and either the tabs or a back button */}
      <div style={{ padding: "14px 14px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <div style={{ ...title(15) }}>FIELD GUIDE</div>
          <button aria-label="Close field guide" onClick={onClose} style={{ ...btn, padding: "6px 14px", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
          {pick ? (
            <button onClick={back} style={{ ...btn, padding: "8px 14px", fontSize: 12 }}>◀ Back</button>
          ) : (
            TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  ...btn, flex: 1, textAlign: "center", padding: "9px 6px", fontSize: 11, letterSpacing: 1,
                  ...(tab === t.id ? { background: "#5a4f2c", boxShadow: "inset -2px -2px 0 #3a3420, inset 2px 2px 0 #8a7746" } : {}),
                }}>
                {t.label}
              </button>
            ))
          )}
        </div>
      </div>

      {/* scrolling body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14, WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {pick && tab === "towers" && <TowerDetail kind={pick} />}
          {pick && tab === "enemies" && <EnemyDetail type={pick} />}

          {!pick && tab === "towers" && (
            <div style={grid}>
              {Object.entries(TOWERS).map(([k, def]) =>
                tile(k, def.name, <PixelIcon kind={k} size={34} />, () => open("towers", k)))}
            </div>
          )}

          {!pick && tab === "enemies" && Object.values(FACTIONS).map((f) => (
            <div key={f.id}>
              <Heading>{f.name.toUpperCase()}</Heading>
              <div style={grid}>
                {f.types.map((k) =>
                  tile(k, ENEMIES[k].name, <EnemyIcon type={k} box={34} />, () => open("enemies", k)))}
              </div>
            </div>
          ))}

          {!pick && tab === "basics" && <Basics />}

          {!pick && tab !== "basics" && (
            <div style={{ fontSize: 10, opacity: 0.5, textAlign: "center", marginTop: 14 }}>
              Tap any {tab === "towers" ? "tower" : "foe"} to read it in full.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
