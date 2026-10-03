// ============ THE BUILD'S CLOCK ============
// A new hall is raised by a crew who run out of the castle gate (the build
// animation: render/buildanim.js, render/builders.js). The hall holds its
// fire — no shots, no aura, its knights, blades and skiffs kept back — until
// its person is put in at `personAt`. This clock is the one both the engine
// and the animation read, so the first shot leaves with the person's landing.
// All times are game seconds (g.time); positions world units.

import { PTS } from "./path.js";
import { TOWERS } from "../data/towers.js";

export const BUILD = {
  run: 1100,                   // the crew's sprint, world units per game second: a timelapse dash
  runMin: 0.3, runMax: 0.55,   // one leg of the run, game seconds, however far the plot is
  stagger: 0.06,               // one builder after the next
  up: 0.24,                    // the scaffold going up
  lay: 1.05,                   // setting the pieces, however many there are
  drop: 0.13,                  // a piece's swing down onto its bed
  person: 0.22,                // the person's hop into place
  down: 0.34,                  // the scaffold coming down
};

// the gate the crew runs from: the road's last point, just inside the arch
export const buildGate = () => {
  const last = PTS[PTS.length - 1] || [756, 280];
  return { x: last[0] - 4, y: last[1] };
};

// The moments of a build begun at `at` for a hall of `kind` at (x, y): the
// crew arrives, the pieces go in (lay0–lay1), the person lands (personAt:
// the hall fights from here), the scaffold comes down (down0–down1), the
// crew is home.
export const buildClock = (kind, x, y, at) => {
  const narrow = !!(TOWERS[kind] || {}).roadClear;
  const gate = buildGate();
  const foot = y + 3 + (narrow ? 6 : 8) * 0.7;                    // the scaffold's front feet
  const run = Math.min(BUILD.runMax, Math.max(BUILD.runMin, Math.hypot(gate.x - x, gate.y - foot) / BUILD.run));
  const arrive = at + run, lay0 = arrive + 0.14, lay1 = lay0 + BUILD.lay;
  const personAt = lay1 + 0.06 + BUILD.person;
  const down0 = personAt + 0.12, down1 = down0 + BUILD.down;
  return {
    at, gate, run, arrive, lay0, lay1, personAt, down0, down1,
    end: down1 + 0.02,                                    // the raise is over: the plain hall
    leave: down0 + 0.04,                                  // the ground crew sets off home
    hop: [down0, down0 + 0.2],                            // the mason jumps down off the platform
    home: down0 + 0.2 + run + BUILD.stagger * 2 + 0.05,   // the last of them is back through the gate
  };
};

// Is the hall up and fighting? (A hall with no build pending always is.)
export const isBuilt = (t, g) => !(t.readyAt > g.time);

// Is the hall fighting right now? Built, and not shrouded in ice by a Rime
// Seer (engine/rime.js: t.iceLeft). Every hall's shots, auras, traps, skiffs,
// blades and garrison go through this gate; isBuilt alone still decides
// whether its people are on the field (a frozen hall's soldiers can be shot).
export const fights = (t, g) => !(t.readyAt > g.time) && !(t.iceLeft > 0);
