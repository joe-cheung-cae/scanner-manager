"use client";

export function DownloadButton({ filename, content, label }: { filename: string; content: string; label: string }) {
  return (
    <button
      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
      onClick={() => {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      {label}
    </button>
  );
}
