import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calcularPosicaoMenuCombate} from '../src/hexatombe/posicaoMenuCombate.ts';
import {mostrarMenuNoTurno} from '../src/hexatombe/menuCombateTurno.ts';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const viewer=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
const menu=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.css',import.meta.url),'utf8');
test('HUD fica à direita de personagem central e à esquerda de personagem perto da borda',()=>{
 const centro=calcularPosicaoMenuCombate({x:720,y:450,visivel:true},1440,900);
 const borda=calcularPosicaoMenuCombate({x:1350,y:450,visivel:true},1440,900);
 assert.equal(centro.lado,'direito');assert.ok(centro.left>720);
 assert.equal(borda.lado,'esquerdo');assert.ok(borda.left<1350);
});
test('HUD nunca sai dos limites laterais em resoluções pequenas',()=>{
 for(const w of [320,390,550,780,1366])for(const x of [-999,0,w/2,w,9999]){
   const p=calcularPosicaoMenuCombate({x,y:400,visivel:true},w,768);
   const largura=w<=540?Math.min(220,w-18):244;
   assert.ok(p.left>=0 && p.left+largura<=w,p.left+' '+w+' '+x);
   assert.ok(p.top>=0 && p.top<768);
 }
});
test('posição 3D nasce da projeção do token na câmera do personagem',()=>{
 assert.match(viewer,/new THREE\.Vector3\(posAtor\.x,1\.26,posAtor\.z\)\.project\(cameraCinematica\)/);
 assert.match(viewer,/tipo:'posicao-personagem-tela'/);
 assert.match(viewer,/apresentacao\.modo==='personagem'/);
});
test('janela pai verifica origem, iframe e identidade do personagem antes de aceitar posição',()=>{
 assert.match(app,/e\.origin!==window\.location\.origin/);
 assert.match(app,/e\.source!==visualizador3DRef\.current\?\.contentWindow/);
 assert.match(app,/cameraDestaqueRef\.current\.personagemId!==p\.personagemId/);
 assert.match(app,/ancora=\{posicaoPersonagemTela/);
});
test('menu conserva rolagens, itens e restrição de turno',()=>{
 assert.match(menu,/onRolar\('1d20'/);
 assert.match(menu,/onUsarItem\(item\)/);
 assert.match(menu,/onAbrirInventario/);
 const base={combateAtivo:true,modoCamera:'personagem',personagemFocoId:'m',turnoId:'m',tokenPresente:true};
 assert.equal(mostrarMenuNoTurno(base),true);
 assert.equal(mostrarMenuNoTurno({...base,turnoId:'n'}),false);
});
test('barras de HP e Mana, menu em faixas e versão compacta preservam a estética',()=>{
 assert.match(menu,/hx-combate-medidor hx-combate-hp/);
 assert.match(menu,/hx-combate-medidor hx-combate-mana/);
 assert.match(css,/\.hx-combate-categorias button\s*\{[^}]*skewX\(-9deg\)/);
 assert.match(css,/position:\s*fixed/);
 assert.match(css,/prefers-reduced-motion/);
});
