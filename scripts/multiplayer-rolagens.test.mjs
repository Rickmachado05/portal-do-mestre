import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

function ficha(id,nome){return {id,nome,elemento:'Água',classe:'Conjurador',hp:80,hpMax:100,mana:155,manaMax:100,ca:15,escudo:0,temFicha:true,acoes:[
  {id:'ataque',nome:'Golpe',tipo:'Ataque',categoria:'basico',valor:'2d8+10 dano'},
  {id:'skill-0',nome:`Cura de ${nome}`,tipo:'Cura',categoria:'cura',valor:'3d8 HP',custo:10},
  {id:'skill-1',nome:'Escudo',tipo:'Buff',categoria:'buff',valor:'+2 CA'},
  {id:'passiva',nome:'Proteção',tipo:'Passiva',categoria:'passiva'},
]};}
test('servidor rola dados confiáveis, compartilha o histórico e impede ações de outras fichas',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const cancels=[];
  async function pedir(rota,opcoes={}){
    const response=await fetch(raiz+rota,{...opcoes,headers:{...(opcoes.body?{'Content-Type':'application/json'}:{}),...opcoes.headers}});
    return {status:response.status,dados:await response.json()};
  }
  const post=(rota,token,body)=>pedir(rota,{method:'POST',body:JSON.stringify(body),headers:token?{Authorization:`Bearer ${token}`}:{}});
  const get=(rota,token)=>pedir(rota,{headers:{Authorization:`Bearer ${token}`}});
  const sse=async(rota,token)=>{
    const c=new AbortController();cancels.push(c);
    const resposta=await fetch(raiz+rota+`/eventos?token=${token}`,{signal:c.signal});
    assert.equal(resposta.status,200);
    return resposta.body.getReader();
  };
  try{
    const criada=await post('/salas','',{campanha:'Hexatombe',campanhaId:'id-1'});
    const {codigo,token:mestre}=criada.dados;
    const rota=`/salas/${codigo}`;
    const ana=(await post(rota+'/entrar','',{apelido:'Ana'})).dados;
    const bia=(await post(rota+'/entrar','',{apelido:'Bia'})).dados;
    const leitorMestre=await sse(rota,mestre);
    const leitorAna=await sse(rota,ana.token);
    const leitorBia=await sse(rota,bia.token);
    const semFicha=await post(rota+'/rolar',ana.token,{tipo:'livre',formula:'1d20'});
    assert.equal(semFicha.status,400);
    await post(rota+'/mesa',mestre,{cenaId:'id-cena',cenaNome:'Arena',visibilidade:'total',tokens:[
      {id:'ana',nome:'Ana',tipo:'jogador',x:10,y:20,cor:'#aabbcc'},
      {id:'bia',nome:'Bia',tipo:'jogador',x:30,y:40,cor:'#ccddee'},
    ]});
    assert.equal((await post(rota+'/fichas',mestre,{personagens:[ficha('ana','Ana'),ficha('bia','Bia')]})).status,200);
    assert.equal((await post(rota+'/atribuir',mestre,{pessoaId:ana.id,personagemId:'ana'})).status,200);
    assert.equal((await post(rota+'/atribuir',mestre,{pessoaId:bia.id,personagemId:'bia'})).status,200);
    assert.equal((await get(rota+'/rolagens',ana.token)).dados.rolagens.length,0);
    assert.equal((await post(rota+'/rolar',mestre,{tipo:'livre',formula:'1d20'})).status,403);
    assert.equal((await post(rota+'/rolar','',{tipo:'livre',formula:'1d20'})).status,401);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'acao',acaoId:'skill-9',modalidade:'valor'})).status,400);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'acao',acaoId:'passiva',modalidade:'teste'})).status,400);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'acao',acaoId:'skill-1',modalidade:'teste'})).status,400);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'acao',acaoId:'skill-1',modalidade:'valor'})).status,400);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'livre',formula:'9d20'})).status,400);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'livre',formula:'3d99'})).status,400);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'livre',formula:'1d20+10000'})).status,400);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'livre',formula:'1d20',total:5000,dados:[5000]})).status,201);
    const historico=(await get(rota+'/rolagens',bia.token)).dados.rolagens;
    assert.equal(historico.length,1);
    const rolagem=historico[0];
    assert.equal(rolagem.personagemId,'ana');
    assert.equal(rolagem.acaoNome,'Rolagem livre');
    assert.equal(rolagem.formula,'1d20');
    assert.ok(rolagem.total>=1&&rolagem.total<=20);
    assert.equal(rolagem.dados[0],rolagem.total);
    // Valida transmissão SSE para mestre e convidado com ficha diferente.
    async function recebeu(leitor,id){
      let texto='';
      for(let i=0;i<15;i++){
        const parte=await Promise.race([leitor.read(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Rolagem SSE ausente')),1700))]);
        texto+=new TextDecoder().decode(parte.value);
        if(texto.includes('"tipo":"rolagem"')&&texto.includes(id))break;
      }
      assert.match(texto,/"tipo":"rolagem"/);
      assert.ok(texto.includes(id));
    }
    await recebeu(leitorMestre,rolagem.id);
    await recebeu(leitorAna,rolagem.id);
    await recebeu(leitorBia,rolagem.id);
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'livre',formula:'1d20'})).status,429);
    await new Promise(resolve=>setTimeout(resolve,360));
    let result=await post(rota+'/rolar',ana.token,{tipo:'acao',acaoId:'ataque',modalidade:'teste',formula:'8d100'});
    assert.equal(result.status,201);
    assert.equal(result.dados.rolagem.formula,'1d20');
    assert.equal(result.dados.rolagem.categoria,'teste');
    await new Promise(resolve=>setTimeout(resolve,360));
    result=await post(rota+'/rolar',ana.token,{tipo:'acao',acaoId:'ataque',modalidade:'valor'});
    assert.equal(result.status,201);
    assert.equal(result.dados.rolagem.formula,'2d8+10');
    assert.ok(result.dados.rolagem.total>=12&&result.dados.rolagem.total<=26);
    await new Promise(resolve=>setTimeout(resolve,360));
    result=await post(rota+'/rolar',ana.token,{tipo:'acao',acaoId:'skill-0',modalidade:'valor'});
    assert.equal(result.status,201);
    assert.equal(result.dados.rolagem.formula,'3d8');
    assert.match(result.dados.rolagem.acaoNome,/Cura de Ana/);
    assert.doesNotMatch(JSON.stringify((await get(rota+'/ficha',bia.token)).dados.ficha),/Cura de Ana/);
    assert.equal((await get(rota+'/rolagens',mestre)).dados.rolagens.length,4);
    // O participante perde a capacidade de rolar quando o vínculo é revogado.
    assert.equal((await post(rota+'/atribuir',mestre,{pessoaId:ana.id,personagemId:null})).status,200);
    await new Promise(resolve=>setTimeout(resolve,360));
    assert.equal((await post(rota+'/rolar',ana.token,{tipo:'livre',formula:'1d20'})).status,400);
  }finally{
    for(const cancel of cancels)cancel.abort();
    await app.fechar();
  }
});
