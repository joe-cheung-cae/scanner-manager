# Todo 新建客户选择与近似重名防重复设计

## 1. 背景与目标
当前 Todo 新建表单中的“客户名称”是自由文本输入，创建时仅做“名称完全匹配”，未命中就直接新建客户。这导致同一客户因空格、符号、简称或轻微错别字产生重复数据。

本设计目标：
- 在 Todo 新建时支持从现有客户中快速选择。
- 对“可能重复客户”进行强约束拦截，避免静默重复创建。
- 保留“仍然新建”的人工决策通道，兼顾录入效率与数据质量。
- 保持离线优先与现有本地架构，不引入第三方搜索库。

## 2. 已锁定决策
- 交互方案：`B` 自定义 `combobox`（输入 + 下拉候选 + 键盘交互）。
- 判重策略：`C` 双轨（归一化子串 + 编辑距离）。
- 阈值策略：`A` 宽松拦截（子串命中即拦截；或编辑距离 `<= 2` 拦截）。

## 3. 范围与非目标
### 范围
- Todo 新建区客户输入升级为可选择组件。
- 新建 Todo 前增加“近似重名确认”流程。
- 增加判重算法与对应单元测试。

### 非目标
- 不改动客户库页面主要交互。
- 不引入后端校验或云端同步。
- 不做客户去重合并（merge）功能。

## 4. 交互流程
1. 用户在 Todo 新建区输入客户名称。
2. 组合框实时显示候选客户列表（模糊匹配），支持键盘和鼠标选择。
3. 若用户已选定候选客户，则创建 Todo 直接使用该 `customerId`。
4. 若用户输入未选择候选：
   - 执行近似重名检查。
   - 命中则弹出确认框，展示最相似客户（最多 3 条），提供：
     - `改为选择已有客户`（默认推荐）
     - `仍然新建客户`
     - `返回继续编辑`
5. 用户确认“仍然新建客户”后，才调用 `addCustomer` 并继续创建 Todo。

## 5. 组件与代码结构
- 新增：`src/features/todos/components/customer-combobox.tsx`
  - 职责：输入、候选渲染、键盘导航、选择回填。
  - 受控入参：`customers`、`value`、`selectedCustomerId`、`onInputChange`、`onSelectCustomer`。
- 新增：`src/lib/customer-match.ts`
  - 导出：
    - `normalizeCustomerName(input: string): string`
    - `levenshteinDistance(a: string, b: string): number`
    - `findLikelyCustomers(customers, input): Customer[]`
    - `isLikelyDuplicate(customers, input): { hit: boolean; candidates: Customer[] }`
- 修改：`src/features/todos/todo-page.tsx`
  - 增加状态：`selectedCustomerId`、`duplicateCandidates`、`confirmDuplicateOpen`、`pendingCreatePayload`。
  - 替换客户输入 UI 为 `CustomerCombobox`。
  - 在 `createTodo` 中接入近似重名拦截流程。

## 6. 匹配算法细节
### 6.1 归一化
对输入与客户名同时做：
- 转小写
- 去除空格
- 去除常见分隔符：`- _ / · .`

### 6.2 子串规则
以下任一命中即判为近似：
- `normalizedInput` 包含 `normalizedCustomerName`
- `normalizedCustomerName` 包含 `normalizedInput`

### 6.3 编辑距离规则
- 仅在未命中子串时进入。
- 若长度差 `> 2`，直接跳过（早停）。
- 计算 Levenshtein 距离，`<= 2` 判为近似。

### 6.4 候选排序
- 优先级：前缀命中 > 子串命中 > 编辑距离小 > 名称长度短。
- 最终返回前 3 条用于确认弹窗展示。

## 7. 边界与异常处理
- 输入为空：不触发创建，不触发判重。
- 仅空白符或仅符号：归一化后为空，视为无效输入。
- 客户数较多：候选列表渲染上限 8 条；判重流程早停，避免明显性能退化。
- 已选客户后又编辑文本：清空 `selectedCustomerId`，回到“输入待判定”模式。

## 8. 测试计划
### 8.1 单元测试（算法）
文件：`tests/unit/customer-match.test.ts`
- 归一化规则（大小写/空格/符号）
- 子串双向命中
- 编辑距离 `<=2` 命中与 `>2` 不命中
- 长度差早停
- 候选排序稳定性

### 8.2 组件测试（组合框）
文件：`tests/unit/customer-combobox.test.tsx`
- 输入筛选
- 键盘上下 + 回车选中
- Escape 收起
- 点击候选回填
- 列表上限 8 条

### 8.3 页面流程测试
文件：`tests/unit/todo-create-customer-flow.test.tsx`（或并入现有 Todo 页测试）
- 选择已有客户创建 Todo
- 近似命中触发确认弹窗
- “仍然新建客户”路径
- “改为选择已有客户”路径
- “返回继续编辑”不落库

## 9. 验收标准
- 新建 Todo 时支持客户模糊选择。
- 命中近似客户时不会静默新建，必须经确认。
- 用户可强制新建，也可改选已有客户。
- 最终 Todo `customerId` 与用户最终决策一致。
- 不引入 hydration mismatch 或核心流程回归。

## 10. 实施提交建议
建议分两次提交：
1. 设计文档提交（本文件）
2. 功能实现 + 测试提交

这样便于审查、回滚与对照需求追踪。
