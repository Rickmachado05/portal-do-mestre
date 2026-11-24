import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const atributos=['Força','Agilidade','Destreza','Vigor','Intelecto','Percepção','Vontade','Presença'];
const pericias=['Atletismo','Acrobacia','Furtividade','Precisão Manual','Atenção','Investigação','Sobrevivência','Condução','Conhecimento','Engenharia','Medicina','Persuasão','Enganação','Intimidação','Empatia','Liderança'];
const personagem=(id,nome)=>({id,nome,elemento:'Água',classe:'Conjurador',hp:100,hpMax:130,mana:181,manaMax:120,ca:11,escudo:9,temFicha:true,
  acoes:[{id:'ataque',nome:'Ataque básico',tipo:'Ataque básico',categoria:'basico',valor:'2d6+2',fonte:'a01',ativacao:'principal',pc:0,exigeCA:true},
    {id:'skill-0',nome:'Escudo espiritual',tipo:'Defesa',categoria:'defesa',custo:10,fonte:'a01',ativacao:'buff',pc:25,exigeCA:false},
    {id:'exploracao-0',nome:'Caminho na névoa',tipo:'Exploração',categoria:'utilidade',fonte:'a01',ativacao:'exploracao',px:25,enIndefinida:true}],
  impeto:{escala:'avatar-a01',atributos:atributos.map(nome=>({nome,valor:10})),pericias:pericias.map(nome=>({nome,bonus:2})),
    arquetipo:'Controlador',talento:'correcaoDeGolpe',vantagem:'sangueFrio',derivacao:{tipo:'reserva',atributo:'Vigor',justificativa:'Resistência espiritual'},
    investimento:{hp:2,energia:4,ca:10,ataqueDados:1,regeneracao:1},
    origem:{segredoMestre:'NÃO DIVULGAR'},foto:'NÃO DIVULGAR',historia:'NÃO DIVULGAR'},
  condicoes:[{id:'b1',nome:'Proteção',turnos:2,tipo:'buff',origem:'Habilidade'},
    {id:'b2',nome:'Lentidão',turnos:1,tipo:'debuff',camposPrivados:'NÃO DIVULGAR'}],
  inventario:[{nome:'NÃO DIVULGAR'}],notasMestre:'NÃO DIVULGAR'
});

