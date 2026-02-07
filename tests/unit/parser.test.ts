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

  it("应解析模板化键值：@时间、r提醒与note", () => {
    const parsed = parseQuickAdd("!! 跟进报价 @14:30 #回访 r:2h note:确认样机配置");
    expect(parsed.priority).toBe("med");
    expect(parsed.reminderTime).toBe("14:30");
    expect(parsed.remindBeforeMinutes).toBe(120);
    expect(parsed.note).toBe("确认样机配置");
    expect(parsed.tags).toEqual(["回访"]);
    expect(parsed.title).toBe("跟进报价");
  });

  it("非法提醒模板应忽略且不污染标题", () => {
    const parsed = parseQuickAdd("客户沟通 r:abc");
    expect(parsed.remindBeforeMinutes).toBeUndefined();
    expect(parsed.title).toBe("客户沟通 r:abc");
  });
});
