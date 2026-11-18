// ============ THE KING'S BAND: notes over the halls it plays for ============
// Each hall a band is playing for (t.tune, engine/bandplay.js) puffs a little
// music note over its roof on every beat (BEAT_MS): gold for the drums (path a
// and the levels), crimson for the heralds' trumpets (path b), the two by turns
// when both play for it. It rises a few pixels and fades before the next beat.
// During a Thunder Drums roll the notes come twice as fast.
// Pixel sprites with a one-pixel tinted line, baked once per colour.
import { BEAT_MS } from "../engine/band.js";

// an eighth note, 5 x 8: '#' body, '.' clear
const NOTE = [
  "..##.",
  "..#.#",
  "..#..",
  "..#..",
  ".##..",
  "###..",
  "###..",
  ".#...",
];
const COLS = { drum: ["#f4d47a", "#6b4a14"], horn: ["#e8505a", "#5a1420"] };
const baked = {};
const noteSprite = (voice) => {
  if (baked[voice]) return baked[voice];
  if (typeof document === "undefined") return null;
  const [fill, ink] = COLS[voice];
  const W = NOTE[0].length + 2, H = NOTE.length + 2;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const on = (x, y) => NOTE[y]?.[x] === "#";
  // the tinted line: every clear pixel touching the note
  c.fillStyle = ink;
  for (let y = -1; y <= NOTE.length; y++) for (let x = -1; x <= NOTE[0].length; x++) {
    if (on(x, y)) continue;
    if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) c.fillRect(x + 1, y + 1, 1, 1);
  }
  c.fillStyle = fill;
  for (let y = 0; y < NOTE.length; y++) for (let x = 0; x < NOTE[0].length; x++) if (on(x, y)) c.fillRect(x + 1, y + 1, 1, 1);
  // one highlight pixel on the head
  c.fillStyle = "#fff8e0"; c.fillRect(2, 6, 1, 1);
  return (baked[voice] = cv);
};

// how far above its anchor a hall's roof stands, roughly (board units)
const TOP = { archer: 44, wizard: 46, knight: 34, catapult: 32, spiker: 26, goldworks: 34, trapsmith: 30, falconry: 40, gunpowder: 34, riverwatch: 32, assassin: 30, sunforge: 34, support: 34 };

export function drawBandNotes(ctx, g) {
  const tms = g.time * 1000;
  let rollOn = false;
  for (const b of g.towers) if (b.kind === "band" && (b.rollUntil || 0) > tms) { rollOn = true; break; }
  for (const t of g.towers) {
    const tu = t.tune;
    if (!tu) continue;
    const beat = rollOn && (tu.tempo || 0) >= 0.5 ? BEAT_MS / 2 : BEAT_MS;
    const n = Math.floor(tms / beat), ph = (tms % beat) / beat;
    const voice = tu.voice === "both" ? (n % 2 ? "horn" : "drum") : tu.voice;
    const s = noteSprite(voice);
    if (!s) continue;
    const side = n % 2 ? 1 : -1;
    // drawn at a board unit a pixel (twice an art pixel), so a note reads at a glance
    // over a busy roof, as a marker rather than a piece of the world
    const x = Math.round(t.x + side * 7 + Math.sin(ph * Math.PI) * side * 2 - s.width / 2);
    const y = Math.round(t.y - (TOP[t.kind] || 34) - 6 - ph * 10);
    ctx.globalAlpha = ph < 0.12 ? ph / 0.12 : ph < 0.55 ? 1 : 1 - (ph - 0.55) / 0.45;
    ctx.drawImage(s, x, y);
  }
  ctx.globalAlpha = 1;
}
