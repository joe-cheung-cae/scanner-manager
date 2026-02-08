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
  { href: "/recycle-bin", label: "回收站" },
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
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="mr-3 rounded-lg bg-slate-900 px-3 py-1 text-lg font-semibold tracking-wide text-white">扫码枪销售助理</h1>
          {NAVS.map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                pathname === nav.href
                  ? "bg-sky-600 text-white shadow-sm shadow-sky-300/40"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {nav.label}
            </Link>
          ))}
          <div className="ml-auto text-sm">
            {online === null && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">网络状态检测中</span>}
            {online === true && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">在线</span>}
            {online === false && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">离线</span>}
          </div>
        </div>
      </header>
      {(fallback || storageError) && (
        <div className="border-b border-amber-200 bg-amber-100 px-4 py-2 text-sm text-amber-800">{storageError || "存储降级：已切换兜底模式"}</div>
      )}
      <main className="mx-auto max-w-6xl p-4 md:p-5">{children}</main>
    </div>
  );
}
