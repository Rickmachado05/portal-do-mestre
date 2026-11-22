import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const root=new URL('../src/mesa3d/',import.meta.url);
const source=name=>readFileSync(new URL(name,root),'utf8');
const compiled=text=>ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=text=>'data:text/javascript;base64,'+Buffer.from(compiled(text)).toString('base64');
const roomUrl=url(source('roomLogic.ts'));
const editor=await import(url(source('editorCena3D.ts').replace("from './roomLogic'",`from '${roomUrl}'`)));
const vazio={versao:1,base:'vazia',objetos:[]};

test('proporção inicial respeita o formato real da planta',()=>{
  assert.deepEqual(editor.dimensoesTerrenoDaPlanta3D(2048,1024),{largura:22,profundidade:11});
  assert.deepEqual(editor.dimensoesTerrenoDaPlanta3D(900,1800),{largura:11,profundidade:22});
  assert.deepEqual(editor.dimensoesTerrenoDaPlanta3D(0,0),{largura:18,profundidade:17});
});
test('terreno maior permite construção próxima da borda e não usa teto antigo',()=>{
  const cena={...vazio,larguraTerreno:44,profundidadeTerreno:32};
  assert.deepEqual(editor.dimensoesTerreno3D(cena),{largura:44,profundidade:32,minX:-22,maxX:22,minZ:-16,maxZ:16});
  const local=editor.alinharNoChao3D(21.7,-15.6,false,.25,cena);
  assert.deepEqual(local,{x:21.7,z:-15.6});
  const obj=editor.novoObjeto3D('porta',local,cena);
  assert.deepEqual({x:obj.x,z:obj.z},local);
});
test('parede editada muda colisão após redimensionar, inclusive rotacionada',()=>{
  const obj={...editor.novoObjeto3D('parede',{x:0,z:0}),comprimento:1};
  assert.equal(editor.tocaObjeto3D({x:3,z:0},obj),false);
  obj.comprimento=8;
  assert.equal(editor.tocaObjeto3D({x:3,z:0},obj),true);
  obj.rotacao=Math.PI/2;
  assert.equal(editor.tocaObjeto3D({x:3,z:0},obj),false);
  assert.equal(editor.tocaObjeto3D({x:0,z:3},obj),true);
});
test('altura, largura, profundidade e terreno persistem sem apagar dados antigos',()=>{
  const original=editor.novoObjeto3D('porta',{x:3,z:2});
  const save=editor.normalizarCenario3D({...vazio,larguraTerreno:42,profundidadeTerreno:20,larguraPlanta:22,profundidadePlanta:11,
    objetos:[{...original,largura:2.5,profundidade:.45,altura:3.9}]});
  assert.equal(save.objetos[0].largura,2.5);
  assert.equal(save.objetos[0].profundidade,.45);
  assert.equal(save.objetos[0].altura,3.9);
  assert.equal(save.larguraTerreno,42);
  assert.equal(save.larguraPlanta,22);
  assert.deepEqual(editor.normalizarCenario3D(vazio),vazio);
});
test('editores do mouse e Delete disponíveis na Visão Mestre, sem câmera de construção',()=>{
  const app=source('Mesa3DPrototipo.tsx'),scene=source('roomScene.ts');
  for(const term of ['alcaAtingida','visualizarEdicaoObjeto','ev.code===\'Delete\'','m3d-selection-hud','dimensoesTerreno3D','larguraTerreno','profundidadeTerreno','apagarObjetoSelecionado'])assert.ok(app.includes(term),term);
  assert.ok(scene.includes('atualizarTerreno'));
  assert.ok(scene.includes('alcas-de-edicao'));
  assert.ok(scene.includes('larguraPlanta'));
  assert.doesNotMatch(app,/cameraConstruir|OrthographicCamera/);
});
