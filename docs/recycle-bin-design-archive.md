# 回收站设计归档（当前实现）

## 1. 目标与策略

当前工程回收站采用策略：

- 删除策略：`A（硬删除 + 关联保护）`
- 恢复策略：`受约束恢复（冲突拒绝恢复）`

含义：

- 订单可删除，删除后进入回收站。
- 客户、产品删除前先做关联校验：若被订单引用则阻止删除。
- 回收站恢复时执行依赖/冲突检查，不满足条件则拒绝恢复并提示原因。

## 2. 数据模型

回收站核心类型定义在：

- `src/domain/types.ts`

新增模型：

- `RecycleEntityType = "order" | "customer" | "product"`
- `RecycleBinItem`
  - `id`
  - `entityType`
  - `entityId`
  - `snapshot`（删除前完整快照）
  - `deletedAt`
  - `reason?`

持久化状态 `PersistedState` 增加：

- `recycleBin: RecycleBinItem[]`

## 3. 存储层设计

### 3.1 IndexedDB

- 文件：`src/db/schema.ts`
- `DB_VERSION` 升级到 `2`
- 新增对象仓库：`recycleBin`
- migration：`oldVersion < 2` 时创建 `recycleBin`

### 3.2 加载与保存

- 文件：`src/db/storage.ts`
- `emptyState` 增加 `recycleBin: []`
- `loadState()` 读取 `recycleBin`
- `saveState()` 清空并写入 `recycleBin`
- fallback（localStorage）逻辑自动包含 `recycleBin`

## 4. 状态管理与业务规则

- 文件：`src/store/appStore.ts`

新增状态：

- `recycleBin: RecycleBinItem[]`

新增动作：

- `deleteOrderToRecycleBin(orderId)`
- `deleteCustomerToRecycleBin(customerId)`
- `deleteProductToRecycleBin(productId)`
- `restoreFromRecycleBin(recycleId)`
- `purgeRecycleBin(recycleId)`

### 4.1 删除规则

#### 订单删除

- 允许删除。
- 从 `orders` 移除并写入 `recycleBin`。

#### 客户删除

- 若存在关联订单（`order.customerId === customerId`）则阻断。
- 阻断返回错误消息：如“该客户存在 N 条关联订单，无法删除”。

#### 产品删除

- 若存在订单条目引用（`item.productId === productId`）则阻断。
- 阻断返回错误消息：如“该产品存在 N 条关联订单，无法删除”。

### 4.2 恢复规则（受约束恢复）

#### 恢复订单

恢复前必须满足：

- `order.customerId` 对应客户存在。
- 所有 `item.productId`（若有）对应产品存在。
- 订单 ID 不冲突。

任一条件失败即拒绝恢复。

#### 恢复客户

- 若客户 ID 已存在于主库，拒绝恢复。

#### 恢复产品

- 若产品 ID 已存在于主库，拒绝恢复。

#### 永久删除

- 仅在回收站内执行，从 `recycleBin` 移除，不可恢复。

## 5. UI 与交互入口

### 5.1 顶部导航入口

- 文件：`src/components/app-shell.tsx`
- 新增导航项：`/recycle-bin`（回收站）

### 5.2 回收站页面

- 路由：`src/app/recycle-bin/page.tsx`
- 页面：`src/features/recycle-bin/recycle-bin-page.tsx`

功能：

- 列表展示回收站条目
- 类型筛选（order/customer/product）
- 关键字搜索
- 恢复操作
- 永久删除（二次确认）

### 5.3 各库删除入口

- 订单库：`src/features/orders/orders-page.tsx`
  - 订单详情区提供“删除订单”（移入回收站）
- 客户库：`src/features/customers/customers-page.tsx`
  - 客户卡片提供“删除”
- 产品库：`src/features/products/products-page.tsx`
  - 产品卡片提供“删除”

删除交互均基于确认弹窗执行。

## 6. 测试覆盖

- 文件：`tests/unit/store-actions.test.ts`

已覆盖关键用例：

- 订单删除进入回收站并可恢复
- 客户有关联订单时禁止删除
- 产品有关联订单时禁止删除
- 订单恢复时依赖缺失（客户不存在）失败

## 7. 当前限制与后续建议

当前限制：

- 恢复冲突判断以 ID 冲突和依赖存在性为主，尚未做“业务主键”层面冲突策略（如客户名、产品型号重复策略）。
- 回收站暂未支持批量恢复/批量永久删除。

建议后续增强：

- 增加回收站操作审计字段（操作者、来源页面、删除原因枚举）。
- 增加批量操作与依赖可视化提示。
- 增加针对回收站页面的 E2E 用例。
