// ============ THE WAR COUNCIL ============
// Where stars are spent. One tab per tower, each with a small three-tier
// skill tree: two openers, two follow-ups that need an opener, and a capstone
// that needs both. Bought nodes are permanent and apply in every battle.
//
// The screen never scrolls. It fills the visible screen (inside the notch's
// safe area) and splits into a pinned header, a tower picker, and the chosen
// tree, which is drawn inside <Fit> so it shrinks, whole, into the room left:
//
//  - a phone on its side: the picker is a rail down the left, and the tree
//    reads left to right — openers, follow-ups, capstone — so the wide,
//    short screen holds all five nodes at once.
//  - a phone held upright: the picker is two rows of six across the top,
//    and the tree reads top to bottom in three rows.
//  - iPads and desktops: the picker is one row of twelve, and the tree reads
//    top to bottom, its sizes multiplied by `z` to fill the room (<Fit> only
//    ever shrinks, so growing is done by drawing larger, not scaling up).
//
// On phones the long rules text sits behind the "?" button, so it never
// squeezes the tree; big screens show it under the tree.
//
// Spending takes two taps (useArm, in HeroTalents.jsx): the first arms a
// node — it turns gold and its foot reads "TAP AGAIN · SPEND n★" — and the
// second tap on it buys. A tap anywhere else, or 3 seconds, disarms it.
//
// The HEROES tab (HeroTalents.jsx) spends the heroes' talent points.

import { useState } from "react";
import {
  SKILLS, RANKS, nodeUnlocked, spentOn, treeCost, rankOf as nodeRank,
  nextCost, isMaxed, modSummary,
} from "../data/skills.js";
import {
  starsEarned, starsFree, buyRank, refundTower, resetProfile,
  rankName, rankOf, rankProgress,
} from "../data/profile.js";
import { LEVELS } from "../data/campaign.js";
import TowerPortrait from "./TowerPortrait.jsx";
import { Star } from "./Glyphs.jsx";
import { btn, panel, title, FONT } from "./theme.js";
import { useViewport, Fit } from "./fit.jsx";
import HeroTalents, { useArm, ArmBand, ARMED } from "./HeroTalents.jsx";

const KINDS = Object.keys(SKILLS);

const ON = { background: "#5a4f2c", boxShadow: "inset 0 0 0 2px #7a6a3c" };
const RUNG = "#454c5a";

// the notch sits on a side when the phone lies down; keep clear of it
const safe = (side, min) => `max(${min}px, env(safe-area-inset-${side}))`;

const StatRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, padding: "3px 0", borderBottom: "1px solid #363c48" }}>
    <span style={{ opacity: 0.65 }}>{label}</span>
    <b style={{ color: "#e8e0c8" }}>{value}</b>
  </div>
);

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

      <span style={{ fontSize: 10 * z, opacity: 0.8, lineHeight: 1.45 }}>{n.desc}</span>
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

