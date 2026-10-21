import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogRows, type CatalogFile } from "../../scripts/lib/catalog-rows.ts";
import { seedSql } from "../../scripts/seed-sql.ts";

const file: CatalogFile = {
  prices: { "10": 12, "20": 22, "50": 48 },
  products: [
    { slug: "terre-d-hermes", name: "Hermès Terre d'Hermès", family: "woody", description: "Earthy.", notes_top: ["Orange"], notes_heart: [], notes_base: ["Vetiver", "Cedar"], mood: "Grounded", occasion: "Work", vibes: ["earthy"], occasions: ["work"], available: true },
    { slug: "cool-water", name: "Davidoff Cool Water", family: "fresh", description: "Crisp.", notes_top: [], notes_heart: [], notes_base: [], mood: "Clean", occasion: "Everyday", vibes: [], occasions: [], available: false },
  ],
};

describe("catalogRows", () => {
  it("numbers shelf order in steps of ten and turns prices into rows", () => {
    const { products, prices } = catalogRows(file);
    expect(products.map((p) => p.sort)).toEqual([10, 20]);
    expect(prices).toEqual([{ size_ml: 10, price_usd: 12 }, { size_ml: 20, price_usd: 22 }, { size_ml: 50, price_usd: 48 }]);
  });
});

describe("seedSql", () => {
  const sql = seedSql(file);
  it("escapes single quotes in text and arrays", () => {
    expect(sql).toContain("'Hermès Terre d''Hermès'");
  });
  it("writes text arrays and empty arrays", () => {
    expect(sql).toContain("array['Vetiver', 'Cedar']");
    expect(sql).toContain("'{}'::text[]");
  });
  it("never overwrites staff edits on rerun", () => {
    expect(sql).toContain("on conflict (slug) do nothing");
    expect(sql).toContain("on conflict (size_ml) do nothing");
  });
  it("keeps availability and shelf order", () => {
    expect(sql).toMatch(/'cool-water'.*false, 20\)/);
  });
});

it("the committed seed migration matches catalog.json (run npm run seed:sql after editing it)", () => {
  const read = (path: string) => readFileSync(path, "utf8").replaceAll("\r\n", "\n");
  expect(read("supabase/migrations/20261019000100_catalog_seed.sql")).toBe(seedSql(JSON.parse(read("supabase/seed/catalog.json"))));
});
