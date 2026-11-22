import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

test('chat único preserva NPC autenticado do mestre, privacidade e impede falsificação por convidados',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const pedir=async(caminho,token,method='GET',corpo)=>{
    const r=await fetch(raiz+caminho,{method,
      headers:{...(token?{Authorization:`Bearer ${token}`}:{ } ),...(corpo?{'Content-Type':'application/json'}:{})},
      body:corpo?JSON.stringify(corpo):undefined});
    return {status:r.status,dados:await r.json()};
  };
  try{
    const mestre=(await pedir('/salas',null,'POST',{campanha:'Teste chat único',campanhaId:'camp-chat-unificado'})).dados;
    const rota=`/salas/${mestre.codigo}`;
    const ana=(await pedir(rota+'/entrar',null,'POST',{apelido:'Morgana'})).dados;
    const bia=(await pedir(rota+'/entrar',null,'POST',{apelido:'Naeris'})).dados;
    const npc={id:'npc-grande-espirito',nome:'Grande Espírito',tipo:'npc',cor:'#aabbcc'};
    const negado=await pedir(rota+'/chat',ana.token,'POST',{texto:'Falso mestre',persona:npc});
    assert.equal(negado.status,403);
    assert.equal((await pedir(rota+'/chat',bia.token)).dados.mensagens.length,0);
    const publico=await pedir(rota+'/chat',mestre.token,'POST',{texto:'Bem-vindos, dobradores!',persona:npc});
    assert.equal(publico.status,201);
    assert.deepEqual(publico.dados.mensagem.persona,npc);
    assert.equal(publico.dados.mensagem.autorId,mestre.sala.participantes[0].id);
    assert.equal((await pedir(rota+'/chat',ana.token)).dados.mensagens[0].persona.nome,'Grande Espírito');
    await new Promise(resolve=>setTimeout(resolve,430));
    const privado=await pedir(rota+'/chat',mestre.token,'POST',{texto:'Segredo do espírito',persona:npc,destinatarioId:ana.id});
    assert.equal(privado.status,201);
    assert.equal((await pedir(rota+'/chat',ana.token)).dados.mensagens.length,2);
    assert.deepEqual((await pedir(rota+'/chat',bia.token)).dados.mensagens.map(m=>m.texto),['Bem-vindos, dobradores!']);
    await new Promise(resolve=>setTimeout(resolve,430));
    const falsaFoto=await pedir(rota+'/chat',mestre.token,'POST',{texto:'Foto inválida',persona:{...npc,foto:'javascript:alert(1)'}});
    assert.equal(falsaFoto.status,201);
    assert.equal(falsaFoto.dados.mensagem.persona.foto,undefined);
    await new Promise(resolve=>setTimeout(resolve,430));
    const tipoInvalido=await pedir(rota+'/chat',mestre.token,'POST',{texto:'Ataque',persona:{id:'jogador-1',nome:'Naeris',tipo:'jogador'}});
    assert.equal(tipoInvalido.status,400);
  }finally{await app.fechar();}
});

test('chat registra apelido e personagem atribuído pelo mestre, sem permitir falsificar identidade',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const pedir=async(caminho,token,method='GET',corpo)=>{
    const resposta=await fetch(raiz+caminho,{method,
      headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(corpo?{'Content-Type':'application/json'}:{})},
      body:corpo?JSON.stringify(corpo):undefined});
    return {status:resposta.status,dados:await resposta.json()};
  };
  try{
    const mestre=(await pedir('/salas',null,'POST',{campanha:'Teste identidades',campanhaId:'camp-chat-identidades'})).dados;
    const rota=`/salas/${mestre.codigo}`;
    const convidado=(await pedir(rota+'/entrar',null,'POST',{apelido:'teste'})).dados;
    const visitante=(await pedir(rota+'/entrar',null,'POST',{apelido:'outra pessoa'})).dados;
    const antes=await pedir(rota+'/chat',convidado.token,'POST',{texto:'Ainda não tenho personagem',autorNome:'Mestre (Falso)'});
    assert.equal(antes.status,201);
    assert.equal(antes.dados.mensagem.autorNome,'teste');
    const cena=await pedir(rota+'/mesa',mestre.token,'POST',{
      cenaId:'cena-1',cenaNome:'Cena 1',visibilidade:'total',tokens:[
        {id:'morgana',nome:'Morgana',tipo:'jogador',x:20,y:40,cor:'#6ca9c6'},
        {id:'naeris',nome:'Naeris',tipo:'jogador',x:55,y:65,cor:'#dbba7f'},
      ],
    });
    assert.equal(cena.status,200);
    const vinculo=await pedir(rota+'/atribuir',mestre.token,'POST',{pessoaId:convidado.id,personagemId:'morgana'});
    assert.equal(vinculo.status,200);
    assert.equal(vinculo.dados.sala.participantes.find(p=>p.id===convidado.id).personagemNome,'Morgana');
    await new Promise(resolve=>setTimeout(resolve,440));
    const mensagem=await pedir(rota+'/chat',convidado.token,'POST',{
      texto:'Mensagem da Morgana',autorNome:'Outro nome (Naeris)',personagemId:'naeris',
    });
    assert.equal(mensagem.status,201);
    assert.equal(mensagem.dados.mensagem.autorNome,'teste (Morgana)');
    assert.equal(mensagem.dados.mensagem.personagemId,'morgana');
    assert.equal((await pedir(rota+'/chat',visitante.token)).dados.mensagens.at(-1).autorNome,'teste (Morgana)');
    const outraAtribuicao=await pedir(rota+'/atribuir',mestre.token,'POST',{pessoaId:convidado.id,personagemId:'naeris'});
    assert.equal(outraAtribuicao.status,200);
    await new Promise(resolve=>setTimeout(resolve,440));
    const posterior=await pedir(rota+'/chat',convidado.token,'POST',{texto:'Agora sou Naeris'});
    assert.equal(posterior.dados.mensagem.autorNome,'teste (Naeris)');
    assert.deepEqual((await pedir(rota+'/chat',mestre.token)).dados.mensagens.map(m=>m.autorNome),[
      'teste','teste (Morgana)','teste (Naeris)',
    ]);
    await new Promise(resolve=>setTimeout(resolve,440));
    const particular=await pedir(rota+'/chat',convidado.token,'POST',{texto:'Mensagem particular',destinatarioId:visitante.id});
    assert.equal(particular.status,201);
    assert.equal(particular.dados.mensagem.destinatarioNome,'outra pessoa');
  }finally{await app.fechar();}
});
