import { describe, expect, it } from "vitest";
import { lut, STOPS } from "../../scripts/grade-floor.ts";

const hex = (table: Uint8Array, i: number) => "#" + [...table.slice(i * 3, i * 3 + 3)].map((v) => v.toString(16).padStart(2, "0")).join("");

describe("lut", () => {
  it("starts and ends exactly on palette colors", () => {
    const light = lut(STOPS.light);
    expect(hex(light, 0)).toBe(STOPS.light[0].toLowerCase());
    expect(hex(light, 255)).toBe(STOPS.light.at(-1)?.toLowerCase());
    const dark = lut(STOPS.dark);
    expect(hex(dark, 0)).toBe(STOPS.dark[0].toLowerCase());
    expect(hex(dark, 255)).toBe(STOPS.dark.at(-1)?.toLowerCase());
  });
  it("only gets lighter as luminance rises, so tones never invert", () => {
    for (const table of [lut(STOPS.light), lut(STOPS.dark)]) {
      const sum = (i: number) => table[i * 3] + table[i * 3 + 1] + table[i * 3 + 2];
      for (let i = 1; i < 256; i++) expect(sum(i)).toBeGreaterThanOrEqual(sum(i - 1));
    }
  });
  it("uses only palette stops", () => {
    const palette = ["#171A12", "#23261C", "#3A3A2C", "#393625", "#685846", "#8C7964", "#AD9883", "#DCD0BF", "#F2EBDF", "#FAF6EE"];
    [...STOPS.light, ...STOPS.dark].forEach((stop) => expect(palette).toContain(stop));
  });
});
