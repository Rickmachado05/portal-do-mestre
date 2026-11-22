import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const ler=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
async function requisitar(raiz,rota,token,corpo){
  const resposta=await fetch(`${raiz}${rota}`,{method:corpo?'POST':'GET',
    headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(corpo?{'Content-Type':'application/json'}:{})},
    ...(corpo?{body:JSON.stringify(corpo)}:{})});
  return {status:resposta.status,dados:await resposta.json()};
}

test('v29.15.10: publica somente a aparência da skin ativa e o tamanho real, com limites e ocultação',async()=>{
  const app=criarAplicacaoMultiplayer();const {port}=await app.escutar(0);
  const raiz=`http://127.0.0.1:${port}/api/multiplayer`;
  try{
    const mestre=(await requisitar(raiz,'/salas',null,{campanha:'Teste visual',campanhaId:'paridade-token-v29-15-10'})).dados;
    const rota=`/salas/${mestre.codigo}`;
    const jogador=(await requisitar(raiz,`${rota}/entrar`,null,{apelido:'Convidado'})).dados;
    const token={id:'avatar',nome:'Personagem',tipo:'jogador',x:42,y:51,cor:'#662299',
      travado:false,topview:true,tamanho:132,rotacao:-48,espelhadoX:true,
      ocultarNome:true,fundo:'transparent',enquadramento:{x:-25,y:17,zoom:1.8},
      idlePausado:true,idleVelocidade:1.5,segredo:'não transmitir'};
    const oculto={id:'inimigo',nome:'Boss oculto',tipo:'inimigo',x:65,y:30,cor:'#993322',publicado:true,oculto:true};
    const cena={cenaId:'arena',cenaNome:'Arena',visibilidade:'total',imagem:null,tokens:[token,oculto]};
    assert.equal((await requisitar(raiz,`${rota}/mesa`,mestre.token,cena)).status,200);
    const vista=(await requisitar(raiz,`${rota}/mesa`,jogador.token)).dados.mesa;
    assert.deepEqual(vista.tokens.map(t=>t.id),['avatar']);
    const publico=vista.tokens[0];
    for(const chave of ['id','nome','tipo','x','y','cor','travado','topview','tamanho','rotacao',
      'espelhadoX','ocultarNome','fundo','enquadramento','idlePausado','idleVelocidade']){
      assert.deepEqual(publico[chave],token[chave],`campo ${chave}`);
    }
    assert.equal(publico.segredo,undefined);
    assert.equal(publico.skins,undefined);
    assert.equal(publico.hp,undefined);
    const invalido={...token,tamanho:999999,rotacao:999999,fundo:'url(javascript:alert(1))',
      enquadramento:{x:999,y:-999,zoom:Infinity},idleVelocidade:37};
    assert.equal((await requisitar(raiz,`${rota}/mesa`,mestre.token,{...cena,tokens:[invalido]})).status,200);
    const seguro=(await requisitar(raiz,`${rota}/mesa`,jogador.token)).dados.mesa.tokens[0];
    assert.equal(seguro.tamanho,300);
    assert.equal(seguro.rotacao,0);
    assert.equal(seguro.fundo,'#22252d');
    assert.deepEqual(seguro.enquadramento,{x:100,y:-100,zoom:1});
    assert.equal(seguro.idleVelocidade,1);
    // Mesmo com dados visuais novos, cena restrita não revela outros personagens.
    assert.equal((await requisitar(raiz,`${rota}/mesa`,mestre.token,{...cena,visibilidade:'restrita'})).status,200);
    assert.deepEqual((await requisitar(raiz,`${rota}/mesa`,jogador.token)).dados.mesa.tokens,[]);
  }finally{await app.fechar();}
});

test('v29.15.10: estrutura visual, GIF, enquadramento, aro e palco seguem o mestre sem alterar movimentação',()=>{
  const app=ler('src/App.tsx');
  const pub=ler('src/multiplayer/PublicadorMesa.tsx');
  const player=ler('src/multiplayer/MesaConvidado2D.tsx');
  const token=ler('src/multiplayer/TokenConvidadoFluido.tsx');
  const css=ler('src/multiplayer/MesaConvidado2DParity.css');
  assert.match(app,/tokensTopview=\{Object\.fromEntries/);
  assert.match(pub,/aparenciaTokenAtiva\(u,cena\.tokens\[u\.id\]\)/);
  assert.match(pub,/enquadramentoTokenAtivo\(u,cena\.tokens\[u\.id\]\)/);
  assert.match(pub,/parametrosIdleAtivos\(u,cena\.tokens\[u\.id\]\)/);
  const corpo=ler('src/lib/CenaVisual2D.tsx');
  assert.match(token,/<CorpoTokenCena2D/);
  assert.match(corpo,/className="token-rosto"/);
  assert.match(corpo,/className="token-arte" style=\{estiloEnquadramento\(enquadramento\)\}/);
  assert.match(corpo,/className="token-nome"/);
  assert.match(corpo,/<TokenIdle src=\{imagem\}/);
  assert.match(token,/--tamanho-token/);
  assert.match(token,/registrarPosicao/);
  assert.match(player,/new ResizeObserver\(medir\)/);
  assert.match(player,/dimensoesPalco2D\(medidasMapa,aspectoMapa,escalaCena\)/);
  assert.match(app,/dimensoesPalco2D\(viewport,proporcaoNatural,escalaCena\)/);
  const calculo=ler('src/lib/dimensoesPalco2D.ts');
  assert.match(calculo,/viewport\.largura>820\?230:80/);
  assert.match(calculo,/viewport\.altura>580\?100:50/);
  assert.match(css,/width:var\(--tamanho-token,70px\)/);
  assert.match(css,/pm-jogo-token\.token-topview\.meu/);
});
