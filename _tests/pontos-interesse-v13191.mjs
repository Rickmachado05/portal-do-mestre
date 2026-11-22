import assert from 'node:assert/strict';
import { atualizarPontosInteresse } from '../src/lib/pontosInteresse.ts';

const original = [{id:'a',texto:'Acampamento',x:22,y:38}];
const adicionado = atualizarPontosInteresse(original, {id:'b',texto:'  Portal antigo  ',x:61,y:44});
assert.equal(adicionado.length,2);
assert.deepEqual(adicionado[1],{id:'b',texto:'Portal antigo',x:61,y:44});
assert.equal(original.length,1); // o estado anterior não é modificado
const editado = atualizarPontosInteresse(adicionado,{id:'nada',texto:' Entrada secreta ',x:0,y:0},'a');
assert.equal(editado[0].texto,'Entrada secreta');
assert.equal(editado[0].x,22); // mantém a posição original
assert.equal(editado[0].y,38);
assert.equal(editado[1].texto,'Portal antigo');
assert.strictEqual(atualizarPontosInteresse(original,{id:'x',texto:'  ',x:1,y:2}),original);
const truncado = atualizarPontosInteresse([], {id:'x',texto:'a'.repeat(100),x:1,y:2});
assert.equal(truncado[0].texto.length,65);
console.log('Pontos de interesse v1.3.19.1: testes passaram.');
