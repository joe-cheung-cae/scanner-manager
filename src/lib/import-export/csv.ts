import { parse } from "csv-parse/sync";
import type { Order, Product, ProductSpecs } from "@/domain/types";
import { createId } from "@/lib/id";

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/\s+/g, "").replace(/[()（）]/g, "");
}

function toSpecs(row: Record<string, string>): ProductSpecs {
  return {
    scan: {
      codeTypes: (row.codeTypes || "").split(/[|,，]/).map((x) => x.trim()).filter(Boolean),
      sensorModel: row.sensorModel || undefined,
      resolution: row.resolution || undefined,
    },
    comms: {
      wired: (row.wired || "").split(/[|,，]/).map((x) => x.trim()).filter(Boolean),
      wireless: (row.wireless || "").split(/[|,，]/).map((x) => x.trim()).filter(Boolean),
      moduleModel: row.moduleModel || undefined,
    },
    env: {
      ipRating: row.ipRating || undefined,
    },
    notes: row.notes || undefined,
    keywords: (row.keywords || "").split(/[|,，]/).map((x) => x.trim()).filter(Boolean),
  };
}

export function importProductsFromCsv(
  fileText: string,
  strategy: "upsertByModel" | "allNew",
  existingProducts: Product[] = [],
): { products: Product[]; errors: string[] } {
  const records = parse(fileText, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

  const mapByModel = new Map(existingProducts.map((p) => [p.model, p]));
  const errors: string[] = [];
  const output: Product[] = [...existingProducts];

  const keyAlias = new Map<string, string>([
    ["型号", "model"],
    ["名称", "name"],
    ["状态", "status"],
    ["扫码类型", "codeTypes"],
    ["有线接口", "wired"],
    ["无线", "wireless"],
    ["传感器", "sensorModel"],
    ["分辨率", "resolution"],
    ["通信模块", "moduleModel"],
    ["防护等级", "ipRating"],
    ["关键词", "keywords"],
    ["备注", "notes"],
  ]);

  records.forEach((origin, idx) => {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(origin)) {
      const normalized = normalizeHeader(k);
      const alias = keyAlias.get(k) || keyAlias.get(normalized) || normalized;
      row[alias] = String(v || "").trim();
    }

    if (!row.model || !row.name) {
      errors.push(`第 ${idx + 2} 行缺少必填字段（model/name）`);
      return;
    }

    const now = Date.now();
    if (strategy === "upsertByModel" && mapByModel.has(row.model)) {
      const current = mapByModel.get(row.model)!;
      const next: Product = {
        ...current,
        name: row.name,
        status: (row.status as Product["status"]) || current.status,
        specs: toSpecs(row),
        updatedAt: now,
      };
      const i = output.findIndex((x) => x.id === current.id);
      output[i] = next;
      mapByModel.set(next.model, next);
    } else {
      const created: Product = {
        id: createId(),
        productType: "catalog",
        model: row.model,
        name: row.name,
        status: (row.status as Product["status"]) || "在售",
        specs: toSpecs(row),
        createdAt: now,
        updatedAt: now,
      };
      output.push(created);
      mapByModel.set(created.model, created);
    }
  });

  return { products: output, errors };
}

export function exportProductsToCsv(products: Product[]): string {
  const header = ["model", "name", "status", "codeTypes", "wired", "wireless", "sensorModel", "resolution", "moduleModel", "ipRating", "keywords", "notes"];
  const lines = products.map((p) => {
    const row = [
      p.model,
      p.name,
      p.status || "",
      p.specs.scan?.codeTypes?.join("|") || "",
      p.specs.comms?.wired?.join("|") || "",
      p.specs.comms?.wireless?.join("|") || "",
      p.specs.scan?.sensorModel || "",
      p.specs.scan?.resolution || "",
      p.specs.comms?.moduleModel || "",
      p.specs.env?.ipRating || "",
      p.specs.keywords?.join("|") || "",
      p.specs.notes || "",
    ];
    return row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

export function exportOrdersToCsv(orders: Order[]): string {
  const header = ["orderNo", "type", "status", "customerId", "items", "createdAt"];
  const lines = orders.map((o) => [
    o.orderNo,
    o.type,
    o.status,
    o.customerId,
    o.items.map((x) => x.snapshot?.model || x.customSpecText || x.productId || "").join("|"),
    new Date(o.createdAt).toISOString(),
  ]);
  return [header.join(","), ...lines.map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))].join("\n");
}

export function exportOrdersToJson(orders: Order[]): string {
  return JSON.stringify(orders, null, 2);
}

export function importProductsFromJson(
  fileText: string,
  existingProducts: Product[] = [],
): { products: Product[]; errors: string[] } {
  try {
    const parsed = JSON.parse(fileText) as Array<Partial<Product>>;
    if (!Array.isArray(parsed)) {
      return { products: existingProducts, errors: ["JSON 格式不正确，必须是数组。"] };
    }
    const now = Date.now();
    const errors: string[] = [];
    const products = [...existingProducts];
    parsed.forEach((item, index) => {
      if (!item.model || !item.name) {
        errors.push(`第 ${index + 1} 条缺少必填字段（model/name）`);
        return;
      }
      products.push({
        id: item.id || createId(),
        productType: item.productType || "catalog",
        model: item.model,
        name: item.name,
        status: item.status || "在售",
        specs: item.specs || {},
        createdAt: item.createdAt || now,
        updatedAt: now,
        baseModelRefId: item.baseModelRefId,
        customSummary: item.customSummary,
        version: item.version,
        sourceCustomerId: item.sourceCustomerId,
        sourceOrderId: item.sourceOrderId,
      });
    });
    return { products, errors };
  } catch {
    return { products: existingProducts, errors: ["JSON 解析失败，请检查文件内容。"] };
  }
}

export function exportFullBackup(data: {
  customers: unknown[];
  todos: unknown[];
  orders: unknown[];
  products: unknown[];
}): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      ...data,
    },
    null,
    2,
  );
}
