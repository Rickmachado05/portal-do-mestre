// Auditoria da reorganização de menus A01, sem precisar iniciar a Mesa 3D.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const base=path.join(__dirname,'..','src');
const read=f=>fs.readFileSync(path.join(base,f),'utf8');
const library=read('portal/GestaoPersonagens.tsx');
const libraryCss=read('portal/GestaoPersonagens.css');
const ficha=read('hexatombe/FichaImpetoDetalhes.tsx');
const fichaCss=read('hexatombe/FichaImpetoDetalhes.css');
const mesa=read('App.tsx');
const mesaCss=read('fichaAbas.css');
const hud=read('hexatombe/MenuCombateImersivo.tsx');
const status=read('hexatombe/classificacaoMenuImpeto.ts');
// Biblioteca: seis abas reais, com os conteúdos separados e sem rodapé sobreposto.
for(const a of ['resumo','atributos','pericias','escolhas','tecnicas','vinculos']){
  assert.ok(library.includes(`abaDetalhes==='${a}'`),`Biblioteca sem aba ${a}`);
}
for(const secao of ["secoes={['atributos']}","secoes={['pericias']}","secoes={['escolhas']}","secoes={['tecnicas','exploracao']}"]){
  assert.ok(library.includes(secao),`Seção ausente ${secao}`);
}
assert.ok(library.includes('hx-character-dialog-scroll'));
assert.ok(libraryCss.includes('overflow-y:auto;overflow-x:hidden'));
assert.ok(libraryCss.includes('position:relative;bottom:auto'));
assert.ok(libraryCss.includes('grid-template-columns:repeat(6,minmax(0,1fr))'));
// Atributos e perícias: blocos independentes; responsividade pela largura da janela.
assert.ok(ficha.includes("mostrar('pericias')"));
assert.ok(ficha.includes("mostrar('escolhas')"));
assert.ok(fichaCss.includes('container-type:inline-size'));
assert.ok(fichaCss.includes('grid-template-columns:minmax(0,1fr) auto'));
assert.ok(fichaCss.includes('.janela-recursos .impeto-a01-grade'));
// Mesa: mantém ações e regras, separa a aba Personagem em três subabas.
assert.ok(mesa.includes("['personagem', '☷', 'Personagem']"));
assert.ok(mesa.includes("abaFicha==='personagem' && !fichaSelecionadaA01"));
assert.ok(mesa.includes('hx-ficha-personagem-abas'));
assert.ok(mesa.includes('secoes={[abaPersonagem]}'));
assert.ok(mesa.includes("['pericias','Perícias']"));
assert.ok(mesa.includes("['escolhas','Construção']"));
assert.ok(!mesa.includes('impeto-a01-expandir'));
assert.ok(!mesa.includes('impeto-ca-temporaria'));
assert.ok(mesa.includes('recurso(\'HP\''));
assert.ok(mesa.includes('imp-escudo-ajustes'));
assert.ok(mesa.includes('AcoesDaFicha'));
assert.ok(mesaCss.includes('.hx-ficha-personagem-abas'));
// Menu imersivo testado e já aprovado anteriormente, sem mover ações outra vez.
assert.ok(hud.includes('acoesDaSecaoMenu(acoes, secao)'));
assert.ok(hud.includes('Condições ativas'));
assert.ok(status.includes('grupoStatusDaAcao'));
// TSX: teste de sintaxe real, não só substrings.
for(const name of ['App.tsx','portal/GestaoPersonagens.tsx','hexatombe/FichaImpetoDetalhes.tsx','hexatombe/MenuCombateImersivo.tsx']){
 const syntax=ts.createSourceFile(name,read(name),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(syntax.parseDiagnostics.length,0,`Sintaxe inválida em ${name}`);
}
console.log('OK — 36+ verificações de UI v16: abas, legibilidade, conteúdo, menus, sintaxe TSX e recursos');
