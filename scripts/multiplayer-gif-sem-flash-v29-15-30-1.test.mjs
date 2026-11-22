import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const convidado=readFileSync(resolve(root,'src/multiplayer/MesaConvidado3D.tsx'),'utf8');
const sala=readFileSync(resolve(root,'src/mesa3d/roomScene.ts'),'utf8');

test('v29.15.30.1: convidados atualizam participantes sem destruir os sprites já carregados',()=>{
  assert.match(convidado,/sala\.sincronizarParticipantesConvidado\(dados\.tokens\.map\(montarPersonagem3D\)/);
  assert.doesNotMatch(convidado,/sala\.configurarParticipantes\(/);
  const inicio=sala.indexOf('const sincronizarParticipantesConvidado=');
  const fim=sala.indexOf('const liberarImagemPendenteParticipante=',inicio);
  assert.ok(inicio>0&&fim>inicio);
  const metodo=sala.slice(inicio,fim);
  assert.match(metodo,/if\(!token\|\|outros\.has\(unidade\.id\)\)continue/);
  assert.match(metodo,/if\(!ids\.has\(id\)\)removerParticipanteConvidado\(id\)/);
  assert.doesNotMatch(metodo,/limparParticipantes\(/);
});

test('v29.15.30.1: cada GIF usa um pedido independente com cancelamento de respostas antigas',()=>{
  assert.match(convidado,/const pedidosMidia=new Map/);
  assert.match(convidado,/if\(pedidosMidia\.get\(token\.id\)\?\.fonte===assinatura\)continue/);
  assert.match(convidado,/pedidosMidia\.get\(token\.id\)===pedido/);
  assert.doesNotMatch(convidado,/geracaoSkins/);
});

test('v29.15.30.1: uma miniatura nova só revela sprite e base após mídia pronta ou erro',()=>{
  assert.match(sala,/const imagensPendentesConvidado=new Set/);
  assert.match(sala,/if\(aguardarMidia\)imagensPendentesConvidado\.add\(unidade\.id\)/);
  assert.match(sala,/ativo&&!camadaMiniaturas\.vinculoAtivo\(id\)&&!imagensPendentesConvidado\.has\(id\)/);
  assert.match(sala,/imagensPendentesConvidado\.delete\(id\);\s*atualizarStandeeMiniatura\(\)/);
  assert.match(sala,/base\.fundo\.visible=visual\.fundo!=='transparente' &&/);
  assert.match(convidado,/sala\.liberarImagemPendenteParticipante\(token\.id\)/);
});

test('v29.15.30.1: mesa do mestre mantém seu fluxo anterior de participantes',()=>{
  const inicio=sala.indexOf('const configurarParticipantes=');
  const fim=sala.indexOf('const configurarOcultacaoTokens=',inicio);
  const metodo=sala.slice(inicio,fim);
  assert.match(metodo,/limparParticipantes\(\);modoConvidadoIncremental=false;idAvatar=selecionadoId/);
  assert.match(metodo,/adicionarParticipante\(unidade,tokens\[unidade\.id\]\)/);
  assert.match(sala,/const carregarImagemParticipante=async/);
});
