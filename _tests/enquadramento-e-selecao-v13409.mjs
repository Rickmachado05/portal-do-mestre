import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizarEnquadramento,enquadramentoTokenAtivo,estiloEnquadramento} from '../src/lib/enquadramentoToken.ts';

const fonte=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('valores de ajuste ausentes ou antigos usam padrões seguros',()=>{
  assert.deepEqual(normalizarEnquadramento(),{x:0,y:0,zoom:1});
  assert.deepEqual(normalizarEnquadramento({x:999,y:-500,zoom:12}),{x:100,y:-100,zoom:3});
  assert.deepEqual(normalizarEnquadramento({x:NaN,y:Infinity,zoom:-8}),{x:0,y:0,zoom:.6});
  assert.equal(estiloEnquadramento({x:15,y:-10,zoom:1.5})['--ajuste-x'],'15%');
});

test('retratos não interferem no enquadramento de token e cada skin tem ajuste próprio',()=>{
  const unidade={retratoEnquadramento:{x:35,y:12,zoom:2.3},tokenEnquadramento:{x:0,y:40,zoom:1.3},
    skinPadraoId:'passeio',skins:[{id:'passeio',nome:'Passeio',enquadramento:{x:-15,y:20,zoom:1.6}},
      {id:'luta',nome:'Luta',enquadramento:{x:45,y:0,zoom:2.1}}]};
  assert.deepEqual(enquadramentoTokenAtivo(unidade),{x:-15,y:20,zoom:1.6});
  assert.deepEqual(enquadramentoTokenAtivo(unidade,{skinId:'luta'}),{x:45,y:0,zoom:2.1});
  assert.deepEqual(enquadramentoTokenAtivo(unidade,{skinId:'original'}),{x:0,y:40,zoom:1.3});
  assert.deepEqual(unidade.retratoEnquadramento,{x:35,y:12,zoom:2.3});
});

test('clicar token no chão 3D não troca o protagonista e recria texturas',()=>{
  const viewer=fonte('src/mesa3d/Mesa3DPrototipo.tsx');
  const inicio=viewer.indexOf('if(token){',viewer.indexOf('const pointerDown='));
  const fim=viewer.indexOf('}else{',inicio);
  const bloco=viewer.slice(inicio,fim);
  assert.match(bloco,/selecionarTokenNoChao\(token\)/);
  assert.doesNotMatch(bloco,/setId\(token\)|idRef\.current=token/);
});

test('flip de cena 2D aparece com a seleção, 3D mantém seu botão e ambos guardam espelhadoX',()=>{
  const app=fonte('src/App.tsx');
  const viewer=fonte('src/mesa3d/Mesa3DPrototipo.tsx');
  assert.match(app,/tokenEmEdicaoId&&cenaAtual\.tokens\[tokenEmEdicaoId\]/);
  assert.match(app,/Flip token/);
  assert.match(app,/espelhadoX:!p\.espelhadoX/);
  assert.match(viewer,/inverterTokenSelecionadoNo3D/);
  assert.match(viewer,/espelharTokenCompartilhado3D/);
});

test('avatar e token recebem preview e posição/zoom sem regravar PNG',()=>{
  const app=fonte('src/App.tsx');
  const css=fonte('src/App.css');
  assert.match(app,/EditorEnquadramento titulo="Avatar \/ retrato"/);
  assert.match(app,/EditorEnquadramento titulo=\{`Token/);
  assert.match(app,/skin\.enquadramento|sk\.enquadramento|enquadramento:normalizarEnquadramento\(valor\)/);
  assert.match(css,/\.token\.token-topview \.token-arte/);
  assert.match(css,/border-radius:50%/);
  assert.match(css,/\.borda-retrato img/);
});
