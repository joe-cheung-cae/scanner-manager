import { describe, expect, it } from "vitest";
import type { Customer } from "@/domain/types";
import { findLikelyCustomers, normalizeCustomerName } from "@/lib/customer-match";

const now = 1;

function customer(id: string, name: string): Customer {
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

describe("customer-match", () => {
  it("应对空格和符号差异做归一化", () => {
    expect(normalizeCustomerName(" 客户-A/华南 · 01 ")).toBe("客户a华南01");
  });

  it("应命中子串近似客户", () => {
    const list = [customer("c1", "深圳 客户A"), customer("c2", "北京客户B")];
    const result = findLikelyCustomers(list, "客户A");
    expect(result.map((item) => item.id)).toContain("c1");
  });

  it("应命中编辑距离小于等于2的客户", () => {
    const list = [customer("c1", "客户测试一"), customer("c2", "客户测试二")];
    const result = findLikelyCustomers(list, "客户测式一");
    expect(result[0]?.id).toBe("c1");
  });

  it("应按候选上限返回前三个结果", () => {
    const list = [
      customer("c1", "客户A电子"),
      customer("c2", "客户A科技"),
      customer("c3", "客户A贸易"),
      customer("c4", "客户A服务"),
    ];
    const result = findLikelyCustomers(list, "客户A", { limit: 3 });
    expect(result).toHaveLength(3);
  });
});
