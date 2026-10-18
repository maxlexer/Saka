import { describe, expect, it } from "vitest";
import { findViolations } from "../../scripts/check-copy.ts";

const EM = String.fromCharCode(0x2014);
const BANG = String.fromCharCode(33);

describe("findViolations", () => {
  it("flags em dashes", () => {
    expect(findViolations("a.tsx", `const t = "a ${EM} b";`)).toEqual(["a.tsx:1 em dash"]);
  });

  it("flags exclamation marks in copy but not in code", () => {
    expect(findViolations("a.tsx", `<p>Thank you${BANG} Enjoy</p>`)).toEqual(["a.tsx:1 exclamation mark"]);
    expect(findViolations("a.ts", "if (!ok || a !== b) return;")).toEqual([]);
    expect(findViolations("a.css", "a { color: red !important; }")).toEqual([]);
  });

  it("flags off-palette hex but allows palette colors", () => {
    expect(findViolations("a.css", "a { color: #FFFFFF; }")).toEqual(["a.css:1 off-palette #FFFFFF"]);
    expect(findViolations("a.css", "a { color: #faf6ee; background: #171A12; }")).toEqual([]);
  });
});
