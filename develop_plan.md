

# 扫码枪销售助理 Web：开发计划（Plan + Prompt 合并版）

> 目标：做一个离线优先（IndexedDB）、可安装（PWA）的 Web 应用，用于**每日客户沟通待办（Todo）**与**订单库跟单**，并提供**产品库（含现有型号规格检索 + 定制产品归档入库）**。
>
> 交付要求：最终必须支持 **本地部署**、**Docker 部署**、**在线部署（Vercel/自建服务器）**。

---

## 1. 项目定位与核心价值

你当前角色：扫码枪销售助理。

每日工作流：
1. 记录当天客户沟通事项（Todo）。
2. 在 Todo 中补全客户信息与下单信息（标准品/定制化）。
3. Todo 完成时，必须将其转入订单库（生成【正式订单】或【线索/机会】），用于后续跟单。
4. 产品库支持查询公司现有型号的详细规格（型号/规格/尺寸/传感器/通信模块等），并支持将客户定制产品归档后加入产品库，便于复用与检索。

---

## 2. 范围与非目标

### 2.1 必须实现（MVP + 业务增强）
- 今日/日历 Todo（按天管理、拖拽排序、筛选、搜索、快捷键）。
- 客户库（客户资料、关联订单/可选关联 Todo）。
- 订单库（列表筛选、详情、状态流转、timeline 跟单记录、导出）。
- 产品库（现有型号规格管理、搜索/过滤、导入导出）。
- 定制产品归档（订单中的定制条目一键归档为产品库条目）。
- 离线优先（IndexedDB）+ PWA 可安装。

### 2.2 明确不做（除非后续需求增加）
- 登录/多用户/协作。
- 服务端数据库。
- 云端同步。

---

## 3. 里程碑计划（Plan）

> 说明：以下里程碑按“可用优先、闭环优先”排序。每个里程碑都应有可运行产物，并在 README（中文）中记录运行与部署方式。

### M0：工程基建与规范（第 0 阶段）
**目标**：搭好工程骨架与质量门槛。

- 初始化：Next.js(App Router) + TypeScript + Tailwind + pnpm
- 工具：ESLint + Prettier（可选 Husky/lint-staged）
- 目录建议：
  - `src/domain/`（类型、校验、解析）
  - `src/db/`（IndexedDB repo + migrations）
  - `src/store/`（状态管理）
  - `src/features/`（todo/orders/customers/products）
  - `src/components/`（通用 UI）
- CI：GitHub Actions 跑 `pnpm lint`、`pnpm test`（后续加 e2e）
- README（中文）：本地运行、构建、测试、部署入口

**验收产物**：
- `pnpm dev` 可启动
- lint/test 基础脚手架可运行

---

### M1：领域模型 + 离线数据层（第 1 阶段）
**目标**：把数据与业务规则先跑通（即使 UI 还很简陋）。

- 领域模型：Customer / Todo / Order / Product（含规格 specs）
- Quick-add 解析器（!!! 优先级、#tag、时间）+ 单测
- IndexedDB（idb）+ schema 版本 + migrations
- 异常兜底：IDB 失败 fallback（localStorage 或引导重建，需中文提示）
- 状态管理：
  - Todo 增删改查、拖拽排序
  - Todo 完成 → 强制选择转【正式订单】或【线索/机会】
  - 订单状态流转 + timeline 记录
  - 订单定制条目 → 一键归档为产品库条目
- 产品库搜索索引（先做轻量 token/substr；后续可引入 MiniSearch/Fuse 并说明取舍）

**验收产物**：
- 单测可跑通核心流程：创建客户 → 创建 todo → 完成并生成订单 → 订单 timeline → 定制归档入产品库

---

### M2：核心 UI（第 2 阶段）
**目标**：把你每天用到的主链路做成可用体验。

- 页面：
  - 今日/日历 Todo（日期切换、列表、拖拽、筛选、Todo 详情）
  - 完成 Todo → 转换弹窗（正式订单/线索）
  - 订单库（列表筛选 + 详情 + 状态流转 + timeline）
  - 客户库（列表/详情/编辑）
  - 产品库（搜索/过滤/详情/编辑）
- 可用性：快捷键、移动端适配、无障碍（focus/aria）

**验收产物**：
- 你能用它记录每日沟通，并将完成事项沉淀到订单库跟单

---

### M3：产品库导入导出 + 定制归档闭环（第 3 阶段）
**目标**：让“现有型号规格查询”与“定制沉淀复用”变成日常高频工具。

