// ============ HALL: THE ARCHER TOWER ============
// It GROWS: a timber watch-post on trestle legs at level one, a stone storey
// under a jettied timber loft at two, a coursed stone tower with a parapet
// walk at three. The Ranger Company goes to the forest — moss and ivy, a
// leaf-thatched awning, a butt of straw at the foot; the Briar Rangers let
// the thorns in and brew venom in a cauldron; the Hawkeye Conclave raises a
// hawk's mast. The Master Longbowman climbs a slender pale tower between
// two slate-capped pinnacles; the Ballista bands it in iron and mounts a
// great siege bow; the Dragonslayer hangs a wyrm's skull under the walk.
//
// Three layers, all baked once per form: the ground bed (un-inked, so the
// shadow stays a shadow), the body (everything behind the crew), and the
// front rail the crew stand behind. Only lights, cloth, birds and the crew
// themselves are painted live. archerLayout() says how high the walk is and
// where each archer stands; the engine reads the same numbers, so every
// arrow leaves the bow that loosed it.

import { archerLayout, getStats } from "../../engine/towers.js";
import { TIMBER, OAKWOOD, lighten, darken, rgba, ball, glow, roundRect, cylinder, lin } from "../buildkit.js";
import * as bowmanFig from "../pix/fig-bowman.js";
import * as engineerFig from "../pix/fig-engineer.js";
import { crew, drawCrewPix, loopFrame, shotFrame, fracFrame } from "../pix/crews.js";
import * as archerHall from "../pix/hall-archer.js";
import { hallPix, drawHallBack, drawHallFront, stampPix, pixSprite } from "../pix/halls.js";

// the archer (render/pix/fig-bowman.js)
const BOWMAN = crew("bowman", bowmanFig);
const ENG = crew("engineer", engineerFig);   // the Ballista's man; the same name as catapult.js / spiker.js: one shared frame cache
// standing down, in seconds: an arrow on the string is eased off (the draw run backwards);
// a man caught reloading finishes nocking; the arrow goes back in the quiver (the "stow" clip); then the idle
const PIX_EASE = 0.45, PIX_NOCK = 0.4, PIX_STOW = bowmanFig.CLIPS.stow.ms / 1000;


