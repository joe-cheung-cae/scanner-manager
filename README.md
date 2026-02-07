# 扫码枪销售助理 Web（离线优先）

一个离线优先（IndexedDB + localStorage 兜底）、支持 PWA 安装的销售工作台，用于管理今日待办、订单跟单、客户库与产品库。

## 功能概览

- 今日/日历待办：快捷录入、拖拽排序、完成后强制转换订单/线索
- 订单库：状态流转、时间线跟单、定制条目归档为产品
- 客户库：客户资料维护与关联订单统计
- 产品库：型号/规格搜索、过滤、CSV 导入导出、全量 JSON 备份
- 离线能力：IndexedDB 存储，异常时自动降级 localStorage
- PWA：可安装、离线可访问主要页面

## 本地开发

```bash
corepack enable pnpm
pnpm install
pnpm dev
```

默认访问：`http://localhost:3000`

## 生产构建

```bash
pnpm build
pnpm start
```

可用 `PORT` 环境变量修改端口。

## 测试

```bash
pnpm lint
pnpm test
pnpm test:e2e
```

## Docker 部署

```bash
docker compose up -d --build
```

访问：`http://localhost:3000`

## 在线部署

### Vercel（推荐）

1. 导入仓库
2. 安装命令：`pnpm install`
3. 构建命令：`pnpm build`
4. 启动命令：`pnpm start`

### 自建服务器（Docker + Nginx）

1. 在服务器拉取代码并执行 `docker compose up -d --build`
2. Nginx 反向代理到 `127.0.0.1:3000`
3. 使用 Let’s Encrypt 配置 HTTPS

## 数据与迁移说明

- 数据默认存储在浏览器 IndexedDB。
- 如果 IndexedDB 不可用，会自动切换到 localStorage 兜底并提示。
- 在线部署不会自动同步不同设备数据，建议定期导出备份（CSV/JSON）。
