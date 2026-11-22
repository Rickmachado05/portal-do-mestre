/** Testes de regressão da rodada 29.5 — UI offline do mestre. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const raiz = path.resolve(__dirname, '..');
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
let testes = 0;
function verificar(nome, fn) { fn(); testes++; console.log('✓', nome); }

for (const arquivo of ['src/App.tsx', 'src/mesa3d/Mesa3DPrototipo.tsx', 'src/mesa3d/roomScene.ts', 'src/mesa3d/climaCena3D.ts']) {
  verificar('Sintaxe TS/TSX: ' + arquivo, () => {
    const fonte = ts.createSourceFile(arquivo, ler(arquivo), ts.ScriptTarget.Latest, true,
      arquivo.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    assert.equal(fonte.parseDiagnostics.length, 0, fonte.parseDiagnostics.map(v => ts.flattenDiagnosticMessageText(v.messageText, '\n')).join('\n'));
  });
}
const app = ler('src/App.tsx');
const mesa = ler('src/mesa3d/Mesa3DPrototipo.tsx');
const sala = ler('src/mesa3d/roomScene.ts');
const clima = ler('src/mesa3d/climaCena3D.ts');
const css = ler('src/App.css');
verificar('Precipitação vinculada aos limites do terreno, não à câmera', () => {
  assert.ok(clima.includes('grupo.position.set((terreno.minX+terreno.maxX)/2,0,(terreno.minZ+terreno.maxZ)/2)'));
  assert.ok(clima.includes('const raioX=Math.max(1,largura/2-.25)'));
  assert.ok(clima.includes('p.x*raioX'));
  assert.ok(clima.includes('p.z*raioZ'));
  assert.ok(mesa.includes('climaCena3D.atualizar(dt,{x:centro.x,z:centro.z},r,dimensoesTerreno3D(cenarioRef.current))'));
});
verificar('Visibilidade mestre/participante preservada na transparência dos tokens', () => {
  assert.ok(sala.includes('visaoMestre && token.oculto ? .38 : 1'));
  assert.ok(mesa.includes('modoMestre&&!visaoIndividualId'));
  assert.ok(css.includes('.token.token-oculto:not(.token-topview){opacity:.36}'));
  assert.ok(css.includes('.token.token-topview.token-oculto{opacity:.36}'));
});
verificar('Elenco: busca sem acentos, seleção em lote, confirmação destrutiva', () => {
  assert.ok(app.includes('normalizarBusca'));
  assert.ok(app.includes("type=\"search\" placeholder=\"Nome do jogador, NPC ou inimigo...\""));
  assert.ok(app.includes('Selecionar resultados'));
  assert.ok(app.includes('function removerElencoSelecionado()'));
  assert.ok(app.includes('window.confirm(`Excluir ${ids.length} personagem(ns) da CAMPANHA'));
  assert.ok(app.includes('cenas=c.cenas.map(cena=>'));
});
verificar('Mesa 2D: Ctrl/Shift para marcar tokens e barreiras, seleção direta de luzes', () => {
  assert.ok(app.includes('selecoesMapa.includes(`token:${u.id}`)'));
  assert.ok(app.includes("alternarSelecaoMapa('barreira',barreira.id)"));
  assert.ok(app.includes("alternarSelecaoMapa('luz',f.id)"));
  assert.ok(app.includes('onClick={removerSelecaoMapa}'));
});
verificar('Mesa 2D: retirada em lote preserva personagem e tokens travados', () => {
  assert.ok(app.includes('const bloqueados=[...tokens].filter(uid=>cenaAtual.tokens[uid]?.travado)'));
  assert.ok(app.includes('const novosTokens={...c.tokens};tokens.forEach(id=>delete novosTokens[id])'));
  assert.ok(app.includes('As fichas') || app.includes('Os personagens e suas fichas NÃO serão excluídos'));
});
verificar('Mesa 3D: Ctrl para seleção, Delete em lote, salva cenário', () => {
  assert.ok(mesa.includes("alternarSelecao3D('token',tok)"));
  assert.ok(mesa.includes("alternarSelecao3D('barreira',barreira.id)"));
  assert.ok(mesa.includes("alternarSelecao3D('objeto',obj)"));
  assert.ok(mesa.includes('const apagarSelecoes3D=()=>'));
  assert.ok(mesa.includes('mudarCenario({...cenarioRef.current,objetos:cenarioRef.current.objetos.filter(o=>!objetoIds.has(o.id))})'));
  assert.ok(mesa.includes('&&selecoes3DRef.current.length'));
  assert.ok(mesa.includes("ev.code==='Escape'&&selecoes3DRef.current.length"));
});
verificar('Mesa 3D: destaques nos objetos, paredes e tokens separados do conteúdo publicado', () => {
  assert.ok(sala.includes('const selecionarTokens=(ids:readonly string[])=>'));
  assert.ok(sala.includes('const selecionarObjetos=(ids:readonly string[])=>'));
  assert.ok(sala.includes('multiplas.includes(b.id)'));
  assert.ok(mesa.includes('Uma seleção visual local não é enviada ao servidor'));
});
verificar('O elenco do painel 3D também possui busca e exclusão em lote',()=>{
  assert.ok(mesa.includes('const [buscaElenco3D,setBuscaElenco3D]'));
  assert.ok(mesa.includes('const excluirElenco3D=()=>'));
  assert.ok(mesa.includes('da CAMPANHA e de TODAS as cenas?')); // confirmação contextual
  assert.ok(mesa.includes('m3d-elenco-pesquisa'));
  assert.ok(mesa.includes('elencoVisivel3D.map(u=>'));
});
console.log(`OK: ${testes} verificações v29.5`);
