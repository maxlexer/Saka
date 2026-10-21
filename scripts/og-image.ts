import sharp from "sharp";
import { A, K, PARFUM, S } from "../src/components/logo-paths.ts";

// 1200 by 630 social image: the real logo geometry centered on cream.
const INK = "#171A12";
const parfum = PARFUM.map(({ x, d }) => `<path d="${d}" transform="translate(${x} 0)"/>`).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FAF6EE"/>
  <g transform="translate(320 223) scale(2.8)">
    <path d="${S}" fill="none" stroke="${INK}" stroke-width="5"/>
    <path d="${A}" fill="${INK}" fill-rule="evenodd"/>
    <path d="${K}" fill="${INK}"/>
    <path d="${A}" fill="${INK}" fill-rule="evenodd" transform="translate(113 0)"/>
    <g transform="translate(0 53.6)" fill="none" stroke="${INK}" stroke-width="1.3">${parfum}</g>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile("public/og.png");
console.log("wrote public/og.png");
