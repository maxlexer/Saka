import { describe, expect, it, vi } from "vitest";
import { parseCatalog, previewPicks, toCartCatalog } from "@/lib/catalog";

const row = {
  slug: "cool-water", name: "Davidoff Cool Water", family: "fresh", description: "Crisp.",
  notes_top: ["Seawater"], notes_heart: ["Jasmine"], notes_base: ["Musk"],
  mood: "Crisp, clean, and effortless", occasion: "Everyday",
  vibes: ["fresh", "nonsense"], occasions: ["everyday"], available: true, sort: 30,
};
const prices = [{ size_ml: 10, price_usd: 12 }, { size_ml: 20, price_usd: "22.00" }, { size_ml: 50, price_usd: 48 }];

describe("parseCatalog", () => {
  it("maps rows to camel case products and keeps only known tags", () => {
    const { products } = parseCatalog([row], prices);
    expect(products[0]).toEqual({
      id: "cool-water", name: "Davidoff Cool Water", family: "fresh", description: "Crisp.",
      notesTop: ["Seawater"], notesHeart: ["Jasmine"], notesBase: ["Musk"],
      mood: "Crisp, clean, and effortless", occasion: "Everyday",
      vibes: ["fresh"], occasions: ["everyday"], available: true, sort: 30, moods: "Bright",
    });
  });
  it("reads numeric prices, including the string form Postgres can return", () => {
    expect(parseCatalog([row], prices).prices).toEqual({ 10: 12, 20: 22, 50: 48 });
  });
  it("skips a broken product with a warning and keeps the rest", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { products } = parseCatalog([{ ...row, family: "floral" }, { ...row, slug: "ok" }], prices);
    expect(products.map((p) => p.id)).toEqual(["ok"]);
    expect(warn).toHaveBeenCalledOnce();
  });
  it("refuses a catalog with a missing size price", () => {
    expect(() => parseCatalog([row], prices.slice(0, 2))).toThrow("size price");
  });
});

describe("toCartCatalog", () => {
  it("keeps only names by id and the shared prices", () => {
    expect(toCartCatalog(parseCatalog([row], prices))).toEqual({ names: { "cool-water": "Davidoff Cool Water" }, prices: { 10: 12, 20: 22, 50: 48 } });
  });
});

describe("previewPicks", () => {
  const p = (id: string, family: string, available = true) => ({ id, family, available }) as never;
  const shelf = [p("f1", "fresh"), p("f2", "fresh"), p("w1", "woody"), p("w2", "woody", false), p("w3", "woody"), p("o1", "oriental"), p("a1", "aromatic")];
  it("takes one per family in turn, skipping out of stock", () => {
    expect(previewPicks(shelf, 6).map((x: { id: string }) => x.id)).toEqual(["f1", "w1", "o1", "a1", "f2", "w3"]);
  });
  it("stops at the count and copes with a short shelf", () => {
    expect(previewPicks(shelf, 3).map((x: { id: string }) => x.id)).toEqual(["f1", "w1", "o1"]);
    expect(previewPicks([p("o1", "oriental")], 6).map((x: { id: string }) => x.id)).toEqual(["o1"]);
  });
});
