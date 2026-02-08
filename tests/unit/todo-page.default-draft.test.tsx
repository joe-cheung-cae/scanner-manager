import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TodoPage } from "@/features/todos/todo-page";
import { useAppStore } from "@/store/appStore";

beforeEach(() => {
  useAppStore.setState({
    customers: [],
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

describe("TodoPage default order draft", () => {
  it("新建待办在未填写订单草稿时也应创建默认条目", () => {
    render(<TodoPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "客户名称" }), { target: { value: "客户A" } });
    fireEvent.change(screen.getByLabelText("待办标题"), { target: { value: "跟进报价" } });
    fireEvent.click(screen.getByRole("button", { name: "新建待办（Ctrl/Cmd+Enter）" }));

    const state = useAppStore.getState();
    expect(state.todos).toHaveLength(1);
    expect(state.todos[0].orderDraft.items).toHaveLength(1);
    expect(state.todos[0].orderDraft.items[0].kind).toBe("newCustom");
  });
});
