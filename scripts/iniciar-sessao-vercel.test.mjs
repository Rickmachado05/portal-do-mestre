import test from 'node:test';
import assert from 'node:assert/strict';
import { validarOrigemPortal, extrairUrlTunnel, criarUrlPortal } from './iniciar-sessao-vercel.mjs';

test('aceita origem HTTPS exata e rejeita caminhos, credenciais e HTTP', () => {
  assert.equal(validarOrigemPortal('https://portal-do-mestre.vercel.app'), 'https://portal-do-mestre.vercel.app');
  for (const valor of ['http://portal-do-mestre.vercel.app', 'https://portal-do-mestre.vercel.app/mesa', 'https://user:senha@portal-do-mestre.vercel.app', 'https://portal-do-mestre.vercel.app?x=1']) {
    assert.equal(validarOrigemPortal(valor), '');
  }
});

test('extrai somente um Quick Tunnel HTTPS valido do log do cloudflared', () => {
  const log = '2026 INF | Your quick Tunnel has been created! Visit it at https://subsequent-fixtures-referral-products.trycloudflare.com |';
  assert.equal(extrairUrlTunnel(log), 'https://subsequent-fixtures-referral-products.trycloudflare.com');
  assert.equal(extrairUrlTunnel('https://example.com/'), '');
});

test('monta link Vercel que salva automaticamente o servidor no navegador', () => {
  const tunnel = 'https://ab-cd-ef.trycloudflare.com';
  const url = new URL(criarUrlPortal('https://portal-do-mestre.vercel.app', tunnel));
  assert.equal(url.origin, 'https://portal-do-mestre.vercel.app');
  assert.equal(url.pathname, '/');
  assert.equal(url.searchParams.get('servidor'), tunnel);
});
