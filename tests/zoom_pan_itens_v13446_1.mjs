import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  VISAO_IMAGEM_INICIAL,ZOOM_MINIMO_ITEM,ZOOM_MAXIMO_ITEM,
  limitarZoomImagem,limitarPanImagem,zoomImagemNoCursor,arrastarImagem,
} from '../src/hexatombe/navegacaoImagemItem.ts';

const visor={largura:700,altura:390};
const imagem={largura:680,altura:375};
const fonte=path=>readFileSync(new URL(`../src/hexatombe/${path}`,import.meta.url),'utf8');

test('zoom começa em 100%, restaura o centro e tem limites consistentes',()=>{
  assert.deepEqual(VISAO_IMAGEM_INICIAL,{zoom:100,x:0,y:0});
  assert.equal(limitarZoomImagem(-100),ZOOM_MINIMO_ITEM);
  assert.equal(limitarZoomImagem(20000),ZOOM_MAXIMO_ITEM);
  assert.equal(limitarZoomImagem(Number.NaN),100);
});
test('imagem inteira permanece centralizada e não sai das bordas',()=>{
  assert.deepEqual(limitarPanImagem({x:500,y:-500},100,visor,imagem),{x:0,y:0});
  assert.deepEqual(limitarPanImagem({x:999,y:-999},200,visor,imagem),{x:330,y:-180});
  assert.deepEqual(limitarPanImagem({x:-999,y:999},200,visor,imagem),{x:-330,y:180});
});
test('roda amplia ao redor do cursor em vez de saltar para o centro',()=>{
  const original={zoom:100,x:0,y:0};
  const novo=zoomImagemNoCursor(original,200,{x:100,y:50},visor,imagem);
  assert.deepEqual(novo,{zoom:200,x:-100,y:-50});
  const volta=zoomImagemNoCursor(novo,100,{x:100,y:50},visor,imagem);
  assert.deepEqual(volta,original);
});
test('arrasto desloca imagem ampliada e respeita os limites do visor',()=>{
  const perto=arrastarImagem({zoom:200,x:0,y:0},{x:35,y:-42},visor,imagem);
  assert.deepEqual(perto,{zoom:200,x:35,y:-42});
  const limite=arrastarImagem(perto,{x:900,y:900},visor,imagem);
  assert.equal(limite.x,330);assert.equal(limite.y,180);
  const encaixada=arrastarImagem(VISAO_IMAGEM_INICIAL,{x:250,y:120},visor,imagem);
  assert.deepEqual(encaixada,VISAO_IMAGEM_INICIAL);
});
test('zoom de imagem pequena continua limitado sem fundo exposto',()=>{
  const pequena={largura:180,altura:80};
  assert.deepEqual(limitarPanImagem({x:30,y:80},200,visor,pequena),{x:0,y:0});
  assert.deepEqual(limitarPanImagem({x:70,y:80},400,visor,pequena),{x:10,y:0});
});
test('roda usa listener não passivo no visor e não propaga zoom ao mapa',()=>{
  const codigo=fonte('VisualizadorItem.tsx');
  assert.match(codigo,/addEventListener\('wheel',aoRolar,\{passive:false\}\)/);
  assert.match(codigo,/ev\.preventDefault\(\)/);
  assert.match(codigo,/ev\.stopPropagation\(\)/);
  assert.match(codigo,/zoomImagemNoCursor\(/);
});
test('arrastar usa captura de ponteiro e restaura enquadramento independentemente do texto',()=>{
  const codigo=fonte('VisualizadorItem.tsx');
  assert.match(codigo,/setPointerCapture\(ev\.pointerId\)/);
  assert.match(codigo,/releasePointerCapture\(ev\.pointerId\)/);
  assert.match(codigo,/onPointerMove=\{moverImagem\}/);
  assert.match(codigo,/onPointerCancel=\{terminarArrasto\}/);
  assert.match(codigo,/onLostPointerCapture=\{terminarArrasto\}/);
  assert.match(codigo,/setVisao\(\{\.\.\.VISAO_IMAGEM_INICIAL\}\)/);
  assert.match(codigo,/pm-visualizar-texto/);
  assert.match(codigo,/pm-visualizar-descricao/);
});
test('CSS isola a área de zoom e permite arrasto também por toque',()=>{
  const css=fonte('VisualizadorItem.css');
  assert.match(css,/\.pm-visualizar-imagem-area\{[^}]*overflow:hidden/);
  assert.match(css,/\.pm-visualizar-imagem-area\{[^}]*touch-action:none/);
  assert.match(css,/\.pm-visualizar-imagem-area\.arrastando\{cursor:grabbing/);
  assert.match(css,/\.pm-visualizar-corpo\{overflow:auto/);
  assert.match(css,/\.pm-visualizar-imagem-area img\{[^}]*pointer-events:none/);
});
