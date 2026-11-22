import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const fonte=p=>readFileSync(new URL(`../src/${p}`,import.meta.url),'utf8');
const requisitar=async(base,caminho,token,body)=>{
  const resp=await fetch(`${base}${caminho}`,{
    method:body===undefined?'GET':'POST',
    headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body===undefined?{}:{'Content-Type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });return {status:resp.status,data:await resp.json()};
};
const cena={cenaId:'arena',cenaNome:'Arena',modoMesa:'3d',visibilidade:'total',imagem:null,
  cenario3D:{versao:1,base:'vazia',piso:'madeira',periodoDia:'dia',objetos:[],miniaturas:[]},
  tokens:[{id:'morgana',nome:'Morgana',tipo:'jogador',cor:'#5599bb',x:51,y:52}],
  combate:{ativo:true,rodada:2,turnoId:'morgana',ordem:['morgana']},
  ambiente:{clima:{tipo:'chuva',intensidade:40,vento:20,direcao:0},iluminacao:{ativa:true,ambiente:70}}};

test('v29.15.25: clima e período 3D são atualizados sem tocar na posição do token ou substituir o mapa',async()=>{
  const server=criarAplicacaoMultiplayer(),{port}=await server.escutar(0);
  const base=`http://127.0.0.1:${port}/api/multiplayer`;
  try{
    const mestre=(await requisitar(base,'/salas',null,{campanha:'Ambiente',campanhaId:'teste-v25'})).data;
    const convidado=(await requisitar(base,`/salas/${mestre.codigo}/entrar`,null,{apelido:'May'})).data;
    const rota=`/salas/${mestre.codigo}`;
    assert.equal((await requisitar(base,`${rota}/mesa`,mestre.token,cena)).status,200);
    const anterior=(await requisitar(base,`${rota}/mesa`,convidado.token)).data.mesa;
    assert.equal(anterior.combate.turnoId,'morgana');
    const atualizado=await requisitar(base,`${rota}/ambiente`,mestre.token,{
      cenaId:'arena',revisaoAmbiente:1001,ambiente:{clima:{tipo:'cinzas',intensidade:80,vento:70,direcao:180},iluminacao:{ativa:true,ambiente:15}},periodoDia3D:'noite'});
    assert.equal(atualizado.status,200);
    const depois=(await requisitar(base,`${rota}/mesa`,convidado.token)).data.mesa;
    assert.equal(depois.ambiente.clima.tipo,'cinzas');
    assert.equal(depois.ambiente.iluminacao.ambiente,15);
    assert.equal(depois.cenario3D.periodoDia,'noite');
    assert.deepEqual(depois.tokens,anterior.tokens);
    assert.deepEqual(depois.combate,anterior.combate);
    assert.equal(depois.revisao,anterior.revisao);
    const atrasado=await requisitar(base,`${rota}/ambiente`,mestre.token,{cenaId:'arena',revisaoAmbiente:999,ambiente:{clima:{tipo:'neve'},iluminacao:{ativa:true,ambiente:80}},periodoDia3D:'dia'});
    assert.equal(atrasado.status,200);assert.equal(atrasado.data.antiga,true);
    const imutavel=(await requisitar(base,`${rota}/mesa`,convidado.token)).data.mesa;
    assert.equal(imutavel.ambiente.clima.tipo,'cinzas');assert.equal(imutavel.cenario3D.periodoDia,'noite');
    assert.equal((await requisitar(base,`${rota}/ambiente`,convidado.token,{cenaId:'arena',ambiente:{clima:{tipo:'neve'}}})).status,403);
    assert.equal((await requisitar(base,`${rota}/ambiente`,mestre.token,{cenaId:'outra',ambiente:{clima:{tipo:'neve'}}})).status,409);
  }finally{await server.fechar();}
});

test('v29.15.25: ambiente individual não revela luzes, desenhos ou obstáculos',async()=>{
  const server=criarAplicacaoMultiplayer(),{port}=await server.escutar(0);
  const base=`http://127.0.0.1:${port}/api/multiplayer`;
  try{
    const mestre=(await requisitar(base,'/salas',null,{campanha:'Visão',campanhaId:'v25-priv'})).data;
    const convidado=(await requisitar(base,`/salas/${mestre.codigo}/entrar`,null,{apelido:'Ana'})).data;
    const rota=`/salas/${mestre.codigo}`;
    await requisitar(base,`${rota}/mesa`,mestre.token,{...cena,visibilidade:'individual',
      vistas:[{personagemId:'morgana',imagem:'data:image/webp;base64,QUFB',mascara3D:'0'.repeat(2304),idsVisiveis:['morgana']} ]});
    assert.equal((await requisitar(base,`${rota}/atribuir`,mestre.token,{pessoaId:convidado.id,personagemId:'morgana'})).status,200);
    const alterado=await requisitar(base,`${rota}/ambiente`,mestre.token,{
      cenaId:'arena',ambiente:{clima:{tipo:'areia',intensidade:22},iluminacao:{ativa:true,ambiente:100},
        luzes:[{x:87,y:52,cor:'#ffffff',alcance:10,ativa:true}],desenhos:[{pontos:[{x:88,y:55}],id:'secreto'}]},periodoDia3D:'entardecer'});
    assert.equal(alterado.status,200);
    const dadosVista=await requisitar(base,`${rota}/mesa`,convidado.token);assert.equal(dadosVista.status,200);const vista=dadosVista.data.mesa;
    assert.equal(vista.ambiente.clima.tipo,'areia');
    assert.equal(vista.ambiente.iluminacao,undefined);
    assert.equal(vista.ambiente.luzes,undefined);
    assert.equal(vista.ambiente.desenhos,undefined);
    assert.equal(vista.cenario3D.periodoDia,'entardecer');
    assert.deepEqual(vista.tokens.map(t=>t.id),['morgana']);
  }finally{await server.fechar();}
});

test('v29.15.25: alterações de iniciativa, aparência e clima disparam visão mesmo sem movimento',()=>{
  const pub=fonte('multiplayer/PublicadorMesa.tsx');
  const guest=fonte('multiplayer/Convidado.tsx');
  const scene=fonte('multiplayer/MesaConvidado3D.tsx');
  const room=fonte('mesa3d/roomScene.ts');
  assert.match(pub,/combate,imagensTokens,tokensTopview,miniaturas,gifsTokens/);
  assert.match(pub,/assinaturaAmbienteVisual=JSON\.stringify\(\{clima:ambiente\.clima/);
  assert.match(pub,/portal-mp-recalcular-visao/);
  assert.match(pub,/\/ambiente/);
  assert.match(guest,/evento\.tipo==='ambiente-mesa'/);
  assert.match(scene,/sala\.configurarPeriodoDia\(periodoRecebido\)/);
  assert.match(room,/const configurarPeriodoDia=/);
});
