"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";

export function CustomersPage() {
  const customers = useAppStore((s) => s.customers);
  const orders = useAppStore((s) => s.orders);
  const addCustomer = useAppStore((s) => s.addCustomer);
  const updateCustomer = useAppStore((s) => s.updateCustomer);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.contactName, c.phone, c.region].join(" ").toLowerCase().includes(q));
  }, [customers, query]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">客户库</h2>
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
        {list.map((c) => (
          <div key={c.id} className="rounded border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{c.name}</div>
              <span className="text-xs text-slate-500">关联订单 {orders.filter((o) => o.customerId === c.id).length}</span>
            </div>
            <input
              className="mt-2 w-full rounded border px-2 py-1 text-sm"
              value={c.phone || ""}
              onChange={(e) => updateCustomer(c.id, { phone: e.target.value })}
              placeholder="电话"
            />
            <textarea
              className="mt-2 w-full rounded border px-2 py-1 text-sm"
              value={c.notes || ""}
              onChange={(e) => updateCustomer(c.id, { notes: e.target.value })}
              placeholder="备注"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
