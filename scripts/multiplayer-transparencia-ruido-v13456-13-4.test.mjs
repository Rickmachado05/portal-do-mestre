import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fonte=readFileSync(new URL('../src/multiplayer/VideoDadosSemFundo.tsx',import.meta.url),'utf8');
const suavizar=x=>{const v=Math.max(0,Math.min(1,(x-.012)/(.085-.012)));return v*v*(3-2*v);};

test('cor pré-multiplicada compõe com a mesa sem divisão por alfa instável',()=>{
  assert.match(fonte,/premultipliedAlpha:true/);
  assert.match(fonte,/gl_FragColor=vec4\(min\(rgbPremultiplicado,vec3\(alfa\)\)\*limpeza,alfa\*limpeza\)/);
  assert.doesNotMatch(fonte,/vec3 cor=clamp\(rgbPremultiplicado\/max/);
  assert.match(fonte,/float limpeza=smoothstep\(0\.012,0\.085,alfa\)/);
  const transparencia=.025,ruidoRGB=.03;
  const valorExibido=ruidoRGB*suavizar(transparencia);
  assert.ok(valorExibido<.003,'resíduo pequeno do codec não deve ficar brilhante');
  assert.equal(suavizar(.085),1,'bordas opacas continuam com as cores originais');
  assert.equal(suavizar(0),0,'fundo fica completamente transparente');
});

test('Canvas 2D alternativo limita amplificação em pixels quase transparentes',()=>{
  assert.match(fonte,/const divisor=Math.max\(alfa,0\.12\)/);
  assert.match(fonte,/saida\.data\[o\+3\]=Math\.round\(alfa\*limpeza\*255\)/);
  assert.match(fonte,/ctx\.putImageData\(saida,0,0\)/);
});
