import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const requisicao=async(url,token,body)=>{
 const response=await fetch(url,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,data:await response.json()};
};
test('v29.15.17: iniciativa pública só contém participantes visíveis para cada convidado',async()=>{
 const app=criarAplicacaoMultiplayer();const host=await app.escutar(0);
 try{
  const base=`http://127.0.0.1:${host.port}/api/multiplayer/salas`;
  const mestre=(await requisicao(base,null,{campanha:'Combate',campanhaId:'c-combate'})).data;
  const rota=`${base}/${mestre.codigo}`;
  const a=(await requisicao(`${rota}/entrar`,null,{apelido:'Ana'})).data;
  const b=(await requisicao(`${rota}/entrar`,null,{apelido:'Bia'})).data;
  const token=(id,tipo='jogador')=>({id,nome:id,tipo,x:50,y:50,cor:'#aaccdd',...(tipo==='npc'?{publicado:true}:{})});
  const mesa={cenaId:'arena',cenaNome:'Arena',modoMesa:'2d',visibilidade:'individual',
   tokens:[token('ana'),token('bia'),token('monstro','npc'),{...token('secreto','npc'),oculto:true}],
   vistas:[{personagemId:'ana',imagem:'data:image/webp;base64,AAAA',idsVisiveis:['monstro']},
    {personagemId:'bia',imagem:'data:image/webp;base64,BBBB',idsVisiveis:[]}],
   combate:{ativo:true,rodada:5,turnoId:'monstro',ordem:['monstro','ana','secreto','bia']}};
  assert.equal((await requisicao(`${rota}/mesa`,mestre.token,mesa)).status,200);
  assert.equal((await requisicao(`${rota}/atribuir`,mestre.token,{pessoaId:a.id,personagemId:'ana'})).status,200);
  assert.equal((await requisicao(`${rota}/atribuir`,mestre.token,{pessoaId:b.id,personagemId:'bia'})).status,200);
  const av=(await requisicao(`${rota}/mesa`,a.token)).data.mesa;
  const bv=(await requisicao(`${rota}/mesa`,b.token)).data.mesa;
  assert.deepEqual(av.combate,{ativo:true,rodada:5,turnoId:'monstro',ordem:['monstro','ana']});
  assert.deepEqual(bv.combate,{ativo:true,rodada:5,turnoId:null,ordem:['bia']});
  assert.doesNotMatch(JSON.stringify(bv),/monstro|secreto|ana"/);
  const vistaSemPersonagem=(await requisicao(`${rota}/mesa`,(await requisicao(`${rota}/entrar`,null,{apelido:'Clara'})).data.token)).data.mesa;
  assert.deepEqual(vistaSemPersonagem.combate.ordem,[]);
  const total=(await requisicao(`${rota}/mesa`,mestre.token,{...mesa,visibilidade:'total'}));
  assert.equal(total.status,200);
  const cv=(await requisicao(`${rota}/mesa`,b.token)).data.mesa;
  assert.deepEqual(cv.combate.ordem,['monstro','ana','bia']);
  assert.equal(cv.combate.ordem.includes('secreto'),false);
  const privado=(await requisicao(`${rota}/mesa`,mestre.token,{...mesa,visibilidade:'restrita'}));
  assert.equal(privado.status,200);
  const pv=(await requisicao(`${rota}/mesa`,b.token)).data.mesa;
  assert.deepEqual(pv.combate.ordem,[]);assert.equal(pv.combate.turnoId,null);
 }finally{await app.fechar();}
});
test('v29.15.17: menu de combate do jogador usa somente a ficha autorizada e não edita turnos',()=>{
 const menu=readFileSync(new URL('../src/multiplayer/CombateConvidado.tsx',import.meta.url),'utf8');
 const player=readFileSync(new URL('../src/multiplayer/MesaConvidado2D.tsx',import.meta.url),'utf8');
 assert.match(menu,/somente leitura/);assert.doesNotMatch(menu,/onRolarAcao|onRolarFormula/);
 assert.doesNotMatch(menu,/setTurno|atualizarUnidade|onAlterarIniciativa/);
 assert.match(player,/CombateConvidado/);
});
test('v29.15.17: desenho 3D reutiliza motor do mestre e é enviado à mesma rota autenticada',()=>{
 const code=readFileSync(new URL('../src/multiplayer/MesaConvidado3D.tsx',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../src/multiplayer/MesaConvidado2D.tsx',import.meta.url),'utf8');
 assert.match(code,/sala\.previsualizarDesenho/);assert.match(code,/chaoParaPercentual3D/);
 assert.match(code,/onConcluirDesenho/);assert.match(editor,/void transmitirDesenho\(pendente\)/);
 assert.match(editor,/desenhosPendentes=/);
});
