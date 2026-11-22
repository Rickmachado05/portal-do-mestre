const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
const base='src/';
for(const file of ['lib/bibliotecaMiniaturas3D.ts','portal/BibliotecaModelos3D.tsx','mesa3d/Mesa3DPrototipo.tsx']){
  const original=fs.readFileSync(base+file,'utf8');
  const parsed=ts.transpileModule(original,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
  const errors=(parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,`${file}: ${errors.map(e=>e.messageText).join(', ')}`);
}
const mesa=fs.readFileSync(base+'mesa3d/Mesa3DPrototipo.tsx','utf8');
assert.match(mesa,/<a className="m3d-mini-portal-link" href=\{urlBibliotecaGlobalMiniaturas3D\(campanhaId\)\} target="_top"/,'abre página global na mesma aba fora do iframe');
const biblioteca=fs.readFileSync(base+'portal/BibliotecaModelos3D.tsx','utf8');
for(const palavra of ['multiselecao','Selecionar visíveis','Excluir selecionados','Limpar seleção','classificarModelosParaExclusao3D','window.confirm','excluirMiniaturaDaBiblioteca3D'])assert.ok(biblioteca.includes(palavra),palavra);
assert.match(biblioteca,/type="checkbox" aria-label=\{`Selecionar \$\{m.nome\}`\}/);
const css=fs.readFileSync(base+'portal/BibliotecaModelos3D.css','utf8');
assert.match(css,/\.gm-modelos-item-row\.marcado/);

const usados='mini-abcdfg123',livre1='mini-asdfg123',livre2='mini-qwerty456';
const registros=[usados,livre1,livre2].map(id=>({id,nome:id,bytes:100,triangulos:100,importadoEm:'2026-11-19T00:00:00Z'}));
const dados=new Map([
  ['portal-mestre-biblioteca-miniaturas3d-v1',JSON.stringify(registros)],
  ['portal-mestre-cenario3d-v1:camp-a:cena-1',JSON.stringify({miniaturas:[{modeloId:usados}]})]
]);
global.localStorage={getItem:k=>dados.get(k)||null,setItem:(k,v)=>dados.set(k,v),removeItem:k=>dados.delete(k),key:i=>[...dados.keys()][i]||null,get length(){return dados.size;}};
global.window={dispatchEvent(){}};
const removidos=[];
const compiled=ts.transpileModule(fs.readFileSync(base+'lib/bibliotecaMiniaturas3D.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function('module','exports','require',compiled)(mod,mod.exports,req=>{
 assert.equal(req,'./storage');return {carregarArquivo:async()=>null,salvarArquivo:async()=>{},excluirArquivo:async key=>removidos.push(key)};
});
(async()=>{
 const lib=mod.exports;
 const plano=lib.classificarModelosParaExclusao3D([livre1,usados,livre2,livre1,'mini-inexistente']);
 assert.deepEqual(plano,{livres:[livre1,livre2],protegidos:[usados]},'não selecionar repetidos nem modelos em uso');
 for(const id of plano.livres)await lib.excluirMiniaturaDaBiblioteca3D(id);
 assert.equal(removidos.length,2,'apagar dois GLBs do IndexedDB');
 assert.deepEqual(lib.listarMiniaturas3D().map(m=>m.id),[usados],'modelo usado continua na biblioteca');
 await assert.rejects(lib.excluirMiniaturaDaBiblioteca3D(usados),/está em 1 cena/,'exclusão protegida no servidor local');
 console.log('v29.15.7 + v29.15.8: navegação na mesma aba fora do iframe, multisseleção, exclusão parcial, duplicatas, proteção entre campanhas aprovados.');
})().catch(e=>{console.error(e);process.exitCode=1});
