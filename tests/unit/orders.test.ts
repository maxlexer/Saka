import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderRow } from "@/lib/supabase";

vi.mock("@/lib/supabase");
vi.mock("@/lib/khqr");
vi.mock("@/lib/catalog", () => ({ getCatalog: vi.fn() }));
vi.mock("@/lib/telegram", async (original) => ({ ...(await original<typeof import("@/lib/telegram")>()), sendMessage: vi.fn() }));

import { checkPaid, generateDeeplink, generateQr } from "@/lib/khqr";
import { createOrder, getOrderView, handleStart, notifyAdmin, OrderError, runDaily, settleOrder } from "@/lib/orders";
import { getCatalog } from "@/lib/catalog";
import * as db from "@/lib/supabase";
import { sendMessage } from "@/lib/telegram";

const product = (id: string, name: string, available = true) => ({ id, name, available }) as never;
const catalogOf = (...products: never[]) => ({ products, prices: { 10: 12, 20: 22, 50: 48 } });

const pendingRow = (over: Partial<OrderRow> = {}): OrderRow => ({
  id: "11111111-1111-4111-8111-111111111111", status: "pending", order_number: null, claim_token: "tok", customer_name: "Sokha Chan",
  telegram: "12345678", fulfilment: "pickup", map_url: null, items: [{ productId: "a", name: "Jasmine Rain", sizeMl: 10, priceUsd: 12, qty: 2 }],
  subtotal_usd: 24, delivery_fee_usd: 0, total_usd: 24, khqr_md5: "m".repeat(32), khqr_tran_id: null, khqr_qr: "QR", khqr_deeplink: null,
  ip_hash: "h", expires_at: new Date(Date.now() + 5 * 60_000).toISOString(), last_checked_at: null, paid_at: null, admin_notified_at: null,
  created_at: new Date().toISOString(), ...over,
});
const paidRow = (over: Partial<OrderRow> = {}) => pendingRow({ status: "paid", order_number: 1042, paid_at: "2026-10-18T07:32:00Z", ...over });

beforeEach(() => {
  vi.resetAllMocks();
  process.env.TELEGRAM_ADMIN_CHAT_ID = "-100";
  vi.mocked(db.countRecentByIp).mockResolvedValue(0);
  vi.mocked(db.claimNotify).mockResolvedValue(true);
});

describe("createOrder", () => {
  const input = {
    lines: [{ productId: "a", sizeMl: 20 as const, qty: 2 }],
    details: { fulfilment: "delivery" as const, name: "Sokha", telegram: "12345678", mapUrl: "https://maps.app.goo.gl/x" },
  };
  beforeEach(() => {
    vi.mocked(getCatalog).mockResolvedValue(catalogOf(product("a", "Jasmine Rain")));
    vi.mocked(generateQr).mockResolvedValue({ qr: "QRSTRING", md5: "a".repeat(32), tranId: "T1" });
    vi.mocked(generateDeeplink).mockResolvedValue("https://link.khqr.dev/x");
    vi.mocked(db.insertOrder).mockImplementation(async (o) => ({ ...pendingRow(), ...o }) as OrderRow);
  });

  it("prices from live data, adds the delivery fee and requests a QR for the total", async () => {
    await createOrder(input, "1.2.3.4");
    expect(generateQr).toHaveBeenCalledWith(46);
    const saved = vi.mocked(db.insertOrder).mock.calls[0][0];
    expect(saved).toMatchObject({ subtotal_usd: 44, delivery_fee_usd: 2, total_usd: 46, khqr_md5: "a".repeat(32), map_url: "https://maps.app.goo.gl/x", fulfilment: "delivery" });
    expect(saved.items).toEqual([{ productId: "a", name: "Jasmine Rain", sizeMl: 20, priceUsd: 22, qty: 2 }]);
    expect(saved.claim_token).toHaveLength(24);
    expect(Date.parse(saved.expires_at) - Date.now()).toBeGreaterThan(9 * 60_000);
  });
  it("still creates the order when the deep link fails", async () => {
    vi.mocked(generateDeeplink).mockResolvedValue(null);
    await createOrder(input, "1.2.3.4");
    expect(vi.mocked(db.insertOrder).mock.calls[0][0].khqr_deeplink).toBeNull();
  });
  it("names an out of stock item", async () => {
    vi.mocked(getCatalog).mockResolvedValue(catalogOf(product("a", "Orange Peel", false)));
    await expect(createOrder(input, "ip")).rejects.toMatchObject({ code: "unavailable", message: expect.stringContaining("Orange Peel") });
    expect(generateQr).not.toHaveBeenCalled();
  });
  it("rejects a product that is no longer sold", async () => {
    vi.mocked(getCatalog).mockResolvedValue(catalogOf());
    await expect(createOrder(input, "ip")).rejects.toBeInstanceOf(OrderError);
  });
  it("rate limits five orders per ten minutes per IP", async () => {
    vi.mocked(db.countRecentByIp).mockResolvedValue(5);
    await expect(createOrder(input, "ip")).rejects.toMatchObject({ code: "rate_limited", status: 429 });
  });
});

