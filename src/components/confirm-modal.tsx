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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-sm rounded bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded bg-rose-600 px-3 py-2 text-white" onClick={onConfirm}>
            {confirmText || "确认"}
          </button>
          <button className="flex-1 rounded bg-slate-200 px-3 py-2" onClick={onCancel}>
            {cancelText || "取消"}
          </button>
        </div>
      </div>
    </div>
  );
}
