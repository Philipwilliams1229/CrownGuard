// ============ RAISING A HALL ============
// The moment a hall is bought, levelled, branched or ascended. The engine
// marks it (actions.js markRaised): t.raised = { at, how, prev } where `at`
// is g.time in seconds, `how` is "build" | "level" | "branch" | "ascend",
// and `prev` the form it had before ({ level, branch, rank4 }, null for a
// new hall). While RAISE_SECS[how] have not passed, draw.js hands the hall
// to drawRaising instead of painting it directly. `paint(t)` paints any form
// of it — pass a copy with other fields to paint the old one, e.g.
// paint({ ...t, ...t.raised.prev }). Visual only: the hall already fights.

export const RAISE_SECS = { build: 0.6, level: 0.45, branch: 0.7, ascend: 0.8 };

export const drawRaising = (ctx, t, time, paint) => {
  paint(t);
};
