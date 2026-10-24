// Service worker de Opa's Score: notificaciones y apertura de la app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Vibración distinta para cada tipo de aviso (Android). En iPhone suena el tono de notificación del sistema.
const VIBRATE = {
  goal: [120, 60, 120, 60, 400],
  start: [500],
  halftime: [200, 100, 200],
  final: [200, 100, 200, 100, 600],
  secondhalf: [400],
  yellow: [150, 80, 150],
  red: [600, 150, 600],
  penalty: [80, 60, 80, 60, 80, 60, 300],
  lights: [100, 300, 100, 300, 100, 300, 100, 300, 100, 500, 800],
  checkered: [100, 50, 100, 50, 100, 50, 500],
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
        // Con sonido y vibración (el tono lo pone el teléfono según los ajustes de notificaciones de la app).
        silent: false,
        vibrate: VIBRATE[kind] || VIBRATE.reminder,
        data: { url: data.url || "/" },
      });
    })()
  );
});

// Si el teléfono renueva la suscripción de avisos, se vuelve a registrar sola en el servidor.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const old = event.oldSubscription;
        const opts = old && old.options ? old.options : null;
        const sub = event.newSubscription || (opts ? await self.registration.pushManager.subscribe(opts) : null);
        if (!sub) return;
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sub: sub.toJSON(), oldEndpoint: old && old.endpoint }),
        });
      } catch {
        // sin conexión: se reintenta al abrir la app
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          // Si la ventana no se puede redirigir, se abre una nueva con el partido.
          return c.focus().then((w) => (w && w.navigate ? w.navigate(url) : null)).catch(() => self.clients.openWindow(url));
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Red primero; si no hay conexión, se sirve la última versión guardada de la página.
const CACHE = "opas-v4";
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});
