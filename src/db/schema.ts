import { DBSchema, IDBPDatabase, openDB } from "idb";
import type { Customer, Order, PersistedState, Product, Todo } from "@/domain/types";

export const DB_NAME = "scanner-manager-db";
export const DB_VERSION = 1;

export interface ScannerDB extends DBSchema {
  customers: {
    key: string;
    value: Customer;
  };
  todos: {
    key: string;
    value: Todo;
  };
  orders: {
    key: string;
    value: Order;
  };
  products: {
    key: string;
    value: Product;
  };
  meta: {
    key: string;
    value: PersistedState["meta"];
  };
}

export function upgrade(db: IDBPDatabase<ScannerDB>, oldVersion: number): void {
  if (oldVersion < 1) {
    if (!db.objectStoreNames.contains("customers")) db.createObjectStore("customers", { keyPath: "id" });
    if (!db.objectStoreNames.contains("todos")) db.createObjectStore("todos", { keyPath: "id" });
    if (!db.objectStoreNames.contains("orders")) db.createObjectStore("orders", { keyPath: "id" });
    if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", { keyPath: "id" });
    if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
  }
}

export async function openScannerDb() {
  return openDB<ScannerDB>(DB_NAME, DB_VERSION, {
    upgrade,
  });
}
