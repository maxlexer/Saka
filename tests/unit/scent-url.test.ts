import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeScent, openScent, scentClosed } from "@/lib/scent-url";

const history = { pushState: vi.fn(), replaceState: vi.fn(), back: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { location: { pathname: "/products", search: "?vibe=calm", hash: "" }, history });
  scentClosed();
});

describe("scent url", () => {
  it("pushes once, keeps other parameters, and Close goes back", () => {
    openScent("aventus");
    expect(history.pushState).toHaveBeenCalledWith(null, "", "/products?vibe=calm&scent=aventus");
    closeScent();
    expect(history.back).toHaveBeenCalledTimes(1);
  });
  it("replaces on a second open before the modal shows, so one Close is enough", () => {
    openScent("aventus");
    openScent("layton");
    expect(history.pushState).toHaveBeenCalledTimes(1);
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/products?vibe=calm&scent=layton");
  });
  it("pushes again after the modal closed another way, such as Back", () => {
    openScent("aventus");
    scentClosed();
    openScent("layton");
    expect(history.pushState).toHaveBeenCalledTimes(2);
  });
  it("drops the parameter without leaving the page when opened from a shared link", () => {
    window.location.search = "?scent=aventus";
    closeScent();
    expect(history.back).not.toHaveBeenCalled();
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/products");
  });
});
