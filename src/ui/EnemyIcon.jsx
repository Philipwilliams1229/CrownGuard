// ============ EnemyIcon ============
// Draws an enemy's pixel sprite (first frame) as a small icon, used in the
// next-wave preview. Renders at the sprite's natural pixel size and scales it
// down with CSS (smoothing off) so it stays crisp and fits a target box.

import { useRef, useEffect } from "react";
import { SPRITES, drawSprite } from "../sprites/sprites.js";

export default function EnemyIcon({ type, box = 26 }) {
  const ref = useRef(null);
  const spr = SPRITES[type];
  const map = spr.frames[0];
  // one cell is `px` world pixels — hi-res sprites use 1, the coarse ones 2
  const px = spr.px || 2;
  const w = map[0].length * px;
  const h = map.length * px;
  const scale = box / Math.max(w, h);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    drawSprite(ctx, spr, spr.pal, 0, w / 2, h / 2, false);
  }, [type, w, h, spr]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{ width: w * scale, height: h * scale, imageRendering: "pixelated", flexShrink: 0 }}
    />
  );
}
