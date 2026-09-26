// ============ RealmThumb ============
// A realm's road in miniature: its ground, the sea and rivers where it has
// them, the road from the red spawn to the gold gate, and its ponds (water,
// ice or lava). Drawn from the realm's own data as a small SVG, so every
// battlefield — the free realms and each chapter's — gets one for free.
// Used by the Free Play pickers (the sandbox setup's BATTLEFIELD tab).
//
//   <RealmThumb realm={REALMS.greenwood} width={108} height={72} />
//   <RealmThumb realm="frostfang" width={54} height={36} />

import { W, H } from "../data/constants.js";
import { REALMS } from "../data/maps.js";
import { coastOutline } from "../data/terrain.js";

export default function RealmThumb({ realm, width = 108, height = 72, style }) {
  const r = typeof realm === "string" ? REALMS[realm] : realm;
  if (!r) return null;
  const road = r.path.map(([c, row]) => `${c * 10 + 5},${row * 10 + 5}`).join(" ");
  const end = r.path[r.path.length - 1];
  return (
    <svg viewBox="0 0 150 100" width={width} height={height} aria-hidden="true"
      style={{ flexShrink: 0, border: "2px solid var(--ink, #241a26)", imageRendering: "pixelated", display: "block", ...style }}>
      <rect x="0" y="0" width="150" height="100" fill={r.GRASS} />
      {/* the sea, where a realm runs down to the coast, with its beach */}
      {r.coast && <polygon points={coastOutline(r).map(([x, y]) => `${x * 150 / W},${y * 100 / H}`).join(" ")} fill={r.water?.deep || "#3a6a7c"} stroke="#dcc48e" strokeWidth="2.5" strokeLinejoin="round" />}
      {(r.rivers || []).map((rv, i) => (
        <polyline key={`rv${i}`} points={rv.pts.map(([c, row]) => `${c * 10 + 5},${row * 10 + 5}`).join(" ")}
          fill="none" stroke={r.water?.deep || "#3a6478"} strokeWidth={Math.max(4, (rv.w || 32) / 5)}
          strokeLinejoin="round" strokeLinecap="round" />
      ))}
      <polyline points={road} fill="none" stroke={r.PATH_EDGE} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={road} fill="none" stroke={r.PATH_MAIN} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      {(r.ponds || []).map((p, i) => (
        <rect key={i} x={(p.x - p.w / 2) * 150 / W} y={(p.y - p.h / 2) * 100 / H} width={p.w * 150 / W} height={p.h * 100 / H}
          fill={p.t === "lava" ? "#c05a32" : p.t === "ice" ? "#b8d4e0" : "#2c4638"} />
      ))}
      <circle cx={r.path[0][0] * 10 + 5} cy={r.path[0][1] * 10 + 5} r="4" fill="#e05248" />
      <rect x={end[0] * 10 - 1} y={end[1] * 10 - 1} width="12" height="12" fill="#d8b34a" />
    </svg>
  );
}
