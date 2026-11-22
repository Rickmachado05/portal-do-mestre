const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const base = path.join(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(base,arquivo),'utf8');
const viewer = ler('src/hexatombe/FichaImpetoDetalhes.tsx');
const biblioteca = ler('src/portal/GestaoPersonagens.tsx');
const ficha = ler('src/hexatombe/AcoesDaFicha.tsx');
const catalogo = ler('src/hexatombe/acoesFichaDados.ts');
const editor = ler('src/portal/EditorPersonagemMestre.tsx');
const imersivo = ler('src/hexatombe/MenuCombateImersivo.tsx');
const estilo = ler('src/hexatombe/FichaImpetoDetalhes.css');

// A01: a consulta detalhada agrupa combate (5 ativas + passiva) e PX.
assert.ok(viewer.includes("secoes.includes('tecnicas') && secoes.includes('exploracao')"));
assert.ok(viewer.includes("abaTecnicas==='combate'"));
assert.ok(viewer.includes("abaTecnicas==='exploracao'"));
assert.ok(viewer.includes("secao === 'tecnicas' && abaTecnicas === 'combate'"));
assert.ok(viewer.includes("secao === 'exploracao' && abaTecnicas === 'exploracao'"));
assert.ok(biblioteca.includes("secoes={['tecnicas','exploracao']}"));

// Mestre: técnica manual só é marcada como exploração se o tipo declarar isso.
assert.ok(biblioteca.includes("ehExploracaoManual(h.type)"));
assert.ok(editor.includes('value="Exploração"'));
assert.ok(editor.includes('hx-mestre-tech-subtabs') && editor.includes('tecnicasVisiveis'));
assert.ok(editor.includes("type:abaTecnicas==='exploracao'?'Exploração':''"));
assert.ok(catalogo.includes("ativacao:ehExploracaoManual(h.type)?'exploracao':undefined"));
const marcador = catalogo.match(/export function ehExploracaoManual\(tipo\?:string\):boolean \{([\s\S]*?)\n\}/);
assert.ok(marcador, 'Função de reconhecimento presente');
const testavel = ts.transpileModule('function reconhecer(tipo?:string):boolean {'+marcador[1]+'\n}; module.exports=reconhecer;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};
new Function('module',testavel)(mod);
const reconhecer=mod.exports;
for(const tipo of ['Exploração','exploracao','EXPLORAÇÃO','  Exploração espiritual']) assert.equal(reconhecer(tipo),true,tipo);
for(const tipo of ['Ofensiva','Utilidade','Buff','Cura','','Explorar?']) assert.equal(reconhecer(tipo),false,tipo);

// Ficha da mesa: não confundir categoria de utilidade com tipo de exploração.
assert.ok(ficha.includes("a.ativacao!=='exploracao'"));
assert.ok(ficha.includes("a.ativacao==='exploracao'"));
assert.ok(ficha.includes("aria-label=\"Tipo de habilidades\""));
assert.ok(ficha.includes("Nenhuma técnica de exploração cadastrada"));
assert.ok(!imersivo.includes('hx-acoes-subtabs'), 'HUD imersiva preservada');
assert.ok(estilo.includes('.impeto-a01-subtabs') && estilo.includes('#27232a'), 'Paleta escura/dourada preservada');

for(const arquivo of ['src/hexatombe/FichaImpetoDetalhes.tsx','src/portal/GestaoPersonagens.tsx','src/portal/EditorPersonagemMestre.tsx','src/hexatombe/AcoesDaFicha.tsx','src/hexatombe/acoesFichaDados.ts']){
  const texto=ler(arquivo);
  const ast=ts.createSourceFile(arquivo,texto,ts.ScriptTarget.Latest,true,arquivo.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,`${arquivo}: erro de sintaxe`);
  const output=ts.transpileModule(texto,{fileName:arquivo,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((output.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,`${arquivo}: transpile`);
}
console.log('OK — v20: subtabs Combate/Exploração, separação A01 e manual, HUD preservada e TSX válido');
