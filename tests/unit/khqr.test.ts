import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkPaid, generateDeeplink, generateQr } from "@/lib/khqr";

const fetchMock = vi.fn();
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.KHQR_TOKEN = "tok";
  process.env.KHQR_API_BASE = "https://khqr.test";
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("generateQr", () => {
  it("posts the amount with a bearer token and maps the response", async () => {
    fetchMock.mockResolvedValue(reply(200, { responseCode: 0, data: { qr: "000201", md5: "A".repeat(32), tran_id: "T1", checkout_url: "x" } }));
    expect(await generateQr(80)).toEqual({ qr: "000201", md5: "a".repeat(32), tranId: "T1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://khqr.test/v1/generate_qr");
    expect(init.headers.authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ amount: 80 });
  });
  it("throws when the service fails", async () => {
    fetchMock.mockResolvedValue(reply(500, { responseCode: 1 }));
    await expect(generateQr(80)).rejects.toThrow("generate_qr failed: 500");
  });
});

describe("generateDeeplink", () => {
  it("returns the short link", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: { shortLink: "https://link.khqr.dev/abc" } }));
    expect(await generateDeeplink("000201")).toBe("https://link.khqr.dev/abc");
  });
  it("returns null instead of throwing", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    expect(await generateDeeplink("000201")).toBeNull();
    fetchMock.mockResolvedValue(reply(422, {}));
    expect(await generateDeeplink("000201")).toBeNull();
  });
});

describe("checkPaid", () => {
  it("treats 404 as unpaid", async () => {
    fetchMock.mockResolvedValue(reply(404, { errorCode: 1 }));
    expect(await checkPaid("m")).toEqual({ paid: false });
  });
  it("treats a 200 with amount and currency as paid", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: { amount: 80, currency: "USD", tran_id: "T1" } }));
    expect(await checkPaid("m")).toEqual({ paid: true, amount: 80, currency: "USD" });
  });
  it("treats a 200 without a payment body as unpaid", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: null }));
    expect(await checkPaid("m")).toEqual({ paid: false });
  });
  it("respects an explicit non-paid status", async () => {
    fetchMock.mockResolvedValue(reply(200, { data: { amount: 80, currency: "USD", status: "UNPAID" } }));
    expect(await checkPaid("m")).toEqual({ paid: false });
  });
  it("throws on auth and server errors so they are not mistaken for unpaid", async () => {
    fetchMock.mockResolvedValue(reply(401, {}));
    await expect(checkPaid("m")).rejects.toThrow("check failed: 401");
  });
});
