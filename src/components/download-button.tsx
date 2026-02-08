"use client";

import { Button } from "@/components/ui/button";

export function DownloadButton({ filename, content, label }: { filename: string; content: string; label: string }) {
  return (
    <Button
      variant="secondary"
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
    </Button>
  );
}
