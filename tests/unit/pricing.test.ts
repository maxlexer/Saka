import { describe, expect, it } from "vitest";
import { computeTotals, formatUsd } from "@/lib/pricing";

describe("formatters", () => {
  it("formats USD with two decimals, or compact for whole amounts", () => {
    expect(formatUsd(18)).toBe("$18.00");
    expect(formatUsd(18, true)).toBe("$18");
    expect(formatUsd(18.5, true)).toBe("$18.50");
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
