// ============ THE WEATHER FORECAST ============
// A small chip in the wave preview: the weather the next wave will bring
// (engine/weather.js `forecast`), an icon and a few words; nothing on a
// level without weather. Stages (engine/weather.js forecast): "Clear", a
// spell brewing (it rolls in during the wave), rolling in, at its height,
// passing. `compact` is the folded wave chip's version (the icon alone,
// nothing when clear).
// Pixel icons drawn as SVG rects, one per kind.

import { forecast } from "../engine/weather.js";

const PX = {
  // fog: three soft bars
  fog: [["#dfe4e2", [[2, 4, 10, 2], [0, 7, 14, 2], [3, 10, 9, 2]]]],
  // storm: a dark cloud and a yellow bolt
  storm: [["#a4aec2", [[2, 2, 10, 4], [1, 3, 12, 2]]], ["#f4e070", [[7, 6, 2, 2], [5, 8, 3, 2], [6, 10, 2, 3]]]],
  // grave mist: green-grey curls
  gravemist: [["#9ab49a", [[1, 4, 6, 2], [6, 6, 7, 2], [2, 9, 9, 2]]], ["#c4d4c0", [[3, 4, 2, 1], [8, 6, 2, 1]]]],
  // blizzard: flakes
  blizzard: [["#eef6ff", [[3, 2, 2, 2], [9, 3, 2, 2], [6, 6, 2, 2], [2, 9, 2, 2], [10, 10, 2, 2]]]],
  // clear: a pale sun
  clear: [["#f0d878", [[5, 3, 4, 8], [3, 5, 8, 4]]], ["#fff4c0", [[6, 5, 2, 2]]]],
  // eruptions: a falling ember rock
  eruption: [["#3a2420", [[6, 7, 5, 5]]], ["#f08838", [[7, 8, 2, 2], [3, 3, 2, 2], [1, 1, 2, 2]]]],
};

export const WeatherIcon = ({ kind, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" shapeRendering="crispEdges" aria-hidden="true">
    {(PX[kind] || []).map(([col, rects], i) => rects.map(([x, y, w, h], j) => <rect key={`${i}-${j}`} x={x} y={y} width={w} height={h} fill={col} />))}
  </svg>
);

export default function WeatherForecast({ g, wave, compact = false }) {
  const f = forecast(g, wave);
  if (!f) return null;
  const icon = f.stage === "clear" ? "clear" : f.kind;
  if (compact) return f.stage === "clear" ? null : <span title={f.text} style={{ display: "flex", alignItems: "center" }}><WeatherIcon kind={icon} size={14} /></span>;
  return (
    <div title={f.stage === "clear" ? "no weather is due during this wave" : f.sure ? "the weather this wave will bring" : "this weather may roll in during the wave"}
      style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "3px 6px", background: "rgba(20,26,36,0.55)", border: "2px solid var(--ink)", width: "fit-content" }}>
      <WeatherIcon kind={icon} size={16} />
      <span style={{ fontSize: 11, color: "var(--cream)", fontStyle: f.sure ? "normal" : "italic" }}>{f.text}</span>
    </div>
  );
}
