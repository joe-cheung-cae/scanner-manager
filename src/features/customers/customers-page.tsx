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
    <div className="rounded border bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{customer.name}</div>
        <span className="text-xs text-slate-500">
          关联订单 {orderCount} · 关联待办 {todoTitles.length}
        </span>
      </div>
      <input
        className="mt-2 w-full rounded border px-2 py-1 text-sm"
        value={draftPhone}
        onChange={(e) => setDraftPhone(e.target.value)}
        placeholder="电话"
      />
      <textarea
        className="mt-2 w-full rounded border px-2 py-1 text-sm"
        value={draftNotes}
        onChange={(e) => setDraftNotes(e.target.value)}
        placeholder="备注"
      />
      <div className="mt-2 flex gap-2">
        <button
          className="flex-1 rounded bg-emerald-600 px-2 py-1 text-sm text-white"
          onClick={() => onSave(customer.id, { phone: draftPhone, notes: draftNotes })}
          disabled={!dirty}
        >
          保存
        </button>
        <button className="flex-1 rounded bg-slate-200 px-2 py-1 text-sm" onClick={requestCancel} disabled={!dirty}>
          取消
        </button>
        <button className="rounded bg-rose-600 px-2 py-1 text-sm text-white" onClick={() => onDelete(customer.id)}>
          删除
        </button>
      </div>
      <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
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

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.contactName, c.phone, c.region].join(" ").toLowerCase().includes(q));
  }, [customers, query]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">客户库</h2>
      {message && <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>}
      <div className="grid gap-2 rounded border bg-white p-3 md:grid-cols-3">
        <input className="rounded border px-2 py-2" placeholder="客户名称" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="电话（可选）" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button
          className="rounded bg-sky-600 px-3 py-2 text-white"
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
      <input className="w-full rounded border bg-white px-2 py-2" placeholder="搜索客户" value={query} onChange={(e) => setQuery(e.target.value)} />
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
