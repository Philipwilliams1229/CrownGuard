# The overhaul across the whole Greenwood (2026-11-22, owner: "runs great, go ahead and apply to the whole first area")

The owner played the built Millrace ("runs great") and wants the same look on the other fourteen
Greenwood boards; after that, "we can begin looking at the iron marches" (concepts first: the owner
picks looks per area; do NOT start building Iron). Work autonomously; the owner is away.

Read first: `art/briefs/overhaul-build-millrace.md` (how the build works: the switch, slots, modules,
rules for builders, checks), `CLAUDE.md` "The overhaul, built", and `art/briefs/overhaul-round2.md`
(every owner pick). All of that still holds. This brief only adds the roll-out.

## The boards (realm ids, in campaign order)

greenwood (gw1), thornbrook (river 28), gullwick (COAST, fishing hamlet, old watchtower), millrace
(DONE), foxmere (pond), oakmere (pond), bramblewick (pond), barrowfields (dry), wolfrun (river 28, four
up-screen bridges), thistlecrag (dry; crags, heather), kingstones (dry; standing stones), ravenscar
(COAST), blackbriar (dry), cinderholt (dry), warrens (gw5, the boss; dry).

## How a board is worked on before it is switched on

`?ovh=1` in a lab URL turns the overhaul on for whatever realm the lab loads (`ovh=0` = off, for a
BEFORE shot): `ovh-millrace.html?realm=<id>&ovh=1&sun=<id>&frames=6&dt=150&tag=<prefix>_<realm>`.
The LEAD sets `look: "overhaul"` in a realm's data only after its board passes review. Builders
never edit realm data: they REPORT data they need (blocks ellipses, new rivers / ponds) and the lead
adds it.

## What each builder owes (same file ownership as the Millrace build)

- **B1 water** (`water.js`, `field.js`, `waterlive.js`, `waterlife.js`): every Greenwood water body in
  the approved looks. Rivers: Thornbrook, Wolfrun (plans in `PLANS`; one main edge kind a stretch, no
  shingle). PONDS as bodies of the field: the approved lakes from `concept/overhaul3-lakes.js`
  (`VARIETY`: Foxmere the long mere, Bramblewick the spring-fed tarn at its present size, Oakmere the
  reed fen / small mere with growth; ponds are SMALL LAKES, some with the lily / rush growth). The
  engine's pond stays its ellipse (buildability, River Watch): the painted shore must stay inside it or
  within a couple of units. COAST boards (Gullwick, Ravenscar): the sea stays TODAY's painter (coast.js);
  make sure the overhaul's `bakeWater` / `waterLive` / `openWater` still run today's sea there and only
  restyle any river. Dry boards: nothing (no errors, no cost). THEN, as a second step, the new water the
  owner approved on dry boards ("you can add more lakes and streams yes"): Barrowfields' stream,
  Kingstones' spring-fed mere + stream, Cinderholt's small reed fen, as in `NEWWATER`
  (`concept/overhaul3-lakes.js`, "Pass 5c"): this needs ENGINE DATA (a realm `rivers` / `ponds` entry),
  so report the exact data for the lead to add, and check it keeps off the road and the castle band.
- **B2 bridges** (`bridges.js`, `bridge-bake.js`): every Greenwood span. Kinds by the owner's picks: the
  toll trestle on main across spans, farm / plain trestles elsewhere, TODAY'S BRIDGE UPDATED for tight
  crossings where a trestle's ramps do not fit; Wolfrun's four up-screen spans are the test of the
  up-screen rule (vary them: not four identical trestles). Variety across boards. Report `bridgeBlocks`.
  Still owed from Millrace: the up-screen farm trestle reads as a plank way; across spans are bulky.
- **B3 trees and wildlife** (`trees.js`, `treeart.js`, `wood.js`, `sway.js`, `life.js`): works on every
  board without special cases failing: Thistlecrag's crag trees, coast boards (no willow strands into
  the sea unless it is water; marram stays today's), trees against the castle wall (the oak at Millrace
  ~720,349 runs under the wall: fix generally), the boss board. Keep the wood's bake count bounded on
  every board. Still owed: trees appear over the first frames of a level (bake what is on screen before
  the first frame is shown, or within the level's loading moment); sway too subtle; trees too bright
  under the Blood Moon (take the actors' shade like halls? check what halls do) and no long moon shadow.
- **B4 decor** (`decor.js`, `decor-kit.js`, `decor-layout.js`, `lights.js`): rocks by the rock rule on
  every board. PLACES, per the owner's picks: Gullwick's fishing hamlet keeps TODAY's cottages with the
  approved village details around them (fences, nets, well, lights; "details in the little village of B,
  but with the house styling of today"), its old tower and big rocks re-sculpted by the rock rule; the
  farm look (approved on Millrace) on at most two more boards where there is room away from the road
  (propose which; e.g. Bramblewick, Greenwood): a different layout each, compact; a ruin / chapel with
  the approved redraw where the concept had one. A light source in every lived-in place. Layouts keyed
  by realm in `decor-layout.js`; report each realm's `blocks`. Do not touch standing stones, crags,
  heather, mill, cottages' own sprites (today's), only add around them.
- **B5 ground** (`meadow.js`, `overhaul/apron.js`): the calm meadow on every board: Thistlecrag's crag
  ground and heather, Kingstones, the coast boards' sand and marram edge (the meadow must meet today's
  beach cleanly), the boss board. Variety between boards by seed (masses, where the stands and the
  flower drift lie), still calm. The apron on every board.

Every builder: check EVERY board at its own campaign sun (`src/data/sun.js` `SUN_PLAN.greenwood`, in the
order above) with `frames=6`, plus golden; fix what breaks; keep a table in your report: board | ok /
problem | shot. Budget in your task message. Same rules as before (own files only, no git, node
--check, never restart the dev server, delete scratch shots, report weak spots plainly).

## The lead's checks per board before switching it on

Combined shot at its own sun and golden; `node scripts/sim.mjs --level <id> --endure` (byte-identical
unless `blocks` / new water were added: then record old -> new); frame time (`&perf=1`) at most ~+1.5
ms over `ovh=0`; then `look: "overhaul"` in the realm data, `ovh-identity.html` for the other chapters,
commit. Push only when the Greenwood is whole and checked (the owner asked for the whole area).

## STATUS (the lead keeps this current; a resumed session starts here)

- 2026-11-22 22:30: brief written; `?ovh=1` lab switch added; builders starting. No board but Millrace
  is switched on. Nothing of the roll-out is pushed.
- 2026-11-22 22:40: usage limit reached before any builder was started. NOTHING of the roll-out is built yet:
  next step is to spawn the five builders (B1-B5 above), one per file-owner. Tree is clean and committed.
