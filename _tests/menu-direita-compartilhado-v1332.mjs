import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const read=(f)=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
const app=read('App.tsx');
const common=read('menuDireita.css');
const three=read('mesa3d/mesaEspelhada.css');
const src=app.slice(app.indexOf('<nav className="atalhos-direita"'), app.indexOf('{MODO_3D ? <div className="mapa-viewport'));

test('a Mesa 2D e a Mesa 3D utilizam o MESMO menu recolhível',()=>{
  assert.ok(src.includes('SESSÃO')&&src.includes('APOIO')&&src.includes('AMBIENTE'));
  assert.doesNotMatch(src,/MODO_3D\s*\?/);
  assert.match(app,/import '\.\/menuDireita\.css'/);
  assert.match(app,/className="atalhos-direita"/);
  assert.equal((src.match(/<nav /g)||[]).length,1);
  assert.equal((src.match(/hx-dock-grupo/g)||[]).length,3);
});
test('grupos recolhem independentemente, mantendo os estados das janelas',()=>{
  for(const g of ['sessao','apoio','ambiente']){
    assert.ok(app.includes(`gruposDireita.${g}`));
    assert.ok(app.includes(`${g}:!g.${g}`));
  }
  assert.match(src,/onClick=\{\(\)=>alternarJanela\(b\.key\)\}/);
  assert.match(src,/onClick=\{\(\)=>alternarJanela\('clima'\)\}/);
  assert.match(src,/onClick=\{\(\)=>alternarJanela\('iluminacao'\)\}/);
});
test('nenhuma ação foi omitida e cada atalho abre a mesma janela da v1.3.31',()=>{
  const grupos={
    sessao:['cenas','personagens','iniciativa','recursos','inventario','historico'],
    apoio:['diario','pdf','musica'],
    ambiente:['iluminacao','clima'],
  };
  for(const [group,keys] of Object.entries(grupos)){
    const block=src.slice(src.indexOf(`gruposDireita.${group}&&`),src.indexOf('</section>',src.indexOf(`gruposDireita.${group}&&`)));
    for(const key of keys)assert.ok(block.includes(`'${key}'`)||block.includes(`.${key}.aberta`),`${group}: ${key}`);
  }
});
test('a lateral e controles têm estilos genéricos, não somente para o modo 3D',()=>{
  assert.match(common,/\.mesa-app \.atalhos-direita\{/);
  assert.match(common,/overflow-y:auto/);
  assert.match(common,/overscroll-behavior:contain/);
  for(const s of ['.mesa-app .hx-dock-grupo','.mesa-app .hd-dados-central','.mesa-app .navegacao-mapa','.mesa-app .barra-ferramentas-mapa'])assert.ok(common.includes(s),s);
  assert.ok(common.includes('bottom:264px'));
  assert.ok(common.includes('bottom:164px'));
  assert.ok(common.includes('bottom:95px'));
  assert.match(common,/@media\(max-width:780px\)/);
  assert.match(common,/@media\(max-width:520px\)/);
});
test('a névoa e o mapa da Mesa 2D não recebem a vinheta exclusiva do 3D',()=>{
  assert.match(three,/\.mesa-app-3d \.mapa-viewport-3d::after/);
  assert.doesNotMatch(common,/mapa-viewport-3d::after|mapa-viewport::after/);
  assert.doesNotMatch(common,/\.mesa-app-3d/);
  assert.match(app, /MODO_3D \? <div className="mapa-viewport mapa-viewport-3d"/);
});
test('a CSS compartilhada não altera as regras de fichas/combate/itens',()=>{
  assert.doesNotMatch(common,/\.recurso\b|\.janela-flutuante\b|\.token\b|\.barra-recurso\b|\.inventario/);
});
