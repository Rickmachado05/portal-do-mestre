import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { copiarTokenNaCena, deslocamentoParaCentralizarToken, tokenPassaFiltro } from '../src/lib/tokenTools.ts';

const raiz = new URL('../src/App.tsx', import.meta.url);
const app = readFileSync(raiz,'utf8');
const css = readFileSync(new URL('../src/App.css', import.meta.url),'utf8');

test('duplicar preserva atributos visuais e torna cópia independente e desbloqueada', () => {
  const original = {x:47,y:62,tamanho:135,rotacao:270,oculto:true,visao:34,emiteLuz:true,
    skinId:'combate',travado:true,ocultarNome:true};
  const copia = copiarTokenNaCena(original);
  assert.notEqual(copia,original);
  assert.equal(copia.x,53);
  assert.equal(copia.y,68);
  assert.equal(copia.tamanho,135);
  assert.equal(copia.rotacao,270);
  assert.equal(copia.skinId,'combate');
  assert.equal(copia.travado,false);
  assert.equal(copia.ocultarNome,true);
  assert.deepEqual(original,{x:47,y:62,tamanho:135,rotacao:270,oculto:true,visao:34,emiteLuz:true,
    skinId:'combate',travado:true,ocultarNome:true});
});

test('duplicar perto da borda posiciona próximo sem sair do mapa', () => {
  const original={x:97,y:98,tamanho:70,rotacao:0,oculto:false};
  const copia=copiarTokenNaCena(original);
  assert.equal(copia.x,91);
  assert.equal(copia.y,92);
  assert.ok(copia.x>=1 && copia.x<=99);
});

test('duplicar respeita encaixe da grade quando ativo', () => {
  const original = {x:55,y:55,tamanho:70,rotacao:0,oculto:false};
  const grade={visivel:true,encaixarTokens:true,colunas:10,linhas:10};
  const copia=copiarTokenNaCena(original,grade);
  assert.equal(copia.x,65);
  assert.equal(copia.y,65);
});

test('centralizar mede deslocamento da posição real e respeita zoom existente', () => {
  const delta=deslocamentoParaCentralizarToken({x:75,y:25},
    {left:150,top:220,width:800,height:500}, {left:0,top:50,width:1200,height:700});
  assert.deepEqual(delta,{x:-150,y:55});
  assert.deepEqual(deslocamentoParaCentralizarToken({x:50,y:50},
    {left:200,top:150,width:800,height:600}, {left:0,top:0,width:1200,height:900}),{x:0,y:0});
});

test('filtro por tipo começa exibindo tudo e não altera registros', () => {
  const originais=[{tipo:'jogador',id:'a'},{tipo:'npc',id:'b'},{tipo:'inimigo',id:'c'}];
  assert.equal(originais.filter(u=>tokenPassaFiltro(u.tipo,'todos')).length,3);
  assert.deepEqual(originais.filter(u=>tokenPassaFiltro(u.tipo,'inimigo')).map(u=>u.id),['c']);
  assert.deepEqual(originais.filter(u=>tokenPassaFiltro(u.tipo,'npc')).map(u=>u.id),['b']);
  assert.equal(originais.length,3);
});

test('galeria de skins fica recolhível como os outros painéis, mantendo edição', () => {
  assert.match(app,/<details className="token-opcoes-discretas galeria-skins-detalhes">\s*<summary>Galeria de skins do token<\/summary>/);
  assert.match(app,/<summary>Visão e privacidade do token<\/summary>/);
  assert.match(app,/<summary>Gerenciar personagem<\/summary>/);
  assert.match(app,/<summary>Ferramentas do token<\/summary>/);
  assert.match(app,/Adicionar skin \(PNG, JPG ou WebP\)/);
  assert.match(css,/\.galeria-skins-detalhes \.config-token/);
});

test('bloqueio previne movimento, transformação e Delete, sem desativar seleção', () => {
  assert.match(app,/if \(!p \|\| p\.travado\) return;/);
  assert.match(app,/!mapaRef\.current \|\| cenaAtual\.tokens\[d\.id\]\?\.travado/);
  assert.match(app,/if \(!token \|\| token\.travado/);
  assert.match(app,/cenaAtual\.tokens\[tokenEmEdicaoId\]\.travado/);
  assert.match(app,/!p\.travado && <span className="token-transform-box"/);
  assert.match(app,/setTokenEmEdicaoId\(u\.id\)/);
  assert.match(app,/Ocultar nome sobre o token/);
});

test('cópia não cria ficha ou inventário duplicados, e copia imagens antes de inserir', () => {
  assert.match(app,/fichaId: undefined, temPdf: false/);
  assert.match(app,/condicoes: \[\], itens: \[\]/);
  assert.match(app,/unidade\.tipo === 'jogador' \? 'npc' : unidade\.tipo/);
  assert.match(app,/carregarArquivo\(arquivo\.origem\)/);
  assert.match(app,/salvarArquivo\(arquivo\.destino, blob\)/);
  assert.match(app,/escritas\.map\(chave => excluirArquivo\(chave\)/);
  assert.match(app,/chaveImagemSkin\(novoId, skin\.id\)/);
  assert.match(app,/tokenPassaFiltro\(u\.tipo, filtroTipoToken\)/);
});
