/* Cache only application shell. NEVER cache Auth/REST/Storage requests. */
const CACHE='grx-shell-v2-cloudrestore-20261104';
const FILES=['./','./index.html','./config.js','./camera.js','./vendor/supabase-2.57.4.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('message',e=>{if(e.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('grx-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(!FILES.some(f=>new URL(f,self.location.href).pathname===u.pathname))return;
 if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE).then(async c=>(await c.match(new URL('./index.html',self.location.href).href))||fetch(e.request)));return;}
 e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request))||fetch(e.request)));
});
