import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {chaveEstadoCampanha} from '../src/hexatombe/campaignLibrary.ts';
import { normalizarCenario3D, carregarCenario3D, salvarCenario3D } from '../src/mesa3d/editorCena3D.ts';
import {percentualParaChao3D,chaoParaPercentual3D} from '../src/mesa3d/mesaLivre3D.ts';
import {ponto3DParaMapa,pontoMapaPara3D,bloqueiaMovimentoCompartilhado3D,criarBarreiraCompartilhada3D,editarBarreiraCompartilhada3D,excluirBarreiraCompartilhada3D} from '../src/mesa3d/mapaCompartilhado3D.ts';
import {criarSala3D} from '../src/mesa3d/roomScene.ts';

const area={versao:1,base:'vazia',objetos:[],piso:'imagem',mapaUnico:true,larguraTerreno:40,profundidadeTerreno:20,larguraPlanta:40,profundidadePlanta:20};
const ler=nome=>readFileSync(new URL('../'+nome,import.meta.url),'utf8');
function memoria(){
  const estado={titulo:'Teste',unidades:[{id:'u1',nome:'Morgana'}],registros:[{texto:'inalterado'}],cenas:[
    {id:'c1',temMapa:true,tokens:{u1:{x:50,y:40,skinId:'png'}},barreiras:[]},
    {id:'c2',tokens:{u1:{x:25,y:25}},barreiras:[]}],cenaAtivaId:'c1'};
  const map=new Map([[chaveEstadoCampanha('camp-teste'),JSON.stringify(estado)]]);
  return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),ler:()=>JSON.parse(map.get(chaveEstadoCampanha('camp-teste')))};
}
function documento(){const context=new Proxy({},{get:(_,key)=>key==='measureText'?()=>({width:30}):key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});return {createElement:name=>name==='canvas'?{width:512,height:512,getContext:()=>context}:{}};}

test('mapa único preserva proporções 2D/3D e não separa posições dos tokens',()=>{
  const c=normalizarCenario3D(area);assert.equal(c.mapaUnico,true);
  for(const ponto of [{x:0,y:0},{x:50,y:50},{x:87.25,y:13.5},{x:100,y:100}]){
    assert.deepEqual(chaoParaPercentual3D(percentualParaChao3D(ponto,c),c),ponto);
    assert.deepEqual(ponto3DParaMapa(pontoMapaPara3D(ponto,c),c),ponto);
  }
  const legado=normalizarCenario3D({...area,mapaUnico:false,objetos:[{id:'obj-legado',tipo:'parede',nome:'Antiga',x:1,z:2,rotacao:0,comprimento:4}]});
  assert.equal(legado.mapaUnico,undefined);assert.equal(legado.objetos[0].comprimento,4);
});

test('novas cenas começam com tabuleiro vazio, sem perder cenas antigas salvas',()=>{
  const previous=globalThis.localStorage,m=new Map();globalThis.localStorage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
  try{
    const novo=carregarCenario3D('camp-teste','nova');
    assert.equal(novo.base,'vazia');assert.equal(novo.mapaUnico,true);assert.equal(novo.piso,'madeira');
    const antigo={versao:1,base:'arquivos',objetos:[{id:'obj-antigo',tipo:'caixa',nome:'Caixa',x:1,z:1,rotacao:0}]};
    salvarCenario3D('camp-teste','velha',antigo);
    const salvo=carregarCenario3D('camp-teste','velha');assert.equal(salvo.base,'arquivos');assert.equal(salvo.objetos.length,1);
  }finally{globalThis.localStorage=previous;}
});

test('parede criada na visão mestre aparece na cena 2D, preservando fichas e dados',()=>{
  const m=memoria();const original=m.ler();
  assert.equal(criarBarreiraCompartilhada3D('camp-teste','c1','parede',{x:-8,z:0},{x:8,z:0},area,m),true);
  const atual=m.ler();const barreira=atual.cenas[0].barreiras[0];
  assert.equal(barreira.tipo,'parede');assert.equal(barreira.x1,30);assert.equal(barreira.x2,70);
  assert.equal(barreira.y1,50);assert.equal(barreira.y2,50);
  assert.deepEqual(atual.cenas[0].tokens,original.cenas[0].tokens);
  assert.deepEqual(atual.cenas[1],original.cenas[1]);assert.deepEqual(atual.registros,original.registros);
  assert.equal(criarBarreiraCompartilhada3D('camp-teste','c1','parede',{x:0,z:0},{x:0,z:0},area,m),false);
  assert.equal(atual.cenas[0].barreiras.length,1);
});

