import { expect, test } from "@playwright/test";

test("主流程烟雾测试", async ({ page }) => {
  // 1) 创建客户
  await page.goto("/customers");
  await page.getByPlaceholder("客户名称").fill("E2E客户");
  await page.getByPlaceholder("电话（可选）").fill("13800138000");
  await page.getByRole("button", { name: "新建客户" }).click();
  await expect(page.getByText("E2E客户")).toBeVisible();

  // 2) 创建 todo（含订单草稿项）
  await page.goto("/");
  await page.getByPlaceholder("客户名称（必填）").fill("E2E客户");
  await page.getByLabel("待办标题").fill("E2E跟进");
  await page.getByLabel("提醒时间").fill("10:30");
  await page.getByLabel("标签").fill("样机");
  await page.getByPlaceholder("订单草稿（选填，默认定制条目）").fill("定制需求：蓝牙5.0 + 充电底座");
  await page.getByRole("button", { name: "新建待办" }).click();

  // 2.1) 进入 Todo 详情抽屉并编辑
  await page.getByRole("button", { name: "编辑" }).first().click();
  await expect(page.getByRole("heading", { name: "待办详情" })).toBeVisible();
  await page.getByLabel("详情标题").fill("E2E跟进-已编辑");
  await page.getByLabel("详情纪要").fill("抽屉编辑成功");
  await page.getByRole("button", { name: "保存详情" }).click();
  await expect(page.getByText("E2E跟进-已编辑")).toBeVisible();

  // 3) 完成 todo -> 正式订单
  await page.getByRole("button", { name: "完成" }).first().click();
  await page.getByRole("button", { name: "正式订单" }).click();

  // 4) 订单改状态 + 添加 timeline
  await page.getByRole("link", { name: "订单库" }).click();
  await expect(page.getByText("订单库")).toBeVisible();
  await page.locator("select").nth(3).selectOption("已确认");
  await page.getByPlaceholder("添加跟单记录").fill("E2E 跟单备注");
  await page.getByRole("button", { name: "添加" }).click();
  await expect(page.getByText("E2E 跟单备注")).toBeVisible();

  // 5) 定制条目归档入产品库
  await page.getByRole("button", { name: "归档为产品" }).first().click();

  // 6) 产品库搜索命中归档条目
  await page.getByRole("link", { name: "产品库" }).click();
  await page.getByPlaceholder("搜索型号/规格").fill("蓝牙5.0");
  await expect(page.getByText("定制归档产品")).toBeVisible();
});
