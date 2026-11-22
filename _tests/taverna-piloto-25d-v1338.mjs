import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {montarTavernaPiloto25D,podeMontarTavernaPiloto25D} from '../src/mesa3d/tavernaPiloto25D.ts';
import {normalizarCenario3D, salvarCenario3D, carregarCenario3D, colisaoCenario3D} from '../src/mesa3d/editorCena3D.ts';
import {criarSala3D} from '../src/mesa3d/roomScene.ts';
const original={versao:1,base:'vazia',objetos:[],piso:'grama',larguraTerreno:30,profundidadeTerreno:30};
function documento(){const c=new Proxy({},{get:(_,name)=>name==='measureText'?()=>({width:30}):name==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});return {createElement:tag=>tag==='canvas'?{width:0,height:0,getContext:()=>c}:{} };}

test('taverna 2.5D é opcional e nunca substitui objetos ou plantas existentes',()=>{
  assert.equal(podeMontarTavernaPiloto25D(original),true);
  assert.equal(podeMontarTavernaPiloto25D({...original,piso:'imagem'}),false);
  assert.equal(podeMontarTavernaPiloto25D({...original,objetos:[{id:'obj-x',tipo:'parede'}]}),false);
  assert.throws(()=>montarTavernaPiloto25D({...original,piso:'imagem'}));
  assert.throws(()=>montarTavernaPiloto25D({...original,objetos:[{id:'obj-x',tipo:'parede'}]}));
  assert.equal(original.objetos.length,0);
});

test('modelo piloto cria taverna em escala reduzida com entrada aberta, móveis e luzes',()=>{
  const cena=montarTavernaPiloto25D(original);
  assert.equal(cena.base,'vazia');assert.equal(cena.piso,'madeira');
  assert.deepEqual([cena.larguraTerreno,cena.profundidadeTerreno],[18,17]);
  assert.equal(cena.objetos.length>18,true);
  assert.ok(cena.objetos.filter(o=>o.tipo==='parede').length>=5);
  for(const tipo of ['balcao','cadeira','vaso','mesa','luz','tapete','barril','porta']) assert.ok(cena.objetos.some(o=>o.tipo===tipo),tipo);
  assert.equal(colisaoCenario3D({x:0,z:7},cena),false,'a porta de entrada está desobstruída');
  assert.equal(colisaoCenario3D({x:0,z:3.65},cena),false,'o spawn não deve ficar preso');
  assert.equal(colisaoCenario3D({x:0,z:-6.5},cena),true,'parede dos fundos possui colisão');
  assert.equal(cena.objetos.filter(o=>o.estilo==='pixel').length>=7,true);
});

test('novos sprites e móveis sobrevivem à normalização e ao armazenamento por cena',()=>{
  const cena=montarTavernaPiloto25D(original);
  const anterior=globalThis.localStorage;
  const map=new Map();globalThis.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  try{
    const salva=salvarCenario3D('camp-piloto','cena-teste',cena);
    const lida=carregarCenario3D('camp-piloto','cena-teste');
    assert.equal(lida.objetos.length,cena.objetos.length);
    assert.equal(lida.objetos.filter(o=>o.estilo==='pixel').length,cena.objetos.filter(o=>o.estilo==='pixel').length);
    assert.deepEqual(normalizarCenario3D(salva).objetos.map(o=>o.tipo),cena.objetos.map(o=>o.tipo));
    assert.equal(carregarCenario3D('camp-piloto','outra-cena').objetos.length,0);
  }finally{globalThis.localStorage=anterior;}
});

test('renderizador instancia sprites pixelados selecionáveis e preserva iluminação do cenário',()=>{
  const anterior=globalThis.document;globalThis.document=documento();
  let sala;
  try{
    const cena=montarTavernaPiloto25D(original);
    sala=criarSala3D('Aventureiro','#b47d82');
    sala.configurarCenario({...cena,periodoDia:'entardecer'});
    sala.configurarConstrucao(true,cena);
    const grupo=sala.cena.getObjectByName('objetos-do-mestre');assert.ok(grupo);
    assert.equal(grupo.children.length,cena.objetos.length);
    const cadeira=cena.objetos.find(o=>o.tipo==='cadeira');
    const g=grupo.children.find(o=>o.userData.objetoId===cadeira.id);
    const sprite=g.children.find(o=>o.userData.movelPixel25D);
    assert.ok(sprite instanceof THREE.Mesh);
    assert.ok(sprite.material.map instanceof THREE.CanvasTexture);
    assert.equal(sprite.material.map.magFilter,THREE.NearestFilter);
    const camera=new THREE.PerspectiveCamera();camera.position.set(cadeira.x,3,cadeira.z+5);
    sala.girarParaCamera(camera);
    const raycaster=new THREE.Raycaster(new THREE.Vector3(cadeira.x,1,cadeira.z+4),new THREE.Vector3(0,0,-1));
    sala.cena.updateMatrixWorld(true); // renderer real atualiza as transformações antes de receber cliques
    assert.equal(sala.objetoAtingido(raycaster),cadeira.id);
    sala.selecionarObjeto(cadeira.id);
    assert.equal(sala.cena.getObjectByName('alcas-de-edicao').visible,true);
    sala.configurarCenario({...cena,periodoDia:'noite'});
    assert.ok(sala.cena.getObjectByName('objetos-do-mestre').children.length>0);
  } finally{sala?.dispose();globalThis.document=anterior;}
});

test('interface oferece template apenas no editor e mantém as abas 3D estáveis',()=>{
  const texto=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
  assert.match(texto,/Montar taverna de teste/);
  assert.match(texto,/podeMontarTavernaPiloto25D\(cenario\)/);
  assert.match(texto,/montarTavernaPiloto25D\(cenarioRef.current\)/);
  for(const aba of ['mapa','construcao'])assert.match(texto,new RegExp(`abaEditor==='${aba}'`));
  assert.doesNotMatch(texto,/abaEditor==='ambiente'/);
});
