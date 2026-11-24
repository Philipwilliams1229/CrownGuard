// Round 14, option C (Fable): see art/briefs/fx-round14.md.
// Round 13's jet kept (one flame leaving the staff, bowing a little on its way down), with everything on the ground gone,
// and pushed toward the owner's reference: a needle at the staff, widening all the way, a dense mottled body with a pale
// core line, ragged licks on both edges, a big rounded head that sits ON the foes at the far half of the damage wedge.
import * as K from "./fx-r14-kit.js";
const { TAU, N, CONE, NW, FIRE, H, bay, cl, P, Lart, aimAt, mkT, hallAt, mouthOf, road, GOB, gobItem, gobStat, pool, sparks, tinted } = K;

const RAMP = ["#fffbe0", "#ffe27a", "#ffb030", "#ff8c28", "#f26a1c", "#c03020", "#8a2028"];   // white, pale gold, gold, orange, deep orange, red, the line
const frac = (v) => v - Math.floor(v);
const sstep = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const HEAD = 0.75, LIFT = 11, PN = 96, CA = 8, CD = 5, NC = PN / CA;      // head's place along the reach; chest height; the mottle's period and cell size

// the mottle: stretched cells that ride down the jet (periodic along it, so the loop closes)
const cells = (a, d) => {
  const ca = Math.floor(a / CA), cd = Math.floor(d / CD);
  let f1 = 1e9, f2 = 1e9, id = 0;
  for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const ia = ca + k, wa = ((ia % NC) + NC) % NC, id2 = wa * 37 + (cd + j) * 101;
    const fx = (ia + 0.15 + 0.7 * H(id2, 1)) * CA, fy = (cd + j + 0.15 + 0.7 * H(id2, 2)) * CD;
    const dd = Math.hypot((a - fx) * 0.75, d - fy);
    if (dd < f1) { f2 = f1; f1 = dd; id = id2; } else if (dd < f2) f2 = dd;
  }
  return { edge: f2 - f1, id };
};

const jet = (c, mask, M, E, i) => {
  // the spine: nearly straight, a slight bow (the breath leaves level and leans down), ending at the head's middle
  const C = { x: M.x + (E.x - M.x) * 0.62, y: M.y + (E.y - M.y) * 0.3 }, KS = 64, S = [];
  for (let k = 0; k <= KS; k++) { const u = k / KS, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; S.push({ x: a * M.x + b * C.x + d * E.x, y: a * M.y + b * C.y + d * E.y, s: 0 }); }
  for (let k = 1; k <= KS; k++) S[k].s = S[k - 1].s + Math.hypot(S[k].x - S[k - 1].x, S[k].y - S[k - 1].y);
  const LEN = S[KS].s;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let k = 0; k <= KS; k++) {
    const p = S[Math.max(0, k - 1)], q = S[Math.min(KS, k + 1)], tx = q.x - p.x, ty = q.y - p.y, tl = Math.hypot(tx, ty) || 1;
    S[k].tx = tx / tl; S[k].ty = ty / tl; x0 = Math.min(x0, S[k].x); x1 = Math.max(x1, S[k].x); y0 = Math.min(y0, S[k].y); y1 = Math.max(y1, S[k].y);
  }
  const ph = i / N, flow = PN * ph, pad = 34, RH = 22;
  const Wd = (u) => 1.2 + 9 * Math.pow(u, 1.15) + (RH - 10.2) * sstep(0.62, 0.95, u);
  for (let y = Math.floor(y0 - pad); y <= Math.ceil(y1 + pad); y++) for (let x = Math.floor(x0 - pad); x <= Math.ceil(x1 + pad); x++) {
    const px = x + 0.5, py = y + 0.5;
    let best = 1e9, bk = 0;
    for (let k = 0; k <= KS; k++) { const dx = px - S[k].x, dy = py - S[k].y, d2 = dx * dx + dy * dy; if (d2 < best) { best = d2; bk = k; } }
    if (best > 34 * 34) continue;
    const s = S[bk], al = (px - s.x) * s.tx + (py - s.y) * s.ty;
    if (bk === 0 && al < -0.5) continue;
    const cap = bk === KS && al > 0, d = Math.sqrt(best), sd = (px - s.x) * s.ty - (py - s.y) * s.tx, side = sd > 0 ? 1 : -1;   // +1 = the upper side
    const a = s.s + (cap ? al : 0), u = cl(s.s / LEN);
    const surge = 1 + 0.09 * Math.sin((a / 30 - 2 * ph) * TAU) * Math.min(1, u * 2.5);
    const w = Wd(u) * surge;
    // the ragged edge: licks that ride down the jet, swept back, bigger toward the head; lobes round the head
    let edge;
    if (cap) {
      const th = Math.atan2(sd, al), lob = Math.floor((th + 2) * 2.6), lp = (th + 2) * 2.6 - lob;
      const amp = 0.5 + 0.5 * Math.sin(TAU * (2 * ph + H(lob, 7)));
      edge = w * (1 + 0.1 * amp * Math.sin(lp * Math.PI) - 0.05) * (0.9 + 0.1 * Math.abs(Math.sin(th)));      // a touch blunt at the nose
    } else {
      const per = side > 0 ? 15 : 12, mv = side > 0 ? 5 : 6, q = a / per - mv * ph + (side > 0 ? 0 : 0.4), id = ((Math.floor(q) % mv) + mv) % mv, f = frac(q);
      const tooth = f < 0.72 ? Math.pow(f / 0.72, 1.6) : 1 - (f - 0.72) / 0.28;                                // rises slowly downstream, drops sharp: the tip points back
      const q2 = a / 5.5 - 9 * ph * (side > 0 ? 1 : 2), nib = Math.abs(frac(q2) - 0.5) * 2;
      const amp = (0.16 + 0.34 * u) * Math.min(1, u * 5) * (0.55 + 0.75 * H(id, side + 3)) * (1 - 0.5 * sstep(0.85, 1, u));
      edge = w * (1 + amp * tooth) + nib * Math.min(1.6, u * 6) - 0.4;
    }
    if (d > edge) continue;
    // tone: the pale core line, then mottled cells, redder to the rim and round the head's nose
    const g = d / w, wav = Math.sin((a / 26 - 3 * ph) * TAU) * w * 0.13, dc = Math.abs(sd - wav);
    const ce = cells(a - flow, sd + 200), hc = H(ce.id, 5);
    const coreW = 0.6 + w * 0.17 * (1 - 0.7 * u), nose = cap ? cl(al / w) : 0;
    let t;
    if (u < 0.13) t = dc < coreW ? 0 : g < 0.8 ? 1 : 2;                                                  // the needle: white, pale gold
    else if (dc < coreW && u < 0.97 && !(u > 0.6 && hc < (u - 0.6) * 1.6) && !cap) t = u < 0.3 ? 0 : 1;   // the core line, breaking up in the head
    else {
      const base = 1.85 + 1.9 * g + 0.9 * u * g + 1.3 * nose * nose - (dc < coreW * 2.4 ? 0.9 : 0);
      t = base + (hc < 0.26 ? 1.15 : hc > 0.62 ? -1.05 : 0) + (ce.edge < 1.2 ? 0.95 : 0) + (bay(x & 1023, (y + 512) & 1023) - 0.5) * 0.5;
      t = Math.round(cl(t, g < 0.55 ? 1 : 2, g > 0.72 || nose > 0.6 ? 5 : 4));
    }
    if (d > edge - 1.1) t = u < 0.1 ? 2 : d > w * 1.04 || u > 0.5 ? 5 : 4;                                 // the rim
    P(c, x, y, RAMP[t]);
    if (mask) mask.fillRect(x + NW.ax, y + NW.ay, 1, 1);
  }
  // the nozzle: a white spark at the staff's head
  const fl = [0, 1, 0, 1][i % 4];
  P(c, M.x, M.y, RAMP[0]); P(c, M.x - 1, M.y, RAMP[1]); P(c, M.x, M.y - 1, RAMP[1]); P(c, M.x, M.y + 1, RAMP[1]);
  if (fl) { P(c, M.x - 2, M.y, RAMP[2]); P(c, M.x, M.y - 2, RAMP[2]); P(c, M.x, M.y + 2, RAMP[2]); }
};

