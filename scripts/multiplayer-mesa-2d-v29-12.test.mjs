import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';
const ler=arquivo=>readFileSync(new URL(`../${arquivo}`,import.meta.url),'utf8');
const cena={
  cenaId:'cena-2d',cenaNome:'Ruínas',modoMesa:'2d',visibilidade:'total',aspecto:1.7,
  tokens:[
    {id:'morgana',tipo:'jogador',nome:'Morgana',x:45,y:40,cor:'#4488aa'},
    {id:'npc-publico',tipo:'npc',nome:'Mercadora',x:25,y:25,cor:'#ccbb88',publicado:true,segredo:'não expor'},
    {id:'inimigo-publico',tipo:'inimigo',nome:'Sentinela',x:60,y:50,cor:'#dd5544',publicado:true,hp:999,notas:'senha privada'},
    {id:'npc-oculto',tipo:'npc',nome:'Espião secreto',x:80,y:80,cor:'#ffaa11',oculto:true,publicado:true},
    {id:'npc-nao-publicado',tipo:'npc',nome:'NPC reservado',x:85,y:90,cor:'#ffaa11'},
    {id:'inimigo-invalido',tipo:'inimigo',nome:'Chefe inválido',x:40,y:30,publicado:'true'},
  ],grupo:[{id:'morgana',nome:'Morgana',tipo:'jogador',cor:'#4488aa'}],
};
async function chamar(raiz,rota,token,body){
  const resposta=await fetch(`${raiz}${rota}`,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:resposta.status,valor:await resposta.json()};
}
test('v29.12: jogador vê somente NPCs e inimigos explicitamente revelados, sem dados sigilosos',async()=>{
 const app=criarAplicacaoMultiplayer();const servidor=await app.escutar(0);
 const raiz=`http://127.0.0.1:${servidor.port}/api/multiplayer`;
 try{
  const mestre=(await chamar(raiz,'/salas',null,{campanha:'Aventura',campanhaId:'2d-v29-12'})).valor;
  const rota=`/salas/${mestre.codigo}`;
  const jogador=(await chamar(raiz,`${rota}/entrar`,null,{apelido:'Jogador'})).valor;
  assert.equal((await chamar(raiz,`${rota}/mesa`,mestre.token,cena)).status,200);
  const publicada=(await chamar(raiz,`${rota}/mesa`,jogador.token)).valor.mesa;
  assert.deepEqual(publicada.tokens.map(t=>t.id),['morgana','npc-publico','inimigo-publico']);
  assert.deepEqual(publicada.tokens.map(t=>t.tipo),['jogador','npc','inimigo']);
  assert.equal(publicada.tokens.some(t=>t.id==='npc-oculto'),false);
  assert.equal(publicada.tokens.some(t=>t.id==='npc-nao-publicado'),false);
  assert.equal(publicada.tokens.find(t=>t.id==='inimigo-publico').hp,undefined);
  assert.equal(publicada.tokens.find(t=>t.id==='npc-publico').segredo,undefined);
  assert.equal(JSON.stringify(publicada).includes('senha privada'),false);
  assert.equal((await chamar(raiz,`${rota}/atribuir`,mestre.token,{pessoaId:jogador.id,personagemId:'npc-publico'})).status,409,
    'Mesmo revelado, um NPC não pode ser atribuído como personagem jogador');
  assert.equal((await chamar(raiz,`${rota}/atribuir`,mestre.token,{pessoaId:jogador.id,personagemId:'inimigo-publico'})).status,409,
    'Mesmo revelado, um inimigo não pode ser atribuído como personagem jogador');
  // Ocultar a cena bloqueia todos os NPCs e inimigos, mesmo os marcados como revelados.
  assert.equal((await chamar(raiz,`${rota}/mesa`,mestre.token,{...cena,visibilidade:'restrita'})).status,200);
  const restrita=(await chamar(raiz,`${rota}/mesa`,jogador.token)).valor.mesa;
  assert.deepEqual(restrita.tokens,[]);
  assert.equal(restrita.imagem,null);
  // Com personagem atribuído, a restrição continua individual.
  assert.equal((await chamar(raiz,`${rota}/atribuir`,mestre.token,{pessoaId:jogador.id,personagemId:'morgana'})).status,200);
  const comPersonagem=(await chamar(raiz,`${rota}/mesa`,jogador.token)).valor.mesa;
  assert.deepEqual(comPersonagem.tokens.map(t=>t.id),['morgana']);
  assert.equal((await chamar(raiz,`${rota}/mesa`,jogador.token,cena)).status,403);
 }finally{await app.fechar();}
});
test('v29.12: publicador respeita camadas e ocultação; convidados usam somente projeção pública',()=>{
 const publicador=ler('src/multiplayer/PublicadorMesa.tsx');
 const mesa=ler('src/multiplayer/MesaConvidado2D.tsx');
 const servidor=ler('scripts/multiplayer-server.mjs');
 assert.match(publicador,/token\.oculto/);
 assert.match(publicador,/camadas\?\.npcs!==false/);
 assert.match(publicador,/camadas\?\.inimigos!==false/);
 assert.match(publicador,/publicado:true/);
 assert.match(servidor,/token\.publicado!==true/);
 assert.match(mesa,/TokenConvidadoFluido/);
 assert.match(ler('src/multiplayer/TokenConvidadoFluido.tsx'),/pm-jogo-token-npc/);
 assert.doesNotMatch(mesa,/indexedDB|localStorage|buscarCampanha|lerCampanha/);
});
test('v29.12.1: controles do mapa mantêm zoom e acompanhamento sem atalho redundante de movimento',()=>{
 const mapa=ler('src/multiplayer/MesaConvidado2D.tsx');
 assert.match(mapa,/addEventListener\('wheel',roda,\{passive:false\}\)/);
 assert.match(mapa,/setSeguirToken/);
 assert.match(mapa,/centralizarNoPersonagem/);
 assert.doesNotMatch(mapa,/cliqueMover|e\.shiftKey|Shift \+ clique/);
 assert.match(mapa,/Arraste seu token para mover/);
 assert.match(mapa,/Centralizar c.mera no personagem/);
 assert.match(mapa,/aria-pressed=\{seguirToken\}/);
 assert.match(mapa,/\{seguirToken\?'Seguindo':'Seguir'\}/);
 assert.match(mapa,/onSolicitarMovimento=\{onMoverPonto\}/);
 assert.match(mapa,/if\(visualizacao==='3d'\)return;/);
});
