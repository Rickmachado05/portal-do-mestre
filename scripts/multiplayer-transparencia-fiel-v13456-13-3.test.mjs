import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const arquivo=(nome)=>readFileSync(new URL(`../${nome}`,import.meta.url),'utf8');

test('captura transmite RGB real e máscara alfa em painéis separados',()=>{
  const fonte=arquivo('src/multiplayer/capturaDadosAlfa.ts');
  assert.match(fonte,/canvas\.width!==w\*2/);
  assert.match(fonte,/contexto\.drawImage\(origem,0,0,w,h\)/);
  assert.match(fonte,/contextoMascara\.globalCompositeOperation='source-in'/);
  assert.match(fonte,/contextoMascara\.fillStyle='#ffffff'/);
  assert.match(fonte,/contexto\.drawImage\(mascara,w,0,w,h\)/);
  assert.match(fonte,/canvas\.captureStream\(fps\)/);
  assert.doesNotMatch(fonte,/fillStyle='#00ff00'/);
});

test('compositor monta as duas metades e não gera verde/roxo por color key',()=>{
  const fonte=arquivo('src/multiplayer/VideoDadosSemFundo.tsx');
  assert.match(fonte,/vec3 rgbPremultiplicado=texture2D\(imagem,vec2\(uv\.x\*0\.5,uv\.y\)\)/);
  assert.match(fonte,/vec3 mascara=texture2D\(imagem,vec2\(0\.5\+uv\.x\*0\.5,uv\.y\)\)/);
  assert.match(fonte,/gl_FragColor=vec4\(min\(rgbPremultiplicado,vec3\(alfa\)\)\*limpeza,alfa\*limpeza\)/);
  assert.match(fonte,/premultipliedAlpha:true/);
  assert.doesNotMatch(fonte,/rgbPremultiplicado\/max\(alfa/);
  assert.doesNotMatch(fonte,/vec3\(0\.0,1\.0,0\.0\)/);
  assert.doesNotMatch(fonte,/smoothstep\(0\.075/);
});

test('modo compatível sem WebGL também recupera alfa e não exibe quadros brutos',()=>{
  const fonte=arquivo('src/multiplayer/VideoDadosSemFundo.tsx');
  const css=arquivo('src/multiplayer/Rolagem3DMultiplayer.css');
  assert.match(fonte,/modo2d\?'compositor-2d':'compositor-webgl'/);
  assert.match(fonte,/ctx\.createImageData\(w,h\)/);
  assert.match(fonte,/ctx\.putImageData\(saida,0,0\)/);
  assert.match(css,/\.pm-mp-rolagem-3d \.pm-mp-video-source\{opacity:0/);
});
