import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const arquivo=(nome)=>readFileSync(new URL(`../${nome}`,import.meta.url),'utf8');

test('compositor não apaga sombras e detalhes escuros do dado',()=>{
  const capturar=arquivo('src/multiplayer/capturaDadosAlfa.ts');
  const compor=arquivo('src/multiplayer/VideoDadosSemFundo.tsx');
  assert.match(capturar,/globalCompositeOperation='source-in'/);
  assert.doesNotMatch(capturar,/#00ff00/);
  assert.match(capturar,/canvas\.captureStream\(fps\)/);
  assert.match(compor,/float alfa=clamp\(dot\(mascara/);
  assert.doesNotMatch(compor,/float intensidade=max\(cor\.r/);
  assert.match(compor,/const ctx=canvas\.getContext\('2d'/);
  assert.match(compor,/ctx\.putImageData/);
  const css=arquivo('src/multiplayer/Rolagem3DMultiplayer.css');
  assert.match(css,/\.pm-mp-video-composited\s*\{[^}]*mask-image:none/s);
});

test('o mestre não recebe mais cartão redundante de rolagem à direita',()=>{
  const mestre=arquivo('src/multiplayer/MultiplayerMestre.tsx');
  assert.doesNotMatch(mestre,/pm-mp-roll-toast/);
  assert.doesNotMatch(mestre,/setUltimaRolagem/);
  assert.match(mestre,/setRolagens\(prev=>prev\.some\(/);
  assert.match(mestre,/setUltimaAnimacao\(evento\.rolagem\)/);
});

test('indicador de dados é o mesmo nas mesas 2D, 3D e convidado',()=>{
  const mestre=arquivo('src/App.tsx');
  const convidado=arquivo('src/multiplayer/MesaConvidado2D.tsx');
  const aoVivo=arquivo('src/multiplayer/DadosAoVivoOverlay.tsx');
  assert.match(mestre,/rolagemDestacada\.pendente \? '⚄' : rolagemDestacada\.total/);
  assert.match(convidado,/rolagemFisica\.resultado\?\.total\?\?'⚄'/);
  assert.match(aoVivo,/resultado\?\.total\?\?'⚄'/);
  assert.doesNotMatch(mestre,/rolagemDestacada\.pendente \? 'Rolando/);
});
