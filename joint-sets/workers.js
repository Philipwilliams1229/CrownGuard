// The workers (src/render/folk-workers.js) in every frame the halls stamp, in
// play order, each with the prop it works (anvil, crank, block) where the
// hall puts it — the joint lab's "workers" set.
import * as F from "/src/render/folk.js";
const C = F.CREW_FOLK, A = F.ARCHER_FOLK, W = F.WALL_FOLK;
const WATCH = { skin: "#e8b990", hood: "#2e4a6a", coat: "#3e5a7c", boots: "#2a2a30", trim: "#c8a048" };
const X = 18, Y = 42;
export const CW = 40, CH = 48;
const cell = (note, draw) => ({ note, draw });

// the trapsmith's anvil and iron, from the smith's feet (he stands at x-6.5, y+4)
const anvil = (c) => {
  const ax = X + 6.5, ay = Y - 4;
  c.fillStyle = "#4a4a52"; c.fillRect(ax - 3, ay - 3, 6, 5.5);
  c.fillStyle = "#6c707a";
  c.beginPath(); c.moveTo(ax - 6, ay - 7.4); c.lineTo(ax + 4, ay - 7.4); c.quadraticCurveTo(ax + 8, ay - 7, ax + 9, ay - 5.6); c.lineTo(ax + 3, ay - 5); c.lineTo(ax + 2.5, ay - 3); c.lineTo(ax - 3.5, ay - 3); c.lineTo(ax - 4, ay - 5); c.lineTo(ax - 6, ay - 5.6); c.closePath(); c.fill();
  c.fillStyle = "#f4a040"; c.fillRect(ax + 0.5, ay - 8.2, 4, 0.9);
};
const smithNote = (i) => {
  const H = F.smithHammer(i);
  return `${["lift", "top", "strike", "IMPACT", "rebound", "settle"][i]} wrist ${H.wrist}`;
};
// a crank's hub and handle
const crank = (hub, rx, ry, p) => (c) => {
  const [hx, hy] = F.crankAt(hub, rx, ry, p);
  c.fillStyle = "#3a2a1e"; c.beginPath(); c.arc(X + hub[0], Y + hub[1], 2.2, 0, 7); c.fill();
  c.strokeStyle = "#241a26"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(X + hub[0], Y + hub[1]); c.lineTo(X + hx, Y + hy); c.stroke();
};
const CAT = { hub: [4, -14], rx: 1.8, ry: 1.8 };
const SPK = { hub: [3.5, -13], rx: 1.9, ry: 1.1 };
const BAR = { hub: [6.4, -13.4], rx: 0.9, ry: 0.5, push: true };
const crewRow = (P, pal) => Array.from({ length: F.CREW_FRAMES }, (_, i) => {
  const p = i / F.CREW_FRAMES;
  return cell(`turn ${i}`, (c) => { crank(P.hub, P.rx, P.ry, p)(c); F.drawCrew(c, X, Y, 1, pal, 0, { ...P, phase: p }); });
});
// the mason's trestle block (its top at y-12, from x+6.5)
const block = (c) => { c.fillStyle = "#8e887a"; c.fillRect(X + 7, Y - 12, 8, 6); c.fillStyle = "#d8d0c0"; c.fillRect(X + 7.5, Y - 12, 6, 1.2); };

export const rows = [
  ["smith\n(trapsmith)", Array.from({ length: F.SMITH_FRAMES }, (_, i) => cell(smithNote(i), (c) => { anvil(c); F.drawSmith(c, X, Y, 1, C.smith, 0, { frame: i }); }))],
  ["crew\ncatapult", crewRow(CAT, C.engineer)],
  ["crew\ncatapult idle", [
    ...["rest", "breath", "glance", "tap", "rap", "heave"].map((pose) => cell(pose, (c) => { crank(CAT.hub, CAT.rx, CAT.ry, 0.1)(c); F.drawCrew(c, X, Y, 1, C.engineer, 0, { ...CAT, phase: 0.1, pose }); })),
  ]],
  ["crew\nbladewheel", crewRow(SPK, C.engineer)],
  ["crew\nhand-bar", crewRow(BAR, C.engineer)],
  ["crew\nsiege bow", [0, 1, 2, 3].map((w) => cell(`work ${w}`, (c) => F.drawCrew(c, X, Y, 1, A.crew, (w - 1.5) * 0.4)))],
  ["standers\nat ease", [
    ...[0, 1, 2, 3].map((f) => cell(`clerk ${["rest", "breath", "weight back", "glance"][f]}`, (c) => F.drawStander(c, X, Y, 1, C.clerk, { frame: f }))),
    cell("clerk (goldworks call)", (c) => F.drawStander(c, X, Y, 1, C.clerk)),
  ]],
  ["standers\nwatch glass", [1, 2, 3].map((g) => cell(`glass ${g}`, (c) => F.drawStander(c, X, Y, 1, WATCH, { glass: g })))],
  ["halberdier", [
    ...[0, 1, 2].map((f) => cell(`ease ${f}`, (c) => F.drawHalberdier(c, X, Y, 1, W.guard, { frame: f }))),
    ...[0, 1, 2, 3].map((k) => cell(`walk ${k}`, (c) => F.drawHalberdier(c, X, Y, 1, W.guard, { walk: k }))),
  ]],
  ["mason", Array.from({ length: F.MASON_FRAMES }, (_, i) => cell(["lay", "draw along", "lift", "scoop", "carry", "set"][i], (c) => { block(c); F.drawMason(c, X, Y, 1, W.mason, i); }))],
];
