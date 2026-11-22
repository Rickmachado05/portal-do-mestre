import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const dir=new URL('../src/mesa3d/',import.meta.url);
const original=readFileSync(new URL('cameraCinematica.ts',dir),'utf8');
const js=ts.transpileModule(original,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandbox={exports:{}};
vm.runInNewContext(js,sandbox);
const {girarCameraTatica:girar,calcularEnquadramentoCinematico:enquadrar}=sandbox.exports;
const viewer=readFileSync(new URL('Mesa3DPrototipo.tsx',dir),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');

test('arrasto horizontal gira a tática como a visão livre',()=>{
  const inicial=girar(.65,1.04,0,0);
  assert.ok(Math.abs(inicial.angulo-.65)<1e-9);
  assert.ok(Math.abs(girar(.65,1.04,100,0).angulo-1.35)<1e-9);
  assert.ok(Math.abs(girar(.65,1.04,-100,0).angulo-(-.05))<1e-9);
});
test('arrasto vertical inclina com limites seguros',()=>{
  assert.ok(Math.abs(girar(.65,1.04,0,40).elevacao-.8)<1e-9);
  assert.equal(girar(.65,1.04,0,1000).elevacao,.25);
  assert.equal(girar(.65,1.04,0,-1000).elevacao,1.48);
});
test('ângulo gira em 360° sem acumular valores infinitos',()=>{
  const result=girar(.65,1.04,10000,0);
  assert.ok(result.angulo>=-Math.PI&&result.angulo<=Math.PI);
});
test('reenquadramento tático ainda usa participantes e independência do modo personagem',()=>{
  const p=enquadrar({x:0,z:0},{x:20,z:20},'tatica');
  assert.ok(p.distancia>=26);
  assert.equal(enquadrar({x:0,z:0},undefined,'personagem').distancia,5.2);
  assert.match(viewer,/idsParaEnquadrarCombate\(/);
  assert.match(viewer,/zoomTaticoRef\.current\/100/);
});
test('rotação com botão direito e pan com botão do meio, sem editar objetos do cenário',()=>{
  assert.match(viewer,/cinematicaRef\.current\?\.modo==='tatica'&&\(ev\.button===2\|\|ev\.button===1\|\|\(ev\.button===0&&ev\.shiftKey\)\)/);
  assert.match(viewer,/girarCameraTatica\(yawTaticoRef\.current,pitchTaticoRef\.current,dx,dy\)/);
  assert.match(viewer,/apresentacao\.modo==='tatica'\?yawTaticoRef\.current:yawPersonagemRef\.current/);
  assert.match(viewer,/apresentacao\.modo==='tatica'\?pitchTaticoRef\.current:pitchPersonagemRef\.current/);
  assert.match(viewer,/if\(cinematicaRef\.current\)\{ev\.preventDefault\(\);return;\}/);
});
test('dicas de interação e zoom estão disponíveis',()=>{
  assert.match(app,/Botão direito: girar/);
  assert.match(app,/Roda: zoom/);
  assert.match(app,/Reenquadrar combate/);
});
