"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { Customer } from "@/domain/types";
import { ConfirmModal } from "@/components/confirm-modal";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/layout/filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

function EditableCustomerCard({
  customer,
  orderCount,
  todoTitles,
  onSave,
  onDelete,
}: {
  customer: Customer;
  orderCount: number;
  todoTitles: string[];
  onSave: (id: string, patch: Partial<Customer>) => void;
  onDelete: (id: string) => void;
}) {
  const [draftPhone, setDraftPhone] = useState(customer.phone || "");
  const [draftNotes, setDraftNotes] = useState(customer.notes || "");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = draftPhone !== (customer.phone || "") || draftNotes !== (customer.notes || "");

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900">{customer.name}</p>
          <Badge variant="default">订单 {orderCount} · 待办 {todoTitles.length}</Badge>
        </div>

        <Input value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} placeholder="电话" />
        <Textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} placeholder="备注" />

        <div className="flex gap-2">
          <Button className="flex-1" variant="primary" disabled={!dirty} onClick={() => onSave(customer.id, { phone: draftPhone, notes: draftNotes })}>
            保存
          </Button>
          <Button className="flex-1" variant="secondary" disabled={!dirty} onClick={() => setConfirmDiscard(true)}>
            取消
          </Button>
          <Button variant="ghost" onClick={() => onDelete(customer.id)}>
            更多
          </Button>
        </div>

        <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">最近待办：{todoTitles.slice(-3).join(" / ") || "无"}</div>
      </CardContent>

      <ConfirmModal
        open={confirmDiscard}
        title="确认撤销本次变更"
        description="你有未保存的客户修改，确认取消并撤销吗？"
        confirmText="确认撤销"
        cancelText="继续编辑"
        onConfirm={() => {
          setDraftPhone(customer.phone || "");
          setDraftNotes(customer.notes || "");
          setConfirmDiscard(false);
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </Card>
  );
}

export function CustomersPage() {
  const customers = useAppStore((s) => s.customers);
  const orders = useAppStore((s) => s.orders);
  const todos = useAppStore((s) => s.todos);
  const addCustomer = useAppStore((s) => s.addCustomer);
  const updateCustomer = useAppStore((s) => s.updateCustomer);
  const deleteCustomer = useAppStore((s) => s.deleteCustomerToRecycleBin);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingDeleteCustomerId, setPendingDeleteCustomerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("list");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.contactName, c.phone, c.region].join(" ").toLowerCase().includes(q));
  }, [customers, query]);

  return (
    <section className="space-y-6">
      <PageHeader title="客户库" description="客户信息维护与关联分析。" />

      {message ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div> : null}

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input placeholder="客户名称（必填）" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="电话（可选）" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button
            variant="primary"
            onClick={() => {
              if (!name.trim()) return;
              addCustomer({ name: name.trim(), phone: phone.trim() || undefined });
              setName("");
              setPhone("");
            }}
          >
            新建客户
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[260px] flex-1"
            placeholder="搜索客户（姓名/联系人/电话/区域）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              className={cn("rounded-lg px-3 py-1 text-xs", viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
              onClick={() => setViewMode("list")}
            >
              列表视图
            </button>
            <button
              className={cn("rounded-lg px-3 py-1 text-xs", viewMode === "card" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
              onClick={() => setViewMode("card")}
            >
              卡片视图
            </button>
          </div>
          <Badge variant="default">结果 {list.length}</Badge>
        </div>
      </FilterBar>

      {!list.length ? <EmptyState title="暂无客户" description="先创建客户，或清空筛选条件后重试。" /> : null}

      {list.length && viewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((customer) => (
            <EditableCustomerCard
              key={customer.id}
              customer={customer}
              orderCount={orders.filter((o) => o.customerId === customer.id).length}
              todoTitles={todos.filter((t) => t.customerId === customer.id).map((t) => t.title)}
              onSave={updateCustomer}
              onDelete={setPendingDeleteCustomerId}
            />
          ))}
        </div>
      ) : null}

      {list.length && viewMode === "list" ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table aria-label="客户列表" className="min-w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">客户</th>
                  <th className="px-4 py-3 text-left">电话</th>
                  <th className="px-4 py-3 text-left">关联订单</th>
                  <th className="px-4 py-3 text-left">关联待办</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((customer) => {
                  const orderCount = orders.filter((o) => o.customerId === customer.id).length;
                  const todoCount = todos.filter((t) => t.customerId === customer.id).length;
                  return (
                    <tr key={customer.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{customer.name}</td>
                      <td className="px-4 py-3 text-slate-600">{customer.phone || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{orderCount}</td>
                      <td className="px-4 py-3 text-slate-600">{todoCount}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => setPendingDeleteCustomerId(customer.id)}>
                          更多
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmModal
        open={!!pendingDeleteCustomerId}
        title="确认删除客户"
        description="客户将移入回收站。若存在关联订单，将无法删除。"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={() => {
          if (!pendingDeleteCustomerId) return;
          const result = deleteCustomer(pendingDeleteCustomerId);
          setMessage(result.ok ? "客户已移入回收站。" : result.message || "删除失败。");
          setPendingDeleteCustomerId(null);
        }}
        onCancel={() => setPendingDeleteCustomerId(null)}
      />
    </section>
  );
}
