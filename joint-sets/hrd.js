// The Greenwood Horde (rigs-horde.js), every frame a foe can show, in play
// order: walk 0-3, then the four-frame fight (0 guard, 1 wind-up, 2 strike,
// 3 follow-through) drawn with fightN: 4 as the game bakes it. The last rows
// are the boar's lancer call (rigs-beasts.js): the goblin with a spear in the
// old two-frame fight (0 wind-up, 1 strike), no fightN.
//   /joint-lab.html?set=hrd&tag=hrd_x&scale=4[&only=goblin]
import { RIGS } from "/src/render/rigs.js";
import { HORDE_RIGS, HORDE_PAINTERS } from "/src/render/rigs-horde.js";
import { JOINTS } from "/src/render/folk-kit.js";
export const CW = 60, CH = 62;
const FX = 30, FY = 54;
const fit = (def) => Math.min(1, 46 / (def.box.up + def.box.down));
// the wrist: the angle between the forearm and the haft (the rig logs
// elbow → hand → up the haft as a "wrist" joint); the rule is ≤ ~120°
const wristNote = () => (JOINTS.log || []).filter((j) => j.kind === "wrist").map((j) => {
  const u = [j.b[0] - j.a[0], j.b[1] - j.a[1]], v = [j.c[0] - j.b[0], j.c[1] - j.b[1]];
  const d = Math.round((Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180) / Math.PI);
  if (d > 120) console.error(`wrist folded ${d}°`);
  return `wr ${d}°${d > 120 ? " BAD" : ""}`;
}).join(" ");
const cell = (type, pose, frame, extra = {}) => {
  const c0 = { note: `${pose} ${frame}` };
  c0.draw = (c) => {
    const def = RIGS[type] || HORDE_RIGS[type];
    c.translate(FX, FY); c.scale(fit(def), fit(def));
    HORDE_PAINTERS[def.kind](c, { ...def.p, ...extra, pose, frame });
    c0.note = `${pose} ${frame} ${wristNote()}`;
    ((globalThis.HRD_NOTES ||= {})[type] ||= []).push(c0.note);
  };
  return c0;
};
const types = Object.keys(HORDE_RIGS);
export const rows = types.map((t) => [t, [0, 1, 2, 3].map((f) => cell(t, "walk", f)).concat([0, 1, 2, 3].map((f) => cell(t, "fight", f, { fightN: 4 })))]);
// the boar's lancer: rigs-beasts.js calls hGoblin with these params, fight 0/1
const rider = { h: 16, skin: "#6aa04f", cloth: "#5f4326", cloth2: "#3c2a18", hair: "#5a4630", eyes: "#c8453a", head: "hood", weapon: "spear", wcol: "#b8bcc4" };
rows.push(["lancer (2-frame call)", [
  ...[0, 1, 2, 3].map((f) => ({ note: `walk ${f}`, draw: (c) => { c.translate(FX, FY); HORDE_PAINTERS.hGoblin(c, { ...rider, pose: "walk", frame: f }); } })),
  ...[0, 1].map((f) => { const c0 = { note: "" }; c0.draw = (c) => { c.translate(FX, FY); HORDE_PAINTERS.hGoblin(c, { ...rider, pose: "fight", frame: f }); c0.note = `fight ${f} (2f) ${wristNote()}`; }; return c0; }),
]]);
