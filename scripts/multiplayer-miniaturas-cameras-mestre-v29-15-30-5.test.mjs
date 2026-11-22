import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ler=(arquivo)=>readFileSync(new URL(`../src/${arquivo}`,import.meta.url),'utf8');
const mesa=ler('mesa3d/Mesa3DPrototipo.tsx');
const sala=ler('mesa3d/roomScene.ts');
const miniaturas=ler('mesa3d/renderMiniaturas3D.ts');

// Regressão estrutural: evita que uma mudança futura da câmera desligue a camada
// de modelos 3D e faça os sprites 2D substituírem GLBs já carregados.
test('v29.15.30.5: GLBs são parte da cena, não dependem de modoMestre (câmera)',()=>{
  assert.match(mesa,/configurarMiniaturas\(cenario\.miniaturas\?\?\[\],cenario,cenaAtual\?\.tokens\?\?\{\},true\)/);
  assert.doesNotMatch(mesa,/configurarMiniaturas\(cenario\.miniaturas\?\?\[\],cenario,cenaAtual\?\.tokens\?\?\{\},modoMestre(?:&&visaoIndividualId)?\)/);
  const efeito=mesa.match(/useEffect\(\(\)=>\{salaRef\.current\?\.configurarMiniaturas\([\s\S]*?\);\},\[([^\]]+)\]\);/);
  assert.ok(efeito,'efeito de configuração da camada GLB precisa existir');
  assert.ok(!efeito[1].split(',').map(v=>v.trim()).includes('modoMestre'),'a troca de câmera não deve disparar reconstrução de GLBs');
});

test('v29.15.30.5: as três câmeras alternativas compartilham a mesma sala 3D',()=>{
  assert.match(mesa,/valor==='terceira'/);
  assert.match(mesa,/pedido\.modo==='tatica'\?'tatica':'personagem'/);
  assert.match(mesa,/renderer\.render\(sala\.cena,cameraCinematica\)/);
  assert.match(mesa,/renderer\.render\(sala\.cena,camera\)/);
  assert.match(mesa,/renderer\.render\(sala\.cena,cameraMestre\)/);
});

test('v29.15.30.5: Fog continua controlando apenas quem está visível',()=>{
  assert.match(sala,/camadaMiniaturas\.configurarFiltroPersonagensVisiveis\(tokenObservado\?visiveisIndividual:null\)/);
  assert.match(miniaturas,/function configurarFiltroPersonagensVisiveis\(ids:ReadonlySet<string>\|null\)/);
  assert.match(sala,/const visivel=ativo&&!camadaMiniaturas\.vinculoAtivo\(id\)/,'sprite reserva deve ser ocultado quando GLB está ativo');
});
