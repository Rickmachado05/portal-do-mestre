import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {periodoAtualCena3D, salvarPeriodoCena3D} from '../src/mesa3d/controleAtmosferaCena3D.ts';
import {carregarCenario3D, salvarCenario3D} from '../src/mesa3d/editorCena3D.ts';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';

const fonte=(nome)=>readFileSync(new URL('../'+nome,import.meta.url),'utf8');
const app=fonte('src/App.tsx');
const viewer=fonte('src/mesa3d/Mesa3DPrototipo.tsx');
const css=fonte('src/mesa3d/Mesa3DPrototipo.css');

test('Mapa 3D compartilha Mapa e Construção, sem aba Ambiente duplicada',()=>{
  for(const [id,rotulo] of [['mapa','Mapa'],['construcao','Construção']]){
    assert.ok(viewer.includes(`{id:'${id}',rotulo:'${rotulo}'`),rotulo);
  }
  assert.doesNotMatch(viewer,/{id:'ambiente',rotulo:/);
  assert.doesNotMatch(viewer,/abaEditor==='ambiente'/);
  assert.match(viewer,/Céu e horários agora ficam em/);
  assert.match(css,/\.m3d-editor-tabs\{display:grid;grid-template-columns:repeat\(2,/);
});

test('Iluminação oferece a atmosfera 3D, mas a Mesa 2D não ganha os controles extras',()=>{
  assert.match(app,/MODO_3D&&<section className="iluminacao-ceu-3d"/);
  assert.match(app,/CÉU E HORÁRIO · MESA 3D/);
  assert.match(app,/escolherPeriodoDia3D\(periodo\)/);
  assert.match(app,/setPeriodoDiaCena3D\(periodoAtualCena3D\(CAMPAIGN_ID,campanha.cenaAtivaId\)\)/);
  assert.match(app,/Iluminação e obstáculos/);
  assert.match(app,/titulo="Clima da cena"/);
});

test('horário é isolado por campanha e cena e não modifica o cenário 2D',()=>{
  const original=globalThis.localStorage;
  const dados=new Map();
  globalThis.localStorage={getItem:key=>dados.get(key)??null,setItem:(key,value)=>dados.set(key,value)};
  try{
    const base={versao:1,base:'vazia',piso:'madeira',larguraTerreno:38,profundidadeTerreno:22,
      objetos:[{id:'obj-abcd',tipo:'parede',nome:'Parede da taverna',x:2,z:3,rotacao:0,comprimento:5}]};
    salvarCenario3D('campA','cena01',base);
    salvarCenario3D('campA','cena02',base);
    salvarPeriodoCena3D('campA','cena01','noite');
    assert.equal(periodoAtualCena3D('campA','cena01'),'noite');
    assert.equal(periodoAtualCena3D('campA','cena02'),'dia');
    assert.equal(periodoAtualCena3D('campB','cena01'),'dia');
    const cena=carregarCenario3D('campA','cena01');
    assert.equal(cena.larguraTerreno,38);
    assert.equal(cena.profundidadeTerreno,22);
    assert.equal(cena.objetos.length,1);
    assert.equal(cena.objetos[0].comprimento,5);
    assert.throws(()=>salvarPeriodoCena3D('campA','cena01','chuvoso'),/inválido/);
    assert.equal(periodoAtualCena3D('campA','cena01'),'noite');
  }finally{globalThis.localStorage=original;}
});

test('alteração do menu atualiza o iframe sem recompilar o renderizador',()=>{
  assert.match(app,/enviar3D\('atmosfera',periodo\)/);
  assert.match(viewer,/if\(tipo==='atmosfera'&&periodoDia3DValido\(valor\)\)/);
  assert.match(viewer,/const atualizado=carregarCenario3D\(campanhaId,leituraCenaId.current\)/);
  assert.match(viewer,/cenarioRef.current=atualizado;setCenario\(atualizado\)/);
  assert.match(viewer,/sala\.configurarCenario\(cenario\)/);
});

test('JSX do Portal e visualizador continua parseável',()=>{
  for(const [name,content] of [['App',app],['viewer',viewer]]){
    const sf=ts.createSourceFile(name+'.tsx',content,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
    assert.equal(sf.parseDiagnostics.length,0,name);
  }
});
