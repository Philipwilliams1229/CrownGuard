// The Rime Clans' warriors (src/render/rigs-rime.js): every walk frame and
// every fight frame of each rig, in play order — the joint lab's "rime" set;
// the skald's chant (walk 4-7) and the Jarl seated for the war-mammoth
// (rimeJarlRider: ride 0-3, fight 0-3) as rows of their own.
//   /joint-lab.html?set=rime&tag=rmw_x&scale=3            (&only=thrall,huscarl)
//   node scripts/shoot.mjs "/joint-lab.html?set=rime" "import('/joint-sets/rime.js').then((m) => m.analyse('thrall'))"
import { RIGS } from "/src/render/rigs.js";
import { bakeSprite, PX } from "/src/render/paint.js";
import { RIME_RIGS, RIME_PAINTERS, rimeJarlRider, RIME_JARL } from "/src/render/rigs-rime.js";

const PAINT = { ...RIME_PAINTERS };
export const CW = 56, CH = 64;
const FX = 24, FY = 58;
const TYPES = Object.keys(RIME_RIGS);
const WALK = ["contact", "passing", "contact", "passing"];
const FIGHT = ["guard", "wind-up", "strike", "follow"];
const scaleOf = (def) => Math.min(1, 54 / (def.box.up + def.box.down));

const cell = (type, pose, frame, note) => {
  const paint = (c) => { const def = RIGS[type]; PAINT[def.kind](c, { ...def.p, pose, frame }); };
  return { note, type, paint, draw: (c) => { c.translate(FX, FY); const s = scaleOf(RIGS[type]); c.scale(s, s); paint(c); } };
};
// the seated Jarl: his hips at the seat, raised so his feet sit on the cell's floor
const riderCell = (fight, frame, note) => {
  const paint = (c) => { c.translate(0, -11); rimeJarlRider(c, RIME_JARL, fight, frame); };
  return { note, type: null, paint, draw: (c) => { c.translate(FX, FY); c.scale(0.9, 0.9); paint(c); } };
};

export const rows = [
  ...TYPES.map((t) => [`${t}\nwalk 0-3 | fight 0-3`, [
    ...WALK.map((w, f) => cell(t, "walk", f, `walk ${f} ${w}`)),
    ...FIGHT.map((n, f) => cell(t, "fight", f, `fight ${f} ${n}`)),
  ]]),
  ["skald chant\nwalk 4-7", [0, 1, 2, 3].map((f) => cell("skald", "walk", 4 + f, `walk ${4 + f} chant`))],
  ["rimeJarlRider\nride 0-3 | fight 0-3", [
    ...WALK.map((w, f) => riderCell(false, f, `walk ${f} ride`)),
    ...FIGHT.map((n, f) => riderCell(true, f, `fight ${f} ${n}`)),
  ]],
];

// For the artist's numbers (not the lab's): every arm's fold and swing and
// every wrist (the haft's angle off the forearm: -90 crosses the fist on the
// thumb side, 0 in line, past ±120 folded back), per frame.
//   node scripts/shoot.mjs "/joint-lab.html?set=irh&only=levy" "import('/joint-sets/irh.js').then((m) => m.analyse('levy'))"
import { JOINTS } from "/src/render/folk-kit.js";
export const analyse = (only = "") => {
  const words = only.split(",").filter(Boolean);
  const deg = (r) => r * 180 / Math.PI, norm = (a) => { while (a > 180) a -= 360; while (a <= -180) a += 360; return a; };
  const out = [];
  for (const [name, cells] of rows) {
    if (words.length && !words.some((w) => name.includes(w))) continue;
    out.push("== " + name.split("\n")[0]);
    for (const cell of cells) {
      JOINTS.log = [];
      const cv = document.createElement("canvas"); cv.width = 200; cv.height = 200;
      try { cell.draw(cv.getContext("2d")); } catch (e) { out.push("ERR " + e.message); }
      const log = JOINTS.log; JOINTS.log = null;
      const bits = [];
      for (const j of log) {
        const [s, e, h] = [j.a, j.b, j.c];
        const u = [e[0] - s[0], e[1] - s[1]], f = [h[0] - e[0], h[1] - e[1]];
        const lu = Math.hypot(...u), lf = Math.hypot(...f);
        if (j.kind === "arm") {
          const fold = deg(Math.acos(Math.max(-1, Math.min(1, (u[0] * f[0] + u[1] * f[1]) / (lu * lf)))));
          const cross = u[0] * f[1] - u[1] * f[0], sw = deg(Math.atan2(u[0], u[1]));
          const st = j.lens ? Math.round((lf / j.lens[1] - 1) * 100) : 0;
          bits.push(`arm[f${fold.toFixed(0)}${cross > 0 && fold > 8 ? (j.flip ? " FLIP" : " REV") : ""} s${sw.toFixed(0)}${st > 3 ? " STR" + st : ""}]`);
        } else if (j.kind === "wrist") bits.push(`wr${norm(deg(Math.atan2(f[1], f[0]) - Math.atan2(u[1], u[0]))).toFixed(0)}`);
      }
      // how far the frame reaches (units from the feet) against its box
      const def = cell.type ? RIGS[cell.type] : null, box = def ? def.box : { hw: 99, up: 99, down: 99 };
      const bk = bakeSprite(140, 100, (c) => { c.translate(70, 90); cell.paint(c); }), W = bk.width, Hh = bk.height;
      const d = bk.getContext("2d").getImageData(0, 0, W, Hh).data;
      let x0 = W, x1 = -1, y0 = Hh, y1 = -1;
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const R = (x1 + 1) / PX - 70, L = 70 - x0 / PX, T = 90 - y0 / PX, B = (y1 + 1) / PX - 90;
      let cut = "";
      if (R > box.hw) cut += ` R+${(R - box.hw).toFixed(1)}`;
      if (L > box.hw) cut += ` L+${(L - box.hw).toFixed(1)}`;
      if (T > box.up) cut += ` T+${(T - box.up).toFixed(1)}`;
      if (B > box.down) cut += ` B+${(B - box.down).toFixed(1)}`;
      out.push(`  ${cell.note.padEnd(17)} ${bits.join(" ")}${cut ? "  CUT " + cut : ""}`);
    }
  }
  return out.join("\n");
};
