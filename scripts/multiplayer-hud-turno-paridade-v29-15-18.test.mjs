import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const player=source('../src/multiplayer/MesaConvidado2D.tsx');
const master=source('../src/App.tsx');
const adapter=source('../src/multiplayer/HudTurnoConvidado.tsx');
const hud=source('../src/hexatombe/MenuCombateImersivo.tsx');
const view=source('../src/multiplayer/MesaConvidado3D.tsx');
test('v29.15.18: mestre e jogador renderizam exatamente o mesmo componente cinematográfico de combate',()=>{
 assert.match(master,/<MenuCombateImersivo/);
 assert.match(adapter,/import MenuCombateImersivo from/);
 assert.match(adapter,/<MenuCombateImersivo/);
 assert.match(player,/<HudTurnoConvidado/);
 assert.match(hud,/SECOES_MENU_COMBATE/);
});
test('v29.15.18: HUD exige combate ativo, câmera Personagem, turno próprio e token publicado',()=>{
 assert.match(adapter,/mostrarMenuNoTurno/);
 assert.match(adapter,/mesa\.combate\?\.ativo===true/);
 assert.match(adapter,/turnoId:mesa\.combate\?\.turnoId/);
 assert.match(adapter,/mesa\.tokens\.some\(t=>t\.id===personagemId\)/);
 assert.match(player,/habilitarHudTurnoJogador\(mesa,meuPersonagem,cameraJogador3D,visualizacao\)/);
});
test('v29.15.18: rolagens seguem o endpoint validado, sem acesso aos controles do mestre',()=>{
 assert.match(adapter,/if\(!ficha\|\|ficha\.id!==personagemId\)return null/);
 assert.match(adapter,/onRolarAcaoPublicada=\{onRolarAcao\}/);
 assert.match(hud,/onRolarAcaoPublicada\(acao\.id,'teste'\)/);
 assert.match(hud,/onRolarAcaoPublicada\(acao\.id,'valor'\)/);
 assert.match(adapter,/inventario\?\.id===personagemId/);
 assert.match(adapter,/onSolicitarItem\(\{tipo:'usar'/);
 assert.doesNotMatch(adapter,/proximoTurno|encerrarCombate|atualizarUnidade|setCampanha/);
});
test('v29.15.18: visão Personagem ancora a mesma HUD na projeção real do token',()=>{
 assert.match(view,/onProjecaoPersonagem/);
 assert.match(view,/new THREE\.Vector3\(ponto\.x/);
 assert.match(view,/\.project\(camera3d\)/);
 assert.match(player,/onProjecaoPersonagem=\{setAncoraPersonagem3D\}/);
 assert.match(player,/ancora=\{ancoraPersonagem3D\}/);
});
test('v29.15.18: iniciativa separada é somente leitura e não duplica menu de habilidades',()=>{
 const readOnly=source('../src/multiplayer/CombateConvidado.tsx');
 assert.match(readOnly,/somente leitura/);
 assert.doesNotMatch(readOnly,/onRolarAcao|onRolarFormula|onAlterarIniciativa/);
 assert.match(player,/combate:\{rotulo:'Iniciativa'/);
});
