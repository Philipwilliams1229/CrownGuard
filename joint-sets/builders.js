// The build crew (folk.js drawWorker), every pose frame by frame.
import * as F from "/src/render/folk.js";
const B = F.BUILDER_FOLK, X = 18, Y = 42;
export const rows = Object.entries(F.WORKER_POSES).flatMap(([pose, n]) => ["mason", "hod", "setter"].map((look) => [
  `${pose}\n${look}`, Array.from({ length: n }, (_, f) => ({ note: `${pose} ${f}`, draw: (c) => F.drawWorker(c, X, Y, 1, B[look], pose, f, { look, load: look !== "mason", shadow: true }) })),
])).filter(([name]) => !name.startsWith("climb") || name.endsWith("mason"));
