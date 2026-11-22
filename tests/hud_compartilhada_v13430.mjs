import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const fonte=(f)=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
const js=ts.transpileModule(fonte('hexatombe/posicaoHudEfeitos.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const ctx={exports:{},Math,JSON,Number};vm.runInNewContext(js,ctx);
const {limitarPosicaoHudEfeitos,lerPosicaoHudEfeitos,salvarPosicaoHudEfeitos,posicaoInicialHudEfeitos}=ctx.exports;
const app=fonte('App.tsx'),viewer=fonte('mesa3d/Mesa3DPrototipo.tsx');
const hud=fonte('hexatombe/HudEfeitosMesa.tsx'),css=fonte('hexatombe/HudEfeitosMesa.css');
test('HUD usa dados compartilhados do personagem da vez, em 2D e 3D',()=>{
  assert.match(app,/usaRegrasImpeto && campanha\.combateAtivo && atual && atual\.condicoes\.length>0/);
  assert.match(app,/<HudEfeitosMesa nome=\{atual\.nome\} efeitos=\{atual\.condicoes\}\/>/);
  assert.match(app,/\{MODO_3D \? <div className="mapa-viewport/);
  assert.match(hud,/FaixasEfeitos efeitos=\{efeitos\} compacto/);
});
test('3D embutida desliga HUD interna para não duplicar',()=>{
  assert.match(viewer,/!EMBUTIDO_3D && usaImpeto && sessao\.combateAtivo/);
});
test('o arrasto tem pointer capture e escuta eventos globais, passando sobre iframe',()=>{
  assert.match(hud,/ev\.currentTarget\.setPointerCapture\(ev\.pointerId\)/);
  assert.match(hud,/window\.addEventListener\('pointermove',mover,true\)/);
  assert.match(hud,/window\.addEventListener\('pointerup',parar,true\)/);
  assert.match(hud,/onPointerDown=\{iniciar\}/);
  assert.match(css,/cursor:move;touch-action:none/);
});
test('o painel fica acima do mapa sem bloquear fichas e menus',()=>{
  assert.match(css,/position:absolute;z-index:19/);
  assert.match(css,/pointer-events:auto/);
});
test('limita a posição para que HUD não suma da tela',()=>{
  const p=limitarPosicaoHudEfeitos({x:-200,y:-400},{largura:286,altura:165},{largura:1600,altura:900});
  assert.equal(p.x,8);assert.equal(p.y,66);
  const q=limitarPosicaoHudEfeitos({x:5000,y:5000},{largura:286,altura:165},{largura:1600,altura:900});
  assert.equal(q.x,1306);assert.equal(q.y,727);
  const x=posicaoInicialHudEfeitos({largura:1600,altura:900},{largura:286,altura:165});
  assert.equal(x.x,1178);assert.equal(x.y,627);
});
test('a posição é salva e restaurada sem alterar campanha',()=>{
  const map=new Map();
  const storage={getItem:(k)=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:(k)=>map.delete(k)};
  assert.equal(lerPosicaoHudEfeitos(storage),null);
  salvarPosicaoHudEfeitos({x:430,y:155},storage);
  assert.equal(lerPosicaoHudEfeitos(storage).x,430);
  assert.equal(lerPosicaoHudEfeitos(storage).y,155);
  salvarPosicaoHudEfeitos(null,storage);
  assert.equal(lerPosicaoHudEfeitos(storage),null);
});
test('pan alternativo da tática usa Shift + botão esquerdo sem remover rotação',()=>{
  assert.match(viewer,/ev\.button===0&&ev\.shiftKey/);
  assert.match(viewer,/botaoMouse=ev\.button===0\?1:ev\.button/);
  assert.match(viewer,/deslocarAlvoCamera\(\{x:base\.x\+offset\.x,z:base\.z\+offset\.z\}/);
  assert.match(viewer,/girarCameraTatica\(/);
  assert.match(app,/Shift \+ botão esquerdo ou botão do meio: mover/);
});
