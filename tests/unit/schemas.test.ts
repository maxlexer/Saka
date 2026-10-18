import { describe, expect, it } from "vitest";
import { detailsSchema, isGoogleMapsUrl, orderInputSchema } from "@/lib/schemas";

describe("isGoogleMapsUrl", () => {
  it("accepts the three allowed forms over https", () => {
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isGoogleMapsUrl("https://goo.gl/maps/abc123")).toBe(true);
    expect(isGoogleMapsUrl("https://www.google.com/maps/place/Saka")).toBe(true);
    expect(isGoogleMapsUrl("https://google.com/maps?q=1,2")).toBe(true);
  });
  it("rejects everything else", () => {
    expect(isGoogleMapsUrl("http://maps.app.goo.gl/abc")).toBe(false);
    expect(isGoogleMapsUrl("https://evil.example/maps")).toBe(false);
    expect(isGoogleMapsUrl("https://google.com.evil.example/maps")).toBe(false);
    expect(isGoogleMapsUrl("https://google.com/search?q=maps")).toBe(false);
    expect(isGoogleMapsUrl("not a url")).toBe(false);
  });
});

describe("detailsSchema", () => {
  const pickup = { fulfilment: "pickup", name: "Sokha Chan", telegram: "+855 12 345 678" };
  it("accepts pickup without a map link", () => {
    expect(detailsSchema.safeParse(pickup).success).toBe(true);
  });
  it("trims the name and rejects an empty or long one", () => {
    expect(detailsSchema.parse({ ...pickup, name: "  Sokha  " }).name).toBe("Sokha");
    expect(detailsSchema.safeParse({ ...pickup, name: "   " }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, name: "x".repeat(81) }).success).toBe(false);
  });
  it("needs 8 to 15 digits in the Telegram number", () => {
    expect(detailsSchema.safeParse({ ...pickup, telegram: "1234567" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, telegram: "1234567890123456" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, telegram: "12345678" }).success).toBe(true);
    expect(detailsSchema.safeParse({ ...pickup, telegram: "abc12345678" }).success).toBe(false);
  });
  it("requires a Google Maps link for delivery", () => {
    expect(detailsSchema.safeParse({ ...pickup, fulfilment: "delivery" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, fulfilment: "delivery", mapUrl: "https://example.com" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...pickup, fulfilment: "delivery", mapUrl: "https://maps.app.goo.gl/x" }).success).toBe(true);
  });
});

describe("orderInputSchema", () => {
  const details = { fulfilment: "pickup", name: "A", telegram: "12345678" };
  it("needs at least one line and at most 20", () => {
    expect(orderInputSchema.safeParse({ lines: [], details }).success).toBe(false);
    const many = Array.from({ length: 21 }, (_, i) => ({ productId: `p${i}`, sizeMl: 10, qty: 1 }));
    expect(orderInputSchema.safeParse({ lines: many, details }).success).toBe(false);
  });
  it("rejects a quantity above 10", () => {
    expect(orderInputSchema.safeParse({ lines: [{ productId: "p", sizeMl: 10, qty: 11 }], details }).success).toBe(false);
  });
});
