import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const pagina=(id,props={})=>({id,titulo:'Nota da campanha',conteudo:'Texto da aventura',categoria:'personagem',tipo:'nota',pastaId:'',
  formato:'texto',imagem:'',criadaEm:'2026-11-13T20:00:00.000Z',atualizadaEm:'2026-11-13T21:00:00.000Z',...props});

test('Diário do personagem: compartilhar, editar, revogar, pastas e isolamento por jogador',async()=>{
  const app=criarAplicacaoMultiplayer(),port=(await app.escutar(0)).port;
  const base=`http://127.0.0.1:${port}/api/multiplayer`;
  const req=async(path,token,method='GET',body)=>{
    const res=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{})},
      ...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}}:{})});
    return {status:res.status,body:await res.json()};
  };
  try{
    const host=(await req('/salas',null,'POST',{campanha:'Avatar',campanhaId:'share-chat'})).body;
    const r=`/salas/${host.codigo}`;
    const ana=(await req(r+'/entrar',null,'POST',{apelido:'Ana'})).body;
    const bia=(await req(r+'/entrar',null,'POST',{apelido:'Bia'})).body;
    const caio=(await req(r+'/entrar',null,'POST',{apelido:'Caio'})).body;
    const tokens=['morgana','naeris','vento'].map((id,i)=>({id,nome:id,tipo:'jogador',x:20+i*10,y:30,cor:'#123456'}));
    assert.equal((await req(r+'/mesa',host.token,'POST',{cenaId:'cena',cenaNome:'Cena',visibilidade:'total',tokens})).status,200);
    assert.equal((await req(r+'/atribuir',host.token,'POST',{pessoaId:ana.id,personagemId:'morgana'})).status,200);
    assert.equal((await req(r+'/atribuir',host.token,'POST',{pessoaId:bia.id,personagemId:'naeris'})).status,200);
    assert.equal((await req(r+'/atribuir',host.token,'POST',{pessoaId:caio.id,personagemId:'vento'})).status,200);
    assert.deepEqual((await req(r+'/diario-personagem',host.token)).body.recebidos,[]);
    assert.equal((await req(r+'/diario-personagem',ana.token,'POST',{pagina:pagina('n1'),compartilhadoCom:{}})).status,200);
    assert.deepEqual((await req(r+'/diario-personagem',host.token)).body.recebidos,[],'Nota privada não aparece para o mestre');
    assert.equal((await req(r+'/diario-personagem',ana.token,'POST',{pagina:pagina('n1'),compartilhadoCom:{mestre:'ver'}})).status,200);
    let recebido=(await req(r+'/diario-personagem',host.token)).body.recebidos[0];
    assert.equal(recebido.personagemNome,'morgana');
    assert.equal(recebido.permissao,'ver');
    assert.equal((await req(r+'/diario-personagem',host.token,'PATCH',{id:recebido.id,campos:{titulo:'Editado sem acesso'}})).status,403);
    assert.deepEqual((await req(r+'/diario',bia.token)).body.paginas,[]);
    assert.deepEqual((await req(r+'/diario',caio.token)).body.paginas,[]);
    // Permissão Editar habilita edição remota, mas nunca edição de quem tem só Visualizar.
    assert.equal((await req(r+'/diario-personagem',ana.token,'POST',{pagina:pagina('n1'),compartilhadoCom:{mestre:'editar',naeris:'ver'}})).status,200);
    recebido=(await req(r+'/diario-personagem',host.token)).body.recebidos[0];
    const notaBia=(await req(r+'/diario',bia.token)).body.paginas[0];
    assert.equal(notaBia.permissao,'ver');
    assert.equal(notaBia.proprietario,'morgana (Ana)');
    assert.equal((await req(r+'/diario-personagem',bia.token,'PATCH',{id:recebido.id,campos:{conteudo:'Sem permissão'}})).status,403);
    assert.equal((await req(r+'/diario-personagem',host.token,'PATCH',{id:recebido.id,campos:{conteudo:'Revisão do mestre'}})).status,200);
    assert.equal((await req(r+'/diario-personagem',ana.token)).body.proprios[0].conteudo,'Revisão do mestre');
    assert.equal((await req(r+'/diario',bia.token)).body.paginas[0].conteudo,'Revisão do mestre');
    assert.equal((await req(r+'/diario-personagem',bia.token,'PATCH',{id:recebido.id,campos:{compartilhadoCom:{vento:'editar'}}})).status,403);
    // Ao retirar o compartilhamento ninguém mantém acesso, nem por IDs antigos.
    assert.equal((await req(r+'/diario-personagem',ana.token,'DELETE',{id:'n1'})).status,200);
    assert.deepEqual((await req(r+'/diario-personagem',host.token)).body.recebidos,[]);
    assert.deepEqual((await req(r+'/diario',bia.token)).body.paginas,[]);
    assert.equal((await req(r+'/diario-personagem',host.token,'PATCH',{id:recebido.id,campos:{titulo:'Antigo'}})).status,404);
    // Pasta compartilhada: a publicação de filho preserva a árvore para cada destinatário autorizado.
    const pasta=pagina('p1',{tipo:'pasta',titulo:'Pistas da Morgana'});
    const filho=pagina('n2',{pastaId:'p1',titulo:'Segredo dentro da pasta'});
    assert.equal((await req(r+'/diario-personagem',ana.token,'POST',{pagina:pasta,compartilhadoCom:{mestre:'ver',naeris:'editar'}})).status,200);
    assert.equal((await req(r+'/diario-personagem',ana.token,'POST',{pagina:filho,compartilhadoCom:{mestre:'ver',naeris:'editar'}})).status,200);
    const compartilhados=(await req(r+'/diario',bia.token)).body.paginas;
    assert.equal(compartilhados.length,2);
    assert.equal(compartilhados.find(p=>p.tipo==='nota').pastaId,compartilhados.find(p=>p.tipo==='pasta').id);
    assert.equal(compartilhados.find(p=>p.tipo==='nota').permissao,'editar');
    const idDoFilho=compartilhados.find(p=>p.tipo==='nota').id.replace('externo:','');
    assert.equal((await req(r+'/diario-personagem',bia.token,'PATCH',{id:idDoFilho,campos:{titulo:'Pista editada pela Naeris'}})).status,200);
    assert.equal((await req(r+'/diario-personagem',host.token)).body.recebidos.find(p=>p.pagina.id==='n2').pagina.titulo,'Pista editada pela Naeris');
    assert.deepEqual((await req(r+'/diario',caio.token)).body.paginas,[]);
    assert.equal((await req(r+'/diario-personagem',ana.token,'POST',{pagina:filho,compartilhadoCom:{vento:'ver'}})).status,200);
    assert.equal((await req(r+'/diario',caio.token)).body.paginas.length,1);
    assert.equal((await req(r+'/diario-personagem',host.token)).body.recebidos.some(p=>p.pagina.id==='n2'),false);
    // Atribuição revogada interrompe qualquer publicação do personagem anterior.
    assert.equal((await req(r+'/atribuir',host.token,'POST',{pessoaId:ana.id,personagemId:null})).status,200);
    assert.deepEqual((await req(r+'/diario',caio.token)).body.paginas,[]);
    assert.equal((await req(r+'/diario-personagem',ana.token,'POST',{pagina:pagina('novo'),compartilhadoCom:{mestre:'ver'}})).status,403);
  }finally{await app.fechar();}
});

test('Interface: um único Compartilhado comigo e menu de compartilhamento equivalente',()=>{
  const src=new URL('../src/',import.meta.url);
  const ler=(nome)=>readFileSync(new URL(nome,src),'utf8');
  assert.doesNotMatch(ler('App.tsx'),/DiarioRecebidosMestre|Recebidos dos personagens/);
  assert.doesNotMatch(ler('mesa3d/Mesa3DPrototipo.tsx'),/DiarioRecebidosMestre|Recebidos dos personagens/);
  assert.match(ler('multiplayer/DiarioMestreMultiplayer.tsx'),/paginasExternas/);
  assert.match(ler('multiplayer/DiarioConvidado.tsx'),/personagens=\{destinatarios\}/);
  assert.match(ler('hexatombe/DiarioCampanha.tsx'),/>⇄ Compartilhar/);
  for(const valor of ['Não compartilhar','Visualizar','Editar'])assert.ok(ler('hexatombe/DiarioCampanha.tsx').includes(valor));
  assert.doesNotMatch(ler('hexatombe/DiarioCampanha.tsx'),/Enviar ao mestre/);
});
