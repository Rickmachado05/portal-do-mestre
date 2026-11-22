import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CHAVE_POSICAO_EDITOR_HUD, limitarPosicaoEditorHud, posicaoInicialEditorHud,
  sanitizarPosicaoEditorHud, lerPosicaoEditorHud, salvarPosicaoEditorHud,
  restaurarPosicaoEditorHud,
} from '../src/hexatombe/posicaoEditorArrastavel.ts';

const fonte = readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.css', import.meta.url), 'utf8');

function storageFalso() {
  const dados = new Map();
  return {
    getItem: chave => dados.get(chave) ?? null,
    setItem: (chave, valor) => { dados.set(chave, String(valor)); },
    removeItem: chave => { dados.delete(chave); },
  };
}

test('editor começa em lugar previsível e acessível na tela', () => {
  for (const [w, h] of [[1649, 928], [1280, 720], [820, 650], [390, 844], [320, 450]]) {
    const p = posicaoInicialEditorHud(w, h);
    assert.deepEqual(p, limitarPosicaoEditorHud(p, w, h));
    assert.ok(p.left >= 8 && p.top >= 8);
    assert.ok(p.left <= w - Math.min(290, w - 16) - 8);
  }
  assert.deepEqual(posicaoInicialEditorHud(1649, 928), {left: 258, top: 225});
});

test('arrasto pode escolher qualquer posição visível dentro dos limites da viewport', () => {
  const w = 1649, h = 928;
  assert.deepEqual(limitarPosicaoEditorHud({left: 560, top: 350}, w, h), {left: 560, top: 350});
  assert.deepEqual(limitarPosicaoEditorHud({left: -100, top: -100}, w, h), {left: 8, top: 80});
  assert.deepEqual(limitarPosicaoEditorHud({left: 2000, top: 2000}, w, h), {left: 1351, top: 490});
  assert.deepEqual(limitarPosicaoEditorHud({left: 2000, top: 2000}, 390, 500), {left: 92, top: 96});
});

test('salva posição por personagem, reabre com a mesma coordenada e restaura só um', () => {
  const anterior = globalThis.localStorage;
  globalThis.localStorage = storageFalso();
  try {
    salvarPosicaoEditorHud('morgana', {left: 290, top: 220});
    salvarPosicaoEditorHud('naeris', {left: 510, top: 310});
    assert.equal(JSON.parse(localStorage.getItem(CHAVE_POSICAO_EDITOR_HUD)).naeris.left, 510);
    assert.deepEqual(lerPosicaoEditorHud('morgana'), {left: 290, top: 220});
    assert.deepEqual(lerPosicaoEditorHud('naeris'), {left: 510, top: 310});
    restaurarPosicaoEditorHud('morgana');
    assert.equal(lerPosicaoEditorHud('morgana'), null);
    assert.deepEqual(lerPosicaoEditorHud('naeris'), {left: 510, top: 310});
  } finally {
    globalThis.localStorage = anterior;
  }
});

test('não aceita posições inválidas nem quebra se armazenamento não existir', () => {
  assert.equal(sanitizarPosicaoEditorHud({left: Infinity, top: 100}), null);
  assert.equal(sanitizarPosicaoEditorHud({left: '10', top: 25}), null);
  assert.equal(sanitizarPosicaoEditorHud(null), null);
  assert.deepEqual(sanitizarPosicaoEditorHud({left: 22.3, top: 130.2}), {left: 22.3, top: 130.2});
  const anterior = globalThis.localStorage;
  globalThis.localStorage = undefined;
  try {
    assert.equal(lerPosicaoEditorHud('sem-storage'), null);
    assert.doesNotThrow(() => salvarPosicaoEditorHud('sem-storage', {left: 20, top: 200}));
    assert.doesNotThrow(() => restaurarPosicaoEditorHud('sem-storage'));
  } finally {
    globalThis.localStorage = anterior;
  }
});

test('editor usa arrasto manual e permanece independente das colunas de ações', () => {
  assert.match(fonte, /onPointerDown=\{iniciarArrastoEditor\}/);
  assert.match(fonte, /setPointerCapture\(evento\.pointerId\)/);
  assert.match(fonte, /onPointerMove=\{moverEditor\}/);
  assert.match(fonte, /onPointerUp=\{encerrarArrastoEditor\}/);
  assert.match(fonte, /salvarPosicaoEditorHud\(personagemId, nova\)/);
  assert.match(fonte, /restaurarPosicaoEditorHud\(personagemId\)/);
  assert.match(fonte, /onKeyDown=\{moverEditorTeclado\}/);
  assert.doesNotMatch(fonte, /calcularPosicaoEditorHudCombate/);
  assert.doesNotMatch(fonte, /ocultarSecundarios|ocultarPrincipal/);
  assert.match(fonte, /detalhesAbertos && \(itensEmDestaque \? item : acao\)/);
  assert.match(css, /\.hx-combate-editor-arrastar\s*\{/);
  assert.match(css, /cursor: grab/);
  assert.match(css, /scrollbar-color:\s*#555b68 #14161e/);
});
