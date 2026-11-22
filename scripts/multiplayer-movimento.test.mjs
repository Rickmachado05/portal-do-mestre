import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const cena = (visibilidade='total',travado=false) => ({
  cenaId:'cena-1',cenaNome:'Praça',visibilidade,tokens:[
    {id:'morgana',nome:'Morgana',tipo:'jogador',x:20,y:40,cor:'#397baa',travado},
    {id:'naeris',nome:'Naeris',tipo:'jogador',x:70,y:40,cor:'#bc8a33'},
    {id:'monstro',nome:'Espírito',tipo:'inimigo',x:50,y:50,cor:'#ee4455'},
  ],
});

test('só o convidado associado pode pedir movimento, e somente o mestre recebe o pedido',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const controladores=[];
  async function pedir(rota,config={}){
    const resposta=await fetch(raiz+rota,{...config,headers:{...(config.body?{'Content-Type':'application/json'}:{}),...config.headers}});
    return {status:resposta.status,dados:await resposta.json()};
  }
  const post=(rota,token,body)=>pedir(rota,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  try{
    const sala=await pedir('/salas',{method:'POST',body:JSON.stringify({campanhaId:'camp',campanha:'Hexatombe'})});
    assert.equal(sala.status,201);
    const {codigo,token:mestre}=sala.dados;
    const rota=`/salas/${codigo}`;
    const a=await pedir(`${rota}/entrar`,{method:'POST',body:JSON.stringify({apelido:'Morgana'})});
    const b=await pedir(`${rota}/entrar`,{method:'POST',body:JSON.stringify({apelido:'Naeris'})});
    assert.equal(a.status,201);assert.equal(b.status,201);
    const ana=a.dados,bia=b.dados;
    const aberto=async(token,controlador=false)=>{
      const c=new AbortController();controladores.push(c);
      const resposta=await fetch(`${raiz}${rota}/eventos?token=${token}${controlador?"&controlador=1":""}`,{signal:c.signal});
      assert.equal(resposta.status,200);
      return resposta.body.getReader();
    };
    const leitor=await aberto(mestre,true);
    await aberto(ana.token);
    await aberto(bia.token);
    let res=await post(`${rota}/mesa`,mestre,cena());assert.equal(res.status,200);
    res=await post(`${rota}/mover`,ana.token,{cenaId:'cena-1',x:44,y:55});
    assert.equal(res.status,403,'Convidado sem atribuição não pode se mover');
    res=await post(`${rota}/atribuir`,ana.token,{pessoaId:ana.id,personagemId:'morgana'});
    assert.equal(res.status,403,'Convidado não atribui nem altera sua própria identidade');
    res=await post(`${rota}/atribuir`,mestre,{pessoaId:ana.id,personagemId:'monstro'});
    assert.equal(res.status,409,'Inimigo não pode ser atribuído');
    res=await post(`${rota}/atribuir`,mestre,{pessoaId:ana.id,personagemId:'morgana'});
    assert.equal(res.status,200);assert.equal(res.dados.sala.participantes.find(p=>p.id===ana.id).personagemId,'morgana');
    res=await post(`${rota}/atribuir`,mestre,{pessoaId:bia.id,personagemId:'morgana'});
    assert.equal(res.status,409,'Outro convidado não pode assumir o mesmo personagem');
    res=await post(`${rota}/mover`,bia.token,{cenaId:'cena-1',x:44,y:55});assert.equal(res.status,403);
    res=await post(`${rota}/mover`,mestre,{cenaId:'cena-1',x:44,y:55});assert.equal(res.status,403);
    res=await post(`${rota}/mover`,ana.token,{cenaId:'outra-cena',x:44,y:55});assert.equal(res.status,400);
    res=await post(`${rota}/mover`,ana.token,{cenaId:'cena-1',x:1000,y:55});assert.equal(res.status,400);
    res=await post(`${rota}/mover`,ana.token,{cenaId:'cena-1',x:44,y:55,personagemId:'naeris',final:true});
    assert.equal(res.status,202,'O servidor aceita o movimento com a identidade autenticada, não a do corpo');
    const decodificador=new TextDecoder();let recebido='';
    for(let i=0;i<15;i++){
      const l=await Promise.race([leitor.read(),new Promise((_,rej)=>setTimeout(()=>rej(Error('SSE não chegou ao mestre')),1500))]);
      recebido+=decodificador.decode(l.value);
      if(recebido.includes('"tipo":"pedido-movimento"'))break;
    }
    assert.match(recebido,/"tipo":"pedido-movimento"/);
    assert.match(recebido,/"personagemId":"morgana"/);
    assert.doesNotMatch(recebido,/"personagemId":"naeris"/);
    // O pedido não move a cena por conta própria; o mestre precisa aplicá-lo e publicar.
    let quadro=await pedir(`${rota}/mesa`,{headers:{Authorization:`Bearer ${ana.token}`}});
    assert.equal(quadro.dados.mesa.tokens.find(t=>t.id==='morgana').x,20);
    res=await post(`${rota}/mesa`,mestre,{...cena(),tokens:cena().tokens.map(t=>t.id==='morgana'?{...t,x:44,y:55}:t)});
    assert.equal(res.status,200);
    quadro=await pedir(`${rota}/mesa`,{headers:{Authorization:`Bearer ${ana.token}`}});
    assert.equal(quadro.dados.mesa.tokens.find(t=>t.id==='morgana').x,44);
    res=await post(`${rota}/mesa`,mestre,cena('restrita'));
    assert.equal(res.status,200);
    res=await post(`${rota}/mover`,ana.token,{cenaId:'cena-1',x:30,y:31,final:true});assert.equal(res.status,409);
    res=await post(`${rota}/mesa`,mestre,cena('total',true));assert.equal(res.status,200);
    res=await post(`${rota}/mover`,ana.token,{cenaId:'cena-1',x:30,y:31,final:true});assert.equal(res.status,403);
    res=await post(`${rota}/atribuir`,mestre,{pessoaId:ana.id,personagemId:null});assert.equal(res.status,200);
    res=await post(`${rota}/mover`,ana.token,{cenaId:'cena-1',x:30,y:31,final:true});assert.equal(res.status,403);
  }finally{
    for(const c of controladores)c.abort();
    await app.fechar();
  }
});