// The Ballista's siege bow, mounted on the deck (the castle's wall crews use
// this front-on one too — keep its signature).
// the Ballista and the castle's wall crews use this one (render/castle.js, scenery.js)
export const resetArcherBakes = () => {};   // nothing baked here now: the pix halls cache their own (pix/halls.js)
export const ballista = (ctx, x, y, dir, recoil) => {
  cylinder(ctx, x - 7, y - 3, 14, 4, OAKWOOD, { r: 1.5, hi: 0.3, lo: 0.5 });
  ctx.save();
  ctx.translate(x, y - 3);
  ctx.rotate(dir * 0.18);
  cylinder(ctx, -2.2, -16, 4.4, 17, darken(TIMBER, 0.1), { r: 1.6, hi: 0.3, lo: 0.5 });
  for (const by of [-14, -6]) cylinder(ctx, -2.8, by, 5.6, 1.8, "#6c727e", { r: 0.8, hi: 0.4, lo: 0.4 });
  for (const side of [-1, 1]) {
    ctx.strokeStyle = lin(ctx, 0, -14, side * 14, -24, [[0, lighten(OAKWOOD, 0.3)], [1, darken(OAKWOOD, 0.35)]]);
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(side * 2, -13);
    ctx.quadraticCurveTo(side * 9, -14, side * 13, -23);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(240,232,210,0.95)";
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-13, -23); ctx.lineTo(0, -19 + recoil * 4); ctx.lineTo(13, -23); ctx.stroke();
  ctx.fillStyle = lin(ctx, -1, 0, 1, 0, [[0, "#d8dce4"], [1, "#8a909c"]]);
  roundRect(ctx, -1, -30 + recoil * 4, 2, 12, 1); ctx.fill();
  ctx.fillStyle = "#c4c8d0";
  ctx.beginPath(); ctx.moveTo(-2, -29 + recoil * 4); ctx.lineTo(0, -33 + recoil * 4); ctx.lineTo(2, -29 + recoil * 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ball(ctx, x + 8, y - 4, 3.2, 3.2, "#6c727e", { hi: 0.4, lo: 0.5 });
};

// The tower's own siege bow, seen from the side and facing +x: a banded
// stock on a yoked post, a steel bow-stave arching round the nose, the
// string hauled back to the nut and a bolt the length of a man lying in the
// groove. `loosed` (0..1) runs the string forward and empties the groove.
// ---- the parts of every form -------------------------------------------

// Where the foot-of-the-tower props stand: out on the grass in front of the
// footing (whose front edge is y + 7), feet a good step below it, inside the
// footprint — the straw butt front-left, the arrow barrel or the Briar
// cauldron front-right.
// (Kept inside x ± 9 or so: the shared ground-blend layer paints its front
// clumps round the rim at about (x ± 12, y + 8.5), over the hall.)
const PROPS = (x, y) => ({ buttX: x - 8.5, buttY: y + 13.5, barX: x + 8, barY: y + 13, calX: x + 7.5, calY: y + 13 });

export const drawArcherTower = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const lay = archerLayout(t);
  const { h, pw, hw, big } = lay;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const dy = y - h;
  const base = y + 7;
  const v = t.id % 3;
  const canBake = typeof document !== "undefined";

  // ---- the building (render/pix/hall-archer.js): its BACK picture here, its FRONT after the crew;
  // it brings its own shadow, pennant, torch flame and torchlight. The crew and their spots are
  // the same as ever (the building is built round archerLayout).
  const H = canBake ? hallPix("archer", archerHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, v) : null;
  if (H) drawHallBack(ctx, H, x, y, time, { id: t.id });

  const master = t.branch === "b";
  if (r4 === "aa") {
    // the venom brew: a sick green glow and bubbles that pop at the rim
    const { calX: cx, calY: cb } = PROPS(x, y);
    glow(ctx, cx, cb - 7, 5, "#8ce05a", 0.35 + 0.1 * Math.sin(time * 3 + t.id));
    ctx.fillStyle = "#8ce05a"; ctx.fillRect(cx - 3, cb - 7.1, 6, 1);
    for (let i = 0; i < 3; i++) {
      const ph = (time * 0.9 + i * 0.37 + t.id * 0.1) % 1;
      const bx = cx - 2 + i * 2, by = cb - 7.5 - ph * 7;
      ctx.fillStyle = rgba("#b8f08a", 1 - ph);
      ctx.fillRect(bx, by, ph < 0.2 ? 1.5 : 1, ph < 0.2 ? 1.5 : 1);
    }
  }

  // ---- the crew
  const st = getStats(t);
  const rate = st.rate || 1000;
  const aimDir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  const spots = lay.spots.map((s, i) => ({ dx: s[0], dy: s[1], i })).sort((a, b) => a.dy - b.dy);
  // Game ms since the hall last loosed (the engine sets cd = rate as the
  // arrow leaves and runs it down; it keeps falling while no foe offers).
  const since = t.cd == null ? 1e9 : rate - t.cd;
  if (r4 === "ba") {
    const loosed = t.anim > 0.3 ? 1 : 0;
    const dir = aimDir;   // at rest, still the way of the last bolt
    const sAim = t.bowAim?.[0] || 0;   // the machine pitches to its last shot's quantized aim (engine/aim.js), the old pixels when level
    if (H) stampPix(ctx, pixSprite(`siege|${loosed}|${dir}|${sAim}`, () => archerHall.siegeBow(loosed, dir < 0, sAim)), x - dir * 2, dy + 1, dir);   // the new siege bow, the same geometry
    // the winch's spokes turn while it cocks
    if (!t._idle && t.anim < 0.3) {
      // the winch hub sits at (-13, 0.5) on the stock, which is tipped -0.2
      const spin = time * 5;
      const sh = archerHall.siegeHub(sAim), wx = x - dir * 2 + dir * sh[0] / 2, wy = dy + 1 + sh[1] / 2;
      ctx.strokeStyle = "#c4c8d0"; ctx.lineWidth = 0.6;
      for (let i = 0; i < 2; i++) {
        const a = spin + (i / 2) * Math.PI;
        ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 2.6, wy - Math.sin(a) * 2.6); ctx.lineTo(wx + Math.cos(a) * 2.6, wy + Math.sin(a) * 2.6); ctx.stroke();
      }
    }
    if (!t.noFolk && canBake) {
      // the engineer (fig-engineer.js): his hands rock over the stock
      const clip = t._idle ? "bowIdle" : "bow";
      drawCrewPix(ctx, ENG, x - dir * (pw - 3), dy + 1, dir, clip, loopFrame(ENG, clip, time, t.id), { variant: sAim ? `engineer@${sAim}` : "engineer" });
    }
  } else if (!t.noFolk) {
    const n = spots.length;
    // standing down: the last moment the hall was in the fight (render-side,
    // like draw.js's _idle); for a moment after it the bows are let down
    // easy instead of dropping straight to rest
    if (!t._idle) t._arcBusy = time;
    const down = t._idle && t._arcBusy != null && time >= t._arcBusy ? time - t._arcBusy : Infinity;
    // ---- the new sprites: each archer's own moment mapped onto the figure's shot clip
    // (crews.js shotFrame: the loose on his arrow, the reload after it, then the draw and
    // the HOLD at full draw until his next loose); a longbow is the "|long" look and clip
    const clip = big ? "shootLong" : "shoot", look = big ? `${key}|long` : key;
    const CL = BOWMAN.CLIPS[clip], hitF = Math.round((CL.hit ?? 0.5) * (CL.n - 1));
    for (const sp of spots) {
      if (canBake) {
        const fx = x + sp.dx, fy = dy + 3 + sp.dy;
        // his bow turns to the foe he last loosed at (the engine keeps each bowman's quantized
        // angle in t.bowAim, aim.js); no aim = the plain look, so a level shot is the old pixels
        const aimV = t.bowAim?.[sp.i] ? `${look}@${t.bowAim[sp.i]}` : look;
        if (!t._idle) {
          // ms since HIS own loose and his own cycle, exactly as the old crew reads them below
          let el, own = rate;
          if (t.branch === "a") { const ph = (sp.i - t.shotIdx + n) % n; el = ((n - ph) % n) * rate + since; own = rate * n; }
          else { el = since - sp.i * 90; if (el < 0) el += rate; }
          const f = shotFrame(BOWMAN, clip, own - el, own);
          (t._bowSeen ||= [])[sp.i] = f;
          drawCrewPix(ctx, BOWMAN, fx, fy, aimDir, clip, f, { variant: aimV });
          continue;
        }
        const f0 = t._bowSeen?.[sp.i] ?? 0, d = Math.max(0, down - sp.i * 0.08);
        const ease = f0 < hitF ? PIX_EASE * (f0 / Math.max(1, hitF - 1)) : PIX_NOCK * ((CL.n - 1 - f0) / Math.max(1, CL.n - 1 - hitF));
        if (d < ease) drawCrewPix(ctx, BOWMAN, fx, fy, aimDir, clip, Math.round(f0 < hitF ? f0 * (1 - d / ease) : f0 + (CL.n - 1 - f0) * (d / ease)), { variant: aimV });
        else if (d - ease < PIX_STOW) drawCrewPix(ctx, BOWMAN, fx, fy, aimDir, "stow", fracFrame(BOWMAN, "stow", (d - ease) / PIX_STOW), { variant: look });
        else drawCrewPix(ctx, BOWMAN, fx, fy, aimDir, "idle", loopFrame(BOWMAN, "idle", time, t.id + sp.i * 1.7), { variant: look });   // at ease, still facing the last shot
        continue;
      }
    }
  }

  // ---- the rail the crew stand behind (the new hall flies its own pennant)
  if (H) drawHallFront(ctx, H, x, y, time, { id: t.id });
  if (r4 === "ab" && !t.noFolk) {
    // one hawk keeps the perch, one wheels over the road
    const perched = t._idle && Math.sin(time * 0.3 + t.id) > 0;
    hawkSit(ctx, x + 5, dy - 51);
    if (!perched) hawk(ctx, x, dy - 62, time, t.id);
    else hawkSit(ctx, x - 5, dy - 51);
  }
};

