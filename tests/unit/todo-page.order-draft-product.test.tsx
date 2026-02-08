import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TodoPage } from "@/features/todos/todo-page";
import { useAppStore } from "@/store/appStore";

beforeEach(() => {
  useAppStore.setState({
    customers: [],
    todos: [],
    orders: [],
    products: [
      {
        id: "p-1",
        model: "SM-100",
        name: "扫码枪100",
        productType: "catalog",
        status: "在售",
        specs: {},
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    recycleBin: [],
    selectedDate: "2026-02-07",
    loading: false,
    storageFallback: false,
    storageError: undefined,
  });
});

describe("TodoPage order draft by product", () => {
  it("创建待办时应支持选择产品型号与数量", () => {
    render(<TodoPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "客户名称" }), { target: { value: "客户A" } });
    fireEvent.change(screen.getByLabelText("待办标题"), { target: { value: "跟进报价" } });
    fireEvent.change(screen.getByLabelText("订单产品型号"), { target: { value: "p-1" } });
    fireEvent.change(screen.getByLabelText("订单数量"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "新建待办（Ctrl/Cmd+Enter）" }));

    const state = useAppStore.getState();
    expect(state.todos).toHaveLength(1);
    expect(state.todos[0].orderDraft.items).toEqual([
      {
        kind: "catalog",
        productId: "p-1",
        quantity: 3,
      },
    ]);
  });

  it("应支持在面板内新建产品并用于订单草稿", () => {
    render(<TodoPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "客户名称" }), { target: { value: "客户B" } });
    fireEvent.change(screen.getByLabelText("待办标题"), { target: { value: "样机测试" } });
    fireEvent.click(screen.getByRole("button", { name: "新建产品入口" }));
    fireEvent.change(screen.getByLabelText("新产品型号"), { target: { value: "SM-NEW-1" } });
    fireEvent.change(screen.getByLabelText("新产品名称"), { target: { value: "新款扫码枪" } });
    fireEvent.click(screen.getByRole("button", { name: "创建并选择产品" }));
    fireEvent.click(screen.getByRole("button", { name: "新建待办（Ctrl/Cmd+Enter）" }));

    const state = useAppStore.getState();
    const createdProduct = state.products.find((item) => item.model === "SM-NEW-1");
    expect(createdProduct).toBeTruthy();
    expect(state.todos).toHaveLength(1);
    expect(state.todos[0].orderDraft.items[0].kind).toBe("catalog");
    expect(state.todos[0].orderDraft.items[0].productId).toBe(createdProduct?.id);
  });
});
