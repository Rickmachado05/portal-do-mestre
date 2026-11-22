import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {registrarPosicao,amostrarPosicao,ATRASO_VISUAL_MS} from '../src/multiplayer/interpolacaoRemota.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=rel=>readFileSync(resolve(root,rel),'utf8');

test('interpolação percorre todos os pontos intermediários a 60 FPS',()=>{
  let amostras=[];
  for(let t=0;t<=330;t+=33)amostras=registrarPosicao(amostras,t/10,50,t);
  const passos=[];
  for(let t=ATRASO_VISUAL_MS;t<360;t+=16.667){
    const p=amostrarPosicao(amostras,t);
    passos.push(p.x);
  }
  assert( passos.every((x,i)=>i===0||x>=passos[i-1]) );
  assert( passos.some((x,i)=>i>0&&x>passos[i-1]&&x-passos[i-1]<3.3) );
  assert( passos.every(x=>Number.isFinite(x)) );
});
test('atraso curto interpola entre duas amostras sem teleporte',()=>{
  let amostras=registrarPosicao([],10,20,1000);
  amostras=registrarPosicao(amostras,14,28,1040);
  const metade=amostrarPosicao(amostras,1020+ATRASO_VISUAL_MS);
  assert(Math.abs(metade.x-12)<0.001);
  assert(Math.abs(metade.y-24)<0.001);
});
test('nova cena ou salto grande reinicia a trilha visual',()=>{
  const origem=registrarPosicao([],10,10,100);
  const salto=registrarPosicao(origem,90,90,150);
  assert.equal(salto.length,1);
  assert.deepEqual(amostrarPosicao(salto,160),{x:90,y:90});
});
test('retoma deslocamento após token parado sem salto de posição',()=>{
  let amostras=registrarPosicao([],25,20,100);
  amostras=registrarPosicao(amostras,27,24,5000);
  const meio=amostrarPosicao(amostras,5000-ATRASO_VISUAL_MS/2+ATRASO_VISUAL_MS);
  assert(meio.x>25&&meio.x<27);
  assert(meio.y>20&&meio.y<24);
});
test('ignora repetição de posição e entradas inválidas',()=>{
  const origem=registrarPosicao([],10,10,100);
  assert.strictEqual(registrarPosicao(origem,10,10,130),origem);
  assert.strictEqual(registrarPosicao(origem,Number.NaN,10,130),origem);
});
test('token remoto é atualizado por RAF, sem transição CSS que reinicia a cada evento',()=>{
  const componente=source('src/multiplayer/TokenConvidadoFluido.tsx');
  const css=source('src/multiplayer/MesaConvidado2DParity.css');
  const mesa=source('src/multiplayer/MesaConvidado2D.tsx');
  assert.match(componente,/requestAnimationFrame\(quadro\)/);
  assert.match(componente,/if\(arrasto\|\|reduzirMovimento\)/);
  assert.match(mesa,/TokenConvidadoFluido/);
  assert.match(css,/\.pm-jogo \.pm-jogo-token\{transition:none/);
});
