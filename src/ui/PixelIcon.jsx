// ============ PixelIcon ============
// A tiny canvas that draws a tower's figure from the game's own sprite data,
// used as the icon in the build menu and tower panels.

import { useRef, useEffect } from "react";
import {
  SPRITES, MINI, drawSprite,
  KNIGHT_PALS, ARCHER_PALS, WIZ_PALS, PRIEST_PALS, CATAPULT_PALS, BALLISTA_PAL, SPIKER_PALS,
} from "../sprites/sprites.js";

export default function PixelIcon({ kind, branch = null, rank4 = null, size = 30 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const r4 = branch && rank4 ? branch + rank4 : null;
    let spr, pal;
    if (kind === "archer" && r4 === "ba") { spr = MINI.ballista; pal = BALLISTA_PAL; }
    else if (kind === "knight") { spr = SPRITES.knight; pal = r4 === "aa" ? KNIGHT_PALS.champion : branch === "a" ? KNIGHT_PALS.paladin : branch === "b" ? KNIGHT_PALS.berserk : KNIGHT_PALS.base; }
    else if (kind === "archer") { spr = MINI.archer; pal = ARCHER_PALS[r4 && ARCHER_PALS[r4] ? r4 : branch || "base"]; }
    else if (kind === "wizard") { spr = MINI.wizard; pal = WIZ_PALS[r4 && WIZ_PALS[r4] ? r4 : branch || "base"]; }
    else if (kind === "catapult") { spr = MINI.catapult; pal = CATAPULT_PALS[branch || "base"]; }
    else if (kind === "spiker") { spr = MINI.spiker; pal = SPIKER_PALS[r4 && SPIKER_PALS[r4] ? r4 : branch || "base"]; }
    else if (kind === "goldworks") { spr = MINI.goldworks; pal = MINI.goldworks.pal; }
    else if (kind === "trapsmith") { spr = MINI.trapsmith; pal = MINI.trapsmith.pal; }
 if (kind === "assassin") { spr = MINI.assassin; pal = MINI.assassin.pal; }
    else if (kind === "falconry") { spr = MINI.falconry; pal = MINI.falconry.pal; }
    else if (kind === "sunforge") { spr = MINI.sunforge; pal = MINI.sunforge.pal; }
    else { spr = MINI.priest; pal = PRIEST_PALS[r4 && PRIEST_PALS[r4] ? r4 : branch || "base"]; }
    drawSprite(ctx, spr, pal, 0, size / 2, size / 2 + 1, false);
  }, [kind, branch, rank4, size]);
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, imageRendering: "pixelated", flexShrink: 0 }} />;
}
