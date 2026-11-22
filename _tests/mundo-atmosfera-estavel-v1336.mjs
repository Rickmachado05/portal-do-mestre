import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { AMBIENTES_3D, periodoDia3DValido } from '../src/mesa3d/ambientes3D.ts';
import { normalizarCenario3D, salvarCenario3D, carregarCenario3D } from '../src/mesa3d/editorCena3D.ts';
import { criarSala3D } from '../src/mesa3d/roomScene.ts';

const fonte=(nome)=>readFileSync(new URL(`../src/mesa3d/${nome}`,import.meta.url),'utf8');
const CENARIO={versao:1,base:'vazia',objetos:[],piso:'madeira',larguraTerreno:22,profundidadeTerreno:18};

function documentoDeTeste(){
  const contexto=new Proxy({}, {get:(_,name)=>{
    if(name==='measureText') return str=>({width:String(str).length*12});
    if(name==='createLinearGradient')return ()=>({addColorStop(){}});
    return ()=>{};
  },set:()=>true});
  return {createElement:(tag)=>tag==='canvas'?{width:512,height:512,getContext:()=>contexto}:{}};
}

test('dados legados preservam a base estável e horários inválidos são ignorados',()=>{
  assert.equal(periodoDia3DValido('dia'),true);
  assert.equal(periodoDia3DValido('entardecer'),true);
  assert.equal(periodoDia3DValido('noite'),true);
  assert.equal(periodoDia3DValido('amanhecer'),false);
  for(const hora of ['dia','entardecer','noite']){
    const persistido=normalizarCenario3D({...CENARIO,periodoDia:hora});
    assert.equal(persistido.periodoDia,hora);
    assert.equal(persistido.larguraTerreno,22);
    assert.deepEqual(persistido.objetos,[]);
  }
  const anterior=normalizarCenario3D(CENARIO);
  assert.equal(anterior.periodoDia,undefined);
  assert.equal(normalizarCenario3D({...CENARIO,periodoDia:'quebrado'}).periodoDia,undefined);
  assert.notEqual(AMBIENTES_3D.dia.horizonte,AMBIENTES_3D.noite.horizonte);
});

test('horário é salvo somente na cena selecionada, sem reescrever a planta',()=>{
  const anterior=globalThis.localStorage;
  const memoria=new Map();
  globalThis.localStorage={getItem:(k)=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v)};
  try {
    const mapa={...CENARIO,piso:'imagem',larguraPlanta:18,profundidadePlanta:17,
      ajusteLivrePlanta:true,objetos:[{id:'obj-parede-1',tipo:'parede',nome:'Parede',x:1,z:2,rotacao:0,comprimento:5}]};
    salvarCenario3D('campanha-A','cena-A',{...mapa,periodoDia:'noite'});
    salvarCenario3D('campanha-A','cena-B',{...mapa,periodoDia:'dia'});
    const noite=carregarCenario3D('campanha-A','cena-A');
    const dia=carregarCenario3D('campanha-A','cena-B');
    assert.equal(noite.periodoDia,'noite');assert.equal(dia.periodoDia,'dia');
    assert.equal(noite.ajusteLivrePlanta,true);
    assert.equal(noite.objetos[0].comprimento,5);
    assert.equal(noite.larguraPlanta,18);
  }finally {globalThis.localStorage=anterior;}
});

test('instancia a mesma sala 3D, alterna céu e iluminação sem alterar objetos ou câmeras',()=>{
  const documentoAnterior=globalThis.document;
  globalThis.document=documentoDeTeste();
  let sala;
  try{
    sala=criarSala3D();
    const ceu=sala.cena.getObjectByName('atmosfera-ceu-3d');
    const solo=sala.cena.getObjectByName('horizonte-visual-sem-colisao');
    const estrelas=sala.cena.getObjectByName('estrelas-noturnas-3d');
    assert.ok(ceu instanceof THREE.Mesh);
    assert.ok(ceu.material instanceof THREE.MeshBasicMaterial);
    assert.equal(ceu.material.vertexColors,true);
    assert.ok(solo instanceof THREE.Mesh);
    assert.equal(solo.position.y<-.3,true); // sempre abaixo do terreno editável
    assert.ok(estrelas instanceof THREE.Points);
    assert.equal(estrelas.visible,false);
    const piso=sala.cena.children.find(obj=>obj instanceof THREE.Mesh && obj.geometry instanceof THREE.BoxGeometry && obj.geometry.parameters.width===18 && obj.position.y===-.22);
    assert.ok(piso);
    const pisoInicial=piso.geometry;
    const luz=sala.cena.children.find(obj=>obj instanceof THREE.DirectionalLight);
    assert.ok(luz);

    sala.configurarCenario({...CENARIO,periodoDia:'noite'});
    sala.configurarConstrucao(true,{...CENARIO,periodoDia:'noite'});
    sala.configurarIluminacao(100,false);
    assert.equal(estrelas.visible,true);
    assert.equal(sala.cena.background.getHexString(),new THREE.Color(AMBIENTES_3D.noite.horizonte).getHexString());
    assert.ok(luz.intensity<.5);
    assert.equal(piso.geometry,pisoInicial);

    sala.configurarCenario({...CENARIO,periodoDia:'entardecer'});
    assert.equal(estrelas.visible,false);
    assert.equal(sala.cena.background.getHexString(),new THREE.Color(AMBIENTES_3D.entardecer.horizonte).getHexString());
    const luzEntardecer=luz.intensity;
    sala.configurarIluminacao(20,true);
    assert.ok(luz.intensity<luzEntardecer);

    sala.configurarCenario({...CENARIO,periodoDia:'dia'});
    sala.configurarIluminacao(100,false);
    assert.ok(luz.intensity>luzEntardecer);
    assert.equal(sala.cena.background.getHexString(),new THREE.Color(AMBIENTES_3D.dia.horizonte).getHexString());
    assert.equal(ceu.material instanceof THREE.ShaderMaterial,false);
    assert.equal(sala.cena.getObjectByName('objetos-do-mestre')!==undefined,true);
  }finally {sala?.dispose();globalThis.document=documentoAnterior;}
});

test('só altera o módulo visual, a persistência do horário e seu seletor',()=>{
  const ui=fonte('Mesa3DPrototipo.tsx');
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(app,/CÉU E HORÁRIO · MESA 3D/);
  assert.match(app,/PERIODOS_DIA_3D\.map/);
  assert.match(ui,/periodoDia:periodo/); // Acesso standalone conserva o céu em Iluminação.
  assert.doesNotMatch(ui,/abaEditor==='ambiente'/);
  const base=fonte('roomScene.ts');
  assert.match(base,/atmosfera\.atualizar\(periodoDia\)/);
  assert.match(base,/atualizarLuzesAtmosfera/);
  assert.doesNotMatch(fonte('atmosfera3D.ts'),/ShaderMaterial|vertexShader|fragmentShader/);
});
