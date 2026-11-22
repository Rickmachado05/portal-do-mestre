import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const ficha=(id,nome)=>({id,nome,elemento:'Água',classe:'Conjurador',hp:80,hpMax:100,mana:40,manaMax:80,ca:15,escudo:0,temFicha:true,acoes:[]});
const item=(id,nome,quantidade,categoria='consumivel')=>({id,nome,quantidade,categoria,efeito:categoria==='documento'?'nenhum':'cura',
  valor:categoria==='documento'?'':'1d8',descricao:`Descrição privada ${nome}`,consumivel:categoria!=='documento',
  ...(categoria==='documento'?{conteudo:`Segredo da carta ${nome}`}:{})});
const cena={cenaId:'cena-1',cenaNome:'Arena',visibilidade:'total',tokens:[
  {id:'morgana',nome:'Morgana',tipo:'jogador',x:20,y:30,cor:'#aabbcc'},
  {id:'naeris',nome:'Naeris',tipo:'jogador',x:50,y:60,cor:'#aaddcc'},
]};
test('inventário privado, pedido de uso/transferência e confirmação pelo mestre sem vazamentos',async()=>{
  const app=criarAplicacaoMultiplayer();
  const porta=(await app.escutar(0)).port;
  const api=`http://127.0.0.1:${porta}/api/multiplayer`;
  const abortar=[];
  async function chamada(rota,metodo='GET',token='',body){
    const res=await fetch(api+rota,{method:metodo,headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:res.status,body:await res.json()};
  }
  const post=(rota,token,body)=>chamada(rota,'POST',token,body);
  const get=(rota,token)=>chamada(rota,'GET',token);
  async function conectar(rota,token,controlador=false){
    const cancel=new AbortController();abortar.push(cancel);
    const res=await fetch(api+rota+`/eventos?token=${token}${controlador?'&controlador=1':''}`,{signal:cancel.signal});
    assert.equal(res.status,200);return res.body.getReader();
  }
  async function receber(reader,teste){
    let texto='';
    for(let i=0;i<25;i++){
      const parte=await Promise.race([reader.read(),new Promise((_,reject)=>setTimeout(()=>reject(Error('SSE ausente')),2000))]);
      texto+=new TextDecoder().decode(parte.value);
      const eventos=texto.split('\n\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)));
      const encontrado=eventos.find(teste);
      if(encontrado)return encontrado;
    }
    throw new Error('Evento esperado não chegou.');
  }
  try{
    const criacao=await post('/salas','',{campanha:'Hexatombe',campanhaId:'demo'});
    const {codigo,token:mestre}=criacao.body;
    const base=`/salas/${codigo}`;
    const ana=(await post(base+'/entrar','',{apelido:'Ana'})).body;
    const bia=(await post(base+'/entrar','',{apelido:'Bia'})).body;
    const mestreSse=await conectar(base,mestre,true);
    const anaSse=await conectar(base,ana.token);
    const biaSse=await conectar(base,bia.token);
    assert.equal((await get(base+'/inventario',ana.token)).body.inventario,null);
    assert.equal((await get(base+'/inventario',mestre)).status,403);
    assert.equal((await get(base+'/inventario','')).status,401);
    assert.equal((await post(base+'/inventarios',ana.token,{personagens:[]})).status,403);
    assert.equal((await post(base+'/mesa',mestre,cena)).status,200);
    assert.equal((await post(base+'/fichas',mestre,{personagens:[ficha('morgana','Morgana'),ficha('naeris','Naeris')]})).status,200);
    const publicar=(morgana,naeris)=>post(base+'/inventarios',mestre,{personagens:[
      {id:'morgana',nome:'Morgana',itens:morgana},
      {id:'naeris',nome:'Naeris',itens:naeris},
    ]});
    assert.equal((await publicar([item('pocao','Poção M',3),item('carta','Carta M',1,'documento')],[item('espada','Espada N',1,'arma')])).status,200);
    assert.equal((await post(base+'/atribuir',mestre,{pessoaId:ana.id,personagemId:'morgana'})).status,200);
    assert.equal((await post(base+'/atribuir',mestre,{pessoaId:bia.id,personagemId:'naeris'})).status,200);
    const privAna=(await get(base+'/inventario?personagemId=naeris',ana.token)).body.inventario;
    assert.equal(privAna.nome,'Morgana');assert.equal(privAna.itens.length,2);
    assert.equal(privAna.destinatarios[0].nome,'Naeris');
    assert.doesNotMatch(JSON.stringify(privAna),/Espada N/);
    const privBia=(await get(base+'/inventario',bia.token)).body.inventario;
    assert.equal(privBia.itens[0].nome,'Espada N');
    assert.doesNotMatch(JSON.stringify(privBia),/Carta M|Poção M/);
    assert.equal((await post(base+'/item',bia.token,{tipo:'usar',itemId:'pocao'})).status,409);
    assert.equal((await post(base+'/item',ana.token,{tipo:'usar',itemId:'carta'})).status,400);
    assert.equal((await get(base+'/pedidos-itens',ana.token)).status,403);
    assert.equal((await get(base+'/pedidos-itens',mestre)).status,200);
    assert.equal((await post(base+'/item',ana.token,{tipo:'transferir',itemId:'pocao',destinatarioId:'morgana',quantidade:1})).status,400);
    assert.equal((await post(base+'/item',ana.token,{tipo:'transferir',itemId:'pocao',destinatarioId:'naeris',quantidade:4})).status,400);
    assert.equal((await post(base+'/item',ana.token,{tipo:'transferir',itemId:'pocao',destinatarioId:'naeris',quantidade:0})).status,400);
    const req=await post(base+'/item',ana.token,{tipo:'transferir',itemId:'pocao',destinatarioId:'naeris',quantidade:2,resultado:9999});
    assert.equal(req.status,202);
    const pedido=await receber(mestreSse,e=>e.tipo==='pedido-item'&&e.pedidoId===req.body.pedidoId);
    assert.equal(pedido.operacao,'transferir');assert.equal(pedido.personagemId,'morgana');assert.equal(pedido.destinatarioId,'naeris');
    assert.equal(pedido.quantidade,2);
    assert.equal((await post(base+'/item',ana.token,{tipo:'usar',itemId:'pocao'})).status,409);
    assert.equal((await post(base+'/resultado-item',bia.token,{pedidoId:pedido.pedidoId,ok:true,mensagem:'forjar'})).status,403);
    assert.equal((await post(base+'/resultado-item',mestre,{pedidoId:pedido.pedidoId,ok:true,mensagem:'Pular aprovação'})).status,409);
    const pendencias=(await get(base+'/pedidos-itens',mestre)).body.pedidos;
    assert.equal(pendencias.length,1);
    assert.equal(pendencias[0].itemNome,'Poção M');
    assert.equal(pendencias[0].solicitante,'Ana');
    assert.equal(pendencias[0].destinoNome,'Naeris');
    assert.equal((await post(base+'/validar-item',bia.token,{pedidoId:pedido.pedidoId})).status,403);
    assert.equal((await post(base+'/validar-item',mestre,{pedidoId:pedido.pedidoId})).status,200);
    assert.equal((await post(base+'/validar-item',mestre,{pedidoId:pedido.pedidoId})).status,409);
    assert.equal((await post(base+'/resultado-item',mestre,{pedidoId:pedido.pedidoId,ok:true,mensagem:'Entregue!'})).status,200);
    assert.equal((await post(base+'/resultado-item',mestre,{pedidoId:pedido.pedidoId,ok:true,mensagem:'Repetido'})).status,404);
    const resultado=await receber(anaSse,e=>e.tipo==='resultado-item'&&e.resultado.pedidoId===pedido.pedidoId);
    assert.equal(resultado.resultado.mensagem,'Entregue!');
    assert.equal((await publicar([item('pocao','Poção M',1),item('carta','Carta M',1,'documento')],
      [item('espada','Espada N',1,'arma'),item('pocao-recebida','Poção M',2)])).status,200);
    assert.equal((await get(base+'/inventario',ana.token)).body.inventario.itens[0].quantidade,1);
    assert.equal((await get(base+'/inventario',bia.token)).body.inventario.itens[1].quantidade,2);
    const privadoAnaSse=await receber(anaSse,e=>e.tipo==='inventario'&&e.inventario?.id==='morgana');
    assert.doesNotMatch(JSON.stringify(privadoAnaSse),/Espada N/);
    const privadoBiaSse=await receber(biaSse,e=>e.tipo==='inventario'&&e.inventario?.id==='naeris');
    assert.doesNotMatch(JSON.stringify(privadoBiaSse),/Carta M/);
    // Recusa não aplica transferência e notifica somente o solicitante.
    const rejeitado=await post(base+'/item',bia.token,{tipo:'transferir',itemId:'espada',destinatarioId:'morgana',quantidade:1});
    assert.equal(rejeitado.status,202);
    assert.equal((await post(base+'/resultado-item',mestre,{pedidoId:rejeitado.body.pedidoId,ok:false,mensagem:'O mestre recusou.'})).status,200);
    assert.equal((await post(base+'/validar-item',mestre,{pedidoId:rejeitado.body.pedidoId})).status,404);
    assert.equal((await get(base+'/inventario',bia.token)).body.inventario.itens[0].nome,'Espada N');
    const usar=await post(base+'/item',ana.token,{tipo:'usar',itemId:'pocao'});
    assert.equal(usar.status,202);
    const pedidoUsar=await receber(mestreSse,e=>e.tipo==='pedido-item'&&e.pedidoId===usar.body.pedidoId);
    assert.equal(pedidoUsar.operacao,'usar');
    assert.equal((await post(base+'/resultado-item',mestre,{pedidoId:usar.body.pedidoId,ok:true,mensagem:'Sem aprovar'})).status,409);
    assert.equal((await post(base+'/validar-item',mestre,{pedidoId:usar.body.pedidoId})).status,200);
    assert.equal((await post(base+'/resultado-item',mestre,{pedidoId:usar.body.pedidoId,ok:true,mensagem:'Poção utilizada.'})).status,200);
    assert.equal((await publicar([item('carta','Carta M',1,'documento')],[item('espada','Espada N',1,'arma')])).status,200);
    assert.equal((await post(base+'/item',ana.token,{tipo:'usar',itemId:'pocao'})).status,409);
    assert.equal((await post(base+'/atribuir',mestre,{pessoaId:ana.id,personagemId:null})).status,200);
    assert.equal((await get(base+'/inventario',ana.token)).body.inventario,null);
    assert.equal((await post(base+'/item',ana.token,{tipo:'usar',itemId:'carta'})).status,403);
    // Alterar personagem cancela pedidos anteriores: o mestre não pode confirmar um pedido obsoleto.
    const novoPedido=await post(base+'/item',bia.token,{tipo:'usar',itemId:'espada'});
    assert.equal(novoPedido.status,202);
    assert.equal((await post(base+'/atribuir',mestre,{pessoaId:bia.id,personagemId:null})).status,200);
    assert.equal((await post(base+'/resultado-item',mestre,{pedidoId:novoPedido.body.pedidoId,ok:true,mensagem:'forjado'})).status,404);
    assert.equal((await get(base+'/inventario',bia.token)).body.inventario,null);
  }finally{
    for(const cancel of abortar)cancel.abort();
    await app.fechar();
  }
});
