const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const base = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(base, file), 'utf8');
const menu = read('src/hexatombe/MenuCombateImersivo.tsx');
const cartoes = read('src/hexatombe/AcoesDaFicha.tsx');
const app = read('src/App.tsx');
const logicaCritico = read('src/impeto/combate.ts');

// Ambos os cartões permitem consulta, acerto e rolagem normal, sem botões de
// confirmação passíveis de toque acidental e sem rolagem de crítico separada.
for (const [nome, conteudo] of [['Ficha 2D/3D', cartoes], ['HUD imersiva', menu]]) {
  assert.ok(!conteudo.includes('Registrar uso'), `${nome}: botão Registrar uso deve sair`);
  assert.ok(!conteudo.includes('onRegistrarUso'), `${nome}: callback de registro deve sair`);
  assert.ok(!conteudo.includes('⚄ Crítico'), `${nome}: botão Crítico deve sair`);
  assert.ok(!conteudo.includes('formulaCritica') && !conteudo.includes('dadosCritico'), `${nome}: fórmula crítica redundante`);
  assert.ok(conteudo.includes('Teste CA'), `${nome}: Teste CA deve continuar`);
  assert.ok(conteudo.includes('formula'), `${nome}: rolagem normal deve continuar`);
}
assert.ok(cartoes.includes('Ver descrição'), 'Ficha: consulta da descrição deve continuar');
assert.ok(cartoes.includes('✧ Ícone'), 'Ficha: edição do ícone deve continuar');
assert.ok(app.includes('recurso(\'HP\''), 'HP permanece editável');
assert.ok(app.includes('recurso(fichaSelecionadaA01?\'ENERGIA\''), 'Energia permanece editável');
assert.ok(app.includes('imp-escudo-ajustes'), 'Escudo permanece editável');
assert.ok(!app.includes('registrarUsoImpeto'), 'Handler de registro oculto deve sair');
assert.ok(!app.includes('onRegistrarUso'), 'Ações não devem registrar uso por clique');
assert.ok(logicaCritico.includes('export function formulaDano'), 'Cálculo da regra de crítico permanece no motor');
assert.ok(cartoes.includes('um dado de dano adicional'), 'Ajuda de crítico manual deve ser mantida');
for (const arquivo of ['src/App.tsx','src/hexatombe/MenuCombateImersivo.tsx','src/hexatombe/AcoesDaFicha.tsx']) {
  const texto = read(arquivo);
  const ast = ts.createSourceFile(arquivo,texto,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length,0,`${arquivo}: sintaxe TSX`);
  const js = ts.transpileModule(texto,{fileName:arquivo,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((js.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,`${arquivo}: transpile TSX`);
}
console.log('OK — v18: cards sem botões Registrar uso/Crítico, rolagens e ajustes manuais preservados');
