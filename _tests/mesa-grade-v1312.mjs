import assert from 'node:assert/strict';
import test from 'node:test';
import { GRADE_PADRAO, encaixarNaGrade, normalizarGrade } from '../src/lib/mapGrid.ts';
import { duplicarDadosDaCena } from '../src/lib/cloneScene.ts';

test('legacy scenes load with grid disabled and no snap', () => {
  assert.deepEqual(normalizarGrade(undefined), GRADE_PADRAO);
  assert.deepEqual(normalizarGrade({ visivel: true, encaixarTokens: true, colunas: 0, linhas: 999 }), {
    visivel: true, encaixarTokens: true, colunas: 4, linhas: 60,
  });
  assert.equal(normalizarGrade({ colunas: Number.NaN }).colunas, 20);
});

test('snapping positions tokens at cell centers, independent from map pixels', () => {
  const grid = normalizarGrade({ visivel: true, encaixarTokens: true, colunas: 20, linhas: 10 });
  assert.deepEqual(encaixarNaGrade({ x: 0, y: 0 }, grid), { x: 2.5, y: 5 });
  assert.deepEqual(encaixarNaGrade({ x: 21.4, y: 73 }, grid), { x: 22.5, y: 75 });
  assert.deepEqual(encaixarNaGrade({ x: 100, y: 100 }, grid), { x: 97.5, y: 95 });
});

test('scene duplication deep-clones tokens, fog, doors, lighting, and grid', () => {
  const source = {
    id:'scene-1', nome:'Templo', temMapa:true,
    tokens:{ a:{x:20,y:70}}, nevoa:[{ id:'f1', pontos:[{x:1,y:1}] }],
    barreiras:[{id:'door1',aberta:false}], fontesLuz:[{id:'light1',ativa:true}],
    grade:normalizarGrade({visivel:true,encaixarTokens:true}),
  };
  const copy = duplicarDadosDaCena(source, 'scene-2');
  assert.equal(copy.id,'scene-2');
  assert.equal(copy.nome,'Templo (cópia)');
  assert.deepEqual(copy.tokens, source.tokens);
  assert.deepEqual(copy.nevoa, source.nevoa);
  assert.deepEqual(copy.barreiras, source.barreiras);
  assert.deepEqual(copy.fontesLuz, source.fontesLuz);
  copy.tokens.a.x = 99;
  copy.nevoa[0].pontos[0].x = 50;
  copy.barreiras[0].aberta = true;
  copy.fontesLuz[0].ativa = false;
  copy.grade.visivel = false;
  assert.equal(source.tokens.a.x,20);
  assert.equal(source.nevoa[0].pontos[0].x,1);
  assert.equal(source.barreiras[0].aberta,false);
  assert.equal(source.fontesLuz[0].ativa,true);
  assert.equal(source.grade.visivel,true);
});
