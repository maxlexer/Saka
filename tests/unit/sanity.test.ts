import { describe, expect, it, vi } from "vitest";
import { parseProducts, parseSettings } from "@/lib/sanity";

const valid = {
  id: "p1",
  name: "Jasmine Rain",
  slug: "jasmine-rain",
  description: "Jasmine after rain on warm stone.",
  notesTop: ["bergamot"],
  notesHeart: ["jasmine"],
  notesBase: null,
  scentFamily: ["floral"],
  vibes: null,
  occasions: ["everyday"],
  sizes: [{ sizeMl: 50, priceUsd: 48 }, { sizeMl: 10, priceUsd: 12 }],
  available: true,
  displayOrder: 10,
  image: { url: "/turntable/frame-00.webp", alt: "Jasmine Rain bottle", lqip: null },
  imageHover: { url: null, alt: null },
};

describe("parseProducts", () => {
  it("accepts a valid product, sorts sizes and turns nulls into empty lists", () => {
    const [p] = parseProducts([valid]);
    expect(p.sizes.map((s) => s.sizeMl)).toEqual([10, 50]);
    expect(p.notesBase).toEqual([]);
    expect(p.vibes).toEqual([]);
    expect(p.imageHover).toBeNull();
  });

  it("skips and logs products missing a name, image or size", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = [
      { ...valid, id: "a", name: "" },
      { ...valid, id: "b", image: null },
      { ...valid, id: "c", sizes: [] },
      valid,
    ];
    expect(parseProducts(bad).map((p) => p.id)).toEqual(["p1"]);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
});

describe("parseSettings", () => {
  it("falls back to placeholder text for a bad document", () => {
    expect(parseSettings(null).storeName).toBe("SAKA Parfum");
    expect(parseSettings({ storeName: 12 }).address).toBe("Cambodia");
  });

  it("keeps a valid document", () => {
    const s = parseSettings({ storeName: "SAKA Parfum", address: "Street 1", hours: [], phone: "012", mapUrl: "https://maps.app.goo.gl/x", socialLinks: [], stockUpdatedAt: null });
    expect(s.address).toBe("Street 1");
  });
});
