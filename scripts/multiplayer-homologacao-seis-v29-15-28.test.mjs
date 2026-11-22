import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as dormir} from 'node:timers/promises';
import {performance} from 'node:perf_hooks';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const identidades=Array.from({length:6},(_,i)=>({id:`jogador-${i+1}`,nome:`Aventureiro ${i+1}`,tipo:'jogador',cor:'#6caaca'}));
const cenaBase=(revisao=1)=>({
  cenaId:'arena-seis',cenaNome:'Arena do grupo',visibilidade:'total',modoMesa:'3d',revisao,aspecto:1.6,
  tokens:[...identidades.map((p,i)=>({...p,x:12+i*12,y:25+i*8})),
    {id:'npc-oculto',nome:'NPC secreto',tipo:'inimigo',publicado:false,x:55,y:50}],
  grupo:identidades.map(p=>({...p,imagem:'data:image/webp;base64,AAAA'})),
  combate:{ativo:true,rodada:1,turnoId:identidades[0].id,ordem:identidades.map(p=>p.id),
    valores:Object.fromEntries(identidades.map((p,i)=>[p.id,20-i]))},
});

function cliente(app){
  let raiz;
  const conexoes=[];
  const medidas=[];
  return {
    medidas,
    async iniciar(){const endereco=await app.escutar(0);raiz=`http://127.0.0.1:${endereco.port}/api/multiplayer`;},
    async chamar(caminho,{token,metodo='GET',corpo,esperado=200}={}){
      const t=performance.now();
      const resposta=await fetch(`${raiz}${caminho}`,{
        method:metodo,
        headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(corpo!==undefined?{'Content-Type':'application/json'}:{})},
        ...(corpo!==undefined?{body:JSON.stringify(corpo)}:{}),
        signal:AbortSignal.timeout(12_000),
      });
      medidas.push(performance.now()-t);
      const dados=await resposta.json();
      assert.equal(resposta.status,esperado,`${metodo} ${caminho}: ${JSON.stringify(dados).slice(0,250)}`);
      return dados;
    },
    async eventos(caminho,token,{controlador=false}={}){
      const controle=new AbortController();
      const p=new URLSearchParams({token,...(controlador?{controlador:'1'}:{})});
      const resposta=await fetch(`${raiz}${caminho}/eventos?${p}`,{signal:controle.signal});
      assert.equal(resposta.status,200);
      const monitor={controle,maisRecente:0,recebidas:0,presencas:0,chat:0,movimentos:0,erros:[],finalizou:false};
      conexoes.push(monitor);
      monitor.tarefa=(async()=>{
        const leitor=resposta.body.getReader();
        const decoder=new TextDecoder();
        let buffer='';
        while(true){
          const {value,done}=await leitor.read();
          if(done)break;
          buffer+=decoder.decode(value,{stream:true});
          let pos;
          while((pos=buffer.indexOf('\n\n'))!==-1){
            const pedaco=buffer.slice(0,pos);buffer=buffer.slice(pos+2);
            const linha=pedaco.split('\n').find(l=>l.startsWith('data: '));
            if(!linha)continue;
            const evento=JSON.parse(linha.slice(6));
            if(evento.tipo==='mesa'){
              monitor.recebidas++;
              monitor.maisRecente=Math.max(monitor.maisRecente,evento.mesa?.revisao||0);
              monitor.ultimaMesa=evento.mesa;
            }
            if(evento.tipo==='presenca')monitor.presencas++;
            if(evento.tipo==='chat')monitor.chat++;
            if(evento.tipo==='pedido-movimento')monitor.movimentos++;
          }
          assert.ok(buffer.length<3_000_000,'Uma mensagem SSE não pode crescer indefinidamente');
        }
      })().catch(e=>{if(!controle.signal.aborted)monitor.erros.push(String(e));}).finally(()=>{monitor.finalizou=true;});
      return monitor;
    },
    async encerrar(){for(const c of conexoes)c.controle.abort();await Promise.allSettled(conexoes.map(c=>c.tarefa));},
  };
}
async function aguardar(condicao,descricao,ms=6_000){
  const limite=Date.now()+ms;
  while(Date.now()<limite){if(condicao())return;await dormir(25);}
  assert.fail(`Tempo excedido aguardando: ${descricao}`);
}
async function criarSeis(api){
  const host=await api.chamar('/salas',{metodo:'POST',esperado:201,corpo:{campanhaId:'hexatombe-seis',campanha:'Hexatombe 6 jogadores'}});
  const base=`/salas/${host.codigo}`;
  const convidados=await Promise.all(identidades.map((p,i)=>api.chamar(`${base}/entrar`,{
    metodo:'POST',esperado:201,corpo:{apelido:`Pessoa ${i+1}`}})));
  return {host,base,convidados};
}

