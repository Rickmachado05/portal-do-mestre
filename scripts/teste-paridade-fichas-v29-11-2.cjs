const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const read = p => fs.readFileSync(p, 'utf8');
const player = read('src/multiplayer/FichaConvidado.tsx');
const master = read('src/App.tsx');
const shared = read('src/hexatombe/ConsultaPersonagemImpeto.tsx');
const css = read('src/multiplayer/FichaConvidado.css');
const test = (name, fn) => { fn(); console.log('✓', name); };

test('Mestre e jogador usam a mesma apresentação de Personagem', () => {
  assert.match(master, /<ConsultaPersonagemImpeto dados=\{dadosConsultaMestre\(fichaSelecionadaA01\)\}/);
  assert.match(player, /<ConsultaPersonagemImpeto dados=\{impeto\} aba=\{abaPersonagem\}/);
  assert.match(shared, /export default function ConsultaPersonagemImpeto/);
});
test('Dados de mestre convertidos sem mutação', () => {
  assert.match(shared, /NOMES_ATRIBUTOS\.map/);
  assert.match(shared, /NOMES_PERICIAS\.map/);
  assert.match(shared, /ficha\.pericias\[nome\]\*2/);
  assert.doesNotMatch(shared, /localStorage|sessionStorage|fetch\(/);
});
test('Cabeçalho do jogador retém HP, EN e CA sem duplicação na aba', () => {
  assert.match(player, /hx-ficha-resumo/);
  assert.match(player, /selo-ca/);
  assert.doesNotMatch(player, /<Recurso\s/);
  assert.match(player, /pm-jogo-atributos-limpos/);
  assert.doesNotMatch(player, /ESCUDO TEMPORÁRIO/);
});
test('Rolagem do jogador herda tema de perícias do mestre', () => {
  assert.match(player, /import '\.\.\/impeto\/portalA01\.css'/);
  assert.match(player, /impeto-a01-testes-cds/);
  assert.match(player, /impeto-a01-testes-rolar/);
});
test('Habilidades do jogador seguem componentes visuais do mestre', () => {
  assert.match(player, /hx-acoes-subtabs/);
  assert.match(player, /hx-acoes-conteudo/);
  assert.match(player, /hx-acao-ficha/);
  assert.match(css, /pm-jogo-habilidades/);
});
test('Permissões de convidado permanecem somente leitura', () => {
  assert.doesNotMatch(player, /atualizarUnidade|salvarFicha|onEditarIcone/);
  assert.match(player, /onRolarAcao/);
});
test('Sintaxe TSX válida nos três componentes', () => {
  for (const file of ['src/App.tsx','src/multiplayer/FichaConvidado.tsx','src/hexatombe/ConsultaPersonagemImpeto.tsx']) {
    const result = ts.transpileModule(read(file), {fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2023}});
    assert.equal(result.diagnostics?.length ?? 0, 0, `${file}: ${result.diagnostics?.map(d=>ts.flattenDiagnosticMessageText(d.messageText, '\n'))}`);
  }
});