test('ficha Ímpeto do jogador segue a estrutura do mestre sem divulgar dados privados',async()=>{
  const app=criarAplicacaoMultiplayer();
  const addr=await app.escutar(0),base=`http://127.0.0.1:${addr.port}/api/multiplayer`;
  const req=async(path,token,body)=>{
    const res=await fetch(base+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:res.status,dados:await res.json()};
  };
  try{
    const {codigo,token:mestre}=(await req('/salas',null,{campanha:'Ímpeto',campanhaId:'teste-ficha-v29-11-1'})).dados;
    const sala=`/salas/${codigo}`;
    const a=(await req(sala+'/entrar',null,{apelido:'Ana'})).dados;
    const b=(await req(sala+'/entrar',null,{apelido:'Bia'})).dados;
    await req(sala+'/mesa',mestre,{cenaId:'c1',cenaNome:'Arena',visibilidade:'total',tokens:[{id:'a',nome:'Morgana',tipo:'jogador',x:20,y:40,cor:'#1166aa'},{id:'b',nome:'Outro',tipo:'jogador',x:80,y:40,cor:'#aaaaaa'}]});
    await req(sala+'/atribuir',mestre,{pessoaId:a.id,personagemId:'a'});
    await req(sala+'/atribuir',mestre,{pessoaId:b.id,personagemId:'b'});
    assert.equal((await req(sala+'/fichas',mestre,{personagens:[personagem('a','Morgana'),personagem('b','Outro')]})).status,200);
    const ficha=(await req(sala+'/ficha',a.token)).dados.ficha;
    assert.equal(ficha.nome,'Morgana');
    assert.equal(ficha.impeto.escala,'avatar-a01');
    assert.equal(ficha.impeto.atributos.length,8);
    assert.equal(ficha.impeto.pericias.length,16);
    assert.equal(ficha.impeto.derivacao.tipo,'reserva');
    assert.equal(ficha.impeto.investimento.energia,4);
    assert.equal(ficha.mana,181,'EN não deve ser truncada pela referência inicial');
    assert.equal(ficha.condicoes.length,2);
    assert.equal(ficha.acoes[1].ativacao,'buff');
    assert.equal(ficha.acoes[1].exigeCA,false);
    assert.equal(ficha.acoes[2].ativacao,'exploracao');
    assert.equal(ficha.acoes[2].enIndefinida,true);
    assert.doesNotMatch(JSON.stringify(ficha),/NÃO DIVULGAR|Outro|inventario|notasMestre|historia|foto|"origem":\{/);
    assert.equal((await req(sala+'/ficha',b.token)).dados.ficha.nome,'Outro');
    // Não aceitar estruturas Ímpeto incompletas sem substituir a ficha válida.
    const invalido=personagem('a','Morgana');invalido.impeto.atributos[0].nome='Ataque secreto';
    assert.equal((await req(sala+'/fichas',mestre,{personagens:[invalido]})).status,400);
    assert.equal((await req(sala+'/ficha',a.token)).dados.ficha.impeto.atributos[0].nome,'Força');
    // Fichas legadas seguem funcionando sem exigir campos novos.
    const legado=personagem('a','Morgana');delete legado.impeto;delete legado.condicoes;
    assert.equal((await req(sala+'/fichas',mestre,{personagens:[legado]})).status,200);
    const antiga=(await req(sala+'/ficha',a.token)).dados.ficha;
    assert.equal(antiga.impeto,undefined);assert.equal(antiga.condicoes,undefined);
  }finally{await app.fechar();}
});

test('interface v29.11.1 mantém ambas as laterais e espelha as abas do mestre',()=>{
  const mesa=readFileSync(new URL('../src/multiplayer/MesaConvidado2D.tsx',import.meta.url),'utf8');
  const ficha=readFileSync(new URL('../src/multiplayer/FichaConvidado.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/multiplayer/MesaConvidado2DParity.css',import.meta.url),'utf8');
  assert.doesNotMatch(mesa,/pm-jogo-recolher|lateraisVisiveis|PREFERENCIA_LATERAIS/);
  assert.doesNotMatch(css,/pm-jogo--sem-lateral|pm-jogo-recolher/);
  for(const aba of ['Atributos','Habilidades','Personagem','Inventário','Token'])assert.match(ficha,new RegExp(`'${aba}'`));
  for(const detalhe of ['Perícias','Construção','Exploração','condicoes','exigeCA','onRolarAcao'])assert.ok(ficha.includes(detalhe),`Falta ${detalhe}`);
});

test('servidor aceita ficha universal e anuncia compatibilidade sem expor origem',async()=>{
 const app=criarAplicacaoMultiplayer();
 const addr=await app.escutar(0),base=`http://127.0.0.1:${addr.port}/api/multiplayer`;
 const req=async(path,token,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,dados:await r.json()};};
 try{
  assert.equal((await req('/saude')).dados.recursos.fichaImpetoUniversal,true);
  const {codigo,token:mestre}=(await req('/salas',null,{campanha:'Ímpeto universal',campanhaId:'teste-universal'})).dados;
  const sala='/salas/'+codigo,convidado=(await req(sala+'/entrar',null,{apelido:'Ana'})).dados;
  await req(sala+'/mesa',mestre,{cenaId:'c1',cenaNome:'Arena',visibilidade:'total',tokens:[{id:'a',nome:'Morgana',tipo:'jogador',x:20,y:40,cor:'#1166aa'}]});
  await req(sala+'/atribuir',mestre,{pessoaId:convidado.id,personagemId:'a'});
  const f=personagem('a','Morgana');f.impeto.escala='universal-v1';f.hp=1000000;f.hpMax=1000000;f.mana=2000000;f.manaMax=1900000;f.impeto.investimento.hp=15000;
  f.acoes=Array.from({length:14},(_,i)=>({...f.acoes[1],id:'skill-'+i,nome:'Habilidade '+i,fonte:'universal'}));
  assert.equal((await req(sala+'/fichas',mestre,{personagens:[f]})).status,200);
  const recebido=(await req(sala+'/ficha',convidado.token)).dados.ficha;
  assert.equal(recebido.impeto.escala,'universal-v1');assert.equal(recebido.acoes.length,14);assert.equal(recebido.hp,1000000);assert.equal(recebido.mana,2000000);assert.doesNotMatch(JSON.stringify(recebido),/NÃO DIVULGAR/);
 }finally{await app.fechar();}
});
