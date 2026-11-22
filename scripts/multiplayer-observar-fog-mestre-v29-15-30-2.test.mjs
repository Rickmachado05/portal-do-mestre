import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fonte=(c)=>readFileSync(new URL('../src/'+c,import.meta.url),'utf8');
const room=fonte('mesa3d/roomScene.ts');
const mini=fonte('mesa3d/renderMiniaturas3D.ts');
const mesa=fonte('mesa3d/Mesa3DPrototipo.tsx');
test('v29.15.30.2: sair de Observar limpa máscara obsoleta e restaura avatar e outros personagens',()=>{
  const p=room.slice(room.indexOf('const configurarVisaoIndividual='),room.indexOf('// Moldura discreta'));
  const bloco=p.slice(p.indexOf('if(!tokenObservado&&!fog?.ativo)'),p.indexOf('const dimensoes=referenciaTokens3D'));
  for(const expressao of ['visiveisIndividual.clear()','malhaVisao.visible=false','ctxVisao.clearRect','avatar.visible=!!tokens[idAvatar]','outro.grupo.visible=!!tokens[id]','configurarFiltroPersonagensVisiveis(null)','atualizarStandeeMiniatura()']){
    assert.ok(bloco.includes(expressao),`restauração ausente: ${expressao}`);
  }
});
test('v29.15.30.2: Observar sincroniza GLBs e sprites com a mesma lista de tokens visíveis',()=>{
  const p=room.slice(room.indexOf('const configurarVisaoIndividual='),room.indexOf('// Moldura discreta'));
  assert.match(p,/avatar\.visible=!!tokens\[idAvatar\]&&\(!tokenObservado\|\|visiveisIndividual\.has\(idAvatar\)\)/);
  assert.match(p,/configurarFiltroPersonagensVisiveis\(tokenObservado\?visiveisIndividual:null\)/);
  assert.match(p,/atualizarStandeeMiniatura\(\)/);
});
test('v29.15.30.2: mudança de visão não desliga a camada GLB nem força recarga de modelo',()=>{
  assert.ok(mesa.includes('configurarMiniaturas(cenario.miniaturas??[],cenario,cenaAtual?.tokens??{},true)'));
  assert.ok(!mesa.includes('configurarMiniaturas(cenario.miniaturas??[],cenario,cenaAtual?.tokens??{},modoMestre)'));
  assert.ok(!mesa.includes('configurarMiniaturas(cenario.miniaturas??[],cenario,cenaAtual?.tokens??{},modoMestre&&!visaoIndividualId)'));
  assert.ok(!mesa.includes('const [camadaObservar'));
});
test('v29.15.30.2: filtro da prévia não destrói GLB; aceita modelo carregado depois',()=>{
  assert.match(mini,/let visiveisNaPrevia:ReadonlySet<string>\|null=null;/);
  assert.match(mini,/function configurarFiltroPersonagensVisiveis\(ids:ReadonlySet<string>\|null\)/);
  assert.match(mini,/const modelo=instancias\.get\(inst\.id\);if\(modelo\)posicionar\(inst,modelo\)/);
  assert.ok(mini.includes('visiveisNaPrevia===null'));
  assert.match(mini,/instancias\.set\(inst\.id,novo\);modeloPorInstancia\.set/);
  assert.ok(!mini.slice(mini.indexOf('function configurarFiltroPersonagensVisiveis'),mini.indexOf('function vinculoAtivo')).includes('removerInstancia'));
});
