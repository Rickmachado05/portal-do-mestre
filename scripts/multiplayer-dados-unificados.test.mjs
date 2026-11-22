import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

async function preparar(){
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer/salas`;
  async function req(caminho,token,corpo){
    const resposta=await fetch(raiz+caminho,{method:corpo?'POST':'GET',
      headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(corpo?{'Content-Type':'application/json'}:{})},
      ...(corpo?{body:JSON.stringify(corpo)}:{})});
    return {status:resposta.status,dados:await resposta.json()};
  }
  const sala=(await req('',null,{campanha:'Teste',campanhaId:'dice-sync'})).dados;
  const base=`/${sala.codigo}`;
  const ana=(await req(base+'/entrar',null,{apelido:'Ana'})).dados;
  const bia=(await req(base+'/entrar',null,{apelido:'Bia'})).dados;
  const fichas=['ana','bia'].map(id=>({id,nome:id,elemento:'terra',classe:'Lutador',
    hp:100,hpMax:100,mana:25,manaMax:25,ca:10,escudo:0,temFicha:true,acoes:[]}));
  await req(base+'/fichas',sala.token,{personagens:fichas});
  await req(base+'/atribuir',sala.token,{pessoaId:ana.id,personagemId:'ana'});
  await req(base+'/atribuir',sala.token,{pessoaId:bia.id,personagemId:'bia'});
  return {app,req,base,sala,ana,bia};
}

test('mestre pode rolar sem NPC; dados físicos e aparência do host chegam a todos',async()=>{
  const {app,req,base,sala,ana,bia}=await preparar();
  try{
    const arte={format:'hexatombe-dice-art',version:1,name:'Runa compartilhada',type:8,
      material:'pedra',baseColor:'#8855aa',showNumbers:true,artworkPNG:{'1':'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg=='}};
    const resultado=await req(base+'/rolar',sala.token,{tipo:'mestre',rolagemId:'uuid-001',formula:'2d8+3',
      dados:[6,2],personagem:'Mestre',visibilidade:'publica',aparencia:{tipo:'custom',arte}});
    assert.equal(resultado.status,201);
    assert.equal(resultado.dados.rolagem.total,11);
    assert.equal(resultado.dados.rolagem.personagem,'Mestre');
    assert.equal(resultado.dados.rolagem.aparencia.arte.baseColor,'#8855aa');
    assert.equal(resultado.dados.rolagem.aparencia.arte.artworkPNG['1'],arte.artworkPNG['1']);
    for(const token of [sala.token,ana.token,bia.token]){
      const historico=await req(base+'/rolagens',token);
      assert.equal(historico.dados.rolagens.length,1);
      assert.equal(historico.dados.rolagens[0].total,11);
      assert.equal(historico.dados.rolagens[0].aparencia.arte.name,'Runa compartilhada');
    }
    const repetido=await req(base+'/rolar',sala.token,{tipo:'mestre',rolagemId:'uuid-001',formula:'2d8+3',dados:[6,2]});
    assert.equal(repetido.status,429); // rate limit primeiro, impedindo duplicar a mesma ação
    assert.equal((await req(base+'/rolagens',bia.token)).dados.rolagens.length,1);
    const falsificado=await req(base+'/rolar',ana.token,{tipo:'mestre',formula:'1d20',dados:[20]});
    assert.equal(falsificado.status,400);
  }finally{await app.fechar();}
});

test('rolagem reservada do mestre não chega aos convidados e dados inválidos são rejeitados',async()=>{
  const {app,req,base,sala,ana,bia}=await preparar();
  try{
    let r=await req(base+'/rolar',sala.token,{tipo:'mestre',formula:'1d20',dados:[8],visibilidade:'mestre'});
    assert.equal(r.status,201);
    assert.equal((await req(base+'/rolagens',sala.token)).dados.rolagens.length,1);
    assert.equal((await req(base+'/rolagens',ana.token)).dados.rolagens.length,0);
    assert.equal((await req(base+'/rolagens',bia.token)).dados.rolagens.length,0);
    await new Promise(done=>setTimeout(done,360));
    r=await req(base+'/rolar',sala.token,{tipo:'mestre',formula:'2d8',dados:[6,999]});
    assert.equal(r.status,400);
    assert.equal((await req(base+'/rolagens',sala.token)).dados.rolagens.length,1);
  }finally{await app.fechar();}
});
