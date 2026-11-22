import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
const requisitar=async(url,token,body)=>{
 const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,data:await response.json()};
};
const mascara='0'.repeat(1100)+'2'.repeat(104)+'0'.repeat(1100);
const contornoA=[{x:45,y:45},{x:55,y:45},{x:55,y:55},{x:45,y:55}];
const contornoB=[{x:10,y:10},{x:20,y:10},{x:20,y:20},{x:10,y:20}];
const imagem='data:image/webp;base64,QUFB';

test('v29.15.23: visão individual 3D envia apenas o contorno exato do personagem atribuído',async()=>{
 const server=criarAplicacaoMultiplayer();const {port}=await server.escutar(0);const base=`http://127.0.0.1:${port}/api/multiplayer`;
 try{
  const host=(await requisitar(`${base}/salas`,null,{campanha:'Teste fog',campanhaId:'teste-v231523'})).data;
  const rota=`${base}/salas/${host.codigo}`;
  const ana=(await requisitar(`${rota}/entrar`,null,{apelido:'Ana'})).data;
  const bia=(await requisitar(`${rota}/entrar`,null,{apelido:'Bia'})).data;
  const vista=(id,p)=>({personagemId:id,imagem,idsVisiveis:[id],mascara3D:mascara,poligono3D:p,objetos3DVisiveis:[],miniaturas3DVisiveis:[]});
  const payload={cenaId:'a',cenaNome:'Teste',modoMesa:'3d',visibilidade:'individual',tokens:[
   {id:'a',nome:'Ana',tipo:'jogador',x:50,y:50,cor:'#dedede'},
   {id:'b',nome:'Bia',tipo:'jogador',x:15,y:15,cor:'#dedede'}],
   cenario3D:{base:'vazia',piso:'imagem',mapaUnico:true,objetos:[],miniaturas:[]},vistas:[vista('a',contornoA),vista('b',contornoB)]};
  assert.equal((await requisitar(`${rota}/mesa`,host.token,payload)).status,200);
  await requisitar(`${rota}/atribuir`,host.token,{pessoaId:ana.id,personagemId:'a'});
  await requisitar(`${rota}/atribuir`,host.token,{pessoaId:bia.id,personagemId:'b'});
  const a=(await requisitar(`${rota}/mesa`,ana.token)).data.mesa;
  const b=(await requisitar(`${rota}/mesa`,bia.token)).data.mesa;
  assert.deepEqual(a.poligono3D,contornoA);assert.deepEqual(b.poligono3D,contornoB);
  assert.ok(!JSON.stringify(a).includes('"x":15,"y":15')); // não envia o contorno da outra jogadora
  assert.equal(a.barreiras,undefined);
  // Contornos adulterados são descartados pelo servidor.
  const adulterado={...payload,vistas:[vista('a',[{x:-1,y:50},...contornoA.slice(1)]),vista('b',contornoB)]};
  await requisitar(`${rota}/mesa`,host.token,adulterado);
  const invalido=(await requisitar(`${rota}/mesa`,ana.token)).data.mesa;
  assert.equal(invalido.poligono3D,undefined);
 }finally{await server.fechar();}
});

test('v29.15.23: mesmo compositor do mestre, recorte atômico e transição por quadro',()=>{
 const sala=src('mesa3d/roomScene.ts'),player=src('multiplayer/MesaConvidado3D.tsx');
 const visao=src('multiplayer/visaoIndividualPublicada.ts'),publicador=src('multiplayer/PublicadorMesa.tsx');
 const helper=src('mesa3d/desenharVisaoCompartilhada3D.ts');
 assert.match(sala,/desenharVisaoCompartilhada3D\(ctxVisao,estadosFog/);
 assert.match(sala,/desenharVisaoCompartilhada3D\(contextoFogDepois/);
 assert.match(helper,/destination-out/);
 assert.match(helper,/0\.73/);
 assert.match(player,/await sala\.atualizarPisoRecorte\(blob\)/);
 assert.match(player,/sala\.configurarFogPublicado3D\(quadro\.mascara,quadro\.cenario,quadro\.poligono\)/);
 assert.match(player,/sala\.atualizarTransicaoFogPublicado3D\(tempo\)/);
 assert.match(visao,/const poligono3D=/);
 assert.match(publicador,/modo3D:true/);
 assert.doesNotMatch(player,/import .*barreiras/);
});
