// ============ THE WAR ROOM (once "Skills & Heroes", before that the War Council) ============
// Every upgrade bought outside a battle, in one place with three tabs
// (owner, 2026-11-25): CASTLE (the treasury's castle works, gold), TOWERS
// (each hall's skill tree, stars, and its hall experience), HEROES (each
// hero's own stars). It always opens on CASTLE. A tab with something to buy
// wears a slow gold rim glow. Every tab's refund sits in the same place, at
// the header's right beside its purse (two taps): the castle's every work,
// the tower shown, the hero shown. The all-time stats are their own screen
// now (StatsPanel.jsx, the title's STATS button).
//
// It lays itself over whatever opened it (the title, the campaign map, the
// victory card), so render it OUTSIDE any <Fit>; the caller says how a castle
// work is paid for (the treasury, or the battle's own castle after a win).
//
// The towers and heroes tabs never scroll. They fill the screen (inside the
// notch's safe area) under the pinned header and draw inside <Fit>, which
// shrinks them, whole, into the room left:
//
//  - a phone on its side: the picker is a rail down the left, and the tree
//    reads left to right — openers, follow-ups, capstone — so the wide,
//    short screen holds all five nodes at once.
//  - a phone held upright: the picker is two rows across the top,
//    and the tree reads top to bottom in three rows.
//  - iPads and desktops: the picker is one row of every hall, and the tree reads
//    top to bottom, its sizes multiplied by `z` to fill the room (<Fit> only
//    ever shrinks, so growing is done by drawing larger, not scaling up).
// The castle tab is a list, and scrolls.
//
// On phones the long rules text sits behind the "?" button, so it never
// squeezes the tree; big screens show it under the tree.
//
// Spending takes two taps (useArm, in HeroTalents.jsx): the first arms a
// node — it turns gold and its foot reads "TAP AGAIN · SPEND n★" — and the
// second tap on it buys. A tap anywhere else, or 3 seconds, disarms it.

import { useState } from "react";
import {
  SKILLS, RANKS, nodeUnlocked, spentOn, treeCost, rankOf as nodeRank,
  nextCost, isMaxed, modSummary,
} from "../data/skills.js";
import {
  starsEarned, starsFree, buyRank, refundTower, bankedTowerXp, resetHeroTalents, heroRecord, TIER_XP,
} from "../data/profile.js";
import { loadCastle, hallRank, towerUnlocked, unlockLevel } from "../data/campaign.js";
import { CASTLE_WORKS, nextWork, worksValue } from "../data/castle.js";
import { HEROES, HERO_TALENTS, talentCost, talentsSpent } from "../data/bands.js";
import TowerPortrait from "./TowerPortrait.jsx";
import CastleWorksList from "./CastleWorks.jsx";
import { Star } from "./Glyphs.jsx";
import { CoinIcon, ValorIcon } from "./hud/icons.jsx";
import { btn, panel, title, FONT, WAR_ROOM } from "./theme.js";
import { useViewport, Fit } from "./fit.jsx";
import HeroTalents, { useArm, ArmBand, ARMED } from "./HeroTalents.jsx";

// the halls in the tray's order (the starting three, then as the campaign teaches them)
const KINDS = Object.keys(SKILLS).sort((a, b) => hallRank(a) - hallRank(b));
const HERO_KEYS = Object.keys(HEROES);

// ---- what each tab could buy now: its rim glows while there is something ----
const castleCan = (treasury) => {
  const works = loadCastle("crown");
  return Object.keys(CASTLE_WORKS).some((k) => { const n = nextWork(works, k); return n && treasury >= n.cost; });
};
const towersCan = (profile) => {
  const free = starsFree(profile);
  return KINDS.some((k) => {
    const owned = profile.perks[k] || {};
    return SKILLS[k].nodes.some((n) => { const c = nextCost(owned, n); return !isMaxed(owned, n.id) && nodeUnlocked(n, owned) && c != null && free >= c; });
  });
};
export const heroCan = (profile, k) => {
  const { points, talents } = heroRecord(profile, k);
  return HERO_TALENTS[k].some((t) => { const c = talentCost(talents[t.id] || 0); return c != null && points >= c; });
};
const heroesCan = (profile) => HERO_KEYS.some((k) => heroCan(profile, k));
// for the title's button: anything at all to spend?
export const warRoomCan = (profile, treasury) => castleCan(treasury) || towersCan(profile) || heroesCan(profile);

