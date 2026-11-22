import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ler=nome=>readFileSync(new URL(`../src/lib/${nome}`,import.meta.url),'utf8');

test('v29.13.1: publicador importa o teste geométrico do módulo que realmente o exporta',()=>{
  const gerador=readFileSync(new URL('../src/multiplayer/visaoIndividualPublicada.ts',import.meta.url),'utf8');
  const visao=ler('visaoIndividual.ts');
  const lighting=ler('lighting.ts');
  assert.match(gerador,/import\s*\{\s*pontoDentroDoPoligono\s*\}\s*from\s*['"]\.\.\/lib\/visaoIndividual['"]/);
  assert.match(gerador,/import\s*\{\s*calcularPoligonoVisao,\s*type BarreiraMapa,\s*type Ponto\s*\}\s*from\s*['"]\.\.\/lib\/lighting['"]/);
  assert.match(visao,/export\s+function\s+pontoDentroDoPoligono\s*\(/);
  assert.match(lighting,/export\s+function\s+calcularPoligonoVisao\s*\(/);
  assert.doesNotMatch(gerador,/pontoDentroDoPoligono[^;]*from\s*['"]\.\.\/lib\/lighting['"]/);
});
