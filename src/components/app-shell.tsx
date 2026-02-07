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
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((item) => item.unregister())))
      .catch(() => undefined);

    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const syncOnlineState = () => setOnline(navigator.onLine);
    const timer = window.setTimeout(syncOnlineState, 0);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearTimeout(timer);
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
            {online === null && <span className="text-slate-500">网络状态检测中</span>}
            {online === true && <span className="text-emerald-600">在线</span>}
            {online === false && <span className="text-amber-600">离线</span>}
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
