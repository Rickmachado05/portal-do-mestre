import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import vm from 'node:vm';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
import {
  normalizarPaginasDiario, criarPaginaDiario, aplicarOperacaoDiario, filtrarPaginasDiario,
  exportarDiarioMarkdown, MAX_TEXTO_PAGINA, MAX_PAGINAS_DIARIO
} from '../src/hexatombe/registrosDiario.ts';
const fonte=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');

test('migração preserva anotação antiga sem criar páginas repetidas',()=>{
  const paginas=normalizarPaginasDiario(undefined,'Segredo do mestre: o guardião está aqui.');
  assert.equal(paginas.length,1);
  assert.equal(paginas[0].id,'pagina-legada-v13444');
  assert.match(paginas[0].conteudo,/guardião/);
  assert.deepEqual(normalizarPaginasDiario(paginas,'texto antigo'),paginas);
  assert.deepEqual(normalizarPaginasDiario([], 'texto antigo'),[],'exclusão de todas as páginas não reimporta legado');
});

test('criar, editar, fixar, duplicar e excluir páginas sem sobrescrever outras',()=>{
  const a=criarPaginaDiario('Sessão 1','sessao','2026-11-01T10:00:00Z','a');
  const b=criarPaginaDiario('Naeris','personagem','2026-11-02T10:00:00Z','b');
  let paginas=aplicarOperacaoDiario([],{tipo:'criar',pagina:a});
  paginas=aplicarOperacaoDiario(paginas,{tipo:'criar',pagina:b});
  paginas=aplicarOperacaoDiario(paginas,{tipo:'alterar',id:'a',campos:{conteudo:'Início da arena',fixada:true},data:'2026-11-03T10:00:00Z'});
  assert.equal(paginas[0].conteudo,'Início da arena');
  assert.equal(paginas[1].conteudo,'');
  assert.equal(filtrarPaginasDiario(paginas,'','todas')[0].id,'a');
  assert.deepEqual(filtrarPaginasDiario(paginas,'naeris','personagem').map(p=>p.id),['b']);
  const copia={...criarPaginaDiario('Sessão 1 (cópia)','sessao','2026-11-04T10:00:00Z','c'),conteudo:paginas[0].conteudo};
  paginas=aplicarOperacaoDiario(paginas,{tipo:'duplicar',id:'a',pagina:copia});
  assert.equal(paginas.length,3);
  assert.equal(paginas[2].conteudo,'Início da arena');
  paginas=aplicarOperacaoDiario(paginas,{tipo:'excluir',id:'a'});
  assert.deepEqual(paginas.map(p=>p.id),['b','c']);
});

test('normalização protege limites, tipos incorretos e ids duplicados',()=>{
  const a=criarPaginaDiario('Título','sessao','2026-11-01T10:00:00Z','a');
  const paginas=normalizarPaginasDiario([{...a,conteudo:'x'.repeat(MAX_TEXTO_PAGINA+1000)},{...a,titulo:'duplicada'},null,{id:'',titulo:'vazio'}]);
  assert.equal(paginas.length,1);
  assert.equal(paginas[0].conteudo.length,MAX_TEXTO_PAGINA);
  assert.equal(aplicarOperacaoDiario(paginas,{tipo:'alterar',id:'inexistente',campos:{titulo:'Não'}}),paginas);
  const limite=Array.from({length:MAX_PAGINAS_DIARIO},(_,i)=>criarPaginaDiario(String(i),'outro',undefined,`p-${i}`));
  assert.equal(aplicarOperacaoDiario(limite,{tipo:'criar',pagina:a}),limite);
});

test('exportação Markdown mantém páginas e categorias',()=>{
  const a={...criarPaginaDiario('Pista importante','pista','2026-11-02T10:00:00Z','p'),conteudo:'Portão azul'};
  const texto=exportarDiarioMarkdown([a],'Hexatombe: Avatar');
  assert.match(texto,/# Diário — Hexatombe: Avatar/);
  assert.match(texto,/## Pista importante/);
  assert.match(texto,/Portão azul/);
});

test('Mesa 2D e Mesa 3D reutilizam o mesmo editor e salvam no estado compartilhado',()=>{
  const app=fonte('App.tsx'),mesa=fonte('mesa3d/Mesa3DPrototipo.tsx'),sessao=fonte('mesa3d/sessaoMesa3D.ts');
  assert.match(app,/paginasDiario: normalizarPaginasDiario\(value\.paginasDiario,value\.diario\)/);
  assert.match(app,/<DiarioCampanha paginas=\{campanha\.paginasDiario\}/);
  assert.match(mesa,/<DiarioCampanha compacto paginas=\{paginasDiario3D\}/);
  assert.match(sessao,/estado\.paginasDiario=seguintes/);
  assert.doesNotMatch(mesa,/rascunhoDiario/);
  const nomes=readdirSync(new URL('../src/hexatombe/',import.meta.url)).filter(n=>/diario/i.test(n));
  assert.equal(new Set(nomes.map(n=>n.toLocaleLowerCase())).size,nomes.length,'não pode repetir conflito do Windows');
});

test('edição 3D altera somente as páginas no registro de campanha',()=>{
  const state={titulo:'Hexatombe',diario:'Nota antiga',unidades:[{id:'m',hp:50}],cenas:[{id:'s'}],registros:[{id:'r'}],combateAtivo:true};
  const antes=JSON.stringify({...state});
  const conteudo=fonte('mesa3d/sessaoMesa3D.ts');
  const js=ts.transpileModule(conteudo,{fileName:'sessaoMesa3D.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const ctx={exports:{},require(nome){if(nome==='../hexatombe/campaignLibrary')return {chaveEstadoCampanha:x=>x};if(nome==='../hexatombe/registrosDiario')return {normalizarPaginasDiario,aplicarOperacaoDiario};if(nome==='../lib/iniciativaParticipantes')return {}; if(nome==='./administracaoMesa3D')return {alterarMesaCompartilhada(_campanha,action){return action(state)}};throw Error(nome)},JSON,Array,Date,Math,crypto:{randomUUID:()=>String(Math.random())}};
  vm.runInNewContext(js,ctx);
  const pagina=criarPaginaDiario('Sessão 2','sessao','2026-11-02T12:00:00Z','nova');
  assert.equal(ctx.exports.operarDiarioMesa3D('campanha',{tipo:'criar',pagina}),true);
  assert.equal(state.paginasDiario.length,2,'legado + nova');
  assert.equal(state.unidades[0].hp,50);
  assert.equal(state.combateAtivo,true);
  assert.deepEqual(state.registros,[{id:'r'}]);
  assert.equal(state.diario,'Nota antiga');
  assert.equal(JSON.parse(antes).titulo,state.titulo);
});
