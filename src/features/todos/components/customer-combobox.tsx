"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@/domain/types";

export function CustomerCombobox({
  customers,
  value,
  selectedCustomerId,
  onInputChange,
  onSelectCustomer,
}: {
  customers: Customer[];
  value: string;
  selectedCustomerId: string | null;
  onInputChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
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
        role="combobox"
        aria-expanded={open && candidates.length > 0}
        aria-controls="todo-customer-candidate-list"
        className="w-full rounded border px-2 py-2"
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
      {selectedName && <div className="mt-1 text-xs text-emerald-700">已选客户：{selectedName}</div>}
      {open && candidates.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded border bg-white shadow-md">
          <ul id="todo-customer-candidate-list" role="listbox" className="max-h-64 overflow-y-auto py-1">
            {candidates.map((customer, index) => (
              <li key={customer.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={highlightedIndex === index}
                  className={`w-full px-3 py-2 text-left text-sm ${highlightedIndex === index ? "bg-sky-100" : "hover:bg-slate-100"}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => applySelection(customer)}
                  aria-label={`选择客户 ${customer.name}`}
                >
                  {customer.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
