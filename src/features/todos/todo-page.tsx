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
    <div ref={setNodeRef} style={style} className="rounded border bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <button className="cursor-move rounded bg-slate-100 px-2 py-1 text-xs" {...attributes} {...listeners}>
          拖拽
        </button>
        <div className="flex-1">
          <div className="font-medium">{todo.title}</div>
          <div className="text-xs text-slate-500">
            客户ID: {todo.customerId} {todo.priority ? `· 优先级: ${todo.priority}` : ""} {todo.reminderTime ? `· 提醒: ${todo.reminderTime}` : ""} {todo.remindBeforeMinutes ? `· 提前: ${todo.remindBeforeMinutes}分钟` : ""}
          </div>
          {!!todo.orderDraft.items.length && (
            <div className="mt-1 text-xs text-slate-600">订单草稿条目: {todo.orderDraft.items.length}</div>
          )}
          {todo.completed && todo.orderConversion && (
            <div className="mt-1 text-xs text-emerald-700">
              已转换：{todo.orderConversion.type === "order" ? "正式订单" : "线索机会"}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {!todo.completed && (
            <button className="rounded bg-emerald-600 px-3 py-1 text-sm text-white" onClick={() => onComplete(todo.id)}>
              完成
            </button>
          )}
          {todo.completed && (
            <button className="rounded bg-slate-600 px-3 py-1 text-sm text-white" onClick={() => onUncomplete(todo.id)}>
              取消完成
            </button>
          )}
          <button className="rounded bg-sky-600 px-3 py-1 text-sm text-white" onClick={() => onEdit(todo)}>
            编辑
          </button>
          <button className="rounded bg-rose-600 px-3 py-1 text-sm text-white" onClick={() => onDelete(todo.id)}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

export function TodoPage() {
  const sensors = useSensors(useSensor(PointerSensor));
  const customers = useAppStore((s) => s.customers);
  const todos = useAppStore((s) => s.todos);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setDate = useAppStore((s) => s.setDate);
  const addTodo = useAppStore((s) => s.addTodo);
  const addCustomer = useAppStore((s) => s.addCustomer);
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
  const [orderDraftText, setOrderDraftText] = useState("");
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
    orderDraftText?: string;
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

  function createTodoForCustomer(
    customerId: string,
    payload: {
      title: string;
      priority?: Todo["priority"];
      reminderTime?: string;
      remindBeforeMinutes?: number;
      tags?: string[];
      orderDraftText?: string;
    },
  ) {
    addTodo({
      date: selectedDate,
      title: payload.title,
      customerId,
      priority: payload.priority,
      reminderTime: payload.reminderTime,
      remindBeforeMinutes: payload.remindBeforeMinutes,
      tags: payload.tags,
      orderDraft: {
        items: payload.orderDraftText
          ? [
              {
                kind: "newCustom",
                customSpecText: payload.orderDraftText,
                quantity: 1,
              },
            ]
          : [],
      },
    });

    setTitleInput("");
    setPriorityInput("med");
    setReminderTimeInput("");
    setRemindBeforeInput(30);
    setTagsInput("");
    setQuickInput("");
    setOrderDraftText("");
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
      orderDraftText,
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
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">今日/日历待办</h2>
      <div className="flex flex-wrap gap-2">
        <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setDate(todayYmd(new Date(new Date(selectedDate).getTime() - 86400000)))}>
          前一天
        </button>
        <input aria-label="待办日期" type="date" value={selectedDate} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setDate(todayYmd(new Date(new Date(selectedDate).getTime() + 86400000)))}>
          后一天
        </button>
        <select className="rounded border px-2 py-1" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="pending">仅未完成</option>
          <option value="done">仅已完成</option>
          <option value="all">全部</option>
        </select>
        <input aria-label="搜索待办" className="rounded border px-2 py-1" placeholder="搜索待办" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-2 rounded border bg-white p-3 md:grid-cols-2">
        <CustomerCombobox
          customers={customers}
          value={customerInput}
          selectedCustomerId={selectedCustomerId}
          invalid={!!fieldErrors.customer}
          errorMessage={fieldErrors.customer}
          onInputChange={(value) => {
            setCustomerInput(value);
            if (fieldErrors.customer) {
              setFieldErrors((prev) => ({ ...prev, customer: undefined }));
            }
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
        <input
          aria-label="待办标题"
          aria-invalid={fieldErrors.title ? "true" : "false"}
          className={`rounded border px-2 py-2 ${fieldErrors.title ? "border-rose-500 ring-1 ring-rose-200" : ""}`}
          placeholder="待办标题（必填）"
          value={titleInput}
          onChange={(e) => {
            setTitleInput(e.target.value);
            if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
            if (createFormError) setCreateFormError("");
          }}
        />
        {fieldErrors.title && <p className="-mt-1 text-xs text-rose-600 md:col-span-2">{fieldErrors.title}</p>}
        <select aria-label="优先级" className="rounded border px-2 py-2" value={priorityInput} onChange={(e) => setPriorityInput(e.target.value as Todo["priority"])}>
          <option value="low">低</option>
          <option value="med">中</option>
          <option value="high">高</option>
        </select>
        <input aria-label="提醒时间" className="rounded border px-2 py-2" placeholder="HH:mm（选填）" value={reminderTimeInput} onChange={(e) => setReminderTimeInput(e.target.value)} />
        <select aria-label="提前提醒" className="rounded border px-2 py-2" value={String(remindBeforeInput)} onChange={(e) => setRemindBeforeInput(Number(e.target.value))}>
          <option value="15">提前15分钟</option>
          <option value="30">提前30分钟</option>
          <option value="60">提前60分钟</option>
          <option value="120">提前120分钟</option>
        </select>
        <input aria-label="标签" className="rounded border px-2 py-2 md:col-span-2" placeholder="标签（逗号分隔，如：回访,报价）" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
        <button
          className="rounded bg-slate-200 px-3 py-2 text-sm md:col-span-2"
          onClick={() => setAdvancedMode((v) => !v)}
        >
          {advancedMode ? "收起高级模式" : "展开高级模式"}
        </button>
        {advancedMode && (
          <>
            <input
              aria-label="快捷录入高级模式"
              aria-invalid={fieldErrors.quickInput ? "true" : "false"}
              ref={quickInputRef}
              className={`rounded border px-2 py-2 md:col-span-2 ${fieldErrors.quickInput ? "border-rose-500 ring-1 ring-rose-200" : ""}`}
              placeholder="高级模式：!!! 跟进报价 @14:30 #回访 r:30m"
              value={quickInput}
              onChange={(e) => {
                setQuickInput(e.target.value);
                if (fieldErrors.quickInput) setFieldErrors((prev) => ({ ...prev, quickInput: undefined }));
                if (createFormError) setCreateFormError("");
              }}
            />
            {fieldErrors.quickInput && <p className="-mt-1 text-xs text-rose-600 md:col-span-2">{fieldErrors.quickInput}</p>}
          </>
        )}
        <input aria-label="订单草稿" className="rounded border px-2 py-2" placeholder="订单草稿（选填，默认定制条目）" value={orderDraftText} onChange={(e) => setOrderDraftText(e.target.value)} />
        {createFormError && <div className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 md:col-span-2">{createFormError}</div>}
        <button className="rounded bg-sky-600 px-3 py-2 text-white md:col-span-2" onClick={createTodo}>
          新建待办（Ctrl/Cmd+Enter）
        </button>
      </div>

      {editingTodoId && (
        <div className="fixed inset-0 z-20 bg-black/40" onClick={requestCloseTodoDetail}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="todo-detail-title"
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 id="todo-detail-title" className="text-lg font-semibold">待办详情</h3>
              <button className="rounded bg-slate-200 px-2 py-1 text-sm" onClick={requestCloseTodoDetail}>关闭</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-600" htmlFor="todo-detail-title-input">详情标题</label>
                <input
                  id="todo-detail-title-input"
                  aria-label="详情标题"
                  className="w-full rounded border px-2 py-2"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="请输入待办标题"
                />
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded bg-emerald-600 px-3 py-2 text-white" onClick={saveTodoDetail}>保存详情</button>
                <button className="flex-1 rounded bg-slate-200 px-3 py-2" onClick={requestCloseTodoDetail}>取消</button>
              </div>
            </div>
          </aside>
        </div>
      )}

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
            {!dayTodos.length && <div className="rounded border border-dashed p-6 text-center text-slate-500">当天暂无待办</div>}
          </div>
        </SortableContext>
      </DndContext>

      {conversionTodoId && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded bg-white p-4">
            <h3 className="text-lg font-semibold">完成待办并转换</h3>
            <p className="mt-1 text-sm text-slate-600">请选择转换类型：</p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded bg-emerald-600 px-3 py-2 text-white" onClick={() => convert("order")}>正式订单</button>
              <button className="flex-1 rounded bg-amber-600 px-3 py-2 text-white" onClick={() => convert("opportunity")}>线索/机会</button>
            </div>
            <button className="mt-3 w-full rounded bg-slate-200 px-3 py-2" onClick={() => setConversionTodoId(null)}>取消</button>
          </div>
        </div>
      )}
      {confirmDuplicateCustomer && pendingCreatePayload && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded bg-white p-4">
            <h3 className="text-lg font-semibold">发现可能重复客户</h3>
            <p className="mt-1 text-sm text-slate-600">输入名称与已有客户近似，请先选择已有客户，或确认仍然新建。</p>
            <div className="mt-3 space-y-2 rounded border bg-slate-50 p-2">
              {duplicateCandidates.map((candidate) => {
                const compared = getComparisonHighlights(pendingCreatePayload.customerName, candidate.name);
                return (
                  <button
                    key={candidate.id}
                    className="w-full rounded border bg-white px-3 py-2 text-left text-sm hover:bg-sky-50"
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
                      <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1">
                        <p className="text-xs text-amber-700">你输入的客户</p>
                        <p className="font-medium text-slate-900">
                          {compared.inputSegments.map((segment, idx) => (
                            <span key={`input-${candidate.id}-${idx}`} className={segment.match ? "rounded bg-amber-200 px-0.5" : ""}>
                              {segment.text}
                            </span>
                          ))}
                        </p>
                      </div>
                      <div className="rounded border border-sky-200 bg-sky-50 px-2 py-1">
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
              <button
                className="flex-1 rounded bg-amber-600 px-3 py-2 text-white"
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
              </button>
              <button
                className="flex-1 rounded bg-slate-200 px-3 py-2"
                onClick={() => {
                  setPendingCreatePayload(null);
                  setDuplicateCandidates([]);
                  setConfirmDuplicateCustomer(false);
                }}
              >
                返回继续编辑
              </button>
            </div>
          </div>
        </div>
      )}

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
