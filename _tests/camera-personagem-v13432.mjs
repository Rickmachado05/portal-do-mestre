import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const source=(f)=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
const codigo=ts.transpileModule(source('mesa3d/cameraCinematica.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const ctx={exports:{}};vm.runInNewContext(codigo,ctx);
const cam=ctx.exports;
const app=source('App.tsx'),ficha=source('hexatombe/AcoesDaFicha.tsx'),viewer=source('mesa3d/Mesa3DPrototipo.tsx');
test('a câmera narrativa é mais próxima e mais baixa que antes, e não toca nos tokens',()=>{
  const p={x:2,z:4};const r=cam.calcularEnquadramentoCinematico(p,undefined,'personagem');
  assert.equal(r.distancia,5.2);assert.equal(r.elevacao,.30);assert.equal(r.centro.x,2);assert.equal(r.centro.z,4);
  assert.equal(p.x,2);assert.ok(r.distancia<cam.calcularEnquadramentoCinematico(p,undefined,'tatica').distancia);
});
test('giro de personagem muda ângulo horizontal e vertical com limites seguros',()=>{
  let r=cam.girarCameraPersonagem(.65,.30,80,50);assert.notEqual(r.angulo,.65);assert.ok(r.elevacao<.30);
  r=cam.girarCameraPersonagem(0,.20,0,-9999);assert.equal(r.elevacao,.90);
  r=cam.girarCameraPersonagem(0,.20,0,9999);assert.equal(r.elevacao,.12);
});
test('zoom narrativo tem limites para evitar atravessar o sprite ou afastar demais',()=>{
  assert.equal(cam.zoomCameraPersonagem(5.2,-1),4.65);
  assert.equal(cam.zoomCameraPersonagem(5.2,1),5.75);
  assert.equal(cam.zoomCameraPersonagem(3.8,-1),3.8);
  assert.equal(cam.zoomCameraPersonagem(10.5,1),10.5);
});
test('habilidades mantêm acerto, dano, descrição e ícones sem o botão Apresentar',()=>{
  assert.doesNotMatch(ficha,/Apresentar|onApresentar|AcaoApresentavel/);
  for(const regra of ['Teste CA','Rolar {formula}','Ver descrição','✧ Ícone'])assert.ok(ficha.includes(regra),regra);
  assert.doesNotMatch(app,/onApresentar|painelAcao|hx-cena-acao|abrirApresentacao/);
  assert.match(app,/alternarCameraDestaque\('personagem'\)/);
  assert.match(app,/alternarCameraDestaque\('tatica'\)/);
});
test('o renderizador recebe giro e zoom na câmera Personagem sem bloquear a tática',()=>{
  for(const trecho of ["girarCameraPersonagem(yawPersonagemRef.current,pitchPersonagemRef.current,dx,dy)",
    "zoomCameraPersonagem(distanciaPersonagemRef.current,ev.deltaY)",
    "tipo==='camera-personagem-restaurar'", "cinematicaRef.current?.modo==='personagem'&&ev.button===2",
    "if(cinematicaRef.current?.modo==='tatica'&&botaoMouse===0)"]) assert.ok(viewer.includes(trecho),trecho);
  assert.match(app,/Restaurar enquadramento/);
  assert.match(viewer,/moverTokenCompartilhado3D\(campanhaId,leituraCenaId.current,tokenArrastado/);
});
