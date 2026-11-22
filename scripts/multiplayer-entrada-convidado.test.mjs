import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const fonte = readFileSync(new URL('../src/multiplayer/Convidado.tsx', import.meta.url), 'utf8');
const propriedade = fonte.match(/videoRolagemUrl=\{([^\n]+)\}/);
assert.ok(propriedade, 'A Mesa do Jogador precisa receber a URL do vídeo de forma protegida.');
const obterURL = new Function('videoAtual', 'ultimaAnimacao', `return (${propriedade[1]});`);

test('entrar na Mesa do Jogador sem rolagem não causa erro de JavaScript', () => {
  assert.equal(obterURL(null, null), undefined);
  assert.equal(obterURL(null, {id:'roll-1'}), undefined);
  assert.equal(obterURL({rolagemId:'roll-1',url:'blob:teste'}, null), undefined);
});

test('a reprodução usa vídeo apenas se corresponder à rolagem visível', () => {
  assert.equal(obterURL({rolagemId:'roll-1',url:'blob:teste'}, {id:'roll-1'}), 'blob:teste');
  assert.equal(obterURL({rolagemId:'roll-1',url:'blob:teste'}, {id:'roll-2'}), undefined);
});
