import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const quadro={cenaId:'1',cenaNome:'Cena teste',visibilidade:'total',tokens:[
  {id:'morgana',nome:'Morgana',tipo:'jogador',x:20,y:20,cor:'#223344'},
  {id:'naeris',nome:'Naeris',tipo:'jogador',x:40,y:40,cor:'#443322'},
]};
const pagina=(id,titulo,compartilhadoCom={},pastaId='',tipo='nota')=>({
  id,titulo,conteudo:`Conteúdo ${titulo}`,categoria:'pista',fixada:false,
  criadaEm:'2026-11-13T00:00:00.000Z',atualizadaEm:'2026-11-13T00:00:00.000Z',
  tipo,pastaId,formato:'texto',imagem:'',compartilhadoCom,
});

test('Diário remoto: identidade, compartilhamento de pasta e revogação sem vazamento',async()=>{
  const app=criarAplicacaoMultiplayer();
  const porta=(await app.escutar(0)).port;
  const raiz=`http://127.0.0.1:${porta}/api/multiplayer`;
  const pedir=async(rota,token,body)=>{
    const resposta=await fetch(raiz+rota,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}}:{})});
    return {status:resposta.status,dados:await resposta.json()};
  };
  try{
    const {dados:{codigo,token:mestre}}=await pedir('/salas',null,{campanha:'Hexatombe',campanhaId:'diario-1'});
    const rota=`/salas/${codigo}`;
    const ana=(await pedir(rota+'/entrar',null,{apelido:'Ana'})).dados;
    const bia=(await pedir(rota+'/entrar',null,{apelido:'Bia'})).dados;
    const paginas=[pagina('privado','Segredo do mestre'),pagina('pasta','Arquivo comum',{morgana:'ver'},'','pasta'),
      pagina('pista','Pista em pasta',{},'pasta'),pagina('restrita','Pista Naeris',{naeris:'ver'}),
      pagina('direta','Direta Morgana',{morgana:'ver'},'privado'),pagina('publica','Compartilhada com ambas',{morgana:'ver',naeris:'ver'})];
    assert.equal((await pedir(rota+'/mesa',mestre,quadro)).status,200);
    assert.equal((await pedir(rota+'/diario',ana.token,{paginas})).status,403);
    assert.equal((await pedir(rota+'/diario',mestre)).status,403);
    assert.equal((await pedir(rota+'/diario',ana.token)).dados.paginas.length,0);
    assert.equal((await pedir(rota+'/diario',mestre,{paginas})).status,200);
    assert.equal((await pedir(rota+'/atribuir',mestre,{pessoaId:ana.id,personagemId:'morgana'})).status,200);
    assert.equal((await pedir(rota+'/atribuir',mestre,{pessoaId:bia.id,personagemId:'naeris'})).status,200);
    const a=(await pedir(rota+'/diario?personagemId=naeris',ana.token)).dados.paginas;
    const b=(await pedir(rota+'/diario',bia.token)).dados.paginas;
    assert.deepEqual(a.map(p=>p.id),['pasta','pista','direta','publica']);
    assert.deepEqual(b.map(p=>p.id),['restrita','publica']);
    assert.ok(!JSON.stringify(a).includes('Pista Naeris'));
    assert.ok(!JSON.stringify(b).includes('Pista em pasta'));
    assert.ok(!JSON.stringify(a).includes('Segredo do mestre'));
    assert.ok(a.every(p=>!Object.hasOwn(p,'compartilhadoCom')));
    assert.equal(a.find(p=>p.id==='direta').pastaId,'','Pasta privada não deve aparecer');
    assert.equal(a.find(p=>p.id==='pista').pastaId,'pasta','Pasta visível mantém hierarquia');
    // Revogar a pasta retira imediatamente o acesso dos filhos sem permissão própria.
    const revogadas=paginas.map(p=>p.id==='pasta'?{...p,compartilhadoCom:{}}:p);
    assert.equal((await pedir(rota+'/diario',mestre,{paginas:revogadas})).status,200);
    assert.deepEqual((await pedir(rota+'/diario',ana.token)).dados.paginas.map(p=>p.id),['direta','publica']);
    assert.equal((await pedir(rota+'/atribuir',mestre,{pessoaId:ana.id,personagemId:null})).status,200);
    assert.deepEqual((await pedir(rota+'/diario',ana.token)).dados.paginas,[]);
    assert.equal((await pedir(rota+'/diario','')).status,401);
  }finally{await app.fechar();}
});

test('Imagem válida de documento no inventário chega apenas ao dono',async()=>{
  const app=criarAplicacaoMultiplayer();
  const porta=(await app.escutar(0)).port;
  const raiz=`http://127.0.0.1:${porta}/api/multiplayer`;
  const pedir=async(rota,token,body)=>{
    const resposta=await fetch(raiz+rota,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}}:{})});
    return {status:resposta.status,dados:await resposta.json()};
  };
  try{
    const {dados:{codigo,token:mestre}}=await pedir('/salas',null,{campanha:'Avatar',campanhaId:'anexo'});
    const rota=`/salas/${codigo}`;
    const ana=(await pedir(rota+'/entrar',null,{apelido:'Ana'})).dados;
    const bia=(await pedir(rota+'/entrar',null,{apelido:'Bia'})).dados;
    const imagem='data:image/webp;base64,AAAA';
    const modelo={id:'doc',nome:'Carta',categoria:'documento',efeito:'nenhum',valor:'',descricao:'Uma imagem',
      quantidade:1,consumivel:false,conteudo:'Carta privada',imagemConteudo:imagem};
    await pedir(rota+'/mesa',mestre,quadro);
    await pedir(rota+'/inventarios',mestre,{personagens:[{id:'morgana',nome:'Morgana',itens:[modelo]},
      {id:'naeris',nome:'Naeris',itens:[]}]});
    await pedir(rota+'/atribuir',mestre,{pessoaId:ana.id,personagemId:'morgana'});
    await pedir(rota+'/atribuir',mestre,{pessoaId:bia.id,personagemId:'naeris'});
    const item=(await pedir(rota+'/inventario',ana.token)).dados.inventario.itens[0];
    assert.equal(item.imagemConteudo,imagem);
    assert.equal(item.conteudo,'Carta privada');
    assert.deepEqual((await pedir(rota+'/inventario',bia.token)).dados.inventario.itens,[]);
  }finally{await app.fechar();}
});
