import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const ler=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('todas as entradas do Portal e páginas públicas carregam o padrão de rolagem',()=>{
 const vite=ler('vite.config.ts');
 const paginas=[...vite.matchAll(/new URL\('\.(\/[^']+\.html)'/g)].map(m=>m[1].slice(1));
 const publicas=readdirSync(new URL('../public/',import.meta.url)).filter(p=>p.endsWith('.html')).map(p=>'public/'+p);
 assert.ok(paginas.length>=14);
 for(const p of [...paginas,...publicas,'exploracao/index.html'])assert.match(ler(p),/href="\/portal-scrollbars\.css"/,p);
});
test('regra global esconde a barra sem bloquear a rolagem',()=>{
 const css=ler('public/portal-scrollbars.css').replace(/\/\*[\s\S]*?\*\//g,'');
 assert.match(css,/@media screen/);
 assert.match(css,/:root, :root \*/);
 assert.match(css,/scrollbar-width: none !important/);
 assert.match(css,/::-webkit-scrollbar/);
 assert.doesNotMatch(css,/(?:^|[;{])\s*overflow(?:-[xy])?\s*:/);
 assert.doesNotMatch(css,/touch-action\s*:|pointer-events\s*:/);
});
