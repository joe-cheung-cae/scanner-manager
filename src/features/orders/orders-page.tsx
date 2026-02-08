"use client";

import { useMemo, useState } from "react";
import { ORDER_STATUS } from "@/domain/types";
import { useAppStore } from "@/store/appStore";
import { exportOrdersToCsv, exportOrdersToJson } from "@/lib/import-export/csv";
import { DownloadButton } from "@/components/download-button";
import { ConfirmModal } from "@/components/confirm-modal";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/layout/filter-bar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

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
    <section className="space-y-6">
      <PageHeader
        title="订单库"
        description="左侧列表右侧详情，按状态、类型、客户快速筛选。"
        actions={
          <>
            <DownloadButton filename="orders.csv" content={exportOrdersToCsv(orders)} label="导出 CSV" />
            <DownloadButton filename="orders.json" content={exportOrdersToJson(orders)} label="导出 JSON" />
          </>
        }
      />

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="搜索订单号/客户/型号关键词" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            {ORDER_STATUS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">全部类型</option>
            <option value="order">正式订单</option>
            <option value="opportunity">线索机会</option>
          </Select>
          <Select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
            <option value="">全部客户</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </FilterBar>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-base font-semibold">订单列表</h3>
              <p className="text-xs text-slate-500">共 {filtered.length} 条</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[62vh] space-y-2 overflow-auto pr-1">
              {filtered.map((o) => {
                const customer = customers.find((c) => c.id === o.customerId);
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition",
                      selected?.id === o.id
                        ? "border-sky-300 bg-sky-50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{o.orderNo}</p>
                      <Badge variant={o.type === "order" ? "info" : "default"}>{o.type === "order" ? "正式订单" : "线索机会"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{customer?.name || "未知客户"}</p>
                    <p className="mt-1 text-xs text-emerald-700">{o.status}</p>
                  </button>
                );
              })}
              {!filtered.length ? (
                <EmptyState title="暂无匹配订单" description="调整筛选条件，或从待办完成转换生成订单。" />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3 className="text-base font-semibold">订单详情</h3>
              <p className="text-xs text-slate-500">字段分组展示，保持高密度可读性。</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {message ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div> : null}
            {!selected ? <EmptyState title="请选择订单" description="从左侧列表选择一个订单查看详情。" /> : null}
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-semibold">{selected.orderNo}</h4>
                  <Badge variant={selected.type === "order" ? "info" : "default"}>{selected.type === "order" ? "正式订单" : "线索机会"}</Badge>
                  <div className="w-40">
                    <Select value={selected.status} onChange={(e) => transition(selected.id, e.target.value as (typeof ORDER_STATUS)[number])}>
                      {ORDER_STATUS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setPendingDeleteOrderId(selected.id)}>
                    删除订单
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500">条目</p>
                  {selected.items.map((item, idx) => (
                    <div key={`${selected.id}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-700">
                      <p>类型: {item.kind}</p>
                      <p>内容: {item.snapshot?.model || item.customSpecText || item.productId || "-"}</p>
                      <p>数量: {item.quantity}</p>
                      {item.kind === "newCustom" ? (
                        <Button className="mt-2" size="sm" variant="secondary" onClick={() => archiveCustom(selected.id, idx)}>
                          归档为产品
                        </Button>
                      ) : null}
                      {item.kind === "archivedCustom" ? (
                        <Button
                          className="mt-2"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const result = undoArchiveCustom(selected.id, idx);
                            setMessage(result.ok ? "已撤销归档，产品已移入回收站，可在回收站恢复。" : result.message || "撤销归档失败。");
                          }}
                        >
                          撤销归档
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500">跟单时间线</p>
                  <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    {selected.timeline.map((t, i) => (
                      <div key={`${selected.id}-timeline-${i}`} className="text-sm">
                        <span className="text-slate-500">{new Date(t.at).toLocaleString("zh-CN")}</span>
                        <span className="mx-2">{t.action}</span>
                        {t.detail ? <span className="text-slate-700">{t.detail}</span> : null}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input className="flex-1" placeholder="添加跟单记录" value={timelineText} onChange={(e) => setTimelineText(e.target.value)} />
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (!timelineText.trim()) return;
                        appendTimeline(selected.id, timelineText.trim());
                        setTimelineText("");
                      }}
                    >
                      添加
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
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
