import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ITENS_KEY, CATEGORIAS, salvarItem, listarItens, copiarParaInventario,
 adicionarItemInventario, transferirItemInventario, consumirItem,
} from '../src/hexatombe/itensLibrary.ts';
import {imagemConteudoValida,imagemItemValida,MAX_IMAGEM_CONTEUDO_CHARS} from '../src/hexatombe/imagensItens.ts';

const dados=new Map();
globalThis.localStorage={getItem:k=>dados.get(k)??null,setItem:(k,v)=>dados.set(k,String(v)),removeItem:k=>dados.delete(k)};
globalThis.window={dispatchEvent:()=>{}};
const imagem='data:image/png;base64,'+'A'.repeat(100);
function exemplo(changes={}){return {nome:'Carta do Avatar',categoria:'documento',efeito:'nenhum',valor:'',descricao:'Carta selada',consumivel:false,imagem,imagemConteudo:imagem,conteudo:'Primeira linha\nSegunda linha',...changes};}
function reset(){dados.delete(ITENS_KEY);}

test('documento aparece como categoria e a imagem ampliada é validada com segurança',()=>{
 assert.equal(CATEGORIAS.documento,'Documento');
 assert.equal(imagemConteudoValida(imagem),true);
 assert.equal(imagemItemValida(imagem),true);
 assert.equal(imagemConteudoValida('data:image/svg+xml;base64,AAAA'),false);
 assert.equal(imagemConteudoValida('https://exemplo.com/mapa.jpg'),false);
 assert.equal(imagemConteudoValida('data:image/png;base64,'+'A'.repeat(MAX_IMAGEM_CONTEUDO_CHARS)),false);
});
test('catálogo guarda texto e imagem de leitura sem atribuir uso automático ao documento',()=>{
 reset();const item=salvarItem(exemplo({efeito:'cura',valor:'1d8',consumivel:true}));
 assert.equal(item.efeito,'nenhum');assert.equal(item.valor,'');assert.equal(item.consumivel,false);
 assert.equal(item.conteudo,'Primeira linha\nSegunda linha');
 assert.equal(item.imagemConteudo,imagem);
 assert.equal(listarItens()[0].conteudo,item.conteudo);
 assert.deepEqual(copiarParaInventario(item).conteudo,item.conteudo);
 assert.deepEqual(copiarParaInventario(item).imagemConteudo,item.imagemConteudo);
});
test('a transferência carrega o conteúdo do documento sem uso/consumo automático',()=>{
 reset();const item=salvarItem(exemplo());
 const origem=adicionarItemInventario([],item,2);
 const mov=transferirItemInventario(origem,[],origem[0].id,1);
 assert.equal(mov.origem[0].quantidade,1);
 assert.equal(mov.destino[0].quantidade,1);
 assert.equal(mov.destino[0].conteudo,item.conteudo);
 assert.equal(mov.destino[0].imagemConteudo,item.imagemConteudo);
 // O leitor é consulta; sem chamada a consumirItem durante a visualização.
 assert.equal(mov.destino[0].consumivel,false);
});
test('versões diferentes de um documento não se misturam no inventário',()=>{
 reset();const item=salvarItem(exemplo());
 const a=copiarParaInventario(item);
 const atualizado={...item,conteudo:'Outra versão do texto'};
 const novos=adicionarItemInventario([a],atualizado);
 assert.equal(novos.length,2);
 const transf=transferirItemInventario([a],[{...copiarParaInventario(atualizado)}],a.id,1);
 assert.equal(transf.destino.length,2);
});
test('documentos anteriores e itens de cura continuam funcionando',()=>{
 reset();const antigo={id:'antigo',nome:'Mapa antigo',categoria:'outro',efeito:'nenhum',valor:'',descricao:'Um mapa',consumivel:false,criadoEm:'2026-01-01',atualizadoEm:'2026-01-01'};
 dados.set(ITENS_KEY,JSON.stringify([antigo]));assert.equal(listarItens()[0].nome,'Mapa antigo');
 const cura=salvarItem({...exemplo(),nome:'Poção',categoria:'consumivel',efeito:'cura',valor:'1d6',consumivel:true});
 assert.equal(cura.efeito,'cura');assert.equal(cura.consumivel,true);
 const novo=copiarParaInventario(cura,2);
 assert.equal(consumirItem([novo],novo.id)[0].quantidade,1);
});
test('imagens/trechos inválidos são rejeitados e não são colocados no catálogo',()=>{
 reset();assert.throws(()=>salvarItem(exemplo({imagemConteudo:'data:image/svg+xml;base64,AAAA'})),/Imagem de leitura inválida/);
 assert.throws(()=>salvarItem(exemplo({conteudo:'x'.repeat(18001)})),/18.000/);
 assert.equal(listarItens().length,0);
});

const fonte=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('o visualizador é compartilhado entre catálogo, inventários 2D/3D e menu de combate',()=>{
 const visual=fonte('hexatombe/VisualizadorItem.tsx');
 for(const prop of ['role="dialog"','createPortal','onFechar','Escape','imagemConteudo','conteudo','Descrição','Zoom','Somente leitura'])assert.ok(visual.includes(prop),prop);
 const cat=fonte('portal/GestaoItens.tsx');
 const inv=fonte('hexatombe/InventarioMesa.tsx');
 const hud=fonte('hexatombe/MenuCombateImersivo.tsx');
 for(const s of [cat,inv,hud])assert.ok(s.includes('<VisualizadorItem'),s.slice(0,120));
 assert.ok(cat.includes("cat==='documento'"));
 assert.ok(inv.includes("item.categoria!=='documento'"));
 assert.ok(hud.includes("item.categoria!=='documento'"));
 assert.ok(fonte('App.tsx').includes('<InventarioMesa'));
 assert.ok(fonte('mesa3d/Mesa3DPrototipo.tsx').includes('<InventarioMesa'));
});
