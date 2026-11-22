// Regressão da ocultação por token/grupo e elenco dobrável v29.6.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {join}=require('node:path');
const src=fs.readFileSync(join(__dirname,'../src/lib/visibilidadeTokensMestre.ts'),'utf8');
const js=ts.transpileModule(src,{fileName:'visibilidadeTokensMestre.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const ctx={exports:{}};vm.runInNewContext(js,ctx);
const vis=ctx.exports.tokenOcultoParaJogador;
const livres={tokens:true,jogadores:true,npcs:true,inimigos:true};
for(const tipo of ['jogador','npc','inimigo']){
 assert.equal(vis(tipo,{oculto:false},livres),false,`${tipo} visível`);
 assert.equal(vis(tipo,{oculto:true},livres),true,`${tipo} oculto individualmente`);
 assert.equal(vis(tipo,{oculto:false},{...livres,[tipo==='jogador'?'jogadores':tipo==='npc'?'npcs':'inimigos']:false}),true,`${tipo} grupo oculto`);
 assert.equal(vis(tipo,{oculto:false},{...livres,tokens:false}),true,`${tipo} todos os tokens ocultos`);
 assert.equal(vis(tipo,{oculto:false},{...livres,jogadores:tipo==='jogador'?false:true}),tipo==='jogador',`${tipo} não é afetado por outro grupo`);
 assert.equal(vis(tipo,{oculto:false},{...livres}),false,`${tipo} revelado`);
}
assert.equal(vis('npc',undefined,livres),true,'tokens ausentes não aparecem');
const app=fs.readFileSync(join(__dirname,'../src/App.tsx'),'utf8');
const mesa3d=fs.readFileSync(join(__dirname,'../src/mesa3d/Mesa3DPrototipo.tsx'),'utf8');
const renderer=fs.readFileSync(join(__dirname,'../src/mesa3d/roomScene.ts'),'utf8');
const publicador=fs.readFileSync(join(__dirname,'../src/multiplayer/PublicadorMesa.tsx'),'utf8');
assert.match(app,/const mostrarTokens = !preverJogador \|\| cenaAtual\.camadas\.tokens/,'camada oculta não apaga tokens do mestre 2D');
assert.match(app,/tokenOcultoParaJogador\(u\.tipo,cenaAtual\.tokens\[u\.id\],cenaAtual\.camadas\)/,'visão do jogador respeita grupo e token');
assert.match(app,/hx-selecao-topo/,'controle direto do token agora no topo 2D e 3D');
assert.match(app,/hx-elenco-recolher/,'categorias recolhíveis 2D');
assert.match(app,/hx-elenco-ocultar/,'ocultação individual do elenco 2D');
assert.match(mesa3d,/Object\.entries\(cenaAtual\?\.tokens\|\|\{\}\)/,'3D monta todos os tokens da cena para o mestre');
assert.match(mesa3d,/oculto:tokenOcultoParaJogador\(unidade\.tipo,token,cenaAtual\?\.camadas\)/,'3D aplica ocultação efetiva');
assert.match(mesa3d,/configurarVisaoIndividual\(observador,tokensNasCamadas/,'visão individual usa marca efetiva');
assert.match(mesa3d,/alternarTokenOculto3D/,'ocultação individual 3D permanece disponível');
assert.match(mesa3d,/m3d-elenco-grupo-cabecalho/,'categorias recolhíveis 3D');
assert.match(renderer,/const opacidade=visaoMestre && token\.oculto \? \.38 : 1/,'renderização fantasma só do mestre');
assert.match(publicador,/cena\.camadas\?\.tokens===false\|\|cena\.camadas\?\.jogadores===false\?\[\]/,'publicação restringe todas as camadas e o grupo de jogadores');
assert.match(publicador,/!cena\.tokens\[u\.id\]\.oculto/,'publicação restringe token individualmente oculto');
console.log('OK: ocultação individual, grupos, segurança do jogador e elenco dobrável v29.6');
