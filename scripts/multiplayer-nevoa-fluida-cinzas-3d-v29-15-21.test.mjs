import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL(`../src/${p}`,import.meta.url),'utf8');

// A v29.15.22 substitui a suavização da v29.15.21 a pedido do usuário.
test('v29.15.30: mantém o fog nítido, no chão e sem cobrir modelos e standees',()=>{
  const cena=src('mesa3d/roomScene.ts');
  assert.match(cena,/materialVisao=new THREE\.MeshBasicMaterial\(\{[^}]*depthTest:true/);
  assert.match(cena,/malhaVisao\.renderOrder=1;malhaVisao\.position\.y=ALTURA_FOG_PISO_3D/);
  assert.match(cena,/figura\.renderOrder=2/);
  assert.doesNotMatch(cena,/malhaVisao\.renderOrder=60/);
  assert.doesNotMatch(cena,/ctxVisao\.filter='blur/);
  assert.match(cena,/desenharVisaoCompartilhada3D/);
  assert.match(src('mesa3d/desenharVisaoCompartilhada3D.ts'),/rgba\(8,14,24,0\.73\)/);
});
test('v29.15.22: fila atômica usa textura censurada e máscara do mesmo quadro',()=>{
  const player=src('multiplayer/MesaConvidado3D.tsx');
  const gerador=src('multiplayer/visaoIndividualPublicada.ts');
  assert.match(player,/while\(ativo&&recortePendente\)/);
  assert.match(player,/await sala\.atualizarPisoRecorte\(blob\)/);
  assert.match(player,/sala\.configurarFogPublicado3D\(quadro\.mascara,quadro\.cenario,quadro\.poligono\)/);
  assert.match(player,/sala\.configurarFogPublicado3D\('0'\.repeat\(2304\),novoCenario\)/);
  assert.match(gerador,/serializarRecorteSeguro\(canvas\)/);
  assert.doesNotMatch(gerador,/return args\.imagem/);
});
test('v29.15.21: clima de cinzas permanece no motor compartilhado e melhora a visibilidade em 3D',()=>{
  const clima=src('mesa3d/climaCena3D.ts');
  const math=src('lib/weather3d.ts');
  const player=src('multiplayer/MesaConvidado3D.tsx');
  assert.match(clima,/config\.tipo==='cinzas'\?\.21/);
  assert.match(clima,/config\.tipo==='cinzas'\?\.88/);
  assert.match(clima,/const altura=config\.tipo==='cinzas'/);
  assert.match(clima,/\(config\.tipo==='cinzas'\?1:-1\)/);
  assert.match(math,/tipo === 'cinzas' \? 0\.96/);
  assert.match(player,/clima\.configurar\(climaConfiguradoRef\.current,climaPausadoRef\.current\)/);
  assert.match(player,/clima\.atualizar\(dt,/);
});
