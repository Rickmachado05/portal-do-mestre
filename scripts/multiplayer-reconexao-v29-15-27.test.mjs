import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const cena={cenaId:'arena',cenaNome:'Arena de teste',visibilidade:'total',modoMesa:'3d',
  tokens:[{id:'morgana',nome:'Morgana',tipo:'jogador',x:34,y:49,cor:'#55aacc'},
    {id:'outro',nome:'Outro',tipo:'jogador',x:69,y:20,cor:'#aacc55'}],
  combate:{ativo:true,rodada:2,turnoId:'morgana',ordem:['morgana','outro'],valores:{morgana:19,outro:7}}};
const ficha={id:'morgana',nome:'Morgana',elemento:'Água',classe:'Conjurador',hp:67,hpMax:136,
  mana:213,manaMax:203,ca:10,escudo:0,temFicha:true,acoes:[]};
function cliente(app){
  let base;
  return {
    async ligar(){const addr=await app.escutar(0);base=`http://127.0.0.1:${addr.port}/api/multiplayer`;},
    async req(caminho,{metodo='GET',token,corpo,headers={}}={}){
      const config={method:metodo,headers:{...headers,...(token?{Authorization:`Bearer ${token}`}:{})}};
      if(corpo!==undefined){config.body=JSON.stringify(corpo);config.headers['Content-Type']='application/json';}
      const res=await fetch(base+caminho,config);
      return {status:res.status,dados:await res.json()};
    },
    async blob(caminho,token,bytes,contentType){
      const res=await fetch(base+caminho,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':contentType},body:bytes});
      return {status:res.status,dados:await res.json()};
    },
  };
}

test('v29.15.27: reinício preserva participantes, vínculos, cena 3D, iniciativa, ficha e inventário sem duplicar convidado',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-reconexao-'));
  let app=criarAplicacaoMultiplayer({diretorioPersistencia:pasta});let api=cliente(app);
  let codigo,mestre,ana,bia;
  try{
    await api.ligar();
    const criada=await api.req('/salas',{metodo:'POST',corpo:{campanhaId:'camp-avatar',campanha:'Hexatombe'}});
    assert.equal(criada.status,201);({codigo,token:mestre}=criada.dados);
    const base=`/salas/${codigo}`;
    ana=(await api.req(base+'/entrar',{metodo:'POST',corpo:{apelido:'Ana'}})).dados;
    bia=(await api.req(base+'/entrar',{metodo:'POST',corpo:{apelido:'Bia'}})).dados;
    assert.equal((await api.req(base+'/mesa',{metodo:'POST',token:mestre,corpo:cena})).status,200);
    assert.equal((await api.req(base+'/fichas',{metodo:'POST',token:mestre,corpo:{personagens:[ficha]}})).status,200);
    assert.equal((await api.req(base+'/inventarios',{metodo:'POST',token:mestre,corpo:{personagens:[
      {id:'morgana',nome:'Morgana',itens:[{id:'pocao',nome:'Poção de cura',quantidade:2,categoria:'consumivel',efeito:'cura',valor:'1d8',descricao:'Reservado à Morgana',consumivel:true}]},
      {id:'outro',nome:'Outro',itens:[{id:'pergaminho',nome:'Segredo alheio',quantidade:1,categoria:'documento',efeito:'nenhum',valor:'',descricao:'Privado',consumivel:false}]},
    ]}})).status,200);
    assert.equal((await api.req(base+'/atribuir',{metodo:'POST',token:mestre,corpo:{pessoaId:ana.id,personagemId:'morgana'}})).status,200);
    assert.equal((await api.req(base+'/atribuir',{metodo:'POST',token:mestre,corpo:{pessoaId:bia.id,personagemId:'outro'}})).status,200);
    // Fechar o processo não equivale a encerrar a sala.
    await app.fechar();
    app=criarAplicacaoMultiplayer({diretorioPersistencia:pasta});api=cliente(app);await api.ligar();
    assert.equal((await api.req(base)).status,200);
    const identidade=await api.req(base+'/eu',{token:ana.token});assert.equal(identidade.status,200);
    assert.equal(identidade.dados.id,ana.id);
    assert.equal(identidade.dados.sala.participantes.length,3);
    assert.equal(identidade.dados.sala.participantes.find(p=>p.id===ana.id).personagemId,'morgana');
    assert.equal(identidade.dados.sala.participantes.find(p=>p.id===ana.id).conectado,false);
    const fichaRetomada=await api.req(base+'/ficha',{token:ana.token});
    assert.equal(fichaRetomada.dados.ficha.hp,67);
    assert.equal(fichaRetomada.dados.ficha.mana,213);
    assert.equal((await api.req(base+'/ficha',{token:bia.token})).dados.ficha,null);
    const invAna=(await api.req(base+'/inventario',{token:ana.token})).dados.inventario;
    assert.equal(invAna.itens[0].nome,'Poção de cura');
    assert.doesNotMatch(JSON.stringify(invAna),/Segredo alheio/);
    const invBia=(await api.req(base+'/inventario',{token:bia.token})).dados.inventario;
    assert.equal(invBia.itens[0].nome,'Segredo alheio');
    const mesa=await api.req(base+'/mesa',{token:ana.token});
    assert.equal(mesa.dados.mesa.combate.rodada,2);
    assert.equal(mesa.dados.mesa.modoMesa,'3d');
    assert.equal(mesa.dados.mesa.tokens[0].id,'morgana');
    assert.equal((await api.req(base+'/atribuir',{metodo:'POST',token:mestre,corpo:{pessoaId:bia.id,personagemId:'morgana'}})).status,409);
    assert.equal((await api.req(base+'/eu',{token:'token-falso'})).status,401);
    assert.equal((await api.req(base+'/sair',{metodo:'POST',token:ana.token})).status,200);
    await app.fechar();
    app=criarAplicacaoMultiplayer({diretorioPersistencia:pasta});api=cliente(app);await api.ligar();
    assert.equal((await api.req(base+'/eu',{token:ana.token})).status,401);
    assert.equal((await api.req(base+'/eu',{token:bia.token})).status,200);
    assert.equal((await api.req(base+'/encerrar',{metodo:'POST',token:mestre})).status,200);
    assert.equal((await api.req(base)).status,404);
    assert.equal(readdirSync(pasta).includes(codigo),false,'Encerrar apaga o snapshot e credenciais locais do servidor');
  }finally{await app.fechar();rmSync(pasta,{recursive:true,force:true});}
});

