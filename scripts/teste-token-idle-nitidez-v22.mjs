import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {decodificarGifIdle,decodificarBlobGifIdle,LIMITES_IDLE} from '../src/lib/tokenIdleGif.mjs';

const origem=readFileSync(new URL('./teste-token-idle-512-v22.gif',import.meta.url));
const pixel=(quadro,x,y,largura)=>[...quadro.pixels.subarray((y*largura+x)*4,(y*largura+x)*4+4)];

test('GIF de 512x512 mantém resolução nativa sem cair para 192px',()=>{
  assert.equal(LIMITES_IDLE.ladoRender,512);
  const animacao=decodificarGifIdle(origem);
  assert.equal(animacao.largura,512);
  assert.equal(animacao.altura,512);
  assert.equal(animacao.quadros.length,2);
  assert.ok(animacao.quadros.every(q=>q.pixels.byteLength===512*512*4));
});

test('detalhe de 1-2 pixels e canal alpha são preservados com fidelidade',()=>{
  const animacao=decodificarGifIdle(origem);
  assert.deepEqual(pixel(animacao.quadros[0],100,80,512),[240,80,30,255]);
  assert.deepEqual(pixel(animacao.quadros[0],101,80,512),[240,80,30,255]);
  assert.deepEqual(pixel(animacao.quadros[0],102,80,512),[0,0,0,0]);
  assert.deepEqual(pixel(animacao.quadros[0],150,80,512),[0,0,0,0]);
  assert.deepEqual(pixel(animacao.quadros[1],110,80,512),[240,80,30,255]);
  assert.deepEqual(pixel(animacao.quadros[1],100,80,512),[0,0,0,0]);
});

test('cache por conteúdo preserva quadros 512 de cópias do mesmo inimigo',async()=>{
  const arquivo=new Blob([origem],{type:'image/gif'});
  const [a,b]=await Promise.all([decodificarBlobGifIdle(arquivo),decodificarBlobGifIdle(arquivo)]);
  assert.strictEqual(a,b);
  assert.equal(a.largura,512);
});