// a hall type's banked experience (the profile, or the live copy banked since)
const hallXp = (profile, kind) => Math.max(Math.floor(profile.towerXp?.[kind] || 0), bankedTowerXp(kind));
const num = (n) => Math.floor(n).toLocaleString("en-US");

// the slow gold rim on a tab with something to buy
const GLOW_CSS = "@keyframes cgRimGlow{0%,100%{box-shadow:inset 0 0 0 2px #d8b34a,0 0 3px 1px rgba(240,210,122,.35)}50%{box-shadow:inset 0 0 0 2px #f0d27a,0 0 9px 3px rgba(240,210,122,.75)}}";
const GLOW = { animation: "cgRimGlow 2.2s ease-in-out infinite" };



const ON = { background: "#5a4f2c", boxShadow: "inset 0 0 0 2px #7a6a3c" };
const RUNG = "#454c5a";

// the notch sits on a side when the phone lies down; keep clear of it
const safe = (side, min) => `max(${min}px, env(safe-area-inset-${side}))`;


// One skill node: its name and price, three rank pips, and what it does.
function SkillNode({ n, owned, free, tree, onBuy, armed, armId, z = 1 }) {
  const rank = nodeRank(owned, n.id);
  const maxed = isMaxed(owned, n.id);
  const open = nodeUnlocked(n, owned);
  const cost = nextCost(owned, n);
  const afford = cost != null && free >= cost;
  const buyable = !maxed && open && afford;
  return (
    <button data-arm={armId} disabled={!buyable} onClick={() => buyable && onBuy(n)}
      style={{
        ...btn, position: "relative", overflow: "hidden", textAlign: "left", padding: 8 * z, display: "flex", flexDirection: "column", gap: 4 * z,
        width: "100%", height: "100%", boxSizing: "border-box", justifyContent: "flex-start",
        cursor: buyable ? "pointer" : "default",
        ...(maxed
          ? { background: "#3c4a32", boxShadow: "inset -2px -2px 0 #26301f, inset 2px 2px 0 #5a6e4a" }
          : rank > 0 ? { boxShadow: "inset 0 0 0 2px #7a6a3c" }
          : !open ? { opacity: 0.42 }
          : !afford ? { opacity: 0.62 } : {}),
        ...(armed ? ARMED : {}),
      }}>
      <span style={{ display: "flex", alignItems: "flex-start", gap: 6, width: "100%" }}>
        <b style={{ fontSize: 11.5 * z, color: maxed ? "#c8e0a8" : "#e8e0c8" }}>{n.name}</b>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontSize: 10 * z, whiteSpace: "nowrap" }}>
          {maxed
            ? <span style={{ color: "#a8d88c" }}>MAX</span>
            : open ? (<><span style={{ opacity: 0.6 }}>next</span>{cost}<Star size={Math.round(11 * z)} lit={afford} /></>)
            : <span style={{ opacity: 0.6 }}>locked</span>}
        </span>
      </span>

      {/* three rungs: filled, next-up, and not yet paid for */}
      <span style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {Array.from({ length: RANKS }, (_, i) => (
          <span key={i} style={{
            width: 26 * z, height: 7 * z, border: "2px solid #10131a", boxSizing: "border-box",
            background: i < rank ? "#d8b34a" : i === rank && open ? "#4a5162" : "#272c36",
          }} />
        ))}
        <span style={{ fontSize: 9 * z, opacity: 0.65, marginLeft: 2 }}>
          {rank}/{RANKS}{rank > 0 ? ` · ${modSummary(n, rank)}` : ""}
        </span>
      </span>

      <span style={{ fontFamily: FONT, fontSize: 10 * z, opacity: 0.8, lineHeight: 1.45 }}>{n.desc}</span>
      {!open && (
        <span style={{ fontSize: 9 * z, color: "#e07a72" }}>
          Needs {n.needs.map((r) => tree.nodes.find((x) => x.id === r)?.name).join(" and ")} at rank {RANKS}
        </span>
      )}
      {armed && (
        <ArmBand z={z}>TAP AGAIN · SPEND {cost}★</ArmBand>
      )}
    </button>
  );
}

