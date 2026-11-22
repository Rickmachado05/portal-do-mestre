import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

test('chat geral é compartilhado por SSE; particulares não vazam entre convidados e remetente é autenticado',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const abortarMestre=new AbortController();
  const abortarBia=new AbortController();
  const abortarAna=new AbortController();
  const pedir=async(caminho,token,method='GET',corpo)=>{
    const r=await fetch(raiz+caminho,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(corpo?{'Content-Type':'application/json'}:{})},body:corpo?JSON.stringify(corpo):undefined});
    return {status:r.status,dados:await r.json()};
  };
  try{
    const mestre=(await pedir('/salas',null,'POST',{campanha:'Teste',campanhaId:'camp-chat'})).dados;
    const rota=`/salas/${mestre.codigo}`;
    const ana=(await pedir(rota+'/entrar',null,'POST',{apelido:'Ana'})).dados;
    const bia=(await pedir(rota+'/entrar',null,'POST',{apelido:'Bia'})).dados;
    const sem=(await pedir(rota+'/chat',null)).status;
    assert.equal(sem,401);
    const streamMestre=await fetch(raiz+rota+`/eventos?token=${mestre.token}`,{signal:abortarMestre.signal});
    const streamBia=await fetch(raiz+rota+`/eventos?token=${bia.token}`,{signal:abortarBia.signal});
    const streamAna=await fetch(raiz+rota+`/eventos?token=${ana.token}`,{signal:abortarAna.signal});
    assert.equal(streamMestre.status,200);
    assert.equal(streamBia.status,200);
    assert.equal(streamAna.status,200);
    const leituraBia=streamBia.body.getReader();
    const leituraAna=streamAna.body.getReader();

    // Remetente, data, identidade e destinatário só são determinados pelo servidor.
    let r=await pedir(rota+'/chat',ana.token,'POST',{texto:'Olá, sala!',autorId:mestre.id,autorNome:'Mestre',id:'forjado'});
    assert.equal(r.status,201);
    assert.equal(r.dados.mensagem.autorId,ana.id);
    assert.equal(r.dados.mensagem.autorNome,'Ana');
    assert.notEqual(r.dados.mensagem.id,'forjado');
    const geral=await pedir(rota+'/chat',bia.token);
    assert.equal(geral.dados.mensagens.length,1);
    assert.equal(geral.dados.mensagens[0].texto,'Olá, sala!');

    r=await pedir(rota+'/chat',bia.token,'POST',{texto:'segredo de Bia para mestre',destinatarioId:mestre.sala.participantes[0].id});
    assert.equal(r.status,201);
    const conversaMestre=(await pedir(rota+'/chat',mestre.token)).dados.mensagens;
    const conversaBia=(await pedir(rota+'/chat',bia.token)).dados.mensagens;
    const conversaAna=(await pedir(rota+'/chat',ana.token)).dados.mensagens;
    assert.equal(conversaMestre.length,2);
    assert.equal(conversaBia.length,2);
    assert.equal(conversaAna.length,1);
    assert.equal(conversaAna[0].texto,'Olá, sala!');

    const presente=await Promise.race([(async()=>{
      let saida='';
      for(let i=0;i<20;i++){
        const pedaco=await leituraBia.read();
        if(pedaco.done)break;
        saida+=new TextDecoder().decode(pedaco.value);
        if(saida.includes('segredo de Bia para mestre'))break;
      }
      return saida;
    })(),new Promise((_,rejeitar)=>setTimeout(()=>rejeitar(new Error('SSE não entregou particular à Bia.')),2500))]);
    assert.match(presente,/segredo de Bia para mestre/);
    // Ana recebe presença e mensagem geral, mas nunca o conteúdo particular de Bia/Mestre.
    await new Promise(resolve=>setTimeout(resolve,460));
    let rAna=await pedir(rota+'/chat',ana.token,'POST',{texto:'Confirmação geral'});
    assert.equal(rAna.status,201);
    const eventosAna=await Promise.race([(async()=>{
      let saida='';
      for(let i=0;i<20;i++){
        const pedaco=await leituraAna.read();
        if(pedaco.done)break;
        saida+=new TextDecoder().decode(pedaco.value);
        if(saida.includes('Confirmação geral'))break;
      }
      return saida;
    })(),new Promise((_,rejeitar)=>setTimeout(()=>rejeitar(new Error('SSE não entregou geral à Ana.')),2500))]);
    assert.match(eventosAna,/Confirmação geral/);
    assert.doesNotMatch(eventosAna,/segredo de Bia para mestre/);
    assert.equal((await pedir(rota+'/chat',ana.token)).dados.mensagens.length,2);

    const invalido=await pedir(rota+'/chat',mestre.token,'POST',{texto:'oi',destinatarioId:'outro'});
    assert.equal(invalido.status,400);
    const grande=await pedir(rota+'/chat',mestre.token,'POST',{texto:'x'.repeat(1201)});
    assert.equal(grande.status,400);
    assert.equal((await pedir(rota+'/chat','credencial-falsa')).status,401);
    const auto=(await pedir(rota+'/chat',mestre.token,'POST',{texto:'oi',destinatarioId:mestre.sala.participantes[0].id}));
    assert.equal(auto.status,400);
  }finally{
    abortarMestre.abort();abortarBia.abort();abortarAna.abort();
    await app.fechar();
  }
});
