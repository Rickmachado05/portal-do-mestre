import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=(caminho)=>readFileSync(new URL(`../${caminho}`,import.meta.url),'utf8');
const tela=ler('src/multiplayer/MesaConvidado2D.tsx');
const estilo=ler('src/multiplayer/MesaConvidado2DParity.css');
const estiloMestre=ler('src/App.css');
const cssBase=ler('src/multiplayer/MesaConvidado2D.css');

test('v29.11: mesmo fundo original da mesa do mestre, sem imagem remota',()=>{
  assert.match(estiloMestre,/\.mesa-fundo\{[^}]*repeating-radial-gradient/);
  assert.match(tela,/className="mesa-fundo pm-jogo-fundo"/);
  assert.match(estilo,/\.pm-jogo\.pm-jogo--modo2d>\.pm-jogo-fundo\{display:block\}/);
  assert.match(estilo,/\.pm-jogo\.pm-jogo--modo2d \.pm-jogo-tabuleiro\{[^}]*background:transparent/);
  assert.match(tela,/import '\.\.\/App\.css'/);
  assert.doesNotMatch(estilo,/https?:\/\//);
});

test('v29.11: 3D mantém fundo próprio, visual 2D é isolado',()=>{
  assert.match(tela,/pm-jogo--modo2d/);
  assert.match(tela,/pm-jogo--modo3d/);
  assert.match(cssBase,/\.pm-jogo-tabuleiro\{[^}]*radial-gradient/);
  assert.match(estilo,/\.pm-jogo\.pm-jogo--modo2d/);
  assert.match(estilo,/\.pm-jogo>\.pm-jogo-fundo\{[^}]*display:none/);
});

test('v29.11.1: laterais permanecem visíveis sem controles de recolhimento',()=>{
  assert.doesNotMatch(tela,/PREFERENCIA_LATERAIS|lateraisVisiveis|setLateraisVisiveis/);
  assert.match(tela,/id="pm-jogo-galeria"/);
  assert.match(tela,/id="pm-jogo-atalhos"/);
  assert.match(tela,/id="pm-jogo-ferramentas"/);
  assert.match(estilo,/\.pm-jogo\.pm-jogo--modo2d/);
});

test('v29.11: funções do convidado e permissões permanecem no componente original',()=>{
  for(const valor of ['onTokenDown','onTokenMove','onTokenUp','onRolarFormula','onSolicitarItem',
     'onVisibilidadeRolagem','FichaConvidado','InventarioConvidado','DiarioConvidado','ChatMesa',
     'MesaConvidado3D','mesa.tokens.map','podeMostrarMapa','onMoverPonto','onSair']) {
    assert.ok(tela.includes(valor),`O fluxo ${valor} deve ser preservado`);
  }
  assert.doesNotMatch(tela,/buscarCampanha|lerCampanha|localStorage/);
});

test('v29.11.1: laterais fixas preservam zoom, pan e publicação',()=>{
  assert.doesNotMatch(tela,/setLateraisVisiveis/);
  assert.match(tela,/--pm-pan-x/);
  assert.match(tela,/--pm-zoom/);
  assert.match(tela,/onMoverPonto/);
});
