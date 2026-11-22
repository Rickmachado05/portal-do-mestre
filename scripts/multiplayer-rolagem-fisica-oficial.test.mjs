import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

async function setup(){
  const app=criarAplicacaoMultiplayer();
  const {port}=await app.escutar(0);
  const raiz=`http://127.0.0.1:${port}/api/multiplayer/salas`;
  async function req(path,token,body){
    const r=await fetch(raiz+path,{method:body?'POST':'GET',headers:{
      ...(token?{Authorization:`Bearer ${token}`}:{ }), ...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    return {status:r.status,data:await r.json()};
  }
  const sala=(await req('','',{campanha:'Rolagem física',campanhaId:'campanha'})).data;
  const base=`/${sala.codigo}`;
  const a=(await req(base+'/entrar',null,{apelido:'Ana'})).data;
  const b=(await req(base+'/entrar',null,{apelido:'Bia'})).data;
  await req(base+'/mesa',sala.token,{cenaId:'cena',cenaNome:'Cena de teste',visibilidade:'total',tokens:[
    {id:'ana',nome:'Ana',tipo:'jogador',x:20,y:20,cor:'#ffffff'},
    {id:'bia',nome:'Bia',tipo:'jogador',x:40,y:40,cor:'#ffffff'}
  ]});
  await req(base+'/fichas',sala.token,{personagens:['ana','bia'].map(id=>({id,nome:id,elemento:'ar',classe:'Lutador',hp:10,hpMax:10,mana:10,manaMax:10,ca:10,escudo:0,temFicha:true,acoes:[]}))});
  await req(base+'/atribuir',sala.token,{pessoaId:a.id,personagemId:'ana'});
  await req(base+'/atribuir',sala.token,{pessoaId:b.id,personagemId:'bia'});
  return {app,req,base,sala,a,b};
}
test('rolagem física convidado usa exatamente as faces devolvidas pelo Dice Box, sem outro sorteio',async()=>{
  const {app,req,base,sala,a,b}=await setup();
  try{
    const reqPre=await req(base+'/rolar',a.token,{tipo:'preparar',comando:{tipo:'livre',formula:'2d8+3'},visibilidade:'publica'});
    assert.equal(reqPre.status,200);
    const prep=reqPre.data.preparacao;
    assert.equal(prep.formula,'2d8+3');assert.equal(prep.quantidade,2);assert.equal(prep.faces,8);
    assert.equal((await req(base+'/rolagens',sala.token)).data.rolagens.length,0,'não pode sortear antes da física');
    const invalid=await req(base+'/rolar',a.token,{tipo:'concluir',id:prep.id,dados:[9,2]});
    assert.equal(invalid.status,400);
    const ok=await req(base+'/rolar',a.token,{tipo:'concluir',id:prep.id,dados:[4,7]});
    assert.equal(ok.status,201); assert.equal(ok.data.rolagem.total,14);
    assert.deepEqual(ok.data.rolagem.dados,[4,7]);
    for(const token of [sala.token,a.token,b.token]){
      const hist=(await req(base+'/rolagens',token)).data.rolagens;
      assert.equal(hist.length,1);
      assert.deepEqual(hist[0].dados,[4,7]);assert.equal(hist[0].total,14);
    }
    const novamente=await req(base+'/rolar',a.token,{tipo:'concluir',id:prep.id,dados:[6,6]});
    assert.equal(novamente.status,409,'mesmo lançamento não pode ser salvo duas vezes');
  }finally{await app.fechar();}
});

test('preparação valida ficha e impede convidado de concluir rolagem alheia ou mudar visibilidade',async()=>{
  const {app,req,base,sala,a,b}=await setup();
  try{
    const invalida=await req(base+'/rolar',a.token,{tipo:'preparar',comando:{tipo:'livre',formula:'1d99'}});
    assert.equal(invalida.status,400);
    const r=await req(base+'/rolar',a.token,{tipo:'preparar',comando:{tipo:'livre',formula:'1d20'},visibilidade:'mestre'});
    assert.equal(r.status,200);
    const id=r.data.preparacao.id;
    assert.equal((await req(base+'/rolar',b.token,{tipo:'concluir',id,dados:[20]})).status,409);
    const fim=await req(base+'/rolar',a.token,{tipo:'concluir',id,dados:[13],visibilidade:'publica'});
    assert.equal(fim.status,201);
    assert.equal(fim.data.rolagem.visibilidade,'mestre','a visibilidade foi fixada antes do lançamento');
    assert.equal((await req(base+'/rolagens',sala.token)).data.rolagens.length,1);
    assert.equal((await req(base+'/rolagens',a.token)).data.rolagens.length,1);
    assert.equal((await req(base+'/rolagens',b.token)).data.rolagens.length,0);
  }finally{await app.fechar();}
});
