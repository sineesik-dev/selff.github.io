/* SELF — service worker
   Tüm dosyaları (videolar dahil) ilk açılışta önbelleğe alır; uygulama
   internetsiz çalışır. Yeni sürüm yayınlarken CACHE adını artır (self-v2...). */

const CACHE = "self-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/data.js",
  "./js/store.js",
  "./js/export.js",
  "./js/app.js",
  "./lib/xlsx.full.min.js",
  "./media/acilis.mp4",
  "./media/kapanis.mp4",
  "./media/bagimlilik.mp4",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(handle(req, url));
});

async function handle(req, url) {
  const cache = await caches.open(CACHE);

  // Sayfa açılışı: her zaman index.html
  if (req.mode === "navigate") {
    const page = (await cache.match("./index.html")) || (await cache.match("./"));
    if (page) return page;
    return fetch(req);
  }

  const cached = await cache.match(url.pathname, { ignoreSearch: true }) ||
                 await cache.match(req, { ignoreSearch: true });

  if (cached) {
    // Video oynatıcı parça parça (Range) ister; önbellekteki tam dosyadan dilim üret.
    if (req.headers.has("range")) return rangeResponse(req, cached);
    return cached;
  }

  // Önbellekte yoksa ağdan al ve sakla.
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response("Çevrimdışı", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function rangeResponse(req, cached) {
  const buf = await cached.arrayBuffer();
  const total = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/i.exec(req.headers.get("range") || "");
  let start = 0, end = total - 1;
  if (m) {
    if (m[1] === "" && m[2] !== "") {          // bytes=-500  (son 500 bayt)
      start = Math.max(0, total - Number(m[2]));
    } else {
      if (m[1] !== "") start = Number(m[1]);
      if (m[2] !== "") end = Math.min(Number(m[2]), total - 1);
    }
  }
  if (start > end || start >= total) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
  }
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "video/mp4",
      "Content-Length": String(slice.byteLength),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
    },
  });
}
