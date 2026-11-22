import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const ler=arquivo=>readFileSync(new URL(`../src/${arquivo}`,import.meta.url),'utf8');
const fetchJson=async(url,token,corpo)=>{
 const res=await fetch(url,{method:corpo?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(corpo?{'Content-Type':'application/json'}:{})},...(corpo?{body:JSON.stringify(corpo)}:{})});
 return {status:res.status,dados:await res.json()};
};

test('v29.15.12: mestre e jogador importam a mesma base visual, conservando controles distintos',()=>{
 const master=ler('App.tsx'),player=ler('multiplayer/MesaConvidado2D.tsx');
 const token=ler('multiplayer/TokenConvidadoFluido.tsx');
 const luz=ler('multiplayer/AmbienteConvidado2D.tsx'),shared=ler('lib/CenaVisual2D.tsx');
 assert.match(master,/<FundoCena2D imagem=/);assert.match(player,/<FundoCena2D imagem=/);
 assert.match(master,/<CorpoTokenCena2D/);assert.match(token,/<CorpoTokenCena2D/);
 assert.match(master,/<IluminacaoCena2D/);assert.match(luz,/<IluminacaoCena2D/);
 assert.match(shared,/const opacidade=\.95\*\(100-/);
 assert.match(master,/token-transform-box/);assert.doesNotMatch(token,/token-transform-box/);
 assert.match(player,/podeMover/);assert.match(master,/barreiras-svg/);
 const css=ler('lib/CenaVisual2D.css');
 assert.match(css,/\.pm-cena2d-fundo/);assert.match(css,/\.pm-cena2d-vinheta/);
 assert.match(css,/\.pm-cena2d-iluminacao/);
 assert.match(css,/\.mapa-palco\.pm-cena2d-palco/);
 assert.match(css,/\.pm-jogo-palco\.pm-cena2d-palco/);
});

test('v29.15.12: silhuetas de luz publicas validas passam; bloqueios e dados ocultos nao passam',async()=>{
 const app=criarAplicacaoMultiplayer();const {port}=await app.escutar(0);
 const base=`http://127.0.0.1:${port}/api/multiplayer`;
 try{
  const mestre=(await fetchJson(`${base}/salas`,null,{campanha:'Teste paridade',campanhaId:'unificado-v29-15-12'})).dados;
  const rota=`${base}/salas/${mestre.codigo}`;
  const convidado=(await fetchJson(`${rota}/entrar`,null,{apelido:'Convidado'})).dados;
  const luz={x:35,y:60,alcance:18,ativa:true,cor:'#f1bb78',pontos:[{x:22,y:40},{x:58,y:40},{x:58,y:80},{x:22,y:80}],barreiras:['SEGREDO']};
  const ambiente={clima:{tipo:'chuva'},iluminacao:{ativa:true,ambiente:65},luzes:[luz],desenhos:[],marcadores:[]};
  const baseCena={cenaId:'arena',cenaNome:'Arena',visibilidade:'total',imagem:null,tokens:[],ambiente,barreiras:['SEGREDO']};
  assert.equal((await fetchJson(`${rota}/mesa`,mestre.token,baseCena)).status,200);
  const publico=(await fetchJson(`${rota}/mesa`,convidado.token)).dados.mesa;
  assert.deepEqual(publico.ambiente.luzes[0].pontos,luz.pontos);
  assert.equal(publico.ambiente.luzes[0].barreiras,undefined);
  assert.equal(publico.barreiras,undefined);
  assert.equal(publico.ambiente.iluminacao.ambiente,65);
  const invalida={...luz,pontos:[{x:22,y:44},{x:101,y:40},{x:15,y:20}]};
  assert.equal((await fetchJson(`${rota}/mesa`,mestre.token,{...baseCena,ambiente:{...ambiente,luzes:[invalida]}})).status,200);
  const saneada=(await fetchJson(`${rota}/mesa`,convidado.token)).dados.mesa;
  assert.equal(saneada.ambiente.luzes[0].pontos,undefined);
  assert.equal((await fetchJson(`${rota}/mesa`,mestre.token,{...baseCena,visibilidade:'individual'})).status,200);
  const individual=(await fetchJson(`${rota}/mesa`,convidado.token)).dados.mesa;
  assert.deepEqual(individual.ambiente,{clima:publico.ambiente.clima});
  assert.equal((await fetchJson(`${rota}/mesa`,mestre.token,{...baseCena,visibilidade:'restrita'})).status,200);
  const restrita=(await fetchJson(`${rota}/mesa`,convidado.token)).dados.mesa;
  assert.equal(restrita.ambiente,undefined);
 }finally{await app.fechar();}
});