- 产品库 CSV 导入（重点）
  - 字段映射策略（列名中英混合容忍）
  - 校验失败中文提示
  - 更新策略（按型号更新 / 全部新增）
- 产品库搜索增强：型号优先 + 规格字段全检索 + 关键过滤
- 订单定制条目 → 归档草稿（自动带出需求、来源订单/客户）→ 保存入产品库
- 备份导出：全量 JSON（customers/todos/orders/products），以及 products/orders 单独导出 CSV/JSON

**验收产物**：
- 能批量导入公司型号规格，并能把定制产品归档入库后直接在后续订单中复用选择

---

### M4：PWA 与离线体验（第 4 阶段）
**目标**：安装到桌面/手机，离线可用。

- PWA：manifest、icons、theme
- Service Worker：缓存静态资源
- 离线提示：在线/离线状态条（中文）

**验收产物**：
- 安装后离线可打开、可查看/编辑数据，数据持久化稳定

---

### M5：测试与质量收口（第 5 阶段）
**目标**：确保长期可迭代与发布稳定。

- 单测：解析器、导入校验、store actions、repo migrations
- E2E（Playwright）：
  1) 创建客户
  2) 创建 todo（含订单草稿项）
  3) 完成 todo → 选“正式订单” → 订单生成
  4) 订单改状态 + 添加 timeline
  5) 添加定制条目并归档入产品库
  6) 产品库搜索命中归档条目
- 性能：搜索索引 memo、避免重复构建；必要时做列表虚拟化（后期）

**验收产物**：
- CI 全绿，关键流程自动化验证

---

## 4. 部署交付计划（Local / Docker / Online）

### 4.1 本地部署
**开发**：
- `pnpm install`
- `pnpm dev`

**生产**：
- `pnpm build`
- `pnpm start`（默认 3000）

---

### 4.2 Docker 部署（必须交付 Dockerfile + compose）

#### 方案 B1：Node 运行 Next.js（推荐，默认实现）
- 多阶段构建 `Dockerfile`
- `docker-compose.yml` 暴露 `3000`，`NODE_ENV=production`

**验收**：
- `docker compose up -d` 后可通过浏览器访问

> 说明：因为应用是离线本地数据（IndexedDB），容器主要负责提供前端服务，不依赖外部数据库。

---

### 4.3 在线部署

#### 路线 C1：Vercel（优先）
- Build：`pnpm build`
- 自动识别 Next.js

#### 路线 C2：自建服务器（Docker + Nginx 反代 + HTTPS）
- 服务器安装 Docker/Compose
- 启动容器
- Nginx 反代 + Let’s Encrypt

**注意**：在线部署不影响本地数据保存（数据在浏览器 IndexedDB）；提供导入导出用于迁移/备份。

---

## 5. 最终交付物清单（验收用）
- 可运行的 Next.js 工程（全中文 UI/文档/注释/日志）
- `Dockerfile` + `docker-compose.yml`
- 在线部署指南（Vercel + 自建 Docker）
- 产品库 CSV 导入/导出、订单导出、全量备份 JSON
- 单元测试 + E2E（Playwright）

---

## 6. 给 Codex 的最终执行提示词（Prompt）

> 说明：把下面整段提示词**直接复制**给 Codex agent 使用。该 Prompt 已包含完整业务需求、技术约束、里程碑执行步骤与中文输出约束。

