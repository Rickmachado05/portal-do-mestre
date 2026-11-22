import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=caminho=>readFileSync(new URL('../src/multiplayer/'+caminho,import.meta.url),'utf8');

test('v29.15.30.14: token local 2D não é desenhado sob o cursor antes da validação da parede',()=>{
  const pagina=ler('Convidado.tsx');
  const arrasto=pagina.slice(pagina.indexOf('function iniciarArrasto('),pagina.indexOf('async function entrar('));
  assert.doesNotMatch(arrasto,/setDragVisual\(/);
  assert.doesNotMatch(arrasto,/movimentoVisualPendente/);
  assert.match(pagina,/dragVisual=\{null\}/);
  assert.match(arrasto,/enviarMovimento\(p\.x,p\.y\)/);
  assert.match(arrasto,/enviarMovimento\(p\.x,p\.y,true\)/);
});

test('v29.15.30.14: observador 2D descarta prévia SSE não confirmada pelo mestre',()=>{
  const codigo=ler('TokenConvidadoFluido.tsx');
  const evento=codigo.slice(codigo.indexOf('assinarArrasto(cenaId,token.id'),codigo.indexOf('const agora=performance.now()',codigo.indexOf('assinarArrasto(cenaId,token.id')));
  assert.match(evento,/Math\.hypot\(evento\.x-oficial\.current\.x,evento\.y-oficial\.current\.y\)>\.01\)return/);
});

test('v29.15.30.14: ao soltar em 3D não envia coordenada do cursor através de parede',()=>{
  const codigo=ler('MesaConvidado3D.tsx');
  const finalizar=codigo.slice(codigo.indexOf('const terminar=(e:PointerEvent)=>'),codigo.indexOf('const cancelar=(e:PointerEvent)=>'));
  assert.match(finalizar,/As amostras já solicitadas seguem na fila/);
  assert.doesNotMatch(finalizar,/solicitarRef\.current\(/);
  assert.doesNotMatch(finalizar,/const final=ponto\?converterPonto/);
  assert.doesNotMatch(finalizar,/solicitarRef\.current\(final\.x,final\.y,true\)/);
});

test('v29.15.30.14: a validação autoritativa de barreiras continua exclusiva do mestre',()=>{
  const codigo=ler('MesaConvidado3D.tsx');
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(codigo,/cena\.barreiras|estado\.barreiras/);
  assert.match(app,/bloqueiaMovimentoCompartilhado3D\(anterior3D,destino3D,cena\.barreiras\?\?\[\],cenario3D\)/);
});
