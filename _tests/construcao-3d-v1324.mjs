import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const root=new URL('../src/mesa3d/',import.meta.url);
const code=(name)=>readFileSync(new URL(name,root),'utf8');
const transpile=(src)=>ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const data=(src)=>'data:text/javascript;base64,'+Buffer.from(transpile(src)).toString('base64');
const roomUrl=data(code('roomLogic.ts'));
const editor=await import(data(code('editorCena3D.ts').replace("from './roomLogic'",`from '${roomUrl}'`)));
const helper=await import(data(code('pisoConstruicao3D.ts')));

test('cenários existentes continuam válidos e têm valores padrão implícitos',()=>{
  assert.deepEqual(editor.normalizarCenario3D(null),{versao:1,base:'arquivos',objetos:[]});
  const antigo={versao:1,base:'vazia',objetos:[]};
  assert.deepEqual(editor.normalizarCenario3D(antigo),antigo);
});
test('piso e opções de encaixe são normalizados sem confiar em backups inválidos',()=>{
  const c=editor.normalizarCenario3D({versao:1,base:'vazia',objetos:[],piso:'pedra',mostrarGrade:false,encaixarGrade:false,passoGrade:.25});
  assert.equal(c.piso,'pedra');assert.equal(c.mostrarGrade,false);assert.equal(c.encaixarGrade,false);assert.equal(c.passoGrade,.25);
  const outro=editor.normalizarCenario3D({...c,piso:'javascript:',passoGrade:-10});
  assert.equal(outro.piso,undefined);assert.equal(outro.passoGrade,undefined);
});
test('alinhamento de objetos funciona na grade e sem grade',()=>{
  assert.deepEqual(editor.alinharNoChao3D(1.31,-2.37,true,.5),{x:1.5,z:-2.5});
  assert.deepEqual(editor.alinharNoChao3D(1.31,-2.37,false,.5),{x:1.31,z:-2.37});
  assert.deepEqual(editor.alinharNoChao3D(50,-50,true,1),{x:8.94,z:-8.44});
});
test('paredes de comprimento variável são salvas e continuam bloqueando passagem',()=>{
  const p=editor.novoObjeto3D('parede',{x:0,z:0});p.comprimento=8;
  const cena=editor.normalizarCenario3D({versao:1,base:'vazia',objetos:[p]});
  assert.equal(cena.objetos[0].comprimento,8);
  assert.equal(editor.tocaObjeto3D({x:3.4,z:.1},cena.objetos[0]),true);
  assert.equal(editor.tocaObjeto3D({x:4.9,z:.1},cena.objetos[0]),false);
  assert.ok(code('Mesa3DPrototipo.tsx').includes('origemParede'));
  assert.ok(code('roomScene.ts').includes('medidasObjeto3D(o)'));
});
test('imagem do piso é independente por cena e preserva proporção antes de importar',()=>{
  assert.notEqual(helper.CHAVE_PISO_3D('cena-a'),helper.CHAVE_PISO_3D('cena-b'));
  assert.deepEqual(helper.dimensoesImagemPiso3D(2000,1000,'conter',1000,1000),{x:0,y:250,largura:1000,altura:500});
  assert.deepEqual(helper.dimensoesImagemPiso3D(2000,1000,'cobrir',1000,1000),{x:-500,y:0,largura:2000,altura:1000});
  assert.throws(()=>helper.dimensoesImagemPiso3D(0,1000));
});
test('interface oferece construção na câmera mestre e mantém mapa importado',()=>{
  const app=code('Mesa3DPrototipo.tsx'),room=code('roomScene.ts');
  for(const text of ['cameraMestre','modoMestreRef.current?cameraMestre:camera','prepararImagemPiso3D','salvarArquivo','carregarArquivo','excluirArquivo','VISÃO MESTRE · EDIÇÃO DE CENÁRIO','Terreno 3D','Encaixar objetos','setFerramenta','visualizarObjeto','moverNoCenario3D','direcaoCamera','skinAtiva'])assert.ok(app.includes(text),text);
  assert.doesNotMatch(app,/OrthographicCamera|cameraConstruir/);
  assert.ok(room.includes('atualizarGrade'));
  assert.ok(room.includes('aplicarPiso'));
  assert.ok(room.includes('configurarConstrucao'));
  assert.doesNotMatch(app,/localStorage\.setItem\(chaveEstadoCampanha/);
});
test('importação rejeita arquivos não suportados antes de decodificar',async()=>{
  await assert.rejects(helper.prepararImagemPiso3D({type:'image/svg+xml',size:500}));
  await assert.rejects(helper.prepararImagemPiso3D({type:'image/png',size:helper.MAX_ARQUIVO_PISO_3D+1}));
});
test('typescript dos arquivos de construção não possui erro de sintaxe',()=>{
  for(const file of ['editorCena3D.ts','roomScene.ts','Mesa3DPrototipo.tsx','pisoConstruicao3D.ts']){
    const r=ts.transpileModule(code(file),{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
    assert.deepEqual(r.diagnostics??[],[],file);
  }
});
