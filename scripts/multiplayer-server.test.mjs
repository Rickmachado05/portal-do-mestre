import test from 'node:test';
import assert from 'node:assert/strict';
import { criarAplicacaoMultiplayer } from './multiplayer-server.mjs';

test('mestre cria sala, dois convidados entram e a presença é sincronizada; permissões e encerramento', async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const url=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const streamMestre=new AbortController();
  const streamAna=new AbortController();
  const streamBia=new AbortController();
  async function pedir(rota,config={}){
    const resposta=await fetch(`${url}${rota}`,{...config,headers:{...config.headers,...(config.body?{'Content-Type':'application/json'}:{})}});
    return {status:resposta.status,dados:await resposta.json()};
  }
  try{
    let res=await pedir('/saude');assert.equal(res.status,200);
    res=await pedir('/salas',{method:'POST',body:JSON.stringify({campanhaId:'camp-123',campanha:'Hexatombe: Avatar'})});
    assert.equal(res.status,201);
    const {codigo,token:segredoMestre}=res.dados;
    assert.match(codigo,/^[A-Z2-9]{8}$/);
    assert.equal(res.dados.sala.campanha,'Hexatombe: Avatar');
    const hostStream=await fetch(`${url}/salas/${codigo}/eventos?token=${segredoMestre}`,{signal:streamMestre.signal});
    assert.equal(hostStream.status,200);
    assert.equal(hostStream.headers.get('content-type').startsWith('text/event-stream'),true);
    res=await pedir(`/salas/${codigo}/entrar`,{method:'POST',body:JSON.stringify({apelido:'Ana'})});
    assert.equal(res.status,201);const ana=res.dados;
    res=await pedir(`/salas/${codigo}/entrar`,{method:'POST',body:JSON.stringify({apelido:'Bia'})});
    assert.equal(res.status,201);const bia=res.dados;
    await fetch(`${url}/salas/${codigo}/eventos?token=${ana.token}`,{signal:streamAna.signal});
    await fetch(`${url}/salas/${codigo}/eventos?token=${bia.token}`,{signal:streamBia.signal});
    // O fluxo SSE deve realmente transmitir a presença dos dois convidados.
    const leitor=hostStream.body.getReader();
    let eventos='';
    for(let i=0;i<8;i++){
      const leitura=await Promise.race([leitor.read(),new Promise((_,falhar)=>setTimeout(()=>falhar(new Error('SSE sem evento de presença.')),1500))]);
      eventos+=new TextDecoder().decode(leitura.value);
      if(eventos.includes('\"apelido\":\"Bia\"')&&eventos.includes('\"tipo\":\"presenca\"'))break;
    }
    assert.match(eventos,/\"apelido\":\"Bia\"/);
    assert.match(eventos,/\"tipo\":\"presenca\"/);
    res=await pedir(`/salas/${codigo}/eu`,{headers:{Authorization:`Bearer ${segredoMestre}`}});
    assert.equal(res.status,200);
    const online=res.dados.sala.participantes.filter(p=>p.conectado);
    assert.equal(online.length,3);
    assert.deepEqual(online.map(p=>p.apelido),['Mestre','Ana','Bia']);
    res=await pedir(`/salas/${codigo}`);
    assert.equal(res.dados.quantidadeConvidados,2);
    assert.equal(res.dados.hostOnline,true);
    assert.equal(Object.hasOwn(res.dados,'campanhaId'),false);
    // Sair e voltar com a mesma credencial não cria um novo participante.
    streamMestre.abort();
    let offline=false;
    for(let t=0;t<20;t++){
      await new Promise(resolve=>setTimeout(resolve,15));
      const estado=await pedir(`/salas/${codigo}`);
      if(!estado.dados.hostOnline){offline=true;break;}
    }
    assert.equal(offline,true);
    const reconexao=await fetch(`${url}/salas/${codigo}/eventos?token=${segredoMestre}`);
    assert.equal(reconexao.status,200);
    const statusReconectado=await pedir(`/salas/${codigo}`);
    assert.equal(statusReconectado.dados.hostOnline,true);
    res=await pedir(`/salas/${codigo}/encerrar`,{method:'POST',headers:{Authorization:`Bearer ${ana.token}`}});
    assert.equal(res.status,403);
    res=await pedir(`/salas/${codigo}/eu`,{headers:{Authorization:'Bearer segredo-invalido'}});
    assert.equal(res.status,401);
    res=await pedir(`/salas/${codigo}/sair`,{method:'POST',headers:{Authorization:`Bearer ${ana.token}`}});
    assert.equal(res.status,200);
    res=await pedir(`/salas/${codigo}/eu`,{headers:{Authorization:`Bearer ${segredoMestre}`}});
    assert.equal(res.dados.sala.participantes.length,2);
    res=await pedir(`/salas/${codigo}/encerrar`,{method:'POST',headers:{Authorization:`Bearer ${segredoMestre}`}});
    assert.equal(res.status,200);
    res=await pedir(`/salas/${codigo}`);
    assert.equal(res.status,404);
  }finally{
    streamMestre.abort();streamAna.abort();streamBia.abort();
    await app.fechar();
  }
});
