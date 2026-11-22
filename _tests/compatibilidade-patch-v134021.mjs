import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajustarProporcaoMapaCompartilhado3D } from '../src/mesa3d/editorCena3D.ts';

test('export da correção de proporção existe e pode ser importado pelo visualizador', () => {
  assert.equal(typeof ajustarProporcaoMapaCompartilhado3D, 'function');
  const cena = { versao: 1, base: 'vazia', objetos: [], mapaUnico: true, piso: 'imagem', larguraTerreno: 22, profundidadeTerreno: 13.75 };
  const resultado = ajustarProporcaoMapaCompartilhado3D(cena, 0.625);
  assert.equal(resultado.larguraTerreno, 13.75);
  assert.equal(resultado.profundidadeTerreno, 22);
});
