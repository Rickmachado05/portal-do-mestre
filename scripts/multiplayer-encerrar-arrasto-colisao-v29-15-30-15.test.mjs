import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const aguardar=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ate(condicao,ms=1800){
  const inicio=Date.now();
  while(Date.now()-inicio<ms){if(condicao())return;await aguardar(15);}
  assert.fail('Evento de bloqueio não chegou ao convidado no prazo');
}
async function escutar(raiz,rota,token,controlador=false){
  const abortar=new AbortController(),eventos=[];
  const resposta=await fetch(`${raiz}${rota}/eventos?token=${token}${controlador?'&controlador=1':''}`,{signal:abortar.signal});
  assert.equal(resposta.status,200);
  const reader=resposta.body.getReader(),decoder=new TextDecoder();
  void (async()=>{
    let sobra='';
    try{
      while(true){
        const {done,value}=await reader.read();if(done)break;
        sobra+=decoder.decode(value,{stream:true});
        let fim;
        while((fim=sobra.indexOf('\n\n'))>=0){
          const bloco=sobra.slice(0,fim);sobra=sobra.slice(fim+2);
          if(bloco.startsWith('data: '))try{eventos.push(JSON.parse(bloco.slice(6)));}catch{}
        }
      }
    }catch{/* conexão SSE encerrada */}
  })();
  return {eventos,fechar:()=>abortar.abort()};
}

test('colisão é enviada apenas ao dono do token e bloqueia o MESMO arrasto até um novo clique',async()=>{
  const app=criarAplicacaoMultiplayer(),endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`,conexoes=[];
  async function req(caminho,token,corpo){
    const resposta=await fetch(`${raiz}${caminho}`,{method:corpo?'POST':'GET',
      headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(corpo?{'Content-Type':'application/json'}:{})},
      ...(corpo?{body:JSON.stringify(corpo)}:{})});
    return {status:resposta.status,dados:await resposta.json()};
  }
  try{
    const host=(await req('/salas',null,{campanhaId:'c1',campanha:'Hexatombe'})).dados;
    const rota=`/salas/${host.codigo}`;
    const origem=(await req(`${rota}/entrar`,null,{apelido:'Ana'})).dados;
    const outro=(await req(`${rota}/entrar`,null,{apelido:'Bia'})).dados;
    const cena={cenaId:'arena',cenaNome:'Arena',visibilidade:'total',revisao:1,tokens:[
      {id:'heroi',nome:'Herói',tipo:'jogador',x:20,y:20,cor:'#aa9933'},
      {id:'outro',nome:'Outro',tipo:'jogador',x:40,y:40,cor:'#bbbbbb'}]};
    assert.equal((await req(`${rota}/mesa`,host.token,cena)).status,200);
    conexoes.push(await escutar(raiz,rota,host.token,true));
    const autor=await escutar(raiz,rota,origem.token);conexoes.push(autor);
    const espectador=await escutar(raiz,rota,outro.token);conexoes.push(espectador);
    assert.equal((await req(`${rota}/atribuir`,host.token,{pessoaId:origem.id,personagemId:'heroi'})).status,200);
    assert.equal((await req(`${rota}/atribuir`,host.token,{pessoaId:outro.id,personagemId:'outro'})).status,200);
    const gestoId='gesto_colisao_123456789';
    assert.equal((await req(`${rota}/mover`,origem.token,{cenaId:'arena',x:21,y:21,gestoId,final:false})).status,202);
    await ate(()=>conexoes[0].eventos.some(e=>e.tipo==='pedido-movimento'&&e.gestoId===gestoId));
    const indevido=await req(`${rota}/bloqueio-arrasto`,origem.token,{cenaId:'arena',personagemId:'heroi',gestoId});
    assert.equal(indevido.status,403,'O convidado não deve forjar colisões');
    const bloqueio=await req(`${rota}/bloqueio-arrasto`,host.token,{cenaId:'arena',personagemId:'heroi',gestoId});
    assert.equal(bloqueio.status,200);
    await ate(()=>autor.eventos.some(e=>e.tipo==='arrasto-bloqueado'&&e.gestoId===gestoId));
    assert(!espectador.eventos.some(e=>e.tipo==='arrasto-bloqueado'),'Outros convidados não recebem bloqueio privado');
    const nPedidos=conexoes[0].eventos.filter(e=>e.tipo==='pedido-movimento').length;
    assert.equal((await req(`${rota}/mover`,origem.token,{cenaId:'arena',x:70,y:70,gestoId,final:true})).dados.bloqueado,true);
    await aguardar(50);
    assert.equal(conexoes[0].eventos.filter(e=>e.tipo==='pedido-movimento').length,nPedidos,'Sem encaminhar movimentos do gesto já bloqueado');
    const novoGesto='novo_gesto_123456789';
    assert.equal((await req(`${rota}/mover`,origem.token,{cenaId:'arena',x:22,y:22,gestoId:novoGesto,final:true})).status,202);
    await ate(()=>conexoes[0].eventos.some(e=>e.tipo==='pedido-movimento'&&e.gestoId===novoGesto));
  }finally{conexoes.forEach(c=>c.fechar());await app.fechar();}
});

test('parede interrompe o pointer capture no 2D e no 3D, e o mestre decide a colisão',()=>{
  const src=file=>readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
  const convidado=src('multiplayer/Convidado.tsx');
  const tresD=src('multiplayer/MesaConvidado3D.tsx');
  const mestre=src('App.tsx');
  const publicador=src('multiplayer/PublicadorMesa.tsx');
  assert.match(convidado,/function interromperGestoNaParede\(/);
  assert.match(convidado,/arrasto\.alvo\.releasePointerCapture\(arrasto\.pointerId\)/);
  assert.match(tresD,/cancelarGestoRef\.current=\(gestoId:string\)=>\{/);
  assert.match(tresD,/renderer\.domElement\.releasePointerCapture\(id\)/);
  assert.match(publicador,/gestosInterrompidosRef\.current\.set/);
  assert.match(mestre,/return \{aceito:false,estado:atual\}/);
  assert.match(mestre,/bloqueiaMovimentoCompartilhado3D/);
});
