import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(p)=>readFileSync(new URL(`../src/${p}`,import.meta.url),'utf8');

test('pausa visual é local, persistente e observada por 2D e 3D do mestre',()=>{
  const preferencia=src('lib/pausaClimaLocal.ts');
  assert.match(preferencia,/localStorage\.setItem/);
  assert.match(preferencia,/useSyncExternalStore/);
  assert.match(src('App.tsx'),/usePausaClimaLocal\(\)/);
  assert.match(src('mesa3d/Mesa3DPrototipo.tsx'),/usePausaClimaLocal\(\)/);
  assert.match(src('mesa3d/Mesa3DPrototipo.tsx'),/configurar\(normalizarClima\(cenaAtual\?\.clima\),pausarClima3D\)/);
});

test('jogador possui janela Clima no grupo Ambiente sem alterar clima do mestre',()=>{
  const jogo=src('multiplayer/MesaConvidado2D.tsx');
  assert.match(jogo,/type Painel=[^;]*'clima'/);
  assert.match(jogo,/aria-label="Ferramentas de ambiente do jogador"/);
  const grupo=jogo.split('aria-label="Ferramentas de ambiente do jogador"')[1].split('</section>')[0];
  assert.match(grupo,/onClick=\{\(\)=>abrir\('clima'\)\}/);
  assert.match(grupo,/strong>Clima<\/strong>/);
  assert.match(jogo,/Pausar clima neste navegador \(2D e 3D\)/);
  assert.match(jogo,/usePausaClimaLocal\(\)/);
  assert.match(jogo,/pausado=\{pausarClima\}/);
  assert.match(src('multiplayer/AmbienteConvidado2D.tsx'),/<WeatherLayer config=\{ambiente\.clima\|\|CLIMA_PADRAO\} pausado=\{pausado\}/);
});

test('clima 3D do jogador respeita pausa imediatamente sem reiniciar cena',()=>{
  const jogo=src('multiplayer/MesaConvidado2D.tsx');
  const camera=src('multiplayer/MesaConvidado3D.tsx');
  assert.match(jogo,/<MesaConvidado3D[^\n]*pausarClima=\{pausarClima\}/);
  assert.match(camera,/climaRef\.current\?\.configurar\(climaConfiguradoRef\.current,pausarClima\)/);
  assert.match(camera,/clima\.configurar\(climaConfiguradoRef\.current,climaPausadoRef\.current\)/);
  assert.doesNotMatch(camera,/clima\.configurar\(normalizarClima\(dados\.ambiente\?\.clima\),false\)/);
});

test('grama mais verde altera apenas a textura do piso 3D sem afetar pisos importados',()=>{
  const cena=src('mesa3d/roomScene.ts');
  assert.match(cena,/tipo==='grama'\?'#63864a'/);
  assert.match(cena,/tipo==='grama'\?\['#729453','#4d713b','#84a668','#628748'\]/);
  assert.match(cena,/configPiso\.piso==='imagem'/);
});