// The tree read left to right: [opener]─[follow-up]─┐
//                                                    ├─[capstone]
//                              [opener]─[follow-up]─┘
function TreeAcross({ tiers, node }) {
  const [t1, t2, t3] = tiers;
  const line = (extra) => ({ position: "absolute", background: RUNG, ...extra });
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0,1fr) 16px minmax(0,1fr) 22px minmax(0,1fr)",
      gridAutoRows: "1fr", gap: "10px 0", alignItems: "stretch",
    }}>
      {[0, 1].map((r) => (
        <div key={`a${r}`} style={{ display: "contents" }}>
          <div style={{ gridColumn: 1, gridRow: r + 1 }}>{t1[r] && node(t1[r])}</div>
          <div style={{ gridColumn: 2, gridRow: r + 1, position: "relative" }}>
            <div style={line({ left: 0, right: 0, top: "50%", height: 2 })} />
          </div>
          <div style={{ gridColumn: 3, gridRow: r + 1 }}>{t2[r] && node(t2[r])}</div>
        </div>
      ))}
      {/* the bracket that joins both follow-ups into the capstone */}
      <div style={{ gridColumn: 4, gridRow: "1 / 3", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, width: 11, top: "25%", bottom: "25%", borderTop: `2px solid ${RUNG}`, borderBottom: `2px solid ${RUNG}`, borderRight: `2px solid ${RUNG}`, boxSizing: "border-box", marginTop: -1 }} />
        <div style={line({ left: 11, right: 0, top: "50%", height: 2 })} />
      </div>
      <div style={{ gridColumn: 5, gridRow: "1 / 3", display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%" }}>{t3[0] && node(t3[0])}</div>
      </div>
    </div>
  );
}

// The tree read top to bottom, for a phone held upright.
function TreeDown({ tiers, node, gap = 8 }) {
  return tiers.map((row, ri) => (
    <div key={ri}>
      {ri > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "38%", height: gap + 4 }}>
          <div style={{ width: 2, background: RUNG }} />
          <div style={{ width: 2, background: RUNG }} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: row.length > 1 ? "1fr 1fr" : "1fr", gap }}>
        {row.map((n) => <div key={n.id}>{node(n)}</div>)}
      </div>
    </div>
  ));
}

// One hall type's experience: the bar runs to the finals, with a tick where the paths open.
function HallXp({ kind, profile, progress, z }) {
  if (!towerUnlocked(kind, progress)) {
    const lv = unlockLevel(kind);
    return <div style={{ fontSize: 10 * z, color: "#e07a72", marginBottom: 8 }}>Not learned yet{lv ? ` · hold ${lv.name} to learn it` : ""}. Its skills can be bought now.</div>;
  }
  const xp = hallXp(profile, kind), paths = TIER_XP[4], finals = TIER_XP[5];
  const line = xp >= finals ? "Paths and finals open"
    : xp >= paths ? <>Paths open · finals at <b>{num(finals)}</b></>
    : <>Paths at <b>{num(paths)}</b> · finals at <b>{num(finals)}</b></>;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 9.5 * z, marginBottom: 3, whiteSpace: "nowrap" }}>
        <span><span style={{ opacity: 0.55, letterSpacing: 1 }}>HALL EXPERIENCE </span><b style={{ color: "#e8d47a" }}>{num(xp)}</b></span>
        <span style={{ opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis" }}>{line}</span>
      </div>
      <div style={{ position: "relative", height: 8 * z, background: "#191d25", border: "2px solid #10131a" }}>
        <div style={{ height: "100%", width: `${Math.min(100, (xp / finals) * 100)}%`, background: xp >= finals ? "#a8d88c" : "#d8b34a" }} />
        <div style={{ position: "absolute", top: -2, bottom: -2, left: `${(paths / finals) * 100}%`, width: 2, background: "#e8e0c8", opacity: 0.7 }} />
      </div>
    </div>
  );
}

const TABS = [["castle", "CASTLE"], ["towers", "TOWERS"], ["heroes", "HEROES"]];

