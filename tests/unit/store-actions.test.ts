import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/appStore";

beforeEach(() => {
  useAppStore.setState({
    customers: [],
    todos: [],
    orders: [],
    products: [],
    selectedDate: "2026-02-07",
    loading: false,
    storageFallback: false,
    storageError: undefined,
  });
});

describe("store actions", () => {
  it("应支持待办编辑、删除与取消完成", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户D" });
    const todoId = useAppStore.getState().addTodo({
      title: "初次沟通",
      customerId,
    });

    useAppStore.getState().updateTodo(todoId, { title: "二次沟通", summary: "更新纪要" });
    useAppStore.getState().setTodoCompleted(todoId, true);
    useAppStore.getState().setTodoCompleted(todoId, false);
    useAppStore.getState().deleteTodo(todoId);

    const state = useAppStore.getState();
    expect(state.todos.find((x) => x.id === todoId)).toBeUndefined();
  });

  it("完成待办必须生成订单并回写转换信息", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户A" });
    const todoId = useAppStore.getState().addTodo({
      title: "跟进报价",
      customerId,
      orderDraft: { items: [{ kind: "newCustom", customSpecText: "蓝牙+底座", quantity: 2 }] },
    });

    useAppStore.getState().completeTodoWithConversion(todoId, "order");

    const state = useAppStore.getState();
    expect(state.orders.length).toBe(1);
    expect(state.orders[0].type).toBe("order");
    const todo = state.todos.find((x) => x.id === todoId)!;
    expect(todo.completed).toBe(true);
    expect(todo.orderConversion?.orderId).toBe(state.orders[0].id);
  });

  it("订单状态流转应追加时间线", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户B" });
    const todoId = useAppStore.getState().addTodo({
      title: "待确认",
      customerId,
      orderDraft: { items: [{ kind: "newCustom", customSpecText: "防水款", quantity: 1 }] },
    });
    useAppStore.getState().completeTodoWithConversion(todoId, "opportunity");
    const orderId = useAppStore.getState().orders[0].id;

    useAppStore.getState().transitionOrderStatus(orderId, "已确认", "客户已确认样机");

    const order = useAppStore.getState().orders[0];
    expect(order.status).toBe("已确认");
    expect(order.timeline.at(-1)?.action).toContain("状态更新为");
  });

  it("定制条目归档后应加入产品库并替换订单条目类型", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户C" });
    const todoId = useAppStore.getState().addTodo({
      title: "定制项目",
      customerId,
      orderDraft: { items: [{ kind: "newCustom", customSpecText: "二维码+超宽温", quantity: 5 }] },
    });
    useAppStore.getState().completeTodoWithConversion(todoId, "order");
    const orderId = useAppStore.getState().orders[0].id;

    const productId = useAppStore.getState().archiveCustomItemToProduct(orderId, 0);

    const state = useAppStore.getState();
    expect(productId).toBeTruthy();
    expect(state.products.length).toBe(1);
    expect(state.orders[0].items[0].kind).toBe("archivedCustom");
    expect(state.orders[0].items[0].productId).toBe(productId);
  });
});
