const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const raiz='src/';
const arquivos=['portal/BibliotecaModelos3D.tsx','portal/Portal.tsx','mesa3d/Mesa3DPrototipo.tsx','lib/bibliotecaMiniaturas3D.ts'];
for(const arquivo of arquivos){const source=fs.readFileSync(raiz+arquivo,'utf8');const compiled=ts.transpileModule(source,{fileName:arquivo,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,arquivo+' sintaxe');}
const portal=fs.readFileSync(raiz+'portal/Portal.tsx','utf8');
assert.match(portal,/url:'\/miniaturas\/'/);assert.match(portal,/BibliotecaModelos3D/);
assert.match(fs.readFileSync('vite.config.ts','utf8'),/miniaturas: fileURLToPath/);
assert.ok(fs.existsSync('miniaturas/index.html'));
const css=fs.readFileSync(raiz+'mesa3d/Mesa3DPrototipo.css','utf8');
assert.match(css,/\.m3d-miniaturas-panel \.m3d-mini-toggle\{display:flex!/,'checkbox horizontal');
const mesa=fs.readFileSync(raiz+'mesa3d/Mesa3DPrototipo.tsx','utf8');
assert.match(mesa,/Excluir GLB da biblioteca/);assert.match(mesa,/urlBibliotecaGlobalMiniaturas3D\(campanhaId\)/);

(async()=>{
  const modelo={id:'mini-abcdef789',nome:'Guerreiro',bytes:100,triangulos:300,importadoEm:'2026-11-19T00:00:00Z'};
  const dados=new Map([['portal-mestre-biblioteca-miniaturas3d-v1',JSON.stringify([modelo])],['portal-mestre-cenario3d-v1:camp-1:cena-1',JSON.stringify({miniaturas:[{id:'inst-1',modeloId:modelo.id}]})],['portal-mestre-cenario3d-v1:camp-2:cena-9',JSON.stringify({miniaturas:[{id:'inst-2',modeloId:modelo.id}]})]]);
  global.localStorage={getItem:k=>dados.get(k)||null,setItem:(k,v)=>dados.set(k,v),removeItem:k=>dados.delete(k),key:i=>[...dados.keys()][i]??null,get length(){return dados.size;}};
  global.window={dispatchEvent() {}};
  const removidos=[];
  const source=fs.readFileSync(raiz+'lib/bibliotecaMiniaturas3D.ts','utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};
  new Function('module','exports','require',compiled)(mod,mod.exports,req=>{
    assert.equal(req,'./storage');return {carregarArquivo:async()=>null, salvarArquivo:async()=>{},excluirArquivo:async k=>removidos.push(k)};
  });
  const library=mod.exports;
  assert.equal(library.localizarUsoMiniatura3D(modelo.id).length,2,'busca em todas as campanhas');
  await assert.rejects(library.excluirMiniaturaDaBiblioteca3D(modelo.id),/2 cena/,'não remove GLB ainda utilizado');
  assert.equal(removidos.length,0);assert.equal(library.listarMiniaturas3D().length,1);
  dados.delete('portal-mestre-cenario3d-v1:camp-1:cena-1');dados.delete('portal-mestre-cenario3d-v1:camp-2:cena-9');
  await library.excluirMiniaturaDaBiblioteca3D(modelo.id);
  assert.equal(removidos[0],'portal-mestre-miniatura3d:'+modelo.id,'bytes de GLB removidos');
  assert.equal(library.listarMiniaturas3D().length,0,'metadados também removidos');
  assert.ok(fs.existsSync('src/portal/BibliotecaModelos3D.css'));
  console.log('v29.15.6: página global, importação, navegação, checkbox, exclusão segura e detecção entre campanhas aprovados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
