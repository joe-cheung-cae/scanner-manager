import type { PersistedState } from "@/domain/types";
import { DB_VERSION, openScannerDb } from "@/db/schema";

const FALLBACK_KEY = "scanner-manager-fallback";

const emptyState: PersistedState = {
  customers: [],
  todos: [],
  orders: [],
  products: [],
  meta: {
    schemaVersion: DB_VERSION,
    lastSavedAt: Date.now(),
  },
};

function readFallback(): PersistedState {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return { ...emptyState, meta: { ...emptyState.meta, lastSavedAt: Date.now() } };
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      ...emptyState,
      ...parsed,
      meta: {
        schemaVersion: DB_VERSION,
        lastSavedAt: parsed.meta?.lastSavedAt ?? Date.now(),
      },
    };
  } catch {
    return { ...emptyState, meta: { ...emptyState.meta, lastSavedAt: Date.now() } };
  }
}

function writeFallback(state: PersistedState): void {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
}

export async function loadState(): Promise<{ state: PersistedState; fallback: boolean }> {
  try {
    const db = await openScannerDb();
    const tx = db.transaction(["customers", "todos", "orders", "products", "meta"], "readonly");
    const [customers, todos, orders, products, meta] = await Promise.all([
      tx.objectStore("customers").getAll(),
      tx.objectStore("todos").getAll(),
      tx.objectStore("orders").getAll(),
      tx.objectStore("products").getAll(),
      tx.objectStore("meta").get("app"),
      tx.done,
    ]);

    return {
      state: {
        customers,
        todos,
        orders,
        products,
        meta: {
          schemaVersion: DB_VERSION,
          lastSavedAt: meta?.lastSavedAt ?? Date.now(),
        },
      },
      fallback: false,
    };
  } catch {
    return { state: readFallback(), fallback: true };
  }
}

export async function saveState(nextState: PersistedState): Promise<{ fallback: boolean }> {
  try {
    const db = await openScannerDb();
    const tx = db.transaction(["customers", "todos", "orders", "products", "meta"], "readwrite");
    await Promise.all([
      tx.objectStore("customers").clear(),
      tx.objectStore("todos").clear(),
      tx.objectStore("orders").clear(),
      tx.objectStore("products").clear(),
    ]);

    await Promise.all([
      ...nextState.customers.map((x) => tx.objectStore("customers").put(x)),
      ...nextState.todos.map((x) => tx.objectStore("todos").put(x)),
      ...nextState.orders.map((x) => tx.objectStore("orders").put(x)),
      ...nextState.products.map((x) => tx.objectStore("products").put(x)),
      tx.objectStore("meta").put(nextState.meta, "app"),
    ]);
    await tx.done;
    writeFallback(nextState);
    return { fallback: false };
  } catch {
    writeFallback(nextState);
    return { fallback: true };
  }
}

export const initialPersistedState = emptyState;
