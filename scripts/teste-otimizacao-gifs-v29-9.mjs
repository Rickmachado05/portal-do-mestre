import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const ler=(arquivo)=>readFileSync(new URL(`../${arquivo}`,import.meta.url),'utf8');
function analisarTS(arquivo){
  const code=ler(arquivo);
  const ast=ts.createSourceFile(arquivo,code,ts.ScriptTarget.Latest,true,arquivo.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,arquivo+': sintaxe inválida');
  const r=ts.transpileModule(code,{fileName:arquivo,compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal(r.diagnostics?.length||0,0,arquivo+': transpilação inválida');
  return code;
}
test('Nova inicialização 3D não recria o contexto WebGL no StrictMode de desenvolvimento',()=>{
  const code=analisarTS('src/mesa3d/main.tsx');
  assert.match(code,/\.render\(<Mesa3DPrototipo\s*\/>\)/);
  assert.doesNotMatch(code,/<StrictMode>/);
});
test('Índice de imagens em lote reutiliza uma conexão IndexedDB e fecha ao trocar versão',()=>{
  const code=analisarTS('src/lib/storage.ts');
  assert.match(code,/let conexao: Promise<IDBDatabase> \| null = null/);
  assert.match(code,/if \(conexao\) return conexao/);
  assert.match(code,/db\.onversionchange/);
  assert.match(code,/export async function carregarArquivos/);
  assert.match(code,/tx\.oncomplete = \(\) => resolve\(resultado\)/);
});
test('Mesa principal e visualizador 3D usam carregamento em lote de retratos e tokens',()=>{
  const app=analisarTS('src/App.tsx');
  const m3=analisarTS('src/mesa3d/Mesa3DPrototipo.tsx');
  assert.match(app,/carregarArquivos\(elenco\.map\(u=>`retrato:/);
  assert.match(app,/carregarArquivos\(elenco\.map\(u=>`token:/);
  assert.match(m3,/carregarArquivos\(comRetrato\.map/);
  assert.match(m3,/restantes\.slice\(i,i\+2\)/);
});
test('GIFs mantêm resolução e limites de importação mas decodificam fora da thread principal',()=>{
  const code=ler('src/lib/tokenIdleGif.mjs');
  assert.match(code,/new Worker\(new URL\('\.\/tokenIdleWorker\.mjs'/);
  assert.match(code,/LIMITE_CACHE_GIF=48\*1024\*1024/);
  assert.match(code,/ladoRender:512/);
  assert.match(code,/bytes:4\*1024\*1024, lado:512, quadros:40/);
  const worker=ler('src/lib/tokenIdleWorker.mjs');
  assert.match(worker,/self\.postMessage\(\{id, animacao\}/);
});
test('GIFs fora da tela não decodificam sem necessidade; renderizador usa limite ~12 fps',()=>{
  const token=analisarTS('src/lib/TokenIdle.tsx');
  const m3=analisarTS('src/mesa3d/Mesa3DPrototipo.tsx');
  assert.match(token,/new IntersectionObserver/);
  assert.match(token,/if\(!animado\|\|!visivel\)/);
  assert.match(token,/agora-ultimoTique>=80/);
  assert.match(m3,/tempo-ultimoIdle>=80/);
});
test('Retratos mantêm GIFs originais e carregam sem bloquear layout',()=>{
  const code=analisarTS('src/lib/retratoResponsivo.tsx');
  assert.match(code,/loading=\{resto\.loading\?\?'lazy'\}/);
  assert.match(code,/decoding=\{resto\.decoding\?\?'async'\}/);
  assert.match(code,/return <img/);
});
