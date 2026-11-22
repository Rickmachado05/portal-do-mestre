import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const app=criarAplicacaoMultiplayer();
test('música da mesa: sessão, autorização, Range e estado', async()=>{
  const {port}=await app.escutar(0);
  const root=`http://127.0.0.1:${port}/api/multiplayer`;
  const json=async (path,method='GET',body=null,token=null)=>{
    const res=await fetch(root+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:res.status,data:await res.json()};
  };
  try{
    const criado=await json('/salas','POST',{campanha:'Music test',campanhaId:'principal'});
    assert.equal(criado.status,201);
    const {codigo,token:master}=criado.data;
    const path=`/salas/${codigo}`;
    const entrante=await json(path+'/entrar','POST',{apelido:'Tester'});
    const guest=entrante.data.token;
    const id='12345678-1234-1234-1234-123456789abc';
    const buffer=Buffer.alloc(1500,22);
    const upload=async user=>fetch(root+path+'/musicas/'+id,{method:'POST',headers:{Authorization:'Bearer '+user,'Content-Type':'audio/mpeg'},body:buffer});
    assert.equal((await upload(guest)).status,403);
    assert.equal((await upload(master)).status,201);
    const state={id,titulo:'Uma faixa',origem:'arquivo',tocando:true,posicao:21};
    assert.equal((await json(path+'/musica','POST',state,guest)).status,403);
    assert.equal((await json(path+'/musica','POST',state,master)).status,200);
    const music=await json(path+'/musica','GET',null,guest);
    assert.equal(music.data.musica.titulo,'Uma faixa');
    assert.equal(music.data.musica.posicao,21);
    const full=await fetch(root+path+'/musicas/'+id+'?token='+encodeURIComponent(guest));
    assert.equal(full.status,200);assert.equal((await full.arrayBuffer()).byteLength,buffer.length);
    const partial=await fetch(root+path+'/musicas/'+id+'?token='+encodeURIComponent(guest),{headers:{Range:'bytes=40-99'}});
    assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),'bytes 40-99/1500');
    assert.equal((await partial.arrayBuffer()).byteLength,60);
    assert.equal((await fetch(root+path+'/musicas/'+id)).status,401);
    assert.equal((await json(path+'/musica','POST',{id:null},master)).status,200);
    assert.equal((await json(path+'/musica','GET',null,guest)).data.musica,null);
  }finally{await app.fechar();}
});
