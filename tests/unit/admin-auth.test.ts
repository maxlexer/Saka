import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { checkPassword, createSession, SESSION_MS, verifySession } from "@/lib/admin-auth";

const SECRET = "s".repeat(32);
const NOW = 1_800_000_000_000;

describe("checkPassword", () => {
  it("accepts only the exact password", () => {
    expect(checkPassword("open sesame", "open sesame")).toBe(true);
    expect(checkPassword("open sesam", "open sesame")).toBe(false);
  });
  it("refuses everything when no password is configured", () => {
    expect(checkPassword("", "")).toBe(false);
  });
});

describe("sessions", () => {
  it("verifies a fresh session until it expires", () => {
    const token = createSession(NOW, SECRET);
    expect(verifySession(token, NOW + 1000, SECRET)).toBe(true);
    expect(verifySession(token, NOW + SESSION_MS, SECRET)).toBe(false);
  });
  it("rejects a tampered expiry, a wrong secret, garbage and a missing cookie", () => {
    const token = createSession(NOW, SECRET);
    const [, mac] = token.split(".");
    expect(verifySession(`${NOW + SESSION_MS * 10}.${mac}`, NOW, SECRET)).toBe(false);
    expect(verifySession(token, NOW, "t".repeat(32))).toBe(false);
    expect(verifySession("nonsense", NOW, SECRET)).toBe(false);
    expect(verifySession(undefined, NOW, SECRET)).toBe(false);
  });
  it("refuses to sign with a short secret", () => {
    expect(() => createSession(NOW, "short")).toThrow("ADMIN_SESSION_SECRET");
    expect(verifySession(createSession(NOW, SECRET), NOW, "short")).toBe(false);
  });
});
