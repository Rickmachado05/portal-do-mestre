import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
async function json(base,rota,token,body){
 const resposta=await fetch(base+rota,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:resposta.status,data:await resposta.json()};
}
async function criar(){
 const app=criarAplicacaoMultiplayer();const porta=await app.escutar(0);
 const base=`http://127.0.0.1:${porta.port}/api/multiplayer`;
 const mestre=(await json(base,'/salas',null,{campanha:'Teste desenhos',campanhaId:'desenho-jogador'})).data;
 const rota=`/salas/${mestre.codigo}`;
 const ana=(await json(base,`${rota}/entrar`,null,{apelido:'Ana'})).data;
 const bia=(await json(base,`${rota}/entrar`,null,{apelido:'Bia'})).data;
 return {app,base,mestre,rota,ana,bia};
}
const token=(id,x)=>({id,nome:id,tipo:'jogador',x,y:50,cor:'#aa9988'});
async function publicarCena(s,visibilidade='total'){
 return json(s.base,`${s.rota}/mesa`,s.mestre.token,{cenaId:'c1',cenaNome:'Arena',visibilidade,
  imagem:'data:image/webp;base64,AAAA',tokens:[token('p1',20),token('p2',80)],
  ...(visibilidade==='individual'?{vistas:[{personagemId:'p1',imagem:'data:image/webp;base64,BBBB',idsVisiveis:['p1']},{personagemId:'p2',imagem:'data:image/webp;base64,CCCC',idsVisiveis:['p2']}]}:{})});
}
function ouvirDados(stream){
 const leitor=stream.body.getReader();const dec=new TextDecoder();let buffer='';
 return async function proximo(tipo){
  const deadline=Date.now()+1300;
  while(Date.now()<deadline){
   const remaining=Math.max(1,deadline-Date.now());
   const dado=await Promise.race([leitor.read(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('SSE não entregou '+tipo)),remaining))]);
   if(dado.done)throw Error('stream closed');
   buffer+=dec.decode(dado.value,{stream:true});
   const partes=buffer.split('\n\n');buffer=partes.pop()||'';
   for(const parte of partes){
    const linha=parte.split('\n').find(l=>l.startsWith('data: '));
    if(!linha)continue;
    const evt=JSON.parse(linha.slice(6));
    if(evt.tipo===tipo)return evt;
   }
  }
  throw Error('SSE não entregou '+tipo);
 };
}
test('v29.14.2: luz ambiente escurece igualmente mestre e jogador em Tudo visível',()=>{
 const componente=readFileSync(new URL('../src/multiplayer/AmbienteConvidado2D.tsx',import.meta.url),'utf8');
 assert.match(componente,/const sombra=!individual&&Boolean\(ambiente\.iluminacao\?\.ativa\)/);
 const mestre=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(mestre,/<IluminacaoCena2D ativa=\{configLuz\.ativa\}/);
 const base=readFileSync(new URL('../src/lib/CenaVisual2D.tsx',import.meta.url),'utf8');
 assert.match(base,/const opacidade=\.95\*\(100-/);
});
test('v29.14.1: servidor entrega traço ao mestre; outros convidados não recebem coordenadas antes da republicação',async()=>{
 const s=await criar();const controller=new AbortController();
 try{
  assert.equal((await publicarCena(s)).status,200);
  const stream=await fetch(`${s.base}${s.rota}/eventos?token=${s.mestre.token}&controlador=1`,{signal:controller.signal});
  assert.equal(stream.status,200);const evento=ouvirDados(stream);
  const req={acao:'adicionar',cenaId:'c1',cor:'#abcdef',espessura:5,pontos:[{x:22.33,y:44.55},{x:27,y:48}]};
  const r=await json(s.base,`${s.rota}/desenho`,s.ana.token,req);
  assert.equal(r.status,201);assert.match(r.data.id,/^jogador-[a-f0-9-]+$/);
  const rec=await evento('desenho-jogador');
  assert.equal(rec.acao,'adicionar');assert.equal(rec.traco.id,r.data.id);assert.deepEqual(rec.traco.pontos,req.pontos);
  const quadro=(await json(s.base,`${s.rota}/mesa`,s.bia.token)).data.mesa;
  assert.equal(quadro.ambiente,undefined,'O servidor não revela desenho não validado pelo mestre.');
  const negado=await json(s.base,`${s.rota}/desenho`,s.bia.token,{acao:'remover',cenaId:'c1',id:r.data.id});
  assert.equal(negado.status,403);
  const apagado=await json(s.base,`${s.rota}/desenho`,s.ana.token,{acao:'remover',cenaId:'c1',id:r.data.id});
  assert.equal(apagado.status,200);
  const eventoApagar=await evento('desenho-jogador');assert.equal(eventoApagar.acao,'remover');assert.equal(eventoApagar.id,r.data.id);
 }finally{controller.abort();await s.app.fechar();}
});
test('v29.14.1: valida posição e restringe desenho às cenas autorizadas',async()=>{
 const s=await criar();
 try{
  await publicarCena(s,'restrita');
  const body={acao:'adicionar',cenaId:'c1',pontos:[{x:20,y:30}],cor:'#abcdef',espessura:3};
  assert.equal((await json(s.base,`${s.rota}/desenho`,s.ana.token,body)).status,403);
  await publicarCena(s,'total');
  assert.equal((await json(s.base,`${s.rota}/desenho`,s.ana.token,{...body,pontos:[{x:-3,y:15}]})).status,400);
  assert.equal((await json(s.base,`${s.rota}/desenho`,s.ana.token,{...body,cenaId:'outra'})).status,409);
  assert.equal((await json(s.base,`${s.rota}/desenho`,s.mestre.token,body)).status,403);
  assert.equal((await json(s.base,`${s.rota}/desenho`,null,body)).status,401);
 }finally{await s.app.fechar();}
});
test('v29.14.1: visão individual permite desenhar só ao personagem vinculado sem vazar coordenadas entre jogadores',async()=>{
 const s=await criar();const controller=new AbortController();
 try{
  await publicarCena(s,'individual');
  const body={acao:'adicionar',cenaId:'c1',pontos:[{x:25,y:50},{x:27,y:55}],cor:'#abcdef',espessura:3};
  assert.equal((await json(s.base,`${s.rota}/desenho`,s.ana.token,body)).status,403);
  assert.equal((await json(s.base,`${s.rota}/atribuir`,s.mestre.token,{pessoaId:s.ana.id,personagemId:'p1'})).status,200);
  const stream=await fetch(`${s.base}${s.rota}/eventos?token=${s.mestre.token}&controlador=1`,{signal:controller.signal});
  const evento=ouvirDados(stream);
  assert.equal((await json(s.base,`${s.rota}/desenho`,s.ana.token,body)).status,201);
  assert.equal((await evento('desenho-jogador')).acao,'adicionar');
  const outro=(await json(s.base,`${s.rota}/mesa`,s.bia.token)).data.mesa;
  assert.equal(outro.imagem,null);assert.doesNotMatch(JSON.stringify(outro),/25|55|abcdef|desenho/);
 }finally{controller.abort();await s.app.fechar();}
});
test('v29.14.1: editor da mesa integra pincel e o callback autenticado do mestre',()=>{
 const pub=readFileSync(new URL('../src/multiplayer/PublicadorMesa.tsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const player=readFileSync(new URL('../src/multiplayer/MesaConvidado2D.tsx',import.meta.url),'utf8');
 assert.match(pub,/onDesenhoRemoto|desenho-jogador/);
 assert.match(app,/aplicarDesenhoConvidado/);
 assert.match(player,/onEnviarDesenho/);assert.match(player,/previaDesenho/);
});
