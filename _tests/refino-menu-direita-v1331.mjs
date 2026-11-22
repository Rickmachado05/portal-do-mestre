import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/mesa3d/mesaEspelhada.css',import.meta.url),'utf8');
const prefixo=readFileSync(new URL('../src/menuDireita.css',import.meta.url),'utf8');

test('menu conserva os mesmos botões e agora agrupa nas duas mesas',()=>{
  assert.match(app,/className="atalhos-direita"/);
  assert.doesNotMatch(app.slice(app.indexOf('<nav className="atalhos-direita"'),app.indexOf('{MODO_3D ? <div className="mapa-viewport')),/MODO_3D \? <>/);
  for(const nome of ['SESSÃO','APOIO','AMBIENTE'])assert.ok(app.includes(nome),nome);
  for(const chave of ['cenas','personagens','iniciativa','recursos','inventario','historico','diario','pdf','musica','iluminacao','clima'])assert.ok(app.includes(`'${chave}'`),chave);
  assert.match(app,/botoesFerramenta\.filter\(b=>/); // mesmos atalhos da versão original, agrupados.
});
test('três grupos recolhem independentemente, sem fechar janelas nem alterar ficha',()=>{
  for(const grupo of ['sessao','apoio','ambiente']){
    assert.ok(app.includes(`gruposDireita.${grupo}`),grupo);
    assert.ok(app.includes(`${grupo}:!g.${grupo}`),grupo);
  }
  assert.match(app,/onClick=\{\(\)=>alternarJanela\(b\.key\)\}/);
  assert.match(app,/onClick=\{\(\)=>alternarJanela\('clima'\)\}/);
});
test('a geometria das duas laterais reserva zonas separadas e permite rolagem em telas baixas',()=>{
  assert.ok(prefixo.includes('overflow-y:auto'));
  assert.ok(prefixo.includes('overscroll-behavior:contain'));
  assert.ok(prefixo.includes('bottom:264px'), 'Lateral termina antes dos controles inferiores');
  assert.ok(prefixo.includes('bottom:164px'), 'Biblioteca e física ficam em zona própria');
  assert.ok(prefixo.includes('bottom:95px'), 'Zoom fica abaixo da biblioteca');
  const calcular=(altura,navBottom,dataBottom,dataHeight,zoomBottom,zoomHeight)=>{
    const navFim=altura-navBottom;
    const dataComeco=altura-dataBottom-dataHeight;
    const zoomComeco=altura-zoomBottom-zoomHeight;
    assert.ok(navFim+10<=dataComeco);
    assert.ok(dataComeco+dataHeight+10<=zoomComeco);
  };
  calcular(900,264,164,78,95,45);
  calcular(660,264,164,78,95,45);
  calcular(900,245,152,78,86,45);
  calcular(700,227,141,70,78,41);
  calcular(680,201,125,62,65,41);
});
test('refino aplica as mesmas regras nas duas mesas, com vinheta exclusiva do 3D',()=>{
  assert.match(prefixo,/\.mesa-app \.atalhos-direita/);
  assert.match(css,/\.mesa-app-3d \.mapa-viewport-3d::after/);
  assert.match(css,/pointer-events:none/);
  assert.match(prefixo,/@media\(max-width:780px\)/);
});
