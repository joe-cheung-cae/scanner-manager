"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/appStore";

const NAVS = [
  { href: "/", label: "今日待办" },
  { href: "/orders", label: "订单库" },
  { href: "/customers", label: "客户库" },
  { href: "/products", label: "产品库" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrate = useAppStore((s) => s.hydrate);
  const fallback = useAppStore((s) => s.storageFallback);
  const storageError = useAppStore((s) => s.storageError);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="mr-3 text-lg font-semibold">扫码枪销售助理</h1>
          {NAVS.map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className={`rounded-md px-3 py-1 text-sm ${pathname === nav.href ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-800"}`}
            >
              {nav.label}
            </Link>
          ))}
          <div className="ml-auto text-sm">
            <span className={online ? "text-emerald-600" : "text-amber-600"}>{online ? "在线" : "离线"}</span>
          </div>
        </div>
      </header>
      {(fallback || storageError) && (
        <div className="bg-amber-100 px-4 py-2 text-sm text-amber-800">{storageError || "存储降级：已切换兜底模式"}</div>
      )}
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
