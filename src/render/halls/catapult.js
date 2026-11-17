// ============ HALL: THE CATAPULT ============
// A siege engine on a wheeled bed, seen side-on in the 3/4 light. The
// mangonel's arm is winched down by the engineer at the back, a stone set in
// its cup, and when it looses it slams up into the padded stop. It GROWS:
// a rope-lashed field engine with plank wheels at one, iron-shod at two, a
// full carriage with a crate of dressed shot at three.
//   The Trebuchet stands twice as tall: a trestle, a counterweight box, a
// long arm with a sling that whips over the top. The Earthshaker hangs a
// carved granite block on it and cracks the ground; the Comet Sling chars
// its timbers over a pitch cauldron and flings its stone alight.
//   The Log Roller stops throwing: a sloped ramp and a great trimmed log,
// end-on, held by a chock the engineer knocks out with a lever. The Iron
// Drum rolls an iron-banded drum; the Powder Keg Run straps kegs to it.
//
// Pixel art: the ground, the back of the engine and its near frame are
// baked per form and facing; the arm is baked at quantised angles, so it
// swings in crisp steps; stones, sling and fire are stamped or painted live.

import { canBake } from "../buildkit.js";
import { ROPE, readiness, rope, rgba, soft, shadow, ball, glow } from "./kitB.js";
import { getStats } from "../../engine/towers.js";
import { pxArc, pxRing } from "./pixrings.js";
import * as engineerFig from "../pix/fig-engineer.js";
import { crew, drawCrewPix, loopFrame, fracFrame, markOf, crewMark } from "../pix/crews.js";
import * as catHall from "../pix/hall-catapult.js";
import { hallPix, drawHallBack, drawHallFront, stampPix, pixSprite } from "../pix/halls.js";

// the machine: pix/hall-catapult.js, built round `spec` below. The hall
// asks for the GAME's cut of it: only what stands still, in two pictures (behind and over the
// arm or the log), no ground pad (stamped here on its own, so the bed can hop without it).
const CAT_GAME = { BOX: catHall.BOX, build: (o) => catHall.build({ ...o, game: true }) };
const CAT_WEST = { BOX: catHall.BOX, build: (o) => catHall.build({ ...o, game: true, west: true }) };   // facing west: its flag flies west

// the engineer: fig-engineer.js. Its winch clips ride WINCH's
// circle and its lever clips hold LEVER's end (the same numbers, in art pixels).
const ENG = crew("engineer", engineerFig);

const D2R = Math.PI / 180;
// the winch drum's height above the hall's y (the engineer's hands are here)
const WINCH_DY = 7;
// the engineer's feet: on the open ground in front of the near wheel
const CREW_DY = 7;
// from his feet (facing the engine): the winch's axle and the handle's throw,
// and the Log Roller's lever end (3 higher once it has knocked the chock out)
const LEVER = [5.5, -13];
// where the winch (and trigger) rope takes the arm, a share of its length
// from the pivot: near enough in that the rope leans toward the engine
const ROPE_AT = 0.4;

// The numbers of one form's engine: where the arm pivots, how long it is,
// and the angles it rests, cocks and stops at (degrees from straight up,
// positive toward the target). The engineer's head stands on the arc the
// arm's end sweeps (about -116° from the pivot, and no room in the
// footprint to step him off it), so the arm cocks ABOVE him: the mangonel's
// winched back to lie a little over level, its cup (and the stone in it)
// clear over his cap; the trebuchet's tip stops short of his cap's back.
// The stop sets where the stone leaves (update.js reads the same tip).
const spec = (t) => {
  const lvl = t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const hw = 10.5 + lvl * 0.5 + (t.branch ? 0.5 : 0);   // the bed's half-length: it must keep off the road
  if (t.branch === "a") return { hw, treb: true, px: 3, fh: 34, L: 26, butt: 8, cocked: -102, stop: 48, rest: 0, key: r4 || "a" };
  if (t.branch === "b") return { hw, roller: true, key: r4 || "b" };
  return { hw, px: 3, fh: 20 + lvl, L: 16 + lvl, butt: 3, cocked: lvl === 1 ? -66 : -72, stop: 40, rest: 40, key: "l" + lvl };
};

