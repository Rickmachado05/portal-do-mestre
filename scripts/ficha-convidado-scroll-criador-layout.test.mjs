import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const ler=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('ficha convidada separa abas da rolagem e restaura o inicio ao trocar',()=>{
 const css=ler('src/multiplayer/FichaConvidado.css'),tsx=ler('src/multiplayer/FichaConvidado.tsx');
 for(const nome of ['cabecalho-ficha','hx-ficha-abas']){
 const regra=css.match(new RegExp('pm-jogo-ficha-mestre > \\.'+nome+' \\{[^}]+\\}'))?.[0];
 assert.ok(regra);assert.match(regra,/position: relative/);assert.match(regra,/top: auto/);assert.match(regra,/flex: 0 0 auto/);}
 assert.match(css,/pm-jogo-ficha-mestre > \.hx-ficha-corpo \{[^}]*overflow-y: auto/);
 assert.match(tsx,/corpoRef\.current\.scrollTop = 0/);assert.match(tsx,/className="hx-ficha-corpo" ref=\{corpoRef\}/);
});
test('criador sem sidebar preserva escala e resumo de recursos na aba',()=>{
 const app=ler('src/criador-impeto/main.jsx');assert.doesNotMatch(app,/<aside className="iu-sidebar"/);assert.match(app,/iu-scale-button" onClick=\{abrirEscala\}/);assert.match(app,/iu-resource-summary/);assert.match(ler('src/criador-impeto/style.css'),/\.iu-layout\{grid-template-columns:minmax\(0,1fr\)\}/);
});
