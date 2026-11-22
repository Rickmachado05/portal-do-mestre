import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ler=(arquivo)=>readFileSync(new URL('../'+arquivo,import.meta.url),'utf8');
const app=ler('src/App.tsx');
const viewer=ler('src/mesa3d/Mesa3DPrototipo.tsx');
const css=ler('src/mesa3d/mesaEspelhada.css');

test('Visão de Mesa é o nome das duas câmeras administrativas',()=>{
  assert.match(app,/♟ Visão de Mesa/);
  assert.match(viewer,/♟ Visão de Mesa/);
  assert.doesNotMatch(app,/♟ Visão Mestre/);
  assert.doesNotMatch(viewer,/♟ Visão Mestre/);
});
test('mestre pode acompanhar qualquer tipo de personagem com token presente',()=>{
  assert.match(app,/campanha\.unidades\.filter\(u=>Boolean\(cenaAtual\.tokens\?\.\[u\.id\]\)\)/);
  assert.match(app,/personagensCamera3D\.map\(u=><option/);
  assert.match(app,/NOME_TIPOS\[u\.tipo\]/);
  assert.match(viewer,/estado\.unidades\.filter\(u=>Boolean\(cenaAtual\?\.tokens\?\.\[u\.id\]\)\)/);
  assert.match(viewer,/personagensNaCena\.map\(u=><option/);
});
test('troca de câmera e personagem continua conectada pelo canal compartilhado',()=>{
  assert.match(app,/enviar3D\('selecionar',alvo\)/);
  assert.match(app,/enviar3D\('camera',visao\)/);
  assert.match(app,/setSelecionadoId\(e\.target\.value\)/);
  assert.match(viewer,/if\(tipo==='selecionar'&&typeof valor==='string'\)/);
  assert.match(viewer,/setId\(e\.target\.value\)/);
  assert.match(viewer,/posicaoRef\.current=token\?percentualParaChao3D\(token/);
});
test('seletor fica na lateral e não ocupa o centro ou rodapé da mesa',()=>{
  assert.match(css,/\.hx-camera-personagem select/);
  assert.match(css,/max-width:100%/);
  assert.match(ler('src/mesa3d/Mesa3DPrototipo.css'),/\.m3d-camera-personagem select/);
});
