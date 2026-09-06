// ============ EnemyIcon ============
// Draws an enemy's first walk frame as a small icon, used in the wave
// preview and the field guide. Rigged foes come from the baked rig; the few
// still on pixel maps draw those.

import { useRef, useEffect } from "react";
import { SPRITES, drawSprite } from "../sprites/sprites.js";
import { hasRig, rigDef, rigFrame } from "../render/rigs.js";
import { PX } from "../render/paint.js";

export default function EnemyIcon({ type, box = 26 }) {
  const ref = useRef(null);
  const rigged = hasRig(type);
  const spr = rigged ? null : SPRITES[type];
  let w, h;
  if (rigged) { const b = rigDef(type).box; w = b.hw * 2; h = b.up + b.down; }
  else { const map = spr.frames[0]; const px = spr.px || 2; w = map[0].length * px; h = map.length * px; }
  const scale = box / Math.max(w, h);
  const dens = rigged ? PX : 1;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w * dens, h * dens);
    if (rigged) ctx.drawImage(rigFrame(type, "walk", 0).cv, 0, 0);
    else drawSprite(ctx, spr, spr.pal, 0, w / 2, h / 2, false);
  }, [type, w, h, spr, rigged, dens]);

  return (
    <canvas
      ref={ref}
      width={w * dens}
      height={h * dens}
      style={{ width: w * scale, height: h * scale, imageRendering: "pixelated", flexShrink: 0 }}
    />
  );
}