test('v29.15.28: 6 jogadores, SSE simultâneo, 48 cenas, iniciativa, chat, movimento e reconexão sem duplicação',
  {timeout:40_000},async()=>{
    const app=criarAplicacaoMultiplayer();const api=cliente(app);
    try{
      await api.iniciar();
      const {host,base,convidados}=await criarSeis(api);
      const mestre=await api.eventos(base,host.token,{controlador:true});
      const streams=await Promise.all(convidados.map(p=>api.eventos(base,p.token)));
      let cena=cenaBase();
      // A cena pesada força o servidor a publicar quadro 3D em todas as conexões,
      // sem incluir mídia que deveria trafegar em uma URL autenticada separada.
      cena.imagem='data:image/webp;base64,'+'A'.repeat(180_000);
      await api.chamar(`${base}/mesa`,{token:host.token,metodo:'POST',corpo:cena});
      await Promise.all(convidados.map((p,i)=>api.chamar(`${base}/atribuir`,{
        token:host.token,metodo:'POST',corpo:{pessoaId:p.id,personagemId:identidades[i].id}})));
      await aguardar(()=>streams.every(s=>s.maisRecente===1),'cena inicial para os seis convidados');
      const inicio=performance.now();
      for(let rev=2;rev<=48;rev++){
        cena={...cena,revisao:rev,tokens:cena.tokens.map((p,i)=>i===0?{...p,x:12+rev/4}:p),
          combate:{...cena.combate,rodada:Math.ceil(rev/6),turnoId:identidades[(rev-1)%6].id}};
        await api.chamar(`${base}/mesa`,{token:host.token,metodo:'POST',corpo:cena});
      }
      await aguardar(()=>streams.every(s=>s.maisRecente===48),'48 revisões SSE para todos os convidados',9_000);
      const tempo=performance.now()-inicio;
      const movs=await Promise.all(convidados.map((p,i)=>api.chamar(`${base}/mover`,{
        token:p.token,metodo:'POST',esperado:202,corpo:{cenaId:cena.cenaId,x:20+i*9,y:30+i*7,final:true}})));
      assert.equal(movs.filter(v=>v.pendente===true).length,6);
      await aguardar(()=>mestre.movimentos>=6,'seis solicitações de movimento no controlador');
      const chats=await Promise.all(convidados.map((p,i)=>api.chamar(`${base}/chat`,{
        token:p.token,metodo:'POST',esperado:201,corpo:{texto:`Teste simultâneo ${i+1}`}})));
      assert.equal(chats.length,6);
      await aguardar(()=>streams.every(s=>s.chat>=6),'seis mensagens recebidas por cada convidado');
      for(let i=0;i<3;i++){
        streams[i].controle.abort();
        await streams[i].tarefa;
        const pessoa=convidados[i];
        const eu=await api.chamar(`${base}/eu`,{token:pessoa.token});
        assert.equal(eu.id,pessoa.id);
        streams[i]=await api.eventos(base,pessoa.token);
      }
      await aguardar(()=>streams.every(s=>s.maisRecente===48),'estado mais recente após reconexão');
      const estado=await api.chamar(base);
      assert.equal(estado.quantidadeConvidados,6);
      assert.equal((await api.chamar(`${base}/eu`,{token:host.token})).sala.participantes.length,7);
      for(let i=0;i<6;i++){
        assert.equal(streams[i].ultimaMesa.combate.rodada,8);
        assert.equal(streams[i].ultimaMesa.combate.turnoId,identidades[5].id);
        assert.deepEqual(streams[i].erros,[]);
      }
      assert.deepEqual(mestre.erros,[]);
      console.log(`DIAGNÓSTICO 6 participantes: 47 quadros em ${Math.round(tempo)} ms, ${api.medidas.length} requisições HTTP, média ${Math.round(api.medidas.reduce((a,b)=>a+b,0)/api.medidas.length)} ms`);
    }finally{await api.encerrar();await app.fechar();}
  });

