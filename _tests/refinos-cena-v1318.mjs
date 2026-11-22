import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { aplicarPresetIluminacao, moverCena, normalizarOpacidadeNevoaMestre, OPACIDADE_NEVOA_MESTRE_PADRAO, PRESETS_ILUMINACAO } from '../src/lib/sceneRefinements.ts';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const editorDados = readFileSync(new URL('../src/EditorDados.tsx', import.meta.url), 'utf8');
const biblioteca = readFileSync(new URL('../src/hexatombe/BibliotecaDados.tsx', import.meta.url), 'utf8');
const atelie = readFileSync(new URL('../public/atelie-de-dados.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');

test('opacidade da névoa preserva 53% nas cenas antigas e rejeita valores inválidos', () => {
  assert.equal(normalizarOpacidadeNevoaMestre(undefined), OPACIDADE_NEVOA_MESTRE_PADRAO);
  assert.equal(normalizarOpacidadeNevoaMestre('90'), OPACIDADE_NEVOA_MESTRE_PADRAO);
  assert.equal(normalizarOpacidadeNevoaMestre(Number.NaN), OPACIDADE_NEVOA_MESTRE_PADRAO);
  assert.equal(normalizarOpacidadeNevoaMestre(0), 15);
  assert.equal(normalizarOpacidadeNevoaMestre(200), 90);
  assert.equal(normalizarOpacidadeNevoaMestre(65.4), 65);
});

test('a opacidade personalizada atua só na névoa do mestre, mantendo preview do jogador', () => {
  assert.match(app, /style=\{!preverJogador \? \{ opacity: opacidadeNevoaMestre \/ 100 \} : undefined\}/);
  assert.match(app, /opacidadeNevoaMestre: normalizarOpacidadeNevoaMestre\(c\.opacidadeNevoaMestre\)/);
  assert.match(css, /\.nevoa-svg\.nevoa-jogador\{opacity:\.985\}/);
  assert.match(app, /Opacidade da névoa para o mestre/);
});

test('presets mudam luminosidade sem apagar colisões, paredes ou a lista de luzes', () => {
  assert.equal(PRESETS_ILUMINACAO.length, 4);
  const original = { ativa: false, ambiente: 40, colisao: true, outraPropriedade: 'guardada' };
  const noite = aplicarPresetIluminacao(original, 'noite');
  assert.deepEqual(noite, { ativa: true, ambiente: 20, colisao: true, outraPropriedade: 'guardada' });
  assert.deepEqual(original, { ativa: false, ambiente: 40, colisao: true, outraPropriedade: 'guardada' });
  assert.equal(aplicarPresetIluminacao(noite, 'apagar').ambiente, 0);
  assert.match(app, /PRESETS_ILUMINACAO\.map/);
  assert.match(app, /sem apagar fontes de luz, paredes, portas ou configurações de colisão/);
});

test('mover cenas respeita limites, ordem e referências internas', () => {
  const cenas = [{id:'a',token:{x:3}},{id:'b',token:{x:6}},{id:'c',token:{x:9}}];
  const movidas = moverCena(cenas, 'b', -1);
  assert.deepEqual(movidas.map(c=>c.id), ['b','a','c']);
  assert.deepEqual(cenas.map(c=>c.id), ['a','b','c']);
  assert.strictEqual(movidas[0], cenas[1]);
  assert.strictEqual(moverCena(cenas, 'a', -1), cenas);
  assert.strictEqual(moverCena(cenas, 'c', 1), cenas);
  assert.strictEqual(moverCena(cenas, 'ausente', 1), cenas);
  assert.match(app, /setCampanha\(atual => \(\{ \.\.\.atual, cenas: moverCena\(atual\.cenas, idCena, direcao\) \}\)\)/);
  assert.match(app, /Buscar cena/);
});

test('atalho de volta à mesa retém a campanha, enquanto biblioteca segue acessível', () => {
  assert.match(editorDados, /atelie-de-dados\.html\?origem=mesa/);
  assert.match(editorDados, /encodeURIComponent\(campanha\)/);
  assert.match(editorDados, /<BibliotecaDados[^>]*atelieUrl=\{atelieUrlMesa\}/);
  assert.match(biblioteca, /new URL\(atelieUrl, window\.location\.origin\)/);
  assert.match(biblioteca, /destino\.searchParams\.set\(campo, identificador\)/);
  assert.match(biblioteca, /linkParaEditar\('collection',item\.id\)/);
  assert.match(biblioteca, /linkParaEditar\('edit',item\.id\)/);
  assert.match(atelie, /id="hxReturnMesa" hidden>← Voltar à mesa/);
  assert.match(atelie, /href="\/dados\/" class="hx-return-link">← Minha biblioteca/);
  assert.match(atelie, /parametros\.get\("origem"\) !== "mesa"/);
  assert.match(atelie, /destino\.searchParams\.set\("campanha", campanha\)/);
});


test('voltar à mesa funciona com a campanha correta, sem abrir outro destino', () => {
  const trecho = atelie.match(/<script>\s*(\/\* Só exibe o retorno[\s\S]*?)<\/script>/)?.[1];
  assert.ok(trecho, 'script de navegação não encontrado');
  const avaliar = (search) => {
    const link = { href:'/mesa/', hidden:true };
    runInNewContext(trecho, {
      URL, URLSearchParams,
      location: {search, origin:'http://localhost:5173'},
      document: {getElementById: () => link},
    });
    return link;
  };
  assert.deepEqual(avaliar('?origem=mesa&campanha=cena%20de%20teste'), {href:'/mesa/?campanha=cena+de+teste',hidden:false});
  assert.deepEqual(avaliar('?origem=mesa'), {href:'/mesa/',hidden:false});
  assert.deepEqual(avaliar('?collection=123'), {href:'/mesa/',hidden:true});
  assert.deepEqual(avaliar('?origem=mesa&campanha=https%3A%2F%2Fevil.example'), {href:'/mesa/?campanha=https%3A%2F%2Fevil.example',hidden:false});
});
