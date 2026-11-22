import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>readFileSync(new URL(p,root),'utf8');
test('as duas rotas usam literalmente o mesmo aplicativo React de mestragem',()=>{
  assert.match(read('mesa/index.html'),/src\/main\.tsx/);
  assert.match(read('mesa3d/index.html'),/src\/main\.tsx/);
  const app=read('src/App.tsx');
  for(const marker of ['<JanelaFlutuante','titulo={usaRegrasImpeto ? "Ficha de combate · Ímpeto"','recurso-cabecalho','imp-escudo-cabecalho','<InventarioMesa','<Dados3D','<MusicaMesa','barra-ferramentas-mapa','galeria-personagens'])assert.ok(app.includes(marker),marker);
  assert.match(app,/MODO_3D/);assert.match(app,/mesa-3d-visualizador/);
});
test('só o mapa central é substituído pelo WebGL, mantendo janelas e barras originais',()=>{
  const app=read('src/App.tsx');assert.match(app,/MODO_3D \? <div className="mapa-viewport mapa-viewport-3d"/);
  assert.match(app,/: <div className="mapa-viewport" ref=\{viewportRef\}/);
  assert.match(app,/className="barra-dados"/);
  assert.match(app,/className="atalhos-direita"/);
  assert.match(read('mesa3dviewer/index.html'),/src\/mesa3d\/main\.tsx/);
});
test('a comunicação com o visualizador é limitada à mesma origem e sincroniza cenas',()=>{
  const parent=read('src/App.tsx'),viewer=read('src/mesa3d/Mesa3DPrototipo.tsx');
  for(const key of ['postMessage','window.location.origin','event.source!==window.parent','tipo===\'cena\'','tipo===\'selecionar\'','tipo===\'ferramenta\'','tipo===\'zoom\''])assert.ok(parent.includes(key)||viewer.includes(key),key);
  assert.match(parent,/addEventListener\('storage',sincronizar\)/);
  assert.match(viewer,/alterarCena\(atual.cenaAtivaId,false\)/);
});
test('configuração de build inclui o visualizador 3D independente da interface',()=>{
  const vite=read('vite.config.ts');assert.match(vite,/mesa3d: fileURLToPath/);assert.match(vite,/mesa3dviewer: fileURLToPath/);
  const visualizerCss=read('src/mesa3d/visualizadorEmbutido.css');assert.match(visualizerCss,/\.m3d-embutido \.m3d-side-tools/);
  assert.match(visualizerCss,/m3d-embutido-construcao/);
});
test('ferramentas ainda não renderizadas no 3D são explicitamente bloqueadas',()=>{
  const app=read('src/App.tsx');assert.match(app,/disabled=\{MODO_3D\|\|!fogManual\}/);
  assert.match(app,/disabled=\{MODO_3D\} className=\{ferramentaMapa==='marcador'/);
  assert.match(app,/disabled=\{MODO_3D\} title=\{MODO_3D\?/);
});
