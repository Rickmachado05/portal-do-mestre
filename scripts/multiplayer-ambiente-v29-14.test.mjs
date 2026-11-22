import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const b64=(v)=>`data:image/webp;base64,${Buffer.from(v).toString('base64')}`;
async function req(base,path,token,body){
  const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
}
const unidade=(id,x)=>({id,nome:id,tipo:'jogador',x,y:50,cor:'#ccaa66'});
const ambiente={
  clima:{tipo:'chuva',intensidade:65,vento:25,direcao:90},
  iluminacao:{ativa:true,ambiente:28,credencial:'SECRETO'},
  luzes:[{x:85,y:45,cor:'#ffcc88',alcance:16,ativa:true,nome:'Luz da sala secreta'}],
  marcadores:[{id:'s',x:92,y:50,texto:'SALA SECRETA',notas:'NOTAS PRIVADAS'}],
  desenhos:[{id:'d',cor:'#ffcccc',espessura:3,pontos:[{x:82,y:80},{x:93,y:80}],segredo:'SENHA'}],
  notas:'SEGREDO MESTRE',barreiras:[{x1:50,x2:50}],outros:'VAZAMENTO',
};
async function montarSala(){
  const app=criarAplicacaoMultiplayer(),srv=await app.escutar(0);
  const base=`http://127.0.0.1:${srv.port}/api/multiplayer`;
  const mestre=(await req(base,'/salas',null,{campanha:'Arena',campanhaId:'clima-29-14'})).data;
  const rota=`/salas/${mestre.codigo}`;
  const convidado=(await req(base,`${rota}/entrar`,null,{apelido:'Ana'})).data;
  return {app,base,mestre,rota,convidado};
}
test('v29.14: cena aberta envia apenas ambiente validado e usa clima/luz/desenho/marcação públicos',async()=>{
  const s=await montarSala();try{
    const cena={cenaId:'a',cenaNome:'Arena',visibilidade:'total',modoMesa:'2d',imagem:b64('imagem publica'),
      tokens:[unidade('ana',20)],ambiente};
    assert.equal((await req(s.base,`${s.rota}/mesa`,s.mestre.token,cena)).status,200);
    const publicado=(await req(s.base,`${s.rota}/mesa`,s.convidado.token)).data.mesa;
    assert.equal(publicado.ambiente.clima.tipo,'chuva');
    assert.equal(publicado.ambiente.iluminacao.ambiente,28);
    assert.equal(publicado.ambiente.luzes[0].alcance,16);
    assert.equal(publicado.ambiente.marcadores[0].texto,'SALA SECRETA');
    assert.equal(publicado.ambiente.desenhos[0].pontos.length,2);
    assert.doesNotMatch(JSON.stringify(publicado),/NOTAS PRIVADAS|SENHA|VAZAMENTO|Luz da sala secreta|SEGREDO MESTRE/);
  }finally{await s.app.fechar();}
});
test('v29.14: visão individual jamais transmite coordenadas, nomes secretos nem geometria do ambiente',async()=>{
  const s=await montarSala();try{
    const cena={cenaId:'a',cenaNome:'Arena',visibilidade:'individual',modoMesa:'2d',imagem:b64('imagem completa proibida'),
      tokens:[unidade('ana',20),unidade('bia',85)],grupo:[],ambiente,
      vistas:[{personagemId:'ana',imagem:b64('recorte seguro'),idsVisiveis:['ana']}]};
    assert.equal((await req(s.base,`${s.rota}/mesa`,s.mestre.token,cena)).status,200);
    assert.equal((await req(s.base,`${s.rota}/atribuir`,s.mestre.token,{pessoaId:s.convidado.id,personagemId:'ana'})).status,200);
    const publicado=(await req(s.base,`${s.rota}/mesa`,s.convidado.token)).data.mesa;
    assert.equal(publicado.imagem,b64('recorte seguro'));
    assert.deepEqual(publicado.tokens.map(t=>t.id),['ana']);
    assert.deepEqual(publicado.ambiente,{clima:ambiente.clima});
    assert.doesNotMatch(JSON.stringify(publicado),/SALA SECRETA|NOTAS|SENHA|imagem completa proibida|"luzes"|"marcadores"|"desenhos"|"barreiras"/);
  }finally{await s.app.fechar();}
});
test('v29.14: cenas restritas não entregam informações ambientais do cenário',async()=>{
  const s=await montarSala();try{
    assert.equal((await req(s.base,`${s.rota}/mesa`,s.mestre.token,{cenaId:'a',visibilidade:'restrita',tokens:[unidade('ana',20)],ambiente})).status,200);
    const publicado=(await req(s.base,`${s.rota}/mesa`,s.convidado.token)).data.mesa;
    assert.equal(publicado.ambiente,undefined);assert.equal(publicado.imagem,null);
  }finally{await s.app.fechar();}
});
test('v29.14: publicador do mestre projeta ambiente e recorte seguro; a tela do convidado não busca a campanha',()=>{
  const ler=(f)=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
  const pub=ler('src/multiplayer/PublicadorMesa.tsx'),tela=ler('src/multiplayer/MesaConvidado2D.tsx');
  const visao=ler('src/multiplayer/visaoIndividualPublicada.ts');
  assert.match(pub,/prepararAmbientePublicado/);assert.match(pub,/ambiente:\{clima:ambiente\.clima\}/);
  assert.match(tela,/AmbienteConvidado2D/);assert.doesNotMatch(tela,/buscarCampanha|indexedDB|localStorage/);
  assert.match(visao,/desenharAmbienteDentroDaVisao/);assert.match(visao,/ctx\.clip\(\)/);
  assert.match(visao,/pontoDentroDoPoligono\(\{x,y\},visao\)/);
});
