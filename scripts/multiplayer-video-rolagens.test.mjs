import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

async function criar(){
 const app=criarAplicacaoMultiplayer();const {port}=await app.escutar(0);const raiz=`http://127.0.0.1:${port}/api/multiplayer/salas`;
 async function j(path,token,obj){const res=await fetch(raiz+path,{method:obj?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(obj?{'Content-Type':'application/json'}:{})},...(obj?{body:JSON.stringify(obj)}:{})});return {status:res.status,data:await res.json()};}
 const sala=(await j('',null,{campanha:'RPG',campanhaId:'c'})).data;const base=`/${sala.codigo}`;
 const ana=(await j(base+'/entrar',null,{apelido:'Ana'})).data;const bia=(await j(base+'/entrar',null,{apelido:'Bia'})).data;
 await j(base+'/mesa',sala.token,{cenaId:'cena',cenaNome:'Arena',visibilidade:'total',tokens:[{id:'a',nome:'Ana',tipo:'jogador',x:20,y:20,cor:'#112233'},{id:'b',nome:'Bia',tipo:'jogador',x:30,y:30,cor:'#445566'}]});
 await j(base+'/fichas',sala.token,{personagens:['a','b'].map(id=>({id,nome:id,elemento:'terra',classe:'Lutador',hp:100,hpMax:100,mana:50,manaMax:50,ca:10,escudo:0,temFicha:true,acoes:[]}))});
 await j(base+'/atribuir',sala.token,{pessoaId:ana.id,personagemId:'a'});
 await j(base+'/atribuir',sala.token,{pessoaId:bia.id,personagemId:'b'});
 const clip=new Uint8Array(512).fill(42);clip.set([0x1a,0x45,0xdf,0xa3],0);
 async function video(path,token,method='GET',mime='video/webm'){const res=await fetch(raiz+path,{method,headers:{Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':mime}:{})},...(method==='POST'?{body:clip}:{})});return {status:res.status,bytes:res.ok&&method==='GET'?new Uint8Array(await res.arrayBuffer()):null};}
 return {app,j,video,base,sala,ana,bia,clip};
}

test('autor envia uma gravação única, outro convidado vê os mesmos bytes e ninguém relança a física',async()=>{
 const {app,j,video,base,sala,ana,bia,clip}=await criar();try{
  const prep=await j(base+'/rolar',ana.token,{tipo:'preparar',comando:{tipo:'livre',formula:'2d8+3'},visibilidade:'publica'});
  assert.equal(prep.status,200);const id=prep.data.preparacao.id;
  const rolagem=(await j(base+'/rolar',ana.token,{tipo:'concluir',id,dados:[2,7]})).data.rolagem;
  assert.equal(rolagem.total,12);
  assert.notEqual(rolagem.id,id,'o ID do histórico é diferente do ID físico original');
  const uri=base+`/rolagens/${id}/video`;
  const uriDoEspectador=base+`/rolagens/${rolagem.id}/video`;
  assert.equal((await video(uri,bia.token,'POST')).status,403);
  assert.equal((await video(uri,ana.token,'POST','image/png')).status,415);
  assert.equal((await video(uri,ana.token,'POST')).status,201);
  for(const token of [sala.token,ana.token,bia.token]){
    for(const caminho of [uri,uriDoEspectador]){
      const ver=await video(caminho,token);
      assert.equal(ver.status,200,'o cliente que escuta o evento precisa conseguir buscar pelo ID do histórico');
      assert.deepEqual(ver.bytes,clip);
    }
  }
  assert.equal((await j(base+'/rolagens',bia.token)).data.rolagens[0].total,12);
 }finally{await app.fechar();}
});

test('gravação privada não fica disponível para outros convidados',async()=>{
 const {app,j,video,base,sala,ana,bia}=await criar();try{
  const id=(await j(base+'/rolar',ana.token,{tipo:'preparar',comando:{tipo:'livre',formula:'1d20'},visibilidade:'mestre'})).data.preparacao.id;
  const concluida=await j(base+'/rolar',ana.token,{tipo:'concluir',id,dados:[13]});
  assert.equal(concluida.status,201);
  const path=base+`/rolagens/${id}/video`;
  const pathFinal=base+`/rolagens/${concluida.data.rolagem.id}/video`;
  assert.equal((await video(path,ana.token,'POST')).status,201);
  for(const caminho of [path,pathFinal]){
    assert.equal((await video(caminho,bia.token)).status,403);
    assert.equal((await video(caminho,ana.token)).status,200);
    assert.equal((await video(caminho,sala.token)).status,200);
  }
 }finally{await app.fechar();}
});

test('mestre também compartilha captura com ID da própria rolagem',async()=>{
 const {app,j,video,base,sala,ana}=await criar();try{
  const result=await j(base+'/rolar',sala.token,{tipo:'mestre',rolagemId:'mestre-001',formula:'1d10',dados:[8],visibilidade:'publica'});
  assert.equal(result.status,201);
  const path=base+'/rolagens/mestre-001/video';
  const pathFinal=base+`/rolagens/${result.data.rolagem.id}/video`;
  assert.notEqual(result.data.rolagem.id,'mestre-001');
  assert.equal((await video(path,ana.token,'POST')).status,403);
  assert.equal((await video(path,sala.token,'POST')).status,201);
  assert.equal((await video(path,ana.token)).status,200);
  assert.equal((await video(pathFinal,ana.token)).status,200);
 }finally{await app.fechar();}
});

test('evento de vídeo usa ID consultável pelo espectador (regressão do 404)',async()=>{
 const {app,j,video,base,ana,bia}=await criar();
 try{
  const prep=await j(base+'/rolar',ana.token,{tipo:'preparar',comando:{tipo:'livre',formula:'1d6'},visibilidade:'publica'});
  const origemId=prep.data.preparacao.id;
  const rolagem=(await j(base+'/rolar',ana.token,{tipo:'concluir',id:origemId,dados:[4]})).data.rolagem;
  assert.notEqual(rolagem.id,origemId);
  assert.equal((await video(base+`/rolagens/${origemId}/video`,ana.token,'POST')).status,201);
  // O aviso SSE contém rolagem.id, que deve ser aceito no GET.
  const recebido=await video(base+`/rolagens/${rolagem.id}/video`,bia.token);
  assert.equal(recebido.status,200);
 }finally{await app.fechar();}
});
