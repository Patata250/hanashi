// Hanashi service worker: keeps the app shell available offline.
const CACHE = "hanashi-v20";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./wanakana.min.js", "./tama-rig.js", "./verbs.js", "./packs.js", "./practice.js", "./sync.js", "./ejercicios-base.json", "./dict-ja-es.json", "./logo.svg", "./tama-neutral.webp", "./tama-happy.webp", "./tama-talk.webp", "./tama-listen.webp", "./tama-think.webp", "./tama-oops.webp"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // AI calls and fonts go straight to the network
  // Network first so updates arrive quickly; fall back to cache when offline.
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
