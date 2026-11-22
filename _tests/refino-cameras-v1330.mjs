import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>readFileSync(new URL(p,root),'utf8');
const portal=read('src/App.tsx');
const viewer=read('src/mesa3d/Mesa3DPrototipo.tsx');
const css=read('src/mesa3d/mesaEspelhada.css');
const embedded=read('src/mesa3d/visualizadorEmbutido.css');
test('seletor vertical do pai oferece apenas Visão Mestre e Terceira Pessoa',()=>{
  assert.match(portal,/className="hx-camera-mesa3d"/);
  assert.match(portal,/<span className="hx-camera-titulo">VISUALIZAÇÃO 3D<\/span>/);
  assert.match(portal,/♟ Visão Mestre/);
  assert.match(portal,/◉ Terceira Pessoa/);
  assert.match(css,/\.hx-camera-mesa3d\{display:flex;flex-direction:column/);
  assert.match(portal,/\{MODO_3D&&<div className="hx-camera-mesa3d"/);
});
test('a interface do 2D continua a mesma, sem duplicar as janelas na 3D',()=>{
  assert.match(portal,/MODO_3D \? <div className="mapa-viewport mapa-viewport-3d"/);
  assert.match(portal,/<JanelaFlutuante/);
  assert.match(portal,/className="barra-dados"/);
  assert.match(portal,/className="atalhos-direita"/);
  assert.match(embedded,/\.m3d-embutido \.m3d-mode-switch\{display:none!important\}/);
});
test('câmera de construção ortográfica é removida, edição usa câmera mestre',()=>{
  assert.match(viewer,/const cameraMestre=new THREE.PerspectiveCamera/);
  assert.doesNotMatch(viewer,/cameraConstruir|OrthographicCamera|atualizarCameraConstruir/);
  assert.match(viewer,/modoMestreRef.current\?cameraMestre:camera/);
  assert.match(viewer,/if\(modoMestreRef.current\)\{/);
  assert.match(viewer,/if\(modoEdicaoRef.current\)/);
});
test('paredes, portas e luz são construídas por clique na câmera livre, com pan e órbita',()=>{
  assert.match(viewer,/if\(tipo==='ferramenta'\)/);
  for(const nome of ['parede','porta','luz']) assert.ok(viewer.includes(`valor==='${nome}'`),nome);
  assert.match(viewer,/if\(botaoMouse===2\)\{\s*yawLivreRef\.current\+=dx\*\.007/);
  assert.match(viewer,/if\(botaoMouse===1\)\{\s*centroLivreRef\.current=deslocarAlvoCamera/);
  assert.match(viewer,/ferramentaRef.current==='parede'/);
  assert.match(viewer,/gravarCanvas\(\{\.\.\.cenarioRef\.current,objetos:/);
});
test('mensagens de câmera usam origin e frame correto, editor disponível no Organizar',()=>{
  assert.match(portal,/enviar3D\('camera',visao\)/);
  assert.match(viewer,/event.origin!==window.location.origin\|\|event.source!==window.parent/);
  assert.match(viewer,/if\(tipo==='camera'&&\(valor==='mestre'\|\|valor==='terceira'\)\)/);
  assert.match(portal,/Editar cenário na Visão Mestre/);
  assert.match(portal,/enviar3D\('editor','abrir'\)/);
  assert.match(viewer,/if\(tipo==='editor'/);
});
test('ferramentas de construção não ficam ativas em terceira pessoa',()=>{
  assert.match(portal,/if\(visao==='terceira'\)\{/);
  assert.match(portal,/enviar3D\('ferramenta','mover'\)/);
  assert.match(portal,/disabled=\{MODO_3D&&cameraMesa3D!=='mestre'\}/);
  assert.match(viewer,/setModoEdicao\(false\);modoEdicaoRef.current=false/);
});
