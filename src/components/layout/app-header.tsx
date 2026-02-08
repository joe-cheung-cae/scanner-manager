"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAVS = [
  { href: "/", label: "今日待办" },
  { href: "/orders", label: "订单库" },
  { href: "/customers", label: "客户库" },
  { href: "/products", label: "产品库" },
  { href: "/recycle-bin", label: "回收站" },
];

export function AppHeader({ online }: { online: boolean | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
        <div className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-semibold tracking-tight text-white">扫码枪销售助理</div>
        <nav className="flex flex-wrap items-center gap-1.5">
          {NAVS.map((nav) => {
            const active = pathname === nav.href;
            return (
              <Link
                key={nav.href}
                href={nav.href}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-sm transition",
                  active
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50",
                )}
              >
                {nav.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto inline-flex items-center gap-2 text-xs text-slate-500">
          <span
            className={cn(
              "size-2 rounded-full",
              online === null ? "bg-slate-300" : online ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          <span>{online === null ? "网络状态检测中" : online ? "在线" : "离线"}</span>
        </div>
      </div>
    </header>
  );
}
