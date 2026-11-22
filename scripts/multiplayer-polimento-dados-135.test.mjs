import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ler=(caminho)=>readFileSync(new URL(`../${caminho}`,import.meta.url),'utf8');

test('placar do mestre na Mesa 2D usa mesma duração de 1,8 s do convidado depois do resultado físico',()=>{
  const mestre=ler('src/App.tsx');
  const convidado=ler('src/multiplayer/Convidado.tsx');
  assert.match(mestre,/filaRolagens\.length\s*\?\s*1400\s*:\s*1800/);
  assert.match(convidado,/setRolagemFisica\(atual=>atual\?\.id===id\?null:atual\),1800/);
  assert.doesNotMatch(mestre,/filaRolagens\.length\s*\?\s*1400\s*:\s*6500/);
});

test('Mesa 3D remove a pílula superior solta, conservando Dice Box original e tratamento de erro',()=>{
  const mesa=ler('src/mesa3d/Mesa3DPrototipo.tsx');
  const css=ler('src/mesa3d/Mesa3DPrototipo.css');
  assert.match(mesa,/<div className="m3d-dice-host"><Dados3D/);
  assert.doesNotMatch(mesa,/<div className="m3d-dice-overlay"><Dados3D/);
  assert.match(mesa,/onResultado=\{concluirRolagem\}/);
  assert.match(mesa,/onErro=\{mensagem=>\{/);
  assert.match(css,/\.m3d-dice-host\{[^}]*width:0;[^}]*height:0;[^}]*background:transparent/);
  assert.doesNotMatch(mesa,/Fechar rolagem<\/button>/);
});

test('limite de assentamento da Mesa 3D é menor sem criar um sorteio novo',()=>{
  const mesa=ler('src/mesa3d/Mesa3DPrototipo.tsx');
  const oficial=ler('src/Dados3D.tsx');
  assert.match(mesa,/tempoAssentamentoMs=\{4200\}/);
  assert.match(oficial,/settleTimeout: tempoAssentamentoMs \? Math\.max\(3000, Math\.min\(6000, tempoAssentamentoMs\)\) : 6000/);
  assert.match(oficial,/resultado=await motor\.roll/);
  assert.doesNotMatch(oficial,/setEstado\('⚄'\)/);
});

test('transmissão WebRTC e captura do Dice Box permanecem no mestre 3D',()=>{
  const mesa=ler('src/mesa3d/Mesa3DPrototipo.tsx');
  const dados=ler('src/Dados3D.tsx');
  assert.match(mesa,/iniciarDadosAoVivo\(c,idVideoRolagemRef\.current,stream,'publica'\)/);
  assert.match(mesa,/publicarVideoRolagemMestre\(campanhaId,idVideoRolagemRef\.current,video\)/);
  assert.match(dados,/capturarDadosComAlfaSeparado\(canvas,30\)/);
});
