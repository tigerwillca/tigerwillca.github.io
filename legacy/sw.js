const C="shaffer-v46";
const CORE=["/legacy/","/legacy/index.html","/legacy/tutu.html","/legacy/family-line/","/legacy/apple-touch-icon.png","/legacy/icon-192.png","/legacy/icon-512.png","/legacy/manifest.webmanifest","/legacy/favicon.svg","/legacy/favicon.ico","/legacy/favicon-32.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.origin!==location.origin||r.headers.has("range")||/\.mp4$/i.test(u.pathname))return;
 if(r.mode==="navigate"||u.pathname.endsWith("/")||u.pathname.endsWith(".html")){const key=/\/tutu\.html$/.test(u.pathname)?"/legacy/tutu.html":/\/family-line\//.test(u.pathname)?"/legacy/family-line/":"/legacy/";   // each page keeps its own offline copy
  e.respondWith(fetch(r,{cache:"no-store"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(key,cp))}return res}).catch(()=>caches.match(key)));return;}
 e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res})));});
