// ============ THE TOWER EDIT MENU (pieces) ============
// What the tray turns into when a tower on the board is selected (owner,
// 2026-09-30; the sketch is in CLAUDE.md "The tower menu is the tray"):
//   the BANNER   - picture, name, level pips, the ⓘ, the form's numbers and
//                  its service record (kills, dps);
//   the TARGETS  - one slim bar that drops its choices down over the panel;
//   the UPGRADE  - the next step on offer (kept in CrownguardGame.jsx, where
//                  the two-tap buying lives);
//   SELL         - pinned at the panel's foot;
//   the TREE     - the ⓘ's layer: every step of the hall's road as a small
//                  picture, tap one to read its tale (no damage numbers).
// These are only the pictures; the game component owns every action.

import TowerPortrait from "./TowerPortrait.jsx";
import { CoinIcon, SkullIcon, BoltIcon, ChevronUp, ChevronDown, LockIcon } from "./hud/icons.jsx";
import { BookIcon } from "./Glyphs.jsx";

const cls = (...c) => c.filter(Boolean).join(" ");
const Price = ({ n, can = true, size = 11 }) => (
  <span className={cls("cg-price", !can && "is-short")}><CoinIcon size={size} />{n}</span>
);

// ---- the banner ----
// `rows` are the form's numbers ([{ label, value }], first four shown);
// `preview` maps a label to the value the armed upgrade would give it.
export function TowerBanner({ kind, name, branch, rank4, pips, rows, preview, kills, dps, paid, infoNode, compact }) {
  const cells = rows.slice(0, 4);
  // names run to 19 letters: step the type down so each stays on one line
  const nameSize = compact ? 11 : Math.max(10, Math.min(13, Math.floor(150 / (name.length * 0.8))));
  const well = compact ? 38 : 48;
  const stat = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" };
  const n = { fontSize: 13, color: "var(--cream)", textShadow: "1px 1px 0 var(--ink)" };
  return (
    <div className="cg-panel" style={{ position: "relative", padding: "8px 9px", display: "flex", flexDirection: "column", gap: 7 }}>
      {/* the ⓘ sits level with the pips, so a long name gets the whole line */}
      <span style={{ position: "absolute", right: 2, top: 22, width: 56, height: 56, pointerEvents: "none", zIndex: 3 }}>
        <span style={{ pointerEvents: "auto" }}>{infoNode}</span>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span className="cg-well" style={{ width: well, height: well, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TowerPortrait kind={kind} branch={branch} rank4={rank4} size={well - 4} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cg-display" style={{ fontWeight: 700, color: "var(--gold-lt)", fontSize: nameSize, lineHeight: 1.15, textShadow: "1px 1px 0 var(--ink)", ...(compact ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden", paddingRight: 14 } : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }) }}>{name}</div>
          <div className="cg-pips" style={{ marginTop: 5 }} title="three levels, a path, and a final ascension">
            {[1, 2, 3, 4, 5].map((i) => <span key={i} className={cls("cg-pip", i <= pips && "on", i > 3 && "big")} />)}
          </div>
        </div>
      </div>
      {/* the form's numbers: four cells, always, so the banner never changes height */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px", borderTop: "2px solid var(--ink)", paddingTop: compact ? 5 : 7, minHeight: compact ? 54 : 66 }}>
        {[0, 1, 2, 3].map((i) => {
          const r = cells[i];
          if (!r) return <span key={i} />;
          const next = preview && preview[r.label];
          return (
            <span key={r.label} style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ fontFamily: "var(--body)", fontSize: 10, color: "var(--muted)", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
              <span className="cg-num" style={{ fontSize: 12, color: next ? "var(--green)" : "var(--cream)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{next ? `▸ ${next}` : r.value}</span>
            </span>
          );
        })}
      </div>
      {/* the service record: what this hall has actually done for you */}
      <div style={{ display: "flex", flexWrap: "nowrap", gap: 12, borderTop: "2px solid var(--ink)", paddingTop: 7, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span title="foes this tower struck down" style={stat}><SkullIcon size={12} /><b className="cg-num" style={n}>{kills}</b></span>
        <span title="average damage per second while a foe is in range, since the last upgrade" style={stat}><BoltIcon size={12} /><b className="cg-num" style={{ ...n, color: "var(--green)" }}>{dps >= 100 ? Math.round(dps) : dps.toFixed(1)}</b> dps</span>
        {paid != null && <span title="gold this works has paid you this run" style={stat}><CoinIcon size={12} /><b className="cg-num" style={{ ...n, color: "var(--gold-lt)" }}>{paid}</b> paid</span>}
      </div>
    </div>
  );
}

// ---- the targets bar and the layer it drops ----
// `forced`: this hall always hunts one kind of foe (the bar is locked).
// `slim`: a short screen, where the bar shares its row with Sell (no label).
export function TargetsBar({ modes, aim, forced, open, onToggle, onPick, slim }) {
  const cur = modes.find((m) => m.id === aim) || modes[0];
  if (forced) {
    return (
      <div className="cg-btn cg-btn--slate is-off" style={{ width: "100%", justifyContent: "space-between", cursor: "default", padding: "0 10px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LockIcon size={12} />{!slim && " Targets"}</span>
        <span style={{ color: "var(--cream)" }}>{forced === "strong" ? (slim ? "Mightiest" : "Mightiest foe") : forced}</span>
      </div>
    );
  }
  if (!modes.length) return null;
  return (
    <div style={{ position: "relative", zIndex: 4 }}>
      <button type="button" aria-expanded={open} aria-haspopup="listbox" className={cls("cg-btn cg-btn--slate", open && "is-on")}
        style={{ width: "100%", justifyContent: "space-between", padding: slim ? "0 8px" : "0 10px" }} onClick={onToggle} aria-label={`Targets: ${cur.label}`}>
        {!slim && <span style={{ color: open ? "var(--gold-lt)" : "var(--muted)" }}>Targets</span>}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--gold-lt)" }}>{cur.label}{open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}</span>
      </button>
      <div role="listbox" aria-hidden={!open} className={cls("cg-drop", open && "is-open")} style={{ left: -8, right: slim ? -86 : -8 }}>
        {modes.map((m) => (
          <button key={m.id} type="button" role="option" aria-selected={aim === m.id} tabIndex={open ? undefined : -1} title={m.hint}
            className={cls("cg-btn cg-btn--slate", aim === m.id && "is-on")} style={{ width: "100%", justifyContent: "space-between", padding: "0 12px" }}
            onClick={() => onPick(m.id)}>
            <span>{m.label}</span>{aim === m.id && <span>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- the tree ----
// Where each step sits in a 200 x 160 box (centres): the three levels along
// the top, the two paths under level 3, each path's two finals under it.
const POS = { l1: [20, 20], l2: [70, 20], l3: [120, 20] };
const BX = [45, 145];
const FX = [[20, 70], [120, 170]];

// the step a tower stands on, as a tree id
export const nodeOf = (t) => (t.rank4 ? `r:${t.branch}:${t.rank4}` : t.branch ? `b:${t.branch}` : `l${t.level}`);

export function treeNodes(def) {
  const nodes = {};
  const edges = [["l1", "l2"], ["l2", "l3"]];
  nodes.l1 = { id: "l1", at: POS.l1, name: def.name, cost: def.cost, to: "raise", tale: `Where every ${def.name} begins.` };
  nodes.l2 = { id: "l2", at: POS.l2, name: def.levels[1].label, cost: def.levels[1].cost, tale: "Level 2. Still building toward the split at level 3." };
  nodes.l3 = { id: "l3", at: POS.l3, name: def.levels[2].label, cost: def.levels[2].cost, tale: "Level 3. The road splits here: choose one path, forever." };
  Object.entries(def.branches).forEach(([bk, br], bi) => {
    const bid = `b:${bk}`;
    nodes[bid] = { id: bid, at: [BX[bi], 80], branch: bk, name: br.name, cost: br.cost, tale: br.desc };
    edges.push(["l3", bid]);
    Object.entries(br.rank4 || {}).forEach(([rk, r4], ri) => {
      const rid = `r:${bk}:${rk}`;
      nodes[rid] = { id: rid, at: [FX[bi][ri], 140], branch: bk, rank4: rk, name: r4.name, cost: r4.cost, tale: r4.desc };
      edges.push([bid, rid]);
    });
  });
  return { nodes, edges };
}

// The ⓘ layer's body: the tree, then the tale of the step being read.
export function UpgradeTree({ kind, def, cur, picked, onPick, onGuide }) {
  const { nodes, edges } = treeNodes(def);
  const curId = nodeOf(cur);
  const route = new Set(["l1"]);
  if (cur.level >= 2 || cur.branch) route.add("l2");
  if (cur.level >= 3 || cur.branch) route.add("l3");
  if (cur.branch) route.add(`b:${cur.branch}`);
  if (cur.rank4) route.add(curId);
  const sel = nodes[picked] || nodes[curId];
  const path = ([a, b]) => {
    const p = nodes[a].at, c = nodes[b].at;
    if (p[1] === c[1]) return `M${p[0] + 20} ${p[1]}H${c[0] - 20}`;
    const m = (p[1] + c[1]) / 2;
    return `M${p[0]} ${p[1] + 20}V${m}H${c[0]}V${c[1] - 20}`;
  };
  return (
    <>
      <div className="cg-label">Upgrade tree</div>
      <div style={{ position: "relative", width: "min(100%, 210px)", aspectRatio: "200 / 160", margin: "2px auto", flexShrink: 0 }}>
        <svg viewBox="0 0 200 160" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", shapeRendering: "crispEdges" }}>
          {edges.map((e) => (
            <path key={e.join()} d={path(e)} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke"
              stroke={route.has(e[0]) && route.has(e[1]) ? "var(--gold)" : "var(--slate-lt)"} />
          ))}
        </svg>
        {Object.values(nodes).map((nd) => {
          const on = nd.id === curId, inRoute = route.has(nd.id), isSel = sel.id === nd.id;
          return (
            <span key={nd.id} style={{ position: "absolute", left: `${(nd.at[0] - 20) / 2}%`, top: `${(nd.at[1] - 20) / 1.6}%`, width: "20%", height: "25%" }}>
              <button type="button" aria-label={nd.name} aria-pressed={isSel} onClick={() => onPick(nd.id)}
                className={cls("cg-btn cg-btn--slate cg-node", on && "is-on", !inRoute && !isSel && "is-dim", isSel && "is-sel")}>
                {nd.id[0] === "l"
                  ? <span className="cg-num" style={{ fontSize: 15, color: inRoute ? "var(--gold-lt)" : "var(--cream)" }}>{nd.id[1]}</span>
                  : <span className="cg-dim" style={{ display: "flex", lineHeight: 0 }}><TowerPortrait kind={kind} branch={nd.branch} rank4={nd.rank4} size={34} /></span>}
              </button>
            </span>
          );
        })}
      </div>
      <div className="cg-well" style={{ flexShrink: 0, minHeight: 96, padding: "8px 9px", display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="cg-display" style={{ fontWeight: 700, fontSize: 13, color: "var(--gold-lt)", textShadow: "1px 1px 0 var(--ink)" }}>{sel.name}</span>
        <span style={{ fontSize: 10, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}><Price n={sel.cost} size={10} />{sel.to ? ` to ${sel.to}` : ""}</span>
        <span style={{ fontSize: 11, lineHeight: 1.45 }}>{sel.tale}</span>
      </div>
      <button type="button" className="cg-btn cg-btn--slate" style={{ flexShrink: 0 }} onClick={onGuide}><BookIcon size={14} /> Open in Field Guide</button>
    </>
  );
}
