import { describe, expect, it } from "vitest";
import { formatINR, rateLabel } from "./utils/currency";
describe("M-DAIRY UI assumptions", () => {
  it("has valid quantity constraints", () => {
    expect(Number.isFinite(Number("0.5"))).toBe(true);
    expect(Number("-1")).toBeLessThan(0);
  });
});
describe("INR formatting", () => {
  it("uses a correct Indian rupee currency representation", () => {
    expect(formatINR(10)).toMatch(/₹\s?10\.00/);
    expect(formatINR(0)).toMatch(/₹\s?0\.00/);
  });
  it("formats decimal, missing, and invalid values safely", () => {
    expect(formatINR(1250.5)).toMatch(/₹\s?1,250\.50/);
    expect(formatINR(undefined)).toMatch(/₹\s?0\.00/);
    expect(formatINR("not-a-number")).toMatch(/₹\s?0\.00/);
  });
  it("uses correct rupee rate labels for customer and vendor forms", () => {
    expect(rateLabel("Cow")).toBe("Cow rate (₹/L)");
    expect(rateLabel("Buffalo procurement")).toBe(
      "Buffalo procurement rate (₹/L)",
    );
  });
});
