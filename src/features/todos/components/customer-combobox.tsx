"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@/domain/types";
import { cn } from "@/lib/cn";

function highlightName(name: string, query: string): Array<{ text: string; match: boolean }> {
  const q = query.trim();
  if (!q) return [{ text: name, match: false }];
  const lowerName = name.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lowerName.indexOf(lowerQ);
  if (idx < 0) return [{ text: name, match: false }];
  const end = idx + q.length;
  const parts: Array<{ text: string; match: boolean }> = [];
  if (idx > 0) parts.push({ text: name.slice(0, idx), match: false });
  parts.push({ text: name.slice(idx, end), match: true });
  if (end < name.length) parts.push({ text: name.slice(end), match: false });
  return parts;
}

export function CustomerCombobox({
  customers,
  value,
  selectedCustomerId,
  orderCountByCustomerId,
  todoCountByCustomerId,
  onInputChange,
  onSelectCustomer,
  invalid,
  errorMessage,
}: {
  customers: Customer[];
  value: string;
  selectedCustomerId: string | null;
  orderCountByCustomerId?: Record<string, number>;
  todoCountByCustomerId?: Record<string, number>;
  onInputChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  invalid?: boolean;
  errorMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const candidates = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((customer) => customer.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aLower = a.name.toLowerCase();
        const bLower = b.name.toLowerCase();
        const aPrefix = aLower.startsWith(q) ? 1 : 0;
        const bPrefix = bLower.startsWith(q) ? 1 : 0;
        if (aPrefix !== bPrefix) return bPrefix - aPrefix;
        return a.name.length - b.name.length;
      })
      .slice(0, 8);
  }, [customers, value]);

  const selectedName = selectedCustomerId ? customers.find((item) => item.id === selectedCustomerId)?.name : "";

  const applySelection = (customer: Customer) => {
    onSelectCustomer(customer);
    setOpen(false);
    setHighlightedIndex(0);
  };

  return (
    <div className="relative">
      <input
        aria-label="客户名称"
        aria-invalid={invalid ? "true" : "false"}
        role="combobox"
        aria-expanded={open && candidates.length > 0}
        aria-controls="todo-customer-candidate-list"
        className={cn(
          "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200",
          invalid ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200" : "",
        )}
        placeholder="客户名称（必填）"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onInputChange(event.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={(event) => {
          if (!candidates.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex((idx) => Math.min(idx + 1, candidates.length - 1));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((idx) => Math.max(idx - 1, 0));
            return;
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            applySelection(candidates[highlightedIndex] || candidates[0]);
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {errorMessage ? <p className="mt-1 text-xs text-rose-600">{errorMessage}</p> : null}
      {selectedName ? <div className="mt-1 text-xs text-emerald-700">已选客户：{selectedName}</div> : null}
      {open && candidates.length > 0 ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <ul id="todo-customer-candidate-list" role="listbox" className="max-h-72 overflow-y-auto p-2">
            {candidates.map((customer, index) => (
              <li key={customer.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={highlightedIndex === index}
                  className={cn(
                    "mb-1 w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    highlightedIndex === index
                      ? "border-sky-300 bg-sky-50"
                      : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50",
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => applySelection(customer)}
                  aria-label={`选择客户 ${customer.name}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {highlightName(customer.name, value).map((part, idx) => (
                          <span key={`${customer.id}-name-${idx}`} className={part.match ? "rounded bg-amber-200 px-0.5" : ""}>
                            {part.text}
                          </span>
                        ))}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        关联订单 {orderCountByCustomerId?.[customer.id] || 0} · 关联待办 {todoCountByCustomerId?.[customer.id] || 0}
                      </p>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Enter</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
