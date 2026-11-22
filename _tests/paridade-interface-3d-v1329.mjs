import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const r=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('o layout é o mesmo componente App nos modos 2D e 3D',()=>{
  assert.match(r('mesa/index.html'),/src\/main\.tsx/);
  assert.match(r('mesa3d/index.html'),/src\/main\.tsx/);
  assert.match(r('src/App.tsx'),/JanelaFlutuante/);
  assert.match(r('src/App.tsx'),/MODO_3D/);
});
test('visualizador WebGL fica isolado sem duplicar a administração',()=>{
  assert.match(r('mesa3dviewer/index.html'),/src\/mesa3d\/main\.tsx/);
  assert.match(r('src/mesa3d/visualizadorEmbutido.css'),/m3d-embutido/);
});
