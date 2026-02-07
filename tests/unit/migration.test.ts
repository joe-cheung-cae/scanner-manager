import { describe, expect, it } from "vitest";
import { upgrade } from "@/db/schema";

class FakeDb {
  objectStoreNames = {
    stores: new Set<string>(),
    contains: (name: string) => this.objectStoreNames.stores.has(name),
  };

  createObjectStore(name: string) {
    this.objectStoreNames.stores.add(name);
    return {} as IDBObjectStore;
  }
}

describe("upgrade", () => {
  it("应在 v1 创建所有对象仓库", () => {
    const db = new FakeDb() as unknown as Parameters<typeof upgrade>[0];
    upgrade(db, 0, 1);

    const names = (db as unknown as FakeDb).objectStoreNames.stores;
    expect(names.has("customers")).toBe(true);
    expect(names.has("todos")).toBe(true);
    expect(names.has("orders")).toBe(true);
    expect(names.has("products")).toBe(true);
    expect(names.has("meta")).toBe(true);
  });
});
