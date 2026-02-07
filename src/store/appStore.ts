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
    summary?: string;
    priority?: Todo["priority"];
    reminderTime?: string;
    tags?: string[];
    orderDraft?: { items: DraftItem[]; stage?: string; intentType?: "standard" | "custom" | "mixed" };
  }) => string;
  updateTodo: (id: string, patch: Partial<Pick<Todo, "title" | "summary" | "priority" | "reminderTime" | "tags">>) => void;
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
  searchProductsByQuery: (query: string, filters?: ProductSearchFilters) => Product[];
}

let persistTimer: ReturnType<typeof setTimeout> | undefined;

function debouncePersist(state: Pick<AppState, "customers" | "todos" | "orders" | "products">) {
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
      debouncePersist({ customers: next, todos: state.todos, orders: state.orders, products: state.products });
      return { customers: next };
    });
    return customer.id;
  },
  updateCustomer(id, patch) {
    set((state) => {
      const customers = state.customers.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x));
      debouncePersist({ customers, todos: state.todos, orders: state.orders, products: state.products });
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
      summary: payload.summary,
      priority: payload.priority,
      reminderTime: payload.reminderTime,
      tags: payload.tags,
      completed: false,
      orderDraft: payload.orderDraft || { items: [] },
      createdAt: now,
      updatedAt: now,
      order,
    };
    set((state) => {
      const todos = [...state.todos, todo];
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products });
      return { todos };
    });
    return todo.id;
  },
  updateTodo(id, patch) {
    set((state) => {
      const todos = state.todos.map((todo) => (todo.id === id ? { ...todo, ...patch, updatedAt: Date.now() } : todo));
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products });
      return { todos };
    });
  },
  deleteTodo(id) {
    set((state) => {
      const todos = state.todos.filter((todo) => todo.id !== id);
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products });
      return { todos };
    });
  },
  setTodoCompleted(id, completed) {
    set((state) => {
      const todos = state.todos.map((todo) => (todo.id === id ? { ...todo, completed, updatedAt: Date.now() } : todo));
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products });
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
      debouncePersist({ customers: state.customers, todos, orders: state.orders, products: state.products });
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
    debouncePersist({ customers: state.customers, todos, orders, products: state.products });
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
      debouncePersist({ customers: state.customers, todos: state.todos, orders, products: state.products });
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
      debouncePersist({ customers: state.customers, todos: state.todos, orders, products: state.products });
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
      debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products });
      return { products };
    });
    return product.id;
  },
  updateProduct(id, patch) {
    set((state) => {
      const products = state.products.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p));
      debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products });
      return { products };
    });
  },
  replaceProducts(products) {
    set((state) => {
      debouncePersist({ customers: state.customers, todos: state.todos, orders: state.orders, products });
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
    debouncePersist({ customers: state.customers, todos: state.todos, orders, products });
    return productId;
  },
  searchProductsByQuery(query, filters = {}) {
    const indexed = buildProductIndex(get().products);
    return searchProducts(indexed, query, filters);
  },
}));
