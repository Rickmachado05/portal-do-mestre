import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fonte=(caminho)=>readFileSync(new URL(caminho,import.meta.url),'utf8');
const tresD=fonte('../src/multiplayer/MesaConvidado3D.tsx');
const interfaceJogador=fonte('../src/multiplayer/MesaConvidado2D.tsx');
const css=fonte('../src/multiplayer/MesaConvidado2DParity.css');
const servidor=fonte('./multiplayer-server.mjs');
const mestre=fonte('../src/mesa3d/Mesa3DPrototipo.tsx');

test('v29.15.16: aviso de atribuição é curto, centralizado e não atravessa o menu de câmeras',()=>{
  assert.match(interfaceJogador,/Aguardando o mestre atribuir seu personagem\./);
  assert.doesNotMatch(interfaceJogador,/Você pode acompanhar a cena e conversar enquanto isso/);
  assert.match(css,/\.pm-jogo \.pm-jogo-atribuicao\{top:76px/);
  assert.match(css,/max-width:min\(310px,calc\(100vw - 250px\)\)/);
});

test('v29.15.16: câmera tática congela durante o arrasto, depois recupera suavemente o enquadramento do mestre',()=>{
  assert.match(tresD,/if\(modo==='tatica'\)cameraTaticaEmArrasto=true/);
  assert.match(tresD,/inicio=null;cameraTaticaEmArrasto=false/);
  assert.match(tresD,/else if\(!cameraTaticaEmArrasto\)/);
  assert.match(tresD,/const suavidade=1-Math\.exp\(-dt\*3\.5\)/);
  assert.match(tresD,/posCameraTatica\.lerp\(destino,suavidade\)/);
  assert.match(tresD,/focoCameraTatica\.lerp\(focoDesejado,suavidade\)/);
  assert.match(mestre,/const t=1-Math\.exp\(-dt\*3\.5\)/);
  assert.match(tresD,/modo==='tatica'\?52:62/);
});

test('v29.15.16: WASD move o personagem localmente a cada frame com velocidade igual ao mestre',()=>{
  assert.match(tresD,/moverNoCenario3D\(anterior,\{x:direcao\.x\*velocidade\*dt,z:direcao\.z\*velocidade\*dt\},configuracao\)/);
  assert.match(tresD,/const velocidade=teclas\.has\('shift'\)\?5\.25:3\.05/);
  assert.match(mestre,/\?5\.25:3\.05/);
  assert.match(tresD,/sala\.visualizarToken\(proprio,caminhadaLocal\.x,caminhadaLocal\.z\)/);
  assert.match(tresD,/posicoes\.set\(proprio,\{x:caminhadaLocal\.x,z:caminhadaLocal\.z\}\)/);
  assert.doesNotMatch(tresD,/seguir\.x\+\.48\*move\.x/);
});

test('v29.15.16: sincronização contínua publica pontos compactados e finaliza sem retirar validação do servidor',()=>{
  assert.match(tresD,/tempo-caminhadaLocal\.ultimoEnvio>=100/);
  assert.match(tresD,/solicitarRef\.current\(Math\.round\(p\.x\*100\)\/100,Math\.round\(p\.y\*100\)\/100,false\)/);
  assert.match(tresD,/solicitarRef\.current\(Math\.round\(p\.x\*100\)\/100,Math\.round\(p\.y\*100\)\/100,true\)/);
  assert.match(tresD,/oficiais\.get\(caminhadaLocal\.id\)/);
  assert.match(tresD,/tempo>caminhadaLocal\.ate/);
  assert.match(servidor,/if\(!pessoa\.personagemId\)/);
  assert.match(servidor,/token\.travado/);
  assert.match(servidor,/publicarSomenteMestre\(sala,\{tipo:'pedido-movimento'/);
});
