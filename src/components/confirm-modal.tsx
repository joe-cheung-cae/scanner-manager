"use client";

import { Button } from "@/components/ui/button";

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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/45 px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="text-base font-semibold text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" className="flex-1" onClick={onConfirm}>
            {confirmText || "确认"}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {cancelText || "取消"}
          </Button>
        </div>
      </div>
    </div>
  );
}
