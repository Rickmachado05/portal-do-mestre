import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarPaginaDiario} from '../src/hexatombe/registrosDiario.ts';
import {textoLegivelDoDiario,criarDadosItemDoDiario,publicarItemDoDiario} from '../src/hexatombe/itemDoDiario.ts';
import {ITENS_KEY,listarItens,copiarParaInventario,adicionarItemInventario} from '../src/hexatombe/itensLibrary.ts';
const dados=new Map();
globalThis.localStorage={getItem:k=>dados.get(k)??null,setItem:(k,v)=>dados.set(k,String(v)),removeItem:k=>dados.delete(k)};
globalThis.window={dispatchEvent:()=>{}};
globalThis.Event=class{constructor(tipo){this.type=tipo}};
const imagem='data:image/png;base64,'+'A'.repeat(100);
const pagina=(campos={})=>({...criarPaginaDiario('Carta do Templo','pista','2026-11-01T10:00:00Z','pagina-carta'),tipo:'nota',conteudo:'Mensagem secreta',...campos});
const fonte=rel=>readFileSync(new URL('../src/'+rel,import.meta.url),'utf8');
const reset=()=>dados.delete(ITENS_KEY);

test('HTML do Diário vira texto legível para o visualizador de item',()=>{
 const r=textoLegivelDoDiario('<h2>Capítulo 1</h2><p>A <b>lua</b> surgiu &amp; brilhou.</p><ul><li>Relíquia</li><li>Mapa</li></ul>','html');
 assert.match(r,/Capítulo 1\nA lua surgiu & brilhou\./);
 assert.match(r,/• Relíquia\n• Mapa/);
 assert.doesNotMatch(r,/<[^>]+>/);
 assert.equal(textoLegivelDoDiario('Linha 1\nLinha 2','texto'),'Linha 1\nLinha 2');
});
test('notas e imagens viram documentos sem efeito, sem consumo e sem apagar o Diário',()=>{
 const original=pagina({tipo:'imagem',imagem,conteudo:'<p>Um mapa</p>',formato:'html'});
 const antes=structuredClone(original);
 const item=criarDadosItemDoDiario(original);
 assert.equal(item.categoria,'documento');assert.equal(item.efeito,'nenhum');
 assert.equal(item.consumivel,false);assert.equal(item.conteudo,'Um mapa');
 assert.equal(item.imagemConteudo,imagem);
 assert.deepEqual(original,antes);
});
test('pastas, imagens inválidas e páginas grandes não são convertidas silenciosamente',()=>{
 assert.throws(()=>criarDadosItemDoDiario(pagina({tipo:'pasta'})),/pasta/);
 assert.throws(()=>criarDadosItemDoDiario(pagina({imagem:'data:image/svg+xml;base64,AAAA'})),/imagem/);
 assert.throws(()=>criarDadosItemDoDiario(pagina({conteudo:'X'.repeat(18001)})),/18.000/);
});
test('reexportar atualiza um único item no catálogo; outra campanha fica independente',()=>{
 reset();
 const a=publicarItemDoDiario(pagina(),'campanha-a');
 const b=publicarItemDoDiario(pagina({conteudo:'Versão revisada'}),'campanha-a');
 const c=publicarItemDoDiario(pagina(),'campanha-b');
 assert.equal(a.id,b.id);assert.notEqual(b.id,c.id);
 assert.equal(listarItens().length,2);assert.equal(listarItens()[0].conteudo,'Versão revisada');
 assert.equal(listarItens()[0].origemDiarioId,'pagina-carta');
 assert.equal(listarItens()[0].origemCampanhaId,'campanha-a');
});
test('item já entregue permanece uma cópia intacta após reexportação',()=>{
 reset();
 const primeiro=publicarItemDoDiario(pagina(),'campanha-a');
 const mochila=adicionarItemInventario([],primeiro,1);
 const atualizado=publicarItemDoDiario(pagina({conteudo:'Novo segredo'}),'campanha-a');
 assert.equal(atualizado.id,primeiro.id);
 assert.equal(mochila[0].conteudo,'Mensagem secreta');
 assert.equal(copiarParaInventario(atualizado).conteudo,'Novo segredo');
 assert.equal(adicionarItemInventario(mochila,atualizado).length,2,'versões diferentes não devem fundir');
});
test('exportação rejeitada não adiciona item parcial',()=>{
 reset();
 assert.throws(()=>publicarItemDoDiario(pagina({conteudo:'X'.repeat(18001)}),'campanha-a'),/18.000/);
 assert.equal(listarItens().length,0);
});
test('Diário 2D e 3D possuem mesma ação, com destinatário explícito',()=>{
 const ui=fonte('hexatombe/DiarioCampanha.tsx');
 const app=fonte('App.tsx');
 const mesa3d=fonte('mesa3d/Mesa3DPrototipo.tsx');
 for(const texto of ['Criar item','Salvar no catálogo','Salvar e entregar item','Destinatário do item do Diário','onCriarItem']) assert.ok(ui.includes(texto),texto);
 assert.ok(app.includes('onCriarItem={criarItemDoDiario}'));
 assert.ok(app.includes('u.id===destinatario.id'));
 assert.ok(mesa3d.includes('onCriarItem={(pagina,destinatarioId)=>'));
 assert.ok(mesa3d.includes('adicionarItem3D(campanhaId,destinatarioId,item,1)'));
});
