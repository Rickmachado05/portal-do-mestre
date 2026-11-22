import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
import {usarWebSocketNoHost,criarConexaoWebSocket} from '../src/multiplayer/websocketEventos.mjs';

async function criarSala(base){
  const r=await fetch(`${base}/api/multiplayer/salas`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campanhaId:'cloudflare-test',campanha:'Cloudflare'})});
  assert.equal(r.status,201);return r.json();
}
async function abrirWS(base,codigo,token,controlador=false){
  const ws=new WebSocket(base.replace('http:','ws:')+`/api/multiplayer/salas/${codigo}/eventos-ws?token=${encodeURIComponent(token)}${controlador?'&controlador=1':''}`);
  const eventos=[];
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('WebSocket não conectou em 2000ms')),2000);
    ws.onopen=()=>{clearTimeout(timeout);resolve();};
    ws.onerror=e=>{clearTimeout(timeout);reject(Error('WebSocket não abriu'));};
  });
  ws.onmessage=e=>{try{eventos.push(JSON.parse(e.data));}catch{}};
  return {ws,eventos};
}
async function aguardar(testar){
  const fim=Date.now()+3000;
  while(Date.now()<fim){if(testar())return;await new Promise(r=>setTimeout(r,20));}
  assert.fail('Evento esperado não chegou pelo WebSocket');
}

 test('Cloudflare: WebSocket remoto conecta com token, envia eventos por usuário e SSE local continua ativo',async()=>{
  const app=criarAplicacaoMultiplayer();const {port}=await app.escutar(0);
  const base=`http://127.0.0.1:${port}`;
  const sockets=[];
  try{
    const host=await criarSala(base);
    const rota=`/api/multiplayer/salas/${host.codigo}`;
    const mestre=await abrirWS(base,host.codigo,host.token,true);sockets.push(mestre.ws);
    const r=await fetch(base+rota+'/entrar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apelido:'Convidado'})});
    assert.equal(r.status,201);
    const convidado=await r.json();
    const visitante=await abrirWS(base,host.codigo,convidado.token);sockets.push(visitante.ws);
    // publicar cena a partir do mestre; visão individual do convidado filtra o segredo.
    const publicar=await fetch(base+rota+'/mesa',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${host.token}`},body:JSON.stringify({
      cenaId:'arena',cenaNome:'Arena',visibilidade:'total',modoMesa:'2d',revisao:1,
      tokens:[{id:'p1',nome:'Personagem',tipo:'jogador',x:10,y:10,cor:'#4466aa'}]
    })});
    assert.equal(publicar.status,200);
    await aguardar(()=>mestre.eventos.some(e=>e.tipo==='mesa')&&visitante.eventos.some(e=>e.tipo==='mesa'));
    assert.equal(visitante.eventos.find(e=>e.tipo==='mesa').mesa.cenaId,'arena');
    // EventSource local continua disponível: a mudança não removeu o SSE.
    const controle=new AbortController();
    try{
      const sse=await fetch(`${base}${rota}/eventos?token=${encodeURIComponent(host.token)}`,{signal:controle.signal});
      assert.equal(sse.status,200);
      assert.match(sse.headers.get('content-type'),/text\/event-stream/);
    }finally{controle.abort();}
  }finally{for(const ws of sockets)ws.close();await app.fechar();}
 });

 test('Cloudflare: token inválido não recebe eventos do WebSocket',async()=>{
  const app=criarAplicacaoMultiplayer(),{port}=await app.escutar(0);
  const base=`http://127.0.0.1:${port}`;
  try{
    const host=await criarSala(base);
    const ws=new WebSocket(base.replace('http:','ws:')+`/api/multiplayer/salas/${host.codigo}/eventos-ws?token=invalido`);
    const abriu=await new Promise(resolve=>{
      ws.onopen=()=>resolve(true);ws.onerror=()=>resolve(false);setTimeout(()=>resolve(false),1800);
    });
    assert.equal(abriu,false,'Conexão sem autenticação não deve receber Upgrade 101');
    ws.close();
  }finally{await app.fechar();}
 });

 test('Cloudflare: estáticos só servem dist e não vazam arquivos privados ou caminhos ascendentes',async()=>{
  const dist=mkdtempSync(join(tmpdir(),'portal-cloudflare-dist-'));
  mkdirSync(join(dist,'convidado'));
  writeFileSync(join(dist,'index.html'),'<html>Portal</html>');
  writeFileSync(join(dist,'convidado','index.html'),'<html>Convidado</html>');
  const app=criarAplicacaoMultiplayer({diretorioPublico:dist});
  try{
    const {port}=await app.escutar(0),base=`http://127.0.0.1:${port}`;
    const portal=await fetch(base+'/');assert.equal(portal.status,200);assert.match(await portal.text(),/Portal/);
    const convite=await fetch(base+'/convidado/?sala=ABCDEFGH');assert.equal(convite.status,200);assert.match(await convite.text(),/Convidado/);
    const oculto=await fetch(base+'/.env');assert.equal(oculto.status,403);
    const fonte=await fetch(base+'/src/multiplayer/api.ts');assert.equal(fonte.status,404);
    const ausente=await fetch(base+'/scripts/multiplayer-server.mjs');assert.equal(ausente.status,404);
    const metodo=await fetch(base+'/',{method:'POST'});assert.equal(metodo.status,405);
  }finally{await app.fechar();rmSync(dist,{recursive:true,force:true});}
 });

 test('Cloudflare: URLs externas usam WebSocket seguro, conexões locais continuam SSE',()=>{
  assert.equal(usarWebSocketNoHost('localhost'),false);
  assert.equal(usarWebSocketNoHost('127.0.0.1'),false);
  assert.equal(usarWebSocketNoHost('mesa.trycloudflare.com'),true);
  assert.equal(usarWebSocketNoHost('rpg.example.com'),true);
  const original=globalThis.window;
  globalThis.window={location:{href:'https://mesa.trycloudflare.com/'}};
  try{
    let url;
    const sock={onopen:null,onmessage:null,onerror:null,onclose:null,close(){this.fechou=true;}};
    const stream=criarConexaoWebSocket('/api/multiplayer/salas/ABCDEFGH/eventos?token=segredo',destino=>{url=destino;return sock;});
    assert.equal(url,'wss://mesa.trycloudflare.com/api/multiplayer/salas/ABCDEFGH/eventos-ws?token=segredo');
    stream.close();assert.equal(sock.fechou,true);
  }finally{globalThis.window=original;}
 });
