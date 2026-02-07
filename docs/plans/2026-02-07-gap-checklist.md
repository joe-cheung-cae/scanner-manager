# Plan+Prompt Gap-to-Task Checklist (P0/P1)

## P0 (Must complete for 100% compliance)
- [x] Todo 完整管理补齐：编辑、删除、取消完成、搜索（`src/features/todos/todo-page.tsx`, `src/store/appStore.ts`）
- [x] Todo 快捷键补齐：至少支持快速创建与输入聚焦（`src/features/todos/todo-page.tsx`）
- [x] 订单库筛选补齐：按类型/状态/客户过滤（`src/features/orders/orders-page.tsx`）
- [x] 导入导出补齐：Products JSON 导入 + Orders JSON 导出（`src/features/products/products-page.tsx`, `src/features/orders/orders-page.tsx`, `src/lib/import-export/csv.ts`）
- [x] E2E 补齐为 6 步业务链（`tests/e2e/smoke.spec.ts`）
- [x] CI 补齐：`pnpm lint` + `pnpm test` + e2e smoke（`.github/workflows/ci.yml`）
- [x] 回归验证并更新 README 命令说明（`README.md`）

## P1 (Important, can follow after P0)
- [x] 客户详情增加关联 Todo 历史（`src/features/customers/customers-page.tsx`）
- [x] Todo 详情交互从轻表单升级为抽屉/模态（`src/features/todos/todo-page.tsx`）
- [x] 可访问性细化：表单标签、aria、键盘 DnD 说明（相关页面）
- [x] 搜索性能优化：产品索引 memo 缓存（`src/features/products/products-page.tsx`, `src/lib/search/productIndex.ts`）

## 执行顺序
1. 先完成全部 P0 并确保 lint/test/build/e2e 全绿。
2. 再执行 P1（如时间允许）。
