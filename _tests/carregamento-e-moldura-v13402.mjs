import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {criarSala3D} from '../src/mesa3d/roomScene.ts';
import {distanciaInicialMapa3D} from '../src/mesa3d/enquadramentoMesa3D.ts';

function documento(){
  const context=new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:30}):key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
  return {createElement:tag=>tag==='canvas'?{width:512,height:512,getContext:()=>context}:{}};
}
function verificarMoldura(w,d){
  const anterior=globalThis.document;globalThis.document=documento();let sala;
  try{
    sala=criarSala3D();
    const cenario={versao:1,base:'vazia',mapaUnico:true,piso:'imagem',objetos:[],larguraTerreno:w,profundidadeTerreno:d};
    sala.configurarCenario(cenario);sala.configurarConstrucao(false,cenario);
    sala.cena.updateMatrixWorld(true);
    const moldura=sala.cena.getObjectByName('mesa-de-madeira-ao-redor-do-mapa');
    assert.ok(moldura instanceof THREE.Group);
    assert.equal(moldura.children.length,4);
    const centro=new THREE.Vector3(0,-.215,0);
    for(const parte of moldura.children){
      assert.ok(parte instanceof THREE.Mesh);
      assert.equal(new THREE.Box3().setFromObject(parte).containsPoint(centro),false,
        `${parte.name} não pode invadir o centro do tabuleiro`);
    }
    const chao=sala.cena.getObjectByName('chao-3d-do-mapa');
    assert.ok(chao instanceof THREE.Mesh);
    const caixa=new THREE.Box3().setFromObject(chao);
    assert.ok(Math.abs(caixa.max.x-caixa.min.x-w)<1e-5);
    assert.ok(Math.abs(caixa.max.z-caixa.min.z-d)<1e-5);
    // As réguas encostam no mapa apenas pelas bordas; o interior fica livre.
    for(const parte of moldura.children){
      const box=new THREE.Box3().setFromObject(parte);
      assert.ok(box.min.x>=w/2-.01||box.max.x<=-w/2+.01||box.min.z>=d/2-.01||box.max.z<=-d/2+.01);
    }
  }finally{sala?.dispose();globalThis.document=anterior;}
}

test('mapa vertical carrega moldura exterior sem bloco de madeira no centro',()=>verificarMoldura(13.75,22));
test('mapa horizontal carrega moldura exterior sem bloco de madeira no centro',()=>verificarMoldura(35,12));
test('a moldura acompanha alteração de medidas sem duplicar peças',()=>{
  const anterior=globalThis.document;globalThis.document=documento();let sala;
  try{
    sala=criarSala3D();
    const c={versao:1,base:'vazia',objetos:[],mapaUnico:true,piso:'imagem',larguraTerreno:30,profundidadeTerreno:16};
    sala.configurarConstrucao(false,c);
    const moldura=sala.cena.getObjectByName('mesa-de-madeira-ao-redor-do-mapa');
    const antes=moldura.children[0].scale.x;
    sala.configurarConstrucao(false,{...c,larguraTerreno:15,profundidadeTerreno:27});
    assert.equal(moldura.children.length,4);
    assert.ok(moldura.children[0].scale.x<antes);
    assert.ok(Math.abs(moldura.children[0].scale.x-15.92)<1e-6);
  }finally{sala?.dispose();globalThis.document=anterior;}
});
test('distância inicial considera formato e janela para não exigir abrir Terreno 3D',()=>{
  const v=distanciaInicialMapa3D(12,25,16/9), h=distanciaInicialMapa3D(25,12,16/9);
  assert.ok(v>12&&h>12);assert.notEqual(v,h);
  assert.ok(distanciaInicialMapa3D(80,80,16/9)>v);
  assert.equal(distanciaInicialMapa3D(22,14,NaN),18);
});
test('carregamento sincroniza o chão na montagem e só expõe imagem após proporção',()=>{
  const codigo=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
  assert.match(codigo,/sala\.configurarCenario\(cenarioRef\.current\);sala\.configurarConstrucao\(modoEdicaoRef\.current,cenarioRef\.current\)/);
  assert.match(codigo,/setMapaPronto\(false\)/);
  assert.match(codigo,/setMapaPronto\(true\)/);
  const inicio=codigo.indexOf('const carregarMapa=async()=>');
  const aplicar=codigo.indexOf('await sala.aplicarPiso(blob?',inicio);
  const atualizar=codigo.indexOf('sala.configurarConstrucao(modoEdicaoRef.current,atual)',inicio);
  assert.ok(inicio>0&&atualizar>inicio&&aplicar>atualizar);
  assert.match(codigo,/m3d-mapa-carregando/);
});
