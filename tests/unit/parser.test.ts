import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "@/domain/parser";

describe("parseQuickAdd", () => {
  it("应解析优先级、时间和标签", () => {
    const parsed = parseQuickAdd("!!! 客户A 14:30 #回访");
    expect(parsed.priority).toBe("high");
    expect(parsed.reminderTime).toBe("14:30");
    expect(parsed.tags).toEqual(["回访"]);
    expect(parsed.title).toBe("客户A");
  });

  it("无优先级时只提取时间", () => {
    const parsed = parseQuickAdd("方案沟通 at 09:15");
    expect(parsed.priority).toBeUndefined();
    expect(parsed.reminderTime).toBe("09:15");
    expect(parsed.title).toBe("方案沟通");
  });
});