let maskCv, tmpCv;
export const paint = (c, e) => {
  const ang = aimAt(e.i), t = mkT(ang), time = 1.2, M = mouthOf(t), L = Lart(), items = [];
  const G = { x: Math.cos(ang) * L * HEAD, y: Math.sin(ang) * L * HEAD }, E = { x: G.x, y: G.y - LIFT };
  if (!maskCv) { maskCv = document.createElement("canvas"); tmpCv = document.createElement("canvas"); maskCv.width = tmpCv.width = NW.cw; maskCv.height = tmpCv.height = NW.ch; }
  const mk = maskCv.getContext("2d"); mk.clearRect(0, 0, NW.cw, NW.ch); mk.fillStyle = "#000";
  road(c, e.ground === "dark");
  pool(c, ang, 0.5, 1);
  hallAt(c, t, time);
  GOB.forEach((g, k) => items.push(gobItem(c, e, g, k, ang, 1)));
  const jy = G.y + 3;
  items.push({ y: jy, draw: () => jet(c, mk, M, E, e.i) });
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  // a goblin standing behind the flame shows through it, reddened
  const PXv = K.PXu(), tc = tmpCv.getContext("2d");
  GOB.forEach((g, k) => {
    const x = g[0] * PXv, y = g[1] * PXv; if (y >= jy) return;
    const f = (e.i + k * 3) % 8, s = K.G.rigFrame("goblin", "walk", f, ""), ax = Math.round(s.ax * PXv), ay = Math.round(s.ay * PXv);
    tc.globalCompositeOperation = "source-over"; tc.clearRect(0, 0, NW.cw, NW.ch);
    tc.save(); tc.translate(NW.ax + x, NW.ay + y); tc.scale(-1, 1); tc.drawImage(s.cv, -ax, -ay); tc.globalAlpha = 0.55; tc.drawImage(tinted(s, "#e0561c", "c14" + f), -ax, -ay); tc.globalAlpha = 1; tc.restore();
    tc.globalCompositeOperation = "destination-in"; tc.drawImage(maskCv, 0, 0);
    c.globalAlpha = 0.8; c.drawImage(tmpCv, -NW.ax, -NW.ay); c.globalAlpha = 1;
  });
  sparks(c, ang, e.i, 9, 0.5, 0.62, 34);
};

export const note = "C (Fable), Round 13's jet without anything on the ground, brought to the reference: ONE flame leaves the staff as a thin white needle with a spark at its tip, bows only slightly, and widens the whole way into a big rounded head that sits on the goblins in the far half of the damage wedge (it reaches them instead of landing short). The body is dense and mottled (gold, orange and deep orange cells riding down the jet, a pale core line through most of its length, redder at the rim and round the head's nose), with small swept-back licks along both edges that grow toward the head. Nothing stands on the road: no flame patches, no splash, no surges; only a warm glow under the breath, a few sparks lifting off the head, and the goblins inside it showing through it, reddened (those in front of it are drawn over it). No smoke.";
