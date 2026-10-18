import { describe, expect, it } from "vitest";
import { computeTotals, formatRiel, formatUsd, priceOf, toRiel } from "@/lib/pricing";

describe("toRiel", () => {
  it("uses 4000 KHR per USD, rounded to 100", () => {
    expect(toRiel(18)).toBe(72000);
    expect(toRiel(2)).toBe(8000);
    expect(toRiel(0.01)).toBe(0);
    expect(toRiel(0.03)).toBe(100);
  });
});

describe("formatters", () => {
  it("formats Riel with thousands separators", () => {
    expect(formatRiel(30)).toBe("120,000 KHR");
  });
  it("formats USD with two decimals, or compact for whole amounts", () => {
    expect(formatUsd(18)).toBe("$18.00");
    expect(formatUsd(18, true)).toBe("$18");
    expect(formatUsd(18.5, true)).toBe("$18.50");
  });
});

describe("priceOf", () => {
  it("finds the price for a size", () => {
    const sizes = [{ sizeMl: 10, priceUsd: 12 }, { sizeMl: 20, priceUsd: 22 }];
    expect(priceOf(sizes, 20)).toBe(22);
    expect(priceOf(sizes, 50)).toBeUndefined();
  });
});

describe("computeTotals", () => {
  const lines = [{ priceUsd: 12, qty: 2 }, { priceUsd: 18.5, qty: 1 }];
  it("adds nothing for pickup", () => {
    expect(computeTotals(lines, "pickup")).toEqual({ subtotalUsd: 42.5, deliveryFeeUsd: 0, totalUsd: 42.5 });
  });
  it("adds the $2.00 delivery fee", () => {
    expect(computeTotals(lines, "delivery")).toEqual({ subtotalUsd: 42.5, deliveryFeeUsd: 2, totalUsd: 44.5 });
  });
  it("avoids floating point drift", () => {
    expect(computeTotals([{ priceUsd: 0.1, qty: 3 }], "pickup").subtotalUsd).toBe(0.3);
  });
});
