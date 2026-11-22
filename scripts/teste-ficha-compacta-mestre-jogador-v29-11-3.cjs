const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const read = file=>fs.readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const guest = read('src/multiplayer/FichaConvidado.tsx');
const css = read('src/multiplayer/FichaConvidado.css');
const visual = read('src/hexatombe/FichaImpetoDetalhes.css');
const masterStyles = read('src/fichaAbas.css');
function teste(nome, validar) {validar(); console.log('✓ '+nome);}
teste('Mestre importa explicitamente o CSS do componente Personagem',()=>{
  assert.match(app,/import '\.\/hexatombe\/FichaImpetoDetalhes\.css'/);
  assert.match(app, /<ConsultaPersonagemImpeto dados=\{dadosConsultaMestre\(fichaSelecionadaA01\)\}/);
  assert.match(visual,/\.impeto-a01-grade>div/);
});
teste('Rolagens e ações do mestre mantêm componentes temáticos',()=>{
  assert.match(app,/<TestesImpeto ficha=/);
  assert.match(app,/<AcoesDaFicha/);
  assert.match(app,/import '\.\/hexatombe\/AcoesDaFicha\.css'/);
  assert.match(app,/import '\.\/impeto\/portalA01\.css'/);
});
teste('Jogador não mostra escudo e não repete medidores de atributos',()=>{
  assert.doesNotMatch(guest,/ESCUDO TEMPORÁRIO|escudo\}/);
  assert.doesNotMatch(guest,/<Recurso\s/);
  assert.doesNotMatch(guest,/pm-jogo-atributos-explicacao/);
  assert.match(guest,/FaixasEfeitos efeitos=\{ficha\.condicoes\}/);
  assert.match(guest,/Nenhum buff, debuff ou condição ativa/);
});
teste('Ficha do convidado abre com a largura padrão do mestre e altura automática',()=>{
  assert.match(css,/width:min\(366px,calc\(100vw - 24px\)\)/);
  assert.match(css,/height:auto/);
  assert.doesNotMatch(css,/height:min\(635px/);
  assert.match(masterStyles,/\.janela-recursos/);
});
teste('Técnicas, seções de Personagem e navegação adaptam-se à janela compacta',()=>{
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.hx-acoes-grade[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
  assert.match(guest,/pm-jogo-habilidades/);
  assert.match(guest, /<ConsultaPersonagemImpeto/);
});
teste('Alterações não concedem edição do mestre ao convidado',()=>{
  assert.doesNotMatch(guest,/atualizarUnidade|salvarFicha|onEditarIcone/);
});
teste('Sintaxe TSX dos componentes',()=>{
  for(const file of ['src/App.tsx','src/multiplayer/FichaConvidado.tsx','src/hexatombe/ConsultaPersonagemImpeto.tsx']) {
    const source=read(file);
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    assert.equal(ast.parseDiagnostics.length,0, file);
    const output=ts.transpileModule(source,{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
    assert.equal(output.diagnostics?.length??0,0, file);
  }
});
