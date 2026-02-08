"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { Customer } from "@/domain/types";
import { ConfirmModal } from "@/components/confirm-modal";

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

  const requestCancel = () => {
    if (!dirty) return;
    setConfirmDiscard(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-medium">{customer.name}</div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          关联订单 {orderCount} · 关联待办 {todoTitles.length}
        </span>
      </div>
      <input
        className="mt-2 w-full rounded-lg px-2 py-1 text-sm"
        value={draftPhone}
        onChange={(e) => setDraftPhone(e.target.value)}
        placeholder="电话"
      />
      <textarea
        className="mt-2 w-full rounded-lg px-2 py-1 text-sm"
        value={draftNotes}
        onChange={(e) => setDraftNotes(e.target.value)}
        placeholder="备注"
      />
      <div className="mt-2 flex gap-2">
        <button
          className="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-sm text-white hover:bg-emerald-700"
          onClick={() => onSave(customer.id, { phone: draftPhone, notes: draftNotes })}
          disabled={!dirty}
        >
          保存
        </button>
        <button className="flex-1 rounded-lg bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300" onClick={requestCancel} disabled={!dirty}>
          取消
        </button>
        <button className="rounded-lg bg-rose-600 px-2 py-1 text-sm text-white hover:bg-rose-700" onClick={() => onDelete(customer.id)}>
          删除
        </button>
      </div>
      <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
        最近待办：
        {todoTitles.slice(-3).join(" / ") || "无"}
      </div>
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
    </div>
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
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.contactName, c.phone, c.region].join(" ").toLowerCase().includes(q));
  }, [customers, query]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">客户库</h2>
      {message && <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-slate-900">新建客户</h3>
          <span className="text-xs text-slate-500">支持姓名与电话快速录入</span>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2" placeholder="客户名称（必填）" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2" placeholder="电话（可选）" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button
            className="rounded-lg bg-sky-600 px-3 py-2 text-white shadow-sm transition hover:bg-sky-700"
            onClick={() => {
              if (!name.trim()) return;
              addCustomer({ name: name.trim(), phone: phone.trim() || undefined });
              setName("");
              setPhone("");
            }}
          >
            新建客户
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="text-sm text-slate-600">客户搜索</div>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">结果 {list.length}</span>
          {!!query && (
            <button className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200" onClick={() => setQuery("")}>
              清空搜索
            </button>
          )}
          <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              className={`rounded-md px-2 py-1 text-xs ${viewMode === "card" ? "bg-white text-sky-700 shadow-sm" : "text-slate-600"}`}
              onClick={() => setViewMode("card")}
            >
              卡片视图
            </button>
            <button
              className={`rounded-md px-2 py-1 text-xs ${viewMode === "list" ? "bg-white text-sky-700 shadow-sm" : "text-slate-600"}`}
              onClick={() => setViewMode("list")}
            >
              列表视图
            </button>
          </div>
        </div>
        <input className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" placeholder="搜索客户（姓名/联系人/电话/区域）" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {viewMode === "card" && (
        <div className="grid gap-3 md:grid-cols-2">
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
      )}

      {viewMode === "list" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table aria-label="客户列表" className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">客户</th>
                <th className="px-3 py-2 text-left">电话</th>
                <th className="px-3 py-2 text-left">关联订单</th>
                <th className="px-3 py-2 text-left">关联待办</th>
                <th className="px-3 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((customer) => {
                const orderCount = orders.filter((o) => o.customerId === customer.id).length;
                const todoCount = todos.filter((t) => t.customerId === customer.id).length;
                return (
                  <tr key={customer.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{customer.name}</td>
                    <td className="px-3 py-2 text-slate-600">{customer.phone || "-"}</td>
                    <td className="px-3 py-2 text-slate-600">{orderCount}</td>
                    <td className="px-3 py-2 text-slate-600">{todoCount}</td>
                    <td className="px-3 py-2">
                      <button className="rounded bg-rose-600 px-2 py-1 text-xs text-white" onClick={() => setPendingDeleteCustomerId(customer.id)}>
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
