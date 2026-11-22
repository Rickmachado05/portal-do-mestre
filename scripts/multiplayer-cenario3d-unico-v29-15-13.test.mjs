import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const base=(host,codigo)=>`http://127.0.0.1:${host.port}/api/multiplayer/salas/${codigo}`;
const requisitar=async(url,token,method='GET',body=undefined,mime='application/json')=>{
 const resposta=await fetch(url,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}),
   ...(body?{'Content-Type':mime}:{})},...(body?{body:mime==='application/json'?JSON.stringify(body):body}:{})});
 return {status:resposta.status,resposta,resultado:resposta.headers.get('content-type')?.includes('application/json')?await resposta.json():null};
};
const cenario={versao:1,base:'vazia',piso:'pedra',periodoDia:'noite',larguraTerreno:24,profundidadeTerreno:30,
 objetos:[
  {id:'o1',tipo:'mesa',nome:'Mesa publica',x:4,z:2,rotacao:0},
  {id:'o2',tipo:'parede',nome:'Parede secreta',x:6,z:2,rotacao:0,oculto:true},
 ],miniaturas:[
  {id:'inst-publico1',modeloId:'mini-modelo12345',nome:'GLB publico',x:0,z:0,altura:0,escala:1,rotacao:0,personagemId:'heroi'},
  {id:'inst-privado1',modeloId:'mini-modelo12345',nome:'GLB privado',x:6,z:1,altura:0,escala:1,rotacao:0,personagemId:'segredo'},
 ],notasPrivadas:'SENHA-NAO-PUBLICAR'};
const cenaBase={cenaId:'sala1',cenaNome:'Sala 3D',modoMesa:'3d',visibilidade:'total',aspecto:1.4,
 tokens:[{id:'heroi',nome:'Heroi',tipo:'jogador',x:50,y:40,cor:'#5599aa'},
 {id:'segredo',nome:'NPC segredo',tipo:'npc',x:70,y:30,cor:'#ff3311',oculto:true}],
 cenario3D:cenario};
function glbBasico(){
 const texto=JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[]}]});
 const corpo=Buffer.from(texto+' '.repeat((4-texto.length%4)%4));
 const dados=Buffer.alloc(12+8+corpo.length);
 dados.writeUInt32LE(0x46546c67,0);dados.writeUInt32LE(2,4);dados.writeUInt32LE(dados.length,8);
 dados.writeUInt32LE(corpo.length,12);dados.writeUInt32LE(0x4e4f534a,16);corpo.copy(dados,20);return dados;
}

test('v29.15.13: mesma cena visível, mas jamais geometria privada ou modelo não enviado',async()=>{
 const app=criarAplicacaoMultiplayer();const host=await app.escutar(0);
 try{
  const criada=await requisitar(`http://127.0.0.1:${host.port}/api/multiplayer/salas`,null,'POST',{campanha:'Teste3D',campanhaId:'teste3d'});
  assert.equal(criada.status,201);const {codigo,token:chaveMestre}=criada.resultado;
  const rota=base(host,codigo);
  const jogador=await requisitar(`${rota}/entrar`,null,'POST',{apelido:'Jogador'});
  assert.equal(jogador.status,201);const chaveJogador=jogador.resultado.token;
  assert.equal((await requisitar(`${rota}/mesa`,chaveMestre,'POST',cenaBase)).status,200);
  const visao=(await requisitar(`${rota}/mesa`,chaveJogador)).resultado.mesa;
  assert.equal(visao.cenario3D.piso,'pedra');assert.equal(visao.cenario3D.periodoDia,'noite');
  assert.deepEqual(visao.cenario3D.objetos.map(o=>o.id),['o1']);
  assert.deepEqual(visao.cenario3D.miniaturas,[]);
  assert.equal(JSON.stringify(visao).includes('SENHA-NAO-PUBLICAR'),false);
  assert.equal(JSON.stringify(visao).includes('Parede secreta'),false);
  assert.equal((await requisitar(`${rota}/modelos3d/mini-modelo12345`,chaveJogador)).status,404);
  const arquivo=glbBasico();
  const upload=await requisitar(`${rota}/modelos3d/mini-modelo12345`,chaveMestre,'POST',arquivo,'model/gltf-binary');
  assert.equal(upload.status,201);
  assert.equal((await requisitar(`${rota}/modelos3d/mini-modelo12345`,chaveJogador)).status,404,
    'Upload nao concede automaticamente acesso a assets fora da cena publicada.');
  assert.equal((await requisitar(`${rota}/mesa`,chaveMestre,'POST',cenaBase)).status,200);
  const apos=(await requisitar(`${rota}/mesa`,chaveJogador)).resultado.mesa;
  assert.deepEqual(apos.cenario3D.miniaturas.map(m=>m.id),['inst-publico1']);
  const download=await requisitar(`${rota}/modelos3d/mini-modelo12345`,chaveJogador);
  assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.resposta.arrayBuffer()),arquivo);
  assert.notEqual((await requisitar(`${rota}/modelos3d/mini-modelo12345`)).status,200,
    'Sem credencial nao pode baixar miniaturas.');
  assert.equal((await requisitar(`${rota}/mesa`,chaveMestre,'POST',{...cenaBase,visibilidade:'restrita'})).status,200);
  const restrita=(await requisitar(`${rota}/mesa`,chaveJogador)).resultado.mesa;
  assert.equal('cenario3D' in restrita,false);
  assert.equal((await requisitar(`${rota}/modelos3d/mini-modelo12345`,chaveJogador)).status,404);
 }finally{await app.fechar();}
});

test('v29.15.13: o cliente e o mestre importam o mesmo motor de sala, sem controles privados no convidado',()=>{
 const code=readFileSync(new URL('../src/multiplayer/MesaConvidado3D.tsx',import.meta.url),'utf8');
 const master=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
 const server=readFileSync(new URL('./multiplayer-server.mjs',import.meta.url),'utf8');
 assert.match(code,/from '\.\.\/mesa3d\/roomScene'/);assert.match(master,/from '\.\/roomScene'/);
 assert.match(code,/criarSala3D\(/);assert.match(master,/criarSala3D\(/);
 assert.match(code,/ACESFilmicToneMapping/);assert.match(master,/ACESFilmicToneMapping/);
 assert.doesNotMatch(code,/\bcarregarCenario3D\(|\bcarregarMesaCompartilhada\(|\blocalStorage\./);
 assert.match(server,/normalizarCenario3D/);assert.match(server,/cen[aA]rio3D|cenario3D/);
});

test('v29.15.13: pedidos de movimento 3D são validados contra a geometria do mestre',()=>{
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(app,/function moverTokenConvidado/);
 assert.match(app,/if\(MODO_3D\)/);
 assert.match(app,/bloqueiaMovimentoCompartilhado3D\(anterior3D,destino3D/);
 assert.match(app,/posicaoPermitidaNaMesa3D\(destino3D/);
});

test('v29.15.13: piso legado e camada de objetos seguem a publicação pública',()=>{
 const pub=readFileSync(new URL('../src/multiplayer/PublicadorMesa.tsx',import.meta.url),'utf8');
 const proj=readFileSync(new URL('../src/mesa3d/cenarioPublico3D.ts',import.meta.url),'utf8');
 assert.match(pub,/CHAVE_PISO_3D\(cena\.id\)/);
 assert.match(pub,/imagemPublicada/);
 assert.match(pub,/cena\.camadas\?\.objetos!==false/);
 assert.match(proj,/mostrarObjetos\?cenario\.objetos:\[\]/);
});
