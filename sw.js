// Service worker del calendario. Red primero; si no hay conexión, lo guardado.
// Al cambiar algún archivo de la lista SHELL, sube la versión: calendario-v2, calendario-v3…
const CACHE = "calendario-v1";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  // Solo borra cachés antiguas del calendario, nunca las de la lista de la compra (mismo dominio).
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("calendario-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  const propio = u.origin === location.origin && u.pathname.startsWith(new URL("./", location).pathname);
  const externo = u.hostname === "www.gstatic.com" || u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com";
  if (!propio && !externo) return;   // Firestore y el inicio de sesión van directos a la red
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("./index.html")))
  );
});
