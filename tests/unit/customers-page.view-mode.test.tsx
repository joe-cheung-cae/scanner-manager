import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CustomersPage } from "@/features/customers/customers-page";
import { useAppStore } from "@/store/appStore";

beforeEach(() => {
  useAppStore.setState({
    customers: [
      { id: "c1", name: "客户A", createdAt: 1, updatedAt: 1 },
      { id: "c2", name: "客户B", createdAt: 1, updatedAt: 1 },
    ],
    todos: [],
    orders: [],
    products: [],
    recycleBin: [],
    selectedDate: "2026-02-07",
    loading: false,
    storageFallback: false,
    storageError: undefined,
  });
});

describe("CustomersPage view mode", () => {
  it("应默认卡片视图并可切换到列表视图", () => {
    render(<CustomersPage />);
    expect(screen.getByText("卡片视图")).toBeInTheDocument();
    expect(screen.getByText("列表视图")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "列表视图" }));
    expect(screen.getByRole("table", { name: "客户列表" })).toBeInTheDocument();
  });
});
