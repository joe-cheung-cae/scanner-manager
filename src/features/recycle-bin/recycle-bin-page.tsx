"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { ConfirmModal } from "@/components/confirm-modal";

export function RecycleBinPage() {
  const recycleBin = useAppStore((s) => s.recycleBin);
  const restore = useAppStore((s) => s.restoreFromRecycleBin);
  const purge = useAppStore((s) => s.purgeRecycleBin);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "order" | "customer" | "product">("");
  const [message, setMessage] = useState("");
  const [pendingPurgeId, setPendingPurgeId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    return recycleBin
      .filter((item) => !typeFilter || item.entityType === typeFilter)
      .filter((item) => {
        if (!q) return true;
        const snapshot = item.snapshot as { name?: string; model?: string; orderNo?: string };
        const hay = [item.entityType, snapshot.name, snapshot.model, snapshot.orderNo, item.reason].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.deletedAt - a.deletedAt);
  }, [recycleBin, typeFilter, query]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">回收站</h2>
      <div className="grid gap-2 rounded border bg-white p-3 md:grid-cols-3">
        <input className="rounded border px-2 py-2" placeholder="搜索名称/型号/订单号" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="rounded border px-2 py-2" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
          <option value="">全部类型</option>
          <option value="order">订单</option>
          <option value="customer">客户</option>
          <option value="product">产品</option>
        </select>
        <div className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">总计 {list.length} 条</div>
      </div>

      {message && <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>}

      <div className="space-y-2">
        {list.map((item) => {
          const snapshot = item.snapshot as { name?: string; model?: string; orderNo?: string };
          return (
            <div key={item.id} className="rounded border bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs">{item.entityType}</span>
                <span className="font-medium">{snapshot.orderNo || snapshot.name || snapshot.model || item.entityId}</span>
                <span className="text-xs text-slate-500">删除时间：{new Date(item.deletedAt).toLocaleString("zh-CN")}</span>
              </div>
              {item.reason && <div className="mt-1 text-xs text-slate-600">原因：{item.reason}</div>}
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded bg-emerald-600 px-3 py-1 text-sm text-white"
                  onClick={() => {
                    const result = restore(item.id);
                    setMessage(result.ok ? "恢复成功。" : result.message || "恢复失败。");
                  }}
                >
                  恢复
                </button>
                <button className="rounded bg-rose-600 px-3 py-1 text-sm text-white" onClick={() => setPendingPurgeId(item.id)}>
                  永久删除
                </button>
              </div>
            </div>
          );
        })}
        {!list.length && <div className="rounded border border-dashed p-6 text-center text-slate-500">回收站为空</div>}
      </div>

      <ConfirmModal
        open={!!pendingPurgeId}
        title="确认永久删除"
        description="永久删除后不可恢复，确定继续吗？"
        confirmText="确认永久删除"
        cancelText="取消"
        onConfirm={() => {
          if (!pendingPurgeId) return;
          const result = purge(pendingPurgeId);
          setMessage(result.ok ? "已永久删除。" : result.message || "删除失败。");
          setPendingPurgeId(null);
        }}
        onCancel={() => setPendingPurgeId(null)}
      />
    </section>
  );
}
