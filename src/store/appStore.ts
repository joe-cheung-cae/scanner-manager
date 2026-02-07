"use client";

import { create } from "zustand";
import type {
  Customer,
  DraftItem,
  Order,
  OrderStatus,
  OrderType,
  Product,
  ProductSearchFilters,
  RecycleBinItem,
  Todo,
} from "@/domain/types";
import { ORDER_STATUS } from "@/domain/types";
import { createId } from "@/lib/id";
import { generateOrderNo } from "@/domain/order";
import { todayYmd } from "@/lib/date";
import { initialPersistedState, loadState, saveState } from "@/db/storage";
import { buildProductIndex, searchProducts } from "@/lib/search/productIndex";

interface AppState {
  customers: Customer[];
  todos: Todo[];
  orders: Order[];
  products: Product[];
  recycleBin: RecycleBinItem[];
  selectedDate: string;
  loading: boolean;
  storageFallback: boolean;
  storageError?: string;
  hydrate: () => Promise<void>;
  setDate: (date: string) => void;
  addCustomer: (payload: Pick<Customer, "name"> & Partial<Customer>) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addTodo: (payload: {
    date?: string;
    title: string;
    customerId: string;
    priority?: Todo["priority"];
    reminderTime?: string;
    remindBeforeMinutes?: number;
    tags?: string[];
    orderDraft?: { items: DraftItem[]; stage?: string; intentType?: "standard" | "custom" | "mixed" };
  }) => string;
  updateTodo: (id: string, patch: Partial<Pick<Todo, "title" | "priority" | "reminderTime" | "remindBeforeMinutes" | "tags">>) => void;
  deleteTodo: (id: string) => void;
  setTodoCompleted: (id: string, completed: boolean) => void;
  reorderTodos: (date: string, ids: string[]) => void;
  completeTodoWithConversion: (todoId: string, type: OrderType) => void;
  transitionOrderStatus: (orderId: string, status: OrderStatus, detail?: string) => void;
  appendOrderTimeline: (orderId: string, detail: string) => void;
  addProduct: (payload: Partial<Product> & Pick<Product, "model" | "name">) => string;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  replaceProducts: (products: Product[]) => void;
  archiveCustomItemToProduct: (
    orderId: string,
    itemIndex: number,
    payload?: Partial<Pick<Product, "model" | "name" | "status" | "customSummary" | "version">>,
  ) => string;
  undoArchiveCustomItem: (orderId: string, itemIndex: number) => { ok: boolean; message?: string; recycleId?: string };
  deleteOrderToRecycleBin: (orderId: string) => { ok: boolean; message?: string };
  deleteCustomerToRecycleBin: (customerId: string) => { ok: boolean; message?: string };
  deleteProductToRecycleBin: (productId: string) => { ok: boolean; message?: string };
  restoreFromRecycleBin: (recycleId: string) => { ok: boolean; message?: string };
  purgeRecycleBin: (recycleId: string) => { ok: boolean; message?: string };
  searchProductsByQuery: (query: string, filters?: ProductSearchFilters) => Product[];
}

let persistTimer: ReturnType<typeof setTimeout> | undefined;

function debouncePersist(state: Pick<AppState, "customers" | "todos" | "orders" | "products" | "recycleBin">) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    const result = await saveState({
      ...state,
      meta: {
        schemaVersion: 1,
        lastSavedAt: Date.now(),
      },
    });
    if (result.fallback) {
      useAppStore.setState({
        storageFallback: true,
        storageError: "IndexedDB 不可用，已自动切换到本地兜底存储。",
      });
    }
  }, 300);
}

