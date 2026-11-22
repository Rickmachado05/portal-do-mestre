// Regressão da atualização do Criador integrado conforme GitHub.
// Executar na raiz do projeto: node _tests/criador-sync-github-v1310.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const src = fs.readFileSync('src/criador/App.tsx', 'utf8');
const pdf = fs.readFileSync('src/criador/pdf/exportarFichaPdf.ts', 'utf8');
const section = (start, end) => {
  const i=src.indexOf(start);const j=src.indexOf(end, i+start.length);
  assert(i>=0 && j>i,`Trecho não encontrado: ${start}`);
  return src.slice(i,j);
};
const modelos = section('const regrasModelos:', '\nconst modelosPorTipo:');
const block = (id, nextId) => section(`  ${id}: {`,`  ${nextId}: {`);
for (const [id, next, mana, valor, acao, alvos] of [
  ['cura', 'curaArea',30,'2d6+3 HP','Principal',1],
  ['curaArea','movimento',45,'1d6+3 HP','Principal',2],
  ['buffAcerto','buffIniciativa',12,'+2 no d20 de acerto','Buff',1],
  ['buffIniciativa','cura',15,'+2 na iniciativa','Pré-combate',1],
]){
  const b=block(id,next);
  assert(modelos.includes(`  ${id}: {`));
  assert(b.includes(`custo: ${mana}`),`${id}: Mana`);
  assert(b.includes(`valor: "${valor}"`),`${id}: efeito`);
  assert(b.includes(`acao: "${acao}"`),`${id}: ação`);
  assert(b.includes(`maxAlvos: ${alvos}`),`${id}: alvos`);
  if(id==='curaArea'||id.startsWith('buff'))assert(b.includes('experimental: true'));
}
assert(src.includes('Buff: ["buffDano", "buffAcerto", "buffIniciativa"]'));
assert(src.includes('Cura: ["cura", "curaArea"]'));
assert(src.includes('e.target.value === "curaArea" ? 2 : 1'));
assert(src.includes('"Quantidade de aliados"'));
assert(src.includes('rotuloMomentoDeUso(modelo.acao)'));
assert(pdf.includes('habilidade.acao === "Pré-combate" ? "Antes da iniciativa"'));
assert(src.includes('salvarOuAtualizarFicha'));
assert(src.includes('guardarRascunhoFicha'));
assert(src.includes('editorOriginal:'));
console.log('OK: cura, buffs, pré-combate, PDF, biblioteca e rascunhos preservados');
