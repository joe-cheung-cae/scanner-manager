const CACHE_NAME = "scanner-manager-v2";
const ASSETS = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const { request } = event;

  // 页面导航走网络优先，避免旧 HTML 导致 hydration mismatch。
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset = /\.(?:js|css|png|jpg|jpeg|svg|ico|webmanifest)$/.test(url.pathname);
  if (!isSameOrigin || !isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    }),
  );
});