```text
You are Codex, an autonomous software engineering agent. Build a production-quality web app from scratch.

IMPORTANT LANGUAGE CONSTRAINT (MUST FOLLOW)
- All user-facing text in the UI must be Chinese (Simplified).
- README and all documentation must be Chinese.
- Code comments must be Chinese.
- Commit messages (if you create any) must be Chinese.
- Any console logs, error messages, and your step-by-step progress reports must be Chinese.
- Variable/function/class names can remain English (recommended), but any explanatory text must be Chinese.

# 0) Product Context & Goal
The user is a sales assistant for barcode scanners (扫码枪). The company has multiple existing product models, and customers may order:
- existing standard models (现有型号 / 标准品), or
- customized products (定制化 / 非标).

Daily work:
- communicate with customers and capture customer + order details,
- manage daily todos,
- when a todo is completed, it must be converted into an Order record in an Order Database for follow-up (跟单),
- manage a Product Library containing existing models with full specs and also archived customized products for future reuse/search.

Build a fast, minimal, offline-first web app that supports these workflows.

# 1) Core Business Workflows (MUST IMPLEMENT)
## 1.1 Daily Todo -> Order conversion
- User creates and manages Daily Todos scoped by date (YYYY-MM-DD).
- Each Todo can be linked to an existing Customer or create a new Customer.
- Each Todo contains order-intent information (standard model items and/or custom items).
- When marking a Todo as “完成”, the app MUST enforce a conversion step:
  - Prompt user to choose:
    1) 生成【正式订单】, or
    2) 生成【线索/机会】(Opportunity)
  - Save the resulting record into the Order Database (orders store) with correct type.
- Completed Todo remains visible in the daily list (history), but Order is the long-term follow-up object.

## 1.2 Order follow-up (订单库跟单)
- Orders list with search & filters (by status/type/date/customer).
- Order detail page:
  - view/edit order fields,
  - update order status through a defined status flow,
  - append follow-up notes (形成时间线 timeline),
  - view linked customer info,
  - view order items (standard + custom mixed),
  - export order(s) (JSON/CSV at minimum).

## 1.3 Customer Library (客户库)
- Customer list with search.
- Customer detail:
  - basic profile,
  - related orders,
  - optional: related todos history (nice-to-have but implement if easy).
- Create/edit customer.

## 1.4 Product Library (产品库) with specs + search
- The app MUST maintain a Product Library that includes:
  A) Catalog products (company existing models with structured specs),
  B) Archived customized products (custom products turned into reusable product entries).
- Must support:
  - Search by model (exact/fuzzy),
  - Full-text search across all spec fields (型号、规格、尺寸、传感器参数、通信模块等),
  - Key filters (at least): 扫码类型(1D/2D/QR etc), 接口(USB/RS232 etc), 无线能力(BT/WiFi), 状态(在售/停产).
- Product detail page displays full specs clearly.
- Product management:
  - Create/edit catalog products,
  - Bulk import products via CSV or JSON (CSV strongly preferred) to speed initial data entry,
  - Export product library (JSON/CSV).

## 1.5 Archive custom product into Product Library
- Orders can contain custom items with custom requirements.
- In Order detail page, for any custom item, provide an action:
  - “归档为产品”
  - This creates a new Product entry (custom archived product) in Product Library.
- The archived custom product must become searchable like standard models and can be selected in future orders as a product item.

# 2) Functional Requirements (MVP + Sales-Oriented Enhancements)
## 2.1 Daily scope and navigation
- Default view: 今天 (Today) todos.
- Date navigation: previous/next day + calendar picker or date input.
- Each todo belongs to exactly one date.

## 2.2 Todo management
- Create, inline edit, complete/uncomplete, delete.
- Drag & drop ordering within the day (manual sort mode).
- Fields:
  - title (required)
  - linked customer (required)
  - communication notes/summary (optional)
  - stage/status for the interaction (optional; distinct from order status)
  - order intent (order draft items)
  - priority (low/med/high), optional reminder time (optional)

## 2.3 Quick add parsing (for Todo title or quick-add input)
- Support parsing helper for:
  - Priority: leading "!" "!!" "!!!"
  - Tags: "#xxx" (optional)
  - Time: "HH:mm" or "at HH:mm" (optional)
- Provide unit tests for parsing edge cases.

## 2.4 Order Items (standard + custom mixed)
- One Order supports multiple items.
- Each item can be:
  A) Standard/Catalog product item (reference a Product by id/model),
  B) Archived custom product item (reference a Product by id),
  C) New custom item (free-form requirements; can later be archived as Product).
- Item fields:
  - productRefId (for A/B) OR customSpecText (for C)
  - quantity
  - optional unit price, total price, currency
  - optional delivery date/lead time notes
  - notes

## 2.5 Status models
- Order type:
  - 正式订单
  - 线索/机会
- Order status flow (editable enum is ideal, but at least implement default):
  - 询价中 / 报价中 / 待确认 / 已确认
  - 待付款 / 已付款
  - 备货中 / 已发货 / 已签收
  - 已完成 / 已取消
- Ensure status changes append to a timeline log with timestamp.

# 3) Tech Stack Constraints (MUST FOLLOW)
- Next.js (App Router) + React + TypeScript
- TailwindCSS
- State management: choose ONE (Zustand recommended for simplicity) and justify in Chinese.
- DnD: @dnd-kit
- Persistence: IndexedDB using `idb` helper, localStorage fallback if IDB fails.
- Testing:
  - Unit: Vitest + Testing Library
  - E2E: Playwright (smoke tests)
- Package manager: pnpm
- PWA:
  - Installable,
  - Offline loading,
  - Service worker caching.
- Do NOT add authentication/server database for MVP.

# 4) Data & Persistence Requirements
## 4.1 Offline-first local database
Use IndexedDB object stores (or equivalent) with schema versioning:
- customers
- todos
- orders
- products
- meta (schema version, migrations)

## 4.2 Versioning & migrations
- Implement a schema version number.
- Provide migrations to handle future fields.
- Handle corrupted IDB gracefully:
  - show Chinese error message,
  - offer fallback to localStorage or re-init with user confirmation UI (no data loss if possible).

## 4.3 Import/Export
- Export and import:
  - Product library (CSV + JSON)
  - Orders (JSON/CSV)
  - Full backup (JSON) recommended
- Validate import schema; reject invalid data with clear Chinese errors.

# 5) Data Models (TypeScript)
## 5.1 Customer
- id: string (uuid)
- name: string (客户名称)
- contactName?: string
- phone?: string
- wechat?: string
- email?: string
- region?: string
- address?: string
- notes?: string
- createdAt: number
- updatedAt: number

## 5.2 Todo
- id: string
- date: string (YYYY-MM-DD)
- title: string
- customerId: string
- summary?: string (沟通纪要)
- priority?: "low" | "med" | "high"
- reminderTime?: string (HH:mm optional)
- completed: boolean
- orderDraft: OrderDraft (see below)
- orderConversion?: { type: "order" | "opportunity"; orderId: string } // after completion
- createdAt: number
- updatedAt: number
- order: number (manual sort)

OrderDraft:
- items: DraftItem[]
- intentType?: "standard" | "custom" | "mixed"
- stage?: string (e.g., 待报价/待确认/已下单...)

DraftItem:
- kind: "catalog" | "archivedCustom" | "newCustom"
- productId?: string
- customSpecText?: string
- quantity: number
- unitPrice?: number
- currency?: string
- notes?: string

## 5.3 Order
- id: string
- orderNo: string (auto; e.g., YYYYMMDD-XXXX)
- type: "order" | "opportunity"
- status: string (from status enum)
- customerId: string
- createdAt: number
- updatedAt: number
- sourceTodoId?: string
- items: OrderItem[]
- amount?: { total?: number; currency?: string; discount?: number }
- expectedDelivery?: string (YYYY-MM-DD optional)
- notes?: string
- timeline: { at: number; action: string; detail?: string }[] // Chinese action strings

OrderItem:
- kind: "catalog" | "archivedCustom" | "newCustom"
- productId?: string
- snapshot?: { model?: string; name?: string } // capture at creation time
- customSpecText?: string
- quantity: number
- unitPrice?: number
- currency?: string
- notes?: string

## 5.4 Product (Unified)
- id: string
- productType: "catalog" | "archivedCustom"
- model: string (catalog: company model; archived: CUST-YYYY-XXXX or user-defined)
- name: string
- status?: "在售" | "停产" | "仅定制"
- createdAt: number
- updatedAt: number

ProductSpecs (structured, searchable):
- dimensions?: { lengthMm?: number; widthMm?: number; heightMm?: number; weightG?: number }
- scan?: {
    codeTypes?: string[]   // e.g. ["1D","2D","QR"]
    sensorModel?: string
    resolution?: string    // e.g. "1280x800"
    fov?: { hDeg?: number; vDeg?: number }
    depthOfField?: string
    minResolutionMil?: number
    fps?: number
    illumination?: string
  }
- comms?: {
    wired?: string[]       // e.g. ["USB-HID","USB-COM","RS232"]
    wireless?: string[]    // e.g. ["Bluetooth 5.0","WiFi 2.4G"]
    moduleModel?: string
    sdk?: string
  }
- env?: {
    ipRating?: string
    dropRatingM?: number
    operatingTempC?: string
  }
- notes?: string
- keywords?: string[] // optional for search boost

Archived custom product extra:
- baseModelRefId?: string (optional)
- customSummary?: string
- version?: string (e.g., "v1")
- sourceCustomerId?: string (optional)
- sourceOrderId?: string (optional)

IMPORTANT:
- Implement full-text search index over model/name/specs/notes/module/sensor fields.
- Also implement key filters (扫码类型/接口/无线/状态) using structured fields.

# 6) UI Pages (MUST IMPLEMENT)
1) 今日/日历 Todo 页
- date header + prev/next + date picker
- quick add todo
- todo list with filters (未完成/已完成)
- drag reorder
- todo detail drawer/modal: customer, notes, order draft items
- complete button triggers conversion modal (正式订单/线索)

2) 订单库
- list: search, filters, status chips
- detail: items, status flow, timeline, archive custom item button, export

3) 客户库
- list + search
- detail + edit

4) 产品库
- list: model search, full-text search, filters
- product detail
- create/edit product
- import/export products (CSV/JSON)

Global:
- top navigation: 今日待办 / 订单库 / 客户 / 产品库 / 设置(可选)
- responsive, mobile friendly, accessible.

# 7) Search Requirements
## 7.1 Products
- Fast search by model (prefix/fuzzy).
- Full-text search across:
  model, name, all specs fields, sensorModel, moduleModel, comms arrays, notes.
- Filters:
  - 扫码类型 (codeTypes)
  - 接口 (wired)
  - 无线 (wireless contains BT/WiFi)
  - 状态 (status)

Implementation guideline:
- For MVP, implement in-memory search with precomputed index from products store:
  - tokenize Chinese/English by simple strategy (split on whitespace, symbols; also keep raw substrings for model).
  - Consider using a small local search library (e.g., minisearch/fuse) ONLY if it does not bloat too much; justify.
- Must work offline.

## 7.2 Orders & Customers
- Search by customer name/orderNo/model keywords.
- Use index fields and fallback to scanning datasets (acceptable for small local data).

# 8) Security & Reliability
- No external analytics by default.
- Validate all imported files.
- Avoid storing extremely sensitive personal data; keep minimal fields.
- Graceful error UI (Chinese).

# 9) Quality Bar
- TypeScript strict mode.
- Unit tests:
  - parsing (quick add)
  - store actions (add/edit/convert/reorder)
  - product import parsing (CSV) and validation
- E2E tests (Playwright):
  1) Create customer
  2) Create todo with order draft items
  3) Complete todo -> choose 正式订单 -> order created
  4) In order detail, change status and add a timeline note
  5) Add a custom item and archive it to product library
  6) Search product library for the archived item

# 10) Step-by-step Execution Plan (YOU MUST FOLLOW)
Step 1: Initialize project
- Next.js + TS + Tailwind + pnpm
- ESLint + Prettier
- Basic layout + navigation (Chinese UI labels)

Step 2: Domain models + parsing
- Implement types, quick-add parser, and unit tests.

Step 3: State management
- Implement chosen store (tasks, customers, orders, products, ui).
- Implement actions & selectors.
- Add tests.

Step 4: Persistence layer
- idb repository per store + migrations + hydration.
- Debounced persistence.
- Fallback strategy if IDB fails.

Step 5: Core UI
- Todo page with conversion modal.
- Orders page with status + timeline.
- Customers page.
- Products page with search + filters.

Step 6: Import/Export
- CSV import for products (and JSON).
- Export products/orders (CSV/JSON).
- Full backup JSON.

Step 7: PWA
- manifest + service worker caching.
- Offline smoke check.

Step 8: E2E + Polish
- Playwright tests.
- Accessibility review.
- Performance (avoid unnecessary rerenders; memoize search index).

# 11) Operating Instructions for Codex (STRICT)
- Work as if you are in a real repo: create files, edit them, run tests, and fix issues.
- After each step, output (IN CHINESE):
  1) 改动文件清单
  2) 可运行的命令
  3) 未完成事项/TODO
- If you must make tradeoffs, propose 2 solutions (Chinese), pick simplest robust, and proceed.
- Do NOT add features outside scope unless required for robustness.
- Keep UI minimal, clean, and efficient for daily sales assistant use.

Start now with Step 1 and proceed step-by-step.
```

---

## 7. 部署细化任务清单（给开发过程落地用）

### 7.1 本地部署任务
- README：`pnpm install` / `pnpm dev` / `pnpm build` / `pnpm start`
- 生产启动端口可配置（PORT）

### 7.2 Docker 部署任务
- `Dockerfile` 多阶段构建：build + runtime
- `docker-compose.yml`：
  - service: web
  - ports: 3000:3000
  - env: NODE_ENV=production
- README：docker 构建/启动命令

### 7.3 在线部署任务
- Vercel 部署说明（中文）
- 自建 Docker 部署说明（含 Nginx 反代样例与 HTTPS 建议）

---

## 8. 备注：数据与部署的关系
- 本应用的数据默认存储在浏览器 IndexedDB（离线优先）。
- 因此：
  - 服务器/容器只负责提供前端资源；
  - 数据迁移需依赖导入/导出（JSON/CSV）备份。
