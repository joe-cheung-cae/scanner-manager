"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { AppHeader } from "@/components/layout/app-header";

export function AppShell({ children }: { children: React.ReactNode }) {
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader online={online} />
      <div className="pointer-events-none absolute inset-x-0 top-[57px] h-40 bg-gradient-to-b from-sky-100/80 via-sky-50/30 to-transparent" />
      {(fallback || storageError) && (
        <div className="border-b border-amber-200 bg-amber-50/90 px-6 py-2 text-sm text-amber-800">{storageError || "存储降级：已切换兜底模式"}</div>
      )}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
