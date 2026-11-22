import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
import {assinarArrasto,publicarArrasto} from '../src/multiplayer/arrastoRemoto.mjs';

const esperar=ms=>new Promise(r=>setTimeout(r,ms));
async function esperarAte(condicao,limite=1200){
  const comeco=Date.now();
  while(Date.now()-comeco<limite){if(condicao())return;await esperar(10);}
  assert.fail('Evento de prévia de arrasto não recebido no prazo');
}
async function ouvir(raiz,rota,token){
  const abortar=new AbortController(),eventos=[];
  const resposta=await fetch(`${raiz}${rota}/eventos?token=${token}`,{signal:abortar.signal});
  assert.equal(resposta.status,200);
  const reader=resposta.body.getReader(),decoder=new TextDecoder();
  void (async()=>{
    let pendente='';
    try{
      while(true){
        const {value,done}=await reader.read();if(done)break;
        pendente+=decoder.decode(value,{stream:true});
        let fim;
        while((fim=pendente.indexOf('\n\n'))>=0){
          const parte=pendente.slice(0,fim);pendente=pendente.slice(fim+2);
          if(parte.startsWith('data: '))try{eventos.push(JSON.parse(parte.slice(6)));}catch{}
        }
      }
    }catch{/* fechamento do teste */}
  })();
  return {eventos,fechar:()=>abortar.abort()};
}

test('arrasto direto chega a outro convidado antes da confirmação do mestre, sem alterar a cena oficial',async()=>{
  const app=criarAplicacaoMultiplayer(),endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const escutas=[];
  async function pedir(rota,token,corpo){
    const resposta=await fetch(`${raiz}${rota}`,{method:corpo?'POST':'GET',
      headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(corpo?{'Content-Type':'application/json'}:{})},
      ...(corpo?{body:JSON.stringify(corpo)}:{})});
    return {status:resposta.status,dados:await resposta.json()};
  }
  try{
    const sala=(await pedir('/salas',null,{campanhaId:'c1',campanha:'Jogo'})).dados;
    const rota=`/salas/${sala.codigo}`;
    const origem=(await pedir(`${rota}/entrar`,null,{apelido:'Origem'})).dados;
    const destino=(await pedir(`${rota}/entrar`,null,{apelido:'Destino'})).dados;
    await pedir(`${rota}/mesa`,sala.token,{cenaId:'arena',cenaNome:'Arena',visibilidade:'total',revisao:100,
      imagem:'data:image/png;base64,iVBORw0KGgo=',tokens:[
        {id:'heroi',nome:'Herói',tipo:'jogador',x:10,y:20,cor:'#ddd'},
        {id:'secreto',nome:'Oculto',tipo:'inimigo',x:50,y:50,cor:'#222'}]});
    const observador=await ouvir(raiz,rota,destino.token);escutas.push(observador);
    const emissor=await ouvir(raiz,rota,origem.token);escutas.push(emissor);
    const controlador=await fetch(`${raiz}${rota}/eventos?token=${sala.token}&controlador=1`);
    assert.equal(controlador.status,200);
    escutas.push({fechar:()=>controlador.body.cancel().catch(()=>{})});
    assert.equal((await pedir(`${rota}/atribuir`,sala.token,{pessoaId:origem.id,personagemId:'heroi'})).status,200);
    const primeira=await pedir(`${rota}/mover`,origem.token,{cenaId:'arena',x:20.4,y:33.3,final:false});
    assert.equal(primeira.status,202);
    await esperarAte(()=>observador.eventos.some(e=>e.tipo==='arrasto-token'));
    const previa=observador.eventos.find(e=>e.tipo==='arrasto-token');
    assert.deepEqual({id:previa.id,x:previa.x,y:previa.y,final:previa.final},
      {id:'heroi',x:20.4,y:33.3,final:false});
    assert(!emissor.eventos.some(e=>e.tipo==='arrasto-token'));
    const atual=(await pedir(`${rota}/mesa`,destino.token)).dados.mesa;
    assert.equal(atual.tokens.find(t=>t.id==='heroi').x,10,'prévia não deve substituir confirmação do mestre');
    await esperar(18);
    const fim=await pedir(`${rota}/mover`,origem.token,{cenaId:'arena',x:26,y:40,final:true});
    assert.equal(fim.status,202);
    await esperarAte(()=>observador.eventos.some(e=>e.tipo==='arrasto-token'&&e.final));
    const eventos=observador.eventos.filter(e=>e.tipo==='arrasto-token');
    assert.equal(eventos.at(-1).x,26);
    assert(eventos.at(-1).sequencia>eventos[0].sequencia);
    // Convidado não tem permissão para controlar ou publicar como outro token.
    assert.equal((await pedir(`${rota}/posicoes`,destino.token,{cenaId:'arena',revisao:200,
      posicoes:[{id:'heroi',x:80,y:80}]})).status,403);
    assert.equal((await pedir(`${rota}/mover`,destino.token,{cenaId:'arena',x:80,y:80,final:false})).status,403);
  }finally{escutas.forEach(c=>c.fechar());await app.fechar();}
});

test('prévia de arrasto não é publicada quando a cena não é totalmente visível',async()=>{
  const server=readFileSync(new URL('./multiplayer-server.mjs',import.meta.url),'utf8');
  assert.match(server,/if\(sala\.mesa\.visibilidade==='total'\)\{/);
  assert.match(server,/destino\.papel!=='convidado'\|\|destino\.id===pessoa\.id/);
  assert.match(server,/pessoa\.personagemId/);
});

test('eventos locais chegam apenas ao token e à cena assinados, descartando valores inválidos',()=>{
  const recebidos=[];
  const desassinar=assinarArrasto('sala','heroi',e=>recebidos.push(e));
  const base={tipo:'arrasto-token',cenaId:'sala',id:'heroi',x:20,y:31,final:false,sequencia:1};
  publicarArrasto(base);
  publicarArrasto({...base,cenaId:'outra'});
  publicarArrasto({...base,id:'outro'});
  publicarArrasto({...base,x:NaN});
  publicarArrasto({...base,x:140});
  assert.equal(recebidos.length,1);
  desassinar();publicarArrasto({...base,sequencia:2});
  assert.equal(recebidos.length,1);
});

test('renderização do arrasto remoto não usa transição CSS nem aguarda novo render do React',()=>{
  const componente=readFileSync(new URL('../src/multiplayer/TokenConvidadoFluido.tsx',import.meta.url),'utf8');
  const pagina=readFileSync(new URL('../src/multiplayer/Convidado.tsx',import.meta.url),'utf8');
  assert.match(componente,/assinarArrasto\(cenaId,token\.id/);
  assert.match(componente,/desenhar\(evento\.x,evento\.y\)/);
  assert.match(pagina,/if\(evento\.tipo==='arrasto-token'\)/);
  assert.match(pagina,/publicarArrasto\(evento\)/);
});
