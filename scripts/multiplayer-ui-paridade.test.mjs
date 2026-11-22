import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const mesa=readFileSync(new URL('../src/multiplayer/MesaConvidado2D.tsx',import.meta.url),'utf8');
const estilos=readFileSync(new URL('../src/multiplayer/MesaConvidado2DParity.css',import.meta.url),'utf8');
const dock=readFileSync(new URL('../src/menuDireita.css',import.meta.url),'utf8');

// Testes estáticos de regressão da interface; a interação visual será validada no navegador.
test('dock da sessão mantém o visual do mestre, sem menu redundante de participantes',()=>{
  assert.match(dock,/:is\(\.mesa-app,\.pm-jogo\)/);
  assert.match(mesa,/className="hx-dock-cabecalho" aria-expanded=\{gruposDireita\.sessao\}/);
  assert.doesNotMatch(mesa,/className="hx-dock-cabecalho" aria-expanded=\{gruposDireita\.apoio\}/);
  assert.match(mesa,/setGruposDireita\(g=>\(\{\.\.\.g,sessao:!g\.sessao\}\)\)/);
  assert.doesNotMatch(mesa,/setGruposDireita\(g=>\(\{\.\.\.g,apoio:!g\.apoio\}\)\)/);
  assert.match(estilos,/\.pm-jogo \.pm-jogo-lateral \.hx-dock-grupo/);
  assert.doesNotMatch(mesa, /Sala \/ Participantes/);
  assert.match(mesa, /Sair da sala/);
});

test('chat online usa a mesma janela original e acesso rápido à esquerda',()=>{
  assert.match(mesa,/className="atalhos-esquerda pm-jogo-atalhos-esquerda"/);
  assert.match(mesa,/onClick=\{\(\)=>abrir\('chat'\)\}/);
  assert.match(mesa,/onClick=\{\(\)=>abrir\('diario'\)\}/);
  assert.ok(mesa.indexOf("abrir('chat')")<mesa.indexOf("abrir('diario')"));
  assert.match(mesa,/<ChatMesa credencial=\{credencial\}/);
  assert.match(mesa,/id==='chat'\?\s*'janela-chat pm-jogo-janela-chat'/);
  assert.doesNotMatch(mesa,/\(\['ficha','inventario','dados','chat'\]/);
});

test('aviso fixo sai, mas o movimento remoto continua ligado aos mesmos callbacks',()=>{
  assert.doesNotMatch(mesa,/Arraste seu token para movimentar/);
  assert.doesNotMatch(mesa,/className="pm-jogo-info"/);
  assert.match(mesa,/onTokenDown=\{onTokenDown\}/);
  assert.match(mesa,/onTokenMove=\{onTokenMove\}/);
  assert.match(mesa,/onTokenUp=\{onTokenUp\}/);
  const token=readFileSync(new URL('../src/multiplayer/TokenConvidadoFluido.tsx',import.meta.url),'utf8');
  assert.match(token,/onPointerDown=\{e=>onTokenDown\(e,token.id\)\}/);
  assert.match(token,/onPointerMove=\{onTokenMove\}/);
  assert.match(token,/onPointerUp=\{onTokenUp\}/);
});

test('janelas preservam ações seguras e padrão visual do mestre',()=>{
  assert.match(mesa,/className=\{`janela-flutuante pm-jogo-janela/);
  assert.match(mesa,/id==='dados'\?conteudoDados:id==='diario'\?<DiarioConvidado/);
  assert.match(mesa,/<InventarioConvidado inventario=/);
  assert.match(mesa,/onSolicitar=\{onSolicitarItem\}/);
  assert.match(mesa,/onRolarAcao=\{onRolarAcao\}/);
});
