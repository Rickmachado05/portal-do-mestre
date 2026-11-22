/* Serve somente os temas 3D que o próprio usuário criou no Ateliê. */
const CACHE='hexatombe-dice-themes-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin || !/^\/assets\/dice-box\/themes\/hx-[\w-]+\/(?:theme\.config\.json|diffuse\.png|default\.json)$/.test(url.pathname))return;
  if(url.pathname.endsWith('/default.json')) { e.respondWith(fetch('/assets/dice-box/themes/default/default.json')); return; }
  e.respondWith(caches.open(CACHE).then(cache=>cache.match(e.request)).then(response=>response||new Response('Tema personalizado não encontrado.',{status:404,headers:{'Content-Type':'text/plain'}})));
});
