const INK = "#171A12";
const CREAM = "#FAF6EE";
const SURFACE = "#F2EBDF";
const BORDER = "#DCD0BF";

/**
 * Draws a placeholder bottle at `angle` degrees of turn. Hatched label marks it as a placeholder.
 * @param {{ width?: number, height?: number, angle?: number, fill?: string, tick?: number, ticks?: number, backdrop?: boolean }} [options]
 */
export function bottleSvg({ width = 720, height = 960, angle = 0, fill = BORDER, tick, ticks = 24, backdrop = true } = {}) {
  const rad = (angle * Math.PI) / 180;
  const cx = width / 2;
  const bodyW = 300 * (0.62 + 0.38 * Math.abs(Math.cos(rad)));
  const labelW = bodyW * 0.6 * Math.max(Math.cos(rad), 0.15);
  const labelX = cx + Math.sin(rad) * bodyW * 0.42 - labelW / 2;
  const top = height * 0.34;
  const bottom = height * 0.92;
  const marks =
    tick === undefined
      ? ""
      : Array.from({ length: ticks }, (_, i) =>
          `<rect x="${cx - ticks * 5 + i * 10}" y="${height - 28}" width="6" height="6" fill="${i === tick ? INK : BORDER}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="body"><rect x="${cx - bodyW / 2}" y="${top}" width="${bodyW}" height="${bottom - top}" rx="4"/></clipPath>
    <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${SURFACE}"/><rect width="3" height="12" fill="${INK}" opacity="0.5"/></pattern>
  </defs>
  ${backdrop ? `<rect width="${width}" height="${height}" fill="${CREAM}"/>
  <ellipse cx="${cx}" cy="${bottom + 6}" rx="${bodyW * 0.55}" ry="14" fill="${BORDER}" opacity="0.7"/>` : ""}
  <rect x="${cx - 45}" y="${top - 70}" width="90" height="72" fill="${fill}"/>
  <rect x="${cx - 65}" y="${top - 190}" width="130" height="124" rx="2" fill="${INK}"/>
  <rect x="${cx - bodyW / 2}" y="${top}" width="${bodyW}" height="${bottom - top}" rx="4" fill="${fill}"/>
  <g clip-path="url(#body)"><rect x="${labelX}" y="${top + 120}" width="${labelW}" height="230" fill="url(#hatch)" stroke="${INK}" stroke-width="2"/></g>
  ${marks}
</svg>`;
}
