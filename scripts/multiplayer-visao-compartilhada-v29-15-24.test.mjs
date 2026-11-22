import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const fonte=(p)=>readFileSync(new URL(`../src/${p}`,import.meta.url),'utf8');
const req=async(base,path,token,body)=>{
 const response=await fetch(`${base}${path}`,{method:body===undefined?'GET':'POST',
  headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body===undefined?{}:{'Content-Type':'application/json'})},
  ...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,data:await response.json()};
};
const imagem='data:image/webp;base64,QUFB';
const mascara='0'.repeat(2304);
const poligonoA=[{x:33,y:42},{x:45,y:42},{x:45,y:58},{x:33,y:58}];
const poligonoB=[{x:66,y:42},{x:78,y:42},{x:78,y:58},{x:66,y:58}];
const tokens=[{id:'a',tipo:'jogador',nome:'A',x:39,y:50,cor:'#dedede'},
 {id:'b',tipo:'jogador',nome:'B',x:72,y:50,cor:'#dddddd'}];
const cena3D={versao:1,base:'vazia',piso:'imagem',mapaUnico:true,
 objetos:[{id:'obj-vestigio-a',tipo:'caixa',nome:'Visível A',x:-5,z:0,rotacao:0},
          {id:'obj-vestigio-b',tipo:'caixa',nome:'Visível B',x:5,z:0,rotacao:0}],miniaturas:[]};
const vista=(id,poligono,obj)=>({personagemId:id,imagem,mascara3D:mascara,poligono3D:poligono,
 idsVisiveis:[id],objetos3DVisiveis:[obj],miniaturas3DVisiveis:[]});

test('v29.15.24: mestre na 2D publica 3D seguro e convidado conserva visão individual',async()=>{
 const server=criarAplicacaoMultiplayer();const {port}=await server.escutar(0);
 const base=`http://127.0.0.1:${port}/api/multiplayer`;
 try{
  const host=(await req(base,'/salas',null,{campanha:'V24',campanhaId:'v24'})).data;
  const path=`/salas/${host.codigo}`;
  const jA=(await req(base,`${path}/entrar`,null,{apelido:'Ana'})).data;
  const jB=(await req(base,`${path}/entrar`,null,{apelido:'Bia'})).data;
  const payload={cenaId:'cena-v24',cenaNome:'Arena',modoMesa:'2d',visibilidade:'individual',
   tokens,cenaPrivada:'não enviar',cenario3D:cena3D,
   vistas:[vista('a',poligonoA,'obj-vestigio-a'),vista('b',poligonoB,'obj-vestigio-b')]};
  assert.equal((await req(base,`${path}/mesa`,host.token,payload)).status,200);
  await req(base,`${path}/atribuir`,host.token,{pessoaId:jA.id,personagemId:'a'});
  await req(base,`${path}/atribuir`,host.token,{pessoaId:jB.id,personagemId:'b'});
  const ra=await req(base,`${path}/mesa`,jA.token);
  const rb=await req(base,`${path}/mesa`,jB.token);
  const a=ra.data.mesa;
  const b=rb.data.mesa;
  assert.equal(a.modoMesa,'2d');
  assert.ok(a.cenario3D,'cena 3D autorizada, embora o mestre esteja na 2D');
  assert.deepEqual(a.poligono3D,poligonoA);assert.deepEqual(b.poligono3D,poligonoB);
  assert.deepEqual(a.tokens.map(t=>t.id),['a']);assert.deepEqual(b.tokens.map(t=>t.id),['b']);
  assert.deepEqual(a.cenario3D.objetos.map(o=>o.id),['obj-vestigio-a']);
  assert.deepEqual(b.cenario3D.objetos.map(o=>o.id),['obj-vestigio-b']);
  assert.equal(a.barreiras,undefined);assert.equal(a.cenaPrivada,undefined);
  assert.equal((await req(base,`${path}/mesa`,jA.token,{...payload,modoMesa:'3d'})).status,403);
  assert.equal((await req(base,`${path}/mesa`,host.token,{...payload,modoMesa:'3d'})).status,200);
  const atualizado=(await req(base,`${path}/mesa`,jA.token)).data.mesa;
  assert.ok(atualizado.cenario3D);assert.deepEqual(atualizado.poligono3D,poligonoA);
  assert.equal((await req(base,`${path}/mesa`,host.token,{...payload,visibilidade:'restrita'})).status,200);
  const restrito=(await req(base,`${path}/mesa`,jA.token)).data.mesa;
  assert.equal(restrito.cenario3D,undefined);assert.equal(restrito.imagem,null);
 }finally{await server.fechar();}
});

test('v29.15.24: mesmo compositor no mestre 2D, mestre 3D, jogador 2D e jogador 3D',()=>{
 const pub=fonte('multiplayer/PublicadorMesa.tsx'),guest=fonte('multiplayer/MesaConvidado2D.tsx'),app=fonte('App.tsx');
 const scene=fonte('mesa3d/roomScene.ts'),mask=fonte('lib/MascaraVisaoCanvas.tsx');
 assert.match(app,/import MascaraVisaoCanvas/);assert.match(app,/<MascaraVisaoCanvas/);
 assert.match(mask,/desenharVisaoCompartilhada3D\(ctx/);
 assert.match(scene,/desenharVisaoCompartilhada3D\(ctxVisao/);
 assert.match(scene,/const dimensoes=referenciaTokens3D\(cenario\)/);
 assert.match(pub,/dimensoesVisao3D:.*referenciaTokens3D/);
 assert.match(guest,/<MascaraVisaoConvidado2D/);
 assert.match(guest,/disabled=\{!mesa\?\.cenario3D/);
 assert.match(guest,/\[mesa\?\.cenaId\]/);
 assert.doesNotMatch(guest,/disabled=\{!mesa\|\|modoMestre!=='3d'/);
 assert.match(pub,/if\(!modoVisao\)return;/);
});
