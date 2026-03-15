// Service Worker for Web Push Notifications & Offline cache
const CACHE_NAME = "edart-cache-v1";
const OFFLINE_URLS = ["/", "/index.html"];

// Push notification handler
self.addEventListener("push", (event) => {
  const defaultData = { title: "eDART Polska", body: "Masz nowe powiadomienie", icon: "/logo.svg", badge: "/logo.svg" };
  let data = defaultData;
  try {
    if (event.data) data = { ...defaultData, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/logo.svg",
      badge: data.badge || "/logo.svg",
      data: data.url || "/",
      tag: data.tag || "default",
    })
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Install: cache essential assets for offline
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first with offline fallback for navigation
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }
  // For static assets, cache-first
  if (event.request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response("", { status: 503 }));
      })
    );
    return;
  }
});
