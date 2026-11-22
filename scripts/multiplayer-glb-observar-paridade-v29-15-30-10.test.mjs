import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const src=(arquivo)=>readFileSync(new URL(`../src/${arquivo}`,import.meta.url),'utf8');
const fonteModelos=src('multiplayer/miniaturasVisaoIndividual3D.ts');
const fontePinceis=src('multiplayer/pinceisVisao3D.ts');
const mestre=src('mesa3d/roomScene.ts');
const camada=src('mesa3d/renderMiniaturas3D.ts');
const publicador=src('multiplayer/visaoIndividualPublicada.ts');
function testarFuncao(typescript,nome){
  // Permite executar a regra compartilhada sem depender do transpileModule,
  // que não existe no TypeScript 7 nativo do projeto.
  const stripped=stripTypeScriptTypes(typescript,{mode:'strip'});
  const body=stripped.replace(/^import.*$/gm,'').replace(/export function /g,'function ')
    .replace(/export type [^;]*;/g,'');
  return new Function(`${body}\nreturn ${nome};`)();
}
test('v29.15.30.10: mestre e jogador compartilham o filtro de ID das miniaturas GLB',()=>{
  assert.match(publicador,/filtrarIdsMiniaturasVisaoIndividual3D\(/);
  assert.match(mestre,/miniaturasParaVisaoIndividual3D\(/);
  assert.match(mestre,/filtrarIdsMiniaturasVisaoIndividual3D\(/);
  assert.match(mestre,/configurarFiltroMiniaturasVisiveis\(miniaturasAutorizadas\)/);
});
test('v29.15.30.10: GLB vinculado e miniatura independente seguem o campo autorizado',()=>{
  const filtro=testarFuncao(fonteModelos,'filtrarIdsMiniaturasVisaoIndividual3D');
  const miniaturas=[
    {id:'ligado',personagemId:'morgana',x:20,y:30},
    {id:'fora',personagemId:'outro',x:21,y:30},
    {id:'livre',x:25,y:30},
    {id:'longe',x:90,y:95},
    {id:'invalido',x:NaN,y:30},
  ];
  const ids=filtro(miniaturas,new Set(['morgana']),m=>m.x<40);
  assert.deepEqual(ids,['ligado','livre']);
  assert.deepEqual(filtro(miniaturas,new Set(['morgana','outro']),m=>m.x<40),['ligado','fora','livre']);
});
test('v29.15.30.10: pincéis do mestre e do publicador têm regra idêntica',()=>{
  const pincel=testarFuncao(fontePinceis,'liberadoPelosPinceis');
  const tracos=[{acao:'ocultar',pontos:[{x:50,y:50}],raio:8}];
  assert.equal(pincel({x:50,y:50},tracos,100,100,true),false);
  assert.equal(pincel({x:90,y:90},tracos,100,100,true),true);
  assert.equal(pincel({x:50,y:50},[{acao:'revelar',pontos:[{x:50,y:50}],raio:8}],100,100,false),true);
  assert.match(publicador,/from '\.\/pinceisVisao3D'/);
  assert.match(mestre,/from '\.\.\/multiplayer\/pinceisVisao3D'/);
});
test('v29.15.30.10: modelo já carregado ou carregado depois respeita o filtro, sem recarga',()=>{
  assert.match(camada,/miniaturasVisiveisNaPrevia!==null\s*\?miniaturasVisiveisNaPrevia\.has\(instancia\.id\)/);
  assert.match(camada,/function configurarFiltroMiniaturasVisiveis\(ids:ReadonlySet<string>\|null\)/);
  assert.match(camada,/posicionar\(maisRecente,novo\);aoCarregar\(\)/);
  const filtro=camada.slice(camada.indexOf('function configurarFiltroMiniaturasVisiveis'),camada.indexOf('function vinculoAtivo'));
  assert.doesNotMatch(filtro,/removerInstancia|carregar\(/);
  assert.match(mestre,/camadaMiniaturas\.configurarFiltroMiniaturasVisiveis\(null\)/);
  assert.match(mestre,/restaurarTexturaPisoAposObservar\(\)/);
});
