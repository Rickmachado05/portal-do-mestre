import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {chaveEstadoCampanha} from '../src/hexatombe/campaignLibrary.ts';
import {percentualParaChao3D,chaoParaPercentual3D,moverTokenCompartilhado3D,posicaoPermitidaNaMesa3D,deslocarAlvoCamera,referenciaTokens3D} from '../src/mesa3d/mesaLivre3D.ts';
import {novoObjeto3D} from '../src/mesa3d/editorCena3D.ts';
const cena3D={versao:1,base:'vazia',objetos:[]};
const estado=()=>({
  titulo:'Campanha',cenaAtivaId:'c1',
  unidades:[{id:'a',nome:'Morgana'},{id:'b',nome:'Aliado'}],
  cenas:[
    {id:'c1',nome:'Taverna',tokens:{
      a:{x:20,y:60,travado:false,tamanho:70,rotacao:0,skinId:'skin-a'},
      b:{x:50,y:30,travado:false}},barreiras:[],iluminacao:{ativa:false}},
    {id:'c2',nome:'Floresta',tokens:{a:{x:80,y:90}}}
  ],
  registros:[{texto:'Não alterar'}]
});
function memoria(){const m=new Map([[chaveEstadoCampanha('camp-1'),JSON.stringify(estado())]]);return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),ler:()=>JSON.parse(m.get(chaveEstadoCampanha('camp-1')))};}
test('converte coordenadas percentuais da Mesa 2D no chão 3D e vice-versa',()=>{
  for(const p of [{x:50,y:50},{x:12.3,y:91.4},{x:99,y:1}]){
    const resultado=chaoParaPercentual3D(percentualParaChao3D(p));
    assert.ok(Math.abs(resultado.x-p.x)<1e-8);assert.ok(Math.abs(resultado.y-p.y)<1e-8);
  }
});
test('mover token em 3D atualiza a posição 2D, preservando skins e outros campos',()=>{
  const s=memoria(),antigo=s.ler();
  assert.equal(moverTokenCompartilhado3D('camp-1','c1','a',{x:2,z:3},s),true);
  const novo=s.ler();
  assert.notEqual(novo.cenas[0].tokens.a.x,20);
  assert.equal(novo.cenas[0].tokens.a.skinId,'skin-a');assert.equal(novo.cenas[0].tokens.a.tamanho,70);
  assert.deepEqual(novo.cenas[0].tokens.b,antigo.cenas[0].tokens.b);
  assert.deepEqual(novo.cenas[1],antigo.cenas[1]);assert.deepEqual(novo.registros,antigo.registros);
});
test('tokens bloqueados, ausentes ou outra cena não podem ser movidos',()=>{
  const s=memoria();const a=s.ler();a.cenas[0].tokens.a.travado=true;s.setItem(chaveEstadoCampanha('camp-1'),JSON.stringify(a));
  assert.equal(moverTokenCompartilhado3D('camp-1','c1','a',{x:1,z:2},s),false);
  assert.equal(moverTokenCompartilhado3D('camp-1','c1','outro',{x:1,z:2},s),false);
  assert.equal(moverTokenCompartilhado3D('camp-1','inexistente','a',{x:1,z:2},s),false);
  assert.equal(moverTokenCompartilhado3D('camp-1','c2','a',{x:9999,z:2},s),false);
  assert.deepEqual(s.ler(),a);
});
test('não move tokens para posições inválidas, paredes ou sobre outros tokens',()=>{
  const parede=novoObjeto3D('parede',{x:0,z:0});
  assert.equal(posicaoPermitidaNaMesa3D({x:0,z:0},{...cena3D,objetos:[parede]}),false);
  assert.equal(posicaoPermitidaNaMesa3D({x:7,z:6},cena3D,[{x:7.25,z:6}]),false);
  assert.equal(posicaoPermitidaNaMesa3D({x:7,z:6},cena3D,[{x:0,z:0}]),true);
  assert.equal(posicaoPermitidaNaMesa3D({x:NaN,z:0},cena3D),false);
});
test('câmera livre desloca sobre o plano e respeita os limites do cenário',()=>{
  const c=deslocarAlvoCamera({x:0,z:0},60,-20,.35,18);assert.ok(c.x!==0||c.z!==0);
  const far=deslocarAlvoCamera({x:0,z:0},50000,-50000,1,38);
  assert.ok(far.x>=-9&&far.x<=9);assert.ok(far.z>=-8.5&&far.z<=8.5);
});
test('as duas câmeras preservam construção na visão mestre e WASD',()=>{
  const p=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
  const sala=readFileSync(new URL('../src/mesa3d/roomScene.ts',import.meta.url),'utf8');
  assert.match(p,/cameraMestre/);assert.doesNotMatch(p,/cameraConstruir/);assert.match(p,/direcaoCamera/);
  assert.match(p,/moverTokenCompartilhado3D/);assert.match(p,/configurarParticipantes/);
  assert.match(sala,/tokenAtingido/);assert.match(sala,/objetoAtingido/);assert.match(sala,/carregarImagemParticipante/);
});

test('expandir o terreno mantém os tokens na mesma posição física da planta original',()=>{
  const original={...cena3D,piso:'imagem',larguraTerreno:22,profundidadeTerreno:11,larguraPlanta:22,profundidadePlanta:11};
  const expandido={...original,larguraTerreno:50,profundidadeTerreno:35};
  const token={x:72,y:34};
  assert.deepEqual(percentualParaChao3D(token,original),percentualParaChao3D(token,expandido));
  assert.deepEqual(chaoParaPercentual3D(percentualParaChao3D(token,expandido),expandido),token);
  assert.deepEqual(referenciaTokens3D(expandido),{largura:22,profundidade:11,minX:-11,maxX:11,minZ:-5.5,maxZ:5.5});
  assert.equal(posicaoPermitidaNaMesa3D({x:20,z:0},expandido),false);
  assert.equal(posicaoPermitidaNaMesa3D({x:7,z:0},expandido),true);
});
