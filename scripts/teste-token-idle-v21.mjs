import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodificarGifIdle,decodificarBlobGifIdle,quadroNoTempo,LIMITES_IDLE} from '../src/lib/tokenIdleGif.mjs';
import {test} from 'node:test';
const gif=readFileSync(new URL('./teste-token-idle.gif',import.meta.url));
test('GIF idle GIF89a animado decodificado com dimensões, transparência e múltiplos quadros',()=>{
  const a=decodificarGifIdle(gif);
  assert.equal(a.largura,64);assert.equal(a.altura,64);assert.equal(a.quadros.length,4);
  assert.ok(a.duracaoTotal>=333);assert.ok(a.duracaoTotal<=500);
  assert.ok(a.quadros.every(q=>q.pixels.length===64*64*4));
  assert.ok(a.quadros.some(q=>q.pixels.some((v,i)=>i%4===3&&v===0)));
});
test('O relógio entra em loop mesmo após aba ficar muito tempo suspensa',()=>{
  const a=decodificarGifIdle(gif);
  for(const t of [0,85,600,23_000,1_234_567]){
    assert.equal(quadroNoTempo(a,t),quadroNoTempo(a,t+a.duracaoTotal));
  }
});
test('GIF inválido é rejeitado antes de substituir skin',()=>{
  assert.throws(()=>decodificarGifIdle(new Uint8Array(10)),/GIF/);
  const fake=new Uint8Array(gif);fake[6]=255;fake[7]=255;
  assert.throws(()=>decodificarGifIdle(fake),/até 512/);
  assert.equal(LIMITES_IDLE.quadros,40);
});
test('GIF com transparência/disposal não deixa rastro da posição anterior',()=>{
  const a=decodificarGifIdle(gif);
  // Centro de cada bolinha deve ficar pintado em seu próprio quadro.
  for(let i=0;i<4;i++){
    const px=(24+8*i)*4+24*64*4;
    assert.equal(a.quadros[i].pixels[px+3],255);
  }
});

test('Cópias do mesmo inimigo compartilham os quadros decodificados no cache',async()=>{
  const a=await decodificarBlobGifIdle(new Blob([gif],{type:'image/gif'}));
  const b=await decodificarBlobGifIdle(new Blob([gif],{type:'image/gif'}));
  assert.strictEqual(a,b);
});
