import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const ficha=(x,y)=>({cenaId:'arena',cenaNome:'Arena',visibilidade:'total',revisao:100,
  imagem:'data:image/png;base64,iVBORw0KGgo=',
  tokens:[{id:'j1',nome:'Jogadora',tipo:'jogador',x,y,cor:'#336699'},
    {id:'npc',nome:'NPC revelado',tipo:'npc',publicado:true,x:60,y:60,cor:'#cc8833'}]});

test('deltas de posição são privados ao mestre e não revelam entidades ou imagem',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const controladores=[];
  const eventos=[];
  async function req(path,token,body){
    const res=await fetch(raiz+path,{method:body?'POST':'GET',
      headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    return {status:res.status,data:await res.json()};
  }
  try{
    const criada=await req('/salas',null,{campanhaId:'teste',campanha:'Arena'});
    assert.equal(criada.status,201);
    const {codigo,token:mestre}=criada.data,rota=`/salas/${codigo}`;
    const convidado=await req(`${rota}/entrar`,null,{apelido:'Tester'});
    assert.equal(convidado.status,201);
    const ctl=new AbortController();controladores.push(ctl);
    const conexao=await fetch(`${raiz}${rota}/eventos?token=${convidado.data.token}`,{signal:ctl.signal});
    assert.equal(conexao.status,200);
    const leitor=conexao.body.getReader(),decodificador=new TextDecoder();
    void (async()=>{
      let trecho='';
      try{
        while(true){
          const {value,done}=await leitor.read();if(done)break;
          trecho+=decodificador.decode(value,{stream:true});
          let posicao;
          while((posicao=trecho.indexOf('\n\n'))>=0){
            const bloco=trecho.slice(0,posicao);trecho=trecho.slice(posicao+2);
            if(bloco.startsWith('data: '))try{eventos.push(JSON.parse(bloco.slice(6)));}catch{}
          }
        }
      }catch{}
    })();
    let resultado=await req(`${rota}/mesa`,mestre,ficha(20,30));
    assert.equal(resultado.status,200);
    resultado=await req(`${rota}/posicoes`,convidado.data.token,
      {cenaId:'arena',revisao:101,posicoes:[{id:'j1',x:40,y:30}]});
    assert.equal(resultado.status,403);
    resultado=await req(`${rota}/posicoes`,mestre,
      {cenaId:'arena',revisao:101,posicoes:[{id:'j1',x:40,y:30},
        {id:'oculto',x:12,y:12},{id:'j1',x:-1,y:999}]});
    assert.equal(resultado.status,200);
    assert.equal(resultado.data.alterados,1);
    for(let i=0;i<60&&!eventos.some(e=>e.tipo==='posicoes-tokens');i++)
      await new Promise(resolve=>setTimeout(resolve,20));
    const delta=eventos.find(e=>e.tipo==='posicoes-tokens');
    assert(delta,'o movimento deve chegar aos convidados pelo fluxo permanente');
    assert.deepEqual(delta.posicoes,[{id:'j1',x:40,y:30}]);
    assert(!('imagem' in delta),'posições nunca retransmitem o bitmap da cena');
    let quadro=await req(`${rota}/mesa`,convidado.data.token);
    assert.equal(quadro.data.mesa.tokens.find(t=>t.id==='j1').x,40);
    assert.equal(quadro.data.mesa.revisao,101);
    assert(!quadro.data.mesa.tokens.some(t=>t.id==='oculto'));
    // Publicação completa atrasada não deve voltar à posição antiga.
    resultado=await req(`${rota}/mesa`,mestre,{...ficha(20,30),revisao:100});
    assert.equal(resultado.data.antiga,true);
    quadro=await req(`${rota}/mesa`,convidado.data.token);
    assert.equal(quadro.data.mesa.tokens.find(t=>t.id==='j1').x,40);
    resultado=await req(`${rota}/posicoes`,mestre,
      {cenaId:'arena',revisao:99,posicoes:[{id:'j1',x:90,y:90}]});
    assert.equal(resultado.data.antiga,true);
    // Se o mestre ativa a visão individual, a rota rápida deve ser bloqueada.
    resultado=await req(`${rota}/mesa`,mestre,{...ficha(40,30),revisao:102,
      visibilidade:'individual',vistas:[{personagemId:'j1',imagem:'data:image/png;base64,iVBORw0KGgo=',idsVisiveis:['j1']} ]});
    assert.equal(resultado.status,200);
    resultado=await req(`${rota}/posicoes`,mestre,
      {cenaId:'arena',revisao:103,posicoes:[{id:'j1',x:77,y:22}]});
    assert.equal(resultado.status,409);
    quadro=await req(`${rota}/mesa`,convidado.data.token);
    assert(!quadro.data.mesa.tokens.some(t=>t.id==='npc'));
  }finally{for(const ctl of controladores)ctl.abort();await app.fechar();}
});

test('cliente anima outros tokens e oculta mensagens de sucesso de desenho',()=>{
  const pasta=new URL('../src/multiplayer/',import.meta.url);
  const mesa=readFileSync(new URL('MesaConvidado2D.tsx',pasta),'utf8');
  const css=readFileSync(new URL('MesaConvidado2DParity.css',pasta),'utf8');
  const cliente=readFileSync(new URL('Convidado.tsx',pasta),'utf8');
  const publicador=readFileSync(new URL('PublicadorMesa.tsx',pasta),'utf8');
  const token=readFileSync(new URL('TokenConvidadoFluido.tsx',pasta),'utf8');
  assert.match(css,/\.pm-jogo \.pm-jogo-token\{transition:none/);
  assert.match(token,/requestAnimationFrame\(quadro\)/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(token,/pm-jogo-token-arrastando/);
  assert.doesNotMatch(mesa,/Aguardando a publicação do mestre/);
  assert.match(cliente,/tipo==='posicoes-tokens'/);
  assert.match(publicador,/\/posicoes/);
  assert.match(publicador,/assinaturaEstrutura/);
});
