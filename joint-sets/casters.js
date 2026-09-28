// The casters — the wizard spire's mage and the warden's priest — in every
// frame their halls can show, in play order (the joint lab's "casters" set).
// Each mage cell also draws the orb where the hall puts it (mageTip) and
// notes the staff's angle off the forearm (the wrist: ~90° is a fist across
// the haft, 0° the staff carried on along the forearm's line, past ~120°
// the wrist would be folded back).
import * as F from "/src/render/folk.js";
import { mageRig, MAGE_CYCLE, PRIEST_FRAMES } from "/src/render/folk-casters.js";
import { elbowFor } from "/src/render/folk-kit.js";
import { ball } from "/src/render/paint.js";
const M = F.MAGE_FOLK, P = F.PRIEST_FOLK;
const X = 18, Y = 42;
const deg = (r) => Math.round((r * 180) / Math.PI);
const wrist = (level, pose) => {
  const R = mageRig(level, pose);
  if (!R.staff) return "";
  const el = elbowFor(R.nsh[0], R.nsh[1], R.hand[0], R.hand[1]);
  const f = [R.hand[0] - el[0], R.hand[1] - el[1]], d = R.staff.d;
  const c = (f[0] * d[0] + f[1] * d[1]) / Math.hypot(...f);
  return ` wrist ${deg(Math.acos(Math.max(-1, Math.min(1, c))))}°`;
};
const mage = (pal, level, pose, orbCol) => ({
  note: pose + wrist(level, pose),
  draw: (c) => {
    F.drawMage(c, X, Y, 1, pal, level, { pose });
    const [tx, ty] = F.mageTip(level, pose);
    ball(c, X + tx, Y + ty, level >= 3 ? 2.6 : 2.2, level >= 3 ? 2.6 : 2.2, orbCol, { hi: 0.6, lo: 0.3 });
  },
});
const CYCLE = ["idle", "idle2", ...MAGE_CYCLE.map(([, n]) => n)];
export const rows = [
  ["mage L1\n(apprentice)", CYCLE.map((p) => mage(M.base, 1, p, "#b08ad8"))],
  ["mage L2\n(staff)", CYCLE.map((p) => mage(M.a, 2, p, "#f0903a"))],
  ["mage L3\n(long-beard)", CYCLE.map((p) => mage(M.b, 3, p, "#8ce8f0"))],
  ["Dragon-\nbreath", ["ready", "level", "brace", "brace2"].map((p) => mage(M.ab, 3, p, "#f8b040"))],
  ["legacy\nnames", [mage(M.base, 1, "charge", "#b08ad8"), mage(M.base, 1, "cast", "#b08ad8"), mage(M.bb, 3, "charge", "#f0e070"), mage(M.bb, 3, "cast", "#f0e070")]],
  ...(PRIEST_FRAMES ? [
    ["priest\n(bless)", PRIEST_FRAMES.map((f) => ({ note: f, draw: (c) => F.drawPriest(c, X, Y, 1, P.base, f) }))],
    ["priest\nfinals", ["folded", "raised"].flatMap((f) => [P.ab, P.bb].map((pal) => ({ note: f, draw: (c) => F.drawPriest(c, X, Y, 1, pal, f) })))],
  ] : []),
];
