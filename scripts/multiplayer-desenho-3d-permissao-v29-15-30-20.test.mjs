import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

async function req(base,path,token,body){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,body:await r.json()};
}
async function salaTeste(){
 const app=criarAplicacaoMultiplayer(),porta=await app.escutar(0),base=`http://127.0.0.1:${porta.port}/api/multiplayer`;
 const mestre=(await req(base,'/salas',null,{campanha:'Permissão de desenho',campanhaId:'test-permission'})).body;
 const rota=`/salas/${mestre.codigo}`;
 const convidado=(await req(base,`${rota}/entrar`,null,{apelido:'Teste3D'})).body;
 return {app,base,rota,mestre,convidado};
}
function quadro(modoMesa,permitir){return {cenaId:'cena1',cenaNome:'Cena 1',modoMesa,visibilidade:'total',
 imagem:'data:image/webp;base64,AAAA',tokens:[],...(permitir===undefined?{}:{permitirDesenhoJogadores:permitir})};}
const desenho={acao:'adicionar',cenaId:'cena1',pontos:[{x:15,y:25},{x:20,y:35}],cor:'#abcdef',espessura:4};
for(const modo of ['2d','3d']){
 test(`v29.15.30.20: mestre bloqueia e libera o desenho dos convidados na Mesa ${modo.toUpperCase()}`, async()=>{
  const s=await salaTeste();const abort=new AbortController();
  try{
   const control=await fetch(`${s.base}${s.rota}/eventos?token=${encodeURIComponent(s.mestre.token)}&controlador=1`,{signal:abort.signal});
   assert.equal(control.status,200);
   assert.equal((await req(s.base,`${s.rota}/mesa`,s.mestre.token,quadro(modo,false))).status,200);
   assert.equal((await req(s.base,`${s.rota}/mesa`,s.convidado.token)).body.mesa.permitirDesenhoJogadores,false);
   const negado=await req(s.base,`${s.rota}/desenho`,s.convidado.token,desenho);
   assert.equal(negado.status,403);
   assert.match(negado.body.erro||negado.body.mensagem||JSON.stringify(negado.body),/mestre desativou/i);
   assert.equal((await req(s.base,`${s.rota}/mesa`,s.mestre.token,quadro(modo,true))).status,200);
   assert.equal((await req(s.base,`${s.rota}/mesa`,s.convidado.token)).body.mesa.permitirDesenhoJogadores,true);
   const permitido=await req(s.base,`${s.rota}/desenho`,s.convidado.token,desenho);
   assert.equal(permitido.status,201);
   assert.match(permitido.body.id,/^jogador-/);
   // Revoke after starting a session must immediately reject subsequent submissions.
   assert.equal((await req(s.base,`${s.rota}/mesa`,s.mestre.token,quadro(modo,false))).status,200);
   assert.equal((await req(s.base,`${s.rota}/desenho`,s.convidado.token,desenho)).status,403);
  } finally {abort.abort();await s.app.fechar();}
 });
}
test('v29.15.30.20: campanhas antigas continuam permitindo desenho até o mestre desativar',async()=>{
 const s=await salaTeste();try{
  await req(s.base,`${s.rota}/mesa`,s.mestre.token,quadro('3d'));
  assert.equal((await req(s.base,`${s.rota}/mesa`,s.convidado.token)).body.mesa.permitirDesenhoJogadores,true);
 }finally{await s.app.fechar();}
});
test('v29.15.30.20: UI 2D/3D compartilha uma permissão persistida na cena, sem permitir escrita direta do convidado',()=>{
 const root=new URL('../src/',import.meta.url);
 const app=readFileSync(new URL('App.tsx',root),'utf8');
 const cena=readFileSync(new URL('lib/mesaCompartilhada.ts',root),'utf8');
 const publicador=readFileSync(new URL('multiplayer/PublicadorMesa.tsx',root),'utf8');
 const guest=readFileSync(new URL('multiplayer/MesaConvidado2D.tsx',root),'utf8');
 const canvas=readFileSync(new URL('multiplayer/MesaConvidado3D.tsx',root),'utf8');
 const mestre3d=readFileSync(new URL('mesa3d/Mesa3DPrototipo.tsx',root),'utf8');
 assert.match(app,/permitirDesenhoJogadores: c.permitirDesenhoJogadores !== false/);
 assert.match(cena,/permitirDesenhoJogadores:c.permitirDesenhoJogadores!==false/);
 assert.match(mestre3d,/Autorizar desenho dos jogadores \(2D e 3D\)/);
 assert.match(publicador,/permitirDesenhoJogadores:cena.permitirDesenhoJogadores!==false/);
 assert.match(guest,/mesa\?\.permitirDesenhoJogadores!==false/);
 assert.match(guest,/onConcluirDesenho=\{concluirDesenho3D\}/);
 assert.match(canvas,/sala\.previsualizarDesenho\(rascunho3D,configuracao\)/);
 assert.match(canvas,/desenhoRef\.current\.aoConcluir\?\.\(r\)/);
});
