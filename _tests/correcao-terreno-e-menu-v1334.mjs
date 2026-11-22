import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const root=new URL('../src/',import.meta.url);
const read=(n)=>readFileSync(new URL(n,root),'utf8');
const app=read('App.tsx'),viewer=read('mesa3d/Mesa3DPrototipo.tsx');
const scene=read('mesa3d/roomScene.ts'),embedded=read('mesa3d/visualizadorEmbutido.css');
const raster=read('mesa3d/pisoConstruicao3D.ts');
const transpiled=ts.transpileModule(raster,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {calcularProjecaoMapa3D}=await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64'));

test('o terreno maior não altera o tamanho físico da planta central',()=>{
  const imagem={largura:1024,altura:2048};const dimensoesPlanta={largura:11,profundidade:22};
  const encaixeAntes=calcularProjecaoMapa3D(imagem.largura,imagem.altura,dimensoesPlanta.largura,dimensoesPlanta.profundidade);
  const encaixeDepois=calcularProjecaoMapa3D(imagem.largura,imagem.altura,dimensoesPlanta.largura,dimensoesPlanta.profundidade);
  assert.deepEqual(encaixeAntes,encaixeDepois);
  assert.equal(encaixeDepois.largura,11);assert.equal(encaixeDepois.altura,22);
  assert.match(scene,/Math\.min\(a\.largura,configPiso\.larguraPlanta\?\?a\.largura\)/);
  assert.match(scene,/Math\.min\(a\.profundidade,configPiso\.profundidadePlanta\?\?a\.profundidade\)/);
});
test('imagem é plano separado com orientação de chão, não pintura num canvas bege',()=>{
  assert.match(scene,/name='planta-importada-3d'/);
  assert.match(scene,/planta\.rotation\.x=-Math\.PI\/2/);
  assert.match(scene,/planta\.scale\.set\(r\.largura,r\.altura,1\)/);
  assert.match(scene,/floorMat\.map=null;floorMat\.color\.set\('#283541'\)/);
  assert.doesNotMatch(scene,/#8a806d|mapaCanvas\.width|ctx\.fillRect\(0,0,mapaCanvas/);
});
test('Terreno 3D pertence apenas ao menu Sessão da Mesa 3D',()=>{
  const nav=app.slice(app.indexOf('<nav className="atalhos-direita"'),app.indexOf('{MODO_3D ? <div className="mapa-viewport'));
  const sessao=nav.slice(nav.indexOf('Ferramentas da sessão'),nav.indexOf('Ferramentas de apoio'));
  assert.match(sessao,/MODO_3D&&<button[^>]*aria-pressed=\{editor3DAberto\}/);
  assert.match(sessao,/Terreno 3D/);
  assert.ok(!viewer.includes('className="m3d-editor-access"'));
  assert.match(embedded,/\.m3d-embutido \.m3d-editor-access\{display:none!important\}/);
});
test('abrir e fechar editor tem estado sincronizado entre as páginas',()=>{
  assert.match(app,/e\.data\.tipo==='editor-status'/);
  assert.match(app,/enviar3D\('editor',editor3DAberto\?'fechar':'abrir'\)/);
  assert.match(viewer,/tipo:'editor-status',valor:painelVisivel&&painelAtivo==='construcao'/);
  assert.match(viewer,/if\(tipo==='editor'&&\(valor==='abrir'\|\|valor==='fechar'\)\)/);
});
test('reajustar para a planta preserva peças, e mantém opção de expansão',()=>{
  assert.match(viewer,/Ajustar à planta/);
  assert.match(viewer,/Expandir terreno/);
  assert.match(viewer,/const fora=cenarioRef\.current\.objetos\.some/);
  assert.match(viewer,/Existem peças nas áreas externas/);
  assert.match(viewer,/larguraTerreno:w,profundidadeTerreno:h/);
});
