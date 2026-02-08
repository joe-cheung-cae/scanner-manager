"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store/appStore";
import { parseQuickAdd } from "@/domain/parser";
import { todayYmd } from "@/lib/date";
import type { Customer, OrderType, Todo } from "@/domain/types";
import { ConfirmModal } from "@/components/confirm-modal";
import { CustomerCombobox } from "@/features/todos/components/customer-combobox";
import { findLikelyCustomers } from "@/lib/customer-match";
import { getComparisonHighlights } from "@/lib/customer-compare";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/layout/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

function TodoStatusBadge({ todo }: { todo: Todo }) {
  if (todo.completed) {
    return <Badge variant="success">已完成</Badge>;
  }
  if (todo.priority === "high") return <Badge variant="warn">高优先级</Badge>;
  if (todo.priority === "low") return <Badge variant="default">低优先级</Badge>;
  return <Badge variant="info">进行中</Badge>;
}

function SortableItem({
  todo,
  onComplete,
  onUncomplete,
  onDelete,
  onEdit,
}: {
  todo: Todo;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: todo.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-white p-3 shadow-sm transition",
        todo.completed ? "border-slate-200/80" : "border-slate-200 hover:border-slate-300",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          className="cursor-move rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500"
          aria-label="拖拽"
          {...attributes}
          {...listeners}
        >
          拖拽
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-900">{todo.title}</p>
            <TodoStatusBadge todo={todo} />
          </div>
          <p className="text-xs text-slate-500">
            客户ID: {todo.customerId}
            {todo.reminderTime ? ` · 提醒: ${todo.reminderTime}` : ""}
            {todo.remindBeforeMinutes ? ` · 提前: ${todo.remindBeforeMinutes}分钟` : ""}
          </p>
          {todo.orderDraft.items.length > 0 ? <p className="text-xs text-slate-500">订单草稿条目: {todo.orderDraft.items.length}</p> : null}
          {todo.completed && todo.orderConversion ? (
            <p className="text-xs text-emerald-700">已转换：{todo.orderConversion.type === "order" ? "正式订单" : "线索机会"}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {!todo.completed ? (
            <Button size="sm" variant="secondary" onClick={() => onComplete(todo.id)}>
              完成
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => onUncomplete(todo.id)}>
              取消完成
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onEdit(todo)}>
            编辑
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(todo.id)}>
            删除
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TodoPage() {
  const sensors = useSensors(useSensor(PointerSensor));
  const customers = useAppStore((s) => s.customers);
  const todos = useAppStore((s) => s.todos);
  const orders = useAppStore((s) => s.orders);
  const products = useAppStore((s) => s.products);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setDate = useAppStore((s) => s.setDate);
  const addTodo = useAppStore((s) => s.addTodo);
  const addCustomer = useAppStore((s) => s.addCustomer);
  const addProduct = useAppStore((s) => s.addProduct);
  const reorderTodos = useAppStore((s) => s.reorderTodos);
  const updateTodo = useAppStore((s) => s.updateTodo);
  const deleteTodo = useAppStore((s) => s.deleteTodo);
  const setTodoCompleted = useAppStore((s) => s.setTodoCompleted);
  const completeTodoWithConversion = useAppStore((s) => s.completeTodoWithConversion);

  const [customerInput, setCustomerInput] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [priorityInput, setPriorityInput] = useState<Todo["priority"]>("med");
  const [reminderTimeInput, setReminderTimeInput] = useState("");
  const [remindBeforeInput, setRemindBeforeInput] = useState(30);
  const [tagsInput, setTagsInput] = useState("");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [quickInput, setQuickInput] = useState("");
  const [selectedDraftProductId, setSelectedDraftProductId] = useState("");
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProductModel, setNewProductModel] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductError, setNewProductError] = useState("");
  const [createFormError, setCreateFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ customer?: string; title?: string; quickInput?: string }>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [conversionTodoId, setConversionTodoId] = useState<string | null>(null);
  const [pendingDeleteTodoId, setPendingDeleteTodoId] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [initialEditTitle, setInitialEditTitle] = useState("");
  const [confirmDiscardTodoDetail, setConfirmDiscardTodoDetail] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<Customer[]>([]);
  const [confirmDuplicateCustomer, setConfirmDuplicateCustomer] = useState(false);
  const [pendingCreatePayload, setPendingCreatePayload] = useState<{
    title: string;
    priority?: Todo["priority"];
    reminderTime?: string;
    remindBeforeMinutes?: number;
    tags?: string[];
    draftProductId?: string;
    draftQuantity?: number;
    customerName: string;
  } | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const dayTodos = useMemo(() => {
    const list = todos.filter((x) => x.date === selectedDate).sort((a, b) => a.order - b.order);
    const filteredByStatus = filter === "all" ? list : list.filter((x) => (filter === "pending" ? !x.completed : x.completed));
    const q = search.trim().toLowerCase();
    if (!q) return filteredByStatus;
    return filteredByStatus.filter((todo) => [todo.title, todo.tags?.join(" ")].join(" ").toLowerCase().includes(q));
  }, [todos, selectedDate, filter, search]);

  const orderCountByCustomerId = useMemo(
    () =>
      orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.customerId] = (acc[order.customerId] || 0) + 1;
        return acc;
      }, {}),
    [orders],
  );

  const todoCountByCustomerId = useMemo(
    () =>
      todos.reduce<Record<string, number>>((acc, todo) => {
        acc[todo.customerId] = (acc[todo.customerId] || 0) + 1;
        return acc;
      }, {}),
    [todos],
  );

  function createTodoForCustomer(
    customerId: string,
    payload: {
      title: string;
      priority?: Todo["priority"];
      reminderTime?: string;
      remindBeforeMinutes?: number;
      tags?: string[];
      draftProductId?: string;
      draftQuantity?: number;
    },
  ) {
    const draftItems = payload.draftProductId
      ? [
          {
            kind: "catalog" as const,
            productId: payload.draftProductId,
            quantity: Math.max(1, payload.draftQuantity || 1),
          },
        ]
      : [
          {
            kind: "newCustom" as const,
            customSpecText: payload.title,
            quantity: 1,
          },
        ];

    addTodo({
      date: selectedDate,
      title: payload.title,
      customerId,
      priority: payload.priority,
      reminderTime: payload.reminderTime,
      remindBeforeMinutes: payload.remindBeforeMinutes,
      tags: payload.tags,
      orderDraft: {
        items: draftItems,
      },
    });

    setTitleInput("");
    setPriorityInput("med");
    setReminderTimeInput("");
    setRemindBeforeInput(30);
    setTagsInput("");
    setQuickInput("");
    setSelectedDraftProductId("");
    setDraftQuantity(1);
    setCreatingProduct(false);
    setNewProductModel("");
    setNewProductName("");
    setNewProductError("");
    setCreateFormError("");
    setFieldErrors({});
  }

  function createTodo() {
    const parsed = advancedMode ? parseQuickAdd(quickInput) : undefined;
    const title = advancedMode ? parsed?.title || "" : titleInput.trim();
    const customerName = customerInput.trim();
    const nextErrors: { customer?: string; title?: string; quickInput?: string } = {};
    if (!customerName) nextErrors.customer = "请填写客户名称。";
    if (!title.trim()) {
      if (advancedMode) {
        nextErrors.quickInput = "请在高级模式中填写包含标题的快捷录入。";
      } else {
        nextErrors.title = "请填写待办标题。";
      }
    }
    if (nextErrors.customer || nextErrors.title || nextErrors.quickInput) {
      setFieldErrors(nextErrors);
      setCreateFormError("请先完善必填项后再新建待办。");
      return;
    }
    setFieldErrors({});
    setCreateFormError("");

    const payload = {
      title,
      priority: advancedMode ? parsed?.priority : priorityInput,
      reminderTime: advancedMode ? parsed?.reminderTime : reminderTimeInput || undefined,
      remindBeforeMinutes: advancedMode ? parsed?.remindBeforeMinutes : remindBeforeInput,
      tags: advancedMode ? parsed?.tags : tagsInput.split(",").map((x) => x.trim()).filter(Boolean),
      draftProductId: selectedDraftProductId || undefined,
      draftQuantity,
      customerName,
    };

    if (selectedCustomerId && customers.some((item) => item.id === selectedCustomerId)) {
      createTodoForCustomer(selectedCustomerId, payload);
      return;
    }

    const exactCustomer = customers.find((item) => item.name === customerName);
    if (exactCustomer) {
      createTodoForCustomer(exactCustomer.id, payload);
      return;
    }

    const likely = findLikelyCustomers(customers, customerName, { limit: 3 });
    if (likely.length > 0) {
      setPendingCreatePayload(payload);
      setDuplicateCandidates(likely);
      setConfirmDuplicateCustomer(true);
      return;
    }

    const customerId = addCustomer({ name: customerName });
    createTodoForCustomer(customerId, payload);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        createTodo();
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        event.preventDefault();
        if (advancedMode) quickInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = dayTodos.findIndex((x) => x.id === active.id);
    const newIndex = dayTodos.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(dayTodos, oldIndex, newIndex);
    reorderTodos(selectedDate, moved.map((x) => x.id));
  };

  const convert = (type: OrderType) => {
    if (!conversionTodoId) return;
    completeTodoWithConversion(conversionTodoId, type);
    setConversionTodoId(null);
  };

  const closeTodoDetail = () => {
    setEditingTodoId(null);
    setEditTitle("");
    setInitialEditTitle("");
    setConfirmDiscardTodoDetail(false);
  };

  const saveTodoDetail = () => {
    if (!editingTodoId || !editTitle.trim()) return;
    updateTodo(editingTodoId, { title: editTitle.trim() });
    closeTodoDetail();
  };

  const todoDetailDirty = editTitle !== initialEditTitle;
  const requestCloseTodoDetail = () => {
    if (!editingTodoId) return;
    if (!todoDetailDirty) {
      closeTodoDetail();
      return;
    }
    setConfirmDiscardTodoDetail(true);
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="今日/日历待办"
        description="高密度跟进视图：左侧处理列表，右侧创建与编辑。"
        actions={
          <Button variant="primary" onClick={createTodo}>
            快捷新建
          </Button>
        }
      />

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-[auto_170px_auto_180px_minmax(0,1fr)]">
          <Button variant="ghost" onClick={() => setDate(todayYmd(new Date(new Date(selectedDate).getTime() - 86400000)))}>
            前一天
          </Button>
          <Input aria-label="待办日期" type="date" value={selectedDate} onChange={(e) => setDate(e.target.value)} />
          <Button variant="ghost" onClick={() => setDate(todayYmd(new Date(new Date(selectedDate).getTime() + 86400000)))}>
            后一天
          </Button>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="pending">仅未完成</option>
            <option value="done">仅已完成</option>
            <option value="all">全部</option>
          </Select>
          <Input aria-label="搜索待办" placeholder="搜索待办" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </FilterBar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-base font-semibold text-slate-900">待办列表</h3>
              <p className="text-xs text-slate-500">{selectedDate} · 共 {dayTodos.length} 条</p>
            </div>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={dayTodos.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {dayTodos.map((todo) => (
                    <SortableItem
                      key={todo.id}
                      todo={todo}
                      onComplete={setConversionTodoId}
                      onUncomplete={(id) => setTodoCompleted(id, false)}
                      onDelete={setPendingDeleteTodoId}
                      onEdit={(selected) => {
                        setEditingTodoId(selected.id);
                        setEditTitle(selected.title);
                        setInitialEditTitle(selected.title);
                      }}
                    />
                  ))}
                  {!dayTodos.length ? (
                    <EmptyState icon={<span className="text-xs">LIST</span>} title="当天暂无待办" description="试试切换日期，或在右侧创建第一条待办。" />
                  ) : null}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3 className="text-base font-semibold text-slate-900">创建/编辑面板</h3>
              <p className="text-xs text-slate-500">客户信息 / 待办信息 / 提醒与标签 / 高级字段</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs text-slate-500">客户信息</p>
              <CustomerCombobox
                customers={customers}
                value={customerInput}
                selectedCustomerId={selectedCustomerId}
                orderCountByCustomerId={orderCountByCustomerId}
                todoCountByCustomerId={todoCountByCustomerId}
                invalid={!!fieldErrors.customer}
                errorMessage={fieldErrors.customer}
                onInputChange={(value) => {
                  setCustomerInput(value);
                  if (fieldErrors.customer) setFieldErrors((prev) => ({ ...prev, customer: undefined }));
                  if (createFormError) setCreateFormError("");
                  if (selectedCustomerId) {
                    const selected = customers.find((item) => item.id === selectedCustomerId);
                    if (!selected || selected.name !== value) setSelectedCustomerId(null);
                  }
                }}
                onSelectCustomer={(customer) => {
                  setSelectedCustomerId(customer.id);
                  setCustomerInput(customer.name);
                  setFieldErrors((prev) => ({ ...prev, customer: undefined }));
                  if (createFormError) setCreateFormError("");
                }}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">待办信息</p>
              <Input
                aria-label="待办标题"
                placeholder="待办标题（必填）"
                value={titleInput}
                onChange={(e) => {
                  setTitleInput(e.target.value);
                  if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
                  if (createFormError) setCreateFormError("");
                }}
                error={fieldErrors.title}
              />
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">订单草稿</p>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <Select
                    aria-label="订单产品型号"
                    value={selectedDraftProductId}
                    onChange={(e) => setSelectedDraftProductId(e.target.value)}
                  >
                    <option value="">未选择产品（默认按待办标题生成定制条目）</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.model} · {product.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    aria-label="订单数量"
                    type="number"
                    min={1}
                    value={String(draftQuantity)}
                    onChange={(e) => setDraftQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCreatingProduct((prev) => !prev);
                    setNewProductError("");
                  }}
                  aria-label="新建产品入口"
                >
                  {creatingProduct ? "收起新建产品" : "新建产品"}
                </Button>
                {creatingProduct ? (
                  <div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <Input
                      aria-label="新产品型号"
                      placeholder="新产品型号（必填）"
                      value={newProductModel}
                      onChange={(e) => {
                        setNewProductModel(e.target.value);
                        if (newProductError) setNewProductError("");
                      }}
                    />
                    <Input
                      aria-label="新产品名称"
                      placeholder="新产品名称（必填）"
                      value={newProductName}
                      onChange={(e) => {
                        setNewProductName(e.target.value);
                        if (newProductError) setNewProductError("");
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const model = newProductModel.trim();
                        const name = newProductName.trim();
                        if (!model || !name) {
                          setNewProductError("请先填写新产品型号与名称。");
                          return;
                        }
                        const id = addProduct({ model, name, productType: "catalog", status: "在售" });
                        setSelectedDraftProductId(id);
                        setCreatingProduct(false);
                        setNewProductModel("");
                        setNewProductName("");
                        setNewProductError("");
                      }}
                      aria-label="创建并选择产品"
                    >
                      创建并选择
                    </Button>
                    {newProductError ? <p className="text-xs text-rose-600 sm:col-span-3">{newProductError}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">提醒与标签</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select aria-label="优先级" value={priorityInput} onChange={(e) => setPriorityInput(e.target.value as Todo["priority"])}>
                  <option value="low">低</option>
                  <option value="med">中</option>
                  <option value="high">高</option>
                </Select>
                <Input aria-label="提醒时间" placeholder="HH:mm（选填）" value={reminderTimeInput} onChange={(e) => setReminderTimeInput(e.target.value)} />
                <Select aria-label="提前提醒" value={String(remindBeforeInput)} onChange={(e) => setRemindBeforeInput(Number(e.target.value))}>
                  <option value="15">提前15分钟</option>
                  <option value="30">提前30分钟</option>
                  <option value="60">提前60分钟</option>
                  <option value="120">提前120分钟</option>
                </Select>
                <Input aria-label="标签" placeholder="标签（逗号分隔，如：回访,报价）" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">高级字段</p>
                <Button size="sm" variant="ghost" onClick={() => setAdvancedMode((v) => !v)}>
                  {advancedMode ? "收起" : "展开"}
                </Button>
              </div>
              {advancedMode ? (
                <Input
                  ref={quickInputRef}
                  aria-label="快捷录入高级模式"
                  placeholder="高级模式：!!! 跟进报价 @14:30 #回访 r:30m"
                  value={quickInput}
                  onChange={(e) => {
                    setQuickInput(e.target.value);
                    if (fieldErrors.quickInput) setFieldErrors((prev) => ({ ...prev, quickInput: undefined }));
                    if (createFormError) setCreateFormError("");
                  }}
                  error={fieldErrors.quickInput}
                />
              ) : null}
            </div>

            {createFormError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{createFormError}</div> : null}

            <Button variant="primary" className="w-full" onClick={createTodo}>
              新建待办（Ctrl/Cmd+Enter）
            </Button>
          </CardContent>
        </Card>
      </div>

      {editingTodoId ? (
        <div className="fixed inset-0 z-20 bg-black/40" onClick={requestCloseTodoDetail}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="todo-detail-title"
            className="absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="todo-detail-title" className="text-base font-semibold">
                待办详情
              </h3>
              <Button size="sm" variant="ghost" onClick={requestCloseTodoDetail}>
                关闭
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-600" htmlFor="todo-detail-title-input">
                  详情标题
                </label>
                <Input
                  id="todo-detail-title-input"
                  aria-label="详情标题"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="请输入待办标题"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={saveTodoDetail}>
                  保存详情
                </Button>
                <Button variant="secondary" className="flex-1" onClick={requestCloseTodoDetail}>
                  取消
                </Button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {conversionTodoId ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">完成待办并转换</h3>
            <p className="mt-1 text-sm text-slate-600">请选择转换类型：</p>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" variant="primary" onClick={() => convert("order")}>
                正式订单
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => convert("opportunity")}>
                线索/机会
              </Button>
            </div>
            <Button className="mt-3 w-full" variant="ghost" onClick={() => setConversionTodoId(null)}>
              取消
            </Button>
          </div>
        </div>
      ) : null}

      {confirmDuplicateCustomer && pendingCreatePayload ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">发现可能重复客户</h3>
            <p className="mt-1 text-sm text-slate-600">输入名称与已有客户近似，请先选择已有客户，或确认仍然新建。</p>
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {duplicateCandidates.map((candidate) => {
                const compared = getComparisonHighlights(pendingCreatePayload.customerName, candidate.name);
                return (
                  <button
                    key={candidate.id}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      createTodoForCustomer(candidate.id, pendingCreatePayload);
                      setSelectedCustomerId(candidate.id);
                      setCustomerInput(candidate.name);
                      setPendingCreatePayload(null);
                      setDuplicateCandidates([]);
                      setConfirmDuplicateCustomer(false);
                    }}
                  >
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
                        <p className="text-xs text-amber-700">你输入的客户</p>
                        <p className="font-medium text-slate-900">
                          {compared.inputSegments.map((segment, idx) => (
                            <span key={`input-${candidate.id}-${idx}`} className={segment.match ? "rounded bg-amber-200 px-0.5" : ""}>
                              {segment.text}
                            </span>
                          ))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1">
                        <p className="text-xs text-sky-700">已有客户</p>
                        <p className="font-medium text-slate-900">
                          {compared.candidateSegments.map((segment, idx) => (
                            <span key={`candidate-${candidate.id}-${idx}`} className={segment.match ? "rounded bg-amber-200 px-0.5" : ""}>
                              {segment.text}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">点击将本次待办关联到该已有客户</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => {
                  const customerId = addCustomer({ name: pendingCreatePayload.customerName });
                  createTodoForCustomer(customerId, pendingCreatePayload);
                  setSelectedCustomerId(customerId);
                  setCustomerInput(pendingCreatePayload.customerName);
                  setPendingCreatePayload(null);
                  setDuplicateCandidates([]);
                  setConfirmDuplicateCustomer(false);
                }}
              >
                仍然新建客户
              </Button>
              <Button
                className="flex-1"
                variant="ghost"
                onClick={() => {
                  setPendingCreatePayload(null);
                  setDuplicateCandidates([]);
                  setConfirmDuplicateCustomer(false);
                }}
              >
                返回继续编辑
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={!!pendingDeleteTodoId}
        title="确认删除待办"
        description="删除后无法恢复，确定继续吗？"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={() => {
          if (pendingDeleteTodoId) deleteTodo(pendingDeleteTodoId);
          setPendingDeleteTodoId(null);
        }}
        onCancel={() => setPendingDeleteTodoId(null)}
      />
      <ConfirmModal
        open={confirmDiscardTodoDetail}
        title="确认撤销本次变更"
        description="你有未保存的待办详情修改，确认取消并撤销吗？"
        confirmText="确认撤销"
        cancelText="继续编辑"
        onConfirm={closeTodoDetail}
        onCancel={() => setConfirmDiscardTodoDetail(false)}
      />
    </section>
  );
}
