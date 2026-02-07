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

describe("TodoPage validation", () => {
  it("新建失败时应提示必填项并高亮输入框", () => {
    render(<TodoPage />);

    fireEvent.click(screen.getByRole("button", { name: "新建待办（Ctrl/Cmd+Enter）" }));

    expect(screen.getByText("请先完善必填项后再新建待办。")).toBeInTheDocument();
    expect(screen.getByText("请填写客户名称。")).toBeInTheDocument();
    expect(screen.getByText("请填写待办标题。")).toBeInTheDocument();
  });
});
