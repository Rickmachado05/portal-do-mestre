import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const ts=require('typescript');
function transpilar(rel,deps={}){
 const arquivo=resolve(root,rel),texto=readFileSync(arquivo,'utf8');
 // TypeScript 7 distribui apenas o compilador nativo; a API antiga
 // transpileModule não existe. Nesse caso, o strip nativo do Node preserva
 // exatamente a implementação sob teste e reescrevemos somente import/export.
 const transpileDisponivel=typeof ts.transpileModule==='function';
 const textoJS=transpileDisponivel?(()=>{
   const compiled=ts.transpileModule(texto,{fileName:arquivo,reportDiagnostics:true,
     compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
   assert.equal(compiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`${rel} sem erros de sintaxe`);
   return compiled.outputText;
 })():stripTypeScriptTypes(texto,{mode:'strip'})
   .replace(/import \{chaoParaPercentual3D\} from '\.\.\/mesa3d\/mesaLivre3D';/,"const {chaoParaPercentual3D}=require('../mesa3d/mesaLivre3D');")
   .replace(/export function /g,'function ')
   + '\nmodule.exports={miniaturasParaVisaoIndividual3D};';
 const modulo={exports:{}};
 new Function('require','module','exports',textoJS)((id)=>{
   if(Object.hasOwn(deps,id))return deps[id];throw new Error(`Import não previsto: ${id}`);
 },modulo,modulo.exports);
 return modulo.exports;
}
test('v29.15.29: GLB segue posição REAL do token na visão individual, e nunca aparece sem ele',()=>{
 const {miniaturasParaVisaoIndividual3D}=transpilar('src/multiplayer/miniaturasVisaoIndividual3D.ts',{
  '../mesa3d/mesaLivre3D':{chaoParaPercentual3D:(p)=>({x:p.x+50,y:p.z+50})},
 });
 const miniaturas=[
  {id:'vinculada',modeloId:'mini-exemplo123',personagemId:'jogador1',x:-30,z:0},
  {id:'solta',modeloId:'mini-exemplo123',x:2,z:4},
  {id:'oculta',modeloId:'mini-exemplo123',oculto:true,x:0,z:0},
  {id:'sem-arquivo',modeloId:'mini-ausente123',x:0,z:0},
 ];
 const modelos=new Set(['mini-exemplo123']);
 const primeira=miniaturasParaVisaoIndividual3D(miniaturas,modelos,{jogador1:{x:12,y:34}},{});
 assert.deepEqual(primeira,[{id:'vinculada',personagemId:'jogador1',x:12,y:34},
   {id:'solta',personagemId:undefined,x:52,y:54}]);
 const segunda=miniaturasParaVisaoIndividual3D(miniaturas,modelos,{jogador1:{x:80,y:70}},{});
 assert.deepEqual(segunda[0],{id:'vinculada',personagemId:'jogador1',x:80,y:70});
 assert.equal(miniaturasParaVisaoIndividual3D(miniaturas,modelos,{jogador1:{x:20,y:30,oculto:true}},{}).length,1);
 assert.equal(miniaturasParaVisaoIndividual3D(miniaturas,modelos,{},{}).length,1);
});
function glbBasico(){
 const text=JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[]}]});
 const body=Buffer.from(text+' '.repeat((4-text.length%4)%4));
 const bytes=Buffer.alloc(20+body.length);
 bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);
 bytes.writeUInt32LE(body.length,12);bytes.writeUInt32LE(0x4e4f534a,16);body.copy(bytes,20);return bytes;
}
test('v29.15.29: servidor rejeita 2 GLBs vinculados ao mesmo personagem, sem bloquear o modelo válido',async()=>{
 const app=criarAplicacaoMultiplayer();const server=await app.escutar(0);
 const base=`http://127.0.0.1:${server.port}/api/multiplayer`;
 const pedir=async(path,{token,method='GET',body,mime='application/json'}={})=>{
   const response=await fetch(`${base}${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),
     ...(body?{'Content-Type':mime}:{})},...(body?{body:mime==='application/json'?JSON.stringify(body):body}:{})});
   return {status:response.status,dados:response.headers.get('content-type')?.includes('json')?await response.json():null};
 };
 try{
   const criado=await pedir('/salas',{method:'POST',body:{campanha:'Testes',campanhaId:'mini-modelos'}});
   assert.equal(criado.status,201);const {codigo,token:master}=criado.dados;
   const baseSala=`/salas/${codigo}`;
   const guest=await pedir(`${baseSala}/entrar`,{method:'POST',body:{apelido:'Teste'}});
   assert.equal(guest.status,201);
   const glb=glbBasico();
   const upload=await pedir(`${baseSala}/modelos3d/mini-exemplo123`,{
      token:master,method:'POST',body:glb,mime:'model/gltf-binary'});
   assert.equal(upload.status,201);
   const link={id:'inst-vinculo111',modeloId:'mini-exemplo123',nome:'Modelo',x:0,z:0,escala:1,rotacao:0,altura:0,personagemId:'morgana'};
   const cena={cenaId:'cena1',cenaNome:'Teste',visibilidade:'total',modoMesa:'3d',aspecto:1.6,
     tokens:[{id:'morgana',nome:'Morgana',tipo:'jogador',x:50,y:50}],
     cenario3D:{base:'vazia',piso:'imagem',objetos:[],miniaturas:[link,{...link,id:'inst-vinculo222',x:10}]}};
   const publicado=await pedir(`${baseSala}/mesa`,{token:master,method:'POST',body:cena});
   assert.equal(publicado.status,200);
   const recebido=await pedir(`${baseSala}/mesa`,{token:guest.dados.token});
   assert.equal(recebido.status,200);
   assert.deepEqual(recebido.dados.mesa.cenario3D.miniaturas.map(m=>m.id),['inst-vinculo111']);
   const arquivo=await pedir(`${baseSala}/modelos3d/mini-exemplo123`,{token:guest.dados.token});
   assert.equal(arquivo.status,200);
 }finally{await app.fechar();}
});
test('v29.15.29: bases antigas não sobrepõem GLB carregado; upload não reinicia na troca de câmera',()=>{
 const room=readFileSync(resolve(root,'src/mesa3d/roomScene.ts'),'utf8');
 const publisher=readFileSync(resolve(root,'src/multiplayer/PublicadorMesa.tsx'),'utf8');
 const player=readFileSync(resolve(root,'src/multiplayer/MesaConvidado3D.tsx'),'utf8');
 assert.match(room,/base\.aro\.visible=visivel;base\.fundo\.visible=visivel/);
 assert.match(room,/atualizarStandeeMiniatura\(\);/);
 assert.match(publisher,/salaDosModelosRef\.current!==cred\.codigo/);
 assert.match(publisher,/miniaturasParaVisaoIndividual3D/);
 assert.match(player,/percentual\.x<1\|\|percentual\.x>99/);
 assert.match(player,/pValido\.x>=1&&pValido\.x<=99/);
});
