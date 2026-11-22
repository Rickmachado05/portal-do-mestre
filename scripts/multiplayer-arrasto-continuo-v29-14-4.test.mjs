import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const esperar=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const mapa=(x,y,revisao=100)=>({cenaId:'arena',cenaNome:'Arena',visibilidade:'total',revisao,
  imagem:'data:image/png;base64,iVBORw0KGgo=',
  tokens:[{id:'p1',nome:'Personagem',tipo:'jogador',x,y,cor:'#5566aa'}]});

async function ouvir(raiz,rota,token,controle=false){
  const abortar=new AbortController();
  const eventos=[];
  const resposta=await fetch(`${raiz}${rota}/eventos?token=${token}${controle?'&controlador=1':''}`,
    {signal:abortar.signal});
  assert.equal(resposta.status,200);
  const leitor=resposta.body.getReader(),decodificador=new TextDecoder();
  void (async()=>{
    let pendente='';
    try{
      while(true){
        const {value,done}=await leitor.read();if(done)break;
        pendente+=decodificador.decode(value,{stream:true});
        let fim;
        while((fim=pendente.indexOf('\n\n'))>=0){
          const trecho=pendente.slice(0,fim);pendente=pendente.slice(fim+2);
          if(trecho.startsWith('data: '))try{eventos.push(JSON.parse(trecho.slice(6)));}catch{}
        }
      }
    }catch{/* encerramento do teste */}
  })();
  return {eventos,fechar:()=>abortar.abort()};
}
async function ate(condicao,limite=1000){
  for(let t=0;t<limite;t+=10){if(condicao())return;await esperar(10);}
  assert.fail('Não recebeu evento de movimento durante o arrasto');
}

test('arrasto real é transmitido ponto a ponto, sem aguardar soltar o mouse',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const conexoes=[];
  async function pedir(rota,token,corpo){
    const resposta=await fetch(`${raiz}${rota}`,{method:corpo?'POST':'GET',
      headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(corpo?{'Content-Type':'application/json'}:{})},
      ...(corpo?{body:JSON.stringify(corpo)}:{})});
    return {status:resposta.status,dados:await resposta.json()};
  }
  try{
    const sala=(await pedir('/salas',null,{campanhaId:'c1',campanha:'Arena'})).dados;
    const rota=`/salas/${sala.codigo}`;
    const jogador1=(await pedir(`${rota}/entrar`,null,{apelido:'Ana'})).dados;
    const jogador2=(await pedir(`${rota}/entrar`,null,{apelido:'Beto'})).dados;
    await pedir(`${rota}/mesa`,sala.token,mapa(10,20));
    const controle=await ouvir(raiz,rota,sala.token,true);conexoes.push(controle);
    const outro=await ouvir(raiz,rota,jogador2.token);conexoes.push(outro);
    const um=await ouvir(raiz,rota,jogador1.token);conexoes.push(um);
    await pedir(`${rota}/atribuir`,sala.token,{pessoaId:jogador1.id,personagemId:'p1'});

    // O primeiro ponto sai com final=false, antes de terminar o arrasto.
    let resposta=await pedir(`${rota}/mover`,jogador1.token,{cenaId:'arena',x:20,y:25,final:false});
    assert.equal(resposta.status,202);
    await ate(()=>controle.eventos.some(e=>e.tipo==='pedido-movimento'&&e.x===20));
    resposta=await pedir(`${rota}/posicoes`,sala.token,{cenaId:'arena',revisao:101,posicoes:[{id:'p1',x:20,y:25}]});
    assert.equal(resposta.status,200);
    await ate(()=>outro.eventos.some(e=>e.tipo==='posicoes-tokens'&&e.posicoes.some(p=>p.x===20)));

    // Em outro ponto intermediário, ainda antes de qualquer evento final.
    await esperar(35);
    resposta=await pedir(`${rota}/mover`,jogador1.token,{cenaId:'arena',x:38,y:30,final:false});
    assert.equal(resposta.status,202);
    await ate(()=>controle.eventos.some(e=>e.tipo==='pedido-movimento'&&e.x===38));
    resposta=await pedir(`${rota}/posicoes`,sala.token,{cenaId:'arena',revisao:102,posicoes:[{id:'p1',x:38,y:30}]});
    assert.equal(resposta.status,200);
    await ate(()=>outro.eventos.some(e=>e.tipo==='posicoes-tokens'&&e.posicoes.some(p=>p.x===38)));
    const pontos=outro.eventos.filter(e=>e.tipo==='posicoes-tokens').flatMap(e=>e.posicoes.map(p=>p.x));
    assert.deepEqual(pontos,[20,38]);
    // Um participante sem permissão não pode publicar deltas de todos os tokens.
    assert.equal((await pedir(`${rota}/posicoes`,jogador2.token,
      {cenaId:'arena',revisao:103,posicoes:[{id:'p1',x:78,y:30}]})).status,403);
  }finally{conexoes.forEach(c=>c.fechar());await app.fechar();}
});

test('os clientes enviam durante pointermove com fila compactada, sem debounce por inatividade',()=>{
  const caminho=new URL('../src/multiplayer/',import.meta.url);
  const publicar=readFileSync(new URL('PublicadorMesa.tsx',caminho),'utf8');
  const convidado=readFileSync(new URL('Convidado.tsx',caminho),'utf8');
  const css=readFileSync(new URL('MesaConvidado2DParity.css',caminho),'utf8');
  assert.match(publicar,/setInterval\(\(\)=>\{void transmitir\(\);\},16\)/);
  assert.match(publicar,/if\(!ativo\|\|emVoo/);
  assert.match(convidado,/movimentoMaisRecente\.current=\{cenaId:mesa\.cenaId,x,y,final,/);
  assert.match(convidado,/enviarMovimento\(p\.x,p\.y\);/);
  assert.match(convidado,/enviarMovimento\(p\.x,p\.y,true\);/);
  const token=readFileSync(new URL('TokenConvidadoFluido.tsx',caminho),'utf8');
  assert.match(css,/\.pm-jogo \.pm-jogo-token\{transition:none/);
  assert.match(token,/requestAnimationFrame\(quadro\)/);
});
