import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES, OBSTACULOS, INTERACOES,
  colideComObstaculo, moverPersonagem, vetorMovimento, interacaoProxima, urlExploracao,
} from '../src/exploracao/worldLogic.ts';

test('área inicial e limites do salão',()=>{
  assert.equal(colideComObstaculo(0,5),false);
  assert.equal(colideComObstaculo(LIMITES.maxX,.2),true);
  assert.equal(colideComObstaculo(LIMITES.minX,.2),true);
  assert.equal(colideComObstaculo(0,LIMITES.maxZ),true);
});
test('personagem não atravessa altar, baú ou arquivos',()=>{
  for(const o of OBSTACULOS){assert.equal(colideComObstaculo(o.x,o.z),true);}
  const um=moverPersonagem({x:0,z:-3.9},0,-.6);
  assert.ok(um.z> -4.41);
});
test('movimento diagonal mantém a mesma velocidade de movimento axial',()=>{
  const up=vetorMovimento(1,0,{x:0,z:-1},{x:1,z:0});
  const diag=vetorMovimento(1,1,{x:0,z:-1},{x:1,z:0});
  assert.equal(Math.hypot(up.x,up.z),1);
  assert.ok(Math.abs(Math.hypot(diag.x,diag.z)-1)<1e-10);
  assert.ok(diag.x>0&&diag.z<0);
});
test('movimento por eixo desliza pela parede',()=>{
  const pos={x:12.8,z:2};
  const moved=moverPersonagem(pos,.7,.4);
  assert.equal(moved.x,12.8);assert.equal(moved.z,2.4);
});
test('só oferece interação ao alcance',()=>{
  assert.equal(interacaoProxima({x:0,z:5}),null);
  assert.equal(interacaoProxima({x:0,z:-3.1})?.id,'altar');
  assert.equal(interacaoProxima({x:8.1,z:5.2})?.id,'bau');
  assert.equal(interacaoProxima({x:-8.7,z:6.4})?.id,'arquivo');
  assert.equal(INTERACOES.length,3);
});
test('rota experimental preserva ID da campanha',()=>{
  assert.equal(urlExploracao('camp-abc-123'),'/exploracao/?campanha=camp-abc-123');
  assert.equal(urlExploracao('abc&x'),'/exploracao/?campanha=abc%26x');
});
