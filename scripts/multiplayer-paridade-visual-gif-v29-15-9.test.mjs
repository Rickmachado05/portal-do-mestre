import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarAplicacaoMultiplayer} from './multiplayer-server.mjs';

const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64');
const prefixo='/api/multiplayer';

test('v29.15.9: GIF público usa mídia autenticada e não é anexado ao quadro SSE',async()=>{
  const app=criarAplicacaoMultiplayer();const {port}=await app.escutar(0);
  const raiz=`http://127.0.0.1:${port}${prefixo}`;
  const pedido=async(caminho,token,body)=>{
    const r=await fetch(`${raiz}${caminho}`,{method:body?'POST':'GET',
      headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
    return {status:r.status,data:await r.json()};
  };
  try{
    const {data:criacao}=await pedido('/salas',null,{campanha:'Teste',campanhaId:'visual-gif'});
    const base=`/salas/${criacao.codigo}`;
    const {data:jogador}=await pedido(`${base}/entrar`,null,{apelido:'Jogador'});
    const {data:outro}=await pedido(`${base}/entrar`,null,{apelido:'Outro'});
    const enviarGif=async(token)=>fetch(`${raiz}${base}/midias`,{method:'POST',headers:{'Content-Type':'image/gif',Authorization:`Bearer ${token}`},body:gif});
    assert.equal((await enviarGif(jogador.token)).status,403,'convidado não pode publicar arquivos');
    const upload=await enviarGif(criacao.token);assert.equal(upload.status,201);
    const {id}=await upload.json();assert.match(id,/^[a-f0-9]{32}$/);
    const imagem='data:image/webp;base64,AAAA';
    const cena={cenaId:'cena',cenaNome:'Arena',visibilidade:'total',aspecto:0.55,escalaMapa:1.5,imagem:null,
      grupo:[{id:'hero',nome:'Hero',tipo:'jogador',cor:'#ffcc00',imagem,animacao:id}],
      tokens:[{id:'hero',nome:'Hero',tipo:'jogador',cor:'#ffcc00',x:23,y:30,imagem,animacao:id},
        {id:'inimigo',nome:'Inimigo',tipo:'inimigo',cor:'#ff0000',x:80,y:60,imagem,animacao:id,publicado:true}]};
    assert.equal((await pedido(`${base}/mesa`,criacao.token,cena)).status,200);
    const quadro=(await pedido(`${base}/mesa`,jogador.token)).data.mesa;
    assert.equal(quadro.escalaMapa,1.5);
    assert.equal(quadro.tokens[0].animacao,id);
    assert.equal(quadro.grupo[0].animacao,id);
    assert.ok(JSON.stringify(quadro).length<10000,'o GIF não foi embutido no quadro');
    const url=`${raiz}${base}/midias/${id}`;
    const valido=await fetch(`${url}?token=${encodeURIComponent(jogador.token)}`);
    assert.equal(valido.status,200);assert.equal(valido.headers.get('content-type'),'image/gif');
    assert.deepEqual(Buffer.from(await valido.arrayBuffer()),gif);
    assert.equal((await fetch(url)).status,401,'mídia exige credencial');
    assert.equal((await pedido(`${base}/mesa`,criacao.token,{...cena,visibilidade:'restrita',grupo:[],tokens:cena.tokens.slice(0,1)})).status,200);
    assert.equal((await fetch(`${url}?token=${jogador.token}`)).status,404,'convidado sem personagem não pode obter GIF secreto');
    assert.equal((await pedido(`${base}/atribuir`,criacao.token,{pessoaId:jogador.id,personagemId:'hero'})).status,200);
    assert.equal((await fetch(`${url}?token=${jogador.token}`)).status,200,'personagem próprio continua autorizado');
    assert.equal((await fetch(`${url}?token=${outro.token}`)).status,404,'outro convidado não acessa token oculto');
  }finally{await app.fechar();}
});

test('v29.15.9: paridade de cor, escala, tamanho dos tokens e reprodução do GIF',()=>{
  const base=new URL('../src/multiplayer/',import.meta.url);
  const pub=readFileSync(new URL('PublicadorMesa.tsx',base),'utf8');
  const player=readFileSync(new URL('MesaConvidado2D.tsx',base),'utf8');
  const token=readFileSync(new URL('TokenConvidadoFluido.tsx',base),'utf8');
  const css=readFileSync(new URL('MesaConvidado2DParity.css',base),'utf8');
  assert.match(pub,/publicarGifOriginal/);assert.match(pub,/toDataURL\('image\/webp',0\.90\)/);
  assert.match(player,/--pm-escala-cena/);assert.match(player,/midias\/\$\{/);
  assert.match(token,/midiaUrl\|\|token.imagem/);
  assert.match(css,/\.pm-jogo-palco::before/);assert.match(css,/\.pm-jogo-palco::after/);
  assert.match(css,/width:51px;height:51px/);
});
