import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quantidadeParticulasClima3D, vetorVentoClima3D, LIMITE_PARTICULAS_CLIMA_3D, DENSIDADE_NEBLINA_PADRAO_3D} from '../src/lib/weather3d.ts';
import {normalizarClima, CLIMA_PADRAO, TIPOS_CLIMA} from '../src/lib/weather.ts';
const ler=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const modulo=ler('../src/mesa3d/climaCena3D.ts');
const viewer=ler('../src/mesa3d/Mesa3DPrototipo.tsx');
const app=ler('../src/App.tsx');
for (const tipo of TIPOS_CLIMA.map(t=>t.id))test(`tipo ${tipo}: densidade controlada sem exceder o limite`,()=>{
 for(const valor of [0,1,40,75,100]){
  const n=quantidadeParticulasClima3D(tipo,valor);
  assert.ok(n>=0&&n<=LIMITE_PARTICULAS_CLIMA_3D);
  if(valor===0||tipo==='nenhum'||tipo==='neblina')assert.equal(n,0);
  else assert.ok(n>=1);
 }
});
test('direções do vento preservam os eixos usados na Mesa 2D',()=>{
 const casos=[[0,1,0],[90,0,1],[180,-1,0],[270,0,-1]];
 for(const [graus,x,z] of casos){const v=vetorVentoClima3D(graus,100);assert.ok(Math.abs(v.x-x)<1e-10&&Math.abs(v.z-z)<1e-10);}
 assert.deepEqual(vetorVentoClima3D(60,0),{x:0,z:0});
});
test('vento é limitado de 0 a 100 sem alterar o registro salvo',()=>{
 assert.ok(Math.abs(vetorVentoClima3D(0,20).x-.2)<1e-10);
 assert.equal(vetorVentoClima3D(90,200).z,1);
 assert.equal(vetorVentoClima3D(0,-3).x,0);
});
test('configurações antigas permanecem normalizáveis e sem clima por padrão',()=>{
 assert.deepEqual(normalizarClima(null),CLIMA_PADRAO);
 assert.deepEqual(normalizarClima({tipo:'neve',intensidade:75,vento:48,direcao:270}),{tipo:'neve',intensidade:75,vento:48,direcao:270});
 assert.equal(normalizarClima({tipo:'meteoro'}).tipo,'nenhum');
});
test('chuva, partículas e brumas são produzidas dentro do mundo 3D',()=>{
 for(const simbolo of ['new THREE.LineSegments','new THREE.Points','new THREE.Mesh(new THREE.PlaneGeometry','new THREE.CanvasTexture'])assert.ok(modulo.includes(simbolo),simbolo);
 for(const tipo of ['chuva','neve','cinzas','areia','folhas','neblina'])assert.ok(modulo.includes(tipo),tipo);
 assert.match(modulo,/cena\.add\(grupo\)/);assert.match(modulo,/grupo\.position\.set\(foco\.x/);
});
test('névoa climática permanece independente dos dados do Fog of War',()=>{
 assert.equal(DENSIDADE_NEBLINA_PADRAO_3D,.0025);
 assert.doesNotMatch(modulo,/fogExploracao|alterarMesaCompartilhada|exploracaoPorToken|configurarVisaoIndividual/);
 assert.match(modulo,/cena\.fog\.density\s*=/);assert.match(modulo,/densidadeAnterior/);
});
test('clima não entra na seleção e libera memória de GPU',()=>{
 assert.match(modulo,/chuva\.raycast=\(\)=>\{\}/);
 assert.match(modulo,/particulas\.raycast=\(\)=>\{\}/);
 assert.match(modulo,/cena\.remove\(grupo\)/);
 assert.match(modulo,/geometriaChuva\.dispose\(\)/);assert.match(modulo,/geometriaPontos\.dispose\(\)/);
 assert.match(modulo,/texturaNeblina\.dispose\(\)/);
});
test('clima atualiza a cada quadro sem reiniciar o palco nem as skins',()=>{
 assert.match(viewer,/climaCena3D\.atualizar\(dt,centro,r\)/);
 assert.match(viewer,/climaCena3D\.atualizar\(dt,\{x:foco\.x,z:foco\.z\},dist\)/);
 assert.match(viewer,/climaCena3DRef\.current\?\.configurar\(/);
 assert.match(viewer,/climaCena3D\.dispose\(\)/);
});
test('Mesa 2D notifica a iframe para atualização imediata das opções do clima',()=>{
 assert.match(app,/enviar3D\('clima-atualizado'\)/);
 assert.match(viewer,/if\(tipo==='clima-atualizado'\)/);
});
test('painel 3D expõe intensidade, vento, direção, pausa e remoção',()=>{
 for(const campo of ['m3d-weather-type','m3d-weather-intensity','m3d-weather-wind','m3d-weather-direction','m3d-weather-pause'])assert.ok(viewer.includes(campo),campo);
 assert.match(viewer,/mudarClima\(\{tipo:'nenhum'\}\)/);
 assert.match(viewer,/setPausarClima3D/);
});
test('animações respeitam movimento reduzido, aba oculta e limite de delta',()=>{
 assert.match(modulo,/prefers-reduced-motion: reduce/);
 assert.match(modulo,/document\.hidden/);
 assert.match(modulo,/clamp\(delta,0,\.05\)/);
});
