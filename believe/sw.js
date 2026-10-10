// Retired: clears the old /believe/ cache and unregisters itself.
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.delete("believe-v1").then(function () { return self.registration.unregister(); }));
});
