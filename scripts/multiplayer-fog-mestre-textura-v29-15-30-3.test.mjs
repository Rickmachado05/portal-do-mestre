import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fonte=readFileSync(new URL('../src/mesa3d/roomScene.ts',import.meta.url),'utf8');
const fn=(a,b)=>fonte.slice(fonte.indexOf(a),fonte.indexOf(b));

test('v29.15.30.9: Observar usa a imagem recortada, como na cena 3D do jogador',()=>{
  const compor=fn('const comporFogNoPisoDoMestre=', 'let visaoObservadorId:');
  assert.match(compor,/comporRecorteFogComoJogador3D\(ctx,origem as CanvasImageSource,telaVisao,w,h,opacidade\)/);
  assert.match(compor,/plantaMaterial\.map=texturaPreviaFogMestre/);
  assert.doesNotMatch(compor,/projetarFogNaPlanta3D\(/);
  assert.doesNotMatch(compor,/comporCamadaFogNaPlanta3D\(/);
  const mascara=fn('const configurarVisaoIndividual=', '// Moldura discreta');
  assert.match(mascara,/if\(previewNoPiso\)malhaVisao\.visible=false/);
  assert.match(mascara,/desenharVisaoCompartilhada3D\(ctxVisao,estadosFog/);
});

test('v29.15.30.9: sair da prévia recupera a imagem original sem reconstruir a cena',()=>{
  const restaurar=fn('const restaurarTexturaPisoAposObservar=', 'const comporFogNoPisoDoMestre=');
  assert.match(restaurar,/if\(plantaMaterial\.map===texturaPreviaFogMestre\)/);
  assert.match(restaurar,/plantaMaterial\.map=texturaPlanta/);
  const mascara=fn('const configurarVisaoIndividual=', '// Moldura discreta');
  assert.match(mascara,/if\(!tokenObservado&&!fog\?\.ativo\)\{\s*restaurarTexturaPisoAposObservar\(\)/);
  assert.match(mascara,/camadaMiniaturas\.configurarFiltroPersonagensVisiveis\(null\)/);
  assert.doesNotMatch(mascara,/configurarMiniaturas\(/);
});

test('v29.15.30.9: conserva Fog manual, exploração e estados inválidos seguros',()=>{
  const mascara=fn('const configurarVisaoIndividual=', '// Moldura discreta');
  assert.match(mascara,/desenharVisaoCompartilhada3D\(ctxVisao,estadosFog/);
  assert.match(mascara,/manualSomente/);
  assert.match(mascara,/const contornoValido=pontos.length>=3/);
  assert.match(mascara,/if\(tokenObservado&&!estadosFog&&!contornoValido\)/);
  assert.match(mascara,/restaurarTexturaPisoAposObservar\(\)/);
});
