import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {removerTokenDaCenaCompartilhada3D} from '../src/mesa3d/mesaLivre3D.ts';
import {chaveEstadoCampanha} from '../src/hexatombe/campaignLibrary.ts';

function criarMemoria(){
  const registro={
    unidades:[{id:'u1',nome:'Aiko',hp:45,mana:70,temToken:true},{id:'u2',nome:'Tara',hp:15}],
    cenas:[{id:'c1',tokens:{u1:{x:20,y:50,travado:false,skinId:'azul'},u2:{x:35,y:20,travado:true}}},
      {id:'c2',tokens:{u1:{x:10,y:15,travado:false}}}],
    registros:[],
  };
  const key=chaveEstadoCampanha('teste-delete');
  const store=new Map([[key,JSON.stringify(registro)]]);
  return {storage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},ler:()=>JSON.parse(store.get(key))};
}

test('Delete 3D remove somente token da cena, preservando a ficha e outros cenários',()=>{
  const {storage,ler}=criarMemoria();
  assert.equal(removerTokenDaCenaCompartilhada3D('teste-delete','c1','u1',storage),true);
  const salvo=ler();
  assert.equal(salvo.cenas[0].tokens.u1,undefined);
  assert.ok(salvo.cenas[0].tokens.u2);
  assert.equal(salvo.cenas[1].tokens.u1.x,10);
  assert.equal(salvo.unidades[0].hp,45);
  assert.equal(salvo.unidades[0].mana,70);
  assert.equal(salvo.unidades[0].temToken,true);
  assert.match(salvo.registros.at(-1).texto,/Aiko: token retirado da cena/);
});

test('Delete 3D respeita bloqueio, token inexistente e cena inexistente',()=>{
  const {storage,ler}=criarMemoria(),anterior=ler();
  assert.equal(removerTokenDaCenaCompartilhada3D('teste-delete','c1','u2',storage),false);
  assert.equal(removerTokenDaCenaCompartilhada3D('teste-delete','c1','nao-existe',storage),false);
  assert.equal(removerTokenDaCenaCompartilhada3D('teste-delete','c99','u1',storage),false);
  assert.deepEqual(ler(),anterior);
});

test('3D usa seleção direta do canvas e comunica à interface principal',()=>{
  const viewer=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(viewer,/selecionarTokenNoChao\(token\)/);
  assert.match(viewer,/excluirTokenSelecionadoNo3D\(\)/);
  assert.match(viewer,/ev\.code==='Delete'/);
  assert.match(viewer,/modoMestreRef\.current&&!modoEdicaoRef\.current/);
  assert.match(viewer,/token-selecionado-na-mesa/);
  assert.match(app,/token-selecionado-na-mesa/);
});