// ---- the ground it stands on ----------------------------------------------
// ---- the Log Roller's ramp ---------------------------------------------------
// The bed is a sloped plank ramp running down toward the field, deep enough
// to hold a log end-on; the log waits at the top behind a chock.
const RAMP = (x, y, f, hw) => ({ ax: x - f * (hw - 3), ay: y - 15, bx: x + f * (hw + 1), by: y - 1, d: 11, sk: -f * 3 });
const rampY = (R, px) => R.ay + ((px - R.ax) / (R.bx - R.ax)) * (R.by - R.ay);
const logSpot = (t, x, y, f, s) => {
  const R = RAMP(x, y, f, s.hw), rr = t.rank4 === "a" ? 7.4 : 7;
  const lx = R.ax + f * 9;
  return { lx, ly: rampY(R, lx) - R.d * 0.35 - rr * 0.8, rr, R };
};

// Which clip and frame he is in, from the same clocks the engine's picture runs on:
// t.cd (ms to the next shot), the form's rate, t.anim, readiness r.
//   The mangonel / trebuchet: the shot lands on `winchLoose`'s hit frame (he knocks the
// handle back, is thrown upright, watches the stone go); then he winds (`winch`: a turn
// is 8 frames, picked by the old crank phase) until the arm is down (r 0.8); then he
// stands on the handle (`winchIdle`) and, as the shot comes due, braces on it and waits.
//   The Log Roller: `heave` lands on the roll; he stands on the raised lever (`leverUp`)
// while the ramp is empty, leans it down as the chock is set (`reset`, at r 0.55), stands
// on it (`lever`) and crouches over it as the roll comes due.
//   At ease: `winchIdle` / `lever`, and at the winch two raps on a peg now and then.
const frac = (v) => v - Math.floor(v);
const shotPart = (clip, cd, since) => {
  const c = ENG.CLIPS[clip], n1 = c.n - 1, hitF = Math.round(c.hit * n1), pre = c.hit * c.ms, post = (1 - c.hit) * c.ms;
  if (since < post) return { clip, f: Math.min(n1, hitF + Math.round((n1 - hitF) * (since / post))) };   // the release and its follow-through
  if (cd <= pre) return { clip, f: Math.max(0, Math.round((hitF - 1) * (1 - cd / pre))) };                // braced, waiting
  return null;
};
const engineerNow = (t, time, s, r, anim) => {
  const idle = !!t._idle, rate = getStats(t).rate || 1000, cd = Math.max(0, t.cd || 0);
  const since = !idle && cd > 0 ? rate - cd : Infinity;   // ms since the last shot
  const loop = (clip) => ({ clip, f: loopFrame(ENG, clip, time, t.id) });
  if (s.roller) {
    if (idle) return loop("lever");
    const C = ENG.CLIPS, H = C.heave;
    if (since < (1 - H.hit) * H.ms) return shotPart("heave", cd, since);
    if (anim > 0 || r < 0.55) return loop("leverUp");
    const set = (r - 0.55) * rate;                        // ms since the chock was set again
    if (cd > 0 && set < C.reset.ms) return { clip: "reset", f: fracFrame(ENG, "reset", set / C.reset.ms) };
    return shotPart("heave", cd, Infinity) || loop("lever");
  }
  if (idle) {
    const u = frac(time / 7 + t.id * 0.29);
    if (u > 0.62 && u < 0.8) { const q = frac((u - 0.62) / 0.09); return { clip: "winchRap", f: fracFrame(ENG, "winchRap", q) }; }
    return loop("winchIdle");
  }
  const L = ENG.CLIPS.winchLoose;
  if (since < (1 - L.hit) * L.ms) return shotPart("winchLoose", cd, since);
  if (anim === 0 && r < 0.8) return { clip: "winch", f: Math.floor(frac(time * 1.45 + t.id * 0.37) * ENG.CLIPS.winch.n) % ENG.CLIPS.winch.n };
  return shotPart("winchLoose", cd, Infinity) || loop("winchIdle");
};

