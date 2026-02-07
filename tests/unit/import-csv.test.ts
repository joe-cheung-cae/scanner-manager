import { describe, expect, it } from "vitest";
import { importProductsFromCsv } from "@/lib/import-export/csv";

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
