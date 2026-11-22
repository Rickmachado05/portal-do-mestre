import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const codigo=ts.transpileModule(readFileSync('src/mesa3d/cameraCinematica.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const context={exports:{}};
vm.runInNewContext(codigo,context);
const {calcularEnquadramentoCinematico:plano,selecionarPontosTaticos:selecionar}=context.exports;
const app=readFileSync('src/App.tsx','utf8');
const viewer=readFileSync('src/mesa3d/Mesa3DPrototipo.tsx','utf8');
const css=readFileSync('src/mesa3d/mesaEspelhada.css','utf8');

test('tática abre mais que na versão anterior, sem alterar personagem',()=>{
  const p={x:0,z:0};
  assert.ok(plano(p,undefined,'tatica').distancia>=26);
  assert.equal(plano(p,undefined,'personagem').distancia,6.5);
  assert.equal(plano(p,undefined,'tatica').elevacao,1.04);
});
test('considera todos os tokens próximos sem deslocá-los',()=>{
  const p={x:0,z:0},a={x:12,z:0},b={x:-10,z:8};
  const antes=plano(p,a,'tatica');
  const depois=plano(p,a,'tatica',16/9,[b]);
  assert.ok(depois.distancia>=antes.distancia);
  assert.ok(depois.centro.x<antes.centro.x);
  assert.deepEqual(b,{x:-10,z:8});
});
test('pontos muito distantes ficam fora da leitura tática',()=>{
  const p={x:0,z:0};
  const lista=selecionar(p,[{x:5,z:0},{x:50,z:0},{x:7,z:0},{x:Infinity,z:0}],32,10);
  assert.equal(lista.length,2);
  assert.equal(lista[0].x,5);
});
test('zoom só muda a tática e respeita limites',()=>{
  const p={x:0,z:0};
  const a=plano(p,undefined,'tatica',16/9,[],.65);
  const b=plano(p,undefined,'tatica',16/9,[],2);
  assert.ok(b.distancia>a.distancia);
  assert.equal(plano(p,undefined,'personagem',16/9,[],2).distancia,6.5);
  assert.ok(plano(p,{x:2000,z:2000},'tatica').distancia<=100);
});
test('controle possui slider, reenquadrar e persistência no navegador',()=>{
  assert.match(app,/Abertura tática/);
  assert.match(app,/Reenquadrar combate/);
  assert.match(app,/portal-mestre-zoom-tatico-v1/);
  assert.match(app,/cinematica-zoom-atualizado/);
  assert.match(css,/\.hx-camera-zoom-tatico/);
});
test('visualizador aplica zoom via comunicação e roda do mouse',()=>{
  assert.match(viewer,/selecionarPontosTaticos\(/);
  assert.match(viewer,/if\(tipo==='cinematica-zoom'/);
  assert.match(viewer,/if\(tipo==='cinematica-reenquadrar'/);
  assert.match(viewer,/zoomTaticoRef\.current\/100/);
  assert.match(viewer,/definirZoomTatico\(zoomTaticoRef\.current\+/);
});
