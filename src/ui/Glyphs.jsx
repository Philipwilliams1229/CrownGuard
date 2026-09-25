// ============ GLYPHS ============
// Tiny pixel-art icons for the top bar, drawn as hard-edged SVG rects so they
// sit on the same blocky grid as the game's sprites.

import { StarIcon } from "./hud/icons.jsx";

const px = { shapeRendering: "crispEdges", display: "block", flexShrink: 0 };

// An open book — two cream pages either side of a gold spine.
export function BookIcon({ size = 14 }) {
  const h = Math.round((size * 12) / 14);
  return (
    <svg width={size} height={h} viewBox="0 0 14 12" style={px} aria-hidden="true">
      <rect x="0" y="1" width="6" height="10" fill="#e8e0c8" />
      <rect x="8" y="1" width="6" height="10" fill="#e8e0c8" />
      <rect x="6" y="0" width="2" height="12" fill="#d8b34a" />
      {[3, 5, 7].map((y) => (
        <g key={y}>
          <rect x="1" y={y} width="4" height="1" fill="#8a8474" />
          <rect x="9" y={y} width="4" height="1" fill="#8a8474" />
        </g>
      ))}
    </svg>
  );
}

// The knights' rally pennant — a red flag on a wooden pole.
export function FlagIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" style={px} aria-hidden="true">
      <rect x="2" y="0" width="2" height="12" fill="#6b5a3c" />
      <rect x="4" y="1" width="6" height="1" fill="#e0574c" />
      <rect x="4" y="2" width="5" height="1" fill="#d0463c" />
      <rect x="4" y="3" width="4" height="1" fill="#d0463c" />
      <rect x="4" y="4" width="3" height="1" fill="#b23a32" />
      <rect x="4" y="5" width="2" height="1" fill="#b23a32" />
    </svg>
  );
}

// The campaign star lives with the HUD's icons now (hud/icons.jsx): one
// star everywhere, the victory card, the map card and the War Council alike.
export function Star({ size = 16, lit = true }) {
  return <StarIcon size={size} lit={lit} />;
}

// The universal two-bar pause mark.
export function PauseIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" style={px} aria-hidden="true">
      <rect x="2" y="1" width="3" height="10" fill="#e8e0c8" />
      <rect x="7" y="1" width="3" height="10" fill="#e8e0c8" />
    </svg>
  );
}