// A hawk on the wing, wheeling over the tower.
const hawk = (ctx, x, y, time, id) => {
  const ang = time * 1.6 + id;
  const hx = x + Math.cos(ang) * 20, hy = y + Math.sin(ang) * 6;
  const flap = Math.sin(time * 9 + id) * 2.5;
  const face = Math.cos(ang + Math.PI / 2) >= 0 ? 1 : -1;
  for (const side of [-1, 1]) {
    ctx.strokeStyle = side < 0 ? "#5a4028" : "#7a5a3a";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + side * 4, hy - 2 - flap, hx + side * 8, hy - flap * 0.6); ctx.stroke();
  }
  ball(ctx, hx, hy, 2.6, 1.6, "#7a5a3a", { hi: 0.45, lo: 0.4 });
  ball(ctx, hx + face * 2.4, hy - 0.4, 1.3, 1.1, "#e8dfc6", { hi: 0.4, lo: 0.3 });
  ctx.fillStyle = "#e8c14a"; ctx.fillRect(hx + face * 3.4 - 0.4, hy - 0.4, 0.8, 0.8);
};
// A hawk at rest on the perch bar.
const hawkSit = (ctx, x, y) => {
  ball(ctx, x, y - 2.4, 1.8, 2.6, "#7a5a3a", { hi: 0.45, lo: 0.45 });
  ball(ctx, x + 0.5, y - 5, 1.4, 1.3, "#e8dfc6", { hi: 0.4, lo: 0.3 });
  ctx.fillStyle = "#e8c14a"; ctx.fillRect(x + 1.6, y - 5, 0.8, 0.6);
  ctx.fillStyle = "#4a3420"; ctx.fillRect(x - 1.8, y - 1, 1, 2);
};
