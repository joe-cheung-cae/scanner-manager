"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { DownloadButton } from "@/components/download-button";
import {
  exportFullBackup,
  exportProductsToCsv,
  importProductsFromJson,
  importProductsFromCsv,
} from "@/lib/import-export/csv";
import { buildProductIndex, searchProducts } from "@/lib/search/productIndex";

export function ProductsPage() {
  const products = useAppStore((s) => s.products);
  const customers = useAppStore((s) => s.customers);
  const todos = useAppStore((s) => s.todos);
  const orders = useAppStore((s) => s.orders);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const replaceProducts = useAppStore((s) => s.replaceProducts);

  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [codeType, setCodeType] = useState("");
  const [wired, setWired] = useState("");
  const [wireless, setWireless] = useState("");
  const [importError, setImportError] = useState("");

  const index = useMemo(() => buildProductIndex(products), [products]);
  const list = useMemo(
    () =>
      searchProducts(index, query, {
        status: status || undefined,
        codeType: codeType || undefined,
        wired: wired || undefined,
        wireless: wireless || undefined,
      }),
    [index, query, status, codeType, wired, wireless],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">产品库</h2>
        <DownloadButton filename="products.csv" content={exportProductsToCsv(products)} label="导出产品 CSV" />
        <DownloadButton
          filename="backup.json"
          content={exportFullBackup({ customers, todos, orders, products })}
          label="导出全量备份"
        />
      </div>

      <div className="grid gap-2 rounded border bg-white p-3 md:grid-cols-3">
        <input className="rounded border px-2 py-2" placeholder="型号" value={model} onChange={(e) => setModel(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="名称" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          className="rounded bg-sky-600 px-3 py-2 text-white"
          onClick={() => {
            if (!model.trim() || !name.trim()) return;
            addProduct({ model: model.trim(), name: name.trim(), productType: "catalog", status: "在售" });
            setModel("");
            setName("");
          }}
        >
          新建产品
        </button>
      </div>

      <div className="grid gap-2 rounded border bg-white p-3 md:grid-cols-5">
        <input className="rounded border px-2 py-2" placeholder="搜索型号/规格" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="扫码类型过滤" value={codeType} onChange={(e) => setCodeType(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="有线接口过滤" value={wired} onChange={(e) => setWired(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="无线过滤" value={wireless} onChange={(e) => setWireless(e.target.value)} />
        <select className="rounded border px-2 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="在售">在售</option>
          <option value="停产">停产</option>
          <option value="仅定制">仅定制</option>
        </select>
      </div>

      <div className="rounded border bg-white p-3">
        <label className="mb-2 block text-sm font-medium">导入产品（CSV / JSON）</label>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const content = await file.text();
              const result = importProductsFromCsv(content, "upsertByModel", products);
              if (result.errors.length) {
                setImportError(result.errors.join("；"));
                return;
              }
              setImportError("");
              replaceProducts(result.products);
            }}
          />
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const content = await file.text();
              const result = importProductsFromJson(content, products);
              if (result.errors.length) {
                setImportError(result.errors.join("；"));
                return;
              }
              setImportError("");
              replaceProducts(result.products);
            }}
          />
        </div>
        {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((p) => (
          <div key={p.id} className="rounded border bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{p.model}</div>
                <div className="text-sm text-slate-600">{p.name}</div>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs">{p.status || "-"}</span>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              扫码类型: {p.specs.scan?.codeTypes?.join("/") || "-"} · 接口: {p.specs.comms?.wired?.join("/") || "-"} · 无线: {p.specs.comms?.wireless?.join("/") || "-"}
            </div>
            <textarea
              className="mt-2 w-full rounded border px-2 py-1 text-sm"
              value={p.specs.notes || ""}
              onChange={(e) => updateProduct(p.id, { specs: { ...p.specs, notes: e.target.value } })}
              placeholder="规格备注"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
