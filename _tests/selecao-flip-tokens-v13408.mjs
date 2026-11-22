import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {espelharTokenCompartilhado3D} from '../src/mesa3d/mesaLivre3D.ts';
import {normalizarEstadoCompartilhado} from '../src/lib/mesaCompartilhada.ts';
import {chaveEstadoCampanha} from '../src/hexatombe/campaignLibrary.ts';

const key=chaveEstadoCampanha('teste-flip');
function fixture(){
  const original={unidades:[{id:'a',nome:'Sora',hp:72},{id:'b',nome:'Maya',hp:90}],cenas:[
    {id:'c1',tokens:{a:{x:17,y:29,rotacao:45,skinId:'roupa',tamanho:70,travado:false},b:{x:57,y:49,travado:true}}},
    {id:'c2',tokens:{a:{x:88,y:60,rotacao:270,espelhadoX:true}}}],registros:[]};
  const mem=new Map([[key,JSON.stringify(original)]]);
  return {store:{getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)},read:()=>JSON.parse(mem.get(key))};
}
test('Flip alterna horizontalmente apenas token e cena específicos, sem mudar dados ou imagem original',()=>{
  const {store,read}=fixture(),original=read();
  assert.equal(espelharTokenCompartilhado3D('teste-flip','c1','a',store),true);
  let salvo=read();
  assert.equal(salvo.cenas[0].tokens.a.espelhadoX,true);
  assert.equal(salvo.cenas[0].tokens.a.rotacao,45);
  assert.equal(salvo.cenas[0].tokens.a.skinId,'roupa');
  assert.equal(salvo.cenas[0].tokens.a.x,17);
  assert.deepEqual(salvo.cenas[0].tokens.b,original.cenas[0].tokens.b);
  assert.deepEqual(salvo.cenas[1],original.cenas[1]);
  assert.deepEqual(salvo.unidades,original.unidades);
  assert.equal(espelharTokenCompartilhado3D('teste-flip','c1','a',store),true);
  salvo=read();assert.equal(salvo.cenas[0].tokens.a.espelhadoX,false);
});
test('Flip respeita bloqueio, token inexistente e cena inexistente',()=>{
  const {store,read}=fixture(),original=read();
  assert.equal(espelharTokenCompartilhado3D('teste-flip','c1','b',store),false);
  assert.equal(espelharTokenCompartilhado3D('teste-flip','c1','x',store),false);
  assert.equal(espelharTokenCompartilhado3D('teste-flip','nenhuma','a',store),false);
  assert.deepEqual(read(),original);
});
test('Normalização mantém a orientação espelhada e o padrão não espelhado',()=>{
  const {read}=fixture();const estado=normalizarEstadoCompartilhado(read());
  assert.equal(estado.cenas[0].tokens.a.espelhadoX,false);
  assert.equal(estado.cenas[1].tokens.a.espelhadoX,true);
});
test('Controles de seleção e flip estão presentes em ambas as mesas',()=>{
  const viewer=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
  const scene=readFileSync(new URL('../src/mesa3d/roomScene.ts',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/App.css',import.meta.url),'utf8');
  assert.match(viewer,/m3d-token-selection-hud/);
  assert.match(viewer,/inverterTokenSelecionadoNo3D/);
  assert.match(viewer,/setTokenSelecionadoId\(tokenId\)/);
  assert.match(scene,/criarMolduraSelecao/);
  assert.match(scene,/const orientarToken=\(id:string,espelhadoX:boolean\)/);
  assert.match(app,/espelhadoX:!p.espelhadoX/);
  assert.match(css,/scaleX\(var\(--espelhamento-token,1\)\)/);
});
