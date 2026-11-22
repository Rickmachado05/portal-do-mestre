import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

async function montar(){
  const app=criarAplicacaoMultiplayer();
  const {port}=await app.escutar(0);
  const raiz=`http://127.0.0.1:${port}/api/multiplayer/salas`;
  async function pedido(caminho,token,body){
    const resp=await fetch(raiz+caminho,{method:body?'POST':'GET',
      headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    return {status:resp.status,data:await resp.json()};
  }
  const sala=(await pedido('',null,{campanha:'Hexatombe',campanhaId:'c'})).data;
  const base=`/${sala.codigo}`;
  const ana=(await pedido(`${base}/entrar`,null,{apelido:'Ana'})).data;
  const bia=(await pedido(`${base}/entrar`,null,{apelido:'Bia'})).data;
  await pedido(base+'/mesa',sala.token,{cenaId:'arena',cenaNome:'Arena',visibilidade:'total',tokens:[
    {id:'ana',nome:'Ana',tipo:'jogador',x:20,y:30,cor:'#112233'},
    {id:'bia',nome:'Bia',tipo:'jogador',x:30,y:40,cor:'#445566'}
  ]});
  await pedido(base+'/fichas',sala.token,{personagens:['ana','bia'].map(id=>({id,nome:id,
    elemento:'ar',classe:'Lutador',hp:10,hpMax:10,mana:10,manaMax:10,ca:10,escudo:0,temFicha:true,acoes:[]}))});
  await pedido(base+'/atribuir',sala.token,{pessoaId:ana.id,personagemId:'ana'});
  await pedido(base+'/atribuir',sala.token,{pessoaId:bia.id,personagemId:'bia'});
  const streams=[];
  async function conectar(token){
    const controller=new AbortController();
    const resposta=await fetch(raiz+base+`/eventos?token=${encodeURIComponent(token)}`,{signal:controller.signal});
    assert.equal(resposta.status,200);
    const leitura=resposta.body.getReader();
    streams.push({controller,leitura});
    return leitura;
  }
  const fechar=async()=>{for(const s of streams)s.controller.abort();await app.fechar();};
  return {pedido,conectar,fechar,base,sala,ana,bia};
}
async function aguardarSinal(leitor,id,tipo,timeout=3000){
  const decoder=new TextDecoder();let texto='';
  const limite=Date.now()+timeout;
  while(Date.now()<limite){
    const restante=limite-Date.now();
    const proximo=await Promise.race([
      leitor.read(),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('Evento SSE não chegou.')),restante)),
    ]);
    if(proximo.done)throw Error('SSE encerrado antes da sinalização.');
    texto+=decoder.decode(proximo.value,{stream:true});
    const linhas=texto.split('\n');texto=linhas.pop()||'';
    for(const linha of linhas){
      if(!linha.startsWith('data: '))continue;
      const dado=JSON.parse(linha.slice(6));
      if(dado.tipo==='dados-ao-vivo'&&dado.acao==='sinal'&&dado.id===id&&dado.sinal?.tipo===tipo)return dado;
    }
  }
  throw Error('Sinal não chegou via SSE.');
}
const fakeSdp='v=0\no=- 0 0 IN IP4 127.0.0.1\ns=Dice Box\nt=0 0\n';
const oferta={tipo:'oferta',sdp:fakeSdp};
const resposta={tipo:'resposta',sdp:fakeSdp};
const gelo={tipo:'ice',candidato:{candidate:'candidate:0 1 UDP 2122252543 192.168.0.2 5000 typ host',sdpMid:'0',sdpMLineIndex:0}};

