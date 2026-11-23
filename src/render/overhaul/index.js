// The overhaul's switch and slot registry (art/briefs/overhaul-build-millrace.md, section 1).
//
// A realm with `look: "overhaul"` (Millrace, for now) draws its scenery, water, bridges and ground
// through the SLOTS below; every other realm never reaches them. Each seam in a shared file reads
//     ovhOn() ? OVH.x(...) : <today's call, unchanged>
// and every slot's DEFAULT is today's behaviour, so with nothing registered an overhaul realm is
// pixel-identical to today. A builder fills a slot from its own module:
//     import { register } from "./index.js";
//     register("waterLive", (ctx, g) => { ... });
// and its module is imported once from `src/render/overhaul/all.js` (the lead wires that file into
// draw.js when the first builder lands; until then nothing registers).
//
// CYCLES. This file imports only data modules (maps.js for REALM, terrain.js for bridgeLift), never
// a render module. Today's functions that live in render files (world.js bakeWater, water.js
// drawWaterLive, bridge.js drawBridges / pushBridgeFronts / drawnSpans, daygrade.js's water test,
// scenery.js drawRiver) are INJECTED as defaults by the files that already import them, through
// `setDefaults({...})` at their module load. A slot called before its default is injected throws a
// clear error (it never happens in the game: each seam's own file injects before it can call).
// Builders' modules may import world.js, scenery.js, pix.js etc. but must use them only inside
// functions, never at module load.
//
// FLAGS. Some of today's pieces must go away under the overhaul (the wood's hem, the butterflies,
// the bridges' cast shadow). Turning them off on `ovhOn()` alone would change the picture with only
// stubs, so each is gated on `OVH.flags.<name>` too, default true = "keep today's"; the builder who
// replaces the piece sets it false from its module:  OVH.flags.hem = false;
//
// Bake vs frame: slots marked BAKE run inside a cached bake (world.js groundLayer, apron.js
// paintApron, daygrade.js's water mask, weatherfx.js's memo); per-sun bakes must be dropped on the
// sun's `onDay` (src/data/sun.js). Only world.js's groundLayer key carries OVH.key(): daygrade's water
// mask (openWater) is baked per sun and board, weatherfx's decks (drawnSpans) once per realm, and the
// apron per realm / screen / sun, so those take a new answer only on a new sun, realm or page load.
// Slots marked FRAME run every draw() call: blits only, no
// getImageData, no per-pixel work.

import { REALM } from "../../data/maps.js";
import { bridgeLift } from "../../data/terrain.js";

// is the realm loaded now an overhaul realm?
// labs only: `?ovh=1` in a lab page's URL turns the overhaul on for whatever realm is loaded (so a board can be
// built and checked before its realm data opts in); `?ovh=0` turns it off (a BEFORE shot of an opted-in board)
const LAB = typeof location !== "undefined" ? (/[?&]ovh=1/.test(location.search) ? 1 : /[?&]ovh=0/.test(location.search) ? -1 : 0) : 0;
export const ovhOn = () => (LAB ? LAB > 0 : !!REALM && REALM.look === "overhaul");
// the overhaul realm's season ("summer" for Millrace); only overhaul modules read it
export const ovhSeason = () => (REALM && REALM.season) || "summer";

const noop = () => {};
const need = (name) => () => { throw new Error(`overhaul: slot "${name}" has no default injected yet`); };

