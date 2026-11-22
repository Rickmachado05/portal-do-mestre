/* Testes independentes da renderização (UI do Ímpeto 1.0 / Avatar A01).
 * Depende somente do TypeScript já incluído em devDependencies do Portal.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const base = path.join(__dirname, '..', 'src');
function read(file) { return fs.readFileSync(path.join(base, file), 'utf8'); }
const file = read('hexatombe/classificacaoMenuImpeto.ts');
const out = ts.transpileModule(file, {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}}).outputText;
const moduleObject={exports:{}};
vm.runInNewContext(out, {exports:moduleObject.exports, module:moduleObject});
const {secaoDaAcao, grupoStatusDaAcao, acoesDaSecaoMenu}=moduleObject.exports;
const sample = [
  {id:'ataque', categoria:'basico', ativacao:'principal'},
  {id:'ofensiva',categoria:'ofensiva',ativacao:'principal'},
  {id:'cura',categoria:'cura',ativacao:'principal'},
  {id:'defesa',categoria:'defesa',ativacao:'reacao'},
  {id:'controle',categoria:'controle',ativacao:'principal'},
  {id:'buffca',categoria:'buff',ativacao:'buff'},
  {id:'exploracao-0',categoria:'utilidade',ativacao:'exploracao'},
  {id:'passiva',categoria:'passiva',ativacao:'passiva'},
  {id:'antigo-buff',categoria:'buff'},
];
assert.equal(secaoDaAcao(sample[0]),'ataque');
assert.deepEqual(Array.from(acoesDaSecaoMenu(sample,'habilidades'),a=>a.id),['ofensiva','cura','defesa','controle']);
assert.deepEqual(Array.from(acoesDaSecaoMenu(sample,'status'),a=>a.id),['buffca','antigo-buff','exploracao-0','passiva']);
assert.equal(grupoStatusDaAcao(sample[5]),'Buffs');
assert.equal(grupoStatusDaAcao(sample[6]),'Exploração');
assert.equal(grupoStatusDaAcao(sample[7]),'Passivas');
assert.equal(acoesDaSecaoMenu(sample,'itens').length,0);
const menu=read('hexatombe/menuCombateTurno.ts');
assert.ok(menu.indexOf("id: 'status'")<menu.indexOf("id: 'itens'"),'Itens deve aparecer abaixo de Status');
const hud=read('hexatombe/MenuCombateImersivo.tsx');
assert.ok(hud.includes('acoesDaSecaoMenu(acoes, secao)'));
assert.ok(hud.includes('Condições ativas'));
assert.ok(hud.includes('hx-combate-escudo'));
const ficha=read('portal/GestaoPersonagens.tsx');
for(const sec of ['resumo','atributos','tecnicas','vinculos'])assert.ok(ficha.includes(`abaDetalhes==='${sec}'`));
assert.ok(ficha.includes("secoes={['atributos','escolhas']}"));
assert.ok(ficha.includes("secoes={['tecnicas','exploracao']}"));
const janela=read('App.tsx');
assert.ok(janela.includes('hx-ficha-resumo-a01'));
assert.ok(janela.includes('hx-resumo-escudo'));
assert.ok(janela.includes('Energia sem teto de acúmulo'));
assert.ok(janela.includes("recurso(fichaSelecionadaA01?'ENERGIA'"));
const fontes=['App.tsx','portal/GestaoPersonagens.tsx','hexatombe/FichaImpetoDetalhes.tsx','hexatombe/MenuCombateImersivo.tsx','hexatombe/classificacaoMenuImpeto.ts'];
for(const arquivo of fontes){
  const parser=ts.createSourceFile(arquivo,read(arquivo),ts.ScriptTarget.Latest,true,arquivo.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(parser.parseDiagnostics.length,0,`Sintaxe TS/TSX inválida em ${arquivo}`);
}
console.log('OK — 22+ verificações de agrupamento, navegação, recursos e sintaxe UI');
