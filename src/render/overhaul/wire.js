// The overhaul's SHARED slots, combined (the lead's file). A slot that more than one builder needs is
// registered here, after every builder's module has loaded (overhaul/all.js imports this last), so it
// overrides any builder's own dev registration. Builders export their halves; they never edit this file.
//   trees (B3): ownsTree, drawTreeDecor, treeShadowItem, treeGroundMarks, treeFrame, treeDrawables, treeOver, treeKey
//   decor (B4): ownsDecor, drawDecorPiece, decorShadowItem, decorShadowExtras, decorDrawables, decorGroundMarks
//   bridges (B2): bridgeShadowExtras      meadow (B5): meadowKey, meadowGroundMarks
// `?b3off=1` in a lab's URL keeps today's trees (B3's own switch).
import { register, OVH } from "./index.js";
import * as T from "./trees.js";
import * as D from "./decor.js";
import * as B from "./bridges.js";
import * as M from "./meadow.js";
import * as WTR from "./water.js";
import { apronGround } from "./apron.js";

const treesOn = !(typeof location !== "undefined" && /[?&]b3off=1/.test(location.search));
const tree = (d) => treesOn && T.ownsTree && T.ownsTree(d);
const dec = (d) => D.ownsDecor && D.ownsDecor(d);
const each = (...fns) => (...a) => { for (const f of fns) if (f) f(...a); };

OVH.flags.butterflies = !treesOn;
register("owns", (d) => dec(d) || tree(d));
register("drawDecor", (ctx, d, t) => (dec(d) ? D.drawDecorPiece(ctx, d, t) : T.drawTreeDecor(ctx, d, t)));
register("shadowItem", (d) => (dec(d) ? D.decorShadowItem(d) : T.treeShadowItem(d)));
register("shadowExtras", () => [
  ...(D.decorShadowExtras ? D.decorShadowExtras() : []),
  ...(B.bridgeShadowExtras ? B.bridgeShadowExtras() : []),
]);
register("groundMarks", each(M.meadowGroundMarks, treesOn && T.treeGroundMarks, D.decorGroundMarks));
register("frame", each(treesOn && T.treeFrame));
register("drawables", each(treesOn && T.treeDrawables, D.decorDrawables));
register("over", each(treesOn && T.treeOver));
register("key", () => [M.meadowKey && M.meadowKey(), treesOn && T.treeKey && T.treeKey(), D.decorKey && D.decorKey(), B.bridgeKey && B.bridgeKey(), WTR.waterKey && WTR.waterKey()].filter(Boolean).join("."));
register("apronGround", apronGround);
register("overCastle", each(treesOn && T.treeOverCastle));
