import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/lib/gsap", () => ({ gsap: {}, useGSAP: () => ({ contextSafe: (fn: unknown) => fn }), MOTION: {} }));

import { FRAMES, framePosition } from "@/components/SpinBottle";

describe("framePosition", () => {
  it("walks the 6 by 6 grid row by row", () => {
    expect(framePosition(0)).toBe("0% 0%");
    expect(framePosition(1)).toBe("20% 0%");
    expect(framePosition(5)).toBe("100% 0%");
    expect(framePosition(6)).toBe("0% 20%");
    expect(framePosition(35)).toBe("100% 100%");
  });
  it("wraps a full turn back to the front and rounds tween values", () => {
    expect(framePosition(FRAMES)).toBe("0% 0%");
    expect(framePosition(6.4)).toBe("0% 20%");
    expect(framePosition(-1)).toBe("100% 100%");
  });
});
