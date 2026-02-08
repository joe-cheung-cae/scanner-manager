import { cn } from "@/lib/cn";

export function FilterBar({ className, sticky = false, children }: { className?: string; sticky?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm",
        sticky ? "sticky top-[72px] z-10" : "",
        className,
      )}
    >
      {children}
    </div>
  );
}