describe("settleOrder", () => {
  const md5 = "m".repeat(32);
  beforeEach(() => {
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24, currency: "USD" });
    vi.mocked(db.settleByMd5).mockResolvedValue(paidRow());
  });

  it("settles a paid order once and posts the admin message", async () => {
    expect(await settleOrder(md5)).toBe(true);
    expect(db.settleByMd5).toHaveBeenCalledWith(md5);
    expect(sendMessage).toHaveBeenCalledWith("-100", expect.stringContaining("New order SK-1042"));
    expect(db.claimNotify).toHaveBeenCalledWith(paidRow().id);
  });
  it("does nothing when khqr.dev says unpaid", async () => {
    vi.mocked(checkPaid).mockResolvedValue({ paid: false });
    expect(await settleOrder(md5)).toBe(false);
    expect(db.settleByMd5).not.toHaveBeenCalled();
  });
  it("refuses a wrong amount or currency", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 23, currency: "USD" });
    expect(await settleOrder(md5)).toBe(false);
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24, currency: "KHR" });
    expect(await settleOrder(md5)).toBe(false);
    expect(db.settleByMd5).not.toHaveBeenCalled();
    error.mockRestore();
  });
  it("accepts an amount within half a cent", async () => {
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24.004, currency: "USD" });
    expect(await settleOrder(md5)).toBe(true);
  });
  it("ignores unknown or already paid orders without calling khqr.dev", async () => {
    vi.mocked(db.getOrderByMd5).mockResolvedValue(null);
    expect(await settleOrder(md5)).toBe(false);
    vi.mocked(db.getOrderByMd5).mockResolvedValue(paidRow());
    expect(await settleOrder(md5)).toBe(false);
    expect(checkPaid).not.toHaveBeenCalled();
  });
  it("posts nothing when another caller won the race", async () => {
    vi.mocked(db.settleByMd5).mockResolvedValue(null);
    expect(await settleOrder(md5)).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });
  it("releases the admin claim when Telegram fails, so a retry can happen", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendMessage).mockRejectedValue(new Error("down"));
    expect(await settleOrder(md5)).toBe(true);
    expect(db.releaseNotify).toHaveBeenCalledWith(paidRow().id);
    error.mockRestore();
  });
});

describe("notifyAdmin", () => {
  it("sends nothing when another caller already claimed the message", async () => {
    vi.mocked(db.claimNotify).mockResolvedValue(false);
    await notifyAdmin(paidRow());
    expect(sendMessage).not.toHaveBeenCalled();
  });
  it("never throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendMessage).mockRejectedValue(new Error("down"));
    await expect(notifyAdmin(paidRow())).resolves.toBeUndefined();
    error.mockRestore();
  });
});

