// The Iron Kingdom's foot (src/render/rigs-iron.js) and the Hollow Court's
// dead (src/render/rigs-hollow.js): every walk frame and every fight frame of
// each rig, in play order — the joint lab's "irh" set.
//   /joint-lab.html?set=irh&tag=irh_x&scale=3            (&only=levy,crossbow)
// A rig with `fightN: 4` shows guard, wind-up, strike, follow-through; the
// crossbowman and the barrow archer shoot through the same four frames
// (ready, aim, loose, reload). Rows are labelled by type.
import { RIGS } from "/src/render/rigs.js";
import { bakeSprite, PX } from "/src/render/paint.js";
import { IRON_RIGS, IRON_PAINTERS } from "/src/render/rigs-iron.js";
import { HOLLOW_RIGS, HOLLOW_PAINTERS } from "/src/render/rigs-hollow.js";

const PAINT = { ...IRON_PAINTERS, ...HOLLOW_PAINTERS };
export const CW = 50, CH = 60;
const FX = 20, FY = 56;
const TYPES = [...Object.keys(IRON_RIGS), ...Object.keys(HOLLOW_RIGS)];
const WALK = ["contact", "passing", "contact", "passing"];
const SHOOT = { crossbow: 1, bonearcher: 1 };

const cell = (type, pose, frame, note) => ({
  note,
  draw: (c) => {
    const def = RIGS[type];
    const s = Math.min(1, 52 / (def.box.up + def.box.down));
    c.translate(FX, FY); c.scale(s, s);
    PAINT[def.kind](c, { ...def.p, pose, frame });
  },
});

export const rows = TYPES.map((t) => {
  const n = RIGS[t].fightN || (t in IRON_RIGS ? 4 : 2);
  const names = SHOOT[t] ? ["ready", "aim", "loose", "reload"] : n === 4 ? ["guard", "wind-up", "strike", "follow"] : ["wind-up", "strike"];
  return [`${t}\nwalk 0-3 | fight 0-${n - 1}`, [
    ...WALK.map((w, f) => cell(t, "walk", f, `walk ${f} ${w}`)),
    ...Array.from({ length: n }, (_, f) => cell(t, "fight", f, `fight ${f} ${names[f] || ""}`)),
  ]];
});

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
      const type = name.split("\n")[0], def = RIGS[type], box = def.box, [pose, fr] = cell.note.split(" ");
      const bk = bakeSprite(140, 100, (c) => { c.translate(70, 90); PAINT[def.kind](c, { ...def.p, pose, frame: Number(fr) }); }), W = bk.width, Hh = bk.height;
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
