const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const src = path.join(__dirname, '..', 'src');
const read = (p) => fs.readFileSync(path.join(src, p), 'utf8');
const app = read('App.tsx');
const biblioteca = read('portal/GestaoPersonagens.tsx');
const bibliotecaCss = read('portal/GestaoPersonagens.css');
const ficha = read('hexatombe/FichaImpetoDetalhes.tsx');
const fichaCss = read('hexatombe/FichaImpetoDetalhes.css');
const teste = read('hexatombe/TestesImpeto.tsx');
const testeCss = read('impeto/portalA01.css');
const fichaAbas = read('fichaAbas.css');
const menu = read('hexatombe/MenuCombateImersivo.tsx');

// Identidade visual e navegação: mesma seção interna, rótulo mais intuitivo.
assert.ok(app.includes("['escolhas','Construção']"));
assert.ok(biblioteca.includes("['escolhas','Construção']"));
assert.ok(app.includes('secoes={[abaPersonagem]}'));
assert.ok(biblioteca.includes("secoes={['escolhas']}"));
assert.ok(ficha.includes('Construção do personagem'));
assert.ok(ficha.includes('pontosRecursos(ficha.recursosPR)'));
assert.ok(ficha.includes('8 valores'));
assert.ok(ficha.includes('16 treinamentos'));
assert.ok(fichaCss.includes('linear-gradient(145deg,rgba(39,35,40,.96)'));
assert.ok(fichaCss.includes('background:rgba(19,19,25,.8)'));
assert.ok(bibliotecaCss.includes('background:linear-gradient(140deg,#29262d,#1d1d25'));
assert.ok(fichaAbas.includes('.hx-ficha-personagem-abas'));

// Rolagem nova: textos humanos, mesmos valores e mesma função de dados.
assert.ok(teste.includes('Rolagem de perícia'));
assert.ok(teste.includes('O mestre define a dificuldade.'));
assert.ok(teste.includes('Rolar teste (+{bonus})'));
assert.ok(teste.includes('`1d20+${bonus}`'));
assert.ok(teste.includes('valorAtributo + bonusPericia'));
for (const [cd, texto] of [[15,'Simples'],[20,'Moderada'],[25,'Difícil'],[30,'Muito difícil'],[35,'Excepcional']]) {
  assert.ok(teste.includes(`cd: ${cd}, rotulo: '${texto}'`));
}
assert.ok(testeCss.includes('container-type:inline-size'));
assert.ok(testeCss.includes('impeto-a01-testes-cds'));
assert.ok(testeCss.includes('background:linear-gradient(155deg,#29252a'));

// Ações e infraestrutura permanecem disponíveis e independentes da edição visual.
assert.ok(app.includes('AcoesDaFicha'));
assert.ok(menu.includes('acoesDaSecaoMenu'));
for (const file of ['App.tsx','portal/GestaoPersonagens.tsx','hexatombe/FichaImpetoDetalhes.tsx','hexatombe/TestesImpeto.tsx']) {
  const ast = ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length,0, `Erro TSX em ${file}`);
  const out = ts.transpileModule(read(file), {fileName:file, compilerOptions: {target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}});
  assert.equal(out.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length||0,0,`Erro na transformação em ${file}`);
}
console.log('OK — v17: navegação, conteúdo, cores, CDs originais, fórmulas, TSX e menus preservados');
