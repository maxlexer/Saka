import { describe, expect, it } from "vitest";
import { phnomPenhStart, phnomPenhTime } from "@/lib/time";

describe("phnomPenhStart", () => {
  const lateEvening = new Date("2026-10-18T20:00:00Z"); // 03:00 on 19 October in Phnom Penh
  it("starts the day at local midnight", () => {
    expect(phnomPenhStart("day", lateEvening).toISOString()).toBe("2026-10-18T17:00:00.000Z");
  });
  it("starts the month on the local first", () => {
    expect(phnomPenhStart("month", lateEvening).toISOString()).toBe("2026-09-30T17:00:00.000Z");
  });
});

describe("phnomPenhTime", () => {
  it("formats in Phnom Penh time without seconds", () => {
    expect(phnomPenhTime("2026-10-18T07:32:00Z")).toBe("2026-10-18 14:32");
  });
});
