import { describe, expect, it } from "vitest";
import { exportOrdersToJson, importProductsFromCsv, importProductsFromJson } from "@/lib/import-export/csv";

describe("importProductsFromCsv", () => {
  it("应支持中英文字段并导入", () => {
    const csv = `型号,名称,状态,扫码类型,有线接口\nSM-1,有线扫码枪,在售,1D|2D,USB-HID`;
    const result = importProductsFromCsv(csv, "allNew", []);
    expect(result.errors).toEqual([]);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].model).toBe("SM-1");
    expect(result.products[0].specs.scan?.codeTypes).toContain("1D");
  });

  it("缺少必填字段时应报错", () => {
    const csv = `model,name\n,空型号`;
    const result = importProductsFromCsv(csv, "allNew", []);
    expect(result.errors.length).toBe(1);
  });
});

describe("json import/export", () => {
  it("应支持产品 JSON 导入", () => {
    const payload = JSON.stringify([
      {
        model: "SM-JSON-1",
        name: "JSON 扫码枪",
        status: "在售",
        productType: "catalog",
        specs: { notes: "json导入" },
      },
    ]);
    const result = importProductsFromJson(payload, []);
    expect(result.errors).toEqual([]);
    expect(result.products[0].model).toBe("SM-JSON-1");
  });

  it("应支持订单 JSON 导出", () => {
    const json = exportOrdersToJson([
      {
        id: "o-1",
        orderNo: "20260207-0001",
        type: "order",
        status: "询价中",
        customerId: "c-1",
        createdAt: 1,
        updatedAt: 1,
        items: [],
        timeline: [],
      },
    ]);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].orderNo).toBe("20260207-0001");
  });
});
