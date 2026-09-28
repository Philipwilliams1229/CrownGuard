// Every tower crew in the poses the halls use — the joint lab's "towers" set.
import * as F from "/src/render/folk.js";
const C = F.CREW_FOLK, A = F.ARCHER_FOLK, W = F.WALL_FOLK, M = F.MAGE_FOLK, P = F.PRIEST_FOLK;
const ALCH = { skin: "#e8b990", hood: "#2e4a3a", coat: "#3a6a4e", boots: "#2a2a30", trim: "#d8b34a" };
const X = 18, Y = 42;
const cell = (note, draw) => ({ note, draw });
export const rows = [
  ["archer\n(the hall's cycle)", [
    cell("rest", (c) => F.drawArcher(c, X, Y, 1, A.base, 0, { pose: "rest" })),
    cell("draw 1/3", (c) => F.drawArcher(c, X, Y, 1, A.base, 1 / 3)),
    cell("draw 2/3", (c) => F.drawArcher(c, X, Y, 1, A.base, 2 / 3)),
    cell("draw 3/3", (c) => F.drawArcher(c, X, Y, 1, A.base, 1)),
    cell("loose", (c) => F.drawArcher(c, X, Y, 1, A.base, 0, { pose: "loose" })),
    cell("reach", (c) => F.drawArcher(c, X, Y, 1, A.base, 0, { pose: "reach" })),
  ]],
  ["mage\nlevel 1", [
    cell("idle", (c) => F.drawMage(c, X, Y, 1, M.base, 1, { pose: "idle" })),
    cell("charge", (c) => F.drawMage(c, X, Y, 1, M.base, 1, { pose: "charge" })),
    cell("cast", (c) => F.drawMage(c, X, Y, 1, M.base, 1, { pose: "cast" })),
  ]],
  ["mage\nlevel 2-3", [
    cell("L2 idle", (c) => F.drawMage(c, X, Y, 1, M.a, 2, { pose: "idle" })),
    cell("L2 charge", (c) => F.drawMage(c, X, Y, 1, M.a, 2, { pose: "charge" })),
    cell("L2 cast", (c) => F.drawMage(c, X, Y, 1, M.a, 2, { pose: "cast" })),
    cell("L3 idle", (c) => F.drawMage(c, X, Y, 1, M.b, 3, { pose: "idle" })),
    cell("L3 charge", (c) => F.drawMage(c, X, Y, 1, M.b, 3, { pose: "charge" })),
    cell("L3 cast", (c) => F.drawMage(c, X, Y, 1, M.b, 3, { pose: "cast" })),
  ]],
  ["priest", [
    cell("folded", (c) => F.drawPriest(c, X, Y, 1, P.base, false)),
    cell("raised", (c) => F.drawPriest(c, X, Y, 1, P.b, true)),
  ]],
  ["smith", [
    cell("swing 0 (down)", (c) => F.drawSmith(c, X, Y, 1, C.smith, 0)),
    cell("swing 1 (up)", (c) => F.drawSmith(c, X, Y, 1, C.smith, 1)),
  ]],
  ["crew\n(winch)", [0, 1, 2, 3].map((w) => cell(`work ${w}`, (c) => F.drawCrew(c, X, Y, 1, C.engineer, (w - 1.5) * 0.4)))],
  ["bomber\nalchemist", [
    cell("held", (c) => F.drawBomber(c, X, Y, 1, C.bomber, false)),
    cell("throwing", (c) => F.drawBomber(c, X, Y, 1, C.bomber, true)),
    cell("alch held", (c) => F.drawBomber(c, X, Y, 1, ALCH, false)),
    cell("alch throwing", (c) => F.drawBomber(c, X, Y, 1, ALCH, true)),
  ]],
  ["musketeer\nmistress", [
    cell("musket", (c) => F.drawMusketeer(c, X, Y, 1, C.musketeer, 0)),
    cell("mistress", (c) => F.drawMistress(c, X, Y, 1, C.mistress)),
    cell("court", (c) => F.drawMistress(c, X, Y, 1, C.mistressCourt)),
  ]],
  ["standers\nhooded", [
    cell("clerk", (c) => F.drawStander(c, X, Y, 1, C.clerk)),
    cell("hooded", (c) => F.drawHooded(c, X, Y, 1, C.blade)),
  ]],
  ["castle wall", [
    cell("halberdier", (c) => F.drawHalberdier(c, X, Y, 1, W.guard)),
    cell("mason 0", (c) => F.drawMason(c, X, Y, 1, W.mason, 0)),
    cell("mason 1", (c) => F.drawMason(c, X, Y, 1, W.mason, 1)),
    cell("bowman draw", (c) => F.drawArcher(c, X, Y, 1, W.bowman, 1)),
  ]],
];
