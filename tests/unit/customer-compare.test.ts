import { describe, expect, it } from "vitest";
import { getComparisonHighlights } from "@/lib/customer-compare";

describe("customer-compare", () => {
  it("应基于归一化子串对输入和候选同时高亮", () => {
    const result = getComparisonHighlights("客户 A-华南", "华南客户A有限公司");
    const inputMatched = result.inputSegments.filter((s) => s.match).map((s) => s.text).join("");
    const candidateMatched = result.candidateSegments.filter((s) => s.match).map((s) => s.text).join("");

    expect(inputMatched.length).toBeGreaterThan(0);
    expect(candidateMatched.length).toBeGreaterThan(0);
  });

  it("无公共片段时不应高亮", () => {
    const result = getComparisonHighlights("客户X", "北京Y公司");
    expect(result.inputSegments.some((s) => s.match)).toBe(false);
    expect(result.candidateSegments.some((s) => s.match)).toBe(false);
  });
});
