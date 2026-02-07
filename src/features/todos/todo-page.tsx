"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store/appStore";
import { parseQuickAdd } from "@/domain/parser";
import { todayYmd } from "@/lib/date";
import type { OrderType, Todo } from "@/domain/types";

function SortableItem({ todo, onComplete }: { todo: Todo; onComplete: (id: string) => void }) {
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
        {!todo.completed && (
          <button className="rounded bg-emerald-600 px-3 py-1 text-sm text-white" onClick={() => onComplete(todo.id)}>
            完成
          </button>
        )}
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
  const completeTodoWithConversion = useAppStore((s) => s.completeTodoWithConversion);

  const [customerInput, setCustomerInput] = useState("");
  const [quickInput, setQuickInput] = useState("");
  const [summary, setSummary] = useState("");
  const [orderDraftText, setOrderDraftText] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [conversionTodoId, setConversionTodoId] = useState<string | null>(null);

  const dayTodos = useMemo(() => {
    const list = todos.filter((x) => x.date === selectedDate).sort((a, b) => a.order - b.order);
    if (filter === "all") return list;
    return list.filter((x) => (filter === "pending" ? !x.completed : x.completed));
  }, [todos, selectedDate, filter]);

  const createTodo = () => {
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
  };

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

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">今日/日历待办</h2>
      <div className="flex flex-wrap gap-2">
        <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setDate(todayYmd(new Date(new Date(selectedDate).getTime() - 86400000)))}>
          前一天
        </button>
        <input type="date" value={selectedDate} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setDate(todayYmd(new Date(new Date(selectedDate).getTime() + 86400000)))}>
          后一天
        </button>
        <select className="rounded border px-2 py-1" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="pending">仅未完成</option>
          <option value="done">仅已完成</option>
          <option value="all">全部</option>
        </select>
      </div>

      <div className="grid gap-2 rounded border bg-white p-3 md:grid-cols-2">
        <input className="rounded border px-2 py-2" placeholder="客户名称（必填）" value={customerInput} onChange={(e) => setCustomerInput(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="快捷录入：!!! 客户A 14:30 #回访" value={quickInput} onChange={(e) => setQuickInput(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="沟通纪要（选填）" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="订单草稿（选填，默认定制条目）" value={orderDraftText} onChange={(e) => setOrderDraftText(e.target.value)} />
        <button className="rounded bg-sky-600 px-3 py-2 text-white md:col-span-2" onClick={createTodo}>
          新建待办
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={dayTodos.map((x) => x.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {dayTodos.map((todo) => (
              <SortableItem key={todo.id} todo={todo} onComplete={setConversionTodoId} />
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
    </section>
  );
}
