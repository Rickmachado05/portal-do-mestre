import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

async function requisitar(base,rota,token,body){
  const r=await fetch(base+rota,{method:body?'POST':'GET',headers:{
    ...(body?{'Content-Type':'application/json'}:{}),
    ...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,valor:await r.json()};
}
const imgA='data:image/webp;base64,YW5h';
const imgB='data:image/webp;base64,Ymlh';
const imgSegredo='data:image/webp;base64,c2VncmV0by1tYXBhLWludGVpcm8=';
const tokens=[
  {id:'ana',tipo:'jogador',nome:'Ana',cor:'#1177aa',x:20,y:50},
  {id:'bia',tipo:'jogador',nome:'Bia',cor:'#aa7733',x:80,y:50},
  {id:'guarda-a',tipo:'npc',nome:'Guarda oeste',cor:'#aabbaa',x:25,y:45,publicado:true},
  {id:'guarda-b',tipo:'inimigo',nome:'Sentinela leste',cor:'#ff6655',x:75,y:45,publicado:true},
  {id:'oculto',tipo:'npc',nome:'Espião',cor:'#ffffff',x:50,y:50,publicado:true,oculto:true},
];
const cena={cenaId:'arena',cenaNome:'Corredor',modoMesa:'2d',visibilidade:'individual',
  aspecto:1.7,imagem:imgSegredo,tokens,grupo:tokens.filter(t=>t.tipo==='jogador'),
  vistas:[{personagemId:'ana',imagem:imgA,idsVisiveis:['ana','guarda-a','oculto']},
    {personagemId:'bia',imagem:imgB,idsVisiveis:['bia','guarda-b']}]
};

test('v29.13: servidor entrega somente a vista e os tokens do personagem atribuído',async()=>{
  const app=criarAplicacaoMultiplayer(),srv=await app.escutar(0);
  const base=`http://127.0.0.1:${srv.port}/api/multiplayer`;
  try{
    const host=(await requisitar(base,'/salas',null,{campanha:'Mesa',campanhaId:'visao-13'})).valor;
    const prefixo=`/salas/${host.codigo}`;
    const ana=(await requisitar(base,`${prefixo}/entrar`,null,{apelido:'Ana'})).valor;
    const bia=(await requisitar(base,`${prefixo}/entrar`,null,{apelido:'Bia'})).valor;
    assert.equal((await requisitar(base,`${prefixo}/mesa`,host.token,cena)).status,200);
    const semPersonagem=(await requisitar(base,`${prefixo}/mesa`,ana.token)).valor.mesa;
    assert.deepEqual(semPersonagem.tokens,[]);assert.equal(semPersonagem.imagem,null);
    assert.equal(Object.hasOwn(semPersonagem,'vistas'),false);
    assert.equal((await requisitar(base,`${prefixo}/atribuir`,host.token,{pessoaId:ana.id,personagemId:'ana'})).status,200);
    assert.equal((await requisitar(base,`${prefixo}/atribuir`,host.token,{pessoaId:bia.id,personagemId:'bia'})).status,200);
    const vA=(await requisitar(base,`${prefixo}/mesa`,ana.token)).valor.mesa;
    const vB=(await requisitar(base,`${prefixo}/mesa`,bia.token)).valor.mesa;
    assert.equal(vA.imagem,imgA);assert.equal(vB.imagem,imgB);
    assert.deepEqual(vA.tokens.map(t=>t.id),['ana','guarda-a']);
    assert.deepEqual(vB.tokens.map(t=>t.id),['bia','guarda-b']);
    assert.equal(Object.hasOwn(vA,'vistas'),false);
    assert.equal(JSON.stringify(vA).includes(imgB),false);
    assert.equal(JSON.stringify(vB).includes(imgA),false);
    assert.equal(JSON.stringify(vA).includes(imgSegredo),false);
    assert.equal(JSON.stringify(vB).includes(imgSegredo),false);
    assert.equal((await requisitar(base,`${prefixo}/mesa`,ana.token,cena)).status,403);
    const hostMesa=(await requisitar(base,`${prefixo}/mesa`,host.token)).valor.mesa;
    assert.equal(Object.hasOwn(hostMesa,'vistas')?hostMesa.vistas:undefined,undefined);
    // Renegociar a atribuição não mantém imagens ou posições de outros convidados.
    assert.equal((await requisitar(base,`${prefixo}/atribuir`,host.token,{pessoaId:ana.id,personagemId:null})).status,200);
    const desvinculada=(await requisitar(base,`${prefixo}/mesa`,ana.token)).valor.mesa;
    assert.deepEqual(desvinculada.tokens,[]);assert.equal(desvinculada.imagem,null);
  }finally{await app.fechar();}
});

test('v29.13: cena sem recorte não publica mapa original nem tokens de outros jogadores',async()=>{
  const app=criarAplicacaoMultiplayer(),srv=await app.escutar(0);
  const base=`http://127.0.0.1:${srv.port}/api/multiplayer`;
  try{
    const host=(await requisitar(base,'/salas',null,{campanha:'Mesa',campanhaId:'visao13-b'})).valor;
    const prefixo=`/salas/${host.codigo}`;
    const ana=(await requisitar(base,`${prefixo}/entrar`,null,{apelido:'Ana'})).valor;
    assert.equal((await requisitar(base,`${prefixo}/mesa`,host.token,{...cena,vistas:[]})).status,200);
    assert.equal((await requisitar(base,`${prefixo}/atribuir`,host.token,{pessoaId:ana.id,personagemId:'ana'})).status,200);
    const semVista=(await requisitar(base,`${prefixo}/mesa`,ana.token)).valor.mesa;
    assert.deepEqual(semVista.tokens,[]);assert.equal(semVista.imagem,null);
    assert.equal((await requisitar(base,`${prefixo}/mesa`,host.token,{...cena,visibilidade:'restrita'})).status,200);
    const restrita=(await requisitar(base,`${prefixo}/mesa`,ana.token)).valor.mesa;
    assert.deepEqual(restrita.tokens.map(t=>t.id),['ana']);
    assert.equal(restrita.imagem,null);
  }finally{await app.fechar();}
});

test('v29.13: imagem da visão é recortada antes da publicação e não por filtro CSS do convidado',()=>{
  const ler=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
  const gerador=ler('src/multiplayer/visaoIndividualPublicada.ts');
  const publica=ler('src/multiplayer/PublicadorMesa.tsx');
  const tela=ler('src/multiplayer/MesaConvidado2D.tsx');
  const servidor=ler('scripts/multiplayer-server.mjs');
  assert.match(gerador,/calcularPoligonoVisao/);
  assert.match(gerador,/ctx\.clip\(\)/);
  assert.match(gerador,/\.toDataURL\(/);
  assert.match(gerador,/pontoDentroDoPoligono/);
  assert.match(publica,/vistas:vistasProntas/);
  assert.match(servidor,/personagemId===pessoa\.personagemId/);
  assert.match(tela,/mesa\?\.visibilidade==='individual'/);
  assert.doesNotMatch(tela,/localStorage|indexedDB|buscarCampanha/);
});

test('v29.13: movimento na visão individual exige atribuição e recorte próprio, com mestre conectado',async()=>{
  const app=criarAplicacaoMultiplayer(),srv=await app.escutar(0);
  const base=`http://127.0.0.1:${srv.port}/api/multiplayer`;
  const abortar=new AbortController();
  try{
    const host=(await requisitar(base,'/salas',null,{campanha:'Arena',campanhaId:'visao13-mov'})).valor;
    const prefixo=`/salas/${host.codigo}`;
    const ana=(await requisitar(base,`${prefixo}/entrar`,null,{apelido:'Ana'})).valor;
    assert.equal((await requisitar(base,`${prefixo}/mesa`,host.token,cena)).status,200);
    const eventos=await fetch(`${base}${prefixo}/eventos?token=${host.token}&controlador=1`,{signal:abortar.signal});
    assert.equal(eventos.status,200);
    assert.equal((await requisitar(base,`${prefixo}/atribuir`,host.token,{pessoaId:ana.id,personagemId:'ana'})).status,200);
    let movimento=await requisitar(base,`${prefixo}/mover`,ana.token,{cenaId:'arena',x:23,y:50,final:true});
    assert.equal(movimento.status,202,'Movimento individual pode ser pedido e é validado pelo mestre');
    assert.equal((await requisitar(base,`${prefixo}/mesa`,host.token,{...cena,vistas:[]})).status,200);
    movimento=await requisitar(base,`${prefixo}/mover`,ana.token,{cenaId:'arena',x:24,y:50,final:true});
    assert.equal(movimento.status,403,'Sem recorte autorizado não há movimento');
  }finally{abortar.abort();await app.fechar();}
});

test('v29.15.19: modo 3D individual é habilitado sem liberar cena restrita',()=>{
  const s=readFileSync(new URL('../src/multiplayer/MesaConvidado2D.tsx',import.meta.url),'utf8');
  const sala=readFileSync(new URL('../src/multiplayer/MesaConvidado3D.tsx',import.meta.url),'utf8');
  assert.match(s,/mesa.visibilidade!=='individual'/);
  assert.match(sala,/mesa\.mascara3D/);
  assert.match(sala,/configurarFogPublicado3D/);
});
