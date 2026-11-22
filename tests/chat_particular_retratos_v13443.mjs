import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {normalizarMensagensChat,criarMensagemChat,mensagensCanalChat,enviarMensagemChat,lerMensagensChat,chaveChatMesa} from '../src/hexatombe/historicoChatMesa.ts';

const mestre={id:'mestre',nome:'Mestre',tipo:'mestre'};
const morgana={id:'morgana',nome:'Morgana',tipo:'jogador'};
const naeris={id:'naeris',nome:'Naeris',tipo:'jogador'};
const inimigo={id:'karasu',nome:'Karasu',tipo:'inimigo'};
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};

test('chat geral continua compatível com o histórico legado',()=>{
 const legado={mensagemId:'legado',texto:'Todos me ouvem',criadaEm:14,id:mestre.id,nome:mestre.nome,tipo:mestre.tipo};
 assert.deepEqual(normalizarMensagensChat([legado]),[legado]);
 assert.deepEqual(mensagensCanalChat([legado],'morgana'),[legado]);
 assert.deepEqual(mensagensCanalChat([legado],'morgana','naeris'),[]);
});
test('conversa particular de Morgana e Naeris é simétrica e não vaza para o Geral',()=>{
 const geral=criarMensagemChat(mestre,'A sessão começou','Sala',1,'g');
 const privado=criarMensagemChat(morgana,'Uma pista secreta','Sala',2,'dm1',naeris);
 const resposta=criarMensagemChat(naeris,'Entendi','Sala',3,'dm2',morgana);
 const terceiro=criarMensagemChat(inimigo,'Outro privado','Sala',4,'dm3',morgana);
 assert.equal(privado.destinatarioId,'naeris');
 assert.equal(privado.destinatarioNome,'Naeris');
 const lista=normalizarMensagensChat([geral,privado,resposta,terceiro]);
 assert.deepEqual(mensagensCanalChat(lista,'naeris').map(m=>m.mensagemId),['g']);
 assert.deepEqual(mensagensCanalChat(lista,'morgana','naeris').map(m=>m.mensagemId),['dm1','dm2']);
 assert.deepEqual(mensagensCanalChat(lista,'naeris','morgana').map(m=>m.mensagemId),['dm1','dm2']);
 assert.deepEqual(mensagensCanalChat(lista,'morgana','karasu').map(m=>m.mensagemId),['dm3']);
 assert.deepEqual(mensagensCanalChat(lista,'mestre','naeris'),[]);
 assert.deepEqual(mensagensCanalChat(lista,'morgana','morgana'),[]);
});
test('não transforma mensagem particular para si mesmo numa mensagem geral por engano',()=>{
 assert.equal(criarMensagemChat(morgana,'teste','',10,'x',morgana),null);
 assert.equal(criarMensagemChat(morgana,'teste','',10,'x',{...naeris,id:'  '}),null);
 const invalida=normalizarMensagensChat([{mensagemId:'x',texto:'olá',criadaEm:1,...morgana,destinatarioId:'morgana',destinatarioNome:'Morgana'}]);
 assert.deepEqual(mensagensCanalChat(invalida,'morgana'),invalida);
});
test('histórico geral e privado fica salvo na mesma campanha e no backup local',()=>{
 store.clear();
 enviarMensagemChat('S',criarMensagemChat(mestre,'Geral','',1,'g'));
 enviarMensagemChat('S',criarMensagemChat(morgana,'Privado','',2,'p',naeris));
 const lidos=lerMensagensChat('S');
 assert.equal(lidos.length,2);
 assert.deepEqual(mensagensCanalChat(lidos,'naeris').map(m=>m.texto),['Geral']);
 assert.deepEqual(mensagensCanalChat(lidos,'naeris','morgana').map(m=>m.texto),['Privado']);
 assert.match(chaveChatMesa('S'),/^portal-mestre-/);
 assert.equal(store.has(chaveChatMesa('S')),true);
});
test('nomes, imagens do retrato e cores vêm dos personagens nas duas mesas',()=>{
 const chat=readFileSync(new URL('../src/hexatombe/ChatMesaPainel.tsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const mesa=readFileSync(new URL('../src/mesa3d/Mesa3DPrototipo.tsx',import.meta.url),'utf8');
 const compartilhado=readFileSync(new URL('../src/lib/mesaCompartilhada.ts',import.meta.url),'utf8');
 assert.match(chat,/const foto=perfil\?\.foto\|\|fotoExtra/);
 assert.match(chat,/estiloEnquadramento\(perfil\.enquadramento\)/);
 assert.match(chat,/<p>\{m\.texto\}<\/p>/);
 assert.match(app,/foto:urlRetratos\[u\.id\]/);
 assert.match(mesa,/foto:retratos\[u\.id\]/);
 assert.match(compartilhado,/retratoEnquadramento\?:EnquadramentoImagem/);
 assert.match(chat,/pm-chat-aviso-privado/);
});
test('não há arquivos de chat com nomes iguais ignorando maiúsculas no Windows',()=>{
 const dir=new URL('../src/hexatombe/',import.meta.url);
 const nomes=readdirSync(dir).filter(x=>/chat/i.test(x));
 assert.equal(new Set(nomes.map(x=>x.toLowerCase())).size,nomes.length);
});

