import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const root=new URL('../src/mesa3d/',import.meta.url);
const code=(file)=>readFileSync(new URL(file,root),'utf8');
const compiled=ts.transpileModule(code('roomLogic.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const logicUrl='data:text/javascript;base64,'+Buffer.from(compiled).toString('base64');
const sourceEditor=code('editorCena3D.ts').replace("from './roomLogic'",`from '${logicUrl}'`);
const transpiled=ts.transpileModule(sourceEditor,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const lib=await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64'));
const valid=()=>({versao:1,base:'vazia',objetos:[]});
test('salva cenários com chave isolada por campanha e cena e incluída no backup',()=>{
  assert.notEqual(lib.chaveCena3D('camp-1','cena1'),lib.chaveCena3D('camp-2','cena1'));
  assert.notEqual(lib.chaveCena3D('camp-1','cena1'),lib.chaveCena3D('camp-1','cena2'));
  assert.match(lib.chaveCena3D('camp-1','cena1'),/^portal-mestre-/);
});
test('normalização mantém cenários antigos e recusa ids duplicados / tipos inesperados',()=>{
  assert.deepEqual(lib.normalizarCenario3D(null),{versao:1,base:'arquivos',objetos:[]});
  const x={id:'obj-1',tipo:'caixa',x:1000,z:-500,rotacao:9,nome:'Caixa'};
  const out=lib.normalizarCenario3D({versao:444,base:'vazia',objetos:[x,x,{...x,id:'obj-2',tipo:'script'}]});
  assert.equal(out.objetos.length,1);assert.equal(out.base,'vazia');assert.ok(out.objetos[0].x<9);assert.ok(out.objetos[0].z>-9);
});
test('obstáculos novos bloqueiam o personagem inclusive girados',()=>{
  const mesa=lib.novoObjeto3D('mesa',{x:0,z:0});
  assert.equal(lib.colisaoCenario3D({x:0,z:0},{...valid(),objetos:[mesa]}),true);
  assert.equal(lib.colisaoCenario3D({x:4,z:0},{...valid(),objetos:[mesa]}),false);
  const parede={...lib.novoObjeto3D('parede',{x:0,z:0}),rotacao:Math.PI/2};
  assert.equal(lib.tocaObjeto3D({x:0,z:1},parede),true);
  assert.equal(lib.tocaObjeto3D({x:1,z:0},parede),false);
});
test('luzes e tapetes não bloqueiam movimentação',()=>{
  for(const tipo of ['luz','tapete'])assert.equal(lib.colisaoCenario3D({x:0,z:0},{...valid(),objetos:[lib.novoObjeto3D(tipo,{x:0,z:0})]}),false);
});
test('colisões da sala modelo preservadas, sala vazia ignora móveis fixos',()=>{
  assert.equal(lib.colisaoCenario3D({x:2.65,z:-2.15},{versao:1,base:'arquivos',objetos:[]}),true);
  assert.equal(lib.colisaoCenario3D({x:2.65,z:-2.15},valid()),false);
});
test('movimento com passos curtos não atravessa paredes do mestre',()=>{
  const parede=lib.novoObjeto3D('parede',{x:0,z:0});
  const data={...valid(),objetos:[parede]};
  const pos=lib.moverNoCenario3D({x:0,z:3.5},{x:0,z:-9},data);
  assert.ok(pos.z>0.4);assert.equal(lib.colisaoCenario3D(pos,data),false);
});
test('persistência recupera layout por campanha e cena',()=>{
  const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const data={...valid(),objetos:[lib.novoObjeto3D('estante',{x:4,z:-4})]};
  lib.salvarCenario3D('camp-1','sala-1',data);
  assert.equal(lib.carregarCenario3D('camp-1','sala-1').objetos[0].tipo,'estante');
  assert.equal(lib.carregarCenario3D('camp-1','sala-2').objetos.length,0);
  assert.equal(lib.carregarCenario3D('camp-2','sala-1').objetos.length,0);
});
test('modo 2D permanece opção e padrão para campanha antiga',()=>{
  const campaign=readFileSync(new URL('../src/hexatombe/campaignLibrary.ts',import.meta.url),'utf8');
  const editor=readFileSync(new URL('../src/portal/GestaoCampanhas.tsx',import.meta.url),'utf8');
  assert.match(campaign,/modoMesa:item\.modoMesa==='3d'\?'3d':'2d'/);
  assert.match(editor,/Formato principal da campanha/);
  assert.match(editor,/urlMesaPreferidaCampanha\(m\)/);
});
test('preserva terceira pessoa, WASD e aparências, cena 3D salva sem mexer no estado 2D',()=>{
  const page=code('Mesa3DPrototipo.tsx');
  assert.match(page,/direcaoCamera/);assert.match(page,/skinAtiva/);assert.match(page,/moverNoCenario3D/);
  assert.match(page,/salvarCenario3D/);assert.doesNotMatch(page,/localStorage\.setItem\(chaveEstadoCampanha/);
  assert.match(code('roomScene.ts'),/configurarCenario/);
});
