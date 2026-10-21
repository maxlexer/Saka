import type { Product } from "./catalog";
import { OCCASIONS, SCENT_FAMILIES, VIBES, type Occasion, type ScentFamily, type Vibe } from "./taxonomy";

export type Selection = { vibes: Vibe[]; occasions: Occasion[]; families: ScentFamily[] };
export const EMPTY_SELECTION: Selection = { vibes: [], occasions: [], families: [] };

const KEYS = ["vibes", "occasions", "families"] as const;
const tagsOf = (p: Product, key: keyof Selection): string[] => (key === "families" ? [p.family] : p[key]);

export const isEmptySelection = (sel: Selection) => KEYS.every((key) => sel[key].length === 0);
export const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Groups with a choice (`active`), how many of them the product meets (`groups`) and how many chosen tags it carries (`tags`). */
function score(p: Product, sel: Selection) {
  let active = 0;
  let groups = 0;
  let tags = 0;
  for (const key of KEYS) {
    if (sel[key].length === 0) continue;
    active += 1;
    const hits = (sel[key] as string[]).filter((tag) => tagsOf(p, key).includes(tag)).length;
    if (hits > 0) groups += 1;
    tags += hits;
  }
  return { active, groups, tags };
}

const shelfOrder = (sel: Selection) => (a: Product, b: Product) =>
  Number(b.available) - Number(a.available) || score(b, sel).tags - score(a, sel).tags || a.sort - b.sort || a.name.localeCompare(b.name);

/** OR within a group, AND across groups. When nothing meets every group, `close` holds the products meeting the most. */
export function findMatches(products: Product[], sel: Selection) {
  if (isEmptySelection(sel)) return { matches: [], close: [] };
  const scored = products.map((product) => ({ product, ...score(product, sel) }));
  const matches = scored.filter((s) => s.groups === s.active).map((s) => s.product).sort(shelfOrder(sel));
  if (matches.length > 0) return { matches, close: [] };
  const best = Math.max(0, ...scored.map((s) => s.groups));
  const close = best > 0 ? scored.filter((s) => s.groups === best).map((s) => s.product).sort(shelfOrder(sel)) : [];
  return { matches, close };
}

const pick = <T extends string>(raw: string | null, allowed: readonly T[]) =>
  (raw ?? "").split(",").filter((value): value is T => (allowed as readonly string[]).includes(value));

export const parseSelection = (params: URLSearchParams): Selection => ({
  vibes: pick(params.get("vibe"), VIBES),
  occasions: pick(params.get("occasion"), OCCASIONS),
  families: pick(params.get("family"), SCENT_FAMILIES),
});

export function selectionToQuery(sel: Selection) {
  const params = new URLSearchParams();
  if (sel.vibes.length) params.set("vibe", sel.vibes.join(","));
  if (sel.occasions.length) params.set("occasion", sel.occasions.join(","));
  if (sel.families.length) params.set("family", sel.families.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
}
