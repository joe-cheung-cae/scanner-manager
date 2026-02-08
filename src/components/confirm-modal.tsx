"use client";

export function ConfirmModal({
  open,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px]" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-lg bg-rose-600 px-3 py-2 font-medium text-white hover:bg-rose-700" onClick={onConfirm}>
            {confirmText || "确认"}
          </button>
          <button className="flex-1 rounded-lg bg-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-300" onClick={onCancel}>
            {cancelText || "取消"}
          </button>
        </div>
      </div>
    </div>
  );
}
