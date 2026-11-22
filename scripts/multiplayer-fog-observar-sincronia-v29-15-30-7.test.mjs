import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {projetarFogNaPlanta3D} from '../src/mesa3d/projecaoFogPlanta3D.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sala=readFileSync(resolve(root,'src/mesa3d/roomScene.ts'),'utf8');
const mesa=readFileSync(resolve(root,'src/mesa3d/Mesa3DPrototipo.tsx'),'utf8');

test('v29.15.30.7: Observar prefere a posição visual do personagem à posição persistida',()=>{
  const trecho=sala.slice(sala.indexOf('const configurarVisaoIndividual='),sala.indexOf('// Moldura discreta'));
  assert.match(trecho,/const grupoObservado=tokenObservado\?/);
  assert.match(trecho,/outros\.get\(observadorId!\)\?\.grupo/);
  assert.match(trecho,/chaoParaPercentual3D\(\{x:grupoObservado\.position\.x,z:grupoObservado\.position\.z\},cenario\)/);
  assert.match(trecho,/\.\.\.posicaoVisual,\.\.\.posicaoAtual/,'arrasto deve prevalecer sobre a posição atual do objeto');
});

test('v29.15.30.7: Fog acompanha WASD e arrasto antes de gravar na campanha',()=>{
  assert.match(mesa,/const atualizarFogDuranteMovimento=\(uid:string,p:/);
  assert.match(mesa,/sala\.visualizarToken\(idRef\.current,candidato\.x,candidato\.z\);\s*atualizarFogDuranteMovimento\(idRef\.current,candidato\);/);
  assert.match(mesa,/previewToken=ponto;sala\.visualizarToken\(tokenArrastado,ponto\.x,ponto\.z\);[\s\S]*?atualizarFogDuranteMovimento\(tokenArrastado,ponto\);/);
  assert.match(mesa,/atualizarFogDuranteMovimento\(tokenArrastado,previewToken,true\);/);
  assert.match(mesa,/ultimaPreviaFogLocal<40/,'limitar publicações da máscara sem esperar gravação do estado');
});

test('v29.15.30.7: recorte recalculado assim que o piso é carregado',()=>{
  assert.match(mesa,/\[visaoIndividualId,estado,salaPronta,mapaPronto,cenaId,cenario/);
});

test('v29.15.30.7: coordenadas da máscara continuam alinhadas à planta deslocada',()=>{
  const p=projetarFogNaPlanta3D({x:4,z:-3,largura:16,altura:12},
    {minX:-4,minZ:-9,largura:16,altura:12},1600,1200);
  assert.deepEqual(p,{x:0,y:0,largura:1600,altura:1200});
  const deslocado=projetarFogNaPlanta3D({x:0,z:0,largura:20,altura:12},
    {minX:-10,minZ:-6,largura:20,altura:12},1000,600);
  const px=(3-deslocado.x)/deslocado.largura*1000;
  assert.ok(px>=0);
});
