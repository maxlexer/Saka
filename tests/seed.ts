import { readFileSync } from "node:fs";
import { catalogRows, type CatalogFile } from "../scripts/lib/catalog-rows.ts";

export const CATALOG: CatalogFile = JSON.parse(readFileSync(new URL("../supabase/seed/catalog.json", import.meta.url), "utf8"));
/** Out of stock in every test run, so the disabled add-to-cart path is always covered. */
export const OUT_OF_STOCK = "aventus";

export async function seedCatalog(url: string, key: string) {
  const headers = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
  const call = async (path: string, method: string, body?: unknown, prefer = "") => {
    const res = await fetch(`${url}/rest/v1/${path}`, { method, headers: { ...headers, prefer }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${await res.text()}`);
  };
  const { products, prices } = catalogRows(CATALOG);
  await call("products?slug=not.is.null", "DELETE");
  await call("products", "POST", products.map((p) => ({ ...p, available: p.slug !== OUT_OF_STOCK })));
  await call("size_prices", "POST", prices, "resolution=merge-duplicates");
  await call("admin_login_attempts?id=not.is.null", "DELETE");
}
