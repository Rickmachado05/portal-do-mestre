import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const quadro={cenaId:'c1',cenaNome:'Arena',visibilidade:'total',tokens:[
  {id:'morgana',nome:'Morgana',tipo:'jogador',x:22,y:33,cor:'#368bc9'},
  {id:'naeris',nome:'Naeris',tipo:'jogador',x:66,y:77,cor:'#cb9c52'},
]};
const ficha=(id,nome,hp)=>({id,nome,elemento:id==='morgana'?'Água':'Fogo',classe:'Conjurador',
  hp,hpMax:150,mana:170,manaMax:130,ca:14,escudo:5,temFicha:true,
  acoes:[{id:'ataque',nome:'Ataque básico',tipo:'Ataque básico',categoria:'basico',valor:'2d8'},
    {id:'skill-0',nome:`Magia privada de ${nome}`,tipo:'Cura',categoria:'cura',custo:15,valor:'3d8',descricao:'Cura à distância.',restricoes:'Precisa de linha de visão.'},
    {id:'passiva',nome:'Proteção',tipo:'Passiva',categoria:'passiva'}]});

test('cada convidado recebe apenas a própria ficha; atualização, revogação e acesso negado',async()=>{
  const app=criarAplicacaoMultiplayer();
  const endereco=await app.escutar(0);
  const base=`http://127.0.0.1:${endereco.port}/api/multiplayer`;
  const streams=[];
  const chamar=async(rota,opcoes={})=>{
    const r=await fetch(base+rota,{...opcoes,headers:{...(opcoes.body?{'Content-Type':'application/json'}:{}),...opcoes.headers}});
    return {status:r.status,dados:await r.json()};
  };
  const post=(rota,token,corpo)=>chamar(rota,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(corpo)});
  const get=(rota,token)=>chamar(rota,{headers:{Authorization:`Bearer ${token}`}});
  const assinar=async(rota,token)=>{
    const c=new AbortController();streams.push(c);
    const resposta=await fetch(base+rota+`/eventos?token=${token}`,{signal:c.signal});
    assert.equal(resposta.status,200);
    return resposta.body.getReader();
  };
  try {
    const criado=await chamar('/salas',{method:'POST',body:JSON.stringify({campanhaId:'demo',campanha:'Hexatombe'})});
    const {codigo,token:mestre}=criado.dados;
    const rota=`/salas/${codigo}`;
    const ana=(await post(`${rota}/entrar`,'',{apelido:'Morgana'})).dados;
    const bia=(await post(`${rota}/entrar`,'',{apelido:'Naeris'})).dados;
    const leitorAna=await assinar(rota,ana.token);
    const leitorBia=await assinar(rota,bia.token);
    assert.equal((await get(`${rota}/ficha`,ana.token)).dados.ficha,null);
    assert.equal((await get(`${rota}/ficha`,bia.token)).dados.ficha,null);
    assert.equal((await get(`${rota}/ficha`,mestre)).status,403);
    assert.equal((await chamar(`${rota}/ficha`)).status,401);
    assert.equal((await post(`${rota}/fichas`,ana.token,{personagens:[]})).status,403);
    assert.equal((await post(`${rota}/mesa`,mestre,quadro)).status,200);
    const malicioso={personagens:[
      {...ficha('morgana','Morgana',92),inventario:[{nome:'Objeto secreto'}],historia:'Segredo',foto:'foto restrita'},
      ficha('naeris','Naeris',77),
    ]};
    assert.equal((await post(`${rota}/fichas`,mestre,malicioso)).status,200);
    assert.equal((await post(`${rota}/atribuir`,mestre,{pessoaId:ana.id,personagemId:'morgana'})).status,200);
    assert.equal((await post(`${rota}/atribuir`,mestre,{pessoaId:bia.id,personagemId:'naeris'})).status,200);
    let atual=(await get(`${rota}/ficha`,ana.token)).dados.ficha;
    assert.equal(atual.nome,'Morgana');assert.equal(atual.hp,92);assert.equal(atual.mana,170);
    assert.match(JSON.stringify(atual),/Magia privada de Morgana/);
    assert.doesNotMatch(JSON.stringify(atual),/Naeris|inventario|Objeto secreto|historia|foto/);
    assert.equal((await get(`${rota}/ficha`,bia.token)).dados.ficha.nome,'Naeris');
    // Tentativa de escolher personagem por parâmetro: o endpoint ignora qualquer id do convidado.
    assert.equal((await get(`${rota}/ficha?personagemId=naeris`,ana.token)).dados.ficha.id,'morgana');
    assert.equal((await post(`${rota}/atribuir`,ana.token,{pessoaId:ana.id,personagemId:'naeris'})).status,403);
    // Verifica que os eventos SSE 'ficha' só carregam a própria personagem.
    async function receberMinhaFicha(leitor,id,proibida){
      const dec=new TextDecoder();let acumulado='';
      for(let i=0;i<12;i++){
        const bloco=await Promise.race([leitor.read(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('SSE não chegou')),1200))]);
        acumulado+=dec.decode(bloco.value);
        if(acumulado.includes(`"tipo":"ficha","ficha":{"id":"${id}"`))break;
      }
      const eventos=acumulado.split('\n\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)));
      const fichas=eventos.filter(e=>e.tipo==='ficha'&&e.ficha);
      assert.ok(fichas.some(e=>e.ficha.id===id),'Ficha própria não chegou pelo SSE');
      assert.ok(fichas.every(e=>e.ficha.id!==proibida),'SSE vazou ficha de outro participante');
    }
    await receberMinhaFicha(leitorAna,'morgana','naeris');
    await receberMinhaFicha(leitorBia,'naeris','morgana');
    // Alteração do mestre deve atualizar os recursos sem trocar vínculo.
    assert.equal((await post(`${rota}/fichas`,mestre,{personagens:[ficha('morgana','Morgana',50),ficha('naeris','Naeris',80)]})).status,200);
    assert.equal((await get(`${rota}/ficha`,ana.token)).dados.ficha.hp,50);
    assert.equal((await get(`${rota}/ficha`,bia.token)).dados.ficha.hp,80);
    // Reatribuir zera o acesso anterior e concede só o novo.
    assert.equal((await post(`${rota}/atribuir`,mestre,{pessoaId:ana.id,personagemId:null})).status,200);
    assert.equal((await get(`${rota}/ficha`,ana.token)).dados.ficha,null);
    assert.equal((await post(`${rota}/atribuir`,mestre,{pessoaId:bia.id,personagemId:null})).status,200);
    assert.equal((await post(`${rota}/atribuir`,mestre,{pessoaId:ana.id,personagemId:'naeris'})).status,200);
    assert.equal((await get(`${rota}/ficha`,ana.token)).dados.ficha.nome,'Naeris');
    assert.equal((await get(`${rota}/ficha`,bia.token)).dados.ficha,null);
    // Campos extra ou valores inválidos são rejeitados/descartados.
    const antes=(await get(`${rota}/ficha`,ana.token)).dados.ficha;
    assert.equal((await post(`${rota}/fichas`,mestre,{personagens:[{...ficha('naeris','Naeris',80),hp:-50}]})).status,400);
    assert.deepEqual((await get(`${rota}/ficha`,ana.token)).dados.ficha,antes);
    assert.equal((await post(`${rota}/fichas`,mestre,{personagens:[]})).status,200);
    assert.equal((await get(`${rota}/ficha`,ana.token)).dados.ficha,null);
  }finally{
    for(const c of streams)c.abort();
    await app.fechar();
  }
});
