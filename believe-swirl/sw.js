// Believe Swirl — offline cache. Only touches caches named "bswirl-*".
// Bump CACHE whenever a precached file changes (including after pasting TIP_URL
// in app.js). Activate deletes older bswirl-* caches so an installed copy updates.
var CACHE = "bswirl-v2";
var FILES = [
  "./",
  "index.html",
  "app.js",
  "manifest.json",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png"
];

function freshPut(cache, path, res) {
  var key = new Request(new URL(path, self.location).toString());
  return res.blob().then(function (body) {
    var headers = new Headers(res.headers);
    headers.delete("vary");
    headers.delete("content-encoding");
    headers.delete("content-length");
    return cache.put(key, new Response(body, { status: 200, headers: headers }));
  });
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(FILES.map(function (path) {
        return fetch(new Request(path, { cache: "reload" })).then(function (res) {
          if (!res.ok) throw new Error(path);
          return freshPut(cache, path, res);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf("bswirl-") === 0 && k !== CACHE;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/believe-swirl/") !== 0) return;
  if (url.pathname.slice(-5) === "sw.js") return;

  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok) freshPut(cache, e.request.url, res.clone()).catch(function () {});
        return res;
      }).catch(function () {
        if (e.request.mode === "navigate") {
          return cache.match("./").then(function (page) {
            return page || cache.match("index.html");
          });
        }
        return new Response("", { status: 503, statusText: "offline" });
      });
    });
  }));
});
