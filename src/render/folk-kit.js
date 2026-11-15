// ============ FOLK: THE POSE KIT ============
// What the surviving shot-point tables (folk-archer.js, folk-casters.js, folk-gunners.js) share.
// The body kit that drew the old tower crews is gone with them.

// numbers, and arrays / objects of them, blended a -> b
export const mixPose = (a, b, t) => {
  if (typeof a === "number") return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((v, i) => mixPose(v, b[i], t));
  if (a && typeof a === "object") { const o = {}; for (const k in a) o[k] = k in b ? mixPose(a[k], b[k], t) : a[k]; return o; }
  return t < 0.5 ? a : b;
};
