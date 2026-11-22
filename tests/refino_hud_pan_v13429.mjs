import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const fonte=(rel)=>readFileSync(new URL('../src/'+rel,import.meta.url),'utf8');
const executar=(rel,mocks={})=>{
  const js=ts.transpileModule(fonte(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const ctx={exports:{},require:(name)=>{
    if(!(name in mocks))throw Error('Dependency not mocked: '+name);
    return mocks[name];
  },Math,JSON};vm.runInNewContext(js,ctx);return ctx.exports;
};
const normalizador=executar('lib/mesaCompartilhada.ts',{
  '../lib/weather':{normalizarClima:()=>({tipo:'limpo'})},
  './aparenciaToken':{normalizarAparenciaToken:()=>({})},
  './enquadramentoToken':{normalizarEnquadramento:v=>v||{x:0,y:0,zoom:1}},
  './fogExploracao':{validarMemoriaFog:()=>({})},
  './iniciativaParticipantes':{normalizarParticipantesIniciativa:(v)=>Array.isArray(v)?v:[]},
}).normalizarEstadoCompartilhado;
const raw={titulo:'Mesa Teste',cenaAtivaId:'c1',cenas:[{id:'c1',nome:'Arena',tokens:{}}],unidades:[
  {id:'m',nome:'Morgana',condicoes:[
    {id:'e1',nome:'Vela Aquática',turnos:2,tipo:'buff',origem:'Morgana'},
    {id:'e2',nome:'Imobilizado',turnos:1,tipo:'debuff',origem:'Naeris'},
    {id:'e3',nome:'Imobilizado',turnos:1,tipo:'condicao'},
    {id:'e4',nome:'Queimando',turnos:3},
  ]},
]};
const hud=executar('mesa3d/hudEfeitos3D.ts');
const viewer=fonte('mesa3d/Mesa3DPrototipo.tsx');
const app=fonte('App.tsx');
const css=fonte('hexatombe/FaixasEfeitos.css');

test('a leitura 3D mantém buff, debuff e condição sem duplicar/converter tipos',()=>{
  const resultado=normalizador(raw);
  const effects=resultado.unidades[0].condicoes;
  assert.equal(effects.length,4);
  assert.deepEqual(Array.from(effects,e=>e.tipo??'condicao'),['buff','debuff','condicao','condicao']);
  assert.deepEqual(Array.from(effects,e=>e.nome),['Vela Aquática','Imobilizado','Imobilizado','Queimando']);
  assert.equal(effects[1].origem,'Naeris');
  assert.equal(effects[3].origem,undefined);
  assert.equal(raw.unidades[0].condicoes[1].tipo,'debuff');
});
test('tipo inválido ou legado não vira buff indevidamente',()=>{
  const x=normalizador({...raw,unidades:[{id:'legacy',condicoes:[{id:'l',nome:'Raiz',turnos:1,tipo:'erro'}]}]});
  assert.equal(x.unidades[0].condicoes[0].tipo,undefined);
});
test('pan da HUD é limitado à área útil do mapa',()=>{
  const base={left:700,top:450,width:280,height:180};
  const palco={left:0,top:0,right:1000,bottom:700};
  const a=hud.limitarDeslocamentoHud3D({x:700,y:700},base,palco);
  assert.equal(a.x,12);assert.equal(a.y,62);
  const b=hud.limitarDeslocamentoHud3D({x:-5000,y:-5000},base,palco);
  assert.equal(b.x,-692);assert.equal(b.y,-442);
});
test('posição da HUD pode ser salva, recuperada e restaurada',()=>{
  const dados=new Map();const storage={getItem:k=>dados.get(k)??null,setItem:(k,v)=>dados.set(k,v),removeItem:k=>dados.delete(k)};
  hud.salvarDeslocamentoHud3D({x:-175,y:45},storage);
  const pos=hud.lerDeslocamentoHud3D(storage);assert.equal(pos.x,-175);assert.equal(pos.y,45);
  hud.salvarDeslocamentoHud3D(null,storage);
  assert.equal(hud.lerDeslocamentoHud3D(storage).x,0);
});
test('HUD em cena usa o mesmo componente da ficha e aceita arrasto com reset',()=>{
  assert.match(viewer,/FaixasEfeitos efeitos=\{personagemEmTurno\.condicoes\} compacto/);
  assert.match(viewer,/onPointerDown=\{iniciarArrastoHudEfeitos\}/);
  assert.match(viewer,/onPointerMove=\{moverHudEfeitos\}/);
  assert.match(viewer,/onPointerUp=\{terminarArrastoHudEfeitos\}/);
  assert.match(viewer,/onClick=\{reiniciarPosicaoHudEfeitos\}/);
  assert.match(css,/\.m3d-efeitos-em-cena\{pointer-events:auto/);
});
test('botão do meio move câmera tática e botão direito mantém rotação',()=>{
  assert.match(viewer,/cinematicaRef\.current\?\.modo==='tatica'&&\(ev\.button===2\|\|ev\.button===1\|\|\(ev\.button===0&&ev\.shiftKey\)\)/);
  assert.match(viewer,/botaoMouse===1/);
  assert.match(viewer,/deslocarAlvoCamera\(\{x:base\.x\+offset\.x,z:base\.z\+offset\.z\}/);
  assert.match(viewer,/girarCameraTatica\(yawTaticoRef\.current,pitchTaticoRef\.current,dx,dy\)/);
  assert.match(viewer,/const centro=new THREE\.Vector3\(plano\.centro\.x\+deslocamento\.x/);
  assert.match(app,/Shift \+ botão esquerdo ou botão do meio: mover/);
});
test('reenquadramento limpa somente o pan tático',()=>{
  assert.match(viewer,/cinematica-reenquadrar'\)\{definirZoomTatico\(100\);enquadrarTodosCombateRef\.current=true;deslocamentoTaticoRef\.current=\{x:0,z:0\}/);
});
