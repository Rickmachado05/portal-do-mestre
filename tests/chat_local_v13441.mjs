import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizarMensagensChat,criarMensagemChat,enviarMensagemChat,apagarHistoricoChat,lerMensagensChat,chaveChatMesa,MAX_MENSAGENS_CHAT,MAX_TEXTO_CHAT} from '../src/hexatombe/historicoChatMesa.ts';

const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const mestre={id:'mestre',nome:'Mestre',tipo:'mestre'};
const morgana={id:'morgana',nome:'Morgana',tipo:'jogador'};

test('valida texto vazio, comprimento, carimbo e autoria',()=>{
 assert.equal(criarMensagemChat(mestre,'  \n '),null);
 assert.equal(criarMensagemChat(mestre,'x'.repeat(MAX_TEXTO_CHAT+1)),null);
 const m=criarMensagemChat(morgana,'  A magia chegou!  ','Cena 1',123456,'id-pronto');
 assert.deepEqual(m,{mensagemId:'id-pronto',texto:'A magia chegou!',criadaEm:123456,id:'morgana',nome:'Morgana',tipo:'jogador',cenaNome:'Cena 1'});
});
test('chat fica isolado por campanha e mantém ordem e autor',()=>{
 store.clear();
 const a=criarMensagemChat(mestre,'Bem-vindos!','Salão',100,'a');
 const b=criarMensagemChat(morgana,'Oi!','Salão',101,'b');
 enviarMensagemChat('camp-A',a);
 enviarMensagemChat('camp-A',b);
 enviarMensagemChat('camp-B',criarMensagemChat(mestre,'Outra campanha','Arena',102,'c'));
 assert.deepEqual(lerMensagensChat('camp-A').map(m=>m.texto),['Bem-vindos!','Oi!']);
 assert.deepEqual(lerMensagensChat('camp-B').map(m=>m.texto),['Outra campanha']);
 assert.equal(lerMensagensChat('camp-A')[1].nome,'Morgana');
 assert.equal(store.has(chaveChatMesa('camp-A')),true);
});
test('salva a partir da leitura recente, evita duplicar IDs e preserva texto literal',()=>{
 store.clear();
 const um=criarMensagemChat(mestre,'<script>alert(1)</script>','Cena',200,'x');
 enviarMensagemChat('camp-X',um);
 enviarMensagemChat('camp-X',um);
 enviarMensagemChat('camp-X',criarMensagemChat(morgana,'Segunda','Cena',201,'y'));
 assert.equal(lerMensagensChat('camp-X').length,2);
 assert.equal(lerMensagensChat('camp-X')[0].texto,'<script>alert(1)</script>');
 const component=readFileSync(new URL('../src/hexatombe/ChatMesaPainel.tsx',import.meta.url),'utf8');
 assert.match(component,/<p>\{m\.texto\}<\/p>/); // Sem HTML interpretado.
});
test('normaliza entradas inválidas e impõe teto no histórico',()=>{
 const raw=Array.from({length:MAX_MENSAGENS_CHAT+5},(_,i)=>criarMensagemChat(mestre,String(i),'',i,`id-${i}`));
 raw.push({mensagemId:'ruim',texto:'',criadaEm:NaN});
 const clean=normalizarMensagensChat(raw);
 assert.equal(clean.length,MAX_MENSAGENS_CHAT-1);
 assert.equal(clean[0].texto,'6');
 assert.equal(clean.at(-1).texto,String(MAX_MENSAGENS_CHAT+4));
});
test('limpar conversa remove apenas a chave da campanha escolhida',()=>{
 store.clear();
 enviarMensagemChat('X',criarMensagemChat(mestre,'X','',1,'x'));
 enviarMensagemChat('Y',criarMensagemChat(mestre,'Y','',2,'y'));
 apagarHistoricoChat('X');
 assert.equal(lerMensagensChat('X').length,0);
 assert.equal(lerMensagensChat('Y').length,1);
});
test('2D e 3D usam a mesma interface sem abrir duplicata no iframe',()=>{
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const m3d=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
 assert.match(app,/alternarJanela\('chat'\)/);
 assert.match(app,/<ChatMesa campanhaId=\{CAMPAIGN_ID\}/);
 assert.match(m3d,/!EMBUTIDO_3D&&chatAberto&&<aside/);
 assert.match(m3d,/<ChatMesa campanhaId=\{campanhaId\}/);
 assert.doesNotMatch(app,/Chat disponível na fase multiplayer/);
});
