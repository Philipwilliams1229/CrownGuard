// ============ THE TRAPSMITH'S WORK ============
// Everything the trapsmith lays on the road, drawn flush with it, under the
// crowd: road spikes, bear-iron jaws, caltrop beds, pressure mines, and the
// aerostat's tethered balloon bombs. Called by draw.js once per frame.

import { ball as pip, glow as glowFx, shadow as softShadow } from "./paint.js";

export const drawTraps = (ctx, g) => {
if (g.traps) {
  for (const tr of g.traps) {
    const tx = tr.x, ty = tr.y;
    const kind = tr.kind || (tr.sky ? "balloon" : tr.branch === "b" ? "mine" : "jaws");
    if (kind === "balloon") {
      const by = ty - 13 + Math.sin(g.time * 2 + tr.x) * 1.5;
      softShadow(ctx, tx, ty + 1, 3, 1.2, 0.25);
      ctx.strokeStyle = "rgba(16,19,26,0.7)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, by + 4); ctx.stroke();
      pip(ctx, tx, by, 3.2, 3.6, "#c05848", { hi: 0.5, lo: 0.45 });
      pip(ctx, tx, by + 4.5, 1.6, 1.4, "#3a3028", { hi: 0.3, lo: 0.4 });
      glowFx(ctx, tx + 0.6, by + 4.5, 1.2, Math.sin(g.time * 6 + tr.x) > 0 ? "#e05248" : "#7d2f1a", 0.9);
    } else if (kind === "spike") {
      ctx.fillStyle = "#6c727e"; ctx.fillRect(tx - 7, ty - 0.5, 14, 2.4);
      ctx.fillStyle = "#c4c8d0";
      for (let i2 = 0; i2 < 5; i2++) { const sx = tx - 6 + i2 * 3; ctx.beginPath(); ctx.moveTo(sx - 0.8, ty); ctx.lineTo(sx, ty - 3.5); ctx.lineTo(sx + 0.8, ty); ctx.closePath(); ctx.fill(); }
    } else if (kind === "caltrop") {
      for (let i2 = 0; i2 < 4; i2++) {
        const cx2 = tx - 5 + ((i2 * 7) % 11), cy2 = ty - 2 + ((i2 * 5) % 6);
        ctx.strokeStyle = "#8a8f9a"; ctx.lineWidth = 0.9; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx2 - 2, cy2 + 1); ctx.lineTo(cx2 + 2, cy2 + 1); ctx.moveTo(cx2, cy2 + 1); ctx.lineTo(cx2, cy2 - 2.4); ctx.moveTo(cx2, cy2 + 1); ctx.lineTo(cx2 + 1.4, cy2 + 2.4); ctx.stroke();
      }
    } else if (kind === "mine") {
      pip(ctx, tx, ty, 5.5, 4, "#5f636d", { hi: 0.45, lo: 0.5 });
      glowFx(ctx, tx, ty - 0.5, 1.2, Math.sin(g.time * 6 + tr.x) > 0 ? "#e05248" : "#7d2f1a", 0.9);
    } else {
      // bear-iron: open jaws, teeth up
      ctx.fillStyle = "#6c727e"; ctx.fillRect(tx - 8, ty - 1, 16, 3.4);
      ctx.fillStyle = "#b8bcc4";
      for (let i2 = 0; i2 < 4; i2++) { const sx = tx - 6.5 + i2 * 4; ctx.beginPath(); ctx.moveTo(sx - 1, ty - 1); ctx.lineTo(sx, ty - 3.5); ctx.lineTo(sx + 1, ty - 1); ctx.closePath(); ctx.fill(); }
      pip(ctx, tx, ty + 0.5, 2, 1.4, "#3a3e48", { hi: 0.3, lo: 0.4 });
    }
  }
}
};
