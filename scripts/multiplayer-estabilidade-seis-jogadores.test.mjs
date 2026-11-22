import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const imagem='data:image/webp;base64,AAAA';

test('estabilidade pré-multiplayer: seis jogadores conectados, cenas e 24 atualizações',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const controladores=[];
  async function pedir(caminho,token,corpo){
    const resposta=await fetch(`${raiz}${caminho}`,{
      method:corpo?'POST':'GET',
      headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(corpo?{'Content-Type':'application/json'}:{})},
      ...(corpo?{body:JSON.stringify(corpo)}:{}),
    });
    const dados=await resposta.json();
    assert.ok(resposta.ok,`HTTP ${resposta.status}: ${JSON.stringify(dados)}`);
    return dados;
  }
  try{
    const sala=await pedir('/salas',null,{campanhaId:'seis-avatares',campanha:'Mesa seis jogadores'});
    const base=`/salas/${sala.codigo}`;
    const convidados=[];
    for(let i=0;i<6;i++){
      const jogador=await pedir(`${base}/entrar`,null,{apelido:`Jogador ${i+1}`});
      convidados.push(jogador);
    }
    const abrirStream=async token=>{
      const controlador=new AbortController();controladores.push(controlador);
      const resp=await fetch(`${raiz}${base}/eventos?token=${token}`,{signal:controlador.signal});
      assert.equal(resp.status,200);
      return resp;
    };
    await Promise.all([sala,...convidados].map(p=>abrirStream(p.token)));
    const status=await pedir(base);
    assert.equal(status.quantidadeConvidados,6);
    assert.equal(status.hostOnline,true);
    const grupo=convidados.map((j,i)=>({
      id:`avatar-${i+1}`,nome:`Avatar ${i+1}`,tipo:'jogador',cor:'#357bbd',imagem,
      enquadramento:{modo:i%2?'conter':'preencher',largura:120,altura:90,x:2,y:-3,zoom:1.1},
    }));
    const cena={cenaId:'arena',cenaNome:'Arena com seis jogadores',visibilidade:'total',aspecto:1.8,
      imagem:null,grupo,
      tokens:[...grupo.map((j,i)=>({id:j.id,nome:j.nome,tipo:'jogador',x:10+i*10,y:25+i*8,cor:j.cor})),
        {id:'inimigo-oculto',nome:'Chefe secreto',tipo:'inimigo',x:50,y:50,cor:'#ff0000'}],
    };
    await pedir(`${base}/mesa`,sala.token,cena);
    await Promise.all(convidados.map((j,i)=>pedir(`${base}/atribuir`,sala.token,{pessoaId:j.id,personagemId:`avatar-${i+1}`})));
    for(const j of convidados){
      const atual=(await pedir(`${base}/mesa`,j.token)).mesa;
      assert.equal(atual.tokens.length,6);
      assert.equal(atual.grupo.length,6);
      assert.equal(atual.tokens.some(t=>t.id==='inimigo-oculto'),false);
      assert.equal(atual.grupo[0].enquadramento.largura,120);
      assert.equal(atual.grupo[1].enquadramento.modo,'conter');
    }
    // Simula atualizações periódicas do mestre com seis convidados simultâneos.
    for(let tick=1;tick<=24;tick++){
      cena.tokens[0].x=10+tick*.5;
      await pedir(`${base}/mesa`,sala.token,cena);
    }
    const finais=await Promise.all(convidados.map(j=>pedir(`${base}/mesa`,j.token)));
    for(const resposta of finais)assert.equal(resposta.mesa.tokens[0].x,22);
    // A neblina não revela posições dos outros jogadores, mesmo após atualizações.
    cena.visibilidade='restrita';
    await pedir(`${base}/mesa`,sala.token,cena);
    const vistos=await Promise.all(convidados.map(j=>pedir(`${base}/mesa`,j.token)));
    for(let i=0;i<6;i++){
      assert.deepEqual(vistos[i].mesa.tokens.map(t=>t.id),[`avatar-${i+1}`]);
      assert.equal(vistos[i].mesa.grupo.length,6);
      assert.equal(vistos[i].mesa.imagem,null);
    }
  }finally{
    for(const controlador of controladores)controlador.abort();
    await app.fechar();
  }
});
