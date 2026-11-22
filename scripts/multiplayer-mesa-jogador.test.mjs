import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const avatar='data:image/webp;base64,AAAA';
test('Mesa do Jogador: retratos compactos, proporção e proteção de cena restrita',async()=>{
  const app=criarAplicacaoMultiplayer();
  const end=await app.escutar(0);
  const raiz=`http://127.0.0.1:${end.port}/api/multiplayer`;
  async function pedir(rota,token,corpo){
    const r=await fetch(`${raiz}${rota}`,{
      method:corpo?'POST':'GET',headers:{...(corpo?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},
      ...(corpo?{body:JSON.stringify(corpo)}:{}),
    });
    return {status:r.status,dados:await r.json()};
  }
  try{
    const criada=await pedir('/salas',null,{campanha:'Hexatombe: Avatar',campanhaId:'teste-56'});
    const {codigo,token:mestre}=criada.dados;
    const base=`/salas/${codigo}`;
    const convidado=(await pedir(`${base}/entrar`,null,{apelido:'Ana'})).dados;
    const terceiro=(await pedir(`${base}/entrar`,null,{apelido:'Bia'})).dados;
    const cena={cenaId:'cena-56',cenaNome:'Arena',visibilidade:'total',aspecto:2.25,imagem:null,tokens:[
      {id:'morgana',nome:'Morgana',tipo:'jogador',x:22,y:33,cor:'#368bc9',imagem:avatar},
      {id:'naeris',nome:'Naeris',tipo:'jogador',x:73,y:81,cor:'#cb9c52',imagem:avatar},
      {id:'npc',nome:'Inimigo',tipo:'inimigo',x:50,y:50,imagem:avatar},
    ]};
    assert.equal((await pedir(`${base}/mesa`,mestre,cena)).status,200);
    assert.equal((await pedir(`${base}/atribuir`,mestre,{pessoaId:convidado.id,personagemId:'morgana'})).status,200);
    assert.equal((await pedir(`${base}/atribuir`,mestre,{pessoaId:terceiro.id,personagemId:'naeris'})).status,200);
    let quadro=(await pedir(`${base}/mesa`,convidado.token)).dados.mesa;
    assert.equal(quadro.aspecto,2.25);
    assert.equal(quadro.tokens.length,2);
    assert.equal(quadro.tokens[0].imagem,avatar);
    // A galeria deve mostrar o retrato da equipe independente da posição no mapa.
    const comGrupo={...cena,grupo:[
      {id:'morgana',nome:'Morgana',tipo:'jogador',cor:'#368bc9',imagem:avatar,enquadramento:{modo:'conter',largura:145,altura:80,x:20,y:-15,zoom:1.7}},
      {id:'naeris',nome:'Naeris',tipo:'jogador',cor:'#cb9c52',imagem:avatar,enquadramento:{modo:'modo-invalido',largura:600,altura:-2,x:-900,y:900,zoom:100,segredo:'não-publicar'}},
      {id:'npc',nome:'Inimigo secreto',tipo:'npc',cor:'#ff0000',imagem:avatar},
      {id:'outro',nome:'Outro personagem',tipo:'jogador',cor:'cor inválida',imagem:'https://example.com/secret.png'},
    ]};
    assert.equal((await pedir(`${base}/mesa`,mestre,comGrupo)).status,200);
    quadro=(await pedir(`${base}/mesa`,convidado.token)).dados.mesa;
    assert.equal(quadro.grupo.length,3,'NPCs não entram no grupo compartilhado');
    assert.equal(quadro.grupo[0].imagem,avatar);
    assert.deepEqual(quadro.grupo[0].enquadramento,{modo:'conter',largura:145,altura:80,x:20,y:-15,zoom:1.7},'O retrato preserva o enquadramento salvo pelo mestre');
    assert.deepEqual(quadro.grupo[1].enquadramento,{modo:'automatico',largura:250,altura:40,x:-100,y:100,zoom:3},'O servidor limita enquadramentos fora de alcance');
    assert.equal('segredo' in quadro.grupo[1].enquadramento,false,'Propriedades externas não são transmitidas');
    assert.equal(quadro.grupo[2].imagem,undefined,'URL externa de retrato é rejeitada');
    assert.equal(quadro.grupo[2].cor,'#c6ab79','Cor inválida é saneada');
    assert.equal(quadro.grupo[0].x,undefined,'O grupo não transporta coordenadas');
    assert.equal(quadro.tokens.some(t=>t.nome==='Inimigo'),false);
    assert.equal((await pedir(`${base}/mesa`,mestre,{...comGrupo,visibilidade:'restrita'})).status,200);
    quadro=(await pedir(`${base}/mesa`,convidado.token)).dados.mesa;
    assert.deepEqual(quadro.tokens.map(t=>t.nome),['Morgana']);
    assert.deepEqual(quadro.grupo.map(t=>t.nome),['Morgana','Naeris','Outro personagem']);
    assert.equal(quadro.grupo[1].x,undefined,'A galeria não revela posições em cenas com neblina');
    assert.deepEqual(quadro.grupo[0].enquadramento,{modo:'conter',largura:145,altura:80,x:20,y:-15,zoom:1.7},'O enquadramento permanece nas cenas restritas sem revelar movimento');
    assert.equal(quadro.imagem,null);
    const quadroOutro=(await pedir(`${base}/mesa`,terceiro.token)).dados.mesa;
    assert.deepEqual(quadroOutro.tokens.map(t=>t.nome),['Naeris']);
    assert.equal((await pedir(`${base}/mesa`,mestre)).dados.mesa.tokens.length,2);
    assert.equal((await pedir(`${base}/mesa`,convidado.token,{...cena,visibilidade:'total'})).status,403);
    assert.equal((await pedir(`${base}/mesa`,mestre,{...cena,aspecto:99,tokens:[{...cena.tokens[0],imagem:'data:text/html;base64,AAAA'}]})).status,200);
    quadro=(await pedir(`${base}/mesa`,mestre)).dados.mesa;
    assert.equal(quadro.aspecto,1.6);
    assert.equal(quadro.tokens[0].imagem,undefined);
  }finally{await app.fechar();}
});
