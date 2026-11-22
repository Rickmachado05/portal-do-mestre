const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
for(const path of ['src/mesa3d/Mesa3DPrototipo.tsx','src/portal/BibliotecaModelos3D.tsx','src/lib/navegacaoBibliotecaMiniaturas.ts']){
 const result=ts.transpileModule(fs.readFileSync(path,'utf8'),{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 const errs=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 assert.equal(errs.length,0,`${path} sintaxe: ${errs.map(x=>x.messageText)}`);
}
const source=fs.readFileSync('src/lib/navegacaoBibliotecaMiniaturas.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const nav={exports:{}};new Function('module','exports',js)(nav,nav.exports);
const a=nav.exports.urlBibliotecaGlobalMiniaturas3D,b=nav.exports.urlVoltarMesa3D;
assert.equal(a('camp-187a9391-e88b-4032-a256-9a2f2a74861b'),'/miniaturas/?campanhaRetorno=camp-187a9391-e88b-4032-a256-9a2f2a74861b');
assert.equal(b('?campanhaRetorno=camp-187a9391-e88b-4032-a256-9a2f2a74861b'),'/mesa3d/?campanha=camp-187a9391-e88b-4032-a256-9a2f2a74861b');
for(const invalid of ['https://evil.example/', '../../mesa3d','javascript:alert(1)', 'camp%2F1']){
 assert.equal(b('?campanhaRetorno='+encodeURIComponent(invalid)),null,'sem open redirect');
 assert.equal(a(invalid),'/miniaturas/');
}
assert.equal(b(''),null);
const mesa=fs.readFileSync('src/mesa3d/Mesa3DPrototipo.tsx','utf8');
const global=fs.readFileSync('src/portal/BibliotecaModelos3D.tsx','utf8');
const css=fs.readFileSync('src/mesa3d/Mesa3DPrototipo.css','utf8');
assert.match(mesa,/target="_top"/);
assert.doesNotMatch(mesa,/target="_blank"/);
assert.match(global,/Voltar à Mesa 3D/);
assert.match(mesa,/m3d-terreno-heading/);
assert.match(mesa,/m3d-terreno-primario/);
assert.match(mesa,/m3d-terreno-avancado/);
assert.match(mesa,/ref=\{detalhesTerrenoRef\}/);
assert.match(mesa,/usarMapaDaMesa2D\(\)/);
assert.match(mesa,/inputPisoRef\.current\?\.click\(\)/);
assert.match(mesa,/iniciarEdicaoTerreno\(\)/);
assert.match(css,/\.m3d-terreno-botoes/);
assert.match(css,/\.m3d-miniaturas-panel/);
for(const name of ['Biblioteca','Na cena','Importar','Animação idle (opcional)','Vincular ou substituir miniatura do personagem','Remover miniatura da cena'])assert.ok(mesa.includes(name),name);
console.log('v29.15.8: 24 verificações de interface, navegação, retorno e preservação de ações aprovadas.');
