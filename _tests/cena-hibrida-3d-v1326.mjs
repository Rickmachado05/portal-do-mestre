import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const root=new URL('../src/mesa3d/',import.meta.url);
const read=(x)=>readFileSync(new URL(x,root),'utf8');
const compile=(src)=>ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const url=(src)=>'data:text/javascript;base64,'+Buffer.from(compile(src)).toString('base64');
const helper=await import(url(read('pisoConstruicao3D.ts')));
const roomUrl=url(read('roomLogic.ts'));
const editor=await import(url(read('editorCena3D.ts').replace("from './roomLogic'",`from '${roomUrl}'`).replace("import type { AjusteImagemPiso3D } from './pisoConstruicao3D';",'')));

test('projeção do mapa vertical preserva proporção e centraliza sem corte',()=>{
  const v=helper.calcularProjecaoMapa3D(1065,1394,2048,1934,'conter');
  assert.ok(v.largura<2048);assert.equal(v.altura,1934);
  assert.ok(Math.abs(v.largura/v.altura-1065/1394)<1e-9);
  assert.ok(v.x>0);
  const crop=helper.calcularProjecaoMapa3D(1065,1394,2048,1934,'cobrir');
  assert.equal(crop.largura,2048);assert.ok(crop.altura>1934);
});
test('ajuste de posição e escala é reversível e independente da imagem armazenada',()=>{
  const v=helper.calcularProjecaoMapa3D(1065,1394,2048,1934,'conter',1.4,.10,-.1);
  assert.equal(v.altura,1934*1.4);
  assert.ok(v.x>0);assert.ok(v.y<0);
});
test('chave do mapa 2D é a mesma usada pela Mesa 2D',()=>{
  assert.equal(helper.CHAVE_MAPA_2D('cena-original'),'mapa');
  assert.equal(helper.CHAVE_MAPA_2D('cena-1'),'mapa:cena-1');
  assert.notEqual(helper.CHAVE_PISO_3D('cena-1'),helper.CHAVE_MAPA_2D('cena-1'));
});
test('campos novos do cenário são validados sem afetar objetos antigos',()=>{
  const o=editor.novoObjeto3D('parede',{x:1,z:1});
  const c=editor.normalizarCenario3D({versao:1,base:'vazia',objetos:[o],piso:'imagem',ajusteMapa:'conter',escalaMapa:1.35,deslocamentoMapaX:.2,deslocamentoMapaZ:-.1,opacidadePlanta:.4});
  assert.equal(c.objetos.length,1);assert.equal(c.escalaMapa,1.35);assert.equal(c.opacidadePlanta,.4);
  assert.equal(editor.colisaoCenario3D({x:1,z:1},c),true);
  const mal=editor.normalizarCenario3D({...c,ajusteMapa:'javascript',escalaMapa:100,deslocamentoMapaX:100,opacidadePlanta:-1});
  assert.equal(mal.ajusteMapa,undefined);assert.equal(mal.escalaMapa,2);assert.equal(mal.deslocamentoMapaX,.5);assert.equal(mal.opacidadePlanta,.15);
  assert.deepEqual(editor.normalizarCenario3D({versao:1,base:'vazia',objetos:[]}),{versao:1,base:'vazia',objetos:[]});
});
test('importação preserva proporções do arquivo processado',async()=>{
  const previousBitmap=globalThis.createImageBitmap,previousDocument=globalThis.document;
  const calls=[];
  globalThis.createImageBitmap=async()=>({width:1065,height:1394,close:()=>calls.push('close')});
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage:(_bmp,x,y,w,h)=>calls.push([x,y,w,h])}),toBlob:(cb)=>cb(new Blob(['ok'],{type:'image/jpeg'}))})};
  try{
    const out=await helper.prepararImagemPiso3D(new Blob(['test'],{type:'image/png'}));
    assert.equal(out.type,'image/jpeg');assert.deepEqual(calls[0],[0,0,1065,1394]);assert.equal(calls[1],'close');
  }finally{globalThis.createImageBitmap=previousBitmap;globalThis.document=previousDocument;}
});
test('interface reaproveita mapa da mesma cena e preserva suporte a arquivos legados',()=>{
  const ui=read('Mesa3DPrototipo.tsx'), scene=read('roomScene.ts');
  for(const text of ['Sincronizar mapa desta cena','CHAVE_MAPA_2D(idCena)','salvarArquivo(chaveArquivoCampanha(campanhaId,CHAVE_PISO_3D','escalaMapa','opacidadePlanta','deslocamentoMapaX','deslocamentoMapaZ'])assert.ok(ui.includes(text),text);
  assert.ok(scene.includes('calcularTamanhoVisualPlanta3D')); // mantém ajuste proporcional e permite redimensionamento independente na v1.3.35
  assert.ok(scene.includes('configPiso.opacidadePlanta'));
  assert.ok(scene.includes('slice(inicioEstruturaDemo)'));
  assert.match(ui,/confirmarRemocaoMapa/); // remoção do mapa compartilhado exige confirmação explícita
  assert.match(ui,/CHAVE_MAPA_2D/);
});
test('arquivos alterados compilam sintaticamente',()=>{
  for(const file of ['editorCena3D.ts','pisoConstruicao3D.ts','roomScene.ts','Mesa3DPrototipo.tsx']){
    const r=ts.transpileModule(read(file),{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
    assert.deepEqual(r.diagnostics||[],[],file);
  }
});
