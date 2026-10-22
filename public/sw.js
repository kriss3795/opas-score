// Service worker de Opa's Score: notificaciones y apertura de la app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Vibración distinta para cada tipo de aviso (Android). En iPhone suena el tono de notificación del sistema.
const VIBRATE = {
  goal: [120, 60, 120, 60, 400],
  start: [500],
  halftime: [200, 100, 200],
  final: [200, 100, 200, 100, 600],
  reminder: [100, 50, 100],
  morning: [80],
  test: [100, 50, 100],
};

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Opa's Score", body: event.data && event.data.text() }; }
  const kind = data.kind || "reminder";
  event.waitUntil(
    (async () => {
      // Si la app está abierta, además suena el sonido propio (gol, silbato…).
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach((c) => c.postMessage({ type: "opas-sound", kind }));
      await self.registration.showNotification(data.title || "Opa's Score", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag,
        renotify: Boolean(data.tag),
        vibrate: VIBRATE[kind] || VIBRATE.reminder,
        data: { url: data.url || "/" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Red primero; si no hay conexión, se sirve la última versión guardada de la página.
const CACHE = "opas-v2";
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});
