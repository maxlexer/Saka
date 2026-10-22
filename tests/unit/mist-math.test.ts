import { describe, expect, it } from "vitest";
import { createBudget, floorFrame, hexToRgb, toCanvasRect } from "@/lib/mist-math";

describe("hexToRgb", () => {
  it("converts a palette hex to 0 to 1 channels", () => {
    const [r, g, b] = hexToRgb("#F2EBDF");
    expect(r).toBeCloseTo(242 / 255);
    expect(g).toBeCloseTo(235 / 255);
    expect(b).toBeCloseTo(223 / 255);
  });
});

describe("toCanvasRect", () => {
  const hero = { left: 0, top: 0, height: 100 };
  it("pads, flips the y axis for WebGL and scales to canvas pixels", () => {
    expect(toCanvasRect({ left: 10, right: 30, top: 20, bottom: 40 }, hero, 0.5, 16)).toEqual([-3, 22, 23, 48]);
  });
  it("accounts for the hero offset on the page", () => {
    expect(toCanvasRect({ left: 110, right: 130, top: 520, bottom: 540 }, { left: 100, top: 500, height: 100 }, 1)).toEqual([10, 60, 30, 80]);
  });
});

describe("floorFrame", () => {
  it("fills the width of a wide hero, lifting it so the horizon sits at 75 percent of the hero", () => {
    const [, bottom, , h] = floorFrame(2400, 1000);
    expect(h).toBe(1600);
    // The horizon, measured down from the hero top.
    expect(1000 - (bottom + h * (1 - 0.5656))).toBeCloseTo(750);
  });
  it("pins a moderately wide hero to the top while its horizon is still above 75 percent", () => {
    expect(floorFrame(2400, 1500)).toEqual([0, -100, 2400, 1600]);
  });
  it("fills the height of a tall hero, centered, with nothing cropped vertically", () => {
    expect(floorFrame(400, 800)).toEqual([-400, 0, 1200, 800]);
  });
});

describe("createBudget", () => {
  it("trips after two seconds of slow frames in a row", () => {
    const over = createBudget();
    let tripped = false;
    for (let i = 0; i < 39; i++) tripped = over(50);
    expect(tripped).toBe(false);
    expect(over(50)).toBe(true);
  });
  it("resets when a frame is fast again", () => {
    const over = createBudget();
    for (let i = 0; i < 30; i++) over(50);
    over(33);
    for (let i = 0; i < 30; i++) expect(over(50)).toBe(false);
  });
});
