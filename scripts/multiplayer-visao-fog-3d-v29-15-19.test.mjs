import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const codigo=arquivo=>readFileSync(new URL(`../src/${arquivo}`,import.meta.url),'utf8');
const enviar=async(url,token,body)=>{
  const r=await fetch(url,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return {status:r.status,dados:await r.json()};
};
const token=(id,x=45)=>({id,nome:id,tipo:'jogador',x,y:50,cor:'#6688aa'});
const objeto=id=>({id,tipo:'mesa',nome:id,x:0,z:0,rotacao:0});
const mini=(id,modeloId,personagemId)=>({id,modeloId,nome:id,x:0,z:0,personagemId});
const pixels=(centro='2')=>'0'.repeat(1152)+centro+'0'.repeat(1151);
const glb=()=>{
  const buf=Buffer.alloc(36);buf.writeUInt32LE(0x46546c67,0);buf.writeUInt32LE(2,4);buf.writeUInt32LE(36,8);
  buf.writeUInt32LE(16,12);buf.writeUInt32LE(0x4e4f534a,16);buf.write('{}'.padEnd(16,' '),20);return buf;
};

test('v29.15.19: servidor não publica mapa, geometria ou miniatura fora da visão de cada jogador',async()=>{
 const app=criarAplicacaoMultiplayer(),{port}=await app.escutar(0);
 const base=`http://127.0.0.1:${port}/api/multiplayer`;
 try{
  const mestre=(await enviar(`${base}/salas`,null,{campanha:'Visão 3D',campanhaId:'teste-fog-3d'})).dados;
  const rota=`${base}/salas/${mestre.codigo}`;
  const a=(await enviar(`${rota}/entrar`,null,{apelido:'Jogador A'})).dados;
  const b=(await enviar(`${rota}/entrar`,null,{apelido:'Jogador B'})).dados;
  const modeloA='mini-aaaaaa',modeloB='mini-bbbbbb';
  for(const id of [modeloA,modeloB]){
    const r=await fetch(`${rota}/modelos3d/${id}`,{method:'POST',headers:{Authorization:`Bearer ${mestre.token}`,'Content-Type':'model/gltf-binary'},body:glb()});
    assert.equal(r.status,201);
  }
  const cenario={base:'vazia',piso:'imagem',mapaUnico:true,larguraTerreno:22,profundidadeTerreno:17,
    objetos:[objeto('visivel-a'),objeto('secreto-b')],miniaturas:[mini('inst-aaaaaa',modeloA),mini('inst-bbbbbb',modeloB)]};
  const sala={cenaId:'arena-3d',cenaNome:'Arena privada',modoMesa:'3d',visibilidade:'individual',
    imagem:'data:image/png;base64,QUJD',tokens:[token('ana'),token('bia',73)],barreiras:['GEOMETRIA_PRIVADA'],
    cenario3D:cenario,vistas:[
      {personagemId:'ana',imagem:'data:image/png;base64,QUFB',idsVisiveis:['ana'],mascara3D:pixels(),
        objetos3DVisiveis:['visivel-a'],miniaturas3DVisiveis:['inst-aaaaaa']},
      {personagemId:'bia',imagem:'data:image/png;base64,QkJC',idsVisiveis:['bia'],mascara3D:pixels('1'),
        objetos3DVisiveis:['secreto-b'],miniaturas3DVisiveis:['inst-bbbbbb']} ]};
  assert.equal((await enviar(`${rota}/mesa`,mestre.token,sala)).status,200);
  assert.equal((await enviar(`${rota}/atribuir`,mestre.token,{pessoaId:a.id,personagemId:'ana'})).status,200);
  assert.equal((await enviar(`${rota}/atribuir`,mestre.token,{pessoaId:b.id,personagemId:'bia'})).status,200);
  const visA=(await enviar(`${rota}/mesa`,a.token)).dados.mesa;
  const visB=(await enviar(`${rota}/mesa`,b.token)).dados.mesa;
  assert.equal(visA.imagem,'data:image/png;base64,QUFB');
  assert.equal(visB.imagem,'data:image/png;base64,QkJC');
  assert.equal(visA.mascara3D,pixels());assert.equal(visB.mascara3D,pixels('1'));
  assert.deepEqual(visA.tokens.map(t=>t.id),['ana']);assert.deepEqual(visB.tokens.map(t=>t.id),['bia']);
  assert.deepEqual(visA.cenario3D.objetos.map(o=>o.id),['visivel-a']);
  assert.deepEqual(visB.cenario3D.objetos.map(o=>o.id),['secreto-b']);
  assert.deepEqual(visA.cenario3D.miniaturas.map(o=>o.modeloId),[modeloA]);
  assert.deepEqual(visB.cenario3D.miniaturas.map(o=>o.modeloId),[modeloB]);
  assert.equal(visA.cenario3D.base,'vazia');
  assert.equal(visA.barreiras,undefined);assert.equal(visB.barreiras,undefined);
  assert.doesNotMatch(JSON.stringify(visA),/secreto-b|GEOMETRIA_PRIVADA|mini-bbbbbb|QkJC/);
  assert.doesNotMatch(JSON.stringify(visB),/visivel-a|GEOMETRIA_PRIVADA|mini-aaaaaa|QUFB/);
  assert.equal((await fetch(`${rota}/modelos3d/${modeloA}`,{headers:{Authorization:`Bearer ${a.token}`}})).status,200);
  assert.equal((await fetch(`${rota}/modelos3d/${modeloB}`,{headers:{Authorization:`Bearer ${a.token}`}})).status,404);
  assert.equal((await fetch(`${rota}/modelos3d/${modeloA}`,{headers:{Authorization:`Bearer ${b.token}`}})).status,404);
  assert.equal((await fetch(`${rota}/modelos3d/${modeloB}`,{headers:{Authorization:`Bearer ${b.token}`}})).status,200);
  // O servidor não aceita nem quadros incompletos nem listas fora do catálogo.
  assert.equal((await enviar(`${rota}/mesa`,mestre.token,{...sala,vistas:[{...sala.vistas[0],mascara3D:'2'}]})).status,200);
  const semMascara=(await enviar(`${rota}/mesa`,a.token)).dados.mesa;
  assert.equal(semMascara.cenario3D,undefined);assert.equal(semMascara.mascara3D,undefined);
  assert.equal((await enviar(`${rota}/mesa`,mestre.token,{...sala,visibilidade:'restrita'})).status,200);
  const restrita=(await enviar(`${rota}/mesa`,a.token)).dados.mesa;
  assert.equal(restrita.cenario3D,undefined);assert.equal(restrita.imagem,null);
  assert.equal((await fetch(`${rota}/modelos3d/${modeloA}`,{headers:{Authorization:`Bearer ${a.token}`}})).status,404);
 }finally{await app.fechar();}
});

test('v29.15.19: cliente utiliza o mesmo motor e recorte individual sem reconstruir paredes privadas',()=>{
 const sala=codigo('mesa3d/roomScene.ts'),jogador=codigo('multiplayer/MesaConvidado3D.tsx');
 const publicador=codigo('multiplayer/PublicadorMesa.tsx'),vista=codigo('multiplayer/visaoIndividualPublicada.ts');
 assert.match(sala,/configurarFogPublicado3D/);
 assert.match(sala,/referenciaTokens3D/);
 assert.match(jogador,/criarSala3D/);
 assert.match(jogador,/configurarFogPublicado3D/);
 assert.match(publicador,/objetos3D,miniaturas3D/);
 assert.match(vista,/mapaEstadosFog/);
 assert.match(vista,/mascara3D/);
 assert.doesNotMatch(jogador,/import.*barreiras/);
});
