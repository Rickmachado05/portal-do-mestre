import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ajustarProporcaoMapaCompartilhado3D,dimensoesTerreno3D,normalizarCenario3D} from '../src/mesa3d/editorCena3D.ts';
import {percentualParaChao3D,chaoParaPercentual3D} from '../src/mesa3d/mesaLivre3D.ts';
import {ponto3DParaMapa,pontoMapaPara3D} from '../src/mesa3d/mapaCompartilhado3D.ts';

const base={versao:1,base:'vazia',mapaUnico:true,piso:'imagem',larguraTerreno:22,profundidadeTerreno:13.75,
  larguraPlanta:22,profundidadePlanta:13.75,objetos:[{id:'obj-caixa',tipo:'caixa',nome:'Caixa antiga',x:5,z:-3,rotacao:0}]};

test('a planta vertical da Mesa 2D corrige o palco 3D herdado da versão antiga',()=>{
  const corrigido=normalizarCenario3D(ajustarProporcaoMapaCompartilhado3D(base,.625));
  const d=dimensoesTerreno3D(corrigido);
  assert.ok(Math.abs(d.largura/d.profundidade-.625)<.001);
  assert.equal(d.profundidade,22);
  assert.equal(d.largura,13.75);
  assert.equal(corrigido.aspectoPlanta,.625);
});

test('peças antigas preservam posição relativa e tokens/barreiras permanecem nos mesmos percentuais',()=>{
  const corrigido=ajustarProporcaoMapaCompartilhado3D(base,.625);
  const objeto=corrigido.objetos[0];
  assert.ok(Math.abs(objeto.x/(corrigido.larguraTerreno/2)-5/11)<1e-9);
  assert.ok(Math.abs(objeto.z/(corrigido.profundidadeTerreno/2)-(-3)/(13.75/2))<1e-9);
  for(const p of [{x:18,y:66},{x:0,y:0},{x:100,y:100}]){
    const local=percentualParaChao3D(p,corrigido);
    const volta=chaoParaPercentual3D(local,corrigido);
    assert.ok(Math.abs(volta.x-p.x)<1e-9);assert.ok(Math.abs(volta.y-p.y)<1e-9);
    const linha=pontoMapaPara3D(p,corrigido),retorno=ponto3DParaMapa(linha,corrigido);
    assert.ok(Math.abs(retorno.x-p.x)<1e-9);assert.ok(Math.abs(retorno.y-p.y)<1e-9);
  }
});

test('mapas proporcionais, cenas antigas e pisos vazios não são reajustados',()=>{
  const correto={...base,larguraTerreno:13.75,profundidadeTerreno:22,aspectoPlanta:.625};
  assert.equal(ajustarProporcaoMapaCompartilhado3D(correto,.625),correto);
  assert.equal(ajustarProporcaoMapaCompartilhado3D({...base,mapaUnico:false},.625).larguraTerreno,22);
  assert.equal(ajustarProporcaoMapaCompartilhado3D({...base,piso:'madeira'},.625).larguraTerreno,22);
  assert.equal(ajustarProporcaoMapaCompartilhado3D(base,NaN),base);
});

test('mapas muito estreitos respeitam as dimensões mínimas sem correção infinita',()=>{
  const c=ajustarProporcaoMapaCompartilhado3D(base,.05);
  assert.equal(c.larguraTerreno,4);
  assert.equal(c.profundidadeTerreno,22);
  assert.equal(ajustarProporcaoMapaCompartilhado3D(c,.05),c);
});