test('v29.15.27: GIF e miniatura são preservados em arquivos privados e download exige autorização após reinício',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-midias-reconexao-'));
  let app=criarAplicacaoMultiplayer({diretorioPersistencia:pasta}),api=cliente(app);
  try{
    await api.ligar();
    const criada=(await api.req('/salas',{metodo:'POST',corpo:{campanhaId:'c',campanha:'C'}})).dados;
    const base=`/salas/${criada.codigo}`;
    const bytes=Buffer.alloc(36);bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(36,8);
    const modelo='mini-123456';
    assert.equal((await api.blob(base+`/modelos3d/${modelo}`,criada.token,bytes,'model/gltf-binary')).status,201);
    const gif=Buffer.concat([Buffer.from('GIF89a'),Buffer.alloc(40)]);
    assert.equal((await api.blob(base+'/midias',criada.token,gif,'image/gif')).status,201);
    await app.fechar();
    const estado=JSON.parse(readFileSync(join(pasta,criada.codigo,'estado.json'),'utf8'));
    assert.equal(JSON.stringify(estado).includes('GIF89a'),false,'Mídias não são embutidas no estado JSON');
    app=criarAplicacaoMultiplayer({diretorioPersistencia:pasta});api=cliente(app);await api.ligar();
    assert.equal((await api.req(base+`/modelos3d/${modelo}`)).status,401);
    // O arquivo continua presente, mas o cliente precisa da credencial e de
    // autorização da cena publicada para obtê-lo. O mestre pode verificá-lo.
    const estadoG=await api.req(base+'/eu',{token:criada.token});
    assert.equal(estadoG.status,200);
    assert.equal(readFileSync(join(pasta,criada.codigo,`glb-${modelo}.bin`)).length,36);
  }finally{await app.fechar();rmSync(pasta,{recursive:true,force:true});}
});
