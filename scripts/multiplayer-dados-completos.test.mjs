import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const leitura=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('o editor do mestre é reutilizado pela Mesa do Jogador e o Ateliê retorna à mesma sala',()=>{
  const mesa=leitura('src/multiplayer/MesaConvidado2D.tsx');
  const editor=leitura('src/EditorDados.tsx');
  const atelie=leitura('public/atelie-de-dados.html');
  assert.match(mesa,/<EditorDados origem="convidado" codigoSala=\{credencial.codigo\}/);
  assert.match(mesa,/Rolagem3DMultiplayer/);
  assert.match(editor,/origem==='convidado'/);
  assert.match(atelie,/'convidado'|"convidado"/);
  assert.match(atelie,/destino.searchParams.set\("sala", sala\)/);
  assert.match(mesa,/Só mestre/);
  assert.match(mesa,/Pública/);
});
test('rolagem privada é vista apenas por mestre e autor; rolagem pública alcança todos',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer/salas`;
  async function req(url,token,body){
    const res=await fetch(url,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:res.status,data:await res.json()};
  }
  try{
    const sala=(await req(raiz,'',{campanha:'Dados',campanhaId:'dados-local'})).data;
    const base=`${raiz}/${sala.codigo}`;
    const ana=(await req(`${base}/entrar`,'',{apelido:'Ana'})).data;
    const bia=(await req(`${base}/entrar`,'',{apelido:'Bia'})).data;
    const cena={cenaId:'cena',cenaNome:'Arena',visibilidade:'total',tokens:[
      {id:'ana',nome:'Ana',tipo:'jogador',x:5,y:8,cor:'#aabbcc'},
      {id:'bia',nome:'Bia',tipo:'jogador',x:17,y:19,cor:'#aabbcc'}]};
    assert.equal((await req(`${base}/mesa`,sala.token,cena)).status,200);
    const ficha=id=>({id,nome:id,elemento:'ar',classe:'Lutador',hp:100,hpMax:100,mana:10,manaMax:10,ca:10,escudo:0,temFicha:true,acoes:[]});
    assert.equal((await req(`${base}/fichas`,sala.token,{personagens:[ficha('ana'),ficha('bia')]})).status,200);
    assert.equal((await req(`${base}/atribuir`,sala.token,{pessoaId:ana.id,personagemId:'ana'})).status,200);
    assert.equal((await req(`${base}/atribuir`,sala.token,{pessoaId:bia.id,personagemId:'bia'})).status,200);
    // O SSE do terceiro participante também NÃO pode receber rolagens privadas.
    const controleEventos=new AbortController();
    const stream=await fetch(`${base}/eventos?token=${bia.token}`,{signal:controleEventos.signal});
    assert.equal(stream.status,200);
    const leitor=stream.body.getReader();
    let eventosTerceiro='';
    const captura=(async()=>{
      try{while(true){const pacote=await leitor.read();if(pacote.done)break;
        eventosTerceiro+=new TextDecoder().decode(pacote.value);
      }}catch{/* stream encerrado ao concluir teste */}
    })();
    const privado=await req(`${base}/rolar`,ana.token,{tipo:'livre',formula:'2d8+3',visibilidade:'mestre'});
    assert.equal(privado.status,201);
    assert.equal(privado.data.rolagem.visibilidade,'mestre');
    assert.equal((await req(`${base}/rolagens`,sala.token)).data.rolagens.length,1);
    assert.equal((await req(`${base}/rolagens`,ana.token)).data.rolagens.length,1);
    assert.equal((await req(`${base}/rolagens`,bia.token)).data.rolagens.length,0);
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(eventosTerceiro.includes(privado.data.rolagem.id),false,'SSE não deve entregar rolagem privada a terceiros');
    await new Promise(resolve=>setTimeout(resolve,370));
    const publico=await req(`${base}/rolar`,ana.token,{tipo:'livre',formula:'1d20',visibilidade:'publica'});
    assert.equal(publico.status,201);
    assert.equal(publico.data.rolagem.visibilidade,'publica');
    assert.equal((await req(`${base}/rolagens`,bia.token)).data.rolagens.length,1);
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.ok(eventosTerceiro.includes(publico.data.rolagem.id),'SSE entrega rolagem pública aos demais');
    controleEventos.abort();await captura;
    const mestre=(await req(`${base}/rolagens`,sala.token)).data.rolagens;
    assert.equal(mestre.length,2);
    assert.equal(mestre[0].total,mestre[0].dados.reduce((a,b)=>a+b,3));
    assert.equal(mestre[1].total,mestre[1].dados[0]);
  }finally{await app.fechar();}
});
