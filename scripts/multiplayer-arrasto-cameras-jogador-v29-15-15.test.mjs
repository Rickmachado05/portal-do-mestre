import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fonte=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
const player=fonte('../src/multiplayer/MesaConvidado3D.tsx');
const playerUI=fonte('../src/multiplayer/MesaConvidado2D.tsx');
const guest=fonte('../src/multiplayer/Convidado.tsx');
const master=fonte('../src/mesa3d/Mesa3DPrototipo.tsx');
const camera=fonte('../src/mesa3d/cameraTerceiraCompartilhada.ts');

test('v29.15.15: o clique seleciona somente o próprio personagem na Mesa e Tática 3D',()=>{
  assert.match(player,/modo==='mesa'\|\|modo==='tatica'/);
  assert.match(player,/sala\.tokenAtingido\(raycaster\)/);
  assert.match(player,/tokenSelecionado=atingido===idAtual\.current\?atingido:null/);
  assert.match(player,/sala\.selecionarToken\(tokenSelecionado\)/);
  assert.match(player,/if\(tokenSelecionado&&podeMoverRef\.current\)/);
  assert.match(player,/if\(inicio\.acao==='token'\)/);
  assert.doesNotMatch(player,/sala\.selecionarToken\(atingido\)/);
});

test('v29.15.15: arrasto envia amostras autorizadas sem teleporte ao soltar na parede',()=>{
  assert.match(player,/solicitarRef\.current\(percentual\.x,percentual\.y,false\)/);
  // A validação das paredes é do mestre: soltar não sobrescreve amostras ainda em voo.
  const finalizar=player.slice(player.indexOf('const terminar=(e:PointerEvent)=>'),player.indexOf('const cancelar=(e:PointerEvent)=>'));
  assert.doesNotMatch(finalizar,/solicitarRef\.current\(/);
  // v29.15.30.13: a previsão no mouse foi retirada porque atravessava paredes
  // enquanto o mestre rejeitava o movimento. Só o estado oficial move o token.
  assert.doesNotMatch(player,/previaLocal=\{/);
  assert.match(player,/registrar\(token.id,oficial.x,oficial.y\)/);
  assert.match(player,/posicaoPermitidaNaMesa3D\(ponto,configuracao,outros\)/);
  assert.match(guest,/onMoverPonto=\{\(x,y,final=true\)=>\{if\(podeMover\)enviarMovimento\(x,y,final\)/);
  assert.match(guest,/\}\,\[credencial\?\.codigo,credencial\?\.token\]\)/); // o ciclo de vida da conexão permanece
});

test('v29.15.15: clique no chão removido; câmeras e seleção são ações distintas',()=>{
  assert.doesNotMatch(playerUI,/Mover no chão|movimentar3D|setMovimentar3D/);
  assert.doesNotMatch(player,/movimentar:boolean|ferramentaRef|Clique no chão para solicitar/);
  assert.match(player,/e\.button===2\|\|e\.button===0&&\(modo==='terceira'\|\|modo==='personagem'\)/);
  assert.match(player,/acao='pan'/);
});

test('v29.15.15: mesma função de câmera para mestre e convidado, com zoom e foco do mestre',()=>{
  assert.match(master,/posicionarCameraTerceira3D\(camera,foco,yaw,dist,elevacaoCamera\)/);
  assert.match(player,/posicionarCameraTerceira3D\(camera3d,focoTerceira,anguloTerceira,distanciaTerceira,elevacaoTerceira\)/);
  assert.match(player,/focoTerceira\.lerp\(destino,1-Math\.exp\(-dt\*CAMERA_TERCEIRA_3D\.suavizacao\)\)/);
  assert.match(camera,/alturaDoFoco:1\.14/);
  assert.match(camera,/ajusteDaMira:\.22/);
  assert.match(camera,/distanciaInicial:5\.2/);
  assert.match(player,/direcaoCamera\(frente,lateral,anguloTerceira\)/);
});
