import { beforeEach, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })), headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ updateProduct: vi.fn(), updatePrices: vi.fn(), paidOrders: vi.fn(), paidSince: vi.fn() }));
vi.mock("@/lib/catalog", () => ({ getCatalog: vi.fn() }));

import { redirect } from "next/navigation";
import AdminProductsPage from "@/app/admin/(panel)/page";
import TransactionsPage from "@/app/admin/(panel)/transactions/page";
import { savePrices, saveProduct } from "@/app/admin/actions";
import { getCatalog } from "@/lib/catalog";
import * as db from "@/lib/supabase";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
};

beforeEach(() => vi.clearAllMocks());

// A layout check alone does not stop a page segment from rendering, so each page and action must check itself.
it.each([
  ["saveProduct", () => saveProduct(null, form({ slug: "aventus", name: "Renamed" }))],
  ["savePrices", () => savePrices(null, form({ "10": "1", "20": "2", "50": "3" }))],
  ["the products page", () => AdminProductsPage()],
  ["the transactions page", () => TransactionsPage({ searchParams: Promise.resolve({}) })],
])("%s sends a visitor without a session to the login page before reading or writing data", async (_, run) => {
  await expect(run()).rejects.toThrow("NEXT_REDIRECT");
  expect(redirect).toHaveBeenCalledWith("/admin/login");
  for (const call of [getCatalog, db.updateProduct, db.updatePrices, db.paidOrders, db.paidSince]) expect(call).not.toHaveBeenCalled();
});
