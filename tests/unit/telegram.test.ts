import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, formatAdminMessage, formatRevenue, sendMessage } from "@/lib/telegram";

const order = {
  order_number: 1042,
  paid_at: "2026-10-18T07:32:00Z",
  customer_name: "Sokha Chan",
  telegram: "+855 12 345 678",
  fulfilment: "delivery" as const,
  map_url: "https://maps.app.goo.gl/abc",
  items: [
    { productId: "a", name: "Rosewater", sizeMl: 20, priceUsd: 30, qty: 2 },
    { productId: "b", name: "Amber Pouch", sizeMl: 10, priceUsd: 18, qty: 1 },
  ],
  delivery_fee_usd: 2,
  total_usd: 80,
};

describe("escapeHtml", () => {
  it("escapes the three Telegram HTML characters", () => {
    expect(escapeHtml("<b>Tom & Co</b>")).toBe("&lt;b&gt;Tom &amp; Co&lt;/b&gt;");
  });
});

describe("formatAdminMessage", () => {
  it("matches the spec for a delivery order, with Phnom Penh time and USD only", () => {
    expect(formatAdminMessage(order)).toBe(
      [
        "New order SK-1042",
        "Paid 2026-10-18 14:32 (Phnom Penh)",
        "",
        "Name: Sokha Chan",
        "Telegram: +855 12 345 678",
        "Fulfilment: Delivery",
        "Map: https://maps.app.goo.gl/abc",
        "",
        "Items",
        "Rosewater, 20ml x2  $60.00",
        "Amber Pouch, 10ml x1  $18.00",
        "Delivery  $2.00",
        "Total  $80.00",
      ].join("\n"),
    );
  });
  it("omits the map and delivery lines for pickup", () => {
    const text = formatAdminMessage({ ...order, fulfilment: "pickup", map_url: null, delivery_fee_usd: 0, total_usd: 78 });
    expect(text).toContain("Fulfilment: Pickup");
    expect(text).not.toContain("Map:");
    expect(text).not.toContain("Delivery  ");
  });
  it("escapes customer text", () => {
    expect(formatAdminMessage({ ...order, customer_name: "<script>" })).toContain("Name: &lt;script&gt;");
  });
  it("never contains an exclamation mark or an em dash", () => {
    expect(formatAdminMessage(order)).not.toMatch(new RegExp(`[!${String.fromCharCode(0x2014)}]`));
  });
});

describe("formatRevenue", () => {
  const now = new Date("2026-10-23T08:00:00Z"); // 15:00 in Phnom Penh
  const sale = (paid_at: string, total_usd: number, ...qty: number[]) => ({ paid_at, total_usd, items: qty.map((q) => ({ qty: q })) });

  it("counts orders, bottles and revenue for today, this month and all time", () => {
    const text = formatRevenue(
      [
        sale("2026-10-23T02:00:00Z", 24, 2), // today
        sale("2026-10-10T05:00:00Z", 46, 1, 2), // earlier this month
        sale("2026-09-30T16:59:00Z", 12, 1), // 23:59 on 30 Sept in Phnom Penh, last month
        sale("2026-09-30T17:00:00Z", 10, 1), // 00:00 on 1 Oct in Phnom Penh, this month
      ],
      now,
    );
    expect(text).toBe(
      [
        "Sales report",
        "As of 2026-10-23 15:00 (Phnom Penh)",
        "",
        "<b>Today</b>",
        "Orders: 1",
        "Bottles: 2",
        "Revenue: $24.00",
        "",
        "<b>This month</b>",
        "Orders: 3",
        "Bottles: 6",
        "Revenue: $80.00",
        "",
        "<b>All time</b>",
        "Orders: 4",
        "Bottles: 7",
        "Revenue: $92.00",
      ].join("\n"),
    );
  });
  it("shows zeros before the first sale", () => {
    expect(formatRevenue([], now)).toContain("Orders: 0\nBottles: 0\nRevenue: $0.00");
  });
  it("never contains an exclamation mark or an em dash", () => {
    expect(formatRevenue([sale("2026-10-23T02:00:00Z", 24, 2)], now)).not.toMatch(new RegExp(`[!${String.fromCharCode(0x2014)}]`));
  });
});

describe("sendMessage", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_API_BASE = "https://tg.test";
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });
  it("posts HTML text to the chat", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await sendMessage(42, "hi");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://tg.test/bot123:abc/sendMessage");
    expect(JSON.parse(init.body)).toMatchObject({ chat_id: 42, text: "hi", parse_mode: "HTML" });
  });
  it("throws when Telegram refuses", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, description: "blocked" }), { status: 403 }));
    await expect(sendMessage(42, "hi")).rejects.toThrow("telegram sendMessage failed: 403");
  });
});
