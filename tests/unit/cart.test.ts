import { describe, expect, it } from "vitest";
import { addLine, setLineQty } from "@/lib/cart";

const line = (productId: string, sizeMl: 10 | 20 | 50, qty: number) => ({ productId, sizeMl, qty });

describe("addLine", () => {
  it("adds a new line", () => {
    expect(addLine([], line("a", 10, 1))).toEqual([line("a", 10, 1)]);
  });
  it("merges the same product and size", () => {
    expect(addLine([line("a", 10, 2)], line("a", 10, 3))).toEqual([line("a", 10, 5)]);
  });
  it("keeps different sizes as separate lines", () => {
    expect(addLine([line("a", 10, 1)], line("a", 20, 1))).toHaveLength(2);
  });
  it("caps quantity at 10", () => {
    expect(addLine([line("a", 10, 8)], line("a", 10, 5))[0].qty).toBe(10);
  });
  it("ignores new lines beyond 20", () => {
    const full = Array.from({ length: 20 }, (_, i) => line(`p${i}`, 10, 1));
    expect(addLine(full, line("extra", 10, 1))).toHaveLength(20);
  });
});

describe("setLineQty", () => {
  it("sets a quantity", () => {
    expect(setLineQty([line("a", 10, 1)], "a", 10, 4)).toEqual([line("a", 10, 4)]);
  });
  it("removes the line below 1", () => {
    expect(setLineQty([line("a", 10, 1), line("b", 20, 1)], "a", 10, 0)).toEqual([line("b", 20, 1)]);
  });
  it("caps at 10", () => {
    expect(setLineQty([line("a", 10, 1)], "a", 10, 99)[0].qty).toBe(10);
  });
});
