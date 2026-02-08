import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Customer } from "@/domain/types";
import { CustomerCombobox } from "@/features/todos/components/customer-combobox";

const now = 1;

const customers: Customer[] = [
  { id: "c1", name: "客户A", createdAt: now, updatedAt: now },
  { id: "c2", name: "深圳客户B", createdAt: now, updatedAt: now },
  { id: "c3", name: "广州客户C", createdAt: now, updatedAt: now },
];

describe("CustomerCombobox", () => {
  function Harness({ onSelectCustomer }: { onSelectCustomer: (customer: Customer) => void }) {
    const [value, setValue] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    return (
      <CustomerCombobox
        customers={customers}
        value={value}
        selectedCustomerId={selectedCustomerId}
        orderCountByCustomerId={{ c1: 2, c2: 5, c3: 0 }}
        todoCountByCustomerId={{ c1: 1, c2: 3, c3: 0 }}
        onInputChange={(next) => {
          setValue(next);
          if (selectedCustomerId) setSelectedCustomerId(null);
        }}
        onSelectCustomer={(customer) => {
          setSelectedCustomerId(customer.id);
          setValue(customer.name);
          onSelectCustomer(customer);
        }}
      />
    );
  }

  it("输入后应显示匹配候选，点击后触发选择", () => {
    const onSelectCustomer = vi.fn();

    render(<Harness onSelectCustomer={onSelectCustomer} />);

    const input = screen.getByRole("combobox", { name: "客户名称" });
    fireEvent.change(input, { target: { value: "客户" } });
    expect(screen.getByRole("option", { name: "选择客户 深圳客户B" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "选择客户 深圳客户B" }));
    expect(onSelectCustomer).toHaveBeenCalledWith(customers[1]);
  });

  it("键盘向下并回车应选中高亮候选", () => {
    const onSelectCustomer = vi.fn();

    render(<Harness onSelectCustomer={onSelectCustomer} />);

    const input = screen.getByRole("combobox", { name: "客户名称" });
    fireEvent.change(input, { target: { value: "客户" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelectCustomer).toHaveBeenCalledTimes(1);
  });

  it("候选项应显示来源信息（关联订单数与关联待办数）", () => {
    const onSelectCustomer = vi.fn();
    render(<Harness onSelectCustomer={onSelectCustomer} />);
    const input = screen.getByRole("combobox", { name: "客户名称" });
    fireEvent.change(input, { target: { value: "深圳" } });

    expect(screen.getByText("关联订单 5 · 关联待办 3")).toBeInTheDocument();
  });
});