// ---- per-frame -----------------------------------------------------------------
const armAngle = (t, s, r) => {
  if (t.anim > 0) {
    const p = 1 - t.anim;
    if (s.treb) return s.rest + (s.stop - s.rest) * Math.pow(1 - p, 1.4) * Math.cos(p * 4);
    return s.stop + 12 * Math.sin(p * Math.PI * 2.5) * (1 - p) * (1 - p);
  }
  const k = Math.max(0, Math.min(1, (r - 0.08) / 0.7));
  const e = k * k * (3 - 2 * k);
  return s.rest + (s.cocked - s.rest) * e;
};

export const drawCatapult = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const s = spec(t), hw = s.hw;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const f = Math.cos(t.lastAim || 0) >= 0 ? 1 : -1;   // at rest, still the way of the last throw
  const bake = canBake();
  const r = readiness(t);
  const anim = t.anim || 0;
  const id5 = t.id % 5;
  const form = `${t.level}|${t.branch}|${t.rank4}|${f}`;
  // the new engineer's clip and frame (null: the old crew, or no crew), and where his fists hold the handle
  const now = !t.noFolk ? engineerNow(t, time, s, r, anim) : null;
  const grip = now ? crewMark(ENG, now.clip, now.f, "grip", f, "engineer") : null;
  // ---- the machine (render/pix/hall-catapult.js): its BACK picture
  // here, its FRONT (the near frame and wheels, the ramp's near rail) over the arm or the log. It
  // faces +x; a hall that faces west is baked with flip and drawn mirrored, so the sun stays put.
  // The arm, stone, counterweight and log are its own small pictures, stamped live below at the
  // old pivot and angles; the ropes, sling, chock, lever, dust and the engineer are as before.
  const flip = f < 0, fo = { level: t.level, branch: t.branch || null, rank4: t.rank4 || null };
  const H = bake ? hallPix("catapult", flip ? CAT_WEST : CAT_GAME, fo, 0, { flip }) : null;
  const pic = (name, make) => pixSprite(`cat${name}|${form}`, make);
  // the whole bed hops when the arm lets go
  const jolt = anim > 0.72 ? -1 : 0;
  if (H) {
    if (H.shadow) stampPix(ctx, H.shadow, x, y);
    stampPix(ctx, pic("ground", () => catHall.ground(fo, flip)), x, y, f);
    drawHallBack(ctx, H.still || (H.still = { ...H, shadow: null }), x, y + jolt, time, { id: t.id, dir: f });
  }
  const frontLayer = () => { if (H) drawHallFront(ctx, H, x, y + jolt, time, { id: t.id, dir: f }); };

  if (s.roller) {
    const { lx, ly, rr } = logSpot(t, x, y, f, s);
    // the log waits; after a release the ramp stands empty until the winch
    // has hauled the next one up, and it settles into place
    const loaded = anim === 0 && r > 0.55;
    if (loaded) {
      const k = Math.min(1, (r - 0.55) / 0.25);
      const back = (1 - k) * 7;
      const shake = !t._idle && r > 0.93 ? (Math.sin(time * 38) > 0 ? 0.5 : 0) : 0;
      if (H) stampPix(ctx, pic("log", () => catHall.log(fo, flip)), lx - f * back + shake, ly - back * 0.45 + jolt, f);
      // the Powder Keg Run lights its fuse at the last moment
      if (r4 === "bb" && (r > 0.9 || t._idle)) {
        const fl = Math.sin(time * 30) > 0;
        const fx = lx + f * 1.7, fy = ly - rr * 0.85 - 13;
        glow(ctx, fx, fy, fl ? 3 : 2.2, "#f4c060", 0.9);
        ctx.fillStyle = fl ? "#fff3d2" : "#f0903a"; ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
      }
    } else if (anim > 0.4) {
      // dust where it left the lip
      const R = RAMP(x, y, f, hw);
      for (let i = 0; i < 3; i++) soft(ctx, R.bx + f * (4 + i * 4) * (1 - anim + 0.3), R.by + 1 - i, 4 - i, 2.5 - i * 0.5, [[0, `rgba(190,170,130,${0.55 * anim})`], [1, "rgba(190,170,130,0)"]]);
    }
    frontLayer();
    // the chock and its lever: set, or knocked out
    const R = RAMP(x, y, f, hw);
    const cx = lx + f * (rr + 1.5), cy = rampY(R, cx) - 2;
    const out = anim > 0 || r < 0.55;
    ctx.fillStyle = "#4e3520";
    if (!out) { ctx.fillRect(cx - 1.4, cy - 3, 2.8, 3.6); ctx.fillStyle = "#6a4a2e"; ctx.fillRect(cx - 1.4, cy - 3, 1, 3.6); }
    else { ctx.fillRect(cx - 2, cy + 0.5, 3.6, 1.8); }
    // (the lever ends in the engineer's hands: no engineer, no lever)
    let hx = x - f * (hw + 1 - LEVER[0]), hy = y + CREW_DY + LEVER[1] + (out ? -3 : 0);
    if (grip) { hx = x - f * (hw + 1) + grip[0]; hy = y + CREW_DY + grip[1]; }   // the new engineer: the lever ends in his fists, wherever they are
    if (!t.noFolk) {
      ctx.strokeStyle = "#241a26"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cx - f * 1, cy + 1); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = "#8a6238"; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(cx - f * 1, cy + 1); ctx.lineTo(hx, hy); ctx.stroke();
    }
  } else {
    const deg = Math.round(armAngle(t, s, r) / 6) * 6;
    const a = deg * D2R, ux = f * Math.sin(a), uy = -Math.cos(a);
    const px = x + f * s.px, py = y - s.fh + 1 + jolt;
    const tx = px + ux * s.L, ty = py + uy * s.L;
    // release: a smear of air where the arm just was
    if (anim > 0.5) {
      const a1 = Math.atan2(uy, ux), sweep = 1.1;
      const a0 = a1 - f * sweep;
      ctx.lineCap = "round";
      for (const [rr, al, w] of [[s.L - 1, 0.5, 1.8], [s.L * 0.7, 0.3, 1.2]]) {
        const lo = f > 0 ? a0 : a1, hi = f > 0 ? a1 - 0.12 : a0;
        pxArc(ctx, px, py, rr, rr, `rgba(255,243,210,${al * (anim - 0.5) * 2})`, { a0: Math.min(lo, hi), a1: Math.max(lo, hi), th: w > 1.5 ? 3 : 2 });
      }
    }
    if (H) stampPix(ctx, pixSprite(catHall.armKey(fo, deg, flip), () => catHall.arm(fo, deg, flip)), px, py, f);

    const loaded = anim === 0 && r > 0.8;
    if (s.treb) {
      // the sling: hanging from the tip while it winds and while it waits
      // cocked, the stone in its pouch (a sling laid back in a trough on the
      // bed ran its rope from the tip straight through the engineer's head),
      // whipping out over the top as it looses. Cocked (-102), the tip is out
      // past his back and high, so the pouch and its stone hang up and clear
      // of his cap even while he still leans into the crank.
      let sx, sy;
      if (anim > 0) { sx = tx + ux * 9 + f * 4 * anim; sy = ty + uy * 9 - 3 * anim; }
      else { sx = tx + Math.sin(time * 2.5) * (loaded ? 0.4 : 0.8); sy = ty + 7; }
      rope(ctx, tx, ty, sx, sy, anim > 0 ? 0 : 1.5, ROPE, 0.8);
      ball(ctx, sx, sy, 2.2, 1.6, "#6a4a2e", { hi: 0.35, lo: 0.4 });
      if (loaded) {
        if (H) stampPix(ctx, pic("shot", () => catHall.shot(fo, flip)), sx, sy - 1.8, f);
        if (r4 === "ab") comet(ctx, sx, sy - 1.8, time);
      }
      // the winch rope to the arm while it cocks: it takes the arm near the
      // pivot, so it leans in toward the engine, clear of the engineer's face
      if (anim === 0) rope(ctx, x - f * (hw - 3), y - WINCH_DY + jolt, px + ux * s.L * ROPE_AT, py + uy * s.L * ROPE_AT, 0.5, ROPE, 0.7);
    } else {
      if (loaded && H) stampPix(ctx, pic("shot", () => catHall.shot(fo, flip)), tx - uy * f * 0.5, ty - 2.2, f);
      // the winch rope takes the arm near the pivot, so it leans in toward
      // the engine with air in front of the engineer's face, never across
      // it to the cup
      if (anim === 0 && r < 0.95) rope(ctx, x - f * (hw - 3), y - WINCH_DY + jolt, px + ux * s.L * ROPE_AT, py + uy * s.L * ROPE_AT, 0.3, ROPE, 0.7);
    }
    frontLayer();
    // the counterweight hangs plumb from the short end, out in front
    if (s.treb) {
      const wx = px - ux * s.butt, wy = py - uy * s.butt;
      if (H) stampPix(ctx, pic("weight", () => catHall.weight(fo, flip)), wx, wy, f);
    }
    if (!s.treb && anim === 0 && r >= 0.95 && !t._idle) {
      // cocked and trembling: the rope is taut to the trigger
      ctx.strokeStyle = "rgba(240,224,180,0.95)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x - f * (hw - 3), y - WINCH_DY); ctx.lineTo(px + ux * s.L * ROPE_AT, py + uy * s.L * ROPE_AT); ctx.stroke();
    }
    // a thump of dust at the wheels as it looses
    if (anim > 0.5) for (const sgn of [-1, 1]) soft(ctx, x + sgn * (hw - 1), y + 5, 6 * anim, 2.4, [[0, `rgba(190,170,130,${0.5 * anim})`], [1, "rgba(190,170,130,0)"]]);
  }
  // Comet Sling: the cauldron smokes and glows under
  if (r4 === "ab") {
    const cx = x - f * (hw - 2);
    for (let i = 0; i < 2; i++) { const k = ((time * 0.6 + i * 0.5 + t.id * 0.1) % 1); soft(ctx, cx + Math.sin(time + i) * 2, y - 18 - k * 14, 2 + k * 3, 2 + k * 3, [[0, `rgba(60,52,58,${0.4 * (1 - k)})`], [1, "rgba(60,52,58,0)"]]); }
  }
  // ---- the engineer, at the winch behind the bed
  // Cranking, his hands ride the winch handle round (CREW_FRAMES baked
  // turns, his body hauling from the hips); at the Log Roller he holds the
  // lever that knocks the chock out and heaves on it as the log goes. At ease
  // he rests on the handle, breathes, looks about, and now and then raps a
  // peg home on the drum (it sparks on the rap).
  if (t.noFolk) return;
  const ex = x - f * (hw + 1), ey = y + CREW_DY;
  if (now) {
    if (!s.roller) {
      // the winch's crank and its handle, at the turn his fists are on
      const ax = x - f * (hw - 3), ay = y - WINCH_DY, gx = ex + grip[0], gy = ey + grip[1];
      ctx.strokeStyle = "#241a26"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.fillStyle = "#241a26"; ctx.fillRect(gx - 1, gy - 1, 2, 2);
      ctx.fillStyle = "#8a909c"; ctx.fillRect(gx - 0.5, gy - 0.5, 1, 1);
    }
    const rec = drawCrewPix(ctx, ENG, ex, ey, f, now.clip, now.f, { variant: "engineer" });
    if (now.clip === "winchRap") {
      // the rap sparks where his fist lands on the peg
      const R = ENG.CLIPS.winchRap, hitF = Math.round(R.hit * (R.n - 1));
      if (now.f === hitF || now.f === hitF + 1) { const m = markOf(rec, "fist", f); glow(ctx, ex + m[0], ey + m[1], 2.5, "#ffe08a", 0.9); }
    }
    return;
  }
};

// A stone wrapped in burning pitch.
const comet = (ctx, x, y, time) => {
  glow(ctx, x, y - 1, 6, "#f08a3a", 0.75);
  const fl = Math.sin(time * 22) > 0 ? 1 : 0;
  ctx.fillStyle = "#f4c060"; ctx.fillRect(x - 1, y - 4 - fl, 2, 2);
  ctx.fillStyle = "#fff3d2"; ctx.fillRect(x - 0.5, y - 2.5, 1, 1);
};