test('paredes bloqueiam movimento; portas abertas não; edição e Delete atualizam as duas mesas',()=>{
  const m=memoria();
  assert.equal(criarBarreiraCompartilhada3D('camp-teste','c1','porta',{x:0,z:-5},{x:0,z:5},area,m),true);
  const b=m.ler().cenas[0].barreiras[0];
  const deslocamento=[{x:-1,z:0},{x:1,z:0}];
  assert.equal(bloqueiaMovimentoCompartilhado3D(...deslocamento,[b],area),true);
  assert.equal(editarBarreiraCompartilhada3D('camp-teste','c1',{...b,aberta:true},m),true);
  assert.equal(bloqueiaMovimentoCompartilhado3D(...deslocamento,m.ler().cenas[0].barreiras,area),false);
  assert.equal(editarBarreiraCompartilhada3D('camp-teste','c1',{...b,x1:40,y1:40,x2:60,y2:40},m),true);
  assert.equal(m.ler().cenas[0].barreiras[0].x2,60);
  assert.equal(excluirBarreiraCompartilhada3D('camp-teste','c1',b.id,m),true);
  assert.equal(m.ler().cenas[0].barreiras.length,0);
  assert.equal(excluirBarreiraCompartilhada3D('camp-teste','c1',b.id,m),false);
});

test('renderizador cria mesa de madeira e apresenta paredes 2D somente para o mestre',()=>{
  const previous=globalThis.document;globalThis.document=documento();let sala;
  try{
    sala=criarSala3D('Teste','#bd9da0');sala.configurarCenario(area);sala.configurarConstrucao(false,area);
    const madeira=sala.cena.getObjectByName('mesa-de-madeira-ao-redor-do-mapa');
    assert.ok(madeira instanceof THREE.Group);assert.equal(madeira.children.length,4);
    // A moldura não contém qualquer cubo sobre a imagem do mapa.
    sala.cena.updateMatrixWorld(true);
    for(const peca of madeira.children){
      assert.ok(peca instanceof THREE.Mesh);
      assert.equal(new THREE.Box3().setFromObject(peca).containsPoint(new THREE.Vector3(0,-.215,0)),false);
    }
    const piso=sala.cena.getObjectByName('chao-3d-do-mapa');
    assert.ok(piso instanceof THREE.Mesh);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(piso).max.x-20)<.001);
    const b={id:'wall-demo',tipo:'parede',x1:20,y1:25,x2:80,y2:25,aberta:false,trancada:false};
    sala.configurarBarreiras([b],area,true,b.id);
    const grupo=sala.cena.getObjectByName('barreiras-compartilhadas-da-planta');
    assert.equal(grupo.visible,true);assert.equal(grupo.children.length,3);
    const linha=grupo.children[0];assert.ok(linha instanceof THREE.Line);
    sala.cena.updateMatrixWorld(true);
    const raio=new THREE.Raycaster(new THREE.Vector3(-12,8,-5),new THREE.Vector3(0,-1,0));
    assert.equal(sala.barreiraAtingida(raio)?.id,b.id);
    sala.configurarBarreiras([b],area,false,b.id);
    assert.equal(grupo.visible,false);assert.equal(grupo.children.length,0);
  }finally{sala?.dispose();globalThis.document=previous;}
});

test('interface usa ferramentas compartilhadas e câmera 2.5D inclinada; editor apresenta só Mapa e Construção',()=>{
  const src=ler('src/mesa3d/Mesa3DPrototipo.tsx');
  assert.match(src,/criarBarreiraCompartilhada3D/);assert.match(src,/editarBarreiraCompartilhada3D/);
  assert.match(src,/excluirBarreiraCompartilhada3D/);assert.match(src,/barreiraAtingida/);
  assert.match(src,/elevacaoCamera/);assert.match(src,/camera\.lookAt\(foco\.x,foco\.y-\.22,foco\.z\)/);
  for(const [id,rotulo] of [['mapa','Mapa'],['construcao','Construção']])assert.ok(src.includes(`{id:'${id}',rotulo:'${rotulo}'`));
  assert.doesNotMatch(src,/abaEditor==='ambiente'/);assert.doesNotMatch(src,/cameraConstruir/);
  assert.match(src,/Unificar este mapa com a Mesa 2D/);
});
