import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const source=fs.readFileSync('src/mesa3d/cameraCinematica.ts','utf8');
const codigo=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const ctx={exports:{}};
vm.runInNewContext(codigo,ctx);
const enquadrar=ctx.exports.calcularEnquadramentoCinematico;
const app=fs.readFileSync('src/App.tsx','utf8');
const viewer=fs.readFileSync('src/mesa3d/Mesa3DPrototipo.tsx','utf8');
const ficha=fs.readFileSync('src/hexatombe/AcoesDaFicha.tsx','utf8');

test('apenas personagem e tática, preservando as posições originais',()=>{
  const personagem={x:1,z:4}, alvo={x:9,z:12};
  for(const modo of ['personagem','tatica']){
    const e=enquadrar(personagem,alvo,modo);
    assert.ok(Number.isFinite(e.distancia)&&e.distancia>0);
    assert.ok(e.elevacao>0&&e.elevacao<Math.PI/2);
  }
  assert.deepEqual(personagem,{x:1,z:4});
  assert.deepEqual(alvo,{x:9,z:12});
  assert.doesNotMatch(source,/['"]confronto['"]/);
});
test('personagem centraliza no próprio token e tática permite observar ambos',()=>{
  const p={x:-3,z:5},a={x:7,z:5};
  assert.equal(enquadrar(p,a,'personagem').centro.x,p.x);
  assert.equal(enquadrar(p,a,'tatica').centro.x,2);
  assert.ok(enquadrar(p,a,'tatica').distancia>enquadrar(p,a,'personagem').distancia);
});
test('sem alvo mantém um enquadramento válido em tela estreita',()=>{
  for(const modo of ['personagem','tatica']){
    const e=enquadrar({x:0,z:0},undefined,modo,.6);
    assert.equal(e.centro.x,0);assert.equal(e.centro.z,0);
    assert.ok(e.distancia>=5);
  }
});
test('limita distância para preservar a cena',()=>{
  assert.ok(enquadrar({x:0,z:0},{x:2000,z:2000},'tatica').distancia<=100);
});
test('seleção direta das câmeras sem botão ou painel Apresentar',()=>{
  assert.match(app,/alternarCameraDestaque\('personagem'\)/);
  assert.match(app,/alternarCameraDestaque\('tatica'\)/);
  assert.match(app,/Personagem em foco/);
  assert.doesNotMatch(app,/hx-cena-acao|painelAcao|onApresentar/);
  assert.doesNotMatch(ficha,/onApresentar|Apresentar/);
  assert.match(app,/tipo:'cinematica-iniciar'/);
  assert.match(app,/tipo==='cinematica-encerrada'/);
});
test('visualizador preserva as transições e não move os tokens durante o foco',()=>{
  assert.match(viewer,/cameraCinematica=new THREE\.PerspectiveCamera/);
  assert.match(viewer,/calcularEnquadramentoCinematico\(/);
  assert.match(viewer,/if\(apresentacao&&tokenCine\)/);
  assert.match(viewer,/voltarDaCinematicaRef/);
  assert.match(viewer,/if\(cinematicaRef\.current\)\{ev\.preventDefault\(\);return;\}/);
  assert.match(viewer,/!cinematicaRef\.current&&!modoEdicaoRef\.current/);
});
test('câmera Personagem permite zoom, órbita e retorno sem menu redundante',()=>{
  assert.match(viewer,/girarCameraPersonagem\(/);
  assert.match(viewer,/zoomCameraPersonagem\(/);
  assert.match(app,/Restaurar enquadramento/);
  assert.match(app,/cameraDestaque\.cenaId!==cenaAtual\.id/);
  assert.doesNotMatch(app,/hx-cena-acao|painelAcao/);
});
