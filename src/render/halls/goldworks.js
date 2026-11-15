// ============ HALL: THE GOLD WORKS ============
// A squat stone counting-house with a working furnace mouth and a chimney
// that smokes gold, the clerk out front with his ledger. It GROWS: a plain
// slate-lipped furnace hut with a strongbox at one, a tiled roof, a taller
// chimney and a hanging coin sign at two, a gabled house with a gilt finial
// and a barrow of ore at three; the takings stack up beside it all the way.
//   The Royal Mint dresses in pale stone and royal blue and sets a screw
// press at the door: the Dragon's Hoard heaps its gold into a mound with a
// small red dragon asleep on top; the Philosopher's Stone floats a red stone
// over a pedestal inside a gilded circle.
//   The Transmuter greens its roof in copper, keeps an alembic bubbling and
// sends out an alchemist who throws acid: the Midas Cannon mounts a gilded
// gun beside him; Lead to Gold lays a glowing circle round a smoking vat
// and a stack of ingots turning from lead to gold.
//
// Pixel art: the house is baked per form; the alchemist and clerk are baked
// frames; smoke, glints, bubbles and the floating stone are live.

import { canBake } from "../buildkit.js";
import { readiness, glint, rgba, soft, shadow, glow } from "./kitB.js";
import { getStats } from "../../engine/towers.js";
import * as standerFig from "../pix/fig-stander.js";
import * as bomberFig from "../pix/fig-bomber.js";
import { crew, drawCrewPix, fracFrame, loopFrame, shotFrame, markOf, crewMark } from "../pix/crews.js";
import * as goldHall from "../pix/hall-goldworks.js";
import { hallPix, drawHallBack, drawHallFront, stampPix, pixSprite } from "../pix/halls.js";

// the clerk (pix/fig-stander.js, the "clerk" look)
const CLERK = crew("stander", standerFig);
// the alchemist is the Powder Works' bombardier in another look (the same name: one frame cache)
const ALCH = crew("bomber", bomberFig);
const coinAt = (ctx, cx, cy, time) => {
  ctx.fillStyle = "#241a26"; ctx.fillRect(cx - 1.4, cy - 1.1, 2.8, 2.2);
  ctx.fillStyle = Math.sin(time * 20) > 0 ? "#f8e08a" : "#b08a3a"; ctx.fillRect(cx - 0.9, cy - 0.6, 1.8, 1.2);
};

const cycOf = (v, p) => (((v / p) % 1) + 1) % 1;

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const mint = t.branch === "a", alch = t.branch === "b";
  return { lvl, r4, mint, alch, bh: 14 + lvl * 3 };
};

// The house stands on a footing whose front edge is at y + 4 (LIFT above
// the old line), so everything set out in front of it — takings, the
// strongbox, the press, the vat, the crew — stands on open ground with its
// foot clearly below that edge.
const LIFT = 4;

// Where the crew stands (feet).
const crewSpot = (t, x, y) => {
  const { r4, mint, alch } = spec(t);
  if (alch) return r4 ? [x - 1, y + 8.5] : [x + 11, y + 8];
  if (r4 === "aa") return [x + 7, y + 8];
  if (mint) return [x + 2, y + 9.5];
  return [x + 11, y + 7];
};


