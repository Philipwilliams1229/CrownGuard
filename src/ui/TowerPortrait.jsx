// ============ TowerPortrait ============
// A menu picture of a hall as it will REALLY stand on the board — the same
// paint routine the battlefield uses, shrunk into a tile. The little MINI
// icons can't tell a Dragon's Hoard from a plain mint (they share one sprite),
// and in the Master Builds menu, where every card IS a different final, that
// made four distinct purchases look like one. So the menu draws the tower.

import { useRef, useEffect } from "react";
import { drawTowerPortrait } from "../render/towers.js";
import PixelIcon from "./PixelIcon.jsx";

export default function TowerPortrait({ kind, branch = null, rank4 = null, size = 44 }) {
  const ref = useRef(null);
  const failed = useRef(false);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    // drawn at double density so the new smooth carpentry stays crisp
    const dpr = 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, size * dpr, size * dpr);
    // A hall occupies roughly 60px of height around its anchor, most of it
    // above; sit the footing low in the tile and scale the rest to fit.
    const scale = (size / 76) * dpr;
    ctx.save();
    ctx.translate((size / 2) * dpr, size * 0.84 * dpr);
    ctx.scale(scale, scale);
    // a stand-in tower, fully grown, holding every field a painter may read
    const t = {
      id: 7, kind, x: 0, y: 0, level: 3, branch, rank4,
      cd: 0, aim: "first", lastAim: -Math.PI / 2, anim: 0, shotIdx: 0, critIdx: 0,
      invested: 0, units: [], rally: { x: 0, y: 26 },
      charges: 2, chargeCd: 0, layCd: 0, ramp: 1, beamId: null, eagle: null,
      mintBonus: 0, paidTotal: 0, kills: 0, dmgOut: 0, liveTime: 1, _idle: true, _auraLive: 0,
    };
    try {
      drawTowerPortrait(ctx, t, 1.4);
    } catch {
      failed.current = true;   // fall back to the flat icon below
    }
    ctx.restore();
  }, [kind, branch, rank4, size]);

  if (failed.current) return <PixelIcon kind={kind} branch={branch} rank4={rank4} size={size} />;
  return (
    <canvas ref={ref} width={size * 2} height={size * 2}
      style={{ width: size, height: size, flexShrink: 0 }} />
  );
}
