import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const arquivo=(nome)=>readFileSync(new URL(`../${nome}`,import.meta.url),'utf8');

test('vídeo ao vivo e gravado compartilham a composição transparente sem chroma key',()=>{
  const aoVivo=arquivo('src/multiplayer/DadosAoVivoOverlay.tsx');
  const gravado=arquivo('src/multiplayer/Rolagem3DMultiplayer.tsx');
  assert.match(aoVivo,/<VideoDadosSemFundo stream=\{stream\}/);
  assert.match(gravado,/<VideoDadosSemFundo key=\{videoUrl\} src=\{videoUrl\}/);
  const compositor=arquivo('src/multiplayer/VideoDadosSemFundo.tsx');
  assert.match(compositor,/getContext\('webgl'/);
  assert.match(compositor,/uniform sampler2D imagem/);
  assert.match(compositor,/float alfa=clamp\(dot\(mascara/);
  assert.match(compositor,/vec2\(0\.5\+uv\.x\*0\.5,uv\.y\)/);
  assert.doesNotMatch(compositor,/distance\(cor\.rgb,vec3\(0\.0,1\.0,0\.0\)\)/);
  assert.match(compositor,/ctx\.putImageData\(saida/);
  assert.match(compositor,/gl\.drawArrays\(/);
  assert.match(compositor,/onPrimeiroFrame\?\.\(\)/);
});

test('captura codifica cor e máscara de alfa na mesma trilha sem repetir a física',()=>{
  const dados=arquivo('src/Dados3D.tsx');
  const rede=arquivo('src/multiplayer/dadosAoVivo.ts');
  assert.match(dados,/capturarDadosComAlfaSeparado\(canvas,30\)/);
  const captura=arquivo('src/multiplayer/capturaDadosAlfa.ts');
  assert.match(captura,/canvas\.captureStream\(fps\)/);
  assert.match(captura,/canvas\.width!==w\*2/);
  assert.match(captura,/contexto\.drawImage\(origem,0,0,w,h\)/);
  assert.match(captura,/contextoMascara\.globalCompositeOperation='source-in'/);
  assert.match(captura,/contexto\.drawImage\(mascara,w,0,w,h\)/);
  assert.doesNotMatch(captura,/#00ff00/);
  assert.match(dados,/videoBitsPerSecond:2_800_000/);
  assert.match(rede,/maxBitrate:2_800_000/);
  assert.match(rede,/scaleResolutionDownBy:1/);
  assert.match(rede,/degradationPreference='maintain-resolution'/);
  const visual=arquivo('src/multiplayer/Rolagem3DMultiplayer.css');
  assert.match(visual,/object-fit:contain/);
  assert.match(visual,/\.pm-mp-video-composited/);
  assert.match(visual,/background:transparent/);
  assert.doesNotMatch(arquivo('src/multiplayer/VideoDadosSemFundo.tsx'),/\.roll\(/);
});