test('v29.15.28: 6 recortes individuais 2D/3D isolados, persistência e retomada simultânea',
  {timeout:40_000},async()=>{
    const pasta=mkdtempSync(join(tmpdir(),'portal-homologacao-'));
    let app=criarAplicacaoMultiplayer({diretorioPersistencia:pasta});let api=cliente(app);
    try{
      await api.iniciar();
      const {host,base,convidados}=await criarSeis(api);
      const cena={...cenaBase(11),visibilidade:'individual',
        cenario3D:{base:'vazia',piso:'imagem',larguraTerreno:20,profundidadeTerreno:18,objetos:[
          {id:'objeto-oculto',tipo:'mesa',nome:'Segredo de cenário',x:1,z:1}
        ]},
        tokens:[...cenaBase().tokens.filter(t=>t.id!=='npc-oculto'),
          {id:'chefe',nome:'Chefe que ninguém viu',tipo:'inimigo',publicado:true,x:92,y:93}],
        vistas:identidades.map((p,i)=>({
          personagemId:p.id,
          imagem:`data:image/webp;base64,${'A'.repeat(18_000)}${i}`,
          mascara3D:'0'.repeat(2304),
          poligono3D:[{x:10+i,y:10},{x:20+i,y:10},{x:20+i,y:20}],
          idsVisiveis:[p.id],objetos3DVisiveis:[],miniaturas3DVisiveis:[],
        })),
        combate:{ativo:true,rodada:3,turnoId:identidades[0].id,ordem:[...identidades.map(p=>p.id),'chefe'],
          valores:{...Object.fromEntries(identidades.map((p,i)=>[p.id,16-i])),chefe:25}}};
      // imagem base64 exclusiva por pessoa; no final é verificada pelo filtro do servidor.
      await api.chamar(`${base}/mesa`,{metodo:'POST',token:host.token,corpo:cena});
      await Promise.all(convidados.map((p,i)=>api.chamar(`${base}/atribuir`,{
        metodo:'POST',token:host.token,corpo:{pessoaId:p.id,personagemId:identidades[i].id}})));
      const visoes=await Promise.all(convidados.map(p=>api.chamar(`${base}/mesa`,{token:p.token})));
      for(let i=0;i<6;i++){
        const vista=visoes[i].mesa;
        assert.deepEqual(vista.tokens.map(p=>p.id),[identidades[i].id]);
        assert.deepEqual(vista.combate.ordem,[identidades[i].id]);
        assert.equal(vista.combate.valores[identidades[i].id],16-i);
        assert.equal(vista.combate.valores.chefe,undefined);
        assert.equal(vista.poligono3D[0].x,10+i);
        assert.equal(vista.mascara3D?.length,2304);
        assert.ok(!JSON.stringify(vista).includes('Chefe que ninguém viu'));
        assert.ok(!JSON.stringify(vista).includes('objeto-oculto'));
        assert.ok(!JSON.stringify(vista).includes('miniatura-oculta'));
        assert.equal(vista.imagem.endsWith(String(i)),true);
      }
      await api.encerrar();await app.fechar();
      app=criarAplicacaoMultiplayer({diretorioPersistencia:pasta});api=cliente(app);
      await api.iniciar();
      const retomados=await Promise.all(convidados.map(p=>api.chamar(`${base}/eu`,{token:p.token})));
      assert.deepEqual(retomados.map(p=>p.id),convidados.map(p=>p.id));
      assert.equal(retomados[0].sala.participantes.length,7);
      for(let i=0;i<6;i++){
        const vista=(await api.chamar(`${base}/mesa`,{token:convidados[i].token})).mesa;
        assert.deepEqual(vista.tokens.map(p=>p.id),[identidades[i].id]);
        assert.equal(vista.combate.rodada,3);
      }
      const reconexoes=await Promise.all(convidados.map(p=>api.eventos(base,p.token)));
      await aguardar(()=>reconexoes.every(s=>s.maisRecente===11),'recuperação SSE de todas as seis identidades');
      assert.equal((await api.chamar(base)).quantidadeConvidados,6);
    }finally{await api.encerrar();await app.fechar();rmSync(pasta,{recursive:true,force:true});}
  });
