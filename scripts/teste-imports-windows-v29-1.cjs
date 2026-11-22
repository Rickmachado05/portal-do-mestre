/* v29.1: protege a resolucao dos modulos em Windows (filesystem case-insensitive).
 * Um modulo .ts e outro .tsx com o mesmo nome logico podem colidir no Vite,
 * mesmo que as extensoes sejam diferentes: a prioridade de resolucao favorece .ts.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const raiz=path.resolve(__dirname,'../src');
const lista=[];
function percorrer(dir){
  for(const entrada of fs.readdirSync(dir,{withFileTypes:true})){
    const local=path.join(dir,entrada.name);
    if(entrada.isDirectory())percorrer(local);
    else if(/\.(ts|tsx|js|jsx)$/.test(entrada.name)&&!entrada.name.endsWith('.d.ts'))lista.push(local);
  }
}
percorrer(raiz);
const mapa=new Map();
for(const arquivo of lista){
  const relativo=path.relative(raiz,arquivo).replace(/\\/g,'/');
  const chave=relativo.replace(/\.(ts|tsx|js|jsx)$/,'').toLowerCase();
  const anterior=mapa.get(chave);
  assert.equal(anterior,undefined,`Conflito de resolucao Windows: ${anterior} X ${relativo}`);
  mapa.set(chave,relativo);
}
const painel=fs.readFileSync(path.join(raiz,'lib/PainelBibliotecaTokens.tsx'),'utf8');
const api=fs.readFileSync(path.join(raiz,'lib/bibliotecaTokens.ts'),'utf8');
assert.match(painel,/export default function BibliotecaTokens\s*\(/);
assert.match(api,/export function lerBibliotecaTokens\s*\(/);
for(const [arquivo,importacao] of [
  ['lib/TokenPadraoFicha.tsx',"'./PainelBibliotecaTokens'"],
  ['App.tsx',"'./lib/PainelBibliotecaTokens'"],
  ['portal/Portal.tsx',"'../lib/PainelBibliotecaTokens'"],
]){
  const fonte=fs.readFileSync(path.join(raiz,arquivo),'utf8');
  assert.ok(fonte.includes(`import BibliotecaTokens from ${importacao}`),`Import incorreto em ${arquivo}`);
}
assert.equal(fs.existsSync(path.join(raiz,'lib/BibliotecaTokens.tsx')),false,'Componente antigo nao pode coexistir com a API .ts');
console.log(`OK — resolucao Windows: ${lista.length} modulos sem conflito; 3 imports da biblioteca visual corretos`);
