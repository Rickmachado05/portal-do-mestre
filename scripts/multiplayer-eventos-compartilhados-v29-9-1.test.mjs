import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarGerenciadorEventosCompartilhados} from '../src/multiplayer/eventosCompartilhados.mjs';

const validar=['presenca','mesa','pedido-movimento','chat'];
function laboratorio(){
  const streams=[];
  const gerenciador=criarGerenciadorEventosCompartilhados(url=>{
    const s={url,fechada:false,onopen:null,onerror:null,onmessage:null,close(){this.fechada=true;}};
    streams.push(s);return s;
  });
  const cred={codigo:'ABCDEFGH',token:'chave-privada',papel:'mestre'};
  const ligar=(eventos,estados,controlador=false,alterada=cred)=>gerenciador.assinar(alterada,'/api/multiplayer/salas/ABCDEFGH',validar,e=>eventos.push(e),e=>estados.push(e),controlador);
  return {streams,gerenciador,cred,ligar};
}
test('três componentes compartilham uma conexão, e um mapa é decodificado apenas uma vez por stream',()=>{
  const l=laboratorio(),a=[],b=[],c=[],status=[];
  const unsubA=l.ligar(a,status),unsubB=l.ligar(b,status);
  assert.equal(l.streams.length,1);
  const unsubC=l.ligar(c,status,true);
  assert.equal(l.streams.length,2,'entrada do publicador promove a conexão para controlador');
  assert.ok(l.streams[0].fechada);
  l.streams[1].onopen();
  l.streams[1].onmessage({data:JSON.stringify({tipo:'mesa',mesa:{imagem:'imagem-grande'}})});
  assert.equal(a.length,1);assert.equal(b.length,1);assert.equal(c.length,1);
  assert.equal(l.gerenciador.quantidade(),1);
  unsubA();unsubB();unsubC();
  assert.ok(l.streams[1].fechada);
  assert.equal(l.gerenciador.quantidade(),0);
});
test('um ouvinte desligado não recebe eventos; ao remover controlador ocorre downgrade',()=>{
  const l=laboratorio(),a=[],b=[],status=[];
  const fecharA=l.ligar(a,status,true);
  const fecharB=l.ligar(b,status,false);
  l.streams[0].onopen();
  fecharA();
  assert.equal(l.streams.length,2);
  assert.ok(l.streams[0].fechada);
  assert.ok(!l.streams[1].url.includes('controlador=1'));
  l.streams[1].onmessage({data:'{"tipo":"chat","mensagem":{}}'});
  assert.equal(a.length,0);assert.equal(b.length,1);
  fecharB();
});
test('credenciais distintas nunca compartilham eventos',()=>{
  const l=laboratorio(),a=[],b=[],status=[];
  const fecharA=l.ligar(a,status);
  const fecharB=l.ligar(b,status,false,{...l.cred,token:'outro-token'});
  assert.equal(l.streams.length,2);
  l.streams[0].onmessage({data:'{"tipo":"presenca"}'});
  assert.equal(a.length,1);assert.equal(b.length,0);
  fecharA();fecharB();
});
test('SSE reconecta, notifica novos ouvintes e não processa evento antigo',()=>{
  const l=laboratorio(),a=[],b=[],status=[];
  const fecharA=l.ligar(a,status);
  l.streams[0].onopen();
  const fecharB=l.ligar(b,status);
  assert.equal(status.at(-1),'conectado');
  l.streams[0].onerror();
  assert.equal(status.at(-1),'reconectando');
  l.streams[0].onmessage({data:'invalid!'});
  l.streams[0].onmessage({data:'{"tipo":"desconhecido"}'});
  assert.equal(a.length,0);
  fecharA();fecharB();
});
