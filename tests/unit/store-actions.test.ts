import { beforeEach, describe, expect, it } from "vitest";
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

describe("store actions", () => {
  it("应支持待办编辑、删除与取消完成", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户D" });
    const todoId = useAppStore.getState().addTodo({
      title: "初次沟通",
      customerId,
    });

    useAppStore.getState().updateTodo(todoId, { title: "二次沟通" });
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

  it("新增待办应保存提醒提前分钟数", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户T" });
    const todoId = useAppStore.getState().addTodo({
      title: "提醒测试",
      customerId,
      reminderTime: "10:00",
      remindBeforeMinutes: 30,
    });

    const todo = useAppStore.getState().todos.find((x) => x.id === todoId);
    expect(todo?.remindBeforeMinutes).toBe(30);
  });

  it("新增待办不应再包含沟通纪要字段", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户NoSummary" });
    const todoId = useAppStore.getState().addTodo({
      title: "无纪要测试",
      customerId,
    });
    const todo = useAppStore.getState().todos.find((x) => x.id === todoId);
    expect("summary" in (todo || {})).toBe(false);
  });

  it("待办编辑应仅更新标题", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户Edit" });
    const todoId = useAppStore.getState().addTodo({
      title: "旧标题",
      customerId,
    });
    useAppStore.getState().updateTodo(todoId, { title: "新标题" });
    const todo = useAppStore.getState().todos.find((x) => x.id === todoId);
    expect(todo?.title).toBe("新标题");
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

  it("归档条目应支持撤销：恢复为 newCustom 且产品移入回收站", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户Undo" });
    const todoId = useAppStore.getState().addTodo({
      title: "撤销归档测试",
      customerId,
      orderDraft: { items: [{ kind: "newCustom", customSpecText: "定制规格XYZ", quantity: 1 }] },
    });
    useAppStore.getState().completeTodoWithConversion(todoId, "order");
    const orderId = useAppStore.getState().orders[0].id;
    const productId = useAppStore.getState().archiveCustomItemToProduct(orderId, 0);

    const result = useAppStore.getState().undoArchiveCustomItem(orderId, 0);
    expect(result.ok).toBe(true);

    const state = useAppStore.getState();
    expect(state.orders[0].items[0].kind).toBe("newCustom");
    expect(state.orders[0].items[0].productId).toBeUndefined();
    expect(state.orders[0].items[0].customSpecText).toBe("定制规格XYZ");
    expect(state.products.some((x) => x.id === productId)).toBe(false);
    expect(state.recycleBin.some((x) => x.entityType === "product" && x.entityId === productId)).toBe(true);
    expect(state.orders[0].timeline.at(-1)?.action).toContain("已撤销归档");
  });

  it("订单删除应进入回收站并可恢复", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户R1" });
    const todoId = useAppStore.getState().addTodo({
      title: "待删除订单",
      customerId,
      orderDraft: { items: [{ kind: "newCustom", customSpecText: "测试规格", quantity: 1 }] },
    });
    useAppStore.getState().completeTodoWithConversion(todoId, "order");
    const orderId = useAppStore.getState().orders[0].id;

    const del = useAppStore.getState().deleteOrderToRecycleBin(orderId);
    expect(del.ok).toBe(true);
    expect(useAppStore.getState().orders).toHaveLength(0);
    expect(useAppStore.getState().recycleBin).toHaveLength(1);

    const recycleId = useAppStore.getState().recycleBin[0].id;
    const restore = useAppStore.getState().restoreFromRecycleBin(recycleId);
    expect(restore.ok).toBe(true);
    expect(useAppStore.getState().orders).toHaveLength(1);
  });

  it("有关联订单时客户删除应被阻止", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户R2" });
    const todoId = useAppStore.getState().addTodo({
      title: "订单关联客户",
      customerId,
      orderDraft: { items: [{ kind: "newCustom", customSpecText: "规格", quantity: 1 }] },
    });
    useAppStore.getState().completeTodoWithConversion(todoId, "order");

    const result = useAppStore.getState().deleteCustomerToRecycleBin(customerId);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("关联订单");
  });

  it("有关联订单时产品删除应被阻止", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户R3" });
    const productId = useAppStore.getState().addProduct({ model: "SM-R3", name: "测试产品" });
    const todoId = useAppStore.getState().addTodo({
      title: "产品关联订单",
      customerId,
      orderDraft: { items: [{ kind: "catalog", productId, quantity: 1 }] },
    });
    useAppStore.getState().completeTodoWithConversion(todoId, "order");

    const result = useAppStore.getState().deleteProductToRecycleBin(productId);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("关联订单");
  });

  it("恢复订单时若客户缺失应失败", () => {
    const customerId = useAppStore.getState().addCustomer({ name: "客户R4" });
    const todoId = useAppStore.getState().addTodo({
      title: "恢复校验订单",
      customerId,
      orderDraft: { items: [{ kind: "newCustom", customSpecText: "规格", quantity: 1 }] },
    });
    useAppStore.getState().completeTodoWithConversion(todoId, "order");
    const orderId = useAppStore.getState().orders[0].id;
    const deleted = useAppStore.getState().deleteOrderToRecycleBin(orderId);
    expect(deleted.ok).toBe(true);

    const customerDelete = useAppStore.getState().deleteCustomerToRecycleBin(customerId);
    expect(customerDelete.ok).toBe(true);

    const recycleOrder = useAppStore.getState().recycleBin.find((x) => x.entityType === "order");
    expect(recycleOrder).toBeTruthy();
    const restore = useAppStore.getState().restoreFromRecycleBin(recycleOrder!.id);
    expect(restore.ok).toBe(false);
    expect(restore.message).toContain("关联客户不存在");
  });
});
