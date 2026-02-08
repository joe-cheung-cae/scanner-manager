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
import { ConfirmModal } from "@/components/confirm-modal";
import type { Product } from "@/domain/types";

function EditableProductCard({
  product,
  onSaveNotes,
  onDelete,
}: {
  product: Product;
  onSaveNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
}) {
  const [draftNotes, setDraftNotes] = useState(product.specs.notes || "");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = draftNotes !== (product.specs.notes || "");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{product.model}</div>
          <div className="text-sm text-slate-600">{product.name}</div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{product.status || "-"}</span>
      </div>
      <div className="mt-2 text-xs text-slate-600">
        扫码类型: {product.specs.scan?.codeTypes?.join("/") || "-"} · 接口: {product.specs.comms?.wired?.join("/") || "-"} · 无线: {product.specs.comms?.wireless?.join("/") || "-"}
      </div>
      <textarea
        className="mt-2 w-full rounded-lg px-2 py-1 text-sm"
        value={draftNotes}
        onChange={(e) => setDraftNotes(e.target.value)}
        placeholder="规格备注"
      />
      <div className="mt-2 flex gap-2">
        <button
          className="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-sm text-white hover:bg-emerald-700"
          disabled={!dirty}
          onClick={() => onSaveNotes(product.id, draftNotes)}
        >
          保存
        </button>
        <button className="flex-1 rounded-lg bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300" disabled={!dirty} onClick={() => setConfirmDiscard(true)}>
          取消
        </button>
        <button className="rounded-lg bg-rose-600 px-2 py-1 text-sm text-white hover:bg-rose-700" onClick={() => onDelete(product.id)}>
          删除
        </button>
      </div>
      <ConfirmModal
        open={confirmDiscard}
        title="确认撤销本次变更"
        description="你有未保存的产品修改，确认取消并撤销吗？"
        confirmText="确认撤销"
        cancelText="继续编辑"
        onConfirm={() => {
          setDraftNotes(product.specs.notes || "");
          setConfirmDiscard(false);
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}

export function ProductsPage() {
  const products = useAppStore((s) => s.products);
  const customers = useAppStore((s) => s.customers);
  const todos = useAppStore((s) => s.todos);
  const orders = useAppStore((s) => s.orders);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const replaceProducts = useAppStore((s) => s.replaceProducts);
  const deleteProduct = useAppStore((s) => s.deleteProductToRecycleBin);

  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [codeType, setCodeType] = useState("");
  const [wired, setWired] = useState("");
  const [wireless, setWireless] = useState("");
  const [importError, setImportError] = useState("");
  const [pendingImportProducts, setPendingImportProducts] = useState<typeof products | null>(null);
  const [pendingImportSource, setPendingImportSource] = useState<"CSV" | "JSON" | null>(null);
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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
      {message && <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">产品库</h2>
        <DownloadButton filename="products.csv" content={exportProductsToCsv(products)} label="导出产品 CSV" />
        <DownloadButton
          filename="backup.json"
          content={exportFullBackup({ customers, todos, orders, products })}
          label="导出全量备份"
        />
      </div>

      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm md:grid-cols-3">
        <input className="rounded-lg px-2 py-2" placeholder="型号" value={model} onChange={(e) => setModel(e.target.value)} />
        <input className="rounded-lg px-2 py-2" placeholder="名称" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          className="rounded-lg bg-sky-600 px-3 py-2 text-white hover:bg-sky-700"
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

      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm md:grid-cols-5">
        <input className="rounded-lg px-2 py-2" placeholder="搜索型号/规格" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input className="rounded-lg px-2 py-2" placeholder="扫码类型过滤" value={codeType} onChange={(e) => setCodeType(e.target.value)} />
        <input className="rounded-lg px-2 py-2" placeholder="有线接口过滤" value={wired} onChange={(e) => setWired(e.target.value)} />
        <input className="rounded-lg px-2 py-2" placeholder="无线过滤" value={wireless} onChange={(e) => setWireless(e.target.value)} />
        <select className="rounded-lg px-2 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="在售">在售</option>
          <option value="停产">停产</option>
          <option value="仅定制">仅定制</option>
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
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
              setPendingImportProducts(result.products);
              setPendingImportSource("CSV");
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
              setPendingImportProducts(result.products);
              setPendingImportSource("JSON");
            }}
          />
        </div>
        {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
      </div>

      <ConfirmModal
        open={!!pendingImportProducts}
        title="确认覆盖导入"
        description={`检测到将写入 ${pendingImportProducts?.length || 0} 条产品数据（来源：${pendingImportSource || "未知"}）。是否继续？`}
        confirmText="确认导入"
        cancelText="取消"
        onConfirm={() => {
          if (pendingImportProducts) replaceProducts(pendingImportProducts);
          setPendingImportProducts(null);
          setPendingImportSource(null);
        }}
        onCancel={() => {
          setPendingImportProducts(null);
          setPendingImportSource(null);
        }}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((product) => (
          <EditableProductCard
            key={product.id}
            product={product}
            onSaveNotes={(id, notes) => {
              const target = products.find((item) => item.id === id);
              if (!target) return;
              updateProduct(id, { specs: { ...target.specs, notes } });
            }}
            onDelete={setPendingDeleteProductId}
          />
        ))}
      </div>
      <ConfirmModal
        open={!!pendingDeleteProductId}
        title="确认删除产品"
        description="产品将移入回收站。若存在关联订单，将无法删除。"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={() => {
          if (!pendingDeleteProductId) return;
          const result = deleteProduct(pendingDeleteProductId);
          setMessage(result.ok ? "产品已移入回收站。" : result.message || "删除失败。");
          setPendingDeleteProductId(null);
        }}
        onCancel={() => setPendingDeleteProductId(null)}
      />
    </section>
  );
}
