import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/catalog";
import { EMPTY_SELECTION, findMatches, isEmptySelection, parseSelection, selectionToQuery, toggle } from "@/lib/finder";

const product = (id: string, over: Partial<Product> = {}) =>
  ({ id, name: id, vibes: [], occasions: [], family: "fresh", available: true, sort: 100, ...over }) as Product;

const rose = product("rose", { vibes: ["romantic", "calm"], occasions: ["date_night"], family: "oriental", sort: 20 });
const cedar = product("cedar", { vibes: ["calm", "earthy"], occasions: ["work", "everyday"], family: "woody", sort: 10 });
const citrus = product("citrus", { vibes: ["fresh"], occasions: ["everyday"], family: "fresh", sort: 30 });
const all = [rose, cedar, citrus];

describe("findMatches", () => {
  it("returns nothing for an empty selection", () => {
    expect(findMatches(all, EMPTY_SELECTION)).toEqual({ matches: [], close: [] });
  });
  it("uses OR within a group", () => {
    const { matches } = findMatches(all, { ...EMPTY_SELECTION, vibes: ["fresh", "romantic"] });
    expect(matches.map((p) => p.id).sort()).toEqual(["citrus", "rose"]);
  });
  it("uses AND across groups", () => {
    const { matches } = findMatches(all, { vibes: ["calm"], occasions: ["everyday"], families: [] });
    expect(matches.map((p) => p.id)).toEqual(["cedar"]);
  });
  it("sorts available first, then matched tags, then shelf order", () => {
    const sold = product("sold", { vibes: ["calm", "earthy"], sort: 1, available: false });
    const two = product("two", { vibes: ["calm", "earthy"], sort: 50 });
    const one = product("one", { vibes: ["calm"], sort: 5 });
    const { matches } = findMatches([sold, one, two], { ...EMPTY_SELECTION, vibes: ["calm", "earthy"] });
    expect(matches.map((p) => p.id)).toEqual(["two", "one", "sold"]);
  });
  it("offers close matches (most groups matched) when nothing matches everything", () => {
    const { matches, close } = findMatches(all, { vibes: ["calm"], occasions: ["date_night"], families: ["woody"] });
    expect(matches).toEqual([]);
    expect(close.map((p) => p.id).sort()).toEqual(["cedar", "rose"]);
  });
  it("offers no close matches when no product matches any group", () => {
    expect(findMatches([citrus], { vibes: ["bold"], occasions: [], families: [] })).toEqual({ matches: [], close: [] });
  });
});

describe("selection helpers", () => {
  it("detects an empty selection", () => {
    expect(isEmptySelection(EMPTY_SELECTION)).toBe(true);
    expect(isEmptySelection({ ...EMPTY_SELECTION, vibes: ["calm"] })).toBe(false);
  });
  it("toggles a value in a list", () => {
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
  });
  it("round trips through the query string and ignores unknown values", () => {
    const query = selectionToQuery({ vibes: ["calm", "fresh"], occasions: ["date_night"], families: [] });
    expect(parseSelection(new URLSearchParams(query))).toEqual({ vibes: ["calm", "fresh"], occasions: ["date_night"], families: [] });
    expect(parseSelection(new URLSearchParams("?vibe=calm,nonsense&family=woody"))).toEqual({ vibes: ["calm"], occasions: [], families: ["woody"] });
    expect(selectionToQuery(EMPTY_SELECTION)).toBe("");
  });
});
