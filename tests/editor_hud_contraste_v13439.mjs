import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calcularPosicaoEditorHudCombate} from '../src/hexatombe/posicaoEditorHudCombate.ts';
import {calcularLayoutLateralMenuCombate} from '../src/hexatombe/posicaoMenuCombate.ts';
import {luminanciaHud,textoContrasteHud} from '../src/hexatombe/personalizacaoHudCombate.ts';
const menu=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.css',import.meta.url),'utf8');
const cruza=(a,b,folga=9)=>a.left<a.left+a.width&&a.left<b.left+b.width+folga&&b.left<a.left+a.width+folga&&a.top<b.top+b.height+folga&&b.top<a.top+a.height+folga;
const retangulos=(layout,ancora,detalhes)=>{
 const escala=layout.escala;
 const resultado=[{left:layout.principal.left,top:layout.principal.top,width:layout.larguraPrincipal*escala,height:Math.min(300,282*escala)}];
 resultado.push({left:layout.lista.left,top:layout.lista.top,width:layout.lista.width*escala,height:layout.lista.maxHeight*escala});
 if(detalhes)resultado.push({left:layout.detalhe.left,top:layout.detalhe.top,width:layout.detalhe.width*escala,height:layout.detalhe.maxHeight*escala});
 return resultado;
};

test('na resolução da captura o editor ocupa espaço lateral e não tampa habilidades ou token',()=>{
 const vp={width:1649,height:928};
 for(const x of [660,740,800,830,900,1050,1240])for(const escala of [.8,1,1.2]){
  const token={x,y:700,visivel:true};
  const layout=calcularLayoutLateralMenuCombate(token,vp.width,vp.height,{escala,distancia:110,lado:'auto'});
  const p=calcularPosicaoEditorHudCombate(layout,vp.width,vp.height,token,true);
  if(x===830 && escala===1)assert.equal(p.modo,'completo','a captura deve manter todos os painéis');
  const r={left:p.left,top:p.top,width:290,height:430};
  assert.ok(p.left>=252 && p.left+290<=vp.width-132+1,`fora da área útil: ${x}/${escala}`);
  assert.ok(p.top>=218,`editor sob a barra superior: ${x}/${escala}`);
  if(p.modo!=='exclusivo')assert.equal(cruza(r,retangulos(layout,token,true)[0],12),false,`principal sobreposta: ${x}/${escala}`);
  if(p.modo==='completo')for(const ocupado of retangulos(layout,token,true).slice(1))assert.equal(cruza(r,ocupado,12),false,`colunas sobrepostas: ${x}/${escala}`);
  if(p.modo!=='exclusivo')assert.equal(cruza(r,{left:x-87,top:700-245,width:174,height:285},8),false,`token coberto ${x}/${escala}`);
 }
});

test('o editor recolhe colunas secundárias ou usa edição exclusiva em telas estreitas',()=>{
 for(const width of [390,540,720,820,960,1120]){
  const token={x:width*.52,y:520,visivel:true};
  const layout=calcularLayoutLateralMenuCombate(token,width,820);
  const e=calcularPosicaoEditorHudCombate(layout,width,820,token,true);
  assert.ok(['completo','sem-secundarios','exclusivo'].includes(e.modo));
  assert.ok(e.left>=0 && e.left<width);
  const r={left:e.left,top:e.top,width:Math.min(290,Math.max(200,width-(width>850?158:12)-(width>850?92:12)-16)),height:Math.min(430,Math.max(250,820-(820>700?142:77)-(820>700?93:14)))};
  if(e.modo!=='exclusivo')assert.equal(cruza(r,retangulos(layout,token,true)[0],12),false,`principal coberta ${width}`);
  if(e.modo==='completo')for(const ocupado of retangulos(layout,token,true).slice(1))assert.equal(cruza(r,ocupado,12),false,`coluna coberta ${width}`);
 }
});

test('contraste automático escolhe tinta escura para branco/cores claras e clara para rubi',()=>{
 for(const cor of ['#ffffff','#fafafa','#ffff00','#74b9b2'])assert.equal(textoContrasteHud(cor),'#141820');
 for(const cor of ['#000000','#110d15','#ba344b'])assert.equal(textoContrasteHud(cor),'#fff6ed');
 assert.ok(luminanciaHud('#ffffff')>.9);
 assert.ok(luminanciaHud('#000000')<.01);
 assert.equal(luminanciaHud('invalido'),0);
});

test('estilos do HUD aplicam contraste dinâmico a botões e scroll neutro em todos os painéis',()=>{
 assert.match(menu, /textoContrasteHud\(personalizacao\.cor\)/);
 assert.match(menu, /limitarPosicaoEditorHud/);
 assert.match(menu, /posicaoEscolhidaEditor/);
 assert.match(menu, /data-layout-editor/);
 assert.match(css, /color:\s*var\(--hx-hud-texto-ativo/);
 assert.match(css, /\.hx-combate-detalhe::\-webkit-scrollbar-thumb/);
 assert.match(css, /scrollbar-color:\s*#555b68 #14161e/);
});
