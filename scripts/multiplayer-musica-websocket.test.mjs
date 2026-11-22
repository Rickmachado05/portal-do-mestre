import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const enviar=async(url,method,body,token)=>{
  const resposta=await fetch(url,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert.ok(resposta.ok,`${method} ${url}: ${resposta.status}`);
  return resposta.json();
};

test('Cloudflare/WebSocket: convidados recebem alteração e estado atual da trilha',async()=>{
  const app=criarAplicacaoMultiplayer();
  const addr=await app.escutar(0);
  const root=`http://127.0.0.1:${addr.port}/api/multiplayer`;
  let socket=null;
  try{
    const host=await enviar(root+'/salas','POST',{campanhaId:'principal',campanha:'Teste musica'},null);
    const guest=await enviar(`${root}/salas/${host.codigo}/entrar`,'POST',{apelido:'Convidado'},null);
    socket=new WebSocket(`ws://127.0.0.1:${addr.port}/api/multiplayer/salas/${host.codigo}/eventos-ws?token=${encodeURIComponent(guest.token)}`);
    let resolver=null;
    const recebidas=[];
    const esperando=new Promise((resolve,reject)=>{resolver=resolve;setTimeout(()=>reject(new Error('Não recebeu evento música')),2500);});
    socket.addEventListener('message',e=>{
      const texto=String(e.data);
      // O protocolo WebSocket retransmite eventos SSE; valida sua presença.
      if(texto.includes('musica')){recebidas.push(texto);if(texto.includes('Trilha WebSocket'))resolver?.();}
    });
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    await enviar(`${root}/salas/${host.codigo}/musica`,'POST',{id:'12345678-1234-1234-1234-123456789abc',titulo:'Trilha WebSocket',origem:'url',endereco:'https://example.com/song.mp3',tocando:true,posicao:5},host.token);
    await esperando;
    assert.ok(recebidas.some(t=>t.includes('Trilha WebSocket')));
  }finally{socket?.close();await app.fechar();}
});