export const drawGoldworks = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const { lvl, r4, alch, bh } = spec(t);
  const hx = x - 3, hw = 10 + (lvl >= 3 ? 1 : 0);
  const bake = canBake();
  const r = readiness(t), anim = t.anim || 0;
  if (r4 === "bb") glow(ctx, x, y + 4, 22, "#e8c14a", 0.12 + 0.05 * Math.sin(time * 2 + t.id));
  // ---- the building (render/pix/hall-goldworks.js): its BACK picture
  // here (the house, the trade's still parts, what stands behind the crew's feet), its FRONT after
  // the crew. It brings its own ground shadow, pennant, furnace flame and the furnace's light on
  // the wall, so the old house, glow and pennant stand down; the smoke, glints, bubbles, the
  // floating stone, the gun's recoil, the crew and their coins are painted here as before.
  const br = 0.6 + 0.4 * Math.sin(time * 2.2 + t.id);   // the furnace breathes
  const H = bake ? hallPix("goldworks", goldHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, t.id % 3) : null;
  const HK = H ? { id: t.id, k: { furnace: 0.45 + 0.55 * br, stone: 0.75 + 0.25 * Math.sin(time * 3), vat: 0.8 + 0.2 * Math.sin(time * 2 + t.id) } } : null;
  if (H) drawHallBack(ctx, H, x, y, time, HK);
  // gold-fleck smoke from the chimney
  const cx = hx + hw - 2, ctop = y - LIFT - bh - 14 - lvl * 2;
  for (let i = 0; i < 3; i++) {
    const t2 = (time * 9 + i * 7 + t.id * 3) % 22;
    soft(ctx, cx + Math.sin(time * 1.5 + i) * 2, ctop - 2 - t2, 2 + t2 / 8, 2 + t2 / 8, [[0, `rgba(200,196,180,${Math.max(0, 0.4 - t2 * 0.018)})`], [1, "rgba(200,196,180,0)"]]);
    if (i === 1 && t2 < 12) glint(ctx, cx + 1, ctop - 4 - t2, 0.6, 0.9);
  }
  // glints on the takings
  if (!r4 && Math.sin(time * 1.7 + t.id) > 0.9) glint(ctx, x - 7.5, y + 3, 1, 0.9);
  if (r4 === "aa") {
    if (Math.sin(time * 2.3 + t.id) > 0.8) glint(ctx, x - 5, y - 1, 1, 0.9);
    // the dragon snores smoke
    const k = (time * 0.5 + t.id * 0.2) % 1;
    soft(ctx, x - 17 - k * 3, y - 9 - k * 8, 1.4 + k * 2, 1.4 + k * 2, [[0, `rgba(210,200,190,${0.5 * (1 - k)})`], [1, "rgba(210,200,190,0)"]]);
  }
  if (r4 === "ab") {
    const sy = y - 9.5 + Math.sin(time * 2 + t.id) * 1.6;
    glow(ctx, x + 11, sy, 8, "#e04070", 0.35 + 0.1 * Math.sin(time * 3));
    if (H) stampPix(ctx, pixSprite("goldworks|stone", goldHall.stone), x + 11, Math.round(sy * 2) / 2);   // whole art pixels, or its edges swim
    for (let i = 0; i < 3; i++) { const a = time * 1.8 + (i / 3) * Math.PI * 2; glint(ctx, x + 11 + Math.cos(a) * 6, sy + Math.sin(a) * 2, 0.5, 0.8); }
  }
  if (alch) {
    if (H) stampPix(ctx, pixSprite("goldworks|alembic", goldHall.alembic), x, y);
  }
  if (alch) { const bub = (time * 3 + t.id) % 1; glow(ctx, x - 12, y - 6.5 - bub * 6, 1.4, "#c8f0d8", 1 - bub); }
  if (r4 === "bb") {
    const bub = (time * 2 + t.id) % 1;
    for (let i = 0; i < 2; i++) soft(ctx, x + 10 + (i - 0.5) * 4, y - 3 - ((bub + i * 0.5) % 1) * 12, 2.5, 2.5, [[0, "rgba(200,220,150,0.4)"], [1, "rgba(200,220,150,0)"]]);
    if (Math.sin(time * 2.1 + t.id) > 0.85) glint(ctx, x + 2, y + 9.5, 0.9, 0.9);
  }
  if (r4 === "ba") {
    // the gilded gun: it kicks back on the shot
    const kick = anim > 0.5 ? 2 : anim > 0.2 ? 1 : 0;
    if (H) stampPix(ctx, pixSprite("goldworks|gun", goldHall.gun), x + 7 - kick, y - 2);   // the new barrel, the old anchor and kick
    if (anim > 0.4) { soft(ctx, x + 22, y - 6, 4 + (1 - anim) * 5, 3 + (1 - anim) * 4, [[0, `rgba(240,230,210,${anim * 0.8})`], [1, "rgba(240,230,210,0)"]]); glow(ctx, x + 21, y - 5.5, 3, "#f8d870", anim); }
    if (Math.sin(time * 1.4 + t.id) > 0.92) glint(ctx, x + 15, y - 5, 0.9, 0.9);
  }
  // ---- the crew (none under noFolk: the clerk or alchemist, and what he holds)
  if (t.noFolk) {
    // the build puts him in last
  } else if (alch) {
    // the alchemist: the vial at his belt while the next one steeps, then the
    // throw (bomberFrame: swung back, cocked behind his head, whipped over,
    // let go, followed through, a fresh vial from his belt); the flask is in
    // his sprite, only its glow is live and rides on his hand
    const clock = time + t.id * 0.71;
    const rate = getStats(t).rate || 1300;
    const [ax, ay] = crewSpot(t, x, y);
    {
      // the alchemist (fig-bomber.js, the "alch" look): the throw lands on the shot clock;
      // a lab's bare t.anim (4/s) stands in when cd is 0. The flask's glow rides his `bomb` mark.
      const until = t.cd > 0 ? t.cd : (t.anim || 0) > 0 ? rate - ((1 - t.anim) / 4) * 1000 : 0;
      const clip = t._idle ? "idle" : "throw";
      const rec = drawCrewPix(ctx, ALCH, ax, ay, -1, clip, t._idle ? loopFrame(ALCH, "idle", clock, t.id) : shotFrame(ALCH, "throw", until, rate), { variant: "alch" });
      const ch = markOf(rec, "bomb", -1);   // the flask's centre; null once it has left his hand
      if (ch) {
        const hot = clip === "throw" && rec.ph > 0.2 && rec.ph < 0.5;   // swung back and cocked
        glow(ctx, ax + ch[0], ay + ch[1], hot ? 4 : 2.6, "#8ad0a0", hot ? 0.5 + 0.2 * Math.sin(time * 10) : 0.25 + 0.1 * Math.sin(time * 3 + t.id));
      }
    }
  } else {
    // the clerk at the door. His round, phased by t.id: he thumbs a
    // coin up off his hand and catches it (`flip`), takes the quill from his beret and
    // enters it in the ledger (`write`), then stands easy over the book (`idle`). When the
    // works pays out (the engine adds to t.paidTotal as a wave is held) a coin is tossed to
    // him from the furnace mouth and he throws a hand up to catch it (`pay`, its `hit` the
    // catch). The ledger and quill are in the figure; only the coins are live.
    const [kx, ky] = crewSpot(t, x, y);
    shadow(ctx, kx - 1, ky + 0.4, 5, 1.8, 0.3);
    const paid = t.paidTotal || 0;
    if (t._paidSeen == null || paid < t._paidSeen) t._paidSeen = paid;
    else if (paid > t._paidSeen) { t._paidSeen = paid; t._payAt = time; }
    const PAY = CLERK.CLIPS.pay, payPh = t._payAt != null ? ((time - t._payAt) * 1000) / PAY.ms : -1;
    let clip = "idle", ph = 0;
    if (payPh >= 0 && payPh < 1) { clip = "pay"; ph = payPh; }
    else {
      const u = cycOf(time / 9.6 + t.id * 0.37, 1);
      if (u < 0.25) { clip = "flip"; ph = u / 0.25; }
      else if (u < 0.6) { clip = "write"; ph = (u - 0.25) / 0.35; }
      else ph = (((u - 0.6) / 0.4) * 2) % 1;   // two breaths, from and back to the pose every clip starts at
    }
    const n = CLERK.CLIPS[clip].n;
    const f = clip === "idle" ? Math.floor(ph * n) % n : fracFrame(CLERK, clip, ph);
    drawCrewPix(ctx, CLERK, kx, ky, -1, clip, f, { variant: "clerk" });
    if (clip === "flip" && ph > standerFig.FLIP_UP && ph < standerFig.FLIP_DOWN) {
      // the coin: up off his thumb, turning, down into the hand again
      const [mx, my] = crewMark(CLERK, "flip", fracFrame(CLERK, "flip", 0.5), "coin", -1, "clerk");
      const k = (ph - standerFig.FLIP_UP) / (standerFig.FLIP_DOWN - standerFig.FLIP_UP);
      coinAt(ctx, kx + mx - 0.6 * Math.sin(k * Math.PI), ky + my - Math.sin(k * Math.PI) * 9, time);
    } else if (clip === "pay") {
      const hitF = Math.round(PAY.hit * (PAY.n - 1)), [mx, my] = crewMark(CLERK, "pay", hitF, "coin", -1, "clerk");
      if (ph < PAY.hit) {
        // the works' coin, tossed from the furnace mouth (from the top of the hoard, which has buried it)
        const k = ph / PAY.hit, sx = r4 === "aa" ? x - 7 : hx - 3.5, sy = r4 === "aa" ? y - 9 : y - LIFT - 2;
        coinAt(ctx, sx + (kx + mx - sx) * k, sy + (ky + my - sy) * k - Math.sin(k * Math.PI) * 11, time);
      } else if (ph < PAY.hit + 0.22) {
        const [gx, gy] = crewMark(CLERK, "pay", f, "coin", -1, "clerk");
        glint(ctx, kx + gx, ky + gy, 1, 1 - (ph - PAY.hit) / 0.22);
      }
    }
  }
  // the takings and wares that stand in front of him
  if (H) drawHallFront(ctx, H, x, y, time, HK);

};