export default function WarCouncil({ profile, setProfile, onBack }) {
  const [kind, setKind] = useState("archer");
  const [tab, setTab] = useState("skills");
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
  const s = profile.stats;

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
    <button style={{ ...btn, padding: "6px 12px", fontSize: 12, minHeight: 40, flexShrink: 0 }} onClick={onBack}>◀ Menu</button>
  );
  const heading = <div style={{ ...title(phone ? 13 : 15), whiteSpace: "nowrap" }}>WAR COUNCIL</div>;
  const purse = (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, flexShrink: 0 }}>
      <Star size={16} /> <b style={{ color: "#e8d47a" }}>{free}</b>
      <span style={{ fontSize: 10, opacity: 0.5 }}>/ {earned}</span>
    </div>
  );
  const rankBar = (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10.5, marginBottom: 3, whiteSpace: "nowrap" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={{ opacity: 0.55, letterSpacing: 1, fontSize: 9 }}>RANK {rankOf(profile.xp) + 1} · </span>
          <b style={{ color: "#e8d47a" }}>{rankName(profile.xp)}</b>
        </span>
        <span style={{ opacity: 0.6 }}>{profile.xp.toLocaleString()} XP</span>
      </div>
      <div style={{ height: 8, background: "#191d25", border: "2px solid #10131a" }}>
        <div style={{ height: "100%", width: `${Math.round(rankProgress(profile.xp) * 100)}%`, background: "#d8b34a" }} />
      </div>
    </div>
  );
  const tabs = (
    <div style={{ display: "flex", gap: 6, flexShrink: 0, ...(upright ? { width: "100%" } : {}) }}>
      {[["skills", phone ? "TREES" : "SKILL TREES"], ["heroes", "HEROES"], ["stats", phone ? "STATS" : "ALL-TIME"]].map(([id, label]) => (
        <button key={id} onClick={() => { setTab(id); arm.clear(); }}
          style={{
            ...btn, flex: upright ? 1 : "0 0 auto", textAlign: "center", fontSize: 11, letterSpacing: 1,
            padding: phone ? "6px 10px" : "8px 14px", minHeight: 40, ...(tab === id ? ON : {}),
          }}>
          {label}
        </button>
      ))}
    </div>
  );

  // ---- the tower picker: a rail on the left, or two rows across the top ----
  const picker = (
    <div style={top
      ? { display: "grid", gridTemplateColumns: `repeat(${upright ? 6 : 12}, 1fr)`, gap: upright ? 5 : 6, flexShrink: 0 }
      : {
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(4, 1fr)",
        gap: 5, width: vp.short ? 168 : 200, flexShrink: 0, minHeight: 0,
      }}>
      {KINDS.map((k) => {
        const spent = spentOn(k, profile.perks[k] || {});
        return (
          <button key={k} onClick={() => { setKind(k); setHelp(false); arm.clear(); }} aria-label={SKILLS[k].name} title={SKILLS[k].name}
            style={{
              ...btn, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, padding: "4px 2px", minHeight: big ? 64 : upright ? 50 : 42, minWidth: 0, textAlign: "center",
              ...(k === kind ? ON : {}),
            }}>
            <TowerPortrait kind={k} size={big ? 44 : upright ? 30 : 34} />
            <span style={{ fontSize: 9, opacity: spent ? 0.9 : 0.5, whiteSpace: "nowrap" }}>
              {spent ? `${spent}/${treeCost(k)}★` : "—"}
            </span>
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
        {spentOn(kind, owned) > 0 && !help && (
          <button style={{ ...btn, fontSize: 10, padding: "4px 10px", minHeight: 40 }}
            onClick={() => setProfile({ ...refundTower(profile, kind) })}>
            Refund
          </button>
        )}
        {!big && <button aria-label={help ? "Back to the tree" : "How skills work"} onClick={() => setHelp((h) => !h)}
          style={{ ...btn, fontSize: 12, padding: "4px 0", minHeight: 40, minWidth: 40, textAlign: "center", ...(help ? ON : {}) }}>
          {help ? "✕" : "?"}
        </button>}
      </div>

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

  const statsPanel = (
    <div style={{ ...panel, boxSizing: "border-box", width: "100%" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.6, marginBottom: 8 }}>THE RECKONING</div>
      <div style={{ display: "grid", gridTemplateColumns: upright ? "1fr" : "1fr 1fr", gap: "0 22px" }}>
        <div>
          <StatRow label="Levels cleared" value={s.levelsCleared} />
          <StatRow label="Levels lost" value={s.levelsLost} />
          <StatRow label="Flawless defences" value={s.perfect} />
          <StatRow label="Stars earned" value={`${earned} / ${LEVELS.length * 3}`} />
        </div>
        <div>
          <StatRow label="Waves held" value={s.wavesCleared} />
          <StatRow label="Enemies slain" value={s.kills.toLocaleString()} />
          <StatRow label="Gold earned" value={s.goldEarned.toLocaleString()} />
          <StatRow label="Towers raised" value={s.towersBuilt} />
          <StatRow label="Foes that reached the gate" value={s.leaks} />
        </div>
      </div>
      <button style={{ ...btn, marginTop: 12, fontSize: 10, opacity: 0.7 }}
        onClick={() => { if (confirm("Wipe all-time stats, XP, stars and every skill bought? Campaign progress is kept.")) setProfile({ ...resetProfile() }); }}>
        Wipe record &amp; skills
      </button>
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
      height: vp.h, width: "100%", overflow: "hidden", boxSizing: "border-box",
      background: "#20242c", color: "#e8e0c8", fontFamily: FONT,
      paddingTop: safe("top", phone ? 8 : 14), paddingBottom: safe("bottom", phone ? 8 : 14),
      paddingLeft: safe("left", phone ? 10 : 16), paddingRight: safe("right", phone ? 10 : 16),
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: maxW, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap }}>
        {/* the pinned header: back, title, rank, tabs, purse */}
        {upright ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {backBtn}
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{heading}</div>
              {purse}
            </div>
            <div style={{ ...panel, padding: "6px 8px", flexShrink: 0 }}>{rankBar}</div>
            {tabs}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: phone ? 10 : 14, flexShrink: 0 }}>
            {backBtn}
            {heading}
            <div style={{ ...panel, padding: "5px 8px", flex: 1, minWidth: 90, display: "flex" }}>{rankBar}</div>
            {tabs}
            {purse}
          </div>
        )}

        {/* the body: never scrolls; what doesn't fit is shrunk to fit */}
        {tab === "stats" ? (
          fitted(statsPanel, [tab, upright])
        ) : tab === "heroes" ? (
          <HeroTalents arm={arm} z={heroZ} fitted={fitted} layout={big ? "wide" : upright ? "stack" : "rail"} />
        ) : top ? (
          <>
            {picker}
            {fitted(treePanel, [kind, help, across])}
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap }}>
            {picker}
            {fitted(treePanel, [kind, help, across])}
          </div>
        )}
      </div>
    </div>
  );
}