export default function WarRoom({ profile, setProfile, progress, treasury = 0, onBuyWork, onRefundAll, onClose }) {
  const [kind, setKind] = useState(KINDS[0]);
  const [hero, setHero] = useState(HERO_KEYS[0]);
  const [tab, setTab] = useState("castle");   // always opens on the castle (owner)
  const [helpOn, setHelp] = useState(false);
  const vp = useViewport();

  const upright = vp.h > vp.w;          // a phone held tall: picker on top, tree runs down
  const phone = vp.short || vp.narrow;  // tighten the chrome
  const big = !upright && vp.h >= 600 && vp.w >= 900; // iPads and desktops: picker in one row, tree drawn larger
  // on big screens the tree is drawn larger, sized to the room (the <Fit> still shrinks it if it must)
  const z = big ? Math.min(1.35, Math.max(1, Math.min(vp.w / 1000, vp.h / 640))) : 1;
  // the hero sheets are shorter than a tree, so on big screens they draw larger still
  const heroZ = big ? Math.min(1.55, Math.max(1, Math.min(vp.w / 760, vp.h / 480))) : 1;
  const top = upright || big;           // the picker sits across the top, not down a rail
  const across = !top;                  // only the phone on its side reads the tree left to right
  const help = helpOn && !big;          // big screens show the rules under the tree instead

  const tree = SKILLS[kind];
  const owned = profile.perks[kind] || {};
  const free = starsFree(profile);
  const earned = starsEarned(profile);
  const works = loadCastle("crown");
  const heroRec = heroRecord(profile, hero);

  const tiers = [1, 2, 3].map((t) => tree.nodes.filter((n) => n.tier === t));

  // two taps to spend: the first arms the node, the second buys
  const arm = useArm();
  const buy = (n) => arm.tap(`sk:${kind}:${n.id}`, () => setProfile({ ...buyRank(profile, kind, n) }));
  const node = (n) => (
    <SkillNode key={n.id} n={n} owned={owned} free={free} tree={tree} onBuy={buy} z={z}
      armId={`sk:${kind}:${n.id}`} armed={arm.is(`sk:${kind}:${n.id}`)} />
  );

  // ---- the pinned header pieces ----
  const backBtn = (
    <button style={{ ...btn, padding: "6px 12px", fontSize: 12, minHeight: 40, flexShrink: 0 }} onClick={onClose}>◀ Back</button>
  );
  const heading = <div style={{ ...title(phone ? 13 : 15), whiteSpace: "nowrap" }}>{WAR_ROOM}</div>;
  // the tab's own money: gold for the castle, the shared stars for the towers, the hero's own stars
  const purse = (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: "nowrap" }}>
      {tab === "castle" ? (
        <><CoinIcon size={16} /> <b style={{ color: "#e8d47a" }}>{num(treasury)}</b></>
      ) : tab === "towers" ? (
        <><Star size={16} /> <b style={{ color: "#e8d47a" }}>{free}</b><span style={{ fontSize: 10, opacity: 0.5 }}>/ {earned}</span></>
      ) : (
        <><ValorIcon size={16} /> <b style={{ color: "#e8d47a" }}>{heroRec.points}</b><span style={{ fontSize: 10, opacity: 0.6 }}>{HEROES[hero].name}</span></>
      )}
    </div>
  );
  // every tab's refund in the same place, two taps, the full price back
  const back = tab === "castle" ? worksValue(works) : tab === "towers" ? spentOn(kind, owned) : talentsSpent(heroRec.talents);
  const refundWhat = tab === "castle" ? "every work" : tab === "towers" ? tree.name : HEROES[hero].name;
  const refundId = `refund:${tab}:${tab === "towers" ? kind : tab === "heroes" ? hero : "all"}`;
  const refundArmed = arm.is(refundId);
  const doRefund = () => {
    if (tab === "castle") onRefundAll?.();
    else if (tab === "towers") setProfile({ ...refundTower(profile, kind) });
    else setProfile({ ...resetHeroTalents(hero) });
  };
  const refund = (
    <button data-arm={refundId} disabled={!back} title={`Refund ${refundWhat}: the full price back`}
      onClick={() => back && arm.tap(refundId, doRefund)}
      style={{
        ...btn, position: "relative", overflow: "hidden", flexShrink: 0, minHeight: 40, padding: "4px 10px", fontSize: 10.5,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.15,
        minWidth: refundArmed ? 118 : 0, opacity: back ? 1 : 0.4, cursor: back ? "pointer" : "default",
        ...(refundArmed ? ARMED : {}),
      }}>
      {refundArmed ? (
        <b style={{ fontSize: 10 }}>TAP AGAIN</b>
      ) : (
        <span>Refund</span>
      )}
      <span style={{ fontSize: 9, opacity: 0.8, display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
        {back ? <>+{tab === "castle" ? <><CoinIcon size={10} />{num(back)}</> : tab === "heroes" ? <>{back}<ValorIcon size={10} /></> : <>{back}★</>}</> : "nothing yet"}
      </span>
    </button>
  );
  const can = { castle: castleCan(treasury), towers: towersCan(profile), heroes: heroesCan(profile) };
  const tabs = (
    <div style={{ display: "flex", gap: 6, flexShrink: 0, ...(upright ? { width: "100%" } : {}) }}>
      <style>{GLOW_CSS}</style>
      {TABS.map(([id, label]) => (
        <button key={id} onClick={() => { setTab(id); setHelp(false); arm.clear(); }} aria-pressed={tab === id}
          title={can[id] ? "Something here can be bought" : undefined}
          style={{
            ...btn, flex: upright ? 1 : "0 0 auto", textAlign: "center", fontSize: 11, letterSpacing: 1,
            padding: phone ? "6px 10px" : "8px 14px", minHeight: 40, ...(tab === id ? { ...ON, color: "#f0d27a" } : {}), ...(can[id] ? GLOW : {}),
          }}>
          {label}
        </button>
      ))}
    </div>
  );

  // ---- the tower picker: a rail on the left, or two rows across the top ----
  const picker = (
    <div style={top
      ? { display: "grid", gridTemplateColumns: `repeat(${upright ? Math.ceil(KINDS.length / 2) : KINDS.length}, 1fr)`, gap: upright ? 5 : 6, flexShrink: 0 }
      : {
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: `repeat(${Math.ceil(KINDS.length / 3)}, 1fr)`,
        gap: 5, width: vp.short ? 168 : 200, flexShrink: 0, minHeight: 0,
      }}>
      {KINDS.map((k) => {
        const spent = spentOn(k, profile.perks[k] || {});
        const xp = hallXp(profile, k), learned = towerUnlocked(k, progress);
        return (
          <button key={k} onClick={() => { setKind(k); setHelp(false); arm.clear(); }} aria-label={SKILLS[k].name} title={SKILLS[k].name}
            style={{
              ...btn, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, padding: "4px 2px 6px", minHeight: big ? 64 : upright ? 50 : 42, minWidth: 0, textAlign: "center",
              ...(k === kind ? ON : {}),
            }}>
            <span style={{ opacity: learned ? 1 : 0.45, display: "flex" }}><TowerPortrait kind={k} size={big ? 44 : upright ? 30 : 34} /></span>
            <span style={{ fontSize: 9, opacity: spent ? 0.9 : 0.5, whiteSpace: "nowrap" }}>
              {spent ? `${spent}/${treeCost(k)}★` : "—"}
            </span>
            {/* the hall's experience toward its finals, a thin line at the foot */}
            {learned && (
              <span aria-hidden="true" style={{ position: "absolute", left: 4, right: 4, bottom: 3, height: 2, background: "#191d25" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.min(100, (xp / TIER_XP[5]) * 100)}%`, background: xp >= TIER_XP[5] ? "#a8d88c" : "#d8b34a" }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  // ---- the chosen tree (or the rules behind "?") ----
  const rules = (
    <>
      Every node holds {RANKS} ranks at +5% each. Each rank costs more than the last, and deeper tiers cost
      more than shallow ones — a first rank is 1 star, the last rank of the capstone is 8. A node must be at
      rank {RANKS} before the one {across ? "beside" : "below"} it opens, so a whole tree runs to {treeCost(kind)} stars against a
      campaign that yields 30: the tail is meant to be a long haul. Skills are permanent and apply to every
      {" "}{tree.name.toLowerCase()} you raise, in every battle, on top of the gold upgrades you buy during it.
      Hall experience is earned in campaign battles by this kind of hall's kills: at {num(TIER_XP[4])} its
      two paths open in battle, at {num(TIER_XP[5])} its finals.
    </>
  );
  const treePanel = (
    <div style={{ ...panel, boxSizing: "border-box", width: "100%", ...(big ? { maxWidth: 800 * z, margin: "0 auto" } : {}) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <TowerPortrait kind={kind} size={Math.round(40 * z)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14 * z, fontWeight: "bold", color: "#e8d47a" }}>{tree.name}</div>
          <div style={{ fontSize: 10 * z, opacity: 0.75 }}>{tree.blurb}</div>
        </div>
        {!big && <button aria-label={help ? "Back to the tree" : "How skills work"} onClick={() => setHelp((h) => !h)}
          style={{ ...btn, fontSize: 12, padding: "4px 0", minHeight: 40, minWidth: 40, textAlign: "center", ...(help ? ON : {}) }}>
          {help ? "✕" : "?"}
        </button>}
      </div>

      {!help && <HallXp kind={kind} profile={profile} progress={progress} z={z} />}

      {help ? (
        <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.6, maxWidth: 620 }}>{rules}</div>
      ) : across ? (
        <TreeAcross tiers={tiers} node={node} />
      ) : (
        <TreeDown tiers={tiers} node={node} gap={8 * z} />
      )}

      {!help && big && <div style={{ fontSize: 10 * z, opacity: 0.55, marginTop: 12, lineHeight: 1.5 }}>{rules}</div>}
      {!help && !big && (
        <div style={{ fontSize: 9.5, opacity: 0.55, marginTop: 8, lineHeight: 1.45 }}>
          {RANKS} ranks a node, +5% each · max a node to open the next · whole tree {treeCost(kind)}★ · permanent, every battle
        </div>
      )}
    </div>
  );

  // ---- the castle: the works list (it scrolls; six works don't fit a phone) ----
  const castleBody = (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", touchAction: "pan-y", scrollbarWidth: "thin" }}>
      <div style={{ maxWidth: big ? 980 : "none", margin: "0 auto" }}>
        <CastleWorksList works={works} purse={treasury} noPurse
          note="Every level you hold sends its leftover gold home. Spend it here on the crown's castle: what you build stands at every level, in every realm."
          onBuy={onBuyWork} />
      </div>
    </div>
  );

  // the body never scrolls: whatever does not fit is shrunk, whole, to fit
  const fitted = (child, deps) => (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative" }}>
      <Fit min={0.5} align={top ? "top" : "center"} deps={deps}>{child}</Fit>
    </div>
  );

  const gap = phone ? 8 : 12;
  const maxW = big ? 1180 : "none";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, overflow: "hidden", boxSizing: "border-box",
      background: "#20242c", color: "#e8e0c8", fontFamily: FONT,
      paddingTop: safe("top", phone ? 8 : 14), paddingBottom: safe("bottom", phone ? 8 : 14),
      paddingLeft: safe("left", phone ? 10 : 16), paddingRight: safe("right", phone ? 10 : 16),
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: maxW, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap }}>
        {/* the pinned header: back, title, tabs, the tab's purse and refund */}
        {upright ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {backBtn}
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{heading}</div>
              {purse}
              {refund}
            </div>
            {tabs}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: phone ? 10 : 14, flexShrink: 0 }}>
            {backBtn}
            {heading}
            {tabs}
            <div style={{ flex: 1 }} />
            {purse}
            {refund}
          </div>
        )}

        {tab === "castle" ? (
          castleBody
        ) : tab === "heroes" ? (
          <HeroTalents profile={profile} setProfile={setProfile} arm={arm} z={heroZ} fitted={fitted}
            pick={hero} onPick={(k) => { setHero(k); arm.clear(); }} layout={big ? "wide" : upright ? "stack" : "rail"} />
        ) : top ? (
          <>
            {picker}
            {fitted(treePanel, [kind, help, across, profile.towerXp?.[kind]])}
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap }}>
            {picker}
            {fitted(treePanel, [kind, help, across, profile.towerXp?.[kind]])}
          </div>
        )}
      </div>
    </div>
  );
}
