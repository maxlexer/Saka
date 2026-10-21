import { createClient } from "@supabase/supabase-js";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startMock } from "../mock-server.mjs";

const URL = "http://127.0.0.1:4011";
let server: Server;
const db = createClient(URL, "mock", { auth: { persistSession: false } });

beforeAll(async () => {
  server = await startMock(4011);
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("mock PostgREST", () => {
  it("inserts, filters, orders and counts like supabase-js expects", async () => {
    await db.from("products").delete().not("slug", "is", null);
    await db.from("products").insert([
      { slug: "b", name: "B", sort: 20, available: true },
      { slug: "a", name: "A", sort: 10, available: false },
      { slug: "c", name: "C", sort: 30, available: true },
    ]);
    const ordered = await db.from("products").select("slug").order("sort");
    expect(ordered.data?.map((r) => r.slug)).toEqual(["a", "b", "c"]);
    const some = await db.from("products").select("slug").in("slug", ["c", "a"]).order("sort", { ascending: false });
    expect(some.data?.map((r) => r.slug)).toEqual(["c", "a"]);
    const { count } = await db.from("products").select("slug", { count: "exact", head: true }).eq("available", true);
    expect(count).toBe(2);
  });

  it("updates with a filter and returns the changed rows", async () => {
    const { data } = await db.from("products").update({ name: "Renamed" }).eq("slug", "b").select("slug");
    expect(data).toEqual([expect.objectContaining({ slug: "b" })]);
    const { data: row } = await db.from("products").select().eq("slug", "b").single();
    expect(row?.name).toBe("Renamed");
  });

  it("upserts on the primary key and pages with range", async () => {
    await db.from("size_prices").upsert([{ size_ml: 10, price_usd: 12 }, { size_ml: 20, price_usd: 22 }]);
    await db.from("size_prices").upsert([{ size_ml: 10, price_usd: 13.5 }]);
    const { data } = await db.from("size_prices").select().order("size_ml");
    expect(data).toEqual([expect.objectContaining({ size_ml: 10, price_usd: 13.5 }), expect.objectContaining({ size_ml: 20, price_usd: 22 })]);
    const page = await db.from("products").select("slug", { count: "exact" }).order("sort").range(1, 1);
    expect(page.data?.map((r) => r.slug)).toEqual(["b"]);
    expect(page.count).toBe(3);
  });

  it("generates ids and timestamps for identity tables and filters by time", async () => {
    await db.from("admin_login_attempts").insert({ ip_hash: "h" });
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await db.from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", "h").gte("created_at", since);
    expect(count).toBe(1);
  });
});
