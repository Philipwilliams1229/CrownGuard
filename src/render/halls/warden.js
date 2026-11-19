// ============ HALL: THE WARDEN MAGE ============
// A stepped stone altar where the warden stands, arms raised, blessings
// drifting down through the cold. Level two raises fluted pillars with
// candles, level three an open arch with a swinging censer. Then:
//   Rimecaller — the stone frosts over, icicles hang from the arch, drifts
//     of snow on the steps.
//     Absolute Zero: the arch shatters into a cluster of ice-crystal spires
//       rising behind the warden; the ground freezes white.
//     Permafrost Heart: a great heart of blue ice beats on a plinth at his
//       back, frost roots cracking out across the ground.
//   Lifebinder — the arch greens over with vines and flowers, warm light.
//     Guardian's Grace: a gilded arch, a great ward-shield hung behind him.
//     High Cathedral: a gothic wall with a stained-glass rose window, a
//       belfry with a swinging bell, a gilt spire.
// Never roofed: everything tall stands behind him or to either side.
//
// Baked layers: ground (un-inked), back (behind the warden), front (the
// arch's pillars and lintel, which frame him). Flames, the bell, the heart's
// beat, the ward's shimmer and the warden himself are live.

import { rgba, ball, glow } from "../buildkit.js";
import { getStats } from "../../engine/towers.js";
import { pxArc, pxRing } from "./pixrings.js";
import * as priestFig from "../pix/fig-priest.js";
import { crew, drawCrewPix, loopFrame, markOf } from "../pix/crews.js";
import * as supportHall from "../pix/hall-support.js";
import { hallPix, drawHallBack, drawHallFront, stampPix, pixSprite } from "../pix/halls.js";

// the warden (pix/fig-priest.js)
const PRIEST = crew("priest", priestFig);
const PIX_BACK = 0.5;

const ICE = "#a8e4f0", ICE_LT = "#e8fbff";

const archH = (t) => (t.rank4 ? 36 : 32);
// the Permafrost Heart's double pulse, 0..1 (the heart's size, its glow, its light on the ice)
const beatOf = (time, id) => {
  const ph = (time * 1.1 + id * 0.3) % 1;
  return ph < 0.12 ? ph / 0.12 : ph < 0.24 ? 1 - (ph - 0.12) / 0.12 : ph < 0.34 ? (ph - 0.24) / 0.1 * 0.6 : ph < 0.46 ? 0.6 - (ph - 0.34) / 0.12 * 0.6 : 0;
};
// a light's strength for the new building's overlays, stepped in fifths
const fifth = (v) => Math.round(Math.max(0, Math.min(1, v)) * 5) / 5;

