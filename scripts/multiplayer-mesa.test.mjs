import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

test('quadro de tokens só é publicado pelo mestre, filtrado e recebido por convidados posteriores', async()=>{
  const app=criarAplicacaoMultiplayer();
  const end=await app.escutar(0);
  const raiz=`http://127.0.0.1:${end.port}/api/multiplayer`;
  const controller=new AbortController();
  async function pedir(rota,opcoes={}){
    const res=await fetch(`${raiz}${rota}`,{...opcoes,headers:{...(opcoes.body?{'Content-Type':'application/json'}:{}),...opcoes.headers}});
    return {status:res.status,dados:await res.json()};
  }
  try {
    const criar=await pedir('/salas',{method:'POST',body:JSON.stringify({campanhaId:'camp-demo',campanha:'Hexatombe'})});
    assert.equal(criar.status,201);
    const {codigo,token:mestre}=criar.dados;
    const entrar=await pedir(`/salas/${codigo}/entrar`,{method:'POST',body:JSON.stringify({apelido:'Convidado'})});
    const token=entrar.dados.token;
    const rota=`/salas/${codigo}/mesa`;
    let resp=await pedir(rota);assert.equal(resp.status,401);
    resp=await pedir(rota,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({cenaId:'a'})});assert.equal(resp.status,403);
    const sala={cenaId:'scene-1',cenaNome:'Arena',visibilidade:'restrita',imagem:'data:image/png;base64,AAAA',
      diario:'segredo', tokens:[
        {id:'j1',nome:'Naeris',tipo:'jogador',x:10,y:20,cor:'#aabbcc'},
        {id:'j2',nome:'Morgana',tipo:'jogador',x:35,y:60,cor:'#aabbcc',oculto:true},
        {id:'npc',nome:'Vilão',tipo:'inimigo',x:20,y:30,cor:'#fffddd'},
        {id:'j3',nome:'May',tipo:'jogador',x:300,y:-1,cor:'#fffddd'},
      ]};
    resp=await pedir(rota,{method:'POST',headers:{Authorization:`Bearer ${mestre}`},body:JSON.stringify(sala)});
    assert.equal(resp.status,200);
    resp=await pedir(rota,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(resp.status,200);
    assert.deepEqual(resp.dados.mesa.tokens.map(t=>t.nome),[],'Convidado sem personagem não recebe posições em uma cena restrita');
    assert.equal(resp.dados.mesa.imagem,null);
    resp=await pedir(`/salas/${codigo}/atribuir`,{method:'POST',headers:{Authorization:`Bearer ${mestre}`},body:JSON.stringify({pessoaId:entrar.dados.id,personagemId:'j1'})});
    assert.equal(resp.status,200);
    resp=await pedir(rota,{headers:{Authorization:`Bearer ${token}`}});
    assert.deepEqual(resp.dados.mesa.tokens.map(t=>t.nome),['Naeris']);
    assert.equal(Object.hasOwn(resp.dados.mesa,'diario'),false);
    const conexao=await fetch(`${raiz}/salas/${codigo}/eventos?token=${token}`,{signal:controller.signal});
    assert.equal(conexao.status,200);
    const leitor=conexao.body.getReader();const decodificador=new TextDecoder();
    let eventos='';
    for(let i=0;i<8;i++){
      const leitura=await Promise.race([leitor.read(),new Promise((_,rejeitar)=>setTimeout(()=>rejeitar(Error('Convidado não recebeu snapshot inicial.')),1500))]);
      eventos+=decodificador.decode(leitura.value);
      if(eventos.includes('"tipo":"mesa"'))break;
    }
    assert.match(eventos,/"tipo":"mesa"/);
    assert.match(eventos,/"nome":"Naeris"/);
    assert.doesNotMatch(eventos,/"nome":"Morgana"|"nome":"Vilão"/);
    const proximo={cenaId:'scene-1',cenaNome:'Arena',visibilidade:'total',tokens:[{id:'j1',nome:'Naeris',tipo:'jogador',x:55,y:77,cor:'#aabbcc'}]};
    resp=await pedir(rota,{method:'POST',headers:{Authorization:`Bearer ${mestre}`},body:JSON.stringify(proximo)});
    assert.equal(resp.status,200);
    resp=await pedir(rota,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(resp.dados.mesa.tokens[0].x,55);
    assert.equal(resp.dados.mesa.tokens[0].y,77);
    assert.equal(resp.dados.mesa.visibilidade,'total');
  } finally {controller.abort();await app.fechar();}
});
