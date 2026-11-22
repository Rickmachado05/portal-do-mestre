import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
import {registrarPosicao,amostrarPosicao,ATRASO_VISUAL_MS} from '../src/multiplayer/interpolacaoRemota.mjs';

const ler=(arquivo)=>readFileSync(new URL(`../${arquivo}`,import.meta.url),'utf8');
const aguardar=(ms)=>new Promise(r=>setTimeout(r,ms));
async function ate(fn,limite=2000){const inicio=Date.now();while(Date.now()-inicio<limite){if(fn())return;await aguardar(15);}assert.fail('SSE não chegou');}
async function escutar(url){const cancelador=new AbortController(),eventos=[];const resposta=await fetch(url,{signal:cancelador.signal});assert.equal(resposta.status,200);
 const leitor=resposta.body.getReader(),decoder=new TextDecoder();
 void (async()=>{let buffer='';try{while(true){const {value,done}=await leitor.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let idx;while((idx=buffer.indexOf('\n\n'))>=0){const linha=buffer.slice(0,idx);buffer=buffer.slice(idx+2);if(linha.startsWith('data: ')){try{eventos.push(JSON.parse(linha.slice(6)));}catch{}}}}}catch{}})();
 return {eventos,fechar:()=>cancelador.abort()};
}

test('v29.15.14: mestre transmite o arrasto 3D ao convidado sem alterar a posição persistida',async()=>{
 const app=criarAplicacaoMultiplayer(),host=await app.escutar(0),raiz=`http://127.0.0.1:${host.port}/api/multiplayer`;
 let ouvinte=null;
 async function req(rota,token,corpo){const resp=await fetch(raiz+rota,{method:corpo?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(corpo?{'Content-Type':'application/json'}:{})},...(corpo?{body:JSON.stringify(corpo)}:{})});return {status:resp.status,dados:await resp.json()};}
 try{
  const sala=(await req('/salas',null,{campanhaId:'ajuste-3d',campanha:'Teste'})).dados,rota=`/salas/${sala.codigo}`;
  const convidado=(await req(`${rota}/entrar`,null,{apelido:'Convidado'})).dados;
  const mesa={cenaId:'arena',cenaNome:'Arena',modoMesa:'3d',visibilidade:'total',revisao:100,tokens:[{id:'morgana',nome:'Morgana',tipo:'jogador',x:25,y:30,cor:'#aabbcc'}]};
  assert.equal((await req(`${rota}/mesa`,sala.token,mesa)).status,200);
  ouvinte=await escutar(`${raiz}${rota}/eventos?token=${convidado.token}`);
  assert.equal((await req(`${rota}/previa-3d`,sala.token,{cenaId:'arena',id:'morgana',x:35,y:45,final:false})).status,200);
  await ate(()=>ouvinte.eventos.some(e=>e.tipo==='arrasto-token'));
  const evento=ouvinte.eventos.find(e=>e.tipo==='arrasto-token');
  assert.deepEqual({id:evento.id,x:evento.x,y:evento.y,final:evento.final},{id:'morgana',x:35,y:45,final:false});
  assert.equal((await req(`${rota}/mesa`,convidado.token)).dados.mesa.tokens[0].x,25,'a posição persistente deve permanecer inalterada');
  assert.equal((await req(`${rota}/previa-3d`,convidado.token,{cenaId:'arena',id:'morgana',x:60,y:60,final:true})).status,403);
  assert.equal((await req(`${rota}/previa-3d`,sala.token,{cenaId:'arena',id:'oculto',x:60,y:60,final:true})).status,400);
  assert.equal((await req(`${rota}/previa-3d`,sala.token,{cenaId:'outra',id:'morgana',x:60,y:60,final:true})).status,409);
  await aguardar(20);
  assert.equal((await req(`${rota}/previa-3d`,sala.token,{cenaId:'arena',id:'morgana',x:38,y:49,final:true})).status,200);
  await ate(()=>ouvinte.eventos.filter(e=>e.tipo==='arrasto-token').length>1);
  const fim=ouvinte.eventos.filter(e=>e.tipo==='arrasto-token').at(-1);
  assert.equal(fim.final,true);assert(fim.sequencia>evento.sequencia);
  assert.equal((await req(`${rota}/mesa`,sala.token,{...mesa,revisao:101,visibilidade:'restrita'})).status,200);
  assert.equal((await req(`${rota}/previa-3d`,sala.token,{cenaId:'arena',id:'morgana',x:39,y:52,final:false})).status,409);
 }finally{ouvinte?.fechar();await app.fechar();}
});

test('v29.15.14: interpolação curta desenha posições intermediárias no 3D em vez de teleporte',()=>{
 const inicio=[{x:10,y:20,t:1000}],amostras=registrarPosicao(inicio,15,25,1018);
 const amostra=amostrarPosicao(amostras,1027,ATRASO_VISUAL_MS);
 assert(amostra.x>10&&amostra.x<15,'deve haver quadros intermediários durante o arrasto');
 assert.equal(amostra.y,amostra.x+10);
 const visualizador=ler('src/multiplayer/MesaConvidado3D.tsx');
 assert.match(visualizador,/assinarArrasto\(dados\.cenaId,token\.id,receberArrasto\)/);
 assert.match(visualizador,/amostrarPosicao\(estado\.amostras,performance\.now\(\),ATRASO_VISUAL_MS\)/);
 assert.match(visualizador,/sala\.visualizarToken\(id,ponto\.x,ponto\.z\)/);
 const mestre=ler('src/mesa3d/Mesa3DPrototipo.tsx');
 assert.match(mestre,/enviarPreviaToken\(tokenArrastado,ponto\)/);
 assert.match(mestre,/enviarPreviaToken\(tokenArrastado,previewToken,true\)/);
});

test('v29.15.14: câmeras do jogador usam as mesmas classes do mestre, sem ferramentas de edição',()=>{
 const pai=ler('src/multiplayer/MesaConvidado2D.tsx'),css=ler('src/mesa3d/mesaEspelhada.css'),visualizador=ler('src/multiplayer/MesaConvidado3D.tsx');
 for(const rotulo of ['Visão de Mesa','Terceira Pessoa','Personagem','Tática'])assert(pai.includes(rotulo),rotulo);
 assert.match(pai,/className="hx-camera-mesa3d"/);assert.match(css,/:is\(\.mesa-app-3d,\.pm-jogo--modo3d\)/);
 assert.match(pai,/disabled=\{!meuPersonagem\|\|!podeMover\}/);
 assert.match(pai,/disabled=\{!meuPersonagem\}/);
 assert.match(visualizador,/calcularEnquadramentoCinematico/);
 assert.match(visualizador,/teclas\.has\('w'\)/);assert.match(visualizador,/podeMoverRef\.current/);
 assert.doesNotMatch(visualizador,/\bcarregarCampanha\(|localStorage\./);
});

test('v29.15.14: as cinzas do motor comum deixam de ter textura/tamanho de neve',()=>{
 const clima=ler('src/mesa3d/climaCena3D.ts');
 assert.match(clima,/if \(tipo === 'cinzas'\)/);
 assert.match(clima,/config\.tipo==='cinzas'\?\.21/);
 assert.match(clima,/config\.tipo==='cinzas'\?\.88/);
 assert.match(clima,/materialPontos\.color\.set\(config\.tipo==='cinzas'/);
});