function nextOrderSeq(orders: Order[]): number {
  const today = new Date();
  const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const todayCount = orders.filter((o) => o.orderNo.startsWith(yyyymmdd)).length;
  return todayCount + 1;
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialPersistedState,
  selectedDate: todayYmd(),
  loading: true,
  storageFallback: false,
  async hydrate() {
    set({ loading: true, storageError: undefined });
    const loaded = await loadState();
    set({
      ...loaded.state,
      loading: false,
      storageFallback: loaded.fallback,
      storageError: loaded.fallback ? "IndexedDB 不可用，当前使用本地兜底存储。" : undefined,
    });
  },
  setDate(date) {
    set({ selectedDate: date });
  },
  addCustomer(payload) {
    const now = Date.now();
    const customer: Customer = {
      id: createId(),
      name: payload.name,
      contactName: payload.contactName,
      phone: payload.phone,
      wechat: payload.wechat,
      email: payload.email,
      region: payload.region,
      address: payload.address,
      notes: payload.notes,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const next = [...state.customers, customer];
      debouncePersist({ customers: next, todos: state.todos, orders: state.orders, products: state.products, recycleBin: state.recycleBin });
      return { customers: next };
    });
    return customer.id;
  },
  updateCustomer(id, patch) {
    set((state) => {
      const customers = state.customers.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x));
      debouncePersist({ customers, todos: state.todos, orders: state.orders, products: state.products, recycleBin: state.recycleBin });
      return { customers };
    });
  },
  addTodo(payload) {
    const now = Date.now();
    const date = payload.date ?? get().selectedDate;
    const order = get().todos.filter((x) => x.date === date).length;
    const todo: Todo = {
      id: createId(),
      date,
      title: payload.title,
      customerId: payload.customerId,
      priority: payload.priority,
      reminderTime: payload.reminderTime,
      remindBeforeMinutes: payload.remindBeforeMinutes,
      tags: payload.tags,
      completed: false,
      orderDraft: payload.orderDraft || { items: [] },
      createdAt: now,
      updatedAt: now,
      order,
    };
    set((state) => {
      const todos = [...state.todos, todo];
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products, recycleBin: state.recycleBin });
      return { todos };
    });
    return todo.id;
  },
  updateTodo(id, patch) {
    set((state) => {
      const todos = state.todos.map((todo) => (todo.id === id ? { ...todo, ...patch, updatedAt: Date.now() } : todo));
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products, recycleBin: state.recycleBin });
      return { todos };
    });
  },
  deleteTodo(id) {
    set((state) => {
      const todos = state.todos.filter((todo) => todo.id !== id);
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products, recycleBin: state.recycleBin });
      return { todos };
    });
  },
  setTodoCompleted(id, completed) {
    set((state) => {
      const todos = state.todos.map((todo) => (todo.id === id ? { ...todo, completed, updatedAt: Date.now() } : todo));
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products, recycleBin: state.recycleBin });
      return { todos };
    });
  },
  reorderTodos(date, ids) {
    set((state) => {
      const idSet = new Set(ids);
      const todos = state.todos.map((todo) => {
        if (todo.date !== date || !idSet.has(todo.id)) return todo;
        return { ...todo, order: ids.indexOf(todo.id), updatedAt: Date.now() };
      });
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products, recycleBin: state.recycleBin });
      return { todos };
    });
  },
  completeTodoWithConversion(todoId, type) {
    const state = get();
    const todo = state.todos.find((x) => x.id === todoId);
    if (!todo) return;

    const orderId = createId();
    const now = Date.now();
    const nextOrder: Order = {
      id: orderId,
      orderNo: generateOrderNo(new Date(), nextOrderSeq(state.orders)),
      type,
      status: ORDER_STATUS[0],
      customerId: todo.customerId,
      sourceTodoId: todo.id,
      items: todo.orderDraft.items.map((item) => ({ ...item, snapshot: item.productId ? { model: item.productId } : undefined })),
      timeline: [{ at: now, action: type === "order" ? "由待办转正式订单" : "由待办转线索机会" }],
      createdAt: now,
      updatedAt: now,
    };

    const todos = state.todos.map((x) =>
      x.id === todo.id
        ? { ...x, completed: true, updatedAt: now, orderConversion: { type, orderId } }
        : x,
    );
    const orders = [...state.orders, nextOrder];
    set({ todos, orders });
    debouncePersist({ customers: state.customers, todos, orders, products: state.products, recycleBin: state.recycleBin });
  },
  transitionOrderStatus(orderId, status, detail) {
    set((state) => {
      const now = Date.now();
      const orders = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status,
          updatedAt: now,
          timeline: [...o.timeline, { at: now, action: `状态更新为：${status}`, detail }],
        };
      });
      debouncePersist({ customers: state.customers, todos: state.todos, orders, products: state.products, recycleBin: state.recycleBin });
      return { orders };
    });
  },
  appendOrderTimeline(orderId, detail) {
    set((state) => {
      const now = Date.now();
      const orders = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          updatedAt: now,
          timeline: [...o.timeline, { at: now, action: "添加跟单记录", detail }],
        };
      });
      debouncePersist({ customers: state.customers, todos: state.todos, orders, products: state.products, recycleBin: state.recycleBin });
      return { orders };
    });
  },
  addProduct(payload) {
    const now = Date.now();
    const product: Product = {
      id: createId(),
      productType: payload.productType || "catalog",
      model: payload.model,
      name: payload.name,
      status: payload.status || "在售",
      specs: payload.specs || {},
      createdAt: now,
      updatedAt: now,
      baseModelRefId: payload.baseModelRefId,
      customSummary: payload.customSummary,
      version: payload.version,
      sourceCustomerId: payload.sourceCustomerId,
      sourceOrderId: payload.sourceOrderId,
    };
    set((state) => {
      const products = [...state.products, product];
      debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products, recycleBin: state.recycleBin });
      return { products };
    });
    return product.id;
  },
  updateProduct(id, patch) {
    set((state) => {
      const products = state.products.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p));
      debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products, recycleBin: state.recycleBin });
      return { products };
    });
  },
  replaceProducts(products) {
    set((state) => {
      debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products, recycleBin: state.recycleBin });
      return { products };
    });
  },
  archiveCustomItemToProduct(orderId, itemIndex, payload) {
    const state = get();
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return "";
    const item = order.items[itemIndex];
    if (!item || item.kind !== "newCustom") return "";

    const now = Date.now();
    const productId = createId();
    const product: Product = {
      id: productId,
      productType: "archivedCustom",
      model: payload?.model || `CUST-${new Date().getFullYear()}-${String(state.products.length + 1).padStart(4, "0")}`,
      name: payload?.name || "定制归档产品",
      status: payload?.status || "仅定制",
      specs: {
        notes: item.customSpecText,
      },
      customSummary: payload?.customSummary || item.customSpecText,
      version: payload?.version || "v1",
      sourceCustomerId: order.customerId,
      sourceOrderId: order.id,
      createdAt: now,
      updatedAt: now,
    };

    const orders = state.orders.map((o) => {
      if (o.id !== orderId) return o;
      const updatedItems = o.items.map((it, idx) =>
        idx === itemIndex
          ? { ...it, kind: "archivedCustom" as const, productId, snapshot: { model: product.model, name: product.name } }
          : it,
      );
      return {
        ...o,
        items: updatedItems,
        updatedAt: now,
        timeline: [...o.timeline, { at: now, action: "定制条目已归档到产品库", detail: product.model }],
      };
    });

    const products = [...state.products, product];
    set({ orders, products });
    debouncePersist({ customers: state.customers, todos: state.todos, orders, products, recycleBin: state.recycleBin });
    return productId;
  },
  undoArchiveCustomItem(orderId, itemIndex) {
    const state = get();
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "未找到订单。" };
    const item = order.items[itemIndex];
    if (!item || item.kind !== "archivedCustom" || !item.productId) return { ok: false, message: "该条目不是可撤销的归档条目。" };

    const product = state.products.find((p) => p.id === item.productId);
    if (!product) return { ok: false, message: "关联归档产品不存在。" };

    const referencedByOthers = state.orders.some(
      (o) =>
        o.id !== orderId &&
        o.items.some((it) => it.productId === item.productId),
    );
    if (referencedByOthers) return { ok: false, message: "该归档产品已被其他订单引用，无法撤销。" };

    const now = Date.now();
    const recycleId = createId();
    const recycleItem: RecycleBinItem = {
      id: recycleId,
      entityType: "product",
      entityId: product.id,
      snapshot: product,
      deletedAt: now,
      reason: "撤销归档",
    };

    const orders = state.orders.map((o) => {
      if (o.id !== orderId) return o;
      const updatedItems = o.items.map((it, idx) =>
        idx === itemIndex
          ? {
              ...it,
              kind: "newCustom" as const,
              productId: undefined,
              snapshot: undefined,
              customSpecText: product.customSummary || product.specs.notes || it.customSpecText || "已撤销归档条目",
            }
          : it,
      );
      return {
        ...o,
        items: updatedItems,
        updatedAt: now,
        timeline: [...o.timeline, { at: now, action: "定制条目已撤销归档", detail: product.model }],
      };
    });

    const products = state.products.filter((p) => p.id !== product.id);
    const recycleBin = [...state.recycleBin, recycleItem];
    set({ orders, products, recycleBin });
    debouncePersist({ customers: state.customers, todos: state.todos, orders, products, recycleBin });
    return { ok: true, recycleId };
  },
  deleteOrderToRecycleBin(orderId) {
    const state = get();
    const target = state.orders.find((x) => x.id === orderId);
    if (!target) return { ok: false, message: "未找到订单。" };
    const recycleItem: RecycleBinItem = {
      id: createId(),
      entityType: "order",
      entityId: target.id,
      snapshot: target,
      deletedAt: Date.now(),
    };
    const orders = state.orders.filter((x) => x.id !== orderId);
    const recycleBin = [...state.recycleBin, recycleItem];
    set({ orders, recycleBin });
    debouncePersist({ customers: state.customers, todos: state.todos, orders, products: state.products, recycleBin });
    return { ok: true };
  },
  deleteCustomerToRecycleBin(customerId) {
    const state = get();
    const target = state.customers.find((x) => x.id === customerId);
    if (!target) return { ok: false, message: "未找到客户。" };
    const relatedOrders = state.orders.filter((x) => x.customerId === customerId).length;
    if (relatedOrders > 0) return { ok: false, message: `该客户存在 ${relatedOrders} 条关联订单，无法删除。` };
    const recycleItem: RecycleBinItem = {
      id: createId(),
      entityType: "customer",
      entityId: target.id,
      snapshot: target,
      deletedAt: Date.now(),
    };
    const customers = state.customers.filter((x) => x.id !== customerId);
    const recycleBin = [...state.recycleBin, recycleItem];
    set({ customers, recycleBin });
    debouncePersist({ customers, todos: state.todos, orders: state.orders, products: state.products, recycleBin });
    return { ok: true };
  },
  deleteProductToRecycleBin(productId) {
    const state = get();
    const target = state.products.find((x) => x.id === productId);
    if (!target) return { ok: false, message: "未找到产品。" };
    const relatedOrders = state.orders.filter((order) => order.items.some((item) => item.productId === productId)).length;
    if (relatedOrders > 0) return { ok: false, message: `该产品存在 ${relatedOrders} 条关联订单，无法删除。` };
    const recycleItem: RecycleBinItem = {
      id: createId(),
      entityType: "product",
      entityId: target.id,
      snapshot: target,
      deletedAt: Date.now(),
    };
    const products = state.products.filter((x) => x.id !== productId);
    const recycleBin = [...state.recycleBin, recycleItem];
    set({ products, recycleBin });
    debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products, recycleBin });
    return { ok: true };
  },
  restoreFromRecycleBin(recycleId) {
    const state = get();
    const recycle = state.recycleBin.find((x) => x.id === recycleId);
    if (!recycle) return { ok: false, message: "未找到回收站条目。" };
    const recycleBin = state.recycleBin.filter((x) => x.id !== recycleId);

    if (recycle.entityType === "order") {
      const order = recycle.snapshot as Order;
      if (!state.customers.some((x) => x.id === order.customerId)) return { ok: false, message: "恢复失败：关联客户不存在。" };
      const missingProduct = order.items.find((item) => item.productId && !state.products.some((p) => p.id === item.productId));
      if (missingProduct) return { ok: false, message: "恢复失败：关联产品不存在。" };
      if (state.orders.some((x) => x.id === order.id)) return { ok: false, message: "恢复失败：订单ID冲突。" };
      const orders = [...state.orders, order];
      set({ orders, recycleBin });
      debouncePersist({ customers: state.customers, todos: state.todos, orders, products: state.products, recycleBin });
      return { ok: true };
    }

    if (recycle.entityType === "customer") {
      const customer = recycle.snapshot as Customer;
      if (state.customers.some((x) => x.id === customer.id)) return { ok: false, message: "恢复失败：客户ID冲突。" };
      const customers = [...state.customers, customer];
      set({ customers, recycleBin });
      debouncePersist({ customers, todos: state.todos, orders: state.orders, products: state.products, recycleBin });
      return { ok: true };
    }

    const product = recycle.snapshot as Product;
    if (state.products.some((x) => x.id === product.id)) return { ok: false, message: "恢复失败：产品ID冲突。" };
    const products = [...state.products, product];
    set({ products, recycleBin });
    debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products, recycleBin });
    return { ok: true };
  },
  purgeRecycleBin(recycleId) {
    const state = get();
    if (!state.recycleBin.some((x) => x.id === recycleId)) return { ok: false, message: "未找到回收站条目。" };
    const recycleBin = state.recycleBin.filter((x) => x.id !== recycleId);
    set({ recycleBin });
    debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products: state.products, recycleBin });
    return { ok: true };
  },
  searchProductsByQuery(query, filters = {}) {
    const indexed = buildProductIndex(get().products);
    return searchProducts(indexed, query, filters);
  },
}));
