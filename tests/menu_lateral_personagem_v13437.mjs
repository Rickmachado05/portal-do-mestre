import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularLayoutLateralMenuCombate } from '../src/hexatombe/posicaoMenuCombate.ts';
import { mostrarMenuNoTurno } from '../src/hexatombe/menuCombateTurno.ts';

const menu=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.css',import.meta.url),'utf8');
const separadas=(a,b)=>a.left+a.width<=b.left||b.left+b.width<=a.left;
const alturaLivre=(a,b)=>a.top+a.maxHeight<=b.top||b.top+b.maxHeight<=a.top;

test('painéis preservam a separação em telas desktop, mesmo quando há mudança de layout',()=>{
 for(const w of [960,1024,1280,1440,1649,1920])for(const x of [-40,0,w*.15,w*.5,w*.8,w-1,w+50]){
  const p=calcularLayoutLateralMenuCombate({x,y:440,visivel:true},w,928);
  const main={left:p.principal.left,width:p.larguraPrincipal};
  const panes=[main,p.lista,p.detalhe];
  for(const r of panes)assert.ok(r.left>=0&&r.left+r.width<=w,`painel fora ${w},x=${x}`);
  if(p.modo==='triplo'){
    assert.ok(separadas(main,p.lista)&&separadas(main,p.detalhe)&&separadas(p.lista,p.detalhe),`triplo sobreposto ${w},x=${x}`);
  }else if(p.modo==='duplo'){
    assert.ok(separadas(main,p.lista)&&separadas(main,p.detalhe)&&alturaLivre(p.lista,p.detalhe),`duplo sobreposto ${w},x=${x}`);
  }else{
    assert.ok(alturaLivre(p.lista,p.detalhe),`vertical sobreposto ${w},x=${x}`);
  }
 }
});

test('telas intermediárias nunca cruzam painéis, mesmo usando fallback vertical',()=>{
 for(const w of [540,600,820])for(const x of [0,w*.5,w-1]){
  const p=calcularLayoutLateralMenuCombate({x,y:390,visivel:true},w,820);
  const main={left:p.principal.left,width:p.larguraPrincipal};
  assert.ok(alturaLivre(p.lista,p.detalhe)||separadas(p.lista,p.detalhe));
  if(p.modo!=='vertical')assert.ok(separadas(main,p.lista)&&separadas(main,p.detalhe));
  for(const r of [main,p.lista,p.detalhe])assert.ok(r.left>=0&&r.left+r.width<=w);
 }
});

test('tela de celular: colunas tornam-se pilha sem sair pelas bordas laterais',()=>{
 for(const w of [320,390,480,539]){
  const p=calcularLayoutLateralMenuCombate({x:w-12,y:415,visivel:true},w,830);
  assert.equal(p.modo,'vertical');
  for(const r of [p.lista,p.detalhe])assert.ok(r.left>=0&&r.left+r.width<=w);
  assert.ok(alturaLivre(p.lista,p.detalhe));
 }
});

test('componentes laterais são independentes e preservam botões originais',()=>{
 assert.match(menu,/hx-combate-submenu/);
 assert.match(menu,/hx-combate-detalhe/);
 assert.match(menu,/style=\{estiloLista\}/);
 assert.match(menu,/style=\{estiloDetalhe\}/);
 assert.match(menu,/onUsarItem\(item\)/);
 assert.match(menu,/onRolar\('1d20'/);
 assert.match(menu,/onAbrirInventario/);
 assert.match(css,/\.hx-combate-submenu\s*\{[^}]*position:\s*fixed/);
 assert.match(css,/\.hx-combate-detalhe\s*\{[^}]*position:\s*fixed/);
});

test('menu continua vinculado à iniciativa e some fora do turno de quem está em foco',()=>{
 const ctx={combateAtivo:true,modoCamera:'personagem',personagemFocoId:'m',turnoId:'m',tokenPresente:true};
 assert.equal(mostrarMenuNoTurno(ctx),true);
 assert.equal(mostrarMenuNoTurno({...ctx,turnoId:'n'}),false);
 assert.equal(mostrarMenuNoTurno({...ctx,modoCamera:'tatica'}),false);
 assert.equal(mostrarMenuNoTurno({...ctx,combateAtivo:false}),false);
});
