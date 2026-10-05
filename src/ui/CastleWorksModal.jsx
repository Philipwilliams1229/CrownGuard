// ============ CASTLE WORKS BOX ============
// The crown's castle works in a framed box over a dimmed screen: bought from
// the treasury between levels. Shared by the home screen and the campaign map,
// so both show the same box. The box's head (title and X) stays put while the
// works scroll beneath it; a tap on the dark around it closes it too. On a
// phone on its side the box goes wide and the works stand two abreast.
// Render it OUTSIDE any <Fit> (a fixed box inside a transform pins to it).

import CastleWorksList from "./CastleWorks.jsx";
import { CastleIcon } from "./hud/icons.jsx";
import { woodBtn, frame } from "./frames.js";
import { panel } from "./theme.js";
import { loadCastle } from "../data/campaign.js";

const safePad = (t, r, b, l) =>
  `max(env(safe-area-inset-top), ${t}px) max(env(safe-area-inset-right), ${r}px) max(env(safe-area-inset-bottom), ${b}px) max(env(safe-area-inset-left), ${l}px)`;

export default function CastleWorksModal({ treasury, short, onBuy, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(12,12,16,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: safePad(10, 12, 10, 12), boxSizing: "border-box" }}
      onClick={onClose}>
      <div style={{ ...panel, ...frame, width: "100%", maxWidth: short ? 620 : 380, maxHeight: "100%", display: "flex", flexDirection: "column", padding: short ? "10px 12px 12px" : 16, boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.75, flex: 1, display: "flex", alignItems: "center", gap: 6 }}><CastleIcon size={14} /> CASTLE WORKS</span>
          <button aria-label="Close" style={{ ...woodBtn, padding: "0 14px", fontSize: 13, flexShrink: 0 }} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", touchAction: "pan-y", scrollbarWidth: "thin" }}>
          <CastleWorksList
            works={loadCastle("crown")}
            purse={treasury || 0}
            purseLabel="THE CROWN'S TREASURY"
            note="Every level you hold sends its leftover gold home. Spend it here on the crown's castle: what you build stands at every level, in every realm."
            onBuy={onBuy} />
        </div>
      </div>
    </div>
  );
}
