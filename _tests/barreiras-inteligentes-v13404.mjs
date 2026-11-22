import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {barreiraBloqueiaVisao,barreiraBloqueiaMovimento,alterarTipoBarreira,bloqueiaPassagem,calcularPoligonoVisao} from '../src/lib/lighting.ts';
import {arrastarBarreira} from '../src/lib/barrierEditing.ts';
import {bloqueiaMovimentoCompartilhado3D,editarBarreiraCompartilhada3D} from '../src/mesa3d/mapaCompartilhado3D.ts';
import {chaveEstadoCampanha} from '../src/hexatombe/campaignLibrary.ts';
import {criarSala3D} from '../src/mesa3d/roomScene.ts';
const base={id:'a',tipo:'parede',x1:50,y1:10,x2:50,y2:90,aberta:false,trancada:false};
const area={versao:1,base:'vazia',objetos:[],piso:'imagem',mapaUnico:true,larguraTerreno:20,profundidadeTerreno:20};
function blocagem(lista){return bloqueiaPassagem({x:25,y:50},{x:75,y:50},lista,100,100);}
function memoria(){const estado={unidades:[{id:'u1',nome:'Morgana'}],cenas:[{id:'c1',barreiras:[base],tokens:{u1:{x:10,y:20}}}]};const k=chaveEstadoCampanha('camp-teste');const dados=new Map([[k,JSON.stringify(estado)]]);return {getItem:k=>dados.get(k)??null,setItem:(k,v)=>dados.set(k,v),ler:()=>JSON.parse(dados.get(k))};}
function docFake(){const ctx=new Proxy({},{get:(_,k)=>k==='measureText'?()=>({width:32}):k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});return {createElement:n=>n==='canvas'?{width:512,height:512,getContext:()=>ctx}:{}};}
const local=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('parede antiga mantém bloqueios padrão, sem migração destrutiva',()=>{
  assert.equal(barreiraBloqueiaVisao(base),true);assert.equal(barreiraBloqueiaMovimento(base),true);
  assert.equal(blocagem([base]),true);
  assert.equal(barreiraBloqueiaVisao({...base,tipo:'porta',aberta:false}),true);
});
test('janela e mureta bloqueiam movimento e deixam passar visão',()=>{
  for(const tipo of ['janela','mureta']){
    const b=alterarTipoBarreira(base,tipo);
    assert.equal(barreiraBloqueiaMovimento(b),true);
    assert.equal(barreiraBloqueiaVisao(b),false);
    assert.equal(blocagem([b]),true);
    assert.equal(bloqueiaMovimentoCompartilhado3D({x:-5,z:0},{x:5,z:0},[b],area),true);
    const poligono=calcularPoligonoVisao(25,50,80,[b],100,100);
    assert.ok(poligono.some(p=>p.x>55),`visão deve atravessar ${tipo}`);
  }
});
test('propriedades são independentes da aparência e preservam edição manual',()=>{
  const b={...alterarTipoBarreira(base,'janela'),bloqueiaMovimento:false,bloqueiaVisao:true};
  assert.equal(barreiraBloqueiaMovimento(b),false);assert.equal(barreiraBloqueiaVisao(b),true);
  assert.equal(blocagem([b]),false);
  assert.equal(bloqueiaMovimentoCompartilhado3D({x:-5,z:0},{x:5,z:0},[b],area),false);
  const poligono=calcularPoligonoVisao(25,50,80,[b],100,100);
  assert.ok(poligono.some(p=>p.x<50));
  assert.ok(!poligono.some(p=>p.x>50.1&&Math.abs(p.y-50)<5),'não revela o espaço atrás da barreira na linha central');
});
test('porta aberta libera movimento e visão, mesmo com propriedades marcadas',()=>{
  const p={...alterarTipoBarreira(base,'porta'),bloqueiaMovimento:true,bloqueiaVisao:true,aberta:true};
  assert.equal(barreiraBloqueiaVisao(p),false);assert.equal(barreiraBloqueiaMovimento(p),false);
  assert.equal(blocagem([p]),false);
  assert.equal(bloqueiaMovimentoCompartilhado3D({x:-5,z:0},{x:5,z:0},[p],area),false);
  assert.equal(barreiraBloqueiaMovimento({...p,aberta:false}),true);
});
test('arrasto 2D preserva posição relativa e limita extremos a 0..100',()=>{
  const meio=arrastarBarreira(base,{x:50,y:20},{x:60,y:35},'corpo');
  assert.deepEqual([meio.x1,meio.y1,meio.x2,meio.y2],[60,20,60,100]);
  const ponta=arrastarBarreira(base,{x:50,y:10},{x:84,y:-20},'inicio');
  assert.equal(ponta.x1,84);assert.equal(ponta.y1,0);assert.equal(ponta.y2,90);
  const extremo=arrastarBarreira(base,{x:50,y:20},{x:900,y:25},'corpo');
  assert.equal(extremo.x1,100);assert.equal(extremo.x2,100);
});
test('alterar a barreira no 3D salva tipo e bloqueios no registro utilizado pelo 2D',()=>{
  const memoriaFake=memoria();const antes=memoriaFake.ler();
  const nova={...alterarTipoBarreira(base,'mureta'),x1:30,x2:30,bloqueiaVisao:false};
  assert.equal(editarBarreiraCompartilhada3D('camp-teste','c1',nova,memoriaFake),true);
  const depois=memoriaFake.ler();assert.deepEqual(depois.cenas[0].barreiras[0],nova);
  assert.deepEqual(depois.cenas[0].tokens,antes.cenas[0].tokens);
});
test('seleção visual 2D, alças e Delete de barreiras sem conflito com token',()=>{
  const app=local('src/App.tsx');const css=local('src/App.css');
  assert.match(app,/className="barreira-alvo"/);assert.match(app,/className="barreira-alca"/);
  assert.match(app,/onPointerDown=\{e=>iniciarEdicaoBarreira/);
  assert.match(app,/excluirBarreiraSelecionada\(\)/);
  assert.match(app,/setTokenEmEdicaoId\(null\);setBarreiraSelecionadaId/);
  assert.match(css,/pointer-events:stroke/);
});
test('renderizador 3D distingue tipos por cor, mantendo traços só para o mestre',()=>{
  const old=globalThis.document;globalThis.document=docFake();let sala;
  try{
    sala=criarSala3D('Teste','#bd9da0');sala.configurarCenario(area);
    sala.configurarBarreiras([alterarTipoBarreira(base,'janela'),{...alterarTipoBarreira(base,'mureta'),id:'m'}],area,true,null);
    const grupo=sala.cena.getObjectByName('barreiras-compartilhadas-da-planta');
    assert.equal(grupo.children.length,2);
    assert.ok(grupo.children.every(o=>o instanceof THREE.Line));
    assert.notEqual(grupo.children[0].material.color.getHexString(),grupo.children[1].material.color.getHexString());
    sala.configurarBarreiras([base],area,false,null);assert.equal(grupo.visible,false);
  }finally{sala?.dispose();globalThis.document=old;}
});
