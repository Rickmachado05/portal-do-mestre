import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fonte=(arquivo)=>readFileSync(new URL(`../src/${arquivo}`,import.meta.url),'utf8');

test('a rolagem do convidado usa Dice Box oficial e não executa física duplicada',()=>{
  const mesa=fonte('multiplayer/MesaConvidado2D.tsx');
  const convidado=fonte('multiplayer/Convidado.tsx');
  const replay=fonte('multiplayer/Rolagem3DMultiplayer.tsx');
  const oficial=fonte('Dados3D.tsx');
  assert.match(mesa,/import Dados3D from ['"]\.\.\/Dados3D['"]/);
  assert.match(mesa,/<Dados3D key=\{rolagemFisica.id\}/);
  assert.match(mesa,/onResultado=\{onResultadoFisico\}/);
  assert.match(oficial,/import DiceBox from ['"]@3d-dice\/dice-box['"]/);
  assert.match(oficial,/await motor\.roll\(/);
  assert.match(convidado,/tipo:'preparar'/);
  assert.match(convidado,/tipo:'concluir'/);
  assert.doesNotMatch(replay,/motor\.roll|<Dados3D|Dados3DLegado|cannon-es/);
});

test('os espectadores veem o resultado físico recebido e as faces reais personalizadas',()=>{
  const replay=fonte('multiplayer/Rolagem3DMultiplayer.tsx');
  const mesa=fonte('multiplayer/MesaConvidado2D.tsx');
  const mestre=fonte('multiplayer/MultiplayerMestre.tsx');
  assert.match(replay,/rolagem\.total/);
  assert.match(replay,/rolagem\.dados\.map\(/);
  assert.match(replay,/arte\.baseColor/);
  assert.match(replay,/artworkPNG/);
  assert.match(mesa,/Rolagem3DMultiplayer/);
  assert.match(mestre,/Rolagem3DMultiplayer/);
});
