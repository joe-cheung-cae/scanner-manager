"use client";

import { useMemo, useState } from "react";
import { ORDER_STATUS } from "@/domain/types";
import { useAppStore } from "@/store/appStore";
import { exportOrdersToCsv, exportOrdersToJson } from "@/lib/import-export/csv";
import { DownloadButton } from "@/components/download-button";
import { ConfirmModal } from "@/components/confirm-modal";

export function OrdersPage() {
  const orders = useAppStore((s) => s.orders);
  const customers = useAppStore((s) => s.customers);
  const transition = useAppStore((s) => s.transitionOrderStatus);
  const appendTimeline = useAppStore((s) => s.appendOrderTimeline);
  const archiveCustom = useAppStore((s) => s.archiveCustomItemToProduct);
  const undoArchiveCustom = useAppStore((s) => s.undoArchiveCustomItem);
  const deleteOrder = useAppStore((s) => s.deleteOrderToRecycleBin);

  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders[0]?.id || null);
  const [timelineText, setTimelineText] = useState("");
  const [pendingDeleteOrderId, setPendingDeleteOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return orders.filter((o) => {
      const customer = customers.find((c) => c.id === o.customerId);
      const hay = [o.orderNo, o.status, o.type, customer?.name, o.items.map((x) => x.snapshot?.model || x.customSpecText).join(" ")]
        .join(" ")
        .toLowerCase();
      const passQuery = !q || hay.includes(q);
      const passStatus = !statusFilter || o.status === statusFilter;
      const passType = !typeFilter || o.type === typeFilter;
      const passCustomer = !customerFilter || o.customerId === customerFilter;
      return passQuery && passStatus && passType && passCustomer;
    });
  }, [orders, customers, query, statusFilter, typeFilter, customerFilter]);

  const selected = filtered.find((o) => o.id === selectedOrderId) || filtered[0] || null;

  return (
    <section className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">订单库</h2>
          <div className="flex gap-2">
            <DownloadButton filename="orders.csv" content={exportOrdersToCsv(orders)} label="导出 CSV" />
            <DownloadButton filename="orders.json" content={exportOrdersToJson(orders)} label="导出 JSON" />
          </div>
        </div>
        <input className="w-full rounded-lg px-3 py-2" placeholder="搜索订单号/客户/型号关键词" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="grid gap-2 md:grid-cols-3">
          <select className="rounded-lg px-2 py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            {ORDER_STATUS.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
          <select className="rounded-lg px-2 py-2" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">全部类型</option>
            <option value="order">正式订单</option>
            <option value="opportunity">线索机会</option>
          </select>
          <select className="rounded-lg px-2 py-2" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
            <option value="">全部客户</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="max-h-[65vh] space-y-2 overflow-auto">
          {filtered.map((o) => {
            const customer = customers.find((c) => c.id === o.customerId);
            return (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`w-full rounded-xl border p-2 text-left transition ${
                  selected?.id === o.id ? "border-sky-400 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="font-medium">{o.orderNo}</div>
                <div className="text-xs text-slate-600">{customer?.name || "未知客户"} · {o.type === "order" ? "正式订单" : "线索机会"}</div>
                <div className="mt-1 text-xs text-emerald-700">{o.status}</div>
              </button>
            );
          })}
          {!filtered.length && <div className="text-sm text-slate-500">暂无匹配订单</div>}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
        {message && <div className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-sm text-amber-800">{message}</div>}
        {!selected && <div className="text-sm text-slate-500">请选择订单</div>}
        {selected && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{selected.orderNo}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{selected.type === "order" ? "正式订单" : "线索机会"}</span>
              <select
                className="rounded-lg px-2 py-1"
                value={selected.status}
                onChange={(e) => transition(selected.id, e.target.value as (typeof ORDER_STATUS)[number])}
              >
                {ORDER_STATUS.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
              <button className="rounded-lg bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700" onClick={() => setPendingDeleteOrderId(selected.id)}>
                删除订单
              </button>
            </div>

            <div>
              <div className="mb-1 font-medium">条目</div>
              <div className="space-y-2">
                {selected.items.map((item, idx) => (
                  <div key={`${selected.id}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2 text-sm">
                    <div>类型: {item.kind}</div>
                    <div>内容: {item.snapshot?.model || item.customSpecText || item.productId || "-"}</div>
                    <div>数量: {item.quantity}</div>
                    {item.kind === "newCustom" && (
                      <button className="mt-2 rounded-lg bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700" onClick={() => archiveCustom(selected.id, idx)}>
                        归档为产品
                      </button>
                    )}
                    {item.kind === "archivedCustom" && (
                      <button
                        className="mt-2 rounded-lg bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-800"
                        onClick={() => {
                          const result = undoArchiveCustom(selected.id, idx);
                          setMessage(result.ok ? "已撤销归档，产品已移入回收站，可在回收站恢复。" : result.message || "撤销归档失败。");
                        }}
                      >
                        撤销归档
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 font-medium">跟单时间线</div>
              <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50/70 p-2">
                {selected.timeline.map((t, i) => (
                  <div key={`${selected.id}-timeline-${i}`} className="text-sm">
                    <span className="text-slate-500">{new Date(t.at).toLocaleString("zh-CN")}</span>
                    <span className="mx-2">{t.action}</span>
                    {t.detail && <span className="text-slate-700">{t.detail}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input className="flex-1 rounded-lg px-2 py-1" placeholder="添加跟单记录" value={timelineText} onChange={(e) => setTimelineText(e.target.value)} />
                <button
                  className="rounded-lg bg-sky-600 px-3 py-1 text-white hover:bg-sky-700"
                  onClick={() => {
                    if (!timelineText.trim()) return;
                    appendTimeline(selected.id, timelineText.trim());
                    setTimelineText("");
                  }}
                >
                  添加
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <ConfirmModal
        open={!!pendingDeleteOrderId}
        title="确认删除订单"
        description="订单将移入回收站，可在回收站恢复。"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={() => {
          if (!pendingDeleteOrderId) return;
          const result = deleteOrder(pendingDeleteOrderId);
          setMessage(result.ok ? "订单已移入回收站。" : result.message || "删除失败。");
          setPendingDeleteOrderId(null);
          setSelectedOrderId(null);
        }}
        onCancel={() => setPendingDeleteOrderId(null)}
      />
    </section>
  );
}
