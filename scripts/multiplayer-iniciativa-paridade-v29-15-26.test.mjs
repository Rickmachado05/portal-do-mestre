import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const ler=(nome)=>readFileSync(new URL(`../src/${nome}`,import.meta.url),'utf8');
async function chamar(url, token, body){
 const res=await fetch(url,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:res.status,valor:await res.json()};
}
test('v29.15.26: ordem de turnos replica a estrutura visual do mestre sem ações administrativas',()=>{
 const componente=ler('multiplayer/CombateConvidado.tsx');
 const mestre=ler('App.tsx');
 for(const classe of ['janela-linha-acoes','mini-titulo','lista-iniciativa','linha-iniciativa','ini-selecionar','iniciativa-retrato','ordem-num','acoes-turnos','iniciativa-adicionar-cabecalho']){
  assert.match(mestre,new RegExp(classe));assert.match(componente,new RegExp(classe));
 }
 assert.match(componente,/somente leitura/);
 assert.match(componente,/combate\?\.valores\?\.\[id\]/);
 assert.doesNotMatch(componente,/onClick=|onChange=|atualizarUnidade|proximoTurno|encerrarCombate|rolarIniciativa/);
});
test('v29.15.26: painel de iniciativa existe sobre o canvas 3D e acompanha redimensionamento das duas janelas',()=>{
 const codigo=ler('multiplayer/MesaConvidado2D.tsx');
 const css=ler('multiplayer/CombateConvidado.css');
 assert.match(codigo,/createPortal\(/);
 assert.match(codigo,/pm-jogo-overlay-portal/);
 assert.match(codigo,/window\.addEventListener\('resize',atualizar\)/);
 assert.match(codigo,/posicaoJanelaVisivel\(id,janela\.posicao\)/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/pointer-events:auto/);
 assert.match(css,/z-index:9999!important/);
});
test('v29.15.26: números privados de iniciativa nunca atravessam a visão individual ou a cena restrita',async()=>{
 const server=criarAplicacaoMultiplayer();const {port}=await server.escutar(0);
 try{
  const base=`http://127.0.0.1:${port}/api/multiplayer/salas`;
  const host=(await chamar(base,null,{campanha:'Iniciativa',campanhaId:'ini-responsiva'})).valor;
  const sala=`${base}/${host.codigo}`;
  const a=(await chamar(`${sala}/entrar`,null,{apelido:'Ana'})).valor;
  const b=(await chamar(`${sala}/entrar`,null,{apelido:'Bia'})).valor;
  const t=(id,tipo='jogador')=>({id,nome:id,tipo,x:48,y:46,cor:'#aabbcc',...(tipo==='npc'?{publicado:true}:{})});
  const cena={cenaId:'arena',cenaNome:'Arena',visibilidade:'individual',modoMesa:'3d',
    tokens:[t('ana'),t('bia'),t('monstro','npc'),t('secreto','npc')],
    vistas:[{personagemId:'ana',imagem:'data:image/webp;base64,AAAA',idsVisiveis:['monstro']},
      {personagemId:'bia',imagem:'data:image/webp;base64,BBBB',idsVisiveis:[]}],
    combate:{ativo:true,rodada:3,turnoId:'monstro',ordem:['monstro','ana','bia','secreto'],
      valores:{monstro:22,ana:18,bia:7,secreto:999,chefePrivado:666}}};
  assert.equal((await chamar(`${sala}/mesa`,host.token,cena)).status,200);
  await chamar(`${sala}/atribuir`,host.token,{pessoaId:a.id,personagemId:'ana'});
  await chamar(`${sala}/atribuir`,host.token,{pessoaId:b.id,personagemId:'bia'});
  const va=(await chamar(`${sala}/mesa`,a.token)).valor.mesa;
  const vb=(await chamar(`${sala}/mesa`,b.token)).valor.mesa;
  assert.deepEqual(va.combate.valores,{monstro:22,ana:18});
  assert.deepEqual(vb.combate.valores,{bia:7});
  assert.equal(vb.combate.turnoId,null);
  assert.doesNotMatch(JSON.stringify(vb),/monstro|secreto|chefePrivado|999|666/);
  const cv=(await chamar(`${sala}/mesa`,host.token,{...cena,visibilidade:'total'}));
  assert.equal(cv.status,200);
  const total=(await chamar(`${sala}/mesa`,a.token)).valor.mesa;
  assert.equal(total.combate.valores.ana,18);
  assert.equal(total.combate.valores.chefePrivado,undefined);
  await chamar(`${sala}/mesa`,host.token,{...cena,visibilidade:'restrita'});
  const privado=(await chamar(`${sala}/mesa`,a.token)).valor.mesa;
  assert.deepEqual(privado.combate.valores,{});
 }finally{await server.fechar();}
});
