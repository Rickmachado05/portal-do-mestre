import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const viewer=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');

test('a câmera de raycast segue a câmera tática visível',()=>{
  assert.match(viewer,/raycaster\.setFromCamera\([^;]+cinematicaRef\.current\?cameraCinematica:/);
  assert.match(viewer,/const token=sala\.tokenAtingido\(raycaster\)/);
});
test('botão esquerdo seleciona token na tática antes do bloqueio cinematográfico',()=>{
  const inicio=viewer.indexOf("if(cinematicaRef.current?.modo==='tatica'&&ev.button===0&&!ev.shiftKey)");
  const bloqueio=viewer.indexOf('if(cinematicaRef.current){ev.preventDefault();return;}',inicio);
  assert.ok(inicio>0&&bloqueio>inicio);
  const trecho=viewer.slice(inicio,bloqueio);
  assert.match(trecho,/selecionarTokenNoChao\(token\)/);
  assert.match(trecho,/tokenArrastado=token/);
  assert.match(trecho,/setPointerCapture\(ev.pointerId\)/);
  assert.match(trecho,/registro\?\.travado/);
  assert.match(trecho,/modoEdicaoRef\.current\|\|visaoIndividualRef\.current\|\|ferramentaFogRef\.current/);
});
test('movimentar na tática só pré-visualiza o token sem editar cenário',()=>{
  assert.match(viewer,/if\(cinematicaRef\.current\?\.modo==='tatica'&&botaoMouse===0\)\{\s*previsualizarMovimentoToken\(ev\);\s*return/);
  assert.match(viewer,/posicaoPermitidaNaMesa3D\(ponto,c,outras,cena\?\.barreiras\?\?\[\]\)/);
  assert.match(viewer,/sala\.visualizarToken\(tokenArrastado,ponto\.x,ponto\.z\)/);
});
test('soltar token na tática persiste na campanha e Mesa 2D',()=>{
  assert.match(viewer,/if\(cinematicaRef\.current\?\.modo==='tatica'\)\{\s*if\(botaoMouse===0\)concluirMovimentoToken\(\)/);
  assert.match(viewer,/moverTokenCompartilhado3D\(campanhaId,leituraCenaId\.current,tokenArrastado,previewToken,undefined,cenarioRef\.current\)/);
  assert.match(viewer,/const atualizado=buscarCampanha\(\);estadoRef\.current=atualizado;setEstado\(atualizado\)/);
});
test('zoom, pan e rotação táticos permanecem independentes do arrasto do token',()=>{
  assert.match(viewer,/cinematicaRef\.current\?\.modo==='tatica'&&\(ev\.button===2\|\|ev\.button===1\|\|\(ev\.button===0&&ev\.shiftKey\)\)/);
  assert.match(viewer,/girarCameraTatica\(yawTaticoRef\.current,pitchTaticoRef\.current,dx,dy\)/);
  assert.match(viewer,/definirZoomTatico\(zoomTaticoRef\.current\+\(ev\.deltaY>0\?10:-10\),true\)/);
  assert.match(app,/Arraste tokens com botão esquerdo/);
});
test('arquivos TSX modificados continuam sintaticamente válidos',()=>{
  for(const [name,source] of [['Mesa3DPrototipo.tsx',viewer],['App.tsx',app]]){
    const result=ts.transpileModule(source,{fileName:name,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
    assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0);
  }
});
