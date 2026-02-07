export type Id = string;

export type Priority = "low" | "med" | "high";
export type OrderType = "order" | "opportunity";
export type ProductType = "catalog" | "archivedCustom";
export type OrderItemKind = "catalog" | "archivedCustom" | "newCustom";

export const ORDER_STATUS = [
  "询价中",
  "报价中",
  "待确认",
  "已确认",
  "待付款",
  "已付款",
  "备货中",
  "已发货",
  "已签收",
  "已完成",
  "已取消",
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export interface Customer {
  id: Id;
  name: string;
  contactName?: string;
  phone?: string;
  wechat?: string;
  email?: string;
  region?: string;
  address?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DraftItem {
  kind: OrderItemKind;
  productId?: string;
  customSpecText?: string;
  quantity: number;
  unitPrice?: number;
  currency?: string;
  notes?: string;
}

export interface OrderDraft {
  items: DraftItem[];
  intentType?: "standard" | "custom" | "mixed";
  stage?: string;
}

export interface Todo {
  id: Id;
  date: string;
  title: string;
  customerId: string;
  summary?: string;
  priority?: Priority;
  reminderTime?: string;
  tags?: string[];
  completed: boolean;
  orderDraft: OrderDraft;
  orderConversion?: { type: OrderType; orderId: string };
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface OrderItem {
  kind: OrderItemKind;
  productId?: string;
  snapshot?: { model?: string; name?: string };
  customSpecText?: string;
  quantity: number;
  unitPrice?: number;
  currency?: string;
  notes?: string;
}

export interface OrderTimeline {
  at: number;
  action: string;
  detail?: string;
}

export interface Order {
  id: Id;
  orderNo: string;
  type: OrderType;
  status: OrderStatus;
  customerId: string;
  createdAt: number;
  updatedAt: number;
  sourceTodoId?: string;
  items: OrderItem[];
  amount?: { total?: number; currency?: string; discount?: number };
  expectedDelivery?: string;
  notes?: string;
  timeline: OrderTimeline[];
}

export interface ProductSpecs {
  dimensions?: {
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    weightG?: number;
  };
  scan?: {
    codeTypes?: string[];
    sensorModel?: string;
    resolution?: string;
    fov?: { hDeg?: number; vDeg?: number };
    depthOfField?: string;
    minResolutionMil?: number;
    fps?: number;
    illumination?: string;
  };
  comms?: {
    wired?: string[];
    wireless?: string[];
    moduleModel?: string;
    sdk?: string;
  };
  env?: {
    ipRating?: string;
    dropRatingM?: number;
    operatingTempC?: string;
  };
  notes?: string;
  keywords?: string[];
}

export interface Product {
  id: Id;
  productType: ProductType;
  model: string;
  name: string;
  status?: "在售" | "停产" | "仅定制";
  createdAt: number;
  updatedAt: number;
  specs: ProductSpecs;
  baseModelRefId?: string;
  customSummary?: string;
  version?: string;
  sourceCustomerId?: string;
  sourceOrderId?: string;
}

export type RecycleEntityType = "order" | "customer" | "product";

export interface RecycleBinItem {
  id: Id;
  entityType: RecycleEntityType;
  entityId: Id;
  snapshot: Order | Customer | Product;
  deletedAt: number;
  reason?: string;
}

export interface PersistedState {
  customers: Customer[];
  todos: Todo[];
  orders: Order[];
  products: Product[];
  recycleBin: RecycleBinItem[];
  meta: {
    schemaVersion: number;
    lastSavedAt: number;
  };
}

export interface ProductSearchFilters {
  codeType?: string;
  wired?: string;
  wireless?: string;
  status?: string;
}
