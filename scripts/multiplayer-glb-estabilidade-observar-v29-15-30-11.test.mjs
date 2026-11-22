import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import * as THREE from 'three';

const src=(nome)=>readFileSync(new URL(`../src/${nome}`,import.meta.url),'utf8');
const camadaFonte=src('mesa3d/renderMiniaturas3D.ts');
const mestreFonte=src('mesa3d/roomScene.ts');
const filtroFonte=src('multiplayer/miniaturasVisaoIndividual3D.ts');
const publicadorFonte=src('multiplayer/visaoIndividualPublicada.ts');
const converter=ts=>stripTypeScriptTypes(ts,{mode:'strip'})
  .replace(/^import .*;\s*$/gm,'').replace(/export (async )?function /g,'$1function ');

function filtro(){return new Function(`${converter(filtroFonte)}\nreturn filtrarIdsMiniaturasVisaoIndividual3D;`)();}

test('v29.15.30.11: miniatura do observador não desaparece no limite do polígono',()=>{
  const check=filtro();
  const lista=[{id:'eu',personagemId:'personagem',x:30,y:40},{id:'outro',personagemId:'outro',x:45,y:40},
    {id:'livre',x:35,y:45},{id:'fora',x:90,y:90}];
  const presente=new Set(['personagem','outro']);
  assert.deepEqual(check(lista,presente,m=>m.x===35,'personagem'),['eu','livre']);
  // Sem observador, a miniatura independente ainda precisa passar no campo.
  assert.deepEqual(check(lista,presente,m=>m.x===35),['livre']);
  assert.match(publicadorFonte,/emVisao,observador\.id\)/);
  assert.match(mestreFonte,/pontoAutorizado,observadorId\?\?undefined\)/);
});

test('v29.15.30.11: camada GLB mantém posição no filtro e mixer entre ocultações',async()=>{
  const metrics={created:0,stopped:0,updates:0};
  class MockMixer{
    constructor(){metrics.created++;}
    clipAction(){return {setLoop(){return this;},play(){return this;}};}
    stopAllAction(){metrics.stopped++;}
    uncacheRoot(){}
    update(){metrics.updates++;}
  }
  class MockLoader{
    parse(_buffer,_path,loaded){
      const scene=new THREE.Group();
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial()));
      loaded({scene,animations:[new THREE.AnimationClip('Idle',1,[])]});
    }
  }
  const fn=new Function('THREE','GLTFLoader','cloneSkeleton','carregarMiniatura3D',
    'percentualParaChao3D','escolherIndiceIdle','normalizarModoAnimacaoMiniatura','normalizarVelocidadeAnimacao',
    `${converter(camadaFonte)}\nreturn criarCamadaMiniaturas3D;`);
  const criar=fn({...THREE,AnimationMixer:MockMixer},MockLoader,modelo=>modelo.clone(true),async()=>null,
    t=>({x:t.x,z:t.y}),()=>0,modo=>modo,vel=>vel??1);
  const cena=new THREE.Scene();
  const camada=criar(cena,async()=>new Blob([new Uint8Array([0])]));
  const lista=[{id:'modelo-1',modeloId:'teste',personagemId:'jogador',x:0,z:0,altura:0,escala:1,rotacao:0,animacaoModo:'idle'}];
  const tokens={jogador:{x:12,y:15}};
  const cenario={};
  camada.sincronizar(lista,cenario,tokens);
  let modelo;
  for(let i=0;i<50;i++){
    await new Promise(resolve=>setTimeout(resolve,2));
    modelo=cena.getObjectByName('miniaturas-3d-importadas')?.children[0];
    if(modelo)break;
  }
  assert.ok(modelo,'o modelo deveria carregar apenas uma vez');
  assert.equal(modelo.position.x,12);
  assert.equal(metrics.created,1);
  camada.moverVinculada('jogador',45,47);
  camada.configurarFiltroMiniaturasVisiveis(new Set(['modelo-1']));
  camada.configurarFiltroPersonagensVisiveis(new Set(['jogador']));
  assert.equal(modelo.position.x,45,'aplicar filtro não pode mover o GLB para a origem antiga');
  assert.equal(modelo.position.z,47);
  assert.equal(camada.vinculoAtivo('jogador'),true);
  camada.selecionar('modelo-1');
  const aro=modelo.children.find(child=>child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry);
  assert.ok(aro);
  assert.equal(aro.visible,false,'o aro de edição não pode invadir Observar');
  camada.configurarFiltroMiniaturasVisiveis(new Set());
  assert.equal(modelo.visible,false);
  assert.equal(camada.vinculoAtivo('jogador'),false,'sem GLB visível, sprite é fallback');
  assert.equal(metrics.stopped,0,'ocultar por fog não deve reiniciar o mixer');
  camada.configurarFiltroMiniaturasVisiveis(new Set(['modelo-1']));
  assert.equal(modelo.visible,true);
  assert.equal(metrics.created,1,'revelar não deve recriar a animação');
  assert.equal(modelo.position.x,45);
  camada.atualizarAnimacoes(.05);
  assert.ok(metrics.updates>0);
  camada.configurarFiltroMiniaturasVisiveis(null);
  camada.configurarFiltroPersonagensVisiveis(null);
  assert.equal(aro.visible,true,'sair da visão restaura seleção');
  camada.dispose();
});
