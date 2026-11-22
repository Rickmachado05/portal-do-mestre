import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularPosicaoMenuCombate } from '../src/hexatombe/posicaoMenuCombate.ts';
const css = readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.css', import.meta.url), 'utf8');
const menu = readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.tsx', import.meta.url), 'utf8');

test('faixas flutuantes substituem moldura retangular e preservam textos legíveis', () => {
  const root = css.match(/\.hx-combate-imersivo\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(root, /background:\s*transparent/);
  assert.match(root, /border:\s*none/);
  assert.match(css, /\.hx-combate-categorias button\s*\{[^}]*clip-path:/);
  assert.match(css, /\.hx-combate-categorias button>strong\s*\{[^}]*skewX\(9deg\)/);
});

test('os atributos e as ações permanecem no mesmo componente', () => {
  assert.match(menu, /hx-combate-medidor hx-combate-hp/);
  assert.match(menu, /hx-combate-medidor hx-combate-mana/);
  assert.match(menu, /SECOES_MENU_COMBATE\.map/);
  assert.match(menu, /onUsarItem\(item\)/);
  assert.match(menu, /onRolar\('1d20'/);
});

test('largura reduzida mantém a HUD dentro do viewport', () => {
  for (const w of [320, 390, 540, 650, 1024, 1649]) {
    const largura = w <= 540 ? Math.min(220, w - 18) : 244;
    for (const x of [0, w / 2, w - 1]) {
      const p = calcularPosicaoMenuCombate({ x, y: 400, visivel: true }, w, 920);
      assert.ok(p.left >= 0 && p.left + largura <= w, `janela ${w}, x ${x}`);
    }
  }
});
