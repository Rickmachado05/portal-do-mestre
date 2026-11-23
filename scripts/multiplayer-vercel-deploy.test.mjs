import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
import {normalizarOrigemServidor} from '../src/multiplayer/configuracaoServidor.mjs';

const site='https://portal-exemplo.vercel.app';

test('Vercel: configura URLs HTTPS de túnel sem aceitar esquemas inseguros',()=>{
 assert.equal(normalizarOrigemServidor('https://mesa.trycloudflare.com/'), 'https://mesa.trycloudflare.com');
 assert.equal(normalizarOrigemServidor('https://portal.example.org'), 'https://portal.example.org');
 assert.equal(normalizarOrigemServidor('http://localhost:8787'),'http://localhost:8787');
 assert.equal(normalizarOrigemServidor('http://mesa.example.org'),'');
 assert.equal(normalizarOrigemServidor('https://site.tld/path'),'');
 assert.equal(normalizarOrigemServidor('https://a:b@site.tld'),'');
 assert.equal(normalizarOrigemServidor('javascript:alert(1)'),'');
});

test('Vercel: HTML das várias páginas não deve ser substituído pelo Portal na navegação',()=>{
 const config=JSON.parse(readFileSync(resolve('vercel.json'),'utf8'));
 assert.equal(config.outputDirectory,'dist');
 assert.equal(config.buildCommand,'npm run cloudflare:build');
 for(const pagina of ['mesa','mesa3d','convidado','caderno','mesas','perfil','criador','tokens']){
   for(const caminho of [`/${pagina}`,`/${pagina}/`]){
     assert(config.rewrites.some(r=>r.source===caminho&&r.destination===`/${pagina}/index.html`),caminho);
   }
 }
 assert(!config.rewrites.some(r=>r.source==='/(.*)'&&r.destination==='/index.html'));
 const htmlTokens=readFileSync(resolve('tokens/index.html'),'utf8');
 assert(htmlTokens.includes('/src/portal/main.tsx'),'A página de tokens deve reutilizar o Portal');
 assert(readFileSync(resolve('vite.config.ts'),'utf8').includes("./tokens/index.html"),'Vite precisa gerar tokens/index.html');
});

test('Vercel: CORS restrito ao site explicitamente autorizado; APIs e tokens preservados',async()=>{
 const anterior=process.env.PORTAL_ORIGENS_VERCEL;
 process.env.PORTAL_ORIGENS_VERCEL=site;
 const app=criarAplicacaoMultiplayer();
 const {port}=await app.escutar(0);
 const raiz=`http://127.0.0.1:${port}/api/multiplayer`;
 try{
   const preflight=await fetch(`${raiz}/salas`,{method:'OPTIONS',headers:{Origin:site,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type, Authorization'}});
   assert.equal(preflight.status,204);
   assert.equal(preflight.headers.get('access-control-allow-origin'),site);
   assert.match(preflight.headers.get('access-control-allow-headers'),/Authorization/);
   const negado=await fetch(`${raiz}/salas`,{method:'POST',headers:{Origin:'https://desconhecido.example','Content-Type':'application/json'},body:JSON.stringify({campanhaId:'x',campanha:'t'})});
   assert.equal(negado.status,403);
   assert.equal(negado.headers.get('access-control-allow-origin'),null);
   const criado=await fetch(`${raiz}/salas`,{method:'POST',headers:{Origin:site,'Content-Type':'application/json'},body:JSON.stringify({campanhaId:'vercel-teste',campanha:'Vercel'})});
   assert.equal(criado.status,201);
   assert.equal(criado.headers.get('access-control-allow-origin'),site);
   const sala=await criado.json();assert(sala.token.length>20);
   const info=await fetch(`${raiz}/salas/${sala.codigo}/eu`,{headers:{Origin:site,Authorization:`Bearer ${sala.token}`}});
   assert.equal(info.status,200);
 }finally{
   await app.fechar();
   if(anterior===undefined)delete process.env.PORTAL_ORIGENS_VERCEL;else process.env.PORTAL_ORIGENS_VERCEL=anterior;
 }
});

test('Vercel: WebSocket aceita origem autorizada e bloqueia outras',async()=>{
 const anterior=process.env.PORTAL_ORIGENS_VERCEL;
 process.env.PORTAL_ORIGENS_VERCEL=site;
 const app=criarAplicacaoMultiplayer(),{port}=await app.escutar(0);
 try{
   const raiz=`http://127.0.0.1:${port}/api/multiplayer/salas`;
   const created=await fetch(raiz,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campanhaId:'ws',campanha:'WS'})}).then(r=>r.json());
   const caminho=`/api/multiplayer/salas/${created.codigo}/eventos-ws?token=${encodeURIComponent(created.token)}`;
   async function handshake(origin){
     return new Promise((resolve,reject)=>{
       const key=randomBytes(16).toString('base64');
       const req=http.get({host:'127.0.0.1',port,path:caminho,headers:{Origin:origin,Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':key}});
       const timeout=setTimeout(()=>{req.destroy();reject(Error('timeout WS'));},2500);
       req.on('upgrade',(res,socket)=>{clearTimeout(timeout);socket.destroy();resolve(res.statusCode);});
       req.on('response',res=>{clearTimeout(timeout);res.resume();resolve(res.statusCode);});
       req.on('error',err=>{clearTimeout(timeout);reject(err);});
     });
   }
   assert.equal(await handshake('https://outro-site.example'),403);
   assert.equal(await handshake(site),101);
 }finally{
   await app.fechar();
   if(anterior===undefined)delete process.env.PORTAL_ORIGENS_VERCEL;else process.env.PORTAL_ORIGENS_VERCEL=anterior;
 }
});
