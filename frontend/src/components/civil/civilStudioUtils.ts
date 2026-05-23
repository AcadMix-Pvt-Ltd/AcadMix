const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const safe = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const fmt = (value: number, digits = 2) => safe(value).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const fmtCompact = (value: number, digits = 1) => safe(value).toLocaleString('en-IN', { maximumFractionDigits: digits });

function svgPointer(event: React.PointerEvent, svg: SVGSVGElement | null) {
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return { x: 0, y: 0 };
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
}


export { clamp, safe, fmt, fmtCompact, svgPointer };