export const drawSupportTower = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const st = getStats(t);
  const ice = !t.branch || t.branch === "a";
  const auraCol = r4 === "aa" ? "#b8f0f8" : r4 === "ab" ? "#8cd8f8" : r4 === "ba" ? "#e8d47a" : r4 === "bb" ? "#f0d060" : t.branch === "b" ? "#8ce08c" : ice ? "#7cd4d4" : "#c8e8f0";
  const canBake = typeof document !== "undefined";
  const grown = lvl >= 3 || !!t.branch;
  const v = t.id % 3;
  const ah = archH(t);
  const arch = grown && r4 !== "aa" && r4 !== "ab";

  // the aura shows itself only while it works: a pulse sweeping out
  const live = t._auraLive || 0;
  if (live > 0) {
    const pr = (time * 34 + t.id * 40) % st.range;
    pxArc(ctx, x, y, pr, pr * 0.55,   // the frost nova's angle (rings.js SQ), so the two rings lie on one ground
       rgba(auraCol, Math.min(0.8, (0.3 + Math.min(0.45, live * 0.08)) * (1.1 - pr / st.range))), { th: 3 });
  }
  // The building (pix/hall-support.js): its
  // BACK picture is the ground, the steps and everything tall behind the warden, its FRONT the
  // pillars and the arch. HK: how strongly each of its lights lies on the stone now. The rune
  // and the keystone's gem ("aura") burn low at rest and full while the aura works (eased with
  // the warden's own hand, a frame behind); the rest pulse as the old glows over them do.
  const H = canBake ? hallPix("support", supportHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, v) : null;
  const HK = !H ? null : {
    aura: fifth(0.4 + 0.6 * (t._blessW ?? (live > 0 ? 1 : 0))),
    heart: r4 === "ab" ? fifth(0.4 + 0.6 * beatOf(time, t.id)) : 0,
    rose: r4 === "bb" ? fifth(0.75 + 0.25 * Math.sin(time * 1.3 + t.id)) : 0,
    ward: r4 === "ba" ? fifth(0.57 + 0.43 * Math.sin(time * 2.2 + t.id)) : 0,
    spire: r4 === "aa" ? fifth(0.71 + 0.29 * Math.sin(time * 1.5 + t.id)) : 0,
    lamp: r4 === "aa" || r4 === "ab" ? fifth(0.71 + 0.29 * Math.sin(time * 2)) : 0,
  };
  if (H) drawHallBack(ctx, H, x, y, time, { id: t.id, k: HK });


  // ---- live things behind the warden
  if (r4 === "ab") {
    // the heart beats: a double pulse, a glow that swells with it
    const beat = beatOf(time, t.id);
    const hx = x, hy = y - 45;
    glow(ctx, hx, hy, 12 + beat * 6, "#6ad0f8", 0.35 + beat * 0.3);
    const hs = Math.round(beat * 3);                    // the new heart: four sizes of one sculpted piece
    if (H) stampPix(ctx, pixSprite(`wheart|${hs}`, () => supportHall.heart(hs)), hx, hy);
  }
  if (r4 === "bb") {
    // light through the rose window, and the bell swinging in the belfry
    glow(ctx, x, y - ah + 6, 10, "#f8e8a0", 0.3 + 0.1 * Math.sin(time * 1.3 + t.id));
    const sw = live > 0 ? Math.sin(time * 4 + t.id) * 0.5 : Math.sin(time * 1.2 + t.id) * 0.12;
    ctx.save(); ctx.translate(x, y - ah - 26); ctx.rotate(sw);
    ctx.fillStyle = "#d8b34a";
    ctx.beginPath(); ctx.moveTo(-1.2, 0); ctx.lineTo(1.2, 0); ctx.quadraticCurveTo(2.8, 2, 3.2, 5.5); ctx.lineTo(-3.2, 5.5); ctx.quadraticCurveTo(-2.8, 2, -1.2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f8e08a"; ctx.fillRect(-2, 1.5, 1, 3);
    ctx.fillStyle = "#8a6a2a"; ctx.fillRect(-3.2, 5, 6.4, 0.8);
    ctx.restore();
  }
  if (r4 === "ba") {
    const sh = 0.2 + 0.15 * Math.sin(time * 2.2 + t.id);
    glow(ctx, x, y - ah + 13, 14, "#f8e8a0", sh);
  }
  if (r4 === "aa") glow(ctx, x, y - 26, 14, "#c8f4ff", 0.25 + 0.1 * Math.sin(time * 1.5 + t.id));

  // the censer on its chain under the lintel, swinging BEHIND the warden:
  // it hangs at his mitre's height, so in front of him it crossed his brow
  // twice a swing. Now his head hides it as it passes and it shows either
  // side of him, rising as a pendulum does at the ends of its swing (the
  // lintel, stamped after him, covers the chain's top). Swung wide enough
  // that its ends clear his mitre, and in dark bronze so it never reads as
  // the gold of his mitre or of his staff's charm when it passes behind them.
  if (arch) {
    const lt = y - ah - 6, chain = 9;
    const a = Math.sin(time * 1.6 + t.id) * 1.1;
    const cx2 = x + Math.sin(a) * chain, cy2 = lt + 2 + Math.cos(a) * chain;
    ctx.strokeStyle = "#6c727e";
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x, lt + 2); ctx.lineTo(cx2, cy2); ctx.stroke();
    ball(ctx, cx2, cy2 + 2, 2.4, 2.2, "#a07a3a", { hi: 0.45, lo: 0.45 });
    for (let i = 0; i < 3; i++) {
      const py2 = cy2 - 1 - ((time * 12 + i * 6 + t.id * 3) % 14);
      glow(ctx, cx2 + Math.sin(time * 3 + i) * 2, py2, 1.6, "#d8e6f0", 0.5 - i * 0.12);
    }
  }

  // ---- the warden: a blessing now and then — the near hand leaves the
  // staff and rises open to head height through in-betweens, crests,
  // holds and comes down (folk-casters.js priestPose) — and while the aura
  // works he holds it up, the light pooled in his palm and in the charm of
  // his staff. `work` eases in and out (t._blessW, per hall) so the aura
  // starting or stopping never pops him between frames.
  const working = live > 0;
  let work = working ? 1 : 0;
  const lastAt = t._blessAt;
  if (lastAt != null && time > lastAt && time - lastAt < 0.5) work = Math.max(0, Math.min(1, (t._blessW ?? work) + (working ? 1 / 0.45 : -1 / 0.5) * (time - lastAt)));
  t._blessW = work; t._blessAt = time;
  const dir = Math.cos(t.lastAim || 0) >= 0 ? 1 : -1;   // at rest, still the way he last faced
  const py = y - 1;
  // The new sprites' warden, on the same clocks as priestPose: a blessing every five
  // seconds (up over 0.45 s, a crest at the top, held, lowered over 0.5 s; phased by id),
  // and `work` holds it up while the aura bites. `bless` frames 0-6 are how far the hand
  // is up (run backward to lower it), 7-9 the crest; `held` is the raised loop.
  let prec = null;
  if (t.noFolk) { /* no warden yet: nor his hands' light, nor his halo */ }
  else {
    const s = ((((time / 5 + t.id * 0.37) % 1) + 1) % 1) * 5;
    const v = Math.max(s < 0.45 ? s / 0.45 : s < 1.9 ? 1 : s < 2.4 ? 1 - (s - 1.9) / 0.5 : 0, work);
    let clip = "held", f = 0;
    if (v <= 0.02) { clip = "idle"; f = loopFrame(PRIEST, "idle", time, t.id); }
    else if (v < 1) { clip = "bless"; f = Math.round(v * 6); }
    else if (work < 1 && s >= 0.45 && s < 0.75) { clip = "bless"; f = Math.min(9, 7 + Math.floor(((s - 0.45) / 0.3) * 3)); }
    else f = loopFrame(PRIEST, "held", time, t.id);
    // (PIX_BACK: he stands half a unit back from the old spot, so his staff's charm and his raised
    // hand keep inside the arch's pillar, which is drawn over him)
    prec = drawCrewPix(ctx, PRIEST, x - dir * PIX_BACK, py, dir, clip, f, { variant: key, glow: working ? 1 : 0.7 });
  }
  // (the new figure marks its own palm, charm and head, and its frame's light.k is the pose's glow)
  const pm = (k) => { const m = markOf(prec, k, 1); return [m[0] - PIX_BACK, m[1]]; };
  const lt = prec ? { palm: pm("palm"), charm: pm("charm"), head: pm("head"), k: prec.light ? prec.light.k : 0 } : { palm: [0, 0], charm: [0, 0], head: [0, 0], k: 0 };
  if (lt.k > 0 && !t.noFolk) {
    const strong = working ? 1 : 0.6;
    glow(ctx, x + dir * lt.palm[0], py + lt.palm[1], (working ? 3.4 : 2.4) * Math.min(1, lt.k), auraCol, Math.min(0.9, (working ? 0.8 : 0.5) * lt.k));
    glow(ctx, x + dir * lt.charm[0], py + lt.charm[1], 2.2, auraCol, 0.45 * strong * Math.min(1, lt.k));
  }
  // halo, over his head (it lifts with him)
  if (grown && !t.noFolk) glow(ctx, x + dir * (lt.head[0] - 0.4), py - 30 + (lt.head[1] + 20.5) + Math.sin(time * 2 + t.id) * 1.2, 5, auraCol, 0.4);

  // ---- the arch and pillars, framing him
  if (H) drawHallFront(ctx, H, x, y, time, { id: t.id, k: HK });
  if (r4 === "aa" || r4 === "ab") for (const s of [-1, 1]) {
    // crystal lamps atop the ice pillars
    glow(ctx, x + s * 10, y - 19, 4, ICE, 0.5 + 0.2 * Math.sin(time * 2 + s));
  }
  // Absolute Zero: shards orbit and snow falls
  if (r4 === "aa") {
    for (let i = 0; i < 3; i++) {
      const ang = time * 1.6 + t.id + i * 2.09;
      const sx = x + Math.cos(ang) * 17, sy2 = y - 24 + Math.sin(ang) * 4;
      ctx.fillStyle = Math.sin(ang) >= 0 ? ICE_LT : ICE;
      ctx.beginPath(); ctx.moveTo(sx, sy2 - 3); ctx.lineTo(sx + 1.4, sy2); ctx.lineTo(sx, sy2 + 3); ctx.lineTo(sx - 1.4, sy2); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const fall = (time * 9 + i * 9 + t.id * 5) % 50;
      ctx.fillRect(x - 22 + i * 8.5 + Math.sin(time * 1.5 + i) * 2, y - 50 + fall, 1, 1);
    }
  }
  // Rimecaller: the floating shard
  if (t.branch === "a" && !t.rank4) {
    const hy = y - 36 + Math.sin(time * 2.5 + t.id) * 3;
    ctx.fillStyle = ICE;
    ctx.beginPath(); ctx.moveTo(x + 12, hy); ctx.lineTo(x + 14.5, hy + 4); ctx.lineTo(x + 12, hy + 9); ctx.lineTo(x + 9.5, hy + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ICE_LT; ctx.fillRect(x + 11.4, hy + 2.5, 1.2, 2.5);
  }
  // blessings drifting down inside the aura
  ctx.fillStyle = rgba(auraCol, 0.95);
  for (let i = 0; i < 3; i++) {
    const fall = (time * 22 + i * 15 + t.id * 5) % 40;
    const bx = x + (i === 0 ? -15 : i === 1 ? 16 : -3) + Math.sin(time * 2 + i) * 3;
    const by = y - 36 + fall;
    ctx.fillRect(bx - 2, by - 0.5, 4.5, 1.2); ctx.fillRect(bx - 0.4, by - 2, 1.2, 4.5);
  }
  // at rest a mote climbs off the altar and fades
  if (t._idle) {
    const cyc = ((time / 4) + t.id * 0.29) % 1;
    if (cyc < 0.6) glow(ctx, x + Math.sin(time * 1.3 + t.id) * 3, y - 26 - cyc * 20, 1.5, auraCol, 0.8 * (1 - cyc / 0.6));
  }
};
