import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {normalizarClima, climaAtivo, CLIMA_PADRAO, TIPOS_CLIMA} from '../src/lib/weather.ts';
import {duplicarDadosDaCena} from '../src/lib/cloneScene.ts';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const canvas=readFileSync(new URL('../src/WeatherLayer.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/App.css',import.meta.url),'utf8');

test('cena antiga inicia sem clima e configurações inválidas são normalizadas',()=>{
  assert.deepEqual(normalizarClima(undefined),CLIMA_PADRAO);
  assert.deepEqual(normalizarClima({tipo:'tempestade',intensidade:Infinity,vento:-20,direcao:400}),{tipo:'nenhum',intensidade:45,vento:0,direcao:359});
  assert.deepEqual(normalizarClima({tipo:'neve',intensidade:71.5,vento:125,direcao:225}),{tipo:'neve',intensidade:72,vento:100,direcao:225});
  assert.deepEqual(normalizarClima({tipo:'chuva',intensidade:'80'}),{tipo:'chuva',intensidade:45,vento:35,direcao:0});
});
test('seis condições originais e desligado, sem efeitos mecânicos',()=>{
  assert.deepEqual(TIPOS_CLIMA.map(t=>t.id),['nenhum','chuva','neve','neblina','cinzas','areia','folhas']);
  assert.equal(climaAtivo(normalizarClima({tipo:'chuva',intensidade:60})),true);
  assert.equal(climaAtivo(normalizarClima({tipo:'chuva',intensidade:0})),false);
  assert.equal(climaAtivo(normalizarClima({tipo:'chuva',intensidade:60}),true),false);
});
test('cenas duplicadas recebem cópia independente da configuração climática',()=>{
  const original={id:'cena',nome:'Floresta',clima:{tipo:'neve',intensidade:80,vento:20,direcao:240},tokens:{morgana:{x:34}}};
  const copia=duplicarDadosDaCena(original,'copia');
  assert.equal(copia.clima.tipo,'neve');
  copia.clima.intensidade=10;
  copia.tokens.morgana.x=50;
  assert.equal(original.clima.intensidade,80);
  assert.equal(original.tokens.morgana.x,34);
});
test('interface acessível por botão próprio, com ajustes independentes e salvamento por cena',()=>{
  assert.match(app,/type ChaveJanela = 'clima'/);
  assert.match(app,/clima: normalizarClima\(c\.clima\)/);
  assert.match(app,/clima: \{ \.\.\.CLIMA_PADRAO \}/);
  assert.match(app,/<WeatherLayer config=\{climaAtual\} pausado=\{pausarClima\}/);
  assert.match(app,/titulo="Clima da cena"/);
  assert.match(app,/Condição climática/);
  assert.match(app,/Intensidade \/ cobertura/);
  assert.match(app,/Força do vento/);
  assert.match(app,/Direção do vento/);
  assert.match(app,/Pausar animação neste navegador/);
});
test('renderização separada, sem capturar o mouse, respeita preferências e poupa recursos',()=>{
  assert.match(css,/\.clima-camada\{[^}]*pointer-events:none/);
  assert.match(canvas,/prefers-reduced-motion: reduce/);
  assert.match(canvas,/document\.hidden/);
  assert.match(canvas,/cancelAnimationFrame/);
  assert.match(canvas,/ResizeObserver/);
  assert.match(canvas,/Math\.min\(340,/);
  assert.match(app,/\.nevoa/);
});
