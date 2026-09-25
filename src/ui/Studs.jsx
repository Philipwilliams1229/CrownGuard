// ============ STUDS ============
// Four gold rivets pinning the corners of an oak frame (see frames.js). The
// framed box must be position: relative.

const at = [["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]];

export default function Studs({ size = 9, inset = 1 }) {
  return at.map(([h, v]) => (
    <span key={h + v} aria-hidden="true" style={{
      position: "absolute", [h]: inset, [v]: inset, width: size, height: size, zIndex: 2, pointerEvents: "none",
      background: "#e8c65a", border: "2px solid #10131a", boxSizing: "border-box",
      boxShadow: "inset -2px -2px 0 #a8842a, inset 1px 1px 0 #fff3d2",
    }} />
  ));
}
