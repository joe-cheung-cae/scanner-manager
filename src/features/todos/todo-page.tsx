"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store/appStore";
import { parseQuickAdd } from "@/domain/parser";
import { todayYmd } from "@/lib/date";
import type { OrderType, Todo } from "@/domain/types";
import { ConfirmModal } from "@/components/confirm-modal";

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
            客户ID: {todo.customerId} {todo.priority ? `· 优先级: ${todo.priority}` : ""} {todo.reminderTime ? `· 提醒: ${todo.reminderTime}` : ""}
          </div>
          {todo.summary && <div className="mt-1 text-sm text-slate-600">{todo.summary}</div>}
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
  const [quickInput, setQuickInput] = useState("");
  const [summary, setSummary] = useState("");
  const [orderDraftText, setOrderDraftText] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [conversionTodoId, setConversionTodoId] = useState<string | null>(null);
  const [pendingDeleteTodoId, setPendingDeleteTodoId] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const quickInputRef = useRef<HTMLInputElement>(null);

  const dayTodos = useMemo(() => {
    const list = todos.filter((x) => x.date === selectedDate).sort((a, b) => a.order - b.order);
    const filteredByStatus = filter === "all" ? list : list.filter((x) => (filter === "pending" ? !x.completed : x.completed));
    const q = search.trim().toLowerCase();
    if (!q) return filteredByStatus;
    return filteredByStatus.filter((todo) => [todo.title, todo.summary, todo.tags?.join(" ")].join(" ").toLowerCase().includes(q));
  }, [todos, selectedDate, filter, search]);

  function createTodo() {
    if (!quickInput.trim()) return;
    const parsed = parseQuickAdd(quickInput);
    if (!parsed.title.trim()) return;

    let customerId = customers.find((c) => c.name === customerInput.trim())?.id;
    if (!customerId) {
      if (!customerInput.trim()) return;
      customerId = addCustomer({ name: customerInput.trim() });
    }

    addTodo({
      date: selectedDate,
      title: parsed.title,
      customerId,
      summary: summary || undefined,
      priority: parsed.priority,
      reminderTime: parsed.reminderTime,
      tags: parsed.tags,
      orderDraft: {
        items: orderDraftText
          ? [
              {
                kind: "newCustom",
                customSpecText: orderDraftText,
                quantity: 1,
              },
            ]
          : [],
      },
    });

    setQuickInput("");
    setSummary("");
    setOrderDraftText("");
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
        quickInputRef.current?.focus();
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
    setEditSummary("");
  };

  const saveTodoDetail = () => {
    if (!editingTodoId || !editTitle.trim()) return;
    updateTodo(editingTodoId, { title: editTitle.trim(), summary: editSummary || undefined });
    closeTodoDetail();
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
        <input aria-label="客户名称" className="rounded border px-2 py-2" placeholder="客户名称（必填）" value={customerInput} onChange={(e) => setCustomerInput(e.target.value)} />
        <input aria-label="快捷录入" ref={quickInputRef} className="rounded border px-2 py-2" placeholder="快捷录入：!!! 客户A 14:30 #回访" value={quickInput} onChange={(e) => setQuickInput(e.target.value)} />
        <input aria-label="沟通纪要" className="rounded border px-2 py-2" placeholder="沟通纪要（选填）" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <input aria-label="订单草稿" className="rounded border px-2 py-2" placeholder="订单草稿（选填，默认定制条目）" value={orderDraftText} onChange={(e) => setOrderDraftText(e.target.value)} />
        <button className="rounded bg-sky-600 px-3 py-2 text-white md:col-span-2" onClick={createTodo}>
          新建待办（Ctrl/Cmd+Enter）
        </button>
      </div>

      {editingTodoId && (
        <div className="fixed inset-0 z-20 bg-black/40" onClick={closeTodoDetail}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="todo-detail-title"
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 id="todo-detail-title" className="text-lg font-semibold">待办详情</h3>
              <button className="rounded bg-slate-200 px-2 py-1 text-sm" onClick={closeTodoDetail}>关闭</button>
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
              <div>
                <label className="mb-1 block text-sm text-slate-600" htmlFor="todo-detail-summary-input">详情纪要</label>
                <textarea
                  id="todo-detail-summary-input"
                  aria-label="详情纪要"
                  className="min-h-32 w-full rounded border px-2 py-2"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="请输入沟通纪要"
                />
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded bg-emerald-600 px-3 py-2 text-white" onClick={saveTodoDetail}>保存详情</button>
                <button className="flex-1 rounded bg-slate-200 px-3 py-2" onClick={closeTodoDetail}>取消</button>
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
                  setEditSummary(selected.summary || "");
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
    </section>
  );
}
