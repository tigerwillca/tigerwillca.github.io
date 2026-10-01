const C='staying-v2', F=['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim();});
// stale-while-revalidate: opens instantly offline, picks up updates next time
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  e.respondWith(caches.open(C).then(c=>c.match(e.request,{ignoreSearch:true}).then(r=>{
    const net=fetch(e.request).then(n=>{if(n.ok&&new URL(e.request.url).origin===location.origin)c.put(e.request,n.clone());return n;}).catch(()=>r);
    return r||net;})));});
