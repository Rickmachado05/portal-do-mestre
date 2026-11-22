import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pub=readFileSync(new URL('../src/multiplayer/PublicadorMesa.tsx',import.meta.url),'utf8');
const master=readFileSync(new URL('../src/multiplayer/MultiplayerMestre.tsx',import.meta.url),'utf8');
const server=readFileSync(new URL('./multiplayer-server.mjs',import.meta.url),'utf8');
test('pedido recebido não é automaticamente processado pelo mestre',()=>{
  const inicio=pub.indexOf("if(evento.tipo==='pedido-item')");
  const fim=pub.indexOf("if(evento.tipo==='resultado-item')",inicio);
  assert.ok(inicio>=0&&fim>inicio);
  const trecho=pub.slice(inicio,fim);
  assert.match(trecho,/setPedidos\(/);
  assert.doesNotMatch(trecho,/pedidoItemRef\.current\(/);
  assert.match(pub,/onClick=\{\(\)=>void decidirPedido\(pedido,true\)\}/);
  assert.match(pub,/onClick=\{\(\)=>void decidirPedido\(pedido,false\)\}/);
});
test('confirmação de sucesso exige aprovação autenticada anterior',()=>{
  assert.match(server,/pessoa\.papel!=='mestre'[\s\S]*?Somente o mestre autoriza itens/);
  assert.match(server,/if\(corpo\.ok===true&&!pedido\.iniciadoEm\)/);
  assert.match(master,/Analisar pedidos/);
});
