// ============ HALL: THE KING'S BAND ============
// A hall that never shoots: its musicians play on a bandstand and every hall in earshot works to the
// beat (engine/band.js). The building is render/pix/hall-band.js (which also says where each player
// stands: layout()); this file stands the figures (fig-drummer.js, fig-herald.js) and paints what moves:
//   - every player of the hall plays ONE clip on one clock (id 0), so the band is in step
//     (BEAT_MS 600: a `play` clip is one bar of two beats, a drum struck on frames 0 and n/2)
//   - Thunder Drums' kettle skins jump on the beat (alternating hands), brighter in a roll (t.rollUntil)
//   - the War Horn's breath rings leave the horn's mouth on a blast (t.hornAt, 700 ms)
//   t.noFolk    the build animation paints the hall without its people
// A silenced band (frozen, burning, coiled, struck by lightning) sits at ease: the `idle` clip.
import * as drummerFig from "../pix/fig-drummer.js";
import * as heraldFig from "../pix/fig-herald.js";
import { crew, drawCrewPix, loopFrame, crewMark } from "../pix/crews.js";
import * as bandHall from "../pix/hall-band.js";
import { hallPix, drawHallBack, drawHallFront } from "../pix/halls.js";
import { shocked } from "../../engine/build.js";

const BEAT_MS = 600, HORN_MS = 700;
const DRUM = crew("drummer", drummerFig), HERALD = crew("herald", heraldFig);
const FIG_OF = { drum: DRUM, bass: DRUM, kettle: DRUM, major: DRUM, fife: HERALD, trumpet: HERALD, horn: HERALD };
const px = (ctx, c, x, y, w = 0.5, h = 0.5) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h); };

export const drawBandTower = (ctx, t, time) => {
  if (typeof document === "undefined") return;
  const x = Math.round(t.x), y = Math.round(t.y), lvl = t.level || 1;
  const H = hallPix("band", bandHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, (t.id || 0) % 3);
  const L = bandHall.layout({ level: lvl, branch: t.branch, rank4: t.rank4 });
  drawHallBack(ctx, H, x, y, time, { id: t.id });
  const ms = time * 1000, silent = shocked(t) || t.iceLeft > 0 || t.fireLeft > 0 || t.downLeft > 0;
  // Thunder Drums: the skins, between the building and the crew (the player's sticks come down over them)
  if (L.kettles.length) {
    const beat = Math.floor(ms / BEAT_MS), ph = (ms % BEAT_MS) / BEAT_MS, roll = !silent && (t.rollUntil || 0) > ms;
    L.kettles.forEach((k, i) => {
      // the right-hand drum takes beat 1 (his left stick), the left-hand drum beat 2
      const mine = !silent && (beat & 1) === (i === 1 ? 0 : 1), hit = mine ? Math.max(0, 1 - ph * 3.5) : 0, kx = x + k.x / 2, ky = y + k.y / 2 - hit * 0.5;
      if (roll) { ctx.fillStyle = "rgba(255,214,110,0.28)"; ctx.beginPath(); ctx.ellipse(kx, ky, k.rx / 2 + 1.6, k.ry / 2 + 1, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = hit > 0.5 || roll ? "#fff4d0" : "#efe6cf";
      ctx.beginPath(); ctx.ellipse(kx, ky, k.rx / 2, k.ry / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(120,86,50,0.45)"; ctx.fillRect(kx - k.rx / 2 + 0.5, ky + 0.25, k.rx - 1, 0.5);   // the skin's own shade
      if (hit > 0.15) { ctx.strokeStyle = `rgba(255,248,220,${hit * 0.8})`; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(kx, ky, k.rx / 2 + 0.8 + (1 - hit) * 1.5, k.ry / 2 + 0.4 + (1 - hit) * 0.7, 0, 0, Math.PI * 2); ctx.stroke(); }
    });
  }
  // the players, back to front, all on one clock
  if (!t.noFolk) {
    const clip = silent ? "idle" : "play";
    for (const p of [...L.players].filter((q) => !q.ground).sort((a, b) => a.y - b.y)) {
      const fig = FIG_OF[p.role], f = loopFrame(fig, clip, time, 0);
      drawCrewPix(ctx, fig, x + p.x / 2, y + p.y / 2, 1, clip, f, { variant: p.variant });
    }
  }
  drawHallFront(ctx, H, x, y, time, { id: t.id });
  // whoever stands on the grass before the stand (the Full Company's drum major) goes over its front wall
  if (!t.noFolk) for (const p of L.players.filter((q) => q.ground)) {
    const clip = silent ? "idle" : "play", fig = FIG_OF[p.role], f = loopFrame(fig, clip, time, 0);
    drawCrewPix(ctx, fig, x + p.x / 2, y + p.y / 2, 1, clip, f, { variant: p.variant });
  }
  // the War Horn's blast: rings of sound leave the horn's mouth
  if (L.horn && !t.noFolk && t.hornAt != null) {
    const age = ms - t.hornAt;
    if (age >= 0 && age < HORN_MS) {
      const p = L.players[0], clip = silent ? "idle" : "play", f = loopFrame(HERALD, clip, time, 0);
      const m = crewMark(HERALD, clip, f, "bell", 1, p.variant);
      const bx = x + (m ? p.x / 2 + m[0] : L.horn.bell[0] / 2), by = y + (m ? p.y / 2 + m[1] : L.horn.bell[1] / 2), k = age / HORN_MS;
      for (let i = 0; i < 3; i++) {
        const q = k * 1.4 - i * 0.28; if (q <= 0 || q >= 1) continue;
        const r = 2 + q * 11, a = (1 - q) * 0.9;
        for (let d = -50; d <= 50; d += 10) { const ang = (d * Math.PI) / 180; px(ctx, `rgba(255,240,200,${a})`, bx + Math.cos(ang) * r, by + Math.sin(ang) * r * 0.8); }
      }
      if (k < 0.3) { ctx.fillStyle = `rgba(255,236,170,${0.5 - k})`; ctx.beginPath(); ctx.ellipse(bx, by, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
};
