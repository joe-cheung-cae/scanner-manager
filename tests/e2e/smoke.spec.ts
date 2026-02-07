import { expect, test } from "@playwright/test";

test("主流程烟雾测试", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder("客户名称（必填）").fill("测试客户");
  await page.getByPlaceholder("快捷录入：!!! 客户A 14:30 #回访").fill("!! 客户跟进 10:30 #样机");
  await page.getByPlaceholder("订单草稿（选填，默认定制条目）").fill("定制需求：蓝牙5.0");
  await page.getByRole("button", { name: "新建待办" }).click();

  await page.getByRole("button", { name: "完成" }).first().click();
  await page.getByRole("button", { name: "正式订单" }).click();

  await page.getByRole("link", { name: "订单库" }).click();
  await expect(page.getByText("订单库")).toBeVisible();
});
