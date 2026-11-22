import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const codigo=(s)=>`/salas/${s}`;
async function req(base,path,token,body){
 const res=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:res.status,data:await res.json()};
}
function escutarEventos(stream){
 const leitor=stream.body.getReader(),decoder=new TextDecoder();let buffer='';const fila=[];
 return async (tipo)=>{
  const fim=Date.now()+1800;
  while(Date.now()<fim){
   const i=fila.findIndex(e=>e.tipo===tipo);if(i>=0)return fila.splice(i,1)[0];
   const valor=await Promise.race([leitor.read(),new Promise((_,r)=>setTimeout(()=>r(Error('Aguardando '+tipo)),fim-Date.now()))]);
   if(valor.done)break;
   buffer+=decoder.decode(valor.value,{stream:true});
   const partes=buffer.split('\n\n');buffer=partes.pop()||'';
   for(const parte of partes){const linha=parte.split('\n').find(l=>l.startsWith('data: '));if(linha)fila.push(JSON.parse(linha.slice(6)));}
  }
  throw Error('Evento ausente: '+tipo);
 };
}
function entradaMesa(cenaId='cena-um',visibilidade='total',confirmados=[]){
 return {cenaId,cenaNome:'Mapa',visibilidade,imagem:'data:image/webp;base64,AAAA',
  ambiente:{clima:{tipo:'chuva'},iluminacao:{ativa:true,ambiente:25},luzes:[],marcadores:[],desenhos:[]},
  tokens:[{id:'heroi',nome:'Herói',tipo:'jogador',x:50,y:50,cor:'#aabbcc'}],
  idsDesenhosConfirmados:confirmados};
}
test('v29.14.2: desenho confirmado pela republicação persiste e confirmação vai só ao autor',async()=>{
 const app=criarAplicacaoMultiplayer();const endereco=await app.escutar(0);
 const base=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
 const abertos=[];
 try{
  const saude=await req(base,'/saude');assert.equal(saude.data.recursos.confirmacaoDesenhos,true);
  const mestre=(await req(base,'/salas',null,{campanha:'Teste',campanhaId:'c1'})).data;
  const ana=(await req(base,`${codigo(mestre.codigo)}/entrar`,null,{apelido:'Ana'})).data;
  const bia=(await req(base,`${codigo(mestre.codigo)}/entrar`,null,{apelido:'Bia'})).data;
  const R=codigo(mestre.codigo);
  assert.equal((await req(base,`${R}/mesa`,mestre.token,entradaMesa())).status,200);
  const cMaster=new AbortController(),cAna=new AbortController(),cBia=new AbortController();abertos.push(cMaster,cAna,cBia);
  const eMaster=escutarEventos(await fetch(`${base}${R}/eventos?token=${mestre.token}&controlador=1`,{signal:cMaster.signal}));
  const eAna=escutarEventos(await fetch(`${base}${R}/eventos?token=${ana.token}`,{signal:cAna.signal}));
  const eBia=escutarEventos(await fetch(`${base}${R}/eventos?token=${bia.token}`,{signal:cBia.signal}));
  const desenho={acao:'adicionar',cenaId:'cena-um',pontos:[{x:22,y:34},{x:30,y:48}],cor:'#aabbcc',espessura:3};
  const envio=await req(base,`${R}/desenho`,ana.token,desenho);
  assert.equal(envio.status,201);
  const pedido=await eMaster('desenho-jogador');assert.equal(pedido.traco.id,envio.data.id);
  let quadro=(await req(base,`${R}/mesa`,bia.token)).data.mesa;
  assert.equal(quadro.ambiente.desenhos.length,0,'Não aparece antes de o mestre salvar');
  assert.equal((await req(base,`${R}/mesa`,mestre.token,entradaMesa('cena-um','total',[envio.data.id]))).status,200);
  const confirmado=await eAna('desenho-confirmado');assert.equal(confirmado.id,envio.data.id);
  assert.equal(confirmado.cenaId,'cena-um');
  assert.notEqual((await eBia('mesa')).tipo,'desenho-confirmado');
  quadro=(await req(base,`${R}/mesa`,bia.token)).data.mesa;
  assert.ok(!('idsDesenhosConfirmados' in quadro),'O servidor não revela os ids de confirmação');
 }finally{for(const c of abertos)c.abort();await app.fechar();}
});
test('v29.14.2: desenho pendente é reenviado ao mestre quando a conexão de controle volta',async()=>{
 const app=criarAplicacaoMultiplayer();const endereco=await app.escutar(0);
 const base=`http://127.0.0.1:${endereco.port}/api/multiplayer`;const abertos=[];
 try{
  const mestre=(await req(base,'/salas',null,{campanha:'Teste',campanhaId:'c1'})).data;
  const ana=(await req(base,`${codigo(mestre.codigo)}/entrar`,null,{apelido:'Ana'})).data;
  const R=codigo(mestre.codigo);
  await req(base,`${R}/mesa`,mestre.token,entradaMesa());
  const cMaster=new AbortController();abertos.push(cMaster);
  await fetch(`${base}${R}/eventos?token=${mestre.token}&controlador=1`,{signal:cMaster.signal});
  const envio=await req(base,`${R}/desenho`,ana.token,{acao:'adicionar',cenaId:'cena-um',cor:'#abcdef',espessura:2,pontos:[{x:33,y:33}]});
  assert.equal(envio.status,201);
  cMaster.abort();
  const cOutro=new AbortController();abertos.push(cOutro);
  const novo=escutarEventos(await fetch(`${base}${R}/eventos?token=${mestre.token}&controlador=1`,{signal:cOutro.signal}));
  const replay=await novo('desenho-jogador');assert.equal(replay.traco.id,envio.data.id);
 }finally{for(const c of abertos)c.abort();await app.fechar();}
});
test('v29.14.2: UI de desenho aguarda publicação, restaura escurecimento nas duas mesas, sinaliza servidor antigo',()=>{
 const ler=f=>readFileSync(new URL(`../src/${f}`,import.meta.url),'utf8');
 const player=ler('multiplayer/MesaConvidado2D.tsx'),guest=ler('multiplayer/AmbienteConvidado2D.tsx');
 const master=ler('App.tsx'),pub=ler('multiplayer/PublicadorMesa.tsx');
 assert.match(guest,/const sombra=!individual&&Boolean\(ambiente\.iluminacao\?\.ativa\)/);
 assert.match(master,/<IluminacaoCena2D ativa=\{configLuz\.ativa\}/);
 const base=ler('lib/CenaVisual2D.tsx');
 assert.match(base,/const opacidade=\.95\*\(100-/);
 assert.match(ler('App.css'),/\.iluminacao-svg\.luz-mestre\{opacity:1\}/);
 assert.match(player,/pendentesDesenho/);assert.match(player,/Tentar novamente/);
 assert.match(player,/desenhosConfirmados/);assert.match(pub,/idsDesenhosConfirmados/);
 assert.match(ler('multiplayer/Convidado.tsx'),/Servidor multiplayer antigo/);
});