// today's behaviour, slot by slot (render-file defaults are filled in by setDefaults)
const DEFAULTS = {
  // FRAME, first thing in draw() (before anything is painted). (g) -> nothing.
  // For per-frame bookkeeping: e.g. note which halls / build ghost stand behind a crown.
  // Default: nothing.
  frame: noop,
  // BAKE, world.js groundLayer, after paintTurf and the realm's turf art, BEFORE paintRoad.
  // (ctx, kit) -> nothing. ctx is the ground layer (world units, scaled by RES); kit = { clear, rng, SW }
  // as the realms' turf art gets. Paint the meadow here. Default: nothing.
  ground: noop,
  // BAKE, world.js groundLayer, after paintRoad and the road art, BEFORE bakeWater.
  // (ctx) -> nothing. Marks that lie over the road's verge (trampled edges, damp turf). Default: nothing.
  groundMarks: noop,
  // BAKE, world.js groundLayer: replaces bakeWater(ctx) (rivers, ponds baked into the ground).
  // (ctx) -> nothing. Default: today's bakeWater (water.js, injected by world.js).
  bakeWater: need("bakeWater"),
  // FRAME, draw.js after the ground blit: replaces drawWaterLive(ctx, g) (the moving water).
  // (ctx, g) -> nothing. Default: today's drawWaterLive (water.js, injected by draw.js).
  waterLive: need("waterLive"),
  // BAKE, daygrade.js's water mask (the hour's glints and sheen go only on water): replaces its wetAt.
  // (x, y) board units -> boolean (true = open water there). Default: today's daygrade wetAt (injected).
  // B1 also exports its own openWater for the other builders; this slot is the daygrade's read.
  openWater: need("openWater"),
  // FRAME, draw.js, after the skiffs under spans: replaces drawBridges(ctx, g) (every span's back
  // layer: under the walkers). (ctx, g) -> nothing. Default: today's drawBridges (bridge.js, injected).
  bridgesBack: need("bridgesBack"),
  // FRAME, draw.js, just before the actors are sorted: replaces pushBridgeFronts(list, ctx).
  // (list, ctx) -> nothing; push { y, fn } entries (y = sort key, fn draws) onto list.
  // Default: today's pushBridgeFronts (bridge.js, injected).
  bridgeFronts: need("bridgeFronts"),
  // FRAME, draw.js onDeck (every walker) and builders.js wetAt: replaces bridgeLift(x, y).
  // (x, y) -> number, board units a figure there is drawn raised (0 off every deck).
  // Default: today's bridgeLift (data/terrain.js). ENGINE NEVER READS THIS: art only.
  deckLift: (x, y) => bridgeLift(x, y),
  // BAKE (memoised per realm in weatherfx.js): replaces drawnSpans() (the decks as drawn, which
  // puddles and floods are clipped off). () -> [{ x, y, a, d0, d1, ... }] as bridge.js endsOver.
  // Default: today's drawnSpans (bridge.js, injected by weatherfx.js).
  drawnSpans: need("drawnSpans"),
  // asked per DECOR piece by scenery.js drawTree / decorShadowItem: (d) -> boolean, true = the
  // overhaul draws this piece (then drawDecor / shadowItem are used for it instead of today's).
  // ALSO asked by apron.js for the land beyond the board: its own generated pieces (not in DECOR) and
  // the board pieces that cross the board's edge, drawn there with time 0 (DECOR.includes(d) tells
  // them apart). Asked ~1-2k times per bake and per frame: keep it a Set lookup or a field test.
  // Default: false (today draws every piece).
  owns: () => false,
  // FRAME, scenery.js drawTree, only for a piece owns(d) claimed: (ctx, d, time) -> nothing.
  // Called inside the y-sorted actors at d.y + 14 (draw.js's DECOR loop), NOT mirrored, NOT lifted:
  // the builder handles the sun's side itself. Default: nothing (never called while owns is false).
  drawDecor: noop,
  // BAKE (cast shadows, world.js groundLayer and the apron's edge casters), only for an owned piece:
  // (d) -> null | { sp: { cv, hw, top, bot }, x, y, lift, mirror, round } as scenery.js
  // decorShadowItem returns (or { pre } a pre-baked shadow canvas, see sceneryday.js). Default: null.
  shadowItem: () => null,
  // BAKE, world.js groundLayer under a long-shadow sun (not at noon): () -> array of extra shadow
  // items (same shapes as shadowItem) for things that are not DECOR (the farm's buildings, bridges'
  // new piles...). Default: [].
  shadowExtras: () => [],
  // FRAME, draw.js right after the DECOR pieces are pushed: (list, ctx, g) -> nothing; push
  // { y, fn } standing things to be y-sorted with the actors. Default: nothing.
  drawables: noop,
  // FRAME, draw.js right after dayOver (the hour's colour), before ambient and weather:
  // (ctx, g) -> nothing. Over everything standing. Default: nothing.
  over: noop,
  // BAKE, apron.js paintApron, per edge strip a river crosses: replaces drawRiver(tc, rv, 0, R.water).
  // (ctx, rv, rect, k): ctx = the strip's canvas, already transformed to world units; rv = the river
  // (RIVERS entry); rect = [x0, y0, x1, y1] the strip in world units; k = canvas px per world unit.
  // Default: today's drawRiver(ctx, rv, 0, REALM.water) (scenery.js, injected by apron.js).
  apronRiver: need("apronRiver"),
  // BAKE (apron.js layer(), right after the apron's ground is painted): (ctx, [x0, y0, x1, y1], k) -> nothing;
  // ctx is the apron ground canvas in its own pixels (k pixels a unit). Default: nothing. (B5: overhaul/apron.js)
  apronGround: () => {},
  // BAKE key: () -> string appended to world.js groundLayer's cache key (bump it when the overhaul's
  // ground must rebake, e.g. a season change). Default: "".
  key: () => "",
};

// what the builders registered (wins over DEFAULTS)
const IMPL = {};

// the slot table: stable wrappers, safe to capture at import time
export const OVH = { flags: { hem: true, butterflies: true, bridgeCast: true } };
for (const name of Object.keys(DEFAULTS)) OVH[name] = (...a) => (IMPL[name] || DEFAULTS[name])(...a);

// a builder fills a slot (the last registration wins; impl null puts the default back)
export function register(name, impl) {
  if (!(name in DEFAULTS)) throw new Error(`overhaul: no slot "${name}"`);
  if (impl == null) delete IMPL[name]; else IMPL[name] = impl;
}
// the shared files hand in today's functions (see CYCLES above)
export function setDefaults(fns) {
  for (const [name, fn] of Object.entries(fns)) {
    if (!(name in DEFAULTS)) throw new Error(`overhaul: no slot "${name}"`);
    DEFAULTS[name] = fn;
  }
}
// for labs: which slots a builder has filled
export const registered = () => Object.keys(IMPL);
