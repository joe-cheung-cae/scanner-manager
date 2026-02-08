"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { DownloadButton } from "@/components/download-button";
import { exportFullBackup, exportProductsToCsv, importProductsFromJson, importProductsFromCsv } from "@/lib/import-export/csv";
import { buildProductIndex, searchProducts } from "@/lib/search/productIndex";
import { ConfirmModal } from "@/components/confirm-modal";
import type { Product } from "@/domain/types";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/layout/filter-bar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";

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
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-900">{product.model}</p>
            <p className="text-xs text-slate-500">{product.name}</p>
          </div>
          <Badge variant="default">{product.status || "-"}</Badge>
        </div>

        <p className="text-xs text-slate-500">
          扫码类型: {product.specs.scan?.codeTypes?.join("/") || "-"} · 接口: {product.specs.comms?.wired?.join("/") || "-"} · 无线: {product.specs.comms?.wireless?.join("/") || "-"}
        </p>

        <Textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} placeholder="规格备注" />

        <div className="flex gap-2">
          <Button className="flex-1" variant="primary" disabled={!dirty} onClick={() => onSaveNotes(product.id, draftNotes)}>
            保存
          </Button>
          <Button className="flex-1" variant="secondary" disabled={!dirty} onClick={() => setConfirmDiscard(true)}>
            取消
          </Button>
          <Button variant="ghost" onClick={() => onDelete(product.id)}>
            更多
          </Button>
        </div>
      </CardContent>

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
    </Card>
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
    <section className="space-y-6">
      <PageHeader
        title="产品库"
        description="产品检索、维护与导入导出。"
        actions={
          <>
            <DownloadButton filename="products.csv" content={exportProductsToCsv(products)} label="导出产品 CSV" />
            <DownloadButton filename="backup.json" content={exportFullBackup({ customers, todos, orders, products })} label="导出全量备份" />
          </>
        }
      />

      {message ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div> : null}

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input placeholder="搜索型号/规格" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="型号" value={model} onChange={(e) => setModel(e.target.value)} />
            <Input placeholder="名称" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              if (!model.trim() || !name.trim()) return;
              addProduct({ model: model.trim(), name: name.trim(), productType: "catalog", status: "在售" });
              setModel("");
              setName("");
            }}
          >
            新建产品
          </Button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Input placeholder="扫码类型" value={codeType} onChange={(e) => setCodeType(e.target.value)} />
          <Input placeholder="接口" value={wired} onChange={(e) => setWired(e.target.value)} />
          <Input placeholder="无线" value={wireless} onChange={(e) => setWireless(e.target.value)} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="在售">在售</option>
            <option value="停产">停产</option>
            <option value="仅定制">仅定制</option>
          </Select>
        </div>
      </FilterBar>

      <Card>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-slate-700">导入产品（CSV / JSON）</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
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
            {importError ? <p className="mt-2 text-sm text-rose-600">{importError}</p> : null}
          </details>
        </CardContent>
      </Card>

      {!list.length ? <EmptyState title="暂无匹配产品" description="调整筛选条件，或先新建产品。" /> : null}

      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2">
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
      ) : null}

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
