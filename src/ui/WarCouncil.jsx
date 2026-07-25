// ============ THE WAR COUNCIL ============
// Where stars are spent. One tab per tower, each with a small three-tier
// skill tree: two openers, two follow-ups that need an opener, and a capstone
// that needs both. Bought nodes are permanent and apply in every battle.
//
// The tree is drawn as three rows with connector lines rather than a free
// graph — it keeps the whole thing legible on a phone, and every tree in the
// game has the same shape.

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
import PixelIcon from "./PixelIcon.jsx";
import { Star } from "./Glyphs.jsx";
import { btn, panel, title, FONT } from "./theme.js";

const KINDS = Object.keys(SKILLS);

const StatRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, padding: "3px 0", borderBottom: "1px solid #363c48" }}>
    <span style={{ opacity: 0.65 }}>{label}</span>
    <b style={{ color: "#e8e0c8" }}>{value}</b>
  </div>
);

export default function WarCouncil({ profile, setProfile, onBack }) {
  const [kind, setKind] = useState("archer");
  const [tab, setTab] = useState("skills");

  const tree = SKILLS[kind];
  const owned = profile.perks[kind] || {};
  const free = starsFree(profile);
  const earned = starsEarned(profile);
  const s = profile.stats;

  const tiers = [1, 2, 3].map((t) => tree.nodes.filter((n) => n.tier === t));

  const buy = (node) => setProfile({ ...buyRank(profile, kind, node) });

  return (
    <div style={{
      minHeight: "100dvh", background: "#20242c", color: "#e8e0c8", fontFamily: FONT,
      padding: "14px 12px 28px", boxSizing: "border-box",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      {/* header: who you are, and what you have to spend */}
      <div style={{ width: "100%", maxWidth: 780, display: "flex", alignItems: "center", gap: 10 }}>
        <button style={{ ...btn, padding: "6px 12px", fontSize: 12 }} onClick={onBack}>◀ Menu</button>
        <div style={{ ...title(15), fontSize: 15, flex: 1, textAlign: "center" }}>WAR COUNCIL</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
          <Star size={16} /> <b style={{ color: "#e8d47a" }}>{free}</b>
          <span style={{ fontSize: 10, opacity: 0.5 }}>/ {earned}</span>
        </div>
      </div>

      {/* commander rank */}
      <div style={{ ...panel, width: "100%", maxWidth: 780, boxSizing: "border-box", padding: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
          <span><span style={{ opacity: 0.55, letterSpacing: 1, fontSize: 9 }}>RANK {rankOf(profile.xp) + 1} · </span><b style={{ color: "#e8d47a" }}>{rankName(profile.xp)}</b></span>
          <span style={{ opacity: 0.6 }}>{profile.xp.toLocaleString()} XP</span>
        </div>
        <div style={{ height: 8, background: "#191d25", border: "2px solid #10131a" }}>
          <div style={{ height: "100%", width: `${Math.round(rankProgress(profile.xp) * 100)}%`, background: "#d8b34a" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, width: "100%", maxWidth: 780 }}>
        {[["skills", "SKILL TREES"], ["stats", "ALL-TIME"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...btn, flex: 1, textAlign: "center", fontSize: 11, letterSpacing: 1, ...(tab === id ? { background: "#5a4f2c", boxShadow: "inset 0 0 0 2px #7a6a3c" } : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "stats" ? (
        <div style={{ ...panel, width: "100%", maxWidth: 780, boxSizing: "border-box" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.6, marginBottom: 8 }}>THE RECKONING</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0 22px" }}>
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
      ) : (
        <>
          {/* which tower's tree */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 780 }}>
            {KINDS.map((k) => {
              const spent = spentOn(k, profile.perks[k] || {});
              return (
                <button key={k} onClick={() => setKind(k)}
                  style={{
                    ...btn, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 8px", flex: "1 1 90px",
                    ...(k === kind ? { background: "#5a4f2c", boxShadow: "inset 0 0 0 2px #7a6a3c" } : {}),
                  }}>
                  <PixelIcon kind={k} size={26} />
                  <span style={{ fontSize: 9, opacity: 0.8 }}>{spent ? `${spent}/${treeCost(k)}★` : "—"}</span>
                </button>
              );
            })}
          </div>

          <div style={{ ...panel, width: "100%", maxWidth: 780, boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <PixelIcon kind={kind} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: "bold", color: "#e8d47a" }}>{tree.name}</div>
                <div style={{ fontSize: 10, opacity: 0.75 }}>{tree.blurb}</div>
              </div>
              {spentOn(kind, owned) > 0 && (
                <button style={{ ...btn, fontSize: 9, padding: "4px 8px" }}
                  onClick={() => setProfile({ ...refundTower(profile, kind) })}>
                  Refund
                </button>
              )}
            </div>

            {tiers.map((row, ri) => (
              <div key={ri}>
                {/* the rungs between tiers */}
                {ri > 0 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: "38%", height: 12 }}>
                    <div style={{ width: 2, background: "#454c5a" }} />
                    <div style={{ width: 2, background: "#454c5a" }} />
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: row.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
                  {row.map((n) => {
                    const rank = nodeRank(owned, n.id);
                    const maxed = isMaxed(owned, n.id);
                    const open = nodeUnlocked(n, owned);
                    const cost = nextCost(owned, n);
                    const afford = cost != null && free >= cost;
                    const buyable = !maxed && open && afford;
                    return (
                      <button key={n.id} disabled={!buyable} onClick={() => buy(n)}
                        style={{
                          ...btn, textAlign: "left", padding: 8, display: "flex", flexDirection: "column", gap: 4,
                          cursor: buyable ? "pointer" : "default",
                          ...(maxed
                            ? { background: "#3c4a32", boxShadow: "inset -2px -2px 0 #26301f, inset 2px 2px 0 #5a6e4a" }
                            : rank > 0 ? { boxShadow: "inset 0 0 0 2px #7a6a3c" }
                            : !open ? { opacity: 0.42 }
                            : !afford ? { opacity: 0.62 } : {}),
                        }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <b style={{ fontSize: 11.5, color: maxed ? "#c8e0a8" : "#e8e0c8" }}>{n.name}</b>
                          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontSize: 10 }}>
                            {maxed
                              ? <span style={{ color: "#a8d88c" }}>MAX</span>
                              : open ? (<><span style={{ opacity: 0.6 }}>next</span>{cost}<Star size={11} lit={afford} /></>)
                              : <span style={{ opacity: 0.6 }}>locked</span>}
                          </span>
                        </span>

                        {/* three rungs: filled, next-up, and not yet paid for */}
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {Array.from({ length: RANKS }, (_, i) => (
                            <span key={i} style={{
                              width: 26, height: 7, border: "2px solid #10131a", boxSizing: "border-box",
                              background: i < rank ? "#d8b34a" : i === rank && open ? "#4a5162" : "#272c36",
                            }} />
                          ))}
                          <span style={{ fontSize: 9, opacity: 0.65, marginLeft: 2 }}>
                            {rank}/{RANKS}{rank > 0 ? ` · ${modSummary(n, rank)}` : ""}
                          </span>
                        </span>

                        <span style={{ fontSize: 10, opacity: 0.8, lineHeight: 1.45 }}>{n.desc}</span>
                        {!open && (
                          <span style={{ fontSize: 9, color: "#e07a72" }}>
                            Needs {n.needs.map((r) => tree.nodes.find((x) => x.id === r)?.name).join(" and ")} at rank {RANKS}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ fontSize: 10, opacity: 0.55, marginTop: 10, lineHeight: 1.5 }}>
              Every node holds {RANKS} ranks at +5% each. Each rank costs more than the last, and deeper tiers cost
              more than shallow ones — a first rank is 1 star, the last rank of the capstone is 8. A node must be at
              rank {RANKS} before the one below it opens, so a whole tree runs to {treeCost(kind)} stars against a
              campaign that yields 30: the tail is meant to be a long haul. Skills are permanent and apply to every
              {" "}{tree.name.toLowerCase()} you raise, in every battle, on top of the gold upgrades you buy during it.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
