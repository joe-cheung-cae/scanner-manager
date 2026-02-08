import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "success" | "warn" | "danger" | "info";

const variantClass: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700",
};

export function Badge({ className, variant = "default", children }: { className?: string; variant?: BadgeVariant; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", variantClass[variant], className)}>{children}</span>;
}
