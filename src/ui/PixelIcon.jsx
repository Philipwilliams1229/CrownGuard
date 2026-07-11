// ============ PixelIcon ============
// A tiny canvas that draws a tower's figure from the game's own sprite data,
// used as the icon in the build menu and tower panels.

import { useRef, useEffect } from "react";
import {
  SPRITES, MINI, drawSprite,
  KNIGHT_PALS, ARCHER_PALS, WIZ_PALS, PRIEST_PALS, CATAPULT_PALS,
} from "../sprites/sprites.js";

export default function PixelIcon({ kind, branch = null, size = 30 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    let spr, pal;
    if (kind === "knight") { spr = SPRITES.knight; pal = branch === "a" ? KNIGHT_PALS.paladin : branch === "b" ? KNIGHT_PALS.berserk : KNIGHT_PALS.base; }
    else if (kind === "archer") { spr = MINI.archer; pal = ARCHER_PALS[branch || "base"]; }
    else if (kind === "wizard") { spr = MINI.wizard; pal = WIZ_PALS[branch || "base"]; }
    else if (kind === "catapult") { spr = MINI.catapult; pal = CATAPULT_PALS[branch || "base"]; }
    else { spr = MINI.priest; pal = PRIEST_PALS[branch || "base"]; }
    drawSprite(ctx, spr, pal, 0, size / 2, size / 2 + 1, false);
  }, [kind, branch, size]);
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, imageRendering: "pixelated", flexShrink: 0 }} />;
}
