"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { ConfirmModal } from "@/components/confirm-modal";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/layout/filter-bar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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
    <section className="space-y-6">
      <PageHeader title="回收站" description="支持恢复与永久删除。危险操作统一二次确认。" />

      {message ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div> : null}

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <Input placeholder="搜索名称/型号/订单号" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="">全部类型</option>
            <option value="order">订单</option>
            <option value="customer">客户</option>
            <option value="product">产品</option>
          </Select>
          <Button variant="secondary" onClick={() => { setQuery(""); setTypeFilter(""); }}>
            清空筛选
          </Button>
        </div>
      </FilterBar>

      {!list.length ? (
        <EmptyState
          title="回收站为空"
          description="当前没有已删除数据。"
          action={{ label: "返回并继续工作", variant: "secondary", onClick: () => { setQuery(""); setTypeFilter(""); } }}
        />
      ) : null}

      {list.length ? (
        <div className="grid gap-3">
          {list.map((item) => {
            const snapshot = item.snapshot as { name?: string; model?: string; orderNo?: string };
            return (
              <Card key={item.id}>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{item.entityType}</Badge>
                    <p className="text-sm font-medium text-slate-900">{snapshot.orderNo || snapshot.name || snapshot.model || item.entityId}</p>
                    <p className="text-xs text-slate-500">删除时间：{new Date(item.deletedAt).toLocaleString("zh-CN")}</p>
                  </div>
                  {item.reason ? <p className="text-xs text-slate-500">原因：{item.reason}</p> : null}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const result = restore(item.id);
                        setMessage(result.ok ? "恢复成功。" : result.message || "恢复失败。");
                      }}
                    >
                      恢复
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingPurgeId(item.id)}>
                      彻底删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

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
