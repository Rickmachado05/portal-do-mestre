import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {comporRecorteFogComoJogador3D} from '../src/mesa3d/recorteFogComoJogador3D.mjs';
const ler=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('v29.15.30.13: prévia de exploração na textura usa opacidade do mestre sem película adicional',()=>{
  const sala=ler('mesa3d/roomScene.ts');
  assert.match(sala,/comporFogNoPisoDoMestre/);
  assert.match(sala,/comporFogNoPisoDoMestre\(tokenObservado\?1:\.40\)/);
  assert.match(sala,/if\(previewNoPiso\)malhaVisao\.visible=false/);
  assert.match(sala,/if\(!tokenObservado&&!fog\?\.ativo\)restaurarTexturaPisoAposObservar\(\)/);
  assert.match(sala,/plantaMaterial\.map=texturaPreviaFogMestre/);
});

test('v29.15.30.13: recorte alfa de edição não reduz luminosidade dentro da área revelada',()=>{
  const chamadas=[];
  const ctx={globalCompositeOperation:'',globalAlpha:-1,save(){},restore(){},clearRect(){},
    drawImage(fonte){chamadas.push([fonte,this.globalAlpha]);}};
  const imagem={nome:'planta'},mascara={nome:'fog'};
  assert.equal(comporRecorteFogComoJogador3D(ctx,imagem,mascara,640,640,.4),true);
  assert.deepEqual(chamadas,[[imagem,1],[mascara,.4]]);
  chamadas.length=0;
  assert.equal(comporRecorteFogComoJogador3D(ctx,imagem,mascara,640,640),true);
  assert.deepEqual(chamadas,[[imagem,1],[mascara,1]]);
});

test('v29.15.30.13: personagem no 3D não acompanha cursor antes da aprovação do mestre',()=>{
  const player=ler('multiplayer/MesaConvidado3D.tsx');
  const arrastar=player.slice(player.indexOf('const arrastar=(e:PointerEvent)=>'),player.indexOf('const iniciar=(e:PointerEvent)=>'));
  assert.doesNotMatch(arrastar,/sala\.visualizarToken\(tokenSelecionado/);
  assert.doesNotMatch(arrastar,/posicoes\.set\(tokenSelecionado/);
  assert.doesNotMatch(player,/previaLocal/);
  assert.match(arrastar,/posicaoPermitidaNaMesa3D\(ponto,configuracao,outros\)/);
  assert.match(arrastar,/solicitarRef\.current\(percentual\.x,percentual\.y,false\)/);
  assert.match(player,/registrar\(token\.id,oficial\.x,oficial\.y\)/);
  const remoto=player.slice(player.indexOf('const receberArrasto='),player.indexOf('let distancia=26'));
  assert.doesNotMatch(remoto,/registrar\(evento\.id,evento\.x/);
  assert.match(remoto,/Math\.hypot\(evento\.x-oficial\.x,evento\.y-oficial\.y\)>\.01/);
});

test('v29.15.30.13: não publica geometria oculta de paredes ao jogador',()=>{
  const player=ler('multiplayer/MesaConvidado3D.tsx');
  const server=readFileSync(new URL('../scripts/multiplayer-server.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(player,/cena\.barreiras|estado\.barreiras/);
  assert.match(server,/objetos:mesa\.cenario3D\.objetos\.filter/);
  assert.match(server,/miniaturas:mesa\.cenario3D\.miniaturas\.filter/);
});