describe("getOrderView", () => {
  it("returns null for an unknown order", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(null);
    expect(await getOrderView("x")).toBeNull();
  });
  it("shows the QR for a pending order and checks payment when not checked in the last 5 seconds", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(pendingRow());
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: false });
    const view = await getOrderView("id");
    expect(view).toMatchObject({ state: "pending", qr: "QR", totalUsd: 24 });
    expect(db.touchChecked).toHaveBeenCalled();
    expect(checkPaid).toHaveBeenCalledTimes(1);
  });
  it("does not call khqr.dev when checked less than 5 seconds ago", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(pendingRow({ last_checked_at: new Date(Date.now() - 1000).toISOString() }));
    await getOrderView("id");
    expect(checkPaid).not.toHaveBeenCalled();
  });
  it("reports expired when past expires_at and still unpaid", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(pendingRow({ expires_at: new Date(Date.now() - 1000).toISOString() }));
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: false });
    expect(await getOrderView("id")).toEqual({ state: "expired", totalUsd: 24 });
  });
  it("settles during the poll and returns the paid view with no personal data", async () => {
    vi.mocked(db.getOrder).mockResolvedValueOnce(pendingRow()).mockResolvedValueOnce(paidRow({ admin_notified_at: "2026-10-18T07:33:00Z" }));
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24, currency: "USD" });
    vi.mocked(db.settleByMd5).mockResolvedValue(paidRow());
    const view = await getOrderView("id");
    expect(view).toEqual({ state: "paid", orderNumber: "SK-1042", totalUsd: 24, fulfilment: "pickup", claimToken: "tok" });
    expect(JSON.stringify(view)).not.toMatch(/Sokha|12345678|Jasmine/);
  });
  it("retries an unsent admin message for a paid order", async () => {
    vi.mocked(db.getOrder).mockResolvedValue(paidRow());
    await getOrderView("id");
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe("handleStart", () => {
  it("confirms a paid order to the chat that pressed start", async () => {
    vi.mocked(db.getOrderByClaimToken).mockResolvedValue(paidRow());
    await handleStart(4242, "tok");
    expect(sendMessage).toHaveBeenCalledWith(4242, expect.stringContaining("Order SK-1042 is confirmed"));
  });
  it("says the payment is not received yet for a pending order", async () => {
    vi.mocked(db.getOrderByClaimToken).mockResolvedValue(pendingRow());
    await handleStart(4242, "tok");
    expect(sendMessage).toHaveBeenCalledWith(4242, expect.stringContaining("not received this payment yet"));
  });
  it("sends a plain greeting for an unknown or missing token", async () => {
    vi.mocked(db.getOrderByClaimToken).mockResolvedValue(null);
    await handleStart(4242, "nope");
    await handleStart(4242, undefined);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendMessage).mock.calls[0][1]).toContain("Hello from SAKA Parfum");
  });
});

describe("runDaily", () => {
  it("pings, retries unsent messages, settles stale orders and cleans up", async () => {
    vi.mocked(db.unnotifiedPaid).mockResolvedValue([paidRow()]);
    vi.mocked(db.stalePending).mockResolvedValue([pendingRow({ last_checked_at: new Date(Date.now() - 3600_000).toISOString() })]);
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockResolvedValue({ paid: true, amount: 24, currency: "USD" });
    vi.mocked(db.settleByMd5).mockResolvedValue(paidRow());
    vi.mocked(db.cleanup).mockResolvedValue({ deleted: 3, scrubbed: 1, attempts: 2 });
    expect(await runDaily()).toEqual({ retried: 1, settled: 1, deleted: 3, scrubbed: 1, attempts: 2 });
    expect(db.ping).toHaveBeenCalled();
  });
  it("keeps checking the other orders when one check fails", async () => {
    const md5s = ["a".repeat(32), "b".repeat(32)];
    vi.mocked(db.unnotifiedPaid).mockResolvedValue([]);
    vi.mocked(db.stalePending).mockResolvedValue(md5s.map((khqr_md5) => pendingRow({ khqr_md5 })));
    vi.mocked(db.getOrderByMd5).mockResolvedValue(pendingRow());
    vi.mocked(checkPaid).mockRejectedValueOnce(new Error("rate limited")).mockResolvedValueOnce({ paid: true, amount: 24, currency: "USD" });
    vi.mocked(db.settleByMd5).mockResolvedValue(paidRow());
    vi.mocked(db.cleanup).mockResolvedValue({ deleted: 0, scrubbed: 0, attempts: 0 });
    expect(await runDaily()).toMatchObject({ settled: 1 });
  });
});
