/** Regressão: a sala deve acompanhar a atualização automática do Quick Tunnel. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const raiz = resolve(import.meta.dirname, '..');
const api = readFileSync(resolve(raiz, 'src/multiplayer/api.ts'), 'utf8');
const mestre = readFileSync(resolve(raiz, 'src/multiplayer/MultiplayerMestre.tsx'), 'utf8');

test('urlSala não conserva a origem antiga do Tunnel em variável global', () => {
  assert.doesNotMatch(api, /const\s+raiz\s*=\s*raizServidorMultiplayer\(\)/);
  assert.match(api, /export\s+const\s+urlSala\s*=\s*[^\r\n]*\$\{raizServidorMultiplayer\(\)\}/);
});
test('credencial da sala é persistida com a origem nova', () => {
  assert.match(mestre, /salvarCredencial\(chaveMestre\(campanhaId\),nova\)/);
  assert.doesNotMatch(mestre, /salvarCredencial\(chave,nova\)/);
});