test('WebRTC público: uma preparação autorizada sinaliza para mestre e outros convidados, sem transportar mídia pelo servidor',async()=>{
  const s=await montar();try{
    const [leitorMestre,leitorAna,leitorBia]=await Promise.all([s.conectar(s.sala.token),s.conectar(s.ana.token),s.conectar(s.bia.token)]);
    const prep=await s.pedido(s.base+'/rolar',s.ana.token,{tipo:'preparar',comando:{tipo:'livre',formula:'2d8+3'},visibilidade:'publica'});
    assert.equal(prep.status,200);
    const id=prep.data.preparacao.id;
    const inicio=await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'iniciar',id});
    assert.equal(inicio.status,200);
    // A lista do host vem do endpoint /eu, não de nomes enviados pelo convidado.
    const mestre=(await s.pedido(s.base+'/eu',s.sala.token)).data.id;
    assert.deepEqual(new Set(inicio.data.destinatarios),new Set([mestre,s.bia.id]));
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'sinal',id,destinatarioId:s.bia.id,sinal:oferta})).status,200);
    const evento=await aguardarSinal(leitorBia,id,'oferta');
    assert.equal(evento.emissorId,s.ana.id);
    assert.equal(evento.remetenteId,s.ana.id);
    assert.equal(evento.sinal.sdp,fakeSdp);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.bia.token,{acao:'sinal',id,destinatarioId:s.ana.id,sinal:resposta})).status,200);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'sinal',id,destinatarioId:s.bia.id,sinal:gelo})).status,200);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.bia.token,{acao:'sinal',id,destinatarioId:s.ana.id,sinal:gelo})).status,200);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.bia.token,{acao:'sinal',id,destinatarioId:s.ana.id,sinal:oferta})).status,400);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.bia.token,{acao:'encerrar',id})).status,403);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'encerrar',id})).status,200);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'sinal',id,destinatarioId:s.bia.id,sinal:oferta})).status,404);
  }finally{await s.fechar();}
});

test('WebRTC privado: apenas mestre e lançador podem negociar, mesmo com visibilidade falsificada na segunda chamada',async()=>{
  const s=await montar();try{
    await Promise.all([s.conectar(s.sala.token),s.conectar(s.ana.token),s.conectar(s.bia.token)]);
    const id=(await s.pedido(s.base+'/rolar',s.ana.token,{tipo:'preparar',comando:{tipo:'livre',formula:'1d20'},visibilidade:'mestre'})).data.preparacao.id;
    const mestre=(await s.pedido(s.base+'/eu',s.sala.token)).data.id;
    const inicio=await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'iniciar',id,visibilidade:'publica'});
    assert.equal(inicio.status,200);
    assert.deepEqual(inicio.data.destinatarios,[mestre]);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'sinal',id,destinatarioId:s.bia.id,sinal:oferta})).status,403);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.bia.token,{acao:'sinal',id,destinatarioId:s.ana.id,sinal:resposta})).status,403);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'sinal',id,destinatarioId:mestre,sinal:oferta})).status,200);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.sala.token,{acao:'sinal',id,destinatarioId:s.ana.id,sinal:resposta})).status,200);
  }finally{await s.fechar();}
});

test('WebRTC do mestre: pode rolar sem NPC, respeita privacidade e convidados não podem iniciar uma rolagem inexistente',async()=>{
  const s=await montar();try{
    await Promise.all([s.conectar(s.sala.token),s.conectar(s.ana.token),s.conectar(s.bia.token)]);
    const publica=await s.pedido(s.base+'/dados-ao-vivo',s.sala.token,{acao:'iniciar',id:'roll-host-publica',visibilidade:'publica'});
    assert.equal(publica.status,200);
    assert.deepEqual(new Set(publica.data.destinatarios),new Set([s.ana.id,s.bia.id]));
    const privada=await s.pedido(s.base+'/dados-ao-vivo',s.sala.token,{acao:'iniciar',id:'roll-host-privada',visibilidade:'mestre'});
    assert.equal(privada.status,200);
    assert.deepEqual(privada.data.destinatarios,[]);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.bia.token,{acao:'sinal',id:'roll-host-privada',destinatarioId:s.ana.id,sinal:gelo})).status,403);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'iniciar',id:'sem-preparacao'})).status,403);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.ana.token,{acao:'iniciar',id:'roll-host-publica'})).status,403);
    assert.equal((await s.pedido(s.base+'/dados-ao-vivo',s.sala.token,{acao:'sinal',id:'roll-host-publica',destinatarioId:s.bia.id,sinal:oferta})).status,200);
  }finally{await s.fechar();}
});
