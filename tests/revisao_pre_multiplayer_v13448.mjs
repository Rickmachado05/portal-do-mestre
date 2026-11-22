import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {salvarItem, listarItens, ITENS_KEY, adicionarItemInventario} from '../src/hexatombe/itensLibrary.ts';
const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
const app=src('App.tsx'),mesa3d=src('mesa3d/Mesa3DPrototipo.tsx'),room=src('mesa3d/roomScene.ts'),terreno=src('mesa3d/editorCena3D.ts'),estado=src('lib/mesaCompartilhada.ts'),music=src('MusicaMesa.tsx'),inv=src('hexatombe/InventarioMesa.tsx');
test('o token 2D faz flip por botão direito e mantém botão explícito',()=>{
 assert.match(app,/onContextMenu=\{e=>\{e.preventDefault\(\)/);
 assert.match(app,/espelhadoX:!t\.espelhadoX/);
 assert.match(app,/⇄ Flip/);
 assert.match(app,/p\.travado\|\|ferramentaMapa!=='mover'/);
});
test('informação da versão antiga é substituída por comportamento atual',()=>{
 assert.doesNotMatch(app,/A v0\.3 já calcula/);
 assert.match(app,/visão individual respeita paredes e portas fechadas/);
 assert.doesNotMatch(mesa3d,/MESA UNIFICADA · PRIMEIRA ETAPA/);
});
test('separação das camadas é persistida e lida pelas duas mesas',()=>{
 for(const key of ['jogadores','npcs','inimigos','objetos']) {
  assert.match(app,new RegExp(`${key}: boolean`));
  assert.match(estado,new RegExp(`${key}:layers\\.${key}!==false`));
 }
 assert.match(mesa3d,/tokenLiberadoNaCamada/);
 assert.match(mesa3d,/tokensNasCamadas/);
 assert.match(mesa3d,/configurarVisibilidadeObjetos/);
});
test('ocultar um token da prévia não exclui a ficha e pode ser revertido',()=>{
 assert.match(app,/oculto:!t\.oculto/);
 assert.match(app,/◉ Revelar/);
 assert.match(app,/Retirar da cena/);
});
test('ocultar objetos 3D preserva os dados e permite revelar novamente',()=>{
 assert.match(terreno,/oculto\?:boolean/);
 assert.match(terreno,/v\.oculto===true/);
 assert.match(room,/grupo\.userData\.oculto=o\.oculto===true/);
 assert.match(room,/objeto\.userData\.oculto!==true/);
 assert.match(mesa3d,/Objetos já salvos/);
 assert.match(mesa3d,/oculto:!obj\.oculto/);
});
test('criação rápida usa o mesmo catálogo e entrega ao personagem',()=>{
 assert.match(inv,/salvarItem\(\{nome:nomeRapido/);
 assert.match(inv,/onAdicionar\(item,1\)/);
 assert.match(inv,/Salvar no catálogo e entregar 1 unidade/);
 assert.match(inv,/conteudoRapido/);
});
test('catálogo continua permitindo itens novos com efeitos e cópias independentes',()=>{
 const m=new Map();globalThis.localStorage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
 globalThis.window={dispatchEvent:()=>{}};
 m.delete(ITENS_KEY);
 const item=salvarItem({nome:'Poção rápida',categoria:'consumivel',efeito:'cura',valor:'1d8+2',descricao:'Cura simples',consumivel:true,conteudo:'',imagem:'',imagemConteudo:''});
 assert.equal(listarItens()[0].nome,'Poção rápida');
 const lista=adicionarItemInventario([],item,1);
 assert.equal(lista[0].quantidade,1);assert.equal(lista[0].efeito,'cura');
});
test('playlists são salvas por campanha e vinculadas por cena',()=>{
 assert.match(music,/portal-mestre-playlists-v13448:/);
 assert.match(music,/porCena:Record<string,string>/);
 assert.match(music,/\[cenaId\]/);
 assert.match(music,/playlistCenaId/);
 assert.match(app,/MusicaMesa campanhaId=\{CAMPAIGN_ID\} cenaId=\{cenaAtual\.id\}/);
 assert.match(mesa3d,/MusicaMesa campanhaId=\{campanhaId\} cenaId=\{cenaId\}/);
});
test('reprodução respeita a lista da cena e encerra faixa fora da seleção',()=>{
 assert.match(music,/const faixasDaCena=playlistCena\?faixas\.filter/);
 assert.match(music,/faixasDaCena\.findIndex/);
 assert.match(music,/setTocando\(false\);setAtualId\(null\)/);
 assert.match(music,/onChange=\{e=>\{mudarPlaylistCena/);
});
test('músicas podem ser renomeadas sem alterar o arquivo de áudio',()=>{
 assert.match(music,/confirmarRenomeacao/);
 assert.match(music,/titulo:titulo\.slice\(0,120\)/);
 assert.match(music,/aria-label="Novo nome da música"/);
});
test('luzes da sala de teste só existem em cenas legadas',()=>{
 assert.match(room,/const luzesDaSalaAntiga/);
 assert.match(room,/luzesDaSalaAntiga\.forEach\(obj=>\{obj\.visible=config\.base==='arquivos'/);
 assert.match(terreno,/CENARIO_INICIAL_3D: Cenario3D = \{versao:1,base:'vazia'/);
});
test('modelo inicial/construção piloto não são oferecidos em novas cenas',()=>{
 assert.doesNotMatch(mesa3d,/<label htmlFor="m3d-base">Modelo inicial<\/label>/);
 assert.doesNotMatch(mesa3d,/Montar taverna de teste/);
 assert.doesNotMatch(mesa3d,/>Construção<\/button>/);
 assert.match(mesa3d,/Terreno 3D/);
 assert.match(mesa3d,/Retirar cenário inicial antigo/);
});
