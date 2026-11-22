import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const src=readFileSync(new URL('../src/mesa3d/roomLogic.ts',import.meta.url),'utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const logic=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const rt=(file)=>readFileSync(new URL(file,import.meta.url),'utf8');

test('W avança, S retorna, A/D deslizam no plano do cenário',()=>{
  assert.deepEqual(logic.direcaoCamera(1,0,0),{x:0,z:-1});
  assert.deepEqual(logic.direcaoCamera(-1,0,0),{x:0,z:1});
  assert.deepEqual(logic.direcaoCamera(0,1,0),{x:1,z:0});
});
test('diagonais têm velocidade normalizada',()=>{
  const v=logic.direcaoCamera(1,1,.67);assert.ok(Math.abs(Math.hypot(v.x,v.z)-1)<1e-12);
});
test('a rotação da câmera muda a direção de caminhar',()=>{
  const v=logic.direcaoCamera(1,0,Math.PI/2);assert.ok(v.x<-.999 && Math.abs(v.z)<1e-10);
});
test('a área de teste contém o personagem inicial',()=>{
  assert.equal(logic.colisaoSala(logic.PONTO_INICIAL),false);
});
test('limites e mobiliário têm colisões ativas',()=>{
  assert.equal(logic.colisaoSala({x:-9,z:0}),true);
  assert.equal(logic.colisaoSala({x:2.65,z:-2.15}),true);
  assert.equal(logic.colisaoSala({x:0,z:2}),false);
});
test('não atravessa limites da sala em deslocamentos grandes',()=>{
  const r=logic.moverNaSala(logic.PONTO_INICIAL,{x:40,z:10});assert.equal(logic.colisaoSala(r),false);assert.ok(r.x<logic.SALA.maxX);
});
test('não atravessa a mesa mesmo com movimento rápido',()=>{
  const a={x:2.65,z:2},b=logic.moverNaSala(a,{x:0,z:-6});assert.ok(b.z>-.8);assert.equal(logic.colisaoSala(b),false);
});
test('deslizamento por eixo permite seguir a parede',()=>{
  const a={x:7.95,z:5},b=logic.moverNaSala(a,{x:4,z:-1});assert.ok(b.z<a.z);assert.equal(logic.colisaoSala(b),false);
});
test('a página mantém as campanhas sem salvar posições',()=>{
  const app=rt('../src/mesa3d/Mesa3DPrototipo.tsx');
  assert.match(app,/carregarArquivo/);assert.match(app,/skinAtiva/);assert.match(app,/moverNoCenario3D/);
  assert.doesNotMatch(app,/salvarPosicaoToken25D|localStorage\.setItem/);
});
test('a Mesa 3D usa a interface idêntica da Mesa 2D e tem visualizador WebGL separado',()=>{
  assert.match(rt('../vite.config.ts'),/mesa3d: fileURLToPath/);
  assert.match(rt('../src/App.tsx'),/MODO_3D/);
  assert.match(rt('../vite.config.ts'),/mesa3dviewer: fileURLToPath/);
  assert.match(rt('../src/portal/GestaoCampanhas.tsx'),/hp-modo-opcao/);
});
