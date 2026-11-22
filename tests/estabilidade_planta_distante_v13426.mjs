import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sala=readFileSync(new URL('../src/mesa3d/roomScene.ts',import.meta.url),'utf8');
const mesa=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
const extrairNumero=(texto,regex)=>{
  const valor=texto.match(regex)?.[1];assert.ok(valor,`Valor ausente: ${regex}`);return Number(valor);
};
test('planta separada da face superior do piso para evitar z-fighting distante',()=>{
  const pisoY=extrairNumero(sala,/colocar\(18,\.35,17,floorMat,0,(-?[\d.]+),0,true\)/);
  const topo=pisoY+.35/2;
  const imagem=extrairNumero(sala,/const ALTURA_PLANTA_3D=([-\d.]+)/);
  const contorno=extrairNumero(sala,/const ALTURA_CONTORNO_PLANTA_3D=([-\d.]+)/);
  assert.ok(imagem-topo>=.045,`Distância entre piso e imagem insuficiente: ${imagem-topo}`);
  assert.ok(contorno>topo&&contorno<imagem,'A borda deve ficar acima do piso e sob a imagem');
  assert.ok(imagem<.034,'A imagem não pode cobrir as bases dos tokens');
  assert.match(sala,/planta\.position\.set\(x,ALTURA_PLANTA_3D,z\)/);
  assert.match(sala,/contorno\.position\.set\(x,ALTURA_CONTORNO_PLANTA_3D,z\)/);
});
test('planta não recebe sombra projetada e material usa profundidade estável',()=>{
  assert.match(sala,/planta\.receiveShadow=false/);
  assert.match(sala,/polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1/);
  assert.match(sala,/new THREE\.MeshStandardMaterial\(\{/);
  assert.match(sala,/plantaMaterial\.opacity=construindo\?/);
});
test('precisão ajustada para Visão de Mesa, Terceira Pessoa e câmera Tática/Personagem',()=>{
  const cameras=[...mesa.matchAll(/new THREE\.PerspectiveCamera\((\d+),1,([\d.]+),450\)/g)];
  assert.equal(cameras.length,3);
  assert.deepEqual(cameras.map(m=>Number(m[2])),[.25,.25,.25]);
  assert.deepEqual(cameras.map(m=>Number(m[1])),[62,48,52]);
});
test('somente renderização, sem mudanças de parâmetros do cálculo tático',()=>{
  assert.match(mesa,/calcularEnquadramentoCinematico\(/);
  assert.match(mesa,/idsParaEnquadrarCombate\(/);
  assert.match(mesa,/Reenquadrar combate/);
  assert.match(sala,/configurarVisaoIndividual/);
});
