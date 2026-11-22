import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const ler=(rel)=>readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');
const consultar=async(raiz,rota,token,body)=>{
  const resposta=await fetch(`${raiz}${rota}`,{
    method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
  });
  return {status:resposta.status,dados:await resposta.json()};
};

test('v29.10: modo de mesa controlado pelo mestre, permissões e cena restrita',async()=>{
  const servidor=criarAplicacaoMultiplayer();
  const escuta=await servidor.escutar(0);
  const raiz=`http://127.0.0.1:${escuta.port}/api/multiplayer`;
  try{
    const criado=(await consultar(raiz,'/salas',null,{campanha:'Teste',campanhaId:'v29-10'})).dados;
    const rota=`/salas/${criado.codigo}`;
    const jogador=(await consultar(raiz,`${rota}/entrar`,null,{apelido:'Jogador'})).dados;
    const cena={cenaId:'arena',cenaNome:'Arena 3D',modoMesa:'3d',visibilidade:'total',aspecto:1.8,
      imagem:'data:image/webp;base64,AAAA',tokens:[
        {id:'jogador',nome:'Jogador',tipo:'jogador',x:28,y:38,cor:'#5599aa'},
        {id:'segredo',nome:'Chefe secreto',tipo:'npc',x:46,y:57,cor:'#cc0000'},
      ],grupo:[{id:'jogador',nome:'Jogador',tipo:'jogador',cor:'#5599aa'}],
      dadosSigilosos:'NUNCA ENVIAR',cameraPrivada:{x:12},
    };
    assert.equal((await consultar(raiz,`${rota}/mesa`,criado.token,cena)).status,200);
    let retorno=(await consultar(raiz,`${rota}/mesa`,jogador.token)).dados.mesa;
    assert.equal(retorno.modoMesa,'3d');
    assert.equal(retorno.aspecto,1.8);
    assert.deepEqual(retorno.tokens.map(t=>t.id),['jogador']);
    assert.equal('dadosSigilosos' in retorno,false);
    assert.equal('cameraPrivada' in retorno,false);
    assert.equal((await consultar(raiz,`${rota}/mesa`,jogador.token,{...cena,modoMesa:'2d'})).status,403);
    assert.equal((await consultar(raiz,`${rota}/mesa`,criado.token,{...cena,visibilidade:'restrita'})).status,200);
    retorno=(await consultar(raiz,`${rota}/mesa`,jogador.token)).dados.mesa;
    assert.equal(retorno.modoMesa,'3d');
    assert.equal(retorno.imagem,null);
    assert.deepEqual(retorno.tokens,[]);
    assert.equal((await consultar(raiz,`${rota}/mesa`,criado.token,{...cena,modoMesa:'campo-secreto'})).status,200);
    retorno=(await consultar(raiz,`${rota}/mesa`,jogador.token)).dados.mesa;
    assert.equal(retorno.modoMesa,'2d');
  }finally{await servidor.fechar();}
});

test('v29.10: convidado 3D usa só projeção pública, sem armazenamento da campanha',()=>{
  const visualizador=ler('src/multiplayer/MesaConvidado3D.tsx');
  const mapa=ler('src/multiplayer/MesaConvidado2D.tsx');
  const publicador=ler('src/multiplayer/PublicadorMesa.tsx');
  assert.match(visualizador,/import \* as THREE from 'three'/);
  assert.match(visualizador,/criarSala3D/,'o convidado usa exatamente o motor de cena do mestre');
  assert.match(visualizador,/dados\.tokens/,'as posições 3D partem somente dos tokens públicos recebidos');
  assert.match(visualizador,/mesa\.visibilidade|comPermissao/);
  assert.doesNotMatch(visualizador,/indexedDB|localStorage|buscarCampanha|lerCampanha/);
  assert.match(visualizador,/onSolicitarMovimento/);
  assert.match(mapa,/modoMestre/);
  assert.match(mapa,/MesaConvidado3D/);
  assert.match(mapa,/if\(visualizacao==='3d'\)return;/,'câmera 3D não deve disputar ponteiro com pan do 2D');
  assert.match(publicador,/modoMesa/);
  assert.match(ler('src/App.tsx'),/modoMesa=\{MODO_3D\?'3d':'2d'\}/);
});
