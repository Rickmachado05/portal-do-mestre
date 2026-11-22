import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const tsx=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.css',import.meta.url),'utf8');
test('ajuste independente está no início do editor de cenário e não escondido em mapa-base',()=>{
  const ixEditor=tsx.indexOf("{painelAtivo==='construcao'&&<div");
  const ixRápido=tsx.indexOf('AJUSTE RÁPIDO · TAMANHO DA PLANTA');
  const ixModelo=tsx.indexOf('Modelo inicial',ixEditor);
  assert.ok(ixEditor>=0&&ixRápido>ixEditor&&ixRápido<ixModelo);
  assert.equal(tsx.match(/AJUSTE RÁPIDO · TAMANHO DA PLANTA/g)?.length,1);
});
test('campos numéricos aceitam rascunho livre até confirmar Enter ou desfocar',()=>{
  for(const eixo of ['Largura','Profundidade'])assert.match(tsx,new RegExp(`rascunho${eixo}Planta`));
  assert.match(tsx,/onBlur=\{\(\)=>confirmarRascunhoPlanta\('largura',rascunhoLarguraPlanta\)\}/);
  assert.match(tsx,/onBlur=\{\(\)=>confirmarRascunhoPlanta\('profundidade',rascunhoProfundidadePlanta\)\}/);
  assert.ok(tsx.includes("Number(texto.trim().replace(',','.'))"));
});
test('atalhos mudam os eixos individualmente e editor abre expandido e no início',()=>{
  assert.match(tsx,/aria-label="Aumentar largura da planta"/);
  assert.match(tsx,/aria-label="Diminuir profundidade da planta"/);
  assert.match(tsx,/setPainelVisivel\(true\);setJanelaMinimizada\(false\);setJanelaPos\(null\);/);
  assert.match(tsx,/painelEditorRef\.current\.scrollTop=0/);
  assert.match(css,/\.m3d-plant-size-quick/);
});
